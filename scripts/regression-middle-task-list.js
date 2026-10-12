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
