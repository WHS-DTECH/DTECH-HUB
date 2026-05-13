const practicalsGrid = document.querySelector("#practicals-grid");
const monthLabel = document.querySelector("#month-label");
const monthPrev = document.querySelector("#month-prev");
const monthNext = document.querySelector("#month-next");
const practicalsList = document.querySelector("#practicals-list");
const practicalsStatus = document.querySelector("#practicals-status");
const practicalsForm = document.querySelector("#practicals-form");
const practicalsFormStatus = document.querySelector("#practicals-form-status");
const practicalsManage = document.querySelector("#practicals-manage");
const icsUrlCopy = document.querySelector("#ics-url-copy");

const BROWSE_PRACTICALS_AUTH_KEY = "hub_google_auth_v1";

let practicalEvents = [];
let visibleMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let signedInEmail = "";
let canManage = false;

function setStatus(target, message, isError = false) {
    if (!target) return;
    target.textContent = message;
    target.style.color = isError ? "#bb3f3f" : "#2f4e73";
}

function toIsoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function readSignedInEmail() {
    const raw = localStorage.getItem(BROWSE_PRACTICALS_AUTH_KEY) || sessionStorage.getItem(BROWSE_PRACTICALS_AUTH_KEY);
    if (!raw) return "";

    try {
        const parsed = JSON.parse(raw);
        if (!parsed?.expiresAt || Number(parsed.expiresAt) <= Date.now()) {
            return "";
        }
        return String(parsed?.profile?.email || "").trim().toLowerCase();
    } catch (_error) {
        return "";
    }
}

function parseIsoDate(value) {
    const raw = String(value || "").trim();
    if (!raw) return null;
    const parsed = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
}

function eventRangeIncludes(event, dayDate) {
    const start = parseIsoDate(event.start_date);
    const end = parseIsoDate(event.end_date || event.start_date);
    if (!start || !end) return false;

    const current = parseIsoDate(toIsoDate(dayDate));
    return current >= start && current <= end;
}

function toGoogleCalendarLink(event) {
    const start = String(event.start_date || "").replace(/-/g, "");
    const endSource = String(event.end_date || event.start_date || "");
    const endDate = parseIsoDate(endSource);
    if (endDate) {
        endDate.setDate(endDate.getDate() + 1);
    }
    const end = endDate ? toIsoDate(endDate).replace(/-/g, "") : start;

    const text = encodeURIComponent(`${event.event_type}: ${event.title}`);
    const details = encodeURIComponent(event.notes || "Scheduled via Browse Practicals");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}`;
}

function renderMonthGrid() {
    if (!practicalsGrid || !monthLabel) return;

    practicalsGrid.innerHTML = "";

    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    monthLabel.textContent = visibleMonth.toLocaleString("en-NZ", { month: "long", year: "numeric" });

    const firstDay = new Date(year, month, 1);
    const firstWeekdayMondayBased = (firstDay.getDay() + 6) % 7;
    const startDate = new Date(year, month, 1 - firstWeekdayMondayBased);

    for (let i = 0; i < 42; i += 1) {
        const day = new Date(startDate);
        day.setDate(startDate.getDate() + i);

        const cell = document.createElement("article");
        cell.className = "practicals-day";

        if (day.getMonth() !== month) {
            cell.classList.add("is-other-month");
        }

        const dayHeader = document.createElement("div");
        dayHeader.className = "practicals-day-number";
        dayHeader.textContent = String(day.getDate());
        cell.appendChild(dayHeader);

        const items = practicalEvents.filter((event) => eventRangeIncludes(event, day));
        if (items.length) {
            const list = document.createElement("ul");
            list.className = "practicals-day-list";
            items.slice(0, 3).forEach((event) => {
                const item = document.createElement("li");
                item.className = event.event_type === "Project" ? "is-project" : "is-activity";
                item.textContent = event.title;
                list.appendChild(item);
            });

            if (items.length > 3) {
                const more = document.createElement("li");
                more.textContent = `+${items.length - 3} more`;
                list.appendChild(more);
            }

            cell.appendChild(list);
        }

        practicalsGrid.appendChild(cell);
    }
}

function renderTimeline() {
    if (!practicalsList) return;
    practicalsList.innerHTML = "";

    if (!practicalEvents.length) {
        practicalsList.innerHTML = "<p class='section-copy'>No practical events scheduled yet.</p>";
        return;
    }

    practicalEvents.forEach((event) => {
        const card = document.createElement("article");
        card.className = "practical-item";

        const title = document.createElement("h3");
        title.textContent = `${event.event_type}: ${event.title}`;

        const date = document.createElement("p");
        date.className = "practical-date";
        date.textContent = event.start_date === event.end_date
            ? event.start_date
            : `${event.start_date} to ${event.end_date}`;

        const notes = document.createElement("p");
        notes.className = "practical-notes";
        notes.textContent = event.notes || "No notes";

        const actions = document.createElement("div");
        actions.className = "practical-actions";

        const googleLink = document.createElement("a");
        googleLink.href = toGoogleCalendarLink(event);
        googleLink.target = "_blank";
        googleLink.rel = "noreferrer";
        googleLink.className = "button button-secondary";
        googleLink.textContent = "Add to Google Calendar";
        actions.appendChild(googleLink);

        if (event.linked_url) {
            const linked = document.createElement("a");
            linked.href = event.linked_url;
            linked.target = "_blank";
            linked.rel = "noreferrer";
            linked.className = "button button-secondary";
            linked.textContent = "Open Link";
            actions.appendChild(linked);
        }

        if (canManage) {
            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "button button-secondary";
            remove.textContent = "Delete";
            remove.addEventListener("click", async () => {
                try {
                    const response = await fetch(`/api/practicals/events/${event.id}?user_email=${encodeURIComponent(signedInEmail)}`, {
                        method: "DELETE"
                    });
                    if (!response.ok) {
                        throw new Error("Could not delete event");
                    }
                    await loadEvents();
                } catch (error) {
                    setStatus(practicalsStatus, error.message || "Could not delete event", true);
                }
            });
            actions.appendChild(remove);
        }

        card.appendChild(title);
        card.appendChild(date);
        card.appendChild(notes);
        card.appendChild(actions);
        practicalsList.appendChild(card);
    });
}

async function loadEvents() {
    try {
        setStatus(practicalsStatus, "Loading practical events...");
        const response = await fetch("/api/practicals/events");
        if (!response.ok) {
            throw new Error("Could not load practical events");
        }

        const rows = await response.json();
        practicalEvents = Array.isArray(rows) ? rows : [];
        practicalEvents.sort((left, right) => {
            if (left.start_date !== right.start_date) {
                return String(left.start_date).localeCompare(String(right.start_date));
            }
            return String(left.title || "").localeCompare(String(right.title || ""));
        });

        renderMonthGrid();
        renderTimeline();
        setStatus(practicalsStatus, `Loaded ${practicalEvents.length} scheduled practical event${practicalEvents.length === 1 ? "" : "s"}.`);
    } catch (error) {
        setStatus(practicalsStatus, error.message || "Could not load practical events.", true);
    }
}

async function resolveManageAccess() {
    signedInEmail = readSignedInEmail();
    canManage = false;

    if (!signedInEmail) {
        if (practicalsManage) practicalsManage.hidden = true;
        return;
    }

    try {
        const response = await fetch(`/api/auth/user-access?email=${encodeURIComponent(signedInEmail)}`);
        if (!response.ok) {
            if (practicalsManage) practicalsManage.hidden = true;
            return;
        }
        const access = await response.json();
        canManage = Boolean(access?.can_teacher_view || access?.can_admin);
        if (practicalsManage) {
            practicalsManage.hidden = !canManage;
        }
    } catch (_error) {
        if (practicalsManage) practicalsManage.hidden = true;
    }
}

if (monthPrev) {
    monthPrev.addEventListener("click", () => {
        visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
        renderMonthGrid();
    });
}

if (monthNext) {
    monthNext.addEventListener("click", () => {
        visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
        renderMonthGrid();
    });
}

if (practicalsForm) {
    practicalsForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!canManage || !signedInEmail) {
            setStatus(practicalsFormStatus, "Only Teacher/Admin users can add events.", true);
            return;
        }

        const formData = new FormData(practicalsForm);
        const payload = {
            title: String(formData.get("title") || "").trim(),
            event_type: String(formData.get("event_type") || "Activity").trim(),
            start_date: String(formData.get("start_date") || "").trim(),
            end_date: String(formData.get("end_date") || "").trim(),
            notes: String(formData.get("notes") || "").trim(),
            linked_url: String(formData.get("linked_url") || "").trim(),
            user_email: signedInEmail
        };

        if (!payload.title || !payload.start_date) {
            setStatus(practicalsFormStatus, "Title and start date are required.", true);
            return;
        }

        try {
            setStatus(practicalsFormStatus, "Saving event...");
            const response = await fetch("/api/practicals/events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result.error || "Could not save event");
            }

            practicalsForm.reset();
            setStatus(practicalsFormStatus, "Event added to Browse Practicals.");
            await loadEvents();
        } catch (error) {
            setStatus(practicalsFormStatus, error.message || "Could not save event.", true);
        }
    });
}

(function initPracticalsCalendar() {
    const feedUrl = `${window.location.origin}/api/practicals/calendar.ics`;
    if (icsUrlCopy) {
        icsUrlCopy.textContent = `Feed URL for Google Calendar: ${feedUrl}`;
    }

    resolveManageAccess().then(() => {
        loadEvents();
    });
})();
