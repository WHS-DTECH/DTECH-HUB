"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname, "..");

class Element {
    constructor() {
        this.children = []; this.dataset = {}; this.style = {};
        this.classList = { toggle() {} };
        this.events = {};
    }
    set innerHTML(value) { this.html = value; this.children = []; }
    get innerHTML() { return this.html || ""; }
    appendChild(child) { this.children.push(child); }
    setAttribute(name, value) { this[name] = value; }
    querySelectorAll() { return this.children; }
    addEventListener(event, handler) { this.events[event] = handler; }
}

async function load(search) {
    const nodes = new Map();
    const element = (id) => {
        if (!nodes.has(id)) nodes.set(id, new Element());
        return nodes.get(id);
    };
    const context = vm.createContext({
        URLSearchParams, location: { search },
        document: { querySelector: () => null, getElementById: element, createElement: () => new Element() },
        fetch: async () => ({ ok: true, json: async () => [
            { id: "kit-a", title: "A Kit", cardLabel: "LICENCE KIT", area: "Skill Kits", href: "/kit-a", status: "active", yearLevel: "Junior DTECH" },
            { id: "activity-a", title: "An Activity", cardLabel: "PRACTICAL SKILL", area: "Skill Kits", href: "/activity-a", status: "active", yearLevel: "All Years" },
            { id: "kit-b", title: "B Kit", cardLabel: "LICENCE KIT", area: "Application Kits", href: "/kit-b", status: "active", yearLevel: "All Years" },
            { id: "kit-c", title: "C Kit", cardLabel: "LICENCE KIT", area: "Application Kits", href: "/kit-c", status: "active", yearLevel: "Year 9 DTECH" }
        ] }), console
    });
    vm.runInContext(fs.readFileSync(path.join(root, "practical-skills", "app.js"), "utf8"), context);
    await new Promise((resolve) => setImmediate(resolve));
    return { element };
}

test("Licence Library menu starts with only Licence Kits and All remains selectable", async () => {
    const navigation = fs.readFileSync(path.join(root, "script.js"), "utf8");
    const link = navigation.match(/href="([^"]+)">Licence Library<\/a>/)?.[1];
    assert.ok(link);
    const url = new URL(link, "https://hub.example");
    assert.equal(url.searchParams.get("category"), "Licence Kit");
    const { element } = await load(url.search);
    assert.equal(element("practical-skills-results-meta").textContent, "3 items shown");
    assert.equal(element("practical-skills-grid").children.length, 3);
    const pills = element("practical-skills-category-pills").children;
    assert.match(pills.find((pill) => pill.textContent === "Licence Kit").className, /active/);
    pills.find((pill) => pill.textContent === "All").events.click();
    assert.equal(element("practical-skills-results-meta").textContent, "4 items shown");
    assert.equal(element("practical-skills-grid").children.length, 4);
});

test("Direct Licence Library visits also default to Licence Kits", async () => {
    const { element } = await load("");
    assert.equal(element("practical-skills-results-meta").textContent, "3 items shown");
    const active = element("practical-skills-category-pills").children.find((pill) => /active/.test(pill.className));
    assert.equal(active.textContent, "Licence Kit");
});

test("Year Level always offers Junior, Middle and Senior DTECH bands", async () => {
    const { element } = await load("");
    const years = element("practical-skills-year-pills").children;
    assert.deepEqual(years.map((pill) => pill.textContent).slice(0, 5), ["All", "All Years", "Junior DTECH", "Middle DTECH", "Senior DTECH"]);
    years.find((pill) => pill.textContent === "Middle DTECH").events.click();
    assert.equal(element("practical-skills-results-meta").textContent, "2 items shown");
    years.find((pill) => pill.textContent === "Junior DTECH").events.click();
    assert.equal(element("practical-skills-results-meta").textContent, "2 items shown");
    years.find((pill) => pill.textContent === "Senior DTECH").events.click();
    assert.equal(element("practical-skills-results-meta").textContent, "1 item shown");
});
