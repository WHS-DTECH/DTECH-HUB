"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");

test("saved custom kits populate licence stamps without changing existing points or badges", async () => {
    const content = {
        "kit-files": { identity: { name: "Files & Folders", status: "active" }, bannerSubtitle: "Create. Save. Find.", theme: { icon: "F" } },
        "kit-empty": { identity: { name: "New Kit" } },
        "kit-planned": { identity: { name: "Planning", status: "planning" } },
        "kit-archived": { identity: { name: "Archived", status: "archive" } }
    };
    const base = { kits: [{ id: "kit-login", isComplete: true }], completedCount: 1, totalKits: 3, totalPoints: 100, badges: [{ id: "first-kit" }] };
    const context = vm.createContext({
        computePracticalSkillsSnapshot: () => structuredClone(base),
        customPracticalSkillsKits: new Map(Object.keys(content).map((id) => [id, { id }])),
        getStoredPracticalSkillsKitContent: async (id) => content[id]
    });
    const start = source.indexOf("async function buildPracticalSkillsLicenceSnapshot(");
    const end = source.indexOf('\napp.get("/api/practical-skills/my-progress"', start);
    vm.runInContext(source.slice(start, end), context);
    const result = await context.buildPracticalSkillsLicenceSnapshot([
        { kit_id: "kit-files", completed: true, completed_at: "2026-10-24T00:00:00Z" }
    ]);
    assert.equal(result.customKits.length, 2, "Active kits, including previously created kits, appear");
    assert.equal(result.customKits[0].title, "Files & Folders");
    assert.equal(result.customKits[0].isComplete, true);
    assert.equal(result.customKits[0].description, "Create. Save. Find.");
    assert.equal(result.customKits[1].isComplete, false);
    assert.equal(result.stampCompletedCount, 2);
    assert.equal(result.stampTotalKits, 5);
    assert.equal(result.totalPoints, base.totalPoints);
    assert.equal(JSON.stringify(result.badges), JSON.stringify(base.badges));
    assert.equal(result.kits.find((kit) => kit.id === "kit-archived").status, "archive", "Archived per-kit progress remains available");
    context.getStoredPracticalSkillsKitContent = async () => { throw new Error("Database unavailable"); };
    await assert.rejects(context.buildPracticalSkillsLicenceSnapshot([]), /Database unavailable/, "Failures do not silently omit kits");
});

test("licence progress loads and syncs all registered kits, with matching action snapshots", () => {
    const start = source.indexOf('app.get("/api/practical-skills/my-progress"');
    const end = source.indexOf("\nconst certificateEmailCooldowns", start);
    const routes = source.slice(start, end);
    assert.match(routes, /const definitions = \[\.\.\.PRACTICAL_SKILLS_KIT_DEFINITIONS, \.\.\.customPracticalSkillsKits\.values\(\)\]/);
    assert.match(routes, /definitions\.map\(\(kit\) => syncPracticalSkillsKitCompletion/);
    assert.equal((routes.match(/await buildPracticalSkillsLicenceSnapshot\(rows\)/g) || []).length, 4);
    const memoryStart = source.indexOf("async function getAllPracticalSkillsProgressRows(");
    const memoryEnd = source.indexOf("\nasync function setPracticalSkillsKitCompletion(", memoryStart);
    const progressContext = vm.createContext({
        normalizeEmail: (value) => value,
        hasDatabase: false,
        PRACTICAL_SKILLS_KIT_DEFINITIONS: [{ id: "kit-login" }],
        customPracticalSkillsKits: new Map([["kit-files", { id: "kit-files" }]]),
        memoryPracticalSkillsProgress: new Map([
            ["student@school.nz:kit-files", { kit_id: "kit-files" }],
            ["other@school.nz:kit-files", { kit_id: "kit-files", completed: true }]
        ])
    });
    vm.runInContext(source.slice(memoryStart, memoryEnd), progressContext);
    return progressContext.getAllPracticalSkillsProgressRows("student@school.nz").then((rows) => {
        assert.equal(rows.length, 1);
        assert.equal(rows[0].kit_id, "kit-files");
        assert.equal(rows[0].completed, undefined, "Only the current student's progress is returned");
    });
});
