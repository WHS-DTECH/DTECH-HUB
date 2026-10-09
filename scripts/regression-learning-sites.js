"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const hunt = require("../learning-sites-assessment");
const assessment = require("../practical-skills-assessment");
const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
const between = (start, end) => {
    const from = server.indexOf(start);
    const to = server.indexOf(end, from);
    assert.ok(from >= 0 && to > from);
    return server.slice(from, to);
};

async function main() {
    const content = { worksheets: [{ activity: "Other" }, { activity: "Open DTECH Learning Site" }], activities: [null, { questions: [{ id: "teacher" }], images: [{ url: "test.png" }] }] };
    const enhanced = hunt.withLearningSitesActivity("kit-login", content);
    assert.equal(enhanced.activities[1].assessmentId, hunt.LEARNING_SITES_ID);
    assert.equal(enhanced.activities[1].questions[0].id, "teacher");
    assert.equal(enhanced.activities[1].images[0].url, "test.png");
    assert.equal(content.activities[1].assessmentId, undefined);
    assert.deepEqual(hunt.withLearningSitesActivity("kit-login", enhanced), enhanced);
    assert.equal(hunt.withLearningSitesActivity("kit-minecraft", content), content);
    const publicHunt = assessment.getStudentAssessment(hunt.LEARNING_SITES_ID);
    assert.equal(publicHunt.destinations.length, 5);
    assert.equal(publicHunt.courses.length, 14);
    assert.ok(publicHunt.destinations.every((clue) => !("answers" in clue)));
    assert.ok(publicHunt.courses.every((course) => course.clues.every((clue) => !("answers" in clue))));
    const answers = {
        science: " EVIDENCE! ", english: "Kokatahi", food: "2026", pe: "Junior PE", dtech: "Miss Pringle",
        course: "7DTECH", "course-clue-1": "Digital Skills", "course-clue-2": "STEAM Project"
    };
    const profile = hunt.getHuntProfile({ year_level: "Year 7", programs: ["DTECH"] });
    assert.equal(hunt.gradeLearningSites(answers, profile).passed, true);
    assert.equal(hunt.gradeLearningSites({ ...answers, course: "8DTECH" }, profile).score, 5);
    assert.equal(hunt.gradeLearningSites({ ...answers, "course-clue-1": "wrong" }, profile).score, 7);
    assert.equal(hunt.gradeLearningSites(answers, hunt.getHuntProfile(null)).passed, false);
    assert.equal(hunt.getHuntProfile({ year_level: "7", programs: ["TEXT"] }).available, false);
    assert.equal(hunt.getHuntProfile({ year_level: "11", programs: ["COMP", "DTECH"] }).available, false, "Ambiguous senior course is not guessed");
    const compProfile = hunt.getHuntProfile({ year_level: "11", programs: ["COMP", "DTECH"], dtech_timetable: [{ value: "11COMP CW" }] });
    assert.deepEqual(compProfile.courseIds, ["11COMP"], "Ignore inferred generic DTECH if timetable identifies COMP");
    assert.equal(hunt.gradeLearningSites({ ...answers, course: "11COMP", "course-clue-1": "Networking", "course-clue-2": "Word Processing" }, compProfile).passed, true);
    assert.equal(hunt.gradeLearningSites({ ...answers, course: "11DTECH", "course-clue-1": "Python", "course-clue-2": "HTML & CSS" }, hunt.getHuntProfile({ year_level: "11", programs: ["DTECH"] })).passed, true);
    assert.equal(hunt.gradeLearningSites({ ...answers, course: "9MPROG", "course-clue-1": "Office and Adobe Suite", "course-clue-2": "Web Coding" }, hunt.getHuntProfile({ year_level: "9", programs: ["DTECH", "MPROG"] })).passed, true);
    assert.equal(hunt.gradeLearningSites({ ...answers, course: "10MDTECH", "course-clue-1": "Office & Adobe Suite", "course-clue-2": "CAD" }, hunt.getHuntProfile({ year_level: "10", programs: ["MDTECH"] })).passed, true);
    assert.equal(hunt.gradeLearningSites({ ...answers, science: ["evidence"], passed: true }, profile).passed, false);

    let ownRows = [{ id_number: "1", linked_emails: ["student@example.school.nz"], year_level: "7", programs: ["DTECH"], upload_year: 2026 }];
    const handlers = {};
    const context = vm.createContext({
        ...assessment, ...hunt,
        app: { get: (url, handler) => { handlers[url] = handler; }, post: (url, handler) => { handlers[url] = handler; } },
        getRequestUserEmail: (req) => req.email || "",
        normalizeEmail: (email) => String(email || "").trim().toLowerCase(),
        SCHOOL_EMAIL_DOMAIN: "example.school.nz",
        getStudentDirectoryRows: async () => ownRows,
        buildStudentClassManagementRow: (row) => row,
        getStudentIdentityKey: (row) => row.id_number,
        shouldReplaceStudentSnapshot: (a, b) => b.upload_year > a.upload_year,
        getPracticalSkillsKitDefinition: (id) => id === "kit-login",
        getStoredPracticalSkillsKitContent: async () => enhanced,
        savePracticalSkillsAssessment: async (_email, _kit, _index, grade) => ({ completed_activities: grade.passed ? { 1: "saved" } : {} })
    });
    vm.runInContext(between("async function getLearningSitesStudentProfile(", 'app.get("/api/practical-skills/kit-content/:kitId"'), context);
    const request = async (url, overrides = {}) => {
        const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
        await handlers[url]({ email: "student@example.school.nz", params: { kitId: "kit-login", activityIndex: "1" }, body: { answers }, ...overrides }, res);
        return res;
    };
    const profileUrl = "/api/practical-skills/learning-sites/profile";
    const checkUrl = "/api/practical-skills/progress/:kitId/activities/:activityIndex/check";
    assert.equal((await request(profileUrl, { email: "" })).code, 401);
    assert.equal((await request(profileUrl)).body.available, true);
    assert.equal((await request(profileUrl, { email: "other@example.school.nz" })).body.available, false);
    assert.equal((await request(checkUrl)).body.completedActivities["1"], "saved");
    assert.equal((await request(checkUrl, { body: { answers: { ...answers, course: "8DTECH" }, profile: { available: true, courseIds: ["8DTECH"] } } })).body.passed, false);
    ownRows.push({ ...ownRows[0], year_level: "8", upload_year: 2027 });
    assert.equal((await request(checkUrl)).body.passed, false, "Latest profile determines the course");
    ownRows.push({ ...ownRows[0], id_number: "different" });
    assert.match((await request(profileUrl)).body.message, /More than one student/);
    ownRows = [{ ...ownRows[0], status: "Not Current" }];
    assert.equal((await request(profileUrl)).body.available, false, "Deactivated profiles cannot award completion");
    context.savePracticalSkillsAssessment = async () => { throw new Error("Database unavailable"); };
    assert.equal((await request(checkUrl)).code, 500);
    const rendererSource = fs.readFileSync(path.join(__dirname, "..", "practical-skills", "kit-worksheet-render.js"), "utf8");
    assert.match(rendererSource, /id === "course" && courseSelect\.value/);
    assert.match(rendererSource, /huntProfile\.courseIds\.includes\(courseSelect\.value\)/);
    assert.match(rendererSource, /Westland High Website<\/a> &rarr; <strong>Intranet<\/strong> &rarr; <strong>Learning Sites<\/strong>/);
    assert.match(rendererSource, /data-hunt-island/);
    assert.match(rendererSource, /Treasure unlocked! 8 \/ 8 correct/);
    assert.ok(fs.existsSync(path.join(__dirname, "..", "images", "learning-sites-treasure-map.svg")));
    context.getStudentDirectoryRows = async () => { throw new Error("Profile lookup failed"); };
    assert.equal((await request(profileUrl)).code, 500);
    assert.equal((await request(checkUrl)).code, 500);
    console.log("Learning Sites treasure hunt regression checks passed.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
