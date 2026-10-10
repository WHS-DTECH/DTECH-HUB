"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { PDFParse } = require("pdf-parse");
const certificateTools = require("../practical-skills-certificate");
const assessment = require("../practical-skills-assessment");
const loginSites = require("../login-sites-config");
const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
function extract(start, end) {
    const from = source.indexOf(start);
    const to = source.indexOf(end, from);
    assert.ok(from >= 0 && to > from);
    return source.slice(from, to);
}
const settle = () => new Promise((resolve) => setTimeout(resolve, 1500));
async function main() {
    const content = {
        bannerTitle: "Login Kit",
        worksheets: [{ activity: "First" }, { activity: "Second" }, { hidden: true }, { mergedInto: 1 }],
        activities: [{}, {}]
    };
    const email = "student@example.school.nz";
    const handlers = {};
    const sent = [];
    const queries = [];
    const context = vm.createContext({
        ...certificateTools, ...assessment, ...loginSites,
        app: Object.fromEntries(["get", "post", "put"].map((method) => [method, (url, handler) => { handlers[`${method} ${url}`] = handler; }])),
        hasDatabase: false, memoryPracticalSkillsProgress: new Map(),
        SEARCH_RESULTS_DETECTIVE_ID: "search-results-detective-v1", SEARCH_AND_FIND_ID: "search-and-find-v1",
        normalizeEmail: (value) => String(value || "").trim().toLowerCase(),
        SCHOOL_EMAIL_DOMAIN: "example.school.nz", getRequestUserEmail: (req) => req.email,
        PRACTICAL_SKILLS_KIT_DEFINITIONS: [{ id: "kit-login" }],
        getPracticalSkillsKitDefinition: (id) => id === "kit-login",
        getStoredPracticalSkillsKitContent: async () => content,
        getPracticalSkillsKitContent: async () => content,
        getStaffDirectoryRows: async () => [],
        getStudentDirectoryRows: async () => [],
        collectDirectoryEmails: (entry) => [entry.email_school],
        buildStudentClassManagementRow: (entry) => entry,
        dedupeToLatestStudentRows: (entries) => entries,
        ensurePracticalSkillsProgressSchema: async () => {},
        computePracticalSkillsSnapshot: (rows) => ({ kits: rows.map((row) => ({ id: row.kit_id, isComplete: row.completed, completedAt: row.completed_at })), badges: [] }),
        smtpTransporter: {}, SMTP_FROM: "hub@example.school.nz",
        sendConfiguredHubEmail: async (options) => { sent.push(options); },
        getHubEmailErrorMessage: (error) => error.message,
        console: { error() {} },
        pool: { query: async (sql, values) => { queries.push({ sql, values }); return { rows: [{ student_email: email, kit_id: "kit-login", completed: true }] }; } }
    });
    vm.runInContext([
        extract("async function ensurePracticalSkillsProgressRow(", "const DEFAULT_TEMPLATE_LIBRARY_ENTRIES"),
        extract("async function savePracticalSkillsKitResponses(", "async function ensureStudentHaparaFoldersSchema("),
        extract("async function syncPracticalSkillsKitCompletion(", 'app.post("/api/practical-skills/progress/:kitId/responses"'),
        extract('app.put("/api/practical-skills/progress/:kitId/activities/:activityIndex"', 'app.get("/api/practical-skills/kit-content/:kitId"')
    ].join("\n"), context);
    async function call(method, suffix, overrides = {}) {
        const route = `${method} /api/practical-skills/progress/:kitId${suffix}`;
        const response = {
            code: 200, headers: {}, status(code) { this.code = code; return this; },
            json(body) { this.body = body; return this; }, send(body) { this.body = body; return this; },
            set(key, value) { this.headers[key] = value; return this; },
            type(value) { this.headers.type = value; return this; },
            attachment(value) { this.headers.attachment = value; return this; }
        };
        await handlers[route]({
            email, params: { kitId: "kit-login", activityIndex: "0" },
            auth_identity: { verified: true, email, givenName: "Māia", familyName: "Student" },
            body: { completed: true, to: "someone@outside.example", studentName: "Spoofed name" }, ...overrides
        }, response);
        return response;
    }
    assert.deepEqual(certificateTools.visibleActivityIndexes(content), ["0", "1"]);
    assert.equal((await call("get", "/certificate.pdf", { email: "" })).code, 401);
    assert.equal((await call("post", "/certificate/email", { email: "external@elsewhere.test" })).code, 401);
    assert.equal((await call("get", "/certificate.pdf", { params: { kitId: "unknown" } })).code, 404);
    assert.equal((await call("get", "/certificate.pdf")).code, 409);
    assert.equal((await call("post", "/certificate/email")).code, 409);
    assert.equal(sent.length, 0);
    assert.equal((await call("post", "/complete")).code, 409, "Whole-kit completion cannot bypass unfinished activities");
    assert.equal((await call("put", "/activities/:activityIndex")).code, 200);
    assert.equal((await call("get", "")).body.kit.isComplete, false);
    assert.equal((await call("get", "")).body.certificate, null);
    assert.equal((await call("put", "/activities/:activityIndex", { params: { kitId: "kit-login", activityIndex: "1" } })).code, 200);
    const progress = (await call("get", "")).body;
    await settle();
    assert.equal(progress.kit.isComplete, true, "Last activity automatically persists kit completion");
    assert.equal(sent.length, 1, "Completing the kit automatically emails the certificate once");
    assert.equal(sent[0].to, email);
    assert.equal(sent[0].emailType, "kit_certificate");
    assert.ok(context.memoryPracticalSkillsProgress.get(`${email}:kit-login`).certificate_emailed_at);
    await call("get", "");
    await call("get", "");
    assert.equal(sent.length, 1, "Reloading the kit never resends the automatic email");
    assert.equal(progress.certificate.studentName, "Māia Student");
    assert.equal(progress.certificate.studentEmail, email);
    const dashboardResponse = {
        code: 200, status(code) { this.code = code; return this; },
        json(body) { this.body = body; return this; }
    };
    await handlers["get /api/practical-skills/my-progress"]({
        email, auth_identity: { verified: true, email, givenName: "Māia", familyName: "Student" }
    }, dashboardResponse);
    assert.equal(dashboardResponse.code, 200);
    assert.equal(dashboardResponse.body.student.name, progress.certificate.studentName, "Dashboard and certificate share the verified identity");
    assert.equal(dashboardResponse.body.student.email, email);
    assert.equal(dashboardResponse.body.kits[0].isComplete, true, "Identity metadata preserves saved kit awards");
    assert.equal(progress.certificate.activityCount, 2);
    const date = progress.certificate.completedAt;
    assert.equal((await call("get", "")).body.certificate.completedAt, date, "Reload keeps the original award date");
    assert.equal((await call("post", "/complete")).code, 200);
    assert.equal((await call("get", "")).body.certificate.completedAt, date, "Repeated completion does not change the date");
    const download = await call("get", "/certificate.pdf");
    assert.equal(download.code, 200);
    assert.equal(download.headers.type, "application/pdf");
    assert.equal(download.headers["Cache-Control"], "private, no-store");
    assert.ok(Buffer.isBuffer(download.body));
    assert.match(download.body.subarray(0, 8).toString(), /^%PDF-/);
    assert.match(download.body.toString("latin1"), /\/Subtype \/Image/, "School logo is embedded in the downloaded and emailed certificate PDF");
    const parser = new PDFParse({ data: download.body });
    try {
        const info = await parser.getInfo({ parsePageInfo: true });
        assert.equal(info.total, 1);
        assert.ok(Math.abs(info.pages[0].width - 841.89) < 1 && Math.abs(info.pages[0].height - 595.28) < 1, "One-page A4 landscape PDF");
        const text = await parser.getText();
        assert.match(text.text, /Certificate of Completion/);
        assert.match(text.text, /DTECH-HUB Licence/);
        assert.match(text.text, /Māia Student/, "Unicode student names survive PDF generation");
        assert.ok(!text.text.includes(email), "No duplicate email line below the recipient name");
        assert.match(text.text, /Login Kit/);
        assert.match(text.text, /2 activities completed/);
    } finally { await parser.destroy(); }
    const emailed = await call("post", "/certificate/email");
    assert.equal(emailed.code, 200);
    assert.equal(emailed.body.recipient, email);
    assert.equal(sent.length, 2, "Manual Email me a copy still sends on request");
    assert.equal(sent[1].to, email, "Recipient is server-derived, never a client-supplied address");
    assert.equal(sent[1].attachment.mimetype, "application/pdf");
    assert.ok(sent[1].attachment.buffer.length > 1000);
    assert.equal(sent[1].emailType, "kit_certificate");
    assert.equal((await call("post", "/certificate/email")).code, 429, "Repeated sends are throttled");
    assert.equal((await call("get", "", { auth_identity: { verified: false, givenName: "Spoof" } })).body.certificate.studentName, email);
    context.memoryStaffDirectory = new Map([[email, { email_school: email, first_name: "Vanessa", last_name: "Pringle" }]]);
    context.STAFF_TABLE_CANDIDATES = ["staff_upload", "upload_staff"];
    context.resolveExistingTableNames = async () => ["staff_upload"];
    context.quoteIdentifier = (value) => `"${value}"`;
    vm.runInContext(extract("async function getStaffDirectoryRows(", "function mergeUniqueStrings("), context);
    assert.equal((await call("get", "", { auth_identity: { verified: false, givenName: "Spoof" } })).body.certificate.studentName, "Vanessa Pringle", "Staff directory supplies first and last names without a Google ID token");
    context.memoryStaffDirectory.clear();
    context.getStudentDirectoryRows = async () => [{ linked_emails: [email], student_name: "Māia Student" }];
    assert.equal((await call("get", "", { auth_identity: { verified: false } })).body.certificate.studentName, "Māia Student", "Linked student profile supplies the full name");
    assert.equal((await call("get", "", { auth_identity: { verified: true, email: "other@example.school.nz", givenName: "Wrong", familyName: "Account" } })).body.certificate.studentName, "Māia Student", "Mismatched identity cannot replace the school profile name");
    context.getStudentDirectoryRows = async () => [];
    await call("put", "/activities/:activityIndex", { body: { completed: false } });
    const undone = (await call("get", "")).body;
    assert.equal(undone.kit.isComplete, false, "Undo revokes kit completion without losing other ticks");
    assert.equal(undone.certificate, null);
    assert.ok(undone.completedActivities["1"]);
    assert.equal((await call("get", "/certificate.pdf")).code, 409);
    content.activities[0] = { loginSites: [{ id: "scratch", name: "Scratch", hidden: false, levels: ["junior"],
        readinessQuestion: { id: "scratch", prompt: "Who codes here?", hint: "Read the page.", match: "exact", answers: ["Scratchers"] } }] };
    context.getLearningSitesStudentProfile = async () => ({ year: 7 });
    assert.equal((await call("post", "/activities/:activityIndex/check", { body: { answers: { scratch: "Scratchers" } } })).body.passed, true);
    assert.equal(context.memoryPracticalSkillsProgress.get(`${email}:kit-login`).completed, true, "Final self-marked activity persists kit completion immediately");
    assert.equal((await call("get", "")).body.kit.isComplete, true);
    await settle();
    assert.equal(sent.length, 2, "Undo and re-complete does not resend the automatic email");
    content.activities[0] = {};
    await call("post", "/reset");
    assert.equal(context.memoryPracticalSkillsProgress.get(`${email}:kit-login`).certificate_emailed_at, null, "Full kit reset re-enables the automatic email");
    assert.equal((await call("get", "")).body.certificate, null);
    context.sendConfiguredHubEmail = async () => { throw new Error("Mail unavailable"); };
    await call("put", "/activities/:activityIndex");
    await call("put", "/activities/:activityIndex", { params: { kitId: "kit-login", activityIndex: "1" } });
    await settle();
    assert.equal(context.memoryPracticalSkillsProgress.get(`${email}:kit-login`).certificate_emailed_at, null, "Failed automatic email releases its claim");
    context.sendConfiguredHubEmail = async (options) => { sent.push(options); };
    assert.equal((await call("get", "")).body.certificateEmailed, true, "Automatic email retries on the next page load");
    assert.equal(sent.length, 3);
    await call("post", "/reset");
    assert.equal((await call("get", "")).body.certificate, null);
    assert.equal(certificateTools.allActivitiesComplete({ worksheets: [] }, { completed_activities: {} }), false);
    context.smtpTransporter = null;
    assert.equal((await call("post", "/certificate/email")).code, 503);
    context.smtpTransporter = {};
    vm.runInContext("certificateEmailCooldowns.clear()", context);
    await call("put", "/activities/:activityIndex");
    await call("put", "/activities/:activityIndex", { params: { kitId: "kit-login", activityIndex: "1" } });
    context.sendConfiguredHubEmail = async () => { throw new Error("Mail unavailable"); };
    assert.equal((await call("post", "/certificate/email")).code, 500);
    context.sendConfiguredHubEmail = async (options) => { sent.push(options); };
    assert.equal((await call("post", "/certificate/email")).code, 200, "Failed mail can be retried");
    context.hasDatabase = true;
    const originalQuery = context.pool.query;
    context.pool.query = async (sql) => {
        assert.equal(sql, 'SELECT * FROM "staff_upload"');
        return { rows: [{ email_school: email, first_name: "Vanessa", last_name: "Pringle" }] };
    };
    assert.equal((await context.getStaffDirectoryRows())[0].first_name, "Vanessa", "Real database staff helper is defined and reads the staff table");
    context.pool.query = originalQuery;
    context.ensurePracticalSkillsProgressRow = async () => ({ student_email: email, kit_id: "kit-login" });
    await context.syncPracticalSkillsKitCompletion(email, "kit-login", content);
    assert.deepEqual(Array.from(queries.at(-1).values[2]), ["0", "1"], "SQL excludes hidden and merged activities");
    assert.match(queries.at(-1).sql, /bool_and/);
    assert.match(queries.at(-1).sql, /COALESCE\(completed_at, NOW\(\)\)/);
    context.pool.query = async () => ({ rows: [] });
    await assert.rejects(context.syncPracticalSkillsKitCompletion(email, "kit-login", content), /could not be saved/);
    assert.equal((await call("get", "")).code, 500, "No success or certificate if completion persistence fails");

    const nodes = new Map();
    const events = {};
    const classes = new Set();
    let printCalled = false;
    let failEmail = false;
    let downloaded = false;
    let downloadedName = "";
    let clientCertificate = progress.certificate;
    const document = {
        body: { classList: { add: (value) => classes.add(value), remove: (value) => classes.delete(value) } },
        createElement: () => ({ set download(value) { downloadedName = value; }, click() { downloaded = true; } }),
        getElementById(id) {
            if (!nodes.has(id)) nodes.set(id, {
                hidden: false, textContent: "", disabled: false, classList: { toggle() {}, remove() {} },
                setAttribute() {}, removeAttribute() {}, appendChild() {}, after() {},
                addEventListener: (event, callback) => { events[`${id}:${event}`] = callback; }
            });
            return nodes.get(id);
        }
    };
    const browser = {
        document, URLSearchParams,
        URL: { createObjectURL: () => "blob:test", revokeObjectURL() {} },
        localStorage: { getItem: () => JSON.stringify({ expiresAt: Date.now() + 60000, profile: { email } }) },
        sessionStorage: { getItem: () => null },
        fetch: async (url) => {
            if (url.endsWith("/certificate/email")) return { ok: !failEmail, status: failEmail ? 500 : 200, json: async () => failEmail ? { error: "Mail unavailable" } : { sent: true, recipient: email } };
            if (url.endsWith("/certificate.pdf")) return { ok: true, blob: async () => download.body };
            if (url.endsWith("/reset")) clientCertificate = null;
            return { ok: true, json: async () => url.includes("/kit-content/") ? { content } : {
                responses: {}, completedActivities: clientCertificate ? { 0: "saved", 1: "saved" } : {},
                certificate: clientCertificate, certificateEmailed: Boolean(clientCertificate), kit: { isComplete: Boolean(clientCertificate) }, kits: [{ id: "kit-login", isComplete: Boolean(clientCertificate) }]
            } };
        },
        window: {
            location: { search: "?kit=kit-login" }, clearTimeout() {}, setTimeout() {},
            KitWorksheetRender: { renderKitOverview() {}, visibleLoginSites: () => [] },
            print: () => { assert.ok(classes.has("printing-certificate")); printCalled = true; }
        }
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "practical-skills", "kit-worksheet.js"), "utf8"), browser);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(nodes.get("worksheet-certificate").hidden, false);
    assert.equal(nodes.get("worksheet-status-pill").textContent, "Completed");
    assert.equal(nodes.get("worksheet-complete-btn").hidden, true, "Manual whole-kit button is removed");
    assert.equal(nodes.get("certificate-student-name").textContent, "Māia Student");
    assert.match(nodes.get("certificate-completion-details").textContent, /2 activities completed/);
    assert.match(nodes.get("certificate-status").textContent, /emailed to student@example/, "Student is told the automatic email was sent");
    events["certificate-print:click"]();
    assert.equal(printCalled, true);
    assert.equal(classes.has("printing-certificate"), false, "Printing mode is cleaned up");
    await events["certificate-download:click"]();
    assert.equal(downloaded, true);
    assert.equal(downloadedName, "kit-login-certificate.pdf");
    await events["certificate-email:click"]();
    assert.match(nodes.get("certificate-status").textContent, /Certificate sent/);
    failEmail = true;
    await events["certificate-email:click"]();
    assert.equal(nodes.get("certificate-status").textContent, "Mail unavailable");
    assert.equal(nodes.get("certificate-email").disabled, false);
    await events["worksheet-reset-btn:click"]();
    assert.equal(nodes.get("worksheet-certificate").hidden, true, "Reset removes the certificate");
    console.log("Kit auto-completion, certificate PDF and email regression checks passed.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
