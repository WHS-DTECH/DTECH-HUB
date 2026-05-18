let allLessons = [];

function renderLessonCard(lesson) {
    const card = document.createElement("div");
    card.className = "lesson-card";
    card.style.borderLeft = `4px solid var(--color-${String(lesson.lesson_card_color || "Rose").toLowerCase()})`;

    const colorClass = String(lesson.lesson_card_color || "Rose").toLowerCase();
    card.classList.add(`card-${colorClass}`);

    card.innerHTML = `
        <div class="lesson-card-header">
            <h3>${String(lesson.activity_name || lesson.lesson_title || "Unnamed Lesson").trim()}</h3>
            <span class="lesson-badge">${String(lesson.lesson_type || "Activity").trim()}</span>
        </div>
        <div class="lesson-card-meta">
            <p><strong>Title:</strong> ${String(lesson.lesson_title || "").trim()}</p>
            <p><strong>Year Level:</strong> ${String(lesson.lesson_year_level || "").trim()}</p>
            <p><strong>Duration:</strong> ${lesson.lesson_duration_minutes || 60} minutes</p>
            ${String(lesson.lesson_week || "").trim() ? `<p><strong>Week/Session:</strong> ${String(lesson.lesson_week || "").trim()}</p>` : ""}
        </div>
        <div class="lesson-card-focus">
            <p>${String(lesson.lesson_focus || "").trim().substring(0, 150)}${String(lesson.lesson_focus || "").trim().length > 150 ? "..." : ""}</p>
        </div>
        <div class="lesson-card-actions">
            ${String(lesson.lesson_link_url || "").trim() ? `<a href="${String(lesson.lesson_link_url).trim()}" class="button button-tertiary" target="_blank" rel="noreferrer">View Resources</a>` : ""}
            <button class="button button-secondary" type="button" data-lesson-id="${String(lesson.id)}">View Details</button>
        </div>
    `;

    const viewButton = card.querySelector('[data-lesson-id]');
    if (viewButton) {
        viewButton.addEventListener("click", () => {
            showLessonDetails(lesson);
        });
    }

    return card;
}

function showLessonDetails(lesson) {
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${String(lesson.activity_name || lesson.lesson_title || "Lesson Details").trim()}</h2>
                <button class="modal-close" type="button" aria-label="Close">×</button>
            </div>
            <div class="modal-body">
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Lesson Title</label>
                        <p>${String(lesson.lesson_title || "").trim()}</p>
                    </div>
                    <div class="detail-item">
                        <label>Activity Name</label>
                        <p>${String(lesson.activity_name || "").trim()}</p>
                    </div>
                    <div class="detail-item">
                        <label>Year Level</label>
                        <p>${String(lesson.lesson_year_level || "").trim()}</p>
                    </div>
                    <div class="detail-item">
                        <label>Activity Type</label>
                        <p>${String(lesson.lesson_type || "").trim()}</p>
                    </div>
                    <div class="detail-item">
                        <label>Duration</label>
                        <p>${lesson.lesson_duration_minutes || 60} minutes</p>
                    </div>
                    <div class="detail-item">
                        <label>Card Colour</label>
                        <p>${String(lesson.lesson_card_color || "Rose").trim()}</p>
                    </div>
                    ${String(lesson.lesson_week || "").trim() ? `
                    <div class="detail-item">
                        <label>Week / Session</label>
                        <p>${String(lesson.lesson_week || "").trim()}</p>
                    </div>
                    ` : ""}
                    ${String(lesson.lesson_date || "").trim() ? `
                    <div class="detail-item">
                        <label>Calendar Date</label>
                        <p>${String(lesson.lesson_date || "").trim()}</p>
                    </div>
                    ` : ""}
                </div>
                
                ${String(lesson.lesson_focus || "").trim() ? `
                <div class="detail-section">
                    <h4>Lesson Focus</h4>
                    <p>${String(lesson.lesson_focus || "").trim()}</p>
                </div>
                ` : ""}
                
                ${String(lesson.lesson_notes || "").trim() ? `
                <div class="detail-section">
                    <h4>Lesson Notes</h4>
                    <p>${String(lesson.lesson_notes || "").trim()}</p>
                </div>
                ` : ""}
                
                ${String(lesson.lesson_link_url || "").trim() ? `
                <div class="detail-section">
                    <h4>Lesson Link</h4>
                    <a href="${String(lesson.lesson_link_url).trim()}" target="_blank" rel="noreferrer">${String(lesson.lesson_link_url).trim()}</a>
                </div>
                ` : ""}
                
                ${String(lesson.created_by_email || "").trim() ? `
                <div class="detail-section">
                    <p class="detail-meta"><small>Created by ${String(lesson.created_by_email).trim()}</small></p>
                </div>
                ` : ""}
            </div>
            <div class="modal-footer">
                <button class="button button-secondary modal-close" type="button">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeButtons = modal.querySelectorAll(".modal-close");
    closeButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            modal.remove();
        });
    });

    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function filterLessons() {
    const searchInput = document.querySelector("#lesson-search");
    const yearFilter = document.querySelector("#lesson-year-filter");
    const container = document.querySelector("#lessons-container");
    const emptyState = document.querySelector("#empty-state");

    const searchQuery = String(searchInput?.value || "").toLowerCase().trim();
    const selectedYear = String(yearFilter?.value || "").trim();

    const filtered = allLessons.filter((lesson) => {
        const matchesSearch =
            !searchQuery ||
            String(lesson.lesson_title || "").toLowerCase().includes(searchQuery) ||
            String(lesson.activity_name || "").toLowerCase().includes(searchQuery) ||
            String(lesson.lesson_type || "").toLowerCase().includes(searchQuery) ||
            String(lesson.lesson_focus || "").toLowerCase().includes(searchQuery);

        const matchesYear = !selectedYear || String(lesson.lesson_year_level || "").includes(selectedYear);

        return matchesSearch && matchesYear;
    });

    container.innerHTML = "";
    emptyState.hidden = filtered.length > 0;

    filtered.forEach((lesson) => {
        container.appendChild(renderLessonCard(lesson));
    });
}

async function loadLessons() {
    try {
        const response = await fetch("/api/lessons");
        if (!response.ok) {
            console.error("Failed to load lessons");
            return;
        }

        const data = await response.json();
        allLessons = Array.isArray(data) ? data : Array.isArray(data?.lessons) ? data.lessons : [];
        filterLessons();
    } catch (error) {
        console.error("Error loading lessons:", error);
    }
}

function initializeFilters() {
    const searchInput = document.querySelector("#lesson-search");
    const yearFilter = document.querySelector("#lesson-year-filter");

    if (searchInput) {
        searchInput.addEventListener("input", filterLessons);
    }

    if (yearFilter) {
        yearFilter.addEventListener("change", filterLessons);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initializeFilters();
    loadLessons();
});
