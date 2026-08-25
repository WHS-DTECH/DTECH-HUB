const TASK_LIST_AUTH_KEY = "hub_google_auth_v1";
const TASK_LIST_TRELLO_CARD_LINK_STORAGE_PREFIX = "hub_trello_card_link_v1";
const TASK_LIST_TRELLO_CARD_LIBRARY_STORAGE_PREFIX = "hub_trello_card_library_v1";
const TASK_TOPIC_SLIDE_SYNC_STORAGE_PREFIX = "hub_task_topic_slide_sync_v1";

const DIGITAL_OUTCOME_DETAILS_TASKS = [
    "Description - Google Slides: Describe the Digital Outcome: What is it, who is it for, and what should it do?",
    "Identify the target audience or end user for this outcome.",
    "Explain how the outcome will be developed.",
    "State how success will be measured or evaluated.",
    "What Tools and Techniques will be used?"
];

const RELEVANT_IMPLICATIONS_CATEGORIES = [
    "Social",
    "Cultural",
    "Legal",
    "Ethical",
    "Intellectual Property",
    "Privacy",
    "Accessibility",
    "Usability",
    "Functionality",
    "Aesthetics",
    "Sustainability and Future Proofing",
    "End-User Considerations",
    "Health and Safety"
];

const RELEVANT_IMPLICATION_ICON_FILES = {
    "End-User Considerations": "End User.png",
    "Accessibility": "Accessibility.png",
    "Usability": "Usability.png",
    "Social": "Social.png",
    "Privacy": "Privacy.png",
    "Cultural": "Cultural.png",
    "Legal": "Legal.png",
    "Ethical": "Ethical.png",
    "Sustainability and Future Proofing": "Futureproofing.png",
    "Aesthetics": "Aesthetics.png",
    "Functionality": "Functionality.png",
    "Health and Safety": "Health & Safety.png",
    "Intellectual Property": "Intellectual Property.png"
};

function getRelevantImplicationsIconUrl(category) {
    const fileName = RELEVANT_IMPLICATION_ICON_FILES[String(category || "").trim()];
    return fileName
        ? `/images/Relevant%20Implications/${encodeURIComponent(fileName)}`
        : "";
}

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
        "Achieved: Use recognised and appropriate project management techniques to plan the development of a digital technologies outcome.",
        "Achieved: Decompose the digital technologies outcome into smaller components.",
        "Achieved: Trial components of the outcome.",
        "Achieved: Test that the digital technologies outcome functions as intended.",
        "Achieved: Address relevant implications.",
        "Merit: Effectively use project management techniques to manage development, feedback and/or collaborative processes.",
        "Merit: Effectively trial multiple components and/or techniques.",
        "Merit: Effectively use information from testing and trialling to improve the functionality of the digital technologies outcome.",
        "Excellence: Synthesise information gained from the planning, testing and trialling of components.",
        "Excellence: Discuss how this information led to the development of a high-quality digital technologies outcome."
    ],
    "91893": [
        "Achieved: Using appropriate tools and techniques for the purpose and end users.",
        "Achieved: Applying appropriate data integrity and testing procedures.",
        "Achieved: Using relevant conventions for the media type.",
        "Achieved: Explaining relevant implications.",
        "Merit: Using information from testing procedures to improve the quality of the outcome.",
        "Merit: Applying relevant conventions to improve the quality of the outcome.",
        "Merit: Addressing relevant implications.",
        "Excellence: Iterative improvement throughout the design, development and testing process to produce a high-quality outcome.",
        "Excellence: Using efficient tools and techniques in the outcome's production."
    ]
};

const taskListState = {
    allItems: [],
    selectedId: "",
    fullEvidenceState: {},
    checklistState: {},
    checklistStandards: [],
    taskTopic: "",
    templateCopies: [],
    decompositionCoverage: null,
    identifiedComponentsCount: null
};

// Minimal Drive OAuth client for task list — only needs read access to list slides
const taskListDriveState = { tokenClient: null, accessToken: "", tokenExpiry: 0 };
const TASK_LIST_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

function getTaskListGoogleClientId() {
    return String(document.querySelector('meta[name="hub-google-client-id"]')?.content || "").trim();
}

function requestTaskListDriveToken() {
    return new Promise((resolve) => {
        if (taskListDriveState.accessToken && taskListDriveState.tokenExpiry > Date.now() + 60000) {
            resolve({ access_token: taskListDriveState.accessToken });
            return;
        }
        const clientId = getTaskListGoogleClientId();
        if (!clientId || !window.google?.accounts?.oauth2) {
            resolve({ error: "google_unavailable" });
            return;
        }
        if (!taskListDriveState.tokenClient) {
            taskListDriveState.tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: TASK_LIST_DRIVE_SCOPE,
                callback: (response) => {
                    if (!response.error && response.access_token) {
                        taskListDriveState.accessToken = response.access_token;
                        taskListDriveState.tokenExpiry = Date.now() + (Number(response.expires_in) || 3600) * 1000;
                    }
                    resolve(response);
                },
                error_callback: (err) => resolve({ error: err?.type || "access_denied" })
            });
        }
        taskListDriveState.tokenClient.requestAccessToken();
    });
}

function normalizeDigitalOutcomeChecklistRows(rows) {
    const sourceRows = Array.isArray(rows)
        ? rows.map((step) => ({ text: String(step?.text || "").trim(), done: Boolean(step?.done) }))
        : [];

    if (!sourceRows.length) {
        return DIGITAL_OUTCOME_DETAILS_TASKS.map((text) => ({ text, done: false }));
    }

    const legacyCombinedPattern = /explain\s+how\s+the\s+outcome\s+will\s+be\s+developed\s+and\s+what\s+tools\/?(?:technologies|techniques)\s+will\s+be\s+used/i;
    const normalized = DIGITAL_OUTCOME_DETAILS_TASKS.map((targetText) => {
        const target = String(targetText || "").trim();
        const exact = sourceRows.find((row) => row.text.toLowerCase() === target.toLowerCase());
        if (exact) {
            return { text: target, done: Boolean(exact.done) };
        }

        if (/^Explain how the outcome will be developed\.?$/i.test(target)) {
            const legacy = sourceRows.find((row) => legacyCombinedPattern.test(row.text));
            if (legacy) {
                return { text: target, done: Boolean(legacy.done) };
            }
        }

        return { text: target, done: false };
    });

    return normalized;
}

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

function buildCustomActivityLink(id, taskTopic = "", taskShortName = "", templateId = "") {
    const params = new URLSearchParams();
    params.set("id", String(id || "").trim());
    const safeTaskTopic = String(taskTopic || "").trim();
    const safeTaskShortName = String(taskShortName || "").trim();
    const safeTemplateId = String(templateId || "").trim();
    if (safeTaskTopic) {
        params.set("taskTopic", safeTaskTopic);
    }
    if (safeTaskShortName) {
        params.set("taskShortName", safeTaskShortName);
    }
    if (safeTemplateId) {
        params.set("templateId", safeTemplateId);
    }
    return `/ProjectPages/custom-activity.html?${params.toString()}`;
}

function buildTemplateLibraryLink(id, taskTopic = "", taskShortName = "", templateId = "", preFilterTopic = "") {
    const params = new URLSearchParams();
    params.set("activityId", String(id || "").trim());

    const safeTaskTopic = String(taskTopic || "").trim();
    const safeTaskShortName = String(taskShortName || "").trim();
    const safeTemplateId = String(templateId || "").trim();
    const safePreFilterTopic = String(preFilterTopic || "").trim();

    if (safeTaskTopic) {
        params.set("taskTopic", safeTaskTopic);
    }
    if (safeTaskShortName) {
        params.set("taskShortName", safeTaskShortName);
    }
    if (safeTemplateId) {
        params.set("templateId", safeTemplateId);
    }
    if (safePreFilterTopic) {
        params.set("preFilterTopic", safePreFilterTopic);
    }

    return `/ProjectPages/slideshow-template-library.html?${params.toString()}`;
}

function getTopicTypeLabel(detail) {
    const type = String(detail?.type || detail?.topicType || detail?.topic_type || "").trim();
    return type || "Not set";
}

function isDigitalMediaTopicType(detail) {
    return getTopicTypeLabel(detail).trim().toLowerCase() === "digital media";
}

function hasDigitalMediaTopicType(detail, allItems = []) {
    return isDigitalMediaTopicType(detail)
        || (Array.isArray(allItems) && allItems.some((item) => isDigitalMediaTopicType(item)));
}

function deriveTaskShortName(taskTopic) {
    const normalized = String(taskTopic || "").trim();
    if (!normalized) return "Task List";
    if (/client projects/i.test(normalized)) return "Client Projects";
    if (/project management/i.test(normalized)) return "Project Management";
    if (/describe.*digital outcome|description\s*-\s*google\s*slides/i.test(normalized)) return "Digital Outcome Description";
    if (/identify\s+the\s+target\s+audience|target\s+audience|end\s+user/i.test(normalized)) return "Target Audience";
    if (/trial\s+(?:the\s+)?components|triall?ing\s+(?:the\s+)?components|trailing\s+components/i.test(normalized)) return "Trialling Components";
    if (/testing\s+functions|test(?:ing)?\s+that\s+the\s+digital\s+technologies\s+outcome\s+functions/i.test(normalized)) return "Testing Functions";
    if (/what\s+tools\s+and\s+techniques\s+will\s+be\s+used/i.test(normalized)) return "Tools and Techniques";
    if (/explain\s+how\s+the\s+outcome\s+will\s+be\s+developed|tools\/?technologies|development\s+steps|outcome\s+developed/i.test(normalized)) return "Development Steps";
    if (/relevant\s+implications/i.test(normalized)) return "Relevant Implications";
    if (/state\s+how\s+success\s+will\s+be\s+measured|success\s+will\s+be\s+evaluated|project\s+success\s+criteria|success\s+criteria/i.test(normalized)) return "Success Criteria";
    if (/digital outcome/i.test(normalized)) return "Digital Outcome";
    return normalized;
}

function inferDigitalOutcomeTaskTemplateId(taskText) {
    const normalized = String(taskText || "").trim().toLowerCase();
    if (!normalized) return "";
    if (/describe.*digital outcome|description\s*-\s*google\s*slides/.test(normalized)) return "digital-outcome-description";
    if (/identify\s+the\s+target\s+audience|target\s+audience|end\s+user/.test(normalized)) return "target-audience";
    if (/trial\s+(?:the\s+)?components|triall?ing\s+(?:the\s+)?components|trailing\s+components/.test(normalized)) return "trialling-components";
    if (/testing\s+functions|test(?:ing)?\s+that\s+the\s+digital\s+technologies\s+outcome\s+functions/.test(normalized)) return "testing-functions";
    if (/explain\s+how\s+the\s+outcome\s+will\s+be\s+developed|tools\/?technologies|development\s+steps|outcome\s+developed|relevant\s+implications/.test(normalized)) return "relevant-implications";
    if (/state\s+how\s+success\s+will\s+be\s+measured|success\s+will\s+be\s+evaluated|project\s+success\s+criteria|success\s+criteria/.test(normalized)) return "project-success-criteria";
    return "";
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

function readStoredTaskTopicSlideSyncEntry(projectId, email, taskTopic, taskShortName = "") {
    const key = getTaskTopicSlideSyncStorageKey(projectId, email, taskTopic, taskShortName);
    try {
        const raw = localStorage.getItem(key);
        if (!raw) {
            return { url: "" };
        }
        const parsed = JSON.parse(raw);
        const url = String(parsed?.url || "").trim();
        const syncSource = String(parsed?.syncSource || "").trim().toLowerCase();
        return { url, syncSource };
    } catch (_error) {
        return { url: "", syncSource: "" };
    }
}

function isCompletionEligibleSyncEntry(entry, taskTopicText = "") {
    const safeUrl = String(entry?.url || "").trim();
    const syncSource = String(entry?.syncSource || "").trim().toLowerCase();
    if (!safeUrl) {
        return false;
    }

    // Completion should only come from explicit student action.
    // Exclude "manual-link" (teacher Sync Slideshow actions) from auto-completion.
    if (syncSource === "template-use" || syncSource === "manual-submit") {
        return true;
    }

    // Page-by-page rollout: folder match is currently allowed only for Description/Target Audience.
    if (syncSource === "folder-match") {
        const normalizedTopic = String(taskTopicText || "").trim().toLowerCase();
        if (normalizedTopic.includes("describe the digital outcome") || normalizedTopic.includes("description - google slides")) {
            return true;
        }
        if (normalizedTopic.includes("target audience") || normalizedTopic.includes("end user")) {
            return true;
        }
    }

    // Backward-compatibility: legacy sync entries created before syncSource existed.
    if (!syncSource) {
        const normalizedTopic = String(taskTopicText || "").trim().toLowerCase();
        if (normalizedTopic.includes("describe the digital outcome") || normalizedTopic.includes("description - google slides")) {
            return true;
        }
        if (normalizedTopic.includes("target audience") || normalizedTopic.includes("end user")) {
            return true;
        }
    }

    return false;
}

function hasSyncedSlideForTaskTopic(projectId, email, taskTopicText) {
    const safeTopic = String(taskTopicText || "").trim();
    if (!projectId || !email || !safeTopic) {
        return false;
    }
    const derivedShort = deriveTaskShortName(safeTopic);
    const withShort = readStoredTaskTopicSlideSyncEntry(projectId, email, safeTopic, derivedShort);
    if (isCompletionEligibleSyncEntry(withShort, safeTopic)) {
        return true;
    }
    const withoutShort = readStoredTaskTopicSlideSyncEntry(projectId, email, safeTopic, "");
    if (isCompletionEligibleSyncEntry(withoutShort, safeTopic)) {
        return true;
    }

    const expectedShortName = deriveTaskShortName(safeTopic);
    const keyPrefix = `${TASK_TOPIC_SLIDE_SYNC_STORAGE_PREFIX}:${String(projectId || "").trim()}:${String(email || "").trim().toLowerCase()}:`;
    const shortSlug = normalizeTaskTopicStorageSlug(expectedShortName);
    if (!shortSlug) {
        return false;
    }

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
            const parsed = raw ? JSON.parse(raw) : null;
            if (isCompletionEligibleSyncEntry(parsed || {}, safeTopic)) {
                return true;
            }
        }
    } catch (_error) {
    }

    return false;
}

function hasEligibleTemplateSyncById(projectId, email, templateId) {
    const safeProjectId = String(projectId || "").trim();
    const safeEmail = String(email || "").trim().toLowerCase();
    const targetTemplateId = String(templateId || "").trim().toLowerCase();
    if (!safeProjectId || !safeEmail || !targetTemplateId) {
        return false;
    }

    const keyPrefix = `${TASK_TOPIC_SLIDE_SYNC_STORAGE_PREFIX}:${safeProjectId}:${safeEmail}:`;
    try {
        for (let index = 0; index < localStorage.length; index += 1) {
            const key = String(localStorage.key(index) || "");
            if (!key.startsWith(keyPrefix)) {
                continue;
            }

            const raw = localStorage.getItem(key);
            const parsed = raw ? JSON.parse(raw) : null;
            const parsedTemplateId = String(parsed?.templateId || "").trim().toLowerCase();
            if (parsedTemplateId !== targetTemplateId) {
                continue;
            }

            if (isCompletionEligibleSyncEntry(parsed || {}, "relevant implications")) {
                return true;
            }
        }
    } catch (_error) {
    }

    return false;
}

function getLatestTemplateSyncUrlById(projectId, email, templateId) {
    const safeProjectId = String(projectId || "").trim();
    const safeEmail = String(email || "").trim().toLowerCase();
    const targetTemplateId = String(templateId || "").trim().toLowerCase();
    if (!safeProjectId || !safeEmail || !targetTemplateId) {
        return "";
    }

    const keyPrefix = `${TASK_TOPIC_SLIDE_SYNC_STORAGE_PREFIX}:${safeProjectId}:${safeEmail}:`;
    let bestUrl = "";
    let bestTs = 0;

    try {
        for (let index = 0; index < localStorage.length; index += 1) {
            const key = String(localStorage.key(index) || "");
            if (!key.startsWith(keyPrefix)) {
                continue;
            }

            const raw = localStorage.getItem(key);
            const parsed = raw ? JSON.parse(raw) : null;
            const parsedTemplateId = String(parsed?.templateId || "").trim().toLowerCase();
            const isRelevantImplicationsFamily = targetTemplateId === "relevant-implications"
                && (parsedTemplateId === "relevant-implications" || parsedTemplateId.startsWith("relevant-implications-"));
            if (!isRelevantImplicationsFamily && parsedTemplateId !== targetTemplateId) {
                continue;
            }

            const candidateUrl = String(parsed?.url || "").trim();
            if (!candidateUrl) {
                continue;
            }

            const savedAt = String(parsed?.savedAt || "").trim();
            const ts = Date.parse(savedAt);
            const safeTs = Number.isFinite(ts) ? ts : 0;
            if (safeTs >= bestTs) {
                bestTs = safeTs;
                bestUrl = candidateUrl;
            }
        }
    } catch (_error) {
        return "";
    }

    return bestUrl;
}

function getStepLevel(text) {
    const normalized = String(text || "").trim().toLowerCase();
    if (normalized.startsWith("achieved:")) return "Achieved";
    if (normalized.startsWith("merit:")) return "Merit";
    if (normalized.startsWith("excellence:")) return "Excellence";
    return "";
}

function stripStepLevel(text) {
    return String(text || "").replace(/^(Achieved|Merit|Excellence):\s*/i, "").trim();
}

function buildRelevantImplicationsCategoryStepText(category) {
    return `Achieved: Relevant implications category - ${String(category || "").trim()}`;
}

function normalizeRelevantImplicationsCategoryKey(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function parseRelevantImplicationsCategoryFromStep(text) {
    const stepText = stripStepLevel(text);
    const match = String(stepText || "").match(/^relevant\s+implications\s+category\s*-\s*(.+)$/i);
    return match?.[1] ? String(match[1]).trim() : "";
}

function isRelevantImplicationsCategoryStep(text) {
    return Boolean(parseRelevantImplicationsCategoryFromStep(text));
}

function isMainRelevantImplicationsStep(text) {
    if (getStepLevel(text) !== "Achieved") {
        return false;
    }
    return /explain(?:ing)?\s+relevant\s+implications\.?$/i.test(stripStepLevel(text));
}

function normalize91897ChecklistRows(rows) {
    const sourceRows = Array.isArray(rows)
        ? rows.map((step) => ({ text: String(step?.text || "").trim(), done: Boolean(step?.done) })).filter((step) => step.text)
        : [];

    if (!sourceRows.length) {
        return sourceRows;
    }

    const mainRelevantImplicationsIndex = sourceRows.findIndex((step) => isMainRelevantImplicationsStep(step?.text));

    if (mainRelevantImplicationsIndex === -1) {
        return sourceRows;
    }

    const existingCategoryDoneMap = new Map();
    sourceRows.forEach((step) => {
        const category = parseRelevantImplicationsCategoryFromStep(step?.text);
        if (!category) return;
        existingCategoryDoneMap.set(normalizeRelevantImplicationsCategoryKey(category), Boolean(step?.done));
    });

    const withoutCategoryRows = sourceRows.filter((step) => !isRelevantImplicationsCategoryStep(step?.text));
    const refreshedMainIndex = withoutCategoryRows.findIndex((step) => isMainRelevantImplicationsStep(step?.text));

    if (refreshedMainIndex === -1) {
        return withoutCategoryRows;
    }

    const categoryRows = RELEVANT_IMPLICATIONS_CATEGORIES.map((category) => {
        const key = normalizeRelevantImplicationsCategoryKey(category);
        return {
            text: buildRelevantImplicationsCategoryStepText(category),
            done: Boolean(existingCategoryDoneMap.get(key))
        };
    });

    return [
        ...withoutCategoryRows.slice(0, refreshedMainIndex + 1),
        ...categoryRows,
        ...withoutCategoryRows.slice(refreshedMainIndex + 1)
    ];
}

function countCompletedRelevantImplicationsCategories(rows) {
    const sourceRows = Array.isArray(rows) ? rows : [];
    return sourceRows.filter((step) => {
        if (getStepLevel(step?.text) !== "Achieved") {
            return false;
        }
        if (!isRelevantImplicationsCategoryStep(step?.text)) {
            return false;
        }
        return Boolean(step?.done);
    }).length;
}

function clearAddressRelevantImplicationsTicks(stateMap) {
    let changed = false;
    Object.values(stateMap || {}).forEach((rows) => {
        if (!Array.isArray(rows)) return;
        rows.forEach((row) => {
            const text = String(row?.text || "").trim();
            if (!isAddressRelevantImplicationsStep(text)) return;
            if (Boolean(row.done)) {
                row.done = false;
                changed = true;
            }
        });
    });
    return changed;
}

function isAddressRelevantImplicationsStep(text) {
    return /address(?:ing)?\s+relevant\s+implications\.?$/i.test(stripStepLevel(text));
}

// Applies DB-sourced template copy records to fix which categories are actually done
function applyTemplateCopiesAsRelevantImplicationsState(stateMap, templateCopies) {
    const rows = Array.isArray(stateMap?.["91897"]) ? stateMap["91897"] : [];
    if (!rows.length || !Array.isArray(templateCopies) || !templateCopies.length) return false;

    // Build set of categories confirmed by DB records
    const usedCategoryKeys = new Set();
    templateCopies.forEach((copy) => {
        // Match by templateTitle (e.g. "Relevant Implications - Functionality")
        const title = String(copy?.templateTitle || "").trim();
        const titleMatch = title.match(/^relevant\s+implications\s*-\s*(.+)$/i);
        if (titleMatch?.[1]) {
            usedCategoryKeys.add(normalizeRelevantImplicationsCategoryKey(titleMatch[1].trim()));
        }
    });

    if (!usedCategoryKeys.size) return false;

    let changed = false;
    rows.forEach((row) => {
        const text = String(row?.text || "").trim();

        if (isRelevantImplicationsCategoryStep(text)) {
            const category = parseRelevantImplicationsCategoryFromStep(text);
            if (!category) return;
            const shouldBeDone = usedCategoryKeys.has(normalizeRelevantImplicationsCategoryKey(category));
            if (Boolean(row.done) !== shouldBeDone) {
                row.done = shouldBeDone;
                changed = true;
            }
            return;
        }

        if (getStepLevel(text) === "Merit"
            && stripStepLevel(text).toLowerCase().includes("address relevant implications")) {
            if (Boolean(row.done)) {
                row.done = false;
                changed = true;
            }
        }
    });
    return changed;
}

function getAchievedSectionMeta(stepText) {
    const normalized = String(stepText || "").trim().toLowerCase();
    if (!normalized) return null;

    if (normalized.includes("project management") || normalized.includes("decompos") || normalized.includes("features") || normalized.includes("requirements")) {
        return { id: "project-management", title: "Section 1: Project Management & Decomposition" };
    }

    if (normalized.includes("trial") || normalized.includes("test")) {
        return { id: "testing-trialing", title: "Section 2: Testing & Trialing" };
    }

    if (normalized.includes("relevant implications")) {
        return { id: "relevant-implications", title: "Section 3: Relevant Implications" };
    }

    return null;
}

function getTaskTopicHrefForStep(standard, level, text) {
    const safeText = String(text || "").trim();
    if (!safeText || !taskListState.selectedId) return "";

    const normalized = safeText.toLowerCase();
    const normalizedLevel = String(level || "").toLowerCase();

    if (String(standard) === "91897" && normalized.includes("project management")) {
        return buildCustomActivityLink(taskListState.selectedId, "Project Management");
    }

    if (String(standard) === "91897" && normalized.includes("decompos")) {
        return buildCustomActivityLink(taskListState.selectedId, "Decomposition of Tasks", "Decomposition of Tasks", "decomposition-tasks");
    }

    if (String(standard) === "91897" && normalized.includes("relevant implications")) {
        return buildCustomActivityLink(taskListState.selectedId, safeText, "Relevant Implications", "relevant-implications");
    }

    if (String(standard) === "91893" && normalized.includes("explaining relevant implications")) {
        return buildCustomActivityLink(taskListState.selectedId, "Explaining relevant implications.", "Relevant Implications", "relevant-implications");
    }

    if (String(standard) === "91893" && normalized.includes("addressing relevant implications")) {
        return buildCustomActivityLink(taskListState.selectedId, "Addressing relevant implications.", "Relevant Implications", "relevant-implications");
    }

    if ((String(standard) === "91897" || String(standard) === "91907")
        && /trial\s+(?:the\s+)?components|triall?ing\s+(?:the\s+)?components|trailing\s+components/.test(normalized)) {
        return buildCustomActivityLink(taskListState.selectedId, safeText, "Trialling Components", "trialling-components");
    }

    if ((String(standard) === "91897" || String(standard) === "91907")
        && /testing\s+functions|test(?:ing)?\s+that\s+the\s+digital\s+technologies\s+outcome\s+functions/.test(normalized)) {
        return buildCustomActivityLink(taskListState.selectedId, safeText, "Testing Functions", "testing-functions");
    }

    if (String(standard) === "91897" && normalized.includes("what tools and techniques")) {
        return buildCustomActivityLink(taskListState.selectedId, "What Tools and Techniques will be used?", "Tools and Techniques");
    }

    if (String(standard) === "digital-outcome") {
        const shortName = deriveTaskShortName(safeText);
        const templateId = inferDigitalOutcomeTaskTemplateId(safeText);
        return buildCustomActivityLink(taskListState.selectedId, safeText, shortName, templateId);
    }

    if (normalizedLevel === "achieved" && normalized.includes("version control")) {
        return buildCustomActivityLink(taskListState.selectedId, "Project Management");
    }

    const derivedShortName = deriveTaskShortName(safeText);
    return buildCustomActivityLink(taskListState.selectedId, safeText, derivedShortName);
}

const DECOMPOSITION_CATEGORY_COVERAGE_STORAGE_PREFIX = "hub_decomp_category_coverage_v1";

// Keyword patterns must stay in step with the Decomposition page in ProjectPages/activity-detail.js.
const DECOMPOSITION_TASK_CATEGORIES = [
    {
        label: "Development Steps",
        pattern: /develop|build|implement|code|coding|program|script|create|add|feature|functionality|page|layout|design|html|css|javascript|step/i
    },
    {
        label: "Tools & Techniques",
        pattern: /tool|technique|software|library|framework|template|api|plugin|extension|github|trello|onedrive|google drive|vs code|setup|set up|install|sync|version control/i
    },
    {
        label: "Success Criteria",
        pattern: /success|criteria|test|testing|trial|evaluat|measure|review|quality|requirement|spec|acceptance|check|debug|fix/i
    },
    {
        label: "Client Interaction",
        pattern: /client|stakeholder|end.?user|feedback|meeting|interview|survey|consult|brief|present|sign.?off|approval/i
    }
];

function formatTaskListTimestamp(value) {
    const raw = String(value || "").trim();
    if (!raw) return "not yet";
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return "not yet";
    return parsed.toLocaleString("en-NZ", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function getDecompositionCategoryCoverageKey(activityId, email) {
    return `${DECOMPOSITION_CATEGORY_COVERAGE_STORAGE_PREFIX}:${String(activityId || "").trim()}:${String(email || "").trim().toLowerCase()}`;
}

function countDecompositionTaskCategories(cards) {
    const haystacks = (Array.isArray(cards) ? cards : [])
        .map((card) => String(card?.name || "").trim())
        .filter(Boolean);

    return DECOMPOSITION_TASK_CATEGORIES.map((category) => ({
        label: category.label,
        count: haystacks.filter((text) => category.pattern.test(text)).length
    }));
}

function writeDecompositionCategoryCoverage(activityId, email, rows) {
    try {
        localStorage.setItem(
            getDecompositionCategoryCoverageKey(activityId, email),
            JSON.stringify({ savedAt: new Date().toISOString(), categories: Array.isArray(rows) ? rows : [] })
        );
    } catch (_error) {
    }
}

function findStudentTrelloBoardUrl(stateMap) {
    let fallbackUrl = "";

    for (const steps of Object.values(stateMap || {})) {
        for (const step of (Array.isArray(steps) ? steps : [])) {
            const text = String(step?.text || "").trim();
            if (!text) continue;

            if (text.startsWith("TRELLO_CARD_URL|")) {
                const url = text.slice("TRELLO_CARD_URL|".length).trim();
                if (/\/b\//i.test(url)) return url;
                if (!fallbackUrl) fallbackUrl = url;
            } else if (/https?:\/\/(www\.)?trello\.com\//i.test(text)) {
                const match = text.match(/https?:\/\/\S*trello\.com\/\S+/i);
                if (match?.[0]) {
                    if (/\/b\//i.test(match[0])) return match[0];
                    if (!fallbackUrl) fallbackUrl = match[0];
                }
            }
        }
    }

    return fallbackUrl;
}

// Counts come from the database first; local storage is only a fallback for an offline/not-yet-synced student.
function readDecompositionCategoryCoverage(activityId, email) {
    const toCounts = (rows) => {
        const counts = {};
        (Array.isArray(rows) ? rows : []).forEach((row) => {
            const label = String(row?.label || "").trim();
            if (label) counts[label] = Number(row?.count || 0);
        });
        return counts;
    };

    const serverCoverage = taskListState.decompositionCoverage;
    if (serverCoverage?.found && String(serverCoverage.activityId || "") === String(activityId || "")) {
        return {
            counts: toCounts(serverCoverage.categories),
            savedAt: String(serverCoverage.syncedAt || serverCoverage.updatedAt || "").trim(),
            hasData: true
        };
    }

    try {
        const raw = localStorage.getItem(getDecompositionCategoryCoverageKey(activityId, email));
        const parsed = JSON.parse(raw || "{}");
        const rows = Array.isArray(parsed?.categories) ? parsed.categories : [];
        return { counts: toCounts(rows), savedAt: String(parsed?.savedAt || "").trim(), hasData: rows.length > 0 };
    } catch (_error) {
        return { counts: {}, savedAt: "", hasData: false };
    }
}

async function loadDecompositionCoverageFromServer(activityId) {
    const safeActivityId = String(activityId || "").trim();
    if (!safeActivityId || !getTaskListEmail()) {
        taskListState.decompositionCoverage = null;
        return null;
    }

    try {
        const payload = await loadJson(
            `/api/students/decomposition-coverage?activity_id=${encodeURIComponent(safeActivityId)}`,
            { headers: buildTaskListHeaders({}) }
        );
        taskListState.decompositionCoverage = {
            activityId: safeActivityId,
            found: Boolean(payload?.found),
            categories: Array.isArray(payload?.categories) ? payload.categories : [],
            trelloTaskCount: Number(payload?.trello_task_count || 0),
            syncedAt: String(payload?.synced_at || "").trim(),
            updatedAt: String(payload?.updated_at || "").trim()
        };
        return taskListState.decompositionCoverage;
    } catch (_error) {
        taskListState.decompositionCoverage = null;
        return null;
    }
}

async function saveDecompositionCoverageToServer(activityId, rows, trelloTaskCount) {
    const safeActivityId = String(activityId || "").trim();
    if (!safeActivityId) return null;

    try {
        const payload = await loadJson("/api/students/decomposition-coverage", {
            method: "POST",
            headers: buildTaskListHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({
                activity_id: safeActivityId,
                categories: Array.isArray(rows) ? rows : [],
                trello_task_count: Number(trelloTaskCount || 0)
            })
        });
        taskListState.decompositionCoverage = {
            activityId: safeActivityId,
            found: Boolean(payload?.found),
            categories: Array.isArray(payload?.categories) ? payload.categories : [],
            trelloTaskCount: Number(payload?.trello_task_count || 0),
            syncedAt: String(payload?.synced_at || "").trim(),
            updatedAt: String(payload?.updated_at || "").trim()
        };
        return taskListState.decompositionCoverage;
    } catch (_error) {
        return null;
    }
}

function getDecompositionSubtasks(stateMap) {
    const activityId = taskListState.selectedId;
    if (!activityId) return [];

    const digitalOutcomeRows = Array.isArray(stateMap?.["digital-outcome"])
        ? stateMap["digital-outcome"]
        : [];
    const isComplete = (matcher) => digitalOutcomeRows.some((step) =>
        Boolean(step?.done) && matcher.test(String(step?.text || ""))
    );

    const coverage = readDecompositionCategoryCoverage(activityId, getTaskListEmail());
    const withCoverage = (row) => ({
        ...row,
        trelloCount: Number(coverage.counts[row.label] || 0),
        coverageKnown: coverage.hasData,
        coverageSavedAt: coverage.savedAt
    });

    return [
        withCoverage({
            label: "Development Steps",
            href: buildCustomActivityLink(activityId, "Explain how the outcome will be developed.", "Development Steps", "development-steps"),
            done: isComplete(/explain how the outcome will be developed/i)
        }),
        withCoverage({
            label: "Tools & Techniques",
            href: buildCustomActivityLink(activityId, "What Tools and Techniques will be used?", "Tools & Techniques", "tools-and-techniques"),
            done: isComplete(/what tools and techniques will be used/i)
        }),
        withCoverage({
            label: "Success Criteria",
            href: buildCustomActivityLink(activityId, "State how success will be measured or evaluated.", "Success Criteria", "project-success-criteria"),
            done: isComplete(/state how success will be measured or evaluated/i)
        }),
        withCoverage({
            label: "Client Interaction",
            href: buildCustomActivityLink(activityId, "Client Interaction", "Client Interaction"),
            done: false
        })
    ];
}

function getStoredTriallingComponentsUrl(projectId, email) {
    const localUrl = getLatestTemplateSyncUrlById(projectId, email, "trialling-components");
    if (localUrl) return localUrl;

    const databaseCopy = (Array.isArray(taskListState.templateCopies) ? taskListState.templateCopies : [])
        .find((copy) => String(copy?.templateId || "").trim().toLowerCase() === "trialling-components");
    return String(databaseCopy?.fileUrl || "").trim();
}

// Surfaces the "digital-outcome" checklist row as a subtask of the Trialling Components box.
function getDigitalOutcomeToolsTechniquesSubtask() {
    const rows = Array.isArray(taskListState.checklistState?.["digital-outcome"])
        ? taskListState.checklistState["digital-outcome"]
        : [];
    const index = rows.findIndex((step) => /what tools and techniques will be used/i.test(String(step?.text || "")));
    if (index < 0) return null;

    return {
        index,
        done: Boolean(rows[index]?.done),
        href: buildCustomActivityLink(taskListState.selectedId, "What Tools and Techniques will be used?", "Tools and Techniques", "tools-and-techniques")
    };
}

async function loadIdentifiedComponentsCount(projectId, email) {
    try {
        const stored = await loadJson(
            `/api/students/trialling-components?activity_id=${encodeURIComponent(projectId)}`,
            { headers: buildTaskListHeaders({}) }
        );
        if (stored?.found) {
            taskListState.identifiedComponentsCount = Math.max(0, Number.parseInt(stored.component_count, 10) || 0);
        }
    } catch (_error) {
    }

    const triallingComponentsUrl = getStoredTriallingComponentsUrl(projectId, email);
    const triallingComponentsId = String(triallingComponentsUrl || "").match(/presentation\/d\/([A-Za-z0-9_-]+)/)?.[1] || "";
    const driveAccessToken = String(taskListDriveState.accessToken || "").trim();
    if (!triallingComponentsId || !driveAccessToken) {
        return Number.isFinite(taskListState.identifiedComponentsCount)
            ? taskListState.identifiedComponentsCount
            : null;
    }

    try {
        const payload = await loadJson("/api/student/drive-setup/read-trialling-components", {
            method: "POST",
            headers: buildTaskListHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ driveAccessToken, presentationId: triallingComponentsId, activityId: projectId })
        });
        const rows = Array.isArray(payload?.rows) ? payload.rows : [];
        const components = rows.length
            ? rows.filter((row) => String(row?.component || "").trim())
            : (Array.isArray(payload?.components) ? payload.components.filter((component) => String(component || "").trim()) : []);
        taskListState.identifiedComponentsCount = Math.max(0, Number.parseInt(payload?.component_count, 10) || components.length);
        return taskListState.identifiedComponentsCount;
    } catch (_error) {
        return Number.isFinite(taskListState.identifiedComponentsCount)
            ? taskListState.identifiedComponentsCount
            : null;
    }
}

function getProjectManagementSubtasks(stateMap) {
    const activityId = taskListState.selectedId;
    if (!activityId) return [];

    const systems = inferStudentSystemConnections(stateMap || {});
    return [
        {
            label: "Trello",
            href: buildCustomActivityLink(activityId, "Project Management", "Project Management"),
            done: systems.trelloConnected
        },
        {
            label: "GitHub",
            href: buildCustomActivityLink(activityId, "Version Control: GitHub", "Version Control: GitHub"),
            done: systems.githubConnected
        },
        {
            label: "OneDrive",
            href: buildCustomActivityLink(activityId, "Version Control: Microsoft OneDrive", "Version Control: Microsoft OneDrive"),
            done: systems.oneDriveConnected
        },
        {
            label: "Google Drive",
            href: buildCustomActivityLink(activityId, "Version Control: Google Drive", "Version Control: Google Drive"),
            done: systems.googleDriveConnected
        }
    ];
}

function getFirstGoogleFormUrlFromEvidenceRows(stateMap) {
    for (const steps of Object.values(stateMap || {})) {
        for (const step of (Array.isArray(steps) ? steps : [])) {
            const text = String(step?.text || "").trim();
            if (!text.startsWith("GOOGLE_FORM_URL|")) continue;
            const url = text.slice("GOOGLE_FORM_URL|".length).trim();
            if (/^https:\/\/(?:forms\.gle\/|docs\.google\.com\/forms\/)/i.test(url)) return url;
        }
    }
    return "";
}

function getTestingFunctionsSubtasks(stateMap) {
    const activityId = taskListState.selectedId;
    const formUrl = getFirstGoogleFormUrlFromEvidenceRows(stateMap);
    return [{
        label: "Google Form",
        href: buildCustomActivityLink(activityId, "Test that the digital technologies outcome functions as intended.", "Testing Functions", "testing-functions"),
        done: Boolean(formUrl),
        url: formUrl
    }];
}

function getProjectManagementSystemLogo(systemName) {
    const system = String(systemName || "").trim().toLowerCase();
    if (system === "trello") {
        return `<svg class="task-list-system-logo task-list-system-logo-trello" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor"/><rect x="7" y="7" width="4" height="10" rx="1" fill="#ffffff"/><rect x="13" y="7" width="4" height="7" rx="1" fill="#ffffff"/></svg>`;
    }
    if (system === "github") {
        return `<svg class="task-list-system-logo task-list-system-logo-github" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.084-.729.084-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.762-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.292-1.552 3.295-1.23 3.295-1.23.647 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.216.69.825.575C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`;
    }
    if (system === "google form") {
        return `<svg class="task-list-system-logo task-list-system-logo-google-form" viewBox="0 0 24 24" aria-hidden="true"><path fill="#673ab7" d="M6 2h9l3 3v17H6z"/><path fill="#ffffff" d="M14 2v4h4z"/><path fill="#ffffff" d="M9 10h6v1.5H9zm0 3h6v1.5H9zm0 3h4v1.5H9z"/></svg>`;
    }
    if (system === "onedrive") {
        return `<svg class="task-list-system-logo task-list-system-logo-onedrive" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.3 17.7h9.1a3.6 3.6 0 0 0 .5-7.1A6.1 6.1 0 0 0 6.4 9.4a4.2 4.2 0 0 0 1.9 8.3Z" fill="currentColor"/><path d="M7.1 16.6h9.6" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/></svg>`;
    }
    return `<svg class="task-list-system-logo task-list-system-logo-drive" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.3 3h5.1l6.3 10.9h-5.1L9.3 3Z" fill="#0f9d58"/><path d="m3.4 13.9 2.5-4.4h12.5l-2.5 4.4H3.4Z" fill="#4285f4"/><path d="m6.3 18.8-2.9-4.9L9.3 3l2.6 4.4-5.6 11.4Z" fill="#f4b400"/></svg>`;
}

function isInformationalCriteriaRow(standard, level, text) {
    if (standard !== "91893" && standard !== "91897" && standard !== "91907") {
        return false;
    }

    const normalized = stripStepLevel(text).toLowerCase();
    if (standard === "91893" && level === "Excellence") {
        return /^iterative improvement throughout the design, development and testing process to produce a high-quality outcome\.?$/.test(normalized);
    }

    if (standard === "91893" && level === "Merit") {
        return /^using information from testing procedures to improve the quality of the outcome\.?$/.test(normalized);
    }

    if (level === "Merit") {
        return /^(?:effectively\s+)?(?:use|using) information (?:appropriately )?from testing and trialling to improve the functionality of the digital technologies outcome\.?$/.test(normalized);
    }

    if (level === "Excellence") {
        return /^synthesise information gained from the planning, testing and trialling of components\.?$/.test(normalized)
            || /^discuss(?:ing)? how (?:the|this) information from planning, testing and trialling of components (?:assisted(?: in)?|led to) the development of a high-quality (?:digital technologies )?outcome\.?$/.test(normalized)
            || /^discussing how the information from planning, testing and trialling of components assisted the development of a high-quality outcome\.?$/.test(normalized)
            || /^discuss(?:ing)? how (?:the|this) information led to the development of a high-quality digital technologies outcome\.?$/.test(normalized);
    }

    return false;
}

function normalize91907ChecklistRows(rows) {
    const sourceRows = Array.isArray(rows)
        ? rows.map((step) => ({ text: String(step?.text || "").trim(), done: Boolean(step?.done) })).filter((step) => step.text)
        : [];
    const legacyTexts = new Set([
        "establish the project purpose and design requirements.",
        "develop and trial design options.",
        "document implementation decisions and technical evidence.",
        "test against requirements and refine.",
        "summarize final evidence for achieved, merit, or excellence."
    ]);
    const isLegacyShape = sourceRows.some((step) => legacyTexts.has(step.text.toLowerCase()));
    if (!isLegacyShape) {
        return sourceRows;
    }

    const wasDone = (pattern) => sourceRows.some((step) => Boolean(step.done) && pattern.test(step.text));
    return EVIDENCE_STEPS_DEFAULTS["91907"].map((text) => ({
        text,
        done: /trial components/i.test(text)
            ? wasDone(/develop and trial/i)
            : /test that the digital technologies outcome/i.test(text)
                ? wasDone(/test against requirements/i)
                : false
    }));
}

function inferStudentSystemConnections(currentState) {
    let trelloConnected = false;
    let githubConnected = false;
    let googleSlidesConnected = false;
    let oneDriveConnected = false;
    let googleDriveConnected = false;

    Object.values(currentState || {}).forEach((steps) => {
        (Array.isArray(steps) ? steps : []).forEach((step) => {
            const text = String(step?.text || "").trim();
            if (!text) return;

            const textLower = text.toLowerCase();
            if (text.startsWith("TRELLO_CARD_URL|")) {
                trelloConnected = true;
            }
            if (textLower.includes("trello.com/")) {
                trelloConnected = true;
            }
            if (/(github\.com|gist\.github\.com|raw\.githubusercontent\.com)/i.test(textLower)) {
                githubConnected = true;
            }

            if (text.startsWith("GOOGLE_SLIDES_URL|")) {
                googleSlidesConnected = true;
            }
            if (/(docs\.google\.com\/presentation)/i.test(textLower)) {
                googleSlidesConnected = true;
            }

            if (text.startsWith("MEDIA_ASSET_FOLDER_URL|") || text.startsWith("MEDIA_REVIEW_URL|") || text.startsWith("ONEDRIVE_PROJECT_FOLDER_URL|")) {
                oneDriveConnected = true;
            }

            if (text.startsWith("GOOGLE_DRIVE_PROJECT_FOLDER_URL|")) {
                googleDriveConnected = true;
            }

            if (/(onedrive\.live\.com|1drv\.ms|sharepoint\.com|onedrive)/i.test(textLower)) {
                oneDriveConnected = true;
            }

            if (/(drive\.google\.com)/i.test(textLower)) {
                googleDriveConnected = true;
            }
        });
    });

    if (!trelloConnected) {
        const projectId = String(taskListState.selectedId || "").trim();
        const email = getTaskListEmail();
        if (projectId && email) {
            const linkStorageKey = `${TASK_LIST_TRELLO_CARD_LINK_STORAGE_PREFIX}:${projectId}:${email}`;
            const libraryStorageKey = `${TASK_LIST_TRELLO_CARD_LIBRARY_STORAGE_PREFIX}:${projectId}:${email}`;
            try {
                const localLink = String(localStorage.getItem(linkStorageKey) || "").trim();
                if (localLink && /trello\.com\//i.test(localLink)) {
                    trelloConnected = true;
                }
            } catch (_error) {
            }

            if (!trelloConnected) {
                try {
                    const rawLibrary = localStorage.getItem(libraryStorageKey);
                    const parsedLibrary = rawLibrary ? JSON.parse(rawLibrary) : [];
                    const hasAnyTrelloLibraryLink = Array.isArray(parsedLibrary)
                        && parsedLibrary.some((item) => {
                            const candidate = typeof item === "string" ? item : item?.url;
                            return /trello\.com\//i.test(String(candidate || ""));
                        });
                    if (hasAnyTrelloLibraryLink) {
                        trelloConnected = true;
                    }
                } catch (_error) {
                }
            }
        }
    }

    return { trelloConnected, githubConnected, googleSlidesConnected, oneDriveConnected, googleDriveConnected };
}

function autoTickProjectManagementRequirement(stateMap) {
    const rows = Array.isArray(stateMap?.["91897"]) ? stateMap["91897"] : [];
    if (!rows.length) {
        return false;
    }

    const systems = inferStudentSystemConnections(stateMap || {});
    if (!systems.trelloConnected || !systems.githubConnected) {
        return false;
    }

    let changed = false;
    rows.forEach((row) => {
        const text = String(row?.text || "").trim();
        if (!text) return;
        if (getStepLevel(text) !== "Achieved") return;
        if (!stripStepLevel(text).toLowerCase().includes("project management")) return;
        if (!Boolean(row?.done)) {
            row.done = true;
            changed = true;
        }
    });
    return changed;
}

function autoTickDigitalOutcomeRequirements(stateMap, projectId, email) {
    const rows = Array.isArray(stateMap?.["digital-outcome"]) ? stateMap["digital-outcome"] : [];
    if (!rows.length || !projectId || !email) {
        return false;
    }

    let changed = false;
    rows.forEach((row) => {
        const text = String(row?.text || "").trim();
        if (!text) return;

        const normalized = text.toLowerCase();
        const isTemplateDrivenRow = Boolean(inferDigitalOutcomeTaskTemplateId(normalized));
        if (!isTemplateDrivenRow) {
            return;
        }

        const hasEligibleSync = hasSyncedSlideForTaskTopic(projectId, email, text);
        if (hasEligibleSync && !Boolean(row?.done)) {
            row.done = true;
            changed = true;
            return;
        }

        if (!hasEligibleSync && Boolean(row?.done)) {
            row.done = false;
            changed = true;
        }
    });

    return changed;
}

function autoTickMultipleComponentsRequirement(stateMap, componentCount) {
    if (!Number.isFinite(componentCount)) {
        return false;
    }

    const shouldBeDone = componentCount > 1;
    let changed = false;
    ["91897", "91907"].forEach((standard) => {
        const rows = Array.isArray(stateMap?.[standard]) ? stateMap[standard] : [];
        rows.forEach((row) => {
            const text = stripStepLevel(row?.text || "").toLowerCase();
            if (!/^(?:effectively\s+)?trial(?:l?ing)?\s+multiple\s+components\s+and\/or\s+techniques\b/.test(text)) {
                return;
            }
            if (Boolean(row?.done) !== shouldBeDone) {
                row.done = shouldBeDone;
                changed = true;
            }
        });
    });
    return changed;
}

function sync91893RelevantImplicationsState(stateMap) {
    const sourceRows = Array.isArray(stateMap?.["91897"]) ? stateMap["91897"] : [];
    const targetRows = Array.isArray(stateMap?.["91893"]) ? stateMap["91893"] : [];
    if (!sourceRows.length || !targetRows.length) {
        return false;
    }

    const sourceExplainingDone = sourceRows.some((row) => {
        const text = stripStepLevel(row?.text || "").toLowerCase();
        return /^explain(?:ing)? relevant implications\.?$/.test(text) && Boolean(row?.done);
    });
    const sourceAddressingDone = sourceRows.some((row) => {
        const text = stripStepLevel(row?.text || "").toLowerCase();
        return /^address(?:ing)? relevant implications\.?$/.test(text) && Boolean(row?.done);
    });

    let changed = false;
    targetRows.forEach((row) => {
        const text = stripStepLevel(row?.text || "").toLowerCase();
        const shouldBeDone = /^(?:explain(?:ing)?) relevant implications\.?$/.test(text)
            ? sourceExplainingDone
            : (/^address(?:ing)? relevant implications\.?$/.test(text) ? sourceAddressingDone : null);
        if (shouldBeDone !== null && Boolean(row?.done) !== shouldBeDone) {
            row.done = shouldBeDone;
            changed = true;
        }
    });
    return changed;
}

function autoTickRelevantImplicationsRequirements(stateMap, projectId, email) {
    const addressTicksChanged = clearAddressRelevantImplicationsTicks(stateMap);
    const rows = Array.isArray(stateMap?.["91897"]) ? stateMap["91897"] : [];
    if (!rows.length) {
        return addressTicksChanged;
    }

    const completedCategoryCount = countCompletedRelevantImplicationsCategories(rows);
    const shouldMarkSectionComplete = completedCategoryCount >= 3;

    let changed = false;

    rows.forEach((row) => {
        const text = String(row?.text || "").trim();
        if (!text) return;

        const level = getStepLevel(text);
        const stripped = stripStepLevel(text).toLowerCase();

        if (level === "Achieved" && stripped === "explain relevant implications.") {
            if (shouldMarkSectionComplete && !Boolean(row?.done)) {
                row.done = true;
                changed = true;
            } else if (!shouldMarkSectionComplete && Boolean(row?.done)) {
                row.done = false;
                changed = true;
            }
            return;
        }

    });

    return addressTicksChanged || changed;
}

async function loadJson(url, options = {}) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(payload?.error || `Request failed (${response.status})`);
        error.status = Number(response.status || 0);
        throw error;
    }
    return payload;
}

async function getSignedInEmail() {
    const auth = readTaskListAuth();
    return String(auth?.profile?.email || "").trim().toLowerCase();
}

async function fetchAllocations() {
    const email = await getSignedInEmail();
    if (!email) {
        return { assessment_tasks: [], projects: [] };
    }
    const payload = await loadJson("/api/my-allocations", { headers: buildTaskListHeaders({}) });
    return {
        assessment_tasks: Array.isArray(payload?.assessment_tasks) ? payload.assessment_tasks : [],
        projects: Array.isArray(payload?.projects) ? payload.projects : []
    };
}

async function fetchActivityDetail(id) {
    if (!id) return null;
    try {
        return await loadJson(`/api/activities/${encodeURIComponent(id)}`, { headers: buildTaskListHeaders({}) });
    } catch (_error) {
        return null;
    }
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

function evidenceMapToRows(currentState, standards) {
    const source = Array.isArray(standards) ? standards : [];
    return source
        .map((standard) => ({
            standard,
            steps: Array.isArray(currentState?.[standard]) ? currentState[standard] : []
        }))
        .map((row) => ({
            standard: String(row.standard || "").trim(),
            steps: Array.isArray(row.steps)
                ? row.steps
                    .map((step) => ({
                        text: String(step?.text || "").trim(),
                        done: Boolean(step?.done)
                    }))
                    .filter((step) => step.text)
                : []
        }))
        .filter((row) => row.standard);
}

async function fetchMyEvidence(projectId) {
    if (!projectId) return [];
    const payload = await loadJson(`/api/activities/${encodeURIComponent(projectId)}/my-evidence`, { headers: buildTaskListHeaders({}) });
    return normalizeEvidenceSteps(payload?.evidence_steps);
}

async function saveMyEvidence(projectId, rows) {
    return loadJson(`/api/activities/${encodeURIComponent(projectId)}/my-evidence`, {
        method: "PATCH",
        headers: buildTaskListHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ evidence_steps: normalizeEvidenceSteps(rows) })
    });
}

function getQueryContext() {
    const params = new URLSearchParams(window.location.search || "");
    const id = String(params.get("id") || "").trim();
    const taskTopic = String(params.get("taskTopic") || "").trim();
    const taskShortName = String(params.get("taskShortName") || "").trim();
    return { id, taskTopic, taskShortName };
}

function setStatus(message, isError = false) {
    const status = document.querySelector("#task-list-status");
    if (!status) return;
    status.textContent = String(message || "");
    status.classList.toggle("is-error", Boolean(isError));
}

function renderHeroLinkedItems(items, label) {
    const rows = Array.isArray(items) ? items : [];
    if (!rows.length) {
        return `<p class="task-list-hero-linked-empty">No ${escapeTaskListHtml(String(label || "items").toLowerCase())} allocated yet.</p>`;
    }

    return `
        <ul class="task-list-hero-linked-list">
            ${rows.map((item) => {
                const href = buildCustomActivityLink(item.id);
                return `
                    <li class="task-list-hero-linked-item">
                        <span>${escapeTaskListHtml(String(item?.name || "Untitled"))}</span>
                        <a href="${escapeTaskListHtml(href)}">Open</a>
                    </li>
                `;
            }).join("")}
        </ul>
    `;
}

function renderHeader(summary) {
    const hero = document.querySelector("#task-list-hero");
    if (!hero) return;

    const assessmentCount = Number(summary?.assessmentCount || 0);
    const projectCount = Number(summary?.projectCount || 0);
    const metCount = Number(summary?.metCount || 0);
    const unresolvedCount = Number(summary?.unresolvedCount || 0);
    const totalLinked = Number(summary?.totalLinked || 0);
    const linkedAssessments = Array.isArray(summary?.linkedAssessments) ? summary.linkedAssessments : [];
    const linkedProjects = Array.isArray(summary?.linkedProjects) ? summary.linkedProjects : [];

    hero.innerHTML = `
        <div class="task-list-hero-copy">
            <p class="eyebrow">COMPUTER LAB</p>
            <h1>My Task List</h1>
            <p class="hero-text">Track the checklist for the current task while keeping all connected assessment and project evidence visible.</p>
            <div class="task-list-hero-linked-grid">
                <article class="task-list-hero-linked-card">
                    <h3 class="task-list-hero-linked-title">My Assessment Tasks</h3>
                    ${renderHeroLinkedItems(linkedAssessments, "assessment tasks")}
                </article>
                <article class="task-list-hero-linked-card">
                    <h3 class="task-list-hero-linked-title">My Projects</h3>
                    ${renderHeroLinkedItems(linkedProjects, "projects")}
                </article>
            </div>
        </div>
        <aside class="task-list-hero-stats">
            <div class="stat-card">
                <span class="stat-label">Assessments and Projects</span>
                <strong>${escapeTaskListHtml(String(totalLinked))}</strong>
                <ul class="task-list-stat-list">
                    <li>Assessment Tasks: ${escapeTaskListHtml(String(assessmentCount))}</li>
                    <li>Projects: ${escapeTaskListHtml(String(projectCount))}</li>
                </ul>
            </div>
            <div class="stat-card">
                <span class="stat-label">Assessment Criteria:</span>
                <strong>${escapeTaskListHtml(String(metCount + unresolvedCount))}</strong>
                <ul class="task-list-stat-list">
                    <li>Met: ${escapeTaskListHtml(String(metCount))}</li>
                    <li>Unresolved: ${escapeTaskListHtml(String(unresolvedCount))}</li>
                </ul>
            </div>
        </aside>
    `;
}

function summarizeChecklistCriteria(stateMap) {
    const rows = Object.values(stateMap || {}).flatMap((value) => Array.isArray(value) ? value : []);
    const mainRows = rows.filter((row) => String(row?.text || "").trim().length > 0);
    const metCount = mainRows.filter((row) => Boolean(row?.done)).length;
    const unresolvedCount = Math.max(0, mainRows.length - metCount);
    return {
        totalCount: mainRows.length,
        metCount,
        unresolvedCount
    };
}

function renderAllocationLists(assessmentTasks, projects) {
    const renderList = (hostId, emptyId, items, label) => {
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
            const href = buildCustomActivityLink(item.id);
            return `
                <li class="task-list-alloc-item">
                    <div>
                        <p class="task-list-alloc-name">${escapeTaskListHtml(String(item?.name || "Untitled"))}</p>
                        <p class="task-list-meta">${escapeTaskListHtml(label)} ID: ${escapeTaskListHtml(String(item?.id || ""))}${item?.topic_type ? ` • Topic Type: ${escapeTaskListHtml(item.topic_type)}` : ""}</p>
                    </div>
                    <a class="detail-action detail-action-secondary" href="${escapeTaskListHtml(href)}">Open Task</a>
                </li>
            `;
        }).join("");
    };

    renderList("#task-list-assessments", "#task-list-assessments-empty", assessmentTasks, "Assessment");
    renderList("#task-list-projects", "#task-list-projects-empty", projects, "Project");
}

function renderTaskPicker(allItems, selectedId) {
    const picker = document.querySelector("#task-list-picker");
    if (!picker) return;

    if (!allItems.length) {
        picker.innerHTML = '<option value="">No tasks available</option>';
        picker.disabled = true;
        return;
    }

    picker.disabled = false;
    picker.innerHTML = allItems.map((item) => {
        const kind = item.kind === "Project" ? "Project" : "Assessment";
        const selected = String(item.id) === String(selectedId) ? "selected" : "";
        return `<option value="${escapeTaskListHtml(String(item.id))}" ${selected}>${escapeTaskListHtml(String(item.name || "Untitled"))} (${escapeTaskListHtml(kind)})</option>`;
    }).join("");
}

function renderRelevantImplicationsCategoryGrid(standard, rows) {
    return `
        <div class="task-list-relevant-implications-subtasks">
            <p class="task-list-system-title">RELEVANT IMPLICATIONS</p>
            <div class="task-list-relevant-implications-grid">
                ${(Array.isArray(rows) ? rows : []).map((categoryRow) => {
                    const category = parseRelevantImplicationsCategoryFromStep(categoryRow?.text);
                    const categoryHref = getLatestTemplateSyncUrlById(
                        taskListState.selectedId,
                        getTaskListEmail(),
                        `relevant-implications-${normalizeTaskTopicStorageSlug(category)}`
                    ) || buildTemplateLibraryLink(
                        taskListState.selectedId,
                        `Relevant Implications - ${category}`,
                        `Relevant Implications - ${category}`,
                        `relevant-implications-${normalizeTaskTopicStorageSlug(category)}`,
                        category
                    );
                    const iconUrl = getRelevantImplicationsIconUrl(category);
                    return `
                        <label class="task-list-relevant-implication-card ${categoryRow.done ? "is-complete" : ""}">
                            <input type="checkbox" ${categoryRow.done ? "checked" : ""} data-step-check="${escapeTaskListHtml(standard)}:${categoryRow._index}">
                            <span class="task-list-relevant-implication-icon" aria-hidden="true">
                                ${iconUrl ? `<img src="${escapeTaskListHtml(iconUrl)}" alt="">` : ""}
                            </span>
                            <span class="task-list-relevant-implication-card-copy">
                                <a class="task-list-step-link" href="${escapeTaskListHtml(categoryHref)}">${escapeTaskListHtml(category)}</a>
                            </span>
                        </label>
                    `;
                }).join("")}
            </div>
        </div>
    `;
}

function renderChecklistCards(detail, allItems) {
    const checklistHost = document.querySelector("#task-list-checklist");
    if (!checklistHost) return;

    const taskTitle = String(detail?.name || "Task List").trim();
    const taskTopic = taskListState.taskTopic || taskTitle;
    const selectedTopicType = getTopicTypeLabel(detail);
    const allTopicTypes = Array.from(new Set(
        (Array.isArray(allItems) ? allItems : [])
            .map((item) => getTopicTypeLabel(item))
            .map((label) => String(label || "").trim())
            .filter(Boolean)
    ));
    if (selectedTopicType && !allTopicTypes.includes(selectedTopicType)) {
        allTopicTypes.unshift(selectedTopicType);
    }

    const systemConnections = inferStudentSystemConnections(taskListState.fullEvidenceState);

    const renderRowsForStandard = (standard, rows) => {
        const safeRows = Array.isArray(rows) ? rows : [];

        if (String(standard) === "91893") {
            const levels = ["Achieved", "Merit", "Excellence"];
            return `
                ${levels.map((level) => `
                    <section class="task-list-level-group">
                        <h4>${level}</h4>
                        ${level === "Achieved" ? `<p class="task-list-achieved-subheading">Section 1: Digital Media</p>` : ""}
                        <div class="task-list-step-list">
                            ${safeRows.map((step, index) => getStepLevel(step?.text) === level ? `
                                <div class="task-list-step-row">
                                    <label class="task-list-step-check-wrap">
                                        <input type="checkbox" ${Boolean(step?.done) ? "checked" : ""} data-step-check="${escapeTaskListHtml(standard)}:${index}">
                                        <span class="task-list-step-text">${escapeTaskListHtml(stripStepLevel(step?.text || ""))}</span>
                                    </label>
                                </div>
                            ` : "").join("")}
                        </div>
                    </section>
                `).join("")}
            `;
        }

        if (String(standard) !== "91897" && String(standard) !== "91907") {
            return `
                <div class="task-list-step-list">
                    ${safeRows.map((step, index) => {
                        const stepText = String(step?.text || "");
                        if (standard === "digital-outcome" && /what tools and techniques will be used/i.test(stepText)) {
                            return "";
                        }
                        return `
                        <div class="task-list-step-row">
                            <label class="task-list-step-check-wrap">
                                <input type="checkbox" ${Boolean(step?.done) ? "checked" : ""} data-step-check="${escapeTaskListHtml(standard)}:${index}">
                                ${(() => {
                                    const href = getTaskTopicHrefForStep(standard, "", stepText);
                                    return href
                                        ? `<a class="task-list-step-link" href="${escapeTaskListHtml(href)}">${escapeTaskListHtml(stepText)}</a>`
                                        : `<span class="task-list-step-text">${escapeTaskListHtml(stepText)}</span>`;
                                })()}
                            </label>
                        </div>
                    `;
                    }).join("")}
                </div>
            `;
        }

        const levels = ["Achieved", "Merit", "Excellence"];
        return levels.map((level) => {
            const levelRows = safeRows
                .map((step, index) => ({ ...step, _index: index }))
                .filter((step) => getStepLevel(step?.text) === level);
            const renderedAchievedSections = new Set();
            const relevantCategoryRows = levelRows.filter((step) => level === "Achieved" && isRelevantImplicationsCategoryStep(step?.text));

            return `
                <section class="task-list-level-group">
                    <h4>${escapeTaskListHtml(level)}</h4>
                    <div class="task-list-step-list">
                        ${levelRows.map((step) => {
                            const stepText = stripStepLevel(step?.text);
                            const relevantCategoryLabel = parseRelevantImplicationsCategoryFromStep(step?.text);
                            const isRelevantCategoryRow = level === "Achieved" && Boolean(relevantCategoryLabel);
                            const stepLabel = isRelevantCategoryRow ? relevantCategoryLabel : stepText;
                            const href = getTaskTopicHrefForStep(standard, level, stepText);
                            const relevantCategoryTemplateId = isRelevantCategoryRow
                                ? `relevant-implications-${normalizeTaskTopicStorageSlug(relevantCategoryLabel)}`
                                : "relevant-implications";
                            const relevantImplicationsSyncedSlideUrl = getLatestTemplateSyncUrlById(
                                taskListState.selectedId,
                                getTaskListEmail(),
                                relevantCategoryTemplateId
                            );
                            const relevantCategoryTemplateLibraryHref = isRelevantCategoryRow
                                ? buildTemplateLibraryLink(
                                    taskListState.selectedId,
                                    `Relevant Implications - ${relevantCategoryLabel}`,
                                    `Relevant Implications - ${relevantCategoryLabel}`,
                                    relevantCategoryTemplateId,
                                    relevantCategoryLabel
                                )
                                : "";
                            const relevantCategoryHref = relevantImplicationsSyncedSlideUrl || relevantCategoryTemplateLibraryHref;
                            const achievedSectionMeta = level === "Achieved" ? getAchievedSectionMeta(stepText) : null;
                            const shouldRenderAchievedSectionHeading = Boolean(
                                achievedSectionMeta
                                && !renderedAchievedSections.has(achievedSectionMeta.id)
                            );
                            if (shouldRenderAchievedSectionHeading && achievedSectionMeta) {
                                renderedAchievedSections.add(achievedSectionMeta.id);
                            }
                            if (isRelevantCategoryRow) {
                                const firstCategoryIndex = relevantCategoryRows[0]?._index;
                                if (step._index !== firstCategoryIndex) return "";
                                return `
                                    ${shouldRenderAchievedSectionHeading && achievedSectionMeta
                                        ? `<p class="task-list-achieved-subheading">${escapeTaskListHtml(achievedSectionMeta.title)}</p>`
                                        : ""}
                                    ${shouldRenderAchievedSectionHeading && achievedSectionMeta?.id === "relevant-implications"
                                        ? `<p class="task-list-achieved-note">Complete any 3 or more categories to mark Section 4 complete. (${countCompletedRelevantImplicationsCategories(levelRows)}/${RELEVANT_IMPLICATIONS_CATEGORIES.length})</p>`
                                        : ""}
                                    ${renderRelevantImplicationsCategoryGrid(standard, relevantCategoryRows)}
                                `;
                            }
                            const isProjectManagementRow = String(level) === "Achieved"
                                && stepText.toLowerCase().includes("project management");
                            const isDecompositionRow = String(level) === "Achieved"
                                && stepText.toLowerCase().includes("decompos");
                            const isTriallingComponentsRow = String(level) === "Achieved"
                                && /trial\s+(?:the\s+)?components|triall?ing\s+(?:the\s+)?components|trailing\s+components/.test(stepText.toLowerCase());
                            const isTestingFunctionsRow = String(level) === "Achieved"
                                && /testing\s+functions|test(?:ing)?\s+that\s+the\s+digital\s+technologies\s+outcome\s+functions/i.test(stepText);
                            const isMultipleComponentsRow = String(level) === "Merit"
                                && /^(?:effectively\s+)?trial(?:l?ing)?\s+multiple\s+components\s+and\/or\s+techniques\b/i.test(stepText);
                            const isInformationalRow = isInformationalCriteriaRow(String(standard), level, stepText);
                            const isSystemComplete = isProjectManagementRow
                                && systemConnections.trelloConnected
                                && systemConnections.githubConnected;
                            const relevantCategoryDoneCount = countCompletedRelevantImplicationsCategories(levelRows);
                            const isAddressRelevantImplicationsRow = isAddressRelevantImplicationsStep(stepText);
                            const isExplainRelevantImplicationsRow = level === "Achieved"
                                && /explain(?:ing)?\s+relevant\s+implications\.?$/i.test(stepText);
                            const isTickActionDisabled = isAddressRelevantImplicationsRow
                                || (isExplainRelevantImplicationsRow && relevantCategoryDoneCount < 3);
                            const decompositionSubtasks = isDecompositionRow ? getDecompositionSubtasks(taskListState.checklistState) : [];
                            const triallingComponentsCount = taskListState.identifiedComponentsCount;
                            const toolsTechniquesSubtask = isTriallingComponentsRow ? getDigitalOutcomeToolsTechniquesSubtask() : null;
                            const componentsSubtaskHref = buildCustomActivityLink(taskListState.selectedId, "Trial the components of the digital technologies outcome.", "Trialling Components", "trialling-components");
                            const projectManagementSubtasks = isProjectManagementRow ? getProjectManagementSubtasks(taskListState.fullEvidenceState) : [];
                            const testingFunctionsSubtasks = isTestingFunctionsRow ? getTestingFunctionsSubtasks(taskListState.fullEvidenceState) : [];

                            return `
                                ${shouldRenderAchievedSectionHeading && achievedSectionMeta
                                    ? `<p class="task-list-achieved-subheading">${escapeTaskListHtml(achievedSectionMeta.title)}</p>`
                                    : ""}
                                ${shouldRenderAchievedSectionHeading && achievedSectionMeta?.id === "relevant-implications"
                                    ? `<p class="task-list-achieved-note">Complete any 3 or more categories to mark Section 4 complete. (${relevantCategoryDoneCount}/${RELEVANT_IMPLICATIONS_CATEGORIES.length})</p>`
                                    : ""}
                                <div class="task-list-step-row ${isSystemComplete ? "is-system-complete" : ""} ${isRelevantCategoryRow ? "is-relevant-implications-category" : ""} ${isInformationalRow ? "is-informational" : ""}">
                                    <label class="task-list-step-check-wrap">
                                        ${isInformationalRow ? "" : `<input type="checkbox" ${Boolean(step?.done) && !isAddressRelevantImplicationsRow ? "checked" : ""} ${isTickActionDisabled ? "disabled" : ""} data-step-check="${escapeTaskListHtml(standard)}:${step._index}">`}
                                        ${isRelevantCategoryRow
                                            ? `<a class="task-list-step-link task-list-step-text-category" href="${escapeTaskListHtml(relevantCategoryHref)}">${escapeTaskListHtml(stepLabel)}</a>`
                                            : (isInformationalRow
                                                ? `<span class="task-list-step-text">${escapeTaskListHtml(stepLabel)}</span>`
                                                : (href
                                                ? `<a class="task-list-step-link" href="${escapeTaskListHtml(href)}">${escapeTaskListHtml(stepLabel)}</a>`
                                                : `<span class="task-list-step-text">${escapeTaskListHtml(stepLabel)}</span>`)) }
                                    </label>
                                    ${isProjectManagementRow ? `
                                        <div class="task-list-decomposition-subtasks task-list-project-management-subtasks">
                                            <p class="task-list-system-title">Project Management Subtasks</p>
                                            <p class="task-list-achieved-note">Complete Trello + at least one other.</p>
                                            <div class="task-list-decomposition-subtask-list">
                                                ${projectManagementSubtasks.map((subtask) => `
                                                    <label class="task-list-decomposition-subtask ${subtask.done ? "is-complete" : ""}">
                                                        <input type="checkbox" disabled ${subtask.done ? "checked" : ""}>
                                                        <a href="${escapeTaskListHtml(subtask.href)}">${getProjectManagementSystemLogo(subtask.label)}${escapeTaskListHtml(subtask.label)}</a>
                                                    </label>
                                                `).join("")}
                                            </div>
                                        </div>
                                    ` : ""}
                                    ${isDecompositionRow ? `
                                        <div class="task-list-decomposition-subtasks">
                                            <p class="task-list-system-title">Decomposition Subtasks</p>
                                            <p class="task-list-achieved-note">Complete at least one task in each of the Decomposition Categories.</p>
                                            <div class="task-list-decomposition-category-list">
                                                ${decompositionSubtasks.map((subtask) => `
                                                    <a class="task-list-decomposition-category ${subtask.trelloCount > 0 ? "is-covered" : ""}" href="${escapeTaskListHtml(subtask.href)}">
                                                        <span class="task-list-decomposition-category-label">${escapeTaskListHtml(subtask.label)}</span>
                                                        <span class="task-list-decomposition-category-count">${subtask.coverageKnown ? subtask.trelloCount : "-"}</span>
                                                    </a>
                                                `).join("")}
                                            </div>
                                            ${decompositionSubtasks[0]?.coverageKnown
                                                ? `<p class="task-list-achieved-note">Trello last synced: ${escapeTaskListHtml(formatTaskListTimestamp(decompositionSubtasks[0]?.coverageSavedAt))}</p>`
                                                : `<p class="task-list-achieved-note">Click Sync from Trello above to see these counts.</p>`}
                                        </div>
                                    ` : ""}
                                    ${isTriallingComponentsRow ? `
                                        <div class="task-list-decomposition-subtasks">
                                            <p class="task-list-system-title">SUBTASKS</p>
                                            <p class="task-list-achieved-note">Components identified for trialling.</p>
                                            <div class="task-list-decomposition-category-list">
                                                <a class="task-list-decomposition-category ${Number.isFinite(triallingComponentsCount) && triallingComponentsCount > 0 ? "is-covered" : ""}" href="${escapeTaskListHtml(getTaskTopicHrefForStep(standard, level, stepText) || "#")}">
                                                    <span class="task-list-decomposition-category-label">COMPONENTS</span>
                                                    <span class="task-list-decomposition-category-count">${Number.isFinite(triallingComponentsCount) ? triallingComponentsCount : "-"}</span>
                                                </a>
                                            </div>
                                            ${Number.isFinite(triallingComponentsCount)
                                                ? ""
                                                : `<p class="task-list-achieved-note">Sync Google Drive above to see the component count.</p>`}
                                            ${toolsTechniquesSubtask ? `
                                                <div class="task-list-decomposition-subtask-list">
                                                    <label class="task-list-decomposition-subtask ${toolsTechniquesSubtask.done ? "is-complete" : ""}">
                                                        <input type="checkbox" ${toolsTechniquesSubtask.done ? "checked" : ""} data-step-check="digital-outcome:${toolsTechniquesSubtask.index}">
                                                        <a href="${escapeTaskListHtml(toolsTechniquesSubtask.href)}">What Tools and Techniques will be used?</a>
                                                    </label>
                                                </div>
                                            ` : ""}
                                        </div>
                                    ` : ""}
                                    ${isMultipleComponentsRow ? `
                                        <div class="task-list-decomposition-subtasks">
                                            <p class="task-list-system-title">SUBTASKS</p>
                                            <p class="task-list-achieved-note">Components identified for trialling.</p>
                                            <div class="task-list-decomposition-category-list">
                                                <a class="task-list-decomposition-category ${Number.isFinite(triallingComponentsCount) && triallingComponentsCount > 1 ? "is-covered" : ""}" href="${escapeTaskListHtml(componentsSubtaskHref)}">
                                                    <span class="task-list-decomposition-category-label">COMPONENTS</span>
                                                    <span class="task-list-decomposition-category-count">${Number.isFinite(triallingComponentsCount) ? triallingComponentsCount : "-"}</span>
                                                </a>
                                            </div>
                                            ${Number.isFinite(triallingComponentsCount)
                                                ? ""
                                                : `<p class="task-list-achieved-note">Sync Google Drive above to see the component count.</p>`}
                                        </div>
                                    ` : ""}
                                    ${isTestingFunctionsRow ? `
                                        <div class="task-list-decomposition-subtasks">
                                            <p class="task-list-system-title">SUBTASKS</p>
                                            <p class="task-list-achieved-note">Client feedback form for user testing.</p>
                                            <div class="task-list-decomposition-subtask-list">
                                                ${testingFunctionsSubtasks.map((subtask) => `
                                                    <label class="task-list-decomposition-subtask ${subtask.done ? "is-complete" : ""}">
                                                        <input type="checkbox" disabled ${subtask.done ? "checked" : ""}>
                                                        <a href="${escapeTaskListHtml(subtask.href)}">${getProjectManagementSystemLogo(subtask.label)}${escapeTaskListHtml(subtask.label)}</a>
                                                    </label>
                                                `).join("")}
                                            </div>
                                        </div>
                                    ` : ""}
                                </div>
                            `;
                        }).join("")}
                    </div>
                </section>
            `;
        }).join("");
    };

    const cardsHtml = taskListState.checklistStandards.map((standard) => {
        const title = standard === "digital-outcome" ? "Digital Outcome Description" : `Standard ${escapeTaskListHtml(standard)}`;
        const summaryTitle = standard === "digital-outcome" ? "Digital Outcome Topic" : title;
        const rows = Array.isArray(taskListState.checklistState[standard]) ? taskListState.checklistState[standard] : [];

        return `
            <details class="task-list-checklist-card" open>
                <summary class="task-list-checklist-summary">${summaryTitle}</summary>
                <div class="task-list-checklist-card-content">
                ${standard === "digital-outcome" ? `
                    <div class="task-list-do-chip-list">
                        ${(allTopicTypes.length ? allTopicTypes : ["Not set"]).map((topicType) => `
                            <span class="task-list-do-chip">${escapeTaskListHtml(topicType)}</span>
                        `).join("")}
                    </div>
                ` : `<h3>${title}</h3>`}
                ${renderRowsForStandard(standard, rows)}
                </div>
            </details>
        `;
    }).join("");

    checklistHost.innerHTML = cardsHtml;
}

function getStandardCodes(detail, allItems = []) {
    const fromDetails = Array.isArray(detail?.standardDetails)
        ? detail.standardDetails.map((line) => String(line || "").match(/\b(\d{5})\b/)?.[1]).filter(Boolean)
        : [];

    const codes = fromDetails.length
        ? fromDetails.filter((code, index, arr) => arr.indexOf(code) === index)
        : ["91897", "91907"];
    if (hasDigitalMediaTopicType(detail, allItems)) {
        const withoutDigitalMediaStandards = codes.filter((code) => code !== "91893" && code !== "91895");
        withoutDigitalMediaStandards.unshift("91893");
        return ["digital-outcome", ...withoutDigitalMediaStandards];
    }
    return ["digital-outcome", ...codes];
}

function normalize91893ChecklistRows(rows) {
    const sourceRows = Array.isArray(rows)
        ? rows.map((step) => ({ text: String(step?.text || "").trim(), done: Boolean(step?.done) })).filter((step) => step.text)
        : [];
    const defaults = EVIDENCE_STEPS_DEFAULTS["91893"];
    return defaults.map((text) => {
        const existing = sourceRows.find((step) => stripStepLevel(step.text).toLowerCase() === stripStepLevel(text).toLowerCase());
        return { text, done: Boolean(existing?.done) };
    });
}

function buildChecklistState(standardCodes, evidenceMap) {
    const next = {};
    standardCodes.forEach((standard) => {
        const existing = Array.isArray(evidenceMap[standard]) ? evidenceMap[standard] : [];
        if (existing.length) {
            if (standard === "digital-outcome") {
                next[standard] = normalizeDigitalOutcomeChecklistRows(existing);
                return;
            }

            if (standard === "91897") {
                next[standard] = normalize91897ChecklistRows(existing);
                return;
            }

            if (standard === "91907") {
                next[standard] = normalize91907ChecklistRows(existing);
                return;
            }

            if (standard === "91893") {
                next[standard] = normalize91893ChecklistRows(existing);
                return;
            }

            next[standard] = existing.map((step) => ({ text: String(step?.text || "").trim(), done: Boolean(step?.done) }));
            return;
        }

        if (standard === "digital-outcome") {
            next[standard] = DIGITAL_OUTCOME_DETAILS_TASKS.map((text) => ({ text, done: false }));
            return;
        }

        const defaults = Array.isArray(EVIDENCE_STEPS_DEFAULTS[standard]) ? EVIDENCE_STEPS_DEFAULTS[standard] : ["Add a step..."];
        const defaultRows = defaults.map((text) => ({ text, done: false }));
        next[standard] = standard === "91897"
            ? normalize91897ChecklistRows(defaultRows)
            : standard === "91907"
                ? normalize91907ChecklistRows(defaultRows)
                : defaultRows;
    });
    return next;
}

async function loadChecklistForTask(taskId) {
    const selected = taskListState.allItems.find((item) => String(item.id) === String(taskId));
    if (!selected) {
        return;
    }

    taskListState.selectedId = String(selected.id);
    const detail = await fetchActivityDetail(taskListState.selectedId);
    taskListState.taskTopic = String(detail?.name || selected?.name || "Task List").trim();

    const evidenceRows = await fetchMyEvidence(taskListState.selectedId).catch(() => []);
    const evidenceMap = evidenceRowsToMap(evidenceRows);
    taskListState.fullEvidenceState = { ...evidenceMap };
    let migratedDigitalOutcomeRows = false;
    if (Array.isArray(taskListState.fullEvidenceState["digital-outcome"])) {
        const beforeMigration = JSON.stringify(taskListState.fullEvidenceState["digital-outcome"]);
        taskListState.fullEvidenceState["digital-outcome"] = normalizeDigitalOutcomeChecklistRows(taskListState.fullEvidenceState["digital-outcome"]);
        migratedDigitalOutcomeRows = beforeMigration !== JSON.stringify(taskListState.fullEvidenceState["digital-outcome"]);
    }
    let migrated91897Rows = false;
    if (Array.isArray(taskListState.fullEvidenceState["91897"])) {
        const before91897Migration = JSON.stringify(taskListState.fullEvidenceState["91897"]);
        taskListState.fullEvidenceState["91897"] = normalize91897ChecklistRows(taskListState.fullEvidenceState["91897"]);
        migrated91897Rows = before91897Migration !== JSON.stringify(taskListState.fullEvidenceState["91897"]);
    }
    let migrated91907Rows = false;
    if (Array.isArray(taskListState.fullEvidenceState["91907"])) {
        const before91907Migration = JSON.stringify(taskListState.fullEvidenceState["91907"]);
        taskListState.fullEvidenceState["91907"] = normalize91907ChecklistRows(taskListState.fullEvidenceState["91907"]);
        migrated91907Rows = before91907Migration !== JSON.stringify(taskListState.fullEvidenceState["91907"]);
    }
    let migrated91893Rows = false;
    if (Array.isArray(taskListState.fullEvidenceState["91893"])) {
        const before91893Migration = JSON.stringify(taskListState.fullEvidenceState["91893"]);
        taskListState.fullEvidenceState["91893"] = normalize91893ChecklistRows(taskListState.fullEvidenceState["91893"]);
        migrated91893Rows = before91893Migration !== JSON.stringify(taskListState.fullEvidenceState["91893"]);
    }
    taskListState.checklistStandards = getStandardCodes(detail || selected, taskListState.allItems);
    taskListState.checklistState = buildChecklistState(taskListState.checklistStandards, evidenceMap);
    taskListState.checklistStandards.forEach((standard) => {
        if (!Array.isArray(taskListState.fullEvidenceState[standard])) {
            taskListState.fullEvidenceState[standard] = Array.isArray(taskListState.checklistState[standard])
                ? taskListState.checklistState[standard].map((step) => ({ text: String(step?.text || "").trim(), done: Boolean(step?.done) }))
                : [];
        }
    });

    const signedInEmail = getTaskListEmail();

    // Fetch which templates the student has copied (DB-backed, reliable across devices)
    const templateCopiesPayload = await loadJson(
        `/api/activities/${encodeURIComponent(taskListState.selectedId)}/my-template-copies`,
        { headers: buildTaskListHeaders({}) }
    ).catch(() => ({ template_copies: [] }));
    taskListState.templateCopies = Array.isArray(templateCopiesPayload?.template_copies)
        ? templateCopiesPayload.template_copies : [];

    const autoChangedChecklistPM = autoTickProjectManagementRequirement(taskListState.checklistState);
    const autoChangedChecklistDO = autoTickDigitalOutcomeRequirements(taskListState.checklistState, taskListState.selectedId, signedInEmail);
    const autoRepairedChecklistRI = applyTemplateCopiesAsRelevantImplicationsState(taskListState.checklistState, taskListState.templateCopies);
    const autoChangedChecklistRI = autoTickRelevantImplicationsRequirements(taskListState.checklistState, taskListState.selectedId, signedInEmail);
    const autoSyncedChecklist91893RI = sync91893RelevantImplicationsState(taskListState.checklistState);
    const autoChangedChecklist = autoChangedChecklistPM || autoChangedChecklistDO || autoChangedChecklistRI || autoRepairedChecklistRI || autoSyncedChecklist91893RI;
    const autoChangedEvidencePM = autoTickProjectManagementRequirement(taskListState.fullEvidenceState);
    const autoChangedEvidenceDO = autoTickDigitalOutcomeRequirements(taskListState.fullEvidenceState, taskListState.selectedId, signedInEmail);
    const autoRepairedEvidenceRI = applyTemplateCopiesAsRelevantImplicationsState(taskListState.fullEvidenceState, taskListState.templateCopies);
    const autoChangedEvidenceRI = autoTickRelevantImplicationsRequirements(taskListState.fullEvidenceState, taskListState.selectedId, signedInEmail);
    const autoSyncedEvidence91893RI = sync91893RelevantImplicationsState(taskListState.fullEvidenceState);
    const autoChangedEvidence = autoChangedEvidencePM || autoChangedEvidenceDO || autoChangedEvidenceRI || autoRepairedEvidenceRI || autoSyncedEvidence91893RI;
    if (migratedDigitalOutcomeRows || migrated91897Rows || migrated91907Rows || migrated91893Rows || autoChangedChecklist || autoChangedEvidence) {
        const allStandards = Array.from(new Set(Object.keys(taskListState.fullEvidenceState)));
        await saveMyEvidence(taskListState.selectedId, evidenceMapToRows(taskListState.fullEvidenceState, allStandards)).catch(() => {});
    }

    const checklistSummary = summarizeChecklistCriteria(taskListState.checklistState);
    const assessmentCount = taskListState.allItems.filter((item) => item.kind !== "Project").length;
    const projectCount = taskListState.allItems.filter((item) => item.kind === "Project").length;

    const linkedAssessments = taskListState.allItems.filter((item) => item.kind !== "Project");
    const linkedProjects = taskListState.allItems.filter((item) => item.kind === "Project");

    renderHeader({
        totalLinked: taskListState.allItems.length,
        assessmentCount,
        projectCount,
        metCount: checklistSummary.metCount,
        unresolvedCount: checklistSummary.unresolvedCount,
        linkedAssessments,
        linkedProjects
    });

    renderTaskPicker(taskListState.allItems, taskListState.selectedId);
    renderChecklistCards(detail || selected, taskListState.allItems);

    void loadIdentifiedComponentsCount(taskListState.selectedId, signedInEmail).then((count) => {
        if (count !== null) {
            const checklistChanged = autoTickMultipleComponentsRequirement(taskListState.checklistState, count);
            const evidenceChanged = autoTickMultipleComponentsRequirement(taskListState.fullEvidenceState, count);
            if (checklistChanged || evidenceChanged) {
                const allStandards = Array.from(new Set(Object.keys(taskListState.fullEvidenceState)));
                void saveMyEvidence(taskListState.selectedId, evidenceMapToRows(taskListState.fullEvidenceState, allStandards)).catch(() => {});
            }
            renderChecklistCards(detail || selected, taskListState.allItems);
        }
    });

    void loadDecompositionCoverageFromServer(taskListState.selectedId).then((coverage) => {
        if (coverage?.found) {
            renderChecklistCards(detail || selected, taskListState.allItems);
        }
    });

    const openLink = document.querySelector("#task-list-open-topic");
    if (openLink) {
        openLink.setAttribute("href", buildCustomActivityLink(taskListState.selectedId, taskListState.taskTopic));
    }

    setStatus(`Loaded checklist for ${selected.name || "task"}.`);
}

async function renderTaskListPage() {
    const email = await getSignedInEmail();
    if (!email) {
        setStatus("Sign in with your school account to view your Task List.", true);
        return;
    }

    const context = getQueryContext();
    let allocations = { assessment_tasks: [], projects: [] };
    try {
        allocations = await fetchAllocations();
    } catch (_error) {
        allocations = { assessment_tasks: [], projects: [] };
    }

    taskListState.allItems = [
        ...allocations.assessment_tasks.map((item) => ({ ...item, kind: "Assessment" })),
        ...allocations.projects.map((item) => ({ ...item, kind: "Project" }))
    ];

    renderHeader({
        totalLinked: taskListState.allItems.length,
        assessmentCount: allocations.assessment_tasks.length,
        projectCount: allocations.projects.length,
        metCount: 0,
        unresolvedCount: 0,
        linkedAssessments: allocations.assessment_tasks,
        linkedProjects: allocations.projects
    });

    const contextHost = document.querySelector("#task-list-context");
    if (contextHost) {
        const contextParts = [];
        if (context.id) contextParts.push(`Activity ID: ${escapeTaskListHtml(context.id)}`);
        if (context.taskTopic) contextParts.push(`Task Topic: ${escapeTaskListHtml(context.taskTopic)}`);
        if (context.taskShortName) contextParts.push(`Task: ${escapeTaskListHtml(context.taskShortName)}`);
        if (contextParts.length) {
            contextHost.hidden = false;
            contextHost.innerHTML = `
                <h3>Current Context</h3>
                <p class="task-list-empty">This checklist can load from your selected task below.</p>
                <p class="task-list-meta">${contextParts.join(" | ")}</p>
            `;
        }
    }

    if (!taskListState.allItems.length) {
        renderTaskPicker([], "");
        setStatus("No allocations found yet. Ask your teacher to assign a task.", true);
        return;
    }

    const preferred = context.id
        ? taskListState.allItems.find((item) => String(item.id) === String(context.id)) || null
        : taskListState.allItems.find((item) => /client projects/i.test(String(item.name || ""))) || taskListState.allItems[0];

    await loadChecklistForTask(String(preferred?.id || taskListState.allItems[0].id));

    const picker = document.querySelector("#task-list-picker");
    picker?.addEventListener("change", async (event) => {
        const nextId = String(event?.target?.value || "").trim();
        if (!nextId) return;
        await loadChecklistForTask(nextId);

        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set("id", nextId);
        history.replaceState({}, "", nextUrl.toString());
    });

    document.addEventListener("click", async (event) => {
        const trelloBtn = event.target?.closest?.("#task-list-sync-trello");
        if (!trelloBtn || !taskListState.selectedId) return;

        const email = getTaskListEmail();
        if (!email) {
            setStatus("Sign in before syncing from Trello.", true);
            return;
        }

        const boardUrl = findStudentTrelloBoardUrl(taskListState.fullEvidenceState)
            || findStudentTrelloBoardUrl(taskListState.checklistState);
        if (!boardUrl) {
            setStatus("Save your Trello board link on the Project Management or Decomposition page first.", true);
            return;
        }

        trelloBtn.disabled = true;
        trelloBtn.textContent = "Syncing Trello\u2026";

        try {
            const payload = await loadJson(
                `/api/integrations/trello/list-progress?student_email=${encodeURIComponent(email)}&board_url=${encodeURIComponent(boardUrl)}`,
                { headers: buildTaskListHeaders({}) }
            );

            const allCards = [
                ...(Array.isArray(payload?.todo_cards) ? payload.todo_cards : []),
                ...(Array.isArray(payload?.doing_cards) ? payload.doing_cards : []),
                ...(Array.isArray(payload?.done_cards) ? payload.done_cards : [])
            ];
            const categoryRows = countDecompositionTaskCategories(allCards);
            writeDecompositionCategoryCoverage(taskListState.selectedId, email, categoryRows);
            await saveDecompositionCoverageToServer(taskListState.selectedId, categoryRows, allCards.length);

            setStatus(`Trello sync complete. ${allCards.length} task${allCards.length === 1 ? "" : "s"} checked against the decomposition categories.`);
            renderChecklistCards({ name: taskListState.taskTopic }, taskListState.allItems);
        } catch (error) {
            const message = String(error?.message || "");
            setStatus(
                /has not connected trello/i.test(message)
                    ? "Connect your Trello account on the Decomposition of Tasks page first, then sync again."
                    : (message || "Could not sync from Trello."),
                true
            );
        } finally {
            const btn = document.querySelector("#task-list-sync-trello");
            if (btn) { btn.disabled = false; btn.textContent = "\u21bb Sync from Trello"; }
        }
    });

    document.addEventListener("click", async (event) => {
        const syncBtn = event.target?.closest?.("#task-list-sync-drive");
        if (!syncBtn || !taskListState.selectedId) return;

        syncBtn.disabled = true;
        syncBtn.textContent = "Requesting Drive access\u2026";

        const tokenResponse = await requestTaskListDriveToken();
        if (tokenResponse.error) {
            syncBtn.disabled = false;
            syncBtn.textContent = "\u21bb Sync from Google Drive";
            setStatus("Drive access was not granted.", true);
            return;
        }

        syncBtn.textContent = "Scanning\u2026";
        try {
            const payload = await loadJson(
                `/api/activities/${encodeURIComponent(taskListState.selectedId)}/sync-drive-templates`,
                {
                    method: "POST",
                    headers: buildTaskListHeaders({ "Content-Type": "application/json" }),
                    body: JSON.stringify({ driveAccessToken: tokenResponse.access_token })
                }
            );

            taskListState.templateCopies = Array.isArray(payload?.template_copies) ? payload.template_copies : [];

            const componentCount = await loadIdentifiedComponentsCount(taskListState.selectedId, getTaskListEmail());
            const checklistMultipleComponentsChanged = autoTickMultipleComponentsRequirement(taskListState.checklistState, componentCount);
            const evidenceMultipleComponentsChanged = autoTickMultipleComponentsRequirement(taskListState.fullEvidenceState, componentCount);

            const repairedChecklist = applyTemplateCopiesAsRelevantImplicationsState(taskListState.checklistState, taskListState.templateCopies);
            const repairedEvidence = applyTemplateCopiesAsRelevantImplicationsState(taskListState.fullEvidenceState, taskListState.templateCopies);

            autoTickRelevantImplicationsRequirements(taskListState.checklistState, taskListState.selectedId, getTaskListEmail());
            autoTickRelevantImplicationsRequirements(taskListState.fullEvidenceState, taskListState.selectedId, getTaskListEmail());

            if (repairedChecklist || repairedEvidence || checklistMultipleComponentsChanged || evidenceMultipleComponentsChanged) {
                const allStandards = Array.from(new Set(Object.keys(taskListState.fullEvidenceState)));
                await saveMyEvidence(taskListState.selectedId, evidenceMapToRows(taskListState.fullEvidenceState, allStandards)).catch(() => {});
            }

            const synced = Number(payload?.synced || 0);
            setStatus(`Drive sync complete. Found ${synced} template file${synced === 1 ? "" : "s"}.`);
            renderChecklistCards({ name: taskListState.taskTopic }, taskListState.allItems);
        } catch (error) {
            setStatus(error?.message || "Could not sync from Drive.", true);
            const btn = document.querySelector("#task-list-sync-drive");
            if (btn) { btn.disabled = false; btn.textContent = "\u21bb Sync from Google Drive"; }
        }
    });

    document.addEventListener("change", async (event) => {
        const checkbox = event.target?.closest?.("[data-step-check]");
        if (!checkbox) return;

        const key = String(checkbox.getAttribute("data-step-check") || "");
        const [standard, indexRaw] = key.split(":");
        const index = Number(indexRaw);
        if (!standard || !Number.isFinite(index)) return;

        const rows = Array.isArray(taskListState.checklistState[standard]) ? taskListState.checklistState[standard] : [];
        if (!rows[index]) return;
        const stepText = stripStepLevel(rows[index].text);
        const isAddressRelevantImplicationsRow = isAddressRelevantImplicationsStep(stepText);
        const relevantCategoryDoneCount = countCompletedRelevantImplicationsCategories(rows);
        const isExplainRelevantImplicationsRow = /explain(?:ing)?\s+relevant\s+implications\.?$/i.test(stepText);
        if (isAddressRelevantImplicationsRow || (isExplainRelevantImplicationsRow && relevantCategoryDoneCount < 3)) {
            rows[index].done = false;
            renderChecklistCards({ name: taskListState.taskTopic }, taskListState.allItems);
            return;
        }
        rows[index].done = Boolean(checkbox.checked);
        if (!Array.isArray(taskListState.fullEvidenceState[standard])) {
            taskListState.fullEvidenceState[standard] = rows.map((step) => ({ text: String(step?.text || "").trim(), done: Boolean(step?.done) }));
        }
        if (taskListState.fullEvidenceState[standard][index]) {
            taskListState.fullEvidenceState[standard][index].done = Boolean(checkbox.checked);
        }

        const relevantImplicationsChecklistChanged = autoTickRelevantImplicationsRequirements(taskListState.checklistState, taskListState.selectedId, getTaskListEmail());
        const relevantImplicationsEvidenceChanged = autoTickRelevantImplicationsRequirements(taskListState.fullEvidenceState, taskListState.selectedId, getTaskListEmail());
        const synced91893ChecklistChanged = sync91893RelevantImplicationsState(taskListState.checklistState);
        const synced91893EvidenceChanged = sync91893RelevantImplicationsState(taskListState.fullEvidenceState);

        if (relevantImplicationsChecklistChanged || relevantImplicationsEvidenceChanged || synced91893ChecklistChanged || synced91893EvidenceChanged) {
            renderChecklistCards({ name: taskListState.taskTopic }, taskListState.allItems);
        }

        try {
            const allStandards = Array.from(new Set(Object.keys(taskListState.fullEvidenceState)));
            await saveMyEvidence(taskListState.selectedId, evidenceMapToRows(taskListState.fullEvidenceState, allStandards));
            setStatus("Saved.");
        } catch (error) {
            setStatus(error?.message || "Could not save right now.", true);
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    void renderTaskListPage();
});
