"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "task-list.js"), "utf8");
const criterion = "Achieved: Using relevant conventions for the media type.";
function setup() {
    const storage = new Map();
    const context = vm.createContext({
        DIGIMED_CONVENTIONS_ACK_STORAGE_PREFIX: "web",
        DIGIMED_VIDEO_CONVENTIONS_ACK_STORAGE_PREFIX: "video",
        DIGIMED_IMAGE_CONVENTIONS_ACK_STORAGE_PREFIX: "image",
        taskListState: { selectedId: "project" },
        getTaskListEmail: () => "student@example.school.nz",
        getAllocatedDigitalMediaType: () => "video",
        getStepLevel: (text) => String(text).split(":")[0],
        stripStepLevel: (text) => String(text).replace(/^(Achieved|Merit|Excellence):\s*/, ""),
        localStorage: { getItem: (key) => storage.get(key) || null },
        buildCustomActivityLink: (...args) => args.join("|")
    });
    const start = source.indexOf("function getDigiMedConventionsAcknowledgementCount(");
    const end = source.indexOf("\nfunction getDigiMedUXPrinciplesAcknowledgementCount(", start);
    vm.runInContext(source.slice(start, end), context);
    return { context, storage };
}
function evidence(areas) {
    return { "digimed-local-state:video-conventions": areas.map((area) => ({
        text: `DIGIMED_STATE|video-conventions|${area}|true`, done: true
    })) };
}

test("Video conventions use the page's storage, not web acknowledgements", () => {
    const { context, storage } = setup();
    storage.set("web:project:student@example.school.nz", JSON.stringify({ Navigation: true, Layout: true, Typography: true }));
    assert.equal(context.getDigiMedConventionsSubtask({}, "video").count, 0);
    storage.set("video:project:student@example.school.nz", JSON.stringify({
        "Shot composition": true, Continuity: true, Audio: true, Credits: false
    }));
    const subtask = context.getDigiMedConventionsSubtask({}, "video");
    assert.equal(subtask.count, 3);
    assert.equal(subtask.total, 11);
    assert.equal(subtask.label, "Conventions (VIDEO)");
    assert.match(subtask.href, /Video Conventions/);
    assert.equal(context.isWebConventionsRequirementStep("91893", criterion), true);
    assert.equal(context.isWebConventionsRequirementStep("91903", criterion), true);
    assert.equal(context.isWebConventionsRequirementStep("91903", criterion.replace("Achieved", "Merit")), false);
    const state = { "91903": [{ text: criterion, done: false }] };
    assert.equal(context.autoTickWebConventionsRequirement(state, "project", "student@example.school.nz"), true);
    assert.equal(state["91903"][0].done, true);
});

test("Persisted video checks complete both levels across devices and clear below three", () => {
    const { context, storage } = setup();
    const saved = evidence(["Shot composition", "Continuity", "Audio"]);
    for (const standard of ["91893", "91903"]) {
        const checklist = { [standard]: [{ text: criterion, done: false }] };
        assert.equal(context.autoTickWebConventionsRequirement(checklist, "project", "student@example.school.nz", saved), true);
        assert.equal(checklist[standard][0].done, true);
        const full = { ...saved, [standard]: [{ text: criterion, done: false }] };
        context.autoTickWebConventionsRequirement(full, "project", "student@example.school.nz");
        assert.equal(full[standard][0].done, true);
        assert.equal(context.getDigiMedConventionsSubtask(full, "video").count, 3);
        context.autoTickWebConventionsRequirement(checklist, "project", "student@example.school.nz", evidence(["Audio", "Continuity"]));
        assert.equal(checklist[standard][0].done, false, "Two conventions must not complete the criterion");
    }
    storage.set("video:project:student@example.school.nz", JSON.stringify({ Audio: true, Credits: true, Continuity: true }));
    assert.equal(context.getDigiMedConventionsAcknowledgementCount("project", "student@example.school.nz", evidence([]), "video"), 0,
        "An explicit empty saved state takes precedence over stale browser checks");
    assert.equal(context.getDigiMedConventionsSubtask({
        web: [{ text: "CONVENTION_ACK|Navigation|true" }, { text: "DIGIMED_STATE|conventions|Layout|true" }],
        ...evidence(["Audio"])
    }, "video").count, 1, "Web and video evidence must not mix");
});

test("Web and image convention behavior is preserved", () => {
    const { context, storage } = setup();
    context.getAllocatedDigitalMediaType = () => "web";
    const web = { web: ["Navigation", "Layout", "Typography"].map((area) => ({ text: `CONVENTION_ACK|${area}|true` })),
        "91903": [{ text: criterion, done: false }], ...evidence(["Audio"]) };
    context.autoTickWebConventionsRequirement(web, "project", "student@example.school.nz");
    assert.equal(web["91903"][0].done, true);
    assert.equal(context.getDigiMedConventionsSubtask(web, "web").count, 3);
    context.getAllocatedDigitalMediaType = () => "image";
    assert.equal(context.isWebConventionsRequirementStep("91903", criterion), false);
    storage.set("image:project:student@example.school.nz", JSON.stringify({ Contrast: true, Alignment: true }));
    assert.equal(context.getDigiMedConventionsSubtask({}, "image").count, 2);
});

test("Task List rendering and persistence use the same video count and the real checklist size", () => {
    assert.match(source, /autoChangedChecklistConventions = autoTickWebConventionsRequirement\(taskListState\.checklistState, taskListState\.selectedId, signedInEmail, taskListState\.fullEvidenceState\)/);
    assert.match(source, /fullEvidenceState, getAllocatedDigitalMediaType\(standard\)\) >= 3/);
    assert.match(source, /\$\{conventionsSubtask\.count\}\/\$\{conventionsSubtask\.total\}/);
    const detail = fs.readFileSync(path.join(root, "ProjectPages", "activity-detail.js"), "utf8");
    const start = detail.indexOf("const DIGIMED_VIDEO_CONVENTION_CHECKS =");
    const end = detail.indexOf("const DIGIMED_VIDEO_PRODUCTION_PROGRESS_STORAGE_PREFIX", start);
    const ctx = vm.createContext({});
    vm.runInContext(`${detail.slice(start, end)}\nglobalThis.total = DIGIMED_VIDEO_CONVENTION_CHECKS.length;`, ctx);
    assert.equal(setup().context.getDigiMedConventionsSubtask({}, "video").total, ctx.total);
    assert.match(detail, /persistDigiMedLocalState\(activityId, email, "video-conventions", value\)/);
    assert.match(detail, /At least 3 ticked conventions complete the Task List criterion/);
});
