(() => {
    "use strict";
    const node = (id) => document.getElementById(`web-${id}`);
    const manage = new URLSearchParams(location.search).get("manage") === "1";
    const form = node("form");
    const state = { clouds: [], selected: null, editing: null, zoom: 1, token: null, revision: 0, dirty: false, saving: false };
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
    function addRow(kind, values = {}, focus = false) {
        const host = node(kind === "source" ? "sources" : "events");
        const fields = kind === "source" ? sourceFields : eventFields;
        if (host.children.length >= 20) {
            node("save-status").textContent = `You can add up to 20 ${kind === "source" ? "sources" : "dated events"}.`;
            return;
        }
        const row = element("fieldset");
        row.className = "kw-entry";
        row.dataset.id = values.id || "";
        row.append(element("legend", kind === "source" ? "Source" : "Dated event"));
        for (const [key, title, limit] of fields) {
            const label = element("label", title);
            const input = element("input");
            input.name = key;
            input.maxLength = limit;
            input.required = key !== "publicationDate";
            input.value = values[key] || "";
            label.append(input);
            row.append(label);
        }
        row.append(button(`Remove ${kind}`, () => {
            row.remove();
            state.dirty = true;
            node(`add-${kind}`).focus();
        }));
        host.append(row);
        if (focus) {
            state.dirty = true;
            row.querySelector("input").focus();
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
        for (const key of ["title", "description", "significance"]) form.elements.namedItem(key).value = cloud?.[key] || "";
        form.elements.namedItem("x").value = cloud?.position.x ?? 30;
        form.elements.namedItem("y").value = cloud?.position.y ?? 30;
        node("sources").replaceChildren();
        node("events").replaceChildren();
        cloud?.sources.forEach((source) => addRow("source", source));
        cloud?.events.forEach((event) => addRow("event", event));
        node("save").textContent = cloud?.publishedAt ? "Save changes" : "Save draft";
        node("publish").hidden = Boolean(cloud?.publishedAt);
        if (focus) form.elements.namedItem("title").focus();
    }

    function renderManagement() {
        node("drafts").replaceChildren();
        for (const cloud of state.clouds) {
            const row = element("li");
            row.append(button(`${cloud.title} (${cloud.publishedAt ? "Published" : "Draft"})`, () => editCloud(cloud)));
            node("drafts").append(row);
        }
    }

    function entries(id) {
        return [...node(id).children].map((row) => ({
            ...Object.fromEntries([...row.querySelectorAll("input")].map((input) => [input.name, input.value])),
            ...(row.dataset.id ? { id: row.dataset.id } : {})
        }));
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (state.saving) return;
        const publish = event.submitter?.value === "publish";
        if (publish && !window.confirm("Publish this cloud and its sources to the shared Knowledge Web?")) return;
        const editing = state.editing;
        const revision = state.revision;
        const value = (key) => form.elements.namedItem(key).value;
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
        state.saving = state.dirty = form.inert = false;
        form.reset();
        form.hidden = true;
        for (const id of ["sources", "events", "drafts", "board", "results", "detail"]) node(id).replaceChildren();
        for (const id of ["manage", "explore", "manage-link", "explore-link", "retry"]) node(id).hidden = true;
        node("status").textContent = token ? "Loading the Knowledge Web..." : "Sign in with your school Google account to open the Knowledge Web.";
        if (!token) return;
        try {
            const result = await request(manage ? "manage/clouds" : "clouds");
            if (revision !== state.revision) return;
            state.clouds = result.clouds;
            node("status").textContent = "";
            if (manage) {
                node("title").textContent = "Manage Knowledge Web clouds";
                node("manage").hidden = false;
                node("explore-link").hidden = false;
                renderManagement();
                if (state.clouds.length) editCloud(state.clouds.find((cloud) => !cloud.publishedAt) || state.clouds[0], false);
            } else {
                node("explore").hidden = false;
                node("manage-link").hidden = !result.canManage;
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
    form.addEventListener("input", () => { state.dirty = true; });
    window.addEventListener("hub-auth-state-changed", () => { void load(); });
    window.addEventListener("beforeunload", (event) => {
        if (state.dirty) { event.preventDefault(); event.returnValue = true; }
    });
    void load();
})();
