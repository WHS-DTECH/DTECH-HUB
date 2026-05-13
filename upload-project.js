const CLOUDINARY_CLOUD_NAME = "dq1ndhl3t";
const CLOUDINARY_UPLOAD_PRESET = "dtech_hub_unsigned";

const form = document.querySelector("#upload-activity-form");
const fileInput = document.querySelector("#outcome-image-file");
const imageUrlInput = document.querySelector("#outcome-image-url");
const uploadStatus = document.querySelector("#upload-status");
const preview = document.querySelector("#export-preview");
const cancelButton = document.querySelector("#cancel-upload");

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

function setStatus(message, isError = false) {
    if (!uploadStatus) return;
    uploadStatus.textContent = message;
    uploadStatus.style.color = isError ? "#bb3f3f" : "#2f4e73";
}

async function uploadToCloudinary(file) {
    if (!file) return;

    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    const body = new FormData();
    body.append("file", file);
    body.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    setStatus("Uploading image to Cloudinary...");

    const response = await fetch(endpoint, {
        method: "POST",
        body
    });

    const payload = await response.json();

    if (!response.ok || !payload.secure_url) {
        const details = payload?.error?.message || "Upload failed";
        throw new Error(details);
    }

    imageUrlInput.value = payload.secure_url;
    setStatus("Image uploaded successfully. URL has been filled in.");
}

function createProjectPayload() {
    const formData = new FormData(form);
    const name = String(formData.get("activityName") || "").trim();
    const resourcesAndEquipment = linesToArray(formData.get("resources"));

    return {
        id: slugify(name),
        name,
        year_level: String(formData.get("yearLevel") || "").trim(),
        type: String(formData.get("type") || "Project").trim(),
        activity_category: String(formData.get("activityCategory") || "Project Activity").trim(),
        duration_hours: Number(formData.get("durationHours") || 0),
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

async function saveProjectShared(payload) {
    const response = await fetch("/api/activities", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const details = await response.text();
        throw new Error(details || "Could not save project");
    }
}

function downloadPayload(payload) {
    const safeName = (payload.name || "project")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "project";

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `${safeName}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
}

if (fileInput) {
    fileInput.addEventListener("change", async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            await uploadToCloudinary(file);
        } catch (error) {
            setStatus(
                `Cloudinary upload failed: ${error.message}. Check that unsigned preset '${CLOUDINARY_UPLOAD_PRESET}' exists in your Cloudinary settings.`,
                true
            );
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

        const payload = createProjectPayload();
        if (!payload.name) {
            setStatus("Project name is required.", true);
            return;
        }

        try {
            await saveProjectShared(payload);
            localStorage.setItem("dtechHub:lastProjectDraft", JSON.stringify(payload));
            preview.hidden = false;
            preview.textContent = JSON.stringify(payload, null, 2);
            downloadPayload(payload);
            setStatus("Project saved to shared database and JSON exported.");
        } catch (error) {
            setStatus(`Save failed: ${error.message}`, true);
        }
    });
}
