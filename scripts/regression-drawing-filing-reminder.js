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

function setup({ courseStatus = "pending", pending = [{ kitId: "kit-google-drawings", index: 0, title: "Ship" }], bearer = "", status = 200 } = {}) {
    const listeners = {};
    const storage = new Map();
    const shown = [];
    const requests = [];
    const panel = { dataset: { courseStatus } };
    const context = vm.createContext({
        console, setTimeout, clearTimeout,
        window: {
            setTimeout, clearTimeout,
            addEventListener: (name, fn) => { (listeners[name] ||= []).push(fn); },
            removeEventListener: (name, fn) => { listeners[name] = (listeners[name] || []).filter((item) => item !== fn); }
        },
        document: { createElement: () => ({}), querySelector: (selector) => selector === "#hub-global-sidebar" ? panel : null },
        sessionStorage: {
            getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value),
            removeItem: (key) => storage.delete(key), key: (index) => [...storage.keys()][index] ?? null,
            get length() { return storage.size; }
        },
        hubAuthState: { profile: { email: "student@school.nz" } },
        normalizeEmail: (value) => String(value || "").toLowerCase(),
        withHubAuthHeaders: (headers, email) => ({ ...headers, "x-user-email": email }),
        getActiveHubBearerToken: () => bearer,
        fetch: async (url, options) => {
            requests.push({ url, headers: options.headers });
            return { ok: status === 200, json: async () => ({ pending }) };
        }
    });
    vm.runInContext(`let hubCourseRedirecting = false;
        ${slice("function waitForHubCourseResolved(", "\nfunction getTaskListCourseFromAllocations(")}
        ${slice("const DRAWING_FILING_PATH", "\nfunction showDrawingFilingReminder(")}
        function showDrawingFilingReminder(email, pending, key) { shown.push({ email, pending, key }); }
        this.check = checkDrawingFilingReminder;
        this.signOut = clearDrawingFilingReminderFlags;
        this.redirect = () => { hubCourseRedirecting = true; };`, Object.assign(context, { shown }));
    const resolve = (status = "ready") => {
        panel.dataset.courseStatus = status;
        (listeners["hub-course-resolved"] || []).slice().forEach((fn) => fn({ detail: { status } }));
    };
    return { context, shown, storage, requests, resolve };
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
    dismissed.storage.set("hub_drawing_filing_reminder_v2:student@school.nz", "1");
    await dismissed.context.check();
    assert.equal(dismissed.shown.length, 0);
    const empty = setup({ courseStatus: "ready", pending: [] });
    await empty.context.check();
    assert.equal(empty.shown.length, 0, "Students with nothing to move never see it");
});

test("old 'seen' flags are ignored, signing out clears the flag, and an access-token-only sign-in still works", async () => {
    const stale = setup({ courseStatus: "ready", bearer: "ya29.opaque-access-token" });
    stale.storage.set("hub_drawing_filing_reminder_v1:student@school.nz", "1");
    await stale.context.check();
    assert.equal(stale.shown.length, 1, "A flag left by the earlier version no longer hides the reminder");
    assert.equal(stale.requests[0].headers.Authorization, "Bearer ya29.opaque-access-token",
        "An opaque Google access token is sent so the server can verify the student");
    stale.storage.set("hub_drawing_filing_reminder_v2:student@school.nz", "1");
    stale.storage.set("other", "keep");
    stale.context.signOut();
    assert.deepEqual([...stale.storage.keys()], ["other"], "Signing out clears only the drawing reminder flags");

    const retry = setup({ courseStatus: "ready", status: 401 });
    await retry.context.check();
    assert.equal(retry.shown.length, 0);
    retry.context.hubAuthState.profile.email = "student@school.nz";
    await retry.context.check();
    assert.equal(retry.requests.length, 2, "A failed check is retried on the next page render");

    const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
    assert.match(server, /\["GET", "POST"\]\.includes\(req\.method\) && req\.path === "\/api\/practical-skills\/drawing-filing"/);
    assert.match(source, /function signOutHubGoogle\(\) \{\s*clearDrawingFilingReminderFlags\(\);/);
});

test("only Remind me later, Close or Escape mark the reminder as seen", () => {
    const show = slice("function showDrawingFilingReminder(", "\nlet INTERNAL_ASSESSMENT_DEADLINE");
    assert.doesNotMatch(slice("async function checkDrawingFilingReminder(", "\nfunction showDrawingFilingReminder("), /sessionStorage\.setItem/);
    assert.match(show, /dismiss\?\.addEventListener\("click"[\s\S]*?sessionStorage\.setItem\(reminderKey/);
    assert.match(show, /addEventListener\("cancel"[\s\S]*?sessionStorage\.setItem\(reminderKey/);
    assert.match(source, /hubCourseRedirecting = true;\s*window\.location\.replace\(destination\)/);
});

test("filing reminder emits real outcomes for the activity and never calls a failed move synced", async () => {
    for (const filed of [true, false]) {
        const elements = new Map(), events = [];
        function element() {
            return { textContent: "", events: {}, replaceChildren() {}, append() {}, setAttribute() {}, showModal() {},
                addEventListener(name, handler) { this.events[name] = handler; },
                querySelector(selector) {
                    if (!elements.has(selector)) elements.set(selector, element());
                    return elements.get(selector);
                } };
        }
        const result = { documentKey: "google-file:ship", index: 0, kitId: "kit-google-drawings", filed,
            reason: filed ? "" : "not-owner", path: filed ? ["WHS-DTECH", "JuniorDTECH", "KITS", "Google Drawings"] : null };
        const context = vm.createContext({
            document: { createElement: element, body: { appendChild() {} } },
            window: { dispatchEvent: (event) => events.push(event) },
            CustomEvent: function (name, options) { return { name, detail: options.detail }; },
            hubAuthState: { profile: { email: "student@school.nz" } },
            normalizeEmail: (email) => email,
            requestHubDriveAccessToken: async () => ({ access_token: "student-token" }),
            drawingFilingHeaders: (headers) => headers,
            DRAWING_FILING_PATH: "/api/practical-skills/drawing-filing",
            fetch: async () => ({ ok: true, json: async () => ({ results: [result], pending: [] }) })
        });
        vm.runInContext(slice("function showDrawingFilingReminder(", "\nlet INTERNAL_ASSESSMENT_DEADLINE"), context);
        context.showDrawingFilingReminder("student@school.nz", [{ title: "Ship" }]);
        await elements.get("[data-drawing-filing-move]").events.click();
        assert.equal(events.length, 1);
        assert.equal(events[0].name, "hub-drawings-filed");
        assert.equal(events[0].detail.email, "student@school.nz");
        assert.equal(events[0].detail.results[0].filed, filed);
        const status = elements.get("[data-drawing-filing-status]").textContent;
        assert.match(status, filed ? /All done! Your drawings are in/ : /Some links could not be synced/);
    }
});
