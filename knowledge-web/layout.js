function createKnowledgeLayout({ node, request, state, redraw }) {
    const viewport = node("viewport");
    const board = node("board");
    let defaults = new Map(), personal = new Map(), editingDefault = false, ready = false, saving = false;
    let preview = null, gesture = null, suppressClick = false;
    const keyOf = ({ type, id }) => `${type}:${id}`;
    const toMap = (rows) => new Map(rows.map((item) => [keyOf(item), { x: item.x, y: item.y }]));
    const status = (message) => { node("layout-status").textContent = message; };
    const clamp = (number, min) => Math.round(Math.min(6000, Math.max(min, number)));
    const bounded = ({ type, named }, x, y) => ({
        x: clamp(x, named ? 55 : type === "balloon" ? 34 : type === "kite" ? 23 : 0),
        y: clamp(y, named ? 60 : type === "balloon" ? 38 : type === "kite" ? 23 : 0)
    });
    const boardItem = (target) => target.closest?.("button[data-layout-type]");
    const fromItem = (item) => ({ type: item.dataset.layoutType, id: item.dataset.layoutId, named: item.classList.contains("kw-balloon-named") });
    const currentPoint = (item) => ({ x: parseFloat(item.style.left), y: parseFloat(item.style.top) });
    const pointerPosition = (event) => {
        const rect = board.getBoundingClientRect();
        return { x: (event.clientX - rect.left) / state.zoom, y: (event.clientY - rect.top) / state.zoom };
    };
    function updateControls() {
        node("reset-layout").disabled = !ready || saving || !!gesture || editingDefault;
        const edit = node("edit-default");
        edit.hidden = !ready || !state.canManage;
        edit.disabled = saving || !!gesture;
        edit.setAttribute("aria-pressed", String(editingDefault));
        edit.textContent = editingDefault ? "Finish editing default layout" : "Edit default layout";
    }

    function position(type, id) {
        const key = `${type}:${id}`;
        return preview?.key === key ? preview.point : (!editingDefault && personal.get(key)) || defaults.get(key);
    }

    function focusItem({ type, id }) {
        board.querySelector(`button[data-layout-type="${type}"][data-layout-id="${CSS.escape(id)}"]`)?.focus();
    }

    async function save(item, point, restoreFocus = false) {
        const key = keyOf(item), revision = state.revision;
        const target = editingDefault ? defaults : personal;
        preview = { key, point };
        saving = true;
        updateControls();
        redraw();
        if (restoreFocus) focusItem(item);
        status("Saving position...");
        try {
            const result = await request(`${editingDefault ? "manage/default-layout" : "layout"}/${item.type}/${item.id}`, {
                method: "PUT", body: JSON.stringify(point)
            });
            if (revision !== state.revision) return;
            target.set(key, result);
            status(editingDefault ? "Default position saved." : "Personal position saved.");
        } catch (error) {
            if (revision === state.revision) status(`Position not saved. ${error.message}`);
        } finally {
            if (revision === state.revision) {
                saving = false;
                preview = null;
                const focused = boardItem(document.activeElement);
                redraw();
                if (focused && !focused.isConnected) focusItem(fromItem(focused));
                updateControls();
            }
        }
    }

    function cancelGesture() {
        const previous = gesture;
        gesture = null;
        preview = null;
        board.classList.remove("kw-dragging");
        if (previous && viewport.hasPointerCapture(previous.pointerId)) viewport.releasePointerCapture(previous.pointerId);
        updateControls();
        return previous;
    }

    viewport.addEventListener("pointerdown", (event) => {
        if (!event.isPrimary || event.button !== 0 || gesture) return;
        suppressClick = false;
        const item = boardItem(event.target);
        if (!ready || saving || !item) return;
        const pointer = pointerPosition(event), start = currentPoint(item);
        gesture = { item: fromItem(item), pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY,
            dx: start.x - pointer.x, dy: start.y - pointer.y, moved: false };
        updateControls();
    });
    viewport.addEventListener("pointermove", (event) => {
        if (gesture?.pointerId !== event.pointerId) return;
        if (!gesture.moved && Math.hypot(event.clientX - gesture.clientX, event.clientY - gesture.clientY) < 6) return;
        if (!gesture.moved) {
            gesture.moved = true;
            suppressClick = true;
            viewport.setPointerCapture(event.pointerId);
            board.classList.add("kw-dragging");
        }
        const pointer = pointerPosition(event);
        preview = { key: keyOf(gesture.item), point: bounded(gesture.item, pointer.x + gesture.dx, pointer.y + gesture.dy) };
        redraw();
    });
    window.addEventListener("pointerup", (event) => {
        if (gesture?.pointerId !== event.pointerId) return;
        const point = preview?.point;
        const { item } = cancelGesture();
        if (point) void save(item, point);
    });
    for (const type of ["pointercancel", "lostpointercapture"]) {
        viewport.addEventListener(type, (event) => {
            if (gesture?.pointerId !== event.pointerId) return;
            if (cancelGesture().moved) redraw();
        });
    }
    viewport.addEventListener("click", (event) => {
        if (suppressClick && event.detail !== 0) {
            suppressClick = false;
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    }, true);

    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    viewport.addEventListener("keydown", (event) => {
        const item = boardItem(event.target);
        const direction = arrows[event.key];
        if (!item || !event.shiftKey || !direction) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!ready || saving || gesture) return;
        const target = fromItem(item), point = currentPoint(item);
        void save(target, bounded(target, point.x + 24 * direction[0], point.y + 24 * direction[1]), true);
    });

    node("edit-default").addEventListener("click", () => {
        if (!ready || !state.canManage || saving || gesture) return;
        editingDefault = !editingDefault;
        updateControls();
        redraw();
        status(editingDefault ? "Editing the shared default. Each move changes the starting layout for all users."
            : "Back to your personal layout.");
    });
    node("reset-layout").addEventListener("click", async () => {
        if (!ready || saving || gesture || editingDefault || !window.confirm("Clear your personal positions and restore the shared default layout?")) return;
        const revision = state.revision;
        saving = true;
        updateControls();
        try {
            const result = await request("layout", { method: "DELETE" });
            if (revision !== state.revision) return;
            personal.clear();
            defaults = toMap(result.defaults);
            redraw();
            status("Default layout restored.");
        } catch (error) {
            if (revision === state.revision) status(`Layout not reset. ${error.message}`);
        } finally {
            if (revision === state.revision) { saving = false; updateControls(); }
        }
    });

    return {
        position,
        reset() {
            ready = saving = editingDefault = suppressClick = false;
            defaults = new Map();
            personal = new Map();
            cancelGesture();
            status("");
        },
        async load() {
            const revision = state.revision;
            try {
                const result = await request("layout");
                if (revision !== state.revision) return;
                defaults = toMap(result.defaults);
                personal = toMap(result.personal);
                ready = true;
                updateControls();
                redraw();
            } catch (error) {
                if (revision === state.revision) status(`Saved layout could not be loaded. ${error.message}`);
            }
        }
    };
}
