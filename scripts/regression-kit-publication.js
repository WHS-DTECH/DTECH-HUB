"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createKitPublication } = require("../practical-skills/kit-publication");

async function fixture(t) {
    const saved = [
        { kit_id: "kit-minecraft", content: { bannerTitle: "Minecraft", worksheets: [{ activity: "Build" }] } },
        { kit_id: "kit-files", content: { identity: { name: "Files & Folders", status: "planning" }, worksheets: [{}] } },
        { kit_id: "kit-deleted", content: { deletedAt: "2026-10-20", worksheets: [{}] } }
    ];
    const flags = new Map();
    const rows = ["a", "b", "unrelated"].map((name) => ({ student_email: `${name}@school.nz`, completed: true,
        completed_activities: { "0": "2026-10-20" }, certificate_emailed_at: "2026-10-20", responses: { answer: "Keep me" } }));
    const queries = [], audits = [];
    let failUpdate = false;
    let snapshot;
    const query = async (sql, params) => {
        queries.push({ sql, params });
        if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(sql)) {
            if (sql === "BEGIN") snapshot = structuredClone(rows);
            if (sql === "ROLLBACK") rows.splice(0, rows.length, ...snapshot);
            return { rows: [] };
        }
        if (sql.startsWith("CREATE TABLE")) return { rows: [] };
        if (sql === "SELECT kit_id, content FROM practical_skills_kit_content") return { rows: saved };
        if (sql === "SELECT kit_id, live FROM practical_skills_kit_publication") return { rows: [...flags].map(([kit_id, live]) => ({ kit_id, live })) };
        if (sql.includes("INSERT INTO practical_skills_kit_publication")) { flags.set(params[0], params[1]); return { rows: [] }; }
        if (sql.includes("pg_advisory_xact_lock")) return { rows: [] };
        if (sql.includes("SELECT * FROM practical_skills_progress")) return { rows: rows.filter((row) => params[1].includes(row.student_email)) };
        if (sql.includes("INSERT INTO practical_skills_kit_resets")) { audits.push(params); return { rows: [] }; }
        if (sql.startsWith("UPDATE practical_skills_progress")) {
            if (failUpdate) throw new Error("Update failed");
            const selected = rows.filter((row) => params[1].includes(row.student_email));
            for (const row of selected) { row.completed = false; row.completed_activities = {}; row.certificate_emailed_at = null; }
            return { rows: selected };
        }
        throw new Error(`Unexpected query: ${sql}`);
    };
    const pool = { query, connect: async () => ({ query, release() { queries.push({ sql: "RELEASE" }); } }) };
    const deps = { pool, builtIns: [{ id: "kit-minecraft" }], getDefaultContent: () => ({}), schoolDomain: "school.nz",
        getRequestUserEmail: () => "teacher@school.nz", canManage: async (email) => email === "teacher@school.nz" };
    const service = createKitPublication(deps);
    const app = express();
    app.use(express.json());
    service.register(app, (req, res, next) => req.headers["x-admin"] === "yes" ? next() : res.status(403).json({ error: "Admin required" }));
    app.use(service.gate);
    app.all(/^\/api\/practical-skills\//, (_req, res) => res.json({ reached: true }));
    const server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
    const base = `http://127.0.0.1:${server.address().port}`;
    return { service, deps, rows, audits, queries, saved, flags, failUpdate: () => { failUpdate = true; },
        call: (url, method = "GET", body, admin = true) => fetch(base + url, {
            method, headers: { "Content-Type": "application/json", ...(admin ? { "x-admin": "yes" } : {}) }, body: body ? JSON.stringify(body) : undefined
        }) };
}

test("teacher catalog includes database kits without requiring custom marker or prior library navigation; flags survive fresh services", async (t) => {
    const f = await fixture(t);
    const snapshot = { kits: [{ id: "kit-minecraft", isComplete: true }, { id: "kit-files", isComplete: false }], totalPoints: 100 };
    const teacher = await f.service.filterSnapshot(snapshot, true);
    assert.deepEqual(teacher.licenceKits.map((kit) => kit.id), ["kit-minecraft", "kit-files"]);
    assert.equal(teacher.licenceKits[1].live, false);
    assert.equal(teacher.stampTotalKits, 2);
    assert.equal((await f.service.filterSnapshot(snapshot)).stampTotalKits, 1);
    assert.equal(teacher.totalPoints, 100);
    await f.service.setLive("kit-minecraft", false, "teacher@school.nz");
    assert.equal(await createKitPublication(f.deps).available("kit-minecraft"), false);
    f.saved[0].content = { bannerTitle: "Edited in an old builder" };
    assert.equal(await f.service.available("kit-minecraft"), false, "Editing kit content cannot silently republish it");
    assert.equal((await f.service.filterSnapshot(snapshot)).licenceKits.length, 0);
});

test("Not Live blocks direct content, responses, completion, certificates and documents, including for signed-in teachers", async (t) => {
    const f = await fixture(t);
    await f.service.setLive("kit-minecraft", false, "teacher@school.nz");
    for (const [path, method] of [
        ["/api/practical-skills/progress/kit-minecraft", "GET"],
        ["/api/practical-skills/progress/kit-minecraft/certificate.pdf", "GET"],
        ["/api/practical-skills/progress/kit-minecraft/certificate/email", "POST"],
        ["/api/practical-skills/progress/kit-minecraft/complete", "POST"],
        ["/api/practical-skills/progress/kit-minecraft/responses", "POST"],
        ["/api/practical-skills/progress/kit-minecraft/activities/0", "PUT"],
        ["/api/practical-skills/blocks/kit-minecraft/0/check", "POST"],
        ["/api/practical-skills/blocks/kit-minecraft/0/documents/test", "POST"],
        ["/api/practical-skills/minecraft-exports-folder", "POST"]
    ]) assert.equal((await f.call(path, method)).status, 403, path);
    assert.equal((await f.call("/api/practical-skills/kit-content/kit-minecraft")).status, 200, "Teachers can preview content");
    const student = createKitPublication({ ...f.deps, canManage: async () => false });
    let passed = false;
    await student.gate({ path: "/api/practical-skills/kit-content/kit-minecraft", method: "GET" }, {
        status(code) { assert.equal(code, 403); return this; }, json() {}
    }, () => { passed = true; });
    assert.equal(passed, false);
});

test("publication and reset require admin; audited reset preserves answers and unrelated students", async (t) => {
    const f = await fixture(t);
    assert.equal((await f.call("/api/admin/kit-publication/kit-minecraft", "PUT", { live: false }, false)).status, 403);
    assert.equal((await f.call("/api/admin/kit-results/kit-minecraft/reset", "POST", { emails: ["a@school.nz"] }, false)).status, 403);
    assert.equal((await f.call("/api/admin/kit-publication/kit-minecraft", "PUT", { live: "false" })).status, 400);
    assert.equal((await f.call("/api/admin/kit-publication/kit-minecraft", "PUT", { live: false })).status, 200);
    const r = await f.call("/api/admin/kit-results/kit-minecraft/reset", "POST", { emails: ["a@school.nz", "b@school.nz", "missing@school.nz"] });
    assert.equal(r.status, 200);
    const data = await r.json();
    assert.equal(data.reset.length, 2);
    assert.deepEqual(data.missing, ["missing@school.nz"]);
    assert.equal(f.rows[0].completed, false);
    assert.deepEqual(f.rows[0].responses, { answer: "Keep me" });
    assert.equal(f.rows[2].completed, true);
    assert.equal(f.audits.length, 2);
    assert.equal(JSON.parse(f.audits[0][3]).completed, true);
    assert.ok(f.queries.some(({ sql }) => sql === "COMMIT"));
    assert.ok(f.queries.some(({ sql }) => sql.includes("pg_advisory_xact_lock")));
    assert.equal(f.queries.at(-1).sql, "RELEASE");
    assert.ok(f.queries.filter(({ sql }) => /UPDATE practical_skills_progress/.test(sql)).every(({ params }) => params[0] === "kit-minecraft"));
});

test("reset rolls back and reports failure instead of claiming success", async (t) => {
    const f = await fixture(t);
    f.failUpdate();
    const response = await f.call("/api/admin/kit-results/kit-minecraft/reset", "POST", { emails: ["a@school.nz"] });
    assert.equal(response.status, 503);
    assert.equal(f.rows[0].completed, true);
    assert.ok(f.queries.some(({ sql }) => sql === "ROLLBACK"));
    assert.equal(f.queries.at(-1).sql, "RELEASE");
});

test("actual Express middleware loads custom kits on cold direct student and admin API requests", async (t) => {
    const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
    const start = source.indexOf('app.use(["/api/practical-skills", "/api/admin/practical-skills"]');
    const end = source.indexOf('\napp.use("/images/activities"', start);
    assert.ok(start >= 0 && end > start);
    const app = express();
    let loaded = false;
    vm.runInContext(source.slice(start, end), vm.createContext({
        app, ensureCustomPracticalSkillsKitsLoaded: async () => { loaded = true; }
    }));
    const paths = ["/api/practical-skills/my-progress", "/api/admin/practical-skills/kits"];
    for (const route of paths) app.get(route, (_req, res) => res.json({ customKitVisible: loaded }));
    const server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
    for (const route of paths) {
        loaded = false;
        const response = await fetch(`http://127.0.0.1:${server.address().port}${route}`);
        assert.equal((await response.json()).customKitVisible, true, route);
        assert.equal(response.headers.get("cache-control"), "private, no-store");
    }
});

test("a queued certificate send rechecks publication and reset state after taking its lock", async () => {
    const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
    const start = source.indexOf("async function sendKitCertificateEmail(");
    const end = source.indexOf("\n// Claims the one automatic", start);
    let live = false;
    let locked = false;
    const context = vm.createContext({
        pool: { query: async () => { assert.equal(locked, true); return { rows: [{ completed: false }] }; } },
        hasDatabase: true,
        kitPublication: { available: async () => { assert.equal(locked, true); return live; } },
        withKitCertificateEmailLock: async (_pool, _db, _email, _kitId, callback) => {
            locked = true;
            try { return await callback(); } finally { locked = false; }
        },
        createKitCertificatePdf: async () => assert.fail("No certificate PDF should be created after reset"),
        sendConfiguredHubEmail: async () => assert.fail("No certificate email should be sent after reset")
    });
    vm.runInContext(source.slice(start, end), context);
    await assert.rejects(context.sendKitCertificateEmail("a@school.nz", "kit-minecraft", {}), /Not Live/);
    live = true;
    await assert.rejects(context.sendKitCertificateEmail("a@school.nz", "kit-minecraft", {}), /has been reset/);
});
