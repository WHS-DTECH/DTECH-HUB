"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
const start = source.indexOf('app.post("/api/activities/:id/interest",');
const end = source.indexOf('// POST /api/activities/:id/interests ', start);
assert.ok(start >= 0 && end > start);

function setup(course, options = {}) {
    let handler;
    const records = new Map();
    const calls = [];
    const email = "student@example.school.nz";
    if (options.existing) records.set("project", { confirmed: false, evidence: ["keep"] });
    const context = vm.createContext({
        app: { post: (_route, fn) => { handler = fn; } },
        normalizeEmail: (value) => String(value || "").trim().toLowerCase(),
        getRequestUserEmail: (req) => req.email,
        SCHOOL_EMAIL_DOMAIN: "example.school.nz", CLIENT_PROJECTS_TASK_ID: "49",
        hasDatabase: true, console: { error() {} },
        getLearningSitesStudentProfile: async () => {
            if (options.failProfile) throw new Error("Directory unavailable");
            return { available: options.available !== false, courseIds: options.staff ? ["STAFF"] : ["course"] };
        },
        resolveSidebarCourse: () => course,
        pool: { query: async (sql, params) => {
            calls.push({ sql, params });
            if (sql.startsWith("SELECT 1")) return { rows: records.has(params[0]) ? [{}] : [] };
            if (sql.startsWith("DELETE")) { records.delete(params[0]); return {}; }
            if (sql.startsWith("INSERT")) {
                const old = records.get(params[0]);
                if (!old) records.set(params[0], { confirmed: params[2] });
                else if (sql.includes("DO UPDATE")) old.confirmed = old.confirmed || params[2];
                return {};
            }
            if (sql.includes("SELECT activity_category")) return { rows: [{ activity_category: "Project" }] };
            if (sql.includes("COUNT(*)")) return { rows: [{ count: records.has(params[0]) ? 1 : 0 }] };
            throw new Error(`Unexpected SQL: ${sql}`);
        } }
    });
    vm.runInContext(source.slice(start, end), context);
    const call = async (projectId = "project", requestEmail = email) => {
        const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
        await handler({ params: { id: projectId }, email: requestEmail }, res);
        return res;
    };
    return { records, calls, call, context };
}

test("New MiddleDTECH and SeniorDTECH interests are saved confirmed and confirm Process Assessment", async () => {
    for (const course of ["MiddleDTECH", "SeniorDTECH"]) {
        const env = setup(course);
        env.records.set("49", { confirmed: false, evidence: ["existing work"] });
        const res = await env.call();
        assert.equal(res.code, 200);
        assert.equal(res.body.interested, true);
        assert.equal(res.body.confirmed, true);
        assert.equal(env.records.get("project").confirmed, true);
        assert.equal(env.records.get("49").confirmed, true);
        assert.deepEqual(env.records.get("49").evidence, ["existing work"]);
        assert.equal(res.body.count, 1);
    }
});

test("Junior, unknown, unavailable and staff profiles retain manual confirmation", async () => {
    for (const [course, options] of [
        ["JuniorDTECH", {}], ["", {}], ["SeniorDTECH", { available: false }], ["SeniorDTECH", { staff: true }]
    ]) {
        const env = setup(course, options);
        const res = await env.call();
        assert.equal(res.body.interested, true);
        assert.equal(res.body.confirmed, false);
        assert.equal(env.records.get("project").confirmed, false);
        assert.equal(env.records.get("49").confirmed, false);
    }
});

test("Unticking retains existing removal behavior, without re-confirming a teacher's change on reads", async () => {
    const env = setup("SeniorDTECH", { existing: true });
    env.context.getLearningSitesStudentProfile = async () => { throw new Error("Not needed for removal"); };
    const res = await env.call();
    assert.equal(res.body.interested, false);
    assert.equal(res.body.confirmed, false);
    assert.equal(env.records.has("project"), false);
    assert.equal(env.calls.some(({ sql }) => sql.startsWith("INSERT")), false);
    const teacherStart = source.indexOf('app.patch("/api/activities/:id/interests/:studentEmail/confirm",');
    const teacherEnd = source.indexOf("// PATCH /api/activities/:id/interests/:studentEmail/standards", teacherStart);
    assert.match(source.slice(teacherStart, teacherEnd), /const confirmed = req.body\?\.confirmed !== false/);
    assert.match(source.slice(teacherStart, teacherEnd), /UPDATE project_interests SET confirmed = \$1/);
});

test("Direct Process Assessment selection confirms without a duplicate allocation", async () => {
    const env = setup("MiddleDTECH");
    const res = await env.call("49");
    assert.equal(res.body.confirmed, true);
    assert.equal(env.calls.filter(({ sql }) => sql.startsWith("INSERT")).length, 1);
});

test("Invalid identity and profile failures do not save success-shaped interests", async () => {
    const env = setup("SeniorDTECH", { failProfile: true });
    assert.equal((await env.call()).code, 500);
    assert.equal(env.records.size, 0);
    assert.equal((await env.call("project", "external@example.com")).code, 401);
    assert.equal(env.records.size, 0);
});
