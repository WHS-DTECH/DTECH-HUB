"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createHash } = require("node:crypto");
const { parseOutcomeRepository, outcomeRepositories, createOutcomeArchiveStore, createGithubZipSizeReader } = require("../github-outcome");
const { createDriveResumableUploader } = require("../drive-resumable-upload");
const os = require("node:os");

const email = "student@westlandhigh.school.nz";
const repositoryUrl = "https://github.com/student/outcome";
const sha = "a".repeat(40);
const zip = Buffer.from("504b030414000000000000000000000000000000000000000000000000000000", "hex");
const evidence = [{ standard: "project-management", steps: [{ text: `GITHUB_REPO_URL|${repositoryUrl}` }] }];
const stores = [];

function fixture(options = {}) {
  const calls = [];
  const store = createOutcomeArchiveStore({
      ...options,
      githubApiRequest: async (url) => {
        calls.push(url);
        if (url.includes("/git/trees/")) return { tree: options.tree || [], truncated: Boolean(options.truncated) };
        if (url.includes("/git/blobs/")) return { encoding: "base64", content: Buffer.from(options.rules || "").toString("base64") };
        if (url.includes("/commits/")) return { sha, commit: { committer: { date: "2026-10-22T00:00:00Z" } } };
        return { private: Boolean(options.private), default_branch: "student-main" };
      },
      fetchArchive: async (url, request) => {
        assert.equal(url, `https://codeload.github.com/student/outcome/zip/${sha}`);
        assert.equal(request.headers.Authorization, undefined, "Never forward the server GitHub token to archive hosts");
        assert.equal(request.redirect, "error");
        return new Response(options.buffer || zip, { headers: options.headers || { "content-length": String((options.buffer || zip).length) } });
      }
    });
  stores.push(store);
  return { calls, store };
}

async function testArchiveStore() {
  for (const url of ["https://evil.test/student/outcome", "https://github.com.evil.test/a/b", "https://github.com/a/b/tree/main", "http://github.com/a/b", "https://user@github.com/a/b"]) {
    assert.equal(parseOutcomeRepository(url), null, url);
  }
  assert.equal(parseOutcomeRepository(`${repositoryUrl}.git`).url, repositoryUrl);
  assert.equal(outcomeRepositories([...evidence, ...evidence]).length, 1);
  let clock = 1000;
  const { store, calls } = fixture({ now: () => clock, ttlMs: 10 });
  const snapshot = await store.prepare({ email, activityId: "49", repositoryUrl });
  assert.equal(snapshot.commitSha, sha);
  assert.equal(snapshot.branch, "student-main");
  assert.equal(snapshot.buffer, undefined, "API metadata never exposes cached bytes or student email");
  assert.equal(snapshot.email, undefined);
  assert.ok(calls.some((url) => url.endsWith(`/git/trees/${sha}`)), "Archive inspection uses the exact pinned commit");
  assert.equal(snapshot.filePath, undefined, "Local disk paths are never exposed in API metadata");
  assert.deepEqual(fs.readFileSync(store.read(snapshot.snapshotId, email, "49").filePath), zip);
  assert.equal(store.read(snapshot.snapshotId, email, "49").buffer, undefined);
  assert.throws(() => store.read(snapshot.snapshotId, "other@westlandhigh.school.nz", "49"), /expired/);
  assert.throws(() => store.read(snapshot.snapshotId, email, "50"), /expired/);
  clock += 11;
  assert.throws(() => store.read(snapshot.snapshotId, email, "49"), /expired/);
  const request = { email, activityId: "49", repositoryUrl };
  await assert.rejects(fixture({ private: true }).store.prepare(request), /public repositories/);
  await assert.rejects(fixture({ truncated: true }).store.prepare(request), /too large/);
  await assert.rejects(fixture({ tree: [{ mode: "160000" }] }).store.prepare(request), /submodules/);
  await assert.rejects(fixture({ tree: [{ path: ".gitattributes", sha }], rules: "*.psd filter=lfs diff=lfs" }).store.prepare(request), /Git LFS/);
  await assert.rejects(fixture({ tree: [{ path: ".gitattributes", sha }], rules: "assets export-ignore" }).store.prepare(request), /export exclusions/);
  await assert.rejects(fixture({ maxBytes: 4 }).store.prepare(request), /too large/);
  await assert.rejects(fixture({ headers: { "content-length": String(513 * 1024 * 1024) } }).store.prepare(request), /too large/);
  await assert.rejects(fixture({ buffer: Buffer.from("not a ZIP") }).store.prepare(request), /invalid ZIP/);
  const bounded = fixture({ maxCacheBytes: zip.length }).store;
  const first = await bounded.prepare(request);
  const second = await bounded.prepare(request);
  assert.throws(() => bounded.read(first.snapshotId, email, "49"), /expired/, "Old previews are evicted before the cache exceeds its byte limit");
  assert.deepEqual(fs.readFileSync(bounded.read(second.snapshotId, email, "49").filePath), zip);
  const lease = bounded.acquire(second.snapshotId, email, "49");
  await assert.rejects(bounded.prepare(request), /storage is busy/);
  assert.ok(fs.existsSync(lease.archive.filePath), "Active ZIP files cannot be evicted to make room for another preparation");
  const leasedPath = lease.archive.filePath;
  bounded.close();
  assert.ok(fs.existsSync(leasedPath), "An active download retains its file through cleanup");
  lease.release();
  assert.ok(!fs.existsSync(leasedPath), "Releasing the final lease permits cleanup");
}

async function testZipSizeReader() {
  let currentSha = sha;
  let clock = 100;
  let archiveRequests = 0;
  const api = async (url) => url.includes("/commits/") ? { sha: currentSha } : { private: false, default_branch: "main", size: 999999 };
  const reader = createGithubZipSizeReader({ githubApiRequest: api, now: () => clock, ttlMs: 10,
    fetchArchive: async (url, options) => {
      archiveRequests += 1;
      assert.ok(url.endsWith(currentSha));
      assert.equal(options.headers.Authorization, undefined);
      assert.equal(options.redirect, "error");
      return new Response(zip);
    }
  });
  const measured = await reader.measure(repositoryUrl);
  assert.equal(measured.bytes, zip.length, "Size is compressed ZIP bytes, not GitHub repository storage metadata");
  assert.equal(measured.exact, true);
  assert.equal(measured.exceedsLimit, false);
  await reader.measure(repositoryUrl);
  assert.equal(archiveRequests, 1, "The same commit reuses its cached measurement");
  currentSha = "b".repeat(40);
  await reader.measure(repositoryUrl);
  assert.equal(archiveRequests, 2, "A new pushed commit is measured rather than reusing the old size");
  clock += 11;
  await reader.measure(repositoryUrl);
  assert.equal(archiveRequests, 3, "Expired measurements are refreshed");
  const block = Buffer.alloc(1048576);
  zip.copy(block);
  let cancelled = false;
  const streamArchive = (count = 26) => {
    let remaining = count;
    return new Response(new ReadableStream({ pull(controller) { if (remaining-- > 0) controller.enqueue(block); else controller.close(); }, cancel() { cancelled = true; } }));
  };
  const large = await createGithubZipSizeReader({ githubApiRequest: api, fetchArchive: async () => streamArchive() }).measure(repositoryUrl);
  assert.equal(large.bytes, 26 * 1048576);
  assert.equal(large.exceedsLimit, false, "The former 25 MiB boundary is no longer a packaging limit");
  const bounded = await createGithubZipSizeReader({ githubApiRequest: api, maxBytes: 25 * 1048576, fetchArchive: async () => streamArchive(30) }).measure(repositoryUrl);
  assert.equal(bounded.exact, false);
  assert.equal(bounded.bytes, 25 * 1048576);
  assert.equal(bounded.exceedsLimit, null, "A lower bound below the packaging cap cannot establish whether it exceeds that cap");
  assert.equal(cancelled, true, "Oversized archives are cancelled at the measurement cap");
  await assert.rejects(createGithubZipSizeReader({ githubApiRequest: api, fetchArchive: async () => new Response("not a ZIP") }).measure(repositoryUrl), /invalid ZIP/);
  await assert.rejects(createGithubZipSizeReader({ githubApiRequest: async () => ({ private: true }) }).measure(repositoryUrl), /public repositories/);
}

async function testLargeDiskArchive() {
  const block = Buffer.alloc(1048576);
  zip.copy(block);
  const store = createOutcomeArchiveStore({
    githubApiRequest: async (url) => url.includes("/git/trees/") ? { tree: [] } : url.includes("/commits/") ? { sha } : { private: false, default_branch: "main" },
    fetchArchive: async () => {
      let remaining = 170;
      return new Response(new ReadableStream({ pull(controller) { if (remaining-- > 0) controller.enqueue(block); else controller.close(); } }));
    }
  });
  stores.push(store);
  const snapshot = await store.prepare({ email, activityId: "49", repositoryUrl });
  assert.equal(snapshot.bytes, 170 * 1048576, "Otto-sized ZIPs prepare successfully above the former 25 MiB cap");
  const lease = store.acquire(snapshot.snapshotId, email, "49");
  assert.equal(fs.statSync(lease.archive.filePath).size, snapshot.bytes);
  assert.equal(lease.archive.buffer, undefined);
  const checksum = createHash("md5");
  for (let index = 0; index < 170; index += 1) checksum.update(block);
  assert.equal(lease.archive.md5Checksum, checksum.digest("hex"));
  const filename = lease.archive.filePath;
  lease.release();
  store.close();
  assert.ok(!fs.existsSync(filename));
}

async function testResumableUpload() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "dtech-upload-test-"));
  const filePath = path.join(directory, "outcome.zip");
  const chunkBytes = 262144;
  const bytes = Buffer.alloc(chunkBytes * 3 + 17);
  zip.copy(bytes);
  fs.writeFileSync(filePath, bytes);
  const options = { accessToken: "student-token", folderId: "folder", fileName: "outcome.zip", filePath,
    bytes: bytes.length, md5Checksum: createHash("md5").update(bytes).digest("hex") };
  const fixture = ({ loseFirstResponse = false, failures = 0, badLocation = false, badChecksum = false } = {}) => {
    let received = 0;
    let starts = 0;
    let remainingFailures = failures;
    let probes = 0;
    const upload = createDriveResumableUploader({ chunkBytes, fetchRequest: async (url, request) => {
      assert.equal(request.headers.Authorization, "Bearer student-token");
      assert.equal(request.redirect, "error");
      if (request.method === "POST") {
        starts += 1;
        assert.equal(JSON.parse(request.body).parents[0], "folder");
        return new Response(null, { status: 200, headers: { location: badLocation ? "https://evil.test/upload" : "https://www.googleapis.com/upload/drive/v3/files?upload_id=test" } });
      }
      assert.ok(url.startsWith("https://www.googleapis.com/upload/drive/v3/files?"));
      const finished = () => new Response(JSON.stringify({ id: "saved-zip", size: String(bytes.length), md5Checksum: badChecksum ? "different" : options.md5Checksum }), { status: 200 });
      const incomplete = () => new Response(null, { status: 308, headers: received ? { range: `bytes=0-${received - 1}` } : {} });
      if (request.headers["Content-Range"] === `bytes */${bytes.length}`) {
        probes += 1;
        return received === bytes.length ? finished() : incomplete();
      }
      const range = request.headers["Content-Range"].match(/^bytes (\d+)-(\d+)\/(\d+)$/);
      assert.ok(range);
      const offset = Number(range[1]);
      assert.equal(offset, received, "Each chunk begins at Google's acknowledged offset");
      assert.ok(request.body.length <= chunkBytes);
      assert.deepEqual(Buffer.from(request.body), bytes.subarray(offset, Number(range[2]) + 1));
      if (received >= chunkBytes && remainingFailures-- > 0) throw new Error("network interruption");
      received += request.body.length;
      if (loseFirstResponse && offset === 0) throw new Error("response lost after accepted chunk");
      return received === bytes.length ? finished() : incomplete();
    } });
    return { upload, stats: () => ({ received, starts, probes }) };
  };
  try {
    const clean = fixture();
    assert.equal((await clean.upload.upload(options)).id, "saved-zip");
    assert.equal(clean.stats().received, bytes.length);
    assert.equal(clean.upload.hasSession(options), false, "Completed resumable sessions are discarded");
    const lost = fixture({ loseFirstResponse: true });
    assert.equal((await lost.upload.upload(options)).id, "saved-zip");
    assert.ok(lost.stats().probes > 0);
    assert.equal(lost.stats().starts, 1);
    const interrupted = fixture({ failures: 3 });
    await assert.rejects(interrupted.upload.upload(options), /Retry Google Drive save/);
    assert.equal(interrupted.upload.hasSession(options), true);
    assert.equal((await interrupted.upload.upload(options)).id, "saved-zip");
    assert.equal(interrupted.stats().starts, 1, "User retry resumes the existing upload rather than creating a duplicate file");
    await assert.rejects(fixture({ badLocation: true }).upload.upload(options), /invalid upload session/);
    await assert.rejects(fixture({ badChecksum: true }).upload.upload(options), /did not match/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

async function testEndpoints() {
  const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  const start = source.indexOf("const outcomeArchiveStore = ");
  const end = source.indexOf("// Public-repo-only analysis:", start);
  assert.ok(start > 0 && end > start);
  const handlers = new Map();
  let allocation = { standard_1: "91907", standard_2: "91893", evidence_steps: evidence, template_copies: [] };
  let course = "SeniorDTECH";
  let existingFile = null;
  let folderOwner = email;
  let existingChecksum = createHash("md5").update(zip).digest("hex");
  const uploads = [];
  const records = [];
  const { store } = fixture();
  const context = vm.createContext({
    createHash,
    createOutcomeArchiveStore: () => store, githubApiRequest() {}, outcomeRepositories,
    createDriveResumableUploader: () => ({ hasSession: () => false, upload: async (request) => { uploads.push(request); return { id: `zip-${uploads.length}` }; } }),
    createGithubZipSizeReader: () => ({ measure: async (url) => { assert.equal(url, repositoryUrl); return { repositoryUrl: url, bytes: zip.length, exact: true, exceedsLimit: false }; } }),
    GITHUB_TOKEN: "configured", SCHOOL_EMAIL_DOMAIN: "westlandhigh.school.nz", hasDatabase: true,
    normalizeEmail: (value) => String(value || "").trim().toLowerCase(), getRequestUserEmail: (req) => req.email,
    getStudentProgrammeFolder: async () => course,
    normalizeEvidenceStepsPayload: (rows) => rows,
    pool: { query: async (_sql, values) => { assert.deepEqual(Array.from(values), ["49", email]); return { rows: allocation ? [allocation] : [] }; } },
    app: { get: (url, handler) => handlers.set(`GET ${url}`, handler), post: (url, handler) => handlers.set(`POST ${url}`, handler) },
    researchReportLocks: new Map(),
    verifyDriveTokenForStudent: async (token, student) => { assert.equal(token, "student-token"); assert.equal(student, email); },
    resolveStudentDriveSetupState: async () => ({ processAssessmentFolderId: "folder" }),
    driveApiRequest: async (url) => url.endsWith("/saved-zip")
      ? { id: "saved-zip", mimeType: "application/zip", size: String(zip.length), md5Checksum: existingChecksum }
      : url.endsWith("/folder")
      ? { id: "folder", name: "Process Assessment", mimeType: "application/vnd.google-apps.folder", owners: [{ emailAddress: folderOwner }], parents: ["senior"] }
      : { id: "senior", name: "SeniorDTECH" },
    driveFindFileByNameInFolder: async () => existingFile,
    driveUploadBinaryFile: async (request) => { uploads.push(request); return { id: `zip-${uploads.length}` }; },
    buildDriveFolderUrlFromId: (id) => `https://drive.google.com/drive/folders/${id}`,
    recordTemplateCopyInDb: async (_id, _email, record) => records.push(record)
  });
  const lockStart = source.indexOf("function withResearchReportLock(");
  const lockEnd = source.indexOf('\napp.get(', lockStart);
  vm.runInContext(source.slice(lockStart, lockEnd), context);
  vm.runInContext(source.slice(start, end), context);
  const request = async (method, body = {}, identity = email, endpoint = "final-outcome", query = {}) => {
    const res = { statusCode: 200, headers: {}, set(key, value) { this.headers[key] = value; return this; }, status(code) { this.statusCode = code; return this; },
      json(value) { this.body = value; return this; }, type(value) { this.contentType = value; return this; }, send(value) { this.body = value; return this; },
      download(filePath, fileName, done) { this.contentType = "application/zip"; this.body = fs.readFileSync(filePath); this.fileName = fileName; done(); } };
    await handlers.get(`${method} /api/activities/:id/${endpoint}`)({ email: identity, params: { id: "49" }, body, query }, res);
    return res;
  };
  assert.equal((await request("GET", {}, "")).statusCode, 401);
  course = "MiddleDTECH";
  assert.equal((await request("GET")).statusCode, 403);
  course = "SeniorDTECH";
  allocation.standard_2 = "91897";
  assert.equal((await request("GET")).statusCode, 403);
  allocation.standard_2 = "91893";
  assert.equal((await request("GET")).body.repositories[0].url, repositoryUrl);
  const measurement = await request("GET", {}, email, "github-zip-size", { repositoryUrl });
  assert.equal(measurement.body.measurement.bytes, zip.length);
  assert.equal((await request("GET", {}, email, "github-zip-size", { repositoryUrl: "https://github.com/stranger/outcome" })).statusCode, 400);
  assert.equal((await request("GET", {}, "", "github-zip-size", { repositoryUrl })).statusCode, 401);
  assert.equal((await request("POST", { action: "prepare", repositoryUrl: "https://github.com/stranger/outcome" })).statusCode, 400);
  const prepared = await request("POST", { action: "prepare", repositoryUrl });
  assert.equal(prepared.statusCode, 200);
  const snapshotId = prepared.body.snapshot.snapshotId;
  const downloaded = await request("POST", { action: "download", snapshotId });
  assert.deepEqual(downloaded.body, zip);
  assert.equal(downloaded.contentType, "application/zip");
  assert.equal(downloaded.headers["Cache-Control"], "no-store");
  assert.equal((await request("POST", { action: "save", snapshotId })).statusCode, 400);
  folderOwner = "teacher@westlandhigh.school.nz";
  assert.equal((await request("POST", { action: "save", snapshotId, driveAccessToken: "student-token" })).statusCode, 409);
  assert.equal(uploads.length, 0, "No files go into another person's folder");
  folderOwner = email;
  const saved = await request("POST", { action: "save", snapshotId, driveAccessToken: "student-token" });
  assert.equal(saved.statusCode, 200);
  assert.deepEqual(fs.readFileSync(uploads[0].filePath), downloaded.body, "Download and Google Drive receive exactly the same bytes");
  assert.equal(uploads[0].buffer, undefined, "Large-file uploads receive a disk path, not an archive-sized buffer");
  assert.equal(uploads[0].existingFileId, undefined, "Never replace an existing version");
  assert.equal(records[0].finalOutcome.commitSha, sha);
  existingFile = { id: "saved-zip", name: records[0].fileName };
  assert.equal((await request("POST", { action: "save", snapshotId, driveAccessToken: "student-token" })).body.reused, true);
  assert.equal(uploads.length, 1, "Repeated saves reopen the same version rather than uploading duplicates");
  existingChecksum = "different";
  assert.equal((await request("POST", { action: "save", snapshotId, driveAccessToken: "student-token" })).statusCode, 409);
  assert.equal(uploads.length, 1, "A same-name file with different content is never replaced or reported as the saved ZIP");
  allocation.template_copies = [records[0]];
  assert.equal((await request("GET")).body.saved.finalOutcome.commitSha, sha, "Saved version persists through reload");
  allocation.evidence_steps = [];
  assert.equal((await request("POST", { action: "download", snapshotId })).statusCode, 409);
  allocation = null;
  assert.equal((await request("GET")).statusCode, 404);
}

async function testFrontend() {
  const source = fs.readFileSync(path.join(__dirname, "..", "task-list.js"), "utf8");
  const elements = new Map();
  const makeElement = () => ({ disabled: false, checked: false, value: "", hidden: false, children: [], textContent: "",
    classList: { toggle() {} },
    replaceChildren() { this.children = []; }, append(child) { this.children.push(child); }, click() { this.clicked = true; }, remove() {} });
  const document = {
    querySelector: (selector) => { if (!elements.has(selector)) elements.set(selector, makeElement()); return elements.get(selector); },
    querySelectorAll: () => [document.querySelector("[data-github-zip-size]")],
    createElement: () => makeElement(), body: makeElement()
  };
  const snapshot = { snapshotId: "snapshot", repositoryUrl, branch: "main", commitSha: sha, fileName: "outcome.zip", bytes: 32, expiresAt: Date.now() + 900000 };
  const saved = { fileUrl: "https://drive.google.com/file/d/saved-zip/view", fileName: "outcome.zip", finalOutcome: { commitSha: sha } };
  let repositories = [{ url: repositoryUrl, owner: "student", repo: "outcome" }];
  const actions = [];
  let failSave = false;
  let denyPermission = false;
  let sizeMeasurement = { repositoryUrl, bytes: 11274839, exact: true, exceedsLimit: false, commitSha: sha, branch: "main", measuredAt: "2026-10-22T00:00:00Z" };
  let failMeasurement = false;
  const taskListState = { selectedId: "49", allItems: [{ id: "49" }], finalOutcomeBusy: false };
  const context = vm.createContext({
    taskListState, document, isSeniorDigitalMediaTask: () => true, buildTaskListHeaders: (headers) => headers,
    loadJson: async (_url, options = {}) => {
      if (_url.includes("/github-zip-size")) {
        if (failMeasurement) throw new Error("GitHub rate limited");
        return { measurement: sizeMeasurement };
      }
      const body = options.body ? JSON.parse(options.body) : {};
      if (body.action) actions.push(body.action);
      if (body.action === "prepare") return { snapshot };
      if (body.action === "save") {
        assert.equal(body.snapshotId, snapshot.snapshotId);
        if (failSave) throw new Error("Drive upload unavailable");
        return { saved };
      }
      return { repositories, configured: true, saved };
    },
    fetch: async (_url, options) => {
      actions.push("download");
      assert.equal(JSON.parse(options.body).snapshotId, snapshot.snapshotId);
      return { ok: true, blob: async () => zip };
    },
    URL: { createObjectURL: (bytes) => { assert.deepEqual(bytes, zip); return "blob:prepared-zip"; }, revokeObjectURL() {} },
    setTimeout: (callback) => callback(), requestHubDriveAccessToken: async () => {
      actions.push("permission");
      return denyPermission ? { error: "access_denied" } : { access_token: "student-token" };
    }
  });
  const start = source.indexOf("function renderGithubZipSize(");
  const end = source.indexOf("async function fetchMyEvidence(", start);
  assert.ok(start > 0 && end > start);
  vm.runInContext(source.slice(start, end), context);
  await context.loadFinalOutcome({ id: "49" });
  assert.equal(document.querySelector("#task-list-outcome-download").disabled, true, "Confirmation is required before packaging");
  assert.equal(document.querySelector("#task-list-outcome-open").hidden, false, "The saved Drive link returns on reload");
  document.querySelector("#task-list-outcome-pushed").checked = true;
  context.renderFinalOutcomeState();
  assert.equal(document.querySelector("#task-list-outcome-download").disabled, false);
  await context.handleFinalOutcomeAction("download");
  assert.deepEqual(actions, ["permission", "prepare", "download", "save"], "A single download action automatically saves exactly that ZIP to Drive");
  assert.equal(document.body.children[0].clicked, true, "The download link is activated");
  assert.equal(document.body.children[0].download, snapshot.fileName);
  assert.equal(document.querySelector("#task-list-outcome-save").hidden, true, "No separate save click is required on success");
  assert.match(taskListState.finalOutcome.message, /ZIP saved to SeniorDTECH/);
  actions.length = 0;
  failSave = true;
  await context.handleFinalOutcomeAction("download");
  assert.equal(document.querySelector("#task-list-outcome-save").hidden, false, "Offer a retry when only the Drive upload fails");
  assert.match(taskListState.finalOutcome.message, /download started, but Google Drive save failed/);
  actions.length = 0;
  failSave = false;
  await context.handleFinalOutcomeAction("save");
  assert.deepEqual(actions, ["permission", "save"], "Retry uploads the same snapshot without downloading or packaging another ZIP");
  assert.equal(document.querySelector("#task-list-outcome-save").hidden, true);
  assert.equal(taskListState.finalOutcome.saved.fileUrl, saved.fileUrl);
  assert.equal(taskListState.finalOutcomeBusy, false);
  actions.length = 0;
  denyPermission = true;
  await context.handleFinalOutcomeAction("download");
  assert.deepEqual(actions, ["permission"], "Request permission before a long archive preparation can lose the popup gesture");
  assert.match(taskListState.finalOutcome.message, /Google Drive permission is required/);
  denyPermission = false;
  taskListState.finalOutcome.snapshot = { ...snapshot, expiresAt: Date.now() - 1 };
  context.renderFinalOutcomeState();
  assert.equal(document.querySelector("#task-list-outcome-save").disabled, true, "Expired snapshots cannot be saved");
  repositories = [...repositories, { url: "https://github.com/student/other", owner: "student", repo: "other" }];
  await context.loadFinalOutcome({ id: "49" });
  assert.equal(taskListState.finalOutcome.repositoryUrl, "", "Never silently choose among multiple repositories");
  assert.equal(document.querySelector("#task-list-outcome-repository").children[0].textContent, "Select repository");
  taskListState.finalOutcome.saved = { fileUrl: "https://evil.test/file" };
  context.renderFinalOutcomeState();
  assert.equal(document.querySelector("#task-list-outcome-open").hidden, true);
  await context.loadGithubZipSize("49", repositoryUrl);
  assert.equal(document.querySelector("[data-github-zip-size]").textContent, "ZIP: 10.75 MiB");
  sizeMeasurement = { ...sizeMeasurement, bytes: 26 * 1048576, exceedsLimit: true };
  await context.loadGithubZipSize("49", repositoryUrl);
  assert.equal(document.querySelector("[data-github-zip-size]").textContent, "ZIP: 26.00 MiB", "Students see only the ZIP size, not the internal packaging limit");
  sizeMeasurement = { ...sizeMeasurement, bytes: 200 * 1048576, exact: false };
  await context.loadGithubZipSize("49", repositoryUrl);
  assert.match(document.querySelector("[data-github-zip-size]").textContent, /over 200.00 MiB/);
  failMeasurement = true;
  await context.loadGithubZipSize("49", repositoryUrl);
  assert.equal(document.querySelector("[data-github-zip-size]").textContent, "ZIP: unavailable");
  assert.equal(document.querySelector("[data-github-zip-size]").title, "GitHub rate limited");
  failMeasurement = false;
  const stale = context.loadGithubZipSize("49", repositoryUrl);
  const loadingText = document.querySelector("[data-github-zip-size]").textContent;
  taskListState.selectedId = "50";
  await stale;
  assert.equal(document.querySelector("[data-github-zip-size]").textContent, loadingText, "Late responses do not update a different selected assessment");
}

async function main() {
  await testArchiveStore();
  await testLargeDiskArchive();
  await testResumableUpload();
  await testZipSizeReader();
  await testEndpoints();
  await testFrontend();
  console.log("Final outcome ZIP regressions passed.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => { stores.forEach((store) => store.close()); });