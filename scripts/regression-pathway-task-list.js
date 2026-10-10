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
        append(child) { this.children.push(child); },
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
        loadAndRenderSidebarCourse: async () => { courseRetries++; },
        fetch: async (url, options) => {
            calls++;
            assert.equal(url, "/learning-pathways/library.json");
            assert.equal(options.cache, "no-store");
            return response;
        },
        console: { error() {} }
    });
    vm.runInContext(source, context);
    events.DOMContentLoaded();
    await tick();
    const titles = () => list.children.map((item) => item.children[0].textContent);
    assert.deepEqual(titles(), cards.map((card) => card.title).sort((a, b) => a.localeCompare(b)));
    assert.equal(list.children.length, 5);
    assert.equal(list.hidden, false);
    assert.equal(retry.hidden, true);
    assert.ok(list.children.every((item) => item.children.length === 1), "Only names, no fake tasks or completion");

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
        { title: "Middle only", yearLevel: "Middle DTECH" }
    ] };
    retry.click();
    await tick();
    assert.deepEqual(titles(), ["<script>not HTML</script>"], "Titles are text, and other course cards are excluded");
    response = { ok: true, json: async () => [] };
    await context.renderPathwayTaskList();
    assert.equal(list.hidden, true);
    assert.match(status.textContent, /No JuniorDTECH/);

    let release;
    context.fetch = () => new Promise((resolve) => { release = resolve; });
    const pending = context.renderPathwayTaskList();
    signedIn = false;
    events["hub-auth-state-changed"]();
    release({ ok: true, json: async () => cards });
    await pending;
    assert.equal(list.children.length, 0, "Sign-out discards pending library responses");
    assert.match(status.textContent, /Sign in/);
    signedIn = true;
    const coursePending = context.renderPathwayTaskList();
    panel.dataset.course = "SeniorDTECH";
    events["hub-course-resolved"]();
    release({ ok: true, json: async () => cards });
    await coursePending;
    assert.equal(list.children.length, 0, "Course changes discard pending Junior responses");
    console.log("Junior pathway Task List names, course gating, retry and stale response regressions passed.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
