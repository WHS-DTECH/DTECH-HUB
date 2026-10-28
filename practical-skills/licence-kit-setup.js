(() => {
    "use strict";
    const form = document.getElementById("setup-form");
    const kit = document.getElementById("setup-kit");
    const fields = document.getElementById("setup-fields");
    const method = document.getElementById("setup-method");
    const value = document.getElementById("setup-value");
    const status = document.getElementById("setup-status");
    let revision = 0;
    let dirty = false;
    function message(text, error = false) {
        status.textContent = text;
        status.classList.toggle("is-error", error);
    }
    async function request(url, options = {}) {
        const auth = JSON.parse(localStorage.getItem("hub_google_auth_v1") || sessionStorage.getItem("hub_google_auth_v1") || "{}");
        const headers = { "Content-Type": "application/json", "x-user-email": auth.profile?.email || "" };
        const token = auth.idToken || auth.accessToken || "";
        if (token) headers.Authorization = `Bearer ${token}`;
        const response = await fetch(url, { ...options, headers, cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
        return data;
    }
    function path() { return `/api/admin/practical-skills/kit-licence/${encodeURIComponent(kit.value)}`; }
    async function loadSettings() {
        const current = ++revision;
        fields.disabled = true;
        value.value = "";
        dirty = false;
        message("Loading Unity licence settings...");
        try {
            const data = await request(path());
            if (current !== revision) return;
            method.value = data.activationMethod;
            value.value = data.licenceValue;
            fields.disabled = false;
            message("Teacher access confirmed. Save changes to update Activity 1.");
        } catch (error) {
            if (current === revision) message(error.message, true);
        }
    }
    async function load() {
        const current = ++revision;
        form.hidden = true;
        fields.disabled = true;
        value.value = "";
        kit.replaceChildren();
        dirty = false;
        try {
            const data = await request("/api/admin/practical-skills/kits");
            if (current !== revision) return;
            const kits = data.kits.filter((entry) => /unity\s+setup/i.test(entry.title));
            if (!kits.length) throw new Error("No Unity Setup kit found. Create it in the Kit Content Builder first.");
            for (const entry of kits) {
                const option = document.createElement("option");
                option.value = entry.id;
                option.textContent = entry.title;
                kit.appendChild(option);
            }
            form.hidden = false;
            await loadSettings();
        } catch (error) {
            if (current === revision) message(error.message, true);
        }
    }
    kit.addEventListener("change", () => { void loadSettings(); });
    fields.addEventListener("input", () => { dirty = true; message("Unsaved licence changes."); });
    fields.addEventListener("change", () => { dirty = true; message("Unsaved licence changes."); });
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const current = revision;
        fields.disabled = true;
        kit.disabled = true;
        try {
            await request(path(), { method: "PUT", body: JSON.stringify({ activationMethod: method.value, licenceValue: value.value }) });
            if (current !== revision) return;
            dirty = false;
            message("Unity licence saved. Students see the current information when they choose View School Licence in Activity 1.");
        } catch (error) {
            if (current === revision) message(error.message, true);
        } finally {
            if (current === revision) fields.disabled = false;
            kit.disabled = false;
        }
    });
    window.addEventListener("hub-auth-state-changed", () => { void load(); });
    window.addEventListener("beforeunload", (event) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } });
    void load();
})();
