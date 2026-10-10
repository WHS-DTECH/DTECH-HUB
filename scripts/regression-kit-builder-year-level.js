"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "practical-skills", "admin-kits.html"), "utf8");
const source = fs.readFileSync(path.join(__dirname, "..", "practical-skills", "admin-kits.js"), "utf8");
const activityHtml = fs.readFileSync(path.join(__dirname, "..", "practical-skills", "admin-kit-activity.html"), "utf8");
assert.match(html, /#kit-add-worksheet\s*\{[^}]*background:\s*#173858;[^}]*color:\s*#ffffff;/s, "Add Worksheet button has high-contrast colors");
assert.match(html, /#kit-add-worksheet:focus-visible\s*\{/);
assert.match(html, /<h2>Kit Worksheets<\/h2>\s*<p class="kit-worksheet-suggestion"><strong>Teacher suggestion:<\/strong> Activities 1–3 as foundational skills, Activities 4–8 as applied skills, and Activities 9–10 as integrated challenges\.<\/p>/, "Teacher suggestion appears directly under Kit Worksheets");
assert.match(html, /<textarea id="kit-instructions" rows="3" placeholder=/);
assert.match(html, /<label for="kit-name">Kit Name<\/label>[\s\S]*?<small>This name appears on the kit page and in the Kit dropdown\.<\/small>/);
assert.doesNotMatch(html, /id="kit-banner-title"/, "Kit Name replaces the separate Banner Title field");
assert.doesNotMatch(html, /maxlength=/i, "Kit Builder fields have no browser character limits");
assert.doesNotMatch(activityHtml, /maxlength=/i, "Worksheet topic/detail fields have no browser character limits");
assert.doesNotMatch(source, /maxlength=/i, "Dynamically rendered worksheet fields have no browser character limits");
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

console.log("Kit Builder Year Level dropdown regression checks passed.");
