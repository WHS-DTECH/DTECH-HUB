const ALLOC_AUTH_KEY = "hub_google_auth_v1";

function allocGetStoredEmail() {
    const raw = localStorage.getItem(ALLOC_AUTH_KEY) || sessionStorage.getItem(ALLOC_AUTH_KEY);
    if (!raw) return "";
    try {
        const parsed = JSON.parse(raw);
        if (!parsed?.expiresAt || Number(parsed.expiresAt) <= Date.now()) return "";
        return String(parsed?.profile?.email || "").trim().toLowerCase();
    } catch (_e) {
        return "";
    }
}

async function allocEnforceAccess() {
    const email = allocGetStoredEmail();
    if (!email) {
        window.location.replace("teacher-view.html");
        return false;
    }
    try {
        const resp = await fetch(`/api/auth/user-access?email=${encodeURIComponent(email)}`);
        if (!resp.ok) {
            window.location.replace("teacher-view.html");
            return false;
        }
        const access = await resp.json();
        if (!access?.can_teacher_view) {
            window.location.replace("teacher-view.html");
            return false;
        }
        return true;
    } catch (_e) {
        window.location.replace("teacher-view.html");
        return false;
    }
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(isoString) {
    if (!isoString) return "";
    try {
        return new Date(isoString).toLocaleDateString("en-NZ", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    } catch (_e) {
        return isoString;
    }
}

function setAllocStatus(message, isError = false) {
    const el = document.getElementById("alloc-status");
    if (!el) return;
    el.textContent = message;
    el.className = isError ? "alloc-status is-error" : "alloc-status";
}

function buildProjectBlock(project, email) {
    const block = document.createElement("div");
    block.className = "alloc-project-block";
    block.dataset.projectId = project.project_id;

    const confirmedCount = project.confirmed_count || 0;
    const totalCount = project.interest_count || 0;
    const detailUrl = `ProjectPages/custom-activity.html?id=${encodeURIComponent(project.project_id)}`;

    block.innerHTML = `
        <header class="alloc-project-header">
            <div>
                <h2 class="alloc-project-title">${escapeHtml(project.project_name)}</h2>
                <a class="alloc-project-link" href="${escapeHtml(detailUrl)}">View Project &rarr;</a>
            </div>
            <div class="alloc-meta">
                <span><strong>${totalCount}</strong> interested</span>
                <span><strong>${confirmedCount}</strong> confirmed</span>
            </div>
        </header>
        <div class="alloc-table-wrap">
            <table class="alloc-table">
                <thead>
                    <tr>
                        <th>Student Email</th>
                        <th>Registered</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${project.students.map((s) => buildStudentRow(s)).join("")}
                </tbody>
            </table>
        </div>
    `;

    // Attach action button handlers
    block.querySelectorAll("[data-action]").forEach((btn) => {
        btn.addEventListener("click", () => handleAllocationAction(btn, project.project_id, email));
    });

    return block;
}

function buildStudentRow(student) {
    const isConfirmed = Boolean(student.confirmed);
    const dateStr = formatDate(student.created_at);
    const statusBadge = isConfirmed
        ? `<span class="alloc-status-badge badge-confirmed">Confirmed</span>`
        : `<span class="alloc-status-badge badge-pending">Pending</span>`;
    const confirmBtnClass = isConfirmed ? "alloc-btn alloc-btn-unconfirm" : "alloc-btn alloc-btn-confirm";
    const confirmBtnText = isConfirmed ? "Unconfirm" : "Confirm";

    return `
        <tr data-student="${escapeHtml(student.email)}">
            <td>${escapeHtml(student.email)}</td>
            <td class="alloc-date">${escapeHtml(dateStr)}</td>
            <td>${statusBadge}</td>
            <td>
                <div class="alloc-btn-group">
                    <button type="button" class="${confirmBtnClass}" data-action="confirm" data-confirmed="${isConfirmed}">${escapeHtml(confirmBtnText)}</button>
                    <button type="button" class="alloc-btn alloc-btn-remove" data-action="remove">Remove</button>
                </div>
            </td>
        </tr>
    `;
}

async function handleAllocationAction(btn, projectId, email) {
    const row = btn.closest("tr[data-student]");
    if (!row) return;
    const studentEmail = row.getAttribute("data-student");
    const action = btn.getAttribute("data-action");

    btn.disabled = true;
    const headers = { "Content-Type": "application/json", "x-user-email": email };

    try {
        if (action === "confirm") {
            const currentlyConfirmed = btn.getAttribute("data-confirmed") === "true";
            const newConfirmed = !currentlyConfirmed;
            const resp = await fetch(
                `/api/activities/${encodeURIComponent(projectId)}/interests/${encodeURIComponent(studentEmail)}/confirm`,
                { method: "PATCH", headers, body: JSON.stringify({ confirmed: newConfirmed }) }
            );
            if (resp.ok) {
                btn.setAttribute("data-confirmed", String(newConfirmed));
                btn.textContent = newConfirmed ? "Unconfirm" : "Confirm";
                btn.className = newConfirmed ? "alloc-btn alloc-btn-unconfirm" : "alloc-btn alloc-btn-confirm";
                const statusCell = row.querySelector(".alloc-status-badge");
                if (statusCell) {
                    statusCell.textContent = newConfirmed ? "Confirmed" : "Pending";
                    statusCell.className = newConfirmed ? "alloc-status-badge badge-confirmed" : "alloc-status-badge badge-pending";
                }
                // Update header counts
                updateProjectBlockCounts(btn.closest(".alloc-project-block"));
            }
        } else if (action === "remove") {
            if (!window.confirm(`Remove ${studentEmail} from this project's interest list?`)) {
                btn.disabled = false;
                return;
            }
            const resp = await fetch(
                `/api/activities/${encodeURIComponent(projectId)}/interests/${encodeURIComponent(studentEmail)}`,
                { method: "DELETE", headers }
            );
            if (resp.ok) {
                row.remove();
                updateProjectBlockCounts(btn.closest(".alloc-project-block"));
            }
        }
    } catch (_err) {
        setAllocStatus("An error occurred. Please try again.", true);
    }

    if (btn.isConnected) btn.disabled = false;
}

function updateProjectBlockCounts(block) {
    if (!block) return;
    const rows = block.querySelectorAll("tbody tr[data-student]");
    const confirmedRows = block.querySelectorAll("tbody tr[data-student] .badge-confirmed");
    const metaEl = block.querySelector(".alloc-meta");
    if (metaEl) {
        metaEl.innerHTML = `
            <span><strong>${rows.length}</strong> interested</span>
            <span><strong>${confirmedRows.length}</strong> confirmed</span>
        `;
    }
}

async function loadAllocations() {
    const email = allocGetStoredEmail();
    const content = document.getElementById("alloc-content");
    if (!content) return;

    setAllocStatus("Loading…");
    content.innerHTML = `<p class="alloc-empty">Loading project allocations&hellip;</p>`;

    try {
        const resp = await fetch("/api/project-interests", {
            headers: { "x-user-email": email }
        });

        if (!resp.ok) {
            throw new Error("Could not load project interests");
        }

        const projects = await resp.json();
        setAllocStatus("");

        if (!Array.isArray(projects) || projects.length === 0) {
            content.innerHTML = `<p class="alloc-empty">No student interest has been registered on any project yet.</p>`;
            return;
        }

        content.innerHTML = "";
        for (const project of projects) {
            content.appendChild(buildProjectBlock(project, email));
        }
    } catch (error) {
        setAllocStatus(error.message || "Could not load allocations.", true);
        content.innerHTML = `<p class="alloc-empty">Could not load project allocations. Please refresh.</p>`;
    }
}

async function init() {
    const allowed = await allocEnforceAccess();
    if (!allowed) return;
    await loadAllocations();

    const refreshBtn = document.getElementById("alloc-refresh-btn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadAllocations);
    }
}

init();
