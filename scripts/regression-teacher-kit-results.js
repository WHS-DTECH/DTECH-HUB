"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { registerTeacherResults, ensureTeacherKitChocolateSchema, getTeacherKitCourse } = require("../practical-skills/teacher-results-store");
const { getHuntProfile } = require("../learning-sites-assessment");

test("document reviews renew expired verification and retry 401 only once", async () => {
    const source = fs.readFileSync(path.join(__dirname, "..", "practical-skills", "teacher-results.js"), "utf8");
    const headers = source.slice(source.indexOf("    function adminHeaders("), source.indexOf("    function courseKey("));
    const request = source.slice(source.indexOf("    async function fetchDocumentReview("), source.indexOf("    function courseLabel("));
    const jwt = (exp) => `header.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.signature`;
    async function run(auth, statuses, renewalError, changedEmail) {
        const calls = [], renewals = [];
        const context = vm.createContext({
            refreshingReviewEmail: "",
            localStorage: { getItem: () => JSON.stringify(auth) },
            sessionStorage: { getItem: () => null },
            atob: (text) => Buffer.from(text, "base64").toString(),
            requestHubDriveAccessToken: async (options) => {
                renewals.push(options.forceRefresh);
                if (changedEmail) auth.profile.email = changedEmail;
                return renewalError ? { error: renewalError } : { access_token: "renewed" };
            },
            fetch: async (url, options) => {
                calls.push({ url, ...options });
                return { status: statuses.shift() || 200 };
            }
        });
        vm.runInContext(headers + request, context);
        const options = { method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ approved: true, email: "student@school.nz", documentKey: "google-file:ship" }) };
        let result, error;
        try { result = await context.fetchDocumentReview("/api/admin/kit-document-review/kit-google-drawings/0", options); }
        catch (caught) { error = caught.message; }
        assert.equal(context.refreshingReviewEmail, "", "Refresh state always cleared");
        for (const call of calls) {
            assert.equal(call.method, options.method);
            assert.equal(call.body, options.body);
            assert.equal(call.headers["Content-Type"], "application/json");
            assert.equal(call.headers["x-user-email"], "teacher@school.nz");
        }
        return { calls, renewals, result, error };
    }
    const auth = (idToken, accessToken = "", expiresAt = 0) => ({
        profile: { email: "teacher@school.nz" }, idToken, accessToken, expiresAt
    });
    let result = await run(auth(jwt(Date.now() / 1000 + 600)), [200]);
    assert.deepEqual(result.renewals, []);
    assert.match(result.calls[0].headers.Authorization, /^Bearer header\./);
    result = await run(auth(jwt(1), "live", Date.now() + 60000), [200]);
    assert.equal(result.calls[0].headers.Authorization, "Bearer live");
    assert.deepEqual(result.renewals, []);
    result = await run(auth(jwt(1), "expired", 1), [200]);
    assert.deepEqual(result.renewals, [false]);
    assert.equal(result.calls[0].headers.Authorization, "Bearer renewed");
    result = await run(auth(null), [200]);
    assert.deepEqual(result.renewals, [false]);
    result = await run(auth(jwt(Date.now() / 1000 + 600)), [401, 401]);
    assert.deepEqual(result.renewals, [true]);
    assert.equal(result.calls.length, 2);
    assert.equal(result.result.status, 401, "Second rejection remains an error for the caller");
    result = await run(auth(null), [], "Google sign-in was closed");
    assert.match(result.error, /sign-in was closed/);
    assert.equal(result.calls.length, 0);
    result = await run(auth(null), [], null, "another@school.nz");
    assert.match(result.error, /account changed/);
    assert.equal(result.calls.length, 0, "Never review as a newly selected account");
});

test("teacher course groups require enrolment, not just a year-level folder", () => {
    for (const year of [9, 10]) {
        for (const programs of [[], ["COMP"], ["MPROG"], ["DTECH"]]) {
            const student = { year_level: String(year), programs };
            const before = JSON.stringify(student);
            assert.equal(getTeacherKitCourse(getHuntProfile(student)), "",
                `Year ${year} ${programs.join(",") || "without enrolment"} is not MDTECH`);
            assert.equal(JSON.stringify(student), before);
        }
        assert.equal(getTeacherKitCourse(getHuntProfile({ year_level: String(year), programs: ["MDTECH", "DTECH"] })), "MiddleDTECH");
    }
    assert.equal(getTeacherKitCourse(getHuntProfile({ year_level: "7", timetable_class: "JPI" })), "JuniorDTECH");
    assert.equal(getTeacherKitCourse(getHuntProfile({ year_level: "8", programs: [] })), "");
    for (const year of [11, 12, 13]) {
        for (const program of ["DTECH", "COMP"]) {
            assert.equal(getTeacherKitCourse(getHuntProfile({ year_level: String(year), programs: [program] })), "SeniorDTECH");
        }
        assert.equal(getTeacherKitCourse(getHuntProfile({ year_level: String(year), programs: [] })), "");
    }
    assert.equal(getTeacherKitCourse(null), "");
    const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
    const provider = source.slice(source.indexOf("async function getTeacherKitClassData()"), source.indexOf('app.get("/api/admin/practical-skills/preview-users"'));
    assert.match(provider, /getTeacherKitCourse\(getHuntProfile\(row\)\)/);
    assert.doesNotMatch(provider, /getResearchReportProgrammeFolder|yearNumber/);
});

test("typing weekly table follows filters and persists independent per-week book signatures", async () => {
    function element() {
        return { value: "", children: [], events: {}, textContent: "", checked: false,
            classList: { add() {}, remove() {} },
            append(child) { this.children.push(child); }, replaceChildren(...children) { this.children = children; },
            add(child) { this.append(child); }, setAttribute(name, value) { this[name] = value; },
            get options() { return this.children; }, addEventListener(type, handler) { this.events[type] = handler; } };
    }
    const elements = new Map();
    const el = id => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); };
    const weeks = Array.from({ length: 7 }, (_, index) => ({ week: index + 1,
        weekStart: new Date(Date.UTC(2026, 9, 26 + index * 7)).toISOString().slice(0, 10),
        status: index < 4 ? "legacy" : index === 4 ? "excused" : "future", attendanceConfirmed: true, lessons: [] }));
    weeks[0].lessons = [{ date: "2026-10-30", period: "p2", mark: "A" }];
    weeks[1].lessons = [{ date: "2026-11-02", period: "p1", mark: "P" },
        { date: "2026-11-03", period: "p2", mark: "L" }, { date: "2026-11-04", period: "p3", mark: "" }];
    weeks[2].lessons = [{ date: "2026-11-13", period: "p2", mark: "A" }];
    const signatures = [];
    const writes = [];
    let failSave = false, failRead = false, failAttendance = false, attendanceDate = "", today = "2026-11-09";
    let releaseAttendance;
    const attendanceGate = new Promise(resolve => { releaseAttendance = resolve; });
    const students = [{ name: "Ana", email: "ana@school.nz", timetableClass: "JPI", course: "JuniorDTECH" },
        { name: "Ben", email: "ben@school.nz", timetableClass: "JVE", course: "JuniorDTECH" }];
    const context = vm.createContext({
        document: { getElementById: el, querySelector: el, createElement: element },
        window: { addEventListener() {}, location: { search: "" } }, URLSearchParams,
        localStorage: { getItem: () => JSON.stringify({ profile: { email: "teacher@school.nz" } }) },
        Option: function(text, value) { return { textContent: text, value }; },
        fetch: async (url, options) => {
            if (url.includes("typing-kit-book-signature")) {
                const body = JSON.parse(options.body);
                writes.push(body);
                if (!failSave) {
                    const index = signatures.findIndex(entry => entry.weekStart === body.weekStart && entry.period === body.period);
                    if (index >= 0) signatures.splice(index, 1);
                    signatures.push({ weekStart: body.weekStart, period: body.period, signed: body.signed });
                }
                return { ok: !failSave, json: async () => failSave ? { error: "Signature database unavailable" } : { signed: body.signed } };
            }
            if (url.includes("typing-kit-results")) {
                const deferred = url.includes("attendance=deferred");
                if (!deferred) await attendanceGate;
                const failed = failRead || (!deferred && failAttendance);
                return { ok: !failed, json: async () => failed ? { error: "Weekly read unavailable" } : {
                    startDate: !deferred && attendanceDate || weeks[0].weekStart,
                    students: students.filter(student => decodeURIComponent(url).includes(student.email)).map(student => ({
                        email: student.email, signatures: JSON.parse(JSON.stringify(signatures)),
                        attempts: [{ weekStart: weeks[0].weekStart, period: 1, netWpm: 35, accuracy: 97, submittedAt: "2026-10-27T00:00:00Z" },
                            { weekStart: weeks[0].weekStart, period: 2, netWpm: 38, accuracy: 98, submittedAt: "2026-10-29T00:00:00Z" }],
                        weeklyProgress: { sourceStatus: deferred ? "loading" : "available", today, weeks }
                    }))
                } };
            }
            return { ok: true, json: async () => url.includes("preview-users") ? { users: [] }
                : url.includes("kit-submissions") ? { kits: [] }
                    : { students, kits: [{ id: "kit-typing", title: "Typing Kit" }, { id: "kit-login", title: "Login Kit" }] } };
        }
    });
    el("typing-week-filter").value = "current";
    for (const value of ["current", "all", "1", "2", "3", "4", "5", "6", "7"]) {
        el("typing-week-filter").add({ value, textContent: value });
    }
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "practical-skills", "teacher-results.js"), "utf8"), context);
    const settle = async () => { for (let i = 0; i < 12; i++) await new Promise(resolve => setImmediate(resolve)); };
    await settle();
    assert.equal(el("class-typing-results").hidden, true, "Only selecting Typing Kit loads the weekly view");
    el("class-homeroom-filter").value = "JPI";
    el("class-homeroom-filter").events.change();
    el("class-kit-filter").value = "kit-typing";
    el("class-kit-filter").events.change();
    await settle();
    const table = () => el("class-typing-table-host").children[0];
    const rows = () => table().children[1].children;
    const tick = period => rows()[0].children[period + 1].children[0].children[0];
    const header = () => table().children[0].children[0].children.map(cell => cell.textContent);
    const selectWeek = value => { el("typing-week-filter").value = value; el("typing-week-filter").events.change(); };
    const weekOptions = () => el("typing-week-filter").options.map(option => option.textContent);
    assert.deepEqual(weekOptions().slice(0, 2), ["current", "all"], "Current and All weeks options are unchanged");
    assert.equal(weekOptions()[2], "Week 1 (26 Oct 2026 - 1 Nov 2026)");
    assert.equal(weekOptions()[8], "Week 7 (7 Dec 2026 - 13 Dec 2026)");
    assert.equal(el("typing-week-filter").value, "current", "Populating dates preserves the current selection");
    selectWeek("1");
    assert.ok(rows()[0].children[1].children.some(child => /35 WPM - 97%/.test(child.textContent)),
        "Saved results appear before attendance completes");
    const savedResults = rows()[0].children[1].children.filter(child => child.className === "typing-saved-result");
    assert.equal(savedResults.length, 2, "Both saved periods are highlighted");
    assert.match(savedResults[0].textContent, /^Saved result: 35 WPM - 97%/);
    assert.ok(rows()[0].children[1].children.some(child => /Checking attendance/.test(child.textContent)));
    assert.ok(!rows()[0].children[1].children.some(child => /Teacher Planner attendance \(school periods\)/.test(child.textContent)),
        "Loading attendance never presents unconfirmed marks");
    selectWeek("current");
    releaseAttendance();
    await settle();
    assert.deepEqual(header(), ["Student", "Week 3 (2026-11-09) - Results", "Week 3 - Period 1 signed", "Week 3 - Period 2 signed"],
        "Current NZ Monday defaults to the current Typing Kit week");
    assert.equal(rows()[0].children.length, 4);
    assert.ok(rows()[0].children[1].children.some(child => /13 Nov 2026 - School P2: Not yet held/.test(child.textContent)),
        "Future lessons are not presented as absent");
    assert.match(table().className, /class-progress-table-focused/, "Single-week table can fit narrow screens");
    tick(2).checked = true;
    await tick(2).events.change();
    assert.deepEqual(writes[0], { email: "ana@school.nz", weekStart: weeks[2].weekStart, period: 2, signed: true },
        "Current-week tick saves the displayed week and period");
    selectWeek("all");
    assert.equal(table().children[0].children[0].children.length, 22, "All weeks shows every result and signature column");
    assert.equal(rows().length, 1);
    assert.equal(rows()[0].children.length, 22);
    assert.equal(rows()[0].children[0].textContent, "Ana");
    assert.ok(rows()[0].children[1].children.some(child => /30 Oct 2026 - School P2: Absent/.test(child.textContent) &&
        child.className === "typing-attendance-absent"), "Saved absence is visible even in optional weeks");
    assert.ok(!rows()[0].children[1].children.some(child => /26 Oct 2026 - School/.test(child.textContent)),
        "A holiday without a scheduled lesson is not invented");
    assert.ok(rows()[0].children[1].children.some(child => /35 WPM - 97%/.test(child.textContent)));
    assert.ok(rows()[0].children[1].children.some(child => /38 WPM - 98%/.test(child.textContent)), "Both periods show their saved scores");
    assert.equal(rows()[0].children[13].children[0].textContent, "Excused - absent");
    selectWeek("1");
    assert.deepEqual(header(), ["Student", "Week 1 (2026-10-26) - Results", "Week 1 - Period 1 signed", "Week 1 - Period 2 signed"]);
    assert.equal(tick(1).checked, false);
    tick(1).checked = true;
    await tick(1).events.change();
    assert.equal(tick(1).checked, true);
    assert.deepEqual(writes[1], { email: "ana@school.nz", weekStart: weeks[0].weekStart, period: 1, signed: true });
    assert.equal(tick(2).checked, false, "Periods are independent");
    selectWeek("2");
    for (const mark of ["School P1: Present", "School P2: Late", "School P3: Not recorded"]) {
        assert.ok(rows()[0].children[1].children.some(child => child.textContent.includes(mark)), mark);
    }
    assert.equal(rows()[0].children[1].children.filter(child => child.className === "typing-saved-result").length, 0,
        "Periods with no saved results are not highlighted");
    assert.equal(tick(1).checked, false, "Weeks are independent");
    selectWeek("1");
    assert.equal(tick(1).checked, true, "Returning to the signed week preserves its confirmed tick");
    failSave = true;
    tick(1).checked = false;
    await tick(1).events.change();
    assert.equal(tick(1).checked, true, "Failed saves restore confirmed signatures");
    assert.match(el("typing-signature-status").textContent, /Signature database unavailable/);
    await el("class-progress-refresh").events.click();
    await settle();
    assert.equal(el("typing-week-filter").value, "1", "Refresh preserves a specific week");
    assert.equal(tick(1).checked, true, "Refresh loads persisted signatures");
    assert.equal(writes.length, 3, "Reading and selecting weeks never save signatures");
    selectWeek("current");
    today = "2026-10-25";
    await el("class-progress-refresh").events.click();
    await settle();
    assert.match(el("typing-review-status").textContent, /no current week/i, "Before the calendar, never guess a current week");
    assert.equal(el("class-typing-table-host").children.length, 0);
    selectWeek("7");
    assert.match(header()[1], /Week 7/, "Past or future weeks can still be selected");
    today = "2026-12-14";
    selectWeek("current");
    await el("class-progress-refresh").events.click();
    await settle();
    assert.match(el("typing-review-status").textContent, /no current week/i, "After the calendar, never guess a current week");
    today = "2026-12-13";
    await el("class-progress-refresh").events.click();
    await settle();
    assert.match(header()[1], /Week 7/, "Sunday is still in the final week");
    today = "";
    await el("class-progress-refresh").events.click();
    await settle();
    assert.match(el("typing-review-status").textContent, /date could not be confirmed/, "Invalid server date is surfaced");
    selectWeek("3");
    assert.equal(tick(2).checked, true, "A selected week's saved signature remains available when the current date is unconfirmed");
    el("class-student-filter").value = "missing";
    el("class-student-filter").events.input();
    assert.match(el("typing-review-status").textContent, /No students match/);
    assert.equal(el("class-typing-table-host").children.length, 0);
    el("class-student-filter").value = "";
    failAttendance = true;
    await el("class-progress-refresh").events.click();
    await settle();
    assert.equal(tick(2).checked, true, "Attendance failure keeps saved book signatures");
    assert.ok(rows()[0].children[1].children.some(child => /Weekly read unavailable/.test(child.textContent)),
        "Attendance failure is visible alongside saved typing data");
    assert.ok(!rows()[0].children[1].children.some(child => /Teacher Planner attendance \(school periods\)/.test(child.textContent)),
        "An unavailable attendance response does not display stale marks");
    failAttendance = false;
    attendanceDate = "2026-11-02";
    await el("class-progress-refresh").events.click();
    await settle();
    assert.equal(tick(2).checked, true, "A calendar change does not replace saved signatures");
    assert.ok(rows()[0].children[1].children.some(child => /calendar changed/.test(child.textContent)));
    attendanceDate = "";
    weeks.forEach((week, index) => {
        week.weekStart = new Date(Date.UTC(2026, 11, 28 + index * 7)).toISOString().slice(0, 10);
    });
    await el("class-progress-refresh").events.click();
    await settle();
    assert.equal(el("typing-week-filter").value, "3", "Calendar refresh keeps the chosen week");
    assert.equal(weekOptions()[2], "Week 1 (28 Dec 2026 - 3 Jan 2027)", "Calendar changes update dates across years");
    failRead = true;
    await el("class-progress-refresh").events.click();
    await settle();
    assert.match(el("typing-review-status").textContent, /could not be read/);
    assert.equal(el("class-typing-table-host").children.length, 0, "Failed reads do not invent empty results or unsigned ticks");
    assert.equal(weekOptions()[2], "Week 1", "Failed reads clear stale calendar dates");
    el("class-kit-filter").value = "kit-login";
    el("class-kit-filter").events.change();
    assert.equal(el("class-typing-results").hidden, true);
});

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
    assert.match(html, /id="class-chocolate-filter" disabled/);
    assert.match(html, /id="class-kit-focus" type="checkbox" disabled/);
    assert.match(html, /Show selected kit only/);
    const css = fs.readFileSync(path.join(root, "practical-skills", "teacher-results.css"), "utf8");
    assert.match(css, /\.class-progress-table-focused\s*\{\s*min-width: 0;/);
    assert.match(html, /class="sites-editor teacher-review-page"/);
    assert.match(css, /\.sites-editor\.teacher-review-page\s*\{\s*width: calc\(100% - 32px\)/);
    assert.match(css, /\.class-progress-table-host\s*\{\s*overflow: auto/);
    assert.match(css, /\.class-submissions-table textarea\s*\{[^}]*width: 100%/);
    assert.match(html, /id="class-progress-table-host"[^>]*tabindex="0" role="region"/);
    assert.match(html, /id="class-typing-table-host"[^>]*tabindex="0" role="region"/);
    assert.match(html, /<option value="yes">Yes - given<\/option>/);
    assert.match(html, /<option value="no">No - not given<\/option>/);
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
        { name: "Ana", email: "ana@school.nz", homeroom: "7WHAU", timetableClass: " jpi ", course: "JuniorDTECH",
            kitProgress: { "kit-login": { completed: true, started: false }, "kit-search": { started: true } } },
        { name: "Ben", email: "ben@school.nz", homeroom: "8WPAPA", timetableClass: "JPI", course: "JuniorDTECH",
            chocolate: { "kit-search": true },
            kitProgress: { "kit-login": { started: true }, "kit-search": { completed: true } } },
        { name: "Cara", email: "cara@school.nz", homeroom: "7WHAU", timetableClass: "JVE", course: "JuniorDTECH",
            kitProgress: { "kit-login": { started: false, completed: false } } },
        { name: "Dan", email: "dan@school.nz", homeroom: "JPI", timetableClass: "", course: "" }
    ];
    const source = fs.readFileSync(path.join(__dirname, "..", "practical-skills", "teacher-results.js"), "utf8");
    let kits = [{ id: "kit-login", title: "Login Kit" }, { id: "kit-search", title: "Search Kit" }];
    let failSave = false;
    const savedRequests = [];
    const context = vm.createContext({
        document: { getElementById: el, querySelector: el, createElement: element },
        window: { addEventListener() {}, location: { search: "" } },
        URLSearchParams,
        localStorage: { getItem: () => JSON.stringify({ profile: { email: "admin@school.nz" } }) },
        Option: function (text, value) { return { textContent: text, value }; },
        fetch: async (url, options) => {
            if (url.includes("kit-submissions")) return { ok: true, json: async () => ({ kits: [] }) };
            if (options?.method === "PUT") {
                savedRequests.push(JSON.parse(options.body));
                return { ok: !failSave, json: async () => failSave
                    ? { error: "Database unavailable" } : { chocolate: JSON.parse(options.body).chocolate } };
            }
            return {
                ok: true,
                json: async () => url.includes("preview-users")
                    ? { users: [{ type: "Student", email: "dan@school.nz", course: "MiddleDTECH" }] }
                    : { students, kits, reviewedAt: "2026-10-28" }
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
    assert.equal(rows()[3].children[3].textContent, "Not assigned", "Year-based preview course cannot override enrolment");
    el("class-course-filter").value = "MiddleDTECH";
    el("class-course-filter").events.change();
    assert.match(el("class-progress-status").textContent, /No students match/);
    el("class-course-filter").value = "";
    el("class-course-filter").events.change();
    const header = el("class-progress-table-host").children[0].children[0].children[0];
    assert.deepEqual(header.children.map((cell) => cell.textContent),
        ["Student", "Whānau", "Homeroom", "Course", "Login Kit", "Chocolate", "Search Kit", "Chocolate"]);
    const chocolateCheckbox = () => rows()[0].children[el("class-kit-focus").checked ? 2 : 5].children[0].children[0];
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
    const select = (id, value) => {
        el(id).value = value;
        el(id).events.change();
    };
    assert.equal(el("class-status-filter").disabled, true, "Status needs a selected kit");
    assert.equal(el("class-chocolate-filter").disabled, true, "Chocolate needs a selected kit");
    assert.equal(el("class-kit-focus").disabled, true, "Focused view needs a selected kit");
    assert.equal(Boolean(el("class-kit-focus").checked), false);
    assert.deepEqual(el("class-kit-filter").options.map((option) => option.value), ["", "kit-login", "kit-search"]);
    select("class-kit-filter", "kit-login");
    assert.equal(el("class-status-filter").disabled, false);
    assert.equal(el("class-chocolate-filter").disabled, false);
    select("class-chocolate-filter", "no");
    assert.deepEqual(names(), ["Ana", "Ben", "Cara", "Dan"], "Missing or false Chocolate counts as No");
    select("class-chocolate-filter", "yes");
    assert.match(el("class-progress-status").textContent, /No students match/);
    select("class-chocolate-filter", "");
    select("class-status-filter", "completed");
    assert.deepEqual(names(), ["Ana"], "Completed takes priority over started");
    assert.equal(el("class-kit-focus").checked, true, "Selecting a kit enables focused view by default");
    const focus = (checked) => {
        el("class-kit-focus").checked = checked;
        el("class-kit-focus").events.change();
    };
    const headers = () => el("class-progress-table-host").children[0].children[0].children[0].children.map((cell) => cell.textContent);
    assert.equal(el("class-kit-focus").disabled, false);
    assert.deepEqual(headers(), ["Student", "Login Kit", "Chocolate"]);
    assert.deepEqual(rows()[0].children.slice(0, 2).map((cell) => cell.textContent), ["Ana", "Complete"]);
    assert.equal(rows()[0].children.length, 3, "Focused rows hide all other student details and kits");
    assert.match(el("class-progress-status").textContent, /only Login Kit/);
    assert.deepEqual(names(), ["Ana"], "Focus preserves status filtering");
    focus(false);
    assert.equal(rows()[0].children.length, 8, "Turning focus off restores the full table");
    await el("class-progress-refresh").events.click();
    assert.equal(el("class-kit-focus").checked, false, "Refresh preserves a teacher's choice to show all kits");
    assert.equal(rows()[0].children.length, 8);
    focus(true);
    select("class-status-filter", "in-progress");
    assert.deepEqual(names(), ["Ben"]);
    select("class-status-filter", "not-started");
    assert.deepEqual(names(), ["Cara", "Dan"], "Missing and explicitly unstarted progress both match");
    select("class-status-filter", "");
    assert.deepEqual(names(), ["Ana", "Ben", "Cara", "Dan"]);
    focus(false);
    select("class-kit-filter", "kit-search");
    assert.equal(el("class-kit-focus").checked, true, "Selecting another kit defaults back to focused view");
    assert.deepEqual(headers(), ["Student", "Search Kit", "Chocolate"], "Focus follows the selected kit");
    select("class-chocolate-filter", "yes");
    assert.deepEqual(names(), ["Ben"], "Chocolate Yes uses the selected kit only");
    select("class-chocolate-filter", "no");
    assert.deepEqual(names(), ["Ana", "Cara", "Dan"]);
    select("class-status-filter", "completed");
    assert.match(el("class-progress-status").textContent, /No students match/,
        "Completed plus Chocolate No excludes students already rewarded");
    select("class-chocolate-filter", "yes");
    assert.deepEqual(names(), ["Ben"], "Only the selected kit determines status");
    select("class-homeroom-filter", "JPI");
    select("class-whanau-filter", "8WPAPA");
    select("class-course-filter", "JuniorDTECH");
    el("class-student-filter").value = "ben";
    el("class-student-filter").events.input();
    assert.deepEqual(names(), ["Ben"], "All seven filters combine");
    await el("class-progress-refresh").events.click();
    assert.equal(el("class-kit-filter").value, "kit-search");
    assert.equal(el("class-status-filter").value, "completed");
    assert.equal(el("class-chocolate-filter").value, "yes");
    assert.deepEqual(names(), ["Ben"], "Refresh preserves filters");
    assert.equal(el("class-kit-focus").checked, true, "Refresh preserves focused view");
    assert.deepEqual(headers(), ["Student", "Search Kit", "Chocolate"]);
    failSave = true;
    const focusedReward = rows()[0].children[2].children[0].children[0];
    assert.equal(focusedReward.checked, true);
    focusedReward.checked = false;
    await focusedReward.events.change();
    assert.equal(rows()[0].children[2].children[0].children[0].checked, true, "Focused failed save restores confirmed Chocolate");
    assert.deepEqual(savedRequests.at(-1), { email: "ben@school.nz", chocolate: false }, "Focused checkbox targets the selected kit/student");
    failSave = false;
    const beforeFiltering = JSON.stringify(students);
    kits = kits.filter((kit) => kit.id !== "kit-search");
    await el("class-progress-refresh").events.click();
    assert.equal(el("class-kit-filter").value, "");
    assert.equal(el("class-kit-focus").checked, false, "Removed kits clear focus");
    assert.equal(el("class-kit-focus").disabled, true);
    assert.equal(el("class-status-filter").value, "");
    assert.equal(el("class-status-filter").disabled, true, "Removed kits cannot leave a hidden status filter active");
    assert.equal(el("class-chocolate-filter").value, "");
    assert.equal(el("class-chocolate-filter").disabled, true, "Removed kits clear the Chocolate filter");
    kits.push({ id: "kit-search", title: "Search Kit" });
    select("class-kit-filter", "kit-login");
    select("class-status-filter", "completed");
    select("class-chocolate-filter", "no");
    assert.match(el("class-progress-status").textContent, /No students match/);
    focus(true);
    select("class-kit-filter", "");
    assert.equal(el("class-kit-focus").checked, false, "All kits clears focused view");
    assert.equal(el("class-kit-focus").disabled, true);
    assert.equal(el("class-status-filter").value, "", "All kits clears the kit-specific status");
    assert.equal(el("class-status-filter").disabled, true);
    assert.equal(el("class-chocolate-filter").value, "", "All kits clears the kit-specific Chocolate filter");
    assert.equal(el("class-chocolate-filter").disabled, true);
    assert.equal(JSON.stringify(students), beforeFiltering, "Filtering never changes saved progress");
    assert.equal(savedRequests.length, 4, "Only explicit checkbox changes save Chocolate, not filtering or refresh");
    select("class-whanau-filter", "");
    select("class-course-filter", "");
    el("class-student-filter").value = "";
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
    select("class-course-filter", "");
    select("class-kit-filter", "kit-login");
    select("class-status-filter", "completed");
    select("class-chocolate-filter", "no");
    assert.deepEqual(names(), ["Ana"]);
    focus(true);
    const reward = chocolateCheckbox();
    reward.checked = true;
    await reward.events.change();
    assert.match(el("class-progress-status").textContent, /No students match/,
        "A confirmed Chocolate save removes the student from the No list");
    select("class-chocolate-filter", "yes");
    assert.deepEqual(names(), ["Ana"]);
    failSave = true;
    const undo = chocolateCheckbox();
    undo.checked = false;
    await undo.events.change();
    assert.deepEqual(names(), ["Ana"], "Failed saves keep the confirmed student in the Yes list");
    assert.equal(chocolateCheckbox().checked, true);
    assert.deepEqual(headers(), ["Student", "Login Kit", "Chocolate"], "Reward saves preserve focused view");
    focus(false);
    assert.equal(rows()[0].children.length, 8);
    assert.equal(chocolateCheckbox().checked, true, "Full table retains rewards saved in focused view");
});

test("submissions list follows the class filters, links drawings and saves teacher Completed ticks", async () => {
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
        { name: "Ana", email: "ana@school.nz", timetableClass: "JPI", course: "JuniorDTECH", kitProgress: {} },
        { name: "Ben", email: "ben@school.nz", timetableClass: "JVE", course: "JuniorDTECH", kitProgress: {} }
    ];
    const kits = [{ id: "kit-login", title: "Login Kit" }, { id: "kit-google-drawings", title: "Google Drawings Kit" }];
    const drawing = "https://docs.google.com/drawings/d/ana-ship/edit";
    const submissions = { kits: [{ id: "kit-google-drawings", activities: [{ index: 0, title: "Ship" }, { index: 1, title: "TV" }],
        students: { "ana@school.nz": { 0: { url: drawing, documentKey: "google-file:ana-ship", submittedAt: "2026-05-01T00:00:00Z", completed: false, filed: false },
            1: { url: "", documentKey: "", submittedAt: null, completed: false } } } }] };
    const puts = [];
    const auths = [];
    const authEvents = {};
    const context = vm.createContext({
        document: { getElementById: el, querySelector: el, createElement: element },
        window: { addEventListener(name, listener) { authEvents[name] = listener; },
            location: { search: "?kit=kit-google-drawings&student=ana%40school.nz" } },
        URLSearchParams,
        localStorage: { getItem: () => JSON.stringify({ profile: { email: "admin@school.nz" }, idToken: null,
            accessToken: "oauth-teacher", expiresAt: Date.now() + 60000 }) },
        getActiveHubEmail: () => "admin@school.nz",
        requestHubDriveAccessToken: async (options) => {
            assert.equal(options.forceRefresh, true);
            authEvents["hub-auth-state-changed"]({ detail: { signedIn: true } });
            return { access_token: "renewed-teacher" };
        },
        Option: function (text, value) { return { textContent: text, value }; },
        fetch: async (url, options) => {
            if (options?.method === "PUT") {
                puts.push({ url, body: JSON.parse(options.body) });
                auths.push(options.headers.Authorization);
                if (puts.length === 2) return { ok: false, status: 401, json: async () => ({ error: "Verify sign-in" }) };
                const body = JSON.parse(options.body);
                return { ok: true, json: async () => Object.hasOwn(body, "comment") ? { teacherComment: body.comment }
                    : { verification: { passed: body.approved }, completedActivities: {} } };
            }
            return { ok: true, json: async () => url.includes("kit-submissions") ? submissions
                : url.includes("preview-users") ? { users: [] } : { students, kits } };
        }
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "practical-skills", "teacher-results.js"), "utf8"), context);
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(el("results-kit").value, "kit-google-drawings", "Emailed link presets Student Review");
    assert.equal(el("results-emails").value, "ana@school.nz");
    assert.equal(el("class-kit-filter").value, "kit-google-drawings", "Emailed link presets the kit filter");
    assert.equal(el("class-kit-focus").checked, true, "Emailed link defaults to focused view");
    assert.equal(el("class-student-filter").value, "ana@school.nz");
    const host = el("class-submissions-host");
    assert.match(host.children[0].textContent, /Google Drawings Kit - Submissions/);
    const table = host.children[1].children[0];
    assert.deepEqual(table.children[0].children[0].children.map((cell) => cell.textContent),
        ["Student", "Homeroom", "Ship", "Completed", "TV", "Completed"]);
    const rows = () => host.children[1].children[0].children[1].children;
    assert.deepEqual(rows().map((row) => row.children[0].textContent), ["Ana"], "Uses the same filtered students as the class table");
    const shipCell = rows()[0].children[2];
    assert.equal(shipCell.children[0].href, drawing);
    assert.equal(shipCell.children[0].target, "_blank");
    assert.match(shipCell.children[1].textContent, /^Saved - sync needed /);
    assert.equal(rows()[0].children[4].children[0].textContent, "No link");
    assert.equal(rows()[0].children[5].children[0].children[0].disabled, true, "Nothing to tick without a link");
    const tick = rows()[0].children[3].children[0].children[0];
    assert.equal(tick.checked, false);
    tick.checked = true;
    await tick.events.change();
    assert.deepEqual(puts, [{ url: "/api/admin/kit-document-review/kit-google-drawings/0",
        body: { email: "ana@school.nz", documentKey: "google-file:ana-ship", approved: true } }]);
    assert.deepEqual(auths, ["Bearer oauth-teacher"], "Popup (OAuth) sign-in can tick Completed");
    assert.equal(rows()[0].children[3].children[0].children[0].checked, true);
    assert.match(el("submission-status").textContent, /Ticked Completed for Ana - Ship/);
    const revoke = rows()[0].children[3].children[0].children[0];
    revoke.checked = false;
    await revoke.events.change();
    assert.equal(puts.length, 3, "Rejected write is retried once after token renewal");
    assert.equal(auths[2], "Bearer renewed-teacher");
    assert.equal(rows()[0].children[3].children[0].children[0].checked, false,
        "Same-account token refresh keeps the current list and applies the saved result");
    assert.match(el("submission-status").textContent, /Removed Completed for Ana - Ship/);
    const feedback = rows()[0].children[2].children[2].children[0];
    feedback.value = "Use filled shapes.";
    await rows()[0].children[2].children[3].events.click();
    assert.deepEqual(puts.at(-1).body, { email: "ana@school.nz", documentKey: "google-file:ana-ship", comment: "Use filled shapes." });
    assert.match(el("submission-status").textContent, /Feedback saved/);
    el("class-homeroom-filter").events.change();
    assert.equal(rows()[0].children[2].children[2].children[0].value, "Use filled shapes.");
    submissions.kits[0].students["ana@school.nz"][0].filed = true;
    el("class-homeroom-filter").events.change();
    assert.match(rows()[0].children[2].children[1].textContent, /^Submitted - synced /,
        "Teacher list distinguishes confirmed filing from a saved timestamp");
    el("class-kit-filter").value = "kit-login";
    el("class-kit-filter").events.change();
    assert.equal(host.children.length, 0, "Submissions follow the kit filter");
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
    const context = vm.createContext({ hubTeacherReviewLink: {}, hubLicenceSetupLink: {}, worksheetLicenceSetupLink: {}, canAdmin: false, inTeacherMode: true });
    const gate = source.slice(start, end);
    vm.runInContext(gate, context);
    assert.equal(context.hubTeacherReviewLink.hidden, true);
    assert.equal(context.hubLicenceSetupLink.hidden, true);
    assert.equal(context.worksheetLicenceSetupLink.hidden, true);
    context.canAdmin = true;
    vm.runInContext(gate, context);
    assert.equal(context.hubTeacherReviewLink.hidden, false);
    assert.equal(context.hubLicenceSetupLink.hidden, false);
    assert.equal(context.worksheetLicenceSetupLink.hidden, false);
    context.inTeacherMode = false;
    vm.runInContext(gate, context);
    assert.equal(context.hubTeacherReviewLink.hidden, true, "Teacher Review is hidden in Student View");
    assert.equal(context.hubLicenceSetupLink.hidden, true, "Setup links are hidden in Student View");
    assert.equal(context.worksheetLicenceSetupLink.hidden, true);
    const teacherView = fs.readFileSync(path.join(root, "teacher-view.html"), "utf8");
    assert.match(teacherView, /script\.js\?v=[\w-]+"/, "teacher-view.html cache-busts the shared navigation script");
});
