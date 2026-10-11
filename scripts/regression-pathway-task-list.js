"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname, "..");
const cards = JSON.parse(fs.readFileSync(path.join(root, "learning-pathways", "library.json"), "utf8"));
const source = fs.readFileSync(path.join(root, "learning-pathways", "task-list.js"), "utf8");
const tick = () => new Promise((resolve) => setImmediate(resolve));

function node() {
    return {
        hidden: false, textContent: "", children: [], dataset: {},
        replaceChildren() { this.children = []; },
        append(...items) { this.children.push(...items); },
        addEventListener(type, handler) { this[type] = handler; }
    };
}

async function main() {
    const list = node();
    const status = node();
    const retry = node();
    const panel = node();
    panel.dataset = { course: "JuniorDTECH", courseStatus: "ready" };
    const events = {};
    let signedIn = true;
    let calls = 0;
    let courseRetries = 0;
    let response = { ok: true, json: async () => cards };
    const tracked = [{ id: "activity-encoding-binary", title: "Encoding Binary", strand: "digital-systems",
        context: "Binary & Data \u2022 Lesson 2", href: "/learning-pathways/activity-encoding-binary.html" }];
    let progressResponse = { ok: true, json: async () => ({ tracked, progress: {} }) };
    const progressUrl = "/api/learning-pathways/activity-progress";
    const respond = (url) => (url === progressUrl ? progressResponse : response);
    const context = vm.createContext({
        document: {
            querySelector: (selector) => ({
                "#pathway-task-list": list, "#pathway-task-status": status,
                "#pathway-task-retry": retry, "#hub-global-sidebar": panel
            })[selector],
            createElement: node,
            addEventListener(type, fn) { events[type] = fn; }
        },
        window: { addEventListener(type, fn) { events[type] = fn; } },
        hasAllowedSignedInHubAccount: () => signedIn,
        withHubAuthHeaders: () => ({ "x-user-email": "student@westlandhigh.school.nz" }),
        loadAndRenderSidebarCourse: async () => { courseRetries++; },
        fetch: async (url, options) => {
            calls++;
            assert.ok([progressUrl, "/learning-pathways/library.json"].includes(url));
            assert.equal(options.cache, "no-store");
            if (url === progressUrl) assert.equal(options.headers["x-user-email"], "student@westlandhigh.school.nz", "Progress uses school sign-in headers");
            return respond(url);
        },
        console: { error() {} }
    });
    vm.runInContext(source, context);
    events.DOMContentLoaded();
    await tick();
    const titles = () => list.children.map((item) => item.children[0].textContent);
    assert.deepEqual(titles(), cards.filter((card) => !["unit", "lesson", "activity"].includes(card.cardType)).map((card) => card.title).sort((a, b) => a.localeCompare(b)));
    assert.equal(list.children.length, 5, "Task List shows the five strands, not Unit or Lesson cards");
    assert.equal(list.hidden, false);
    assert.equal(retry.hidden, true);
    const systems = list.children.find((item) => item.children[0].textContent === "Digital systems");
    assert.ok(list.children.filter((item) => item !== systems).every((item) => item.children.length === 1),
        "Strands without tracked activities show only their names");
    assert.equal(systems.children.length, 2, "Digital systems lists its tracked activities");
    const activityRow = () => systems.children[1].children[0];
    assert.equal(systems.children[1].children.length, 1, "Encoding Binary appears once");
    assert.equal(activityRow().children[0].textContent, "Encoding Binary");
    assert.equal(activityRow().children[0].href, "/learning-pathways/activity-encoding-binary.html");
    assert.equal(activityRow().children[2].textContent, "To do");
    assert.equal(activityRow().className, "pathway-task-activity");
    assert.match(status.textContent, /Complete the activities/);
    progressResponse = { ok: true, json: async () => ({ tracked, progress: { "activity-encoding-binary": { completed: true } } }) };
    await context.renderPathwayTaskList();
    const completedSystems = list.children.find((item) => item.children[0].textContent === "Digital systems");
    assert.equal(completedSystems.children[1].children[0].children[2].textContent, "\u2713 Completed", "Completed activities are ticked");
    assert.match(completedSystems.children[1].children[0].className, /is-complete/);
    progressResponse = { ok: false, status: 401, json: async () => ({}) };
    await context.renderPathwayTaskList();
    assert.equal(list.children.length, 5, "Strands still show when progress cannot load");
    assert.ok(list.children.every((item) => item.children.length === 1));
    assert.match(status.textContent, /activity progress could not be loaded/);
    assert.equal(retry.hidden, false);
    progressResponse = { ok: true, json: async () => ({ tracked: [{ ...tracked[0], href: "javascript:alert(1)" }], progress: {} }) };
    await context.renderPathwayTaskList();
    assert.ok(list.children.every((item) => item.children.length === 1), "Unsafe activity links are ignored");
    progressResponse = { ok: true, json: async () => ({ tracked, progress: {} }) };

    for (const course of ["MiddleDTECH", "SeniorDTECH", ""]) {
        const before = calls;
        panel.dataset.course = course;
        events["hub-course-resolved"]();
        await tick();
        assert.equal(calls, before, "Only JuniorDTECH fetches pathway names");
        assert.equal(list.hidden, true);
        assert.equal(list.children.length, 0);
    }
    assert.match(status.textContent, /not confirmed/);
    panel.dataset.courseStatus = "pending";
    await context.renderPathwayTaskList();
    assert.match(status.textContent, /Checking your course/);
    panel.dataset.courseStatus = "error";
    await context.renderPathwayTaskList();
    assert.equal(retry.hidden, false);
    retry.click();
    assert.equal(courseRetries, 1);

    panel.dataset = { course: "JuniorDTECH", courseStatus: "ready" };
    for (const badResponse of [
        { ok: false, status: 503 },
        { ok: true, json: async () => ({ cards }) },
        { ok: true, json: async () => [{ title: "" }] }
    ]) {
        response = badResponse;
        await context.renderPathwayTaskList();
        assert.equal(retry.hidden, false);
        assert.match(status.textContent, /could not be loaded/);
        assert.equal(list.children.length, 0);
    }
    response = { ok: true, json: async () => [
        { title: "<script>not HTML</script>", yearLevel: "Junior DTECH" },
        { title: "Middle only", yearLevel: "Middle DTECH" },
        { title: "Binary & Data", yearLevel: "Junior DTECH", cardType: "unit" },
        { title: "Binary Piano", yearLevel: "Junior DTECH", cardType: "lesson" },
        { title: "Build the Piano", yearLevel: "Junior DTECH", cardType: "activity" }
    ] };
    retry.click();
    await tick();
    assert.deepEqual(titles(), ["<script>not HTML</script>"], "Titles are text, and other course cards and Unit cards are excluded");
    response = { ok: true, json: async () => [] };
    await context.renderPathwayTaskList();
    assert.equal(list.hidden, true);
    assert.match(status.textContent, /No JuniorDTECH/);

    let releases = [];
    const release = () => { releases.forEach((resolve) => resolve()); releases = []; };
    context.fetch = (url) => new Promise((resolve) => { releases.push(() => resolve(url === progressUrl
        ? { ok: true, json: async () => ({ tracked, progress: {} }) } : { ok: true, json: async () => cards })); });
    const pending = context.renderPathwayTaskList();
    signedIn = false;
    events["hub-auth-state-changed"]();
    release();
    await pending;
    assert.equal(list.children.length, 0, "Sign-out discards pending library responses");
    assert.match(status.textContent, /Sign in/);
    signedIn = true;
    const coursePending = context.renderPathwayTaskList();
    panel.dataset.course = "SeniorDTECH";
    events["hub-course-resolved"]();
    release();
    await coursePending;
    assert.equal(list.children.length, 0, "Course changes discard pending Junior responses");
    console.log("Junior pathway Task List names, course gating, retry and stale response regressions passed.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
