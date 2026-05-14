const baseProjects = [
    {
        id: "python-debug-lab",
        title: "Python Debug Lab",
        className: "Year 11 Computer Lab",
        area: "Programming",
        activityCategory: "Practice",
        showThisWeek: true,
        status: "active",
        term: "Term 2",
        updated: "2026-05-06",
        href: "ProjectPages/python-debug-lab.html",
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
        activityCategory: "Practice",
        showThisWeek: false,
        status: "active",
        term: "Term 2",
        updated: "2026-05-05",
        href: "ProjectPages/web-ui-remix.html",
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
        activityCategory: "Practice",
        showThisWeek: false,
        status: "active",
        term: "Term 2",
        updated: "2026-05-04",
        href: "ProjectPages/robotics-control-board.html",
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
        activityCategory: "Practice",
        showThisWeek: false,
        status: "planning",
        term: "Term 2",
        updated: "2026-05-03",
        href: "ProjectPages/data-visual-story.html",
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
        activityCategory: "Practice",
        showThisWeek: false,
        status: "planning",
        term: "Term 2",
        updated: "2026-05-01",
        href: "ProjectPages/cyber-safety-lab.html",
        external: false,
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
        activityCategory: "Practice",
        showThisWeek: false,
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
        activityCategory: "Practice",
        showThisWeek: false,
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

const baseLabProjects = [
    {
        id: "lab-project-maker-builds",
        title: "Maker Lab Builds",
        className: "Year 13 Computer Lab",
        projectPhase: "Build",
        status: "active",
        showThisWeek: true,
        term: "Term 2",
        updated: "2026-05-09",
        href: "ProjectPages/maker-lab-builds.html",
        external: false,
        summary: "Teams are fabricating prototypes and logging workshop test cycles for automation concepts.",
        keywords: ["maker", "prototype", "build", "workshop"],
        visual: {
            icon: "ML",
            label: "Build Phase",
            palette: "linear-gradient(135deg, #4d4f67 0%, #676c86 50%, #8b90a8 100%)"
        }
    },
    {
        id: "lab-project-robotics-iterations",
        title: "Robotics Iterations",
        className: "Year 12 Computer Lab",
        projectPhase: "Testing",
        status: "active",
        showThisWeek: false,
        term: "Term 2",
        updated: "2026-05-08",
        href: "ProjectPages/robotics-control-board.html",
        external: false,
        summary: "Control boards are being tested and tuned using repeated sensor calibration loops.",
        keywords: ["robotics", "testing", "sensors", "microcontroller"],
        visual: {
            icon: "RB",
            label: "Testing Sprint",
            palette: "linear-gradient(135deg, #236d8c 0%, #2f95b2 48%, #4ab5cc 100%)"
        }
    },
    {
        id: "lab-project-digital-portfolio-showcase",
        title: "Portfolio Showcase Build",
        className: "Year 11 Computer Lab",
        projectPhase: "Showcase",
        status: "planning",
        showThisWeek: false,
        term: "Term 2",
        updated: "2026-05-07",
        href: "ProjectPages/digital-portfolio-studio.html",
        external: false,
        summary: "Students are curating evidence and preparing public-facing portfolio displays.",
        keywords: ["portfolio", "showcase", "presentation", "evidence"],
        visual: {
            icon: "DP",
            label: "Showcase Prep",
            palette: "linear-gradient(135deg, #4d3ba0 0%, #6a58b5 52%, #8a75c4 100%)"
        }
    },
    {
        id: "lab-project-ui-redesign-track",
        title: "UI Redesign Track",
        className: "Year 10 Computer Lab",
        projectPhase: "Prototype",
        status: "planning",
        showThisWeek: false,
        term: "Term 2",
        updated: "2026-05-05",
        href: "ProjectPages/web-ui-remix.html",
        external: false,
        summary: "Interface concepts are being prototyped and reviewed before final implementation.",
        keywords: ["ui", "prototype", "web", "design"],
        visual: {
            icon: "UI",
            label: "Prototype",
            palette: "linear-gradient(135deg, #8c5a2a 0%, #b67a3c 52%, #d39552 100%)"
        }
    },
    {
        id: "lab-project-cyber-challenge",
        title: "Cyber Challenge Series",
        className: "Year 9 Computer Lab",
        projectPhase: "Planning",
        status: "archive",
        showThisWeek: false,
        term: "Term 1",
        updated: "2026-04-28",
        href: "ProjectPages/cyber-safety-lab.html",
        external: false,
        summary: "Archived challenge banks and reflective writeups from prior cyber missions.",
        keywords: ["cyber", "challenge", "security", "archive"],
        visual: {
            icon: "CS",
            label: "Challenge Track",
            palette: "linear-gradient(135deg, #5d267d 0%, #7f35a8 54%, #9a4bc0 100%)"
        }
    }
];


let projects = [...baseProjects];
let labProjects = [...baseLabProjects];

// Dynamically load backend activities and refresh library
async function refreshActivitiesLibrary() {
    const sharedProjects = await loadSharedProjects();
    projects = mergeProjects(sharedProjects);
    renderLibrary();
}

function colorToPalette(colorName) {
    const palettes = {
        rose: "linear-gradient(135deg, #8d316f 0%, #b15186 56%, #c96e9c 100%)",
        azure: "linear-gradient(135deg, #236d8c 0%, #2f95b2 48%, #4ab5cc 100%)",
        amber: "linear-gradient(135deg, #8c5a2a 0%, #b67a3c 52%, #d39552 100%)",
        violet: "linear-gradient(135deg, #5d267d 0%, #7f35a8 54%, #9a4bc0 100%)",
        teal: "linear-gradient(135deg, #2e7a56 0%, #3f9e70 52%, #5fbf8a 100%)",
        slate: "linear-gradient(135deg, #4d4f67 0%, #676c86 50%, #8b90a8 100%)"
    };

    return palettes[String(colorName || "").toLowerCase()] || palettes.rose;
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function textToIcon(text) {
    return String(text || "CL")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("") || "CL";
}

function slugify(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

async function loadSharedProjects() {
    try {
        const response = await fetch("/api/activities");
        if (!response.ok) return [];

        const parsed = await response.json();
        if (!Array.isArray(parsed)) return [];

        return parsed
            .map((item) => {
                const title = String(item.name || "").trim();
                if (!title) return null;

                const id = String(item.id || slugify(title) || `activity-${Date.now()}`);
                const yearLevel = String(item.year_level || "Year 9").trim();
                const type = String(item.type || "Digital Learning").trim();
                const category = String(item.activity_category || "Practice").trim();
                const summary = String(item.description || "Teacher-uploaded activity").trim();
                const created = String(item.created_at || new Date().toISOString()).slice(0, 10);
                const imageUrl = String(item.outcome_image_url || "").trim();

                return {
                    id,
                    title,
                    className: `${yearLevel} Computer Lab`,
                    area: type,
                    activityCategory: category,
                    showThisWeek: Boolean(item.show_in_this_week),
                    status: item.show_in_this_week ? "active" : "planning",
                    term: String(item.term || "Term 2"),
                    updated: created,
                    href: `ProjectPages/custom-activity.html?id=${encodeURIComponent(id)}`,
                    external: false,
                    summary,
                    keywords: [type, category, String(item.difficulty || ""), "teacher upload"].filter(Boolean),
                    imageUrl: imageUrl || null,
                    visual: {
                        icon: textToIcon(type),
                        label: "Teacher Upload",
                        palette: colorToPalette(item.card_color)
                    }
                };
            })
            .filter(Boolean);
    } catch (_error) {
        return [];
    }
}

function mergeProjects(sharedProjects) {
    const byId = new Map();
    const byTitle = new Map();
    
    [...baseProjects, ...sharedProjects].forEach((project) => {
        // First dedup by title - if we've already seen this title, skip it
        const titleKey = project.title.toLowerCase().trim();
        if (byTitle.has(titleKey)) {
            return; // Skip this duplicate title
        }
        byTitle.set(titleKey, true);
        
        // Then add/update by ID
        byId.set(project.id, project);
    });

    return Array.from(byId.values());
}

function mapLabProjectToLibraryItem(project) {
    return {
        id: `lab-${project.id}`,
        title: project.title,
        className: project.className,
        area: "Lab Project",
        activityCategory: `Project ${project.projectPhase}`,
        showThisWeek: Boolean(project.showThisWeek),
        status: project.status,
        term: project.term,
        updated: project.updated,
        href: project.href,
        external: project.external,
        summary: project.summary,
        keywords: [...(Array.isArray(project.keywords) ? project.keywords : []), "project", "lab project"],
        visual: project.visual,
        linkLabel: "Open project"
    };
}

function getUnifiedLibraryItems() {
    return [...projects, ...labProjects.map(mapLabProjectToLibraryItem)];
}

const HUB_AUTH_STORAGE_KEY = "hub_google_auth_v1";

function getHubStoredAuthRaw() {
    let localValue = null;
    let sessionValue = null;

    try {
        localValue = localStorage.getItem(HUB_AUTH_STORAGE_KEY);
    } catch (_error) {
        localValue = null;
    }

    try {
        sessionValue = sessionStorage.getItem(HUB_AUTH_STORAGE_KEY);
    } catch (_error) {
        sessionValue = null;
    }

    // One-time migration from older session storage key usage.
    if (!localValue && sessionValue) {
        try {
            localStorage.setItem(HUB_AUTH_STORAGE_KEY, sessionValue);
        } catch (_error) {
        }
    }

    return localValue || sessionValue;
}

function setHubStoredAuthRaw(value) {
    try {
        localStorage.setItem(HUB_AUTH_STORAGE_KEY, value);
    } catch (_error) {
        try {
            sessionStorage.setItem(HUB_AUTH_STORAGE_KEY, value);
        } catch (_innerError) {
        }
    }
}

function clearHubStoredAuthRaw() {
    try {
        localStorage.removeItem(HUB_AUTH_STORAGE_KEY);
    } catch (_error) {
    }

    try {
        sessionStorage.removeItem(HUB_AUTH_STORAGE_KEY);
    } catch (_error) {
    }
}

const hubGoogleClientId =
    document.querySelector('meta[name="hub-google-client-id"]')?.content.trim() ||
    window.HUB_GOOGLE_CLIENT_ID ||
    "";

function enforceCanonicalHubOrigin() {
    if (typeof window === "undefined") {
        return;
    }

    const legacyHosts = new Set(["dtech-hub.onrender.com"]);
    const canonicalHost = "dtech-hub2.onrender.com";
    const currentHost = window.location.hostname.toLowerCase();

    if (!legacyHosts.has(currentHost)) {
        return;
    }

    const targetUrl = `https://${canonicalHost}${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(targetUrl);
}

enforceCanonicalHubOrigin();

function renderGlobalNavbar() {
    const topbar = document.querySelector(".topbar");
    if (!topbar || topbar.dataset.globalNavbar === "true") {
        return;
    }

    const browseMenu = `<a id="hub-browse-practicals-link" data-auth-browse href="/browse-practicals.html" hidden>Browse Practicals</a>`;

    const uploadMenu = `
        <details class="nav-dropdown" id="hub-upload-menu" data-nav-dropdown hidden>
            <summary>Upload</summary>
            <div class="nav-drawer" role="menu">
                <a role="menuitem" href="/upload-project.html">Upload Project</a>
                <a role="menuitem" href="/upload-activity.html">Upload Activity</a>
                <a role="menuitem" href="/upload-menu.html">Upload Menu</a>
            </div>
        </details>
    `;
    const topbarMenu = `${browseMenu}${uploadMenu}`;

    topbar.dataset.globalNavbar = "true";
    topbar.setAttribute("aria-label", "Primary");
    topbar.innerHTML = `
        <a class="brand" href="/index.html">Computer Lab</a>
        <div class="topbar-right">
            <div class="topbar-links">
                ${topbarMenu}
            </div>
            <div class="utility-actions" aria-label="Utility actions">
                <a id="hub-staff-link" href="/teacher-view.html" hidden>Teacher View</a>
                <a id="hub-admin-link" href="/admin-menu.html" hidden>Admin Menu</a>
                <span id="hub-access-badge" class="hub-access-badge" hidden aria-live="polite"></span>
                <button id="hub-google-signin" class="google-signin-button" type="button">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="google-logo">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span>Sign in with Google</span>
                </button>
                <button id="hub-google-signout" type="button" hidden>Sign out</button>
                <button id="hub-user-badge" class="user-badge" type="button" hidden aria-label="Open profile" aria-haspopup="true" aria-expanded="false"></button>
            </div>
        </div>
    `;

    const dropdowns = Array.from(topbar.querySelectorAll("[data-nav-dropdown]"));
    dropdowns.forEach((dropdown) => {
        dropdown.addEventListener("toggle", () => {
            if (!dropdown.open) return;
            dropdowns.forEach((other) => {
                if (other !== dropdown) {
                    other.open = false;
                }
            });
        });
    });

    document.addEventListener("click", (event) => {
        if (!topbar.contains(event.target)) {
            dropdowns.forEach((dropdown) => {
                dropdown.open = false;
            });
        }
    });
}

renderGlobalNavbar();

const hubAllowedDomain =
    (document.querySelector('meta[name="hub-google-allowed-domain"]')?.content || "")
        .trim()
        .toLowerCase();

const hubAuthState = {
    accessToken: null,
    expiresAt: 0,
    profile: null,
    tokenClient: null
};

const hubAccessState = {
    resolved: false,
    isStaff: false,
    isStudent: false,
    canTeacherView: false,
    canAdmin: false,
    defaultView: "student",
    additionalRole: ""
};

const state = {
    search: "",
    sort: "name-asc",
    year: "All",
    type: "All",
    category: "All"
};

const labProjectState = {
    search: "",
    sort: "name-asc"
};

const statusOrder = {
    active: 0,
    planning: 1,
    archive: 2
};

const currentProjectGrid = document.querySelector("#current-project-grid");
const currentWeekGrid = document.querySelector("#current-week-grid");
const libraryGrid = document.querySelector("#project-library-grid");
const currentLabProjectGrid = document.querySelector("#current-lab-project-grid");
const labProjectLibraryGrid = document.querySelector("#lab-project-library-grid");
const searchInput = document.querySelector("#project-search");
const sortSelect = document.querySelector("#sort-order");
const labProjectSearchInput = document.querySelector("#lab-project-search");
const labProjectSortSelect = document.querySelector("#lab-project-sort");
const yearSelect = document.querySelector("#year-filter");
const typeSelect = document.querySelector("#type-filter");
const categorySelect = document.querySelector("#category-filter");
const libraryResultsMeta = document.querySelector("#library-results-meta");
const labProjectResultsMeta = document.querySelector("#lab-project-results-meta");
const activeCount = document.querySelector("#stat-active-count");
const runningDetail = document.querySelector("#stat-running-detail");
const totalCount = document.querySelector("#stat-total-count");
const categoryCount = document.querySelector("#stat-category-count");
const hubStaffLink = document.querySelector("#hub-staff-link");
const hubAdminLink = document.querySelector("#hub-admin-link");
const hubAccessBadge = document.querySelector("#hub-access-badge");
const hubSignInButton = document.querySelector("#hub-google-signin");
const hubSignOutButton = document.querySelector("#hub-google-signout");
const hubUserBadge = document.querySelector("#hub-user-badge");
const hubProfilePanel = document.querySelector("#hub-user-profile");
const hubProfileAvatar = document.querySelector("#hub-profile-avatar");
const hubProfileName = document.querySelector("#hub-profile-name");
const hubProfileEmail = document.querySelector("#hub-profile-email");
const hubProfileDisplayName = document.querySelector("#hub-profile-display-name");
const hubProfileDisplayEmail = document.querySelector("#hub-profile-display-email");
const hubProfileDomain = document.querySelector("#hub-profile-domain");
const hubProfileClose = document.querySelector("#hub-profile-close");
const hubBrowseMenu = document.querySelector("#hub-browse-menu");
const hubUploadMenu = document.querySelector("#hub-upload-menu");
const hubBrowseButtons = Array.from(document.querySelectorAll("[data-auth-browse]"));
const HUB_VIEW_MODE_STORAGE_KEY = "hub_view_mode_v1";

function readStoredHubViewMode() {
    try {
        const value = localStorage.getItem(HUB_VIEW_MODE_STORAGE_KEY);
        return value === "teacher" || value === "student" ? value : "";
    } catch (_error) {
        return "";
    }
}

function writeStoredHubViewMode(mode) {
    try {
        const normalized = mode === "teacher" ? "teacher" : "student";
        localStorage.setItem(HUB_VIEW_MODE_STORAGE_KEY, normalized);
    } catch (_error) {
        // Ignore storage errors in private or restricted browsing modes.
    }
}

function getEffectiveHubViewMode() {
    if (isTeacherWorkspacePath()) {
        return "teacher";
    }

    const storedMode = readStoredHubViewMode();
    if (storedMode) {
        return storedMode;
    }

    return hubAccessState.defaultView === "teacher" ? "teacher" : "student";
}

function isHomepagePath() {
    const path = String(window.location.pathname || "").toLowerCase();
    return path === "/" || path.endsWith("/index.html");
}

function isTeacherWorkspacePath() {
    const path = String(window.location.pathname || "").toLowerCase();
    return path.endsWith("/teacher-view.html") || path.endsWith("/upload-activity.html") || path.endsWith("/upload-project.html") || path.endsWith("/upload-menu.html");
}

function setPublicHomepageUiState(signedIn) {
    if (!document.body || !isHomepagePath()) {
        return;
    }

    document.body.classList.toggle("public-home-access", !signedIn);
}


// Ensure public-home-access and refresh library on page load
document.addEventListener("DOMContentLoaded", function() {
    // If hubAuthState is not available yet, fallback to not signed in
    var signedIn = (typeof hubAuthState !== 'undefined' && hubAuthState.profile && hubAuthState.profile.email);
    setPublicHomepageUiState(!!signedIn);

    // If on homepage and library grid exists, refresh activities from backend
    if (isHomepagePath() && document.querySelector("#project-library-grid")) {
        refreshActivitiesLibrary();
    }
});

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function getHubDisplayName(profile) {
    if (!profile) return "";
    return String(profile.name || profile.given_name || profile.email || "").trim();
}

function hasAllowedSignedInHubAccount() {
    const email = normalizeEmail(hubAuthState.profile?.email || "");
    if (!email) {
        return false;
    }

    if (!hubAllowedDomain) {
        return true;
    }

    return email.endsWith(`@${hubAllowedDomain}`);
}

function enforceDetailAccess(event) {
    if (hasAllowedSignedInHubAccount()) {
        return false;
    }

    event.preventDefault();
    event.stopPropagation();

    if (hubAuthState.tokenClient) {
        alert("Please sign in with your Westland High account to open details.");
        hubAuthState.tokenClient.requestAccessToken({ prompt: "consent" });
    } else {
        alert("Please sign in with your Westland High account to open details.");
    }

    return true;
}

function getHubUserInitials(profile) {
    const name = getHubDisplayName(profile);
    if (!name) return "--";

    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
    }

    return String(name.slice(0, 2)).toUpperCase();
}

function populateHubProfilePanel() {
    if (!hubAuthState.profile) {
        return;
    }

    const displayName = getHubDisplayName(hubAuthState.profile);
    const email = hubAuthState.profile.email || "-";
    const domain = email.includes("@") ? email.split("@")[1] : "-";
    const initials = getHubUserInitials(hubAuthState.profile);

    if (hubProfileAvatar) hubProfileAvatar.textContent = initials;
    if (hubProfileName) hubProfileName.textContent = displayName || "Staff User";
    if (hubProfileEmail) hubProfileEmail.textContent = email;
    if (hubProfileDisplayName) hubProfileDisplayName.textContent = displayName || "-";
    if (hubProfileDisplayEmail) hubProfileDisplayEmail.textContent = email;
    if (hubProfileDomain) hubProfileDomain.textContent = domain;
}

function setHubProfileOpen(isOpen) {
    if (!hubProfilePanel || !hubUserBadge) {
        return;
    }

    const canOpen = Boolean(hubAuthState.profile?.email);
    hubProfilePanel.hidden = !isOpen || !canOpen;
    hubUserBadge.setAttribute("aria-expanded", String(isOpen && canOpen));
}

function saveHubAuthState() {
    if (!hubAuthState.accessToken || !hubAuthState.profile) {
        clearHubStoredAuthRaw();
        return;
    }

    const payload = {
        accessToken: hubAuthState.accessToken,
        expiresAt: hubAuthState.expiresAt,
        profile: hubAuthState.profile
    };
    setHubStoredAuthRaw(JSON.stringify(payload));
}

function clearHubAuthState() {
    hubAuthState.accessToken = null;
    hubAuthState.expiresAt = 0;
    hubAuthState.profile = null;
    hubAccessState.resolved = false;
    hubAccessState.isStaff = false;
    hubAccessState.isStudent = false;
    hubAccessState.canTeacherView = false;
    hubAccessState.canAdmin = false;
    hubAccessState.defaultView = "student";
    hubAccessState.additionalRole = "";
    clearHubStoredAuthRaw();
    setHubProfileOpen(false);
}

async function resolveHubAccessState() {
    const email = normalizeEmail(hubAuthState.profile?.email || "");
    if (!email) {
        hubAccessState.resolved = false;
        hubAccessState.isStaff = false;
        hubAccessState.isStudent = false;
        hubAccessState.canTeacherView = false;
        hubAccessState.canAdmin = false;
        hubAccessState.defaultView = "student";
        hubAccessState.additionalRole = "";
        return;
    }

    try {
        const response = await fetch(`/api/auth/user-access?email=${encodeURIComponent(email)}`);
        if (!response.ok) {
            throw new Error("Could not resolve user access.");
        }

        const data = await response.json();
        hubAccessState.resolved = true;
        hubAccessState.isStaff = Boolean(data.is_staff);
        hubAccessState.isStudent = Boolean(data.is_student);
        hubAccessState.canTeacherView = Boolean(data.can_teacher_view);
        hubAccessState.canAdmin = Boolean(data.can_admin);
        hubAccessState.defaultView = String(data.default_view || "student").toLowerCase() === "teacher" ? "teacher" : "student";
        hubAccessState.additionalRole = String(data.additional_role || "").trim();
    } catch (_error) {
        // Safe fallback: do not expose teacher/admin links when access cannot be resolved.
        hubAccessState.resolved = false;
        hubAccessState.isStaff = false;
        hubAccessState.isStudent = false;
        hubAccessState.canTeacherView = false;
        hubAccessState.canAdmin = false;
        hubAccessState.defaultView = "student";
        hubAccessState.additionalRole = "";
    }
}

function loadHubAuthState() {
    const raw = getHubStoredAuthRaw();
    if (!raw) {
        return;
    }

    try {
        const parsed = JSON.parse(raw);
        const hasProfile = Boolean(parsed.profile?.email);
        const tokenIsValid = Boolean(parsed.accessToken && parsed.expiresAt && parsed.expiresAt > Date.now());

        if (tokenIsValid) {
            hubAuthState.accessToken = parsed.accessToken;
            hubAuthState.expiresAt = parsed.expiresAt;
            hubAuthState.profile = parsed.profile || null;
            return;
        }

        if (hasProfile) {
            // Keep profile state across pages even when the Google token has expired.
            hubAuthState.accessToken = null;
            hubAuthState.expiresAt = 0;
            hubAuthState.profile = parsed.profile;
            saveHubAuthState();
            return;
        }

        clearHubStoredAuthRaw();
    } catch (_error) {
        clearHubStoredAuthRaw();
    }
}

function isAllowedHubAccount(profile) {
    if (!profile?.email || !profile?.email_verified) {
        return false;
    }

    if (!hubAllowedDomain) {
        return true;
    }

    return profile.email.toLowerCase().endsWith(`@${hubAllowedDomain}`);
}

function renderHubAuthUi() {
    const signedIn = hasAllowedSignedInHubAccount();
    const canTeacherView = signedIn && hubAccessState.canTeacherView;
    const canAdmin = signedIn && hubAccessState.canAdmin;
    const canToggleView = canTeacherView || canAdmin;

    if (canToggleView && isTeacherWorkspacePath()) {
        writeStoredHubViewMode("teacher");
    }

    const inTeacherMode = canToggleView && getEffectiveHubViewMode() === "teacher";

    let badgeLabel = "";
    let badgeClass = "";
    if (signedIn) {
        if (canTeacherView && !canAdmin) {
            badgeLabel = "Staff";
            badgeClass = "badge-staff";
        } else if (!canAdmin) {
            badgeLabel = "Student";
            badgeClass = "badge-student";
        }
    }

    if (hubSignInButton) {
        hubSignInButton.hidden = signedIn;
    }
    if (hubSignOutButton) {
        hubSignOutButton.hidden = !signedIn;
    }
    if (hubUserBadge) {
        hubUserBadge.hidden = !signedIn;
        hubUserBadge.textContent = signedIn ? getHubUserInitials(hubAuthState.profile) : "";
        hubUserBadge.title = signedIn ? getHubDisplayName(hubAuthState.profile) : "";
    }
    if (hubStaffLink) {
        hubStaffLink.hidden = !canToggleView;
        if (canToggleView) {
            hubStaffLink.textContent = inTeacherMode ? "Switch to Student View" : "Switch to Teacher View";
            hubStaffLink.href = inTeacherMode ? "/index.html" : "/teacher-view.html";
        }
    }
    if (hubAdminLink) {
        hubAdminLink.hidden = !canAdmin;
    }
    if (hubUploadMenu) {
        hubUploadMenu.hidden = !(canAdmin || (canTeacherView && inTeacherMode));
        if (hubUploadMenu.hidden) {
            hubUploadMenu.open = false;
        }
    }
    if (hubAccessBadge) {
        hubAccessBadge.hidden = !signedIn || canAdmin || !badgeLabel;
        hubAccessBadge.textContent = badgeLabel;
        hubAccessBadge.className = badgeClass ? `hub-access-badge ${badgeClass}` : "hub-access-badge";
    }
    if (hubBrowseMenu) {
        hubBrowseMenu.hidden = !signedIn;
        if (!signedIn) {
            hubBrowseMenu.open = false;
        }
    }
    if (hubBrowseButtons.length) {
        hubBrowseButtons.forEach((element) => {
            element.hidden = !signedIn;
        });
    }

    setPublicHomepageUiState(signedIn);

    if (!signedIn) {
        setHubProfileOpen(false);
        return;
    }

    populateHubProfilePanel();
}

async function fetchGoogleUserProfile(accessToken) {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error("Could not fetch Google profile.");
    }
    return response.json();
}

async function handleHubGoogleToken(tokenResponse) {
    if (!tokenResponse?.access_token) {
        throw new Error("Google sign-in did not return an access token.");
    }

    const profile = await fetchGoogleUserProfile(tokenResponse.access_token);
    if (!isAllowedHubAccount(profile)) {
        throw new Error("This Google account is not allowed for this hub.");
    }

    hubAuthState.accessToken = tokenResponse.access_token;
    hubAuthState.expiresAt = Date.now() + (Number(tokenResponse.expires_in) || 3600) * 1000;
    hubAuthState.profile = profile;
    saveHubAuthState();
    await resolveHubAccessState();
    renderHubAuthUi();
}

function signOutHubGoogle() {
    if (window.google?.accounts?.oauth2 && hubAuthState.accessToken) {
        window.google.accounts.oauth2.revoke(hubAuthState.accessToken, () => {
            clearHubAuthState();
            renderHubAuthUi();
        });
        return;
    }

    clearHubAuthState();
    renderHubAuthUi();
}

function bindHubAuthControls() {
    if (hubSignInButton) {
        hubSignInButton.addEventListener("click", () => {
            if (!hubAuthState.tokenClient) {
                alert("Google sign-in is not configured yet. Add your Google client ID in the page metadata.");
                return;
            }
            hubAuthState.tokenClient.requestAccessToken({ prompt: "consent" });
        });
    }

    if (hubSignOutButton) {
        hubSignOutButton.addEventListener("click", signOutHubGoogle);
    }

    if (hubStaffLink) {
        hubStaffLink.addEventListener("click", (event) => {
            const signedIn = hasAllowedSignedInHubAccount();
            const canToggleView = signedIn && (hubAccessState.canTeacherView || hubAccessState.canAdmin);
            if (!canToggleView) {
                return;
            }

            const currentMode = getEffectiveHubViewMode();
            const nextMode = currentMode === "teacher" ? "student" : "teacher";
            writeStoredHubViewMode(nextMode);

            const targetHref = nextMode === "teacher" ? "/teacher-view.html" : "/index.html";
            if (isTeacherWorkspacePath()) {
                event.preventDefault();
                window.location.href = targetHref;
            }
        });
    }

    if (hubUserBadge) {
        hubUserBadge.addEventListener("click", () => {
            window.location.href = "/user-profile.html";
        });
    }

    if (hubProfileClose) {
        hubProfileClose.addEventListener("click", () => setHubProfileOpen(false));
    }
}

function initHubGoogleAuth() {
    loadHubAuthState();
    renderHubAuthUi();
    bindHubAuthControls();

    if (hubAuthState.profile?.email) {
        resolveHubAccessState().finally(renderHubAuthUi);
    }

    if (!hubGoogleClientId) {
        return;
    }

    const waitForGoogleLibrary = (attemptsLeft = 30) => {
        if (window.google?.accounts?.oauth2) {
            hubAuthState.tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: hubGoogleClientId,
                scope: "openid email profile",
                callback: async (tokenResponse) => {
                    try {
                        await handleHubGoogleToken(tokenResponse);
                    } catch (error) {
                        clearHubAuthState();
                        renderHubAuthUi();
                        alert(error.message || "Google sign-in failed.");
                    }
                }
            });
            return;
        }

        if (attemptsLeft <= 0) {
            return;
        }
        setTimeout(() => waitForGoogleLibrary(attemptsLeft - 1), 200);
    };

    waitForGoogleLibrary();
}

function getYearLevels() {
    return [...new Set(getUnifiedLibraryItems().map((project) => {
        const match = project.className.match(/Year\s+\d+/i);
        return match ? match[0] : "Other";
    }))].sort((left, right) => {
        const leftYear = Number.parseInt(left.replace(/\D+/g, ""), 10);
        const rightYear = Number.parseInt(right.replace(/\D+/g, ""), 10);

        if (Number.isNaN(leftYear) || Number.isNaN(rightYear)) {
            return left.localeCompare(right);
        }

        return leftYear - rightYear;
    });
}

function getTypes() {
    return ["All", "active", "planning", "archive"];
}

function getCategories() {
    return ["All", ...new Set(getUnifiedLibraryItems().map((project) => project.activityCategory)).values()];
}

function buildSelectOptions(selectElement, options, allLabel, formatter = (value) => value) {
    if (!selectElement) return;

    selectElement.innerHTML = "";
    options.forEach((optionValue) => {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionValue === "All" ? allLabel : formatter(optionValue);
        selectElement.appendChild(option);
    });
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
        const yearMatch = project.className.match(/Year\s+\d+/i);
        const projectYear = yearMatch ? yearMatch[0] : "Other";
        const matchesYear = state.year === "All" || projectYear === state.year;
        const matchesType = state.type === "All" || project.status === state.type;
        const matchesCategory = state.category === "All" || project.activityCategory === state.category;
        const haystack = [project.title, project.className, project.area, project.activityCategory, project.summary, ...project.keywords]
            .join(" ")
            .toLowerCase();
        const matchesSearch = !query || haystack.includes(query);

        return matchesYear && matchesType && matchesCategory && matchesSearch;
    });
}

function createProjectCard(project) {
    const card = document.createElement("a");
    card.className = "project-card";
    card.href = project.href;
    card.target = project.external ? "_blank" : "_self";
    card.rel = project.external ? "noreferrer" : "";
    card.setAttribute("aria-label", `Open ${project.title}`);

    card.addEventListener("click", (event) => {
        enforceDetailAccess(event);
    });

    // Extract year level from className
    const yearMatch = project.className.match(/Year\s+\d+|Junior|Middle|Senior/i);
    const yearLevel = yearMatch ? yearMatch[0] : project.className.split(" ")[0];
    
    // Use image if available, otherwise use gradient background
    const hasImage = project.imageUrl && project.imageUrl.trim().length > 0;
    const visualStyle = hasImage ? "" : `style="background: ${project.visual.palette};"`;
    const visualContent = hasImage
        ? `<img src="${escapeHtml(project.imageUrl)}" alt="${escapeHtml(project.title)}" class="project-image" loading="lazy">`
        : `<span class="visual-mark">${project.visual.icon}</span>`;

    const statusBadge = project.status 
        ? `<span class="project-tag status-tag status-${project.status}">${formatStatus(project.status)}</span>` 
        : '';

    card.innerHTML = `
        <div class="project-visual" ${visualStyle}>
            ${visualContent}
        </div>
        <div class="project-body">
            <div class="project-header">
                <h3>${escapeHtml(project.title)}</h3>
            </div>
            <p class="project-description">${escapeHtml(project.summary)}</p>
            <div class="project-tags">
                ${statusBadge}
                <span class="project-tag">${escapeHtml(yearLevel)}</span>
                <span class="project-tag">${escapeHtml(project.area)}</span>
            </div>
            <div class="project-footer">
                <span class="project-meta">${escapeHtml(project.activityCategory)}</span>
            </div>
        </div>
    `;

    return card;
}

function createLabProjectCard(project) {
    const card = document.createElement("a");
    card.className = "project-card";
    card.href = project.href;
    card.target = project.external ? "_blank" : "_self";
    card.rel = project.external ? "noreferrer" : "";
    card.setAttribute("aria-label", `Open ${project.title}`);

    card.addEventListener("click", (event) => {
        enforceDetailAccess(event);
    });

    card.innerHTML = `
        <div class="project-visual" style="background: ${project.visual.palette};">
            <span class="visual-mark">${project.visual.icon}</span>
        </div>
        <div class="project-body">
            <div class="project-header">
                <h3>${escapeHtml(project.title)}</h3>
            </div>
            <p class="project-description">${escapeHtml(project.summary)}</p>
            <div class="project-tags">
                <span class="status-tag status-${project.status}">${formatStatus(project.status)}</span>
                <span class="project-tag">${escapeHtml(project.projectPhase)}</span>
                <span class="project-tag">${escapeHtml(project.term)}</span>
            </div>
            <div class="project-footer">
                <span class="project-meta">${escapeHtml(project.className)}</span>
            </div>
        </div>
    `;

    return card;
}

function formatStatus(status) {
    return status.charAt(0).toUpperCase() + status.slice(1);
}

function populateFilters() {
    // Create filter pills for year levels
    const yearLevelPills = document.getElementById("year-filter-pills");
    if (yearLevelPills) {
        yearLevelPills.innerHTML = "";
        const years = ["All", ...getYearLevels()];
        years.forEach(year => {
            const pill = document.createElement("button");
            pill.className = `filter-chip ${state.year === year ? 'active' : ''}`;
            pill.type = "button";
            pill.textContent = year === "All" ? "All levels" : year;
            pill.addEventListener("click", () => {
                state.year = year;
                updateFilterPills("year-filter-pills", year);
                renderLibrary();
                applyCompactCardLayout();
            });
            yearLevelPills.appendChild(pill);
        });
    }

    // Create filter pills for type
    const typePills = document.getElementById("type-filter-pills");
    if (typePills) {
        typePills.innerHTML = "";
        const types = getTypes();
        types.forEach(type => {
            const pill = document.createElement("button");
            pill.className = `filter-chip ${state.type === type ? 'active' : ''}`;
            pill.type = "button";
            pill.textContent = type === "All" ? "All types" : formatStatus(type);
            pill.addEventListener("click", () => {
                state.type = type;
                updateFilterPills("type-filter-pills", type);
                renderLibrary();
                applyCompactCardLayout();
            });
            typePills.appendChild(pill);
        });
    }

    // Create filter pills for category
    const categoryPills = document.getElementById("category-filter-pills");
    if (categoryPills) {
        categoryPills.innerHTML = "";
        const categories = getCategories();
        categories.forEach(cat => {
            const pill = document.createElement("button");
            pill.className = `filter-chip ${state.category === cat ? 'active' : ''}`;
            pill.type = "button";
            pill.textContent = cat === "All" ? "All categories" : cat;
            pill.addEventListener("click", () => {
                state.category = cat;
                updateFilterPills("category-filter-pills", cat);
                renderLibrary();
                applyCompactCardLayout();
            });
            categoryPills.appendChild(pill);
        });
    }
}

function updateFilterPills(containerId, activeValue) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const pills = container.querySelectorAll(".filter-chip");
    pills.forEach(pill => {
        if (pill.textContent.toLowerCase() === activeValue.toLowerCase() ||
            (activeValue === "All" && pill.textContent.toLowerCase().includes("all"))) {
            pill.classList.add("active");
        } else {
            pill.classList.remove("active");
        }
    });
}

function renderCurrentProjects() {
    if (!currentProjectGrid) {
        return;
    }

    currentProjectGrid.innerHTML = "";
    const activeProjects = sortProjects(projects.filter((project) => project.showThisWeek));

    if (!activeProjects.length) {
        const emptyState = document.createElement("div");
        emptyState.className = "about-card";
        emptyState.innerHTML = `
            <p class="section-kicker">No Activities Scheduled</p>
            <h2>This week has no pinned activities yet.</h2>
            <p>Use Teacher View to add or update activities and tick Show in This Week when ready.</p>
        `;
        currentProjectGrid.appendChild(emptyState);
        return;
    }

    activeProjects.forEach((project) => {
        currentProjectGrid.appendChild(createProjectCard(project));
    });
}

function renderCurrentWeek() {
    if (!currentWeekGrid) {
        return;
    }

    currentWeekGrid.innerHTML = "";

    const activeActivities = sortProjects(projects.filter((project) => project.showThisWeek));
    const activeLabProjects = sortLabProjects(labProjects.filter((project) => project.showThisWeek));

    const combinedCards = [
        ...activeActivities.map((project) => ({
            title: String(project.title || "").toLowerCase(),
            element: createProjectCard(project)
        })),
        ...activeLabProjects.map((project) => ({
            title: String(project.title || "").toLowerCase(),
            element: createLabProjectCard(project)
        }))
    ].sort((left, right) => left.title.localeCompare(right.title));

    if (!combinedCards.length) {
        const emptyState = document.createElement("div");
        emptyState.className = "about-card";
        emptyState.innerHTML = `
            <p class="section-kicker">No Items Scheduled</p>
            <h2>Nothing is pinned for this week yet.</h2>
            <p>Use Teacher View to pin activities or projects that students should work on this week.</p>
        `;
        currentWeekGrid.appendChild(emptyState);
        return;
    }

    combinedCards.forEach((item) => {
        currentWeekGrid.appendChild(item.element);
    });
}

function renderLibrary() {
    libraryGrid.innerHTML = "";
    const visibleProjects = sortProjects(filterProjects(getUnifiedLibraryItems()));

    libraryResultsMeta.textContent = `${visibleProjects.length} item${visibleProjects.length === 1 ? "" : "s"} shown`;

    if (!visibleProjects.length) {
        const emptyState = document.createElement("div");
        emptyState.className = "about-card";
        emptyState.innerHTML = `
            <p class="section-kicker">No Results</p>
            <h2>No items matched that search.</h2>
            <p>Try a different keyword or switch back to the All filter to widen the library.</p>
        `;
        libraryGrid.appendChild(emptyState);
        return;
    }

    visibleProjects.forEach((project) => {
        libraryGrid.appendChild(createProjectCard(project));
    });
}

function sortLabProjects(items) {
    const phaseOrder = {
        planning: 0,
        prototype: 1,
        build: 2,
        testing: 3,
        showcase: 4
    };

    const sorted = [...items];
    switch (labProjectState.sort) {
        case "name-desc":
            sorted.sort((left, right) => right.title.localeCompare(left.title));
            break;
        case "recent":
            sorted.sort((left, right) => new Date(right.updated) - new Date(left.updated));
            break;
        case "phase":
            sorted.sort((left, right) => {
                const leftOrder = phaseOrder[String(left.projectPhase || "").toLowerCase()] ?? 99;
                const rightOrder = phaseOrder[String(right.projectPhase || "").toLowerCase()] ?? 99;
                return leftOrder - rightOrder || left.title.localeCompare(right.title);
            });
            break;
        case "name-asc":
        default:
            sorted.sort((left, right) => left.title.localeCompare(right.title));
            break;
    }

    return sorted;
}

function filterLabProjects(items) {
    const query = labProjectState.search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((project) => {
        const haystack = [project.title, project.className, project.projectPhase, project.summary, ...project.keywords]
            .join(" ")
            .toLowerCase();
        return haystack.includes(query);
    });
}

function renderCurrentLabProjects() {
    if (!currentLabProjectGrid) return;

    currentLabProjectGrid.innerHTML = "";
    const visible = sortLabProjects(labProjects.filter((project) => project.showThisWeek));

    if (!visible.length) {
        const emptyState = document.createElement("div");
        emptyState.className = "about-card";
        emptyState.innerHTML = `
            <p class="section-kicker">No Live Projects</p>
            <h2>No lab projects are pinned for this week.</h2>
            <p>Use Teacher View to feature projects in the right column.</p>
        `;
        currentLabProjectGrid.appendChild(emptyState);
        return;
    }

    visible.forEach((project) => {
        currentLabProjectGrid.appendChild(createLabProjectCard(project));
    });
}

function renderLabProjectLibrary() {
    if (!labProjectLibraryGrid) return;

    labProjectLibraryGrid.innerHTML = "";
    const visible = sortLabProjects(filterLabProjects(labProjects));

    if (labProjectResultsMeta) {
        labProjectResultsMeta.textContent = `${visible.length} project${visible.length === 1 ? "" : "s"} shown`;
    }

    if (!visible.length) {
        const emptyState = document.createElement("div");
        emptyState.className = "about-card";
        emptyState.innerHTML = `
            <p class="section-kicker">No Results</p>
            <h2>No projects matched that search.</h2>
            <p>Try another keyword or sort option.</p>
        `;
        labProjectLibraryGrid.appendChild(emptyState);
        return;
    }

    visible.forEach((project) => {
        labProjectLibraryGrid.appendChild(createLabProjectCard(project));
    });
}

function renderStats() {
    const runningActivities = projects.filter((project) => project.showThisWeek).length;
    const runningLabProjects = labProjects.filter((project) => project.showThisWeek).length;

    totalCount.textContent = runningActivities;
    categoryCount.textContent = runningLabProjects;
}

function createFeaturedCard(project) {
    const card = document.createElement("a");
    card.className = "featured-card";
    card.href = project.href;
    card.target = project.external ? "_blank" : "_self";
    card.rel = project.external ? "noreferrer" : "";
    card.setAttribute("aria-label", `Featured: ${project.title}`);

    card.addEventListener("click", (event) => {
        enforceDetailAccess(event);
    });

    const yearMatch = project.className.match(/Year\s+\d+|Junior|Middle|Senior/i);
    const yearLevel = yearMatch ? yearMatch[0] : project.className.split(" ")[0];

    card.innerHTML = `
        <div class="featured-visual" style="background: ${project.visual.palette};">
            <div class="featured-visual-text">${project.visual.icon}</div>
        </div>
        <div class="featured-content">
            <span class="featured-category">${escapeHtml(project.area)}</span>
            <h3 class="featured-title">${escapeHtml(project.title)}</h3>
            <p class="featured-description">${escapeHtml(project.summary)}</p>
            <div class="featured-meta">
                <span class="featured-meta-item">${escapeHtml(yearLevel)}</span>
                <span class="featured-meta-item">${escapeHtml(project.activityCategory)}</span>
            </div>
        </div>
    `;

    return card;
}

function renderFeaturedCarousel() {
    const carousel = document.getElementById("featured-carousel");
    const indicators = document.getElementById("carousel-indicators");
    
    if (!carousel) return;
    
    carousel.innerHTML = "";
    if (indicators) indicators.innerHTML = "";
    
    // Get diverse featured items - mix of activities
    const featured = getUnifiedLibraryItems()
        .filter(p => p.status === 'active')
        .sort(() => 0.5 - Math.random())
        .slice(0, 6);
    
    if (!featured.length) {
        const allProjects = getUnifiedLibraryItems().slice(0, 6);
        featured.push(...allProjects);
    }
    
    featured.slice(0, 6).forEach((project, index) => {
        carousel.appendChild(createFeaturedCard(project));
        
        if (indicators) {
            const indicator = document.createElement("button");
            indicator.className = `carousel-indicator ${index === 0 ? 'active' : ''}`;
            indicator.type = "button";
            indicator.setAttribute("role", "tab");
            indicator.setAttribute("aria-label", `Show slide ${index + 1}`);
            indicator.setAttribute("aria-selected", index === 0);
            indicator.addEventListener("click", () => {
                scrollCarouselToIndex(index);
                updateCarouselIndicators(index);
            });
            indicators.appendChild(indicator);
        }
    });
    
    setupCarouselNavigation();
}

function setupCarouselNavigation() {
    const carousel = document.getElementById("featured-carousel");
    const prevBtn = document.getElementById("carousel-prev");
    const nextBtn = document.getElementById("carousel-next");
    
    if (!carousel || !prevBtn || !nextBtn) return;
    
    let currentIndex = 0;
    const cards = carousel.querySelectorAll(".featured-card");
    const itemsPerView = getItemsPerView();
    const maxIndex = Math.max(0, cards.length - itemsPerView);
    
    prevBtn.addEventListener("click", () => {
        currentIndex = Math.max(0, currentIndex - 1);
        scrollCarouselToIndex(currentIndex);
        updateCarouselIndicators(currentIndex);
    });
    
    nextBtn.addEventListener("click", () => {
        currentIndex = Math.min(maxIndex, currentIndex + 1);
        scrollCarouselToIndex(currentIndex);
        updateCarouselIndicators(currentIndex);
    });
}

function getItemsPerView() {
    const width = window.innerWidth;
    if (width <= 768) return 1;
    if (width <= 1024) return 2;
    return 3;
}

function scrollCarouselToIndex(index) {
    const carousel = document.getElementById("featured-carousel");
    if (!carousel) return;
    
    const cards = carousel.querySelectorAll(".featured-card");
    if (cards[index]) {
        cards[index].scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
}

function updateCarouselIndicators(activeIndex) {
    const indicators = document.getElementById("carousel-indicators");
    if (!indicators) return;
    
    const tabs = indicators.querySelectorAll(".carousel-indicator");
    tabs.forEach((tab, index) => {
        const isActive = index === activeIndex;
        tab.classList.toggle("active", isActive);
        tab.setAttribute("aria-selected", isActive);
    });
}

function bindControls() {
    if (!searchInput || !sortSelect) return;

    searchInput.addEventListener("input", (event) => {
        state.search = event.target.value;
        renderLibrary();
        applyCompactCardLayout();
    });

    sortSelect.addEventListener("change", (event) => {
        state.sort = event.target.value;
        renderLibrary();
        renderCurrentProjects();
        applyCompactCardLayout();
    });
}

function bindLabProjectControls() {
    if (!labProjectSearchInput || !labProjectSortSelect) return;

    labProjectSearchInput.addEventListener("input", (event) => {
        labProjectState.search = event.target.value;
        renderLabProjectLibrary();
    });

    labProjectSortSelect.addEventListener("change", (event) => {
        labProjectState.sort = event.target.value;
        renderCurrentLabProjects();
        renderLabProjectLibrary();
    });
}

function applyCompactCardLayout() {
    // Apply flex layout to all project grids for compact 4-column layout
    const grids = [
        document.getElementById('project-library-grid'),
        document.getElementById('current-week-grid'),
        document.getElementById('current-project-grid')
    ].filter(Boolean);
    
    grids.forEach(grid => {
        grid.style.display = 'flex';
        grid.style.flexWrap = 'wrap';
        grid.style.gap = '12px';
        grid.style.marginTop = '10px';
        grid.style.minWidth = '0';
        
        // Set card widths for 4-column layout
        const cards = grid.querySelectorAll('.project-card');
        cards.forEach(card => {
            card.style.width = 'calc(25% - 9px)';
            card.style.minWidth = '180px';
            card.style.flexShrink = '0';
        });
    });
}

async function init() {
    const hasDashboardLayout = Boolean(
        (currentWeekGrid || currentProjectGrid) &&
        libraryGrid &&
        searchInput &&
        sortSelect
    );

    if (!hasDashboardLayout) {
        initHubGoogleAuth();
        return;
    }

    const sharedProjects = await loadSharedProjects();
    projects = mergeProjects(sharedProjects);
    labProjects = [...baseLabProjects];
    renderStats();
    populateFilters();
    renderFeaturedCarousel();
    renderCurrentWeek();
    renderCurrentProjects();
    renderLibrary();
    bindControls();
    setTimeout(() => applyCompactCardLayout(), 100);
    initHubGoogleAuth();
}

init();