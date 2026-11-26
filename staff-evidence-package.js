"use strict";

const { Readable } = require("node:stream");
const multer = require("multer");
const { PDFDocument } = require("pdf-lib");
const { isDocumentationTemplateId } = require("./documentation-deck");
const { outcomeRepositories, createOutcomeArchiveStore } = require("./github-outcome");
const { trelloReportSources, resolveReportBoards, createTrelloReportPdf } = require("./trello-report");

const MB = 1024 * 1024;
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const safeName = (value) => String(value || "Evidence").replace(/[^A-Za-z0-9_-]+/g, "-").slice(0, 80);

function evidenceFileId(value) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:" || url.port || url.username || url.password) return "";
    if (url.hostname === "docs.google.com") {
      return url.pathname.match(/^\/(?:presentation|document|spreadsheets)\/d\/([A-Za-z0-9_-]+)(?:\/|$)/)?.[1] || "";
    }
    if (url.hostname === "drive.google.com") return url.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]+)(?:\/|$)/)?.[1] || "";
  } catch (_error) { return ""; }
  return "";
}

function planStaffEvidence(context) {
  const copies = Array.isArray(context.copies) ? context.copies : [];
  const evidence = Array.isArray(context.evidence) ? context.evidence : [];
  const files = new Map();
  const clientIds = new Set(copies.filter((copy) => copy?.templateId === "final-client-presentation")
    .map((copy) => evidenceFileId(copy.fileUrl)).filter(Boolean));
  const add = (copy, kind) => {
    const id = evidenceFileId(copy?.fileUrl);
    if (id && !files.has(id)) files.set(id, { id, kind, label: String(copy.fileName || copy.templateTitle || copy.templateId || kind), url: copy.fileUrl });
  };
  for (const copy of copies) {
    if (isDocumentationTemplateId(copy?.templateId)
      || ["submission-documentation-deck", "assessment-full-slide-set"].includes(copy?.templateId)
      || /^submission-extra-slideshow-(?!pdf-)/.test(copy?.templateId || "")) add(copy, "documentation");
    if (copy?.templateId === "final-client-presentation") add(copy, "client");
  }
  const normalizedLinks = [];
  for (const row of evidence) {
    for (const step of Array.isArray(row?.steps) ? row.steps : []) {
      const text = String(step?.text || "");
      if (!/^(?:GOOGLE_SLIDES_URL|LINK|GITHUB_REPO_URL|TRELLO_CARD_URL)\|/.test(text)) continue;
      const url = text.slice(text.indexOf("|") + 1).trim();
      const id = evidenceFileId(url);
      if (id && !clientIds.has(id)) add({ fileUrl: url, fileName: row.standard || "Task-list evidence" }, "documentation");
      normalizedLinks.push({ text: `GITHUB_REPO_URL|${url}` }, { text: `TRELLO_CARD_URL|${url}` });
    }
  }
  for (const copy of copies) {
    if (["submission-documentation-pdf", "client-presentation-pdf"].includes(copy?.templateId)
      || /^submission-extra-slideshow-pdf-/.test(copy?.templateId || "")) {
      add(copy, copy.templateId === "client-presentation-pdf" ? "client" : "documentation");
      const file = files.get(evidenceFileId(copy.fileUrl));
      if (file) { file.fallbackSourceId = copy.pdfExport?.sourcePresentationId; file.savedPdf = true; }
    }
    if (copy?.templateId === "submission-trello-report") add(copy, "saved-trello");
    if (copy?.templateId === "final-digital-outcome-zip") add(copy, "saved-outcome");
  }
  const links = evidence.concat([{ steps: normalizedLinks }]);
  const repositories = outcomeRepositories(links);
  const trello = trelloReportSources(links);
  if (files.size > 60 || repositories.length > 5 || trello.length > 10) throw fail("This work set has too many sources. Keep at most 60 documents, 5 repositories and 10 Trello links.");
  return { files: Array.from(files.values()), repositories, trello };
}

async function readEvidenceBytes(response, limit) {
  if (!response.ok || !response.body) throw fail(`Source download failed (${response.status}). Check your sharing permissions.`, response.status === 404 ? 404 : 502);
  if (Number(response.headers.get("content-length")) > limit) {
    await response.body.cancel();
    throw fail("This source exceeds the evidence-pack size limit.", 413);
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.byteLength;
    if (bytes > limit) throw fail("This source exceeds the evidence-pack size limit.", 413);
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function buildStaffEvidence({ context, staffEmail, token, uploadedFile, dependencies }) {
  const { driveApiRequest, fetchRequest = fetch, archiveStore, trelloApiRequest, getStoredTrelloConnection } = dependencies;
  const plan = planStaffEvidence(context);
  const generatedAt = new Date().toISOString();
  const entries = [];
  const report = [];
  const leases = [];
  const exportedIds = new Set();
  const merged = await PDFDocument.create();
  let documentBytes = 0;
  let retainedBytes = 0;
  const addBuffer = (name, buffer) => {
    if (retainedBytes + buffer.length > 128 * MB) throw fail("The collected documents and attached files exceed 128 MB. Use a smaller outcome ZIP.", 413);
    retainedBytes += buffer.length;
    entries.push({ name, buffer });
  };
  const note = (kind, label, status, message, extra = {}) => report.push({ kind, label, status, message, ...extra });
  const problem = (kind, label, error) => {
    console.warn("[staff-evidence-package] Source unavailable:", kind, error.message);
    note(kind, label, "unavailable", error.message || "Source could not be collected.");
  };
  try {
    for (const [index, file] of plan.files.entries()) {
      if (file.fallbackSourceId && exportedIds.has(file.fallbackSourceId)) continue;
      try {
        const metadata = await driveApiRequest(`/files/${encodeURIComponent(file.id)}`, {
          accessToken: token, queryParams: { fields: "id,name,mimeType,trashed,modifiedTime,version", supportsAllDrives: true }
        });
        if (metadata.trashed) throw fail("This linked file is in the bin.", 404);
        const googleFile = /^application\/vnd\.google-apps\.(presentation|document|spreadsheet)$/.test(metadata.mimeType);
        const zip = file.kind === "saved-outcome";
        if (zip ? !["application/zip", "application/x-zip-compressed"].includes(metadata.mimeType)
          : !googleFile && metadata.mimeType !== "application/pdf") throw fail("The linked source is not a supported document or ZIP.");
        const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}`
          + (googleFile ? "/export?mimeType=application%2Fpdf" : "?alt=media&supportsAllDrives=true");
        const buffer = await readEvidenceBytes(await fetchRequest(url, {
          headers: { Authorization: `Bearer ${token}` }, redirect: "error", signal: AbortSignal.timeout(120000)
        }), Math.min(128 * MB - retainedBytes, zip ? 64 * MB : Math.min(20 * MB, 40 * MB - documentBytes)));
        if (zip ? buffer.length < 4 || buffer.readUInt32LE(0) !== 0x04034b50 : buffer.subarray(0, 5).toString() !== "%PDF-") throw fail("The source did not return a valid PDF or ZIP.");
        const after = await driveApiRequest(`/files/${encodeURIComponent(file.id)}`, {
          accessToken: token, queryParams: { fields: "trashed,version,modifiedTime", supportsAllDrives: true }
        });
        if (after.trashed || String(metadata.version || "") !== String(after.version || "") || metadata.modifiedTime !== after.modifiedTime) throw fail("The source changed during export. Rebuild to collect its current version.", 409);
        const entryName = `${file.kind === "documentation" ? "Documents" : "Other-Evidence"}/${index + 1}-${safeName(metadata.name || file.label)}.${zip ? "zip" : "pdf"}`;
        if (!zip) documentBytes += buffer.length;
        if (file.kind === "documentation") {
          const sourcePdf = await PDFDocument.load(buffer);
          if (merged.getPageCount() + sourcePdf.getPageCount() > 500) throw fail("Merged documentation exceeds 500 pages; this source was not included.", 413);
          const pages = await merged.copyPages(sourcePdf, sourcePdf.getPageIndices());
          pages.forEach((page) => merged.addPage(page));
        }
        addBuffer(entryName, buffer);
        exportedIds.add(file.id);
        note(file.kind, file.label, "included", file.kind.startsWith("saved-") || file.savedPdf
          ? "Previously saved file; not verified against the latest source." : "Exported from the linked source using staff Drive access.",
        { entryName, sourceUrl: file.url, sourceVersion: metadata.version, sourceModifiedTime: metadata.modifiedTime, bytes: buffer.length });
      } catch (error) { problem(file.kind, file.label, error); }
    }
    if (merged.getPageCount()) addBuffer("Task-List-Documentation.pdf", Buffer.from(await merged.save()));
    if (uploadedFile) {
      if (uploadedFile.buffer.length < 4 || uploadedFile.buffer.readUInt32LE(0) !== 0x04034b50) throw fail("The attached outcome is not a valid ZIP. Choose the original downloaded ZIP.");
      addBuffer("Uploaded-Outcome.zip", uploadedFile.buffer);
      note("outcome", uploadedFile.originalname, "included", "Staff-supplied outcome ZIP, retained unchanged. Its contents were not independently verified.", { entryName: "Uploaded-Outcome.zip" });
    }
    for (const [index, repository] of plan.repositories.entries()) {
      try {
        const snapshot = await archiveStore.prepare({ email: staffEmail, activityId: context.scope, repositoryUrl: repository.url });
        const lease = archiveStore.acquire(snapshot.snapshotId, staffEmail, context.scope);
        leases.push({ ...lease, snapshotId: snapshot.snapshotId });
        const entryName = `GitHub-Outcome-${index + 1}-${safeName(repository.repo)}.zip`;
        entries.push({ name: entryName, filePath: lease.archive.filePath });
        note("outcome", repository.url, "included", "Latest default-branch commit; archive completeness checked by the existing GitHub packager.", { entryName, commitSha: snapshot.commitSha });
      } catch (error) { problem("outcome", repository.url, error); }
    }
    if (plan.trello.length) {
      try {
        const connection = await getStoredTrelloConnection(staffEmail);
        if (!connection?.trello_token) throw fail("Connect your staff Trello account in Settings, then rebuild. You must have access to the student's board.");
        const byBoard = new Map();
        for (const source of plan.trello) {
          try {
            for (const board of await resolveReportBoards([source], connection.trello_token, trelloApiRequest)) byBoard.set(board.id, board);
          } catch (error) { problem("trello", source.url, error); }
        }
        const boards = Array.from(byBoard.values());
        for (const [index, board] of boards.entries()) {
          try {
            const lists = await trelloApiRequest(`/boards/${encodeURIComponent(board.id)}/lists`, {
              token: connection.trello_token, query: { filter: "all", fields: "id,name,closed,pos" }
            });
            const cards = await trelloApiRequest(`/boards/${encodeURIComponent(board.id)}/cards`, {
              token: connection.trello_token, query: { filter: "all", fields: "id,idList,name,desc,url,pos,closed,due,dueComplete,start,dateLastActivity,labels" }
            });
            const buffer = await createTrelloReportPdf({ board, lists, cards, email: context.email, activityId: context.activityId, generatedAt });
            documentBytes += buffer.length;
            if (documentBytes > 50 * MB) throw fail("The reports exceed the evidence-pack document size limit.", 413);
            const entryName = `Trello-Report-${index + 1}.pdf`;
            addBuffer(entryName, buffer);
            note("trello", board.name, "included", "Generated from the board using staff Trello access, including archived cards.", { entryName, sourceUrl: board.url });
          } catch (error) { problem("trello", board.name, error); }
        }
      } catch (error) { problem("trello", "Linked Trello board", error); }
    }
    for (const kind of ["documentation", "client", "outcome", "trello"]) {
      if (!report.some((item) => item.kind === kind || item.kind === `saved-${kind}`)) note(kind, kind, "missing", "No linked source or uploaded file was available. Incomplete work does not prevent an evidence pack.");
    }
    if (!entries.length) throw fail("No evidence files could be collected. Check Drive sharing, staff Trello connection, or attach the downloaded outcome ZIP. " + report.filter((item) => item.status === "unavailable").map((item) => `${item.label}: ${item.message}`).join(" ").slice(0, 1500), 409);
    const manifest = { studentEmail: context.email, activityId: context.activityId, activityName: context.activityName, packagedBy: staffEmail, generatedAt,
      purpose: "Staff assessment evidence snapshot only. Not a submission, readiness confirmation or grade. Missing and inaccessible work is listed below. Documentation includes each distinct linked source, so existing merged decks may repeat individual slides.",
      report };
    addBuffer("Evidence-Manifest.json", Buffer.from(JSON.stringify(manifest, null, 2)));
    addBuffer("Task-List-Record.json", Buffer.from(JSON.stringify({ evidence: context.evidence, copies: context.copies }, null, 2)));
    addBuffer("READ-ME.txt", Buffer.from(`${manifest.purpose}\nStudent: ${context.email}\nAssessment: ${context.activityName} (${context.activityId})\nPackaged: ${generatedAt}\n\n${report.map((item) => `${item.status.toUpperCase()} | ${item.kind} | ${item.label} | ${item.message}`).join("\n")}\n`));
    const snapshot = await archiveStore.prepareStream({
      email: staffEmail, activityId: context.scope,
      metadata: { fileName: `Evidence-Pack-${safeName(context.email.split("@")[0])}-Task-${safeName(context.activityId)}-${generatedAt.replace(/[:.]/g, "-")}.zip`,
        evidencePack: { studentEmail: context.email } },
      open: async () => {
        const { ZipArchive } = await import("archiver");
        const archive = new ZipArchive({ store: true });
        archive.on("warning", (error) => archive.destroy(error));
        for (const entry of entries) {
          if (entry.filePath) archive.file(entry.filePath, { name: entry.name });
          else archive.append(entry.buffer, { name: entry.name });
        }
        archive.finalize().catch((error) => archive.destroy(error));
        return new Response(Readable.toWeb(archive));
      }
    });
    return { snapshot, report, documentationPages: merged.getPageCount() };
  } finally {
    for (const lease of leases) {
      lease.release();
      archiveStore.discard(lease.snapshotId, staffEmail, context.scope);
    }
  }
}

function registerStaffEvidencePackages(app, dependencies) {
  const { getVerifiedEmail, isStaff, loadContext, verifyDriveTokenForStudent } = dependencies;
  const archiveStore = createOutcomeArchiveStore({ githubApiRequest: dependencies.githubApiRequest, maxBytes: 256 * MB, maxCacheBytes: 512 * MB, ttlMs: 15 * 60 * 1000 });
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 64 * MB, files: 1, fields: 1, fieldSize: 16384 } }).single("outcomeZip");
  const base = "/api/staff/evidence-packages/:activityId/:studentEmail";
  let busy = false;
  async function authorize(req, res, next) {
    res.set("Cache-Control", "private, no-store");
    try {
      req.evidenceStaffEmail = getVerifiedEmail(req);
      if (!req.evidenceStaffEmail) throw fail("Verified school Google sign-in required.", 401);
      if (!await isStaff(req.evidenceStaffEmail)) throw fail("Staff access required.", 403);
      next();
    } catch (error) { res.status(error.status || 500).json({ error: error.message }); }
  }
  async function contextFor(req) {
    const email = String(req.params.studentEmail || "").trim().toLowerCase();
    const activityId = String(req.params.activityId || "");
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(activityId) || !/^[^@\s]{1,100}@[^@\s]{1,100}$/.test(email)) throw fail("Choose a valid student assessment record.");
    const context = await loadContext(activityId, email);
    return { ...context, email, activityId, scope: `staff-evidence:${activityId}:${email}` };
  }
  app.get(base, authorize, async (req, res) => {
    try {
      const context = await contextFor(req);
      res.json({ plan: planStaffEvidence(context) });
    } catch (error) { res.status(error.status || 500).json({ error: error.message }); }
  });
  app.post(base, authorize, (req, res) => {
    if (busy) { res.status(503).json({ error: "Another evidence pack is being built. Please retry shortly." }); return; }
    busy = true;
    upload(req, res, async (uploadError) => {
      try {
        if (uploadError) throw fail(uploadError.code === "LIMIT_FILE_SIZE" ? "The attached ZIP exceeds 64 MB." : uploadError.message, 413);
        const context = await contextFor(req);
        const token = String(req.body?.driveAccessToken || "").trim();
        if (!token) throw fail("Allow staff Google Drive access before building.");
        await verifyDriveTokenForStudent(token, req.evidenceStaffEmail);
        res.json(await buildStaffEvidence({ context, staffEmail: req.evidenceStaffEmail, token, uploadedFile: req.file,
          dependencies: { ...dependencies, archiveStore } }));
      } catch (error) {
        console.error("[staff-evidence-package] Build failed:", error.message);
        res.status(error.status || 500).json({ error: error.message || "Could not package this student's evidence." });
      } finally { busy = false; }
    });
  });
  app.get(`${base}/download/:snapshotId`, authorize, async (req, res) => {
    let lease;
    try {
      const context = await contextFor(req);
      lease = archiveStore.acquire(req.params.snapshotId, req.evidenceStaffEmail, context.scope);
      if (lease.archive.evidencePack?.studentEmail !== context.email) throw fail("This snapshot is not a staff evidence package.", 403);
      await new Promise((resolve, reject) => res.download(lease.archive.filePath, lease.archive.fileName, (error) => error ? reject(error) : resolve()));
    } catch (error) {
      if (res.headersSent) res.destroy(error);
      else res.status(error.status || 500).json({ error: error.message });
    } finally { lease?.release(); }
  });
  return archiveStore;
}

module.exports = { evidenceFileId, planStaffEvidence, readEvidenceBytes, buildStaffEvidence, registerStaffEvidencePackages };
