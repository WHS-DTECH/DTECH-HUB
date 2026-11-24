(() => {
    "use strict";
    const e = window.ActivityBlocks.escape;
    const BASE = "/api/practical-skills/blueprint-team";
    function role(kit, title) {
        if (kit !== "kit-minecraft-builder-kit") return "";
        const name = String(title || "").trim().toLowerCase();
        return name === "the blueprint mission" ? "registration" :
            ["build it better", "famous building challenge"].includes(name) ? "summary" : "";
    }
    const isStepTwo = (label) => /decide how you will build it/i.test(String(label || ""));
    function shell() {
        return `<section class="worksheet-task-brief blueprint-team" data-blueprint-team aria-label="Blueprint team registration">
            <h2>My building registration</h2><div data-team-body></div>
            <p data-team-status role="status" aria-live="polite">Loading your registration...</p>
            <button type="button" class="worksheet-btn worksheet-btn-secondary" data-team-refresh>Refresh team details</button>
        </section>`;
    }
    function details(team) {
        return `<p><strong>${team.mode === "team" ? "Team" : "Independent build"}:</strong> ${e(team.building)}</p>
            <p>Class: ${e(team.className)} (${e(team.schoolYear)}) &middot; Registration ID: ${e(team.id)}</p>
            <div class="activity-block-table"><table><caption>Members and building responsibilities</caption>
            <thead><tr><th>Name</th><th>Membership</th><th>Building area</th><th>Intended contribution</th></tr></thead>
            <tbody>${team.members.map((member) => `<tr><td>${e(member.name)}<br>${e(member.email)}</td>
                <td>${e(team.mode === "independent" && member.status === "accepted" ? "Independent" :
                    member.status === "pending" ? "Awaiting own acknowledgement" : member.status)}</td>
                <td>${e(member.area || "Not recorded")}</td><td>${e(member.contribution || "Not recorded")}</td></tr>`).join("")}
            </tbody></table></div>`;
    }
    function field(label, name, value = "", limit = 200, multiline = false) {
        return `<label>${e(label)}${multiline
            ? `<textarea name="${name}" maxlength="${limit}" required>${e(value)}</textarea>`
            : `<input name="${name}" maxlength="${limit}" value="${e(value)}" required>`}</label>`;
    }
    function bind(host, { request, registration, readOnly, syncSlide }) {
        const panel = host.querySelector("[data-blueprint-team]");
        if (!panel) return;
        const body = panel.querySelector("[data-team-body]");
        const status = panel.querySelector("[data-team-status]");
        const refresh = panel.querySelector("[data-team-refresh]");
        let loading = false;
        let current;
        let slideSync = Promise.resolve();
        function updateSlide(askPermission = false) {
            if (!registration || !current?.team || !syncSlide) return;
            slideSync = slideSync.then(async () => {
                if (!panel.isConnected) return;
                const slideStatus = panel.querySelector("[data-team-slide-status]");
                const button = panel.querySelector("[data-team-slide-sync]");
                if (!slideStatus || !button) return;
                slideStatus.textContent = "Updating your team slide...";
                button.disabled = true;
                try {
                    const result = await syncSlide(askPermission);
                    if (!panel.isConnected) return;
                    const target = panel.querySelector("[data-team-slide-status]");
                    if (target) target.textContent = result.failures.length
                        ? `${result.updated} of ${result.total} linked slideshows are up to date. ${result.failures.join(" ")}`
                        : `Our Building Team is up to date in ${result.updated} linked slideshow(s).`;
                } catch (failure) {
                    const target = panel.querySelector("[data-team-slide-status]");
                    if (panel.isConnected && target) target.textContent = failure.message || "Could not update the team slide. Add the details manually.";
                } finally {
                    const target = panel.querySelector("[data-team-slide-sync]");
                    if (panel.isConnected && target) target.disabled = false;
                }
            });
        }
        function error(error) {
            status.textContent = error.message || "Team registration could not be loaded. Please retry.";
            status.classList.add("is-error");
        }
        async function mutation(button, url, data) {
            button.disabled = true;
            status.classList.remove("is-error");
            status.textContent = "Saving registration...";
            try {
                const result = await request(url, { method: url === BASE ? "POST" : "PUT", body: JSON.stringify(data) });
                if (!panel.isConnected) return;
                if (!await load()) throw new Error("The save response was received, but refreshed membership could not be loaded. Refresh before retrying.");
                if (panel.isConnected) status.textContent = `Registration saved.${result.slideStatus ? ` ${result.slideStatus}` : ""}`;
            } catch (failure) { if (panel.isConnected) error(failure); }
            finally { if (button.isConnected) button.disabled = false; }
        }
        function registrationForm() {
            body.innerHTML = `<p>Signed in as <strong>${e(current.student.name)}</strong> (${e(current.student.email)}).
                Class: ${e(current.className)}. Teams have at most three students, including you.</p>
                <form data-team-register>
                    <label>Build type<select name="mode"><option value="independent">Independent build</option><option value="team">Team build</option></select></label>
                    ${field("Chosen famous building", "building")}
                    <div data-team-selector hidden>
                        <label>Search students in your timetabled class<input type="search" data-team-search maxlength="100"></label>
                        <button type="button" class="worksheet-btn worksheet-btn-secondary" data-team-search-button>Search students</button>
                        <div data-team-search-results></div><ul data-team-chosen></ul>
                    </div>
                    <button class="worksheet-btn worksheet-btn-primary" type="submit">Save building registration</button>
                </form>`;
            const form = body.querySelector("form");
            const chosen = new Map();
            let searchRevision = 0;
            form.elements.mode.addEventListener("change", () => {
                form.querySelector("[data-team-selector]").hidden = form.elements.mode.value !== "team";
            });
            function selectedList() {
                const list = form.querySelector("[data-team-chosen]");
                list.innerHTML = [...chosen.values()].map((student) =>
                    `<li>${e(student.name)} (${e(student.email)}) <button type="button" data-remove-student="${e(student.id)}">Remove</button></li>`).join("");
                list.querySelectorAll("[data-remove-student]").forEach((button) => button.addEventListener("click", () => {
                    chosen.delete(button.dataset.removeStudent);
                    selectedList();
                }));
            }
            form.querySelector("[data-team-search-button]").addEventListener("click", async () => {
                const query = form.querySelector("[data-team-search]").value.trim();
                const revision = ++searchRevision;
                if (query.length < 2) { status.textContent = "Enter at least two letters of a student's name."; return; }
                try {
                    const result = await request(`${BASE}/students?q=${encodeURIComponent(query)}`);
                    if (!form.isConnected || revision !== searchRevision) return;
                    const results = form.querySelector("[data-team-search-results]");
                    results.innerHTML = result.students.length ? result.students.map((student) =>
                        `<p>${e(student.name)} (${e(student.email)}) <button type="button" data-add-student="${e(student.id)}">Add teammate</button></p>`).join("") : "<p>No matching students in your class.</p>";
                    results.querySelectorAll("[data-add-student]").forEach((button) => button.addEventListener("click", () => {
                        if (chosen.size >= 2 && !chosen.has(button.dataset.addStudent)) {
                            status.textContent = "You can add at most two teammates."; return;
                        }
                        chosen.set(button.dataset.addStudent, result.students.find((student) => student.id === button.dataset.addStudent));
                        selectedList();
                    }));
                } catch (failure) { if (form.isConnected) error(failure); }
            });
            form.addEventListener("submit", (event) => {
                event.preventDefault();
                void mutation(form.querySelector("[type=submit]"), BASE, {
                    mode: form.elements.mode.value, building: form.elements.building.value,
                    teammateIds: form.elements.mode.value === "team" ? [...chosen.keys()] : []
                });
            });
        }
        function show() {
            const team = current.team;
            if (!team) {
                if (registration) registrationForm();
                else body.innerHTML = "<p>No current building registration. Register in The Blueprint Mission first.</p>";
                return;
            }
            body.innerHTML = details(team);
            if (registration) body.insertAdjacentHTML("beforeend", `<p data-team-slide-status role="status">Checking team slide...</p>
                <button type="button" class="worksheet-btn worksheet-btn-secondary" data-team-slide-sync>Update team slide</button>`);
            if (registration) body.querySelector("[data-team-slide-sync]").addEventListener("click", () => updateSlide(true));
            const own = team.members.find((member) => member.id === current.student.id);
            if (!registration || team.mode !== "team" || !own) return;
            body.insertAdjacentHTML("beforeend", `<p>Confirm only your own membership and responsibility.
                Your submission does not have to wait for other teammates. Each student submits their own Blueprint Slideshow link; teammates may use the same slideshow.</p>
                <form data-team-ack>
                    ${field("My building area", "area", own.area, 120)}
                    ${field("My intended contribution", "contribution", own.contribution, 1200, true)}
                    <button class="worksheet-btn worksheet-btn-primary" type="submit">${own.status === "accepted" ? "Save my contribution" : "Accept membership and save my contribution"}</button>
                    <button class="worksheet-btn worksheet-btn-secondary" type="button" data-team-decline>Decline membership</button>
                </form>`);
            const form = body.querySelector("[data-team-ack]");
            form.addEventListener("submit", (event) => {
                event.preventDefault();
                void mutation(form.querySelector("[type=submit]"), `${BASE}/${team.id}/acknowledgement`,
                    { decision: "accept", version: team.version, area: form.elements.area.value, contribution: form.elements.contribution.value });
            });
            form.querySelector("[data-team-decline]").addEventListener("click", (event) => {
                if (!window.confirm("Decline this team membership? You can then register independently or join another team.")) return;
                void mutation(event.target, `${BASE}/${team.id}/acknowledgement`, { decision: "decline", version: team.version,
                    driveAccessToken: window.getActiveHubDriveAccessToken?.() || "" });
            });
        }
        async function load() {
            if (loading) return false;
            loading = true;
            refresh.disabled = true;
            status.classList.remove("is-error");
            try {
                current = await request(BASE);
                if (!panel.isConnected) return;
                show();
                updateSlide();
                status.textContent = "";
                return true;
            } catch (failure) { if (panel.isConnected) error(failure); return false; }
            finally { loading = false; refresh.disabled = false; }
        }
        if (readOnly || !request) {
            body.innerHTML = "<p>Students register their chosen building here, choose an independent or team build, and acknowledge their own contribution. Team details carry forward to later activities.</p>";
            status.textContent = "Read-only preview: registration and acknowledgements are disabled.";
            refresh.disabled = true;
            return;
        }
        refresh.addEventListener("click", load);
        panel.addEventListener("blueprint-link-saved", () => updateSlide());
        void load();
    }
    async function teacher(host, request) {
        host.innerHTML = "<p role=\"status\">Loading current-year building registrations...</p>";
        try {
            const data = await request("/api/admin/practical-skills/blueprint-teams");
            const scopes = new Map(data.teams.map((team) => [team.courseInstance, `${team.schoolYear} - ${team.course} - ${team.className}`]));
            host.innerHTML = `<label>Timetabled class<select data-team-class><option value="">All classes</option>${[...scopes].map(([key, label]) =>
                `<option value="${e(key)}">${e(label)}</option>`).join("")}</select></label>
                <p>Correct membership here. Changes require fresh acknowledgement and contribution details from every remaining team member.
                To move a student, remove them from their old registration first. Clear all members to close a registration.
                Teachers cannot acknowledge on a student's behalf.</p>
                <div data-team-list></div><p data-team-feedback role="status" aria-live="polite"></p>`;
            const list = host.querySelector("[data-team-list]");
            const filter = host.querySelector("[data-team-class]");
            function render() {
                const teams = data.teams.filter((team) => !filter.value || team.courseInstance === filter.value);
                list.innerHTML = teams.length ? teams.map((team) => `<section class="worksheet-task-brief" data-team-editor="${e(team.id)}">
                    ${details(team)}<form>${field("Chosen famous building", "building", team.building)}
                    <label>Members (maximum ${team.mode === "team" ? "three" : "one"}; use Ctrl/Cmd to select multiple)<select name="members" multiple size="6">
                    ${data.students.filter((student) => student.courseInstance === team.courseInstance).map((student) =>
                        `<option value="${e(student.id)}" ${team.members.some((member) => member.id === student.id && ["pending", "accepted"].includes(member.status)) ? "selected" : ""}>${e(student.name)} (${e(student.email)})</option>`).join("")}
                    </select></label><button class="worksheet-btn worksheet-btn-primary" type="submit">Save membership correction</button></form>
                </section>`).join("") : "<p>No registrations in this class.</p>";
                list.querySelectorAll("form").forEach((form) => form.addEventListener("submit", async (event) => {
                    event.preventDefault();
                    if (!window.confirm("Save this correction? Team students will need to acknowledge membership and describe their contributions again.")) return;
                    const team = data.teams.find((team) => team.id === form.parentElement.dataset.teamEditor);
                    const button = form.querySelector("button");
                    const feedback = host.querySelector("[data-team-feedback]");
                    button.disabled = true;
                    try {
                        const saved = await request(`/api/admin/practical-skills/blueprint-teams/${team.id}`, {
                            method: "PUT", body: JSON.stringify({ version: team.version, building: form.elements.building.value,
                                memberIds: [...form.elements.members.selectedOptions].map((option) => option.value) })
                        });
                        data.teams[data.teams.indexOf(team)] = saved.team;
                        render();
                        feedback.textContent = "Membership correction saved.";
                    } catch (failure) { feedback.textContent = failure.message; }
                    finally { button.disabled = false; }
                }));
            }
            filter.addEventListener("change", render);
            render();
        } catch (failure) { host.innerHTML = `<p role="alert">${e(failure.message)} Reload to retry.</p>`; }
    }
    window.BlueprintTeams = { role, isStepTwo, shell, bind, teacher };
})();
