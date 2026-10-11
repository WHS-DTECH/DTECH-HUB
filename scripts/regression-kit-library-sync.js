"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
const library = JSON.parse(fs.readFileSync(path.join(root, "practical-skills", "library.json"), "utf8"));
const existingCards = [{
    id: "kit-google-search",
    title: "Google Search",
    summary: "Keep the teacher-authored card details",
    yearLevel: "Junior DTECH",
    area: "Search Skills",
    status: "active",
    href: "/old-link",
    imageUrl: "/images/search.png",
    visual: { icon: "🔎", palette: "custom palette" }
}];
let persistedCards = existingCards;

const helperStart = serverSource.indexOf("async function syncPracticalSkillsKitLibraryCard(");
const helperEnd = serverSource.indexOf("\nasync function getSuggestionRecipients()", helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, "Kit library sync helper exists");
const libraryContext = vm.createContext({
    readPracticalSkillsLibraryFile: async () => structuredClone(persistedCards),
    writePracticalSkillsLibraryFile: async (cards) => { persistedCards = structuredClone(cards); return cards; },
    normalizePracticalSkillLibraryItem: (card) => card,
    encodeURIComponent
});
vm.runInContext(serverSource.slice(helperStart, helperEnd), libraryContext);

async function main() {
    const saved = {
        identity: { name: "Search Kit", yearLevel: "Junior DTECH", skillArea: "Search Skills", status: "active" },
        bannerTitle: "Search Kit",
        bannerSubtitle: "Search with confidence",
        theme: { icon: "🔍" }
    };

    const updated = await libraryContext.syncPracticalSkillsKitLibraryCard("kit-google-search", saved);
    assert.equal(updated.title, "Search Kit");
    assert.equal(updated.href, "/practical-skills/kit-worksheet.html?kit=kit-google-search");
    assert.equal(updated.summary, "Keep the teacher-authored card details", "Updating the kit keeps independently edited library details");
    assert.equal(updated.imageUrl, "/images/search.png");
    assert.equal(updated.visual.palette, "custom palette");
    assert.equal(persistedCards.length, 1, "Updating kit content does not duplicate its card");

    const created = await libraryContext.syncPracticalSkillsKitLibraryCard("kit-minecraft", {
        identity: { name: "Minecraft Kit", yearLevel: "Year 8 DTECH", skillArea: "Design", status: "planning" },
        bannerSubtitle: "Build and test a world.",
        theme: { icon: "🧱" }
    });
    assert.equal(created.title, "Minecraft Kit");
    assert.equal(created.summary, "Build and test a world.");
    assert.equal(created.yearLevel, "Year 8 DTECH");
    assert.equal(created.area, "Design");
    assert.equal(created.status, "planning");
    assert.equal(created.href, "/practical-skills/kit-worksheet.html?kit=kit-minecraft");
    assert.equal(persistedCards.length, 2, "A new kit gets a matching library card");
    assert.equal(await libraryContext.syncPracticalSkillsKitLibraryCard("kit-empty", {}), null, "No nameless card is created");

    const routeStart = serverSource.indexOf('app.put("/api/admin/practical-skills/kit-content/:kitId"');
    const routeEnd = serverSource.indexOf('\napp.post("/api/practicals/events"', routeStart);
    assert.ok(routeStart >= 0 && routeEnd > routeStart, "Kit content admin route exists");
    const routes = {};
    const routeContext = vm.createContext({
        app: { put: (url, auth, handler) => { routes[url] = handler; }, get() {}, post() {} },
        requireAdminAccess() {},
        getPracticalSkillsKitDefinition: () => true,
        customPracticalSkillsKits: new Map(),
        getRequestUserEmail: () => "teacher@school.nz",
        normalizeEmail: (value) => String(value || "").toLowerCase(),
        savePracticalSkillsKitContent: async (_id, content) => content,
        syncPracticalSkillsKitLibraryCard: async (id, content) => ({ id, title: content.identity.name })
    });
    vm.runInContext(serverSource.slice(routeStart, routeEnd), routeContext);
    const response = {
        code: 200, status(code) { this.code = code; return this; },
        json(body) { this.body = body; return this; }
    };
    await routes["/api/admin/practical-skills/kit-content/:kitId"]({
        params: { kitId: "kit-google-search" },
        body: { content: saved }
    }, response);
    assert.equal(response.code, 200);
    assert.equal(response.body.libraryCard.title, "Search Kit", "Saving Kit Content returns its synced library card");

    const searchCard = library.find((card) => card.id === "kit-google-search");
    assert.ok(searchCard, "Search Kit exists in the published starter library");
    assert.equal(searchCard.title, "Search Kit");
    assert.equal(searchCard.href, "/practical-skills/kit-worksheet.html?kit=kit-google-search");
    assert.equal(searchCard.yearLevel, "Junior DTECH");
    const minecraftSeed = library.find((card) => card.id === "kit-minecraft");
    assert.ok(minecraftSeed, "Minecraft Builder Kit is in the starter library seed");

    const storeStart = serverSource.indexOf("async function readPracticalSkillsLibrarySeedFile() {");
    const storeEnd = serverSource.indexOf("\nasync function syncPracticalSkillsKitLibraryCard(", storeStart);
    const buildStart = serverSource.indexOf("function buildPracticalSkillsKitLibraryCard(");
    const buildEnd = serverSource.indexOf("\nasync function getSuggestionRecipients()", buildStart);
    assert.ok(storeStart >= 0 && storeEnd > storeStart && buildStart >= 0 && buildEnd > buildStart, "Persistent library store exists");
    let dbCards = null;
    const queries = [];
    const seedCards = [{ id: "kit-login", title: "Login Kit" }];
    const storeContext = vm.createContext({
        hasDatabase: true,
        PRACTICAL_SKILLS_LIBRARY_FILE: "library.json",
        fs: { promises: {
            readFile: async () => JSON.stringify(seedCards),
            writeFile: async () => { throw new Error("Database mode must not rely on the deploy file"); }
        } },
        normalizePracticalSkillLibraryItem: (card) => card,
        ensurePracticalSkillsKitContentSchema: async () => {},
        encodeURIComponent,
        JSON,
        pool: { query: async (sql, params) => {
            queries.push(sql);
            if (/SELECT cards FROM practical_skills_library_store/.test(sql)) return { rows: dbCards ? [{ cards: structuredClone(dbCards) }] : [] };
            if (/SELECT kit_id, content FROM practical_skills_kit_content/.test(sql)) return { rows: [
                { kit_id: "kit-login", content: { identity: { name: "Login Kit" } } },
                { kit_id: "kit-minecraft", content: { identity: { name: "Minecraft Builder Kit", skillArea: "Application Kits", yearLevel: "Junior DTECH" }, bannerSubtitle: "Build it", theme: { icon: "🧱" } } }
            ] };
            if (/INSERT INTO practical_skills_library_store/.test(sql)) { dbCards = JSON.parse(params[0]); return { rows: [] }; }
            return { rows: [] };
        } }
    });
    vm.runInContext(serverSource.slice(storeStart, storeEnd) + serverSource.slice(buildStart, buildEnd), storeContext);
    const firstRead = await storeContext.readPracticalSkillsLibraryFile();
    assert.deepEqual(firstRead.map((card) => card.id), ["kit-login", "kit-minecraft"], "First read seeds from file and restores missing saved kits");
    assert.equal(firstRead[1].area, "Application Kits");
    assert.deepEqual(dbCards.map((card) => card.id), ["kit-login", "kit-minecraft"], "Seeded library is persisted in the database");
    dbCards = [{ id: "kit-login", title: "Login Kit" }];
    const laterRead = await storeContext.readPracticalSkillsLibraryFile();
    assert.deepEqual(laterRead.map((card) => card.id), ["kit-login"], "Stored library is the source of truth after seeding (removed cards stay removed)");
    await storeContext.writePracticalSkillsLibraryFile([{ id: "kit-login", title: "Login Kit" }, { id: "kit-minecraft", title: "Minecraft Builder Kit" }]);
    assert.equal(dbCards.length, 2, "Saving the library writes to the database");

    const staticIndex = serverSource.indexOf("app.use(express.static(__dirname));");
    const libraryRouteIndex = serverSource.indexOf('app.get("/practical-skills/library.json"');
    assert.ok(libraryRouteIndex >= 0 && libraryRouteIndex < staticIndex, "library.json is served from the persistent store before static files");

    console.log("Kit-to-Licence Library synchronization regressions passed.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
