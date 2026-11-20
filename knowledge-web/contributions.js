function createKnowledgeContributions({ node, request, element, button, state, showCloud, resizeTextareas, formatDate, onProposalsChanged }) {
    let kites = [], converted = new Set(), active = null, detailSequence = 0, refreshSequence = 0, reportSequence = 0, displayLimit = 12;
    const empty = () => element("p", "Nothing to show yet.");
    const linkTitle = (kite) => `${kite.titleA} ↔ ${kite.titleB}`;
    const send = (path, body, method = "POST") => request(path, { method, body: JSON.stringify(body) });
    const labels = { kite: "Kite", comment: "Comment", evidence: "Evidence" };
    const reasons = { harassment: "Harassment", "personal-information": "Personal information disclosure", spam: "Spam",
        disruption: "Deliberately disruptive content", other: "Other inappropriate behaviour" };
    const stances = { supports: "Supports the argument", challenges: "Challenges the argument", context: "Adds context" };
    const snippet = (value) => value.length > 105 ? `${value.slice(0, 102)}…` : value;

    function select(options, initial, placeholder) {
        const field = element("select");
        if (placeholder) field.append(new Option(placeholder, ""));
        for (const [value, label] of options) field.append(new Option(label, value));
        field.value = initial || "";
        field.required = true;
        return field;
    }

    function labeled(container, label, field) {
        const wrapper = element("label", label);
        wrapper.append(field);
        container.append(wrapper);
        return field;
    }

    function field(container, label, limit, value = "", { optional = false, multiline = false } = {}) {
        const input = element(multiline ? "textarea" : "input");
        input.value = value || "";
        input.maxLength = limit;
        input.required = !optional;
        if (multiline) input.rows = 3;
        return labeled(container, label, input);
    }

    function editor(host, title, submitText, save, cancel = () => host.replaceChildren()) {
        const form = element("form");
        form.className = "kw-entry kw-contribution-form";
        const fields = element("div");
        const status = element("p");
        status.setAttribute("role", "status");
        const submit = element("button", submitText);
        submit.type = "submit";
        const close = button("Cancel", cancel);
        const actions = element("div");
        actions.className = "kw-actions";
        actions.append(submit, close);
        form.append(element("h3", title), fields, actions, status);
        host.replaceChildren(form);
        form.addEventListener("input", () => resizeTextareas(fields));
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (submit.disabled) return;
            const revision = state.revision;
            submit.disabled = close.disabled = true;
            status.textContent = "Saving…";
            try { await save(revision); }
            catch (error) {
                if (revision === state.revision) status.textContent = error.message;
            } finally { submit.disabled = close.disabled = false; }
        });
        return fields;
    }

    function evidenceFields(host, current = {}, initial = false) {
        const title = field(host, "Title or description", 200, current.title);
        const reference = field(host, "URL or written reference (optional)", 2048, current.reference, { optional: true });
        const author = field(host, "Source author or organisation (optional)", 200, current.author, { optional: true });
        const date = field(host, "Publication date (optional; MM-YYYY or DD-MM-YYYY)", 10, current.publicationDate, { optional: true });
        const supports = field(host, "Explain what this evidence supports or challenges", 1000, current.supports, { multiline: true });
        const stance = !initial && labeled(host, "Relationship to this argument", select(Object.entries(stances), current.stance || "supports"));
        return () => ({ title: title.value, reference: reference.value, author: author.value,
            publicationDate: date.value, supports: supports.value, stance: stance ? stance.value : "supports" });
    }

    function openEditor(proposal = null) {
        if (!state.canContribute || state.clouds.length < 2 || (proposal && !state.canPropose)) return;
        const host = node("kite-editor");
        host.hidden = false;
        const fields = editor(host, proposal ? "Publish as Kite" : "Connect Clouds", "Publish kite", async (revision) => {
            if (first.value === second.value) throw new Error("Select two different clouds.");
            const result = await send("kites", { cloudA: first.value, cloudB: second.value,
                argument: argument.value, evidence: sources.map(({ read }) => read()), proposalId: proposal?.id });
            if (revision !== state.revision) return;
            close();
            node("kite-status").textContent = "Kite published.";
            await Promise.all([refresh(), openKite(result.id)]);
        }, close);
        function close() { host.replaceChildren(); host.hidden = true; }
        const choices = state.clouds.map(({ id, title }) => [id, title]);
        const first = labeled(fields, "First cloud", select(choices, proposal?.originalCloudId || state.selected, "Choose a cloud"));
        const second = labeled(fields, "Second cloud", select(choices, proposal?.publishedCloudId, "Choose a different cloud"));
        first.disabled = second.disabled = Boolean(proposal);
        const argument = field(fields, "Connection argument", 4000, proposal?.connection, { multiline: true });
        const sources = [];
        const addSource = (current = {}, focus = false) => {
            const group = element("fieldset");
            group.append(element("legend", "Supporting evidence"));
            const entry = { read: evidenceFields(group, current, true) };
            const remove = button("Remove this evidence", () => {
                if (sources.length === 1) return;
                sources.splice(sources.indexOf(entry), 1);
                group.remove();
                updateSourceControls();
                add.focus();
            });
            entry.remove = remove;
            group.append(remove);
            fields.insertBefore(group, add);
            sources.push(entry);
            updateSourceControls();
            if (focus) group.querySelector("input").focus();
        };
        const add = button("Add another source", () => addSource({}, true));
        function updateSourceControls() {
            sources.forEach(({ remove }) => { remove.disabled = sources.length === 1; });
            add.disabled = sources.length >= 20;
        }
        fields.append(add);
        (proposal?.connectionSources?.length ? proposal.connectionSources : [{}]).forEach((source) => addSource(source));
        resizeTextareas(fields);
        (proposal ? argument : first).focus();
    }

    function drawMap() {
        const board = node("board");
        board.querySelector(".kw-kite-layer")?.remove();
        const count = node("kite-map-note");
        const nearby = kites.filter((kite) => !state.selected || [kite.cloudA, kite.cloudB].includes(state.selected));
        const shown = nearby.filter((kite) => state.positions.has(kite.cloudA) && state.positions.has(kite.cloudB)).slice(0, 24);
        count.textContent = nearby.length > shown.length ? `Showing ${shown.length} of ${nearby.length} related kites on the map. All arguments are in the searchable list.`
            : `${shown.length} kite${shown.length === 1 ? "" : "s"} on the map${state.selected ? " for this cloud" : ""}.`;
        if (!shown.length) return;
        const layer = element("div");
        layer.className = "kw-kite-layer";
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("aria-hidden", "true");
        layer.append(svg);
        const width = Number.parseFloat(board.style.getPropertyValue("--kw-cloud-width"));
        const height = Number.parseFloat(board.style.getPropertyValue("--kw-cloud-height"));
        const boardWidth = Number.parseFloat(board.style.width);
        const boardHeight = Number.parseFloat(board.style.height);
        const placed = [];
        const clouds = [...state.positions.values()];
        const groups = new Map();
        for (const kite of shown) {
            const key = `${kite.cloudA}:${kite.cloudB}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(kite);
        }
        for (const pair of groups.values()) {
            const a = state.positions.get(pair[0].cloudA), b = state.positions.get(pair[0].cloudB);
            const x1 = a.x + width / 2, x2 = b.x + width / 2, y1 = a.y + height / 2, y2 = b.y + height / 2;
            const length = Math.hypot(x2 - x1, y2 - y1) || 1;
            for (const [index, kite] of pair.entries()) {
                const offset = (index - (pair.length - 1) / 2) * 55;
                const midpoint = { x: (x1 + x2) / 2 - (y2 - y1) / length * offset, y: (y1 + y2) / 2 + (x2 - x1) / length * offset };
                const free = (x, y) => x >= 23 && y >= 23 && x <= boardWidth - 23 && y <= boardHeight - 23 &&
                    !clouds.some((cloud) => x > cloud.x - 20 && x < cloud.x + width + 20 && y > cloud.y - 20 && y < cloud.y + height + 20) &&
                    !placed.some((other) => Math.abs(x - other.x) < 46 && Math.abs(y - other.y) < 46);
                let position = free(midpoint.x, midpoint.y) ? midpoint : null;
                if (!position) {
                    let best = Infinity;
                    for (let y = 24; y <= boardHeight - 23; y += 46) {
                        for (let x = 24; x <= boardWidth - 23; x += 46) {
                            const distance = (x - midpoint.x) ** 2 + (y - midpoint.y) ** 2;
                            if (distance < best && free(x, y)) { best = distance; position = { x, y }; }
                        }
                    }
                }
                if (!position) {
                    count.textContent = "Some kites do not fit on this map. All arguments are in the searchable list.";
                    continue;
                }
                const { x, y } = position;
                placed.push(position);
                const string = document.createElementNS(svg.namespaceURI, "polyline");
                string.setAttribute("points", `${x1},${y1} ${x},${y} ${x2},${y2}`);
                svg.append(string);
                const item = button("", () => { void openKite(kite.id); });
                item.className = "kw-kite";
                item.style.left = `${x}px`;
                item.style.top = `${y}px`;
                item.setAttribute("aria-label", `Kite: ${linkTitle(kite)} — ${kite.contributor}: ${snippet(kite.argument)}`);
                item.title = `${kite.contributor}: ${snippet(kite.argument)}`;
                layer.append(item);
            }
        }
        board.prepend(layer);
    }

    function renderList() {
        const query = node("kite-search").value.trim().toLowerCase();
        const matches = kites.filter((kite) => `${linkTitle(kite)} ${kite.contributor} ${kite.argument}`.toLowerCase().includes(query));
        node("kite-list").replaceChildren(...matches.slice(0, displayLimit).map((kite) => {
            const item = element("li");
            item.append(button(`${linkTitle(kite)} — ${kite.contributor}: ${snippet(kite.argument)}`, () => { void openKite(kite.id); }));
            return item;
        }));
        if (!matches.length) {
            const item = element("li", "No matching kites.");
            node("kite-list").append(item);
        }
        node("kite-more").hidden = matches.length <= displayLimit;
    }

    async function refresh() {
        const seq = ++refreshSequence, revision = state.revision;
        try {
            const [shared, own] = await Promise.all([request("kites"), state.canContribute ? request("contributions") : null]);
            if (revision !== state.revision || seq !== refreshSequence) return;
            kites = shared.kites;
            converted = new Set(own?.convertedProposalIds);
            drawMap();
            renderList();
            if (own) {
                const host = node("contribution-list");
                host.replaceChildren();
                if (!own.contributions.length) host.append(empty());
                for (const item of own.contributions) {
                    const row = element("div");
                    row.append(button(`${labels[item.kind]}: ${snippet(item.summary)}`,
                        () => { void openKite(item.kiteId, item.id); }), element("small", ` Updated ${formatDate(item.updatedAt)}`));
                    host.append(row);
                }
                if (state.canPropose) onProposalsChanged();
            }
        } catch (error) {
            if (revision === state.revision && seq === refreshSequence) node("kite-status").textContent = error.message;
        }
    }

    function closeKite() {
        detailSequence++;
        active = null;
        node("kite-detail").replaceChildren();
        node("kite-detail").hidden = true;
    }

    async function openKite(id, focusId) {
        const seq = ++detailSequence, revision = state.revision;
        const host = node("kite-detail");
        active = id;
        host.hidden = false;
        host.replaceChildren(element("p", "Loading argument…"));
        try {
            const result = await request(`kites/${id}`);
            if (revision !== state.revision || seq !== detailSequence) return;
            renderDetail(result);
            (focusId && document.getElementById(`kw-contribution-${focusId}`) || host).focus();
        } catch (error) {
            if (revision !== state.revision || seq !== detailSequence) return;
            host.replaceChildren(element("p", error.message), button("Back to kites", () => { closeKite(); node("kite-search").focus(); }));
            host.focus();
        }
    }

    function renderDetail({ kite, comments, evidence }) {
        const host = node("kite-detail");
        const actionHost = element("div");
        const changed = async (revision, id) => {
            if (revision !== state.revision) return;
            node("kite-status").textContent = "Contribution saved.";
            await Promise.all([refresh(), active === kite.id ? openKite(kite.id, id) : null]);
        };
        const goToCloud = (id) => {
            const cloud = state.clouds.find((item) => item.id === id);
            if (cloud) { showCloud(cloud, true); node("viewport").focus(); }
        };
        const meta = (item) => element("small", `${item.contributor} · ${formatDate(item.createdAt)}${item.createdAt !== item.updatedAt ? ` · Edited ${formatDate(item.updatedAt)}` : ""}`);
        const report = (kind, item) => {
            const fields = editor(actionHost, `Report ${labels[kind].toLowerCase()}`, "Send private report", async (revision) => {
                await send(`kites/${kite.id}/reports`, { kind, targetId: item.id, reason: reason.value, details: details.value });
                if (revision !== state.revision || active !== kite.id) return;
                actionHost.replaceChildren();
                node("kite-status").textContent = "Private report sent. The content stays visible unless a teacher hides it.";
                host.focus();
            });
            fields.append(element("p", "Report behaviour, not disagreement with an interpretation."));
            const reason = labeled(fields, "Reason", select(Object.entries(reasons), "", "Choose a reason"));
            const details = field(fields, "Details (required for Other)", 1000, "", { optional: true, multiline: true });
            reason.focus();
        };
        const compose = (kind, item = null, reply = null) => {
            const fields = editor(actionHost, item ? `Edit ${labels[kind].toLowerCase()}` : reply ? `Reply to ${reply.contributor}` : kind === "evidence" ? "Add evidence" : "Write a comment",
                item ? "Save edit" : "Publish", async (revision) => {
                    const payload = read();
                    const path = item ? `kites/${kite.id}/contributions/${kind}/${item.id}` : `kites/${kite.id}/${kind === "comment" ? "comments" : "evidence"}`;
                    const saved = await send(path, payload, item ? "PUT" : "POST");
                    await changed(revision, saved.id);
                });
            let read;
            if (kind === "evidence") read = evidenceFields(fields, item || {}, item?.initial);
            else {
                const input = field(fields, kind === "kite" ? "Connection argument" : "Comment (citations optional)",
                    kind === "kite" ? 4000 : 3000, item?.argument || item?.body, { multiline: true });
                read = () => kind === "kite" ? { argument: input.value } : { body: input.value, replyTo: reply?.id };
            }
            resizeTextareas(fields);
            fields.querySelector("input,textarea")?.focus();
        };
        const controls = (kind, item) => {
            const actions = element("div");
            actions.className = "kw-actions";
            if (state.canContribute) {
                if (kind === "comment") actions.append(button("Reply", () => compose(kind, null, item)));
                if (item.mine) actions.append(button(`Edit ${labels[kind].toLowerCase()}`, () => compose(kind, item)));
            }
            if (state.canPropose) actions.append(button(`Report ${labels[kind].toLowerCase()}`, () => report(kind, item)));
            return actions;
        };
        const entry = (item) => {
            const row = element("article");
            row.className = "kw-entry";
            row.id = `kw-contribution-${item.id}`;
            row.tabIndex = -1;
            return row;
        };
        host.replaceChildren(element("h3", linkTitle(kite)), meta(kite), element("p", kite.argument),
            button("Back to canvas", () => { closeKite(); node("viewport").focus(); }),
            button(`Open cloud: ${kite.titleA}`, () => goToCloud(kite.cloudA)),
            button(`Open cloud: ${kite.titleB}`, () => goToCloud(kite.cloudB)), controls("kite", kite), actionHost,
            element("h3", "Supporting evidence"));
        if (state.canContribute) host.append(button("Add evidence", () => compose("evidence")));
        if (!evidence.length) host.append(element("p", "No evidence is currently visible for this argument."));
        for (const item of evidence) {
            const row = entry(item);
            const source = element(item.url ? "a" : "strong", item.title);
            if (item.url) { source.href = item.url; source.target = "_blank"; source.rel = "noopener noreferrer"; }
            row.append(source, element("p", [item.author, item.publicationDate, !item.url && item.reference].filter(Boolean).join(" · ")),
                element("p", `${item.initial ? "Original evidence" : stances[item.stance]}: ${item.supports}`), meta(item), controls("evidence", item));
            host.append(row);
        }
        host.append(element("h3", "Discussion"));
        if (state.canContribute) host.append(button("Write a comment", () => compose("comment")));
        if (!comments.length) host.append(empty());
        const byId = new Map(comments.map((item) => [item.id, item]));
        for (const item of comments) {
            const row = entry(item);
            if (item.replyTo) {
                const parent = byId.get(item.replyTo);
                if (parent) row.append(button(`In reply to ${parent.contributor}: ${snippet(parent.body)}`,
                    () => document.getElementById(`kw-contribution-${parent.id}`)?.focus()));
                else row.append(element("small", "In reply to an unavailable comment."));
            }
            row.append(meta(item), element("p", item.body), controls("comment", item));
            host.append(row);
        }
    }

    async function reports() {
        const seq = ++reportSequence, revision = state.revision;
        const status = node("report-status");
        status.textContent = "Loading private reports…";
        try {
            const result = await request("manage/reports");
            if (revision !== state.revision || seq !== reportSequence) return;
            const host = node("report-list");
            host.replaceChildren();
            status.textContent = result.reports.length ? `${result.reports.length} open report(s).` : "No open reports.";
            for (const report of result.reports) {
                const card = element("article"), target = element("div");
                card.className = "kw-entry";
                card.append(element("h3", `${labels[report.kind]}: ${linkTitle(report)}`),
                    element("p", `${reasons[report.reason]} · ${formatDate(report.createdAt)}`),
                    element("p", report.details), element("p", `${report.contributor}: ${report.content}`), target);
                const moderate = (action) => {
                    const fields = editor(target, action === "hide" ? "Hide this contribution" : "Dismiss this report",
                        action === "hide" ? "Confirm hide" : "Confirm dismissal", async (current) => {
                            await send(`manage/reports/${report.id}`, { action, note: note.value });
                            if (current === state.revision) await reports();
                        });
                    if (action === "hide" && report.kind === "kite") fields.append(element("p", "Hiding the kite also hides its discussion and evidence."));
                    const note = field(fields, "Private moderation note", 1000, "", { multiline: true });
                    note.focus();
                };
                card.append(button("Hide contribution", () => moderate("hide")), button("Dismiss report", () => moderate("dismiss")));
                host.append(card);
            }
        } catch (error) {
            if (revision === state.revision && seq === reportSequence) status.textContent = error.message;
        }
    }

    node("connect").addEventListener("click", () => openEditor());
    node("kite-search").addEventListener("input", () => { displayLimit = 12; renderList(); });
    node("kite-more").addEventListener("click", () => { displayLimit += 12; renderList(); });
    node("refresh-kites").addEventListener("click", () => { void refresh(); if (active) void openKite(active); });
    node("refresh-reports").addEventListener("click", () => { void reports(); });
    return {
        drawMap, refresh, reports, openEditor, converted: (id) => converted.has(id),
        reset() {
            kites = []; converted = new Set(); displayLimit = 12; closeKite();
            for (const id of ["kite-list", "kite-editor", "kite-status", "kite-map-note", "contribution-list", "report-list", "report-status"]) node(id).replaceChildren();
            node("kite-editor").hidden = true;
            node("connect").hidden = true;
            node("kite-search").value = "";
        }
    };
}
