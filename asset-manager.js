const ASSET_MANAGER_AUTH_KEY = "hub_google_auth_v1";

function assetManagerReadAuth() {
    try {
        const raw = localStorage.getItem(ASSET_MANAGER_AUTH_KEY) || sessionStorage.getItem(ASSET_MANAGER_AUTH_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.expiresAt || Number(parsed.expiresAt) <= Date.now()) return null;
        return parsed;
    } catch (_error) {
        return null;
    }
}

function assetManagerGetEmail() {
    return String(assetManagerReadAuth()?.profile?.email || "").trim().toLowerCase();
}

function assetManagerHeaders(headers = {}) {
    const email = assetManagerGetEmail();
    return { ...headers, ...(email ? { "x-user-email": email } : {}) };
}

function escapeAssetManagerHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function setAssetManagerStatus(message, isError = false) {
    const el = document.querySelector("#asset-manager-status");
    if (!el) return;
    el.textContent = message || "";
    el.classList.toggle("is-error", Boolean(isError));
}

async function assetManagerLoadJson(url, options = {}) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload?.error || `Request failed (${response.status}).`);
    }
    return payload;
}

function findGithubRepoUrlFromEvidenceSteps(evidenceRows) {
    for (const row of (Array.isArray(evidenceRows) ? evidenceRows : [])) {
        for (const step of (Array.isArray(row?.steps) ? row.steps : [])) {
            const text = String(step?.text || "").trim();
            if (text.startsWith("GITHUB_REPO_URL|")) {
                const url = text.slice("GITHUB_REPO_URL|".length).trim();
                if (url) return url;
            }
        }
    }
    return "";
}

function formatAssetManagerBytes(bytes) {
    const value = Number(bytes || 0);
    if (!Number.isFinite(value) || value <= 0) return "0 KB";
    if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.round(value / 1024)} KB`;
}

function renderCssDetails(details) {
    const values = details || {};
    return `
        <div class="asset-manager-detail-panel">
            <h3>CSS Details</h3>
            <dl class="asset-manager-detail-list">
                <div><dt>Stylesheets</dt><dd>${Number(values.stylesheets || 0)}</dd></div>
                <div><dt>CSS rules</dt><dd>${Number(values.rules || 0)}</dd></div>
                <div><dt>CSS variables</dt><dd>${Number(values.variables || 0)}</dd></div>
                <div><dt>Repeated colour values</dt><dd>${Number(values.repeated_colour_values || 0)}</dd></div>
                <div><dt>Inline styles</dt><dd>${Number(values.inline_styles || 0)}</dd></div>
                <div><dt>!important uses</dt><dd>${Number(values.important_uses || 0)}</dd></div>
                <div><dt>Media queries</dt><dd>${Number(values.media_queries || 0)}</dd></div>
            </dl>
        </div>
    `;
}

function renderHtmlDetails(details) {
    const values = details || {};
    const semanticElements = Array.isArray(values.semantic_elements) && values.semantic_elements.length
        ? values.semantic_elements.join(" / ")
        : "None detected";
    return `
        <div class="asset-manager-detail-panel">
            <h3>HTML Details</h3>
            <dl class="asset-manager-detail-list">
                <div><dt>Total HTML pages</dt><dd>${Number(values.total_pages || 0)}</dd></div>
                <div><dt>HTML pages scanned</dt><dd>${Number(values.pages || 0)}</dd></div>
                <div><dt>Common stylesheet</dt><dd>${values.common_stylesheet ? "Yes" : "No"}</dd></div>
                <div><dt>Common JavaScript</dt><dd>${values.common_javascript ? "Yes" : "No"}</dd></div>
                <div><dt>Repeated navigation detected</dt><dd>${Number(values.repeated_navigation_pages || 0)} pages</dd></div>
                <div><dt>Semantic elements used</dt><dd>${escapeAssetManagerHtml(semanticElements)}</dd></div>
                <div><dt>Inline CSS</dt><dd>${Number(values.inline_styles || 0)}</dd></div>
            </dl>
        </div>
    `;
}

function renderJavascriptDetails(details) {
    const values = details || {};
    return `
        <div class="asset-manager-detail-panel">
            <h3>JavaScript Details</h3>
            <dl class="asset-manager-detail-list">
                <div><dt>Total JS files</dt><dd>${Number(values.total_files || 0)}</dd></div>
                <div><dt>JS files scanned</dt><dd>${Number(values.files || 0)}</dd></div>
                <div><dt>Functions</dt><dd>${Number(values.functions || 0)}</dd></div>
                <div><dt>Event listeners</dt><dd>${Number(values.event_listeners || 0)}</dd></div>
                <div><dt>DOM access</dt><dd>${Number(values.dom_accesses || 0)}</dd></div>
                <div><dt>Fetch/API calls</dt><dd>${Number(values.fetch_api_calls || 0)}</dd></div>
                <div><dt>Local/session storage</dt><dd>${values.storage_detected ? "Detected" : "Not detected"}</dd></div>
                <div><dt>Imported libraries</dt><dd>${Number(values.imported_libraries || 0)}</dd></div>
                <div><dt>Repeated code blocks</dt><dd>${values.repeated_code_blocks ? "Potential duplication" : "None detected"}</dd></div>
            </dl>
        </div>
    `;
}

function renderAssetManagerContent(payload) {
    const host = document.querySelector("#asset-manager-content");
    if (!host) return;

    const counts = payload?.counts || {};
    const oversizedCount = Number(payload?.oversized_image_count || 0);
    const unusedCount = Number(payload?.unused_image_count || 0);
    const brokenCount = Number(payload?.broken_reference_count || 0);

    host.innerHTML = `
        <div class="asset-manager-counts-grid">
            <div class="asset-manager-count-card"><span class="asset-manager-count-label">HTML</span><span class="asset-manager-count-value">${Number(counts.html || 0)}</span></div>
            <div class="asset-manager-count-card"><span class="asset-manager-count-label">CSS</span><span class="asset-manager-count-value">${Number(counts.css || 0)}</span></div>
            <div class="asset-manager-count-card"><span class="asset-manager-count-label">JavaScript</span><span class="asset-manager-count-value">${Number(counts.javascript || 0)}</span></div>
            <div class="asset-manager-count-card"><span class="asset-manager-count-label">Images</span><span class="asset-manager-count-value">${Number(counts.images || 0)}</span></div>
            <div class="asset-manager-count-card"><span class="asset-manager-count-label">Media</span><span class="asset-manager-count-value">${Number(counts.media || 0)}</span></div>
            <div class="asset-manager-count-card"><span class="asset-manager-count-label">Total</span><span class="asset-manager-count-value">${escapeAssetManagerHtml(formatAssetManagerBytes(payload?.total_size_bytes))}</span></div>
        </div>
        <details class="asset-manager-result-section ${oversizedCount > 0 ? "is-warning" : "is-ok"}">
            <summary class="asset-manager-result-summary">${oversizedCount > 0 ? `Image Size: ${oversizedCount} image${oversizedCount === 1 ? "" : "s"} &gt;500 KB` : "Image Size: No oversized images"}</summary>
        </details>
        <details class="asset-manager-result-section ${unusedCount > 0 ? "is-warning" : "is-ok"}">
            <summary class="asset-manager-result-summary">${unusedCount > 0 ? `Unused images: ${unusedCount}` : "Unused images: None"}</summary>
            ${unusedCount > 0 ? `<div class="asset-manager-result-body"><ul class="asset-manager-check-list">${(payload?.unused_images || []).map((path) => `<li>${escapeAssetManagerHtml(path)}</li>`).join("")}</ul></div>` : ""}
        </details>
        <details class="asset-manager-result-section ${brokenCount > 0 ? "is-warning" : "is-ok"}">
            <summary class="asset-manager-result-summary">${brokenCount > 0 ? `Broken Asset References: ${brokenCount}` : "No broken asset references"}</summary>
            ${brokenCount > 0 ? `<div class="asset-manager-result-body"><ul class="asset-manager-check-list">${(payload?.broken_references || []).map((row) => `<li>${escapeAssetManagerHtml(row.from)} &rarr; ${escapeAssetManagerHtml(row.reference)}</li>`).join("")}</ul></div>` : ""}
        </details>
        <details class="asset-manager-result-section"><summary class="asset-manager-result-summary">HTML Details</summary><div class="asset-manager-result-body">${renderHtmlDetails({ ...payload?.html_details, total_pages: counts.html })}</div></details>
        <details class="asset-manager-result-section"><summary class="asset-manager-result-summary">CSS Details</summary><div class="asset-manager-result-body">${renderCssDetails({ ...payload?.css_details, stylesheets: counts.css })}</div></details>
        <details class="asset-manager-result-section"><summary class="asset-manager-result-summary">JavaScript Details</summary><div class="asset-manager-result-body">${renderJavascriptDetails({ ...payload?.javascript_details, total_files: counts.javascript })}</div></details>
    `;
}

async function runAssetManagerSync(repoUrl) {
    setAssetManagerStatus("Checking asset health from GitHub\u2026");
    const payload = await assetManagerLoadJson(
        `/api/integrations/github/asset-health?repo_url=${encodeURIComponent(repoUrl)}`,
        { headers: assetManagerHeaders({}) }
    );
    renderAssetManagerContent(payload);
    setAssetManagerStatus(`Checked ${Number(payload?.scanned_file_count || 0)} file(s) for references.`);
    return payload;
}

async function initAssetManagerPage() {
    const email = assetManagerGetEmail();
    if (!email) {
        setAssetManagerStatus("Sign in with your school account to view Asset Manager.", true);
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const activityId = String(params.get("id") || "").trim();
    const studentEmail = String(params.get("studentEmail") || "").trim().toLowerCase() || email;

    if (!activityId) {
        setAssetManagerStatus("No task was specified. Open Asset Manager from a Task List or Student Work page.", true);
        return;
    }

    const repoNote = document.querySelector("#asset-manager-repo-note");
    if (studentEmail !== email && repoNote) {
        repoNote.textContent = `Viewing asset health for ${studentEmail}.`;
    }

    setAssetManagerStatus("Loading linked GitHub repository\u2026");

    let repoUrl = "";
    try {
        const evidencePayload = await assetManagerLoadJson(
            `/api/activities/${encodeURIComponent(activityId)}/interests/${encodeURIComponent(studentEmail)}/evidence`,
            { headers: assetManagerHeaders({}) }
        );
        repoUrl = findGithubRepoUrlFromEvidenceSteps(evidencePayload?.evidence_steps);
    } catch (error) {
        setAssetManagerStatus(error?.message || "Could not load this student's evidence.", true);
        return;
    }

    if (!repoUrl) {
        setAssetManagerStatus("No public GitHub repository has been linked yet. Save one on the Version Control: GitHub page first.", true);
        return;
    }

    if (repoNote) {
        repoNote.textContent = `${repoNote.textContent ? `${repoNote.textContent} ` : ""}Repository: ${repoUrl}`.trim();
    }

    try {
        await runAssetManagerSync(repoUrl);
    } catch (error) {
        setAssetManagerStatus(error?.message || "Could not check asset health from GitHub.", true);
    }

    document.querySelector("#asset-manager-sync-btn")?.addEventListener("click", async () => {
        const btn = document.querySelector("#asset-manager-sync-btn");
        if (btn) { btn.disabled = true; btn.textContent = "Syncing\u2026"; }
        try {
            await runAssetManagerSync(repoUrl);
        } catch (error) {
            setAssetManagerStatus(error?.message || "Could not check asset health from GitHub.", true);
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = "\u21bb Sync from GitHub"; }
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    void initAssetManagerPage();
});
