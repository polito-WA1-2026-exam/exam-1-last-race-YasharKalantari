import db from './db.js';

// Small helper: run a SELECT that returns many rows, as a Promise.
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

export function getStations() {
  return all('SELECT id, name FROM stations ORDER BY name');
}

export function getLines() {
  return all('SELECT id, name, color FROM lines');
}

// Full segments WITH their line. Used for the Setup map and for backend validation.
// (For the Planning phase the line_id is deliberately stripped out — see game-logic.js.)
export function getSegments() {
  return all('SELECT id, station1_id, station2_id, line_id FROM segments');
}

// Run an INSERT/UPDATE/DELETE as a Promise.
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) { err ? reject(err) : resolve(this); });
  });
}

export function getEvents() {
  return all('SELECT id, description, effect FROM events');
}

// Persist a FINISHED game. Called for every completed game, including score-0 ones.
export function recordGame(userId, startId, destId, score) {
  const playedAt = new Date().toISOString();
  return run(
    'INSERT INTO games(user_id, start_station_id, dest_station_id, score, played_at) VALUES (?,?,?,?,?)',
    [userId, startId, destId, score, playedAt]
  );
}

// Best score per user, highest first. Users who never played are naturally excluded
// (the JOIN keeps only users that have at least one row in games).
export function getRanking() {
  return all(`
    SELECT u.username AS username, MAX(g.score) AS best
    FROM games g
    JOIN users u ON u.id = g.user_id
    GROUP BY u.id
    ORDER BY best DESC, u.username ASC
  `);
}
