"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
const fn = source.match(/function updateSidebarExternalExamForm\(panel\) \{[\s\S]*?\n\}/)?.[0];

function render(dataset) {
    const link = { hidden: true, href: "" };
    const reminders = [];
    const context = vm.createContext({
        SENIOR_EXTERNAL_EXAM_FORM_URL: "https://forms.example/exam",
        hubAuthState: { profile: { email: "student@example.com" } },
        normalizeEmail: (value) => String(value || "").toLowerCase(),
        showExternalExamIntentionReminder: (email) => reminders.push(email)
    });
    vm.runInContext(`${fn}; this.update = updateSidebarExternalExamForm;`, context);
    context.update({ dataset: { externalExamAllocation: "true", ...dataset }, querySelector: () => link });
    return { link, reminders };
}

test("Only SeniorDTECH students see the external exam form and reminder", () => {
    assert.ok(fn);
    for (const course of ["JuniorDTECH", "MiddleDTECH"]) {
        const { link, reminders } = render({ course, allocationCourse: "SeniorDTECH" });
        assert.equal(link.hidden, true, course);
        assert.equal(reminders.length, 0, course);
    }
    const senior = render({ course: "SeniorDTECH" });
    assert.equal(senior.link.hidden, false);
    assert.equal(senior.reminders.length, 1);
    assert.equal(render({ course: "SeniorDTECH", externalExamIntention: "no" }).link.hidden, true);
    assert.equal(render({ course: "", courseStatus: "pending", allocationCourse: "SeniorDTECH" }).link.hidden, true);
});
