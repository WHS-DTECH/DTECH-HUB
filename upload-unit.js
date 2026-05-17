const form = document.querySelector("#upload-unit-form");
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

const UPLOAD_HUB_AUTH_STORAGE_KEY = "hub_google_auth_v1";

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
    const buttons = [uploadButton, importTemplateButton, previewFileButton, previewTemplateButton, savePreviewButton];
    buttons.forEach((button) => {
        if (button) {
            button.disabled = Boolean(disabled);
        }
    });
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

if (clearButton) {
    clearButton.addEventListener("click", () => {
        if (uploadInput) {
            uploadInput.value = "";
        }
        setStatus("File cleared.");
    });
}

renderAuthStatus();

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
            throw new Error(result.error || `Could not preview document (HTTP ${response.status})`);
        }

        showPreviewPanel(result.unitPlan || {}, result.source || file.name);
        setStatus("Preview loaded. Review fields and click Save Previewed Unit Plan when ready.");
    } catch (error) {
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
        setStatus("Template preview loaded. Review fields and click Save Previewed Unit Plan when ready.");
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

if (form) {
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

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
        } catch (error) {
            setStatus(`Import failed: ${error.message}`, true);
        } finally {
            setActionButtonsDisabled(false);
        }
    });
}
