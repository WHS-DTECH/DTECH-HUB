(() => {
    "use strict";

    const AUTH_STORAGE_KEY = "hub_google_auth_v1";
    const RESPONSE_SAVE_DEBOUNCE_MS = 800;

    const state = {
        email: "",
        kitId: "",
        content: null,
        responses: {},
        signInWatcherId: 0,
        saveTimerId: 0
    };

    function normalizeEmail(value) {
        return String(value || "").trim().toLowerCase();
    }

    function getKitIdFromUrl() {
        const params = new URLSearchParams(window.location.search || "");
        return String(params.get("kit") || "kit-login").trim();
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

    function getSignedInEmail() {
        const raw = getStoredAuthRaw();
        if (!raw) return "";
        try {
            const parsed = JSON.parse(raw);
            if (!parsed?.expiresAt || Number(parsed.expiresAt) <= Date.now()) {
                return "";
            }
            return normalizeEmail(parsed?.profile?.email || "");
        } catch (_error) {
            return "";
        }
    }

    function withAuthHeaders(headers = {}) {
        return state.email ? { ...headers, "x-user-email": state.email } : headers;
    }

    function showStatusMessage(message, isError = false) {
        const node = document.getElementById("worksheet-status-message");
        if (!node) return;
        if (!message) {
            node.hidden = true;
            node.textContent = "";
            node.classList.remove("is-error");
            return;
        }
        node.hidden = false;
        node.textContent = message;
        node.classList.toggle("is-error", Boolean(isError));
    }

    async function loadJson(url, options = {}) {
        const response = await fetch(url, options);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload?.error || `Request failed (${response.status})`);
        }
        return payload;
    }

    function fetchKitContent(kitId) {
        return loadJson(`/api/practical-skills/kit-content/${encodeURIComponent(kitId)}`);
    }

    function fetchKitProgress(kitId) {
        return loadJson(`/api/practical-skills/progress/${encodeURIComponent(kitId)}`, { headers: withAuthHeaders() });
    }

    function completeKit(kitId) {
        return loadJson(`/api/practical-skills/progress/${encodeURIComponent(kitId)}/complete`, {
            method: "POST",
            headers: withAuthHeaders()
        });
    }

    function resetKit(kitId) {
        return loadJson(`/api/practical-skills/progress/${encodeURIComponent(kitId)}/reset`, {
            method: "POST",
            headers: withAuthHeaders()
        });
    }

    function saveResponses(kitId, responses) {
        return loadJson(`/api/practical-skills/progress/${encodeURIComponent(kitId)}/responses`, {
            method: "POST",
            headers: withAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ responses })
        });
    }

    function queueResponseSave() {
        if (!state.email) return;
        window.clearTimeout(state.saveTimerId);
        state.saveTimerId = window.setTimeout(() => {
            saveResponses(state.kitId, state.responses).catch(() => {
                showStatusMessage("Could not save your answers. Check your connection and try again.", true);
            });
        }, RESPONSE_SAVE_DEBOUNCE_MS);
    }

    function updateCompleteBar(kitSnapshot) {
        const bar = document.getElementById("worksheet-complete-bar");
        const pill = document.getElementById("worksheet-status-pill");
        const completeBtn = document.getElementById("worksheet-complete-btn");
        const resetBtn = document.getElementById("worksheet-reset-btn");
        if (!bar || !pill || !completeBtn || !resetBtn) return;

        if (!state.email) {
            bar.hidden = true;
            return;
        }

        bar.hidden = false;
        const isComplete = Boolean(kitSnapshot?.isComplete);
        pill.textContent = isComplete ? "Completed" : "Not Started";
        pill.classList.toggle("is-complete", isComplete);
        completeBtn.disabled = isComplete;
    }

    function renderPage() {
        const host = document.getElementById("worksheet-host");
        if (!host || !state.content) return;

        window.KitWorksheetRender.renderWorksheet(host, state.content, {
            responses: state.responses,
            readOnly: !state.email,
            onResponseChange: (questionId, value) => {
                state.responses[questionId] = value;
                queueResponseSave();
            }
        });

        showStatusMessage(
            state.email ? "" : "Sign in with your school Google account (top right) to save your answers and mark this kit complete."
        );
    }

    // Sign-in happens asynchronously via Google Identity Services after this script runs, so
    // poll briefly for a session rather than requiring a manual page refresh.
    function startSignInWatcher() {
        if (state.signInWatcherId || state.email) return;
        let attemptsLeft = 30;
        state.signInWatcherId = window.setInterval(() => {
            attemptsLeft -= 1;
            const email = getSignedInEmail();
            if (email) {
                window.clearInterval(state.signInWatcherId);
                state.signInWatcherId = 0;
                void init();
                return;
            }
            if (attemptsLeft <= 0) {
                window.clearInterval(state.signInWatcherId);
                state.signInWatcherId = 0;
            }
        }, 1000);
    }

    function wireActionButtons() {
        const completeBtn = document.getElementById("worksheet-complete-btn");
        const resetBtn = document.getElementById("worksheet-reset-btn");

        completeBtn?.addEventListener("click", async () => {
            completeBtn.disabled = true;
            try {
                const snapshot = await completeKit(state.kitId);
                const kitEntry = (snapshot.kits || []).find((entry) => entry.id === state.kitId) || null;
                updateCompleteBar(kitEntry);
                showStatusMessage("Kit marked complete. Great work!");
            } catch (error) {
                completeBtn.disabled = false;
                showStatusMessage(error?.message || "Could not mark this kit complete.", true);
            }
        });

        resetBtn?.addEventListener("click", async () => {
            resetBtn.disabled = true;
            try {
                const snapshot = await resetKit(state.kitId);
                const kitEntry = (snapshot.kits || []).find((entry) => entry.id === state.kitId) || null;
                updateCompleteBar(kitEntry);
                showStatusMessage("Kit progress reset.");
            } catch (error) {
                showStatusMessage(error?.message || "Could not reset this kit.", true);
            } finally {
                resetBtn.disabled = false;
            }
        });
    }

    async function init() {
        state.kitId = getKitIdFromUrl();
        state.email = getSignedInEmail();

        try {
            const contentPayload = await fetchKitContent(state.kitId);
            state.content = contentPayload?.content || null;
        } catch (error) {
            showStatusMessage(error?.message || "Could not load this kit.", true);
            return;
        }

        if (!state.email) {
            renderPage();
            updateCompleteBar(null);
            startSignInWatcher();
            return;
        }

        try {
            const progressPayload = await fetchKitProgress(state.kitId);
            state.responses = progressPayload?.responses || {};
            renderPage();
            updateCompleteBar(progressPayload?.kit);
        } catch (error) {
            renderPage();
            showStatusMessage(error?.message || "Could not load your saved progress.", true);
        }

        wireActionButtons();
    }

    init();
})();
