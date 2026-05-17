const accessElement = document.querySelector("#unit-plan-access");
const statusElement = document.querySelector("#unit-plan-status");
const resultsElement = document.querySelector("#unit-plan-results");
const searchElement = document.querySelector("#unit-plan-search");

const BROWSE_UNIT_AUTH_KEY = "hub_google_auth_v1";

let rows = [];
let hasAccess = false;

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function normalizeRole(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function setStatus(message, isError = false) {
    if (!statusElement) return;
    statusElement.textContent = String(message || "");
    statusElement.classList.remove("is-error", "is-success");
    statusElement.classList.add(isError ? "is-error" : "is-success");
}

function setAccess(message, isError = false) {
    if (!accessElement) return;
    accessElement.textContent = String(message || "");
    accessElement.classList.remove("is-missing", "is-error", "is-success");
    if (isError) {
        accessElement.classList.add("is-error");
    } else {
        accessElement.classList.add("is-success");
    }
}

function readSignedInEmail() {
    const raw = localStorage.getItem(BROWSE_UNIT_AUTH_KEY) || sessionStorage.getItem(BROWSE_UNIT_AUTH_KEY);
    if (!raw) return "";

    try {
        const parsed = JSON.parse(raw);
        return normalizeEmail(parsed?.profile?.email || "");
    } catch (_error) {
        return "";
    }
}

function formatDateTime(value) {
    const parsed = new Date(String(value || ""));
    if (Number.isNaN(parsed.getTime())) {
        return "-";
    }
    return parsed.toLocaleString("en-NZ", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function getSearchTerm() {
    return String(searchElement?.value || "").trim().toLowerCase();
}

function filterRows(sourceRows) {
    const term = getSearchTerm();
    if (!term) return sourceRows;

    return sourceRows.filter((row) => {
        const blob = [
            row.title,
            row.topic,
            row.year_level,
            row.subject_stream,
            row.term,
            row.overview
        ]
            .map((item) => String(item || "").toLowerCase())
            .join(" | ");
        return blob.includes(term);
    });
}

function renderRows() {
    if (!resultsElement) return;

    if (!hasAccess) {
        resultsElement.innerHTML = "";
        return;
    }

    const filtered = filterRows(rows);
    if (!filtered.length) {
        resultsElement.innerHTML = "<p class='help-text'>No unit plans match your search.</p>";
        return;
    }

    const cards = filtered
        .map((row) => {
            const lessonCount = Array.isArray(row.lessons) ? row.lessons.length : 0;
            return `
                <article class="upload-panel" style="margin-top: 1rem;">
                    <h2 style="margin:0 0 .5rem; font-size:1.15rem;">${String(row.title || "Untitled Unit Plan")}</h2>
                    <p class="help-text" style="margin:0 0 .5rem;">${String(row.topic || "No topic")}</p>
                    <div class="form-grid">
                        <div class="field"><label>Year</label><input type="text" value="${String(row.year_level || "-")}" disabled></div>
                        <div class="field"><label>Stream</label><input type="text" value="${String(row.subject_stream || "-")}" disabled></div>
                        <div class="field"><label>Term</label><input type="text" value="${String(row.term || "-")}" disabled></div>
                        <div class="field"><label>Lessons</label><input type="text" value="${String(lessonCount)}" disabled></div>
                        <div class="field field-wide"><label>Last Updated</label><input type="text" value="${formatDateTime(row.updated_at || row.created_at)}" disabled></div>
                    </div>
                </article>
            `;
        })
        .join("");

    resultsElement.innerHTML = cards;
}

async function loadUnitPlans() {
    if (!hasAccess) return;

    try {
        setStatus("Loading unit plans...");
        const response = await fetch("/api/unit-plans");
        if (!response.ok) {
            throw new Error(`Could not load unit plans (HTTP ${response.status})`);
        }

        const data = await response.json();
        rows = Array.isArray(data) ? data : [];
        rows.sort((left, right) => String(right.updated_at || right.created_at || "").localeCompare(String(left.updated_at || left.created_at || "")));
        renderRows();
        setStatus(`Loaded ${rows.length} unit plan${rows.length === 1 ? "" : "s"}.`);
    } catch (error) {
        setStatus(error.message || "Could not load unit plans.", true);
    }
}

async function resolveAccess() {
    const email = readSignedInEmail();
    if (!email) {
        hasAccess = false;
        setAccess("Sign in with your school account to browse unit plans.", true);
        setStatus("", false);
        renderRows();
        return;
    }

    try {
        const response = await fetch(`/api/auth/user-access?email=${encodeURIComponent(email)}`);
        if (!response.ok) {
            throw new Error("Could not resolve your access.");
        }

        const data = await response.json();
        const role = normalizeRole(data.additional_role);
        const roleAllowed = role === "teacher" || role === "lead teacher";
        hasAccess = Boolean(data.can_admin) || roleAllowed;

        if (!hasAccess) {
            setAccess("Your account can sign in, but Browse Unit Plans is limited to Teacher, Lead Teacher, and Admin.", true);
            setStatus("", false);
            renderRows();
            return;
        }

        setAccess(`Signed in as ${email}`);
    } catch (error) {
        hasAccess = false;
        setAccess(error.message || "Could not resolve access.", true);
        setStatus("", false);
        renderRows();
    }
}

if (searchElement) {
    searchElement.addEventListener("input", () => {
        renderRows();
    });
}

async function init() {
    await resolveAccess();
    await loadUnitPlans();
}

init();
