"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { randomUUID } = require("node:crypto");
const { buildDocumentationMergePlan, documentationPresentationId } = require("../documentation-deck");
const { outcomeRepositories } = require("../github-outcome");

const slideUrl = (id) => `https://docs.google.com/presentation/d/${id}/edit`;
const topics = [
  { templateId: "target-audience", label: "Target audience" },
  { templateId: "development-steps", label: "Development" },
  { templateId: "testing-functions", label: "Testing" },
  { templateId: "target-audience", label: "Duplicate topic" },
  { templateId: "relevant-digimed-conventions", label: "Conventions" },
  { templateId: "final-client-presentation", label: "Client presentation" },
  { templateId: "unrelated", label: "Extra deck" }
];
const files = [
  { id: "testing", templateId: "testing-functions", name: "Testing Functions" },
  { id: "shared", name: "Audience and development" },
  { id: "master", templateId: "relevant-digimed-conventions", name: "Submission Documentation" },
  { id: "client", templateId: "target-audience", name: "Final Client Presentation - Web" },
  { id: "extra", templateId: "unrelated", name: "Extra deck" }
];
const copies = [
  { templateId: "target-audience", fileUrl: slideUrl("shared") },
  { templateId: "development-steps", fileUrl: slideUrl("shared") },
  { templateId: "submission-documentation-deck", fileUrl: slideUrl("master") },
  { templateId: "final-client-presentation", fileUrl: slideUrl("client") }
];
const plan = buildDocumentationMergePlan({ topics, files, copies });
assert.deepEqual(plan.sources.map((source) => source.presentationId), ["shared", "testing"],
  "Source decks follow Task List order, not folder order, with each deck included once");
assert.deepEqual(plan.missingTopics, ["Conventions"], "Missing topics are flagged without blank slides");
assert.deepEqual(buildDocumentationMergePlan({ topics, files: [], copies }).sources, [],
  "Saved links outside the student's source folder are not merged");
assert.equal(documentationPresentationId(slideUrl("example")), "example");
assert.equal(documentationPresentationId("https://docs.google.com.evil.test/presentation/d/example/edit"), "");
assert.equal(documentationPresentationId("http://docs.google.com/presentation/d/example/edit"), "");

const root = path.join(__dirname, "..");
const client = fs.readFileSync(path.join(root, "task-list.js"), "utf8");
const orderingStart = client.indexOf("function buildDocumentationTopicOrder(");
const orderingEnd = client.indexOf("\nfunction renderDocumentationDeckState", orderingStart);
assert.ok(orderingStart >= 0 && orderingEnd > orderingStart);
const orderingContext = vm.createContext({ URL });
vm.runInContext(client.slice(orderingStart, orderingEnd), orderingContext);
const uiOrder = orderingContext.buildDocumentationTopicOrder([
  { href: "/ProjectPages/custom-activity.html?templateId=target-audience", label: "Audience" },
  { href: "/ProjectPages/custom-activity.html?templateId=code-validation", label: "Integrity" },
  { href: "/ProjectPages/custom-activity.html?templateId=target-audience", label: "Audience again" },
  { href: slideUrl("conventions"), label: "Conventions" }
], "http://localhost:4173", [{ templateId: "relevant-digimed-conventions", fileUrl: slideUrl("conventions") }]);
assert.deepEqual(JSON.parse(JSON.stringify(uiOrder.map((topic) => topic.templateId))), [
  "target-audience", "testing-functions-markup-validation", "relevant-digimed-conventions"
], "The UI derives ordering from displayed evidence links, including direct Google links");

const studentEmail = "student@westlandhigh.school.nz";
const sourceSlides = new Map([
  ["audience", [{ id: "audience-1" }, { id: "audience-2" }]],
  ["testing", [{ id: "testing-1" }]],
  ["extra-evidence", [{ id: "extra-1" }]]
]);
const driveFiles = new Map();
const properties = new Map();
const iterator = (values) => {
  let position = 0;
  return { hasNext: () => position < values.length, next: () => values[position++] };
};
const owner = { getEmail: () => studentEmail };
const senior = { getId: () => "senior", getName: () => "SeniorDTECH", getParents: () => iterator([]) };
const folder = { getId: () => "folder", getName: () => "Process Assessment", getOwner: () => owner, getParents: () => iterator([senior]) };
const makeFile = (id, name) => {
  let description = "";
  return {
    getId: () => id, getName: () => name, isTrashed: () => false,
    getOwner: () => owner, getParents: () => iterator([folder]),
    getDescription: () => description, setDescription: (value) => { description = value; }, moveTo() {}
  };
};
sourceSlides.forEach((_slides, id) => driveFiles.set(id, makeFile(id, id)));
const wrapSource = (source) => ({ getObjectId: () => source.id });
let targetSlides = [];
let createdDecks = 0;
let imports = 0;
let failNextImport = true;
const target = {
  getId: () => "merged", getUrl: () => slideUrl("merged"),
  getSlides: () => targetSlides,
  getSlideById: (id) => targetSlides.find((slide) => slide.getObjectId() === id),
  saveAndClose() {},
  insertSlide: (index, source, mode) => {
    assert.equal(mode, "LINKED", "Every imported slide has a native source link");
    if (failNextImport) {
      failNextImport = false;
      throw new Error("Simulated interrupted first import");
    }
    imports += 1;
    const sourceId = Array.from(sourceSlides).find(([, slides]) => slides.some((slide) => slide.id === source.getObjectId()))[0];
    const inserted = {
      getObjectId: () => `linked-${source.getObjectId()}`,
      getSlideLinkingMode: () => "LINKED", getSourcePresentationId: () => sourceId,
      getSourceSlideObjectId: () => source.getObjectId()
    };
    targetSlides.splice(index, 0, inserted);
    return inserted;
  }
};
let lockReleased = 0;
const scriptContext = vm.createContext({
  Session: { getActiveUser: () => owner },
  LockService: { getUserLock: () => ({ waitLock() {}, releaseLock() { lockReleased += 1; } }) },
  PropertiesService: { getUserProperties: () => ({ getProperty: (key) => properties.get(key), setProperty: (key, value) => properties.set(key, value) }) },
  DriveApp: { getFolderById: () => folder, getFileById: (id) => {
    assert.ok(driveFiles.has(id), `Expected Drive file ${id}`); return driveFiles.get(id);
  } },
  SlidesApp: {
    SlideLinkingMode: { LINKED: "LINKED" },
    create: () => {
      createdDecks += 1;
      driveFiles.set("merged", makeFile("merged", "Submission Documentation"));
      targetSlides = [{ getObjectId: () => "blank", getSlideLinkingMode: () => "NOT_LINKED", remove: () => { targetSlides = targetSlides.filter((slide) => slide.getObjectId() !== "blank"); } }];
      return target;
    },
    openById: (id) => id === "merged" ? target : { getSlides: () => sourceSlides.get(id).map(wrapSource) }
  }
});
vm.runInContext(fs.readFileSync(path.join(root, "apps-script", "DocumentationMerge.js"), "utf8"), scriptContext);
const request = { email: studentEmail, activityId: "49", folderId: "folder", sources: [
  { presentationId: "audience" }, { presentationId: "testing" }, { presentationId: "audience" }
] };
assert.throws(() => scriptContext.mergeDocumentationDeck(request), /interrupted first import/);
const firstMerge = scriptContext.mergeDocumentationDeck(request);
assert.equal(firstMerge.addedSlides, 3);
assert.equal(firstMerge.slideCount, 3);
assert.equal(firstMerge.partial, false);
assert.equal(createdDecks, 1, "Retry recovers the same master and removes its persisted starter slide");
assert.equal(scriptContext.mergeDocumentationDeck(request).addedSlides, 0, "Repeated merges do not duplicate linked slides");
sourceSlides.get("audience").push({ id: "audience-3" });
const additions = scriptContext.mergeDocumentationDeck({ ...request, sources: [
  { presentationId: "audience" }, { presentationId: "extra-evidence" }, { presentationId: "testing" }
] });
assert.equal(additions.addedSlides, 2);
assert.deepEqual(targetSlides.map((slide) => slide.getSourceSlideObjectId()), [
  "audience-1", "audience-2", "audience-3", "extra-1", "testing-1"
], "Missing slides are inserted in source and Task List order, not appended after later topics");
assert.equal(imports, 5);
driveFiles.set("manual", makeFile("manual", "My existing documentation"));
assert.throws(() => scriptContext.mergeDocumentationDeck({ ...request, destinationId: "manual" }), /not this assessment's generated deck/,
  "Manual decks cannot be overwritten by the linked merger");
assert.equal(imports, 5);
assert.equal(lockReleased, 5, "Locks are released on success and errors");
assert.throws(() => scriptContext.mergeDocumentationDeck({ ...request, email: "other@westlandhigh.school.nz" }), /own Westland/);

async function testDocumentationEndpoints() {
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const start = server.indexOf("async function loadDocumentationCopies(");
  const end = server.indexOf('\napp.post("/api/student/drive-setup/list-process-assessment-slides"', start);
  assert.ok(start >= 0 && end > start);
  const handlers = new Map();
  const driveCalls = [];
  let mergeRequestBody = null;
  let programme = "SeniorDTECH";
  const endpointContext = vm.createContext({
    hasDatabase: false, memoryDocumentationDecks: new Map(),
    DOCUMENTATION_TEMPLATE_ID: "submission-documentation-deck",
    documentationPresentationId, buildDocumentationMergePlan,
    SCHOOL_EMAIL_DOMAIN: "westlandhigh.school.nz", process: { env: {} },
    app: { get: (url, handler) => handlers.set(`GET ${url}`, handler), post: (url, handler) => handlers.set(`POST ${url}`, handler) },
    normalizeEmail: (value) => String(value || "").trim().toLowerCase(),
    getRequestUserEmail: (req) => req.email,
    getStudentProgrammeFolder: async () => programme,
    verifyDriveTokenForStudent: async (token, email) => { assert.equal(token, "student-token"); assert.equal(email, studentEmail); },
    withResearchReportLock: async (_key, action) => action(),
    recordTemplateCopyInDb: async () => {},
    driveApiRequest: async (url, options) => {
      driveCalls.push({ url, options });
      return { id: "existing", name: "My written documentation", mimeType: "application/vnd.google-apps.presentation", webViewLink: slideUrl("existing") };
    },
    googleSlidesApiRequest: async () => ({ slides: [{}, {}] }),
    resolveStudentDriveSetupState: async () => ({ processAssessmentFolderId: "folder" }),
    driveListSlidesInProcessAssessmentTree: async () => [{ id: "audience", name: "Target Audience" }],
    inferTemplateCopyFromFileName: () => ({ templateId: "target-audience" }),
    buildDriveFolderUrlFromId: (id) => `https://drive.google.com/drive/folders/${id}`,
    fetch: async (_url, options) => {
      mergeRequestBody = JSON.parse(options.body);
      return { ok: true, json: async () => ({ response: { result: {
        fileUrl: slideUrl("merged"), fileName: "Submission Documentation", slideCount: 2, addedSlides: 2, partial: false
      } } }) };
    }
  });
  vm.runInContext(server.slice(start, end), endpointContext);
  const requestEndpoint = async (method, body = {}, email = studentEmail) => {
    const res = { code: 200, status(code) { this.code = code; return this; }, json(value) { this.body = value; } };
    await handlers.get(`${method} /api/activities/:id/documentation-deck`)({ email, params: { id: "49" }, body }, res);
    return res;
  };
  assert.equal((await requestEndpoint("GET", {}, "")).code, 401);
  assert.equal((await requestEndpoint("POST", { action: "merge", driveAccessToken: "student-token" })).code, 503,
    "An unconfigured linked merger gives an actionable setup error, not a fake snapshot merge");
  assert.equal((await requestEndpoint("POST", { action: "sync", driveAccessToken: "student-token", presentationUrl: "https://evil.test/deck" })).code, 400);
  const sync = await requestEndpoint("POST", { action: "sync", driveAccessToken: "student-token", presentationUrl: slideUrl("existing") });
  assert.equal(sync.code, 200);
  assert.equal(sync.body.deck.documentation.mode, "existing");
  assert.equal(sync.body.deck.documentation.readyForStage3, true);
  assert.equal(driveCalls.length, 1);
  assert.ok(driveCalls.every((call) => !call.options.method), "Syncing an existing deck makes no Drive write requests");
  assert.equal((await requestEndpoint("GET")).body.deck.fileUrl, slideUrl("existing"), "Existing-deck ready state survives reloads");
  assert.equal((await requestEndpoint("POST", { action: "merge", driveAccessToken: "student-token" })).code, 503,
    "A synced existing deck does not masquerade as a generated merge master");
  assert.equal((await requestEndpoint("POST", { action: "add", driveAccessToken: "student-token" })).code, 409,
    "Add missing slides never overwrites a manually assembled documentation deck");
  endpointContext.process.env.DOCUMENTATION_MERGE_SCRIPT_ID = "configured-script";
  const merged = await requestEndpoint("POST", { action: "merge", driveAccessToken: "student-token", topics: [topics[0]] });
  assert.equal(merged.code, 200);
  assert.equal(merged.body.deck.documentation.readyForStage3, true);
  assert.equal(merged.body.deck.documentation.mode, "linked");
  assert.equal(mergeRequestBody.parameters[0].destinationId, "", "The synced existing deck is never passed as a merge target");
  assert.equal(merged.body.deck.documentation.existingDeck.fileUrl, slideUrl("existing"), "The original deck remains separately linked");
  const reopened = await requestEndpoint("POST", { action: "merge", driveAccessToken: "student-token" });
  assert.equal(reopened.body.reopened, true, "Repeat merge clicks reopen only the generated linked master");
  const incomplete = await requestEndpoint("POST", { action: "add", driveAccessToken: "student-token", topics: topics.slice(0, 2) });
  assert.equal(incomplete.body.deck.documentation.readyForStage3, false, "Missing evidence never yields a false ready state");
  assert.ok(incomplete.body.deck.documentation.missingTopics.includes("Development"));
  programme = "MiddleDTECH";
  assert.equal((await requestEndpoint("GET")).code, 403);
  assert.equal(endpointContext.getDocumentationRecord([{ templateId: "assessment-full-slide-set", fileUrl: slideUrl("legacy") }]).documentation.mode, "existing",
    "Previously synced full documentation decks are recognised without forcing a new merge");
}

async function testSlideshowPdfEndpoints() {
  const source = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const handlers = new Map();
  const uploads = [];
  const exports = [];
  const records = [];
  const sourceCopies = [
    { templateId: "final-client-presentation", fileUrl: slideUrl("client") },
    { templateId: "submission-documentation-deck", fileUrl: slideUrl("documentation") }
  ];
  const allocation = { standard_1: "91907", standard_2: "91893", evidence_steps: [], template_copies: sourceCopies };
  let folderOwner = studentEmail;
  let sourceReads = 0;
  let changed = false;
  let changeLink = false;
  let badPdf = false;
  let trashed = false;
  const context = vm.createContext({
    SCHOOL_EMAIL_DOMAIN: "westlandhigh.school.nz", DOCUMENTATION_TEMPLATE_ID: "submission-documentation-deck",
    hasDatabase: true, randomUUID, documentationPresentationId, outcomeRepositories,
    normalizeEmail: (value) => String(value || "").trim().toLowerCase(), getRequestUserEmail: (req) => req.email,
    getStudentProgrammeFolder: async () => "SeniorDTECH", normalizeEvidenceStepsPayload: (value) => value,
    pool: { query: async () => ({ rows: [allocation] }) },
    app: { post: (url, handler) => handlers.set(url, handler) },
    withResearchReportLock: async (_key, work) => work(),
    verifyDriveTokenForStudent: async (token, email) => { assert.equal(token, "student-token"); assert.equal(email, studentEmail); },
    resolveStudentDriveSetupState: async () => ({ processAssessmentFolderId: "folder" }),
    driveApiRequest: async (url, options) => {
      assert.equal(options.method, undefined, "PDF export never writes to the source slideshow or changes permissions");
      if (url.endsWith("/folder")) return { id: "folder", name: "Process Assessment", mimeType: "application/vnd.google-apps.folder", owners: [{ emailAddress: folderOwner }], parents: ["senior"] };
      if (url.endsWith("/senior")) return { id: "senior", name: "SeniorDTECH" };
      sourceReads += 1;
      return { id: url.split("/").pop(), name: "Written evidence", mimeType: "application/vnd.google-apps.presentation", trashed,
        modifiedTime: "2026-10-22T00:00:00Z", version: changed && sourceReads % 2 === 0 ? "4" : "3" };
    },
    driveDownloadExportedFile: async (id, mimeType, token) => {
      exports.push(id);
      assert.equal(mimeType, "application/pdf");
      assert.equal(token, "student-token");
      if (changeLink) allocation.template_copies = [{ templateId: "final-client-presentation", fileUrl: slideUrl("other") }];
      return Buffer.from(badPdf ? "<html>not a PDF</html>" : "%PDF-1.4 slideshow export");
    },
    driveUploadBinaryFile: async (request) => { uploads.push(request); return { id: `pdf-${uploads.length}` }; },
    buildDriveFolderUrlFromId: (id) => `https://drive.google.com/drive/folders/${id}`,
    recordTemplateCopyInDb: async (_id, _email, entry) => records.push(entry)
  });
  const docStart = source.indexOf("function getDocumentationRecord(");
  const docEnd = source.indexOf("async function saveDocumentationRecord(", docStart);
  vm.runInContext(source.slice(docStart, docEnd), context);
  const start = source.indexOf("async function withFinalOutcomeLock(");
  const end = source.indexOf('app.get("/api/activities/:id/github-zip-size"', start);
  vm.runInContext(source.slice(start, end), context);
  const request = async (body, email = studentEmail) => {
    const res = { statusCode: 200, status(value) { this.statusCode = value; return this; }, set() { return this; }, json(value) { this.body = value; return this; } };
    await handlers.get("/api/activities/:id/slideshow-pdf")({ email, params: { id: "49" }, body }, res);
    return res;
  };
  const body = { kind: "client", driveAccessToken: "student-token", sourcePresentationId: "client" };
  assert.equal((await request(body, "")).statusCode, 401);
  assert.equal((await request({ ...body, kind: "unknown" })).statusCode, 400);
  assert.equal((await request({ kind: "client" })).statusCode, 400);
  assert.equal((await request({ ...body, sourcePresentationId: "other" })).statusCode, 409);
  const first = await request(body);
  assert.equal(first.statusCode, 200);
  assert.equal(first.body.saved.templateId, "client-presentation-pdf");
  assert.equal(first.body.saved.pdfExport.sourcePresentationId, "client");
  assert.equal(first.body.saved.pdfExport.sourceVersion, "3");
  assert.equal(uploads[0].folderId, "folder");
  assert.equal(uploads[0].existingFileId, undefined, "Earlier PDFs are never overwritten");
  assert.equal(uploads[0].buffer.toString(), "%PDF-1.4 slideshow export");
  const second = await request(body);
  assert.notEqual(second.body.saved.fileName, first.body.saved.fileName, "Each conversion is a separately versioned PDF");
  const documentation = await request({ ...body, kind: "documentation", sourcePresentationId: "documentation" });
  assert.equal(documentation.body.saved.templateId, "submission-documentation-pdf");
  assert.equal(exports[2], "documentation");
  const count = uploads.length;
  folderOwner = "teacher@westlandhigh.school.nz";
  assert.equal((await request(body)).statusCode, 409);
  folderOwner = studentEmail;
  changed = true;
  sourceReads = 0;
  assert.equal((await request(body)).statusCode, 409, "A source changed during conversion cannot produce a stale PDF");
  changed = false;
  badPdf = true;
  assert.equal((await request(body)).statusCode, 502);
  badPdf = false;
  trashed = true;
  assert.equal((await request(body)).statusCode, 409);
  trashed = false;
  changeLink = true;
  assert.equal((await request(body)).statusCode, 409);
  changeLink = false;
  allocation.template_copies = [];
  assert.equal((await request(body)).statusCode, 409);
  assert.equal(uploads.length, count, "Rejected/invalid exports never upload a file");
  assert.equal(records.length, count);
}

async function testSlideshowPdfFrontend() {
  const elements = new Map();
  const document = { querySelector: (selector) => {
    if (!elements.has(selector)) elements.set(selector, { hidden: true, disabled: false, textContent: "", href: "" });
    return elements.get(selector);
  } };
  const taskListState = { selectedId: "49", allItems: [{ id: "49" }], slideshowPdfBusy: { client: false, documentation: false },
    templateCopies: [{ templateId: "final-client-presentation", fileUrl: slideUrl("client") }], documentationDeck: { fileUrl: slideUrl("documentation") } };
  let denyPermission = false;
  let calls = 0;
  const context = vm.createContext({
    taskListState, document, isSeniorDigitalMediaTask: () => true, buildTaskListHeaders: (headers) => headers,
    requestHubDriveAccessToken: async () => denyPermission ? { error: "access_denied" } : { access_token: "student-token" },
    loadJson: async (_url, options) => {
      calls += 1;
      const body = JSON.parse(options.body);
      assert.equal(body.driveAccessToken, "student-token");
      return { saved: { templateId: body.kind === "client" ? "client-presentation-pdf" : "submission-documentation-pdf",
        fileUrl: "https://drive.google.com/file/d/saved-pdf/view",
        pdfExport: { sourcePresentationId: body.sourcePresentationId, exportedAt: "2026-10-22T00:00:00Z" } } };
    }
  });
  const start = client.indexOf("function renderSlideshowPdfState(");
  const end = client.indexOf("async function loadDocumentationDeck(", start);
  vm.runInContext(client.slice(start, end), context);
  context.renderSlideshowPdfState("client", "");
  assert.equal(document.querySelector("#task-list-client-pdf-convert").disabled, true);
  await context.handleSlideshowPdfExport("client");
  assert.equal(document.querySelector("#task-list-client-pdf-open").hidden, false);
  assert.equal(taskListState.slideshowPdfBusy.client, false);
  context.renderSlideshowPdfState("client", slideUrl("client"));
  assert.match(document.querySelector("#task-list-client-pdf-status").textContent, /PDF saved in SeniorDTECH/);
  context.renderSlideshowPdfState("client", slideUrl("other"));
  assert.equal(document.querySelector("#task-list-client-pdf-open").hidden, true, "An old PDF cannot be shown as the newly linked deck's PDF");
  await context.handleSlideshowPdfExport("documentation");
  assert.equal(document.querySelector("#task-list-documentation-pdf-open").hidden, false);
  denyPermission = true;
  await context.handleSlideshowPdfExport("documentation");
  assert.match(document.querySelector("#task-list-documentation-pdf-status").textContent, /Google Drive permission is required/);
  assert.equal(calls, 2);
}

async function main() {
  await testDocumentationEndpoints();
  await testSlideshowPdfEndpoints();
  await testSlideshowPdfFrontend();
  console.log("Documentation deck regressions passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});