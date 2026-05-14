const CLASS_AUTH_KEY = "hub_google_auth_v1";
const classState = {
    allStudents: [],
    visibleStudents: []
};

function classGetStoredEmail() {
    const raw = localStorage.getItem(CLASS_AUTH_KEY) || sessionStorage.getItem(CLASS_AUTH_KEY);
    if (!raw) return "";
    try {
        const parsed = JSON.parse(raw);
        if (!parsed?.expiresAt || Number(parsed.expiresAt) <= Date.now()) return "";
        return String(parsed?.profile?.email || "").trim().toLowerCase();
    } catch (_error) {
        return "";
    }
}

async function classEnforceTeacherAccess() {
    const email = classGetStoredEmail();
    if (!email) {
        window.location.replace("index.html");
        return false;
    }

    try {
        const response = await fetch(`/api/auth/user-access?email=${encodeURIComponent(email)}`);
        if (!response.ok) {
            window.location.replace("index.html");
            return false;
        }

        const access = await response.json();
        if (!access?.can_teacher_view) {
            window.location.replace("index.html");
            return false;
        }
        return true;
    } catch (_error) {
        window.location.replace("index.html");
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

function formatDate(value) {
    if (!value) return "";
    try {
        return new Date(value).toLocaleDateString("en-NZ", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    } catch (_error) {
        return String(value);
    }
}

function setClassStatus(message, isError = false) {
    const element = document.getElementById("class-status");
    if (!element) return;
    element.textContent = message;
    element.className = isError ? "class-status is-error" : "class-status";
}

function uniqueSorted(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).filter(Boolean))).sort((left, right) => String(left).localeCompare(String(right), undefined, { numeric: true }));
}

function buildSelectOptions(elementId, values, defaultLabel) {
    const element = document.getElementById(elementId);
    if (!element) return;
    const previous = element.value || "all";
    element.innerHTML = `<option value="all">${escapeHtml(defaultLabel)}</option>`;
    uniqueSorted(values).forEach((value) => {
        const option = document.createElement("option");
        option.value = String(value);
        option.textContent = String(value);
        element.appendChild(option);
    });
    element.value = Array.from(element.options).some((option) => option.value === previous) ? previous : "all";
}

function renderSummary(students, visibleStudents) {
    const total = students.length;
    const withPrograms = students.filter((student) => Array.isArray(student.programs) && student.programs.length).length;
    const linked = students.filter((student) => Array.isArray(student.linked_emails) && student.linked_emails.length).length;

    const summaryMap = new Map([
        ["summary-total", total],
        ["summary-dtech", withPrograms],
        ["summary-visible", visibleStudents.length],
        ["summary-linked", linked]
    ]);

    summaryMap.forEach((value, id) => {
        const element = document.getElementById(id);
        if (element) element.textContent = String(value);
    });

    const meta = document.getElementById("class-results-meta");
    if (meta) {
        meta.textContent = `Showing ${visibleStudents.length} of ${total} students. ${withPrograms} students have program matches.`;
    }
}

function formatTimetablePills(entries, emptyMessage) {
    if (!Array.isArray(entries) || !entries.length) {
        return `<span class="empty-note">${escapeHtml(emptyMessage)}</span>`;
    }

    return `<div class="slot-list">${entries.map((entry) => `<span class="slot-pill">${escapeHtml(entry.label)}: ${escapeHtml(entry.value)}</span>`).join("")}</div>`;
}

function renderStudentRow(student) {
    const statusClass = String(student.status || "").toLowerCase() === "not current" ? "pill-not-current" : "pill-current";
    const yearForm = [student.year_level && `Year ${student.year_level}`, student.form_class].filter(Boolean).join(" | ") || "Not specified";
    const uploadMeta = [student.upload_term, student.upload_year && `Year ${student.upload_year}`, student.upload_date && `Uploaded ${formatDate(student.upload_date)}`].filter(Boolean).join(" | ");
    const programs = Array.isArray(student.programs) && student.programs.length ? student.programs.join(", ") : "No programs matched";

    return `
        <tr>
            <td>
                <div class="student-name">${escapeHtml(student.student_name || "Unnamed student")}</div>
                <div class="student-subline">ID ${escapeHtml(student.id_number || "-")}</div>
                ${uploadMeta ? `<div class="student-subline">${escapeHtml(uploadMeta)}</div>` : ""}
            </td>
            <td>${escapeHtml(yearForm)}</td>
            <td>
                <div class="badge-row">
                    <span class="pill ${statusClass}">${escapeHtml(student.status || "Current")}</span>
                    <span class="pill ${student.programs?.length ? "pill-dtech" : "pill-non-dtech"}">${escapeHtml(programs)}</span>
                </div>
            </td>
            <td>${Array.isArray(student.linked_emails) && student.linked_emails.length ? `<div class="email-list">${student.linked_emails.map((email) => `<span class="email-pill">${escapeHtml(email)}</span>`).join("")}</div>` : `<span class="empty-note">No email/user key found in upload.</span>`}</td>
            <td>${formatTimetablePills(student.dtech_timetable, "No DTECH timetable slots matched.")}</td>
            <td>${formatTimetablePills(student.timetable, "No timetable periods available.")}</td>
        </tr>
    `;
}

function getFilterState() {
    return {
        search: String(document.getElementById("class-search")?.value || "").trim().toLowerCase(),
        year: String(document.getElementById("class-year-filter")?.value || "all"),
        form: String(document.getElementById("class-form-filter")?.value || "all"),
        status: String(document.getElementById("class-status-filter")?.value || "all").toLowerCase(),
        sort: String(document.getElementById("class-sort-filter")?.value || "name"),
        program: String(document.getElementById("class-program-filter")?.value || "all"),
        currentOnly: Boolean(document.getElementById("class-current-only")?.checked),
        linkedOnly: Boolean(document.getElementById("class-linked-only")?.checked)
    };
}

function studentMatchesSearch(student, search) {
    if (!search) return true;
    const values = [
        student.student_name,
        student.id_number,
        student.form_class,
        student.year_level,
        ...(Array.isArray(student.linked_emails) ? student.linked_emails : []),
        ...(Array.isArray(student.timetable) ? student.timetable.map((entry) => entry.value) : [])
    ].map((value) => String(value || "").toLowerCase());

    return values.some((value) => value.includes(search));
}

function applyFilters() {
    const body = document.getElementById("class-table-body");
    if (!body) return;

    const filters = getFilterState();
    const visibleStudents = classState.allStudents
        .filter((student) => {
            if (filters.year !== "all" && String(student.year_level || "") !== filters.year) return false;
            if (filters.form !== "all" && String(student.form_class || "") !== filters.form) return false;
            if (filters.status !== "all" && String(student.status || "").toLowerCase() !== filters.status) return false;
            if (filters.program !== "all" && !(Array.isArray(student.programs) && student.programs.includes(filters.program))) return false;
            if (filters.currentOnly && String(student.status || "").toLowerCase() === "not current") return false;
            if (filters.linkedOnly && !(Array.isArray(student.linked_emails) && student.linked_emails.length)) return false;
            return studentMatchesSearch(student, filters.search);
        })
        .sort((left, right) => {
            if (filters.sort === "year") {
                return String(left.year_level || "").localeCompare(String(right.year_level || ""), undefined, { numeric: true }) || String(left.student_name || "").localeCompare(String(right.student_name || ""));
            }
            if (filters.sort === "form") {
                return String(left.form_class || "").localeCompare(String(right.form_class || "")) || String(left.student_name || "").localeCompare(String(right.student_name || ""));
            }
            if (filters.sort === "dtech") {
                return Number(right.dtech_period_count || 0) - Number(left.dtech_period_count || 0) || String(left.student_name || "").localeCompare(String(right.student_name || ""));
            }
            return String(left.student_name || "").localeCompare(String(right.student_name || ""));
        });

    classState.visibleStudents = visibleStudents;
    renderSummary(classState.allStudents, visibleStudents);

    if (!visibleStudents.length) {
        body.innerHTML = `<tr><td colspan="6" class="empty-note">No students match the current filters.</td></tr>`;
        return;
    }

    body.innerHTML = visibleStudents.map(renderStudentRow).join("");
}

async function loadClassManagement() {
    const email = classGetStoredEmail();
    setClassStatus("Loading student timetable rows…");

    try {
        const response = await fetch("/api/class-management/students?current_only=false&dtech_only=false", {
            headers: { "x-user-email": email }
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload.error || "Could not load class management data.");
        }

        const students = Array.isArray(payload.students) ? payload.students : [];
        classState.allStudents = students;

        buildSelectOptions("class-year-filter", students.map((student) => student.year_level), "All years");
        buildSelectOptions("class-form-filter", students.map((student) => student.form_class), "All form classes");

        setClassStatus("");
        applyFilters();
    } catch (error) {
        setClassStatus(error.message || "Could not load class management data.", true);
        const body = document.getElementById("class-table-body");
        if (body) {
            body.innerHTML = `<tr><td colspan="6" class="empty-note">Could not load class management rows.</td></tr>`;
        }
    }
}

function bindFilters() {
    [
        "class-search",
        "class-year-filter",
        "class-form-filter",
        "class-status-filter",
        "class-sort-filter",
        "class-program-filter",
        "class-current-only",
        "class-linked-only"
    ].forEach((id) => {
        const element = document.getElementById(id);
        if (!element) return;
        const eventName = element.tagName === "INPUT" && element.type === "search" ? "input" : "change";
        element.addEventListener(eventName, applyFilters);
    });
}

async function initClassManagement() {
    const allowed = await classEnforceTeacherAccess();
    if (!allowed) return;
    bindFilters();
    await loadClassManagement();
}

initClassManagement();
