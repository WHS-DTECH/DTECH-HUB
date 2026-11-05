"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const express = require("express");
const B = require("../practical-skills/activity-blocks");
const { createDocumentVerification } = require("../practical-skills/document-verification");
const { registerActivityBlocks } = require("../practical-skills/activity-block-store");
const certificates = require("../practical-skills-certificate");
const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
const images = path.join(__dirname, "..", "practical-skills", "images");
const POLICY = "google-drawing-teacher-v1";
const base = () => ({
    identity: { name: "Google Drawings Kit" }, publicationLive: false,
    worksheets: ["Ship", "TV", "Flower Pot"].map((activity) => ({ activity })),
    activities: [
        { title: "Ship", information: { title: "Keep these instructions" }, blocks: [
            { id: "guide", kind: "text", text: "Build your ship." },
            { id: "old-link", kind: "studentlink", responseKey: "ship-url" },
            { id: "explain", kind: "question", questionType: "short-answer", text: "Describe your ship", required: true }
        ] },
        { title: "TV", questions: [{ id: "legacy", type: "short-answer", prompt: "Describe your TV" }] }
    ]
});
const link = (i) => `https://docs.google.com/drawings/d/drawing-${i}/edit?usp=sharing`;
const linkBlock = (activity) => activity.blocks.find((block) => block.kind === "studentlink");
const answer = (content, index, url) => ({ [linkBlock(content.activities[index]).id]: url });
const receipt = (i, policy = POLICY) => ({ policy, passed: true, documentKey: B.documentLinkKey(link(i)) });
const guides = [
    ["ship-shapes-reference", "ship-shapes-instructions", "ship-reference.png", "shipShapesReferenceVersion", "Google Drawing - Ship"],
    ["tv-reference", "tv-shapes-instructions", "tv-reference.png", "tvReferenceVersion", "Google Drawing - TV"],
    ["flower-pot-reference", "flower-pot-shapes-instructions", "flower-pot-reference.png", "flowerPotReferenceVersion", "Google Drawing - Flower Pot"]
];

test("all three drawings gain reference images, shape instructions and a teacher-ticked Submit flow without losing content", () => {
    const original = base(), before = JSON.stringify(original);
    const content = B.withFilesFoldersLinks(original);
    assert.equal(JSON.stringify(original), before);
    assert.equal(content.publicationLive, false);
    assert.equal(content.activities.length, 3);
    assert.equal(fs.existsSync(path.join(__dirname, "..", "practical-skills", "drawing-check.js")), false, "Automatic shape check is removed");
    content.activities.forEach((activity, index) => {
        const [imageId, tasksId, file, flag, subject] = guides[index];
        B.validate(activity);
        assert.equal(activity.completionMode, "auto");
        assert.equal(activity.documentCheck, POLICY);
        assert.equal(B.GOOGLE_DRAWING_POLICY, POLICY);
        assert.equal(activity.uniqueDocumentLinks, true);
        assert.equal(activity.drawingCheckVersion, 2);
        assert.equal(activity.submissionSubject, subject);
        assert.equal(activity[flag], 1);
        assert.equal("shareLinkCompletion" in activity, false);
        assert.equal(activity.blocks[0].id, imageId);
        assert.equal(activity.blocks[0].kind, "image");
        assert.ok(activity.blocks[0].url.endsWith(`/practical-skills/images/${file}`));
        assert.equal(fs.readFileSync(path.join(images, file)).subarray(1, 4).toString(), "PNG");
        const tasks = activity.blocks[1];
        assert.equal(tasks.id, tasksId);
        assert.match(tasks.text, /Insert > Shape/);
        assert.match(tasks.text, /Line tool only/);
        assert.match(tasks.text, /press Submit/);
        assert.match(tasks.text, /marks it Completed/);
        assert.doesNotMatch(JSON.stringify(activity), /Check my drawing/);
        assert.equal(activity.blocks.filter((block) => block.required).length, 1);
        assert.equal(activity.blocks.find((block) => block.required).kind, "studentlink");
    });
    assert.equal(content.activities[0].blocks.find((block) => block.id === "guide"), original.activities[0].blocks[0]);
    assert.equal(content.activities[0].information, original.activities[0].information);
    assert.equal(content.activities[0].blocks.find((block) => block.id === "old-link").responseKey, "ship-url");
    assert.equal(B.savedAnswers(content.activities[0], 0, { "ship-url": link(0) })["old-link"], link(0));
    assert.ok(content.activities[1].blocks.some((block) => block.responseKey === "1-legacy"));
    assert.equal(B.withFilesFoldersLinks(content), content, "Normalization is idempotent");
});

test("upgrading v1 shape-check activities replaces instructions and link text by ID and never re-adds a removed image", () => {
    const current = B.withGoogleDrawingsLinks(base());
    const v1 = (activity, keepImage) => {
        const { submissionSubject: _s, ...rest } = activity;
        return { ...rest, drawingCheckVersion: 1, documentCheck: "google-drawing-shapes-v1", blocks: activity.blocks
            .filter((block) => keepImage || block.kind !== "image")
            .map((block) => block.kind === "tasks" ? { ...block, text: "Old: use Check my drawing", extra: "kept" }
                : block.kind === "studentlink" && block.id.startsWith("google-drawings-share-link") ? { ...block, text: "Then use Check my drawing." } : block) };
    };
    const before = { ...current, activities: [v1(current.activities[0], false), v1(current.activities[1], true), v1(current.activities[2], true)] };
    const kit = B.withGoogleDrawingsLinks(before);
    const [ship, tv] = kit.activities;
    assert.equal(ship.blocks.some((block) => block.kind === "image"), false, "Teacher-removed Ship image stays removed");
    assert.equal(ship.blocks[0].id, "ship-shapes-instructions");
    assert.equal(ship.blocks[0].extra, "kept");
    assert.match(ship.blocks[0].text, /press Submit/);
    assert.equal(tv.blocks.filter((block) => block.id === "tv-reference").length, 1);
    kit.activities.forEach((activity, index) => {
        assert.equal(activity.documentCheck, POLICY);
        assert.equal(activity.drawingCheckVersion, 2);
        assert.equal(activity.submissionSubject, guides[index][4]);
        assert.doesNotMatch(JSON.stringify(activity.blocks), /Check my drawing/);
    });
    assert.equal(kit.publicationLive, false);
    assert.equal(B.withGoogleDrawingsLinks(kit), kit);
    const edited = { ...kit, activities: kit.activities.map((activity) => ({ ...activity,
        blocks: activity.blocks.filter((block) => block.kind !== "image" && block.kind !== "tasks") })) };
    const kept = B.withGoogleDrawingsLinks(edited);
    kept.activities.forEach((activity) => assert.equal(activity.blocks.some((block) => ["image", "tasks"].includes(block.kind)), false,
        "Later teacher edits to images and instructions are respected"));
});

test("only the requested kit and visible drawing activities are changed", () => {
    const other = { ...base(), identity: { name: "Search Kit" } };
    assert.equal(B.withFilesFoldersLinks(other), other);
    const kit = base();
    kit.worksheets[1].hidden = true;
    kit.worksheets[2].mergedInto = 0;
    kit.worksheets.push({ activity: "Other activity" });
    const content = B.withFilesFoldersLinks(kit);
    assert.equal(content.activities[1], kit.activities[1]);
    assert.equal(content.activities[2], undefined);
    assert.equal(content.activities[3], undefined);
});

test("each reference image renders once in the student view", () => {
    const kit = B.withGoogleDrawingsLinks(base());
    const ctx = vm.createContext({ window: { ActivityBlocks: B } });
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "practical-skills", "activity-block-view.js"), "utf8"), ctx);
    kit.activities.forEach((activity, index) => {
        const file = guides[index][2];
        const markup = ctx.window.ActivityBlockView.markup(activity.blocks, {}, true);
        assert.match(markup, new RegExp(`<img src="https://dtech-hub2\\.onrender\\.com/practical-skills/images/${file}"`));
        assert.match(markup, /Insert &gt; Shape/);
        assert.equal((markup.match(new RegExp(file, "g")) || []).length, 1);
    });
});

test("a share link alone does not tick; only a matching teacher receipt does, and drawings must differ", () => {
    const content = B.withFilesFoldersLinks(base());
    content.activities.forEach((activity, index) => {
        const responses = { [`${index}-blocks`]: answer(content, index, link(index)) };
        const grade = (documentVerification, url = link(index)) => B.grade(activity, answer(content, index, url), {},
            { content, index, responses, documentVerification });
        const linkOnly = grade();
        assert.equal(linkOnly.passed, false);
        assert.match(JSON.stringify(linkOnly), /Press Submit/);
        assert.equal(grade(receipt(index)).passed, true);
        assert.equal(grade(receipt(index, "google-drawing-shapes-v1")).passed, false, "Old automatic receipts no longer count");
        assert.equal(grade(receipt(index, "rattlesnakes-v1")).passed, false);
        assert.equal(grade({ ...receipt(index), passed: false }).passed, false);
        assert.equal(grade(receipt(index + 5)).passed, false, "Receipt must match the current drawing");
        for (const invalid of ["", "C:\\Videos\\drawing.png", "http://example.test/work", "javascript:alert(1)"]) {
            assert.equal(grade(receipt(index), invalid).passed, false);
        }
    });
    const responses = { "0-blocks": answer(content, 0, link(0)), "1-blocks": answer(content, 1, link(0)) };
    assert.equal(B.grade(content.activities[1], responses["1-blocks"], {},
        { content, index: 1, responses, documentVerification: receipt(0) }).passed, false, "The same drawing cannot count twice");
});

test("saved definitions normalize persistently once, preserving existing teacher content", async () => {
    let stored = base(), writes = 0;
    const ctx = vm.createContext({
        ActivityBlocks: B, hasDatabase: true, withUnityHubLicence: (value) => value,
        ensurePracticalSkillsKitContentSchema: async () => {}, getDefaultPracticalSkillsKitContent: () => ({}),
        ...Object.fromEntries(["withShortLoginKit", "withLearningSitesActivity", "withLoginAppsActivity", "withLoginIdentityActivity", "withPasswordProblemsActivity"]
            .map((name) => [name, (_id, value) => value])),
        pool: { query: async (sql, params) => {
            if (sql.includes("SELECT content")) return { rows: [{ content: structuredClone(stored) }] };
            assert.match(sql, /UPDATE practical_skills_kit_content/);
            stored = JSON.parse(params[0]); writes++;
            return { rows: [] };
        } }
    });
    const start = source.indexOf("async function getStoredPracticalSkillsKitContent(");
    vm.runInContext(source.slice(start, source.indexOf("\nasync function savePracticalSkillsKitContent(", start)), ctx);
    const first = await ctx.getStoredPracticalSkillsKitContent("kit-google-drawings");
    assert.equal(writes, 1);
    assert.ok(first.activities[0].blocks.some((block) => block.id === "old-link"));
    assert.equal(first.activities[2].documentCheck, POLICY);
    await ctx.getStoredPracticalSkillsKitContent("kit-google-drawings");
    assert.equal(writes, 1);
});

test("submission email helper sends the activity subject and student name to Lead Teachers with a Teacher Review link", async () => {
    const sent = [];
    const ctx = vm.createContext({
        smtpTransporter: {}, SMTP_FROM: "hub@school.nz", process: { env: {} },
        getPracticalSkillsCertificateTeacherRecipients: async () => ["lead@school.nz", "student@school.nz"],
        getResearchReportStudentDetails: async () => ({ studentName: "Aroha <Smith>" }),
        normalizeEmail: (value) => String(value || "").trim().toLowerCase(),
        sendConfiguredHubEmail: async (message) => { sent.push(message); return true; }
    });
    const start = source.indexOf("async function notifyKitSubmission(");
    assert.ok(start > 0);
    vm.runInContext(source.slice(start, source.indexOf("\nconst documentVerification", start)), ctx);
    const emailed = await ctx.notifyKitSubmission({ studentEmail: "student@school.nz", kitId: "kit-google-drawings",
        url: link(0), subject: "Google Drawing - Ship" });
    assert.equal(emailed, true);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].subject, "Google Drawing - Ship - Aroha <Smith>");
    assert.doesNotMatch(JSON.stringify(sent[0].to), /student@school\.nz/, "The student is not emailed");
    assert.match(sent[0].html, /teacher-results\.html\?kit=kit-google-drawings&amp;student=student%40school\.nz/);
    assert.match(sent[0].html, /Aroha &lt;Smith&gt;/);
    assert.equal(sent[0].emailType, "kit_submission");
    ctx.smtpTransporter = null;
    assert.equal(await ctx.notifyKitSubmission({
        studentEmail: "student@school.nz", kitId: "kit-google-drawings", url: link(0), subject: "Google Drawing - Ship" }), false,
    "No email is attempted without SMTP");
});

test("a teacher-triggered certificate email is built and sent for the student, not the teacher", async () => {
    const calls = [];
    const ctx = vm.createContext({
        smtpTransporter: {}, SMTP_FROM: "hub@school.nz", console,
        normalizeEmail: (value) => String(value || "").trim().toLowerCase(),
        getRequestUserEmail: () => "teacher@school.nz",
        kitPublication: { available: async () => true },
        getStoredPracticalSkillsKitContent: async () => ({ id: "content" }),
        syncPracticalSkillsKitCompletion: async (email) => { calls.push(["sync", email]); return { completed: true }; },
        getPracticalSkillsStudentName: async (_req, email) => { calls.push(["name", email]); return "Aroha Smith"; },
        buildKitCertificate: (_content, _row, name) => ({ name }),
        emailKitCertificateOnce: async (email, kitId, certificate) => { calls.push(["email", email, kitId, certificate.name]); return true; }
    });
    const slice = (name, end) => { const start = source.indexOf(`async function ${name}(`); return source.slice(start, source.indexOf(end, start)); };
    vm.runInContext(slice("getPracticalSkillsCertificate", "\nasync function getPracticalSkillsStudentName(") +
        slice("autoEmailKitCertificate", "\n// Throws on send failure"), ctx);
    assert.equal(await ctx.autoEmailKitCertificate({}, "kit-google-drawings", undefined, "Student@school.nz"), true);
    assert.deepEqual(calls, [["sync", "student@school.nz"], ["name", "student@school.nz"],
        ["email", "student@school.nz", "kit-google-drawings", "Aroha Smith"]]);
});

async function fixture(t) {
    const kit = B.withFilesFoldersLinks(base()), email = "student@school.nz", kitId = "kit-google-drawings";
    const progress = { student_email: email, kit_id: kitId, completed: false, completed_activities: {}, started_at: null,
        responses: Object.fromEntries([0, 1, 2].map((i) => [`${i}-blocks`, answer(kit, i, link(i))])) };
    const checks = new Map(), submissions = new Map(), notices = [], certificateEmails = [], filings = [], filedDrawings = new Map();
    let tables = false, emailFails = false, fileFails = false, fileReason = "";
    const key = (params) => JSON.stringify([params[0], params[1], Number(params[2]), params[3], params[4]]);
    const subKey = (params) => JSON.stringify([params[0], params[1], Number(params[2])]);
    const pool = { async query(sql, params) {
        if (sql.startsWith("CREATE TABLE")) { tables = true; return { rows: [] }; }
        if (sql.startsWith("ALTER TABLE practical_skills_")) return { rows: [] };
        if (sql.startsWith("SELECT kit_id, activity_index, document_key, filed_document_key")) {
            return { rows: [...submissions.values()].filter((row) => row.student_email === params[0] && row.document_key.startsWith("google-file:")) };
        }
        if (sql.startsWith("SELECT kit_id, responses FROM practical_skills_progress")) {
            return { rows: params[0] === email ? [{ kit_id: kitId, responses: structuredClone(progress.responses) }] : [] };
        }
        if (sql.startsWith("SELECT document_key, synced, reason FROM practical_skills_filed_drawings")) {
            return { rows: [...filedDrawings.values()].filter((row) => row.student_email === params[0] && (!params[1] || row.document_key === params[1])) };
        }
        if (sql.startsWith("SELECT student_email, document_key, synced, reason FROM practical_skills_filed_drawings")) {
            return { rows: [...filedDrawings.values()] };
        }
        if (sql.startsWith("INSERT INTO practical_skills_filed_drawings")) {
            filedDrawings.set(`${params[0]}|${params[1]}`, { student_email: params[0], document_key: params[1], synced: params[2], reason: params[3] });
            return { rows: [] };
        }
        if (sql.startsWith("UPDATE practical_skills_submissions SET filed_document_key")) {
            const row = submissions.get(subKey(params));
            if (row?.document_key === params[3]) row.filed_document_key = params[3];
            return { rows: [] };
        }
        if (sql.startsWith("SELECT to_regclass")) return { rows: [{ checks_table: tables ? "c" : null, submissions_table: tables ? "s" : null }] };
        if (sql.startsWith("SELECT content")) return { rows: [{ content: kit }] };
        if (sql.startsWith("SELECT responses")) return { rows: [{ responses: structuredClone(progress.responses) }] };
        if (sql.startsWith("SELECT student_email, started_at, responses")) return { rows: [structuredClone(progress)] };
        if (sql.startsWith("SELECT student_email, activity_index, document_key, policy")) return { rows: [...checks.values()] };
        if (sql.startsWith("SELECT student_email, activity_index, document_key, submitted_at")) return { rows: [...submissions.values()] };
        if (sql.startsWith("SELECT document_key, policy")) { const row = checks.get(key(params)); return { rows: row ? [row] : [] }; }
        if (sql.startsWith("SELECT document_key, submitted_at")) {
            const row = submissions.get(subKey(params));
            return { rows: row && row.document_key === params[3] ? [row] : [] };
        }
        if (sql.startsWith("SELECT notified_document_key")) { const row = submissions.get(subKey(params)); return { rows: row ? [row] : [] }; }
        if (sql.startsWith("INSERT INTO practical_skills_submissions")) {
            const [student_email, kit_id, activity_index, document_key, url] = params;
            const old = submissions.get(subKey(params));
            submissions.set(subKey(params), { ...old, student_email, kit_id, activity_index, document_key, url, submitted_at: new Date().toISOString() });
            return { rows: [] };
        }
        if (sql.startsWith("UPDATE practical_skills_submissions")) { submissions.get(subKey(params)).notified_document_key = params[3]; return { rows: [] }; }
        if (sql.startsWith("DELETE FROM practical_skills_submissions")) { submissions.delete(subKey(params)); return { rows: [] }; }
        if (sql.startsWith("INSERT INTO practical_skills_document_checks")) {
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
            if (complete) progress.completed_activities[index] = new Date().toISOString(); else delete progress.completed_activities[index];
            return progress;
        }
    });
    vm.runInContext(source.slice(source.indexOf("async function syncPracticalSkillsKitCompletion("),
        source.indexOf("\nasync function getPracticalSkillsCertificate(")), ctx);
    const sync = async () => Object.assign(progress, await ctx.syncPracticalSkillsKitCompletion(email, kitId, kit));
    const deps = {
        pool, getDefaultPracticalSkillsKitContent: () => ({}), syncCompletion: sync,
        normalizeEmail: (value) => String(value || "").toLowerCase(), schoolDomain: "school.nz",
        getRequestUserEmail: (req) => req.headers["x-user-email"] || email,
        requireAdminAccess(req, res, next) { if (req.headers["x-teacher"] !== "yes") return res.sendStatus(403); next(); },
        canReview: async (who) => who === "teacher@school.nz",
        verifyDriveTokenForStudent: async (token) => {
            if (token !== "student-token") throw Object.assign(new Error("Google sign-in expired. Sign in again and retry."), { status: 401 });
        },
        driveApiRequest: async () => { throw new Error("Drawings are never downloaded"); },
        fetchFile: async () => { throw new Error("Drawings are never downloaded"); },
        autoEmailKitCertificate: async (req, kitId, certificate, studentEmail) => {
            certificateEmails.push({ requester: req.headers["x-user-email"], kitId, certificate, studentEmail });
        },
        notifySubmission: async (notice) => {
            notices.push(notice);
            if (emailFails) throw new Error("SMTP down");
            return true;
        },
        fileSubmission: async (request) => {
            filings.push(request);
            if (fileFails) throw new Error("Drive down");
            if (fileReason) return { filed: false, reason: fileReason };
            return { filed: true, path: ["WHS-DTECH", "MiddleDTECH", "KITS", "Google Drawings"] };
        }
    };
    const verification = createDocumentVerification(deps);
    ctx.documentVerification = verification;
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => { req.auth_identity = { email: req.headers["x-user-email"] || email, verified: true }; next(); });
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
    const request = async (route, method = "GET", body, headers = {}) => {
        const response = await fetch(`http://127.0.0.1:${server.address().port}${route}`, { method,
            headers: { "Content-Type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
        return { status: response.status, data: await response.json().catch(() => null) };
    };
    const teacherHeaders = { "x-teacher": "yes", "x-user-email": "teacher@school.nz" };
    return {
        kit, progress, sync, request, notices, certificateEmails, filings, failEmail: (value) => { emailFails = value; },
        failFiling: (value) => { fileFails = value; },
        filingReason: (value) => { fileReason = value; },
        legacyFiled: (index) => {
            const document_key = B.documentLinkKey(link(index));
            filedDrawings.set(`${email}|${document_key}`, { student_email: email, document_key, synced: false, reason: null });
        },
        pendingFiling: () => request("/api/practical-skills/drawing-filing"),
        fileAll: (body) => request("/api/practical-skills/drawing-filing", "POST", body),
        setLink: (i, url) => { progress.responses[`${i}-blocks`] = answer(kit, i, url); },
        submit: (i, body = {}) => request(`/api/practical-skills/blocks/${kitId}/${i}/submit`, "POST", body),
        status: (i) => request(`/api/practical-skills/blocks/${kitId}/${i}/document-check`),
        check: (i) => request(`/api/practical-skills/blocks/${kitId}/${i}/document-check`, "POST", { driveAccessToken: "student-token" }),
        list: (headers = teacherHeaders) => request(`/api/admin/kit-submissions?kits=${kitId},kit-bad_id`, "GET", undefined, headers),
        approve: (i, approved = true, url = link(i)) => request(`/api/admin/kit-document-review/${kitId}/${i}`, "PUT",
            { email, documentKey: B.documentLinkKey(url), approved }, teacherHeaders)
    };
}

test("Submit records the current link and emails the teacher once per link without ticking the activity", async (t) => {
    const f = await fixture(t);
    const blocked = await f.check(0);
    assert.equal(blocked.status, 409, "No automatic drawing check");
    assert.match(blocked.data.error, /Press Submit/);
    assert.equal((await f.status(0)).data.submission, null);
    const first = await f.submit(0);
    assert.equal(first.status, 200);
    assert.equal(first.data.emailed, true);
    assert.equal(first.data.submission.documentKey, B.documentLinkKey(link(0)));
    assert.ok(first.data.submission.submittedAt);
    assert.equal(f.notices.length, 1);
    assert.deepEqual({ ...f.notices[0] }, { studentEmail: "student@school.nz", kitId: "kit-google-drawings", index: 0,
        url: link(0), subject: "Google Drawing - Ship" });
    assert.equal((await f.status(0)).data.submission.documentKey, B.documentLinkKey(link(0)));
    await f.sync();
    assert.deepEqual(f.progress.completed_activities, {}, "Submitting never ticks Completed");
    const again = await f.submit(0);
    assert.equal(again.status, 200);
    assert.equal(again.data.emailed, false, "Resubmitting the same link does not email again");
    assert.equal(f.notices.length, 1);
    f.setLink(0, link(7));
    assert.equal((await f.status(0)).data.submission, null, "A changed link is not submitted yet");
    assert.equal((await f.submit(0)).data.emailed, true, "A new link emails again");
    assert.equal(f.notices.length, 2);
    f.setLink(1, link(7));
    const duplicate = await f.submit(1);
    assert.equal(duplicate.status, 422, "The same drawing cannot be submitted for two activities");
    f.setLink(1, "http://example.test/work");
    assert.equal((await f.submit(1)).status, 422);
    f.setLink(1, link(1));
    f.failEmail(true);
    const failed = await f.submit(1);
    assert.equal(failed.status, 200, "An email failure does not block the submission");
    assert.equal(failed.data.emailed, false);
    f.failEmail(false);
    assert.equal((await f.submit(1)).data.emailed, true, "A failed email is retried on the next Submit");
});

test("Saved becomes Submitted only after successful sync, for students and teachers", async (t) => {
    const f = await fixture(t);
    const teacherEntry = async (index) => (await f.list()).data.kits[0].students["student@school.nz"][index];
    assert.equal((await f.status(0)).data.filing.filed, false, "A saved link is not synced");
    await f.submit(0);
    await f.approve(0);
    assert.equal((await teacherEntry(0)).completed, true);
    assert.equal((await teacherEntry(0)).filed, false, "Teacher completion is independent of filing");
    f.failFiling(true);
    await f.submit(0, { driveAccessToken: "student-token" });
    assert.equal((await f.status(0)).data.filing.filed, false);
    f.failFiling(false);
    await f.fileAll({ driveAccessToken: "student-token" });
    assert.equal((await f.status(0)).data.filing.filed, true, "Successful reminder sync persists");
    assert.equal((await teacherEntry(0)).filed, true, "Teacher refresh sees the same sync result");
    assert.equal((await teacherEntry(0)).completed, true, "Sync preserves the teacher tick");
    assert.equal((await f.status(1)).data.submission, null);
    assert.equal((await f.status(1)).data.filing.filed, true, "A filed saved link need not have an old Submit record");
    f.setLink(0, link(8));
    assert.equal((await f.status(0)).data.filing.filed, false, "Replacing the link resets its sync status");
    assert.equal((await teacherEntry(0)).filed, false);
    f.setLink(2, link(10));
    f.filingReason("not-owner");
    await f.submit(2, { driveAccessToken: "student-token" });
    assert.equal((await f.status(2)).data.filing.reason, "not-owner");
    assert.equal((await teacherEntry(2)).filed, false, "Resolved reminder does not mean successful sync");
    f.filingReason("");
    f.legacyFiled(1);
    assert.equal((await f.status(1)).data.filing.filed, false, "Legacy markers are not falsely treated as sync success");
    assert.ok((await f.pendingFiling()).data.pending.some((item) => item.index === 1), "Legacy marker can be rechecked");
    await f.fileAll({ driveAccessToken: "student-token" });
    assert.equal((await f.status(1)).data.filing.filed, true);
});

test("drawing activity shows Saved, permits Sync after Completed, and updates after reminder sync", () => {
    const source = fs.readFileSync(path.join(__dirname, "..", "practical-skills", "kit-worksheet.js"), "utf8");
    const kit = base();
    kit.activities = [{ documentCheck: POLICY, blocks: [{ id: "link", kind: "studentlink" }] }];
    const elements = new Map();
    const el = (id) => {
        if (!elements.has(id)) elements.set(id, { textContent: "", classList: { toggle() {} }, setAttribute() {}, removeAttribute() {} });
        return elements.get(id);
    };
    const listeners = {};
    const context = vm.createContext({
        state: { email: "student@school.nz", kitId: "kit-google-drawings", content: kit, completedActivities: {}, submissions: {},
            drawingFiling: {}, progressLoaded: true, responses: { "0-blocks": { link: link(0) } } },
        preview: false,
        getCurrentActivityIndex: () => 0,
        isTeacherReview: () => true,
        normalizeEmail: (value) => String(value || "").toLowerCase(),
        document: { getElementById: el },
        window: { ActivityBlocks: B, KitWorksheetRender: { visibleLoginSites: () => [] },
            addEventListener: (name, handler) => { listeners[name] = handler; } }
    });
    const extract = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
    vm.runInContext(extract("    function updateActivityCompleteBar()", "    function blockPath(") +
        extract("    function showDocumentVerification(", "    async function submitForReview(") +
        extract('    window.addEventListener("hub-drawings-filed"', "\n    function normalizeEmail("), context);
    const state = context.state, key = B.documentLinkKey(link(0));
    context.updateActivityCompleteBar();
    assert.equal(el("worksheet-activity-status-pill").textContent, "Saved - sync needed");
    state.submissions[0] = { documentKey: key, submittedAt: "2026-11-05T00:00:00Z" };
    context.updateActivityCompleteBar();
    assert.equal(el("worksheet-activity-complete-btn").textContent, "Sync drawing");
    assert.equal(el("worksheet-activity-complete-btn").disabled, false);
    state.completedActivities[0] = "teacher-tick";
    context.updateActivityCompleteBar();
    assert.equal(el("worksheet-activity-status-pill").textContent, "Completed");
    assert.equal(el("worksheet-activity-complete-btn").disabled, false, "A teacher tick cannot block sync");
    context.showDocumentVerification(null, state.submissions[0]);
    assert.match(el("worksheet-document-check-status").textContent, /Saved - sync needed/);
    listeners["hub-drawings-filed"]({ detail: { email: "someone@school.nz", results: [{ documentKey: key, filed: true }] } });
    assert.equal(state.drawingFiling[key], undefined, "Other-account event cannot change this student");
    listeners["hub-drawings-filed"]({ detail: { email: state.email, results: [{ documentKey: key, filed: true }] } });
    assert.equal(el("worksheet-activity-complete-btn").textContent, "Submitted - synced");
    assert.equal(el("worksheet-activity-complete-btn").disabled, true);
    assert.match(el("worksheet-document-check-status").textContent, /Submitted - synced/);
    delete state.completedActivities[0];
    context.updateActivityCompleteBar();
    assert.equal(el("worksheet-activity-status-pill").textContent, "Submitted - synced");
    state.responses["0-blocks"].link = link(7);
    context.updateActivityCompleteBar();
    assert.equal(el("worksheet-activity-status-pill").textContent, "Saved - sync needed");
    assert.equal(el("worksheet-activity-complete-btn").disabled, false);
});

test("Submit with Drive permission files the drawing, and a filing failure never blocks the submission", async (t) => {
    const f = await fixture(t);
    const none = await f.submit(0);
    assert.equal(none.status, 200);
    assert.equal(f.filings.length, 0, "Without Drive permission nothing is moved");
    assert.equal(none.data.filing.filed, false);
    const filed = await f.submit(1, { driveAccessToken: "student-token" });
    assert.equal(filed.status, 200);
    assert.deepEqual({ ...f.filings[0] }, { studentEmail: "student@school.nz", documentKey: B.documentLinkKey(link(1)),
        activityTitle: "TV", driveAccessToken: "student-token" });
    assert.deepEqual([...filed.data.filing.path], ["WHS-DTECH", "MiddleDTECH", "KITS", "Google Drawings"]);
    f.failFiling(true);
    const failed = await f.submit(2, { driveAccessToken: "student-token" });
    assert.equal(failed.status, 200, "Drive problems never stop the teacher getting the submission");
    assert.equal(failed.data.emailed, true);
    assert.equal(failed.data.filing.filed, false);
    assert.equal(failed.data.filing.reason, "error");
});

test("drawing filing helper moves only owned drawings into KITS > Google Drawings and renames them", async () => {
    const calls = [];
    let file;
    const ctx = vm.createContext({
        normalizeEmail: (value) => String(value || "").trim().toLowerCase(),
        verifyDriveTokenForStudent: async (token, email) => { calls.push(["verify", token, email]); return { name: "Google Name" }; },
        driveApiRequest: async (route, options) => {
            calls.push([options.method || "GET", route, options.queryParams, options.body]);
            return options.method === "PATCH" ? { id: "d1" } : file;
        },
        getStudentProgrammeFolder: async () => "MiddleDTECH",
        ensureStudentCourseFolders: async () => ({ kits: { id: "kits" } }),
        withResearchReportLock: async (_key, run) => run(),
        driveEnsureFolder: async (parent, name) => { calls.push(["folder", parent, name]); return { id: "drawings" }; },
        getResearchReportStudentDetails: async () => ({ studentName: "Aroha Smith" })
    });
    const start = source.indexOf("const KIT_DRAWINGS_FOLDER_NAME");
    assert.ok(start > 0);
    vm.runInContext(`${source.slice(start, source.indexOf("\nconst documentVerification", start))}; this.fileDrawing = fileKitDrawingSubmission;`, ctx);
    const run = () => ctx.fileDrawing({ studentEmail: "Student@school.nz", documentKey: "google-file:d1", activityTitle: "Ship", driveAccessToken: "tok" });

    file = { id: "d1", name: "Untitled drawing", mimeType: "application/vnd.google-apps.drawing", parents: ["my-drive"], ownedByMe: true };
    const moved = await run();
    assert.equal(moved.filed, true);
    assert.equal(moved.moved, true);
    assert.deepEqual([...moved.path], ["WHS-DTECH", "MiddleDTECH", "KITS", "Google Drawings"]);
    assert.deepEqual(calls.find((call) => call[0] === "folder"), ["folder", "kits", "Google Drawings"]);
    const patch = calls.find((call) => call[0] === "PATCH");
    assert.equal(patch[2].addParents, "drawings");
    assert.equal(patch[2].removeParents, "my-drive");
    assert.deepEqual({ ...patch[3] }, { name: "Ship - Aroha Smith" });

    calls.length = 0;
    file = { ...file, name: "Ship - Aroha Smith", parents: ["drawings"] };
    assert.equal((await run()).moved, false);
    assert.equal(calls.some((call) => call[0] === "PATCH"), false, "An already-filed drawing is left alone");

    calls.length = 0;
    file = { ...file, parents: ["someone"], ownedByMe: false };
    assert.equal((await run()).reason, "not-owner");
    assert.equal(calls.some((call) => call[0] === "PATCH" || call[0] === "folder"), false, "Other people's drawings are never moved");

    file = { ...file, ownedByMe: true, mimeType: "application/vnd.google-apps.document" };
    assert.equal((await run()).reason, "not-drawing");
    file = { ...file, mimeType: "application/vnd.google-apps.drawing", trashed: true };
    assert.equal((await run()).reason, "missing", "Deleted drawings stop the reminder instead of nagging forever");
    assert.equal((await ctx.fileDrawing({ studentEmail: "s@school.nz", documentKey: "https://example.test/x", driveAccessToken: "tok" })).filed, false);
});

test("login reminder lists every saved or submitted drawing, including ones never submitted, until each is moved", async (t) => {
    const f = await fixture(t);
    const titles = (items) => items.map((item) => item.title);
    const saved = await f.pendingFiling();
    assert.equal(saved.status, 200);
    assert.deepEqual(saved.data.pending, [{ kitId: "kit-google-drawings", index: 0, title: "Ship" },
        { kitId: "kit-google-drawings", index: 1, title: "TV" }, { kitId: "kit-google-drawings", index: 2, title: "Flower Pot" }],
    "Saved-but-not-submitted drawings still need moving");
    await f.submit(0, { driveAccessToken: "student-token" });
    assert.deepEqual(titles((await f.pendingFiling()).data.pending), ["TV", "Flower Pot"], "Drawings filed on Submit are not listed");
    await f.submit(1);
    f.setLink(1, link(9));
    assert.deepEqual(titles((await f.pendingFiling()).data.pending), ["TV", "TV", "Flower Pot"],
        "A replaced submitted drawing and the newly saved one both need moving");
    f.setLink(1, link(1));
    assert.deepEqual(titles((await f.pendingFiling()).data.pending), ["TV", "Flower Pot"], "The same drawing is listed once");
    assert.equal((await f.fileAll({})).status, 400, "Drive permission is required");
    assert.equal((await f.fileAll({ driveAccessToken: "expired" })).status, 401);
    f.filings.length = 0;
    f.failFiling(true);
    const failed = await f.fileAll({ driveAccessToken: "student-token" });
    assert.equal(failed.status, 200);
    assert.equal(failed.data.pending.length, 2, "Temporary Drive errors keep the reminder");
    f.failFiling(false);
    f.filingReason("not-owner");
    await f.submit(2, { driveAccessToken: "student-token" });
    f.filingReason("");
    f.filings.length = 0;
    const done = await f.fileAll({ driveAccessToken: "student-token" });
    assert.equal(done.status, 200);
    assert.deepEqual(done.data.pending, [], "Once sorted the reminder disappears");
    assert.deepEqual(done.data.results.map((result) => [result.title, result.filed]), [["TV", true]]);
    assert.deepEqual(f.filings.map((request) => request.documentKey), [B.documentLinkKey(link(1))]);
    assert.deepEqual((await f.pendingFiling()).data.pending, []);
    f.setLink(0, "https://docs.google.com/drawings/d/new-ship/edit");
    assert.deepEqual(titles((await f.pendingFiling()).data.pending), ["Ship"], "A newly saved drawing brings the reminder back");
});

test("teacher submissions list and Completed ticks drive kit completion and the certificate", async (t) => {
    const f = await fixture(t);
    assert.equal((await f.list({})).status, 403);
    await f.submit(0);
    const listed = await f.list();
    assert.equal(listed.status, 200);
    assert.equal(listed.data.kits.length, 1);
    const [kit] = listed.data.kits;
    assert.equal(kit.id, "kit-google-drawings");
    assert.deepEqual(kit.activities, [{ index: 0, title: "Ship" }, { index: 1, title: "TV" }, { index: 2, title: "Flower Pot" }]);
    const mine = kit.students["student@school.nz"];
    assert.equal(mine[0].url, link(0));
    assert.ok(mine[0].submittedAt);
    assert.equal(mine[0].completed, false);
    assert.equal(mine[1].submittedAt, null, "Link saved but not submitted");
    for (const index of [0, 1]) {
        const ticked = await f.approve(index);
        assert.equal(ticked.status, 200);
        assert.equal(ticked.data.verification.passed, true);
        assert.match(ticked.data.verification.feedback.message, /marked it Completed/);
        assert.ok(ticked.data.completedActivities[index]);
        assert.equal(certificates.buildKitCertificate(f.kit, f.progress, "Student"), null);
    }
    assert.equal((await f.list()).data.kits[0].students["student@school.nz"][0].completed, true);
    assert.equal((await f.approve(2, true, link(9))).status, 409, "A stale link cannot be ticked");
    assert.equal(f.certificateEmails.length, 0, "No certificate email until every activity is Completed");
    const last = await f.approve(2);
    assert.equal(last.data.kitCompleted, true);
    assert.deepEqual(f.certificateEmails, [{ requester: "teacher@school.nz", kitId: "kit-google-drawings",
        certificate: undefined, studentEmail: "student@school.nz" }], "The final teacher tick emails the student's certificate");
    await f.sync();
    assert.equal(f.progress.completed, true);
    assert.equal(certificates.buildKitCertificate(f.kit, f.progress, "Student").activityCount, 3);
    const removed = await f.approve(0, false);
    assert.match(removed.data.verification.feedback.message, /press Submit again/);
    await f.sync();
    assert.equal(f.progress.completed, false, "Removing the Completed tick removes the activity tick");
    assert.equal(f.certificateEmails.length, 1, "Removing a tick never emails a certificate");
    assert.equal((await f.status(0)).data.submission, null, "The student can Submit the same link again after a removed tick");
    assert.equal((await f.submit(0)).data.emailed, true, "Resubmitting after a removed tick emails the teacher");
});

test("student and teacher pages use the teacher-ticked drawing policy, amber Submitted state and submissions list", () => {
    const read = (file) => fs.readFileSync(path.join(__dirname, "..", "practical-skills", file), "utf8");
    const worksheet = read("kit-worksheet.js"), teacher = read("teacher-results.js"), css = read("kit-worksheet.css");
    for (const text of [worksheet, teacher, read("kit-worksheet-render.js")]) {
        assert.doesNotMatch(text, /google-drawing-shapes-v1|Check my drawing/);
        assert.match(text, /google-drawing-teacher-v1/);
    }
    assert.match(worksheet, /\/submit`/);
    assert.match(worksheet, /"Saved - sync needed"/);
    assert.match(worksheet, /"Submitted - synced"/);
    assert.match(worksheet, /"Sync drawing"/);
    assert.match(css, /\.worksheet-status-pill\.is-saved[^}]*#f59e0b/);
    assert.match(css, /\.worksheet-status-pill\.is-submitted[^}]*#dcfce7/);
    assert.match(css, /#worksheet-activity-complete-btn\.is-submit[^}]*#f59e0b/);
    assert.match(teacher, /\/api\/admin\/kit-submissions\?kits=/);
    assert.match(teacher, /\/api\/admin\/kit-document-review\//);
    assert.match(teacher, /linkParams\.get\("student"\)/);
    assert.match(read("teacher-results.html"), /id="class-submissions-host"/);
});
