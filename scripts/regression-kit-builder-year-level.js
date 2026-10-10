"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "practical-skills", "admin-kits.html"), "utf8");
const source = fs.readFileSync(path.join(__dirname, "..", "practical-skills", "admin-kits.js"), "utf8");
assert.match(html, /#kit-add-worksheet\s*\{[^}]*background:\s*#173858;[^}]*color:\s*#ffffff;/s, "Add Worksheet button has high-contrast colors");
assert.match(html, /#kit-add-worksheet:focus-visible\s*\{/);
assert.match(html, /<textarea id="kit-instructions" rows="3" placeholder=/);
assert.doesNotMatch(html.match(/<textarea id="kit-instructions"[^>]*>/)?.[0] || "", /maxlength=/, "Kit instructions are not truncated by a character limit");
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

console.log("Kit Builder Year Level dropdown regression checks passed.");
