(() => {
    "use strict";
    const B = window.ActivityBlocks, e = B.escape;
    function markup(blocks, answers, readOnly, { renderImage, unityEditor } = {}) {
        return blocks.map((b) => {
            const value = answers[b.id];
            const disabled = readOnly ? "disabled" : "";
            const link = B.safeUrl(b.url);
            let body = "";
            if (b.kind === "text" && b.numbered !== true) body = `<p class="activity-block-text">${e(b.text)}</p>`;
            if (b.kind === "tasks" || (b.kind === "text" && b.numbered === true)) body = `<ol>${String(b.text || "").split(/\r?\n/).filter((s) => s.trim()).map((s) => `<li class="activity-block-text">${e(s.trim().replace(/^\d+[.)]\s+/, ""))}</li>`).join("")}</ol>`;
            if (unityEditor && b.id === "unity-editor-version") body += `
                <aside aria-label="Teacher-managed Unity Editor version">
                    <p>Required Unity Editor Version <small>(Teacher managed)</small></p>
                    <p class="activity-block-text"><strong style="font-size:1.5em">${e(unityEditor.version)}</strong></p>
                    <p>Always select the version displayed here.</p>
                    ${unityEditor.notes?.trim() ? `<h3>Additional installation notes</h3><p class="activity-block-text">${e(unityEditor.notes)}</p>` : ""}
                </aside>`;
            if (unityEditor && b.id === "unity-editor-modules") body += `
                <aside aria-label="Teacher-managed installation modules">
                    <h3>Required Installation Modules <small>(Teacher managed)</small></h3>
                    <p class="activity-block-text">${e(unityEditor.modules?.trim() || "No additional modules specified by your teacher.")}</p>
                </aside>`;
            if (b.kind === "studentlink") {
                const studentLink = B.studentUrl(value, b.driveOnly, b.driveFolderOnly);
                body = `${b.text ? `<p class="activity-block-text">${e(b.text)}</p>` : ""}
                    <label>${b.driveFolderOnly ? e(b.title) : "Your link"}<input type="url" data-student-link maxlength="5000" aria-invalid="${Boolean(typeof value === "string" && value.trim()) && !studentLink}" placeholder="${b.driveFolderOnly ? "https://drive.google.com/drive/folders/..." : "https://..."}" value="${e(typeof value === "string" ? value : "")}" ${disabled}></label>
                    <p class="activity-block-status" data-link-status role="status">${b.driveFolderOnly ? "Paste a Google Drive folder HTTPS link, not a file link. This checks the URL only, not sharing permissions or project contents." : b.driveOnly ? "Paste a Google Drive or Google Docs HTTPS link. This checks the URL only, not sharing permissions or completed work." : value && !studentLink ? "Enter a full HTTPS link, without a username or password in the URL." : "Paste one HTTPS link. This checks the URL only, not sharing permissions or completed work."}</p>
                    <a class="worksheet-btn worksheet-btn-secondary" data-open-student-link ${studentLink ? `href="${e(studentLink)}"` : "hidden"} target="_blank" rel="noopener noreferrer">Open Link &#8599;</a>`;
            }
            if (b.kind === "image") body = link ? (renderImage ? renderImage(b) : `<figure><img src="${e(link)}" alt="${e(b.alt)}" loading="lazy"><figcaption>${e(b.caption)}${b.attribution ? `<br>${e(b.attribution)}` : ""}</figcaption></figure>`) : "<p>Enter an HTTPS image link to preview.</p>";
            if (["link", "resource"].includes(b.kind)) body = link
                ? `<a class="worksheet-btn worksheet-btn-secondary" href="${e(link)}" target="_blank" rel="noopener noreferrer">${e(b.title || (b.kind === "resource" ? "Open resource" : "Open website"))} &#8599;</a>`
                : "<p>Enter an HTTPS link to preview.</p>";
            if (b.kind === "checkbox") body = `<label><input type="checkbox" data-answer ${value === true ? "checked" : ""} ${disabled}> ${e(b.text)}</label>`;
            if (b.kind === "schoollicence") body = `<p class="activity-block-text">${e(b.text)}</p>
                <button type="button" class="worksheet-btn worksheet-btn-secondary" data-view-school-licence aria-expanded="false" aria-controls="licence-${e(b.id)}">View School Licence</button>
                <div id="licence-${e(b.id)}" data-school-licence-viewer hidden>
                    <p class="activity-block-text" data-school-licence-value></p>
                    <button type="button" class="worksheet-btn worksheet-btn-secondary" data-copy-school-licence hidden>Copy Licence</button>
                    <button type="button" class="worksheet-btn worksheet-btn-secondary" data-hide-school-licence>Hide School Licence</button>
                </div>
                <p class="activity-block-status" data-school-licence-status role="status"></p>`;
            if (b.kind === "question") {
                body = `<p class="activity-block-text">${e(b.text)}</p>`;
                if (b.questionType === "short-answer" || !b.questionType) body += `<label>Your answer<textarea data-answer ${disabled}>${e(value || "")}</textarea></label>`;
                else body += (b.options || []).map((option, i) => `<label><input type="${b.questionType === "checklist" ? "checkbox" : "radio"}" name="block-${e(b.id)}" data-option="${i}" ${b.questionType === "checklist" ? (Array.isArray(value) && value.includes(option) ? "checked" : "") : value === option ? "checked" : ""} ${disabled}> ${e(option)}</label>`).join("");
                if (renderImage && Array.isArray(b.images)) body = b.images.map(renderImage).join("") + body;
            }
            if (b.kind === "table") {
                const rows = String(b.text || "").split(/\r?\n/).filter((s) => s.trim()).map((s) => s.split("|").map((c) => c.trim()));
                const headings = rows.shift() || [];
                body = `<div class="activity-block-table"><table><caption>${e(b.title || "Activity table")}</caption><thead><tr>${headings.map((h) => `<th scope="col">${e(h)}</th>`).join("")}</tr></thead><tbody>${
                    (b.editable ? Array.from({ length: Math.min(15, Math.max(1, Number(b.rows) || 3)) }, () => headings.map(() => "")) : rows).map((row, r) =>
                        `<tr>${row.map((cell, c) => `<td>${b.editable ? `<input type="text" aria-label="${e(headings[c])}, row ${r + 1}" data-row="${r}" data-col="${c}" value="${e(value?.[r]?.[c] || "")}" ${disabled}>` : e(cell)}</td>`).join("")}</tr>`
                    ).join("")}</tbody></table></div>`;
            }
            if (b.kind === "document") body = `<p>Create or reopen your own Google Docs copy in your course KITS folder.</p><button type="button" class="worksheet-btn worksheet-btn-primary" data-create-document ${disabled}>Create / Open My Document</button><p class="activity-block-status" role="status">Creating a copy does not verify the work inside it.</p>`;
            if (["wordsearch", "crossword"].includes(b.kind)) {
                try {
                    B.validate({ blocks: [b] });
                    const puzzle = B.puzzle(b);
                    body = `<p>${b.kind === "wordsearch" ? "Find each word. Select its first letter, then its last letter. Use Tab and Enter with a keyboard. Words run across or down, forwards or backwards." : "Fill the crossword grid using the numbered clues below. Answers use letters A–Z only."}</p>
                        <div class="block-puzzle-scroll"><div class="block-puzzle-grid" style="grid-template-columns:repeat(${puzzle.grid[0].length},32px)">${puzzle.grid.map((row, r) => row.map((letter, c) => {
                            const number = puzzle.placed.find((p) => p.cells[0][0] === r && p.cells[0][1] === c)?.number;
                            if (b.kind === "wordsearch") return `<button type="button" data-cell="${r}-${c}" aria-label="Row ${r + 1}, column ${c + 1}, ${letter}" ${disabled}>${letter}</button>`;
                            return letter ? `<span class="block-crossword-cell">${number ? `<small>${number}</small>` : ""}<input type="text" maxlength="1" autocomplete="off" spellcheck="false" data-cell="${r}-${c}" aria-label="Row ${r + 1}, column ${c + 1}${number ? `, clue ${number}` : ""}" value="${e(value?.[`${r}-${c}`] || "")}" ${disabled}></span>` : '<span class="crossword-blank" aria-hidden="true"></span>';
                        }).join("")).join("")}</div></div>
                        ${b.kind === "wordsearch" ? `<p>Words: ${puzzle.placed.map((p) => e(p.word)).join(", ")}</p>` : `<ul>${puzzle.placed.map((p) => `<li>${p.number} ${p.direction}: ${e(p.clue)}</li>`).join("")}</ul>`}
                        <p class="activity-block-status" role="status"></p>`;
                } catch (error) { body = `<p class="activity-block-status">${e(error.message)}</p>`; }
            }
            return `<section class="activity-content-block" data-content-block="${e(b.id)}">${b.title ? `<h2>${e(b.title)}</h2>` : `<h2>${e(B.types[b.kind])}</h2>`}${b.required ? '<p class="typing-note">Required in automatic-tick activities</p>' : ""}${body}</section>`;
        }).join("");
    }
    function bind(host, blocks, options) {
        const answers = structuredClone(options.answers || {});
        function changed(b, value) { answers[b.id] = value; options.onChange?.(structuredClone(answers)); }
        blocks.forEach((b) => {
            const section = [...host.querySelectorAll("[data-content-block]")].find((node) => node.dataset.contentBlock === b.id);
            if (!section) return;
            if (b.kind === "schoollicence") {
                const view = section.querySelector("[data-view-school-licence]");
                const viewer = section.querySelector("[data-school-licence-viewer]");
                const value = section.querySelector("[data-school-licence-value]");
                const copy = section.querySelector("[data-copy-school-licence]");
                const status = section.querySelector("[data-school-licence-status]");
                let revision = 0;
                let serial = "";
                view.addEventListener("click", async () => {
                    if (!viewer.hidden) return;
                    const current = ++revision;
                    view.disabled = true;
                    status.textContent = "Loading school licence...";
                    try {
                        if (!options.onSchoolLicence) throw new Error("Open the activity from the kit to view the current school licence.");
                        const licence = await options.onSchoolLicence(b.id);
                        if (current !== revision || !section.isConnected) return;
                        serial = licence.activationMethod === "serial" ? licence.value || "" : "";
                        value.textContent = licence.value || "School licence information is not yet available. Please ask your teacher.";
                        copy.hidden = !serial;
                        viewer.hidden = false;
                        view.hidden = true;
                        view.setAttribute("aria-expanded", "true");
                        status.textContent = "";
                    } catch (error) {
                        if (current === revision && section.isConnected) status.textContent = error.message || "Could not load school licence information. Please retry.";
                    } finally { if (current === revision) view.disabled = false; }
                });
                section.querySelector("[data-hide-school-licence]").addEventListener("click", () => {
                    revision += 1;
                    serial = "";
                    value.textContent = "";
                    copy.hidden = true;
                    viewer.hidden = true;
                    view.hidden = false;
                    view.setAttribute("aria-expanded", "false");
                    status.textContent = "";
                    view.focus();
                });
                copy.addEventListener("click", async () => {
                    const current = revision;
                    try {
                        if (!serial) return;
                        await navigator.clipboard.writeText(serial);
                        if (current === revision) status.textContent = "Licence copied. Paste it into Unity Hub to activate.";
                    } catch (error) {
                        if (current === revision) status.textContent = "Could not copy the licence. Select the displayed serial number and copy it manually.";
                    }
                });
                return;
            }
            if (options.readOnly) return;
            section.addEventListener("input", (event) => {
                const input = event.target;
                if (b.kind === "crossword" && input.matches("input[data-cell]")) {
                    input.value = input.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 1);
                    changed(b, { ...answers[b.id], [input.dataset.cell]: input.value });
                } else if (b.kind === "table" && input.dataset.row !== undefined) {
                    const rows = Array.from({ length: Math.min(15, Math.max(1, Number(b.rows) || 3)) }, (_, r) =>
                        [...section.querySelectorAll(`input[data-row="${r}"]`)].map((cell) => cell.value));
                    changed(b, rows);
                } else if (b.kind === "studentlink" && input.matches("[data-student-link]")) {
                    const url = B.studentUrl(input.value, b.driveOnly, b.driveFolderOnly);
                    const open = section.querySelector("[data-open-student-link]");
                    open.hidden = !url;
                    if (url) open.href = url;
                    else open.removeAttribute("href");
                    input.setAttribute("aria-invalid", String(Boolean(input.value.trim()) && !url));
                    section.querySelector("[data-link-status]").textContent = b.driveFolderOnly
                        ? "Paste a Google Drive folder HTTPS link, not a file link. This checks the URL only, not sharing permissions or project contents."
                        : b.driveOnly
                        ? "Paste a Google Drive or Google Docs HTTPS link. This checks the URL only, not sharing permissions or completed work."
                        : input.value.trim() && !url
                            ? "Enter a full HTTPS link, without a username or password in the URL."
                            : "Paste one HTTPS link. This checks the URL only, not sharing permissions or completed work.";
                    changed(b, input.value);
                } else if (b.kind === "checkbox") changed(b, input.checked);
                else if (b.kind === "question") {
                    const value = b.questionType === "checklist" ? [...section.querySelectorAll("[data-option]:checked")].map((n) => b.options[Number(n.dataset.option)])
                        : b.questionType === "multiple-choice" ? b.options[Number(input.dataset.option)] : input.value;
                    changed(b, value);
                    if (b.responseKey) options.onLegacyChange?.(b.responseKey, value);
                }
            });
            if (b.kind === "document") section.querySelector("[data-create-document]").addEventListener("click", async (event) => {
                const button = event.currentTarget, status = section.querySelector("[role=status]");
                const tab = window.open("about:blank", "_blank");
                if (tab) tab.opener = null;
                button.disabled = true;
                status.textContent = "Creating or opening your document…";
                try {
                    const result = await options.onDocument(b.id);
                    if (!B.safeUrl(result.documentUrl)) throw new Error("Your document link was not returned. Please retry.");
                    if (tab && !tab.closed) tab.location.replace(result.documentUrl);
                    status.textContent = "Your document is ready. ";
                    const a = document.createElement("a");
                    a.href = result.documentUrl; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = "Open my document";
                    status.appendChild(a);
                } catch (error) {
                    if (tab && !tab.closed) tab.close();
                    status.textContent = error.message;
                } finally { button.disabled = false; }
            });
            if (b.kind === "wordsearch" && section.querySelector("button[data-cell]")) {
                let first = null;
                const status = section.querySelector("[role=status]");
                const puzzle = B.puzzle(b);
                const selections = (Array.isArray(answers[b.id]) ? answers[b.id] : []).filter((pair) =>
                    Array.isArray(pair) && pair.length === 2 && pair.every((point) => Array.isArray(point) && point.length === 2 &&
                        point.every((n) => Number.isInteger(n) && n >= 0 && n < 18))).slice(0, 15);
                function paint() {
                    section.querySelectorAll("[data-cell]").forEach((node) => {
                        const [r, c] = node.dataset.cell.split("-").map(Number);
                        node.classList.toggle("is-found", selections.some(([[sr, sc], [er, ec]]) =>
                            r >= Math.min(sr, er) && r <= Math.max(sr, er) && c >= Math.min(sc, ec) && c <= Math.max(sc, ec)));
                        node.classList.toggle("is-selected", first && first[0] === r && first[1] === c);
                    });
                    status.textContent = `${selections.length} / ${puzzle.placed.length} words found.`;
                }
                paint();
                section.addEventListener("click", (event) => {
                    const cell = event.target.closest("button[data-cell]");
                    if (!cell) return;
                    const next = cell.dataset.cell.split("-").map(Number);
                    if (!first) { first = next; paint(); return; }
                    const pair = [first, next]; first = null;
                    const [[r, c], [er, ec]] = pair;
                    const length = Math.max(Math.abs(er - r), Math.abs(ec - c)) + 1;
                    const text = r === er || c === ec ? Array.from({ length }, (_, i) => puzzle.grid[r + Math.sign(er - r) * i]?.[c + Math.sign(ec - c) * i] || "").join("") : "";
                    const word = puzzle.placed.find((entry) => entry.word === text || entry.word === [...text].reverse().join(""));
                    if (word) {
                        const duplicate = selections.some((old) => {
                            const [[a, d], [z, f]] = old;
                            const s = Array.from({ length: Math.max(Math.abs(z - a), Math.abs(f - d)) + 1 }, (_, i) => puzzle.grid[a + Math.sign(z - a) * i]?.[d + Math.sign(f - d) * i] || "").join("");
                            return s === word.word || [...s].reverse().join("") === word.word;
                        });
                        if (!duplicate) selections.push(pair);
                        changed(b, selections);
                    }
                    paint();
                    if (!word) status.textContent += " That selection is not a listed word. Try again.";
                });
            }
        });
    }
    window.ActivityBlockView = { markup, bind };
})();
