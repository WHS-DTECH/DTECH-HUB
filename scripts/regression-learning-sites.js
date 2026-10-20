"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const hunt = require("../learning-sites-assessment");
const assessment = require("../practical-skills-assessment");
const loginSitesConfig = require("../login-sites-config");
const { getResearchReportProgrammeFolder } = require("../research-report");
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
    assert.equal(publicHunt.courses.length, 22);
    assert.deepEqual(publicHunt.courses.map((course) => course.label), [
        "Year 7 - JuniorDTECH", "Year 8 - JuniorDTECH", "Year 9/10 - MiddleDTECH",
        "Year 9 - MDTECH", "Year 9 - MPROG", "Year 10 - MDTECH", "Year 10 - MPROG",
        "Year 11/12/13 - SeniorDTECH", "Year 11 - Digital Tech (DTECH)", "Year 11 - Computing (COMP)",
        "Year 12 - Digital Tech (DTECH)", "Year 12 - Computing (COMP)",
        "Year 13 - Digital Tech (DTECH)", "Year 13 - Computing (COMP)",
        "Student - Year 7", "Student - Year 8", "Student - Year 9", "Student - Year 10",
        "Student - Year 11", "Student - Year 12", "Student - Year 13", "Staff"
    ]);
    assert.deepEqual(publicHunt.courses.find((course) => course.id === "MIDDLEDTECH").aliases, ["9DTECH", "10DTECH"]);
    assert.ok(publicHunt.destinations.every((clue) => !("answers" in clue)));
    assert.ok(publicHunt.courses.every((course) => course.clues.every((clue) => !("answers" in clue))));
    const answers = {
        science: " EVIDENCE! ", english: "Kokatahi", food: "2026", pe: "Junior PE", dtech: "Miss Pringle",
        course: "7DTECH", "course-clue-1": "Digital Skills", "course-clue-2": "STEAM Project"
    };
    const profile = hunt.getHuntProfile({ year_level: "Year 7", programs: ["DTECH"] });
    assert.equal(hunt.gradeLearningSites(answers, profile).passed, true);
    assert.equal(hunt.gradeLearningSites({ ...answers, science: "evidence", english: "KOKATAHI", pe: "junior physical EDUCATION", dtech: "MISS PrInGle", "course-clue-1": "dIGITAL SkILLS", "course-clue-2": "steam PROJECT" }, profile).passed, true,
        "Learning Sites accepts lowercase and mixed-case typed answers");
    for (const code of ["SRDTECH", "PIDTECH", "VEDTECH", "MMDTECH", "SDTECH", "JDTECH", "8SDTECH", "7SDTECH"]) {
        const codedProfile = hunt.getHuntProfile({ year_level: "Year 8 - JuniorDTECH", programs: [code] });
        assert.deepEqual(codedProfile.courseIds, ["8DTECH"], `${code} is recognised as a JuniorDTECH timetable code`);
    }
    for (const code of ["SRDTECH", "PIDTECH", "VEDTECH", "MMDTECH", "SDTECH", "JDTECH", "8SDTECH", "7SDTECH"]) {
        const homeroomProfile = hunt.getHuntProfile({ year_level: "Year 7", homeroom: code });
        assert.deepEqual(homeroomProfile.courseIds, ["7DTECH"], `${code} in homeroom matches the Year 7 JuniorDTECH class`);
    }
    for (const code of ["JPI", "JSR", "JSD", "JMM", "JVE"]) {
        assert.deepEqual(hunt.getHuntProfile({ year_level: "Year 7", timetable_class: code }).courseIds, ["7DTECH"], `${code} timetable class matches Year 7 JuniorDTECH`);
        assert.deepEqual(hunt.getHuntProfile({ year_level: "Year 8", timetable: [{ label: "Mon P1", value: code }] }).courseIds, ["8DTECH"], `${code} timetable period matches Year 8 JuniorDTECH`);
        assert.deepEqual(hunt.getHuntProfile({ year_level: "Year 9", timetable_class: code }).courseIds, ["STUDENT_YEAR_9"], `${code} does not match Year 9, so the year-only choice is offered`);
    }
    assert.deepEqual(hunt.getHuntProfile({ programs: ["8SDTECH"] }).courseIds, ["8DTECH"],
        "A year-prefixed DTECH code can supply the year when the year-level field is missing");
    assert.deepEqual(hunt.getHuntProfile({ dtech_timetable: [{ value: "7SDTECH" }] }).courseIds, ["7DTECH"],
        "Year-prefixed codes in DTECH timetable entries are recognised");
    assert.deepEqual(hunt.getHuntProfile({ form_class: "8SDTECH" }).courseIds, ["8DTECH"],
        "A year-prefixed form-class code supplies the JuniorDTECH year");
    const staffAnswers = { ...answers, course: "STAFF" };
    assert.equal(hunt.gradeLearningSites(staffAnswers, hunt.getHuntProfile(null, { isStaff: true })).passed, true);
    assert.equal(hunt.gradeLearningSites({ ...staffAnswers, "course-clue-1": "wrong" }, hunt.getHuntProfile(null, { isStaff: true })).score, 7);
    assert.equal(hunt.gradeLearningSites(staffAnswers, profile).passed, false, "Student profiles cannot choose Staff");
    assert.equal(hunt.gradeLearningSites(staffAnswers, hunt.getHuntProfile(null)).passed, false);
    const staffProfile = hunt.getHuntProfile(null, { isStaff: true });
    assert.ok(staffProfile.courseIds.includes("STAFF") && staffProfile.courseIds.includes("SENIORDTECH"), "Staff can test every pathway");
    assert.equal(hunt.gradeLearningSites(answers, staffProfile).passed, true, "Staff can test the Junior pathway");
    assert.equal(hunt.gradeLearningSites({ ...answers, course: "SENIORDTECH", "course-clue-1": "Python", "course-clue-2": "HTML and CSS" }, staffProfile).passed, true);
    assert.equal(hunt.gradeLearningSites(answers, profile).answers.year, 7, "Check-in year is saved");
    assert.equal(hunt.getCourseProgrammeFolder("7DTECH"), "JuniorDTECH");
    assert.equal(hunt.getCourseProgrammeFolder("8DTECH"), "JuniorDTECH");
    assert.equal(hunt.getCourseProgrammeFolder("STAFF"), "JuniorDTECH");
    assert.equal(hunt.getCourseProgrammeFolder("MIDDLEDTECH"), "MiddleDTECH");
    assert.equal(hunt.getCourseProgrammeFolder("9DTECH"), "MiddleDTECH", "Aliases map to their course");
    assert.equal(hunt.getCourseProgrammeFolder("10MPROG"), "MiddleDTECH");
    assert.equal(hunt.getCourseProgrammeFolder("SENIORDTECH"), "SeniorDTECH");
    assert.equal(hunt.getCourseProgrammeFolder("13COMP"), "SeniorDTECH");
    assert.equal(hunt.getCourseProgrammeFolder("STUDENT_YEAR_9"), "Student - Year 9");
    assert.equal(hunt.getCourseProgrammeFolder("nope"), "");
    let savedCourse = "STUDENT_YEAR_9";
    const programmeStart = server.indexOf("async function getStudentProgrammeFolder(");
    const programmeEnd = server.indexOf("\nconst MINECRAFT_EXPORTS_FOLDER_NAME", programmeStart);
    const programmeContext = vm.createContext({
        getLearningSitesStudentProfile: async () => ({ year: 9, courseIds: ["STUDENT_YEAR_9"] }),
        getSavedLearningSitesCheckIn: async () => ({ answers: { course: savedCourse } }),
        getStaffCoursePreference: async () => "",
        getResearchReportProgrammeFolder,
        getCourseProgrammeFolder: hunt.getCourseProgrammeFolder
    });
    vm.runInContext(server.slice(programmeStart, programmeEnd), programmeContext);
    assert.equal(await programmeContext.getStudentProgrammeFolder("student@example.school.nz"), "Student - Year 9");
    savedCourse = "9MDTECH";
    assert.equal(await programmeContext.getStudentProgrammeFolder("student@example.school.nz"), "MiddleDTECH",
        "A regular course check-in continues using the existing year-level folder");
    const y8 = hunt.getHuntProfile({ year_level: "8", programs: ["DTECH"] });
    const y9 = hunt.getHuntProfile({ year_level: "9", programs: ["DTECH"] });
    assert.equal(hunt.needsCourseCheckIn({ course: "8DTECH", year: 8 }, y8), false);
    assert.equal(hunt.needsCourseCheckIn({ course: "8DTECH", year: 8 }, y9), true, "Year level change reopens the check-in");
    assert.equal(hunt.needsCourseCheckIn({ course: "MIDDLEDTECH", year: 9 }, hunt.getHuntProfile({ year_level: "10", programs: ["DTECH"] })), true);
    assert.equal(hunt.needsCourseCheckIn({ course: "8DTECH" }, y8), false, "Legacy answers in range stay complete");
    assert.equal(hunt.needsCourseCheckIn({ course: "8DTECH" }, y9), true, "Legacy answers out of range reopen");
    assert.equal(hunt.needsCourseCheckIn({ course: "STAFF" }, staffProfile), false, "Staff never reopen");
    assert.equal(hunt.needsCourseCheckIn({ course: "8DTECH", year: 8 }, hunt.getHuntProfile(null)), false, "Unknown directory never reopens");
    assert.equal(hunt.gradeLearningSites({ ...answers, course: "8DTECH" }, profile).score, 5);
    assert.equal(hunt.gradeLearningSites({ ...answers, "course-clue-1": "wrong" }, profile).score, 7);
    assert.equal(hunt.gradeLearningSites(answers, hunt.getHuntProfile(null)).passed, false);
    const nonDtechYearProfile = hunt.getHuntProfile({ year_level: "Year 9", programs: ["TEXT"] });
    assert.deepEqual(nonDtechYearProfile.courseIds, ["STUDENT_YEAR_9"]);
    assert.match(nonDtechYearProfile.message, /Choose Student - Year 9/);
    assert.equal(hunt.getHuntProfile({ year_level: "Year 9", programs: ["TEXT"] }).available, true);
    assert.deepEqual(hunt.getHuntProfile({ year_level: "Year 10", programs: ["TEXT"] }).courseIds, ["STUDENT_YEAR_10"]);
    assert.equal(hunt.getHuntProfile({ year_level: "Year 14", programs: ["TEXT"] }).available, false);
    const studentYearAnswers = { ...answers, course: "STUDENT_YEAR_9", "course-clue-1": "Office and Adobe Suite", "course-clue-2": "CAD" };
    assert.equal(hunt.gradeLearningSites(studentYearAnswers, nonDtechYearProfile).passed, true);
    assert.equal(hunt.getCourseProgrammeFolder("STUDENT_YEAR_9"), "Student - Year 9");
    assert.deepEqual(hunt.getHuntProfile({ year_level: "11", programs: ["COMP", "DTECH"] }).courseIds, ["STUDENT_YEAR_11"], "Ambiguous senior course offers the year-only choice rather than guessing");
    const compProfile = hunt.getHuntProfile({ year_level: "11", programs: ["COMP", "DTECH"], dtech_timetable: [{ value: "11COMP CW" }] });
    assert.deepEqual(compProfile.courseIds, ["11COMP"], "Ignore inferred generic DTECH if timetable identifies COMP");
    assert.equal(hunt.gradeLearningSites({ ...answers, course: "11COMP", "course-clue-1": "Networking", "course-clue-2": "Word Processing" }, compProfile).passed, true);
    assert.equal(hunt.gradeLearningSites({ ...answers, course: "11DTECH", "course-clue-1": "Python", "course-clue-2": "HTML & CSS" }, hunt.getHuntProfile({ year_level: "11", programs: ["DTECH"] })).passed, true);
    assert.equal(hunt.gradeLearningSites({ ...answers, course: "9MPROG", "course-clue-1": "Office and Adobe Suite", "course-clue-2": "Web Coding" }, hunt.getHuntProfile({ year_level: "9", programs: ["DTECH", "MPROG"] })).passed, true);
    assert.equal(hunt.gradeLearningSites({ ...answers, course: "10MDTECH", "course-clue-1": "Office & Adobe Suite", "course-clue-2": "CAD" }, hunt.getHuntProfile({ year_level: "10", programs: ["MDTECH"] })).passed, true);
    for (const year of [9, 10]) {
        for (const program of ["DTECH", "MDTECH", "MPROG"]) {
            const middleProfile = hunt.getHuntProfile({ year_level: String(year), programs: [program] });
            assert.equal(hunt.gradeLearningSites({ ...answers, course: "MIDDLEDTECH", "course-clue-1": "Office and Adobe Suite", "course-clue-2": "CAD" }, middleProfile).passed, true);
        }
        const middleProfile = hunt.getHuntProfile({ year_level: String(year), programs: ["DTECH"] });
        assert.equal(hunt.gradeLearningSites({ ...answers, course: `${year}DTECH`, "course-clue-1": "Office and Adobe Suite", "course-clue-2": "CAD" }, middleProfile).passed, true, "Saved year-specific MiddleDTECH answers still mark correctly");
        assert.equal(hunt.gradeLearningSites({ ...answers, course: `${year === 9 ? 10 : 9}DTECH` }, middleProfile).passed, false);
    }
    for (const year of [11, 12, 13]) {
        assert.equal(hunt.gradeLearningSites({ ...answers, course: "SENIORDTECH", "course-clue-1": "Python", "course-clue-2": "HTML and CSS" }, hunt.getHuntProfile({ year_level: String(year), programs: ["DTECH"] })).passed, true);
    }
    assert.equal(hunt.gradeLearningSites({ ...answers, course: "SENIORDTECH" }, compProfile).passed, false, "Senior Computing retains its own course and clues");
    assert.equal(hunt.gradeLearningSites({ ...answers, course: "MIDDLEDTECH" }, profile).passed, false);
    assert.equal(hunt.gradeLearningSites({ ...answers, course: "SENIORDTECH" }, profile).passed, false);
    assert.equal(hunt.gradeLearningSites({ ...answers, science: ["evidence"], passed: true }, profile).passed, false);

    let ownRows = [{ id_number: "1", linked_emails: ["student@example.school.nz"], year_level: "7", programs: ["DTECH"], upload_year: 2026 }];
    const folderCalls = [];
    const handlers = {};
    const context = vm.createContext({
        ...assessment, ...hunt, ...loginSitesConfig,
        syncPracticalSkillsKitCompletion: async () => {},
        autoEmailKitCertificate: async () => {},
        SEARCH_RESULTS_DETECTIVE_ID: "search-results-detective-v1",
        SEARCH_AND_FIND_ID: "search-and-find-v1",
        stubVerifyDrive: async (token) => { if (token !== "good-token") throw new Error("bad token"); return {}; },
        stubCourseFolders: async (_email, programmeFolder) => {
            folderCalls.push(programmeFolder);
            return { root: { id: "root-id" }, programme: { id: `${programmeFolder}-id` }, kits: { id: "kits-id" } };
        },
        requireAdminAccess() {},
        hasDatabase: false,
        app: { get: (url, handler) => { handlers[url] = handler; }, post: (url, handler) => { handlers[url] = handler; }, put() {} },
        getRequestUserEmail: (req) => req.email || "",
        normalizeEmail: (email) => String(email || "").trim().toLowerCase(),
        SCHOOL_EMAIL_DOMAIN: "example.school.nz",
        getStudentDirectoryRows: async () => ownRows,
        canManagePracticalSchedule: async (email) => email === "staff@example.school.nz",
        buildStudentClassManagementRow: (row) => row,
        getStudentIdentityKey: (row) => row.id_number,
        shouldReplaceStudentSnapshot: (a, b) => b.upload_year > a.upload_year,
        getPracticalSkillsKitDefinition: (id) => id === "kit-login",
        getStoredPracticalSkillsKitContent: async () => enhanced,
        savePracticalSkillsAssessment: async (_email, _kit, _index, grade) => ({ completed_activities: grade.passed ? { 1: "saved" } : {} })
    });
    vm.runInContext(between("async function getLearningSitesStudentProfile(", 'app.get("/api/practical-skills/kit-content/:kitId"'), context);
    vm.runInContext("ensureStudentCourseFolders = stubCourseFolders; verifyDriveTokenForStudent = stubVerifyDrive;", context);
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
    const firstCheck = await request(checkUrl); assert.ok(firstCheck.body.completedActivities, JSON.stringify(firstCheck.body));
    assert.equal(firstCheck.body.completedActivities["1"], "saved");
    const noTokenCheck = await request(checkUrl);
    assert.equal(noTokenCheck.body.courseFolder, null);
    assert.match(noTokenCheck.body.courseFolderError, /JuniorDTECH folder will be made/);
    const folderCheck = await request(checkUrl, { body: { answers, driveAccessToken: "good-token" } });
    assert.ok(folderCheck.body.courseFolder, JSON.stringify(folderCheck.body));
    assert.equal(folderCheck.body.courseFolder.name, "JuniorDTECH");
    assert.equal(folderCheck.body.courseFolder.kitsFolderId, "kits-id");
    assert.match(folderCheck.body.courseFolder.url, /JuniorDTECH-id/);
    assert.deepEqual(folderCalls, ["JuniorDTECH"]);
    const badTokenCheck = await request(checkUrl, { body: { answers, driveAccessToken: "bad-token" } });
    assert.equal(badTokenCheck.body.completedActivities["1"], "saved", "Folder problems never block the tick");
    assert.match(badTokenCheck.body.courseFolderError, /couldn't create your JuniorDTECH folder/);
    assert.deepEqual(folderCalls, ["JuniorDTECH"]);
    const failedCheck = await request(checkUrl, { body: { answers: { ...answers, science: "wrong" }, driveAccessToken: "good-token" } });
    assert.equal(failedCheck.body.courseFolder, null, "No folder until the hunt is passed");
    assert.deepEqual(folderCalls, ["JuniorDTECH"]);
    const originalRows = ownRows;
    ownRows = [{ ...ownRows[0], year_level: "Year 9", programs: ["TEXT"] }];
    const studentYearCheck = await request(checkUrl, { body: { answers: studentYearAnswers, driveAccessToken: "good-token" } });
    assert.equal(studentYearCheck.body.passed, true);
    assert.equal(studentYearCheck.body.courseFolder.name, "Student - Year 9");
    assert.deepEqual(folderCalls, ["JuniorDTECH", "Student - Year 9"]);
    ownRows = originalRows;
    enhanced.worksheets.push({ activity: "Using your login details" });
    const siteContent = assessment.withShortLoginKit("kit-login", { worksheets: [{ activity: "Using your login details" }] });
    enhanced.activities.push({ loginSites: siteContent.activities[0].loginSites });
    const tinkercadCheck = await request(checkUrl, {
        params: { kitId: "kit-login", activityIndex: "2" },
        body: { answers: { tinkercad: "Circuits, 3D Designs and Codeblocks", passed: true } }
    });
    assert.equal(tinkercadCheck.body.answers.tinkercadReady, true);
    assert.equal(tinkercadCheck.body.assessmentId, assessment.LOGIN_SITES_ID);
    assert.equal(tinkercadCheck.body.passed, false);
    assert.equal(tinkercadCheck.body.completedActivities["2"], undefined);
    const juniorCheck = await request(checkUrl, {
        params: { kitId: "kit-login", activityIndex: "2" },
        body: { answers: { tinkercad: "Circuits, 3D Designs and Codeblocks",
            "sketchup-tool-1": "Rectangle", "sketchup-tool-2": "Move", "sketchup-tool-3": "Push/Pull", "sketchup-tool-4": "Line",
            codecombat: "wrong", codeavengers: "wrong" } }
    });
    assert.equal(juniorCheck.body.passed, true, "Latest server profile excludes invisible questions from completion");
    assert.equal(juniorCheck.body.total, 2, "No-question sites do not count");
    const staffCourseIds = Array.from((await request(profileUrl, { email: "staff@example.school.nz" })).body.courseIds);
    assert.ok(staffCourseIds.includes("STAFF") && staffCourseIds.includes("7DTECH") && staffCourseIds.includes("SENIORDTECH"), "Staff profile offers every test pathway");
    assert.equal((await request(checkUrl, { email: "staff@example.school.nz", body: { answers: staffAnswers } })).body.completedActivities["1"], "saved");
    assert.equal((await request(checkUrl, { body: { answers: staffAnswers, profile: { available: true, courseIds: ["STAFF"] }, isStaff: true } })).body.passed, false, "Client-supplied staff status is ignored");
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
    assert.match(rendererSource, /<ol class="treasure-map-pathway" aria-label="Pathway to Learning Sites">/);
    assert.match(rendererSource, /Westland High Website<\/a><\/li>/);
    assert.match(rendererSource, /<strong>Intranet<\/strong><\/li>/);
    assert.match(rendererSource, /<strong>Learning Sites<\/strong><\/li>/);
    assert.match(rendererSource, /<aside class="treasure-map-search" aria-label="Google shortcut to DTECH">/);
    assert.match(rendererSource, /You can bypass the school pathway and Google the DTECH learning site instead/);
    assert.match(rendererSource, /href="https:\/\/www\.google\.com\/search\?q=Pringle\+DTECH" target="_blank" rel="noopener noreferrer"/);
    assert.match(rendererSource, /class="treasure-map-search-keywords">Pringle DTECH<\/p>/);
    assert.match(rendererSource, /data-hunt-island/);
    assert.match(rendererSource, /Treasure unlocked! 8 \/ 8 correct/);
    const worksheetSource = fs.readFileSync(path.join(__dirname, "..", "practical-skills", "kit-worksheet.js"), "utf8");
    const navigationStart = worksheetSource.indexOf("        const activityIndex = getActivityIndexFromUrl();", worksheetSource.indexOf("    function renderPage()"));
    const navigationEnd = worksheetSource.indexOf('        const verification =', navigationStart);
    assert.ok(navigationStart >= 0 && navigationEnd > navigationStart);
    for (const [activityIndex, expectedHref, expectedText] of [
        [0, "./kit-worksheet.html?kit=kit-login", "\u2190 Back to Kit Activity List"],
        [null, "/practical-skills/checklist.html", "\u2190 Back to My Licence"],
        [99, "/practical-skills/checklist.html", "\u2190 Back to My Licence"]
    ]) {
        const link = {};
        vm.runInNewContext(worksheetSource.slice(navigationStart, navigationEnd), {
            getActivityIndexFromUrl: () => activityIndex,
            state: { kitId: "kit-login", content: { worksheets: [{ activity: "First activity" }] } },
            document: { getElementById: () => link }
        });
        assert.equal(link.href, expectedHref);
        assert.equal(link.textContent, expectedText);
    }
    assert.doesNotMatch(worksheetSource, /backHref:/, "Student page does not render a duplicate activity-list link");
    assert.ok(fs.existsSync(path.join(__dirname, "..", "images", "learning-sites-treasure-map.svg")));

    const huntIndex = enhanced.activities.findIndex((activity) => activity?.assessmentId === hunt.LEARNING_SITES_ID);
    const progressRow = { kit_id: "kit-login", completed_activities: { [huntIndex]: "done", 0: "done" },
        responses: { [`${huntIndex}-${hunt.LEARNING_SITES_ID}`]: { ...answers, year: 7 } } };
    ownRows = [{ id_number: "1", linked_emails: ["student@example.school.nz"], year_level: "7", programs: ["DTECH"], upload_year: 2026 }];
    const refreshCalls = [];
    context.getAllPracticalSkillsProgressRows = async () => [progressRow];
    context.savePracticalSkillsAssessment = async (...args) => { refreshCalls.push(["save", ...args]); return {}; };
    context.setPracticalSkillsActivityCompletion = async (...args) => { refreshCalls.push(["tick", ...args]); };
    context.syncPracticalSkillsKitCompletion = async () => { refreshCalls.push(["sync"]); };
    const refresh = () => vm.runInContext('refreshLearningSitesCheckIn("student@example.school.nz")', context);
    assert.equal(await refresh(), false, "Same year level keeps the check-in complete");
    assert.equal(refreshCalls.length, 0);
    ownRows = [{ ...ownRows[0], year_level: "8" }];
    assert.equal(await refresh(), true, "A new year level reopens the check-in");
    assert.deepEqual(refreshCalls.map((call) => call[0]), ["save", "tick", "sync"]);
    assert.equal(refreshCalls[0][3], huntIndex);
    assert.deepEqual(JSON.parse(JSON.stringify(refreshCalls[0][4].answers)), { reopenedForYear: 8, previousCourse: "7DTECH" });
    assert.equal(refreshCalls[1][4], false, "Only the Learning Sites tick is removed");
    refreshCalls.length = 0;
    delete progressRow.completed_activities[huntIndex];
    assert.equal(await refresh(), false, "Unfinished check-ins are left alone");
    assert.equal(refreshCalls.length, 0);
    progressRow.completed_activities[huntIndex] = "done";
    context.getAllPracticalSkillsProgressRows = async () => { throw new Error("db down"); };
    assert.equal(await refresh(), false, "Refresh failures never break progress loading");
    ownRows = [{ ...ownRows[0], year_level: "7" }];

    context.getStudentDirectoryRows = async () => { throw new Error("Profile lookup failed"); };
    assert.equal((await request(profileUrl)).code, 500);
    assert.equal((await request(checkUrl)).code, 500);
    context.canManagePracticalSchedule = async () => { throw new Error("Staff access lookup failed"); };
    assert.equal((await request(profileUrl, { email: "staff@example.school.nz" })).code, 500);
    assert.equal((await request(checkUrl, { email: "staff@example.school.nz", body: { answers: staffAnswers } })).code, 500, "Failed staff lookup cannot award completion");
    console.log("Learning Sites treasure hunt regression checks passed.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
