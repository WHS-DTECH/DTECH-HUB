"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
    retryGoogleRead, presentationId, firstSlideText, hasAddedWriting, findDescriptionCopy,
    teacherCommentThreads, readTeacherComments, registerStudentClassTracker
} = require("../student-class-tracker");

const deck = (text) => ({ slides: [{ pageElements: [{ shape: { text: { textElements: [{ textRun: { content: text } }] } } }] }] });
const template = deck("Digital Outcome Description (All)\nWhat is your outcome?\nThe digital outcome I am working on is...");
const url = (id) => `https://docs.google.com/presentation/d/${id}/edit`;
const teacher = { emailAddress: "teacher@school.nz", displayName: "Teacher" };
const pupil = { emailAddress: "student@school.nz", displayName: "Student" };
const comment = { id: "c1", content: "Please explain your client.", author: teacher, resolved: true, createdTime: "2026-10-23T01:00:00Z" };

async function main() {
    let attempts = 0;
    const waits = [];
    assert.equal(await retryGoogleRead(async () => {
        attempts++;
        if (attempts < 3) { const error = new Error("Temporary Google outage"); error.status = 503; throw error; }
        return "recovered";
    }, async (ms) => waits.push(ms)), "recovered");
    assert.deepEqual(waits, [250, 500]);
    for (const status of [401, 403, 404, 503]) {
        attempts = 0;
        await assert.rejects(retryGoogleRead(async () => {
            attempts++;
            const error = new Error("Google read failed");
            error.status = status;
            throw error;
        }, async () => {}), /Google read failed/);
        assert.equal(attempts, status === 503 ? 3 : 1, "Retry only temporary errors, with a strict bound");
    }
    assert.equal(presentationId(url("slide_1")), "slide_1");
    assert.equal(presentationId("https://example.com/presentation/d/no/edit"), "");
    assert.equal(presentationId("https://docs.google.com.evil.test/presentation/d/no/edit"), "");
    assert.equal(hasAddedWriting(template, template), false);
    assert.equal(hasAddedWriting(deck("The digital outcome I am working on is...\nWhat is your outcome?\nDigital Outcome Description (All)"), template), false);
    assert.equal(hasAddedWriting(deck("What is your outcome?"), template), false, "Deleting template instructions is not writing");
    assert.equal(hasAddedWriting(deck(""), template), false);
    assert.equal(hasAddedWriting(deck("Digital Outcome Description (All)\nWhat is your outcome?\nThe digital outcome I am working on is a website for our library."), template), true);
    assert.equal(hasAddedWriting(deck("  DIGITAL OUTCOME DESCRIPTION (ALL)\nWhat is your outcome?\nThe digital outcome I am working on is..."), template), false);
    const grouped = { slides: [{ pageElements: [{ elementGroup: { children: [{ table: { tableRows: [{ tableCells: [{ text: { textElements: [{ textRun: { content: "A student answer" } }] } }] }] } }] } }] }] };
    assert.match(firstSlideText(grouped), /A student answer/);
    assert.equal(hasAddedWriting(grouped, template), true);
    assert.throws(() => firstSlideText({ slides: [] }), /no first slide/);
    const twoSlides = deck(firstSlideText(template));
    twoSlides.slides.push(deck("Writing on slide two only").slides[0]);
    assert.equal(hasAddedWriting(twoSlides, template), false, "Only the first slide is checked");

    const copies = findDescriptionCopy([
        { updated_at: "2026-10-20", template_copies: [{ templateId: "target-audience", fileUrl: url("wrong") }, { templateId: "digital-outcome-description", fileUrl: url("old"), copiedAt: "2026-10-01" }] },
        { updated_at: "2026-10-21", template_copies: [{ templateId: "digital-outcome-description", fileUrl: url("new"), copiedAt: "2026-10-21" }] }
    ]);
    assert.equal(copies.fileId, "new");
    assert.equal(findDescriptionCopy([{ evidence_steps: [{
        standard: "task-topic:91897:description-google-slides-describe-the-digital-outcome",
        steps: [{ text: `GOOGLE_SLIDES_URL|${url("linked")}` }]
    }] }]).fileId, "linked");
    assert.equal(findDescriptionCopy([{ evidence_steps: [{ standard: "task-topic:91897:target-audience", steps: [{ text: `GOOGLE_SLIDES_URL|${url("wrong")}` }] }] }]), null);

    const threads = teacherCommentThreads([
        comment, { ...comment, id: "deleted", deleted: true },
        { id: "student-only", author: pupil, content: "My work" },
        { id: "reply", author: pupil, content: "A question", replies: [
            { id: "r1", author: teacher, content: "My answer" },
            { id: "r2", author: teacher, content: "Deleted", deleted: true }
        ] },
        { id: "me", author: { me: true }, content: "Author email hidden" },
        { id: "resolved-only", author: pupil, content: "My own note", replies: [{ author: teacher, content: "", action: "resolve" }] }
    ], "TEACHER@school.nz");
    assert.equal(threads.length, 3);
    assert.equal(threads[0].resolved, true);
    assert.equal(threads[1].yours, false);
    assert.equal(threads[1].replies.length, 1);
    assert.equal(threads[2].yours, true);
    let pages = 0;
    const paginated = await readTeacherComments("slide", "token", teacher.emailAddress, async (_path, options) => {
        pages++;
        assert.equal(options.queryParams.pageToken, pages === 1 ? "" : "next");
        return pages === 1 ? { comments: [], nextPageToken: "next" } : { comments: [comment] };
    });
    assert.equal(pages, 2);
    assert.equal(paginated.length, 1);
    await assert.rejects(readTeacherComments("slide", "token", teacher.emailAddress, async () => ({ comments: [], nextPageToken: "repeated" })), /pagination/);
    await assert.rejects(readTeacherComments("slide", "token", teacher.emailAddress, async () => { throw new Error("Permission denied"); }), /Permission denied/);

    const routes = new Map();
    const guard = () => {};
    const snapshots = new Map();
    let storedTeacher = "";
    let tokenValid = true;
    let baselineValid = true;
    let failingFile = "";
    let commentsFail = false;
    let persistenceFails = false;
    let hasCopy = true;
    let copyFileId = "personal";
    const calls = [];
    const students = [
        { id: "middle", student_name: "Middle Student", year_level: "Year 10", form_class: "10A", has_dtech: true, linked_emails: ["alias@school.nz", "student@school.nz"] },
        { id: "not-started", student_name: "Not Started", year_level: "9", has_dtech: true, linked_emails: ["new@school.nz"] },
        { id: "discovered", student_name: "Discovered", year_level: "10", has_dtech: true, linked_emails: ["discovered@school.nz"] },
        { id: "junior", student_name: "Junior", year_level: "7", has_dtech: true, linked_emails: [] },
        { id: "senior", student_name: "Senior", year_level: "13", has_dtech: true, linked_emails: [] },
        { id: "left", student_name: "Left school", year_level: "10", has_dtech: true, status: "Not Current", linked_emails: [] },
        { id: "other", student_name: "Not DTECH", year_level: "10", has_dtech: false, linked_emails: [] }
    ];
    const deps = {
        hasDatabase: true,
        pool: { query: async (sql, params) => {
            if (/CREATE TABLE/.test(sql)) return { rows: [] };
            if (/FROM project_interests/.test(sql)) return { rows: hasCopy ? [{ student_email: "student@school.nz", template_copies: [{ templateId: "digital-outcome-description", fileUrl: url(copyFileId) }] }] : [] };
            if (/SELECT student_key/.test(sql)) return { rows: [...snapshots].filter(([key]) => key.startsWith(`${params[0]}:`))
                .map(([key, result]) => ({ student_key: key.slice(params[0].length + 1), result })) };
            if (/INSERT INTO/.test(sql)) {
                if (persistenceFails) throw new Error("Database write unavailable");
                storedTeacher = params[0];
                snapshots.set(`${params[0]}:${params[1]}`, JSON.parse(params[2]));
                return { rows: [] };
            }
            throw new Error(`Unexpected query: ${sql}`);
        } },
        requireActivityWriteAccess: guard,
        getStudentDirectoryRows: async () => students,
        buildStudentClassManagementRow: (row) => row,
        dedupeToLatestStudentRows: (rows) => rows,
        getStudentIdentityKey: (row) => row.id,
        listTemplateLibraryEntries: async () => [{ id: "digital-outcome-description", templateUrl: url("template") }],
        googleSlidesApiRequest: async (id) => {
            calls.push(`slides:${id}`);
            if (id === "template") {
                if (!baselineValid) throw new Error("Template inaccessible");
                return template;
            }
            return id === "personal" ? deck(`${firstSlideText(template)}\nMy website for the library`) : template;
        },
        driveApiRequest: async (path) => {
            calls.push(path);
            if (path === "/files") return { files: [{ id: "found" }] };
            if (path.includes(failingFile) && failingFile) throw new Error("File inaccessible");
            if (path.endsWith("/comments")) {
                if (commentsFail) throw new Error("Comments permission denied");
                return { comments: path.includes("personal") ? [comment] : [] };
            }
            return { id: path.split("/").pop(), mimeType: "application/vnd.google-apps.presentation" };
        },
        verifyDriveTokenForStudent: async (_token, email) => {
            assert.equal(email, teacher.emailAddress);
            if (!tokenValid) { const error = new Error("Choose the same school Google account"); error.status = 403; throw error; }
        },
        getStudentDriveSetup: async (email) => email === "discovered@school.nz" ? { mdtechProjectFolderId: "middle-folder" } : null,
        driveFindFolderByName: async () => ({ id: "description-folder" })
    };
    registerStudentClassTracker({
        get: (path, middleware, handler) => { assert.equal(middleware, guard); routes.set(`GET ${path}`, handler); },
        post: (path, middleware, handler) => { assert.equal(middleware, guard); routes.set(`POST ${path}`, handler); }
    }, deps);
    async function request(method, body = {}, email = teacher.emailAddress) {
        const response = { code: 200, headers: {}, set(key, value) { this.headers[key] = value; }, status(code) { this.code = code; return this; }, json(value) { this.body = value; } };
        await routes.get(`${method} /api/student-tracker/my-class${method === "POST" ? "/check" : ""}`)({ user_email: email, body }, response);
        assert.equal(response.headers["Cache-Control"], "no-store");
        return response;
    }
    let response = await request("GET");
    assert.equal(response.body.students.length, 5, "Include current roster even without any login, interest or slide");
    assert.equal(response.body.students.find((row) => row.id === "junior").course, "JuniorDTECH");
    assert.equal(response.body.students.find((row) => row.id === "senior").course, "SeniorDTECH");
    assert.equal(response.body.students.find((row) => row.id === "middle").fileId, "personal", "Match all linked email aliases");
    assert.equal("linkedEmails" in response.body.students[0], false);
    assert.equal((await request("POST", { studentIds: ["middle"] })).code, 400);
    assert.equal((await request("POST", { driveAccessToken: "token", studentIds: ["middle", "middle"] })).code, 400);
    assert.equal((await request("POST", { driveAccessToken: "token", studentIds: ["senior"] })).code, 400);
    assert.equal((await request("POST", { driveAccessToken: "token", studentIds: ["unknown"] })).code, 400);
    assert.equal((await request("POST", { driveAccessToken: "token", studentIds: ["1", "2", "3", "4", "5", "6"] })).code, 400);
    response = await request("POST", { driveAccessToken: "token", studentIds: ["middle", "not-started", "discovered"] });
    assert.equal(response.code, 200);
    const checks = new Map(response.body.results.map((row) => [row.id, row.check]));
    assert.equal(checks.get("middle").writing.status, "yes");
    assert.equal(checks.get("middle").comments.status, "yes");
    assert.equal(checks.get("middle").comments.threads[0].text, comment.content);
    assert.equal(checks.get("not-started").created.status, "not_linked");
    assert.equal(checks.get("not-started").comments.status, "not_applicable");
    assert.equal(checks.get("discovered").fileId, "found");
    assert.equal(checks.get("discovered").writing.status, "no");
    assert.equal(checks.get("discovered").comments.status, "no");
    assert.equal(storedTeacher, teacher.emailAddress);
    const oldCalls = calls.length;
    response = await request("GET");
    assert.equal(calls.length, oldCalls, "Reloads use saved checks, not unprompted Google requests");
    assert.equal(response.body.students.find((row) => row.id === "middle").check.writing.status, "yes");
    assert.equal((await request("GET", {}, "other-teacher@school.nz")).body.students.find((row) => row.id === "middle").check, null, "Saved comments are scoped to the viewing teacher");
    copyFileId = "new-description";
    assert.equal((await request("GET")).body.students.find((row) => row.id === "middle").check, null, "A changed description link invalidates the saved check");
    copyFileId = "template";
    response = await request("POST", { driveAccessToken: "token", studentIds: ["middle"] });
    assert.equal(response.body.results[0].check.created.status, "unavailable", "A shared template is not a personal description");
    copyFileId = "personal";
    baselineValid = false;
    response = await request("POST", { driveAccessToken: "token", studentIds: ["middle"] });
    assert.equal(response.body.results[0].check.writing.status, "error");
    assert.equal(response.body.results[0].check.comments.status, "yes", "A template error does not prevent reading comments");
    baselineValid = true;
    commentsFail = true;
    response = await request("POST", { driveAccessToken: "token", studentIds: ["middle"] });
    assert.equal(response.body.results[0].check.comments.status, "error", "Do not mistake a permission error for no comments");
    assert.equal(response.body.results[0].check.writing.status, "yes");
    commentsFail = false;
    failingFile = "personal";
    response = await request("POST", { driveAccessToken: "token", studentIds: ["middle"] });
    assert.equal(response.body.results[0].check.created.status, "error", "An inaccessible file is not a missing file");
    failingFile = "";
    tokenValid = false;
    assert.equal((await request("POST", { driveAccessToken: "wrong", studentIds: ["middle"] })).code, 403);
    tokenValid = true;
    persistenceFails = true;
    assert.equal((await request("POST", { driveAccessToken: "token", studentIds: ["middle"] })).code, 500, "Never report a saved check if persistence failed");
    const page = fs.readFileSync(path.join(__dirname, "..", "teacher-student-work.html"), "utf8");
    const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
    assert.match(page, /id="my-students-tab"[^>]+role="tab"/);
    assert.match(page, /id="my-class-tab"[^>]+role="tab"/);
    assert.match(page, /id="my-class-panel"[^>]+hidden/);
    assert.match(page, /teacher-my-class\.js/);
    assert.match(server, /require\("\.\/student-class-tracker"\)\.registerStudentClassTracker/);
    console.log("My Class roster, writing, comments, permissions, pagination and saved-check regressions passed.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
