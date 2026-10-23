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
            addEventListener(name, handler) { events[name] = handler; }
        },
        URLSearchParams,
        fetch: async (url, options = {}) => {
            requests.push({ url, options });
            if (url.startsWith("/api/auth/")) return { ok: true, json: async () => ({ can_admin: canAdmin }) };
            if (options.method === "POST") {
                if (failSave) return { ok: false, json: async () => ({ error: "Database unavailable. Retry saving." }) };
                const content = JSON.parse(options.body).content;
                return { ok: true, json: async () => ({ kitId: "kit-files", content }) };
            }
            return { ok: true, json: async () => ({ kits: [{ id: "kit-files", title: "Files & Folders" }] }) };
        }
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "practical-skills", "admin-kits.js"), "utf8"), context);
    return {
        get, requests,
        signIn() { session = JSON.stringify({ expiresAt: Date.now() + 60000, profile: { email: "teacher@school.nz" } }); events["hub-auth-state-changed"](); },
        signOut() { session = null; events["hub-auth-state-changed"](); },
        denyAdmin() { canAdmin = false; },
        failSave() { failSave = true; }
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
