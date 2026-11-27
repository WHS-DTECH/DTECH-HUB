"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const express = require("express");
const { registerHubAccess } = require("../hub-access");

async function fixture(t) {
    const sessions = new Map();
    const pool = {
        async query(sql, params = []) {
            if (sql.startsWith("CREATE TABLE") || sql.startsWith("DELETE FROM hub_sessions WHERE expires_at")) return { rows: [] };
            if (sql.startsWith("INSERT INTO")) {
                sessions.set(params[0], { email: params[1], expires: Date.now() + params[2] * 1000 });
                return { rows: [] };
            }
            if (sql.startsWith("DELETE FROM")) {
                sessions.delete(params[0]);
                return { rows: [] };
            }
            if (sql.startsWith("SELECT email")) {
                const session = sessions.get(params[0]);
                return { rows: session && session.expires > Date.now() ? [{ email: session.email }] : [] };
            }
            throw new Error(`Unexpected SQL: ${sql}`);
        }
    };
    const app = express();
    app.set("trust proxy", 1);
    registerHubAccess(app, {
        pool,
        authenticateRequest(req, _res, next) {
            const header = req.get("authorization");
            req.auth_identity = {
                token_present: Boolean(header),
                verified: header === "Bearer valid" || header === "Bearer expired",
                email: header === "Bearer valid" || header === "Bearer expired" ? "student@school.nz" : "",
                expiresAt: Date.now() + (header === "Bearer expired" ? -1000 : 60 * 60 * 1000)
            };
            if (req.auth_identity.verified) req.authenticated_email = req.auth_identity.email;
            next();
        }
    });
    app.get("/health", (_req, res) => res.send("ok"));
    app.post("/api/integrations/external-exam-intention", (req, res) => res.status(req.get("x-secret") === "valid" ? 204 : 401).end());
    app.get("/api/student_timetable/all", (_req, res) => res.json({ students: [] }));
    app.post("/api/unit-plans/import-docx", (_req, res) => res.status(204).end());
    app.get("*", (req, res) => res.send(req.authenticated_email || "public"));
    const server = await new Promise((resolve) => {
        const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
    });
    t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
    const base = `http://127.0.0.1:${server.address().port}`;
    return { sessions, request: (url, options = {}) => fetch(base + url, { redirect: "manual", ...options }) };
}

test("only homepage assets and health checks are public; webhook still validates its own secret", async (t) => {
    const f = await fixture(t);
    for (const path of ["/", "/index.html", "/styles.css", "/script.js", "/images/whs%20logo%20circular%20reo%20.png", "/health"]) {
        assert.equal((await f.request(path)).status, 200, path);
    }
    for (const path of ["/learning-pathways/", "/admin-menu.html", "/TeacherFiles/example.pdf", "/server.js", "/api/student_timetable/all"]) {
        const response = await f.request(path, { headers: { "x-user-email": "student@school.nz", "x-user-role": "admin" } });
        assert.ok(response.status === 401 || response.status === 302, path);
        assert.equal(response.headers.get("cache-control"), "no-store");
    }
    assert.equal((await f.request("/api/unit-plans/import-docx", { method: "POST" })).status, 401);
    assert.equal((await f.request("/api/integrations/external-exam-intention", { method: "POST" })).status, 401);
    assert.equal((await f.request("/api/integrations/external-exam-intention", { method: "POST", headers: { "x-secret": "valid" } })).status, 204);
});

test("verified sign-in grants an expiring HttpOnly session that sign-out revokes", async (t) => {
    const f = await fixture(t);
    assert.equal((await f.request("/api/auth/session", { method: "POST", headers: { Authorization: "Bearer invalid" } })).status, 401);
    const login = await f.request("/api/auth/session", {
        method: "POST", headers: { Authorization: "Bearer valid", "x-forwarded-proto": "https" }
    });
    assert.equal(login.status, 204);
    const setCookie = login.headers.get("set-cookie");
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Lax/i);
    assert.match(setCookie, /Secure/i);
    assert.ok([...f.sessions.values()][0].expires <= Date.now() + 60 * 60 * 1000);
    const cookie = setCookie.split(";")[0];
    assert.equal((await f.request("/admin-menu.html", { headers: { Cookie: cookie } })).status, 200);
    assert.equal((await f.request("/api/student_timetable/all", { headers: { Cookie: cookie } })).status, 200);
    assert.equal((await f.request("/api/student_timetable/all", {
        headers: { Cookie: cookie, Authorization: "Bearer invalid" }
    })).status, 401);
    assert.equal((await f.request("/api/unit-plans/import-docx", {
        method: "POST", headers: { Cookie: cookie, Origin: "https://evil.example" }
    })).status, 403);
    assert.equal((await f.request("/api/auth/session", { method: "DELETE", headers: { Cookie: cookie } })).status, 204);
    assert.equal((await f.request("/api/student_timetable/all", { headers: { Cookie: cookie } })).status, 401);
});

test("expired sessions and cross-site session creation are rejected", async (t) => {
    const f = await fixture(t);
    const crossSite = await f.request("/api/auth/session", {
        method: "POST", headers: { Authorization: "Bearer valid", Origin: "https://evil.example" }
    });
    assert.equal(crossSite.status, 403);
    assert.equal((await f.request("/api/auth/session", { method: "POST", headers: { Authorization: "Bearer expired" } })).status, 401);
    const login = await f.request("/api/auth/session", { method: "POST", headers: { Authorization: "Bearer valid" } });
    const cookie = login.headers.get("set-cookie").split(";")[0];
    for (const session of f.sessions.values()) session.expires = Date.now() - 1;
    assert.equal((await f.request("/api/student_timetable/all", { headers: { Cookie: cookie } })).status, 401);
});

test("admin access ignores a signed-in student's forged role hint", async () => {
    const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
    const start = source.indexOf("async function requireAdminAccess(");
    const end = source.indexOf('\napp.get("/api/health"', start);
    assert.ok(start >= 0 && end > start);
    const context = vm.createContext({
        getRequestUserEmail: (req) => req.authenticated_email,
        effectiveAuthMode: "strict",
        isDeveloperAdminEmail: () => false,
        getUserRoleByEmail: async (email) => ({ additional_role: email === "admin@school.nz" ? "Admin" : "Student" }),
        getMergedRolePermissions: async () => [{ role_name: "Admin", admin: true }]
    });
    vm.runInContext(source.slice(start, end), context);
    async function check(email) {
        let status = 200, nextCalled = false;
        const res = { status(value) { status = value; return this; }, json() { return this; } };
        await context.requireAdminAccess({
            authenticated_email: email,
            auth_identity: { verified: true },
            headers: { "x-user-role": "admin" }, query: { role: "admin" }, body: { role: "admin" }
        }, res, () => { nextCalled = true; });
        return { status, nextCalled };
    }
    assert.deepEqual(await check("student@school.nz"), { status: 403, nextCalled: false });
    assert.deepEqual(await check("admin@school.nz"), { status: 200, nextCalled: true });
});

test("student directory returns only the signed-in student's linked snapshots", async () => {
    const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
    const start = source.indexOf('app.get("/api/student_timetable/all"');
    const end = source.indexOf('\napp.get("/api/timetable/all"', start);
    assert.ok(start >= 0 && end > start);
    const rows = [
        { id_number: "1", email: "student@school.nz" },
        { id_number: "1", email: "" },
        { id_number: "2", email: "other@school.nz" }
    ];
    let handler;
    const context = vm.createContext({
        app: { get(_path, fn) { handler = fn; } },
        getStudentDirectoryRows: async () => rows,
        getRequestUserEmail: (req) => req.email,
        canManagePracticalSchedule: async (email) => email === "teacher@school.nz",
        buildStudentClassManagementRow: (row) => row,
        dedupeToLatestStudentRows: (input) => {
            assert.equal(input.length, 3);
            return [{ id_number: "1", linked_emails: ["student@school.nz"] }, { id_number: "2", linked_emails: ["other@school.nz"] }];
        },
        collectStudentLinkedEmails: (row) => [row.email]
    });
    vm.runInContext(source.slice(start, end), context);
    async function getRows(email) {
        let result;
        await handler({ email }, { json(value) { result = value.students; }, status() { throw new Error("Unexpected failure"); } });
        return Array.from(result);
    }
    assert.deepEqual(await getRows("student@school.nz"), rows.slice(0, 2));
    assert.deepEqual(await getRows("teacher@school.nz"), rows);
});
