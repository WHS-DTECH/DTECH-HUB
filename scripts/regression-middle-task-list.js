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

const helperStart = taskList.indexOf("function getTaskListCourseFromAllocations(");
const helperEnd = taskList.indexOf("// Minimal Drive OAuth client", helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, "Task List course and filter helpers are present");

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

const testingCriterion = "Achieved: Testing that the digital technologies outcome functions as intended.";
const testingChecklistState = { "91907": [{ text: testingCriterion, done: false }] };
const testingCountsState = {
    "testing-functions-counts": [{ text: "TESTING_FUNCTIONS_COUNT|4|4", done: true }]
};
const testingAutoContext = vm.createContext({
    getStepLevel: (text) => String(text || "").split(":")[0].trim(),
    stripStepLevel: (text) => String(text || "").replace(/^(Achieved|Merit|Excellence):\s*/i, "").trim(),
    TESTING_FUNCTIONS_LIST_COUNT_STORAGE_PREFIX: "hub_testing_functions_list_counts_v1",
    localStorage: { getItem: () => null }
});
const testingCountsStart = taskList.indexOf("function readTestingFunctionsListCounts(");
const testingCountsEnd = taskList.indexOf("\nfunction getTestingFunctionsSubtasks", testingCountsStart);
const testingManagementStart = taskList.indexOf("function getStepAutoManagementKind(");
const testingManagementEnd = taskList.indexOf("\nfunction getSessionTickKey", testingManagementStart);
const testingAutoStart = taskList.indexOf("function isTestingFunctionsRequirementStep(");
const testingAutoEnd = taskList.indexOf("\nfunction autoTickDigitalOutcomeRequirements", testingAutoStart);
assert.ok(testingCountsStart >= 0 && testingCountsEnd > testingCountsStart
    && testingManagementStart >= 0 && testingManagementEnd > testingManagementStart
    && testingAutoStart >= 0 && testingAutoEnd > testingAutoStart,
    "Testing Functions count and auto-tick helpers are present");
vm.runInContext([
    taskList.slice(testingCountsStart, testingCountsEnd),
    taskList.slice(testingManagementStart, testingManagementEnd),
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
testingCountsState["testing-functions-counts"][0].text = "TESTING_FUNCTIONS_COUNT|0|0";
assert.equal(
    testingAutoContext.autoTickTestingFunctionsRequirement(testingChecklistState, testingCountsState, "activity-1", "student@example.test"),
    true,
    "Removing all Testing Functions entries clears the criterion tick"
);
assert.equal(testingChecklistState["91907"][0].done, false);
assert.match(taskList, /window\.addEventListener\("pageshow",[\s\S]*loadChecklistForTask\(taskListState\.selectedId\)/,
    "Returning to the Task List refreshes evidence after opening a topic page");

const triallingCriterion = "Achieved: Trial the components of the digital technologies outcome.";
const triallingChecklistState = { "91907": [{ text: triallingCriterion, done: false }] };
const triallingStart = taskList.indexOf("function isTriallingComponentsRequirementStep(");
const triallingEnd = taskList.indexOf("\nfunction isEfficientToolsMainStep", triallingStart);
assert.ok(triallingStart >= 0 && triallingEnd > triallingStart,
    "Trialling Components criterion auto-tick helpers are present");
const triallingContext = vm.createContext({
    getStepLevel: (text) => String(text || "").split(":")[0].trim(),
    stripStepLevel: (text) => String(text || "").replace(/^(Achieved|Merit|Excellence):\s*/i, "").trim(),
    isTestingFunctionsRequirementStep: () => false
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
const endUserImplicationsCopy = templateIdentityContext.inferTemplateCopyFromFileName(
    "Relevant Implications - End-User Considerations - Otto"
);
assert.equal(endUserImplicationsCopy.templateId, "relevant-implications-end-user-considerations",
    "Drive sync keeps the hyphen inside End-User Considerations when identifying its template");
assert.equal(endUserImplicationsCopy.templateTitle, "Relevant Implications - End-User Considerations",
    "The recorded copy title matches the Task List category used for auto-ticking");

const digitalOutcomeRows = [
    { text: "Describe the digital outcome" },
    { text: "Identify the target audience" }
];
assert.deepEqual(
    JSON.parse(JSON.stringify(context.getMiddleDtechChecklistRows("digital-outcome", digitalOutcomeRows))),
    digitalOutcomeRows,
    "MiddleDTECH keeps the Digital Outcome Topic checklist"
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
    { text: "Achieved: Use appropriate tools and techniques for the purpose and end users." },
    { text: "Excellence: Using efficient tools and techniques in the outcome's production." },
    { text: "Excellence: Iterative improvement throughout the design and development process." }
];
assert.deepEqual(
    JSON.parse(JSON.stringify(context.getMiddleDtechChecklistRows("91893", mediaRows))),
    [mediaRows[1]],
    "MiddleDTECH keeps the efficient-tools item without the other digital media criteria"
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

runFolderRouteRegression().then(() => {
    console.log("MiddleDTECH Task List filtering and folder setup regressions passed.");
}).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
