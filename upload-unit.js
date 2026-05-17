const form = document.querySelector("#upload-unit-form");
const uploadInput = document.querySelector("#unit-plan-file");
const uploadStatus = document.querySelector("#upload-status");
const authStatusElement = document.querySelector("#unit-auth-status");
const uploadButton = document.querySelector("#upload-unit-button");
const clearButton = document.querySelector("#clear-unit-file");

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
            if (uploadButton) {
                uploadButton.disabled = true;
            }
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
            if (uploadButton) {
                uploadButton.disabled = false;
            }
        }
    });
}