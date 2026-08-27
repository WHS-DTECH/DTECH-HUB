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
        <div class="asset-manager-checks">
            <div class="asset-manager-check-row ${oversizedCount > 0 ? "is-warning" : "is-ok"}">${oversizedCount > 0 ? `\u26a0 ${oversizedCount} image${oversizedCount === 1 ? "" : "s"} &gt;500 KB` : "\u2713 No oversized images"}</div>
            <div class="asset-manager-check-row ${unusedCount > 0 ? "is-warning" : "is-ok"}">
                ${unusedCount > 0 ? `\u26a0 ${unusedCount} unused image${unusedCount === 1 ? "" : "s"}` : "\u2713 No unused images"}
                ${unusedCount > 0 ? `<ul class="asset-manager-check-list">${(payload?.unused_images || []).map((path) => `<li>${escapeAssetManagerHtml(path)}</li>`).join("")}</ul>` : ""}
            </div>
            <div class="asset-manager-check-row ${brokenCount > 0 ? "is-warning" : "is-ok"}">
                ${brokenCount > 0 ? `\u26a0 ${brokenCount} broken asset reference${brokenCount === 1 ? "" : "s"}` : "\u2713 No broken asset references"}
                ${brokenCount > 0 ? `<ul class="asset-manager-check-list">${(payload?.broken_references || []).map((row) => `<li>${escapeAssetManagerHtml(row.from)} &rarr; ${escapeAssetManagerHtml(row.reference)}</li>`).join("")}</ul>` : ""}
            </div>
        </div>
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
