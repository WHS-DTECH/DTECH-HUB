const uploadForm = document.querySelector("#upload-unit-form");
const uploadInput = document.querySelector("#unit-plan-file");
const uploadStatus = document.querySelector("#upload-status");
const authStatusElement = document.querySelector("#unit-auth-status");
const uploadButton = document.querySelector("#upload-unit-button");
const clearButton = document.querySelector("#clear-unit-file");
const importTemplateButton = document.querySelector("#import-template-button");
const previewFileButton = document.querySelector("#preview-file-button");
const previewTemplateButton = document.querySelector("#preview-template-button");
const previewPanel = document.querySelector("#unit-preview-panel");
const previewForm = document.querySelector("#unit-preview-form");
const previewSource = document.querySelector("#preview-source");
const savePreviewButton = document.querySelector("#save-preview-button");

const manualForm = document.querySelector("#manual-unit-form");
const saveManualUnitButton = document.querySelector("#save-manual-unit-button");
const cancelManualUploadButton = document.querySelector("#cancel-manual-upload");
const clearManualFormButton = document.querySelector("#clear-manual-form");
const lessonList = document.querySelector("#lesson-list");
const addLessonButton = document.querySelector("#add-lesson");

const previewFields = {
    title: document.querySelector("#preview-title"),
    topic: document.querySelector("#preview-topic"),
    yearLevel: document.querySelector("#preview-year-level"),
    subjectStream: document.querySelector("#preview-subject-stream"),
    durationWeeks: document.querySelector("#preview-duration-weeks"),
    term: document.querySelector("#preview-term"),
    overview: document.querySelector("#preview-overview"),
    unitAims: document.querySelector("#preview-aims"),
    unitValues: document.querySelector("#preview-values"),
    contexts: document.querySelector("#preview-contexts"),
    curriculumLinks: document.querySelector("#preview-curriculum-links"),
    assessmentLink: document.querySelector("#preview-assessment-link"),
    notes: document.querySelector("#preview-notes"),
    lessonsJson: document.querySelector("#preview-lessons-json")
};

const manualFields = {
    title: document.querySelector("#manual-title"),
    topic: document.querySelector("#manual-topic"),
    strand: document.querySelector("#manual-strand"),
    yearLevel: document.querySelector("#manual-year-level"),
    subjectStream: document.querySelector("#manual-subject-stream"),
    durationWeeks: document.querySelector("#manual-duration-weeks"),
    term: document.querySelector("#manual-term"),
    overview: document.querySelector("#manual-overview"),
    unitAims: document.querySelector("#manual-aims"),
    unitValues: document.querySelector("#manual-values"),
    contexts: document.querySelector("#manual-contexts"),
    curriculumLinks: document.querySelector("#manual-curriculum-links"),
    assessmentLink: document.querySelector("#manual-assessment-link"),
    notes: document.querySelector("#manual-notes")
};

const UPLOAD_HUB_AUTH_STORAGE_KEY = "hub_google_auth_v1";
let hasReadyFilePreview = false;

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function getHubStoredAuthRaw() {
    try {
        return localStorage.getItem(UPLOAD_HUB_AUTH_STORAGE_KEY) || sessionStorage.getItem(UPLOAD_HUB_AUTH_STORAGE_KEY) || "";
    } catch (_error) {
        return "";
    }
}

function getSignedInEmail() {
    const raw = getHubStoredAuthRaw();
    if (!raw) {
        return "";
    }

    try {
        const data = JSON.parse(raw);
        return normalizeEmail(data?.profile?.email || "");
    } catch (_error) {
        return "";
    }
}

function withUserEmailHeader(headers = {}) {
    const email = getSignedInEmail();
    if (!email) {
        return headers;
    }

    return {
        ...headers,
        "x-user-email": email
    };
}

function setStatus(message, isError = false) {
    if (!uploadStatus) {
        return;
    }

    if (!message) {
        uploadStatus.hidden = true;
        uploadStatus.textContent = "";
        uploadStatus.classList.remove("is-success", "is-error");
        return;
    }

    uploadStatus.hidden = false;
    uploadStatus.textContent = message;
    uploadStatus.classList.remove("is-success", "is-error");
    uploadStatus.classList.add(isError ? "is-error" : "is-success");
}

function setActionButtonsDisabled(disabled) {
    const buttons = [
        uploadButton,
        importTemplateButton,
        previewFileButton,
        previewTemplateButton,
        savePreviewButton,
        saveManualUnitButton,
        addLessonButton,
        clearManualFormButton,
        cancelManualUploadButton
    ];

    buttons.forEach((button) => {
        if (button) {
            button.disabled = Boolean(disabled);
        }
    });

    if (!disabled && uploadButton) {
        uploadButton.disabled = !hasReadyFilePreview;
    }
}

function resetFilePreviewState() {
    hasReadyFilePreview = false;
    if (previewPanel) {
        previewPanel.hidden = true;
    }
    if (uploadButton) {
        uploadButton.disabled = true;
    }
}

function joinLines(value) {
    if (!Array.isArray(value)) {
        return "";
    }

    return value
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .join("\n");
}

function normalizeLines(value) {
    return String(value || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
}

function parseLessonsJson(value) {
    const source = String(value || "").trim();
    if (!source) {
        return [];
    }

    const parsed = JSON.parse(source);
    if (!Array.isArray(parsed)) {
        throw new Error("Lessons JSON must be an array.");
    }

    return parsed;
}

function createLessonRow(lesson = {}) {
    if (!lessonList) {
        return null;
    }

    const row = document.createElement("div");
    row.className = "lesson-row";
    row.dataset.lessonRow = "true";

    row.innerHTML = `
        <div class="lesson-row-header">
            <div>
                <p class="section-kicker">Lesson <span data-lesson-number></span></p>
                <h3>Lesson details</h3>
            </div>
            <button type="button" class="button button-secondary lesson-remove">Remove</button>
        </div>
        <div class="lesson-row-grid">
            <div class="field">
                <label>Lesson Title</label>
                <input name="lessonTitle" type="text" placeholder="Lesson title" required>
            </div>
            <div class="field">
                <label>Week / Session</label>
                <input name="lessonWeek" type="text" placeholder="Week 1, Session 2">
            </div>
            <div class="field">
                <label>Calendar Date</label>
                <input name="lessonDate" type="date">
            </div>
            <div class="field">
                <label>Duration Minutes</label>
                <input name="lessonDurationMinutes" type="number" min="1" step="1" value="60">
            </div>
            <div class="field">
                <label>Activity Type</label>
                <input name="lessonType" type="text" placeholder="Programming, Digital Media, ...">
            </div>
            <div class="field">
                <label>Card Colour</label>
                <select name="lessonCardColor">
                    <option>Rose</option>
                    <option>Violet</option>
                    <option>Azure</option>
                    <option>Amber</option>
                    <option>Teal</option>
                    <option>Slate</option>
                </select>
            </div>
            <div class="field field-wide">
                <label>Activity Name</label>
                <input name="activityName" type="text" placeholder="Card title for the Activity Library">
            </div>
            <div class="field field-wide">
                <label>Lesson Focus</label>
                <textarea name="lessonFocus" placeholder="What are students learning or doing?"></textarea>
            </div>
            <div class="field field-wide">
                <label>Lesson Notes</label>
                <textarea name="lessonNotes" placeholder="Teacher notes, resources, or setup reminders"></textarea>
            </div>
            <label class="checkbox-field lesson-toggle"><input name="publishActivity" type="checkbox"> Publish to Activity Library</label>
            <label class="checkbox-field lesson-toggle"><input name="addToCalendar" type="checkbox"> Add to Calendar</label>
        </div>
    `;

    const lessonTitle = row.querySelector('[name="lessonTitle"]');
    const lessonWeek = row.querySelector('[name="lessonWeek"]');
    const lessonDate = row.querySelector('[name="lessonDate"]');
    const lessonDurationMinutes = row.querySelector('[name="lessonDurationMinutes"]');
    const lessonType = row.querySelector('[name="lessonType"]');
    const lessonCardColor = row.querySelector('[name="lessonCardColor"]');
    const activityName = row.querySelector('[name="activityName"]');
    const lessonFocus = row.querySelector('[name="lessonFocus"]');
    const lessonNotes = row.querySelector('[name="lessonNotes"]');
    const publishActivity = row.querySelector('[name="publishActivity"]');
    const addToCalendar = row.querySelector('[name="addToCalendar"]');

    lessonTitle.value = String(lesson.lessonTitle || lesson.title || "").trim();
    lessonWeek.value = String(lesson.lessonWeek || lesson.week_label || lesson.week || "").trim();
    lessonDate.value = String(lesson.lessonDate || lesson.calendar_date || "").trim();
    lessonDurationMinutes.value = String(lesson.lessonDurationMinutes || lesson.duration_minutes || 60).trim();
    lessonType.value = String(lesson.lessonType || lesson.activity_type || "").trim();
    lessonCardColor.value = String(lesson.lessonCardColor || lesson.card_color || "Rose").trim() || "Rose";
    activityName.value = String(lesson.activityName || lesson.activity_name || "").trim();
    lessonFocus.value = String(lesson.lessonFocus || lesson.focus || "").trim();
    lessonNotes.value = String(lesson.lessonNotes || lesson.notes || "").trim();
    publishActivity.checked = Boolean(lesson.publishActivity ?? lesson.publish_activity);
    addToCalendar.checked = Boolean(lesson.addToCalendar ?? lesson.add_to_calendar);

    row.querySelector(".lesson-remove").addEventListener("click", () => {
        row.remove();
        if (!lessonList.querySelector("[data-lesson-row]")) {
            lessonList.appendChild(createLessonRow());
        }
        renumberLessons();
    });

    return row;
}

function renumberLessons() {
    if (!lessonList) {
        return;
    }

    const rows = Array.from(lessonList.querySelectorAll("[data-lesson-row]"));
    rows.forEach((row, index) => {
        const number = row.querySelector("[data-lesson-number]");
        if (number) {
            number.textContent = String(index + 1);
        }
    });
}

function collectLessons() {
    if (!lessonList) {
        return [];
    }

    return Array.from(lessonList.querySelectorAll("[data-lesson-row]"))
        .map((row, index) => ({
            lesson_index: index + 1,
            lessonTitle: String(row.querySelector('[name="lessonTitle"]')?.value || "").trim(),
            lessonWeek: String(row.querySelector('[name="lessonWeek"]')?.value || "").trim(),
            lessonDate: String(row.querySelector('[name="lessonDate"]')?.value || "").trim(),
            lessonDurationMinutes: Number.parseInt(row.querySelector('[name="lessonDurationMinutes"]')?.value || "60", 10) || 60,
            lessonType: String(row.querySelector('[name="lessonType"]')?.value || "").trim(),
            lessonCardColor: String(row.querySelector('[name="lessonCardColor"]')?.value || "Rose").trim() || "Rose",
            activityName: String(row.querySelector('[name="activityName"]')?.value || "").trim(),
            lessonFocus: String(row.querySelector('[name="lessonFocus"]')?.value || "").trim(),
            lessonNotes: String(row.querySelector('[name="lessonNotes"]')?.value || "").trim(),
            publishActivity: Boolean(row.querySelector('[name="publishActivity"]')?.checked),
            addToCalendar: Boolean(row.querySelector('[name="addToCalendar"]')?.checked)
        }))
        .filter((lesson) => Boolean(lesson.lessonTitle || lesson.activityName || lesson.lessonFocus || lesson.lessonWeek || lesson.lessonDate));
}

function populateManualPlannerFromUnitPlan(unitPlan) {
    if (!manualForm || !unitPlan) {
        return;
    }

    if (manualFields.title) manualFields.title.value = String(unitPlan.title || "");
    if (manualFields.topic) manualFields.topic.value = String(unitPlan.topic || "");
    if (manualFields.strand) manualFields.strand.value = String(unitPlan.strand || unitPlan.subject_stream || "");
    if (manualFields.yearLevel) manualFields.yearLevel.value = String(unitPlan.year_level || "");
    if (manualFields.subjectStream) manualFields.subjectStream.value = String(unitPlan.subject_stream || "");
    if (manualFields.durationWeeks) manualFields.durationWeeks.value = Number.parseInt(unitPlan.duration_weeks, 10) || 1;
    if (manualFields.term) manualFields.term.value = String(unitPlan.term || "");
    if (manualFields.overview) manualFields.overview.value = String(unitPlan.overview || "");
    if (manualFields.unitAims) manualFields.unitAims.value = joinLines(unitPlan.unit_aims);
    if (manualFields.unitValues) manualFields.unitValues.value = joinLines(unitPlan.unit_values);
    if (manualFields.contexts) manualFields.contexts.value = joinLines(unitPlan.contexts);
    if (manualFields.curriculumLinks) manualFields.curriculumLinks.value = joinLines(unitPlan.curriculum_links);
    if (manualFields.assessmentLink) manualFields.assessmentLink.value = String(unitPlan.assessment_link || "");
    if (manualFields.notes) manualFields.notes.value = String(unitPlan.notes || "");

    if (lessonList) {
        lessonList.innerHTML = "";
        const lessons = Array.isArray(unitPlan.lessons) ? unitPlan.lessons : [];
        if (!lessons.length) {
            lessonList.appendChild(createLessonRow());
        } else {
            lessons.forEach((lesson) => {
                lessonList.appendChild(createLessonRow(lesson));
            });
        }
        renumberLessons();
    }
}

function resetManualLessons() {
    if (!lessonList) {
        return;
    }

    lessonList.innerHTML = "";
    lessonList.appendChild(createLessonRow());
    renumberLessons();
}

function showPreviewPanel(unitPlan, sourceLabel) {
    if (!previewPanel) {
        return;
    }

    const lessonCount = Array.isArray(unitPlan?.lessons) ? unitPlan.lessons.length : 0;
    if (previewSource) {
        previewSource.textContent = `Preview source: ${sourceLabel || "DOCX"} (${lessonCount} lesson${lessonCount === 1 ? "" : "s"} parsed)`;
    }

    if (previewFields.title) previewFields.title.value = String(unitPlan?.title || "");
    if (previewFields.topic) previewFields.topic.value = String(unitPlan?.topic || "");
    if (previewFields.yearLevel) previewFields.yearLevel.value = String(unitPlan?.year_level || "");
    if (previewFields.subjectStream) previewFields.subjectStream.value = String(unitPlan?.subject_stream || "");
    if (previewFields.durationWeeks) previewFields.durationWeeks.value = Number.parseInt(unitPlan?.duration_weeks, 10) || 1;
    if (previewFields.term) previewFields.term.value = String(unitPlan?.term || "");
    if (previewFields.overview) previewFields.overview.value = String(unitPlan?.overview || "");
    if (previewFields.unitAims) previewFields.unitAims.value = joinLines(unitPlan?.unit_aims);
    if (previewFields.unitValues) previewFields.unitValues.value = joinLines(unitPlan?.unit_values);
    if (previewFields.contexts) previewFields.contexts.value = joinLines(unitPlan?.contexts);
    if (previewFields.curriculumLinks) previewFields.curriculumLinks.value = joinLines(unitPlan?.curriculum_links);
    if (previewFields.assessmentLink) previewFields.assessmentLink.value = String(unitPlan?.assessment_link || "");
    if (previewFields.notes) previewFields.notes.value = String(unitPlan?.notes || "");
    if (previewFields.lessonsJson) previewFields.lessonsJson.value = JSON.stringify(Array.isArray(unitPlan?.lessons) ? unitPlan.lessons : [], null, 2);

    populateManualPlannerFromUnitPlan(unitPlan);
    previewPanel.hidden = false;
}

function collectPreviewPayload() {
    return {
        title: String(previewFields.title?.value || "").trim(),
        topic: String(previewFields.topic?.value || "").trim(),
        year_level: String(previewFields.yearLevel?.value || "").trim(),
        subject_stream: String(previewFields.subjectStream?.value || "").trim().toUpperCase(),
        duration_weeks: Number.parseInt(previewFields.durationWeeks?.value || "1", 10) || 1,
        term: String(previewFields.term?.value || "").trim(),
        overview: String(previewFields.overview?.value || "").trim(),
        unit_aims: normalizeLines(previewFields.unitAims?.value || ""),
        unit_values: normalizeLines(previewFields.unitValues?.value || ""),
        contexts: normalizeLines(previewFields.contexts?.value || ""),
        curriculum_links: normalizeLines(previewFields.curriculumLinks?.value || ""),
        assessment_link: String(previewFields.assessmentLink?.value || "").trim(),
        notes: String(previewFields.notes?.value || "").trim(),
        lessons: parseLessonsJson(previewFields.lessonsJson?.value || "[]")
    };
}

function collectManualPayload() {
    return {
        title: String(manualFields.title?.value || "").trim(),
        topic: String(manualFields.topic?.value || "").trim(),
        strand: String(manualFields.strand?.value || "").trim(),
        year_level: String(manualFields.yearLevel?.value || "").trim(),
        subject_stream: String(manualFields.subjectStream?.value || "").trim().toUpperCase(),
        duration_weeks: Number.parseInt(manualFields.durationWeeks?.value || "1", 10) || 1,
        term: String(manualFields.term?.value || "").trim(),
        overview: String(manualFields.overview?.value || "").trim(),
        unit_aims: normalizeLines(manualFields.unitAims?.value || ""),
        unit_values: normalizeLines(manualFields.unitValues?.value || ""),
        contexts: normalizeLines(manualFields.contexts?.value || ""),
        curriculum_links: normalizeLines(manualFields.curriculumLinks?.value || ""),
        assessment_link: String(manualFields.assessmentLink?.value || "").trim(),
        notes: String(manualFields.notes?.value || "").trim(),
        lessons: collectLessons(),
        created_by_email: getSignedInEmail(),
        created_at: new Date().toISOString()
    };
}

function renderAuthStatus() {
    if (!authStatusElement) {
        return;
    }

    const email = getSignedInEmail();
    if (email) {
        authStatusElement.classList.remove("is-missing");
        authStatusElement.textContent = `Signed in as ${email}`;
        return;
    }

    authStatusElement.classList.add("is-missing");
    authStatusElement.textContent = "Not signed in. Sign in with your school Google account before importing a unit plan.";
}

async function previewFromFile() {
    if (!uploadInput?.files?.length) {
        setStatus("Choose a .docx file before previewing.", true);
        return;
    }

    const file = uploadInput.files[0];
    if (!file) {
        setStatus("Choose a .docx file before previewing.", true);
        return;
    }

    const payload = new FormData();
    payload.append("unitPlanFile", file);

    try {
        setActionButtonsDisabled(true);
        setStatus("Parsing DOCX for preview...");

        const response = await fetch("/api/unit-plans/preview-docx", {
            method: "POST",
            headers: withUserEmailHeader(),
            body: payload
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            hasReadyFilePreview = false;
            throw new Error(result.error || `Could not preview document (HTTP ${response.status})`);
        }

        hasReadyFilePreview = true;
        showPreviewPanel(result.unitPlan || {}, result.source || file.name);
        setStatus("Preview loaded. Review it, then click Import Unit Plan.");
    } catch (error) {
        hasReadyFilePreview = false;
        setStatus(`Preview failed: ${error.message}`, true);
    } finally {
        setActionButtonsDisabled(false);
    }
}

async function previewFromTemplate() {
    try {
        setActionButtonsDisabled(true);
        setStatus("Parsing TeacherFiles template for preview...");

        const response = await fetch("/api/unit-plans/preview-docx-template", {
            method: "POST",
            headers: withUserEmailHeader({
                "Content-Type": "application/json"
            }),
            body: JSON.stringify({})
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result.error || `Could not preview template (HTTP ${response.status})`);
        }

        showPreviewPanel(result.unitPlan || {}, result.source || "TeacherFiles template");
        setStatus("Template preview loaded. Review it, then click Import Unit Plan.");
    } catch (error) {
        setStatus(`Template preview failed: ${error.message}`, true);
    } finally {
        setActionButtonsDisabled(false);
    }
}

async function importTeacherTemplateDocx() {
    try {
        setActionButtonsDisabled(true);
        setStatus("Importing unit plan from TeacherFiles template...");

        const response = await fetch("/api/unit-plans/import-docx-template", {
            method: "POST",
            headers: withUserEmailHeader({
                "Content-Type": "application/json"
            }),
            body: JSON.stringify({})
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result.error || `Could not import template (HTTP ${response.status})`);
        }

        const lessonCount = Number(result.lessonCount || 0);
        const activityCount = Number(result.createdActivities || 0);
        const calendarCount = Number(result.createdCalendarEvents || 0);

        setStatus(`Imported ${result.unitPlan?.title || "unit plan"} from ${result.source || "TeacherFiles template"}. Saved ${lessonCount} lesson${lessonCount === 1 ? "" : "s"}, created ${activityCount} activity card${activityCount === 1 ? "" : "s"}${calendarCount ? `, and ${calendarCount} calendar event${calendarCount === 1 ? "" : "s"}` : ""}.`);
        if (uploadInput) {
            uploadInput.value = "";
        }
    } catch (error) {
        setStatus(`Template import failed: ${error.message}`, true);
    } finally {
        setActionButtonsDisabled(false);
    }
}

async function saveFromPreview(event) {
    event.preventDefault();

    let payload = null;
    try {
        payload = collectPreviewPayload();
    } catch (error) {
        setStatus(`Cannot save preview: ${error.message}`, true);
        return;
    }

    if (!payload.title || !payload.topic || !payload.year_level) {
        setStatus("Preview must include title, topic, and year level before saving.", true);
        return;
    }

    try {
        setActionButtonsDisabled(true);
        setStatus("Saving previewed unit plan...");

        const response = await fetch("/api/unit-plans", {
            method: "POST",
            headers: withUserEmailHeader({
                "Content-Type": "application/json"
            }),
            body: JSON.stringify(payload)
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result.error || `Could not save unit plan (HTTP ${response.status})`);
        }

        const lessonCount = Array.isArray(result?.lessons) ? result.lessons.length : 0;
        setStatus(`Saved ${result.title || "unit plan"} from preview with ${lessonCount} lesson${lessonCount === 1 ? "" : "s"}.`);
    } catch (error) {
        setStatus(`Save from preview failed: ${error.message}`, true);
    } finally {
        setActionButtonsDisabled(false);
    }
}

async function saveManualUnitPlan(event) {
    event.preventDefault();

    const payload = collectManualPayload();
    if (!payload.title || !payload.topic || !payload.year_level) {
        setStatus("Manual planner requires title, topic, and year level.", true);
        return;
    }

    try {
        setActionButtonsDisabled(true);
        setStatus("Saving manual unit plan...");

        const response = await fetch("/api/unit-plans", {
            method: "POST",
            headers: withUserEmailHeader({
                "Content-Type": "application/json"
            }),
            body: JSON.stringify(payload)
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result.error || `Could not save manual unit plan (HTTP ${response.status})`);
        }

        const lessonCount = Array.isArray(result?.lessons) ? result.lessons.length : payload.lessons.length;
        setStatus(`Saved manual unit plan ${result.title || payload.title} with ${lessonCount} lesson${lessonCount === 1 ? "" : "s"}.`);

        manualForm?.reset();
        resetManualLessons();
    } catch (error) {
        setStatus(`Manual save failed: ${error.message}`, true);
    } finally {
        setActionButtonsDisabled(false);
    }
}

if (clearButton) {
    clearButton.addEventListener("click", () => {
        if (uploadInput) {
            uploadInput.value = "";
        }
        resetFilePreviewState();
        manualForm?.reset();
        resetManualLessons();
        setStatus("File cleared.");
    });
}

if (uploadInput) {
    uploadInput.addEventListener("change", () => {
        resetFilePreviewState();
        if (uploadInput.files?.length) {
            previewFromFile();
        }
    });
}

if (addLessonButton) {
    addLessonButton.addEventListener("click", () => {
        if (!lessonList) {
            return;
        }
        lessonList.appendChild(createLessonRow());
        renumberLessons();
    });
}

if (clearManualFormButton) {
    clearManualFormButton.addEventListener("click", () => {
        manualForm?.reset();
        resetManualLessons();
        setStatus("Manual unit planner cleared.");
    });
}

if (cancelManualUploadButton) {
    cancelManualUploadButton.addEventListener("click", () => {
        window.location.href = "upload-menu.html";
    });
}

if (importTemplateButton) {
    importTemplateButton.addEventListener("click", () => {
        importTeacherTemplateDocx();
    });
}

if (previewFileButton) {
    previewFileButton.addEventListener("click", () => {
        previewFromFile();
    });
}

if (previewTemplateButton) {
    previewTemplateButton.addEventListener("click", () => {
        previewFromTemplate();
    });
}

if (previewForm) {
    previewForm.addEventListener("submit", saveFromPreview);
}

if (manualForm) {
    manualForm.addEventListener("submit", saveManualUnitPlan);
}

if (uploadForm) {
    uploadForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!hasReadyFilePreview) {
            setStatus("Preview the selected file first, then import.", true);
            return;
        }

        if (!uploadInput?.files?.length) {
            setStatus("Choose a .docx file before importing.", true);
            return;
        }

        const file = uploadInput.files[0];
        if (!file) {
            setStatus("Choose a .docx file before importing.", true);
            return;
        }

        const payload = new FormData();
        payload.append("unitPlanFile", file);

        try {
            setActionButtonsDisabled(true);
            setStatus("Importing unit plan from document...");

            const response = await fetch("/api/unit-plans/import-docx", {
                method: "POST",
                headers: withUserEmailHeader(),
                body: payload
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result.error || `Could not import unit plan (HTTP ${response.status})`);
            }

            const lessonCount = Number(result.lessonCount || 0);
            const activityCount = Number(result.createdActivities || 0);
            const calendarCount = Number(result.createdCalendarEvents || 0);

            setStatus(`Imported ${result.unitPlan?.title || "unit plan"}. Saved ${lessonCount} lesson${lessonCount === 1 ? "" : "s"}, created ${activityCount} activity card${activityCount === 1 ? "" : "s"}${calendarCount ? `, and ${calendarCount} calendar event${calendarCount === 1 ? "" : "s"}` : ""}.`);
            uploadInput.value = "";
            resetFilePreviewState();
        } catch (error) {
            setStatus(`Import failed: ${error.message}`, true);
        } finally {
            setActionButtonsDisabled(false);
        }
    });
}

renderAuthStatus();
resetManualLessons();