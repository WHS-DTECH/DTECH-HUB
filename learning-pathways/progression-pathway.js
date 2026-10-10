"use strict";

const progressionPathways = [
    ["digital-systems", "Digital Systems", "digital-systems"],
    ["data", "Data and Information", "data-and-information"],
    ["digital-citizenship", "Digital Citizenship", "digital-citizenship"],
    ["programming-and-algorithms", "Programming & Algorithms", "programming-and-algorithms"],
    ["systems-and-control", "Systems and Control", "systems-and-control"]
];
const progressionDescriptors = ["emerging", "developing", "consolidating", "proficient", "exceeding"];
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
    return !progression.dirty || window.confirm("Discard unsaved rotation changes?");
}
function progressionStudentOptions() {
    const selected = pp("student").value;
    const search = pp("search").value.trim().toLowerCase();
    pp("student").replaceChildren(new Option("Select a student", ""));
    for (const student of progression.students) {
        if (student.email === selected || `${student.name} ${student.email} ${student.formClass}`.toLowerCase().includes(search)) {
            pp("student").append(new Option(`${student.name} - Year ${student.yearLevel} - ${student.formClass}${student.archived ? " (saved history)" : ""}`, student.email));
        }
    }
    pp("student").value = selected;
}
function progressionNewRecord(student) {
    const month = new Date().getMonth();
    return { studentEmail: student.email, schoolYear: new Date().getFullYear(), term: Math.min(4, Math.floor(month / 3) + 1),
        yearLevel: student.yearLevel, formClass: student.formClass, revision: 0, strengths: "", nextLearning: "",
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
    pp("year").disabled = record.revision > 0;
    pp("term").disabled = record.revision > 0;
    pp("saved").textContent = record.updatedAt ? `Saved ${new Date(record.updatedAt).toLocaleString()} by ${record.updatedBy}` : "New rotation - not saved yet.";
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
function progressionHistory() {
    const student = progression.students.find((item) => item.email === pp("student").value);
    pp("history").replaceChildren();
    if (!student?.archived) pp("history").append(new Option("New rotation", ""));
    progression.records.forEach((record, index) => pp("history").append(new Option(`${record.schoolYear} Term ${record.term} - Year ${record.yearLevel} / ${record.formClass}`, String(index))));
}
async function progressionLoadStudent(email) {
    const request = ++progression.loading;
    progression.record = null;
    progression.dirty = false;
    pp("editor").hidden = true;
    pp("history").replaceChildren(new Option("New rotation", ""));
    if (!email) return;
    progressionStatus("Loading saved rotations...");
    pp("retry").hidden = true;
    try {
        const data = await progressionApi(`records?studentEmail=${encodeURIComponent(email)}`);
        if (request !== progression.loading) return;
        if (!Array.isArray(data.records)) throw new Error("Saved rotation response is invalid.");
        progression.records = data.records;
        progressionHistory();
        if (data.records.length) {
            pp("history").value = "0";
            progressionRender(data.records[0]);
        } else progressionRender(progressionNewRecord(progression.students.find((student) => student.email === email)));
        progressionStatus("Select a pathway to record coverage and evidence. Changes are not saved until you press Save.");
    } catch (error) {
        if (request !== progression.loading) return;
        console.error("Could not load progression rotations", error);
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
        pp("history").replaceChildren(new Option("New rotation", ""));
    }
    pp("controls").disabled = true;
    pp("editor").disabled = true;
    if (!hasAllowedSignedInHubAccount()) {
        progression.record = null; progression.dirty = false;
        pp("retry").hidden = true;
        pp("editor").hidden = true; pp("student").replaceChildren(new Option("Select a student", ""));
        progressionStatus("Sign in with a Teacher/Admin account to access student results.");
        return;
    }
    if (progression.saving) return;
    if (!hubAccessState.resolved) { progressionStatus("Checking Teacher View access..."); return; }
    if (!hubAccessState.canTeacherView && !hubAccessState.canAdmin) {
        pp("editor").hidden = true;
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
pp("search").addEventListener("input", progressionStudentOptions);
pp("student").addEventListener("change", () => {
    if (!progressionDiscard()) { pp("student").value = progression.record?.studentEmail || ""; return; }
    void progressionLoadStudent(pp("student").value);
});
pp("history").addEventListener("change", () => {
    if (!progressionDiscard()) {
        pp("history").value = String(progression.records.findIndex((record) => record.schoolYear === progression.record.schoolYear && record.term === progression.record.term));
        return;
    }
    const selected = pp("history").value;
    progressionRender(selected === "" ? progressionNewRecord(progression.students.find((student) => student.email === pp("student").value)) : progression.records[Number(selected)]);
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
        yearLevel: Number(pp("level").value), formClass: pp("class").value, strengths: pp("strengths").value, nextLearning: pp("next").value };
    progression.saving = true;
    const teacherEmail = hubAuthState.profile?.email;
    pp("editor").disabled = true; pp("controls").disabled = true;
    progressionStatus("Saving rotation results...");
    try {
        const data = await progressionApi("records", { method: "PUT", body: JSON.stringify(record) });
        if (!hasAllowedSignedInHubAccount() || hubAuthState.profile?.email !== teacherEmail) return;
        if (!data.record || !data.record.revision) throw new Error("Save response is invalid. Reload to confirm saved results.");
        progression.records = [data.record, ...progression.records.filter((old) => old.schoolYear !== record.schoolYear || old.term !== record.term)]
            .sort((a, b) => b.schoolYear - a.schoolYear || b.term - a.term);
        progressionHistory();
        pp("history").value = String(progression.records.findIndex((old) => old.schoolYear === record.schoolYear && old.term === record.term));
        progressionRender(data.record);
        progressionStatus("Rotation results saved.");
    } catch (error) {
        if (!hasAllowedSignedInHubAccount() || hubAuthState.profile?.email !== teacherEmail) return;
        console.error("Could not save progression rotation", error);
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
