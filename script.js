const projects = [
    {
        id: "food-room-recipe-book",
        title: "Food Room Recipe Book",
        className: "Hospitality and Food Technology",
        area: "Food Technology",
        status: "active",
        term: "Term 2",
        updated: "2026-05-06",
        href: "https://recipe-calculator-backend.onrender.com/index.html",
        external: true,
        summary: "A searchable class cookbook with practical recipes, student-friendly filters, and fast access to current weekly cooking tasks.",
        keywords: ["recipe", "cooking", "hospitality", "food room", "showcase"],
        visual: {
            icon: "FR",
            label: "Recipe Book",
            palette: "linear-gradient(135deg, #155694 0%, #3da6ea 58%, #ffb26f 100%)"
        }
    },
    {
        id: "detention-tracker",
        title: "Detention Tracker",
        className: "Student Support Systems",
        area: "Administration",
        status: "planning",
        term: "Term 2",
        updated: "2026-05-05",
        href: "Detention/index.html",
        external: false,
        summary: "A project space for recording incidents, assigning follow-up actions, and helping staff manage student accountability clearly.",
        keywords: ["detention", "support", "tracking", "student management"],
        visual: {
            icon: "DT",
            label: "Support Workflow",
            palette: "linear-gradient(135deg, #254c6d 0%, #4f89ba 55%, #d8eefb 100%)"
        }
    },
    {
        id: "guidance-counsellor-portal",
        title: "Guidance Counsellor Portal",
        className: "Wellbeing and Pastoral Care",
        area: "Student Support",
        status: "active",
        term: "Term 2",
        updated: "2026-05-04",
        href: "GuidanceCounsellor/index.html",
        external: false,
        summary: "A student support hub for referrals, wellbeing check-ins, and shared access to counselling resources and processes.",
        keywords: ["guidance", "counsellor", "wellbeing", "referral", "support"],
        visual: {
            icon: "GC",
            label: "Wellbeing Hub",
            palette: "linear-gradient(135deg, #0d5b59 0%, #57b8ad 52%, #dff5e8 100%)"
        }
    },
    {
        id: "interhapu-collaboration",
        title: "InterHapu Collaboration",
        className: "Culture, Community and Design",
        area: "Community Projects",
        status: "active",
        term: "Term 2",
        updated: "2026-05-03",
        href: "InterHapu/index.html",
        external: false,
        summary: "A collaborative project space for community storytelling, planning, resources, and student-led design work across groups.",
        keywords: ["interhapu", "community", "culture", "collaboration", "design"],
        visual: {
            icon: "IH",
            label: "Community Design",
            palette: "linear-gradient(135deg, #6d3d1f 0%, #c5773b 45%, #f3ddc2 100%)"
        }
    },
    {
        id: "digital-portfolio-studio",
        title: "Digital Portfolio Studio",
        className: "Digital Technologies",
        area: "Digital Learning",
        status: "archive",
        term: "Term 1",
        updated: "2026-03-28",
        href: "ProjectPages/digital-portfolio-studio.html",
        external: false,
        summary: "A portfolio space where students published project reflections, media evidence, and final showcase artifacts from earlier work.",
        keywords: ["portfolio", "digital", "showcase", "reflection"],
        visual: {
            icon: "DP",
            label: "Showcase Archive",
            palette: "linear-gradient(135deg, #4437a8 0%, #7a74e8 52%, #ddd9ff 100%)"
        }
    },
    {
        id: "maker-lab-builds",
        title: "Maker Lab Builds",
        className: "Engineering and Fabrication",
        area: "STEM Projects",
        status: "archive",
        term: "Term 1",
        updated: "2026-02-14",
        href: "ProjectPages/maker-lab-builds.html",
        external: false,
        summary: "An archive of prototypes, build journals, and workshop documentation for practical engineering projects completed this year.",
        keywords: ["maker", "engineering", "builds", "prototypes", "stem"],
        visual: {
            icon: "ML",
            label: "Prototype Archive",
            palette: "linear-gradient(135deg, #1e2f55 0%, #4c73a8 50%, #d9e7fb 100%)"
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
                    <div class="project-path">${project.external ? "External project link" : project.href}</div>
                </div>
                <span class="project-link">Open project</span>
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

    libraryResultsMeta.textContent = `${visibleProjects.length} project${visibleProjects.length === 1 ? "" : "s"} shown`;

    if (!visibleProjects.length) {
        const emptyState = document.createElement("div");
        emptyState.className = "about-card";
        emptyState.innerHTML = `
            <p class="section-kicker">No Results</p>
            <h2>No projects matched that search.</h2>
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