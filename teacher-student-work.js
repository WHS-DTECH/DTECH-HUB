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
    studentNameByEmail: new Map(),
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

function compactLabel(value, maxLength = 24) {
    const text = String(value || "").trim();
    const limit = Number.isFinite(Number(maxLength)) ? Math.max(8, Math.round(Number(maxLength))) : 24;
    if (!text) return "";
    if (text.length <= limit) return text;
    return `${text.slice(0, Math.max(1, limit - 1)).trim()}...`;
}

function buildChipLink(url, label) {
    const safeUrl = String(url || "").trim();
    const fullLabel = String(label || "Link").trim() || "Link";
    const shortLabel = compactLabel(fullLabel);
    return `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noreferrer" title="${escapeHtml(fullLabel)}">${escapeHtml(shortLabel)}</a>`;
}

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function formatNameFromEmail(email) {
    const localPart = String(email || "").trim().toLowerCase().split("@")[0] || "";
    const parts = localPart
        .split(/[^a-z0-9]+/)
        .map((part) => part.trim())
        .filter(Boolean);

    if (!parts.length) {
        return String(email || "").trim();
    }

    return parts
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function buildStudentNameMap(students) {
    const map = new Map();
    const rows = Array.isArray(students) ? students : [];

    rows.forEach((student) => {
        const studentName = String(student?.student_name || student?.full_name || student?.name || "").trim();
        const linkedEmails = Array.isArray(student?.linked_emails) ? student.linked_emails : [];

        linkedEmails
            .map((email) => normalizeEmail(email))
            .filter(Boolean)
            .forEach((email) => {
                if (studentName) {
                    map.set(email, studentName);
                    return;
                }
                if (!map.has(email)) {
                    map.set(email, formatNameFromEmail(email));
                }
            });
    });

    return map;
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

function extractStandardNumbers(activity) {
    const rows = toArray(activity?.standard_details || activity?.standardDetails || activity?.assessment_focus || activity?.assessmentFocus);
    const seen = new Set();
    const output = [];

    rows.forEach((row) => {
        const matches = String(row || "").match(/\b\d{4,6}\b/g) || [];
        matches.forEach((match) => {
            const key = String(match || "").trim();
            if (!key || seen.has(key)) return;
            seen.add(key);
            output.push(key);
        });
    });

    const primary = extractPrimaryStandardNumber(activity);
    if (primary && !seen.has(primary)) {
        output.unshift(primary);
    }

    return output;
}

function normalizeTaskTopicText(value) {
    return String(value || "")
        .replace(/[\u2022\u25CF\u25E6\u25AA\u2023\u2043\u00B7\u2219]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function getTaskTopicGroup(topic) {
    const text = normalizeTaskTopicText(topic).toLowerCase();

    if (!text) return "other";

    if (
        /describe\s+the\s+digital\s+outcome|description\s*-\s*google\s+slides|target\s+audience|success\s+will\s+be\s+measured|outcome\s+will\s+be\s+developed/.test(text)
    ) {
        return "digital_outcome";
    }

    if (
        /effectively\s+using\s+project\s+management|trialling\s+multiple\s+components|using\s+information\s+appropriately\s+from\s+testing|addressing\s+relevant\s+implications/.test(text)
    ) {
        return "merit";
    }

    if (/discussing\s+how\s+the\s+information\s+from\s+planning|high-\s*quality\s+outcome/.test(text)) {
        return "excellence";
    }

    if (
        /using\s+appropriate\s+project\s+management|decompos|key\s+features\s+or\s+requirements|trialling\s+the\s+components|testing\s+that\s+the\s+digital\s+technologies\s+outcome\s+functions|explaining\s+relevant\s+implications/.test(text)
    ) {
        return "achieved";
    }

    return "other";
}

function getTaskTopicSubRank(topic, group) {
    const text = normalizeTaskTopicText(topic).toLowerCase();

    const orderMaps = {
        digital_outcome: [
            /description\s*-\s*google\s+slides|describe\s+the\s+digital\s+outcome/,
            /identify\s+the\s+target\s+audience/,
            /explain\s+how\s+the\s+outcome\s+will\s+be\s+developed/,
            /state\s+how\s+success\s+will\s+be\s+measured/
        ],
        achieved: [
            /using\s+appropriate\s+project\s+management/,
            /decompos/,
            /key\s+features\s+or\s+requirements/,
            /trialling\s+the\s+components/,
            /testing\s+that\s+the\s+digital\s+technologies\s+outcome\s+functions/,
            /explaining\s+relevant\s+implications/
        ],
        merit: [
            /effectively\s+using\s+project\s+management/,
            /trialling\s+multiple\s+components/,
            /using\s+information\s+appropriately\s+from\s+testing/,
            /addressing\s+relevant\s+implications/
        ],
        excellence: [
            /discussing\s+how\s+the\s+information\s+from\s+planning/
        ]
    };

    const patterns = orderMaps[group] || [];
    const index = patterns.findIndex((pattern) => pattern.test(text));
    return index >= 0 ? index + 1 : 999;
}

function compareTaskTopics(leftTopic, rightTopic) {
    const groupOrder = {
        digital_outcome: 1,
        achieved: 2,
        merit: 3,
        excellence: 4,
        other: 5
    };

    const leftGroup = getTaskTopicGroup(leftTopic);
    const rightGroup = getTaskTopicGroup(rightTopic);
    const leftGroupRank = groupOrder[leftGroup] || 99;
    const rightGroupRank = groupOrder[rightGroup] || 99;

    if (leftGroupRank !== rightGroupRank) {
        return leftGroupRank - rightGroupRank;
    }

    const leftSub = getTaskTopicSubRank(leftTopic, leftGroup);
    const rightSub = getTaskTopicSubRank(rightTopic, rightGroup);
    if (leftSub !== rightSub) {
        return leftSub - rightSub;
    }

    return String(leftTopic || "").localeCompare(String(rightTopic || ""));
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
                if (/trello\.com/i.test(link)) {
                    pushLink("Trello", link);
                } else if (/(onedrive\.live\.com|1drv\.ms|sharepoint\.com)/i.test(link)) {
                    pushLink("OneDrive", link);
                } else if (/drive\.google\.com/i.test(link)) {
                    pushLink("Google Drive", link);
                } else {
                    pushLink("Evidence Link", link);
                }
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

        if (text.startsWith("GOOGLE_DRIVE_PROJECT_FOLDER_URL|")) {
            pushLink("Google Drive", text.slice("GOOGLE_DRIVE_PROJECT_FOLDER_URL|".length).trim());
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

function inferGlobalWorkLinksFromEvidenceRows(evidenceRows) {
    const rows = Array.isArray(evidenceRows) ? evidenceRows : [];
    const links = [];
    const seen = new Set();

    const pushLink = (label, url) => {
        const safeUrl = toSafeExternalUrl(url);
        if (!safeUrl || seen.has(safeUrl)) return;
        seen.add(safeUrl);
        links.push({ label, url: safeUrl });
    };

    rows.forEach((row) => {
        const steps = Array.isArray(row?.steps) ? row.steps : [];
        steps.forEach((step) => {
            const text = String(step?.text || "").trim();
            if (!text) return;

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

            if (text.startsWith("LINK|")) {
                const rawLink = text.slice("LINK|".length).trim();
                if (/trello\.com/i.test(rawLink)) {
                    pushLink("Trello", rawLink);
                    return;
                }
                if (/(onedrive\.live\.com|1drv\.ms|sharepoint\.com)/i.test(rawLink)) {
                    pushLink("OneDrive", rawLink);
                    return;
                }
                if (/drive\.google\.com/i.test(rawLink)) {
                    pushLink("Google Drive", rawLink);
                    return;
                }
            }

            if (/trello\.com/i.test(text)) {
                const match = text.match(/https?:\/\/[^\s)]+/i);
                if (match?.[0]) {
                    pushLink("Trello", match[0]);
                    return;
                }
            }

            if (/(onedrive\.live\.com|1drv\.ms|sharepoint\.com)/i.test(text)) {
                const match = text.match(/https?:\/\/[^\s)]+/i);
                if (match?.[0]) {
                    pushLink("OneDrive", match[0]);
                }
                return;
            }

            if (/drive\.google\.com/i.test(text)) {
                const match = text.match(/https?:\/\/[^\s)]+/i);
                if (match?.[0]) {
                    pushLink("Google Drive", match[0]);
                }
            }
        });
    });

    return links;
}

function hasTaskTopicEvidence(result) {
    if (!result || typeof result !== "object") return false;
    return Boolean(
        result.googleSlidesUrl ||
        result.submitted ||
        result.submittedAt ||
        (Array.isArray(result.links) && result.links.length)
    );
}

function parseTaskTopicEvidenceForActivity(evidenceRows, taskTopic, standardNumbers) {
    const standards = Array.isArray(standardNumbers) ? standardNumbers : [];
    const candidateKeys = [];

    standards.forEach((standardNumber) => {
        const key = buildTaskTopicSubmissionStandardKey(taskTopic, standardNumber);
        if (key && !candidateKeys.includes(key)) {
            candidateKeys.push(key);
        }
    });

    const fallbackKey = buildTaskTopicSubmissionStandardKey(taskTopic, "");
    if (fallbackKey && !candidateKeys.includes(fallbackKey)) {
        candidateKeys.push(fallbackKey);
    }

    for (const standardKey of candidateKeys) {
        const parsed = parseTaskTopicEvidence(evidenceRows, standardKey);
        if (hasTaskTopicEvidence(parsed)) {
            return { evidence: parsed, matchedStandardKey: standardKey };
        }
    }

    const topicSlug = normalizeTaskTopicText(taskTopic)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    const rows = Array.isArray(evidenceRows) ? evidenceRows : [];
    const wildcardRow = rows.find((row) => {
        const standard = String(row?.standard || "").trim().toLowerCase();
        return standard.startsWith("task-topic:") && standard.endsWith(`:${topicSlug}`);
    });

    if (wildcardRow) {
        const wildcardKey = String(wildcardRow.standard || "").trim();
        const parsed = parseTaskTopicEvidence(evidenceRows, wildcardKey);
        return { evidence: parsed, matchedStandardKey: wildcardKey };
    }

    return {
        evidence: parseTaskTopicEvidence(evidenceRows, candidateKeys[0] || fallbackKey || ""),
        matchedStandardKey: candidateKeys[0] || fallbackKey || ""
    };
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

        const standardNumbers = extractStandardNumbers(activity);
        const students = Array.isArray(interest?.students) ? interest.students : [];

        students.forEach((student) => {
            const studentEmail = normalizeEmail(student?.email || student?.student_email || "");
            if (!studentEmail) return;

            const evidenceRows = Array.isArray(student?.evidence_steps) ? student.evidence_steps : [];
            uniqueTopics.forEach((taskTopic) => {
                const topicKey = normalizeTaskTopicText(taskTopic).toLowerCase();
                const resolved = parseTaskTopicEvidenceForActivity(evidenceRows, taskTopic, standardNumbers);
                const evidence = resolved.evidence;
                const isProjectManagementTopic = topicKey.includes("project management");
                const isVersionControlTopic = topicKey.includes("version control") || topicKey.includes("asset management");

                const mergedLinks = [];
                const seenMergedLink = new Set();
                const addMergedLink = (link) => {
                    const url = toSafeExternalUrl(link?.url);
                    const label = String(link?.label || "Link").trim() || "Link";
                    if (!url || seenMergedLink.has(url)) return;
                    seenMergedLink.add(url);
                    mergedLinks.push({ label, url });
                };

                (Array.isArray(evidence.links) ? evidence.links : []).forEach(addMergedLink);
                if (isProjectManagementTopic || isVersionControlTopic) {
                    inferGlobalWorkLinksFromEvidenceRows(evidenceRows).forEach(addMergedLink);
                }

                records.push({
                    taskTopic,
                    topicKey,
                    activityId,
                    activityName: String(activity?.name || "Assessment Task").trim(),
                    studentEmail,
                    studentName: String(workState.studentNameByEmail.get(studentEmail) || formatNameFromEmail(studentEmail) || studentEmail).trim(),
                    standardKey: String(resolved.matchedStandardKey || "").trim(),
                    googleSlidesUrl: evidence.googleSlidesUrl,
                    links: mergedLinks,
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

    return topics.sort((a, b) => compareTaskTopics(a, b));
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

    const entries = Array.from(grouped.values()).sort((a, b) => compareTaskTopics(a.taskTopic, b.taskTopic));
    if (!entries.length) {
        taskLinkGrid.innerHTML = `<div class="work-empty">No assessment task items found yet.</div>`;
        return;
    }

    const groupLabels = {
        digital_outcome: "Digital Outcome Description",
        achieved: "Achieved Tasks",
        merit: "Merit Tasks",
        excellence: "Excellence Tasks",
        other: "Other Tasks"
    };

    const groupedEntries = {
        digital_outcome: [],
        achieved: [],
        merit: [],
        excellence: [],
        other: []
    };

    entries.forEach((item) => {
        const group = getTaskTopicGroup(item.taskTopic);
        if (!groupedEntries[group]) {
            groupedEntries.other.push(item);
            return;
        }
        groupedEntries[group].push(item);
    });

    const orderedGroups = ["digital_outcome", "achieved", "merit", "excellence", "other"];
    taskLinkGrid.innerHTML = orderedGroups
        .filter((group) => groupedEntries[group].length > 0)
        .map((group) => {
            const cardsHtml = groupedEntries[group].map((item) => {
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

            return `
                <section class="task-link-group">
                    <h3>${escapeHtml(groupLabels[group] || "Task Group")}</h3>
                    <div class="task-link-grid-group">
                        ${cardsHtml}
                    </div>
                </section>
            `;
        })
        .join("");
}

function renderSelectedTaskPage() {
    if (!tableHost || !trackerTitle || !trackerSummary) return;

    const selectedKey = normalizeTaskTopicText(workState.selectedTask).toLowerCase();
    const isProjectManagementTask = selectedKey.includes("project management");
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
    const trelloLinked = rows.filter((row) => (Array.isArray(row.links) ? row.links : []).some((link) => /trello\.com/i.test(String(link?.url || "")))).length;
    const oneDriveLinked = rows.filter((row) => (Array.isArray(row.links) ? row.links : []).some((link) => /(onedrive\.live\.com|1drv\.ms|sharepoint\.com)/i.test(String(link?.url || "")))).length;
    const googleDriveLinked = rows.filter((row) => (Array.isArray(row.links) ? row.links : []).some((link) => /drive\.google\.com/i.test(String(link?.url || "")))).length;
    const submittedCount = rows.filter((row) => Boolean(row.submitted)).length;
    const studentGroups = new Map();
    rows.forEach((row) => {
        const key = row.studentEmail;
        if (!studentGroups.has(key)) {
            studentGroups.set(key, []);
        }
        studentGroups.get(key).push(row);
    });

    const students = Array.from(studentGroups.entries())
        .map(([studentEmail, entries]) => ({
            studentEmail,
            studentName: String(entries[0]?.studentName || workState.studentNameByEmail.get(studentEmail) || formatNameFromEmail(studentEmail) || studentEmail).trim(),
            entries: entries.slice().sort((left, right) => left.activityName.localeCompare(right.activityName))
        }))
        .sort((left, right) => left.studentName.localeCompare(right.studentName));

    trackerSummary.innerHTML = `
        <span>Total students: ${students.length}</span>
        <span>Total records: ${rows.length}</span>
        <span>Trello linked: ${trelloLinked}</span>
        <span>OneDrive linked: ${oneDriveLinked}</span>
        <span>Google Drive linked: ${googleDriveLinked}</span>
        <span>Submitted: ${submittedCount}</span>
    `;

    tableHost.innerHTML = `
        <div class="work-table-wrap">
            <table class="work-table ${isProjectManagementTask ? "is-project-management" : ""}">
                <thead>
                    <tr>
                        <th>Student</th>
                        <th>Assessment Tasks</th>
                        <th>Submitted</th>
                        ${isProjectManagementTask
                            ? `<th>Trello</th><th>OneDrive</th><th>Google Drive</th>`
                            : `<th>Other Links</th>`
                        }
                        <th>Open Task Items</th>
                    </tr>
                </thead>
                <tbody>
                    ${students.map((student) => {
                        const submittedEntries = student.entries.filter((entry) => Boolean(entry.submitted));

                        const submittedCell = submittedEntries.length
                            ? `<span class="submitted-pill">${submittedEntries.length}/${student.entries.length} submitted</span>`
                            : `<span class="submitted-pill">No</span>`;

                        const uniqueOtherLinks = [];
                        const seenOtherLink = new Set();
                        const trelloLinks = [];
                        const oneDriveLinks = [];
                        const googleDriveLinks = [];
                        const seenTrello = new Set();
                        const seenOneDrive = new Set();
                        const seenGoogleDrive = new Set();

                        const addCategorizedLink = (collection, seenSet, label, url) => {
                            const safeUrl = toSafeExternalUrl(url);
                            if (!safeUrl || seenSet.has(safeUrl)) return;
                            seenSet.add(safeUrl);
                            collection.push({ label, url: safeUrl });
                        };

                        student.entries.forEach((entry) => {
                            (Array.isArray(entry.links) ? entry.links : []).forEach((link) => {
                                const url = String(link?.url || "").trim();
                                if (!url || url === entry.googleSlidesUrl) return;

                                const activityLabel = compactLabel(entry.activityName, 16);
                                const label = `${activityLabel} ${String(link?.label || "Link").trim()}`;
                                if (/trello\.com/i.test(url)) {
                                    addCategorizedLink(trelloLinks, seenTrello, label, url);
                                    return;
                                }
                                if (/(onedrive\.live\.com|1drv\.ms|sharepoint\.com)/i.test(url)) {
                                    addCategorizedLink(oneDriveLinks, seenOneDrive, label, url);
                                    return;
                                }
                                if (/drive\.google\.com/i.test(url)) {
                                    addCategorizedLink(googleDriveLinks, seenGoogleDrive, label, url);
                                    return;
                                }

                                if (seenOtherLink.has(url)) return;
                                seenOtherLink.add(url);
                                uniqueOtherLinks.push({ label, url });
                            });
                        });

                        const linksCell = uniqueOtherLinks.length
                            ? `<div class="work-link-list">${uniqueOtherLinks.map((link) => buildChipLink(link.url, link.label)).join("")}</div>`
                            : "-";
                        const trelloCell = trelloLinks.length
                            ? `<div class="work-link-list">${trelloLinks.map((link) => buildChipLink(link.url, link.label)).join("")}</div>`
                            : "-";
                        const oneDriveCell = oneDriveLinks.length
                            ? `<div class="work-link-list">${oneDriveLinks.map((link) => buildChipLink(link.url, link.label)).join("")}</div>`
                            : "-";
                        const googleDriveCell = googleDriveLinks.length
                            ? `<div class="work-link-list">${googleDriveLinks.map((link) => buildChipLink(link.url, link.label)).join("")}</div>`
                            : "-";

                        const taskLinksCell = `<div class="work-link-list">${student.entries.map((entry) => buildChipLink(entry.taskUrl, entry.activityName)).join("")}</div>`;

                        const assessmentsCell = `<div class="work-link-list">${student.entries.map((entry) => `<span title="${escapeHtml(entry.activityName)}">${escapeHtml(compactLabel(entry.activityName))}</span>`).join("")}</div>`;

                        return `
                            <tr>
                                <td>${escapeHtml(student.studentName)}</td>
                                <td>${assessmentsCell}</td>
                                <td>${submittedCell}</td>
                                ${isProjectManagementTask
                                    ? `<td>${trelloCell}</td><td>${oneDriveCell}</td><td>${googleDriveCell}</td>`
                                    : `<td>${linksCell}</td>`
                                }
                                <td>${taskLinksCell}</td>
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
        const activities = await fetchJson("/api/activities", { headers: withAuthHeaders() });
        const classManagementPayload = await fetchJson("/api/class-management/students?current_only=false&dtech_only=false", { headers: withAuthHeaders() }).catch(() => ({}));

        const activityRows = Array.isArray(activities) ? activities : [];
        workState.studentNameByEmail = buildStudentNameMap(classManagementPayload?.students);
        const assessmentActivities = activityRows.filter((activity) => String(activity?.activity_category || activity?.category || "").toLowerCase().includes("assessment"));
        const interestRows = await Promise.all(
            assessmentActivities.map(async (activity) => {
                const projectId = String(activity?.id || "").trim();
                if (!projectId) return null;
                try {
                    const response = await fetchJson(`/api/activities/${encodeURIComponent(projectId)}/interests`, { headers: withAuthHeaders() });
                    return {
                        project_id: projectId,
                        students: Array.isArray(response?.students) ? response.students : []
                    };
                } catch (_error) {
                    return {
                        project_id: projectId,
                        students: []
                    };
                }
            })
        );
        workState.activitiesById = new Map(activityRows.map((row) => [String(row?.id || "").trim(), row]));
        workState.interestRows = interestRows.filter(Boolean);
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
