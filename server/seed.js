/*
 * seed.js  —  creates and populates server/database.db for "Last Race".
 * Run ONCE from the server directory:   node seed.js
 * Deletes any existing database.db and rebuilds it from scratch.
 *
 * Network topology is stored in the flat `segments(station1_id, station2_id, line_id)` table.
 * Passwords are hashed with crypto.pbkdf2Sync; the LOGIN code must use the SAME
 * parameters (see PBKDF2 constants below) or password checks will never match.
 */
import sqlite3 from 'sqlite3';
import crypto from 'crypto';
import fs from 'fs';

const DB_FILE = './database.db';
if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
const db = new sqlite3.Database(DB_FILE);

const run = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.run(sql, params, function (err) { err ? reject(err) : resolve(this); }));
const get = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))));

// --- PBKDF2 password hashing (KEEP THESE THREE VALUES IDENTICAL IN YOUR LOGIN CODE) ---
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = 'sha512';
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
  return { salt, hash };
}

// ============================  DATA  (edit names here to personalise)  ============================
const USERS = [
  { username: 'alice', password: 'alicepass' },
  { username: 'bob',   password: 'bobpass'   },
  { username: 'carol', password: 'carolpass' },   // registered but has not played yet
];

const STATIONS = [
  'Northgate', 'Old Foundry', 'Market Cross', 'Riverside', 'Cathedral Square',
  'Harbor End', 'Clocktower', 'Lantern Hill', 'Greenfield', 'Ironworks',
  'Crossroads', 'Eastmoor', 'Willowbrook', 'Highpark', 'Summit',
];

// Each line is authored as an ORDERED list of stops purely for convenience here;
// only the consecutive PAIRS get stored, as rows in the flat `segments` table.
const LINES = [
  { name: 'Crimson Line', color: '#DC2626', stops: ['Northgate', 'Old Foundry', 'Market Cross', 'Riverside', 'Cathedral Square'] },
  { name: 'Azure Line',   color: '#2563EB', stops: ['Harbor End', 'Market Cross', 'Clocktower', 'Lantern Hill', 'Greenfield'] },
  { name: 'Verdant Line', color: '#16A34A', stops: ['Old Foundry', 'Clocktower', 'Ironworks', 'Crossroads', 'Eastmoor'] },
  { name: 'Amber Line',   color: '#D97706', stops: ['Cathedral Square', 'Lantern Hill', 'Crossroads', 'Willowbrook', 'Highpark', 'Summit'] },
];

const EVENTS = [
  ['Smooth ride, the doors close right on time.', 0],
  ['A busker plays your favorite tune; a stranger tips you.', 1],
  ['You find a coin wedged in the seat cushion.', 2],
  ['A helpful conductor waves you through the gate.', 1],
  ['Lucky transfer: you catch the express just in time.', 3],
  ['Signal failure on the line delays your train.', -2],
  ['Wrong platform; you waste time backtracking.', -3],
  ['A pickpocket works the crowded carriage.', -4],
  ['An inspector fines you over a creased pass.', -2],
  ['A quiet, uneventful hop between stops.', 0],
];

// Historical games so the ranking has content (alice & bob have played; carol has not).
const GAMES = [
  ['alice', 'Northgate',        'Cathedral Square', 24, '2026-05-02T14:30:00'],
  ['alice', 'Harbor End',       'Greenfield',       31, '2026-05-10T09:15:00'],
  ['alice', 'Old Foundry',      'Eastmoor',         18, '2026-05-18T20:05:00'],
  ['bob',   'Cathedral Square', 'Summit',           27, '2026-05-05T11:00:00'],
  ['bob',   'Market Cross',     'Eastmoor',         12, '2026-05-22T17:45:00'],
];
// =================================================================================================

async function main() {
  // ----- schema -----
  await run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    hash TEXT NOT NULL,
    salt TEXT NOT NULL
  )`);
  await run(`CREATE TABLE stations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )`);
  await run(`CREATE TABLE lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL
  )`);
  await run(`CREATE TABLE segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station1_id INTEGER NOT NULL REFERENCES stations(id),
    station2_id INTEGER NOT NULL REFERENCES stations(id),
    line_id INTEGER NOT NULL REFERENCES lines(id)
  )`);
  await run(`CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    effect INTEGER NOT NULL
  )`);
  await run(`CREATE TABLE games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    start_station_id INTEGER NOT NULL REFERENCES stations(id),
    dest_station_id INTEGER NOT NULL REFERENCES stations(id),
    score INTEGER NOT NULL,
    played_at TEXT NOT NULL
  )`);

  // ----- users -----
  for (const u of USERS) {
    const { salt, hash } = hashPassword(u.password);
    await run('INSERT INTO users(username, hash, salt) VALUES (?,?,?)', [u.username, hash, salt]);
  }

  // ----- stations (remember each id by name) -----
  const stId = {};
  for (const name of STATIONS) {
    const r = await run('INSERT INTO stations(name) VALUES (?)', [name]);
    stId[name] = r.lastID;
  }

  // ----- lines + their segments (consecutive stops become one segment row) -----
  for (const line of LINES) {
    const r = await run('INSERT INTO lines(name, color) VALUES (?,?)', [line.name, line.color]);
    const lineId = r.lastID;
    for (let i = 0; i < line.stops.length - 1; i++) {
      await run('INSERT INTO segments(station1_id, station2_id, line_id) VALUES (?,?,?)',
        [stId[line.stops[i]], stId[line.stops[i + 1]], lineId]);
    }
  }

  // ----- events -----
  for (const [description, effect] of EVENTS) {
    await run('INSERT INTO events(description, effect) VALUES (?,?)', [description, effect]);
  }

  // ----- historical games -----
  for (const [username, start, dest, score, playedAt] of GAMES) {
    const u = await get('SELECT id FROM users WHERE username = ?', [username]);
    await run('INSERT INTO games(user_id, start_station_id, dest_station_id, score, played_at) VALUES (?,?,?,?,?)',
      [u.id, stId[start], stId[dest], score, playedAt]);
  }

  console.log('database.db seeded successfully (segments schema + pbkdf2).');
}

main()
  .catch((err) => { console.error('Seeding failed:', err); process.exitCode = 1; })
  .finally(() => db.close());
