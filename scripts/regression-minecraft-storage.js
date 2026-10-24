"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "..", "practical-skills", "kit-worksheet-render.js"), "utf8");
function fixture() {
    const context = vm.createContext({ window: {} });
    vm.runInContext(source, context);
    const host = { style: { setProperty() {} }, innerHTML: "", querySelector() { return null; } };
    return { renderer: context.window.KitWorksheetRender, host };
}
test("Minecraft distinguishes synced Videos working storage from evidence copies and preserves the folder action", () => {
    const { renderer, host } = fixture();
    renderer.renderKitOverview(host, {
        bannerTitle: "Minecraft", instructions: "Windows setup\n1. Search for Google Drive.\n2. Add Videos.",
        worksheets: [{ activity: "My First Build" }], activities: []
    }, { minecraftExports: true, readOnly: true });
    assert.match(host.innerHTML, /Keep a copy of your Minecraft evidence/);
    assert.match(host.innerHTML, /Start with <strong>Google Drive Setup/);
    assert.match(host.innerHTML, /separate <strong>Minecraft Exports/);
    assert.doesNotMatch(host.innerHTML, /Unity|<ol>\s*<li>/);
    assert.match(host.innerHTML, /data-minecraft-exports-open disabled/);
    assert.doesNotMatch(host.innerHTML, /Downloads<\/strong> folder/);
    assert.match(host.innerHTML, /My First Build/);
});
test("start-here activity appears first without changing existing activity indexes", () => {
    const { renderer, host } = fixture();
    renderer.renderKitOverview(host, {
        worksheets: [{ activity: "Original build" }, { activity: "Google Drive Setup", startHere: true }]
    }, { kitId: "kit-minecraft", preview: true });
    assert.ok(host.innerHTML.indexOf("Google Drive Setup") < host.innerHTML.indexOf("Original build"));
    assert.match(host.innerHTML, /activity=1&amp;preview=1/);
    assert.match(host.innerHTML, /activity=0&amp;preview=1/);
});
test("other kits do not receive Minecraft or Windows Desktop instructions", () => {
    const { renderer, host } = fixture();
    renderer.renderKitOverview(host, { bannerTitle: "Other", worksheets: [] }, {});
    assert.doesNotMatch(host.innerHTML, /Minecraft Exports|Videos|Unity/);
});
