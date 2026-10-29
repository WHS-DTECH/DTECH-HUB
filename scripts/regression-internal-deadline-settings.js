"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { registerInternalDeadline, validDeadline } = require("../internal-deadline");

test("Shared deadline validates real calendar dates and persists across fresh services with teacher-only writes", async (t) => {
    for (const date of ["2026-11-05", "2028-02-29"]) assert.equal(validDeadline(date), true);
    for (const date of ["2026-02-29", "2026-11-31", "", null, "2026-1-2", "2101-01-01"]) assert.equal(validDeadline(date), false);
    let saved;
    let fail = false;
    const writes = [];
    const pool = { query: async (sql, params) => {
        if (fail) throw new Error("Database unavailable");
        if (sql.startsWith("CREATE TABLE")) return { rows: [] };
        if (sql.startsWith("SELECT")) return { rows: saved ? [{ due_date: saved }] : [] };
        writes.push(params);
        saved = params[0];
        return { rows: [] };
    } };
    const start = async () => {
        const app = express();
        app.use(express.json());
        registerInternalDeadline(app, {
            pool, getRequestUserEmail: (req) => req.headers["x-user-email"] || "",
            normalizeEmail: (value) => value.toLowerCase(), schoolDomain: "school.nz",
            canManage: async (email) => email === "teacher@school.nz"
        });
        const server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
        t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
        return (email, date) => fetch(`http://127.0.0.1:${server.address().port}/api/internal-assessment-deadline`, {
            method: date === undefined ? "GET" : "PUT",
            headers: { "Content-Type": "application/json", "x-user-email": email },
            body: date === undefined ? undefined : JSON.stringify({ date })
        });
    };
    const call = await start();
    assert.equal((await call("")).status, 401);
    assert.equal((await call("student@school.nz", "2026-11-05")).status, 403);
    assert.equal((await call("teacher@school.nz", "2026-02-30")).status, 400);
    assert.deepEqual(await (await call("student@school.nz")).json(), { date: "2026-10-29" });
    assert.deepEqual(await (await call("teacher@school.nz", "2026-11-05")).json(), { date: "2026-11-05" });
    assert.deepEqual(writes, [["2026-11-05", "teacher@school.nz"]]);
    const fresh = await start();
    assert.deepEqual(await (await fresh("student@school.nz")).json(), { date: "2026-11-05" });
    fail = true;
    assert.equal((await call("student@school.nz")).status, 500);
    assert.equal((await call("teacher@school.nz", "2026-12-01")).status, 500);
    assert.equal(saved, "2026-11-05", "Failed saves cannot report a changed date");
});

test("Homepage deadline and popup share the saved date; edit is Teacher View only and load failures are explicit", async () => {
    const source = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
    const start = source.indexOf("let INTERNAL_ASSESSMENT_DEADLINE =");
    const end = source.indexOf("function renderHubPracticalSkillsMenu(", start);
    const nodes = new Map();
    const node = (selector) => {
        if (!nodes.has(selector)) nodes.set(selector, { hidden: true, disabled: true, textContent: "" });
        return nodes.get(selector);
    };
    let mode = "student";
    let fail = false;
    let requests = 0;
    const context = vm.createContext({
        document: { querySelector: node }, Intl, Date,
        hubAuthState: { profile: { email: "student@school.nz" } },
        hubAccessState: { canTeacherView: false, canAdmin: false },
        getEffectiveHubViewMode: () => mode, normalizeEmail: (value) => value.toLowerCase(),
        withHubAuthHeaders: () => ({}), console,
        fetch: async () => { requests++; return { ok: !fail,
            json: async () => fail ? { error: "Database unavailable" } : { date: "2026-11-05" } }; }
    });
    vm.runInContext(source.slice(start, end), context);
    await context.renderInternalDeadlineCard();
    assert.equal(node("#hub-deadline-card-date").textContent, "Thursday 5 November");
    assert.equal(node("#hub-deadline-edit").disabled, true);
    assert.equal(context.shouldShowInternalAssessmentDeadlineReminder(new Date("2026-11-02T12:00:00+13:00")), true);
    context.hubAccessState.canTeacherView = true;
    await context.renderInternalDeadlineCard();
    assert.equal(node("#hub-deadline-edit").disabled, true, "Staff in Student View cannot edit");
    mode = "teacher";
    await context.renderInternalDeadlineCard();
    assert.equal(node("#hub-deadline-edit").disabled, false);
    assert.equal(requests, 1, "Card and reminder reuse the shared settings read");
    context.hubAuthState.profile.email = "other@school.nz";
    fail = true;
    await context.renderInternalDeadlineCard();
    assert.equal(node("#hub-deadline-card-date").textContent, "Date unavailable");
    assert.equal(node("#hub-deadline-card-status").textContent, "Database unavailable");
    assert.equal(node("#hub-deadline-retry").hidden, false);
    assert.equal(node("#hub-deadline-edit").disabled, true);
    assert.match(source, /await loadInternalAssessmentDeadline\(email\)/);
    assert.match(source, /<span>\$\{due.month\}<\/span><strong>\$\{due.day\}<\/strong>/);
});

test("Teacher date editor saves globally, reloads the card and reports failed saves without closing", async () => {
    const source = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
    const start = source.indexOf("let INTERNAL_ASSESSMENT_DEADLINE =");
    const end = source.indexOf("function renderHubPracticalSkillsMenu(", start);
    const elements = new Map();
    const node = (selector) => {
        if (!elements.has(selector)) elements.set(selector, { hidden: true, textContent: "", disabled: false });
        return elements.get(selector);
    };
    let active;
    let saved = "2026-10-29";
    let fail = false;
    let writes = 0;
    const context = vm.createContext({
        document: {
            querySelector: (selector) => selector === ".hub-deadline-editor" ? active || null
                : selector === ".hub-internal-deadline-reminder" ? null : node(selector),
            createElement: () => {
                const fields = new Map();
                return {
                    setAttribute() {}, innerHTML: "", listeners: {},
                    querySelector(selector) {
                        if (!fields.has(selector)) fields.set(selector, {
                            value: "2026-11-12", disabled: false, textContent: "", focus() {},
                            addEventListener(_name, fn) { this.handler = fn; }
                        });
                        return fields.get(selector);
                    },
                    addEventListener(name, fn) { this.listeners[name] = fn; },
                    showModal() {}, close() { this.listeners.close(); }, remove() { active = null; }
                };
            },
            body: { appendChild(dialog) { active = dialog; } }
        },
        Intl, Date, console, hubAuthState: { profile: { email: "teacher@school.nz" } },
        hubAccessState: { canTeacherView: true }, getEffectiveHubViewMode: () => "teacher",
        normalizeEmail: (value) => value.toLowerCase(), withHubAuthHeaders: (headers) => headers,
        fetch: async (_url, options) => {
            if (options.method === "PUT") {
                writes++;
                if (fail) return { ok: false, json: async () => ({ error: "Save was not confirmed." }) };
                saved = JSON.parse(options.body).date;
            }
            return { ok: true, json: async () => ({ date: saved }) };
        }
    });
    vm.runInContext(source.slice(start, end), context);
    await context.renderInternalDeadlineCard();
    context.openInternalDeadlineEditor();
    assert.ok(active);
    fail = true;
    await active.querySelector("form").handler({ preventDefault() {} });
    assert.match(active.querySelector('[role="status"]').textContent, /Save was not confirmed/);
    assert.equal(active.querySelector('[type="submit"]').disabled, false);
    assert.equal(saved, "2026-10-29");
    fail = false;
    await active.querySelector("form").handler({ preventDefault() {} });
    assert.equal(active, null);
    assert.equal(node("#hub-deadline-card-date").textContent, "Thursday 12 November");
    assert.equal(context.internalDeadlineDateParts().label, "Thursday 12 November");
    assert.equal(writes, 2);
});
