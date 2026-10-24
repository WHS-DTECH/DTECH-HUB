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
    assert.match(host.innerHTML, /Videos<\/strong> folder is your Windows working location for Minecraft and Unity/);
    assert.match(host.innerHTML, /Videos \u2192 Minecraft/);
    assert.match(host.innerHTML, /automatic world save is not the same as exporting/);
    assert.match(host.innerHTML, /Keep the originals in Videos/);
    assert.match(host.innerHTML, /finished syncing with no errors before you sign out of Windows/);
    assert.match(host.innerHTML, /does not check your work or complete an activity/);
    assert.match(host.innerHTML, /data-minecraft-exports-open disabled/);
    assert.doesNotMatch(host.innerHTML, /Downloads<\/strong> folder/);
    assert.match(host.innerHTML, /My First Build/);
});
test("other kits do not receive Minecraft or Windows Desktop instructions", () => {
    const { renderer, host } = fixture();
    renderer.renderKitOverview(host, { bannerTitle: "Other", worksheets: [] }, {});
    assert.doesNotMatch(host.innerHTML, /Minecraft Exports|Videos|Unity/);
});
