"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const root = path.join(__dirname, "..", "practical-skills");
const adminSource = fs.readFileSync(path.join(root, "admin-kit-activity.js"), "utf8");
const renderSource = fs.readFileSync(path.join(root, "kit-worksheet-render.js"), "utf8");
const tick = () => new Promise((resolve) => setImmediate(resolve));

test("activity brief removes legacy tasks on save and preserves challenge, evidence and content blocks", async () => {
    const nodes = new Map();
    const get = (selector) => {
        if (!nodes.has(selector)) nodes.set(selector, {
            value: "", hidden: false, textContent: "", children: [], handlers: {},
            classList: { toggle() {} }, replaceChildren() { this.children = []; },
            addEventListener(name, handler) { this.handlers[name] = handler; }
        });
        return nodes.get(selector);
    };
    let stored = {
        worksheets: [{ activity: "Rattlesnakes", establishes: "Manage documents" }, { activity: "Other activity" }],
        activities: [{
            title: "Rattlesnakes", questions: [], images: [], assessmentId: "retained",
            blocks: [{ id: "new-tasks", kind: "tasks", title: "Using Windows PC", text: "Open Google Drive.\nDownload your file." }],
            taskBrief: { challenge: "Create your document.", tasks: ["Name it.", "Save it."], keySkill: "I can save.", evidenceRequired: "Upload the file." }
        }, { title: "Other activity", questions: [] }]
    };
    let fail = false;
    const previews = [];
    let previewTimer;
    const context = vm.createContext({
        document: { querySelector: get },
        window: {
            location: { search: "?kit=kit-files&activity=0" },
            ActivityBlocks: require("../practical-skills/activity-blocks"),
            clearTimeout() { previewTimer = null; },
            setTimeout(callback) { previewTimer = callback; return 1; },
            KitWorksheetRender: { renderWorksheet(_host, draft, options) { previews.push({ draft, options }); } }
        },
        URLSearchParams,
        localStorage: { getItem: () => null }, sessionStorage: { getItem: () => null },
        fetch: async (_url, options = {}) => {
            if (options.method === "PUT") {
                if (fail) return { ok: false, json: async () => ({ error: "Could not save. Retry." }) };
                stored = JSON.parse(options.body).content;
            }
            return { ok: true, json: async () => ({ content: structuredClone(stored) }) };
        }
    });
    vm.runInContext(adminSource, context);
    await tick();
    assert.equal(get("#activity-challenge").value, "Create your document.");
    assert.equal(nodes.has("#activity-tasks"), false, "The removed task field is not read or populated");
    assert.equal(previews.at(-1).draft.bannerTitle, "Rattlesnakes");
    assert.equal(previews.at(-1).options.readOnly, true);
    get("#activity-challenge").value = "Create a Rattlesnakes document.";
    get("#activity-key-skill").value = "I can organise and retrieve documents.";
    get("#activity-evidence-required").value = "Upload Rattlesnakes.docx.";
    get("#activity-editor-fields").handlers.input();
    previewTimer();
    assert.equal(previews.at(-1).draft.taskBrief.challenge, "Create a Rattlesnakes document.");
    assert.equal(stored.activities[0].taskBrief.challenge, "Create your document.", "Preview must not save draft content");
    for (const event of ["change", "click"]) {
        get("#activity-editor-fields").handlers[event]();
        assert.equal(typeof previewTimer, "function", "Question/image structural edits refresh the preview");
    }
    get("#activity-save").handlers.click();
    await tick();
    assert.equal(Object.hasOwn(stored.activities[0].taskBrief, "tasks"), false);
    assert.deepEqual(stored.activities[0].blocks, [{ id: "new-tasks", kind: "tasks", title: "Using Windows PC", text: "Open Google Drive.\nDownload your file." }]);
    assert.equal(stored.activities[0].taskBrief.evidenceRequired, "Upload Rattlesnakes.docx.");
    assert.equal(stored.activities[0].assessmentId, "retained");
    assert.equal(stored.activities[1].title, "Other activity");
    vm.runInContext(adminSource, context);
    await tick();
    assert.equal(get("#activity-challenge").value, "Create a Rattlesnakes document.");
    assert.equal(get("#activity-key-skill").value, "I can organise and retrieve documents.");
    fail = true;
    get("#activity-save").handlers.click();
    await tick();
    assert.match(get("#activity-status").textContent, /Could not save/);
    assert.equal(get("#activity-evidence-required").value, "Upload Rattlesnakes.docx.");
});

test("student briefs omit old task instructions while retaining escaped challenge, skill and evidence", () => {
    const editorHtml = fs.readFileSync(path.join(root, "admin-kit-activity.html"), "utf8");
    assert.ok(editorHtml.indexOf('class="activity-preview-frame"') > editorHtml.indexOf('id="activity-save"'), "Preview appears below all editing and save controls");
    assert.doesNotMatch(editorHtml, /id="activity-tasks"|Your tasks \(one step per line\)/);
    assert.match(editorHtml, /Use Task List blocks below/);
    const start = renderSource.indexOf("    function renderTaskBrief(");
    const end = renderSource.indexOf("\n    function renderWorksheet(", start);
    const context = vm.createContext({
        escapeHtml: (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    });
    vm.runInContext(renderSource.slice(start, end), context);
    assert.equal(context.renderTaskBrief(undefined), "");
    assert.equal(context.renderTaskBrief({ tasks: [] }), "");
    assert.equal(context.renderTaskBrief({ tasks: ["Old instructions must not be displayed."] }), "");
    const html = context.renderTaskBrief({
        challenge: "<img src=x onerror=alert(1)>", tasks: ["Name it.", "Save & reopen."],
        keySkill: "I can organise files.", evidenceRequired: "Upload Rattlesnakes.docx."
    });
    assert.match(html, /&lt;img/);
    assert.doesNotMatch(html, /<img/);
    assert.doesNotMatch(html, /Your tasks|worksheet-task-steps|Name it|Save &amp; reopen/);
    assert.match(html, /Key skill/);
    assert.match(html, /Upload Rattlesnakes\.docx/);
    assert.doesNotMatch(context.renderTaskBrief({ challenge: "Try this." }), /Your tasks|Key skill|Evidence required/);
    const studentSource = fs.readFileSync(path.join(root, "kit-worksheet.js"), "utf8");
    assert.match(studentSource, /taskBrief: activity\?\.taskBrief/, "Only the selected activity's brief is displayed");
    assert.ok(renderSource.indexOf("${renderTaskBrief(content?.taskBrief)}") < renderSource.indexOf('${imageInformationLayout ? `<div'));
});

test("server saves delete legacy task values without deleting new Task List blocks", async () => {
    const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
    const start = source.indexOf("async function savePracticalSkillsKitContent(");
    const end = source.indexOf("\nasync function savePracticalSkillsKitResponses(", start);
    const memory = new Map();
    const context = vm.createContext({
        ActivityBlocks: require("../practical-skills/activity-blocks"),
        normalizePracticalSkillsKitContentForStorage: (_kit, content) => structuredClone(content),
        hasDatabase: false, memoryPracticalSkillsKitContent: memory
    });
    vm.runInContext(source.slice(start, end), context);
    const taskBlock = { id: "steps", kind: "tasks", title: "Using Windows PC", text: "Open Drive.\nSave your work." };
    const content = { activities: [{ taskBrief: { challenge: "Create a document.", tasks: ["Obsolete step"], keySkill: "Organise files.", evidenceRequired: "Show your file." }, blocks: [taskBlock] }, null] };
    const saved = await context.savePracticalSkillsKitContent("kit-test", content, "teacher@example.school.nz");
    assert.equal(Object.hasOwn(saved.activities[0].taskBrief, "tasks"), false);
    assert.equal(saved.activities[0].taskBrief.challenge, "Create a document.");
    assert.equal(saved.activities[0].taskBrief.keySkill, "Organise files.");
    assert.equal(saved.activities[0].taskBrief.evidenceRequired, "Show your file.");
    assert.deepEqual(saved.activities[0].blocks, [taskBlock]);
    assert.equal(Object.hasOwn(memory.get("kit-test").activities[0].taskBrief, "tasks"), false);
});
