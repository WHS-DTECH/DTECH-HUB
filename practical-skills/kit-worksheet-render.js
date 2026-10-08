// Shared worksheet renderer used by both the student kit page and the admin live preview,
// so the two can never drift out of sync (window.KitWorksheetRender.renderWorksheet).
(function () {
    "use strict";

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function renderQuestionBody(question, responses, readOnly) {
        const type = String(question?.type || "short-answer");
        const responseValue = responses?.[question.id];

        if (type === "checklist") {
            const checkedSet = new Set(Array.isArray(responseValue) ? responseValue : []);
            return `
                <div class="worksheet-checklist">
                    ${(Array.isArray(question.options) ? question.options : []).map((option, optionIndex) => {
                        const checked = checkedSet.has(option);
                        return `
                            <label class="worksheet-checklist-item">
                                <input type="checkbox" data-question-id="${escapeHtml(question.id)}" data-option-value="${escapeHtml(option)}" data-option-index="${optionIndex}" ${checked ? "checked" : ""} ${readOnly ? "disabled" : ""}>
                                <span>${escapeHtml(option)}</span>
                            </label>
                        `;
                    }).join("")}
                </div>
            `;
        }

        if (type === "multiple-choice") {
            const selected = String(responseValue || "");
            return `
                <div class="worksheet-choices">
                    ${(Array.isArray(question.options) ? question.options : []).map((option) => `
                        <button type="button" class="worksheet-choice-bubble ${selected === option ? "is-selected" : ""}" data-question-id="${escapeHtml(question.id)}" data-option-value="${escapeHtml(option)}" ${readOnly ? "disabled" : ""}>
                            ${escapeHtml(option)}
                        </button>
                    `).join("")}
                </div>
            `;
        }

        return `
            <textarea class="worksheet-answer-input" data-question-id="${escapeHtml(question.id)}" rows="${Math.max(1, Number(question.lines) || 1)}" ${readOnly ? "disabled" : ""} placeholder="Write your answer\u2026">${escapeHtml(responseValue || "")}</textarea>
        `;
    }

    function renderWorksheet(host, content, options = {}) {
        if (!host) return;

        const responses = options.responses || {};
        const readOnly = Boolean(options.readOnly);
        const theme = content?.theme || {};
        const questions = Array.isArray(content?.questions) ? content.questions : [];
        const images = Array.isArray(content?.images) ? content.images : [];

        host.style.setProperty("--worksheet-theme-color", theme.color || "#2f8f61");
        host.style.setProperty("--worksheet-accent-color", theme.accent || "#ffd166");

        host.innerHTML = `
            ${options.backHref ? `<a class="worksheet-activity-back" href="${escapeHtml(options.backHref)}">&larr; All activities</a>` : ""}
            <div class="worksheet-banner">
                <span class="worksheet-banner-icon" aria-hidden="true">${escapeHtml(theme.icon || "\ud83d\udcdd")}</span>
                <div class="worksheet-banner-copy">
                    ${options.eyebrow ? `<span class="worksheet-banner-eyebrow">${escapeHtml(options.eyebrow)}</span>` : ""}
                    <h1>${escapeHtml(content?.bannerTitle || "Untitled Kit")}</h1>
                    ${content?.bannerSubtitle ? `<p>${escapeHtml(content.bannerSubtitle)}</p>` : ""}
                </div>
            </div>
            ${content?.instructions ? `
                <div class="worksheet-instructions">
                    <span class="worksheet-instructions-icon" aria-hidden="true">\u270f\ufe0f</span>
                    <p>${escapeHtml(content.instructions)}</p>
                </div>
            ` : ""}
            ${images.length ? `
                <div class="worksheet-image-panel">
                    ${images.map((image) => `
                        <figure class="worksheet-image">
                            <img src="${escapeHtml(image?.url || "")}" alt="${escapeHtml(image?.alt || "")}" loading="lazy">
                            ${image?.caption ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : ""}
                        </figure>
                    `).join("")}
                </div>
            ` : ""}
            <div class="worksheet-question-list">
                ${questions.length ? questions.map((question, index) => `
                    <article class="worksheet-question">
                        <span class="worksheet-question-number" aria-hidden="true">${index + 1}</span>
                        <div class="worksheet-question-body">
                            <p class="worksheet-question-prompt">${escapeHtml(question?.prompt || "")}</p>
                            ${renderQuestionBody(question, responses, readOnly)}
                        </div>
                    </article>
                `).join("") : `<p class="worksheet-empty-note">This kit does not have any questions yet.</p>`}
            </div>
        `;

        if (readOnly) return;

        host.querySelectorAll(".worksheet-answer-input").forEach((textarea) => {
            textarea.addEventListener("change", () => {
                const questionId = textarea.getAttribute("data-question-id");
                options.onResponseChange?.(questionId, textarea.value);
            });
        });

        host.querySelectorAll(".worksheet-checklist-item input[type=checkbox]").forEach((checkbox) => {
            checkbox.addEventListener("change", () => {
                const questionId = checkbox.getAttribute("data-question-id");
                const optionValue = checkbox.getAttribute("data-option-value");
                const current = Array.isArray(responses[questionId]) ? responses[questionId].slice() : [];
                const next = checkbox.checked
                    ? Array.from(new Set([...current, optionValue]))
                    : current.filter((value) => value !== optionValue);
                responses[questionId] = next;
                options.onResponseChange?.(questionId, next);
            });
        });

        host.querySelectorAll(".worksheet-choice-bubble").forEach((button) => {
            button.addEventListener("click", () => {
                const questionId = button.getAttribute("data-question-id");
                const optionValue = button.getAttribute("data-option-value");
                responses[questionId] = optionValue;
                host.querySelectorAll(`.worksheet-choice-bubble[data-question-id="${window.CSS?.escape ? CSS.escape(questionId) : questionId}"]`)
                    .forEach((sibling) => sibling.classList.toggle("is-selected", sibling === button));
                options.onResponseChange?.(questionId, optionValue);
            });
        });
    }

    function renderKitOverview(host, content, options = {}) {
        if (!host) return;

        const theme = content?.theme || {};
        const worksheets = Array.isArray(content?.worksheets) ? content.worksheets : [];
        const activities = Array.isArray(content?.activities) ? content.activities : [];
        const completedActivities = options.completedActivities || {};
        const completedCount = worksheets.filter((_worksheet, index) => Boolean(completedActivities[index])).length;

        host.style.setProperty("--worksheet-theme-color", theme.color || "#2f8f61");
        host.style.setProperty("--worksheet-accent-color", theme.accent || "#ffd166");
        host.innerHTML = `
            <div class="worksheet-banner">
                <span class="worksheet-banner-icon" aria-hidden="true">${escapeHtml(theme.icon || "\ud83d\udcdd")}</span>
                <div class="worksheet-banner-copy">
                    <h1>${escapeHtml(content?.bannerTitle || "Untitled Kit")}</h1>
                    ${content?.bannerSubtitle ? `<p>${escapeHtml(content.bannerSubtitle)}</p>` : ""}
                </div>
            </div>
            ${content?.instructions ? `
                <div class="worksheet-instructions">
                    <span class="worksheet-instructions-icon" aria-hidden="true">\u270f\ufe0f</span>
                    <p>${escapeHtml(content.instructions)}</p>
                </div>
            ` : ""}
            <section class="worksheet-activities" aria-labelledby="worksheet-activities-title">
                <h2 id="worksheet-activities-title">Activities</h2>
                <p class="worksheet-activity-progress">${completedCount} / ${worksheets.length} activities completed</p>
                ${worksheets.length ? `
                    <ol class="worksheet-activity-list">
                        ${worksheets.map((worksheet, index) => {
                            const activity = activities[index] || {};
                            const title = activity.title || worksheet.activity || `Activity ${index + 1}`;
                            const establishes = activity.establishes || worksheet.establishes || "";
                            const href = `./kit-worksheet.html?kit=${encodeURIComponent(options.kitId || "")}&activity=${index}`;
                            const completed = Boolean(completedActivities[index]);
                            return `
                                <li class="worksheet-activity-card ${completed ? "is-complete" : ""}">
                                    <span class="worksheet-activity-number ${completed ? "is-complete" : ""}" role="img" aria-label="${completed ? "Completed" : "Not completed"}">${completed ? "&#10003;" : ""}</span>
                                    <div class="worksheet-activity-copy">
                                        <h3>${escapeHtml(title)}</h3>
                                        ${establishes ? `<p>${escapeHtml(establishes)}</p>` : ""}
                                    </div>
                                    <a class="worksheet-activity-link" href="${escapeHtml(href)}">Open Activity</a>
                                </li>
                            `;
                        }).join("")}
                    </ol>
                ` : `<p class="worksheet-empty-note">No activities have been added to this kit yet.</p>`}
            </section>
        `;
    }

    window.KitWorksheetRender = { renderWorksheet, renderKitOverview };
})();
