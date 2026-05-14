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

    const toArray = (value) => Array.isArray(value) ? value : [];

    return {
        id: found.id || activityId,
        title: found.name || "Uploaded Activity",
        yearLevel: found.year_level || "Year level",
        type: found.type || "Digital Learning",
            duration: `${normalizeDurationMinutes(found)} mins`,
        term: found.term || "Term 2",
        activityCategory: found.activity_category || "Practice",
            showInThisWeek: Boolean(found.show_in_this_week ?? found.show_this_week ?? found.is_pinned ?? found.is_this_week),
        summary: found.description || "",
        resources: toArray(found.resources),
        equipment: toArray(found.equipment),
        instructions: toArray(found.instructions),
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
        clientId: found.client_id || ""
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
    return {
        id,
        title: String(data?.title || "").trim() || "Activity",
        yearLevel: String(data?.yearLevel || "").trim() || "Year level",
        type: String(data?.type || "").trim() || "Digital Learning",
        duration: String(data?.duration || "120 mins").trim() || "120 mins",
        term: String(data?.term || "Term 2").trim() || "Term 2",
        activityCategory: String(data?.activityCategory || "Practice").trim() || "Practice",
        showInThisWeek: Boolean(data?.showInThisWeek),
        summary: String(data?.summary || "").trim(),
        resources: Array.isArray(data?.resources) ? data.resources : [],
        equipment: Array.isArray(data?.equipment) ? data.equipment : [],
        instructions: Array.isArray(data?.instructions) ? data.instructions : [],
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
        clientId: String(data?.clientId || "").trim()
    };
}

function renderDetailView(host, id, data, canEdit) {
    host.innerHTML = `
        <header class="toolbar">
            <span class="toolbar-label">Project Details</span>
            <div class="toolbar-actions">
                ${canEdit ? '<button type="button" class="detail-action" id="detail-edit-button">Edit Details</button>' : ""}
                ${canEdit ? '<button type="button" class="detail-action detail-action-danger" id="detail-delete-button">Delete</button>' : ""}
                <a href="../index.html">Back to Hub</a>
            </div>
        </header>

        <section class="hero">
            <div class="hero-copy">
                <p class="kicker">Project Proposal</p>
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
            data.resources.length || data.equipment.length || data.instructions.length ? `
            <section class="grid">
                ${data.resources.length ? `<article class="card">
                    <h2>Resources</h2>
                    <p class="sub">Materials needed.</p>
                    <ul class="list">${renderList(data.resources)}</ul>
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

                const isProject = category.includes("project") || hasProjectProposalFields;
                const targetPage = isProject ? "../upload-project.html" : "../upload-activity.html";
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
    const payload = {
        id,
        name: draft.title,
        year_level: draft.yearLevel,
        type: draft.type,
        activity_category: draft.activityCategory,
        duration_minutes: parseDurationMinutes(draft.durationMinutes),
        outcome_image_url: draft.image,
        description: draft.summary,
        resources: draft.resources,
        equipment: draft.equipment,
        instructions: draft.instructions,
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
        client_id: draft.clientId
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
        activityCategory: result.activity_category || draft.activityCategory,
        showInThisWeek: Boolean(result.show_in_this_week),
        summary: result.description || draft.summary,
        resources: Array.isArray(result.resources) ? result.resources : draft.resources,
        equipment: Array.isArray(result.equipment) ? result.equipment : draft.equipment,
        instructions: Array.isArray(result.instructions) ? result.instructions : draft.instructions,
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
        clientId: result.client_id || draft.clientId
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
                        <input name="activityCategory" type="text" value="${escapeHtml(data.activityCategory || "Practice")}">
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
                    <label class="detail-field detail-field-full">
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

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const draft = {
            title: String(formData.get("title") || "").trim(),
            yearLevel: String(formData.get("yearLevel") || "").trim(),
            type: String(formData.get("type") || "").trim(),
            durationMinutes: String(formData.get("durationMinutes") || "").trim(),
            term: String(formData.get("term") || "").trim() || "Term 2",
            activityCategory: String(formData.get("activityCategory") || "").trim() || "Practice",
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
            clientId: String(formData.get("clientId") || "").trim()
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
        await loadAndRenderInterestSection(host, id, isTeacher);
    }
}

async function loadAndRenderInterestSection(host, projectId, isTeacher) {
    const email = readStoredHubEmail();

    const fetchHeaders = {};
    if (email) fetchHeaders["x-user-email"] = email;

    let interestData = { count: 0, my_interest: false, emails: [], confirmed: [] };
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
            ? "1 student is interested in this project."
            : `${interestData.count} students are interested in this project.`;

    let html = `<h2>Student Interest</h2><p class="interest-count" id="interest-count-text">${countText}</p>`;

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
                                ? "1 student is interested in this project."
                                : `${c} students are interested in this project.`;
                    }
                }
            } catch (_err) {}
            toggleBtn.disabled = false;
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
