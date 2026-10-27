"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createHash, randomUUID } = require("node:crypto");
const JSZip = require("jszip");
const submission = require("../submission-package");
const { createOutcomeArchiveStore } = require("../github-outcome");
const { additionalSlideshowTemplateId, additionalSlideshowPdfTemplateId } = require("../submission-slideshows");

const email = "student@westlandhigh.school.nz";
const repositoryUrl = "https://github.com/student/outcome";
const sha = "a".repeat(40);
const date = "2026-10-22T00:00:00Z";
const md5 = (bytes) => createHash("md5").update(bytes).digest("hex");
const slideUrl = (id) => `https://docs.google.com/presentation/d/${id}/edit`;
const fileUrl = (id) => `https://drive.google.com/file/d/${id}/view`;

async function fixture() {
  const inner = new JSZip();
  inner.file("index.html", "<h1>Final outcome</h1>");
  const binaries = new Map([
    ["client-pdf", Buffer.from("%PDF-client presentation")], ["documentation-pdf", Buffer.from("%PDF-documentation")],
    ["outcome-zip", await inner.generateAsync({ type: "nodebuffer" })], ["trello-pdf", Buffer.from("%PDF-Trello board report")]
  ]);
  const files = new Map(Array.from(binaries, ([id, bytes]) => [id, {
    id, name: `${id}.file`, mimeType: id === "outcome-zip" ? "application/zip" : "application/pdf",
    parents: ["folder"], owners: [{ emailAddress: email }], size: String(bytes.length), md5Checksum: md5(bytes), modifiedTime: date
  }]));
  files.set("client-slides", { id: "client-slides", mimeType: "application/vnd.google-apps.presentation", version: "3", modifiedTime: date });
  files.set("documentation-slides", { id: "documentation-slides", mimeType: "application/vnd.google-apps.presentation", version: "5", modifiedTime: date });
  const documentationSource = { templateId: "submission-documentation-deck", fileUrl: slideUrl("documentation-slides"), documentation: { mode: "existing", readyForStage3: true } };
  const context = { email, activityId: "49", repositories: [{ url: repositoryUrl }],
    evidence: [{ steps: [{ text: "TRELLO_CARD_URL|https://trello.com/b/abcdefgh" }] }],
    copies: [
      { templateId: "final-client-presentation", fileUrl: slideUrl("client-slides") }, documentationSource,
      { templateId: "client-presentation-pdf", fileUrl: fileUrl("client-pdf"), pdfExport: { sourcePresentationId: "client-slides", sourceVersion: "3", sourceModifiedTime: date, bytes: binaries.get("client-pdf").length } },
      { templateId: "submission-documentation-pdf", fileUrl: fileUrl("documentation-pdf"), pdfExport: { sourcePresentationId: "documentation-slides", sourceVersion: "5", sourceModifiedTime: date, bytes: binaries.get("documentation-pdf").length } },
      { templateId: "final-digital-outcome-zip", fileUrl: fileUrl("outcome-zip"), finalOutcome: { repositoryUrl, commitSha: sha, bytes: binaries.get("outcome-zip").length } },
      { templateId: "submission-trello-report", fileUrl: fileUrl("trello-pdf"), trelloReport: { boardId: "board12345678", generatedAt: date, bytes: binaries.get("trello-pdf").length } }
    ] };
  context.copies.forEach((record) => {
    const id = submission.submissionDriveFileId(record.fileUrl);
    const metadata = record.pdfExport || record.finalOutcome || record.trelloReport;
    if (metadata && binaries.has(id)) metadata.md5Checksum = md5(binaries.get(id));
  });
  const state = { sha, lastActivity: "2026-10-21T00:00:00Z" };
  const dependencies = {
    driveApiRequest: async (url, options) => { assert.equal(options.accessToken, "student-token"); const id = decodeURIComponent(url.split("/").pop()); if (!files.has(id)) throw new Error("File unavailable"); return files.get(id); },
    githubApiRequest: async (url) => url.includes("/commits/") ? { sha: state.sha } : { private: false, default_branch: "main" },
    getStoredTrelloConnection: async (student) => { assert.equal(student, email); return { trello_token: "private-trello-token" }; },
    trelloApiRequest: async (_url, options) => { assert.equal(options.token, "private-trello-token"); return { id: "board12345678", name: "Final project", url: "https://trello.com/b/abcdefgh", dateLastActivity: state.lastActivity }; }
  };
  const inspect = () => submission.inspectSubmissionPackage({ context, documentationSource, folderId: "folder", token: "student-token", ...dependencies });
  const fetchBinary = async (url, options) => {
    assert.equal(options.headers.Authorization, "Bearer student-token");
    assert.equal(options.redirect, "error");
    assert.ok(url.startsWith("https://www.googleapis.com/drive/v3/files/"));
    const id = new URL(url).pathname.split("/").pop();
    return new Response(binaries.get(id));
  };
  return { context, files, binaries, state, dependencies, inspect, fetchBinary, documentationSource };
}

async function testPlanAndArchive() {
  const data = await fixture();
  const plan = await data.inspect();
  assert.equal(plan.ready, true);
  assert.equal(plan.manifest.length, 4);
  const response = await submission.createSubmissionZipResponse({ components: plan.components, token: "student-token", fetchRequest: data.fetchBinary });
  const archive = await JSZip.loadAsync(await response.arrayBuffer());
  assert.deepEqual(Object.keys(archive.files).sort(), submission.SUBMISSION_COMPONENTS.map((entry) => entry.entryName).sort(), "The submission contains exactly the four agreed files");
  assert.deepEqual(await archive.file("03-Digital-Outcome.zip").async("nodebuffer"), data.binaries.get("outcome-zip"), "The GitHub ZIP is kept intact, not unpacked or recompressed");
  assert.equal((await data.inspect()).manifestHash, plan.manifestHash);
  const originalChecksum = data.files.get("outcome-zip").md5Checksum;
  data.files.get("outcome-zip").md5Checksum = "b".repeat(32);
  assert.equal((await data.inspect()).ready, false, "A same-size edited outcome ZIP is not accepted as the original generated version");
  data.files.get("outcome-zip").md5Checksum = originalChecksum;
  const oldRecord = data.context.copies.find((copy) => copy.templateId === "client-presentation-pdf");
  const recordedChecksum = oldRecord.pdfExport.md5Checksum;
  delete oldRecord.pdfExport.md5Checksum;
  oldRecord.copiedAt = "2026-10-22T00:01:00Z";
  assert.equal((await data.inspect()).ready, true, "An unchanged legacy artifact can be verified against its saved timestamp");
  delete oldRecord.copiedAt;
  assert.equal((await data.inspect()).ready, false, "Legacy records without version provenance require regeneration");
  oldRecord.pdfExport.md5Checksum = recordedChecksum;
  data.files.get("client-slides").version = "4";
  assert.equal((await data.inspect()).ready, false, "Changed slides require a new PDF");
  data.files.get("client-slides").version = "3";
  data.state.sha = "b".repeat(40);
  assert.equal((await data.inspect()).ready, false, "A pushed GitHub commit requires a new outcome ZIP");
  data.state.sha = sha;
  data.state.lastActivity = "2026-10-23T00:00:00Z";
  assert.equal((await data.inspect()).ready, false, "New Trello activity requires a new report");
  data.state.lastActivity = "2026-10-21T00:00:00Z";
  data.files.get("client-pdf").parents = ["another-folder"];
  assert.equal((await data.inspect()).ready, false);
  data.files.get("client-pdf").parents = ["folder"];
  data.binaries.set("client-pdf", Buffer.from("%PDF-corrupted contents"));
  const corrupt = await submission.createSubmissionZipResponse({ components: plan.components, token: "student-token", fetchRequest: data.fetchBinary });
  await assert.rejects(corrupt.arrayBuffer(), /integrity|changed|aborted/i, "A corrupt input must abort the package rather than omit a file");
  data.context.copies = data.context.copies.filter((copy) => copy.templateId !== "submission-trello-report");
  assert.equal((await data.inspect()).components.find((entry) => entry.key === "trello").status, "missing");
}

async function testAdditionalSlideshowPackage() {
  const data = await fixture();
  const slideshowId = "550e8400-e29b-41d4-a716-446655440000";
  const sourceId = "additional-slides";
  const pdfId = "additional-pdf";
  const pdfBytes = Buffer.from("%PDF-additional slideshow");
  data.binaries.set(pdfId, pdfBytes);
  data.files.set(sourceId, {
    id: sourceId, mimeType: "application/vnd.google-apps.presentation", version: "7", modifiedTime: date
  });
  data.files.set(pdfId, {
    id: pdfId, name: "Additional-Slideshow.pdf", mimeType: "application/pdf",
    parents: ["folder"], owners: [{ emailAddress: email }], size: String(pdfBytes.length),
    md5Checksum: md5(pdfBytes), modifiedTime: date
  });
  data.context.copies.push(
    { templateId: additionalSlideshowPdfTemplateId(slideshowId), fileName: "Additional-Slideshow.pdf", fileUrl: fileUrl(pdfId),
      pdfExport: { sourcePresentationId: sourceId, sourceVersion: "7", sourceModifiedTime: date, bytes: pdfBytes.length, md5Checksum: md5(pdfBytes) } }
  );
  assert.equal(submission.submissionSummary(data.context.copies).length, 5);
  const orphaned = await data.inspect();
  assert.equal(orphaned.ready, false, "A saved Stage 6 PDF without its linked source is not silently omitted");
  data.context.copies.push(
    { templateId: additionalSlideshowTemplateId(slideshowId), fileName: "Extra evidence", fileUrl: slideUrl(sourceId) }
  );
  const plan = await data.inspect();
  assert.equal(plan.ready, true);
  assert.equal(plan.manifest.length, 5);
  assert.equal(plan.components[4].entryName, `05-Additional-Slideshow-${slideshowId}.pdf`);
  const response = await submission.createSubmissionZipResponse({ components: plan.components, token: "student-token", fetchRequest: data.fetchBinary });
  const archive = await JSZip.loadAsync(await response.arrayBuffer());
  assert.deepEqual(Object.keys(archive.files).sort(), plan.components.map((entry) => entry.entryName).sort());
  assert.deepEqual(await archive.file(plan.components[4].entryName).async("nodebuffer"), pdfBytes);
  data.files.get(pdfId).md5Checksum = "b".repeat(32);
  assert.equal((await data.inspect()).ready, false, "A changed additional PDF blocks the package");
  data.files.get(pdfId).md5Checksum = md5(pdfBytes);
  data.files.get(sourceId).version = "8";
  assert.equal((await data.inspect()).ready, false, "A changed additional slideshow requires a fresh PDF");
}

async function testLargePackage() {
  const data = await fixture();
  const plan = await data.inspect();
  const block = Buffer.alloc(1048576);
  Buffer.from("PK\x03\x04").copy(block);
  const checksum = createHash("md5");
  for (let index = 0; index < 170; index += 1) checksum.update(block);
  const large = plan.components.find((entry) => entry.key === "outcome");
  large.bytes = 170 * 1048576;
  large.md5Checksum = checksum.digest("hex");
  const store = createOutcomeArchiveStore({});
  try {
    const snapshot = await store.prepareStream({ email, activityId: "49", metadata: { fileName: "Submission.zip" },
      open: () => submission.createSubmissionZipResponse({ components: plan.components, token: "student-token", fetchRequest: async (url, options) => {
        if (!url.includes("outcome-zip")) return data.fetchBinary(url, options);
        let remaining = 170;
        return new Response(new ReadableStream({ pull(controller) { if (remaining-- > 0) controller.enqueue(block); else controller.close(); } }));
      } }) });
    assert.ok(snapshot.bytes > 170 * 1048576);
    const lease = store.acquire(snapshot.snapshotId, email, "49");
    assert.equal(lease.archive.buffer, undefined, "The combined Otto-sized package is disk-backed");
    const handle = await fs.promises.open(lease.archive.filePath, "r");
    try {
      const footer = Buffer.alloc(22);
      await handle.read(footer, 0, 22, snapshot.bytes - 22);
      assert.equal(footer.readUInt32LE(0), 0x06054b50);
      assert.equal(footer.readUInt16LE(10), 4, "Large package still has all four ZIP entries");
    } finally { await handle.close(); lease.release(); }
  } finally { store.close(); }
}

async function testEndpoints() {
  const data = await fixture();
  const store = createOutcomeArchiveStore({});
  const handlers = new Map();
  const uploads = [];
  let existing = null;
  const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  const context = vm.createContext({
    ...submission, ...data.dependencies, randomUUID, outcomeArchiveStore: store,
    createSubmissionZipResponse: (options) => submission.createSubmissionZipResponse({ ...options, fetchRequest: data.fetchBinary }),
    app: { get: (url, handler) => handlers.set(`GET ${url}`, handler), post: (url, handler) => handlers.set(`POST ${url}`, handler) },
    loadFinalOutcomeContext: async (req) => { if (req.email !== email) throw Object.assign(new Error("School sign-in required"), { status: 401 }); return data.context; },
    resolveOwnedFinalPreparationFolder: async (student, token) => { assert.equal(student, email); assert.equal(token, "student-token"); return "folder"; },
    getDocumentationRecord: () => data.documentationSource,
    withFinalOutcomeLock: async (_key, action) => action(),
    verifyDriveTokenForStudent: async (token, student) => { assert.equal(token, "student-token"); assert.equal(student, email); },
    outcomeDriveUploader: { hasSession: () => false, upload: async (options) => {
      uploads.push(options);
      const file = { id: "submission-zip", mimeType: "application/zip", size: String(options.bytes), md5Checksum: options.md5Checksum };
      data.files.set(file.id, file);
      existing = file;
      return file;
    } },
    driveFindFileByNameInFolder: async () => existing,
    buildDriveFolderUrlFromId: (id) => `https://drive.google.com/drive/folders/${id}`,
    recordTemplateCopyInDb: async (_id, _email, entry) => { data.context.copies = data.context.copies.filter((copy) => copy.templateId !== entry.templateId).concat(entry); }
  });
  const start = server.indexOf("function publicSubmissionPlan(");
  const end = server.indexOf("const outcomeArchiveStore = ", start);
  vm.runInContext(server.slice(start, end), context);
  const request = async (method, body = {}, identity = email) => {
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, set() { return this; }, json(value) { this.body = value; return this; } };
    await handlers.get(`${method} /api/activities/:id/submission-package`)({ email: identity, params: { id: "49" }, body }, res);
    return res;
  };
  try {
    assert.equal((await request("GET", {}, "")).statusCode, 401);
    assert.equal((await request("GET")).body.components.length, 4);
    assert.equal((await request("POST", { action: "check" })).statusCode, 400);
    const checked = await request("POST", { action: "check", driveAccessToken: "student-token" });
    assert.equal(checked.body.ready, true);
    assert.ok(!JSON.stringify(checked.body).includes("private-trello-token"));
    assert.equal((await request("POST", { action: "prepare", manifestHash: "old", driveAccessToken: "student-token" })).statusCode, 409);
    const prepared = await request("POST", { action: "prepare", manifestHash: checked.body.manifestHash, driveAccessToken: "student-token" });
    assert.equal(prepared.statusCode, 200);
    const snapshotId = prepared.body.snapshot.snapshotId;
    const saved = await request("POST", { action: "save", snapshotId, driveAccessToken: "student-token" });
    assert.equal(saved.statusCode, 200);
    assert.equal(saved.body.saved.submissionPackage.components.length, 4);
    assert.equal(uploads[0].folderId, "folder");
    assert.equal(uploads[0].buffer, undefined);
    assert.equal((await request("GET")).body.saved.fileUrl, fileUrl("submission-zip"));
    assert.equal((await request("POST", { action: "save", snapshotId, driveAccessToken: "student-token" })).body.reused, true);
    assert.equal(uploads.length, 1);
    data.state.sha = "b".repeat(40);
    assert.equal((await request("POST", { action: "save", snapshotId, driveAccessToken: "student-token" })).statusCode, 409);
    assert.equal(uploads.length, 1, "A newly outdated package cannot be uploaded as current");
  } finally { store.close(); }
}

async function testFrontend() {
  const source = fs.readFileSync(path.join(__dirname, "..", "task-list.js"), "utf8");
  const elements = new Map();
  const makeElement = () => ({ hidden: false, disabled: false, textContent: "", children: [], href: "",
    replaceChildren() { this.children = []; }, append(...children) { this.children.push(...children); } });
  const document = { createElement: makeElement, querySelector: (selector) => {
    if (!elements.has(selector)) elements.set(selector, makeElement());
    return elements.get(selector);
  } };
  const components = submission.SUBMISSION_COMPONENTS.map(({ key, label, entryName }) => ({ key, label, entryName, status: "ready", message: "Ready" }));
  const saved = { fileUrl: fileUrl("submission-zip"), submissionPackage: { builtAt: date } };
  const state = { selectedId: "49", allItems: [{ id: "49" }], submissionBusy: false };
  const actions = [];
  let failSave = false;
  let outdated = false;
  let ready = true;
  const context = vm.createContext({
    document, taskListState: state, isSeniorDigitalMediaTask: () => true, buildTaskListHeaders: (headers) => headers,
    loadJson: async () => ({ components: components.map((component) => ({ ...component, status: "unchecked" })), saved }),
    requestHubDriveAccessToken: async () => { actions.push("permission"); return { access_token: "student-token" }; },
    fetch: async (_url, options) => {
      const body = JSON.parse(options.body);
      assert.equal(body.driveAccessToken, "student-token");
      actions.push(body.action);
      if (body.action === "check") return { ok: true, json: async () => ({ ready, manifestHash: "c".repeat(64), components }) };
      if (body.action === "prepare") return { ok: true, json: async () => ({ snapshot: { snapshotId: "prepared", expiresAt: Date.now() + 3600000 } }) };
      assert.equal(body.snapshotId, "prepared");
      return { ok: !failSave && !outdated, status: outdated ? 409 : 503,
        json: async () => outdated ? { error: "The final files changed. Check files again." } : failSave ? { error: "Drive unavailable" } : { saved } };
    }
  });
  const start = source.indexOf("function renderSubmissionStage(");
  const end = source.indexOf("async function fetchMyEvidence(", start);
  vm.runInContext(source.slice(start, end), context);
  await context.loadSubmissionStage({ id: "49" });
  assert.equal(document.querySelector("#task-list-submission-files").children.length, 4);
  assert.equal(document.querySelector("#task-list-submission-build").disabled, true);
  assert.equal(document.querySelector("#task-list-submission-open").hidden, false, "Saved package link survives reload without claiming freshness");
  await context.handleSubmissionStageAction("build");
  assert.deepEqual(actions, [], "Unverified files cannot start a build");
  await context.handleSubmissionStageAction("check");
  assert.equal(document.querySelector("#task-list-submission-build").disabled, false);
  actions.length = 0;
  await context.handleSubmissionStageAction("build");
  assert.deepEqual(actions, ["permission", "prepare", "save"]);
  assert.match(state.submissionStage.message, /No assessment was submitted/);
  assert.equal(document.querySelector("#task-list-submission-retry").hidden, true);
  assert.ok(!JSON.stringify(state.submissionStage).includes("student-token"));
  failSave = true;
  await context.handleSubmissionStageAction("build");
  assert.equal(document.querySelector("#task-list-submission-retry").hidden, false);
  actions.length = 0;
  failSave = false;
  await context.handleSubmissionStageAction("retry");
  assert.deepEqual(actions, ["permission", "save"], "Retry saves the same package without rebuilding");
  outdated = true;
  await context.handleSubmissionStageAction("build");
  assert.equal(state.submissionStage.ready, false);
  assert.equal(state.submissionStage.snapshot, null);
  assert.equal(document.querySelector("#task-list-submission-build").disabled, true);
  assert.equal(document.querySelector("#task-list-submission-retry").hidden, true);
  outdated = false;
  ready = false;
  await context.handleSubmissionStageAction("check");
  assert.equal(document.querySelector("#task-list-submission-build").disabled, true);
}

async function main() {
  await testPlanAndArchive();
  await testAdditionalSlideshowPackage();
  await testLargePackage();
  await testEndpoints();
  await testFrontend();
  console.log("Submission package regressions passed.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });