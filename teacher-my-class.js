(() => {
    "use strict";
    const panel = document.querySelector("#my-class-panel");
    if (!panel) return;
    const select = (id) => document.querySelector(`#my-class-${id}`);
    const tabs = [...document.querySelectorAll(".student-tracker-tabs [role=tab]")];
    const course = select("course");
    const search = select("search");
    const attention = select("attention");
    const list = select("students");
    const table = select("table");
    const status = select("status");
    const refresh = select("refresh");
    const reload = select("reload");
    const state = { students: [], selectedId: "", loaded: false, loading: false, busy: false };
    const html = (value) => escapeHtml(value);
    const date = (value) => {
        const parsed = new Date(value);
        return value && !Number.isNaN(parsed.getTime())
            ? parsed.toLocaleString("en-NZ", { timeZone: "Pacific/Auckland" }) : "";
    };
    const setClassStatus = (message, error = false) => {
        status.textContent = message;
        status.classList.toggle("is-error", error);
    };

    function classStudents() {
        return state.students.filter((student) => student.course === course.value);
    }

    function matchingStudents() {
        const query = search.value.trim().toLowerCase();
        return classStudents().filter((student) => !query || `${student.name} ${student.form}`.toLowerCase().includes(query));
    }

    function matchesAttention(student) {
        const check = student.check;
        switch (attention.value) {
            case "not-linked": return check?.created.status === "not_linked" || (!check && !student.fileId);
            case "no-writing": return check?.writing.status === "no";
            case "not-commented": return check?.comments.status === "no";
            case "needs-check": return !check || [check.created, check.writing, check.comments]
                .some((entry) => ["error", "unavailable"].includes(entry.status));
            default: return true;
        }
    }

    function indicator(entry, yes, no) {
        if (!entry) return '<span class="my-class-indicator is-unknown">Not checked</span>';
        if (entry.status === "yes") return `<span class="my-class-indicator is-yes">&#10003; ${html(yes)}</span>`;
        if (entry.status === "no") return `<span class="my-class-indicator is-no">&#10007; ${html(no)}</span>`;
        if (entry.status === "not_linked") return '<span class="my-class-indicator is-no">&#10007; No linked description</span>';
        if (entry.status === "not_applicable") return '<span>Not applicable</span>';
        return `<span class="my-class-indicator is-unknown">Unable to check</span><small>${html(entry.message)}</small>`;
    }

    function commentEntry(entry, reply = false) {
        return `<div class="${reply ? "my-class-reply" : "my-class-comment"}">
            <strong>${html(entry.author)}${entry.yours ? " (you)" : ""}</strong>
            <small>${html(date(entry.modifiedAt || entry.createdAt))}</small>
            <p>${html(entry.text || "(No comment text)")}</p>
        </div>`;
    }

    function commentsCell(check) {
        if (!check || check.comments.status !== "yes") return check?.comments.status === "no" ? "No comments from you." : "Comments have not been read.";
        const threads = check.comments.threads;
        const count = threads.reduce((sum, thread) => sum + Number(thread.yours) + thread.replies.filter((reply) => reply.yours).length, 0);
        return `<details class="my-class-comments"><summary>Read your comments (${count})</summary>
            ${threads.map((thread) => `<div class="my-class-comment">
                <strong>${thread.resolved ? "Resolved thread" : "Open thread"}</strong>
                ${commentEntry(thread)}
                ${thread.replies.map((reply) => commentEntry(reply, true)).join("")}
            </div>`).join("")}
        </details>`;
    }

    function render() {
        const students = matchingStudents();
        select("count").textContent = `(${students.length} of ${classStudents().length})`;
        const middle = course.value === "MiddleDTECH";
        refresh.disabled = state.busy || state.loading || !state.loaded || !middle || !classStudents().length;
        reload.disabled = state.busy || state.loading;
        attention.disabled = !middle;
        select("note").textContent = middle
            ? "Refresh reads the whole MiddleDTECH class, not just the selected student. It reads slides and your Google comments, including resolved threads, without editing files. Writing means words added beyond the current template, not a judgement of quality. No linked description does not prove no file exists."
            : `The ${course.value} class list is available. Description tracking is not configured for this course yet.`;
        list.innerHTML = `<button class="my-class-student" type="button" data-class-student="" aria-pressed="${!state.selectedId}">All students</button>
            ${students.map((student) => `<button class="my-class-student" type="button"
                data-class-student="${html(student.id)}" aria-pressed="${state.selectedId === student.id}">
                ${html(student.name)}<small>Year ${html(student.year)}${student.form ? ` &middot; ${html(student.form)}` : ""}</small>
            </button>`).join("")}
            ${students.length ? "" : "<p>No students match this course and name.</p>"}`;
        if (!middle) {
            table.innerHTML = "<p>Description tracker: <strong>Not configured</strong>. Select MiddleDTECH to check Digital Outcome Descriptions.</p>";
            return;
        }
        const visible = students.filter((student) => (!state.selectedId || student.id === state.selectedId) && matchesAttention(student));
        if (!visible.length) {
            table.innerHTML = "<p>No students match these filters.</p>";
            return;
        }
        table.innerHTML = `<div class="my-class-table-scroll" tabindex="0" role="region" aria-label="Description progress table, scroll horizontally on small screens">
            <table class="my-class-table">
                <caption>Digital Outcome Description &mdash; saved checks; refresh after changes. Dates are New Zealand time.</caption>
                <thead><tr><th scope="col">Student</th><th scope="col">Description created</th><th scope="col">Writing on first slide</th><th scope="col">Your Google comments</th><th scope="col">Comment text</th></tr></thead>
                <tbody>${visible.map((student) => {
                    const check = student.check;
                    const fileId = check?.fileId || student.fileId;
                    return `<tr data-class-row="${html(student.id)}">
                        <th scope="row">${html(student.name)}
                            ${fileId ? `<small><a href="https://docs.google.com/presentation/d/${encodeURIComponent(fileId)}/edit" target="_blank" rel="noopener noreferrer">Open slideshow</a></small>` : ""}
                            <span class="my-class-checked">${check ? `Checked: ${html(date(check.checkedAt))}` : "Not checked yet"}</span>
                        </th>
                        <td>${indicator(check?.created, "Created", "")}</td>
                        <td>${indicator(check?.writing, "Writing found", "Template only / no added words")}</td>
                        <td>${indicator(check?.comments, "Commented", "None from you")}</td>
                        <td>${commentsCell(check)}</td>
                    </tr>`;
                }).join("")}</tbody>
            </table>
        </div>`;
    }

    async function load() {
        if (state.loading || state.busy) return;
        state.loading = true;
        render();
        setClassStatus("Loading class list and saved checks...");
        try {
            const payload = await fetchJson("/api/student-tracker/my-class", { headers: withAuthHeaders() });
            if (!Array.isArray(payload.students)) throw new Error("The class list response was incomplete. Please reload.");
            state.students = payload.students;
            state.loaded = true;
            state.selectedId = "";
            setClassStatus("Class list loaded. Refresh to check the latest Google Slides and comments.");
        } catch (error) {
            setClassStatus(error.message || "Could not load My Class.", true);
        } finally {
            state.loading = false;
            render();
        }
    }

    async function refreshChecks() {
        if (state.busy || course.value !== "MiddleDTECH") return;
        const students = classStudents();
        if (!students.length) return;
        state.busy = true;
        render();
        setClassStatus("Connecting to your Google Drive...");
        let completed = 0;
        let errors = 0;
        try {
            const response = await requestHubDriveAccessToken();
            const token = String(response?.access_token || "");
            if (!token) throw new Error(response?.error || "Google Drive access is required. Connect Drive and retry.");
            for (let offset = 0; offset < students.length; offset += 5) {
                setClassStatus(`Checking MiddleDTECH descriptions and comments: ${completed} of ${students.length}...`);
                const batch = students.slice(offset, offset + 5);
                const payload = await fetchJson("/api/student-tracker/my-class/check", {
                    method: "POST",
                    headers: withAuthHeaders({ "Content-Type": "application/json" }),
                    body: JSON.stringify({ driveAccessToken: token, studentIds: batch.map((student) => student.id) })
                });
                if (!Array.isArray(payload.results) || payload.results.length !== batch.length ||
                    batch.some((student) => !payload.results.some((result) => result.id === student.id && result.check))) {
                    throw new Error("The refresh response was incomplete. Reload saved checks before retrying.");
                }
                for (const result of payload.results) {
                    const student = state.students.find((row) => row.id === result.id);
                    student.check = result.check;
                    student.fileId = result.check.fileId;
                    if ([result.check.created, result.check.writing, result.check.comments]
                        .some((entry) => ["error", "unavailable"].includes(entry.status))) errors++;
                }
                completed += batch.length;
                render();
            }
            setClassStatus(`Saved checks for ${completed} students.${errors ? ` ${errors} had a file, slide or comment check that could not be completed; see the table for details.` : " All checks completed."}`, errors > 0);
        } catch (error) {
            setClassStatus(`Refresh stopped after ${completed} of ${students.length} students. ${error.message || "Could not refresh descriptions."} Reload the class list to recover saved checks before retrying.`, true);
        } finally {
            state.busy = false;
            render();
        }
    }

    function activateTab(tab, updateUrl = true) {
        const isClass = tab.id === "my-class-tab";
        tabs.forEach((item) => {
            const selected = item === tab;
            item.setAttribute("aria-selected", String(selected));
            item.tabIndex = selected ? 0 : -1;
            document.getElementById(item.getAttribute("aria-controls")).hidden = !selected;
        });
        document.querySelector("#criteria-library-section").hidden = isClass;
        if (updateUrl) {
            const url = new URL(window.location.href);
            if (isClass) url.searchParams.set("tab", "my-class");
            else url.searchParams.delete("tab");
            window.history.replaceState(null, "", url);
        }
        if (isClass && !state.loaded) void load();
    }

    tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => activateTab(tab));
        tab.addEventListener("keydown", (event) => {
            let next;
            if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
            else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = tabs.length - 1;
            else return;
            event.preventDefault();
            tabs[next].focus();
            activateTab(tabs[next]);
        });
    });
    course.addEventListener("change", () => { state.selectedId = ""; render(); });
    search.addEventListener("input", () => { state.selectedId = ""; render(); });
    attention.addEventListener("change", render);
    list.addEventListener("click", (event) => {
        const button = event.target.closest("[data-class-student]");
        if (!button) return;
        state.selectedId = button.dataset.classStudent;
        render();
        list.querySelector(`[data-class-student="${CSS.escape(state.selectedId)}"]`)?.focus();
    });
    refresh.addEventListener("click", refreshChecks);
    reload.addEventListener("click", load);
    const params = new URLSearchParams(window.location.search);
    if (!params.has("embed") && params.get("tab") === "my-class") activateTab(tabs[1], false);
})();
