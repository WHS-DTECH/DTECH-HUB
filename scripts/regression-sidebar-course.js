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
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
assert.match(css, /#hub-global-sidebar-allocations\[hidden\],\s*\.hub-sidebar-summary-cards\[hidden\]\s*\{\s*display: none;/,
    "Hidden sidebar sections override grid display");

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
    const allocations = { hidden: false };
    const summaries = { hidden: false, dataset: { available: "true" } };
    const auth = { profile: { email: "staff@example.test" } };
    const panel = { dataset: {}, querySelector: (selector) => selector === "#hub-global-sidebar-allocations"
        ? allocations : selector === "#hub-sidebar-summary-cards" ? summaries : element };
    const loaderStart = client.indexOf("function updateSidebarCourseSections(");
    const loaderEnd = client.indexOf("\nasync function loadAndRenderSidebarAllocations(", loaderStart);
    const browser = vm.createContext({
        hubAuthState: auth,
        normalizeEmail: context.normalizeEmail,
        withHubAuthHeaders: (_headers, email) => ({ "x-user-email": email }),
        fetch: async () => ({ ok: true, json: async () => ({ course: "MiddleDTECH" }) }),
        console: { error() {} }
    });
    vm.runInContext(client.slice(loaderStart, loaderEnd), browser);
    for (const course of ["JuniorDTECH", "MiddleDTECH", "", "SeniorDTECH"]) {
        browser.updateSidebarCourseSections(panel, course);
        assert.equal(allocations.hidden, course !== "SeniorDTECH");
        assert.equal(summaries.hidden, course !== "SeniorDTECH");
    }
    summaries.dataset.available = "false";
    browser.updateSidebarCourseSections(panel, "SeniorDTECH");
    assert.equal(summaries.hidden, true, "Unpopulated summary stays hidden");
    summaries.dataset.available = "true";
    browser.updateSidebarCourseSections(panel);
    assert.equal(summaries.hidden, false, "Allocations finishing after course load can reveal senior summaries");
    await browser.loadAndRenderSidebarCourse(panel);
    assert.equal(element.textContent, "Course: MiddleDTECH");
    assert.equal(element.hidden, false);
    assert.equal(allocations.hidden, true);
    assert.equal(summaries.hidden, true);
    browser.fetch = async () => ({ ok: true, json: async () => ({ course: "SeniorDTECH" }) });
    await browser.loadAndRenderSidebarCourse(panel);
    assert.equal(allocations.hidden, false);
    assert.equal(summaries.hidden, false);
    browser.fetch = async () => ({ ok: true, json: async () => ({ course: "" }) });
    await browser.loadAndRenderSidebarCourse(panel);
    assert.equal(element.textContent, "Course: Not confirmed yet");
    browser.fetch = async () => { throw new Error("Network failure"); };
    await browser.loadAndRenderSidebarCourse(panel);
    assert.equal(element.textContent, "Course: Could not load");
    assert.equal(allocations.hidden, true, "Course failures do not show senior content");
    let release;
    browser.fetch = () => new Promise((resolve) => { release = resolve; });
    const pending = browser.loadAndRenderSidebarCourse(panel);
    auth.profile = { email: "another@example.test" };
    release({ ok: true, json: async () => ({ course: "SeniorDTECH" }) });
    await pending;
    assert.equal(element.textContent, "", "Responses from previous signed-in users are ignored");
    assert.equal(allocations.hidden, true);
    assert.doesNotMatch(client, /allocationsHost\.hidden = false/, "Allocation fetch cannot override course visibility");
    assert.match(client, /summaryCardsContainer\.dataset\.available = "true";\s*updateSidebarCourseSections\(panel\)/);
    console.log("Sidebar actual-course regressions passed.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
