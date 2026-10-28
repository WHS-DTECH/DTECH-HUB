"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const express = require("express");
const B = require("../practical-skills/activity-blocks");
const { withUnityHubLicence } = require("../practical-skills/unity-setup");
const { registerActivityBlocks } = require("../practical-skills/activity-block-store");
const certificate = require("../practical-skills-certificate");
const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "server.js"), "utf8");
const baseContent = () => ({
    kitId: "kit-unity-setup", identity: { name: "Unity Setup kit" }, bannerTitle: "Unity Setup kit",
    worksheets: ["Unity Hub & Licence", "Unity Editor", "Unity Project Folder", "Google Drive Backup", "Unity Test Project"].map((activity) => ({ activity })),
    activities: [{ title: "Unity Hub & Licence" }, { title: "Unity Editor" }, {}, {}, {}]
});
const mockLicence = "TEST-ONLY-NOT-A-REAL-LICENCE";

test("Unity preset builds four steps without answers and preserves the other setup activities and teacher licence on reopen", () => {
    const original = baseContent();
    const before = JSON.stringify(original);
    const content = withUnityHubLicence(original);
    assert.equal(JSON.stringify(original), before);
    assert.equal(content.activities[2], original.activities[2]);
    const activity = content.activities[0];
    assert.equal(activity.title, "Unity Hub & Licence");
    assert.equal(activity.completionMode, "manual");
    assert.deepEqual(activity.questions, []);
    assert.deepEqual(activity.blocks.map((block) => block.kind), ["tasks", "tasks", "schoollicence", "text"]);
    assert.match(activity.blocks[0].text, /Windows Start/);
    assert.match(activity.blocks[1].text, /Settings[\s\S]*Licenses[\s\S]*Add license/);
    assert.match(activity.blocks[3].text, /confirm that the licence is activated/);
    content.activities.forEach(B.validate);
    activity.blocks[2].activationMethod = "serial";
    activity.blocks[2].licenceValue = mockLicence;
    assert.equal(withUnityHubLicence(content), content, "The preset is idempotent and keeps current teacher configuration");
    assert.equal(withUnityHubLicence({ ...content, identity: { name: "Other Kit" }, bannerTitle: "Other" }).activities[0], activity);
    assert.match(activity.taskBrief.evidenceRequired, /does not award[\s\S]*UnityTest/);
});

test("school licence definitions validate; ordinary student content and collapsed markup never contain the licence value", () => {
    const block = { id: "school", kind: "schoollicence", activationMethod: "serial", licenceValue: mockLicence };
    B.validate({ blocks: [block] });
    assert.throws(() => B.validate({ blocks: [{ ...block, activationMethod: "other" }] }), /Choose serial/);
    assert.throws(() => B.validate({ blocks: [{ ...block, licenceValue: {} }] }), /must be text/);
    const activity = { blocks: [block] };
    const publicActivity = B.publicActivity(activity);
    assert.doesNotMatch(JSON.stringify(publicActivity), new RegExp(mockLicence));
    assert.equal(activity.blocks[0].licenceValue, mockLicence);
    const ctx = vm.createContext({ window: { ActivityBlocks: B }, structuredClone });
    vm.runInContext(fs.readFileSync(path.join(root, "practical-skills", "activity-block-view.js"), "utf8"), ctx);
    const html = ctx.window.ActivityBlockView.markup(activity.blocks, {}, false);
    assert.doesNotMatch(html, new RegExp(mockLicence));
    assert.match(html, /data-school-licence-viewer hidden/);
    assert.match(html, /View School Licence/);
    assert.match(html, /Hide School Licence/);
    assert.doesNotMatch(html, /<input|<textarea/);
    assert.match(source, /ActivityBlocks\.publicActivity\(activity\)/);
});

test("the complete student worksheet renders all four steps without questions, uploads or an embedded licence", () => {
    const activity = withUnityHubLicence(baseContent()).activities[0];
    activity.blocks[2].licenceValue = mockLicence;
    const ctx = vm.createContext({ window: { ActivityBlocks: B }, structuredClone });
    for (const file of ["activity-block-view.js", "kit-worksheet-render.js"]) {
        vm.runInContext(fs.readFileSync(path.join(root, "practical-skills", file), "utf8"), ctx);
    }
    const host = { style: { setProperty() {} }, innerHTML: "", querySelectorAll: () => [] };
    ctx.window.KitWorksheetRender.renderWorksheet(host, { ...activity, bannerTitle: activity.title }, { readOnly: true });
    assert.equal((host.innerHTML.match(/class="activity-content-block"/g) || []).length, 4);
    assert.doesNotMatch(host.innerHTML, /<input|<textarea|TEST-ONLY-NOT-A-REAL-LICENCE/);
    assert.match(host.innerHTML, /View School Licence/);
    assert.match(host.innerHTML, /choose Mark Activity Complete/);
    assert.match(host.innerHTML, /final activity/);
});

test("Unity Editor migrates once, renders current teacher settings and accepts full version identifiers", () => {
    const previous = withUnityHubLicence(baseContent());
    delete previous.activities[1].unityEditorVersion;
    previous.activities[0].blocks[2].licenceValue = mockLicence;
    const content = withUnityHubLicence(previous);
    const activity = content.activities[1];
    assert.equal(content.activities[0], previous.activities[0], "Activity 1 and its licence remain unchanged");
    assert.equal(content.activities[2], previous.activities[2]);
    assert.equal(activity.title, "Unity Editor");
    assert.equal(activity.completionMode, "manual");
    assert.deepEqual(activity.questions, []);
    assert.deepEqual(activity.images, []);
    assert.equal(activity.unityEditor.version, "6000.5");
    assert.equal(activity.blocks.length, 4);
    assert.match(activity.blocks[0].text, /already installed/);
    const ctx = vm.createContext({ window: { ActivityBlocks: B }, structuredClone });
    for (const file of ["activity-block-view.js", "kit-worksheet-render.js"]) {
        vm.runInContext(fs.readFileSync(path.join(root, "practical-skills", file), "utf8"), ctx);
    }
    const host = { style: { setProperty() {} }, innerHTML: "", querySelectorAll: () => [] };
    const render = () => ctx.window.KitWorksheetRender.renderWorksheet(host, activity, { readOnly: true });
    render();
    assert.equal((host.innerHTML.match(/class="activity-content-block"/g) || []).length, 4);
    assert.match(host.innerHTML, /font-size:1.5em">6000\.5/);
    assert.match(host.innerHTML, /No additional modules specified by your teacher\./);
    assert.doesNotMatch(host.innerHTML, /<input|<textarea|Additional installation notes/);
    for (const version of ["6000.5.0f1", "6000.5.1b12", "6000.5.0a3"]) {
        activity.unityEditor = { version, modules: "Windows Build Support\nWeb Build Support", notes: "<script>unsafe</script>" };
        B.validate(activity);
        render();
        assert.ok(host.innerHTML.includes(version));
        assert.match(host.innerHTML, /Windows Build Support\nWeb Build Support/);
        assert.match(host.innerHTML, /&lt;script&gt;unsafe&lt;\/script&gt;/);
        assert.doesNotMatch(host.innerHTML, /<script>/);
        assert.equal(withUnityHubLicence(content), content, "Reopening never resets teacher configuration");
    }
    for (const config of [null, [], { version: "" }, { version: 6000.5 }, { version: "6000.5", modules: [] }]) {
        assert.throws(() => B.validate({ ...activity, unityEditor: config }), /Unity Editor settings/);
    }
    assert.match(activity.taskBrief.evidenceRequired, /do not need to reinstall/);
    assert.match(activity.blocks[3].text, /Activity 3 - Unity Project Folder/);
});

test("Unity Editor manual completion saves its tick and directs students to Activity 3", async () => {
    const controller = fs.readFileSync(path.join(root, "practical-skills", "kit-worksheet.js"), "utf8");
    const start = controller.indexOf('        activityCompleteBtn.addEventListener("click",');
    const end = controller.indexOf("\n        });", start) + "\n        });".length;
    let click;
    let message;
    const state = { progressLoaded: true, completedActivities: {}, responses: {}, kitId: "kit-unity-setup",
        content: withUnityHubLicence(baseContent()) };
    const ctx = vm.createContext({
        state, activityCompleteBtn: { addEventListener(_name, fn) { click = fn; } },
        getCurrentActivityIndex: () => 1,
        window: { clearTimeout() {}, ActivityBlocks: B, KitWorksheetRender: { visibleLoginSites: () => [] } },
        queueProgressWrite: (fn) => fn(), saveResponses: async () => {}, withAuthHeaders: (headers) => headers,
        loadJson: async (_url, options) => {
            const { completed } = JSON.parse(options.body);
            return { completedActivities: completed ? { 1: "saved" } : {} };
        },
        showStatusMessage: (value) => { message = value; }, updateActivityCompleteBar() {}
    });
    vm.runInContext(controller.slice(start, end), ctx);
    await click();
    assert.equal(state.completedActivities[1], "saved");
    assert.match(message, /Activity 3 - Unity Project Folder/);
    await click();
    assert.deepEqual(state.completedActivities, {});
    assert.equal(message, "Activity completion removed.");
    assert.match(controller, /unityEditor: activity\?\.unityEditor/);
});

test("teachers preview, save and reopen Editor configuration without changing the school licence", async () => {
    let stored = withUnityHubLicence(baseContent());
    stored.activities[0].blocks[2].licenceValue = mockLicence;
    const nodes = new Map();
    const get = (selector) => {
        if (!nodes.has(selector)) nodes.set(selector, {
            value: "", children: [], handlers: {}, classList: { toggle() {} },
            replaceChildren() { this.children = []; },
            addEventListener(name, fn) { this.handlers[name] = fn; }
        });
        return nodes.get(selector);
    };
    let preview;
    let timer;
    const ctx = vm.createContext({
        document: { querySelector: get }, URLSearchParams,
        window: {
            location: { search: "?kit=kit-unity-setup&activity=1" }, ActivityBlocks: B,
            clearTimeout() {}, setTimeout(fn) { timer = fn; },
            ActivityBlockEditor: { mount(_host, options) {
                return { read: () => options.blocks, destroy() {}, isUploading: () => false };
            } },
            KitWorksheetRender: { renderWorksheet(_host, draft) { preview = draft; } }
        },
        localStorage: { getItem: () => null }, sessionStorage: { getItem: () => null },
        fetch: async (_url, options = {}) => {
            if (options.method === "PUT") stored = JSON.parse(options.body).content;
            return { ok: true, json: async () => ({ content: structuredClone(stored) }) };
        }
    });
    const admin = fs.readFileSync(path.join(root, "practical-skills", "admin-kit-activity.js"), "utf8");
    const tick = () => new Promise((resolve) => setImmediate(resolve));
    vm.runInContext(admin, ctx);
    await tick();
    assert.equal(get("#activity-unity-editor").hidden, false);
    assert.equal(get("#activity-unity-version").value, "6000.5");
    get("#activity-unity-version").value = "6000.5.2f1";
    get("#activity-unity-modules").value = "Windows Build Support";
    get("#activity-unity-notes").value = "Keep Unity Hub open.";
    get("#activity-editor-fields").handlers.input();
    timer();
    assert.equal(preview.unityEditor.version, "6000.5.2f1");
    assert.equal(stored.activities[1].unityEditor.version, "6000.5", "Preview is not a save");
    get("#activity-save").handlers.click();
    await tick();
    assert.equal(stored.activities[1].unityEditor.modules, "Windows Build Support");
    assert.equal(stored.activities[1].unityEditor.notes, "Keep Unity Hub open.");
    assert.equal(stored.activities[0].blocks[2].licenceValue, mockLicence);
    vm.runInContext(admin, ctx);
    await tick();
    assert.equal(get("#activity-unity-version").value, "6000.5.2f1");
    assert.equal(get("#activity-unity-modules").value, "Windows Build Support");
});

test("Unity instructions and teacher licence settings persist in database content across fresh server contexts", async () => {
    let stored = baseContent();
    const writes = [];
    const ctx = () => {
        const context = vm.createContext({
            hasDatabase: true, ActivityBlocks: B, withUnityHubLicence,
            normalizeEmail: (value) => value, ensurePracticalSkillsKitContentSchema: async () => {},
            getDefaultPracticalSkillsKitContent: () => ({}),
            ...Object.fromEntries(["withShortLoginKit", "withLearningSitesActivity", "withLoginAppsActivity", "withLoginIdentityActivity", "withPasswordProblemsActivity"]
                .map((name) => [name, (_id, content) => content])),
            pool: { query: async (sql, params) => {
                if (sql.includes("SELECT content")) return { rows: [{ content: structuredClone(stored) }] };
                assert.match(sql, /UPDATE practical_skills_kit_content|INSERT INTO practical_skills_kit_content/);
                writes.push(sql);
                stored = JSON.parse(sql.includes("UPDATE") && !sql.includes("ON CONFLICT") ? params[0] : params[1]);
                return { rows: [] };
            } }
        });
        const start = source.indexOf("async function getStoredPracticalSkillsKitContent(");
        const end = source.indexOf("\nasync function savePracticalSkillsKitResponses(", start);
        vm.runInContext(source.slice(start, end), context);
        vm.runInContext(`function normalizePracticalSkillsKitContentForStorage(_id, content) { return withUnityHubLicence(content); }`, context);
        return context;
    };
    const first = await ctx().getStoredPracticalSkillsKitContent("kit-unity-setup");
    assert.equal(first.activities[0].blocks.length, 4);
    assert.equal(writes.length, 1, "The existing Unity kit is configured once, not on every page load");
    first.activities[0].blocks[2].activationMethod = "serial";
    first.activities[0].blocks[2].licenceValue = mockLicence;
    first.activities[1].unityEditor = { version: "6000.5.1f1", modules: "Windows Build Support", notes: "Use the school network." };
    await ctx().savePracticalSkillsKitContent("kit-unity-setup", first, "teacher@school.nz");
    const reopened = await ctx().getStoredPracticalSkillsKitContent("kit-unity-setup");
    assert.equal(reopened.activities[0].blocks[2].licenceValue, mockLicence);
    assert.deepEqual(reopened.activities[1].unityEditor, first.activities[1].unityEditor);
    assert.equal(writes.length, 2, "Reopening does not overwrite the teacher configuration");
});

test("licence viewer fetches current teacher configuration with verified identity, never saves progress and has no student write route", async (t) => {
    const content = withUnityHubLicence(baseContent());
    const block = content.activities[0].blocks[2];
    block.activationMethod = "serial";
    block.licenceValue = mockLicence;
    const app = express();
    app.use((req, _res, next) => {
        if (req.headers["x-verified"] === "yes") req.auth_identity = { verified: true, email: req.headers["x-user-email"] };
        next();
    });
    registerActivityBlocks(app, {
        getRequestUserEmail: (req) => req.headers["x-user-email"] || "",
        normalizeEmail: (value) => String(value).toLowerCase(), schoolDomain: "school.nz",
        getPracticalSkillsKitDefinition: (id) => id === "kit-unity-setup",
        getStoredPracticalSkillsKitContent: async () => content,
        requireAdminAccess: (_req, res) => res.sendStatus(403)
    });
    const server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
    const url = `http://127.0.0.1:${server.address().port}/api/practical-skills/blocks/kit-unity-setup/0/licences/unity-school-licence`;
    const headers = { "x-user-email": "student@school.nz", "x-verified": "yes" };
    assert.equal((await fetch(url)).status, 401);
    assert.equal((await fetch(url, { headers: { "x-user-email": "student@school.nz" } })).status, 401);
    assert.equal((await fetch(url, { headers: { "x-user-email": "external@example.org", "x-verified": "yes" } })).status, 401);
    const response = await fetch(url, { headers });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(await response.json(), { activationMethod: "serial", value: mockLicence });
    block.licenceValue = "";
    assert.equal((await (await fetch(url, { headers })).json()).value, "", "Reopening reads the current value, including a removed licence");
    assert.equal((await fetch(url.replace("unity-school-licence", "unity-find-hub"), { headers })).status, 404);
    assert.equal((await fetch(url, { method: "PUT", headers })).status, 404);
    assert.match(fs.readFileSync(path.join(root, "practical-skills", "kit-publication.js"), "utf8"), /practical-skills\\\/blocks/);
});

test("Licence Kit Setup restricts settings to admins and updates only the current Unity school licence", async (t) => {
    let content = withUnityHubLicence(baseContent());
    const original = structuredClone(content);
    let fail = false;
    let savedBy;
    const app = express();
    app.use(express.json());
    registerActivityBlocks(app, {
        requireAdminAccess: (req, res, next) => req.headers["x-user-email"] === "teacher@school.nz"
            ? next() : res.status(403).json({ error: "Admin required." }),
        getRequestUserEmail: (req) => req.headers["x-user-email"] || "",
        normalizeEmail: (value) => value.toLowerCase(), schoolDomain: "school.nz",
        getPracticalSkillsKitDefinition: (id) => id === "kit-unity-setup",
        getStoredPracticalSkillsKitContent: async () => content,
        savePracticalSkillsKitContent: async (_kit, updated, email) => {
            if (fail) throw new Error("Database unavailable");
            savedBy = email;
            content = structuredClone(updated);
        }
    });
    const server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
    const url = `http://127.0.0.1:${server.address().port}/api/admin/practical-skills/kit-licence/kit-unity-setup`;
    const headers = { "x-user-email": "teacher@school.nz", "Content-Type": "application/json" };
    const save = (data, customHeaders = headers) => fetch(url, { method: "PUT", headers: customHeaders, body: JSON.stringify(data) });
    assert.equal((await fetch(url)).status, 403);
    assert.equal((await save({ activationMethod: "serial", licenceValue: mockLicence },
        { ...headers, "x-user-email": "student@school.nz" })).status, 403);
    const first = await fetch(url, { headers });
    assert.equal(first.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(await first.json(), { activationMethod: "instructions", licenceValue: "" });
    for (const data of [{ activationMethod: "other", licenceValue: "" }, { activationMethod: "serial", licenceValue: {} },
        { activationMethod: "serial" }, { activationMethod: "serial", licenceValue: "x".repeat(10001) }]) {
        assert.equal((await save(data)).status, 400);
    }
    assert.equal((await save({ activationMethod: "serial", licenceValue: mockLicence })).status, 200);
    assert.equal(savedBy, "teacher@school.nz");
    assert.equal(content.activities[0].blocks[2].licenceValue, mockLicence);
    assert.deepEqual(content.activities.slice(1), original.activities.slice(1));
    assert.deepEqual(content.worksheets, original.worksheets);
    const reloaded = await (await fetch(url, { headers })).json();
    assert.equal(reloaded.licenceValue, mockLicence);
    const beforeFailure = structuredClone(content);
    fail = true;
    assert.equal((await save({ activationMethod: "instructions", licenceValue: "Unsaved" })).status, 500);
    assert.deepEqual(content, beforeFailure);
    fail = false;
    assert.equal((await save({ activationMethod: "instructions", licenceValue: "" })).status, 200);
    assert.equal((await (await fetch(url, { headers })).json()).licenceValue, "");
    assert.equal((await fetch(url.replace("kit-unity-setup", "kit-other"), { headers })).status, 404);
    const nav = fs.readFileSync(path.join(root, "script.js"), "utf8");
    assert.match(nav, /hub-licence-setup-link[^>]+hidden>Licence Kit Setup/);
    assert.match(nav, /hubLicenceSetupLink\.hidden = !canAdmin/);
});

test("Licence Kit Setup loads, saves and clears the teacher licence on account changes", async () => {
    const nodes = new Map();
    const get = (id) => {
        if (!nodes.has(id)) nodes.set(id, {
            value: "", handlers: {}, classList: { toggle() {} },
            addEventListener(name, fn) { this.handlers[name] = fn; },
            replaceChildren() { this.value = ""; },
            appendChild(option) { this.value = option.value; }
        });
        return nodes.get(id);
    };
    const events = {};
    let signedIn = true;
    let stored = { activationMethod: "instructions", licenceValue: "" };
    let fail = false;
    const ctx = vm.createContext({
        document: { getElementById: get, createElement: () => ({}) },
        window: { addEventListener(name, fn) { events[name] = fn; } },
        localStorage: { getItem: () => signedIn ? JSON.stringify({ profile: { email: "teacher@school.nz" }, idToken: "test-token" }) : null },
        sessionStorage: { getItem: () => null },
        fetch: async (url, options) => {
            if (!signedIn) return { ok: false, json: async () => ({ error: "Admin access required." }) };
            if (fail) return { ok: false, json: async () => ({ error: "Save failed." }) };
            if (options.method === "PUT") stored = JSON.parse(options.body);
            return { ok: true, json: async () => url.endsWith("/kits")
                ? { kits: [{ id: "kit-unity-setup", title: "Unity Setup kit" }, { id: "kit-other", title: "Other kit" }] }
                : stored };
        }
    });
    vm.runInContext(fs.readFileSync(path.join(root, "practical-skills", "licence-kit-setup.js"), "utf8"), ctx);
    const tick = () => new Promise((resolve) => setImmediate(resolve));
    await tick();
    assert.equal(get("setup-form").hidden, false);
    assert.equal(get("setup-fields").disabled, false);
    get("setup-method").value = "serial";
    get("setup-value").value = mockLicence;
    await get("setup-form").handlers.submit({ preventDefault() {} });
    assert.equal(stored.licenceValue, mockLicence);
    assert.match(get("setup-status").textContent, /Unity licence saved/);
    fail = true;
    await get("setup-form").handlers.submit({ preventDefault() {} });
    assert.match(get("setup-status").textContent, /Save failed/);
    assert.equal(get("setup-fields").disabled, false);
    signedIn = false;
    events["hub-auth-state-changed"]();
    await tick();
    assert.equal(get("setup-form").hidden, true);
    assert.equal(get("setup-value").value, "");
});

function viewerFixture() {
    function element() {
        return { hidden: false, disabled: false, isConnected: true, textContent: "", events: {}, attrs: {},
            addEventListener(type, fn) { this.events[type] = fn; },
            setAttribute(key, value) { this.attrs[key] = value; }, focus() {} };
    }
    const nodes = new Map();
    const get = (selector) => { if (!nodes.has(selector)) nodes.set(selector, element()); return nodes.get(selector); };
    const section = { dataset: { contentBlock: "school" }, isConnected: true, querySelector: get };
    get("[data-school-licence-viewer]").hidden = true;
    const copies = [];
    const ctx = vm.createContext({
        window: { ActivityBlocks: B }, structuredClone,
        navigator: { clipboard: { writeText: async (value) => { copies.push(value); } } }
    });
    vm.runInContext(fs.readFileSync(path.join(root, "practical-skills", "activity-block-view.js"), "utf8"), ctx);
    let response = { activationMethod: "serial", value: mockLicence };
    let calls = 0;
    ctx.window.ActivityBlockView.bind({ querySelectorAll: () => [section] }, [{ id: "school", kind: "schoollicence" }], {
        readOnly: true, onChange: () => assert.fail("Viewing must never save an answer"),
        onSchoolLicence: async () => { calls++; if (response instanceof Error) throw response; return response; }
    });
    return { get, copies, calls: () => calls, response: (value) => { response = value; }, ctx };
}

test("view, copy and hide work without exposing or caching a collapsed value; missing licences and fetch/clipboard errors are explicit", async () => {
    const v = viewerFixture();
    const view = v.get("[data-view-school-licence]");
    const value = v.get("[data-school-licence-value]");
    const copy = v.get("[data-copy-school-licence]");
    const status = v.get("[data-school-licence-status]");
    assert.equal(v.calls(), 0, "No licence request before the student clicks View");
    await view.events.click();
    assert.equal(value.textContent, mockLicence);
    assert.equal(copy.hidden, false);
    await copy.events.click();
    assert.deepEqual(v.copies, [mockLicence]);
    v.get("[data-hide-school-licence]").events.click();
    assert.equal(value.textContent, "");
    assert.equal(v.get("[data-school-licence-viewer]").hidden, true);
    assert.equal(view.attrs["aria-expanded"], "false");
    v.response({ activationMethod: "instructions", value: "Use the school activation instructions." });
    await view.events.click();
    assert.equal(copy.hidden, true, "Instruction-based activation never offers Copy Licence");
    assert.equal(v.calls(), 2);
    v.get("[data-hide-school-licence]").events.click();
    v.response({ activationMethod: "instructions", value: "" });
    await view.events.click();
    assert.equal(value.textContent, "School licence information is not yet available. Please ask your teacher.");
    v.get("[data-hide-school-licence]").events.click();
    v.response(new Error("Service unavailable"));
    await view.events.click();
    assert.match(status.textContent, /Service unavailable/);
    assert.equal(view.disabled, false);
    v.response({ activationMethod: "serial", value: mockLicence });
    await view.events.click();
    v.ctx.navigator.clipboard.writeText = async () => { throw new Error("Permission denied"); };
    await copy.events.click();
    assert.match(status.textContent, /copy it manually/);
});

test("Unity Hub manual tick does not award the kit; final practical link is required even if an old final tick exists", async () => {
    const content = withUnityHubLicence(baseContent());
    let row = { student_email: "student@school.nz", responses: {}, completed_activities: { "0": "saved" } };
    const context = vm.createContext({
        ActivityBlocks: B, ...certificate, hasDatabase: false, memoryPracticalSkillsProgress: new Map(),
        kitPublication: { available: async () => true }, normalizeEmail: (value) => value,
        ensurePracticalSkillsProgressRow: async () => row,
        setPracticalSkillsActivityCompletion: async (_email, _kit, index, complete) => {
            if (complete) row.completed_activities[index] = "saved";
            else delete row.completed_activities[index];
            return row;
        }
    });
    const start = source.indexOf("async function syncPracticalSkillsKitCompletion(");
    const end = source.indexOf("\nasync function getPracticalSkillsCertificate(", start);
    vm.runInContext(source.slice(start, end), context);
    const sync = () => context.syncPracticalSkillsKitCompletion("student@school.nz", content.kitId, content);
    assert.equal((await sync()).completed, false);
    for (const index of [1, 2, 3, 4]) row.completed_activities[index] = "old";
    assert.equal((await sync()).completed, false, "A final manual tick cannot bypass the project link");
    assert.equal(row.completed_activities[4], undefined);
    row.responses["4-blocks"] = { "unitytest-project-link": "https://example.test/not-a-drive-project" };
    assert.equal((await sync()).completed, false, "The final evidence must be a Google Drive link");
    row.responses["4-blocks"] = { "unitytest-project-link": "https://drive.google.com/drive/folders/test-project" };
    const completed = await sync();
    assert.equal(completed.completed, true);
    assert.ok(certificate.buildKitCertificate(content, completed, "Student"));
});
