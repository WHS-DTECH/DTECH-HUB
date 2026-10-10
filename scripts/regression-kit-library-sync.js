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
        app: { put: (url, auth, handler) => { routes[url] = handler; } },
        requireAdminAccess() {},
        getPracticalSkillsKitDefinition: () => true,
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

    console.log("Kit-to-Licence Library synchronization regressions passed.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
