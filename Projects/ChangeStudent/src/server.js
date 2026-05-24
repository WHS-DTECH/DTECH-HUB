require("dotenv").config();

const path = require("path");
const express = require("express");
const { db, nowIso, addAudit, addNotification } = require("./db");
const { sendEmail } = require("./notifications");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

const STATUS = {
  REQUESTED: "REQUESTED",
  DEAN_APPROVED: "DEAN_APPROVED",
  TIMETABLER_APPROVED: "TIMETABLER_APPROVED",
  REJECTED: "REJECTED",
  COMPLETED: "COMPLETED"
};

function getRequestById(requestId) {
  return db
    .prepare(
      `SELECT cr.*, s.name AS student_name, s.year_level, s.current_class AS student_current_class, s.guardian_email
       FROM change_requests cr
       JOIN students s ON s.id = cr.student_id
       WHERE cr.id = ?`
    )
    .get(requestId);
}

function updateRequestStatus(requestId, status) {
  db.prepare("UPDATE change_requests SET status = ?, updated_at = ? WHERE id = ?").run(
    status,
    nowIso(),
    requestId
  );
}

async function notifyAndRecord({ requestId, recipient, email, message }) {
  const result = await sendEmail({
    to: email,
    subject: "WHS Class Change Notification",
    text: message
  });

  addNotification(requestId, recipient, email, "EMAIL", result.status, message);
  addAudit(requestId, "NOTIFICATION_" + result.status, "system", `${recipient} <${email}>`);
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "ChangeStudent", timestamp: nowIso() });
});

app.get("/api/students", (req, res) => {
  const students = db.prepare("SELECT * FROM students ORDER BY name ASC").all();
  res.json(students);
});

app.get("/api/requests", (req, res) => {
  const { status } = req.query;

  let requests;
  if (status) {
    requests = db
      .prepare(
        `SELECT cr.*, s.name AS student_name, s.year_level
         FROM change_requests cr
         JOIN students s ON s.id = cr.student_id
         WHERE cr.status = ?
         ORDER BY cr.created_at DESC`
      )
      .all(status);
  } else {
    requests = db
      .prepare(
        `SELECT cr.*, s.name AS student_name, s.year_level
         FROM change_requests cr
         JOIN students s ON s.id = cr.student_id
         ORDER BY cr.created_at DESC`
      )
      .all();
  }

  res.json(requests);
});

app.get("/api/requests/:id/timeline", (req, res) => {
  const requestId = Number(req.params.id);
  const request = getRequestById(requestId);

  if (!request) {
    return res.status(404).json({ error: "Request not found" });
  }

  const approvals = db
    .prepare("SELECT * FROM approvals WHERE request_id = ? ORDER BY created_at ASC")
    .all(requestId);

  const notifications = db
    .prepare("SELECT * FROM notifications WHERE request_id = ? ORDER BY created_at ASC")
    .all(requestId);

  const audit = db
    .prepare("SELECT * FROM audit_log WHERE request_id = ? ORDER BY created_at ASC")
    .all(requestId);

  res.json({ request, approvals, notifications, audit });
});

app.post("/api/requests", (req, res) => {
  const { studentId, toClass, reason, requestedBy } = req.body;

  if (!studentId || !toClass || !reason || !requestedBy) {
    return res.status(400).json({ error: "studentId, toClass, reason, and requestedBy are required" });
  }

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(studentId);
  if (!student) {
    return res.status(404).json({ error: "Student not found" });
  }

  const createdAt = nowIso();
  const result = db
    .prepare(
      `INSERT INTO change_requests
       (student_id, from_class, to_class, reason, requested_by, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(student.id, student.current_class, toClass, reason, requestedBy, STATUS.REQUESTED, createdAt, createdAt);

  addAudit(result.lastInsertRowid, "REQUEST_CREATED", requestedBy, `From ${student.current_class} to ${toClass}`);

  return res.status(201).json(getRequestById(result.lastInsertRowid));
});

app.post("/api/requests/:id/approve", async (req, res) => {
  const requestId = Number(req.params.id);
  const { actorName, role, notes } = req.body;

  if (!actorName || !role) {
    return res.status(400).json({ error: "actorName and role are required" });
  }

  const request = getRequestById(requestId);
  if (!request) {
    return res.status(404).json({ error: "Request not found" });
  }

  if (role === "Dean") {
    if (request.status !== STATUS.REQUESTED) {
      return res.status(400).json({ error: "Dean can only approve requests in REQUESTED status" });
    }

    db.prepare(
      "INSERT INTO approvals (request_id, step, actor_name, decision, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(requestId, "DEAN_REVIEW", actorName, "APPROVED", notes || "", nowIso());

    updateRequestStatus(requestId, STATUS.DEAN_APPROVED);
    addAudit(requestId, "DEAN_APPROVED", actorName, notes || "");

    await notifyAndRecord({
      requestId,
      recipient: "Timetabler",
      email: "timetabler@whs.local",
      message: `Request #${requestId} for ${request.student_name} needs timetable approval.`
    });

    return res.json(getRequestById(requestId));
  }

  if (role === "Timetabler") {
    if (request.status !== STATUS.DEAN_APPROVED) {
      return res.status(400).json({ error: "Timetabler can only approve after dean approval" });
    }

    db.prepare(
      "INSERT INTO approvals (request_id, step, actor_name, decision, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(requestId, "TIMETABLE_REVIEW", actorName, "APPROVED", notes || "", nowIso());

    updateRequestStatus(requestId, STATUS.TIMETABLER_APPROVED);
    addAudit(requestId, "TIMETABLER_APPROVED", actorName, notes || "");

    await notifyAndRecord({
      requestId,
      recipient: "Dean",
      email: "dean@whs.local",
      message: `Request #${requestId} has timetable approval and is ready to complete.`
    });

    await notifyAndRecord({
      requestId,
      recipient: "Guardian",
      email: request.guardian_email,
      message: `Class change request #${requestId} for ${request.student_name} has been approved and awaits final implementation.`
    });

    return res.json(getRequestById(requestId));
  }

  return res.status(400).json({ error: "Invalid role. Use Dean or Timetabler." });
});

app.post("/api/requests/:id/reject", (req, res) => {
  const requestId = Number(req.params.id);
  const { actorName, role, notes } = req.body;

  if (!actorName || !role) {
    return res.status(400).json({ error: "actorName and role are required" });
  }

  const request = getRequestById(requestId);
  if (!request) {
    return res.status(404).json({ error: "Request not found" });
  }

  if (request.status === STATUS.COMPLETED || request.status === STATUS.REJECTED) {
    return res.status(400).json({ error: "Request is already finalised" });
  }

  db.prepare(
    "INSERT INTO approvals (request_id, step, actor_name, decision, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(requestId, role.toUpperCase() + "_REVIEW", actorName, "REJECTED", notes || "", nowIso());

  updateRequestStatus(requestId, STATUS.REJECTED);
  addAudit(requestId, "REQUEST_REJECTED", actorName, notes || "");

  res.json(getRequestById(requestId));
});

app.post("/api/requests/:id/complete", async (req, res) => {
  const requestId = Number(req.params.id);
  const { actorName, notes } = req.body;

  if (!actorName) {
    return res.status(400).json({ error: "actorName is required" });
  }

  const request = getRequestById(requestId);
  if (!request) {
    return res.status(404).json({ error: "Request not found" });
  }

  if (request.status !== STATUS.TIMETABLER_APPROVED) {
    return res.status(400).json({ error: "Only TIMETABLER_APPROVED requests can be completed" });
  }

  const now = nowIso();

  db.prepare("UPDATE change_requests SET status = ?, updated_at = ?, completed_at = ? WHERE id = ?").run(
    STATUS.COMPLETED,
    now,
    now,
    requestId
  );

  db.prepare("UPDATE students SET current_class = ? WHERE id = ?").run(request.to_class, request.student_id);
  addAudit(requestId, "REQUEST_COMPLETED", actorName, notes || "Class updated on student record");

  await notifyAndRecord({
    requestId,
    recipient: "Class Teacher",
    email: "teacher@whs.local",
    message: `Student ${request.student_name} has moved to ${request.to_class}.`
  });

  await notifyAndRecord({
    requestId,
    recipient: "Guardian",
    email: request.guardian_email,
    message: `Student ${request.student_name} has now been moved to ${request.to_class}.`
  });

  res.json(getRequestById(requestId));
});

app.listen(PORT, () => {
  console.log(`ChangeStudent running on http://localhost:${PORT}`);
});
