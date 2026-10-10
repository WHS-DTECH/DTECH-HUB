"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
    parseGoogleDocId,
    resolveResearchReportTemplateId,
    getResearchReportProgrammeFolder,
    buildResearchReportReplacements,
    applyResearchReportReplacements,
    gradeResearchReport
} = require("../research-report");

const docId = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789";
assert.equal(parseGoogleDocId(`https://docs.google.com/document/d/${docId}/edit?usp=sharing`), docId);
assert.equal(parseGoogleDocId(`https://docs.google.com/document/u/0/d/${docId}/edit`), docId);
assert.equal(parseGoogleDocId(`https://drive.google.com/open?id=${docId}`), docId);
assert.equal(parseGoogleDocId(docId), docId);
assert.equal(parseGoogleDocId("not a doc"), "");
assert.equal(resolveResearchReportTemplateId({ templateId: "" }, docId), docId, "Env fallback is used when no Kit Builder template is set");
assert.equal(resolveResearchReportTemplateId({ templateId: `https://docs.google.com/document/d/${docId}/edit` }, "x"), docId);

assert.equal(getResearchReportProgrammeFolder({ year: 7, courseIds: ["Y7DTECH"] }), "JuniorDTECH");
assert.equal(getResearchReportProgrammeFolder({ year: 8, courseIds: [] }), "JuniorDTECH");
assert.equal(getResearchReportProgrammeFolder({ year: 9, courseIds: [] }), "MiddleDTECH");
assert.equal(getResearchReportProgrammeFolder({ year: 10, courseIds: [] }), "MiddleDTECH");
assert.equal(getResearchReportProgrammeFolder({ year: null, courseIds: ["STAFF"] }), "JuniorDTECH");
assert.equal(getResearchReportProgrammeFolder({ year: 12, courseIds: [] }), "");
assert.equal(getResearchReportProgrammeFolder({ year: NaN, courseIds: [] }), "");

const template = "Search Kit - My West Coast Discoveries\nPlace 1:\nWhat I found:\nPlace 2:\nWhat I found:";
const untouched = gradeResearchReport(template, template);
assert.equal(untouched.passed, false);
assert.equal(untouched.addedWords, 0);
assert.match(untouched.feedback, /still looks the same as the template/);

const started = gradeResearchReport(`${template}\nPunakaiki has pancake rocks.`, template);
assert.equal(started.passed, false);
assert.equal(started.addedWords, 4);
assert.match(started.feedback, /Great start!.*about 4.*at least 25/);

const research = "Punakaiki pancake rocks are limestone layers near Greymouth. Ross was a gold rush town south of Hokitika. " +
    "Franz Josef Glacier is called Ka Roimata o Hine Hukatere and it has retreated a long way.";
const done = gradeResearchReport(`${template}\n${research}`, template);
assert.equal(done.passed, true);
assert.equal(done.assessmentId, "search-research-report-v1");
assert.equal(done.answers.passed, true);
assert.match(done.feedback, /Ka pai!/);
assert.equal(gradeResearchReport("teh glaicer is reely big and mellting fast becos of warmer wether", "", { minimumWords: 10 }).passed, true,
    "Spelling is not assessed");
assert.equal(gradeResearchReport("Place 1: Place 2:", template).addedWords, 0, "Deleting template text does not count as content");

const headerTemplate = "Student name\n[Type your name]\nClass/homeroom\n[Type your class]\nPlace\n[Name a place]";
const replacements = buildResearchReportReplacements({ studentName: " Aroha Smith ", formClass: "9TEC" });
assert.deepEqual(replacements, [
    { placeholder: "[Type your name]", value: "Aroha Smith" },
    { placeholder: "[Type your class]", value: "9TEC" }
]);
assert.deepEqual(buildResearchReportReplacements({ studentName: "Staff Member", formClass: "" }).map((item) => item.placeholder), ["[Type your name]"],
    "Unknown class leaves the class prompt for the student to fill in");
const filledTemplate = applyResearchReportReplacements(headerTemplate, replacements);
assert.equal(filledTemplate, "Student name\nAroha Smith\nClass/homeroom\n9TEC\nPlace\n[Name a place]");
assert.equal(gradeResearchReport(filledTemplate, filledTemplate).addedWords, 0, "Pre-filled name and class are not counted as the student's words");

const serverSource = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
const ensureStart = serverSource.indexOf("async function ensureStudentResearchReport(");
const ensureSource = serverSource.slice(ensureStart, serverSource.indexOf("\nfunction withResearchReportLock(", ensureStart));
assert.ok(ensureStart > 0);
assert.ok(ensureSource.indexOf("driveFindFileByNameInFolder") < ensureSource.indexOf("driveCopyFile"), "Existing reports are found before any copy is made");
assert.match(ensureSource, /driveEnsureFolder\(root\.id, programmeFolder/);
assert.match(ensureSource, /driveEnsureFolder\(programme\.id, "KITS"/);
assert.doesNotMatch(ensureSource, /method: "(DELETE|PATCH|PUT)"|\/delete|trashed: true/, "Report creation never edits, trashes or deletes Drive files");
const resetStart = serverSource.indexOf('app.post("/api/practical-skills/progress/:kitId/reset"');
const resetSource = serverSource.slice(resetStart, serverSource.indexOf("\napp.", resetStart + 10));
assert.doesNotMatch(resetSource, /student_kit_documents|drive/i, "Kit reset does not touch research report documents");
assert.match(serverSource, /activity\?\.questionAutoMarkAssessmentId \|\| activity\?\.researchReport \|\| siteQuestions/,
    "Research report activities cannot be manually ticked");
const createRoute = serverSource.slice(serverSource.indexOf('app.post("/api/practical-skills/research-report/:kitId/:activityIndex"'));
assert.doesNotMatch(createRoute.slice(0, createRoute.indexOf("\n});")), /savePracticalSkillsAssessment|setPracticalSkillsActivityCompletion/,
    "Creating the report does not complete the activity");

console.log("Research report regression checks passed.");
