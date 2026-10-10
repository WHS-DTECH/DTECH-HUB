"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "practical-skills", "admin-kits.html"), "utf8");
const source = fs.readFileSync(path.join(__dirname, "..", "practical-skills", "admin-kits.js"), "utf8");
assert.match(source, /Kit content saved and its Licence Library card updated\./, "Kit Builder confirms the library card was synced");
const activityHtml = fs.readFileSync(path.join(__dirname, "..", "practical-skills", "admin-kit-activity.html"), "utf8");
const renderSource = fs.readFileSync(path.join(__dirname, "..", "practical-skills", "kit-worksheet-render.js"), "utf8");
assert.match(html, /#kit-add-worksheet\s*\{[^}]*background:\s*#173858;[^}]*color:\s*#ffffff;/s, "Add Worksheet button has high-contrast colors");
assert.match(html, /#kit-add-worksheet:focus-visible\s*\{/);
assert.match(html, /<h2>Kit Worksheets<\/h2>\s*<p class="kit-worksheet-suggestion"><strong>Teacher suggestion:<\/strong> Use the first activities as foundational skills, the middle activities as applied skills, and the final activities as integrated challenges\.<\/p>/, "Teacher suggestion supports kits of different lengths");
assert.match(html, /<textarea id="kit-instructions" rows="3" placeholder=/);
assert.match(html, /<label for="kit-name">Kit Name<\/label>[\s\S]*?<small>This name appears on the kit page and in the Kit dropdown\.<\/small>/);
assert.doesNotMatch(html, /id="kit-banner-title"/, "Kit Name replaces the separate Banner Title field");
assert.doesNotMatch(html, /maxlength=/i, "Kit Builder fields have no browser character limits");
assert.doesNotMatch(activityHtml, /maxlength=/i, "Worksheet topic/detail fields have no browser character limits");
assert.doesNotMatch(source, /maxlength=/i, "Dynamically rendered worksheet fields have no browser character limits");
assert.match(html, /<th scope="col">What it establishes<\/th>\s*<th scope="col">Interactive element<\/th>/, "Interactive element column follows What it establishes");
assert.match(source, /class="kit-worksheet-interactive-element"/, "Kit Builder renders the interactive element field");
assert.match(source, /interactiveElement:\s*row\.querySelector\("\.kit-worksheet-interactive-element"\)\?\.value\s*\|\|\s*""/, "Interactive element is included when saving worksheets");
assert.match(source, /row\.querySelector\("\.kit-worksheet-interactive-element"\)\.value = worksheet\.interactiveElement \|\| ""/, "Saved interactive element is restored when loading worksheets");
assert.doesNotMatch(renderSource, /worksheet\.interactiveElement|Interactive element:/, "Student activity list does not show teacher-only interactive element notes");
const overviewStart = renderSource.indexOf("    function renderKitOverview(host, content, options = {}) {");
const overviewEnd = renderSource.indexOf("\n    window.KitWorksheetRender =", overviewStart);
assert.ok(overviewStart >= 0 && overviewEnd > overviewStart, "Kit overview renderer is available");
const overviewContext = vm.createContext({
    escapeHtml: (value) => String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
    encodeURIComponent
});
vm.runInContext(renderSource.slice(overviewStart, overviewEnd), overviewContext);
const overviewHost = { style: { setProperty() {} }, innerHTML: "" };
overviewContext.renderKitOverview(overviewHost, {
    bannerTitle: "Test Kit",
    worksheets: [{ activity: "Test activity", interactiveElement: "<drag-and-drop>" }]
}, { kitId: "test-kit" });
assert.doesNotMatch(overviewHost.innerHTML, /Interactive element:|drag-and-drop/, "Student overview omits teacher-only interactive element notes");
const start = source.indexOf("    function setYearLevelSelection(value) {");
const end = source.indexOf("\n    function queuePreviewUpdate()", start);
assert.ok(start >= 0 && end > start, "Year Level selection helper is present");
const yearLevels = { options: [], value: "", appendChild(option) { this.options.push(option); } };
const context = vm.createContext({
    yearLevelInput: yearLevels,
    document: { createElement: () => ({ value: "", textContent: "" }) }
});
vm.runInContext(source.slice(start, end), context);
const supported = ["All Years", "Junior DTECH", "Year 7 DTECH", "Year 8 DTECH", "Middle DTECH", "Year 9 DTECH", "Year 10 DTECH", "Senior DTECH", "Year 11 DTECH", "Year 12 DTECH", "Year 13 DTECH", "Staff"];
yearLevels.options = supported.map((value) => ({ value }));

for (const value of supported) {
    assert.ok(html.includes(`<option value="${value}">${value}</option>`), `Dropdown includes ${value}`);
}
assert.match(html, /<select id="kit-year-level">/);
assert.doesNotMatch(html, /<input id="kit-year-level"/);
assert.equal(yearLevels.options[0].value, "All Years", "All Years is the default option");

context.setYearLevelSelection("");
assert.equal(yearLevels.value, "All Years", "Blank/new kits default to All Years");
context.setYearLevelSelection("Year 8 DTECH");
assert.equal(yearLevels.value, "Year 8 DTECH", "Existing supported value is restored");
context.setYearLevelSelection("Legacy group");
assert.equal(yearLevels.value, "Legacy group", "Unlisted existing values are preserved");
assert.equal(yearLevels.options.at(-1).textContent, "Current value: Legacy group");

const titleStart = source.indexOf("    function updateKitOptionTitle(kitId, title) {");
const titleEnd = source.indexOf("\n    function setYearLevelSelection(value)", titleStart);
assert.ok(titleStart >= 0 && titleEnd > titleStart, "Dropdown title updater is present");
const kitSelect = { options: [{ value: "kit-login", textContent: "Login" }, { value: "kit-google-search", textContent: "Google Search" }] };
const titleContext = vm.createContext({ kitSelect, KIT_CATALOG: [{ id: "kit-login", title: "Login" }, { id: "kit-google-search", title: "Google Search" }] });
vm.runInContext(source.slice(titleStart, titleEnd), titleContext);
titleContext.updateKitOptionTitle("kit-google-search", "Search Kit");
assert.equal(kitSelect.options[1].textContent, "Search Kit", "Saved kit name updates its dropdown label");
titleContext.updateKitOptionTitle("kit-google-search", "");
assert.equal(kitSelect.options[1].textContent, "Google Search", "Blank kit name restores the catalog fallback");
assert.match(source, /bannerTitle:\s*nameInput\.value/, "The single Kit Name is also saved as the banner title");

const colourRow = html.match(/<div class="kit-builder-color-row">([\s\S]*?)<div class="kit-builder-field">\s*<label for="kit-instructions">/);
assert.ok(colourRow, "Colour row is present");
assert.match(colourRow[1], /<label for="kit-skill-area">Skill Area<\/label>\s*<select id="kit-skill-area">\s*<option value="Skill Kits">Skill Kits<\/option>\s*<option value="Application Kits">Application Kits<\/option>\s*<\/select>[\s\S]*kit-theme-color[\s\S]*kit-accent-color/, "Skill Area dropdown sits left of the colours");
assert.doesNotMatch(html, /<input id="kit-skill-area"/, "Skill Area is no longer free text");
const schemeStart = source.indexOf("    const KIT_COLOUR_SCHEMES = {");
const schemeEnd = source.indexOf("\n    const state = {", schemeStart);
assert.ok(schemeStart >= 0 && schemeEnd > schemeStart, "Colour scheme presets are present");
const schemeContext = vm.createContext({});
vm.runInContext(source.slice(schemeStart, schemeEnd).replace("const KIT_COLOUR_SCHEMES", "var KIT_COLOUR_SCHEMES"), schemeContext);
assert.deepEqual({ ...schemeContext.KIT_COLOUR_SCHEMES["Skill Kits"] }, { color: "#2f8f61", accent: "#ffd166" });
assert.deepEqual({ ...schemeContext.KIT_COLOUR_SCHEMES["Application Kits"] }, { color: "#2b87b6", accent: "#66fff5" });
assert.equal(schemeContext.normaliseSkillArea("Application: Minecraft"), "Application Kits");
assert.equal(schemeContext.normaliseSkillArea("Application Kits"), "Application Kits");
assert.equal(schemeContext.normaliseSkillArea("Search Skills"), "Skill Kits");
assert.equal(schemeContext.normaliseSkillArea(""), "Skill Kits");
assert.match(source, /skillAreaInput\.addEventListener\("change", \(\) => \{\s*const scheme = KIT_COLOUR_SCHEMES\[skillAreaInput\.value\];[\s\S]*?themeColorInput\.value = scheme\.color;\s*accentColorInput\.value = scheme\.accent;/, "Changing Skill Area applies its colour scheme");

console.log("Kit Builder Skill Area colour scheme regression checks passed.");

console.log("Kit Builder Year Level dropdown regression checks passed.");
