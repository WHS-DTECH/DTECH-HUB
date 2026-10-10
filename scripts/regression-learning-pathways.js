"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const express = require("express");
const { registerLearningPathways, normalizeCards } = require("../learning-pathways/library-store");
const root = path.join(__dirname, "..");
const sample = { id: "web", title: "Web Design", summary: "Choose your next web learning steps.",
    href: "/learning-pathways/web.html", yearLevel: "Senior DTECH", area: "Web", status: "active" };

class Element {
    constructor(tagName = "") {
        this.tagName = tagName;
        this.children = []; this.value = ""; this.textContent = ""; this.dataset = {}; this.style = {};
        this.classList = { toggle() {}, add() {}, remove() {} };
    }
    append(...items) { this.children.push(...items); }
    appendChild(item) { this.children.push(item); }
    replaceChildren(...items) { this.children = items; }
    setAttribute() {}
    addEventListener(name, fn) { this[name] = fn; }
    querySelectorAll() { return this.children; }
    focus() {}
    set innerHTML(value) { this.html = value; if (!value) this.children = []; }
    get innerHTML() { return this.html || ""; }
}
const tick = () => new Promise((resolve) => setImmediate(resolve));

async function testDashboard() {
    const names = ["grid", "results-meta", "search", "year-pills", "status-pills", "category-pills", "sort"];
    const elements = Object.fromEntries(names.map((name) => [`#practical-skills-${name}`, new Element()]));
    const config = { dataset: { libraryPath: "/learning-pathways/library.json",
        libraryName: "Learning Pathways", libraryCardLabel: "LEARNING PATHWAY", libraryIcon: "LP" } };
    let responseCards = [];
    let fails = false;
    const context = vm.createContext({
        document: { querySelector: () => config, getElementById: (id) => elements[`#${id}`], createElement: (tag) => new Element(tag) },
        fetch: async (url, options) => {
            assert.equal(url, config.dataset.libraryPath || "/practical-skills/library.json");
            assert.equal(options.cache, "no-store");
            return { ok: !fails, json: async () => responseCards };
        },
        console: { error() {} }
    });
    vm.runInContext(fs.readFileSync(path.join(root, "practical-skills/app.js"), "utf8"), context);
    await tick();
    const grid = elements["#practical-skills-grid"];
    assert.match(grid.children[0].innerHTML, /Learning pathways are coming soon/);
    responseCards = [sample, { ...sample, id: "art", title: "Art", area: "Design", yearLevel: "Junior DTECH" }];
    fails = true;
    // A fresh load distinguishes an API failure from a genuinely empty library.
    vm.runInContext(fs.readFileSync(path.join(root, "practical-skills/app.js"), "utf8"), context);
    await tick();
    assert.equal(elements["#practical-skills-results-meta"].textContent, "Library could not be loaded.");
    assert.equal(grid.children[0].children[1].textContent, "Retry loading library");
    fails = false;
    await grid.children[0].children[1].click();
    assert.equal(grid.children.length, 2);
    assert.match(grid.children[0].innerHTML, /LEARNING PATHWAY/);
    assert.equal(grid.children[0].href, sample.href, "Cards retain their configured links");
    const search = elements["#practical-skills-search"];
    search.value = "web design";
    search.input();
    assert.equal(grid.children.length, 1);
    assert.match(grid.children[0].innerHTML, /Web Design/);
    search.value = "";
    search.input();
    const years = elements["#practical-skills-year-pills"];
    years.children.find((pill) => pill.textContent === "Senior DTECH").click();
    assert.equal(grid.children.length, 1);
    years.children[0].click();
    elements["#practical-skills-sort"].value = "name-desc";
    elements["#practical-skills-sort"].change();
    assert.match(grid.children[0].innerHTML, /Web Design/);
    const categories = elements["#practical-skills-category-pills"];
    categories.children.find((pill) => pill.textContent === "Design").click();
    assert.equal(grid.children.length, 1);
    assert.match(grid.children[0].innerHTML, /Art/);
    responseCards = [{ ...sample, href: "" }];
    vm.runInContext(fs.readFileSync(path.join(root, "practical-skills/app.js"), "utf8"), context);
    await tick();
    assert.equal(grid.children[0].tagName, "article", "Display-only pathways are not links");
    assert.equal(grid.children[0].href, undefined);
    config.dataset = {};
    responseCards = [sample, { ...sample, id: "practical-skills-checklist", title: "Licence" }];
    vm.runInContext(fs.readFileSync(path.join(root, "practical-skills/app.js"), "utf8"), context);
    await tick();
    assert.equal(grid.children.length, 1, "Licence Library still excludes the standalone checklist");
    assert.match(grid.children[0].innerHTML, /PRACTICAL SKILL/);
    assert.match(grid.children[0].innerHTML, /#2f8f61/, "Existing Licence Library green palette is preserved");
}

async function testEditor() {
    const names = ["form", "fields", "message", "cards", "search", "retry", "id", "title", "summary",
        "year", "area", "href", "image", "status", "icon", "publish", "clear"];
    const elements = Object.fromEntries(names.map((name) => [`#pathways-${name}`, new Element()]));
    elements["#pathways-form"].reset = () => {
        ["id", "title", "summary", "year", "area", "href", "image", "icon"].forEach((name) => { elements[`#pathways-${name}`].value = ""; });
        elements["#pathways-status"].value = "active";
    };
    const events = {};
    let saved = [];
    let failPublish = false;
    const context = vm.createContext({
        document: { querySelector: (selector) => elements[selector], createElement: () => new Element() },
        window: { confirm: () => true, addEventListener: (name, fn) => { events[name] = fn; } },
        getActiveHubEmail: () => "admin@example.test",
        withHubAuthHeaders: (headers) => headers,
        fetch: async (url, options) => {
            assert.equal(url, "/api/admin/learning-pathways/library");
            if (options.method === "PUT") {
                if (failPublish) return { ok: false, json: async () => ({ error: "Storage unavailable" }) };
                saved = normalizeCards(JSON.parse(options.body).cards);
            }
            return { ok: true, json: async () => ({ cards: JSON.parse(JSON.stringify(saved)) }) };
        }
    });
    vm.runInContext(fs.readFileSync(path.join(root, "learning-pathways/admin.js"), "utf8"), context);
    await tick();
    assert.equal(elements["#pathways-fields"].disabled, false);
    for (const [name, value] of Object.entries({ title: sample.title, summary: sample.summary, href: sample.href, status: "active" })) {
        elements[`#pathways-${name}`].value = value;
    }
    elements["#pathways-form"].submit({ preventDefault() {} });
    assert.equal(saved.length, 0, "Draft changes do not publish themselves");
    assert.match(elements["#pathways-message"].textContent, /draft/);
    failPublish = true;
    await elements["#pathways-publish"].click();
    assert.match(elements["#pathways-message"].textContent, /Publish failed/);
    failPublish = false;
    await elements["#pathways-publish"].click();
    assert.equal(saved.length, 1, "Failed publish retains draft for retry");
    const row = elements["#pathways-cards"].children[0];
    row.children[3].click();
    elements["#pathways-title"].value = "Updated Pathway";
    elements["#pathways-form"].submit({ preventDefault() {} });
    await elements["#pathways-publish"].click();
    assert.equal(saved[0].title, "Updated Pathway");
    elements["#pathways-cards"].children[0].children[4].click();
    await elements["#pathways-publish"].click();
    assert.equal(saved.length, 0, "Deletion persists after publishing");
    context.getActiveHubEmail = () => "";
    context.fetch = async () => ({ ok: false, json: async () => ({ error: "Admin required" }) });
    events["hub-auth-state-changed"]();
    await tick();
    assert.equal(elements["#pathways-fields"].disabled, true, "Signed-out users cannot keep editing");
    assert.match(elements["#pathways-message"].textContent, /Admin required/);
    assert.equal(elements["#pathways-cards"].children[0].textContent, "No pathway cards yet. Add your first card above.");
}

async function main() {
    const seed = normalizeCards(JSON.parse(fs.readFileSync(path.join(root, "learning-pathways/library.json"), "utf8")));
    assert.deepEqual(seed.map((card) => card.title), ["Digital systems", "Programming & Algorithms", "Data and Information",
        "Digital citizenship", "Systems and control"]);
    assert.ok(seed.every((card) => card.area === card.title && card.href === "" && card.yearLevel === "Junior DTECH"));
    assert.throws(() => normalizeCards(null), /cards array/);
    for (const href of ["javascript:alert(1)", "data:text/html,test", "//example.test", "/\\example.test"]) {
        assert.throws(() => normalizeCards([{ ...sample, href }]), /links/);
    }
    assert.throws(() => normalizeCards([sample, sample]), /Duplicate/);
    assert.throws(() => normalizeCards([{ ...sample, status: "unknown" }]), /invalid status/);
    assert.throws(() => normalizeCards([{ ...sample, title: "" }]), /requires/);
    assert.equal(normalizeCards([{ ...sample, href: "https://example.test/path" }])[0].href, "https://example.test/path");
    const existing = { ...sample, id: "digital-systems", title: "Existing edited systems", href: "" };
    let stored = [existing, sample];
    let seedVersion = 0;
    const pool = { query: async (sql, params) => {
        assert.match(sql, /learning_pathways_library_store/, "Never writes the Licence Library table");
        if (sql.includes("INSERT INTO") && (stored === null || !sql.includes("DO NOTHING"))) {
            stored = JSON.parse(params[0]);
            seedVersion = 4;
        }
        if (sql.includes("seed_version < 1") && seedVersion < 1) {
            const starters = JSON.parse(params[0]);
            stored = [...stored, ...starters.filter((card) => !stored.some((old) => old.id === card.id))];
            seedVersion = 1;
        }
        if (sql.includes("seed_version < 2") && seedVersion < 2) {
            const hasOld = stored.some((card) => ["programming", "algorithms"].includes(card.id));
            const hasCombined = stored.some((card) => card.id === "programming-and-algorithms");
            stored = stored.filter((card) => !["programming", "algorithms"].includes(card.id));
            if (hasOld && !hasCombined) stored.push(...JSON.parse(params[0]));
            seedVersion = 2;
        }
        if (sql.includes("seed_version < 3") && seedVersion < 3) {
            stored = stored.map((card) => card.id === "data"
                ? { ...card, title: "Data and Information", area: "Data and Information" } : card);
            seedVersion = 3;
        }
        if (sql.includes("seed_version < 4") && seedVersion < 4) {
            stored = stored.filter((card) => card.id !== "design-and-innovation");
            seedVersion = 4;
        }
        return { rows: sql.startsWith("SELECT") && stored !== null ? [{ cards: stored }] : [] };
    } };
    const app = express();
    app.use(express.json());
    const auth = (req, res, next) => req.headers["x-test-admin"] === "yes" ? next() : res.status(403).json({ error: "Admin required" });
    registerLearningPathways(app, { pool, hasDatabase: true, requireAdminAccess: auth });
    const server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
        let response = await fetch(`${base}/learning-pathways/library.json`);
        assert.match(response.headers.get("cache-control"), /no-store/);
        const migrated = await response.json();
        assert.equal(migrated.length, 6, "One-time preload preserves existing custom cards");
        assert.equal(migrated.find((card) => card.id === "digital-systems").title, "Existing edited systems",
            "Preload does not overwrite existing cards with the same ID");
        assert.equal(migrated.filter((card) => card.id === "digital-systems").length, 1);
        assert.equal((await (await fetch(`${base}/learning-pathways/library.json`)).json()).length, 6,
            "Repeated reads do not duplicate starter cards");
        stored = [existing, sample, { ...sample, id: "programming" }, { ...sample, id: "algorithms" }];
        seedVersion = 1;
        const merged = await (await fetch(`${base}/learning-pathways/library.json`)).json();
        assert.equal(merged.length, 3);
        assert.deepEqual(merged.slice(0, 2), normalizeCards([existing, sample]), "Unrelated cards remain unchanged");
        assert.equal(merged[2].title, "Programming & Algorithms");
        assert.match(merged[2].summary, /algorithms.*debug.*test and improve/);
        assert.equal(merged[2].href, "");
        stored = [existing, { ...seed.find((card) => card.id === "programming-and-algorithms"), title: "Edited combined card" },
            { ...sample, id: "programming" }, { ...sample, id: "algorithms" }];
        seedVersion = 1;
        const preserved = await (await fetch(`${base}/learning-pathways/library.json`)).json();
        assert.equal(preserved.length, 2);
        assert.equal(preserved[1].title, "Edited combined card", "Existing combined edits are preserved");
        const oldData = { ...sample, id: "data", title: "Data", area: "Data" };
        stored = [sample, oldData];
        seedVersion = 2;
        const renamed = await (await fetch(`${base}/learning-pathways/library.json`)).json();
        assert.deepEqual(renamed, normalizeCards([sample, { ...oldData, title: "Data and Information", area: "Data and Information" }]),
            "Rename changes only Data heading and category, preserving description and other cards");
        stored = [existing, { ...sample, id: "design-and-innovation", title: "Design and innovation" }, sample];
        seedVersion = 3;
        const removed = await (await fetch(`${base}/learning-pathways/library.json`)).json();
        assert.deepEqual(removed, normalizeCards([existing, sample]), "Remove only Design and Innovation, preserving other cards and order");
        assert.deepEqual(await (await fetch(`${base}/learning-pathways/library.json`)).json(), removed,
            "Removed card stays removed after repeated reads");
        assert.equal((await fetch(`${base}/api/admin/learning-pathways/library`)).status, 403);
        const publish = (cards, admin = true) => fetch(`${base}/api/admin/learning-pathways/library`, {
            method: "PUT", headers: { "Content-Type": "application/json", "x-test-admin": admin ? "yes" : "no" },
            body: JSON.stringify({ cards })
        });
        assert.equal((await publish([sample], false)).status, 403);
        assert.equal((await publish([{ ...sample, href: "javascript:test" }])).status, 400);
        assert.equal((await publish([sample])).status, 200);
        response = await fetch(`${base}/api/learning-pathways/library`);
        assert.equal((await response.json())[0].title, sample.title);
        // A newly registered app represents a restart, reading the same durable store.
        const restarted = express();
        const routes = {};
        restarted.get = (url, ...handlers) => { routes[url] = handlers.at(-1); };
        registerLearningPathways(restarted, { pool, hasDatabase: true, requireAdminAccess: auth });
        let result;
        await routes["/learning-pathways/library.json"]({}, { set() {}, json(value) { result = value; } });
        assert.equal(result[0].title, sample.title, "Published cards survive a fresh app registration");
        await publish([]);
        await routes["/learning-pathways/library.json"]({}, { set() {}, json(value) { result = value; } });
        assert.deepEqual(result, [], "Published empty library stays empty after restart");
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
    await testEditor();
    await testDashboard();
    const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
    assert.ok(serverSource.indexOf('require("./learning-pathways/library-store")') < serverSource.indexOf("app.use(express.static(__dirname))"));
    console.log("Learning Pathways library, persistence, editor and dashboard regressions passed.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
