const DETAIL_DATA = {
    "cyber-safety-lab": {
        title: "Cyber Safety Lab",
        yearLevel: "Year 9",
        type: "Cyber Security",
        duration: "2 hrs",
        term: "Term 2",
        summary: "Learn password hygiene, phishing detection, and practical online safety routines through mini challenges.",
        resources: ["Case-study cards", "Security checklist", "Reflection template"],
        equipment: ["Laptop or Chromebook", "Internet access", "Presentation display"],
        instructions: ["Review real phishing examples.", "Classify risky vs safe online actions.", "Create a personal security action plan."],
        image: "https://placehold.co/900x560/6f35a2/ffffff?text=Cyber+Safety+Lab"
    },
    "data-visual-story": {
        title: "Data Visual Story",
        yearLevel: "Year 12",
        type: "Data Skills",
        duration: "2 hrs",
        term: "Term 2",
        summary: "Convert class data into clear visual dashboards and short evidence-based stories for assessment.",
        resources: ["Dataset CSV", "Storyboard worksheet", "Assessment rubric"],
        equipment: ["Spreadsheet tool", "Charting app", "Projector"],
        instructions: ["Clean and group the dataset.", "Create two chart options.", "Write a short data story and peer-review."],
        image: "https://placehold.co/900x560/3f9e70/ffffff?text=Data+Visual+Story"
    },
    "digital-portfolio-studio": {
        title: "Digital Portfolio Studio",
        yearLevel: "Year 11",
        type: "Digital Learning",
        duration: "2 hrs",
        term: "Term 1",
        summary: "Archive and polish published reflections, checkpoints, and final showcase evidence from prior units.",
        resources: ["Portfolio checklist", "Evidence tracker", "Reflection prompts"],
        equipment: ["Laptop", "Portfolio platform", "Cloud storage"],
        instructions: ["Audit current portfolio pages.", "Upload missing evidence.", "Improve reflection quality and structure."],
        image: "https://placehold.co/900x560/6a58b5/ffffff?text=Digital+Portfolio+Studio"
    },
    "maker-lab-builds": {
        title: "Maker Lab Builds",
        yearLevel: "Year 13",
        type: "STEM Projects",
        duration: "2 hrs",
        term: "Term 1",
        summary: "Archive prototypes, sprint notes, and build logs from fabrication and automation challenges.",
        resources: ["Design journal", "Build checklist", "Testing log template"],
        equipment: ["Prototype materials", "Workshop tools", "Safety gear"],
        instructions: ["Review latest prototype version.", "Record test outcomes.", "Plan and document next iteration."],
        image: "https://placehold.co/900x560/676c86/ffffff?text=Maker+Lab+Builds"
    },
    "python-debug-lab": {
        title: "Python Debug Lab",
        yearLevel: "Year 11",
        type: "Programming",
        duration: "2 hrs",
        term: "Term 2",
        summary: "Track down logic bugs, run tests, and improve code quality with guided debugging missions.",
        resources: ["Bug scenario sheets", "Test cases", "Reflection form"],
        equipment: ["Python IDE", "Terminal", "Version control workspace"],
        instructions: ["Run failing script and inspect errors.", "Apply debugging strategy step-by-step.", "Commit fixed version with notes."],
        image: "https://placehold.co/900x560/b15186/ffffff?text=Python+Debug+Lab"
    },
    "robotics-control-board": {
        title: "Robotics Control Board",
        yearLevel: "Year 12",
        type: "Physical Computing",
        duration: "2 hrs",
        term: "Term 2",
        summary: "Build and monitor microcontroller projects, capture test data, and document each hardware iteration.",
        resources: ["Circuit plan", "Sensor worksheet", "Data capture table"],
        equipment: ["Microcontroller kit", "Breadboard and wires", "Laptop with serial monitor"],
        instructions: ["Assemble control-board layout.", "Upload and test baseline program.", "Tune behavior and document outcomes."],
        image: "https://placehold.co/900x560/2f95b2/ffffff?text=Robotics+Control+Board"
    },
    "web-ui-remix": {
        title: "Web UI Remix",
        yearLevel: "Year 10",
        type: "Web Design",
        duration: "2 hrs",
        term: "Term 2",
        summary: "Re-style an existing page with stronger visual hierarchy, accessibility checks, and responsive layout improvements.",
        resources: ["UI checklist", "Wireframe sketch sheet", "Accessibility notes"],
        equipment: ["Code editor", "Browser devtools", "Reference design board"],
        instructions: ["Audit current layout issues.", "Apply typography and spacing updates.", "Validate responsiveness and accessibility."],
        image: "https://placehold.co/900x560/b67a3c/ffffff?text=Web+UI+Remix"
    }
};

function renderList(items) {
    return items.map((item) => `<li>${item}</li>`).join("");
}

function initDetail() {
    const root = document.querySelector("[data-activity-id]");
    if (!root) return;

    const id = root.getAttribute("data-activity-id");
    const data = DETAIL_DATA[id];
    if (!data) return;

    document.title = `${data.title} | Computer Lab`;

    root.innerHTML = `
        <header class="toolbar">
            <span class="toolbar-label">Teacher View</span>
            <a href="../index.html">Back to Hub</a>
        </header>

        <section class="hero">
            <div class="hero-copy">
                <p class="kicker">Student Activity</p>
                <h1>${data.title}</h1>
                <div class="pills">
                    <span class="pill">${data.yearLevel}</span>
                    <span class="pill">${data.type}</span>
                    <span class="pill">${data.duration}</span>
                    <span class="pill">Practice</span>
                </div>
                <p>${data.summary}</p>
                <div class="meta-row">
                    <span class="meta-chip">Activity Category: Practice</span>
                    <span class="meta-chip">Show in This Week: No</span>
                    <span class="meta-chip">${data.term}</span>
                </div>
            </div>
            <div class="hero-image">
                <img src="${data.image}" alt="${data.title} activity image" loading="lazy">
            </div>
        </section>

        <section class="grid">
            <article class="card">
                <h2>Resources</h2>
                <p class="sub">Materials students need.</p>
                <ul class="list">${renderList(data.resources)}</ul>
            </article>
            <article class="card">
                <h2>Equipment</h2>
                <p class="sub">Tools and systems used.</p>
                <ul class="list">${renderList(data.equipment)}</ul>
            </article>
            <article class="card">
                <h2>Instructions</h2>
                <p class="sub">Step-by-step method.</p>
                <ol class="list">${renderList(data.instructions)}</ol>
            </article>
        </section>
    `;
}

initDetail();
