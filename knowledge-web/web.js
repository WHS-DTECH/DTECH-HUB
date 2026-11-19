(() => {
    "use strict";
    const node = (id) => document.getElementById(`web-${id}`);
    const manage = new URLSearchParams(location.search).get("manage") === "1";
    const form = node("form");
    const proposalForm = node("proposal-form");
    const state = {
        clouds: [], selected: null, editing: null, editingProposal: null, proposalParentId: null,
        proposals: [], canPropose: false, zoom: 1, token: null, revision: 0,
        dirty: false, proposalDirty: false, saving: false, duplicatesAcknowledgedTitle: ""
    };
    const formatDate = (value) => value ? new Date(value).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland" }) : "";

    function element(tag, value) {
        const el = document.createElement(tag);
        if (value !== undefined) el.textContent = value;
        return el;
    }

    function button(label, callback) {
        const el = element("button", label);
        el.type = "button";
        el.addEventListener("click", callback);
        return el;
    }

    function resizeTextareas(container) {
        container.querySelectorAll("textarea").forEach((field) => {
            if (!field.getClientRects().length) return;
            field.style.height = "auto";
            field.style.height = `${field.scrollHeight + field.offsetHeight - field.clientHeight}px`;
        });
    }

    function mainField(target, name) {
        return target.querySelector(`:scope > label > [name="${name}"]`);
    }

    async function request(path, options = {}) {
        const response = await fetch(`/api/knowledge-web/${path}`, {
            ...options, headers: withHubAuthHeaders({ "Content-Type": "application/json" }, undefined, true),
            cache: "no-store", signal: AbortSignal.timeout(20000)
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || `Request failed (${response.status}).`);
        return body;
    }

    function updatePressed() {
        for (const host of [node("results"), node("board")]) {
            host.querySelectorAll("button").forEach((el) => el.setAttribute("aria-pressed", String(el.dataset.cloudId === state.selected)));
        }
    }

    function showCloud(cloud, centre) {
        state.selected = cloud.id;
        const detail = node("detail");
        detail.replaceChildren(
            element("h2", cloud.title), element("p", cloud.description),
            element("h3", "Historical significance"), element("p", cloud.significance)
        );
        if (cloud.events.length) {
            const list = element("ul");
            cloud.events.forEach((event) => list.append(element("li", `${event.date}: ${event.description}`)));
            detail.append(element("h3", "Dated events"), list);
        }
        const sources = element("ul");
        for (const source of cloud.sources) {
            const row = element("li");
            const title = element(source.url ? "a" : "strong", source.title);
            if (source.url) title.href = source.url;
            row.append(title, element("p", `${[source.author, source.publicationDate].filter(Boolean).join(" · ")}${source.url ? "" : ` — ${source.reference}`}`),
                element("p", `Supports: ${source.supports}`), element("small", `Added ${formatDate(source.addedAt)}`));
            sources.append(row);
        }
        detail.append(element("h3", "Sources"), sources,
            element("small", `Contributed by ${cloud.contributor} · Added ${formatDate(cloud.createdAt)} · Updated ${formatDate(cloud.updatedAt)}`));
        if (state.canPropose) detail.append(button("Propose a new cloud connected to this one", () => beginProposal(cloud)));
        updatePressed();
        if (centre) {
            const viewport = node("viewport");
            viewport.scrollTo((cloud.position.x + 95) * state.zoom - viewport.clientWidth / 2,
                (cloud.position.y + 50) * state.zoom - viewport.clientHeight / 2);
        }
    }

    function renderSearch() {
        const query = node("search").value.trim().toLowerCase();
        const list = node("results");
        list.replaceChildren();
        for (const cloud of state.clouds.filter((entry) => entry.title.toLowerCase().includes(query))) {
            const li = element("li");
            const link = button(cloud.title, () => showCloud(cloud, true));
            link.dataset.cloudId = cloud.id;
            li.append(link);
            list.append(li);
        }
        if (!list.children.length) list.append(element("li", "No cloud titles match."));
        updatePressed();
    }

    function zoom(value) {
        state.zoom = Math.max(.5, Math.min(1.75, value));
        node("board").style.zoom = state.zoom;
        node("zoom").textContent = `${Math.round(state.zoom * 100)}%`;
        node("zoom-out").disabled = state.zoom === .5;
        node("zoom-in").disabled = state.zoom === 1.75;
    }

    function renderExplore() {
        node("empty").hidden = state.clouds.length !== 0;
        node("clouds").hidden = state.clouds.length === 0;
        if (!state.clouds.length) return;
        const board = node("board");
        board.replaceChildren();
        board.style.width = `${Math.max(390, ...state.clouds.map(({ position }) => position.x + 212))}px`;
        board.style.height = `${Math.max(260, ...state.clouds.map(({ position }) => position.y + 125))}px`;
        for (const cloud of state.clouds) {
            const item = button("", () => showCloud(cloud, false));
            item.className = "kw-cloud";
            item.dataset.cloudId = cloud.id;
            item.style.left = `${cloud.position.x}px`;
            item.style.top = `${cloud.position.y}px`;
            item.append(element("span", cloud.title));
            board.append(item);
        }
        renderSearch();
        node("detail").replaceChildren(element("h2", "Explore a cloud"),
            element("p", "Select a cloud on the canvas or in the title list to read more."));
    }

    const eventFields = [
        ["date", "Date", 10], ["description", "What happened", 500]
    ];
    const sourceFields = [
        ["title", "Source title", 200], ["author", "Author or organisation", 200], ["publicationDate", "Publication date (optional)", 10],
        ["reference", "URL or written reference", 2048], ["supports", "What this source supports", 1000]
    ];

    async function lookupSource(row, lookupButton, status) {
        const reference = row.querySelector('[name="reference"]');
        const url = reference.value.trim();
        const revision = state.revision;
        if (!url) {
            status.textContent = "Enter a webpage URL first.";
            return;
        }
        lookupButton.disabled = true;
        status.textContent = "Looking up source details...";
        try {
            const details = await request("manage/source-metadata", {
                method: "POST", body: JSON.stringify({ url })
            });
            if (revision !== state.revision || !row.isConnected) return;
            if (reference.value.trim() !== url) {
                status.textContent = "The URL changed during the lookup. Please look it up again.";
                return;
            }
            const added = [];
            for (const [key, label] of [["title", "title"], ["author", "author"], ["publicationDate", "publication date"]]) {
                const field = row.querySelector(`[name="${key}"]`);
                if (!field.value.trim() && details[key]) {
                    field.value = details[key];
                    added.push(label);
                }
            }
            if (added.length) state.dirty = true;
            resizeTextareas(row);
            const missing = [["title", "title"], ["author", "author"], ["publicationDate", "publication date"]]
                .filter(([key]) => !row.querySelector(`[name="${key}"]`).value.trim()).map(([, label]) => label);
            status.textContent = (added.length
                ? `Added ${added.join(", ")}. Please check the details and explain what the source supports.`
                : "No new details were added. Existing entries were kept.")
                + (missing.length ? ` Enter missing ${missing.join(", ")} manually.` : "");
        } catch (error) {
            if (revision === state.revision && row.isConnected) status.textContent = `${error.message} You can enter the details manually.`;
        } finally {
            lookupButton.disabled = false;
        }
    }

    function addRow(kind, values = {}, focus = false, hostId = null) {
        const event = kind.includes("event");
        const host = node(hostId || (event ? "events" : "sources"));
        const fields = event ? eventFields : sourceFields;
        if (host.children.length >= 20) {
            node(hostId?.startsWith("proposal") || hostId === "connection-sources" ? "proposal-status" : "save-status").textContent =
                `You can add up to 20 ${event ? "dated events" : "sources"}.`;
            return;
        }
        const row = element("fieldset");
        row.className = "kw-entry";
        row.dataset.id = values.id || "";
        row.append(element("legend", kind === "source" ? "Source" : "Dated event"));
        for (const [key, title, limit] of fields) {
            const label = element("label", title);
            const input = element(key === "date" || key === "publicationDate" ? "input" : "textarea");
            if (input.tagName === "TEXTAREA") input.rows = 1;
            input.name = key;
            input.maxLength = limit;
            input.required = key !== "publicationDate";
            input.value = values[key] || "";
            label.append(input);
            row.append(label);
            if (!event && !hostId && key === "reference") {
                const status = element("p");
                status.setAttribute("role", "status");
                status.setAttribute("aria-live", "polite");
                const lookup = button("Get source details", () => { void lookupSource(row, lookup, status); });
                row.append(lookup, status);
            }
        }
        row.append(button(`Remove ${event ? "event" : "source"}`, () => {
            row.remove();
            if (hostId?.startsWith("proposal") || hostId === "connection-sources") state.proposalDirty = true;
            else state.dirty = true;
        }));
        host.append(row);
        resizeTextareas(row);
        if (focus) {
            state.dirty = true;
            row.querySelector("input, textarea").focus();
        }
    }

    function editCloud(cloud, focus = true) {
        if (state.saving || (state.dirty && !window.confirm("Discard your unsaved changes?"))) return;
        state.editing = cloud;
        state.dirty = false;
        node("save-status").textContent = "";
        form.hidden = false;
        form.reset();
        node("editor-title").textContent = cloud ? "Edit cloud" : "New draft cloud";
        node("metadata").textContent = cloud
            ? `${cloud.publishedAt ? "Published" : "Unpublished draft"} · ${cloud.contributor} · Added ${formatDate(cloud.createdAt)} · Updated ${formatDate(cloud.updatedAt)}`
            : "This cloud will not appear on the shared web until published.";
        for (const key of ["title", "description", "significance"]) mainField(form, key).value = cloud?.[key] || "";
        form.elements.namedItem("x").value = cloud?.position.x ?? 30;
        form.elements.namedItem("y").value = cloud?.position.y ?? 30;
        node("sources").replaceChildren();
        node("events").replaceChildren();
        cloud?.sources.forEach((source) => addRow("source", source));
        cloud?.events.forEach((event) => addRow("event", event));
        node("save").textContent = cloud?.publishedAt ? "Save changes" : "Save draft";
        node("publish").hidden = Boolean(cloud?.publishedAt);
        resizeTextareas(form);
        if (focus) mainField(form, "title").focus();
    }

    function renderManagement() {
        node("drafts").replaceChildren();
        for (const cloud of state.clouds) {
            const row = element("li");
            row.append(button(`${cloud.title} (${cloud.publishedAt ? "Published" : "Draft"})`, () => editCloud(cloud)));
            node("drafts").append(row);
        }
    }

    function setFormValues(target, values) {
        for (const key of ["title", "description", "significance", "connection"]) {
            const field = mainField(target, key);
            if (field) field.value = values[key] ?? "";
        }
    }

    function beginProposal(parent, proposal = null) {
        if (state.proposalDirty && !window.confirm("Discard your unsaved proposal changes?")) return;
        const originalCloud = state.clouds.find((cloud) =>
            cloud.id === (proposal?.originalCloudId || parent?.id || state.selected));
        if (!originalCloud) {
            node("proposal-status").textContent = "The original cloud is no longer available. Choose a published cloud first.";
            return;
        }
        state.editingProposal = proposal;
        state.proposalParentId = originalCloud.id;
        state.proposalDirty = false;
        state.duplicatesAcknowledgedTitle = "";
        proposalForm.reset();
        setFormValues(proposalForm, proposal || {});
        mainField(proposalForm, "connection").value = proposal?.connection || "";
        node("proposal-parent").textContent = `Your original cloud: ${originalCloud.title}`;
        node("proposal-parent-title").textContent = originalCloud.title;
        node("proposal-sources").replaceChildren();
        node("connection-sources").replaceChildren();
        node("proposal-events").replaceChildren();
        proposal?.sources.forEach((source) => addRow("source", source, false, "proposal-sources"));
        proposal?.connectionSources.forEach((source) => addRow("source", source, false, "connection-sources"));
        proposal?.events.forEach((event) => addRow("event", event, false, "proposal-events"));
        node("duplicates").replaceChildren();
        node("duplicates").hidden = true;
        node("proposal-status").textContent = "";
        node("submit-proposal").hidden = ["Submitted", "Approved", "Declined"].includes(proposal?.status);
        node("save-proposal").hidden = ["Submitted", "Approved", "Declined"].includes(proposal?.status);
        node("proposal").hidden = false;
        resizeTextareas(proposalForm);
        mainField(proposalForm, "title").focus();
        node("proposal").scrollIntoView({ block: "start", behavior: "smooth" });
    }

    function sourceList(parent, sources) {
        const list = element("ul");
        for (const source of sources) {
            const entry = element("li");
            entry.append(element(source.url ? "a" : "strong", source.title));
            if (source.url) entry.firstChild.href = source.url;
            entry.append(element("p", `${source.author}${source.publicationDate ? ` · ${source.publicationDate}` : ""} — ${source.supports}`));
            list.append(entry);
        }
        parent.append(list);
    }

    function renderStudentProposals() {
        const host = node("proposal-list");
        host.replaceChildren();
        if (!state.proposals.length) {
            host.append(element("p", "You have not saved or submitted any cloud proposals yet."));
            return;
        }
        for (const proposal of state.proposals) {
            const card = element("article");
            card.className = "kw-entry";
            card.append(element("h3", proposal.title || "Untitled draft"),
                element("p", `Status: ${proposal.status}`),
                element("p", `Original cloud: ${proposal.originalCloudTitle}`),
                element("p", `${proposal.connection || "No connection explanation saved yet."}`),
                element("small", `${proposal.submittedAt ? `Submitted ${formatDate(proposal.submittedAt)}` : "Draft"} · Last updated ${formatDate(proposal.updatedAt)}`));
            if (proposal.teacherComment) card.append(element("p", `Teacher note: ${proposal.teacherComment}`));
            if (proposal.status === "Approved") {
                card.append(element("h4", "Your proposed connection, saved for Phase 3"),
                    element("p", "The cloud is published. This relationship has been preserved as a draft kite; it has not been published."),
                    element("p", proposal.connection));
                sourceList(card, proposal.connectionSources);
            } else if (["Draft", "Returned for Revision"].includes(proposal.status)) {
                card.append(button(proposal.status === "Draft" ? "Continue draft" : "Revise and resubmit",
                    () => beginProposal(null, proposal)));
            } else if (proposal.status === "Submitted") {
                card.append(element("p", "This proposal is with a teacher for cloud publication review. It cannot be edited until returned."));
            }
            host.append(card);
        }
    }

    function renderReviews() {
        const host = node("reviews");
        host.replaceChildren();
        const proposals = state.proposals;
        if (!proposals.length) {
            host.append(element("p", "There are no student cloud proposals yet."));
            return;
        }
        for (const proposal of proposals) {
            const card = element("article");
            card.className = "kw-entry";
            card.append(element("h3", proposal.title || "Untitled draft"),
                element("p", `Status: ${proposal.status} · Contributed by ${proposal.contributor} (${proposal.contributorEmail})`),
                element("p", `Submitted ${formatDate(proposal.submittedAt) || "Not submitted"}`),
                element("p", proposal.description || "No historical description saved."),
                element("h4", "Historical significance"), element("p", proposal.significance || "Not provided."),
                element("h4", "Dated events"));
            const events = element("ul");
            proposal.events.forEach((event) => events.append(element("li", `${event.date}: ${event.description}`)));
            card.append(events, element("h4", "Sources supporting the proposed cloud"));
            sourceList(card, proposal.sources);
            card.append(element("h4", "Connection preserved for the student (not published as a kite)"),
                element("p", `Connected to ${proposal.originalCloudTitle}`),
                element("p", proposal.connection || "No relationship explanation saved."),
                element("h4", "Evidence supporting the proposed connection (not a kite publication review)"));
            sourceList(card, proposal.connectionSources);
            if (proposal.teacherComment) card.append(element("p", `Previous note: ${proposal.teacherComment}`));
            if (proposal.status === "Submitted") {
                const controls = element("div");
                controls.className = "kw-actions";
                controls.append(
                    button("Approve and publish cloud", () => decide(proposal, "approve")),
                    button("Return for revision", () => decide(proposal, "return")),
                    button("Decline proposal", () => decide(proposal, "decline"))
                );
                card.append(controls);
            }
            host.append(card);
        }
    }

    async function decide(proposal, action) {
        const labels = { approve: "Approve and publish this sourced historical cloud? The proposed connection remains private to its student.", return: "Return for revision", decline: "Decline this cloud proposal" };
        let comment = "";
        if (action === "approve") {
            if (!window.confirm(labels[action])) return;
            comment = window.prompt("Optional note for the student (not a grade or assessment).", "") || "";
        } else {
            comment = window.prompt(`${labels[action]}. Add a private note to the student:`, "") || "";
            if (!comment.trim()) {
                node("save-status").textContent = "A private explanation is required to return or decline this proposal.";
                return;
            }
        }
        try {
            await request(`manage/proposals/${proposal.id}/decision`, {
                method: "POST", body: JSON.stringify({ action, comment })
            });
            const result = await request("manage/proposals");
            state.proposals = result.proposals;
            renderReviews();
            if (action === "approve") {
                const clouds = await request("manage/clouds");
                state.clouds = clouds.clouds;
                renderManagement();
            }
            node("save-status").textContent = action === "approve" ? "Cloud published. The student’s proposed connection was preserved but not published."
                : action === "return" ? "Proposal returned to its author for revision."
                    : "Proposal declined. The student was not given a grade.";
        } catch (error) {
            node("save-status").textContent = error.message;
        }
    }

    function entries(id) {
        return [...node(id).children].map((row) => ({
            ...Object.fromEntries([...row.querySelectorAll("input, textarea")].map((input) => [input.name, input.value])),
            ...(row.dataset.id ? { id: row.dataset.id } : {})
        }));
    }

    async function saveProposal(intent, duplicatesAcknowledged = false) {
        const value = (key) => mainField(proposalForm, key).value;
        const title = value("title").trim();
        if (intent === "submit" && !proposalForm.reportValidity()) return;
        const editing = state.editingProposal;
        const revision = state.revision;
        const body = {
            intent, title, description: value("description"), significance: value("significance"),
            connection: value("connection"), originalCloudId: state.proposalParentId,
            events: entries("proposal-events"), sources: entries("proposal-sources"),
            connectionSources: entries("connection-sources"), revision: editing?.revision,
            duplicatesAcknowledged
        };
        if (intent === "submit" && !duplicatesAcknowledged) {
            try {
                const { matches } = await request(`proposals/duplicates?title=${encodeURIComponent(title)}${editing ? `&exclude=${editing.id}` : ""}`);
                if (revision !== state.revision) return;
                state.duplicatesAcknowledgedTitle = "";
                const warnings = node("duplicates");
                warnings.replaceChildren();
                if (matches.length) {
                    warnings.append(element("p", "Possible matching clouds and your own proposals. Check these before continuing; a similar title is a warning, not a rejection."));
                    for (const match of matches) {
                        const entry = element("li");
                        entry.append(element("strong", match.title),
                            element("span", ` — ${match.kind === "cloud" ? "Published cloud" : `Your ${match.status.toLowerCase()} proposal`}`));
                        warnings.append(entry);
                    }
                    warnings.hidden = false;
                    const summary = matches.map((match) => `• ${match.title} (${match.kind === "cloud" ? "published" : match.status.toLowerCase()})`).join("\n");
                    if (!window.confirm(`Possible similar items already exist:\n${summary}\n\nContinue with this proposal anyway?`)) {
                        warnings.focus?.();
                        node("proposal-status").textContent = "Review the possible matches, then select Submit again to continue if this is a different historical topic.";
                        return;
                    }
                } else {
                    warnings.hidden = true;
                }
                body.duplicatesAcknowledged = true;
                return saveProposal(intent, true);
            } catch (error) {
                node("proposal-status").textContent = `Could not check for possible duplicates. Nothing was submitted. ${error.message}`;
                return;
            }
        }
        const saveButton = node("save-proposal");
        const submitButton = node("submit-proposal");
        saveButton.disabled = submitButton.disabled = true;
        proposalForm.inert = true;
        node("proposal-status").textContent = intent === "submit" ? "Submitting for cloud publication review..." : "Saving private draft...";
        let saved = false;
        try {
            const result = await request(`proposals${editing ? `/${editing.id}` : ""}`, {
                method: editing ? "PUT" : "POST", body: JSON.stringify(body)
            });
            if (revision !== state.revision) return;
            saved = true;
            const { proposals } = await request("proposals");
            if (revision !== state.revision) return;
            state.proposals = proposals;
            state.editingProposal = proposals.find((proposal) => proposal.id === result.id);
            state.proposalDirty = false;
            renderStudentProposals();
            if (intent === "draft") {
                node("proposal-status").textContent = "Private draft saved. You can reopen it from My cloud proposals.";
                node("proposal").hidden = true;
            } else {
                node("proposal-status").textContent = "Proposal submitted for factual review of the new cloud. Your proposed connection is saved and has not been published as a kite.";
                node("submit-proposal").hidden = true;
                node("save-proposal").hidden = true;
                if (state.editingProposal) {
                    state.editingProposal.connection = value("connection");
                }
            }
        } catch (error) {
            if (revision !== state.revision) return;
            if (intent === "submit" && error.message.includes("Possible matching") && !duplicatesAcknowledged) {
                node("proposal-status").textContent = `${error.message} Select Submit again to check the latest matches.`;
                return;
            }
            node("proposal-status").textContent = saved
                ? `Your proposal was saved, but its latest status could not be loaded. Reload My cloud proposals before editing again. ${error.message}`
                : error.message;
            if (saved) node("proposal").hidden = true;
        } finally {
            if (revision === state.revision) {
                proposalForm.inert = false;
                saveButton.disabled = submitButton.disabled = false;
            }
        }
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (state.saving) return;
        const publish = event.submitter?.value === "publish";
        if (publish && !window.confirm("Publish this cloud and its sources to the shared Knowledge Web?")) return;
        const editing = state.editing;
        const revision = state.revision;
        const value = (key) => (mainField(form, key) || form.elements.namedItem(key)).value;
        const body = {
            title: value("title"), description: value("description"), significance: value("significance"),
            position: { x: Number(value("x")), y: Number(value("y")) }, events: entries("events"), sources: entries("sources"),
            publish, revision: editing?.revision
        };
        state.saving = true;
        form.inert = true;
        node("save-status").textContent = "Saving...";
        let saved = false;
        try {
            const { id } = await request(`manage/clouds${editing ? `/${editing.id}` : ""}`, {
                method: editing ? "PUT" : "POST", body: JSON.stringify(body)
            });
            if (revision !== state.revision) return;
            saved = true;
            const { clouds } = await request("manage/clouds");
            if (revision !== state.revision) return;
            state.clouds = clouds;
            state.saving = false;
            form.inert = false;
            state.dirty = false;
            renderManagement();
            editCloud(clouds.find((cloud) => cloud.id === id), true);
            node("save-status").textContent = publish ? "Cloud published to the shared web." : "Cloud saved.";
        } catch (error) {
            if (revision !== state.revision) return;
            node("save-status").textContent = saved ? "Saved, but the updated cloud list could not be loaded. Reload before editing again." : error.message;
            if (saved) form.hidden = true;
        } finally {
            if (revision === state.revision) {
                state.saving = false;
                form.inert = false;
            }
        }
    });

    async function load(force = false) {
        const token = getActiveHubBearerToken();
        if (!force && token === state.token) return;
        const revision = ++state.revision;
        state.token = token;
        state.clouds = [];
        state.selected = null;
        state.editing = null;
        state.editingProposal = null;
        state.proposalParentId = null;
        state.canPropose = false;
        state.saving = state.dirty = form.inert = false;
        form.reset();
        form.hidden = true;
        for (const id of ["sources", "events", "drafts", "board", "results", "detail", "reviews", "proposal-list",
            "proposal-sources", "connection-sources", "proposal-events"]) node(id).replaceChildren();
        state.proposals = [];
        state.proposalDirty = false;
        proposalForm.reset();
        proposalForm.inert = false;
        node("proposal").hidden = true;
        node("my-proposals").hidden = true;
        for (const id of ["manage", "explore", "manage-link", "explore-link", "retry"]) node(id).hidden = true;
        node("status").textContent = token ? "Loading the Knowledge Web..." : "Sign in with your school Google account to open the Knowledge Web.";
        if (!token) return;
        try {
            const result = await request(manage ? "manage/clouds" : "clouds");
            let proposals = { proposals: [] };
            if (manage || result.canPropose) {
                proposals = await request(manage ? "manage/proposals" : "proposals");
            }
            if (revision !== state.revision) return;
            state.clouds = result.clouds;
            state.proposals = proposals.proposals;
            node("status").textContent = "";
            if (manage) {
                node("title").textContent = "Manage Knowledge Web clouds";
                node("manage").hidden = false;
                node("explore-link").hidden = false;
                renderManagement();
                renderReviews();
                if (state.clouds.length) editCloud(state.clouds.find((cloud) => !cloud.publishedAt) || state.clouds[0], false);
            } else {
                node("explore").hidden = false;
                node("manage-link").hidden = !result.canManage;
                state.canPropose = result.canPropose;
                node("my-proposals").hidden = !state.canPropose;
                renderStudentProposals();
                renderExplore();
            }
        } catch (error) {
            if (revision !== state.revision) return;
            node("status").textContent = error.message;
            node("retry").hidden = false;
        }
    }

    node("new").addEventListener("click", () => editCloud(null));
    node("add-source").addEventListener("click", () => addRow("source", {}, true));
    node("add-event").addEventListener("click", () => addRow("event", {}, true));
    node("search").addEventListener("input", renderSearch);
    node("zoom-out").addEventListener("click", () => zoom(state.zoom - .25));
    node("zoom-in").addEventListener("click", () => zoom(state.zoom + .25));
    node("reset").addEventListener("click", () => { zoom(1); node("viewport").scrollTo(0, 0); });
    node("retry").addEventListener("click", () => { void load(true); });
    proposalForm.addEventListener("input", (event) => {
        state.proposalDirty = true;
        if (event.target.matches("textarea")) resizeTextareas(event.target.parentElement);
    });
    node("add-proposal-source").addEventListener("click", () => addRow("source", {}, true, "proposal-sources"));
    node("add-connection-source").addEventListener("click", () => addRow("source", {}, true, "connection-sources"));
    node("add-proposal-event").addEventListener("click", () => addRow("event", {}, true, "proposal-events"));
    node("cancel-proposal").addEventListener("click", () => {
        if (state.proposalDirty && !window.confirm("Close this editor and discard unsaved changes?")) return;
        state.proposalDirty = false;
        node("proposal").hidden = true;
    });
    node("save-proposal").addEventListener("click", () => { void saveProposal("draft"); });
    proposalForm.addEventListener("submit", (event) => {
        event.preventDefault();
        void saveProposal("submit");
    });
    form.addEventListener("input", (event) => {
        state.dirty = true;
        if (event.target.matches("textarea")) resizeTextareas(event.target.parentElement);
    });
    window.addEventListener("resize", () => {
        resizeTextareas(form);
        resizeTextareas(proposalForm);
    });
    document.fonts?.ready.then(() => {
        resizeTextareas(form);
        resizeTextareas(proposalForm);
    });
    window.addEventListener("hub-auth-state-changed", () => { void load(); });
    window.addEventListener("beforeunload", (event) => {
        if (state.dirty || state.proposalDirty) { event.preventDefault(); event.returnValue = true; }
    });
    void load();
})();
