(() => {
    "use strict";
    const content = document.getElementById("typing-content");
    const status = document.getElementById("typing-status");
    const retry = document.getElementById("typing-retry");
    const state = { revision: 0, email: "", snapshot: null, launched: false, submissionId: "", pendingUrl: "" };
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    const dateLabel = (value) => new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
    const timeLabel = (value) => new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium", timeStyle: "short", timeZone: "Pacific/Auckland" }).format(new Date(value));
    function addDays(value, days) {
        const date = new Date(`${value}T00:00:00Z`);
        date.setUTCDate(date.getUTCDate() + days);
        return date.toISOString().slice(0, 10);
    }
    function auth() {
        const raw = localStorage.getItem("hub_google_auth_v1") || sessionStorage.getItem("hub_google_auth_v1");
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return Number(parsed.expiresAt) > Date.now() && parsed.profile?.email ? parsed : null;
    }
    function message(text, error = false) {
        status.textContent = text;
        status.classList.toggle("is-error", error);
    }
    async function request(path = "", options = {}) {
        const session = auth();
        if (!session || session.profile.email.toLowerCase() !== state.email) throw new Error("Sign in with your school Google account again.");
        const headers = { "Content-Type": "application/json", "x-user-email": state.email };
        const googleToken = session.idToken || session.accessToken;
        if (googleToken) headers.Authorization = `Bearer ${googleToken}`;
        const response = await fetch(`/api/practical-skills/typing-kit${path}`, { ...options, headers, cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}). Please try again.`);
        return payload;
    }
    function weeks() {
        return Array.from({ length: 7 }, (_, index) => addDays(state.snapshot.startDate, index * 7));
    }
    function periodAttempts(weekStart, period) {
        return state.snapshot.attempts.filter((attempt) => attempt.weekStart === weekStart && attempt.period === period);
    }
    function dailyLink(weekStart, period) {
        return `./typing-kit.html?week=${encodeURIComponent(weekStart)}&period=${period}`;
    }
    function score(attempt) {
        return `${attempt.netWpm} WPM &middot; ${attempt.accuracy}% accuracy`;
    }
    function dailyTable(attempts) {
        if (!attempts.length) return "<p>No attempts saved for this period yet.</p>";
        return `<div class="typing-table-wrap"><table>
            <caption>Every submitted attempt (submission times are New Zealand time)</caption>
            <thead><tr><th scope="col">Attempt</th><th scope="col">Submitted</th><th scope="col">Net WPM</th><th scope="col">Gross WPM</th><th scope="col">Accuracy</th><th scope="col">Duration</th><th scope="col">Evidence</th></tr></thead>
            <tbody>${attempts.map((attempt, index) => `<tr>
                <th scope="row">${index + 1}</th><td>${escapeHtml(timeLabel(attempt.submittedAt))}</td>
                <td>${attempt.netWpm}</td><td>${attempt.grossWpm}</td><td>${attempt.accuracy}%</td><td>${attempt.durationSeconds} seconds</td>
                <td><a href="${escapeHtml(attempt.sourceUrl)}" target="_blank" rel="noopener noreferrer">Results link (new tab)</a></td>
            </tr>`).join("")}</tbody></table></div>`;
    }
    function renderOverview() {
        const starts = weeks();
        const attempts = state.snapshot.attempts;
        const recorded = starts.reduce((sum, start) => sum + [1, 2].filter((period) => periodAttempts(start, period).length).length, 0);
        const archived = attempts.filter((attempt) => !starts.includes(attempt.weekStart));
        const archivedPeriods = [...new Set(archived.map((attempt) => `${attempt.weekStart}/${attempt.period}`))].sort();
        content.innerHTML = `<section class="typing-intro">
                <h2>Typing Kit Dashboard</h2>
                <p>${dateLabel(starts[0])} &ndash; ${dateLabel(addDays(starts[6], 6))}</p>
                <p><strong>${recorded} / 14 period records started</strong> &middot; All attempts are kept.</p>
                <p>Open your week and period. Complete a one-minute test, paste the results link here, save it, then copy your saved result into your exercise book for your teacher to sign.</p>
                <p class="typing-note">This is your electronic log, not an electronic sign-off. Scores are student-submitted. Submission dates do not verify when a test was taken.</p>
            </section>
            ${state.snapshot.canManage ? `<details class="typing-settings"><summary>Teacher calendar settings</summary>
                <h2>Week 1 start date</h2>
                <p>This shared calendar applies to all students using the Typing Kit. Changing it does not delete results: records outside the new dates remain under Earlier / other dated records.</p>
                <form id="typing-settings-form">
                    <label for="typing-start-date">Monday starting Week 1</label>
                    <input id="typing-start-date" type="date" min="2000-01-03" max="2100-12-31" step="7" value="${state.snapshot.startDate}" required>
                    <button class="worksheet-btn worksheet-btn-primary" type="submit">Save start date</button>
                </form>
            </details>` : ""}
            <section aria-labelledby="typing-weeks-heading"><h2 id="typing-weeks-heading">Your seven-week log</h2>
                ${starts.map((start, index) => `<article class="typing-week">
                    <div class="typing-week-heading"><h3>Week ${index + 1}</h3><p>${dateLabel(start)} &ndash; ${dateLabel(addDays(start, 6))}</p></div>
                    <div class="typing-periods">${[1, 2].map((period) => {
                        const rows = periodAttempts(start, period);
                        const latest = rows[rows.length - 1];
                        return `<section class="typing-period ${latest ? "has-results" : ""}" aria-label="Week ${index + 1}, Period ${period}">
                            <h4>Period ${period}</h4><p>${latest ? `Latest: <strong>${score(latest)}</strong>` : "No result saved yet"}</p>
                            <p>${rows.length} saved attempt${rows.length === 1 ? "" : "s"}</p>
                            <a class="worksheet-btn worksheet-btn-primary" href="${dailyLink(start, period)}" aria-label="Open Week ${index + 1} Period ${period} daily record">Open daily record</a>
                        </section>`;
                    }).join("")}</div>
                </article>`).join("")}
            </section>
            ${archived.length ? `<section class="typing-archive"><h2>Earlier / other dated records</h2><p>These saved records are outside the current seven-week calendar.</p><ul>${archivedPeriods.map((key) => {
                const [start, period] = key.split("/");
                return `<li><a href="${dailyLink(start, period)}">Week starting ${dateLabel(start)}, Period ${period}</a></li>`;
            }).join("")}</ul></section>` : ""}`;
        document.getElementById("typing-settings-form")?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const revision = state.revision;
            const form = event.currentTarget;
            const startDate = document.getElementById("typing-start-date").value;
            form.querySelector("button").disabled = true;
            try {
                const saved = await request("/settings", { method: "PUT", body: JSON.stringify({ startDate }) });
                if (revision !== state.revision) return;
                state.snapshot.startDate = saved.startDate;
                renderOverview();
                message("Calendar saved. All existing attempts have been kept.");
            } catch (error) {
                if (revision === state.revision) message(error.message, true);
            } finally {
                if (revision === state.revision) form.querySelector("button").disabled = false;
            }
        });
    }
    function renderDaily(weekStart, period) {
        const rows = periodAttempts(weekStart, period);
        const index = weeks().indexOf(weekStart);
        const title = index >= 0 ? `Week ${index + 1} \u00b7 Period ${period}` : `Archived period ${period}`;
        const latest = rows[rows.length - 1];
        document.title = `${title} | Typing Kit`;
        content.innerHTML = `<a href="./typing-kit.html">&larr; Back to Typing Kit Dashboard</a>
            <section class="typing-daily">
                <h2>${title}</h2><p>Week of ${dateLabel(weekStart)} &ndash; ${dateLabel(addDays(weekStart, 6))}</p>
                ${index >= 0 ? `<ol>
                    <li>Launch and complete a one-minute typing test.</li>
                    <li>Copy the address of the results page and return here.</li>
                    <li>Paste the link and save your result.</li>
                    <li>Copy the saved result into your exercise book for your teacher to sign.</li>
                </ol>
                <p id="typing-launch-label"><strong>Choose your one-minute test. Each button opens a new tab.</strong></p>
                <div class="typing-launch-actions" role="group" aria-labelledby="typing-launch-label">
                    <a id="typing-launch-easy" class="worksheet-btn typing-launch-easy" href="https://www.typingtest.com/test.php?minutes=1&amp;textfile=easyText.txt&amp;mode=sent&amp;result_url=%2Fresult.php" target="_blank" rel="noopener noreferrer">Easy &mdash; 1 minute &#8599;</a>
                    <a id="typing-launch-medium" class="worksheet-btn typing-launch-medium" href="https://www.typingtest.com/test.php?minutes=1&amp;textfile=mediumText.txt&amp;mode=sent&amp;result_url=%2Fresult.php" target="_blank" rel="noopener noreferrer">Medium &mdash; 1 minute &#8599;</a>
                    <a id="typing-launch-hard" class="worksheet-btn typing-launch-hard" href="https://www.typingtest.com/test.php?minutes=1&amp;textfile=difficultText.txt&amp;mode=sent&amp;result_url=%2Fresult.php" target="_blank" rel="noopener noreferrer">Hard &mdash; 1 minute &#8599;</a>
                </div>
                <p id="typing-return-prompt" class="typing-note" role="status">No TypingTest.com account is needed. Return here after completing your test.</p>
                <form id="typing-result-form">
                    <label for="typing-result-url">Paste your TypingTest.com results page link</label>
                    <input id="typing-result-url" class="typing-result-input" type="url" maxlength="4096" required placeholder="https://www.typingtest.com/result.php?..." aria-describedby="typing-link-help">
                    <p id="typing-link-help" class="typing-note">Use the full results address from a completed one-minute test, not the test launch link. Each submission adds an attempt; earlier results stay in your log.</p>
                    <div class="typing-submit-actions"><button class="worksheet-btn worksheet-btn-primary" type="submit">Save result</button></div>
                </form>` : "<p>This record is outside the current calendar. Its saved attempts are kept here for reference.</p>"}
            </section>
            ${latest ? `<section class="typing-copy" aria-labelledby="typing-copy-heading"><h2 id="typing-copy-heading">Latest saved result</h2>
                <strong>${score(latest)} &middot; 1-minute test</strong>
                <p>Submitted ${escapeHtml(timeLabel(latest.submittedAt))} &middot; ${title}</p>
                <p>Now copy this result into your exercise book for your teacher to sign.</p>
            </section>` : ""}
            <section class="typing-daily"><h2>Daily record details</h2>${dailyTable(rows)}
                <p class="typing-note">Student-submitted results, not independently verified. Times show when you submitted each link, not when you took the test. Your teacher signs your exercise book, not this log.</p>
            </section>`;
        state.launched = false;
        ["easy", "medium", "hard"].forEach((difficulty) => {
            document.getElementById(`typing-launch-${difficulty}`)?.addEventListener("click", () => {
                state.launched = true;
                document.getElementById("typing-return-prompt").textContent = "When you have finished, return here and paste your results page link.";
            });
        });
        document.getElementById("typing-result-form")?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const revision = state.revision;
            const form = event.currentTarget;
            const input = document.getElementById("typing-result-url");
            const resultUrl = input.value.trim();
            if (resultUrl !== state.pendingUrl || !state.submissionId) {
                state.pendingUrl = resultUrl;
                state.submissionId = crypto.randomUUID();
            }
            const submissionId = state.submissionId;
            const button = form.querySelector("button");
            button.disabled = true;
            input.disabled = true;
            message("Saving your result...");
            try {
                const saved = await request("/attempts", { method: "POST", body: JSON.stringify({ weekStart, period, resultUrl, submissionId }) });
                if (revision !== state.revision) return;
                if (!state.snapshot.attempts.some((attempt) => attempt.id === saved.attempt.id)) state.snapshot.attempts.push(saved.attempt);
                state.submissionId = "";
                state.pendingUrl = "";
                renderDaily(weekStart, period);
                message(`Result saved: ${saved.attempt.netWpm} WPM, ${saved.attempt.accuracy}% accuracy. Now copy it into your exercise book.`);
                document.querySelector(".typing-copy")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
            } catch (error) {
                if (revision === state.revision) message(error.message, true);
            } finally {
                if (revision === state.revision) { button.disabled = false; input.disabled = false; }
            }
        });
    }
    function render() {
        const params = new URLSearchParams(window.location.search);
        if (!params.has("week") && !params.has("period")) return renderOverview();
        const weekStart = params.get("week");
        const period = Number(params.get("period"));
        const valid = /^\d{4}-\d{2}-\d{2}$/.test(weekStart || "") && [1, 2].includes(period)
            && (weeks().includes(weekStart) || periodAttempts(weekStart, period).length > 0);
        if (!valid) {
            content.innerHTML = '<p>That daily record is unavailable. <a href="./typing-kit.html">Choose a week and period from your dashboard.</a></p>';
            message("Choose a valid daily record from your Typing Kit Dashboard.", true);
            return;
        }
        renderDaily(weekStart, period);
    }
    async function load() {
        const revision = ++state.revision;
        state.snapshot = null;
        state.launched = false;
        state.submissionId = "";
        state.pendingUrl = "";
        content.innerHTML = "";
        retry.hidden = true;
        document.getElementById("typing-identity-verification").hidden = false;
        try {
            state.email = auth()?.profile.email.toLowerCase() || "";
            if (!state.email) {
                message("Sign in with your school Google account to open your Typing Kit and saved log.");
                return;
            }
            message("Loading your typing log...");
            const snapshot = await request();
            if (revision !== state.revision) return;
            state.snapshot = snapshot;
            document.getElementById("typing-identity-verification").hidden = true;
            message("");
            render();
        } catch (error) {
            if (revision !== state.revision) return;
            message(error.message || "Could not load your typing log.", true);
            retry.hidden = false;
        }
    }
    function promptOnReturn() {
        if (!state.launched || document.hidden) return;
        const prompt = document.getElementById("typing-return-prompt");
        if (prompt) prompt.textContent = "Finished your test? Copy the results page address, paste it below, and save your result.";
    }
    window.addEventListener("focus", promptOnReturn);
    document.addEventListener("visibilitychange", promptOnReturn);
    window.addEventListener("hub-auth-state-changed", () => { void load(); });
    retry.addEventListener("click", () => { void load(); });
    void load();
})();
