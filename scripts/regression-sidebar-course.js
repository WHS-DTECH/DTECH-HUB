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
    getStaffCoursePreference: async () => "",
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
    let saveHandler;
    let databaseCourse = "";
    const storeStart = server.indexOf("const memoryStaffCoursePreferences = new Map();");
    const storeEnd = server.indexOf("function resolveSidebarCourse(", storeStart);
    const saveContext = vm.createContext({
        hasDatabase: true,
        requireAdminAccess() {},
        app: { put: (url, auth, fn) => {
            assert.equal(url, "/api/admin/practical-skills/my-course");
            assert.equal(auth, saveContext.requireAdminAccess, "Save route requires admin access");
            saveHandler = fn;
        } },
        normalizeEmail: context.normalizeEmail,
        getRequestUserEmail: (req) => req.email,
        getLearningSitesStudentProfile: async () => ({ available: true, courseIds: ["STAFF"] }),
        pool: { query: async (sql, params) => {
            if (sql.includes("INSERT INTO")) {
                assert.equal(params[0], "staff@example.test", "Save targets authenticated account, not submitted user");
                databaseCourse = params[1];
            }
            return { rows: sql.includes("SELECT course") && databaseCourse ? [{ course: databaseCourse }] : [] };
        } },
        console: { error() {} }
    });
    vm.runInContext(server.slice(storeStart, storeEnd), saveContext);
    const savedRes = { status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
    await saveHandler({ email: "staff@example.test", body: { course: "All" } }, savedRes);
    assert.equal(savedRes.code, 400);
    await saveHandler({ email: "staff@example.test", body: { course: "SeniorDTECH", email: "other@example.test" } }, savedRes);
    assert.equal(savedRes.body.course, "SeniorDTECH");
    assert.equal(await saveContext.getStaffCoursePreference("staff@example.test"), "SeniorDTECH");
    const folderStart = server.indexOf("async function getStudentProgrammeFolder(");
    const folderEnd = server.indexOf("\nconst MINECRAFT_EXPORTS_FOLDER_NAME", folderStart);
    saveContext.getResearchReportProgrammeFolder = getResearchReportProgrammeFolder;
    saveContext.getCourseProgrammeFolder = getCourseProgrammeFolder;
    saveContext.getSavedLearningSitesCheckIn = async () => { throw new Error("Saved choice must not depend on assessment answers"); };
    vm.runInContext(server.slice(folderStart, folderEnd), saveContext);
    assert.equal(await saveContext.getStudentProgrammeFolder("staff@example.test"), "SeniorDTECH",
        "Future staff folder requests use the actual saved course");
    saveContext.hasDatabase = false;
    await saveHandler({ email: "staff@example.test", body: { course: "MiddleDTECH" } }, savedRes);
    assert.equal(await saveContext.getStaffCoursePreference("staff@example.test"), "MiddleDTECH");
    saveContext.getLearningSitesStudentProfile = async () => ({ available: true, year: 8, courseIds: [] });
    await saveHandler({ email: "staff@example.test", body: { course: "MiddleDTECH" } }, savedRes);
    assert.equal(savedRes.code, 403);
    saveContext.getLearningSitesStudentProfile = async () => { throw new Error("Unavailable"); };
    await saveHandler({ email: "staff@example.test", body: { course: "MiddleDTECH" } }, savedRes);
    assert.equal(savedRes.code, 500);
    const res = { set() { return this; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
    await handler({ email: "" }, res);
    assert.equal(res.code, 401);
    await handler({ email: "student@example.test" }, res);
    assert.equal(res.body.course, "JuniorDTECH");
    profile = staff;
    checkIn = { completed: true, answers: { course: "STAFF" } };
    await handler({ email: "staff@example.test" }, res);
    assert.equal(res.body.course, "JuniorDTECH");
    context.getStaffCoursePreference = async () => "SeniorDTECH";
    await handler({ email: "staff@example.test" }, res);
    assert.equal(res.body.course, "SeniorDTECH", "Explicit staff course takes precedence over Login Kit");

    const element = { textContent: "", hidden: true, dataset: {} };
    const allocations = { hidden: false };
    const summaries = { hidden: false, dataset: { available: "true" } };
    const auth = { profile: { email: "staff@example.test" } };
    const panel = { dataset: {}, querySelector: (selector) => selector === "#hub-global-sidebar-allocations"
        ? allocations : selector === "#hub-sidebar-summary-cards" ? summaries : element };
    const loaderStart = client.indexOf("function updateSidebarCourseSections(");
    const loaderEnd = client.indexOf("\nasync function loadAndRenderSidebarAllocations(", loaderStart);
    let refreshCourse;
    const pathwaysLink = { hidden: true };
    const browser = vm.createContext({
        routeHubCourseHomepage() {},
        window: { addEventListener(type, fn) { assert.equal(type, "hub-course-changed"); refreshCourse = fn; } },
        document: { querySelector: (selector) => selector === "#hub-pathways-link" ? pathwaysLink : panel },
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
        assert.equal(pathwaysLink.hidden, !["JuniorDTECH", "MiddleDTECH"].includes(course),
            "Pathways navbar button is only shown for Junior and Middle DTECH");
    }
    summaries.dataset.available = "false";
    browser.updateSidebarCourseSections(panel, "SeniorDTECH");
    assert.equal(summaries.hidden, true, "Unpopulated summary stays hidden");
    summaries.dataset.available = "true";
    browser.updateSidebarCourseSections(panel);
    assert.equal(summaries.hidden, false, "Allocations finishing after course load can reveal senior summaries");
    await browser.loadAndRenderSidebarCourse(panel);
    assert.equal(element.textContent, "Course: MiddleDTECH");
    assert.equal(pathwaysLink.hidden, false);
    assert.equal(element.hidden, false);
    assert.equal(allocations.hidden, true);
    assert.equal(summaries.hidden, true);
    browser.fetch = async () => ({ ok: true, json: async () => ({ course: "SeniorDTECH" }) });
    refreshCourse();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(element.textContent, "Course: SeniorDTECH", "Save event refreshes the actual sidebar");
    assert.equal(allocations.hidden, false);
    assert.equal(pathwaysLink.hidden, true, "Saving SeniorDTECH hides Pathways");
    assert.equal(summaries.hidden, false);
    browser.fetch = async () => ({ ok: true, json: async () => ({ course: "" }) });
    await browser.loadAndRenderSidebarCourse(panel);
    assert.equal(element.textContent, "Course: Not confirmed yet");
    browser.fetch = async () => { throw new Error("Network failure"); };
    await browser.loadAndRenderSidebarCourse(panel);
    assert.equal(element.textContent, "Course: Could not load");
    assert.equal(allocations.hidden, true, "Course failures do not show senior content");
    assert.equal(pathwaysLink.hidden, true, "Course failures do not show Pathways");
    auth.profile = null;
    browser.updateSidebarCourseSections(panel, "JuniorDTECH");
    assert.equal(pathwaysLink.hidden, true, "Signed-out users do not see Pathways");
    auth.profile = { email: "staff@example.test" };
    let release;
    browser.fetch = () => new Promise((resolve) => { release = resolve; });
    const pending = browser.loadAndRenderSidebarCourse(panel);
    auth.profile = { email: "another@example.test" };
    release({ ok: true, json: async () => ({ course: "SeniorDTECH" }) });
    await pending;
    assert.equal(element.textContent, "", "Responses from previous signed-in users are ignored");
    assert.equal(allocations.hidden, true);
    assert.equal(pathwaysLink.hidden, true, "Stale course responses cannot reveal Pathways");
    assert.match(client, /id="hub-pathways-link"[^>]+href="\/learning-pathways\/" hidden>Pathways<\/a>/);
    assert.match(css, /\.topbar-links a\.hub-pathways-link\[hidden\]\s*\{\s*display: none !important;/);
    assert.doesNotMatch(client, /allocationsHost\.hidden = false/, "Allocation fetch cannot override course visibility");
    assert.match(client, /summaryCardsContainer\.dataset\.available = "true";\s*updateSidebarCourseSections\(panel\)/);
    console.log("Sidebar actual-course regressions passed.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
