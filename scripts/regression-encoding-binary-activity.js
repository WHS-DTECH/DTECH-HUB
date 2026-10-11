"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const express = require("express");
const { registerActivityProgress, encodingLetters, toBinary } = require("../learning-pathways/activity-progress-store");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const DOMAIN = "westlandhigh.school.nz";
const STUDENT = `student@${DOMAIN}`;

function correctLetters() {
    return Object.fromEntries(encodingLetters.map(({ index, value }) => [index, toBinary(value)]));
}

async function withServer(options, run) {
    const app = express();
    app.use(express.json());
    registerActivityProgress(app, {
        getRequestUserEmail: (req) => req.headers["x-user-email"] || "",
        normalizeEmail: (value) => String(value || "").trim().toLowerCase(),
        schoolDomain: DOMAIN,
        ...options
    });
    const server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/learning-pathways/activity-progress`;
    try {
        await run(base);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
}

const call = (url, { email = STUDENT, method = "GET", body } = {}) => fetch(url, {
    method, headers: { "Content-Type": "application/json", ...(email ? { "x-user-email": email } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
});

async function testStore() {
    assert.deepEqual(encodingLetters.map(({ letter, value }) => `${letter}${value}`),
        ["E5", "C3", "H8", "N14", "O15", "L12", "O15", "G7", "Y25"], "Nine TECHNOLOGY letters after the worked example T");
    assert.equal(toBinary(20), "10100");
    assert.equal(toBinary(5), "00101", "Leading zeros keep five positions");

    await withServer({ hasDatabase: false }, async (base) => {
        const activity = `${base}/activity-encoding-binary`;
        assert.equal((await call(activity, { email: "" })).status, 401, "Signed-out requests are rejected");
        assert.equal((await call(activity, { email: "someone@gmail.com" })).status, 401, "Non-school accounts are rejected");
        assert.equal((await call(`${base}/activity-unknown`)).status, 404, "Only tracked activities save");
        assert.deepEqual(await (await call(activity)).json(), { responses: {}, completed: false, completedAt: null });

        const partial = { practice: "00101", letters: { 1: "00101", 2: "11111", 3: "bad", 99: "00001" },
            challenge: { word: "c4t!", bits: ["00011", "nope", "10100", "00001"] }, extra: "<script>" };
        let response = await call(activity, { method: "PUT", body: { responses: partial } });
        assert.equal(response.status, 200);
        let saved = await response.json();
        assert.deepEqual(saved.responses, { practice: "00101", letters: { 1: "00101", 2: "11111" },
            challenge: { word: "CT", bits: ["00011", "00000"] } }, "Responses are sanitised to five-bit answers");
        assert.equal(saved.completed, false);

        response = await call(activity, { method: "PUT", body: { responses: partial, completed: true } });
        assert.equal(response.status, 409, "Cannot finish before every answer is correct");
        saved = await response.json();
        assert.equal(saved.completed, false);
        assert.ok(saved.missing.includes("C = 3") && !saved.missing.includes("E = 5"), "Missing answers are listed");

        const finished = { practice: "00101", letters: correctLetters(), challenge: { word: "", bits: [] } };
        response = await call(activity, { method: "PUT", body: { responses: finished } });
        assert.equal((await response.json()).completed, false, "Correct answers alone do not finish until requested");
        response = await call(activity, { method: "PUT", body: { responses: { ...finished, practice: "00000" }, completed: true } });
        assert.equal(response.status, 409, "Guided practice is required too");
        response = await call(activity, { method: "PUT", body: { responses: finished, completed: true } });
        assert.equal(response.status, 200);
        saved = await response.json();
        assert.equal(saved.completed, true);
        assert.ok(saved.completedAt);

        const reloaded = await (await call(activity)).json();
        assert.deepEqual(reloaded.responses, finished, "Answers persist across reloads");
        assert.equal(reloaded.completed, true);
        assert.equal(reloaded.completedAt, saved.completedAt);

        response = await call(activity, { method: "PUT", body: { responses: { ...finished, challenge: { word: "hi", bits: ["01000"] } } } });
        assert.equal((await response.json()).completedAt, saved.completedAt, "Optional challenge edits keep completion");

        const list = await (await call(base)).json();
        assert.deepEqual(list.tracked.map((activityRow) => [activityRow.id, activityRow.title, activityRow.strand, activityRow.href]),
            [["activity-encoding-binary", "Encoding Binary", "digital-systems", "/learning-pathways/activity-encoding-binary.html"]],
            "Encoding Binary is tracked once under Digital Systems");
        assert.equal(list.progress["activity-encoding-binary"].completed, true);
        assert.deepEqual((await (await call(base, { email: `other@${DOMAIN}` })).json()).progress, {}, "Progress is per student");

        response = await call(activity, { method: "PUT", body: { responses: { ...finished, letters: { ...finished.letters, 1: "00000" } } } });
        saved = await response.json();
        assert.equal(saved.completed, false, "Changing a correct answer to a wrong one reopens the activity");
        assert.equal(saved.completedAt, null);
    });

    const queries = [];
    const rows = new Map();
    const pool = { query: async (sql, params = []) => {
        queries.push(sql);
        if (sql.startsWith("CREATE TABLE")) return { rows: [] };
        if (sql.includes("INSERT INTO")) {
            const row = { responses: JSON.parse(params[2]), completed: params[3], completed_at: params[4] };
            rows.set(`${params[0]}|${params[1]}`, row);
            return { rows: [row] };
        }
        if (sql.includes("AND activity_id = $2")) return { rows: rows.has(`${params[0]}|${params[1]}`) ? [rows.get(`${params[0]}|${params[1]}`)] : [] };
        return { rows: [...rows.entries()].filter(([key]) => key.startsWith(`${params[0]}|`))
            .map(([key, row]) => ({ activity_id: key.split("|")[1], ...row })) };
    } };
    await withServer({ hasDatabase: true, pool }, async (base) => {
        const body = { responses: { practice: "00101", letters: correctLetters() }, completed: true };
        assert.equal((await call(`${base}/activity-encoding-binary`, { method: "PUT", body })).status, 200);
        assert.equal((await (await call(base)).json()).progress["activity-encoding-binary"].completed, true);
    });
    assert.equal(queries.filter((sql) => sql.startsWith("CREATE TABLE")).length, 1, "Schema is created once");
    assert.ok(queries.every((sql) => sql.includes("learning_pathways_activity_progress")), "Uses its own table, not kit progress");
}

function testPage() {
    const page = read("learning-pathways/activity-encoding-binary.html");
    const ids = [...page.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length, "Page IDs are unique");
    for (const heading of ["Your Mission", "You Will Need", "How It Works", "Worked Example: T = 20", "Guided Practice: E = 5",
        "Encode TECHNOLOGY", "Optional Challenge: Your Own Word", "Finished?"]) {
        assert.ok(page.includes(`>${heading}</h2>`), `Page includes ${heading}`);
    }
    assert.match(page, /Use your Binary Piano to encode numbers and the word <strong>TECHNOLOGY<\/strong> into binary\./);
    assert.deepEqual([...page.match(/<ul class="activity-needs">[\s\S]*?<\/ul>/)[0].matchAll(/<li>([^<]+)<\/li>/g)].map((match) => match[1]),
        ["Your Binary Piano from Lesson 1", "Chromebook", "Scratch paper (optional)"]);
    assert.equal((page.match(/<li><b>[A-Z]<\/b>\d+<\/li>/g) || []).length, 26, "A=1 to Z=26 reference");
    assert.deepEqual([...page.match(/encoding-place-values"[\s\S]*?<\/ul>/)[0].matchAll(/<li>(\d+)<\/li>/g)].map((match) => match[1]),
        ["16", "8", "4", "2", "1"], "Place values are always 16, 8, 4, 2, 1");
    assert.match(page, /T = 20 = 10100/);
    assert.deepEqual([...page.matchAll(/<span class="encoding-working-key"[^>]*>(\d+)<\/span>/g)].map((match) => match[1]),
        ["16", "8", "4", "2", "1"], "Each worked-example step starts with its place-value tile");
    assert.match(page, /20 &minus; 16 = 4/);
    assert.match(page, /4 &minus; 4 = 0/);
    assert.match(page, /Part E &bull; Optional/);
    assert.doesNotMatch(page, /ASCII|rubric|upload|Skill Check|Grade/i, "No ASCII, grading, uploads or skill check");
    assert.doesNotMatch(page, /00011|01000|01110|01111|01100|00111|11001/, "Answers for the student letters are not exposed");
    assert.match(page, /href="\/learning-pathways\/\?type=activity#card-activity-encoding-binary"/);
    assert.match(page, /href="\/learning-pathways\/lesson-encoding-binary\.html"/);
    assert.match(page, /<script src="\.\.\/script\.js"><\/script>\s*<script src="activity-encoding-binary\.js"><\/script>/);

    const lesson = read("learning-pathways/lesson-encoding-binary.html");
    assert.match(lesson, /<\/div><a class="lesson-activity-pill" href="\/learning-pathways\/activity-encoding-binary\.html">Activity card: Encoding Binary<\/a><\/li>/,
        "Lesson 2 links forward to the activity");

    const script = read("learning-pathways/activity-encoding-binary.js");
    assert.doesNotMatch(script, /innerHTML/, "Activity renders text safely");
    const window = {};
    vm.runInNewContext(script, { window, document: { querySelector: () => null } });
    const api = window.EncodingBinaryActivity;
    assert.equal(api.totalOf("10100"), 20);
    assert.equal(api.totalOf("00101"), 5);
    assert.equal(api.letterStatus("00101", 5).state, "correct");
    assert.equal(api.letterStatus("01000", 5).state, "over");
    const working = api.letterStatus("00100", 5);
    assert.equal(working.state, "working");
    assert.doesNotMatch(working.text, /00101/, "Hints never reveal the answer");
    assert.equal(api.cleanWord("c0de!xyzabcdefg"), "CDEXYZABCD");
    const empty = { practice: "00000", letters: {} };
    assert.equal(api.missingAnswers(empty).length, 10);
    assert.equal(api.missingAnswers({ practice: "00101", letters: correctLetters() }).length, 0);

    const server = read("server.js");
    assert.match(server, /require\("\.\/learning-pathways\/activity-progress-store"\)\.registerActivityProgress\(app, \{\s*pool, hasDatabase, getRequestUserEmail, normalizeEmail, schoolDomain: SCHOOL_EMAIL_DOMAIN/);
    assert.ok(server.indexOf("activity-progress-store") < server.indexOf("app.use(express.static(__dirname))"));
}

(async () => {
    await testStore();
    testPage();
    console.log("Encoding Binary activity store, page and helper regressions passed.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
