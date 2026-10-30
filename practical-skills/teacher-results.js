(() => {
    "use strict";
    const form = document.getElementById("results-form");
    const output = document.getElementById("results-output");
    const status = document.getElementById("results-status");
    const classStatus = document.getElementById("class-progress-status");
    const chocolateStatus = document.getElementById("chocolate-status");
    const refreshButton = document.getElementById("class-progress-refresh");
    const pendingChocolate = new Set();
    const pendingSubmissions = new Set();
    const submissionsHost = document.getElementById("class-submissions-host");
    const submissionStatus = document.getElementById("submission-status") || { classList: { add() {}, remove() {} } };
    const linkParams = new URLSearchParams(window.location.search);
    let pendingLinkFilters = { kit: linkParams.get("kit") || "", student: linkParams.get("student") || "" };
    const classTableHost = document.getElementById("class-progress-table-host");
    const courseFilter = document.getElementById("class-course-filter");
    const whanauFilter = document.getElementById("class-whanau-filter");
    const homeroomFilter = document.getElementById("class-homeroom-filter");
    const studentFilter = document.getElementById("class-student-filter");
    const kitFilter = document.getElementById("class-kit-filter");
    const statusFilter = document.getElementById("class-status-filter");
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
    function adminHeaders(allowAccessToken = false) {
        const raw = localStorage.getItem("hub_google_auth_v1") || sessionStorage.getItem("hub_google_auth_v1") || "";
        const auth = raw ? JSON.parse(raw) : null;
        if (!auth?.profile?.email) throw new Error("Sign in with your admin school account first.");
        const headers = { "x-user-email": auth.profile.email };
        const idToken = String(auth.idToken || "").trim();
        let idTokenLive = false;
        try {
            idTokenLive = idToken.split(".").length === 3 &&
                Number(JSON.parse(atob(idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).exp) * 1000 > Date.now();
        } catch (_error) { idTokenLive = false; }
        const accessToken = allowAccessToken && Number(auth.expiresAt) > Date.now() ? String(auth.accessToken || "").trim() : "";
        const token = idTokenLive ? idToken : accessToken;
        if (token) headers.Authorization = `Bearer ${token}`;
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
    function kitStatus(progress) {
        return progress?.completed ? "completed" : progress?.started ? "in-progress" : "not-started";
    }
    async function saveChocolate(student, kit, checked) {
        const data = classData;
        const key = `${student.email}:${kit.id}`;
        if (pendingChocolate.size) return;
        pendingChocolate.add(key);
        refreshButton.disabled = true;
        chocolateStatus.classList.remove("is-error");
        chocolateStatus.textContent = `Saving Chocolate for ${student.name} - ${kit.title}...`;
        renderClassProgress();
        try {
            const response = await fetch(`/api/admin/kit-chocolate/${encodeURIComponent(kit.id)}`, {
                method: "PUT",
                headers: { ...adminHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ email: student.email, chocolate: checked })
            });
            const saved = await response.json();
            if (!response.ok) throw new Error(saved.error || `Could not save Chocolate (${response.status}).`);
            if (typeof saved.chocolate !== "boolean") throw new Error("The server did not confirm the Chocolate value. Refresh the class list.");
            if (classData !== data) return;
            student.chocolate = { ...student.chocolate, [kit.id]: saved.chocolate };
            chocolateStatus.textContent = `Saved Chocolate: ${saved.chocolate ? "Yes" : "No"} for ${student.name} - ${kit.title}.`;
        } catch (error) {
            if (classData !== data) return;
            chocolateStatus.textContent = `${student.name} - ${kit.title}: ${error.message || "Could not save Chocolate. Refresh the class list before trying again."}`;
            chocolateStatus.classList.add("is-error");
        } finally {
            pendingChocolate.delete(key);
            refreshButton.disabled = pendingChocolate.size > 0;
            if (classData === data) renderClassProgress();
        }
    }
    function filteredStudents() {
        const selectedCourse = courseFilter.value;
        const selectedWhanau = whanauFilter.value;
        const selectedHomeroom = homeroomFilter.value;
        const selectedKit = kitFilter.value;
        const selectedStatus = statusFilter.value;
        const query = studentFilter.value.trim().toLowerCase();
        return classData.students.filter((student) =>
            (!selectedCourse || courseKey(student.course) === selectedCourse)
            && (!selectedWhanau || student.whanau === selectedWhanau)
            && (!selectedHomeroom || student.homeroom === selectedHomeroom)
            && (!selectedKit || !selectedStatus || kitStatus(student.kitProgress?.[selectedKit]) === selectedStatus)
            && (!query || `${student.name} ${student.email}`.toLowerCase().includes(query)))
            .sort((a, b) => a.name.localeCompare(b.name));
    }
    async function saveSubmissionCompleted(student, kit, activity, entry, checked) {
        const data = classData;
        if (pendingSubmissions.size) return;
        const key = `${student.email}:${kit.id}:${activity.index}`;
        pendingSubmissions.add(key);
        submissionStatus.classList.remove("is-error");
        submissionStatus.textContent = `Saving Completed for ${student.name} - ${activity.title}...`;
        renderSubmissions(filteredStudents());
        try {
            const response = await fetch(`/api/admin/kit-document-review/${encodeURIComponent(kit.id)}/${activity.index}`, {
                method: "PUT",
                headers: { ...adminHeaders(true), "Content-Type": "application/json" },
                body: JSON.stringify({ email: student.email, documentKey: entry.documentKey, approved: checked })
            });
            const saved = await response.json();
            if (!response.ok) throw new Error(saved.error || `Could not save Completed (${response.status}).`);
            if (classData !== data) return;
            entry.completed = saved.verification?.passed === true;
            submissionStatus.textContent = saved.kitCompleted && entry.completed
                ? `Ticked Completed for ${student.name} - ${activity.title}. All activities are complete: the kit is marked complete and the certificate is emailed as normal.`
                : `${entry.completed ? "Ticked" : "Removed"} Completed for ${student.name} - ${activity.title}. Refresh the list to update kit completion.`;
        } catch (error) {
            if (classData !== data) return;
            submissionStatus.textContent = `${student.name} - ${activity.title}: ${error.message || "Could not save Completed. Refresh the list before trying again."}`;
            submissionStatus.classList.add("is-error");
        } finally {
            pendingSubmissions.delete(key);
            if (classData === data) renderSubmissions(filteredStudents());
        }
    }
    function renderSubmissions(students) {
        if (!submissionsHost) return;
        submissionsHost.replaceChildren();
        const kits = (classData?.submissions || []).filter((kit) => !kitFilter.value || kit.id === kitFilter.value);
        for (const kit of kits) {
            const title = classData.kits.find((entry) => entry.id === kit.id)?.title || kit.id;
            node("h3", `${title} - Submissions`, submissionsHost);
            if (!students.length) {
                node("p", "No students match these filters.", submissionsHost);
                continue;
            }
            const wrap = node("div", undefined, submissionsHost, "class-progress-table-host");
            const table = node("table", undefined, wrap, "class-progress-table class-submissions-table");
            const header = node("tr", undefined, node("thead", undefined, table));
            ["Student", "Homeroom", ...kit.activities.flatMap((activity) => [activity.title, "Completed"])].forEach((label) => node("th", label, header));
            const body = node("tbody", undefined, table);
            for (const student of students) {
                const row = node("tr", undefined, body);
                node("th", student.name, row);
                node("td", student.homeroom || "Not recorded", row);
                for (const activity of kit.activities) {
                    const entry = kit.students?.[String(student.email || "").toLowerCase()]?.[activity.index];
                    const linkCell = node("td", undefined, row);
                    if (entry?.url) {
                        const link = node("a", `Open ${activity.title}`, linkCell);
                        link.href = entry.url;
                        link.target = "_blank";
                        link.rel = "noopener noreferrer";
                        node("div", entry.submittedAt ? `Submitted ${date(entry.submittedAt)}` : "Link saved, not submitted", linkCell,
                            entry.submittedAt ? "submission-submitted" : "submission-note");
                    } else node("span", "No link", linkCell, "submission-note");
                    const tickCell = node("td", undefined, row, entry?.completed ? "class-progress-complete" : undefined);
                    const label = node("label", undefined, tickCell);
                    const checkbox = node("input", undefined, label);
                    checkbox.type = "checkbox";
                    checkbox.checked = entry?.completed === true;
                    checkbox.disabled = !entry?.documentKey || pendingSubmissions.size > 0;
                    checkbox.setAttribute("aria-label", `Completed for ${student.name} - ${activity.title}`);
                    node("span", checkbox.checked ? " Completed" : " No", label);
                    checkbox.addEventListener("change", () => saveSubmissionCompleted(student, { id: kit.id }, activity, entry, checkbox.checked));
                }
            }
        }
    }
    function renderClassProgress() {
        if (!classData || !classTableHost) return;
        const students = filteredStudents();
        renderSubmissions(students);
        classTableHost.replaceChildren();
        if (!students.length) {
            node("p", "No students match these filters.", classTableHost);
            classStatus.textContent = `No students match these filters. ${classData.students.length} students and ${classData.kits.length} active kits are available.`;
            return;
        }
        const table = node("table", undefined, classTableHost, "class-progress-table");
        const head = node("thead", undefined, table);
        const header = node("tr", undefined, head);
        ["Student", "Whānau", "Homeroom", "Course", ...classData.kits.flatMap((kit) => [kit.title, "Chocolate"])].forEach((label) => {
            node("th", label, header);
        });
        const body = node("tbody", undefined, table);
        for (const student of students) {
            const row = node("tr", undefined, body);
            node("th", student.name, row);
            node("td", student.whanau || "Not recorded", row);
            node("td", student.homeroom || "Not recorded", row);
            node("td", courseLabel(student.course), row);
            for (const kit of classData.kits) {
                const progress = student.kitProgress?.[kit.id];
                const cell = node("td", undefined, row, progress?.completed ? "class-progress-complete" : "class-progress-incomplete");
                cell.textContent = progress?.completed ? "Complete" : progress?.started ? "In progress" : "Not started";
                if (progress?.completedAt) cell.title = `Completed ${date(progress.completedAt)}`;
                const chocolateCell = node("td", undefined, row);
                const label = node("label", undefined, chocolateCell);
                const checkbox = node("input", undefined, label);
                checkbox.type = "checkbox";
                checkbox.checked = student.chocolate?.[kit.id] === true;
                checkbox.disabled = pendingChocolate.size > 0;
                checkbox.setAttribute("aria-label", `Chocolate for ${student.name} - ${kit.title}`);
                node("span", checkbox.checked ? " Yes" : " No", label);
                checkbox.addEventListener("change", () => saveChocolate(student, kit, checkbox.checked));
            }
        }
        classStatus.classList.remove("is-error");
        classStatus.textContent = `Showing ${students.length} of ${classData.students.length} students and ${classData.kits.length} active kits. Read at ${date(classData.reviewedAt)}.`;
    }
    function populateWhanau(students) {
        const previous = whanauFilter.value;
        whanauFilter.replaceChildren(new Option("All whānau", ""));
        [...new Set(students.map((student) => String(student.whanau || "").trim()).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b))
            .forEach((whanau) => whanauFilter.add(new Option(whanau, whanau)));
        whanauFilter.value = [...whanauFilter.options].some((option) => option.value === previous) ? previous : "";
    }
    function updateStatusFilter() {
        statusFilter.disabled = !kitFilter.value;
        if (statusFilter.disabled) statusFilter.value = "";
    }
    function populateKits(kits) {
        const previous = kitFilter.value;
        kitFilter.replaceChildren(new Option("All kits", ""));
        kits.forEach((kit) => kitFilter.add(new Option(kit.title, kit.id)));
        kitFilter.value = kits.some((kit) => kit.id === previous) ? previous : "";
        updateStatusFilter();
    }
    async function loadClassProgress() {
        const current = ++classRevision;
        classStatus.classList.remove("is-error");
        classStatus.textContent = "Loading students and kit completion...";
        classTableHost.replaceChildren();
        submissionsHost?.replaceChildren();
        submissionStatus.classList.remove("is-error");
        submissionStatus.textContent = "";
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
                        whanau: String(profile.homeroom || student.homeroom || "").trim(),
                        homeroom: String(student.timetableClass || "").trim().toUpperCase(),
                        course: student.course || "" };
                })
            };
            populateWhanau(classData.students);
            populateKits(classData.kits);
            if (pendingLinkFilters) {
                if (classData.kits.some((kit) => kit.id === pendingLinkFilters.kit)) {
                    kitFilter.value = pendingLinkFilters.kit;
                    updateStatusFilter();
                }
                if (pendingLinkFilters.student) studentFilter.value = pendingLinkFilters.student;
                pendingLinkFilters = null;
            }
            renderClassProgress();
            const kitIds = classData.kits.map((kit) => kit.id).join(",");
            if (!kitIds) return;
            try {
                const response = await fetch(`/api/admin/kit-submissions?kits=${encodeURIComponent(kitIds)}`, { headers, cache: "no-store" });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || `Could not load submitted links (${response.status}).`);
                if (current !== classRevision) return;
                classData.submissions = Array.isArray(data.kits) ? data.kits : [];
                renderClassProgress();
            } catch (error) {
                if (current !== classRevision) return;
                submissionStatus.textContent = error.message || "Could not load submitted links.";
                submissionStatus.classList.add("is-error");
            }
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
    [courseFilter, whanauFilter, homeroomFilter, statusFilter].forEach((filter) => filter.addEventListener("change", renderClassProgress));
    kitFilter.addEventListener("change", () => {
        updateStatusFilter();
        renderClassProgress();
    });
    studentFilter.addEventListener("input", renderClassProgress);
    if (/^kit-[a-z0-9-]+$/.test(pendingLinkFilters.kit) && pendingLinkFilters.student) {
        document.getElementById("results-kit").value = pendingLinkFilters.kit;
        document.getElementById("results-emails").value = pendingLinkFilters.student;
    }
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
    function renderDocumentReview(parent, kit, index, email, tick, drawing = false) {
        const section = node("section", undefined, parent, "sites-card");
        node("h4", drawing ? "Google Drawing - teacher Completed tick" : "Rattlesnakes text completion", section);
        node("p", drawing
            ? "Open the current submitted drawing and review it before ticking Completed. Check that it resembles the reference picture and is built from filled Insert > Shape objects, not only lines or pasted pictures. Only your tick completes this activity. You can also tick Completed in the Submissions list on the Class Kit Progress tab."
            : "Open the current submitted document and review its text before approving. This approval replaces the automatic text check only; it does not bypass other required blocks or the different-document rule.", section);
        const linkHost = node("p", undefined, section);
        const feedback = node("p", "Reading the current link and saved check...", section);
        feedback.setAttribute("role", "status");
        const label = node("label", undefined, section);
        const reviewed = node("input", undefined, label);
        reviewed.type = "checkbox";
        label.append(document.createTextNode(drawing
            ? " I have opened this student's current linked drawing and confirmed that it is a similar picture built with shapes."
            : " I have opened this student's current linked document and confirmed that the Rattlesnakes passage is substantially complete."));
        const approve = node("button", drawing ? "Tick Completed" : "Approve reviewed document", section, "button button-primary");
        const revoke = node("button", drawing ? "Remove Completed tick" : "Remove approval / require another check", section, "button");
        const refresh = node("button", "Reload current link and check", section, "button");
        for (const button of [approve, revoke, refresh]) button.type = "button";
        approve.disabled = revoke.disabled = true;
        const current = revision;
        let documentKey = "";
        let busy = false;
        const path = `/api/admin/kit-document-review/${encodeURIComponent(kit)}/${index}`;
        const live = () => section.isConnected && current === revision;
        const buttons = () => {
            approve.disabled = busy || !documentKey || !reviewed.checked;
            revoke.disabled = busy || !documentKey;
            refresh.disabled = busy;
        };
        reviewed.addEventListener("change", buttons);
        function show(verification) {
            feedback.textContent = verification
                ? `${verification.passed ? verification.method === "teacher" ? drawing ? "Completed by teacher" : "Teacher approved" : "Automatic text check passed" : "Not yet passed"}: ${date(verification.checkedAt)}${verification.reviewedBy ? ` by ${verification.reviewedBy}` : ""}. ${verification.feedback.message}`
                : drawing ? "Not ticked Completed for the current link yet." : "No saved text check or teacher approval for the current link.";
        }
        async function reload() {
            busy = true;
            buttons();
            try {
                const response = await fetch(`${path}?email=${encodeURIComponent(email)}`, { headers: adminHeaders(true), cache: "no-store" });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || "Could not read the document review.");
                if (!live()) return;
                documentKey = data.documentKey;
                reviewed.checked = false;
                linkHost.replaceChildren();
                if (documentKey) {
                    const link = node("a", drawing ? "Open current submitted drawing" : "Open current submitted document", linkHost);
                    link.href = data.url;
                    link.target = "_blank";
                    link.rel = "noopener noreferrer";
                } else linkHost.textContent = drawing ? "No valid drawing sharing link has been saved." : "No valid document sharing link has been saved.";
                show(data.verification);
            } catch (error) {
                if (live()) {
                    documentKey = "";
                    feedback.textContent = error.message;
                }
            } finally { busy = false; if (live()) buttons(); }
        }
        async function save(approved) {
            busy = true;
            buttons();
            try {
                const response = await fetch(path, {
                    method: "PUT", headers: { ...adminHeaders(true), "Content-Type": "application/json" },
                    body: JSON.stringify({ email, documentKey, approved })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || "Approval was not confirmed. Reload before retrying.");
                if (!live()) return;
                show(data.verification);
                tick.textContent = `Tick: ${date(data.completedActivities?.[index])} | Completion rule: ${drawing ? "Student submits; teacher ticks Completed" : "Automatic with text check or teacher approval"}`;
                reviewed.checked = false;
                status.textContent = "Document review saved and kit completion recalculated. Refresh class progress to see the updated status. The student can reopen their kit for its certificate.";
            } catch (error) {
                if (live()) feedback.textContent = error.message;
            } finally { busy = false; if (live()) buttons(); }
        }
        approve.addEventListener("click", () => { if (!busy && reviewed.checked && documentKey) void save(true); });
        revoke.addEventListener("click", () => { if (!busy && documentKey) void save(false); });
        refresh.addEventListener("click", () => { void reload(); });
        void reload();
    }

    function render(data) {
        output.replaceChildren();
        node("h2", data.content.identity?.name || data.content.bannerTitle || data.kitId, output);
        node("p", "A saved completion tick alone is not teacher verification. Reading this report does not inspect files or change progress. Rattlesnakes and Google Drawings review controls below let you explicitly approve completion after opening the student's file.", output, "results-warning");
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
                const tick = node("p", `Tick: ${date(progress.completed_activities?.[index])} | Completion rule: ${activity?.completionMode === "auto" ? "Automatic" : "Manual / specialised activity"}`, section);
                if (activity?.documentCheck === "google-drawing-teacher-v1") {
                    renderDocumentReview(section, data.kitId, index, student.email, tick, true);
                } else if (activity?.documentCheck === "rattlesnakes-v1" ||
                    /^rattlesnakes$/i.test(String(worksheet.activity || "").trim()) &&
                    /files\s*(?:&|and)\s*folders/i.test(data.content.identity?.name || data.content.bannerTitle || "")) {
                    renderDocumentReview(section, data.kitId, index, student.email, tick);
                }
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
        chocolateStatus.textContent = "";
        chocolateStatus.classList.remove("is-error");
        output.replaceChildren();
        status.textContent = "Sign-in changed. Read the records again with the current admin account.";
        classTableHost.replaceChildren();
        classStatus.textContent = "Sign-in changed. Refresh the class list with the current admin account.";
        classStatus.classList.remove("is-error");
        void loadClassProgress();
    });
})();
