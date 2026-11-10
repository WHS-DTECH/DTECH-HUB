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
        "kit-archived": { identity: { name: "Archived", status: "archive" } },
        "kit-deleted": { identity: { name: "Deleted", status: "active" }, deletedAt: "2026-10-24T00:00:00Z" }
    };
    const base = { kits: [{ id: "kit-login", isComplete: true }], completedCount: 1, totalKits: 3, totalPoints: 100, badges: [{ id: "first-kit" }] };
    const context = vm.createContext({
        computePracticalSkillsSnapshot: () => structuredClone(base),
        customPracticalSkillsKits: new Map(Object.keys(content).map((id) => [id, { id }])),
        ensureCustomPracticalSkillsKitsLoaded: async () => {},
        kitPublication: { filterSnapshot: async (snapshot) => snapshot },
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
    assert.match(routes, /definitions\.slice\(index, index \+ 4\)\.map\(\(kit\) => syncPracticalSkillsKitCompletion/);
    assert.equal((routes.match(/await buildPracticalSkillsLicenceSnapshot\(rows(?:, manager)?\)/g) || []).length, 4);
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

test("saved licence loads without completion refresh; normal reads still reconcile live kits with bounded concurrency", async () => {
        let handler, refreshed = 0, active = 0, peak = 0;
        const synced = [];
        const definitions = Array.from({ length: 10 }, (_, index) => ({ id: `kit-${index}` }));
        const rows = [{ kit_id: "kit-0", completed: true }];
        const context = vm.createContext({
            app: { get(route, fn) { handler = fn; } },
            normalizeEmail: value => value.toLowerCase(), getRequestUserEmail: req => req.email,
            SCHOOL_EMAIL_DOMAIN: "school.nz", PRACTICAL_SKILLS_KIT_DEFINITIONS: definitions,
            customPracticalSkillsKits: new Map(),
            kitPublication: { catalog: async () => definitions.map((kit, index) => ({ ...kit, live: index !== 9 })) },
            refreshLearningSitesCheckIn: async () => { refreshed++; },
            syncPracticalSkillsKitCompletion: async (email, id) => {
                assert.equal(email, "student@school.nz");
                active++;
                peak = Math.max(peak, active);
                await new Promise(resolve => setImmediate(resolve));
                active--;
                synced.push(id);
            },
            canManagePracticalSchedule: async () => true,
            getAllPracticalSkillsProgressRows: async () => rows,
            getPracticalSkillsStudentName: async () => "Synthetic Student",
            buildPracticalSkillsLicenceSnapshot: async saved => ({ kits: saved, canManageKits: true }),
            console
        });
        const start = source.indexOf('app.get("/api/practical-skills/my-progress"');
        const end = source.indexOf('\napp.post("/api/practical-skills/progress/', start);
        vm.runInContext(source.slice(start, end), context);
        async function call(query = {}, email = "student@school.nz") {
            const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
            await handler({ email, query }, res);
            return res;
        }
        const begin = performance.now();
        const saved = await call({ refresh: "deferred" });
        assert.ok(performance.now() - begin < 1000, "Saved licence must not wait for completion refresh");
        assert.equal(saved.body.kits, rows);
        assert.equal(saved.body.student.name, "Synthetic Student");
        assert.equal(saved.body.canManageKits, true);
        assert.equal(saved.body.progressRefreshPending, true);
        assert.equal(refreshed, 0);
        assert.equal(synced.length, 0, "Initial read neither creates nor regrades progress");
        const fresh = await call();
        assert.equal(fresh.body.progressRefreshPending, false);
        assert.equal(refreshed, 1, "Yearly course check-in still runs");
        assert.equal(synced.length, 9);
        assert.ok(!synced.includes("kit-9"), "Not Live kits are not regraded");
        assert.equal(peak, 4);
        assert.equal((await call({ refresh: "deferred" }, "outside@example.test")).code, 401);
    });

    for (const [name, next, count] of [
        ["PracticalSkillsProgress", "// Starter drafts only", 9],
        ["PracticalSkillsKitContent", "async function getPracticalSkillsKitContent(", 4]
    ]) {
        test(`${name} schema setup is shared by concurrent reads, cached after success, and retried after failure`, async () => {
            const functionName = `ensure${name}Schema`;
            const variable = name[0].toLowerCase() + name.slice(1) + "SchemaReady";
            const start = source.indexOf(`let ${variable};`);
            const end = source.indexOf(next, start);
            let queries = 0, fail = true;
            const context = vm.createContext({ hasDatabase: true, pool: { query: async () => {
                queries++;
                await new Promise(resolve => setImmediate(resolve));
                if (fail) throw new Error("Database unavailable");
                return { rows: [] };
            } } });
            vm.runInContext(source.slice(start, end), context);
            const failed = await Promise.allSettled(Array.from({ length: 20 }, () => context[functionName]()));
            assert.ok(failed.every(result => result.status === "rejected"), "Schema failure is surfaced to every waiting caller");
            assert.equal(queries, 1);
            fail = false;
            await Promise.all(Array.from({ length: 20 }, () => context[functionName]()));
            assert.equal(queries, count + 1, "Only one complete setup runs after the failure");
            await context[functionName]();
            assert.equal(queries, count + 1, "Ordinary progress/content reads no longer repeat DDL");
        });
    }
