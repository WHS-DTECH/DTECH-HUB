"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "..", "practical-skills", "checklist.js"), "utf8");
const tick = () => new Promise((resolve) => setImmediate(resolve));

async function main() {
    const nodes = new Map();
    const events = {};
    const requests = [];
    let auth = JSON.stringify({ expiresAt: Date.now() + 60000, profile: { email: "student@school.nz" }, idToken: "test-token" });
    let snapshot = {
        student: { name: "Māia Student", email: "student@school.nz" },
        kits: [{ id: "kit-login", isComplete: true, score: 150, onTime: true }],
        completedCount: 1, totalKits: 3, totalPoints: 150, tier: "Bronze",
        badges: [{ title: "First Kit", description: "Your first achievement", icon: "*" }]
    };
    let fail = false;
    let deferred;
    function node() {
        return { textContent: "", innerHTML: "", hidden: false, classList: { add() {}, remove() {} },
            children: [], appendChild(item) { this.children.push(item); }, querySelectorAll() { return []; } };
    }
    const context = vm.createContext({
        document: { getElementById(id) { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); }, createElement: node },
        localStorage: { getItem: () => auth }, sessionStorage: { getItem: () => null },
        window: { addEventListener: (name, handler) => { events[name] = handler; }, setInterval: () => 1, clearInterval() {} },
        fetch: async (url, options) => {
            requests.push({ url, options });
            if (deferred) return new Promise((resolve) => { deferred.resolve = resolve; });
            return { ok: !fail, status: fail ? 500 : 200, json: async () => fail ? { error: "Database unavailable" } : snapshot };
        }
    });
    vm.runInContext(source, context);
    await tick();
    assert.equal(nodes.get("ps-student-name").textContent, "Māia Student");
    assert.equal(nodes.get("ps-total-points").textContent, "150");
    assert.equal(nodes.get("ps-current-tier").textContent, "Bronze");
    assert.equal(nodes.get("ps-licence-progress").value, 1);
    assert.equal((nodes.get("ps-stamp-list").innerHTML.match(/is-earned/g) || []).length, 1);
    assert.match(nodes.get("ps-stamp-list").innerHTML, /kit=kit-login/);
    assert.match(nodes.get("ps-stamp-list").innerHTML, /View certificate/);
    assert.match(nodes.get("ps-next-link").href, /kit-google-search/);
    assert.match(nodes.get("ps-badge-list").innerHTML, /First Kit/);
    assert.equal(requests[0].options.headers.Authorization, "Bearer test-token");
    assert.equal(nodes.get("ps-kit-list").children.length, 3, "All kits remain accessible");
    assert.match(nodes.get("ps-kit-list").children[0].innerHTML, /Manage progress/);

    snapshot = { ...snapshot, completedCount: 3, kits: ["kit-login", "kit-google-search", "kit-minecraft"].map((id) => ({ id, isComplete: true })) };
    events["hub-auth-state-changed"]();
    await tick();
    assert.equal(nodes.get("ps-next-link").hidden, true);
    assert.match(nodes.get("ps-next-title").textContent, /Every stamp collected/);
    assert.equal((nodes.get("ps-stamp-list").innerHTML.match(/is-earned/g) || []).length, 3);
    snapshot = { ...snapshot, badges: [{ title: "<script>", description: "<img>" }] };
    events["hub-auth-state-changed"]();
    await tick();
    assert.match(nodes.get("ps-badge-list").innerHTML, /&lt;script&gt;/);

    fail = true;
    events["hub-auth-state-changed"]();
    await tick();
    assert.equal(nodes.get("ps-status").textContent, "Database unavailable");
    assert.match(nodes.get("ps-kit-list").innerHTML, /has not been reset/);
    assert.equal(nodes.get("ps-total-points").textContent, "\u2014");

    fail = false;
    deferred = {};
    events["hub-auth-state-changed"]();
    await tick();
    auth = null;
    events["hub-auth-state-changed"]();
    deferred.resolve({ ok: true, json: async () => snapshot });
    await tick();
    assert.equal(nodes.get("ps-student-name").textContent, "Your name belongs here");
    assert.equal(nodes.get("ps-next-step").hidden, true);
    assert.ok(!nodes.get("ps-stamp-list").innerHTML.includes("is-earned"), "Signing out clears awards and ignores old requests");
    const navigation = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
    const styles = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");
    assert.match(navigation, /id="hub-senior-task-list-link" class="hub-senior-task-list-link" href="\/task-list\.html" hidden>Task List<\/a>/);
    assert.match(navigation, /id="hub-upload-kits-link" role="menuitem" href="\/practical-skills\/admin-kits\.html" hidden>Upload Kits<\/a>/);
    assert.doesNotMatch(navigation, /id="hub-browse-task-list-link"/, "Task List is not duplicated in Browse");
    assert.match(navigation, /if \(hubUploadKitsLink\) \{\s*hubUploadKitsLink\.hidden = !canAdmin;/, "Kit uploader link is visible to admins only");
    assert.match(styles, /\.nav-dropdown-practical-skills summary\s*\{[^}]*background:\s*#2867bd/s, "Licence uses the blue navbar color");
    assert.match(styles, /\.topbar-links a\.hub-senior-task-list-link\s*\{[^}]*background:\s*#2f8f61/s, "Senior Task List uses the green navbar color");
    const start = navigation.indexOf("function renderHubPracticalSkillsMenu(");
    const end = navigation.indexOf("function renderHubSidebarStandardsCard(", start);
    const summary = {};
    const taskListLink = { dataset: {}, hidden: false };
    const navContext = vm.createContext({
        hubAuthState: { email: "student@school.nz" },
        document: { querySelector: (selector) => selector.endsWith("summary") ? summary : taskListLink }
    });
    vm.runInContext(navigation.slice(start, end), navContext);
    navContext.renderHubPracticalSkillsMenu("7");
    assert.equal(summary.textContent, "Licence");
    assert.equal(taskListLink.hidden, true, "Non-senior users see Licence without the Task List button");
    navContext.renderHubPracticalSkillsMenu("Year 12");
    assert.equal(summary.textContent, "Licence", "Senior users retain Licence");
    assert.equal(taskListLink.hidden, false);
    assert.equal(taskListLink.dataset.senior, "true", "Senior students additionally see Task List");
    console.log("Licence dashboard identity, stamps, next kit, stats, errors and sign-out regressions passed.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
