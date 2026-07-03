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
const TRELLO_CARD_LIBRARY_STORAGE_PREFIX = "hub_trello_card_library_v1";
const GITHUB_REPO_LIBRARY_STORAGE_PREFIX = "hub_github_repo_library_v1";
const ONEDRIVE_LINK_LIBRARY_STORAGE_PREFIX = "hub_onedrive_link_library_v1";
const GOOGLE_DRIVE_LINK_LIBRARY_STORAGE_PREFIX = "hub_google_drive_link_library_v1";
const TASK_TOPIC_SLIDE_SYNC_STORAGE_PREFIX = "hub_task_topic_slide_sync_v1";
const EVIDENCE_STEPS_TARGET_STANDARDS = new Set(["92005", "91897", "91907"]);

const DIGITAL_OUTCOME_DETAILS_TASKS = [
    "Description - Google Slides: Describe the Digital Outcome: What is it, who is it for, and what should it do?",
    "Identify the target audience or end user for this outcome.",
    "Explain how the outcome will be developed and what tools/technologies will be used.",
    "State how success will be measured or evaluated."
];

const DIGITAL_OUTCOME_DESCRIPTION_TITLE = "Digital Outcome Description";
const DIGITAL_OUTCOME_TARGET_AUDIENCE_TITLE = "Target Audience";
const DIGITAL_OUTCOME_DEVELOPMENT_TOOLS_TITLE = "Development and Tools";
const DIGITAL_OUTCOME_SUCCESS_CRITERIA_TITLE = "Success Criteria";
const DIGITAL_OUTCOME_DESCRIPTION_TEMPLATE_PREVIEW_URL = "https://drive.google.com/thumbnail?id=1brOY70u9aJdsoiEtxVepr82vRhiv9VzpMm8TUv3lcTo&sz=w1400";
const DIGITAL_OUTCOME_TARGET_AUDIENCE_TEMPLATE_PREVIEW_URL = "../images/target-audience-template-preview.svg";
const DIGITAL_OUTCOME_GENERIC_TEMPLATE_PREVIEW_URL = "../images/template-preview-placeholder.svg";

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
        "Achieved: List the key features or requirements the outcome must include.",
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

function extractSlidesIdFromValue(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";

    const direct = raw.match(/^[A-Za-z0-9_-]{20,}$/);
    if (direct?.[0]) return direct[0];

    const pathMatch = raw.match(/\/presentation\/d\/([A-Za-z0-9_-]{20,})/i);
    if (pathMatch?.[1]) return pathMatch[1];

    const queryIdMatch = raw.match(/[?&]id=([A-Za-z0-9_-]{20,})/i);
    if (queryIdMatch?.[1]) return queryIdMatch[1];

    return "";
}

function toGoogleSlidesThumbnailUrl(value) {
    const slideId = extractSlidesIdFromValue(value);
    if (!slideId) {
        return "";
    }
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(slideId)}&sz=w1400`;
}

function toSafeOneDriveFolderUrl(value) {
    const safeUrl = toSafeExternalUrl(value);
    if (!safeUrl) return "";
    return /(onedrive\.live\.com|1drv\.ms|sharepoint\.com)/i.test(safeUrl) ? safeUrl : "";
}

function toSafeGoogleDriveFolderUrl(value) {
    const safeUrl = toSafeExternalUrl(value);
    if (!safeUrl) return "";
    return /(drive\.google\.com)/i.test(safeUrl) ? safeUrl : "";
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

    const ensuredSubitemText = "Achieved: List the key features or requirements the outcome must include.";

    const getLevel = (text) => {
        const raw = String(text || "").trim().toLowerCase();
        if (raw.startsWith("achieved:")) return "achieved";
        if (raw.startsWith("merit:")) return "merit";
        if (raw.startsWith("excellence:")) return "excellence";
        return "";
    };

    const ensureSubitemPlacement = (rows) => {
        const safeRows = Array.isArray(rows) ? rows.map((row) => ({
            text: String(row?.text || "").trim(),
            done: Boolean(row?.done)
        })).filter((row) => row.text) : [];

        if (safeRows.some((row) => isFeaturesRequirementSubitem(row.text))) {
            return safeRows;
        }

        const parentIndex = safeRows.findIndex((row) => isDecompositionParentStep(row.text));
        const nextRow = { text: ensuredSubitemText, done: false };
        if (parentIndex >= 0) {
            safeRows.splice(parentIndex + 1, 0, nextRow);
            return safeRows;
        }

        const firstNonAchievedIndex = safeRows.findIndex((row) => getLevel(row.text) && getLevel(row.text) !== "achieved");
        if (firstNonAchievedIndex >= 0) {
            safeRows.splice(firstNonAchievedIndex, 0, nextRow);
        } else {
            safeRows.push(nextRow);
        }

        return safeRows;
    };

    if (!defaults.length) {
        return ensureSubitemPlacement(expandedExisting);
    }

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
        return ensureSubitemPlacement(expandedExisting);
    }

    const doneByText = new Map();
    expandedExisting.forEach((row) => {
        const key = String(row?.text || "").trim().toLowerCase();
        if (!key) return;
        doneByText.set(key, Boolean(row?.done));
    });

    return ensureSubitemPlacement(defaults.map((row) => {
        const key = String(row.text || "").trim().toLowerCase();
        return {
            text: row.text,
            done: doneByText.get(key) || false
        };
    }));
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

function isFeaturesRequirementSubitem(text) {
    const normalized = String(text || "")
        .replace(/^(Achieved|Merit|Excellence):\s*/i, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    return normalized.includes("list the key features")
        && normalized.includes("requirements")
        && normalized.includes("outcome");
}

function isDecompositionParentStep(text) {
    const normalized = String(text || "")
        .replace(/^(Achieved|Merit|Excellence):\s*/i, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    return normalized.includes("decompos")
        && normalized.includes("outcome")
        && normalized.includes("smaller components");
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

function getDefaultCardColorForCategory(categoryValue) {
    const category = String(categoryValue || "").trim().toLowerCase();

    if (category.includes("task topic")) return "Azure";
    if (category.includes("standard")) return "Teal";
    if (category.includes("lesson")) return "Rose";
    if (category.includes("assessment")) return "Slate";
    if (category.includes("project")) return "Violet";
    if (category.includes("activity") || category.includes("practice")) return "Amber";

    return "Amber";
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

function readStoredHubAccessToken() {
    const raw = localStorage.getItem(DETAIL_HUB_AUTH_STORAGE_KEY) || sessionStorage.getItem(DETAIL_HUB_AUTH_STORAGE_KEY);
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

function buildAuthHeaders(headers = {}) {
    const email = readStoredHubEmail();
    const nextHeaders = { ...headers };
    if (email) {
        nextHeaders["x-user-email"] = email;
    }

    const accessToken = readStoredHubAccessToken();
    if (accessToken && accessToken.startsWith("eyJ") && accessToken.split(".").length === 3) {
        nextHeaders.Authorization = `Bearer ${accessToken}`;
    }

    return nextHeaders;
}

function buildWriteHeaders() {
    return buildAuthHeaders({ "Content-Type": "application/json" });
}

function getActiveSyncContext() {
    const params = new URLSearchParams(window.location.search || "");
    const projectId = String(params.get("id") || "").trim();
    const email = readStoredHubEmail();
    const taskTopicValue = String(params.get("taskTopic") || "").trim();
    const detailData = projectId ? (DETAIL_DATA?.[projectId] || null) : null;

    return {
        projectId,
        email,
        taskTopicValue,
        detailData
    };
}

async function fetchStudentProcessAssessmentFolderUrl() {
    try {
        const response = await fetch("/api/student/drive-setup", { headers: buildWriteHeaders() });
        if (!response.ok) {
            return "";
        }

        const payload = await response.json().catch(() => ({}));
        const directUrl = toSafeExternalUrl(payload?.processAssessmentFolderUrl || "");
        if (directUrl) {
            return directUrl;
        }

        const folderId = String(payload?.processAssessmentFolderId || "").trim();
        if (!folderId) {
            return "";
        }
        return `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`;
    } catch (_error) {
        return "";
    }
}

async function findProcessAssessmentSlideMatch(taskTopic = "") {
    const accessToken = readStoredHubAccessToken();
    if (!accessToken) {
        return { fileUrl: "", fileName: "", modifiedTime: "" };
    }

    try {
        const response = await fetch("/api/student/drive-setup/find-slide", {
            method: "POST",
            headers: buildWriteHeaders(),
            body: JSON.stringify({
                driveAccessToken: accessToken,
                taskTopic: String(taskTopic || "").trim()
            })
        });

        if (!response.ok) {
            return { fileUrl: "", fileName: "", modifiedTime: "" };
        }

        const payload = await response.json().catch(() => ({}));
        return {
            fileUrl: toSafeExternalUrl(payload?.fileUrl || ""),
            fileName: String(payload?.fileName || "").trim(),
            modifiedTime: String(payload?.modifiedTime || "").trim()
        };
    } catch (_error) {
        return { fileUrl: "", fileName: "", modifiedTime: "" };
    }
}

function installCloudSyncDelegatedFallbackHandlers() {
    if (window.__dtechCloudSyncFallbackBound) {
        return;
    }
    window.__dtechCloudSyncFallbackBound = true;

    const setStatus = (selector, message, isError = false) => {
        const el = document.querySelector(selector);
        if (!el) return;
        el.textContent = String(message || "");
        el.classList.toggle("is-error", Boolean(isError));
    };

    const readUrlValue = (selector) => toSafeExternalUrl(document.querySelector(selector)?.value || "");

    const refreshTrelloLibraryUi = (projectId, email) => {
        const library = document.querySelector("#trello-link-library");
        const list = document.querySelector("#trello-link-library-list");
        const count = document.querySelector("#trello-link-library-count");
        if (!library || !list) {
            return;
        }

        const items = readStoredTrelloCardLibrary(projectId, email);
        if (!items.length) {
            library.hidden = true;
            if (count) count.textContent = "(0)";
            list.innerHTML = "";
            return;
        }

        const activeUrl = toSafeTrelloCardUrl(document.querySelector("#trello-card-url")?.value || "");
        library.hidden = false;
        if (count) count.textContent = `(${items.length})`;
        list.innerHTML = items
            .map((item) => {
                const url = toSafeTrelloCardUrl(item?.url || "");
                if (!url) {
                    return "";
                }
                const isActive = Boolean(activeUrl && activeUrl === url);
                return `
                    <li class="trello-link-library-item${isActive ? " is-active" : ""}" data-trello-link-item="${escapeHtml(url)}">
                        <div class="trello-link-library-link-wrap">
                            <a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(url)}</a>
                            <span class="trello-link-library-savedat">${escapeHtml(formatLibrarySavedAtLabel(item?.savedAt))}</span>
                        </div>
                        <div class="trello-link-library-actions">
                            <button type="button" class="detail-action detail-action-secondary" data-trello-library-use="${escapeHtml(url)}">Use</button>
                            <button type="button" class="detail-action detail-action-secondary" data-trello-library-open="${escapeHtml(url)}">Open</button>
                        </div>
                    </li>
                `;
            })
            .join("");
    };

    const refreshOneDriveLibraryUi = (projectId, email) => {
        const library = document.querySelector("#onedrive-link-library");
        const list = document.querySelector("#onedrive-link-library-list");
        const count = document.querySelector("#onedrive-link-library-count");
        if (!library || !list) {
            return;
        }

        const items = readStoredOneDriveLinkLibrary(projectId, email);
        if (!items.length) {
            library.hidden = true;
            if (count) count.textContent = "(0)";
            list.innerHTML = "";
            return;
        }

        const activeUrl = toSafeOneDriveFolderUrl(document.querySelector("#onedrive-folder-url")?.value || "");
        library.hidden = false;
        if (count) count.textContent = `(${items.length})`;
        list.innerHTML = items
            .map((item) => {
                const url = toSafeOneDriveFolderUrl(item?.url || "");
                if (!url) {
                    return "";
                }
                const isActive = Boolean(activeUrl && activeUrl === url);
                return `
                    <li class="trello-link-library-item${isActive ? " is-active" : ""}" data-onedrive-link-item="${escapeHtml(url)}">
                        <div class="trello-link-library-link-wrap">
                            <a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(url)}</a>
                            <span class="trello-link-library-savedat">${escapeHtml(formatLibrarySavedAtLabel(item?.savedAt))}</span>
                        </div>
                        <div class="trello-link-library-actions">
                            <button type="button" class="detail-action detail-action-secondary" data-onedrive-library-use="${escapeHtml(url)}">Use</button>
                            <button type="button" class="detail-action detail-action-secondary" data-onedrive-library-open="${escapeHtml(url)}">Open</button>
                        </div>
                    </li>
                `;
            })
            .join("");
    };

    const refreshGoogleDriveLibraryUi = (projectId, email) => {
        const library = document.querySelector("#google-drive-link-library");
        const list = document.querySelector("#google-drive-link-library-list");
        const count = document.querySelector("#google-drive-link-library-count");
        if (!library || !list) {
            return;
        }

        const items = readStoredGoogleDriveLinkLibrary(projectId, email);
        if (!items.length) {
            library.hidden = true;
            if (count) count.textContent = "(0)";
            list.innerHTML = "";
            return;
        }

        const activeUrl = toSafeGoogleDriveFolderUrl(document.querySelector("#google-drive-folder-url")?.value || "");
        library.hidden = false;
        if (count) count.textContent = `(${items.length})`;
        list.innerHTML = items
            .map((item) => {
                const url = toSafeGoogleDriveFolderUrl(item?.url || "");
                if (!url) {
                    return "";
                }
                const isActive = Boolean(activeUrl && activeUrl === url);
                return `
                    <li class="trello-link-library-item${isActive ? " is-active" : ""}" data-google-drive-link-item="${escapeHtml(url)}">
                        <div class="trello-link-library-link-wrap">
                            <a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(url)}</a>
                            <span class="trello-link-library-savedat">${escapeHtml(formatLibrarySavedAtLabel(item?.savedAt))}</span>
                        </div>
                        <div class="trello-link-library-actions">
                            <button type="button" class="detail-action detail-action-secondary" data-google-drive-library-use="${escapeHtml(url)}">Use</button>
                            <button type="button" class="detail-action detail-action-secondary" data-google-drive-library-open="${escapeHtml(url)}">Open</button>
                        </div>
                    </li>
                `;
            })
            .join("");
    };

    document.addEventListener("click", async (event) => {
        const button = event.target?.closest?.("button");
        if (!button) {
            return;
        }

        const useGoogleLibraryBtn = button.closest("[data-google-drive-library-use]");
        if (useGoogleLibraryBtn) {
            if (document.querySelector("#google-drive-save-link-btn")?.dataset?.syncBound === "1") {
                return;
            }
            const selectedUrl = toSafeGoogleDriveFolderUrl(useGoogleLibraryBtn.getAttribute("data-google-drive-library-use") || "");
            if (!selectedUrl) {
                return;
            }
            const input = document.querySelector("#google-drive-folder-url");
            if (input) {
                input.value = selectedUrl;
            }
            setStatus("#google-drive-sync-status", "Selected saved Google Drive link.");
            const ctx = getActiveSyncContext();
            if (ctx.projectId && ctx.email) {
                refreshGoogleDriveLibraryUi(ctx.projectId, ctx.email);
            }
            return;
        }

        const openGoogleLibraryBtn = button.closest("[data-google-drive-library-open]");
        if (openGoogleLibraryBtn) {
            if (document.querySelector("#google-drive-save-link-btn")?.dataset?.syncBound === "1") {
                return;
            }
            const selectedUrl = toSafeGoogleDriveFolderUrl(openGoogleLibraryBtn.getAttribute("data-google-drive-library-open") || "");
            if (!selectedUrl) {
                return;
            }
            window.open(selectedUrl, "_blank", "noopener,noreferrer");
            setStatus("#google-drive-sync-status", "Opened saved Google Drive link.");
            return;
        }

        if (button.id === "onedrive-open-folder-btn" && button.dataset.syncBound !== "1") {
            const url = readUrlValue("#onedrive-folder-url");
            if (!url) {
                setStatus("#onedrive-sync-status", "Enter a valid OneDrive or SharePoint folder link first.", true);
                return;
            }
            window.open(url, "_blank", "noopener,noreferrer");
            setStatus("#onedrive-sync-status", "Opened OneDrive folder.");
            return;
        }

        if (button.id === "google-drive-open-folder-btn" && button.dataset.syncBound !== "1") {
            const url = toSafeGoogleDriveFolderUrl(document.querySelector("#google-drive-folder-url")?.value || "");
            if (!url) {
                setStatus("#google-drive-sync-status", "Enter a valid Google Drive folder link first.", true);
                return;
            }
            window.open(url, "_blank", "noopener,noreferrer");
            setStatus("#google-drive-sync-status", "Opened Google Drive folder.");
            return;
        }

        if (button.id === "onedrive-save-link-btn" && button.dataset.syncBound !== "1") {
            const url = readUrlValue("#onedrive-folder-url");
            if (!url) {
                setStatus("#onedrive-sync-status", "Enter a valid OneDrive or SharePoint folder link first.", true);
                return;
            }

            const ctx = getActiveSyncContext();
            if (!ctx.projectId || !ctx.email || !ctx.taskTopicValue) {
                setStatus("#onedrive-sync-status", "Open a task-topic page before saving OneDrive link.", true);
                return;
            }

            button.disabled = true;
            setStatus("#onedrive-sync-status", "Saving OneDrive link...");
            try {
                await persistStudentOneDriveFolderLink(ctx.projectId, ctx.email, ctx.detailData, ctx.taskTopicValue, url);
                addStoredOneDriveLinkLibraryLink(ctx.projectId, ctx.email, url);
                refreshOneDriveLibraryUi(ctx.projectId, ctx.email);
                setStatus("#onedrive-sync-status", "OneDrive link saved and shared with teacher view.");
            } catch (error) {
                const fallback = "Could not save OneDrive link right now.";
                setStatus("#onedrive-sync-status", `${error?.message || fallback}${formatApiDebugSuffix(error)}`, true);
            } finally {
                if (button.isConnected) button.disabled = false;
            }
            return;
        }

        if (button.id === "google-drive-save-link-btn" && button.dataset.syncBound !== "1") {
            const url = toSafeGoogleDriveFolderUrl(document.querySelector("#google-drive-folder-url")?.value || "");
            if (!url) {
                setStatus("#google-drive-sync-status", "Enter a valid Google Drive folder link first.", true);
                return;
            }

            const ctx = getActiveSyncContext();
            if (!ctx.projectId || !ctx.email || !ctx.taskTopicValue) {
                setStatus("#google-drive-sync-status", "Open a task-topic page before saving Google Drive link.", true);
                return;
            }

            button.disabled = true;
            setStatus("#google-drive-sync-status", "Saving Google Drive link...");
            try {
                await persistStudentGoogleDriveFolderLink(ctx.projectId, ctx.email, ctx.detailData, ctx.taskTopicValue, url);
                addStoredGoogleDriveLinkLibraryLink(ctx.projectId, ctx.email, url);
                refreshGoogleDriveLibraryUi(ctx.projectId, ctx.email);
                setStatus("#google-drive-sync-status", "Google Drive link saved and shared with teacher view.");
            } catch (error) {
                const fallback = "Could not save Google Drive link right now.";
                setStatus("#google-drive-sync-status", `${error?.message || fallback}${formatApiDebugSuffix(error)}`, true);
            } finally {
                if (button.isConnected) button.disabled = false;
            }
        }

        if (button.id === "trello-save-link-btn" && button.dataset.syncBound !== "1") {
            const url = toSafeTrelloCardUrl(document.querySelector("#trello-card-url")?.value || "");
            if (!url) {
                setStatus("#trello-sync-status", "Enter a valid Trello card or board link first.", true);
                return;
            }

            const ctx = getActiveSyncContext();
            if (!ctx.projectId || !ctx.email) {
                setStatus("#trello-sync-status", "Sign in again, then retry Save Trello Link.", true);
                return;
            }

            button.disabled = true;
            setStatus("#trello-sync-status", "Saving Trello link...");
            try {
                await persistStudentTrelloLinkDirectlyToEvidence(ctx.projectId, ctx.email, ctx.detailData, ctx.taskTopicValue, url);
                addStoredTrelloCardLibraryLink(ctx.projectId, ctx.email, url);
                refreshTrelloLibraryUi(ctx.projectId, ctx.email);
                setStatus("#trello-sync-status", "Trello link saved.");
            } catch (error) {
                setStatus("#trello-sync-status", `${error?.message || "Could not save Trello link right now."}${formatApiDebugSuffix(error)}`, true);
            } finally {
                if (button.isConnected) button.disabled = false;
            }
            return;
        }

        if (button.id === "trello-open-card-btn" && button.dataset.syncBound !== "1") {
            const url = toSafeTrelloCardUrl(document.querySelector("#trello-card-url")?.value || "");
            if (!url) {
                setStatus("#trello-sync-status", "Enter a valid Trello card or board link first.", true);
                return;
            }
            window.open(url, "_blank", "noopener,noreferrer");
            setStatus("#trello-sync-status", "Opened Trello link.");
            return;
        }

        if (button.id === "github-save-link-btn" && button.dataset.syncBound !== "1") {
            const repoUrl = toSafeGithubRepoUrl(document.querySelector("#github-repo-url")?.value || "");
            if (!repoUrl) {
                setStatus("#github-sync-status", "Enter a valid GitHub repository URL first.", true);
                return;
            }

            const note = String(document.querySelector("#github-work-note")?.value || "").trim();
            const ctx = getActiveSyncContext();
            if (!ctx.projectId || !ctx.email) {
                setStatus("#github-sync-status", "Sign in again, then retry Save GitHub Sync.", true);
                return;
            }

            button.disabled = true;
            setStatus("#github-sync-status", "Saving GitHub sync...");
            try {
                await persistStudentGithubSyncDirectlyToEvidence(ctx.projectId, ctx.email, ctx.detailData, ctx.taskTopicValue, repoUrl, note);
                addStoredGithubRepoLibraryLink(ctx.projectId, ctx.email, repoUrl);
                setStatus("#github-sync-status", "GitHub sync saved.");
            } catch (error) {
                setStatus("#github-sync-status", `${error?.message || "Could not save GitHub sync right now."}${formatApiDebugSuffix(error)}`, true);
            } finally {
                if (button.isConnected) button.disabled = false;
            }
            return;
        }

        if (button.id === "github-open-repo-btn" && button.dataset.syncBound !== "1") {
            const repoUrl = toSafeGithubRepoUrl(document.querySelector("#github-repo-url")?.value || "");
            if (!repoUrl) {
                setStatus("#github-sync-status", "Enter a valid GitHub repository URL first.", true);
                return;
            }
            window.open(repoUrl, "_blank", "noopener,noreferrer");
            setStatus("#github-sync-status", "Opened GitHub repository.");
            return;
        }
    });

    document.addEventListener("click", async (event) => {
        const button = event.target?.closest?.("button");
        if (!button) {
            return;
        }

        if (
            button.id !== "trello-save-link-btn"
            && button.id !== "trello-open-card-btn"
            && button.id !== "github-save-link-btn"
            && button.id !== "github-open-repo-btn"
        ) {
            return;
        }

        event.stopImmediatePropagation();

        if (button.id === "github-open-repo-btn") {
            const repoUrl = toSafeGithubRepoUrl(document.querySelector("#github-repo-url")?.value || "");
            if (!repoUrl) {
                setStatus("#github-sync-status", "Enter a valid GitHub repository URL first.", true);
                return;
            }
            window.open(repoUrl, "_blank", "noopener,noreferrer");
            setStatus("#github-sync-status", "Opened GitHub repository.");
            return;
        }

        if (button.id === "github-save-link-btn") {
            const repoUrl = toSafeGithubRepoUrl(document.querySelector("#github-repo-url")?.value || "");
            if (!repoUrl) {
                setStatus("#github-sync-status", "Enter a valid GitHub repository URL first.", true);
                return;
            }

            const note = String(document.querySelector("#github-work-note")?.value || "").trim();
            const ctx = getActiveSyncContext();
            if (!ctx.projectId || !ctx.email) {
                setStatus("#github-sync-status", "Sign in again, then retry Save GitHub Sync.", true);
                return;
            }

            button.disabled = true;
            setStatus("#github-sync-status", "Saving GitHub sync...");
            try {
                await persistStudentGithubSyncDirectlyToEvidence(ctx.projectId, ctx.email, ctx.detailData, ctx.taskTopicValue, repoUrl, note);
                addStoredGithubRepoLibraryLink(ctx.projectId, ctx.email, repoUrl);
                setStatus("#github-sync-status", "GitHub sync saved.");
            } catch (error) {
                setStatus("#github-sync-status", `${error?.message || "Could not save GitHub sync right now."}${formatApiDebugSuffix(error)}`, true);
            } finally {
                if (button.isConnected) button.disabled = false;
            }
            return;
        }

        const url = toSafeTrelloCardUrl(document.querySelector("#trello-card-url")?.value || "");
        if (button.id === "trello-open-card-btn") {
            if (!url) {
                setStatus("#trello-sync-status", "Enter a valid Trello card or board link first.", true);
                return;
            }
            window.open(url, "_blank", "noopener,noreferrer");
            setStatus("#trello-sync-status", "Opened Trello link.");
            return;
        }

        if (!url) {
            setStatus("#trello-sync-status", "Enter a valid Trello card or board link first.", true);
            return;
        }

        const ctx = getActiveSyncContext();
        if (!ctx.projectId || !ctx.email) {
            setStatus("#trello-sync-status", "Sign in again, then retry Save Trello Link.", true);
            return;
        }

        button.disabled = true;
        setStatus("#trello-sync-status", "Saving Trello link...");
        try {
            await persistStudentTrelloLinkDirectlyToEvidence(ctx.projectId, ctx.email, ctx.detailData, ctx.taskTopicValue, url);
            addStoredTrelloCardLibraryLink(ctx.projectId, ctx.email, url);
            refreshTrelloLibraryUi(ctx.projectId, ctx.email);
            setStatus("#trello-sync-status", "Trello link saved.");
        } catch (error) {
            setStatus("#trello-sync-status", `${error?.message || "Could not save Trello link right now."}${formatApiDebugSuffix(error)}`, true);
        } finally {
            if (button.isConnected) button.disabled = false;
        }
    }, true);
}

function formatApiDebugSuffix(error) {
    const parts = [];
    if (Number.isFinite(Number(error?.status)) && Number(error.status) > 0) {
        parts.push(`status ${Number(error.status)}`);
    }
    if (error?.stage) {
        parts.push(`stage ${String(error.stage)}`);
    }
    if (error?.endpoint) {
        parts.push(String(error.endpoint));
    }

    return parts.length ? ` [debug: ${parts.join(" | ")}]` : "";
}

function getTrelloCardStorageKey(projectId, email) {
    return `${TRELLO_CARD_LINK_STORAGE_PREFIX}:${String(projectId || "").trim()}:${String(email || "").trim().toLowerCase()}`;
}

function getTrelloCardLibraryStorageKey(projectId, email) {
    return `${TRELLO_CARD_LIBRARY_STORAGE_PREFIX}:${String(projectId || "").trim()}:${String(email || "").trim().toLowerCase()}`;
}

function getGithubRepoLibraryStorageKey(projectId, email) {
    return `${GITHUB_REPO_LIBRARY_STORAGE_PREFIX}:${String(projectId || "").trim()}:${String(email || "").trim().toLowerCase()}`;
}

function getOneDriveLinkLibraryStorageKey(projectId, email) {
    return `${ONEDRIVE_LINK_LIBRARY_STORAGE_PREFIX}:${String(projectId || "").trim()}:${String(email || "").trim().toLowerCase()}`;
}

function getGoogleDriveLinkLibraryStorageKey(projectId, email) {
    return `${GOOGLE_DRIVE_LINK_LIBRARY_STORAGE_PREFIX}:${String(projectId || "").trim()}:${String(email || "").trim().toLowerCase()}`;
}

function normalizeTrelloCardLibrary(values) {
    const seenIndexByUrl = new Map();
    const list = [];
    const source = Array.isArray(values) ? values : [];
    source.forEach((value) => {
        const candidateUrl = typeof value === "object" && value
            ? value.url
            : value;
        const safeUrl = toSafeTrelloCardUrl(candidateUrl);
        if (!safeUrl) {
            return;
        }

        let savedAt = "";
        if (typeof value === "object" && value) {
            const parsed = Date.parse(String(value.savedAt || "").trim());
            savedAt = Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
        }

        if (seenIndexByUrl.has(safeUrl)) {
            const existingIndex = Number(seenIndexByUrl.get(safeUrl));
            const existing = list[existingIndex] || { url: safeUrl, savedAt: "" };
            if (!existing.savedAt && savedAt) {
                list[existingIndex] = { url: safeUrl, savedAt };
            }
            return;
        }

        seenIndexByUrl.set(safeUrl, list.length);
        list.push({ url: safeUrl, savedAt });
    });
    return list.slice(0, 12);
}

function mergeTrelloCardLibrarySources(...sources) {
    const merged = [];
    sources.forEach((source) => {
        const values = Array.isArray(source) ? source : [];
        values.forEach((value) => {
            if (typeof value === "string") {
                merged.push({ url: value, savedAt: "" });
                return;
            }
            merged.push(value);
        });
    });
    return normalizeTrelloCardLibrary(merged);
}

function formatLibrarySavedAtLabel(savedAt) {
    const parsed = Date.parse(String(savedAt || "").trim());
    if (!Number.isFinite(parsed)) {
        return "saved earlier";
    }

    const now = Date.now();
    const diffMs = Math.max(0, now - parsed);
    const minuteMs = 60 * 1000;
    const hourMs = 60 * minuteMs;
    const dayMs = 24 * hourMs;

    if (diffMs < minuteMs) {
        return "saved just now";
    }
    if (diffMs < hourMs) {
        const minutes = Math.round(diffMs / minuteMs);
        return `saved ${minutes} min${minutes === 1 ? "" : "s"} ago`;
    }
    if (diffMs < dayMs) {
        const hours = Math.round(diffMs / hourMs);
        return `saved ${hours} hr${hours === 1 ? "" : "s"} ago`;
    }
    const days = Math.round(diffMs / dayMs);
    return `saved ${days} day${days === 1 ? "" : "s"} ago`;
}

function readStoredTrelloCardLibrary(projectId, email) {
    const storageKey = getTrelloCardLibraryStorageKey(projectId, email);
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) {
            return [];
        }
        return normalizeTrelloCardLibrary(JSON.parse(raw));
    } catch (_error) {
        return [];
    }
}

function writeStoredTrelloCardLibrary(projectId, email, values) {
    const storageKey = getTrelloCardLibraryStorageKey(projectId, email);
    const nextValues = normalizeTrelloCardLibrary(values);
    try {
        if (!nextValues.length) {
            localStorage.removeItem(storageKey);
            return [];
        }
        localStorage.setItem(storageKey, JSON.stringify(nextValues));
    } catch (_error) {
    }
    return nextValues;
}

function addStoredTrelloCardLibraryLink(projectId, email, value) {
    const safeUrl = toSafeTrelloCardUrl(value);
    if (!safeUrl) {
        return readStoredTrelloCardLibrary(projectId, email);
    }

    const current = readStoredTrelloCardLibrary(projectId, email);
    const next = normalizeTrelloCardLibrary([{ url: safeUrl, savedAt: new Date().toISOString() }, ...current]);
    return writeStoredTrelloCardLibrary(projectId, email, next);
}

function normalizeGithubRepoLibrary(values) {
    const seenIndexByUrl = new Map();
    const list = [];
    const source = Array.isArray(values) ? values : [];
    source.forEach((value) => {
        const candidateUrl = typeof value === "object" && value
            ? value.url
            : value;
        const safeUrl = toSafeGithubRepoUrl(candidateUrl);
        if (!safeUrl) {
            return;
        }

        let savedAt = "";
        if (typeof value === "object" && value) {
            const parsed = Date.parse(String(value.savedAt || "").trim());
            savedAt = Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
        }

        if (seenIndexByUrl.has(safeUrl)) {
            const existingIndex = Number(seenIndexByUrl.get(safeUrl));
            const existing = list[existingIndex] || { url: safeUrl, savedAt: "" };
            if (!existing.savedAt && savedAt) {
                list[existingIndex] = { url: safeUrl, savedAt };
            }
            return;
        }

        seenIndexByUrl.set(safeUrl, list.length);
        list.push({ url: safeUrl, savedAt });
    });
    return list.slice(0, 12);
}

function mergeGithubRepoLibrarySources(...sources) {
    const merged = [];
    sources.forEach((source) => {
        const values = Array.isArray(source) ? source : [];
        values.forEach((value) => {
            if (typeof value === "string") {
                merged.push({ url: value, savedAt: "" });
                return;
            }
            merged.push(value);
        });
    });
    return normalizeGithubRepoLibrary(merged);
}

function readStoredGithubRepoLibrary(projectId, email) {
    const storageKey = getGithubRepoLibraryStorageKey(projectId, email);
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) {
            return [];
        }
        return normalizeGithubRepoLibrary(JSON.parse(raw));
    } catch (_error) {
        return [];
    }
}

function writeStoredGithubRepoLibrary(projectId, email, values) {
    const storageKey = getGithubRepoLibraryStorageKey(projectId, email);
    const nextValues = normalizeGithubRepoLibrary(values);
    try {
        if (!nextValues.length) {
            localStorage.removeItem(storageKey);
            return [];
        }
        localStorage.setItem(storageKey, JSON.stringify(nextValues));
    } catch (_error) {
    }
    return nextValues;
}

function addStoredGithubRepoLibraryLink(projectId, email, value) {
    const safeUrl = toSafeGithubRepoUrl(value);
    if (!safeUrl) {
        return readStoredGithubRepoLibrary(projectId, email);
    }

    const current = readStoredGithubRepoLibrary(projectId, email);
    const next = normalizeGithubRepoLibrary([{ url: safeUrl, savedAt: new Date().toISOString() }, ...current]);
    return writeStoredGithubRepoLibrary(projectId, email, next);
}

function normalizeOneDriveLinkLibrary(values) {
    const seenIndexByUrl = new Map();
    const list = [];
    const source = Array.isArray(values) ? values : [];
    source.forEach((value) => {
        const candidateUrl = typeof value === "object" && value
            ? value.url
            : value;
        const safeUrl = toSafeOneDriveFolderUrl(candidateUrl);
        if (!safeUrl) {
            return;
        }

        let savedAt = "";
        if (typeof value === "object" && value) {
            const parsed = Date.parse(String(value.savedAt || "").trim());
            savedAt = Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
        }

        if (seenIndexByUrl.has(safeUrl)) {
            const existingIndex = Number(seenIndexByUrl.get(safeUrl));
            const existing = list[existingIndex] || { url: safeUrl, savedAt: "" };
            if (!existing.savedAt && savedAt) {
                list[existingIndex] = { url: safeUrl, savedAt };
            }
            return;
        }

        seenIndexByUrl.set(safeUrl, list.length);
        list.push({ url: safeUrl, savedAt });
    });
    return list.slice(0, 12);
}

function mergeOneDriveLinkLibrarySources(...sources) {
    const merged = [];
    sources.forEach((source) => {
        const values = Array.isArray(source) ? source : [];
        values.forEach((value) => {
            if (typeof value === "string") {
                merged.push({ url: value, savedAt: "" });
                return;
            }
            merged.push(value);
        });
    });
    return normalizeOneDriveLinkLibrary(merged);
}

function readStoredOneDriveLinkLibrary(projectId, email) {
    const storageKey = getOneDriveLinkLibraryStorageKey(projectId, email);
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) {
            return [];
        }
        return normalizeOneDriveLinkLibrary(JSON.parse(raw));
    } catch (_error) {
        return [];
    }
}

function writeStoredOneDriveLinkLibrary(projectId, email, values) {
    const storageKey = getOneDriveLinkLibraryStorageKey(projectId, email);
    const nextValues = normalizeOneDriveLinkLibrary(values);
    try {
        if (!nextValues.length) {
            localStorage.removeItem(storageKey);
            return [];
        }
        localStorage.setItem(storageKey, JSON.stringify(nextValues));
    } catch (_error) {
    }
    return nextValues;
}

function addStoredOneDriveLinkLibraryLink(projectId, email, value) {
    const safeUrl = toSafeOneDriveFolderUrl(value);
    if (!safeUrl) {
        return readStoredOneDriveLinkLibrary(projectId, email);
    }

    const current = readStoredOneDriveLinkLibrary(projectId, email);
    const next = normalizeOneDriveLinkLibrary([{ url: safeUrl, savedAt: new Date().toISOString() }, ...current]);
    return writeStoredOneDriveLinkLibrary(projectId, email, next);
}

function normalizeGoogleDriveLinkLibrary(values) {
    const seenIndexByUrl = new Map();
    const list = [];
    const source = Array.isArray(values) ? values : [];
    source.forEach((value) => {
        const candidateUrl = typeof value === "object" && value
            ? value.url
            : value;
        const safeUrl = toSafeGoogleDriveFolderUrl(candidateUrl);
        if (!safeUrl) {
            return;
        }

        let savedAt = "";
        if (typeof value === "object" && value) {
            const parsed = Date.parse(String(value.savedAt || "").trim());
            savedAt = Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
        }

        if (seenIndexByUrl.has(safeUrl)) {
            const existingIndex = Number(seenIndexByUrl.get(safeUrl));
            const existing = list[existingIndex] || { url: safeUrl, savedAt: "" };
            if (!existing.savedAt && savedAt) {
                list[existingIndex] = { url: safeUrl, savedAt };
            }
            return;
        }

        seenIndexByUrl.set(safeUrl, list.length);
        list.push({ url: safeUrl, savedAt });
    });
    return list.slice(0, 12);
}

function mergeGoogleDriveLinkLibrarySources(...sources) {
    const merged = [];
    sources.forEach((source) => {
        const values = Array.isArray(source) ? source : [];
        values.forEach((value) => {
            if (typeof value === "string") {
                merged.push({ url: value, savedAt: "" });
                return;
            }
            merged.push(value);
        });
    });
    return normalizeGoogleDriveLinkLibrary(merged);
}

function readStoredGoogleDriveLinkLibrary(projectId, email) {
    const storageKey = getGoogleDriveLinkLibraryStorageKey(projectId, email);
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) {
            return [];
        }
        return normalizeGoogleDriveLinkLibrary(JSON.parse(raw));
    } catch (_error) {
        return [];
    }
}

function writeStoredGoogleDriveLinkLibrary(projectId, email, values) {
    const storageKey = getGoogleDriveLinkLibraryStorageKey(projectId, email);
    const nextValues = normalizeGoogleDriveLinkLibrary(values);
    try {
        if (!nextValues.length) {
            localStorage.removeItem(storageKey);
            return [];
        }
        localStorage.setItem(storageKey, JSON.stringify(nextValues));
    } catch (_error) {
    }
    return nextValues;
}

function addStoredGoogleDriveLinkLibraryLink(projectId, email, value) {
    const safeUrl = toSafeGoogleDriveFolderUrl(value);
    if (!safeUrl) {
        return readStoredGoogleDriveLinkLibrary(projectId, email);
    }

    const current = readStoredGoogleDriveLinkLibrary(projectId, email);
    const next = normalizeGoogleDriveLinkLibrary([{ url: safeUrl, savedAt: new Date().toISOString() }, ...current]);
    return writeStoredGoogleDriveLinkLibrary(projectId, email, next);
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

    const trelloBoardAliases = new Map([
        ["n06v7lY2", "n06w7IY2"]
    ]);

    try {
        const parsed = new URL(raw);
        const host = String(parsed.hostname || "").toLowerCase();
        if (!(host === "trello.com" || host.endsWith(".trello.com"))) {
            return "";
        }

        // Accept card URLs: /c/xxxx
        const cardMatch = parsed.pathname.match(/\/c\/([a-zA-Z0-9]+)/i);
        if (cardMatch?.[1]) {
            return `https://trello.com/c/${cardMatch[1]}`;
        }

        // Also accept board URLs: /b/xxxx/board-name — store the canonical board URL
        const boardMatch = parsed.pathname.match(/\/b\/([a-zA-Z0-9]+)/i);
        if (boardMatch?.[1]) {
            const boardId = trelloBoardAliases.get(boardMatch[1]) || boardMatch[1];
            const boardSlug = parsed.pathname.split("/").filter(Boolean).slice(2).join("/");
            return boardSlug
                ? `https://trello.com/b/${boardId}/${boardSlug}`
                : `https://trello.com/b/${boardId}`;
        }

        return "";
    } catch (_error) {
        return "";
    }
}

function getTrelloBoardHint(value) {
    const safeUrl = toSafeTrelloCardUrl(value);
    const boardMatch = String(safeUrl || "").match(/\/b\/([a-zA-Z0-9]+)(?:\/([^/?#]+))?/i);
    if (!boardMatch?.[1]) {
        return "";
    }

    const boardSlug = String(boardMatch[2] || "").replace(/-/g, " ").trim();
    if (boardSlug) {
        return `${boardSlug.charAt(0).toUpperCase()}${boardSlug.slice(1)}`;
    }

    return "Trello board";
}

function toStandardCode(value) {
    const match = String(value || "").match(/\b\d{5}\b/);
    return match ? match[0] : "";
}

function deriveEvidenceStandardsFromDetailData(detailData) {
    return coerceArray(detailData?.standardDetails)
        .map((line) => {
            const match = String(line || "").match(/\b(\d{5})\b/);
            return match ? match[1] : "";
        })
        .filter((code) => code && EVIDENCE_STEPS_TARGET_STANDARDS.has(code));
}

function getEffectiveAssignedStandards(record, detailData) {
    const fromRecord = [
        toStandardCode(record?.standard_1),
        toStandardCode(record?.standard_2)
    ].filter((code) => code && EVIDENCE_STEPS_TARGET_STANDARDS.has(code));
    if (fromRecord.length) {
        return fromRecord;
    }
    return deriveEvidenceStandardsFromDetailData(detailData);
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

function normalizeRequirementText(value) {
    return String(value || "")
        .replace(/^(Achieved|Merit|Excellence)\s*:\s*/i, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function inferConnectedSystemsFromEvidenceRows(rows) {
    const normalizedRows = normalizeEvidenceSteps(rows);
    let trelloConnected = false;
    let githubConnected = false;

    normalizedRows.forEach((row) => {
        (Array.isArray(row?.steps) ? row.steps : []).forEach((step) => {
            const text = String(step?.text || "").trim();
            if (!text) {
                return;
            }

            const textLower = text.toLowerCase();
            if (text.startsWith("TRELLO_CARD_URL|")) {
                const trelloUrl = toSafeTrelloCardUrl(text.slice("TRELLO_CARD_URL|".length).trim());
                if (trelloUrl) {
                    trelloConnected = true;
                }
            }

            if (textLower.includes("trello.com/")) {
                trelloConnected = true;
            }

            if (/(github\.com|gist\.github\.com|raw\.githubusercontent\.com)/i.test(textLower)) {
                githubConnected = true;
            }
        });
    });

    return { trelloConnected, githubConnected };
}

function getEvidenceCompletionPercentFromRows(rows, standards) {
    const map = evidenceRowsToMap(rows);
    const targetStandards = Array.isArray(standards) ? standards : [];

    if (targetStandards.includes("91897")) {
        const defaults91897 = (Array.isArray(EVIDENCE_STEPS_DEFAULTS?.["91897"]) ? EVIDENCE_STEPS_DEFAULTS["91897"] : [])
            .map((line) => String(line || "").trim())
            .filter((line) => /^achieved\s*:/i.test(line));
        const requiredKeys = defaults91897.map((line) => normalizeRequirementText(line));

        if (requiredKeys.length) {
            const requiredStatus = new Map(requiredKeys.map((key) => [key, false]));
            const items91897 = Array.isArray(map["91897"]) ? map["91897"] : [];

            items91897.forEach((item) => {
                const text = String(item?.text || "").trim();
                if (!text || !/^achieved\s*:/i.test(text)) {
                    return;
                }

                const key = normalizeRequirementText(text);
                if (!requiredStatus.has(key)) {
                    return;
                }

                if (Boolean(item?.done)) {
                    requiredStatus.set(key, true);
                }
            });

            const projectManagementKey = normalizeRequirementText("Achieved: Use appropriate project management tools and techniques to plan the development of a digital technologies outcome.");
            if (requiredStatus.has(projectManagementKey)) {
                const systems = inferConnectedSystemsFromEvidenceRows(rows);
                if (systems.trelloConnected || systems.githubConnected) {
                    requiredStatus.set(projectManagementKey, true);
                }
            }

            const totalRequired = requiredStatus.size;
            const doneRequired = Array.from(requiredStatus.values()).filter(Boolean).length;
            return totalRequired ? Math.round((doneRequired / totalRequired) * 100) : 0;
        }
    }

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
    const endpoint = `/api/activities/${encodeURIComponent(projectId)}/interests/${encodeURIComponent(studentEmail)}/evidence`;
    const response = await fetch(`/api/activities/${encodeURIComponent(projectId)}/interests/${encodeURIComponent(studentEmail)}/evidence`, {
        headers: buildWriteHeaders()
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const error = new Error(payload?.error || "Could not load evidence steps.");
        error.status = Number(response.status || 0);
        error.endpoint = endpoint;
        error.stage = "load-evidence";
        throw error;
    }

    const payload = await response.json().catch(() => ({}));
    return normalizeEvidenceSteps(payload?.evidence_steps);
}

async function saveEvidenceRows(projectId, studentEmail, rows) {
    const endpoint = `/api/activities/${encodeURIComponent(projectId)}/interests/${encodeURIComponent(studentEmail)}/evidence`;
    const response = await fetch(`/api/activities/${encodeURIComponent(projectId)}/interests/${encodeURIComponent(studentEmail)}/evidence`, {
        method: "PATCH",
        headers: buildWriteHeaders(),
        body: JSON.stringify({ evidence_steps: normalizeEvidenceSteps(rows) })
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const error = new Error(payload?.error || "Could not save evidence steps.");
        error.status = Number(response.status || 0);
        error.endpoint = endpoint;
        error.stage = "save-evidence";
        throw error;
    }
}

async function fetchMyEvidenceRows(projectId) {
    const endpoint = `/api/activities/${encodeURIComponent(projectId)}/my-evidence`;
    const response = await fetch(endpoint, {
        headers: buildWriteHeaders()
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const error = new Error(payload?.error || "Could not load my evidence steps.");
        error.status = Number(response.status || 0);
        error.endpoint = endpoint;
        error.stage = "load-my-evidence";
        throw error;
    }

    const payload = await response.json().catch(() => ({}));
    return normalizeEvidenceSteps(payload?.evidence_steps);
}

async function saveMyEvidenceRows(projectId, rows) {
    const endpoint = `/api/activities/${encodeURIComponent(projectId)}/my-evidence`;
    const response = await fetch(endpoint, {
        method: "PATCH",
        headers: buildWriteHeaders(),
        body: JSON.stringify({ evidence_steps: normalizeEvidenceSteps(rows) })
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const error = new Error(payload?.error || "Could not save my evidence steps.");
        error.status = Number(response.status || 0);
        error.endpoint = endpoint;
        error.stage = "save-my-evidence";
        throw error;
    }
}

async function fetchEvidenceRowsEnsuringAllocation(projectId, studentEmail) {
    try {
        return await fetchEvidenceRows(projectId, studentEmail);
    } catch (error) {
        const status = Number(error?.status || 0);
        if (status !== 404) {
            throw error;
        }
    }

    const toggleInterest = async () => {
        const endpoint = `/api/activities/${encodeURIComponent(projectId)}/interest`;
        const response = await fetch(`/api/activities/${encodeURIComponent(projectId)}/interest`, {
            method: "POST",
            headers: buildWriteHeaders()
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            const error = new Error(payload?.error || "Could not prepare student allocation.");
            error.status = Number(response.status || 0);
            error.endpoint = endpoint;
            error.stage = "ensure-allocation";
            throw error;
        }

        return response.json().catch(() => ({}));
    };

    const firstResult = await toggleInterest();
    if (!Boolean(firstResult?.interested)) {
        const secondResult = await toggleInterest();
        if (!Boolean(secondResult?.interested)) {
            throw new Error("Could not prepare student allocation.");
        }
    }

    return fetchEvidenceRows(projectId, studentEmail);
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
        googleSlidesUrl: "",
        mediaAssetFolderUrl: "",
        googleDriveProjectFolderUrl: "",
        mediaReviewUrl: "",
        mediaVersionLogDate: "",
        mediaVersionLogAt: "",
        mediaVersionLogNote: "",
        decompositionSteps: [],
        decompositionLastPushAt: "",
        decompositionLastPushCount: 0,
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
            if (!result.googleSlidesUrl && /docs\.google\.com\/presentation/i.test(result.evidenceLink)) {
                result.googleSlidesUrl = toSafeExternalUrl(result.evidenceLink);
            }
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

        if (text.startsWith("GOOGLE_SLIDES_URL|")) {
            result.googleSlidesUrl = toSafeExternalUrl(text.slice("GOOGLE_SLIDES_URL|".length).trim());
            return;
        }

        if (text.startsWith("MEDIA_ASSET_FOLDER_URL|")) {
            result.mediaAssetFolderUrl = toSafeExternalUrl(text.slice("MEDIA_ASSET_FOLDER_URL|".length).trim());
            return;
        }

        if (text.startsWith("ONEDRIVE_PROJECT_FOLDER_URL|")) {
            result.mediaAssetFolderUrl = toSafeExternalUrl(text.slice("ONEDRIVE_PROJECT_FOLDER_URL|".length).trim());
            return;
        }

        if (text.startsWith("GOOGLE_DRIVE_PROJECT_FOLDER_URL|")) {
            result.googleDriveProjectFolderUrl = toSafeExternalUrl(text.slice("GOOGLE_DRIVE_PROJECT_FOLDER_URL|".length).trim());
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

        if (text.startsWith("DECOMP_STEP|")) {
            const stepText = text.slice("DECOMP_STEP|".length).trim();
            if (stepText) {
                result.decompositionSteps.push(stepText);
            }
            return;
        }

        if (text.startsWith("DECOMP_PUSH_AT|")) {
            result.decompositionLastPushAt = text.slice("DECOMP_PUSH_AT|".length).trim();
            return;
        }

        if (text.startsWith("DECOMP_PUSH_COUNT|")) {
            const count = Number(text.slice("DECOMP_PUSH_COUNT|".length).trim());
            result.decompositionLastPushCount = Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0;
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
    const existingSubmission = parseTaskTopicSubmissionFromEvidenceRows(rows, standardKey);
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
    const trelloCardUrl = payload?.trelloCardUrl !== undefined
        ? toSafeTrelloCardUrl(payload?.trelloCardUrl)
        : toSafeTrelloCardUrl(existingSubmission.trelloCardUrl);
    const trelloLastLogDate = payload?.trelloLastLogDate !== undefined
        ? String(payload?.trelloLastLogDate || "").trim()
        : String(existingSubmission.trelloLastLogDate || "").trim();
    const trelloLastLogAt = payload?.trelloLastLogAt !== undefined
        ? String(payload?.trelloLastLogAt || "").trim()
        : String(existingSubmission.trelloLastLogAt || "").trim();
    const trelloLastLogNote = payload?.trelloLastLogNote !== undefined
        ? String(payload?.trelloLastLogNote || "").trim()
        : String(existingSubmission.trelloLastLogNote || "").trim();
    const googleSlidesUrl = payload?.googleSlidesUrl !== undefined
        ? toSafeExternalUrl(payload?.googleSlidesUrl)
        : toSafeExternalUrl(existingSubmission.googleSlidesUrl || existingSubmission.evidenceLink);
    const mediaAssetFolderUrl = payload?.mediaAssetFolderUrl !== undefined
        ? toSafeExternalUrl(payload?.mediaAssetFolderUrl)
        : toSafeExternalUrl(existingSubmission.mediaAssetFolderUrl);
    const googleDriveProjectFolderUrl = payload?.googleDriveProjectFolderUrl !== undefined
        ? toSafeExternalUrl(payload?.googleDriveProjectFolderUrl)
        : toSafeExternalUrl(existingSubmission.googleDriveProjectFolderUrl);
    const mediaReviewUrl = payload?.mediaReviewUrl !== undefined
        ? toSafeExternalUrl(payload?.mediaReviewUrl)
        : toSafeExternalUrl(existingSubmission.mediaReviewUrl);
    const mediaVersionLogDate = payload?.mediaVersionLogDate !== undefined
        ? String(payload?.mediaVersionLogDate || "").trim()
        : String(existingSubmission.mediaVersionLogDate || "").trim();
    const mediaVersionLogAt = payload?.mediaVersionLogAt !== undefined
        ? String(payload?.mediaVersionLogAt || "").trim()
        : String(existingSubmission.mediaVersionLogAt || "").trim();
    const mediaVersionLogNote = payload?.mediaVersionLogNote !== undefined
        ? String(payload?.mediaVersionLogNote || "").trim()
        : String(existingSubmission.mediaVersionLogNote || "").trim();
    const decompositionSteps = Array.isArray(payload?.decompositionSteps)
        ? parseDecompositionStepsText(payload.decompositionSteps.join("\n"))
        : parseDecompositionStepsText((existingSubmission.decompositionSteps || []).join("\n"));
    const decompositionLastPushAt = payload?.decompositionLastPushAt !== undefined
        ? String(payload?.decompositionLastPushAt || "").trim()
        : String(existingSubmission.decompositionLastPushAt || "").trim();
    const decompositionLastPushCount = payload?.decompositionLastPushCount !== undefined
        ? Math.max(0, Math.round(Number(payload?.decompositionLastPushCount) || 0))
        : Math.max(0, Math.round(Number(existingSubmission.decompositionLastPushCount) || 0));
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
    if (googleSlidesUrl) {
        steps.push({ text: `GOOGLE_SLIDES_URL|${googleSlidesUrl}`, done: true });
        steps.push({ text: `LINK|${googleSlidesUrl}`, done: true });
    }
    if (mediaAssetFolderUrl) {
        steps.push({ text: `MEDIA_ASSET_FOLDER_URL|${mediaAssetFolderUrl}`, done: true });
        steps.push({ text: `ONEDRIVE_PROJECT_FOLDER_URL|${mediaAssetFolderUrl}`, done: true });
    }
    if (googleDriveProjectFolderUrl) {
        steps.push({ text: `GOOGLE_DRIVE_PROJECT_FOLDER_URL|${googleDriveProjectFolderUrl}`, done: true });
        steps.push({ text: `LINK|${googleDriveProjectFolderUrl}`, done: true });
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
    decompositionSteps.forEach((stepText) => {
        steps.push({ text: `DECOMP_STEP|${stepText}`, done: true });
    });
    if (decompositionLastPushAt) {
        steps.push({ text: `DECOMP_PUSH_AT|${decompositionLastPushAt}`, done: true });
    }
    if (decompositionLastPushCount > 0) {
        steps.push({ text: `DECOMP_PUSH_COUNT|${decompositionLastPushCount}`, done: true });
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

function formatSyncCreatedDate(value) {
    const raw = String(value || "").trim();
    if (!raw) {
        return "Unknown";
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
        return "Unknown";
    }

    return parsed.toLocaleString();
}

function summarizeStudentSubmissionStatus(evidenceRows, todayNzKey = getNzDateKey()) {
    const rows = normalizeEvidenceSteps(evidenceRows);
    let acknowledged = false;
    let trelloLogDate = "";
    let mediaLogDate = "";
    let trelloLinked = false;

    rows.forEach((row) => {
        (Array.isArray(row?.steps) ? row.steps : []).forEach((step) => {
            const text = String(step?.text || "").trim();
            if (!text) {
                return;
            }

            if (text.startsWith("HAPARA_ACK|")) {
                const value = text.slice("HAPARA_ACK|".length).trim().toLowerCase();
                acknowledged = value === "true" || value === "1" || value === "yes";
                return;
            }

            if (text.startsWith("SUBMITTED_AT|")) {
                const value = text.slice("SUBMITTED_AT|".length).trim();
                if (value) {
                    acknowledged = true;
                }
                return;
            }

            if (text.startsWith("TRELLO_LAST_LOG_DATE|")) {
                trelloLogDate = text.slice("TRELLO_LAST_LOG_DATE|".length).trim();
                return;
            }

            if (text.startsWith("TRELLO_CARD_URL|")) {
                const trelloUrl = toSafeTrelloCardUrl(text.slice("TRELLO_CARD_URL|".length).trim());
                if (trelloUrl) {
                    trelloLinked = true;
                }
                return;
            }

            if (text.startsWith("MEDIA_VERSION_LOG_DATE|")) {
                mediaLogDate = text.slice("MEDIA_VERSION_LOG_DATE|".length).trim();
            }
        });
    });

    const loggedToday = trelloLogDate === todayNzKey || mediaLogDate === todayNzKey;
    return { acknowledged, loggedToday, trelloLinked };
}

function getFirstTrelloCardUrlFromEvidenceRows(evidenceRows) {
    const rows = normalizeEvidenceSteps(evidenceRows);
    for (const row of rows) {
        const steps = Array.isArray(row?.steps) ? row.steps : [];
        for (const step of steps) {
            const text = String(step?.text || "").trim();
            if (!text.startsWith("TRELLO_CARD_URL|")) {
                continue;
            }

            const url = toSafeTrelloCardUrl(text.slice("TRELLO_CARD_URL|".length).trim());
            if (url) {
                return url;
            }
        }
    }

    return "";
}

function getAllTrelloCardUrlsFromEvidenceRows(evidenceRows) {
    const rows = normalizeEvidenceSteps(evidenceRows);
    const collected = [];
    rows.forEach((row) => {
        const steps = Array.isArray(row?.steps) ? row.steps : [];
        steps.forEach((step) => {
            const text = String(step?.text || "").trim();
            if (!text.startsWith("TRELLO_CARD_URL|")) {
                return;
            }

            const url = toSafeTrelloCardUrl(text.slice("TRELLO_CARD_URL|".length).trim());
            if (url) {
                collected.push(url);
            }
        });
    });
    return normalizeTrelloCardLibrary(collected);
}

function getLatestTrelloSavedAtFromEvidenceRows(evidenceRows) {
    const rows = normalizeEvidenceSteps(evidenceRows);
    let latestIso = "";
    rows.forEach((row) => {
        const steps = Array.isArray(row?.steps) ? row.steps : [];
        steps.forEach((step) => {
            const text = String(step?.text || "").trim();
            if (!text.startsWith("TRELLO_SAVED_AT|")) {
                return;
            }
            const value = text.slice("TRELLO_SAVED_AT|".length).trim();
            const parsed = Date.parse(value);
            if (!Number.isFinite(parsed)) {
                return;
            }
            if (!latestIso || parsed > Date.parse(latestIso)) {
                latestIso = new Date(parsed).toISOString();
            }
        });
    });
    return latestIso;
}

function toSafeGithubRepoUrl(value) {
    const safeUrl = toSafeExternalUrl(value);
    if (!safeUrl) return "";

    try {
        const parsed = new URL(safeUrl);
        const host = String(parsed.hostname || "").toLowerCase();
        if (!(host === "github.com" || host.endsWith(".github.com") || host === "gist.github.com")) {
            return "";
        }

        const segments = parsed.pathname.split("/").filter(Boolean);
        if ((host === "github.com" || host.endsWith(".github.com")) && segments.length < 2) {
            return "";
        }

        parsed.hash = "";
        return parsed.toString().replace(/\/$/, "");
    } catch (_error) {
        return "";
    }
}

function getFirstGithubRepoUrlFromEvidenceRows(evidenceRows) {
    const rows = normalizeEvidenceSteps(evidenceRows);
    for (const row of rows) {
        const steps = Array.isArray(row?.steps) ? row.steps : [];
        for (const step of steps) {
            const text = String(step?.text || "").trim();
            if (!text) continue;

            if (text.startsWith("GITHUB_REPO_URL|")) {
                const githubUrl = toSafeGithubRepoUrl(text.slice("GITHUB_REPO_URL|".length).trim());
                if (githubUrl) {
                    return githubUrl;
                }
            }

            if (text.startsWith("LINK|")) {
                const linked = toSafeGithubRepoUrl(text.slice("LINK|".length).trim());
                if (linked) {
                    return linked;
                }
            }
        }
    }

    return "";
}

function getAllGithubRepoUrlsFromEvidenceRows(evidenceRows) {
    const rows = normalizeEvidenceSteps(evidenceRows);
    const urls = [];
    const seen = new Set();

    rows.forEach((row) => {
        (Array.isArray(row?.steps) ? row.steps : []).forEach((step) => {
            const text = String(step?.text || "").trim();
            if (!text) return;

            let candidate = "";
            if (text.startsWith("GITHUB_REPO_URL|")) {
                candidate = text.slice("GITHUB_REPO_URL|".length).trim();
            } else if (text.startsWith("LINK|")) {
                candidate = text.slice("LINK|".length).trim();
            }

            const safe = toSafeGithubRepoUrl(candidate);
            if (!safe || seen.has(safe)) return;
            seen.add(safe);
            urls.push(safe);
        });
    });

    return urls;
}

function upsertEvidenceStandardRow(rows, standardKey, steps) {
    const normalizedRows = normalizeEvidenceSteps(rows).filter(
        (row) => String(row?.standard || "").trim() !== String(standardKey || "").trim()
    );

    normalizedRows.push({
        standard: String(standardKey || "").trim(),
        steps: Array.isArray(steps) ? steps : []
    });

    return normalizeEvidenceSteps(normalizedRows);
}

function getFirstOneDriveFolderUrlFromEvidenceRows(evidenceRows) {
    const rows = normalizeEvidenceSteps(evidenceRows);
    for (const row of rows) {
        const steps = Array.isArray(row?.steps) ? row.steps : [];
        for (const step of steps) {
            const text = String(step?.text || "").trim();
            if (text.startsWith("ONEDRIVE_PROJECT_FOLDER_URL|")) {
                const url = toSafeExternalUrl(text.slice("ONEDRIVE_PROJECT_FOLDER_URL|".length).trim());
                if (url) return url;
            }

            if (text.startsWith("MEDIA_ASSET_FOLDER_URL|")) {
                const url = toSafeExternalUrl(text.slice("MEDIA_ASSET_FOLDER_URL|".length).trim());
                if (url) return url;
            }

            if (text.startsWith("LINK|")) {
                const url = toSafeExternalUrl(text.slice("LINK|".length).trim());
                if (url && /(onedrive\.live\.com|1drv\.ms|sharepoint\.com)/i.test(url)) {
                    return url;
                }
            }
        }
    }

    return "";
}

function getAllOneDriveFolderUrlsFromEvidenceRows(evidenceRows) {
    const rows = normalizeEvidenceSteps(evidenceRows);
    const urls = [];
    const seen = new Set();

    rows.forEach((row) => {
        (Array.isArray(row?.steps) ? row.steps : []).forEach((step) => {
            const text = String(step?.text || "").trim();
            if (!text) return;

            let candidate = "";
            if (text.startsWith("ONEDRIVE_PROJECT_FOLDER_URL|")) {
                candidate = text.slice("ONEDRIVE_PROJECT_FOLDER_URL|".length).trim();
            } else if (text.startsWith("MEDIA_ASSET_FOLDER_URL|")) {
                candidate = text.slice("MEDIA_ASSET_FOLDER_URL|".length).trim();
            } else if (text.startsWith("LINK|")) {
                candidate = text.slice("LINK|".length).trim();
            }

            const safe = toSafeOneDriveFolderUrl(candidate);
            if (!safe || seen.has(safe)) return;
            seen.add(safe);
            urls.push(safe);
        });
    });

    return urls;
}

function getFirstGoogleDriveFolderUrlFromEvidenceRows(evidenceRows) {
    const rows = normalizeEvidenceSteps(evidenceRows);
    for (const row of rows) {
        const steps = Array.isArray(row?.steps) ? row.steps : [];
        for (const step of steps) {
            const text = String(step?.text || "").trim();
            if (text.startsWith("GOOGLE_DRIVE_PROJECT_FOLDER_URL|")) {
                const url = toSafeExternalUrl(text.slice("GOOGLE_DRIVE_PROJECT_FOLDER_URL|".length).trim());
                if (url) return url;
            }

            if (text.startsWith("LINK|")) {
                const url = toSafeExternalUrl(text.slice("LINK|".length).trim());
                if (url && /(drive\.google\.com)/i.test(url)) {
                    return url;
                }
            }
        }
    }

    return "";
}

function getAllGoogleDriveFolderUrlsFromEvidenceRows(evidenceRows) {
    const rows = normalizeEvidenceSteps(evidenceRows);
    const urls = [];
    const seen = new Set();

    rows.forEach((row) => {
        (Array.isArray(row?.steps) ? row.steps : []).forEach((step) => {
            const text = String(step?.text || "").trim();
            if (!text) return;

            let candidate = "";
            if (text.startsWith("GOOGLE_DRIVE_PROJECT_FOLDER_URL|")) {
                candidate = text.slice("GOOGLE_DRIVE_PROJECT_FOLDER_URL|".length).trim();
            } else if (text.startsWith("LINK|")) {
                candidate = text.slice("LINK|".length).trim();
            }

            const safe = toSafeGoogleDriveFolderUrl(candidate);
            if (!safe || seen.has(safe)) return;
            seen.add(safe);
            urls.push(safe);
        });
    });

    return urls;
}

async function persistStudentTrelloLink(projectId, studentEmail, trelloCardUrl) {
    const safeUrl = toSafeTrelloCardUrl(trelloCardUrl);
    if (!safeUrl) {
        throw new Error("Enter a valid Trello card or board link first.");
    }

    const saveTrelloLinkViaEvidence = async () => {
        const rows = await fetchEvidenceRowsEnsuringAllocation(projectId, studentEmail);
        const nextRows = upsertEvidenceStandardRow(rows, "trello-sync", [
            { text: `TRELLO_CARD_URL|${safeUrl}`, done: true },
            { text: `TRELLO_SAVED_AT|${new Date().toISOString()}`, done: true }
        ]);
        await saveEvidenceRows(projectId, studentEmail, nextRows);
    };

    const saveTrelloLinkMeEndpoint = async () => {
        const response = await fetch(`/api/activities/${encodeURIComponent(projectId)}/interests/me/trello-link`, {
            method: "PATCH",
            headers: buildWriteHeaders(),
            body: JSON.stringify({ trello_card_url: safeUrl })
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            const error = new Error(payload?.error || "Could not save Trello link.");
            error.status = Number(response.status || 0);
            throw error;
        }
    };

    const saveTrelloLinkLegacyEndpoint = async () => {
        const response = await fetch(`/api/activities/${encodeURIComponent(projectId)}/interests/${encodeURIComponent(studentEmail)}/trello-link`, {
            method: "PATCH",
            headers: buildWriteHeaders(),
            body: JSON.stringify({ trello_card_url: safeUrl })
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            const error = new Error(payload?.error || "Could not save Trello link.");
            error.status = Number(response.status || 0);
            throw error;
        }
    };

    // Primary path: persist via evidence rows (most reliable in this page context).
    await saveTrelloLinkViaEvidence();

    // Secondary path: keep dedicated endpoint in sync, but do not block success.
    try {
        await saveTrelloLinkMeEndpoint();
    } catch (_error) {
        // Fallback to original student-email endpoint for backward compatibility.
        try {
            await saveTrelloLinkLegacyEndpoint();
        } catch (_legacyError) {
            // Evidence rows already contain the Trello URL; keep UX successful.
        }
    }
}

async function persistStudentTrelloLinkForTaskTopic(projectId, studentEmail, detailData, taskTopicTitle, trelloCardUrl) {
    const safeUrl = toSafeTrelloCardUrl(trelloCardUrl);
    if (!safeUrl) {
        throw new Error("Enter a valid Trello card or board link first.");
    }

    const safeTaskTopic = String(taskTopicTitle || "").trim();
    if (!safeTaskTopic) {
        return;
    }

    const standardNumber = extractPrimaryStandardNumberFromRows(coerceArray(detailData?.standardDetails));
    const standardKey = buildTaskTopicSubmissionStandardKey(safeTaskTopic, standardNumber);
    const evidenceRows = await fetchEvidenceRowsEnsuringAllocation(projectId, studentEmail);
    const nextRows = upsertTaskTopicSubmissionEvidenceRows(evidenceRows, standardKey, {
        trelloCardUrl: safeUrl
    });
    await saveEvidenceRows(projectId, studentEmail, nextRows);
}

async function persistStudentTrelloLinkDirectlyToEvidence(projectId, studentEmail, detailData, taskTopicTitle, trelloCardUrl) {
    const safeUrl = toSafeTrelloCardUrl(trelloCardUrl);
    if (!safeUrl) {
        throw new Error("Enter a valid Trello card or board link first.");
    }

    const fetchMyEvidenceRows = async () => {
        const response = await fetch(`/api/activities/${encodeURIComponent(projectId)}/my-evidence`, {
            headers: buildWriteHeaders()
        });
        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            const error = new Error(payload?.error || "Could not load my evidence rows.");
            error.status = Number(response.status || 0);
            throw error;
        }
        const payload = await response.json().catch(() => ({}));
        return normalizeEvidenceSteps(payload?.evidence_steps);
    };

    const saveMyEvidenceRows = async (rows) => {
        const response = await fetch(`/api/activities/${encodeURIComponent(projectId)}/my-evidence`, {
            method: "PATCH",
            headers: buildWriteHeaders(),
            body: JSON.stringify({ evidence_steps: normalizeEvidenceSteps(rows) })
        });
        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            const error = new Error(payload?.error || "Could not save my evidence rows.");
            error.status = Number(response.status || 0);
            throw error;
        }
    };

    let nextRows = [];
    try {
        nextRows = await fetchMyEvidenceRows();
    } catch (error) {
        if (Number(error?.status || 0) !== 404) {
            throw error;
        }
        // Ensure allocation exists then retry my-evidence endpoint.
        await fetchEvidenceRowsEnsuringAllocation(projectId, studentEmail);
        nextRows = await fetchMyEvidenceRows();
    }

    nextRows = upsertEvidenceStandardRow(nextRows, "trello-sync", [
        { text: `TRELLO_CARD_URL|${safeUrl}`, done: true },
        { text: `TRELLO_SAVED_AT|${new Date().toISOString()}`, done: true }
    ]);

    const safeTaskTopic = String(taskTopicTitle || "").trim();
    if (safeTaskTopic) {
        const standardNumber = extractPrimaryStandardNumberFromRows(coerceArray(detailData?.standardDetails));
        const standardKey = buildTaskTopicSubmissionStandardKey(safeTaskTopic, standardNumber);
        nextRows = upsertTaskTopicSubmissionEvidenceRows(nextRows, standardKey, {
            trelloCardUrl: safeUrl
        });
    }

    await saveMyEvidenceRows(nextRows);
}

async function persistStudentGithubSync(projectId, studentEmail, githubRepoUrl, githubNote = "") {
    const safeRepoUrl = toSafeGithubRepoUrl(githubRepoUrl);
    if (!safeRepoUrl) {
        throw new Error("Enter a valid GitHub repository link first.");
    }

    const safeNote = String(githubNote || "").trim();
    const rows = await fetchEvidenceRowsEnsuringAllocation(projectId, studentEmail);
    const steps = [
        { text: `GITHUB_REPO_URL|${safeRepoUrl}`, done: true },
        { text: `GITHUB_SAVED_AT|${new Date().toISOString()}`, done: true }
    ];
    if (safeNote) {
        steps.push({ text: `GITHUB_WORK_NOTE|${safeNote}`, done: true });
    }

    const nextRows = upsertEvidenceStandardRow(rows, "github-sync", steps);
    await saveEvidenceRows(projectId, studentEmail, nextRows);
}

async function persistStudentGithubSyncDirectlyToEvidence(projectId, studentEmail, detailData, taskTopicTitle, githubRepoUrl, githubNote = "") {
    const safeRepoUrl = toSafeGithubRepoUrl(githubRepoUrl);
    if (!safeRepoUrl) {
        throw new Error("Enter a valid GitHub repository link first.");
    }

    const safeNote = String(githubNote || "").trim();

    const fetchMyEvidenceRows = async () => {
        const response = await fetch(`/api/activities/${encodeURIComponent(projectId)}/my-evidence`, {
            headers: buildWriteHeaders()
        });
        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            const error = new Error(payload?.error || "Could not load my evidence rows.");
            error.status = Number(response.status || 0);
            throw error;
        }
        const payload = await response.json().catch(() => ({}));
        return normalizeEvidenceSteps(payload?.evidence_steps);
    };

    const saveMyEvidenceRows = async (rows) => {
        const response = await fetch(`/api/activities/${encodeURIComponent(projectId)}/my-evidence`, {
            method: "PATCH",
            headers: buildWriteHeaders(),
            body: JSON.stringify({ evidence_steps: normalizeEvidenceSteps(rows) })
        });
        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            const error = new Error(payload?.error || "Could not save my evidence rows.");
            error.status = Number(response.status || 0);
            throw error;
        }
    };

    let nextRows = [];
    try {
        nextRows = await fetchMyEvidenceRows();
    } catch (error) {
        if (Number(error?.status || 0) !== 404) {
            throw error;
        }
        await fetchEvidenceRowsEnsuringAllocation(projectId, studentEmail);
        nextRows = await fetchMyEvidenceRows();
    }

    const steps = [
        { text: `GITHUB_REPO_URL|${safeRepoUrl}`, done: true },
        { text: `GITHUB_SAVED_AT|${new Date().toISOString()}`, done: true }
    ];
    if (safeNote) {
        steps.push({ text: `GITHUB_WORK_NOTE|${safeNote}`, done: true });
    }
    nextRows = upsertEvidenceStandardRow(nextRows, "github-sync", steps);

    const safeTaskTopic = String(taskTopicTitle || "").trim();
    if (safeTaskTopic) {
        const standardNumber = extractPrimaryStandardNumberFromRows(coerceArray(detailData?.standardDetails));
        const standardKey = buildTaskTopicSubmissionStandardKey(safeTaskTopic, standardNumber);
        nextRows = upsertTaskTopicSubmissionEvidenceRows(nextRows, standardKey, {
            evidenceLink: safeRepoUrl
        });
    }

    await saveMyEvidenceRows(nextRows);
}

async function persistStudentOneDriveFolderLink(projectId, studentEmail, detailData, taskTopicTitle, oneDriveFolderUrl) {
    const safeUrl = toSafeExternalUrl(oneDriveFolderUrl);
    if (!safeUrl) {
        throw new Error("Enter a valid OneDrive or SharePoint folder link first.");
    }

    const safeTaskTopic = String(taskTopicTitle || "").trim();
    if (!safeTaskTopic) {
        throw new Error("Open a task-topic page before saving OneDrive link.");
    }

    const standardNumber = extractPrimaryStandardNumberFromRows(coerceArray(detailData?.standardDetails));
    const standardKey = buildTaskTopicSubmissionStandardKey(safeTaskTopic, standardNumber);

    const evidenceRows = await fetchEvidenceRowsEnsuringAllocation(projectId, studentEmail);
    const nextRows = upsertTaskTopicSubmissionEvidenceRows(evidenceRows, standardKey, {
        mediaAssetFolderUrl: safeUrl
    });
    await saveEvidenceRows(projectId, studentEmail, nextRows);
}

async function persistStudentGoogleDriveFolderLink(projectId, studentEmail, detailData, taskTopicTitle, googleDriveFolderUrl) {
    const safeUrl = toSafeExternalUrl(googleDriveFolderUrl);
    if (!safeUrl) {
        throw new Error("Enter a valid Google Drive folder link first.");
    }

    if (!/(drive\.google\.com)/i.test(safeUrl)) {
        throw new Error("Use a Google Drive folder URL.");
    }

    const safeTaskTopic = String(taskTopicTitle || "").trim();
    if (!safeTaskTopic) {
        throw new Error("Open a task-topic page before saving Google Drive link.");
    }

    const standardNumber = extractPrimaryStandardNumberFromRows(coerceArray(detailData?.standardDetails));
    const standardKey = buildTaskTopicSubmissionStandardKey(safeTaskTopic, standardNumber);

    const evidenceRows = await fetchEvidenceRowsEnsuringAllocation(projectId, studentEmail);
    const nextRows = upsertTaskTopicSubmissionEvidenceRows(evidenceRows, standardKey, {
        googleDriveProjectFolderUrl: safeUrl
    });
    await saveEvidenceRows(projectId, studentEmail, nextRows);
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

function deriveInitialsFromEmail(value) {
    const raw = String(value || "").trim().toLowerCase();
    const localPart = raw.includes("@") ? raw.split("@")[0] : raw;
    const parts = localPart
        .split(/[^a-z0-9]+/)
        .map((part) => part.trim())
        .filter(Boolean);

    if (!parts.length) {
        return "xx";
    }

    if (parts.length === 1) {
        const token = parts[0];
        return (token.slice(0, 2) || "xx").toLowerCase();
    }

    return `${parts[0][0] || "x"}${parts[parts.length - 1][0] || "x"}`.toLowerCase();
}

function deriveDisplayNameFromEmail(value) {
    const raw = String(value || "").trim().toLowerCase();
    const localPart = raw.includes("@") ? raw.split("@")[0] : raw;
    const parts = localPart
        .split(/[^a-z0-9]+/)
        .map((part) => part.trim())
        .filter(Boolean);

    if (!parts.length) {
        return "Student";
    }

    return parts
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function parseDecompositionStepsText(value) {
    const seen = new Set();
    return String(value || "")
        .split(/\r?\n/)
        .map((line) => line.replace(/^[\-*\d\.)\s]+/, "").trim())
        .filter(Boolean)
        .filter((line) => {
            const key = line.toLowerCase();
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        })
        .slice(0, 30);
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
    const keywordMatchedTopicKey = inferDigitalOutcomeTopicKeyFromTitle(`${taskTopicTitle} ${taskTopicShortName}`);
    const isProjectManagementTopic = taskTopicTitle.toLowerCase().includes("project management")
        || normalizedTaskTopicShortName.includes("project management")
        || normalizedDerivedShortName.includes("project management");

    // Keep Project Management task-topic cards focused on card content.
    // Submission tracking is available on the main Assessment Task page.
    if (isProjectManagementTopic) {
        panelHost.innerHTML = "";
        return;
    }

    const isAssetVersionControlTopic = taskTopicTitle.toLowerCase().includes("asset management")
        || taskTopicTitle.toLowerCase().includes("version control")
        || normalizedTaskTopicShortName.includes("asset management")
        || normalizedTaskTopicShortName.includes("version control")
        || normalizedDerivedShortName.includes("asset management")
        || normalizedDerivedShortName.includes("version control");
    const isDecompositionTopic = taskTopicTitle.toLowerCase().includes("decompos")
        || normalizedTaskTopicShortName.includes("decompos")
        || normalizedDerivedShortName.includes("decompos");
    const isDigitalOutcomeTopic = taskTopicTitle.toLowerCase().includes("digital outcome")
        || normalizedTaskTopicShortName.includes("digital outcome")
        || normalizedDerivedShortName.includes("digital outcome")
        || isDigitalOutcomeTargetAudienceCriterion(taskTopicTitle, taskTopicShortName || deriveTaskShortName(taskTopicTitle))
        || isDigitalOutcomeDevelopmentToolsCriterion(taskTopicTitle, taskTopicShortName || deriveTaskShortName(taskTopicTitle))
        || isDigitalOutcomeSuccessCriteriaCriterion(taskTopicTitle, taskTopicShortName || deriveTaskShortName(taskTopicTitle))
        || Boolean(keywordMatchedTopicKey);
    const isMediaAssetWorkflowTopic = isAssetVersionControlTopic && !isProjectManagementTopic;
    const isTrackedWorkflowTopic = isProjectManagementTopic || isMediaAssetWorkflowTopic;

    if (isTeacher) {
        const students = Array.isArray(interestData?.students) ? interestData.students : [];
        if (!students.length) {
            panelHost.innerHTML = `<p class="task-topic-submission-note">No allocated students yet. Add or confirm a student first, then evidence submission statuses will appear here.</p>`;
            return;
        }

        const trelloConnectionByEmail = new Map();
        if (isProjectManagementTopic) {
            const emails = students
                .map((student) => String(student?.email || "").trim().toLowerCase())
                .filter(Boolean);
            if (emails.length) {
                try {
                    const response = await fetch(`/api/integrations/trello/connections?emails=${encodeURIComponent(emails.join(","))}`, {
                        headers: buildWriteHeaders()
                    });
                    if (response.ok) {
                        const payload = await response.json().catch(() => ({}));
                        const rows = Array.isArray(payload?.connections) ? payload.connections : [];
                        rows.forEach((row) => {
                            const email = String(row?.email || "").trim().toLowerCase();
                            if (!email) return;
                            trelloConnectionByEmail.set(email, Boolean(row?.connected));
                        });
                    }
                } catch (_error) {
                    // Fallback for environments without the bulk endpoint yet.
                    await Promise.all(emails.map(async (studentEmail) => {
                        try {
                            const statusResponse = await fetch("/api/integrations/trello/status", {
                                headers: { "x-user-email": studentEmail }
                            });
                            if (!statusResponse.ok) {
                                return;
                            }

                            const statusPayload = await statusResponse.json().catch(() => ({}));
                            trelloConnectionByEmail.set(studentEmail, Boolean(statusPayload?.connected));
                        } catch (_statusError) {
                            // Ignore individual lookup failures.
                        }
                    }));
                }
            }
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
                    name: deriveDisplayNameFromEmail(studentEmail),
                    acknowledged: Boolean(submission.haparaAcknowledged),
                    submittedAt: submission.haparaSubmittedAt || submission.submittedAt || "",
                    googleSlidesUrl: toSafeExternalUrl(submission.googleSlidesUrl || submission.evidenceLink),
                    trelloCardUrl: submission.trelloCardUrl || "",
                    trelloConnected: Boolean(trelloConnectionByEmail.get(studentEmail)),
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
                return !String(row.trelloCardUrl || "").trim() && !row.trelloConnected;
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
            panelHost.innerHTML = `<p class="task-topic-submission-note">No student records are ready for evidence submission tracking yet.</p>`;
            return;
        }

        panelHost.innerHTML = `
            <div class="task-topic-submission-teacher-panel">
                <p class="task-topic-submission-note">Students submit evidence for this task topic. This panel tracks who has submitted evidence and linked their work.</p>
                <div class="task-topic-submission-meta">
                    <p><strong>Submitted:</strong> ${rows.filter((row) => row.acknowledged).length} of ${rows.length}</p>
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
                            <span class="task-topic-teacher-status-email">${escapeHtml(row.name)}</span>
                            <span class="task-topic-teacher-status-email">${escapeHtml(row.email)}</span>
                            <span class="task-topic-teacher-status-pill ${row.acknowledged ? "is-acknowledged" : "is-pending"}">${row.acknowledged ? "Submitted evidence" : "Not submitted"}</span>
                            <span class="task-topic-teacher-status-doc">${escapeHtml(row.docRef || "No document reference")}</span>
                            ${isDigitalOutcomeTopic
                                ? (row.googleSlidesUrl
                                    ? `<a class="task-topic-teacher-status-trello" href="${escapeHtml(row.googleSlidesUrl)}" target="_blank" rel="noreferrer">Open Google Slides</a>`
                                    : `<span class="task-topic-teacher-status-trello task-topic-teacher-status-trello-missing">No Google Slides link</span>`
                                )
                                : ""
                            }
                            ${isProjectManagementTopic
                                ? (row.trelloCardUrl
                                    ? `<a class="task-topic-teacher-status-trello" href="${escapeHtml(row.trelloCardUrl)}" target="_blank" rel="noreferrer">Open Trello Card</a>`
                                    : (row.trelloConnected
                                        ? `<span class="task-topic-teacher-status-trello">Trello connected</span>`
                                        : `<span class="task-topic-teacher-status-trello task-topic-teacher-status-trello-missing">No Trello card linked</span>`
                                    )
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
                            <span class="task-topic-teacher-status-time">Submitted: ${escapeHtml(formatSubmissionTimestamp(row.submittedAt))}</span>
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
                        quoteCsv(row.trelloCardUrl || row.trelloConnected ? "yes" : "no"),
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
    const haparaSpaceName = String(submission.haparaLocation || "").trim();
    const haparaClassDriveUrl = String(submission.haparaDriveClassUrl || "").trim();
    const acknowledged = Boolean(submission.haparaAcknowledged);
    const acknowledgedAt = submission.haparaSubmittedAt || submission.submittedAt || "";
    const currentDocRef = String(submission.haparaDocumentRef || "").trim();
    const currentGoogleSlidesUrl = toSafeExternalUrl(submission.googleSlidesUrl || submission.evidenceLink);
    const storedSyncEntry = readStoredTaskTopicSlideSyncEntry(projectId, email, taskTopicTitle, taskTopicShortName);
    let syncedGoogleSlidesUrl = storedSyncEntry.url || currentGoogleSlidesUrl;
    let syncedGoogleSlidesSavedAt = String(storedSyncEntry.savedAt || "").trim();
    const currentTrelloCardUrl = toSafeTrelloCardUrl(submission.trelloCardUrl);
    const currentMediaAssetFolderUrl = toSafeExternalUrl(submission.mediaAssetFolderUrl);
    const currentOneDriveProjectFolderUrl = toSafeExternalUrl(submission.mediaAssetFolderUrl);
    const currentMediaReviewUrl = toSafeExternalUrl(submission.mediaReviewUrl);
    const currentDecompositionSteps = Array.isArray(submission.decompositionSteps) ? submission.decompositionSteps : [];
    const decompositionTextValue = currentDecompositionSteps.join("\n");
    const todayNz = getNzDateKey();
    const studentInitials = deriveInitialsFromEmail(email);
    const mediaFileExample = `client-project_asset-type_v03_${todayNz}_${studentInitials}.ext`;
    const hasLoggedToday = isProjectManagementTopic
        ? String(submission.trelloLastLogDate || "").trim() === todayNz
        : isMediaAssetWorkflowTopic
            ? String(submission.mediaVersionLogDate || "").trim() === todayNz
            : false;

    if (isDigitalOutcomeTopic) {
        const processAssessmentFolderUrl = await fetchStudentProcessAssessmentFolderUrl();
        const isTargetAudienceTopic = isDigitalOutcomeTargetAudienceCriterion(taskTopicTitle, taskTopicShortName || deriveTaskShortName(taskTopicTitle))
            || keywordMatchedTopicKey === "target-audience";
        const isDevelopmentToolsTopic = isDigitalOutcomeDevelopmentToolsCriterion(taskTopicTitle, taskTopicShortName || deriveTaskShortName(taskTopicTitle))
            || keywordMatchedTopicKey === "development-tools";
        const isSuccessCriteriaTopic = isDigitalOutcomeSuccessCriteriaCriterion(taskTopicTitle, taskTopicShortName || deriveTaskShortName(taskTopicTitle))
            || keywordMatchedTopicKey === "success-criteria";
        const syncTopicLabel = isTargetAudienceTopic
            ? DIGITAL_OUTCOME_TARGET_AUDIENCE_TITLE
            : (isDevelopmentToolsTopic
                ? DIGITAL_OUTCOME_DEVELOPMENT_TOOLS_TITLE
                : (isSuccessCriteriaTopic ? DIGITAL_OUTCOME_SUCCESS_CRITERIA_TITLE : "Digital Outcome: Description"));
        if (!syncedGoogleSlidesUrl) {
            const topicMatch = await findProcessAssessmentSlideMatch(syncTopicLabel);
            if (topicMatch.fileUrl) {
                syncedGoogleSlidesUrl = topicMatch.fileUrl;
                if (!syncedGoogleSlidesSavedAt) {
                    syncedGoogleSlidesSavedAt = topicMatch.modifiedTime;
                }
                writeStoredTaskTopicSlideSyncLink(projectId, email, taskTopicTitle, taskTopicShortName, syncedGoogleSlidesUrl);
            }
        }
        if (!syncedGoogleSlidesSavedAt) {
            syncedGoogleSlidesSavedAt = String(submission.haparaSubmittedAt || submission.submittedAt || "").trim();
        }

        panelHost.innerHTML = `
            <div class="task-topic-sync-only-panel" aria-label="Digital Outcome sync links">
                <p class="task-topic-submission-note task-topic-sync-only-note">Showing synced Google links for <strong>${escapeHtml(syncTopicLabel)}</strong>.</p>
                ${processAssessmentFolderUrl
                    ? `<p class="task-topic-sync-folder-link"><a href="${escapeHtml(processAssessmentFolderUrl)}" target="_blank" rel="noreferrer">Open Process Assessment folder in Google Drive</a></p>`
                    : ""
                }
                ${syncedGoogleSlidesUrl
                    ? `
                        <ul class="task-topic-sync-link-list" aria-label="Synced slide links">
                            <li class="task-topic-sync-link-item">
                                <div class="task-topic-sync-link-main">
                                    <p class="task-topic-sync-link-title">${escapeHtml(syncTopicLabel)} slide deck</p>
                                    <a href="${escapeHtml(syncedGoogleSlidesUrl)}" target="_blank" rel="noreferrer">${escapeHtml(syncedGoogleSlidesUrl)}</a>
                                </div>
                                <div class="task-topic-sync-link-meta">
                                    <span class="task-topic-sync-created-label">Created Date</span>
                                    <span class="task-topic-sync-created-value">${escapeHtml(formatSyncCreatedDate(syncedGoogleSlidesSavedAt))}</span>
                                </div>
                            </li>
                        </ul>
                    `
                    : `<p class="task-topic-submission-note">No synced ${escapeHtml(syncTopicLabel)} slide link yet. Open Template Library and use the Digital Outcome template first.</p>`
                }
            </div>
        `;
        return;
    }

    panelHost.innerHTML = `
        <form id="task-topic-submission-form" class="task-topic-submission-form" novalidate>
            <p class="task-topic-submission-note">Link your evidence below, then submit so your teacher can verify completion.</p>
            <p class="task-topic-submission-note">When all parts are ready, go to <a href="/hapara-submission.html" target="_blank" rel="noreferrer">Hapara Submission Checklist</a> to submit each item in one place.</p>

            <label class="task-topic-submission-label" for="task-topic-hapara-doc-ref">Evidence Note (Optional)</label>
            <input id="task-topic-hapara-doc-ref" class="task-topic-submission-input" type="text" placeholder="Example: Slide deck draft 2" value="${escapeHtml(currentDocRef)}">

            ${isDigitalOutcomeTopic ? `
                <p class="task-topic-submission-note task-topic-google-sync-note"><strong>Synced Slide:</strong> <span id="task-topic-google-slides-sync-reference">${syncedGoogleSlidesUrl ? `<a href="${escapeHtml(syncedGoogleSlidesUrl)}" target="_blank" rel="noreferrer">${escapeHtml(syncedGoogleSlidesUrl)}</a>` : "No synced slide yet. Open Template Library and click Use Template to link your personal slide copy."}</span></p>
                <label class="task-topic-submission-label" for="task-topic-google-slides-url">Digital Outcome Description - Google Slides Link</label>
                <input id="task-topic-google-slides-url" class="task-topic-submission-input" type="url" placeholder="https://docs.google.com/presentation/..." value="${escapeHtml(currentGoogleSlidesUrl)}" required>
                <p class="task-topic-submission-note">Create a Google Slideshow and include at least one slide that clearly describes the digital outcome.</p>
                <p class="task-topic-submission-note">For a clear intent statement, explain: what the idea is, why it should exist, who it is for, and what success looks like.</p>
            ` : ""}

            ${isProjectManagementTopic ? `
                <label class="task-topic-submission-label" for="task-topic-trello-card-url">Trello Card or Board Link</label>
                <input id="task-topic-trello-card-url" class="task-topic-submission-input" type="url" placeholder="https://trello.com/c/xxxx1234 or /b/xxxx/board-name" value="${escapeHtml(currentTrelloCardUrl)}" required>
                <p class="task-topic-submission-note">Project Management evidence requires your Trello card or board link. This gives your teacher one-click access for marking.</p>

                <label class="task-topic-submission-label" for="task-topic-onedrive-folder-url">OneDrive Project Folder Link</label>
                <input id="task-topic-onedrive-folder-url" class="task-topic-submission-input" type="url" placeholder="https://onedrive.live.com/... or school OneDrive/SharePoint folder" value="${escapeHtml(currentOneDriveProjectFolderUrl)}" required>
                <p class="task-topic-submission-note">Create your project folder inside OneDrive Documents and link that folder here so DTECH HUB can track your version-control location.</p>
                <p class="task-topic-submission-note task-topic-onedrive-warning">Important: Downloads and Videos folders are not backed up to OneDrive. Save all project files in your OneDrive Documents project folder.</p>

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

                <div class="task-topic-media-naming-panel" role="note" aria-label="Media naming convention guide">
                    <p class="task-topic-media-naming-title">File Naming Convention</p>
                    <p class="task-topic-media-naming-text">Use this format so assets sort cleanly and versions are easy to find:</p>
                    <p class="task-topic-media-naming-format">client-project_asset-type_v##_YYYY-MM-DD_initials.ext</p>
                    <ul class="task-topic-media-naming-list">
                        <li>Use two digits for version numbers: v01, v02, v03.</li>
                        <li>Use ISO date format: YYYY-MM-DD.</li>
                        <li>Keep names lowercase and use hyphens instead of spaces.</li>
                        <li>Store final exports in a final-exports folder inside your master asset folder.</li>
                    </ul>
                    <p class="task-topic-media-naming-example">Example: ${escapeHtml(mediaFileExample)}</p>
                </div>

                <div class="task-topic-trello-log-box">
                    <p class="task-topic-submission-note ${hasLoggedToday ? "task-topic-submission-note-success" : "task-topic-submission-note-warning"}">${hasLoggedToday ? "Version log complete for today." : "Daily prompt: add a version log entry for your media updates now."}</p>
                    <label class="task-topic-submission-label" for="task-topic-media-log-note">Today's Version Log</label>
                    <textarea id="task-topic-media-log-note" class="task-topic-submission-input task-topic-submission-textarea" placeholder="What asset changed today? Which version/file name did you produce? What feedback or next revision is planned?"></textarea>
                    <button type="button" class="detail-action" id="task-topic-save-media-log">Save Today's Version Log</button>
                    <p class="task-topic-submission-status" id="task-topic-media-log-status" aria-live="polite"></p>
                </div>
            ` : ""}

            ${isDecompositionTopic ? `
                <div class="task-topic-decomp-box">
                    <p class="task-topic-submission-note">Plan your decomposition steps here. Save in DTECH first, then push the steps to your Trello To Do list.</p>
                    <label class="task-topic-submission-label" for="task-topic-decomp-steps">Decomposition Steps (one per line)</label>
                    <textarea id="task-topic-decomp-steps" class="task-topic-submission-input task-topic-submission-textarea" placeholder="Break the assessment into clear, checkable steps...">${escapeHtml(decompositionTextValue)}</textarea>

                    <label class="task-topic-submission-label" for="task-topic-decomp-board">Trello Board</label>
                    <select id="task-topic-decomp-board" class="task-topic-submission-input">
                        <option value="">Select board</option>
                    </select>

                    <label class="task-topic-submission-label" for="task-topic-decomp-list">Trello To Do List</label>
                    <select id="task-topic-decomp-list" class="task-topic-submission-input">
                        <option value="">Select list</option>
                    </select>

                    <div class="task-topic-submission-actions">
                        <button type="button" class="detail-action detail-action-secondary" id="task-topic-save-decomp-plan">Save Decomposition Plan</button>
                        <button type="button" class="detail-action" id="task-topic-push-decomp-trello">Push Steps to Trello To Do</button>
                    </div>
                    <p class="task-topic-submission-status" id="task-topic-decomp-status" aria-live="polite"></p>
                </div>
            ` : ""}

            <div class="task-topic-submission-actions">
                <button type="submit" class="detail-action">Submit Evidence Link</button>
                <button type="button" class="detail-action detail-action-secondary" id="task-topic-clear-acknowledgement">Clear Submission</button>
            </div>
            <p class="task-topic-submission-status" id="task-topic-submission-status" aria-live="polite"></p>
        </form>
        <div class="task-topic-submission-meta">
            <p><strong>Status:</strong> <span id="task-topic-ack-status">${acknowledged ? "Submitted evidence" : "Waiting for submission"}</span></p>
            <p><strong>Submitted At:</strong> <span id="task-topic-last-submitted">${escapeHtml(formatSubmissionTimestamp(acknowledgedAt))}</span></p>
            <p><strong>Evidence Note:</strong> <span id="task-topic-doc-reference">${escapeHtml(currentDocRef || "Not provided")}</span></p>
            ${isDigitalOutcomeTopic
                ? `<p><strong>Description - Google Slides:</strong> <span id="task-topic-google-slides-reference">${currentGoogleSlidesUrl ? `<a href="${escapeHtml(currentGoogleSlidesUrl)}" target="_blank" rel="noreferrer">${escapeHtml(currentGoogleSlidesUrl)}</a>` : "Not linked"}</span></p>`
                : ""
            }
            ${isProjectManagementTopic
                ? `<p><strong>Trello Card:</strong> <span id="task-topic-trello-reference">${currentTrelloCardUrl ? `<a href="${escapeHtml(currentTrelloCardUrl)}" target="_blank" rel="noreferrer">${escapeHtml(currentTrelloCardUrl)}</a>` : "Not linked"}</span></p>`
                : ""
            }
            ${isProjectManagementTopic
                ? `<p><strong>Last Trello Log:</strong> <span id="task-topic-trello-last-log">${escapeHtml(formatSubmissionTimestamp(submission.trelloLastLogAt || ""))}</span></p>`
                : ""
            }
            ${isProjectManagementTopic
                ? `<p><strong>OneDrive Project Folder:</strong> <span id="task-topic-onedrive-reference">${currentOneDriveProjectFolderUrl ? `<a href="${escapeHtml(currentOneDriveProjectFolderUrl)}" target="_blank" rel="noreferrer">${escapeHtml(currentOneDriveProjectFolderUrl)}</a>` : "Not linked"}</span></p>`
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
            ${isDecompositionTopic
                ? `<p><strong>Decomposition Plan Steps:</strong> <span id="task-topic-decomp-count">${currentDecompositionSteps.length}</span></p>`
                : ""
            }
            ${isDecompositionTopic
                ? `<p><strong>Last Trello To Do Push:</strong> <span id="task-topic-decomp-last-push">${escapeHtml(formatSubmissionTimestamp(submission.decompositionLastPushAt || ""))}</span></p>`
                : ""
            }
        </div>
    `;

    const form = panelHost.querySelector("#task-topic-submission-form");
    const clearAckButton = panelHost.querySelector("#task-topic-clear-acknowledgement");
    const docRefInput = panelHost.querySelector("#task-topic-hapara-doc-ref");
    const googleSlidesInput = panelHost.querySelector("#task-topic-google-slides-url");
    const trelloCardInput = panelHost.querySelector("#task-topic-trello-card-url");
    const trelloBoardSelect = panelHost.querySelector("#task-topic-trello-board");
    const trelloListSelect = panelHost.querySelector("#task-topic-trello-list");
    const trelloCreateButton = panelHost.querySelector("#task-topic-create-trello-card");
    const trelloCreateStatusHost = panelHost.querySelector("#task-topic-trello-create-status");
    const trelloLogNoteInput = panelHost.querySelector("#task-topic-trello-log-note");
    const trelloLogButton = panelHost.querySelector("#task-topic-send-trello-log");
    const trelloLogStatusHost = panelHost.querySelector("#task-topic-trello-log-status");
    const oneDriveFolderInput = panelHost.querySelector("#task-topic-onedrive-folder-url");
    const mediaAssetInput = panelHost.querySelector("#task-topic-media-asset-url");
    const mediaReviewInput = panelHost.querySelector("#task-topic-media-review-url");
    const mediaLogNoteInput = panelHost.querySelector("#task-topic-media-log-note");
    const mediaLogButton = panelHost.querySelector("#task-topic-save-media-log");
    const mediaLogStatusHost = panelHost.querySelector("#task-topic-media-log-status");
    const decompStepsInput = panelHost.querySelector("#task-topic-decomp-steps");
    const decompBoardSelect = panelHost.querySelector("#task-topic-decomp-board");
    const decompListSelect = panelHost.querySelector("#task-topic-decomp-list");
    const decompSaveButton = panelHost.querySelector("#task-topic-save-decomp-plan");
    const decompPushButton = panelHost.querySelector("#task-topic-push-decomp-trello");
    const decompStatusHost = panelHost.querySelector("#task-topic-decomp-status");
    const statusHost = panelHost.querySelector("#task-topic-submission-status");
    const ackStatusHost = panelHost.querySelector("#task-topic-ack-status");
    const lastSubmittedHost = panelHost.querySelector("#task-topic-last-submitted");
    const docRefHost = panelHost.querySelector("#task-topic-doc-reference");
    const googleSlidesRefHost = panelHost.querySelector("#task-topic-google-slides-reference");
    const googleSlidesSyncRefHost = panelHost.querySelector("#task-topic-google-slides-sync-reference");
    const trelloRefHost = panelHost.querySelector("#task-topic-trello-reference");
    const trelloLastLogHost = panelHost.querySelector("#task-topic-trello-last-log");
    const oneDriveRefHost = panelHost.querySelector("#task-topic-onedrive-reference");
    const mediaAssetRefHost = panelHost.querySelector("#task-topic-media-asset-reference");
    const mediaReviewRefHost = panelHost.querySelector("#task-topic-media-review-reference");
    const mediaLastLogHost = panelHost.querySelector("#task-topic-media-last-log");
    const decompCountHost = panelHost.querySelector("#task-topic-decomp-count");
    const decompLastPushHost = panelHost.querySelector("#task-topic-decomp-last-push");
    const updateMeta = (isAcknowledged, timestamp) => {
        if (ackStatusHost) {
            ackStatusHost.textContent = isAcknowledged ? "Submitted evidence" : "Waiting for submission";
        }

        if (lastSubmittedHost) {
            lastSubmittedHost.textContent = formatSubmissionTimestamp(timestamp);
        }

        if (docRefHost) {
            const value = String(docRefInput?.value || "").trim();
            docRefHost.textContent = value || "Not provided";
        }

        if (googleSlidesRefHost) {
            const safeSlidesUrl = toSafeExternalUrl(googleSlidesInput?.value || "");
            if (safeSlidesUrl) {
                googleSlidesRefHost.innerHTML = `<a href="${escapeHtml(safeSlidesUrl)}" target="_blank" rel="noreferrer">${escapeHtml(safeSlidesUrl)}</a>`;
            } else {
                googleSlidesRefHost.textContent = "Not linked";
            }
        }

        if (googleSlidesSyncRefHost) {
            const safeSlidesUrl = toSafeExternalUrl(googleSlidesInput?.value || "");
            if (safeSlidesUrl) {
                syncedGoogleSlidesUrl = safeSlidesUrl;
                writeStoredTaskTopicSlideSyncLink(projectId, email, taskTopicTitle, taskTopicShortName, safeSlidesUrl);
                googleSlidesSyncRefHost.innerHTML = `<a href="${escapeHtml(syncedGoogleSlidesUrl)}" target="_blank" rel="noreferrer">${escapeHtml(syncedGoogleSlidesUrl)}</a>`;
            } else if (syncedGoogleSlidesUrl) {
                googleSlidesSyncRefHost.innerHTML = `<a href="${escapeHtml(syncedGoogleSlidesUrl)}" target="_blank" rel="noreferrer">${escapeHtml(syncedGoogleSlidesUrl)}</a>`;
            } else {
                googleSlidesSyncRefHost.textContent = "No synced slide yet. Open Template Library and click Use Template to link your personal slide copy.";
            }
        }

        if (trelloRefHost) {
            const safeCardUrl = toSafeTrelloCardUrl(trelloCardInput?.value || "");
            if (safeCardUrl) {
                trelloRefHost.innerHTML = `<a href="${escapeHtml(safeCardUrl)}" target="_blank" rel="noreferrer">${escapeHtml(safeCardUrl)}</a>`;
            } else {
                trelloRefHost.textContent = "Not linked";
            }
        }

        if (oneDriveRefHost) {
            const safeOneDriveUrl = toSafeExternalUrl(oneDriveFolderInput?.value || "");
            if (safeOneDriveUrl) {
                oneDriveRefHost.innerHTML = `<a href="${escapeHtml(safeOneDriveUrl)}" target="_blank" rel="noreferrer">${escapeHtml(safeOneDriveUrl)}</a>`;
            } else {
                oneDriveRefHost.textContent = "Not linked";
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

    googleSlidesInput?.addEventListener("input", () => {
        const safeSlidesUrl = toSafeExternalUrl(googleSlidesInput?.value || "");
        if (safeSlidesUrl) {
            syncedGoogleSlidesUrl = safeSlidesUrl;
            writeStoredTaskTopicSlideSyncLink(projectId, email, taskTopicTitle, taskTopicShortName, safeSlidesUrl);
        }
        updateMeta(acknowledged, acknowledgedAt);
    });

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

    const setDecompStatus = (message, isError = false) => {
        if (!decompStatusHost) return;
        decompStatusHost.textContent = String(message || "");
        decompStatusHost.classList.toggle("is-error", Boolean(isError));
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
                setTrelloLogStatus("Add a valid Trello card or board link first.", true);
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

    if (isDecompositionTopic && decompBoardSelect && decompListSelect) {
        try {
            const boardsResponse = await fetch("/api/integrations/trello/boards", { headers: buildWriteHeaders() });
            if (boardsResponse.ok) {
                const boards = await boardsResponse.json().catch(() => []);
                const boardOptions = (Array.isArray(boards) ? boards : [])
                    .map((board) => `<option value="${escapeHtml(board.id)}">${escapeHtml(board.name || board.id)}</option>`)
                    .join("");
                decompBoardSelect.innerHTML = `<option value="">Select board</option>${boardOptions}`;
            } else {
                setDecompStatus("Connect Trello first (Student Work page), then reload.", true);
            }
        } catch (_error) {
            setDecompStatus("Could not load Trello boards right now.", true);
        }

        decompBoardSelect.addEventListener("change", async () => {
            const boardId = String(decompBoardSelect.value || "").trim();
            decompListSelect.innerHTML = `<option value="">Loading lists...</option>`;
            if (!boardId) {
                decompListSelect.innerHTML = `<option value="">Select list</option>`;
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
                decompListSelect.innerHTML = `<option value="">Select list</option>${listOptions}`;
            } catch (_error) {
                decompListSelect.innerHTML = `<option value="">Select list</option>`;
                setDecompStatus("Could not load Trello lists.", true);
            }
        });

        decompSaveButton?.addEventListener("click", async () => {
            const decompositionSteps = parseDecompositionStepsText(decompStepsInput?.value || "");
            if (!decompositionSteps.length) {
                setDecompStatus("Add at least one decomposition step before saving.", true);
                return;
            }

            if (decompSaveButton) decompSaveButton.disabled = true;
            setDecompStatus("Saving decomposition plan...");
            try {
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
                    mediaAssetFolderUrl: submission.mediaAssetFolderUrl,
                    mediaReviewUrl: submission.mediaReviewUrl,
                    mediaVersionLogDate: submission.mediaVersionLogDate,
                    mediaVersionLogAt: submission.mediaVersionLogAt,
                    mediaVersionLogNote: submission.mediaVersionLogNote,
                    decompositionSteps,
                    decompositionLastPushAt: submission.decompositionLastPushAt,
                    decompositionLastPushCount: submission.decompositionLastPushCount,
                    reviewStatus: submission.reviewStatus
                });

                await saveEvidenceRows(projectId, email, nextRows);
                evidenceRows = nextRows;
                submission.decompositionSteps = decompositionSteps;
                if (decompCountHost) {
                    decompCountHost.textContent = String(decompositionSteps.length);
                }
                setDecompStatus(`Saved ${decompositionSteps.length} decomposition step${decompositionSteps.length === 1 ? "" : "s"}.`);
            } catch (_error) {
                setDecompStatus("Could not save decomposition plan right now.", true);
            } finally {
                if (decompSaveButton && decompSaveButton.isConnected) decompSaveButton.disabled = false;
            }
        });

        decompPushButton?.addEventListener("click", async () => {
            const listId = String(decompListSelect.value || "").trim();
            const decompositionSteps = parseDecompositionStepsText(decompStepsInput?.value || "");

            if (!listId) {
                setDecompStatus("Select a Trello To Do list first.", true);
                return;
            }
            if (!decompositionSteps.length) {
                setDecompStatus("Add at least one decomposition step before pushing.", true);
                return;
            }

            if (decompPushButton) decompPushButton.disabled = true;
            setDecompStatus("Pushing decomposition steps to Trello To Do...");

            let createdCount = 0;
            const failedSteps = [];
            try {
                for (const step of decompositionSteps) {
                    const cardName = `${detailData?.title || "Assessment Task"}: ${step}`;
                    const cardDesc = [
                        `Student: ${email}`,
                        `Task Topic: ${taskTopicTitle}`,
                        "",
                        "Created from DTECH Decomposition Planner"
                    ].join("\n");

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
                        failedSteps.push(step);
                        continue;
                    }
                    createdCount += 1;
                }

                const nowIso = new Date().toISOString();
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
                    mediaAssetFolderUrl: submission.mediaAssetFolderUrl,
                    mediaReviewUrl: submission.mediaReviewUrl,
                    mediaVersionLogDate: submission.mediaVersionLogDate,
                    mediaVersionLogAt: submission.mediaVersionLogAt,
                    mediaVersionLogNote: submission.mediaVersionLogNote,
                    decompositionSteps,
                    decompositionLastPushAt: createdCount > 0 ? nowIso : submission.decompositionLastPushAt,
                    decompositionLastPushCount: createdCount,
                    reviewStatus: submission.reviewStatus
                });

                await saveEvidenceRows(projectId, email, nextRows);
                evidenceRows = nextRows;
                submission.decompositionSteps = decompositionSteps;
                if (createdCount > 0) {
                    submission.decompositionLastPushAt = nowIso;
                    submission.decompositionLastPushCount = createdCount;
                }

                if (decompCountHost) {
                    decompCountHost.textContent = String(decompositionSteps.length);
                }
                if (decompLastPushHost && createdCount > 0) {
                    decompLastPushHost.textContent = formatSubmissionTimestamp(nowIso);
                }

                if (failedSteps.length) {
                    setDecompStatus(`Created ${createdCount} card(s). ${failedSteps.length} step(s) could not be created.`, true);
                } else {
                    setDecompStatus(`Created ${createdCount} Trello To Do card${createdCount === 1 ? "" : "s"}.`);
                }
            } catch (_error) {
                setDecompStatus("Could not push decomposition steps to Trello right now.", true);
            } finally {
                if (decompPushButton && decompPushButton.isConnected) decompPushButton.disabled = false;
            }
        });
    }

    form?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const docReference = String(docRefInput?.value || "").trim();

        const trelloCardUrl = toSafeTrelloCardUrl(trelloCardInput?.value || "");
        if (isProjectManagementTopic && !trelloCardUrl) {
            setStatus("Project Management requires a valid Trello card link before acknowledging.", true);
            return;
        }

        const googleSlidesUrl = toSafeExternalUrl(googleSlidesInput?.value || "");
        if (isDigitalOutcomeTopic && !googleSlidesUrl) {
            setStatus("Digital Outcome Description requires a valid Google Slides link before acknowledging.", true);
            return;
        }

        const oneDriveProjectFolderUrl = toSafeExternalUrl(oneDriveFolderInput?.value || "");
        if (isProjectManagementTopic && !oneDriveProjectFolderUrl) {
            setStatus("Project Management requires a valid OneDrive project folder link before acknowledging.", true);
            return;
        }

        const mediaAssetFolderUrl = oneDriveProjectFolderUrl || toSafeExternalUrl(mediaAssetInput?.value || "");
        const mediaReviewUrl = toSafeExternalUrl(mediaReviewInput?.value || "");
        if (isMediaAssetWorkflowTopic && !mediaAssetFolderUrl) {
            setStatus("Asset Management requires a valid master asset folder link before acknowledging.", true);
            return;
        }

        const submitButton = form.querySelector("button[type='submit']");
        if (submitButton) {
            submitButton.disabled = true;
        }
        setStatus("Saving evidence submission...");

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
            googleSlidesUrl,
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
            submission.googleSlidesUrl = googleSlidesUrl;
            submission.trelloCardUrl = trelloCardUrl;
            submission.mediaAssetFolderUrl = mediaAssetFolderUrl;
            submission.mediaReviewUrl = mediaReviewUrl;
            submission.submittedAt = submittedAt;
            submission.reviewStatus = "pending";

            updateMeta(true, submittedAt);
            setStatus("Saved. Your evidence submission has been recorded.");
        } catch (error) {
            setStatus(error?.message || "Could not save your evidence submission right now.", true);
        } finally {
            if (submitButton && submitButton.isConnected) {
                submitButton.disabled = false;
            }
        }
    });

    clearAckButton?.addEventListener("click", async () => {
        clearAckButton.disabled = true;
        setStatus("Clearing submission...");

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
            googleSlidesUrl: toSafeExternalUrl(googleSlidesInput?.value || ""),
            trelloCardUrl: toSafeTrelloCardUrl(trelloCardInput?.value || ""),
            trelloLastLogDate: submission.trelloLastLogDate,
            trelloLastLogAt: submission.trelloLastLogAt,
            trelloLastLogNote: submission.trelloLastLogNote,
            mediaAssetFolderUrl: toSafeExternalUrl(oneDriveFolderInput?.value || "") || toSafeExternalUrl(mediaAssetInput?.value || ""),
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
            submission.googleSlidesUrl = toSafeExternalUrl(googleSlidesInput?.value || "");
            updateMeta(false, "");
            setStatus("Submission cleared.");
        } catch (_error) {
            setStatus("Could not clear submission right now.", true);
        } finally {
            if (clearAckButton && clearAckButton.isConnected) {
                clearAckButton.disabled = false;
            }
        }
    });
}

async function renderEvidenceSidebar({ host, projectId, viewerEmail, studentEmail, standards, studentLabel = "Student", taskDefaultsByStandard = {}, detailData = null, taskTopic = "" }) {
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
    const triggerRow = host.querySelector("#detail-under-hero-actions") || section;
    const existingTriggerButton = host.querySelector("#evidence-sidebar-open");
    if (existingTriggerButton) {
        existingTriggerButton.remove();
    }
    if (triggerRow) {
        const triggerButton = document.createElement("button");
        triggerButton.type = "button";
        triggerButton.id = "evidence-sidebar-open";
        triggerButton.className = "detail-action evidence-sidebar-open-btn";
        triggerButton.textContent = "Open Task List";
        triggerRow.appendChild(triggerButton);
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

    const isSelfTaskListView = normalizeEmail(viewerEmail) === normalizeEmail(studentEmail);
    const contextSignals = [
        String(taskTopic || ""),
        String(detailData?.subjectStream || detailData?.subject_stream || detailData?.subject || ""),
        String(detailData?.type || ""),
        String(detailData?.title || "")
    ].join(" ").toUpperCase();
    const isDigitalMediaTaskContext = /(DIGITAL\s*MEDIA|MEDIA|FILM|VIDEO|AUDIO|MUSIC|PHOTOGRAPH|ANIMATION|GRAPHIC)/i.test(contextSignals);
    const secondarySystemLabel = isDigitalMediaTaskContext ? "Cloud Folder" : "GitHub";
    const digitalOutcomeTopicType = String(detailData?.type || "").trim();
    let digitalOutcomeAllocations = [];
    if (isSelfTaskListView) {
        try {
            const response = await fetch("/api/my-allocations", {
                headers: buildWriteHeaders()
            });
            if (response.ok) {
                const payload = await response.json().catch(() => ({}));
                const assessments = (Array.isArray(payload?.assessment_tasks) ? payload.assessment_tasks : [])
                    .map((item) => ({
                        id: String(item?.id || "").trim(),
                        name: String(item?.name || "Untitled").trim() || "Untitled",
                        topicType: String(item?.topic_type || "").trim(),
                        kind: "Assessment"
                    }));
                const projects = (Array.isArray(payload?.projects) ? payload.projects : [])
                    .map((item) => ({
                        id: String(item?.id || "").trim(),
                        name: String(item?.name || "Untitled").trim() || "Untitled",
                        topicType: String(item?.topic_type || "").trim(),
                        kind: "Project"
                    }));

                const byId = new Map();
                [...assessments, ...projects].forEach((item) => {
                    if (!item.id) return;
                    byId.set(item.id, item);
                });
                digitalOutcomeAllocations = Array.from(byId.values());
            }
        } catch (_error) {
            digitalOutcomeAllocations = [];
        }
    }
    const loadRowsForSidebar = async () => {
        if (isSelfTaskListView) {
            try {
                return await fetchMyEvidenceRows(projectId);
            } catch (error) {
                if (Number(error?.status || 0) !== 404) {
                    throw error;
                }
                return [];
            }
        }

        return fetchEvidenceRows(projectId, studentEmail);
    };

    const saveRowsForSidebar = async (rows) => {
        if (isSelfTaskListView) {
            try {
                await saveMyEvidenceRows(projectId, rows);
                return;
            } catch (error) {
                if (Number(error?.status || 0) !== 404) {
                    throw error;
                }
                await fetchEvidenceRowsEnsuringAllocation(projectId, studentEmail);
                await saveMyEvidenceRows(projectId, rows);
                return;
            }
        }

        await saveEvidenceRows(projectId, studentEmail, rows);
    };

    const state = evidenceRowsToMap(await loadRowsForSidebar().catch(() => []));
    standards.forEach((code) => {
        const hasExistingStandard = Object.prototype.hasOwnProperty.call(state, code);
        const shouldSeedDefaults = !hasExistingStandard || (!isSelfTaskListView && (!Array.isArray(state[code]) || !state[code].length));
        if (shouldSeedDefaults) {
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

        if (!isSelfTaskListView && String(code) === "91897") {
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
            const allStandards = Array.from(new Set([
                ...(Array.isArray(standards) ? standards : []),
                ...Object.keys(state)
            ]));
            await saveRowsForSidebar(evidenceMapToRows(state, allStandards));
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

    const inferStudentSystemConnections = () => {
        let trelloConnected = Boolean(toSafeTrelloCardUrl(readStoredTrelloCardLink(projectId, studentEmail)))
            || readStoredTrelloCardLibrary(projectId, studentEmail).length > 0;
        let githubConnected = false;
        let oneDriveConnected = false;
        let googleDriveConnected = false;
        let googleSlidesConnected = false;

        Object.values(state).forEach((steps) => {
            (Array.isArray(steps) ? steps : []).forEach((step) => {
                const text = String(step?.text || "").trim();
                if (!text) {
                    return;
                }

                const textLower = text.toLowerCase();
                if (text.startsWith("TRELLO_CARD_URL|")) {
                    const trelloUrl = toSafeTrelloCardUrl(text.slice("TRELLO_CARD_URL|".length).trim());
                    if (trelloUrl) {
                        trelloConnected = true;
                    }
                }

                if (textLower.includes("trello.com/")) {
                    trelloConnected = true;
                }

                if (/(github\.com|gist\.github\.com|raw\.githubusercontent\.com)/i.test(textLower)) {
                    githubConnected = true;
                }

                if (text.startsWith("GOOGLE_SLIDES_URL|")) {
                    const slidesUrl = toSafeExternalUrl(text.slice("GOOGLE_SLIDES_URL|".length).trim());
                    if (slidesUrl) {
                        googleSlidesConnected = true;
                    }
                }

                if (/(docs\.google\.com\/presentation)/i.test(textLower)) {
                    googleSlidesConnected = true;
                }

                if (text.startsWith("MEDIA_ASSET_FOLDER_URL|") || text.startsWith("MEDIA_REVIEW_URL|") || text.startsWith("ONEDRIVE_PROJECT_FOLDER_URL|")) {
                    oneDriveConnected = true;
                }

                if (text.startsWith("GOOGLE_DRIVE_PROJECT_FOLDER_URL|")) {
                    const driveUrl = toSafeExternalUrl(text.slice("GOOGLE_DRIVE_PROJECT_FOLDER_URL|".length).trim());
                    if (driveUrl) {
                        googleDriveConnected = true;
                    }
                }

                if (/(onedrive\.live\.com|1drv\.ms|sharepoint\.com|onedrive)/i.test(textLower)) {
                    oneDriveConnected = true;
                }

                if (/(drive\.google\.com)/i.test(textLower)) {
                    googleDriveConnected = true;
                }
            });
        });

        return {
            trelloConnected,
            githubConnected,
            oneDriveConnected,
            googleDriveConnected,
            googleSlidesConnected
        };
    };

    const hasSyncedSlideForTaskTopic = (taskTopicText) => {
        const safeTopic = String(taskTopicText || "").trim();
        const lookupEmail = normalizeEmail(studentEmail || viewerEmail || readStoredHubEmail());
        if (!safeTopic || !projectId || !lookupEmail) {
            return false;
        }

        const derivedShort = deriveTaskShortName(safeTopic);
        const withShort = readStoredTaskTopicSlideSyncEntry(projectId, lookupEmail, safeTopic, derivedShort);
        if (toSafeExternalUrl(withShort?.url || "")) {
            return true;
        }

        const byShort = readStoredTaskTopicSlideSyncEntryByShortName(projectId, lookupEmail, derivedShort);
        if (toSafeExternalUrl(byShort?.url || "")) {
            return true;
        }

        const withoutShort = readStoredTaskTopicSlideSyncEntry(projectId, lookupEmail, safeTopic, "");
        return Boolean(toSafeExternalUrl(withoutShort?.url || ""));
    };

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
        nextUrl.searchParams.set("taskList", "hide");
        if (Number.isFinite(Number(topicIndex)) && Number(topicIndex) > 0) {
            nextUrl.searchParams.set("taskTopicIndex", String(topicIndex));
        }

        // Close the sidebar first so users get immediate visual feedback.
        closeSidebar();
        window.setTimeout(() => {
            window.location.href = `${nextUrl.pathname}${nextUrl.search}`;
        }, 90);
    };

    const renderStepRows = (rowsHost, standardCode, levelFilter = "") => {
        const steps = Array.isArray(state[standardCode]) ? state[standardCode] : [];
        rowsHost.innerHTML = "";
        const systemConnections = inferStudentSystemConnections();

        const filtered = steps
            .map((step, index) => ({ step, index }))
            .filter(({ step }) => {
                if (!levelFilter) {
                    return true;
                }

                const level = getStepLevel(step?.text);
                return level === levelFilter;
            });

        if (String(standardCode) === "91897" && String(levelFilter || "").toLowerCase() === "achieved") {
            const subitemIndex = filtered.findIndex(({ step }) => isFeaturesRequirementSubitem(step?.text));
            const parentIndex = filtered.findIndex(({ step }) => isDecompositionParentStep(step?.text));
            if (subitemIndex >= 0 && parentIndex >= 0 && subitemIndex !== parentIndex + 1) {
                const [subitemRow] = filtered.splice(subitemIndex, 1);
                const insertAt = subitemIndex < parentIndex ? parentIndex : parentIndex + 1;
                filtered.splice(insertAt, 0, subitemRow);
            }
        }

        if (!filtered.length && levelFilter) {
            const empty = document.createElement("p");
            empty.className = "evidence-level-empty";
            empty.textContent = `No ${levelFilter.toLowerCase()} tasks yet.`;
            rowsHost.appendChild(empty);
            return;
        }

        let autoUpdated = false;

        filtered.forEach(({ step, index }) => {
            const row = document.createElement("div");
            row.className = "evidence-step-row";
            if (String(standardCode) === "91897" && String(levelFilter || "").toLowerCase() === "achieved" && isFeaturesRequirementSubitem(step?.text)) {
                row.classList.add("is-subitem");
            }

            const rowLevel = String(levelFilter || getStepLevel(step?.text)).trim().toLowerCase();
            const rowTaskText = stripStepLevel(step?.text).toLowerCase();
            const autoCompleteProjectManagementRow = String(standardCode) === "91897"
                && rowLevel === "achieved"
                && rowTaskText.includes("project management")
                && systemConnections.trelloConnected
                && systemConnections.githubConnected;
            const autoCompleteDigitalOutcomeTemplateRow = String(standardCode) === "digital-outcome"
                && (rowTaskText.includes("describe the digital outcome")
                    || rowTaskText.includes("identify the target audience")
                    || rowTaskText.includes("end user for this outcome"))
                && hasSyncedSlideForTaskTopic(levelFilter ? stripStepLevel(step?.text) : String(step?.text || ""));

            if (autoCompleteProjectManagementRow) {
                row.classList.add("is-system-complete");
            }

            if (autoCompleteDigitalOutcomeTemplateRow) {
                row.classList.add("is-system-complete");
            }

            const doneValue = Boolean(step?.done) || autoCompleteProjectManagementRow || autoCompleteDigitalOutcomeTemplateRow;
            if (autoCompleteProjectManagementRow && !Boolean(step?.done)) {
                state[standardCode][index].done = true;
                step.done = true;
                autoUpdated = true;
            }

            if (autoCompleteDigitalOutcomeTemplateRow && !Boolean(step?.done)) {
                state[standardCode][index].done = true;
                step.done = true;
                autoUpdated = true;
            }

            const check = document.createElement("input");
            check.type = "checkbox";
            check.className = "evidence-step-check";
            check.checked = doneValue;
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

            row.append(check, input);

            if (!isSelfTaskListView) {
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

                row.append(removeButton);
            }

            const showProjectManagementConnections = String(standardCode) === "91897"
                && rowLevel === "achieved"
                && rowTaskText.includes("project management");
            if (showProjectManagementConnections) {
                const systems = document.createElement("div");
                systems.className = "evidence-step-system-list";
                systems.innerHTML = `
                    <p class="evidence-step-system-title">Connected Systems</p>
                    <label class="evidence-step-system-item"><input type="checkbox" disabled ${systemConnections.trelloConnected ? "checked" : ""}> Trello</label>
                    <label class="evidence-step-system-item"><input type="checkbox" disabled ${systemConnections.githubConnected ? "checked" : ""}> GitHub</label>
                    <label class="evidence-step-system-item"><input type="checkbox" disabled ${systemConnections.oneDriveConnected ? "checked" : ""}> OneDrive</label>
                    <label class="evidence-step-system-item"><input type="checkbox" disabled ${systemConnections.googleDriveConnected ? "checked" : ""}> Google Drive</label>
                `;
                row.appendChild(systems);
            }

            rowsHost.appendChild(row);
        });

        if (autoUpdated) {
            void persistState(sidebar.querySelector("#evidence-sidebar-status"));
        }
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

    // Always render a Digital Outcome Details block above the standards for assessment tasks.
    (() => {
        const doCode = "digital-outcome";
        if (!Object.prototype.hasOwnProperty.call(state, doCode)) {
            state[doCode] = DIGITAL_OUTCOME_DETAILS_TASKS.map((text) => ({ text, done: false }));
        }
        const doBlock = document.createElement("section");
        doBlock.className = "evidence-standard-block evidence-digital-outcome-block";
        doBlock.innerHTML = `
            <h3 class="evidence-digital-outcome-heading">Digital Outcome Topic</h3>
            <div class="evidence-step-list evidence-digital-outcome-topic-list">
                <div class="evidence-step-row evidence-step-row-readonly">
                    <input
                        type="text"
                        class="evidence-step-input"
                        value="${escapeHtml(digitalOutcomeTopicType || "Not Set") }"
                        title="${escapeHtml(digitalOutcomeTopicType || "Topic Type not set on Upload Assessment Task page") }"
                        readonly
                    >
                </div>
            </div>
            <h3 class="evidence-digital-outcome-heading">Digital Outcome Description</h3>
            <div class="evidence-step-list" id="evidence-step-list-digital-outcome"></div>
            ${!isSelfTaskListView ? `<button type="button" class="detail-action detail-action-secondary evidence-step-add" data-do-add>Add Step</button>` : ""}
        `;
        const doRowsHost = doBlock.querySelector("#evidence-step-list-digital-outcome");
        const doAddButton = doBlock.querySelector("[data-do-add]");
        if (doAddButton) {
            doAddButton.addEventListener("click", () => {
                state[doCode].push({ text: "", done: false });
                void persistState(sidebar.querySelector("#evidence-sidebar-status"));
                renderStepRows(doRowsHost, doCode);
            });
        }
        renderStepRows(doRowsHost, doCode);
        standardsHost.appendChild(doBlock);
    })();

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

    const url = new URL(window.location.href);
    const shouldStartHidden = String(url.searchParams.get("taskList") || "").trim().toLowerCase() === "hide";
    if (shouldStartHidden) {
        url.searchParams.delete("taskList");
        window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    } else {
        openSidebar();
    }
}

let detailStandardsOptionsCache = null;

function extractStandardCodeFromLabel(value) {
    const match = String(value || "").match(/\b(\d{5})\b/);
    return match ? String(match[1] || "").trim() : "";
}

async function tryAutofillDetailStandardCard(standardLabel, { onApplied } = {}) {
    const standardCode = extractStandardCodeFromLabel(standardLabel);
    if (!standardCode) return;

    const params = new URLSearchParams();
    params.set("standard", standardCode);
    params.set("year", String(new Date().getFullYear()));

    try {
        const response = await fetch(`/api/assessment-standard-cards/match?${params.toString()}`, {
            headers: buildWriteHeaders()
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.matched || !payload?.card) return;

        if (typeof onApplied === "function") {
            onApplied(payload.card);
        }
    } catch (_error) {
        // Keep the standard add flow resilient if template lookup fails.
    }
}

function applyDetailStandardCardTemplate(card, fields) {
    if (!card || typeof card !== "object") return;

    const pickLines = (textValue, checklistValue) => {
        const checklist = Array.isArray(checklistValue)
            ? checklistValue.map((line) => String(line || "").trim()).filter(Boolean)
            : [];
        if (checklist.length) return checklist;
        const text = String(textValue || "").trim();
        return text ? [text] : [];
    };

    const achievedLines = pickLines(card.achieved_text, card.achieved_checklist);
    const meritLines = pickLines(card.merit_text, card.merit_checklist);
    const excellenceLines = pickLines(card.excellence_text, card.excellence_checklist);

    const { achievedField, meritField, excellenceField, setStatusFn } = fields || {};

    if (achievedField && achievedLines.length) {
        achievedField.value = achievedLines.join("\n");
    }
    if (meritField && meritLines.length) {
        meritField.value = meritLines.join("\n");
    }
    if (excellenceField && excellenceLines.length) {
        excellenceField.value = excellenceLines.join("\n");
    }

    if (typeof setStatusFn === "function") {
        const templateLabel = String(card?.course_name || "").trim();
        setStatusFn(`Standard added. Loaded criteria from Assessment Standard Card${templateLabel ? ` (${templateLabel})` : ""}`);
    }
}

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

        const achievedField = form?.querySelector('[name="achieved"]');
        const meritField = form?.querySelector('[name="merit"]');
        const excellenceField = form?.querySelector('[name="excellence"]');
        void tryAutofillDetailStandardCard(selected, {
            onApplied: (card) => applyDetailStandardCardTemplate(card, {
                achievedField,
                meritField,
                excellenceField,
                setStatusFn: setStatus
            })
        });
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
        if (!(parsed?.idToken || parsed?.accessToken) || !parsed?.expiresAt || Number(parsed.expiresAt) <= Date.now()) {
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

const DETAIL_HUB_VIEW_MODE_KEY = "hub_view_mode_v1";

function isTeacherWorkspacePathForDetail() {
    const path = String(window.location.pathname || "").toLowerCase();
    return path.endsWith("/teacher-view.html")
        || path.endsWith("/upload-activity.html")
        || path.endsWith("/upload-project.html")
        || path.endsWith("/upload-menu.html")
        || path.endsWith("/teacher-project-allocation.html")
        || path.endsWith("/teacher-assessment-allocation.html")
        || path.endsWith("/class-management.html");
}

function readStoredHubViewModeForDetail() {
    try {
        const value = localStorage.getItem(DETAIL_HUB_VIEW_MODE_KEY);
        return value === "teacher" || value === "student" ? value : "";
    } catch (_error) {
        return "";
    }
}

function resolveDetailTeacherMode(canEditRole) {
    if (!canEditRole) {
        return false;
    }

    if (isTeacherWorkspacePathForDetail()) {
        return true;
    }

    const mode = readStoredHubViewModeForDetail();
    if (mode === "student") {
        return false;
    }

    return true;
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
        { pattern: /describe\s+the\s+digital\s+outcome|describe.*digital\s+outcome/, label: "Digital Outcome Description" },
        { pattern: /identify\s+the\s+target\s+audience|target\s+audience|end\s+user/, label: "Target Audience" },
        { pattern: /explain\s+how\s+the\s+outcome\s+will\s+be\s+developed|tools\/?technologies/, label: "Development and Tools" },
        { pattern: /state\s+how\s+success\s+will\s+be\s+measured|success\s+will\s+be\s+evaluated/, label: "Success Criteria" },
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

function isDigitalOutcomeDescriptionCriterion(taskTopicTitle, taskShortName = "") {
    const topicText = String(taskTopicTitle || "").trim().toLowerCase();
    const shortNameText = String(taskShortName || "").trim().toLowerCase();
    if (!topicText && !shortNameText) {
        return false;
    }

    if (/description\s*-\s*google\s*slides/.test(topicText)) {
        return true;
    }
    if (/describe.*digital\s+outcome/.test(topicText)) {
        return true;
    }
    return shortNameText === DIGITAL_OUTCOME_DESCRIPTION_TITLE.toLowerCase();
}

function isDigitalOutcomeTargetAudienceCriterion(taskTopicTitle, taskShortName = "") {
    const topicText = String(taskTopicTitle || "").trim().toLowerCase();
    const shortNameText = String(taskShortName || "").trim().toLowerCase();
    if (!topicText && !shortNameText) {
        return false;
    }

    if (/identify\s+the\s+target\s+audience/.test(topicText)) {
        return true;
    }
    if (/end\s+user\s+for\s+this\s+outcome/.test(topicText)) {
        return true;
    }
    return shortNameText === DIGITAL_OUTCOME_TARGET_AUDIENCE_TITLE.toLowerCase();
}

function isDigitalOutcomeDevelopmentToolsCriterion(taskTopicTitle, taskShortName = "") {
    const topicText = String(taskTopicTitle || "").trim().toLowerCase();
    const shortNameText = String(taskShortName || "").trim().toLowerCase();
    if (!topicText && !shortNameText) {
        return false;
    }

    if (/explain\s+how\s+the\s+outcome\s+will\s+be\s+developed/.test(topicText)) {
        return true;
    }
    if (/tools\/?technologies\s+will\s+be\s+used/.test(topicText)) {
        return true;
    }
    return shortNameText === DIGITAL_OUTCOME_DEVELOPMENT_TOOLS_TITLE.toLowerCase();
}

function isDigitalOutcomeSuccessCriteriaCriterion(taskTopicTitle, taskShortName = "") {
    const topicText = String(taskTopicTitle || "").trim().toLowerCase();
    const shortNameText = String(taskShortName || "").trim().toLowerCase();
    if (!topicText && !shortNameText) {
        return false;
    }

    if (/state\s+how\s+success\s+will\s+be\s+measured/.test(topicText)) {
        return true;
    }
    if (/success\s+will\s+be\s+evaluated/.test(topicText)) {
        return true;
    }
    return shortNameText === DIGITAL_OUTCOME_SUCCESS_CRITERIA_TITLE.toLowerCase();
}

function inferDigitalOutcomeTopicKeyFromTitle(pageTitle) {
    const normalized = String(pageTitle || "").trim().toLowerCase();
    if (!normalized) {
        return "";
    }

    if (/target\s+audience|end\s+user/.test(normalized)) {
        return "target-audience";
    }

    if (/developed|development|tools\/?technologies|tools|technologies/.test(normalized)) {
        return "development-tools";
    }

    if (/success\s+will\s+be\s+measured|success\s+will\s+be\s+evaluated|success\s+criteria|measured|evaluated/.test(normalized)) {
        return "success-criteria";
    }

    if (/description\s*-\s*google\s*slides|describe.*digital\s+outcome|digital\s+outcome\s+description/.test(normalized)) {
        return "description";
    }

    return "";
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

function normalizeTaskTopicStorageSlug(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 120);
}

function getTaskTopicSlideSyncStorageKey(projectId, email, taskTopic, taskShortName = "") {
    const safeProjectId = String(projectId || "").trim();
    const safeEmail = String(email || "").trim().toLowerCase();
    const topicSlug = normalizeTaskTopicStorageSlug(taskTopic);
    const shortSlug = normalizeTaskTopicStorageSlug(taskShortName);
    return `${TASK_TOPIC_SLIDE_SYNC_STORAGE_PREFIX}:${safeProjectId}:${safeEmail}:${topicSlug}:${shortSlug}`;
}

function readStoredTaskTopicSlideSyncLink(projectId, email, taskTopic, taskShortName = "") {
    const entry = readStoredTaskTopicSlideSyncEntry(projectId, email, taskTopic, taskShortName);
    return entry.url;
}

function readStoredTaskTopicSlideSyncEntry(projectId, email, taskTopic, taskShortName = "") {
    const key = getTaskTopicSlideSyncStorageKey(projectId, email, taskTopic, taskShortName);
    try {
        const raw = localStorage.getItem(key);
        if (!raw) {
            return { url: "", savedAt: "", templateId: "" };
        }
        const parsed = JSON.parse(raw);
        return {
            url: toSafeExternalUrl(parsed?.url || ""),
            savedAt: String(parsed?.savedAt || "").trim(),
            templateId: String(parsed?.templateId || "").trim()
        };
    } catch (_error) {
        return { url: "", savedAt: "", templateId: "" };
    }
}

function readStoredTaskTopicSlideSyncEntryByShortName(projectId, email, taskShortName = "") {
    const safeProjectId = String(projectId || "").trim();
    const safeEmail = String(email || "").trim().toLowerCase();
    const shortSlug = normalizeTaskTopicStorageSlug(taskShortName);
    if (!safeProjectId || !safeEmail || !shortSlug) {
        return { url: "", savedAt: "", templateId: "" };
    }

    const keyPrefix = `${TASK_TOPIC_SLIDE_SYNC_STORAGE_PREFIX}:${safeProjectId}:${safeEmail}:`;
    let bestMatch = { url: "", savedAt: "", templateId: "" };
    let bestTime = 0;

    try {
        for (let index = 0; index < localStorage.length; index += 1) {
            const key = String(localStorage.key(index) || "");
            if (!key.startsWith(keyPrefix)) {
                continue;
            }
            if (!key.endsWith(`:${shortSlug}`)) {
                continue;
            }

            const raw = localStorage.getItem(key);
            if (!raw) {
                continue;
            }
            const parsed = JSON.parse(raw);
            const safeUrl = toSafeExternalUrl(parsed?.url || "");
            if (!safeUrl) {
                continue;
            }

            const savedAt = String(parsed?.savedAt || "").trim();
            const savedTs = Date.parse(savedAt);
            const ts = Number.isFinite(savedTs) ? savedTs : 0;
            if (ts >= bestTime) {
                bestTime = ts;
                bestMatch = {
                    url: safeUrl,
                    savedAt,
                    templateId: String(parsed?.templateId || "").trim()
                };
            }
        }
    } catch (_error) {
        return { url: "", savedAt: "", templateId: "" };
    }

    return bestMatch;
}

function writeStoredTaskTopicSlideSyncLink(projectId, email, taskTopic, taskShortName = "", value = "") {
    const key = getTaskTopicSlideSyncStorageKey(projectId, email, taskTopic, taskShortName);
    const safeUrl = toSafeExternalUrl(value);
    try {
        if (!safeUrl) {
            localStorage.removeItem(key);
            return "";
        }
        localStorage.setItem(key, JSON.stringify({
            url: safeUrl,
            savedAt: new Date().toISOString()
        }));
        return safeUrl;
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
        subjectStream: String(data?.subjectStream || data?.subject_stream || data?.subject || "").trim().toUpperCase(),
        activityCategory: normalizeCardCategory(data?.activityCategory || data?.activity_category || data?.category, inferredAssessmentCategory),
        cardColor: String(data?.cardColor || data?.card_color || data?.color || "").trim() || getDefaultCardColorForCategory(data?.activityCategory || data?.activity_category || data?.category || inferredAssessmentCategory),
        showInThisWeek: Boolean(data?.showInThisWeek),
        summary: String(data?.summary || "").trim(),
        resources: Array.isArray(data?.resources) ? data.resources : [],
        equipment: Array.isArray(data?.equipment) ? data.equipment : [],
        instructions: Array.isArray(data?.instructions) ? data.instructions : [],
        cardUrl: String(data?.cardUrl || data?.card_url || data?.activity_url || data?.url || "").trim(),
        image: String(data?.image || "").trim() || "https://placehold.co/900x560/3f89cf/ffffff?text=Uploaded+Activity",
        slideshowTemplateImage: toSafeExternalUrl(data?.slideshowTemplateImage || data?.slideTemplateImage || ""),
        slideshowTemplateFileUrl: toSafeExternalUrl(data?.slideshowTemplateFileUrl || data?.slideTemplateFileUrl || data?.speakerNotesCriteriaUrl || ""),
        
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
    const normalizedCategory = normalizeCardCategory(data?.activityCategory, "Activity");
    const isAssessmentTask = normalizedCategory === "Assessment Task";
    const canConvertCategory = canEdit && !selectedTaskTopic && Boolean(String(id || "").match(/^\d+$/));
    const cardUrl = toSafeExternalUrl(data?.cardUrl);
    const taskTopicTitle = String(selectedTaskTopic || "").trim();
    const isTaskTopicView = Boolean(taskTopicTitle);
    const isStudentTaskTopicView = isTaskTopicView && !canEdit;
    const toolbarLabel = isTaskTopicView
        ? "Task Topic Card"
        : (isAssessmentTask ? "Assessment Task Details" : (normalizedCategory === "Project" ? "Project" : "Activity"));
    const standardTaskTopicUrl = cardUrl || `${window.location.origin}/ProjectPages/custom-activity.html?id=${encodeURIComponent(String(id || ""))}`;
    const parentAssessmentUrl = `custom-activity.html?id=${encodeURIComponent(String(id || ""))}`;
    const resolvedTaskShortName = String(selectedTaskShortName || "").trim()
        || (taskTopicTitle ? getTaskTopicShortNameOverride(id, taskTopicTitle) : "")
        || (taskTopicTitle ? deriveTaskShortName(taskTopicTitle) : "");
    const keywordMatchedTopicKey = inferDigitalOutcomeTopicKeyFromTitle(`${taskTopicTitle} ${resolvedTaskShortName}`);
    const isDigitalOutcomeDescriptionTopic = isDigitalOutcomeDescriptionCriterion(taskTopicTitle, resolvedTaskShortName)
        || keywordMatchedTopicKey === "description";
    const isDigitalOutcomeTargetAudienceTopic = isDigitalOutcomeTargetAudienceCriterion(taskTopicTitle, resolvedTaskShortName)
        || keywordMatchedTopicKey === "target-audience";
    const isDigitalOutcomeDevelopmentToolsTopic = isDigitalOutcomeDevelopmentToolsCriterion(taskTopicTitle, resolvedTaskShortName)
        || keywordMatchedTopicKey === "development-tools";
    const isDigitalOutcomeSuccessCriteriaTopic = isDigitalOutcomeSuccessCriteriaCriterion(taskTopicTitle, resolvedTaskShortName)
        || keywordMatchedTopicKey === "success-criteria";
    const digitalOutcomeTopicKey = isDigitalOutcomeTargetAudienceTopic
        ? "target-audience"
        : (isDigitalOutcomeDevelopmentToolsTopic
            ? "development-tools"
            : (isDigitalOutcomeSuccessCriteriaTopic
                ? "success-criteria"
                : (isDigitalOutcomeDescriptionTopic ? "description" : keywordMatchedTopicKey)));
    const useDigitalOutcomeTemplateHero = Boolean(digitalOutcomeTopicKey);
    const mergedTaskTopicLinks = isTaskTopicView
        ? collectMergedTaskTopicLinks(data, id, taskTopicTitle, resolvedTaskShortName)
        : [];
    const showMergedTaskTopicLayout = mergedTaskTopicLinks.length > 1;
    const displayTitle = digitalOutcomeTopicKey === "description"
        ? DIGITAL_OUTCOME_DESCRIPTION_TITLE
        : (digitalOutcomeTopicKey === "target-audience"
            ? DIGITAL_OUTCOME_TARGET_AUDIENCE_TITLE
            : (digitalOutcomeTopicKey === "development-tools"
                ? DIGITAL_OUTCOME_DEVELOPMENT_TOOLS_TITLE
                : (digitalOutcomeTopicKey === "success-criteria"
                    ? DIGITAL_OUTCOME_SUCCESS_CRITERIA_TITLE
                    : (resolvedTaskShortName || taskTopicTitle || data.title))));
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
    const isProjectManagementTopic = taskTopicTitle.toLowerCase().includes("project management")
        || resolvedTaskShortName.toLowerCase().includes("project management");
    const isDecompositionTopic = taskTopicTitle.toLowerCase().includes("decompos")
        || resolvedTaskShortName.toLowerCase().includes("decompos");
    const isDigitalOutcomeTopic = taskTopicTitle.toLowerCase().includes("digital outcome")
        || resolvedTaskShortName.toLowerCase().includes("digital outcome")
        || isDigitalOutcomeTargetAudienceTopic
        || isDigitalOutcomeDevelopmentToolsTopic
        || isDigitalOutcomeSuccessCriteriaTopic;
    const templateLibraryParams = new URLSearchParams();
    templateLibraryParams.set("activityId", String(id || "").trim());
    if (taskTopicTitle) {
        templateLibraryParams.set("taskTopic", taskTopicTitle);
    }
    if (resolvedTaskShortName) {
        templateLibraryParams.set("taskShortName", resolvedTaskShortName);
    }
    if (useDigitalOutcomeTemplateHero) {
        const preferredTemplateId = digitalOutcomeTopicKey === "target-audience"
            ? "target-audience"
            : (digitalOutcomeTopicKey === "development-tools"
                ? "relevant-implications"
                : (digitalOutcomeTopicKey === "success-criteria" ? "project-success-criteria" : "digital-outcome-description"));
        templateLibraryParams.set("templateId", preferredTemplateId);
    }
    const slideshowTemplateLibraryUrl = `slideshow-template-library.html?${templateLibraryParams.toString()}`;
    const viewerEmail = readStoredHubEmail();
    const syncedTaskTopicEntryCandidates = [
        readStoredTaskTopicSlideSyncEntry(id, viewerEmail, taskTopicTitle, resolvedTaskShortName),
        readStoredTaskTopicSlideSyncEntryByShortName(id, viewerEmail, resolvedTaskShortName),
        readStoredTaskTopicSlideSyncEntryByShortName(id, viewerEmail, displayTitle),
        readStoredTaskTopicSlideSyncEntry(id, viewerEmail, taskTopicTitle, displayTitle)
    ];
    const syncedTaskTopicEntry = syncedTaskTopicEntryCandidates.find((entry) => toSafeExternalUrl(entry?.url || ""));
    const taskTopicSyncedSlideThumbnail = toGoogleSlidesThumbnailUrl(syncedTaskTopicEntry?.url || "");
    const digitalOutcomeTemplateFallbackImage = digitalOutcomeTopicKey === "target-audience"
        ? DIGITAL_OUTCOME_TARGET_AUDIENCE_TEMPLATE_PREVIEW_URL
        : (digitalOutcomeTopicKey === "description"
            ? DIGITAL_OUTCOME_DESCRIPTION_TEMPLATE_PREVIEW_URL
            : DIGITAL_OUTCOME_GENERIC_TEMPLATE_PREVIEW_URL);
    const slideshowTemplateImage = toSafeExternalUrl(data?.slideshowTemplateImage || data?.slideTemplateImage || "")
        || taskTopicSyncedSlideThumbnail
        || (useDigitalOutcomeTemplateHero ? digitalOutcomeTemplateFallbackImage : "");
    const slideshowTemplateFileUrl = toSafeExternalUrl(data?.slideshowTemplateFileUrl || data?.slideTemplateFileUrl || data?.speakerNotesCriteriaUrl || "");
    const heroVisualImage = ((isDigitalOutcomeTopic || useDigitalOutcomeTemplateHero) ? (slideshowTemplateImage || data.image) : data.image)
        || "https://placehold.co/900x560/3f89cf/ffffff?text=Uploaded+Activity";
    const heroVisualAlt = (isDigitalOutcomeTopic || useDigitalOutcomeTemplateHero)
        ? `${displayTitle} slideshow template preview`
        : `${displayTitle} project image`;
    const heroImageHtml = (isDigitalOutcomeTopic || useDigitalOutcomeTemplateHero)
        ? `
                <div class="task-topic-template-hero">
                    <img src="${escapeHtml(heroVisualImage)}" alt="${escapeHtml(heroVisualAlt)}" loading="lazy">
                    <div class="task-topic-template-hero-actions">
                        <a class="detail-action detail-action-secondary" href="${escapeHtml(slideshowTemplateLibraryUrl)}">Open Template Library</a>
                        ${slideshowTemplateFileUrl
                            ? `<a class="detail-action" href="${escapeHtml(slideshowTemplateFileUrl)}" target="_blank" rel="noreferrer">Open Slideshow File</a>`
                            : ""
                        }
                    </div>
                </div>
            `
        : `<img src="${escapeHtml(heroVisualImage)}" alt="${escapeHtml(heroVisualAlt)}" loading="lazy">`;
    const subjectStream = String(data?.subjectStream || data?.subject_stream || data?.subject || "").trim().toUpperCase();
    const contextSignals = [
        subjectStream,
        String(data?.type || ""),
        String(data?.title || ""),
        taskTopicTitle,
        resolvedTaskShortName
    ].join(" ").toUpperCase();
    const isDigitalMediaContext = /(DIGITAL\s*MEDIA|MEDIA|FILM|VIDEO|AUDIO|MUSIC|PHOTOGRAPH|ANIMATION|GRAPHIC)/i.test(contextSignals);
    const isProgrammingContext = /(DTECH|PROGRAMM|CODING|COMPUT|SOFTWARE|WEB|APP|PYTHON|JAVASCRIPT|ROBOTIC)/i.test(contextSignals);
    const showGithubGuide = isProjectManagementTopic;
    const snowGithubGuide = showGithubGuide;
    const showOneDriveGuide = isProjectManagementTopic;
    const submissionTaskItems = Array.from(new Set([
        ...(isDecompositionTopic
            ? [
                "Break the assessment into clear decomposition steps (one step per line in the planner).",
                "Save your decomposition plan in DTECH so your teacher can review your thinking.",
                "Select your Trello board and To Do list, then push the decomposition steps to Trello.",
                "Keep your Trello To Do list updated as steps are started, completed, or refined."
            ]
            : []),
        ...(isProjectManagementTopic
            ? [
                "Add your Trello card or board link so your teacher can verify project management evidence.",
                "Post a daily Trello work log update for progress tracking."
            ]
            : []),
        ...(isRelevantImplicationsTopic
            ? ["Written evidence that explains your relevant implications and justifies your design decisions."]
            : []),
        ...submissionRequirements
    ]));
    const submissionIntroText = isDecompositionTopic
        ? "Students plan decomposition here, then push those steps to Trello To Do for execution and tracking."
        : "Students submit evidence here to show they have completed this task topic.";
    const submissionPrimaryEvidenceType = isProjectManagementTopic
        ? "Trello Link + Work Log"
        : (isDecompositionTopic ? "Decomposition Plan + Trello To Do Cards"
        : (isRelevantImplicationsTopic ? "Written Evidence" : "Evidence Upload"));
    const topicGuideTitle = isProjectManagementTopic
        ? "Project Management: Trello"
        : (isDecompositionTopic ? "Decomposition + Trello"
        : (isDigitalOutcomeTopic
            ? (digitalOutcomeTopicKey === "target-audience"
                ? "Target Audience"
                : (digitalOutcomeTopicKey === "development-tools"
                    ? "Development and Tools"
                    : (digitalOutcomeTopicKey === "success-criteria"
                        ? "Success Criteria"
                        : "Digital Outcome Description")))
            : "Topic Tasks"));
    const topicGuideInstructions = isProjectManagementTopic
        ? [
            "Log in to Trello using Google Sign In.",
            "Create a board for this assessment if you do not already have one.",
            "Add three list headings: To Do, Doing, Done.",
            "Create or open your task card for this topic and keep it updated each lesson."
        ]
        : (isDecompositionTopic
            ? [
                "Open the Decomposition page for this task topic.",
                "Write one decomposed step per line in the planner.",
                "Select your Trello board, then choose the To Do list.",
                "Push the decomposition steps to Trello and track progress through Doing and Done."
            ]
            : (isDigitalOutcomeTopic
                ? (digitalOutcomeTopicKey === "target-audience"
                    ? [
                        "Create a Google Slideshow for this topic.",
                        "Define who the target audience or end user is for your project.",
                        "Describe audience needs, context, and pain points your project should respond to.",
                        "Explain why this audience is the right focus and how your project decisions support them.",
                        "Use clear evidence, examples, or observations to justify your audience choices."
                    ]
                    : (digitalOutcomeTopicKey === "development-tools"
                        ? [
                            "Create a Google Slideshow for this topic.",
                            "Explain how your outcome will be developed from planning through implementation.",
                            "Name the tools and technologies you will use (for example: HTML/CSS/JS, Python, Trello, GitHub, Figma).",
                            "Justify why each tool is suitable for your project requirements and users.",
                            "Outline the build sequence so your development process is clear and testable."
                        ]
                        : (digitalOutcomeTopicKey === "success-criteria"
                            ? [
                                "Create a Google Slideshow for this topic.",
                                "Define clear, measurable success criteria for your digital outcome.",
                                "Explain how success will be tested or evaluated (user feedback, testing results, rubric evidence).",
                                "Set indicators for what counts as achieved, partially achieved, or unmet.",
                                "Use evidence language so teachers can verify outcomes against your criteria."
                            ]
                            : [
                                "Create a Google Slideshow for this topic.",
                                "Include a slide that describes the digital outcome: what it is, who it is for, and what it must do.",
                                "Record the assessment criteria page in Speaker Notes so markers can verify how each point is addressed.",
                                "Explain the intent of the idea clearly: problem, purpose, audience, and expected impact.",
                                "Use concise wording and evidence-based reasoning so your idea is easy to evaluate."
                            ])))
                : [
                    "Read each submission requirement carefully.",
                    "Prepare evidence that matches the task expectations.",
                    "Upload or link your evidence before acknowledging submission."
                ]));
    const topicGuideTaskItems = isProjectManagementTopic
        ? [
            "Copy your Trello board or card URL.",
            "Paste the URL into Project Management and click Save Trello Link.",
            "Send a daily Trello work log update from this page.",
            "Keep your card up to date so your teacher can verify progress."
        ]
        : (isDecompositionTopic
            ? [
                "Add decomposed tasks in the Decomposition page planner.",
                "Push the decomposed tasks to your Trello To Do list.",
                "Move tasks through Doing and Done as you complete them.",
                "Submit and acknowledge evidence after your plan and Trello tasks are updated."
            ]
            : (isDigitalOutcomeTopic
                ? (digitalOutcomeTopicKey === "target-audience"
                    ? [
                        "Target Audience - Google Slides: Identify who your project is for and describe them clearly.",
                        "Describe demographics and context: age/role, environment, and likely use situation.",
                        "Describe psychographics and motivations: values, interests, and reasons they would use your project.",
                        "Identify pain points and explain how your project addresses those specific needs."
                    ]
                    : (digitalOutcomeTopicKey === "development-tools"
                        ? [
                            "Development and Tools - Google Slides: Explain how your outcome will be developed.",
                            "List the tools/technologies you will use and what each tool is responsible for.",
                            "Describe your workflow from planning to build, testing, and refinement.",
                            "Justify why these tools are best for your audience and project requirements."
                        ]
                        : (digitalOutcomeTopicKey === "success-criteria"
                            ? [
                                "Success Criteria - Google Slides: State how success will be measured or evaluated.",
                                "Define measurable criteria (performance, usability, reliability, or engagement).",
                                "Explain what evidence will be collected and how it will be assessed.",
                                "Describe what outcomes indicate success, partial success, or unresolved issues."
                            ]
                            : [
                                "Description - Google Slides: Describe the Digital Outcome: what it is, who it is for, and what it must do.",
                                "Identify the target audience or end user for this outcome.",
                                "Explain how the outcome will be developed and what tools/technologies will be used.",
                                "State how success will be measured or evaluated."
                            ])))
                : submissionTaskItems));
    const topicGuideSourceUrl = (isProjectManagementTopic || isDecompositionTopic)
        ? "https://trello.com/"
        : (isDigitalOutcomeTopic ? slideshowTemplateLibraryUrl : "");
    const topicGuideIntroText = isDigitalOutcomeTopic
        ? (digitalOutcomeTopicKey === "target-audience"
            ? "Use this guide to define your project's target audience clearly and justify why they are the right users to design for."
            : (digitalOutcomeTopicKey === "development-tools"
                ? "Use this guide to explain how your outcome will be developed and why your chosen tools and technologies are appropriate."
                : (digitalOutcomeTopicKey === "success-criteria"
                    ? "Use this guide to define measurable success criteria and explain how your outcome will be evaluated."
                    : "Use this guide to write and record a clear description of your digital outcome before starting development.")))
        : "Use this guide to complete the Submission Tasks correctly.";
    const topicGuideTaskHeading = isProjectManagementTopic
        ? "Trello Tasks"
        : (isDigitalOutcomeTopic
            ? (digitalOutcomeTopicKey === "target-audience"
                ? "Target Audience - Google Slides"
                : (digitalOutcomeTopicKey === "development-tools"
                    ? "Development and Tools - Google Slides"
                    : (digitalOutcomeTopicKey === "success-criteria"
                        ? "Success Criteria - Google Slides"
                        : "Description - Google Slides")))
            : "Task List");
    const githubGuideTitle = "Version Control: GitHub";
    const githubGuideSourceUrl = "https://github.com/";
    const githubGuideInstructions = [
        "Log in to GitHub using Google Sign In (or your school-linked GitHub account).",
        "Create a repository for this assessment project.",
        "Add a clear README with your project purpose and key milestones.",
        "Use commits regularly so your progress history is visible to your teacher."
    ];
    const githubGuideTaskItems = [
        "Create TODO, DOING, and DONE tracking items in your repo (Project board or Issues).",
        "Link commit messages to the task you completed.",
        "Push your latest changes before each lesson ends.",
        "Copy your GitHub repository URL and keep it available for submission evidence."
    ];
    const oneDriveGuideTitle = "Version Control: Microsoft OneDrive";
    const oneDriveGuideSourceUrl = "https://www.microsoft.com/microsoft-365/onedrive/online-cloud-storage";
    const oneDriveGuideInstructions = [
        "Log in to Microsoft OneDrive with your school account.",
        "Open Documents in OneDrive and create a project folder for this assessment.",
        "Keep all project source files inside that OneDrive Documents project folder.",
        "Copy the share link for the folder and paste it into DTECH HUB on this page."
    ];
    const oneDriveGuideTaskItems = [
        "Create a project folder path like Documents/AssessmentName/ProjectName.",
        "Use clear version file names such as v01, v02, v03.",
        "Save working files and exports into your OneDrive project folder, not local temporary folders.",
        "Keep the DTECH HUB OneDrive folder link updated for teacher access."
    ];
    const oneDriveGuideWarning = "Important: Downloads and Videos folders are not backed up to OneDrive. Save project files in your OneDrive Documents project folder.";
    const googleDriveGuideTitle = "Version Control: Google Drive";
    const googleDriveGuideSourceUrl = "https://workspace.google.com/products/drive/";
    const googleDriveGuideInstructions = [
        "Log in to Google Drive with your school account.",
        "Create a project folder for this assessment and keep all source files in that folder.",
        "Open the Share settings for the project folder.",
        "Set sharing to Anyone with a link and copy the folder URL into DTECH HUB on this page."
    ];
    const googleDriveGuideTaskItems = [
        "Create a folder path like My Drive/AssessmentName/ProjectName.",
        "Use clear version file names such as v01, v02, v03.",
        "Keep exports and working files in the same Google Drive project folder.",
        "Recheck that folder sharing remains Anyone with a link so teachers can verify your evidence."
    ];
    const googleDriveGuideWarningHtml = "Important: Set sharing to <span class=\"task-topic-guide-alert-highlight\">Anyone with a link</span> so your teacher can open the folder evidence.";
    if (!submissionTaskItems.length) {
        submissionTaskItems.push("Upload evidence that clearly demonstrates completion of this task topic.");
    }

    host.classList.toggle("task-topic-screen", isTaskTopicView);
    host.classList.toggle("student-task-topic-screen", isStudentTaskTopicView);

    host.innerHTML = `
        <header class="toolbar">
            <span class="toolbar-label">${toolbarLabel}</span>
            <div class="toolbar-actions">
                ${canConvertCategory ? `
                    <div class="detail-convert-actions" role="group" aria-label="Convert category">
                        <button type="button" class="detail-action detail-action-secondary" data-convert-category="Project" ${normalizedCategory === "Project" ? "disabled" : ""}>Convert to Project</button>
                        <button type="button" class="detail-action detail-action-secondary" data-convert-category="Assessment Task" ${normalizedCategory === "Assessment Task" ? "disabled" : ""}>Convert to Assessment</button>
                        <button type="button" class="detail-action detail-action-secondary" data-convert-category="Activity" ${normalizedCategory === "Activity" ? "disabled" : ""}>Convert to Activity</button>
                        <button type="button" class="detail-action detail-action-secondary" id="detail-reapply-category-color">Reapply Category Color</button>
                    </div>
                ` : ""}
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
                ${heroImageHtml}
            </div>
        </section>

        <div class="detail-under-hero-actions" id="detail-under-hero-actions"></div>

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

                    ${canEdit ? `
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
                    ` : ""}
                </div>

                <aside class="task-topic-submission-column${isDigitalOutcomeTopic ? " task-topic-submission-column-digital-outcome" : ""}">
                    <div class="task-topic-sync-grid">
                    <section class="proposal-section task-topic-guide-panel">
                        <p class="task-topic-guide-eyebrow">Topic Tasks</p>
                        <h2>${escapeHtml(topicGuideTitle)}</h2>
                        <p class="task-topic-guide-intro">${escapeHtml(topicGuideIntroText)}</p>
                        ${topicGuideSourceUrl ? `<p class="task-topic-guide-source">Source: <a href="${escapeHtml(topicGuideSourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(topicGuideSourceUrl)}</a></p>` : ""}

                        <section class="task-topic-guide-block">
                            <h3>Instructions</h3>
                            <ul class="list task-topic-guide-list">${renderList(topicGuideInstructions)}</ul>
                        </section>

                        <section class="task-topic-guide-block">
                            <h3>${escapeHtml(topicGuideTaskHeading)}</h3>
                            <ul class="list task-topic-guide-list">${renderList(topicGuideTaskItems)}</ul>
                        </section>

                        ${isProjectManagementTopic ? `<div id="task-topic-trello-sync-slot"></div>` : ""}
                    </section>

                    ${showGithubGuide ? `
                    <section class="proposal-section task-topic-guide-panel">
                        <p class="task-topic-guide-eyebrow">Topic Tasks</p>
                        <h2>${escapeHtml(githubGuideTitle)}</h2>
                        <p class="task-topic-guide-intro">Use this guide to track version control evidence alongside your Trello workflow.</p>
                        <p class="task-topic-guide-source">Source: <a href="${escapeHtml(githubGuideSourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(githubGuideSourceUrl)}</a></p>

                        <section class="task-topic-guide-block">
                            <h3>Instructions</h3>
                            <ul class="list task-topic-guide-list">${renderList(githubGuideInstructions)}</ul>
                        </section>

                        <section class="task-topic-guide-block">
                            <h3>GitHub Tasks</h3>
                            <ul class="list task-topic-guide-list">${renderList(githubGuideTaskItems)}</ul>
                        </section>

                        <div id="task-topic-github-sync-slot"></div>
                    </section>
                    ` : ""}
                    </div>

                    ${showOneDriveGuide ? `
                    <div class="task-topic-sync-grid">
                    <section class="proposal-section task-topic-guide-panel">
                        <p class="task-topic-guide-eyebrow">Topic Tasks</p>
                        <h2>${escapeHtml(oneDriveGuideTitle)}</h2>
                        <p class="task-topic-guide-intro">Use this guide for image/video version control and teacher folder access tracking.</p>
                        <p class="task-topic-guide-source">Source: <a href="${escapeHtml(oneDriveGuideSourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(oneDriveGuideSourceUrl)}</a></p>
                        <p class="task-topic-guide-alert">${escapeHtml(oneDriveGuideWarning)}</p>

                        <section class="task-topic-guide-block">
                            <h3>Instructions</h3>
                            <ul class="list task-topic-guide-list">${renderList(oneDriveGuideInstructions)}</ul>
                        </section>

                        <section class="task-topic-guide-block">
                            <h3>OneDrive Tasks</h3>
                            <ul class="list task-topic-guide-list">${renderList(oneDriveGuideTaskItems)}</ul>
                        </section>

                        <div id="task-topic-onedrive-sync-slot"></div>
                    </section>

                    <section class="proposal-section task-topic-guide-panel">
                        <p class="task-topic-guide-eyebrow">Topic Tasks</p>
                        <h2>${escapeHtml(googleDriveGuideTitle)}</h2>
                        <p class="task-topic-guide-intro">Use this guide if you are managing version control files in Google Drive.</p>
                        <p class="task-topic-guide-source">Source: <a href="${escapeHtml(googleDriveGuideSourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(googleDriveGuideSourceUrl)}</a></p>
                        <p class="task-topic-guide-alert">${googleDriveGuideWarningHtml}</p>

                        <section class="task-topic-guide-block">
                            <h3>Instructions</h3>
                            <ul class="list task-topic-guide-list">${renderList(googleDriveGuideInstructions)}</ul>
                        </section>

                        <section class="task-topic-guide-block">
                            <h3>Google Drive Tasks</h3>
                            <ul class="list task-topic-guide-list">${renderList(googleDriveGuideTaskItems)}</ul>
                        </section>

                        <div id="task-topic-google-drive-sync-slot"></div>
                    </section>
                    </div>
                    ` : ""}

                    <section class="proposal-section task-topic-submission-panel">
                        <h2>Submission Tasks</h2>
                        <p class="task-topic-submission-intro">${escapeHtml(submissionIntroText)}</p>
                        <div class="task-topic-submission-evidence-type">
                            <span class="task-topic-card-label">Primary Evidence Type</span>
                            <p class="task-topic-card-value">${submissionPrimaryEvidenceType}</p>
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

    const convertButtons = Array.from(host.querySelectorAll("button[data-convert-category]"));
    const reapplyColorButton = host.querySelector("#detail-reapply-category-color");
    if (convertButtons.length) {
        const setConvertDisabled = (disabled) => {
            convertButtons.forEach((button) => {
                button.disabled = disabled;
            });
            if (reapplyColorButton) {
                reapplyColorButton.disabled = disabled;
            }
        };

        convertButtons.forEach((button) => {
            button.addEventListener("click", async () => {
                const targetCategory = normalizeCardCategory(button.getAttribute("data-convert-category"), "Activity");
                const currentCategory = normalizeCardCategory(data?.activityCategory, "Activity");
                if (!targetCategory || targetCategory === currentCategory) {
                    return;
                }

                const confirmed = window.confirm(`Convert "${data.title}" to ${targetCategory}?`);
                if (!confirmed) {
                    return;
                }

                setConvertDisabled(true);
                if (editButton) editButton.disabled = true;
                if (deleteButton) deleteButton.disabled = true;

                try {
                    const draft = defaultDetailShape(id, data);
                    draft.activityCategory = targetCategory;
                    draft.cardColor = getDefaultCardColorForCategory(targetCategory);
                    const saved = await saveDetails(id, draft);
                    DETAIL_DATA[id] = saved;
                    renderDetailView(host, id, saved, canEdit, selectedTaskTopic, selectedTaskShortName);
                } catch (error) {
                    setConvertDisabled(false);
                    if (editButton) editButton.disabled = false;
                    if (deleteButton) deleteButton.disabled = false;
                    window.alert(error.message || "Could not convert this item category.");
                }
            });
        });

        if (reapplyColorButton) {
            reapplyColorButton.addEventListener("click", async () => {
                const currentCategory = normalizeCardCategory(data?.activityCategory, "Activity");
                const targetColor = getDefaultCardColorForCategory(currentCategory);
                const confirmed = window.confirm(`Reapply ${targetColor} color for category ${currentCategory}?`);
                if (!confirmed) {
                    return;
                }

                setConvertDisabled(true);
                if (editButton) editButton.disabled = true;
                if (deleteButton) deleteButton.disabled = true;

                try {
                    const draft = defaultDetailShape(id, data);
                    draft.activityCategory = currentCategory;
                    draft.cardColor = targetColor;
                    const saved = await saveDetails(id, draft);
                    DETAIL_DATA[id] = saved;
                    renderDetailView(host, id, saved, canEdit, selectedTaskTopic, selectedTaskShortName);
                } catch (error) {
                    setConvertDisabled(false);
                    if (editButton) editButton.disabled = false;
                    if (deleteButton) deleteButton.disabled = false;
                    window.alert(error.message || "Could not reapply category color.");
                }
            });
        }
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
        card_color: String(draft.cardColor || "").trim(),
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
        cardColor: String(result.card_color || draft.cardColor || "").trim() || getDefaultCardColorForCategory(result.activity_category || draft.activityCategory),
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
    const currentTemplateImageUrl = toSafeExternalUrl(data?.slideshowTemplateImage || data?.slideTemplateImage || "");
    const currentTemplateFileUrl = toSafeExternalUrl(data?.slideshowTemplateFileUrl || data?.slideTemplateFileUrl || data?.speakerNotesCriteriaUrl || "");
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
                        <span>Slideshow Template Preview Image URL</span>
                        <input name="taskTopicTemplateImageUrl" type="url" placeholder="https://..." value="${escapeHtml(currentTemplateImageUrl)}">
                    </label>
                    <label class="detail-field detail-field-full">
                        <span>Slideshow Template File URL</span>
                        <input name="taskTopicTemplateFileUrl" type="url" placeholder="https://docs.google.com/presentation/..." value="${escapeHtml(currentTemplateFileUrl)}">
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

        const achievedField = form?.querySelector('[name="achieved"]');
        const meritField = form?.querySelector('[name="merit"]');
        const excellenceField = form?.querySelector('[name="excellence"]');
        const statusEl = host.querySelector("#task-topic-edit-status");
        const setStatus = (message, isError = false) => {
            if (!statusEl) return;
            statusEl.textContent = message;
            statusEl.classList.toggle("is-error", Boolean(isError));
        };
        void tryAutofillDetailStandardCard(selected, {
            onApplied: (card) => applyDetailStandardCardTemplate(card, {
                achievedField,
                meritField,
                excellenceField,
                setStatusFn: setStatus
            })
        });
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
            slideshowTemplateImage: toSafeExternalUrl(formData.get("taskTopicTemplateImageUrl")) || "",
            slideshowTemplateFileUrl: toSafeExternalUrl(formData.get("taskTopicTemplateFileUrl")) || "",
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
            slideshowTemplateImage: toSafeExternalUrl(data?.slideshowTemplateImage || data?.slideTemplateImage || ""),
            slideshowTemplateFileUrl: toSafeExternalUrl(data?.slideshowTemplateFileUrl || data?.slideTemplateFileUrl || data?.speakerNotesCriteriaUrl || ""),
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
    const titleOverride = isDigitalOutcomeDescriptionCriterion(selectedTaskTopic, selectedTaskShortName)
        ? DIGITAL_OUTCOME_DESCRIPTION_TITLE
        : "";
    const canEditRole = await canEditDetails();
    const isTeacher = resolveDetailTeacherMode(canEditRole);

    document.title = `${titleOverride || selectedTaskShortName || selectedTaskTopic || resolvedData.title} | Computer Lab`;

    // In student view mode, teachers should see the same page experience as students.
    renderDetailView(host, id, resolvedData, isTeacher, selectedTaskTopic, selectedTaskShortName);

    // Load interest section only for backend-stored items (numeric IDs)
    if (String(id).match(/^\d+$/)) {
        await loadAndRenderInterestSection(host, id, isTeacher, resolvedData);
    }
}

async function loadAndRenderInterestSection(host, projectId, isTeacher, detailData) {
    installCloudSyncDelegatedFallbackHandlers();

    const existingSection = host.querySelector("#interest-section");
    if (existingSection) {
        existingSection.remove();
    }

    const email = readStoredHubEmail();
    const isAssessmentTask = String(detailData?.activityCategory || "").toLowerCase().includes("assessment");
    const isClientProjectsAssessment = isAssessmentTask && (
        String(projectId || "").trim() === "49"
        || String(detailData?.title || "").toLowerCase().includes("client project")
    );

    const fetchHeaders = buildAuthHeaders({});

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

    const selectedTaskTopic = String(new URLSearchParams(window.location.search || "").get("taskTopic") || "").trim();
    const isTaskTopicPage = Boolean(selectedTaskTopic);
    const isProjectManagementTaskTopicPage = isTaskTopicPage
        && selectedTaskTopic.toLowerCase().includes("project management");
    const taskTopicContextSignals = [
        selectedTaskTopic,
        String(detailData?.subjectStream || detailData?.subject_stream || detailData?.subject || ""),
        String(detailData?.type || ""),
        String(detailData?.title || "")
    ].join(" ").toUpperCase();
    const isProgrammingTaskContext = /(DTECH|PROGRAMM|CODING|COMPUT|SOFTWARE|WEB|APP|PYTHON|JAVASCRIPT|ROBOTIC)/i.test(taskTopicContextSignals);
    const showGithubGuide = isProjectManagementTaskTopicPage;

    if (isTeacher && isAssessmentTask && !isTaskTopicPage) {
        const students = Array.isArray(interestData?.students) ? interestData.students : [];
        const todayNz = getNzDateKey();
        const summaryStatuses = students.map((student) => summarizeStudentSubmissionStatus(student?.evidence_steps, todayNz));
        const acknowledgedCount = summaryStatuses.filter((status) => status.acknowledged).length;
        const loggedTodayCount = summaryStatuses.filter((status) => status.loggedToday).length;
        const trelloLinkedCount = summaryStatuses.filter((status) => status.trelloLinked).length;
        const hasProjectManagementTopic = [
            ...coerceArray(detailData?.tasksList),
            ...coerceArray(detailData?.assessmentFocus ?? detailData?.assessment_focus ?? detailData?.assessmentFocusRaw)
        ].some((line) => String(line || "").toLowerCase().includes("project management"));

        html += `
            <div class="task-topic-submission-teacher-panel assessment-submission-summary-panel">
                <h3>Submission Tasks</h3>
                <p class="task-topic-submission-note">Students submit evidence links (for example Google Slides) through DTECH HUB. This panel tracks who has submitted.</p>
                <div class="task-topic-submission-meta">
                    <p><strong>Submitted:</strong> ${acknowledgedCount} of ${students.length}</p>
                    <p><strong>Logged today:</strong> ${loggedTodayCount} of ${students.length}</p>
                    ${hasProjectManagementTopic ? `<p><strong>Trello linked:</strong> ${trelloLinkedCount} of ${students.length}</p>` : ""}
                </div>
                ${isClientProjectsAssessment ? `
                <div class="task-topic-drive-links" style="margin-top:8px;">
                    <button type="button" class="detail-action detail-action-secondary" id="client-projects-backfill-btn">Run Client Projects Backfill Now</button>
                </div>
                <p class="interest-assign-status" id="client-projects-backfill-status" aria-live="polite"></p>
                ` : ""}
            </div>
        `;
    }

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
        const showStudentInterestToggle = !(isAssessmentTask && isTaskTopicPage);
        if (showStudentInterestToggle) {
            const btnClass = interestData.my_interest ? "detail-action interest-btn is-interested" : "detail-action interest-btn";
            const btnText = interestData.my_interest ? "\u2713 I'm Interested" : "I'm Interested";
            html += `<button type="button" class="${btnClass}" id="interest-toggle-btn">${btnText}</button>`;
        }
    }

    // Teachers see the full list of interested students
    if (isTeacher && interestData.emails.length > 0) {
        const studentsByEmail = new Map((Array.isArray(interestData.students) ? interestData.students : [])
            .map((student) => [String(student?.email || "").toLowerCase(), student]));
        const trelloConnectionByEmail = new Map();
        try {
            const emails = interestData.emails
                .map((studentEmail) => String(studentEmail || "").trim().toLowerCase())
                .filter(Boolean);
            if (emails.length) {
                const response = await fetch(`/api/integrations/trello/connections?emails=${encodeURIComponent(emails.join(","))}`, {
                    headers: buildWriteHeaders()
                });
                if (response.ok) {
                    const payload = await response.json().catch(() => ({}));
                    const rows = Array.isArray(payload?.connections) ? payload.connections : [];
                    rows.forEach((row) => {
                        const normalizedEmail = String(row?.email || "").trim().toLowerCase();
                        if (!normalizedEmail) {
                            return;
                        }
                        trelloConnectionByEmail.set(normalizedEmail, Boolean(row?.connected));
                    });
                }
            }
        } catch (_error) {
            // Keep table rendering even if Trello status cannot be loaded.
        }

        html += `<div class="interest-student-list"><h3>Interested Students</h3>`;
        html += `<table class="interest-table"><thead><tr><th>Student Email</th><th>Project(s)</th><th>Status</th><th>Trello</th><th>Action</th></tr></thead><tbody>`;
        for (const studentEmail of interestData.emails) {
            const isConfirmed = interestData.confirmed.includes(studentEmail);
            const statusBadge = isConfirmed
                ? `<span class="interest-status interest-confirmed">Confirmed</span>`
                : `<span class="interest-status interest-pending">Pending</span>`;
            const confirmBtnText = isConfirmed ? "Unconfirm" : "Confirm";

            const studentRecord = studentsByEmail.get(String(studentEmail || "").toLowerCase()) || null;
            const sourceProjects = Array.isArray(studentRecord?.source_projects)
                ? studentRecord.source_projects.map((name) => String(name || "").trim()).filter(Boolean)
                : [];
            const sourceProjectsHtml = sourceProjects.length
                ? sourceProjects.map((name) => `<span class="interest-project-chip">${escapeHtml(name)}</span>`).join("")
                : `<span class="interest-project-empty">-</span>`;
            const assignedStandards = getEffectiveAssignedStandards(studentRecord, detailData);
            const completionPercent = getEvidenceCompletionPercentFromRows(studentRecord?.evidence_steps, assignedStandards);
            const trelloCardUrl = getFirstTrelloCardUrlFromEvidenceRows(studentRecord?.evidence_steps);
            const trelloConnected = Boolean(trelloConnectionByEmail.get(String(studentEmail || "").trim().toLowerCase()));
            const trelloStatusHtml = trelloCardUrl
                ? `<a class="interest-status interest-confirmed" href="${escapeHtml(trelloCardUrl)}" target="_blank" rel="noreferrer">Open Trello</a>`
                : (trelloConnected
                    ? `<span class="interest-status interest-confirmed">Connected</span>`
                    : `<span class="interest-status interest-pending">Not linked</span>`
                );
            const progressButton = assignedStandards.length
                ? `<button type="button" class="detail-action detail-action-secondary interest-progress-btn" data-student-email="${escapeHtml(studentEmail)}" data-standards="${escapeHtml(assignedStandards.join(","))}">Progress to Achieved Requirements ${completionPercent}%</button>`
                : "";

            html += `<tr data-student="${escapeHtml(studentEmail)}"><td>${escapeHtml(studentEmail)}</td><td class="interest-projects-cell">${sourceProjectsHtml}</td><td>${statusBadge}</td><td class="interest-trello-status-cell" data-student-email="${escapeHtml(studentEmail)}" data-trello-url="${escapeHtml(trelloCardUrl || "")}">${trelloStatusHtml}</td><td><div class="interest-action-group"><button type="button" class="detail-action interest-confirm-btn" data-confirmed="${isConfirmed}">${confirmBtnText}</button>${progressButton}</div></td></tr>`;
        }
        html += `</tbody></table></div>`;
    } else if (isTeacher && interestData.count === 0) {
        html += `<p class="interest-no-students">No students have registered interest yet.</p>`;
    }

    section.innerHTML = html;
    host.appendChild(section);

    const taskTopicValue = String(selectedTaskTopic || "").trim();
    if (email && !isTeacher && isTaskTopicPage) {
        const myAllocation = interestData?.my_allocation || null;
        const assignedStandards = getEffectiveAssignedStandards(myAllocation, detailData);
        const completionPercent = getEvidenceCompletionPercentFromRows(myAllocation?.evidence_steps, assignedStandards);
        const templateLibraryProcessAssessmentUrl = isProjectManagementTaskTopicPage
            ? await fetchStudentProcessAssessmentFolderUrl()
            : "";

        if (isProjectManagementTaskTopicPage) {
            const sharedTrelloCardLink = getFirstTrelloCardUrlFromEvidenceRows(myAllocation?.evidence_steps);
            const sharedTrelloCardLinks = getAllTrelloCardUrlsFromEvidenceRows(myAllocation?.evidence_steps);
            const localTrelloCardLink = readStoredTrelloCardLink(projectId, email);
            const localTrelloCardLibrary = readStoredTrelloCardLibrary(projectId, email);
            const mergedTrelloCardLibrary = writeStoredTrelloCardLibrary(
                projectId,
                email,
                mergeTrelloCardLibrarySources(
                    [{ url: sharedTrelloCardLink, savedAt: "" }, { url: localTrelloCardLink, savedAt: "" }],
                    sharedTrelloCardLinks.map((url) => ({ url, savedAt: "" })),
                    localTrelloCardLibrary
                )
            );
            const savedCardLink = escapeHtml(sharedTrelloCardLink || localTrelloCardLink);
            const trelloBoardHint = getTrelloBoardHint(sharedTrelloCardLink || localTrelloCardLink);
            const trelloSlot = host.querySelector("#task-topic-trello-sync-slot");
            if (trelloSlot) {
                trelloSlot.innerHTML = `
                    <div class="trello-sync-panel" id="trello-sync-panel">
                        <h3>Trello Sync</h3>
                        <p>Open your Trello card quickly or send this work update to Trello.</p>
                        <label for="trello-card-url" class="trello-sync-label">Trello card or board link</label>
                        <input id="trello-card-url" class="trello-sync-input" type="url" placeholder="https://trello.com/c/xxxx1234 or /b/xxxx/board-name" value="${savedCardLink}">
                        ${trelloBoardHint ? `<p class="task-topic-submission-note">Expected shared board: <strong>${escapeHtml(trelloBoardHint)}</strong></p>` : ""}
                        <label for="trello-work-note" class="trello-sync-label">Work note</label>
                        <textarea id="trello-work-note" class="trello-sync-input trello-sync-note" placeholder="What did you complete today?"></textarea>
                        <div class="trello-sync-actions">
                            <button type="button" class="detail-action detail-action-secondary" id="trello-save-link-btn">Save Trello Link</button>
                            <button type="button" class="detail-action detail-action-secondary" id="trello-open-card-btn">Open Trello Card</button>
                            <button type="button" class="detail-action" id="trello-send-log-btn">Send Log to Trello (${completionPercent}%)</button>
                        </div>
                        <p class="trello-sync-status" id="trello-sync-status" aria-live="polite"></p>
                        <div class="trello-link-library" id="trello-link-library" ${mergedTrelloCardLibrary.length ? "" : "hidden"}>
                            <p class="trello-link-library-title">Saved Trello Links <span class="trello-link-library-count" id="trello-link-library-count">(${mergedTrelloCardLibrary.length})</span></p>
                            <ul class="trello-link-library-list" id="trello-link-library-list">
                                ${mergedTrelloCardLibrary.map((item) => `
                                    <li class="trello-link-library-item" data-trello-link-item="${escapeHtml(item.url)}">
                                        <div class="trello-link-library-link-wrap">
                                            <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.url)}</a>
                                            <span class="trello-link-library-savedat">${escapeHtml(formatLibrarySavedAtLabel(item.savedAt))}</span>
                                        </div>
                                        <div class="trello-link-library-actions">
                                            <button type="button" class="detail-action detail-action-secondary" data-trello-library-use="${escapeHtml(item.url)}">Use</button>
                                            <button type="button" class="detail-action detail-action-secondary" data-trello-library-open="${escapeHtml(item.url)}">Open</button>
                                        </div>
                                    </li>
                                `).join("")}
                            </ul>
                        </div>
                    </div>
                `;
            }

            const githubSlot = host.querySelector("#task-topic-github-sync-slot");
            if (githubSlot && showGithubGuide) {
                const sharedGithubLink = getFirstGithubRepoUrlFromEvidenceRows(myAllocation?.evidence_steps);
                const sharedGithubLinks = getAllGithubRepoUrlsFromEvidenceRows(myAllocation?.evidence_steps);
                const localGithubRepoLibrary = readStoredGithubRepoLibrary(projectId, email);
                const mergedGithubRepoLibrary = writeStoredGithubRepoLibrary(
                    projectId,
                    email,
                    mergeGithubRepoLibrarySources(
                        [{ url: sharedGithubLink, savedAt: "" }],
                        sharedGithubLinks.map((url) => ({ url, savedAt: "" })),
                        localGithubRepoLibrary
                    )
                );
                githubSlot.innerHTML = `
                    <div class="trello-sync-panel" id="github-sync-panel" style="margin-top:10px;">
                        <h3>GitHub Sync</h3>
                        <p>Save your repository URL and a short progress note for version-control evidence.</p>
                        <label for="github-repo-url" class="trello-sync-label">GitHub repository link</label>
                        <input id="github-repo-url" class="trello-sync-input" type="url" placeholder="https://github.com/org/repo" value="${escapeHtml(sharedGithubLink)}">
                        <label for="github-work-note" class="trello-sync-label">Work note</label>
                        <textarea id="github-work-note" class="trello-sync-input trello-sync-note" placeholder="What commit or change did you complete?"></textarea>
                        <div class="trello-sync-actions">
                            <button type="button" class="detail-action detail-action-secondary" id="github-save-link-btn">Save GitHub Sync</button>
                            <button type="button" class="detail-action detail-action-secondary" id="github-open-repo-btn">Open Repository</button>
                        </div>
                        <p class="trello-sync-status" id="github-sync-status" aria-live="polite"></p>
                        <div class="trello-link-library" id="github-link-library" ${mergedGithubRepoLibrary.length ? "" : "hidden"}>
                            <p class="trello-link-library-title">Saved GitHub Links <span class="trello-link-library-count" id="github-link-library-count">(${mergedGithubRepoLibrary.length})</span></p>
                            <ul class="trello-link-library-list" id="github-link-library-list">
                                ${mergedGithubRepoLibrary.map((item) => `
                                    <li class="trello-link-library-item" data-github-link-item="${escapeHtml(item.url)}">
                                        <div class="trello-link-library-link-wrap">
                                            <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.url)}</a>
                                            <span class="trello-link-library-savedat">${escapeHtml(formatLibrarySavedAtLabel(item.savedAt))}</span>
                                        </div>
                                        <div class="trello-link-library-actions">
                                            <button type="button" class="detail-action detail-action-secondary" data-github-library-use="${escapeHtml(item.url)}">Use</button>
                                            <button type="button" class="detail-action detail-action-secondary" data-github-library-open="${escapeHtml(item.url)}">Open</button>
                                        </div>
                                    </li>
                                `).join("")}
                            </ul>
                        </div>
                    </div>
                `;
            }
        }

        const oneDriveSlot = host.querySelector("#task-topic-onedrive-sync-slot");
        if (oneDriveSlot) {
            const sharedOneDriveLink = getFirstOneDriveFolderUrlFromEvidenceRows(myAllocation?.evidence_steps);
            const sharedOneDriveLinks = getAllOneDriveFolderUrlsFromEvidenceRows(myAllocation?.evidence_steps);
            const localOneDriveLinkLibrary = readStoredOneDriveLinkLibrary(projectId, email);
            const mergedOneDriveLinkLibrary = writeStoredOneDriveLinkLibrary(
                projectId,
                email,
                mergeOneDriveLinkLibrarySources(
                    [{ url: sharedOneDriveLink, savedAt: "" }],
                    sharedOneDriveLinks.map((url) => ({ url, savedAt: "" })),
                    localOneDriveLinkLibrary
                )
            );
            oneDriveSlot.innerHTML = `
                <div class="trello-sync-panel" id="onedrive-sync-panel">
                    <h3>Microsoft OneDrive Sync</h3>
                    <p>Save your OneDrive project folder link so your teacher can verify files and version history.</p>
                    <label for="onedrive-folder-url" class="trello-sync-label">OneDrive project folder link</label>
                    <input id="onedrive-folder-url" class="trello-sync-input" type="url" placeholder="https://onedrive.live.com/... or school SharePoint folder" value="${escapeHtml(sharedOneDriveLink)}">
                    <div class="trello-sync-actions">
                        <button type="button" class="detail-action detail-action-secondary" id="onedrive-save-link-btn">Save OneDrive Link</button>
                        <button type="button" class="detail-action detail-action-secondary" id="onedrive-open-folder-btn">Open OneDrive Folder</button>
                    </div>
                    <p class="trello-sync-status" id="onedrive-sync-status" aria-live="polite"></p>
                    <div class="trello-link-library" id="onedrive-link-library" ${mergedOneDriveLinkLibrary.length ? "" : "hidden"}>
                        <p class="trello-link-library-title">Saved OneDrive Links <span class="trello-link-library-count" id="onedrive-link-library-count">(${mergedOneDriveLinkLibrary.length})</span></p>
                        <ul class="trello-link-library-list" id="onedrive-link-library-list">
                            ${mergedOneDriveLinkLibrary.map((item) => `
                                <li class="trello-link-library-item" data-onedrive-link-item="${escapeHtml(item.url)}">
                                    <div class="trello-link-library-link-wrap">
                                        <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.url)}</a>
                                        <span class="trello-link-library-savedat">${escapeHtml(formatLibrarySavedAtLabel(item.savedAt))}</span>
                                    </div>
                                    <div class="trello-link-library-actions">
                                        <button type="button" class="detail-action detail-action-secondary" data-onedrive-library-use="${escapeHtml(item.url)}">Use</button>
                                        <button type="button" class="detail-action detail-action-secondary" data-onedrive-library-open="${escapeHtml(item.url)}">Open</button>
                                    </div>
                                </li>
                            `).join("")}
                        </ul>
                    </div>
                </div>
            `;
        }

        const googleDriveSlot = host.querySelector("#task-topic-google-drive-sync-slot");
        if (googleDriveSlot) {
            const evidenceGoogleDriveLink = getFirstGoogleDriveFolderUrlFromEvidenceRows(myAllocation?.evidence_steps);
            const evidenceGoogleDriveLinks = getAllGoogleDriveFolderUrlsFromEvidenceRows(myAllocation?.evidence_steps);
            const savedGoogleDriveLink = evidenceGoogleDriveLink || templateLibraryProcessAssessmentUrl;
            const localGoogleDriveLinkLibrary = readStoredGoogleDriveLinkLibrary(projectId, email);
            const mergedGoogleDriveLinkLibrary = writeStoredGoogleDriveLinkLibrary(
                projectId,
                email,
                mergeGoogleDriveLinkLibrarySources(
                    [{ url: evidenceGoogleDriveLink, savedAt: "" }, { url: templateLibraryProcessAssessmentUrl, savedAt: "" }],
                    evidenceGoogleDriveLinks.map((url) => ({ url, savedAt: "" })),
                    localGoogleDriveLinkLibrary
                )
            );
            const usingTemplateLibraryProcessAssessment = !evidenceGoogleDriveLink && Boolean(templateLibraryProcessAssessmentUrl);
            googleDriveSlot.innerHTML = `
                <div class="trello-sync-panel" id="google-drive-sync-panel" style="margin-top:10px;">
                    <h3>Google Drive Sync</h3>
                    <p>Save your Google Drive project folder link so your teacher can verify files and version history.</p>
                    <label for="google-drive-folder-url" class="trello-sync-label">Google Drive project folder link</label>
                    <input id="google-drive-folder-url" class="trello-sync-input" type="url" placeholder="https://drive.google.com/..." value="${escapeHtml(savedGoogleDriveLink)}">
                    ${usingTemplateLibraryProcessAssessment ? `<p class="task-topic-submission-note">Loaded from your Template Library <strong>SeniorDTECH/Process Assessment</strong> folder setup.</p>` : ""}
                    <div class="trello-sync-actions">
                        <button type="button" class="detail-action detail-action-secondary" id="google-drive-save-link-btn">Save Google Drive Link</button>
                        <button type="button" class="detail-action detail-action-secondary" id="google-drive-open-folder-btn">Open Google Drive Folder</button>
                    </div>
                    <p class="trello-sync-status" id="google-drive-sync-status" aria-live="polite"></p>
                    <div class="trello-link-library" id="google-drive-link-library" ${mergedGoogleDriveLinkLibrary.length ? "" : "hidden"}>
                        <p class="trello-link-library-title">Saved Google Links <span class="trello-link-library-count" id="google-drive-link-library-count">(${mergedGoogleDriveLinkLibrary.length})</span></p>
                        <ul class="trello-link-library-list" id="google-drive-link-library-list">
                            ${mergedGoogleDriveLinkLibrary.map((item) => `
                                <li class="trello-link-library-item" data-google-drive-link-item="${escapeHtml(item.url)}">
                                    <div class="trello-link-library-link-wrap">
                                        <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.url)}</a>
                                        <span class="trello-link-library-savedat">${escapeHtml(formatLibrarySavedAtLabel(item.savedAt))}</span>
                                    </div>
                                    <div class="trello-link-library-actions">
                                        <button type="button" class="detail-action detail-action-secondary" data-google-drive-library-use="${escapeHtml(item.url)}">Use</button>
                                        <button type="button" class="detail-action detail-action-secondary" data-google-drive-library-open="${escapeHtml(item.url)}">Open</button>
                                    </div>
                                </li>
                            `).join("")}
                        </ul>
                    </div>
                </div>
            `;
        }
    }

    try {
        await renderTaskTopicSubmissionPanel({
            host,
            projectId,
            detailData,
            email,
            isTeacher,
            interestData
        });
    } catch (_error) {
        // Keep sync controls interactive even if submission panel rendering fails.
    }

    if (!isTeacher && isAssessmentTask && email) {
        const myAllocation = interestData?.my_allocation || null;
        const assignedStandards = getEffectiveAssignedStandards(myAllocation, detailData);
        const taskDefaultsByStandard = buildTaskDefaultsByStandard(assignedStandards, detailData);

        if (assignedStandards.length) {
            try {
                await renderEvidenceSidebar({
                    host,
                    projectId,
                    viewerEmail: email,
                    studentEmail: email,
                    standards: Array.from(new Set(assignedStandards)),
                    studentLabel: "My progress",
                    taskDefaultsByStandard,
                    detailData,
                    taskTopic: selectedTaskTopic
                });
            } catch (_error) {
                // Sidebar issues should not block sync button handlers.
            }
        }
    }

    if (isTeacher && email) {
        const trelloStatusCells = Array.from(section.querySelectorAll(".interest-trello-status-cell[data-student-email]"));
        await Promise.all(trelloStatusCells.map(async (cell) => {
            const studentEmail = String(cell.getAttribute("data-student-email") || "").trim().toLowerCase();
            if (!studentEmail) {
                return;
            }

            try {
                const response = await fetch(`/api/activities/${encodeURIComponent(projectId)}/interests/${encodeURIComponent(studentEmail)}/evidence`, {
                    headers: buildWriteHeaders()
                });
                if (!response.ok) {
                    return;
                }

                const payload = await response.json().catch(() => ({}));
                const trelloCardUrl = getFirstTrelloCardUrlFromEvidenceRows(payload?.evidence_steps);
                if (!trelloCardUrl) {
                    return;
                }

                cell.setAttribute("data-trello-url", trelloCardUrl);
                cell.innerHTML = `<a class="interest-status interest-confirmed" href="${escapeHtml(trelloCardUrl)}" target="_blank" rel="noreferrer">Open Trello</a>`;
            } catch (_error) {
                // Keep the current fallback status if the evidence refresh fails.
            }
        }));

        await Promise.all(trelloStatusCells.map(async (cell) => {
            const studentEmail = String(cell.getAttribute("data-student-email") || "").trim().toLowerCase();
            const trelloUrl = String(cell.getAttribute("data-trello-url") || "").trim();
            if (!studentEmail || !trelloUrl) {
                return;
            }

            try {
                const progressResponse = await fetch(
                    `/api/integrations/trello/list-progress?student_email=${encodeURIComponent(studentEmail)}&board_url=${encodeURIComponent(trelloUrl)}`,
                    { headers: buildWriteHeaders() }
                );
                if (!progressResponse.ok) {
                    return;
                }

                const progress = await progressResponse.json().catch(() => ({}));
                const toDoCount = Number(progress?.todo_count);
                const doingCount = Number(progress?.doing_count);
                const doneCount = Number(progress?.done_count);
                const completionPercent = Number(progress?.completion_percent);
                if (!Number.isFinite(toDoCount) || !Number.isFinite(doingCount) || !Number.isFinite(doneCount)) {
                    return;
                }

                const safeCompletionPercent = Number.isFinite(completionPercent)
                    ? Math.max(0, Math.min(100, Math.round(completionPercent)))
                    : 0;
                const syncText = `To Do ${toDoCount} | Doing ${doingCount} | Done ${doneCount} | ${safeCompletionPercent}% complete`;
                cell.innerHTML = `${cell.innerHTML}<span class="interest-status" style="margin-left:8px;">${escapeHtml(syncText)}</span>`;
            } catch (_error) {
                // Keep baseline Trello status if list-progress sync fails.
            }
        }));

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
                    taskDefaultsByStandard,
                    detailData,
                    taskTopic: selectedTaskTopic
                });
            });
        });
    }

    const trelloCardInput = section.querySelector("#trello-card-url");
    const trelloWorkNoteInput = section.querySelector("#trello-work-note");
    const trelloSaveLinkBtn = section.querySelector("#trello-save-link-btn");
    const trelloOpenCardBtn = section.querySelector("#trello-open-card-btn");
    const trelloSendLogBtn = section.querySelector("#trello-send-log-btn");
    const trelloStatus = section.querySelector("#trello-sync-status");
    const trelloLinkLibrary = section.querySelector("#trello-link-library");
    const trelloLinkLibraryList = section.querySelector("#trello-link-library-list");
    const trelloLinkLibraryCount = section.querySelector("#trello-link-library-count");
    const oneDriveFolderInput = section.querySelector("#onedrive-folder-url");
    const oneDriveSaveLinkBtn = section.querySelector("#onedrive-save-link-btn");
    const oneDriveOpenFolderBtn = section.querySelector("#onedrive-open-folder-btn");
    const oneDriveStatus = section.querySelector("#onedrive-sync-status");
    const oneDriveLinkLibrary = section.querySelector("#onedrive-link-library");
    const oneDriveLinkLibraryList = section.querySelector("#onedrive-link-library-list");
    const oneDriveLinkLibraryCount = section.querySelector("#onedrive-link-library-count");
    const googleDriveFolderInput = section.querySelector("#google-drive-folder-url");
    const googleDriveSaveLinkBtn = section.querySelector("#google-drive-save-link-btn");
    const googleDriveOpenFolderBtn = section.querySelector("#google-drive-open-folder-btn");
    const googleDriveStatus = section.querySelector("#google-drive-sync-status");
    const googleDriveLinkLibrary = section.querySelector("#google-drive-link-library");
    const googleDriveLinkLibraryList = section.querySelector("#google-drive-link-library-list");
    const googleDriveLinkLibraryCount = section.querySelector("#google-drive-link-library-count");
    const githubRepoInput = section.querySelector("#github-repo-url");
    const githubWorkNoteInput = section.querySelector("#github-work-note");
    const githubSaveLinkBtn = section.querySelector("#github-save-link-btn");
    const githubOpenRepoBtn = section.querySelector("#github-open-repo-btn");
    const githubStatus = section.querySelector("#github-sync-status");
    const githubLinkLibrary = section.querySelector("#github-link-library");
    const githubLinkLibraryList = section.querySelector("#github-link-library-list");
    const githubLinkLibraryCount = section.querySelector("#github-link-library-count");

    if (oneDriveSaveLinkBtn) oneDriveSaveLinkBtn.dataset.syncBound = "1";
    if (oneDriveOpenFolderBtn) oneDriveOpenFolderBtn.dataset.syncBound = "1";
    if (googleDriveSaveLinkBtn) googleDriveSaveLinkBtn.dataset.syncBound = "1";
    if (googleDriveOpenFolderBtn) googleDriveOpenFolderBtn.dataset.syncBound = "1";

    const setTrelloStatus = (message, isError = false, isSuccess = false) => {
        if (!trelloStatus) return;
        trelloStatus.textContent = String(message || "");
        trelloStatus.classList.toggle("is-error", Boolean(isError));
        trelloStatus.classList.toggle("is-success", Boolean(isSuccess) && !Boolean(isError));
    };

    const setOneDriveStatus = (message, isError = false) => {
        if (!oneDriveStatus) return;
        oneDriveStatus.textContent = String(message || "");
        oneDriveStatus.classList.toggle("is-error", Boolean(isError));
    };

    const setGoogleDriveStatus = (message, isError = false) => {
        if (!googleDriveStatus) return;
        googleDriveStatus.textContent = String(message || "");
        googleDriveStatus.classList.toggle("is-error", Boolean(isError));
    };

    const setGithubStatus = (message, isError = false, isSuccess = false) => {
        if (!githubStatus) return;
        githubStatus.textContent = String(message || "");
        githubStatus.classList.toggle("is-error", Boolean(isError));
        githubStatus.classList.toggle("is-success", Boolean(isSuccess) && !Boolean(isError));
    };

    const backendTrelloCardLink = getFirstTrelloCardUrlFromEvidenceRows(interestData?.my_allocation?.evidence_steps);
    const backendTrelloCardLinks = getAllTrelloCardUrlsFromEvidenceRows(interestData?.my_allocation?.evidence_steps);
    const backendGithubRepoLink = getFirstGithubRepoUrlFromEvidenceRows(interestData?.my_allocation?.evidence_steps);
    const backendGithubRepoLinks = getAllGithubRepoUrlsFromEvidenceRows(interestData?.my_allocation?.evidence_steps);
    const backendOneDriveLink = getFirstOneDriveFolderUrlFromEvidenceRows(interestData?.my_allocation?.evidence_steps);
    const backendOneDriveLinks = getAllOneDriveFolderUrlsFromEvidenceRows(interestData?.my_allocation?.evidence_steps);
    const backendGoogleDriveLink = getFirstGoogleDriveFolderUrlFromEvidenceRows(interestData?.my_allocation?.evidence_steps);
    const backendGoogleDriveLinks = getAllGoogleDriveFolderUrlsFromEvidenceRows(interestData?.my_allocation?.evidence_steps);
    const localTrelloCardLink = readStoredTrelloCardLink(projectId, email);
    const localTrelloCardLibrary = readStoredTrelloCardLibrary(projectId, email);
    const localGithubRepoLibrary = readStoredGithubRepoLibrary(projectId, email);
    const localOneDriveLinkLibrary = readStoredOneDriveLinkLibrary(projectId, email);
    const localGoogleDriveLinkLibrary = readStoredGoogleDriveLinkLibrary(projectId, email);
    let trelloCardLibrary = writeStoredTrelloCardLibrary(
        projectId,
        email,
        mergeTrelloCardLibrarySources(
            [{ url: backendTrelloCardLink, savedAt: "" }, { url: localTrelloCardLink, savedAt: "" }],
            backendTrelloCardLinks.map((url) => ({ url, savedAt: "" })),
            localTrelloCardLibrary
        )
    );
    let githubRepoLibrary = writeStoredGithubRepoLibrary(
        projectId,
        email,
        mergeGithubRepoLibrarySources(
            [{ url: backendGithubRepoLink, savedAt: "" }],
            backendGithubRepoLinks.map((url) => ({ url, savedAt: "" })),
            localGithubRepoLibrary
        )
    );
    let oneDriveLinkLibraryState = writeStoredOneDriveLinkLibrary(
        projectId,
        email,
        mergeOneDriveLinkLibrarySources(
            [{ url: backendOneDriveLink, savedAt: "" }],
            backendOneDriveLinks.map((url) => ({ url, savedAt: "" })),
            localOneDriveLinkLibrary
        )
    );
    let googleDriveLinkLibraryState = writeStoredGoogleDriveLinkLibrary(
        projectId,
        email,
        mergeGoogleDriveLinkLibrarySources(
            [{ url: backendGoogleDriveLink, savedAt: "" }],
            backendGoogleDriveLinks.map((url) => ({ url, savedAt: "" })),
            localGoogleDriveLinkLibrary
        )
    );
    const legacyLibraryMigrationUrl = (() => {
        if (backendTrelloCardLink) {
            return "";
        }
        const fromDirect = toSafeTrelloCardUrl(localTrelloCardLink);
        if (fromDirect) {
            return fromDirect;
        }
        const firstLibraryUrl = Array.isArray(trelloCardLibrary) && trelloCardLibrary.length
            ? toSafeTrelloCardUrl(trelloCardLibrary[0]?.url || "")
            : "";
        return firstLibraryUrl;
    })();
    const needsLegacyTrelloMigration = Boolean(legacyLibraryMigrationUrl);

    if (backendGithubRepoLink) {
        setGithubStatus("Saved GitHub repository loaded.", false, true);
    }

    const renderTrelloCardLibrary = () => {
        if (!trelloLinkLibrary || !trelloLinkLibraryList) {
            return;
        }

        if (!trelloCardLibrary.length) {
            trelloLinkLibrary.hidden = true;
            if (trelloLinkLibraryCount) {
                trelloLinkLibraryCount.textContent = "(0)";
            }
            trelloLinkLibraryList.innerHTML = "";
            return;
        }

        const activeUrl = toSafeTrelloCardUrl(trelloCardInput?.value || "");
        trelloLinkLibrary.hidden = false;
        if (trelloLinkLibraryCount) {
            trelloLinkLibraryCount.textContent = `(${trelloCardLibrary.length})`;
        }
        trelloLinkLibraryList.innerHTML = trelloCardLibrary
            .map((item) => {
                const url = toSafeTrelloCardUrl(item?.url || "");
                if (!url) {
                    return "";
                }
                const isActive = Boolean(activeUrl && activeUrl === url);
                return `
                    <li class="trello-link-library-item${isActive ? " is-active" : ""}" data-trello-link-item="${escapeHtml(url)}">
                        <div class="trello-link-library-link-wrap">
                            <a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(url)}</a>
                            <span class="trello-link-library-savedat">${escapeHtml(formatLibrarySavedAtLabel(item?.savedAt))}</span>
                        </div>
                        <div class="trello-link-library-actions">
                            <button type="button" class="detail-action detail-action-secondary" data-trello-library-use="${escapeHtml(url)}">Use</button>
                            <button type="button" class="detail-action detail-action-secondary" data-trello-library-open="${escapeHtml(url)}">Open</button>
                        </div>
                    </li>
                `;
            })
            .join("");
    };

    const readCardUrl = () => {
        const safe = toSafeTrelloCardUrl(trelloCardInput?.value || "");
        if (trelloCardInput && safe && trelloCardInput.value !== safe) {
            trelloCardInput.value = safe;
        }
        writeStoredTrelloCardLink(projectId, email, safe);
        renderTrelloCardLibrary();
        return safe;
    };

    const renderGithubRepoLibrary = () => {
        if (!githubLinkLibrary || !githubLinkLibraryList) {
            return;
        }

        if (!githubRepoLibrary.length) {
            githubLinkLibrary.hidden = true;
            if (githubLinkLibraryCount) {
                githubLinkLibraryCount.textContent = "(0)";
            }
            githubLinkLibraryList.innerHTML = "";
            return;
        }

        const activeUrl = toSafeGithubRepoUrl(githubRepoInput?.value || "");
        githubLinkLibrary.hidden = false;
        if (githubLinkLibraryCount) {
            githubLinkLibraryCount.textContent = `(${githubRepoLibrary.length})`;
        }
        githubLinkLibraryList.innerHTML = githubRepoLibrary
            .map((item) => {
                const url = toSafeGithubRepoUrl(item?.url || "");
                if (!url) {
                    return "";
                }
                const isActive = Boolean(activeUrl && activeUrl === url);
                return `
                    <li class="trello-link-library-item${isActive ? " is-active" : ""}" data-github-link-item="${escapeHtml(url)}">
                        <div class="trello-link-library-link-wrap">
                            <a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(url)}</a>
                            <span class="trello-link-library-savedat">${escapeHtml(formatLibrarySavedAtLabel(item?.savedAt))}</span>
                        </div>
                        <div class="trello-link-library-actions">
                            <button type="button" class="detail-action detail-action-secondary" data-github-library-use="${escapeHtml(url)}">Use</button>
                            <button type="button" class="detail-action detail-action-secondary" data-github-library-open="${escapeHtml(url)}">Open</button>
                        </div>
                    </li>
                `;
            })
            .join("");
    };

    const renderOneDriveLinkLibrary = () => {
        if (!oneDriveLinkLibrary || !oneDriveLinkLibraryList) {
            return;
        }

        if (!oneDriveLinkLibraryState.length) {
            oneDriveLinkLibrary.hidden = true;
            if (oneDriveLinkLibraryCount) {
                oneDriveLinkLibraryCount.textContent = "(0)";
            }
            oneDriveLinkLibraryList.innerHTML = "";
            return;
        }

        const activeUrl = toSafeOneDriveFolderUrl(oneDriveFolderInput?.value || "");
        oneDriveLinkLibrary.hidden = false;
        if (oneDriveLinkLibraryCount) {
            oneDriveLinkLibraryCount.textContent = `(${oneDriveLinkLibraryState.length})`;
        }
        oneDriveLinkLibraryList.innerHTML = oneDriveLinkLibraryState
            .map((item) => {
                const url = toSafeOneDriveFolderUrl(item?.url || "");
                if (!url) {
                    return "";
                }
                const isActive = Boolean(activeUrl && activeUrl === url);
                return `
                    <li class="trello-link-library-item${isActive ? " is-active" : ""}" data-onedrive-link-item="${escapeHtml(url)}">
                        <div class="trello-link-library-link-wrap">
                            <a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(url)}</a>
                            <span class="trello-link-library-savedat">${escapeHtml(formatLibrarySavedAtLabel(item?.savedAt))}</span>
                        </div>
                        <div class="trello-link-library-actions">
                            <button type="button" class="detail-action detail-action-secondary" data-onedrive-library-use="${escapeHtml(url)}">Use</button>
                            <button type="button" class="detail-action detail-action-secondary" data-onedrive-library-open="${escapeHtml(url)}">Open</button>
                        </div>
                    </li>
                `;
            })
            .join("");
    };

    const renderGoogleDriveLinkLibrary = () => {
        if (!googleDriveLinkLibrary || !googleDriveLinkLibraryList) {
            return;
        }

        if (!googleDriveLinkLibraryState.length) {
            googleDriveLinkLibrary.hidden = true;
            if (googleDriveLinkLibraryCount) {
                googleDriveLinkLibraryCount.textContent = "(0)";
            }
            googleDriveLinkLibraryList.innerHTML = "";
            return;
        }

        const activeUrl = toSafeGoogleDriveFolderUrl(googleDriveFolderInput?.value || "");
        googleDriveLinkLibrary.hidden = false;
        if (googleDriveLinkLibraryCount) {
            googleDriveLinkLibraryCount.textContent = `(${googleDriveLinkLibraryState.length})`;
        }
        googleDriveLinkLibraryList.innerHTML = googleDriveLinkLibraryState
            .map((item) => {
                const url = toSafeGoogleDriveFolderUrl(item?.url || "");
                if (!url) {
                    return "";
                }
                const isActive = Boolean(activeUrl && activeUrl === url);
                return `
                    <li class="trello-link-library-item${isActive ? " is-active" : ""}" data-google-drive-link-item="${escapeHtml(url)}">
                        <div class="trello-link-library-link-wrap">
                            <a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(url)}</a>
                            <span class="trello-link-library-savedat">${escapeHtml(formatLibrarySavedAtLabel(item?.savedAt))}</span>
                        </div>
                        <div class="trello-link-library-actions">
                            <button type="button" class="detail-action detail-action-secondary" data-google-drive-library-use="${escapeHtml(url)}">Use</button>
                            <button type="button" class="detail-action detail-action-secondary" data-google-drive-library-open="${escapeHtml(url)}">Open</button>
                        </div>
                    </li>
                `;
            })
            .join("");
    };

    renderTrelloCardLibrary();
    renderGithubRepoLibrary();
    renderOneDriveLinkLibrary();
    renderGoogleDriveLinkLibrary();

    if (needsLegacyTrelloMigration && trelloCardInput) {
        trelloCardInput.value = toSafeTrelloCardUrl(localTrelloCardLink) || localTrelloCardLink;
        setTrelloStatus("This Trello link was only saved in this browser before. Saving it now will share it with teacher view.");

        void (async () => {
            try {
                const safeLocalUrl = toSafeTrelloCardUrl(legacyLibraryMigrationUrl);
                if (!safeLocalUrl) {
                    return;
                }

                await persistStudentTrelloLinkDirectlyToEvidence(projectId, email, detailData, taskTopicValue, safeLocalUrl);
                try {
                    await persistStudentTrelloLink(projectId, email, safeLocalUrl);
                } catch (_legacyError) {
                }
                setTrelloStatus("Your Trello link has been synced to teacher view.");
            } catch (_error) {
                // Keep the prompt visible so the student can use Save Trello Link manually.
            }
        })();
    }

    trelloCardInput?.addEventListener("change", () => {
        const raw = String(trelloCardInput.value || "").trim();
        if (!raw) {
            setTrelloStatus("");
            return;
        }

        const safe = toSafeTrelloCardUrl(raw);
        if (!safe) {
            setTrelloStatus("Enter a valid Trello card or board link (trello.com/c/... or trello.com/b/...).", true);
        } else {
            setTrelloStatus("Link looks valid. Click Save Trello Link.");
        }
        renderTrelloCardLibrary();
    });

    trelloLinkLibraryList?.addEventListener("click", (event) => {
        const useButton = event.target.closest("[data-trello-library-use]");
        if (useButton) {
            const selectedUrl = toSafeTrelloCardUrl(useButton.getAttribute("data-trello-library-use") || "");
            if (!selectedUrl) {
                return;
            }
            if (trelloCardInput) {
                trelloCardInput.value = selectedUrl;
            }
            writeStoredTrelloCardLink(projectId, email, selectedUrl);
            setTrelloStatus("Selected saved Trello link.", false, true);
            renderTrelloCardLibrary();
            return;
        }

        const openButton = event.target.closest("[data-trello-library-open]");
        if (openButton) {
            const selectedUrl = toSafeTrelloCardUrl(openButton.getAttribute("data-trello-library-open") || "");
            if (!selectedUrl) {
                return;
            }
            window.open(selectedUrl, "_blank", "noopener,noreferrer");
            setTrelloStatus("Opened saved Trello link.", false, true);
        }
    });

    trelloSaveLinkBtn?.addEventListener("click", async () => {
        const cardUrl = readCardUrl();
        if (!cardUrl) {
            setTrelloStatus("Enter a valid Trello card or board link first.", true);
            return;
        }

        if (trelloSaveLinkBtn) trelloSaveLinkBtn.disabled = true;
        setTrelloStatus("Saving Trello link...");
        try {
            // Primary strategy: persist directly through evidence rows (same path as checklist saves).
            await persistStudentTrelloLinkDirectlyToEvidence(projectId, email, detailData, taskTopicValue, cardUrl);

            // Secondary best-effort sync path; ignore errors because evidence rows already persisted.
            try {
                await persistStudentTrelloLink(projectId, email, cardUrl);
            } catch (_endpointError) {
            }

            const verifiedRows = await fetchEvidenceRowsEnsuringAllocation(projectId, email);
            const verifiedUrl = toSafeTrelloCardUrl(getFirstTrelloCardUrlFromEvidenceRows(verifiedRows));
            const latestSavedAt = getLatestTrelloSavedAtFromEvidenceRows(verifiedRows);
            if (!verifiedUrl) {
                throw new Error("Trello link did not persist to your Task List evidence.");
            }

            trelloCardLibrary = addStoredTrelloCardLibraryLink(projectId, email, cardUrl);
            renderTrelloCardLibrary();

            if (latestSavedAt) {
                setTrelloStatus(`Trello link saved and shared with teacher view (${formatSubmissionTimestamp(latestSavedAt)}).`, false, true);
            } else {
                setTrelloStatus("Trello link saved and shared with teacher view.", false, true);
            }
        } catch (error) {
            setTrelloStatus(`${error.message || "Could not save Trello link right now."}${formatApiDebugSuffix(error)}`, true);
        } finally {
            if (trelloSaveLinkBtn && trelloSaveLinkBtn.isConnected) trelloSaveLinkBtn.disabled = false;
        }
    });

    const readGithubRepoUrl = () => {
        const safe = toSafeGithubRepoUrl(githubRepoInput?.value || "");
        if (githubRepoInput && safe && githubRepoInput.value !== safe) {
            githubRepoInput.value = safe;
        }
        renderGithubRepoLibrary();
        return safe;
    };

    githubRepoInput?.addEventListener("change", () => {
        const raw = String(githubRepoInput.value || "").trim();
        if (!raw) {
            setGithubStatus("");
            return;
        }

        const safe = toSafeGithubRepoUrl(raw);
        if (!safe) {
            setGithubStatus("Enter a valid GitHub repository URL (github.com/owner/repo).", true);
            return;
        }
        setGithubStatus("Repository link looks valid. Click Save GitHub Sync.");
        renderGithubRepoLibrary();
    });

    githubLinkLibraryList?.addEventListener("click", (event) => {
        const useButton = event.target.closest("[data-github-library-use]");
        if (useButton) {
            const selectedUrl = toSafeGithubRepoUrl(useButton.getAttribute("data-github-library-use") || "");
            if (!selectedUrl) {
                return;
            }
            if (githubRepoInput) {
                githubRepoInput.value = selectedUrl;
            }
            setGithubStatus("Selected saved GitHub repository.", false, true);
            renderGithubRepoLibrary();
            return;
        }

        const openButton = event.target.closest("[data-github-library-open]");
        if (openButton) {
            const selectedUrl = toSafeGithubRepoUrl(openButton.getAttribute("data-github-library-open") || "");
            if (!selectedUrl) {
                return;
            }
            window.open(selectedUrl, "_blank", "noopener,noreferrer");
            setGithubStatus("Opened saved GitHub repository.", false, true);
        }
    });

    githubSaveLinkBtn?.addEventListener("click", async () => {
        const repoUrl = readGithubRepoUrl();
        if (!repoUrl) {
            setGithubStatus("Enter a valid GitHub repository URL first.", true);
            return;
        }

        const note = String(githubWorkNoteInput?.value || "").trim();
        if (githubSaveLinkBtn) githubSaveLinkBtn.disabled = true;
        setGithubStatus("Saving GitHub sync...");
        try {
            await persistStudentGithubSyncDirectlyToEvidence(projectId, email, detailData, taskTopicValue, repoUrl, note);
            try {
                await persistStudentGithubSync(projectId, email, repoUrl, note);
            } catch (_legacyError) {
                // my-evidence already contains github-sync rows; keep UX successful.
            }

            const verifiedRows = await fetchEvidenceRowsEnsuringAllocation(projectId, email);
            const verifiedRepoUrl = toSafeGithubRepoUrl(getFirstGithubRepoUrlFromEvidenceRows(verifiedRows));
            if (!verifiedRepoUrl) {
                throw new Error("GitHub link did not persist to your Task List evidence.");
            }

            githubRepoLibrary = addStoredGithubRepoLibraryLink(projectId, email, repoUrl);
            renderGithubRepoLibrary();
            setGithubStatus("GitHub sync saved and shared with teacher view.", false, true);
        } catch (error) {
            setGithubStatus(`${error?.message || "Could not save GitHub sync right now."}${formatApiDebugSuffix(error)}`, true);
        } finally {
            if (githubSaveLinkBtn && githubSaveLinkBtn.isConnected) githubSaveLinkBtn.disabled = false;
        }
    });

    githubOpenRepoBtn?.addEventListener("click", () => {
        const repoUrl = readGithubRepoUrl();
        if (!repoUrl) {
            setGithubStatus("Enter a valid GitHub repository URL first.", true);
            return;
        }

        window.open(repoUrl, "_blank", "noopener,noreferrer");
        setGithubStatus("Opened GitHub repository.", false, true);
    });

    trelloOpenCardBtn?.addEventListener("click", () => {
        const cardUrl = readCardUrl();
        if (!cardUrl) {
            setTrelloStatus("Enter a valid Trello card or board link first.", true);
            return;
        }

        window.open(cardUrl, "_blank", "noopener,noreferrer");
        setTrelloStatus("Opened Trello link.", false, true);
    });

    trelloSendLogBtn?.addEventListener("click", async () => {
        const cardUrl = readCardUrl();
        if (!cardUrl) {
            setTrelloStatus("Enter a valid Trello card or board link first.", true);
            return;
        }

        const myAllocation = interestData?.my_allocation || null;
        const assignedStandards = getEffectiveAssignedStandards(myAllocation, detailData);
        const completionPercent = getEvidenceCompletionPercentFromRows(myAllocation?.evidence_steps, assignedStandards);

        const note = String(trelloWorkNoteInput?.value || "").trim();
        if (trelloSendLogBtn) trelloSendLogBtn.disabled = true;
        setTrelloStatus("Sending log to Trello...");

        try {
            const response = await fetch("/api/integrations/trello/work-log", {
                method: "POST",
                headers: buildWriteHeaders(),
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
                trelloCardLibrary = addStoredTrelloCardLibraryLink(projectId, email, cardUrlFromApi);
                renderTrelloCardLibrary();
            }

            setTrelloStatus("Work log sent to Trello.", false, true);
        } catch (error) {
            setTrelloStatus(error.message || "Could not send log to Trello.", true);
        } finally {
            if (trelloSendLogBtn && trelloSendLogBtn.isConnected) trelloSendLogBtn.disabled = false;
        }
    });

    const readOneDriveFolderUrl = () => {
        const safe = toSafeOneDriveFolderUrl(oneDriveFolderInput?.value || "");
        if (oneDriveFolderInput && safe && oneDriveFolderInput.value !== safe) {
            oneDriveFolderInput.value = safe;
        }
        renderOneDriveLinkLibrary();
        return safe;
    };

    oneDriveFolderInput?.addEventListener("change", () => {
        const raw = String(oneDriveFolderInput.value || "").trim();
        if (!raw) {
            setOneDriveStatus("");
            return;
        }

        const safe = toSafeExternalUrl(raw);
        if (!safe) {
            setOneDriveStatus("Enter a valid OneDrive or SharePoint folder link.", true);
            return;
        }

        if (!/(onedrive\.live\.com|1drv\.ms|sharepoint\.com)/i.test(safe)) {
            setOneDriveStatus("Use a OneDrive or SharePoint folder URL so teacher access works.", true);
            return;
        }

        setOneDriveStatus("Link looks valid. Click Save OneDrive Link.");
        renderOneDriveLinkLibrary();
    });

    oneDriveLinkLibraryList?.addEventListener("click", (event) => {
        const useButton = event.target.closest("[data-onedrive-library-use]");
        if (useButton) {
            const selectedUrl = toSafeOneDriveFolderUrl(useButton.getAttribute("data-onedrive-library-use") || "");
            if (!selectedUrl) {
                return;
            }
            if (oneDriveFolderInput) {
                oneDriveFolderInput.value = selectedUrl;
            }
            setOneDriveStatus("Selected saved OneDrive link.");
            renderOneDriveLinkLibrary();
            return;
        }

        const openButton = event.target.closest("[data-onedrive-library-open]");
        if (openButton) {
            const selectedUrl = toSafeOneDriveFolderUrl(openButton.getAttribute("data-onedrive-library-open") || "");
            if (!selectedUrl) {
                return;
            }
            window.open(selectedUrl, "_blank", "noopener,noreferrer");
            setOneDriveStatus("Opened saved OneDrive link.");
        }
    });

    oneDriveSaveLinkBtn?.addEventListener("click", async () => {
        const folderUrl = readOneDriveFolderUrl();
        if (!folderUrl) {
            setOneDriveStatus("Enter a valid OneDrive or SharePoint folder link first.", true);
            return;
        }

        if (oneDriveSaveLinkBtn) oneDriveSaveLinkBtn.disabled = true;
        setOneDriveStatus("Saving OneDrive link...");
        try {
            await persistStudentOneDriveFolderLink(projectId, email, detailData, taskTopicValue, folderUrl);
            oneDriveLinkLibraryState = addStoredOneDriveLinkLibraryLink(projectId, email, folderUrl);
            renderOneDriveLinkLibrary();
            setOneDriveStatus("OneDrive link saved and shared with teacher view.");
        } catch (error) {
            const fallback = "Could not save OneDrive link right now.";
            setOneDriveStatus(`${error?.message || fallback}${formatApiDebugSuffix(error)}`, true);
        } finally {
            if (oneDriveSaveLinkBtn && oneDriveSaveLinkBtn.isConnected) oneDriveSaveLinkBtn.disabled = false;
        }
    });

    oneDriveOpenFolderBtn?.addEventListener("click", () => {
        const folderUrl = readOneDriveFolderUrl();
        if (!folderUrl) {
            setOneDriveStatus("Enter a valid OneDrive or SharePoint folder link first.", true);
            return;
        }

        window.open(folderUrl, "_blank", "noopener,noreferrer");
        setOneDriveStatus("Opened OneDrive folder.");
    });

    const readGoogleDriveFolderUrl = () => {
        const safe = toSafeGoogleDriveFolderUrl(googleDriveFolderInput?.value || "");
        if (googleDriveFolderInput && safe && googleDriveFolderInput.value !== safe) {
            googleDriveFolderInput.value = safe;
        }
        renderGoogleDriveLinkLibrary();
        return safe;
    };

    googleDriveFolderInput?.addEventListener("change", () => {
        const raw = String(googleDriveFolderInput.value || "").trim();
        if (!raw) {
            setGoogleDriveStatus("");
            return;
        }

        const safe = toSafeExternalUrl(raw);
        if (!safe) {
            setGoogleDriveStatus("Enter a valid Google Drive folder link.", true);
            return;
        }

        if (!/(drive\.google\.com)/i.test(safe)) {
            setGoogleDriveStatus("Use a Google Drive folder URL so teacher access works.", true);
            return;
        }

        setGoogleDriveStatus("Link looks valid. Click Save Google Drive Link.");
        renderGoogleDriveLinkLibrary();
    });

    googleDriveLinkLibraryList?.addEventListener("click", (event) => {
        const useButton = event.target.closest("[data-google-drive-library-use]");
        if (useButton) {
            const selectedUrl = toSafeGoogleDriveFolderUrl(useButton.getAttribute("data-google-drive-library-use") || "");
            if (!selectedUrl) {
                return;
            }
            if (googleDriveFolderInput) {
                googleDriveFolderInput.value = selectedUrl;
            }
            setGoogleDriveStatus("Selected saved Google Drive link.");
            renderGoogleDriveLinkLibrary();
            return;
        }

        const openButton = event.target.closest("[data-google-drive-library-open]");
        if (openButton) {
            const selectedUrl = toSafeGoogleDriveFolderUrl(openButton.getAttribute("data-google-drive-library-open") || "");
            if (!selectedUrl) {
                return;
            }
            window.open(selectedUrl, "_blank", "noopener,noreferrer");
            setGoogleDriveStatus("Opened saved Google Drive link.");
        }
    });

    googleDriveSaveLinkBtn?.addEventListener("click", async () => {
        const folderUrl = readGoogleDriveFolderUrl();
        if (!folderUrl) {
            setGoogleDriveStatus("Enter a valid Google Drive folder link first.", true);
            return;
        }

        if (googleDriveSaveLinkBtn) googleDriveSaveLinkBtn.disabled = true;
        setGoogleDriveStatus("Saving Google Drive link...");
        try {
            await persistStudentGoogleDriveFolderLink(projectId, email, detailData, taskTopicValue, folderUrl);
            googleDriveLinkLibraryState = addStoredGoogleDriveLinkLibraryLink(projectId, email, folderUrl);
            renderGoogleDriveLinkLibrary();
            setGoogleDriveStatus("Google Drive link saved and shared with teacher view.");
        } catch (error) {
            const fallback = "Could not save Google Drive link right now.";
            setGoogleDriveStatus(`${error?.message || fallback}${formatApiDebugSuffix(error)}`, true);
        } finally {
            if (googleDriveSaveLinkBtn && googleDriveSaveLinkBtn.isConnected) googleDriveSaveLinkBtn.disabled = false;
        }
    });

    googleDriveOpenFolderBtn?.addEventListener("click", () => {
        const folderUrl = readGoogleDriveFolderUrl();
        if (!folderUrl) {
            setGoogleDriveStatus("Enter a valid Google Drive folder link first.", true);
            return;
        }

        window.open(folderUrl, "_blank", "noopener,noreferrer");
        setGoogleDriveStatus("Opened Google Drive folder.");
    });

    // Toggle interest button handler
    const toggleBtn = section.querySelector("#interest-toggle-btn");
    if (toggleBtn && email) {
        toggleBtn.addEventListener("click", async () => {
            toggleBtn.disabled = true;
            try {
                const resp = await fetch(`/api/activities/${encodeURIComponent(projectId)}/interest`, {
                    method: "POST",
                    headers: buildWriteHeaders()
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
                    headers: buildWriteHeaders(),
                    body: JSON.stringify({ student_email: normalizedEmail })
                });

                if (!resp.ok) {
                    const errorData = await resp.json().catch(() => ({}));
                    throw new Error(errorData.error || "Could not add student.");
                }

                // Auto-assign standards from activity details so Progress button appears immediately.
                const autoStandards = deriveEvidenceStandardsFromDetailData(detailData);
                if (autoStandards.length) {
                    try {
                        await fetch(`/api/activities/${encodeURIComponent(projectId)}/interests/${encodeURIComponent(normalizedEmail)}/standards`, {
                            method: "PATCH",
                            headers: buildWriteHeaders(),
                            body: JSON.stringify({
                                standard_1: autoStandards[0] || "",
                                standard_2: autoStandards[1] || ""
                            })
                        });
                    } catch (_ignoreStandardsError) {
                        // Non-fatal: progress will still work via client-side fallback.
                    }
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

    const backfillButton = section.querySelector("#client-projects-backfill-btn");
    if (backfillButton && email) {
        const backfillStatus = section.querySelector("#client-projects-backfill-status");
        const setBackfillStatus = (message, isError = false) => {
            if (!backfillStatus) return;
            backfillStatus.textContent = String(message || "");
            backfillStatus.classList.toggle("is-error", Boolean(isError));
        };

        backfillButton.addEventListener("click", async () => {
            backfillButton.disabled = true;
            setBackfillStatus("Running backfill...");
            try {
                const resp = await fetch("/api/client-projects/backfill", {
                    method: "POST",
                    headers: buildWriteHeaders()
                });
                if (!resp.ok) {
                    const payload = await resp.json().catch(() => ({}));
                    throw new Error(payload?.error || "Could not run backfill.");
                }

                const payload = await resp.json().catch(() => ({}));
                const inserted = Number(payload?.inserted || 0);
                setBackfillStatus(`Backfill complete. ${inserted} student allocation(s) added.`);
                await loadAndRenderInterestSection(host, projectId, isTeacher, detailData);
            } catch (error) {
                setBackfillStatus(error.message || "Could not run backfill.", true);
            } finally {
                if (backfillButton && backfillButton.isConnected) backfillButton.disabled = false;
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
                        headers: buildWriteHeaders(),
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
