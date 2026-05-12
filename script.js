const projects = [
    {
        id: "python-debug-lab",
        title: "Python Debug Lab",
        className: "Year 11 Computer Lab",
        area: "Programming",
        status: "active",
        term: "Term 2",
        updated: "2026-05-06",
        href: "ClassTrainingSystem/app/templates/module2/debugging_intro.html",
        external: false,
        summary: "Track down logic bugs, run tests, and improve code quality with guided debugging missions.",
        keywords: ["python", "debugging", "logic", "troubleshooting", "code fixes"],
        visual: {
            icon: "PY",
            label: "Debug Mission",
            palette: "linear-gradient(135deg, #8d316f 0%, #b15186 56%, #c96e9c 100%)"
        }
    },
    {
        id: "web-ui-remix",
        title: "Web UI Remix",
        className: "Year 10 Computer Lab",
        area: "Web Design",
        status: "active",
        term: "Term 2",
        updated: "2026-05-05",
        href: "index.html",
        external: false,
        summary: "Re-style an existing page with stronger visual hierarchy, accessibility checks, and responsive layout improvements.",
        keywords: ["html", "css", "ui", "layout", "responsive"],
        visual: {
            icon: "UI",
            label: "Design Sprint",
            palette: "linear-gradient(135deg, #8c5a2a 0%, #b67a3c 52%, #d39552 100%)"
        }
    },
    {
        id: "robotics-control-board",
        title: "Robotics Control Board",
        className: "Year 12 Computer Lab",
        area: "Physical Computing",
        status: "active",
        term: "Term 2",
        updated: "2026-05-04",
        href: "ProjectPages/maker-lab-builds.html",
        external: false,
        summary: "Build and monitor microcontroller projects, capture test data, and document each hardware iteration.",
        keywords: ["robotics", "microcontroller", "hardware", "prototyping", "testing"],
        visual: {
            icon: "RB",
            label: "Control Build",
            palette: "linear-gradient(135deg, #236d8c 0%, #2f95b2 48%, #4ab5cc 100%)"
        }
    },
    {
        id: "data-visual-story",
        title: "Data Visual Story",
        className: "Year 12 Computer Lab",
        area: "Data Skills",
        status: "planning",
        term: "Term 2",
        updated: "2026-05-03",
        href: "ProjectPages/digital-portfolio-studio.html",
        external: false,
        summary: "Convert class data into clear visual dashboards and short evidence-based stories for assessment.",
        keywords: ["data", "charts", "dashboard", "analysis", "storytelling"],
        visual: {
            icon: "DS",
            label: "Data Narrative",
            palette: "linear-gradient(135deg, #2e7a56 0%, #3f9e70 52%, #5fbf8a 100%)"
        }
    },
    {
        id: "cyber-safety-lab",
        title: "Cyber Safety Lab",
        className: "Year 9 Computer Lab",
        area: "Cyber Security",
        status: "planning",
        term: "Term 2",
        updated: "2026-05-01",
        href: "https://sites.google.com/westlandhigh.school.nz/dtec/home",
        external: true,
        summary: "Learn password hygiene, phishing detection, and practical online safety routines through mini challenges.",
        keywords: ["cyber", "security", "phishing", "privacy", "safety"],
        visual: {
            icon: "CS",
            label: "Cyber Basics",
            palette: "linear-gradient(135deg, #5d267d 0%, #7f35a8 54%, #9a4bc0 100%)"
        }
    },
    {
        id: "digital-portfolio-studio",
        title: "Digital Portfolio Studio",
        className: "Year 11 Computer Lab",
        area: "Digital Learning",
        status: "archive",
        term: "Term 1",
        updated: "2026-03-28",
        href: "ProjectPages/digital-portfolio-studio.html",
        external: false,
        summary: "An archive of published reflections, checkpoints, and final showcase evidence from prior units.",
        keywords: ["portfolio", "digital", "showcase", "reflection", "archive"],
        visual: {
            icon: "DP",
            label: "Portfolio Archive",
            palette: "linear-gradient(135deg, #4d3ba0 0%, #6a58b5 52%, #8a75c4 100%)"
        }
    },
    {
        id: "maker-lab-builds",
        title: "Maker Lab Builds",
        className: "Year 13 Computer Lab",
        area: "STEM Projects",
        status: "archive",
        term: "Term 1",
        updated: "2026-02-14",
        href: "ProjectPages/maker-lab-builds.html",
        external: false,
        summary: "Archived prototypes, sprint notes, and build logs from fabrication and automation challenges.",
        keywords: ["maker", "engineering", "builds", "prototypes", "stem"],
        visual: {
            icon: "ML",
            label: "Prototype Archive",
            palette: "linear-gradient(135deg, #4d4f67 0%, #676c86 50%, #8b90a8 100%)"
        }
    }
];

const state = {
    search: "",
    sort: "name-asc",
    category: "All"
};

const statusOrder = {
    active: 0,
    planning: 1,
    archive: 2
};

const currentProjectGrid = document.querySelector("#current-project-grid");
const libraryGrid = document.querySelector("#project-library-grid");
const searchInput = document.querySelector("#project-search");
const sortSelect = document.querySelector("#sort-order");
const categoryFilters = document.querySelector("#category-filters");
const libraryResultsMeta = document.querySelector("#library-results-meta");
const activeCount = document.querySelector("#stat-active-count");
const totalCount = document.querySelector("#stat-total-count");
const categoryCount = document.querySelector("#stat-category-count");

function getCategories() {
    return ["All", ...new Set(projects.map((project) => project.area))];
}

function sortProjects(items) {
    const sorted = [...items];

    switch (state.sort) {
        case "name-desc":
            sorted.sort((left, right) => right.title.localeCompare(left.title));
            break;
        case "status":
            sorted.sort((left, right) => {
                const statusDelta = statusOrder[left.status] - statusOrder[right.status];
                return statusDelta || left.title.localeCompare(right.title);
            });
            break;
        case "recent":
            sorted.sort((left, right) => new Date(right.updated) - new Date(left.updated));
            break;
        case "name-asc":
        default:
            sorted.sort((left, right) => left.title.localeCompare(right.title));
            break;
    }

    return sorted;
}

function filterProjects(items) {
    const query = state.search.trim().toLowerCase();

    return items.filter((project) => {
        const matchesCategory = state.category === "All" || project.area === state.category;
        const haystack = [project.title, project.className, project.area, project.summary, ...project.keywords]
            .join(" ")
            .toLowerCase();
        const matchesSearch = !query || haystack.includes(query);

        return matchesCategory && matchesSearch;
    });
}

function createProjectCard(project) {
    const card = document.createElement("a");
    card.className = "project-card";
    card.href = project.href;
    card.target = project.external ? "_blank" : "_self";
    card.rel = project.external ? "noreferrer" : "";
    card.setAttribute("aria-label", `Open ${project.title}`);

    card.innerHTML = `
        <div class="project-visual" style="background: ${project.visual.palette};">
            <span class="visual-label">
                <span class="visual-mark">${project.visual.icon}</span>
                ${project.visual.label}
            </span>
        </div>
        <div class="project-body">
            <div class="project-tags">
                <span class="status-tag status-${project.status}">${formatStatus(project.status)}</span>
                <span class="project-tag">${project.area}</span>
                <span class="project-tag">${project.term}</span>
            </div>
            <h3>${project.title}</h3>
            <p class="project-description">${project.summary}</p>
            <div class="project-footer">
                <div>
                    <div class="project-meta">${project.className}</div>
                    <div class="project-path">${project.external ? "External activity link" : project.href}</div>
                </div>
                <span class="project-link">Open activity</span>
            </div>
        </div>
    `;

    return card;
}

function formatStatus(status) {
    return status.charAt(0).toUpperCase() + status.slice(1);
}

function renderCategoryFilters() {
    categoryFilters.innerHTML = "";

    getCategories().forEach((category) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `filter-chip${state.category === category ? " is-active" : ""}`;
        button.textContent = category;
        button.addEventListener("click", () => {
            state.category = category;
            renderLibrary();
            renderCategoryFilters();
        });
        categoryFilters.appendChild(button);
    });
}

function renderCurrentProjects() {
    currentProjectGrid.innerHTML = "";
    const activeProjects = sortProjects(projects.filter((project) => project.status === "active"));

    activeProjects.forEach((project) => {
        currentProjectGrid.appendChild(createProjectCard(project));
    });
}

function renderLibrary() {
    libraryGrid.innerHTML = "";
    const visibleProjects = sortProjects(filterProjects(projects));

    libraryResultsMeta.textContent = `${visibleProjects.length} activit${visibleProjects.length === 1 ? "y" : "ies"} shown`;

    if (!visibleProjects.length) {
        const emptyState = document.createElement("div");
        emptyState.className = "about-card";
        emptyState.innerHTML = `
            <p class="section-kicker">No Results</p>
            <h2>No activities matched that search.</h2>
            <p>Try a different keyword or switch back to the All filter to widen the library.</p>
        `;
        libraryGrid.appendChild(emptyState);
        return;
    }

    visibleProjects.forEach((project) => {
        libraryGrid.appendChild(createProjectCard(project));
    });
}

function renderStats() {
    activeCount.textContent = projects.filter((project) => project.status === "active").length;
    totalCount.textContent = projects.length;
    categoryCount.textContent = new Set(projects.map((project) => project.area)).size;
}

function bindControls() {
    searchInput.addEventListener("input", (event) => {
        state.search = event.target.value;
        renderLibrary();
    });

    sortSelect.addEventListener("change", (event) => {
        state.sort = event.target.value;
        renderLibrary();
        renderCurrentProjects();
    });
}

function init() {
    renderStats();
    renderCategoryFilters();
    renderCurrentProjects();
    renderLibrary();
    bindControls();
}

init();