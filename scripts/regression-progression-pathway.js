"use strict";
const assert = require("node:assert/strict");
const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const { registerProgressionPathway, validateRecord } = require("../learning-pathways/progression-store");
const ids = ["digital-systems", "data", "digital-citizenship", "programming-and-algorithms", "systems-and-control"];
const sample = { studentEmail: "student@example.test", schoolYear: 2027, term: 1, yearLevel: 7,
    revision: 0, formClass: "7XX", strengths: "", nextLearning: "",
    pathways: ids.map((id) => ({ id, coverage: "not-taught", descriptor: null, addressed: "", evidence: "", notes: "" })) };
const clone = (value) => JSON.parse(JSON.stringify(value));
async function main() {
    const root = path.join(__dirname, "..");
    const css = fs.readFileSync(path.join(root, "learning-pathways/progression-pathway.css"), "utf8");
    const luminance = (hex) => {
        const channels = hex.match(/../g).map((channel) => parseInt(channel, 16) / 255)
            .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    for (const colour of ["b86753", "c08b2e", "969b32", "278c78", "427bbb"]) {
        assert.ok(css.includes(`#${colour}`));
        assert.ok((luminance(colour) + 0.05) / (luminance("000000") + 0.05) >= 4.5, "Descriptor text has accessible contrast");
    }
    const navigation = fs.readFileSync(path.join(root, "script.js"), "utf8");
    assert.match(navigation, /href="\/learning-pathways\/progression-pathway\.html">Progression Pathway/);
    assert.deepEqual(validateRecord(sample), sample);
    for (const bad of [
        { ...sample, yearLevel: 11 }, { ...sample, term: 5 }, { ...sample, revision: -1 },
        { ...sample, pathways: [] }, { ...sample, strengths: "a".repeat(5001) },
        { ...sample, pathways: sample.pathways.map((row) => ({ ...row, id: "data" })) }
    ]) assert.throws(() => validateRecord(bad));
    const rated = clone(sample);
    rated.pathways[0].coverage = "taught";
    rated.pathways[0].descriptor = "proficient";
    rated.pathways[0].evidence = "Observation and annotated diagram";
    assert.equal(validateRecord(rated).pathways[0].descriptor, "proficient");
    for (const descriptor of ["emerging", "developing", "consolidating", "proficient", "exceeding"]) {
        rated.pathways[0].descriptor = descriptor;
        assert.equal(validateRecord(rated).pathways[0].descriptor, descriptor);
    }
    rated.pathways[0].descriptor = "achieved";
    assert.throws(() => validateRecord(rated));
    rated.pathways[0].descriptor = "proficient";
    rated.pathways[0].coverage = "not-taught";
    assert.throws(() => validateRecord(rated), /Not determined/);

    const records = new Map();
    let fail = false;
    const pool = { query: async (sql, params = []) => {
        if (fail) throw new Error("Database failure");
        if (sql.includes("CREATE TABLE")) return { rows: [] };
        if (sql.includes("SELECT DISTINCT ON")) return { rows: [...records.values()].map((row) => ({ student_email: row.record.studentEmail, record: row.record })) };
        if (sql.includes("SELECT record")) return { rows: [...records.values()].filter((row) => row.record.studentEmail === params[0])
            .sort((a, b) => b.record.schoolYear - a.record.schoolYear || b.record.term - a.record.term) };
        const key = params.slice(0, 3).join("|");
        const old = records.get(key);
        if (sql.includes("INSERT INTO") && old) return { rows: [] };
        if (sql.includes("UPDATE progression") && (!old || old.revision !== params[5])) return { rows: [] };
        const row = { record: JSON.parse(params[3]), revision: (old?.revision || 0) + 1,
            updated_by: params[4], updated_at: new Date().toISOString() };
        records.set(key, row);
        return { rows: [row] };
    } };
    const auth = (req, res, next) => {
        if (req.headers["x-test-role"] !== "teacher") return res.status(403).json({ error: "Teacher required" });
        req.user_email = "teacher@example.test"; next();
    };
    const options = { pool, hasDatabase: true, requireTeacherAccess: auth,
        getStudents: async () => [{ email: sample.studentEmail, name: "Example Student", yearLevel: 7, formClass: "7XX" }] };
    const app = express(); app.use(express.json()); registerProgressionPathway(app, options);
    const server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/teacher/progression`;
    const headers = { "Content-Type": "application/json", "x-test-role": "teacher" };
    const put = (record, role = "teacher") => fetch(`${base}/records`, { method: "PUT",
        headers: { ...headers, "x-test-role": role }, body: JSON.stringify(record) });
    try {
        assert.equal((await fetch(`${base}/students`)).status, 403);
        assert.equal((await fetch(`${base}/records?studentEmail=${sample.studentEmail}`)).status, 403);
        assert.equal((await put(sample, "student")).status, 403);
        assert.equal((await fetch(`${base}/students`, { headers })).status, 200);
        assert.equal((await put({ ...sample, studentEmail: "unknown@example.test" })).status, 400);
        const savedResponse = await put(sample);
        assert.equal(savedResponse.status, 200);
        const saved = (await savedResponse.json()).record;
        assert.equal(saved.revision, 1); assert.equal(saved.updatedBy, "teacher@example.test");
        assert.equal((await put(sample)).status, 409);
        saved.pathways[0].coverage = "taught"; saved.pathways[0].descriptor = "consolidating";
        saved.pathways[0].addressed = "Inputs and outputs";
        assert.equal((await put(saved)).status, 200);
        assert.equal((await put(saved)).status, 409, "Stale edit cannot overwrite another save");
        assert.equal((await put({ ...sample, term: 2, yearLevel: 8 })).status, 200);
        assert.equal((await put({ ...sample, schoolYear: 2028, yearLevel: 8 })).status, 200);
        const response = await fetch(`${base}/records?studentEmail=${sample.studentEmail}`, { headers });
        assert.match(response.headers.get("cache-control"), /no-store/);
        const history = (await response.json()).records;
        assert.equal(history.length, 3, "Separate year/term history persists");
        assert.equal(history[2].pathways[0].descriptor, "consolidating");
        assert.equal(history[2].yearLevel, 7, "Year level is a historical snapshot");
        const oldDirectory = options.getStudents;
        options.getStudents = async () => [];
        const historicalApp = express();
        const historicalHandlers = {};
        historicalApp.get = (url, ...functions) => { historicalHandlers[url] = functions.at(-1); };
        registerProgressionPathway(historicalApp, options);
        let archived;
        await historicalHandlers["/api/teacher/progression/students"]({}, { set() {}, json(data) { archived = data.students; } });
        assert.equal(archived[0].archived, true, "History remains discoverable after student moves beyond Year 10 or leaves directory");
        options.getStudents = oldDirectory;
        const restarted = express();
        const handlers = {};
        restarted.get = (url, ...functions) => { handlers[url] = functions.at(-1); };
        registerProgressionPathway(restarted, options);
        let result;
        await handlers["/api/teacher/progression/records"]({ query: { studentEmail: sample.studentEmail } },
            { set() {}, json(data) { result = data; } });
        assert.equal(result.records.length, 3, "Fresh registration reads durable records");
        fail = true;
        assert.equal((await put({ ...sample, term: 3 })).status, 500);
        assert.equal((await fetch(`${base}/records?studentEmail=${sample.studentEmail}`, { headers })).status, 500);
        fail = false;
    } finally { await new Promise((resolve) => server.close(resolve)); }
    const offline = express(); offline.use(express.json());
    registerProgressionPathway(offline, { ...options, hasDatabase: false });
    const offlineServer = offline.listen(0, "127.0.0.1");
    await new Promise((resolve) => offlineServer.once("listening", resolve));
    try {
        const response = await fetch(`http://127.0.0.1:${offlineServer.address().port}/api/teacher/progression/records`,
            { method: "PUT", headers, body: JSON.stringify(sample) });
        assert.equal(response.status, 503, "No database must not return a saved result");
    } finally { await new Promise((resolve) => offlineServer.close(resolve)); }
    console.log("Progression validation, teacher access, saves, conflicts and rotation history regressions passed.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
