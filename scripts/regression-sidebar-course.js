"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { getCourseProgrammeFolder } = require("../learning-sites-assessment");
const { getResearchReportProgrammeFolder } = require("../research-report");
const root = path.join(__dirname, "..");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const client = fs.readFileSync(path.join(root, "script.js"), "utf8");
const start = server.indexOf("function resolveSidebarCourse(");
const end = server.indexOf('app.get("/api/practical-skills/learning-sites/profile"', start);
let handler;
let profile = { available: true, year: 8, courseIds: [] };
let checkIn = null;
const context = vm.createContext({
    getCourseProgrammeFolder, getResearchReportProgrammeFolder,
    app: { get: (_url, fn) => { handler = fn; } },
    normalizeEmail: (value) => String(value || "").trim().toLowerCase(),
    getRequestUserEmail: (req) => req.email,
    SCHOOL_EMAIL_DOMAIN: "example.test",
    getLearningSitesStudentProfile: async () => profile,
    getSavedLearningSitesCheckIn: async () => checkIn,
    console: { error() {} }
});
vm.runInContext(server.slice(start, end), context);
for (const [year, course] of [[7, "JuniorDTECH"], [8, "JuniorDTECH"], [9, "MiddleDTECH"], [10, "MiddleDTECH"], [11, "SeniorDTECH"], [13, "SeniorDTECH"]]) {
    assert.equal(context.resolveSidebarCourse({ available: true, year }, { answers: { course: "STAFF" } }), course);
}
const staff = { available: true, courseIds: ["STAFF"] };
assert.equal(context.resolveSidebarCourse(staff, null), "");
assert.equal(context.resolveSidebarCourse(staff, { completed: false, answers: { course: "STAFF" } }), "");
assert.equal(context.resolveSidebarCourse(staff, { completed: true, answers: { course: "STAFF" } }), "JuniorDTECH");
assert.equal(context.resolveSidebarCourse(staff, { completed: true, answers: { course: "invalid" } }), "");
assert.equal(context.resolveSidebarCourse({ available: false, year: 8 }), "");
assert.match(client, /void loadAndRenderSidebarCourse\(panel\)/);
assert.match(client, /id="hub-sidebar-profile-course"/);

async function main() {
    const res = { set() { return this; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
    await handler({ email: "" }, res);
    assert.equal(res.code, 401);
    await handler({ email: "student@example.test" }, res);
    assert.equal(res.body.course, "JuniorDTECH");
    profile = staff;
    checkIn = { completed: true, answers: { course: "STAFF" } };
    await handler({ email: "staff@example.test" }, res);
    assert.equal(res.body.course, "JuniorDTECH");

    const element = { textContent: "", hidden: true, dataset: {} };
    const auth = { profile: { email: "staff@example.test" } };
    const panel = { querySelector: () => element };
    const loaderStart = client.indexOf("async function loadAndRenderSidebarCourse(");
    const loaderEnd = client.indexOf("\nasync function loadAndRenderSidebarAllocations(", loaderStart);
    const browser = vm.createContext({
        hubAuthState: auth,
        normalizeEmail: context.normalizeEmail,
        withHubAuthHeaders: (_headers, email) => ({ "x-user-email": email }),
        fetch: async () => ({ ok: true, json: async () => ({ course: "MiddleDTECH" }) }),
        console: { error() {} }
    });
    vm.runInContext(client.slice(loaderStart, loaderEnd), browser);
    await browser.loadAndRenderSidebarCourse(panel);
    assert.equal(element.textContent, "Course: MiddleDTECH");
    assert.equal(element.hidden, false);
    browser.fetch = async () => ({ ok: true, json: async () => ({ course: "" }) });
    await browser.loadAndRenderSidebarCourse(panel);
    assert.equal(element.textContent, "Course: Not confirmed yet");
    browser.fetch = async () => { throw new Error("Network failure"); };
    await browser.loadAndRenderSidebarCourse(panel);
    assert.equal(element.textContent, "Course: Could not load");
    let release;
    browser.fetch = () => new Promise((resolve) => { release = resolve; });
    const pending = browser.loadAndRenderSidebarCourse(panel);
    auth.profile = { email: "another@example.test" };
    release({ ok: true, json: async () => ({ course: "SeniorDTECH" }) });
    await pending;
    assert.equal(element.textContent, "", "Responses from previous signed-in users are ignored");
    console.log("Sidebar actual-course regressions passed.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
