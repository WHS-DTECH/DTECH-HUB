"use strict";

const progressionPathways = [
    ["digital-systems", "Digital Systems", "digital-systems"],
    ["data", "Data and Information", "data-and-information"],
    ["digital-citizenship", "Digital Citizenship", "digital-citizenship"],
    ["programming-and-algorithms", "Programming & Algorithms", "programming-and-algorithms"],
    ["systems-and-control", "Systems and Control", "systems-and-control"]
];
const progressionDescriptors = ["emerging", "developing", "consolidating", "proficient", "exceeding"];
const progressionSummaryGroups = [
    ["Digital Technology", ["data", "digital-citizenship", "digital-systems", "programming-and-algorithms"]],
    ["Systems and Control", ["systems-and-control"]]
];
function progressionSummary(student) {
    const summary = document.createElement("div");
    summary.className = "progression-summary";
    const progress = student.progress;
    const caption = document.createElement("p");
    caption.className = "progression-summary-caption";
    caption.textContent = progress ? `Latest results: ${progress.schoolYear} Term ${progress.term}` : "No results saved yet";
    summary.append(caption);
    for (const [group, ids] of progressionSummaryGroups) {
        const section = document.createElement("div");
        section.className = "progression-summary-group";
        const heading = document.createElement("strong");
        heading.className = "progression-summary-strand";
        heading.textContent = group;
        heading.style.gridRow = `span ${ids.length}`;
        section.append(heading);
        ids.forEach((id) => {
            const definition = progressionPathways.find(([pathwayId]) => pathwayId === id);
            const result = progress?.pathways?.find((pathway) => pathway.id === id);
            const level = progressionDescriptors.indexOf(result?.descriptor) + 1;
            const state = level ? result.descriptor : !result ? "Not recorded" : result.coverage === "not-taught" ? "Not taught" : "Not determined";
            const label = level ? `${state[0].toUpperCase()}${state.slice(1)}` : state;
            const value = document.createElement("div");
            value.className = "progression-summary-row";
            const name = document.createElement("a");
            name.href = `/learning-pathways/${definition[2]}.html`;
            name.textContent = definition[1];
            const bar = document.createElement("span");
            bar.className = "progression-bar";
            bar.setAttribute("role", "img");
            bar.setAttribute("aria-label", `${definition[1]}: ${label}${level ? ` (${level} of 5)` : ""}`);
            progressionDescriptors.forEach((descriptor, step) => {
                const segment = document.createElement("span");
                segment.className = step < level ? `progression-bar-segment ${descriptor}` : "progression-bar-segment";
                bar.append(segment);
            });
            const text = document.createElement("span");
            text.className = `progression-bar-label${level ? "" : " is-empty"}`;
            text.textContent = label;
            value.append(name, bar, text);
            section.append(value);
        });
        summary.append(section);
    }
    return summary;
}
const progression = { students: [], records: [], record: null, selected: "digital-systems", dirty: false, loading: 0, saving: false, teacherEmail: "" };
const pp = (name) => document.querySelector(`#progression-${name}`);
function progressionStatus(message, error = false) {
    pp("status").textContent = message;
    pp("status").classList.toggle("is-error", error);
}
async function progressionApi(path, options = {}) {
    const response = await fetch(`/api/teacher/progression/${path}`, {
        ...options, headers: withHubAuthHeaders({ "Content-Type": "application/json" }), cache: "no-store"
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
}
function progressionDiscard() {
    return !progression.dirty || window.confirm("Discard unsaved student result changes?");
}
function progressionMatchingStudents(students, homeroom, year, search) {
    const normalise = (value) => String(value || "").trim().toUpperCase();
    return students.filter((student) => (!homeroom || (student.timetableClass === undefined
        ? [student.homeroom, student.formClass] : [student.timetableClass]).some((value) => normalise(value) === normalise(homeroom)))
        && (!year || Number(student.yearLevel) === Number(year))
        && `${student.name} ${student.email} ${student.timetableClass || ""} ${student.homeroom || ""} ${student.formClass || ""}`.toLowerCase().includes(search.trim().toLowerCase()));
}
function progressionHomeroomOptions() {
    const selected = pp("homeroom-filter").value;
    const homerooms = new Set(["JVE", "JPI", "JMM", "JSR", "JSD", "7S", "8S"]);
    progression.students.forEach((student) => {
        for (const value of student.timetableClass === undefined ? [student.homeroom, student.formClass] : [student.timetableClass]) {
            const homeroom = String(value || "").trim().toUpperCase();
            if (homeroom) homerooms.add(homeroom);
        }
    });
    pp("homeroom-filter").replaceChildren(new Option("All timetable classes", ""));
    [...homerooms].sort().forEach((homeroom) => pp("homeroom-filter").append(new Option(homeroom, homeroom)));
    pp("homeroom-filter").value = selected;
}
function progressionStudentOptions() {
    const selected = pp("student").value;
    const matching = progressionMatchingStudents(progression.students, pp("homeroom-filter").value,
        pp("year-filter").value, pp("search").value);
    pp("student").replaceChildren(new Option("Select a student", ""));
    pp("roster").replaceChildren();
    for (const student of matching) {
        const label = `${student.name} - Year ${student.yearLevel} - ${student.timetableClass === undefined ? student.formClass || student.homeroom : student.timetableClass || "No timetable class"}${student.archived ? " (saved history)" : ""}`;
        if (student.email) pp("student").append(new Option(label, student.email));
        const row = document.createElement("li");
        const header = document.createElement("div");
        header.className = "progression-roster-header";
        const name = document.createElement("span");
        name.textContent = label;
        header.append(name);
        row.append(header);
        if (student.email) {
            const button = document.createElement("button");
            button.type = "button"; button.className = "button button-secondary"; button.textContent = "Open Details";
            button.setAttribute("aria-label", `Open details for ${student.name}`);
            button.addEventListener("click", () => {
                if (!progressionDiscard()) return;
                pp("student").value = student.email;
                void progressionLoadStudent(student.email);
            });
            header.append(button);
        } else {
            const warning = document.createElement("span");
            warning.className = "is-error"; warning.textContent = "School email not linked";
            header.append(warning);
        }
        row.append(progressionSummary(student));
        pp("roster").append(row);
    }
    pp("student").value = matching.some((student) => student.email === selected) ? selected : "";
    pp("filter-count").textContent = `${matching.length} matching student${matching.length === 1 ? "" : "s"}${matching.length ? " - class list below." : " - no students match these filters."}`;
    pp("email-warning").hidden = !matching.some((student) => !student.email);
    pp("email-warning").textContent = "Students without a linked school email are listed, but their email must be added to the student directory before results can be saved.";
    if (selected && !pp("student").value) void progressionLoadStudent("");
}
function progressionNewRecord(student) {
    const month = new Date().getMonth();
    return { studentEmail: student.email, schoolYear: new Date().getFullYear(), term: Math.min(4, Math.floor(month / 3) + 1),
        yearLevel: student.yearLevel, formClass: student.formClass, homeroom: student.homeroom || student.formClass,
        timetableClass: student.timetableClass || "", revision: 0, strengths: "", nextLearning: "",
        pathways: progressionPathways.map(([id]) => ({ id, coverage: "not-taught", descriptor: null, addressed: "", evidence: "", notes: "" })) };
}
function progressionDetail() {
    const definition = progressionPathways.find(([id]) => id === progression.selected);
    const row = progression.record.pathways.find((item) => item.id === progression.selected);
    pp("detail-title").textContent = definition[1];
    pp("reference").href = `/learning-pathways/${definition[2]}.html`;
    for (const key of ["addressed", "evidence", "notes"]) pp(key).value = row[key];
}
function progressionRender(record) {
    progression.record = JSON.parse(JSON.stringify(record));
    progression.dirty = false;
    pp("editor").hidden = false;
    pp("editor").disabled = false;
    for (const [control, key] of [["year", "schoolYear"], ["term", "term"], ["level", "yearLevel"], ["class", "formClass"], ["strengths", "strengths"], ["next", "nextLearning"]]) {
        pp(control).value = record[key];
    }
    pp("homeroom").value = record.homeroom || record.formClass;
    pp("timetable-class").value = record.timetableClass || "";
    pp("year").disabled = record.revision > 0;
    pp("term").disabled = record.revision > 0;
    pp("saved").textContent = record.updatedAt ? `Saved ${new Date(record.updatedAt).toLocaleString()} by ${record.updatedBy}` : "Student results - not saved yet.";
    pp("rows").replaceChildren();
    for (const [id, title] of progressionPathways) {
        const result = progression.record.pathways.find((row) => row.id === id);
        const row = document.createElement("tr");
        const name = document.createElement("th");
        name.scope = "row"; name.textContent = title; row.append(name);
        const coverage = document.createElement("select");
        coverage.setAttribute("aria-label", `${title} coverage`);
        for (const [value, label] of [["not-taught", "Not taught"], ["partly-taught", "Partly taught"], ["taught", "Taught"]]) coverage.append(new Option(label, value));
        coverage.value = result.coverage;
        const descriptor = document.createElement("select");
        descriptor.setAttribute("aria-label", `${title} progress`);
        descriptor.append(new Option("Not determined", ""));
        progressionDescriptors.forEach((value, index) => descriptor.append(new Option(`${index + 1} - ${value[0].toUpperCase() + value.slice(1)}`, value)));
        descriptor.value = result.descriptor || "";
        const colour = () => {
            descriptor.className = result.descriptor ? `descriptor-chip ${result.descriptor}` : "";
            descriptor.disabled = result.coverage === "not-taught";
        };
        colour();
        coverage.addEventListener("change", () => {
            result.coverage = coverage.value;
            if (result.coverage === "not-taught") { result.descriptor = null; descriptor.value = ""; }
            colour(); progression.dirty = true;
        });
        descriptor.addEventListener("change", () => { result.descriptor = descriptor.value || null; colour(); progression.dirty = true; });
        const details = document.createElement("button");
        details.type = "button"; details.className = "button button-secondary"; details.textContent = "View / edit";
        details.setAttribute("aria-label", `View or edit ${title} evidence`);
        details.addEventListener("click", () => { progression.selected = id; progressionDetail(); pp("detail").scrollIntoView({ block: "nearest" }); });
        for (const element of [coverage, descriptor, details]) { const cell = document.createElement("td"); cell.append(element); row.append(cell); }
        pp("rows").append(row);
    }
    progressionDetail();
}
function progressionAnnualRecord(records, student, schoolYear) {
    return records.find((record) => record.schoolYear === schoolYear) || (student.archived ? records[0] : null);
}
async function progressionLoadStudent(email) {
    const request = ++progression.loading;
    progression.record = null;
    progression.records = [];
    progression.dirty = false;
    pp("editor").hidden = true;
    if (!email) { progressionStatus("Find and select a Year 7-10 student."); return; }
    progressionStatus("Loading student results...");
    pp("retry").hidden = true;
    try {
        const data = await progressionApi(`records?studentEmail=${encodeURIComponent(email)}`);
        if (request !== progression.loading) return;
        if (!Array.isArray(data.records)) throw new Error("Saved term response is invalid.");
        progression.records = data.records;
        const student = progression.students.find((student) => student.email === email);
        const record = progressionAnnualRecord(data.records, student, new Date().getFullYear());
        progressionRender(record || progressionNewRecord(student));
        progressionStatus("Select a pathway to record coverage and evidence. Changes are not saved until you press Save.");
    } catch (error) {
        if (request !== progression.loading) return;
        console.error("Could not load progression term results", error);
        progressionStatus(error.message, true);
        pp("retry").hidden = false;
    }
}
async function progressionInit() {
    const request = ++progression.loading;
    const email = hubAuthState.profile?.email || "";
    if (progression.teacherEmail !== email) {
        progression.teacherEmail = email;
        progression.record = null; progression.records = []; progression.students = []; progression.dirty = false;
        pp("editor").hidden = true;
        pp("student").replaceChildren(new Option("Select a student", ""));
        pp("roster").replaceChildren();
        pp("email-warning").hidden = true;
    }
    pp("controls").disabled = true;
    pp("editor").disabled = true;
    if (!hasAllowedSignedInHubAccount()) {
        progression.record = null; progression.dirty = false;
        pp("filter-count").textContent = "";
        pp("retry").hidden = true;
        pp("editor").hidden = true; pp("student").replaceChildren(new Option("Select a student", ""));
        pp("roster").replaceChildren();
        pp("email-warning").hidden = true;
        progressionStatus("Sign in with a Teacher/Admin account to access student results.");
        return;
    }
    if (progression.saving) return;
    if (!hubAccessState.resolved) { progressionStatus("Checking Teacher View access..."); return; }
    if (!hubAccessState.canTeacherView && !hubAccessState.canAdmin) {
        pp("editor").hidden = true;
        pp("roster").replaceChildren();
        pp("student").replaceChildren(new Option("Select a student", ""));
        pp("filter-count").textContent = "";
        pp("email-warning").hidden = true;
        pp("retry").hidden = true;
        progressionStatus("Teacher/Admin access is required. Student results are not available in Student View.", true);
        return;
    }
    if (progression.dirty && progression.record) {
        pp("controls").disabled = false; pp("editor").disabled = false; return;
    }
    progressionStatus("Loading student directory...");
    try {
        const data = await progressionApi("students");
        if (request !== progression.loading) return;
        if (!Array.isArray(data.students)) throw new Error("Student directory response is invalid.");
        progression.students = data.students.sort((a, b) => a.name.localeCompare(b.name));
        progressionHomeroomOptions();
        progressionStudentOptions();
        pp("controls").disabled = false;
        pp("retry").hidden = true;
        if (pp("student").value) await progressionLoadStudent(pp("student").value);
        else progressionStatus("Find and select a Year 7-10 student.");
    } catch (error) {
        if (request !== progression.loading) return;
        console.error("Could not initialise progression page", error);
        progressionStatus(error.message, true); pp("retry").hidden = false;
    }
}
const progressionFilters = { search: "", "homeroom-filter": "", "year-filter": "" };
function progressionFilterChanged(name) {
    const matching = progressionMatchingStudents(progression.students, pp("homeroom-filter").value, pp("year-filter").value, pp("search").value);
    if (progression.record && !matching.some((student) => student.email === progression.record.studentEmail) && !progressionDiscard()) {
        pp(name).value = progressionFilters[name];
        return;
    }
    progressionFilters[name] = pp(name).value;
    progressionStudentOptions();
}
for (const [name, event] of [["search", "input"], ["homeroom-filter", "change"], ["year-filter", "change"]]) {
    pp(name).addEventListener(event, () => progressionFilterChanged(name));
}
pp("student").addEventListener("change", () => {
    if (!progressionDiscard()) { pp("student").value = progression.record?.studentEmail || ""; return; }
    void progressionLoadStudent(pp("student").value);
});
for (const key of ["addressed", "evidence", "notes"]) pp(key).addEventListener("input", () => {
    progression.record.pathways.find((row) => row.id === progression.selected)[key] = pp(key).value;
    progression.dirty = true;
});
pp("form").addEventListener("input", () => { if (progression.record) progression.dirty = true; });
pp("form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (progression.saving || !progression.record) return;
    const record = { ...progression.record, schoolYear: Number(pp("year").value), term: Number(pp("term").value),
        yearLevel: Number(pp("level").value), formClass: pp("class").value, homeroom: pp("homeroom").value,
        timetableClass: pp("timetable-class").value, strengths: pp("strengths").value, nextLearning: pp("next").value };
    progression.saving = true;
    const teacherEmail = hubAuthState.profile?.email;
    pp("editor").disabled = true; pp("controls").disabled = true;
    progressionStatus("Saving student results...");
    try {
        const data = await progressionApi("records", { method: "PUT", body: JSON.stringify(record) });
        if (!hasAllowedSignedInHubAccount() || hubAuthState.profile?.email !== teacherEmail) return;
        if (!data.record || !data.record.revision) throw new Error("Save response is invalid. Reload to confirm saved results.");
        progression.records = [data.record, ...progression.records.filter((old) => old.schoolYear !== record.schoolYear || old.term !== record.term)]
            .sort((a, b) => b.schoolYear - a.schoolYear || b.term - a.term);
        progressionRender(data.record);
        const latest = progression.records[0];
        const savedStudent = progression.students.find((student) => student.email === data.record.studentEmail);
        if (savedStudent && latest) {
            savedStudent.progress = { schoolYear: latest.schoolYear, term: latest.term,
                pathways: latest.pathways.map(({ id, coverage, descriptor }) => ({ id, coverage, descriptor })) };
            progressionStudentOptions();
        }
        progressionStatus("Student results saved.");
    } catch (error) {
        if (!hasAllowedSignedInHubAccount() || hubAuthState.profile?.email !== teacherEmail) return;
        console.error("Could not save progression term results", error);
        progressionStatus(error.message, true); pp("retry").hidden = false;
    } finally {
        progression.saving = false;
        if (hasAllowedSignedInHubAccount() && hubAuthState.profile?.email === teacherEmail) { pp("controls").disabled = false; pp("editor").disabled = false; }
        else if (hasAllowedSignedInHubAccount()) void progressionInit();
    }
});
pp("retry").addEventListener("click", () => {
    if (!progressionDiscard()) return;
    progression.dirty = false;
    if (pp("student").value && progression.students.length) void progressionLoadStudent(pp("student").value);
    else void progressionInit();
});
window.addEventListener("beforeunload", (event) => { if (progression.dirty) { event.preventDefault(); event.returnValue = ""; } });
window.addEventListener("hub-auth-state-changed", () => { void progressionInit(); });
document.addEventListener("DOMContentLoaded", () => { void progressionInit(); });
