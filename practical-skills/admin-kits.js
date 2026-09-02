(() => {
    "use strict";

    const AUTH_STORAGE_KEY = "hub_google_auth_v1";

    // Hardcoded to match PRACTICAL_SKILLS_KIT_DEFINITIONS in server.js and kitDefinitions in checklist.js
    // until the kit catalog itself is server-driven.
    const KIT_CATALOG = [
        { id: "kit-login", title: "Login" },
        { id: "kit-google-search", title: "Google Search" },
        { id: "kit-minecraft", title: "Minecraft" }
    ];

    const state = {
        isAdmin: false,
        kitId: KIT_CATALOG[0].id,
        content: null,
        previewTimerId: 0
    };

    const kitSelect = document.querySelector("#kit-select");
    const statusHost = document.querySelector("#kit-builder-status");
    const nameInput = document.querySelector("#kit-name");
    const skillAreaInput = document.querySelector("#kit-skill-area");
    const kitStatusInput = document.querySelector("#kit-status");
    const yearLevelInput = document.querySelector("#kit-year-level");
    const bannerTitleInput = document.querySelector("#kit-banner-title");
    const bannerSubtitleInput = document.querySelector("#kit-banner-subtitle");
    const instructionsInput = document.querySelector("#kit-instructions");
    const teacherNotesInput = document.querySelector("#kit-teacher-notes");
    const whatStudentsWillLearnInput = document.querySelector("#kit-what-students-learn");
    const whyThisMattersInput = document.querySelector("#kit-why-this-matters");
    const keyVocabularyInput = document.querySelector("#kit-key-vocabulary");
    const evidenceRequiredInput = document.querySelector("#kit-evidence-required");
    const successCriteriaInput = document.querySelector("#kit-success-criteria");
    const extensionChallengeInput = document.querySelector("#kit-extension-challenge");
    const worksheetListHost = document.querySelector("#kit-worksheet-list");
    const iconInput = document.querySelector("#kit-icon");
    const themeColorInput = document.querySelector("#kit-theme-color");
    const accentColorInput = document.querySelector("#kit-accent-color");
    const addWorksheetBtn = document.querySelector("#kit-add-worksheet");
    const saveBtn = document.querySelector("#kit-save-content");
    const reloadBtn = document.querySelector("#kit-reload-content");
    const previewHost = document.querySelector("#kit-preview-host");

    function normalizeEmail(value) {
        return String(value || "").trim().toLowerCase();
    }

    function getStoredAuthRaw() {
        let localValue = null;
        let sessionValue = null;
        try {
            localValue = localStorage.getItem(AUTH_STORAGE_KEY);
        } catch (_error) {
            localValue = null;
        }
        try {
            sessionValue = sessionStorage.getItem(AUTH_STORAGE_KEY);
        } catch (_error) {
            sessionValue = null;
        }
        return localValue || sessionValue;
    }

    function getActiveHubEmail() {
        const raw = getStoredAuthRaw();
        if (!raw) return "";
        try {
            const parsed = JSON.parse(raw);
            return normalizeEmail(parsed?.profile?.email || "");
        } catch (_error) {
            return "";
        }
    }

    function getSignedInAccessToken() {
        const raw = getStoredAuthRaw();
        if (!raw) return "";
        try {
            const parsed = JSON.parse(raw);
            if (!parsed?.expiresAt || Number(parsed.expiresAt) <= Date.now()) return "";
            return String(parsed?.idToken || parsed?.accessToken || "").trim();
        } catch (_error) {
            return "";
        }
    }

    function withAdminAuthHeaders(headers = {}) {
        const email = getActiveHubEmail();
        if (!email) return headers;
        const nextHeaders = { ...headers, "x-user-email": email };
        const accessToken = getSignedInAccessToken();
        if (accessToken && accessToken.startsWith("eyJ") && accessToken.split(".").length === 3) {
            nextHeaders.Authorization = `Bearer ${accessToken}`;
        }
        return nextHeaders;
    }

    function setStatus(message, isError = false) {
        if (!statusHost) return;
        if (!message) {
            statusHost.hidden = true;
            statusHost.textContent = "";
            return;
        }
        statusHost.hidden = false;
        statusHost.textContent = message;
        statusHost.classList.toggle("is-error", isError);
        statusHost.classList.toggle("is-success", !isError);
    }

    async function verifyAdminAccess() {
        const email = getActiveHubEmail();
        if (!email) {
            setStatus("Sign in with your school account first.", true);
            return false;
        }

        try {
            const response = await fetch(`/api/auth/user-access?email=${encodeURIComponent(email)}`, {
                headers: withAdminAuthHeaders()
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || !payload?.can_admin) {
                setStatus("Admin access is required for this page.", true);
                return false;
            }
            return true;
        } catch (_error) {
            setStatus("Could not verify admin access.", true);
            return false;
        }
    }

    async function loadJson(url, options = {}) {
        const response = await fetch(url, options);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload?.error || `Request failed (${response.status})`);
        }
        return payload;
    }

    function createDefaultWorksheet(number) {
        return { number, activity: "", establishes: "" };
    }

    function renderWorksheetList() {
        worksheetListHost.innerHTML = "";
        (state.content?.worksheets || []).forEach((worksheet, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td><input type="number" class="kit-worksheet-number" data-index="${index}" min="1" value="${Number(worksheet.number) || index + 1}"></td>
                <td><input type="text" class="kit-worksheet-activity" data-index="${index}" maxlength="120" value="${worksheet.activity || ""}"></td>
                <td><input type="text" class="kit-worksheet-establishes" data-index="${index}" maxlength="240" value="${worksheet.establishes || ""}"></td>
                <td><a class="button button-primary" href="/practical-skills/admin-kit-activity.html?kit=${encodeURIComponent(state.kitId)}&activity=${index}">Activity Details</a></td>
                <td><button type="button" class="button button-secondary kit-remove-worksheet" data-index="${index}">Remove</button></td>
            `;
            worksheetListHost.appendChild(row);
        });
    }

    function readFormIntoContent() {
        const worksheets = Array.from(worksheetListHost.querySelectorAll("tr")).map((row, index) => ({
            number: Math.max(1, Number.parseInt(row.querySelector(".kit-worksheet-number")?.value, 10) || index + 1),
            activity: row.querySelector(".kit-worksheet-activity")?.value || "",
            establishes: row.querySelector(".kit-worksheet-establishes")?.value || ""
        }));

        return {
            kitId: state.kitId,
            identity: {
                name: nameInput.value,
                skillArea: skillAreaInput.value,
                status: kitStatusInput.value,
                yearLevel: yearLevelInput.value
            },
            theme: {
                color: themeColorInput.value,
                accent: accentColorInput.value,
                icon: iconInput.value
            },
            bannerTitle: bannerTitleInput.value,
            bannerSubtitle: bannerSubtitleInput.value,
            instructions: instructionsInput.value,
            teacherNotes: teacherNotesInput.value,
            learning: {
                whatStudentsWillLearn: whatStudentsWillLearnInput.value,
                whyThisMatters: whyThisMattersInput.value,
                keyVocabulary: keyVocabularyInput.value
            },
            worksheets,
            activities: state.content?.activities || [],
            questions: state.content?.questions || [],
            images: state.content?.images || [],
            completion: {
                evidenceRequired: evidenceRequiredInput.value,
                successCriteria: successCriteriaInput.value,
                extensionChallenge: extensionChallengeInput.value
            }
        };
    }

    function renderForm() {
        const content = state.content || {};
        nameInput.value = content.identity?.name || content.bannerTitle || "";
        skillAreaInput.value = content.identity?.skillArea || "";
        kitStatusInput.value = content.identity?.status || "active";
        yearLevelInput.value = content.identity?.yearLevel || "";
        bannerTitleInput.value = content.bannerTitle || "";
        bannerSubtitleInput.value = content.bannerSubtitle || "";
        instructionsInput.value = content.instructions || "";
        teacherNotesInput.value = content.teacherNotes || "";
        whatStudentsWillLearnInput.value = content.learning?.whatStudentsWillLearn || "";
        whyThisMattersInput.value = content.learning?.whyThisMatters || "";
        keyVocabularyInput.value = content.learning?.keyVocabulary || "";
        evidenceRequiredInput.value = content.completion?.evidenceRequired || "";
        successCriteriaInput.value = content.completion?.successCriteria || "";
        extensionChallengeInput.value = content.completion?.extensionChallenge || "";
        iconInput.value = content.theme?.icon || "";
        themeColorInput.value = content.theme?.color || "#2f8f61";
        accentColorInput.value = content.theme?.accent || "#ffd166";
        renderWorksheetList();
        queuePreviewUpdate();
    }

    function queuePreviewUpdate() {
        window.clearTimeout(state.previewTimerId);
        state.previewTimerId = window.setTimeout(() => {
            const draft = readFormIntoContent();
            window.KitWorksheetRender?.renderWorksheet(previewHost, draft, { readOnly: true });
        }, 200);
    }

    async function loadKitContent(kitId) {
        setStatus("Loading kit content\u2026");
        try {
            const payload = await loadJson(`/api/admin/practical-skills/kit-content/${encodeURIComponent(kitId)}`, {
                headers: withAdminAuthHeaders()
            });
            state.content = payload?.content || { questions: [], images: [], theme: {} };
            renderForm();
            setStatus("");
        } catch (error) {
            setStatus(error?.message || "Could not load kit content.", true);
        }
    }

    async function saveKitContent() {
        const draft = readFormIntoContent();
        saveBtn.disabled = true;
        setStatus("Saving\u2026");
        try {
            const payload = await loadJson(`/api/admin/practical-skills/kit-content/${encodeURIComponent(state.kitId)}`, {
                method: "PUT",
                headers: withAdminAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ content: draft })
            });
            state.content = payload?.content || draft;
            renderForm();
            setStatus("Kit content saved.");
        } catch (error) {
            setStatus(error?.message || "Could not save kit content.", true);
        } finally {
            saveBtn.disabled = false;
        }
    }

    function wireFormEvents() {
        [nameInput, skillAreaInput, kitStatusInput, yearLevelInput, bannerTitleInput, bannerSubtitleInput, instructionsInput, teacherNotesInput, whatStudentsWillLearnInput, whyThisMattersInput, keyVocabularyInput, evidenceRequiredInput, successCriteriaInput, extensionChallengeInput, iconInput, themeColorInput, accentColorInput].forEach((input) => {
            input.addEventListener("input", queuePreviewUpdate);
        });

        worksheetListHost.addEventListener("click", (event) => {
            const button = event.target.closest(".kit-remove-worksheet");
            if (!button) return;
            const worksheets = readFormIntoContent().worksheets;
            worksheets.splice(Number(button.getAttribute("data-index")), 1);
            state.content.worksheets = worksheets;
            renderWorksheetList();
        });

        addWorksheetBtn.addEventListener("click", () => {
            state.content = state.content || {};
            state.content.worksheets = readFormIntoContent().worksheets;
            state.content.worksheets.push(createDefaultWorksheet(state.content.worksheets.length + 1));
            renderWorksheetList();
        });

        saveBtn.addEventListener("click", () => {
            void saveKitContent();
        });

        reloadBtn.addEventListener("click", () => {
            void loadKitContent(state.kitId);
        });

        kitSelect.addEventListener("change", () => {
            state.kitId = kitSelect.value;
            void loadKitContent(state.kitId);
        });
    }

    function populateKitSelect() {
        kitSelect.innerHTML = KIT_CATALOG.map((kit) => `<option value="${kit.id}">${kit.title}</option>`).join("");
        kitSelect.value = state.kitId;
    }

    async function init() {
        const allowed = await verifyAdminAccess();
        if (!allowed) return;

        populateKitSelect();
        wireFormEvents();
        await loadKitContent(state.kitId);
    }

    void init();
})();
