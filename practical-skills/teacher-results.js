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
    const chocolateFilter = document.getElementById("class-chocolate-filter");
    const kitFocus = document.getElementById("class-kit-focus");
    const typingSection = document.getElementById("class-typing-results");
    const typingHost = document.getElementById("class-typing-table-host");
    const typingWeekFilter = document.getElementById("typing-week-filter");
    const typingStatus = document.getElementById("typing-review-status");
    const signatureStatus = document.getElementById("typing-signature-status");
    const typingReviews = new Map();
    const pendingSignatures = new Set();
    let typingLoadingRevision = -1;
    const classTab = document.getElementById("class-progress-tab");
    const studentTab = document.getElementById("student-review-tab");
    const classPanel = document.getElementById("class-progress-panel");
    const studentPanel = document.getElementById("student-review-panel");
    let revision = 0;
    let classRevision = 0;
    let classData = null;
    let refreshingReviewEmail = "";
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
    async function fetchDocumentReview(url, options = {}) {
        const email = adminHeaders(true)["x-user-email"];
        async function renew(forceRefresh) {
            if (typeof requestHubDriveAccessToken !== "function") {
                throw new Error("Google sign-in is not ready. Reload this page and try again.");
            }
            refreshingReviewEmail = email.toLowerCase();
            try {
                const token = await requestHubDriveAccessToken({ forceConsent: false, forceRefresh });
                if (token?.error || !token?.access_token) {
                    throw new Error(token?.error || "Google sign-in could not be renewed. Allow the Google sign-in window and try again.");
                }
                if (adminHeaders(true)["x-user-email"].toLowerCase() !== email.toLowerCase()) {
                    throw new Error("Your Google account changed. Refresh the list before reviewing a document.");
                }
                return { "x-user-email": email, Authorization: `Bearer ${token.access_token}` };
            } finally {
                refreshingReviewEmail = "";
            }
        }
        let headers = adminHeaders(true);
        if (!headers.Authorization) headers = await renew(false);
        const send = () => fetch(url, { ...options, headers: { ...options.headers, ...headers } });
        let response = await send();
        if (response.status === 401) {
            headers = await renew(true);
            response = await send();
        }
        return response;
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
        const selectedChocolate = chocolateFilter.value;
        const query = studentFilter.value.trim().toLowerCase();
        return classData.students.filter((student) =>
            (!selectedCourse || courseKey(student.course) === selectedCourse)
            && (!selectedWhanau || student.whanau === selectedWhanau)
            && (!selectedHomeroom || student.homeroom === selectedHomeroom)
            && (!selectedKit || !selectedStatus || kitStatus(student.kitProgress?.[selectedKit]) === selectedStatus)
            && (!selectedKit || !selectedChocolate || (student.chocolate?.[selectedKit] === true) === (selectedChocolate === "yes"))
            && (!query || `${student.name} ${student.email}`.toLowerCase().includes(query)))
            .sort((a, b) => a.name.localeCompare(b.name));
    }
    async function saveSubmissionCompleted(student, kit, activity, entry, checked) {
        const data = classData;
        if (pendingSubmissions.size) {
            submissionStatus.classList.add("is-error");
            submissionStatus.textContent = "Wait for the current drawing review to finish saving.";
            return;
        }
        const key = `${student.email}:${kit.id}:${activity.index}`;
        pendingSubmissions.add(key);
        submissionStatus.classList.remove("is-error");
        submissionStatus.textContent = `Saving Completed for ${student.name} - ${activity.title}...`;
        renderSubmissions(filteredStudents());
        try {
            const response = await fetchDocumentReview(`/api/admin/kit-document-review/${encodeURIComponent(kit.id)}/${activity.index}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
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
    async function saveDrawingComment(student, kit, activity, entry, input, button) {
        const data = classData;
        if (pendingSubmissions.size) {
            submissionStatus.classList.add("is-error");
            submissionStatus.textContent = "Wait for the current drawing review to finish saving.";
            return;
        }
        const key = `${student.email}:${kit.id}:${activity.index}`;
        pendingSubmissions.add(key);
        button.disabled = true;
        input.disabled = true;
        submissionStatus.classList.remove("is-error");
        submissionStatus.textContent = `Saving feedback for ${student.name} - ${activity.title}...`;
        try {
            const response = await fetchDocumentReview(`/api/admin/kit-document-review/${encodeURIComponent(kit.id)}/${activity.index}`, {
                method: "PUT", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: student.email, documentKey: entry.documentKey, comment: input.value })
            });
            const saved = await response.json();
            if (!response.ok) throw new Error(saved.error || "Could not save feedback.");
            if (typeof saved.teacherComment !== "string") throw new Error("The server did not confirm the saved feedback. Reload before retrying.");
            if (classData !== data) return;
            entry.teacherComment = saved.teacherComment;
            delete entry.commentDraft;
            input.value = saved.teacherComment;
            submissionStatus.textContent = `Feedback saved for ${student.name} - ${activity.title}. The student can see it in the activity.`;
        } catch (error) {
            if (classData !== data) return;
            submissionStatus.classList.add("is-error");
            submissionStatus.textContent = `${student.name} - ${activity.title}: ${error.message}`;
        } finally {
            pendingSubmissions.delete(key);
            button.disabled = false;
            input.disabled = false;
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
            wrap.setAttribute("tabindex", "0");
            wrap.setAttribute("role", "region");
            wrap.setAttribute("aria-label", `${title} submissions table`);
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
                        node("div", `${entry.filed === true ? "Submitted - synced" : "Saved - sync needed"}${entry.submittedAt ? ` ${date(entry.submittedAt)}` : ""}`, linkCell,
                            entry.filed === true ? "submission-submitted" : "submission-saved");
                    } else node("span", "No link", linkCell, "submission-note");
                    if (entry?.documentKey) {
                        const commentLabel = node("label", "Teacher feedback", linkCell);
                        const comment = node("textarea", undefined, commentLabel);
                        comment.value = entry.commentDraft ?? entry.teacherComment ?? "";
                        comment.maxLength = 2000;
                        comment.rows = 3;
                        comment.setAttribute("aria-label", `Teacher feedback for ${student.name} - ${activity.title}`);
                        comment.addEventListener("input", () => { entry.commentDraft = comment.value; });
                        const saveComment = node("button", "Save feedback", linkCell, "button");
                        saveComment.type = "button";
                        saveComment.addEventListener("click", () => saveDrawingComment(student, { id: kit.id }, activity, entry, comment, saveComment));
                    }
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
    async function saveBookSignature(student, review, weekStart, period, signed) {
        if (pendingSignatures.size) return;
        const revision = classRevision;
        const key = `${student.email}:${weekStart}:${period}`;
        pendingSignatures.add(key);
        signatureStatus.classList.remove("is-error");
        signatureStatus.textContent = `Saving book signature for ${student.name}, Period ${period}...`;
        renderTypingResults(filteredStudents());
        try {
            const response = await fetch("/api/admin/typing-kit-book-signature", {
                method: "PUT", headers: { ...adminHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ email: student.email, weekStart, period, signed })
            });
            const data = await response.json();
            if (!response.ok || typeof data.signed !== "boolean") throw new Error(data.error || "The server did not confirm the signature. Refresh the list.");
            if (revision !== classRevision) return;
            const saved = review.signatures.find(entry => entry.weekStart === weekStart && entry.period === period);
            if (saved) saved.signed = data.signed;
            else review.signatures.push({ weekStart, period, signed: data.signed });
            signatureStatus.textContent = `Saved book signature: ${data.signed ? "Yes" : "No"} for ${student.name}, Period ${period}, week starting ${weekStart}.`;
        } catch (error) {
            if (revision !== classRevision) return;
            signatureStatus.classList.add("is-error");
            signatureStatus.textContent = error.message || "Could not save the book signature. Refresh before trying again.";
        } finally {
            pendingSignatures.delete(key);
            if (revision === classRevision && classData) renderTypingResults(filteredStudents());
        }
    }
    async function loadTypingReviews(students) {
        const revision = classRevision;
        typingLoadingRevision = revision;
        try {
            for (const phase of ["results", "attendance"]) for (let index = 0; index < students.length; index += 20) {
                if (revision !== classRevision || kitFilter.value !== "kit-typing") return;
                const visible = new Set(filteredStudents().map(student => student.email));
                const batch = students.slice(index, index + 20).filter(student => {
                    const existing = typingReviews.get(student.email.toLowerCase());
                    return visible.has(student.email) && (phase === "results" ? !existing :
                        existing?.weeklyProgress?.sourceStatus === "loading");
                });
                if (!batch.length) continue;
                try {
                    const response = await fetch(`/api/admin/typing-kit-results?emails=${encodeURIComponent(batch.map(student => student.email).join(","))}${phase === "results" ? "&attendance=deferred" : ""}`,
                        { headers: adminHeaders(), cache: "no-store" });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || `Could not read weekly results (${response.status}).`);
                    if (revision !== classRevision) return;
                    if (!Array.isArray(data.students) || data.students.length !== batch.length) {
                        throw new Error("Weekly results were incomplete. Refresh the list.");
                    }
                    for (const student of batch) {
                        const review = data.students?.find(entry => entry.email === student.email.toLowerCase());
                        if (!review || !Array.isArray(review.attempts) || !Array.isArray(review.signatures) || review.weeklyProgress?.weeks?.length !== 7) {
                            throw new Error("Weekly results were incomplete. Refresh the list.");
                        }
                    }
                    for (const review of data.students) {
                        const existing = typingReviews.get(review.email);
                        if (phase === "attendance") {
                            if (existing.startDate !== data.startDate) {
                                existing.weeklyProgress.sourceStatus = "unavailable";
                                existing.weeklyProgress.error = "The Typing Kit calendar changed. Refresh the list to check attendance.";
                            } else existing.weeklyProgress = review.weeklyProgress;
                        } else typingReviews.set(review.email, { ...review, startDate: data.startDate });
                    }
                } catch (error) {
                    if (revision !== classRevision) return;
                    for (const student of batch) {
                        const key = student.email.toLowerCase(), existing = typingReviews.get(key);
                        if (phase === "attendance" && existing?.weeklyProgress) {
                            existing.weeklyProgress.sourceStatus = "unavailable";
                            existing.weeklyProgress.error = error.message || "Could not read attendance.";
                        } else typingReviews.set(key, { error: error.message || "Could not read weekly results." });
                    }
                }
                if (revision === classRevision && classData) renderTypingResults(filteredStudents());
            }
        } finally {
            if (typingLoadingRevision === revision) {
                typingLoadingRevision = -1;
                if (revision === classRevision && classData) renderTypingResults(filteredStudents());
            }
        }
    }
    function renderTypingResults(students) {
        typingSection.hidden = kitFilter.value !== "kit-typing";
        if (typingSection.hidden) return;
        typingHost.replaceChildren();
        const missing = students.filter(student => !typingReviews.has(student.email.toLowerCase()));
        const pending = students.filter(student => typingReviews.get(student.email.toLowerCase())?.weeklyProgress?.sourceStatus === "loading");
        const failed = students.filter(student => typingReviews.get(student.email.toLowerCase())?.error);
        if (failed.length) typingStatus.classList.add("is-error");
        else typingStatus.classList.remove("is-error");
        typingStatus.textContent = !students.length ? "No students match these filters."
            : missing.length ? `Loading weekly results for ${missing.length} students...`
                : failed.length ? `${failed.length} student logs could not be read: ${typingReviews.get(failed[0].email.toLowerCase()).error} Refresh the list to retry.`
                    : `Showing weekly results for ${students.length} students. Book signatures save automatically.`;
        const first = students.map(student => typingReviews.get(student.email.toLowerCase())).find(review => review?.weeklyProgress);
        if (first) {
            const weeks = first.weeklyProgress.weeks;
            const today = first.weeklyProgress.today;
            let selectedWeeks = weeks;
            if (typingWeekFilter.value === "current") {
                if (!/^\d{4}-\d{2}-\d{2}$/.test(today || "")) {
                    typingStatus.classList.add("is-error");
                    typingStatus.textContent = "The current Typing Kit date could not be confirmed. Refresh the list or select a specific week.";
                    selectedWeeks = [];
                } else {
                    const lastEnd = new Date(`${weeks[weeks.length - 1].weekStart}T00:00:00Z`);
                    lastEnd.setUTCDate(lastEnd.getUTCDate() + 7);
                    selectedWeeks = weeks.filter((week, index) => today >= week.weekStart &&
                        today < (weeks[index + 1]?.weekStart || lastEnd.toISOString().slice(0, 10)));
                    if (!selectedWeeks.length && !failed.length && !missing.length) {
                        typingStatus.textContent = "There is no current week in the Typing Kit calendar. Choose a week or All weeks to review results.";
                    }
                }
            } else if (typingWeekFilter.value !== "all") {
                selectedWeeks = weeks.filter(week => String(week.week) === typingWeekFilter.value);
            }
            if (!selectedWeeks.length) {
                if ((missing.length || pending.length) && typingLoadingRevision !== classRevision) void loadTypingReviews([...missing, ...pending]);
                return;
            }
            const table = node("table", undefined, typingHost, `class-progress-table typing-review-table${selectedWeeks.length === 1 ? " class-progress-table-focused" : ""}`);
            const header = node("tr", undefined, node("thead", undefined, table));
            node("th", "Student", header);
            selectedWeeks.forEach(week => {
                node("th", `Week ${week.week} (${week.weekStart}) - Results`, header);
                node("th", `Week ${week.week} - Period 1 signed`, header);
                node("th", `Week ${week.week} - Period 2 signed`, header);
            });
            const body = node("tbody", undefined, table);
            for (const student of students) {
                const row = node("tr", undefined, body);
                node("th", student.name, row);
                const review = typingReviews.get(student.email.toLowerCase());
                if (!review || review.error) {
                    const cell = node("td", review?.error || "Loading results...", row);
                    cell.colSpan = selectedWeeks.length * 3;
                    continue;
                }
                if (review.startDate !== first.startDate) {
                    const cell = node("td", "The Typing Kit calendar changed. Refresh the list before signing.", row);
                    cell.colSpan = selectedWeeks.length * 3;
                    continue;
                }
                for (const week of review.weeklyProgress.weeks.filter(item => selectedWeeks.some(selected => selected.weekStart === item.weekStart))) {
                    const cell = node("td", undefined, row);
                    const labels = { legacy: "Weeks 1-4: optional", future: "Upcoming", completed: "Completed",
                        excused: "Excused - absent", required: "Needs a test", pending: "Attendance unconfirmed" };
                    node("strong", labels[week.status], cell);
                    for (const period of [1, 2]) {
                        const attempts = review.attempts.filter(attempt => attempt.weekStart === week.weekStart && attempt.period === period);
                        node("div", `Period ${period}: ${attempts.length ? "" : "No result yet"}`, cell);
                        for (const attempt of attempts) node("div", `Saved result: ${attempt.netWpm} WPM - ${attempt.accuracy}% (${date(attempt.submittedAt)})`, cell, "typing-saved-result");
                        const signedCell = node("td", undefined, row);
                        const label = node("label", undefined, signedCell);
                        const checkbox = node("input", undefined, label);
                        checkbox.type = "checkbox";
                        checkbox.checked = review.signatures.some(entry => entry.weekStart === week.weekStart && entry.period === period && entry.signed);
                        checkbox.disabled = pendingSignatures.size > 0;
                        checkbox.setAttribute("aria-label", `Book signed for ${student.name} - Week ${week.week} Period ${period}`);
                        node("span", checkbox.checked ? " Signed" : " No", label);
                        checkbox.addEventListener("change", () => saveBookSignature(student, review, week.weekStart, period, checkbox.checked));
                    }
                    if (review.weeklyProgress.sourceStatus !== "available") node("div",
                        review.weeklyProgress.sourceStatus === "loading" ? "Checking attendance..." :
                            review.weeklyProgress.error || "Attendance connection is not configured.", cell, "submission-note");
                }
            }
        }
        if ((missing.length || pending.length) && typingLoadingRevision !== classRevision) void loadTypingReviews([...missing, ...pending]);
    }
    function renderClassProgress() {
        if (!classData || !classTableHost) return;
        const students = filteredStudents();
        renderTypingResults(students);
        const focused = kitFocus.checked && Boolean(kitFilter.value);
        const kits = focused ? classData.kits.filter((kit) => kit.id === kitFilter.value) : classData.kits;
        renderSubmissions(students);
        classTableHost.replaceChildren();
        if (!students.length) {
            node("p", "No students match these filters.", classTableHost);
            classStatus.textContent = `No students match these filters. ${classData.students.length} students and ${classData.kits.length} active kits are available.`;
            return;
        }
        const table = node("table", undefined, classTableHost, focused ? "class-progress-table class-progress-table-focused" : "class-progress-table");
        const head = node("thead", undefined, table);
        const header = node("tr", undefined, head);
        [...(focused ? ["Student"] : ["Student", "Whānau", "Homeroom", "Course"]), ...kits.flatMap((kit) => [kit.title, "Chocolate"])].forEach((label) => {
            node("th", label, header);
        });
        const body = node("tbody", undefined, table);
        for (const student of students) {
            const row = node("tr", undefined, body);
            node("th", student.name, row);
            if (!focused) {
                node("td", student.whanau || "Not recorded", row);
                node("td", student.homeroom || "Not recorded", row);
                node("td", courseLabel(student.course), row);
            }
            for (const kit of kits) {
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
        classStatus.textContent = `Showing ${students.length} of ${classData.students.length} students and ${focused ? `only ${kits[0].title}` : `${kits.length} active kits`}. Read at ${date(classData.reviewedAt)}.`;
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
        chocolateFilter.disabled = !kitFilter.value;
        if (chocolateFilter.disabled) chocolateFilter.value = "";
        kitFocus.disabled = !kitFilter.value;
        if (kitFocus.disabled) kitFocus.checked = false;
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
        typingReviews.clear();
        typingHost.replaceChildren();
        signatureStatus.textContent = "";
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
                    kitFocus.checked = true;
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
    [courseFilter, whanauFilter, homeroomFilter, statusFilter, chocolateFilter, kitFocus].forEach((filter) => filter.addEventListener("change", renderClassProgress));
    kitFilter.addEventListener("change", () => {
        updateStatusFilter();
        if (kitFilter.value) kitFocus.checked = true;
        renderClassProgress();
    });
    studentFilter.addEventListener("input", renderClassProgress);
    typingWeekFilter.addEventListener("change", () => { if (classData) renderTypingResults(filteredStudents()); });
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
    function renderDocumentReview(parent, kit, index, email, tick, drawing = false, activityTitle = "Typed") {
        const section = node("section", undefined, parent, "sites-card");
        node("h4", drawing ? "Google Drawing - teacher Completed tick" : `${activityTitle} text completion`, section);
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
            : ` I have opened this student's current linked document and confirmed that the ${activityTitle} passage is substantially complete.`));
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
                const response = await fetchDocumentReview(`${path}?email=${encodeURIComponent(email)}`, { cache: "no-store" });
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
                const response = await fetchDocumentReview(path, {
                    method: "PUT", headers: { "Content-Type": "application/json" },
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
        node("p", "A saved completion tick alone is not teacher verification. Reading this report does not inspect files or change progress. Typing-passage and Google Drawings review controls below let you explicitly approve completion after opening the student's file.", output, "results-warning");
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
                } else if (activity?.documentCheck) {
                    renderDocumentReview(section, data.kitId, index, student.email, tick, false, worksheet.activity || "Typed");
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
    window.addEventListener("hub-auth-state-changed", (event) => {
        if (refreshingReviewEmail && event.detail?.signedIn
            && typeof getActiveHubEmail === "function" && getActiveHubEmail().toLowerCase() === refreshingReviewEmail) return;
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
