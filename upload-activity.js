// Prefill form fields if editing an existing activity
async function prefillFormIfEditing() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id || !form) return;

    try {
        const response = await fetch(`/api/activities/${encodeURIComponent(id)}`);
        if (!response.ok) return;
        const data = await response.json();
        // Prefill each field if present in data
        if (data.name) form.activityName.value = data.name;
        if (data.year_level) form.yearLevel.value = data.year_level;
        if (data.type) form.type.value = data.type;
        if (data.activity_category) form.activityCategory.value = data.activity_category;
        if (data.duration_minutes) form.durationMinutes.value = data.duration_minutes;
        if (data.difficulty) form.difficulty.value = data.difficulty;
        if (data.card_color) form.cardColor.value = data.card_color;
        if (data.card_url) form.cardUrl.value = data.card_url;
        if (data.outcome_image_url) form.outcomeImageUrl.value = data.outcome_image_url;
        if (data.description) form.shortDescription.value = data.description;
        if (data.resources) form.resources.value = Array.isArray(data.resources) ? data.resources.join("\n") : data.resources;
        if (data.instructions) form.instructions.value = Array.isArray(data.instructions) ? data.instructions.join("\n") : data.instructions;
        if (data.class_management_notes) form.classManagementNotes.value = Array.isArray(data.class_management_notes) ? data.class_management_notes.join("\n") : data.class_management_notes;
        if (data.class_preparation) form.classPreparation.value = Array.isArray(data.class_preparation) ? data.class_preparation.join("\n") : data.class_preparation;
        if (data.assessment_focus) form.assessmentFocus.value = Array.isArray(data.assessment_focus) ? data.assessment_focus.join("\n") : data.assessment_focus;
        if (typeof data.show_in_this_week !== "undefined") form.showThisWeek.checked = !!data.show_in_this_week;
    } catch (e) {
        // Ignore errors, just don't prefill
    }
}

window.addEventListener("DOMContentLoaded", prefillFormIfEditing);

const form = document.querySelector("#upload-activity-form");
const fileInput = document.querySelector("#outcome-image-file");
const imageUrlInput = document.querySelector("#outcome-image-url");
const uploadStatus = document.querySelector("#upload-status");
const cancelButton = document.querySelector("#cancel-upload");

const UPLOAD_HUB_AUTH_STORAGE_KEY = "hub_google_auth_v1";

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
    if (!activityName) throw new Error("Activity name is required before uploading images.");

    const imageData = await fileToDataUrl(file);
    const activityId = slugify(activityName);

    setStatus("Uploading image...");

    const response = await fetch(`/api/activities/${activityId}/upload-image`, {
        method: "POST",
        headers: withUserEmailHeader({ "Content-Type": "application/json" }),
        body: JSON.stringify({ image_data: imageData, file_name: file.name })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.image_url) {
        throw new Error(payload.error || "Upload failed");
    }

    if (imageUrlInput) {
        imageUrlInput.value = payload.image_url;
    }
    setStatus("Image uploaded successfully. URL has been filled in.");
}

function createActivityPayload() {
    const formData = new FormData(form);
    const name = String(formData.get("activityName") || "").trim();
    const resourcesAndEquipment = linesToArray(formData.get("resources"));
    const durationMinutes = Number.parseInt(String(formData.get("durationMinutes") || "0"), 10) || 0;

    return {
        id: slugify(name),
        name,
        year_level: String(formData.get("yearLevel") || "").trim(),
        type: String(formData.get("type") || "").trim(),
        activity_category: String(formData.get("activityCategory") || "").trim(),
        duration_minutes: durationMinutes,
        difficulty: String(formData.get("difficulty") || "").trim(),
        card_color: String(formData.get("cardColor") || "").trim(),
        card_url: String(formData.get("cardUrl") || "").trim(),
        outcome_image_url: String(formData.get("outcomeImageUrl") || "").trim(),
        description: String(formData.get("shortDescription") || "").trim(),
        resources: resourcesAndEquipment,
        equipment: resourcesAndEquipment,
        instructions: linesToArray(formData.get("instructions")),
        class_management_notes: linesToArray(formData.get("classManagementNotes")),
        class_preparation: linesToArray(formData.get("classPreparation")),
        assessment_focus: linesToArray(formData.get("assessmentFocus")),
        show_in_this_week: Boolean(formData.get("showThisWeek")),
        created_at: new Date().toISOString()
    };
}

async function saveActivityShared(payload) {
    const response = await fetch("/api/activities", {
        method: "POST",
        headers: withUserEmailHeader({
            "Content-Type": "application/json"
        }),
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const message =
            (data && (data.error || data.message)) ||
            `Could not save activity (HTTP ${response.status})`;
        throw new Error(message);
    }

    if (!data || (!data.id && !data.name)) {
        throw new Error("Save response was incomplete. Please try again.");
    }

    return data;
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

if (form) {
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const payload = createActivityPayload();

        if (!payload.name) {
            setStatus("Activity name is required.", true);
            return;
        }

        if (!getSignedInEmail()) {
            setStatus("Please sign in with your staff/admin school account before saving.", true);
            return;
        }

        setStatus("Saving activity...", false);
        try {
            const saved = await saveActivityShared(payload);
            localStorage.setItem("dtechHub:lastActivityDraft", JSON.stringify(payload));
            localStorage.setItem("dtechHub:lastSavedActivityId", String(saved.id || payload.id || ""));
            setStatus(`Activity "${saved.name || payload.name}" saved. Redirecting to Activities Library...`, false);
            setTimeout(() => {
                window.location.href = "/index.html#project-library";
            }, 1000);
        } catch (error) {
            setStatus(`Save failed: ${error.message}`, true);
        }
    });
}
