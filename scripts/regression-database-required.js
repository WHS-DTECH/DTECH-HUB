"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const { spawnSync } = require("node:child_process");
const { requireDatabaseUrl } = require("../database-required");
const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "server.js"), "utf8");

test("the real server refuses to start without PostgreSQL configuration", () => {
    for (const value of [undefined, null, "", " \t "]) assert.throws(() => requireDatabaseUrl(value), /DATABASE_URL is required/);
    assert.equal(requireDatabaseUrl("postgresql://configured.example/database"), true);
    const result = spawnSync(process.execPath, ["server.js"], {
        cwd: root, env: { ...process.env, DATABASE_URL: "" }, encoding: "utf8", timeout: 20000
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /DATABASE_URL is required/);
    assert.doesNotMatch(result.stdout, /running on port/);
});

test("kit and activity content survive fresh server storage contexts and database write failures reject", async () => {
    const start = source.indexOf("async function getStoredPracticalSkillsKitContent(");
    const end = source.indexOf("\nasync function savePracticalSkillsKitResponses(", start);
    const database = new Map();
    let unavailable = false;
    const pool = { query: async (sql, params) => {
        if (unavailable) throw new Error("PostgreSQL unavailable");
        if (sql.includes("INSERT INTO practical_skills_kit_content")) {
            database.set(params[0], JSON.parse(params[1])); return { rows: [] };
        }
        if (sql.includes("SELECT content")) return { rows: database.has(params[0]) ? [{ content: structuredClone(database.get(params[0])) }] : [] };
        throw new Error(`Unexpected query: ${sql}`);
    } };
    const context = () => {
        const ctx = vm.createContext({
            hasDatabase: true, pool, ActivityBlocks: require("../practical-skills/activity-blocks"),
            normalizeEmail: (value) => value,
            ensurePracticalSkillsKitContentSchema: async () => {},
            normalizePracticalSkillsKitContentForStorage: (_id, content) => structuredClone(content),
            getDefaultPracticalSkillsKitContent: () => ({}),
            ...Object.fromEntries(["withShortLoginKit", "withLearningSitesActivity", "withLoginAppsActivity", "withLoginIdentityActivity", "withPasswordProblemsActivity"].map((name) => [name, (_id, content) => content]))
        });
        vm.runInContext(source.slice(start, end), ctx);
        return ctx;
    };
    const kit = { customKit: true, identity: { name: "Files & Folders" }, activities: [{
        title: "Create a folder", completionMode: "manual", blocks: [{ id: "instructions", kind: "text", text: "Create it.\nSave it.", numbered: true }]
    }] };
    await context().savePracticalSkillsKitContent("kit-files", kit, "teacher@school.nz");
    const reloaded = await context().getStoredPracticalSkillsKitContent("kit-files");
    assert.equal(reloaded.identity.name, "Files & Folders");
    assert.deepEqual(reloaded.activities, kit.activities);
    unavailable = true;
    await assert.rejects(context().savePracticalSkillsKitContent("kit-files", kit, "teacher@school.nz"), /PostgreSQL unavailable/);
    await assert.rejects(context().getStoredPracticalSkillsKitContent("kit-files"), /PostgreSQL unavailable/);
    assert.equal(database.get("kit-files").identity.name, "Files & Folders");
});

test("Licence APIs and static assets cannot indefinitely serve stale mixed collections", () => {
    assert.match(source, /app\.use\(\/\^\\\/api\\\/\(admin\\\/\)\?practical-skills\\\/\/, async[\s\S]*?res\.set\("Cache-Control", "private, no-store"\)/);
    const header = source.indexOf('app.use("/practical-skills", (_req, res, next) =>');
    assert.ok(header > 0 && header < source.indexOf("app.use(express.static(__dirname));"));
    assert.match(source.slice(header, header + 160), /"Cache-Control", "no-cache"/);
    const html = fs.readFileSync(path.join(root, "practical-skills", "checklist.html"), "utf8");
    assert.match(html, /checklist\.js\?v=4/);
    const renderer = fs.readFileSync(path.join(root, "practical-skills", "checklist.js"), "utf8");
    assert.match(renderer, /licenceKits\.map/);
    assert.match(renderer, /licenceKits\.forEach/);
    assert.match(renderer, /ps-completed-kits"\)\.textContent = loaded \? `\$\{completed\} \/ \$\{total\}`/);
});
