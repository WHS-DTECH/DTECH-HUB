"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { registerTeacherResults } = require("../practical-skills/teacher-results-store");

async function fixture(t) {
    const app = express();
    const queries = [];
    let fail = false;
    let documentsExist = true;
    const row = { student_email: "student@school.nz", completed: true, completed_activities: { "0": "2026-10-20" }, responses: { "0-answer": "Saved answer" } };
    const content = { identity: { name: "Minecraft" }, worksheets: [{ activity: "First build" }], activities: [] };
    registerTeacherResults(app, {
        schoolDomain: "school.nz",
        requireAdminAccess(req, res, next) { if (req.headers["x-test-admin"] !== "yes") return res.status(403).json({ error: "Admin required" }); next(); },
        getDefaultPracticalSkillsKitContent: () => ({}),
        pool: { async query(sql, params) {
            assert.match(sql, /^SELECT /, "No mutations or schema creation may occur during review");
            queries.push({ sql, params });
            if (fail) throw new Error("Database unavailable");
            if (sql.includes("FROM practical_skills_kit_content")) return { rows: [{ content }] };
            if (sql.includes("FROM practical_skills_progress")) return { rows: [row] };
            if (sql.includes("to_regclass")) return { rows: [{ documents_table: documentsExist ? "student_kit_documents" : null }] };
            if (sql.includes("FROM student_kit_documents")) return { rows: [{ student_email: row.student_email, document_id: "doc123" }] };
            throw new Error("Unexpected SQL");
        } }
    });
    const server = await new Promise((resolve) => { const instance = app.listen(0, "127.0.0.1", () => resolve(instance)); });
    t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
    const url = `http://127.0.0.1:${server.address().port}/api/admin/kit-results/kit-minecraft`;
    return { queries, row, content, setFail: (value) => { fail = value; }, setDocuments: (value) => { documentsExist = value; },
        read: (emails = "student@school.nz,missing@school.nz", admin = true) => fetch(`${url}?emails=${encodeURIComponent(emails)}`, { headers: admin ? { "x-test-admin": "yes" } : {} }) };
}

test("only admins can review; invalid inputs never query records", async (t) => {
    const f = await fixture(t);
    assert.equal((await f.read(undefined, false)).status, 403);
    for (const input of ["", "student@external.nz", "x'@school.nz OR 1=1", Array.from({ length: 21 }, (_, i) => `s${i}@school.nz`).join(",")]) {
        assert.equal((await f.read(input)).status, 400);
    }
    assert.equal(f.queries.length, 0);
});

test("review reads original records without recalculation, emails or mutations", async (t) => {
    const f = await fixture(t);
    const before = JSON.stringify(f.row);
    const response = await f.read("STUDENT@school.nz,student@school.nz,missing@school.nz");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const result = await response.json();
    assert.equal(result.students.length, 2);
    assert.deepEqual(result.students[0].progress, f.row);
    assert.equal(result.students[0].documents[0].document_id, "doc123");
    assert.equal(result.students[1].progress, null);
    assert.deepEqual(result.students[1].documents, []);
    assert.deepEqual(result.content, f.content);
    assert.deepEqual(f.queries[1].params, ["kit-minecraft", ["student@school.nz", "missing@school.nz"]]);
    assert.equal(JSON.stringify(f.row), before);
});

test("missing document storage is reported and database outages fail explicitly", async (t) => {
    const f = await fixture(t);
    f.setDocuments(false);
    const result = await (await f.read()).json();
    assert.match(result.warnings[0], /has not been created/);
    assert.equal(f.queries.length, 3);
    f.setFail(true);
    const response = await f.read();
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /No results have been changed/);
});
