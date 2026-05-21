function setStatus(message, isError = false) {
    const statusDiv = document.querySelector("#status-message");
    if (!statusDiv) {
        return;
    }

    statusDiv.textContent = message;
    statusDiv.className = `upload-status ${isError ? "is-error" : "is-success"}`;
    statusDiv.hidden = false;

    if (!isError) {
        setTimeout(() => {
            statusDiv.hidden = true;
        }, 4000);
    }
}

function getAuthEmail() {
    const authKey = localStorage.getItem("hub_google_auth_v1");
    if (!authKey) {
        return null;
    }

    try {
        const auth = JSON.parse(authKey);
        return String(auth?.email || "").trim() || null;
    } catch {
        return null;
    }
}

function collectLessonPayload() {
    const form = document.querySelector("#lesson-form");
    if (!form) {
        return null;
    }

    const lessonTitle = String(form.querySelector('[name="lessonTitle"]')?.value || "").trim();
    const lessonWeek = String(form.querySelector('[name="lessonWeek"]')?.value || "").trim();
    const lessonDate = String(form.querySelector('[name="lessonDate"]')?.value || "").trim();
    const lessonDurationMinutes = Number.parseInt(form.querySelector('[name="lessonDurationMinutes"]')?.value || "60", 10) || 60;
    const lessonType = String(form.querySelector('[name="lessonType"]')?.value || "").trim();
    const lessonCardColor = String(form.querySelector('[name="lessonCardColor"]')?.value || "Rose").trim();
    const activityName = String(form.querySelector('[name="activityName"]')?.value || "").trim();
    const lessonYearLevel = String(form.querySelector('[name="lessonYearLevel"]')?.value || "").trim();
    const lessonLinkUrl = String(form.querySelector('[name="lessonLinkUrl"]')?.value || "").trim();
    const lessonFocus = String(form.querySelector('[name="lessonFocus"]')?.value || "").trim();
    const lessonNotes = String(form.querySelector('[name="lessonNotes"]')?.value || "").trim();
    const publishActivity = Boolean(form.querySelector('[name="publishActivity"]')?.checked);
    const addToCalendar = Boolean(form.querySelector('[name="addToCalendar"]')?.checked);

    if (!lessonTitle || !lessonType || !activityName || !lessonYearLevel || !lessonFocus) {
        setStatus("Please fill in all required fields.", true);
        return null;
    }

    const lessonId = `lesson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
        id: lessonId,
        lesson_title: lessonTitle,
        lesson_week: lessonWeek,
        lesson_date: lessonDate,
        lesson_duration_minutes: lessonDurationMinutes,
        lesson_type: lessonType,
        lesson_card_color: lessonCardColor,
        activity_name: activityName,
        lesson_year_level: lessonYearLevel,
        lesson_link_url: lessonLinkUrl,
        lesson_focus: lessonFocus,
        lesson_notes: lessonNotes,
        publish_activity: publishActivity,
        add_to_calendar: addToCalendar,
        created_by_email: getAuthEmail() || "unknown@westlandhigh.school.nz",
        created_at: new Date().toISOString()
    };
}

async function saveLessonToServer(payload) {
    if (!payload) {
        return false;
    }

    try {
        const userEmail = getAuthEmail();
        const response = await fetch("/api/lessons", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-user-email": userEmail || ""
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            setStatus(`Error saving lesson: ${errorText}`, true);
            return false;
        }

        const result = await response.json();
        setStatus(`Lesson "${payload.lesson_title}" saved successfully!`);
        return true;
    } catch (error) {
        setStatus(`Error saving lesson: ${String(error?.message || "Unknown error")}`, true);
        console.error("Lesson save error:", error);
        return false;
    }
}

function initializeLessonForm() {
    const form = document.querySelector("#lesson-form");
    const clearButton = document.querySelector("#clear-lesson");

    if (form) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const payload = collectLessonPayload();
            if (payload) {
                const success = await saveLessonToServer(payload);
                if (success) {
                    form.reset();
                }
            }
        });
    }

    if (clearButton) {
        clearButton.addEventListener("click", () => {
            form?.reset();
            setStatus("Form cleared.");
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initializeLessonForm();
});
