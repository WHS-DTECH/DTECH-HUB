"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "..", "practical-skills", "checklist.js"), "utf8");
const tick = () => new Promise((resolve) => setImmediate(resolve));

async function main() {
    const html = fs.readFileSync(path.join(__dirname, "..", "practical-skills", "checklist.html"), "utf8");
    assert.match(html, /<details class="licence-more">/, "Stats and detailed collection are collapsed by default");
    assert.ok(html.indexOf('id="ps-stamp-list"') < html.indexOf('<details class="licence-more">'));
    assert.ok(html.indexOf('id="ps-kit-list"') > html.indexOf('<details class="licence-more">'));
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
        return { textContent: "", html: "", get innerHTML() { return this.html; },
            set innerHTML(value) { this.html = value; this.children = []; }, hidden: false, classList: { add() {}, remove() {} },
            children: [], appendChild(item) { this.children.push(item); }, querySelectorAll() { return []; } };
    }
    const context = vm.createContext({
        document: { getElementById(id) { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); }, createElement: node, querySelectorAll: () => [] },
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
    assert.match(nodes.get("ps-stamp-list").innerHTML, /Open kit & certificate/);
    assert.match(nodes.get("ps-application-kits").innerHTML, /<a class="licence-stamp" href="\.\/kit-worksheet.html\?kit=kit-minecraft"/, "Application stamps open their kits too");
    assert.doesNotMatch(nodes.get("ps-stamp-list").innerHTML, /kit=kit-minecraft/, "Applications are separate from the large skill cards");
    assert.match(nodes.get("ps-application-kits").innerHTML, /Application = Minecraft/);
    assert.ok(nodes.get("ps-stamp-list").innerHTML.indexOf("typing-kit.html") < nodes.get("ps-stamp-list").innerHTML.indexOf("kit=kit-google-search"), "Typing follows Login, before Search");
    assert.match(nodes.get("ps-stamp-list").innerHTML, /href="\.\/typing-kit\.html"[^>]*>.*Typing Kit/);
    assert.match(nodes.get("ps-licence-progress-count").textContent, /\/ 3 stamps/, "Typing Kit log does not change the stamp count");
    assert.match(nodes.get("ps-next-link").href, /kit-google-search/);
    assert.match(nodes.get("ps-badge-list").innerHTML, /First Kit/);
    assert.equal(requests[0].options.headers.Authorization, "Bearer test-token");
    assert.equal(nodes.get("ps-kit-list").children.length, 4, "Original kits and the ongoing Typing Kit remain accessible");
    assert.match(nodes.get("ps-kit-list").children[0].innerHTML, /Manage progress/);
    assert.match(nodes.get("ps-kit-list").children[3].innerHTML, /typing-kit\.html/);
    assert.doesNotMatch(nodes.get("ps-kit-list").children[3].innerHTML, /data-action|certificate/, "Typing history has no completion, reset or certificate actions");

    snapshot = { ...snapshot, typingKit: { id: "kit-typing", live: false } };
    events["hub-auth-state-changed"]();
    await tick();
    assert.doesNotMatch(nodes.get("ps-stamp-list").innerHTML, /typing-kit\.html/, "Paused typing is hidden from student cards");
    assert.equal(nodes.get("ps-kit-list").children.length, 3, "Paused typing is also hidden from detailed collection");
    snapshot = { ...snapshot, canManageKits: true };
    events["hub-auth-state-changed"]();
    await tick();
    assert.match(nodes.get("ps-stamp-list").innerHTML, /data-publication="kit-typing" data-live="false"/);
    assert.match(nodes.get("ps-stamp-list").innerHTML, /Preview Not Live log/);
    snapshot = { ...snapshot, typingKit: { id: "kit-typing", live: true } };
    events["hub-auth-state-changed"]();
    await tick();
    assert.match(nodes.get("ps-stamp-list").innerHTML, /data-publication="kit-typing" data-live="true"/);
    snapshot = { ...snapshot, canManageKits: false };

    snapshot = { ...snapshot, completedCount: 3, kits: ["kit-login", "kit-google-search", "kit-minecraft"].map((id) => ({ id, isComplete: true })) };
    events["hub-auth-state-changed"]();
    await tick();
    assert.equal(nodes.get("ps-next-link").hidden, true);
    assert.match(nodes.get("ps-next-title").textContent, /Every stamp collected/);
    assert.equal(((nodes.get("ps-stamp-list").innerHTML + nodes.get("ps-application-kits").innerHTML).match(/is-earned/g) || []).length, 3);
    snapshot = { ...snapshot, badges: [{ title: "<script>", description: "<img>" }] };
    events["hub-auth-state-changed"]();
    await tick();
    assert.match(nodes.get("ps-badge-list").innerHTML, /&lt;script&gt;/);

    snapshot = { ...snapshot,
        customKits: [
            { id: "kit-files", title: "Files & Folders", icon: "<img>", description: "Create. Save. Find.", custom: true, isComplete: true },
            { id: "kit-management", title: "File Management", icon: "F", description: "Organise files.", custom: true, isComplete: false }
        ],
        kits: [...snapshot.kits, { id: "kit-files", isComplete: true }, { id: "kit-management", isComplete: false }],
        stampCompletedCount: 4, stampTotalKits: 5
    };
    events["hub-auth-state-changed"]();
    await tick();
    assert.match(nodes.get("ps-stamp-list").innerHTML, /Files &amp; Folders/);
    assert.match(nodes.get("ps-stamp-list").innerHTML, /kit=kit-files/);
    assert.match(nodes.get("ps-stamp-list").innerHTML, /&lt;img&gt;/);
    assert.equal(nodes.get("ps-licence-progress-count").textContent, "4 / 5 stamps");
    assert.match(nodes.get("ps-next-link").href, /kit-management/);
    const customCard = nodes.get("ps-kit-list").children.find((item) => /Files &amp; Folders/.test(item.innerHTML));
    assert.match(customCard.innerHTML, /Files &amp; Folders/);
    assert.match(customCard.innerHTML, /View kit & certificate/);
    assert.doesNotMatch(customCard.innerHTML, /Target window|Points:/);

    snapshot = { ...snapshot, canManageKits: true, licenceKits: [
        { id: "kit-files", title: "Files & Folders", live: false, custom: true, icon: "F" },
        { id: "kit-login", title: "Login Kit", live: true, icon: "L" }
    ], stampTotalKits: 2, stampCompletedCount: 1 };
    events["hub-auth-state-changed"]();
    await tick();
    assert.match(nodes.get("ps-stamp-list").innerHTML, /Files &amp; Folders/);
    assert.match(nodes.get("ps-stamp-list").innerHTML, /data-publication="kit-files" data-live="false">Not Live/);
    assert.match(nodes.get("ps-stamp-list").innerHTML, /role="switch" aria-checked="false"/);
    assert.doesNotMatch(nodes.get("ps-stamp-list").innerHTML, /kit=kit-minecraft/, "Server catalog is authoritative, not the old fixed three-kit list");
    assert.equal(nodes.get("ps-licence-progress-count").textContent, "1 / 2 stamps");
    assert.equal(nodes.get("ps-application-kits").hidden, true, "No empty application headings when none are visible");

    snapshot = { ...snapshot, licenceKits: [...snapshot.licenceKits,
        { id: "kit-minecraft", title: "Minecraft Player Kit", live: true, skillArea: "Application Kits", application: "Minecraft" },
        { id: "kit-minecraft-builder", title: "Minecraft Builder Kit", live: false, skillArea: "Application Kits", application: "Minecraft" },
        { id: "kit-minecraft-coder", title: "Minecraft Coder Kit", live: false, skillArea: "Application Kits", application: "Minecraft" }
    ] };
    events["hub-auth-state-changed"]();
    await tick();
    const applicationCards = nodes.get("ps-application-kits").innerHTML;
    assert.equal(nodes.get("ps-application-kits").hidden, false);
    assert.equal((applicationCards.match(/class="licence-application-group"/g) || []).length, 1);
    assert.match(applicationCards, /kit=kit-minecraft-builder&preview=1/);
    assert.match(applicationCards, /data-publication="kit-minecraft-coder" data-live="false"/);
    assert.doesNotMatch(nodes.get("ps-stamp-list").innerHTML, /Minecraft/);

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
    assert.match(navigation, /id="hub-senior-task-list-link" class="hub-senior-task-list-link" href="\/task-list\.html" hidden><span class="hub-task-list-course" data-task-list-course hidden><\/span><span class="hub-task-list-label">Task List<\/span><\/a>/);
    assert.match(navigation, /id="hub-upload-kits-link" role="menuitem" href="\/practical-skills\/admin-kits\.html" hidden>Upload Kits<\/a>/);
    assert.doesNotMatch(navigation, /id="hub-browse-task-list-link"/, "Task List is not duplicated in Browse");
    assert.match(navigation, /if \(hubUploadKitsLink\) \{\s*hubUploadKitsLink\.hidden = !canAdmin;/, "Kit uploader link is visible to admins only");
    assert.match(styles, /\.nav-dropdown-practical-skills summary\s*\{[^}]*background:\s*#2867bd/s, "Licence uses the blue navbar color");
    assert.match(styles, /\.topbar-links a\.hub-senior-task-list-link\s*\{[^}]*background:\s*#2f8f61/s, "Senior Task List uses the green navbar color");
    assert.match(styles, /\.topbar-links a\.hub-senior-task-list-link\s*\{[^}]*flex-direction:\s*column/s, "Task List button stacks its course label above the name");
    const start = navigation.indexOf("function renderHubPracticalSkillsMenu(");
    const end = navigation.indexOf("function renderHubSidebarStandardsCard(", start);
    const summary = {};
    const taskListLink = { dataset: {}, hidden: true };
    const navContext = vm.createContext({
        hubAuthState: { email: "student@school.nz" },
        document: { querySelector: (selector) => selector.endsWith("summary") ? summary : taskListLink }
    });
    vm.runInContext(navigation.slice(start, end), navContext);
    navContext.renderHubPracticalSkillsMenu("7");
    assert.equal(summary.textContent, "Licence");
    assert.equal(taskListLink.hidden, true, "Year-group rendering does not override course-controlled Task List");
    navContext.renderHubPracticalSkillsMenu("Year 12");
    assert.equal(summary.textContent, "Licence", "Senior users retain Licence");
    assert.equal(taskListLink.hidden, true, "Senior Task List waits for actual course rather than assuming from year");
    console.log("Licence dashboard identity, stamps, next kit, stats, errors and sign-out regressions passed.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
