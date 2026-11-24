(() => {
    "use strict";
    const host = document.getElementById("blueprint-teams-admin");
    let revision = 0;
    function identity() {
        const auth = JSON.parse(localStorage.getItem("hub_google_auth_v1") || sessionStorage.getItem("hub_google_auth_v1") || "{}");
        const email = auth.profile?.email;
        const token = window.getActiveHubBearerToken?.();
        if (!email || !token) throw new Error("Verify your school Google sign-in, then refresh registrations.");
        return { email, token };
    }
    async function request(url, options = {}) {
        const session = identity();
        const current = revision;
        const response = await fetch(url, { ...options, cache: "no-store",
            headers: { "Content-Type": "application/json", "x-user-email": session.email, Authorization: `Bearer ${session.token}` } });
        const result = await response.json();
        if (current !== revision || identity().email !== session.email) throw new Error("Your account changed. Refresh registrations.");
        if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
        return result;
    }
    function refresh() {
        revision += 1;
        const panel = document.createElement("div");
        host.replaceChildren(panel);
        void window.BlueprintTeams.teacher(panel, request);
    }
    document.getElementById("blueprint-teams-refresh").addEventListener("click", refresh);
    window.addEventListener("hub-auth-state-changed", refresh);
    refresh();
})();
