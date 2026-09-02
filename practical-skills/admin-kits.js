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
    const bannerTitleInput = document.querySelector("#kit-banner-title");
    const bannerSubtitleInput = document.querySelector("#kit-banner-subtitle");
    const instructionsInput = document.querySelector("#kit-instructions");
    const teacherNotesInput = document.querySelector("#kit-teacher-notes");
    const iconInput = document.querySelector("#kit-icon");
    const themeColorInput = document.querySelector("#kit-theme-color");
    const accentColorInput = document.querySelector("#kit-accent-color");
    const questionListHost = document.querySelector("#kit-question-list");
    const imageListHost = document.querySelector("#kit-image-list");
    const addQuestionBtn = document.querySelector("#kit-add-question");
    const addImageBtn = document.querySelector("#kit-add-image");
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

    function createDefaultQuestion() {
        return { id: `q${Date.now()}`, type: "short-answer", prompt: "", lines: 1, options: [] };
    }

    function createDefaultImage() {
        return { url: "", alt: "", caption: "" };
    }

    function renderQuestionCard(question, index) {
        const card = document.createElement("div");
        card.className = "kit-question-card";
        card.innerHTML = `
            <div class="kit-question-card-head">
                <span>Question ${index + 1}</span>
                <button type="button" class="button button-secondary kit-remove-question" data-index="${index}">Remove</button>
            </div>
            <div class="kit-builder-field">
                <label>Type</label>
                <select class="kit-question-type" data-index="${index}">
                    <option value="short-answer" ${question.type === "short-answer" ? "selected" : ""}>Short Answer</option>
                    <option value="checklist" ${question.type === "checklist" ? "selected" : ""}>Checklist</option>
                    <option value="multiple-choice" ${question.type === "multiple-choice" ? "selected" : ""}>Multiple Choice</option>
                </select>
            </div>
            <div class="kit-builder-field">
                <label>Prompt</label>
                <textarea class="kit-question-prompt" data-index="${index}" rows="2">${question.prompt || ""}</textarea>
            </div>
            ${question.type === "short-answer" ? `
                <div class="kit-builder-field">
                    <label>Answer lines</label>
                    <input type="text" class="kit-question-lines" data-index="${index}" value="${Number(question.lines) || 1}" inputmode="numeric">
                </div>
            ` : `
                <div class="kit-builder-field">
                    <label>Options (one per line)</label>
                    <textarea class="kit-question-options" data-index="${index}" rows="3">${(question.options || []).join("\n")}</textarea>
                </div>
            `}
        `;
        return card;
    }

    function renderImageCard(image, index) {
        const card = document.createElement("div");
        card.className = "kit-image-card";
        card.innerHTML = `
            <div class="kit-image-card-head">
                <span>Image ${index + 1}</span>
                <button type="button" class="button button-secondary kit-remove-image" data-index="${index}">Remove</button>
            </div>
            <div class="kit-builder-field">
                <label>Image URL</label>
                <input type="text" class="kit-image-url" data-index="${index}" value="${image.url || ""}" placeholder="https://...">
            </div>
            <div class="kit-builder-field">
                <label>Alt text</label>
                <input type="text" class="kit-image-alt" data-index="${index}" value="${image.alt || ""}">
            </div>
            <div class="kit-builder-field">
                <label>Caption</label>
                <input type="text" class="kit-image-caption" data-index="${index}" value="${image.caption || ""}">
            </div>
        `;
        return card;
    }

    function readFormIntoContent() {
        const questions = Array.from(questionListHost.querySelectorAll(".kit-question-card")).map((card, index) => {
            const type = card.querySelector(".kit-question-type")?.value || "short-answer";
            const prompt = card.querySelector(".kit-question-prompt")?.value || "";
            const existing = state.content?.questions?.[index] || {};
            if (type === "short-answer") {
                const lines = Math.max(1, Number.parseInt(card.querySelector(".kit-question-lines")?.value, 10) || 1);
                return { id: existing.id || `q${index}`, type, prompt, lines };
            }
            const options = String(card.querySelector(".kit-question-options")?.value || "")
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean);
            return { id: existing.id || `q${index}`, type, prompt, options };
        });

        const images = Array.from(imageListHost.querySelectorAll(".kit-image-card")).map((card) => ({
            url: card.querySelector(".kit-image-url")?.value || "",
            alt: card.querySelector(".kit-image-alt")?.value || "",
            caption: card.querySelector(".kit-image-caption")?.value || ""
        }));

        return {
            kitId: state.kitId,
            theme: {
                color: themeColorInput.value,
                accent: accentColorInput.value,
                icon: iconInput.value
            },
            bannerTitle: bannerTitleInput.value,
            bannerSubtitle: bannerSubtitleInput.value,
            instructions: instructionsInput.value,
            teacherNotes: teacherNotesInput.value,
            questions,
            images
        };
    }

    function renderQuestionList() {
        questionListHost.innerHTML = "";
        (state.content?.questions || []).forEach((question, index) => {
            questionListHost.appendChild(renderQuestionCard(question, index));
        });
    }

    function renderImageList() {
        imageListHost.innerHTML = "";
        (state.content?.images || []).forEach((image, index) => {
            imageListHost.appendChild(renderImageCard(image, index));
        });
    }

    function renderForm() {
        const content = state.content || {};
        bannerTitleInput.value = content.bannerTitle || "";
        bannerSubtitleInput.value = content.bannerSubtitle || "";
        instructionsInput.value = content.instructions || "";
        teacherNotesInput.value = content.teacherNotes || "";
        iconInput.value = content.theme?.icon || "";
        themeColorInput.value = content.theme?.color || "#2f8f61";
        accentColorInput.value = content.theme?.accent || "#ffd166";
        renderQuestionList();
        renderImageList();
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
        [bannerTitleInput, bannerSubtitleInput, instructionsInput, teacherNotesInput, iconInput, themeColorInput, accentColorInput].forEach((input) => {
            input.addEventListener("input", queuePreviewUpdate);
        });

        questionListHost.addEventListener("input", queuePreviewUpdate);
        questionListHost.addEventListener("change", (event) => {
            if (event.target.classList.contains("kit-question-type")) {
                const index = Number(event.target.getAttribute("data-index"));
                const questions = readFormIntoContent().questions;
                const current = questions[index] || createDefaultQuestion();
                current.type = event.target.value;
                if (current.type === "short-answer" && !current.lines) current.lines = 1;
                if (current.type !== "short-answer" && !current.options) current.options = [];
                state.content.questions = questions;
                state.content.questions[index] = current;
                renderQuestionList();
                queuePreviewUpdate();
                return;
            }
            queuePreviewUpdate();
        });

        questionListHost.addEventListener("click", (event) => {
            const button = event.target.closest(".kit-remove-question");
            if (!button) return;
            const index = Number(button.getAttribute("data-index"));
            const questions = readFormIntoContent().questions;
            questions.splice(index, 1);
            state.content.questions = questions;
            renderQuestionList();
            queuePreviewUpdate();
        });

        imageListHost.addEventListener("input", queuePreviewUpdate);
        imageListHost.addEventListener("click", (event) => {
            const button = event.target.closest(".kit-remove-image");
            if (!button) return;
            const index = Number(button.getAttribute("data-index"));
            const images = readFormIntoContent().images;
            images.splice(index, 1);
            state.content.images = images;
            renderImageList();
            queuePreviewUpdate();
        });

        addQuestionBtn.addEventListener("click", () => {
            state.content = state.content || {};
            state.content.questions = readFormIntoContent().questions;
            state.content.questions.push(createDefaultQuestion());
            renderQuestionList();
            queuePreviewUpdate();
        });

        addImageBtn.addEventListener("click", () => {
            state.content = state.content || {};
            state.content.images = readFormIntoContent().images;
            state.content.images.push(createDefaultImage());
            renderImageList();
            queuePreviewUpdate();
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
