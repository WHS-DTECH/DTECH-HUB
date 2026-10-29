"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const slideshows = require("../submission-slideshows");
const { additionalSlideshowTemplateId } = slideshows;
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
    const no = { templateId: "submission-additional-slideshows-answer", additionalSlideshows: { answer: "no" } };
    const yes = { templateId: "submission-additional-slideshows-answer", additionalSlideshows: { answer: "yes" } };
    const noSummary = submissionSummary([no]);
    assert.equal(noSummary.find((entry) => entry.key === "additional-slideshows-answer").displayStatus, "No");
    assert.equal(noSummary.find((entry) => entry.key === "additional-slideshows-pdf").displayStatus, "Not needed");
    const yesSummary = submissionSummary([yes, { templateId: sourceTemplateId, fileUrl: sourceUrl }]);
    assert.equal(yesSummary.find((entry) => entry.key === `additional-${id}`).displayStatus, "Missing",
        "Yes requires at least one saved slideshow PDF");
    assert.match(submissionSummary([yes, { templateId: pdfTemplateId, fileUrl: pdfUrl }])
        .find((entry) => entry.key === `additional-${id}`).label, /Additional Slideshows PDF/);

    const host = { children: [], replaceChildren() { this.children = []; }, append(card) { this.children.push(card); } };
    const add = { disabled: false };
    const answer = { disabled: false, value: "" };
    const status = { textContent: "" };
    const input = { value: sourceUrl };
    const elements = new Map([
        ["#task-list-additional-slideshow-list", host],
        ["#task-list-additional-slideshow-add", add],
        ["#task-list-additional-slideshow-answer", answer],
        ["#task-list-additional-slideshow-status", status],
        [`[data-extra-slideshow-url="${id}"]`, input]
    ]);
    const calls = [];
    const state = {
        allItems: [{ id: "49" }], selectedId: "49", templateCopies: [],
        additionalSlideshowTaskId: "49", additionalSlideshowAnswer: "yes", additionalSlideshowAnswerBusy: false,
        additionalSlideshows: [{ id, sourceUrl, sourceName: "", synced: false, pdf: null, message: "" }],
        additionalSlideshowBusy: {}
    };
    const context = vm.createContext({
        taskListState: state,
        document: { querySelector: (selector) => elements.get(selector) || null, createElement: () => ({ innerHTML: "", className: "" }) },
        window: {}, isSeniorSubmissionTask: () => true,
        renderAdditionalSlideshows: () => {},
        loadSubmissionStage: async () => {},
        escapeTaskListHtml: (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])),
        requestHubDriveAccessToken: async () => ({ access_token: "student-token" }),
        buildTaskListHeaders: (headers) => headers,
        fetch: async (_url, options) => {
            const body = JSON.parse(options.body);
            calls.push(body);
            if (body.action === "answer") return { ok: true, json: async () => ({
                saved: { templateId: "submission-additional-slideshows-answer", additionalSlideshows: { answer: body.answer } }
            }) };
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
    state.additionalSlideshowAnswer = "";
    state.additionalSlideshows = [{ id, sourceUrl, sourceName: "", synced: false, pdf: null, message: "" }];
    await context.handleAdditionalSlideshowAnswerChange("yes");
    assert.equal(state.additionalSlideshowAnswer, "yes");
    assert.equal(calls[0].action, "answer");
    assert.equal(calls[0].answer, "yes");
    context.renderAdditionalSlideshows();
    assert.equal(host.children.length, 1);
    assert.match(host.children[0].innerHTML, /Sync slideshow/);
    assert.match(host.children[0].innerHTML, /Remove this card/);
    await context.handleAdditionalSlideshowAction("sync", id);
    assert.equal(calls[1].action, "sync");
    assert.equal(calls[1].presentationUrl, sourceUrl);
    assert.equal(state.additionalSlideshows[0].synced, true);
    assert.match(state.additionalSlideshows[0].message, /not been moved or changed/);
    await context.handleAdditionalSlideshowAction("pdf", id);
    assert.equal(calls[2].action, "pdf");
    assert.equal(state.additionalSlideshows[0].pdf.fileUrl, pdfUrl);
    assert.match(host.children[0].innerHTML, /Open saved PDF/);

    await testAnswerEndpoint(id);
    console.log("Additional slideshow regressions passed.");
}

async function testAnswerEndpoint(id) {
    const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
    const start = server.indexOf('app.post("/api/activities/:id/submission-slideshows"');
    const end = server.indexOf('app.get("/api/activities/:id/github-zip-size"', start);
    assert.ok(start >= 0 && end > start);
    const copies = [];
    const handlers = new Map();
    const assessment = { email: "student@westlandhigh.school.nz", activityId: "49", copies };
    const context = vm.createContext({
        ...slideshows,
        app: { post: (path, handler) => handlers.set(path, handler) },
        loadFinalOutcomeContext: async () => assessment,
        verifyDriveTokenForStudent: async (token, email) => {
            assert.equal(token, "student-token");
            assert.equal(email, assessment.email);
        },
        withFinalOutcomeLock: async (_key, callback) => callback(),
        recordTemplateCopyInDb: async (_activityId, _email, saved) => {
            assessment.copies = assessment.copies.filter((entry) => entry.templateId !== saved.templateId).concat(saved);
        },
        documentationPresentationId: (url) => String(url || "").match(/\/presentation\/d\/([^/]+)/)?.[1] || ""
    });
    vm.runInContext(server.slice(start, end), context);
    const request = async (body) => {
        const response = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            set() { return this; },
            json(value) { this.body = value; return this; }
        };
        await handlers.get("/api/activities/:id/submission-slideshows")({
            body, params: { id: "49" }
        }, response);
        return response;
    };
    const saved = await request({ action: "answer", answer: "yes", driveAccessToken: "student-token" });
    assert.equal(saved.statusCode, 200);
    assert.equal(assessment.copies[0].additionalSlideshows.answer, "yes");
    assessment.copies.push({
        templateId: additionalSlideshowTemplateId(id),
        fileUrl: sourceUrl
    });
    const rejected = await request({ action: "answer", answer: "no", driveAccessToken: "student-token" });
    assert.equal(rejected.statusCode, 409);
    assert.match(rejected.body.error, /Choose Yes/);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
