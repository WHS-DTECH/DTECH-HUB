const suggestionsTableBody = document.querySelector("#suggestions-table tbody");
const suggestionsStatus = document.querySelector("#suggestions-status");
const HUB_AUTH_STORAGE_KEY = "hub_google_auth_v1";

function setSuggestionsStatus(message, isError = false) {
  if (!suggestionsStatus) return;
  suggestionsStatus.textContent = message;
  suggestionsStatus.style.color = isError ? "#bb3f3f" : "#2f4e73";
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toISOString().slice(0, 10);
}

function createCell(text) {
  const td = document.createElement("td");
  td.textContent = text;
  return td;
}

function readStoredHubEmail() {
  const raw = localStorage.getItem(HUB_AUTH_STORAGE_KEY) || sessionStorage.getItem(HUB_AUTH_STORAGE_KEY);
  if (!raw) return "";

  try {
    const parsed = JSON.parse(raw);
    return String(parsed?.profile?.email || "").trim().toLowerCase();
  } catch (_error) {
    return "";
  }
}

async function ensureAdminAccess() {
  const email = readStoredHubEmail();
  if (!email) {
    window.location.href = "index.html";
    return false;
  }

  try {
    const response = await fetch(`/api/auth/user-access?email=${encodeURIComponent(email)}`);
    if (!response.ok) {
      throw new Error("Could not verify access");
    }

    const data = await response.json();
    if (!data?.can_admin) {
      window.location.href = "index.html";
      return false;
    }

    return true;
  } catch (_error) {
    window.location.href = "index.html";
    return false;
  }
}

function renderSuggestions(rows) {
  if (!suggestionsTableBody) return;
  suggestionsTableBody.innerHTML = "";

  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 8;
    td.textContent = "No suggestions submitted yet.";
    tr.appendChild(td);
    suggestionsTableBody.appendChild(tr);
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.appendChild(createCell(formatDate(row.created_at)));
    tr.appendChild(createCell(String(row.suggestion_type || "-")));
    tr.appendChild(createCell(String(row.suggestion_title || "-")));
    tr.appendChild(createCell(String(row.submitted_by_name || "-")));

    const emailCell = document.createElement("td");
    if (row.submitted_by_email) {
      const emailLink = document.createElement("a");
      emailLink.href = `mailto:${row.submitted_by_email}`;
      emailLink.textContent = row.submitted_by_email;
      emailCell.appendChild(emailLink);
    } else {
      emailCell.textContent = "-";
    }
    tr.appendChild(emailCell);

    const urlCell = document.createElement("td");
    if (row.reference_url) {
      const urlLink = document.createElement("a");
      urlLink.href = row.reference_url;
      urlLink.target = "_blank";
      urlLink.rel = "noreferrer";
      urlLink.textContent = "View";
      urlCell.appendChild(urlLink);
    } else {
      urlCell.textContent = "-";
    }
    tr.appendChild(urlCell);

    tr.appendChild(createCell(String(row.reason || "-")));

    const pdfCell = document.createElement("td");
    if (row.has_attachment) {
      const pdfLink = document.createElement("a");
      pdfLink.href = `/api/admin/suggestions/${row.id}/attachment`;
      pdfLink.textContent = row.attachment_filename || "Download";
      pdfCell.appendChild(pdfLink);
    } else {
      pdfCell.textContent = "-";
    }
    tr.appendChild(pdfCell);

    suggestionsTableBody.appendChild(tr);
  });
}

async function loadSuggestions() {
  try {
    setSuggestionsStatus("Loading suggestions...");
    const response = await fetch("/api/admin/suggestions");
    if (!response.ok) {
      throw new Error("Could not load suggestions");
    }

    const rows = await response.json();
    renderSuggestions(Array.isArray(rows) ? rows : []);
    setSuggestionsStatus("Suggestions loaded.");
  } catch (error) {
    setSuggestionsStatus(error.message || "Could not load suggestions.", true);
  }
}

ensureAdminAccess().then((allowed) => {
  if (allowed) {
    loadSuggestions();
  }
});
