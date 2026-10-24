"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

function editor() {
    const nodes = new Map();
    const events = {};
    const requests = [];
    let session = null;
    let canAdmin = true;
    let failSave = false;
    let confirmDelete = false;
    let deleted = false;
    let catalogFailure = false;
    let catalogMalformed = false;
    function element() {
        const children = [];
        const fields = new Map();
        return {
            value: "", textContent: "", hidden: false, disabled: false, dataset: {}, handlers: {}, children,
            classList: { toggle() {} }, focus() {},
            set innerHTML(value) { this.html = value; children.length = 0; fields.clear(); },
            get innerHTML() { return this.html || ""; },
            get options() { return children; },
            appendChild(child) { children.push(child); },
            append(...items) { children.push(...items); },
            replaceChildren(...items) { children.splice(0, children.length, ...items); },
            setAttribute(name, value) { this[name] = value; },
            addEventListener(name, handler) { this.handlers[name] = handler; },
            querySelectorAll() { return children; },
            querySelector(selector) {
                if (!fields.has(selector)) fields.set(selector, element());
                return fields.get(selector);
            }
        };
    }
    const get = (selector) => {
        if (!nodes.has(selector)) nodes.set(selector, element());
        return nodes.get(selector);
    };
    const context = vm.createContext({
        document: { querySelector: get, createElement: element },
        localStorage: { getItem: () => session }, sessionStorage: { getItem: () => null },
        window: {
            location: { search: "" }, clearTimeout() {}, setTimeout() { return 1; },
            confirm() { return confirmDelete; },
            addEventListener(name, handler) { events[name] = handler; }
        },
        URLSearchParams,
        fetch: async (url, options = {}) => {
            requests.push({ url, options });
            if (url.startsWith("/api/auth/")) return { ok: true, json: async () => ({ can_admin: canAdmin }) };
            if (options.method === "DELETE") {
                deleted = true;
                return { ok: true, json: async () => ({ message: "Kit removed. Student progress retained." }) };
            }
            if (options.method === "POST") {
                if (failSave) return { ok: false, json: async () => ({ error: "Database unavailable. Retry saving." }) };
                const content = JSON.parse(options.body).content;
                return { ok: true, json: async () => ({ kitId: "kit-files", content }) };
            }
            if (catalogFailure) return { ok: false, json: async () => ({ error: "Catalog temporarily unavailable." }) };
            if (catalogMalformed) return { ok: true, json: async () => ({}) };
            return { ok: true, json: async () => ({ kits: deleted ? [] : [{ id: "kit-files", title: "Files & Folders", custom: true }] }) };
        }
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "practical-skills", "admin-kits.js"), "utf8"), context);
    return {
        get, requests,
        signIn() { session = JSON.stringify({ expiresAt: Date.now() + 60000, profile: { email: "teacher@school.nz" } }); events["hub-auth-state-changed"](); },
        signOut() { session = null; events["hub-auth-state-changed"](); },
        denyAdmin() { canAdmin = false; },
        failSave() { failSave = true; },
        confirmDeletion() { confirmDelete = true; },
        failCatalog() { catalogFailure = true; },
        malformedCatalog() { catalogMalformed = true; },
        restoreCatalog() { catalogFailure = false; catalogMalformed = false; },
        refreshCatalog() { const button = get("#kit-refresh-list"); return button.handlers.click({ currentTarget: button }); }
    };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("buttons work after delayed sign-in without clearing draft fields or duplicating handlers", async () => {
    const ui = editor();
    await settle();
    assert.match(ui.get("#kit-builder-status").textContent, /Sign in/);
    ui.get("#kit-name").value = "Files & Folders";
    ui.get("#kit-instructions").value = "Organise your files.";
    ui.get("#kit-add-worksheet").handlers.click();
    assert.equal(ui.get("#kit-worksheet-list").children.length, 1);
    await ui.get("#kit-save-content").handlers.click();
    await settle();
    assert.equal(ui.requests.some(({ options }) => options.method === "POST"), false);
    ui.signIn();
    await settle();
    assert.equal(ui.get("#kit-name").value, "Files & Folders");
    assert.equal(ui.get("#kit-instructions").value, "Organise your files.");
    const row = ui.get("#kit-worksheet-list").children[0];
    row.querySelector(".kit-worksheet-activity").value = "Create a folder";
    ui.signIn();
    await settle();
    assert.equal(ui.get("#kit-worksheet-list").children[0], row);
    ui.get("#kit-save-content").handlers.click();
    await settle();
    const writes = ui.requests.filter(({ options }) => options.method === "POST");
    assert.equal(writes.length, 1);
    const saved = JSON.parse(writes[0].options.body).content;
    assert.equal(saved.identity.name, "Files & Folders");
    assert.equal(saved.instructions, "Organise your files.");
    assert.equal(saved.worksheets[0].activity, "Create a folder");
    assert.match(ui.get("#kit-builder-status").textContent, /New kit created/);
    ui.signOut();
    await settle();
    ui.get("#kit-save-content").handlers.click();
    await settle();
    assert.equal(ui.requests.filter(({ options }) => options.method === "PUT").length, 0);
    assert.match(ui.get("#kit-builder-status").textContent, /Sign in/);
});

test("direct builder lists saved custom kits and refresh preserves an unsaved draft", async () => {
    const ui = editor();
    ui.signIn();
    await settle();
    assert.ok(ui.get("#kit-select").options.some((option) => option.value === "kit-files"));
    assert.equal(ui.requests.find((request) => request.url === "/api/admin/practical-skills/kits").options.cache, "no-store");
    ui.get("#kit-name").value = "Unsaved new kit";
    ui.get("#kit-add-worksheet").handlers.click();
    const row = ui.get("#kit-worksheet-list").children[0];
    ui.failCatalog();
    await ui.refreshCatalog();
    assert.match(ui.get("#kit-builder-status").textContent, /Could not refresh.*Catalog temporarily unavailable/);
    assert.equal(ui.get("#kit-name").value, "Unsaved new kit");
    ui.restoreCatalog();
    await ui.refreshCatalog();
    assert.equal(ui.get("#kit-name").value, "Unsaved new kit");
    assert.equal(ui.get("#kit-worksheet-list").children[0], row);
    assert.equal(ui.get("#kit-refresh-list").disabled, false);
    assert.match(ui.get("#kit-builder-status").textContent, /draft is unchanged/);
});

test("failed initial catalog loading is explicit and retries without clearing a draft", async () => {
    const ui = editor();
    ui.failCatalog();
    ui.get("#kit-name").value = "Keep my draft";
    ui.signIn();
    await settle();
    assert.match(ui.get("#kit-builder-status").textContent, /Could not load your saved kit list.*Refresh kit list/);
    assert.equal(ui.get("#kit-name").value, "Keep my draft");
    ui.restoreCatalog();
    ui.signIn();
    await settle();
    assert.ok(ui.get("#kit-select").options.some((option) => option.value === "kit-files"));
    assert.equal(ui.get("#kit-name").value, "Keep my draft");
    ui.malformedCatalog();
    await ui.refreshCatalog();
    assert.match(ui.get("#kit-builder-status").textContent, /saved kit list was not returned/);
});

test("custom kit deletion requires confirmation and leaves a blank editor after removal", async () => {
    const ui = editor();
    ui.signIn();
    await settle();
    ui.get("#kit-name").value = "Files & Folders";
    ui.get("#kit-save-content").handlers.click();
    await settle();
    assert.equal(ui.get("#kit-delete").hidden, false);
    await ui.get("#kit-delete").handlers.click();
    assert.equal(ui.requests.filter(({ options }) => options.method === "DELETE").length, 0);
    ui.confirmDeletion();
    await ui.get("#kit-delete").handlers.click();
    assert.equal(ui.requests.filter(({ options }) => options.method === "DELETE").length, 1);
    assert.equal(ui.get("#kit-delete").hidden, true);
    assert.equal(ui.get("#kit-name").value, "");
    assert.match(ui.get("#kit-save-status").textContent, /Student progress retained/);
});

test("permission and save failures are explicit and retain the draft", async () => {
    const ui = editor();
    ui.signIn();
    await settle();
    ui.get("#kit-name").value = "Files & Folders";
    ui.failSave();
    ui.get("#kit-save-content").handlers.click();
    await settle();
    assert.match(ui.get("#kit-builder-status").textContent, /Database unavailable/);
    assert.match(ui.get("#kit-save-status").textContent, /Database unavailable/);
    assert.equal(ui.get("#kit-name").value, "Files & Folders");
    assert.equal(ui.get("#kit-save-content").disabled, false);
    ui.denyAdmin();
    ui.get("#kit-save-content").handlers.click();
    await settle();
    assert.match(ui.get("#kit-builder-status").textContent, /Admin access/);
    assert.equal(ui.requests.filter(({ options }) => options.method === "POST").length, 1);
});
