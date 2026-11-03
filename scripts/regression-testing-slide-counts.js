"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
const context = vm.createContext({});
function load(start, end) {
    const from = source.indexOf(start);
    const to = source.indexOf(end, from);
    assert.ok(from >= 0 && to > from);
    vm.runInContext(source.slice(from, to), context);
}
load("function extractGoogleSlidesTableCellText(", "\nfunction extractGoogleSlidesConventionAreas(");
load("function extractGoogleSlidesTestingFunctionLists(", "\nfunction extractGoogleSlidesTestingFunctionListsFromPdfText(");
load("const TEMPLATE_ID_FROM_TITLE_PATTERNS =", "\n// POST /api/activities/:id/sync-drive-templates");
const text = (content) => ({ textElements: [{ textRun: { content } }] });
const slide = (heading, rows = []) => ({ pageElements: [
    { shape: { text: text(heading) } },
    { table: { tableRows: rows.map((row) => ({ tableCells: row.map((value) => ({ text: text(value) })) })) } }
] });
const header = ["MUST-DO", "What I will test", "Test Input", "Expected Result", "Actual Result"];
const count = (slides) => JSON.parse(JSON.stringify(context.extractGoogleSlidesTestingFunctionLists({ slides })));

test("User Testing and Functional Testing headings link to the testing section, not markup validation", () => {
    for (const heading of ["USER TESTING - Can the intended user use it effectively?", "Functional Testing", "User Testing: Client feedback"]) {
        assert.equal(context.inferTemplateCopyFromFileName(heading).templateId, "testing-functions");
        const copies = context.inferTemplateCopiesFromSlideSet({ slides: [slide(heading)] }, "/full-deck", "Full deck");
        assert.equal(copies[0].templateId, "testing-functions");
    }
    assert.equal(context.inferTemplateCopyFromFileName("Testing Functions - Markup Validation").templateId, "testing-functions-markup-validation");
    assert.equal(context.inferTemplateCopyFromFileName("User testing feedback is helpful"), null);
});

test("A full deck counts all five user-test rows without counting planning, validation or version tables", () => {
    const users = [
        "View all classes during a period", "Assign teacher aides", "Add and remove teacher aides",
        "Identify existing assignments at a glance", "Navigate independently"
    ];
    const slides = [
        slide("Project Success Criteria", [["MUST-DO", "What I will test"], ["Plan requirement", "Not test evidence"]]),
        slide("Testing Functions - Markup Validation", [["Files", "Validator test"], ["index.html", "Pass"]]),
        slide("Versions", [["File name", "Changes"], ["Draft 2", "Revised"]]),
        slide("USER TESTING - Can the intended user use it effectively?", [header,
            ...users.map((name) => [name, "Test with client", "Input", "Expected", "Pass"])]),
        slide("Relevant Implications - Usability", [["Issue", "Response"], ["Navigation", "Improved"]]),
        slide("Versions", [["Files", "Draft number", "Changes"], ["Final", "3", "Client feedback"]])
    ];
    assert.deepEqual(count(slides), { functionalTesting: [], userTesting: users });
    const copies = context.inferTemplateCopiesFromSlideSet({ slides }, "/full-deck", "Full deck");
    assert.ok(copies.some((copy) => copy.templateId === "testing-functions"));
});

test("Functional and user rows stay separate, including continuation slides and duplicate requirements", () => {
    const slides = [
        slide("FUNCTIONAL TESTING", [header, ["Save changes", "Save", "Input", "Stored", "Pass"]]),
        slide("", [header, ["Load timetable", "Load", "Input", "Table", "Pass"]]),
        slide("USER TESTING", [header, ["Navigate independently", "Navigate", "Client", "Success", "Pass"]]),
        slide("", [header, ["Navigate independently", "Retest", "Client", "Success", "Pass"]])
    ];
    assert.deepEqual(count(slides), { functionalTesting: ["Save changes", "Load timetable"], userTesting: ["Navigate independently"] });
    assert.deepEqual(count([slide("Testing Functions", [header, ["Save changes", "Save", "Input", "Stored", "Pass"]])]),
        { functionalTesting: ["Save changes"], userTesting: [] });
    assert.deepEqual(count([slide("USER TESTING", [header, ["", "", "", "", ""]])]),
        { functionalTesting: [], userTesting: [] });
    assert.deepEqual(count([slide("Testing Functions - Markup Validation", [header, ["Validation", "Markup", "", "", ""]])]),
        { functionalTesting: [], userTesting: [] });
});

test("A combined deck retains five functional requirements alongside five user tests", () => {
    const requirements = ["View all classes during a period", "Assign teacher aides to classes",
        "Add and remove teacher aides", "View existing assignments", "Navigate independently"];
    const heading = "Functional requirements (MUST-DOs) + Relevant implications \u2192 Success criteria";
    const requirementsSlide = slide(heading, [
        ["MUST-DO / Requirement", "Success criterion", "How will I know?"],
        ...requirements.map((requirement) => [requirement, "Meets the requirement", "Test website"])
    ]);
    const implicationsSlide = slide(heading, [
        ["Relevant Implications", "Success criterion", "How will I know?"],
        ["Usability", "Easy to use", "Feedback meeting"]
    ]);
    const userSlide = slide("USER TESTING - Can the intended user use it effectively?", [
        header, ...requirements.map((requirement) => [requirement, "Check with client", "Input", "Expected", "Pass"])
    ]);
    const expected = { functionalTesting: requirements, userTesting: requirements };
    assert.deepEqual(count([requirementsSlide, implicationsSlide, userSlide]), expected);
    assert.deepEqual(count([userSlide, requirementsSlide, implicationsSlide]), expected,
        "A requirements table after user testing still belongs to Functional");
    assert.deepEqual(count([requirementsSlide, requirementsSlide, userSlide]), expected,
        "Repeated requirements are not double counted");
    assert.deepEqual(count([implicationsSlide]), { functionalTesting: [], userTesting: [] });
    assert.deepEqual(count([slide("Project Success Criteria", requirementsSlide.pageElements[1].table.tableRows
        .map((row) => row.tableCells.map((cell) => cell.text.textElements[0].textRun.content)))]),
    { functionalTesting: [], userTesting: [] }, "Unrelated planning headings are not treated as functional requirements");
});
