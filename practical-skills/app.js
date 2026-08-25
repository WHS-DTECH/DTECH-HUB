(function () {
    "use strict";

    const dataPath = "/practical-skills/library.json";
    const grid = document.getElementById("practical-skills-grid");
    const meta = document.getElementById("practical-skills-results-meta");
    const searchInput = document.getElementById("practical-skills-search");
    const yearPillsContainer = document.getElementById("practical-skills-year-pills");
    const statusPillsContainer = document.getElementById("practical-skills-status-pills");
    const categoryPillsContainer = document.getElementById("practical-skills-category-pills");
    const sortSelect = document.getElementById("practical-skills-sort");

    let library = [];
    const state = {
        search: "",
        year: "All",
        status: "All",
        category: "All",
        sort: "name-asc"
    };

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function formatStatus(status) {
        const raw = String(status || "").trim();
        if (!raw) return "Active";
        return raw.charAt(0).toUpperCase() + raw.slice(1);
    }

    function getUniqueValues(field) {
        const values = new Set();
        library.forEach((item) => {
            const value = String(item[field] || "").trim();
            if (value) values.add(value);
        });
        return ["All", ...Array.from(values).sort((a, b) => a.localeCompare(b))];
    }

    function updatePillsActiveState(container, activeValue) {
        if (!container) return;
        const pills = container.querySelectorAll(".filter-chip");
        pills.forEach((pill) => {
            pill.classList.toggle("active", pill.dataset.value === activeValue);
        });
    }

    function renderPillGroup(container, values, activeValue, onSelect) {
        if (!container) return;
        container.innerHTML = "";
        values.forEach((value) => {
            const pill = document.createElement("button");
            pill.type = "button";
            pill.className = `filter-chip ${value === activeValue ? "active" : ""}`;
            pill.dataset.value = value;
            pill.textContent = value;
            pill.addEventListener("click", () => {
                onSelect(value);
                updatePillsActiveState(container, value);
                renderCards();
            });
            container.appendChild(pill);
        });
    }

    function populateFilters() {
        renderPillGroup(yearPillsContainer, getUniqueValues("yearLevel"), state.year, (value) => {
            state.year = value;
        });
        renderPillGroup(statusPillsContainer, getUniqueValues("status"), state.status, (value) => {
            state.status = value;
        });
        renderPillGroup(categoryPillsContainer, getUniqueValues("area"), state.category, (value) => {
            state.category = value;
        });
    }

    function filterLibrary(items) {
        const query = state.search.trim().toLowerCase();

        return items.filter((item) => {
            if (state.year !== "All" && String(item.yearLevel || "") !== state.year) return false;
            if (state.status !== "All" && String(item.status || "") !== state.status) return false;
            if (state.category !== "All" && String(item.area || "") !== state.category) return false;

            if (query) {
                const haystack = [item.title, item.summary, item.yearLevel, item.area]
                    .map((value) => String(value || "").toLowerCase())
                    .join(" ");
                if (!haystack.includes(query)) return false;
            }

            return true;
        });
    }

    function sortLibrary(items) {
        const sorted = [...items];
        switch (state.sort) {
            case "name-desc":
                sorted.sort((a, b) => String(b.title || "").localeCompare(String(a.title || "")));
                break;
            case "status":
                sorted.sort((a, b) => String(a.status || "").localeCompare(String(b.status || "")));
                break;
            case "name-asc":
            default:
                sorted.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
                break;
        }
        return sorted;
    }

    function createPracticalSkillCard(item) {
        const card = document.createElement("a");
        card.className = "project-card";
        card.href = String(item.href || "#");
        card.target = "_self";
        card.rel = "";
        card.setAttribute("aria-label", `Open ${String(item.title || "Practical Skill")}`);

        const icon = String(item?.visual?.icon || "PS").trim() || "PS";
        const palette = String(item?.visual?.palette || "linear-gradient(135deg, #2f8f61 0%, #3ca873 54%, #65c494 100%)");
        const imageUrl = String(item.imageUrl || "").trim();
        const hasImage = imageUrl.length > 0;
        const visualStyle = hasImage ? "" : `style=\"background: ${escapeHtml(palette)};\"`;
        const visualContent = hasImage
            ? `<img src=\"${escapeHtml(imageUrl)}\" alt=\"${escapeHtml(item.title)}\" class=\"project-image\" loading=\"lazy\">`
            : `<span class=\"visual-mark\">${escapeHtml(icon)}</span>`;

        card.innerHTML = `
            <div class="project-visual" ${visualStyle}>
                ${visualContent}
            </div>
            <div class="project-body">
                <div class="project-header">
                    <h3>${escapeHtml(item.title)}</h3>
                </div>
                <p class="project-description">${escapeHtml(item.summary)}</p>
                <div class="project-tags">
                    <span class="project-tag status-tag status-${escapeHtml(String(item.status || "active").toLowerCase())}">${escapeHtml(formatStatus(item.status))}</span>
                    <span class="project-tag">${escapeHtml(item.yearLevel || "All Years")}</span>
                    <span class="project-tag">${escapeHtml(item.area || "Practical Skills")}</span>
                </div>
                <div class="project-footer">
                    <span class="project-meta">PRACTICAL SKILL</span>
                </div>
            </div>
        `;

        return card;
    }

    function renderCards() {
        if (!grid) return;

        const list = sortLibrary(filterLibrary(library));

        grid.innerHTML = "";

        if (meta) {
            meta.textContent = `${list.length} item${list.length === 1 ? "" : "s"} shown`;
        }

        if (!list.length) {
            const emptyState = document.createElement("div");
            emptyState.className = "about-card";
            emptyState.innerHTML = `
                <p class="section-kicker">No Results</p>
                <h2>No practical skills matched that search.</h2>
                <p>Try a different keyword or reset the filters back to All.</p>
            `;
            grid.appendChild(emptyState);
            grid.style.display = "";
            return;
        }

        list.forEach((item) => {
            grid.appendChild(createPracticalSkillCard(item));
        });

        grid.style.display = "flex";
        grid.style.flexWrap = "wrap";
        grid.style.gap = "12px";
        grid.style.marginTop = "10px";
        grid.style.minWidth = "0";
    }

    function bindControls() {
        if (searchInput) {
            searchInput.addEventListener("input", () => {
                state.search = searchInput.value;
                renderCards();
            });
        }

        if (sortSelect) {
            sortSelect.addEventListener("change", () => {
                state.sort = sortSelect.value;
                renderCards();
            });
        }
    }

    async function loadPracticalSkillsLibrary() {
        try {
            const response = await fetch(dataPath, { cache: "no-store" });
            if (!response.ok) {
                throw new Error("Could not load practical skills library.");
            }

            const payload = await response.json();
            library = Array.isArray(payload) ? payload : [];
        } catch (_error) {
            library = [];
        }

        populateFilters();
        bindControls();
        renderCards();
    }

    loadPracticalSkillsLibrary();
})();

