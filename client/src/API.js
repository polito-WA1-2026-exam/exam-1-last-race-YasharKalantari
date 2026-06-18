// All calls to the backend live here, so the rest of the app never writes raw fetch.
// credentials: 'include' is essential — it tells the browser to send the session
// cookie with every request. Without it, login would appear to work but each later
// request would look logged-out (this is the client side of the CORS-credentials setup).

const SERVER_URL = 'http://localhost:3001/api';

async function login(credentials) {
  const res = await fetch(`${SERVER_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(credentials),
  });
  if (res.ok) return await res.json(); // { id, username }
  const err = await res.json().catch(() => ({}));
  throw new Error(err.error || 'Login failed.');
}

// Returns the logged-in user, or null if nobody is logged in. Called on app startup
// to restore the session after a page reload.
async function getCurrentUser() {
  const res = await fetch(`${SERVER_URL}/sessions/current`, { credentials: 'include' });
  if (res.ok) return await res.json();
  return null;
}

async function logout() {
  await fetch(`${SERVER_URL}/sessions/current`, {
    method: 'DELETE',
    credentials: 'include',
  });
}

// The full network for the Setup map: { stations, lines, segments-with-line }.
async function getNetwork() {
  const res = await fetch(`${SERVER_URL}/network`, { credentials: 'include' });
  if (res.ok) return await res.json();
  throw new Error('Could not load the network.');
}

// Start a game. Returns { start, destination, stations, segments } where segments are
// bare pairs with NO line information (Planning data).
async function startGame() {
  const res = await fetch(`${SERVER_URL}/games`, {
    method: 'POST',
    credentials: 'include',
  });
  if (res.ok) return await res.json();
  throw new Error('Could not start a new game.');
}

// Submit the built route. `route` is an ordered array of { station1_id, station2_id }.
// Returns { valid, steps, finalScore, reason? }.
async function submitRoute(route) {
  const res = await fetch(`${SERVER_URL}/games/current/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ route }),
  });
  if (res.ok) return await res.json();
  const err = await res.json().catch(() => ({}));
  throw new Error(err.error || 'Could not submit the route.');
}

// Best score per user, highest first.
async function getRanking() {
  const res = await fetch(`${SERVER_URL}/ranking`, { credentials: 'include' });
  if (res.ok) return await res.json();
  throw new Error('Could not load the ranking.');
}

export default { login, getCurrentUser, logout, getNetwork, startGame, submitRoute, getRanking };
