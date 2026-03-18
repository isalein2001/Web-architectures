const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

async function initializeDb() {
  const db = await open({
    filename: path.join(__dirname, 'database.sqlite'),
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS plan_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER,
      exercise_name TEXT NOT NULL,
      target_sets INTEGER,
      target_reps TEXT,
      FOREIGN KEY (plan_id) REFERENCES plans (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workout_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      plan_id INTEGER,
      notes TEXT,
      FOREIGN KEY (plan_id) REFERENCES plans (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS workout_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER,
      exercise_name TEXT NOT NULL,
      set_number INTEGER,
      reps INTEGER,
      weight REAL,
      FOREIGN KEY (session_id) REFERENCES workout_sessions (id) ON DELETE CASCADE
    );
  `);
  
  return db;
}

module.exports = { initializeDb };
