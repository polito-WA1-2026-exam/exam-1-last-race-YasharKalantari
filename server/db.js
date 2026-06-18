import sqlite3 from 'sqlite3';

// Open the seeded database. The file lives in the server/ folder, so the path
// is relative to where you start the server ("cd server; nodemon index.js").
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) throw err;
});

export default db;
