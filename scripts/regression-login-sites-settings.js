"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assessment = require("../practical-skills-assessment");
const config = require("../login-sites-config");
const base = assessment.withShortLoginKit("kit-login", { worksheets: [{ activity: "Using your login details" }], activities: [] });
const defaults = base.activities[0].loginSites;
const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
async function main() {
    assert.equal(config.validateLoginSites(defaults).length, 5);
    assert.equal(config.visibleLoginSites(defaults, { year: 7 }).length, 3);
    assert.equal(config.visibleLoginSites(defaults, { year: 9 }).length, 5);
    assert.equal(config.visibleLoginSites(defaults, { courseIds: ["STAFF"] }).length, 5);
    const edited = structuredClone(defaults);
    edited[0].url = "https://www.tinkercad.com/joinclass/NEWCODE";
    edited[0].readinessQuestion.match = "exact";
    edited[0].readinessQuestion.answers = ["teacher answer"];
    edited[1].hidden = true;
    edited[2].levels = ["staff"];
    assert.equal(config.publicLoginSites(edited).length, 4);
    const publicJson = JSON.stringify(config.publicLoginSites(edited));
    assert.ok(!publicJson.includes('"answers"') && !publicJson.includes('"match"') && !publicJson.includes("teacher answer"));
    assert.equal(config.visibleLoginSites(edited, { year: 7 }).length, 2);
    assert.equal(config.visibleLoginSites(edited, { year: 10 }).length, 3);
    assert.equal(config.visibleLoginSites(edited, { year: 12 }).length, 3);
    assert.equal(config.visibleLoginSites(edited, { courseIds: ["STAFF"] }).length, 4);
    assert.equal(assessment.gradeLoginSites({ tinkercad: "teacher answer" }, edited).answers.tinkercadReady, true);
    assert.equal(assessment.gradeLoginSites({ tinkercad: "Circuits, 3D Designs, Codeblocks" }, edited).answers.tinkercadReady, false);
    assert.equal(assessment.gradeLoginSites({ tinkercad: "Circuit, 3-D Design, Codeblock", codeavengers: "Variable, If Statement, Loop" }).score, 2);
    const noLevels = [{ ...edited[0], levels: [] }];
    assert.equal(config.visibleLoginSites(noLevels, null).length, 0);
    assert.equal(config.publicLoginSites(noLevels).length, 0);
    const correctAnswers = {
        tinkercad: "Circuits, 3D Designs, Codeblocks", codeavengers: "Variables, If Statements, Loops",
        "sketchup-tool-1": "Rectangle", "sketchup-tool-2": "Move", "sketchup-tool-3": "Push/Pull", "sketchup-tool-4": "Line",
        codecombat: "Python"
    };
    for (const profile of [{ year: 7 }, { year: 8 }, { year: 9 }, { year: 12 }, { courseIds: ["STAFF"] }]) {
        const visible = config.visibleLoginSites(defaults, profile);
        assert.equal(assessment.gradeLoginSites(correctAnswers, visible).passed, true);
        assert.equal(assessment.gradeLoginSites({ ...correctAnswers, tinkercad: "wrong", tinkercadReady: true }, visible).passed, false);
    }
    const juniorSites = config.visibleLoginSites(defaults, { year: 7 });
    assert.equal(assessment.gradeLoginSites({ ...correctAnswers, codecombat: "wrong", codeavengers: "wrong" }, juniorSites).passed, true, "Invisible app answers cannot block completion");
    assert.equal(assessment.gradeLoginSites({ ...correctAnswers, "sketchup-tool-4": "wrong" }, juniorSites).passed, false);
    assert.equal(assessment.gradeLoginSites({}, []).passed, false, "Empty visible list cannot award a tick");
    assert.equal(assessment.gradeLoginSites({}, defaults.filter((site) => !site.readinessQuestion)).passed, false, "No questions retains manual completion");
    const oneSite = [{ ...edited[0], readinessQuestion: { ...edited[0].readinessQuestion, answers: ["custom answer"] } }];
    assert.equal(assessment.gradeLoginSites({ tinkercad: "custom answer" }, oneSite).passed, true, "A single visible custom question completes the activity");
    const renderer = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "practical-skills", "kit-worksheet-render.js"), "utf8"), renderer);
    const host = { style: { setProperty() {} }, innerHTML: "" };
    for (const profile of [null, { year: 7 }, { year: 10 }, { year: 12 }, { courseIds: ["STAFF"] }]) {
        renderer.window.KitWorksheetRender.renderWorksheet(host, { loginSites: config.publicLoginSites(edited) }, { readOnly: true, huntProfile: profile });
        assert.equal((host.innerHTML.match(/class="login-staircase-step"/g) || []).length, config.visibleLoginSites(edited, profile).length);
        assert.doesNotMatch(host.innerHTML, /Code Avengers|teacher answer/);
    }
    renderer.window.KitWorksheetRender.renderWorksheet(host, { loginSites: noLevels }, { readOnly: true });
    assert.match(host.innerHTML, /No websites are currently enabled/);
    for (const patch of [
        { url: "javascript:alert(1)" }, { logo: "http://example.com/logo.png" },
        { levels: ["bad"] }, { hidden: "true" }, { name: "" },
        { readinessQuestion: { ...edited[0].readinessQuestion, answers: [] } }
    ]) assert.throws(() => config.validateLoginSites([{ ...edited[0], ...patch }]));
    assert.throws(() => config.validateLoginSites([edited[0], edited[0]]));
    const customContent = { ...base, activities: [{ ...base.activities[0], loginSites: edited }] };
    assert.deepEqual(assessment.withShortLoginKit("kit-login", customContent).activities[0].loginSites, config.validateLoginSites(edited));

    const handlers = {};
    let stored = structuredClone(base);
    let writes = 0;
    const context = vm.createContext({
        ...assessment, ...config, app: { get: (url, fn) => { handlers[`GET ${url}`] = fn; }, put: (url, fn) => { handlers[`PUT ${url}`] = fn; } },
        normalizeEmail: (email) => String(email || "").toLowerCase(), getRequestUserEmail: (req) => req.email,
        canManagePracticalSchedule: async (email) => email === "staff@school.nz",
        getStoredPracticalSkillsKitContent: async () => structuredClone(stored),
        savePracticalSkillsKitContent: async (_kit, content) => { stored = content; writes += 1; }
    });
    const start = server.indexOf('app.get("/api/practical-skills/login-sites/settings"');
    const end = server.indexOf('app.put("/api/admin/practical-skills/kit-content/:kitId"', start);
    assert.ok(start >= 0 && end > start);
    vm.runInContext(server.slice(start, end), context);
    const normalizerStart = server.indexOf("function normalizePracticalSkillsKitContentForStorage(");
    vm.runInContext(server.slice(normalizerStart, server.indexOf("function getDefaultPracticalSkillsKitContent(", normalizerStart)), context);
    const studentData = JSON.stringify(context.normalizePracticalSkillsKitContentForDisplay("kit-login", customContent));
    assert.ok(!studentData.includes("teacher answer") && !studentData.includes('"answers"') && !studentData.includes('"match"'));
    async function call(method, email, sites = edited) {
        const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
        await handlers[`${method} /api/practical-skills/login-sites/settings`]({ email, body: { sites } }, res);
        return res;
    }
    assert.equal((await call("GET", "")).code, 403);
    assert.equal((await call("GET", "student@school.nz")).code, 403);
    assert.equal((await call("PUT", "student@school.nz")).code, 403);
    assert.equal(writes, 0);
    assert.equal((await call("GET", "staff@school.nz")).body.sites.length, 5);
    assert.equal((await call("PUT", "staff@school.nz", [{ ...edited[0], url: "data:text/html,bad" }])).code, 400);
    assert.equal(writes, 0);
    assert.equal((await call("PUT", "staff@school.nz")).code, 200);
    assert.equal(writes, 1);
    assert.equal((await call("GET", "staff@school.nz")).body.sites[0].url, edited[0].url);
    context.savePracticalSkillsKitContent = async () => { throw new Error("Database unavailable"); };
    assert.equal((await call("PUT", "staff@school.nz")).code, 500);
    context.canManagePracticalSchedule = async () => { throw new Error("Access lookup failed"); };
    assert.equal((await call("GET", "staff@school.nz")).code, 500);
    console.log("Login site settings regression checks passed.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
