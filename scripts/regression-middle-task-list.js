"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const taskList = fs.readFileSync(path.join(root, "task-list.js"), "utf8");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
const html = fs.readFileSync(path.join(root, "task-list.html"), "utf8");
const templateLibrary = fs.readFileSync(path.join(root, "ProjectPages", "slideshow-template-library.js"), "utf8");
const activityDetail = fs.readFileSync(path.join(root, "ProjectPages", "activity-detail.js"), "utf8");
const teacherStudentWork = fs.readFileSync(path.join(root, "teacher-student-work.js"), "utf8");
const standardCard = fs.readFileSync(path.join(root, "assessment-standard-card.js"), "utf8");

{
    const extractFunction = (source, name) => {
        const start = source.indexOf(`function ${name}(`);
        const end = source.indexOf("\nfunction ", start + 1);
        assert.ok(start >= 0 && end > start, `Find ${name}`);
        return source.slice(start, end);
    };
    let mediaType = "image";
    const context = vm.createContext({
        URLSearchParams,
        taskListState: { selectedId: "49" },
        getAllocatedDigitalMediaType: () => mediaType,
        getTaskListEmail: () => "student@example.test",
        getDigiMedConventionsAcknowledgementCount: () => 2,
        DIGIMED_IMAGE_CONVENTIONS_ACK_STORAGE_PREFIX: "image-evidence",
        localStorage: { getItem: () => null }
    });
    vm.runInContext([
        extractFunction(taskList, "buildCustomActivityLink"),
        extractFunction(taskList, "getDigiMedConventionsSubtask"),
        extractFunction(taskList, "getTaskTopicHrefForStep"),
        extractFunction(activityDetail, "getConventionsMediaType"),
        extractFunction(activityDetail, "isDigitalOutcomeRelevantDigiMedConventionsCriterion")
    ].join("\n"), context);
    for (const type of ["image", "graphics", "vector", "web", "video"]) {
        mediaType = type;
        const expected = ["graphics", "vector"].includes(type) ? "image" : type;
        const subtask = context.getDigiMedConventionsSubtask({}, type);
        const href = context.getTaskTopicHrefForStep("91893", "Achieved", "Using relevant conventions for the media type.");
        assert.equal(href, subtask.href, "Main criterion and subtask open the same media-specific page");
        const params = new URLSearchParams(href.split("?")[1]);
        assert.equal(params.get("taskShortName"), `Conventions (${expected.toUpperCase()})`);
        assert.equal(params.get("templateId"), type === "video" ? "video-conventions" : "relevant-digimed-conventions");
        if (type !== "video") {
            assert.equal(context.isDigitalOutcomeRelevantDigiMedConventionsCriterion("", params.get("taskShortName")), true);
        }
    }
    assert.equal(context.getConventionsMediaType({ digital_media_type: "image" }, "", "Conventions (WEB)"), "image",
        "Allocation overrides legacy WEB links");
    assert.equal(context.getConventionsMediaType({ digital_media_type: "web" }, "", "Conventions (IMAGE)"), "web");
    assert.equal(context.getConventionsMediaType(null, "", "Conventions (IMAGE)"), "image",
        "Explicit Image links work for teachers without an allocation");
    assert.equal(context.getConventionsMediaType(null), "web", "Existing Web fallback is preserved");
    context.digitalOutcomeTopicKey = "relevant-digimed-conventions";
    context.conventionsMediaType = "image";
    context.taskTopicTitle = "Using relevant conventions for the media type.";
    context.resolvedTaskShortName = "Conventions (WEB)";
    context.id = "49";
    context.readStoredHubEmail = () => "student@example.test";
    context.buildDigiMedImageConventionsTable = () => "<h3>Conventions (IMAGE)</h3>";
    context.readDigiMedConventionsAcknowledgements = () => { throw new Error("Image must not read Web acknowledgements"); };
    const tableStart = activityDetail.indexOf("    const relevantDigiMedConventionsTableHtml =");
    const tableEnd = activityDetail.indexOf("    const uxPrinciplesTableHtml =", tableStart);
    assert.match(vm.runInContext(`${activityDetail.slice(tableStart, tableEnd)}\nrelevantDigiMedConventionsTableHtml`, context),
        /Conventions \(IMAGE\)/);
    const teacherLookupStart = activityDetail.indexOf("    const teacherTemplateId =");
    const teacherLookupEnd = activityDetail.indexOf("    const teacherTemplate =", teacherLookupStart);
    context.selectedTaskTopic = "Conventions (IMAGE)";
    context.selectedTaskShortName = "Conventions (IMAGE)";
    context.templateTopicText = "Conventions (IMAGE)";
    assert.equal(vm.runInContext(`${activityDetail.slice(teacherLookupStart, teacherLookupEnd)}\nteacherTemplateId`, context),
        "relevant-digimed-conventions", "Image links resolve the existing template hero rather than falling through");
}

const implicationsSummaryStart = teacherStudentWork.indexOf("function createStudentSummaryBucket(");
const implicationsSummaryEnd = teacherStudentWork.indexOf("\nfunction getStudentSummaryChipClass", implicationsSummaryStart);
assert.ok(implicationsSummaryStart >= 0 && implicationsSummaryEnd > implicationsSummaryStart);
const implicationsSummaryContext = vm.createContext({
    normalizeTrackerStandardValue: (value) => String(value || "").trim(),
    stripTaskTopicLevel: (value) => String(value || "").replace(/^(Achieved|Merit|Excellence):\s*/i, "").trim(),
    getTaskTopicGroup: (value) => String(value || "").split(":")[0].trim().toLowerCase(),
    getStudentSummaryStandardNumber: (record) => record.processStandard,
    getStudentSummarySectionLabel: () => "Section",
    toSafeExternalUrl: (value) => String(value || "")
});
vm.runInContext(teacherStudentWork.slice(implicationsSummaryStart, implicationsSummaryEnd), implicationsSummaryContext);
for (const standard of ["91907", "91897", "91903", "91893"]) {
    for (const guidance of ["Achieved: Address relevant implications.", "Achieved: Addressing relevant implication.", "Merit: Addressing relevant implications."]) {
        const topics = [
            "Achieved: Project management.", "Achieved: Decomposition.", "Achieved: Trialling.",
            "Achieved: Testing.", "Achieved: Explaining relevant implications."
        ];
        const records = topics.map((taskTopic) => ({
            studentEmail: "otto@example.test", studentName: "Otto", processStandard: standard,
            taskTopic, acknowledged: true
        }));
        records.push({ ...records[0], taskTopic: guidance, acknowledged: false });
        const originalRecords = JSON.stringify(records);
        const student = implicationsSummaryContext.buildStudentSummaryRows(records)[0];
        assert.equal(student.groups.get("achieved").total, 5, `${standard} excludes written implications guidance from Achieved totals`);
        assert.equal(student.groups.get("achieved").submittedCount, 5);
        assert.equal(student.groups.get("overall").total, 5, `${standard} also corrects the Overall total and report records`);
        assert.ok(student.groups.get("overall").records.some((record) => /Explaining relevant implications/.test(record.taskTopic)));
        assert.equal(JSON.stringify(records), originalRecords, "Summary filtering never changes the student's written evidence records");
    }
}
assert.equal(implicationsSummaryContext.isWrittenImplicationsGuidance({
    processStandard: "92005", taskTopic: "Achieved: Addressing relevant implications."
}), false, "Unrelated standards are unchanged");
const checklistSummaryStart = taskList.indexOf("function summarizeChecklistCriteria(");
const checklistSummaryEnd = taskList.indexOf("\nfunction renderAllocationLists", checklistSummaryStart);
assert.ok(checklistSummaryStart >= 0 && checklistSummaryEnd > checklistSummaryStart);
const checklistSummaryContext = vm.createContext({
    stripStepLevel: (value) => String(value || "").replace(/^(Achieved|Merit|Excellence):\s*/i, "").trim()
});
vm.runInContext(taskList.slice(checklistSummaryStart, checklistSummaryEnd), checklistSummaryContext);
for (const standard of ["91907", "91897", "91903", "91893"]) {
    const summary = checklistSummaryContext.summarizeChecklistCriteria({ [standard]: [
        { text: "Achieved: Explaining relevant implications.", done: true },
        { text: "Achieved: Addressing relevant implications.", done: false },
        { text: "Merit: Address relevant implications.", done: true }
    ] });
    assert.equal(summary.totalCount, 1, `${standard} Task List does not count written implications guidance`);
    assert.equal(summary.metCount, 1);
    assert.equal(summary.unresolvedCount, 0);
}

const uxSlideReaderStart = server.indexOf("function extractGoogleSlidesUXPrincipleResponses(");
const uxSlideReaderEnd = server.indexOf("\nfunction extractGoogleSlidesDevelopmentRows", uxSlideReaderStart);
assert.ok(uxSlideReaderStart >= 0 && uxSlideReaderEnd > uxSlideReaderStart,
    "UX Principles slide response reader is present");
const uxSlideReaderContext = vm.createContext({
    extractGoogleSlidesTableCellText: (cell) => (cell?.text?.textElements || []).map((entry) => entry?.textRun?.content || "").join("")
});
vm.runInContext(server.slice(uxSlideReaderStart, uxSlideReaderEnd), uxSlideReaderContext);
const uxTemplateLines = [
    "User Experience (UX) Principles",
    "1. What User Experience Principles are relevant to YOUR digital outcome?",
    "Identify the UX principles that are important for your particular outcome, purpose and end users.",
    "2. Why are these UX Principles important for YOUR end users?",
    "Refer to the end-user requirements you identified earlier. Explain what experience your users need and why the selected principles matter.",
    "3. How will you APPLY these UX Principles to your outcome?",
    "Identify the components, features or design decisions where the principles will be applied and explain what you intend to do.",
    "4. What EVIDENCE shows that you applied the UX Principles?",
    "Show examples from your developed outcome using screenshots, prototypes, code, testing, Trello evidence, client/end-user feedback or other appropriate evidence.",
    "5. Did testing, feedback or development cause you to CHANGE or REFINE how you applied a UX Principle?",
    "Explain what you discovered, what you changed and why you made that development decision.",
    "6. How did applying or refining the UX Principles IMPROVE THE QUALITY of your outcome?",
    "Explain what became better for the end user as a result - for example, easier, clearer, faster, more predictable, more accessible or more effective."
];
const uxSlide = (lines) => ({
    pageElements: [{ shape: { text: { textElements: lines.map((content) => ({ textRun: { content: `${content}\n` } })) } } }]
});
const blankUXSlides = {
    slides: [uxSlide(uxTemplateLines), uxSlide(["Visibility of system status", "The outcome keeps users informed with timely, appropriate feedback."])]
};
const filledUXSlides = {
    slides: [uxSlide([
        ...uxTemplateLines,
        "Simplicity, consistency, accessibility and clear navigation are important for this website.",
        "Users need to find Solar System information easily, and users have different levels of astronomy knowledge.",
        "A consistent layout makes the website easier to understand.",
        "Use consistent navigation across pages and organise information with clear headings and sections.",
        "Use readable fonts, colours and spacing, with relevant images and interactive content.",
        "Screenshots show the website pages and navigation; HTML and CSS show layout and styling.",
        "User testing showed the menu label was unclear, so I changed it to make navigation easier.",
        "The new headings and mobile CSS make the website easier to use on smaller screens."
    ]), ...blankUXSlides.slides.slice(1)]
};
assert.deepEqual(JSON.parse(JSON.stringify(uxSlideReaderContext.extractGoogleSlidesUXPrincipleResponses(blankUXSlides))), {
    responseCount: 0, responseCharacters: 0, areas: [], filled: false
}, "A blank UX template and reference slide do not count as student evidence");
const filledUXResult = uxSlideReaderContext.extractGoogleSlidesUXPrincipleResponses(filledUXSlides);
assert.equal(filledUXResult.filled, true,
    "Substantive responses across the UX prompts count as a filled slide");
assert.ok(["Consistency and standards", "Recognition rather than recall", "Aesthetic and minimalist design", "Accessibility"]
    .every((area) => filledUXResult.areas.includes(area)), "Filled responses identify the relevant UX principles");

const conventionsReaderStart = server.indexOf("function extractGoogleSlidesConventionAreas(");
const conventionsReaderEnd = server.indexOf("\nfunction extractGoogleSlidesUXPrincipleResponses", conventionsReaderStart);
assert.ok(conventionsReaderStart >= 0 && conventionsReaderEnd > conventionsReaderStart,
    "Google Slides Conventions reader is present");
const conventionsReaderContext = vm.createContext({
    extractGoogleSlidesTableCellText: (cell) => String(cell?.text || "").trim()
});
vm.runInContext(server.slice(conventionsReaderStart, conventionsReaderEnd), conventionsReaderContext);
const conventionTableSlide = (rows) => ({ slides: [{ pageElements: [{ table: { tableRows: rows.map(([area, response]) => ({
    tableCells: [{ text: area }, { text: response }]
})) } }] }] });
assert.deepEqual(JSON.parse(JSON.stringify(conventionsReaderContext.extractGoogleSlidesConventionAreas(conventionTableSlide([
    ["Typography", "I used Georgia for readability."],
    ["Buttons/Controls", "Buttons change on hover to show they are clickable."],
    ["Consistency", "The layout and terms match the client's expectations."]
])))), ["Typography", "Buttons/Controls", "Consistency"], "Sierra's populated convention rows are detected");
assert.deepEqual(JSON.parse(JSON.stringify(conventionsReaderContext.extractGoogleSlidesConventionAreas(conventionTableSlide([
    ["Typography", ""], ["Buttons/Controls", ""], ["Consistency", ""]
])))), [], "Convention labels without written responses do not count");

const webIntegrityReaderStart = server.indexOf("function extractGoogleSlidesWebIntegrityEvidence(");
const webIntegrityReaderEnd = server.indexOf("\nfunction extractGoogleSlidesDevelopmentRows", webIntegrityReaderStart);
assert.ok(webIntegrityReaderStart >= 0 && webIntegrityReaderEnd > webIntegrityReaderStart,
    "Web Integrity slide evidence reader is present");
const webIntegrityReaderContext = vm.createContext({
    extractGoogleSlidesTableCellText: (cell) => (cell?.text?.textElements || []).map((entry) => entry?.textRun?.content || "").join("")
});
vm.runInContext(server.slice(webIntegrityReaderStart, webIntegrityReaderEnd), webIntegrityReaderContext);
const webIntegritySlide = (lines) => ({
    slides: [{ pageElements: [{ shape: { text: { textElements: lines.map((content) => ({ textRun: { content: `${content}\n` } })) } } }] }]
});
assert.deepEqual(JSON.parse(JSON.stringify(webIntegrityReaderContext.extractGoogleSlidesWebIntegrityEvidence(webIntegritySlide([
    "HTML validation results", "Enter the result from the W3C HTML validator.",
    "CSS validation results", "Enter the result from the W3C CSS validator."
])))), { htmlComplete: false, cssComplete: false, complete: false },
"Template prompts and blank result fields do not complete Web Integrity");
assert.equal(webIntegrityReaderContext.extractGoogleSlidesWebIntegrityEvidence(webIntegritySlide([
    "HTML validation results", "W3C Nu Validator: 0 errors and 0 warnings.",
    "CSS validation results", "Enter the result from the W3C CSS validator."
])).complete, false, "HTML results alone do not complete Web Integrity");
assert.equal(webIntegrityReaderContext.extractGoogleSlidesWebIntegrityEvidence(webIntegritySlide([
    "HTML validation results", "Note the result from the W3C HTML validator here.",
    "CSS validation results", "Note the result from the W3C CSS validator here."
])).complete, false, "Template instructions to note results are not student validation evidence");
assert.deepEqual(JSON.parse(JSON.stringify(webIntegrityReaderContext.extractGoogleSlidesWebIntegrityEvidence(webIntegritySlide([
    "HTML validation results", "W3C Nu Validator: 0 errors and 0 warnings.",
    "CSS validation results", "W3C CSS Validator: no errors found in the stylesheet."
])))), { htmlComplete: true, cssComplete: true, complete: true },
"Substantive HTML and CSS validation results complete Web Integrity");

const webIntegrityAutoStart = taskList.indexOf("function isWebIntegrityRequirementStep(");
const webIntegrityAutoEnd = taskList.indexOf("\nfunction autoTickDigitalOutcomeRequirements", webIntegrityAutoStart);
const integrityManagementStart = taskList.indexOf("function getStepAutoManagementKind(");
const integrityManagementEnd = taskList.indexOf("\nfunction getSessionTickKey", integrityManagementStart);
assert.ok(webIntegrityAutoStart >= 0 && webIntegrityAutoEnd > webIntegrityAutoStart
    && integrityManagementStart >= 0 && integrityManagementEnd > integrityManagementStart,
    "Web Integrity requirement and auto-tick helpers are present");
let webIntegrityMediaType = "web";
const webIntegrityTaskContext = vm.createContext({
    taskListState: { templateCopies: [] },
    getAllocatedDigitalMediaType: () => webIntegrityMediaType,
    getStepLevel: (text) => String(text || "").split(":")[0].trim(),
    stripStepLevel: (text) => String(text || "").replace(/^(Achieved|Merit|Excellence):\s*/i, "").trim(),
    isTestingFunctionsRequirementStep: () => false,
    isWebIntegrityRequirementStep: () => false,
    isUXPrinciplesRequirementStep: () => false,
    isWebConventionsRequirementStep: () => false,
    isDecompositionRequirementStep: () => false,
    isUseOfToolsTechniquesRequirementStep: () => false,
    isTriallingComponentsRequirementStep: () => false,
    inferDigitalOutcomeTaskTemplateId: () => "",
    isEfficientToolsMainStep: () => false,
    isRelevantImplicationsCategoryStep: () => false
});
vm.runInContext([
    taskList.slice(webIntegrityAutoStart, webIntegrityAutoEnd),
    taskList.slice(integrityManagementStart, integrityManagementEnd)
].join("\n"), webIntegrityTaskContext);
const integrityCriteria = ["91893", "91903"].map((standard) => ({
    standard,
    text: "Achieved: Applying appropriate data integrity and testing procedures.",
    done: false
}));
const webIntegrityTaskState = {
    "91893": [integrityCriteria[0]],
    "91903": [integrityCriteria[1]]
};
assert.equal(webIntegrityTaskContext.getStepAutoManagementKind("91893", integrityCriteria[0].text), "auto");
assert.equal(webIntegrityTaskContext.getStepAutoManagementKind("91903", integrityCriteria[1].text), "auto");
assert.equal(webIntegrityTaskContext.autoTickWebIntegrityRequirement(webIntegrityTaskState), false,
    "A missing Web Integrity slide does not tick either standard");
webIntegrityTaskContext.taskListState.templateCopies = [{ templateId: "testing-functions-markup-validation" }];
assert.equal(webIntegrityTaskContext.autoTickWebIntegrityRequirement(webIntegrityTaskState), true);
assert.ok(integrityCriteria.every((criterion) => webIntegrityTaskState[criterion.standard][0].done),
    "Using the Integrity & Validation template ticks both 91893 and 91903");
webIntegrityTaskContext.taskListState.templateCopies = [];
assert.equal(webIntegrityTaskContext.autoTickWebIntegrityRequirement(webIntegrityTaskState), true);
assert.ok(integrityCriteria.every((criterion) => !webIntegrityTaskState[criterion.standard][0].done),
    "Removing the Integrity & Validation template record clears both ticks");
webIntegrityMediaType = "video";
assert.equal(webIntegrityTaskContext.isWebIntegrityRequirementStep("91903", integrityCriteria[1].text), false,
    "Web slide completion does not manage Video Integrity checklists");
assert.match(taskList, /const isWebIntegrityComplete = isWebIntegrityRequirement && hasCompletedWebIntegritySlide\(taskListState\.fullEvidenceState\)/);
assert.match(taskList, /const isRowChecked = isWebIntegrityRequirement\s*\? isWebIntegrityComplete/,
    "The visible Web Integrity checkbox follows the saved completed-slide marker");
assert.doesNotMatch(taskList, /integrityTestingCategoryCount/,
    "Integrity & Validation has no numeric counter");
assert.doesNotMatch(taskList, /isLinkedIntegrityTestingRow/,
    "Integrity & Validation does not receive purple linked-row shading");
const integrityLinkStart = taskList.indexOf("function getTaskTopicHrefForStep(");
const integrityLinkEnd = taskList.indexOf("\nconst DECOMPOSITION_CATEGORY_COVERAGE_STORAGE_PREFIX", integrityLinkStart);
assert.ok(integrityLinkStart >= 0 && integrityLinkEnd > integrityLinkStart);
const integrityLinkContext = vm.createContext({
    taskListState: { selectedId: "activity-1" },
    buildCustomActivityLink: (_activityId, title, shortName, templateId) => `${title}|${shortName}|${templateId}`
});
vm.runInContext(taskList.slice(integrityLinkStart, integrityLinkEnd), integrityLinkContext);
for (const standard of ["91893", "91903"]) {
    assert.equal(integrityLinkContext.getTaskTopicHrefForStep(standard, "Achieved", integrityCriteria[0].text),
        "Integrity & Validation (WEB)|Integrity & Validation (WEB)|code-validation",
        `${standard} Integrity criterion links to the same Web page as its subtask`);
}
assert.match(activityDetail, /syncDigiMedWebIntegrityFromSlide\(projectId, email, selectedTaskTopic\)/,
    "Opening the Code Validation page reads the linked Integrity & Validation slide");
assert.match(activityDetail, /read-web-integrity/,
    "The Code Validation page calls the authenticated Web Integrity slide reader");
assert.match(activityDetail, /web-integrity-slide-status[\s\S]*?Integrity & Validation slide checked/,
    "The Code Validation page reports the detected HTML/CSS result status");
assert.match(activityDetail, /async function resolveDigiMedWebIntegritySlideUrl[\s\S]*?sync-drive-templates[\s\S]*?testing-functions-markup-validation/,
    "Web Integrity slide lookup falls back to a Drive scan for the personal Markup Validation copy");
assert.match(teacherStudentWork, /\["web-integrity", "image-integrity", "video-integrity"\]/,
    "Teacher summaries recognize the Web Integrity completion marker");

const conventionCountStart = taskList.indexOf("function getDigiMedConventionsAcknowledgementCount(");
const conventionCountEnd = taskList.indexOf("\nfunction getDigiMedConventionsSubtask", conventionCountStart);
const conventionAutoStart = taskList.indexOf("function isWebConventionsRequirementStep(");
const conventionAutoEnd = taskList.indexOf("\nfunction getDigiMedUXPrinciplesAcknowledgementCount", conventionAutoStart);
const conventionsManagementStart = taskList.indexOf("function getStepAutoManagementKind(");
const conventionsManagementEnd = taskList.indexOf("\nfunction getSessionTickKey", conventionsManagementStart);
assert.ok(conventionCountStart >= 0 && conventionCountEnd > conventionCountStart
    && conventionAutoStart >= 0 && conventionAutoEnd > conventionAutoStart
    && conventionsManagementStart >= 0 && conventionsManagementEnd > conventionsManagementStart,
    "Web Conventions count, completion, and management helpers are present");
const conventionTaskContext = vm.createContext({
    DIGIMED_CONVENTIONS_ACK_STORAGE_PREFIX: "hub_digimed_conventions_ack_v1",
    localStorage: { getItem: () => null },
    getTaskListEmail: () => "sierra@example.test",
    getAllocatedDigitalMediaType: () => "web",
    getStepLevel: (text) => String(text || "").split(":")[0].trim(),
    stripStepLevel: (text) => String(text || "").replace(/^(Achieved|Merit|Excellence):\s*/i, "").trim(),
    isUXPrinciplesRequirementStep: () => false,
    isDecompositionRequirementStep: () => false,
    isTestingFunctionsRequirementStep: () => false,
    isWebIntegrityRequirementStep: () => false,
    isUseOfToolsTechniquesRequirementStep: () => false,
    isTriallingComponentsRequirementStep: () => false,
    inferDigitalOutcomeTaskTemplateId: () => "",
    isEfficientToolsMainStep: () => false,
    isRelevantImplicationsCategoryStep: () => false
});
vm.runInContext([
    taskList.slice(conventionCountStart, conventionCountEnd),
    taskList.slice(conventionAutoStart, conventionAutoEnd),
    taskList.slice(conventionsManagementStart, conventionsManagementEnd)
].join("\n"), conventionTaskContext);
const conventionCriterion = "Achieved: Using relevant conventions for the media type.";
const conventionState = { "91903": [{ text: conventionCriterion, done: false }] };
const conventionEvidence = { "digital-media-conventions": [
    { text: "CONVENTION_ACK|Typography|true", done: true },
    { text: "CONVENTION_ACK|Buttons/Controls|true", done: true }
] };
assert.equal(conventionTaskContext.getStepAutoManagementKind("91903", conventionCriterion), "auto");
assert.equal(conventionTaskContext.autoTickWebConventionsRequirement({ ...conventionState, ...conventionEvidence }, "activity-1", "sierra@example.test"), false,
    "Two web conventions do not complete the criterion");
conventionState["digital-media-conventions"] = [...conventionEvidence["digital-media-conventions"],
    { text: "CONVENTION_ACK|Consistency|true", done: true }];
assert.equal(conventionTaskContext.autoTickWebConventionsRequirement(conventionState, "activity-1", "sierra@example.test"), true);
assert.equal(conventionState["91903"][0].done, true, "Three web conventions tick the criterion");
conventionState["digital-media-conventions"].pop();
assert.equal(conventionTaskContext.autoTickWebConventionsRequirement(conventionState, "activity-1", "sierra@example.test"), true);
assert.equal(conventionState["91903"][0].done, false, "Dropping below three clears the criterion");
const persistedConventionState = {
    "91903": [{ text: conventionCriterion, done: false }],
    "digital-media-conventions": [
        { text: "DIGIMED_STATE|conventions|Typography|true", done: true },
        { text: "DIGIMED_STATE|conventions|Buttons/Controls|true", done: true },
        { text: "DIGIMED_STATE|conventions|Consistency|true", done: true }
    ]
};
assert.equal(conventionTaskContext.autoTickWebConventionsRequirement(persistedConventionState, "activity-1", "sierra@example.test"), true);
assert.equal(persistedConventionState["91903"][0].done, true,
    "Three persisted convention acknowledgements also complete the criterion across devices");
assert.match(activityDetail, /async function resolveDigiMedConventionsSlideUrl[\s\S]*?readStoredTaskTopicSlideSyncEntryByTemplateId[\s\S]*?fetchEvidenceRowsEnsuringAllocation[\s\S]*?getDbTemplateCopyUrlById/,
    "Conventions slide lookup falls back across local sync, saved evidence, and database copies");
assert.match(activityDetail, /sync-drive-templates[\s\S]*?relevant-digimed-conventions/,
    "Conventions slide lookup scans the student's Drive task folder when stored links are missing");
assert.match(taskList, /autoChangedChecklistConventions = autoTickWebConventionsRequirement/,
    "Task List applies convention evidence during load");
assert.match(taskList, /isWebConventionsRequirement\s*\?\s*getDigiMedConventionsAcknowledgementCount\(taskListState\.selectedId, getTaskListEmail\(\), taskListState\.fullEvidenceState\) >= 3/,
    "The visible conventions tick uses the same count shown beside it");
assert.match(taskList, /isUseOfToolsTechniquesRequirement \|\| isUXPrinciplesRequirement \|\| isWebConventionsRequirement \|\| isWebIntegrityRequirement \? "is-auto-complete"/,
    "The auto-managed conventions tick uses the blue completion style");

const clientDeckHelperStart = server.indexOf("function buildClientPresentationSlideRequests(");
const clientDeckHelperEnd = server.indexOf("\nasync function driveDownloadExportedFile", clientDeckHelperStart);
assert.ok(clientDeckHelperStart >= 0 && clientDeckHelperEnd > clientDeckHelperStart,
    "Client presentation starter-deck builder is present");
const clientDeckContext = vm.createContext({});
vm.runInContext(server.slice(clientDeckHelperStart, clientDeckHelperEnd), clientDeckContext);
const clientDeckRequests = JSON.parse(JSON.stringify(clientDeckContext.buildClientPresentationSlideRequests({
    slides: [{ objectId: "existing-slide", pageElements: [{ objectId: "default-title" }] }]
})));
assert.equal(clientDeckRequests.filter((request) => request.createSlide).length, 5,
    "A new starter deck fills the default slide and creates five more");
assert.ok(clientDeckRequests.some((request) => request.insertText?.text === "Final Client Presentation"));
assert.ok(clientDeckRequests.some((request) => request.insertText?.text === "The final digital outcome"));
assert.ok(clientDeckRequests.some((request) => request.insertText?.text === "Testing, feedback and refinement"));
assert.ok(clientDeckRequests.some((request) => request.insertText?.text === "Client response and next steps"));
const clientDeckRouteStart = server.indexOf('app.post("/api/student/drive-setup/create-client-presentation"');
const clientDeckRouteEnd = server.indexOf("\nfunction findBestStudentTaskTopicSlide", clientDeckRouteStart);
const clientDeckRoute = server.slice(clientDeckRouteStart, clientDeckRouteEnd);
assert.ok(clientDeckRouteStart >= 0 && clientDeckRouteEnd > clientDeckRouteStart);
assert.match(clientDeckRoute, /programmeFolder !== "SeniorDTECH"/);
assert.match(clientDeckRoute, /driveEnsureFolder\("root", "SeniorDTECH"/);
assert.match(clientDeckRoute, /driveEnsureFolder\(String\(seniorFolder\.id\), "Process Assessment"/);
assert.match(clientDeckRoute, /driveFindFileByNameInFolder[\s\S]*?createGoogleSlidesPresentation/,
    "The endpoint reopens an existing deck before creating another");
assert.match(clientDeckRoute, /recordTemplateCopyInDb\(activityId, email, copyEntry\)/,
    "The deck URL is saved with the assessment for future visits");

const clientPresentationEligibilityStart = taskList.indexOf("function isSeniorDigitalMediaTask(");
const clientPresentationEligibilityEnd = taskList.indexOf("\nfunction renderFinalClientPresentationCard", clientPresentationEligibilityStart);
assert.ok(clientPresentationEligibilityStart >= 0 && clientPresentationEligibilityEnd > clientPresentationEligibilityStart);
const clientPresentationContext = vm.createContext({ taskListState: { course: "SeniorDTECH" } });
vm.runInContext(taskList.slice(clientPresentationEligibilityStart, clientPresentationEligibilityEnd), clientPresentationContext);
assert.equal(clientPresentationContext.isSeniorDigitalMediaTask({ standard_1: "91897", standard_2: "91903" }), true);
assert.equal(clientPresentationContext.isSeniorDigitalMediaTask({ standard_1: "91897", standard_2: "91907" }), false);
clientPresentationContext.taskListState.course = "MiddleDTECH";
assert.equal(clientPresentationContext.isSeniorDigitalMediaTask({ standard_1: "91897", standard_2: "91903" }), false);
assert.match(html, /id="task-list-workspace"[\s\S]*id="task-list-client-presentation-card"[\s\S]*id="task-list-checklist-card"/,
    "The client presentation card sits beside the existing checklist workspace");

const uxCountStart = taskList.indexOf("function getDigiMedUXPrinciplesAcknowledgementCount(");
const uxCountEnd = taskList.indexOf("\nfunction getDigiMedUXPrinciplesSubtask", uxCountStart);
const uxAutoTickStart = taskList.indexOf("function isUXPrinciplesRequirementStep(");
const uxAutoTickEnd = taskList.indexOf("\nfunction getProjectManagementSystemLogo", uxAutoTickStart);
assert.ok(uxCountStart >= 0 && uxCountEnd > uxCountStart
    && uxAutoTickStart >= 0 && uxAutoTickEnd > uxAutoTickStart,
    "UX acknowledgement count and auto-tick helpers are present");
const uxTaskContext = vm.createContext({
    DIGIMED_UX_PRINCIPLES_ACK_STORAGE_PREFIX: "hub_digimed_ux_principles_ack_v1",
    localStorage: { getItem: () => null },
    getTaskListEmail: () => "student@example.test",
    getStepLevel: (text) => String(text || "").split(":")[0].trim(),
    stripStepLevel: (text) => String(text || "").replace(/^(Achieved|Merit|Excellence):\s*/i, "").trim(),
    isUXPrinciplesRequirementStep: (standard, text) => String(standard) === "91903" && String(text).includes("Applying user experience principles relevant"),
    isTestingFunctionsRequirementStep: () => false,
    isDecompositionRequirementStep: () => false,
    isUseOfToolsTechniquesRequirementStep: () => false,
    isTriallingComponentsRequirementStep: () => false,
    inferDigitalOutcomeTaskTemplateId: () => "",
    isEfficientToolsMainStep: () => false,
    isRelevantImplicationsCategoryStep: () => false
});
vm.runInContext([
    taskList.slice(uxCountStart, uxCountEnd),
    taskList.slice(uxAutoTickStart, uxAutoTickEnd)
].join("\n"), uxTaskContext);
const uxCriterion = "Achieved: Applying user experience principles relevant to the purpose of the outcome.";
const uxEvidence = { "digimed-local-state:ux-principles-slide": [{ text: "DIGIMED_STATE|ux-principles-slide|filled|true", done: true }] };
assert.equal(uxTaskContext.isUXPrinciplesRequirementStep("91903", uxCriterion), true);
assert.match(taskList, /if \(isUXPrinciplesRequirementStep\(std, text\)\)\s*\{\s*return "auto"/,
    "Achieved UX principles are classified as evidence-managed");
const uxCompletionState = {
    "91903": [{ text: uxCriterion, done: false }],
    "digimed-local-state:ux-principles": [
        { text: "DIGIMED_STATE|ux-principles|Visibility of system status|true", done: true },
        { text: "DIGIMED_STATE|ux-principles|Consistency and standards|true", done: true }
    ],
    ...uxEvidence
};
assert.equal(uxTaskContext.autoTickUXPrinciplesRequirement(uxCompletionState, "activity-1", "student@example.test"), false);
assert.equal(uxCompletionState["91903"][0].done, false, "Two UX principles do not complete the criterion even when the slide is filled");
uxCompletionState["digimed-local-state:ux-principles"].push({
    text: "DIGIMED_STATE|ux-principles|Accessibility|true", done: true
});
assert.equal(uxTaskContext.autoTickUXPrinciplesRequirement(uxCompletionState, "activity-1", "student@example.test"), true);
assert.equal(uxCompletionState["91903"][0].done, true, "Three UX principles tick the Achieved criterion");
uxCompletionState["digimed-local-state:ux-principles"].pop();
assert.equal(uxTaskContext.autoTickUXPrinciplesRequirement(uxCompletionState, "activity-1", "student@example.test"), true);
assert.equal(uxCompletionState["91903"][0].done, false, "Dropping below three UX principles clears the criterion tick");
const teacherUxStart = teacherStudentWork.indexOf("function hasDigitalMediaCriterionEvidence(");
const teacherUxEnd = teacherStudentWork.indexOf("\nfunction getDigiMedToolsTechniquesEvidenceCount", teacherUxStart);
assert.ok(teacherUxStart >= 0 && teacherUxEnd > teacherUxStart, "Teacher Digital Media evidence checker is present");
const teacherUxContext = vm.createContext({
    stripTaskTopicLevel: (text) => String(text || "").replace(/^(Achieved|Merit|Excellence):\s*/i, "").trim(),
    getTaskTopicGroup: () => "",
    hasPersistedDigiMedState: (rows, kinds) => (Array.isArray(rows) ? rows : []).some((row) =>
        (Array.isArray(row?.steps) ? row.steps : []).some((step) => {
            const match = String(step?.text || "").match(/^DIGIMED_STATE\|([^|]+)\|.+\|true$/i);
            return match && (Array.isArray(kinds) ? kinds : [kinds]).includes(match[1]);
        })
    )
});
vm.runInContext(teacherStudentWork.slice(teacherUxStart, teacherUxEnd), teacherUxContext);
assert.equal(teacherUxContext.hasDigitalMediaCriterionEvidence("Applying appropriate data integrity and testing procedures", [{ steps: [
    { text: "DIGIMED_STATE|web-integrity|html-css-results|true" }
] }]), true, "Teacher summary accepts completed HTML and CSS validation results");
assert.equal(teacherUxContext.hasDigitalMediaCriterionEvidence("Applying appropriate data integrity and testing procedures", [{ steps: [
    { text: "DIGIMED_STATE|web-integrity|html-css-results|false" }
] }]), false, "Teacher summary rejects incomplete Web Integrity evidence");
const teacherUxEvidence = (areas) => [{ steps: areas.map((area) => ({
    text: `DIGIMED_STATE|ux-principles|${area}|true`
})) }];
assert.equal(teacherUxContext.hasDigitalMediaCriterionEvidence("Applying user experience principles", teacherUxEvidence([
    "Visibility of system status", "Consistency and standards"
])), false, "Teacher summary requires three UX principle areas");
assert.equal(teacherUxContext.hasDigitalMediaCriterionEvidence("Applying user experience principles", teacherUxEvidence([
    "Visibility of system status", "Consistency and standards", "Accessibility"
])), true, "Teacher summary recognizes three UX principle areas");
const teacherConventionEvidence = (areas) => [{ steps: areas.map((area) => ({
    text: `DIGIMED_STATE|conventions|${area}|true`
})) }];
assert.equal(teacherUxContext.hasDigitalMediaCriterionEvidence("Using relevant conventions for the media type", teacherConventionEvidence([
    "Typography", "Buttons/Controls"
])), false, "Teacher summary requires three convention areas");
assert.equal(teacherUxContext.hasDigitalMediaCriterionEvidence("Using relevant conventions for the media type", teacherConventionEvidence([
    "Typography", "Buttons/Controls", "Consistency"
])), true, "Teacher summary recognizes three convention areas");
assert.match(activityDetail, /syncDigiMedUXPrinciplesFromSlide\(id, readStoredHubEmail\(\), taskTopicTitle\)/,
    "Opening the UX page reads the linked slide");
assert.match(activityDetail, /async function resolveDigiMedUXPrinciplesSlideUrl[\s\S]*?readStoredTaskTopicSlideSyncEntryByTemplateId[\s\S]*?fetchEvidenceRowsEnsuringAllocation[\s\S]*?getDbTemplateCopyUrlById/,
    "UX slide lookup falls back from local sync storage to saved evidence and DB template copies");
assert.match(activityDetail, /read-ux-principles/,
    "The UX page calls the authenticated server slide reader");
assert.match(taskList, /autoChangedChecklistUX = autoTickUXPrinciplesRequirement/,
    "Task List applies the saved UX evidence during load");

const decompositionCategoriesStart = taskList.indexOf("const DECOMPOSITION_TASK_CATEGORIES = [");
const decompositionCategoriesEnd = taskList.indexOf("\n];", decompositionCategoriesStart) + 3;
const decompositionCoverageStart = taskList.indexOf("function hasCompleteDecompositionCategoryCoverage(");
const decompositionCoverageEnd = taskList.indexOf("\nfunction writeDecompositionCategoryCoverage", decompositionCoverageStart);
const decompositionManagementStart = taskList.indexOf("function getStepAutoManagementKind(");
const decompositionManagementEnd = taskList.indexOf("\nfunction getSessionTickKey", decompositionManagementStart);
const decompositionAutoTickStart = taskList.indexOf("function isDecompositionRequirementStep(", decompositionManagementStart);
const decompositionAutoTickEnd = taskList.indexOf("\nfunction autoTickProjectManagementRequirement", decompositionAutoTickStart);
assert.ok(decompositionCategoriesStart >= 0 && decompositionCategoriesEnd > decompositionCategoriesStart
    && decompositionCoverageStart >= 0 && decompositionCoverageEnd > decompositionCoverageStart
    && decompositionManagementStart >= 0 && decompositionManagementEnd > decompositionManagementStart
    && decompositionAutoTickStart >= 0 && decompositionAutoTickEnd > decompositionAutoTickStart,
    "Decomposition coverage and auto-tick helpers are present");
let decompositionCoverage = { hasData: true, counts: {
    "Development Steps": 1, "Tools & Techniques": 1, Trialling: 1,
    Testing: 1, "Success Criteria": 1, "Client Interaction": 1
} };
const decompositionContext = vm.createContext({
    readDecompositionCategoryCoverage: () => decompositionCoverage,
    getStepLevel: (text) => String(text || "").split(":")[0].trim(),
    stripStepLevel: (text) => String(text || "").replace(/^(Achieved|Merit|Excellence):\s*/i, "").trim(),
    isUXPrinciplesRequirementStep: () => false,
    isWebConventionsRequirementStep: () => false,
    isTestingFunctionsRequirementStep: () => false,
    isWebIntegrityRequirementStep: () => false,
    isUseOfToolsTechniquesRequirementStep: () => false,
    isTriallingComponentsRequirementStep: () => false,
    inferDigitalOutcomeTaskTemplateId: () => "",
    isEfficientToolsMainStep: () => false,
    isRelevantImplicationsCategoryStep: () => false
});
vm.runInContext([
    taskList.slice(decompositionCategoriesStart, decompositionCategoriesEnd),
    taskList.slice(decompositionCoverageStart, decompositionCoverageEnd),
    taskList.slice(decompositionManagementStart, decompositionManagementEnd),
    taskList.slice(decompositionAutoTickStart, decompositionAutoTickEnd)
].join("\n"), decompositionContext);
const decompositionCriterion = "Achieved: Decompose the digital technologies outcome into smaller components.";
const decompositionState = { "91907": [{ text: decompositionCriterion, done: false }] };
assert.equal(decompositionContext.getStepAutoManagementKind("91907", decompositionCriterion), "auto");
assert.equal(decompositionContext.autoTickDecompositionRequirement(decompositionState, "activity-1", "student@example.test"), true);
assert.equal(decompositionState["91907"][0].done, true, "Every category with at least one Trello task checks the parent criterion");
decompositionCoverage.counts["Client Interaction"] = 0;
assert.equal(decompositionContext.autoTickDecompositionRequirement(decompositionState, "activity-1", "student@example.test"), true);
assert.equal(decompositionState["91907"][0].done, false, "Missing category coverage clears the parent criterion");
decompositionCoverage = { hasData: false, counts: {} };
decompositionState["91907"][0].done = true;
assert.equal(decompositionContext.autoTickDecompositionRequirement(decompositionState, "activity-1", "student@example.test"), true);
assert.equal(decompositionState["91907"][0].done, false, "Unknown coverage never leaves a stale parent tick");
assert.match(taskList, /isTickActionDisabled \|\| isDecompositionRow/,
    "The decomposition parent cannot be manually ticked");
assert.match(taskList, /isDecompositionRow \? "is-auto-complete" : ""/,
    "The auto-managed decomposition checkbox uses the blue auto-complete style");
assert.match(taskList, /isInformationalRow \|\| isDecompositionRow[\s\S]*?task-list-step-text/,
    "The decomposition parent title is unlinked while subtask category links remain available");
assert.match(taskList, /autoChangedChecklistDecomposition = autoTickDecompositionRequirement\(taskListState\.checklistState, taskListState\.selectedId, signedInEmail\)/,
    "Saved decomposition coverage is applied during checklist load");
assert.match(taskList, /loadDecompositionCoverageFromServer\(taskListState\.selectedId\)[\s\S]*?autoTickDecompositionRequirement\(taskListState\.checklistState/,
    "Fresh server coverage updates the parent criterion after loading");
assert.match(taskList, /writeDecompositionCategoryCoverage\(taskListState\.selectedId, email, categoryRows\)[\s\S]*?autoTickDecompositionRequirement\(taskListState\.checklistState/,
    "A Trello sync updates the parent criterion immediately");

const hiddenTaskFilterStart = script.indexOf("function shouldHideStudentAssessmentTask(");
const hiddenTaskFilterEnd = script.indexOf("\nif (typeof window !== \"undefined\")", hiddenTaskFilterStart);
assert.ok(hiddenTaskFilterStart >= 0 && hiddenTaskFilterEnd > hiddenTaskFilterStart,
    "Shared hidden-student-task filter is present");
const hiddenTaskContext = vm.createContext({});
vm.runInContext(script.slice(hiddenTaskFilterStart, hiddenTaskFilterEnd), hiddenTaskContext);
assert.equal(hiddenTaskContext.shouldHideStudentAssessmentTask("91897", "Achieved: List the key features or requirements the outcome must include."), true);
assert.equal(hiddenTaskContext.shouldHideStudentAssessmentTask("91897", "Achieved: Decompose the outcome into smaller components."), false);
assert.equal(hiddenTaskContext.shouldHideStudentAssessmentTask("91907", "Achieved: List the key features or requirements the outcome must include."), false);
assert.match(taskList, /visibleStudentRows\(standard, normalize91897ChecklistRows/,
    "Task List excludes the row even when it exists in previously saved evidence");
assert.match(standardCard, /hubShouldHideStudentAssessmentTask\?\.\(standardNumber, row\)/,
    "Student Assessment Standard guide excludes the row");
assert.match(activityDetail, /isSelfTaskListView && window\.hubShouldHideStudentAssessmentTask/,
    "Student activity-detail evidence sidebar excludes the row without changing teacher view");

const helperStart = taskList.indexOf("function getTaskListCourseFromAllocations(");
const helperEnd = taskList.indexOf("// Minimal Drive OAuth client", helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, "Task List course and filter helpers are present");

const directoryLoadStart = server.indexOf("let studentDirectoryRowsInFlight = null;");
const directoryLoadEnd = server.indexOf("\nasync function getStaffDirectoryRows", directoryLoadStart);
assert.ok(directoryLoadStart >= 0 && directoryLoadEnd > directoryLoadStart,
    "Student directory loading helper is present for Task List profile lookup");
const directoryLoadCounts = { tableNames: 0, timetableSync: 0, selects: 0 };
const directoryLoadContext = vm.createContext({
    hasDatabase: true,
    STUDENT_TABLE_CANDIDATES: ["student_upload"],
    resolveExistingTableNames: async () => { directoryLoadCounts.tableNames += 1; return ["student_upload"]; },
    syncStudentTimetableClasses: async () => { directoryLoadCounts.timetableSync += 1; },
    quoteIdentifier: (value) => `"${value}"`,
    pool: { query: async () => { directoryLoadCounts.selects += 1; await new Promise((resolve) => setImmediate(resolve)); return { rows: [{ id: "student-1" }] }; } },
    console: { warn() {} }
});
vm.runInContext(server.slice(directoryLoadStart, directoryLoadEnd), directoryLoadContext);
async function runStudentDirectoryDeduplicationRegression() {
    const parallelRows = await Promise.all([
        directoryLoadContext.getStudentDirectoryRows(),
        directoryLoadContext.getStudentDirectoryRows()
    ]);
    assert.deepEqual(directoryLoadCounts, { tableNames: 1, timetableSync: 1, selects: 1 },
        "Concurrent Task List profile requests share one in-flight student directory scan");
    assert.equal(parallelRows[0][0].id, "student-1");
    await directoryLoadContext.getStudentDirectoryRows();
    assert.deepEqual(directoryLoadCounts, { tableNames: 2, timetableSync: 2, selects: 2 },
        "Completed directory reads are not cached across later requests");
}

const context = vm.createContext({
    getStepLevel: (text) => String(text || "").split(":")[0].trim(),
    stripStepLevel: (text) => String(text || "").replace(/^(Achieved|Merit|Excellence):\s*/i, "").trim()
});
vm.runInContext(taskList.slice(helperStart, helperEnd), context);

assert.equal(context.getTaskListCourseFromAllocations([
    { year_group: "Year 9", course_type: "DTECH" }
]), "MiddleDTECH");
assert.equal(context.getTaskListCourseFromAllocations([
    { year_group: "10", course_type: "MDTECH" }
]), "MiddleDTECH");
assert.equal(context.getTaskListCourseFromAllocations([
    { year_group: "Year 10", course_type: "COMP" }
]), "");

const mdtechProfileStart = server.indexOf("function isMiddleDtechTaskListProfile(");
const mdtechProfileEnd = server.indexOf('\napp.get("/api/my-allocations"', mdtechProfileStart);
assert.ok(mdtechProfileStart >= 0 && mdtechProfileEnd > mdtechProfileStart,
    "MDTECH Task List enrollment helper is present");
const mdtechEnrollmentQueries = [];
const mdtechProfileContext = vm.createContext({
    CLIENT_PROJECTS_TASK_ID: "49",
    hasDatabase: true,
    normalizeEmail: (email) => String(email || "").trim().toLowerCase(),
    isSchoolEmail: (email) => String(email || "").endsWith("@westlandhigh.school.nz"),
    getLearningSitesStudentProfile: async () => ({ courseIds: ["MIDDLEDTECH", "9MDTECH"] }),
    pool: { query: async (sql, values) => { mdtechEnrollmentQueries.push({ sql, values }); return { rowCount: 1 }; } }
});
vm.runInContext(server.slice(mdtechProfileStart, mdtechProfileEnd), mdtechProfileContext);
async function runMdtechTaskListEnrollmentRegression() {
    assert.equal(mdtechProfileContext.isMiddleDtechTaskListProfile({ courseIds: ["MIDDLEDTECH", "9MDTECH"] }), true,
        "Explicit Year 9 MDTECH profiles qualify for automatic enrollment");
    assert.equal(mdtechProfileContext.isMiddleDtechTaskListProfile({ courseIds: ["MIDDLEDTECH", "9DTECH"] }), false,
        "MiddleDTECH DTECH profiles are not enrolled by the MDTECH-only rule");
    assert.equal(mdtechProfileContext.isMiddleDtechTaskListProfile({ courseIds: ["MIDDLEDTECH", "9MPROG"] }), false,
        "MiddleDTECH MPROG profiles are not enrolled by the MDTECH-only rule");
    assert.equal(mdtechProfileContext.isMiddleDtechTaskListProfile({ courseIds: ["STAFF", "9MDTECH"] }), false,
        "Staff test profiles are excluded");
    assert.equal(await mdtechProfileContext.ensureMiddleDtechTaskListEnrollment("mdtech@westlandhigh.school.nz"), true);
    assert.equal(mdtechEnrollmentQueries.length, 1);
    assert.equal(mdtechEnrollmentQueries[0].values[0], "49");
    assert.match(mdtechEnrollmentQueries[0].sql, /ON CONFLICT \(project_id, student_email\) DO UPDATE SET confirmed = TRUE/);
    mdtechProfileContext.getLearningSitesStudentProfile = async () => ({ courseIds: ["MIDDLEDTECH", "9DTECH"] });
    assert.equal(await mdtechProfileContext.ensureMiddleDtechTaskListEnrollment("dtech@westlandhigh.school.nz"), false);
    assert.equal(mdtechEnrollmentQueries.length, 1, "Non-MDTECH profiles do not create a task-list allocation");
    assert.match(server, /if \(taskListView\) await ensureMiddleDtechTaskListEnrollment\(email, studentDirectoryRows\);/,
        "Task List allocation loading triggers MDTECH auto-enrollment");
}

const testingCriterion = "Achieved: Testing that the digital technologies outcome functions as intended.";
const testingChecklistState = { "91907": [{ text: testingCriterion, done: false }] };
const testingCountsState = {
    "testing-functions-counts": [{ text: "TESTING_FUNCTIONS_COUNT|0|0", done: false }]
};
const testingAutoContext = vm.createContext({
    getStepLevel: (text) => String(text || "").split(":")[0].trim(),
    stripStepLevel: (text) => String(text || "").replace(/^(Achieved|Merit|Excellence):\s*/i, "").trim(),
    isUXPrinciplesRequirementStep: () => false,
    isWebConventionsRequirementStep: () => false,
    inferDigitalOutcomeTaskTemplateId: (text) => /test(?:ing)? that the digital technologies outcome functions as intended/i.test(String(text || ""))
        ? "testing-functions" : "",
    taskListState: { templateCopies: [{ templateId: "testing-functions-markup-validation" }] },
    TESTING_FUNCTIONS_LIST_COUNT_STORAGE_PREFIX: "hub_testing_functions_list_counts_v1",
    localStorage: { getItem: () => null }
});
const testingCountsStart = taskList.indexOf("function readTestingFunctionsListCounts(");
const testingCountsEnd = taskList.indexOf("\nfunction getTestingFunctionsSubtasks", testingCountsStart);
const testingManagementStart = taskList.indexOf("function getStepAutoManagementKind(");
const testingManagementEnd = taskList.indexOf("\nfunction getSessionTickKey", testingManagementStart);
const hasTemplateCopyStart = taskList.indexOf("function hasTemplateCopyForDigitalOutcomeTask(");
const hasTemplateCopyEnd = taskList.indexOf("\nfunction isTestingFunctionsRequirementStep", hasTemplateCopyStart);
const testingAutoStart = taskList.indexOf("function isTestingFunctionsRequirementStep(");
const testingAutoEnd = taskList.indexOf("\nfunction autoTickDigitalOutcomeRequirements", testingAutoStart);
assert.ok(testingCountsStart >= 0 && testingCountsEnd > testingCountsStart
    && testingManagementStart >= 0 && testingManagementEnd > testingManagementStart
    && hasTemplateCopyStart >= 0 && hasTemplateCopyEnd > hasTemplateCopyStart
    && testingAutoStart >= 0 && testingAutoEnd > testingAutoStart,
    "Testing Functions count and auto-tick helpers are present");
vm.runInContext([
    taskList.slice(testingCountsStart, testingCountsEnd),
    taskList.slice(testingManagementStart, testingManagementEnd),
    taskList.slice(hasTemplateCopyStart, hasTemplateCopyEnd),
    taskList.slice(testingAutoStart, testingAutoEnd)
].join("\n"), testingAutoContext);
assert.equal(testingAutoContext.getStepAutoManagementKind("91907", testingCriterion), "auto",
    "The Level 3 testing criterion is automatically managed from Testing Functions slideshow entries");
assert.equal(
    testingAutoContext.autoTickTestingFunctionsRequirement(testingChecklistState, testingCountsState, "activity-1", "student@example.test"),
    true,
    "Testing Functions content auto-ticks the criterion"
);
assert.equal(testingChecklistState["91907"][0].done, true);
testingChecklistState["91907"][0].done = true;
testingAutoContext.taskListState.templateCopies = [];
testingCountsState["testing-functions-counts"][0].text = "TESTING_FUNCTIONS_COUNT|4|4";
assert.equal(
    testingAutoContext.autoTickTestingFunctionsRequirement(testingChecklistState, testingCountsState, "activity-1", "student@example.test"),
    false,
    "Existing functional/user test counts preserve the completed criterion"
);
testingChecklistState["91907"][0].done = true;
testingCountsState["testing-functions-counts"][0].text = "TESTING_FUNCTIONS_COUNT|0|0";
assert.equal(
    testingAutoContext.autoTickTestingFunctionsRequirement(testingChecklistState, testingCountsState, "activity-1", "student@example.test"),
    true,
    "Removing all Testing Functions entries clears the criterion tick"
);
assert.equal(testingChecklistState["91907"][0].done, false);
assert.match(taskList, /window\.addEventListener\("pageshow",[\s\S]*loadChecklistForTask\(taskListState\.selectedId\)/,
    "Returning to the Task List refreshes evidence after opening a topic page");
assert.match(taskList, /taskListState\.templateCopies = Array\.isArray\(templateCopiesPayload\?\.template_copies\)/,
    "Task List renders from its immediately available database template-copy records");
assert.match(taskList, /void templateCopySyncPromise\.then\(/,
    "Drive template discovery runs after the first checklist render");
const allocationsRouteStart = server.indexOf('app.get("/api/my-allocations", async (req, res) =>');
const taskListAllocationsFastPath = server.indexOf("if (taskListView) {", allocationsRouteStart);
const standardCardLookup = server.indexOf("await ensureAssessmentStandardCardsSchema();", allocationsRouteStart);
assert.ok(allocationsRouteStart >= 0 && taskListAllocationsFastPath > allocationsRouteStart
    && standardCardLookup > taskListAllocationsFastPath,
    "Task List allocations have a fast path before standard-card and external-exam lookups");

const autoDriveSyncStart = taskList.indexOf("const TASK_LIST_AUTO_DRIVE_SYNC_COOLDOWN_MS");
const autoDriveSyncEnd = taskList.indexOf("\nasync function fetchMyEvidence", autoDriveSyncStart);
assert.ok(autoDriveSyncStart >= 0 && autoDriveSyncEnd > autoDriveSyncStart,
    "Automatic Tools & Techniques Drive scan helper is present");
const autoDriveCalls = [];
const autoDriveContext = vm.createContext({
    window: { getActiveHubDriveAccessToken: () => "cached-drive-token" },
    loadJson: async (url, options) => {
        autoDriveCalls.push({ url, options });
        return { template_copies: [{ templateId: "use-of-tools-and-techniques", templateTitle: "Use of Tools & Techniques" }] };
    },
    buildTaskListHeaders: (headers) => headers,
    encodeURIComponent,
    Date
});
vm.runInContext(taskList.slice(autoDriveSyncStart, autoDriveSyncEnd), autoDriveContext);
async function runAutoDriveSyncRegression() {
    const discoveredCopies = await autoDriveContext.autoSyncToolsAndTechniquesTemplateCopy(
        "activity-1", "student@example.test", []
    );
    assert.equal(autoDriveCalls.length, 1, "A cached Drive token triggers one quiet folder scan");
    assert.equal(autoDriveCalls[0].options.method, "POST");
    assert.equal(JSON.parse(autoDriveCalls[0].options.body).driveAccessToken, "cached-drive-token");
    assert.equal(discoveredCopies[0].templateId, "use-of-tools-and-techniques");
    await autoDriveContext.autoSyncToolsAndTechniquesTemplateCopy("activity-1", "student@example.test", []);
    assert.equal(autoDriveCalls.length, 1, "Repeated task loads respect the Drive scan cooldown");
    await autoDriveContext.autoSyncToolsAndTechniquesTemplateCopy("activity-1", "student@example.test", discoveredCopies);
    assert.equal(autoDriveCalls.length, 1, "Existing Use of Tools & Techniques copy records avoid another Drive scan");

    const noTokenCalls = [];
    const noTokenContext = vm.createContext({
        window: { getActiveHubDriveAccessToken: () => "" },
        loadJson: async (...args) => { noTokenCalls.push(args); },
        buildTaskListHeaders: (headers) => headers,
        encodeURIComponent,
        Date
    });
    vm.runInContext(taskList.slice(autoDriveSyncStart, autoDriveSyncEnd), noTokenContext);
    await noTokenContext.autoSyncToolsAndTechniquesTemplateCopy("activity-2", "student@example.test", []);
    assert.equal(noTokenCalls.length, 0, "Auto-discovery never prompts or calls Drive without a cached token");
}

const useToolsCriterionTexts = {
    "91893": "Achieved: Using appropriate tools and techniques for the purpose and end users.",
    "91903": "Achieved: Applying appropriate tools and techniques to meet the purpose and end-user requirements."
};
const useToolsState = {};
const useToolsTaskState = { selectedId: "activity-1" };
const useToolsContext = vm.createContext({
    DIGIMED_TOOLS_TECHNIQUES_EVIDENCE_STANDARD: "digimed-tools-techniques",
    DIGIMED_TOOLS_TECHNIQUES_SUBTASKS: ["one", "two", "three", "four"],
    DIGIMED_L3_TOOLS_TECHNIQUES_SUBTASKS: ["one", "two", "three", "four", "five", "six", "seven"],
    taskListState: useToolsTaskState,
    getTaskListEmail: () => "student@example.test",
    readDigiMedToolsTechniquesState: () => useToolsState,
    stripStepLevel: (text) => String(text || "").replace(/^(Achieved|Merit|Excellence):\s*/i, "").trim(),
    getStepLevel: (text) => String(text || "").split(":")[0].trim(),
    isUXPrinciplesRequirementStep: () => false,
    isWebConventionsRequirementStep: () => false,
    isTestingFunctionsRequirementStep: () => false,
    isWebIntegrityRequirementStep: () => false,
    isWebIntegrityRequirementStep: () => false,
    isTriallingComponentsRequirementStep: () => false
});
const useToolsStart = taskList.indexOf("function isUseOfToolsTechniquesRequirementStep(");
const useToolsAutoStart = taskList.indexOf("function getStepAutoManagementKind(", useToolsStart);
const useToolsAutoEnd = taskList.indexOf("\nfunction getSessionTickKey", useToolsAutoStart);
assert.ok(useToolsStart >= 0 && useToolsAutoStart > useToolsStart && useToolsAutoEnd > useToolsAutoStart,
    "Use of Tools & Techniques requirement helpers are present");
vm.runInContext(taskList.slice(useToolsStart, useToolsAutoStart) + "\n" + taskList.slice(useToolsAutoStart, useToolsAutoEnd), useToolsContext);
for (const standard of ["91893", "91903"]) {
    const rows = [{ text: useToolsCriterionTexts[standard], done: false }];
    const state = { [standard]: rows };
    useToolsState.one = true;
    useToolsState.two = true;
    delete useToolsState.three;
    assert.equal(useToolsContext.autoTickUseOfToolsTechniquesRequirement(state, [{ templateId: "use-of-tools-and-techniques" }]), false,
        `${standard} remains unticked with only two detected subtasks`);
    useToolsState.three = true;
    assert.equal(useToolsContext.autoTickUseOfToolsTechniquesRequirement(state, []), false,
        `${standard} remains unticked until the template is used`);
    assert.equal(useToolsContext.autoTickUseOfToolsTechniquesRequirement(state, [{ templateId: "use-of-tools-and-techniques" }]), true,
        `${standard} ticks after three subtasks and template use`);
    assert.equal(rows[0].done, true);
    delete useToolsState.three;
    assert.equal(useToolsContext.autoTickUseOfToolsTechniquesRequirement(state, [{ templateId: "use-of-tools-and-techniques" }]), true,
        `${standard} clears when fewer than three subtasks remain checked`);
    assert.equal(rows[0].done, false);
    assert.equal(useToolsContext.getStepAutoManagementKind(standard, useToolsCriterionTexts[standard]), "auto",
        `${standard} cannot use a manual criterion tick`);
}

const triallingCriterion = "Achieved: Trial the components of the digital technologies outcome.";
const triallingChecklistState = { "91907": [{ text: triallingCriterion, done: false }] };
const triallingStart = taskList.indexOf("function isTriallingComponentsRequirementStep(");
const triallingEnd = taskList.indexOf("\nfunction isEfficientToolsMainStep", triallingStart);
assert.ok(triallingStart >= 0 && triallingEnd > triallingStart,
    "Trialling Components criterion auto-tick helpers are present");
const triallingContext = vm.createContext({
    getStepLevel: (text) => String(text || "").split(":")[0].trim(),
    stripStepLevel: (text) => String(text || "").replace(/^(Achieved|Merit|Excellence):\s*/i, "").trim(),
    isUXPrinciplesRequirementStep: () => false,
    isWebConventionsRequirementStep: () => false,
    isTestingFunctionsRequirementStep: () => false,
    isWebIntegrityRequirementStep: () => false,
    isUseOfToolsTechniquesRequirementStep: () => false
});
const triallingManagementStart = taskList.indexOf("function getStepAutoManagementKind(");
const triallingManagementEnd = taskList.indexOf("\nfunction getSessionTickKey", triallingManagementStart);
assert.ok(triallingManagementStart >= 0 && triallingManagementEnd > triallingManagementStart,
    "Task List criterion auto-management classifier is present");
vm.runInContext([
    taskList.slice(triallingStart, triallingEnd),
    taskList.slice(triallingManagementStart, triallingManagementEnd)
].join("\n"), triallingContext);
assert.equal(triallingContext.getStepAutoManagementKind("91907", triallingCriterion), "auto",
    "The Level 3 Trialling Components criterion is automatically managed from slide content");
assert.equal(triallingContext.autoTickTriallingComponentsRequirement(triallingChecklistState, 4), true,
    "A non-empty Trialling Components slideshow ticks the Achieved criterion");
assert.equal(triallingChecklistState["91907"][0].done, true);
assert.equal(triallingContext.autoTickTriallingComponentsRequirement(triallingChecklistState, 0), true,
    "An empty Trialling Components slideshow clears the Achieved criterion");
assert.equal(triallingChecklistState["91907"][0].done, false);

const libraryDedupeStart = script.indexOf("function dedupeTaskTopicLibraryItems(");
const libraryDedupeEnd = script.indexOf("\nasync function loadSharedLessons", libraryDedupeStart);
assert.ok(libraryDedupeStart >= 0 && libraryDedupeEnd > libraryDedupeStart,
    "Homepage Task Topic deduplication helper is present");
const libraryContext = vm.createContext({});
vm.runInContext(script.slice(libraryDedupeStart, libraryDedupeEnd), libraryContext);
const repeatedTopic = { standardNumber: "91897", taskTopicText: "Trialling multiple components and/or techniques" };
const uniqueLibraryTopics = libraryContext.dedupeTaskTopicLibraryItems([
    { ...repeatedTopic, id: "activity-1" },
    { ...repeatedTopic, taskTopicText: "  TRIALling multiple components\nand/or techniques ", id: "activity-2" },
    { ...repeatedTopic, taskTopicText: "Trial the components of the outcome", id: "activity-3" },
    { ...repeatedTopic, standardNumber: "91907", id: "activity-4" },
    { taskTopicText: repeatedTopic.taskTopicText, id: "activity-5" },
    { taskTopicText: repeatedTopic.taskTopicText, id: "activity-6" }
]);
assert.deepEqual(
    JSON.parse(JSON.stringify(uniqueLibraryTopics.map((item) => item.id))),
    ["activity-1", "activity-3", "activity-4", "activity-5", "activity-6"],
    "Homepage Library removes repeated standard/topic cards while preserving distinct topics and unnumbered cards"
);
assert.match(taskList, /loadJson\("\/api\/my-allocations\?view=task-list"/,
    "Senior and Middle Task Lists continue to load assigned records independently of the homepage Library");

const allocationFilterStart = server.indexOf("function filterStudentTaskListActivities(");
const allocationFilterEnd = server.indexOf("\nfunction normalizeUnitLessons", allocationFilterStart);
assert.ok(allocationFilterStart >= 0 && allocationFilterEnd > allocationFilterStart,
    "Student Task List activity visibility filter is present");
const allocationFilterContext = vm.createContext({
    filterDtechActivities: (rows) => rows.filter((row) => row.isDtech !== false)
});
vm.runInContext(server.slice(allocationFilterStart, allocationFilterEnd), allocationFilterContext);
assert.deepEqual(
    JSON.parse(JSON.stringify(allocationFilterContext.filterStudentTaskListActivities([
        { id: "49", isDtech: true },
        { id: "50", isDtech: false },
        { id: "51", isDtech: true }
    ]).map((item) => item.id))),
    ["49", "51"],
    "Student Task List retains Client Projects and filters non-DTECH activities"
);
assert.match(server, /\(\$3::boolean = FALSE OR a\.id::text = \$4::text OR COALESCE\(v\.is_visible, TRUE\) = TRUE\)[\s\S]*?\[email, DTECH_HUB_NAME, taskListView, CLIENT_PROJECTS_TASK_ID\]/,
    "Task List allocations respect homepage visibility while preserving Client Projects");
assert.match(server, /taskListView \? filterStudentTaskListActivities\(result\.rows\) : result\.rows/,
    "The Task List applies DTECH activity filtering without deleting allocation records");
assert.match(script, /\.filter\(\(item\) => String\(item\?\.id \|\| ""\)\.trim\(\) !== "49"\)/,
    "Client Projects remains hidden from the homepage Library");

const slideMatcherStart = server.indexOf("function findBestStudentTaskTopicSlide(");
const slideMatcherEnd = server.indexOf('\napp.post("/api/student/drive-setup/find-slide"', slideMatcherStart);
assert.ok(slideMatcherStart >= 0 && slideMatcherEnd > slideMatcherStart,
    "Student slide matching helper is present");
const slideMatcherContext = vm.createContext({});
vm.runInContext(server.slice(slideMatcherStart, slideMatcherEnd), slideMatcherContext);
const matchingSlides = [
    { name: "Relevant Implications - Tyler", modifiedTime: "2026-10-13T12:00:00Z" },
    { name: "Tools & Techniques - Tyler", modifiedTime: "2026-10-12T12:00:00Z" }
];
assert.equal(
    slideMatcherContext.findBestStudentTaskTopicSlide(matchingSlides, "Tools & Techniques")?.name,
    "Tools & Techniques - Tyler",
    "Tools & Techniques queries select the student's matching slideshow over unrelated development slides"
);
assert.equal(
    slideMatcherContext.findBestStudentTaskTopicSlide([{ name: "Relevant Implications - Tyler" }], "Tools & Techniques"),
    null,
    "Tools & Techniques queries do not silently select an unrelated slideshow"
);
assert.match(server, /if \(fallback && !hasTemplateUrl\)/,
    "Template defaults are restored when a synced entry has only a preview but no Slides link");
assert.match(templateLibrary, /id: "tools-and-techniques",\s*title: "Tools & Techniques"[\s\S]*?status: "live"/,
    "The Template Library fallback includes an openable Tools & Techniques template");
const templateCopyMatcherStart = templateLibrary.indexOf("function matchesExistingTemplateCopyFile(");
const templateCopyMatcherEnd = templateLibrary.indexOf("\nfunction renderTemplateCard", templateCopyMatcherStart);
assert.ok(templateCopyMatcherStart >= 0 && templateCopyMatcherEnd > templateCopyMatcherStart,
    "Template Library distinguishes student Tools & Techniques slides from template copies");
const templateCopyContext = vm.createContext({});
vm.runInContext(templateLibrary.slice(templateCopyMatcherStart, templateCopyMatcherEnd), templateCopyContext);
assert.equal(
    templateCopyContext.matchesExistingTemplateCopyFile("tools-and-techniques", "Tools & Techniques", "Tools & Techniques", "tyler@westlandhigh.school.nz"),
    false,
    "A self-authored Tools & Techniques slideshow does not hide the Use Template action"
);
assert.equal(
    templateCopyContext.matchesExistingTemplateCopyFile("tools-and-techniques", "Tools & Techniques", "Tools & Techniques - Tyler", "tyler@westlandhigh.school.nz"),
    true,
    "A generated Tools & Techniques copy still opens as the student's existing copy"
);
const templateSearchStart = templateLibrary.indexOf("function normalizeTemplateSearchText(");
const templateSearchEnd = templateLibrary.indexOf("\nasync function loadProcessAssessmentFiles", templateSearchStart);
assert.ok(templateSearchStart >= 0 && templateSearchEnd > templateSearchStart,
    "Template search normalization helpers are present");
const templateSearchContext = vm.createContext({});
vm.runInContext(templateLibrary.slice(templateSearchStart, templateSearchEnd), templateSearchContext);
assert.equal(templateSearchContext.matchesTemplateSearch({
    title: "User Experience (UX) Principles",
    criteriaText: "Apply user experience principles relevant to the outcome."
}, "UX Principles (Web)"), true,
"A media-tagged UX Principles query finds the User Experience (UX) Principles template");
const templateIdentityStart = server.indexOf("const TEMPLATE_ID_FROM_TITLE_PATTERNS = [");
const templateIdentityEnd = server.indexOf("\n// POST /api/activities/:id/sync-drive-templates", templateIdentityStart);
assert.ok(templateIdentityStart >= 0 && templateIdentityEnd > templateIdentityStart,
    "Student Drive template title inference is present");
const templateIdentityContext = vm.createContext({});
vm.runInContext(server.slice(templateIdentityStart, templateIdentityEnd), templateIdentityContext);
assert.equal(
    templateIdentityContext.inferTemplateCopyFromFileName("Tyler - Tools & Techniques").templateId,
    "tools-and-techniques",
    "Drive sync recognizes student-owned Tools & Techniques decks with a name prefix"
);
assert.equal(
    templateIdentityContext.inferTemplateCopyFromFileName("Use of Tools & Techniques - Tyler").templateId,
    "use-of-tools-and-techniques",
    "Drive sync recognizes Use of Tools & Techniques decks separately from Tools & Techniques"
);
assert.equal(
    templateIdentityContext.inferTemplateCopyFromFileName("Tools & Techniques").templateId,
    "tools-and-techniques",
    "The Digital Outcome Tools & Techniques template identity is unchanged"
);
assert.equal(
    templateIdentityContext.inferTemplateCopyFromFileName("Markup Validation - Otto").templateId,
    "testing-functions-markup-validation",
    "Drive scan recognizes personal Integrity & Validation Web slides"
);
assert.equal(
    templateIdentityContext.inferTemplateCopyFromFileName("Markup Validation - Otto").templateId,
    "testing-functions-markup-validation",
    "Drive scans recognize the personal Integrity & Validation Web slide"
);
assert.equal(
    templateIdentityContext.inferTemplateCopyFromFileName("Conventions - Sierra").templateId,
    "relevant-digimed-conventions",
    "Drive sync recognizes personal Conventions slides with a student-name suffix"
);
assert.ok(server.includes('id: "use-of-tools-and-techniques"') && server.includes("use\\s+of\\s+tools?"),
    "Template Library sync gives Use of Tools & Techniques its own canonical identity");
assert.ok(taskList.includes('"use-of-tools-and-techniques"') && taskList.includes("Using Tools & Techniques ("),
    "Task List links the 91893/91903 appropriate-tools row to the media-type Use of Tools & Techniques page");
const endUserImplicationsCopy = templateIdentityContext.inferTemplateCopyFromFileName(
    "Relevant Implications - End-User Considerations - Otto"
);
assert.equal(endUserImplicationsCopy.templateId, "relevant-implications-end-user-considerations",
    "Drive sync keeps the hyphen inside End-User Considerations when identifying its template");
assert.equal(endUserImplicationsCopy.templateTitle, "Relevant Implications - End-User Considerations",
    "The recorded copy title matches the Task List category used for auto-ticking");
const slideSetCopies = templateIdentityContext.inferTemplateCopiesFromSlideSet({
    slides: [
        { pageElements: [{ shape: { text: { textElements: [{ textRun: { content: "Digital Outcome Description\nDescribe your outcome" } }] } } }] },
        { pageElements: [{ shape: { text: { textElements: [{ textRun: { content: "Tools & Techniques\nList tools used" } }] } } }] },
        { pageElements: [{ shape: { text: { textElements: [{ textRun: { content: "Relevant Implications - End-User Considerations\nEnd-user needs" } }] } } }] },
        { pageElements: [{ shape: { text: { textElements: [{ textRun: { content: "Untitled worksheet" } }] } } }] }
    ]
}, "https://docs.google.com/presentation/d/full-set-id/edit", "Web & Processing standard Checklist");
assert.deepEqual(
    JSON.parse(JSON.stringify(slideSetCopies.map((copy) => copy.templateId))),
    ["digital-outcome-description", "tools-and-techniques", "relevant-implications-end-user-considerations"],
    "A combined slide set records only recognized task sections"
);
assert.ok(slideSetCopies.every((copy) => copy.fileUrl.includes("full-set-id")),
    "Each recognized slide section points back to the supplied full-set deck");
assert.match(server, /app\.post\("\/api\/activities\/:id\/sync-slide-set"/,
    "The Task List full slide-set sync endpoint is registered");
assert.match(server, /testing_functions_counts:[\s\S]*functionalCount: testingFunctionsCounts\.functionalTesting\.length[\s\S]*userCount: testingFunctionsCounts\.userTesting\.length/,
    "Full slide-set sync returns Testing Functions table counts when that section is present");
assert.match(taskList, /#task-list-sync-slide-set[\s\S]*sync-slide-set/,
    "The Task List link control calls the full slide-set sync endpoint");
assert.match(taskList, /TESTING_FUNCTIONS_COUNT\|\$\{functionalCount\}\|\$\{userCount\}/,
    "Task List saves full slide-set Testing Functions counts for the normal auto-tick path");
assert.match(html, /id="task-list-slide-set-url"/,
    "The Task List provides a full slide-set URL field");
assert.match(server, /templateId: "assessment-full-slide-set"[\s\S]*?templateTitle: "Full Assessment Slide Set"/,
    "Full slide-set sync stores the source deck separately from its recognized task sections");
assert.match(taskList, /renderSavedFullSlideSet\(taskListState\.templateCopies\)/,
    "Task List reloads the saved full slide set for the selected activity");
const savedSetHelperStart = taskList.indexOf("function renderSavedFullSlideSet(");
const savedSetHelperEnd = taskList.indexOf("\nasync function fetchMyEvidence", savedSetHelperStart);
assert.ok(savedSetHelperStart >= 0 && savedSetHelperEnd > savedSetHelperStart,
    "Saved full slide-set rendering helper is present");
const savedSetElements = {
    input: { value: "" },
    saved: { innerHTML: "", hidden: true },
    button: { textContent: "" }
};
const savedSetContext = vm.createContext({
    document: {
        querySelector(selector) {
            return {
                "#task-list-slide-set-url": savedSetElements.input,
                "#task-list-slide-set-saved": savedSetElements.saved,
                "#task-list-sync-slide-set": savedSetElements.button
            }[selector] || null;
        }
    },
    escapeTaskListHtml: (value) => String(value || "")
});
vm.runInContext(taskList.slice(savedSetHelperStart, savedSetHelperEnd), savedSetContext);
savedSetContext.renderSavedFullSlideSet([{
    templateId: "assessment-full-slide-set",
    templateTitle: "Full Assessment Slide Set",
    fileName: "Web & Processing standard Checklist",
    fileUrl: "https://docs.google.com/presentation/d/full-set-id/edit"
}]);
assert.equal(savedSetElements.input.value, "https://docs.google.com/presentation/d/full-set-id/edit");
assert.equal(savedSetElements.button.textContent, "Sync saved slide set");
assert.equal(savedSetElements.saved.hidden, false);
assert.match(savedSetElements.saved.innerHTML, /data-slide-set-use/);
assert.match(savedSetElements.saved.innerHTML, />Open</);
assert.match(savedSetElements.saved.innerHTML, /data-slide-set-delete/);
assert.match(taskList, /templateId: "assessment-full-slide-set"/,
    "Delete targets only the Task List saved-link record");
assert.doesNotMatch(taskList, /driveDeleteFile|DELETE.*drive\.googleapis/i,
    "Deleting a saved slide-set link never deletes its Google Slides file");

const digitalOutcomeRows = [
    { text: "Describe the digital outcome" },
    { text: "Identify the target audience" },
    { text: "State how success will be measured or evaluated.", done: true },
    { text: "Identify Tools and Techniques for this outcome.", done: true },
    { text: "What Tools and Techniques will be used?", done: true }
];
assert.deepEqual(
    JSON.parse(JSON.stringify(context.getMiddleDtechChecklistRows("digital-outcome", digitalOutcomeRows))),
    digitalOutcomeRows.slice(0, 2),
    "MiddleDTECH hides success criteria and the separate tools prompt without deleting saved rows"
);

const projectRows = [
    { text: "Achieved: Use appropriate project management tools and techniques to plan development." },
    { text: "Achieved: Decompose the outcome into smaller components." },
    { text: "Achieved: Trial the components of the digital technologies outcome." },
    { text: "Achieved: Test that the digital technologies outcome functions as intended." },
    { text: "Achieved: Explain relevant implications." },
    { text: "Merit: Trial multiple components and/or techniques." }
];
assert.deepEqual(
    JSON.parse(JSON.stringify(context.getMiddleDtechChecklistRows("91897", projectRows))),
    projectRows.slice(0, 4),
    "MiddleDTECH includes only the planning, decomposition, trialling and testing items"
);

const mediaRows = [
    { text: "Achieved: Using appropriate tools and techniques for the purpose and end users.", done: true },
    { text: "Excellence: Using efficient tools and techniques in the outcome's production." },
    { text: "Excellence: Iterative improvement throughout the design and development process." }
];
assert.deepEqual(
    JSON.parse(JSON.stringify(context.getMiddleDtechChecklistRows("91893", mediaRows))),
    mediaRows.slice(0, 2),
    "MiddleDTECH includes appropriate tools above efficient tools, preserving their saved ticks"
);
const level3MediaRows = [
    { text: "Achieved: Applying appropriate tools and techniques to meet the purpose and end-user requirements.", done: true },
    ...mediaRows.slice(1)
];
assert.deepEqual(
    JSON.parse(JSON.stringify(context.getMiddleDtechChecklistRows("91903", level3MediaRows))),
    level3MediaRows.slice(0, 2),
    "The equivalent Level 3 tools criterion is retained too"
);
assert.deepEqual(
    JSON.parse(JSON.stringify(context.getMiddleDtechChecklistRows("unrelated-standard", projectRows))),
    [],
    "Unselected SeniorDTECH criteria are omitted"
);

assert.match(taskList, /taskListState\.course === "MiddleDTECH"[\s\S]*getMiddleDtechChecklistRows/);
assert.match(taskList, /\/api\/student\/mdtech-project-folder/);
assert.match(html, /Set up MDTECH Project folder/);
assert.match(html, /WHS-DTECH \/ MiddleDTECH \/ MDTECH Project/);
assert.match(server, /app\.get\("\/api\/student\/mdtech-project-folder"/);
assert.match(server, /app\.post\("\/api\/student\/mdtech-project-folder"/);
assert.match(server, /mdtech_project_folder_id/);
assert.match(server, /getStudentTaskListDriveFolder\(email\)/);
assert.match(script, /"JuniorDTECH", "MiddleDTECH", "SeniorDTECH"/);
assert.match(taskList, /setStatus\(taskListState\.course === "MiddleDTECH"\s*\? `Year Group: \$\{yearGroup\} \| Course Type: \$\{courseType\}`/);
assert.match(taskList, /isMiddleDtech \? "" : `<h4>\$\{level\}<\/h4>`/);
assert.match(taskList, /isMiddleDtech \? "" : `<h4>\$\{escapeTaskListHtml\(level\)\}<\/h4>`/);
assert.match(taskList, /level === "Excellence" && !isMiddleDtech/);

const checklistHost = { innerHTML: "" };
const renderState = {
    course: "MiddleDTECH",
    checklistStandards: ["digital-outcome", "91897", "91907", "91893", "91903"],
    checklistState: {},
    allItems: [],
    sessionTicks: {}
};
const renderContext = vm.createContext({
    taskListState: renderState,
    document: { querySelector: () => checklistHost },
    installTaskListSectionAnchorHandler() {},
    installDigiMedEfficientToolsHandler() {},
    installDigiMedToolsTechniquesHandler() {},
    getTopicTypeLabel: () => "",
    inferStudentSystemConnections: () => ({}),
    getMiddleDtechChecklistRows: context.getMiddleDtechChecklistRows,
    escapeTaskListHtml: (value) => String(value),
    readDecompositionCategoryCoverage: () => ({}),
    readDigiMedEfficientToolsState: () => ({}),
    readGithubRepoAnalysis: () => ({}),
    readDigiMedToolsTechniquesState: () => ({}),
    getTaskListEmail: () => "student@westlandhigh.school.nz",
    DIGIMED_L3_TOOLS_TECHNIQUES_SUBTASKS: [],
    DIGIMED_TOOLS_TECHNIQUES_SUBTASKS: [],
    TASK_LIST_MERIT_TRELLO_NOTE: "Merit evidence note",
    TASK_LIST_EXCELLENCE_TRELLO_NOTE: "Excellence evidence note"
});
const renderStart = taskList.indexOf("function renderChecklistCards(");
const renderEnd = taskList.indexOf("function getStandardCodes(", renderStart);
vm.runInContext(taskList.slice(renderStart, renderEnd), renderContext);
Object.assign(renderContext, {
    getStepLevel: context.getStepLevel,
    stripStepLevel: context.stripStepLevel,
    getTaskTopicHrefForStep: () => "/tools",
    isInformationalCriteriaRow: () => false,
    getStepAutoManagementKind: () => "auto",
    isUseOfToolsTechniquesRequirementStep: () => true,
    isWebConventionsRequirementStep: () => false,
    isUXPrinciplesRequirementStep: () => false,
    isWebIntegrityRequirementStep: () => false,
    buildCustomActivityLink: () => "/tools",
    getSessionTickKey: (standard, index) => `${standard}:${index}`,
    DIGIMED_EFFICIENT_TOOLS_SUBTASKS: ["Using stylesheets"],
    DIGIMED_TOOLS_TECHNIQUES_SUBTASKS: ["Creating scripts"],
    readDigiMedToolsTechniquesState: () => ({ "Creating scripts": true }),
    readDigiMedEfficientToolsState: () => ({ "Using stylesheets": true })
});
const storedMediaRows = [
    { text: "Achieved: Applying appropriate data integrity and testing procedures.", done: false },
    ...mediaRows
];
renderState.checklistState = { "digital-outcome": digitalOutcomeRows, "91893": storedMediaRows };
const storedStateBeforeRender = JSON.stringify(renderState.checklistState);
renderContext.renderChecklistCards({ name: "My Project" }, []);
assert.ok(checklistHost.innerHTML.indexOf("Using appropriate tools and techniques") <
    checklistHost.innerHTML.indexOf("Using efficient tools and techniques"), "Appropriate tools render above efficient tools in Digital Media");
assert.match(checklistHost.innerHTML, /data-digimed-tools-technique="Creating scripts" checked/);
assert.match(checklistHost.innerHTML, /data-digimed-efficient-tool="Using stylesheets" checked/);
assert.match(checklistHost.innerHTML, /checked[^>]+data-step-check="91893:1"/,
    "The moved tools criterion retains its checked state and original storage index");
assert.doesNotMatch(checklistHost.innerHTML, /State how success will be measured|Identify Tools and Techniques for this outcome|Section 1: Digital Media/);
assert.equal(JSON.stringify(renderState.checklistState), storedStateBeforeRender, "Presentation changes never delete saved checklist rows");
renderState.checklistState = {};
renderContext.renderChecklistCards({ name: "My Project" }, []);
assert.match(checklistHost.innerHTML, /Project Development/);
assert.match(checklistHost.innerHTML, /Digital Media/);
assert.match(checklistHost.innerHTML, /Digital Outcome Topic/);
assert.doesNotMatch(checklistHost.innerHTML, /Standard \d{5}|Achieved|Merit|Excellence/,
    "MiddleDTECH uses descriptive headings without standard numbers or achievement labels");
renderState.course = "SeniorDTECH";
renderContext.renderChecklistCards({ name: "My Project" }, []);
assert.match(checklistHost.innerHTML, /Standard 91897/);
assert.match(checklistHost.innerHTML, /Standard 91893/);
for (const level of ["Achieved", "Merit", "Excellence"]) {
    assert.ok(checklistHost.innerHTML.includes(`<h4>${level}</h4>`),
        `SeniorDTECH keeps its ${level} heading`);
}

assert.match(templateLibrary, /const setupUrl = isMiddleDtech \? "\/api\/student\/mdtech-project-folder"/);
assert.match(templateLibrary, /driveState\.setupState\?\.confirmed && destination\.folderId/);
assert.match(templateLibrary, /Saved to \$\{escapeHtml\(destination\.folderName\)\}\./);

const destinationHelperStart = templateLibrary.indexOf("function getTemplateDestination(");
const destinationHelperEnd = templateLibrary.indexOf("\nfunction normalizeTemplateLibraryEntries", destinationHelperStart);
assert.ok(destinationHelperStart >= 0 && destinationHelperEnd > destinationHelperStart,
    "Template library course-folder resolver is present");
const destinationContext = vm.createContext({ driveState: { setupState: null } });
vm.runInContext(templateLibrary.slice(destinationHelperStart, destinationHelperEnd), destinationContext);
const middleDestination = destinationContext.getTemplateDestination({
    taskListCourse: "MiddleDTECH",
    mdtechProjectFolderId: "middle-project-id",
    mdtechProjectFolderUrl: "https://drive.google.com/drive/folders/middle-project-id"
});
assert.equal(middleDestination.folderId, "middle-project-id");
assert.equal(middleDestination.folderName, "MDTECH Project");
const seniorDestination = destinationContext.getTemplateDestination({
    taskListCourse: "SeniorDTECH",
    processAssessmentFolderId: "senior-process-id"
});
assert.equal(seniorDestination.folderId, "senior-process-id");
assert.equal(seniorDestination.folderName, "Process Assessment");

{
    const helperStart = teacherStudentWork.indexOf("function getProcessFolderUrlFromTemplateCopies(");
    const helperEnd = teacherStudentWork.indexOf("\nfunction getDigitalOutcomeTemplateId", helperStart);
    assert.ok(helperStart >= 0 && helperEnd > helperStart, "Teacher process-folder helper is present");
    const helperContext = vm.createContext({ toSafeExternalUrl: (value) => /^https:\/\//.test(String(value || "")) ? String(value) : "" });
    vm.runInContext(teacherStudentWork.slice(helperStart, helperEnd), helperContext);
    assert.equal(helperContext.getProcessFolderUrlFromTemplateCopies([
        { copiedAt: "2026-09-01T00:00:00Z", processAssessmentFolderUrl: "https://drive.google.com/drive/folders/old-process" },
        { copiedAt: "2026-10-20T00:00:00Z", processAssessmentFolderUrl: "https://drive.google.com/drive/folders/mdtech-project" }
    ]), "https://drive.google.com/drive/folders/mdtech-project", "Teacher link follows the folder of the latest copied slide");
    assert.match(teacherStudentWork,
        /const processFolderUrl = getProcessFolderUrlFromTemplateCopies\([^)]*\)\s*\|\| toSafeExternalUrl\(student\?\.process_assessment_folder_url/,
        "Where slides were actually copied wins over the stored Process Assessment setup (MiddleDTECH uses MDTECH Project)");
}

{
    const courseStart = teacherStudentWork.indexOf("function getCourseFromYearLevel(");
    const courseEnd = teacherStudentWork.indexOf("\nfunction renderStudentNameOptions", courseStart);
    assert.ok(courseStart >= 0 && courseEnd > courseStart, "Teacher course filter helpers are present");
    const courseContext = vm.createContext({
        normalizeEmail: (value) => String(value || "").trim().toLowerCase(),
        workState: { studentCourseFilter: "", studentCourseByEmail: new Map() }
    });
    vm.runInContext(teacherStudentWork.slice(courseStart, courseEnd), courseContext);
    const courseMap = courseContext.buildStudentCourseMap([
        { year_level: "10", linked_emails: ["B_Provis@school.nz"] },
        { year_level: "Year 12", linked_emails: ["senior@school.nz"] },
        { year_level: "8", linked_emails: ["junior@school.nz"] }
    ]);
    assert.equal(courseMap.get("b_provis@school.nz"), "MiddleDTECH");
    assert.equal(courseMap.get("senior@school.nz"), "SeniorDTECH");
    assert.equal(courseMap.has("junior@school.nz"), false);
    courseContext.workState.studentCourseByEmail = courseMap;
    courseContext.workState.studentCourseFilter = "MiddleDTECH";
    assert.equal(courseContext.studentMatchesCourseFilter({ studentEmail: "b_provis@school.nz" }), true);
    assert.equal(courseContext.studentMatchesCourseFilter({ studentEmail: "senior@school.nz" }), false);
    courseContext.workState.studentCourseFilter = "";
    assert.equal(courseContext.studentMatchesCourseFilter({ studentEmail: "unknown@school.nz" }), true, "All courses shows everyone");
    const workHtml = fs.readFileSync(path.join(root, "teacher-student-work.html"), "utf8");
    assert.match(workHtml, /id="student-course-filter"[\s\S]*?value="SeniorDTECH"[\s\S]*?value="MiddleDTECH"/);
    assert.equal((workHtml.match(/list="student-name-options"/g) || []).length, 3, "All three name boxes offer the student list and still accept typing");
    assert.equal((teacherStudentWork.match(/studentMatchesCourseFilter\(student\)|\.filter\(studentMatchesCourseFilter\)/g) || []).length >= 3, true,
        "Course filter applies to Process, Digital Media and comments tables");
}

async function runFolderRouteRegression() {
    const folderHelperStart = server.indexOf("async function getStudentTaskListDriveFolder(email)");
    const folderHelperEnd = server.indexOf('app.get("/api/template-library"', folderHelperStart);
    assert.ok(folderHelperStart >= 0 && folderHelperEnd > folderHelperStart, "Task List Drive folder resolver is present");
    let resolvedProgramme = "MiddleDTECH";
    const folderContext = vm.createContext({
        getStudentProgrammeFolder: async () => resolvedProgramme,
        getStudentDriveSetup: async () => ({
            mdtechProjectFolderId: "middle-project-id",
            processAssessmentFolderId: "senior-process-id"
        })
    });
    vm.runInContext(server.slice(folderHelperStart, folderHelperEnd), folderContext);
    const middleFolder = await folderContext.getStudentTaskListDriveFolder("student@westlandhigh.school.nz");
    assert.equal(middleFolder.folderId, "middle-project-id");
    assert.equal(middleFolder.folderName, "MDTECH Project");
    resolvedProgramme = "SeniorDTECH";
    const seniorFolder = await folderContext.getStudentTaskListDriveFolder("student@westlandhigh.school.nz");
    assert.equal(seniorFolder.folderId, "senior-process-id");
    assert.equal(seniorFolder.folderName, "Process Assessment", "SeniorDTECH continues using its existing folder");

    const routeStart = server.indexOf('app.get("/api/student/mdtech-project-folder"');
    const routeEnd = server.indexOf('app.get("/api/student/drive-setup"', routeStart);
    assert.ok(routeStart >= 0 && routeEnd > routeStart, "MiddleDTECH folder routes are grouped");

    const routes = {};
    const createdFolders = [];
    let savedFolderId = "";
    let programmeFolder = "MiddleDTECH";
    let driveIdentity = { email: "student@westlandhigh.school.nz", email_verified: true };
    const routeContext = vm.createContext({
        app: {
            get: (url, handler) => { routes[`GET ${url}`] = handler; },
            post: (url, handler) => { routes[`POST ${url}`] = handler; }
        },
        SCHOOL_EMAIL_DOMAIN: "westlandhigh.school.nz",
        normalizeEmail: (value) => String(value || "").trim().toLowerCase(),
        getRequestUserEmail: (request) => request.email,
        getStudentProgrammeFolder: async () => programmeFolder,
        getStudentDriveSetup: async () => ({ mdtechProjectFolderId: savedFolderId }),
        buildDriveFolderUrlFromId: (id) => `https://drive.google.com/drive/folders/${id}`,
        getStudentLoginDriveSetup: async () => ({ folder_id: "whs-root" }),
        driveGetLiveFile: async (id) => ({ id }),
        driveEnsureFolder: async (parentId, name) => {
            createdFolders.push([parentId, name]);
            return { id: name === "MiddleDTECH" ? "middle-folder" : "mdtech-project", webViewLink: `https://drive.google.com/drive/folders/${name}` };
        },
        saveStudentMdtechProjectFolder: async (_email, id) => { savedFolderId = id; },
        fetch: async () => ({ ok: true, json: async () => driveIdentity }),
        console: { error() {} }
    });
    vm.runInContext(server.slice(routeStart, routeEnd), routeContext);

    const makeResponse = () => ({
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; }
    });
    const statusResponse = makeResponse();
    await routes["GET /api/student/mdtech-project-folder"]({ email: "student@westlandhigh.school.nz" }, statusResponse);
    assert.equal(statusResponse.body.ready, false, "Folder setup is required until a folder is saved");

    const createdResponse = makeResponse();
    await routes["POST /api/student/mdtech-project-folder"]({
        email: "student@westlandhigh.school.nz",
        body: { driveAccessToken: "valid-token" }
    }, createdResponse);
    assert.equal(createdResponse.body.ready, true);
    assert.equal(savedFolderId, "mdtech-project");
    assert.deepEqual(createdFolders, [["whs-root", "MiddleDTECH"], ["middle-folder", "MDTECH Project"]],
        "Folder setup reuses the WHS-DTECH root and nests the project folder under MiddleDTECH");

    const wrongCourseResponse = makeResponse();
    programmeFolder = "SeniorDTECH";
    await routes["POST /api/student/mdtech-project-folder"]({
        email: "student@westlandhigh.school.nz",
        body: { driveAccessToken: "valid-token" }
    }, wrongCourseResponse);
    assert.equal(wrongCourseResponse.statusCode, 403, "Senior students cannot create the MiddleDTECH folder");

    const wrongIdentityResponse = makeResponse();
    programmeFolder = "MiddleDTECH";
    driveIdentity = { email: "different@westlandhigh.school.nz", email_verified: true };
    await routes["POST /api/student/mdtech-project-folder"]({
        email: "student@westlandhigh.school.nz",
        body: { driveAccessToken: "wrong-account-token" }
    }, wrongIdentityResponse);
    assert.equal(wrongIdentityResponse.statusCode, 403, "Drive setup requires the same Google and Hub account");
}

Promise.all([runFolderRouteRegression(), runAutoDriveSyncRegression(), runMdtechTaskListEnrollmentRegression(), runStudentDirectoryDeduplicationRegression()]).then(() => {
    console.log("MiddleDTECH Task List filtering and folder setup regressions passed.");
}).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
