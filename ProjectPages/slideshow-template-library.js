const TEMPLATE_LIBRARY = [
    {
        id: "digital-outcome-description",
        title: "Digital Outcome Description",
        standardCodes: ["91897", "91907"],
        criteriaText: "Describe what the digital outcome is, who it is for, and what it must do.",
        summary: "Uses a two-column prompt-and-response slide structure for clear assessment evidence.",
        imageUrl: "https://placehold.co/540x760/e7dec0/1f3a56?text=Digital+Outcome+Description+Slide+Preview",
        templateUrl: "https://docs.google.com/presentation/d/1brOY70u9aJdsoiEtxVepr82vRhiv9VzpMm8TUv3lcTo/edit?usp=sharing",
        status: "live"
    },
    {
        id: "speaker-notes-criteria-mapping",
        title: "Speaker Notes Criteria Mapping",
        standardCodes: ["91897"],
        criteriaText: "Map each presented slide to assessment criteria in Speaker Notes.",
        summary: "Template slot reserved. Add the final template URL when this slide is complete.",
        imageUrl: "https://placehold.co/540x760/d8e6d9/1f3a56?text=Coming+Soon+Template",
        templateUrl: "",
        status: "coming-soon"
    }
];

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function toSafeExternalUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";

    try {
        const parsed = new URL(raw);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
            return parsed.toString();
        }
    } catch (_error) {
        return "";
    }

    return "";
}

function toSlidesLaunchUrl(value) {
    const safeUrl = toSafeExternalUrl(value);
    if (!safeUrl) return "";

    let parsed;
    try {
        parsed = new URL(safeUrl);
    } catch (_error) {
        return "";
    }

    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname;
    if (host !== "docs.google.com") {
        return safeUrl;
    }

    if (/^\/presentation\/create\/?$/i.test(pathname)) {
        return "";
    }

    const idMatch = pathname.match(/^\/presentation\/d\/([^/]+)/i);
    if (!idMatch || !idMatch[1]) {
        return safeUrl;
    }

    return `https://docs.google.com/presentation/d/${idMatch[1]}/copy`;
}

function renderTemplateCard(item) {
    const title = String(item?.title || "Untitled Template").trim();
    const criteriaText = String(item?.criteriaText || "").trim();
    const summary = String(item?.summary || "").trim();
    const imageUrl = toSafeExternalUrl(item?.imageUrl);
    const templateUrl = toSlidesLaunchUrl(item?.templateUrl);
    const standards = Array.isArray(item?.standardCodes)
        ? item.standardCodes.map((code) => String(code || "").trim()).filter(Boolean)
        : [];
    const status = String(item?.status || "coming-soon").trim().toLowerCase() === "live" ? "live" : "coming-soon";
    const statusLabel = status === "live" ? "Live" : "Coming Soon";
    const canOpen = status === "live" && Boolean(templateUrl);
    const imageAlt = `${title} preview`;
    const standardsLabel = standards.length ? standards.join(", ") : "Not set";

    return `
        <article class="template-card" data-template-status="${escapeHtml(status)}">
            <a class="template-card-preview" href="${canOpen ? escapeHtml(templateUrl) : "#"}" ${canOpen ? 'target="_blank" rel="noreferrer"' : 'aria-disabled="true"'}>
                <img src="${escapeHtml(imageUrl || "https://placehold.co/540x760/d7e2ef/355674?text=Template+Preview")}" alt="${escapeHtml(imageAlt)}" loading="lazy">
            </a>
            <div class="template-card-body">
                <h2><a class="template-card-title-link" href="${canOpen ? escapeHtml(templateUrl) : "#"}" ${canOpen ? 'target="_blank" rel="noreferrer"' : 'aria-disabled="true"'}>${escapeHtml(title)}</a></h2>
                <div class="template-card-meta">
                    <span class="template-card-standard">${escapeHtml(standardsLabel)}</span>
                    <span class="template-card-badge">${escapeHtml(statusLabel)}</span>
                </div>
                ${criteriaText ? `<p><strong>Assessment Criteria:</strong> ${escapeHtml(criteriaText)}</p>` : ""}
                ${summary ? `<p>${escapeHtml(summary)}</p>` : ""}
                ${status === "live" && !canOpen ? `<p><strong>Template link not set:</strong> add the Google Slides template file URL in TEMPLATE_LIBRARY.</p>` : ""}
                <div class="template-card-actions">
                    <a class="template-card-open" href="${canOpen ? escapeHtml(templateUrl) : "#"}" ${canOpen ? 'target="_blank" rel="noreferrer"' : 'aria-disabled="true"'}>${canOpen ? "Use Template" : (status === "live" ? "Template Link Needed" : "Template Coming Soon")}</a>
                </div>
            </div>
        </article>
    `;
}

function renderLibrary() {
    const host = document.querySelector("#template-list");
    if (!host) return;

    if (!Array.isArray(TEMPLATE_LIBRARY) || !TEMPLATE_LIBRARY.length) {
        host.innerHTML = '<p class="template-empty">No templates are listed yet.</p>';
        return;
    }

    host.innerHTML = TEMPLATE_LIBRARY.map((item) => renderTemplateCard(item)).join("");
}

renderLibrary();
