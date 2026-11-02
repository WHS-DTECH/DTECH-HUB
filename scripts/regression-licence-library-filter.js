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
            { id: "kit-a", title: "A Kit", cardLabel: "LICENCE KIT", area: "Skill Kits", href: "/kit-a", status: "active" },
            { id: "activity-a", title: "An Activity", cardLabel: "PRACTICAL SKILL", area: "Skill Kits", href: "/activity-a", status: "active" },
            { id: "kit-b", title: "B Kit", cardLabel: "LICENCE KIT", area: "Application Kits", href: "/kit-b", status: "active" }
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
    assert.equal(element("practical-skills-results-meta").textContent, "2 items shown");
    assert.equal(element("practical-skills-grid").children.length, 2);
    const pills = element("practical-skills-category-pills").children;
    assert.match(pills.find((pill) => pill.textContent === "Licence Kit").className, /active/);
    pills.find((pill) => pill.textContent === "All").events.click();
    assert.equal(element("practical-skills-results-meta").textContent, "3 items shown");
    assert.equal(element("practical-skills-grid").children.length, 3);
});

test("Direct library visits without a category retain the existing All view", async () => {
    const { element } = await load("");
    assert.equal(element("practical-skills-results-meta").textContent, "3 items shown");
});
