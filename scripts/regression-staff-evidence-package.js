"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const express = require("express");
const JSZip = require("jszip");
const { PDFDocument } = require("pdf-lib");
const { createOutcomeArchiveStore } = require("../github-outcome");
const { evidenceFileId, planStaffEvidence, readEvidenceBytes, buildStaffEvidence, registerStaffEvidencePackages } = require("../staff-evidence-package");

const sourceUrl = (id) => `https://docs.google.com/presentation/d/${id}/edit`;
const context = () => ({
  email: "student@school.nz", activityId: "49", activityName: "Process Assessment", scope: "staff-evidence:49:student@school.nz",
  copies: [
    { templateId: "project-management", fileUrl: sourceUrl("project"), fileName: "Project Management" },
    { templateId: "trialling-components", fileUrl: sourceUrl("trial"), fileName: "Trialling" },
    { templateId: "testing-functions", fileUrl: sourceUrl("denied"), fileName: "Testing" }
  ],
  evidence: [{ standard: "Task description", steps: [{ text: `GOOGLE_SLIDES_URL|${sourceUrl("project")}`, done: true }] }]
});

async function pdf(pages) {
  const document = await PDFDocument.create();
  for (let index = 0; index < pages; index++) document.addPage();
  return Buffer.from(await document.save());
}

async function dependencies(t, options = {}) {
  const document = await pdf(2);
  const store = createOutcomeArchiveStore();
  t.after(() => store.close());
  return {
    archiveStore: store,
    driveApiRequest: async (route) => {
      if (route.endsWith("/denied")) throw Object.assign(new Error("File not shared with your staff account."), { status: 403 });
      return { id: route.split("/").pop(), name: "Written evidence", mimeType: "application/vnd.google-apps.presentation", version: "2", modifiedTime: "2026-11-25T00:00:00Z" };
    },
    fetchRequest: async () => new Response(document),
    getStoredTrelloConnection: async () => null,
    ...options
  };
}

test("staff plan deduplicates linked sources without omitting separate project-management or trialling evidence", () => {
  const row = context();
  row.copies.push({ templateId: "submission-documentation-deck", fileUrl: sourceUrl("old-master") });
  row.copies.push({ templateId: "final-client-presentation", fileUrl: sourceUrl("client") });
  row.evidence[0].steps.push({ text: `LINK|${sourceUrl("client")}` });
  row.copies.push({ templateId: "final-submission-package", fileUrl: "https://drive.google.com/file/d/final/view" });
  const plan = planStaffEvidence(row);
  assert.deepEqual(plan.files.map((file) => file.id), ["project", "trial", "denied", "old-master", "client"]);
  assert.equal(plan.files.find((file) => file.id === "client").kind, "client");
  assert.equal(evidenceFileId("https://docs.google.com.evil.test/presentation/d/private/edit"), "");
  assert.equal(evidenceFileId("https://docs.google.com:444/presentation/d/private/edit"), "");
});

test("incomplete work yields a real ZIP with merged pages, unchanged originals, manifest and explicit gaps, without modifying records", async (t) => {
  const row = context();
  const before = JSON.stringify(row);
  const deps = await dependencies(t);
  const result = await buildStaffEvidence({ context: row, staffEmail: "teacher@school.nz", token: "staff-drive", dependencies: deps });
  assert.equal(result.documentationPages, 4);
  const archive = deps.archiveStore.read(result.snapshot.snapshotId, "teacher@school.nz", row.scope);
  const zip = await JSZip.loadAsync(await fs.readFile(archive.filePath));
  assert.equal((await PDFDocument.load(await zip.file("Task-List-Documentation.pdf").async("nodebuffer"))).getPageCount(), 4);
  assert.equal(Object.keys(zip.files).filter((name) => name.startsWith("Documents/") && name.endsWith(".pdf")).length, 2);
  const manifest = JSON.parse(await zip.file("Evidence-Manifest.json").async("string"));
  assert.equal(manifest.studentEmail, row.email);
  assert.ok(manifest.report.some((item) => item.label === "Testing" && item.status === "unavailable"));
  assert.ok(manifest.report.some((item) => item.kind === "client" && item.status === "missing"));
  assert.ok(manifest.report.some((item) => item.kind === "outcome" && item.status === "missing"));
  assert.match(await zip.file("READ-ME.txt").async("string"), /Not a submission/);
  assert.equal(JSON.stringify(row), before);
});

test("an uploaded OneDrive outcome is retained byte-for-byte, and invalid ZIPs are rejected", async (t) => {
  const original = new JSZip();
  original.file("index.html", "<h1>Student outcome</h1>");
  const buffer = await original.generateAsync({ type: "nodebuffer" });
  const deps = await dependencies(t);
  const row = { ...context(), copies: [], evidence: [] };
  const result = await buildStaffEvidence({ context: row, staffEmail: "teacher@school.nz", token: "staff-drive",
    uploadedFile: { originalname: "OneDrive.zip", buffer }, dependencies: deps });
  const archive = deps.archiveStore.read(result.snapshot.snapshotId, "teacher@school.nz", row.scope);
  const zip = await JSZip.loadAsync(await fs.readFile(archive.filePath));
  assert.deepEqual(await zip.file("Uploaded-Outcome.zip").async("nodebuffer"), buffer);
  assert.ok(result.report.some((item) => item.kind === "outcome" && item.status === "included"));
  await assert.rejects(buildStaffEvidence({ context: row, staffEmail: "teacher@school.nz", token: "staff-drive",
    uploadedFile: { originalname: "bad.zip", buffer: Buffer.from("not a ZIP") }, dependencies: deps }), /not a valid ZIP/);
});

test("saved documentation PDF is a labelled fallback when the live source cannot be exported", async (t) => {
  const row = { ...context(), copies: [
    { templateId: "testing-functions", fileUrl: sourceUrl("denied") },
    { templateId: "submission-documentation-pdf", fileUrl: "https://drive.google.com/file/d/saved/view", pdfExport: { sourcePresentationId: "denied" } }
  ], evidence: [] };
  const deps = await dependencies(t);
  const result = await buildStaffEvidence({ context: row, staffEmail: "teacher@school.nz", token: "staff-drive", dependencies: deps });
  assert.equal(result.documentationPages, 2);
  assert.ok(result.report.some((item) => item.status === "included" && /Previously saved/.test(item.message)));
});

test("staff Trello credentials generate a fresh PDF for linked boards including archived cards", async (t) => {
  const row = { ...context(), copies: [], evidence: [{ steps: [{ text: "TRELLO_CARD_URL|https://trello.com/b/abcdefgh" }] }] };
  const requested = [];
  const deps = await dependencies(t, {
    getStoredTrelloConnection: async (email) => { assert.equal(email, "teacher@school.nz"); return { trello_token: "staff-trello" }; },
    trelloApiRequest: async (route, options) => {
      assert.equal(options.token, "staff-trello");
      requested.push(route);
      if (route.endsWith("/lists")) { assert.equal(options.query.filter, "all"); return [{ id: "list1", name: "Done" }]; }
      if (route.endsWith("/cards")) { assert.equal(options.query.filter, "all"); return [{ id: "card1", idList: "list1", name: "Trialled prototype", closed: true }]; }
      return { id: "abcdefgh", name: "Student board", url: "https://trello.com/b/abcdefgh" };
    }
  });
  const result = await buildStaffEvidence({ context: row, staffEmail: "teacher@school.nz", token: "staff-drive", dependencies: deps });
  const archive = deps.archiveStore.read(result.snapshot.snapshotId, "teacher@school.nz", row.scope);
  const zip = await JSZip.loadAsync(await fs.readFile(archive.filePath));
  assert.ok((await zip.file("Trello-Report-1.pdf").async("nodebuffer")).subarray(0, 5).equals(Buffer.from("%PDF-")));
  assert.equal(requested.length, 3);
});

test("bounded downloads reject oversized and inaccessible sources instead of treating them as empty evidence", async () => {
  await assert.rejects(readEvidenceBytes(new Response("123456"), 5), /size limit/);
  await assert.rejects(readEvidenceBytes(new Response("denied", { status: 403 }), 100), /403/);
});

test("GitHub source is pinned by the existing packager and retained inside the final ZIP", async (t) => {
  const repoZip = new JSZip();
  repoZip.file("web-outcome/index.html", "<h1>Outcome</h1>");
  const buffer = await repoZip.generateAsync({ type: "nodebuffer" });
  const sha = "a".repeat(40);
  const store = createOutcomeArchiveStore({
    githubApiRequest: async (route) => route.endsWith(`/git/trees/${sha}`) ? { tree: [] }
      : route.includes("/commits/") ? { sha } : { private: false, default_branch: "main" },
    fetchArchive: async (url) => {
      assert.equal(url, `https://codeload.github.com/student/web-outcome/zip/${sha}`);
      return new Response(buffer);
    }
  });
  t.after(() => store.close());
  const deps = await dependencies(t, { archiveStore: store });
  const row = { ...context(), copies: [], evidence: [{ steps: [{ text: "GITHUB_REPO_URL|https://github.com/student/web-outcome" }] }] };
  const result = await buildStaffEvidence({ context: row, staffEmail: "teacher@school.nz", token: "staff-drive", dependencies: deps });
  const output = store.read(result.snapshot.snapshotId, "teacher@school.nz", row.scope);
  const zip = await JSZip.loadAsync(await fs.readFile(output.filePath));
  assert.deepEqual(await zip.file("GitHub-Outcome-1-web-outcome.zip").async("nodebuffer"), buffer);
  assert.ok(result.report.some((item) => item.commitSha === sha));
});

test("an entirely inaccessible work set fails explicitly rather than offering an empty success ZIP", async (t) => {
  const deps = await dependencies(t);
  await assert.rejects(buildStaffEvidence({ context: { ...context(), copies: [], evidence: [] },
    staffEmail: "teacher@school.nz", token: "staff-drive", dependencies: deps }), /No evidence files could be collected/);
});

test("staff routes deny forged roles, verify Drive ownership and bind downloads to staff/student/assessment", async (t) => {
  const deps = await dependencies(t);
  const app = express();
  let contextReads = 0;
  const store = registerStaffEvidencePackages(app, {
    ...deps,
    getVerifiedEmail: (req) => ({ "Bearer teacher": "teacher@school.nz", "Bearer other": "other@school.nz", "Bearer student": "student@school.nz" })[req.headers.authorization] || "",
    isStaff: async (email) => email !== "student@school.nz",
    loadContext: async () => { contextReads++; return context(); },
    verifyDriveTokenForStudent: async (token, email) => {
      if (token !== "staff-drive" || email !== "teacher@school.nz") throw Object.assign(new Error("Drive token account mismatch."), { status: 403 });
    }
  });
  t.after(() => store.close());
  const server = await new Promise((resolve) => { const instance = app.listen(0, "127.0.0.1", () => resolve(instance)); });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/staff/evidence-packages/49/student%40school.nz`;
  for (const [headers, expected] of [[{ "x-user-role": "Admin", "x-user-email": "teacher@school.nz" }, 401], [{ Authorization: "Bearer student" }, 403]]) {
    assert.equal((await fetch(base, { headers })).status, expected);
    assert.equal((await fetch(base, { method: "POST", headers })).status, expected);
    assert.equal((await fetch(`${base}/download/fake`, { headers })).status, expected);
  }
  assert.equal(contextReads, 0);
  const form = (token) => { const body = new FormData(); body.append("driveAccessToken", token); return body; };
  assert.equal((await fetch(base, { method: "POST", headers: { Authorization: "Bearer teacher" }, body: form("student-drive") })).status, 403);
  const response = await fetch(base, { method: "POST", headers: { Authorization: "Bearer teacher" }, body: form("staff-drive") });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /no-store/);
  const result = await response.json();
  const download = `${base}/download/${result.snapshot.snapshotId}`;
  assert.equal((await fetch(download, { headers: { Authorization: "Bearer other" } })).status, 410);
  assert.equal((await fetch(download.replace("/49/", "/50/"), { headers: { Authorization: "Bearer teacher" } })).status, 410);
  const good = await fetch(download, { headers: { Authorization: "Bearer teacher" } });
  assert.equal(good.status, 200);
  assert.match(good.headers.get("content-disposition"), /Evidence-Pack-student/);
  await good.arrayBuffer();
  const uploaded = new JSZip();
  uploaded.file("index.html", "Student work");
  const uploadBody = form("staff-drive");
  uploadBody.append("outcomeZip", new Blob([await uploaded.generateAsync({ type: "nodebuffer" })], { type: "application/zip" }), "OneDrive.zip");
  const withUpload = await fetch(base, { method: "POST", headers: { Authorization: "Bearer teacher" }, body: uploadBody });
  assert.equal(withUpload.status, 200);
  assert.ok((await withUpload.json()).report.some((item) => item.label === "OneDrive.zip" && item.status === "included"));
});
