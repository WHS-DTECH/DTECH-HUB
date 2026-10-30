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
    const checks = new Map(), submissions = new Map(), notices = [], certificateEmails = [];
    let tables = false, emailFails = false;
    const key = (params) => JSON.stringify([params[0], params[1], Number(params[2]), params[3], params[4]]);
    const subKey = (params) => JSON.stringify([params[0], params[1], Number(params[2])]);
    const pool = { async query(sql, params) {
        if (sql.startsWith("CREATE TABLE")) { tables = true; return { rows: [] }; }
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
        verifyDriveTokenForStudent: async () => { throw new Error("Drawings are never downloaded"); },
        driveApiRequest: async () => { throw new Error("Drawings are never downloaded"); },
        fetchFile: async () => { throw new Error("Drawings are never downloaded"); },
        autoEmailKitCertificate: async (req, kitId, certificate, studentEmail) => {
            certificateEmails.push({ requester: req.headers["x-user-email"], kitId, certificate, studentEmail });
        },
        notifySubmission: async (notice) => {
            notices.push(notice);
            if (emailFails) throw new Error("SMTP down");
            return true;
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
        kit, progress, sync, request, notices, certificateEmails, failEmail: (value) => { emailFails = value; },
        setLink: (i, url) => { progress.responses[`${i}-blocks`] = answer(kit, i, url); },
        submit: (i) => request(`/api/practical-skills/blocks/${kitId}/${i}/submit`, "POST", {}),
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
    assert.match(worksheet, /"Submitted" : "Submit"/);
    assert.match(css, /\.worksheet-status-pill\.is-submitted[^}]*#f59e0b/);
    assert.match(css, /#worksheet-activity-complete-btn\.is-submit[^}]*#f59e0b/);
    assert.match(teacher, /\/api\/admin\/kit-submissions\?kits=/);
    assert.match(teacher, /\/api\/admin\/kit-document-review\//);
    assert.match(teacher, /linkParams\.get\("student"\)/);
    assert.match(read("teacher-results.html"), /id="class-submissions-host"/);
});
