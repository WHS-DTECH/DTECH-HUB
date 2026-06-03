const authStorageKey = "hub_google_auth_v1";

function getAuthRaw() {
    try {
        return localStorage.getItem(authStorageKey) || sessionStorage.getItem(authStorageKey);
    } catch (_error) {
        return null;
    }
}

function getSignedInEmail() {
    const raw = getAuthRaw();
    if (!raw) return "";
    try {
        const parsed = JSON.parse(raw);
        return String(parsed?.profile?.email || "").trim().toLowerCase();
    } catch (_error) {
        return "";
    }
}

function getSignedInAccessToken() {
    const raw = getAuthRaw();
    if (!raw) return "";
    try {
        const parsed = JSON.parse(raw);
        if (!parsed?.expiresAt || Number(parsed.expiresAt) <= Date.now()) {
            return "";
        }
        return String(parsed?.idToken || parsed?.accessToken || "").trim();
    } catch (_error) {
        return "";
    }
}

function withSignedInAuthHeaders(headers = {}, email = getSignedInEmail()) {
    if (!email) {
        return headers;
    }

    const nextHeaders = { ...headers, "x-user-email": email };
    const accessToken = getSignedInAccessToken();
    if (accessToken && accessToken.startsWith("eyJ") && accessToken.split(".").length === 3) {
        nextHeaders.Authorization = `Bearer ${accessToken}`;
    }

    return nextHeaders;
}

function getUrlParam(name) {
    const value = new URLSearchParams(window.location.search).get(name);
    return String(value || "").trim();
}

function safeText(value) {
    return String(value || "").trim();
}

function standardCodeFromCard(card) {
    const courseName = safeText(card?.course_name);
    const codes = Array.isArray(card?.standard_codes)
        ? card.standard_codes.map((value) => safeText(value)).filter(Boolean)
        : [];
    const source = [courseName, ...codes].join(" ");
    const match = source.match(/\b(\d{5})\b/);
    return match ? match[1] : "";
}

function setStatus(message, isError = false) {
    const node = document.getElementById("sc-status");
    if (!node) return;
    node.textContent = safeText(message);
    node.classList.toggle("is-error", Boolean(isError));
}

function setText(id, value, fallback = "-") {
    const node = document.getElementById(id);
    if (!node) return;
    const text = safeText(value);
    node.textContent = text || fallback;
}

function setChecklist(id, value) {
    const node = document.getElementById(id);
    if (!node) return;

    const rows = Array.isArray(value)
        ? value.map((item) => safeText(item)).filter(Boolean)
        : [];

    if (!rows.length) {
        node.innerHTML = "<li>-</li>";
        return;
    }

    node.innerHTML = rows.map((line) => `<li>${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</li>`).join("");
}

function findCard(cards, cardId, standardCode) {
    const rows = Array.isArray(cards) ? cards : [];
    if (cardId) {
        const byId = rows.find((card) => safeText(card?.id) === cardId);
        if (byId) return byId;
    }

    if (standardCode) {
        const code = standardCode.toLowerCase();
        const byCode = rows.find((card) => {
            const cardCode = standardCodeFromCard(card).toLowerCase();
            return cardCode === code;
        });
        if (byCode) return byCode;
    }

    return null;
}

async function loadStandardCard() {
    const email = getSignedInEmail();
    if (!email) {
        setStatus("Sign in with your school account to view this standard card.", true);
        return;
    }

    const cardId = getUrlParam("card");
    const standardCode = getUrlParam("standard");
    if (!cardId && !standardCode) {
        setStatus("No standard card was specified in the link.", true);
        return;
    }

    try {
        const response = await fetch("/api/assessment-standard-cards", {
            headers: withSignedInAuthHeaders({}, email)
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(payload?.error || "Could not load standard cards.");
        }

        const card = findCard(payload?.cards, cardId, standardCode);
        if (!card) {
            setStatus("This standard card could not be found.", true);
            return;
        }

        const number = standardCodeFromCard(card);
        const nameCandidates = Array.isArray(card?.standard_codes)
            ? card.standard_codes.map((value) => safeText(value)).filter(Boolean)
            : [];
        const standardName = nameCandidates.find((value) => !/\b\d{5}\b/.test(value)) || safeText(card?.course_name);

        setText("sc-standard-number", number);
        setText("sc-standard-level", safeText(card?.year_level));
        setText("sc-standard-version", Number.isInteger(Number.parseInt(card?.year_version, 10)) ? String(Number.parseInt(card.year_version, 10)) : "");
        setText("sc-credits", Number.isInteger(Number.parseInt(card?.credits, 10)) ? String(Number.parseInt(card.credits, 10)) : "");
        setText("sc-standard-name", standardName);
        setText("sc-achieved-text", safeText(card?.achieved_text));
        setText("sc-merit-text", safeText(card?.merit_text));
        setText("sc-excellence-text", safeText(card?.excellence_text));
        setChecklist("sc-achieved-checklist", card?.achieved_checklist);
        setChecklist("sc-merit-checklist", card?.merit_checklist);
        setChecklist("sc-excellence-checklist", card?.excellence_checklist);

        const content = document.getElementById("sc-content");
        if (content) content.hidden = false;

        setStatus(`Loaded saved Assessment Standard Card for ${number || "this standard"}.`);
    } catch (error) {
        setStatus(String(error?.message || "Could not load this standard card."), true);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadStandardCard);
} else {
    void loadStandardCard();
}
