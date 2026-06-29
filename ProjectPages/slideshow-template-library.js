const TEMPLATE_LIBRARY = [
    {
        id: "digital-outcome-description",
        title: "Digital Outcome Description",
        standardCodes: ["91897", "91907"],
        criteriaText: "Describe what the digital outcome is, who it is for, and what it must do.",
        summary: "Uses a two-column prompt-and-response slide structure for clear assessment evidence.",
        imageUrl: "https://placehold.co/540x760/e7dec0/1f3a56?text=Digital+Outcome+Description+Slide+Preview",
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

const DRIVE_SCOPES = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly";
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
    const canManage = Boolean(access?.can_teacher_view || access?.can_admin);
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

function requestDriveToken() {
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
        driveState.tokenClient.requestAccessToken({ prompt: "" });
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
    const item = TEMPLATE_LIBRARY.find((entry) => entry.id === templateId);
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

    const tokenResponse = await requestDriveToken();
    if (tokenResponse.error) {
        if (button) { button.disabled = false; button.textContent = "Use Template"; }
        alert("Drive access was not granted. Please sign in and try again.");
        return;
    }

    try {
        const response = await fetch("/api/student/drive-setup/copy-template", {
            method: "POST",
            headers: withLibraryAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ driveAccessToken: tokenResponse.access_token, templateTitle: item.title, templateFileId: fileId })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || `Error ${response.status}`);

        driveState.copyMap[templateId] = { fileUrl: payload.fileUrl, fileName: payload.fileName };
        updateCardAfterCopy(templateId, payload);
        window.open(payload.fileUrl, "_blank", "noopener");
    } catch (error) {
        if (button) { button.disabled = false; button.textContent = "Use Template"; }
        alert(`Could not copy template: ${error.message || "Unknown error"}`);
    }
}

function updateCardAfterCopy(templateId, copyResult) {
    const card = document.querySelector(`[data-template-id="${CSS.escape(templateId)}"]`);
    if (!card) return;

    const actionsArea = card.querySelector(".template-card-actions");
    if (!actionsArea) return;

    const existingLabel = copyResult.alreadyExists ? "Opened your existing copy." : "Saved to Process Assessment.";
    actionsArea.innerHTML = `
        <a class="template-card-open template-card-open-existing" href="${escapeHtml(copyResult.fileUrl)}" target="_blank" rel="noreferrer">Open Your Copy</a>
        <p class="template-card-copy-note">${escapeHtml(existingLabel)}</p>
    `;
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

    const actionHtml = !canUse
        ? `<button class="template-card-open" aria-disabled="true" disabled>${status === "live" ? "Template Link Needed" : "Template Coming Soon"}</button>`
        : existingCopy
            ? `<a class="template-card-open template-card-open-existing" href="${escapeHtml(existingCopy.fileUrl)}" target="_blank" rel="noreferrer">Open Your Copy</a><p class="template-card-copy-note">Saved to Process Assessment.</p>`
            : `<button class="template-card-open" type="button" data-use-template="${escapeHtml(item.id)}">Use Template</button>`;

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
    if (!Array.isArray(TEMPLATE_LIBRARY) || !TEMPLATE_LIBRARY.length) {
        host.innerHTML = '<p class="template-empty">No templates are listed yet.</p>';
        return;
    }
    host.innerHTML = TEMPLATE_LIBRARY.map((item) => renderTemplateCard(item)).join("");

    host.addEventListener("click", (event) => {
        const target = event.target.closest("[data-use-template]");
        if (!target) return;
        const templateId = target.getAttribute("data-use-template") || "";
        if (templateId) void handleUseTemplate(templateId);
    });
}

async function initLibrary() {
    const access = await loadLibraryAccess();
    applyLibraryRoleVisibility(access);

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
