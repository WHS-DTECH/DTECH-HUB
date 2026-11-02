"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
const slice = (start, end) => {
    const from = source.indexOf(start);
    assert.ok(from >= 0, start);
    return source.slice(from, source.indexOf(end, from));
};

function setup({ courseStatus = "pending", pending = [{ kitId: "kit-google-drawings", index: 0, title: "Ship" }] } = {}) {
    const listeners = {};
    const storage = new Map();
    const shown = [];
    const panel = { dataset: { courseStatus } };
    const context = vm.createContext({
        console, setTimeout, clearTimeout,
        window: {
            setTimeout, clearTimeout,
            addEventListener: (name, fn) => { (listeners[name] ||= []).push(fn); },
            removeEventListener: (name, fn) => { listeners[name] = (listeners[name] || []).filter((item) => item !== fn); }
        },
        document: { createElement: () => ({}), querySelector: (selector) => selector === "#hub-global-sidebar" ? panel : null },
        sessionStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
        hubAuthState: { profile: { email: "student@school.nz" } },
        normalizeEmail: (value) => String(value || "").toLowerCase(),
        withHubAuthHeaders: (headers) => headers,
        fetch: async () => ({ ok: true, json: async () => ({ pending }) })
    });
    vm.runInContext(`let hubCourseRedirecting = false;
        ${slice("function waitForHubCourseResolved(", "\nfunction getTaskListCourseFromAllocations(")}
        ${slice("const DRAWING_FILING_PATH", "\nfunction showDrawingFilingReminder(")}
        function showDrawingFilingReminder(email, pending, key) { shown.push({ email, pending, key }); }
        this.check = checkDrawingFilingReminder;
        this.redirect = () => { hubCourseRedirecting = true; };`, Object.assign(context, { shown }));
    const resolve = (status = "ready") => {
        panel.dataset.courseStatus = status;
        (listeners["hub-course-resolved"] || []).slice().forEach((fn) => fn({ detail: { status } }));
    };
    return { context, shown, storage, resolve };
}

const tick = () => new Promise((resolve) => setImmediate(resolve));

test("the drawing reminder waits for the course and never opens on a page that is redirecting", async () => {
    const page = setup();
    const running = page.context.check();
    await tick();
    assert.equal(page.shown.length, 0, "Nothing opens while the course is still loading");
    page.context.redirect();
    page.resolve();
    await running;
    assert.equal(page.shown.length, 0, "No popup flashes before the Junior/Middle redirect");
    assert.equal(page.storage.size, 0, "The redirect does not use up this session's reminder");

    const next = setup();
    const after = next.context.check();
    next.resolve();
    await after;
    assert.equal(next.shown.length, 1, "The popup opens on the page the student lands on");
    assert.equal(next.storage.size, 0, "Showing it does not mark it seen; only closing it does");
});

test("the drawing reminder opens straight away once the course is already known, and stays hidden after it is dismissed", async () => {
    const page = setup({ courseStatus: "ready" });
    await page.context.check();
    assert.equal(page.shown.length, 1);
    const dismissed = setup({ courseStatus: "ready" });
    dismissed.storage.set("hub_drawing_filing_reminder_v1:student@school.nz", "1");
    await dismissed.context.check();
    assert.equal(dismissed.shown.length, 0);
    const empty = setup({ courseStatus: "ready", pending: [] });
    await empty.context.check();
    assert.equal(empty.shown.length, 0, "Students with nothing to move never see it");
});

test("only Remind me later, Close or Escape mark the reminder as seen", () => {
    const show = slice("function showDrawingFilingReminder(", "\nlet INTERNAL_ASSESSMENT_DEADLINE");
    assert.doesNotMatch(slice("async function checkDrawingFilingReminder(", "\nfunction showDrawingFilingReminder("), /sessionStorage\.setItem/);
    assert.match(show, /dismiss\?\.addEventListener\("click"[\s\S]*?sessionStorage\.setItem\(reminderKey/);
    assert.match(show, /addEventListener\("cancel"[\s\S]*?sessionStorage\.setItem\(reminderKey/);
    assert.match(source, /hubCourseRedirecting = true;\s*window\.location\.replace\(destination\)/);
});
