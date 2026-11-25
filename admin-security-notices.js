(() => {
  "use strict";
  const endpoint = "/api/admin/security-notices";
  const form = document.getElementById("notice-form");
  const status = document.getElementById("notice-status");
  const list = document.getElementById("notice-list");
  let selected = null;
  let imageUrl = "";

  function headers() {
    const token = getActiveHubBearerToken();
    if (!token) throw new Error("Sign in with Google, then reload notices.");
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  }
  async function request(url, options = {}) {
    const response = await fetch(url, { ...options, headers: headers(), cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
    return payload;
  }
  function show(row) {
    selected = row;
    form.reset();
    for (const [key, value] of Object.entries(row?.details || {})) {
      const field = form.elements.namedItem(key);
      if (field) field.value = value;
    }
    if (!row) form.elements.namedItem("receivedOn").value = new Date().toISOString().slice(0, 10);
    form.hidden = false;
    document.getElementById("notice-meta").textContent = row
      ? `Version ${row.version}. Updated by ${row.updated_by} at ${new Date(row.updated_at).toLocaleString("en-NZ")}.` : "New notice";
    document.getElementById("notice-evidence").hidden = row?.seed_key !== "render-upload2shell-2026";
    document.getElementById("notice-image").hidden = true;
    document.getElementById("notice-history-section").hidden = !row?.history?.length;
    document.getElementById("notice-history").textContent = row?.history?.length ? JSON.stringify(row.history, null, 2) : "";
  }
  async function load(id) {
    status.textContent = "Loading notices...";
    try {
      const { notices } = await request(endpoint);
      list.replaceChildren();
      for (const row of notices) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = `${row.details.title} - ${row.details.severity.toUpperCase()} - ${row.details.status}`;
        button.addEventListener("click", () => show(row));
        list.append(button);
      }
      document.getElementById("notice-new").disabled = false;
      show(notices.find((row) => row.id === id) || notices[0] || null);
      status.textContent = `${notices.length} notice(s) loaded.`;
      return true;
    } catch (error) {
      list.replaceChildren();
      form.hidden = true;
      document.getElementById("notice-new").disabled = true;
      document.getElementById("notice-evidence").hidden = true;
      document.getElementById("notice-history-section").hidden = true;
      status.textContent = error.message;
      return false;
    }
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = document.getElementById("notice-save");
    button.disabled = true;
    status.textContent = "Saving notice...";
    try {
      const body = Object.fromEntries(new FormData(form));
      if (selected) body.version = selected.version;
      const result = await request(selected ? `${endpoint}/${selected.id}` : endpoint, {
        method: selected ? "PUT" : "POST", body: JSON.stringify(body)
      });
      if (await load(result.notice.id)) status.textContent = "Notice saved. Previous versions retained.";
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
  });
  document.getElementById("notice-reload").addEventListener("click", () => { void load(); });
  document.getElementById("notice-new").addEventListener("click", () => show(null));
  document.getElementById("notice-load-image").addEventListener("click", async () => {
    try {
      const response = await fetch(`${endpoint}/render-evidence`, { headers: headers(), cache: "no-store" });
      if (!response.ok) throw new Error("Could not load the original notice. Check your Admin sign-in.");
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      imageUrl = URL.createObjectURL(await response.blob());
      const image = document.getElementById("notice-image");
      image.src = imageUrl;
      image.hidden = false;
    } catch (error) { status.textContent = error.message; }
  });
  window.addEventListener("pagehide", () => { if (imageUrl) URL.revokeObjectURL(imageUrl); });
  window.addEventListener("hub-auth-state-changed", () => { void load(); });
  void load();
})();
