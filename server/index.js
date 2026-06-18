import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';

import { getUser, getUserById } from './dao-user.js';
import { getStations, getLines, getSegments, getEvents, recordGame, getRanking } from './dao-game.js';
import { pickStartAndDestination, toPlanningSegments, validateRoute, executeRoute } from './game-logic.js';

// ============================ Passport configuration ============================

// The "local" strategy: given a username + password from the request, ask the DAO
// to verify them. done(null, user) on success; done(null, false, ...) on bad creds.
passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await getUser(username, password);
    if (!user) return done(null, false, { message: 'Wrong username or password.' });
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

// On login we store ONLY the user id in the session (small cookie, no data leaked).
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// On every later request, turn that stored id back into the full user (req.user).
passport.deserializeUser(async (id, done) => {
  try {
    const user = await getUserById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// ============================ Express app ============================

const app = express();
const port = 3001;

app.use(express.json()); // parse JSON request bodies (login sends JSON)

// CORS for the "two servers" pattern: the API (3001) and the React dev server (5173)
// are different origins, so we must explicitly allow that origin AND allow cookies.
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

// Session middleware — must be registered BEFORE passport.session().
app.use(session({
  secret: 'change-this-to-a-long-random-string',
  resave: false,
  saveUninitialized: false,
}));

// Wire Passport into the session.
app.use(passport.initialize());
app.use(passport.session());

// Reusable guard for routes that require a logged-in user.
// (The game routes added in the next step will sit behind this.)
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'Not authenticated' });
};

// ============================ Authentication routes ============================

// LOGIN  — POST /api/sessions   body: { username, password }
app.post('/api/sessions', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info?.message || 'Wrong username or password.' });
    // Manually establish the session (this calls serializeUser).
    req.login(user, (err) => {
      if (err) return next(err);
      return res.json(req.user); // { id, username }
    });
  })(req, res, next);
});

// WHO AM I  — GET /api/sessions/current
// The client calls this on startup to restore a session after a page load.
app.get('/api/sessions/current', (req, res) => {
  if (req.isAuthenticated()) return res.json(req.user);
  return res.status(401).json({ error: 'Not authenticated' });
});

// LOGOUT  — DELETE /api/sessions/current
app.delete('/api/sessions/current', (req, res) => {
  req.logout(() => res.end());
});

// ============================ Network & game routes ============================

// FULL NETWORK for the Setup phase — stations + lines + segments WITH their line.
// Behind isLoggedIn: anonymous visitors must not see the map.
app.get('/api/network', isLoggedIn, async (req, res) => {
  try {
    const [stations, lines, segments] = await Promise.all([
      getStations(), getLines(), getSegments(),
    ]);
    res.json({ stations, lines, segments });
  } catch (err) {
    res.status(500).json({ error: 'Database error while loading the network.' });
  }
});

// START A GAME — POST /api/games
// The server picks the start and destination (BFS guarantees distance >= 3) and
// returns the Planning data. The line of each segment is NOT sent.
app.post('/api/games', isLoggedIn, async (req, res) => {
  try {
    const [stations, segments] = await Promise.all([getStations(), getSegments()]);
    const { startId, destId } = pickStartAndDestination(stations, segments);

    // Remember the assignment in the SERVER-SIDE session. This is authoritative:
    // when the route is submitted (next step) the server reads start/destination
    // from here, never from the client, so the client cannot pick an easier game.
    req.session.currentGame = { startId, destId };

    res.json({
      start: stations.find((s) => s.id === startId),
      destination: stations.find((s) => s.id === destId),
      stations,                              // names, for drawing the map
      segments: toPlanningSegments(segments), // pairs only, no line information
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not start a new game.' });
  }
});

// SUBMIT THE ROUTE — POST /api/games/current/route   body: { route: [{station1_id, station2_id}, ...] }
// Validates and scores the route entirely on the server, persists the finished game,
// and returns the per-segment results for the client to reveal one at a time.
app.post('/api/games/current/route', isLoggedIn, async (req, res) => {
  try {
    const current = req.session.currentGame;
    if (!current) return res.status(400).json({ error: 'No game in progress.' });

    const route = req.body.route;
    const networkSegments = await getSegments();
    const check = validateRoute(route, current.startId, current.destId, networkSegments);

    // The assignment is consumed either way, so the same game cannot be replayed.
    req.session.currentGame = null;

    if (!check.valid) {
      // Invalid or incomplete route: execution is skipped, the score is 0.
      await recordGame(req.user.id, current.startId, current.destId, 0);
      return res.json({ valid: false, reason: check.reason, finalScore: 0, steps: [] });
    }

    // Valid route: run the execution (random event per step) and score it on the server.
    const events = await getEvents();
    const { steps, finalScore } = executeRoute(check.path, events);
    await recordGame(req.user.id, current.startId, current.destId, finalScore);

    // Attach station names so the "dumb" client can display steps without extra lookups.
    const stations = await getStations();
    const nameOf = (id) => stations.find((s) => s.id === id)?.name;
    const richSteps = steps.map((st) => ({
      from: nameOf(st.fromId),
      to: nameOf(st.toId),
      event: st.event,
      coins: st.coins,
    }));

    res.json({ valid: true, steps: richSteps, finalScore });
  } catch (err) {
    res.status(500).json({ error: 'Could not process the submitted route.' });
  }
});

// RANKING — GET /api/ranking   best score per user, highest first. Logged-in only.
app.get('/api/ranking', isLoggedIn, async (req, res) => {
  try {
    res.json(await getRanking());
  } catch (err) {
    res.status(500).json({ error: 'Could not load the ranking.' });
  }
});

// ============================ Start ============================

app.listen(port, () => console.log(`Server listening at http://localhost:${port}`));
