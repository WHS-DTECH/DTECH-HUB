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
        if (assessment.id === "apps-wordsearch-v1") return renderAppsAssessment(assessment, answers, readOnly);
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

    function renderAppsAssessment(assessment, answers, readOnly) {
        return `
            <section class="worksheet-assessment worksheet-apps-explorer" aria-labelledby="assessment-title">
                <div class="worksheet-assessment-intro">
                    <h2 id="assessment-title">${escapeHtml(assessment.title)}</h2>
                    <p>${escapeHtml(assessment.introduction)}</p>
                    <h3>1. Sign in and get your drives ready</h3>
                    <p>Use your school email for Google and Microsoft. Google Drive and Microsoft OneDrive store files online; they are not the same drive.</p>
                    <div class="worksheet-actions">
                        <button type="button" class="worksheet-btn worksheet-btn-primary" data-login-drive-setup ${readOnly ? "disabled" : ""}>Set up Google Drive (Drive Ready)</button>
                        <a class="worksheet-btn worksheet-btn-secondary" href="https://www.microsoft365.com/launch/onedrive" target="_blank" rel="noopener noreferrer">Open Microsoft OneDrive</a>
                    </div>
                    <p>Google setup creates or reuses just one folder: <strong>WHS-DTECH</strong> in My Drive. We will add class folders later.</p>
                    <p class="worksheet-safety-note">WHS-DTECH will be shared with anyone with the link as Editor, so DTECH-HUB can work with your files. Only store class work here, not private information. Do not share the link publicly. Never enter a password into this activity.</p>
                    <p class="worksheet-assessment-result" data-login-drive-status role="status" aria-live="polite"></p>
                    <a class="worksheet-btn worksheet-btn-secondary" data-login-drive-link target="_blank" rel="noopener noreferrer" hidden>Open your WHS-DTECH folder</a>
                </div>
                <form class="worksheet-apps-form">
                    <fieldset class="worksheet-assessment-inputs" ${readOnly ? "disabled" : ""}>
                        <legend class="worksheet-assessment-heading">2. Explore Google and Microsoft apps</legend>
                        <label class="worksheet-assessment-choice">
                            <input type="checkbox" data-microsoft-ready ${answers.microsoftReady ? "checked" : ""}>
                            <span>I signed in to Microsoft OneDrive with my school account and can see my files. (This is your confirmation, not an automatic Microsoft check.)</span>
                        </label>
                        <ul class="worksheet-app-word-list">${assessment.words.map((app) => `
                            <li data-app-word="${escapeHtml(app.word)}"><strong>${escapeHtml(app.word)}</strong> - ${escapeHtml(app.provider)}: ${escapeHtml(app.use)}</li>
                        `).join("")}</ul>
                        <p id="wordsearch-instructions">Find all eight names. Click or tap the first letter, then the last letter. Words run across or down, and can be selected in either direction. With a keyboard, Tab to a letter and press Enter or Space.</p>
                        <div class="worksheet-wordsearch" role="group" aria-label="Apps word search" aria-describedby="wordsearch-instructions">
                            ${assessment.grid.map((row, r) => Array.from(row).map((letter, c) => `
                                <button type="button" data-word-cell="${r},${c}" aria-label="Row ${r + 1}, column ${c + 1}, ${letter}" aria-pressed="false">${letter}</button>
                            `).join("")).join("")}
                        </div>
                        <p data-wordsearch-status role="status" aria-live="polite"></p>
                        <button type="button" class="worksheet-btn worksheet-btn-secondary" data-wordsearch-reset>Clear found words</button>
                    </fieldset>
                    <button type="submit" class="worksheet-btn worksheet-btn-primary" ${readOnly ? "disabled" : ""}>Check my answers</button>
                    <p class="worksheet-assessment-result" role="status" aria-live="polite">Get both drives ready and find all eight apps, then check your answers.</p>
                </form>
            </section>
        `;
    }

    function wireAppsAssessment(host, assessment, options) {
        const form = host.querySelector(".worksheet-apps-form");
        const result = form.querySelector(".worksheet-assessment-result");
        const inputs = form.querySelector("fieldset");
        const checkButton = form.querySelector("button[type=submit]");
        const microsoft = form.querySelector("[data-microsoft-ready]");
        const status = form.querySelector("[data-wordsearch-status]");
        const paths = {};
        let start = null;
        const readWord = (path) => path.map(([r, c]) => assessment.grid[r]?.[c] || "").join("");
        for (const app of assessment.words) {
            const path = options.assessmentAnswers?.paths?.[app.word];
            if (Array.isArray(path) && path.length === app.word.length && path.every((cell) =>
                Array.isArray(cell) && cell.length === 2 && cell.every((value) => Number.isInteger(value) && value >= 0 && value < 12)
            ) && [app.word, Array.from(app.word).reverse().join("")].includes(readWord(path))) paths[app.word] = path;
        }
        const answers = () => ({ paths: { ...paths }, microsoftReady: microsoft.checked });
        const update = (message = "") => {
            const found = new Set(Object.values(paths).flat().map((cell) => cell.join(",")));
            form.querySelectorAll("[data-word-cell]").forEach((cell) => {
                const id = cell.getAttribute("data-word-cell");
                cell.classList.toggle("is-found", found.has(id));
                cell.setAttribute("aria-pressed", String(found.has(id) || id === start?.join(",")));
            });
            form.querySelectorAll("[data-app-word]").forEach((word) => {
                word.classList.toggle("is-found", Boolean(paths[word.getAttribute("data-app-word")]));
            });
            status.textContent = `${Object.keys(paths).length} / 8 words found. ${message}`;
        };
        const changed = () => {
            options.onAssessmentChange?.(answers());
            result.classList.remove("is-correct", "is-error");
            result.textContent = "Changes saved when you pause. Check your answers when you are ready.";
        };
        form.querySelectorAll("[data-word-cell]").forEach((cell) => cell.addEventListener("click", () => {
            const end = cell.getAttribute("data-word-cell").split(",").map(Number);
            if (!start) {
                start = end;
                update("Now select the last letter.");
                return;
            }
            const dr = end[0] - start[0];
            const dc = end[1] - start[1];
            const length = Math.max(Math.abs(dr), Math.abs(dc)) + 1;
            const path = Array.from({ length }, (_, i) => [start[0] + Math.sign(dr) * i, start[1] + Math.sign(dc) * i]);
            start = null;
            const word = readWord(path);
            const match = (dr === 0 || dc === 0) && assessment.words.find((app) =>
                app.word === word || app.word === Array.from(word).reverse().join("")
            );
            if (!match) { update("Not an app name yet. Try another first and last letter!"); return; }
            paths[match.word] = path;
            changed();
            update(`Ka pai! You found ${match.word}.`);
        }));
        form.querySelector("[data-wordsearch-reset]").addEventListener("click", () => {
            Object.keys(paths).forEach((word) => delete paths[word]);
            start = null;
            changed();
            update();
        });
        microsoft.addEventListener("change", changed);
        update();
        const driveButton = host.querySelector("[data-login-drive-setup]");
        const driveStatus = host.querySelector("[data-login-drive-status]");
        const driveLink = host.querySelector("[data-login-drive-link]");
        const updateDrive = (setup) => {
            driveStatus.textContent = setup?.ready ? "Drive Ready! Your WHS-DTECH folder and Editor sharing are set up." : "Use the Google Drive setup button above to get ready.";
            driveLink.hidden = !setup?.ready;
            if (setup?.ready) driveLink.href = setup.folderUrl;
        };
        updateDrive(options.driveSetup);
        driveButton.addEventListener("click", async () => {
            driveButton.disabled = true;
            driveStatus.classList.remove("is-error");
            driveStatus.textContent = "Requesting Google permission and setting up WHS-DTECH...";
            try {
                if (!options.onDriveSetup) throw new Error("Open the student activity to set up Google Drive.");
                updateDrive(await options.onDriveSetup());
            } catch (error) {
                driveStatus.classList.add("is-error");
                driveStatus.textContent = error.message || "Could not set up Google Drive. Please try again.";
            } finally {
                driveButton.disabled = false;
            }
        });
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (checkButton.disabled) return;
            checkButton.disabled = true;
            inputs.disabled = true;
            result.classList.remove("is-error", "is-correct");
            result.textContent = "Checking and saving your answers...";
            try {
                if (!options.onAssessmentCheck) throw new Error("Open the student activity to check your answers.");
                const grade = await options.onAssessmentCheck(answers());
                result.classList.toggle("is-correct", grade.passed);
                result.textContent = grade.passed
                    ? "Ka pai! All eight apps found, both drives ready. Your completion tick is saved."
                    : `${grade.score} / ${grade.total} tasks complete. ${grade.results.filter((entry) => !entry.correct).map((entry) => entry.explanation).join(" ")}`;
            } catch (error) {
                result.classList.add("is-error");
                result.textContent = error.message || "Could not check or save your answers. Please try again.";
            } finally {
                checkButton.disabled = false;
                inputs.disabled = false;
            }
        });
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

        if (content?.assessment?.id === "apps-wordsearch-v1") wireAppsAssessment(host, content.assessment, options);
        else if (content?.assessment) wireAssessment(host, options);

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
        const visibleWorksheets = worksheets.map((worksheet, index) => ({ worksheet, index }))
            .filter(({ worksheet }) => worksheet.mergedInto === undefined);
        const completedCount = visibleWorksheets.filter(({ index }) => Boolean(completedActivities[index])).length;

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
                <p class="worksheet-activity-progress">${completedCount} / ${visibleWorksheets.length} activities completed</p>
                ${visibleWorksheets.length ? `
                    <ol class="worksheet-activity-list">
                        ${visibleWorksheets.map(({ worksheet, index }) => {
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
