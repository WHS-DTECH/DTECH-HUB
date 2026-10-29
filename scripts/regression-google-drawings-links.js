"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const express = require("express");
const B = require("../practical-skills/activity-blocks");
const { POLICY, MIN_FILLED_SHAPES, checkGoogleDrawingSvg } = require("../practical-skills/drawing-check");
const { createDocumentVerification } = require("../practical-skills/document-verification");
const { registerActivityBlocks } = require("../practical-skills/activity-block-store");
const certificates = require("../practical-skills-certificate");
const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
const images = path.join(__dirname, "..", "practical-skills", "images");
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
const shapes = (count, extra = "") => `<svg xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="c"><path fill="#000" d="m0 0"/></clipPath></defs>` +
    `<path fill="#000000" fill-opacity="0.0" d="m0 0l960 0l0 720l-960 0z"/>` +
    Array.from({ length: count }, (_v, i) => `<path fill="#${String(i).padStart(6, "0")}" d="m${i} 0l10 10z"/>`).join("") + extra + "</svg>";
const guides = [
    ["ship-shapes-reference", "ship-shapes-instructions", "ship-reference.png", "shipShapesReferenceVersion"],
    ["tv-reference", "tv-shapes-instructions", "tv-reference.png", "tvReferenceVersion"],
    ["flower-pot-reference", "flower-pot-shapes-instructions", "flower-pot-reference.png", "flowerPotReferenceVersion"]
];

test("all three drawings gain reference images, shape instructions and a trusted drawing check without losing content", () => {
    const original = base(), before = JSON.stringify(original);
    const content = B.withFilesFoldersLinks(original);
    assert.equal(JSON.stringify(original), before);
    assert.equal(content.publicationLive, false);
    assert.equal(content.activities.length, 3);
    content.activities.forEach((activity, index) => {
        const [imageId, tasksId, file, flag] = guides[index];
        B.validate(activity);
        assert.equal(activity.completionMode, "auto");
        assert.equal(activity.documentCheck, POLICY);
        assert.equal(B.GOOGLE_DRAWING_POLICY, POLICY);
        assert.equal(activity.uniqueDocumentLinks, true);
        assert.equal(activity.drawingCheckVersion, 1);
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
        assert.match(tasks.text, /Check my drawing/);
        assert.match(tasks.text, /cannot judge how similar/);
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

test("upgrading replaces old shape instructions by ID and never re-adds an image a teacher removed", () => {
    const old = B.withGoogleDrawingsLinks(base());
    const downgrade = (activity, keepImage) => {
        const { drawingCheckVersion: _v, documentCheck: _d, ...rest } = activity;
        return { ...rest, shareLinkCompletion: true, blocks: activity.blocks
            .filter((block) => keepImage || block.kind !== "image")
            .map((block) => block.kind === "tasks" ? { ...block, text: "Old link-only text", extra: "kept" } : block) };
    };
    const before = { ...old, activities: [downgrade(old.activities[0], false), downgrade(old.activities[1], true),
        (({ flowerPotReferenceVersion: _f, ...a }) => ({ ...downgrade(a, false) }))(old.activities[2])] };
    const kit = B.withGoogleDrawingsLinks(before);
    const [ship, tv, flower] = kit.activities;
    assert.equal(ship.blocks.some((block) => block.kind === "image"), false, "Teacher-removed Ship image stays removed");
    assert.equal(ship.blocks[0].id, "ship-shapes-instructions");
    assert.equal(ship.blocks[0].extra, "kept");
    assert.match(ship.blocks[0].text, /Check my drawing/);
    assert.equal(tv.blocks.filter((block) => block.id === "tv-reference").length, 1);
    assert.equal(tv.blocks.filter((block) => block.id === "tv-shapes-instructions").length, 1);
    assert.equal(flower.blocks[0].id, "flower-pot-reference", "Flower Pot image is added once on first upgrade");
    kit.activities.forEach((activity) => {
        assert.equal("shareLinkCompletion" in activity, false);
        assert.equal(activity.documentCheck, POLICY);
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
        const file = guides[index][2].replace(".", "\\.");
        const markup = ctx.window.ActivityBlockView.markup(activity.blocks, {}, true);
        assert.match(markup, new RegExp(`<img src="https://dtech-hub2\\.onrender\\.com/practical-skills/images/${file}"`));
        assert.match(markup, /Insert &gt; Shape/);
        assert.equal((markup.match(new RegExp(file, "g")) || []).length, 1);
    });
});

test("a share link alone does not tick; only a matching drawing receipt does, and drawings must differ", () => {
    const content = B.withFilesFoldersLinks(base());
    content.activities.forEach((activity, index) => {
        const responses = { [`${index}-blocks`]: answer(content, index, link(index)) };
        const grade = (documentVerification, url = link(index)) => B.grade(activity, answer(content, index, url), {},
            { content, index, responses, documentVerification });
        const linkOnly = grade();
        assert.equal(linkOnly.passed, false);
        assert.match(JSON.stringify(linkOnly), /Check my drawing/);
        assert.equal(grade(receipt(index)).passed, true);
        assert.equal(grade(receipt(index, "rattlesnakes-v1")).passed, false, "A Rattlesnakes receipt cannot tick a drawing");
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

test("drawing analyzer needs 8 filled shapes, ignores definitions and transparent backgrounds, and rejects pictures", () => {
    const pass = checkGoogleDrawingSvg(shapes(MIN_FILLED_SHAPES));
    assert.equal(pass.passed, true);
    assert.equal(pass.filledShapes, 8, "clipPath and transparent background are not counted");
    assert.match(pass.message, /does not judge visual similarity/);
    const few = checkGoogleDrawingSvg(shapes(7));
    assert.equal(few.passed, false);
    assert.match(few.message, /Found 7 filled shapes/);
    const lines = checkGoogleDrawingSvg(`<svg>${'<line stroke="#000" x1="0" x2="9"/><path fill="none" stroke="#111" d="m0 0"/>'.repeat(20)}</svg>`);
    assert.equal(lines.passed, false);
    assert.equal(lines.filledShapes, 0);
    assert.equal(lines.outlineOnly, 40);
    const styled = checkGoogleDrawingSvg(`<svg>${'<rect style="fill:#f00;stroke:none"/>'.repeat(8)}</svg>`);
    assert.equal(styled.passed, true);
    const hidden = checkGoogleDrawingSvg(`<svg>${'<rect fill="#f00" opacity="0"/>'.repeat(8)}</svg>`);
    assert.equal(hidden.passed, false);
    const picture = checkGoogleDrawingSvg(shapes(20, '<image href="data:image/png;base64,AA"/>'));
    assert.equal(picture.passed, false);
    assert.equal(picture.images, 1);
    assert.match(picture.message, /Remove inserted or pasted pictures/);
    assert.throws(() => checkGoogleDrawingSvg("not a drawing"), (error) => error.status === 422);
    assert.throws(() => checkGoogleDrawingSvg(`<svg>${" ".repeat(5 * 1024 * 1024)}</svg>`), /too large/);
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

async function fixture(t) {
    const kit = B.withFilesFoldersLinks(base()), email = "student@school.nz", kitId = "kit-google-drawings";
    const progress = { student_email: email, kit_id: kitId, completed: false, completed_activities: {},
        responses: Object.fromEntries([0, 1, 2].map((i) => [`${i}-blocks`, answer(kit, i, link(i))])) };
    const checks = new Map(), downloads = [];
    let table = false, mimeType = "application/vnd.google-apps.drawing", svg = shapes(12), emails = 0;
    const key = (params) => JSON.stringify([params[0], params[1], Number(params[2]), params[3], params[4]]);
    const pool = { async query(sql, params) {
        if (sql.startsWith("CREATE TABLE")) { table = true; return { rows: [] }; }
        if (sql.startsWith("SELECT to_regclass")) return { rows: [{ checks_table: table ? "checks" : null }] };
        if (sql.startsWith("SELECT content")) return { rows: [{ content: kit }] };
        if (sql.startsWith("SELECT responses")) return { rows: [{ responses: structuredClone(progress.responses) }] };
        if (sql.startsWith("SELECT document_key")) { const row = checks.get(key(params)); return { rows: row ? [row] : [] }; }
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
            if (token !== "student-token") throw Object.assign(new Error("Verify your Google account"), { status: 403 });
        },
        driveApiRequest: async (route) => {
            assert.match(route, /^\/files\/drawing-\d$/);
            return { mimeType, modifiedTime: "stable" };
        },
        fetchFile: async (url) => { downloads.push(url); return new Response(svg); },
        autoEmailKitCertificate: async () => { emails++; }
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
        kit, progress, downloads, sync, request, emails: () => emails,
        setSvg: (value) => { svg = value; }, setMime: (value) => { mimeType = value; },
        check: (i) => request(`/api/practical-skills/blocks/${kitId}/${i}/document-check`, "POST", { driveAccessToken: "student-token" }),
        approve: (i, approved = true) => request(`/api/admin/kit-document-review/${kitId}/${i}`, "PUT",
            { email, documentKey: B.documentLinkKey(link(i)), approved }, teacherHeaders)
    };
}

test("link saves alone leave the kit incomplete; drawing checks export SVG and enable the certificate", async (t) => {
    const f = await fixture(t);
    await f.sync();
    assert.equal(f.progress.completed, false);
    assert.deepEqual(f.progress.completed_activities, {});
    f.setMime("image/png");
    const wrongType = await f.check(0);
    assert.equal(wrongType.status, 422);
    assert.match(wrongType.data.error, /Google Drawing/);
    f.setMime("application/vnd.google-apps.drawing");
    f.setSvg(`<svg>${'<line stroke="#000"/>'.repeat(30)}</svg>`);
    const lineOnly = await f.check(0);
    assert.equal(lineOnly.status, 200);
    assert.equal(lineOnly.data.verification.passed, false);
    assert.equal(lineOnly.data.completedActivities[0], undefined);
    f.setSvg(shapes(12));
    for (const index of [0, 1]) {
        const checked = await f.check(index);
        assert.equal(checked.status, 200);
        assert.equal(checked.data.verification.passed, true);
        assert.equal(checked.data.verification.policy, POLICY);
        assert.ok(checked.data.completedActivities[index]);
        assert.equal(certificates.buildKitCertificate(f.kit, f.progress, "Student"), null);
    }
    assert.ok(f.downloads.every((url) => /^https:\/\/www\.googleapis\.com\/drive\/v3\/files\/drawing-\d\/export\?mimeType=image%2Fsvg%2Bxml$/.test(url)),
        "The submitted URL is never fetched directly");
    const approved = await f.approve(2);
    assert.equal(approved.status, 200);
    await f.sync();
    assert.equal(f.progress.completed, true);
    assert.equal(certificates.buildKitCertificate(f.kit, f.progress, "Student").activityCount, 3);
    await f.approve(2, false);
    await f.sync();
    assert.equal(f.progress.completed, false, "Revoking teacher approval removes the tick");
});
