const form = document.querySelector("#upload-unit-form");
const lessonList = document.querySelector("#lesson-list");
const addLessonButton = document.querySelector("#add-lesson");
const uploadStatus = document.querySelector("#upload-status");
const authStatusElement = document.querySelector("#unit-auth-status");
const cancelButton = document.querySelector("#cancel-upload");
const clearFormButton = document.querySelector("#clear-draft");

const UPLOAD_HUB_AUTH_STORAGE_KEY = "hub_google_auth_v1";

function slugify(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function getSignedInEmail() {
    const raw = getHubStoredAuthRaw();
    if (!raw) {
        return "";
    }

    try {
        const data = JSON.parse(raw);
        return normalizeEmail(data?.profile?.email || "");
    } catch (_error) {
        return "";
    }
}

function parseArray(value) {
    if (Array.isArray(value)) {
        return value.map((line) => String(line || "").trim()).filter(Boolean);
    }

    return String(value || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
}

function getHubStoredAuthRaw() {
    try {
        return localStorage.getItem(UPLOAD_HUB_AUTH_STORAGE_KEY) || sessionStorage.getItem(UPLOAD_HUB_AUTH_STORAGE_KEY) || "";
    } catch (_error) {
        return "";
    }
}

function withUserEmailHeader(headers = {}) {
    const auth = getHubStoredAuthRaw();
    if (!auth) {
        return headers;
    }

    try {
        const data = JSON.parse(auth);
        const email = normalizeEmail(data?.profile?.email || "");
        if (email) {
            return { ...headers, "x-user-email": email };
        }
    } catch (_error) {
        return headers;
    }

    return headers;
}

function setStatus(message, isError = false) {
    if (!uploadStatus) {
        return;
    }

    if (!message) {
        uploadStatus.hidden = true;
        uploadStatus.textContent = "";
        uploadStatus.classList.remove("is-success", "is-error");
        return;
    }

    uploadStatus.hidden = false;
    uploadStatus.textContent = message;
    uploadStatus.classList.remove("is-success", "is-error");
    uploadStatus.classList.add(isError ? "is-error" : "is-success");
}

function renderAuthStatus() {
    if (!authStatusElement) {
        return;
    }

    const auth = getHubStoredAuthRaw();
    if (!auth) {
        authStatusElement.classList.add("is-missing");
        authStatusElement.textContent = "Not signed in. Sign in with your school Google account before saving a unit plan.";
        return;
    }

    try {
        const data = JSON.parse(auth);
        authStatusElement.classList.remove("is-missing");
        authStatusElement.textContent = `Signed in as ${data?.profile?.email || "staff member"}`;
    } catch (_error) {
        authStatusElement.classList.add("is-missing");
        authStatusElement.textContent = "Not signed in. Sign in with your school Google account before saving a unit plan.";
    }
}

function getEditingUnitPlanId() {
    const params = new URLSearchParams(window.location.search);
    return String(params.get("id") || "").trim();
}

function createLessonRow(lesson = {}) {
    const row = document.createElement("div");
    row.className = "lesson-row";
    row.dataset.lessonRow = "true";

    row.innerHTML = `
        <div class="lesson-row-header">
            <div>
                <p class="section-kicker">Lesson <span data-lesson-number></span></p>
                <h3>Lesson details</h3>
            </div>
            <button type="button" class="button button-secondary lesson-remove">Remove</button>
        </div>
        <div class="lesson-row-grid">
            <div class="field">
                <label>Lesson Title</label>
                <input name="lessonTitle" type="text" placeholder="Lesson title" required>
            </div>
            <div class="field">
                <label>Week / Session</label>
                <input name="lessonWeek" type="text" placeholder="Week 1, Session 2">
            </div>
            <div class="field">
                <label>Calendar Date</label>
                <input name="lessonDate" type="date">
            </div>
            <div class="field">
                <label>Duration Minutes</label>
                <input name="lessonDurationMinutes" type="number" min="1" step="1" value="60">
            </div>
            <div class="field">
                <label>Activity Type</label>
                <input name="lessonType" type="text" placeholder="Programming, Digital Media, ...">
            </div>
            <div class="field">
                <label>Card Colour</label>
                <select name="lessonCardColor">
                    <option>Rose</option>
                    <option>Violet</option>
                    <option>Azure</option>
                    <option>Amber</option>
                    <option>Teal</option>
                    <option>Slate</option>
                </select>
            </div>
            <div class="field field-wide">
                <label>Activity Name</label>
                <input name="activityName" type="text" placeholder="Card title for the Activity Library">
            </div>
            <div class="field field-wide">
                <label>Lesson Focus</label>
                <textarea name="lessonFocus" placeholder="What are students learning or doing?"></textarea>
            </div>
            <div class="field field-wide">
                <label>Lesson Notes</label>
                <textarea name="lessonNotes" placeholder="Teacher notes, resources, or setup reminders"></textarea>
            </div>
            <label class="checkbox-field lesson-toggle"><input name="publishActivity" type="checkbox"> Publish to Activity Library</label>
            <label class="checkbox-field lesson-toggle"><input name="addToCalendar" type="checkbox"> Add to Calendar</label>
        </div>
    `;

    const lessonTitle = row.querySelector('[name="lessonTitle"]');
    const lessonWeek = row.querySelector('[name="lessonWeek"]');
    const lessonDate = row.querySelector('[name="lessonDate"]');
    const lessonDurationMinutes = row.querySelector('[name="lessonDurationMinutes"]');
    const lessonType = row.querySelector('[name="lessonType"]');
    const lessonCardColor = row.querySelector('[name="lessonCardColor"]');
    const activityName = row.querySelector('[name="activityName"]');
    const lessonFocus = row.querySelector('[name="lessonFocus"]');
    const lessonNotes = row.querySelector('[name="lessonNotes"]');
    const publishActivity = row.querySelector('[name="publishActivity"]');
    const addToCalendar = row.querySelector('[name="addToCalendar"]');

    lessonTitle.value = String(lesson.lessonTitle || lesson.title || "").trim();
    lessonWeek.value = String(lesson.lessonWeek || lesson.week_label || lesson.week || "").trim();
    lessonDate.value = String(lesson.lessonDate || lesson.calendar_date || "").trim();
    lessonDurationMinutes.value = String(lesson.lessonDurationMinutes || lesson.duration_minutes || 60).trim();
    lessonType.value = String(lesson.lessonType || lesson.activity_type || "").trim();
    lessonCardColor.value = String(lesson.lessonCardColor || lesson.card_color || "Rose").trim() || "Rose";
    activityName.value = String(lesson.activityName || lesson.activity_name || "").trim();
    lessonFocus.value = String(lesson.lessonFocus || lesson.focus || "").trim();
    lessonNotes.value = String(lesson.lessonNotes || lesson.notes || "").trim();
    publishActivity.checked = Boolean(lesson.publishActivity ?? lesson.publish_activity);
    addToCalendar.checked = Boolean(lesson.addToCalendar ?? lesson.add_to_calendar);

    row.querySelector(".lesson-remove").addEventListener("click", () => {
        row.remove();
        if (!lessonList.querySelector("[data-lesson-row]")) {
            lessonList.appendChild(createLessonRow());
        }
        renumberLessons();
    });

    return row;
}

function renumberLessons() {
    const rows = Array.from(lessonList.querySelectorAll("[data-lesson-row]"));
    rows.forEach((row, index) => {
        const number = row.querySelector("[data-lesson-number]");
        if (number) {
            number.textContent = String(index + 1);
        }
    });
}

function collectLessons() {
    return Array.from(lessonList.querySelectorAll("[data-lesson-row]")).map((row, index) => ({
        lesson_index: index + 1,
        lessonTitle: String(row.querySelector('[name="lessonTitle"]')?.value || "").trim(),
        lessonWeek: String(row.querySelector('[name="lessonWeek"]')?.value || "").trim(),
        lessonDate: String(row.querySelector('[name="lessonDate"]')?.value || "").trim(),
        lessonDurationMinutes: Number.parseInt(row.querySelector('[name="lessonDurationMinutes"]')?.value || "60", 10) || 60,
        lessonType: String(row.querySelector('[name="lessonType"]')?.value || "").trim(),
        lessonCardColor: String(row.querySelector('[name="lessonCardColor"]')?.value || "Rose").trim() || "Rose",
        activityName: String(row.querySelector('[name="activityName"]')?.value || "").trim(),
        lessonFocus: String(row.querySelector('[name="lessonFocus"]')?.value || "").trim(),
        lessonNotes: String(row.querySelector('[name="lessonNotes"]')?.value || "").trim(),
        publishActivity: Boolean(row.querySelector('[name="publishActivity"]')?.checked),
        addToCalendar: Boolean(row.querySelector('[name="addToCalendar"]')?.checked)
    })).filter((lesson) => Boolean(lesson.lessonTitle || lesson.activityName || lesson.lessonFocus || lesson.lessonWeek || lesson.lessonDate));
}

function populateFormFromPlan(data) {
    if (!form || !data) {
        return;
    }

    form.unitTitle.value = String(data.title || "").trim();
    form.topic.value = String(data.topic || "").trim();
    form.strand.value = String(data.strand || "").trim();
    form.yearLevel.value = String(data.year_level || "").trim();
    form.term.value = String(data.term || "").trim();
    form.durationWeeks.value = String(data.duration_weeks || 1).trim();
    form.subjectStream.value = String(data.subject_stream || "").trim();
    form.unitOverview.value = String(data.overview || "").trim();
    form.unitAims.value = parseArray(data.unit_aims || data.aims).join("\n");
    form.unitValues.value = parseArray(data.unit_values).join("\n");
    form.unitContexts.value = parseArray(data.contexts).join("\n");
    form.curriculumLinks.value = parseArray(data.curriculum_links).join("\n");
    form.assessmentLink.value = String(data.assessment_link || "").trim();
    form.unitNotes.value = String(data.notes || "").trim();

    lessonList.innerHTML = "";
    const lessons = Array.isArray(data.lessons) ? data.lessons : [];
    if (!lessons.length) {
        lessonList.appendChild(createLessonRow());
    } else {
        lessons.forEach((lesson) => lessonList.appendChild(createLessonRow(lesson)));
    }

    renumberLessons();
}

async function prefillIfEditing() {
    const editingId = getEditingUnitPlanId();
    if (!editingId) {
        return;
    }

    try {
        const response = await fetch(`/api/unit-plans/${encodeURIComponent(editingId)}`);
        if (!response.ok) {
            return;
        }
        const data = await response.json();
        populateFormFromPlan(data);
        setStatus("Loaded existing unit plan for editing.");
    } catch (_error) {
        // Leave the form editable.
    }
}

function buildUnitPayload() {
    const editingId = getEditingUnitPlanId();
    const lessons = collectLessons();

    return {
        id: editingId || slugify(form.unitTitle.value),
        title: String(form.unitTitle.value || "").trim(),
        topic: String(form.topic.value || "").trim(),
        strand: String(form.strand.value || "").trim(),
        year_level: String(form.yearLevel.value || "").trim(),
        term: String(form.term.value || "").trim(),
        subject_stream: String(form.subjectStream.value || "").trim().toUpperCase(),
        duration_weeks: Number.parseInt(form.durationWeeks.value || "1", 10) || 1,
        overview: String(form.unitOverview.value || "").trim(),
        unit_aims: parseArray(form.unitAims.value),
        unit_values: parseArray(form.unitValues.value),
        contexts: parseArray(form.unitContexts.value),
        curriculum_links: parseArray(form.curriculumLinks.value),
        assessment_link: String(form.assessmentLink.value || "").trim(),
        notes: String(form.unitNotes.value || "").trim(),
        lessons,
        created_by_email: getSignedInEmail(),
        created_at: new Date().toISOString()
    };
}

async function saveUnitPlan(payload) {
    const response = await fetch("/api/unit-plans", {
        method: "POST",
        headers: withUserEmailHeader({
            "Content-Type": "application/json"
        }),
        body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        if (response.status === 403) {
            throw new Error(result.error || "Teacher/Admin access is required.");
        }
        throw new Error(result.error || `Could not save unit plan (HTTP ${response.status})`);
    }

    return result;
}

async function saveLessonActivity(unitPlan, lesson) {
    const title = String(lesson.activityName || lesson.lessonTitle || unitPlan.title || "Lesson").trim();
    const lessonIndex = Number.parseInt(lesson.lesson_index, 10) || 1;

    const payload = {
        id: `${unitPlan.id}-${lessonIndex}`,
        name: title,
        year_level: unitPlan.year_level,
        type: String(lesson.lessonType || unitPlan.topic || unitPlan.strand || "Unit Activity").trim(),
        activity_category: "Activity",
        duration_minutes: Number.parseInt(lesson.lessonDurationMinutes, 10) || 60,
        difficulty: "Beginner",
        subject_stream: unitPlan.subject_stream,
        card_color: String(lesson.lessonCardColor || "Rose").trim() || "Rose",
        description: String(lesson.lessonFocus || unitPlan.overview || "").trim(),
        resources: [],
        equipment: [],
        instructions: lesson.lessonFocus ? [lesson.lessonFocus] : [],
        class_management_notes: lesson.lessonNotes ? [lesson.lessonNotes] : [],
        class_preparation: [],
        assessment_focus: [],
        term: unitPlan.term || "Term 2",
        show_in_this_week: false,
        time_sensitive: false,
        unit_plan_id: unitPlan.id,
        unit_lesson_index: lessonIndex
    };

    const response = await fetch("/api/activities", {
        method: "POST",
        headers: withUserEmailHeader({
            "Content-Type": "application/json"
        }),
        body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(result.error || `Could not save lesson activity '${title}'`);
    }

    return result;
}

async function saveLessonCalendarEvent(unitPlan, lesson, activityRecord) {
    if (!lesson.lessonDate) {
        return null;
    }

    const lessonIndex = Number.parseInt(lesson.lesson_index, 10) || 1;
    const title = String(lesson.lessonTitle || lesson.activityName || unitPlan.title || "Lesson").trim();
    const notes = [
        unitPlan.title,
        lesson.lessonWeek ? `Session: ${lesson.lessonWeek}` : "",
        lesson.lessonFocus || "",
        lesson.lessonNotes || ""
    ].filter(Boolean).join("\n\n");

    const payload = {
        title,
        event_type: "Activity",
        start_date: lesson.lessonDate,
        end_date: lesson.lessonDate,
        notes,
        linked_activity_id: activityRecord?.id || "",
        linked_url: "/index.html#project-library",
        unit_plan_id: unitPlan.id,
        lesson_index: lessonIndex,
        user_email: unitPlan.created_by_email
    };

    const response = await fetch("/api/practicals/events", {
        method: "POST",
        headers: withUserEmailHeader({
            "Content-Type": "application/json"
        }),
        body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(result.error || `Could not save calendar event for '${title}'`);
    }

    return result;
}

if (addLessonButton) {
    addLessonButton.addEventListener("click", () => {
        lessonList.appendChild(createLessonRow());
        renumberLessons();
    });
}

if (cancelButton) {
    cancelButton.addEventListener("click", () => {
        window.location.href = "upload-menu.html";
    });
}

if (clearFormButton) {
    clearFormButton.addEventListener("click", () => {
        if (form) {
            form.reset();
            lessonList.innerHTML = "";
            lessonList.appendChild(createLessonRow());
            renumberLessons();
            setStatus("Form cleared.");
        }
    });
}

if (lessonList && !lessonList.querySelector("[data-lesson-row]")) {
    lessonList.appendChild(createLessonRow());
    renumberLessons();
}

renderAuthStatus();
prefillIfEditing();

if (form) {
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const payload = buildUnitPayload();
        if (!payload.title || !payload.topic || !payload.year_level) {
            setStatus("Unit title, topic, and year level are required.", true);
            return;
        }

        try {
            setStatus("Saving unit plan...");
            const savedUnitPlan = await saveUnitPlan(payload);

            let createdActivities = 0;
            let createdEvents = 0;

            for (const lesson of payload.lessons) {
                if (!lesson.lessonTitle && !lesson.activityName) {
                    continue;
                }

                let activityRecord = null;
                if (lesson.publishActivity) {
                    activityRecord = await saveLessonActivity(savedUnitPlan, lesson);
                    createdActivities += 1;
                }

                if (lesson.addToCalendar) {
                    await saveLessonCalendarEvent(savedUnitPlan, lesson, activityRecord);
                    createdEvents += 1;
                }
            }

            setStatus(`Unit plan saved. Created ${createdActivities} activity card${createdActivities === 1 ? "" : "s"} and ${createdEvents} calendar event${createdEvents === 1 ? "" : "s"}.`);
        } catch (error) {
            setStatus(`Save failed: ${error.message}`, true);
        }
    });
}