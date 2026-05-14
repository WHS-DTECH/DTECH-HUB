const form = document.querySelector("#upload-activity-form");
const fileInput = document.querySelector("#outcome-image-file");
const imageUrlInput = document.querySelector("#outcome-image-url");
const costsInput = document.querySelector("#costs");
const commonCostOptions = Array.from(document.querySelectorAll(".common-cost-option"));
const uploadStatus = document.querySelector("#upload-status");
const cancelButton = document.querySelector("#cancel-upload");
const clearDraftButtons = Array.from(document.querySelectorAll("[data-clear-project-draft]"));
const authStatusElement = document.querySelector("#project-auth-status");
let currentEditingImageUrl = "";
const PROJECT_DRAFT_STORAGE_KEY = "dtechHub:uploadProjectDraft:v1";
const UPLOAD_HUB_AUTH_STORAGE_KEY = "hub_google_auth_v1";

function getEditingProjectId() {
    const params = new URLSearchParams(window.location.search);
    return String(params.get("id") || "").trim();
}

function getTextareaLinesSet(textarea) {
    return new Set(
        String(textarea?.value || "")
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
    );
}

function setTextareaLines(textarea, values) {
    if (!textarea) return;
    textarea.value = Array.from(values).join("\n");
}

function syncCommonCostOptionsFromTextarea() {
    if (!costsInput || !commonCostOptions.length) {
        return;
    }

    const normalizedLines = new Set(
        Array.from(getTextareaLinesSet(costsInput)).map((value) => value.toLowerCase())
    );

    commonCostOptions.forEach((option) => {
        const value = String(option.value || "").trim().toLowerCase();
        option.checked = normalizedLines.has(value);
    });
}

function toggleCommonCost(value, isChecked) {
    if (!costsInput) {
        return;
    }

    const line = String(value || "").trim();
    if (!line) {
        return;
    }

    const lines = getTextareaLinesSet(costsInput);
    if (isChecked) {
        lines.add(line);
    } else {
        const lowered = line.toLowerCase();
        for (const existing of Array.from(lines)) {
            if (existing.toLowerCase() === lowered) {
                lines.delete(existing);
            }
        }
    }

    setTextareaLines(costsInput, lines);
}
function parseMaybeArray(value) {
    if (Array.isArray(value)) {
        return value;
    }

    const raw = String(value || "").trim();
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [raw];
    } catch (_error) {
        return raw
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
    }
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
        localValue = null;
    }

    try {
        sessionValue = sessionStorage.getItem(UPLOAD_HUB_AUTH_STORAGE_KEY);
    } catch (_error) {
        sessionValue = null;
    }

    return localValue || sessionValue;
}

function getSignedInEmail() {
    const raw = getHubStoredAuthRaw();
    if (!raw) {
        return "";
    }

    try {
        const parsed = JSON.parse(raw);
        return normalizeEmail(parsed?.profile?.email || "");
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

function renderProjectAuthStatus() {
    if (!authStatusElement) return;

    const email = getSignedInEmail();
    if (email) {
        authStatusElement.classList.remove("is-missing");
        authStatusElement.textContent = `Signed in as ${email}`;
        return;
    }

    authStatusElement.classList.add("is-missing");
    authStatusElement.textContent = "Not signed in. Sign in with your school Google account before saving.";
}

async function prefillProjectIfEditing() {
    const id = getEditingProjectId();
    if (!id || !form) return;

    try {
        const response = await fetch(`/api/activities/${encodeURIComponent(id)}`);
        if (!response.ok) return;

        const data = await response.json();

        if (data.name) form.activityName.value = data.name;
        if (data.start_date) form.startDate.value = data.start_date;
        if (data.year_level) form.yearLevel.value = data.year_level;
        if (data.type) form.type.value = data.type;
        if (data.activity_category) form.activityCategory.value = data.activity_category;
        if (data.difficulty) form.difficulty.value = data.difficulty;
        if (data.time_sensitive !== undefined || data.timeSensitive !== undefined) {
            form.timeSensitive.checked = Boolean(data.time_sensitive ?? data.timeSensitive);
        }
        if (data.card_color || data.card_colour || data.color) form.cardColor.value = data.card_color || data.card_colour || data.color;
        if (data.card_url || data.activity_url || data.url) form.cardUrl.value = data.card_url || data.activity_url || data.url;
        currentEditingImageUrl = String(data.outcome_image_url || data.image_url || "").trim();
        if (currentEditingImageUrl) form.outcomeImageUrl.value = currentEditingImageUrl;
        if (data.show_in_this_week !== undefined || data.show_this_week !== undefined || data.is_this_week !== undefined) {
            form.showThisWeek.checked = Boolean(data.show_in_this_week ?? data.show_this_week ?? data.is_this_week);
        }

        if (data.contact_name) form.contactName.value = data.contact_name;
        if (data.contact_phone) form.contactPhone.value = data.contact_phone;
        if (data.contact_email) form.contactEmail.value = data.contact_email;
        if (data.company) form.company.value = data.company;
        if (data.address) form.address.value = data.address;
        if (data.overview) form.overview.value = parseMaybeArray(data.overview).join("\n");
        if (data.services) form.services.value = parseMaybeArray(data.services).join("\n");
        if (data.costs) form.costs.value = parseMaybeArray(data.costs).join("\n");
        if (data.outcomes) form.outcomes.value = parseMaybeArray(data.outcomes).join("\n");
        syncCommonCostOptionsFromTextarea();
        saveProjectDraft();
    } catch (_error) {
        // Ignore prefill failures and allow the form to remain editable.
    }
}

window.addEventListener("DOMContentLoaded", prefillProjectIfEditing);
window.addEventListener("DOMContentLoaded", restoreProjectDraftIfAvailable);
window.addEventListener("DOMContentLoaded", bindProjectDraftAutosave);
window.addEventListener("DOMContentLoaded", renderProjectAuthStatus);
window.addEventListener("storage", (event) => {
    if (event.key === UPLOAD_HUB_AUTH_STORAGE_KEY) {
        renderProjectAuthStatus();
    }
});

function slugify(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function linesToArray(value) {
    return String(value || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
}

function saveProjectDraft() {
    if (!form) return;

    const draft = {};
    const formData = new FormData(form);
    formData.forEach((value, key) => {
        if (key === "outcomeImageFile") return;
        draft[key] = String(value || "");
    });

    draft.showThisWeek = form.showThisWeek?.checked ? "on" : "";
    draft.__editingId = getEditingProjectId();

    try {
        localStorage.setItem(PROJECT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (_error) {
        // Ignore storage write errors.
    }
}

function restoreProjectDraftIfAvailable() {
    if (!form) return;

    let draft = null;
    try {
        draft = JSON.parse(localStorage.getItem(PROJECT_DRAFT_STORAGE_KEY) || "null");
    } catch (_error) {
        draft = null;
    }
    if (!draft || typeof draft !== "object") return;

    const editingId = getEditingProjectId();
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

        field.value = String(draft[key] || "");
    });

    syncCommonCostOptionsFromTextarea();
}

function bindProjectDraftAutosave() {
    if (!form) return;
    const handler = () => saveProjectDraft();
    form.addEventListener("input", handler);
    form.addEventListener("change", handler);
}

function clearProjectDraftStorage() {
    try {
        localStorage.removeItem(PROJECT_DRAFT_STORAGE_KEY);
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

async function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Failed to read image file."));
        reader.readAsDataURL(file);
    });
}

async function uploadActivityImage(file, activityName) {
    if (!file) return;
    if (!activityName) throw new Error("Project name is required before uploading images.");

    const imageData = await fileToDataUrl(file);
    const activityId = getEditingProjectId() || slugify(activityName);

    setStatus("Uploading image...");

    const response = await fetch(`/api/activities/${activityId}/upload-image`, {
        method: "POST",
        headers: withUserEmailHeader({ "Content-Type": "application/json" }),
        body: JSON.stringify({ image_data: imageData, file_name: file.name })
    });

    const payload = await response.json();

    if (!response.ok || !payload.image_url) {
        throw new Error(payload.error || "Upload failed");
    }

    imageUrlInput.value = payload.image_url;
    currentEditingImageUrl = payload.image_url || currentEditingImageUrl;
    setStatus("Image uploaded successfully. URL has been filled in.");
}

function createProjectPayload() {
    const formData = new FormData(form);
    const name = String(formData.get("activityName") || "").trim();
    const editingId = getEditingProjectId();

    return {
        id: editingId || slugify(name),
        name,
        year_level: String(formData.get("yearLevel") || "").trim(),
        type: String(formData.get("type") || "Project").trim(),
        activity_category: String(formData.get("activityCategory") || "Project Activity").trim(),
        duration_minutes: 1,
        time_sensitive: Boolean(formData.get("timeSensitive")),
        difficulty: String(formData.get("difficulty") || "").trim(),
        card_color: String(formData.get("cardColor") || "").trim(),
        card_url: String(formData.get("cardUrl") || "").trim(),
        outcome_image_url: String(formData.get("outcomeImageUrl") || "").trim() || currentEditingImageUrl,
        show_in_this_week: Boolean(formData.get("showThisWeek")),
        created_at: new Date().toISOString(),
        
        // Project Proposal Fields
        start_date: String(formData.get("startDate") || "").trim(),
        contact_name: String(formData.get("contactName") || "").trim(),
        contact_phone: String(formData.get("contactPhone") || "").trim(),
        contact_email: String(formData.get("contactEmail") || "").trim(),
        company: String(formData.get("company") || "").trim(),
        address: String(formData.get("address") || "").trim(),
        overview: linesToArray(formData.get("overview")),
        services: linesToArray(formData.get("services")),
        costs: linesToArray(formData.get("costs")),
        outcomes: linesToArray(formData.get("outcomes"))
    };
}

async function saveProjectShared(payload) {
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
        throw new Error(result.error || result.message || `Could not save project (HTTP ${response.status})`);
    }

    return result;
}

if (fileInput) {
    fileInput.addEventListener("change", async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const activityName = String(form?.activityName?.value || "").trim();

        try {
            await uploadActivityImage(file, activityName);
        } catch (error) {
            setStatus(`Image upload failed: ${error.message}`, true);
        }
    });
}

if (cancelButton) {
    cancelButton.addEventListener("click", () => {
        window.location.href = "upload-menu.html";
    });
}

async function handleClearDraftClick() {
        clearProjectDraftStorage();
        setStatus("");
        currentEditingImageUrl = "";

        if (!form) return;

        form.reset();
        syncCommonCostOptionsFromTextarea();

        if (getEditingProjectId()) {
            await prefillProjectIfEditing();
            setStatus("Draft cleared. Restored saved project values.");
            return;
        }

        setStatus("Draft cleared.");
}

if (clearDraftButtons.length) {
    clearDraftButtons.forEach((button) => {
        button.addEventListener("click", handleClearDraftClick);
    });
}

if (costsInput) {
    costsInput.addEventListener("input", () => {
        syncCommonCostOptionsFromTextarea();
    });
}

if (commonCostOptions.length) {
    commonCostOptions.forEach((option) => {
        option.addEventListener("change", () => {
            toggleCommonCost(option.value, option.checked);
        });
    });
}

syncCommonCostOptionsFromTextarea();

if (form) {
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const payload = createProjectPayload();
        if (!payload.name) {
            setStatus("Project name is required.", true);
            return;
        }

        try {
            const saved = await saveProjectShared(payload);
            localStorage.setItem("dtechHub:lastProjectDraft", JSON.stringify(payload));
            localStorage.setItem("dtechHub:lastSavedProjectId", String(saved.id || payload.id || ""));
            setStatus("Project saved to Activities Library.");
            saveProjectDraft();
        } catch (error) {
            setStatus(`Save failed: ${error.message}`, true);
        }
    });
}
