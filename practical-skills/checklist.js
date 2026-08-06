(() => {
    "use strict";

    const STORAGE_KEY = "practical_skills_checklist_v1";
    const STATUS_ID = "ps-status";

    const kitDefinitions = [
        {
            id: "kit-login",
            title: "Login",
            description: "Sign in correctly, open your workspace, and confirm you can access required learning tools.",
            points: 100,
            timeframeHours: 24
        },
        {
            id: "kit-google-search",
            title: "Google Search",
            description: "Use advanced search techniques to find reliable answers and cite one quality source.",
            points: 100,
            timeframeHours: 24
        }
    ];

    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch (_error) {
            return {};
        }
    }

    function saveState(state) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (_error) {
        }
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

    function resolveKitProgress(state, kit) {
        const progress = state[kit.id] || {};
        const startedAt = Number(progress.startedAt || Date.now());
        const completedAt = Number(progress.completedAt || 0);
        const isComplete = Boolean(progress.completed === true);

        const elapsedHours = (Date.now() - startedAt) / 36e5;
        const onTime = isComplete && elapsedHours <= kit.timeframeHours;
        const bonus = onTime ? 25 : 0;

        return {
            startedAt,
            completedAt,
            isComplete,
            onTime,
            score: isComplete ? kit.points + bonus : 0
        };
    }

    function getTier(points) {
        if (points >= 250) return "Gold";
        if (points >= 150) return "Silver";
        if (points > 0) return "Bronze";
        return "Starter";
    }

    function render() {
        const list = document.getElementById("ps-kit-list");
        if (!list) return;

        const state = loadState();
        list.innerHTML = "";

        let totalPoints = 0;
        let completedCount = 0;

        kitDefinitions.forEach((kit) => {
            const progress = resolveKitProgress(state, kit);
            totalPoints += progress.score;
            if (progress.isComplete) {
                completedCount += 1;
            }

            const item = document.createElement("article");
            item.className = "ps-kit-item";

            const statusLabel = progress.isComplete ? "Completed" : "Not Started";
            const timeLabel = progress.onTime ? "On-time bonus applied" : `Target window: ${kit.timeframeHours}h`;

            item.innerHTML = `
                <h3>${kit.title}</h3>
                <p>${kit.description}</p>
                <div class="ps-kit-meta">
                    <span class="ps-kit-pill">${statusLabel}</span>
                    <span class="ps-kit-pill">Points: ${progress.score}</span>
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

        if (pointsNode) pointsNode.textContent = String(totalPoints);
        if (completedNode) completedNode.textContent = `${completedCount} / ${kitDefinitions.length}`;
        if (tierNode) tierNode.textContent = getTier(totalPoints);

        list.querySelectorAll(".ps-complete-btn").forEach((button) => {
            button.addEventListener("click", () => {
                const kitId = String(button.getAttribute("data-kit") || "");
                const existing = state[kitId] || {};
                state[kitId] = {
                    startedAt: Number(existing.startedAt || Date.now()),
                    completed: true,
                    completedAt: Date.now()
                };
                saveState(state);
                render();
                showStatus("Kit marked complete.");
            });
        });

        list.querySelectorAll(".ps-reset-btn").forEach((button) => {
            button.addEventListener("click", () => {
                const kitId = String(button.getAttribute("data-kit") || "");
                state[kitId] = {
                    startedAt: Date.now(),
                    completed: false,
                    completedAt: 0
                };
                saveState(state);
                render();
                showStatus("Kit progress reset.");
            });
        });
    }

    function init() {
        const state = loadState();
        let changed = false;

        kitDefinitions.forEach((kit) => {
            if (!state[kit.id]) {
                state[kit.id] = {
                    startedAt: Date.now(),
                    completed: false,
                    completedAt: 0
                };
                changed = true;
            }
        });

        if (changed) {
            saveState(state);
        }

        render();
    }

    init();
})();
