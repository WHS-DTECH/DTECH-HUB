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

    function renderAssessment(assessment, answers, readOnly) {
        return `
            <section class="worksheet-assessment" aria-labelledby="assessment-title">
                <div class="worksheet-assessment-intro">
                    <h2 id="assessment-title">${escapeHtml(assessment.title)}</h2>
                    <p>${escapeHtml(assessment.introduction)}</p>
                    <p class="worksheet-safety-note">${escapeHtml(assessment.safety)}</p>
                    <h3>Your detective toolkit</h3>
                    <ul>${assessment.tips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join("")}</ul>
                </div>
                <form class="worksheet-assessment-form">
                    <fieldset class="worksheet-assessment-inputs" ${readOnly ? "disabled" : ""}>
                        <legend class="worksheet-assessment-heading">Round 1: Match the problem to the safe fix</legend>
                        <p>Choose a fix for each problem. Each fix is used once. You can use the keyboard or tap the menus.</p>
                        ${assessment.matches.map((question, index) => `
                            <div class="worksheet-assessment-question">
                                <label for="assessment-${escapeHtml(question.id)}"><strong>${index + 1}.</strong> ${escapeHtml(question.prompt)}</label>
                                <select id="assessment-${escapeHtml(question.id)}" name="${escapeHtml(question.id)}" data-assessment-id="${escapeHtml(question.id)}" aria-describedby="feedback-${escapeHtml(question.id)}">
                                    <option value="">Choose a safe fix...</option>
                                    ${assessment.matchOptions.map((option) => `<option value="${escapeHtml(option.id)}" ${answers[question.id] === option.id ? "selected" : ""}>${escapeHtml(option.text)}</option>`).join("")}
                                </select>
                                <p id="feedback-${escapeHtml(question.id)}" class="worksheet-assessment-feedback" data-feedback-id="${escapeHtml(question.id)}" hidden></p>
                            </div>
                        `).join("")}
                        <h3 class="worksheet-assessment-heading">Round 2: Solve the mini mysteries</h3>
                        ${assessment.quiz.map((question, index) => `
                            <fieldset class="worksheet-assessment-question" aria-describedby="feedback-${escapeHtml(question.id)}">
                                <legend><strong>${index + 1}.</strong> ${escapeHtml(question.prompt)}</legend>
                                ${question.options.map((option) => `
                                    <label class="worksheet-assessment-choice">
                                        <input type="radio" name="${escapeHtml(question.id)}" data-assessment-id="${escapeHtml(question.id)}" value="${escapeHtml(option.id)}" ${answers[question.id] === option.id ? "checked" : ""}>
                                        <span>${escapeHtml(option.text)}</span>
                                    </label>
                                `).join("")}
                                <p id="feedback-${escapeHtml(question.id)}" class="worksheet-assessment-feedback" data-feedback-id="${escapeHtml(question.id)}" hidden></p>
                            </fieldset>
                        `).join("")}
                    </fieldset>
                    <button type="submit" class="worksheet-btn worksheet-btn-primary" ${readOnly ? "disabled" : ""}>Check my answers</button>
                    <p class="worksheet-assessment-result" role="status" aria-live="polite">Complete both rounds, then check your answers. You can try again as many times as you need.</p>
                </form>
            </section>
        `;
    }

    function wireAssessment(host, options) {
        const form = host.querySelector(".worksheet-assessment-form");
        if (!form) return;
        const result = form.querySelector(".worksheet-assessment-result");
        const button = form.querySelector("button[type=submit]");
        const inputs = form.querySelector(".worksheet-assessment-inputs");
        form.addEventListener("change", (event) => {
            const id = event.target.getAttribute("data-assessment-id");
            if (!id) return;
            form.querySelectorAll("[data-feedback-id]").forEach((feedback) => {
                if (feedback.getAttribute("data-feedback-id") === id) feedback.hidden = true;
            });
            result.classList.remove("is-error", "is-correct");
            result.textContent = "Answers changed. Check again when you are ready.";
        });
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (button.disabled) return;
            const answers = {};
            form.querySelectorAll("[data-assessment-id]").forEach((input) => {
                if (input.tagName === "SELECT" || input.checked) {
                    answers[input.getAttribute("data-assessment-id")] = input.value;
                }
            });
            button.disabled = true;
            inputs.disabled = true;
            result.classList.remove("is-error", "is-correct");
            result.textContent = "Checking and saving your answers...";
            try {
                if (!options.onAssessmentCheck) throw new Error("Answer checking is unavailable here. Open the student activity to try it.");
                const grade = await options.onAssessmentCheck(answers);
                form.querySelectorAll("[data-feedback-id]").forEach((feedback) => {
                    const marked = grade.results.find((entry) => entry.id === feedback.getAttribute("data-feedback-id"));
                    if (!marked) return;
                    feedback.hidden = false;
                    feedback.classList.toggle("is-correct", marked.correct);
                    feedback.classList.toggle("is-error", !marked.correct);
                    feedback.textContent = `${marked.correct ? "Correct!" : "Try again."} ${marked.explanation}`;
                });
                result.classList.toggle("is-correct", grade.passed);
                result.textContent = grade.passed
                    ? `${grade.score} / ${grade.total} correct! Brilliant detective work. Your completion tick is saved.`
                    : `${grade.score} / ${grade.total} correct. Your answers are saved. Read the tips beside each answer and try again. Get all ${grade.total} right to earn your tick.`;
            } catch (error) {
                result.classList.add("is-error");
                result.textContent = error?.message || "Could not check and save your answers. Please try again.";
            } finally {
                button.disabled = false;
                inputs.disabled = false;
            }
        });
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
            ${content?.information ? `
                <section class="worksheet-assessment-intro worksheet-identity-guide" aria-labelledby="identity-guide-title">
                    <h2 id="identity-guide-title">${escapeHtml(content.information.title)}</h2>
                    ${(content.information.paragraphs || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
                </section>
            ` : ""}
            ${content?.assessment ? renderAssessment(content.assessment, options.assessmentAnswers || {}, readOnly) : ""}
            <div class="worksheet-question-list">
                ${questions.length ? questions.map((question, index) => `
                    <article class="worksheet-question">
                        <span class="worksheet-question-number" aria-hidden="true">${index + 1}</span>
                        <div class="worksheet-question-body">
                            <p class="worksheet-question-prompt">${escapeHtml(question?.prompt || "")}</p>
                            ${renderQuestionBody(question, responses, readOnly)}
                            ${content?.identityLessonVersion ? `<p class="worksheet-assessment-feedback" data-identity-feedback="${escapeHtml(question.id)}" role="status" aria-live="polite">Type your answer. We will check it against your school Google account.</p>` : ""}
                        </div>
                    </article>
                `).join("") : content?.assessment ? "" : `<p class="worksheet-empty-note">This kit does not have any questions yet.</p>`}
            </div>
            ${content?.identityLessonVersion ? `<p class="worksheet-assessment-result" id="identity-result" role="status" aria-live="polite">${options.identityVerified ? "Google sign-in is ready. Click Check your answers to mark all four answers." : "Complete questions 1-4, verify your school email in step 5, then click Check your answers."}</p><button type="button" class="worksheet-btn worksheet-btn-primary" id="identity-retry" ${readOnly ? "disabled" : ""}>Check your answers</button>` : ""}
        `;

        if (readOnly) return;

        if (content?.assessment) wireAssessment(host, options);

        if (content?.identityLessonVersion) {
            let timer;
            let revision = 0;
            const result = host.querySelector("#identity-result");
            const check = async () => {
                const currentRevision = revision;
                const answers = {};
                host.querySelectorAll(".worksheet-answer-input").forEach((input) => {
                    answers[input.getAttribute("data-question-id")] = input.value;
                });
                result.textContent = "Checking and saving your answers...";
                result.classList.remove("is-error", "is-correct");
                try {
                    const grade = await options.onIdentityCheck(answers);
                    if (currentRevision !== revision) return;
                    host.querySelectorAll("[data-identity-feedback]").forEach((feedback) => {
                        const marked = grade.results.find((entry) => entry.id === feedback.getAttribute("data-identity-feedback"));
                        feedback.textContent = marked.explanation;
                        feedback.classList.toggle("is-correct", marked.correct);
                        feedback.classList.toggle("is-error", !marked.correct);
                    });
                    result.classList.toggle("is-correct", grade.passed);
                    result.textContent = grade.passed
                        ? "4 / 4 correct! Ka pai! Your completion tick is saved."
                        : `${grade.score} / 4 correct. Your answers are saved. Keep going - use the hints and try again!`;
                } catch (error) {
                    if (currentRevision !== revision) return;
                    result.classList.add("is-error");
                    result.textContent = error?.message || "Could not check or save your answers. Please try again.";
                }
            };
            host.querySelectorAll(".worksheet-answer-input").forEach((input) => {
                input.addEventListener("input", () => {
                    revision += 1;
                    window.clearTimeout(timer);
                    const feedback = Array.from(host.querySelectorAll("[data-identity-feedback]")).find((node) =>
                        node.getAttribute("data-identity-feedback") === input.getAttribute("data-question-id")
                    );
                    feedback.classList.remove("is-correct", "is-error");
                    feedback.textContent = options.identityVerified === false
                        ? "Keep going! Verify your email in step 5, then check your answers."
                        : "Keep going! We will check when you pause typing.";
                    if (options.identityVerified !== false) timer = window.setTimeout(check, 650);
                });
            });
            host.querySelector("#identity-retry").addEventListener("click", () => {
                window.clearTimeout(timer);
                void check();
            });
            return;
        }

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
