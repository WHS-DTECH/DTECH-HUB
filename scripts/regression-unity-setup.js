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
    assert.equal(content.identity.skillArea, "Application Setups");
    assert.equal(content.activities[3].unityDriveBackupVersion, 1);
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
    assert.equal(content.activities[3], previous.activities[3]);
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

test("Unity Project Folder renders four safe setup steps and preserves teacher edits on reopening", () => {
    const previous = withUnityHubLicence(baseContent());
    delete previous.activities[2].unityProjectFolderVersion;
    previous.activities[0].blocks[2].licenceValue = mockLicence;
    previous.activities[1].unityEditor.version = "6000.5.2f1";
    const content = withUnityHubLicence(previous);
    const activity = content.activities[2];
    assert.equal(content.activities[0], previous.activities[0]);
    assert.equal(content.activities[1], previous.activities[1]);
    assert.equal(content.activities[3], previous.activities[3]);
    assert.equal(content.activities[4], previous.activities[4]);
    assert.equal(activity.title, "Unity Project Folder");
    assert.equal(activity.completionMode, "manual");
    assert.deepEqual(activity.questions, []);
    assert.deepEqual(activity.images, []);
    assert.equal(activity.blocks.length, 4);
    B.validate(activity);
    const ctx = vm.createContext({ window: { ActivityBlocks: B }, structuredClone });
    for (const file of ["activity-block-view.js", "kit-worksheet-render.js"]) {
        vm.runInContext(fs.readFileSync(path.join(root, "practical-skills", file), "utf8"), ctx);
    }
    const host = { style: { setProperty() {} }, innerHTML: "", querySelectorAll: () => [] };
    ctx.window.KitWorksheetRender.renderWorksheet(host, { ...activity, bannerTitle: activity.title }, { readOnly: true });
    assert.equal((host.innerHTML.match(/class="activity-content-block"/g) || []).length, 4);
    assert.match(host.innerHTML, /Videos\n\u2514\u2500\u2500 Unity/);
    assert.match(host.innerHTML, /Videos\\Unity/);
    assert.match(host.innerHTML, /not a folder in Downloads or Documents/);
    assert.match(host.innerHTML, /use that existing folder/);
    assert.match(host.innerHTML, /Do not click Create project/);
    assert.match(host.innerHTML, /Activity 5/);
    assert.match(host.innerHTML, /Activity 4 - Google Drive Backup/);
    assert.doesNotMatch(host.innerHTML, /<input|<textarea|type="file"|C:\\Users\\/);
    activity.blocks[0].text = "Teacher-edited folder instructions.";
    assert.equal(withUnityHubLicence(content), content);
    assert.equal(content.activities[2].blocks[0].text, "Teacher-edited folder instructions.");
});

test("Google Drive Backup migrates once and renders five steps without evidence inputs", () => {
    const previous = withUnityHubLicence(baseContent());
    delete previous.activities[3].unityDriveBackupVersion;
    const before = JSON.stringify(previous);
    const content = withUnityHubLicence(previous);
    assert.equal(JSON.stringify(previous), before, "Migration does not mutate the existing content");
    for (const index of [0, 1, 2, 4]) assert.equal(content.activities[index], previous.activities[index]);
    const activity = content.activities[3];
    assert.equal(activity.title, "Google Drive Backup");
    assert.equal(activity.completionMode, "manual");
    assert.deepEqual(activity.questions, []);
    assert.deepEqual(activity.images, []);
    assert.deepEqual(activity.blocks.map((block) => block.title), [
        "Step 1 - Find Google Drive for desktop", "Step 2 - Sign In",
        "Step 3 - Open Google Drive Preferences", "Step 4 - Connect Your Videos Folder",
        "Step 5 - Check Your Backup Connection"
    ]);
    B.validate(activity);
    const ctx = vm.createContext({ window: { ActivityBlocks: B }, structuredClone });
    for (const file of ["activity-block-view.js", "kit-worksheet-render.js"]) {
        vm.runInContext(fs.readFileSync(path.join(root, "practical-skills", file), "utf8"), ctx);
    }
    const host = { style: { setProperty() {} }, innerHTML: "", querySelectorAll: () => [] };
    ctx.window.KitWorksheetRender.renderWorksheet(host, { ...activity, bannerTitle: activity.title }, { readOnly: true });
    assert.equal((host.innerHTML.match(/class="activity-content-block"/g) || []).length, 5);
    for (const instruction of [
        /Windows Start/, /WHS school Google account, not a personal/,
        /system tray/, /Settings \(gear icon\)/, /Preferences/,
        /Folders from your computer/, /Add folder/, /Sync with Google Drive/,
        /Done and Save/, /not a similarly named folder inside Google Drive/,
        /already configured for syncing/, /do not add it again/,
        /Do not move the Unity project folder into the Google Drive virtual drive/,
        /resolve it before relying on the backup/,
        /Allow synchronisation to finish before changing computers/,
        /Videos\\Unity/, /Activity 5 - Unity Test Project/, /configure another computer/
    ]) assert.match(host.innerHTML, instruction);
    assert.doesNotMatch(host.innerHTML, /<input|<textarea|type="file"/);
    activity.blocks[0].text = "Teacher-edited backup instructions.";
    assert.equal(withUnityHubLicence(content), content);
    assert.equal(content.activities[3].blocks[0].text, "Teacher-edited backup instructions.");
});

test("Unity Test Project replaces legacy evidence with five steps, one folder link and optional return instructions", () => {
    const previous = withUnityHubLicence(baseContent());
    delete previous.activities[4].unityTestProjectVersion;
    previous.activities[4].blocks.find((block) => block.id === "unitytest-project-link").responseKey = "saved-project";
    const content = withUnityHubLicence(previous);
    for (const index of [0, 1, 2, 3]) assert.equal(content.activities[index], previous.activities[index]);
    const activity = content.activities[4];
    assert.equal(activity.title, "Unity Test Project");
    assert.equal(activity.completionMode, "auto");
    assert.deepEqual(activity.questions, []);
    assert.deepEqual(activity.images, []);
    assert.equal(activity.blocks.filter((block) => block.kind === "tasks").length, 5);
    assert.equal(activity.blocks.filter((block) => B.interactive.includes(block.kind)).length, 1);
    const link = activity.blocks.find((block) => block.kind === "studentlink");
    assert.equal(link.id, "unitytest-project-link");
    assert.equal(link.responseKey, "saved-project");
    assert.equal(link.title, "My Unity Test Project");
    assert.equal(link.required, true);
    assert.equal(link.driveFolderOnly, true);
    B.validate(activity);
    const ctx = vm.createContext({ window: { ActivityBlocks: B }, structuredClone });
    for (const file of ["activity-block-view.js", "kit-worksheet-render.js"]) {
        vm.runInContext(fs.readFileSync(path.join(root, "practical-skills", file), "utf8"), ctx);
    }
    const host = { style: { setProperty() {} }, innerHTML: "", querySelectorAll: () => [] };
    ctx.window.KitWorksheetRender.renderWorksheet(host, { ...activity, bannerTitle: activity.title }, { readOnly: true });
    for (const instruction of [
        /Universal 3D \(URP\)/, /required Unity Editor version from Activity 2/,
        /Videos\\Unity\\UnityTest/, /3D Object &gt; Cube/, /Assets\\TestScene.unity/,
        /Assets, Packages and ProjectSettings/, /close Unity Editor/, /finish syncing/,
        /Computers/, /Give your teacher access/, /My Unity Test Project/,
        /Success criteria/, /does not verify the project contents/,
        /requires all activities to be complete/, /Optional reference/,
        /not required for Licence completion/, /extract it first/, /Add project from disk/
    ]) assert.match(host.innerHTML, instruction);
    assert.equal((host.innerHTML.match(/<input/g) || []).length, 1);
    assert.doesNotMatch(host.innerHTML, /<textarea|type="file"|type="checkbox"/);
    for (const value of ["", "http://drive.google.com/drive/folders/id", "https://docs.google.com/document/d/id/edit",
        "https://drive.google.com/file/d/id/view", "https://drive.google.com/drive/folders/",
        "https://drive.google.com.evil.test/drive/folders/id", "https://drive.google.com/drive/my-drive"]) {
        assert.equal(B.grade(activity, { [link.id]: value }).passed, false, value);
    }
    for (const value of ["https://drive.google.com/drive/folders/project-id?usp=sharing",
        "https://drive.google.com/drive/u/0/folders/project_id"]) {
        assert.equal(B.grade(activity, { [link.id]: value }).passed, true, value);
    }
    assert.equal(withUnityHubLicence(content), content);
});

test("Unity setup manual completion saves ticks and directs students to the next activity", async () => {
    const controller = fs.readFileSync(path.join(root, "practical-skills", "kit-worksheet.js"), "utf8");
    const start = controller.indexOf('        activityCompleteBtn.addEventListener("click",');
    const end = controller.indexOf("\n        });", start) + "\n        });".length;
    let click;
    let message;
    let index = 1;
    const state = { progressLoaded: true, completedActivities: {}, responses: {}, kitId: "kit-unity-setup",
        content: withUnityHubLicence(baseContent()) };
    const ctx = vm.createContext({
        state, preview: false, activityCompleteBtn: { addEventListener(_name, fn) { click = fn; } },
        getCurrentActivityIndex: () => index,
        window: { clearTimeout() {}, ActivityBlocks: B, KitWorksheetRender: { visibleLoginSites: () => [] } },
        queueProgressWrite: (fn) => fn(), saveResponses: async () => {}, withAuthHeaders: (headers) => headers,
        loadJson: async (_url, options) => {
            const { completed } = JSON.parse(options.body);
            return { completedActivities: completed ? { [index]: "saved" } : {} };
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
    index = 2;
    await click();
    assert.equal(state.completedActivities[2], "saved");
    assert.match(message, /Activity 4 - Google Drive Backup/);
    await click();
    assert.deepEqual(state.completedActivities, {});
    assert.equal(message, "Activity completion removed.");
    index = 3;
    await click();
    assert.equal(state.completedActivities[3], "saved");
    assert.match(message, /Activity 5 - Unity Test Project/);
    await click();
    assert.deepEqual(state.completedActivities, {});
    assert.equal(message, "Activity completion removed.");
    assert.match(controller, /unityEditor: activity\?\.unityEditor/);
});

test("Unity final Completed button validates the saved link and opens the certificate menu only after all activities", async () => {
    const controller = fs.readFileSync(path.join(root, "practical-skills", "kit-worksheet.js"), "utf8");
    const start = controller.indexOf('        activityCompleteBtn.addEventListener("click",');
    const end = controller.indexOf("\n        });", start) + "\n        });".length;
    let click;
    let message;
    let fail = false;
    let stale = false;
    let checks = 0;
    let completedKits = 0;
    const state = { email: "student@school.nz", progressLoaded: true, blockRevision: 0,
        completedActivities: {}, responses: {}, kitId: "kit-unity-setup", content: withUnityHubLicence(baseContent()) };
    const window = { clearTimeout() {}, location: { href: "" }, ActivityBlocks: B };
    const ctx = vm.createContext({
        state, window, preview: false, activityCompleteBtn: { addEventListener(_name, fn) { click = fn; } },
        getCurrentActivityIndex: () => 4, getSignedInEmail: () => state.email,
        queueProgressWrite: (fn) => fn(),
        completeKit: async (kitId) => { assert.equal(kitId, state.kitId); completedKits++; },
        showStatusMessage: (value) => { message = value; }, updateActivityCompleteBar() {},
        checkBlockAnswers: async (index) => {
            checks++;
            if (fail) throw new Error("Could not save your project link.");
            const grade = B.grade(state.content.activities[index], state.responses[`${index}-blocks`] || {});
            if (grade.passed) state.completedActivities[index] = "saved";
            else delete state.completedActivities[index];
            if (stale) state.blockRevision++;
            return grade;
        }
    });
    vm.runInContext(controller.slice(start, end), ctx);
    await click();
    assert.equal(window.location.href, "", "An empty link cannot finish the kit");
    state.responses["4-blocks"] = { "unitytest-project-link": "https://drive.google.com/file/d/scene/view" };
    await click();
    assert.equal(window.location.href, "", "A file link cannot finish the kit");
    state.responses["4-blocks"] = { "unitytest-project-link": "https://drive.google.com/drive/folders/project-id" };
    await click();
    assert.match(message, /Complete all earlier activities/);
    assert.equal(window.location.href, "");
    for (const index of [0, 1, 2, 3]) state.completedActivities[index] = "saved";
    fail = true;
    await click();
    assert.match(message, /Could not save your project link/);
    assert.equal(window.location.href, "");
    fail = false;
    stale = true;
    await click();
    assert.equal(window.location.href, "", "An outdated check cannot navigate away from new edits");
    assert.equal(completedKits, 0);
    stale = false;
    await click();
    assert.equal(window.location.href, "./kit-worksheet.html?kit=kit-unity-setup");
    assert.equal(completedKits, 1, "The button uses the standard kit completion and certificate endpoint");
    ctx.preview = true;
    window.location.href = "";
    const previousChecks = checks;
    await click();
    assert.equal(checks, previousChecks, "Teacher preview must not save or complete");
    assert.equal(window.location.href, "");

    const nodes = new Map();
    const node = (id) => {
        if (!nodes.has(id)) nodes.set(id, { classList: { toggle() {} }, setAttribute() {}, removeAttribute() {} });
        return nodes.get(id);
    };
    ctx.document = { getElementById: node };
    ctx.window.KitWorksheetRender = { visibleLoginSites: () => [] };
    const barStart = controller.indexOf("    function updateActivityCompleteBar()");
    const barEnd = controller.indexOf("    function blockPath(", barStart);
    vm.runInContext(controller.slice(barStart, barEnd), ctx);
    ctx.preview = false;
    ctx.updateActivityCompleteBar();
    assert.equal(node("worksheet-activity-complete-btn").textContent, "Completed");
    assert.equal(node("worksheet-activity-complete-btn").hidden, false);
    ctx.preview = true;
    ctx.updateActivityCompleteBar();
    assert.equal(node("worksheet-activity-complete-bar").hidden, false);
    assert.equal(node("worksheet-activity-status-pill").textContent, "Not Completed");
    assert.equal(node("worksheet-activity-complete-btn").disabled, true);
    assert.equal(node("worksheet-activity-preview-note").hidden, false);
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
    assert.equal(reopened.activities[2].unityProjectFolderVersion, 1);
    assert.equal(reopened.activities[2].completionMode, "manual");
    assert.match(reopened.activities[2].blocks[2].text, /Videos\\Unity/);
    assert.equal(reopened.activities[3].unityDriveBackupVersion, 1);
    assert.equal(reopened.activities[3].completionMode, "manual");
    assert.match(reopened.activities[3].blocks[3].text, /Sync with Google Drive/);
    assert.equal(reopened.activities[4].unityTestProjectVersion, 1);
    assert.equal(reopened.activities[4].blocks.find((block) => block.id === "unitytest-project-link").driveFolderOnly, true);
    assert.equal(writes.length, 2, "Reopening does not overwrite the teacher configuration");
});

test("licence reads verify OAuth sign-in before the publication gate without enabling OAuth on other routes", async (t) => {
    const app = express();
    const middlewares = [];
    const licencePath = "/api/practical-skills/blocks/kit-unity-setup/0/licences/unity-school-licence";
    const ctx = vm.createContext({
        app: { use: (fn) => middlewares.push(fn) }, effectiveAuthMode: "strict",
        extractBearerToken: (req) => String(req.headers.authorization || "").replace(/^Bearer /, ""),
        verifyGoogleIdTokenAndExtractIdentity: async (token) => token === "eyJheader.payload.signature"
            ? { ok: true, email: "student@school.nz" } : { ok: false, error: "token_verification_failed" },
        verifyGoogleAccessTokenAndExtractIdentity: async (token) => {
            if (token === "network-failure") throw new Error("Identity service unavailable");
            return token === "valid-oauth" ? { ok: true, email: "student@school.nz" }
                : { ok: false, error: "Expired or wrong-audience OAuth token" };
        },
        console: { error() {} }
    });
    const start = source.lastIndexOf("app.use(", source.indexOf("  req.auth_identity = {"));
    const end = source.indexOf('\napp.use(["/api/practical-skills"', start);
    assert.ok(start >= 0 && end > start);
    vm.runInContext(source.slice(start, end), ctx);
    app.use(middlewares[0]);
    app.use((req, res) => res.json({ verified: req.auth_identity.verified,
        source: req.auth_identity.source, email: req.authenticated_email || "", error: req.auth_identity.error }));
    const server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
    const call = async (token, url = licencePath, method = "GET") => (await fetch(
        `http://127.0.0.1:${server.address().port}${url}`, { method, headers: token ? { Authorization: `Bearer ${token}` } : {} })).json();
    let result = await call("valid-oauth");
    assert.equal(result.verified, true);
    assert.equal(result.email, "student@school.nz", "Verified identity is available before publication/preview authorization");
    assert.equal(result.source, "google_access_token");
    assert.equal((await call("eyJheader.payload.signature")).source, "google_id_token");
    for (const token of ["", "expired-oauth", "wrong-audience", "eyJinvalid.payload.signature", "network-failure"]) {
        assert.equal((await call(token)).verified, false);
    }
    assert.equal((await call("valid-oauth", "/api/practical-skills/progress/kit-unity-setup")).verified, false);
    assert.equal((await call("valid-oauth", licencePath, "PUT")).verified, false);
    const reviewPath = "/api/admin/kit-document-review/kit-google-drawings/0";
    assert.equal((await call("valid-oauth", reviewPath, "PUT")).source, "google_access_token", "Teacher Completed ticks accept OAuth sign-in");
    assert.equal((await call("valid-oauth", reviewPath)).verified, true);
    assert.equal((await call("expired-oauth", reviewPath, "PUT")).verified, false);
    assert.equal((await call("valid-oauth", reviewPath, "DELETE")).verified, false);
    assert.equal((await call("valid-oauth", "/api/admin/kit-submissions")).verified, false);
});

test("the reused OAuth verifier rejects expired, wrong-app and non-school identities", async () => {
    let info = { aud: "school-app", expiry_date: Date.now() + 60000 };
    let profile = { email: "student@school.nz", email_verified: true };
    let userinfoCalls = 0;
    const ctx = vm.createContext({
        GOOGLE_ID_TOKEN_AUDIENCES: ["school-app"],
        googleAuthClient: { getTokenInfo: async () => info },
        normalizeEmail: (value) => String(value || "").toLowerCase(),
        isSchoolEmail: (value) => value.endsWith("@school.nz"),
        AbortSignal,
        fetch: async () => { userinfoCalls++; return { ok: true, json: async () => profile }; }
    });
    const start = source.indexOf("async function verifyGoogleAccessTokenAndExtractIdentity(");
    const end = source.indexOf("\nfunction getRequestUserEmail(", start);
    vm.runInContext(source.slice(start, end), ctx);
    assert.equal((await ctx.verifyGoogleAccessTokenAndExtractIdentity("oauth")).email, "student@school.nz");
    info = { ...info, aud: "another-app" };
    assert.equal((await ctx.verifyGoogleAccessTokenAndExtractIdentity("oauth")).ok, false);
    assert.equal(userinfoCalls, 1);
    info = { aud: "school-app", expiry_date: 1 };
    assert.equal((await ctx.verifyGoogleAccessTokenAndExtractIdentity("oauth")).ok, false);
    info.expiry_date = Date.now() + 60000;
    profile = { email: "outsider@example.org", email_verified: true };
    assert.equal((await ctx.verifyGoogleAccessTokenAndExtractIdentity("oauth")).ok, false);
    profile = { email: "student@school.nz", email_verified: false };
    assert.equal((await ctx.verifyGoogleAccessTokenAndExtractIdentity("oauth")).ok, false);
});

test("licence requests send the active OAuth token only to the verified read endpoint, not general worksheet APIs", () => {
    const controller = fs.readFileSync(path.join(root, "practical-skills", "kit-worksheet.js"), "utf8");
    const start = controller.indexOf("    function withAuthHeaders(");
    const end = controller.indexOf("\n    function showStatusMessage(", start);
    for (const active of ["valid-oauth", "eyJheader.payload.signature", ""]) {
        const ctx = vm.createContext({
            state: { email: "student@school.nz" },
            window: { getActiveHubBearerToken: () => active },
            getStoredAuthRaw: () => JSON.stringify({ idToken: "expired-token", accessToken: "valid-oauth", expiresAt: Date.now() + 60000 })
        });
        vm.runInContext(controller.slice(start, end), ctx);
        assert.equal(ctx.withAuthHeaders({}, true).Authorization, active ? `Bearer ${active}` : undefined);
        assert.equal(ctx.withAuthHeaders().Authorization, active.startsWith("eyJ") ? `Bearer ${active}` : undefined);
    }
    assert.match(controller, /onSchoolLicence:[\s\S]*?headers: withAuthHeaders\(\{\}, true\), cache: "no-store"/);
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
    assert.deepEqual(await first.json(), { activationMethod: "instructions", licenceValue: "", unityEditor: original.activities[1].unityEditor });
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
    const editorConfig = { version: "6000.5.2f1", modules: "Windows Build Support\nWeb Build Support", notes: "Use the school network." };
    for (const invalid of [{ version: "" }, { version: 6000.5 }, { version: "6000.5", modules: [] }]) {
        assert.equal((await save({ activationMethod: "serial", licenceValue: mockLicence, unityEditor: invalid })).status, 400);
    }
    assert.equal((await save({ activationMethod: "serial", licenceValue: mockLicence, unityEditor: editorConfig })).status, 200);
    assert.deepEqual((await (await fetch(url, { headers })).json()).unityEditor, editorConfig);
    assert.equal(content.activities[0].blocks[2].licenceValue, mockLicence);
    assert.deepEqual(content.activities[1].blocks, original.activities[1].blocks);
    assert.deepEqual(content.activities.slice(2), original.activities.slice(2));
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
    assert.match(nav, /hubLicenceSetupLink\.hidden = !\(canAdmin && inTeacherMode\)/);
});

test("Licence Kit Setup uses the shared active token and never presents opaque or expired tokens as ID tokens", async () => {
    const source = fs.readFileSync(path.join(root, "practical-skills", "licence-kit-setup.js"), "utf8");
    const start = source.indexOf("    async function request(");
    const end = source.indexOf("\n    function path(", start);
    const jwt = "eyJheader.payload.signature";
    for (const scenario of [
        { stored: { accessToken: "opaque-drive-token", expiresAt: Date.now() + 60000 } },
        { stored: { idToken: "opaque-legacy-token", expiresAt: Date.now() + 60000 } },
        { stored: { idToken: jwt, expiresAt: 1 } },
        { stored: { idToken: jwt, expiresAt: Date.now() + 60000 }, expected: `Bearer ${jwt}` },
        { stored: { idToken: "stale-token" }, active: jwt, expected: `Bearer ${jwt}` },
        { stored: { idToken: jwt, expiresAt: Date.now() + 60000 }, active: "opaque-drive-token" }
    ]) {
        let sentHeaders;
        const ctx = vm.createContext({
            window: scenario.active === undefined ? {} : { getActiveHubBearerToken: () => scenario.active },
            localStorage: { getItem: () => JSON.stringify({ ...scenario.stored, profile: { email: "teacher@school.nz" } }) },
            sessionStorage: { getItem: () => null },
            fetch: async (_url, options) => {
                sentHeaders = options.headers;
                return { ok: true, json: async () => ({}) };
            }
        });
        vm.runInContext(source.slice(start, end), ctx);
        await ctx.request("/api/admin/practical-skills/kits");
        assert.equal(sentHeaders.Authorization, scenario.expected);
        assert.equal(sentHeaders["x-user-email"], "teacher@school.nz");
    }
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
    let stored = { activationMethod: "instructions", licenceValue: "", unityEditor: { version: "6000.5", modules: "", notes: "" } };
    let fail = false;
    const ctx = vm.createContext({
        document: { getElementById: get, createElement: () => ({}) },
        window: { addEventListener(name, fn) { events[name] = fn; } },
        localStorage: { getItem: () => signedIn ? JSON.stringify({ profile: { email: "teacher@school.nz" }, accessToken: "opaque-drive-token", expiresAt: Date.now() + 60000 }) : null },
        sessionStorage: { getItem: () => null },
        fetch: async (url, options) => {
            assert.equal(options.headers.Authorization, undefined, "Opaque OAuth tokens must not be sent as Google ID tokens");
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
    assert.equal(get("setup-editor-version").value, "6000.5");
    get("setup-method").value = "serial";
    get("setup-value").value = mockLicence;
    get("setup-editor-version").value = "6000.5.2f1";
    get("setup-editor-modules").value = "Web Build Support";
    get("setup-editor-notes").value = "Keep Unity Hub open.";
    await get("setup-form").handlers.submit({ preventDefault() {} });
    assert.equal(stored.licenceValue, mockLicence);
    assert.equal(stored.unityEditor.version, "6000.5.2f1");
    assert.equal(stored.unityEditor.modules, "Web Build Support");
    assert.equal(stored.unityEditor.notes, "Keep Unity Hub open.");
    assert.match(get("setup-status").textContent, /Unity settings saved/);
    events["hub-auth-state-changed"]();
    await tick();
    assert.equal(get("setup-editor-version").value, "6000.5.2f1");
    assert.equal(get("setup-value").value, mockLicence);
    fail = true;
    await get("setup-form").handlers.submit({ preventDefault() {} });
    assert.match(get("setup-status").textContent, /Save failed/);
    assert.equal(get("setup-fields").disabled, false);
    signedIn = false;
    events["hub-auth-state-changed"]();
    await tick();
    assert.equal(get("setup-form").hidden, true);
    assert.equal(get("setup-value").value, "");
    assert.equal(get("setup-editor-version").value, "");
    assert.equal(get("setup-editor-modules").value, "");
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
    row.responses["4-blocks"] = { "unitytest-project-link": "https://drive.google.com/file/d/scene-file/view" };
    assert.equal((await sync()).completed, false, "A scene or file link cannot complete the final activity");
    row.responses["4-blocks"] = { "unitytest-project-link": "https://drive.google.com/drive/folders/test-project" };
    delete row.completed_activities[3];
    assert.equal((await sync()).completed, false, "A valid folder link cannot bypass another incomplete activity");
    row.completed_activities[3] = "saved";
    const completed = await sync();
    assert.equal(completed.completed, true);
    assert.ok(certificate.buildKitCertificate(content, completed, "Student"));
});
