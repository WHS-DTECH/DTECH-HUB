"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "script.js"), "utf8");
const start = source.indexOf("async function loadAndRenderSidebarKit(");
const end = source.indexOf("\nfunction routeHubCourseHomepage(", start);
const element = () => ({ dataset: {}, textContent: "", hidden: false, removeAttribute(name) { delete this[name]; } });
const title = element(), description = element(), open = element(), retry = element();
const panel = { querySelector: (selector) => ({
    "#hub-sidebar-kit-title": title, "#hub-sidebar-kit-description": description,
    "#hub-sidebar-kit-open": open, "#hub-sidebar-kit-retry": retry
})[selector] };
const context = vm.createContext({
    hubAuthState: { profile: { email: "student@example.test" } },
    normalizeEmail: (value) => String(value || "").trim().toLowerCase(),
    withHubAuthHeaders: (_headers, email) => ({ "x-user-email": email }),
    console: { error() {} }
});
vm.runInContext(source.slice(start, end), context);
async function main() {
    context.fetch = async (url, options) => {
        assert.equal(options.cache, "no-store");
        if (url.endsWith("my-progress")) {
            assert.equal(options.headers["x-user-email"], "student@example.test");
            return { ok: true, json: async () => ({ kits: [
                { id: "kit-login", isComplete: true }, { id: "kit-minecraft", isComplete: false },
                { id: "kit-search", isComplete: false }
            ] }) };
        }
        assert.equal(url, "/api/practical-skills/kit-content/kit-minecraft");
        return { ok: true, json: async () => ({ content: { identity: { name: "Minecraft Builder Kit" } } }) };
    };
    await context.loadAndRenderSidebarKit(panel);
    assert.equal(title.textContent, "Minecraft Builder Kit");
    assert.equal(open.href, "/practical-skills/kit-worksheet.html?kit=kit-minecraft");
    assert.equal(open.hidden, false);
    assert.equal(retry.hidden, true);
    context.fetch = async () => ({ ok: true, json: async () => ({ kits: [{ id: "kit-login", isComplete: true }] }) });
    await context.loadAndRenderSidebarKit(panel);
    assert.equal(title.textContent, "All kits completed");
    assert.equal(open.hidden, true);
    assert.equal(open.href, undefined);
    context.fetch = async () => ({ ok: false, json: async () => ({ error: "Not signed in" }) });
    await context.loadAndRenderSidebarKit(panel);
    assert.equal(title.textContent, "Kit could not be loaded");
    assert.equal(retry.hidden, false);
    context.fetch = async () => ({ ok: true, json: async () => ({ kits: [{}] }) });
    await context.loadAndRenderSidebarKit(panel);
    assert.equal(retry.hidden, false, "Malformed progress cannot look like successful completion");
    let release;
    context.fetch = () => new Promise((resolve) => { release = resolve; });
    const pending = context.loadAndRenderSidebarKit(panel);
    context.hubAuthState.profile = { email: "another@example.test" };
    release({ ok: true, json: async () => ({ kits: [] }) });
    await pending;
    assert.equal(title.textContent, "Loading your kit...", "Stale account response is ignored");
    assert.equal(open.hidden, true);
    assert.ok(source.indexOf('id="hub-sidebar-kit-heading"') < source.indexOf('<h3>Quick Links</h3>'));
    assert.match(source, /href="\/practical-skills\/checklist.html">View My Licence/);
    assert.match(source, /void loadAndRenderSidebarKit\(panel\)/);
    console.log("Sidebar current learning kit regressions passed.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
