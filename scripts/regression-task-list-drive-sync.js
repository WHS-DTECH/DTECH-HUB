"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "..", "task-list.js"), "utf8");
function extract(start, end) {
    const from = source.indexOf(start);
    const to = source.indexOf(end, from);
    assert.ok(from >= 0 && to > from);
    return source.slice(from, to);
}

test("Drive permission retries and expired tokens resolve the current request", { timeout: 1000 }, async () => {
    const clients = [];
    const context = vm.createContext({
        document: { querySelector: () => ({ content: "client-id" }) }, Date,
        window: { google: { accounts: { oauth2: { initTokenClient: (config) => {
            clients.push(config);
            return { requestAccessToken() {} };
        } } } } }
    });
    vm.runInContext(extract("const taskListDriveState =", "\nfunction normalizeDigitalOutcomeChecklistRows("), context);
    let request = context.requestTaskListDriveToken();
    clients[0].error_callback({ type: "popup_closed" });
    assert.equal((await request).error, "popup_closed");
    request = context.requestTaskListDriveToken();
    assert.equal(clients.length, 2, "A fresh callback belongs to the retry");
    clients[1].callback({ access_token: "first", expires_in: 3600 });
    assert.equal((await request).access_token, "first");
    assert.equal((await context.requestTaskListDriveToken()).access_token, "first");
    vm.runInContext("taskListDriveState.tokenExpiry = 0", context);
    request = context.requestTaskListDriveToken();
    clients[2].callback({ access_token: "renewed", expires_in: 3600 });
    assert.equal((await request).access_token, "renewed");
});

function syncContext() {
    const button = { disabled: false, textContent: "" };
    const state = {
        selectedId: "assessment", templateCopies: [], checklistState: {}, fullEvidenceState: {
            "testing-functions-counts": [{ text: "TESTING_FUNCTIONS_COUNT|1|0", done: true }]
        }, allItems: [], taskTopic: "Digital Outcome"
    };
    const statuses = [];
    const calls = [];
    const saved = [];
    const timeouts = [];
    let handler;
    const context = vm.createContext({
        taskListState: state, AbortSignal: { timeout: (ms) => { timeouts.push(ms); return AbortSignal.timeout(ms); } },
        document: {
            addEventListener: (_type, fn) => { handler = fn; },
            querySelector: () => button
        },
        buildTaskListHeaders: () => ({}), getTaskListEmail: () => "student@example.school.nz",
        requestTaskListDriveToken: async () => ({ access_token: "drive-token" }),
        loadJson: async (url, options) => {
            calls.push({ url, options });
            if (url.endsWith("sync-drive-templates")) return { synced: 1, template_copies: [{
                templateId: "testing-functions", fileUrl: "https://docs.google.com/presentation/d/testing-slides-123/edit"
            }] };
            return { functionalTesting: ["Navigation"], userTesting: ["Client feedback", "Phone layout"] };
        },
        loadIdentifiedComponentsCount: async (_id, _email, signal) => { assert.ok(signal); return 0; },
        autoTickMultipleComponentsRequirement: () => false,
        autoTickTriallingComponentsRequirement: () => false,
        applyTemplateCopiesAsRelevantImplicationsState: () => false,
        autoTickDigitalOutcomeRequirements: () => false,
        autoTickWebIntegrityRequirement: () => false,
        autoTickTestingFunctionsRequirement: () => false,
        autoTickRelevantImplicationsRequirements: () => false,
        evidenceMapToRows: (map) => map,
        saveMyEvidence: async (_id, rows, signal) => { assert.ok(signal); saved.push(JSON.parse(JSON.stringify(rows))); },
        renderChecklistCards() {},
        setStatus: (message, error) => statuses.push({ message, error })
    });
    vm.runInContext(extract("async function refreshTaskListTestingCounts(", "\nfunction getTestingFunctionsSubtasks("), context);
    const start = source.indexOf('        const syncBtn = event.target?.closest?.("#task-list-sync-drive");');
    const listenerStart = source.lastIndexOf('    document.addEventListener("click", async (event) => {', start);
    const listenerEnd = source.indexOf('\n    document.addEventListener("change", async (event) => {', start);
    vm.runInContext(source.slice(listenerStart, listenerEnd), context);
    return { context, state, button, statuses, calls, saved, timeouts, click: () => handler({ target: { closest: () => button } }) };
}

test("Drive sync replaces stale user-testing counts and persists them for reloads", async () => {
    const env = syncContext();
    await env.click();
    assert.equal(env.state.fullEvidenceState["testing-functions-counts"][0].text, "TESTING_FUNCTIONS_COUNT|1|2");
    assert.equal(env.saved[0]["testing-functions-counts"][0].text, "TESTING_FUNCTIONS_COUNT|1|2");
    assert.equal(env.calls[1].url, "/api/student/drive-setup/read-testing-functions");
    assert.equal(JSON.parse(env.calls[1].options.body).presentationId, "testing-slides-123");
    assert.equal(env.calls[0].options.signal, env.calls[1].options.signal, "One deadline bounds the complete scan");
    assert.deepEqual(env.timeouts, [60000], "The complete scan is capped at one minute");
    assert.match(env.statuses.at(-1).message, /Drive sync complete/);
    assert.equal(env.button.disabled, false);
    await env.click();
    assert.equal(env.saved.length, 2, "Repeated syncs still finish and save counts");
});

test("Timeouts, denied permissions and failed evidence saves restore a retryable button", async () => {
    for (const failure of ["timeout", "permission", "save"]) {
        const env = syncContext();
        if (failure === "timeout") env.context.loadJson = async () => { throw Object.assign(new Error("timeout"), { name: "TimeoutError" }); };
        if (failure === "permission") env.context.requestTaskListDriveToken = async () => ({ error: "popup_closed" });
        if (failure === "save") env.context.saveMyEvidence = async () => { throw new Error("Database unavailable"); };
        await env.click();
        assert.equal(env.button.disabled, false, failure);
        assert.match(env.button.textContent, /Sync from Google Drive/);
        assert.equal(env.statuses.at(-1).error, true);
        assert.doesNotMatch(env.statuses.at(-1).message, /sync complete/);
        if (failure === "timeout") assert.match(env.statuses.at(-1).message, /took too long.*retry/i);
    }
});

test("Failed testing reads preserve previous counts and changing task never updates another task", async () => {
    const env = syncContext();
    env.context.loadJson = async () => {
        env.state.selectedId = "another-task";
        return { functionalTesting: [], userTesting: [] };
    };
    env.state.templateCopies = [{ templateId: "testing-functions", fileUrl: "https://docs.google.com/presentation/d/testing-slides-123/edit" }];
    assert.equal(await env.context.refreshTaskListTestingCounts("assessment", "token"), false);
    assert.equal(env.state.fullEvidenceState["testing-functions-counts"][0].text, "TESTING_FUNCTIONS_COUNT|1|0");
    env.state.selectedId = "assessment";
    env.context.loadJson = async () => ({ error: "Invalid data" });
    await assert.rejects(env.context.refreshTaskListTestingCounts("assessment", "token"), /response is invalid/);
    assert.equal(env.state.fullEvidenceState["testing-functions-counts"][0].text, "TESTING_FUNCTIONS_COUNT|1|0");
});

test("Server Drive scan bounds Google requests and reports failed template saves", async () => {
    const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
    const start = server.indexOf('app.post("/api/activities/:id/sync-drive-templates",');
    const end = server.indexOf('\napp.post("/api/activities/:id/sync-slide-set",', start);
    let handler;
    let failSave = false;
    let timeout = false;
    let budget;
    const context = vm.createContext({
        app: { post: (_url, fn) => { handler = fn; } },
        normalizeEmail: (value) => value.toLowerCase(),
        getRequestUserEmail: () => "student@example.school.nz", SCHOOL_EMAIL_DOMAIN: "example.school.nz",
        getStudentTaskListDriveFolder: async () => ({ folderId: "folder", folderName: "Process Assessment" }),
        AbortSignal: { timeout: (ms) => { budget = ms; return { bounded: true }; } },
        driveListSlidesInProcessAssessmentTree: async (_folder, _token, signal) => {
            assert.equal(signal.bounded, true);
            if (timeout) throw Object.assign(new Error("timeout"), { name: "TimeoutError" });
            return [{ id: "testing", name: "Testing Functions" }];
        },
        inferTemplateCopyFromFileName: () => ({ templateId: "testing-functions" }),
        hasDatabase: true,
        recordTemplateCopyInDb: async () => { if (failSave) throw new Error("Database unavailable"); },
        pool: { query: async () => ({ rows: [{ template_copies: [{ templateId: "testing-functions" }] }] }) }
    });
    vm.runInContext(server.slice(start, end), context);
    const run = async () => {
        const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
        await handler({ params: { id: "project" }, body: { driveAccessToken: "token" } }, res);
        return res;
    };
    assert.equal((await run()).body.ok, true);
    assert.equal(budget, 45000);
    failSave = true;
    const failed = await run();
    assert.equal(failed.code, 500);
    assert.match(failed.body.error, /Database unavailable/);
    timeout = true;
    assert.equal((await run()).code, 504);
});
