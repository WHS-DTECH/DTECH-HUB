const suggestionsTableBody = document.querySelector("#suggestions-table tbody");
const suggestionsStatus = document.querySelector("#suggestions-status");
const ADMIN_SUGGESTIONS_AUTH_STORAGE_KEY = "hub_google_auth_v1";

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
  const raw = localStorage.getItem(ADMIN_SUGGESTIONS_AUTH_STORAGE_KEY) || sessionStorage.getItem(ADMIN_SUGGESTIONS_AUTH_STORAGE_KEY);
  if (!raw) return "";

  try {
    const parsed = JSON.parse(raw);
    return String(parsed?.profile?.email || "").trim().toLowerCase();
  } catch (_error) {
    return "";
  }
}

function buildAdminAuthHeaders() {
  const raw = localStorage.getItem(ADMIN_SUGGESTIONS_AUTH_STORAGE_KEY) || sessionStorage.getItem(ADMIN_SUGGESTIONS_AUTH_STORAGE_KEY);
  const headers = { "x-user-email": readStoredHubEmail() };
  try {
    const parsed = JSON.parse(raw || "{}");
    const token = String(parsed?.idToken || "").trim();
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch (_error) {
  }
  return headers;
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
    td.colSpan = 6;
    td.textContent = "No suggestions submitted yet.";
    tr.appendChild(td);
    suggestionsTableBody.appendChild(tr);
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.appendChild(createCell(formatDate(row.date)));
    tr.appendChild(createCell(row.kind));
    tr.appendChild(createCell(row.title));
    tr.appendChild(createCell(row.from));
    tr.appendChild(createCell(row.to));
    tr.appendChild(createCell(row.details));

    suggestionsTableBody.appendChild(tr);
  });
}

async function loadSuggestions() {
  try {
    setSuggestionsStatus("Loading suggestions...");
    const response = await fetch("/api/admin/suggestions/activity", { headers: buildAdminAuthHeaders() });
    if (!response.ok) {
      throw new Error("Could not load suggestions");
    }

    const payload = await response.json();
    const suggestions = Array.isArray(payload?.suggestions) ? payload.suggestions : [];
    const emails = Array.isArray(payload?.emails) ? payload.emails : [];
    const activities = [
      ...suggestions.map((row) => ({ date: row.created_at, kind: "Suggestion", title: row.suggestion_title || "-", from: row.submitted_by_email || row.submitted_by_name || "-", to: "-", details: row.reason || "-" })),
      ...emails.map((row) => ({ date: row.sent_at, kind: `Email: ${row.email_type || "hub_email"}`, title: row.subject || "-", from: row.from_email || "-", to: Array.isArray(row.recipients) ? row.recipients.join(", ") : String(row.recipients || "-"), details: "Sent successfully" }))
    ].sort((left, right) => new Date(right.date) - new Date(left.date));
    renderSuggestions(activities);
    setSuggestionsStatus(`${activities.length} suggestion and email record${activities.length === 1 ? "" : "s"} loaded.`);
  } catch (error) {
    setSuggestionsStatus(error.message || "Could not load suggestions.", true);
  }
}

ensureAdminAccess().then((allowed) => {
  if (allowed) {
    loadSuggestions();
  }
});

(() => {
  const previewButton = document.getElementById("certificate-catchup-preview");
  const sendButton = document.getElementById("certificate-catchup-send");
  const status = document.getElementById("certificate-catchup-status");
  const host = document.getElementById("certificate-catchup-results");
  let pending = [];
  let revision = 0;
  async function request(options = {}) {
    const response = await fetch("/api/admin/practical-skills/certificate-catchup", {
      ...options, headers: { ...buildAdminAuthHeaders(), "Content-Type": "application/json" }, cache: "no-store"
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
    return payload;
  }
  async function preview() {
    const current = ++revision;
    pending = [];
    sendButton.hidden = true;
    previewButton.disabled = true;
    host.replaceChildren();
    status.textContent = "Matching completed kits against teacher email history...";
    try {
      const snapshot = await request();
      if (current !== revision) return;
      pending = snapshot.rows.filter((row) => row.ready && row.pendingTeachers.length);
      const uncertain = snapshot.rows.filter((row) => row.uncertainTeachers.length);
      const unavailable = snapshot.rows.filter((row) => !row.ready && row.pendingTeachers.length);
      status.textContent = `${snapshot.rows.length} completed kits checked. ${pending.length} need teacher copies. ${uncertain.length} need manual delivery review. ${unavailable.length} need certificate review.`;
      const table = document.createElement("table");
      table.className = "admin-table";
      const heading = document.createElement("tr");
      for (const label of ["Student", "Kit", "Missing teacher recipients", "Status"]) {
        const cell = document.createElement("th");
        cell.textContent = label;
        heading.appendChild(cell);
      }
      table.appendChild(heading);
      for (const row of snapshot.rows.filter((entry) => entry.pendingTeachers.length || entry.uncertainTeachers.length)) {
        const tr = document.createElement("tr");
        for (const text of [row.studentEmail, row.kitTitle, row.pendingTeachers.join(", ") || "None",
          row.uncertainTeachers.length ? `Review delivery to ${row.uncertainTeachers.join(", ")}; no automatic retry` : !row.ready ? "Certificate unavailable" : "Ready"]) tr.appendChild(createCell(text));
        table.appendChild(tr);
      }
      host.appendChild(table);
      sendButton.hidden = !pending.length || !snapshot.emailConfigured;
      if (!snapshot.emailConfigured) status.textContent += " Email is not configured; sending is disabled.";
    } catch (error) {
      if (current === revision) status.textContent = error.message;
    } finally { if (current === revision) previewButton.disabled = false; }
  }
  previewButton.addEventListener("click", () => { void preview(); });
  sendButton.addEventListener("click", async () => {
    const current = revision;
    sendButton.disabled = true;
    previewButton.disabled = true;
    let sent = 0;
    let uncertain = 0;
    try {
      for (const row of pending) {
        if (current !== revision) return;
        status.textContent = `Sending missing teacher copies: ${sent} sent so far...`;
        const result = await request({ method: "POST", body: JSON.stringify({ studentEmail: row.studentEmail, kitId: row.kitId }) });
        sent += result.sent.length;
        uncertain += result.uncertainTeachers?.length || 0;
      }
      await preview();
      status.textContent = `${sent} teacher copies sent. ${uncertain} deliveries need manual review. Students were not emailed again. ${status.textContent}`;
      void loadSuggestions();
    } catch (error) {
      status.textContent = `${sent} teacher copies sent before stopping. ${error.message} Check the preview before trying again.`;
      sendButton.hidden = true;
    } finally { sendButton.disabled = false; previewButton.disabled = false; }
  });
  window.addEventListener("hub-auth-state-changed", () => {
    revision += 1;
    pending = [];
    host.replaceChildren();
    sendButton.hidden = true;
    status.textContent = "";
  });
})();
