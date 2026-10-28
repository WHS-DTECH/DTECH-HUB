"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const express = require("express");
const B = require("../practical-skills/activity-blocks");
const { registerActivityBlocks } = require("../practical-skills/activity-block-store");
const certificates = require("../practical-skills-certificate");
const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
const base = () => ({
    identity: { name: "Files & Folders Kit (Word Processing)" },
    worksheets: ["Rattlesnakes", "Weathering the Storm", "A Bibliography", "Fiction Books", "The Dream Survey Makeover"].map((activity) => ({ activity })),
    activities: [0, 1, 2, 3].map((index) => ({
        title: `Activity ${index}`, completionMode: "manual", blocks: [
            { id: "instructions", kind: "text", text: "Keep these instructions." },
            ...(index < 3 ? [{ id: "link", kind: "studentlink", required: index !== 1 }] : [])
        ]
    }))
});
const link = (index) => `https://docs.google.com/document/d/unique-file-${index}/edit?usp=sharing`;
const answer = (content, index, url) => ({ [content.activities[index].blocks.find((b) => b.kind === "studentlink").id]: url });
const responses = (content) => Object.fromEntries(content.activities.map((_a, i) => [`${i}-blocks`, answer(content, i, link(i))]));

test("Files & Folders requires all existing links, adds missing submissions and preserves instructions, IDs and other kits", () => {
    const original = base(), before = JSON.stringify(original);
    const content = B.withFilesFoldersLinks(original);
    assert.equal(JSON.stringify(original), before);
    assert.equal(content.activities.length, 5);
    content.activities.forEach((activity, index) => {
        B.validate(activity);
        assert.equal(activity.completionMode, "auto");
        assert.equal(activity.uniqueDocumentLinks, true);
        assert.equal(activity.blocks.filter((b) => b.kind === "studentlink" && b.required).length, 1);
        if (index < 4) assert.equal(activity.blocks[0], original.activities[index].blocks[0]);
        if (index < 3) assert.equal(activity.blocks[1].id, "link");
    });
    assert.equal(B.withFilesFoldersLinks(content), content);
    const other = { ...original, identity: { name: "Unity Setup kit" } };
    assert.equal(B.withFilesFoldersLinks(other), other);
});

test("file identity catches Google sharing/export URLs, Microsoft IDs and query/fragment variations", () => {
    const google = [
        "https://docs.google.com/document/d/same-file/edit?usp=sharing",
        "https://docs.google.com/document/u/0/d/same-file/view#heading",
        "https://drive.google.com/file/d/same-file/view",
        "https://drive.google.com/open?id=same-file",
        "https://docs.google.com/document/d/same-file/export?format=pdf"
    ];
    assert.equal(new Set(google.map(B.documentLinkKey)).size, 1);
    assert.notEqual(B.documentLinkKey(link(0)), B.documentLinkKey(link(1)));
    assert.equal(B.documentLinkKey("https://school.sharepoint.com/word.aspx?sourcedoc=%7BABC%7D&action=edit"),
        B.documentLinkKey("https://school.sharepoint.com/word.aspx?sourcedoc=abc&action=view"));
    assert.notEqual(B.documentLinkKey("https://onedrive.live.com/?resid=ABC"),
        B.documentLinkKey("https://onedrive.live.com/?resid=DEF"));
    assert.equal(B.documentLinkKey("https://example.test/work/doc?sharing=1#top"),
        B.documentLinkKey("https://example.test/work/doc?sharing=2"));
    for (const unsafe of ["file:///C:/work.docx", "http://example.test/work", "javascript:alert(1)", {}]) {
        assert.equal(B.documentLinkKey(unsafe), "");
    }
});

test("unique links earn individual ticks, duplicates fail both activities and resolving them restores eligibility", () => {
    const content = B.withFilesFoldersLinks(base());
    const saved = responses(content);
    const grade = (index) => B.grade(content.activities[index], saved[`${index}-blocks`], {}, { content, index, responses: saved });
    content.activities.forEach((_a, i) => assert.equal(grade(i).passed, true));
    saved["1-blocks"] = answer(content, 1, "https://drive.google.com/open?id=unique-file-0");
    assert.equal(grade(0).passed, false);
    assert.equal(grade(1).passed, false);
    assert.match(grade(1).results[0].message, /different document/);
    assert.equal(grade(2).passed, true);
    saved["1-blocks"] = answer(content, 1, link(1));
    assert.equal(grade(0).passed, true);
    assert.equal(grade(1).passed, true);
    saved["4-blocks"] = {};
    assert.equal(grade(4).passed, false);
    assert.equal(B.grade(content.activities[0], saved["0-blocks"]).passed, false, "Cannot grade unique links without whole-kit context");
});

test("server recalculation revokes stale/manual ticks and certificate eligibility for missing or duplicate links", async () => {
    const content = B.withFilesFoldersLinks(base());
    let row = { student_email: "student@school.nz", responses: responses(content),
        completed: true, completed_at: new Date().toISOString(),
        completed_activities: Object.fromEntries([0, 1, 2, 3, 4].map((i) => [i, "old"])) };
    const ctx = vm.createContext({
        ...certificates, ActivityBlocks: B, hasDatabase: false, normalizeEmail: (value) => value,
        memoryPracticalSkillsProgress: new Map(), kitPublication: { available: async () => true },
        ensurePracticalSkillsProgressRow: async () => row,
        setPracticalSkillsActivityCompletion: async (_email, _kit, index, complete) => {
            if (complete) row.completed_activities[index] = "saved"; else delete row.completed_activities[index];
            return row;
        }
    });
    const start = source.indexOf("async function syncPracticalSkillsKitCompletion(");
    const end = source.indexOf("\nasync function getPracticalSkillsCertificate(", start);
    vm.runInContext(source.slice(start, end), ctx);
    const sync = async () => { row = await ctx.syncPracticalSkillsKitCompletion(row.student_email, "kit-files", content); return row; };
    assert.equal((await sync()).completed, true);
    row.responses["4-blocks"] = {};
    assert.equal((await sync()).completed, false);
    assert.equal(row.completed_activities[4], undefined);
    assert.equal(certificates.buildKitCertificate(content, row, "Student"), null);
    row.responses["4-blocks"] = answer(content, 4, link(4));
    assert.equal((await sync()).completed, true);
    row.responses["1-blocks"] = answer(content, 1, link(0));
    await sync();
    assert.equal(row.completed, false);
    assert.equal(row.completed_activities[0], undefined);
    assert.equal(row.completed_activities[1], undefined);
    row.responses["1-blocks"] = answer(content, 1, link(1));
    assert.equal((await sync()).completed, true);
    assert.equal(certificates.buildKitCertificate(content, row, "Student").activityCount, 5);
});

test("the stored Files & Folders kit is migrated once without replacing teacher content or saved block IDs", async () => {
    let stored = base();
    let writes = 0;
    const ctx = vm.createContext({
        ActivityBlocks: B, hasDatabase: true, withUnityHubLicence: (value) => value,
        ensurePracticalSkillsKitContentSchema: async () => {}, getDefaultPracticalSkillsKitContent: () => ({}),
        ...Object.fromEntries(["withShortLoginKit", "withLearningSitesActivity", "withLoginAppsActivity", "withLoginIdentityActivity", "withPasswordProblemsActivity"]
            .map((name) => [name, (_id, value) => value])),
        pool: { query: async (sql, params) => {
            if (sql.includes("SELECT content")) return { rows: [{ content: structuredClone(stored) }] };
            assert.match(sql, /UPDATE practical_skills_kit_content/);
            assert.equal(params[1], "kit-files");
            stored = JSON.parse(params[0]); writes++;
            return { rows: [] };
        } }
    });
    const start = source.indexOf("async function getStoredPracticalSkillsKitContent(");
    const end = source.indexOf("\nasync function savePracticalSkillsKitContent(", start);
    vm.runInContext(source.slice(start, end), ctx);
    const first = await ctx.getStoredPracticalSkillsKitContent("kit-files");
    assert.equal(writes, 1);
    assert.equal(first.activities[0].blocks[1].id, "link");
    assert.equal(first.activities[4].blocks[0].required, true);
    assert.deepEqual(JSON.parse(JSON.stringify(await ctx.getStoredPracticalSkillsKitContent("kit-files"))), JSON.parse(JSON.stringify(first)));
    assert.equal(writes, 1);
    const completionRoute = source.slice(source.indexOf('app.put("/api/practical-skills/progress/:kitId/activities/:activityIndex"'),
        source.indexOf("\nasync function getLearningSitesStudentProfile("));
    assert.match(completionRoute, /activity\?\.completionMode === "auto"/, "Existing manual tick bypass guard covers the migrated kit");
});

test("student completion bar shows Auto-Completed only after the saved automatic tick", () => {
    const controller = fs.readFileSync(path.join(__dirname, "..", "practical-skills", "kit-worksheet.js"), "utf8");
    const start = controller.indexOf("    function updateActivityCompleteBar(");
    const end = controller.indexOf("\n    function blockPath(", start);
    const nodes = new Map();
    const get = (id) => {
        if (!nodes.has(id)) nodes.set(id, { classList: { toggle() {} }, setAttribute() {}, removeAttribute() {} });
        return nodes.get(id);
    };
    const state = { email: "student@school.nz", progressLoaded: true, kitId: "kit-files",
        completedActivities: {}, content: B.withFilesFoldersLinks(base()) };
    const ctx = vm.createContext({
        state, preview: false, document: { getElementById: get }, getActivityIndexFromUrl: () => 0,
        window: { ActivityBlocks: B, KitWorksheetRender: { visibleLoginSites: () => [] } }
    });
    vm.runInContext(`function getCurrentActivityIndex() { return 0; }\n${controller.slice(start, end)}`, ctx);
    ctx.updateActivityCompleteBar();
    assert.equal(get("worksheet-activity-status-pill").textContent, "Not Completed");
    assert.equal(get("worksheet-activity-complete-btn").textContent, "Check & Save Activity");
    state.completedActivities[0] = "saved";
    ctx.updateActivityCompleteBar();
    assert.equal(get("worksheet-activity-status-pill").textContent, "Auto-Completed");
    delete state.completedActivities[0];
    ctx.updateActivityCompleteBar();
    assert.equal(get("worksheet-activity-status-pill").textContent, "Not Completed");
    assert.match(controller, /setTimeout\(\(\) => \{\s*checkBlockAnswers\(index\)/, "Link edits automatically save and check");
});

test("block save API rejects duplicates, returns all recalculated ticks and accepts a distinct replacement", async (t) => {
    const content = B.withFilesFoldersLinks(base());
    let row = { student_email: "student@school.nz", kit_id: "kit-files", responses: responses(content), completed_activities: { 0: "saved" } };
    let emails = 0;
    const app = express();
    app.use(express.json());
    registerActivityBlocks(app, {
        requireAdminAccess: (_req, res) => res.sendStatus(403),
        normalizeEmail: (value) => value || "", getRequestUserEmail: () => row.student_email, schoolDomain: "school.nz",
        getPracticalSkillsKitDefinition: () => true, getStoredPracticalSkillsKitContent: async () => content,
        getAllPracticalSkillsProgressRows: async () => [row],
        savePracticalSkillsKitResponses: async (_email, _kit, saved) => { row.responses = saved; },
        setPracticalSkillsActivityCompletion: async (_email, _kit, index, complete) => {
            if (complete) row.completed_activities[index] = "saved"; else delete row.completed_activities[index];
            return row;
        },
        syncPracticalSkillsKitCompletion: async () => {
            for (let i = 0; i < 5; i++) {
                const grade = B.grade(content.activities[i], row.responses[`${i}-blocks`], {}, { content, index: i, responses: row.responses });
                if (grade.passed) row.completed_activities[i] = "saved"; else delete row.completed_activities[i];
            }
            return row;
        },
        autoEmailKitCertificate: async () => { emails++; }
    });
    const server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
    const save = async (url) => {
        const r = await fetch(`http://127.0.0.1:${server.address().port}/api/practical-skills/blocks/kit-files/1/check`,
            { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: answer(content, 1, url) }) });
        assert.equal(r.status, 200); return r.json();
    };
    let result = await save(link(0));
    assert.equal(result.passed, false);
    assert.equal(result.completedActivities[0], undefined);
    assert.equal(result.completedActivities[1], undefined);
    assert.equal(emails, 0);
    result = await save(link(1));
    assert.equal(result.passed, true);
    assert.equal(Object.keys(result.completedActivities).length, 5);
});
