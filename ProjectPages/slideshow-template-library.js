const DEFAULT_TEMPLATE_LIBRARY = [
    {
        id: "digital-outcome-description",
        title: "Digital Outcome Description",
        standardCodes: ["91897", "91907"],
        criteriaText: "Describe what the digital outcome is, who it is for, and what it must do.",
        summary: "Uses a two-column prompt-and-response slide structure for clear assessment evidence.",
        imageUrl: "https://drive.google.com/thumbnail?id=1brOY70u9aJdsoiEtxVepr82vRhiv9VzpMm8TUv3lcTo&sz=w1000",
        templateUrl: "https://docs.google.com/presentation/d/1brOY70u9aJdsoiEtxVepr82vRhiv9VzpMm8TUv3lcTo/edit?usp=sharing",
        status: "live"
    },
    {
        id: "speaker-notes-criteria-mapping",
        title: "Speaker Notes Criteria Mapping",
        standardCodes: ["91897"],
        criteriaText: "Map each presented slide to assessment criteria in Speaker Notes.",
        summary: "Template slot reserved. Add the final template URL when this slide is complete.",
        imageUrl: "https://placehold.co/540x760/d8e6d9/1f3a56?text=Coming+Soon+Template",
        templateUrl: "",
        status: "coming-soon"
    }
];

let templateLibraryData = Array.isArray(DEFAULT_TEMPLATE_LIBRARY)
    ? DEFAULT_TEMPLATE_LIBRARY.map((entry) => ({ ...entry }))
    : [];
let libraryAccess = { can_teacher_view: false, can_admin: false };
let libraryHandlersBound = false;
const SYNC_FOLDER_NAME = "Process Slide Templates";
const LIB_HUB_VIEW_MODE_STORAGE_KEY = "hub_view_mode_v1";

const DRIVE_SCOPES = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly";
const LIB_AUTH_KEY = "hub_google_auth_v1";

const driveState = {
    accessToken: null,
    tokenExpiry: 0,
    tokenClient: null,
    pendingResolve: null,
    setupState: null,
    copyMap: {}          // templateId → { fileUrl, fileName }
};

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function toSafeExternalUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
        const parsed = new URL(raw);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.toString();
    } catch (_error) {}
    return "";
}

function extractSlidesFileId(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
        const parsed = new URL(raw);
        if (!parsed.hostname.includes("google.com")) return "";
        const match = parsed.pathname.match(/\/presentation\/d\/([A-Za-z0-9_-]+)/i);
        return match?.[1] || "";
    } catch (_error) {
        return "";
    }
}

function getLibraryEmail() {
    try {
        const raw = localStorage.getItem(LIB_AUTH_KEY) || sessionStorage.getItem(LIB_AUTH_KEY);
        if (!raw) return "";
        const parsed = JSON.parse(raw);
        if (!parsed?.expiresAt || Number(parsed.expiresAt) <= Date.now()) return "";
        return String(parsed?.profile?.email || "").trim().toLowerCase();
    } catch (_error) {
        return "";
    }
}

function getLibraryBearerToken() {
    try {
        const raw = localStorage.getItem(LIB_AUTH_KEY) || sessionStorage.getItem(LIB_AUTH_KEY);
        if (!raw) return "";
        const parsed = JSON.parse(raw);
        if (!parsed?.expiresAt || Number(parsed.expiresAt) <= Date.now()) return "";
        return String(parsed?.idToken || parsed?.accessToken || "").trim();
    } catch (_error) {
        return "";
    }
}

function withLibraryAuthHeaders(headers = {}) {
    const email = getLibraryEmail();
    const token = getLibraryBearerToken();
    const next = { ...headers };
    if (email) next["x-user-email"] = email;
    if (token && token.startsWith("eyJ") && token.split(".").length === 3) next.Authorization = `Bearer ${token}`;
    return next;
}

async function loadLibraryAccess() {
    const email = getLibraryEmail();
    if (!email) {
        return { can_teacher_view: false, can_admin: false };
    }

    try {
        const response = await fetch(`/api/auth/user-access?email=${encodeURIComponent(email)}`, {
            headers: withLibraryAuthHeaders({})
        });
        if (!response.ok) {
            return { can_teacher_view: false, can_admin: false };
        }
        const payload = await response.json().catch(() => ({}));
        return {
            can_teacher_view: Boolean(payload?.can_teacher_view),
            can_admin: Boolean(payload?.can_admin)
        };
    } catch (_error) {
        return { can_teacher_view: false, can_admin: false };
    }
}

function applyLibraryRoleVisibility(access) {
    const canManage = canManageTemplates();
    const staffOnlyElements = document.querySelectorAll("[data-staff-only='true']");
    staffOnlyElements.forEach((element) => {
        element.hidden = !canManage;
    });
}

function initDriveTokenClient() {
    if (!window.google?.accounts?.oauth2) return null;
    const clientId = document.querySelector('meta[name="hub-google-client-id"]')?.content.trim() || "";
    if (!clientId) return null;

    return window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: DRIVE_SCOPES,
        callback: (response) => {
            if (driveState.pendingResolve) {
                driveState.pendingResolve(response);
                driveState.pendingResolve = null;
            }
            if (!response.error && response.access_token) {
                driveState.accessToken = response.access_token;
                driveState.tokenExpiry = Date.now() + (Number(response.expires_in) || 3600) * 1000;
            }
        },
        error_callback: (error) => {
            if (driveState.pendingResolve) {
                driveState.pendingResolve({ error: error?.type || "access_denied" });
                driveState.pendingResolve = null;
            }
        }
    });
}

function requestDriveToken(options = {}) {
    const forceConsent = Boolean(options?.forceConsent);
    return new Promise((resolve) => {
        if (driveState.accessToken && driveState.tokenExpiry > Date.now() + 60000) {
            resolve({ access_token: driveState.accessToken });
            return;
        }

        if (!driveState.tokenClient) {
            driveState.tokenClient = initDriveTokenClient();
        }

        if (!driveState.tokenClient) {
            resolve({ error: "Drive sign-in is not available. Please ensure you are signed in." });
            return;
        }

        driveState.pendingResolve = resolve;
        driveState.tokenClient.requestAccessToken({ prompt: forceConsent ? "consent" : "" });
    });
}

async function loadDriveSetup() {
    const email = getLibraryEmail();
    if (!email) return null;

    try {
        const response = await fetch("/api/student/drive-setup", { headers: withLibraryAuthHeaders({}) });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) return null;
        driveState.setupState = payload;
        return payload;
    } catch (_error) {
        return null;
    }
}

function normalizeTemplateLibraryEntries(items) {
    if (!Array.isArray(items)) return [];
    return items
        .map((row, index) => {
            const id = String(row?.id || row?.templateId || "").trim();
            const title = String(row?.title || "").trim();
            const templateUrl = String(row?.templateUrl || "").trim();
            if (!id || !title || !templateUrl) return null;

            return {
                id,
                title,
                standardCodes: Array.isArray(row?.standardCodes) ? row.standardCodes.map((code) => String(code || "").trim()).filter(Boolean) : [],
                criteriaText: String(row?.criteriaText || "").trim(),
                summary: String(row?.summary || "").trim(),
                imageUrl: String(row?.imageUrl || "").trim(),
                templateUrl,
                status: String(row?.status || "live").trim().toLowerCase() === "coming-soon" ? "coming-soon" : "live",
                sortOrder: Number(row?.sortOrder ?? index + 1) || (index + 1)
            };
        })
        .filter(Boolean)
        .sort((left, right) => Number(left?.sortOrder || 0) - Number(right?.sortOrder || 0));
}

async function loadTemplateLibraryEntries() {
    try {
        const response = await fetch("/api/template-library", { headers: withLibraryAuthHeaders({}) });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) return;

        const fromApi = normalizeTemplateLibraryEntries(payload?.entries);
        templateLibraryData = fromApi;
    } catch (_error) {
        // Keep defaults when API is unavailable.
    }
}

function canManageTemplates() {
    const hasStaffRole = Boolean(libraryAccess?.can_teacher_view || libraryAccess?.can_admin);
    if (!hasStaffRole) return false;
    return getHubViewMode() === "teacher";
}

function getHubViewMode() {
    try {
        const value = String(localStorage.getItem(LIB_HUB_VIEW_MODE_STORAGE_KEY) || "").trim().toLowerCase();
        return value === "teacher" ? "teacher" : "student";
    } catch (_error) {
        return "student";
    }
}

function setTemplateSyncStatus(message, isError = false) {
    const statusEl = document.querySelector("#template-sync-status");
    if (!statusEl) return;
    statusEl.textContent = String(message || "").trim();
    statusEl.style.color = isError ? "#ffd5d5" : "rgba(255, 255, 255, 0.92)";
}

async function handleSyncTemplateLibrary() {
    const syncButton = document.querySelector("#template-sync-button");
    if (!syncButton || !canManageTemplates()) return;

    syncButton.disabled = true;
    setTemplateSyncStatus("Requesting Google Drive access...");

    const tokenResponse = await requestDriveToken();
    if (tokenResponse.error) {
        syncButton.disabled = false;
        setTemplateSyncStatus("Drive access was not granted.", true);
        return;
    }

    setTemplateSyncStatus(`Syncing slides from ${SYNC_FOLDER_NAME}...`);
    try {
        const response = await fetch("/api/template-library/sync", {
            method: "POST",
            headers: withLibraryAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({
                driveAccessToken: tokenResponse.access_token,
                folderName: SYNC_FOLDER_NAME
            })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || `Error ${response.status}`);

        const fromApi = normalizeTemplateLibraryEntries(payload?.entries);
        templateLibraryData = fromApi;
        renderLibrary();
        const syncedCount = Number(payload?.syncedCount || fromApi.length || 0);
        setTemplateSyncStatus(`Synced ${syncedCount} template${syncedCount === 1 ? "" : "s"}.`);
    } catch (error) {
        setTemplateSyncStatus(`Sync failed: ${error.message || "Unknown error"}`, true);
    }

    syncButton.disabled = false;
}

function renderSetupBanner(setup) {
    const banner = document.querySelector("#template-setup-banner");
    if (!banner) return;

    const signedInEmail = getLibraryEmail();

    if (!signedInEmail) {
        banner.innerHTML = "";
        banner.hidden = true;
        return;
    }

    if (!setup || !setup.configured) {
        banner.innerHTML = `
            <div class="template-setup-banner-inner template-setup-banner-warn">
                <p class="template-setup-banner-text">No Hapara mapping was found for your signed-in account.<br><strong>Signed-in account:</strong> ${escapeHtml(signedInEmail)}<br><strong>Mapping status:</strong> No mapping found for this email.<br>Templates are still available using the standard Google copy link.<br><a class="template-setup-banner-link" href="../admin-hapara-folders.html" target="_blank" rel="noreferrer">Open Hapara Folder Upload page</a> to verify this email has a mapped Google Drive folder URL.</p>
            </div>`;
        banner.hidden = false;
        return;
    }

    const hasDriveFolder = Boolean(String(setup.haparaFolderId || "").trim());
    const mappedValue = String(setup.haparaFolderUrl || "").trim();
    const mappedLabel = String(setup.classLabel || "").trim();

    if (!hasDriveFolder) {
        const mappedDescription = mappedLabel || mappedValue || "Mapped (non-Drive value)";
        banner.innerHTML = `
            <div class="template-setup-banner-inner template-setup-banner-action">
                <p class="template-setup-banner-text">Your account has a Hapara mapping by folder name.<br><strong>Signed-in account:</strong> ${escapeHtml(signedInEmail)}<br><strong>Mapped value:</strong> ${escapeHtml(mappedDescription)}<br>Click confirm and we will try to find this folder in your Google Drive, then create your <strong>Process Assessment</strong> sub-folder automatically.</p>
                <button type="button" class="template-setup-confirm-button" id="template-setup-confirm">Confirm My Folder</button>
                <p class="template-setup-banner-status" id="template-setup-status" aria-live="polite"></p>
                <p class="template-setup-banner-text"><a class="template-setup-banner-link" href="../admin-hapara-folders.html" target="_blank" rel="noreferrer">Open Hapara Folder Upload page</a> to upload a Drive folder URL if name lookup does not find the correct folder.</p>
            </div>`;
        banner.hidden = false;
        document.querySelector("#template-setup-confirm")?.addEventListener("click", () => {
            void handleConfirmFolder();
        });
        return;
    }

    if (setup.confirmed && setup.processAssessmentFolderId) {
        banner.innerHTML = `
            <div class="template-setup-banner-inner template-setup-banner-ok">
                <p class="template-setup-banner-text">&#10003; Your <strong>Process Assessment</strong> folder is ready. Templates copied will go directly there.</p>
            </div>`;
        banner.hidden = false;
        return;
    }

    const folderUrl = String(setup.haparaFolderUrl || "").trim();
    const classLabel = String(setup.classLabel || "your Hapara folder").trim();
    banner.innerHTML = `
        <div class="template-setup-banner-inner template-setup-banner-action">
            <p class="template-setup-banner-text">Your Hapara folder has been set: <strong>${escapeHtml(classLabel)}</strong>${folderUrl ? ` &mdash; <a class="template-setup-banner-link" href="${escapeHtml(folderUrl)}" target="_blank" rel="noreferrer">Open folder</a>` : ""}.<br>Confirm to create your <strong>Process Assessment</strong> sub-folder so templates save there automatically.</p>
            <button type="button" class="template-setup-confirm-button" id="template-setup-confirm">Confirm My Folder</button>
            <p class="template-setup-banner-status" id="template-setup-status" aria-live="polite"></p>
        </div>`;
    banner.hidden = false;

    document.querySelector("#template-setup-confirm")?.addEventListener("click", () => {
        void handleConfirmFolder();
    });
}

async function handleConfirmFolder() {
    const confirmButton = document.querySelector("#template-setup-confirm");
    const statusEl = document.querySelector("#template-setup-status");
    if (confirmButton) confirmButton.disabled = true;
    if (statusEl) statusEl.textContent = "Requesting Drive access\u2026";

    const tokenResponse = await requestDriveToken();
    if (tokenResponse.error) {
        if (statusEl) statusEl.textContent = "Drive access was not granted. Please try again.";
        if (confirmButton) confirmButton.disabled = false;
        return;
    }

    if (statusEl) statusEl.textContent = "Creating Process Assessment folder\u2026";

    try {
        const response = await fetch("/api/student/drive-setup/confirm", {
            method: "POST",
            headers: withLibraryAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ driveAccessToken: tokenResponse.access_token })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || `Error ${response.status}`);

        driveState.setupState = { ...driveState.setupState, confirmed: true, processAssessmentFolderId: payload.processAssessmentFolderId };
        renderSetupBanner(driveState.setupState);
    } catch (error) {
        if (statusEl) statusEl.textContent = `Could not confirm folder: ${error.message || "Unknown error"}`;
        if (confirmButton) confirmButton.disabled = false;
    }
}

async function handleUseTemplate(templateId) {
    const item = templateLibraryData.find((entry) => entry.id === templateId);
    if (!item) return;

    const fileId = extractSlidesFileId(item.templateUrl);
    if (!fileId) {
        alert("This template does not have a valid Google Slides URL configured yet.");
        return;
    }

    // If already copied this session, open existing
    if (driveState.copyMap[templateId]) {
        window.open(driveState.copyMap[templateId].fileUrl, "_blank", "noopener");
        return;
    }

    // If no confirmed setup, fall back to standard copy link
    const setup = driveState.setupState;
    if (!setup?.confirmed || !setup?.processAssessmentFolderId) {
        const copyUrl = `https://docs.google.com/presentation/d/${fileId}/copy`;
        window.open(copyUrl, "_blank", "noopener");
        return;
    }

    const button = document.querySelector(`[data-use-template="${CSS.escape(templateId)}"]`);
    if (button) { button.disabled = true; button.textContent = "Copying\u2026"; }

    const copyTemplateWithToken = async (accessToken) => {
        const response = await fetch("/api/student/drive-setup/copy-template", {
            method: "POST",
            headers: withLibraryAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ driveAccessToken: accessToken, templateTitle: item.title, templateFileId: fileId })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || `Error ${response.status}`);
        return payload;
    };

    const tokenResponse = await requestDriveToken();
    if (tokenResponse.error) {
        if (button) { button.disabled = false; button.textContent = "Use Template"; }
        alert("Drive access was not granted. Please sign in and try again.");
        return;
    }

    try {
        const payload = await copyTemplateWithToken(tokenResponse.access_token);

        driveState.copyMap[templateId] = { fileUrl: payload.fileUrl, fileName: payload.fileName };
        updateCardAfterCopy(templateId, payload);
        window.open(payload.fileUrl, "_blank", "noopener");
    } catch (error) {
        const message = String(error?.message || "");
        const needsConsentRetry = /has not granted the app|read access to the file|insufficient permissions|forbidden/i.test(message);
        if (!needsConsentRetry) {
            if (button) { button.disabled = false; button.textContent = "Use Template"; }
            alert(`Could not copy template: ${error.message || "Unknown error"}`);
            return;
        }

        driveState.accessToken = null;
        driveState.tokenExpiry = 0;
        const consentTokenResponse = await requestDriveToken({ forceConsent: true });
        if (consentTokenResponse.error) {
            if (button) { button.disabled = false; button.textContent = "Use Template"; }
            alert("Google Drive needs one-time permission to read templates before copying. Please allow access and try again.");
            return;
        }

        try {
            const retryPayload = await copyTemplateWithToken(consentTokenResponse.access_token);
            driveState.copyMap[templateId] = { fileUrl: retryPayload.fileUrl, fileName: retryPayload.fileName };
            updateCardAfterCopy(templateId, retryPayload);
            window.open(retryPayload.fileUrl, "_blank", "noopener");
        } catch (retryError) {
            if (button) { button.disabled = false; button.textContent = "Use Template"; }
            alert(`Could not copy template: ${retryError.message || "Unknown error"}`);
        }
    }
}

function updateCardAfterCopy(templateId, copyResult) {
    const card = document.querySelector(`[data-template-id="${CSS.escape(templateId)}"]`);
    if (!card) return;

    const actionsArea = card.querySelector(".template-card-actions");
    if (!actionsArea) return;

    const existingLabel = copyResult.alreadyExists ? "Opened your existing copy." : "Saved to Process Assessment.";
    const deleteButtonHtml = canManageTemplates()
        ? `<button type="button" class="template-card-delete" data-delete-template="${escapeHtml(templateId)}">Delete</button>`
        : "";

    actionsArea.innerHTML = `
        <a class="template-card-open template-card-open-existing" href="${escapeHtml(copyResult.fileUrl)}" target="_blank" rel="noreferrer">Open Your Copy</a>
        ${deleteButtonHtml}
        <p class="template-card-copy-note">${escapeHtml(existingLabel)}</p>
    `;
}

async function handleDeleteTemplate(templateId, clickedButton) {
    if (!canManageTemplates()) return;

    const id = String(templateId || "").trim();
    if (!id) return;
    const entry = templateLibraryData.find((item) => String(item?.id || "") === id);
    const title = String(entry?.title || "this template");
    const confirmed = window.confirm(`Delete ${title} from the library?`);
    if (!confirmed) return;

    if (clickedButton) clickedButton.disabled = true;
    try {
        const response = await fetch(`/api/template-library/${encodeURIComponent(id)}`, {
            method: "DELETE",
            headers: withLibraryAuthHeaders({})
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || `Error ${response.status}`);

        const fromApi = normalizeTemplateLibraryEntries(payload?.entries);
        templateLibraryData = fromApi;
        delete driveState.copyMap[id];
        renderLibrary();
    } catch (error) {
        if (clickedButton) clickedButton.disabled = false;
        alert(`Could not delete template: ${error.message || "Unknown error"}`);
    }
}

function renderTemplateCard(item) {
    const title = String(item?.title || "Untitled Template").trim();
    const criteriaText = String(item?.criteriaText || "").trim();
    const summary = String(item?.summary || "").trim();
    const imageUrl = toSafeExternalUrl(item?.imageUrl);
    const fileId = extractSlidesFileId(item?.templateUrl || "");
    const standards = Array.isArray(item?.standardCodes)
        ? item.standardCodes.map((code) => String(code || "").trim()).filter(Boolean)
        : [];
    const status = String(item?.status || "coming-soon").trim().toLowerCase() === "live" ? "live" : "coming-soon";
    const statusLabel = status === "live" ? "Live" : "Coming Soon";
    const canUse = status === "live" && Boolean(fileId);
    const imageAlt = `${title} preview`;
    const standardsLabel = standards.length ? standards.join(", ") : "Not set";
    const existingCopy = driveState.copyMap[item.id];
    const deleteButtonHtml = canManageTemplates()
        ? `<button type="button" class="template-card-delete" data-delete-template="${escapeHtml(item.id)}">Delete</button>`
        : "";

    const actionHtml = !canUse
        ? `<button class="template-card-open" aria-disabled="true" disabled>${status === "live" ? "Template Link Needed" : "Template Coming Soon"}</button>`
        : existingCopy
            ? `<a class="template-card-open template-card-open-existing" href="${escapeHtml(existingCopy.fileUrl)}" target="_blank" rel="noreferrer">Open Your Copy</a>${deleteButtonHtml}<p class="template-card-copy-note">Saved to Process Assessment.</p>`
            : `<button class="template-card-open" type="button" data-use-template="${escapeHtml(item.id)}">Use Template</button>${deleteButtonHtml}`;

    const previewClickHtml = canUse && !existingCopy
        ? `<button class="template-card-preview template-card-preview-button" type="button" data-use-template="${escapeHtml(item.id)}" aria-label="Use template: ${escapeHtml(title)}">`
        : existingCopy
            ? `<a class="template-card-preview" href="${escapeHtml(existingCopy.fileUrl)}" target="_blank" rel="noreferrer">`
            : `<span class="template-card-preview">`;
    const previewCloseHtml = canUse && !existingCopy ? `</button>` : existingCopy ? `</a>` : `</span>`;

    return `
        <article class="template-card" data-template-status="${escapeHtml(status)}" data-template-id="${escapeHtml(item.id)}">
            ${previewClickHtml}
                <img src="${escapeHtml(imageUrl || "https://placehold.co/540x760/d7e2ef/355674?text=Template+Preview")}" alt="${escapeHtml(imageAlt)}" loading="lazy">
            ${previewCloseHtml}
            <div class="template-card-body">
                <h2>${canUse && !existingCopy
                    ? `<button class="template-card-title-link" type="button" data-use-template="${escapeHtml(item.id)}">${escapeHtml(title)}</button>`
                    : existingCopy
                        ? `<a class="template-card-title-link" href="${escapeHtml(existingCopy.fileUrl)}" target="_blank" rel="noreferrer">${escapeHtml(title)}</a>`
                        : escapeHtml(title)
                }</h2>
                <div class="template-card-meta">
                    <span class="template-card-standard">${escapeHtml(standardsLabel)}</span>
                    <span class="template-card-badge">${escapeHtml(statusLabel)}</span>
                </div>
                ${criteriaText ? `<p><strong>Assessment Criteria:</strong> ${escapeHtml(criteriaText)}</p>` : ""}
                ${summary ? `<p>${escapeHtml(summary)}</p>` : ""}
                <div class="template-card-actions">${actionHtml}</div>
            </div>
        </article>
    `;
}

function renderLibrary() {
    const host = document.querySelector("#template-list");
    if (!host) return;
    if (!Array.isArray(templateLibraryData) || !templateLibraryData.length) {
        host.innerHTML = '<p class="template-empty">No templates are listed yet.</p>';
        return;
    }
    host.innerHTML = templateLibraryData.map((item) => renderTemplateCard(item)).join("");

    if (!libraryHandlersBound) {
        libraryHandlersBound = true;
        host.addEventListener("click", (event) => {
            const useButton = event.target.closest("[data-use-template]");
            if (useButton) {
                const templateId = useButton.getAttribute("data-use-template") || "";
                if (templateId) {
                    void handleUseTemplate(templateId);
                    return;
                }
            }

            const deleteButton = event.target.closest("[data-delete-template]");
            if (!deleteButton) return;
            const templateId = deleteButton.getAttribute("data-delete-template") || "";
            if (templateId) void handleDeleteTemplate(templateId, deleteButton);
        });
    }
}

async function initLibrary() {
    libraryAccess = await loadLibraryAccess();
    applyLibraryRoleVisibility(libraryAccess);

    const syncButton = document.querySelector("#template-sync-button");
    if (syncButton && canManageTemplates()) {
        syncButton.addEventListener("click", () => {
            void handleSyncTemplateLibrary();
        });
    }

    await loadTemplateLibraryEntries();
    renderLibrary();

    const banner = document.querySelector("#template-setup-banner");
    if (banner) banner.hidden = true;

    const email = getLibraryEmail();
    if (!email) return;

    const setup = await loadDriveSetup();
    renderSetupBanner(setup);

    // Pre-initialize drive token client silently
    const waitForGoogle = (tries = 20) => {
        if (window.google?.accounts?.oauth2) {
            driveState.tokenClient = initDriveTokenClient();
            return;
        }
        if (tries > 0) setTimeout(() => waitForGoogle(tries - 1), 300);
    };
    waitForGoogle();
}

void initLibrary();
