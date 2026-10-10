"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { getHuntProfile } = require("../learning-sites-assessment");
const { getResearchReportProgrammeFolder } = require("../research-report");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "practical-skills", "admin.js"), "utf8");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const html = fs.readFileSync(path.join(root, "practical-skills", "admin.html"), "utf8");
assert.ok(html.indexOf("User and Course Preview") < html.indexOf("<h2>Card Editor</h2>"));
assert.match(html, /<h2>Current Cards<\/h2>/);
const start = source.indexOf("function matchesPreviewCourse(");
const end = source.indexOf("\nfunction normalizeEmail(", start);
assert.ok(start >= 0 && end > start);

class Element {
    constructor() { this.value = ""; this.textContent = ""; this.children = []; this.style = {}; }
    replaceChildren(...children) { this.children = children; }
    append(...children) { this.children.push(...children); }
    appendChild(child) { this.children.push(child); }
    add(child) { this.children.push(child); }
    addEventListener(name, handler) { this[name] = handler; }
}
const controls = Object.fromEntries(["previewType", "previewSearch", "previewUser", "previewCourse",
    "previewStatus", "previewDetails", "previewCards", "previewRetry", "previewKitSearch"].map((key) => [key, new Element()]));
controls.previewType.value = "Student";
controls.previewCourse.value = "All";
const users = [
    { id: "s1", name: "Example Student", type: "Student", yearLevel: "7", course: "JuniorDTECH", email: "student@example.test", homeroom: "7A" },
    { id: "s2", name: "Senior Student", type: "Student", yearLevel: "12", course: "SeniorDTECH", email: "senior@example.test" },
    { id: "t1", name: "Example Teacher", type: "Staff", course: "", email: "teacher@example.test" }
];
const cards = [
    { id: "practical-skills-checklist", title: "Checklist", yearLevel: "All Years" },
    { id: "all", title: "Login", yearLevel: "All Years" },
    { id: "junior", title: "Junior", yearLevel: "Junior DTECH" },
    { id: "y8", title: "Year 8", yearLevel: "Year 8 DTECH" },
    { id: "middle", title: "Middle", yearLevel: "MiddleDTECH" },
    { id: "y10", title: "Year 10", yearLevel: "Year 10" },
    { id: "senior", title: "Senior", yearLevel: "Senior DTECH" },
    { id: "y13", title: "Year 13", yearLevel: "Year 13 DTECH" },
    { id: "staff", title: "Staff", yearLevel: "Staff" }
];
const state = { cards, previewUsers: users };
const original = JSON.stringify(state);
let fetchCalls = [];
const context = vm.createContext({
    ...controls, state,
    document: { createElement: () => new Element() },
    Option: function (text, value) { this.textContent = text; this.value = value; },
    withAdminAuthHeaders: () => ({ "x-user-email": "admin@example.test" }),
    fetch: async (url, options) => {
        fetchCalls.push({ url, options });
        return { ok: true, json: async () => ({ users }) };
    }
});
vm.runInContext(source.slice(start, end), context);
for (const [course, ids] of [
    ["JuniorDTECH", ["all", "junior", "y8"]],
    ["MiddleDTECH", ["all", "middle", "y10"]],
    ["SeniorDTECH", ["all", "senior", "y13"]]
]) {
    assert.deepEqual(cards.filter((card) => card.id !== "practical-skills-checklist"
        && context.matchesPreviewCourse(card, users[0], course)).map((card) => card.id), ids);
}
assert.equal(context.matchesPreviewCourse(cards.at(-1), users[2], "SeniorDTECH"), true);
assert.equal(context.matchesPreviewCourse(cards.at(-1), users[0], "SeniorDTECH"), false);
assert.equal(context.matchesPreviewCourse({ yearLevel: "Other" }, users[0], "JuniorDTECH"), false);
controls.previewUser.value = "s1";
controls.previewUser.change();
assert.equal(controls.previewCourse.value, "JuniorDTECH");
assert.equal(controls.previewCards.children.length, 3);
assert.deepEqual(controls.previewCards.children.map((item) => item.textContent), ["Junior", "Login", "Year 8"]);
assert.ok(controls.previewCards.children.every((item) => item.children.length === 0), "Preview uses names only, not full cards");
controls.previewKitSearch.value = "LOGIN";
controls.previewKitSearch.input();
assert.deepEqual(controls.previewCards.children.map((item) => item.textContent), ["Login"]);
assert.match(controls.previewStatus.textContent, /1 of 3 kits/);
controls.previewKitSearch.value = "nonexistent";
controls.previewKitSearch.input();
assert.equal(controls.previewCards.children[0].textContent, "No kit names match your search.");
controls.previewKitSearch.value = "";
controls.previewKitSearch.input();
controls.previewCourse.value = "SeniorDTECH";
controls.previewCourse.change();
assert.equal(controls.previewCards.children.length, 3);
assert.match(controls.previewDetails.textContent, /7A/);
assert.equal(JSON.stringify(state), original, "Preview never modifies cards or users");
controls.previewSearch.value = "senior@";
context.populatePreviewUsers();
assert.equal(controls.previewUser.children.length, 2);
assert.equal(controls.previewUser.value, "");
assert.equal(controls.previewCourse.disabled, true);
assert.equal(controls.previewKitSearch.disabled, true);
controls.previewType.value = "Staff";
controls.previewSearch.value = "";
context.populatePreviewUsers();
assert.equal(controls.previewUser.children.length, 2);
controls.previewUser.value = "t1";
controls.previewUser.change();
assert.equal(controls.previewCourse.value, "All");
assert.equal(controls.previewCards.children.length, cards.length - 1);
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
assert.match(html, /class="admin-panel practical-user-preview"/);
assert.match(css, /\.admin-panel\.practical-user-preview\s*\{[^}]*background:\s*#e5f4f1;[^}]*border-left:\s*5px solid #24685e;/);
assert.match(css, /\.practical-preview-kit-list\s*\{[^}]*max-height:\s*240px;[^}]*overflow-y:\s*auto;/);
assert.match(html, /aria-label="Matching kit names" tabindex="0"/);

async function main() {
    await context.loadPreviewUsers();
    assert.equal(fetchCalls.length, 1);
    assert.equal(fetchCalls[0].options.method, undefined, "Preview uses GET only");
    assert.equal(fetchCalls[0].options.cache, "no-store");
    context.fetch = async () => ({ ok: false, status: 500, json: async () => ({ error: "Directory unavailable" }) });
    await context.loadPreviewUsers();
    assert.match(controls.previewStatus.textContent, /Directory unavailable/);
    assert.equal(controls.previewRetry.hidden, false, "Directory failures are visible and retryable");

    const routeStart = server.indexOf('app.get("/api/admin/practical-skills/preview-users"');
    const routeEnd = server.indexOf('\napp.get("/api/admin/practical-skills/library"', routeStart);
    assert.ok(routeStart >= 0 && routeEnd > routeStart);
    let handler;
    const auth = () => {};
    const routeContext = vm.createContext({
        app: { get: (url, middleware, fn) => { assert.equal(middleware, auth); handler = fn; } },
        requireAdminAccess: auth, getHuntProfile, getResearchReportProgrammeFolder,
        getStudentDirectoryRows: async () => [
            { student_name: "Junior", year_level: "Year 8", linked_emails: ["junior@example.test"], form_class: "8A", status: "Current" },
            { student_name: "Middle", year_level: "10", linked_emails: [], status: "Current" },
            { student_name: "Senior", year_level: "13", linked_emails: [], status: "Current" },
            { student_name: "Former", year_level: "13", linked_emails: [], status: "Not Current" }
        ],
        getStaffDirectoryRows: async () => [
            { first_name: "Test", last_name: "Teacher", email_school: "teacher@example.test" },
            { first_name: "Test", last_name: "Teacher", email_school: "teacher@example.test" }
        ],
        dedupeToLatestStudentRows: (rows) => rows,
        buildStudentClassManagementRow: (row) => row,
        buildLowerKeyMap: (row) => new Map(Object.entries(row)),
        pickRowValue: (map, keys) => keys.map((key) => map.get(key)).find(Boolean) || "",
        collectDirectoryEmails: (row, keys) => keys.map((key) => row[key]).filter(Boolean),
        console: { error() {} }
    });
    vm.runInContext(server.slice(routeStart, routeEnd), routeContext);
    const response = {
        set() { return this; }, status(code) { this.code = code; return this; },
        json(payload) { this.body = payload; return this; }
    };
    await handler({}, response);
    assert.equal(response.body.users.length, 4, "Current students plus deduplicated staff");
    assert.equal(response.body.users.find((user) => user.name === "Junior").course, "JuniorDTECH");
    assert.equal(response.body.users.find((user) => user.name === "Middle").course, "MiddleDTECH");
    assert.equal(response.body.users.find((user) => user.name === "Senior").course, "SeniorDTECH");
    assert.equal(response.body.users.find((user) => user.type === "Staff").course, "");
    assert.ok(response.body.users.every((user) => !Object.hasOwn(user, "timetable")), "Only minimal profile fields returned");
    routeContext.getStaffDirectoryRows = async () => { throw new Error("Directory failure"); };
    await handler({}, response);
    assert.equal(response.code, 500);
    assert.match(response.body.error, /Could not load/);
    console.log("Licence Library named-user course preview regressions passed.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
