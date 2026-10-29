"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const B = require("../practical-skills/activity-blocks");
const certificates = require("../practical-skills-certificate");
const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
const client = fs.readFileSync(path.join(__dirname, "..", "practical-skills", "kit-worksheet.js"), "utf8");
function section(source, start, end) {
    const first = source.indexOf(start), last = source.indexOf(end, first);
    assert.ok(first >= 0 && last > first, start);
    return source.slice(first, last);
}
const email = "student@school.nz", kitId = "kit-google-search";
const answers = () => ({
    "search-penguin-name": "korora", "search-korora-food-search": "korora food",
    "search-tallest-mountain": "aoraki mount cook", "search-penguin-location": "hokitika beach",
    "search-penguin-safety": "uncontrolled dogs",
    "1-keyword-pounamu-treasure": "where to find pounamu west coast nz",
    "1-keyword-too-many-results": "hokitika gorge swing bridge", "1-keyword-glowworm-mystery": "new zealand glowworm diet",
    "1-keyword-fix-the-search": "hokitika tomorrow", "1-keyword-hokitika-founded": "1864",
    "2-search-result-clock-tower": "hokitika clock tower history and dimensions",
    "2-search-result-pool-hours": "hokitika swimming pool opening hours and contact details",
    "2-search-result-wrong-place": "waimea gorge walking track nelson", "2-search-result-glowworm-time": "after dark",
    "2-search-result-doc-track": "hokitika river",
    "3-search-find-giant-tree": "kahikatea", "3-search-find-gold-rush-town": "ross",
    "3-search-find-mountain-bird": "roroa", "3-search-find-pancake-rocks": "limestone",
    "3-search-find-glacier-mystery": "ka roimata o hine hukatere"
});
const content = () => ({
    bannerTitle: "Search Kit",
    worksheets: ["Search Like a Pro", "The Keyword Challenge", "Finding the Right Result", "Search and Find!", "Google Search Challenge"].map((activity) => ({ activity })),
    activities: ["search-penguin-missions-v1", "search-keyword-challenge-v1", "search-results-detective-v1", "search-and-find-v1"]
        .map((questionAutoMarkAssessmentId) => ({ questionAutoMarkAssessmentId }))
        .concat([{ researchReport: { id: "search-research-report-v1" } }])
});
function serverContext() {
    const ctx = vm.createContext({
        ...certificates, ActivityBlocks: B, hasDatabase: false,
        memoryPracticalSkillsProgress: new Map(), normalizeEmail: (value) => String(value || "").toLowerCase(),
        ensurePracticalSkillsProgressSchema: async () => {},
        kitPublication: { available: async () => true }
    });
    vm.runInContext([
        section(server, "const SEARCH_PENGUIN_MISSIONS_ID =", "const { visibleActivityIndexes"),
        section(server, "async function ensurePracticalSkillsProgressRow(", "const DEFAULT_TEMPLATE_LIBRARY_ENTRIES"),
        section(server, "async function savePracticalSkillsKitResponses(", "async function ensureStudentHaparaFoldersSchema("),
        section(server, "async function recoverSearchKitCompletion(", "async function getPracticalSkillsCertificate(")
    ].join("\n"), ctx);
    return ctx;
}

test("returning repeatedly preserves all five earned Search ticks and certificate timestamps", async () => {
    const ctx = serverContext();
    const ticks = Object.fromEntries([0, 1, 2, 3, 4].map((i) => [i, "2026-10-28T00:00:00Z"]));
    ctx.memoryPracticalSkillsProgress.set(`${email}:${kitId}`, {
        student_email: email, kit_id: kitId, completed: true, completed_at: "2026-10-28T00:00:00Z",
        certificate_emailed_at: "2026-10-28T00:01:00Z", completed_activities: ticks, responses: {}
    });
    for (let reload = 0; reload < 5; reload++) {
        const row = await ctx.syncPracticalSkillsKitCompletion(email, kitId, content());
        assert.deepEqual(JSON.parse(JSON.stringify(row.completed_activities)), ticks);
        assert.equal(row.completed, true);
        assert.equal(row.completed_at, "2026-10-28T00:00:00Z");
        assert.equal(row.certificate_emailed_at, "2026-10-28T00:01:00Z");
        assert.equal(certificates.buildKitCertificate(content(), row, "Student").activityCount, 5);
    }
});

test("missing question ticks recover once from correct saved answers, without fabricating a research-report pass", async () => {
    const ctx = serverContext();
    await ctx.savePracticalSkillsKitResponses(email, kitId, {
        ...answers(), "4-search-research-report-v1": { passed: true, addedWords: 200 }
    });
    let row = await ctx.syncPracticalSkillsKitCompletion(email, kitId, content());
    assert.deepEqual(Object.keys(row.completed_activities), ["0", "1", "2", "3"]);
    assert.equal(row.completed, false);
    assert.equal(row.search_tick_recovery_version, 1);
    assert.equal(certificates.buildKitCertificate(content(), row, "Student"), null);
    row = await ctx.setPracticalSkillsKitCompletion(email, kitId, false);
    assert.equal(row.search_tick_recovery_version, 1);
    row = await ctx.syncPracticalSkillsKitCompletion(email, kitId, content());
    assert.deepEqual(Object.keys(row.completed_activities), [], "An explicit reset must not be undone by recovery");
    assert.equal(row.responses["search-penguin-name"], "korora", "Reset preserves evidence");
});

test("recovery restores only provable, visible activities and never changes other students or kits", async () => {
    const ctx = serverContext();
    await ctx.savePracticalSkillsKitResponses(email, kitId, { ...answers(), "1-keyword-hokitika-founded": "wrong" });
    const kit = content();
    kit.worksheets[2].hidden = true;
    kit.worksheets[3].mergedInto = 0;
    const row = await ctx.syncPracticalSkillsKitCompletion(email, kitId, kit);
    assert.deepEqual(Object.keys(row.completed_activities), ["0"]);
    const other = await ctx.ensurePracticalSkillsProgressRow("other@school.nz", kitId);
    assert.equal(other.completed_activities, undefined);
    await ctx.savePracticalSkillsKitResponses(email, "kit-other", answers());
    const otherKit = await ctx.syncPracticalSkillsKitCompletion(email, "kit-other", content());
    assert.equal(otherKit.completed_activities, undefined);
});

test("Search saves merge changed answers atomically while other kits retain their existing save behavior", async () => {
    const ctx = serverContext();
    await ctx.savePracticalSkillsKitResponses(email, kitId, { first: "A", second: "B" });
    let row = await ctx.savePracticalSkillsKitResponses(email, kitId, { first: "" });
    assert.equal(row.responses.first, "", "Intentionally clearing an answer is still possible");
    assert.equal(row.responses.second, "B");
    await ctx.savePracticalSkillsKitResponses(email, "kit-other", { first: "A", second: "B" });
    row = await ctx.savePracticalSkillsKitResponses(email, "kit-other", { first: "C" });
    assert.equal(row.responses.second, undefined);
    const queries = [];
    ctx.hasDatabase = true;
    ctx.pool = { query: async (sql, values) => { queries.push({ sql, values }); return { rows: [{}] }; } };
    await ctx.savePracticalSkillsKitResponses(email, kitId, { third: "C" });
    assert.match(queries.at(-1).sql, /kit_id = 'kit-google-search' THEN responses \|\| \$1::jsonb/);
});

test("checking one activity cannot overwrite other Search answers from a stale whole-kit snapshot", async () => {
    const ctx = serverContext();
    await ctx.savePracticalSkillsKitResponses(email, kitId, answers());
    const stale = { ...answers(), "1-keyword-hokitika-founded": "", "3-search-find-giant-tree": "" };
    const grade = ctx.gradeSearchPenguinMissions(stale);
    let row = await ctx.savePracticalSkillsAssessment(email, kitId, 0, grade);
    assert.equal(row.responses["1-keyword-hokitika-founded"], "1864");
    assert.equal(row.responses["3-search-find-giant-tree"], "kahikatea");
    assert.ok(row.completed_activities[0]);
    row = await ctx.savePracticalSkillsAssessment(email, kitId, 0, ctx.gradeSearchPenguinMissions({}));
    assert.ok(row.completed_activities[0], "A failed repeat check cannot erase an earned tick");
});

test("database recovery adds missing ticks only and cannot race past an explicit reset", async () => {
    const ctx = serverContext(), queries = [];
    ctx.hasDatabase = true;
    ctx.pool = { query: async (sql, values) => {
        queries.push({ sql, values });
        return { rows: [{ completed_activities: { 4: "original" }, search_tick_recovery_version: 1 }] };
    } };
    await ctx.recoverSearchKitCompletion(email, kitId, content(), { responses: answers(), completed_activities: { 4: "original" } });
    assert.match(queries[0].sql, /\$3::jsonb \|\| completed_activities/);
    assert.match(queries[0].sql, /AND search_tick_recovery_version = 0/);
    assert.deepEqual(Object.keys(JSON.parse(queries[0].values[2])), ["0", "1", "2", "3"]);
    assert.match(server, /ADD COLUMN IF NOT EXISTS search_tick_recovery_version INTEGER NOT NULL DEFAULT 0/);
    ctx.pool = { query: async () => ({ rows: [] }) };
    ctx.ensurePracticalSkillsProgressRow = async () => ({ completed_activities: {}, search_tick_recovery_version: 1 });
    const resetDuringRecovery = await ctx.recoverSearchKitCompletion(email, kitId, content(), { responses: answers() });
    assert.deepEqual(Object.keys(resetDuringRecovery.completed_activities), [], "A reset wins over an older recovery request");
});

test("the API rejects obsolete whole-kit saves and unconfirmed Search resets", async () => {
    const handlers = {}, ctx = vm.createContext({
        app: { post: (path, handler) => { handlers[path] = handler; } },
        normalizeEmail: (value) => value, getRequestUserEmail: () => email, SCHOOL_EMAIL_DOMAIN: "school.nz",
        getPracticalSkillsKitDefinition: () => true
    });
    vm.runInContext(section(server, 'app.post("/api/practical-skills/progress/:kitId/responses"', 'app.put("/api/practical-skills/progress/:kitId/activities/'), ctx);
    vm.runInContext(section(server, 'app.post("/api/practical-skills/progress/:kitId/reset"', 'app.get("/api/practical-skills/progress/:kitId"'), ctx);
    const res = () => ({ status(code) { this.code = code; return this; }, json(data) { this.body = data; } });
    const old = res();
    await handlers["/api/practical-skills/progress/:kitId/responses"]({ params: { kitId }, body: { responses: answers() } }, old);
    assert.equal(old.code, 409);
    assert.match(old.body.error, /out of date/);
    const reset = res();
    await handlers["/api/practical-skills/progress/:kitId/reset"]({ params: { kitId }, body: {} }, reset);
    assert.equal(reset.code, 409);
    assert.match(reset.body.error, /explicitly confirm/);
});

test("an older tab submits only its edited keys, not blank/stale answers from other activities", async () => {
    const baseline = { first: "", second: "" }, requests = [];
    const state = { savedSearchResponses: { ...baseline } };
    const ctx = vm.createContext({
        state, withAuthHeaders: (headers) => headers,
        loadJson: async (_url, options) => { requests.push(JSON.parse(options.body)); return { ok: true }; }
    });
    vm.runInContext(section(client, "    async function saveResponses(", "    function queueProgressWrite("), ctx);
    await ctx.saveResponses(kitId, { ...baseline, first: "A" });
    assert.deepEqual(requests[0], { responses: { first: "A" }, responseMode: "merge" });
    await ctx.saveResponses(kitId, { first: "A", second: "B" });
    assert.deepEqual(requests[1].responses, { second: "B" });
    await ctx.saveResponses(kitId, { first: "", second: "B" });
    assert.deepEqual(requests[2].responses, { first: "" });
});

test("queued writes and in-flight reads from another sign-in cannot run or replace current progress", async () => {
    let activeEmail = email, release, writes = 0;
    const state = { email, sessionRevision: 1, progressWritePromise: new Promise((resolve) => { release = resolve; }) };
    const ctx = vm.createContext({ state, getSignedInEmail: () => activeEmail });
    vm.runInContext(section(client, "    function queueProgressWrite(", "    function getCurrentActivityIndex("), ctx);
    const queued = ctx.queueProgressWrite(() => { writes++; });
    activeEmail = "other@school.nz";
    state.sessionRevision++;
    release();
    await assert.rejects(queued, /account changed/);
    assert.equal(writes, 0);
    let finish;
    ctx.fetch = () => new Promise((resolve) => { finish = resolve; });
    vm.runInContext(section(client, "    async function loadJson(", "    function fetchKitContent("), ctx);
    const loading = ctx.loadJson("/api/test");
    activeEmail = email;
    finish({ ok: true, json: async () => ({ completedActivities: {} }) });
    await assert.rejects(loading, /account changed/);
});

test("Search marking timers from an earlier account do not check or save after an account switch", () => {
    let activeEmail = email, writes = 0;
    const timers = [];
    const state = { email, progressLoaded: true, sessionRevision: 1, responses: answers(), completedActivities: {},
        searchChoiceCheckTimers: {}, searchChoiceCheckRevisions: {} };
    const ctx = vm.createContext({
        state, getSignedInEmail: () => activeEmail,
        window: { clearTimeout() {}, setTimeout: (callback) => { timers.push(callback); return timers.length; } },
        queueProgressWrite: () => { writes++; }, setSearchChoiceFeedback() {}
    });
    vm.runInContext([
        section(client, "    function scheduleSearchChoiceCheck(", "    function showSavedSearchAndFindFeedback("),
        section(client, "    function scheduleSearchActivityAutoMark(", "    function updateCompleteBar(")
    ].join("\n"), ctx);
    ctx.scheduleSearchChoiceCheck(2, "search-results-detective-v1", "2-search-result-doc-track");
    ctx.scheduleSearchActivityAutoMark(0, "search-penguin-missions-v1");
    assert.equal(timers.length, 2);
    activeEmail = "other@school.nz";
    state.sessionRevision++;
    timers.forEach((callback) => callback());
    assert.equal(writes, 0);
});

test("a failed progress load shows a retry error instead of presenting an empty activity list", async () => {
    const nodes = new Map(), created = [];
    const node = () => ({ hidden: false, children: [], replaceChildren() { this.children = []; }, append(...children) { this.children.push(...children); },
        addEventListener() {} });
    const get = (id) => { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); };
    let rendered = 0, message;
    const state = { sessionRevision: 0 };
    const ctx = vm.createContext({
        state, preview: false, getKitIdFromUrl: () => kitId, getSignedInEmail: () => email,
        fetchKitContent: async () => ({ content: content() }),
        fetchKitProgress: async () => { throw new Error("Network unavailable"); },
        renderPage: () => { rendered++; }, wireActionButtons() {},
        showStatusMessage: (text) => { message = text; },
        document: { getElementById: get, createElement: () => { const result = node(); created.push(result); return result; } }
    });
    vm.runInContext(section(client, "    async function init(", '    if (document.getElementById("hub-google-verify-button")'), ctx);
    await ctx.init();
    assert.equal(rendered, 0);
    assert.equal(state.progressLoaded, false);
    assert.match(message, /Network unavailable/);
    assert.match(get("worksheet-host").children[0].textContent, /not a reset/);
    assert.equal(get("worksheet-host").children[1].textContent, "Retry loading saved progress");
    assert.equal(get("worksheet-activity-complete-bar").hidden, true);
});
