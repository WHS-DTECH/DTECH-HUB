(function () {
    "use strict";

    const dataPath = "/api/practical-skills/library";
    const grid = document.getElementById("practical-skills-grid");
    const meta = document.getElementById("practical-skills-results-meta");

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

    function renderCards(items) {
        if (!grid) return;

        grid.innerHTML = "";
        const list = Array.isArray(items) ? items : [];

        if (meta) {
            meta.textContent = `${list.length} item${list.length === 1 ? "" : "s"} shown`;
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

    async function loadPracticalSkillsLibrary() {
        try {
            const response = await fetch(dataPath, { cache: "no-store" });
            if (!response.ok) {
                throw new Error("Could not load practical skills library.");
            }

            const payload = await response.json();
            const items = Array.isArray(payload) ? payload : [];
            renderCards(items);
        } catch (_error) {
            renderCards([]);
        }
    }

    loadPracticalSkillsLibrary();
})();
