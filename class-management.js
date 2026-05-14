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

function uniqueValues(values, sortValues = true) {
    const unique = Array.from(new Set((Array.isArray(values) ? values : []).filter(Boolean)));
    if (!sortValues) {
        return unique;
    }

    return unique.sort((left, right) => String(left).localeCompare(String(right), undefined, { numeric: true }));
}

function getSelectedValues(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return [];

    if (element.multiple) {
        return Array.from(element.selectedOptions)
            .map((option) => String(option.value || "").trim())
            .filter((value) => value && value !== "all");
    }

    const value = String(element.value || "all").trim();
    return value && value !== "all" ? [value] : [];
}

function buildSelectOptions(elementId, values, defaultLabel, { multiple = false, sortValues = true, formatter = (value) => String(value) } = {}) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const previousValues = getSelectedValues(elementId);
    const optionValues = uniqueValues(values, sortValues).map((value) => String(value).trim()).filter(Boolean);

    element.multiple = multiple;
    element.innerHTML = "";

    if (!multiple) {
        const defaultOption = document.createElement("option");
        defaultOption.value = "all";
        defaultOption.textContent = defaultLabel;
        element.appendChild(defaultOption);
    }

    const selectAllByDefault = multiple && !previousValues.length;

    optionValues.forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = formatter(value);
        if (multiple) {
            option.selected = selectAllByDefault || previousValues.includes(value);
        }
        element.appendChild(option);
    });

    if (!multiple) {
        const previous = previousValues[0] || "all";
        element.value = Array.from(element.options).some((option) => option.value === previous) ? previous : "all";
    }
}

function getSchoolGroupForYearLevel(yearLevel) {
    const yearNumber = Number.parseInt(String(yearLevel || "").replace(/\D+/g, ""), 10);
    if (yearNumber >= 7 && yearNumber <= 8) return "Junior";
    if (yearNumber >= 9 && yearNumber <= 10) return "Middle";
    if (yearNumber >= 11 && yearNumber <= 13) return "Senior";
    return "";
}

function formatSchoolGroupLabel(group) {
    if (group === "Junior") return "Junior (Years 7-8)";
    if (group === "Middle") return "Middle (Years 9-10)";
    if (group === "Senior") return "Senior (Years 11-13)";
    return group;
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
        years: getSelectedValues("class-year-filter"),
        schoolGroups: getSelectedValues("class-school-filter"),
        forms: getSelectedValues("class-form-filter"),
        statuses: getSelectedValues("class-status-filter").map((value) => String(value || "").toLowerCase()),
        sort: String(document.getElementById("class-sort-filter")?.value || "name"),
        programs: getSelectedValues("class-program-filter"),
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
        getSchoolGroupForYearLevel(student.year_level),
        ...(Array.isArray(student.programs) ? student.programs : []),
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
            if (filters.years.length && !filters.years.includes(String(student.year_level || ""))) return false;
            if (filters.schoolGroups.length && !filters.schoolGroups.includes(getSchoolGroupForYearLevel(student.year_level))) return false;
            if (filters.forms.length && !filters.forms.includes(String(student.form_class || ""))) return false;
            if (filters.statuses.length && !filters.statuses.includes(String(student.status || "").toLowerCase())) return false;
            if (filters.programs.length && !filters.programs.some((program) => Array.isArray(student.programs) && student.programs.includes(program))) return false;
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

        buildSelectOptions("class-year-filter", students.map((student) => student.year_level), "All years", { multiple: true });
        buildSelectOptions("class-school-filter", ["Junior", "Middle", "Senior"], "All school groups", {
            multiple: true,
            sortValues: false,
            formatter: formatSchoolGroupLabel
        });
        buildSelectOptions("class-form-filter", students.map((student) => student.form_class), "All form classes", { multiple: true });
        buildSelectOptions("class-status-filter", ["Current", "Not Current"], "All statuses", {
            multiple: true,
            sortValues: false,
            formatter: (value) => value
        });
        buildSelectOptions("class-program-filter", ["DTECH", "DTONLINE", "COMP", "TEXT", "MPROG", "MDTECH"], "All programs", {
            multiple: true,
            sortValues: false,
            formatter: (value) => value
        });

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
        "class-school-filter",
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
