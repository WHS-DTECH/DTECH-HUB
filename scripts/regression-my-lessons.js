"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "learning-pathways", "my-lessons.js"), "utf8");
const library = JSON.parse(fs.readFileSync(path.join(root, "learning-pathways", "library.json"), "utf8"));

function node() {
    return {
        hidden: false, textContent: "", children: [], attributes: {},
        append(...items) { this.children.push(...items); },
        replaceChildren() { this.children = []; },
        setAttribute(name, value) { this.attributes[name] = value; },
        addEventListener(type, handler) { this[type] = handler; }
    };
}

function setup() {
    const elements = Object.fromEntries(["units", "status", "retry", "student-name", "student-email"]
        .map((id) => [`#my-lessons-${id}`, node()]));
    const events = {};
    const errors = [];
    const state = { signedIn: false, response: { ok: true, json: async () => library } };
    const context = vm.createContext({
        document: { querySelector: (selector) => elements[selector], createElement: node },
        window: { location: { origin: "http://localhost:3107" }, addEventListener: (type, fn) => { events[type] = fn; } },
        URL, console: { error: (...args) => errors.push(args) },
        hubAuthState: { profile: null },
        hasAllowedSignedInHubAccount: () => state.signedIn,
        getHubDisplayName: (profile) => profile.name,
        fetch: async (url, options) => {
            assert.equal(url, "/learning-pathways/library.json");
            assert.equal(options.cache, "no-store");
            return state.response;
        }
    });
    vm.runInContext(source, context);
    return { context, elements, events, state, errors };
}

test("My Lessons renders current Unit names and direct activity links, including empty Units", async () => {
    const { context, elements, events, state } = setup();
    await context.loadMyLessons();
    const sections = elements["#my-lessons-units"].children;
    assert.deepEqual(sections.map((section) => section.children[0].textContent),
        ["Binary & Data", "Infrastructure & Networking"]);
    const links = sections[0].children[1].children.map((item) => item.children[0]);
    assert.deepEqual(links.map((link) => link.children[0].textContent), ["Build Your Binary Piano", "Encoding Binary"]);
    assert.deepEqual(links.map((link) => link.href), [
        "/learning-pathways/activity-build-your-binary-piano.html",
        "/learning-pathways/activity-encoding-binary.html"
    ]);
    assert.equal(links[1].children[1].textContent, "Lesson 2: Encoding Binary");
    assert.equal(sections[1].children[1].textContent, "No lesson activities published yet.");
    assert.equal(elements["#my-lessons-status"].hidden, true);
    assert.equal(elements["#my-lessons-retry"].hidden, true);
    state.signedIn = true;
    context.hubAuthState.profile = { name: "Test Student", email: "student@example.test" };
    events["hub-auth-state-changed"]();
    assert.equal(elements["#my-lessons-student-name"].textContent, "Test Student");
    state.signedIn = false;
    context.hubAuthState.profile = null;
    events["hub-auth-state-changed"]();
    assert.equal(elements["#my-lessons-student-name"].textContent, "Your Pathways lessons");
    assert.match(elements["#my-lessons-student-email"].textContent, /Sign in/);
});

test("Published hierarchy determines order and visibility without copying Unit titles", () => {
    const { context } = setup();
    const cards = [
        { id: "u", title: "Renamed Unit", cardType: "unit", status: "active" },
        { id: "l2", title: "A later lesson", cardType: "lesson", status: "active", unit: "u", sequence: 2 },
        { id: "l1", title: "Z first lesson", cardType: "lesson", status: "active", unit: "u", sequence: 1 },
        { id: "later", title: "A later activity", cardType: "activity", status: "active", lesson: "l2", sequence: 1, href: "/learning-pathways/later.html" },
        { id: "second", title: "A second activity", cardType: "activity", status: "active", lesson: "l1", sequence: 2, href: "/learning-pathways/second.html" },
        { id: "first", title: "Z first activity", cardType: "activity", status: "active", lesson: "l1", sequence: 1, href: "/learning-pathways/first.html" },
        { id: "draft", title: "Draft", cardType: "activity", status: "planning", lesson: "l1", href: "/learning-pathways/draft.html" },
        { id: "blank", title: "Not built", cardType: "activity", status: "active", lesson: "l1", href: "" },
        { id: "lp", title: "Planning lesson", cardType: "lesson", status: "planning", unit: "u" },
        { id: "under-draft", title: "Hidden activity", cardType: "activity", status: "active", lesson: "lp", href: "/learning-pathways/hidden.html" },
        { id: "up", title: "Planning Unit", cardType: "unit", status: "planning" },
        { id: "lup", title: "Hidden lesson", cardType: "lesson", status: "active", unit: "up" },
        { id: "under-draft-unit", title: "Hidden Unit activity", cardType: "activity", status: "active", lesson: "lup", href: "/learning-pathways/hidden.html" }
    ];
    const groups = context.getMyLessonsGroups(cards);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].unit.title, "Renamed Unit");
    assert.deepEqual(Array.from(groups[0].activities, ({ activity }) => activity.id), ["first", "second", "later"]);
});

test("Invalid data and unsafe links show errors; Retry recovers and stale requests cannot overwrite it", async () => {
    const { context, elements, state, errors } = setup();
    await context.loadMyLessons();
    for (const response of [
        { ok: false, status: 503 },
        { ok: true, json: async () => ({ cards: library }) },
        { ok: true, json: async () => [null] },
        { ok: true, json: async () => [...library, library[0]] },
        ...["javascript:alert(1)", "//example.test/activity.html", "/learning-pathways/\\example.test/a.html",
            "/learning-pathways/../index.html"].map((href) => ({
            ok: true, json: async () => library.map((card) => card.cardType === "activity" ? { ...card, href } : card)
        })),
        { ok: true, json: async () => library.map((card) => card.cardType === "activity" ? { ...card, lesson: "missing" } : card) }
    ]) {
        state.response = response;
        await context.loadMyLessons();
        assert.equal(elements["#my-lessons-units"].hidden, true);
        assert.equal(elements["#my-lessons-units"].children.length, 0);
        assert.equal(elements["#my-lessons-retry"].hidden, false);
        assert.match(elements["#my-lessons-status"].textContent, /could not be loaded/);
    }
    assert.ok(errors.length > 0);
    let finishOld;
    state.response = { ok: true, json: () => new Promise((resolve) => { finishOld = resolve; }) };
    const old = context.loadMyLessons();
    await new Promise((resolve) => setImmediate(resolve));
    state.response = { ok: true, json: async () => library };
    elements["#my-lessons-retry"].click();
    await new Promise((resolve) => setImmediate(resolve));
    finishOld([]);
    await old;
    assert.equal(elements["#my-lessons-units"].children.length, 2, "Earlier responses do not replace Retry results");
    assert.equal(elements["#my-lessons-retry"].hidden, true);
    state.response = { ok: true, json: async () => [] };
    await context.loadMyLessons();
    assert.equal(elements["#my-lessons-status"].textContent, "No Units have been published yet.");
    assert.equal(elements["#my-lessons-status"].hidden, false);
});

test("My Lessons navigation follows the existing Pathways course visibility", () => {
    const client = fs.readFileSync(path.join(root, "script.js"), "utf8");
    const start = client.indexOf("function updateSidebarCourseSections(");
    const end = client.indexOf('\nwindow.addEventListener("hub-course-changed"', start);
    const pathways = node();
    const lessons = node();
    const context = vm.createContext({
        hubAuthState: { profile: { email: "student@example.test" } },
        document: { querySelector: (selector) => ({
            "#hub-pathways-link": pathways, "#hub-my-lessons-link": lessons
        })[selector] || null },
        window: { dispatchEvent() {} }, CustomEvent: function () {},
        updateSidebarExternalExamForm() {}
    });
    vm.runInContext(client.slice(start, end), context);
    const panel = { dataset: {}, querySelector: () => null };
    for (const course of ["JuniorDTECH", "MiddleDTECH", "SeniorDTECH", ""]) {
        context.updateSidebarCourseSections(panel, course);
        assert.equal(lessons.hidden, !["JuniorDTECH", "MiddleDTECH"].includes(course));
        assert.equal(lessons.hidden, pathways.hidden);
    }
    context.hubAuthState.profile = null;
    context.updateSidebarCourseSections(panel, "JuniorDTECH");
    assert.equal(lessons.hidden, true);
});
