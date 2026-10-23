(() => {
    "use strict";
    const B = window.ActivityBlocks;
    const e = B.escape;
    function mount(host, { blocks, onChange, onUpload, readOnly = false }) {
        let draft = structuredClone(blocks);
        let uploading = false;
        const controller = new AbortController();
        const field = (id, label, value, rows = 3) => `<label>${label}<textarea data-field="${id}" rows="${rows}">${e(value || "")}</textarea></label>`;
        function read() {
            host.querySelectorAll("[data-block-id]").forEach((card) => {
                const b = draft.find((item) => item.id === card.dataset.blockId);
                card.querySelectorAll("[data-field]").forEach((input) => {
                    const key = input.dataset.field;
                    b[key] = input.type === "checkbox" ? input.checked : key === "options"
                        ? input.value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean) : input.value;
                });
            });
            return structuredClone(draft);
        }
        function render() {
            host.innerHTML = `<div class="block-palette" role="group" aria-label="Add a content block">${Object.entries(B.types).map(([kind, title]) =>
                `<button class="button button-secondary" type="button" data-add-block="${kind}">${e(title)} +</button>`).join("")}</div>
                <div class="block-editor-list">${draft.map((b, i) => `<section class="block-editor-card" data-block-id="${e(b.id)}">
                    <div class="block-editor-heading"><h3>${i + 1}. ${e(B.types[b.kind])}</h3><div>
                        <button type="button" data-move="-1" ${i === 0 ? "disabled" : ""} aria-label="Move block ${i + 1} up">Up</button>
                        <button type="button" data-move="1" ${i === draft.length - 1 ? "disabled" : ""} aria-label="Move block ${i + 1} down">Down</button>
                        <button type="button" data-remove-block aria-label="Remove block ${i + 1}">Remove</button>
                    </div></div>
                    ${field("title", "Heading / label (optional)", b.title, 1)}
                    ${["text", "tasks", "question", "checkbox", "table"].includes(b.kind) ? field("text",
                        b.kind === "tasks" ? "Tasks — one per line" : b.kind === "question" ? "Question prompt" : b.kind === "table" ? "Table — first row is headings; separate cells with |" : "Text / instructions", b.text) : ""}
                    ${["image", "resource", "link", "document"].includes(b.kind) ? field("url",
                        b.kind === "document" ? "Google Docs template link — shared with students" : "Full HTTPS link", b.url, 2) : ""}
                    ${b.kind === "resource" ? `<label>Upload resource from your computer (max 15 MB)<input type="file" data-resource-upload accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.webp"></label><p>Uploads go to your Google Drive and are shared read-only with school accounts. Only upload resources you have permission to share. Save Activity Details after uploading.</p>` : ""}
                    ${b.kind === "image" ? field("alt", "Alternative text (required)", b.alt, 2) + field("caption", "Caption", b.caption, 2) + field("attribution", "Attribution / licence", b.attribution, 2) : ""}
                    ${b.kind === "document" ? field("fileName", "Student document name (optional)", b.fileName, 1) + "<p>Creates or reopens the student's copy in their course KITS folder. A created copy does not verify the work inside.</p>" : ""}
                    ${b.kind === "question" ? `<label>Answer type<select data-field="questionType">${["short-answer", "multiple-choice", "checklist"].map((type) =>
                        `<option value="${type}" ${b.questionType === type ? "selected" : ""}>${e(type)}</option>`).join("")}</select></label>
                        ${field("options", "Choice/checklist options — one per line", (b.options || []).join("\n"))}<p>Written answers are checked for presence, not correctness. Required checklists need all options checked.</p>` : ""}
                    ${["wordsearch", "crossword"].includes(b.kind) ? field("entries", b.kind === "crossword" ? "One ANSWER | Clue per line" : "One word per line", b.entries, 6) + "<p>Use 1–15 unique words, each 2–15 letters (A–Z), without spaces. Word searches run across or down; crosswords generate a shared letter grid where possible.</p>" : ""}
                    ${b.kind === "table" ? `<label><input type="checkbox" data-field="editable" ${b.editable ? "checked" : ""}> Students fill in answer rows</label>
                        <label>Number of answer rows (1–15)<input type="number" data-field="rows" value="${e(b.rows || 3)}" min="1" max="15"></label>` : ""}
                    ${B.interactive.includes(b.kind) ? `<label><input type="checkbox" data-field="required" ${b.required ? "checked" : ""}> Required for automatic tick</label>` : ""}
                </section>`).join("")}</div><p class="block-editor-message" role="status"></p>`;
            if (readOnly) host.querySelectorAll("button,input,textarea,select").forEach((n) => { n.disabled = true; });
        }
        host.addEventListener("input", () => { read(); onChange(); }, { signal: controller.signal });
        host.addEventListener("change", async (event) => {
            if (!event.target.matches("[data-resource-upload]")) { read(); onChange(); return; }
            const file = event.target.files[0];
            if (!file || uploading) return;
            const b = draft.find((item) => item.id === event.target.closest("[data-block-id]").dataset.blockId);
            const message = host.querySelector(".block-editor-message");
            uploading = true;
            event.target.disabled = true;
            message.textContent = "Uploading and sharing your resource…";
            try {
                read();
                const uploaded = await onUpload(file);
                read();
                b.url = uploaded.url;
                if (!b.title) b.title = uploaded.name;
                render();
                host.querySelector(".block-editor-message").textContent = "Resource uploaded. Save Activity Details to keep its link.";
                onChange();
            } catch (error) {
                message.textContent = error.message;
                event.target.disabled = false;
            } finally { uploading = false; }
        }, { signal: controller.signal });
        host.addEventListener("click", (event) => {
            const button = event.target.closest("button");
            if (!button || uploading || readOnly) return;
            read();
            if (button.dataset.addBlock) {
                const kind = button.dataset.addBlock;
                draft.push({ id: `b-${crypto.randomUUID()}`, kind, title: "", text: "", questionType: "short-answer", options: [], required: B.interactive.includes(kind) });
            } else {
                const card = button.closest("[data-block-id]");
                if (!card) return;
                const index = draft.findIndex((b) => b.id === card.dataset.blockId);
                if (button.hasAttribute("data-remove-block")) draft.splice(index, 1);
                else if (button.dataset.move) {
                    const target = index + Number(button.dataset.move);
                    if (target < 0 || target >= draft.length) return;
                    [draft[index], draft[target]] = [draft[target], draft[index]];
                }
            }
            render();
            onChange();
        }, { signal: controller.signal });
        render();
        return { read, isUploading: () => uploading, destroy: () => controller.abort() };
    }
    window.ActivityBlockEditor = { mount };
})();
