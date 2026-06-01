// upload-course-outline.js — handles the Upload Course Outline form.

const coForm = document.querySelector("#upload-course-outline-form");
const coUploadStatus = document.querySelector("#co-upload-status");
const coCancelButton = document.querySelector("#co-cancel");
const coClearDraftButton = document.querySelector("#clear-course-outline-draft");
const coAuthStatus = document.querySelector("#course-outline-auth-status");
const coStandardsList = document.querySelector("#co-standards-list");
const coStandardsEmpty = document.querySelector("#co-standards-empty");
const coStandardPicker = document.querySelector("#co-standard-picker");
const coAddStandardBtn = document.querySelector("#co-add-standard-btn");
const coAddAchieved = document.querySelector("#co-add-achieved");
const coAddMerit = document.querySelector("#co-add-merit");
const coAddExcellence = document.querySelector("#co-add-excellence");
const coAutofillNote = document.querySelector("#co-autofill-note");

const COURSE_OUTLINE_DRAFT_KEY = "dtechHub:uploadCourseOutlineDraft:v1";
const CO_AUTH_KEY = "hub_google_auth_v1";

// In-memory list of standard entries for this outline.
let coStandardEntries = []; // [{standardLabel, achieved, merit, excellence}]

// ─── Auth helpers ────────────────────────────────────────────────────────────

function coGetAuthRaw() {
    try { return localStorage.getItem(CO_AUTH_KEY) || sessionStorage.getItem(CO_AUTH_KEY); } catch (_) { return null; }
}

function coGetUserEmail() {
    const raw = coGetAuthRaw();
    if (!raw) return "";
    try {
        const data = JSON.parse(raw);
        return String(data?.profile?.email || "").trim().toLowerCase();
    } catch (_) { return ""; }
}

function coWithEmailHeader(headers) {
    const email = coGetUserEmail();
    return email ? { ...headers, "x-user-email": email } : headers;
}

function coIsAuthenticated() {
    const raw = coGetAuthRaw();
    if (!raw) return false;
    try {
        const data = JSON.parse(raw);
        return Boolean(data?.accessToken) && Number(data?.expiresAt) > Date.now();
    } catch (_) { return false; }
}

// ─── Status helper ───────────────────────────────────────────────────────────

function coSetStatus(message, isError = false) {
    if (!coUploadStatus) return;
    if (!message) {
        coUploadStatus.hidden = true;
        coUploadStatus.textContent = "";
        coUploadStatus.classList.remove("is-success", "is-error");
        return;
    }
    coUploadStatus.textContent = message;
    coUploadStatus.hidden = false;
    coUploadStatus.classList.remove("is-success", "is-error");
    coUploadStatus.classList.add(isError ? "is-error" : "is-success");
}

// ─── Draft persistence ───────────────────────────────────────────────────────

function coSaveDraft() {
    if (!coForm) return;
    const draft = {};
    const fd = new FormData(coForm);
    fd.forEach((v, k) => { draft[k] = String(v || ""); });
    draft.__standards = coStandardEntries;
    try { localStorage.setItem(COURSE_OUTLINE_DRAFT_KEY, JSON.stringify(draft)); } catch (_) {}
}

function coRestoreDraft() {
    if (!coForm) return;
    let draft = null;
    try { draft = JSON.parse(localStorage.getItem(COURSE_OUTLINE_DRAFT_KEY) || "null"); } catch (_) {}
    if (!draft || typeof draft !== "object") return;

    Object.keys(draft).forEach((key) => {
        if (key === "__standards") return;
        const field = coForm.elements.namedItem(key);
        if (!field || field instanceof RadioNodeList) return;
        if (field.type !== "hidden") field.value = String(draft[key] || "");
    });

    if (Array.isArray(draft.__standards)) {
        coStandardEntries = draft.__standards.filter((s) => s && s.standardLabel);
        coRenderStandardsList();
    }
}

function coClearDraft() {
    try { localStorage.removeItem(COURSE_OUTLINE_DRAFT_KEY); } catch (_) {}
    if (coForm) coForm.reset();
    coStandardEntries = [];
    coRenderStandardsList();
    coSetStatus("");
}

// ─── Render standards list ───────────────────────────────────────────────────

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function coRenderStandardsList() {
    if (!coStandardsList) return;

    if (!coStandardEntries.length) {
        coStandardsList.innerHTML = `<p class="course-outline-empty-note" id="co-standards-empty">No standards added yet. Use the area below to add standards.</p>`;
        return;
    }

    coStandardsList.innerHTML = coStandardEntries.map((entry, index) => `
        <div class="course-outline-standard-entry" data-entry-index="${index}">
            <div class="course-outline-standard-entry-header">
                <span class="course-outline-standard-entry-label">${escapeHtml(entry.standardLabel)}</span>
                <button type="button" class="course-outline-standard-remove" data-remove-index="${index}">Remove</button>
            </div>
            <div class="course-outline-ame-grid">
                <div>
                    <p class="course-outline-ame-label achieved">Achieved</p>
                    <p class="course-outline-ame-text">${escapeHtml(entry.achieved) || '<em style="color:#aaa">Not specified</em>'}</p>
                </div>
                <div>
                    <p class="course-outline-ame-label merit">Merit</p>
                    <p class="course-outline-ame-text">${escapeHtml(entry.merit) || '<em style="color:#aaa">Not specified</em>'}</p>
                </div>
                <div>
                    <p class="course-outline-ame-label excellence">Excellence</p>
                    <p class="course-outline-ame-text">${escapeHtml(entry.excellence) || '<em style="color:#aaa">Not specified</em>'}</p>
                </div>
            </div>
        </div>
    `).join("");

    // Bind remove buttons.
    coStandardsList.querySelectorAll("button[data-remove-index]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const idx = Number.parseInt(btn.getAttribute("data-remove-index"), 10);
            if (Number.isInteger(idx) && idx >= 0 && idx < coStandardEntries.length) {
                coStandardEntries.splice(idx, 1);
                coRenderStandardsList();
                coSaveDraft();
            }
        });
    });
}

// ─── Standards picker ────────────────────────────────────────────────────────

function coFormatStandardOption(row) {
    const num = String(row?.standard_number || "").trim();
    const name = String(row?.standard_name || "").trim();
    const level = Number.parseInt(row?.level, 10);
    const credits = Number.isFinite(Number(row?.credits)) ? Number(row.credits) : null;
    return [
        num || "Unknown",
        name || "Unnamed standard",
        Number.isInteger(level) ? `L${level}` : "",
        Number.isFinite(credits) ? `${credits} credits` : ""
    ].filter(Boolean).join(" | ");
}

async function coLoadStandardsOptions() {
    if (!coStandardPicker) return;
    coStandardPicker.innerHTML = `<option value="">Loading standards...</option>`;
    coStandardPicker.disabled = true;
    if (coAddStandardBtn) coAddStandardBtn.disabled = true;

    try {
        const response = await fetch("/api/assessment-standards/options?stream=both&level=all", {
            headers: coWithEmailHeader({})
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !Array.isArray(payload?.options) || !payload.options.length) {
            coStandardPicker.innerHTML = `<option value="">No standards available</option>`;
            return;
        }
        coStandardPicker.innerHTML = [
            `<option value="">Select a standard...</option>`,
            ...payload.options.map((row) => {
                const text = coFormatStandardOption(row);
                return `<option value="${escapeHtml(text)}">${escapeHtml(text)}</option>`;
            })
        ].join("");
    } catch (_) {
        coStandardPicker.innerHTML = `<option value="">Could not load standards</option>`;
    } finally {
        coStandardPicker.disabled = false;
        if (coAddStandardBtn) coAddStandardBtn.disabled = false;
    }
}

// ─── Auto-populate A/M/E from Assessment Standard Card ──────────────────────

function coExtractStandardCode(label) {
    const match = String(label || "").match(/\b(\d{5})\b/);
    return match ? match[1] : "";
}

async function coTryAutofill(standardLabel) {
    if (!coAutofillNote) return;
    coAutofillNote.hidden = true;

    const code = coExtractStandardCode(standardLabel);
    if (!code) return;

    const params = new URLSearchParams();
    params.set("standard", code);
    const year = new Date().getFullYear();
    params.set("year", String(year));

    try {
        const response = await fetch(`/api/assessment-standard-cards/match?${params.toString()}`, {
            headers: coWithEmailHeader({})
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.matched || !payload?.card) return;

        const card = payload.card;
        const pickLines = (text, checklist) => {
            const list = Array.isArray(checklist)
                ? checklist.map((l) => String(l || "").trim()).filter(Boolean)
                : [];
            if (list.length) return list.join("\n");
            return String(text || "").trim();
        };

        if (coAddAchieved) coAddAchieved.value = pickLines(card.achieved_text, card.achieved_checklist);
        if (coAddMerit) coAddMerit.value = pickLines(card.merit_text, card.merit_checklist);
        if (coAddExcellence) coAddExcellence.value = pickLines(card.excellence_text, card.excellence_checklist);

        const templateLabel = String(card?.course_name || "").trim();
        coAutofillNote.textContent = `Criteria pre-filled from Assessment Standard Card${templateLabel ? ` (${templateLabel})` : ""}.`;
        coAutofillNote.hidden = false;
    } catch (_) {
        // Keep the flow resilient.
    }
}

// ─── Add standard to the outline ────────────────────────────────────────────

function coClearAddArea() {
    if (coStandardPicker) coStandardPicker.value = "";
    if (coAddAchieved) coAddAchieved.value = "";
    if (coAddMerit) coAddMerit.value = "";
    if (coAddExcellence) coAddExcellence.value = "";
    if (coAutofillNote) coAutofillNote.hidden = true;
}

function coAddStandard() {
    const standardLabel = String(coStandardPicker?.value || "").trim();
    if (!standardLabel) {
        coSetStatus("Select a standard from the list first.", true);
        return;
    }

    // Prevent duplicates.
    if (coStandardEntries.some((e) => e.standardLabel === standardLabel)) {
        coSetStatus("That standard is already in the outline.", true);
        return;
    }

    coStandardEntries.push({
        standardLabel,
        achieved: String(coAddAchieved?.value || "").trim(),
        merit: String(coAddMerit?.value || "").trim(),
        excellence: String(coAddExcellence?.value || "").trim()
    });

    coRenderStandardsList();
    coClearAddArea();
    coSaveDraft();
    coSetStatus(`Standard added. ${coStandardEntries.length} standard(s) in outline.`);
}

// ─── Form submission ─────────────────────────────────────────────────────────

async function coHandleSubmit(event) {
    event.preventDefault();

    if (!coIsAuthenticated()) {
        coSetStatus("You must be signed in to save a Course Outline.", true);
        return;
    }

    const fd = new FormData(coForm);
    const courseName = String(fd.get("courseName") || "").trim();
    const yearLevel = String(fd.get("yearLevel") || "").trim();
    const yearVersion = Number.parseInt(fd.get("yearVersion"), 10);
    const subjectStream = String(fd.get("subjectStream") || "").trim();
    const summary = String(fd.get("summary") || "").trim();

    if (!courseName) { coSetStatus("Course Name is required.", true); return; }
    if (!yearLevel) { coSetStatus("Year Level is required.", true); return; }
    if (!Number.isInteger(yearVersion)) { coSetStatus("Year (Version) must be a valid year number.", true); return; }

    coSetStatus("Saving...");
    if (coForm.querySelector("[type='submit']")) coForm.querySelector("[type='submit']").disabled = true;

    try {
        const response = await fetch("/api/course-outlines", {
            method: "POST",
            headers: coWithEmailHeader({ "Content-Type": "application/json" }),
            body: JSON.stringify({
                courseName,
                yearLevel,
                yearVersion,
                subjectStream,
                summary,
                cardColor: "Teal",
                standards: coStandardEntries
            })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            coSetStatus(payload?.error || "Could not save Course Outline.", true);
            return;
        }
        coSetStatus(`Course Outline saved successfully (${coStandardEntries.length} standard(s)).`);
        coClearDraft();
    } catch (error) {
        coSetStatus("Network error. Please try again.", true);
    } finally {
        if (coForm.querySelector("[type='submit']")) coForm.querySelector("[type='submit']").disabled = false;
    }
}

// ─── Auth guard ──────────────────────────────────────────────────────────────

function coCheckAuth() {
    if (!coAuthStatus) return;
    if (!coIsAuthenticated()) {
        coAuthStatus.textContent = "You must be signed in with a @westlandhigh.school.nz account to use this page.";
        coAuthStatus.classList.add("is-error");
        if (coForm) coForm.querySelectorAll("input, select, textarea, button[type='submit']").forEach((el) => { el.disabled = true; });
    } else {
        coAuthStatus.textContent = "";
    }
}

// ─── Initialise ──────────────────────────────────────────────────────────────

function coInit() {
    coCheckAuth();
    coRestoreDraft();
    void coLoadStandardsOptions();

    // Auto-populate when standard is selected.
    coStandardPicker?.addEventListener("change", () => {
        const selected = String(coStandardPicker.value || "").trim();
        if (selected) {
            void coTryAutofill(selected);
        } else {
            coClearAddArea();
        }
    });

    coAddStandardBtn?.addEventListener("click", coAddStandard);

    coForm?.addEventListener("submit", coHandleSubmit);
    coForm?.addEventListener("input", coSaveDraft);
    coForm?.addEventListener("change", coSaveDraft);

    coClearDraftButton?.addEventListener("click", () => {
        if (confirm("Clear all draft data and start fresh?")) {
            coClearDraft();
        }
    });

    coCancelButton?.addEventListener("click", () => {
        window.location.href = "upload-menu.html";
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", coInit);
} else {
    coInit();
}
