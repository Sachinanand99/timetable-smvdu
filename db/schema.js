const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create a new database or open existing one
const dbPath = path.join(__dirname, '..', 'university.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the university database.');

    // Enable foreign key constraints
    db.run('PRAGMA foreign_keys = ON', (err) => {
      if (err) {
        console.error('Error enabling foreign keys:', err.message);
      } else {
        console.log('Foreign key constraints enabled');
        createTables();
      }
    });
  }
});

// Create all required tables if they don't exist
function createTables() {
  // Teacher table
  db.run(
    `
    CREATE TABLE IF NOT EXISTS Teacher (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL
    )
  `,
    (err) => {
      if (err) {
        console.error('Error creating Teacher table:', err.message);
      } else {
        console.log('Teacher table ready');
      }
    }
  );

  // Subject table
  db.run(
    `
    CREATE TABLE IF NOT EXISTS Subject (
      course_code TEXT PRIMARY KEY,
      name TEXT,
      lecture_hr INTEGER,
      theory_hr INTEGER,
      practical_hr INTEGER,
      credits INTEGER,
      course_coordinator TEXT,
      display_code TEXT
    )
  `,
    (err) => {
      if (err) {
        console.error('Error creating Subject table:', err.message);
      } else {
        console.log('Subject table ready');
      }
    }
  );

  // Classroom table
  db.run(
    `
    CREATE TABLE IF NOT EXISTS Classroom (
      room_id TEXT PRIMARY KEY,
      capacity INTEGER,
      type TEXT CHECK(type IN ('lab', 'lecture'))
    )
  `,
    (err) => {
      if (err) {
        console.error('Error creating Classroom table:', err.message);
      } else {
        console.log('Classroom table ready');
      }
    }
  );

  // Class table
  db.run(
    `
    CREATE TABLE IF NOT EXISTS Class (
      semester TEXT,
      branch TEXT,
      section TEXT,
      PRIMARY KEY(semester, branch, section)
    )
  `,
    (err) => {
      if (err) {
        console.error('Error creating Class table:', err.message);
      } else {
        console.log('Class table ready');
      }
    }
  );

  // Teaching_Assignment table
  db.run(
    `
    CREATE TABLE IF NOT EXISTS Teaching_Assignment (
      teacher_id TEXT,
      course_code TEXT,
      semester TEXT,
      branch TEXT,
      section TEXT,
      FOREIGN KEY (teacher_id) REFERENCES Teacher(id),
      FOREIGN KEY (course_code) REFERENCES Subject(course_code),
      FOREIGN KEY (semester, branch, section) REFERENCES Class(semester, branch, section),
      PRIMARY KEY (teacher_id, course_code, semester, branch, section)
    )
  `,
    (err) => {
      if (err) {
        console.error('Error creating Teaching_Assignment table:', err.message);
      } else {
        console.log('Teaching_Assignment table ready');
      }
    }
  );

  // Class_Subjects table
  db.run(
    `
    CREATE TABLE IF NOT EXISTS Class_Subjects (
      semester TEXT,
      branch TEXT,
      section TEXT,
      course_code TEXT,
      FOREIGN KEY (semester, branch, section) REFERENCES Class(semester, branch, section),
      FOREIGN KEY (course_code) REFERENCES Subject(course_code),
      PRIMARY KEY (semester, branch, section, course_code)
    )
  `,
    (err) => {
      if (err) {
        console.error('Error creating Class_Subjects table:', err.message);
      } else {
        console.log('Class_Subjects table ready');
      }
    }
  );

  // Class_Teachers table
  db.run(
    `
    CREATE TABLE IF NOT EXISTS Class_Teachers (
      semester TEXT,
      branch TEXT,
      section TEXT,
      teacher_id TEXT,
      FOREIGN KEY (semester, branch, section) REFERENCES Class(semester, branch, section),
      FOREIGN KEY (teacher_id) REFERENCES Teacher(id),
      PRIMARY KEY (semester, branch, section, teacher_id)
    )
  `,
    (err) => {
      if (err) {
        console.error('Error creating Class_Teachers table:', err.message);
      } else {
        console.log('Class_Teachers table ready');
      }
    }
  );

  // Timetable table to store generated timetables
  db.run(
    `
    CREATE TABLE IF NOT EXISTS Timetable (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      semester TEXT,
      branch TEXT,
      section TEXT,
      day TEXT,
      period INTEGER,
      course_code TEXT,
      teacher_id TEXT,
      room_id TEXT,
      FOREIGN KEY (semester, branch, section) REFERENCES Class(semester, branch, section),
      FOREIGN KEY (course_code) REFERENCES Subject(course_code),
      FOREIGN KEY (teacher_id) REFERENCES Teacher(id),
      FOREIGN KEY (room_id) REFERENCES Classroom(room_id)
    )
  `,
    (err) => {
      if (err) {
        console.error('Error creating Timetable table:', err.message);
      } else {
        console.log('Timetable table ready');
      }
    }
  );
}

// Export the database connection
module.exports = db;
