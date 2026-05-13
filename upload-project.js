const form = document.querySelector("#upload-activity-form");
const fileInput = document.querySelector("#outcome-image-file");
const imageUrlInput = document.querySelector("#outcome-image-url");
const uploadStatus = document.querySelector("#upload-status");
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
    const activityId = slugify(activityName);

    setStatus("Uploading image...");

    const response = await fetch(`/api/activities/${activityId}/upload-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_data: imageData, file_name: file.name })
    });

    const payload = await response.json();

    if (!response.ok || !payload.image_url) {
        throw new Error(payload.error || "Upload failed");
    }

    imageUrlInput.value = payload.image_url;
    setStatus("Image uploaded successfully. URL has been filled in.");
}

function createProjectPayload() {
    const formData = new FormData(form);
    const name = String(formData.get("activityName") || "").trim();

    return {
        id: slugify(name),
        name,
        year_level: String(formData.get("yearLevel") || "").trim(),
        type: String(formData.get("type") || "Project").trim(),
        activity_category: String(formData.get("activityCategory") || "Project Activity").trim(),
        duration_hours: Number(formData.get("durationMinutes") || 0),
        difficulty: String(formData.get("difficulty") || "").trim(),
        card_color: String(formData.get("cardColor") || "").trim(),
        card_url: String(formData.get("cardUrl") || "").trim(),
        outcome_image_url: String(formData.get("outcomeImageUrl") || "").trim(),
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
        outcomes: linesToArray(formData.get("outcomes")),
        withdrawal_date: String(formData.get("withdrawalDate") || "").trim(),
        client_id: String(formData.get("clientId") || "").trim()
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

        const payload = createProjectPayload();
        if (!payload.name) {
            setStatus("Project name is required.", true);
            return;
        }

        try {
            await saveProjectShared(payload);
            localStorage.setItem("dtechHub:lastProjectDraft", JSON.stringify(payload));
            setStatus("Project saved to Activities Library.");
        } catch (error) {
            setStatus(`Save failed: ${error.message}`, true);
        }
    });
}
