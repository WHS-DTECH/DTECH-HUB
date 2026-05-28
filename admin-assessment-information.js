const STANDARDS_AUTH_KEY = "hub_google_auth_v1";

const streamInput = document.getElementById("nzqa-stream");
const levelInput = document.getElementById("nzqa-level");
const standardSearchInput = document.getElementById("nzqa-standard-search");
const refreshButton = document.getElementById("nzqa-refresh");
const statusElement = document.getElementById("standards-status");
const metaElement = document.getElementById("standards-results-meta");
const tableBody = document.getElementById("standards-table-body");

function standardsGetStoredEmail() {
    const raw = localStorage.getItem(STANDARDS_AUTH_KEY) || sessionStorage.getItem(STANDARDS_AUTH_KEY);
    if (!raw) return "";
    try {
        const parsed = JSON.parse(raw);
        if (!parsed?.expiresAt || Number(parsed.expiresAt) <= Date.now()) return "";
        return String(parsed?.profile?.email || "").trim().toLowerCase();
    } catch (_error) {
        return "";
    }
}

async function enforceAdminAccess() {
    const email = standardsGetStoredEmail();
    if (!email) {
        window.location.replace("admin-menu.html");
        return "";
    }

    try {
        const response = await fetch(`/api/auth/user-access?email=${encodeURIComponent(email)}`);
        if (!response.ok) {
            window.location.replace("admin-menu.html");
            return "";
        }

        const access = await response.json();
        if (!access?.can_admin) {
            window.location.replace("admin-menu.html");
            return "";
        }

        return email;
    } catch (_error) {
        window.location.replace("admin-menu.html");
        return "";
    }
}

function setStatus(message, isError = false) {
    if (!statusElement) return;
    statusElement.textContent = message;
    statusElement.className = isError ? "standards-status is-error" : "standards-status";
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderRows(rows) {
    if (!tableBody) return;

    if (!Array.isArray(rows) || !rows.length) {
        tableBody.innerHTML = `<tr><td colspan="8" class="standards-empty">No standards found for this filter.</td></tr>`;
        return;
    }

    tableBody.innerHTML = rows.map((row) => {
        const standardNumber = String(row.standard_number || "").trim();
        const standardName = String(row.standard_name || "").trim() || "Unnamed standard";
        const version = String(row.version || "").trim() || "-";
        const level = String(row.level || "").trim() || "-";
        const credits = Number.isFinite(Number(row.credits)) ? String(row.credits) : "-";
        const pdfUrl = String(row.pdf_url || "").trim();
        const docUrl = String(row.docx_url || "").trim();
        const detailsUrl = String(row.details_url || "").trim();

        return `
            <tr>
                <td><strong>${escapeHtml(standardNumber)}</strong></td>
                <td>${escapeHtml(standardName)}</td>
                <td>${escapeHtml(version)}</td>
                <td><span class="standards-pill">L${escapeHtml(level)}</span></td>
                <td>${escapeHtml(credits)}</td>
                <td>${pdfUrl ? `<a class="standards-link" href="${escapeHtml(pdfUrl)}" target="_blank" rel="noreferrer">PDF</a>` : `<span class="standards-empty">-</span>`}</td>
                <td>${docUrl ? `<a class="standards-link" href="${escapeHtml(docUrl)}" target="_blank" rel="noreferrer">DOC/DOCX</a>` : `<span class="standards-empty">-</span>`}</td>
                <td>${detailsUrl ? `<a class="standards-link" href="${escapeHtml(detailsUrl)}" target="_blank" rel="noreferrer">View</a>` : `<span class="standards-empty">-</span>`}</td>
            </tr>
        `;
    }).join("");
}

function buildQuery() {
    const params = new URLSearchParams();
    params.set("stream", String(streamInput?.value || "digital").trim().toLowerCase());
    params.set("level", String(levelInput?.value || "all").trim().toLowerCase());

    const standardQuery = String(standardSearchInput?.value || "").trim();
    if (standardQuery) {
        params.set("standard", standardQuery);
    }

    return params;
}

async function loadStandards({ force = false } = {}) {
    const email = standardsGetStoredEmail();
    if (!email) return;

    const params = buildQuery();
    if (force) {
        params.set("_", String(Date.now()));
    }

    setStatus("Loading NZQA standards...");
    if (refreshButton) {
        refreshButton.disabled = true;
    }

    try {
        const response = await fetch(`/api/admin/nzqa-standards?${params.toString()}`, {
            headers: {
                "x-user-email": email
            }
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(payload.error || "Could not load NZQA standards.");
        }

        const standards = Array.isArray(payload?.standards) ? payload.standards : [];
        renderRows(standards);

        const stream = payload?.filters?.stream || params.get("stream") || "digital";
        const streamLabel = stream === "both"
            ? "Digital + Generic"
            : (stream === "computing" ? "Generic Computing" : "Digital Technologies");

        if (metaElement) {
            metaElement.textContent = `${standards.length} standard${standards.length === 1 ? "" : "s"} loaded - ${streamLabel}`;
        }

        setStatus("NZQA standards loaded.");
    } catch (error) {
        renderRows([]);
        if (metaElement) {
            metaElement.textContent = "";
        }
        setStatus(String(error?.message || "Could not load NZQA standards."), true);
    } finally {
        if (refreshButton) {
            refreshButton.disabled = false;
        }
    }
}

function bindEvents() {
    if (streamInput) {
        streamInput.addEventListener("change", () => loadStandards());
    }

    if (levelInput) {
        levelInput.addEventListener("change", () => loadStandards());
    }

    if (standardSearchInput) {
        let timer = null;
        standardSearchInput.addEventListener("input", () => {
            if (timer) {
                clearTimeout(timer);
            }
            timer = setTimeout(() => loadStandards(), 250);
        });
    }

    if (refreshButton) {
        refreshButton.addEventListener("click", () => loadStandards({ force: true }));
    }
}

async function initAssessmentStandardsPage() {
    const email = await enforceAdminAccess();
    if (!email) return;

    bindEvents();
    await loadStandards();
}

// Backwards-compatibility hook for any legacy onclick handlers.
window.fetchNzqaStandards = function fetchNzqaStandards(force = false) {
    return loadStandards({ force: Boolean(force) });
};

initAssessmentStandardsPage();
