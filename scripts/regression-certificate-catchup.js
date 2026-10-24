"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { teacherAlreadyEmailed, registerCertificateCatchup, withKitCertificateEmailLock } = require("../practical-skills/certificate-catchup");

test("teacher matching requires the same student, kit and teacher, including legacy titles", () => {
    const log = { recipients: ["Student@school.nz", "teacher@school.nz"], subject: "[DTECH HUB] Login Kit - Certificate of Completion" };
    assert.equal(teacherAlreadyEmailed([log], "student@school.nz", "kit-login", "teacher@school.nz"), true);
    assert.equal(teacherAlreadyEmailed([log], "other@school.nz", "kit-login", "teacher@school.nz"), false);
    assert.equal(teacherAlreadyEmailed([log], "student@school.nz", "kit-google-search", "teacher@school.nz"), false);
    assert.equal(teacherAlreadyEmailed([{ ...log, recipients: ["student@school.nz"] }], "student@school.nz", "kit-login", "teacher@school.nz"), false);
    assert.equal(teacherAlreadyEmailed([{ ...log, subject: "[DTECH HUB] Google Search - Certificate of Completion" }], "student@school.nz", "kit-google-search", "teacher@school.nz"), true);
    const named = { ...log, subject: `${log.subject} - Alex Student` };
    assert.equal(teacherAlreadyEmailed([named], "student@school.nz", "kit-login", "teacher@school.nz"), true);
    assert.equal(teacherAlreadyEmailed([named], "other@school.nz", "kit-login", "teacher@school.nz"), false);
    assert.equal(teacherAlreadyEmailed([named], "student@school.nz", "kit-google-search", "teacher@school.nz"), false);
    assert.equal(teacherAlreadyEmailed([{ ...log, subject: `${log.subject} (unrelated)` }], "student@school.nz", "kit-login", "teacher@school.nz"), false);
});

test("preview excludes prior teacher copies; sends only missing teacher copies; ambiguous deliveries are not retried", async (t) => {
    const deliveries = [];
    const sent = [];
    const errors = t.mock.method(console, "error", () => {});
    const rows = [
        { student_email: "already@school.nz", kit_id: "kit-login", completed: true },
        { student_email: "missing@school.nz", kit_id: "kit-login", completed: true },
        { student_email: "missing@school.nz", kit_id: "kit-google-search", completed: true },
        { student_email: "unavailable@school.nz", kit_id: "kit-login", completed: true },
        { student_email: "uncertain@school.nz", kit_id: "kit-login", completed: true }
    ];
    const logs = [
        { recipients: ["already@school.nz", "teacher@school.nz"], subject: "[DTECH HUB] Login Kit - Certificate of Completion" },
        { recipients: ["missing@school.nz"], subject: "[DTECH HUB] Login Kit - Certificate of Completion" }
    ];
    const pool = {
        connect: async () => ({ query: async () => ({ rows: [] }), release() {} }),
        async query(sql, params = []) {
            if (/CREATE |ALTER /.test(sql)) return { rows: [] };
            if (/SELECT \* FROM practical_skills_progress/.test(sql)) return { rows: params.length > 1
                ? rows.filter((row) => row.student_email === params[0] && row.kit_id === params[1]) : rows };
            if (/SELECT recipients/.test(sql)) return { rows: logs };
            if (/SELECT \* FROM kit_teacher/.test(sql)) return { rows: deliveries };
            if (/INSERT INTO kit_teacher/.test(sql)) {
                if (deliveries.some((row) => row.student_email === params[0] && row.kit_id === params[1] && row.teacher_email === params[2])) return { rows: [] };
                deliveries.push({ student_email: params[0], kit_id: params[1], teacher_email: params[2], status: "sending" });
                return { rows: [{ teacher_email: params[2] }] };
            }
            if (/UPDATE kit_teacher/.test(sql)) {
                deliveries.find((row) => row.student_email === params[0] && row.kit_id === params[1] && row.teacher_email === params[2]).status = "sent";
                return { rows: [] };
            }
            throw new Error(sql);
        }
    };
    const app = express();
    app.use(express.json());
    registerCertificateCatchup(app, {
        pool, hasDatabase: true,
        requireAdminAccess: (req, res, next) => req.headers["x-test-admin"] === "yes" ? next() : res.status(403).json({ error: "Admin required" }),
        ensurePracticalSkillsProgressSchema: async () => {}, ensureEmailLogsSchema: async () => {},
        getPracticalSkillsCertificateTeacherRecipients: async () => ["teacher@school.nz"],
        getStoredPracticalSkillsKitContent: async (id) => ({ bannerTitle: id === "kit-login" ? "Login Kit" : "Search Kit" }),
        buildKitCertificate: (content, row, name) => row.student_email === "unavailable@school.nz" ? null
            : { kitTitle: content.bannerTitle, studentName: name, completedDate: "20 October 2026" },
        getPracticalSkillsStudentName: async (req) => req.authenticated_email,
        createKitCertificatePdf: async () => Buffer.from("PDF"),
        emailConfigured: () => true,
        sendConfiguredHubEmail: async (email) => {
            if (email.subject.includes("uncertain@school.nz")) throw new Error("SMTP connection lost");
            sent.push(email);
        }
    });
    const server = await new Promise((resolve) => { const listener = app.listen(0, "127.0.0.1", () => resolve(listener)); });
    t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
    async function call(body, admin = true) {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/admin/practical-skills/certificate-catchup`, {
            method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", "x-test-admin": admin ? "yes" : "no" },
            body: body ? JSON.stringify(body) : undefined
        });
        return { status: response.status, body: await response.json() };
    }
    assert.equal((await call(undefined, false)).status, 403);
    const initial = (await call()).body;
    assert.equal(initial.rows.length, 5);
    assert.equal(initial.rows[0].pendingTeachers.length, 0);
    assert.equal(initial.rows[1].pendingTeachers.length, 1, "Student-only email does not count as teacher delivery");
    assert.equal(initial.rows[3].ready, false);
    assert.equal((await call({ studentEmail: "missing@school.nz", kitId: "kit-minecraft" })).status, 400);
    assert.equal((await call({ studentEmail: "unavailable@school.nz", kitId: "kit-login" })).status, 409);
    for (const kitId of ["kit-login", "kit-google-search"]) {
        const body = { studentEmail: "missing@school.nz", kitId };
        const concurrent = await Promise.all([call(body), call(body)]);
        assert.equal(concurrent.reduce((sum, result) => sum + result.body.sent.length, 0), 1, "Concurrent catch-up requests send one teacher copy");
        assert.equal((await call(body)).body.skipped, true);
    }
    assert.equal(sent.length, 2);
    assert.equal(sent.every((mail) => mail.to === "teacher@school.nz" && !mail.cc), true);
    assert.equal(sent.every((mail) => mail.attachment.buffer.length && mail.emailType === "kit_certificate_teacher_catchup"), true);
    assert.equal(sent.every((mail) => mail.subject.includes(" - Certificate of Completion - missing@school.nz (teacher catch-up:")), true);
    const uncertain = { studentEmail: "uncertain@school.nz", kitId: "kit-login" };
    assert.deepEqual((await call(uncertain)).body.uncertainTeachers, ["teacher@school.nz"]);
    assert.equal((await call(uncertain)).body.skipped, true);
    assert.equal(errors.mock.calls.length, 1, "Ambiguous email failure is logged");
    assert.equal((await call()).body.rows.filter((row) => row.pendingTeachers.length && row.ready).length, 0);
});

test("certificate email lock always releases its connection after a failure", async () => {
    const calls = [];
    const pool = { connect: async () => ({ query: async (sql) => { calls.push(sql); }, release() { calls.push("release"); } }) };
    await assert.rejects(() => withKitCertificateEmailLock(pool, true, "student@school.nz", "kit-login", async () => { throw new Error("SMTP failed"); }), /SMTP failed/);
    assert.match(calls[0], /pg_advisory_lock/);
    assert.match(calls[1], /pg_advisory_unlock/);
    assert.equal(calls[2], "release");
});
