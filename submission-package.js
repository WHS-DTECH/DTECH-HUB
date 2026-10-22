"use strict";

const { createHash } = require("node:crypto");
const { Readable } = require("node:stream");
const { documentationPresentationId } = require("./documentation-deck");
const { parseOutcomeRepository } = require("./github-outcome");
const { trelloReportSources, resolveReportBoards } = require("./trello-report");

const SUBMISSION_COMPONENTS = [
  { key: "client", templateId: "client-presentation-pdf", label: "Client presentation PDF", entryName: "01-Client-Presentation.pdf", mimeType: "application/pdf" },
  { key: "documentation", templateId: "submission-documentation-pdf", label: "Documentation PDF", entryName: "02-Documentation.pdf", mimeType: "application/pdf" },
  { key: "outcome", templateId: "final-digital-outcome-zip", label: "GitHub outcome ZIP", entryName: "03-Digital-Outcome.zip", mimeType: "application/zip" },
  { key: "trello", templateId: "submission-trello-report", label: "Trello report PDF", entryName: "04-Trello-Report.pdf", mimeType: "application/pdf" }
];

function submissionDriveFileId(value) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:" || url.hostname !== "drive.google.com" || url.username || url.password || url.port) return "";
    return url.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]+)(?:\/|$)/)?.[1] || "";
  } catch (_error) { return ""; }
}

function submissionSummary(copies) {
  return SUBMISSION_COMPONENTS.map((definition) => ({
    key: definition.key, label: definition.label, entryName: definition.entryName,
    status: copies.some((copy) => copy?.templateId === definition.templateId && submissionDriveFileId(copy.fileUrl)) ? "unchecked" : "missing"
  }));
}

async function inspectSubmissionPackage({ context, documentationSource, folderId, token,
  driveApiRequest, githubApiRequest, trelloApiRequest, getStoredTrelloConnection }) {
  const metadata = (id) => driveApiRequest(`/files/${encodeURIComponent(id)}`, {
    accessToken: token, queryParams: { fields: "id,name,mimeType,size,md5Checksum,trashed,parents,owners(emailAddress),modifiedTime,version" }
  });
  const components = [];
  for (const definition of SUBMISSION_COMPONENTS) {
    const record = context.copies.find((copy) => copy?.templateId === definition.templateId);
    const component = { ...definition, status: "missing", message: "Create and save this file in its stage first." };
    components.push(component);
    if (!record) continue;
    try {
      const fileId = submissionDriveFileId(record.fileUrl);
      if (!fileId) throw new Error("The saved file link is invalid. Recreate this file.");
      const file = await metadata(fileId);
      if (file.trashed || file.mimeType !== definition.mimeType || !file.parents?.includes(folderId)
        || !file.owners?.some((owner) => String(owner.emailAddress || "").toLowerCase() === context.email)) {
        throw new Error("Save your own file directly in SeniorDTECH / Process Assessment.");
      }
      const bytes = Number(file.size);
      if (!Number.isSafeInteger(bytes) || bytes < 5 || !/^[a-f0-9]{32}$/i.test(String(file.md5Checksum || ""))) throw new Error("The saved file is empty or could not be verified.");
      const savedBytes = Number(record.pdfExport?.bytes || record.finalOutcome?.bytes || record.trelloReport?.bytes || 0);
      if (savedBytes && savedBytes !== bytes) throw new Error("The saved file has changed. Regenerate it in its stage.");
      const savedChecksum = record.pdfExport?.md5Checksum || record.finalOutcome?.md5Checksum || record.trelloReport?.md5Checksum;
      if (savedChecksum) {
        if (String(savedChecksum).toLowerCase() !== String(file.md5Checksum).toLowerCase()) throw new Error("The saved file contents changed. Regenerate it in its stage.");
      } else {
        const recordedAt = Date.parse(record.copiedAt || "");
        const modifiedAt = Date.parse(file.modifiedTime || "");
        if (!Number.isFinite(recordedAt) || !Number.isFinite(modifiedAt) || modifiedAt > recordedAt) throw new Error("Regenerate this file so its saved version can be verified.");
      }
      let source;
      if (definition.key === "client" || definition.key === "documentation") {
        const deck = definition.key === "client" ? context.copies.find((copy) => copy?.templateId === "final-client-presentation") : documentationSource;
        const sourceId = documentationPresentationId(deck?.fileUrl);
        if (!sourceId || sourceId !== record.pdfExport?.sourcePresentationId) throw new Error("Convert the currently linked slideshow to PDF first.");
        if (definition.key === "documentation" && (deck.documentation?.partial || deck.documentation?.missingTopics?.length)) throw new Error("Complete the documentation merge before building a submission package.");
        const live = await metadata(sourceId);
        if (live.trashed || live.mimeType !== "application/vnd.google-apps.presentation") throw new Error("The source slideshow is unavailable.");
        if (!record.pdfExport?.sourceVersion || !record.pdfExport?.sourceModifiedTime
          || String(live.version) !== record.pdfExport.sourceVersion || live.modifiedTime !== record.pdfExport.sourceModifiedTime) {
          throw new Error("The slideshow has changed. Convert it to PDF again.");
        }
        source = { presentationId: sourceId, version: String(live.version), modifiedTime: live.modifiedTime };
      } else if (definition.key === "outcome") {
        const repository = parseOutcomeRepository(record.finalOutcome?.repositoryUrl);
        if (!repository || !context.repositories.some((item) => item.url.toLowerCase() === repository.url.toLowerCase())) throw new Error("Save a ZIP from a repository linked to this assessment.");
        const base = `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}`;
        const info = await githubApiRequest(base);
        if (info.private !== false || !info.default_branch) throw new Error("The linked public GitHub repository is unavailable.");
        const commit = await githubApiRequest(`${base}/commits/${encodeURIComponent(info.default_branch)}`);
        if (!/^[a-f0-9]{40}$/i.test(String(commit.sha || "")) || commit.sha !== record.finalOutcome?.commitSha) throw new Error("GitHub has newer changes. Download and save the latest outcome ZIP.");
        source = { repositoryUrl: repository.url, commitSha: commit.sha };
      } else {
        const connection = await getStoredTrelloConnection(context.email);
        if (!connection?.trello_token) throw new Error("Connect Trello to verify the saved report.");
        const boards = await resolveReportBoards(trelloReportSources(context.evidence), connection.trello_token, trelloApiRequest);
        const board = boards.find((item) => item.id === record.trelloReport?.boardId);
        if (!board) throw new Error("Generate a report from a Trello board linked to this assessment.");
        const live = await trelloApiRequest(`/boards/${encodeURIComponent(board.id)}`, {
          token: connection.trello_token, query: { fields: "id,name,dateLastActivity" }
        });
        const lastActivity = Date.parse(live.dateLastActivity || "");
        const exportedAt = Date.parse(record.trelloReport?.generatedAt || "");
        if (!Number.isFinite(lastActivity) || !Number.isFinite(exportedAt)) throw new Error("The Trello report date could not be verified. Generate a new report.");
        if (lastActivity > exportedAt) throw new Error("Trello has newer activity. Generate and save a new report.");
        source = { boardId: board.id, lastActivity: live.dateLastActivity, exportedAt: record.trelloReport.generatedAt };
      }
      Object.assign(component, { status: "ready", message: "Ready", fileId, fileName: String(file.name || record.fileName || definition.entryName),
        bytes, md5Checksum: String(file.md5Checksum).toLowerCase(), modifiedTime: file.modifiedTime, source });
    } catch (error) {
      component.status = "needs-update";
      component.message = error.message || "Could not verify this file.";
    }
  }
  const ready = components.every((component) => component.status === "ready");
  const manifest = ready ? components.map(({ key, entryName, fileId, bytes, md5Checksum, modifiedTime, source }) => ({ key, entryName, fileId, bytes, md5Checksum, modifiedTime, source })) : [];
  const manifestHash = ready ? createHash("sha256").update(JSON.stringify(manifest)).digest("hex") : "";
  return { ready, components, manifest, manifestHash, checkedAt: new Date().toISOString() };
}

async function createSubmissionZipResponse({ components, token, fetchRequest = fetch }) {
  const { ZipArchive } = await import("archiver");
  const archive = new ZipArchive({ store: true });
  const inputs = [];
  archive.on("warning", (error) => archive.destroy(error));
  archive.once("close", () => inputs.forEach((stream) => stream.destroy()));
  for (const component of components) {
    const stream = Readable.from((async function* () {
      const response = await fetchRequest(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(component.fileId)}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` }, redirect: "error", signal: AbortSignal.timeout(300000)
      });
      if (!response.ok || !response.body) throw new Error(`Could not read ${component.entryName} from Google Drive.`);
      const checksum = createHash("md5");
      let bytes = 0;
      let signature = Buffer.alloc(0);
      for await (const chunk of response.body) {
        bytes += chunk.byteLength;
        if (bytes > component.bytes) throw new Error(`${component.entryName} changed during packaging. Check files again.`);
        if (signature.length < 5) signature = Buffer.concat([signature, Buffer.from(chunk).subarray(0, 5 - signature.length)]);
        checksum.update(chunk);
        yield chunk;
      }
      const validSignature = component.mimeType === "application/pdf" ? signature.toString() === "%PDF-"
        : signature.length >= 4 && signature.readUInt32LE(0) === 0x04034b50;
      if (!validSignature || bytes !== component.bytes || checksum.digest("hex") !== component.md5Checksum) throw new Error(`${component.entryName} failed its integrity check. Regenerate it before packaging.`);
    })());
    inputs.push(stream);
    stream.on("error", (error) => archive.destroy(error));
    archive.append(stream, { name: component.entryName, store: true });
  }
  archive.finalize().catch((error) => archive.destroy(error));
  return new Response(Readable.toWeb(archive), { headers: { "Content-Type": "application/zip" } });
}

module.exports = { SUBMISSION_COMPONENTS, submissionDriveFileId, submissionSummary, inspectSubmissionPackage, createSubmissionZipResponse };