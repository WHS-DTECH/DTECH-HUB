"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assessment = require("../practical-skills-assessment");
const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
const sourceBetween = (start, end) => {
    const from = server.indexOf(start);
    const to = server.indexOf(end, from);
    assert.ok(from >= 0 && to > from);
    return server.slice(from, to);
};

async function main() {
    const original = {
        worksheets: [{ activity: "Identity" }, { activity: "Sign In - Using Google & Microsoft" },
            { activity: "Password Problems" }, { activity: "Open DTECH" },
            { activity: "Open Google Drive & OneDrive" }, { activity: "Find Your Files" }],
        activities: [null, { questions: [{ id: "teacher-question" }], images: [{ url: "example.png" }] },
            null, null, { questions: [{ id: "old-drive-question" }] }]
    };
    const combined = assessment.withLoginAppsActivity("kit-login", original);
    assert.equal(combined.worksheets.length, 6);
    assert.equal(combined.worksheets[4].mergedInto, 1);
    assert.equal(combined.activities[1].assessmentId, assessment.APPS_WORDSEARCH_ID);
    assert.equal(combined.activities[1].questions[0].id, "teacher-question");
    assert.equal(combined.activities[4].questions[0].id, "old-drive-question");
    assert.equal(original.worksheets[4].mergedInto, undefined);
    assert.deepEqual(assessment.withLoginAppsActivity("kit-login", combined), combined);
    assert.equal(assessment.withLoginAppsActivity("kit-minecraft", original), original);
    const renamed = structuredClone(combined);
    renamed.worksheets[1].activity = "Our edited title";
    assert.equal(assessment.withLoginAppsActivity("kit-login", renamed).worksheets[1].activity, "Our edited title");
    const fullKit = {
        bannerTitle: "Login Kit",
        worksheets: [
            { activity: "Know Your Username" }, { activity: "Sign In" }, { activity: "Password Problems" },
            { activity: "Open DTECH-HUB" }, { activity: "Open Google Drive" }, { activity: "Find Your Files" },
            { activity: "Open Kamar & Hapara" }, { activity: "Open a Google App" }, { activity: "Account Check" }, { activity: "Sign Out Safely" }
        ],
        activities: Array.from({ length: 10 }, (_, i) => ({ title: `Original ${i}`, questions: [{ id: `saved-${i}` }] }))
    };
    const shorten = (content) => assessment.withShortLoginKit("kit-login",
        assessment.withLearningSitesActivity("kit-login", assessment.withLoginAppsActivity("kit-login",
            assessment.withLoginIdentityActivity("kit-login", assessment.withPasswordProblemsActivity("kit-login", content)))));
    const shortKit = shorten(fullKit);
    assert.deepEqual(shortKit.worksheets.map((worksheet, index) => ({ worksheet, index }))
        .filter(({ worksheet }) => !worksheet.hidden && worksheet.mergedInto === undefined)
        .map(({ index }) => index), [0, 1, 2, 3, 6]);
    assert.equal(shortKit.activities[6].title, "Using your login details");
    assert.equal(shortKit.worksheets[6].activity, "Using your login details");
    assert.equal(shortKit.bannerTitle, "Login Kit");
    assert.equal(shortKit.worksheets.length, 10);
    assert.deepEqual(shortKit.activities[6].questions, fullKit.activities[6].questions);
    assert.deepEqual(shortKit.activities[5], fullKit.activities[5], "Hidden activity content is retained");
    assert.equal(fullKit.worksheets[6].activity, "Open Kamar & Hapara");
    assert.deepEqual(shorten(shortKit), shortKit);
    assert.equal(assessment.withShortLoginKit("kit-other", fullKit), fullKit);
    const defaultKit = structuredClone(fullKit);
    defaultKit.worksheets[6].activity = "Open Google Classroom";
    assert.equal(shorten(defaultKit).worksheets[6].activity, "Using your login details");
    const shortKitRenderer = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "practical-skills", "kit-worksheet-render.js"), "utf8"), shortKitRenderer);
    const shortKitHost = { style: { setProperty() {} }, innerHTML: "" };
    shortKitRenderer.window.KitWorksheetRender.renderKitOverview(shortKitHost, shortKit, {
        kitId: "kit-login", completedActivities: { 0: "saved", 1: "saved", 2: "saved", 3: "saved", 5: "hidden-saved" }
    });
    assert.match(shortKitHost.innerHTML, /4 \/ 5 activities completed/);
    assert.equal((shortKitHost.innerHTML.match(/>Open Activity<\/a>/g) || []).length, 5);
    assert.match(shortKitHost.innerHTML, /Using your login details/);
    assert.doesNotMatch(shortKitHost.innerHTML, /activity=5"/);
    assert.match(shortKitHost.innerHTML, /activity=6"/);
    const worksheetSource = fs.readFileSync(path.join(__dirname, "..", "practical-skills", "kit-worksheet.js"), "utf8");
    const routing = worksheetSource.slice(worksheetSource.indexOf("    function getActivityIndexFromUrl()"), worksheetSource.indexOf("    function getStoredAuthRaw()"));
    for (const [index, expected] of [[4, 1], [5, null], [6, 6], [9, null]]) {
        const result = vm.runInNewContext(`${routing}\ngetActivityIndexFromUrl()`, {
            URLSearchParams, window: { location: { search: `?kit=kit-login&activity=${index}` } }, state: { content: shortKit }
        });
        assert.equal(result, expected);
    }

    const puzzle = assessment.getStudentAssessment(assessment.APPS_WORDSEARCH_ID);
    assert.equal(puzzle.grid.length, 12);
    assert.ok(puzzle.grid.every((row) => /^[A-Z]{12}$/.test(row)));
    assert.equal(puzzle.words.length, 8);
    assert.ok(puzzle.words.every((word) => !("row" in word) && !("column" in word)));
    const paths = {};
    for (const { word } of puzzle.words) {
        const found = [];
        for (let r = 0; r < 12; r += 1) {
            for (let c = 0; c < 12; c += 1) {
                for (const [dr, dc] of [[1, 0], [0, 1]]) {
                    const cells = Array.from(word, (_, i) => [r + dr * i, c + dc * i]);
                    if (cells.map(([row, column]) => puzzle.grid[row]?.[column] || "").join("") === word) found.push(cells);
                }
            }
        }
        assert.ok(found.length >= 1, `${word} must be findable (Drive can also occur inside OneDrive)`);
        paths[word] = found[0];
    }
    const answers = { paths, microsoftReady: true };
    const passed = assessment.gradeAppsWordsearch(answers, true);
    assert.equal(passed.score, 10);
    assert.equal(passed.passed, true);
    assert.equal(assessment.gradeAppsWordsearch({ ...answers, microsoftReady: false }, true).score, 9);
    assert.equal(assessment.gradeAppsWordsearch(answers, false).passed, false, "Client must not invent Drive readiness");
    assert.equal(assessment.gradeAppsWordsearch({ paths: Object.fromEntries(Object.entries(paths).map(([word, cells]) => [word, cells.slice().reverse()])), microsoftReady: true }, true).passed, true);
    assert.equal(assessment.gradeAppsWordsearch({ ...answers, paths: { ...paths, DOCS: [[0, "0"], [0, 1], [0, 2], [0, 3]] } }, true).passed, false);
    assert.equal(assessment.gradeAppsWordsearch({ ...answers, paths: { ...paths, DOCS: "DOCS" }, passed: true }, true).answers.paths.DOCS, undefined);
    assert.equal(assessment.gradeAppsWordsearch({ ...answers, microsoftReady: "true" }, true).passed, false);
    assert.equal(assessment.gradeAppsWordsearch({ ...answers, paths: { ...paths, WORD: [[12, 0], [12, 1], [12, 2], [12, 3]] } }, true).passed, false);
    assert.equal(assessment.gradeAppsWordsearch({ ...answers, paths: { ...paths, DOCS: [[0, 0], [0, 1], [0, 3], [0, 2]] } }, true).passed, false);

    const routes = {};
    const folders = new Map();
    const permissions = new Set();
    const calls = [];
    let matchingAccount = true;
    let sharingFails = false;
    let saveFails = false;
    const context = vm.createContext({
        app: {
            get: (url, handler) => { routes[`GET ${url}`] = handler; },
            post: (url, handler) => { routes[`POST ${url}`] = handler; }
        },
        hasDatabase: false,
        memoryStudentLoginDriveSetup: new Map(),
        SCHOOL_EMAIL_DOMAIN: "example.school.nz",
        normalizeEmail: (email) => String(email || "").trim().toLowerCase(),
        getRequestUserEmail: (req) => req.email,
        fetch: async () => ({ ok: true, json: async () => ({ email: matchingAccount ? "student@example.school.nz" : "other@example.school.nz", email_verified: true }) }),
        driveApiRequest: async (url, options) => {
            calls.push({ url, options });
            if (url === "/files" && options.method === "POST") {
                const folder = { id: "whs-folder", name: options.body.name };
                folders.set(folder.name, folder);
                return folder;
            }
            if (url === "/files") return { files: folders.has("WHS-DTECH") ? [folders.get("WHS-DTECH")] : [] };
            if (options.method === "POST" || options.method === "PATCH") {
                if (sharingFails) throw new Error("School policy blocks sharing");
                permissions.add("whs-folder");
                return { id: "sharing", type: "anyone", role: "writer" };
            }
            return { permissions: permissions.has("whs-folder") ? [{ id: "sharing", type: "anyone", role: "writer" }] : [] };
        },
        pool: { query: async () => {
            if (saveFails) throw new Error("Database unavailable");
            return { rows: [] };
        } }
    });
    vm.runInContext([
        sourceBetween("async function driveFindFolderByName(", "async function driveFindFolderByNameAnywhere("),
        sourceBetween("async function driveCreateFolder(", "async function driveEnsureProcessAssessmentFolder("),
        sourceBetween("async function driveEnsureFolder(", "const PROCESS_ASSESSMENT_DIGITAL_OUTCOME_FOLDER_NAME"),
        sourceBetween("async function ensureStudentLoginDriveSetupSchema(", 'app.get("/api/student/drive-setup"')
    ].join("\n"), context);
    const request = async (method, overrides = {}) => {
        const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
        await routes[`${method} /api/student/login-drive-setup`]({
            email: "student@example.school.nz", body: { driveAccessToken: "test-token" }, ...overrides
        }, res);
        return res;
    };
    assert.equal((await request("GET")).body.ready, false);
    assert.equal((await request("POST", { email: "" })).code, 401);
    assert.equal((await request("POST", { body: {} })).code, 400);
    matchingAccount = false;
    assert.equal((await request("POST")).code, 403);
    assert.equal(calls.length, 0, "A mismatched account must not create a folder");
    matchingAccount = true;
    sharingFails = true;
    assert.equal((await request("POST")).code, 500);
    assert.equal((await request("GET")).body.ready, false, "Sharing failure must not record readiness");
    sharingFails = false;
    assert.equal((await request("POST")).body.ready, true);
    assert.equal((await request("POST")).body.ready, true);
    assert.equal(calls.filter(({ url, options }) => url === "/files" && options.method === "POST").length, 1, "Repeat/retry must reuse WHS-DTECH");
    const creation = calls.find(({ url, options }) => url === "/files" && options.method === "POST");
    assert.equal(creation.options.body.name, "WHS-DTECH");
    assert.deepEqual(Array.from(creation.options.body.parents), ["root"]);
    const sharing = calls.find(({ url, options }) => url.endsWith("/permissions") && options.method === "POST");
    assert.equal(sharing.options.body.type, "anyone");
    assert.equal(sharing.options.body.role, "writer");
    assert.equal((await request("GET", { email: "other@example.school.nz" })).body.ready, false);
    assert.match((await request("GET")).body.folderUrl, /whs-folder$/);
    context.hasDatabase = true;
    saveFails = true;
    assert.equal((await request("POST")).code, 500, "Persistence failure must not return success");

    const host = { style: { setProperty() {} }, innerHTML: "" };
    const rendererContext = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "practical-skills", "kit-worksheet-render.js"), "utf8"), rendererContext);
    rendererContext.window.KitWorksheetRender.renderWorksheet(host, { assessment: puzzle }, { readOnly: true });
    assert.equal((host.innerHTML.match(/data-word-cell=/g) || []).length, 144);
    assert.match(host.innerHTML, /href="https:\/\/westlandhigh-my\.sharepoint\.com\/" target="_blank" rel="noopener noreferrer"/);
    assert.doesNotMatch(host.innerHTML, /microsoft365\.com|login_hint|login\.microsoftonline\.com/);
    assert.doesNotMatch(host.innerHTML, /\/launch\/onedrive/);
    assert.match(host.innerHTML, /anyone with the link as Editor/);
    rendererContext.window.KitWorksheetRender.renderKitOverview(host, combined, { kitId: "kit-login", completedActivities: { 2: "saved", 4: "old" } });
    assert.match(host.innerHTML, /1 \/ 5 activities completed/);
    assert.doesNotMatch(host.innerHTML, /activity=4/);
    assert.match(host.innerHTML, /activity=5/);
    for (const outcome of ["success", "blocked", "failure", "unconfirmed"]) {
        const nodes = new Map();
        const node = (selector) => {
            if (!nodes.has(selector)) nodes.set(selector, {
                classList: { toggle() {}, remove() {}, add() {} },
                events: {},
                addEventListener(name, callback) { this.events[name] = callback; },
                querySelector: node,
                querySelectorAll: () => []
            });
            return nodes.get(selector);
        };
        const order = [];
        const tab = {
            closed: false,
            opener: {},
            location: { replace(url) { tab.url = url; } },
            close() { this.closed = true; }
        };
        rendererContext.window.open = (url, target) => {
            assert.equal(url, "about:blank");
            assert.equal(target, "_blank");
            order.push("open");
            return outcome === "blocked" ? null : tab;
        };
        const interactive = {
            ...host,
            querySelector: node,
            querySelectorAll: () => []
        };
        rendererContext.window.KitWorksheetRender.renderWorksheet(interactive, { assessment: puzzle }, {
            onDriveSetup: async () => {
                order.push("setup");
                if (outcome === "failure") throw new Error("Drive permission denied");
                return { ready: outcome !== "unconfirmed", folderUrl: "https://drive.google.com/drive/folders/test" };
            }
        });
        await node("[data-login-drive-setup]").events.click();
        assert.deepEqual(order, ["open", "setup"], "Reserve tab before asynchronous consent/setup");
        assert.equal(node("[data-login-drive-setup]").disabled, false);
        if (outcome === "success") {
            assert.equal(tab.opener, null);
            assert.equal(tab.url, "https://drive.google.com/drive/folders/test");
        } else if (outcome === "blocked") {
            assert.match(node("[data-login-drive-status]").textContent, /blocked or closed/);
            assert.equal(node("[data-login-drive-link]").hidden, false);
        } else {
            assert.equal(tab.closed, true, "Close reserved tab if setup fails");
            assert.equal(tab.url, undefined, "Do not open Drive before confirmed success");
            assert.match(node("[data-login-drive-status]").textContent, /denied|did not confirm/);
        }
    }
    console.log("Login apps and WHS-DTECH setup regression checks passed.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
