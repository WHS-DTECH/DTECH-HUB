(() => {
    "use strict";
    const form = document.getElementById("results-form");
    const output = document.getElementById("results-output");
    const status = document.getElementById("results-status");
    const classStatus = document.getElementById("class-progress-status");
    const classTableHost = document.getElementById("class-progress-table-host");
    const courseFilter = document.getElementById("class-course-filter");
    const homeroomFilter = document.getElementById("class-homeroom-filter");
    const studentFilter = document.getElementById("class-student-filter");
    const classTab = document.getElementById("class-progress-tab");
    const studentTab = document.getElementById("student-review-tab");
    const classPanel = document.getElementById("class-progress-panel");
    const studentPanel = document.getElementById("student-review-panel");
    let revision = 0;
    let classRevision = 0;
    let classData = null;
    function node(tag, text, parent, className) {
        const element = document.createElement(tag);
        if (text !== undefined) element.textContent = text;
        if (className) element.className = className;
        if (parent) parent.append(element);
        return element;
    }
    function date(value) {
        return value ? new Date(value).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland" }) : "Not recorded";
    }
    function adminHeaders() {
        const raw = localStorage.getItem("hub_google_auth_v1") || sessionStorage.getItem("hub_google_auth_v1") || "";
        const auth = raw ? JSON.parse(raw) : null;
        if (!auth?.profile?.email) throw new Error("Sign in with your admin school account first.");
        const headers = { "x-user-email": auth.profile.email };
        const token = auth.idToken || auth.accessToken || "";
        if (token.startsWith("eyJ") && token.split(".").length === 3) headers.Authorization = `Bearer ${token}`;
        return headers;
    }
    function courseKey(value) {
        const key = String(value || "").replace(/\s+/g, "").toLowerCase();
        return key === "juniordtech" ? "JuniorDTECH"
            : key === "middledtech" ? "MiddleDTECH"
                : key === "seniordtech" ? "SeniorDTECH" : "";
    }
    function courseLabel(value) {
        const key = courseKey(value);
        return key === "JuniorDTECH" ? "Junior DTECH" : key || "Not assigned";
    }
    function renderClassProgress() {
        if (!classData || !classTableHost) return;
        const selectedCourse = courseFilter.value;
        const selectedHomeroom = homeroomFilter.value;
        const query = studentFilter.value.trim().toLowerCase();
        const students = classData.students.filter((student) =>
            (!selectedCourse || courseKey(student.course) === selectedCourse)
            && (!selectedHomeroom || student.homeroom === selectedHomeroom)
            && (!query || `${student.name} ${student.email}`.toLowerCase().includes(query)))
            .sort((a, b) => a.name.localeCompare(b.name));
        classTableHost.replaceChildren();
        if (!students.length) {
            node("p", "No students match these filters.", classTableHost);
            classStatus.textContent = `No students match these filters. ${classData.students.length} students and ${classData.kits.length} active kits are available.`;
            return;
        }
        const table = node("table", undefined, classTableHost, "class-progress-table");
        const head = node("thead", undefined, table);
        const header = node("tr", undefined, head);
        ["Student", "Homeroom", "Course", ...classData.kits.map((kit) => kit.title)].forEach((label) => {
            node("th", label, header);
        });
        const body = node("tbody", undefined, table);
        for (const student of students) {
            const row = node("tr", undefined, body);
            node("th", student.name, row);
            node("td", student.homeroom || "Not recorded", row);
            node("td", courseLabel(student.course), row);
            for (const kit of classData.kits) {
                const progress = student.kitProgress?.[kit.id];
                const cell = node("td", undefined, row, progress?.completed ? "class-progress-complete" : "class-progress-incomplete");
                cell.textContent = progress?.completed ? "Complete" : progress?.started ? "In progress" : "Not started";
                if (progress?.completedAt) cell.title = `Completed ${date(progress.completedAt)}`;
            }
        }
        classStatus.classList.remove("is-error");
        classStatus.textContent = `Showing ${students.length} of ${classData.students.length} students and ${classData.kits.length} active kits. Read at ${date(classData.reviewedAt)}.`;
    }
    function populateHomerooms(students) {
        const previous = homeroomFilter.value;
        homeroomFilter.replaceChildren(new Option("All homerooms", ""));
        [...new Set(students.map((student) => String(student.homeroom || "").trim()).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b))
            .forEach((homeroom) => homeroomFilter.add(new Option(homeroom, homeroom)));
        homeroomFilter.value = [...homeroomFilter.options].some((option) => option.value === previous) ? previous : "";
    }
    async function loadClassProgress() {
        const current = ++classRevision;
        classStatus.classList.remove("is-error");
        classStatus.textContent = "Loading students and kit completion...";
        classTableHost.replaceChildren();
        try {
            const headers = adminHeaders();
            const [usersResponse, progressResponse] = await Promise.all([
                fetch("/api/admin/practical-skills/preview-users", { headers, cache: "no-store" }),
                fetch("/api/admin/kit-class-progress", { headers, cache: "no-store" })
            ]);
            const [users, progress] = await Promise.all([usersResponse.json(), progressResponse.json()]);
            if (!usersResponse.ok) throw new Error(users.error || `Could not load students (${usersResponse.status}).`);
            if (!progressResponse.ok) throw new Error(progress.error || `Could not load kit progress (${progressResponse.status}).`);
            if (current !== classRevision) return;
            const profiles = new Map((users.users || []).filter((user) => user.type === "Student")
                .map((user) => [String(user.email || "").toLowerCase(), user]));
            classData = {
                reviewedAt: progress.reviewedAt,
                kits: Array.isArray(progress.kits) ? progress.kits : [],
                students: (Array.isArray(progress.students) ? progress.students : []).map((student) => {
                    const profile = profiles.get(String(student.email || "").toLowerCase()) || {};
                    return { ...student, name: profile.name || student.name || student.email,
                        homeroom: profile.homeroom || student.homeroom || "",
                        course: profile.course || student.course || "" };
                })
            };
            populateHomerooms(classData.students);
            renderClassProgress();
        } catch (error) {
            if (current !== classRevision) return;
            classStatus.textContent = error.message || "Could not load class kit progress.";
            classStatus.classList.add("is-error");
        }
    }
    function selectTab(selected) {
        const showClass = selected === classTab;
        classTab.setAttribute("aria-selected", String(showClass));
        studentTab.setAttribute("aria-selected", String(!showClass));
        classTab.tabIndex = showClass ? 0 : -1;
        studentTab.tabIndex = showClass ? -1 : 0;
        classPanel.hidden = !showClass;
        studentPanel.hidden = showClass;
        if (showClass && !classData) void loadClassProgress();
    }
    [classTab, studentTab].forEach((tab) => tab.addEventListener("click", () => selectTab(tab)));
    document.querySelector(".teacher-results-tabs").addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const selected = event.key === "Home" || event.key === "ArrowLeft" && studentTab.getAttribute("aria-selected") === "true"
            || event.key === "ArrowRight" && classTab.getAttribute("aria-selected") === "true" ? classTab : studentTab;
        selectTab(selected);
        selected.focus();
    });
    document.getElementById("class-progress-refresh").addEventListener("click", loadClassProgress);
    [courseFilter, homeroomFilter].forEach((filter) => filter.addEventListener("change", renderClassProgress));
    studentFilter.addEventListener("input", renderClassProgress);
    void loadClassProgress();
    function values(value, parent) {
        if (value && typeof value === "object") {
            const list = node("ul", undefined, parent, "results-tree");
            for (const [key, entry] of Object.entries(value)) {
                const item = node("li", undefined, list);
                node("strong", `${key}: `, item);
                values(entry, item);
            }
            if (!Object.keys(value).length) node("li", "No saved values", list);
            return;
        }
        const text = String(value ?? "(blank)");
        let url;
        try { url = new URL(text); } catch { url = null; }
        if (url?.protocol === "https:" && !url.username && !url.password) {
            const link = node("a", text, parent);
            link.href = url.href;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
        } else node("span", text, parent, "results-saved");
    }
    function render(data) {
        output.replaceChildren();
        node("h2", data.content.identity?.name || data.content.bannerTitle || data.kitId, output);
        node("p", "A saved completion tick is not teacher verification of the work. Files are not opened or inspected by this report.", output, "results-warning");
        for (const warning of data.warnings) node("p", warning, output, "results-warning");
        const worksheets = data.content.worksheets.filter((worksheet) => worksheet.mergedInto === undefined);
        if (!data.content.activities?.some(Boolean)) node("p", "This kit has worksheet titles but no configured activity questions or automatic checks. Students can mark its activities complete manually.", output, "results-warning");
        for (const student of data.students) {
            const card = node("details", undefined, output, "sites-card");
            const progress = student.progress;
            node("summary", `${student.email} - ${progress ? (progress.completed ? "Recorded complete" : "Not recorded complete") : "No saved progress"}`, card);
            if (!progress) continue;
            node("p", `Started: ${date(progress.started_at)} | Completed: ${date(progress.completed_at)} | Certificate email recorded: ${date(progress.certificate_emailed_at)}`, card);
            for (const worksheet of worksheets) {
                const index = data.content.worksheets.indexOf(worksheet);
                const activity = data.content.activities?.[index];
                const section = node("section", undefined, card, "results-activity");
                node("h3", `${index + 1}. ${worksheet.activity}`, section);
                node("p", `Tick: ${date(progress.completed_activities?.[index])} | Completion rule: ${activity?.completionMode === "auto" ? "Automatic" : "Manual / specialised activity"}`, section);
                if (activity) {
                    const definition = node("details", undefined, section);
                    node("summary", "Current activity definition", definition);
                    values(activity, definition);
                }
            }
            node("h3", "All saved answers (original response keys)", card);
            values(progress.responses || {}, card);
            node("h3", "Saved document-copy receipts", card);
            values(student.documents, card);
        }
    }
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const current = ++revision;
        const button = form.querySelector("button[type=submit]");
        output.replaceChildren();
        status.classList.remove("is-error");
        status.textContent = "Reading saved records...";
        button.disabled = true;
        try {
            const raw = localStorage.getItem("hub_google_auth_v1") || sessionStorage.getItem("hub_google_auth_v1");
            const auth = raw ? JSON.parse(raw) : null;
            if (!auth?.profile?.email) throw new Error("Sign in with your admin school account first.");
            const headers = { "x-user-email": auth.profile.email };
            const token = auth.idToken || auth.accessToken || "";
            if (token.startsWith("eyJ") && token.split(".").length === 3) headers.Authorization = `Bearer ${token}`;
            const kit = document.getElementById("results-kit").value.trim();
            const emails = document.getElementById("results-emails").value.trim();
            const response = await fetch(`/api/admin/kit-results/${encodeURIComponent(kit)}?emails=${encodeURIComponent(emails)}`, { headers, cache: "no-store" });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || `Could not load results (${response.status}).`);
            if (current !== revision) return;
            render(data);
            status.textContent = `Read ${data.students.length} student records at ${date(data.reviewedAt)}. No records changed.`;
        } catch (error) {
            if (current !== revision) return;
            status.textContent = error.message;
            status.classList.add("is-error");
        } finally {
            button.disabled = false;
        }
    });
    window.addEventListener("hub-auth-state-changed", () => {
        revision += 1;
        classRevision += 1;
        classData = null;
        output.replaceChildren();
        status.textContent = "Sign-in changed. Read the records again with the current admin account.";
        classTableHost.replaceChildren();
        classStatus.textContent = "Sign-in changed. Refresh the class list with the current admin account.";
        classStatus.classList.remove("is-error");
        void loadClassProgress();
    });
})();
