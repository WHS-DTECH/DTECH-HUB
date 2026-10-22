"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createHash } = require("node:crypto");
const { PDFParse } = require("pdf-parse");
const report = require("../trello-report");
const { outcomeRepositories, createOutcomeArchiveStore, createGithubZipSizeReader } = require("../github-outcome");

const email = "student@westlandhigh.school.nz";
const board = { id: "board12345678", name: "VP-TaskList - DTECH26", url: "https://trello.com/b/abcdefgh" };
const lists = [{ id: "todo", name: "To Do", pos: 1 }, { id: "done", name: "Done", pos: 2 }];
const cards = [{ id: "card12345678", idList: "todo", name: "Survey client using Google Form", desc: "Folder organisation; Shared permissions; Version history; File naming conventions", url: "https://trello.com/c/ijklmnop", due: null, pos: 1 }];
const evidence = [{ standard: "project-management", steps: [{ text: `TRELLO_CARD_URL|${board.url}/my-board` }] }];

async function testPdfAndStore() {
  assert.equal(report.parseReportTrelloUrl("https://evil.test/b/abcdefgh"), null);
  assert.equal(report.parseReportTrelloUrl("https://trello.com.evil.test/b/abcdefgh"), null);
  assert.equal(report.trelloReportSources([...evidence, ...evidence]).length, 1);
  const boards = await report.resolveReportBoards([{ type: "c", id: "ijklmnop" }, { type: "b", id: board.id }], "student-token", async (url, options) => {
    assert.equal(options.token, "student-token");
    return url.includes("/cards/") ? { idBoard: board.id } : board;
  });
  assert.equal(boards.length, 1, "Card and board links resolve to one board");
  const options = { board, lists, cards, email, activityId: "49", generatedAt: "2026-10-22T00:00:00Z" };
  const buffer = await report.createTrelloReportPdf(options);
  const parser = new PDFParse({ data: buffer, verbosity: 0 });
  try {
    const pdf = await parser.getText();
    assert.equal(pdf.total, 2, "A short report has a cover and card details, not extra footer-only pages");
    for (const text of [board.name, "TRELLO BOARD REPORT", email, "Survey client using Google Form", "Folder organisation", "List: To Do", "Due: Not set", "Page 2 of 2"]) assert.ok(pdf.text.includes(text), text);
    assert.ok(!pdf.text.includes("1970"));
  } finally { await parser.destroy(); }
  const longPdf = await report.createTrelloReportPdf({ ...options, cards: [{ ...cards[0], desc: `${"Detailed project evidence. ".repeat(900)} END_OF_DESCRIPTION`, closed: true, due: "2026-11-01T00:00:00Z" }] });
  const longParser = new PDFParse({ data: longPdf, verbosity: 0 });
  try {
    const pdf = await longParser.getText();
    assert.ok(pdf.total > 2);
    assert.ok(pdf.text.includes("END_OF_DESCRIPTION"), "Long descriptions remain complete across page breaks");
    assert.ok(pdf.text.includes("Archived card"));
    assert.ok(pdf.text.includes(`Page ${pdf.total} of ${pdf.total}`));
  } finally { await longParser.destroy(); }
  assert.throws(() => report.createTrelloReportPdf({ ...options, cards: Array(501).fill(cards[0]) }), /500 cards/);
  assert.throws(() => report.createTrelloReportPdf({ ...options, cards: [{ ...cards[0], idList: "missing" }] }), /board changed/);
  let now = 100;
  const store = report.createTrelloReportStore({ now: () => now, ttlMs: 10, maxCacheBytes: buffer.length });
  const first = store.save({ ...options, buffer });
  assert.deepEqual(store.read(first.snapshotId, email, "49").buffer, buffer);
  assert.throws(() => store.read(first.snapshotId, "other@westlandhigh.school.nz", "49"), /expired/);
  const second = store.save({ ...options, buffer });
  assert.throws(() => store.read(first.snapshotId, email, "49"), /expired/);
  now += 11;
  assert.throws(() => store.read(second.snapshotId, email, "49"), /expired/);
}

async function testEndpoints() {
  const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  const handlers = new Map();
  let allocation = { standard_1: "91907", standard_2: "91893", evidence_steps: evidence, template_copies: [] };
  let connected = true;
  let ownerEmail = email;
  let existingFile = null;
  const uploads = [];
  const records = [];
  const context = vm.createContext({
    ...report, outcomeRepositories, createOutcomeArchiveStore, createGithubZipSizeReader, createHash,
    GITHUB_TOKEN: "configured", SCHOOL_EMAIL_DOMAIN: "westlandhigh.school.nz", hasDatabase: true,
    normalizeEmail: (value) => String(value || "").trim().toLowerCase(), getRequestUserEmail: (req) => req.email,
    getStudentProgrammeFolder: async () => "SeniorDTECH", normalizeEvidenceStepsPayload: (value) => value,
    pool: { query: async () => ({ rows: allocation ? [allocation] : [] }) },
    app: { get: (url, handler) => handlers.set(`GET ${url}`, handler), post: (url, handler) => handlers.set(`POST ${url}`, handler) },
    getStoredTrelloConnection: async () => connected ? { trello_token: "private-trello-token" } : null,
    trelloApiRequest: async (url, options) => {
      assert.equal(options.token, "private-trello-token");
      if (url.endsWith("/lists")) return lists;
      if (url.endsWith("/cards")) return cards;
      return board;
    },
    githubApiRequest() {}, withResearchReportLock: async (_key, work) => work(),
    verifyDriveTokenForStudent: async (token, student) => { assert.equal(token, "student-drive-token"); assert.equal(student, email); },
    resolveStudentDriveSetupState: async () => ({ processAssessmentFolderId: "folder" }),
    driveApiRequest: async (url) => url.endsWith("/folder")
      ? { id: "folder", name: "Process Assessment", mimeType: "application/vnd.google-apps.folder", owners: [{ emailAddress: ownerEmail }], parents: ["senior"] }
      : url.endsWith("/existing-pdf") ? { mimeType: "application/pdf", size: uploads[0].buffer.length, md5Checksum: createHash("md5").update(uploads[0].buffer).digest("hex") }
        : { id: "senior", name: "SeniorDTECH" },
    driveFindFileByNameInFolder: async () => existingFile,
    driveUploadBinaryFile: async (options) => { uploads.push(options); return { id: "uploaded-pdf" }; },
    buildDriveFolderUrlFromId: (id) => `https://drive.google.com/drive/folders/${id}`,
    recordTemplateCopyInDb: async (_activityId, _email, entry) => records.push(entry)
  });
  const start = source.indexOf("const trelloReportStore = ");
  const end = source.indexOf("// Public-repo-only analysis:", start);
  vm.runInContext(source.slice(start, end), context);
  const request = async (method, body = {}, identity = email) => {
    const res = { statusCode: 200, headers: {}, set(key, value) { this.headers[key] = value; return this; }, status(code) { this.statusCode = code; return this; },
      json(value) { this.body = value; return this; }, type(value) { this.contentType = value; return this; }, send(value) { this.body = value; return this; } };
    await handlers.get(`${method} /api/activities/:id/trello-report`)({ email: identity, params: { id: "49" }, body }, res);
    return res;
  };
  assert.equal((await request("GET", {}, "")).statusCode, 401);
  const loaded = await request("GET");
  assert.equal(loaded.body.boards.length, 1);
  assert.ok(!JSON.stringify(loaded.body).includes("private-trello-token"));
  assert.equal((await request("POST", { action: "prepare", boardId: "unlinked" })).statusCode, 400);
  connected = false;
  assert.equal((await request("GET")).body.connected, false);
  assert.equal((await request("POST", { action: "prepare", boardId: board.id })).statusCode, 409);
  connected = true;
  const prepared = await request("POST", { action: "prepare", boardId: board.id });
  assert.equal(prepared.statusCode, 200);
  const snapshotId = prepared.body.snapshot.snapshotId;
  const download = await request("POST", { action: "download", snapshotId });
  assert.equal(download.contentType, "application/pdf");
  assert.equal(download.body.subarray(0, 4).toString(), "%PDF");
  ownerEmail = "teacher@westlandhigh.school.nz";
  assert.equal((await request("POST", { action: "save", snapshotId, driveAccessToken: "student-drive-token" })).statusCode, 409);
  assert.equal(uploads.length, 0);
  ownerEmail = email;
  const saved = await request("POST", { action: "save", snapshotId, driveAccessToken: "student-drive-token" });
  assert.equal(saved.statusCode, 200);
  assert.deepEqual(uploads[0].buffer, download.body, "The downloaded and uploaded PDF bytes match exactly");
  assert.equal(uploads[0].existingFileId, undefined);
  assert.equal(records[0].trelloReport.boardId, board.id);
  existingFile = { id: "existing-pdf" };
  assert.equal((await request("POST", { action: "save", snapshotId, driveAccessToken: "student-drive-token" })).body.reused, true);
  assert.equal(uploads.length, 1);
  allocation.template_copies = [records[0]];
  assert.equal((await request("GET")).body.saved.trelloReport.boardName, board.name);
  allocation.evidence_steps = [];
  assert.equal((await request("POST", { action: "download", snapshotId })).statusCode, 409);
  allocation = null;
  assert.equal((await request("GET")).statusCode, 404);
}

async function testFrontend() {
  const source = fs.readFileSync(path.join(__dirname, "..", "task-list.js"), "utf8");
  const elements = new Map();
  const makeElement = () => ({ hidden: false, disabled: false, value: "", textContent: "", children: [],
    replaceChildren() { this.children = []; }, append(child) { this.children.push(child); }, click() { this.clicked = true; }, remove() {} });
  const document = {
    querySelector: (selector) => { if (!elements.has(selector)) elements.set(selector, makeElement()); return elements.get(selector); },
    createElement: makeElement, body: makeElement()
  };
  const snapshot = { snapshotId: "pdf-preview", boardId: board.id, fileName: "trello-report.pdf", expiresAt: Date.now() + 900000 };
  const saved = { fileUrl: "https://drive.google.com/file/d/trello-pdf/view", trelloReport: { boardName: board.name, generatedAt: "2026-10-22T00:00:00Z" } };
  let connected = true;
  let boards = [board];
  let failSave = false;
  const actions = [];
  const taskListState = { selectedId: "49", allItems: [{ id: "49" }], trelloReportBusy: false };
  const context = vm.createContext({
    taskListState, document, isSeniorDigitalMediaTask: () => true, buildTaskListHeaders: (headers) => headers,
    loadJson: async (_url, options = {}) => {
      const body = options.body ? JSON.parse(options.body) : {};
      if (body.action) actions.push(body.action);
      if (body.action === "prepare") return { snapshot };
      if (body.action === "save") {
        assert.equal(body.snapshotId, snapshot.snapshotId);
        if (failSave) throw new Error("Drive upload unavailable");
        return { saved };
      }
      return { boards, connected, saved };
    },
    fetch: async (_url, options) => { actions.push("download"); assert.equal(JSON.parse(options.body).snapshotId, snapshot.snapshotId); return { ok: true, blob: async () => Buffer.from("%PDF") }; },
    requestHubDriveAccessToken: async () => { actions.push("permission"); return { access_token: "student-drive-token" }; },
    URL: { createObjectURL: () => "blob:report", revokeObjectURL() {} }, setTimeout: (callback) => callback()
  });
  const start = source.indexOf("function renderTrelloReportState(");
  const end = source.indexOf("async function fetchMyEvidence(", start);
  vm.runInContext(source.slice(start, end), context);
  await context.loadTrelloReport({ id: "49" });
  assert.equal(taskListState.trelloReport.boardId, board.id);
  assert.equal(document.querySelector("#task-list-trello-report-open").hidden, false);
  await context.handleTrelloReportAction("generate");
  assert.deepEqual(actions, ["permission", "prepare", "download", "save"]);
  assert.equal(document.body.children[0].download, snapshot.fileName);
  assert.equal(document.body.children[0].clicked, true);
  assert.equal(document.querySelector("#task-list-trello-report-retry").hidden, true);
  failSave = true;
  await context.handleTrelloReportAction("generate");
  assert.match(taskListState.trelloReport.message, /PDF download started, but Google Drive save failed/);
  assert.equal(document.querySelector("#task-list-trello-report-retry").hidden, false);
  actions.length = 0;
  failSave = false;
  await context.handleTrelloReportAction("retry");
  assert.deepEqual(actions, ["permission", "save"], "Retry never regenerates or downloads a different report");
  assert.equal(document.querySelector("#task-list-trello-report-retry").hidden, true);
  taskListState.trelloReport.snapshot.expiresAt = Date.now() - 1;
  context.renderTrelloReportState();
  assert.equal(document.querySelector("#task-list-trello-report-retry").disabled, true);
  boards = [board, { ...board, id: "otherboard123" }];
  await context.loadTrelloReport({ id: "49" });
  assert.equal(taskListState.trelloReport.boardId, "");
  assert.equal(document.querySelector("#task-list-trello-report-generate").disabled, true);
  connected = false;
  boards = [];
  await context.loadTrelloReport({ id: "49" });
  assert.equal(document.querySelector("#task-list-trello-report-connect").hidden, false);
}

async function main() {
  await testPdfAndStore();
  await testEndpoints();
  await testFrontend();
  console.log("Trello report regressions passed.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });