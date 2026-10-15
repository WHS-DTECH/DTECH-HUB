"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
const appsScript = fs.readFileSync(path.join(root, "scripts", "google-form-external-exam-sync.gs"), "utf8");

const normalizeStart = server.indexOf("function normalizeExternalExamIntention(");
const normalizeEnd = server.indexOf("\nasync function ensureStudentTrackerCommentsSchema", normalizeStart);
assert.ok(normalizeStart >= 0 && normalizeEnd > normalizeStart, "External exam decision normalizer exists");
const normalizeContext = vm.createContext({ String });
vm.runInContext(server.slice(normalizeStart, normalizeEnd), normalizeContext);
assert.equal(normalizeContext.normalizeExternalExamIntention("Yes"), "yes");
assert.equal(normalizeContext.normalizeExternalExamIntention("No, I do not intend to sit"), "no");
assert.equal(normalizeContext.normalizeExternalExamIntention("Maybe"), "");
const studentEmailStart = server.indexOf("function normalizeExternalExamStudentEmail(");
const studentEmailEnd = server.indexOf("\nasync function ensureStudentTrackerCommentsSchema", studentEmailStart);
assert.ok(studentEmailStart >= 0 && studentEmailEnd > studentEmailStart, "External exam student email normalizer exists");
const studentEmailContext = vm.createContext({
    SCHOOL_EMAIL_DOMAIN: "westlandhigh.school.nz",
    normalizeEmail: (value) => String(value || "").trim().toLowerCase()
});
vm.runInContext(server.slice(studentEmailStart, studentEmailEnd), studentEmailContext);
assert.equal(studentEmailContext.normalizeExternalExamStudentEmail("Sierra Hargreaves <s_hargreaves@westlandhigh.school.nz>"), "s_hargreaves@westlandhigh.school.nz");

const routeStart = server.indexOf('app.post("/api/integrations/external-exam-intention"');
const routeEnd = server.indexOf('\napp.get("/api/external-assessment-allocations"', routeStart);
assert.ok(routeStart >= 0 && routeEnd > routeStart, "External exam form webhook route exists");
const routes = {};
const memoryIntentions = new Map();
const routeContext = vm.createContext({
    app: { post: (url, handler) => { routes[url] = handler; } },
    process: { env: { EXTERNAL_EXAM_FORM_WEBHOOK_SECRET: "test-webhook-secret" } },
    normalizeEmail: (value) => String(value || "").trim().toLowerCase(),
    normalizeExternalExamStudentEmail: studentEmailContext.normalizeExternalExamStudentEmail,
    normalizeExternalExamIntention: normalizeContext.normalizeExternalExamIntention,
    isSchoolEmail: (value) => String(value || "").endsWith("@westlandhigh.school.nz"),
    memoryExternalExamIntentions: memoryIntentions,
    hasDatabase: false,
    Date,
    console: { error() {} }
});
vm.runInContext(server.slice(routeStart, routeEnd), routeContext);

const callWebhook = async (headers, body) => {
    const response = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.payload = payload; return this; }
    };
    await routes["/api/integrations/external-exam-intention"]({ headers, body }, response);
    return response;
};

async function main() {
    const unauthorized = await callWebhook({}, {
        student_email: "student@westlandhigh.school.nz",
        decision: "yes"
    });
    assert.equal(unauthorized.statusCode, 401, "The webhook requires its configured secret");

    const studentEmail = "student@westlandhigh.school.nz";
    const requestHeaders = { "x-external-exam-webhook-secret": "test-webhook-secret" };
    const declined = await callWebhook(requestHeaders, {
        student_email: studentEmail,
        decision: "No",
        submitted_at: "2026-10-15T09:00:00.000Z"
    });
    assert.equal(declined.statusCode, 200);
    assert.equal(memoryIntentions.get(studentEmail).decision, "no");

    const snapshotRouteStart = server.indexOf('app.post("/api/integrations/external-exam-intentions/sync"');
    const snapshotRouteEnd = server.indexOf('\napp.get("/api/external-assessment-allocations"', snapshotRouteStart);
    assert.ok(snapshotRouteStart >= 0 && snapshotRouteEnd > snapshotRouteStart,
        "Full external-exam response reconciliation route exists");
    const snapshotRoutes = {};
    const snapshotContext = vm.createContext({
        app: { post: (url, handler) => { snapshotRoutes[url] = handler; } },
        process: { env: { EXTERNAL_EXAM_FORM_WEBHOOK_SECRET: "test-webhook-secret" } },
        normalizeEmail: (value) => String(value || "").trim().toLowerCase(),
        normalizeExternalExamStudentEmail: studentEmailContext.normalizeExternalExamStudentEmail,
        normalizeExternalExamIntention: normalizeContext.normalizeExternalExamIntention,
        isSchoolEmail: (value) => String(value || "").endsWith("@westlandhigh.school.nz"),
        memoryExternalExamIntentions: memoryIntentions,
        hasDatabase: false,
        Date,
        console: { error() {} }
    });
    vm.runInContext(server.slice(snapshotRouteStart, snapshotRouteEnd), snapshotContext);
    const snapshotResponse = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.payload = payload; return this; }
    };
    await snapshotRoutes["/api/integrations/external-exam-intentions/sync"]({
        headers: requestHeaders,
        body: { responses: [] }
    }, snapshotResponse);
    assert.equal(snapshotResponse.statusCode, 200);
    assert.equal(memoryIntentions.has(studentEmail), false,
        "Removing the student's response from the sheet clears the No override");

    const updated = await callWebhook(requestHeaders, {
        student_email: studentEmail,
        decision: "Yes",
        submitted_at: "2026-10-15T09:10:00.000Z"
    });
    assert.equal(updated.statusCode, 200);
    assert.equal(memoryIntentions.get(studentEmail).decision, "yes", "A revised form response updates the prior decision");
    assert.match(server, /DELETE FROM student_external_exam_intentions WHERE NOT \(student_email = ANY\(\$1::text\[\]\)\)/,
        "Snapshot reconciliation removes deleted responses while preserving current responses");
    assert.match(appsScript, /syncExternalExamResponse\(_event\)\s*\{\s*return syncExistingExternalExamResponses\(\);/,
        "New form submissions sync the whole response sheet, not just one row");
    assert.match(appsScript, /everyMinutes\(15\)/,
        "Deleted Form responses are reconciled by the periodic sheet sync");
    assert.match(appsScript, /external-exam-intentions\/sync/,
        "Apps Script sends the full current response snapshot to the hub");

    assert.match(server, /externalExamIntention === "no" \? \[\] : externalStandardNumbers/,
        "A No response hides external standards without deleting the saved allocation");
    assert.match(server, /has_external_exam_allocation: externalStandardNumbers\.length > 0[\s\S]*?external_exam_intention: externalExamIntention/,
        "Allocation and response status are returned separately to the sidebar");
    assert.match(script, /externalExamFormLink\.hidden = !hasExternalExamAllocation \|\| externalExamIntention === "no"/,
        "The sidebar form link is limited to students still proceeding with an allocated external exam");
    assert.match(script, /You have CHOSEN not to continue with the Exam\./,
        "Students who opt out see the explicit choice reflected in the sidebar summary");
    assert.match(script, /hasExternalExamAllocation && !externalExamIntention/,
        "Only allocated students with no recorded answer get the login reminder");

    console.log("External exam intention webhook and visibility regressions passed.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
