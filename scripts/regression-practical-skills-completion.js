"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assessment = require("../practical-skills-assessment");
const learningSites = require("../learning-sites-assessment");
const loginSitesConfig = require("../login-sites-config");

const root = path.join(__dirname, "..");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");

function extract(start, end) {
    const startIndex = server.indexOf(start);
    const endIndex = server.indexOf(end, startIndex);
    assert.ok(startIndex >= 0 && endIndex > startIndex, `Missing server section: ${start}`);
    return server.slice(startIndex, endIndex);
}

async function main() {
    const context = vm.createContext({
        hasDatabase: false,
        memoryPracticalSkillsProgress: new Map(),
        normalizeEmail: (email) => email.trim().toLowerCase(),
        ensurePracticalSkillsProgressSchema: async () => {},
        ...assessment,
        ...learningSites,
        ...loginSitesConfig,
        Date
    });
    vm.runInContext([
        extract("async function ensurePracticalSkillsProgressRow(", "async function getAllPracticalSkillsProgressRows("),
        extract("async function setPracticalSkillsKitCompletion(", "const DEFAULT_TEMPLATE_LIBRARY_ENTRIES"),
        extract("async function savePracticalSkillsKitResponses(", "async function ensureStudentHaparaFoldersSchema(")
    ].join("\n"), context);

    await context.savePracticalSkillsKitResponses("student@example.school.nz", "kit-login", { q1: "Student" });
    await context.setPracticalSkillsActivityCompletion("student@example.school.nz", "kit-login", 0, true);
    await context.setPracticalSkillsActivityCompletion("student@example.school.nz", "kit-login", 1, true);
    let row = await context.ensurePracticalSkillsProgressRow("student@example.school.nz", "kit-login");
    assert.ok(row.completed_activities["0"]);
    assert.ok(row.completed_activities["1"]);
    assert.equal(row.responses.q1, "Student");
    assert.equal(row.completed, false, "Activity completion must not award kit completion");

    await context.setPracticalSkillsActivityCompletion("student@example.school.nz", "kit-login", 0, false);
    row = await context.ensurePracticalSkillsProgressRow("student@example.school.nz", "kit-login");
    assert.equal(row.completed_activities["0"], undefined);
    assert.ok(row.completed_activities["1"], "Undo must preserve other ticks");
    const other = await context.ensurePracticalSkillsProgressRow("other@example.school.nz", "kit-login");
    assert.equal(other.completed_activities, undefined, "Ticks must be student-specific");

    await context.setPracticalSkillsKitCompletion("student@example.school.nz", "kit-login", true);
    row = await context.setPracticalSkillsKitCompletion("student@example.school.nz", "kit-login", false);
    assert.equal(Object.keys(row.completed_activities).length, 0);
    assert.equal(row.responses.q1, "Student", "Reset must preserve answers");

    const queries = [];
    context.hasDatabase = true;
    context.pool = {
        query: async (sql, values) => {
            queries.push({ sql, values });
            return { rows: [{}] };
        }
    };
    await context.setPracticalSkillsActivityCompletion("student@example.school.nz", "kit-login", 3, true);
    let update = queries.at(-1);
    assert.match(update.sql, /jsonb_set\(completed_activities/);
    assert.deepEqual(Array.from(update.values), ["3", update.values[1], "student@example.school.nz", "kit-login"]);
    await context.setPracticalSkillsActivityCompletion("student@example.school.nz", "kit-login", 3, false);
    update = queries.at(-1);
    assert.match(update.sql, /completed_activities - \$1::text/);
    assert.deepEqual(Array.from(update.values), ["3", "student@example.school.nz", "kit-login"]);
    assert.match(server, /ADD COLUMN IF NOT EXISTS completed_activities JSONB NOT NULL DEFAULT '\{\}'::jsonb/);

    let handler;
    let checkHandler;
    context.app = {
        get() {},
        put: (_url, callback) => { handler = callback; },
        post: (_url, callback) => { checkHandler = callback; }
    };
    context.SCHOOL_EMAIL_DOMAIN = "example.school.nz";
    context.getRequestUserEmail = (req) => req.email || "";
    context.getPracticalSkillsKitDefinition = (id) => id === "kit-login";
    context.getPracticalSkillsKitContent = async () => ({ worksheets: [{}, {}] });
    context.setPracticalSkillsActivityCompletion = async (_email, _kit, index, completed) => ({
        completed_activities: completed ? { [index]: "saved" } : {}
    });
    vm.runInContext(extract(
        'app.put("/api/practical-skills/progress/:kitId/activities/:activityIndex"',
        'app.get("/api/practical-skills/kit-content/:kitId"'
    ), context);
    async function request(overrides = {}) {
        const req = {
            email: "student@example.school.nz",
            params: { kitId: "kit-login", activityIndex: "0" },
            body: { completed: true },
            ...overrides
        };
        const res = {
            code: 200,
            status(code) { this.code = code; return this; },
            json(body) { this.body = body; }
        };
        await handler(req, res);
        return res;
    }
    assert.equal((await request({ email: "" })).code, 401);
    assert.equal((await request({ body: { completed: "true" } })).code, 400);
    assert.equal((await request({ params: { kitId: "kit-login", activityIndex: "-1" } })).code, 400);
    assert.equal((await request({ params: { kitId: "kit-login", activityIndex: "9" } })).code, 404);
    assert.equal((await request({ params: { kitId: "unknown", activityIndex: "0" } })).code, 404);
    assert.equal((await request()).body.completedActivities["0"], "saved");
    const configuredSites = assessment.withShortLoginKit("kit-login", { worksheets: [{ activity: "Using your login details" }] }).activities[0].loginSites;
    context.getPracticalSkillsKitContent = async () => ({ worksheets: [{}], activities: [{ loginSites: configuredSites }] });
    context.getLearningSitesStudentProfile = async () => ({ year: 7 });
    assert.equal((await request()).code, 409, "Visible questions cannot be bypassed with manual completion");
    assert.equal((await request({ body: { completed: false } })).code, 200, "Undo completion remains available");
    context.getPracticalSkillsKitContent = async () => ({ worksheets: [{}], activities: [{ loginSites: configuredSites.filter((site) => !site.readinessQuestion) }] });
    assert.equal((await request()).code, 200, "No-question activities retain manual completion");
    context.getPracticalSkillsKitContent = async () => ({ worksheets: [{}, {}] });
    context.setPracticalSkillsActivityCompletion = async () => { throw new Error("Database unavailable"); };
    assert.equal((await request()).code, 500, "Database failures must not report success");

    const answers = {
        "caps-lock": "caps",
        "wrong-account": "account",
        "unknown-user": "username",
        "no-internet": "connection",
        "locked-out": "teacher",
        forgotten: "reset",
        sharing: "private",
        "new-password": "replace",
        "help-message": "details",
        "suspicious-link": "report"
    };
    const pass = assessment.gradePasswordProblems(answers);
    assert.equal(pass.score, 10);
    assert.equal(pass.total, 10);
    assert.equal(pass.passed, true);
    const partial = assessment.gradePasswordProblems({ ...answers, sharing: "secret" });
    assert.equal(partial.score, 9);
    assert.equal(partial.passed, false, "All ten answers must be right");
    assert.equal(assessment.gradePasswordProblems({}).score, 0);
    assert.equal(assessment.gradePasswordProblems({ ...answers, "caps-lock": ["caps"] }).passed, false);
    assert.equal(assessment.gradePasswordProblems({ forgotten: "a real password" }).answers.forgotten, undefined);
    const studentAssessment = assessment.getStudentAssessment(assessment.PASSWORD_PROBLEMS_ID);
    assert.ok(studentAssessment.matches.every((question) => !("answer" in question)));
    assert.ok(studentAssessment.quiz.every((question) => !("answer" in question)));
    const authored = {
        worksheets: [{ activity: "Other" }, { activity: "Password Problems" }],
        activities: [null, { title: "My title", questions: [{ id: "custom" }] }]
    };
    const enhanced = assessment.withPasswordProblemsActivity("kit-login", authored);
    assert.equal(enhanced.activities[1].assessmentId, assessment.PASSWORD_PROBLEMS_ID);
    assert.equal(enhanced.activities[1].questions[0].id, "custom", "Keep teacher-authored content");
    assert.equal(authored.activities[1].assessmentId, undefined, "Do not mutate stored content");
    assert.equal(assessment.withPasswordProblemsActivity("kit-minecraft", authored), authored);

    const legacyIdentity = {
        worksheets: [{ activity: "Know Your Username and Email Address" }],
        questions: [{ id: "q1", type: "short-answer", prompt: "What is your school username?" }],
        activities: [{ images: [{ url: "example.png" }] }]
    };
    const identity = assessment.withLoginIdentityActivity("kit-login", legacyIdentity);
    assert.deepEqual(identity.activities[0].questions.map((question) => question.prompt), [
        "What is your first name?", "What is your last name?",
        "What is your username?", "What is your school email address?"
    ]);
    assert.equal(identity.activities[0].questions[2].id, "q1");
    assert.equal(identity.activities[0].images[0].url, "example.png");
    assert.equal(legacyIdentity.activities[0].questions, undefined);
    assert.equal(assessment.withLoginIdentityActivity("kit-login", identity), identity);
    assert.equal(assessment.withLoginIdentityActivity("kit-minecraft", legacyIdentity), legacyIdentity);
    const guide = identity.activities[0].information.paragraphs.join(" ");
    assert.match(guide, /v_pringle2@westlandhigh\.school\.nz/);
    assert.match(guide, /m_smithjones/);
    assert.match(guide, /administration error/);
    assert.match(guide, /deactivated/);
    const identityQuestions = identity.activities[0].questions;
    const realIdentity = { givenName: "Mia", familyName: "Smith-Jones", email: "m_smithjones2@westlandhigh.school.nz" };
    const identityAnswers = {
        "identity-first-name": " mia ",
        "identity-last-name": "SMITH-JONES",
        q1: "m_smithjones2",
        "identity-email": "M_SMITHJONES2@WESTLANDHIGH.SCHOOL.NZ"
    };
    assert.equal(assessment.gradeLoginIdentity(identityAnswers, realIdentity, identityQuestions).passed, true);
    assert.equal(assessment.gradeLoginIdentity({ ...identityAnswers, q1: "m_smithjones" }, realIdentity, identityQuestions).score, 3);
    assert.equal(assessment.gradeLoginIdentity({ ...identityAnswers, "identity-last-name": "SmithJones" }, realIdentity, identityQuestions).passed, false);
    assert.equal(assessment.gradeLoginIdentity({}, realIdentity, identityQuestions).score, 0);
    assert.throws(() => assessment.gradeLoginIdentity(identityAnswers, { ...realIdentity, familyName: "" }, identityQuestions), /missing name details/);
    const exceptionalAccount = { givenName: "Vanessa", familyName: "Pringle", email: "vanessapringle@westlandhigh.school.nz" };
    assert.equal(assessment.gradeLoginIdentity({
        "identity-first-name": "Vanessa", "identity-last-name": "Pringle",
        q1: "vanessapringle", "identity-email": exceptionalAccount.email
    }, exceptionalAccount, identityQuestions).passed, true);

    context.hasDatabase = false;
    let saved = await context.savePracticalSkillsAssessment("student@example.school.nz", "kit-login", 1, partial);
    assert.equal(saved.completed_activities["1"], undefined);
    assert.equal(saved.responses.q1, "Student");
    saved = await context.savePracticalSkillsAssessment("student@example.school.nz", "kit-login", 1, pass);
    assert.ok(saved.completed_activities["1"]);
    assert.equal(saved.responses["1-password-problems-v1"].sharing, "private");
    const otherRow = await context.ensurePracticalSkillsProgressRow("other@example.school.nz", "kit-login");
    assert.equal(otherRow.completed_activities, undefined);

    context.hasDatabase = true;
    await context.savePracticalSkillsAssessment("student@example.school.nz", "kit-login", 1, pass);
    update = queries.at(-1);
    assert.match(update.sql, /ELSE jsonb_set\(responses/);
    assert.match(update.sql, /completed_activities = CASE WHEN \$5::boolean/);
    assert.equal(update.values[4], true);
    await context.savePracticalSkillsAssessment("student@example.school.nz", "kit-login", 1, partial);
    assert.equal(queries.at(-1).values[4], false);
    const workingPool = context.pool;
    context.pool = { query: async () => ({ rows: [] }) };
    await assert.rejects(context.savePracticalSkillsAssessment("student@example.school.nz", "kit-login", 1, pass), /could not be saved/);
    context.pool = workingPool;

    context.getPracticalSkillsKitContent = async () => enhanced;
    assert.equal((await request({ params: { kitId: "kit-login", activityIndex: "1" } })).code, 409, "Self-marking activities cannot be manually ticked");
    context.getStoredPracticalSkillsKitContent = async () => enhanced;
    let storedGrade;
    context.savePracticalSkillsAssessment = async (_email, _kit, _index, grade) => {
        storedGrade = grade;
        return { completed_activities: grade.passed ? { 1: "saved" } : {} };
    };
    async function check(overrides = {}) {
        const req = {
            email: "student@example.school.nz",
            params: { kitId: "kit-login", activityIndex: "1" },
            body: { answers },
            ...overrides
        };
        const res = {
            code: 200,
            status(code) { this.code = code; return this; },
            json(body) { this.body = body; }
        };
        await checkHandler(req, res);
        return res;
    }
    assert.equal((await check()).body.completedActivities["1"], "saved");
    assert.equal(storedGrade.passed, true);
    assert.equal((await check({ body: { answers: { ...answers, sharing: "secret" }, passed: true } })).body.passed, false);
    assert.equal((await check({ email: "" })).code, 401);
    assert.equal((await check({ body: { answers: [] } })).code, 400);
    assert.equal((await check({ params: { kitId: "kit-login", activityIndex: "0" } })).code, 404);
    context.getStoredPracticalSkillsKitContent = async () => identity;
    assert.equal((await check({ params: { kitId: "kit-login", activityIndex: "0" } })).code, 401);
    context.SCHOOL_EMAIL_DOMAIN = "westlandhigh.school.nz";
    const identityChecked = await check({
        params: { kitId: "kit-login", activityIndex: "0" },
        auth_identity: { verified: true, givenName: "Mia", familyName: "Smith-Jones" },
        email: realIdentity.email,
        body: { answers: identityAnswers }
    });
    assert.equal(identityChecked.body.passed, true);
    assert.equal(storedGrade.identityLesson, true);
    context.hasDatabase = false;
    const identityGrade = assessment.gradeLoginIdentity(identityAnswers, realIdentity, identityQuestions);
    const originalSave = extract("async function savePracticalSkillsAssessment(", "async function ensureStudentHaparaFoldersSchema(");
    vm.runInContext(originalSave, context);
    const identityRow = await context.savePracticalSkillsAssessment(realIdentity.email, "kit-login", 0, identityGrade);
    assert.equal(identityRow.responses.q1, "m_smithjones2");
    assert.ok(identityRow.completed_activities["0"]);
    context.hasDatabase = true;
    await context.savePracticalSkillsAssessment(realIdentity.email, "kit-login", 0, identityGrade);
    assert.equal(queries.at(-1).values[7], true, "Identity answers use ordinary worksheet response keys");
    const appsGrade = { assessmentId: assessment.APPS_WORDSEARCH_ID, passed: true, answers: { paths: {}, microsoftReady: true } };
    context.hasDatabase = false;
    const appsRow = await context.savePracticalSkillsAssessment(realIdentity.email, "kit-login", 1, appsGrade);
    assert.equal(appsRow.responses["1-apps-wordsearch-v1"].microsoftReady, true);
    assert.equal(appsRow.responses.q1, "m_smithjones2", "Apps marking must preserve identity answers");
    assert.ok(appsRow.completed_activities["1"]);
    context.hasDatabase = true;
    await context.savePracticalSkillsAssessment(realIdentity.email, "kit-login", 1, appsGrade);
    assert.equal(queries.at(-1).values[0], "1-apps-wordsearch-v1");
    assert.equal(queries.at(-1).values[7], false);
    const huntGrade = { assessmentId: learningSites.LEARNING_SITES_ID, passed: true, answers: { course: "7DTECH", science: "evidence" } };
    context.hasDatabase = false;
    const huntRow = await context.savePracticalSkillsAssessment(realIdentity.email, "kit-login", 3, huntGrade);
    assert.equal(huntRow.responses["3-learning-sites-treasure-v1"].course, "7DTECH");
    assert.ok(huntRow.completed_activities["3"]);
    assert.ok(huntRow.completed_activities["0"], "Hunt completion must preserve identity completion");
    context.hasDatabase = true;
    await context.savePracticalSkillsAssessment(realIdentity.email, "kit-login", 3, huntGrade);
    assert.equal(queries.at(-1).values[0], "3-learning-sites-treasure-v1");
    const siteGrade = assessment.gradeLoginSites({
        tinkercad: "Circuits, 3D Designs and Codeblocks",
        "sketchup-tool-1": "Rectangle", "sketchup-tool-2": "Move", "sketchup-tool-3": "Push/Pull", "sketchup-tool-4": "Line"
    });
    context.hasDatabase = false;
    const siteRow = await context.savePracticalSkillsAssessment(realIdentity.email, "kit-login", 6, siteGrade);
    assert.equal(siteRow.responses["6-login-sites-readiness-v1"].sketchupReady, true);
    assert.equal(siteRow.responses["6-login-sites-readiness-v1"].tinkercadReady, true);
    assert.equal(siteRow.completed_activities["6"], undefined);
    const limitedGrade = { ...siteGrade, answers: { tinkercad: "changed", tinkercadReady: false } };
    const preserved = await context.savePracticalSkillsAssessment(realIdentity.email, "kit-login", 6, limitedGrade);
    assert.equal(preserved.responses["6-login-sites-readiness-v1"].sketchupReady, true, "Hidden site evidence remains stored");
    assert.equal(preserved.responses["6-login-sites-readiness-v1"].tinkercadReady, false, "Visible site evidence is updated");
    context.hasDatabase = true;
    await context.savePracticalSkillsAssessment(realIdentity.email, "kit-login", 6, siteGrade);
    assert.equal(queries.at(-1).values[0], "6-login-sites-readiness-v1");
    assert.equal(queries.at(-1).values[4], false);
    assert.equal(queries.at(-1).values[8], true, "SQL merges site evidence without deleting hidden site answers");
    const completedSiteGrade = assessment.gradeLoginSites({
        tinkercad: "Circuits, 3D Designs, Codeblocks", codeavengers: "Variables, If Statements, Loops", codecombat: "Python",
        "sketchup-tool-1": "Rectangle", "sketchup-tool-2": "Move", "sketchup-tool-3": "Push/Pull", "sketchup-tool-4": "Line"
    });
    assert.equal(completedSiteGrade.passed, true);
    context.hasDatabase = false;
    const completedSites = await context.savePracticalSkillsAssessment(realIdentity.email, "kit-login", 6, completedSiteGrade);
    assert.ok(completedSites.completed_activities["6"], "All visible questions save a persistent activity tick");
    assert.equal((await context.ensurePracticalSkillsProgressRow(realIdentity.email, "kit-login")).completed_activities["6"], completedSites.completed_activities["6"]);
    context.hasDatabase = true;
    await context.savePracticalSkillsAssessment(realIdentity.email, "kit-login", 6, completedSiteGrade);
    assert.equal(queries.at(-1).values[4], true, "SQL persists the automatic completion tick");
    context.SCHOOL_EMAIL_DOMAIN = "example.school.nz";
    context.getStoredPracticalSkillsKitContent = async () => enhanced;
    context.savePracticalSkillsAssessment = async () => { throw new Error("Database unavailable"); };
    assert.equal((await check()).code, 500, "Do not award ticks when saving fails");

    const rendererContext = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(root, "practical-skills", "kit-worksheet-render.js"), "utf8"), rendererContext);
    const host = { style: { setProperty() {} }, innerHTML: "" };
    rendererContext.window.KitWorksheetRender.renderKitOverview(host, {
        bannerTitle: "Login Kit",
        worksheets: [{ activity: "First" }, { activity: "<Second>" }]
    }, { kitId: "kit-login", completedActivities: { 1: "saved" } });
    assert.match(host.innerHTML, /1 \/ 2 activities completed/);
    assert.equal((host.innerHTML.match(/&#10003;/g) || []).length, 1);
    assert.match(host.innerHTML, /aria-label="Not completed"/);
    assert.match(host.innerHTML, /aria-label="Completed"/);
    assert.match(host.innerHTML, /&lt;Second&gt;/);
    assert.match(host.innerHTML, /activity=1/);
    rendererContext.window.KitWorksheetRender.renderWorksheet(host, {
        bannerTitle: "Password Problems",
        assessment: studentAssessment,
        questions: []
    }, { readOnly: true, assessmentAnswers: answers });
    assert.equal((host.innerHTML.match(/<select /g) || []).length, 5);
    assert.equal((host.innerHTML.match(/type="radio"/g) || []).length, 15);
    assert.match(host.innerHTML, /value="caps" selected/);
    assert.match(host.innerHTML, /Check my answers/);
    assert.match(host.innerHTML, /One school username\. You may have TWO passwords!/);
    assert.match(host.innerHTML, /Changing your KAMAR\/Google password does NOT change your Microsoft password/);
    assert.match(host.innerHTML, /Microsoft \+ Computer Room Windows PCs/);
    assert.match(host.innerHTML, /aria-labelledby="password-reminder-title"/);
    assert.doesNotMatch(host.innerHTML, /does not have any questions/);
    rendererContext.window.KitWorksheetRender.renderWorksheet(host, {
        bannerTitle: "Know Your Username and Email Address",
        ...identity.activities[0]
    }, { readOnly: true, responses: { q1: "v_pringle2" } });
    assert.match(host.innerHTML, /How WHS usernames are made/);
    assert.match(host.innerHTML, /What is your first name\?/);
    assert.match(host.innerHTML, /What is your last name\?/);
    assert.match(host.innerHTML, /What is your school email address\?/);
    assert.match(host.innerHTML, />v_pringle2<\/textarea>/);
    assert.equal((host.innerHTML.match(/<textarea /g) || []).length, 4);

    const nodes = new Map();
    const events = {};
    const document = {
        getElementById(id) {
            if (!nodes.has(id)) {
                nodes.set(id, {
                    hidden: true,
                    setAttribute(name, value) { this[name] = value; },
                    removeAttribute(name) { delete this[name]; },
                    after() {},
                    querySelector() { return { before() {} }; },
                    classList: { toggle() {}, remove() {} },
                    addEventListener(name, callback) { events[`${id}:${name}`] = callback; }
                });
            }
            return nodes.get(id);
        }
    };
    let savedTicks = {};
    let failSave = false;
    let overviewTicks;
    const browserContext = {
        document,
        URLSearchParams,
        localStorage: { getItem: () => JSON.stringify({ expiresAt: Date.now() + 60000, profile: { email: "student@example.school.nz" } }) },
        sessionStorage: { getItem: () => null },
        fetch: async (url, options = {}) => {
            if (url.includes("/activities/")) {
                if (failSave) return { ok: false, status: 500, json: async () => ({ error: "Save failed" }) };
                savedTicks = JSON.parse(options.body).completed ? { 0: "saved" } : {};
                return { ok: true, json: async () => ({ completedActivities: savedTicks }) };
            }
            return { ok: true, json: async () => url.includes("/kit-content/") ? {
                content: { bannerTitle: "Kit", worksheets: [{ activity: "First" }] }
            } : { responses: { q1: "Answer" }, completedActivities: savedTicks, kit: { isComplete: false } } };
        },
        window: {
            location: { search: "?kit=kit-login&activity=0" },
            clearTimeout() {},
            setTimeout() {},
            KitWorksheetRender: {
                visibleLoginSites: rendererContext.window.KitWorksheetRender.visibleLoginSites,
                renderWorksheet() {},
                renderKitOverview(_host, _content, options) { overviewTicks = options.completedActivities; }
            }
        }
    };
    vm.runInNewContext(fs.readFileSync(path.join(root, "practical-skills", "kit-worksheet.js"), "utf8"), browserContext);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(nodes.get("worksheet-complete-bar").hidden, true, "Kit completion must not appear inside an activity");
    assert.equal(nodes.get("worksheet-activity-complete-bar").hidden, false);
    assert.equal(nodes.get("worksheet-activity-status-pill").href, undefined, "Incomplete activity status must not be a link");
    await events["worksheet-activity-complete-btn:click"]();
    assert.equal(nodes.get("worksheet-activity-status-pill").textContent, "Completed");
    assert.equal(nodes.get("worksheet-activity-status-pill").href, "./kit-worksheet.html?kit=kit-login");
    assert.match(nodes.get("worksheet-activity-status-pill")["aria-label"], /return to kit activity menu/);
    assert.equal(nodes.get("worksheet-activity-complete-btn").textContent, "Undo Completion");

    failSave = true;
    await events["worksheet-activity-complete-btn:click"]();
    assert.equal(nodes.get("worksheet-activity-status-pill").textContent, "Completed", "Failed saves must preserve the confirmed tick");
    assert.equal(nodes.get("worksheet-status-message").textContent, "Save failed");
    failSave = false;

    browserContext.window.location.search = "?kit=kit-login";
    vm.runInNewContext(fs.readFileSync(path.join(root, "practical-skills", "kit-worksheet.js"), "utf8"), browserContext);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(overviewTicks["0"], "saved", "Reopening the list must load saved completion");
    assert.equal(nodes.get("worksheet-activity-complete-bar").hidden, true);
    assert.equal(nodes.get("worksheet-complete-bar").hidden, false);

    browserContext.window.location.search = "?kit=kit-login&activity=0";
    vm.runInNewContext(fs.readFileSync(path.join(root, "practical-skills", "kit-worksheet.js"), "utf8"), browserContext);
    await new Promise((resolve) => setImmediate(resolve));
    await events["worksheet-activity-complete-btn:click"]();
    assert.equal(nodes.get("worksheet-activity-status-pill").textContent, "Not Completed");
    assert.equal(nodes.get("worksheet-activity-status-pill").href, undefined, "Undo must remove the completion link");

    let worksheetOptions;
    let assessmentTicks = {};
    browserContext.window.location.search = "?kit=kit-login&activity=2";
    browserContext.window.KitWorksheetRender.renderWorksheet = (_host, _content, options) => { worksheetOptions = options; };
    browserContext.fetch = async (url, options = {}) => {
        if (url.endsWith("/check")) {
            if (failSave) return { ok: false, status: 500, json: async () => ({ error: "Database unavailable" }) };
            const marked = assessment.gradePasswordProblems(JSON.parse(options.body).answers);
            if (marked.passed) assessmentTicks = { 2: "saved" };
            return { ok: true, json: async () => ({ ...marked, completedActivities: assessmentTicks }) };
        }
        return { ok: true, json: async () => url.includes("/kit-content/") ? {
            content: {
                bannerTitle: "Kit",
                worksheets: [{}, {}, { activity: "Password Problems" }],
                activities: [null, null, { assessment: studentAssessment }]
            }
        } : { responses: {}, completedActivities: assessmentTicks, kit: { isComplete: false } } };
    };
    vm.runInNewContext(fs.readFileSync(path.join(root, "practical-skills", "kit-worksheet.js"), "utf8"), browserContext);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(nodes.get("worksheet-activity-complete-btn").hidden, true);
    await worksheetOptions.onAssessmentCheck({ ...answers, sharing: "secret" });
    assert.equal(nodes.get("worksheet-activity-status-pill").textContent, "Not Completed");
    failSave = true;
    await assert.rejects(worksheetOptions.onAssessmentCheck(answers), /Database unavailable/);
    assert.equal(nodes.get("worksheet-activity-status-pill").textContent, "Not Completed");
    failSave = false;
    await worksheetOptions.onAssessmentCheck(answers);
    assert.equal(nodes.get("worksheet-activity-status-pill").textContent, "Completed");
    assert.equal(nodes.get("worksheet-activity-status-pill").href, "./kit-worksheet.html?kit=kit-login",
        "Self-marked completion must link to the same kit menu");
    vm.runInNewContext(fs.readFileSync(path.join(root, "practical-skills", "kit-worksheet.js"), "utf8"), browserContext);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(nodes.get("worksheet-activity-status-pill").textContent, "Completed");
    let siteTicks = {};
    let siteResponses = { codecombatReady: true };
    let siteChecks = 0;
    const juniorSiteAnswers = {
        tinkercad: "Circuits, 3D Designs, Codeblocks",
        "sketchup-tool-1": "Rectangle", "sketchup-tool-2": "Move", "sketchup-tool-3": "Push/Pull", "sketchup-tool-4": "Line"
    };
    browserContext.fetch = async (url, options = {}) => {
        if (url.endsWith("/check")) {
            siteChecks += 1;
            if (failSave) return { ok: false, status: 500, json: async () => ({ error: "Database unavailable" }) };
            const marked = assessment.gradeLoginSites(JSON.parse(options.body).answers, loginSitesConfig.visibleLoginSites(configuredSites, { year: 7 }));
            siteResponses = { ...siteResponses, ...marked.answers };
            if (marked.passed) siteTicks = { 2: "saved" };
            return { ok: true, json: async () => ({ ...marked, completedActivities: siteTicks }) };
        }
        if (url.endsWith("/learning-sites/profile")) return { ok: true, json: async () => ({ year: 7 }) };
        return { ok: true, json: async () => url.includes("/kit-content/") ? {
            content: { bannerTitle: "Kit", worksheets: [{}, {}, { activity: "Using your login details" }], activities: [null, null, { loginSites: configuredSites }] }
        } : { responses: { "2-login-sites-readiness-v1": siteResponses }, completedActivities: siteTicks, kit: { isComplete: false } } };
    };
    vm.runInNewContext(fs.readFileSync(path.join(root, "practical-skills", "kit-worksheet.js"), "utf8"), browserContext);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(nodes.get("worksheet-activity-complete-btn").hidden, false);
    assert.equal(nodes.get("worksheet-activity-complete-btn").textContent, "Check Activity Completion");
    assert.equal(siteChecks, 1, "Saved evidence is regraded when reopening an incomplete activity");
    await worksheetOptions.onAssessmentCheck({ ...juniorSiteAnswers, tinkercad: "wrong" });
    assert.equal(nodes.get("worksheet-activity-status-pill").textContent, "Not Completed");
    assert.match(nodes.get("worksheet-status-message").textContent, /Tinkercad/);
    failSave = true;
    await assert.rejects(worksheetOptions.onAssessmentCheck(juniorSiteAnswers), /Database unavailable/);
    assert.equal(nodes.get("worksheet-activity-status-pill").textContent, "Not Completed");
    failSave = false;
    await worksheetOptions.onAssessmentCheck(juniorSiteAnswers);
    assert.equal(nodes.get("worksheet-activity-status-pill").textContent, "Completed");
    assert.equal(nodes.get("worksheet-activity-status-pill").href, "./kit-worksheet.html?kit=kit-login");
    vm.runInNewContext(fs.readFileSync(path.join(root, "practical-skills", "kit-worksheet.js"), "utf8"), browserContext);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(nodes.get("worksheet-activity-status-pill").textContent, "Completed", "Site completion survives reload");
    siteTicks = {};
    siteResponses = { ...juniorSiteAnswers, tinkercadReady: true, sketchupReady: true };
    vm.runInNewContext(fs.readFileSync(path.join(root, "practical-skills", "kit-worksheet.js"), "utf8"), browserContext);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(nodes.get("worksheet-activity-status-pill").textContent, "Completed", "Previously correct saved answers automatically earn the missing tick on reload");
    siteTicks = {};
    siteResponses = {};
    vm.runInNewContext(fs.readFileSync(path.join(root, "practical-skills", "kit-worksheet.js"), "utf8"), browserContext);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(nodes.get("worksheet-activity-status-pill").textContent, "Not Completed");
    nodes.get("worksheet-host").querySelectorAll = () => Object.entries(juniorSiteAnswers).map(([name, value]) => ({ name, value }));
    await events["worksheet-activity-complete-btn:click"]();
    assert.equal(nodes.get("worksheet-activity-status-pill").textContent, "Completed", "Completion button checks current fields and awards the tick");
    const verificationNode = nodes.get("worksheet-google-verification");
    const worksheetHost = nodes.get("worksheet-host");
    const layoutResult = {
        before(node) {
            layout.splice(layout.indexOf(this), 0, node);
        }
    };
    const layoutButton = {};
    let layout = [];
    worksheetHost.after = (node) => {
        layout = layout.filter((child) => child !== node);
    };
    worksheetHost.querySelector = (selector) => {
        assert.equal(selector, "#identity-result");
        return layoutResult;
    };
    browserContext.window.location.search = "?kit=kit-login&activity=0";
    browserContext.window.KitWorksheetRender.renderWorksheet = () => {
        assert.ok(!layout.includes(verificationNode), "Detach the Google button before replacing worksheet HTML");
        layout = [layoutResult, layoutButton];
    };
    browserContext.fetch = async (url) => ({
        ok: true,
        json: async () => url.includes("/kit-content/") ? {
            content: {
                bannerTitle: "Kit",
                worksheets: [{ activity: "Identity" }],
                activities: [{ identityLessonVersion: 1, questions: identityQuestions }]
            }
        } : { responses: {}, completedActivities: {}, kit: { isComplete: false } }
    });
    for (let render = 0; render < 2; render += 1) {
        vm.runInNewContext(fs.readFileSync(path.join(root, "practical-skills", "kit-worksheet.js"), "utf8"), browserContext);
        await new Promise((resolve) => setImmediate(resolve));
        assert.deepEqual(layout, [verificationNode, layoutResult, layoutButton],
            "Step 5 must precede the marking message and Check your answers before any check runs");
        assert.equal(verificationNode.hidden, false);
    }
    const inputEvents = {};
    const identityInputs = identityQuestions.map((question) => ({
        value: identityAnswers[question.id],
        getAttribute: () => question.id,
        addEventListener: (event, callback) => { inputEvents[`${question.id}:${event}`] = callback; }
    }));
    const feedbackNodes = identityQuestions.map((question) => ({
        classList: { remove() {}, toggle() {} },
        getAttribute: () => question.id
    }));
    const resultNode = { classList: { remove() {}, toggle() {}, add() {} } };
    let retry;
    let pendingCheck;
    const interactiveHost = {
        style: { setProperty() {} },
        querySelector: (selector) => selector === "#identity-result" ? resultNode : {
            addEventListener: (_event, callback) => { retry = callback; }
        },
        querySelectorAll: (selector) => selector === ".worksheet-answer-input" ? identityInputs : feedbackNodes
    };
    rendererContext.window.clearTimeout = () => {};
    rendererContext.window.setTimeout = (callback) => { pendingCheck = callback; };
    let identityCheckFail = false;
    rendererContext.window.KitWorksheetRender.renderWorksheet(interactiveHost, {
        questions: identityQuestions,
        identityLessonVersion: 1
    }, {
        onIdentityCheck: async (values) => {
            if (identityCheckFail) throw new Error("Connection failed");
            return assessment.gradeLoginIdentity(values, realIdentity, identityQuestions);
        }
    });
    identityInputs[2].value = "wrong";
    inputEvents["q1:input"]();
    await pendingCheck();
    assert.match(feedbackNodes[2].textContent, /before @/);
    assert.match(resultNode.textContent, /3 \/ 4/);
    identityInputs[2].value = "m_smithjones2";
    inputEvents["q1:input"]();
    await pendingCheck();
    assert.match(resultNode.textContent, /completion tick is saved/);
    identityCheckFail = true;
    retry();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(resultNode.textContent, "Connection failed");
    pendingCheck = null;
    rendererContext.window.KitWorksheetRender.renderWorksheet(interactiveHost, {
        questions: identityQuestions,
        identityLessonVersion: 1
    }, { identityVerified: false, onIdentityCheck: async () => { throw new Error("Must not auto-check before verification"); } });
    inputEvents["q1:input"]();
    assert.equal(pendingCheck, null);
    assert.match(feedbackNodes[2].textContent, /step 5/);
    assert.match(interactiveHost.innerHTML, /Check your answers/);
    const worksheetPage = fs.readFileSync(path.join(root, "practical-skills", "kit-worksheet.html"), "utf8");
    assert.match(worksheetPage, /<a id="worksheet-activity-status-pill"/, "Use a native link for keyboard navigation");
    assert.match(worksheetPage, /worksheet-question-number" aria-hidden="true">5</);
    const worksheetScript = fs.readFileSync(path.join(root, "practical-skills", "kit-worksheet.js"), "utf8");
    assert.match(worksheetScript, /querySelector\("#identity-result"\)\.before\(verification\)/);
    assert.match(worksheetScript, /progressPayload\?\.responses, \.\.\.identityDraft/);
    console.log("Practical Skills completion regression checks passed.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
