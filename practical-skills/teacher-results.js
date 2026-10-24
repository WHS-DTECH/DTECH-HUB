(() => {
    "use strict";
    const form = document.getElementById("results-form");
    const output = document.getElementById("results-output");
    const status = document.getElementById("results-status");
    let revision = 0;
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
        output.replaceChildren();
        status.textContent = "Sign-in changed. Read the records again with the current admin account.";
    });
})();
