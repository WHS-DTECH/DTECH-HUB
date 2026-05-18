const accessElement = document.querySelector("#unit-plan-access");
const statusElement = document.querySelector("#unit-plan-status");
const resultsElement = document.querySelector("#unit-plan-results");
const searchElement = document.querySelector("#unit-plan-search");

const BROWSE_UNIT_AUTH_KEY = "hub_google_auth_v1";

let rows = [];
let hasAccess = false;

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function normalizeRole(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function setStatus(message, isError = false) {
    if (!statusElement) return;
    const text = String(message || "");
    statusElement.textContent = text;
    statusElement.classList.remove("is-error", "is-success");
    statusElement.classList.add(isError ? "is-error" : "is-success");
    statusElement.hidden = !text;
}

function setAccess(message, isError = false) {
    if (!accessElement) return;
    accessElement.textContent = String(message || "");
    accessElement.classList.remove("is-missing", "is-error", "is-success");
    if (isError) {
        accessElement.classList.add("is-error");
    } else {
        accessElement.classList.add("is-success");
    }
}

function readSignedInEmail() {
    const raw = localStorage.getItem(BROWSE_UNIT_AUTH_KEY) || sessionStorage.getItem(BROWSE_UNIT_AUTH_KEY);
    if (!raw) return "";

    try {
        const parsed = JSON.parse(raw);
        return normalizeEmail(parsed?.profile?.email || "");
    } catch (_error) {
        return "";
    }
}

function formatDateTime(value) {
    const parsed = new Date(String(value || ""));
    if (Number.isNaN(parsed.getTime())) {
        return "-";
    }
    return parsed.toLocaleString("en-NZ", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function getSearchTerm() {
    return String(searchElement?.value || "").trim().toLowerCase();
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function renderLineBlock(value, placeholder = "-") {
    if (Array.isArray(value)) {
        const lines = value.map((item) => String(item || "").trim()).filter(Boolean);
        return escapeHtml(lines.length ? lines.join("\n") : placeholder);
    }

    const text = String(value || "").trim();
    return escapeHtml(text || placeholder);
}

function renderLessons(lessons) {
    if (!Array.isArray(lessons) || !lessons.length) {
        return "<p class='help-text'>No lessons saved for this unit plan yet.</p>";
    }

    return lessons
        .map((lesson, index) => {
            const publishText = lesson.publish_activity || lesson.publishActivity ? "Yes" : "No";
            const calendarText = lesson.add_to_calendar || lesson.addToCalendar ? "Yes" : "No";
            return `
                <article class="lesson-row" style="margin-top: 8px;">
                    <div class="lesson-row-header">
                        <div>
                            <p class="help-text" style="margin:0; text-transform:uppercase; font-weight:700;">Lesson ${index + 1}</p>
                            <h3 style="margin:2px 0 0;">${escapeHtml(lesson.lessonTitle || lesson.title || "Lesson")}</h3>
                        </div>
                    </div>
                    <div class="lesson-row-grid">
                        <div class="field"><label>Week / Session</label><input type="text" value="${escapeHtml(lesson.lessonWeek || lesson.week_label || lesson.week || "-")}" disabled></div>
                        <div class="field"><label>Duration Minutes</label><input type="text" value="${escapeHtml(lesson.lessonDurationMinutes || lesson.duration_minutes || "-")}" disabled></div>
                        <div class="field"><label>Calendar Date</label><input type="text" value="${escapeHtml(lesson.lessonDate || lesson.calendar_date || "-")}" disabled></div>
                        <div class="field"><label>Card Colour</label><input type="text" value="${escapeHtml(lesson.lessonCardColor || lesson.card_color || "Rose")}" disabled></div>
                        <div class="field field-wide"><label>Activity Name</label><input type="text" value="${escapeHtml(lesson.activityName || lesson.activity_name || "-")}" disabled></div>
                        <div class="field field-wide"><label>Lesson Focus</label><textarea rows="3" disabled>${escapeHtml(lesson.lessonFocus || lesson.focus || "-")}</textarea></div>
                        <div class="field field-wide"><label>Lesson Notes</label><textarea rows="3" disabled>${escapeHtml(lesson.lessonNotes || lesson.notes || "-")}</textarea></div>
                        <div class="field"><label>Publish to Activity Library</label><input type="text" value="${publishText}" disabled></div>
                        <div class="field"><label>Add to Calendar</label><input type="text" value="${calendarText}" disabled></div>
                    </div>
                </article>
            `;
        })
        .join("");
}

function filterRows(sourceRows) {
    const term = getSearchTerm();
    if (!term) return sourceRows;

    return sourceRows.filter((row) => {
        const lessonBlob = Array.isArray(row.lessons)
            ? row.lessons
                .map((lesson) => [
                    lesson.lessonTitle,
                    lesson.lessonWeek,
                    lesson.lessonDate,
                    lesson.lessonType,
                    lesson.activityName,
                    lesson.lessonFocus,
                    lesson.lessonNotes
                ].map((item) => String(item || "").toLowerCase()).join(" | "))
                .join(" || ")
            : "";
        const blob = [
            row.title,
            row.topic,
            row.strand,
            row.year_level,
            row.subject_stream,
            row.term,
            row.overview,
            row.unit_aims,
            row.unit_values,
            row.contexts,
            row.curriculum_links,
            row.assessment_link,
            row.notes,
            lessonBlob
        ]
            .map((item) => String(item || "").toLowerCase())
            .join(" | ");
        return blob.includes(term);
    });
}

function renderRows() {
    if (!resultsElement) return;

    if (!hasAccess) {
        resultsElement.innerHTML = "";
        return;
    }

    const filtered = filterRows(rows);
    if (!filtered.length) {
        resultsElement.innerHTML = "<p class='help-text'>No unit plans match your search.</p>";
        return;
    }

    const cards = filtered
        .map((row) => {
            const lessonCount = Array.isArray(row.lessons) ? row.lessons.length : 0;
            return `
                <article class="upload-panel" style="margin-top: 1rem;">
                    <fieldset class="form-section">
                        <legend>Unit Details</legend>
                        <div class="form-grid">
                            <div class="field"><label>Unit Title</label><input type="text" value="${escapeHtml(row.title || "Untitled Unit Plan")}" disabled></div>
                            <div class="field"><label>Topic or Learning Area</label><input type="text" value="${escapeHtml(row.topic || "-")}" disabled></div>
                            <div class="field"><label>Strand</label><input type="text" value="${escapeHtml(row.strand || "-")}" disabled></div>
                            <div class="field"><label>Year Level</label><input type="text" value="${escapeHtml(row.year_level || "-")}" disabled></div>
                            <div class="field"><label>Term</label><input type="text" value="${escapeHtml(row.term || "-")}" disabled></div>
                            <div class="field"><label>Duration Weeks</label><input type="text" value="${escapeHtml(row.duration_weeks || 1)}" disabled></div>
                            <div class="field"><label>Subject Stream</label><input type="text" value="${escapeHtml(row.subject_stream || "-")}" disabled></div>
                            <div class="field"><label>Lesson Count</label><input type="text" value="${escapeHtml(lessonCount)}" disabled></div>
                            <div class="field field-wide"><label>Unit Overview</label><textarea rows="3" disabled>${renderLineBlock(row.overview)}</textarea></div>
                            <div class="field field-wide"><label>Aims</label><textarea rows="4" disabled>${renderLineBlock(row.unit_aims)}</textarea></div>
                            <div class="field field-wide"><label>School Values</label><textarea rows="4" disabled>${renderLineBlock(row.unit_values)}</textarea></div>
                            <div class="field field-wide"><label>Contexts of Learning</label><textarea rows="4" disabled>${renderLineBlock(row.contexts)}</textarea></div>
                            <div class="field field-wide"><label>Curriculum Links</label><textarea rows="4" disabled>${renderLineBlock(row.curriculum_links)}</textarea></div>
                            <div class="field field-wide"><label>Assessment / End Point</label><textarea rows="3" disabled>${renderLineBlock(row.assessment_link)}</textarea></div>
                            <div class="field field-wide"><label>Planning Notes</label><textarea rows="3" disabled>${renderLineBlock(row.notes)}</textarea></div>
                            <div class="field field-wide"><label>Last Updated</label><input type="text" value="${escapeHtml(formatDateTime(row.updated_at || row.created_at))}" disabled></div>
                        </div>
                    </fieldset>
                    <fieldset class="form-section" style="margin-top: 10px;">
                        <legend>Lesson Planner</legend>
                        ${renderLessons(row.lessons)}
                    </fieldset>
                </article>
            `;
        })
        .join("");

    resultsElement.innerHTML = cards;
}

async function loadUnitPlans() {
    if (!hasAccess) return;

    try {
        setStatus("Loading unit plans...");
        const response = await fetch("/api/unit-plans");
        if (!response.ok) {
            throw new Error(`Could not load unit plans (HTTP ${response.status})`);
        }

        const data = await response.json();
        rows = Array.isArray(data) ? data : [];
        rows.sort((left, right) => String(right.updated_at || right.created_at || "").localeCompare(String(left.updated_at || left.created_at || "")));
        renderRows();
        setStatus(`Loaded ${rows.length} unit plan${rows.length === 1 ? "" : "s"}.`);
    } catch (error) {
        setStatus(error.message || "Could not load unit plans.", true);
    }
}

async function resolveAccess() {
    const email = readSignedInEmail();
    if (!email) {
        hasAccess = false;
        setAccess("Sign in with your school account to browse unit plans.", true);
        setStatus("", false);
        renderRows();
        return;
    }

    try {
        const response = await fetch(`/api/auth/user-access?email=${encodeURIComponent(email)}`);
        if (!response.ok) {
            throw new Error("Could not resolve your access.");
        }

        const data = await response.json();
        const role = normalizeRole(data.additional_role);
        const roleAllowed = role === "teacher" || role === "lead teacher";
        hasAccess = Boolean(data.can_admin) || roleAllowed;

        if (!hasAccess) {
            setAccess("Your account can sign in, but Browse Unit Plans is limited to Teacher, Lead Teacher, and Admin.", true);
            setStatus("", false);
            renderRows();
            return;
        }

        setAccess(`Signed in as ${email}`);
    } catch (error) {
        hasAccess = false;
        setAccess(error.message || "Could not resolve access.", true);
        setStatus("", false);
        renderRows();
    }
}

if (searchElement) {
    searchElement.addEventListener("input", () => {
        renderRows();
    });
}

async function init() {
    await resolveAccess();
    await loadUnitPlans();
}

init();
