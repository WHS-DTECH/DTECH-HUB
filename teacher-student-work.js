const WORK_AUTH_KEY = "hub_google_auth_v1";
const DIGITAL_OUTCOME_DESCRIPTION_TASKS = [
    "Description - Google Slides: Describe the Digital Outcome: What is it, who is it for, and what should it do?",
    "Identify the target audience or end user for this outcome.",
    "Explain how the outcome will be developed and what tools/technologies will be used.",
    "State how success will be measured or evaluated."
];

const workState = {
    email: "",
    activitiesById: new Map(),
    interestRows: [],
    records: [],
    selectedTask: ""
};

const statusHost = document.querySelector("#work-status");
const taskLinkGrid = document.querySelector("#task-link-grid");
const trackerTitle = document.querySelector("#tracker-title");
const trackerSummary = document.querySelector("#tracker-summary");
const tableHost = document.querySelector("#work-table-host");
const taskPageNav = document.querySelector("#task-page-nav");
const taskPrevButton = document.querySelector("#task-prev-button");
const taskNextButton = document.querySelector("#task-next-button");
const taskCurrentLabel = document.querySelector("#task-current-label");

function isTaskDetailPage() {
    const path = String(window.location.pathname || "").toLowerCase();
    return path.endsWith("/teacher-student-work-task.html");
}

function setStatus(message, isError = false) {
    if (!statusHost) return;
    statusHost.textContent = String(message || "");
    statusHost.classList.toggle("is-error", Boolean(isError));
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function readStoredAuthRaw() {
    let localValue = null;
    let sessionValue = null;

    try {
        localValue = localStorage.getItem(WORK_AUTH_KEY);
    } catch (_error) {
        localValue = null;
    }

    try {
        sessionValue = sessionStorage.getItem(WORK_AUTH_KEY);
    } catch (_error) {
        sessionValue = null;
    }

    return localValue || sessionValue;
}

function readStoredEmail() {
    const raw = readStoredAuthRaw();
    if (!raw) return "";

    try {
        const parsed = JSON.parse(raw);
        return normalizeEmail(parsed?.profile?.email || "");
    } catch (_error) {
        return "";
    }
}

function readStoredAccessToken() {
    const raw = readStoredAuthRaw();
    if (!raw) return "";

    try {
        const parsed = JSON.parse(raw);
        if (!parsed?.expiresAt || Number(parsed.expiresAt) <= Date.now()) {
            return "";
        }
        return String(parsed?.idToken || parsed?.accessToken || "").trim();
    } catch (_error) {
        return "";
    }
}

function withAuthHeaders(headers = {}) {
    if (!workState.email) {
        return headers;
    }

    const nextHeaders = { ...headers, "x-user-email": workState.email };
    const accessToken = readStoredAccessToken();
    if (accessToken && accessToken.startsWith("eyJ") && accessToken.split(".").length === 3) {
        nextHeaders.Authorization = `Bearer ${accessToken}`;
    }

    return nextHeaders;
}

function toArray(value) {
    if (Array.isArray(value)) {
        return value.map((item) => String(item || "").trim()).filter(Boolean);
    }

    const raw = String(value || "").trim();
    if (!raw) return [];

    if ((raw.startsWith("[") && raw.endsWith("]")) || (raw.startsWith("\"") && raw.endsWith("\""))) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed.map((item) => String(item || "").trim()).filter(Boolean);
            }
        } catch (_error) {
        }
    }

    return raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function normalizeTaskTopicRows(value) {
    const rows = toArray(value);
    const bulletSplitRegex = /[\u2022\u25CF\u25E6\u25AA\u2023\u2043\u00B7\u2219]/;
    const expanded = rows
        .flatMap((line) => {
            const text = String(line || "").trim();
            if (!text) return [];

            if (!bulletSplitRegex.test(text)) {
                return [text];
            }

            const parts = text
                .split(bulletSplitRegex)
                .map((segment) => String(segment || "").trim())
                .filter(Boolean);

            if (!parts.length) return [];
            const startsWithBullet = /^[\s\u2022\u25CF\u25E6\u25AA\u2023\u2043\u00B7\u2219]/.test(text);
            return startsWithBullet ? parts : parts.slice(1);
        })
        .map((row) => row.replace(/^(Achieved|Merit|Excellence)\s*:\s*/i, "").replace(/^[\-*]\s*/, "").trim())
        .filter(Boolean);

    const seen = new Set();
    const unique = [];
    expanded.forEach((row) => {
        const key = row.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        unique.push(row);
    });

    return unique;
}

function extractPrimaryStandardNumber(activity) {
    const rows = toArray(activity?.standard_details || activity?.standardDetails || activity?.assessment_focus || activity?.assessmentFocus);
    for (const row of rows) {
        const match = String(row || "").match(/\b\d{4,6}\b/);
        if (match?.[0]) {
            return match[0];
        }
    }
    return "task-topic";
}

function normalizeTaskTopicText(value) {
    return String(value || "")
        .replace(/[\u2022\u25CF\u25E6\u25AA\u2023\u2043\u00B7\u2219]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function buildTaskTopicSubmissionStandardKey(taskTopicTitle, standardNumber = "") {
    const topicSlug = normalizeTaskTopicText(taskTopicTitle)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    const standardSlug = String(standardNumber || "task-topic")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return `task-topic:${standardSlug || "task-topic"}:${topicSlug || "topic"}`;
}

function toSafeExternalUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";

    try {
        const parsed = new URL(raw);
        return /^https?:$/i.test(parsed.protocol) ? parsed.toString() : "";
    } catch (_error) {
        return "";
    }
}

function parseTaskTopicEvidence(evidenceRows, standardKey) {
    const sourceRows = Array.isArray(evidenceRows) ? evidenceRows : [];
    const row = sourceRows.find((item) => String(item?.standard || "").trim() === standardKey);
    const result = {
        googleSlidesUrl: "",
        submittedAt: "",
        submitted: false,
        links: []
    };

    if (!row || !Array.isArray(row.steps)) {
        return result;
    }

    const pushLink = (label, url) => {
        const safe = toSafeExternalUrl(url);
        if (!safe) return;
        if (result.links.some((item) => item.url === safe)) return;
        result.links.push({ label, url: safe });
    };

    row.steps.forEach((step) => {
        const text = String(step?.text || "").trim();
        if (!text) return;

        if (text.startsWith("GOOGLE_SLIDES_URL|")) {
            const slidesUrl = toSafeExternalUrl(text.slice("GOOGLE_SLIDES_URL|".length).trim());
            if (slidesUrl) {
                result.googleSlidesUrl = slidesUrl;
                pushLink("Google Slides", slidesUrl);
            }
            return;
        }

        if (text.startsWith("LINK|")) {
            const link = toSafeExternalUrl(text.slice("LINK|".length).trim());
            if (/docs\.google\.com\/presentation/i.test(link) && !result.googleSlidesUrl) {
                result.googleSlidesUrl = link;
            }
            if (link) {
                pushLink("Evidence Link", link);
            }
            return;
        }

        if (text.startsWith("TRELLO_CARD_URL|")) {
            pushLink("Trello", text.slice("TRELLO_CARD_URL|".length).trim());
            return;
        }

        if (text.startsWith("ONEDRIVE_PROJECT_FOLDER_URL|")) {
            pushLink("OneDrive", text.slice("ONEDRIVE_PROJECT_FOLDER_URL|".length).trim());
            return;
        }

        if (text.startsWith("MEDIA_ASSET_FOLDER_URL|")) {
            pushLink("Asset Folder", text.slice("MEDIA_ASSET_FOLDER_URL|".length).trim());
            return;
        }

        if (text.startsWith("HAPARA_SUBMITTED_AT|")) {
            result.submittedAt = text.slice("HAPARA_SUBMITTED_AT|".length).trim();
            result.submitted = Boolean(result.submittedAt);
            return;
        }

        if (text.startsWith("SUBMITTED_AT|")) {
            if (!result.submittedAt) {
                result.submittedAt = text.slice("SUBMITTED_AT|".length).trim();
            }
            if (result.submittedAt) {
                result.submitted = true;
            }
            return;
        }

        if (text.startsWith("HAPARA_ACK|")) {
            const value = text.slice("HAPARA_ACK|".length).trim().toLowerCase();
            if (value === "true" || value === "1" || value === "yes") {
                result.submitted = true;
            }
        }
    });

    return result;
}

function formatSubmissionTimestamp(value) {
    const raw = String(value || "").trim();
    if (!raw) return "-";

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    return parsed.toLocaleString();
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || `Request failed (${response.status})`);
    }

    return response.json().catch(() => ({}));
}

async function enforceAccess() {
    workState.email = readStoredEmail();
    if (!workState.email) {
        window.location.replace("teacher-view.html");
        return false;
    }

    const access = await fetchJson(`/api/auth/user-access?email=${encodeURIComponent(workState.email)}`, {
        headers: withAuthHeaders()
    });

    if (!access?.can_teacher_view) {
        window.location.replace("teacher-view.html");
        return false;
    }

    return true;
}

function buildAllRecords() {
    const records = [];
    workState.interestRows.forEach((interest) => {
        const activityId = String(interest?.project_id || "").trim();
        const activity = workState.activitiesById.get(activityId);
        if (!activity) return;

        const category = String(activity?.activity_category || "").toLowerCase();
        if (!category.includes("assessment")) return;

        const taskTopics = DIGITAL_OUTCOME_DESCRIPTION_TASKS
            .concat(
                normalizeTaskTopicRows(activity?.tasks_list || activity?.tasksList)
            )
            .concat(
                normalizeTaskTopicRows(activity?.achieved || []),
                normalizeTaskTopicRows(activity?.merit || []),
                normalizeTaskTopicRows(activity?.excellence || [])
            );

        const uniqueTopicKeys = new Set();
        const uniqueTopics = [];
        taskTopics.forEach((topic) => {
            const key = normalizeTaskTopicText(topic).toLowerCase();
            if (!key || uniqueTopicKeys.has(key)) return;
            uniqueTopicKeys.add(key);
            uniqueTopics.push(topic);
        });

        if (!uniqueTopics.length) return;

        const standardNumber = extractPrimaryStandardNumber(activity);
        const students = Array.isArray(interest?.students) ? interest.students : [];

        students.forEach((student) => {
            const studentEmail = normalizeEmail(student?.email || student?.student_email || "");
            if (!studentEmail) return;

            const evidenceRows = Array.isArray(student?.evidence_steps) ? student.evidence_steps : [];
            uniqueTopics.forEach((taskTopic) => {
                const topicKey = normalizeTaskTopicText(taskTopic).toLowerCase();
                const standardKey = buildTaskTopicSubmissionStandardKey(taskTopic, standardNumber);
                const evidence = parseTaskTopicEvidence(evidenceRows, standardKey);

                records.push({
                    taskTopic,
                    topicKey,
                    activityId,
                    activityName: String(activity?.name || "Assessment Task").trim(),
                    studentEmail,
                    standardKey,
                    googleSlidesUrl: evidence.googleSlidesUrl,
                    links: evidence.links,
                    submitted: Boolean(evidence.submitted),
                    submittedAt: evidence.submittedAt,
                    taskUrl: `ProjectPages/activity-detail.html?id=${encodeURIComponent(activityId)}&taskTopic=${encodeURIComponent(taskTopic)}`
                });
            });
        });
    });

    return records;
}

function getOrderedTaskTopics() {
    const seen = new Set();
    const topics = [];

    workState.records.forEach((record) => {
        const key = String(record?.topicKey || "").trim().toLowerCase();
        if (!key || seen.has(key)) return;
        seen.add(key);
        topics.push(String(record?.taskTopic || "").trim());
    });

    return topics.sort((a, b) => a.localeCompare(b));
}

function findCanonicalTaskTopic(topic) {
    const selectedKey = normalizeTaskTopicText(topic).toLowerCase();
    if (!selectedKey) return "";

    const topics = getOrderedTaskTopics();
    const match = topics.find((item) => normalizeTaskTopicText(item).toLowerCase() === selectedKey);
    return match || "";
}

function updateTaskQueryParam(taskTopic) {
    const safeTask = String(taskTopic || "").trim();
    if (!safeTask) return;

    const url = new URL(window.location.href);
    url.searchParams.set("task", safeTask);
    window.history.replaceState({}, "", url.toString());
}

function navigateTaskByDelta(delta) {
    const offset = Number(delta || 0);
    if (!offset) return;

    const topics = getOrderedTaskTopics();
    if (!topics.length) return;

    const selectedKey = normalizeTaskTopicText(workState.selectedTask).toLowerCase();
    const index = topics.findIndex((topic) => normalizeTaskTopicText(topic).toLowerCase() === selectedKey);
    if (index < 0) return;

    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= topics.length) return;

    workState.selectedTask = topics[nextIndex];
    updateTaskQueryParam(workState.selectedTask);
    renderSelectedTaskPage();
}

function renderTaskPageNavigation() {
    if (!isTaskDetailPage() || !taskPageNav || !taskPrevButton || !taskNextButton || !taskCurrentLabel) {
        return;
    }

    const topics = getOrderedTaskTopics();
    if (!topics.length) {
        taskPageNav.hidden = true;
        return;
    }

    const selectedKey = normalizeTaskTopicText(workState.selectedTask).toLowerCase();
    const index = topics.findIndex((topic) => normalizeTaskTopicText(topic).toLowerCase() === selectedKey);

    if (index < 0) {
        taskPageNav.hidden = true;
        return;
    }

    taskPageNav.hidden = false;
    taskCurrentLabel.textContent = `Task ${index + 1} of ${topics.length}`;
    taskPrevButton.disabled = index === 0;
    taskNextButton.disabled = index === topics.length - 1;
}

function renderTaskLinks() {
    if (!taskLinkGrid) return;

    const grouped = new Map();
    workState.records.forEach((record) => {
        const key = record.topicKey;
        if (!grouped.has(key)) {
            grouped.set(key, {
                taskTopic: record.taskTopic,
                total: 0,
                slidesLinked: 0,
                submitted: 0
            });
        }

        const bucket = grouped.get(key);
        bucket.total += 1;
        if (record.googleSlidesUrl) bucket.slidesLinked += 1;
        if (record.submitted) bucket.submitted += 1;
    });

    const entries = Array.from(grouped.values()).sort((a, b) => a.taskTopic.localeCompare(b.taskTopic));
    if (!entries.length) {
        taskLinkGrid.innerHTML = `<div class="work-empty">No assessment task items found yet.</div>`;
        return;
    }

    taskLinkGrid.innerHTML = entries.map((item) => {
        const href = `teacher-student-work-task.html?task=${encodeURIComponent(item.taskTopic)}`;
        return `
            <article class="task-link-card">
                <h3>${escapeHtml(item.taskTopic)}</h3>
                <div class="task-link-meta">
                    <span>${item.total} student record${item.total === 1 ? "" : "s"}</span>
                    <span>${item.slidesLinked} Google Slides linked</span>
                    <span>${item.submitted} submitted</span>
                </div>
                <a href="${escapeHtml(href)}">Open page</a>
            </article>
        `;
    }).join("");
}

function renderSelectedTaskPage() {
    if (!tableHost || !trackerTitle || !trackerSummary) return;

    const selectedKey = normalizeTaskTopicText(workState.selectedTask).toLowerCase();
    if (!selectedKey) {
        trackerTitle.textContent = "Select a task item page";
        trackerSummary.innerHTML = "";
        tableHost.innerHTML = `<div class="work-empty">Choose a task item from the cards above to see student evidence in one place.</div>`;
        renderTaskPageNavigation();
        return;
    }

    const rows = workState.records
        .filter((record) => record.topicKey === selectedKey)
        .sort((left, right) => {
            if (left.activityName !== right.activityName) {
                return left.activityName.localeCompare(right.activityName);
            }
            return left.studentEmail.localeCompare(right.studentEmail);
        });

    trackerTitle.textContent = `${workState.selectedTask} - Student Evidence`;

    if (!rows.length) {
        trackerSummary.innerHTML = "";
        tableHost.innerHTML = `<div class="work-empty">No student rows found for this task item yet.</div>`;
        renderTaskPageNavigation();
        return;
    }

    const slidesLinked = rows.filter((row) => Boolean(row.googleSlidesUrl)).length;
    const submittedCount = rows.filter((row) => Boolean(row.submitted)).length;

    trackerSummary.innerHTML = `
        <span>Total records: ${rows.length}</span>
        <span>Google Slides linked: ${slidesLinked}</span>
        <span>Submitted: ${submittedCount}</span>
    `;

    tableHost.innerHTML = `
        <div class="work-table-wrap">
            <table class="work-table">
                <thead>
                    <tr>
                        <th>Student</th>
                        <th>Assessment Task</th>
                        <th>Google Slides</th>
                        <th>Submitted</th>
                        <th>Other Links</th>
                        <th>Open Task Item</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map((row) => {
                        const slidesCell = row.googleSlidesUrl
                            ? `<a href="${escapeHtml(row.googleSlidesUrl)}" target="_blank" rel="noreferrer">Open Slides</a> <span class="slides-pill is-linked">Linked</span>`
                            : `<span class="slides-pill is-missing">Missing</span>`;

                        const submittedCell = row.submitted
                            ? `<span class="submitted-pill">Yes - ${escapeHtml(formatSubmissionTimestamp(row.submittedAt))}</span>`
                            : `<span class="submitted-pill">No</span>`;

                        const otherLinks = row.links.filter((link) => link.url !== row.googleSlidesUrl);
                        const linksCell = otherLinks.length
                            ? `<div class="work-link-list">${otherLinks.map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`).join("")}</div>`
                            : "-";

                        return `
                            <tr>
                                <td>${escapeHtml(row.studentEmail)}</td>
                                <td>${escapeHtml(row.activityName)}</td>
                                <td>${slidesCell}</td>
                                <td>${submittedCell}</td>
                                <td>${linksCell}</td>
                                <td><a href="${escapeHtml(row.taskUrl)}" target="_blank" rel="noreferrer">Open</a></td>
                            </tr>
                        `;
                    }).join("")}
                </tbody>
            </table>
        </div>
    `;

    renderTaskPageNavigation();
}

function readSelectedTaskFromUrl() {
    const params = new URLSearchParams(window.location.search || "");
    workState.selectedTask = String(params.get("task") || "").trim();
}

function wireTaskNavigationEvents() {
    if (!taskPrevButton || !taskNextButton) return;
    taskPrevButton.addEventListener("click", () => navigateTaskByDelta(-1));
    taskNextButton.addEventListener("click", () => navigateTaskByDelta(1));
}

async function init() {
    try {
        setStatus("Checking access...");
        const accessOk = await enforceAccess();
        if (!accessOk) return;

        setStatus("Loading assessment tasks and student evidence...");
        const [activities, interests] = await Promise.all([
            fetchJson("/api/activities", { headers: withAuthHeaders() }),
            fetchJson("/api/project-interests", { headers: withAuthHeaders() })
        ]);

        const activityRows = Array.isArray(activities) ? activities : [];
        const interestRows = Array.isArray(interests) ? interests : [];
        workState.activitiesById = new Map(activityRows.map((row) => [String(row?.id || "").trim(), row]));
        workState.interestRows = interestRows;
        workState.records = buildAllRecords();
        readSelectedTaskFromUrl();

        const canonicalSelectedTask = findCanonicalTaskTopic(workState.selectedTask);
        if (canonicalSelectedTask) {
            workState.selectedTask = canonicalSelectedTask;
            updateTaskQueryParam(workState.selectedTask);
        } else if (isTaskDetailPage()) {
            const topics = getOrderedTaskTopics();
            if (topics.length) {
                workState.selectedTask = topics[0];
                updateTaskQueryParam(workState.selectedTask);
            }
        }

        wireTaskNavigationEvents();

        renderTaskLinks();
        renderSelectedTaskPage();
        setStatus("Student work task pages ready.");
    } catch (error) {
        setStatus(error?.message || "Could not load student work task pages.", true);
    }
}

init();
