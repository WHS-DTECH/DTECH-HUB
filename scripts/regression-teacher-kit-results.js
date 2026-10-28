"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { registerTeacherResults, ensureTeacherKitChocolateSchema } = require("../practical-skills/teacher-results-store");

async function fixture(t) {
    const app = express();
    app.use(express.json());
    const queries = [];
    let fail = false;
    let documentsExist = true;
    const chocolates = new Map();
    const classProgress = [{ student_email: "student@school.nz", kit_id: "kit-minecraft", started_at: "2026-10-19", completed: true, completed_at: "2026-10-20" }];
    const row = { student_email: "student@school.nz", completed: true, completed_activities: { "0": "2026-10-20" }, responses: { "0-answer": "Saved answer" } };
    const content = { identity: { name: "Minecraft" }, worksheets: [{ activity: "First build" }], activities: [] };
    registerTeacherResults(app, {
        schoolDomain: "school.nz",
        requireAdminAccess(req, res, next) { if (req.headers["x-test-admin"] !== "yes") return res.status(403).json({ error: "Admin required" }); next(); },
        getDefaultPracticalSkillsKitContent: () => ({}),
        pool: { async query(sql, params) {
            assert.match(sql, /^(SELECT |INSERT INTO practical_skills_chocolate )/, "Only Chocolate may be changed");
            queries.push({ sql, params });
            if (fail) throw new Error("Database unavailable");
            if (sql.startsWith("INSERT INTO practical_skills_chocolate ")) {
                chocolates.set(`${params[0]}:${params[1]}`, { student_email: params[0], kit_id: params[1], chocolate: params[2] });
                return { rows: [{ chocolate: params[2] }] };
            }
            if (sql.includes("FROM practical_skills_chocolate")) return { rows: [...chocolates.values()] };
            if (sql.includes("FROM practical_skills_kit_content")) return { rows: [{ content }] };
            if (sql.includes("FROM practical_skills_progress")) return { rows: sql.includes("kit_id = ANY") ? classProgress : [row] };
            if (sql.includes("to_regclass")) return { rows: [{ documents_table: documentsExist ? "student_kit_documents" : null }] };
            if (sql.includes("FROM student_kit_documents")) return { rows: [{ student_email: row.student_email, document_id: "doc123" }] };
            throw new Error("Unexpected SQL");
        } },
        getClassData: async () => ({
        students: [
            { name: "Student One", email: "student@school.nz", homeroom: "7A", timetableClass: "JPI", course: "JuniorDTECH" },
            { name: "Student Two", email: "other@school.nz", homeroom: "8B", course: "JuniorDTECH" }
        ],
        kits: [{ id: "kit-minecraft", title: "Minecraft Player Kit" }]
        })
    });
    const server = await new Promise((resolve) => { const instance = app.listen(0, "127.0.0.1", () => resolve(instance)); });
    t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
    const url = `http://127.0.0.1:${server.address().port}/api/admin/kit-results/kit-minecraft`;
    return { queries, row, content, setFail: (value) => { fail = value; }, setDocuments: (value) => { documentsExist = value; },
        read: (emails = "student@school.nz,missing@school.nz", admin = true) => fetch(`${url}?emails=${encodeURIComponent(emails)}`, { headers: admin ? { "x-test-admin": "yes" } : {} }),
        readClass: (admin = true) => fetch(`${url.replace(/\/api\/admin\/kit-results\/kit-minecraft$/, "")}/api/admin/kit-class-progress`, { headers: admin ? { "x-test-admin": "yes" } : {} }),
        saveChocolate: (body, admin = true, kitId = "kit-minecraft") => fetch(
            `${url.replace(/\/api\/admin\/kit-results\/kit-minecraft$/, "")}/api/admin/kit-chocolate/${kitId}`,
            { method: "PUT", headers: { "Content-Type": "application/json", ...(admin ? { "x-test-admin": "yes" } : {}) }, body: JSON.stringify(body) })
    };
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

test("class progress is admin-only and read-only with completion by kit", async (t) => {
    const f = await fixture(t);
    assert.equal((await f.readClass(false)).status, 403);
    const response = await f.readClass();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const data = await response.json();
    assert.equal(data.kits[0].title, "Minecraft Player Kit");
    assert.equal(data.students[0].homeroom, "7A");
    assert.equal(data.students[0].timetableClass, "JPI");
    assert.deepEqual(data.students[0].kitProgress["kit-minecraft"], {
        started: true, completed: true, completedAt: "2026-10-20"
    });
    assert.deepEqual(data.students[1].kitProgress, {});
    assert.deepEqual(data.students[0].chocolate, {});
    assert.ok(f.queries.every(({ sql }) => sql.startsWith("SELECT ")));
    assert.match(f.queries.at(-1).sql, /^SELECT /);
});

test("Chocolate saves per student and kit, defaults to No, and never changes completion", async (t) => {
    const f = await fixture(t);
    const original = JSON.stringify(f.row);
    assert.equal((await f.saveChocolate({ email: "student@school.nz", chocolate: true }, false)).status, 403);
    for (const body of [
        { email: "student@external.nz", chocolate: true },
        { email: "student@school.nz", chocolate: "yes" },
        { email: "student@school.nz" }
    ]) assert.equal((await f.saveChocolate(body)).status, 400);
    assert.equal(f.queries.length, 0);
    assert.equal((await f.saveChocolate({ email: "missing@school.nz", chocolate: true })).status, 404);
    assert.equal((await f.saveChocolate({ email: "student@school.nz", chocolate: true }, true, "kit-missing")).status, 404);
    assert.equal(f.queries.length, 0);
    let response = await f.saveChocolate({ email: "STUDENT@school.nz", chocolate: true });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).chocolate, true);
    let data = await (await f.readClass()).json();
    assert.equal(data.students[0].chocolate["kit-minecraft"], true);
    assert.deepEqual(data.students[1].chocolate, {});
    response = await f.saveChocolate({ email: "student@school.nz", chocolate: false });
    assert.equal((await response.json()).chocolate, false);
    data = await (await f.readClass()).json();
    assert.equal(data.students[0].chocolate["kit-minecraft"], false);
    assert.equal(JSON.stringify(f.row), original);
    f.setFail(true);
    assert.equal((await f.saveChocolate({ email: "student@school.nz", chocolate: true })).status, 503);
    assert.equal((await f.readClass()).status, 503);
});

test("Chocolate schema defaults to false and stores one record per student and kit", async () => {
    const queries = [];
    await ensureTeacherKitChocolateSchema({ query: async (sql) => queries.push(sql) });
    assert.match(queries[0], /CREATE TABLE IF NOT EXISTS practical_skills_chocolate/);
    assert.match(queries[0], /chocolate BOOLEAN NOT NULL DEFAULT FALSE/);
    assert.match(queries[0], /PRIMARY KEY \(student_email, kit_id\)/);
    const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
    const startup = server.slice(server.indexOf("async function ensureSchema()"), server.indexOf("async function seedOzoneLayerReliefLesson()"));
    assert.match(startup, /ensureTeacherKitChocolateSchema\(pool\)/);
});

test("teacher review presents accessible tabs and all requested class filters", () => {
    const root = path.join(__dirname, "..");
    const html = fs.readFileSync(path.join(root, "practical-skills", "teacher-results.html"), "utf8");
    assert.match(html, /role="tablist" aria-label="Teacher review pages"/);
    assert.match(html, /id="class-progress-tab"[^>]+aria-controls="class-progress-panel"/);
    assert.match(html, /id="student-review-tab"[^>]+aria-controls="student-review-panel"/);
    assert.match(html, /id="class-course-filter"/);
    assert.match(html, /id="class-homeroom-filter"/);
    assert.match(html, /Whānau\s*<select id="class-whanau-filter"/);
    for (const code of ["JPI", "JVE", "JMM", "JSR", "JSD", "8S", "7S"]) {
        assert.ok(html.includes(`<option value="${code}">${code}</option>`));
    }
    assert.match(html, /id="class-student-filter"/);
    const script = fs.readFileSync(path.join(root, "practical-skills", "teacher-results.js"), "utf8");
    assert.match(script, /courseKey\(student\.course\) === selectedCourse/);
    assert.match(script, /student\.homeroom === selectedHomeroom/);
    assert.match(script, /student\.whanau === selectedWhanau/);
    assert.match(script, /student\.name\} \$\{student\.email/);
});

test("teacher review uses the shared main navbar without duplicate sign-in controls", () => {
    const root = path.join(__dirname, "..");
    const html = fs.readFileSync(path.join(root, "practical-skills", "teacher-results.html"), "utf8");
    assert.match(html, /<nav class="topbar" aria-label="Primary">/);
    assert.match(html, /class="brand" href="\/index.html"/);
    for (const id of ["hub-google-signin", "hub-google-signout", "hub-user-badge"]) {
        assert.equal(html.split(`id="${id}"`).length - 1, 1);
        assert.ok(html.indexOf(`id="${id}"`) < html.indexOf("<main"));
    }
    const source = fs.readFileSync(path.join(root, "script.js"), "utf8");
    const start = source.indexOf("function renderGlobalNavbar()");
    const end = source.indexOf("\nrenderGlobalNavbar();", start);
    const topbar = {
        dataset: {}, innerHTML: "",
        setAttribute() {},
        querySelectorAll: () => []
    };
    const context = vm.createContext({
        document: { querySelector: () => topbar, addEventListener() {} }
    });
    vm.runInContext(source.slice(start, end), context);
    context.renderGlobalNavbar();
    assert.equal(topbar.dataset.globalNavbar, "true");
    for (const label of ["Browse", "Upload", "Licence", "Student Work", "Settings", "Admin Menu"]) {
        assert.ok(topbar.innerHTML.includes(label), `Shared navbar contains ${label}`);
    }
});

test("class review keeps whānau and timetable homerooms separate and combines filters", async () => {
    function element() {
        return {
            value: "", children: [], events: {}, textContent: "",
            classList: { add() {}, remove() {} },
            append(child) { this.children.push(child); },
            replaceChildren(...children) { this.children = children; },
            add(child) { this.append(child); },
            setAttribute() {},
            get options() { return this.children; },
            addEventListener(type, handler) { this.events[type] = handler; }
        };
    }
    const elements = new Map();
    const el = (id) => {
        if (!elements.has(id)) elements.set(id, element());
        return elements.get(id);
    };
    const students = [
        { name: "Ana", email: "ana@school.nz", homeroom: "7WHAU", timetableClass: " jpi ", course: "JuniorDTECH" },
        { name: "Ben", email: "ben@school.nz", homeroom: "8WPAPA", timetableClass: "JPI", course: "JuniorDTECH" },
        { name: "Cara", email: "cara@school.nz", homeroom: "7WHAU", timetableClass: "JVE", course: "JuniorDTECH" },
        { name: "Dan", email: "dan@school.nz", homeroom: "JPI", timetableClass: "", course: "JuniorDTECH" }
    ];
    const source = fs.readFileSync(path.join(__dirname, "..", "practical-skills", "teacher-results.js"), "utf8");
    let failSave = false;
    const savedRequests = [];
    const context = vm.createContext({
        document: { getElementById: el, querySelector: el, createElement: element },
        window: { addEventListener() {} },
        localStorage: { getItem: () => JSON.stringify({ profile: { email: "admin@school.nz" } }) },
        Option: function (text, value) { return { textContent: text, value }; },
        fetch: async (url, options) => {
            if (options?.method === "PUT") {
                savedRequests.push(JSON.parse(options.body));
                return { ok: !failSave, json: async () => failSave
                    ? { error: "Database unavailable" } : { chocolate: JSON.parse(options.body).chocolate } };
            }
            return {
                ok: true,
                json: async () => url.includes("preview-users")
                    ? { users: [] }
                    : { students, kits: [{ id: "kit-login", title: "Login Kit" }, { id: "kit-search", title: "Search Kit" }], reviewedAt: "2026-10-28" }
            };
        }
    });
    vm.runInContext(source, context);
    await el("class-progress-refresh").events.click();
    const rows = () => el("class-progress-table-host").children[0].children[1].children;
    const names = () => rows().map((row) => row.children[0].textContent);
    assert.deepEqual(names(), ["Ana", "Ben", "Cara", "Dan"]);
    assert.equal(rows()[0].children[1].textContent, "7WHAU");
    assert.equal(rows()[0].children[2].textContent, "JPI");
    const header = el("class-progress-table-host").children[0].children[0].children[0];
    assert.deepEqual(header.children.map((cell) => cell.textContent),
        ["Student", "Whānau", "Homeroom", "Course", "Login Kit", "Chocolate", "Search Kit", "Chocolate"]);
    const chocolateCheckbox = () => rows()[0].children[5].children[0].children[0];
    assert.equal(chocolateCheckbox().checked, false);
    chocolateCheckbox().checked = true;
    await chocolateCheckbox().events.change();
    assert.equal(chocolateCheckbox().checked, true);
    assert.deepEqual(savedRequests[0], { email: "ana@school.nz", chocolate: true });
    assert.equal(rows()[0].children[7].children[0].children[0].checked, false, "Other kits stay unchanged");
    assert.equal(rows()[1].children[5].children[0].children[0].checked, false, "Other students stay unchanged");
    failSave = true;
    chocolateCheckbox().checked = false;
    await chocolateCheckbox().events.change();
    assert.equal(chocolateCheckbox().checked, true, "Failed saves restore the confirmed value");
    assert.match(el("chocolate-status").textContent, /Database unavailable/);
    assert.equal(chocolateCheckbox().disabled, false);
    failSave = false;
    chocolateCheckbox().checked = false;
    await chocolateCheckbox().events.change();
    assert.equal(chocolateCheckbox().checked, false);
    el("class-homeroom-filter").value = "JPI";
    el("class-homeroom-filter").events.change();
    assert.deepEqual(names(), ["Ana", "Ben"], "Whānau must not be used to guess missing timetable membership");
    el("class-whanau-filter").value = "7WHAU";
    el("class-whanau-filter").events.change();
    assert.deepEqual(names(), ["Ana"]);
    el("class-student-filter").value = "Ben";
    el("class-student-filter").events.input();
    assert.match(el("class-progress-status").textContent, /No students match/);
    el("class-student-filter").value = "";
    el("class-course-filter").value = "SeniorDTECH";
    el("class-course-filter").events.change();
    assert.match(el("class-progress-status").textContent, /No students match/);
});

test("read-only review suppresses the shared sidebar's mutating progress fetch", async () => {
    const root = path.join(__dirname, "..");
    const html = fs.readFileSync(path.join(root, "practical-skills", "teacher-results.html"), "utf8");
    assert.match(html, /data-hub-read-only="true"/);
    const source = fs.readFileSync(path.join(root, "script.js"), "utf8");
    const start = source.indexOf("async function loadAndRenderSidebarKit(panel)");
    const end = source.indexOf("\nfunction routeHubCourseHomepage(", start);
    assert.ok(start >= 0 && end > start);
    const elements = {};
    const context = vm.createContext({
        document: { body: { dataset: { hubReadOnly: "true" } } },
        fetch() { assert.fail("Read-only page must not fetch student progress"); }
    });

    vm.runInContext(source.slice(start, end), context);
    await context.loadAndRenderSidebarKit({ querySelector: (key) => (elements[key] ||= {}) });
    assert.equal(elements["#hub-sidebar-kit-title"].textContent, "Read-only kit review");
    assert.equal(elements["#hub-sidebar-kit-open"].hidden, true);
});

test("Licence menu links to Teacher Review with the same admin gate as Upload Kits", () => {
    const root = path.join(__dirname, "..");
    const source = fs.readFileSync(path.join(root, "script.js"), "utf8");
    assert.match(source, /id="hub-teacher-review-link" role="menuitem" href="\/practical-skills\/teacher-results\.html" hidden>Teacher Review/);
    const start = source.indexOf("    if (hubTeacherReviewLink) {");
    const end = source.indexOf("\n    if (hubSettingsLink)", start);
    const context = vm.createContext({ hubTeacherReviewLink: {}, canAdmin: false });
    const gate = source.slice(start, end);
    vm.runInContext(gate, context);
    assert.equal(context.hubTeacherReviewLink.hidden, true);
    context.canAdmin = true;
    vm.runInContext(gate, context);
    assert.equal(context.hubTeacherReviewLink.hidden, false);
    const teacherView = fs.readFileSync(path.join(root, "teacher-view.html"), "utf8");
    assert.match(teacherView, /script\.js\?v=teacher-review-1/);
});
