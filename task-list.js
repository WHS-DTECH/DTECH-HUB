const TASK_LIST_AUTH_KEY = "hub_google_auth_v1";
const TASK_LIST_TRELLO_CARD_LINK_STORAGE_PREFIX = "hub_trello_card_link_v1";
const TASK_LIST_TRELLO_CARD_LIBRARY_STORAGE_PREFIX = "hub_trello_card_library_v1";
const TASK_TOPIC_SLIDE_SYNC_STORAGE_PREFIX = "hub_task_topic_slide_sync_v1";
const TESTING_FUNCTIONS_LIST_COUNT_STORAGE_PREFIX = "hub_testing_functions_list_counts_v1";
const DIGIMED_CONVENTIONS_ACK_STORAGE_PREFIX = "hub_digimed_conventions_ack_v1";
const DIGIMED_IMAGE_CONVENTIONS_ACK_STORAGE_PREFIX = "hub_digimed_image_conventions_ack_v1";
const DIGIMED_UX_PRINCIPLES_ACK_STORAGE_PREFIX = "hub_digimed_ux_principles_ack_v1";
const DIGIMED_VIDEO_UX_PRINCIPLES_ACK_STORAGE_PREFIX = "hub_digimed_video_ux_principles_ack_v1";
const DIGIMED_VIDEO_CONVENTIONS_ACK_STORAGE_PREFIX = "hub_digimed_video_conventions_ack_v1";
const DIGIMED_EFFICIENT_TOOLS_STORAGE_PREFIX = "hub_digimed_efficient_tools_v1";
const DIGIMED_VIDEO_EFFICIENT_TOOLS_DB_PREFIX = "video:";
const DIGIMED_EFFICIENT_TOOLS_SUBTASKS = [
    "Management of assets",
    "Using stylesheets",
    "Master pages or student developed templates",
    "Commenting",
    "Character formatting controls",
    "Reusing objects, styles and/or frames",
    "HTML/CSS validation procedures",
    "Optimisation of media assets"
];
const DIGIMED_IMAGE_EFFICIENT_TOOLS_SUBTASKS = [
    "Management of assets",
    "Using layers effectively",
    "Using non-destructive editing techniques",
    "Reusing styles, objects and/or presets",
    "Using templates, guides and/or grids",
    "Using efficient selection and masking techniques",
    "Using appropriate colour and typography controls",
    "Optimisation and efficient export of image assets"
];
const DIGIMED_VIDEO_EFFICIENT_TOOLS_SUBTASKS = [
    "Management of media assets",
    "Appropriate folder/bin organisation",
    "Appropriate file naming",
    "Storyboards / shot lists / run-sheets",
    "Reusing titles, presets, effects or templates",
    "Adjustment layers / nested sequences where appropriate",
    "Proxy media / optimised editing workflow",
    "Non-destructive editing",
    "Appropriate sequence/project settings",
    "Optimisation/compression of media assets",
    "Appropriate export settings",
    "Version control / project backups"
];
const DIGIMED_TOOLS_TECHNIQUES_SUBTASKS = [
    "Creating or customising scripts, code or presets",
    "Using a combination of steps to manipulate or enhance elements",
    "Using a third-party library",
    "Using composite effects"
];
const DIGIMED_L3_TOOLS_TECHNIQUES_SUBTASKS = [
    "Non-core functionality",
    "Sophisticated digital effects",
    "Applying industry standards or guidelines",
    "Responsive design for use on multiple devices",
    "Integration of original media assets",
    "Dynamic data handling and interactivity",
    "Automation through scripts"
];
const ITERATIVE_IMPROVEMENT_EVIDENCE_SUBTASKS = [
    {
        evidenceSource: "Trello",
        demonstrates: "The development history over time: decisions, feedback, changes, actions, problems encountered, refinements and why changes were made"
    },
    {
        evidenceSource: "Trialling Component write-ups",
        demonstrates: "Alternative techniques/approaches were explored, information was gathered, a suitable approach was selected, and that decision influenced development"
    },
    {
        evidenceSource: "Testing Functions tables",
        demonstrates: "Features were tested, results were considered, problems or opportunities identified, changes made and the outcome improved"
    },
    {
        evidenceSource: "Outcome / versions",
        demonstrates: "The actual result of those decisions: visible progression towards a high-quality final outcome"
    }
];
const TASK_LIST_MERIT_TRELLO_NOTE = "From this point, you are expected to use your Trello project-management system to record evidence of your development decisions, testing/trialling information, improvements, and actions. You are responsible for ensuring that your Trello evidence clearly demonstrates the assessment criteria.";
const TASK_LIST_EXCELLENCE_TRELLO_NOTE = "Excellence evidence should emerge from your ongoing development process. Your Trello history, versions, testing, trialling, development decisions and outcome should demonstrate how you iteratively developed a high-quality outcome.";

const DIGITAL_OUTCOME_DETAILS_TASKS = [
    "Description - Google Slides: Describe the Digital Outcome: What is it, who is it for, and what should it do?",
    "Identify the target audience or end user for this outcome.",
    "Explain how the outcome will be developed.",
    "State how success will be measured or evaluated.",
    "Identify Tools and Techniques for this outcome."
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

function getDigiMedEfficientToolsKey(activityId, email) {
    return `${DIGIMED_EFFICIENT_TOOLS_STORAGE_PREFIX}:${String(activityId || "").trim()}:${String(email || "").trim().toLowerCase()}`;
}

function readDigiMedEfficientToolsState(activityId, email) {
    try {
        const parsed = JSON.parse(localStorage.getItem(getDigiMedEfficientToolsKey(activityId, email)) || "{}");
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_error) {
        return {};
    }
}

function writeDigiMedEfficientToolsState(activityId, email, value) {
    try {
        localStorage.setItem(getDigiMedEfficientToolsKey(activityId, email), JSON.stringify(value || {}));
    } catch (_error) {
    }
}

function getDigiMedToolsTechniquesKey(activityId, email) {
    return `hub_digimed_tools_techniques_v1:${String(activityId || "").trim()}:${String(email || "").trim().toLowerCase()}`;
}

function readDigiMedToolsTechniquesState(activityId, email) {
    try {
        const parsed = JSON.parse(localStorage.getItem(getDigiMedToolsTechniquesKey(activityId, email)) || "{}");
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_error) {
        return {};
    }
}

function writeDigiMedToolsTechniquesState(activityId, email, value) {
    try {
        localStorage.setItem(getDigiMedToolsTechniquesKey(activityId, email), JSON.stringify(value || {}));
    } catch (_error) {
    }
}

const DIGIMED_TOOLS_TECHNIQUES_EVIDENCE_STANDARD = "digimed-tools-techniques";

function getDigiMedToolsTechniquesStateFromEvidence(rows) {
    const state = {};
    (Array.isArray(rows) ? rows : []).forEach((row) => {
        if (String(row?.standard || "").trim() !== DIGIMED_TOOLS_TECHNIQUES_EVIDENCE_STANDARD) return;
        (Array.isArray(row?.steps) ? row.steps : []).forEach((step) => {
            const match = String(step?.text || "").match(/^DIGIMED_TOOLS_TECHNIQUES_ACK\|(.+)\|true$/i);
            if (match?.[1]) state[match[1].trim()] = true;
        });
    });
    return state;
}

async function persistDigiMedToolsTechniquesState(activityId, state) {
    const safeActivityId = String(activityId || "").trim();
    if (!safeActivityId || !getTaskListEmail()) return;
    try {
        const rows = await fetchMyEvidence(safeActivityId);
        const withoutTools = rows.filter((row) => String(row?.standard || "").trim() !== DIGIMED_TOOLS_TECHNIQUES_EVIDENCE_STANDARD);
        const steps = Object.entries(state || {})
            .filter(([, done]) => Boolean(done))
            .map(([label]) => ({ text: `DIGIMED_TOOLS_TECHNIQUES_ACK|${label}|true`, done: true }));
        if (steps.length) {
            withoutTools.push({ standard: DIGIMED_TOOLS_TECHNIQUES_EVIDENCE_STANDARD, steps });
        }
        await saveMyEvidence(safeActivityId, withoutTools);
    } catch (_error) {
    }
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
    ],
    "91903": [
        "Achieved: Applying appropriate tools and techniques to meet the purpose and end-user requirements.",
        "Achieved: Applying appropriate data integrity and testing procedures.",
        "Achieved: Applying user experience principles relevant to the purpose of the outcome.",
        "Achieved: Addressing relevant implications.",
        "Merit: Using information from testing procedures to improve the quality of the digital media outcome.",
        "Merit: Applying user experience principles to improve the quality of the digital media outcome.",
        "Excellence: Iterative improvement throughout the design, development and testing process to produce a high-quality outcome.",
        "Excellence: Using efficient tools and techniques in the outcome's production."
    ]
};

const taskListState = {
    allItems: [],
    selectedId: "",
    course: "",
    fullEvidenceState: {},
    checklistState: {},
    checklistStandards: [],
    taskTopic: "",
    templateCopies: [],
    documentationDeck: null,
    documentationBusy: false,
    finalOutcome: null,
    finalOutcomeBusy: false,
    githubZipSize: null,
    slideshowPdfBusy: { client: false, documentation: false },
    trelloReport: null,
    trelloReportBusy: false,
    submissionStage: null,
    submissionBusy: false,
    decompositionCoverage: null,
    identifiedComponentsCount: null,
    // Planning ticks for criteria with no automatic evidence source. In-memory only, never sent to the server.
    sessionTicks: {}
};

function getTaskListCourseFromAllocations(items) {
    return (Array.isArray(items) ? items : []).some((item) => {
        const year = Number.parseInt(String(item?.year_group || "").replace(/[^0-9]/g, ""), 10);
        const course = String(item?.course_type || "").trim().toUpperCase();
        return [9, 10].includes(year) && ["DTECH", "MDTECH"].includes(course);
    }) ? "MiddleDTECH" : "";
}

function getMiddleDtechChecklistRows(standard, rows) {
    const safeRows = Array.isArray(rows) ? rows : [];
    if (standard === "digital-outcome") return safeRows;
    if (standard === "91897" || standard === "91907") {
        return safeRows.filter((step) => {
            if (getStepLevel(step?.text) !== "Achieved") return false;
            const text = stripStepLevel(step?.text || "").toLowerCase();
            return text.includes("project management")
                || text.includes("decompos")
                || /trial(?:l?ing)?\s+(?:the\s+)?components|trailing\s+components/.test(text)
                || /testing\s+functions|test(?:ing)?\s+that\s+the\s+digital\s+technologies\s+outcome\s+functions/i.test(text);
        });
    }
    if (standard === "91893" || standard === "91903") {
        return safeRows.filter((step) => getStepLevel(step?.text) === "Excellence"
            && /using efficient tools and techniques in the outcome.?s production/i.test(stripStepLevel(step?.text || "")));
    }
    return [];
}

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

        if (/^Identify Tools and Techniques for this outcome\.?$/i.test(target)) {
            const legacy = sourceRows.find((row) => /what tools and techniques will be used/i.test(row.text));
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

function buildTaskListStandardSectionAnchor(standard, sectionId) {
    return `#task-list-standard-${String(standard || "").trim()}-${String(sectionId || "").trim()}`;
}

function installTaskListSectionAnchorHandler() {
    if (window.__dtechTaskListSectionAnchorHandlerBound) return;
    window.__dtechTaskListSectionAnchorHandlerBound = true;
    document.addEventListener("click", (event) => {
        const link = event.target?.closest?.('a[href^="#task-list-standard-"]');
        if (!link) return;

        const targetId = String(link.getAttribute("href") || "").slice(1);
        const target = document.getElementById(targetId);
        if (!target) return;

        event.preventDefault();
        const parentDetails = target.closest("details");
        if (parentDetails) parentDetails.open = true;
        window.history.replaceState({}, "", `#${targetId}`);
        window.setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    });
}

function installDigiMedEfficientToolsHandler() {
    if (window.__dtechDigiMedEfficientToolsHandlerBound) return;
    window.__dtechDigiMedEfficientToolsHandlerBound = true;
    document.addEventListener("change", (event) => {
        const checkbox = event.target?.closest?.("[data-digimed-efficient-tool]");
        if (!checkbox) return;
        const subtask = String(checkbox.getAttribute("data-digimed-efficient-tool") || "").trim();
        if (!subtask) return;
        const activityId = taskListState.selectedId;
        const email = getTaskListEmail();
        const state = readDigiMedEfficientToolsState(activityId, email);
        state[subtask] = Boolean(checkbox.checked);
        writeDigiMedEfficientToolsState(activityId, email, state);

        const checklistChanged = autoTickEfficientToolsRequirement(taskListState.checklistState, activityId, email);
        const evidenceChanged = autoTickEfficientToolsRequirement(taskListState.fullEvidenceState, activityId, email);

        renderChecklistCards({ name: taskListState.taskTopic }, taskListState.allItems);
        void persistVideoEfficientToolsToServer(activityId);
        if (checklistChanged || evidenceChanged) {
            const allStandards = Array.from(new Set(Object.keys(taskListState.fullEvidenceState)));
            void saveMyEvidence(activityId, evidenceMapToRows(taskListState.fullEvidenceState, allStandards)).catch(() => {});
        }
    });
}

function isDigiMedVideoEfficientToolSubtask(subtask) {
    return DIGIMED_VIDEO_EFFICIENT_TOOLS_SUBTASKS.includes(String(subtask || "").trim());
}

function isDigiMedImageEfficientToolSubtask(subtask) {
    return DIGIMED_IMAGE_EFFICIENT_TOOLS_SUBTASKS.includes(String(subtask || "").trim());
}

function readVideoEfficientToolsFromLocalCache(activityId, email) {
    const state = readDigiMedEfficientToolsState(activityId, email);
    const allSubtasks = [...DIGIMED_VIDEO_EFFICIENT_TOOLS_SUBTASKS, ...DIGIMED_IMAGE_EFFICIENT_TOOLS_SUBTASKS, ...DIGIMED_EFFICIENT_TOOLS_SUBTASKS];
    return Array.from(new Set(allSubtasks.filter((subtask) => Boolean(state[subtask]))));
}

async function loadVideoEfficientToolsFromServer(activityId, email) {
    const safeActivityId = String(activityId || "").trim();
    if (!safeActivityId || !email) return null;
    try {
        const payload = await loadJson(
            `/api/students/digimed-efficient-tools?activity_id=${encodeURIComponent(safeActivityId)}`,
            { headers: buildTaskListHeaders({}) }
        );
        const tools = Array.isArray(payload?.tools) ? payload.tools : [];
        const state = readDigiMedEfficientToolsState(safeActivityId, email);
        const allSubtasks = [...DIGIMED_VIDEO_EFFICIENT_TOOLS_SUBTASKS, ...DIGIMED_IMAGE_EFFICIENT_TOOLS_SUBTASKS, ...DIGIMED_EFFICIENT_TOOLS_SUBTASKS];
        allSubtasks.forEach((subtask) => {
            state[subtask] = tools.some((tool) => String(tool || "").trim().toLowerCase() === subtask.toLowerCase());
        });
        writeDigiMedEfficientToolsState(safeActivityId, email, state);
        return tools;
    } catch (_error) {
        return null;
    }
}

async function persistVideoEfficientToolsToServer(activityId) {
    const safeActivityId = String(activityId || "").trim();
    if (!safeActivityId) return;
    const tools = readVideoEfficientToolsFromLocalCache(safeActivityId, getTaskListEmail());
    try {
        await loadJson("/api/students/digimed-efficient-tools", {
            method: "POST",
            headers: buildTaskListHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ activity_id: safeActivityId, tools })
        });
    } catch (_error) {
    }
}

function installDigiMedToolsTechniquesHandler() {
    if (window.__dtechDigiMedToolsTechniquesHandlerBound) return;
    window.__dtechDigiMedToolsTechniquesHandlerBound = true;
    document.addEventListener("change", async (event) => {
        const checkbox = event.target?.closest?.("[data-digimed-tools-technique]");
        if (!checkbox) return;
        const subtask = String(checkbox.getAttribute("data-digimed-tools-technique") || "").trim();
        if (!subtask) return;
        const state = readDigiMedToolsTechniquesState(taskListState.selectedId, getTaskListEmail());
        state[subtask] = Boolean(checkbox.checked);
        writeDigiMedToolsTechniquesState(taskListState.selectedId, getTaskListEmail(), state);
        taskListState.fullEvidenceState[DIGIMED_TOOLS_TECHNIQUES_EVIDENCE_STANDARD] = Object.entries(state)
            .filter(([, done]) => Boolean(done))
            .map(([label]) => ({ text: `DIGIMED_TOOLS_TECHNIQUES_ACK|${label}|true`, done: true }));
        autoTickUseOfToolsTechniquesRequirement(taskListState.checklistState, taskListState.templateCopies);
        autoTickUseOfToolsTechniquesRequirement(taskListState.fullEvidenceState, taskListState.templateCopies);
        const allStandards = Array.from(new Set(Object.keys(taskListState.fullEvidenceState)));
        await saveMyEvidence(taskListState.selectedId, evidenceMapToRows(taskListState.fullEvidenceState, allStandards)).catch(() => {});
        renderChecklistCards({ name: taskListState.taskTopic }, taskListState.allItems);
    });
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
    if (/what\s+tools\s+and\s+techniques\s+will\s+be\s+used|identify\s+tools\s+and\s+techniques\s+for\s+this\s+outcome|tools\/?technologies/.test(normalized)) return "tools-and-techniques";
    if (/explain\s+how\s+the\s+outcome\s+will\s+be\s+developed|development\s+steps|outcome\s+developed/.test(normalized)) return "development-steps";
    if (/relevant\s+implications/.test(normalized)) return "relevant-implications";
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
    return /(?:explain(?:ing)?|address(?:ing)?)\s+relevant\s+implications\.?$/i.test(stripStepLevel(text));
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
    const standardsWithCategories = ["91897", "91907"];
    let changed = false;
    standardsWithCategories.forEach((standard) => {
        changed = applyTemplateCopiesToStandardRelevantImplications(stateMap, standard, templateCopies) || changed;
    });
    return changed;
}

function applyTemplateCopiesToStandardRelevantImplications(stateMap, standard, templateCopies) {
    const rows = Array.isArray(stateMap?.[standard]) ? stateMap[standard] : [];
    // An empty/missing templateCopies list must still be enforced (all categories reset to false),
    // not skipped, otherwise a stale incorrect tick can never be corrected.
    if (!rows.length) return false;
    const copies = Array.isArray(templateCopies) ? templateCopies : [];

    // Build set of categories confirmed by DB records
    const usedCategoryKeys = new Set();
    copies.forEach((copy) => {
        // Match by templateTitle (e.g. "Relevant Implications - Functionality")
        const title = String(copy?.templateTitle || "").trim();
        const titleMatch = title.match(/^relevant\s+implications\s*-\s*(.+)$/i);
        if (titleMatch?.[1]) {
            usedCategoryKeys.add(normalizeRelevantImplicationsCategoryKey(titleMatch[1].trim()));
        }
    });

    // Do NOT bail out when usedCategoryKeys is empty — an empty set must still force
    // every category row back to false so stale/incorrect ticks reset each session.
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

    if ((String(standard) === "91897" || String(standard) === "91907") && normalized.includes("project management")) {
        return buildCustomActivityLink(taskListState.selectedId, "Project Management");
    }

    if (String(standard) === "91897" && normalized.includes("decompos")) {
        return buildCustomActivityLink(taskListState.selectedId, "Decomposition of Tasks", "Decomposition of Tasks", "decomposition-tasks");
    }

    if (String(standard) === "91897" && normalized.includes("relevant implications")) {
        return buildCustomActivityLink(taskListState.selectedId, safeText, "Relevant Implications", "relevant-implications");
    }

    if ((String(standard) === "91893" || String(standard) === "91903") && normalized.includes("explaining relevant implications")) {
        return buildCustomActivityLink(taskListState.selectedId, "Explaining relevant implications.", "Relevant Implications", "relevant-implications");
    }

    if ((String(standard) === "91893" || String(standard) === "91903") && normalized.includes("addressing relevant implications")) {
        return buildCustomActivityLink(taskListState.selectedId, "Addressing relevant implications.", "Relevant Implications", "relevant-implications");
    }

    if ((String(standard) === "91893" || String(standard) === "91903")
        && /(?:using appropriate tools and techniques for the purpose and end users|applying appropriate tools and techniques to meet the purpose and end-user requirements)/i.test(normalized)) {
        const useToolsMediaType = String(getAllocatedDigitalMediaType(standard) || "").trim().toUpperCase();
        const useToolsTitle = useToolsMediaType ? `Using Tools & Techniques (${useToolsMediaType})` : "Using Tools & Techniques";
        return buildCustomActivityLink(taskListState.selectedId, useToolsTitle, useToolsTitle, "use-of-tools-and-techniques");
    }

    if ((String(standard) === "91893" || String(standard) === "91903")
        && /using efficient tools and techniques in the outcome.?s production/i.test(normalized)) {
        return buildCustomActivityLink(taskListState.selectedId, "What Tools and Techniques will be used?", "Tools & Techniques", "tools-and-techniques");
    }

    if ((String(standard) === "91893" || String(standard) === "91903")
        && /applying appropriate data integrity and testing procedures/i.test(normalized)) {
        return buildCustomActivityLink(taskListState.selectedId, "Integrity & Validation (WEB)", "Integrity & Validation (WEB)", "code-validation");
    }

    if ((String(standard) === "91897" || String(standard) === "91907")
        && /trial\s+(?:the\s+)?components|triall?ing\s+(?:the\s+)?components|trailing\s+components/.test(normalized)) {
        return buildCustomActivityLink(taskListState.selectedId, safeText, "Trialling Components", "trialling-components");
    }

    if ((String(standard) === "91897" || String(standard) === "91907")
        && /testing\s+functions|test(?:ing)?\s+that\s+the\s+digital\s+technologies\s+outcome\s+functions/.test(normalized)) {
        return buildCustomActivityLink(taskListState.selectedId, safeText, "Testing Functions", "testing-functions");
    }

    if (String(standard) === "digital-outcome"
        && /(?:what tools and techniques will be used|identify tools and techniques for this outcome)/i.test(normalized)) {
        return buildCustomActivityLink(taskListState.selectedId, "Identify Tools and Techniques for this outcome.", "Tools and Techniques", "tools-and-techniques");
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
        // The "(Intend to Use|Currently Using|Have Used)" suffix is written by the Tools & Techniques
        // page's Push to Trello button — it identifies these cards regardless of the tool's own name.
        pattern: /tool|technique|software|library|framework|template|api|plugin|extension|github|trello|onedrive|google drive|vs code|setup|set up|install|sync|version control|\((?:intend to use|currently using|have used)\)/i
    },
    {
        label: "Trialling",
        pattern: /trial|trialling|trialing|prototype|experiment|iterat|mock.?up|wireframe|draft/i
    },
    {
        label: "Testing",
        pattern: /test|testing|debug|bug|verify|validat|check|fix/i
    },
    {
        label: "Success Criteria",
        pattern: /success|criteria|evaluat|measure|review|quality|requirement|spec|acceptance/i
    },
    {
        label: "Client Interaction",
        pattern: /client|stakeholder|end.?user|feedback|meeting|interview|survey|consult|brief|present|sign.?off|approval/i
    }
];

// Keyword patterns must stay in step with the Decomposition page in ProjectPages/activity-detail.js.
const PROJECT_MANAGEMENT_PROCESS_CATEGORIES = [
    {
        label: "Development",
        pattern: /develop|build|implement|code|coding|program|script|create|add|feature|functionality|page|layout|design|html|css|javascript|step/i
    },
    {
        label: "Feedback",
        pattern: /feedback|review|comment|critique|suggestion|improve|iterat|revise|revision/i
    },
    {
        label: "Collaborative (Client, Peer etc)",
        pattern: /client|stakeholder|peer|collaborat|team|meeting|pair|group|end.?user|consult|interview|survey|brief|present|sign.?off|approval/i
    }
];

function countProjectManagementProcessCategories(cards) {
    const haystacks = (Array.isArray(cards) ? cards : [])
        .map((card) => String(card?.name || "").trim())
        .filter(Boolean);

    return PROJECT_MANAGEMENT_PROCESS_CATEGORIES.map((category) => ({
        label: category.label,
        count: haystacks.filter((text) => category.pattern.test(text)).length
    }));
}

function getProjectManagementProcessSubtasks() {
    const activityId = taskListState.selectedId;
    if (!activityId) return [];

    const coverage = readDecompositionCategoryCoverage(activityId, getTaskListEmail());
    return PROJECT_MANAGEMENT_PROCESS_CATEGORIES.map((category) => ({
        label: category.label,
        href: buildCustomActivityLink(activityId, "Project Management"),
        trelloCount: Number(coverage.counts[category.label] || 0),
        coverageKnown: coverage.hasData,
        coverageSavedAt: coverage.savedAt
    }));
}

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

// Session-cached fetch of the growing, student-worded Tools & Techniques keyword index (server-managed,
// grows automatically as students push tool names to Trello). Used to recognise cards typed directly into
// Trello that don't match the hub's own hardcoded keyword patterns.
let taskListToolsTechniquesKeywordsCache = null;
async function fetchToolsTechniquesKeywords() {
    if (taskListToolsTechniquesKeywordsCache) return taskListToolsTechniquesKeywordsCache;
    try {
        const payload = await loadJson("/api/tools-techniques-keywords", { headers: buildTaskListHeaders({}) });
        const rows = Array.isArray(payload?.keywords) ? payload.keywords : [];
        taskListToolsTechniquesKeywordsCache = rows.map((row) => String(row?.keyword || "").trim().toLowerCase()).filter(Boolean);
    } catch (_error) {
        taskListToolsTechniquesKeywordsCache = [];
    }
    return taskListToolsTechniquesKeywordsCache;
}

function countDecompositionTaskCategories(cards, toolsTechniquesKeywords = []) {
    const haystacks = (Array.isArray(cards) ? cards : [])
        .map((card) => String(card?.name || "").trim())
        .filter(Boolean);
    const keywordsLower = Array.isArray(toolsTechniquesKeywords) ? toolsTechniquesKeywords : [];

    return DECOMPOSITION_TASK_CATEGORIES.map((category) => ({
        label: category.label,
        count: haystacks.filter((text) => {
            if (category.pattern.test(text)) return true;
            if (category.label === "Tools & Techniques" && keywordsLower.length) {
                const lowerText = text.toLowerCase();
                return keywordsLower.some((keyword) => keyword && lowerText.includes(keyword));
            }
            return false;
        }).length
    }));
}

function hasCompleteDecompositionCategoryCoverage(coverage) {
    return Boolean(coverage?.hasData && DECOMPOSITION_TASK_CATEGORIES.every((category) =>
        Number(coverage.counts?.[category.label] || 0) > 0
    ));
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

function findStudentGithubRepoUrl(stateMap) {
    for (const steps of Object.values(stateMap || {})) {
        for (const step of (Array.isArray(steps) ? steps : [])) {
            const text = String(step?.text || "").trim();
            if (!text) continue;

            if (text.startsWith("GITHUB_REPO_URL|")) {
                const url = text.slice("GITHUB_REPO_URL|".length).trim();
                if (url) return url;
            } else {
                const match = text.match(/https?:\/\/(?:www\.)?github\.com\/[^\s/]+\/[^\s/]+/i);
                if (match?.[0]) return match[0];
            }
        }
    }

    return "";
}

function getGithubRepoAnalysisKey(activityId, email) {
    return `hub_github_repo_analysis_v1:${String(activityId || "").trim()}:${String(email || "").trim().toLowerCase()}`;
}

function readGithubRepoAnalysis(activityId, email) {
    try {
        const parsed = JSON.parse(localStorage.getItem(getGithubRepoAnalysisKey(activityId, email)) || "{}");
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_error) {
        return {};
    }
}

function writeGithubRepoAnalysis(activityId, email, value) {
    try {
        localStorage.setItem(getGithubRepoAnalysisKey(activityId, email), JSON.stringify(value || {}));
    } catch (_error) {
    }
}

async function runGithubEfficientToolsSync(activityId, email, repoUrl) {
    const payload = await loadJson(
        `/api/integrations/github/repo-analysis?repo_url=${encodeURIComponent(repoUrl)}`,
        { headers: buildTaskListHeaders({}) }
    );

    const efficientToolsState = readDigiMedEfficientToolsState(activityId, email);
    let changed = false;
    (Array.isArray(payload?.categories) ? payload.categories : []).forEach((category) => {
        const label = String(category?.label || "").trim();
        if (!label) return;
        if (category.done && !efficientToolsState[label]) {
            efficientToolsState[label] = true;
            changed = true;
        }
    });

    // Auto-tick the reliably-detectable video practices (version control, folder/bin
    // organisation, file naming, media optimisation) straight from the repo scan.
    const videoTicks = [];
    (Array.isArray(payload?.video_tools_categories) ? payload.video_tools_categories : []).forEach((category) => {
        const label = String(category?.label || "").trim();
        if (!label || !category.done) return;
        if (isDigiMedVideoEfficientToolSubtask(label)) {
            videoTicks.push(label);
            if (!efficientToolsState[label]) {
                efficientToolsState[label] = true;
                changed = true;
            }
        }
    });

    // Auto-tick the reliably-detectable image practices (organised asset folders, layered
    // source files, non-destructive editing, optimised exports) straight from the repo scan.
    const imageTicks = [];
    (Array.isArray(payload?.image_tools_categories) ? payload.image_tools_categories : []).forEach((category) => {
        const label = String(category?.label || "").trim();
        if (!label || !category.done) return;
        if (isDigiMedImageEfficientToolSubtask(label)) {
            imageTicks.push(label);
            if (!efficientToolsState[label]) {
                efficientToolsState[label] = true;
                changed = true;
            }
        }
    });
    if (changed) {
        writeDigiMedEfficientToolsState(activityId, email, efficientToolsState);
    }
    if (videoTicks.length || imageTicks.length) {
        void persistVideoEfficientToolsToServer(activityId);
    }

    // Auto-tick the AS91893 Advanced Tools & Techniques categories (Web/Video/Image share the
    // same 4 labels; only the media type with real repo evidence will ever report done: true).
    const toolsTechniquesGroups = payload?.tools_techniques_categories || {};
    const complexTechniquesGroups = payload?.complex_techniques_categories || {};
    const recognisedToolsTechniquesLabels = new Set([
        ...DIGIMED_TOOLS_TECHNIQUES_SUBTASKS,
        ...DIGIMED_L3_TOOLS_TECHNIQUES_SUBTASKS
    ]);
    const toolsTechniquesState = readDigiMedToolsTechniquesState(activityId, email);
    let toolsTechniquesChanged = false;
    ["web", "video", "image"].forEach((mediaKey) => {
        (Array.isArray(toolsTechniquesGroups[mediaKey]) ? toolsTechniquesGroups[mediaKey] : []).forEach((category) => {
            const label = String(category?.label || "").trim();
            if (!label || !category.done || !recognisedToolsTechniquesLabels.has(label)) return;
            if (!toolsTechniquesState[label]) {
                toolsTechniquesState[label] = true;
                toolsTechniquesChanged = true;
            }
        });
    });
    (Array.isArray(complexTechniquesGroups.image) ? complexTechniquesGroups.image : []).forEach((category) => {
        const label = String(category?.label || "").trim();
        if (!label || !category.done || !DIGIMED_L3_TOOLS_TECHNIQUES_SUBTASKS.includes(label)) return;
        if (!toolsTechniquesState[label]) {
            toolsTechniquesState[label] = true;
            toolsTechniquesChanged = true;
        }
    });
    if (toolsTechniquesChanged) {
        writeDigiMedToolsTechniquesState(activityId, email, toolsTechniquesState);
        void persistDigiMedToolsTechniquesState(activityId, toolsTechniquesState);
    }

    writeGithubRepoAnalysis(activityId, email, {
        repoUrl,
        commitCount: Number(payload?.commit_count || 0),
        commitDayCount: Number(payload?.commit_day_count || 0),
        fileCount: Number(payload?.file_count || 0),
        syncedAt: new Date().toISOString(),
        lastCommitDate: String(payload?.last_commit?.date || "").trim(),
        fcpxmlFile: String(payload?.fcpxml_detected?.file || "").trim(),
        fcpxmlLabels: Array.isArray(payload?.fcpxml_detected?.labels) ? payload.fcpxml_detected.labels : [],
        fcpxmlFiles: Array.isArray(payload?.fcpxml_detected?.files) ? payload.fcpxml_detected.files : [],
        psdFile: String(payload?.psd_detected?.file || "").trim(),
        psdLabels: Array.isArray(payload?.psd_detected?.labels) ? payload.psd_detected.labels : [],
        psdFiles: Array.isArray(payload?.psd_detected?.files) ? payload.psd_detected.files : []
    });

    return payload;
}

// Read-only auto-progress signal for video students: how many practices were detected
// from the repo/FCPXML without them ticking, and whether the timeline export is stale.
function buildVideoAutoProgressNote(activityId, email) {
    const analysis = readGithubRepoAnalysis(activityId, email);
    if (!analysis?.syncedAt) {
        return `<p class="task-list-achieved-note">Link your GitHub repo and it will auto-check these practices each time you open this page.</p>`;
    }

    const efficientToolsState = readDigiMedEfficientToolsState(activityId, email);
    const autoLabels = Array.isArray(analysis.fcpxmlLabels) ? analysis.fcpxmlLabels : [];
    const treeDetected = [
        "Version control / project backups",
        "Appropriate folder/bin organisation",
        "Appropriate file naming",
        "Optimisation/compression of media assets",
        "Appropriate export settings",
        "Management of media assets"
    ];
    const detectedCount = DIGIMED_VIDEO_EFFICIENT_TOOLS_SUBTASKS.filter((subtask) => {
        if (!efficientToolsState[subtask]) return false;
        return treeDetected.includes(subtask) || autoLabels.includes(subtask);
    }).length;

    const fcpxmlFiles = Array.isArray(analysis.fcpxmlFiles) ? analysis.fcpxmlFiles : [];
    const fcpxmlFile = String(analysis.fcpxmlFile || "").trim();
    const fcpxmlFileLabel = fcpxmlFiles.length > 1
        ? `${fcpxmlFiles.length} timelines parsed`
        : fcpxmlFile;
    const lastCommitTs = Date.parse(String(analysis.lastCommitDate || "")) || 0;
    const ageDays = lastCommitTs ? Math.floor((Date.now() - lastCommitTs) / (1000 * 60 * 60 * 24)) : null;
    const isStale = ageDays === null || ageDays > 14;

    const summaryLine = `<p class="task-list-achieved-note">Auto-detected from your project: ${detectedCount} of ${DIGIMED_VIDEO_EFFICIENT_TOOLS_SUBTASKS.length} practices${fcpxmlFileLabel ? ` (timeline: ${escapeTaskListHtml(fcpxmlFileLabel)})` : ""}. Last commit ${escapeTaskListHtml(formatTaskListTimestamp(analysis.lastCommitDate))}.</p>`;
    const nudgeLine = !fcpxmlFile
        ? `<p class="task-list-achieved-note">No timeline export found \u2014 in DaVinci Resolve use File \u2192 Export \u2192 Timeline \u2192 FCPXML and commit it to keep your progress up to date.</p>`
        : (isStale
            ? `<p class="task-list-achieved-note">Your timeline export is ${ageDays === null ? "out of date" : `${ageDays} days old`} \u2014 re-export FCPXML from Resolve and commit to refresh your progress.</p>`
            : "");
    return `${summaryLine}${nudgeLine}`;
}

// Read-only auto-progress signal for image students: how many practices were detected
// from the repo (organised folders, layered source files, optimised exports) without them ticking.
function buildImageAutoProgressNote(activityId, email) {
    const analysis = readGithubRepoAnalysis(activityId, email);
    if (!analysis?.syncedAt) {
        return `<p class="task-list-achieved-note">Link your GitHub repo and it will auto-check these practices each time you open this page.</p>`;
    }

    const efficientToolsState = readDigiMedEfficientToolsState(activityId, email);
    const psdLabels = Array.isArray(analysis.psdLabels) ? analysis.psdLabels : [];
    const treeDetected = [
        "Management of assets",
        "Using layers effectively",
        "Using non-destructive editing techniques",
        "Optimisation and efficient export of image assets"
    ];
    const detectedCount = DIGIMED_IMAGE_EFFICIENT_TOOLS_SUBTASKS.filter((subtask) => {
        if (!efficientToolsState[subtask]) return false;
        return treeDetected.includes(subtask) || psdLabels.includes(subtask);
    }).length;

    const psdFiles = Array.isArray(analysis.psdFiles) ? analysis.psdFiles : [];
    const psdFile = String(analysis.psdFile || "").trim();
    const psdFileLabel = psdFiles.length > 1 ? `${psdFiles.length} PSD files parsed` : psdFile;

    return `<p class="task-list-achieved-note">Auto-detected from your project: ${detectedCount} of ${DIGIMED_IMAGE_EFFICIENT_TOOLS_SUBTASKS.length} practices${psdFileLabel ? ` (layers: ${escapeTaskListHtml(psdFileLabel)})` : ""}. Last commit ${escapeTaskListHtml(formatTaskListTimestamp(analysis.lastCommitDate))}.</p>`;
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
            label: "Trialling",
            displayLabel: "Trialling - COMPONENTS",
            href: buildCustomActivityLink(activityId, "Trial the components of the digital technologies outcome.", "Trialling Components", "trialling-components"),
            done: false
        }),
        withCoverage({
            label: "Testing",
            displayLabel: "Testing - FUNCTIONS",
            href: buildCustomActivityLink(activityId, "Testing that the digital technologies outcome functions as intended.", "Testing Functions", "testing-functions"),
            done: false
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
        // "found: false" is a definitive DB answer (no record), not an unknown state — treat as 0
        // so a stale tick from a prior session/device is corrected instead of left dangling.
        taskListState.identifiedComponentsCount = stored?.found
            ? Math.max(0, Number.parseInt(stored.component_count, 10) || 0)
            : 0;
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

function readTestingFunctionsListCounts(activityId, email, stateMap = {}) {
    const evidenceCountRow = (Array.isArray(stateMap?.["testing-functions-counts"])
        ? stateMap["testing-functions-counts"] : [])
        .find((step) => String(step?.text || "").trim().startsWith("TESTING_FUNCTIONS_COUNT|"));
    if (evidenceCountRow) {
        const match = String(evidenceCountRow.text || "").trim().match(/^TESTING_FUNCTIONS_COUNT\|(\d+)\|(\d+)$/);
        return match
            ? { functionalCount: Number(match[1]), userCount: Number(match[2]) }
            : { functionalCount: 0, userCount: 0 };
    }

    try {
        const key = `${TESTING_FUNCTIONS_LIST_COUNT_STORAGE_PREFIX}:${String(activityId || "").trim()}:${String(email || "").trim().toLowerCase()}`;
        const parsed = JSON.parse(localStorage.getItem(key) || "{}");
        return parsed && typeof parsed === "object"
            ? {
                functionalCount: Math.max(0, Number.parseInt(parsed.functionalCount, 10) || 0),
                userCount: Math.max(0, Number.parseInt(parsed.userCount, 10) || 0)
            }
            : { functionalCount: 0, userCount: 0 };
    } catch (_error) {
        return { functionalCount: 0, userCount: 0 };
    }
}

function getTestingFunctionsSubtasks(stateMap) {
    const activityId = taskListState.selectedId;
    const counts = readTestingFunctionsListCounts(activityId, getTaskListEmail(), stateMap);
    const functionalCount = Number(counts.functionalCount || 0);
    const userCount = Number(counts.userCount || 0);
    const formUrl = getFirstGoogleFormUrlFromEvidenceRows(stateMap);
    return [
        {
            label: "Testing - FUNCTIONS",
            href: buildCustomActivityLink(activityId, "Testing that the digital technologies outcome functions as intended.", "Testing Functions", "testing-functions"),
            done: functionalCount > 0 || userCount > 0,
            countText: `${functionalCount} functional / ${userCount} user`
        },
        {
        label: "Google Form",
        href: buildCustomActivityLink(activityId, "Test that the digital technologies outcome functions as intended.", "Testing Functions", "testing-functions"),
        done: Boolean(formUrl),
        url: formUrl
        }
    ];
}

function getDigiMedConventionsAcknowledgementCount(activityId, email, stateMap = {}) {
    const databaseAreas = new Set();
    Object.values(stateMap || {}).forEach((steps) => {
        (Array.isArray(steps) ? steps : []).forEach((step) => {
            const text = String(step?.text || "").trim();
            const conventionAck = text.match(/^CONVENTION_ACK\|(.+)\|true$/i);
            const persistedState = text.match(/^DIGIMED_STATE\|conventions\|(.+)\|true$/i);
            const area = conventionAck?.[1] || persistedState?.[1] || "";
            if (area) databaseAreas.add(area.trim());
        });
    });
    if (databaseAreas.size) return databaseAreas.size;

    try {
        const key = `${DIGIMED_CONVENTIONS_ACK_STORAGE_PREFIX}:${String(activityId || "").trim()}:${String(email || "").trim().toLowerCase()}`;
        const saved = JSON.parse(localStorage.getItem(key) || "{}");
        return Object.values(saved || {}).filter(Boolean).length;
    } catch (_error) {
        return 0;
    }
}

function getDigiMedConventionsSubtask(stateMap = {}, digitalMediaType = "") {
    const activityId = taskListState.selectedId;
    const mediaType = String(digitalMediaType || "").trim().toLowerCase();
    const isVideo = mediaType === "video";
    const isImage = mediaType === "image";
    const imageCount = (() => {
        if (!isImage) return 0;
        try {
            const key = `${DIGIMED_IMAGE_CONVENTIONS_ACK_STORAGE_PREFIX}:${String(activityId || "").trim()}:${String(getTaskListEmail() || "").trim().toLowerCase()}`;
            const saved = JSON.parse(localStorage.getItem(key) || "{}");
            return Object.values(saved || {}).filter(Boolean).length;
        } catch (_error) {
            return 0;
        }
    })();
    return {
        label: isVideo ? "Conventions (VIDEO)" : isImage ? "Conventions (IMAGE)" : "Conventions (WEB)",
        href: isVideo
            ? buildCustomActivityLink(activityId, "Video Conventions", "Conventions (VIDEO)", "video-conventions")
            : buildCustomActivityLink(activityId, "Using relevant conventions for the media type.", "Conventions (WEB)", "relevant-digimed-conventions"),
        count: isImage ? imageCount : getDigiMedConventionsAcknowledgementCount(activityId, getTaskListEmail(), stateMap)
    };
}

function isWebConventionsRequirementStep(standard, text) {
    const safeStandard = String(standard || "").trim();
    const digitalMediaType = String(getAllocatedDigitalMediaType(safeStandard) || "web").trim().toLowerCase();
    const isVideo = digitalMediaType === "video";
    const isImage = ["image", "graphics", "vector"].includes(digitalMediaType);
    const normalizedText = stripStepLevel(text || "").toLowerCase().replace(/\s+/g, " ").trim();
    return ["91893", "91903"].includes(safeStandard)
        && getStepLevel(text) === "Achieved"
        && !isVideo && !isImage
        && /^using relevant conventions for the media type\.?$/.test(normalizedText);
}

function autoTickWebConventionsRequirement(stateMap, activityId, email) {
    const shouldBeDone = getDigiMedConventionsAcknowledgementCount(activityId, email, stateMap) >= 3;
    let changed = false;

    ["91893", "91903"].forEach((standard) => {
        const rows = Array.isArray(stateMap?.[standard]) ? stateMap[standard] : [];
        rows.forEach((row) => {
            if (!isWebConventionsRequirementStep(standard, row?.text || "")) return;
            if (Boolean(row?.done) !== shouldBeDone) {
                row.done = shouldBeDone;
                changed = true;
            }
        });
    });

    return changed;
}

function getDigiMedUXPrinciplesAcknowledgementCount(activityId, email, stateMap = {}) {
    const databaseAreas = new Set();
    Object.values(stateMap || {}).forEach((steps) => {
        (Array.isArray(steps) ? steps : []).forEach((step) => {
            const text = String(step?.text || "").trim();
            if (text.startsWith("UX_PRINCIPLE_ACK|")) {
                const [, area, value] = text.split("|");
                if (area && String(value || "").trim().toLowerCase() === "true") databaseAreas.add(area.trim());
                return;
            }
            const stateMatch = text.match(/^DIGIMED_STATE\|(?:ux-principles|video-ux)\|(.+)\|true$/i);
            if (stateMatch) {
                databaseAreas.add(stateMatch[1].trim());
            }
        });
    });
    if (databaseAreas.size) return databaseAreas.size;

    try {
        const key = `${DIGIMED_UX_PRINCIPLES_ACK_STORAGE_PREFIX}:${String(activityId || "").trim()}:${String(email || "").trim().toLowerCase()}`;
        const saved = JSON.parse(localStorage.getItem(key) || "{}");
        return Object.values(saved || {}).filter(Boolean).length;
    } catch (_error) {
        return 0;
    }
}

function getDigiMedUXPrinciplesSubtask(stateMap = {}, digitalMediaType = "") {
    const activityId = taskListState.selectedId;
    const isVideo = String(digitalMediaType || "").trim().toLowerCase() === "video";
    return {
        label: isVideo ? "UX Principles (Video)" : "UX Principles (Web)",
        href: isVideo
            ? buildCustomActivityLink(activityId, "Video UX Principles", "UX Principles (Video)", "video-ux-principles")
            : buildCustomActivityLink(activityId, "Applying user experience principles relevant to the purpose of the outcome.", "UX Principles (Web)", "user-experience-principles"),
        count: getDigiMedUXPrinciplesAcknowledgementCount(activityId, getTaskListEmail(), stateMap)
    };
}

function isUXPrinciplesRequirementStep(standard, text) {
    const safeStandard = String(standard || "").trim();
    const normalizedText = stripStepLevel(text || "").toLowerCase().replace(/\s+/g, " ").trim();
    return ["91893", "91903"].includes(safeStandard)
        && getStepLevel(text) === "Achieved"
        && /^applying user experience principles relevant to the purpose of the outcome\.?$/.test(normalizedText);
}

function autoTickUXPrinciplesRequirement(stateMap, activityId, email) {
    const shouldBeDone = getDigiMedUXPrinciplesAcknowledgementCount(activityId, email, stateMap) >= 3;
    let changed = false;

    ["91893", "91903"].forEach((standard) => {
        const rows = Array.isArray(stateMap?.[standard]) ? stateMap[standard] : [];
        rows.forEach((row) => {
            if (!isUXPrinciplesRequirementStep(standard, row?.text || "")) return;
            if (Boolean(row?.done) !== shouldBeDone) {
                row.done = shouldBeDone;
                changed = true;
            }
        });
    });

    return changed;
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
    if (standard !== "91893" && standard !== "91903" && standard !== "91897" && standard !== "91907") {
        return false;
    }

    const normalized = stripStepLevel(text).toLowerCase();
    if ((standard === "91893" || standard === "91903") && level === "Excellence") {
        return /^iterative improvement throughout the design, development and testing process to produce a high-quality outcome\.?$/.test(normalized);
    }

    if ((standard === "91893" || standard === "91903") && level === "Merit") {
        return /^using information from testing procedures to improve the quality of the (?:digital media )?outcome\.?$/.test(normalized);
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

// Rows whose tick state is derived from connected evidence (Trello/GitHub, synced templates, component counts,
// completed implication categories). Everything else has no automatic source and must not persist a manual tick.
function isUseOfToolsTechniquesRequirementStep(standard, text) {
    const safeStandard = String(standard || "").trim();
    const normalizedText = stripStepLevel(text || "").toLowerCase().replace(/\s+/g, " ").trim();
    return (safeStandard === "91893" || safeStandard === "91903")
        && /^(?:using appropriate tools and techniques for the purpose and end users|applying appropriate tools and techniques to meet the purpose and end-user requirements)\.?$/.test(normalizedText);
}

function autoTickUseOfToolsTechniquesRequirement(stateMap, templateCopies) {
    const hasUsedTemplate = (Array.isArray(templateCopies) ? templateCopies : [])
        .some((copy) => String(copy?.templateId || "").trim().toLowerCase() === "use-of-tools-and-techniques");
    const evidenceSteps = Array.isArray(stateMap?.[DIGIMED_TOOLS_TECHNIQUES_EVIDENCE_STANDARD])
        ? stateMap[DIGIMED_TOOLS_TECHNIQUES_EVIDENCE_STANDARD]
        : [];
    const locallyDetected = readDigiMedToolsTechniquesState(taskListState.selectedId, getTaskListEmail());
    let changed = false;

    ["91893", "91903"].forEach((standard) => {
        const labels = standard === "91903" ? DIGIMED_L3_TOOLS_TECHNIQUES_SUBTASKS : DIGIMED_TOOLS_TECHNIQUES_SUBTASKS;
        const detectedCount = labels.filter((label) => Boolean(locallyDetected[label]) || evidenceSteps.some((step) => {
            const match = String(step?.text || "").match(/^DIGIMED_TOOLS_TECHNIQUES_ACK\|(.+)\|true$/i);
            return match?.[1]?.trim() === label;
        })).length;
        const shouldBeDone = hasUsedTemplate && detectedCount >= 3;
        const rows = Array.isArray(stateMap?.[standard]) ? stateMap[standard] : [];
        rows.forEach((row) => {
            if (!isUseOfToolsTechniquesRequirementStep(standard, row?.text || "")) return;
            if (Boolean(row?.done) !== shouldBeDone) {
                row.done = shouldBeDone;
                changed = true;
            }
        });
    });

    return changed;
}

function getStepAutoManagementKind(standard, text) {
    const std = String(standard || "").trim();
    const level = getStepLevel(text);
    const stripped = stripStepLevel(text || "").toLowerCase();

    if ((std === "91897" || std === "91907") && level === "Achieved" && stripped.includes("project management")) {
        return "auto";
    }
    if (isTestingFunctionsRequirementStep(std, text)) {
        return "auto";
    }
    if (isWebIntegrityRequirementStep(std, text)) {
        return "auto";
    }
    if (isUXPrinciplesRequirementStep(std, text)) {
        return "auto";
    }
    if (isWebConventionsRequirementStep(std, text)) {
        return "auto";
    }
    if (isDecompositionRequirementStep(std, text)) {
        return "auto";
    }
    if (isUseOfToolsTechniquesRequirementStep(std, text)) {
        return "auto";
    }
    if (isTriallingComponentsRequirementStep(std, text)) {
        return "auto";
    }
    if (std === "digital-outcome" && Boolean(inferDigitalOutcomeTaskTemplateId(stripped))) {
        return "auto";
    }
    if ((std === "91897" || std === "91907") && level === "Merit"
        && /^(?:effectively\s+)?trial(?:l?ing)?\s+multiple\s+components\s+and\/or\s+techniques\b/.test(stripped)) {
        return "auto";
    }
    if ((std === "91897" || std === "91907") && level === "Achieved" && /^explain(?:ing)? relevant implications\.?$/.test(stripped)) {
        return "auto";
    }
    if ((std === "91893" || std === "91903")
        && /^(?:explain(?:ing)?|address(?:ing)?) relevant implications\.?$/.test(stripped)) {
        return "auto";
    }
    if (std === "91897" && /^address(?:ing)? relevant implications\.?$/.test(stripped)) {
        return "locked";
    }
    if ((std === "91893" || std === "91903") && isEfficientToolsMainStep(text)) {
        return "auto";
    }
    return "manual";
}

function isDecompositionRequirementStep(standard, text) {
    const safeStandard = String(standard || "").trim();
    const normalizedText = stripStepLevel(text || "").toLowerCase().replace(/\s+/g, " ").trim();
    return ["91897", "91907"].includes(safeStandard)
        && getStepLevel(text) === "Achieved"
        && /\bdecompos/.test(normalizedText);
}

function autoTickDecompositionRequirement(stateMap, activityId, email) {
    const coverage = readDecompositionCategoryCoverage(activityId, email);
    const shouldBeDone = hasCompleteDecompositionCategoryCoverage(coverage);
    let changed = false;

    ["91897", "91907"].forEach((standard) => {
        const rows = Array.isArray(stateMap?.[standard]) ? stateMap[standard] : [];
        rows.forEach((row) => {
            if (!isDecompositionRequirementStep(standard, row?.text || "")) return;
            if (Boolean(row?.done) !== shouldBeDone) {
                row.done = shouldBeDone;
                changed = true;
            }
        });
    });

    return changed;
}

function getSessionTickKey(standard, index) {
    return `${String(standard || "").trim()}:${Number(index)}`;
}

// Criteria with no automatic evidence source must never keep a saved tick — clear any legacy true value on load.
function clearUnverifiedManualTicks(stateMap) {
    let changed = false;
    Object.keys(stateMap || {}).forEach((standard) => {
        const rows = Array.isArray(stateMap[standard]) ? stateMap[standard] : [];
        rows.forEach((row) => {
            const text = String(row?.text || "").trim();
            if (!text || isRelevantImplicationsCategoryStep(text)) return;
            if (getStepAutoManagementKind(standard, text) !== "manual") return;
            if (Boolean(row?.done)) {
                row.done = false;
                changed = true;
            }
        });
    });
    return changed;
}

function autoTickProjectManagementRequirement(stateMap) {
    // The connection subtasks are rendered from fullEvidenceState, so use that same authoritative
    // state when calculating the persisted criterion tick.
    const systems = inferStudentSystemConnections(taskListState.fullEvidenceState || stateMap || {});
    const hasOtherSystem = systems.githubConnected || systems.oneDriveConnected || systems.googleDriveConnected;
    // Must correct in both directions — this row is excluded from clearUnverifiedManualTicks (treated as
    // "auto"), so if it only ever ticks true it can never be un-ticked once the linked evidence disappears.
    const shouldBeDone = Boolean(systems.trelloConnected && hasOtherSystem);

    let changed = false;
    ["91897", "91907"].forEach((standard) => {
        const rows = Array.isArray(stateMap?.[standard]) ? stateMap[standard] : [];
        rows.forEach((row) => {
            const text = String(row?.text || "").trim();
            if (!text || getStepLevel(text) !== "Achieved") return;
            if (!stripStepLevel(text).toLowerCase().includes("project management")) return;
            if (Boolean(row?.done) !== shouldBeDone) {
                row.done = shouldBeDone;
                changed = true;
            }
        });
    });
    return changed;
}

// DB-backed evidence: a template copy recorded by "Sync from Google Drive" is an explicit
// student action, so it counts for all Digital Outcome template rows (all-match rollout).
function hasTemplateCopyForDigitalOutcomeTask(taskText) {
    const templateId = inferDigitalOutcomeTaskTemplateId(taskText);
    if (!templateId) return false;
    return (Array.isArray(taskListState.templateCopies) ? taskListState.templateCopies : [])
        .some((copy) => {
            const copyId = String(copy?.templateId || "").trim().toLowerCase();
            return copyId === templateId
                || (templateId === "testing-functions" && copyId.startsWith("testing-functions-"));
        });
}

function isTestingFunctionsRequirementStep(standard, text) {
    const safeStandard = String(standard || "").trim();
    const normalizedText = stripStepLevel(text || "").toLowerCase().replace(/\s+/g, " ").trim();
    return ["91897", "91907"].includes(safeStandard)
        && getStepLevel(text) === "Achieved"
        && /^test(?:ing)? that the digital technologies outcome functions as intended\.?$/.test(normalizedText);
}

function autoTickTestingFunctionsRequirement(stateMap, countStateMap, activityId, email) {
    const counts = readTestingFunctionsListCounts(activityId, email, countStateMap);
    const hasTestingFunctionsSlide = hasTemplateCopyForDigitalOutcomeTask(
        "Test that the digital technologies outcome functions as intended."
    );
    const shouldBeDone = hasTestingFunctionsSlide || counts.functionalCount + counts.userCount > 0;
    let changed = false;

    ["91897", "91907"].forEach((standard) => {
        const rows = Array.isArray(stateMap?.[standard]) ? stateMap[standard] : [];
        rows.forEach((row) => {
            if (!isTestingFunctionsRequirementStep(standard, row?.text || "")) return;
            if (Boolean(row?.done) !== shouldBeDone) {
                row.done = shouldBeDone;
                changed = true;
            }
        });
    });

    return changed;
}

function isWebIntegrityRequirementStep(standard, text) {
    const safeStandard = String(standard || "").trim();
    const digitalMediaType = String(getAllocatedDigitalMediaType(safeStandard) || "").trim().toLowerCase();
    const isVideo = digitalMediaType === "video";
    const isImage = ["image", "graphics", "vector"].includes(digitalMediaType);
    const normalizedText = stripStepLevel(text || "").toLowerCase().replace(/\s+/g, " ").trim();
    return ["91893", "91903"].includes(safeStandard)
        && getStepLevel(text) === "Achieved"
        && !isVideo && !isImage
        && /^applying appropriate data integrity and testing procedures\.?$/.test(normalizedText);
}

function hasCompletedWebIntegritySlide(stateMap) {
    return (Array.isArray(taskListState.templateCopies) ? taskListState.templateCopies : [])
        .some((copy) => String(copy?.templateId || "").trim().toLowerCase() === "testing-functions-markup-validation");
}

function autoTickWebIntegrityRequirement(stateMap) {
    const shouldBeDone = hasCompletedWebIntegritySlide(stateMap);
    let changed = false;

    ["91893", "91903"].forEach((standard) => {
        const rows = Array.isArray(stateMap?.[standard]) ? stateMap[standard] : [];
        rows.forEach((row) => {
            if (!isWebIntegrityRequirementStep(standard, row?.text || "")) return;
            if (Boolean(row?.done) !== shouldBeDone) {
                row.done = shouldBeDone;
                changed = true;
            }
        });
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

        const hasEligibleSync = hasSyncedSlideForTaskTopic(projectId, email, text)
            || hasTemplateCopyForDigitalOutcomeTask(text);
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

function isTriallingComponentsRequirementStep(standard, text) {
    const safeStandard = String(standard || "").trim();
    const stripped = stripStepLevel(text || "").toLowerCase().replace(/\s+/g, " ").trim();
    return ["91897", "91907"].includes(safeStandard)
        && getStepLevel(text) === "Achieved"
        && /^trial(?:l?ing)?\s+(?:the\s+)?components\b/.test(stripped);
}

function autoTickTriallingComponentsRequirement(stateMap, componentCount) {
    if (!Number.isFinite(componentCount)) return false;

    const shouldBeDone = componentCount > 0;
    let changed = false;
    ["91897", "91907"].forEach((standard) => {
        const rows = Array.isArray(stateMap?.[standard]) ? stateMap[standard] : [];
        rows.forEach((row) => {
            if (!isTriallingComponentsRequirementStep(standard, row?.text || "")) return;
            if (Boolean(row?.done) !== shouldBeDone) {
                row.done = shouldBeDone;
                changed = true;
            }
        });
    });

    return changed;
}

function isEfficientToolsMainStep(text) {
    return getStepLevel(text) === "Excellence"
        && /using efficient tools and techniques in the outcome.?s production/i.test(stripStepLevel(text || ""));
}

// Mirrors the Relevant Implications "3 or more categories" pattern: the main Excellence row is
// fully DB/localStorage-driven from the subtask ticks, never a standalone manual tick.
function autoTickEfficientToolsRequirement(stateMap, activityId, email) {
    let changed = false;
    ["91893", "91903"].forEach((standard) => {
        const rows = Array.isArray(stateMap?.[standard]) ? stateMap[standard] : [];
        if (!rows.length) return;

        const mediaType = getAllocatedDigitalMediaType(standard).toLowerCase();
        const subtasks = mediaType === "video"
            ? DIGIMED_VIDEO_EFFICIENT_TOOLS_SUBTASKS
            : (mediaType === "image" || mediaType === "graphics" || mediaType === "vector")
                ? DIGIMED_IMAGE_EFFICIENT_TOOLS_SUBTASKS
                : DIGIMED_EFFICIENT_TOOLS_SUBTASKS;
        const efficientToolsState = readDigiMedEfficientToolsState(activityId, email);
        const completedCount = subtasks.filter((subtask) => Boolean(efficientToolsState[subtask])).length;
        const shouldBeDone = completedCount >= 3;

        rows.forEach((row) => {
            if (!isEfficientToolsMainStep(row?.text)) return;
            if (Boolean(row?.done) !== shouldBeDone) {
                row.done = shouldBeDone;
                changed = true;
            }
        });
    });
    return changed;
}

function sync91893RelevantImplicationsState(stateMap) {
    // 91893 pairs with the Level 2 process standard (91897); 91903 pairs with the Level 3 one (91907).
    const pairs = [
        { source: "91897", target: "91893" },
        { source: "91907", target: "91903" }
    ];

    let changed = false;
    pairs.forEach(({ source, target }) => {
        const sourceRows = Array.isArray(stateMap?.[source]) ? stateMap[source] : [];
        const targetRows = Array.isArray(stateMap?.[target]) ? stateMap[target] : [];
        if (!sourceRows.length || !targetRows.length) {
            return;
        }

        const sourceExplainingDone = sourceRows.some((row) => {
            const text = stripStepLevel(row?.text || "").toLowerCase();
            return /^explain(?:ing)? relevant implications\.?$/.test(text) && Boolean(row?.done);
        });
        const sourceAddressingDone = sourceRows.some((row) => {
            const text = stripStepLevel(row?.text || "").toLowerCase();
            return /^address(?:ing)? relevant implications\.?$/.test(text) && Boolean(row?.done);
        });

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
    });
    return changed;
}

function autoTickRelevantImplicationsRequirements(stateMap, projectId, email) {
    const addressTicksChanged = clearAddressRelevantImplicationsTicks(stateMap);
    let changed = false;

    ["91897", "91907"].forEach((standard) => {
        const rows = Array.isArray(stateMap?.[standard]) ? stateMap[standard] : [];
        if (!rows.length) return;

        const completedCategoryCount = countCompletedRelevantImplicationsCategories(rows);
        const shouldMarkSectionComplete = completedCategoryCount >= 3;

        rows.forEach((row) => {
            const text = String(row?.text || "").trim();
            if (!text || getStepLevel(text) !== "Achieved") return;

            const stripped = stripStepLevel(text).toLowerCase();
            if (!/^explain(?:ing)? relevant implications\.?$/.test(stripped)) return;
            if (Boolean(row?.done) !== shouldMarkSectionComplete) {
                row.done = shouldMarkSectionComplete;
                changed = true;
            }
        });
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
    const payload = await loadJson("/api/my-allocations?view=task-list", { headers: buildTaskListHeaders({}) });
    return {
        assessment_tasks: Array.isArray(payload?.assessment_tasks) ? payload.assessment_tasks : [],
        projects: Array.isArray(payload?.projects) ? payload.projects : [],
        task_list_course: String(payload?.task_list_course || "").trim()
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

const TASK_LIST_AUTO_DRIVE_SYNC_COOLDOWN_MS = 15 * 60 * 1000;
const taskListAutoDriveSyncAttemptAt = new Map();

async function autoSyncToolsAndTechniquesTemplateCopy(activityId, email, currentCopies) {
    const copies = Array.isArray(currentCopies) ? currentCopies : [];
    if (!activityId || !email || copies.some((copy) => String(copy?.templateId || "").trim().toLowerCase() === "use-of-tools-and-techniques")) {
        return copies;
    }

    const accessToken = typeof window.getActiveHubDriveAccessToken === "function"
        ? String(window.getActiveHubDriveAccessToken() || "").trim()
        : "";
    if (!accessToken) return copies;

    const syncKey = `${String(activityId).trim()}:${String(email).trim().toLowerCase()}`;
    const previousAttempt = Number(taskListAutoDriveSyncAttemptAt.get(syncKey) || 0);
    if (Date.now() - previousAttempt < TASK_LIST_AUTO_DRIVE_SYNC_COOLDOWN_MS) return copies;
    taskListAutoDriveSyncAttemptAt.set(syncKey, Date.now());

    try {
        const payload = await loadJson(`/api/activities/${encodeURIComponent(activityId)}/sync-drive-templates`, {
            method: "POST",
            headers: buildTaskListHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ driveAccessToken: accessToken })
        });
        return Array.isArray(payload?.template_copies) ? payload.template_copies : copies;
    } catch (_error) {
        return copies;
    }
}

function renderSavedFullSlideSet(copies) {
    const input = document.querySelector("#task-list-slide-set-url");
    const savedHost = document.querySelector("#task-list-slide-set-saved");
    const syncButton = document.querySelector("#task-list-sync-slide-set");
    const savedEntry = (Array.isArray(copies) ? copies : [])
        .find((copy) => String(copy?.templateId || "").trim().toLowerCase() === "assessment-full-slide-set");
    const savedUrl = String(savedEntry?.fileUrl || "").trim();

    if (input) input.value = savedUrl;
    if (syncButton) syncButton.textContent = savedUrl ? "Sync saved slide set" : "Save and sync slide set";
    if (savedHost) {
        savedHost.innerHTML = savedUrl
            ? `
                <div class="task-list-slide-set-card">
                    <div class="task-list-slide-set-card-main">
                        <span class="task-list-slide-set-card-title">${escapeTaskListHtml(String(savedEntry?.fileName || "Full slide set"))}</span>
                        <span>Saved for this assessment</span>
                    </div>
                    <div class="task-list-slide-set-card-actions">
                        <button type="button" data-slide-set-use>Use</button>
                        <a href="${escapeTaskListHtml(savedUrl)}" target="_blank" rel="noopener">Open</a>
                        <button type="button" data-slide-set-delete>Delete</button>
                    </div>
                </div>
            `
            : "";
        savedHost.hidden = !savedUrl;
    }
}

function isSeniorDigitalMediaTask(item) {
    const standards = `${String(item?.standard_1 || "")} ${String(item?.standard_2 || "")}`;
    return taskListState.course === "SeniorDTECH" && /\b(?:91893|91903)\b/.test(standards);
}

function renderFinalClientPresentationCard(item) {
    const workspace = document.querySelector("#task-list-workspace");
    const card = document.querySelector("#task-list-client-presentation-card");
    if (!workspace || !card) return;

    const eligible = isSeniorDigitalMediaTask(item);
    workspace.classList.toggle("has-client-presentation", eligible);
    card.hidden = !eligible;
    const finalStages = document.querySelector("#task-list-final-stages");
    if (finalStages) finalStages.hidden = !eligible;
    if (!eligible) return;

    const entry = taskListState.templateCopies.find((copy) =>
        String(copy?.templateId || "").trim().toLowerCase() === "final-client-presentation"
    );
    const action = card.querySelector("#task-list-client-presentation-action");
    const folderLink = card.querySelector("#task-list-client-presentation-folder");
    const status = card.querySelector("#task-list-client-presentation-status");
    if (action) action.textContent = entry?.fileUrl ? "Open presentation" : "Create presentation";
    const folderUrl = String(entry?.processAssessmentFolderUrl || entry?.destinationFolderUrl || "").trim();
    if (folderLink) {
        folderLink.hidden = !folderUrl;
        if (folderUrl) folderLink.href = folderUrl;
    }
    if (status) status.textContent = entry?.fileUrl
        ? "Your client presentation is saved in SeniorDTECH / Process Assessment."
        : "Create a guided Google Slides deck for your client walkthrough.";
    renderSlideshowPdfState("client", entry?.fileUrl || "");
}

function buildDocumentationTopicOrder(links, origin, copies = []) {
    const topics = [];
    const seen = new Set();
    const aliases = { "code-validation": "testing-functions-markup-validation", "success-criteria": "project-success-criteria" };
    const add = (templateId, label) => {
        const id = aliases[templateId] || templateId;
        if (!id || seen.has(id) || ["final-client-presentation", "submission-documentation-deck", "assessment-full-slide-set"].includes(id)) return;
        seen.add(id);
        topics.push({ templateId: id, label: String(label || id).trim() });
    };
    (Array.isArray(links) ? links : []).forEach((link) => {
        try {
            const url = new URL(link.href, origin);
            if (url.origin === origin) add(String(url.searchParams.get("templateId") || ""), link.label);
            else copies.filter((copy) => copy?.fileUrl && new URL(copy.fileUrl).pathname === url.pathname)
                .forEach((copy) => add(String(copy.templateId || ""), link.label));
        } catch (_error) {
        }
    });
    return topics;
}

function renderDocumentationDeckState(deck, message = "") {
    taskListState.documentationDeck = deck || null;
    const link = document.querySelector("#task-list-documentation-open");
    const originalLink = document.querySelector("#task-list-documentation-original");
    const ready = document.querySelector("#task-list-documentation-ready");
    const merge = document.querySelector("[data-documentation-merge]");
    const add = document.querySelector("[data-documentation-add]");
    const input = document.querySelector("#task-list-documentation-url");
    const status = document.querySelector("#task-list-documentation-status");
    const fileUrl = /^https:\/\/docs\.google\.com\/presentation\/d\/[A-Za-z0-9_-]+(?:\/|$)/.test(String(deck?.fileUrl || "")) ? deck.fileUrl : "";
    if (link) { link.hidden = !fileUrl; if (fileUrl) link.href = fileUrl; }
    const originalUrl = /^https:\/\/docs\.google\.com\/presentation\/d\/[A-Za-z0-9_-]+(?:\/|$)/.test(String(deck?.documentation?.existingDeck?.fileUrl || ""))
        ? deck.documentation.existingDeck.fileUrl : "";
    if (originalLink) { originalLink.hidden = !originalUrl; if (originalUrl) originalLink.href = originalUrl; }
    if (ready) ready.hidden = !(fileUrl && deck?.documentation?.readyForStage3);
    if (merge) merge.hidden = Boolean(fileUrl && deck?.documentation?.mode === "linked");
    if (add) add.hidden = !fileUrl || deck?.documentation?.mode !== "linked";
    if (input) input.value = fileUrl;
    const missing = Array.isArray(deck?.documentation?.missingTopics) ? deck.documentation.missingTopics : [];
    if (status) status.textContent = [
        message,
        deck?.documentation?.partial ? "Some slides remain. Use Add missing slides to continue." : "",
        missing.length ? `Missing evidence: ${missing.join(", ")}.` : ""
    ].filter(Boolean).join(" ");
    renderSlideshowPdfState("documentation", fileUrl);
}

function renderSlideshowPdfState(kind, sourceUrl) {
    const prefix = kind === "client" ? "task-list-client-pdf" : "task-list-documentation-pdf";
    const button = document.querySelector(`#${prefix}-convert`);
    const link = document.querySelector(`#${prefix}-open`);
    const status = document.querySelector(`#${prefix}-status`);
    if (!button || !link || !status) return;
    const sourceId = String(sourceUrl || "").match(/^https:\/\/docs\.google\.com\/presentation\/d\/([A-Za-z0-9_-]+)(?:\/|$)/)?.[1] || "";
    const templateId = kind === "client" ? "client-presentation-pdf" : "submission-documentation-pdf";
    const saved = taskListState.templateCopies.find((entry) => entry?.templateId === templateId);
    const matching = Boolean(sourceId && saved?.pdfExport?.sourcePresentationId === sourceId);
    const fileUrl = /^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]+\/view$/.test(String(saved?.fileUrl || "")) ? saved.fileUrl : "";
    button.disabled = !sourceId || Boolean(taskListState.slideshowPdfBusy?.[kind]);
    link.hidden = !matching || !fileUrl;
    if (matching && fileUrl) link.href = fileUrl;
    const exportedAt = new Date(saved?.pdfExport?.exportedAt || "");
    status.textContent = matching && fileUrl
        ? `PDF saved in SeniorDTECH / Process Assessment${Number.isFinite(exportedAt.getTime()) ? ` / ${exportedAt.toLocaleString("en-NZ", { timeZone: "Pacific/Auckland" })}` : ""}`
        : saved && sourceId ? "The saved PDF belongs to a previously linked slideshow." : "";
}

async function handleSlideshowPdfExport(kind) {
    if (!["client", "documentation"].includes(kind)) return;
    const selected = taskListState.allItems.find((item) => String(item.id) === taskListState.selectedId);
    if (!isSeniorDigitalMediaTask(selected) || taskListState.slideshowPdfBusy[kind]) return;
    const activityId = String(selected.id);
    const source = kind === "client" ? taskListState.templateCopies.find((entry) => entry?.templateId === "final-client-presentation") : taskListState.documentationDeck;
    const sourceUrl = String(source?.fileUrl || "");
    const sourceId = sourceUrl.match(/^https:\/\/docs\.google\.com\/presentation\/d\/([A-Za-z0-9_-]+)(?:\/|$)/)?.[1] || "";
    if (!sourceId) return;
    const status = document.querySelector(kind === "client" ? "#task-list-client-pdf-status" : "#task-list-documentation-pdf-status");
    taskListState.slideshowPdfBusy[kind] = true;
    renderSlideshowPdfState(kind, sourceUrl);
    if (status) status.textContent = "Converting slideshow and saving the PDF to Google Drive...";
    let message = "";
    try {
        const token = await requestHubDriveAccessToken({ forceConsent: false });
        if (taskListState.selectedId !== activityId) return;
        if (token?.error || !token?.access_token) throw new Error("Google Drive permission is required. Allow access and try again.");
        const payload = await loadJson(`/api/activities/${encodeURIComponent(activityId)}/slideshow-pdf`, {
            method: "POST", headers: buildTaskListHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ kind, sourcePresentationId: sourceId, driveAccessToken: token.access_token })
        });
        if (taskListState.selectedId !== activityId) return;
        taskListState.templateCopies = taskListState.templateCopies.filter((entry) => entry?.templateId !== payload.saved.templateId).concat(payload.saved);
        message = "PDF saved to SeniorDTECH / Process Assessment. The slideshow and earlier PDFs are unchanged.";
        void loadSubmissionStage(selected);
    } catch (error) {
        message = error?.message || "Could not convert and save your slideshow PDF.";
    } finally {
        taskListState.slideshowPdfBusy[kind] = false;
        if (taskListState.selectedId === activityId) {
            const currentSource = kind === "client" ? taskListState.templateCopies.find((entry) => entry?.templateId === "final-client-presentation") : taskListState.documentationDeck;
            renderSlideshowPdfState(kind, currentSource?.fileUrl || "");
            if (status && message) status.textContent = message;
        }
    }
}

async function loadDocumentationDeck(item) {
    if (!isSeniorDigitalMediaTask(item)) return;
    const activityId = String(item.id);
    renderDocumentationDeckState(null, "Checking saved documentation...");
    try {
        const payload = await loadJson(`/api/activities/${encodeURIComponent(activityId)}/documentation-deck`, {
            headers: buildTaskListHeaders({}), cache: "no-store"
        });
        if (taskListState.selectedId !== activityId) return;
        renderDocumentationDeckState(payload.deck, !payload.mergeConfigured
            ? "Linked merging and Add missing slides require the school's Apps Script setup." : "");
    } catch (error) {
        if (taskListState.selectedId === activityId) renderDocumentationDeckState(null, error?.message || "Could not load documentation.");
    }
}

function requestDocumentationMergeToken() {
    return new Promise((resolve) => {
        if (!window.google?.accounts?.oauth2 || !getTaskListGoogleClientId()) {
            resolve({ error: "Google sign-in is not ready. Reload and try again." }); return;
        }
        const client = window.google.accounts.oauth2.initTokenClient({
            client_id: getTaskListGoogleClientId(),
            scope: "openid email profile https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/presentations",
            include_granted_scopes: true,
            hint: getTaskListEmail(),
            callback: resolve,
            error_callback: () => resolve({ error: "Google permission was cancelled or blocked." })
        });
        client.requestAccessToken({ prompt: "" });
    });
}

async function handleDocumentationAction(action) {
    const item = taskListState.allItems.find((candidate) => String(candidate.id) === taskListState.selectedId);
    if (!isSeniorDigitalMediaTask(item) || taskListState.documentationBusy) return;
    const activityId = String(item.id);
    const presentationUrl = String(document.querySelector("#task-list-documentation-url")?.value || "").trim();
    const topics = buildDocumentationTopicOrder(Array.from(document.querySelectorAll("#task-list-checklist a[href]"))
        .map((link) => ({ href: link.getAttribute("href"), label: link.textContent })), window.location.origin, taskListState.templateCopies);
    const status = document.querySelector("#task-list-documentation-status");
    const buttons = Array.from(document.querySelectorAll("[data-documentation-merge], [data-documentation-sync], [data-documentation-add]"));
    taskListState.documentationBusy = true;
    buttons.forEach((button) => { button.disabled = true; });
    if (status) status.textContent = action === "sync" ? "Checking your existing documentation deck..." : "Preparing linked documentation slides...";
    try {
        if (action === "sync" && !/^https:\/\/docs\.google\.com\/presentation\/d\/[A-Za-z0-9_-]+(?:\/|$)/.test(presentationUrl)) {
            throw new Error("Paste a valid Google Slides link first.");
        }
        const token = action === "sync"
            ? await requestHubDriveAccessToken({ forceConsent: false })
            : await requestDocumentationMergeToken();
        if (token?.error || !token?.access_token) throw new Error("Google Drive permission is required. Allow access and try again.");
        if (taskListState.selectedId !== activityId) return;
        const payload = await loadJson(`/api/activities/${encodeURIComponent(activityId)}/documentation-deck`, {
            method: "POST", headers: buildTaskListHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ action, presentationUrl, topics, driveAccessToken: token.access_token })
        });
        if (taskListState.selectedId !== activityId) return;
        renderDocumentationDeckState(payload.deck, action === "sync"
            ? "Existing documentation linked. Its contents have not been changed."
            : `${Number(payload.addedSlides || 0)} linked slides added. Originals are unchanged.`);
        void loadSubmissionStage(item);
    } catch (error) {
        if (status && taskListState.selectedId === activityId) status.textContent = error?.message || "Could not prepare documentation.";
    } finally {
        taskListState.documentationBusy = false;
        buttons.forEach((button) => { button.disabled = false; });
    }
}

function renderGithubZipSize() {
    const state = taskListState.githubZipSize;
    if (!state || state.activityId !== taskListState.selectedId) return;
    document.querySelectorAll("[data-github-zip-size]").forEach((element) => {
        element.textContent = state.text;
        element.title = state.title || "";
    });
}

async function loadGithubZipSize(activityId, repositoryUrl) {
    const state = { activityId: String(activityId), repositoryUrl, text: repositoryUrl ? "ZIP: checking..." : "ZIP: no repository selected", title: "" };
    taskListState.githubZipSize = state;
    renderGithubZipSize();
    if (!repositoryUrl) return;
    try {
        const payload = await loadJson(`/api/activities/${encodeURIComponent(state.activityId)}/github-zip-size?repositoryUrl=${encodeURIComponent(repositoryUrl)}`, {
            headers: buildTaskListHeaders({}), cache: "no-store"
        });
        if (taskListState.githubZipSize !== state || taskListState.selectedId !== state.activityId) return;
        const measurement = payload.measurement;
        if (!Number.isFinite(measurement?.bytes) || measurement.bytes < 0 || !/^[a-f0-9]{40}$/i.test(String(measurement.commitSha || ""))) throw new Error("GitHub did not return a valid ZIP measurement.");
        state.text = `ZIP: ${measurement.exact ? "" : "over "}${(measurement.bytes / 1048576).toFixed(2)} MiB`;
        state.title = `${measurement.repositoryUrl} | ${measurement.branch} | ${measurement.commitSha.slice(0, 12)} | Measured ${measurement.measuredAt}`;
    } catch (error) {
        state.text = "ZIP: unavailable";
        state.title = error?.message || "Could not measure the repository ZIP.";
    }
    if (taskListState.githubZipSize === state) renderGithubZipSize();
}

function renderFinalOutcomeState() {
    const state = taskListState.finalOutcome;
    const select = document.querySelector("#task-list-outcome-repository");
    if (!state || !select) return;
    select.replaceChildren();
    const repositories = state.repositories || [];
    if (repositories.length > 1) {
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Select repository";
        select.append(placeholder);
    }
    const options = repositories.length ? repositories : [{ url: "", owner: "No saved GitHub repository", repo: "" }];
    options.forEach((repository) => {
        const option = document.createElement("option");
        option.value = repository.url;
        option.textContent = repository.repo ? `${repository.owner}/${repository.repo}` : repository.owner;
        select.append(option);
    });
    select.value = state.repositoryUrl || "";
    select.disabled = taskListState.finalOutcomeBusy || !repositories.length;
    const confirmed = document.querySelector("#task-list-outcome-pushed").checked;
    document.querySelector("#task-list-outcome-download").disabled = taskListState.finalOutcomeBusy || !confirmed || !state.repositoryUrl || !state.configured;
    document.querySelector("#task-list-outcome-save").hidden = !state.retryDriveSave;
    document.querySelector("#task-list-outcome-save").disabled = taskListState.finalOutcomeBusy || !confirmed || !state.snapshot || state.snapshot.expiresAt <= Date.now();
    const version = document.querySelector("#task-list-outcome-version");
    version.textContent = state.snapshot
        ? `Prepared ZIP: ${state.snapshot.branch} / ${state.snapshot.commitSha.slice(0, 12)} / ${(state.snapshot.bytes / 1048576).toFixed(2)} MB`
        : "";
    const saved = state.saved;
    const link = document.querySelector("#task-list-outcome-open");
    const safeUrl = /^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]+\/view$/.test(String(saved?.fileUrl || "")) ? saved.fileUrl : "";
    link.hidden = !safeUrl;
    if (safeUrl) link.href = safeUrl;
    document.querySelector("#task-list-outcome-saved-version").textContent = safeUrl
        ? `Saved in SeniorDTECH / Process Assessment${saved.finalOutcome?.commitSha ? ` / ${saved.finalOutcome.commitSha.slice(0, 12)}` : ""}` : "";
    document.querySelector("#task-list-outcome-status").textContent = state.message || "";
}

async function loadFinalOutcome(item) {
    if (!isSeniorDigitalMediaTask(item)) return;
    const state = { activityId: String(item.id), repositories: [], repositoryUrl: "", saved: null, snapshot: null, configured: false, message: "Checking saved GitHub repositories..." };
    taskListState.finalOutcome = state;
    document.querySelector("#task-list-outcome-pushed").checked = false;
    renderFinalOutcomeState();
    try {
        const payload = await loadJson(`/api/activities/${encodeURIComponent(state.activityId)}/final-outcome`, { headers: buildTaskListHeaders({}), cache: "no-store" });
        if (taskListState.finalOutcome !== state || taskListState.selectedId !== state.activityId) return;
        state.repositories = Array.isArray(payload.repositories) ? payload.repositories : [];
        state.repositoryUrl = state.repositories.length === 1 ? state.repositories[0].url : "";
        state.saved = payload.saved || null;
        state.configured = Boolean(payload.configured);
        state.message = !state.configured ? "GitHub packaging needs the school's GitHub access configuration."
            : !state.repositories.length ? "No GitHub repository is saved on this assessment."
                : state.repositories.length > 1 ? "Select your final outcome repository." : "";
    } catch (error) {
        state.message = error?.message || "Could not load your saved repository.";
    }
    if (taskListState.finalOutcome === state) {
        renderFinalOutcomeState();
        void loadGithubZipSize(state.activityId, state.repositoryUrl);
    }
}

async function handleFinalOutcomeAction(action) {
    const state = taskListState.finalOutcome;
    const selected = taskListState.allItems.find((item) => String(item.id) === taskListState.selectedId);
    if (!state || !isSeniorDigitalMediaTask(selected) || state.activityId !== taskListState.selectedId || taskListState.finalOutcomeBusy) return;
    if (!document.querySelector("#task-list-outcome-pushed").checked || !state.repositoryUrl) return;
    const active = () => taskListState.finalOutcome === state && taskListState.selectedId === state.activityId;
    const endpoint = `/api/activities/${encodeURIComponent(state.activityId)}/final-outcome`;
    const post = (body) => loadJson(endpoint, { method: "POST", headers: buildTaskListHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(body) });
    let downloadStarted = false;
    taskListState.finalOutcomeBusy = true;
    state.message = "Connecting to Google Drive...";
    renderFinalOutcomeState();
    try {
        const token = await requestHubDriveAccessToken({ forceConsent: false });
        if (!active()) return;
        if (token?.error || !token?.access_token) throw new Error("Google Drive permission is required. Allow access and try again.");
        if (action === "download") {
            state.snapshot = null;
            state.retryDriveSave = false;
            state.message = "Packaging the latest pushed commit...";
            renderFinalOutcomeState();
            const payload = await post({ action: "prepare", repositoryUrl: state.repositoryUrl });
            if (!active()) return;
            state.snapshot = payload.snapshot;
            const response = await fetch(endpoint, { method: "POST", headers: buildTaskListHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ action: "download", snapshotId: state.snapshot.snapshotId }) });
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || "Could not download the ZIP.");
            }
            const blob = await response.blob();
            if (!active()) return;
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = state.snapshot.fileName;
            document.body.append(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 60000);
            downloadStarted = true;
        }
        if (!state.snapshot || state.snapshot.expiresAt <= Date.now()) throw new Error("The prepared ZIP has expired. Download the latest ZIP again.");
        state.message = downloadStarted ? "ZIP download started. Saving the same ZIP to Google Drive..." : "Saving the prepared ZIP to Google Drive...";
        renderFinalOutcomeState();
        const payload = await post({ action: "save", snapshotId: state.snapshot.snapshotId, driveAccessToken: token.access_token });
        if (!active()) return;
        state.saved = payload.saved;
        state.retryDriveSave = false;
        state.message = `${downloadStarted ? "ZIP download started. " : ""}${payload.reused
            ? "This commit's ZIP is already in SeniorDTECH / Process Assessment. No duplicate was created."
            : "ZIP saved to SeniorDTECH / Process Assessment. Earlier versions are unchanged."}`;
        void loadSubmissionStage(selected);
    } catch (error) {
        if (downloadStarted) state.retryDriveSave = true;
        state.message = `${downloadStarted ? "ZIP download started, but Google Drive save failed: " : ""}${error?.message || "Could not package your final outcome."}`;
    } finally {
        taskListState.finalOutcomeBusy = false;
        renderFinalOutcomeState();
    }
}

function renderTrelloReportState() {
    const state = taskListState.trelloReport;
    const select = document.querySelector("#task-list-trello-report-board");
    if (!state || !select) return;
    select.replaceChildren();
    if (state.boards.length !== 1) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = state.boards.length ? "Select board" : "No saved Trello board";
        select.append(option);
    }
    state.boards.forEach((board) => {
        const option = document.createElement("option");
        option.value = board.id;
        option.textContent = board.name;
        select.append(option);
    });
    select.value = state.boardId;
    select.disabled = taskListState.trelloReportBusy || !state.boards.length;
    document.querySelector("#task-list-trello-report-connect").hidden = state.connected;
    document.querySelector("#task-list-trello-report-generate").disabled = taskListState.trelloReportBusy || !state.connected || !state.boardId;
    const retry = document.querySelector("#task-list-trello-report-retry");
    retry.hidden = !state.retryDriveSave;
    retry.disabled = taskListState.trelloReportBusy || !state.snapshot || state.snapshot.expiresAt <= Date.now();
    const link = document.querySelector("#task-list-trello-report-open");
    const safeUrl = /^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]+\/view$/.test(String(state.saved?.fileUrl || "")) ? state.saved.fileUrl : "";
    link.hidden = !safeUrl;
    if (safeUrl) link.href = safeUrl;
    const metadata = state.saved?.trelloReport;
    const exportedAt = new Date(metadata?.generatedAt || "");
    document.querySelector("#task-list-trello-report-version").textContent = metadata && safeUrl
        ? `Saved in SeniorDTECH / Process Assessment: ${metadata.boardName}${Number.isFinite(exportedAt.getTime()) ? ` / ${exportedAt.toLocaleString("en-NZ", { timeZone: "Pacific/Auckland" })}` : ""}` : "";
    document.querySelector("#task-list-trello-report-status").textContent = state.message || "";
}

async function loadTrelloReport(item) {
    if (!isSeniorDigitalMediaTask(item)) return;
    const state = { activityId: String(item.id), boards: [], boardId: "", connected: true, saved: null, snapshot: null, retryDriveSave: false, message: "Checking saved Trello boards..." };
    taskListState.trelloReport = state;
    renderTrelloReportState();
    try {
        const payload = await loadJson(`/api/activities/${encodeURIComponent(state.activityId)}/trello-report`, { headers: buildTaskListHeaders({}), cache: "no-store" });
        if (taskListState.trelloReport !== state || taskListState.selectedId !== state.activityId) return;
        state.boards = Array.isArray(payload.boards) ? payload.boards : [];
        state.connected = Boolean(payload.connected);
        state.boardId = state.boards.length === 1 ? state.boards[0].id : "";
        state.saved = payload.saved || null;
        state.message = !state.connected ? "Connect your Trello account to create the report."
            : !state.boards.length ? "No Trello board link is saved on this assessment."
                : state.boards.length > 1 ? "Select the board for your report." : "";
    } catch (error) {
        state.message = error?.message || "Could not load Trello boards.";
    }
    if (taskListState.trelloReport === state) renderTrelloReportState();
}

async function handleTrelloReportAction(action) {
    const state = taskListState.trelloReport;
    const selected = taskListState.allItems.find((item) => String(item.id) === taskListState.selectedId);
    if (!state || !isSeniorDigitalMediaTask(selected) || state.activityId !== taskListState.selectedId || taskListState.trelloReportBusy || !state.boardId) return;
    const active = () => taskListState.trelloReport === state && taskListState.selectedId === state.activityId;
    const endpoint = `/api/activities/${encodeURIComponent(state.activityId)}/trello-report`;
    const post = (body) => loadJson(endpoint, { method: "POST", headers: buildTaskListHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(body) });
    let downloadStarted = false;
    taskListState.trelloReportBusy = true;
    state.message = "Connecting to Google Drive...";
    renderTrelloReportState();
    try {
        const token = await requestHubDriveAccessToken({ forceConsent: false });
        if (!active()) return;
        if (token?.error || !token?.access_token) throw new Error("Google Drive permission is required. Allow access and try again.");
        if (action === "generate") {
            state.snapshot = null;
            state.retryDriveSave = false;
            state.message = "Reading live Trello cards and creating the PDF...";
            renderTrelloReportState();
            const payload = await post({ action: "prepare", boardId: state.boardId });
            if (!active()) return;
            state.snapshot = payload.snapshot;
            const response = await fetch(endpoint, { method: "POST", headers: buildTaskListHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ action: "download", snapshotId: state.snapshot.snapshotId }) });
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || "Could not download the report.");
            }
            const blob = await response.blob();
            if (!active()) return;
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = state.snapshot.fileName;
            document.body.append(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 60000);
            downloadStarted = true;
        }
        if (!state.snapshot || state.snapshot.expiresAt <= Date.now()) throw new Error("The prepared PDF has expired. Generate a new report.");
        state.message = "Saving the Trello PDF to SeniorDTECH / Process Assessment...";
        renderTrelloReportState();
        const payload = await post({ action: "save", snapshotId: state.snapshot.snapshotId, driveAccessToken: token.access_token });
        if (!active()) return;
        state.saved = payload.saved;
        state.retryDriveSave = false;
        state.message = `${downloadStarted ? "Report download started. " : ""}${payload.reused ? "This report is already saved." : "Report saved to SeniorDTECH / Process Assessment. Earlier reports are unchanged."}`;
        void loadSubmissionStage(selected);
    } catch (error) {
        if (downloadStarted) state.retryDriveSave = true;
        state.message = `${downloadStarted ? "PDF download started, but Google Drive save failed: " : ""}${error?.message || "Could not create your Trello report."}`;
    } finally {
        taskListState.trelloReportBusy = false;
        renderTrelloReportState();
    }
}

function renderSubmissionStage() {
    const state = taskListState.submissionStage;
    const list = document.querySelector("#task-list-submission-files");
    if (!state || !list) return;
    list.replaceChildren();
    const labels = { ready: "Ready", unchecked: "Not checked", missing: "Missing", "needs-update": "Needs update" };
    state.components.forEach((component) => {
        const row = document.createElement("li");
        const label = document.createElement("span");
        label.textContent = component.label;
        label.title = component.entryName || "";
        const status = document.createElement("span");
        status.className = `task-list-submission-file-status${component.status === "ready" ? " is-ready" : component.status === "needs-update" ? " needs-update" : ""}`;
        status.textContent = labels[component.status] || "Not checked";
        row.append(label, status);
        if (component.message && component.message !== "Ready") {
            const detail = document.createElement("span");
            detail.className = "task-list-submission-file-status";
            detail.textContent = component.message;
            row.append(detail);
        }
        list.append(row);
    });
    document.querySelector("#task-list-submission-check").disabled = taskListState.submissionBusy;
    document.querySelector("#task-list-submission-build").disabled = taskListState.submissionBusy || !state.ready;
    const retry = document.querySelector("#task-list-submission-retry");
    retry.hidden = !state.retryDriveSave;
    retry.disabled = taskListState.submissionBusy || !state.snapshot || state.snapshot.expiresAt <= Date.now();
    const link = document.querySelector("#task-list-submission-open");
    const url = /^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]+\/view$/.test(String(state.saved?.fileUrl || "")) ? state.saved.fileUrl : "";
    link.hidden = !url;
    if (url) link.href = url;
    const date = new Date(state.saved?.submissionPackage?.builtAt || "");
    document.querySelector("#task-list-submission-saved").textContent = url && Number.isFinite(date.getTime())
        ? `Saved package: ${date.toLocaleString("en-NZ", { timeZone: "Pacific/Auckland" })}` : "";
    document.querySelector("#task-list-submission-status").textContent = state.message || "";
}

async function loadSubmissionStage(item) {
    if (!isSeniorDigitalMediaTask(item)) return;
    const state = { activityId: String(item.id), components: [
        { key: "client", label: "Client presentation PDF", status: "unchecked" },
        { key: "documentation", label: "Documentation PDF", status: "unchecked" },
        { key: "outcome", label: "GitHub outcome ZIP", status: "unchecked" },
        { key: "trello", label: "Trello report PDF", status: "unchecked" }
    ], ready: false, manifestHash: "", snapshot: null, saved: null, retryDriveSave: false, message: "Checking saved submission files..." };
    taskListState.submissionStage = state;
    renderSubmissionStage();
    try {
        const payload = await loadJson(`/api/activities/${encodeURIComponent(state.activityId)}/submission-package`, { headers: buildTaskListHeaders({}), cache: "no-store" });
        if (taskListState.submissionStage !== state || taskListState.selectedId !== state.activityId) return;
        if (Array.isArray(payload.components)) state.components = payload.components;
        state.saved = payload.saved || null;
        state.message = "Files not yet verified.";
    } catch (error) {
        state.message = error?.message || "Could not load the submission files.";
    }
    if (taskListState.submissionStage === state) renderSubmissionStage();
}

async function handleSubmissionStageAction(action) {
    const state = taskListState.submissionStage;
    const item = taskListState.allItems.find((candidate) => String(candidate.id) === taskListState.selectedId);
    if (!state || !isSeniorDigitalMediaTask(item) || state.activityId !== taskListState.selectedId || taskListState.submissionBusy) return;
    if (action === "build" && !state.ready) return;
    const active = () => taskListState.submissionStage === state && taskListState.selectedId === state.activityId;
    taskListState.submissionBusy = true;
    state.message = "Connecting to Google Drive...";
    renderSubmissionStage();
    try {
        const token = await requestHubDriveAccessToken({ forceConsent: false });
        if (!active()) return;
        if (token?.error || !token?.access_token) throw new Error("Google Drive permission is required. Allow access and try again.");
        const post = async (body) => {
            const response = await fetch(`/api/activities/${encodeURIComponent(state.activityId)}/submission-package`, {
                method: "POST", headers: buildTaskListHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ ...body, driveAccessToken: token.access_token })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw Object.assign(new Error(payload.error || "Could not prepare the submission ZIP."), { status: response.status, payload });
            return payload;
        };
        if (action === "check") {
            state.ready = false;
            state.snapshot = null;
            state.retryDriveSave = false;
            state.message = "Verifying the saved files and current sources...";
            renderSubmissionStage();
            const checked = await post({ action: "check" });
            if (!active()) return;
            state.components = Array.isArray(checked.components) ? checked.components : state.components;
            state.manifestHash = String(checked.manifestHash || "");
            state.ready = Boolean(checked.ready && /^[a-f0-9]{64}$/.test(state.manifestHash));
            state.message = state.ready ? "All four files are ready to package." : "Some files are missing or need updating.";
            return;
        }
        if (action === "build") {
            state.snapshot = null;
            state.retryDriveSave = false;
            state.message = "Building the four-file submission ZIP...";
            renderSubmissionStage();
            const prepared = await post({ action: "prepare", manifestHash: state.manifestHash });
            if (!active()) return;
            state.snapshot = prepared.snapshot;
        }
        if (!state.snapshot || state.snapshot.expiresAt <= Date.now()) throw Object.assign(new Error("The prepared package has expired. Check files and build it again."), { status: 410 });
        state.message = "Saving the submission ZIP to SeniorDTECH / Process Assessment...";
        renderSubmissionStage();
        const saved = await post({ action: "save", snapshotId: state.snapshot.snapshotId });
        if (!active()) return;
        state.saved = saved.saved;
        state.retryDriveSave = false;
        state.message = "Submission ZIP saved in SeniorDTECH / Process Assessment. No assessment was submitted.";
    } catch (error) {
        if (error.status === 409 || error.status === 410) {
            state.ready = false;
            state.manifestHash = "";
            state.snapshot = null;
            state.retryDriveSave = false;
            if (Array.isArray(error.payload?.components)) state.components = error.payload.components;
        } else if (state.snapshot) state.retryDriveSave = true;
        state.message = error?.message || "Could not build and save the submission ZIP.";
    } finally {
        taskListState.submissionBusy = false;
        renderSubmissionStage();
    }
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
    const rows = Object.entries(stateMap || {}).flatMap(([standard, value]) =>
        (Array.isArray(value) ? value : []).filter((row) =>
            !(["91907", "91897", "91903", "91893"].includes(standard)
                && /^address(?:ing)? relevant implications?\.?$/i.test(stripStepLevel(row?.text || "").trim().replace(/\s+/g, " ")))
        )
    );
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
    const isMiddleDtech = taskListState.course === "MiddleDTECH";
    installTaskListSectionAnchorHandler();
    installDigiMedEfficientToolsHandler();
    installDigiMedToolsTechniquesHandler();

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
        const allRows = Array.isArray(rows) ? rows : [];
        const safeRows = taskListState.course === "MiddleDTECH"
            ? getMiddleDtechChecklistRows(String(standard), allRows)
            : allRows;

        if (String(standard) === "91893" || String(standard) === "91903") {
            const levels = ["Achieved", "Merit", "Excellence"].filter((level) =>
                taskListState.course !== "MiddleDTECH" || safeRows.some((step) => getStepLevel(step?.text) === level)
            );
            const decompositionCoverage = readDecompositionCategoryCoverage(taskListState.selectedId, getTaskListEmail());
            const efficientToolsState = readDigiMedEfficientToolsState(taskListState.selectedId, getTaskListEmail());
            const githubRepoAnalysis = readGithubRepoAnalysis(taskListState.selectedId, getTaskListEmail());
            const toolsTechniquesState = readDigiMedToolsTechniquesState(taskListState.selectedId, getTaskListEmail());
            const toolsTechniquesSubtasksList = String(standard) === "91903" ? DIGIMED_L3_TOOLS_TECHNIQUES_SUBTASKS : DIGIMED_TOOLS_TECHNIQUES_SUBTASKS;
            return `
                ${levels.map((level) => `
                    <section class="task-list-level-group">
                        ${isMiddleDtech ? "" : `<h4>${level}</h4>`}
                        ${level === "Achieved" ? `<p class="task-list-achieved-subheading">Section 1: Digital Media</p>` : ""}
                        ${level === "Merit" ? `<p class="task-list-merit-trello-note">${escapeTaskListHtml(TASK_LIST_MERIT_TRELLO_NOTE)}</p>` : ""}
                        ${level === "Excellence" && !isMiddleDtech ? `<p class="task-list-merit-trello-note">${escapeTaskListHtml(TASK_LIST_EXCELLENCE_TRELLO_NOTE)}</p>` : ""}
                        <div class="task-list-step-list">
                            ${safeRows.map((step, index) => {
                                if (getStepLevel(step?.text) !== level) return "";
                                const stepText = stripStepLevel(step?.text || "");
                                const isLinkedRelevantImplicationsRow = /^(?:explain(?:ing)?|address(?:ing)?) relevant implications\.?$/i.test(stepText);
                                // Address/Addressing has no completion criteria of its own — never tickable, purple-linked only.
                                const isNonTickableRelevantImplicationsRow91893 = /^(?:explain(?:ing)?|address(?:ing)?) relevant implications\.?$/i.test(stepText);
                                const isApplyingRelevantConventionsRow = level !== "Achieved"
                                    && /^(?:applying|using) relevant conventions(?: to improve the quality of the outcome)?\.?$/i.test(stepText);
                                const href = getTaskTopicHrefForStep(standard, level, stepText);
                                const isInformationalRow = isInformationalCriteriaRow(standard, level, stepText);
                                const managementKind = getStepAutoManagementKind(standard, step?.text || "");
                                const needsEvidence = !isInformationalRow && managementKind === "manual";
                                const is91893ToolsAndTechniquesRow = /using appropriate tools and techniques for the purpose and end users|applying appropriate tools and techniques to meet the purpose and end-user requirements/i.test(stepText);
                                const isUseOfToolsTechniquesRequirement = isUseOfToolsTechniquesRequirementStep(standard, step?.text || "");
                                const is91893ConventionsRow = /using relevant conventions for the media type|applying relevant conventions to improve the quality of the outcome/i.test(stepText);
                                const isWebConventionsRequirement = isWebConventionsRequirementStep(standard, step?.text || "");
                                const is91903UXPrinciplesRow = /applying user experience principles relevant to the purpose of the outcome|applying user experience principles to improve the quality of the digital media outcome/i.test(stepText);
                                const isUXPrinciplesRequirement = isUXPrinciplesRequirementStep(standard, step?.text || "");
                                const isNonTickableUXPrinciplesMeritRow = String(standard) === "91903"
                                    && String(level) === "Merit"
                                    && /applying user experience principles to improve the quality of the digital media outcome/i.test(stepText);
                                const is91893EfficientToolsRow = /using efficient tools and techniques in the outcome.?s production/i.test(stepText);
                                const is91893IntegrityTestingRow = /applying appropriate data integrity and testing procedures/i.test(stepText);
                                const isWebIntegrityRequirement = isWebIntegrityRequirementStep(standard, step?.text || "");
                                const isWebIntegrityComplete = isWebIntegrityRequirement && hasCompletedWebIntegritySlide(taskListState.fullEvidenceState);
                                const isNonTickableIntegrityTestingRow = is91893IntegrityTestingRow && !isWebIntegrityRequirement
                                    && (String(standard) === "91893" || String(standard) === "91903");
                                const isLinkedTestingImprovementRow = (String(standard) === "91893" || String(standard) === "91903")
                                    && /using information from testing procedures to improve the quality of the (?:digital media )?outcome/i.test(stepText);
                                const isDigitalMediaIterativeImprovementRow = (String(standard) === "91893" || String(standard) === "91903")
                                    && String(level) === "Excellence"
                                    && /iterative improvement throughout the design, development and testing process/i.test(stepText);
                                const digitalMediaType = getAllocatedDigitalMediaType(standard).toLowerCase();
                                const isVideoMedia = digitalMediaType === "video";
                                const isImageMedia = digitalMediaType === "image" || digitalMediaType === "graphics" || digitalMediaType === "vector";
                                const toolsAndTechniquesLabel = isVideoMedia ? "Tools & Techniques (VIDEO)" : isImageMedia ? "Tools & Techniques (IMAGE)" : "Tools & Techniques (WEB)";
                                const conventionsSubtask = is91893ConventionsRow ? getDigiMedConventionsSubtask(taskListState.fullEvidenceState, digitalMediaType) : null;
                                const isRowChecked = isWebIntegrityRequirement
                                    ? isWebIntegrityComplete
                                    : isWebConventionsRequirement
                                        ? getDigiMedConventionsAcknowledgementCount(taskListState.selectedId, getTaskListEmail(), taskListState.fullEvidenceState) >= 3
                                    : managementKind === "auto"
                                        ? Boolean(step?.done)
                                        : Boolean(taskListState.sessionTicks[getSessionTickKey(standard, index)]);
                                const uxPrinciplesSubtask = is91903UXPrinciplesRow ? getDigiMedUXPrinciplesSubtask(taskListState.fullEvidenceState, digitalMediaType) : null;
                                const integrityTestingIsVideo = is91893IntegrityTestingRow && isVideoMedia;
                                const integrityTestingIsImage = is91893IntegrityTestingRow && isImageMedia;
                                const efficientToolsSubtasks = isVideoMedia
                                    ? DIGIMED_VIDEO_EFFICIENT_TOOLS_SUBTASKS
                                    : isImageMedia
                                        ? DIGIMED_IMAGE_EFFICIENT_TOOLS_SUBTASKS
                                        : DIGIMED_EFFICIENT_TOOLS_SUBTASKS;
                                const subtasksTitle = isVideoMedia ? "SUBTASKS (VIDEO)" : isImageMedia ? "SUBTASKS (IMAGE)" : "SUBTASKS (WEB)";
                                const integrityTestingTitle = integrityTestingIsVideo
                                    ? "Integrity & Validation (VIDEO)"
                                    : integrityTestingIsImage
                                        ? "Integrity & Validation (IMAGE)"
                                        : "Integrity & Validation (WEB)";
                                const integrityTestingHref = integrityTestingIsVideo
                                    ? buildCustomActivityLink(taskListState.selectedId, "Integrity & Validation (VIDEO)", "Integrity & Validation (VIDEO)", "video-integrity-testing")
                                    : integrityTestingIsImage
                                        ? buildCustomActivityLink(taskListState.selectedId, "Integrity & Validation (IMAGE)", "Integrity & Validation (IMAGE)", "image-integrity-testing")
                                        : buildCustomActivityLink(taskListState.selectedId, "Integrity & Validation (WEB)", "Integrity & Validation (WEB)", "code-validation");
                                const testingFunctionsSubtasks = isLinkedTestingImprovementRow
                                    ? getTestingFunctionsSubtasks(taskListState.fullEvidenceState)
                                    : [];
                                const rowText = isInformationalRow
                                    ? `<span class="task-list-step-text">${escapeTaskListHtml(stepText)}</span>`
                                    : (href
                                        ? `<a class="task-list-step-link" href="${escapeTaskListHtml(href)}">${escapeTaskListHtml(stepText)}</a>`
                                        : `<span class="task-list-step-text">${escapeTaskListHtml(stepText)}</span>`);
                                return `
                                <div class="task-list-step-row ${isInformationalRow ? "is-informational" : ""} ${isLinkedRelevantImplicationsRow || isLinkedTestingImprovementRow || isApplyingRelevantConventionsRow || isNonTickableUXPrinciplesMeritRow ? "is-linked-relevant-implications" : ""} ${is91893EfficientToolsRow ? "is-linked-efficient-tools" : ""} ${needsEvidence ? "is-needs-evidence" : ""}">
                                    <label class="task-list-step-check-wrap">
                                        ${isInformationalRow || isNonTickableRelevantImplicationsRow91893 || isApplyingRelevantConventionsRow || isNonTickableIntegrityTestingRow || isNonTickableUXPrinciplesMeritRow ? "" : `<input type="checkbox" class="${isUseOfToolsTechniquesRequirement || isUXPrinciplesRequirement || isWebConventionsRequirement || isWebIntegrityRequirement ? "is-auto-complete" : ""}" ${isRowChecked ? "checked" : ""} ${isUseOfToolsTechniquesRequirement ? "disabled title=\"Requires at least three checked subtasks and Use of Tools & Techniques template\"" : isUXPrinciplesRequirement ? "disabled title=\"Requires at least three UX principles to be identified and applied\"" : isWebConventionsRequirement ? "disabled title=\"Requires at least three web conventions to be applied\"" : isWebIntegrityRequirement ? "disabled title=\"Automatically checked when the Integrity & Validation template has been used\"" : ""} data-step-check="${escapeTaskListHtml(standard)}:${index}">`}
                                        ${rowText}
                                    </label>
                                    ${is91893ToolsAndTechniquesRow ? `
                                        <div class="task-list-decomposition-subtasks">
                                            <p class="task-list-system-title">SUBTASKS</p>
                                            <p class="task-list-achieved-note">Tools identified for the outcome.</p>
                                            <div class="task-list-decomposition-category-list">
                                                <a class="task-list-decomposition-category ${decompositionCoverage.hasData && decompositionCoverage.counts["Tools & Techniques"] > 0 ? "is-covered" : ""}" href="${escapeTaskListHtml(buildCustomActivityLink(taskListState.selectedId, "What Tools and Techniques will be used?", toolsAndTechniquesLabel, "tools-and-techniques"))}">
                                                    <span class="task-list-decomposition-category-label">${escapeTaskListHtml(toolsAndTechniquesLabel)}</span>
                                                    <span class="task-list-decomposition-category-count">${decompositionCoverage.hasData ? Number(decompositionCoverage.counts["Tools & Techniques"] || 0) : "-"}</span>
                                                </a>
                                            </div>
                                            <div class="task-list-decomposition-subtask-list">
                                                ${toolsTechniquesSubtasksList.map((subtask) => `
                                                    <label class="task-list-decomposition-subtask ${toolsTechniquesState[subtask] ? "is-complete" : ""}">
                                                        <input type="checkbox" data-digimed-tools-technique="${escapeTaskListHtml(subtask)}" ${toolsTechniquesState[subtask] ? "checked" : ""}>
                                                        <span>${escapeTaskListHtml(subtask)}</span>
                                                    </label>
                                                `).join("")}
                                            </div>
                                            ${String(standard) === "91893" || String(standard) === "91903" ? `<p class="task-list-achieved-note">You must include three of the items listed. (${toolsTechniquesSubtasksList.filter((subtask) => toolsTechniquesState[subtask]).length}/${toolsTechniquesSubtasksList.length} detected.)</p><p class="task-list-achieved-note">Auto-detected from your GitHub repo where possible \u2014 click Sync from GitHub above to check these boxes.</p>` : ""}
                                        </div>
                                    ` : ""}
                                    ${is91893EfficientToolsRow ? `
                                        <div class="task-list-decomposition-subtasks">
                                            <p class="task-list-system-title">${subtasksTitle}</p>
                                            <p class="task-list-achieved-note">Examples of efficient tools and techniques.</p>
                                            <p class="task-list-achieved-note">Complete any 3 or more categories. (${efficientToolsSubtasks.filter((subtask) => efficientToolsState[subtask]).length}/${efficientToolsSubtasks.length})</p>
                                            <div class="task-list-decomposition-subtask-list">
                                                ${efficientToolsSubtasks.map((subtask) => `
                                                    <label class="task-list-decomposition-subtask ${efficientToolsState[subtask] ? "is-complete" : ""}">
                                                        <input type="checkbox" data-digimed-efficient-tool="${escapeTaskListHtml(subtask)}" ${efficientToolsState[subtask] ? "checked" : ""}>
                                                        <span>${escapeTaskListHtml(subtask)}</span>
                                                    </label>
                                                `).join("")}
                                            </div>
                                            ${isVideoMedia
                                                ? `<p class="task-list-achieved-note">Tick the media-production practices you have used and can demonstrate in your project evidence.</p>${buildVideoAutoProgressNote(taskListState.selectedId, getTaskListEmail())}`
                                                : isImageMedia
                                                    ? `<p class="task-list-achieved-note">Tick the image-production practices you have used and can demonstrate in your project evidence.</p>${buildImageAutoProgressNote(taskListState.selectedId, getTaskListEmail())}`
                                                    : (githubRepoAnalysis?.syncedAt
                                                ? `<p class="task-list-achieved-note">GitHub last synced: ${escapeTaskListHtml(formatTaskListTimestamp(githubRepoAnalysis.syncedAt))} (${Number(githubRepoAnalysis.commitCount || 0)} commits across ${Number(githubRepoAnalysis.commitDayCount || 0)} day${Number(githubRepoAnalysis.commitDayCount || 0) === 1 ? "" : "s"})</p>`
                                                : `<p class="task-list-achieved-note">Click Sync from GitHub above to auto-check these boxes from your public repo.</p>`) }
                                        </div>
                                    ` : ""}
                                    ${is91893IntegrityTestingRow ? `
                                        <div class="task-list-decomposition-subtasks">
                                            <p class="task-list-system-title">SUBTASKS</p>
                                            <p class="task-list-achieved-note">${isWebIntegrityRequirement ? "Use the Integrity &amp; Validation template." : "Files identified for validation."}</p>
                                            <div class="task-list-decomposition-category-list">
                                                <a class="task-list-decomposition-category ${isWebIntegrityRequirement ? (isWebIntegrityComplete ? "is-covered" : "") : "is-covered"}" href="${escapeTaskListHtml(integrityTestingHref)}">
                                                    <span class="task-list-decomposition-category-label">${escapeTaskListHtml(integrityTestingTitle)}</span>
                                                </a>
                                            </div>
                                        </div>
                                    ` : ""}
                                    ${isDigitalMediaIterativeImprovementRow ? `
                                        <div class="task-list-decomposition-subtasks task-list-iterative-improvement-subtasks">
                                            <p class="task-list-system-title">ITERATIVE IMPROVEMENT EVIDENCE</p>
                                            <p class="task-list-achieved-note">Use these evidence sources to show how decisions, testing and trialling led to improvements.</p>
                                            <div class="task-list-iterative-improvement-table" role="table" aria-label="Iterative improvement evidence sources">
                                                <div class="task-list-iterative-improvement-row is-header" role="row">
                                                    <strong role="columnheader">Evidence source</strong>
                                                    <strong role="columnheader">What it can demonstrate</strong>
                                                </div>
                                                ${ITERATIVE_IMPROVEMENT_EVIDENCE_SUBTASKS.map((subtask) => `
                                                    <div class="task-list-iterative-improvement-row" role="row">
                                                        <strong role="cell">${escapeTaskListHtml(subtask.evidenceSource)}</strong>
                                                        <span role="cell">${escapeTaskListHtml(subtask.demonstrates)}</span>
                                                    </div>
                                                `).join("")}
                                            </div>
                                        </div>
                                    ` : ""}
                                    ${isLinkedTestingImprovementRow ? `
                                        <div class="task-list-decomposition-subtasks">
                                            <p class="task-list-system-title">SUBTASKS</p>
                                            <p class="task-list-achieved-note">Testing evidence: client feedback form and functions testing results.</p>
                                            <div class="task-list-decomposition-category-list">
                                                ${testingFunctionsSubtasks.map((subtask) => `
                                                    <a class="task-list-decomposition-category ${subtask.done ? "is-covered" : ""}" href="${escapeTaskListHtml(subtask.href)}">
                                                        <span class="task-list-decomposition-category-label">${escapeTaskListHtml(subtask.label)}</span>
                                                        <span class="task-list-decomposition-category-count">${escapeTaskListHtml(subtask.countText || (subtask.done ? "1" : "0"))}</span>
                                                    </a>
                                                `).join("")}
                                            </div>
                                        </div>
                                    ` : ""}
                                    ${conventionsSubtask ? `
                                        <div class="task-list-decomposition-subtasks">
                                            <p class="task-list-system-title">SUBTASKS</p>
                                            <p class="task-list-achieved-note">Convention areas applied on your ${escapeTaskListHtml(conventionsSubtask.label)} page.</p>
                                            <p class="task-list-achieved-note">You need to apply at least 3 conventions (${conventionsSubtask.count}/12).</p>
                                            <div class="task-list-decomposition-category-list">
                                                <a class="task-list-decomposition-category is-covered" href="${escapeTaskListHtml(conventionsSubtask.href)}">
                                                    <span class="task-list-decomposition-category-label">${escapeTaskListHtml(conventionsSubtask.label).toUpperCase()}</span>
                                                    <span class="task-list-decomposition-category-count">${conventionsSubtask.count}</span>
                                                </a>
                                            </div>
                                        </div>
                                    ` : ""}
                                    ${uxPrinciplesSubtask ? `
                                        <div class="task-list-decomposition-subtasks">
                                            <p class="task-list-system-title">SUBTASKS</p>
                                            <p class="task-list-achieved-note">Identify and apply at least 3 UX principles (${uxPrinciplesSubtask.count}/10).</p>
                                            <div class="task-list-decomposition-category-list">
                                                <a class="task-list-decomposition-category is-covered" href="${escapeTaskListHtml(uxPrinciplesSubtask.href)}">
                                                    <span class="task-list-decomposition-category-label">${escapeTaskListHtml(uxPrinciplesSubtask.label).toUpperCase()}</span>
                                                    <span class="task-list-decomposition-category-count">${uxPrinciplesSubtask.count}</span>
                                                </a>
                                            </div>
                                        </div>
                                    ` : ""}
                                </div>
                            `;
                            }).join("")}
                        </div>
                    </section>
                `).join("")}
            `;
        }

        if (String(standard) !== "91897" && String(standard) !== "91907" && String(standard) !== "91893" && String(standard) !== "91903") {
            return `
                <div class="task-list-step-list">
                    ${safeRows.map((step, index) => {
                        const stepText = String(step?.text || "");
                        const managementKind = getStepAutoManagementKind(standard, stepText);
                        const needsEvidence = managementKind === "manual";
                        const isRowChecked = managementKind === "auto"
                            ? Boolean(step?.done)
                            : Boolean(taskListState.sessionTicks[getSessionTickKey(standard, index)]);
                        return `
                        <div class="task-list-step-row ${needsEvidence ? "is-needs-evidence" : ""}">
                            <label class="task-list-step-check-wrap">
                                <input type="checkbox" ${isRowChecked ? "checked" : ""} data-step-check="${escapeTaskListHtml(standard)}:${index}">
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

        const levels = ["Achieved", "Merit", "Excellence"].filter((level) =>
            taskListState.course !== "MiddleDTECH" || safeRows.some((step) => getStepLevel(step?.text) === level)
        );
        return levels.map((level) => {
            const levelRows = safeRows
                .map((step, index) => ({ ...step, _index: index }))
                .filter((step) => getStepLevel(step?.text) === level);
            const renderedAchievedSections = new Set();
            const relevantCategoryRows = levelRows.filter((step) => level === "Achieved" && isRelevantImplicationsCategoryStep(step?.text));

            return `
                <section class="task-list-level-group">
                    ${isMiddleDtech ? "" : `<h4>${escapeTaskListHtml(level)}</h4>`}
                    ${level === "Merit" ? `<p class="task-list-merit-trello-note">${escapeTaskListHtml(TASK_LIST_MERIT_TRELLO_NOTE)}</p>` : ""}
                    ${level === "Excellence" && !isMiddleDtech ? `<p class="task-list-merit-trello-note">${escapeTaskListHtml(TASK_LIST_EXCELLENCE_TRELLO_NOTE)}</p>` : ""}
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
                                    ? `<p id="${escapeTaskListHtml(buildTaskListStandardSectionAnchor(standard, achievedSectionMeta.id).slice(1))}" class="task-list-achieved-subheading">${escapeTaskListHtml(achievedSectionMeta.title)}</p>`
                                        : ""}
                                    ${shouldRenderAchievedSectionHeading && achievedSectionMeta?.id === "relevant-implications"
                                        ? `<p class="task-list-achieved-note">Complete any 3 or more categories to mark Section 4 complete. (${countCompletedRelevantImplicationsCategories(levelRows)}/${RELEVANT_IMPLICATIONS_CATEGORIES.length})</p>`
                                        : ""}
                                    ${renderRelevantImplicationsCategoryGrid(standard, relevantCategoryRows)}
                                `;
                            }
                            const isProjectManagementRow = (String(level) === "Achieved"
                                && stepText.toLowerCase().includes("project management"))
                                || (String(level) === "Merit"
                                    && stepText.toLowerCase().includes("project management")
                                    && stepText.toLowerCase().includes("version control"));
                            const isNonTickableProjectManagementMeritRow = (String(standard) === "91897" || String(standard) === "91907")
                                && String(level) === "Merit"
                                && /^effectively\s+(?:using|use)\s+project management.*version control/i.test(stepText);
                            const isDecompositionRow = String(level) === "Achieved"
                                && stepText.toLowerCase().includes("decompos");
                            const isTriallingComponentsRow = String(level) === "Achieved"
                                && /trial\s+(?:the\s+)?components|triall?ing\s+(?:the\s+)?components|trailing\s+components/.test(stepText.toLowerCase());
                            const isTestingFunctionsRow = String(level) === "Achieved"
                                && /testing\s+functions|test(?:ing)?\s+that\s+the\s+digital\s+technologies\s+outcome\s+functions/i.test(stepText);
                            const isLinkedTestingImprovementRow = (String(standard) === "91893" || String(standard) === "91903")
                                && /using information from testing procedures to improve the quality of the (?:digital media )?outcome/i.test(stepText);
                            const isDigiMedConventionsRow = String(level) === "Achieved"
                                && /using relevant conventions for the media type/i.test(stepText);
                            const isMultipleComponentsRow = String(level) === "Merit"
                                && /^(?:effectively\s+)?trial(?:l?ing)?\s+multiple\s+components\s+and\/or\s+techniques\b/i.test(stepText);
                            const isMeritDevFeedbackCollabRow = String(level) === "Merit"
                                && /development,\s*feedback\s+and\/or\s+collaborative\s+processes/i.test(stepText);
                            const isNonTickableProjectManagementProcessesMeritRow = String(standard) === "91907"
                                && isMeritDevFeedbackCollabRow
                                && /^effectively\s+use\s+project management techniques/i.test(stepText);
                            const isIterativeImprovementRow = (String(standard) === "91897" || String(standard) === "91907")
                                && String(level) === "Excellence"
                                && /iterative improvement throughout the design, development and testing process/i.test(stepText);
                            const isInformationalRow = isInformationalCriteriaRow(String(standard), level, stepText);
                            const isSystemComplete = isProjectManagementRow
                                && systemConnections.trelloConnected
                                && (systemConnections.githubConnected || systemConnections.oneDriveConnected || systemConnections.googleDriveConnected);
                            const relevantCategoryDoneCount = countCompletedRelevantImplicationsCategories(levelRows);
                            const isAddressRelevantImplicationsRow = isAddressRelevantImplicationsStep(stepText);
                            const isExplainRelevantImplicationsRow = level === "Achieved"
                                && /explain(?:ing)?\s+relevant\s+implications\.?$/i.test(stepText);
                            const isTickActionDisabled = isAddressRelevantImplicationsRow
                                || (isExplainRelevantImplicationsRow && relevantCategoryDoneCount < 3);
                            const managementKind = getStepAutoManagementKind(standard, step?.text || "");
                            const needsEvidence = !isInformationalRow && !isRelevantCategoryRow && managementKind === "manual";
                            const isRowChecked = managementKind === "auto"
                                ? (Boolean(step?.done) && !isAddressRelevantImplicationsRow)
                                : Boolean(taskListState.sessionTicks[getSessionTickKey(standard, step._index)]);
                            const decompositionSubtasks = isDecompositionRow ? getDecompositionSubtasks(taskListState.checklistState) : [];
                            const triallingComponentsCount = taskListState.identifiedComponentsCount;
                            const componentsSubtaskHref = buildCustomActivityLink(taskListState.selectedId, "Trial the components of the digital technologies outcome.", "Trialling Components", "trialling-components");
                            const projectManagementSubtasks = isProjectManagementRow ? getProjectManagementSubtasks(taskListState.fullEvidenceState) : [];
                            const testingFunctionsSubtasks = (isTestingFunctionsRow || isLinkedTestingImprovementRow)
                                ? getTestingFunctionsSubtasks(taskListState.fullEvidenceState)
                                : [];
                            const digiMedConventionsSubtask = isDigiMedConventionsRow ? getDigiMedConventionsSubtask(taskListState.fullEvidenceState) : null;
                            const devFeedbackCollabSubtasks = isMeritDevFeedbackCollabRow ? getProjectManagementProcessSubtasks() : [];

                            return `
                                ${shouldRenderAchievedSectionHeading && achievedSectionMeta
                                    ? `<p class="task-list-achieved-subheading">${escapeTaskListHtml(achievedSectionMeta.title)}</p>`
                                    : ""}
                                ${shouldRenderAchievedSectionHeading && achievedSectionMeta?.id === "relevant-implications"
                                    ? `<p class="task-list-achieved-note">Complete any 3 or more categories to mark Section 4 complete. (${relevantCategoryDoneCount}/${RELEVANT_IMPLICATIONS_CATEGORIES.length})</p>`
                                    : ""}
                                <div ${isTestingFunctionsRow ? `id="task-list-standard-${escapeTaskListHtml(standard)}-testing-functions"` : ""} class="task-list-step-row ${isSystemComplete ? "is-system-complete" : ""} ${isRelevantCategoryRow ? "is-relevant-implications-category" : ""} ${isInformationalRow ? "is-informational" : ""} ${isAddressRelevantImplicationsRow || isNonTickableProjectManagementMeritRow || isNonTickableProjectManagementProcessesMeritRow ? "is-linked-relevant-implications" : ""} ${needsEvidence ? "is-needs-evidence" : ""}">
                                    <label class="task-list-step-check-wrap">
                                        ${isInformationalRow || isAddressRelevantImplicationsRow || isNonTickableProjectManagementMeritRow || isNonTickableProjectManagementProcessesMeritRow ? "" : `<input type="checkbox" class="${isDecompositionRow ? "is-auto-complete" : ""}" ${isRowChecked ? "checked" : ""} ${isTickActionDisabled || isDecompositionRow ? "disabled" : ""} ${isDecompositionRow ? "title=\"Automatically checked when every Decomposition category has at least one Trello task\"" : ""} data-step-check="${escapeTaskListHtml(standard)}:${step._index}">`}
                                        ${isRelevantCategoryRow
                                            ? `<a class="task-list-step-link task-list-step-text-category" href="${escapeTaskListHtml(relevantCategoryHref)}">${escapeTaskListHtml(stepLabel)}</a>`
                                            : (isInformationalRow || isDecompositionRow
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
                                                    <label class="task-list-decomposition-subtask ${subtask.done ? "is-complete" : ""} ${subtask.label === "GitHub" ? "has-github-zip-size" : ""}">
                                                        <input type="checkbox" disabled ${subtask.done ? "checked" : ""}>
                                                        <a href="${escapeTaskListHtml(subtask.href)}">${getProjectManagementSystemLogo(subtask.label)}${escapeTaskListHtml(subtask.label)}${subtask.countText ? ` - ${escapeTaskListHtml(subtask.countText)}` : ""}</a>
                                                        ${subtask.label === "GitHub" ? `<span class="task-list-github-zip-size" data-github-zip-size role="status" title="${escapeTaskListHtml(taskListState.githubZipSize?.activityId === taskListState.selectedId ? taskListState.githubZipSize.title || "" : "")}">${escapeTaskListHtml(taskListState.githubZipSize?.activityId === taskListState.selectedId ? taskListState.githubZipSize.text : "ZIP: not checked")}</span>` : ""}
                                                    </label>
                                                `).join("")}
                                            </div>
                                        </div>
                                    ` : ""}
                                    ${isDecompositionRow ? `
                                        <div class="task-list-decomposition-subtasks">
                                            <p class="task-list-system-title">Decomposition Subtasks</p>
                                            <p class="task-list-achieved-note">Complete at least one task in each of the Decomposition Categories. Counts are pulled directly from your Trello board.</p>
                                            <div class="task-list-decomposition-category-list">
                                                ${decompositionSubtasks.map((subtask) => `
                                                    <a class="task-list-decomposition-category ${subtask.trelloCount > 0 ? "is-covered" : ""}" href="${escapeTaskListHtml(subtask.href)}">
                                                        <span class="task-list-decomposition-category-label">${escapeTaskListHtml(subtask.displayLabel || subtask.label)}</span>
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
                                                    <span class="task-list-decomposition-category-label">Trialling - COMPONENTS</span>
                                                    <span class="task-list-decomposition-category-count">${Number.isFinite(triallingComponentsCount) ? triallingComponentsCount : "-"}</span>
                                                </a>
                                            </div>
                                            ${Number.isFinite(triallingComponentsCount)
                                                ? ""
                                                : `<p class="task-list-achieved-note">Sync Google Drive above to see the component count.</p>`}
                                        </div>
                                    ` : ""}
                                    ${isMultipleComponentsRow ? `
                                        <div class="task-list-decomposition-subtasks">
                                            <p class="task-list-system-title">SUBTASKS</p>
                                            <p class="task-list-achieved-note">Components identified for trialling.</p>
                                            <p class="task-list-achieved-note">You need to trial at least 3 components and/or techniques.</p>
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
                                    ${isTestingFunctionsRow || isLinkedTestingImprovementRow ? `
                                        <div class="task-list-decomposition-subtasks">
                                            <p class="task-list-system-title">SUBTASKS</p>
                                            <p class="task-list-achieved-note">Testing evidence: client feedback form and functions testing results.</p>
                                            <div class="task-list-decomposition-category-list">
                                                ${testingFunctionsSubtasks.map((subtask) => `
                                                    <a class="task-list-decomposition-category ${subtask.done ? "is-covered" : ""}" href="${escapeTaskListHtml(subtask.href)}">
                                                        <span class="task-list-decomposition-category-label">${escapeTaskListHtml(subtask.label)}</span>
                                                        <span class="task-list-decomposition-category-count">${escapeTaskListHtml(subtask.countText || (subtask.done ? "1" : "0"))}</span>
                                                    </a>
                                                `).join("")}
                                            </div>
                                        </div>
                                    ` : ""}
                                    ${digiMedConventionsSubtask ? `
                                        <div class="task-list-decomposition-subtasks">
                                            <p class="task-list-system-title">SUBTASKS</p>
                                            <p class="task-list-achieved-note">Convention areas acknowledged in your Conventions slide.</p>
                                            <p class="task-list-achieved-note">You need to apply any 3 or more conventions.</p>
                                            <div class="task-list-decomposition-category-list">
                                                <a class="task-list-decomposition-category ${digiMedConventionsSubtask.count > 0 ? "is-covered" : ""}" href="${escapeTaskListHtml(digiMedConventionsSubtask.href)}">
                                                    <span class="task-list-decomposition-category-label">CONVENTIONS</span>
                                                    <span class="task-list-decomposition-category-count">${digiMedConventionsSubtask.count}</span>
                                                </a>
                                            </div>
                                        </div>
                                    ` : ""}
                                    ${isMeritDevFeedbackCollabRow ? `
                                        <div class="task-list-decomposition-subtasks">
                                            <p class="task-list-system-title">SUBTASKS</p>
                                            <p class="task-list-achieved-note">Complete at least one task in each of the Development, Feedback and Collaborative categories.</p>
                                            <div class="task-list-decomposition-category-list">
                                                ${devFeedbackCollabSubtasks.map((subtask) => `
                                                    <a class="task-list-decomposition-category ${subtask.trelloCount > 0 ? "is-covered" : ""}" href="${escapeTaskListHtml(subtask.href)}">
                                                        <span class="task-list-decomposition-category-label">${escapeTaskListHtml(subtask.label)}</span>
                                                        <span class="task-list-decomposition-category-count">${subtask.coverageKnown ? subtask.trelloCount : "-"}</span>
                                                    </a>
                                                `).join("")}
                                            </div>
                                            ${devFeedbackCollabSubtasks[0]?.coverageKnown
                                                ? `<p class="task-list-achieved-note">Trello last synced: ${escapeTaskListHtml(formatTaskListTimestamp(devFeedbackCollabSubtasks[0]?.coverageSavedAt))}</p>`
                                                : `<p class="task-list-achieved-note">Click Sync from Trello above to see these counts.</p>`}
                                        </div>
                                    ` : ""}
                                    ${isIterativeImprovementRow ? `
                                        <div class="task-list-decomposition-subtasks task-list-iterative-improvement-subtasks">
                                            <p class="task-list-system-title">ITERATIVE IMPROVEMENT EVIDENCE</p>
                                            <p class="task-list-achieved-note">Use these evidence sources to show how decisions, testing and trialling led to improvements.</p>
                                            <div class="task-list-iterative-improvement-table" role="table" aria-label="Iterative improvement evidence sources">
                                                <div class="task-list-iterative-improvement-row is-header" role="row">
                                                    <strong role="columnheader">Evidence source</strong>
                                                    <strong role="columnheader">What it can demonstrate</strong>
                                                </div>
                                                ${ITERATIVE_IMPROVEMENT_EVIDENCE_SUBTASKS.map((subtask) => `
                                                    <div class="task-list-iterative-improvement-row" role="row">
                                                        <strong role="cell">${escapeTaskListHtml(subtask.evidenceSource)}</strong>
                                                        <span role="cell">${escapeTaskListHtml(subtask.demonstrates)}</span>
                                                    </div>
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

    const visibleStandards = taskListState.course === "MiddleDTECH"
        ? taskListState.checklistStandards.filter((standard) =>
            ["digital-outcome", "91897", "91907", "91893", "91903"].includes(String(standard))
        )
        : taskListState.checklistStandards;
    const cardsHtml = visibleStandards.map((standard) => {
        const title = standard === "digital-outcome"
            ? "Digital Outcome Description"
            : isMiddleDtech
                ? (["91897", "91907"].includes(String(standard)) ? "Project Development" : "Digital Media")
                : `Standard ${escapeTaskListHtml(standard)}`;
        const summaryTitle = standard === "digital-outcome" ? "Digital Outcome Topic" : title;
        const rows = Array.isArray(taskListState.checklistState[standard]) ? taskListState.checklistState[standard] : [];
        const digitalMediaType = getAllocatedDigitalMediaType(standard);

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
                ` : `<h3>${title}</h3>${digitalMediaType ? `<p class="task-list-digital-media-type">Digital Media Type: ${escapeTaskListHtml(digitalMediaType)}</p>` : ""}`}
                ${renderRowsForStandard(standard, rows)}
                </div>
            </details>
        `;
    }).join("");

    checklistHost.innerHTML = cardsHtml;
}

function getAllocatedDigitalMediaType(standard) {
    const standardCode = String(standard || "").trim();
    if (standardCode !== "91893" && standardCode !== "91903") return "";

    const selectedItem = taskListState.allItems.find((item) => String(item.id) === String(taskListState.selectedId));
    const selectedType = String(selectedItem?.digital_media_type || "").trim();
    if (selectedType) return selectedType;

    const matchingAllocation = taskListState.allItems.find((item) => {
        const projectTaskStandard = String(item?.standard_2 || "").match(/\b(91893|91903)\b/)?.[1] || "";
        return projectTaskStandard === standardCode && String(item?.digital_media_type || "").trim();
    });
    return String(matchingAllocation?.digital_media_type || "").trim();
}

function getStandardCodes(detail, allItems = [], processStandard = "", projectTaskStandard = "") {
    const fromDetails = Array.isArray(detail?.standardDetails)
        ? detail.standardDetails.map((line) => String(line || "").match(/\b(\d{5})\b/)?.[1]).filter(Boolean)
        : [];

    const codes = fromDetails.length
        ? fromDetails.filter((code, index, arr) => arr.indexOf(code) === index)
        : ["91897", "91907"];
    // The Assessment Allocation Manager's Project/Task std is the source of truth per student:
    // an explicit 91893/91903 allocation always shows Digital Media; any other explicit allocation hides it.
    const normalizedProjectTaskStandard = String(projectTaskStandard || "").trim().match(/\b(91893|91903)\b/)?.[1] || "";
    const hasOtherExplicitProjectTaskStandard = Boolean(String(projectTaskStandard || "").trim()) && !normalizedProjectTaskStandard;
    const showDigitalMedia = normalizedProjectTaskStandard
        ? true
        : (!hasOtherExplicitProjectTaskStandard && hasDigitalMediaTopicType(detail, allItems));
    if (showDigitalMedia) {
        const withoutDigitalMediaStandards = codes.filter((code) => code !== "91893" && code !== "91895" && code !== "91903");
        const normalizedProcessStandard = String(processStandard || "").trim().match(/\b(91897|91907)\b/)?.[1] || "";
        const digitalMediaStandard = normalizedProjectTaskStandard || (normalizedProcessStandard === "91907" ? "91903" : "91893");
        withoutDigitalMediaStandards.push(digitalMediaStandard);
        const visibleCodes = normalizedProcessStandard === "91897"
            ? withoutDigitalMediaStandards.filter((code) => code !== "91907")
            : normalizedProcessStandard === "91907"
                ? withoutDigitalMediaStandards.filter((code) => code !== "91897")
                : withoutDigitalMediaStandards;
        return ["digital-outcome", ...visibleCodes];
    }
    const normalizedProcessStandard = String(processStandard || "").trim().match(/\b(91897|91907)\b/)?.[1] || "";
    const visibleCodes = normalizedProcessStandard === "91897"
        ? codes.filter((code) => code !== "91907")
        : normalizedProcessStandard === "91907"
            ? codes.filter((code) => code !== "91897")
            : codes;
    return ["digital-outcome", ...visibleCodes];
}

function normalize91893ChecklistRows(rows, standardCode = "91893") {
    const sourceRows = Array.isArray(rows)
        ? rows.map((step) => ({ text: String(step?.text || "").trim(), done: Boolean(step?.done) })).filter((step) => step.text)
        : [];
    const defaults = EVIDENCE_STEPS_DEFAULTS[standardCode] || EVIDENCE_STEPS_DEFAULTS["91893"];
    return defaults.map((text) => {
        const existing = sourceRows.find((step) => stripStepLevel(step.text).toLowerCase() === stripStepLevel(text).toLowerCase());
        return { text, done: Boolean(existing?.done) };
    });
}

function buildChecklistState(standardCodes, evidenceMap) {
    const next = {};
    const visibleStudentRows = (standard, rows) => (Array.isArray(rows) ? rows : [])
        .filter((step) => !window.hubShouldHideStudentAssessmentTask?.(standard, step?.text));
    standardCodes.forEach((standard) => {
        const existing = Array.isArray(evidenceMap[standard]) ? evidenceMap[standard] : [];
        if (existing.length) {
            if (standard === "digital-outcome") {
                next[standard] = normalizeDigitalOutcomeChecklistRows(existing);
                return;
            }

            if (standard === "91897" || standard === "91907") {
                const legacyMigrated = standard === "91907" ? normalize91907ChecklistRows(existing) : existing;
                next[standard] = visibleStudentRows(standard, normalize91897ChecklistRows(legacyMigrated));
                return;
            }

            if (standard === "91893" || standard === "91903") {
                next[standard] = normalize91893ChecklistRows(existing, standard);
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
        const normalizedDefaults = standard === "91897"
            ? normalize91897ChecklistRows(defaultRows)
            : standard === "91907"
                ? normalize91897ChecklistRows(normalize91907ChecklistRows(defaultRows))
                : defaultRows;
        next[standard] = visibleStudentRows(standard, normalizedDefaults);
    });
    return next;
}

async function loadChecklistForTask(taskId) {
    const selected = taskListState.allItems.find((item) => String(item.id) === String(taskId));
    if (!selected) {
        return;
    }

    taskListState.selectedId = String(selected.id);
    const detailPromise = fetchActivityDetail(taskListState.selectedId);
    const evidencePromise = fetchMyEvidence(taskListState.selectedId).catch(() => []);
    const [detail, evidenceRows] = await Promise.all([detailPromise, evidencePromise]);
    taskListState.taskTopic = String(detail?.name || selected?.name || "Task List").trim();

    const evidenceMap = evidenceRowsToMap(evidenceRows);
    const persistedToolsTechniquesState = getDigiMedToolsTechniquesStateFromEvidence(evidenceRows);
    {
        const localToolsTechniquesState = readDigiMedToolsTechniquesState(taskListState.selectedId, getTaskListEmail());
        const unsavedLabels = Object.keys(localToolsTechniquesState).filter((label) => localToolsTechniquesState[label] && !persistedToolsTechniquesState[label]);
        if (unsavedLabels.length) {
            void persistDigiMedToolsTechniquesState(taskListState.selectedId, { ...localToolsTechniquesState, ...persistedToolsTechniquesState });
        }
    }
    if (Object.keys(persistedToolsTechniquesState).length) {
        const cachedToolsTechniquesState = readDigiMedToolsTechniquesState(taskListState.selectedId, getTaskListEmail());
        writeDigiMedToolsTechniquesState(taskListState.selectedId, getTaskListEmail(), {
            ...cachedToolsTechniquesState,
            ...persistedToolsTechniquesState
        });
    }
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
        taskListState.fullEvidenceState["91907"] = normalize91897ChecklistRows(normalize91907ChecklistRows(taskListState.fullEvidenceState["91907"]));
        migrated91907Rows = before91907Migration !== JSON.stringify(taskListState.fullEvidenceState["91907"]);
    }
    let migrated91893Rows = false;
    if (Array.isArray(taskListState.fullEvidenceState["91893"])) {
        const before91893Migration = JSON.stringify(taskListState.fullEvidenceState["91893"]);
        taskListState.fullEvidenceState["91893"] = normalize91893ChecklistRows(taskListState.fullEvidenceState["91893"]);
        migrated91893Rows = before91893Migration !== JSON.stringify(taskListState.fullEvidenceState["91893"]);
    }
    let migrated91903Rows = false;
    if (Array.isArray(taskListState.fullEvidenceState["91903"])) {
        const before91903Migration = JSON.stringify(taskListState.fullEvidenceState["91903"]);
        taskListState.fullEvidenceState["91903"] = normalize91893ChecklistRows(taskListState.fullEvidenceState["91903"], "91903");
        migrated91903Rows = before91903Migration !== JSON.stringify(taskListState.fullEvidenceState["91903"]);
    }
    taskListState.checklistStandards = getStandardCodes(
        detail || selected,
        taskListState.allItems,
        selected?.standard_1,
        selected?.standard_2
    );
    taskListState.checklistState = buildChecklistState(taskListState.checklistStandards, evidenceMap);
    taskListState.checklistStandards.forEach((standard) => {
        if (!Array.isArray(taskListState.fullEvidenceState[standard])) {
            taskListState.fullEvidenceState[standard] = Array.isArray(taskListState.checklistState[standard])
                ? taskListState.checklistState[standard].map((step) => ({ text: String(step?.text || "").trim(), done: Boolean(step?.done) }))
                : [];
        }
    });

    const signedInEmail = getTaskListEmail();
    const selectedMediaStandard = String(selected?.standard_2 || "").match(/\b(91893|91903)\b/)?.[1] || "";
    const [, templateCopiesPayload] = await Promise.all([
        selectedMediaStandard ? loadVideoEfficientToolsFromServer(taskListState.selectedId, signedInEmail) : Promise.resolve(null),
        loadJson(
            `/api/activities/${encodeURIComponent(taskListState.selectedId)}/my-template-copies`,
            { headers: buildTaskListHeaders({}) }
        ).catch(() => ({ template_copies: [] }))
    ]);
    taskListState.templateCopies = Array.isArray(templateCopiesPayload?.template_copies) ? templateCopiesPayload.template_copies : [];
    renderFinalClientPresentationCard(selected);
    void loadDocumentationDeck(selected);
    void loadFinalOutcome(selected);
    void loadTrelloReport(selected);
    void loadSubmissionStage(selected);
    const templateCopySyncPromise = autoSyncToolsAndTechniquesTemplateCopy(
        taskListState.selectedId,
        signedInEmail,
        taskListState.templateCopies
    );
    renderSavedFullSlideSet(taskListState.templateCopies);

    const autoChangedChecklistPM = autoTickProjectManagementRequirement(taskListState.checklistState);
    const autoChangedChecklistDecomposition = autoTickDecompositionRequirement(taskListState.checklistState, taskListState.selectedId, signedInEmail);
    const autoChangedChecklistUX = autoTickUXPrinciplesRequirement(taskListState.checklistState, taskListState.selectedId, signedInEmail);
    const autoChangedChecklistConventions = autoTickWebConventionsRequirement(taskListState.checklistState, taskListState.selectedId, signedInEmail);
    const autoChangedChecklistWebIntegrity = autoTickWebIntegrityRequirement(taskListState.checklistState);
    const autoChangedChecklistTesting = autoTickTestingFunctionsRequirement(
        taskListState.checklistState, taskListState.fullEvidenceState, taskListState.selectedId, signedInEmail
    );
    const autoChangedChecklistTools = autoTickUseOfToolsTechniquesRequirement(taskListState.checklistState, taskListState.templateCopies);
    const autoChangedChecklistDO = autoTickDigitalOutcomeRequirements(taskListState.checklistState, taskListState.selectedId, signedInEmail);
    const autoRepairedChecklistRI = applyTemplateCopiesAsRelevantImplicationsState(taskListState.checklistState, taskListState.templateCopies);
    const autoChangedChecklistRI = autoTickRelevantImplicationsRequirements(taskListState.checklistState, taskListState.selectedId, signedInEmail);
    const autoSyncedChecklist91893RI = sync91893RelevantImplicationsState(taskListState.checklistState);
    const autoChangedChecklistET = autoTickEfficientToolsRequirement(taskListState.checklistState, taskListState.selectedId, signedInEmail);
    const clearedChecklistManualTicks = clearUnverifiedManualTicks(taskListState.checklistState);
    const autoChangedChecklist = autoChangedChecklistPM || autoChangedChecklistDecomposition || autoChangedChecklistUX || autoChangedChecklistConventions || autoChangedChecklistWebIntegrity || autoChangedChecklistTesting || autoChangedChecklistTools || autoChangedChecklistDO || autoChangedChecklistRI || autoRepairedChecklistRI || autoSyncedChecklist91893RI || autoChangedChecklistET || clearedChecklistManualTicks;
    const autoChangedEvidencePM = autoTickProjectManagementRequirement(taskListState.fullEvidenceState);
    const autoChangedEvidenceDecomposition = autoTickDecompositionRequirement(taskListState.fullEvidenceState, taskListState.selectedId, signedInEmail);
    const autoChangedEvidenceUX = autoTickUXPrinciplesRequirement(taskListState.fullEvidenceState, taskListState.selectedId, signedInEmail);
    const autoChangedEvidenceConventions = autoTickWebConventionsRequirement(taskListState.fullEvidenceState, taskListState.selectedId, signedInEmail);
    const autoChangedEvidenceWebIntegrity = autoTickWebIntegrityRequirement(taskListState.fullEvidenceState);
    const autoChangedEvidenceTesting = autoTickTestingFunctionsRequirement(
        taskListState.fullEvidenceState, taskListState.fullEvidenceState, taskListState.selectedId, signedInEmail
    );
    const autoChangedEvidenceTools = autoTickUseOfToolsTechniquesRequirement(taskListState.fullEvidenceState, taskListState.templateCopies);
    const autoChangedEvidenceDO = autoTickDigitalOutcomeRequirements(taskListState.fullEvidenceState, taskListState.selectedId, signedInEmail);
    const autoRepairedEvidenceRI = applyTemplateCopiesAsRelevantImplicationsState(taskListState.fullEvidenceState, taskListState.templateCopies);
    const autoChangedEvidenceRI = autoTickRelevantImplicationsRequirements(taskListState.fullEvidenceState, taskListState.selectedId, signedInEmail);
    const autoSyncedEvidence91893RI = sync91893RelevantImplicationsState(taskListState.fullEvidenceState);
    const autoChangedEvidenceET = autoTickEfficientToolsRequirement(taskListState.fullEvidenceState, taskListState.selectedId, signedInEmail);
    const clearedEvidenceManualTicks = clearUnverifiedManualTicks(taskListState.fullEvidenceState);
    const autoChangedEvidence = autoChangedEvidencePM || autoChangedEvidenceDecomposition || autoChangedEvidenceUX || autoChangedEvidenceConventions || autoChangedEvidenceWebIntegrity || autoChangedEvidenceTesting || autoChangedEvidenceTools || autoChangedEvidenceDO || autoChangedEvidenceRI || autoRepairedEvidenceRI || autoSyncedEvidence91893RI || autoChangedEvidenceET || clearedEvidenceManualTicks;
    if (migratedDigitalOutcomeRows || migrated91897Rows || migrated91907Rows || migrated91893Rows || migrated91903Rows || autoChangedChecklist || autoChangedEvidence) {
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

    void templateCopySyncPromise.then(async (templateCopies) => {
        if (String(taskListState.selectedId) !== String(selected.id)) return;
        const nextCopies = Array.isArray(templateCopies) ? templateCopies : [];
        if (JSON.stringify(nextCopies) === JSON.stringify(taskListState.templateCopies)) return;
        taskListState.templateCopies = nextCopies;
        renderSavedFullSlideSet(nextCopies);

        const checklistChanged = [
            autoTickWebIntegrityRequirement(taskListState.checklistState),
            autoTickTestingFunctionsRequirement(taskListState.checklistState, taskListState.fullEvidenceState, selected.id, signedInEmail),
            autoTickUseOfToolsTechniquesRequirement(taskListState.checklistState, nextCopies),
            autoTickDigitalOutcomeRequirements(taskListState.checklistState, selected.id, signedInEmail),
            applyTemplateCopiesAsRelevantImplicationsState(taskListState.checklistState, nextCopies),
            autoTickRelevantImplicationsRequirements(taskListState.checklistState, selected.id, signedInEmail)
        ].some(Boolean);
        const evidenceChanged = [
            autoTickWebIntegrityRequirement(taskListState.fullEvidenceState),
            autoTickTestingFunctionsRequirement(taskListState.fullEvidenceState, taskListState.fullEvidenceState, selected.id, signedInEmail),
            autoTickUseOfToolsTechniquesRequirement(taskListState.fullEvidenceState, nextCopies),
            autoTickDigitalOutcomeRequirements(taskListState.fullEvidenceState, selected.id, signedInEmail),
            applyTemplateCopiesAsRelevantImplicationsState(taskListState.fullEvidenceState, nextCopies),
            autoTickRelevantImplicationsRequirements(taskListState.fullEvidenceState, selected.id, signedInEmail)
        ].some(Boolean);
        if (evidenceChanged) {
            const standards = Array.from(new Set(Object.keys(taskListState.fullEvidenceState)));
            await saveMyEvidence(selected.id, evidenceMapToRows(taskListState.fullEvidenceState, standards)).catch(() => {});
        }
        if (checklistChanged || evidenceChanged) renderChecklistCards(detail || selected, taskListState.allItems);
    }).catch(() => {});

    void loadIdentifiedComponentsCount(taskListState.selectedId, signedInEmail).then((count) => {
        if (count !== null) {
            const checklistChanged = autoTickMultipleComponentsRequirement(taskListState.checklistState, count);
            const evidenceChanged = autoTickMultipleComponentsRequirement(taskListState.fullEvidenceState, count);
            const triallingChecklistChanged = autoTickTriallingComponentsRequirement(taskListState.checklistState, count);
            const triallingEvidenceChanged = autoTickTriallingComponentsRequirement(taskListState.fullEvidenceState, count);
            if (checklistChanged || evidenceChanged || triallingChecklistChanged || triallingEvidenceChanged) {
                const allStandards = Array.from(new Set(Object.keys(taskListState.fullEvidenceState)));
                void saveMyEvidence(taskListState.selectedId, evidenceMapToRows(taskListState.fullEvidenceState, allStandards)).catch(() => {});
            }
            renderChecklistCards(detail || selected, taskListState.allItems);
        }
    });

    void loadDecompositionCoverageFromServer(taskListState.selectedId).then((coverage) => {
        if (coverage?.found) {
            autoTickDecompositionRequirement(taskListState.checklistState, selected.id, signedInEmail);
            const evidenceChanged = autoTickDecompositionRequirement(taskListState.fullEvidenceState, selected.id, signedInEmail);
            if (evidenceChanged) {
                const standards = Array.from(new Set(Object.keys(taskListState.fullEvidenceState)));
                void saveMyEvidence(selected.id, evidenceMapToRows(taskListState.fullEvidenceState, standards)).catch(() => {});
            }
            renderChecklistCards(detail || selected, taskListState.allItems);
        }
    });

    const githubRepoUrlForAutoSync = findStudentGithubRepoUrl(taskListState.fullEvidenceState)
        || findStudentGithubRepoUrl(taskListState.checklistState);
    if (githubRepoUrlForAutoSync && signedInEmail) {
        void runGithubEfficientToolsSync(taskListState.selectedId, signedInEmail, githubRepoUrlForAutoSync)
            .then(async () => {
                const checklistChanged = autoTickEfficientToolsRequirement(taskListState.checklistState, taskListState.selectedId, signedInEmail);
                const evidenceChanged = autoTickEfficientToolsRequirement(taskListState.fullEvidenceState, taskListState.selectedId, signedInEmail);
                if (checklistChanged || evidenceChanged) {
                    const allStandards = Array.from(new Set(Object.keys(taskListState.fullEvidenceState)));
                    await saveMyEvidence(taskListState.selectedId, evidenceMapToRows(taskListState.fullEvidenceState, allStandards)).catch(() => {});
                }
                renderChecklistCards(detail || selected, taskListState.allItems);
            })
            .catch(() => {
                // Silent on auto-sync; the manual "Sync from GitHub" button will surface the error.
            });
    }

    const openLink = document.querySelector("#task-list-open-topic");
    if (openLink) {
        openLink.setAttribute("href", buildCustomActivityLink(taskListState.selectedId, taskListState.taskTopic));
    }

    const processStandard = String(selected?.standard_1 || "").trim() || "Not set";
    const projectTaskStandard = String(selected?.standard_2 || "").trim() || "Not set";
    const yearGroup = String(selected?.year_group || "").trim() || "Not set";
    const courseType = String(selected?.course_type || "").trim() || "Not set";
    setStatus(taskListState.course === "MiddleDTECH"
        ? `Year Group: ${yearGroup} | Course Type: ${courseType}`
        : `Year Group: ${yearGroup} | Course Type: ${courseType} | Process Std No: ${processStandard} | Project/Task Std No: ${projectTaskStandard}`);
}

async function renderTaskListPage() {
    const email = await getSignedInEmail();
    if (!email) {
        setStatus("Sign in with your school account to view your Task List.", true);
        return;
    }

    const context = getQueryContext();
    let allocations = { assessment_tasks: [], projects: [], task_list_course: "" };
    try {
        allocations = await fetchAllocations();
    } catch (_error) {
        allocations = { assessment_tasks: [], projects: [], task_list_course: "" };
    }
    taskListState.course = String(allocations.task_list_course || "").trim();

    taskListState.allItems = [
        ...allocations.assessment_tasks.map((item) => ({ ...item, kind: "Assessment" })),
        ...allocations.projects.map((item) => ({ ...item, kind: "Project" }))
    ];

    let courseLookupError = null;
    if (!taskListState.course) {
        try {
            const coursePayload = await loadJson("/api/practical-skills/my-course", {
                headers: buildTaskListHeaders({}),
                cache: "no-store"
            });
            taskListState.course = String(coursePayload?.course || "").trim();
        } catch (error) {
            courseLookupError = error;
            taskListState.course = "";
        }
    }
    if (!taskListState.course) taskListState.course = getTaskListCourseFromAllocations(taskListState.allItems);
    if (!taskListState.course && courseLookupError) {
        setStatus("Could not confirm your DTECH course. Please reload or ask your teacher for help.", true);
        return;
    }

    renderHeader({
        totalLinked: taskListState.allItems.length,
        assessmentCount: allocations.assessment_tasks.length,
        projectCount: allocations.projects.length,
        metCount: 0,
        unresolvedCount: 0,
        linkedAssessments: allocations.assessment_tasks,
        linkedProjects: allocations.projects
    });

    if (taskListState.course === "MiddleDTECH") {
        const setupHost = document.querySelector("#task-list-mdtech-drive-setup");
        const setupStatus = document.querySelector("#task-list-mdtech-drive-setup-status");
        const setupButton = document.querySelector("#task-list-mdtech-drive-setup-button");
        const checklistCard = document.querySelector("#task-list-checklist-card");
        let setup = null;
        try {
            setup = await loadJson("/api/student/mdtech-project-folder", {
                headers: buildTaskListHeaders({}),
                cache: "no-store"
            });
        } catch (error) {
            if (setupStatus) setupStatus.textContent = error?.message || "Could not check your Google Drive folder.";
        }

        if (!setup?.ready) {
            if (setupHost) setupHost.hidden = false;
            if (checklistCard) checklistCard.hidden = true;
            if (setupStatus && !setupStatus.textContent) {
                setupStatus.textContent = "Set up this folder to unlock your MiddleDTECH Task List.";
            }
            if (setupButton && setupButton.dataset.bound !== "true") {
                setupButton.dataset.bound = "true";
                setupButton.addEventListener("click", async () => {
                    setupButton.disabled = true;
                    if (setupStatus) setupStatus.textContent = "Requesting Google Drive access…";
                    try {
                        if (typeof requestHubDriveAccessToken !== "function") {
                            throw new Error("Google Drive setup is not available on this page. Reload and try again.");
                        }
                        const tokenResponse = await requestHubDriveAccessToken({ forceConsent: true });
                        if (tokenResponse?.error || !tokenResponse?.access_token) {
                            throw new Error("Google Drive permission is required to create your MDTECH Project folder.");
                        }
                        await loadJson("/api/student/mdtech-project-folder", {
                            method: "POST",
                            headers: buildTaskListHeaders({ "Content-Type": "application/json" }),
                            body: JSON.stringify({ driveAccessToken: tokenResponse.access_token })
                        });
                        window.location.reload();
                    } catch (error) {
                        if (setupStatus) setupStatus.textContent = error?.message || "Could not set up your MDTECH Project folder.";
                        setupButton.disabled = false;
                    }
                });
            }
            return;
        }

        if (setupHost) setupHost.hidden = true;
    }

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

    const checklistCard = document.querySelector("#task-list-checklist-card");
    if (checklistCard) checklistCard.hidden = false;

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

// Mirrors ProjectPages/activity-detail.js openInlineTrelloConnectPopup — saving a Trello board link
// and authorizing the Trello account (this popup) are two separate steps; sync needs both.
async function openTaskListTrelloConnectPopup() {
    const popupRef = window.open("", "dtech_hub_trello_connect", "width=650,height=760");
    if (!popupRef) {
        throw new Error("Popup blocked. Please allow popups and try again.");
    }

    let config = null;
    try {
        config = await loadJson("/api/integrations/trello/config", { headers: buildTaskListHeaders({}) });
    } catch (_error) {
        popupRef.close();
        throw new Error("Could not reach the server to start Trello connection.");
    }

    if (!config?.enabled || !config?.api_key) {
        popupRef.close();
        throw new Error("Trello integration is not configured on the server yet.");
    }

    const returnUrl = `${window.location.origin}/trello-callback.html`;
    const authorizeUrl = new URL("https://trello.com/1/authorize");
    authorizeUrl.searchParams.set("expiration", "never");
    authorizeUrl.searchParams.set("name", "DTECH-HUB");
    authorizeUrl.searchParams.set("scope", "read,write");
    authorizeUrl.searchParams.set("response_type", "token");
    authorizeUrl.searchParams.set("key", String(config.api_key));
    authorizeUrl.searchParams.set("return_url", returnUrl);

    return new Promise((resolve, reject) => {
        let finished = false;
        let timeoutHandle = null;
        let closePollHandle = null;

        const finish = (error, token) => {
            if (finished) return;
            finished = true;
            window.removeEventListener("message", onMessage);
            if (timeoutHandle) clearTimeout(timeoutHandle);
            if (closePollHandle) clearInterval(closePollHandle);
            if (error) {
                reject(error);
                return;
            }
            resolve(String(token || ""));
        };

        const onMessage = (event) => {
            if (event.origin !== window.location.origin) return;
            const data = event.data || {};
            if (data.source !== "dtech-hub-trello" || !data.token) return;
            finish(null, data.token);
        };

        window.addEventListener("message", onMessage);
        try {
            popupRef.location.href = authorizeUrl.toString();
        } catch (_error) {
            finish(new Error("Could not open the Trello authorization page. Please allow popups and try again."));
            return;
        }

        timeoutHandle = setTimeout(() => {
            finish(new Error("Trello authorization timed out. Please try again."));
        }, 120000);

        closePollHandle = setInterval(() => {
            if (finished) return;
            if (popupRef && popupRef.closed) {
                finish(new Error("Trello authorization was cancelled."));
            }
        }, 350);
    });
}

async function runTaskListTrelloSync() {
    const trelloBtn = document.querySelector("#task-list-sync-trello");
    const connectBtn = document.querySelector("#task-list-connect-trello");
    if (!taskListState.selectedId) return;

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

    if (trelloBtn) { trelloBtn.disabled = true; trelloBtn.textContent = "Syncing Trello\u2026"; }

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
        const toolsTechniquesKeywords = await fetchToolsTechniquesKeywords();
        const categoryRows = [
            ...countDecompositionTaskCategories(allCards, toolsTechniquesKeywords),
            ...countProjectManagementProcessCategories(allCards)
        ];
        writeDecompositionCategoryCoverage(taskListState.selectedId, email, categoryRows);
        await saveDecompositionCoverageToServer(taskListState.selectedId, categoryRows, allCards.length);
        autoTickDecompositionRequirement(taskListState.checklistState, taskListState.selectedId, email);
        const evidenceChanged = autoTickDecompositionRequirement(taskListState.fullEvidenceState, taskListState.selectedId, email);
        if (evidenceChanged) {
            const standards = Array.from(new Set(Object.keys(taskListState.fullEvidenceState)));
            await saveMyEvidence(taskListState.selectedId, evidenceMapToRows(taskListState.fullEvidenceState, standards)).catch(() => {});
        }

        if (connectBtn) connectBtn.hidden = true;
        setStatus(`Trello sync complete. ${allCards.length} task${allCards.length === 1 ? "" : "s"} checked against the decomposition categories.`);
        renderChecklistCards({ name: taskListState.taskTopic }, taskListState.allItems);
    } catch (error) {
        const message = String(error?.message || "");
        const isNotConnected = /has not connected trello/i.test(message);
        setStatus(
            isNotConnected
                ? "Your Trello board link is saved, but your Trello account isn't connected yet. Click Connect Trello Account, then sync again."
                : (message || "Could not sync from Trello."),
            true
        );
        if (connectBtn) connectBtn.hidden = !isNotConnected;
    } finally {
        if (trelloBtn) { trelloBtn.disabled = false; trelloBtn.textContent = "\u21bb Sync from Trello"; }
    }
}

    document.addEventListener("click", async (event) => {
        const trelloBtn = event.target?.closest?.("#task-list-sync-trello");
        if (!trelloBtn || !taskListState.selectedId) return;
        await runTaskListTrelloSync();
    });

    document.addEventListener("click", async (event) => {
        const connectBtn = event.target?.closest?.("#task-list-connect-trello, #task-list-trello-report-connect");
        if (!connectBtn) return;

        connectBtn.disabled = true;
        setStatus("Connecting Trello\u2026 authorize DTECH-HUB in the popup window.");
        try {
            const token = await openTaskListTrelloConnectPopup();
            const connectResponse = await fetch("/api/integrations/trello/connect", {
                method: "POST",
                headers: buildTaskListHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ token })
            });
            const connectPayload = await connectResponse.json().catch(() => ({}));
            if (!connectResponse.ok) {
                throw new Error(connectPayload?.error || "Could not connect Trello.");
            }
            setStatus("Trello connected! Syncing your board\u2026");
            connectBtn.hidden = true;
            await runTaskListTrelloSync();
            const selected = taskListState.allItems.find((item) => String(item.id) === taskListState.selectedId);
            if (selected) void loadTrelloReport(selected);
        } catch (error) {
            setStatus(error?.message || "Could not connect Trello.", true);
        } finally {
            if (connectBtn?.isConnected) connectBtn.disabled = false;
        }
    });


    document.addEventListener("click", async (event) => {
        const githubBtn = event.target?.closest?.("#task-list-sync-github");
        if (!githubBtn || !taskListState.selectedId) return;

        const email = getTaskListEmail();
        if (!email) {
            setStatus("Sign in before syncing from GitHub.", true);
            return;
        }

        const repoUrl = findStudentGithubRepoUrl(taskListState.fullEvidenceState)
            || findStudentGithubRepoUrl(taskListState.checklistState);
        if (!repoUrl) {
            setStatus("Save your public GitHub repository link on the Version Control: GitHub page first.", true);
            return;
        }

        githubBtn.disabled = true;
        githubBtn.textContent = "Syncing GitHub\u2026";

        try {
            const payload = await runGithubEfficientToolsSync(taskListState.selectedId, email, repoUrl);
            const checklistChanged = autoTickEfficientToolsRequirement(taskListState.checklistState, taskListState.selectedId, email);
            const evidenceChanged = autoTickEfficientToolsRequirement(taskListState.fullEvidenceState, taskListState.selectedId, email);
            if (checklistChanged || evidenceChanged) {
                const allStandards = Array.from(new Set(Object.keys(taskListState.fullEvidenceState)));
                await saveMyEvidence(taskListState.selectedId, evidenceMapToRows(taskListState.fullEvidenceState, allStandards)).catch(() => {});
            }
            setStatus(`GitHub sync complete. Checked ${Number(payload?.file_count || 0)} file(s) across ${Number(payload?.commit_count || 0)} commit(s).`);
            renderChecklistCards({ name: taskListState.taskTopic }, taskListState.allItems);
            void loadGithubZipSize(taskListState.selectedId, taskListState.finalOutcome?.repositoryUrl || repoUrl);
        } catch (error) {
            setStatus(error?.message || "Could not sync from GitHub.", true);
        } finally {
            const btn = document.querySelector("#task-list-sync-github");
            if (btn) { btn.disabled = false; btn.textContent = "\u21bb Sync from GitHub"; }
        }
    });

    document.addEventListener("click", (event) => {
        const assetManagerBtn = event.target?.closest?.("#task-list-open-asset-manager");
        if (!assetManagerBtn || !taskListState.selectedId) return;
        window.open(`asset-manager.html?id=${encodeURIComponent(taskListState.selectedId)}`, "_blank", "noopener");
    });

    document.addEventListener("click", (event) => {
        if (event.target?.closest?.("[data-documentation-merge]")) void handleDocumentationAction("merge");
        else if (event.target?.closest?.("[data-documentation-add]")) void handleDocumentationAction("add");
        else if (event.target?.closest?.("[data-documentation-sync]")) void handleDocumentationAction("sync");
    });

    document.addEventListener("click", (event) => {
        const button = event.target?.closest?.("[data-slideshow-pdf]");
        if (button) void handleSlideshowPdfExport(button.getAttribute("data-slideshow-pdf"));
    });

    document.addEventListener("click", (event) => {
        if (event.target?.closest?.("#task-list-outcome-download")) void handleFinalOutcomeAction("download");
        else if (event.target?.closest?.("#task-list-outcome-save")) void handleFinalOutcomeAction("save");
    });

    document.addEventListener("click", (event) => {
        if (event.target?.closest?.("#task-list-trello-report-generate")) void handleTrelloReportAction("generate");
        else if (event.target?.closest?.("#task-list-trello-report-retry")) void handleTrelloReportAction("retry");
    });

    document.addEventListener("click", (event) => {
        if (event.target?.closest?.("#task-list-submission-check")) void handleSubmissionStageAction("check");
        else if (event.target?.closest?.("#task-list-submission-build")) void handleSubmissionStageAction("build");
        else if (event.target?.closest?.("#task-list-submission-retry")) void handleSubmissionStageAction("retry");
    });

    document.addEventListener("change", (event) => {
        if (event.target?.id !== "task-list-trello-report-board" || !taskListState.trelloReport || taskListState.trelloReportBusy) return;
        taskListState.trelloReport.boardId = event.target.value;
        taskListState.trelloReport.snapshot = null;
        taskListState.trelloReport.retryDriveSave = false;
        taskListState.trelloReport.message = "";
        renderTrelloReportState();
    });

    document.addEventListener("change", (event) => {
        if (event.target?.id === "task-list-outcome-repository" && taskListState.finalOutcome && !taskListState.finalOutcomeBusy) {
            taskListState.finalOutcome.repositoryUrl = event.target.value;
            taskListState.finalOutcome.snapshot = null;
            taskListState.finalOutcome.retryDriveSave = false;
            taskListState.finalOutcome.message = "";
            document.querySelector("#task-list-outcome-pushed").checked = false;
            renderFinalOutcomeState();
            void loadGithubZipSize(taskListState.selectedId, taskListState.finalOutcome.repositoryUrl);
        } else if (event.target?.id === "task-list-outcome-pushed") renderFinalOutcomeState();
    });

    document.addEventListener("click", async (event) => {
        const presentationButton = event.target?.closest?.("#task-list-client-presentation-action");
        if (!presentationButton) return;
        const selected = taskListState.allItems.find((item) => String(item?.id || "") === String(taskListState.selectedId));
        if (!isSeniorDigitalMediaTask(selected)) return;

        const savedCopy = taskListState.templateCopies.find((copy) =>
            String(copy?.templateId || "").trim().toLowerCase() === "final-client-presentation"
        );
        if (savedCopy?.fileUrl) {
            window.open(savedCopy.fileUrl, "_blank", "noopener,noreferrer");
            return;
        }

        const status = document.querySelector("#task-list-client-presentation-status");
        presentationButton.disabled = true;
        presentationButton.textContent = "Creating presentation...";
        if (status) status.textContent = "Requesting Google Drive access...";
        try {
            if (typeof requestHubDriveAccessToken !== "function") {
                throw new Error("Google Drive access is not available on this page. Reload and try again.");
            }
            const tokenResponse = await requestHubDriveAccessToken({ forceConsent: false });
            if (tokenResponse?.error || !tokenResponse?.access_token) {
                throw new Error("Google Drive permission is required to create your client presentation.");
            }
            const payload = await loadJson("/api/student/drive-setup/create-client-presentation", {
                method: "POST",
                headers: buildTaskListHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({
                    driveAccessToken: tokenResponse.access_token,
                    activityId: String(selected.id),
                    taskName: String(selected.name || "Digital Media")
                })
            });
            const copy = {
                templateId: "final-client-presentation",
                templateTitle: "Final Client Presentation",
                fileUrl: String(payload?.fileUrl || "").trim(),
                fileName: String(payload?.fileName || "Final Client Presentation").trim(),
                processAssessmentFolderUrl: String(payload?.folderUrl || "").trim(),
                destinationFolderUrl: String(payload?.folderUrl || "").trim()
            };
            if (!copy.fileUrl) throw new Error("The presentation was created but Google Drive did not return its link.");
            taskListState.templateCopies = [
                ...taskListState.templateCopies.filter((entry) => String(entry?.templateId || "").trim().toLowerCase() !== copy.templateId),
                copy
            ];
            renderFinalClientPresentationCard(selected);
            if (status) status.textContent = payload?.alreadyExists
                ? "Your existing client presentation is ready to continue."
                : "Client presentation created in SeniorDTECH / Process Assessment.";
        } catch (error) {
            if (status) status.textContent = error?.message || "Could not create your client presentation.";
        } finally {
            presentationButton.disabled = false;
            if (!taskListState.templateCopies.some((copy) => String(copy?.templateId || "").trim().toLowerCase() === "final-client-presentation")) {
                presentationButton.textContent = "Create presentation";
            }
        }
    });

    document.addEventListener("click", async (event) => {
        const useSavedSetButton = event.target?.closest?.("[data-slide-set-use]");
        if (useSavedSetButton) {
            const savedEntry = taskListState.templateCopies.find((copy) =>
                String(copy?.templateId || "").trim().toLowerCase() === "assessment-full-slide-set");
            const input = document.querySelector("#task-list-slide-set-url");
            if (input && savedEntry?.fileUrl) {
                input.value = String(savedEntry.fileUrl);
                input.focus();
                setStatus("Saved full slide set selected. Sync it to refresh the Task List.");
            }
            return;
        }

        const deleteSavedSetButton = event.target?.closest?.("[data-slide-set-delete]");
        if (deleteSavedSetButton && taskListState.selectedId) {
            if (!window.confirm("Remove the saved full slide-set link from this Task List? The Google Slides file will remain in Drive.")) return;
            deleteSavedSetButton.disabled = true;
            try {
                await loadJson(`/api/activities/${encodeURIComponent(taskListState.selectedId)}/reset-template-use`, {
                    method: "POST",
                    headers: buildTaskListHeaders({ "Content-Type": "application/json" }),
                    body: JSON.stringify({ templateId: "assessment-full-slide-set" })
                });
                const payload = await loadJson(
                    `/api/activities/${encodeURIComponent(taskListState.selectedId)}/my-template-copies`,
                    { headers: buildTaskListHeaders({}) }
                );
                taskListState.templateCopies = Array.isArray(payload?.template_copies) ? payload.template_copies : [];
                renderSavedFullSlideSet(taskListState.templateCopies);
                setStatus("Saved slide-set link removed. The presentation remains in Google Drive.");
            } catch (error) {
                setStatus(error?.message || "Could not remove the saved slide-set link.", true);
                deleteSavedSetButton.disabled = false;
            }
            return;
        }

        const slideSetButton = event.target?.closest?.("#task-list-sync-slide-set");
        if (!slideSetButton || !taskListState.selectedId) return;

        const input = document.querySelector("#task-list-slide-set-url");
        const presentationUrl = String(input?.value || "").trim();
        if (!presentationUrl) {
            setStatus("Paste the Google Slides link to your full slide set first.", true);
            input?.focus();
            return;
        }

        slideSetButton.disabled = true;
        slideSetButton.textContent = "Requesting Drive access...";
        try {
            const tokenResponse = await requestTaskListDriveToken();
            if (tokenResponse.error || !tokenResponse.access_token) {
                throw new Error("Drive access was not granted.");
            }

            slideSetButton.textContent = "Reading slide titles...";
            const payload = await loadJson(
                `/api/activities/${encodeURIComponent(taskListState.selectedId)}/sync-slide-set`,
                {
                    method: "POST",
                    headers: buildTaskListHeaders({ "Content-Type": "application/json" }),
                    body: JSON.stringify({ driveAccessToken: tokenResponse.access_token, presentationUrl })
                }
            );

            const testingCounts = payload?.testing_functions_counts;
            if (testingCounts && taskListState.fullEvidenceState) {
                const functionalCount = Math.max(0, Number.parseInt(testingCounts.functionalCount, 10) || 0);
                const userCount = Math.max(0, Number.parseInt(testingCounts.userCount, 10) || 0);
                taskListState.fullEvidenceState["testing-functions-counts"] = [{
                    text: `TESTING_FUNCTIONS_COUNT|${functionalCount}|${userCount}`,
                    done: functionalCount + userCount > 0
                }];
                const standards = Array.from(new Set(Object.keys(taskListState.fullEvidenceState)));
                await saveMyEvidence(
                    taskListState.selectedId,
                    evidenceMapToRows(taskListState.fullEvidenceState, standards)
                );
            }

            await loadChecklistForTask(taskListState.selectedId);
            const matchedTitles = Array.isArray(payload?.matched) ? payload.matched : [];
            setStatus(matchedTitles.length
                ? `Saved slide set and linked ${matchedTitles.length} recognized section${matchedTitles.length === 1 ? "" : "s"} to this Task List.`
                : "Saved the slide-set link, but found no recognized task headings. No tasks were ticked.");
        } catch (error) {
            setStatus(error?.message || "Could not sync the full slide set.", true);
        } finally {
            if (slideSetButton?.isConnected) {
                slideSetButton.disabled = false;
                const savedLink = Boolean(document.querySelector("#task-list-slide-set-saved a"));
                slideSetButton.textContent = savedLink ? "Sync saved slide set" : "Save and sync slide set";
            }
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
            const checklistTriallingChanged = autoTickTriallingComponentsRequirement(taskListState.checklistState, componentCount);
            const evidenceTriallingChanged = autoTickTriallingComponentsRequirement(taskListState.fullEvidenceState, componentCount);

            const repairedChecklist = applyTemplateCopiesAsRelevantImplicationsState(taskListState.checklistState, taskListState.templateCopies);
            const repairedEvidence = applyTemplateCopiesAsRelevantImplicationsState(taskListState.fullEvidenceState, taskListState.templateCopies);

            const digitalOutcomeChecklistChanged = autoTickDigitalOutcomeRequirements(taskListState.checklistState, taskListState.selectedId, getTaskListEmail());
            const digitalOutcomeEvidenceChanged = autoTickDigitalOutcomeRequirements(taskListState.fullEvidenceState, taskListState.selectedId, getTaskListEmail());
            const integrityChecklistChanged = autoTickWebIntegrityRequirement(taskListState.checklistState);
            const integrityEvidenceChanged = autoTickWebIntegrityRequirement(taskListState.fullEvidenceState);

            autoTickRelevantImplicationsRequirements(taskListState.checklistState, taskListState.selectedId, getTaskListEmail());
            autoTickRelevantImplicationsRequirements(taskListState.fullEvidenceState, taskListState.selectedId, getTaskListEmail());

            if (repairedChecklist || repairedEvidence || checklistMultipleComponentsChanged || evidenceMultipleComponentsChanged || checklistTriallingChanged || evidenceTriallingChanged || digitalOutcomeChecklistChanged || digitalOutcomeEvidenceChanged || integrityChecklistChanged || integrityEvidenceChanged) {
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

        const managementKind = getStepAutoManagementKind(standard, rows[index].text);
        if (managementKind !== "auto") {
            // No automatic evidence source: this is a planning tick for the current session only, never saved.
            const sessionKey = getSessionTickKey(standard, index);
            if (checkbox.checked) {
                taskListState.sessionTicks[sessionKey] = true;
            } else {
                delete taskListState.sessionTicks[sessionKey];
            }

            const isDataIntegrityTestingRow = /applying appropriate data integrity and testing procedures/i.test(stepText);
            if (isDataIntegrityTestingRow && checkbox.checked && (standard === "91893" || standard === "91903")) {
                const activityId = taskListState.selectedId;
                const email = getTaskListEmail();
                const efficientToolsState = readDigiMedEfficientToolsState(activityId, email);
                if (!efficientToolsState["HTML/CSS validation procedures"]) {
                    efficientToolsState["HTML/CSS validation procedures"] = true;
                    writeDigiMedEfficientToolsState(activityId, email, efficientToolsState);
                    renderChecklistCards({ name: taskListState.taskTopic }, taskListState.allItems);
                    return;
                }
            }

            setStatus("Planning tick noted for this session only \u2014 attach evidence to make it count.");
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
        const testingChecklistChanged = autoTickTestingFunctionsRequirement(
            taskListState.checklistState, taskListState.fullEvidenceState, taskListState.selectedId, getTaskListEmail()
        );
        const testingEvidenceChanged = autoTickTestingFunctionsRequirement(
            taskListState.fullEvidenceState, taskListState.fullEvidenceState, taskListState.selectedId, getTaskListEmail()
        );
        const synced91893ChecklistChanged = sync91893RelevantImplicationsState(taskListState.checklistState);
        const synced91893EvidenceChanged = sync91893RelevantImplicationsState(taskListState.fullEvidenceState);
        const efficientToolsChecklistChanged = autoTickEfficientToolsRequirement(taskListState.checklistState, taskListState.selectedId, getTaskListEmail());
        const efficientToolsEvidenceChanged = autoTickEfficientToolsRequirement(taskListState.fullEvidenceState, taskListState.selectedId, getTaskListEmail());

        if (relevantImplicationsChecklistChanged || relevantImplicationsEvidenceChanged || testingChecklistChanged || testingEvidenceChanged || synced91893ChecklistChanged || synced91893EvidenceChanged || efficientToolsChecklistChanged || efficientToolsEvidenceChanged) {
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

window.addEventListener("pageshow", (event) => {
    if (!event.persisted || !taskListState.selectedId) return;
    void loadChecklistForTask(taskListState.selectedId);
});
