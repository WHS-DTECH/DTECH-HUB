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
const answer = (content, index, url) => ({ [content.activities[index].blocks.find((block) => block.kind === "studentlink").id]: url });

test("all three drawings gain saved required links without replacing instructions, existing IDs or publication", () => {
    const original = base(), before = JSON.stringify(original);
    const content = B.withFilesFoldersLinks(original);
    assert.equal(JSON.stringify(original), before);
    assert.equal(content.publicationLive, false);
    assert.equal(content.activities.length, 3);
    content.activities.forEach((activity) => {
        B.validate(activity);
        assert.equal(activity.completionMode, "auto");
        assert.equal(activity.shareLinkCompletion, true);
        assert.equal(activity.blocks.filter((block) => block.required).length, 1);
        assert.equal(activity.blocks.find((block) => block.required).kind, "studentlink");
    });
    assert.equal(content.activities[0].blocks.find((block) => block.id === "guide"), original.activities[0].blocks[0]);
    assert.equal(content.activities[0].information, original.activities[0].information);
    assert.equal(content.activities[0].blocks.find((block) => block.id === "old-link").responseKey, "ship-url");
    assert.equal(B.savedAnswers(content.activities[0], 0, { "ship-url": link(0) })["old-link"], link(0));
    assert.equal(content.activities[1].blocks[0].responseKey, "1-legacy");
    assert.equal(B.withFilesFoldersLinks(content), content, "Normalization is idempotent");
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

test("Ship renders the supplied reference and shape instructions once, without changing link-only completion", () => {
    const kit = B.withGoogleDrawingsLinks(base()), ship = kit.activities[0];
    const image = ship.blocks.find((block) => block.id === "ship-shapes-reference");
    const instructions = ship.blocks.find((block) => block.id === "ship-shapes-instructions");
    assert.equal(image.kind, "image");
    assert.match(image.url, /\/practical-skills\/images\/ship-reference\.png$/);
    const bytes = fs.readFileSync(path.join(__dirname, "..", "practical-skills", "images", "ship-reference.png"));
    assert.equal(bytes.subarray(1, 4).toString(), "PNG");
    assert.match(instructions.text, /Insert > Shape/);
    assert.match(instructions.text, /Line tool only/);
    assert.match(instructions.text, /separate, editable shapes/);
    assert.match(instructions.text, /saved link only/);
    assert.equal(B.grade(ship, answer(kit, 0, link(0))).passed, true);
    assert.equal(kit.activities[1].shipShapesReferenceVersion, undefined);
    assert.equal(kit.activities[2].shipShapesReferenceVersion, undefined);
    assert.equal(B.withGoogleDrawingsLinks(kit), kit);
    const ctx = vm.createContext({ window: { ActivityBlocks: B } });
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "practical-skills", "activity-block-view.js"), "utf8"), ctx);
    const markup = ctx.window.ActivityBlockView.markup(ship.blocks, {}, true);
    assert.match(markup, /<img src="https:\/\/dtech-hub2\.onrender\.com\/practical-skills\/images\/ship-reference\.png"/);
    assert.match(markup, /Insert &gt; Shape/);
    assert.match(markup, /disabled/);
    assert.equal((markup.match(/ship-reference\.png/g) || []).length, 1);
});

test("a valid share link alone earns each tick; blank, local and unsafe links do not", () => {
    const content = B.withFilesFoldersLinks(base());
    content.activities.forEach((activity, index) => {
        assert.equal(B.grade(activity, answer(content, index, link(index))).passed, true);
        for (const invalid of ["", "C:\\Videos\\drawing.png", "http://example.test/work", "javascript:alert(1)", "https://user:password@example.test/work"]) {
            assert.equal(B.grade(activity, answer(content, index, invalid)).passed, false);
        }
    });
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
    await ctx.getStoredPracticalSkillsKitContent("kit-google-drawings");
    assert.equal(writes, 1);
});

test("link-save API persists all three answers, recalculates ticks and enables the normal certificate", async (t) => {
    const content = B.withFilesFoldersLinks(base());
    const email = "student@school.nz", kitId = "kit-google-drawings";
    let row = { student_email: email, kit_id: kitId, responses: {}, completed_activities: {}, completed: false };
    const ctx = vm.createContext({
        ...certificates, ActivityBlocks: B, hasDatabase: false, normalizeEmail: (value) => value,
        memoryPracticalSkillsProgress: new Map(), kitPublication: { available: async () => true },
        ensurePracticalSkillsProgressRow: async () => row,
        setPracticalSkillsActivityCompletion: async (_email, _kit, index, complete) => {
            if (complete) row.completed_activities[index] = new Date().toISOString(); else delete row.completed_activities[index];
            return row;
        }
    });
    const start = source.indexOf("async function syncPracticalSkillsKitCompletion(");
    vm.runInContext(source.slice(start, source.indexOf("\nasync function getPracticalSkillsCertificate(", start)), ctx);
    const sync = async () => { row = await ctx.syncPracticalSkillsKitCompletion(email, kitId, content); return row; };
    const app = express();
    app.use(express.json());
    registerActivityBlocks(app, {
        requireAdminAccess: (_req, res) => res.sendStatus(403),
        normalizeEmail: (value) => value, getRequestUserEmail: () => email, schoolDomain: "school.nz",
        getPracticalSkillsKitDefinition: () => true, getStoredPracticalSkillsKitContent: async () => content,
        getAllPracticalSkillsProgressRows: async () => [row],
        savePracticalSkillsKitResponses: async (_email, _kit, responses) => { row.responses = structuredClone(responses); },
        setPracticalSkillsActivityCompletion: ctx.setPracticalSkillsActivityCompletion,
        syncPracticalSkillsKitCompletion: sync, autoEmailKitCertificate: async () => {}
    });
    const server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
    const save = async (index, url) => {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/practical-skills/blocks/${kitId}/${index}/check`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: answer(content, index, url) })
        });
        assert.equal(response.status, 200);
        return response.json();
    };
    for (let index = 0; index < 3; index++) {
        const saved = await save(index, link(index));
        assert.equal(saved.passed, true);
        assert.ok(saved.completedActivities[index]);
        assert.equal(B.savedAnswers(content.activities[index], index, row.responses)[content.activities[index].blocks.find((block) => block.kind === "studentlink").id], link(index));
        if (index < 2) assert.equal(certificates.buildKitCertificate(content, row, "Student"), null);
    }
    await sync();
    assert.equal(row.completed, true);
    assert.equal(certificates.buildKitCertificate(content, row, "Student").activityCount, 3);
    assert.equal(Object.keys(row.responses).length, 3);
    const cleared = await save(1, "");
    assert.equal(cleared.passed, false);
    assert.equal(cleared.completedActivities[1], undefined);
    assert.ok(cleared.completedActivities[0]);
    assert.ok(cleared.completedActivities[2]);
    assert.equal(row.completed, false);
});
