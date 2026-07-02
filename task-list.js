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

function renderContextCallout() {
    const contextHost = document.querySelector("#task-list-context");
    if (!contextHost) return;

    const params = new URLSearchParams(window.location.search || "");
    const activityId = String(params.get("id") || params.get("activityId") || "").trim();
    const taskTopic = String(params.get("taskTopic") || "").trim();
    const taskShortName = String(params.get("taskShortName") || "").trim();

    if (!activityId) {
        contextHost.hidden = true;
        contextHost.innerHTML = "";
        return;
    }

    const openHref = buildCustomActivityLink(activityId, taskTopic);
    contextHost.hidden = false;
    contextHost.innerHTML = `
        <h3>Current Context</h3>
        <p class="task-list-empty">Continue from the task you were just viewing.</p>
        <p class="task-list-meta"><strong>Activity ID:</strong> ${escapeTaskListHtml(activityId)}${taskTopic ? ` | <strong>Task Topic:</strong> ${escapeTaskListHtml(taskTopic)}` : ""}${taskShortName ? ` | <strong>Task:</strong> ${escapeTaskListHtml(taskShortName)}` : ""}</p>
        <p><a class="detail-action" href="${escapeTaskListHtml(openHref)}">Open This Task Topic</a></p>
    `;
}

function renderAllocationList(hostId, emptyId, items, label) {
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
        const id = String(item?.id || "").trim();
        const name = String(item?.name || "Untitled").trim() || "Untitled";
        const href = buildCustomActivityLink(id);
        return `
            <li class="task-list-alloc-item">
                <div>
                    <p class="task-list-alloc-name">${escapeTaskListHtml(name)}</p>
                    <p class="task-list-meta">${escapeTaskListHtml(label)} ID: ${escapeTaskListHtml(id)}</p>
                </div>
                <a class="detail-action detail-action-secondary" href="${escapeTaskListHtml(href)}">Open Task List</a>
            </li>
        `;
    }).join("");
}

function setTaskListStatus(message, isError = false) {
    const status = document.querySelector("#task-list-status");
    if (!status) return;
    status.textContent = String(message || "");
    status.classList.toggle("is-error", Boolean(isError));
}

async function loadTaskListAllocations() {
    renderContextCallout();

    const email = getTaskListEmail();
    if (!email) {
        setTaskListStatus("Sign in with your school account to view your Task Lists.", true);
        return;
    }

    setTaskListStatus("Loading your task lists...");

    try {
        const response = await fetch("/api/my-allocations", {
            headers: buildTaskListHeaders({})
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload?.error || "Could not load allocations.");
        }

        const payload = await response.json().catch(() => ({}));
        const assessmentTasks = Array.isArray(payload?.assessment_tasks) ? payload.assessment_tasks : [];
        const projects = Array.isArray(payload?.projects) ? payload.projects : [];

        renderAllocationList("#task-list-assessments", "#task-list-assessments-empty", assessmentTasks, "Assessment");
        renderAllocationList("#task-list-projects", "#task-list-projects-empty", projects, "Project");

        const total = assessmentTasks.length + projects.length;
        const totalHost = document.querySelector("#task-list-total");
        if (totalHost) {
            totalHost.textContent = String(total);
        }

        if (!total) {
            setTaskListStatus("No allocations found yet. Ask your teacher to assign your task or project.");
            return;
        }

        setTaskListStatus("Task lists loaded.");
    } catch (error) {
        setTaskListStatus(error?.message || "Could not load task lists right now.", true);
    }
}

void loadTaskListAllocations();
