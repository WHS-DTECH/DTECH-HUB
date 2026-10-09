(() => {
    "use strict";

    const AUTH_STORAGE_KEY = "hub_google_auth_v1";
    const RESPONSE_SAVE_DEBOUNCE_MS = 800;

    const state = {
        email: "",
        kitId: "",
        content: null,
        responses: {},
        completedActivities: {},
        progressLoaded: false,
        progressWritePromise: Promise.resolve(),
        actionsWired: false,
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

    function getActivityIndexFromUrl() {
        const value = new URLSearchParams(window.location.search || "").get("activity");
        if (value === null || !/^\d+$/.test(value)) return null;
        return Number.parseInt(value, 10);
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
        const next = state.email ? { ...headers, "x-user-email": state.email } : { ...headers };
        const raw = getStoredAuthRaw();
        if (raw) {
            const auth = JSON.parse(raw);
            if (auth.idToken) next.Authorization = `Bearer ${auth.idToken}`;
        }
        return next;
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

    function queueProgressWrite(write) {
        state.progressWritePromise = state.progressWritePromise.then(write, write);
        return state.progressWritePromise;
    }

    function getCurrentActivityIndex() {
        const index = getActivityIndexFromUrl();
        return index !== null && state.content?.worksheets?.[index] ? index : null;
    }

    function updateActivityCompleteBar() {
        const bar = document.getElementById("worksheet-activity-complete-bar");
        const pill = document.getElementById("worksheet-activity-status-pill");
        const button = document.getElementById("worksheet-activity-complete-btn");
        const index = getCurrentActivityIndex();
        bar.hidden = !state.email || index === null;
        const completed = Boolean(state.completedActivities[index]);
        const selfMarking = Boolean(state.content?.activities?.[index]?.assessment || state.content?.activities?.[index]?.identityLessonVersion);
        pill.textContent = completed ? "Completed" : "Not Completed";
        pill.classList.toggle("is-complete", completed);
        if (completed) {
            pill.setAttribute("href", `./kit-worksheet.html?kit=${encodeURIComponent(state.kitId)}`);
            pill.setAttribute("aria-label", "Completed - return to kit activity menu");
            pill.setAttribute("title", "Return to kit activity menu");
        } else {
            pill.removeAttribute("href");
            pill.removeAttribute("aria-label");
            pill.removeAttribute("title");
        }
        button.textContent = completed ? "Undo Completion" : "Mark Activity Complete";
        button.disabled = !state.progressLoaded;
        button.hidden = selfMarking && !completed;
    }

    function queueResponseSave() {
        if (!state.email) return;
        window.clearTimeout(state.saveTimerId);
        state.saveTimerId = window.setTimeout(() => {
            queueProgressWrite(() => saveResponses(state.kitId, state.responses)).catch(() => {
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

        bar.hidden = getCurrentActivityIndex() !== null;
        const isComplete = Boolean(kitSnapshot?.isComplete);
        pill.textContent = isComplete ? "Completed" : "Not Started";
        pill.classList.toggle("is-complete", isComplete);
        completeBtn.disabled = isComplete;
    }

    function renderPage() {
        const host = document.getElementById("worksheet-host");
        if (!host || !state.content) return;

        const activityIndex = getActivityIndexFromUrl();
        const worksheets = Array.isArray(state.content.worksheets) ? state.content.worksheets : [];
        const verification = document.getElementById("worksheet-google-verification");
        if (verification) {
            host.after(verification);
            verification.hidden = !state.content.activities?.[activityIndex]?.identityLessonVersion;
        }
        if (worksheets.length && (activityIndex === null || !worksheets[activityIndex])) {
            window.KitWorksheetRender.renderKitOverview(host, state.content, {
                kitId: state.kitId,
                completedActivities: state.completedActivities
            });
        } else {
            const worksheet = activityIndex === null ? null : worksheets[activityIndex];
            const activity = activityIndex === null ? null : state.content.activities?.[activityIndex];
            const isActivity = Boolean(worksheet);
            const questions = isActivity
                ? (Array.isArray(activity?.questions)
                    ? activity.questions.map((question) => activityIndex === 0
                        ? question
                        : { ...question, id: `${activityIndex}-${question.id}` })
                    : activityIndex === 0 ? state.content.questions || [] : [])
                : state.content.questions || [];
            const images = isActivity
                ? activity?.images || (activityIndex === 0 ? state.content.images || [] : [])
                : state.content.images || [];
            const activityContent = isActivity ? {
                ...state.content,
                bannerTitle: worksheet.activity || activity?.title || `Activity ${activityIndex + 1}`,
                bannerSubtitle: worksheet.establishes || activity?.establishes || "",
                questions,
                images,
                information: activity?.information,
                identityLessonVersion: activity?.identityLessonVersion,
                assessment: activity?.assessment
            } : state.content;

            window.KitWorksheetRender.renderWorksheet(host, activityContent, {
                responses: state.responses,
                readOnly: !state.email,
                backHref: isActivity ? `./kit-worksheet.html?kit=${encodeURIComponent(state.kitId)}` : "",
                eyebrow: isActivity ? state.content.bannerTitle : "",
                identityVerified: Boolean(JSON.parse(getStoredAuthRaw() || "{}").idToken),
                onIdentityCheck: async (answers) => {
                    if (!state.progressLoaded) throw new Error("Your progress has not loaded. Refresh the page and try again.");
                    return queueProgressWrite(async () => {
                        const payload = await loadJson(`/api/practical-skills/progress/${encodeURIComponent(state.kitId)}/activities/${activityIndex}/check`, {
                            method: "POST",
                            headers: withAuthHeaders({ "Content-Type": "application/json" }),
                            body: JSON.stringify({ answers })
                        });
                        Object.assign(state.responses, payload.answers);
                        state.completedActivities = payload.completedActivities;
                        updateActivityCompleteBar();
                        return payload;
                    });
                },
                assessmentAnswers: activity?.assessment
                    ? state.responses[`${activityIndex}-${activity.assessment.id}`] || {}
                    : {},
                onAssessmentCheck: async (answers) => {
                    if (!state.progressLoaded) throw new Error("Your progress has not loaded. Refresh the page and try again.");
                    window.clearTimeout(state.saveTimerId);
                    return queueProgressWrite(async () => {
                        await saveResponses(state.kitId, state.responses);
                        const payload = await loadJson(`/api/practical-skills/progress/${encodeURIComponent(state.kitId)}/activities/${activityIndex}/check`, {
                            method: "POST",
                            headers: withAuthHeaders({ "Content-Type": "application/json" }),
                            body: JSON.stringify({ answers })
                        });
                        state.responses[`${activityIndex}-${activity.assessment.id}`] = payload.answers;
                        state.completedActivities = payload.completedActivities;
                        updateActivityCompleteBar();
                        if (payload.passed) showStatusMessage("Password detective complete! Your activity tick has been saved.");
                        return payload;
                    });
                },
                onResponseChange: (questionId, value) => {
                    state.responses[questionId] = value;
                    queueResponseSave();
                }
            });
            if (verification && activityContent.identityLessonVersion) {
                host.querySelector("#identity-result").before(verification);
            }
        }

        updateActivityCompleteBar();
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
        if (state.actionsWired) return;
        state.actionsWired = true;
        const completeBtn = document.getElementById("worksheet-complete-btn");
        const resetBtn = document.getElementById("worksheet-reset-btn");
        const activityCompleteBtn = document.getElementById("worksheet-activity-complete-btn");

        activityCompleteBtn.addEventListener("click", async () => {
            const index = getCurrentActivityIndex();
            if (index === null || !state.progressLoaded) return;
            const completed = !state.completedActivities[index];
            activityCompleteBtn.disabled = true;
            try {
                window.clearTimeout(state.saveTimerId);
                await queueProgressWrite(async () => {
                    await saveResponses(state.kitId, state.responses);
                    const payload = await loadJson(`/api/practical-skills/progress/${encodeURIComponent(state.kitId)}/activities/${index}`, {
                        method: "PUT",
                        headers: withAuthHeaders({ "Content-Type": "application/json" }),
                        body: JSON.stringify({ completed })
                    });
                    state.completedActivities = payload.completedActivities;
                });
                showStatusMessage(completed ? "Activity completed! Your tick is saved. Return to All activities to see your progress." : "Activity completion removed.");
            } catch (error) {
                showStatusMessage(error?.message || "Could not save activity completion.", true);
            } finally {
                updateActivityCompleteBar();
            }
        });

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
                state.completedActivities = {};
                renderPage();
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

    async function init(identityDraft = {}) {
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
            state.responses = { ...progressPayload?.responses, ...identityDraft };
            state.completedActivities = progressPayload?.completedActivities || {};
            state.progressLoaded = true;
            renderPage();
            updateCompleteBar(progressPayload?.kit);
        } catch (error) {
            renderPage();
            showStatusMessage(error?.message || "Could not load your saved progress.", true);
        }

        wireActionButtons();
    }

    if (document.getElementById("hub-google-verify-button") && window.addEventListener) {
        let previousAuth = getStoredAuthRaw();
        window.addEventListener("hub-auth-state-changed", () => {
            const nextAuth = getStoredAuthRaw();
            if (nextAuth === previousAuth) return;
            previousAuth = nextAuth;
            const identityDraft = {};
            if (getSignedInEmail() === state.email && state.content?.activities?.[getCurrentActivityIndex()]?.identityLessonVersion) {
                document.querySelectorAll("#worksheet-host .worksheet-answer-input").forEach((input) => {
                    identityDraft[input.getAttribute("data-question-id")] = input.value;
                });
            }
            window.clearTimeout(state.saveTimerId);
            state.progressLoaded = false;
            state.responses = {};
            state.completedActivities = {};
            void init(identityDraft);
        });
    }

    init();
})();
