function createKnowledgeContributions({ node, request, element, button, state, showCloud, resizeTextareas, formatDate,
    historyPage, exploreUrl, onProposalsChanged, onKitesChanged, layoutPosition, searchResult }) {
    let kites = [], balloons = [], connections = [], converted = new Set(), active = null, activeType = null, detailSequence = 0, refreshSequence = 0, reportSequence = 0;
    const empty = () => element("p", "Nothing to show yet.");
    const linkTitle = (kite) => kite.titleB ? `${kite.titleA} ↔ ${kite.titleB}` : kite.titleA;
    const send = (path, body, method = "POST") => request(path, { method, body: JSON.stringify(body) });
    const labels = { kite: "Kite", balloon: "Balloon", connection: "Connection", cloud: "Cloud", comment: "Comment", evidence: "Evidence" };
    const endpointKey = ({ type, id }) => `${type}:${id}`;
    const connectionTitle = ({ first, second }) => `${first.label} ↔ ${second.label}`;
    const reasons = { harassment: "Harassment", "personal-information": "Personal information disclosure", spam: "Spam",
        disruption: "Deliberately disruptive content", other: "Other inappropriate behaviour" };
    const stances = { supports: "Supports the argument", challenges: "Challenges the argument", context: "Adds context" };
    const snippet = (value) => value.length > 105 ? `${value.slice(0, 102)}…` : value;
    const balloonLabel = (balloon) => balloon.idea ?? balloon.principle;

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

    function openEditor(cloud, proposal = null) {
        if (!state.canContribute || (proposal ? !state.canPropose || state.clouds.length < 2 : !cloud)) return;
        const host = node("kite-editor");
        host.hidden = false;
        const fields = editor(host, proposal ? "Publish as Kite" : "Add a Kite", "Publish kite", async (revision) => {
            const origin = proposal ? { cloudA: proposal.originalCloudId, cloudB: proposal.publishedCloudId, proposalId: proposal.id }
                : { originCloudId: cloud.id };
            const result = await send("kites", { ...origin, argument: argument.value, evidence: sources.map(({ read }) => read()) });
            if (revision !== state.revision) return;
            close();
            if (historyPage) {
                location.assign(exploreUrl({ kite: result.id }));
                return;
            }
            node("kite-status").textContent = "Kite published.";
            await Promise.all([refresh(), openKite(result.id)]);
        }, close);
        function close() { host.replaceChildren(); host.hidden = true; }
        if (proposal) {
            const titles = [proposal.originalCloudId, proposal.publishedCloudId].map((id) => state.clouds.find((entry) => entry.id === id)?.title);
            fields.append(element("p", titles.join(" ↔ ")));
        } else fields.append(element("p", `Originating cloud: ${cloud.title}`));
        const argument = field(fields, proposal ? "Connection argument" : "Idea, observation, question or argument",
            4000, proposal?.connection, { multiline: true });
        if (!proposal) fields.append(element("p", "Evidence is optional. You can also add it after publishing."));
        const sources = [];
        const addSource = (current = {}, focus = false) => {
            const group = element("fieldset");
            group.append(element("legend", "Supporting evidence"));
            const entry = { read: evidenceFields(group, current, true) };
            const remove = button("Remove this evidence", () => {
                if (proposal && sources.length === 1) return;
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
        const add = button("Add a source", () => addSource({}, true));
        function updateSourceControls() {
            sources.forEach(({ remove }) => { remove.disabled = Boolean(proposal && sources.length === 1); });
            add.disabled = sources.length >= 20;
        }
        fields.append(add);
        if (proposal) (proposal.connectionSources.length ? proposal.connectionSources : [{}]).forEach((source) => addSource(source));
        resizeTextareas(fields);
        argument.focus();
    }

    function itemChoices() {
        return [
            ...state.clouds.map(({ id, title }) => ({ type: "cloud", id, label: title })),
            ...kites.map((kite) => ({ type: "kite", id: kite.id, label: `${linkTitle(kite)}: ${snippet(kite.argument)}` }))
        ];
    }

    function itemPicker(fields, label, choices, preset, placeholder) {
        const filter = labeled(fields, `Search ${label.toLowerCase()}`, element("input"));
        filter.type = "search";
        const choice = labeled(fields, label, element("select"));
        choice.required = true;
        function update(current) {
            const query = filter.value.trim().toLowerCase();
            choice.replaceChildren(new Option(placeholder, ""));
            for (const item of choices) {
                const key = endpointKey(item), name = `${labels[item.type]}: ${item.label}`;
                if (key === current || name.toLowerCase().includes(query)) choice.append(new Option(name, key));
            }
            choice.value = current;
        }
        update(preset ? endpointKey(preset) : "");
        filter.addEventListener("input", () => update(choice.value));
        return choice;
    }

    function balloonFields(fields, current = {}) {
        const legacy = current.idea != null;
        const idea = legacy ? field(fields, "Idea", 4000, current.idea, { multiline: true }) : null;
        const principle = field(fields, legacy ? "Theoretical principle" : "Theoretical principle (basket)", 4000, current.principle, { multiline: true });
        if (!legacy) fields.append(element("p", "Name a specific principle, such as data minimisation, rather than a broad area such as privacy."));
        const meaning = legacy ? null : field(fields, "Principle explanation (balloon)", 4000, current.principleExplanation, { multiline: true });
        const explanation = field(fields, legacy ? "How does the principle relate to the idea?" :
            "Why does this principle relate to the originating item? (string)", 4000, current.explanation, { multiline: true });
        return () => ({ ...(legacy ? { idea: idea.value } : { principleExplanation: meaning.value }),
            principle: principle.value, explanation: explanation.value });
    }

    function optionalEvidence(fields) {
        const host = element("div");
        let source;
        const add = button("Add optional evidence", () => {
            source = evidenceFields(host, {}, true);
            host.append(button("Remove optional evidence", () => {
                host.replaceChildren();
                source = undefined;
                add.hidden = false;
                add.focus();
            }));
            add.hidden = true;
            host.querySelector("input")?.focus();
        });
        fields.append(add, host);
        return () => source ? [source()] : [];
    }

    function openBalloonEditor(selected) {
        if (!state.canContribute) return;
        const choices = itemChoices(), host = node("connection-editor");
        closeKite();
        node("cloud-detail").hidden = true;
        host.hidden = false;
        function close() {
            host.replaceChildren();
            host.hidden = true;
            node("cloud-detail").hidden = false;
            node("add-menu").querySelector("summary").focus();
        }
        const fields = editor(host, "Add Hot-Air Balloon", "Publish Balloon", async (revision) => {
            const origin = choices.find((item) => endpointKey(item) === originChoice.value);
            if (!origin) throw new Error("Choose an originating cloud or kite.");
            const result = await send("balloons", { origin, ...read(), evidence: sources() });
            if (revision !== state.revision) return;
            close();
            node("kite-status").textContent = "Balloon published.";
            await refresh();
            if (revision === state.revision && !active && host.hidden && !node("cloud-detail").hidden) {
                locate(mapLocations.get(`balloon:${result.id}`));
                await openBalloon(result.id);
            }
        }, close);
        const originChoice = itemPicker(fields, "Originating item", choices, selected, "Choose a cloud or kite");
        const read = balloonFields(fields);
        const sources = optionalEvidence(fields);
        resizeTextareas(fields);
        if (originChoice.value) fields.querySelector("textarea").focus();
        else originChoice.focus();
    }

    function openConnectionEditor(selected) {
        if (!state.canContribute) return;
        const host = node("connection-editor");
        const choices = [
            ...itemChoices(),
            ...balloons.map((balloon) => ({ type: "balloon", id: balloon.id, label: snippet(balloonLabel(balloon)) }))
        ];
        if (choices.length < 2) {
            node("kite-status").textContent = "Two visible items are needed. Try refreshing if an item was just added.";
            return;
        }
        closeKite();
        node("cloud-detail").hidden = true;
        host.hidden = false;
        const fields = editor(host, "Connect Ideas", "Publish Connection", async (revision) => {
            const first = choices.find((item) => endpointKey(item) === firstSelect.value);
            const second = choices.find((item) => endpointKey(item) === secondSelect.value);
            if (!first || !second || firstSelect.value === secondSelect.value) throw new Error("Choose two different items.");
            const result = await send("connections", { first, second, explanation: explanation.value,
                evidence: source ? [source()] : [] });
            if (revision !== state.revision) return;
            close();
            node("kite-status").textContent = "Connection published.";
            await refresh();
            if (revision === state.revision && !active && host.hidden && !node("cloud-detail").hidden) {
                await openConnection(result.id);
            }
        }, close);
        function close() {
            host.replaceChildren();
            host.hidden = true;
            node("cloud-detail").hidden = false;
        }
        const firstSelect = itemPicker(fields, "First item", choices, selected, "Choose a cloud, kite or balloon");
        const secondSelect = itemPicker(fields, "Second item", choices, null, "Choose a cloud, kite or balloon");
        const explanation = field(fields, "How are these items related?", 4000, "", { multiline: true });
        const sourceHost = element("div");
        let source = null;
        const addSource = button("Add optional evidence", () => {
            source = evidenceFields(sourceHost, {}, true);
            sourceHost.append(button("Remove optional evidence", () => {
                source = null; sourceHost.replaceChildren(); addSource.hidden = false; addSource.focus();
            }));
            addSource.hidden = true;
            sourceHost.querySelector("input").focus();
        });
        fields.append(addSource, sourceHost);
        firstSelect.focus();
    }

    let mapLocations = new Map(), connectionLocations = new Map();
    function locate(position) {
        if (!position) return;
        const viewport = node("viewport");
        viewport.scrollTo(position.x * state.zoom - viewport.clientWidth / 2, position.y * state.zoom - viewport.clientHeight / 2);
    }

    function drawMap() {
        const board = node("board");
        board.querySelector(".kw-kite-layer")?.remove();
        board.querySelector(".kw-string-layer")?.remove();
        mapLocations = new Map();
        connectionLocations = new Map();
        const count = node("kite-map-note");
        const origins = new Set(balloons.filter(({ origin }) => origin.type === "kite").map(({ origin }) => origin.id));
        const shown = kites.filter((kite) => state.positions.has(kite.cloudA) && (!kite.cloudB || state.positions.has(kite.cloudB)))
            .filter((kite, index) => index < 24 || origins.has(kite.id));
        count.textContent = kites.length > shown.length ? `Showing ${shown.length} of ${kites.length} kites on the map. All kites and connections are searchable.`
            : `${shown.length} kite${shown.length === 1 ? "" : "s"} on the map.`;
        const layer = element("div");
        layer.className = "kw-kite-layer";
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("aria-hidden", "true");
        layer.append(svg);
        const width = Number.parseFloat(board.style.getPropertyValue("--kw-cloud-width"));
        const height = Number.parseFloat(board.style.getPropertyValue("--kw-cloud-height"));
        const originalClouds = [...state.basePositions.values()];
        const boardWidth = Math.max(390, ...originalClouds.map(({ x }) => x + width + 22));
        const boardHeight = Math.max(260, ...originalClouds.map(({ y }) => y + height + 68));
        const placed = [];
        const baseKites = new Map();
        let extentX = boardWidth, extentY = boardHeight;
        const grow = (x, y) => { extentX = Math.max(extentX, x); extentY = Math.max(extentY, y); };
        for (const { x, y } of state.positions.values()) grow(x + width + 100, y + height + 100);
        for (const [id, point] of state.positions) mapLocations.set(`cloud:${id}`, { x: point.x + width / 2, y: point.y + height / 2 });
        const groups = new Map();
        for (const kite of shown) {
            const key = `${kite.cloudA}:${kite.cloudB}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(kite);
        }
        for (const pair of groups.values()) {
            const a = state.basePositions.get(pair[0].cloudA), b = state.basePositions.get(pair[0].cloudB);
            const x1 = a.x + width / 2, y1 = a.y + height / 2;
            const x2 = b ? b.x + width / 2 : x1, y2 = b ? b.y + height / 2 : y1;
            const length = Math.hypot(x2 - x1, y2 - y1) || 1;
            for (const [index, kite] of pair.entries()) {
                const offset = (index - (pair.length - 1) / 2) * 55;
                const midpoint = b
                    ? { x: (x1 + x2) / 2 - (y2 - y1) / length * offset, y: (y1 + y2) / 2 + (x2 - x1) / length * offset }
                    : { x: x1 + offset, y: a.y + height + 42 };
                const free = (x, y) => x >= 23 && y >= 23 && x <= boardWidth - 23 && y <= boardHeight - 23 &&
                    !originalClouds.some((cloud) => x > cloud.x - 20 && x < cloud.x + width + 20 && y > cloud.y - 20 && y < cloud.y + height + 20) &&
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
                if (!position && origins.has(kite.id)) position = { x: boardWidth + 32, y: 30 + baseKites.size * 48 };
                if (position) {
                    placed.push(position);
                    baseKites.set(kite.id, position);
                }
                position = layoutPosition("kite", kite.id) || position;
                if (!position) {
                    count.textContent = "Some kites do not fit on this map. All kites and connections are searchable.";
                    continue;
                }
                const { x, y } = position;
                grow(x + 100, y + 100);
                mapLocations.set(`kite:${kite.id}`, position);
                const string = document.createElementNS(svg.namespaceURI, "polyline");
                string.dataset.kite = kite.id;
                string.dataset.clouds = [kite.cloudA, kite.cloudB].filter(Boolean).join(" ");
                const first = mapLocations.get(`cloud:${kite.cloudA}`), second = mapLocations.get(`cloud:${kite.cloudB}`);
                string.setAttribute("points", `${first.x},${first.y} ${x},${y}${second ? ` ${second.x},${second.y}` : ""}`);
                svg.append(string);
                const item = button("", () => { void openKite(kite.id); });
                item.className = "kw-kite";
                item.dataset.layoutType = "kite";
                item.dataset.layoutId = kite.id;
                item.setAttribute("aria-keyshortcuts", "Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight");
                item.style.left = `${x}px`;
                item.style.top = `${y}px`;
                item.setAttribute("aria-label", `Kite: ${linkTitle(kite)} — ${kite.contributor}: ${snippet(kite.argument)}`);
                item.title = `${kite.contributor}: ${snippet(kite.argument)}`;
                layer.append(item);
            }
        }
        const originCounts = new Map();
        const attachmentHits = [];
        for (const balloon of balloons) {
            const key = endpointKey(balloon.origin), anchor = mapLocations.get(key);
            if (!anchor) continue;
            const base = balloon.origin.type === "kite" ? baseKites.get(balloon.origin.id) :
                state.basePositions.get(balloon.origin.id);
            const named = balloon.principleExplanation != null;
            const countKey = `${key}:${named}`;
            const index = originCounts.get(countKey) || 0;
            originCounts.set(countKey, index + 1);
            const start = balloon.origin.type === "cloud" ? width : 60;
            const point = layoutPosition("balloon", balloon.id) || (named ? {
                x: Math.max(55, base.x + start + 35 + index % 4 * 116),
                y: Math.max(60, base.y + 105 + Math.floor(index / 4) * 128)
            } : {
                x: Math.max(34, base.x + start + index % 4 * 72),
                y: Math.max(38, base.y + Math.floor(index / 4) * 86)
            });
            const { x, y } = point;
            grow(x + 100, y + 100);
            mapLocations.set(`balloon:${balloon.id}`, point);
            const string = document.createElementNS(svg.namespaceURI, "polyline");
            string.dataset.balloon = balloon.id;
            string.dataset.origin = key;
            const points = `${anchor.x},${anchor.y} ${x},${y + (named ? 45 : 28)}`;
            string.setAttribute("points", points);
            if (named) attachmentHits.push({ balloon, points });
            svg.append(string);
            const item = button("", () => { void openBalloon(balloon.id); });
            item.className = "kw-balloon";
            item.dataset.layoutType = "balloon";
            item.dataset.layoutId = balloon.id;
            item.setAttribute("aria-label", named ? `Balloon: ${snippet(balloon.principle)}` :
                `Balloon: ${snippet(balloon.idea)}. Principle: ${snippet(balloon.principle)}`);
            item.setAttribute("aria-keyshortcuts", "Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight");
            item.title = named ? `${balloon.principle}: ${snippet(balloon.principleExplanation)}` :
                `${snippet(balloon.idea)} · Principle: ${snippet(balloon.principle)}`;
            if (named) {
                item.classList.add("kw-balloon-named");
                const preview = element("span", snippet(balloon.principleExplanation));
                const basket = element("span", balloon.principle);
                preview.className = "kw-balloon-preview";
                basket.className = "kw-balloon-basket";
                preview.setAttribute("aria-hidden", "true");
                basket.setAttribute("aria-hidden", "true");
                item.append(preview, basket);
            }
            item.style.left = `${x}px`;
            item.style.top = `${y}px`;
            layer.append(item);
        }
        if (balloons.length) count.textContent += ` ${balloons.length} balloon${balloons.length === 1 ? "" : "s"} on the map.`;
        board.style.width = `${extentX}px`;
        board.style.height = `${extentY}px`;
        board.prepend(layer);
        drawConnections(board, svg.namespaceURI, attachmentHits);
        highlightSelection();
    }

    function drawConnections(board, namespace, attachmentHits) {
        const layer = document.createElementNS(namespace, "svg");
        layer.classList.add("kw-string-layer");
        for (const { balloon, points } of attachmentHits) {
            const group = document.createElementNS(namespace, "g");
            group.classList.add("kw-original-attachment");
            group.setAttribute("role", "button");
            group.setAttribute("tabindex", "0");
            group.setAttribute("aria-label", `Original attachment for ${snippet(balloon.principle)}`);
            const line = document.createElementNS(namespace, "polyline");
            line.setAttribute("points", points);
            line.classList.add("kw-string-hit");
            const focusLine = line.cloneNode();
            focusLine.setAttribute("class", "kw-attachment-focus");
            group.append(focusLine, line);
            const open = () => { void openBalloon(balloon.id, "original-relationship"); };
            group.addEventListener("click", open);
            group.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    open();
                }
            });
            layer.append(group);
        }
        const pairs = new Map();
        for (const connection of connections) {
            const keys = [endpointKey(connection.first), endpointKey(connection.second)].sort();
            if (!keys.every((key) => mapLocations.has(key))) continue;
            const pair = keys.join("/");
            if (!pairs.has(pair)) pairs.set(pair, []);
            pairs.get(pair).push(connection);
        }
        for (const [pair, items] of pairs) {
            const keys = pair.split("/");
            const [a, b] = keys.map((key) => mapLocations.get(key));
            const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
            const attachedKite = keys[1].startsWith("kite:") && keys[0].startsWith("cloud:")
                ? kites.find(({ id }) => keys[1] === `kite:${id}`) : null;
            const attachedBalloon = balloons.find(({ id }) => keys.includes(`balloon:${id}`));
            const overlapsAttachment = (attachedKite && [attachedKite.cloudA, attachedKite.cloudB].some((id) => keys[0] === `cloud:${id}`)) ||
                (attachedBalloon && keys.includes(endpointKey(attachedBalloon.origin)));
            for (const [index, connection] of items.entries()) {
                let offset = (index - (items.length - 1) / 2) * 34;
                if (overlapsAttachment) offset += offset < 0 ? -24 : 24;
                const x = (a.x + b.x) / 2 - (b.y - a.y) / length * offset;
                const y = (a.y + b.y) / 2 + (b.x - a.x) / length * offset;
                const d = `M ${a.x} ${a.y} Q ${x} ${y} ${b.x} ${b.y}`;
                const group = document.createElementNS(namespace, "g");
                group.setAttribute("role", "button");
                group.setAttribute("tabindex", "0");
                group.setAttribute("aria-label", `Connection: ${snippet(connection.explanation)}`);
                group.dataset.connection = connection.id;
                group.dataset.endpoints = keys.join(" ");
                for (const className of ["kw-string-line", "kw-string-hit"]) {
                    const path = document.createElementNS(namespace, "path");
                    path.classList.add(className);
                    path.setAttribute("d", d);
                    group.append(path);
                }
                group.addEventListener("click", () => { void openConnection(connection.id); });
                group.addEventListener("keydown", (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void openConnection(connection.id);
                    }
                });
                connectionLocations.set(connection.id, { x: (a.x + 2 * x + b.x) / 4, y: (a.y + 2 * y + b.y) / 4 });
                layer.append(group);
            }
        }
        board.prepend(layer);
    }

    function highlightSelection() {
        const key = activeType ? `${activeType}:${active}` : state.selected ? `cloud:${state.selected}` : "";
        const board = node("board");
        const groups = board.querySelectorAll("[data-connection]");
        const selectedConnection = [...groups].find((group) => group.dataset.connection === active && activeType === "connection");
        const endpoints = selectedConnection?.dataset.endpoints.split(" ") || [];
        for (const item of board.querySelectorAll("[data-layout-type]")) {
            const itemKey = `${item.dataset.layoutType}:${item.dataset.layoutId}`;
            item.setAttribute("aria-pressed", String(itemKey === key));
            item.classList.toggle("kw-linked", endpoints.includes(itemKey));
        }
        for (const string of board.querySelectorAll("polyline[data-kite]")) {
            string.classList.toggle("kw-related", key === `kite:${string.dataset.kite}` ||
                string.dataset.clouds.split(" ").some((id) => key === `cloud:${id}`));
        }
        for (const string of board.querySelectorAll("polyline[data-balloon]")) {
            string.classList.toggle("kw-related", key === `balloon:${string.dataset.balloon}` || key === string.dataset.origin);
        }
        for (const group of groups) {
            group.setAttribute("aria-pressed", String(group === selectedConnection));
            group.classList.toggle("kw-related", group.dataset.endpoints.split(" ").includes(key));
        }
    }

    function searchKites(query) {
        return kites.filter((kite) => `${linkTitle(kite)} ${kite.contributor} ${kite.argument}`.toLowerCase().includes(query))
            .map((kite) => searchResult("Kite", snippet(kite.argument), () => {
                locate(mapLocations.get(`kite:${kite.id}`)); void openKite(kite.id);
            }, `${linkTitle(kite)} · ${kite.contributor}`));
    }

    function searchConnections(query) {
        return connections.filter((item) => `${connectionTitle(item)} ${item.contributor} ${item.explanation}`.toLowerCase().includes(query))
            .map((item) => searchResult("Connection", snippet(item.explanation), () => {
                locate(connectionLocations.get(item.id)); void openConnection(item.id);
            }, item.contributor));
    }

    function searchBalloons(query) {
        return balloons.filter(({ idea, principle, principleExplanation, explanation }) =>
            [idea, principle, principleExplanation, explanation].filter(Boolean).join(" ").toLowerCase().includes(query))
            .map((balloon) => searchResult("Balloon", snippet(balloonLabel(balloon)), () => {
                locate(mapLocations.get(`balloon:${balloon.id}`)); void openBalloon(balloon.id);
            }, balloon.idea != null ? `Principle: ${snippet(balloon.principle)}` : snippet(balloon.principleExplanation)));
    }

    async function refresh() {
        const seq = ++refreshSequence, revision = state.revision;
        try {
            const result = historyPage ? await request("contributions") :
                await Promise.all([request("kites"), request("connections"), request("balloons")]);
            if (revision !== state.revision || seq !== refreshSequence) return;
            if (historyPage) {
                node("history-status").textContent = "";
                converted = new Set(result.convertedProposalIds);
                const host = node("contribution-list");
                host.replaceChildren();
                if (!result.contributions.length) host.append(empty());
                for (const item of result.contributions) {
                    const row = element("div");
                    const link = element("a", `${labels[item.kind]}: ${snippet(item.summary)}`);
                    link.href = exploreUrl({ [item.subject || "kite"]: item.subjectId || item.kiteId, item: item.id });
                    row.append(link, element("small", ` Updated ${formatDate(item.updatedAt)}`));
                    host.append(row);
                }
                if (state.canPropose) onProposalsChanged();
            } else {
                kites = result[0].kites;
                connections = result[1].connections;
                balloons = result[2].balloons;
                drawMap();
                onKitesChanged();
            }
        } catch (error) {
            if (revision === state.revision && seq === refreshSequence) node(historyPage ? "history-status" : "kite-status").textContent = error.message;
        }
    }

    function closeKite() {
        detailSequence++;
        active = null;
        activeType = null;
        node("connection-editor").hidden = true;
        node("connection-editor").replaceChildren();
        node("kite-detail").replaceChildren();
        node("kite-detail").hidden = true;
        node("cloud-detail").hidden = false;
        highlightSelection();
    }

    const openKite = (id, focusId) => openDetail("kite", id, focusId);
    const openConnection = (id, focusId) => openDetail("connection", id, focusId);
    const openBalloon = (id, focusId) => openDetail("balloon", id, focusId);
    async function openDetail(kind, id, focusId) {
        closeKite();
        const seq = ++detailSequence, revision = state.revision;
        const host = node("kite-detail");
        active = id;
        activeType = kind;
        highlightSelection();
        host.setAttribute("aria-label", `Selected ${kind}`);
        node("cloud-detail").hidden = true;
        host.hidden = false;
        const loading = element("p", `Loading ${kind}…`);
        loading.setAttribute("role", "status");
        host.replaceChildren(loading);
        try {
            const result = await request(`${kind}s/${id}`);
            if (revision !== state.revision || seq !== detailSequence) return;
            renderDetail(kind, result);
            (focusId && document.getElementById(`kw-contribution-${focusId}`) || host).focus();
        } catch (error) {
            if (revision !== state.revision || seq !== detailSequence) return;
            host.replaceChildren(element("p", error.message), button("Back to search", () => { closeKite(); node("search").focus(); }));
            host.focus();
        }
    }

    function renderDetail(kind, result) {
        const { comments, evidence } = result, kite = result[kind];
        const isConnection = kind === "connection", isBalloon = kind === "balloon", path = `${kind}s/${kite.id}`;
        const host = node("kite-detail");
        const actionHost = element("div");
        const changed = async (revision, id) => {
            if (revision !== state.revision) return;
            node("kite-status").textContent = "Contribution saved.";
            await Promise.all([refresh(), active === kite.id && activeType === kind ? openDetail(kind, kite.id, id) : null]);
        };
        const goToCloud = (id) => {
            const cloud = state.clouds.find((item) => item.id === id);
            if (cloud) { showCloud(cloud, true); node("detail").focus(); }
        };
        const meta = (item) => element("small", `${item.contributor} · ${formatDate(item.createdAt)}${item.createdAt !== item.updatedAt ? ` · Edited ${formatDate(item.updatedAt)}` : ""}`);
        const report = (kind, item) => {
            const fields = editor(actionHost, `Report ${labels[kind].toLowerCase()}`, "Send private report", async (revision) => {
                await send(`${path}/reports`, { kind, targetId: item.id, reason: reason.value, details: details.value });
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
                    const targetPath = item ? `${path}/contributions/${kind}/${item.id}` : `${path}/${kind === "comment" ? "comments" : "evidence"}`;
                    const saved = await send(targetPath, payload, item ? "PUT" : "POST");
                    await changed(revision, saved.id);
                });
            let read;
            if (kind === "evidence") read = evidenceFields(fields, item || {}, item?.initial);
            else if (kind === "balloon") read = balloonFields(fields, item);
            else {
                const input = field(fields, kind === "connection" ? "Connection explanation" :
                    kind === "kite" ? (kite.cloudB ? "Connection argument" : "Kite idea") : "Comment (citations optional)",
                kind === "comment" ? 3000 : 4000, item?.explanation || item?.argument || item?.body, { multiline: true });
                read = () => kind === "connection" ? { explanation: input.value } : kind === "kite" ?
                    { argument: input.value } : { body: input.value, replyTo: reply?.id };
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
        const top = element("div");
        top.className = "kw-detail-top";
        const back = button("Back to map", () => { closeKite(); node("viewport").focus(); });
        back.className = "kw-text-button";
        top.append(back);
        const actions = controls(kind, kite);
        if (actions.childElementCount) {
            const menu = element("details");
            menu.className = "kw-detail-actions";
            menu.append(element("summary", "Actions"), actions);
            actions.addEventListener("click", () => { menu.open = false; });
            top.append(menu);
        }
        host.replaceChildren(top, element("h2", isBalloon ? "Hot-Air Balloon" : isConnection ? "Connection" : linkTitle(kite)), meta(kite));
        if (isBalloon && kite.idea != null) {
            host.append(element("h3", "Idea"), element("p", kite.idea),
                element("h3", "Theoretical principle"), element("p", kite.principle),
                element("h3", "How the contributor relates them"), element("p", kite.explanation));
        } else if (isBalloon) {
            host.append(element("h3", "Theoretical principle"), element("p", kite.principle),
                element("h3", "Principle explanation"), element("p", kite.principleExplanation));
        } else host.append(element("p", isConnection ? kite.explanation : kite.argument));
        const endpoints = isBalloon ? [kite.origin] : isConnection ? [kite.first, kite.second] :
            [{ type: "cloud", id: kite.cloudA, label: kite.titleA }, ...(kite.cloudB ? [{ type: "cloud", id: kite.cloudB, label: kite.titleB }] : [])];
        const links = element("ul");
        links.className = "kw-endpoint-links";
        for (const endpoint of endpoints) {
            const row = element("li");
            const link = element("a", `${labels[endpoint.type]}: ${endpoint.label}`);
            link.href = exploreUrl({ [endpoint.type]: endpoint.id });
            link.addEventListener("click", (event) => {
                if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                if (endpoint.type === "cloud") goToCloud(endpoint.id);
                else { locate(mapLocations.get(endpointKey(endpoint))); void openDetail(endpoint.type, endpoint.id); }
            });
            row.append(link);
            links.append(row);
        }
        host.append(element("h3", isBalloon ? "Originally connected to" : "Linked items"), links);
        if (isBalloon) {
            if (kite.principleExplanation != null) {
                const relationship = element("h3", "Original relationship explanation");
                relationship.id = "kw-contribution-original-relationship";
                relationship.tabIndex = -1;
                host.append(relationship, element("p", kite.explanation));
            }
            host.append(element("h3", "Connections"));
            const related = element("ul");
            for (const connection of result.connections) {
                const row = element("li");
                const link = element("a", `${connectionTitle(connection)}: ${snippet(connection.explanation)}`);
                link.href = exploreUrl({ connection: connection.id });
                link.addEventListener("click", (event) => {
                    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                    event.preventDefault();
                    locate(connectionLocations.get(connection.id));
                    void openConnection(connection.id);
                });
                row.append(link);
                related.append(row);
            }
            host.append(related.childElementCount ? related : element("p", "No explained connections yet."));
        }
        host.append(actionHost, element("h3", "Supporting evidence"));
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
        if (state.canContribute) {
            const write = button("Write a comment", () => compose("comment"));
            write.className = "kw-primary";
            host.append(write);
        }
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
                            await send(`manage/${report.subject === "kite" ? "reports" : `${report.subject}-reports`}/${report.id}`, { action, note: note.value });
                            if (current === state.revision) await reports();
                        });
                    if (action === "hide" && report.kind === "kite") fields.append(element("p", "Hiding the kite also hides its discussion and evidence."));
                    if (action === "hide" && report.kind === "balloon") fields.append(element("p", "Hiding the balloon also hides its discussion, evidence and connections."));
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

    node("refresh-kites").addEventListener("click", () => { void refresh(); if (active) void openDetail(activeType, active); });
    node("refresh-reports").addEventListener("click", () => { void reports(); });
    return {
        drawMap, highlightSelection, refresh, reports, openEditor, openKite, closeKite, searchKites, searchConnections, openConnection, openConnectionEditor,
        openBalloon, openBalloonEditor, searchBalloons,
        selectedItem: () => activeType ? { type: activeType, id: active } : state.selected ? { type: "cloud", id: state.selected } : null,
        converted: (id) => converted.has(id),
        reset() {
            kites = []; balloons = []; connections = []; converted = new Set(); closeKite();
            mapLocations.clear(); connectionLocations.clear();
            for (const id of ["kite-editor", "kite-status", "kite-map-note", "contribution-list", "history-status", "report-list", "report-status"]) node(id).replaceChildren();
            node("kite-editor").hidden = true;
        }
    };
}
