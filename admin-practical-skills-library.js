(() => {
const AUTH_STORAGE_KEY = "hub_google_auth_v1";
const form = document.querySelector("#practical-skills-form");
const statusMessage = document.querySelector("#practical-status-message");
const cardsBody = document.querySelector("#practical-cards-body");
const publishButton = document.querySelector("#practical-publish");
const resetButton = document.querySelector("#practical-reset-form");

const state = {
    cards: [],
    isAdmin: false
};

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function getStoredAuthRaw() {
    let localValue = null;
    let sessionValue = null;

    try {
        localValue = localStorage.getItem(AUTH_STORAGE_KEY);
    } catch (_error) {
        localValue = null;
    }

    try {
        sessionValue = sessionStorage.getItem(AUTH_STORAGE_KEY);
    } catch (_error) {
        sessionValue = null;
    }

    return localValue || sessionValue;
}

function getActiveHubEmail() {
    const raw = getStoredAuthRaw();
    if (!raw) {
        return "";
    }

    try {
        const parsed = JSON.parse(raw);
        return normalizeEmail(parsed?.profile?.email || "");
    } catch (_error) {
        return "";
    }
}

function getActiveHubAccessToken() {
    const raw = getStoredAuthRaw();
    if (!raw) {
        return "";
    }

    try {
        const parsed = JSON.parse(raw);
        const expiresAt = Number(parsed?.expiresAt || 0);
        if (expiresAt <= Date.now()) {
            return "";
        }
        return String(parsed?.idToken || parsed?.accessToken || "").trim();
    } catch (_error) {
        return "";
    }
}

function withAdminAuthHeaders(headers = {}) {
    const email = getActiveHubEmail();
    if (!email) {
        return headers;
    }

    const nextHeaders = {
        ...headers,
        "x-user-email": email
    };

    const accessToken = getActiveHubAccessToken();
    if (accessToken && accessToken.startsWith("eyJ") && accessToken.split(".").length === 3) {
        nextHeaders.Authorization = `Bearer ${accessToken}`;
    }

    return nextHeaders;
}

function slugify(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 120);
}

function setStatus(message, isError = false) {
    if (!statusMessage) return;

    if (!message) {
        statusMessage.hidden = true;
        statusMessage.textContent = "";
        statusMessage.classList.remove("is-success", "is-error");
        return;
    }

    statusMessage.hidden = false;
    statusMessage.textContent = message;
    statusMessage.classList.remove("is-success", "is-error");
    statusMessage.classList.add(isError ? "is-error" : "is-success");
}

function resetForm() {
    if (!form) return;
    form.reset();
    const idField = document.querySelector("#practical-id");
    if (idField) {
        idField.value = "";
    }
}

function setFormFromCard(card) {
    const idField = document.querySelector("#practical-id");
    const titleField = document.querySelector("#practical-title");
    const summaryField = document.querySelector("#practical-summary");
    const yearField = document.querySelector("#practical-year-level");
    const areaField = document.querySelector("#practical-area");
    const hrefField = document.querySelector("#practical-href");
    const imageField = document.querySelector("#practical-image-url");
    const statusField = document.querySelector("#practical-status");
    const iconField = document.querySelector("#practical-icon");
    const paletteField = document.querySelector("#practical-palette");

    if (idField) idField.value = String(card.id || "");
    if (titleField) titleField.value = String(card.title || "");
    if (summaryField) summaryField.value = String(card.summary || "");
    if (yearField) yearField.value = String(card.yearLevel || "");
    if (areaField) areaField.value = String(card.area || "");
    if (hrefField) hrefField.value = String(card.href || "");
    if (imageField) imageField.value = String(card.imageUrl || "");
    if (statusField) statusField.value = String(card.status || "active");
    if (iconField) iconField.value = String(card?.visual?.icon || "PS");
    if (paletteField) paletteField.value = String(card?.visual?.palette || "");
}

function renderCardsTable() {
    if (!cardsBody) return;

    cardsBody.innerHTML = "";

    state.cards.forEach((card) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${String(card.title || "")}</td>
            <td>${String(card.yearLevel || "")}</td>
            <td>${String(card.area || "")}</td>
            <td>${String(card.status || "active")}</td>
            <td>${String(card.href || "")}</td>
            <td>
                <button type="button" class="button button-secondary practical-row-edit" data-id="${String(card.id || "")}">Edit</button>
                <button type="button" class="button button-secondary practical-row-delete" data-id="${String(card.id || "")}">Delete</button>
            </td>
        `;
        cardsBody.appendChild(row);
    });

    cardsBody.querySelectorAll(".practical-row-edit").forEach((button) => {
        button.addEventListener("click", () => {
            const id = String(button.getAttribute("data-id") || "");
            const found = state.cards.find((item) => String(item.id) === id);
            if (!found) return;
            setFormFromCard(found);
            setStatus("Editing existing card.");
        });
    });

    cardsBody.querySelectorAll(".practical-row-delete").forEach((button) => {
        button.addEventListener("click", () => {
            const id = String(button.getAttribute("data-id") || "");
            const found = state.cards.find((item) => String(item.id) === id);
            if (!found) return;
            const confirmed = window.confirm(`Delete \"${found.title}\" from Practical Skills library?`);
            if (!confirmed) return;
            state.cards = state.cards.filter((item) => String(item.id) !== id);
            renderCardsTable();
            setStatus("Card removed locally. Click Publish Library to save changes.");
        });
    });
}

function readFormCard() {
    const id = String(document.querySelector("#practical-id")?.value || "").trim();
    const title = String(document.querySelector("#practical-title")?.value || "").trim();
    const summary = String(document.querySelector("#practical-summary")?.value || "").trim();
    const yearLevel = String(document.querySelector("#practical-year-level")?.value || "All Years").trim() || "All Years";
    const area = String(document.querySelector("#practical-area")?.value || "Practical Skills").trim() || "Practical Skills";
    const href = String(document.querySelector("#practical-href")?.value || "/practical-skills.html").trim() || "/practical-skills.html";
    const imageUrl = String(document.querySelector("#practical-image-url")?.value || "").trim();
    const status = String(document.querySelector("#practical-status")?.value || "active").trim().toLowerCase();
    const icon = String(document.querySelector("#practical-icon")?.value || "PS").trim() || "PS";
    const palette = String(document.querySelector("#practical-palette")?.value || "linear-gradient(135deg, #2f8f61 0%, #3ca873 54%, #65c494 100%)").trim();

    if (!title) {
        throw new Error("Title is required.");
    }
    if (!summary) {
        throw new Error("Summary is required.");
    }

    return {
        id: id || slugify(title),
        title,
        summary,
        yearLevel,
        area,
        status: ["active", "planning", "archive"].includes(status) ? status : "active",
        href,
        imageUrl,
        visual: {
            icon,
            palette
        }
    };
}

async function verifyAdminAccess() {
    const email = getActiveHubEmail();
    if (!email) {
        setStatus("Sign in with your school account first.", true);
        return false;
    }

    try {
        const response = await fetch(`/api/auth/user-access?email=${encodeURIComponent(email)}`, {
            headers: withAdminAuthHeaders()
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.can_admin) {
            setStatus("Admin access is required for this page.", true);
            return false;
        }

        state.isAdmin = true;
        return true;
    } catch (_error) {
        setStatus("Could not verify admin access.", true);
        return false;
    }
}

async function loadCards() {
    try {
        const response = await fetch("/api/admin/practical-skills/library", {
            headers: withAdminAuthHeaders()
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload?.error || `HTTP ${response.status}`);
        }

        state.cards = Array.isArray(payload.cards) ? payload.cards : [];
        renderCardsTable();
        setStatus(`Loaded ${state.cards.length} card${state.cards.length === 1 ? "" : "s"}.`);
    } catch (error) {
        setStatus(`Could not load cards: ${error.message || "Unknown error"}`, true);
    }
}

async function publishCards() {
    if (publishButton) {
        publishButton.disabled = true;
    }

    try {
        const response = await fetch("/api/admin/practical-skills/library", {
            method: "PUT",
            headers: withAdminAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ cards: state.cards })
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload?.error || `HTTP ${response.status}`);
        }

        state.cards = Array.isArray(payload.cards) ? payload.cards : state.cards;
        renderCardsTable();
        setStatus(`Published ${state.cards.length} card${state.cards.length === 1 ? "" : "s"}.`);
    } catch (error) {
        setStatus(`Publish failed: ${error.message || "Unknown error"}`, true);
    } finally {
        if (publishButton) {
            publishButton.disabled = false;
        }
    }
}

if (form) {
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        try {
            const nextCard = readFormCard();
            const existingIndex = state.cards.findIndex((item) => String(item.id) === String(nextCard.id));
            if (existingIndex >= 0) {
                state.cards[existingIndex] = nextCard;
                setStatus("Card updated locally. Click Publish Library to save changes.");
            } else {
                state.cards.push(nextCard);
                setStatus("Card added locally. Click Publish Library to save changes.");
            }
            renderCardsTable();
            resetForm();
        } catch (error) {
            setStatus(error.message || "Could not save card.", true);
        }
    });
}

if (resetButton) {
    resetButton.addEventListener("click", () => {
        resetForm();
        setStatus("");
    });
}

if (publishButton) {
    publishButton.addEventListener("click", () => {
        void publishCards();
    });
}

(async function init() {
    const canLoad = await verifyAdminAccess();
    if (!canLoad) {
        return;
    }
    await loadCards();
})();
})();
