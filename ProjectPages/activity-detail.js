const DETAIL_DATA = {
    "cyber-safety-lab": {
        title: "Cyber Safety Lab",
        yearLevel: "Year 9",
        type: "Cyber Security",
        duration: "2 hrs",
        term: "Term 2",
        summary: "Learn password hygiene, phishing detection, and practical online safety routines through mini challenges.",
        resources: ["Case-study cards", "Security checklist", "Reflection template"],
        equipment: ["Laptop or Chromebook", "Internet access", "Presentation display"],
        instructions: ["Review real phishing examples.", "Classify risky vs safe online actions.", "Create a personal security action plan."],
        image: "https://placehold.co/900x560/6f35a2/ffffff?text=Cyber+Safety+Lab"
    },
    "data-visual-story": {
        title: "Data Visual Story",
        yearLevel: "Year 12",
        type: "Data Skills",
        duration: "2 hrs",
        term: "Term 2",
        summary: "Convert class data into clear visual dashboards and short evidence-based stories for assessment.",
        resources: ["Dataset CSV", "Storyboard worksheet", "Assessment rubric"],
        equipment: ["Spreadsheet tool", "Charting app", "Projector"],
        instructions: ["Clean and group the dataset.", "Create two chart options.", "Write a short data story and peer-review."],
        image: "https://placehold.co/900x560/3f9e70/ffffff?text=Data+Visual+Story"
    },
    "digital-portfolio-studio": {
        title: "Digital Portfolio Studio",
        yearLevel: "Year 11",
        type: "Digital Learning",
        duration: "2 hrs",
        term: "Term 1",
        summary: "Archive and polish published reflections, checkpoints, and final showcase evidence from prior units.",
        resources: ["Portfolio checklist", "Evidence tracker", "Reflection prompts"],
        equipment: ["Laptop", "Portfolio platform", "Cloud storage"],
        instructions: ["Audit current portfolio pages.", "Upload missing evidence.", "Improve reflection quality and structure."],
        image: "https://placehold.co/900x560/6a58b5/ffffff?text=Digital+Portfolio+Studio"
    },
    "maker-lab-builds": {
        title: "Maker Lab Builds",
        yearLevel: "Year 13",
        type: "STEM Projects",
        duration: "2 hrs",
        term: "Term 1",
        summary: "Archive prototypes, sprint notes, and build logs from fabrication and automation challenges.",
        resources: ["Design journal", "Build checklist", "Testing log template"],
        equipment: ["Prototype materials", "Workshop tools", "Safety gear"],
        instructions: ["Review latest prototype version.", "Record test outcomes.", "Plan and document next iteration."],
        image: "https://placehold.co/900x560/676c86/ffffff?text=Maker+Lab+Builds"
    },
    "python-debug-lab": {
        title: "Python Debug Lab",
        yearLevel: "Year 11",
        type: "Programming",
        duration: "2 hrs",
        term: "Term 2",
        summary: "Track down logic bugs, run tests, and improve code quality with guided debugging missions.",
        resources: ["Bug scenario sheets", "Test cases", "Reflection form"],
        equipment: ["Python IDE", "Terminal", "Version control workspace"],
        instructions: ["Run failing script and inspect errors.", "Apply debugging strategy step-by-step.", "Commit fixed version with notes."],
        image: "https://placehold.co/900x560/b15186/ffffff?text=Python+Debug+Lab"
    },
    "robotics-control-board": {
        title: "Robotics Control Board",
        yearLevel: "Year 12",
        type: "Physical Computing",
        duration: "2 hrs",
        term: "Term 2",
        summary: "Build and monitor microcontroller projects, capture test data, and document each hardware iteration.",
        resources: ["Circuit plan", "Sensor worksheet", "Data capture table"],
        equipment: ["Microcontroller kit", "Breadboard and wires", "Laptop with serial monitor"],
        instructions: ["Assemble control-board layout.", "Upload and test baseline program.", "Tune behavior and document outcomes."],
        image: "https://placehold.co/900x560/2f95b2/ffffff?text=Robotics+Control+Board"
    },
    "web-ui-remix": {
        title: "Web UI Remix",
        yearLevel: "Year 10",
        type: "Web Design",
        duration: "2 hrs",
        term: "Term 2",
        summary: "Re-style an existing page with stronger visual hierarchy, accessibility checks, and responsive layout improvements.",
        resources: ["UI checklist", "Wireframe sketch sheet", "Accessibility notes"],
        equipment: ["Code editor", "Browser devtools", "Reference design board"],
        instructions: ["Audit current layout issues.", "Apply typography and spacing updates.", "Validate responsiveness and accessibility."],
        image: "https://placehold.co/900x560/b67a3c/ffffff?text=Web+UI+Remix"
    }
};

const DETAIL_HUB_AUTH_STORAGE_KEY = "hub_google_auth_v1";
const TRELLO_CARD_LINK_STORAGE_PREFIX = "hub_trello_card_link_v1";
const EVIDENCE_STEPS_TARGET_STANDARDS = new Set(["92005", "91897", "91907"]);
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

const detailAllowedDomain =
    (document.querySelector('meta[name="hub-google-allowed-domain"]')?.content || "")
        .trim()
        .toLowerCase();

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function toSafeExternalUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";

    try {
        const parsed = new URL(raw);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
            return parsed.toString();
        }
    } catch (_error) {
        return "";
    }

    return "";
}

function parseDurationMinutes(raw) {
    const source = String(raw || "").trim().toLowerCase();
    const parsed = Number.parseInt(source.replace(/[^0-9]/g, ""), 10);
    if (!Number.isInteger(parsed) || parsed <= 0) return 120;
    if (source.includes("hr")) {
        return parsed * 60;
    }
    return parsed;
}

function asLines(value) {
    if (!Array.isArray(value)) return "";
    return value.join("\n");
}

function parseLines(value) {
    return String(value || "")
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function parseRequirementLines(value) {
    const lines = parseLines(value);
    const results = [];
    const bulletSplitRegex = /[\u2022\u25CF\u25E6\u25AA\u2023\u2043\u00B7\u2219]/;
    const bulletStartRegex = /^[\s\u2022\u25CF\u25E6\u25AA\u2023\u2043\u00B7\u2219]/;

    lines.forEach((line) => {
        const text = String(line || "").trim();
        if (!text) return;

        const withoutLevel = text.replace(/^(Achieved|Merit|Excellence)\s*:\s*/i, "").trim();
        if (!bulletSplitRegex.test(withoutLevel)) {
            results.push(withoutLevel.replace(/^[\-*]\s*/, "").trim());
            return;
        }

        const segments = withoutLevel
            .split(bulletSplitRegex)
            .map((segment) => segment.replace(/^[\-*]\s*/, "").trim())
            .filter(Boolean);

        if (!segments.length) return;
        const useAllSegments = bulletStartRegex.test(withoutLevel);
        const selected = useAllSegments ? segments : segments.slice(1);
        selected.forEach((segment) => {
            if (segment) results.push(segment);
        });
    });

    return results.filter(Boolean);
}

function coerceArray(value) {
    if (Array.isArray(value)) {
        return value.map((item) => String(item || "").trim()).filter(Boolean);
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) {
            return [];
        }

        if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("\"") && trimmed.endsWith("\""))) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    return parsed.map((item) => String(item || "").trim()).filter(Boolean);
                }
            } catch (_error) {
            }
        }

        return trimmed
            .split(/\r?\n/)
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
}

function splitRequirementSegments(value) {
    return parseRequirementLines(value);
}

function formatRequirementSteps(values, levelLabel) {
    const prefix = `${levelLabel}:`;
    return coerceArray(values)
        .flatMap((line) => splitRequirementSegments(line))
        .map((line) => (line.toLowerCase().startsWith(prefix.toLowerCase()) ? line : `${prefix} ${line}`))
        .filter(Boolean);
}

function buildRequirementSidebarSteps(detailData) {
    const achievedSteps = formatRequirementSteps(detailData?.achieved, "Achieved");
    const meritSteps = formatRequirementSteps(detailData?.merit, "Merit");
    const excellenceSteps = formatRequirementSteps(detailData?.excellence, "Excellence");
    return [...achievedSteps, ...meritSteps, ...excellenceSteps];
}

function buildTaskDefaultsByStandard(standards, detailData) {
    const requirementSteps = buildRequirementSidebarSteps(detailData);
    const map = {};
    (Array.isArray(standards) ? standards : []).forEach((code) => {
        const standardCode = String(code || "").trim();
        if (standardCode === "91897" && requirementSteps.length) {
            map[code] = requirementSteps;
            return;
        }

        map[code] = Array.isArray(EVIDENCE_STEPS_DEFAULTS[standardCode]) ? EVIDENCE_STEPS_DEFAULTS[standardCode] : [];
    });
    return map;
}

function expandBulletChecklistRows(rows) {
    const source = Array.isArray(rows) ? rows : [];
    const expanded = [];

    source.forEach((row) => {
        const text = String(row?.text || "").trim();
        const done = Boolean(row?.done);
        if (!text) {
            return;
        }

        const levelMatch = text.match(/^(Achieved|Merit|Excellence):\s*/i);
        const levelPrefix = levelMatch ? `${levelMatch[1]}: ` : "";
        const body = levelMatch ? text.replace(/^(Achieved|Merit|Excellence):\s*/i, "").trim() : text;

        const parts = body
            .replace(/\u2022/g, "•")
            .split("•")
            .map((item) => item.trim())
            .filter(Boolean);

        if (parts.length > 1) {
            parts.slice(1).forEach((item) => {
                expanded.push({ text: `${levelPrefix}${item}`, done });
            });
            return;
        }

        expanded.push({ text, done });
    });

    return expanded;
}

function normalize91897RowsWithRequirementFallback(existingRows, defaultRows) {
    const expandedExisting = expandBulletChecklistRows(existingRows);
    const defaults = Array.isArray(defaultRows)
        ? defaultRows.map((text) => ({ text: String(text || "").trim(), done: false })).filter((row) => row.text)
        : [];

    if (!defaults.length) {
        return expandedExisting;
    }

    const getLevel = (text) => {
        const raw = String(text || "").trim().toLowerCase();
        if (raw.startsWith("achieved:")) return "achieved";
        if (raw.startsWith("merit:")) return "merit";
        if (raw.startsWith("excellence:")) return "excellence";
        return "";
    };

    const existingCounts = { achieved: 0, merit: 0, excellence: 0 };
    const defaultCounts = { achieved: 0, merit: 0, excellence: 0 };

    expandedExisting.forEach((row) => {
        const level = getLevel(row?.text);
        if (level) existingCounts[level] += 1;
    });
    defaults.forEach((row) => {
        const level = getLevel(row?.text);
        if (level) defaultCounts[level] += 1;
    });

    // Legacy shape to migrate: one long line per level while defaults have multiple items.
    const shouldRebuildFromRequirements =
        expandedExisting.length <= 3 ||
        existingCounts.achieved < defaultCounts.achieved ||
        existingCounts.merit < defaultCounts.merit ||
        existingCounts.excellence < defaultCounts.excellence;

    if (!shouldRebuildFromRequirements) {
        return expandedExisting;
    }

    const doneByText = new Map();
    expandedExisting.forEach((row) => {
        const key = String(row?.text || "").trim().toLowerCase();
        if (!key) return;
        doneByText.set(key, Boolean(row?.done));
    });

    return defaults.map((row) => {
        const key = String(row.text || "").trim().toLowerCase();
        return {
            text: row.text,
            done: doneByText.get(key) || false
        };
    });
}

function normalizeStudentEmailInput(value) {
    const trimmed = String(value || "").trim().toLowerCase();
    if (!trimmed) return "";
    if (trimmed.includes("@")) return trimmed;
    if (detailAllowedDomain) {
        return `${trimmed}@${detailAllowedDomain}`;
    }
    return trimmed;
}

function normalizeCardCategory(value, fallback = "Activity") {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return fallback;

    if (raw === "project") return "Project";
    if (raw === "lesson") return "Lesson";
    if (raw === "assessment task" || raw === "assessment activity" || raw === "assessment") return "Assessment Task";
    if (raw === "activity" || raw === "skill activity" || raw === "practice" || raw === "practice activity") return "Activity";

    return fallback;
}

function isGeneratedUploadedActivityImageUrl(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) {
        return false;
    }

    return raw.includes("placehold.co/900x560/3f89cf/ffffff")
        && raw.includes("uploaded+activity");
}

function readStoredHubEmail() {
    const raw = localStorage.getItem(DETAIL_HUB_AUTH_STORAGE_KEY) || sessionStorage.getItem(DETAIL_HUB_AUTH_STORAGE_KEY);
    if (!raw) return "";

    try {
        const parsed = JSON.parse(raw);
        return String(parsed?.profile?.email || "").trim().toLowerCase();
    } catch (_error) {
        return "";
    }
}

function buildWriteHeaders() {
    const email = readStoredHubEmail();
    const headers = { "Content-Type": "application/json" };
    if (email) {
        headers["x-user-email"] = email;
    }
    return headers;
}

function getTrelloCardStorageKey(projectId, email) {
    return `${TRELLO_CARD_LINK_STORAGE_PREFIX}:${String(projectId || "").trim()}:${String(email || "").trim().toLowerCase()}`;
}

function readStoredTrelloCardLink(projectId, email) {
    const storageKey = getTrelloCardStorageKey(projectId, email);
    try {
        return String(localStorage.getItem(storageKey) || "").trim();
    } catch (_error) {
        return "";
    }
}

function writeStoredTrelloCardLink(projectId, email, value) {
    const storageKey = getTrelloCardStorageKey(projectId, email);
    const nextValue = String(value || "").trim();
    try {
        if (!nextValue) {
            localStorage.removeItem(storageKey);
            return;
        }
        localStorage.setItem(storageKey, nextValue);
    } catch (_error) {
    }
}

function toSafeTrelloCardUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";

    try {
        const parsed = new URL(raw);
        const host = String(parsed.hostname || "").toLowerCase();
        if (!(host === "trello.com" || host.endsWith(".trello.com"))) {
            return "";
        }

        const match = parsed.pathname.match(/\/c\/([a-zA-Z0-9]+)/i);
        if (!match?.[1]) {
            return "";
        }

        return `https://trello.com/c/${match[1]}`;
    } catch (_error) {
        return "";
    }
}

function toStandardCode(value) {
    const match = String(value || "").match(/\b\d{5}\b/);
    return match ? match[0] : "";
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

function evidenceMapToRows(state, standards) {
    return normalizeEvidenceSteps(
        (Array.isArray(standards) ? standards : []).map((standard) => ({
            standard,
            steps: Array.isArray(state?.[standard]) ? state[standard] : []
        }))
    );
}

function getEvidenceCompletionPercentFromRows(rows, standards) {
    const map = evidenceRowsToMap(rows);
    const targetStandards = Array.isArray(standards) ? standards : [];
    let total = 0;
    let done = 0;

    targetStandards.forEach((standard) => {
        const items = Array.isArray(map[standard]) ? map[standard] : [];
        items.forEach((item) => {
            if (!String(item?.text || "").trim()) {
                return;
            }
            total += 1;
            if (Boolean(item?.done)) {
                done += 1;
            }
        });
    });

    if (!total) {
        return 0;
    }

    return Math.round((done / total) * 100);
}

async function fetchEvidenceRows(projectId, studentEmail) {
    const response = await fetch(`/api/activities/${encodeURIComponent(projectId)}/interests/${encodeURIComponent(studentEmail)}/evidence`, {
        headers: buildWriteHeaders()
    });

    if (!response.ok) {
        throw new Error("Could not load evidence steps.");
    }

    const payload = await response.json().catch(() => ({}));
    return normalizeEvidenceSteps(payload?.evidence_steps);
}

async function saveEvidenceRows(projectId, studentEmail, rows) {
    const response = await fetch(`/api/activities/${encodeURIComponent(projectId)}/interests/${encodeURIComponent(studentEmail)}/evidence`, {
        method: "PATCH",
        headers: buildWriteHeaders(),
        body: JSON.stringify({ evidence_steps: normalizeEvidenceSteps(rows) })
    });

    if (!response.ok) {
        throw new Error("Could not save evidence steps.");
    }
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

function parseTaskTopicSubmissionFromEvidenceRows(rows, standardKey) {
    const normalizedRows = normalizeEvidenceSteps(rows);
    const source = normalizedRows.find((row) => String(row?.standard || "").trim() === standardKey);
    const result = {
        writtenEvidence: "",
        evidenceLink: "",
        fileName: "",
        fileUrl: "",
        haparaAcknowledged: false,
        haparaSubmittedAt: "",
        haparaLocation: "",
        haparaDriveClassUrl: "",
        haparaDocumentRef: "",
        trelloCardUrl: "",
        trelloLastLogDate: "",
        trelloLastLogAt: "",
        trelloLastLogNote: "",
        mediaAssetFolderUrl: "",
        mediaReviewUrl: "",
        mediaVersionLogDate: "",
        mediaVersionLogAt: "",
        mediaVersionLogNote: "",
        submittedAt: "",
        reviewStatus: "pending"
    };

    if (!source || !Array.isArray(source.steps)) {
        return result;
    }

    source.steps.forEach((step) => {
        const text = String(step?.text || "").trim();
        if (!text) {
            return;
        }

        if (text.startsWith("WRITTEN|")) {
            result.writtenEvidence = text.slice("WRITTEN|".length).trim();
            return;
        }

        if (text.startsWith("LINK|")) {
            result.evidenceLink = text.slice("LINK|".length).trim();
            return;
        }

        if (text.startsWith("FILE|")) {
            result.fileName = text.slice("FILE|".length).trim();
            return;
        }

        if (text.startsWith("FILE_URL|")) {
            result.fileUrl = text.slice("FILE_URL|".length).trim();
            return;
        }

        if (text.startsWith("HAPARA_ACK|")) {
            const value = text.slice("HAPARA_ACK|".length).trim().toLowerCase();
            result.haparaAcknowledged = value === "true" || value === "1" || value === "yes";
            return;
        }

        if (text.startsWith("HAPARA_SUBMITTED_AT|")) {
            result.haparaSubmittedAt = text.slice("HAPARA_SUBMITTED_AT|".length).trim();
            return;
        }

        if (text.startsWith("HAPARA_LOCATION|")) {
            result.haparaLocation = text.slice("HAPARA_LOCATION|".length).trim();
            return;
        }

        if (text.startsWith("HAPARA_CLASS_DRIVE|")) {
            result.haparaDriveClassUrl = text.slice("HAPARA_CLASS_DRIVE|".length).trim();
            return;
        }

        if (text.startsWith("HAPARA_DOC_REF|")) {
            result.haparaDocumentRef = text.slice("HAPARA_DOC_REF|".length).trim();
            return;
        }

        if (text.startsWith("TRELLO_CARD_URL|")) {
            result.trelloCardUrl = toSafeTrelloCardUrl(text.slice("TRELLO_CARD_URL|".length).trim());
            return;
        }

        if (text.startsWith("TRELLO_LAST_LOG_DATE|")) {
            result.trelloLastLogDate = text.slice("TRELLO_LAST_LOG_DATE|".length).trim();
            return;
        }

        if (text.startsWith("TRELLO_LAST_LOG_AT|")) {
            result.trelloLastLogAt = text.slice("TRELLO_LAST_LOG_AT|".length).trim();
            return;
        }

        if (text.startsWith("TRELLO_LAST_LOG_NOTE|")) {
            result.trelloLastLogNote = text.slice("TRELLO_LAST_LOG_NOTE|".length).trim();
            return;
        }

        if (text.startsWith("MEDIA_ASSET_FOLDER_URL|")) {
            result.mediaAssetFolderUrl = toSafeExternalUrl(text.slice("MEDIA_ASSET_FOLDER_URL|".length).trim());
            return;
        }

        if (text.startsWith("MEDIA_REVIEW_URL|")) {
            result.mediaReviewUrl = toSafeExternalUrl(text.slice("MEDIA_REVIEW_URL|".length).trim());
            return;
        }

        if (text.startsWith("MEDIA_VERSION_LOG_DATE|")) {
            result.mediaVersionLogDate = text.slice("MEDIA_VERSION_LOG_DATE|".length).trim();
            return;
        }

        if (text.startsWith("MEDIA_VERSION_LOG_AT|")) {
            result.mediaVersionLogAt = text.slice("MEDIA_VERSION_LOG_AT|".length).trim();
            return;
        }

        if (text.startsWith("MEDIA_VERSION_LOG_NOTE|")) {
            result.mediaVersionLogNote = text.slice("MEDIA_VERSION_LOG_NOTE|".length).trim();
            return;
        }

        if (text.startsWith("SUBMITTED_AT|")) {
            result.submittedAt = text.slice("SUBMITTED_AT|".length).trim();
            return;
        }

        if (text.startsWith("REVIEW|")) {
            const status = text.slice("REVIEW|".length).trim().toLowerCase();
            if (status === "reviewed") {
                result.reviewStatus = "reviewed";
            } else if (status === "needs_changes" || status === "needs-changes" || status === "needs changes") {
                result.reviewStatus = "needs_changes";
            } else {
                result.reviewStatus = "pending";
            }
        }
    });

    return result;
}

function upsertTaskTopicSubmissionEvidenceRows(rows, standardKey, payload) {
    const sourceRows = normalizeEvidenceSteps(rows).filter(
        (row) => String(row?.standard || "").trim() !== standardKey
    );

    const writtenEvidence = String(payload?.writtenEvidence || "").trim();
    const evidenceLink = toSafeExternalUrl(payload?.evidenceLink);
    const fileName = String(payload?.fileName || "").trim();
    const fileUrl = String(payload?.fileUrl || "").trim();
    const submittedAt = String(payload?.submittedAt || "").trim();
    const haparaAcknowledged = Boolean(payload?.haparaAcknowledged);
    const haparaSubmittedAt = String(payload?.haparaSubmittedAt || "").trim();
    const haparaLocation = String(payload?.haparaLocation || "").trim();
    const haparaDriveClassUrl = String(payload?.haparaDriveClassUrl || "").trim();
    const haparaDocumentRef = String(payload?.haparaDocumentRef || "").trim();
    const trelloCardUrl = toSafeTrelloCardUrl(payload?.trelloCardUrl);
    const trelloLastLogDate = String(payload?.trelloLastLogDate || "").trim();
    const trelloLastLogAt = String(payload?.trelloLastLogAt || "").trim();
    const trelloLastLogNote = String(payload?.trelloLastLogNote || "").trim();
    const mediaAssetFolderUrl = toSafeExternalUrl(payload?.mediaAssetFolderUrl);
    const mediaReviewUrl = toSafeExternalUrl(payload?.mediaReviewUrl);
    const mediaVersionLogDate = String(payload?.mediaVersionLogDate || "").trim();
    const mediaVersionLogAt = String(payload?.mediaVersionLogAt || "").trim();
    const mediaVersionLogNote = String(payload?.mediaVersionLogNote || "").trim();
    const reviewStatusRaw = String(payload?.reviewStatus || "").trim().toLowerCase();
    const reviewStatus = reviewStatusRaw === "reviewed"
        ? "reviewed"
        : (reviewStatusRaw === "needs_changes" || reviewStatusRaw === "needs-changes" || reviewStatusRaw === "needs changes")
            ? "needs_changes"
            : "pending";

    const steps = [];
    if (writtenEvidence) {
        steps.push({ text: `WRITTEN|${writtenEvidence}`, done: true });
    }
    if (evidenceLink) {
        steps.push({ text: `LINK|${evidenceLink}`, done: true });
    }
    if (fileName) {
        steps.push({ text: `FILE|${fileName}`, done: true });
    }
    if (fileUrl) {
        steps.push({ text: `FILE_URL|${fileUrl}`, done: true });
    }
    if (submittedAt) {
        steps.push({ text: `SUBMITTED_AT|${submittedAt}`, done: true });
    }
    steps.push({ text: `HAPARA_ACK|${haparaAcknowledged ? "true" : "false"}`, done: haparaAcknowledged });
    if (haparaSubmittedAt) {
        steps.push({ text: `HAPARA_SUBMITTED_AT|${haparaSubmittedAt}`, done: true });
    }
    if (haparaLocation) {
        steps.push({ text: `HAPARA_LOCATION|${haparaLocation}`, done: true });
    }
    if (haparaDriveClassUrl) {
        steps.push({ text: `HAPARA_CLASS_DRIVE|${haparaDriveClassUrl}`, done: true });
    }
    if (haparaDocumentRef) {
        steps.push({ text: `HAPARA_DOC_REF|${haparaDocumentRef}`, done: true });
    }
    if (trelloCardUrl) {
        steps.push({ text: `TRELLO_CARD_URL|${trelloCardUrl}`, done: true });
    }
    if (trelloLastLogDate) {
        steps.push({ text: `TRELLO_LAST_LOG_DATE|${trelloLastLogDate}`, done: true });
    }
    if (trelloLastLogAt) {
        steps.push({ text: `TRELLO_LAST_LOG_AT|${trelloLastLogAt}`, done: true });
    }
    if (trelloLastLogNote) {
        steps.push({ text: `TRELLO_LAST_LOG_NOTE|${trelloLastLogNote}`, done: true });
    }
    if (mediaAssetFolderUrl) {
        steps.push({ text: `MEDIA_ASSET_FOLDER_URL|${mediaAssetFolderUrl}`, done: true });
    }
    if (mediaReviewUrl) {
        steps.push({ text: `MEDIA_REVIEW_URL|${mediaReviewUrl}`, done: true });
    }
    if (mediaVersionLogDate) {
        steps.push({ text: `MEDIA_VERSION_LOG_DATE|${mediaVersionLogDate}`, done: true });
    }
    if (mediaVersionLogAt) {
        steps.push({ text: `MEDIA_VERSION_LOG_AT|${mediaVersionLogAt}`, done: true });
    }
    if (mediaVersionLogNote) {
        steps.push({ text: `MEDIA_VERSION_LOG_NOTE|${mediaVersionLogNote}`, done: true });
    }
    steps.push({ text: `REVIEW|${reviewStatus}`, done: reviewStatus === "reviewed" });

    sourceRows.push({ standard: standardKey, steps });
    return sourceRows;
}

function formatSubmissionTimestamp(value) {
    const raw = String(value || "").trim();
    if (!raw) {
        return "Not submitted yet";
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
        return raw;
    }

    return parsed.toLocaleString();
}

function getReviewStatusLabel(value) {
    const status = String(value || "").trim().toLowerCase();
    if (status === "reviewed") {
        return "Reviewed";
    }
    if (status === "needs_changes" || status === "needs-changes" || status === "needs changes") {
        return "Needs changes";
    }
    return "Pending review";
}

function getNzDateKey(date = new Date()) {
    try {
        return new Intl.DateTimeFormat("en-CA", {
            timeZone: "Pacific/Auckland",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).format(date);
    } catch (_error) {
        return new Date(date).toISOString().slice(0, 10);
    }
}

async function renderTaskTopicSubmissionPanel({ host, projectId, detailData, email, isTeacher, interestData }) {
    const panelHost = host?.querySelector("#task-topic-submission-live-panel");
    if (!panelHost) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const taskTopicTitle = String(params.get("taskTopic") || "").trim();
    const taskTopicShortName = String(params.get("taskShortName") || "").trim();
    if (!taskTopicTitle) {
        panelHost.innerHTML = "";
        return;
    }

    if (!email) {
        panelHost.innerHTML = `<p class="task-topic-submission-note">Sign in to submit your evidence for this task topic.</p>`;
        return;
    }

    const standardNumber = extractPrimaryStandardNumberFromRows(coerceArray(detailData?.standardDetails));
    const standardKey = buildTaskTopicSubmissionStandardKey(taskTopicTitle, standardNumber);
    const isRelevantImplicationsTopic = taskTopicTitle.toLowerCase().includes("relevant implication");
    const normalizedDerivedShortName = deriveTaskShortName(taskTopicTitle).toLowerCase();
    const normalizedTaskTopicShortName = taskTopicShortName.toLowerCase();
    const isProjectManagementTopic = taskTopicTitle.toLowerCase().includes("project management")
        || normalizedTaskTopicShortName.includes("project management")
        || normalizedDerivedShortName.includes("project management");
    const isAssetVersionControlTopic = taskTopicTitle.toLowerCase().includes("asset management")
        || taskTopicTitle.toLowerCase().includes("version control")
        || normalizedTaskTopicShortName.includes("asset management")
        || normalizedTaskTopicShortName.includes("version control")
        || normalizedDerivedShortName.includes("asset management")
        || normalizedDerivedShortName.includes("version control");
    const isMediaAssetWorkflowTopic = isAssetVersionControlTopic && !isProjectManagementTopic;
    const isTrackedWorkflowTopic = isProjectManagementTopic || isMediaAssetWorkflowTopic;
    const haparaWorkspacePublicUrl = "https://bit.ly/4uO74lI";
    const haparaWorkspaceEmbedUrl = "https://workspace.teacherdashboard.com/public/#/w/6a1cc0549131d4df96cb4f7f?embed=true";
    const haparaClassDriveUrl = "https://app.hapara.com/dashboard/drive/4-1-12comp-vp-2026@westlandhigh.school.nz/all";
    const shouldShowHaparaEmbed = isRelevantImplicationsTopic;
    const haparaSpaceName = isRelevantImplicationsTopic
        ? "Relevant Implication Documentation"
        : "Workspace Evidence";
    const haparaEmbedHtml = shouldShowHaparaEmbed
        ? `
            <section class="proposal-section task-topic-submission-panel task-topic-hapara-embed-panel">
                <h2>Hapara Workspace</h2>
                <p class="task-topic-submission-intro">Use this embedded workspace to upload your write-up to <strong>${escapeHtml(haparaSpaceName)}</strong>.</p>
                <div class="task-topic-hapara-embed-wrap">
                    <iframe
                        class="task-topic-hapara-embed"
                        src="${escapeHtml(haparaWorkspaceEmbedUrl)}"
                        title="Hapara Relevant Implication Documentation"
                        loading="lazy"
                        referrerpolicy="strict-origin-when-cross-origin"
                        allowfullscreen
                    ></iframe>
                </div>
                <p class="task-topic-hapara-embed-link"><a href="${escapeHtml(haparaWorkspacePublicUrl)}" target="_blank" rel="noreferrer">Open Hapara in a new tab</a></p>
            </section>
        `
        : "";

    if (isTeacher) {
        const students = Array.isArray(interestData?.students) ? interestData.students : [];
        if (!students.length) {
            panelHost.innerHTML = `<p class="task-topic-submission-note">No allocated students yet. Add or confirm a student first, then Hapara acknowledgement statuses will appear here.</p>`;
            return;
        }

        const rows = students
            .map((student) => {
                const studentEmail = String(student?.email || "").trim().toLowerCase();
                if (!studentEmail) {
                    return null;
                }

                const submission = parseTaskTopicSubmissionFromEvidenceRows(student?.evidence_steps, standardKey);
                return {
                    email: studentEmail,
                    acknowledged: Boolean(submission.haparaAcknowledged),
                    submittedAt: submission.haparaSubmittedAt || submission.submittedAt || "",
                    trelloCardUrl: submission.trelloCardUrl || "",
                    mediaAssetFolderUrl: submission.mediaAssetFolderUrl || "",
                    mediaReviewUrl: submission.mediaReviewUrl || "",
                    docRef: submission.haparaDocumentRef || "",
                    lastLogDate: String(submission.trelloLastLogDate || "").trim(),
                    lastLogAt: String(submission.trelloLastLogAt || "").trim(),
                    mediaLastVersionLogDate: String(submission.mediaVersionLogDate || "").trim(),
                    mediaLastVersionLogAt: String(submission.mediaVersionLogAt || "").trim()
                };
            })
            .filter(Boolean);

        const todayNz = getNzDateKey();
        const missingPrimaryLinkRows = rows.filter((row) => {
            if (isProjectManagementTopic) {
                return !String(row.trelloCardUrl || "").trim();
            }
            if (isMediaAssetWorkflowTopic) {
                return !String(row.mediaAssetFolderUrl || "").trim();
            }
            return false;
        });
        const missingLogRows = rows.filter((row) => {
            if (isProjectManagementTopic) {
                return row.lastLogDate !== todayNz;
            }
            if (isMediaAssetWorkflowTopic) {
                return row.mediaLastVersionLogDate !== todayNz;
            }
            return false;
        });
        const loggedTodayCount = rows.filter((row) => {
            if (isProjectManagementTopic) {
                return row.lastLogDate === todayNz;
            }
            if (isMediaAssetWorkflowTopic) {
                return row.mediaLastVersionLogDate === todayNz;
            }
            return false;
        }).length;
        const summaryPrimaryLabel = isProjectManagementTopic ? "Missing Trello Link" : "Missing Asset Folder Link";
        const summaryLogLabel = isProjectManagementTopic ? "Missing Today's Log" : "Missing Today's Version Log";
        const logCompleteText = isProjectManagementTopic ? "Logged today" : "Version log updated today";
        const logMissingText = isProjectManagementTopic ? "Missing today's log" : "Missing today's version log";

        if (!rows.length) {
            panelHost.innerHTML = `<p class="task-topic-submission-note">No student records are ready for acknowledgement tracking yet.</p>`;
            return;
        }

        panelHost.innerHTML = `
            <div class="task-topic-submission-teacher-panel">
                ${haparaEmbedHtml}
                <div class="task-topic-drive-links">
                    <a class="detail-action detail-action-secondary" href="${escapeHtml(haparaClassDriveUrl)}" target="_blank" rel="noreferrer">Open Class Hapara Drive</a>
                    <a class="detail-action detail-action-secondary" href="${escapeHtml(haparaWorkspacePublicUrl)}" target="_blank" rel="noreferrer">Open Hapara Workspace</a>
                </div>
                <p class="task-topic-submission-note">Students submit work in Hapara <strong>${escapeHtml(haparaSpaceName)}</strong>. This panel tracks who has acknowledged they submitted.</p>
                <div class="task-topic-submission-meta">
                    <p><strong>Acknowledged:</strong> ${rows.filter((row) => row.acknowledged).length} of ${rows.length}</p>
                    ${isTrackedWorkflowTopic ? `<p><strong>Logged today:</strong> ${loggedTodayCount} of ${rows.length}</p>` : ""}
                </div>
                ${isTrackedWorkflowTopic ? `
                    <div class="task-topic-teacher-summary-row">
                        <div class="task-topic-teacher-summary-item">
                            <span class="task-topic-teacher-summary-label">${escapeHtml(summaryPrimaryLabel)}</span>
                            <span class="task-topic-teacher-summary-value">${missingPrimaryLinkRows.length}</span>
                        </div>
                        <div class="task-topic-teacher-summary-item">
                            <span class="task-topic-teacher-summary-label">${escapeHtml(summaryLogLabel)}</span>
                            <span class="task-topic-teacher-summary-value">${missingLogRows.length}</span>
                        </div>
                        <div class="task-topic-teacher-summary-action">
                            <button type="button" class="detail-action detail-action-secondary" id="task-topic-export-missing-log">Export Missing Logs</button>
                        </div>
                    </div>
                ` : ""}
                ${isTrackedWorkflowTopic ? `
                    <div class="task-topic-submission-actions task-topic-teacher-filter-actions">
                        <button type="button" class="detail-action detail-action-secondary" id="task-topic-filter-missing-trello">${isProjectManagementTopic ? "Show Missing Trello Links" : "Show Missing Asset Folder Links"}</button>
                        <button type="button" class="detail-action detail-action-secondary" id="task-topic-filter-missing-log">${isProjectManagementTopic ? "Show Missing Today's Log" : "Show Missing Today's Version Log"}</button>
                        <button type="button" class="detail-action detail-action-secondary" id="task-topic-filter-show-all" hidden>Show All Students</button>
                    </div>
                ` : ""}
                <div class="task-topic-teacher-status-list">
                    ${rows.map((row) => `
                        <div class="task-topic-teacher-status-item">
                            <span class="task-topic-teacher-status-email">${escapeHtml(row.email)}</span>
                            <span class="task-topic-teacher-status-pill ${row.acknowledged ? "is-acknowledged" : "is-pending"}">${row.acknowledged ? "Submitted in Hapara" : "Not acknowledged"}</span>
                            <span class="task-topic-teacher-status-doc">${escapeHtml(row.docRef || "No document reference")}</span>
                            ${isProjectManagementTopic
                                ? (row.trelloCardUrl
                                    ? `<a class="task-topic-teacher-status-trello" href="${escapeHtml(row.trelloCardUrl)}" target="_blank" rel="noreferrer">Open Trello Card</a>`
                                    : `<span class="task-topic-teacher-status-trello task-topic-teacher-status-trello-missing">No Trello card linked</span>`
                                )
                                : (isMediaAssetWorkflowTopic
                                    ? (row.mediaAssetFolderUrl
                                        ? `<a class="task-topic-teacher-status-trello" href="${escapeHtml(row.mediaAssetFolderUrl)}" target="_blank" rel="noreferrer">Open Asset Folder</a>`
                                        : `<span class="task-topic-teacher-status-trello task-topic-teacher-status-trello-missing">No asset folder linked</span>`
                                    )
                                    : ""
                                )
                            }
                            ${isMediaAssetWorkflowTopic && row.mediaReviewUrl
                                ? `<a class="task-topic-teacher-status-trello" href="${escapeHtml(row.mediaReviewUrl)}" target="_blank" rel="noreferrer">Open Review Link</a>`
                                : ""
                            }
                            ${isTrackedWorkflowTopic
                                ? `<span class="task-topic-teacher-status-log ${(isProjectManagementTopic ? row.lastLogDate : row.mediaLastVersionLogDate) === todayNz ? "is-complete" : "is-missing"}">${(isProjectManagementTopic ? row.lastLogDate : row.mediaLastVersionLogDate) === todayNz ? logCompleteText : logMissingText}</span>`
                                : ""
                            }
                            <span class="task-topic-teacher-status-time">${escapeHtml(formatSubmissionTimestamp(row.submittedAt))}</span>
                        </div>
                    `).join("")}
                </div>
            </div>
        `;

        if (isTrackedWorkflowTopic) {
            const missingFilterButton = panelHost.querySelector("#task-topic-filter-missing-trello");
            const missingLogFilterButton = panelHost.querySelector("#task-topic-filter-missing-log");
            const showAllButton = panelHost.querySelector("#task-topic-filter-show-all");
            const exportMissingLogButton = panelHost.querySelector("#task-topic-export-missing-log");
            const items = Array.from(panelHost.querySelectorAll(".task-topic-teacher-status-item"));

            const applyFilter = (mode) => {
                items.forEach((item) => {
                    const hasMissingBadge = Boolean(item.querySelector(".task-topic-teacher-status-trello-missing"));
                    const hasMissingLog = Boolean(item.querySelector(".task-topic-teacher-status-log.is-missing"));
                    if (mode === "missing-trello") {
                        item.hidden = !hasMissingBadge;
                    } else if (mode === "missing-log") {
                        item.hidden = !hasMissingLog;
                    } else {
                        item.hidden = false;
                    }
                });

                if (missingFilterButton) {
                    missingFilterButton.hidden = mode === "missing-trello";
                }
                if (missingLogFilterButton) {
                    missingLogFilterButton.hidden = mode === "missing-log";
                }
                if (showAllButton) {
                    showAllButton.hidden = mode === "all";
                }
            };

            missingFilterButton?.addEventListener("click", () => applyFilter("missing-trello"));
            missingLogFilterButton?.addEventListener("click", () => applyFilter("missing-log"));
            showAllButton?.addEventListener("click", () => applyFilter("all"));

            exportMissingLogButton?.addEventListener("click", () => {
                const rowsToExport = rows.filter((row) => {
                    if (isProjectManagementTopic) {
                        return row.lastLogDate !== todayNz;
                    }
                    if (isMediaAssetWorkflowTopic) {
                        return row.mediaLastVersionLogDate !== todayNz;
                    }
                    return false;
                });
                const quoteCsv = (value) => `"${String(value || "").replace(/"/g, '""')}"`;
                const csvLines = [
                    ["student_email", "acknowledged", "trello_linked", "asset_folder_linked", "last_log_date", "last_log_at", "review_link", "document_reference"].join(","),
                    ...rowsToExport.map((row) => [
                        quoteCsv(row.email),
                        quoteCsv(row.acknowledged ? "yes" : "no"),
                        quoteCsv(row.trelloCardUrl ? "yes" : "no"),
                        quoteCsv(row.mediaAssetFolderUrl ? "yes" : "no"),
                        quoteCsv(isProjectManagementTopic ? (row.lastLogDate || "") : (row.mediaLastVersionLogDate || "")),
                        quoteCsv(isProjectManagementTopic ? (row.lastLogAt || "") : (row.mediaLastVersionLogAt || "")),
                        quoteCsv(row.mediaReviewUrl || ""),
                        quoteCsv(row.docRef || "")
                    ].join(","))
                ];

                const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `missing-todays-log-${todayNz}.csv`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(url);
            });
        }
        return;
    }

    const hasAllocation = Boolean(interestData?.my_interest || interestData?.my_allocation);
    if (!hasAllocation) {
        panelHost.innerHTML = `<p class="task-topic-submission-note">Select <strong>I'm Interested</strong> first, then you can submit your evidence for this task topic.</p>`;
        return;
    }

    let evidenceRows = [];
    try {
        evidenceRows = await fetchEvidenceRows(projectId, email);
    } catch (_error) {
        panelHost.innerHTML = `<p class="task-topic-submission-note">Could not load your submission right now. Try again shortly.</p>`;
        return;
    }

    const submission = parseTaskTopicSubmissionFromEvidenceRows(evidenceRows, standardKey);
    const acknowledged = Boolean(submission.haparaAcknowledged);
    const acknowledgedAt = submission.haparaSubmittedAt || submission.submittedAt || "";
    const currentDocRef = String(submission.haparaDocumentRef || "").trim();
    const currentTrelloCardUrl = toSafeTrelloCardUrl(submission.trelloCardUrl);
    const currentMediaAssetFolderUrl = toSafeExternalUrl(submission.mediaAssetFolderUrl);
    const currentMediaReviewUrl = toSafeExternalUrl(submission.mediaReviewUrl);
    const todayNz = getNzDateKey();
    const hasLoggedToday = isProjectManagementTopic
        ? String(submission.trelloLastLogDate || "").trim() === todayNz
        : isMediaAssetWorkflowTopic
            ? String(submission.mediaVersionLogDate || "").trim() === todayNz
            : false;

    panelHost.innerHTML = `
        <form id="task-topic-submission-form" class="task-topic-submission-form" novalidate>
            ${haparaEmbedHtml}
            <p class="task-topic-submission-note">Save your write-up into the class Hapara Drive folder, then acknowledge below so this system records completion.</p>
            <div class="task-topic-drive-links">
                <a class="detail-action detail-action-secondary" href="${escapeHtml(haparaClassDriveUrl)}" target="_blank" rel="noreferrer">Open Class Hapara Drive</a>
                <a class="detail-action detail-action-secondary" href="${escapeHtml(haparaWorkspacePublicUrl)}" target="_blank" rel="noreferrer">Open Hapara Workspace</a>
            </div>

            <label class="task-topic-submission-label" for="task-topic-hapara-doc-ref">Document Name or Drive Reference</label>
            <input id="task-topic-hapara-doc-ref" class="task-topic-submission-input" type="text" placeholder="Example: Relevant Implications - Victor McKewen" value="${escapeHtml(currentDocRef)}" required>

            ${isProjectManagementTopic ? `
                <label class="task-topic-submission-label" for="task-topic-trello-card-url">Trello Card Link</label>
                <input id="task-topic-trello-card-url" class="task-topic-submission-input" type="url" placeholder="https://trello.com/c/xxxx1234" value="${escapeHtml(currentTrelloCardUrl)}" required>
                <p class="task-topic-submission-note">Project Management evidence requires your Trello card link. This gives your teacher one-click access for marking.</p>

                <div class="task-topic-trello-create-box">
                    <p class="task-topic-submission-note">Create a Trello card automatically (optional):</p>
                    <label class="task-topic-submission-label" for="task-topic-trello-board">Board</label>
                    <select id="task-topic-trello-board" class="task-topic-submission-input">
                        <option value="">Select board</option>
                    </select>
                    <label class="task-topic-submission-label" for="task-topic-trello-list">List</label>
                    <select id="task-topic-trello-list" class="task-topic-submission-input">
                        <option value="">Select list</option>
                    </select>
                    <button type="button" class="detail-action detail-action-secondary" id="task-topic-create-trello-card">Create Trello Card for This Task</button>
                    <p class="task-topic-submission-status" id="task-topic-trello-create-status" aria-live="polite"></p>
                </div>

                <div class="task-topic-trello-log-box">
                    <p class="task-topic-submission-note ${hasLoggedToday ? "task-topic-submission-note-success" : "task-topic-submission-note-warning"}">${hasLoggedToday ? "Trello work log complete for today." : "Daily prompt: log your project management progress in Trello now."}</p>
                    <label class="task-topic-submission-label" for="task-topic-trello-log-note">Today's Trello Work Log</label>
                    <textarea id="task-topic-trello-log-note" class="task-topic-submission-input task-topic-submission-textarea" placeholder="What did you complete today? What blocker did you hit? What is your next step before next lesson?"></textarea>
                    <button type="button" class="detail-action" id="task-topic-send-trello-log">Send Today's Log to Trello</button>
                    <p class="task-topic-submission-status" id="task-topic-trello-log-status" aria-live="polite"></p>
                </div>
            ` : ""}

            ${isMediaAssetWorkflowTopic ? `
                <label class="task-topic-submission-label" for="task-topic-media-asset-url">Master Asset Folder Link</label>
                <input id="task-topic-media-asset-url" class="task-topic-submission-input" type="url" placeholder="https://drive.google.com/... or OneDrive folder" value="${escapeHtml(currentMediaAssetFolderUrl)}" required>
                <p class="task-topic-submission-note">Asset Management evidence requires a shared folder link where your current media files are managed.</p>

                <label class="task-topic-submission-label" for="task-topic-media-review-url">Review Link (Optional)</label>
                <input id="task-topic-media-review-url" class="task-topic-submission-input" type="url" placeholder="https://frame.io/... or review board" value="${escapeHtml(currentMediaReviewUrl)}">

                <div class="task-topic-trello-log-box">
                    <p class="task-topic-submission-note ${hasLoggedToday ? "task-topic-submission-note-success" : "task-topic-submission-note-warning"}">${hasLoggedToday ? "Version log complete for today." : "Daily prompt: add a version log entry for your media updates now."}</p>
                    <label class="task-topic-submission-label" for="task-topic-media-log-note">Today's Version Log</label>
                    <textarea id="task-topic-media-log-note" class="task-topic-submission-input task-topic-submission-textarea" placeholder="What asset changed today? Which version/file name did you produce? What feedback or next revision is planned?"></textarea>
                    <button type="button" class="detail-action" id="task-topic-save-media-log">Save Today's Version Log</button>
                    <p class="task-topic-submission-status" id="task-topic-media-log-status" aria-live="polite"></p>
                </div>
            ` : ""}

            <div class="task-topic-submission-actions">
                <button type="submit" class="detail-action">I Submitted In Hapara</button>
                <button type="button" class="detail-action detail-action-secondary" id="task-topic-clear-acknowledgement">Clear Acknowledgement</button>
            </div>
            <p class="task-topic-submission-status" id="task-topic-submission-status" aria-live="polite"></p>
        </form>
        <div class="task-topic-submission-meta">
            <p><strong>Status:</strong> <span id="task-topic-ack-status">${acknowledged ? "Submitted in Hapara" : "Waiting for acknowledgement"}</span></p>
            <p><strong>Acknowledged At:</strong> <span id="task-topic-last-submitted">${escapeHtml(formatSubmissionTimestamp(acknowledgedAt))}</span></p>
            <p><strong>Hapara Space:</strong> <span>${escapeHtml(haparaSpaceName)}</span></p>
            <p><strong>Document Reference:</strong> <span id="task-topic-doc-reference">${escapeHtml(currentDocRef || "Not provided")}</span></p>
            ${isProjectManagementTopic
                ? `<p><strong>Trello Card:</strong> <span id="task-topic-trello-reference">${currentTrelloCardUrl ? `<a href="${escapeHtml(currentTrelloCardUrl)}" target="_blank" rel="noreferrer">${escapeHtml(currentTrelloCardUrl)}</a>` : "Not linked"}</span></p>`
                : ""
            }
            ${isProjectManagementTopic
                ? `<p><strong>Last Trello Log:</strong> <span id="task-topic-trello-last-log">${escapeHtml(formatSubmissionTimestamp(submission.trelloLastLogAt || ""))}</span></p>`
                : ""
            }
            ${isMediaAssetWorkflowTopic
                ? `<p><strong>Asset Folder:</strong> <span id="task-topic-media-asset-reference">${currentMediaAssetFolderUrl ? `<a href="${escapeHtml(currentMediaAssetFolderUrl)}" target="_blank" rel="noreferrer">${escapeHtml(currentMediaAssetFolderUrl)}</a>` : "Not linked"}</span></p>`
                : ""
            }
            ${isMediaAssetWorkflowTopic
                ? `<p><strong>Review Link:</strong> <span id="task-topic-media-review-reference">${currentMediaReviewUrl ? `<a href="${escapeHtml(currentMediaReviewUrl)}" target="_blank" rel="noreferrer">${escapeHtml(currentMediaReviewUrl)}</a>` : "Not linked"}</span></p>`
                : ""
            }
            ${isMediaAssetWorkflowTopic
                ? `<p><strong>Last Version Log:</strong> <span id="task-topic-media-last-log">${escapeHtml(formatSubmissionTimestamp(submission.mediaVersionLogAt || ""))}</span></p>`
                : ""
            }
        </div>
    `;

    const form = panelHost.querySelector("#task-topic-submission-form");
    const clearAckButton = panelHost.querySelector("#task-topic-clear-acknowledgement");
    const docRefInput = panelHost.querySelector("#task-topic-hapara-doc-ref");
    const trelloCardInput = panelHost.querySelector("#task-topic-trello-card-url");
    const trelloBoardSelect = panelHost.querySelector("#task-topic-trello-board");
    const trelloListSelect = panelHost.querySelector("#task-topic-trello-list");
    const trelloCreateButton = panelHost.querySelector("#task-topic-create-trello-card");
    const trelloCreateStatusHost = panelHost.querySelector("#task-topic-trello-create-status");
    const trelloLogNoteInput = panelHost.querySelector("#task-topic-trello-log-note");
    const trelloLogButton = panelHost.querySelector("#task-topic-send-trello-log");
    const trelloLogStatusHost = panelHost.querySelector("#task-topic-trello-log-status");
    const mediaAssetInput = panelHost.querySelector("#task-topic-media-asset-url");
    const mediaReviewInput = panelHost.querySelector("#task-topic-media-review-url");
    const mediaLogNoteInput = panelHost.querySelector("#task-topic-media-log-note");
    const mediaLogButton = panelHost.querySelector("#task-topic-save-media-log");
    const mediaLogStatusHost = panelHost.querySelector("#task-topic-media-log-status");
    const statusHost = panelHost.querySelector("#task-topic-submission-status");
    const ackStatusHost = panelHost.querySelector("#task-topic-ack-status");
    const lastSubmittedHost = panelHost.querySelector("#task-topic-last-submitted");
    const docRefHost = panelHost.querySelector("#task-topic-doc-reference");
    const trelloRefHost = panelHost.querySelector("#task-topic-trello-reference");
    const trelloLastLogHost = panelHost.querySelector("#task-topic-trello-last-log");
    const mediaAssetRefHost = panelHost.querySelector("#task-topic-media-asset-reference");
    const mediaReviewRefHost = panelHost.querySelector("#task-topic-media-review-reference");
    const mediaLastLogHost = panelHost.querySelector("#task-topic-media-last-log");
    const updateMeta = (isAcknowledged, timestamp) => {
        if (ackStatusHost) {
            ackStatusHost.textContent = isAcknowledged ? "Submitted in Hapara" : "Waiting for acknowledgement";
        }

        if (lastSubmittedHost) {
            lastSubmittedHost.textContent = formatSubmissionTimestamp(timestamp);
        }

        if (docRefHost) {
            const value = String(docRefInput?.value || "").trim();
            docRefHost.textContent = value || "Not provided";
        }

        if (trelloRefHost) {
            const safeCardUrl = toSafeTrelloCardUrl(trelloCardInput?.value || "");
            if (safeCardUrl) {
                trelloRefHost.innerHTML = `<a href="${escapeHtml(safeCardUrl)}" target="_blank" rel="noreferrer">${escapeHtml(safeCardUrl)}</a>`;
            } else {
                trelloRefHost.textContent = "Not linked";
            }
        }

        if (mediaAssetRefHost) {
            const safeAssetUrl = toSafeExternalUrl(mediaAssetInput?.value || "");
            if (safeAssetUrl) {
                mediaAssetRefHost.innerHTML = `<a href="${escapeHtml(safeAssetUrl)}" target="_blank" rel="noreferrer">${escapeHtml(safeAssetUrl)}</a>`;
            } else {
                mediaAssetRefHost.textContent = "Not linked";
            }
        }

        if (mediaReviewRefHost) {
            const safeReviewUrl = toSafeExternalUrl(mediaReviewInput?.value || "");
            if (safeReviewUrl) {
                mediaReviewRefHost.innerHTML = `<a href="${escapeHtml(safeReviewUrl)}" target="_blank" rel="noreferrer">${escapeHtml(safeReviewUrl)}</a>`;
            } else {
                mediaReviewRefHost.textContent = "Not linked";
            }
        }
    };

    const setStatus = (message, isError = false) => {
        if (!statusHost) {
            return;
        }
        statusHost.textContent = String(message || "");
        statusHost.classList.toggle("is-error", Boolean(isError));
    };

    const setTrelloCreateStatus = (message, isError = false) => {
        if (!trelloCreateStatusHost) return;
        trelloCreateStatusHost.textContent = String(message || "");
        trelloCreateStatusHost.classList.toggle("is-error", Boolean(isError));
    };

    const setTrelloLogStatus = (message, isError = false) => {
        if (!trelloLogStatusHost) return;
        trelloLogStatusHost.textContent = String(message || "");
        trelloLogStatusHost.classList.toggle("is-error", Boolean(isError));
    };

    const setMediaLogStatus = (message, isError = false) => {
        if (!mediaLogStatusHost) return;
        mediaLogStatusHost.textContent = String(message || "");
        mediaLogStatusHost.classList.toggle("is-error", Boolean(isError));
    };

    if (isProjectManagementTopic && trelloBoardSelect && trelloListSelect) {
        try {
            const boardsResponse = await fetch("/api/integrations/trello/boards", { headers: buildWriteHeaders() });
            if (boardsResponse.ok) {
                const boards = await boardsResponse.json().catch(() => []);
                const boardOptions = (Array.isArray(boards) ? boards : [])
                    .map((board) => `<option value="${escapeHtml(board.id)}">${escapeHtml(board.name || board.id)}</option>`)
                    .join("");
                trelloBoardSelect.innerHTML = `<option value="">Select board</option>${boardOptions}`;
            } else {
                setTrelloCreateStatus("Connect Trello first (Student Work page), then reload.", true);
            }
        } catch (_error) {
            setTrelloCreateStatus("Could not load Trello boards right now.", true);
        }

        trelloBoardSelect.addEventListener("change", async () => {
            const boardId = String(trelloBoardSelect.value || "").trim();
            trelloListSelect.innerHTML = `<option value="">Loading lists...</option>`;
            if (!boardId) {
                trelloListSelect.innerHTML = `<option value="">Select list</option>`;
                return;
            }

            try {
                const listsResponse = await fetch(`/api/integrations/trello/boards/${encodeURIComponent(boardId)}/lists`, { headers: buildWriteHeaders() });
                if (!listsResponse.ok) {
                    throw new Error("Could not load lists.");
                }

                const lists = await listsResponse.json().catch(() => []);
                const listOptions = (Array.isArray(lists) ? lists : [])
                    .map((list) => `<option value="${escapeHtml(list.id)}">${escapeHtml(list.name || list.id)}</option>`)
                    .join("");
                trelloListSelect.innerHTML = `<option value="">Select list</option>${listOptions}`;
            } catch (_error) {
                trelloListSelect.innerHTML = `<option value="">Select list</option>`;
                setTrelloCreateStatus("Could not load Trello lists.", true);
            }
        });

        trelloCreateButton?.addEventListener("click", async () => {
            const listId = String(trelloListSelect.value || "").trim();
            if (!listId) {
                setTrelloCreateStatus("Select a Trello list first.", true);
                return;
            }

            const cardName = `${detailData?.title || "Project"} - ${taskTopicShortName || deriveTaskShortName(taskTopicTitle) || "Project Management"}`;
            const cardDesc = [
                `Student: ${email}`,
                `Task Topic: ${taskTopicTitle}`,
                "",
                "Daily log prompts:",
                "1) What did I complete today?",
                "2) What blocker did I hit?",
                "3) What is my next step before next lesson?"
            ].join("\n");

            trelloCreateButton.disabled = true;
            setTrelloCreateStatus("Creating Trello card...");
            try {
                const createResponse = await fetch("/api/integrations/trello/cards", {
                    method: "POST",
                    headers: buildWriteHeaders(),
                    body: JSON.stringify({
                        list_id: listId,
                        name: cardName,
                        desc: cardDesc,
                        pos: "top"
                    })
                });

                if (!createResponse.ok) {
                    const createError = await createResponse.json().catch(() => ({}));
                    throw new Error(createError.error || "Could not create Trello card.");
                }

                const created = await createResponse.json().catch(() => ({}));
                const safeUrl = toSafeTrelloCardUrl(created.url || "");
                if (safeUrl && trelloCardInput) {
                    trelloCardInput.value = safeUrl;
                }
                setTrelloCreateStatus("Trello card created and linked.");
                updateMeta(acknowledged, acknowledgedAt);
            } catch (error) {
                setTrelloCreateStatus(error.message || "Could not create Trello card.", true);
            } finally {
                if (trelloCreateButton && trelloCreateButton.isConnected) trelloCreateButton.disabled = false;
            }
        });

        trelloLogButton?.addEventListener("click", async () => {
            const safeCardUrl = toSafeTrelloCardUrl(trelloCardInput?.value || "");
            const note = String(trelloLogNoteInput?.value || "").trim();
            if (!safeCardUrl) {
                setTrelloLogStatus("Add a valid Trello card link first.", true);
                return;
            }
            if (!note) {
                setTrelloLogStatus("Add your daily log note before sending.", true);
                return;
            }

            if (trelloLogButton) trelloLogButton.disabled = true;
            setTrelloLogStatus("Sending log to Trello...");

            try {
                const sendResponse = await fetch("/api/integrations/trello/work-log", {
                    method: "POST",
                    headers: buildWriteHeaders(),
                    body: JSON.stringify({
                        card_url: safeCardUrl,
                        note,
                        activity_title: `${detailData?.title || "Project"} - ${taskTopicTitle}`
                    })
                });

                if (!sendResponse.ok) {
                    const sendError = await sendResponse.json().catch(() => ({}));
                    throw new Error(sendError.error || "Could not send Trello log.");
                }

                const nowIso = new Date().toISOString();
                const logDate = getNzDateKey(new Date());
                const nextRows = upsertTaskTopicSubmissionEvidenceRows(evidenceRows, standardKey, {
                    writtenEvidence: submission.writtenEvidence,
                    evidenceLink: submission.evidenceLink,
                    fileName: submission.fileName,
                    fileUrl: submission.fileUrl,
                    submittedAt: submission.submittedAt,
                    haparaAcknowledged: submission.haparaAcknowledged,
                    haparaSubmittedAt: submission.haparaSubmittedAt,
                    haparaLocation: submission.haparaLocation,
                    haparaDriveClassUrl: submission.haparaDriveClassUrl,
                    haparaDocumentRef: submission.haparaDocumentRef,
                    trelloCardUrl: safeCardUrl,
                    trelloLastLogDate: logDate,
                    trelloLastLogAt: nowIso,
                    trelloLastLogNote: note,
                    reviewStatus: submission.reviewStatus
                });

                await saveEvidenceRows(projectId, email, nextRows);
                evidenceRows = nextRows;
                submission.trelloCardUrl = safeCardUrl;
                submission.trelloLastLogDate = logDate;
                submission.trelloLastLogAt = nowIso;
                submission.trelloLastLogNote = note;

                if (trelloLastLogHost) {
                    trelloLastLogHost.textContent = formatSubmissionTimestamp(nowIso);
                }
                if (trelloLogNoteInput) {
                    trelloLogNoteInput.value = "";
                }
                setTrelloLogStatus("Trello log sent. Daily prompt complete for today.");
            } catch (error) {
                setTrelloLogStatus(error.message || "Could not send Trello log.", true);
            } finally {
                if (trelloLogButton && trelloLogButton.isConnected) trelloLogButton.disabled = false;
            }
        });
    }

    if (isMediaAssetWorkflowTopic) {
        mediaLogButton?.addEventListener("click", async () => {
            const safeAssetUrl = toSafeExternalUrl(mediaAssetInput?.value || "");
            const safeReviewUrl = toSafeExternalUrl(mediaReviewInput?.value || "");
            const note = String(mediaLogNoteInput?.value || "").trim();

            if (!safeAssetUrl) {
                setMediaLogStatus("Add a valid master asset folder link first.", true);
                return;
            }
            if (!note) {
                setMediaLogStatus("Add your version log note before saving.", true);
                return;
            }

            if (mediaLogButton) mediaLogButton.disabled = true;
            setMediaLogStatus("Saving version log...");

            try {
                const nowIso = new Date().toISOString();
                const logDate = getNzDateKey(new Date());
                const nextRows = upsertTaskTopicSubmissionEvidenceRows(evidenceRows, standardKey, {
                    writtenEvidence: submission.writtenEvidence,
                    evidenceLink: submission.evidenceLink,
                    fileName: submission.fileName,
                    fileUrl: submission.fileUrl,
                    submittedAt: submission.submittedAt,
                    haparaAcknowledged: submission.haparaAcknowledged,
                    haparaSubmittedAt: submission.haparaSubmittedAt,
                    haparaLocation: submission.haparaLocation,
                    haparaDriveClassUrl: submission.haparaDriveClassUrl,
                    haparaDocumentRef: submission.haparaDocumentRef,
                    trelloCardUrl: submission.trelloCardUrl,
                    trelloLastLogDate: submission.trelloLastLogDate,
                    trelloLastLogAt: submission.trelloLastLogAt,
                    trelloLastLogNote: submission.trelloLastLogNote,
                    mediaAssetFolderUrl: safeAssetUrl,
                    mediaReviewUrl: safeReviewUrl,
                    mediaVersionLogDate: logDate,
                    mediaVersionLogAt: nowIso,
                    mediaVersionLogNote: note,
                    reviewStatus: submission.reviewStatus
                });

                await saveEvidenceRows(projectId, email, nextRows);
                evidenceRows = nextRows;
                submission.mediaAssetFolderUrl = safeAssetUrl;
                submission.mediaReviewUrl = safeReviewUrl;
                submission.mediaVersionLogDate = logDate;
                submission.mediaVersionLogAt = nowIso;
                submission.mediaVersionLogNote = note;

                if (mediaLastLogHost) {
                    mediaLastLogHost.textContent = formatSubmissionTimestamp(nowIso);
                }
                if (mediaLogNoteInput) {
                    mediaLogNoteInput.value = "";
                }
                updateMeta(acknowledged, acknowledgedAt);
                setMediaLogStatus("Version log saved. Daily prompt complete for today.");
            } catch (_error) {
                setMediaLogStatus("Could not save version log right now.", true);
            } finally {
                if (mediaLogButton && mediaLogButton.isConnected) mediaLogButton.disabled = false;
            }
        });
    }

    form?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const docReference = String(docRefInput?.value || "").trim();
        if (!docReference) {
            setStatus("Add the document name/reference from Hapara Drive before acknowledging.", true);
            return;
        }

        const trelloCardUrl = toSafeTrelloCardUrl(trelloCardInput?.value || "");
        if (isProjectManagementTopic && !trelloCardUrl) {
            setStatus("Project Management requires a valid Trello card link before acknowledging.", true);
            return;
        }

        const mediaAssetFolderUrl = toSafeExternalUrl(mediaAssetInput?.value || "");
        const mediaReviewUrl = toSafeExternalUrl(mediaReviewInput?.value || "");
        if (isMediaAssetWorkflowTopic && !mediaAssetFolderUrl) {
            setStatus("Asset Management requires a valid master asset folder link before acknowledging.", true);
            return;
        }

        const submitButton = form.querySelector("button[type='submit']");
        if (submitButton) {
            submitButton.disabled = true;
        }
        setStatus("Saving acknowledgement...");

        const submittedAt = new Date().toISOString();
        const nextRows = upsertTaskTopicSubmissionEvidenceRows(evidenceRows, standardKey, {
            writtenEvidence: submission.writtenEvidence,
            evidenceLink: submission.evidenceLink,
            fileName: submission.fileName,
            fileUrl: submission.fileUrl,
            submittedAt,
            haparaAcknowledged: true,
            haparaSubmittedAt: submittedAt,
            haparaLocation: haparaSpaceName,
            haparaDriveClassUrl: haparaClassDriveUrl,
            haparaDocumentRef: docReference,
            trelloCardUrl,
            trelloLastLogDate: submission.trelloLastLogDate,
            trelloLastLogAt: submission.trelloLastLogAt,
            trelloLastLogNote: submission.trelloLastLogNote,
            mediaAssetFolderUrl,
            mediaReviewUrl,
            mediaVersionLogDate: submission.mediaVersionLogDate,
            mediaVersionLogAt: submission.mediaVersionLogAt,
            mediaVersionLogNote: submission.mediaVersionLogNote,
            reviewStatus: "pending"
        });

        try {
            await saveEvidenceRows(projectId, email, nextRows);
            evidenceRows = nextRows;
            submission.haparaAcknowledged = true;
            submission.haparaSubmittedAt = submittedAt;
            submission.haparaLocation = haparaSpaceName;
            submission.haparaDriveClassUrl = haparaClassDriveUrl;
            submission.haparaDocumentRef = docReference;
            submission.trelloCardUrl = trelloCardUrl;
            submission.mediaAssetFolderUrl = mediaAssetFolderUrl;
            submission.mediaReviewUrl = mediaReviewUrl;
            submission.submittedAt = submittedAt;
            submission.reviewStatus = "pending";

            updateMeta(true, submittedAt);
            setStatus("Acknowledged. Your Hapara submission has been recorded.");
        } catch (_error) {
            setStatus("Could not save acknowledgement right now.", true);
        } finally {
            if (submitButton && submitButton.isConnected) {
                submitButton.disabled = false;
            }
        }
    });

    clearAckButton?.addEventListener("click", async () => {
        clearAckButton.disabled = true;
        setStatus("Clearing acknowledgement...");

        const nextRows = upsertTaskTopicSubmissionEvidenceRows(evidenceRows, standardKey, {
            writtenEvidence: submission.writtenEvidence,
            evidenceLink: submission.evidenceLink,
            fileName: submission.fileName,
            fileUrl: submission.fileUrl,
            submittedAt: "",
            haparaAcknowledged: false,
            haparaSubmittedAt: "",
            haparaLocation: haparaSpaceName,
            haparaDriveClassUrl: haparaClassDriveUrl,
            haparaDocumentRef: String(docRefInput?.value || "").trim(),
            trelloCardUrl: toSafeTrelloCardUrl(trelloCardInput?.value || ""),
            trelloLastLogDate: submission.trelloLastLogDate,
            trelloLastLogAt: submission.trelloLastLogAt,
            trelloLastLogNote: submission.trelloLastLogNote,
            mediaAssetFolderUrl: toSafeExternalUrl(mediaAssetInput?.value || ""),
            mediaReviewUrl: toSafeExternalUrl(mediaReviewInput?.value || ""),
            mediaVersionLogDate: submission.mediaVersionLogDate,
            mediaVersionLogAt: submission.mediaVersionLogAt,
            mediaVersionLogNote: submission.mediaVersionLogNote,
            reviewStatus: submission.reviewStatus
        });

        try {
            await saveEvidenceRows(projectId, email, nextRows);
            evidenceRows = nextRows;
            submission.haparaAcknowledged = false;
            submission.haparaSubmittedAt = "";
            submission.submittedAt = "";
            updateMeta(false, "");
            setStatus("Acknowledgement cleared.");
        } catch (_error) {
            setStatus("Could not clear acknowledgement right now.", true);
        } finally {
            if (clearAckButton && clearAckButton.isConnected) {
                clearAckButton.disabled = false;
            }
        }
    });
}

async function renderEvidenceSidebar({ host, projectId, viewerEmail, studentEmail, standards, studentLabel = "Student", taskDefaultsByStandard = {} }) {
    if (!host || !studentEmail || !projectId || !Array.isArray(standards) || !standards.length) {
        return;
    }

    const existing = document.querySelector("#evidence-steps-sidebar");
    if (existing) {
        existing.remove();
    }
    const existingBackdrop = document.querySelector("#evidence-steps-backdrop");
    if (existingBackdrop) {
        existingBackdrop.remove();
    }

    const section = host.querySelector("#interest-section");
    if (section && !section.querySelector("#evidence-sidebar-open")) {
        const triggerButton = document.createElement("button");
        triggerButton.type = "button";
        triggerButton.id = "evidence-sidebar-open";
        triggerButton.className = "detail-action evidence-sidebar-open-btn";
        triggerButton.textContent = "Open Task List";
        section.appendChild(triggerButton);
    }

    const backdrop = document.createElement("div");
    backdrop.id = "evidence-steps-backdrop";
    backdrop.className = "evidence-sidebar-backdrop";

    const sidebar = document.createElement("aside");
    sidebar.id = "evidence-steps-sidebar";
    sidebar.className = "evidence-sidebar";
    sidebar.setAttribute("aria-label", "Evidence steps sidebar");

    const closeSidebar = () => {
        sidebar.classList.remove("is-open");
        backdrop.classList.remove("is-open");
    };

    const openSidebar = () => {
        sidebar.classList.add("is-open");
        backdrop.classList.add("is-open");
    };

    const state = evidenceRowsToMap(await fetchEvidenceRows(projectId, studentEmail).catch(() => []));
    standards.forEach((code) => {
        if (!Array.isArray(state[code]) || !state[code].length) {
            const defaultSteps = Array.isArray(taskDefaultsByStandard?.[code])
                ? taskDefaultsByStandard[code]
                : (Array.isArray(EVIDENCE_STEPS_DEFAULTS[code]) ? EVIDENCE_STEPS_DEFAULTS[code] : [""]);

            state[code] = defaultSteps
                .map((text) => ({ text: String(text || "").trim(), done: false }))
                .filter((step) => step.text);
            if (!state[code].length) {
                state[code] = [{ text: "", done: false }];
            }
        }

        if (String(code) === "91897") {
            const defaultsFor91897 = Array.isArray(taskDefaultsByStandard?.[code]) ? taskDefaultsByStandard[code] : [];
            state[code] = normalize91897RowsWithRequirementFallback(state[code], defaultsFor91897);
        }
    });

    const persistState = async (statusHost) => {
        if (statusHost) {
            statusHost.textContent = "Saving...";
            statusHost.classList.remove("is-error");
        }
        try {
            await saveEvidenceRows(projectId, studentEmail, evidenceMapToRows(state, standards));
            if (statusHost) {
                statusHost.textContent = "Saved.";
                statusHost.classList.remove("is-error");
            }
        } catch (_error) {
            if (statusHost) {
                statusHost.textContent = "Could not save right now.";
                statusHost.classList.add("is-error");
            }
        }
    };

    const getStepLevel = (text) => {
        const normalized = String(text || "").trim().toLowerCase();
        if (normalized.startsWith("achieved:")) return "Achieved";
        if (normalized.startsWith("merit:")) return "Merit";
        if (normalized.startsWith("excellence:")) return "Excellence";
        return "";
    };

    const stripStepLevel = (text) => String(text || "").replace(/^(Achieved|Merit|Excellence):\s*/i, "").trim();

    let showTaskDetail = () => {};
    const openTaskTopicCard = ({ text, topicIndex }) => {
        const safeText = String(text || "").trim();
        if (!safeText) {
            return;
        }

        const taskShortName = getTaskTopicShortNameOverride(projectId, safeText) || deriveTaskShortName(safeText);

        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set("id", String(projectId || ""));
        nextUrl.searchParams.set("taskTopic", safeText);
        nextUrl.searchParams.set("taskShortName", taskShortName);
        if (Number.isFinite(Number(topicIndex)) && Number(topicIndex) > 0) {
            nextUrl.searchParams.set("taskTopicIndex", String(topicIndex));
        }

        window.location.href = `${nextUrl.pathname}${nextUrl.search}`;
    };

    const renderStepRows = (rowsHost, standardCode, levelFilter = "") => {
        const steps = Array.isArray(state[standardCode]) ? state[standardCode] : [];
        rowsHost.innerHTML = "";

        const filtered = steps
            .map((step, index) => ({ step, index }))
            .filter(({ step }) => {
                if (!levelFilter) {
                    return true;
                }

                const level = getStepLevel(step?.text);
                return level === levelFilter;
            });

        if (!filtered.length && levelFilter) {
            const empty = document.createElement("p");
            empty.className = "evidence-level-empty";
            empty.textContent = `No ${levelFilter.toLowerCase()} tasks yet.`;
            rowsHost.appendChild(empty);
            return;
        }

        filtered.forEach(({ step, index }) => {
            const row = document.createElement("div");
            row.className = "evidence-step-row";

            const check = document.createElement("input");
            check.type = "checkbox";
            check.className = "evidence-step-check";
            check.checked = Boolean(step?.done);
            check.addEventListener("change", () => {
                state[standardCode][index].done = check.checked;
                void persistState(sidebar.querySelector("#evidence-sidebar-status"));
            });

            const input = document.createElement("input");
            input.type = "text";
            input.className = "evidence-step-input";
            input.value = levelFilter ? stripStepLevel(step?.text) : String(step?.text || "");
            input.placeholder = levelFilter ? `Add ${levelFilter.toLowerCase()} task` : "Add a task item";
            input.title = levelFilter ? stripStepLevel(step?.text) : String(step?.text || "");
            input.addEventListener("click", () => {
                openTaskTopicCard({
                    text: levelFilter ? stripStepLevel(step?.text) : String(step?.text || ""),
                    topicIndex: index + 1
                });
            });
            input.addEventListener("input", () => {
                const nextText = String(input.value || "").trim();
                state[standardCode][index].text = levelFilter ? `${levelFilter}: ${nextText}` : nextText;
                input.title = nextText;
                showTaskDetail({
                    standardCode,
                    level: levelFilter || getStepLevel(state[standardCode][index].text),
                    text: nextText
                });
                void persistState(sidebar.querySelector("#evidence-sidebar-status"));
            });

            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "evidence-step-remove";
            removeButton.textContent = "Remove";
            removeButton.addEventListener("click", () => {
                state[standardCode].splice(index, 1);
                if (!state[standardCode].length) {
                    const fallbackText = levelFilter ? `${levelFilter}: ` : "";
                    state[standardCode].push({ text: fallbackText, done: false });
                }
                void persistState(sidebar.querySelector("#evidence-sidebar-status"));
                renderStepRows(rowsHost, standardCode, levelFilter);
            });

            row.append(check, input, removeButton);
            rowsHost.appendChild(row);
        });
    };

    sidebar.innerHTML = `
        <header class="evidence-sidebar-header">
            <h2>Task List</h2>
            <button type="button" class="detail-action detail-action-secondary" id="evidence-sidebar-close">Close</button>
        </header>
        <p class="evidence-sidebar-copy">Tracking for <strong>${escapeHtml(studentLabel)}</strong>. Tick each requirement when evidence is complete.</p>
        <p class="evidence-sidebar-status" id="evidence-sidebar-status" aria-live="polite"></p>
        <section class="evidence-task-detail" id="evidence-task-detail" hidden>
            <h3>Task Details</h3>
            <p class="evidence-task-detail-meta" id="evidence-task-detail-meta"></p>
            <p class="evidence-task-detail-text" id="evidence-task-detail-text"></p>
        </section>
        <div class="evidence-standard-list" id="evidence-standard-list"></div>
    `;

    const taskDetailHost = sidebar.querySelector("#evidence-task-detail");
    const taskDetailMeta = sidebar.querySelector("#evidence-task-detail-meta");
    const taskDetailText = sidebar.querySelector("#evidence-task-detail-text");

    showTaskDetail = ({ standardCode, level, text }) => {
        const safeText = String(text || "").trim();
        if (!taskDetailHost || !taskDetailMeta || !taskDetailText || !safeText) {
            return;
        }

        const levelText = String(level || "").trim();
        taskDetailMeta.textContent = levelText
            ? `Standard ${standardCode} • ${levelText}`
            : `Standard ${standardCode}`;
        taskDetailText.textContent = safeText;
        taskDetailHost.hidden = false;
    };

    const standardsHost = sidebar.querySelector("#evidence-standard-list");
    standards.forEach((code) => {
        const block = document.createElement("section");
        block.className = "evidence-standard-block";
        if (String(code) === "91897") {
            const levels = ["Achieved", "Merit", "Excellence"];
            block.innerHTML = `
                <h3>Standard ${escapeHtml(code)}</h3>
                ${levels.map((level) => `
                    <div class="evidence-level-group" data-level="${escapeHtml(level)}">
                        <h4>${escapeHtml(level)}</h4>
                        <div class="evidence-step-list" id="evidence-step-list-${escapeHtml(code)}-${escapeHtml(level.toLowerCase())}"></div>
                        <button type="button" class="detail-action detail-action-secondary evidence-step-add" data-add-level="${escapeHtml(level)}">Add ${escapeHtml(level)} Step</button>
                    </div>
                `).join("")}
            `;

            const renderGrouped = () => {
                levels.forEach((level) => {
                    const rowsHost = block.querySelector(`#evidence-step-list-${code}-${level.toLowerCase()}`);
                    if (rowsHost) {
                        renderStepRows(rowsHost, code, level);
                    }
                });
            };

            block.querySelectorAll(".evidence-step-add").forEach((button) => {
                button.addEventListener("click", () => {
                    const level = String(button.getAttribute("data-add-level") || "").trim();
                    const seedText = level ? `${level}: ` : "";
                    state[code].push({ text: seedText, done: false });
                    void persistState(sidebar.querySelector("#evidence-sidebar-status"));
                    renderGrouped();
                });
            });

            renderGrouped();
        } else {
            block.innerHTML = `
                <h3>Standard ${escapeHtml(code)}</h3>
                <div class="evidence-step-list" id="evidence-step-list-${escapeHtml(code)}"></div>
                <button type="button" class="detail-action detail-action-secondary evidence-step-add">Add Step</button>
            `;

            const rowsHost = block.querySelector(`#evidence-step-list-${code}`);
            const addButton = block.querySelector(".evidence-step-add");
            if (addButton) {
                addButton.addEventListener("click", () => {
                    state[code].push({ text: "", done: false });
                    void persistState(sidebar.querySelector("#evidence-sidebar-status"));
                    renderStepRows(rowsHost, code);
                });
            }

            renderStepRows(rowsHost, code);
        }

        standardsHost.appendChild(block);
    });

    const closeButton = sidebar.querySelector("#evidence-sidebar-close");
    closeButton?.addEventListener("click", closeSidebar);
    backdrop.addEventListener("click", closeSidebar);

    document.body.appendChild(backdrop);
    document.body.appendChild(sidebar);

    const openButton = host.querySelector("#evidence-sidebar-open");
    openButton?.addEventListener("click", openSidebar);

    openSidebar();
}

let detailStandardsOptionsCache = null;

function formatDetailStandardOption(row) {
    const standardNumber = String(row?.standard_number || "").trim();
    const standardName = String(row?.standard_name || "").trim();
    const level = Number.parseInt(row?.level, 10);
    const credits = Number.isFinite(Number(row?.credits)) ? Number(row.credits) : null;
    return [
        standardNumber || "Unknown",
        standardName || "Unnamed standard",
        Number.isInteger(level) ? `L${level}` : "",
        Number.isFinite(credits) ? `${credits} credits` : ""
    ].filter(Boolean).join(" | ");
}

async function getDetailStandardsOptions() {
    if (Array.isArray(detailStandardsOptionsCache)) {
        return detailStandardsOptionsCache;
    }

    try {
        const response = await fetch("/api/assessment-standards/options?stream=both&level=all", {
            headers: buildWriteHeaders()
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            return [];
        }

        detailStandardsOptionsCache = Array.isArray(payload?.options) ? payload.options : [];
        return detailStandardsOptionsCache;
    } catch (_error) {
        return [];
    }
}

async function setupDetailStandardsPicker(form, setStatus) {
    const textarea = form?.querySelector('textarea[name="standardDetails"]');
    const picker = form?.querySelector('select[name="standardLibraryOption"]');
    const addButton = form?.querySelector('[data-add-standard-line]');
    const chipList = form?.querySelector('[data-standard-chip-list]');
    if (!textarea || !picker || !addButton) {
        return;
    }

    const renderChips = () => {
        if (!chipList) {
            return;
        }

        const lines = parseLines(textarea.value);
        if (!lines.length) {
            chipList.innerHTML = `<span class="empty-note">No standards selected yet.</span>`;
            return;
        }

        chipList.innerHTML = lines.map((line) => {
            const escaped = escapeHtml(line);
            return `<span class="standard-chip"><span>${escaped}</span><button type="button" class="standard-chip-remove" data-standard-remove="${escaped}">Remove</button></span>`;
        }).join("");
    };

    renderChips();

    picker.innerHTML = `<option value="">Loading standards...</option>`;
    picker.disabled = true;
    addButton.disabled = true;

    const options = await getDetailStandardsOptions();
    if (!options.length) {
        picker.innerHTML = `<option value="">No standards available</option>`;
        picker.disabled = false;
        addButton.disabled = false;
        renderChips();
        return;
    }

    picker.innerHTML = [
        `<option value="">Select a standard...</option>`,
        ...options.map((row) => {
            const text = formatDetailStandardOption(row);
            const escapedText = escapeHtml(text);
            return `<option value="${escapedText}">${escapedText}</option>`;
        })
    ].join("");
    picker.disabled = false;
    addButton.disabled = false;
    renderChips();

    addButton.addEventListener("click", () => {
        const selected = String(picker.value || "").trim();
        if (!selected) {
            setStatus("Select a standard first.", true);
            return;
        }

        const existing = parseLines(textarea.value);
        if (!existing.includes(selected)) {
            existing.push(selected);
            textarea.value = existing.join("\n");
            renderChips();
        }
        setStatus("Standard added.");
    });

    if (chipList) {
        chipList.addEventListener("click", (event) => {
            const button = event.target.closest("button[data-standard-remove]");
            if (!button) return;
            const value = String(button.getAttribute("data-standard-remove") || "").trim();
            if (!value) return;

            const next = parseLines(textarea.value).filter((line) => line !== value);
            textarea.value = next.join("\n");
            renderChips();
            setStatus("Standard removed.");
        });
    }
}

function hasDetailPageAccess() {
    const raw = localStorage.getItem(DETAIL_HUB_AUTH_STORAGE_KEY) || sessionStorage.getItem(DETAIL_HUB_AUTH_STORAGE_KEY);
    if (!raw) return false;

    try {
        const parsed = JSON.parse(raw);
        if (!parsed?.accessToken || !parsed?.expiresAt || Number(parsed.expiresAt) <= Date.now()) {
            return false;
        }

        const email = String(parsed?.profile?.email || "").trim().toLowerCase();
        if (!email) return false;
        if (!detailAllowedDomain) return true;
        return email.endsWith(`@${detailAllowedDomain}`);
    } catch (_error) {
        return false;
    }
}

async function canEditDetails() {
    const email = readStoredHubEmail();
    if (!email) return false;

    try {
        const response = await fetch(`/api/auth/user-access?email=${encodeURIComponent(email)}`);
        if (!response.ok) return false;
        const access = await response.json();
        return Boolean(access?.can_teacher_view || access?.can_admin);
    } catch (_error) {
        return false;
    }
}

async function readSharedActivity(activityId) {
    if (!activityId) return null;

    let found;
    try {
        const response = await fetch(`/api/activities/${encodeURIComponent(activityId)}`);
        if (!response.ok) return null;
        found = await response.json();
    } catch (_error) {
        return null;
    }
    if (!found) return null;

    const toArray = (value) => {
        if (Array.isArray(value)) {
            return value.map((item) => String(item || "").trim()).filter(Boolean);
        }

        if (typeof value === "string") {
            const trimmed = value.trim();
            if (!trimmed) {
                return [];
            }

            if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("\"") && trimmed.endsWith("\""))) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) {
                        return parsed.map((item) => String(item || "").trim()).filter(Boolean);
                    }
                } catch (_error) {
                    // Fall through to newline parsing.
                }
            }

            return trimmed
                .split(/\r?\n/)
                .map((item) => item.trim())
                .filter(Boolean);
        }

        return [];
    };

    const foundStandardDetails = toArray(found.standard_details);
    const foundTasksList = toArray(found.tasks_list);
    const foundAssessmentFocus = toArray(found.assessment_focus);
    const inferredAssessmentCategory = (
        foundStandardDetails.length
        || foundTasksList.length
        || foundAssessmentFocus.length
        || toArray(found.achieved).length
        || toArray(found.merit).length
        || toArray(found.excellence).length
    ) ? "Assessment Task" : "Activity";

    return {
        id: found.id || activityId,
        title: found.name || "Uploaded Activity",
        yearLevel: found.year_level || "Year level",
        type: found.type || "Digital Learning",
            duration: `${normalizeDurationMinutes(found)} mins`,
        term: found.term || "Term 2",
        activityCategory: normalizeCardCategory(found.activity_category || found.category, inferredAssessmentCategory),
            showInThisWeek: Boolean(found.show_in_this_week ?? found.show_this_week ?? found.is_pinned ?? found.is_this_week),
        summary: String(found.description || found.summary || "").trim(),
        resources: toArray(found.resources),
        equipment: toArray(found.equipment),
        instructions: toArray(found.instructions),
        cardUrl: String(found.card_url || found.activity_url || found.url || "").trim(),
        image: found.outcome_image_url || "https://placehold.co/900x560/3f89cf/ffffff?text=Uploaded+Activity",
        
        // Project Proposal Fields
        startDate: found.start_date || "",
        contactName: found.contact_name || "",
        contactPhone: found.contact_phone || "",
        contactEmail: found.contact_email || "",
        company: found.company || "",
        address: found.address || "",
        overview: toArray(found.overview),
        services: toArray(found.services),
        costs: toArray(found.costs),
        outcomes: toArray(found.outcomes),
        withdrawalDate: found.withdrawal_date || "",
        clientId: found.client_id || "",
        
        // Assessment Task Fields
        standardDetails: foundStandardDetails,
        tasksList: (() => {
            const fromTasksList = foundTasksList;
            if (fromTasksList.length) {
                return fromTasksList;
            }
            return foundAssessmentFocus;
        })(),
        assessmentFocus: foundAssessmentFocus,
        assessmentFocusRaw: found.assessment_focus,
        achieved: toArray(found.achieved),
        merit: toArray(found.merit),
        excellence: toArray(found.excellence),
        submissionRequirements: toArray(found.submission_requirements),
        relevantImplications: toArray(found.relevant_implications),
        progressLogging: toArray(found.progress_logging),
        feedbackTrialling: toArray(found.feedback_trialling)
    };
}

    function normalizeDurationMinutes(record) {
        const minutes = Number.parseInt(record?.duration_minutes, 10);
        if (Number.isFinite(minutes) && minutes > 0) {
            return minutes;
        }

        const rawHours = Number(record?.duration_hours);
        if (Number.isFinite(rawHours) && rawHours > 0) {
            // Backward compatibility: some rows were previously saved as minutes in duration_hours.
            if (rawHours > 12) {
                return Math.round(rawHours);
            }
            return Math.round(rawHours * 60);
        }

        const genericDuration = Number(record?.duration);
        if (Number.isFinite(genericDuration) && genericDuration > 0) {
            return Math.round(genericDuration);
        }

        return 120;
    }

function renderList(items) {
    return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function normalizeTaskTopicText(value) {
    return String(value || "")
        .replace(/^(Achieved|Merit|Excellence)\s*:\s*/i, "")
        .trim();
}

function deriveTaskShortName(value) {
    const raw = normalizeTaskTopicText(value);
    if (!raw) {
        return "";
    }

    const normalized = raw.toLowerCase();
    const phraseMap = [
        { pattern: /project\s+management/, label: "Project Management" },
        { pattern: /relevant\s+implications/, label: "Relevant Implications" },
        { pattern: /version\s+control/, label: "Version Control" },
        { pattern: /digital\s+technologies\s+outcome/, label: "Digital Outcome" },
        { pattern: /decompos/, label: "Decomposition" },
        { pattern: /triall?ing\s+multiple\s+components/, label: "Component Trialling" },
        { pattern: /triall?ing\s+the\s+components/, label: "Component Trialling" },
        { pattern: /testing\s+that/, label: "Functional Testing" },
        { pattern: /using\s+information\s+appropriately/, label: "Testing Insights" },
        { pattern: /discussing\s+how/, label: "Planning Insights" }
    ];

    for (const entry of phraseMap) {
        if (entry.pattern.test(normalized)) {
            return entry.label;
        }
    }

    const stopwords = new Set([
        "the", "and", "for", "with", "from", "that", "this", "into", "using", "use", "how",
        "which", "are", "was", "were", "have", "has", "had", "its", "their", "these", "those",
        "plan", "development", "digital", "technologies", "outcome", "components"
    ]);

    const keywords = normalized
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length > 2 && !stopwords.has(word));

    if (!keywords.length) {
        return raw;
    }

    return keywords
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function getTaskTopicShortNameOverride(activityId, topicText) {
    if (typeof window === "undefined" || typeof window.hubGetTaskTopicShortNameOverride !== "function") {
        return "";
    }

    try {
        return String(window.hubGetTaskTopicShortNameOverride(activityId, topicText) || "").trim();
    } catch (_error) {
        return "";
    }
}

function setTaskTopicShortNameOverride(activityId, topicText, shortName) {
    if (typeof window === "undefined" || typeof window.hubSetTaskTopicShortNameOverride !== "function") {
        return;
    }

    try {
        window.hubSetTaskTopicShortNameOverride(activityId, topicText, shortName);
    } catch (_error) {
        // Ignore storage helper failures.
    }
}

function collectDetailTaskTopics(data) {
    return [
        ...coerceArray(data?.tasksList),
        ...coerceArray(data?.assessmentFocus ?? data?.assessment_focus ?? data?.assessmentFocusRaw),
        ...coerceArray(data?.achieved),
        ...coerceArray(data?.merit),
        ...coerceArray(data?.excellence)
    ]
        .map((item) => normalizeTaskTopicText(item))
        .filter(Boolean);
}

function collectDetailTaskTopicEntries(data) {
    const output = [];

    const pushEntries = (items, level) => {
        coerceArray(items).forEach((item) => {
            const text = normalizeTaskTopicText(item);
            if (!text) {
                return;
            }

            output.push({ text, level });
        });
    };

    pushEntries(data?.tasksList, "General");
    pushEntries(data?.assessmentFocus ?? data?.assessment_focus ?? data?.assessmentFocusRaw, "General");
    pushEntries(data?.achieved, "Achieved");
    pushEntries(data?.merit, "Merit");
    pushEntries(data?.excellence, "Excellence");

    return output;
}

function extractPrimaryStandardNumberFromRows(rows) {
    const standardRows = Array.isArray(rows) ? rows : [];
    for (const row of standardRows) {
        const match = String(row || "").match(/\b\d{4,6}\b/);
        if (match && match[0]) {
            return match[0];
        }
    }
    return "";
}

function buildTaskTopicDetailHref(activityId, topicText, taskShortName = "", topicIndex = 0) {
    const params = new URLSearchParams();
    params.set("id", String(activityId || ""));
    params.set("taskTopic", String(topicText || "").trim());

    const resolvedShortName = String(taskShortName || "").trim() || deriveTaskShortName(topicText);
    if (resolvedShortName) {
        params.set("taskShortName", resolvedShortName);
    }

    if (Number.isFinite(Number(topicIndex)) && Number(topicIndex) > 0) {
        params.set("taskTopicIndex", String(topicIndex));
    }

    return `custom-activity.html?${params.toString()}`;
}

function collectMergedTaskTopicLinks(data, activityId, selectedTopic, selectedShortName) {
    const activeTopic = normalizeTaskTopicText(selectedTopic);
    const activeShortName = String(selectedShortName || "").trim() || deriveTaskShortName(activeTopic);
    if (!activeTopic || !activeShortName) {
        return [];
    }

    const allTopics = collectDetailTaskTopics(data);
    const topicEntries = collectDetailTaskTopicEntries(data);
    if (!topicEntries.length) {
        return [];
    }

    const levelRank = {
        Achieved: 1,
        Merit: 2,
        Excellence: 3,
        General: 4
    };

    const byTopic = new Map();
    topicEntries.forEach((entry) => {
        const topicText = String(entry.text || "").trim();
        if (!topicText) {
            return;
        }

        const resolvedShort = getTaskTopicShortNameOverride(activityId, topicText) || deriveTaskShortName(topicText);
        if (resolvedShort !== activeShortName) {
            return;
        }

        const key = topicText.toLowerCase();
        const existing = byTopic.get(key) || {
            topicText,
            levels: new Set(),
            shortName: resolvedShort
        };

        existing.levels.add(String(entry.level || "General"));
        byTopic.set(key, existing);
    });

    const links = Array.from(byTopic.values()).map((entry) => {
        const topicTextLower = entry.topicText.toLowerCase();
        const topicIndex = allTopics.findIndex((topic) => String(topic || "").trim().toLowerCase() === topicTextLower) + 1;
        const levels = Array.from(entry.levels);
        const primaryLevel = levels
            .slice()
            .sort((a, b) => (levelRank[a] || 99) - (levelRank[b] || 99))[0] || "General";

        return {
            topicText: entry.topicText,
            shortName: entry.shortName,
            levelLabel: levels.join(" / "),
            primaryLevel,
            isCurrent: topicTextLower === activeTopic.toLowerCase(),
            href: buildTaskTopicDetailHref(activityId, entry.topicText, entry.shortName, topicIndex)
        };
    });

    return links.sort((a, b) => {
        const levelDiff = (levelRank[a.primaryLevel] || 99) - (levelRank[b.primaryLevel] || 99);
        if (levelDiff !== 0) {
            return levelDiff;
        }
        return a.topicText.localeCompare(b.topicText);
    });
}

function resolveRequestedTaskTopic(data, params) {
    const requestedTopicText = String(params.get("taskTopic") || "").trim();
    const requestedTopicIndex = Number.parseInt(params.get("taskTopicIndex"), 10);
    const allTopics = collectDetailTaskTopics(data);
    const normalizedRequested = normalizeTaskTopicText(requestedTopicText);

    if (!allTopics.length) {
        return normalizedRequested;
    }

    if (requestedTopicText) {
        const normalizedRequestedLower = normalizedRequested.toLowerCase();
        const exactMatch = allTopics.find((topic) => topic.toLowerCase() === normalizedRequestedLower);
        if (exactMatch) {
            return exactMatch;
        }

        // Preserve clicked topic context even when backend topic parsing does not align.
        if (normalizedRequested) {
            return normalizedRequested;
        }
    }

    if (Number.isFinite(requestedTopicIndex) && requestedTopicIndex > 0) {
        return allTopics[requestedTopicIndex - 1] || "";
    }

    return "";
}

function defaultDetailShape(id, data) {
    const inferredAssessmentCategory = (
        coerceArray(data?.standardDetails).length
        || coerceArray(data?.tasksList).length
        || coerceArray(data?.assessmentFocus ?? data?.assessment_focus).length
        || coerceArray(data?.achieved).length
        || coerceArray(data?.merit).length
        || coerceArray(data?.excellence).length
    ) ? "Assessment Task" : "Activity";

    return {
        id,
        title: String(data?.title || "").trim() || "Activity",
        yearLevel: String(data?.yearLevel || "").trim() || "Year level",
        type: String(data?.type || "").trim() || "Digital Learning",
        duration: String(data?.duration || "120 mins").trim() || "120 mins",
        term: String(data?.term || "Term 2").trim() || "Term 2",
        activityCategory: normalizeCardCategory(data?.activityCategory || data?.activity_category || data?.category, inferredAssessmentCategory),
        showInThisWeek: Boolean(data?.showInThisWeek),
        summary: String(data?.summary || "").trim(),
        resources: Array.isArray(data?.resources) ? data.resources : [],
        equipment: Array.isArray(data?.equipment) ? data.equipment : [],
        instructions: Array.isArray(data?.instructions) ? data.instructions : [],
        cardUrl: String(data?.cardUrl || data?.card_url || data?.activity_url || data?.url || "").trim(),
        image: String(data?.image || "").trim() || "https://placehold.co/900x560/3f89cf/ffffff?text=Uploaded+Activity",
        
        // Project Proposal Fields
        startDate: String(data?.startDate || "").trim(),
        contactName: String(data?.contactName || "").trim(),
        contactPhone: String(data?.contactPhone || "").trim(),
        contactEmail: String(data?.contactEmail || "").trim(),
        company: String(data?.company || "").trim(),
        address: String(data?.address || "").trim(),
        overview: Array.isArray(data?.overview) ? data.overview : [],
        services: Array.isArray(data?.services) ? data.services : [],
        costs: Array.isArray(data?.costs) ? data.costs : [],
        outcomes: Array.isArray(data?.outcomes) ? data.outcomes : [],
        withdrawalDate: String(data?.withdrawalDate || "").trim(),
        clientId: String(data?.clientId || "").trim(),
        
        // Assessment Task Fields
        standardDetails: Array.isArray(data?.standardDetails) ? data.standardDetails : [],
        tasksList: (() => {
            const fromTasksList = coerceArray(data?.tasksList);
            if (fromTasksList.length) {
                return fromTasksList;
            }

            const fromAssessmentFocus = coerceArray(data?.assessmentFocus ?? data?.assessment_focus ?? data?.assessmentFocusRaw);
            if (fromAssessmentFocus.length) {
                return fromAssessmentFocus;
            }

            return [];
        })(),
        achieved: Array.isArray(data?.achieved) ? data.achieved : [],
        merit: Array.isArray(data?.merit) ? data.merit : [],
        excellence: Array.isArray(data?.excellence) ? data.excellence : [],
        submissionRequirements: Array.isArray(data?.submissionRequirements) ? data.submissionRequirements : [],
        relevantImplications: Array.isArray(data?.relevantImplications) ? data.relevantImplications : [],
        progressLogging: Array.isArray(data?.progressLogging) ? data.progressLogging : [],
        feedbackTrialling: Array.isArray(data?.feedbackTrialling) ? data.feedbackTrialling : []
    };
}

function renderDetailView(host, id, data, canEdit, selectedTaskTopic = "", selectedTaskShortName = "") {
    const isAssessmentTask = String(data?.activityCategory || "").toLowerCase().includes("assessment");
    const cardUrl = toSafeExternalUrl(data?.cardUrl);
    const taskTopicTitle = String(selectedTaskTopic || "").trim();
    const isTaskTopicView = Boolean(taskTopicTitle);
    const toolbarLabel = isTaskTopicView
        ? "Task Topic Card"
        : (isAssessmentTask ? "Assessment Task Details" : "Activity");
    const standardTaskTopicUrl = cardUrl || `${window.location.origin}/ProjectPages/custom-activity.html?id=${encodeURIComponent(String(id || ""))}`;
    const parentAssessmentUrl = `custom-activity.html?id=${encodeURIComponent(String(id || ""))}`;
    const resolvedTaskShortName = String(selectedTaskShortName || "").trim()
        || (taskTopicTitle ? getTaskTopicShortNameOverride(id, taskTopicTitle) : "")
        || (taskTopicTitle ? deriveTaskShortName(taskTopicTitle) : "");
    const mergedTaskTopicLinks = isTaskTopicView
        ? collectMergedTaskTopicLinks(data, id, taskTopicTitle, resolvedTaskShortName)
        : [];
    const showMergedTaskTopicLayout = mergedTaskTopicLinks.length > 1;
    const displayTitle = resolvedTaskShortName || taskTopicTitle || data.title;
    const displaySummaryHtml = taskTopicTitle
        ? `Task topic from <a class="task-topic-parent-link" href="${parentAssessmentUrl}">${escapeHtml(data.title)}</a>`
        : escapeHtml(data.summary);
    const taskTopicStandardDetails = coerceArray(data?.standardDetails)
        .map((line) => String(line || "").trim())
        .filter(Boolean);
    const mergedStandardNumber = extractPrimaryStandardNumberFromRows(taskTopicStandardDetails);
    const resolvedTasksList = (() => {
        const fromTasksList = coerceArray(data?.tasksList);
        if (fromTasksList.length) {
            return fromTasksList;
        }
        return coerceArray(data?.assessmentFocus ?? data?.assessment_focus ?? data?.assessmentFocusRaw);
    })();
    const submissionRequirements = coerceArray(data?.submissionRequirements)
        .map((line) => String(line || "").trim())
        .filter(Boolean);
    const relevantImplicationNotes = coerceArray(data?.relevantImplications)
        .map((line) => String(line || "").trim())
        .filter(Boolean);
    const isRelevantImplicationsTopic = taskTopicTitle.toLowerCase().includes("relevant implication");
    const submissionTaskItems = Array.from(new Set([
        ...(isRelevantImplicationsTopic
            ? ["Written evidence that explains your relevant implications and justifies your design decisions."]
            : []),
        ...submissionRequirements
    ]));
    if (!submissionTaskItems.length) {
        submissionTaskItems.push("Upload evidence that clearly demonstrates completion of this task topic.");
    }

    host.classList.toggle("task-topic-screen", isTaskTopicView);

    host.innerHTML = `
        <header class="toolbar">
            <span class="toolbar-label">${toolbarLabel}</span>
            <div class="toolbar-actions">
                ${canEdit ? '<button type="button" class="detail-action" id="detail-edit-button">Edit Details</button>' : ""}
                ${canEdit ? '<button type="button" class="detail-action detail-action-danger" id="detail-delete-button">Delete</button>' : ""}
                <a href="../index.html">Back to Hub</a>
            </div>
        </header>

        <section class="hero">
            <div class="hero-copy">
                <h1>${escapeHtml(displayTitle)}</h1>
                <div class="pills">
                    <span class="pill">${escapeHtml(data.yearLevel)}</span>
                    <span class="pill">${escapeHtml(data.type)}</span>
                    <span class="pill">${escapeHtml(data.duration)}</span>
                    ${taskTopicTitle ? '<span class="pill">Task Topic</span>' : ""}
                </div>
                <p>${displaySummaryHtml}</p>
            </div>
            <div class="hero-image">
                <img src="${escapeHtml(data.image)}" alt="${escapeHtml(displayTitle)} project image" loading="lazy">
            </div>
        </section>

        ${
            isTaskTopicView ? `
            <div class="task-topic-detail-layout">
                <div class="task-topic-detail-main">
                    <section class="proposal-section task-topic-card-basics">
                        <h2>Card Basics</h2>
                        <div class="task-topic-card-grid">
                            <div class="task-topic-card-field">
                                <span class="task-topic-card-label">Card Name</span>
                                <p class="task-topic-card-value">${escapeHtml(displayTitle)}</p>
                            </div>
                            <div class="task-topic-card-field">
                                <span class="task-topic-card-label">Year Level</span>
                                <p class="task-topic-card-value">Senior</p>
                            </div>
                            <div class="task-topic-card-field">
                                <span class="task-topic-card-label">Card Category</span>
                                <p class="task-topic-card-value">Task Topic</p>
                            </div>
                            <div class="task-topic-card-field">
                                <span class="task-topic-card-label">Subject Stream</span>
                                <p class="task-topic-card-value">DTECH</p>
                            </div>
                            <div class="task-topic-card-field">
                                <span class="task-topic-card-label">Topic Type</span>
                                <p class="task-topic-card-value">Process</p>
                            </div>
                            <div class="task-topic-card-field">
                                <span class="task-topic-card-label">Difficulty</span>
                                <p class="task-topic-card-value">Intermediate</p>
                            </div>
                            <div class="task-topic-card-field task-topic-card-field-full">
                                <span class="task-topic-card-label">Card URL</span>
                                <p class="task-topic-card-value"><a href="${escapeHtml(standardTaskTopicUrl)}" target="_blank" rel="noreferrer">${escapeHtml(standardTaskTopicUrl)}</a></p>
                            </div>
                            <div class="task-topic-card-field task-topic-card-field-full">
                                <span class="task-topic-card-label">Short Description</span>
                                <p class="task-topic-card-value">${escapeHtml(taskTopicTitle)}</p>
                            </div>
                        </div>
                    </section>

                    ${showMergedTaskTopicLayout ? `
                    <section class="proposal-section task-topic-merged-overview">
                        <div class="task-topic-merged-grid">
                            <article class="task-topic-merged-column task-topic-standards-panel">
                                <h2>Standard Details</h2>
                                ${taskTopicStandardDetails.length
                                    ? `<div class="task-topic-standard-list task-topic-standard-list-prominent">${taskTopicStandardDetails.map((line) => `<span class="task-topic-standard-chip task-topic-standard-chip-prominent">${escapeHtml(line)}</span>`).join("")}</div>`
                                    : `<p class="task-topic-card-value">No standards linked.</p>`
                                }
                            </article>
                            <article class="task-topic-merged-column task-topic-merged-links-panel">
                                <h2>Merged Task Topic Cards</h2>
                                <p class="task-topic-merged-links-subtitle">Open each merged card from its level.</p>
                                <ul class="task-topic-merged-links-list">
                                    ${mergedTaskTopicLinks.map((entry) => `
                                        <li class="task-topic-merged-link-item">
                                            ${entry.isCurrent
                                                ? `<span class="task-topic-merged-link current">${escapeHtml(entry.topicText)}</span>`
                                                : `<a class="task-topic-merged-link" href="${escapeHtml(entry.href)}">${escapeHtml(entry.topicText)}</a>`
                                            }
                                            <div class="task-topic-merged-pills">
                                                <span class="task-topic-merged-level">${escapeHtml(entry.levelLabel)}</span>
                                                ${mergedStandardNumber ? `<span class="task-topic-merged-standard">${escapeHtml(mergedStandardNumber)}</span>` : ""}
                                            </div>
                                        </li>
                                    `).join("")}
                                </ul>
                            </article>
                        </div>
                    </section>
                    ` : `
                    <section class="proposal-section task-topic-standards-panel">
                        <h2>Standard Details</h2>
                        ${taskTopicStandardDetails.length
                            ? `<div class="task-topic-standard-list task-topic-standard-list-prominent">${taskTopicStandardDetails.map((line) => `<span class="task-topic-standard-chip task-topic-standard-chip-prominent">${escapeHtml(line)}</span>`).join("")}</div>`
                            : `<p class="task-topic-card-value">No standards linked.</p>`
                        }
                    </section>
                    `}

                    <section class="proposal-section task-topic-display-options">
                        <h2>Display Options</h2>
                        <div class="task-topic-display-grid">
                            <div class="task-topic-card-field task-topic-card-field-full">
                                <span class="task-topic-card-label">Card Colour</span>
                                <p class="task-topic-card-value">Azure</p>
                            </div>
                            <div class="task-topic-display-check">
                                <span class="task-topic-check-box" aria-hidden="true"></span>
                                <span>Time Sensitive</span>
                            </div>
                            <div class="task-topic-display-check is-checked">
                                <span class="task-topic-check-box" aria-hidden="true">✓</span>
                                <span>Show In This Week Section</span>
                            </div>
                        </div>
                    </section>
                </div>

                <aside class="task-topic-submission-column">
                    <section class="proposal-section task-topic-submission-panel">
                        <h2>Submission Tasks</h2>
                        <p class="task-topic-submission-intro">Students submit evidence here to show they have completed this task topic.</p>
                        <div class="task-topic-submission-evidence-type">
                            <span class="task-topic-card-label">Primary Evidence Type</span>
                            <p class="task-topic-card-value">${isRelevantImplicationsTopic ? "Written Evidence" : "Evidence Upload"}</p>
                        </div>
                        <ul class="list task-topic-submission-list">${renderList(submissionTaskItems)}</ul>
                        <div id="task-topic-submission-live-panel" class="task-topic-submission-live-panel"></div>
                    </section>

                    ${relevantImplicationNotes.length ? `
                    <section class="proposal-section task-topic-submission-panel">
                        <h2>Relevant Implications Focus</h2>
                        <ul class="list task-topic-submission-list">${renderList(relevantImplicationNotes)}</ul>
                    </section>
                    ` : ""}
                </aside>
            </div>
            ` : ""
        }

        <section class="proposal-details" ${isTaskTopicView ? 'hidden' : ""}>
            ${data.startDate ? `<div class="detail-row"><strong>EST. Start Date:</strong> <span>${escapeHtml(data.startDate)}</span></div>` : ""}
        </section>

        ${
            !isTaskTopicView && isAssessmentTask && data.summary ? `
            <section class="proposal-section">
                <h2>Short Description</h2>
                <p>${escapeHtml(data.summary)}</p>
            </section>
            ` : ""
        }

        ${
            !isTaskTopicView && isAssessmentTask && resolvedTasksList.length ? `
            <section class="proposal-section">
                <h2>Task List</h2>
                <ol class="list">${renderList(resolvedTasksList)}</ol>
            </section>
            ` : ""
        }

        ${
            data.contactName || data.company || data.address ? `
            <section class="proposal-section">
                <h2>Client's Contact Information</h2>
                <div class="detail-grid">
                    ${data.contactName ? `<div class="detail-field"><strong>Contact Name:</strong> ${escapeHtml(data.contactName)}</div>` : ""}
                    ${data.contactPhone ? `<div class="detail-field"><strong>Phone:</strong> ${escapeHtml(data.contactPhone)}</div>` : ""}
                    ${data.contactEmail ? `<div class="detail-field"><strong>Email:</strong> <a href="mailto:${escapeHtml(data.contactEmail)}">${escapeHtml(data.contactEmail)}</a></div>` : ""}
                    ${data.company ? `<div class="detail-field"><strong>Company:</strong> ${escapeHtml(data.company)}</div>` : ""}
                    ${data.address ? `<div class="detail-field detail-field-full"><strong>Address:</strong> ${escapeHtml(data.address)}</div>` : ""}
                </div>
            </section>
            ` : ""
        }

        ${
            data.overview.length ? `
            <section class="proposal-section">
                <h2>${escapeHtml(data.company ? data.company : "Project")} Overview and Needs</h2>
                <ul class="list">${renderList(data.overview)}</ul>
            </section>
            ` : ""
        }

        ${
            data.services.length ? `
            <section class="proposal-section">
                <h2>Services Provided</h2>
                <ul class="list">${renderList(data.services)}</ul>
            </section>
            ` : ""
        }

        ${
            data.costs.length ? `
            <section class="proposal-section">
                <h2>Estimated Service Cost to be Incurred by Client</h2>
                <ul class="list">${renderList(data.costs)}</ul>
            </section>
            ` : ""
        }

        ${
            data.outcomes.length ? `
            <section class="proposal-section">
                <h2>Positive Outcomes of the Services Provided</h2>
                <ul class="list">${renderList(data.outcomes)}</ul>
            </section>
            ` : ""
        }

        ${
            data.withdrawalDate ? `
            <section class="proposal-section">
                <h2>All-or-Nothing Terms</h2>
                <p class="detail-field"><strong>Withdrawal if not Accepted by Date of:</strong> <span>${escapeHtml(data.withdrawalDate)}</span></p>
            </section>
            ` : ""
        }

        ${
            data.clientId ? `
            <section class="proposal-section">
                <h2>Project Client Details</h2>
                <p class="detail-field"><strong>Client ID / Details:</strong> <span>${escapeHtml(data.clientId)}</span></p>
            </section>
            ` : ""
        }

        ${
            data.resources.length || data.equipment.length || data.instructions.length || cardUrl ? `
            <section class="grid">
                ${data.resources.length || cardUrl ? `<article class="card">
                    <h2>Resources</h2>
                    <p class="sub">Materials needed.</p>
                    ${data.resources.length ? `<ul class="list">${renderList(data.resources)}</ul>` : ""}
                    ${cardUrl ? `<div class="card-url-box">
                        <p class="card-url-label">Card URL</p>
                        <a class="card-url-link" href="${escapeHtml(cardUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(cardUrl)}</a>
                    </div>` : ""}
                </article>` : ""}
                ${data.equipment.length ? `<article class="card">
                    <h2>Equipment</h2>
                    <p class="sub">Tools and systems used.</p>
                    <ul class="list">${renderList(data.equipment)}</ul>
                </article>` : ""}
                ${data.instructions.length ? `<article class="card">
                    <h2>Instructions</h2>
                    <p class="sub">Step-by-step method.</p>
                    <ol class="list">${renderList(data.instructions)}</ol>
                </article>` : ""}
            </section>
            ` : ""
        }
    `;

    const editButton = host.querySelector("#detail-edit-button");
    const deleteButton = host.querySelector("#detail-delete-button");
    if (editButton) {
        // If this is a backend upload, route to the matching uploader page for prefilled editing.
        if (String(id).match(/^\d+$/)) {
            editButton.addEventListener("click", () => {
                const category = String(data?.activityCategory || "").toLowerCase();

                let targetPage = "../upload-activity.html";
                if (isTaskTopicView) {
                    void renderTaskTopicEditForm(host, id, data, canEdit, taskTopicTitle, selectedTaskShortName);
                    return;
                }
                if (category.includes("assessment")) {
                    targetPage = "../upload-assessment.html";
                } else if (category.includes("project")) {
                    targetPage = "../upload-project.html";
                }
                window.location.href = `${targetPage}?id=${encodeURIComponent(id)}`;
            });
        } else {
            // For base activities, use the in-place edit form
            editButton.addEventListener("click", () => renderEditForm(host, id, data));
        }
    }

    if (deleteButton) {
        deleteButton.addEventListener("click", async () => {
            const confirmed = window.confirm(`Delete "${data.title}"? This cannot be undone.`);
            if (!confirmed) {
                return;
            }

            deleteButton.disabled = true;
            try {
                await deleteDetails(id);
                window.location.href = "../index.html#project-library";
            } catch (error) {
                deleteButton.disabled = false;
                window.alert(error.message || "Could not delete this activity/project.");
            }
        });
    }
}

async function deleteDetails(id) {
    const response = await fetch(`/api/activities/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: buildWriteHeaders()
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(result.error || result.message || "Could not delete this activity/project.");
    }
}

async function saveDetails(id, draft) {
    const toArraySafe = (value) => {
        if (Array.isArray(value)) {
            return value.map((item) => String(item || "").trim()).filter(Boolean);
        }
        if (typeof value === "string") {
            const trimmed = value.trim();
            if (!trimmed) return [];
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    return parsed.map((item) => String(item || "").trim()).filter(Boolean);
                }
            } catch (_error) {
            }
            return trimmed
                .split(/\r?\n/)
                .map((item) => item.trim())
                .filter(Boolean);
        }
        return [];
    };

    const payload = {
        id,
        name: draft.title,
        year_level: draft.yearLevel,
        type: draft.type,
            activity_category: normalizeCardCategory(draft.activityCategory, "Activity"),
        duration_minutes: parseDurationMinutes(draft.durationMinutes),
        outcome_image_url: isGeneratedUploadedActivityImageUrl(draft.image) ? "" : draft.image,
        description: draft.summary,
        resources: draft.resources,
        equipment: draft.equipment,
        instructions: draft.instructions,
        card_url: draft.cardUrl,
        show_in_this_week: draft.showInThisWeek,
        term: draft.term,
        
        // Project Proposal Fields
        start_date: draft.startDate,
        contact_name: draft.contactName,
        contact_phone: draft.contactPhone,
        contact_email: draft.contactEmail,
        company: draft.company,
        address: draft.address,
        overview: draft.overview,
        services: draft.services,
        costs: draft.costs,
        outcomes: draft.outcomes,
        withdrawal_date: draft.withdrawalDate,
        client_id: draft.clientId,
        
        // Assessment Task Fields
        standard_details: draft.standardDetails,
        tasks_list: draft.tasksList,
        assessment_focus: draft.tasksList,
        achieved: draft.achieved,
        merit: draft.merit,
        excellence: draft.excellence,
        submission_requirements: draft.submissionRequirements,
        relevant_implications: draft.relevantImplications,
        progress_logging: draft.progressLogging,
        feedback_trialling: draft.feedbackTrialling
    };

    const response = await fetch("/api/activities", {
        method: "POST",
        headers: buildWriteHeaders(),
        body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(result.error || result.message || "Could not save changes.");
    }

    return {
        id: result.id || id,
        title: result.name || draft.title,
        yearLevel: result.year_level || draft.yearLevel,
        type: result.type || draft.type,
        duration: result.duration_minutes
            ? `${result.duration_minutes} mins`
            : `${parseDurationMinutes(draft.durationMinutes)} mins`,
        term: result.term || draft.term,
        activityCategory: normalizeCardCategory(result.activity_category || draft.activityCategory, "Activity"),
        showInThisWeek: Boolean(result.show_in_this_week ?? result.show_this_week ?? result.is_pinned ?? result.is_this_week ?? draft.showInThisWeek),
        summary: String(result.description || result.summary || draft.summary || "").trim(),
        resources: Array.isArray(result.resources) ? result.resources : draft.resources,
        equipment: Array.isArray(result.equipment) ? result.equipment : draft.equipment,
        instructions: Array.isArray(result.instructions) ? result.instructions : draft.instructions,
        cardUrl: String(result.card_url || result.activity_url || result.url || draft.cardUrl || "").trim(),
        image: result.outcome_image_url || draft.image,
        
        // Project Proposal Fields
        startDate: result.start_date || draft.startDate,
        contactName: result.contact_name || draft.contactName,
        contactPhone: result.contact_phone || draft.contactPhone,
        contactEmail: result.contact_email || draft.contactEmail,
        company: result.company || draft.company,
        address: result.address || draft.address,
        overview: Array.isArray(result.overview) ? result.overview : draft.overview,
        services: Array.isArray(result.services) ? result.services : draft.services,
        costs: Array.isArray(result.costs) ? result.costs : draft.costs,
        outcomes: Array.isArray(result.outcomes) ? result.outcomes : draft.outcomes,
        withdrawalDate: result.withdrawal_date || draft.withdrawalDate,
        clientId: result.client_id || draft.clientId,

        // Assessment Task Fields
        standardDetails: Array.isArray(result.standard_details) ? result.standard_details : draft.standardDetails,
        tasksList: (() => {
            const fromTasksList = toArraySafe(result.tasks_list);
            if (fromTasksList.length) {
                return fromTasksList;
            }
            const fromAssessmentFocus = toArraySafe(result.assessment_focus);
            if (fromAssessmentFocus.length) {
                return fromAssessmentFocus;
            }
            return draft.tasksList;
        })(),
        achieved: Array.isArray(result.achieved) ? result.achieved : draft.achieved,
        merit: Array.isArray(result.merit) ? result.merit : draft.merit,
        excellence: Array.isArray(result.excellence) ? result.excellence : draft.excellence,
        submissionRequirements: Array.isArray(result.submission_requirements) ? result.submission_requirements : draft.submissionRequirements,
        relevantImplications: Array.isArray(result.relevant_implications) ? result.relevant_implications : draft.relevantImplications,
        progressLogging: Array.isArray(result.progress_logging) ? result.progress_logging : draft.progressLogging,
        feedbackTrialling: Array.isArray(result.feedback_trialling) ? result.feedback_trialling : draft.feedbackTrialling
    };
}

function replaceTaskTopicInLines(lines, previousTopic, nextTopic) {
    const source = Array.isArray(lines) ? lines : [];
    const previousNormalized = normalizeTaskTopicText(previousTopic).toLowerCase();
    const nextValue = String(nextTopic || "").trim();

    if (!previousNormalized || !nextValue) {
        return source;
    }

    return source.map((line) => {
        const text = String(line || "").trim();
        if (!text) {
            return text;
        }

        const levelMatch = text.match(/^(Achieved|Merit|Excellence)\s*:\s*(.*)$/i);
        const rawValue = levelMatch ? String(levelMatch[2] || "").trim() : text;
        const normalizedValue = normalizeTaskTopicText(rawValue).toLowerCase();
        if (normalizedValue !== previousNormalized) {
            return text;
        }

        if (levelMatch) {
            return `${levelMatch[1]}: ${nextValue}`;
        }

        return nextValue;
    });
}

function renderTaskTopicEditForm(host, id, data, canEdit, selectedTaskTopic, selectedTaskShortName = "") {
    const currentTopic = String(selectedTaskTopic || "").trim();
    const currentShortName = String(selectedTaskShortName || "").trim()
        || getTaskTopicShortNameOverride(id, currentTopic)
        || deriveTaskShortName(currentTopic);
    const standardTaskTopicUrl = toSafeExternalUrl(data?.cardUrl)
        || `${window.location.origin}/ProjectPages/custom-activity.html?id=${encodeURIComponent(String(id || ""))}`;
    const renderOptions = (options, selectedValue) => options
        .map((option) => {
            const safeOption = String(option || "").trim();
            const selected = safeOption === String(selectedValue || "").trim() ? " selected" : "";
            return `<option${selected}>${escapeHtml(safeOption)}</option>`;
        })
        .join("");

    const yearLevelOptions = ["Junior", "Middle", "Senior", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"];
    const cardCategoryOptions = ["Activity", "Project", "Assessment Task", "Lesson", "Task Topic"];
    const subjectStreamOptions = ["DTECH", "COMP", "TEXT", "DTONLINE"];
    const topicTypeOptions = ["Office Suite", "Programming", "Electronics", "Digital Media", "Project Management", "Process"];
    const difficultyOptions = ["Beginner", "Intermediate", "Advanced"];

    const selectedYearLevel = "Senior";
    const selectedCardCategory = "Task Topic";
    const selectedSubjectStream = "DTECH";
    const selectedTopicType = "Process";
    const selectedDifficulty = "Intermediate";

    if (!currentTopic) {
        renderDetailView(host, id, data, canEdit, selectedTaskTopic);
        return;
    }

    const formId = `task-topic-edit-form-${id}`;
    host.innerHTML = `
        <header class="toolbar">
            <span class="toolbar-label">Edit Task Topic Card</span>
            <div class="toolbar-actions">
                <a href="../index.html">Back to Hub</a>
            </div>
        </header>

        <form id="${formId}" class="detail-form" novalidate>
            <fieldset class="detail-form-section">
                <legend>Card Basics</legend>
                <div class="detail-form-grid">
                    <label class="detail-field">
                        <span>Card Name</span>
                        <input name="taskTopicShortName" type="text" required value="${escapeHtml(currentShortName)}">
                    </label>
                    <label class="detail-field">
                        <span>Year Level</span>
                        <select name="taskTopicYearLevel">
                            ${renderOptions(yearLevelOptions, selectedYearLevel)}
                        </select>
                    </label>
                    <label class="detail-field">
                        <span>Card Category</span>
                        <select name="taskTopicCategory" disabled>
                            ${renderOptions(cardCategoryOptions, selectedCardCategory)}
                        </select>
                    </label>
                    <label class="detail-field">
                        <span>Subject Stream</span>
                        <select name="taskTopicSubject">
                            ${renderOptions(subjectStreamOptions, selectedSubjectStream)}
                        </select>
                    </label>
                    <label class="detail-field">
                        <span>Topic Type</span>
                        <select name="taskTopicType">
                            ${renderOptions(topicTypeOptions, selectedTopicType)}
                        </select>
                    </label>
                    <label class="detail-field">
                        <span>Difficulty</span>
                        <select name="taskTopicDifficulty">
                            ${renderOptions(difficultyOptions, selectedDifficulty)}
                        </select>
                    </label>
                    <label class="detail-field detail-field-full">
                        <span>Standard Details</span>
                        <div class="task-topic-standard-controls">
                            <select name="taskTopicStandardLibrary">
                                <option value="">Loading standards...</option>
                            </select>
                            <button type="button" class="detail-action detail-action-secondary" id="task-topic-standard-add">Add Standard</button>
                            <a class="detail-action detail-action-secondary" href="../admin-assessment-information.html" target="_blank" rel="noreferrer">Open Standards Manager</a>
                        </div>
                        <input name="taskTopicStandardDetails" type="hidden" value="">
                        <div class="task-topic-standard-list task-topic-standard-edit-list" id="task-topic-standard-chip-list"></div>
                    </label>
                    <label class="detail-field detail-field-full">
                        <span>Card URL</span>
                        <input name="taskTopicUrl" type="url" value="${escapeHtml(standardTaskTopicUrl)}" readonly>
                    </label>
                    <label class="detail-field detail-field-full">
                        <span>Short Description</span>
                        <textarea name="taskTopicSummary" rows="4" required>${escapeHtml(currentTopic)}</textarea>
                    </label>
                </div>
            </fieldset>

            <fieldset class="detail-form-section">
                <legend>Display Options</legend>
                <div class="detail-form-grid">
                    <label class="detail-field detail-field-full">
                        <span>Card Colour</span>
                        <input name="taskTopicColor" type="text" value="Azure" readonly>
                    </label>
                    <label class="detail-field detail-field-full" style="display:flex;align-items:center;gap:8px;">
                        <input name="taskTopicTimeSensitive" type="checkbox" disabled>
                        <span style="margin:0;">Time Sensitive</span>
                    </label>
                    <label class="detail-field detail-field-full" style="display:flex;align-items:center;gap:8px;">
                        <input name="taskTopicShowThisWeek" type="checkbox" checked disabled>
                        <span style="margin:0;">Show In This Week Section</span>
                    </label>
                </div>
            </fieldset>

            <div class="detail-form-actions">
                <button type="submit" class="detail-action">Save Task Topic</button>
                <button type="button" class="detail-action detail-action-secondary" id="task-topic-edit-cancel">Cancel</button>
                <p class="detail-form-status" id="task-topic-edit-status" aria-live="polite"></p>
            </div>
        </form>
    `;

    const form = host.querySelector(`#${formId}`);
    const cancelButton = host.querySelector("#task-topic-edit-cancel");
    const statusElement = host.querySelector("#task-topic-edit-status");
    const standardSelect = host.querySelector("[name='taskTopicStandardLibrary']");
    const standardAddButton = host.querySelector("#task-topic-standard-add");
    const standardChipList = host.querySelector("#task-topic-standard-chip-list");
    const standardHiddenInput = host.querySelector("[name='taskTopicStandardDetails']");
    let standardLines = coerceArray(data?.standardDetails)
        .map((line) => String(line || "").trim())
        .filter(Boolean);

    const renderStandardChips = () => {
        if (!standardChipList || !standardHiddenInput) {
            return;
        }

        standardHiddenInput.value = standardLines.join("\n");
        if (!standardLines.length) {
            standardChipList.innerHTML = '<span class="task-topic-standard-empty">No standards selected yet.</span>';
            return;
        }

        standardChipList.innerHTML = standardLines
            .map((line, index) => `
                <span class="task-topic-standard-chip">
                    ${escapeHtml(line)}
                    <button type="button" class="task-topic-standard-remove" data-standard-remove-index="${index}">Remove</button>
                </span>
            `)
            .join("");
    };

    const loadStandardOptions = async () => {
        if (!standardSelect) {
            return;
        }

        standardSelect.innerHTML = '<option value="">Loading standards...</option>';
        standardSelect.disabled = true;
        if (standardAddButton) {
            standardAddButton.disabled = true;
        }

        try {
            const options = await getDetailStandardsOptions();
            if (!Array.isArray(options) || !options.length) {
                standardSelect.innerHTML = '<option value="">No standards available</option>';
                return;
            }

            standardSelect.innerHTML = [
                '<option value="">Select a standard...</option>',
                ...options.map((row) => {
                    const label = formatDetailStandardOption(row);
                    return `<option value="${escapeHtml(label)}">${escapeHtml(label)}</option>`;
                })
            ].join("");
        } catch (_error) {
            standardSelect.innerHTML = '<option value="">Could not load standards</option>';
        } finally {
            standardSelect.disabled = false;
            if (standardAddButton) {
                standardAddButton.disabled = false;
            }
        }
    };

    renderStandardChips();
    void loadStandardOptions();

    cancelButton?.addEventListener("click", () => {
        renderDetailView(host, id, data, canEdit, selectedTaskTopic, currentShortName);
    });

    standardAddButton?.addEventListener("click", () => {
        const selected = String(standardSelect?.value || "").trim();
        if (!selected) {
            return;
        }

        if (!standardLines.includes(selected)) {
            standardLines.push(selected);
            renderStandardChips();
        }
    });

    standardChipList?.addEventListener("click", (event) => {
        const target = event.target.closest("button[data-standard-remove-index]");
        if (!target) {
            return;
        }

        const index = Number.parseInt(target.getAttribute("data-standard-remove-index"), 10);
        if (!Number.isInteger(index) || index < 0 || index >= standardLines.length) {
            return;
        }

        standardLines.splice(index, 1);
        renderStandardChips();
    });

    form?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const nextShortName = String(formData.get("taskTopicShortName") || "").trim();
        const nextTopic = normalizeTaskTopicText(formData.get("taskTopicSummary") || "");

        if (!nextShortName) {
            if (statusElement) {
                statusElement.textContent = "Task short name is required.";
                statusElement.classList.add("is-error");
            }
            return;
        }

        if (!nextTopic) {
            if (statusElement) {
                statusElement.textContent = "Task long name (Short Description) is required.";
                statusElement.classList.add("is-error");
            }
            return;
        }

        if (statusElement) {
            statusElement.textContent = "Saving...";
            statusElement.classList.remove("is-error");
        }

        const draft = {
            title: data.title,
            yearLevel: data.yearLevel,
            type: data.type,
            durationMinutes: parseDurationMinutes(data.duration),
            term: data.term,
            activityCategory: data.activityCategory,
            showInThisWeek: data.showInThisWeek,
            summary: data.summary,
            resources: coerceArray(data.resources),
            equipment: coerceArray(data.equipment),
            instructions: coerceArray(data.instructions),
            cardUrl: data.cardUrl,
            image: data.image,
            startDate: data.startDate,
            contactName: data.contactName,
            contactPhone: data.contactPhone,
            contactEmail: data.contactEmail,
            company: data.company,
            address: data.address,
            overview: coerceArray(data.overview),
            services: coerceArray(data.services),
            costs: coerceArray(data.costs),
            outcomes: coerceArray(data.outcomes),
            withdrawalDate: data.withdrawalDate,
            clientId: data.clientId,
            standardDetails: standardLines,
            tasksList: replaceTaskTopicInLines(coerceArray(data.tasksList), currentTopic, nextTopic),
            achieved: replaceTaskTopicInLines(coerceArray(data.achieved), currentTopic, nextTopic),
            merit: replaceTaskTopicInLines(coerceArray(data.merit), currentTopic, nextTopic),
            excellence: replaceTaskTopicInLines(coerceArray(data.excellence), currentTopic, nextTopic),
            submissionRequirements: coerceArray(data.submissionRequirements),
            relevantImplications: coerceArray(data.relevantImplications),
            progressLogging: coerceArray(data.progressLogging),
            feedbackTrialling: coerceArray(data.feedbackTrialling)
        };

        try {
            const saved = await saveDetails(id, draft);
            setTaskTopicShortNameOverride(id, currentTopic, "");
            setTaskTopicShortNameOverride(id, nextTopic, nextShortName);
            if (statusElement) {
                statusElement.textContent = "Saved.";
                statusElement.classList.remove("is-error");
            }
            renderDetailView(host, id, saved, canEdit, nextTopic, nextShortName);
        } catch (error) {
            if (statusElement) {
                statusElement.textContent = error.message || "Could not save task topic.";
                statusElement.classList.add("is-error");
            }
        }
    });
}

function renderEditForm(host, id, data) {
    const formId = `detail-edit-form-${id}`;
    const normalizedCategory = normalizeCardCategory(data.activityCategory, "Activity");
    const isProjectCategory = normalizedCategory === "Project";
    const editorLabel = isProjectCategory ? "Project" : (normalizedCategory || "Activity");
    const basicsLegend = isProjectCategory ? "Project Basics" : "Activity Basics";

    host.innerHTML = `
        <header class="toolbar">
            <span class="toolbar-label">Edit ${escapeHtml(editorLabel)}</span>
            <div class="toolbar-actions">
                <a href="../index.html">Back to Hub</a>
            </div>
        </header>

        <form id="${formId}" class="detail-form" novalidate>
            <fieldset class="detail-form-section">
                <legend>${escapeHtml(basicsLegend)}</legend>
                <div class="detail-form-grid">
                    <label class="detail-field">
                        <span>Title</span>
                        <input name="title" type="text" required value="${escapeHtml(data.title)}">
                    </label>
                    <label class="detail-field">
                        <span>Start Date</span>
                        <input name="startDate" type="date" value="${escapeHtml(data.startDate)}">
                    </label>
                    <label class="detail-field">
                        <span>Year Level</span>
                        <input name="yearLevel" type="text" required value="${escapeHtml(data.yearLevel)}">
                    </label>
                    <label class="detail-field">
                        <span>Type</span>
                        <input name="type" type="text" required value="${escapeHtml(data.type)}">
                    </label>
                    <label class="detail-field">
                        <span>Duration (minutes)</span>
                        <input name="durationMinutes" type="number" min="1" step="1" required value="${parseDurationMinutes(data.duration)}">
                    </label>
                    <label class="detail-field">
                        <span>Activity Category</span>
                        <select name="activityCategory">
                            <option${normalizeCardCategory(data.activityCategory, "Activity") === "Activity" ? " selected" : ""}>Activity</option>
                            <option${normalizeCardCategory(data.activityCategory, "Activity") === "Project" ? " selected" : ""}>Project</option>
                            <option${normalizeCardCategory(data.activityCategory, "Activity") === "Assessment Task" ? " selected" : ""}>Assessment Task</option>
                            <option${normalizeCardCategory(data.activityCategory, "Activity") === "Lesson" ? " selected" : ""}>Lesson</option>
                        </select>
                    </label>
                </div>
            </fieldset>

            <fieldset class="detail-form-section">
                <legend>Client's Contact Information</legend>
                <div class="detail-form-grid">
                    <label class="detail-field">
                        <span>Contact Name</span>
                        <input name="contactName" type="text" value="${escapeHtml(data.contactName)}">
                    </label>
                    <label class="detail-field">
                        <span>Phone</span>
                        <input name="contactPhone" type="tel" value="${escapeHtml(data.contactPhone)}">
                    </label>
                    <label class="detail-field">
                        <span>Email</span>
                        <input name="contactEmail" type="email" value="${escapeHtml(data.contactEmail)}">
                    </label>
                    <label class="detail-field">
                        <span>Company</span>
                        <input name="company" type="text" value="${escapeHtml(data.company)}">
                    </label>
                    <label class="detail-field">
                        <span>Address</span>
                        <input name="address" type="text" value="${escapeHtml(data.address)}">
                    </label>
                </div>
            </fieldset>

            <label class="detail-field detail-field-full">
                <span>Summary</span>
                <textarea name="summary" rows="4">${escapeHtml(data.summary)}</textarea>
            </label>

            <fieldset class="detail-form-section">
                <legend>Tasks & Assessment</legend>
                <label class="detail-field detail-field-full">
                    <span>Standard Details (one per line)</span>
                    <div class="practical-inline-manage" style="margin-bottom: 8px;">
                        <select name="standardLibraryOption" style="min-width: 260px;">
                            <option value="">Loading standards...</option>
                        </select>
                        <button type="button" class="detail-action detail-action-secondary" data-add-standard-line>Add Standard</button>
                    </div>
                    <div class="standard-chip-list" data-standard-chip-list aria-live="polite"></div>
                    <textarea name="standardDetails" class="standard-details-storage" aria-hidden="true" tabindex="-1" rows="4">${escapeHtml(asLines(data.standardDetails))}</textarea>
                </label>
                <label class="detail-field detail-field-full">
                    <span>Tasks List (one per line)</span>
                    <textarea name="tasksList" rows="6">${escapeHtml(asLines(data.tasksList))}</textarea>
                </label>
                <label class="detail-field detail-field-full">
                    <span>Achieved (one per line)</span>
                    <textarea name="achieved" rows="4">${escapeHtml(asLines(data.achieved))}</textarea>
                </label>
                <label class="detail-field detail-field-full">
                    <span>Merit (one per line)</span>
                    <textarea name="merit" rows="4">${escapeHtml(asLines(data.merit))}</textarea>
                </label>
                <label class="detail-field detail-field-full">
                    <span>Excellence (one per line)</span>
                    <textarea name="excellence" rows="4">${escapeHtml(asLines(data.excellence))}</textarea>
                </label>
            </fieldset>

            <fieldset class="detail-form-section">
                <legend>Proposal Content</legend>
                <label class="detail-field detail-field-full">
                    <span>Overview and Needs (one per line)</span>
                    <textarea name="overview" rows="6">${escapeHtml(asLines(data.overview))}</textarea>
                </label>
                <label class="detail-field detail-field-full">
                    <span>Services Provided (one per line)</span>
                    <textarea name="services" rows="6">${escapeHtml(asLines(data.services))}</textarea>
                </label>
                <label class="detail-field detail-field-full">
                    <span>Estimated Costs (one per line)</span>
                    <textarea name="costs" rows="6">${escapeHtml(asLines(data.costs))}</textarea>
                </label>
                <label class="detail-field detail-field-full">
                    <span>Positive Outcomes (one per line)</span>
                    <textarea name="outcomes" rows="6">${escapeHtml(asLines(data.outcomes))}</textarea>
                </label>
            </fieldset>

            <fieldset class="detail-form-section">
                <legend>Proposal Terms</legend>
                <label class="detail-field">
                    <span>Withdrawal Date</span>
                    <input name="withdrawalDate" type="date" value="${escapeHtml(data.withdrawalDate)}">
                </label>
                <label class="detail-field detail-field-full">
                    <span>Client ID / Details</span>
                    <input name="clientId" type="text" value="${escapeHtml(data.clientId)}">
                </label>
            </fieldset>

            <label class="detail-field detail-field-full">
                <span>Image URL</span>
                <input name="image" type="url" value="${escapeHtml(data.image)}">
            </label>

            <div class="detail-form-grid">
                <label class="detail-field detail-field-full">
                    <span>Resources (one per line)</span>
                    <textarea name="resources" rows="4">${escapeHtml(asLines(data.resources))}</textarea>
                </label>
                <label class="detail-field detail-field-full">
                    <span>Equipment (one per line)</span>
                    <textarea name="equipment" rows="4">${escapeHtml(asLines(data.equipment))}</textarea>
                </label>
                <label class="detail-field detail-field-full">
                    <span>Instructions (one per line)</span>
                    <textarea name="instructions" rows="4">${escapeHtml(asLines(data.instructions))}</textarea>
                </label>
            </div>

            <label class="detail-checkbox">
                <input name="showInThisWeek" type="checkbox" ${data.showInThisWeek ? "checked" : ""}>
                <span>Show in This Week</span>
            </label>

            <div class="detail-form-actions">
                <button type="submit" class="detail-action">Save Changes</button>
                <button type="button" class="detail-action detail-action-secondary" id="detail-cancel">Cancel</button>
            </div>
            <p class="detail-status" id="detail-status" aria-live="polite"></p>
        </form>
    `;

    const form = host.querySelector(`#${formId}`);
    const status = host.querySelector("#detail-status");
    const cancelButton = host.querySelector("#detail-cancel");

    const setStatus = (message, isError = false) => {
        if (!status) return;
        status.textContent = message;
        status.classList.toggle("is-error", isError);
    };

    if (cancelButton) {
        cancelButton.addEventListener("click", async () => {
            const latestShared = await readSharedActivity(id);
            const fallback = defaultDetailShape(id, data);
            const nextData = defaultDetailShape(id, latestShared || DETAIL_DATA[id] || fallback);
            renderDetailView(host, id, nextData, true);
        });
    }

    if (!form) return;

    setupDetailStandardsPicker(form, setStatus);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const draft = {
            title: String(formData.get("title") || "").trim(),
            yearLevel: String(formData.get("yearLevel") || "").trim(),
            type: String(formData.get("type") || "").trim(),
            durationMinutes: String(formData.get("durationMinutes") || "").trim(),
            term: String(formData.get("term") || "").trim() || "Term 2",
            activityCategory: normalizeCardCategory(formData.get("activityCategory"), data?.activityCategory || "Assessment Task"),
            summary: String(formData.get("summary") || "").trim(),
            image: String(formData.get("image") || "").trim() || "https://placehold.co/900x560/3f89cf/ffffff?text=Uploaded+Activity",
            resources: parseLines(formData.get("resources")),
            equipment: parseLines(formData.get("equipment")),
            instructions: parseLines(formData.get("instructions")),
            showInThisWeek: formData.get("showInThisWeek") === "on",
            
            // Project Proposal Fields
            startDate: String(formData.get("startDate") || "").trim(),
            contactName: String(formData.get("contactName") || "").trim(),
            contactPhone: String(formData.get("contactPhone") || "").trim(),
            contactEmail: String(formData.get("contactEmail") || "").trim(),
            company: String(formData.get("company") || "").trim(),
            address: String(formData.get("address") || "").trim(),
            overview: parseLines(formData.get("overview")),
            services: parseLines(formData.get("services")),
            costs: parseLines(formData.get("costs")),
            outcomes: parseLines(formData.get("outcomes")),
            withdrawalDate: String(formData.get("withdrawalDate") || "").trim(),
            clientId: String(formData.get("clientId") || "").trim(),
            
            // Assessment Task Fields
            standardDetails: parseLines(formData.get("standardDetails")),
            tasksList: parseLines(formData.get("tasksList")),
            achieved: parseRequirementLines(formData.get("achieved")),
            merit: parseRequirementLines(formData.get("merit")),
            excellence: parseRequirementLines(formData.get("excellence")),
            submissionRequirements: parseLines(formData.get("submissionRequirements")),
            relevantImplications: parseLines(formData.get("relevantImplications")),
            progressLogging: parseLines(formData.get("progressLogging")),
            feedbackTrialling: parseLines(formData.get("feedbackTrialling"))
        };

        if (!draft.title || !draft.yearLevel || !draft.type) {
            setStatus("Title, year level, and type are required.", true);
            return;
        }

        try {
            setStatus("Saving changes...");
            const saved = await saveDetails(id, draft);
            DETAIL_DATA[id] = saved;
            setStatus("Saved.");
            renderDetailView(host, id, saved, true);
        } catch (error) {
            setStatus(error.message || "Could not save changes.", true);
        }
    });
}

async function initDetail() {
    if (!hasDetailPageAccess()) {
        window.location.replace("../index.html");
        return;
    }

    const root = document.querySelector("[data-activity-id]");
    const queryRoot = document.querySelector(".page");
    const host = root || queryRoot;
    if (!host) return;

    const params = new URLSearchParams(window.location.search);
    const id = host.getAttribute("data-activity-id") || params.get("id");
    const data = DETAIL_DATA[id] || await readSharedActivity(id);
    if (!data) return;

    const resolvedData = defaultDetailShape(id, data);
    const selectedTaskTopic = resolveRequestedTaskTopic(resolvedData, params);
    const selectedTaskShortName = String(params.get("taskShortName") || "").trim()
        || getTaskTopicShortNameOverride(id, selectedTaskTopic);
    const isTeacher = await canEditDetails();

    document.title = `${selectedTaskShortName || selectedTaskTopic || resolvedData.title} | Computer Lab`;

    // Show Edit/Delete buttons if user is a teacher or admin
    renderDetailView(host, id, resolvedData, isTeacher, selectedTaskTopic, selectedTaskShortName);

    // Load interest section only for backend-stored items (numeric IDs)
    if (String(id).match(/^\d+$/)) {
        await loadAndRenderInterestSection(host, id, isTeacher, resolvedData);
    }
}

async function loadAndRenderInterestSection(host, projectId, isTeacher, detailData) {
    const existingSection = host.querySelector("#interest-section");
    if (existingSection) {
        existingSection.remove();
    }

    const email = readStoredHubEmail();
    const isAssessmentTask = String(detailData?.activityCategory || "").toLowerCase().includes("assessment");

    const fetchHeaders = {};
    if (email) fetchHeaders["x-user-email"] = email;

    let interestData = { count: 0, my_interest: false, emails: [], confirmed: [], my_allocation: null };
    try {
        const resp = await fetch(`/api/activities/${encodeURIComponent(projectId)}/interests`, { headers: fetchHeaders });
        if (resp.ok) interestData = await resp.json();
    } catch (_err) {}

    const section = document.createElement("section");
    section.className = "proposal-section interest-section";
    section.id = "interest-section";

    const countText = interestData.count === 0
        ? "No students have registered interest yet."
        : interestData.count === 1
            ? `1 student is interested in this ${isAssessmentTask ? "task" : "project"}.`
            : `${interestData.count} students are interested in this ${isAssessmentTask ? "task" : "project"}.`;

    let html = `<h2>Student Interest</h2><p class="interest-count" id="interest-count-text">${countText}</p>`;

    if (isTeacher && isAssessmentTask) {
        const domainHint = detailAllowedDomain ? ` (${escapeHtml(detailAllowedDomain)} domain)` : "";
        html += `
            <form class="interest-assign-form" id="interest-assign-form" novalidate>
                <label for="interest-assign-email" class="interest-assign-label">Allocate student by email${domainHint}</label>
                <div class="interest-assign-row">
                    <input id="interest-assign-email" name="studentEmail" type="email" class="interest-assign-input" placeholder="student@westlandhigh.school.nz" required>
                    <button type="submit" class="detail-action interest-assign-btn">Add Student</button>
                </div>
                <p class="interest-assign-status" id="interest-assign-status" aria-live="polite"></p>
            </form>
        `;
    }

    // Signed-in non-teacher students see the toggle button
    if (email && !isTeacher) {
        const btnClass = interestData.my_interest ? "detail-action interest-btn is-interested" : "detail-action interest-btn";
        const btnText = interestData.my_interest ? "\u2713 I'm Interested" : "I'm Interested";
        html += `<button type="button" class="${btnClass}" id="interest-toggle-btn">${btnText}</button>`;

        const myAllocation = interestData?.my_allocation || null;
        const assignedStandards = [
            toStandardCode(myAllocation?.standard_1),
            toStandardCode(myAllocation?.standard_2)
        ].filter((code) => EVIDENCE_STEPS_TARGET_STANDARDS.has(code));
        const completionPercent = getEvidenceCompletionPercentFromRows(myAllocation?.evidence_steps, assignedStandards);
        const savedCardLink = escapeHtml(readStoredTrelloCardLink(projectId, email));

        html += `
            <div class="trello-sync-panel" id="trello-sync-panel">
                <h3>Trello Sync</h3>
                <p>Open your Trello card quickly or send this work update to Trello.</p>
                <label for="trello-card-url" class="trello-sync-label">Trello card link</label>
                <input id="trello-card-url" class="trello-sync-input" type="url" placeholder="https://trello.com/c/xxxx1234" value="${savedCardLink}">
                <label for="trello-work-note" class="trello-sync-label">Work note</label>
                <textarea id="trello-work-note" class="trello-sync-input trello-sync-note" placeholder="What did you complete today?"></textarea>
                <div class="trello-sync-actions">
                    <button type="button" class="detail-action detail-action-secondary" id="trello-open-card-btn">Open Trello Card</button>
                    <button type="button" class="detail-action" id="trello-send-log-btn">Send Log to Trello (${completionPercent}%)</button>
                </div>
                <p class="trello-sync-status" id="trello-sync-status" aria-live="polite"></p>
            </div>
        `;
    }

    // Teachers see the full list of interested students
    if (isTeacher && interestData.emails.length > 0) {
        const studentsByEmail = new Map((Array.isArray(interestData.students) ? interestData.students : [])
            .map((student) => [String(student?.email || "").toLowerCase(), student]));

        html += `<div class="interest-student-list"><h3>Interested Students</h3>`;
        html += `<table class="interest-table"><thead><tr><th>Student Email</th><th>Status</th><th>Action</th></tr></thead><tbody>`;
        for (const studentEmail of interestData.emails) {
            const isConfirmed = interestData.confirmed.includes(studentEmail);
            const statusBadge = isConfirmed
                ? `<span class="interest-status interest-confirmed">Confirmed</span>`
                : `<span class="interest-status interest-pending">Pending</span>`;
            const confirmBtnText = isConfirmed ? "Unconfirm" : "Confirm";

            const studentRecord = studentsByEmail.get(String(studentEmail || "").toLowerCase()) || null;
            const assignedStandards = [
                toStandardCode(studentRecord?.standard_1),
                toStandardCode(studentRecord?.standard_2)
            ].filter((code) => EVIDENCE_STEPS_TARGET_STANDARDS.has(code));
            const completionPercent = getEvidenceCompletionPercentFromRows(studentRecord?.evidence_steps, assignedStandards);
            const progressButton = assignedStandards.length
                ? `<button type="button" class="detail-action detail-action-secondary interest-progress-btn" data-student-email="${escapeHtml(studentEmail)}" data-standards="${escapeHtml(assignedStandards.join(","))}">Progress ${completionPercent}%</button>`
                : "";

            html += `<tr data-student="${escapeHtml(studentEmail)}"><td>${escapeHtml(studentEmail)}</td><td>${statusBadge}</td><td><div class="interest-action-group"><button type="button" class="detail-action interest-confirm-btn" data-confirmed="${isConfirmed}">${confirmBtnText}</button>${progressButton}</div></td></tr>`;
        }
        html += `</tbody></table></div>`;
    } else if (isTeacher && interestData.count === 0) {
        html += `<p class="interest-no-students">No students have registered interest yet.</p>`;
    }

    section.innerHTML = html;
    host.appendChild(section);

    await renderTaskTopicSubmissionPanel({
        host,
        projectId,
        detailData,
        email,
        isTeacher,
        interestData
    });

    if (!isTeacher && isAssessmentTask && email) {
        const myAllocation = interestData?.my_allocation || null;
        const assignedStandards = [
            toStandardCode(myAllocation?.standard_1),
            toStandardCode(myAllocation?.standard_2)
        ].filter((code) => EVIDENCE_STEPS_TARGET_STANDARDS.has(code));
        const taskDefaultsByStandard = buildTaskDefaultsByStandard(assignedStandards, detailData);

        if (assignedStandards.length) {
            await renderEvidenceSidebar({
                host,
                projectId,
                viewerEmail: email,
                studentEmail: email,
                standards: Array.from(new Set(assignedStandards)),
                studentLabel: "My progress",
                taskDefaultsByStandard
            });
        }
    }

    if (isTeacher && email) {
        section.querySelectorAll(".interest-progress-btn").forEach((button) => {
            button.addEventListener("click", async () => {
                const studentEmail = String(button.getAttribute("data-student-email") || "").trim().toLowerCase();
                const standards = String(button.getAttribute("data-standards") || "")
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean);

                if (!studentEmail || !standards.length) {
                    return;
                }

                const taskDefaultsByStandard = buildTaskDefaultsByStandard(standards, detailData);

                await renderEvidenceSidebar({
                    host,
                    projectId,
                    viewerEmail: email,
                    studentEmail,
                    standards,
                    studentLabel: studentEmail,
                    taskDefaultsByStandard
                });
            });
        });
    }

    const trelloCardInput = section.querySelector("#trello-card-url");
    const trelloWorkNoteInput = section.querySelector("#trello-work-note");
    const trelloOpenCardBtn = section.querySelector("#trello-open-card-btn");
    const trelloSendLogBtn = section.querySelector("#trello-send-log-btn");
    const trelloStatus = section.querySelector("#trello-sync-status");

    const setTrelloStatus = (message, isError = false) => {
        if (!trelloStatus) return;
        trelloStatus.textContent = String(message || "");
        trelloStatus.classList.toggle("is-error", Boolean(isError));
    };

    const readCardUrl = () => {
        const safe = toSafeTrelloCardUrl(trelloCardInput?.value || "");
        if (trelloCardInput && safe && trelloCardInput.value !== safe) {
            trelloCardInput.value = safe;
        }
        writeStoredTrelloCardLink(projectId, email, safe);
        return safe;
    };

    trelloCardInput?.addEventListener("change", () => {
        const safe = readCardUrl();
        if (!safe) {
            setTrelloStatus("Enter a valid Trello card link (trello.com/c/...).", true);
        } else {
            setTrelloStatus("Card link saved.");
        }
    });

    trelloOpenCardBtn?.addEventListener("click", () => {
        const cardUrl = readCardUrl();
        if (!cardUrl) {
            setTrelloStatus("Enter a valid Trello card link first.", true);
            return;
        }

        window.open(cardUrl, "_blank", "noopener,noreferrer");
        setTrelloStatus("Opened Trello card.");
    });

    trelloSendLogBtn?.addEventListener("click", async () => {
        const cardUrl = readCardUrl();
        if (!cardUrl) {
            setTrelloStatus("Enter a valid Trello card link first.", true);
            return;
        }

        const myAllocation = interestData?.my_allocation || null;
        const assignedStandards = [
            toStandardCode(myAllocation?.standard_1),
            toStandardCode(myAllocation?.standard_2)
        ].filter((code) => EVIDENCE_STEPS_TARGET_STANDARDS.has(code));
        const completionPercent = getEvidenceCompletionPercentFromRows(myAllocation?.evidence_steps, assignedStandards);

        const note = String(trelloWorkNoteInput?.value || "").trim();
        if (trelloSendLogBtn) trelloSendLogBtn.disabled = true;
        setTrelloStatus("Sending log to Trello...");

        try {
            const response = await fetch("/api/integrations/trello/work-log", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-email": email
                },
                body: JSON.stringify({
                    card_url: cardUrl,
                    note,
                    activity_title: String(detailData?.title || "").trim(),
                    progress_percent: completionPercent
                })
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.error || "Could not send log to Trello.");
            }

            const payload = await response.json().catch(() => ({}));
            if (trelloWorkNoteInput) {
                trelloWorkNoteInput.value = "";
            }

            const cardUrlFromApi = toSafeTrelloCardUrl(payload?.card_url || cardUrl);
            if (cardUrlFromApi && trelloCardInput) {
                trelloCardInput.value = cardUrlFromApi;
                writeStoredTrelloCardLink(projectId, email, cardUrlFromApi);
            }

            setTrelloStatus("Work log sent to Trello.");
        } catch (error) {
            setTrelloStatus(error.message || "Could not send log to Trello.", true);
        } finally {
            if (trelloSendLogBtn && trelloSendLogBtn.isConnected) trelloSendLogBtn.disabled = false;
        }
    });

    // Toggle interest button handler
    const toggleBtn = section.querySelector("#interest-toggle-btn");
    if (toggleBtn && email) {
        toggleBtn.addEventListener("click", async () => {
            toggleBtn.disabled = true;
            try {
                const resp = await fetch(`/api/activities/${encodeURIComponent(projectId)}/interest`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "x-user-email": email }
                });
                if (resp.ok) {
                    const data = await resp.json();
                    toggleBtn.textContent = data.interested ? "\u2713 I'm Interested" : "I'm Interested";
                    toggleBtn.classList.toggle("is-interested", Boolean(data.interested));
                    const countEl = section.querySelector("#interest-count-text");
                    if (countEl) {
                        const c = data.count;
                        countEl.textContent = c === 0
                            ? "No students have registered interest yet."
                            : c === 1
                                ? `1 student is interested in this ${isAssessmentTask ? "task" : "project"}.`
                                : `${c} students are interested in this ${isAssessmentTask ? "task" : "project"}.`;
                    }

                    await loadAndRenderInterestSection(host, projectId, isTeacher, detailData);
                }
            } catch (_err) {}
            toggleBtn.disabled = false;
        });
    }

    const assignForm = section.querySelector("#interest-assign-form");
    if (assignForm && email) {
        const assignInput = section.querySelector("#interest-assign-email");
        const assignStatus = section.querySelector("#interest-assign-status");

        const setAssignStatus = (message, isError = false) => {
            if (!assignStatus) return;
            assignStatus.textContent = message;
            assignStatus.classList.toggle("is-error", isError);
        };

        assignForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const normalizedEmail = normalizeStudentEmailInput(assignInput?.value || "");
            if (!normalizedEmail) {
                setAssignStatus("Enter a student email.", true);
                return;
            }

            if (detailAllowedDomain && !normalizedEmail.endsWith(`@${detailAllowedDomain}`)) {
                setAssignStatus(`Email must end with @${detailAllowedDomain}.`, true);
                return;
            }

            const assignBtn = assignForm.querySelector("button[type='submit']");
            if (assignBtn) assignBtn.disabled = true;
            setAssignStatus("Adding student...");

            try {
                const resp = await fetch(`/api/activities/${encodeURIComponent(projectId)}/interests`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "x-user-email": email },
                    body: JSON.stringify({ student_email: normalizedEmail })
                });

                if (!resp.ok) {
                    const errorData = await resp.json().catch(() => ({}));
                    throw new Error(errorData.error || "Could not add student.");
                }

                setAssignStatus("Student allocated.");
                if (assignInput) assignInput.value = "";
                await loadAndRenderInterestSection(host, projectId, isTeacher, detailData);
            } catch (error) {
                setAssignStatus(error.message || "Could not add student.", true);
            } finally {
                if (assignBtn && assignBtn.isConnected) assignBtn.disabled = false;
            }
        });
    }

    // Confirm/unconfirm allocation buttons (teacher only)
    section.querySelectorAll(".interest-confirm-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const row = btn.closest("tr[data-student]");
            if (!row) return;
            const studentEmail = row.getAttribute("data-student");
            const currentlyConfirmed = btn.getAttribute("data-confirmed") === "true";
            const newConfirmed = !currentlyConfirmed;
            btn.disabled = true;
            try {
                const resp = await fetch(
                    `/api/activities/${encodeURIComponent(projectId)}/interests/${encodeURIComponent(studentEmail)}/confirm`,
                    {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json", "x-user-email": email },
                        body: JSON.stringify({ confirmed: newConfirmed })
                    }
                );
                if (resp.ok) {
                    btn.setAttribute("data-confirmed", String(newConfirmed));
                    btn.textContent = newConfirmed ? "Unconfirm" : "Confirm";
                    const statusCell = row.querySelector(".interest-status");
                    if (statusCell) {
                        statusCell.textContent = newConfirmed ? "Confirmed" : "Pending";
                        statusCell.className = newConfirmed ? "interest-status interest-confirmed" : "interest-status interest-pending";
                    }
                }
            } catch (_err) {}
            btn.disabled = false;
        });
    });
}

initDetail();
