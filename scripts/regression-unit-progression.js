"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const express = require("express");
const { registerActivityProgress, encodingLetters, toBinary } = require("../learning-pathways/activity-progress-store");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const DOMAIN = "westlandhigh.school.nz";
const TEACHER = `teacher@${DOMAIN}`;
const students = [
    { email: `ana@${DOMAIN}`, name: "Ana Aroha", yearLevel: 7, homeroom: "JPI", formClass: "", timetableClass: "JPI" },
    { email: `ben@${DOMAIN}`, name: "Ben Brown", yearLevel: 7, homeroom: "JPI", formClass: "", timetableClass: "JPI" },
    { email: `cara@${DOMAIN}`, name: "Cara Chen", yearLevel: 8, homeroom: "JVE", formClass: "", timetableClass: "JVE" },
    { email: "", name: "Dan No-Email", yearLevel: 7, homeroom: "JPI", formClass: "", timetableClass: "JPI" }
];
const correctLetters = () => Object.fromEntries(encodingLetters.map(({ index, value }) => [index, toBinary(value)]));

async function testEndpoint() {
    const app = express();
    app.use(express.json());
    registerActivityProgress(app, {
        hasDatabase: false,
        getRequestUserEmail: (req) => req.headers["x-user-email"] || "",
        normalizeEmail: (value) => String(value || "").trim().toLowerCase(),
        schoolDomain: DOMAIN,
        requireTeacherAccess: (req, res, next) => (req.headers["x-user-email"] === TEACHER ? next() : res.status(403).json({ error: "Teacher access required." })),
        getStudents: async () => students,
        getStaff: async () => [{ email: TEACHER.toUpperCase(), name: "Pringle, Vanessa" }, { email: students[0].email, name: "Duplicate" }]
    });
    const server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const call = (url, email, body) => fetch(`${base}${url}`, { method: body ? "PUT" : "GET",
        headers: { "Content-Type": "application/json", "x-user-email": email }, body: body && JSON.stringify(body) });
    try {
        const activity = "/api/learning-pathways/activity-progress/activity-encoding-binary";
        await call(activity, students[0].email, { responses: { letters: correctLetters(), challenge: { word: "HI", bits: ["01000", "01001"] } } });
        await call(activity, students[1].email, { responses: { letters: { 1: "00101" } } });
        await call(activity, `stranger@${DOMAIN}`, { responses: { letters: correctLetters() } });
        await call(activity, TEACHER, { responses: { letters: correctLetters() } });

        assert.equal((await call("/api/teacher/unit-progression", students[0].email)).status, 403, "Students cannot see class progress");
        const response = await call("/api/teacher/unit-progression?unit=binary-and-data", TEACHER);
        assert.equal(response.status, 200);
        const data = await response.json();
        assert.equal(data.unit.title, "Binary & Data");
        assert.equal(data.unit.strandTitle, "Digital Systems");
        assert.deepEqual(data.activities.map((item) => [item.id, item.shortTitle]), [["activity-encoding-binary", "Encoding"]]);
        assert.equal(data.students.length, 5, "Staff are added once; students listed as staff are not duplicated");
        assert.deepEqual([data.students[4].email, data.students[4].name, data.students[4].isStaff], [TEACHER, "Pringle, Vanessa", true]);
        assert.equal(data.progress[TEACHER]["activity-encoding-binary"].status, "completed", "Staff records are visible");
        assert.equal(data.progress[students[0].email]["activity-encoding-binary"].status, "completed");
        assert.ok(data.progress[students[0].email]["activity-encoding-binary"].completedAt);
        assert.deepEqual(data.progress[students[0].email]["activity-encoding-binary"].summary,
            ["Part D letters correct: 9 of 9", "Optional word: HI (encoded correctly)"]);
        assert.equal(data.progress[students[1].email]["activity-encoding-binary"].status, "in-progress");
        assert.match(data.progress[students[1].email]["activity-encoding-binary"].summary[1], /^Still to finish: C = 3/);
        assert.equal(data.progress[students[2].email], undefined, "Not started students have no progress");
        assert.equal(data.progress[`stranger@${DOMAIN}`], undefined, "Only directory students are reported");
        assert.equal((await (await call("/api/teacher/unit-progression?unit=nope", TEACHER)).json()).unit.id, "binary-and-data", "Unknown units fall back to the first unit");
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
}

function node(tag = "div") {
    return {
        tagName: tag, hidden: false, disabled: false, textContent: "", value: "", children: [], attributes: {}, listeners: {}, open: false,
        classList: { values: new Set(), toggle(name, on) { on ? this.values.add(name) : this.values.delete(name); } },
        setAttribute(name, value) { this.attributes[name] = String(value); },
        append(...items) { this.children.push(...items); },
        replaceChildren(...items) { this.children = [...items]; },
        addEventListener(type, handler) { this.listeners[type] = handler; },
        showModal() { this.open = true; }, close() { this.open = false; }
    };
}

async function testPage() {
    const html = read("learning-pathways/unit-progression.html");
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length, "Page IDs are unique");
    for (const label of ["Homeroom", "Year", "Name", "Unit"]) assert.match(html, new RegExp(`<label>${label}<`), `${label} filter is present`);
    assert.match(html, /Teacher view/);
    assert.match(html, /Completed<\/li>[\s\S]*In progress<\/li>[\s\S]*Not started<\/li>/, "Legend explains the icons");
    assert.match(read("script.js"), /href="\/learning-pathways\/progression-pathway\.html">Progression Pathway<\/a>\s*<a role="menuitem" href="\/learning-pathways\/unit-progression\.html">Unit Progression<\/a>/,
        "Student Work menu links to Unit Progression");

    const source = read("learning-pathways/unit-progression.js");
    assert.doesNotMatch(source, /innerHTML/, "Renders text safely");
    const elements = {};
    for (const id of ids.filter((id) => id.startsWith("unit-progress-"))) elements[id] = node(id.endsWith("dialog") ? "dialog" : "div");
    const events = {};
    const access = { resolved: true, canTeacherView: true, canAdmin: false };
    let signedIn = true;
    const payload = {
        units: [{ id: "binary-and-data", title: "Binary & Data" }],
        unit: { id: "binary-and-data", title: "Binary & Data", strandTitle: "Digital Systems" },
        activities: [{ id: "activity-encoding-binary", title: "Encoding Binary", shortTitle: "Encoding", lessonLabel: "Lesson 2", href: "/learning-pathways/activity-encoding-binary.html" }],
        students: [...students, { email: TEACHER, name: "Pringle, Vanessa", yearLevel: "", homeroom: "", formClass: "", timetableClass: "", isStaff: true }].reverse(),
        progress: {
            [students[0].email]: { "activity-encoding-binary": { status: "completed", completedAt: "2026-10-10T01:00:00.000Z", summary: ["Part D letters correct: 9 of 9"] } },
            [TEACHER]: { "activity-encoding-binary": { status: "completed", completedAt: "2026-10-11T01:00:00.000Z", summary: [] } },
            [students[1].email]: { "activity-encoding-binary": { status: "in-progress", completedAt: null, summary: ["Part D letters correct: 1 of 9"] } }
        }
    };
    let fetched = [];
    const context = vm.createContext({
        document: { querySelector: (selector) => elements[selector.slice(1)], createElement: node,
            addEventListener(type, handler) { events[type] = handler; } },
        window: { addEventListener(type, handler) { events[type] = handler; } },
        Option: function Option(text, value) { return { text, value }; },
        hubAuthState: { profile: { email: TEACHER } },
        hubAccessState: access,
        hasAllowedSignedInHubAccount: () => signedIn,
        withHubAuthHeaders: () => ({ "x-user-email": TEACHER }),
        fetch: async (url, options) => { fetched.push(url); assert.equal(options.cache, "no-store"); return { ok: true, json: async () => payload }; },
        console: { error() {} }, Date, Number, String, Set, Array, encodeURIComponent
    });
    vm.runInContext(source, context);
    const el = (name) => elements[`unit-progress-${name}`];
    const settle = () => new Promise((resolve) => setTimeout(resolve, 10));
    events.DOMContentLoaded();
    await settle();
    assert.equal(fetched[0], "/api/teacher/unit-progression");
    assert.equal(el("card").hidden, false);
    assert.equal(el("controls").disabled, false);
    assert.equal(el("title").textContent, "Binary & Data");
    assert.equal(el("kicker").textContent, "Digital Systems / Unit summary");
    assert.deepEqual(el("head-row").children.map((cell) => cell.textContent), ["Student", "Encoding", "Unit evidence"]);
    const rowNames = () => el("rows").children.map((row) => row.children[0].textContent);
    assert.deepEqual(rowNames(), ["Ana Aroha", "Ben Brown", "Cara Chen", "Dan No-Email"], "Students are sorted by name");
    const stateOf = (index) => el("rows").children[index].children[1].children[0].className;
    assert.deepEqual([0, 1, 2].map(stateOf), ["unit-status is-completed", "unit-status is-in-progress", "unit-status is-not-started"]);
    assert.equal(el("shown").textContent, "4 students shown");
    assert.equal(el("done").textContent, "1 completed activity");
    assert.ok(el("homeroom").children.some((option) => option.value === "JPI"));

    el("homeroom").value = "JPI";
    el("homeroom").listeners.change();
    el("year").value = "7";
    el("year").listeners.change();
    assert.deepEqual(rowNames(), ["Ana Aroha", "Ben Brown", "Dan No-Email"], "Homeroom and year filters show the class");
    assert.match(el("meta").textContent, /Term \d \u00b7 Year 7 \u00b7 JPI$/);
    assert.equal(el("rows").children[2].children[2].children[0].textContent, "No school email linked");
    el("search").value = "ben";
    el("search").listeners.input();
    assert.deepEqual(rowNames(), ["Ben Brown"], "Name filter shows one student");
    assert.equal(el("shown").textContent, "1 student shown");
    el("search").value = "zzz";
    el("search").listeners.input();
    assert.equal(el("empty").hidden, false, "Empty state when nothing matches");
    el("search").value = "";
    el("search").listeners.input();
    el("year").value = "staff";
    el("year").listeners.change();
    assert.deepEqual(rowNames(), ["Pringle, Vanessa"], "Staff filter shows staff even with a homeroom selected");
    assert.equal(stateOf(0), "unit-status is-completed");
    assert.equal(el("shown").textContent, "1 staff member shown");
    assert.match(el("meta").textContent, /Term \d \u00b7 Staff$/);
    el("year").value = "";
    el("year").listeners.change();
    el("homeroom").value = "";
    el("homeroom").listeners.change();
    assert.ok(!rowNames().includes("Pringle, Vanessa"), "Staff are not mixed into student views");
    assert.equal(el("rows").children.length, 4);

    el("rows").children[0].children[2].children[0].listeners.click();
    assert.equal(el("dialog").open, true, "Unit evidence opens the student's work");
    assert.equal(el("dialog-title").textContent, "Ana Aroha");
    const evidence = el("dialog-list").children[0];
    assert.match(evidence.className, /is-completed/);
    assert.ok(evidence.children[1].children.some((line) => line.textContent === "Part D letters correct: 9 of 9"));
    assert.equal(evidence.children[2].href, "/learning-pathways/activity-encoding-binary.html");

    access.canTeacherView = false;
    events["hub-auth-state-changed"]();
    await settle();
    assert.equal(el("card").hidden, true, "Student View cannot see class progress");
    assert.equal(el("dialog").open, false);
    assert.match(el("status").textContent, /Teacher\/Admin access is required/);
    signedIn = false;
    events["hub-auth-state-changed"]();
    await settle();
    assert.match(el("status").textContent, /Sign in/);
}

(async () => {
    await testEndpoint();
    await testPage();
    console.log("Unit Progression endpoint, filters, evidence and access regressions passed.");
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
