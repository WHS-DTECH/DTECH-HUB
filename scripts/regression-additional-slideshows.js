"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const slideshows = require("../submission-slideshows");
const { submissionSummary } = require("../submission-package");

const source = fs.readFileSync(path.join(__dirname, "..", "task-list.js"), "utf8");
const start = source.indexOf("function additionalSlideshowTemplateId(");
const end = source.indexOf("async function handleSlideshowPdfExport(", start);
assert.ok(start >= 0 && end > start);
const id = "550e8400-e29b-41d4-a716-446655440000";
const sourceTemplateId = slideshows.additionalSlideshowTemplateId(id);
const pdfTemplateId = slideshows.additionalSlideshowPdfTemplateId(id);
const sourceUrl = "https://docs.google.com/presentation/d/presentation-123/edit";
const pdfUrl = "https://drive.google.com/file/d/export-123/view";

async function main() {
    assert.equal(slideshows.additionalSlideshowId(sourceTemplateId), id);
    assert.equal(slideshows.additionalSlideshowId(pdfTemplateId, slideshows.PDF_PREFIX), id);
    assert.equal(slideshows.additionalSlideshowTemplateId("not-a-uuid"), "");
    assert.equal(slideshows.additionalSlideshowCopies([
        { templateId: sourceTemplateId, fileUrl: sourceUrl },
        { templateId: pdfTemplateId, fileUrl: pdfUrl }
    ])[0].pdf.fileUrl, pdfUrl);
    assert.equal(slideshows.additionalSlideshowCopies([
        { templateId: pdfTemplateId, fileUrl: pdfUrl }
    ]).length, 0, "A PDF record alone is not a linked source slideshow");
    assert.equal(submissionSummary([{ templateId: sourceTemplateId, fileUrl: sourceUrl }]).length, 4,
        "A linked slideshow without a saved PDF does not add a package entry");
    assert.equal(submissionSummary([
        { templateId: sourceTemplateId, fileUrl: sourceUrl },
        { templateId: pdfTemplateId, fileUrl: pdfUrl }
    ]).length, 5, "A saved Stage 6 PDF adds an entry after the four required files");
    assert.equal(submissionSummary([
        { templateId: pdfTemplateId, fileUrl: pdfUrl }
    ]).length, 5, "An orphaned saved PDF is surfaced instead of silently skipped");

    const host = { children: [], replaceChildren() { this.children = []; }, append(card) { this.children.push(card); } };
    const add = { disabled: false };
    const input = { value: sourceUrl };
    const elements = new Map([
        ["#task-list-additional-slideshow-list", host],
        ["#task-list-additional-slideshow-add", add],
        [`[data-extra-slideshow-url="${id}"]`, input]
    ]);
    const calls = [];
    const state = {
        allItems: [{ id: "49" }], selectedId: "49", templateCopies: [],
        additionalSlideshowTaskId: "49",
        additionalSlideshows: [{ id, sourceUrl, sourceName: "", synced: false, pdf: null, message: "" }],
        additionalSlideshowBusy: {}
    };
    const context = vm.createContext({
        taskListState: state,
        document: { querySelector: (selector) => elements.get(selector) || null, createElement: () => ({ innerHTML: "", className: "" }) },
        window: {}, isSeniorDigitalMediaTask: () => true,
        renderAdditionalSlideshows: () => {},
        escapeTaskListHtml: (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])),
        requestHubDriveAccessToken: async () => ({ access_token: "student-token" }),
        buildTaskListHeaders: (headers) => headers,
        fetch: async (_url, options) => {
            const body = JSON.parse(options.body);
            calls.push(body);
            const saved = body.action === "sync"
                ? { templateId: sourceTemplateId, fileUrl: sourceUrl, fileName: "Extra slides" }
                : { templateId: pdfTemplateId, fileUrl: pdfUrl, pdfExport: { sourcePresentationId: "presentation-123" } };
            return { ok: true, json: async () => ({ saved }) };
        }
    });
    vm.runInContext(source.slice(start, end), context);
    context.loadAdditionalSlideshowCards([]);
    assert.equal(state.additionalSlideshows.length, 1, "Background refresh preserves an unsynced card for the current task");
    state.selectedId = "50";
    context.loadAdditionalSlideshowCards([]);
    assert.equal(state.additionalSlideshows.length, 0, "Unsynced cards do not leak across tasks");
    state.selectedId = "49";
    state.additionalSlideshowTaskId = "49";
    state.additionalSlideshows = [{ id, sourceUrl, sourceName: "", synced: false, pdf: null, message: "" }];
    context.renderAdditionalSlideshows();
    assert.equal(host.children.length, 1);
    assert.match(host.children[0].innerHTML, /Sync slideshow/);
    assert.match(host.children[0].innerHTML, /Remove this card/);
    await context.handleAdditionalSlideshowAction("sync", id);
    assert.equal(calls[0].action, "sync");
    assert.equal(calls[0].presentationUrl, sourceUrl);
    assert.equal(state.additionalSlideshows[0].synced, true);
    assert.match(state.additionalSlideshows[0].message, /not been moved or changed/);
    await context.handleAdditionalSlideshowAction("pdf", id);
    assert.equal(calls[1].action, "pdf");
    assert.equal(state.additionalSlideshows[0].pdf.fileUrl, pdfUrl);
    assert.match(host.children[0].innerHTML, /Open saved PDF/);
    console.log("Additional slideshow regressions passed.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
