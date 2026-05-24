const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "changestudent.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

function nowIso() {
  return new Date().toISOString();
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      year_level TEXT NOT NULL,
      current_class TEXT NOT NULL,
      guardian_email TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS change_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      from_class TEXT NOT NULL,
      to_class TEXT NOT NULL,
      reason TEXT NOT NULL,
      requested_by TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (student_id) REFERENCES students (id)
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      step TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      decision TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (request_id) REFERENCES change_requests (id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      recipient TEXT NOT NULL,
      email TEXT NOT NULL,
      channel TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (request_id) REFERENCES change_requests (id)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER,
      action TEXT NOT NULL,
      actor TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (request_id) REFERENCES change_requests (id)
    );
  `);
}

function seedData() {
  const count = db.prepare("SELECT COUNT(*) AS count FROM students").get().count;
  if (count > 0) {
    return;
  }

  const insertStudent = db.prepare(
    "INSERT INTO students (name, year_level, current_class, guardian_email) VALUES (?, ?, ?, ?)"
  );

  const demoStudents = [
    ["Amelia Price", "Year 9", "9A Mathematics", "guardian.amelia@example.com"],
    ["James Liu", "Year 10", "10C English", "guardian.james@example.com"],
    ["Aria Thompson", "Year 11", "11B Science", "guardian.aria@example.com"]
  ];

  const insertAudit = db.prepare(
    "INSERT INTO audit_log (request_id, action, actor, details, created_at) VALUES (?, ?, ?, ?, ?)"
  );

  const tx = db.transaction(() => {
    for (const student of demoStudents) {
      insertStudent.run(...student);
    }
    insertAudit.run(null, "SYSTEM_INIT", "system", "Seeded demo students", nowIso());
  });

  tx();
}

function addAudit(requestId, action, actor, details) {
  db.prepare(
    "INSERT INTO audit_log (request_id, action, actor, details, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(requestId, action, actor, details || "", nowIso());
}

function addNotification(requestId, recipient, email, channel, status, message) {
  db.prepare(
    "INSERT INTO notifications (request_id, recipient, email, channel, status, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(requestId, recipient, email, channel, status, message, nowIso());
}

initSchema();
seedData();

module.exports = {
  db,
  nowIso,
  addAudit,
  addNotification
};
