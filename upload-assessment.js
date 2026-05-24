const form = document.querySelector("#upload-activity-form");
const uploadStatus = document.querySelector("#upload-status");
const cancelButton = document.querySelector("#cancel-upload");
const clearDraftButtons = Array.from(document.querySelectorAll("[data-clear-assessment-draft]"));
const authStatusElement = document.querySelector("#assessment-auth-status");
const ASSESSMENT_DRAFT_STORAGE_KEY = "dtechHub:uploadAssessmentDraft:v1";
const UPLOAD_HUB_AUTH_STORAGE_KEY = "hub_google_auth_v1";
const SUBJECT_STREAM_PREFIX = "subject_stream:";

function getEditingAssessmentId() {
    const params = new URLSearchParams(window.location.search);
    return String(params.get("id") || "").trim();
}

function slugify(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function normalizeCardCategory(value, fallback = "Assessment Task") {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return fallback;

    if (raw === "project") return "Project";
    if (raw === "lesson") return "Lesson";
    if (raw === "assessment task" || raw === "assessment activity" || raw === "assessment") return "Assessment Task";
    if (raw === "activity" || raw === "skill activity" || raw === "practice" || raw === "practice activity") return "Activity";

    return fallback;
}

function linesToArray(value) {
    if (Array.isArray(value)) {
        return value.map((line) => String(line || "").trim()).filter(Boolean);
    }

    const text = String(value || "").trim();
    if (!text) {
        return [];
    }

    if (text.startsWith("[") && text.endsWith("]")) {
        try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
                return parsed.map((line) => String(line || "").trim()).filter(Boolean);
            }
        } catch (_error) {
            // Fall through to newline parsing.
        }
    }

    return text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
}

function normalizeSubjectStream(value) {
    const upper = String(value || "").trim().toUpperCase();
    if (["DTECH", "COMP", "TEXT", "DTONLINE"].includes(upper)) {
        return upper;
    }
    return "";
}

function extractSubjectStreamFromClassPreparation(value) {
    const lines = linesToArray(value);
    for (const line of lines) {
        const lower = String(line || "").trim().toLowerCase();
        if (lower.startsWith(SUBJECT_STREAM_PREFIX)) {
            return normalizeSubjectStream(lower.slice(SUBJECT_STREAM_PREFIX.length));
        }
    }
    return "";
}

function mergeClassPreparationWithSubject(existingValue, subjectStream) {
    const existing = linesToArray(existingValue).filter((line) => {
        return !String(line || "").trim().toLowerCase().startsWith(SUBJECT_STREAM_PREFIX);
    });

    const normalized = normalizeSubjectStream(subjectStream);
    if (normalized) {
        existing.unshift(`${SUBJECT_STREAM_PREFIX}${normalized}`);
    }

    return existing;
}

function saveAssessmentDraft() {
    if (!form) return;

    const draft = {};
    const formData = new FormData(form);
    formData.forEach((value, key) => {
        if (key.startsWith("image")) return; // Don't save file inputs
        draft[key] = String(value || "");
    });

    draft.showThisWeek = form.showThisWeek?.checked ? "on" : "";
    draft.__editingId = getEditingAssessmentId();

    try {
        localStorage.setItem(ASSESSMENT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (_error) {
        // Ignore storage write errors.
    }
}

function restoreAssessmentDraftIfAvailable() {
    if (!form) return;

    let draft = null;
    try {
        draft = JSON.parse(localStorage.getItem(ASSESSMENT_DRAFT_STORAGE_KEY) || "null");
    } catch (_error) {
        draft = null;
    }
    if (!draft || typeof draft !== "object") return;

    const editingId = getEditingAssessmentId();
    if (editingId && draft.__editingId && String(draft.__editingId) !== String(editingId)) {
        return;
    }

    Object.keys(draft).forEach((key) => {
        if (key === "__editingId") return;

        const field = form.elements.namedItem(key);
        if (!field || field instanceof RadioNodeList) return;

        if (field.type === "checkbox") {
            field.checked = draft[key] === "on" || draft[key] === true;
            return;
        }

        if (key === "activityCategory") {
            field.value = normalizeCardCategory(draft[key], "Assessment Task");
            return;
        }

        field.value = String(draft[key] || "");
    });
}

function bindAssessmentDraftAutosave() {
    if (!form) return;
    const handler = () => saveAssessmentDraft();
    form.addEventListener("input", handler);
    form.addEventListener("change", handler);
}

function clearAssessmentDraftStorage() {
    try {
        localStorage.removeItem(ASSESSMENT_DRAFT_STORAGE_KEY);
    } catch (_error) {
        // Ignore storage errors.
    }
}

function setStatus(message, isError = false) {
    if (!uploadStatus) return;
    if (!message) {
        uploadStatus.hidden = true;
        uploadStatus.textContent = "";
        uploadStatus.classList.remove("is-success", "is-error");
        return;
    }
    uploadStatus.textContent = message;
    uploadStatus.hidden = false;
    uploadStatus.classList.remove("is-success", "is-error");
    uploadStatus.classList.add(isError ? "is-error" : "is-success");
}

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function getHubStoredAuthRaw() {
    let localValue = null;
    let sessionValue = null;

    try {
        localValue = localStorage.getItem(UPLOAD_HUB_AUTH_STORAGE_KEY);
    } catch (_error) {
        // Ignore.
    }

    try {
        sessionValue = sessionStorage.getItem(UPLOAD_HUB_AUTH_STORAGE_KEY);
    } catch (_error) {
        // Ignore.
    }

    return localValue || sessionValue;
}

function withUserEmailHeader(headers) {
    const auth = getHubStoredAuthRaw();
    if (!auth) return headers;

    try {
        const data = JSON.parse(auth);
        const email = normalizeEmail(data?.profile?.email || "");
        if (email) {
            return { ...headers, "x-user-email": email };
        }
    } catch (_error) {
        // Ignore parsing errors.
    }

    return headers;
}

function renderAuthStatus() {
    if (!authStatusElement) return;

    const auth = getHubStoredAuthRaw();
    if (!auth) {
        authStatusElement.textContent = "⚠️ Not signed in. You'll need to sign in to save assessments.";
        authStatusElement.hidden = false;
        return;
    }

    try {
        const data = JSON.parse(auth);
        authStatusElement.textContent = `✓ Signed in as ${data?.profile?.email || "staff member"}`;
        authStatusElement.hidden = false;
    } catch (_error) {
        authStatusElement.hidden = true;
    }
}

// Prefill form fields if editing an existing assessment
async function prefillFormIfEditing() {
    const id = getEditingAssessmentId();
    if (!id || !form) return;

    try {
        const response = await fetch(`/api/activities/${encodeURIComponent(id)}`);
        if (!response.ok) return;
        const data = await response.json();

        // Prefill every field with explicit defaults to avoid stale draft values.
        form.activityName.value = String(data.name || "").trim();
        form.yearLevel.value = String(data.year_level || "").trim();
        form.type.value = String(data.type || "").trim();
        form.activityCategory.value = normalizeCardCategory(data.activity_category, "Assessment Task");
        form.difficulty.value = String(data.difficulty || "").trim();
        form.cardColor.value = String(data.card_color || data.card_colour || data.color || "Slate").trim() || "Slate";
        if (form.cardUrl) {
            form.cardUrl.value = String(data.card_url || data.activity_url || data.url || "").trim();
        }
        if (form.outcomeImageUrl) {
            form.outcomeImageUrl.value = String(data.outcome_image_url || data.image_url || "").trim();
        }
        form.subjectStream.value = normalizeSubjectStream(data.subject_stream) || extractSubjectStreamFromClassPreparation(data.class_preparation);

        // Assessment-specific fields
        form.shortDescription.value = String(data.description || data.summary || "").trim();
        if (form.classPreparation) {
            form.classPreparation.value = linesToArray(data.class_preparation).join("\n");
        }
        form.standardDetails.value = linesToArray(data.standard_details).join("\n");
        form.tasksList.value = linesToArray(data.tasks_list || data.assessment_focus).join("\n");
        form.achieved.value = linesToArray(data.achieved).join("\n");
        form.merit.value = linesToArray(data.merit).join("\n");
        form.excellence.value = linesToArray(data.excellence).join("\n");
        form.submissionRequirements.value = linesToArray(data.submission_requirements).join("\n");
        form.relevantImplications.value = linesToArray(data.relevant_implications).join("\n");
        form.progressLogging.value = linesToArray(data.progress_logging).join("\n");
        form.feedbackTrialling.value = linesToArray(data.feedback_trialling).join("\n");

        const showInThisWeek = data.show_in_this_week ?? data.show_this_week ?? data.is_pinned ?? data.is_this_week;
        if (typeof showInThisWeek !== "undefined") form.showThisWeek.checked = !!showInThisWeek;
    } catch (e) {
        // Ignore errors, just don't prefill
    }
}

window.addEventListener("DOMContentLoaded", async () => {
    if (!getEditingAssessmentId()) {
        restoreAssessmentDraftIfAvailable();
    }
    await prefillFormIfEditing();
    renderAuthStatus();
});

function createAssessmentPayload() {
    const formData = new FormData(form);
    const name = String(formData.get("activityName") || "").trim();
    const editingId = getEditingAssessmentId();

    const shortDescription = String(formData.get("shortDescription") || "").trim();

    const tasksList = linesToArray(formData.get("tasksList"));
    const subjectStream = normalizeSubjectStream(formData.get("subjectStream"));
    const classPreparation = mergeClassPreparationWithSubject(formData.get("classPreparation"), subjectStream);

    return {
        id: editingId || slugify(name),
        name,
        year_level: String(formData.get("yearLevel") || "").trim(),
        type: String(formData.get("type") || "").trim(),
        activity_category: normalizeCardCategory(formData.get("activityCategory"), "Assessment Task"),
        duration_minutes: 1,
        difficulty: String(formData.get("difficulty") || "").trim(),
        card_color: String(formData.get("cardColor") || "Slate").trim(),
        card_url: String(formData.get("cardUrl") || "").trim(),
        outcome_image_url: String(formData.get("outcomeImageUrl") || "").trim(),
        subject_stream: subjectStream,
        show_in_this_week: Boolean(formData.get("showThisWeek")),
        created_at: new Date().toISOString(),
        
        // Assessment-specific fields
        description: shortDescription,
        summary: shortDescription,
        standard_details: linesToArray(formData.get("standardDetails")),
        tasks_list: tasksList,
        assessment_focus: tasksList,
        class_preparation: classPreparation,
        achieved: linesToArray(formData.get("achieved")),
        merit: linesToArray(formData.get("merit")),
        excellence: linesToArray(formData.get("excellence")),
        submission_requirements: linesToArray(formData.get("submissionRequirements")),
        relevant_implications: linesToArray(formData.get("relevantImplications")),
        progress_logging: linesToArray(formData.get("progressLogging")),
        feedback_trialling: linesToArray(formData.get("feedbackTrialling")),
    };
}

async function saveAssessmentShared(payload) {
    const response = await fetch("/api/activities", {
        method: "POST",
        headers: withUserEmailHeader({
            "Content-Type": "application/json"
        }),
        body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error("Sign-in required. Please sign in with your school Google account and try again.");
        }
        throw new Error(result.error || result.message || `Could not save assessment (HTTP ${response.status})`);
    }

    return result;
}

// File to data URL conversion
function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Failed to read image file."));
        reader.readAsDataURL(file);
    });
}

// Upload multiple images for assessment
async function uploadAssessmentImages(assessmentId, assessmentName) {
    const imageInputs = [
        document.querySelector("#image-1"),
        document.querySelector("#image-2"),
        document.querySelector("#image-3"),
        document.querySelector("#image-4"),
        document.querySelector("#image-5")
    ];

    const imageUrls = [];

    for (let i = 0; i < imageInputs.length; i++) {
        const input = imageInputs[i];
        const file = input?.files?.[0];
        
        if (!file) continue;

        try {
            setStatus(`Uploading image ${i + 1}...`);
            
            const imageData = await fileToDataUrl(file);
            
            const response = await fetch(`/api/activities/${assessmentId}/upload-image`, {
                method: "POST",
                headers: withUserEmailHeader({
                    "Content-Type": "application/json"
                }),
                body: JSON.stringify({ image_data: imageData, file_name: file.name })
            });

            const payload = await response.json().catch(() => ({}));

            if (!response.ok || !payload.image_url) {
                console.warn(`Failed to upload image ${i + 1}:`, payload.error);
                continue;
            }

            imageUrls.push(payload.image_url);
        } catch (error) {
            console.warn(`Error uploading image ${i + 1}:`, error.message);
        }
    }

    if (imageUrls.length > 0) {
        setStatus(`Successfully uploaded ${imageUrls.length} image(s).`);
        return imageUrls;
    }

    return [];
}

if (cancelButton) {
    cancelButton.addEventListener("click", () => {
        window.location.href = "upload-menu.html";
    });
}

async function handleClearDraftClick() {
    clearAssessmentDraftStorage();
    setStatus("");
    if (!form) return;

    form.reset();

    if (getEditingAssessmentId()) {
        await prefillFormIfEditing();
        setStatus("Draft cleared. Restored saved assessment values.");
        return;
    }

    setStatus("Draft cleared.");
}

if (clearDraftButtons.length) {
    clearDraftButtons.forEach((button) => {
        button.addEventListener("click", handleClearDraftClick);
    });
}

bindAssessmentDraftAutosave();

if (form) {
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const payload = createAssessmentPayload();
        if (!payload.name) {
            setStatus("Assessment task name is required.", true);
            return;
        }

        try {
            const saved = await saveAssessmentShared(payload);
            
            // Upload images if any
            if (saved.id || saved.name) {
                const assessmentId = saved.id || payload.id;
                await uploadAssessmentImages(assessmentId, payload.name);
            }

            localStorage.setItem("dtechHub:lastAssessmentDraft", JSON.stringify(payload));
            localStorage.setItem("dtechHub:lastSavedAssessmentId", String(saved.id || payload.id || ""));
            setStatus("Assessment task saved to Activity Library.");
            saveAssessmentDraft();
        } catch (error) {
            setStatus(`Save failed: ${error.message}`, true);
        }
    });
}
