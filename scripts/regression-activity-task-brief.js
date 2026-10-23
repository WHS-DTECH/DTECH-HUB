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

test("activity task brief loads, saves, reloads and preserves other activity details", async () => {
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
            taskBrief: { challenge: "Create your document.", tasks: ["Name it.", "Save it."], keySkill: "I can save.", evidenceRequired: "Upload the file." }
        }, { title: "Other activity", questions: [] }]
    };
    let fail = false;
    const context = vm.createContext({
        document: { querySelector: get },
        window: { location: { search: "?kit=kit-files&activity=0" } },
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
    assert.equal(get("#activity-tasks").value, "Name it.\nSave it.");
    get("#activity-challenge").value = "Create a Rattlesnakes document.";
    get("#activity-tasks").value = "1. Name the document.\r\n\r\n2) Download as .docx.\nMove it into Documents.";
    get("#activity-key-skill").value = "I can organise and retrieve documents.";
    get("#activity-evidence-required").value = "Upload Rattlesnakes.docx.";
    get("#activity-save").handlers.click();
    await tick();
    assert.deepEqual(stored.activities[0].taskBrief.tasks, ["Name the document.", "Download as .docx.", "Move it into Documents."]);
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

test("student task briefs render numbered tasks safely and omit empty sections", () => {
    const start = renderSource.indexOf("    function renderTaskBrief(");
    const end = renderSource.indexOf("\n    function renderWorksheet(", start);
    const context = vm.createContext({
        escapeHtml: (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    });
    vm.runInContext(renderSource.slice(start, end), context);
    assert.equal(context.renderTaskBrief(undefined), "");
    assert.equal(context.renderTaskBrief({ tasks: [] }), "");
    const html = context.renderTaskBrief({
        challenge: "<img src=x onerror=alert(1)>", tasks: ["Name it.", "Save & reopen."],
        keySkill: "I can organise files.", evidenceRequired: "Upload Rattlesnakes.docx."
    });
    assert.match(html, /&lt;img/);
    assert.doesNotMatch(html, /<img/);
    assert.match(html, /<ol class="worksheet-task-steps"><li>Name it\.<\/li><li>Save &amp; reopen\.<\/li><\/ol>/);
    assert.match(html, /Key skill/);
    assert.match(html, /Upload Rattlesnakes\.docx/);
    assert.doesNotMatch(context.renderTaskBrief({ challenge: "Try this." }), /Your tasks|Key skill|Evidence required/);
    const studentSource = fs.readFileSync(path.join(root, "kit-worksheet.js"), "utf8");
    assert.match(studentSource, /taskBrief: activity\?\.taskBrief/, "Only the selected activity's brief is displayed");
    assert.ok(renderSource.indexOf("${renderTaskBrief(content?.taskBrief)}") < renderSource.indexOf('${imageInformationLayout ? `<div'));
});
