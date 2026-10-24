"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const express = require("express");
const multer = require("multer");
const B = require("../practical-skills/activity-blocks");
const { registerActivityBlocks } = require("../practical-skills/activity-block-store");
const serverSource = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
const docUrl = "https://docs.google.com/document/d/1234567890123456789012345/edit";
const block = (kind, fields = {}) => ({ id: kind, kind, text: "Describe your work", ...fields });
const puzzleAnswer = (b) => {
    const p = B.puzzle(b);
    return b.kind === "wordsearch" ? p.placed.map((w) => [w.cells[0], w.cells.at(-1)])
        : Object.fromEntries(p.placed.flatMap((w) => w.cells.map(([r, c], i) => [`${r}-${c}`, w.word[i]])));
};
const sampleBlocks = () => [
    block("text"), block("image", { url: "https://example.org/photo.png", alt: "A file" }),
    block("tasks", { text: "Name it\nSave it" }),
    block("question", { questionType: "short-answer", required: true }),
    block("link", { url: "https://example.org/" }), block("resource", { url: "https://example.org/file.pdf" }),
    block("checkbox", { required: true }), block("table", { text: "File | Folder", rows: 2, editable: true, required: true }),
    block("wordsearch", { entries: "FILE\nFOLDER\nSAVE", required: true }),
    block("crossword", { entries: "FILE | A saved item\nFOLDER | Stores files\nSAVE | Keep your work", required: true }),
    block("document", { url: docUrl, required: true }),
    block("studentlink", { required: true })
];

test("all twelve types validate and required interactive blocks govern automatic completion", () => {
    const activity = { completionMode: "auto", blocks: sampleBlocks() };
    B.validate(activity);
    assert.equal(activity.blocks.length, 12);
    const answers = { question: "Any written response", checkbox: true, table: [["A", "B"], ["C", "D"]],
        wordsearch: puzzleAnswer(activity.blocks[8]), crossword: puzzleAnswer(activity.blocks[9]), document: true, studentlink: docUrl };
    assert.equal(B.grade(activity, answers).passed, false, "A client cannot invent a document receipt");
    assert.equal(B.grade(activity, answers, { document: true }).passed, true);
    for (const id of ["question", "checkbox", "table", "wordsearch", "crossword", "studentlink"]) {
        assert.equal(B.grade(activity, { ...answers, [id]: undefined }, { document: true }).passed, false, id);
    }
    assert.equal(B.grade(activity, { ...answers, question: "  " }, { document: true }).passed, false);
    assert.equal(B.grade(activity, { ...answers, table: [["A", ""], ["C", "D"]] }, { document: true }).passed, false);
    assert.equal(B.grade(activity, { ...answers, checkbox: "true" }, { document: true }).passed, false);
});

test("numbered text restarts per block, ignores empty lines and preserves existing plain text", () => {
    const context = vm.createContext({ window: { ActivityBlocks: B }, structuredClone });
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "practical-skills", "activity-block-view.js"), "utf8"), context);
    const markup = context.window.ActivityBlockView.markup([
        block("text", { id: "first", title: "Browser", numbered: true, text: "1. Create it\r\n\r\n2) Name it" }),
        block("text", { id: "second", title: "Windows", numbered: true, text: " 1. Download it\nOpen <Word>" }),
        block("text", { id: "old", text: "Existing\nplain instructions" }),
        block("text", { id: "off", numbered: false, text: "Not\nnumbered" })
    ], {}, true);
    assert.equal((markup.match(/<ol>/g) || []).length, 2);
    assert.equal((markup.match(/<li /g) || []).length, 4);
    assert.match(markup, /<h2>Browser<\/h2><ol>/);
    assert.match(markup, /<h2>Windows<\/h2><ol>/);
    assert.match(markup, /<li class="activity-block-text">Create it<\/li>/);
    assert.match(markup, /Open &lt;Word&gt;/);
    assert.match(markup, /<p class="activity-block-text">Existing\nplain instructions<\/p>/);
    assert.doesNotMatch(markup, />1\. Create|>2\) Name|start="/);
    assert.throws(() => B.validate({ blocks: [block("text", { numbered: "true" })] }), /true or false/);
});

test("student links require a safe HTTPS string and cannot earn ticks with unsafe or missing URLs", () => {
    const activity = { completionMode: "auto", blocks: [block("studentlink", { required: true })] };
    B.validate(activity);
    assert.equal(B.grade(activity, { studentlink: `  ${docUrl}  ` }).passed, true);
    for (const value of ["", " ", "example.org", "http://example.org", "javascript:alert(1)", "data:text/html,test",
        "https://user:pass@example.org", "https://example.org/" + "x".repeat(5000), true, {}, [docUrl]]) {
        assert.equal(B.grade(activity, { studentlink: value }).passed, false, JSON.stringify(value).slice(0, 100));
    }
    const context = vm.createContext({ window: { ActivityBlocks: B }, structuredClone });
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "practical-skills", "activity-block-view.js"), "utf8"), context);
    const render = (value) => context.window.ActivityBlockView.markup(activity.blocks, { studentlink: value }, true);
    assert.match(render(docUrl), /type="url"[^>]* disabled/);
    assert.match(render(docUrl), /data-open-student-link href="https:\/\/docs\.google\.com/);
    assert.match(render('javascript:" onfocus="bad'), /data-open-student-link hidden/);
    assert.doesNotMatch(render('javascript:" onfocus="bad'), /href="javascript| onfocus="bad/);
    assert.match(render("not a URL"), /Enter a full HTTPS link/);
});

test("question choices and checklists are presence checks, not answer-key marking", () => {
    const choice = block("question", { questionType: "multiple-choice", options: ["A", "B"], required: true });
    assert.equal(B.grade({ blocks: [choice] }, { question: "B" }).passed, true);
    assert.equal(B.grade({ blocks: [choice] }, { question: "Other" }).passed, false);
    const checklist = { ...choice, questionType: "checklist" };
    assert.equal(B.grade({ blocks: [checklist] }, { question: ["A"] }).passed, false);
    assert.equal(B.grade({ blocks: [checklist] }, { question: ["A", "B"] }).passed, true);
    assert.equal(B.grade({ blocks: [{ ...choice, required: false }] }, {}).passed, false);
});

test("legacy migration retains response keys, repeated block IDs and original content order", () => {
    const legacy = { questions: [{ id: "answer", prompt: "What?", type: "short-answer" }], images: [{ url: "https://example.org/a", alt: "A" }] };
    assert.equal(B.initialBlocks(legacy, 0, {})[1].responseKey, "answer");
    assert.equal(B.initialBlocks(legacy, 3, {})[1].responseKey, "3-answer");
    assert.deepEqual(B.initialBlocks({ assessmentId: "existing" }, 0, legacy), []);
    const migrated = B.initialBlocks(legacy, 0, {});
    assert.deepEqual(migrated.map((b) => b.kind), ["image", "question"]);
    assert.equal(B.initialBlocks({ blocks: migrated }, 0, {}), migrated);
    assert.equal(B.initialBlocks({}, 0, legacy)[1].text, "What?");
    assert.equal(B.savedAnswers({ blocks: migrated }, 0, { answer: "Saved before migration" })["legacy-q-0"], "Saved before migration");
    assert.equal(B.savedAnswers({ blocks: migrated }, 0, { answer: "Old answer", "0-blocks": { "legacy-q-0": "" } })["legacy-q-0"], "");
    B.validate({ blocks: [block("text"), block("text", { id: "another-text" })] });
});

test("invalid definitions, unassessable auto mode, unsafe links and oversized inputs fail explicitly", () => {
    const invalid = [
        { blocks: null }, { blocks: [null] }, { blocks: [block("constructor")] },
        { blocks: [block("text", { id: "__proto__" })] }, { blocks: [block("text"), block("text")] },
        { completionMode: "unknown", blocks: [] }, { completionMode: "auto" },
        { completionMode: "auto", blocks: [block("text")] },
        { completionMode: "auto", blocks: [block("table", { text: "A | B", required: true })] },
        { blocks: [block("link", { url: "javascript:alert(1)" })] },
        { blocks: [block("image", { url: "https://example.org/a", alt: "" })] },
        { blocks: [block("resource", { url: "https://user:pass@example.org/a" })] },
        { blocks: [block("document", { url: docUrl.replace("/edit", ".evil") })] },
        { blocks: [block("document", { url: docUrl.replace("docs.google.com", "docs.google.com.evil.org") })] },
        { blocks: [block("table", { text: "A | B\nonly one cell" })] },
        { blocks: [block("table", { text: "A", editable: true, rows: -1 })] },
        { blocks: [block("table", { text: "A", editable: true, rows: 0 })] },
        { blocks: [block("question", { questionType: "unknown" })] },
        { blocks: [block("question", { questionType: "multiple-choice", options: ["A", "A"] })] },
        { blocks: [block("crossword", { entries: "FILE" })] },
        { blocks: [block("wordsearch", { entries: "FILE\nfile" })] },
        { blocks: [block("text", { text: "x".repeat(20001) })] }
    ];
    invalid.forEach((activity) => assert.throws(() => B.validate(activity), JSON.stringify(activity).slice(0, 100)));
    B.validate({ blocks: [], completionMode: "manual" });
    B.validate({ assessmentId: "existing", blocks: [], completionMode: "auto" });
});

test("puzzles are deterministic, grade real coordinates and reject incorrect/out-of-range selections", () => {
    for (const kind of ["wordsearch", "crossword"]) {
        const b = block(kind, { required: true, entries: kind === "crossword"
            ? "CAT | A pet\nCAR | A vehicle\nCART | A trolley\nART | A creative subject"
            : "CAT\nCAR\nCART\nART" });
        const puzzle = B.puzzle(b);
        assert.deepEqual(puzzle, B.puzzle(b));
        assert.equal(B.grade({ blocks: [b] }, { [kind]: puzzleAnswer(b) }).passed, true);
        if (kind === "crossword") {
            for (const [i, word] of puzzle.placed.entries()) {
                word.cells.forEach(([r, c], k) => assert.equal(puzzle.grid[r][c], word.word[k]));
                for (const other of puzzle.placed.slice(i + 1)) if (word.direction === other.direction) {
                    assert.equal(word.cells.some(([r, c]) => other.cells.some(([a, d]) => a === r && d === c)), false, "Same-direction answers must not overlap");
                }
            }
        } else {
            const reversed = puzzleAnswer(b).map(([a, z]) => [z, a]);
            assert.equal(B.grade({ blocks: [b] }, { [kind]: reversed }).passed, true);
            for (const value of [true, [null], [[[-1, 0], [0, 0]]], [[[999999, 0], [0, 0]]]]) {
                assert.equal(B.grade({ blocks: [b] }, { [kind]: value }).passed, false);
            }
        }
    }
});

test("student block markup escapes content, keeps order and disables preview controls", () => {
    const context = vm.createContext({ window: { ActivityBlocks: B }, structuredClone });
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "practical-skills", "activity-block-view.js"), "utf8"), context);
    const blocks = sampleBlocks();
    blocks[0].text = '<img src=x onerror="boom">';
    blocks[3].text = "<script>bad</script>";
    blocks[4].url = "javascript:alert(1)";
    const html = context.window.ActivityBlockView.markup(blocks, {}, true);
    assert.match(html, /&lt;img/);
    assert.doesNotMatch(html, /<script>|href="javascript/);
    assert.match(html, /data-create-document disabled/);
    assert.match(html, /data-answer disabled/);
    let last = -1;
    for (const b of blocks) {
        const index = html.indexOf(`data-content-block="${b.id}"`);
        assert.ok(index > last);
        last = index;
    }
});

async function fixture(t) {
    const app = express();
    app.use(express.json());
    const content = { worksheets: [{ activity: "Blocks" }], activities: [{ completionMode: "auto", blocks: [
        block("question", { required: true, questionType: "short-answer" }),
        block("document", { required: true, url: docUrl })
    ] }] };
    const rows = new Map(), receipts = new Map(), locks = new Map(), files = new Map();
    let copies = 0, uploads = 0, shareFails = false;
    const emails = { student: "a@school.nz", other: "b@school.nz", admin: "teacher@school.nz" };
    const deps = {
        requireAdminAccess: (req, res, next) => req.headers["x-user-email"] === emails.admin ? next() : res.status(403).json({ error: "Admin required." }),
        getRequestUserEmail: (req) => req.headers["x-user-email"],
        normalizeEmail: (value) => String(value || "").toLowerCase(), schoolDomain: "school.nz",
        getPracticalSkillsKitDefinition: (id) => id === "kit-test",
        getStoredPracticalSkillsKitContent: async () => structuredClone(content),
        getAllPracticalSkillsProgressRows: async (email) => [...rows.values()].filter((r) => r.student_email === email),
        savePracticalSkillsKitResponses: async (email, kit, responses) => {
            const key = `${email}:${kit}`;
            const row = { ...rows.get(key), student_email: email, kit_id: kit, responses };
            rows.set(key, row); return row;
        },
        setPracticalSkillsActivityCompletion: async (email, kit, index, completed) => {
            const row = rows.get(`${email}:${kit}`);
            row.completed_activities = { ...row.completed_activities };
            if (completed) row.completed_activities[index] = "saved";
            else delete row.completed_activities[index];
            return row;
        },
        syncPracticalSkillsKitCompletion: async () => {}, autoEmailKitCertificate: async () => {},
        getStudentKitDocument: async (email, kit, key) => receipts.get(`${email}:${kit}:${key}`),
        saveStudentKitDocument: async (email, kit, key, row) => receipts.set(`${email}:${kit}:${key}`, row),
        getStudentProgrammeFolder: async () => "JuniorDTECH",
        ensureStudentCourseFolders: async (email) => ({ kits: { id: `${email}-KITS` } }),
        driveGetLiveFile: async (id) => files.get(id) || (id === "1234567890123456789012345" ? { id, mimeType: "application/vnd.google-apps.document" } : null),
        driveFindFileByNameInFolder: async () => null,
        driveCopyFile: async (_template, folder, name) => {
            await new Promise((resolve) => setTimeout(resolve, 5));
            const copy = { id: `copy-${++copies}`, folder, name, mimeType: "application/vnd.google-apps.document" };
            files.set(copy.id, copy); return copy;
        },
        verifyDriveTokenForStudent: async (token, email) => {
            if (token !== `token-${email}`) throw Object.assign(new Error("Google account does not match."), { status: 403 });
        },
        withResearchReportLock: (key, task) => {
            const next = (locks.get(key) || Promise.resolve()).then(task, task);
            const cleanup = () => { if (locks.get(key) === tracked) locks.delete(key); };
            const tracked = next.then(cleanup, cleanup); locks.set(key, tracked); return next;
        },
        driveEnsureFolder: async (_parent, name) => ({ id: name }),
        driveUploadBinaryFile: async (options) => { uploads++; assert.equal(options.folderId, "DTECH Kit Resources"); return { id: "resource", name: options.fileName }; },
        driveApiRequest: async (_url, options) => {
            assert.deepEqual(options.body, { type: "domain", role: "reader", domain: "school.nz", allowFileDiscovery: false });
            if (shareFails) throw new Error("Sharing disabled.");
        },
        upload: multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024, files: 1 } })
    };
    registerActivityBlocks(app, deps);
    const server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const request = async (suffix, body, email = emails.student, multipart = false) => {
        const result = await fetch(`http://127.0.0.1:${server.address().port}${suffix.startsWith("/api") ? suffix : `/api/practical-skills/blocks/kit-test/0${suffix}`}`, {
            method: "POST", headers: { "x-user-email": email, ...(multipart ? {} : { "Content-Type": "application/json" }) },
            body: multipart ? body : JSON.stringify(body)
        });
        return { status: result.status, body: await result.json() };
    };
    return { request, rows, receipts, content, emails, files, copies: () => copies, uploads: () => uploads, failSharing: () => { shareFails = true; } };
}

test("block API persists answers, verifies receipts, reverses incomplete ticks and preserves manual/specialised modes", async (t) => {
    const f = await fixture(t);
    assert.equal((await f.request("/check", { answers: {} }, "outsider@example.com")).status, 401);
    assert.equal((await f.request("/check", { answers: [] })).status, 400);
    let result = await f.request("/check", { answers: { question: "Work", document: true } });
    assert.equal(result.body.passed, false);
    assert.equal(result.body.completedActivities[0], undefined);
    await f.request("/documents/document", { driveAccessToken: `token-${f.emails.student}` });
    result = await f.request("/check", { answers: { question: "Work" } });
    assert.equal(result.body.passed, true);
    assert.equal(result.body.completedActivities[0], "saved");
    result = await f.request("/check", { answers: { question: "" } });
    assert.equal(result.body.completedActivities[0], undefined);
    assert.equal(f.rows.get(`${f.emails.student}:kit-test`).responses["0-blocks"].question, "");
    f.content.activities[0].completionMode = "manual";
    result = await f.request("/check", { answers: { question: "Work" } });
    assert.equal(result.body.passed, true);
    assert.equal(result.body.completedActivities[0], undefined, "Manual mode must not acquire an automatic tick");
    f.content.activities[0].completionMode = "auto";
    f.content.activities[0].assessmentId = "existing";
    result = await f.request("/check", { answers: { question: "Work" } });
    assert.equal(result.body.completedActivities[0], undefined, "Specialised marking must not be overridden");
});

test("document API verifies identity, reuses copies concurrently and isolates students", async (t) => {
    const f = await fixture(t);
    assert.equal((await f.request("/documents/document", { driveAccessToken: "wrong" })).status, 403);
    assert.equal((await f.request("/documents/not-found", {})).status, 404);
    const payload = { driveAccessToken: `token-${f.emails.student}` };
    const pair = await Promise.all([f.request("/documents/document", payload), f.request("/documents/document", payload)]);
    assert.equal(pair[0].status, 200);
    assert.equal(pair[0].body.documentUrl, pair[1].body.documentUrl);
    assert.equal(f.copies(), 1);
    assert.equal((await f.request("/documents/document", payload)).body.created, false);
    const own = await f.request("/documents/document", { driveAccessToken: `token-${f.emails.other}` }, f.emails.other);
    assert.notEqual(own.body.documentUrl, pair[0].body.documentUrl);
    assert.equal(f.copies(), 2);
    assert.deepEqual([...f.files.values()].map((file) => file.folder), [`${f.emails.student}-KITS`, `${f.emails.other}-KITS`]);
    f.content.activities[0].blocks[1].url = "https://evil.example/document/d/1234567890123456789012345";
    assert.equal((await f.request("/documents/document", payload)).status, 500);
});

test("student links persist through API save/reload and required auto ticks reject invalid replacements", async (t) => {
    const f = await fixture(t);
    f.content.activities[0].blocks = [block("studentlink", { required: true })];
    let result = await f.request("/check", { answers: { studentlink: docUrl } });
    assert.equal(result.body.passed, true);
    assert.equal(result.body.completedActivities[0], "saved");
    const saved = f.rows.get(`${f.emails.student}:kit-test`).responses;
    assert.equal(B.savedAnswers(f.content.activities[0], 0, saved).studentlink, docUrl);
    for (const url of ["", "http://example.org", "javascript:alert(1)"]) {
        result = await f.request("/check", { answers: { studentlink: url } });
        assert.equal(result.body.passed, false);
        assert.equal(result.body.completedActivities[0], undefined);
        assert.equal(f.rows.get(`${f.emails.student}:kit-test`).responses["0-blocks"].studentlink, url);
    }
    f.content.activities[0].completionMode = "manual";
    result = await f.request("/check", { answers: { studentlink: docUrl } });
    assert.equal(result.body.completedActivities[0], undefined, "Link saves must not override manual mode");
    result = await f.request("/check", { answers: { studentlink: "https://example.org/student-b" } }, f.emails.other);
    assert.equal(f.rows.get(`${f.emails.student}:kit-test`).responses["0-blocks"].studentlink, docUrl);
    assert.equal(f.rows.get(`${f.emails.other}:kit-test`).responses["0-blocks"].studentlink, "https://example.org/student-b");
});

test("resource uploads enforce admin, file type, 15 MB, account identity and explicit sharing failures", async (t) => {
    const f = await fixture(t);
    const url = "/api/admin/practical-skills/block-resource";
    const form = (name = "worksheet.pdf", size = 4, token = `token-${f.emails.admin}`) => {
        const body = new FormData();
        body.append("driveAccessToken", token);
        body.append("file", new Blob([new Uint8Array(size)], { type: "application/pdf" }), name);
        return body;
    };
    assert.equal((await f.request(url, form(), f.emails.student, true)).status, 403);
    assert.equal((await f.request(url, form("bad.html"), f.emails.admin, true)).status, 400);
    assert.equal((await f.request(url, form("large.pdf", 15 * 1024 * 1024 + 1), f.emails.admin, true)).status, 400);
    assert.equal((await f.request(url, form("worksheet.pdf", 4, "wrong"), f.emails.admin, true)).status, 403);
    assert.equal(f.uploads(), 0);
    const result = await f.request(url, form(), f.emails.admin, true);
    assert.equal(result.status, 200);
    assert.equal(result.body.url, "https://drive.google.com/file/d/resource/view");
    f.failSharing();
    const failure = await f.request(url, form(), f.emails.admin, true);
    assert.equal(failure.status, 500);
    assert.match(failure.body.error, /uploaded.*sharing failed/i);
});

test("server completion guards prevent bypass and recompute stale automatic ticks", async () => {
    const from = serverSource.indexOf("async function syncPracticalSkillsKitCompletion(");
    const to = serverSource.indexOf("\nasync function getPracticalSkillsCertificate(", from);
    const activity = { completionMode: "auto", blocks: [block("checkbox", { required: true })] };
    let row = { responses: { "0-blocks": { checkbox: false } }, completed_activities: { 0: "old tick" } };
    const context = vm.createContext({
        ActivityBlocks: B, visibleActivityIndexes: () => ["0"], hasDatabase: false,
        kitPublication: { available: async () => true },
        ensurePracticalSkillsProgressRow: async () => row,
        normalizeEmail: (v) => v, memoryPracticalSkillsProgress: new Map(),
        allActivitiesComplete: (_content, value) => Boolean(value.completed_activities[0]),
        setPracticalSkillsActivityCompletion: async (_email, _kit, _index, completed) => {
            row = { ...row, completed_activities: completed ? { 0: "new tick" } : {} }; return row;
        }
    });
    vm.runInContext(serverSource.slice(from, to), context);
    const content = { activities: [activity] };
    assert.equal((await context.syncPracticalSkillsKitCompletion("student", "kit", content)).completed, false);
    row.responses["0-blocks"].checkbox = true;
    assert.equal((await context.syncPracticalSkillsKitCompletion("student", "kit", content)).completed, true);
    const route = serverSource.slice(serverSource.indexOf('app.put("/api/practical-skills/progress/:kitId/activities/:activityIndex"'), serverSource.indexOf("\nasync function getLearningSitesStudentProfile("));
    let completionHandler, writes = 0;
    const routeContext = vm.createContext({
        app: { put: (_path, handler) => { completionHandler = handler; } },
        getRequestUserEmail: () => "student@school.nz", normalizeEmail: (value) => value, SCHOOL_EMAIL_DOMAIN: "school.nz",
        getPracticalSkillsKitDefinition: () => true,
        getPracticalSkillsKitContent: async () => ({ worksheets: [{}], activities: [activity] }),
        setPracticalSkillsActivityCompletion: async () => { writes++; return { completed_activities: { 0: "saved" } }; },
        syncPracticalSkillsKitCompletion: async () => {}, autoEmailKitCertificate: async () => {}
    });
    vm.runInContext(route, routeContext);
    const response = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
    const request = { params: { kitId: "kit", activityIndex: "0" }, body: { completed: true } };
    await completionHandler(request, response);
    assert.equal(response.code, 409);
    assert.equal(writes, 0, "Direct completion must not bypass automatic requirements");
    activity.completionMode = "manual";
    await completionHandler(request, response);
    assert.equal(writes, 1, "Ordinary manual completion must still work");
    const locks = serverSource.slice(serverSource.indexOf("function withResearchReportLock("), serverSource.indexOf('app.get("/api/practical-skills/research-report/:kitId/:activityIndex"'));
    const lockContext = vm.createContext({ researchReportLocks: new Map() });
    vm.runInContext(locks, lockContext);
    await assert.rejects(lockContext.withResearchReportLock("one", async () => { throw new Error("Copy failed"); }), /Copy failed/);
    assert.equal(await lockContext.withResearchReportLock("one", async () => "retried"), "retried");
});
