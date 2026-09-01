(() => {
    "use strict";

    const AUTH_STORAGE_KEY = "hub_google_auth_v1";
    const STATUS_ID = "ps-status";

    // Titles/descriptions only; points/timeframe scoring and badges are computed server-side from saved progress
    // (see PRACTICAL_SKILLS_KIT_DEFINITIONS in server.js) so completion can't be spoofed from this page.
    const kitDefinitions = [
        {
            id: "kit-login",
            title: "Login",
            description: "Sign in correctly, open your workspace, and confirm you can access required learning tools.",
            timeframeHours: 24
        },
        {
            id: "kit-google-search",
            title: "Google Search",
            description: "Use advanced search techniques to find reliable answers and cite one quality source.",
            timeframeHours: 24
        },
        {
            id: "kit-minecraft",
            title: "Minecraft",
            description: "Complete the Minecraft practical task and demonstrate the required build or design outcome.",
            timeframeHours: 24
        }
    ];

    const state = {
        email: "",
        snapshot: null,
        signInWatcherId: 0
    };

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

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function showStatus(message, isError = false) {
        const status = document.getElementById(STATUS_ID);
        if (!status) return;
        if (!message) {
            status.hidden = true;
            status.textContent = "";
            status.classList.remove("is-error", "is-success");
            return;
        }

        status.hidden = false;
        status.textContent = message;
        status.classList.remove("is-error", "is-success");
        status.classList.add(isError ? "is-error" : "is-success");
    }

    async function loadJson(url, options = {}) {
        const response = await fetch(url, options);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload?.error || `Request failed (${response.status})`);
        }
        return payload;
    }

    function fetchSnapshot() {
        return loadJson("/api/practical-skills/my-progress", { headers: withAuthHeaders() });
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

    function renderBadges(badges) {
        const host = document.getElementById("ps-badge-list");
        if (!host) return;

        const rows = Array.isArray(badges) ? badges : [];
        if (!rows.length) {
            host.innerHTML = `<p class="ps-badge-empty">No badges earned yet \u2014 complete a kit to get started.</p>`;
            return;
        }

        host.innerHTML = rows.map((badge) => `
            <article class="ps-badge" title="${escapeHtml(badge.description || "")}">
                <span class="ps-badge-icon" aria-hidden="true">${escapeHtml(badge.icon || "\u2b50")}</span>
                <span class="ps-badge-title">${escapeHtml(badge.title || "Badge")}</span>
            </article>
        `).join("");
    }

    function render() {
        const list = document.getElementById("ps-kit-list");
        if (!list) return;

        if (!state.email) {
            list.innerHTML = `<p class="ps-signin-note">Sign in with your school Google account (top right) to track kit progress and earn badges.</p>`;
            renderBadges([]);
            return;
        }

        const snapshot = state.snapshot;
        if (!snapshot) {
            list.innerHTML = `<p class="ps-signin-note">Loading your progress\u2026</p>`;
            return;
        }

        const kitsById = new Map((snapshot.kits || []).map((kit) => [kit.id, kit]));
        list.innerHTML = "";

        kitDefinitions.forEach((kit) => {
            const progress = kitsById.get(kit.id) || { isComplete: false, onTime: false, score: 0 };

            const item = document.createElement("article");
            item.className = "ps-kit-item";

            const statusLabel = progress.isComplete ? "Completed" : "Not Started";
            const timeLabel = progress.isComplete
                ? (progress.onTime ? "On-time bonus applied" : "Completed outside target window")
                : `Target window: ${kit.timeframeHours}h`;

            item.innerHTML = `
                <h3>${escapeHtml(kit.title)}</h3>
                <p>${escapeHtml(kit.description)}</p>
                <div class="ps-kit-meta">
                    <span class="ps-kit-pill">${statusLabel}</span>
                    <span class="ps-kit-pill">Points: ${Number(progress.score || 0)}</span>
                    <span class="ps-kit-pill">${timeLabel}</span>
                </div>
                <div class="ps-kit-actions">
                    <button type="button" class="button button-primary ps-complete-btn" data-kit="${kit.id}" ${progress.isComplete ? "disabled" : ""}>Mark Complete</button>
                    <button type="button" class="button button-secondary ps-reset-btn" data-kit="${kit.id}">Reset</button>
                </div>
            `;
            list.appendChild(item);
        });

        const pointsNode = document.getElementById("ps-total-points");
        const completedNode = document.getElementById("ps-completed-kits");
        const tierNode = document.getElementById("ps-current-tier");

        if (pointsNode) pointsNode.textContent = String(snapshot.totalPoints || 0);
        if (completedNode) completedNode.textContent = `${snapshot.completedCount || 0} / ${snapshot.totalKits || kitDefinitions.length}`;
        if (tierNode) tierNode.textContent = snapshot.tier || "Starter";

        renderBadges(snapshot.badges);

        list.querySelectorAll(".ps-complete-btn").forEach((button) => {
            button.addEventListener("click", async () => {
                const kitId = String(button.getAttribute("data-kit") || "");
                button.disabled = true;
                try {
                    state.snapshot = await completeKit(kitId);
                    render();
                    showStatus("Kit marked complete.");
                } catch (error) {
                    button.disabled = false;
                    showStatus(error?.message || "Could not save progress.", true);
                }
            });
        });

        list.querySelectorAll(".ps-reset-btn").forEach((button) => {
            button.addEventListener("click", async () => {
                const kitId = String(button.getAttribute("data-kit") || "");
                button.disabled = true;
                try {
                    state.snapshot = await resetKit(kitId);
                    render();
                    showStatus("Kit progress reset.");
                } catch (error) {
                    showStatus(error?.message || "Could not reset progress.", true);
                } finally {
                    button.disabled = false;
                }
            });
        });
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

    async function init() {
        state.email = getSignedInEmail();
        if (!state.email) {
            render();
            startSignInWatcher();
            return;
        }

        render();
        try {
            state.snapshot = await fetchSnapshot();
            render();
        } catch (error) {
            showStatus(error?.message || "Could not load Practical Skills progress.", true);
        }
    }

    init();
})();

