"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname, "..", "practical-skills");
const source = fs.readFileSync(path.join(root, "kit-worksheet.js"), "utf8");

async function fixture(search, allowed = true) {
    const nodes = new Map();
    const node = (id) => {
        if (!nodes.has(id)) nodes.set(id, {
            hidden: true, innerHTML: "", textContent: "", disabled: false,
            classList: { toggle() {}, remove() {} }, setAttribute() {}, removeAttribute() {},
            after() {}, addEventListener() { throw new Error("Preview must not wire progress actions"); }
        });
        return nodes.get(id);
    };
    const calls = [], renders = [];
    const auth = JSON.stringify({ expiresAt: Date.now() + 60000, profile: { email: "teacher@school.nz" } });
    const context = vm.createContext({
        URLSearchParams, localStorage: { getItem: () => auth }, sessionStorage: { getItem: () => null },
        document: { getElementById: node },
        window: {
            location: { search }, addEventListener() {},
            KitWorksheetRender: {
                renderKitOverview(_host, _content, options) { renders.push(options); },
                renderWorksheet(_host, _content, options) { renders.push(options); },
                visibleLoginSites: () => []
            },
            ActivityBlocks: { specialised: () => false }
        },
        fetch: async (url, options) => {
            calls.push({ url, options });
            if (!url.includes("/kit-content/")) throw new Error(`Unexpected preview request: ${url}`);
            return { ok: allowed, json: async () => allowed ? {
                content: { worksheets: [{ activity: "Test" }], activities: [{ questions: [] }] }
            } : { error: "Teacher access required" } };
        }
    });
    vm.runInContext(source, context);
    await new Promise((resolve) => setImmediate(resolve));
    return { calls, renders, node };
}

test("teacher preview loads only authenticated content, hides progress and keeps overview/activity navigation in preview", async () => {
    for (const activity of ["", "&activity=0"]) {
        const f = await fixture(`?kit=kit-minecraft&preview=1${activity}`);
        assert.equal(f.calls.length, 1);
        assert.equal(f.calls[0].url, "/api/practical-skills/kit-content/kit-minecraft?preview=1");
        assert.equal(f.calls[0].options.headers["x-user-email"], "teacher@school.nz");
        assert.equal(f.renders.length, 1);
        assert.equal(f.renders[0].readOnly, true);
        assert.equal(f.node("worksheet-preview-banner").hidden, false);
        assert.equal(f.node("worksheet-complete-bar").hidden, true);
        assert.equal(f.node("worksheet-activity-complete-bar").hidden, true);
        assert.equal(f.node("worksheet-certificate").hidden, true);
        if (activity) assert.match(f.node("worksheet-back-link").href, /&preview=1$/);
        else {
            assert.equal(f.renders[0].preview, true);
            assert.equal(f.renders[0].minecraftExports, undefined, "Minecraft overview does not show the redundant evidence panel");
            assert.equal(f.renders[0].onMinecraftExportsOpen, undefined);
        }
    }
    const context = vm.createContext({ window: {} });
    vm.runInContext(fs.readFileSync(path.join(root, "kit-worksheet-render.js"), "utf8"), context);
    const host = { style: { setProperty() {} }, querySelector: () => null };
    context.window.KitWorksheetRender.renderKitOverview(host, { worksheets: [{ activity: "Test" }] }, { kitId: "kit-test", preview: true });
    assert.match(host.innerHTML, /activity=0&amp;preview=1/);
});

test("denied preview renders no content and explicitly displays the access error", async () => {
    const f = await fixture("?kit=kit-minecraft&preview=1", false);
    assert.equal(f.renders.length, 0);
    assert.equal(f.node("worksheet-host").innerHTML, "");
    assert.equal(f.node("worksheet-preview-banner").hidden, true);
    assert.equal(f.node("worksheet-status-message").textContent, "Teacher access required");
});
