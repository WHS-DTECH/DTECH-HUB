"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { allActivitiesComplete, buildKitCertificate, visibleActivityIndexes } = require("../practical-skills-certificate");

const root = path.join(__dirname, "..", "practical-skills");
const adminHtml = fs.readFileSync(path.join(root, "admin-kits.html"), "utf8");
const adminSource = fs.readFileSync(path.join(root, "admin-kits.js"), "utf8");
const renderSource = fs.readFileSync(path.join(root, "kit-worksheet-render.js"), "utf8");
const worksheetSource = fs.readFileSync(path.join(root, "kit-worksheet.js"), "utf8");

assert.match(adminHtml, /\.kit-worksheet-table \.kit-remove-worksheet\s*\{[^}]*color:\s*#8f1d1d;[^}]*background:\s*#fff1f0;/s, "Remove buttons are clearly visible");
assert.match(adminHtml, /Remove hides an activity from students without deleting its details or saved progress\./, "Removal behavior is explained");
assert.match(adminHtml, /id="kit-hidden-worksheets-list"/, "Removed worksheets can be restored");
assert.match(adminSource, /if \(worksheet\.hidden\) return;/, "Hidden worksheets are omitted from the builder's active list");
assert.match(adminSource, /worksheet\.hidden = true;/, "Removing a worksheet preserves it as hidden");
assert.match(adminSource, /delete worksheet\.hidden;/, "Restore makes a worksheet visible again");
assert.match(adminSource, /state\.content\.worksheets\.map\(\(worksheet\) => \(\{ \.\.\.worksheet \}\)\)/, "Form edits retain worksheet indexes and hidden entries");
assert.doesNotMatch(adminSource, /state\.content\.activities\.splice/, "Removing a worksheet does not shift activity details");

const overviewStart = renderSource.indexOf("    function renderKitOverview(host, content, options = {}) {");
const overviewEnd = renderSource.indexOf("\n    window.KitWorksheetRender =", overviewStart);
assert.ok(overviewStart >= 0 && overviewEnd > overviewStart, "Kit overview renderer exists");
const renderContext = vm.createContext({
    escapeHtml: (value) => String(value || ""),
    renderInstructions: (value) => `<p>${value}</p>`,
    encodeURIComponent
});
vm.runInContext(renderSource.slice(overviewStart, overviewEnd), renderContext);
const host = { style: { setProperty() {} }, innerHTML: "" };
renderContext.renderKitOverview(host, {
    bannerTitle: "Test Kit",
    worksheets: [
        { activity: "Visible One" },
        { activity: "Removed Activity", hidden: true },
        { activity: "Visible Two" }
    ],
    activities: [{}, {}, {}]
}, { kitId: "test-kit", completedActivities: {} });
assert.match(host.innerHTML, /0 \/ 2 activities completed/, "Student progress totals exclude hidden activities");
assert.match(host.innerHTML, /Visible One/);
assert.match(host.innerHTML, /Visible Two/);
assert.doesNotMatch(host.innerHTML, /Removed Activity/);
assert.match(host.innerHTML, /activity=2/, "Visible activities keep their original saved-progress indexes");
assert.doesNotMatch(host.innerHTML, /data-minecraft-exports/, "Other kits do not show the Minecraft Exports box");

// Minecraft Exports folder box: rendered before the activity list, opens the folder in a reserved tab.
const exportsContent = { bannerTitle: "Minecraft Builder Kit", instructions: "Welcome", worksheets: [{ activity: "My First Build" }], activities: [{}] };
renderContext.renderKitOverview(host, exportsContent, { kitId: "kit-minecraft", completedActivities: {}, minecraftExports: true, readOnly: true });
assert.match(host.innerHTML, /Create &amp; Open My Minecraft Exports Folder<\/button>/);
assert.match(host.innerHTML, /data-minecraft-exports-open disabled/, "Signed-out students cannot use the folder button");
assert.ok(host.innerHTML.indexOf("worksheet-instructions") < host.innerHTML.indexOf("data-minecraft-exports")
    && host.innerHTML.indexOf("data-minecraft-exports") < host.innerHTML.indexOf("worksheet-activities"), "Box sits under the introduction and above the activities");
(async () => {
    const listeners = {};
    const button = { disabled: false, addEventListener: (type, handler) => { listeners[type] = handler; } };
    const status = { textContent: "", classList: { toggle() {} } };
    const section = { querySelector: (selector) => selector === "[data-minecraft-exports-open]" ? button : status };
    const tab = { closed: false, opener: {}, location: { replace(url) { tab.url = url; } }, close() { tab.closed = true; } };
    renderContext.window = { open: () => tab };
    const liveHost = { style: { setProperty() {} }, innerHTML: "", querySelector: () => section };
    renderContext.renderKitOverview(liveHost, exportsContent, {
        kitId: "kit-minecraft", minecraftExports: true,
        onMinecraftExportsOpen: async () => ({ folderUrl: "https://drive.google.com/drive/folders/abc", path: ["WHS-DTECH", "JuniorDTECH", "KITS", "Minecraft Exports"] })
    });
    await listeners.click();
    assert.equal(tab.url, "https://drive.google.com/drive/folders/abc", "Folder opens in the new tab");
    assert.equal(tab.opener, null);
    assert.match(status.textContent, /WHS-DTECH \u2192 JuniorDTECH \u2192 KITS \u2192 Minecraft Exports/);
    assert.equal(button.disabled, false);

    const failTab = { closed: false, location: { replace() {} }, close() { failTab.closed = true; } };
    renderContext.window = { open: () => failTab };
    renderContext.renderKitOverview(liveHost, exportsContent, {
        kitId: "kit-minecraft", minecraftExports: true,
        onMinecraftExportsOpen: async () => { throw new Error("Google Drive permission was not granted."); }
    });
    await listeners.click();
    assert.equal(failTab.closed, true, "Blank tab is closed when the folder cannot be opened");
    assert.match(status.textContent, /permission was not granted/);

    const serverSource = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
    const routeStart = serverSource.indexOf('app.post("/api/practical-skills/minecraft-exports-folder"');
    const route = serverSource.slice(routeStart, serverSource.indexOf("\n});", routeStart));
    assert.ok(routeStart > 0, "Minecraft Exports folder route exists");
    assert.match(route, /verifyDriveTokenForStudent\(driveAccessToken, email\)/, "Drive token must belong to the signed-in student");
    assert.match(route, /ensureStudentCourseFolders\(email, programmeFolder, driveAccessToken\)/);
    assert.match(route, /driveEnsureFolder\(kits\.id, MINECRAFT_EXPORTS_FOLDER_NAME/);
    assert.doesNotMatch(route, /method: "(DELETE|PATCH|PUT)"|trashed: true/, "Folder setup never deletes or edits Drive files");
    assert.match(worksheetSource, /minecraftExports: state\.kitId === "kit-minecraft"/, "Only the Minecraft kit shows the box");
    console.log("Minecraft Exports folder regressions passed.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
const kitContent = {
    bannerTitle: "Test Kit",
    worksheets: [
        { activity: "Visible One" },
        { activity: "Removed Activity", hidden: true },
        { activity: "Visible Two" }
    ]
};
const progress = { completed: true, completed_at: "2026-01-01T00:00:00.000Z", completed_activities: { 0: "done", 2: "done" } };
assert.deepEqual(visibleActivityIndexes(kitContent), ["0", "2"], "Hidden activities are excluded from completion requirements");
assert.equal(allActivitiesComplete(kitContent, progress), true, "Five visible activities can complete without removed activities");
assert.equal(buildKitCertificate(kitContent, progress, "Student").activityCount, 2, "Certificates count only visible activities");

const activityIndexStart = worksheetSource.indexOf("    function getActivityIndexFromUrl() {");
const activityIndexEnd = worksheetSource.indexOf("\n    function getStoredAuthRaw()", activityIndexStart);
assert.ok(activityIndexStart >= 0 && activityIndexEnd > activityIndexStart, "Activity URL resolver exists");
const locationContext = vm.createContext({
    state: { content: { worksheets: [{ activity: "Visible" }, { activity: "Removed", hidden: true }] } },
    window: { location: { search: "?activity=1" } },
    URLSearchParams
});
vm.runInContext(worksheetSource.slice(activityIndexStart, activityIndexEnd), locationContext);
assert.equal(locationContext.getActivityIndexFromUrl(), null, "A direct link to a removed worksheet does not open it");

console.log("Kit worksheet hide, restore, and progress-preservation regressions passed.");
