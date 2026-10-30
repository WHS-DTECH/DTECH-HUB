"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const JSZip = require("jszip");
const B = require("../practical-skills/activity-blocks");
const { POLICY, paragraphs, checkRattlesnakes } = require("../practical-skills/rattlesnakes-check");
const { createDocumentVerification } = require("../practical-skills/document-verification");
const { registerActivityBlocks } = require("../practical-skills/activity-block-store");
const certificates = require("../practical-skills-certificate");
const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
const content = () => B.withFilesFoldersLinks({
    identity: { name: "Files & Folders Kit (Word Processing)" },
    worksheets: ["Rattlesnakes", "Weathering the Storm", "A Bibliography", "Fiction Books", "The Dream Survey Makeover"].map((activity) => ({ activity })),
    activities: [0, 1, 2, 3, 4].map(() => ({ blocks: [{ id: "link", kind: "studentlink", required: true }] }))
});
const link = (i = 0) => `https://docs.google.com/document/d/file-${i}/edit`;
const receipt = () => ({ policy: POLICY, passed: true, documentKey: B.documentLinkKey(link()) });

test("the complete reference and minor punctuation, spacing and spelling changes pass", () => {
    const exact = checkRattlesnakes(`RATTLESNAKES\n${paragraphs.join("\n\n")}`);
    assert.equal(exact.passed, true);
    assert.equal(exact.coverage, 100);
    assert.deepEqual(exact.paragraphs.map((p) => p.coverage), [100, 100, 100, 100]);
    const changed = paragraphs.join("\n\n").replace(/rattlesnake/gi, "rattlesnke").replace(/[.,'-]/g, " ").replace(/ /g, "  ");
    assert.equal(checkRattlesnakes(changed).passed, true);
});

test("blank, unrelated text, missing paragraphs and repeated paragraphs cannot pass", () => {
    for (const text of ["", "RATTLESNAKES", "snake ".repeat(1000), paragraphs[0].repeat(10)]) {
        assert.equal(checkRattlesnakes(text).passed, false);
    }
    for (let missing = 0; missing < 4; missing++) {
        const result = checkRattlesnakes(paragraphs.filter((_p, i) => i !== missing).join("\n\n"));
        assert.equal(result.passed, false, `Missing paragraph ${missing + 1}`);
        assert.match(result.message, new RegExp(String(missing + 1)));
    }
    assert.throws(() => checkRattlesnakes("word ".repeat(20001)), /too long/);
});

test("matching requires 95% overall and 90% in every paragraph, with ordered words not just counts", () => {
    const words = paragraphs.map((p) => p.split(/\s+/));
    const partial = (fraction) => words.map((p) => p.slice(0, Math.floor(p.length * fraction)).join(" ")).join("\n\n");
    assert.equal(checkRattlesnakes(partial(0.98)).passed, true);
    assert.equal(checkRattlesnakes(partial(0.93)).passed, false);
    const shortParagraph = [words[0].slice(0, 27).join(" "), ...paragraphs.slice(1)].join("\n\n");
    const result = checkRattlesnakes(shortParagraph);
    assert.equal(result.coverage >= 95, true);
    assert.equal(result.paragraphs[0].coverage < 90, true);
    assert.equal(result.passed, false);
    assert.equal(checkRattlesnakes(paragraphs.join(" ").split(/\s+/).reverse().join(" ")).passed, false);
    assert.equal(checkRattlesnakes([...paragraphs].reverse().join("\n")).passed, true, "Paragraph layout and formatting are not assessed");
});

test("trusted receipt must match current document and policy; duplicates still fail after approval", () => {
    const kit = content();
    const responses = { "0-blocks": { link: link(), documentVerification: receipt() } };
    const context = { content: kit, index: 0, responses };
    const grade = (verification) => B.grade(kit.activities[0], responses["0-blocks"], {}, { ...context, documentVerification: verification });
    assert.equal(grade().passed, false, "Client responses cannot invent a receipt");
    assert.equal(grade(receipt()).passed, true);
    assert.equal(grade({ ...receipt(), policy: "old-policy" }).passed, false);
    assert.equal(grade({ ...receipt(), passed: false }).passed, false);
    responses["0-blocks"].link = link(8);
    assert.equal(grade(receipt()).passed, false);
    responses["0-blocks"].link = link();
    responses["1-blocks"] = { link: "https://drive.google.com/open?id=file-0" };
    assert.equal(grade(receipt()).passed, false);
    delete responses["1-blocks"];
    responses["0-blocks"].link = "https://drive.google.com/file/d/file-0/view";
    assert.equal(grade(receipt()).passed, true, "Same Google file with another sharing URL retains its check");
});

async function fixture(t) {
    const kit = content(), email = "student@school.nz";
    const progress = {
        student_email: email, kit_id: "kit-files", completed: true, completed_at: "2026-10-28T00:00:00Z",
        responses: Object.fromEntries([0, 1, 2, 3, 4].map((i) => [`${i}-blocks`, { link: link(i) }])),
        completed_activities: { 0: "old", 1: "old", 2: "old", 3: "old", 4: "old" }
    };
    const checks = new Map(), queries = [], downloads = [];
    let table = false, fail = false, text = paragraphs.join("\n\n"), binary, readStatus = 200;
    let mimeType = "application/vnd.google-apps.document", changed = false, mutateLink = false, fileCalls = 0, emails = 0;
    const certificateTargets = [];
    const key = (params) => JSON.stringify([params[0], params[1], Number(params[2]), params[3], params[4]]);
    const pool = { async query(sql, params) {
        queries.push(sql);
        if (fail) throw new Error("Database unavailable");
        if (sql.startsWith("CREATE TABLE")) { table = true; return { rows: [] }; }
        if (sql.startsWith("SELECT to_regclass")) return { rows: [{ checks_table: table ? "checks" : null }] };
        if (sql.startsWith("SELECT content")) return { rows: [{ content: kit }] };
        if (sql.startsWith("SELECT responses")) return { rows: [{ responses: structuredClone(progress.responses) }] };
        if (sql.startsWith("SELECT document_key")) {
            const row = checks.get(key(params));
            return { rows: row && (!progress.started_at || new Date(row.checked_at) >= new Date(progress.started_at)) ? [row] : [] };
        }
        if (sql.startsWith("INSERT INTO")) {
            const [student_email, kit_id, activity_index, document_key, policy, passed, method, feedback, reviewed_by] = params;
            checks.set(key(params), { student_email, kit_id, activity_index, document_key, policy, passed, method,
                feedback: JSON.parse(feedback), reviewed_by, checked_at: new Date().toISOString() });
            return { rows: [] };
        }
        throw new Error(`Unexpected SQL: ${sql}`);
    } };
    const ctx = vm.createContext({
        ...certificates, ActivityBlocks: B, hasDatabase: false, normalizeEmail: (value) => value,
        memoryPracticalSkillsProgress: new Map(), kitPublication: { available: async () => true },
        ensurePracticalSkillsProgressRow: async () => progress,
        setPracticalSkillsActivityCompletion: async (_email, _kit, index, complete) => {
            if (complete) progress.completed_activities[index] = "2026-10-30T00:00:00Z"; else delete progress.completed_activities[index];
            return progress;
        }
    });
    vm.runInContext(source.slice(source.indexOf("async function syncPracticalSkillsKitCompletion("),
        source.indexOf("\nasync function getPracticalSkillsCertificate(")), ctx);
    const sync = async () => {
        Object.assign(progress, await ctx.syncPracticalSkillsKitCompletion(email, "kit-files", kit));
        return progress;
    };
    const deps = {
        pool, getDefaultPracticalSkillsKitContent: () => ({}), syncCompletion: sync,
        normalizeEmail: (value) => String(value || "").toLowerCase(), schoolDomain: "school.nz",
        getRequestUserEmail: (req) => req.headers["x-user-email"] || email,
        requireAdminAccess(req, res, next) { if (req.headers["x-teacher"] !== "yes") return res.sendStatus(403); next(); },
        canReview: async (who) => who === "teacher@school.nz",
        verifyDriveTokenForStudent: async (token, who) => {
            assert.equal(who, email);
            if (token !== "student-token") throw Object.assign(new Error("Verify your Google account"), { status: 403 });
        },
        driveApiRequest: async (route, options) => {
            assert.match(route, /^\/files\/file-/);
            assert.equal(options.accessToken, "student-token");
            fileCalls++;
            return { mimeType, modifiedTime: changed && fileCalls % 2 === 0 ? "changed" : "stable", size: binary?.length || 100 };
        },
        fetchFile: async (url) => {
            downloads.push(url);
            assert.match(url, /^https:\/\/www.googleapis.com\/drive\/v3\/files\//);
            if (mutateLink) progress.responses["0-blocks"].link = link(9);
            return new Response(binary || text, { status: readStatus });
        },
        autoEmailKitCertificate: async (_req, _kit, _certificate, studentEmail) => { emails++; certificateTargets.push(studentEmail); }
    };
    const verification = createDocumentVerification(deps);
    ctx.documentVerification = verification;
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
        req.auth_identity = { email: req.headers["x-user-email"] || email, verified: req.headers["x-verified"] !== "no" };
        next();
    });
    verification.register(app);
    registerActivityBlocks(app, {
        ...deps, documentVerification: verification, getPracticalSkillsKitDefinition: () => true,
        getStoredPracticalSkillsKitContent: async () => kit, getAllPracticalSkillsProgressRows: async () => [progress],
        savePracticalSkillsKitResponses: async (_email, _kit, answers) => { progress.responses = answers; },
        setPracticalSkillsActivityCompletion: ctx.setPracticalSkillsActivityCompletion,
        syncPracticalSkillsKitCompletion: sync
    });
    const server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
    const base = `http://127.0.0.1:${server.address().port}`;
    const request = async (route, method = "GET", body, headers = {}) => {
        const response = await fetch(`${base}${route}`, { method, headers: { "Content-Type": "application/json", ...headers },
            body: body === undefined ? undefined : JSON.stringify(body) });
        const raw = await response.text();
        return { status: response.status, data: raw.startsWith("{") ? JSON.parse(raw) : raw };
    };
    const studentPath = "/api/practical-skills/blocks/kit-files/0/document-check";
    const teacherPath = "/api/admin/kit-document-review/kit-files/0";
    const teacherHeaders = { "x-teacher": "yes", "x-user-email": "teacher@school.nz" };
    return {
        kit, progress, checks, queries, downloads, verification, deps, ctx, sync,
        request, studentPath, teacherPath, teacherHeaders,
        check: (token = "student-token") => request(studentPath, "POST", { driveAccessToken: token }),
        read: () => request(studentPath),
        review: () => request(`${teacherPath}?email=${email}`, "GET", undefined, teacherHeaders),
        approve: (documentKey = B.documentLinkKey(progress.responses["0-blocks"].link), approved = true) =>
            request(teacherPath, "PUT", { email, documentKey, approved }, teacherHeaders),
        setText: (value) => { text = value; }, setBinary: (value) => { binary = value; },
        setMime: (value) => { mimeType = value; }, setChanged: () => { changed = true; },
        setLinkMutation: () => { mutateLink = true; }, setReadStatus: (value) => { readStatus = value; },
        setFail: () => { fail = true; }, emails: () => emails, certificateTargets: () => certificateTargets
    };
}

test("ordinary saves, spoofed answers and stale ticks cannot award a certificate without a trusted check", async (t) => {
    const f = await fixture(t);
    await f.sync();
    assert.equal(f.progress.completed, false);
    assert.equal(f.progress.completed_activities[0], undefined);
    assert.equal(certificates.buildKitCertificate(f.kit, f.progress, "Student"), null);
    const saved = await f.request("/api/practical-skills/blocks/kit-files/0/check", "POST",
        { answers: { link: link(), documentVerification: receipt(), passed: true } });
    assert.equal(saved.status, 200);
    assert.equal(saved.data.passed, false);
    assert.equal(saved.data.completedActivities[0], undefined);
    assert.equal(f.emails(), 0);
});

test("Google Docs check persists in database, survives a new service and enables the normal five-activity certificate", async (t) => {
    const f = await fixture(t);
    const checked = await f.check();
    assert.equal(checked.status, 200);
    assert.equal(checked.data.verification.passed, true);
    assert.equal(checked.data.verification.feedback.coverage, 100);
    assert.equal(checked.data.verification.method, "automatic");
    assert.equal(f.progress.completed, true);
    assert.equal(certificates.buildKitCertificate(f.kit, f.progress, "Student").activityCount, 5);
    assert.equal(f.emails(), 1);
    const restarted = createDocumentVerification(f.deps);
    assert.equal((await restarted.get("student@school.nz", "kit-files", 0, f.kit.activities[0], f.progress.responses)).passed, true);
    f.progress.responses["0-blocks"].link = link(9);
    await f.sync();
    assert.equal(f.progress.completed, false);
    assert.equal((await f.read()).data.verification, null);
    assert.equal(JSON.stringify([...f.checks.values()]).includes("student-token"), false);
    assert.equal(JSON.stringify([...f.checks.values()]).includes(paragraphs[0]), false);
    f.progress.responses["0-blocks"].link = link();
    f.progress.started_at = "2100-01-01T00:00:00Z";
    await f.sync();
    assert.equal(f.progress.completed, false, "Resetting progress requires a new check, without deleting evidence");
    assert.equal((await f.read()).data.verification, null);
});

test("a failed content recheck revokes a previous successful result and returns useful feedback", async (t) => {
    const f = await fixture(t);
    await f.check();
    f.setText(paragraphs.slice(0, 3).join("\n\n"));
    const result = await f.check();
    assert.equal(result.status, 200);
    assert.equal(result.data.verification.passed, false);
    assert.match(result.data.verification.feedback.message, /paragraph.*4/);
    assert.equal(f.progress.completed, false);
    assert.equal(result.data.completedActivities[0], undefined);
});

test("Drive Word documents are read as DOCX, not fetched from the submitted URL", async (t) => {
    const f = await fixture(t);
    f.setMime("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    const zip = new JSZip();
    zip.file("[Content_Types].xml", '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    zip.file("word/document.xml", `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs.map((p) => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`).join("")}</w:body></w:document>`);
    f.setBinary(await zip.generateAsync({ type: "nodebuffer" }));
    f.progress.responses["0-blocks"].link = "https://drive.google.com/file/d/file-0/view";
    const result = await f.check();
    assert.equal(result.status, 200);
    assert.equal(result.data.verification.passed, true);
    assert.match(f.downloads[0], /\?alt=media$/);
});

test("unsupported, inaccessible, oversized and changing documents cannot produce a passed receipt", async (t) => {
    const f = await fixture(t);
    f.progress.responses["0-blocks"].link = "https://1drv.ms/w/example";
    assert.equal((await f.check()).status, 422);
    assert.equal(f.downloads.length, 0);
    f.progress.responses["0-blocks"].link = link();
    f.setMime("application/pdf");
    assert.equal((await f.check()).status, 422);
    f.setMime("application/vnd.google-apps.document");
    assert.equal((await f.check("wrong-account")).status, 403);
    assert.equal((await f.request(f.studentPath, "POST", { driveAccessToken: "student-token" }, { "x-verified": "no" })).status, 401);
    f.setReadStatus(403);
    assert.equal((await f.check()).status, 422);
    f.setReadStatus(200);
    f.setText("x".repeat(2 * 1024 * 1024 + 1));
    assert.equal((await f.check()).status, 422);
    f.setText(paragraphs.join("\n\n"));
    f.setChanged();
    assert.equal((await f.check()).status, 409);
    assert.equal(f.checks.size, 0);
});

test("link changes while reading are rejected, and other kit activities cannot invoke this pilot", async (t) => {
    const f = await fixture(t);
    f.setLinkMutation();
    assert.equal((await f.check()).status, 409);
    assert.equal(f.checks.size, 0);
    assert.equal((await f.request(f.studentPath.replace("/0/", "/1/"), "POST", { driveAccessToken: "student-token" })).status, 404);
});

test("teacher reads are SELECT-only; approval is explicit, audited and bound to the current document", async (t) => {
    const f = await fixture(t);
    const read = await f.review();
    assert.equal(read.status, 200);
    assert.equal(read.data.url, link());
    assert.equal(read.data.verification, null);
    assert.equal(f.queries.every((query) => query.startsWith("SELECT")), true);
    assert.equal(f.emails(), 0);
    assert.equal((await f.request(f.teacherPath, "PUT", { email: "student@school.nz", documentKey: receipt().documentKey, approved: true })).status, 403);
    assert.equal((await f.request(f.teacherPath, "PUT", { email: "student@school.nz", documentKey: receipt().documentKey, approved: true },
        { "x-teacher": "yes", "x-user-email": "student@school.nz" })).status, 403, "Admin hint alone is not teacher permission");
    assert.equal((await f.approve("google-file:stale-file")).status, 409);
    const approved = await f.approve();
    assert.equal(approved.status, 200);
    assert.equal(approved.data.verification.method, "teacher");
    assert.equal(approved.data.verification.reviewedBy, "teacher@school.nz");
    assert.equal(approved.data.verification.passed, true);
    assert.equal(f.progress.completed, true);
    assert.equal(f.emails(), 1, "Teacher approval that completes the kit emails the certificate");
    assert.deepEqual(f.certificateTargets(), ["student@school.nz"],
        "The certificate email targets the student, never the teacher's identity");
    const revoked = await f.approve(undefined, false);
    assert.equal(revoked.data.verification.passed, false);
    assert.equal(f.progress.completed, false);
});

test("teacher fallback supports OneDrive but cannot bypass a duplicate file or a later link change", async (t) => {
    const f = await fixture(t);
    f.progress.responses["0-blocks"].link = "https://1drv.ms/w/example";
    assert.equal((await f.approve()).data.verification.passed, true);
    f.progress.responses["1-blocks"].link = "https://1drv.ms/w/example";
    await f.sync();
    assert.equal(f.progress.completed, false);
    assert.equal(f.progress.completed_activities[0], undefined);
    f.progress.responses["1-blocks"].link = link(1);
    f.progress.responses["0-blocks"].link = "https://1drv.ms/w/another-file";
    await f.sync();
    assert.equal((await f.read()).data.verification, null);
    assert.equal(f.progress.completed, false);
});

test("database failure is explicit and never awards a completion-shaped fallback", async (t) => {
    const f = await fixture(t);
    f.setFail();
    const result = await f.read();
    assert.equal(result.status, 500);
    assert.match(result.data.error, /Database unavailable/);
    assert.equal(result.data.verification, undefined);
});

test("the student button saves the link even if OAuth is refused and does not request Google access for OneDrive", async () => {
    const controller = fs.readFileSync(path.join(__dirname, "..", "practical-skills", "kit-worksheet.js"), "utf8");
    const state = { email: "student@school.nz", progressLoaded: true, blockRevision: 0,
        content: content(), responses: { "0-blocks": { link: link() } } };
    let saves = 0, permissions = 0, requests = 0;
    const ctx = vm.createContext({
        state, preview: false, window: { ActivityBlocks: B, clearTimeout() {} },
        getSignedInEmail: () => state.email,
        checkBlockAnswers: async () => { saves++; },
        updateActivityCompleteBar: () => {},
        getResearchReportDriveToken: async () => { permissions++; throw new Error("Permission refused"); },
        loadJson: async () => { requests++; }
    });
    vm.runInContext(controller.slice(controller.indexOf("    async function checkMyDocument("),
        controller.indexOf("    function renderDocumentCheck(")), ctx);
    await assert.rejects(() => ctx.checkMyDocument(0), /Permission refused/);
    assert.equal(saves, 1);
    assert.equal(permissions, 1);
    assert.equal(requests, 0);
    assert.equal(state.driveSetupInProgress, false);
    state.responses["0-blocks"].link = "https://1drv.ms/w/example";
    await assert.rejects(() => ctx.checkMyDocument(0), /Link saved.*Ask your teacher/);
    assert.equal(saves, 2);
    assert.equal(permissions, 1);
    state.responses["0-blocks"].link = "";
    await assert.rejects(() => ctx.checkMyDocument(0), /valid HTTPS/);
    assert.equal(saves, 3);
    assert.equal(permissions, 1);
});
