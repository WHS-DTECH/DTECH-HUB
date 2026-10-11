"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
const builderSource = fs.readFileSync(path.join(root, "practical-skills", "admin-kits.js"), "utf8");

function slice(source, startText, endText) {
    const start = source.indexOf(startText);
    const end = source.indexOf(endText, start);
    assert.ok(start >= 0 && end > start, `${startText} exists`);
    return source.slice(start, end);
}

async function main() {
    const builtIns = [{ id: "kit-login" }, { id: "kit-google-search" }, { id: "kit-minecraft" }];
    let storedRows = [{ kit_id: "kit-robots" }, { kit_id: "kit-login" }, { kit_id: "../bad" }];
    let loadQueries = 0;
    const registry = vm.createContext({
        PRACTICAL_SKILLS_KIT_DEFINITIONS: builtIns,
        hasDatabase: true,
        ensurePracticalSkillsKitContentSchema: async () => {},
        pool: { query: async (sql) => {
            loadQueries += 1;
            assert.match(sql, /content ->> 'customKit' = 'true'/, "Only kits created in the builder are registered");
            return { rows: storedRows };
        } },
        Promise, Date
    });
    vm.runInContext(slice(serverSource, "// Kits created in the Kit Content Builder.", "\nfunction getPracticalSkillsTier(")
        .replace(/^const (customPracticalSkillsKits)/m, "var $1").replace(/^let (customPracticalSkillsKitsLoad)/m, "var $1"), registry);

    await registry.ensureCustomPracticalSkillsKitsLoaded();
    await registry.ensureCustomPracticalSkillsKitsLoaded();
    assert.equal(loadQueries, 1, "Saved custom kits are loaded once");
    assert.equal(registry.getPracticalSkillsKitDefinition("kit-robots").custom, true, "Saved custom kits survive restarts");
    assert.equal(registry.getPracticalSkillsKitDefinition("kit-login").custom, undefined, "Built-in kits are not replaced");
    assert.equal(registry.getPracticalSkillsKitDefinition("../bad"), null, "Unsafe IDs are ignored");
    assert.equal(registry.PRACTICAL_SKILLS_KIT_DEFINITIONS.length, 3, "Points and every-kit badges still use the built-in kits only");
    assert.equal(registry.createCustomPracticalSkillsKitId("Robots"), "kit-robots-2", "New IDs never collide with existing kits");
    assert.equal(registry.createCustomPracticalSkillsKitId("Login"), "kit-login-2", "New kits never overwrite built-in kits");
    assert.equal(registry.createCustomPracticalSkillsKitId("Café & 3D Printing!"), "kit-cafe-3d-printing");
    assert.equal(registry.createCustomPracticalSkillsKitId("Kit: Drones"), "kit-drones");
    assert.equal(registry.createCustomPracticalSkillsKitId("!!!"), "kit-new");

    const routes = {};
    let saveFails = false;
    const saved = [];
    const routeContext = vm.createContext({
        app: {
            get: (url, _auth, handler) => { routes[`GET ${url}`] = handler; },
            post: (url, _auth, handler) => { routes[`POST ${url}`] = handler; },
            put: (url, _auth, handler) => { routes[`PUT ${url}`] = handler; }
        },
        requireAdminAccess() {},
        PRACTICAL_SKILLS_KIT_DEFINITIONS: builtIns,
        customPracticalSkillsKits: registry.customPracticalSkillsKits,
        getPracticalSkillsKitDefinition: registry.getPracticalSkillsKitDefinition,
        createCustomPracticalSkillsKitId: registry.createCustomPracticalSkillsKitId,
        registerCustomPracticalSkillsKit: registry.registerCustomPracticalSkillsKit,
        getRequestUserEmail: () => "teacher@school.nz",
        normalizeEmail: (value) => String(value || "").toLowerCase(),
        getStoredPracticalSkillsKitContent: async (id) => ({ identity: { name: id === "kit-robots" ? "Robots" : "" }, bannerTitle: id === "kit-login" ? "Login Kit" : "" }),
        savePracticalSkillsKitContent: async (id, content) => {
            if (saveFails) throw new Error("db down");
            saved.push({ id, content });
            return { ...content, kitId: id };
        },
        syncPracticalSkillsKitLibraryCard: async (id, content) => ({ id, title: content.identity.name, status: content.identity.status })
    });
    vm.runInContext(slice(serverSource, 'app.put("/api/admin/practical-skills/kit-content/:kitId"', '\napp.post("/api/practicals/events"'), routeContext);
    const call = async (key, req) => {
        const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
        await routes[key]({ params: {}, ...req }, res);
        return res;
    };

    const listed = await call("GET /api/admin/practical-skills/kits", {});
    assert.deepEqual(JSON.parse(JSON.stringify(listed.body.kits.map((kit) => [kit.id, kit.title, kit.custom]))), [
        ["kit-login", "Login Kit", false], ["kit-google-search", "kit-google-search", false],
        ["kit-minecraft", "kit-minecraft", false], ["kit-robots", "Robots", true]
    ], "Builder dropdown lists built-in and created kits");

    assert.equal((await call("POST /api/admin/practical-skills/kits", { body: { content: { identity: { name: " " } } } })).code, 400,
        "A new kit needs a name");
    assert.equal((await call("POST /api/admin/practical-skills/kits", { body: { content: [] } })).code, 400);

    const content = { identity: { name: "Micro:bit Basics", status: "planning" }, worksheets: [{ activity: "Plug in" }] };
    const created = await call("POST /api/admin/practical-skills/kits", { body: { content } });
    assert.equal(created.code, 201);
    assert.equal(created.body.kitId, "kit-micro-bit-basics");
    assert.equal(saved.at(-1).content.customKit, true, "Created kits are flagged so they reload after restart");
    assert.equal(created.body.libraryCard.status, "planning", "The library card uses the chosen status");
    assert.ok(registry.getPracticalSkillsKitDefinition("kit-micro-bit-basics"), "Students can open the created kit");

    const updated = await call("PUT /api/admin/practical-skills/kit-content/:kitId", {
        params: { kitId: "kit-micro-bit-basics" }, body: { content: { identity: { name: "Micro:bit" } } }
    });
    assert.equal(updated.code, 200);
    assert.equal(saved.at(-1).content.customKit, true, "Editing a created kit keeps it registered");
    await call("PUT /api/admin/practical-skills/kit-content/:kitId", { params: { kitId: "kit-login" }, body: { content: { identity: { name: "Login" } } } });
    assert.equal(saved.at(-1).content.customKit, undefined, "Built-in kits are never flagged as custom");

    saveFails = true;
    const failed = await call("POST /api/admin/practical-skills/kits", { body: { content: { identity: { name: "Lost Kit" } } } });
    assert.equal(failed.code, 500);
    assert.equal(registry.getPracticalSkillsKitDefinition("kit-lost-kit"), null, "A failed create does not leave a phantom kit");

    assert.match(serverSource, /app\.use\(\/\^\\\/api\\\/\(admin\\\/\)\?practical-skills\\\/\/, async[\s\S]*?ensureCustomPracticalSkillsKitsLoaded\(\)/,
        "Practical skills APIs wait for created kits to load");
    assert.ok(serverSource.indexOf("ensureCustomPracticalSkillsKitsLoaded();\n    next();") < serverSource.indexOf('app.get("/api/practical-skills/library"'),
        "The loader runs before every practical skills route");

    assert.match(builderSource, /const NEW_KIT_LABEL = "\+ New Kit \(blank\)";/);
    assert.match(builderSource, /kitId: NEW_KIT_ID,/, "The blank kit is the default selection");
    assert.match(builderSource, /new URLSearchParams\(window\.location\.search\)\.get\("kit"\) \|\| NEW_KIT_ID/,
        "Links to a specific kit still open that kit");
    assert.match(builderSource, /kitSelect\.replaceChildren\(option\(NEW_KIT_ID, NEW_KIT_LABEL\), \.\.\.KIT_CATALOG/,
        "The blank kit is listed first");
    assert.match(builderSource, /Save the kit first/, "Activity Details waits until the new kit has an ID");
    assert.doesNotMatch(builderSource, /kitSelect\.innerHTML/, "Kit titles are inserted as text");
    console.log("Kit Builder blank new kit, creation, restart loading and catalog regressions passed.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
