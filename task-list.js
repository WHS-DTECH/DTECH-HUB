const TASK_LIST_AUTH_KEY = "hub_google_auth_v1";

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
    const type = String(detail?.type || detail?.topicType || "").trim();
    return type || "Not set";
}

async function loadJson(url, headers = {}) {
    const response = await fetch(url, { headers });
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
    const payload = await loadJson("/api/my-allocations", buildTaskListHeaders({}));
    return {
        assessment_tasks: Array.isArray(payload?.assessment_tasks) ? payload.assessment_tasks : [],
        projects: Array.isArray(payload?.projects) ? payload.projects : []
    };
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

function renderAllocationPills(assessmentTasks, projects) {
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

    const allItems = [
        ...allocations.assessment_tasks,
        ...allocations.projects
    ];

    renderHeader({
        totalLinked: allItems.length,
        totalChecklist: allItems.length
    });
    renderAllocationPills(allocations.assessment_tasks, allocations.projects);

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
                <p class="task-list-empty">You came from a task topic page. Use the list below to open your allocated assessment or project.</p>
                <p class="task-list-meta">${contextParts.join(" | ")}</p>
            `;
        }
    }

    const statusHost = document.querySelector("#task-list-status");
    if (statusHost) {
        statusHost.textContent = `Loaded ${allItems.length} allocated item${allItems.length === 1 ? "" : "s"}.`;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    void renderTaskListPage();
});
