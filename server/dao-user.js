import crypto from 'crypto';
import db from './db.js';

// These three values MUST match the ones used in seed.js.
// A pbkdf2 hash is only reproducible with the exact same parameters,
// so if these differ from the seed, NO password will ever verify.
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = 'sha512';

// Look up a user by id. Used by passport.deserializeUser to rebuild
// req.user from the id stored in the session, on every request.
export function getUserById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id, username FROM users WHERE id = ?', [id], (err, row) => {
      if (err) reject(err);
      else if (!row) resolve(false);
      else resolve({ id: row.id, username: row.username });
    });
  });
}

// Verify a username + password pair. Resolves to the user object on success,
// or to false on failure (no such user, or wrong password). It never tells
// the caller WHICH of the two failed, so attackers learn nothing extra.
export function getUser(username, password) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
      if (err) { reject(err); return; }
      if (!row) { resolve(false); return; }            // no user with that username

      // Re-hash the typed password with the SAME salt that was stored for this user.
      const computed = crypto.pbkdf2Sync(password, row.salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST);
      const stored = Buffer.from(row.hash, 'hex');

      // Constant-time comparison so the time taken does not leak how close a guess was.
      // (timingSafeEqual throws if the two buffers differ in length, so check that first.)
      const match = stored.length === computed.length && crypto.timingSafeEqual(stored, computed);
      resolve(match ? { id: row.id, username: row.username } : false);
    });
  });
}
