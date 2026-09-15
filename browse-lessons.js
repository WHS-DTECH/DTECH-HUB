const reliefPlanCalendar = document.querySelector("#relief-plan-calendar");
const reliefPlanDetails = document.querySelector("#relief-plan-details");
const reliefPlanDescription = document.querySelector("#relief-plan-description");
const reliefPlanStatus = document.querySelector("#relief-plan-status");
const reliefPlanMonthLabel = document.querySelector("#relief-plan-month-label");
const reliefPlanDate = document.querySelector("#relief-plan-date");
const reliefPlanPrevious = document.querySelector("#relief-plan-previous");
const reliefPlanToday = document.querySelector("#relief-plan-today");
const reliefPlanNext = document.querySelector("#relief-plan-next");

let reliefPlanEvents = [];
let reliefPlanViewDate = new Date();
let reliefPlanLoaded = false;
let reliefPlanLoadInFlight = false;

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function parseReliefDate(value) {
    const match = String(value || "").match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
    if (!match) return null;
    return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
}

function isoDate(date) {
    return date ? [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-") : "";
}

function formatDate(value) {
    const date = parseReliefDate(value);
    return date ? date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : value;
}

function renderDetails(event) {
    const source = event.source
        ? `<p><strong>Source:</strong> <a href="${escapeHtml(event.source)}" target="_blank" rel="noopener noreferrer">${escapeHtml(event.source)}</a></p>`
        : "";
    const date = `<strong>${escapeHtml(formatDate(event.startDate))}</strong>${event.endDate && event.endDate !== event.startDate ? ` to <strong>${escapeHtml(formatDate(event.endDate))}</strong>` : ""}`;

    reliefPlanDetails.innerHTML = `
        <h2>${escapeHtml(event.subject)}</h2>
        <p class="relief-library-detail-date">${date}</p>
        ${event.location ? `<p><strong>Location:</strong> ${escapeHtml(event.location)}</p>` : ""}
        ${event.technologyContext ? `<p><strong>Technology context:</strong> ${escapeHtml(event.technologyContext)}</p>` : ""}
        ${source}
    `;

    const aboutText = event.aboutTheEvent || event.description || "No description available for this event.";
    reliefPlanDescription.innerHTML = `
        <h2>Event Description</h2>
        <p>${escapeHtml(aboutText).replace(/\n/g, "<br>")}</p>
    `;
}

function renderCalendar() {
    const year = reliefPlanViewDate.getFullYear();
    const month = reliefPlanViewDate.getMonth();
    const first = new Date(year, month, 1);
    const days = new Date(year, month + 1, 0).getDate();
    const offset = (first.getDay() + 6) % 7;
    const todayKey = isoDate(new Date());
    const byDate = new Map();

    reliefPlanEvents.forEach((event, index) => {
        const key = isoDate(parseReliefDate(event.startDate));
        if (!key) return;
        if (!byDate.has(key)) byDate.set(key, []);
        byDate.get(key).push({ event, index });
    });

    const cells = [];
    for (let index = 0; index < offset; index += 1) cells.push('<div class="relief-library-day relief-library-day-empty"></div>');
    for (let day = 1; day <= days; day += 1) {
        const date = new Date(year, month, day);
        const dateKey = isoDate(date);
        const events = byDate.get(dateKey) || [];
        const todayClass = dateKey === todayKey ? " relief-library-day-today" : "";
        const eventButtons = events.length
            ? events.map(({ event, index }) => `<button class="relief-library-event" type="button" data-event-index="${index}" title="${escapeHtml(event.subject)}">${escapeHtml(event.subject)}</button>`).join("")
            : '<span class="relief-library-no-event">No events</span>';
        cells.push(`<div class="relief-library-day${todayClass}"><time datetime="${dateKey}">${day}</time>${eventButtons}</div>`);
    }

    reliefPlanMonthLabel.textContent = first.toLocaleDateString(undefined, { year: "numeric", month: "long" });
    reliefPlanDate.value = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    reliefPlanCalendar.innerHTML = `
        <div class="relief-library-weekdays"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
        <div class="relief-library-days">${cells.join("")}</div>
    `;
    reliefPlanCalendar.querySelectorAll("[data-event-index]").forEach((button) => {
        button.addEventListener("click", () => renderDetails(reliefPlanEvents[Number(button.dataset.eventIndex)]));
    });
}

async function loadReliefPlan() {
    if (reliefPlanLoaded || reliefPlanLoadInFlight) return;

    const storedAuth = readStoredReliefPlanAuth();
    if (!storedAuth) {
        reliefPlanStatus.textContent = "School sign-in required to load calendar events.";
        return;
    }

    reliefPlanLoadInFlight = true;
    try {
        const requestHeaders = { "x-user-email": storedAuth.email };
        if (storedAuth.isIdToken) {
            requestHeaders.Authorization = `Bearer ${storedAuth.token}`;
        }
        const response = await fetch("/api/relief-plan/events", {
            credentials: "same-origin",
            headers: requestHeaders
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.ok === false) throw new Error(data.error || "The Relief Plan is currently unavailable.");
        reliefPlanEvents = Array.isArray(data.events) ? data.events : [];
        reliefPlanLoaded = true;
        const firstEventDate = reliefPlanEvents
            .map((event) => parseReliefDate(event.startDate))
            .filter(Boolean)
            .sort((left, right) => left - right)[0];
        if (firstEventDate) {
            reliefPlanViewDate = new Date(firstEventDate.getFullYear(), firstEventDate.getMonth(), 1);
        }
        reliefPlanStatus.textContent = `${reliefPlanEvents.length} events loaded for ${data.year || "the shared calendar"}.`;
        renderCalendar();
    } catch (error) {
        reliefPlanStatus.textContent = error.message;
        if (!reliefPlanLoaded) {
            reliefPlanCalendar.innerHTML = '<p class="relief-library-empty">The shared Relief Plan calendar could not be loaded.</p>';
        }
    } finally {
        reliefPlanLoadInFlight = false;
    }
}

function readStoredReliefPlanAuth() {
    try {
        const raw = localStorage.getItem("hub_google_auth_v1") || sessionStorage.getItem("hub_google_auth_v1");
        const parsed = raw ? JSON.parse(raw) : null;
        const idToken = String(parsed?.idToken || "").trim();
        const token = idToken || String(parsed?.accessToken || "").trim();
        const email = String(parsed?.profile?.email || "").trim().toLowerCase();
        const expiresAt = Number(parsed?.expiresAt || 0);
        return token && email && expiresAt > Date.now()
            ? { token, email, isIdToken: idToken.startsWith("eyJ") && idToken.split(".").length === 3 }
            : null;
    } catch (_error) {
        return null;
    }
}

reliefPlanPrevious.addEventListener("click", () => {
    reliefPlanViewDate = new Date(reliefPlanViewDate.getFullYear(), reliefPlanViewDate.getMonth() - 1, 1);
    renderCalendar();
});

reliefPlanNext.addEventListener("click", () => {
    reliefPlanViewDate = new Date(reliefPlanViewDate.getFullYear(), reliefPlanViewDate.getMonth() + 1, 1);
    renderCalendar();
});

reliefPlanToday.addEventListener("click", () => {
    reliefPlanViewDate = new Date();
    renderCalendar();
});

reliefPlanDate.addEventListener("change", () => {
    if (!reliefPlanDate.value) return;
    const selected = new Date(`${reliefPlanDate.value}T00:00:00`);
    reliefPlanViewDate = new Date(selected.getFullYear(), selected.getMonth(), 1);
    renderCalendar();
});

reliefPlanCalendar.innerHTML = '<p class="relief-library-empty">Loading the shared Relief Plan calendar...</p>';
window.addEventListener("hub-auth-state-changed", (event) => {
    if (event.detail?.signedIn) loadReliefPlan();
});
loadReliefPlan();
