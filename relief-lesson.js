const lessonStatus = document.querySelector("#relief-lesson-status");
const lessonContent = document.querySelector("#relief-lesson-content");
const lessonPrintButton = document.querySelector("#relief-lesson-print");

lessonPrintButton?.addEventListener("click", () => {
    window.print();
});

function reliefAuthHeaders() {
    try {
        const raw = localStorage.getItem("hub_google_auth_v1") || sessionStorage.getItem("hub_google_auth_v1");
        const auth = raw ? JSON.parse(raw) : {};
        const headers = { "x-user-email": String(auth?.profile?.email || "").trim().toLowerCase() };
        const token = String(auth?.idToken || "").trim();
        if (token.startsWith("eyJ") && token.split(".").length === 3) headers.Authorization = `Bearer ${token}`;
        return headers;
    } catch (_error) {
        return {};
    }
}

function setText(id, value) {
    const element = document.querySelector(`#${id}`);
    if (element) element.textContent = String(value || "Not provided");
}

function renderLesson(lesson, courseCode) {
    const plan = lesson.lesson_plan && typeof lesson.lesson_plan === "object" ? lesson.lesson_plan : {};
    setText("relief-lesson-title", lesson.lesson_title || lesson.activity_name);
    setText("relief-lesson-course", courseCode);
    setText("relief-lesson-unit", plan.unit || lesson.lesson_title);
    setText("relief-lesson-component", plan.component || lesson.lesson_type);
    setText("relief-lesson-theme", plan.theme);
    setText("relief-lesson-date", lesson.lesson_date);
    setText("relief-lesson-aim", plan.aim || lesson.lesson_focus);
    setText("relief-lesson-resources", plan.resources);
    setText("relief-lesson-preparation", plan.preparation);
    setText("relief-lesson-safety", plan.healthSafety);
    setText("relief-lesson-starter", plan.starter);
    setText("relief-lesson-demonstration", plan.demonstration);
    setText("relief-lesson-practice", plan.practice);
    setText("relief-lesson-plenary", plan.plenary);
    setText("relief-lesson-homework", plan.homework);
    setText("relief-lesson-evaluation", plan.evaluation);
    lessonContent.hidden = false;
}

async function loadReliefLesson() {
    const params = new URLSearchParams(window.location.search);
    const courseCode = String(params.get("course") || "JDTECH").trim().toUpperCase();
    const eventTitle = String(params.get("event") || "").trim();
    const eventDate = String(params.get("date") || "").trim();
    try {
        const response = await fetch(`/api/relief-lessons/${encodeURIComponent(courseCode)}`, { headers: reliefAuthHeaders() });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Could not load Relief Lessons.");
        const lesson = Array.isArray(data.lessons) ? data.lessons[0] : null;
        if (!lesson) {
            renderLesson({
                lesson_title: eventTitle || `Relief Lesson - ${courseCode}`,
                lesson_year_level: courseCode,
                lesson_date: eventDate,
                lesson_type: "Technology",
                lesson_plan: {
                    unit: eventTitle || "Relief Lesson",
                    component: "Technology"
                }
            }, courseCode);
            lessonStatus.textContent = "Blank lesson plan ready for this class and event. Complete it through Upload Relief Lesson to save it to the database.";
            return;
        }
        renderLesson(lesson, courseCode);
        lessonStatus.hidden = true;
    } catch (error) {
        lessonStatus.textContent = error.message;
    }
}

loadReliefLesson();
