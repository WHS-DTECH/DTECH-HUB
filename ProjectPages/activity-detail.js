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
        "Identify problem requirements and success criteria.",
        "Plan and implement advanced techniques for the outcome.",
        "Capture evidence from iterative testing and debugging.",
        "Refine the outcome based on trial results.",
        "Explain how the outcome meets specifications."
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

function toStandardCode(value) {
    const match = String(value || "").match(/\b\d{5}\b/);
    return match ? match[0] : "";
}

function getEvidenceStepsStorageKey(email, projectId) {
    return `dtech:evidence-steps:v1:${String(email || "").toLowerCase()}:${String(projectId || "")}`;
}

function readEvidenceStepsMap(email, projectId) {
    const key = getEvidenceStepsStorageKey(email, projectId);
    if (!key) return {};

    try {
        const parsed = JSON.parse(localStorage.getItem(key) || "{}");
        if (!parsed || typeof parsed !== "object") {
            return {};
        }
        return parsed;
    } catch (_error) {
        return {};
    }
}

function writeEvidenceStepsMap(email, projectId, value) {
    const key = getEvidenceStepsStorageKey(email, projectId);
    if (!key) return;

    try {
        localStorage.setItem(key, JSON.stringify(value || {}));
    } catch (_error) {
    }
}

function renderEvidenceSidebar({ host, email, projectId, standards }) {
    if (!host || !email || !projectId || !Array.isArray(standards) || !standards.length) {
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
        triggerButton.textContent = "Open Evidence Steps";
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

    const state = readEvidenceStepsMap(email, projectId);
    standards.forEach((code) => {
        if (!Array.isArray(state[code]) || !state[code].length) {
            state[code] = Array.isArray(EVIDENCE_STEPS_DEFAULTS[code])
                ? [...EVIDENCE_STEPS_DEFAULTS[code]]
                : [""];
        }
    });
    writeEvidenceStepsMap(email, projectId, state);

    const renderStepRows = (rowsHost, standardCode) => {
        const steps = Array.isArray(state[standardCode]) ? state[standardCode] : [];
        rowsHost.innerHTML = "";

        steps.forEach((step, index) => {
            const row = document.createElement("div");
            row.className = "evidence-step-row";

            const check = document.createElement("input");
            check.type = "checkbox";
            check.className = "evidence-step-check";
            check.disabled = true;

            const input = document.createElement("input");
            input.type = "text";
            input.className = "evidence-step-input";
            input.value = String(step || "");
            input.placeholder = "Add an evidence step";
            input.addEventListener("input", () => {
                state[standardCode][index] = input.value;
                writeEvidenceStepsMap(email, projectId, state);
            });

            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "evidence-step-remove";
            removeButton.textContent = "Remove";
            removeButton.addEventListener("click", () => {
                state[standardCode].splice(index, 1);
                if (!state[standardCode].length) {
                    state[standardCode].push("");
                }
                writeEvidenceStepsMap(email, projectId, state);
                renderStepRows(rowsHost, standardCode);
            });

            row.append(check, input, removeButton);
            rowsHost.appendChild(row);
        });
    };

    sidebar.innerHTML = `
        <header class="evidence-sidebar-header">
            <h2>Evidence Steps</h2>
            <button type="button" class="detail-action detail-action-secondary" id="evidence-sidebar-close">Close</button>
        </header>
        <p class="evidence-sidebar-copy">List the steps you will use as evidence for your allocated standard(s).</p>
        <div class="evidence-standard-list" id="evidence-standard-list"></div>
    `;

    const standardsHost = sidebar.querySelector("#evidence-standard-list");
    standards.forEach((code) => {
        const block = document.createElement("section");
        block.className = "evidence-standard-block";
        block.innerHTML = `
            <h3>Standard ${escapeHtml(code)}</h3>
            <div class="evidence-step-list" id="evidence-step-list-${escapeHtml(code)}"></div>
            <button type="button" class="detail-action detail-action-secondary evidence-step-add">Add Step</button>
        `;

        const rowsHost = block.querySelector(`#evidence-step-list-${code}`);
        const addButton = block.querySelector(".evidence-step-add");
        if (addButton) {
            addButton.addEventListener("click", () => {
                state[code].push("");
                writeEvidenceStepsMap(email, projectId, state);
                renderStepRows(rowsHost, code);
            });
        }

        renderStepRows(rowsHost, code);
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

function renderDetailView(host, id, data, canEdit) {
    const isAssessmentTask = String(data?.activityCategory || "").toLowerCase().includes("assessment");
    const cardUrl = toSafeExternalUrl(data?.cardUrl);
    const resolvedTasksList = (() => {
        const fromTasksList = coerceArray(data?.tasksList);
        if (fromTasksList.length) {
            return fromTasksList;
        }
        return coerceArray(data?.assessmentFocus ?? data?.assessment_focus ?? data?.assessmentFocusRaw);
    })();

    host.innerHTML = `
        <header class="toolbar">
            <span class="toolbar-label">${isAssessmentTask ? "Assessment Task Details" : "Activity"}</span>
            <div class="toolbar-actions">
                ${canEdit ? '<button type="button" class="detail-action" id="detail-edit-button">Edit Details</button>' : ""}
                ${canEdit ? '<button type="button" class="detail-action detail-action-danger" id="detail-delete-button">Delete</button>' : ""}
                <a href="../index.html">Back to Hub</a>
            </div>
        </header>

        <section class="hero">
            <div class="hero-copy">
                <h1>${escapeHtml(data.title)}</h1>
                <div class="pills">
                    <span class="pill">${escapeHtml(data.yearLevel)}</span>
                    <span class="pill">${escapeHtml(data.type)}</span>
                    <span class="pill">${escapeHtml(data.duration)}</span>
                </div>
                <p>${escapeHtml(data.summary)}</p>
            </div>
            <div class="hero-image">
                <img src="${escapeHtml(data.image)}" alt="${escapeHtml(data.title)} project image" loading="lazy">
            </div>
        </section>

        <section class="proposal-details">
            ${data.startDate ? `<div class="detail-row"><strong>EST. Start Date:</strong> <span>${escapeHtml(data.startDate)}</span></div>` : ""}
        </section>

        ${
            isAssessmentTask && data.summary ? `
            <section class="proposal-section">
                <h2>Short Description</h2>
                <p>${escapeHtml(data.summary)}</p>
            </section>
            ` : ""
        }

        ${
            isAssessmentTask && resolvedTasksList.length ? `
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
                const hasProjectProposalFields = Boolean(
                    data?.startDate ||
                    data?.contactName ||
                    data?.contactPhone ||
                    data?.contactEmail ||
                    data?.company ||
                    data?.address ||
                    data?.withdrawalDate ||
                    data?.clientId ||
                    (Array.isArray(data?.overview) && data.overview.length) ||
                    (Array.isArray(data?.services) && data.services.length) ||
                    (Array.isArray(data?.costs) && data.costs.length) ||
                    (Array.isArray(data?.outcomes) && data.outcomes.length)
                );

                let targetPage = "../upload-activity.html";
                if (category.includes("assessment")) {
                    targetPage = "../upload-assessment.html";
                } else if (category.includes("project") || hasProjectProposalFields) {
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
        outcome_image_url: draft.image,
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

function renderEditForm(host, id, data) {
    const formId = `detail-edit-form-${id}`;

    host.innerHTML = `
        <header class="toolbar">
            <span class="toolbar-label">Edit Project</span>
            <div class="toolbar-actions">
                <a href="../index.html">Back to Hub</a>
            </div>
        </header>

        <form id="${formId}" class="detail-form" novalidate>
            <fieldset class="detail-form-section">
                <legend>Project Basics</legend>
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
            achieved: parseLines(formData.get("achieved")),
            merit: parseLines(formData.get("merit")),
            excellence: parseLines(formData.get("excellence")),
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
    const isTeacher = await canEditDetails();

    document.title = `${resolvedData.title} | Computer Lab`;

    // Show Edit/Delete buttons if user is a teacher or admin
    renderDetailView(host, id, resolvedData, isTeacher);

    // Load interest section only for backend-stored items (numeric IDs)
    if (String(id).match(/^\d+$/)) {
        await loadAndRenderInterestSection(host, id, isTeacher, resolvedData);
    }
}

async function loadAndRenderInterestSection(host, projectId, isTeacher, detailData) {
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
    }

    // Teachers see the full list of interested students
    if (isTeacher && interestData.emails.length > 0) {
        html += `<div class="interest-student-list"><h3>Interested Students</h3>`;
        html += `<table class="interest-table"><thead><tr><th>Student Email</th><th>Status</th><th>Action</th></tr></thead><tbody>`;
        for (const studentEmail of interestData.emails) {
            const isConfirmed = interestData.confirmed.includes(studentEmail);
            const statusBadge = isConfirmed
                ? `<span class="interest-status interest-confirmed">Confirmed</span>`
                : `<span class="interest-status interest-pending">Pending</span>`;
            const confirmBtnText = isConfirmed ? "Unconfirm" : "Confirm";
            html += `<tr data-student="${escapeHtml(studentEmail)}"><td>${escapeHtml(studentEmail)}</td><td>${statusBadge}</td><td><button type="button" class="detail-action interest-confirm-btn" data-confirmed="${isConfirmed}">${confirmBtnText}</button></td></tr>`;
        }
        html += `</tbody></table></div>`;
    } else if (isTeacher && interestData.count === 0) {
        html += `<p class="interest-no-students">No students have registered interest yet.</p>`;
    }

    section.innerHTML = html;
    host.appendChild(section);

    if (!isTeacher && isAssessmentTask && email) {
        const myAllocation = interestData?.my_allocation || null;
        const assignedStandards = [
            toStandardCode(myAllocation?.standard_1),
            toStandardCode(myAllocation?.standard_2)
        ].filter((code) => EVIDENCE_STEPS_TARGET_STANDARDS.has(code));

        if (assignedStandards.length) {
            renderEvidenceSidebar({
                host,
                email,
                projectId,
                standards: Array.from(new Set(assignedStandards))
            });
        }
    }

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
