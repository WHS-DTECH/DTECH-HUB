"use strict";
const assert = require("node:assert/strict");
const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { registerProgressionPathway, validateRecord } = require("../learning-pathways/progression-store");
const ids = ["digital-systems", "data", "digital-citizenship", "programming-and-algorithms", "systems-and-control"];
const sample = { studentEmail: "student@example.test", schoolYear: 2027, term: 1, yearLevel: 7,
    revision: 0, formClass: "7XX", homeroom: "JPI", timetableClass: "JPI", strengths: "", nextLearning: "",
    pathways: ids.map((id) => ({ id, coverage: "not-taught", descriptor: null, discipline: "dtech", addressed: "", evidence: "", notes: "" })) };
const clone = (value) => JSON.parse(JSON.stringify(value));
async function main() {
    const root = path.join(__dirname, "..");
    const css = fs.readFileSync(path.join(root, "learning-pathways/progression-pathway.css"), "utf8");
    const luminance = (hex) => {
        const channels = hex.match(/../g).map((channel) => parseInt(channel, 16) / 255)
            .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    for (const colour of ["b86753", "c08b2e", "969b32", "278c78", "427bbb"]) {
        assert.ok(css.includes(`#${colour}`));
        assert.ok((luminance(colour) + 0.05) / (luminance("000000") + 0.05) >= 4.5, "Descriptor text has accessible contrast");
    }
    const navigation = fs.readFileSync(path.join(root, "script.js"), "utf8");
    assert.match(navigation, /href="\/learning-pathways\/progression-pathway\.html">Progression Pathway/);
    const client = fs.readFileSync(path.join(root, "learning-pathways/progression-pathway.js"), "utf8");
    const context = vm.createContext({});
    vm.runInContext(client.slice(client.indexOf("function progressionMatchingStudents("), client.indexOf("function progressionHomeroomOptions(")), context);
    const students = [
        { email: "one", name: "Aroha", yearLevel: 7, homeroom: "JPI", formClass: "7WHAU" },
        { email: "two", name: "Ben", yearLevel: 8, homeroom: "JPI", formClass: "8WHAU" },
        { email: "three", name: "Cara", yearLevel: 7, homeroom: "JVE", formClass: "7WHAU" },
        { email: "four", name: "Drew", yearLevel: 7, formClass: "7S" }
    ];
    const filtered = (...args) => Array.from(context.progressionMatchingStudents(students, ...args), (student) => student.email);
    assert.deepEqual(filtered("JPI", "7", ""), ["one"], "Homeroom and Year 7 are combined, not alternatives");
    assert.deepEqual(filtered(" jpi ", "", ""), ["one", "two"]);
    assert.deepEqual(filtered("", "7", ""), ["one", "three", "four"]);
    assert.deepEqual(filtered("7S", "7", ""), ["four"]);
    assert.deepEqual(filtered("JPI", "7", "Ben"), []);
    assert.deepEqual(filtered("JSD", "7", ""), [], "Missing homeroom does not guess student membership");
    assert.deepEqual(filtered("JPI", "7", "aro"), ["one"]);
    assert.equal(context.progressionMatchingStudents([
        { name: "Timetable student", email: "", yearLevel: 7, formClass: "JPI", homeroom: "7WHAU" }
    ], "JPI", "", "").length, 1, "Form Class membership works even when a separate tutor homeroom exists");
    const html = fs.readFileSync(path.join(root, "learning-pathways/progression-pathway.html"), "utf8");
    assert.ok(!html.includes("progression-history"), "Term-history dropdown has been removed");
    assert.ok(html.includes('id="progression-roster"'), "Matching students have a visible class list");
    assert.match(html, /<dialog id="progression-dialog"[\s\S]*id="progression-form"[\s\S]*<\/dialog>/, "Student details open in a dialog");
    assert.match(client, /progressionRender\(record \|\| progressionNewRecord\(student\)\);\s*progressionOpenDialog\(student\);/, "Open Details shows the loaded record in the dialog");
    assert.match(client, /pp\("dialog"\)\.addEventListener\("cancel"[\s\S]*progressionCloseDialog\(\)/, "Escape uses the unsaved-change guard");
    assert.ok(html.includes('id="progression-dialog-summary"'), "Details dialog shows the progression summary at the top");
    assert.match(client, /pp\("rows"\)\.append\(row\);\s*\}\s*progressionRenderCurriculum\(\);\s*progressionDialogSummary\(\);/, "Curriculum statements and dialog summary render with each record");
    assert.ok(!html.includes(">Details</th>") && !html.includes("progression-detail") && !html.includes("progression-strengths"),
        "Details column, Curriculum Coverage & Evidence and Strengths have been removed");
    assert.ok(html.includes('id="progression-next"'), "Next learning remains in the Teacher Summary");
    assert.ok(html.includes("Next learning steps<textarea") && html.includes('id="progression-cb-next-preview"'), "Next Learning Steps comments preview and land in the Next learning steps box");
    assert.ok(/progressionCommentText\(true\)[\s\S]*\["next", progressionCommentText\(true\)\]/.test(client), "The builder routes Next Learning Steps comments to the Next learning steps box");
    assert.ok(html.includes('<th scope="col">Coverage</th></tr></thead><tbody id="progression-rows">'), "Learning Pathway Results has no Progress column");
    assert.ok(!client.includes("pathwayDescriptor") && !client.includes("data-pathway-descriptor"), "Pathway Progress selects are removed");
    assert.match(client, /progress\?\.strandProgress\?\.find\(\(row\) => row\.strand === strand && row\.kind === kind\)/, "Summary bars show Statement Set Progress");
    assert.match(client, /strandProgress: \(record\.strandProgress \|\| \[\]\)\.map/, "Dialog summary uses the record's Statement Set Progress");
    assert.match(client, /dataset\.pathwayCoverage = id/, "Pathway Coverage is a calculated read-only chip");
    assert.ok(!/select\.dataset\.pathwayCoverage|progressionSelect\(progressionCoverageOptions, result\.coverage/.test(client), "Pathway Coverage is no longer a manual select");
    assert.ok(html.indexOf('src="progression-mapping.js"') > html.indexOf('src="progression-curriculum.js"') && html.indexOf('src="progression-mapping.js"') < html.indexOf('src="progression-pathway.js"'), "Mapping loads before the page script");
    assert.ok(html.includes('href="curriculum-mapping.html"'), "Report links to the Curriculum Mapping admin page");
    const curriculum = require("../learning-pathways/progression-curriculum.js");
    const allStatements = Object.values(curriculum.statements).flat();
    assert.deepEqual(Object.fromEntries(Object.entries(curriculum.statements).map(([year, rows]) => [year, rows.length])), { 7: 23, 8: 22, 9: 31, 10: 30 });
    assert.equal(new Set(allStatements.map((statement) => statement.id)).size, allStatements.length, "Curriculum statement IDs are unique");
    for (const statement of allStatements) {
        assert.ok(["digital-technology", "systems-and-control"].includes(statement.strand));
        assert.ok(["knowledge", "practices"].includes(statement.kind));
        assert.ok(statement.text.length > 20 && statement.pathways.length > 0 && statement.pathways.every((id) => ids.includes(id)), `${statement.id} is tagged`);
        if (statement.strand === "systems-and-control") assert.deepEqual([...statement.pathways], ["systems-and-control"]);
    }
    for (const year of ["7", "8", "9", "10"]) for (const strand of ["digital-technology", "systems-and-control"]) for (const kind of ["knowledge", "practices"]) {
        assert.ok(curriculum.statements[year].some((statement) => statement.strand === strand && statement.kind === kind), `Year ${year} ${strand} ${kind}`);
    }
    const verbatim = (id) => allStatements.find((statement) => statement.id === id).text;
    assert.equal(verbatim("sc-8-p-2"), "Produce annotated system diagrams that explain subsystems, reliability risks, and input\u2013output transformations.");
    assert.ok(allStatements.some((statement) => statement.text.startsWith("Compare algorithms")) && allStatements.some((statement) => statement.text.startsWith("Analyse how data")), "Year 8 merged bullet is split");
    assert.ok(html.indexOf('src="progression-curriculum.js"') > 0 && html.indexOf('src="progression-curriculum.js"') < html.indexOf('src="progression-pathway.js"'), "Curriculum data loads before the page script");
    assert.ok(html.includes('id="progression-curriculum"'), "Dialog has a Curriculum Coverage section");
    const mappingModule = require("../learning-pathways/progression-mapping");
    const statementContext = vm.createContext({ progressionCurriculum: curriculum, progressionMapping: mappingModule, progression: { mapping: null, completed: [], record: { statements: [
        { id: "dt-7-p-1", discipline: "food", coverage: "taught" }, { id: "dt-7-k-1", discipline: "dtech", coverage: "partly-taught" }] } } });
    vm.runInContext(client.slice(client.indexOf("const progressionCoverageOptions"), client.indexOf("function progressionUpdateStatements(")), statementContext);
    for (const id of ids) for (const year of [7, 8, 9, 10]) {
        assert.match(statementContext.progressionStatement(id, year), new RegExp(`^Year ${year}: \\d+ of \\d+ linked curriculum statements with Full Evidence`), `${id} has Year ${year} linked statements`);
    }
    assert.match(statementContext.progressionStatement("programming-and-algorithms", 7), /^Year 7: 1 of \d+ linked curriculum statements with Full Evidence/, "Hints count Full Evidence statements");
    assert.equal(statementContext.progressionCurriculumStatements(9).length, 31);
    assert.equal(statementContext.progressionStatementResult("sc-9-k-1").coverage, "not-taught", "Unrecorded statements default to Not taught");
    assert.match(client, /progressionDisciplines = \[\["dtech", "DTECH"\], \["textiles", "Textiles"\], \["food", "Food"\], \["wood", "Wood"\], \["dvc", "DVC"\]\]/);
    assert.match(client, /discipline: "dtech", addressed/, "New records default to the DTECH discipline");
    assert.match(client, /pp\("level"\)\.addEventListener\("change", progressionUpdateStatements\)/, "Changing year level updates the statements");
    assert.match(client, /function progressionUpdateStatements\(\) \{\s*progressionAutoSet\(\);\s*progressionRenderCurriculum\(\);\s*progressionRefreshPathways\(\);/);
    assert.ok(!html.includes('<th scope="col">Discipline</th><th scope="col">Coverage</th><th scope="col">Progress</th>'), "Discipline is recorded per curriculum statement");
    assert.ok(client.includes('<th scope="col">Statement</th><th scope="col">Discipline</th><th scope="col">Coverage</th></tr></thead>'), "Curriculum statements no longer have a Progress column");
    assert.ok(!client.includes("Progress for: ${statement.text}"), "Statement-level Progress selects are removed");
    assert.match(client, /header\.append\(heading, progressionStrandProgress\(strand, kind, title\)\);/, "Each Knowledge and Practices heading has a Progress box");
    assert.match(client, /progressionCurriculumTable\("Knowledge", [^\n]*strand, "knowledge"\)\);[\s\S]*progressionCurriculumTable\("Practices", [^\n]*strand, "practices"\)\);/);
    assert.match(client, /const level = progressionMapping\.deriveSetProgress\(coverages, current\);/, "Set Progress is calculated from the Statement Set");
    assert.match(client, /select\.disabled = !consolidated;/, "Teachers can only choose Set Progress once the set is Consolidating");
    assert.match(client, /label\.append\("Set Progress"\);/, "Statement Sets show a Set Progress indicator");
    assert.match(client, /\["not-taught", "No Evidence"\], \["partly-taught", "Some Evidence"\], \["taught", "Full Evidence"\]/, "Coverage uses evidence wording");
    for (const old of ["Not taught", "Partly taught"]) for (const [name, text] of [["client", client], ["html", html]]) assert.ok(!text.includes(old), `${name} no longer says ${old}`);
    assert.match(css, /\.progression-strand-header \{ display: flex;[^}]*justify-content: space-between;/, "Strand Progress sits on the far right of the heading");
    assert.match(client, /if \(key === "coverage" && value === "not-taught"\) entry\.descriptor = null;/, "Legacy statement Progress is cleared when Not taught");
    for (const value of ["not-taught", "partly-taught", "taught"]) assert.match(css, new RegExp(`select\\.coverage-${value} \\{ background: #`), `Coverage ${value} is colour coded`);
    assert.match(client, /function progressionCoverageColour\(select\) \{\s*select\.className = `coverage-chip coverage-\$\{select\.value\}`;/);
    assert.match(html, /<h2>Teacher Summary<\/h2>\s*<details id="progression-comment-builder"[\s\S]*?<\/details>\s*<label>Learning narrative<textarea id="progression-narrative"[^>]*maxlength="5000"[\s\S]*id="progression-next"/, "Learning narrative sits under Teacher Summary, after the Comment Bank builder");
    assert.match(client, /pp\("form"\)\.addEventListener\("input", \(event\) => \{\s*if \(event\.target\.closest\?\.\("\[data-comment-builder\]"\)\) return;\s*if \(progression\.record\) progressionQueueSave\(\);\s*\}\);/, "Every report change queues an auto-save; Comment Bank builder picks do not");
    assert.ok(html.includes("Changes save automatically.") && /id="progression-save"[^>]*hidden>Retry save/.test(html), "Save button only appears to retry a failed auto-save");
    const element = () => ({ value: "", disabled: false, hidden: false, textContent: "", classList: { set: new Set(), toggle(name, on) { on ? this.set.add(name) : this.set.delete(name); }, contains(name) { return this.set.has(name); } } });
    const elements = {};
    const calls = [];
    let release = [];
    const autosave = vm.createContext({ setTimeout, clearTimeout, Promise, Number, Date, JSON, console,
        window: { confirm: () => false }, hubAuthState: { profile: { email: "teacher@example.test" } }, hasAllowedSignedInHubAccount: () => true,
        pp: (name) => (elements[name] ||= element()), progressionStatus() {}, progressionStudentOptions() {}, progressionDialogSummary() {}, progressionInit() {},
        progressionApi: (_path, options) => new Promise((resolve) => {
            const body = JSON.parse(options.body);
            calls.push(body);
            release.push(() => resolve({ record: { ...body, revision: body.revision + 1, updatedAt: "2026-10-11T07:00:00Z", updatedBy: "teacher@example.test" } }));
        }) });
    vm.runInContext(client.slice(client.indexOf("const progression = {"), client.indexOf("const pp = ")), autosave);
    vm.runInContext(client.slice(client.indexOf("function progressionDiscard("), client.indexOf("function progressionMatchingStudents(")), autosave);
    vm.runInContext("progression.record = " + JSON.stringify({ ...sample, students: undefined }) + "; progression.students = [];", autosave);
    Object.assign(autosave.pp("year"), { value: "2027" }); Object.assign(autosave.pp("term"), { value: "1" }); Object.assign(autosave.pp("level"), { value: "7" });
    autosave.pp("narrative").value = "Built a binary piano.";
    vm.runInContext("progressionQueueSave(5)", autosave);
    for (let wait = 0; wait < 100 && calls.length < 1; wait += 1) await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(calls.length, 1, "Auto-save runs after a short pause");
    assert.equal(calls[0].learningNarrative, "Built a binary piano.");
    assert.equal(autosave.pp("year").disabled && autosave.pp("term").disabled, true, "Year and term lock once saving starts");
    autosave.pp("narrative").value = "Built a binary piano and encoded TECHNOLOGY.";
    vm.runInContext("progressionQueueSave(5)", autosave);
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(calls.length, 1, "Only one save runs at a time");
    release.shift()();
    for (let wait = 0; wait < 100 && calls.length < 2; wait += 1) await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(calls.length, 2, "Edits made during a save are saved next");
    assert.equal(calls[1].revision, 1, "The next auto-save uses the new revision");
    assert.equal(calls[1].learningNarrative, "Built a binary piano and encoded TECHNOLOGY.");
    const flushed = vm.runInContext("progressionFlush()", autosave);
    release.shift()();
    assert.equal(await flushed, true, "Closing waits for pending saves");
    assert.equal(vm.runInContext("progression.dirty", autosave), false);
    assert.match(autosave.pp("saved").textContent, /^All changes saved automatically/);
    assert.equal(autosave.pp("save").hidden, true);
    assert.ok(!client.includes("View / edit") && !client.includes('pp("strengths")') && !client.includes("progressionDetail"));
    assert.ok(!client.includes('pp("history")'), "No handlers depend on the removed selector");
    vm.runInContext(client.slice(client.indexOf("function progressionAnnualRecord("), client.indexOf("async function progressionLoadStudent(")), context);
    const annualRecords = [{ schoolYear: 2027, term: 3, revision: 2 }, { schoolYear: 2026, term: 1, revision: 1 }];
    assert.equal(context.progressionAnnualRecord(annualRecords, {}, 2027), annualRecords[0], "Reopens the single attended term in this school year");
    assert.equal(context.progressionAnnualRecord(annualRecords, {}, 2028), null, "A new school year does not overwrite earlier results");
    assert.equal(context.progressionAnnualRecord(annualRecords, { archived: true }, 2028), annualRecords[0]);
    const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
    const normalisation = vm.createContext({
        STUDENT_TIMETABLE_PERIOD_COLUMNS: [], DTECH_TIMETABLE_KEYWORDS: [], TIMETABLE_LABELS: new Map(),
        getStudentPrograms: () => [], collectStudentLinkedEmails: () => []
    });
    vm.runInContext(serverSource.slice(serverSource.indexOf("function buildLowerKeyMap("), serverSource.indexOf("function mergeUniqueStrings("))
        + serverSource.slice(serverSource.indexOf("function buildStudentClassManagementRow("), serverSource.indexOf("function getStudentIdentityKey(")), normalisation);
    for (const key of ["timetable_class", "Timetable Class", "TimetableClass"]) {
        const row = normalisation.buildStudentClassManagementRow({ first_name: "Example", year_level: "8", tutor: "8WPAPA", [key]: "JVE" });
        assert.equal(row.timetable_class, "JVE", "Timetable Class is normalised independently of Tutor");
        assert.equal(row.homeroom, "8WPAPA");
    }
    const dedupeStart = serverSource.indexOf("function dedupeToLatestStudentRows(");
    vm.runInContext(serverSource.slice(serverSource.indexOf("function mergeUniqueStrings("), serverSource.indexOf("function collectStudentLinkedEmails("))
        + serverSource.slice(serverSource.indexOf("function getStudentIdentityKey("), serverSource.indexOf("\nconst suggestionNotificationFallback", dedupeStart)), normalisation);
    const merged = normalisation.dedupeToLatestStudentRows([
        normalisation.buildStudentClassManagementRow({ id_number: "1", first_name: "Zoe", year_level: "8", tutor: "8WPAPA", timetable_class: "JVE", upload_date: "2026-01-01" }),
        normalisation.buildStudentClassManagementRow({ id_number: "1", first_name: "Zoe", year_level: "8", upload_date: "2026-06-01" })
    ]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].timetable_class, "JVE", "A newer snapshot without Timetable Class keeps the uploaded class");
    const syncQueries = [];
    const syncContext = vm.createContext({
        hasDatabase: true, Date,
        pool: { query: async (sql) => { syncQueries.push(sql); return { rowCount: 2 }; } }
    });
    vm.runInContext(serverSource.slice(serverSource.indexOf("const STUDENT_TIMETABLE_CLASS_SYNC_INTERVAL_MS"), serverSource.indexOf("async function getStudentDirectoryRows(")), syncContext);
    assert.equal((await syncContext.syncStudentTimetableClasses(["student_upload"])).skipped, true, "Sync needs both upload tables");
    assert.deepEqual({ ...(await syncContext.syncStudentTimetableClasses(["student_details_upload", "student_upload"])) }, { updated: 2, skipped: false });
    assert.match(syncQueries[0], /ADD COLUMN IF NOT EXISTS timetable_class/);
    assert.match(syncQueries[1], /UPDATE student_upload[\s\S]*FROM student_details_upload[\s\S]*id_number/, "Database rows are matched by Student ID");
    assert.equal((await syncContext.syncStudentTimetableClasses(["student_details_upload", "student_upload"])).skipped, true, "Sync is throttled");
    assert.ok(serverSource.includes("await syncStudentTimetableClasses(tableNames)"), "Directory reads persist the merge first");
    const timetableStudents = [
        { name: "Year seven", email: "seven", yearLevel: 7, timetableClass: "JPI", homeroom: "7WHAU", formClass: "7WHAU" },
        { name: "Year eight", email: "eight", yearLevel: 8, timetableClass: "JPI", homeroom: "8WPAPA", formClass: "8WPAPA" },
        { name: "Other class", email: "other", yearLevel: 7, timetableClass: "JVE", homeroom: "JPI", formClass: "JPI" },
        { name: "Blank class", email: "blank", yearLevel: 7, timetableClass: "", homeroom: "JPI", formClass: "JPI" }
    ];
    assert.deepEqual(Array.from(context.progressionMatchingStudents(timetableStudents, "JPI", "", ""), (student) => student.email), ["seven", "eight"]);
    assert.deepEqual(Array.from(context.progressionMatchingStudents(timetableStudents, "JPI", "7", ""), (student) => student.email), ["seven"]);
    const withStaff = [...timetableStudents, { name: "Pringle, Vanessa", email: "vp", yearLevel: "", timetableClass: "", isStaff: true }];
    assert.deepEqual(Array.from(context.progressionMatchingStudents(withStaff, "JPI", "staff", ""), (student) => student.email), ["vp"], "Staff filter ignores timetable class");
    assert.equal(context.progressionMatchingStudents(withStaff, "", "staff", "nobody").length, 0);
    assert.equal(context.progressionMatchingStudents(withStaff, "", "", "").length, 4, "Staff are not mixed into student lists");
    assert.match(fs.readFileSync(path.join(root, "learning-pathways/progression-pathway.html"), "utf8"), /id="progression-year-filter"[^\n]*<option value="staff">Staff<\/option>/);
    assert.equal(context.progressionMatchingStudents(timetableStudents, "", "", "8wpapa").length, 1, "Tutor remains searchable separately");
    assert.equal(validateRecord({ ...sample, timetableClass: "JPI" }).timetableClass, "JPI");
    assert.throws(() => validateRecord({ ...sample, timetableClass: "x".repeat(101) }));
    assert.match(serverSource, /homeroom: pickRowValue\(lower, \["homeroom", "home_room", "home room"/,
        "Explicit homeroom takes priority over class fields");
    const registrationStart = serverSource.indexOf("async function getYear7To10Students(");
    const registrationEnd = serverSource.indexOf("app.use(express.static", registrationStart);
    let directoryAdapter;
    let activityStudents;
    vm.runInNewContext(serverSource.slice(registrationStart, registrationEnd), {
        require: () => ({
            registerActivityProgress: (_app, config) => { activityStudents = config.getStudents; },
            registerProgressionPathway: (_app, config) => { directoryAdapter = config.getStudents; },
            registerCommentBank: () => {},
            registerCertificateCatchup: () => {}
        }),
        registerTypingKit: () => {}, canManagePracticalSchedule: () => false,
        ensurePracticalSkillsProgressSchema: async () => {}, ensureEmailLogsSchema: async () => {},
        getPracticalSkillsCertificateTeacherRecipients: async () => [], getStoredPracticalSkillsKitContent: async () => ({}),
        buildKitCertificate: () => ({}), getPracticalSkillsStudentName: async () => "", createKitCertificatePdf: async () => null,
        sendConfiguredHubEmail: async () => {},
        app: {}, pool: {}, hasDatabase: true, requireActivityWriteAccess: () => {}, requireAdminAccess: () => {},
        getRequestUserEmail: () => "", SCHOOL_EMAIL_DOMAIN: "example.test", getStaffMembers: async () => [],
        getStudentDirectoryRows: async () => [
            { student_name: "No email one", year_level: "Year 7", form_class: "7WHAU", homeroom: "7WHAU", timetable_class: "JPI", linked_emails: [] },
            { student_name: "No email two", year_level: "8", form_class: "8WPAPA", homeroom: "8WPAPA", timetable_class: "JPI", linked_emails: [] },
            { student_name: "Linked student", year_level: "7", form_class: "7WHAU", homeroom: "7WHAU", timetable_class: "JPI", linked_emails: ["linked@example.test"] }
        ],
        buildStudentClassManagementRow: (row) => row, dedupeToLatestStudentRows: (rows) => rows,
        normalizeEmail: (value) => value.trim().toLowerCase()
    });
    assert.equal(activityStudents, directoryAdapter, "Unit Progression uses the same student directory");
    const directoryStudents = await directoryAdapter();
    assert.equal(directoryStudents.length, 3, "The directory adapter does not omit students without email");
    assert.equal(context.progressionMatchingStudents(directoryStudents, "JPI", "", "").length, 3);
    assert.deepEqual(validateRecord(sample), sample);
    const legacy = { ...sample };
    delete legacy.homeroom;
    assert.equal(validateRecord(legacy).homeroom, sample.formClass, "Existing records without homeroom remain compatible");
    assert.throws(() => validateRecord({ ...sample, homeroom: "x".repeat(101) }));
    for (const bad of [
        { ...sample, yearLevel: 11 }, { ...sample, term: 5 }, { ...sample, revision: -1 },
        { ...sample, pathways: [] }, { ...sample, strengths: "a".repeat(5001) },
        { ...sample, pathways: sample.pathways.map((row) => ({ ...row, id: "data" })) }
    ]) assert.throws(() => validateRecord(bad));
    const rated = clone(sample);
    rated.pathways[0].coverage = "taught";
    rated.pathways[0].descriptor = "proficient";
    rated.pathways[0].evidence = "Observation and annotated diagram";
    assert.equal(validateRecord(rated).pathways[0].descriptor, "proficient");
    for (const descriptor of ["emerging", "developing", "consolidating", "proficient", "exceeding"]) {
        rated.pathways[0].descriptor = descriptor;
        assert.equal(validateRecord(rated).pathways[0].descriptor, descriptor);
    }
    const noDiscipline = clone(sample);
    delete noDiscipline.pathways[0].discipline;
    assert.equal(validateRecord(noDiscipline).pathways[0].discipline, "dtech", "Records saved before disciplines default to DTECH");
    for (const discipline of ["dtech", "textiles", "food", "wood", "dvc"]) {
        rated.pathways[0].discipline = discipline;
        assert.equal(validateRecord(rated).pathways[0].discipline, discipline);
    }
    rated.pathways[0].discipline = "metal";
    assert.throws(() => validateRecord(rated), /discipline/);
    rated.pathways[0].discipline = "textiles";
    const withStatements = clone(sample);
    withStatements.statements = [{ id: "sc-8-p-2", coverage: "taught", discipline: "wood" }, { id: "dt-10-k-1", coverage: "partly-taught" }];
    assert.deepEqual(validateRecord(withStatements).statements, [{ id: "sc-8-p-2", coverage: "taught", discipline: "wood", descriptor: null }, { id: "dt-10-k-1", coverage: "partly-taught", discipline: "dtech", descriptor: null }]);
    withStatements.statements[0].descriptor = "proficient";
    assert.equal(validateRecord(withStatements).statements[0].descriptor, "proficient", "Curriculum statements store a Progress descriptor");
    assert.ok(!("statements" in validateRecord(sample)), "Records without curriculum statements are unchanged");
    const strandProgress = [{ strand: "digital-technology", kind: "knowledge", descriptor: "developing" }, { strand: "systems-and-control", kind: "practices", descriptor: null }];
    assert.deepEqual(validateRecord({ ...clone(sample), strandProgress }).strandProgress, strandProgress, "Strand Knowledge/Practices Progress is stored");
    assert.ok(!("strandProgress" in validateRecord(sample)));
    for (const bad of [[{ strand: "food", kind: "knowledge", descriptor: null }], [{ strand: "digital-technology", kind: "skills", descriptor: null }],
        [{ strand: "digital-technology", kind: "knowledge", descriptor: "achieved" }], [strandProgress[0], strandProgress[0]], "developing"]) {
        assert.throws(() => validateRecord({ ...clone(sample), strandProgress: bad }), /strand progress/i, `Rejects strand progress ${JSON.stringify(bad)}`);
    }
    for (const bad of [[{ id: "xx-1", coverage: "taught" }], [{ id: "sc-8-p-2", coverage: "done" }], [{ id: "sc-8-p-2", coverage: "taught", discipline: "metal" }], [{ id: "sc-8-p-2", coverage: "taught", descriptor: "achieved" }], [{ id: "sc-8-p-2", coverage: "not-taught", descriptor: "emerging" }],
        [{ id: "sc-8-p-2", coverage: "taught" }, { id: "sc-8-p-2", coverage: "taught" }], "sc-8-p-2"]) {
        assert.throws(() => validateRecord({ ...clone(sample), statements: bad }), undefined, `Rejects ${JSON.stringify(bad)}`);
    }
    assert.ok(!("learningNarrative" in validateRecord(sample)), "Records without a learning narrative are unchanged");
    assert.equal(validateRecord({ ...clone(sample), learningNarrative: " Explored binary. " }).learningNarrative, "Explored binary.");
    assert.throws(() => validateRecord({ ...clone(sample), learningNarrative: "x".repeat(5001) }), /learning narrative/);
    assert.throws(() => validateRecord({ ...clone(sample), learningNarrative: 5 }), /learning narrative/);
    rated.pathways[0].descriptor = "achieved";
    assert.throws(() => validateRecord(rated));
    rated.pathways[0].descriptor = "proficient";
    rated.pathways[0].coverage = "not-taught";
    assert.throws(() => validateRecord(rated), /Not determined/);

    const progressionMapping = require("../learning-pathways/progression-mapping");
    const defaults = progressionMapping.defaultMapping();
    assert.deepEqual(defaults.verifiedYears, [7], "Only Year 7 is verified from the workbook");
    assert.equal(progressionMapping.statementCode("dt-7-k-3"), "DT-K03");
    assert.deepEqual(defaults.links["dt-7-k-3"], [{ pathway: "digital-systems", role: "primary" }, { pathway: "data", role: "supporting" }], "DT-K03 links DS (Primary) and D&I (Supporting)");
    assert.deepEqual(defaults.links["dt-7-p-1"].map((link) => link.role), ["context", "context", "context", "context"], "DT-P01 is context dependent");
    assert.ok(defaults.links["sc-7-k-1"].every((link) => link.pathway === "systems-and-control" && link.role === "primary"));
    assert.deepEqual(defaults.activities.map((link) => [link.activity, link.statement, link.autoSet]),
        [["activity-encoding-binary", "dt-7-k-3", "yes"], ["activity-encoding-binary", "dt-7-p-4", "review"]], "Encoding Binary auto-sets DT-K03 and asks for review of DT-P04");
    const allStatementIds = Object.values(curriculum.statements).flat().map((statement) => statement.id);
    assert.ok(allStatementIds.every((id) => Array.isArray(defaults.links[id])), "Every year is seeded");
    assert.deepEqual(progressionMapping.validateMapping(defaults, ["activity-encoding-binary"]), defaults);
    for (const bad of [
        { ...defaults, links: { ...defaults.links, "dt-7-k-3": [{ pathway: "data", role: "main" }] } },
        { ...defaults, links: { ...defaults.links, "xx-1": [] } },
        { ...defaults, links: { ...defaults.links, "dt-7-k-3": [{ pathway: "data", role: "primary" }, { pathway: "data", role: "supporting" }] } },
        { ...defaults, activities: [...defaults.activities, defaults.activities[0]] },
        { ...defaults, activities: [{ activity: "activity-binary-piano", statement: "dt-7-k-3", autoSet: "yes", note: "" }] },
        { ...defaults, activities: [{ ...defaults.activities[0], autoSet: "always" }] },
        { ...defaults, activities: [{ ...defaults.activities[0], note: "x".repeat(501) }] },
        { ...defaults, verifiedYears: [11] }
    ]) assert.throws(() => progressionMapping.validateMapping(bad, ["activity-encoding-binary"]), undefined, "Rejects invalid mapping");
    const coverageOf = (values) => (id) => values[id] || "not-taught";
    const derive = (pathway, values) => progressionMapping.derivePathwayCoverage(defaults, 7, pathway, coverageOf(values));
    assert.equal(derive("digital-systems", {}), "not-taught");
    assert.equal(derive("digital-systems", { "dt-7-k-3": "partly-taught" }), "partly-taught");
    assert.equal(derive("data", { "dt-7-k-3": "taught" }), "partly-taught", "Supporting links also count towards coverage");
    const dsTaught = Object.fromEntries(curriculum.statements[7].filter((statement) => defaults.links[statement.id].some((link) => link.pathway === "digital-systems" && link.role !== "context")).map((statement) => [statement.id, "taught"]));
    assert.equal(derive("digital-systems", dsTaught), "taught", "Context dependent links are optional for Taught");
    assert.equal(derive("digital-systems", { ...dsTaught, "dt-7-p-1": "partly-taught" }), "partly-taught", "Covered context dependent links must be Taught too");
    assert.equal(derive("digital-citizenship", { "dt-7-p-1": "taught" }), "partly-taught", "A covered context link shows partial coverage");
    const setProgress = progressionMapping.deriveSetProgress;
    const set = (...values) => [...values, ...Array(5 - values.length).fill("not-taught")];
    assert.equal(setProgress(set(), null), null, "No evidence leaves Set Progress Not determined");
    assert.equal(setProgress(set("partly-taught"), null), "emerging", "Any Some Evidence is Emerging");
    assert.equal(setProgress(set("taught", "taught"), null), "emerging", "One or two Full Evidence statements are Emerging");
    assert.equal(setProgress(set("partly-taught", "taught", "partly-taught"), null), "developing", "Three with Some or Full Evidence are Developing");
    assert.equal(setProgress(Array(5).fill("partly-taught"), null), "developing", "All Some Evidence is still Developing");
    assert.equal(setProgress(Array(5).fill("taught"), null), "consolidating", "All Full Evidence is Consolidating");
    assert.equal(setProgress(Array(5).fill("taught"), "exceeding"), "exceeding", "Teachers may raise a Consolidating set to Exceeding");
    assert.equal(setProgress(Array(5).fill("taught"), "proficient"), "proficient", "Teachers may raise a Consolidating set to Proficient");
    assert.equal(setProgress(Array(5).fill("taught"), "emerging"), "consolidating", "Teachers cannot lower an automatic level");
    assert.equal(setProgress(set("taught", "taught", "taught", "taught"), "proficient"), "developing", "Proficient reverts when evidence drops");
    assert.equal(setProgress(set("partly-taught"), "exceeding"), "emerging", "Exceeding needs a Consolidating set");
    assert.equal(setProgress(set(undefined, "taught"), null), "emerging", "Unrecorded statements count as No Evidence");
    const statementRows = [];
    assert.deepEqual(progressionMapping.autoApply(defaults, 7, statementRows, ["activity-encoding-binary"]), ["dt-7-k-3"]);
    assert.deepEqual(statementRows, [{ id: "dt-7-k-3", discipline: "dtech", coverage: "partly-taught", descriptor: null, autoFrom: "activity-encoding-binary" }], "Auto-set only reaches Partly taught and never sets descriptors");
    statementRows[0].coverage = "not-taught";
    assert.deepEqual(progressionMapping.autoApply(defaults, 7, statementRows, ["activity-encoding-binary"]), [], "A teacher override is not re-applied");
    const taughtRows = [{ id: "dt-7-k-3", discipline: "food", coverage: "taught", descriptor: "proficient" }];
    assert.deepEqual(progressionMapping.autoApply(defaults, 7, taughtRows, ["activity-encoding-binary"]), [], "Auto-set never downgrades");
    assert.equal(taughtRows[0].coverage, "taught");
    assert.deepEqual(progressionMapping.autoApply(defaults, 8, [], ["activity-encoding-binary"]), [], "Year 7 links do not apply to Year 8");
    assert.deepEqual(progressionMapping.autoApply(defaults, 7, [], []), [], "Nothing is set without a completed activity");
    assert.equal(validateRecord({ ...clone(sample), statements: [{ id: "dt-7-k-3", coverage: "partly-taught", autoFrom: "activity-encoding-binary" }] }).statements[0].autoFrom, "activity-encoding-binary");
    assert.throws(() => validateRecord({ ...clone(sample), statements: [{ id: "dt-7-k-3", coverage: "partly-taught", autoFrom: "activity-binary-piano" }] }), /activity source/);
    const adminHtml = fs.readFileSync(path.join(root, "learning-pathways/curriculum-mapping.html"), "utf8");
    const adminClient = fs.readFileSync(path.join(root, "learning-pathways/curriculum-mapping.js"), "utf8");
    assert.match(fs.readFileSync(path.join(root, "admin-menu.html"), "utf8"), /href="learning-pathways\/curriculum-mapping\.html">\s*<h2>Curriculum Mapping<\/h2>/);
    assert.ok(adminHtml.indexOf('src="progression-mapping.js"') > adminHtml.indexOf('src="progression-curriculum.js"') && adminHtml.indexOf('src="progression-mapping.js"') < adminHtml.indexOf('src="curriculum-mapping.js"'));
    assert.ok(adminClient.includes('"/api/admin/progression/mapping"') && adminClient.includes("withHubAuthHeaders") && adminClient.includes("beforeunload"));
    assert.ok(adminClient.includes("revision: state.revision"), "Publishing sends the loaded revision");

    const records = new Map();
    const completedRows = [{ activity_id: "activity-encoding-binary", completed_at: "2026-10-01T00:00:00Z" }, { activity_id: "retired-activity", completed_at: "2026-10-01T00:00:00Z" }];
    let savedMapping = null;
    let fail = false;
    const pool = { query: async (sql, params = []) => {
        if (fail) throw new Error("Database failure");
        if (sql.includes("CREATE TABLE")) return { rows: [] };
        if (sql.includes("learning_pathways_activity_progress")) return { rows: params[0] === sample.studentEmail ? completedRows : [] };
        if (sql.includes("FROM progression_curriculum_mapping")) return { rows: savedMapping ? [savedMapping] : [] };
        if (sql.includes("INSERT INTO progression_curriculum_mapping")) {
            if (savedMapping) return { rows: [] };
            savedMapping = { mapping: JSON.parse(params[0]), revision: 1, updated_by: params[1], updated_at: new Date().toISOString() };
            return { rows: [{ revision: 1 }] };
        }
        if (sql.includes("UPDATE progression_curriculum_mapping")) {
            if (!savedMapping || savedMapping.revision !== params[2]) return { rows: [] };
            savedMapping = { mapping: JSON.parse(params[0]), revision: savedMapping.revision + 1, updated_by: params[1], updated_at: new Date().toISOString() };
            return { rows: [{ revision: savedMapping.revision }] };
        }
        if (sql.includes("SELECT DISTINCT ON")) return { rows: [...records.values()].map((row) => ({ student_email: row.record.studentEmail, record: row.record })) };
        if (sql.includes("SELECT record")) return { rows: [...records.values()].filter((row) => row.record.studentEmail === params[0])
            .sort((a, b) => b.record.schoolYear - a.record.schoolYear || b.record.term - a.record.term) };
        const key = params.slice(0, 3).join("|");
        const old = records.get(key);
        if (sql.includes("INSERT INTO") && old) return { rows: [] };
        if (sql.includes("UPDATE progression") && (!old || old.revision !== params[5])) return { rows: [] };
        const row = { record: JSON.parse(params[3]), revision: (old?.revision || 0) + 1,
            updated_by: params[4], updated_at: new Date().toISOString() };
        records.set(key, row);
        return { rows: [row] };
    } };
    const auth = (req, res, next) => {
        if (!["teacher", "admin"].includes(req.headers["x-test-role"])) return res.status(403).json({ error: "Teacher required" });
        req.user_email = "teacher@example.test"; next();
    };
    const adminAuth = (req, res, next) => {
        if (req.headers["x-test-role"] !== "admin") return res.status(403).json({ error: "Admin required" });
        req.user_email = "admin@example.test"; next();
    };
    const options = { pool, hasDatabase: true, requireTeacherAccess: auth, requireAdminAccess: adminAuth,
        getStudents: async () => [
            { email: sample.studentEmail, name: "Example Student", yearLevel: 7, formClass: "7XX" },
            { email: "", name: "Unlinked one", yearLevel: 7, formClass: "JPI" },
            { email: "", name: "Unlinked two", yearLevel: 8, formClass: "JPI" }
        ],
        getStaff: async () => [{ email: "Teacher@Example.test", name: "Pringle, Vanessa" }, { email: sample.studentEmail, name: "Not duplicated" }] };
    const app = express(); app.use(express.json()); registerProgressionPathway(app, options);
    const server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/teacher/progression`;
    const headers = { "Content-Type": "application/json", "x-test-role": "teacher" };
    const put = (record, role = "teacher") => fetch(`${base}/records`, { method: "PUT",
        headers: { ...headers, "x-test-role": role }, body: JSON.stringify(record) });
    try {
        assert.equal((await fetch(`${base}/students`)).status, 403);
        assert.equal((await fetch(`${base}/records?studentEmail=${sample.studentEmail}`)).status, 403);
        assert.equal((await put(sample, "student")).status, 403);
        assert.equal((await fetch(`${base}/students`, { headers })).status, 200);
        const directory = (await (await fetch(`${base}/students`, { headers })).json()).students;
        assert.equal(directory.filter((student) => !student.email).length, 2, "Both unlinked students remain in the class list");
        assert.equal((await put({ ...sample, studentEmail: "unknown@example.test" })).status, 400);
        const staffRow = directory.find((student) => student.email === "teacher@example.test");
        assert.equal(staffRow.isStaff, true, "Staff are listed for the Staff year filter");
        assert.equal(staffRow.name, "Pringle, Vanessa");
        assert.equal(directory.filter((student) => student.email === sample.studentEmail).length, 1, "Students are not duplicated as staff");
        assert.equal((await put({ ...sample, studentEmail: "teacher@example.test" })).status, 200, "Staff can save a test record");
        const staffProgress = (await (await fetch(`${base}/students`, { headers })).json()).students.find((student) => student.email === "teacher@example.test");
        assert.equal(staffProgress.isStaff, true); assert.ok(staffProgress.progress, "Staff record shows in the class list");
        const savedResponse = await put(sample);
        assert.equal(savedResponse.status, 200);
        const saved = (await savedResponse.json()).record;
        assert.equal(saved.timetableClass, "JPI", "Timetable Class snapshot survives save");
        assert.equal(saved.revision, 1); assert.equal(saved.updatedBy, "teacher@example.test");
        assert.equal((await put(sample)).status, 409);
        saved.pathways[0].coverage = "taught"; saved.pathways[0].descriptor = "consolidating";
        saved.pathways[0].addressed = "Inputs and outputs";
        assert.equal((await put(saved)).status, 200);
        assert.equal((await put(saved)).status, 409, "Stale edit cannot overwrite another save");
        assert.equal((await put({ ...sample, term: 2, yearLevel: 8 })).status, 200);
        assert.equal((await put({ ...sample, schoolYear: 2028, yearLevel: 8 })).status, 200);
        const response = await fetch(`${base}/records?studentEmail=${sample.studentEmail}`, { headers });
        assert.match(response.headers.get("cache-control"), /no-store/);
        const historyBody = await response.json();
        const history = historyBody.records;
        assert.deepEqual(historyBody.completedActivities, [{ id: "activity-encoding-binary", title: "Encoding Binary", completedAt: "2026-10-01T00:00:00Z" }], "Records include completed tracked activities only");
        const mappingUrl = `http://127.0.0.1:${server.address().port}/api/admin/progression/mapping`;
        const teacherMapping = await (await fetch(`${base}/mapping`, { headers })).json();
        assert.equal(teacherMapping.revision, 0, "Unpublished mapping uses the workbook defaults");
        assert.deepEqual(teacherMapping.mapping, JSON.parse(JSON.stringify(defaults)));
        assert.deepEqual(teacherMapping.activities.map((activity) => activity.id), ["activity-encoding-binary"]);
        assert.equal((await fetch(mappingUrl, { headers })).status, 403, "Teachers cannot open the admin mapping");
        const publish = (mapping, revision, role = "admin") => fetch(mappingUrl, { method: "PUT", headers: { ...headers, "x-test-role": role }, body: JSON.stringify({ mapping, revision }) });
        assert.equal((await publish(defaults, 0, "teacher")).status, 403, "Teachers cannot publish mappings");
        const edited = clone(defaults);
        edited.activities[1].autoSet = "yes";
        edited.verifiedYears = [7, 8];
        assert.equal((await publish({ ...edited, activities: [{ ...edited.activities[0], autoSet: "maybe" }] }, 0)).status, 400);
        const published = await publish(edited, 0);
        assert.equal(published.status, 200);
        const publishedBody = await published.json();
        assert.equal(publishedBody.revision, 1); assert.equal(publishedBody.updatedBy, "admin@example.test");
        assert.deepEqual(publishedBody.mapping.verifiedYears, [7, 8]);
        assert.equal((await publish(defaults, 0)).status, 409, "A stale publish cannot overwrite another admin");
        assert.equal((await (await fetch(`${base}/mapping`, { headers })).json()).mapping.activities[1].autoSet, "yes", "Teachers see the published mapping");
        assert.equal((await publish(defaults, 1)).status, 200);
        savedMapping.mapping.activities.push({ activity: "retired-activity", statement: "dt-7-k-3", autoSet: "yes", note: "" });
        const originalError = console.error; console.error = () => {};
        try { assert.equal((await (await fetch(`${base}/mapping`, { headers })).json()).mapping.activities.length, 2, "Outdated activity links are ignored"); }
        finally { console.error = originalError; }
        assert.equal(history.length, 3, "Separate year/term history persists");
        assert.equal(history[2].pathways[0].descriptor, "consolidating");
        assert.equal(history[2].yearLevel, 7, "Year level is a historical snapshot");
        assert.equal(history[2].homeroom, "JPI", "Homeroom persists separately from class and term");
        const rosterStudent = (await (await fetch(`${base}/students`, { headers })).json()).students
            .find((student) => student.email === sample.studentEmail);
        assert.equal(rosterStudent.progress.schoolYear, 2028, "Roster includes the latest saved results");
        assert.deepEqual(rosterStudent.progress.pathways.map((pathway) => pathway.id), ids);
        assert.deepEqual(Object.keys(rosterStudent.progress.pathways[0]).sort(), ["coverage", "descriptor", "id"],
            "Roster summary omits evidence and teacher notes");
        assert.ok(Array.isArray(rosterStudent.progress.strandProgress), "Roster summary includes Statement Set Progress");
        const oldDirectory = options.getStudents;
        options.getStudents = async () => [];
        const oldStaff = options.getStaff;
        options.getStaff = async () => [];
        const historicalApp = express();
        const historicalHandlers = {};
        historicalApp.get = (url, ...functions) => { historicalHandlers[url] = functions.at(-1); };
        registerProgressionPathway(historicalApp, options);
        let archived;
        await historicalHandlers["/api/teacher/progression/students"]({}, { set() {}, json(data) { archived = data.students; } });
        assert.equal(archived[0].archived, true, "History remains discoverable after student moves beyond Year 10 or leaves directory");
        assert.ok(archived[0].progress, "Archived students also show their latest progression bars");
        options.getStudents = oldDirectory;
        options.getStaff = oldStaff;
        const restarted = express();
        const handlers = {};
        restarted.get = (url, ...functions) => { handlers[url] = functions.at(-1); };
        registerProgressionPathway(restarted, options);
        let result;
        await handlers["/api/teacher/progression/records"]({ query: { studentEmail: sample.studentEmail } },
            { set() {}, json(data) { result = data; } });
        assert.equal(result.records.length, 3, "Fresh registration reads durable records");
        fail = true;
        assert.equal((await put({ ...sample, term: 3 })).status, 500);
        assert.equal((await fetch(`${base}/records?studentEmail=${sample.studentEmail}`, { headers })).status, 500);
        fail = false;
    } finally { await new Promise((resolve) => server.close(resolve)); }
    const offline = express(); offline.use(express.json());
    registerProgressionPathway(offline, { ...options, hasDatabase: false });
    const offlineServer = offline.listen(0, "127.0.0.1");
    await new Promise((resolve) => offlineServer.once("listening", resolve));
    try {
        const response = await fetch(`http://127.0.0.1:${offlineServer.address().port}/api/teacher/progression/records`,
            { method: "PUT", headers, body: JSON.stringify(sample) });
        assert.equal(response.status, 503, "No database must not return a saved result");
    } finally { await new Promise((resolve) => offlineServer.close(resolve)); }
    console.log("Progression validation, teacher access, saves, conflicts and rotation history regressions passed.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
