const TASK_LIST_AUTH_KEY = "hub_google_auth_v1";

const DIGITAL_OUTCOME_DETAILS_TASKS = [
    "Description - Google Slides: Describe the Digital Outcome: What is it, who is it for, and what should it do?",
    "Identify the target audience or end user for this outcome.",
    "Explain how the outcome will be developed and what tools/technologies will be used.",
    "State how success will be measured or evaluated."
];

const EVIDENCE_STEPS_DEFAULTS = {
    "92005": [
        "Define what the digital outcome needs to do.",
        "Collect and review evidence of user or stakeholder needs.",
        "Build and test versions of the outcome.",
        "Record changes and justify decisions using evidence.",
        "Evaluate the final outcome against requirements."
    ],
    "91897": [
        "Achieved: Use appropriate project management tools and techniques to plan the development of a digital technologies outcome.",
        "Achieved: Decompose the outcome into smaller components.",
        "Achieved: List the key features or requirements the outcome must include.",
        "Achieved: Trial the components of the digital technologies outcome.",
        "Achieved: Test that the digital technologies outcome functions as intended.",
        "Achieved: Explain relevant implications.",
        "Merit: Effectively use project management and version control tools and techniques to manage development of a digital technologies outcome.",
        "Merit: Trial multiple components and/or techniques and select those that are most suitable.",
        "Merit: Use information from testing and trialling to improve the functionality of the digital technologies outcome.",
        "Merit: Address relevant implications.",
        "Excellence: Discuss how planning, testing, and trialling information assisted the development of a high-quality outcome."
    ],
    "91907": [
        "Establish the project purpose and design requirements.",
        "Develop and trial design options.",
        "Document implementation decisions and technical evidence.",
        "Test against requirements and refine.",
        "Summarize final evidence for achieved, merit, or excellence."
    ]
};

const taskListState = {
    allItems: [],
    selectedId: "",
    checklistState: {},
    checklistStandards: [],
    taskTopic: ""
};

function escapeTaskListHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function readTaskListAuth() {
    try {
        const raw = localStorage.getItem(TASK_LIST_AUTH_KEY) || sessionStorage.getItem(TASK_LIST_AUTH_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.expiresAt || Number(parsed.expiresAt) <= Date.now()) {
            return null;
        }
        return parsed;
    } catch (_error) {
        return null;
    }
}

function getTaskListEmail() {
    const auth = readTaskListAuth();
    return String(auth?.profile?.email || "").trim().toLowerCase();
}

function buildTaskListHeaders(headers = {}) {
    const email = getTaskListEmail();
    return {
        ...headers,
        ...(email ? { "x-user-email": email } : {})
    };
}

function buildCustomActivityLink(id, taskTopic = "") {
    const params = new URLSearchParams();
    params.set("id", String(id || "").trim());
    const safeTaskTopic = String(taskTopic || "").trim();
    if (safeTaskTopic) {
        params.set("taskTopic", safeTaskTopic);
    }
    return `/ProjectPages/custom-activity.html?${params.toString()}`;
}

function getTopicTypeLabel(detail) {
    const type = String(detail?.type || detail?.topicType || detail?.topic_type || "").trim();
    return type || "Not set";
}

function deriveTaskShortName(taskTopic) {
    const normalized = String(taskTopic || "").trim();
    if (!normalized) return "Task List";
    if (/client projects/i.test(normalized)) return "Client Projects";
    if (/project management/i.test(normalized)) return "Project Management";
    if (/digital outcome/i.test(normalized)) return "Digital Outcome";
    return normalized;
}

function getStepLevel(text) {
    const normalized = String(text || "").trim().toLowerCase();
    if (normalized.startsWith("achieved:")) return "Achieved";
    if (normalized.startsWith("merit:")) return "Merit";
    if (normalized.startsWith("excellence:")) return "Excellence";
    return "";
}

function stripStepLevel(text) {
    return String(text || "").replace(/^(Achieved|Merit|Excellence):\s*/i, "").trim();
}

function inferStudentSystemConnections(currentState) {
    let trelloConnected = false;
    let githubConnected = false;

    Object.values(currentState || {}).forEach((steps) => {
        (Array.isArray(steps) ? steps : []).forEach((step) => {
            const text = String(step?.text || "").trim();
            if (!text) return;

            const textLower = text.toLowerCase();
            if (text.startsWith("TRELLO_CARD_URL|")) {
                trelloConnected = true;
            }
            if (textLower.includes("trello.com/")) {
                trelloConnected = true;
            }
            if (/(github\.com|gist\.github\.com|raw\.githubusercontent\.com)/i.test(textLower)) {
                githubConnected = true;
            }
        });
    });

    return { trelloConnected, githubConnected };
}

async function loadJson(url, options = {}) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(payload?.error || `Request failed (${response.status})`);
        error.status = Number(response.status || 0);
        throw error;
    }
    return payload;
}

async function getSignedInEmail() {
    const auth = readTaskListAuth();
    return String(auth?.profile?.email || "").trim().toLowerCase();
}

async function fetchAllocations() {
    const email = await getSignedInEmail();
    if (!email) {
        return { assessment_tasks: [], projects: [] };
    }
    const payload = await loadJson("/api/my-allocations", { headers: buildTaskListHeaders({}) });
    return {
        assessment_tasks: Array.isArray(payload?.assessment_tasks) ? payload.assessment_tasks : [],
        projects: Array.isArray(payload?.projects) ? payload.projects : []
    };
}

async function fetchActivityDetail(id) {
    if (!id) return null;
    try {
        return await loadJson(`/api/activities/${encodeURIComponent(id)}`, { headers: buildTaskListHeaders({}) });
    } catch (_error) {
        return null;
    }
}

function normalizeEvidenceSteps(rows) {
    const source = Array.isArray(rows) ? rows : [];
    return source
        .map((row) => {
            const standard = String(row?.standard || "").trim();
            if (!standard) return null;

            const steps = Array.isArray(row?.steps)
                ? row.steps
                    .map((step) => ({
                        text: String(step?.text || "").trim(),
                        done: Boolean(step?.done)
                    }))
                    .filter((step) => step.text)
                : [];

            return { standard, steps };
        })
        .filter(Boolean);
}

function evidenceRowsToMap(rows) {
    const map = {};
    normalizeEvidenceSteps(rows).forEach((row) => {
        map[row.standard] = row.steps.map((step) => ({ text: step.text, done: Boolean(step.done) }));
    });
    return map;
}

function evidenceMapToRows(currentState, standards) {
    const source = Array.isArray(standards) ? standards : [];
    return source
        .map((standard) => ({
            standard,
            steps: Array.isArray(currentState?.[standard]) ? currentState[standard] : []
        }))
        .map((row) => ({
            standard: String(row.standard || "").trim(),
            steps: Array.isArray(row.steps)
                ? row.steps
                    .map((step) => ({
                        text: String(step?.text || "").trim(),
                        done: Boolean(step?.done)
                    }))
                    .filter((step) => step.text)
                : []
        }))
        .filter((row) => row.standard);
}

async function fetchMyEvidence(projectId) {
    if (!projectId) return [];
    const payload = await loadJson(`/api/activities/${encodeURIComponent(projectId)}/my-evidence`, { headers: buildTaskListHeaders({}) });
    return normalizeEvidenceSteps(payload?.evidence_steps);
}

async function saveMyEvidence(projectId, rows) {
    return loadJson(`/api/activities/${encodeURIComponent(projectId)}/my-evidence`, {
        method: "PATCH",
        headers: buildTaskListHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ evidence_steps: normalizeEvidenceSteps(rows) })
    });
}

function getQueryContext() {
    const params = new URLSearchParams(window.location.search || "");
    const id = String(params.get("id") || "").trim();
    const taskTopic = String(params.get("taskTopic") || "").trim();
    const taskShortName = String(params.get("taskShortName") || "").trim();
    return { id, taskTopic, taskShortName };
}

function setStatus(message, isError = false) {
    const status = document.querySelector("#task-list-status");
    if (!status) return;
    status.textContent = String(message || "");
    status.classList.toggle("is-error", Boolean(isError));
}

function renderHeader(summary) {
    const hero = document.querySelector("#task-list-hero");
    if (!hero) return;
    hero.innerHTML = `
        <div class="task-list-hero-copy">
            <p class="eyebrow">COMPUTER LAB</p>
            <h1>My Task List</h1>
            <p class="hero-text">Track the checklist for the current task while keeping all connected assessment and project evidence visible.</p>
        </div>
        <aside class="task-list-hero-stats">
            <div class="stat-card">
                <span class="stat-label">Linked items</span>
                <strong>${escapeTaskListHtml(String(summary.totalLinked || 0))}</strong>
                <span class="stat-subline">Assessments and projects</span>
            </div>
            <div class="stat-card">
                <span class="stat-label">Checklist items</span>
                <strong>${escapeTaskListHtml(String(summary.totalChecklist || 0))}</strong>
                <span class="stat-subline">current task</span>
            </div>
        </aside>
    `;
}

function renderAllocationLists(assessmentTasks, projects) {
    const renderList = (hostId, emptyId, items, label) => {
        const host = document.querySelector(hostId);
        const empty = document.querySelector(emptyId);
        if (!host || !empty) return;

        const rows = Array.isArray(items) ? items : [];
        if (!rows.length) {
            host.innerHTML = "";
            empty.hidden = false;
            return;
        }

        empty.hidden = true;
        host.innerHTML = rows.map((item) => {
            const href = buildCustomActivityLink(item.id);
            return `
                <li class="task-list-alloc-item">
                    <div>
                        <p class="task-list-alloc-name">${escapeTaskListHtml(String(item?.name || "Untitled"))}</p>
                        <p class="task-list-meta">${escapeTaskListHtml(label)} ID: ${escapeTaskListHtml(String(item?.id || ""))}${item?.topic_type ? ` • Topic Type: ${escapeTaskListHtml(item.topic_type)}` : ""}</p>
                    </div>
                    <a class="detail-action detail-action-secondary" href="${escapeTaskListHtml(href)}">Open Task</a>
                </li>
            `;
        }).join("");
    };

    renderList("#task-list-assessments", "#task-list-assessments-empty", assessmentTasks, "Assessment");
    renderList("#task-list-projects", "#task-list-projects-empty", projects, "Project");
}

function renderTaskPicker(allItems, selectedId) {
    const picker = document.querySelector("#task-list-picker");
    if (!picker) return;

    if (!allItems.length) {
        picker.innerHTML = '<option value="">No tasks available</option>';
        picker.disabled = true;
        return;
    }

    picker.disabled = false;
    picker.innerHTML = allItems.map((item) => {
        const kind = item.kind === "Project" ? "Project" : "Assessment";
        const selected = String(item.id) === String(selectedId) ? "selected" : "";
        return `<option value="${escapeTaskListHtml(String(item.id))}" ${selected}>${escapeTaskListHtml(String(item.name || "Untitled"))} (${escapeTaskListHtml(kind)})</option>`;
    }).join("");
}

function renderChecklistCards(detail, allItems) {
    const checklistHost = document.querySelector("#task-list-checklist");
    if (!checklistHost) return;

    const taskTitle = String(detail?.name || "Task List").trim();
    const taskTopic = taskListState.taskTopic || taskTitle;
    const topicType = getTopicTypeLabel(detail);

    const systemConnections = inferStudentSystemConnections(taskListState.checklistState);

    const renderRowsForStandard = (standard, rows) => {
        const safeRows = Array.isArray(rows) ? rows : [];

        if (String(standard) !== "91897") {
            return `
                <div class="task-list-step-list">
                    ${safeRows.map((step, index) => `
                        <div class="task-list-step-row">
                            <label class="task-list-step-check-wrap">
                                <input type="checkbox" ${Boolean(step?.done) ? "checked" : ""} data-step-check="${escapeTaskListHtml(standard)}:${index}">
                                <span class="task-list-step-text">${escapeTaskListHtml(String(step?.text || ""))}</span>
                            </label>
                            ${String(standard) === "digital-outcome" && index === 0 ? `
                                <div class="task-list-system-list">
                                    <p class="task-list-system-title">Connected Systems</p>
                                    <label class="task-list-system-item"><input type="checkbox" checked disabled> Description - Google Slides</label>
                                </div>
                            ` : ""}
                        </div>
                    `).join("")}
                </div>
            `;
        }

        const levels = ["Achieved", "Merit", "Excellence"];
        return levels.map((level) => {
            const levelRows = safeRows
                .map((step, index) => ({ ...step, _index: index }))
                .filter((step) => getStepLevel(step?.text) === level);

            return `
                <section class="task-list-level-group">
                    <h4>${escapeTaskListHtml(level)}</h4>
                    <div class="task-list-step-list">
                        ${levelRows.map((step) => `
                            <div class="task-list-step-row">
                                <label class="task-list-step-check-wrap">
                                    <input type="checkbox" ${Boolean(step?.done) ? "checked" : ""} data-step-check="${escapeTaskListHtml(standard)}:${step._index}">
                                    <span class="task-list-step-text">${escapeTaskListHtml(stripStepLevel(step?.text))}</span>
                                </label>
                                ${String(level) === "Achieved" && stripStepLevel(step?.text).toLowerCase().includes("project management") ? `
                                    <div class="task-list-system-list">
                                        <p class="task-list-system-title">Connected Systems</p>
                                        <label class="task-list-system-item"><input type="checkbox" disabled ${systemConnections.trelloConnected ? "checked" : ""}> Trello</label>
                                        <label class="task-list-system-item"><input type="checkbox" disabled ${systemConnections.githubConnected ? "checked" : ""}> GitHub</label>
                                    </div>
                                ` : ""}
                            </div>
                        `).join("")}
                    </div>
                </section>
            `;
        }).join("");
    };

    const cardsHtml = taskListState.checklistStandards.map((standard) => {
        const title = standard === "digital-outcome" ? "Digital Outcome Description" : `Standard ${escapeTaskListHtml(standard)}`;
        const rows = Array.isArray(taskListState.checklistState[standard]) ? taskListState.checklistState[standard] : [];

        return `
            <article class="task-list-checklist-card">
                ${standard === "digital-outcome" ? `
                    <h3>Digital Outcome Topic</h3>
                    <div class="task-list-do-chip">${escapeTaskListHtml(topicType)}</div>
                    <p class="task-list-meta"><strong>${escapeTaskListHtml(taskTitle)}</strong> • ${escapeTaskListHtml(deriveTaskShortName(taskTopic))}</p>
                ` : `<h3>${title}</h3>`}
                ${renderRowsForStandard(standard, rows)}
            </article>
        `;
    }).join("");

    checklistHost.innerHTML = cardsHtml;
}

function getStandardCodes(detail) {
    const fromDetails = Array.isArray(detail?.standardDetails)
        ? detail.standardDetails.map((line) => String(line || "").match(/\b(\d{5})\b/)?.[1]).filter(Boolean)
        : [];

    if (!fromDetails.length) {
        return ["digital-outcome", "91897", "91907"];
    }

    return ["digital-outcome", ...fromDetails.filter((code, index, arr) => arr.indexOf(code) === index)];
}

function buildChecklistState(standardCodes, evidenceMap) {
    const next = {};
    standardCodes.forEach((standard) => {
        const existing = Array.isArray(evidenceMap[standard]) ? evidenceMap[standard] : [];
        if (existing.length) {
            next[standard] = existing.map((step) => ({ text: String(step?.text || "").trim(), done: Boolean(step?.done) }));
            return;
        }

        if (standard === "digital-outcome") {
            next[standard] = DIGITAL_OUTCOME_DETAILS_TASKS.map((text) => ({ text, done: false }));
            return;
        }

        const defaults = Array.isArray(EVIDENCE_STEPS_DEFAULTS[standard]) ? EVIDENCE_STEPS_DEFAULTS[standard] : ["Add a step..."];
        next[standard] = defaults.map((text) => ({ text, done: false }));
    });
    return next;
}

async function loadChecklistForTask(taskId) {
    const selected = taskListState.allItems.find((item) => String(item.id) === String(taskId));
    if (!selected) {
        return;
    }

    taskListState.selectedId = String(selected.id);
    const detail = await fetchActivityDetail(taskListState.selectedId);
    taskListState.taskTopic = String(detail?.name || selected?.name || "Task List").trim();

    const evidenceRows = await fetchMyEvidence(taskListState.selectedId).catch(() => []);
    const evidenceMap = evidenceRowsToMap(evidenceRows);
    taskListState.checklistStandards = getStandardCodes(detail || selected);
    taskListState.checklistState = buildChecklistState(taskListState.checklistStandards, evidenceMap);

    renderHeader({
        totalLinked: taskListState.allItems.length,
        totalChecklist: Object.values(taskListState.checklistState).reduce((sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0), 0)
    });

    renderTaskPicker(taskListState.allItems, taskListState.selectedId);
    renderChecklistCards(detail || selected, taskListState.allItems);

    const openLink = document.querySelector("#task-list-open-topic");
    if (openLink) {
        openLink.setAttribute("href", buildCustomActivityLink(taskListState.selectedId, taskListState.taskTopic));
    }

    setStatus(`Loaded checklist for ${selected.name || "task"}.`);
}

async function renderTaskListPage() {
    const email = await getSignedInEmail();
    if (!email) {
        setStatus("Sign in with your school account to view your Task List.", true);
        return;
    }

    const context = getQueryContext();
    let allocations = { assessment_tasks: [], projects: [] };
    try {
        allocations = await fetchAllocations();
    } catch (_error) {
        allocations = { assessment_tasks: [], projects: [] };
    }

    taskListState.allItems = [
        ...allocations.assessment_tasks.map((item) => ({ ...item, kind: "Assessment" })),
        ...allocations.projects.map((item) => ({ ...item, kind: "Project" }))
    ];

    renderHeader({
        totalLinked: taskListState.allItems.length,
        totalChecklist: 0
    });
    renderAllocationLists(allocations.assessment_tasks, allocations.projects);

    const contextHost = document.querySelector("#task-list-context");
    if (contextHost) {
        const contextParts = [];
        if (context.id) contextParts.push(`Activity ID: ${escapeTaskListHtml(context.id)}`);
        if (context.taskTopic) contextParts.push(`Task Topic: ${escapeTaskListHtml(context.taskTopic)}`);
        if (context.taskShortName) contextParts.push(`Task: ${escapeTaskListHtml(context.taskShortName)}`);
        if (contextParts.length) {
            contextHost.hidden = false;
            contextHost.innerHTML = `
                <h3>Current Context</h3>
                <p class="task-list-empty">This checklist can load from your selected task below.</p>
                <p class="task-list-meta">${contextParts.join(" | ")}</p>
            `;
        }
    }

    if (!taskListState.allItems.length) {
        renderTaskPicker([], "");
        setStatus("No allocations found yet. Ask your teacher to assign a task.", true);
        return;
    }

    const preferred = context.id
        ? taskListState.allItems.find((item) => String(item.id) === String(context.id)) || null
        : taskListState.allItems.find((item) => /client projects/i.test(String(item.name || ""))) || taskListState.allItems[0];

    await loadChecklistForTask(String(preferred?.id || taskListState.allItems[0].id));

    const picker = document.querySelector("#task-list-picker");
    picker?.addEventListener("change", async (event) => {
        const nextId = String(event?.target?.value || "").trim();
        if (!nextId) return;
        await loadChecklistForTask(nextId);

        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set("id", nextId);
        history.replaceState({}, "", nextUrl.toString());
    });

    document.addEventListener("change", async (event) => {
        const checkbox = event.target?.closest?.("[data-step-check]");
        if (!checkbox) return;

        const key = String(checkbox.getAttribute("data-step-check") || "");
        const [standard, indexRaw] = key.split(":");
        const index = Number(indexRaw);
        if (!standard || !Number.isFinite(index)) return;

        const rows = Array.isArray(taskListState.checklistState[standard]) ? taskListState.checklistState[standard] : [];
        if (!rows[index]) return;
        rows[index].done = Boolean(checkbox.checked);

        try {
            await saveMyEvidence(taskListState.selectedId, evidenceMapToRows(taskListState.checklistState, taskListState.checklistStandards));
            setStatus("Saved.");
        } catch (error) {
            setStatus(error?.message || "Could not save right now.", true);
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    void renderTaskListPage();
});
