"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const express = require("express");
const { registerLearningPathways, normalizeCards } = require("../learning-pathways/library-store");
const root = path.join(__dirname, "..");
const sample = { id: "web", title: "Web Design", summary: "Choose your next web learning steps.",
    href: "/learning-pathways/web.html", yearLevel: "Senior DTECH", area: "Web", status: "active" };

class Element {
    constructor(tagName = "") {
        this.tagName = tagName;
        this.children = []; this.value = ""; this.textContent = ""; this.dataset = {}; this.style = {};
        const classes = new Set();
        this.classList = { toggle() {}, add: (...names) => names.forEach((name) => classes.add(name)), remove() {}, contains: (name) => classes.has(name) };
    }
    append(...items) { this.children.push(...items); }
    appendChild(item) { this.children.push(item); }
    replaceChildren(...items) { this.children = items; }
    setAttribute() {}
    addEventListener(name, fn) { this[name] = fn; }
    querySelectorAll() { return this.children; }
    focus() {}
    set innerHTML(value) { this.html = value; if (!value) this.children = []; }
    get innerHTML() { return this.html || ""; }
}
const tick = () => new Promise((resolve) => setImmediate(resolve));

async function testDashboard() {
    const names = ["grid", "results-meta", "search", "year-pills", "status-pills", "category-pills", "type-pills", "sort"];
    const elements = Object.fromEntries(names.map((name) => [`#practical-skills-${name}`, new Element()]));
    const dashboard = fs.readFileSync(path.join(root, "learning-pathways", "index.html"), "utf8");
    const cardLabel = dashboard.match(/data-library-card-label="([^"]+)"/)?.[1];
    assert.equal(cardLabel, "Curriculum Strands");
    const config = { dataset: { libraryPath: "/learning-pathways/library.json",
        libraryName: "Learning Pathways", libraryCardLabel: cardLabel, libraryIcon: "LP" } };
    let responseCards = [];
    let fails = false;
    const context = vm.createContext({
        document: { querySelector: () => config, getElementById: (id) => elements[`#${id}`], createElement: (tag) => new Element(tag) },
        fetch: async (url, options) => {
            assert.equal(url, config.dataset.libraryPath || "/practical-skills/library.json");
            assert.equal(options.cache, "no-store");
            return { ok: !fails, json: async () => responseCards };
        },
        console: { error() {} }
    });
    vm.runInContext(fs.readFileSync(path.join(root, "practical-skills/app.js"), "utf8"), context);
    await tick();
    const grid = elements["#practical-skills-grid"];
    assert.match(grid.children[0].innerHTML, /Learning pathways are coming soon/);
    responseCards = [sample, { ...sample, id: "art", title: "Art", area: "Design", yearLevel: "Junior DTECH" }];
    fails = true;
    // A fresh load distinguishes an API failure from a genuinely empty library.
    vm.runInContext(fs.readFileSync(path.join(root, "practical-skills/app.js"), "utf8"), context);
    await tick();
    assert.equal(elements["#practical-skills-results-meta"].textContent, "Library could not be loaded.");
    assert.equal(grid.children[0].children[1].textContent, "Retry loading library");
    fails = false;
    await grid.children[0].children[1].click();
    assert.equal(grid.children.length, 2);
    assert.match(grid.children[0].innerHTML, /Curriculum Strands/);
    assert.equal(grid.children[0].href, sample.href, "Cards retain their configured links");
    const search = elements["#practical-skills-search"];
    search.value = "web design";
    search.input();
    assert.equal(grid.children.length, 1);
    assert.match(grid.children[0].innerHTML, /Web Design/);
    search.value = "";
    search.input();
    const years = elements["#practical-skills-year-pills"];
    years.children.find((pill) => pill.textContent === "Senior DTECH").click();
    assert.equal(grid.children.length, 1);
    years.children[0].click();
    elements["#practical-skills-sort"].value = "name-desc";
    elements["#practical-skills-sort"].change();
    assert.match(grid.children[0].innerHTML, /Web Design/);
    const categories = elements["#practical-skills-category-pills"];
    categories.children.find((pill) => pill.textContent === "Design").click();
    assert.equal(grid.children.length, 1);
    assert.match(grid.children[0].innerHTML, /Art/);
    responseCards = [{ ...sample, href: "" }];
    vm.runInContext(fs.readFileSync(path.join(root, "practical-skills/app.js"), "utf8"), context);
    await tick();
    assert.equal(grid.children[0].tagName, "article", "Display-only pathways are not links");
    assert.equal(grid.children[0].href, undefined);
    assert.match(grid.children[0].innerHTML, /Curriculum Strands/, "Display-only cards show the curriculum card type");
    const unitPalette = dashboard.match(/data-library-unit-palette="([^"]+)"/)?.[1];
    assert.match(unitPalette, /#9f1d3a/, "Units use their own crimson palette");
    Object.assign(config.dataset, { libraryUnitLabel: "Units", libraryUnitPalette: unitPalette,
        libraryPalette: "linear-gradient(135deg, #2b87b6 0%, #46a6d0 100%)" });
    responseCards = [{ ...sample, id: "unit-a", title: "Alpha Unit", cardType: "unit", strand: "web" }, { ...sample, title: "Zeta Strand" }];
    vm.runInContext(fs.readFileSync(path.join(root, "practical-skills/app.js"), "utf8"), context);
    await tick();
    assert.match(grid.children[0].innerHTML, /Zeta Strand/, "Curriculum Strands appear before Units");
    assert.match(grid.children[1].innerHTML, /Units/);
    assert.match(grid.children[1].innerHTML, /#9f1d3a/);
    assert.doesNotMatch(grid.children[0].innerHTML, /#9f1d3a/, "Strands keep the Pathways palette");
    const types = elements["#practical-skills-type-pills"];
    assert.deepEqual(types.children.map((pill) => pill.textContent), ["All", "Curriculum Strands", "Units"]);
    types.children.find((pill) => pill.textContent === "Units").click();
    assert.equal(grid.children.length, 1);
    assert.match(grid.children[0].innerHTML, /Alpha Unit/);
    context.location = { search: "?type=unit", hash: "#card-unit-a" };
    Element.prototype.scrollIntoView = function scrollIntoView() { this.scrolled = true; };
    vm.runInContext(fs.readFileSync(path.join(root, "practical-skills/app.js"), "utf8"), context);
    await tick();
    assert.equal(grid.children.length, 1, "?type=unit preselects the Units filter");
    assert.equal(grid.children[0].id, "card-unit-a");
    assert.equal(grid.children[0].scrolled, true, "#card-<id> scrolls to the requested Unit card");
    delete Element.prototype.scrollIntoView;
    delete context.location;
    const lessonPalette = dashboard.match(/data-library-lesson-palette="([^"]+)"/)?.[1];
    assert.match(lessonPalette, /#a35200/, "Lessons use their own amber palette");
    Object.assign(config.dataset, { libraryLessonLabel: "Lessons", libraryLessonPalette: lessonPalette });
    responseCards = [{ ...sample, id: "lesson-b", title: "Binary Piano", cardType: "lesson", unit: "u", sequence: 2 },
        { ...sample, id: "lesson-a", title: "Zeta Lesson", cardType: "lesson", unit: "u", sequence: 1 },
        { ...sample, id: "unit-a", title: "Alpha Unit", cardType: "unit" }, { ...sample, title: "Zeta Strand" }];
    vm.runInContext(fs.readFileSync(path.join(root, "practical-skills/app.js"), "utf8"), context);
    await tick();
    assert.deepEqual(grid.children.slice(1).map((card) => card.id), ["card-unit-a", "card-lesson-a", "card-lesson-b"],
        "Lessons follow Units and keep sequence order");
    assert.match(grid.children[0].innerHTML, /Zeta Strand/);
    assert.ok(grid.children[2].classList.contains("pathway-lesson-card"));
    assert.match(grid.children[2].innerHTML, /#a35200/);
    assert.match(grid.children[2].innerHTML, />Lessons</);
    assert.deepEqual(elements["#practical-skills-type-pills"].children.map((pill) => pill.textContent), ["All", "Curriculum Strands", "Units", "Lessons"]);
    const activityPalette = dashboard.match(/data-library-activity-palette="([^"]+)"/)?.[1];
    assert.match(activityPalette, /#1f6b3a/, "Lesson Activities use their own green palette");
    assert.match(dashboard, /data-library-activity-label="Lesson Activities"/);
    Object.assign(config.dataset, { libraryActivityLabel: "Lesson Activities", libraryActivityPalette: activityPalette });
    responseCards = [{ ...sample, id: "act-b", title: "Build", cardType: "activity", lesson: "l", sequence: 2 },
        { ...sample, id: "act-a", title: "Zeta Starter", cardType: "activity", lesson: "l", sequence: 1 },
        { ...sample, id: "lesson-a", title: "Zeta Lesson", cardType: "lesson", unit: "u", sequence: 1 }, { ...sample, title: "Zeta Strand" }];
    vm.runInContext(fs.readFileSync(path.join(root, "practical-skills/app.js"), "utf8"), context);
    await tick();
    assert.deepEqual(grid.children.slice(1).map((card) => card.id), ["card-lesson-a", "card-act-a", "card-act-b"],
        "Lesson Activities follow Lessons and keep sequence order");
    assert.ok(grid.children[2].classList.contains("pathway-activity-card"));
    assert.match(grid.children[2].innerHTML, /#1f6b3a/);
    assert.match(grid.children[2].innerHTML, />Lesson Activities</);
    assert.deepEqual(elements["#practical-skills-type-pills"].children.map((pill) => pill.textContent), ["All", "Curriculum Strands", "Lessons", "Lesson Activities"]);
    config.dataset = {};
    responseCards = [sample, { ...sample, id: "practical-skills-checklist", title: "Licence" }];
    vm.runInContext(fs.readFileSync(path.join(root, "practical-skills/app.js"), "utf8"), context);
    await tick();
    assert.equal(grid.children.length, 1, "Licence Library still excludes the standalone checklist");
    assert.match(grid.children[0].innerHTML, /PRACTICAL SKILL/);
    assert.match(grid.children[0].innerHTML, /#2f8f61/, "Existing Licence Library green palette is preserved");
}

async function testEditor() {
    const names = ["form", "fields", "message", "cards", "search", "retry", "id", "title", "summary",
        "year", "area", "href", "image", "status", "icon", "type", "publish", "clear"];
    const elements = Object.fromEntries(names.map((name) => [`#pathways-${name}`, new Element()]));
    elements["#pathways-form"].reset = () => {
        ["id", "title", "summary", "year", "area", "href", "image", "icon"].forEach((name) => { elements[`#pathways-${name}`].value = ""; });
        elements["#pathways-status"].value = "active";
    };
    const events = {};
    let saved = [];
    let failPublish = false;
    const context = vm.createContext({
        document: { querySelector: (selector) => elements[selector], createElement: () => new Element() },
        window: { confirm: () => true, addEventListener: (name, fn) => { events[name] = fn; } },
        getActiveHubEmail: () => "admin@example.test",
        withHubAuthHeaders: (headers) => headers,
        fetch: async (url, options) => {
            assert.equal(url, "/api/admin/learning-pathways/library");
            if (options.method === "PUT") {
                if (failPublish) return { ok: false, json: async () => ({ error: "Storage unavailable" }) };
                saved = normalizeCards(JSON.parse(options.body).cards);
            }
            return { ok: true, json: async () => ({ cards: JSON.parse(JSON.stringify(saved)) }) };
        }
    });
    vm.runInContext(fs.readFileSync(path.join(root, "learning-pathways/admin.js"), "utf8"), context);
    await tick();
    assert.equal(elements["#pathways-fields"].disabled, false);
    for (const [name, value] of Object.entries({ title: sample.title, summary: sample.summary, href: sample.href, status: "active" })) {
        elements[`#pathways-${name}`].value = value;
    }
    elements["#pathways-form"].submit({ preventDefault() {} });
    assert.equal(saved.length, 0, "Draft changes do not publish themselves");
    assert.match(elements["#pathways-message"].textContent, /draft/);
    failPublish = true;
    await elements["#pathways-publish"].click();
    assert.match(elements["#pathways-message"].textContent, /Publish failed/);
    failPublish = false;
    await elements["#pathways-publish"].click();
    assert.equal(saved.length, 1, "Failed publish retains draft for retry");
    const row = elements["#pathways-cards"].children[0];
    row.children[3].click();
    elements["#pathways-title"].value = "Updated Pathway";
    elements["#pathways-form"].submit({ preventDefault() {} });
    await elements["#pathways-publish"].click();
    assert.equal(saved[0].title, "Updated Pathway");
    elements["#pathways-cards"].children[0].children[4].click();
    await elements["#pathways-publish"].click();
    assert.equal(saved.length, 0, "Deletion persists after publishing");
    context.getActiveHubEmail = () => "";
    context.fetch = async () => ({ ok: false, json: async () => ({ error: "Admin required" }) });
    events["hub-auth-state-changed"]();
    await tick();
    assert.equal(elements["#pathways-fields"].disabled, true, "Signed-out users cannot keep editing");
    assert.match(elements["#pathways-message"].textContent, /Admin required/);
    assert.equal(elements["#pathways-cards"].children[0].textContent, "No pathway cards yet. Add your first card above.");
}

async function main() {
    const seed = normalizeCards(JSON.parse(fs.readFileSync(path.join(root, "learning-pathways/library.json"), "utf8")));
    const strands = seed.filter((card) => card.cardType === "strand");
    const units = seed.filter((card) => card.cardType === "unit");
    const lessons = seed.filter((card) => card.cardType === "lesson");
    const activities = seed.filter((card) => card.cardType === "activity");
    const plusActivities = (cards) => normalizeCards([...cards, ...activities.filter((activity) => !cards.some((card) => card.id === activity.id))]);
    const plusLessons = (cards) => plusActivities([...cards, ...lessons.filter((lesson) => !cards.some((card) => card.id === lesson.id))]);
    const plusUnits = (cards) => plusLessons([...cards, ...units.filter((unit) => !cards.some((card) => card.id === unit.id))]);
    assert.deepEqual(strands.map((card) => card.title), ["Digital systems", "Programming & Algorithms", "Data and Information",
        "Digital citizenship", "Systems and control"]);
    assert.ok(strands.every((card) => card.area === card.title && card.yearLevel === "Junior DTECH"));
    assert.deepEqual(units.map((card) => [card.title, card.strand, card.area]), [
        ["Infrastructure & Networking", "digital-systems", "Digital systems"], ["Binary & Data", "digital-systems", "Digital systems"]]);
    assert.equal(units.find((card) => card.id === "infrastructure-and-networking").href, "", "Infrastructure & Networking stays display-only");
    assert.equal(units.find((card) => card.id === "binary-and-data").href, "/learning-pathways/binary-and-data.html",
        "Binary & Data opens its Unit Plan page");
    const unitPlan = fs.readFileSync(path.join(root, "learning-pathways/binary-and-data.html"), "utf8");
    const unitPlanIds = [...unitPlan.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(unitPlanIds).size, unitPlanIds.length, "Unit Plan IDs are unique");
    for (const anchor of unitPlan.matchAll(/href="#([^"]+)"/g)) assert.ok(unitPlanIds.includes(anchor[1]), "Unit Plan section links resolve");
    const unitJumpLinks = [...unitPlan.match(/<nav class="panel-section curriculum-jump-links"[\s\S]*?<\/nav>/)[0].matchAll(/href="#([^"]+)"/g)].map((match) => match[1]);
    assert.deepEqual(unitJumpLinks, [...unitPlan.matchAll(/<h2 id="([^"]+)"/g)].map((match) => match[1])
        .filter((id) => !["overview", "on-this-page"].includes(id)), "Unit Plan section pills follow page order");
    for (const heading of ["Context and Rationale", "Aims of Theme", "Contexts of Learning",
        "School Values in this Theme", "Practical Learning Sequence"]) {
        assert.ok(unitPlan.includes(`>${heading}</h2>`), `Unit Plan includes ${heading}`);
    }
    for (const removed of ["Curriculum Connections", "Evidence and Curriculum Coverage", "Resources and Equipment", "Health &amp; Safety", "Theme Evaluation"]) {
        assert.ok(!unitPlan.includes(`>${removed}</h2>`), `Unit Plan no longer includes ${removed}`);
    }
    assert.equal((unitPlan.match(/<li class="unit-step">/g) || []).length, 10, "All ten learning sequence activities are listed");
    assert.doesNotMatch(unitPlan, /unit-step-resources|Resources:/, "Sequence cards no longer list resources");
    assert.equal((unitPlan.match(/unit-status planned/g) || []).length, 2, "ASCII and Unicode stay labelled as planned");
    assert.match(unitPlan, /class="hero practical-skills-hero unit-plan-hero"/);
    assert.match(unitPlan, /href="\/learning-pathways\/digital-systems\.html"/);
    assert.deepEqual(lessons.map((card) => [card.sequence, card.title, card.status]), [
        [1, "Binary Piano", "active"], [2, "Encoding Binary", "active"], [3, "Decoding Binary", "active"],
        [4, "Representing Images", "active"], [5, "Text Compression", "active"], [6, "Parity Game", "active"],
        [7, "ASCII", "planning"], [8, "Unicode and te reo M\u0101ori", "planning"], [9, "Design a coded message", "active"],
        [10, "Consolidation", "active"]], "The ten Binary & Data activities are Lesson cards in sequence order");
    assert.ok(lessons.every((card) => card.unit === "binary-and-data" && card.yearLevel === "Junior DTECH" && card.area === "Digital systems"));
    const lessonLinks = [...unitPlan.matchAll(/class="unit-step-lesson-link" href="\/learning-pathways\/\?type=lesson#card-([^"]+)"/g)].map((match) => match[1]);
    assert.deepEqual(lessonLinks, lessons.map((card) => card.id), "Each sequence step links to its Lesson card");
    assert.deepEqual(lessons.filter((card) => card.href).map((card) => [card.id, card.href]),
        [["lesson-binary-piano", "/learning-pathways/lesson-binary-piano.html"]], "Only Binary Piano has a Lesson page so far");
    assert.match(unitPlan, /href="\/learning-pathways\/lesson-binary-piano\.html">Lesson plan</, "Unit Plan step 1 opens the Lesson page");
    const lessonPage = fs.readFileSync(path.join(root, "learning-pathways/lesson-binary-piano.html"), "utf8");
    const lessonIds = [...lessonPage.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(lessonIds).size, lessonIds.length, "Lesson page IDs are unique");
    const lessonJump = [...lessonPage.match(/<nav class="panel-section curriculum-jump-links"[\s\S]*?<\/nav>/)[0].matchAll(/href="#([^"]+)"/g)].map((match) => match[1]);
    assert.deepEqual(lessonJump, [...lessonPage.matchAll(/<h2 id="([^"]+)"/g)].map((match) => match[1])
        .filter((id) => !["overview", "on-this-page"].includes(id)), "Lesson page section pills follow page order");
    for (const heading of ["Lesson Aim", "Learning Objectives", "Teacher Preparation &amp; Resources", "60-Minute Lesson Sequence",
        "Practical Skill Check", "Teacher Guidance"]) assert.ok(lessonPage.includes(`>${heading}</h2>`), `Lesson page includes ${heading}`);
    assert.deepEqual([...lessonPage.matchAll(/<span class="lesson-time">([^<]+)</g)].map((match) => match[1]),
        ["0&ndash;10 min", "10&ndash;20 min", "20&ndash;40 min", "40&ndash;50 min", "50&ndash;60 min"], "Lesson timeline covers 60 minutes");
    assert.match(lessonPage, /class="hero practical-skills-hero lesson-plan-hero"/);
    assert.match(lessonPage, /href="\/learning-pathways\/\?type=lesson#card-lesson-binary-piano"/);
    assert.match(lessonPage, /href="\/learning-pathways\/binary-and-data\.html#learning-sequence"/);
    assert.throws(() => normalizeCards([{ ...sample, cardType: "task" }]), /invalid card type/);
    assert.deepEqual(normalizeCards([{ ...sample, cardType: "lesson", unit: "u", sequence: 3, strand: "x" }])[0],
        { ...normalizeCards([sample])[0], cardType: "lesson", unit: "u", sequence: 3 }, "Lessons keep a parent unit and sequence");
    assert.equal(normalizeCards([{ ...sample, unit: "u", sequence: 3 }])[0].unit, undefined, "Only lessons keep a parent unit");
    assert.equal(normalizeCards([{ ...sample, cardType: "lesson", sequence: "x" }])[0].sequence, undefined, "Invalid sequences are dropped");
    assert.deepEqual(normalizeCards([{ ...sample, cardType: "activity", lesson: "lesson-binary-piano", sequence: 2, unit: "x" }])[0],
        { ...normalizeCards([sample])[0], cardType: "activity", lesson: "lesson-binary-piano", sequence: 2 }, "Lesson Activities keep a parent lesson and sequence");
    assert.deepEqual(activities.map((card) => [card.id, card.lesson, card.sequence, card.href]), [["activity-build-your-binary-piano",
        "lesson-binary-piano", 1, "/learning-pathways/activity-build-your-binary-piano.html"]], "Binary Piano Activity 1 is the first Lesson Activity card");
    const activityPage = fs.readFileSync(path.join(root, "learning-pathways/activity-build-your-binary-piano.html"), "utf8");
    const activityIds = [...activityPage.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(activityIds).size, activityIds.length, "Activity page IDs are unique");
    for (const heading of ["Your Mission", "You Will Need", "Instructions", "Try It Out", "Finished?"]) {
        assert.ok(activityPage.includes(`>${heading}</h2>`), `Activity page includes ${heading}`);
    }
    assert.equal((activityPage.match(/<li>/g) || []).length, 4 + 7 + 5, "Activity page lists 4 materials, 7 steps and 5 place values");
    assert.match(activityPage, /Do not glue the moving tabs down!/);
    assert.match(activityPage, /Completion check:<\/strong> I have built a Binary Piano with working tabs\./);
    assert.match(activityPage, /class="hero practical-skills-hero activity-hero"/);
    assert.match(activityPage, /href="\/learning-pathways\/\?type=activity#card-activity-build-your-binary-piano"/);
    assert.match(activityPage, /href="\/learning-pathways\/lesson-binary-piano\.html"/);
    assert.match(lessonPage, /<\/div><a class="lesson-activity-pill" href="\/learning-pathways\/\?type=activity#card-activity-build-your-binary-piano">Activity card: Build Your Binary Piano<\/a><\/li>/,
        "The Practical phase shows a right-hand pill linking to its Activity card");
    assert.equal(normalizeCards([sample])[0].cardType, "strand", "Existing cards default to Curriculum Strands");
    assert.equal(normalizeCards([{ ...sample, strand: "x" }])[0].strand, undefined, "Only units keep a parent strand");
    assert.equal(seed.find((card) => card.id === "digital-systems").href, "/learning-pathways/digital-systems.html");
    const curriculumLinks = {
        "programming-and-algorithms": "/learning-pathways/programming-and-algorithms.html",
        "data": "/learning-pathways/data-and-information.html",
        "digital-citizenship": "/learning-pathways/digital-citizenship.html",
        "systems-and-control": "/learning-pathways/systems-and-control.html"
    };
    for (const card of strands.filter((card) => card.id !== "digital-systems")) {
        assert.equal(card.href, curriculumLinks[card.id]);
        const page = fs.readFileSync(path.join(root, ...card.href.slice(1).split("/")), "utf8");
        for (const heading of ["Overview", "Official Curriculum Strand", "Year 7 Knowledge and Practices",
            "Year 8 Knowledge and Practices", "Design, Make, and Innovate", "Progression Matrix", "Learning Contexts", "Teacher Notes"]) {
            assert.ok(page.includes(heading), `${card.id} includes ${heading}`);
        }
        assert.match(page, /scope="col">Year 7 Knowledge and Practices<\/th><th scope="col">Year 8 Knowledge and Practices/);
        assert.match(page, /Proposed curriculum/);
        assert.match(page, /paraphrased/);
        assert.match(page, /p\. 13/);
        assert.match(page, card.id === "systems-and-control" ? /p\. 16/ : /p\. 17/);
        assert.match(page, /<details class="curriculum-note">\s*<summary class="curriculum-note-toggle">Note<\/summary>\s*<aside class="curriculum-source-note"/,
            `${card.id} hides Source and status behind a Note button`);
        assert.doesNotMatch(page, /<details class="curriculum-note" open/, "The note starts collapsed");
        assert.match(page, /p\. 25/);
        if (card.id !== "digital-systems") assert.match(page, /Future activities - proposed, not yet added/);
        assert.match(page, /Possible evidence - teacher judgement required/);
        assert.match(page, /class="home-grid single-column curriculum-strand-page"/);
        assert.match(page, /href="styles\.css"/);
        assert.equal((page.match(/class="curriculum-table"/g) || []).length, 3, "Each page uses all three template tables");
        assert.equal((page.match(/class="curriculum-table-wrap" tabindex="0"/g) || []).length, 3);
        const ids = [...page.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
        assert.equal(new Set(ids).size, ids.length, "Page IDs are unique");
        for (const anchor of page.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(anchor[1]), "Section links resolve");
        for (const link of page.matchAll(/href="(\/learning-pathways\/[^"#?]+\.html)"/g)) {
            assert.ok(fs.existsSync(path.join(root, ...link[1].slice(1).split("/"))), "Related curriculum page links resolve");
        }
    }
    const curriculumPage = fs.readFileSync(path.join(root, "learning-pathways/digital-systems.html"), "utf8");
    for (const heading of ["Overview", "Official Curriculum Strand", "Year 7 Knowledge and Practices",
        "Year 8 Knowledge and Practices", "Design, Make, and Innovate", "Progression Matrix", "Learning Contexts"]) {
        assert.ok(curriculumPage.includes(heading), `Curriculum page includes ${heading}`);
    }
    assert.doesNotMatch(curriculumPage, /teacher-notes|<h2[^>]*>Teacher Notes</, "Digital Systems no longer has a Teacher Notes section");
    assert.match(curriculumPage, /scope="col">Year 7 Knowledge and Practices<\/th><th scope="col">Year 8 Knowledge and Practices/);
    assert.match(curriculumPage, /Proposed curriculum/);
    assert.match(curriculumPage, /paraphrased/);
    assert.match(curriculumPage, /p\. 17/);
    assert.match(curriculumPage, /p\. 13/);
    assert.match(curriculumPage, /href="\/practical-skills\/kit-worksheet\.html\?kit=kit-minecraft"/);
    for (const heading of ["Design, Make, and Innovate &mdash; Learning Opportunities", "Year 7 and Year 8 Curriculum Connections",
        "Connection to Digital Technology", "Responsible Design and Innovation"]) {
        assert.ok(curriculumPage.includes(heading), `Digital Systems learning contexts include ${heading}`);
    }
    assert.doesNotMatch(curriculumPage, /Future activities - proposed/, "Digital Systems uses the teacher-supplied learning contexts");
    assert.doesNotMatch(curriculumPage, /Teacher Planning Notes/, "Teacher Planning Notes were removed");
    const contexts = curriculumPage.match(/aria-labelledby="learning-contexts">[\s\S]*?<\/section>/)[0];
    assert.equal((contexts.match(/<article class="context-card/g) || []).length, 5, "Learning opportunities use readable cards");
    assert.match(contexts, /class="context-year-card"[\s\S]*class="context-year-card year-8"/);
    assert.match(contexts, /href="\/learning-pathways\/\?type=unit#card-infrastructure-and-networking"/);
    assert.match(curriculumPage, /aria-labelledby="overview">[\s\S]*?<\/section>\s*<nav class="panel-section curriculum-jump-links" aria-labelledby="on-this-page">[\s\S]*?<\/nav>\s*<section class="panel-section curriculum-pathway-aim" aria-labelledby="pathway-aim">/,
        "Section links sit in their own box between the Overview and the Pathway Aim");
    const jumpLinks = [...curriculumPage.match(/<nav class="panel-section curriculum-jump-links"[\s\S]*?<\/nav>/)[0].matchAll(/href="#([^"]+)"/g)].map((match) => match[1]);
    const sectionIds = [...curriculumPage.matchAll(/<h2 id="([^"]+)"/g)].map((match) => match[1]).filter((id) => !["overview", "on-this-page"].includes(id));
    assert.deepEqual(jumpLinks, sectionIds, "Section link pills list every section in page order");
    assert.match(curriculumPage, /<h3>Skills Developed<\/h3>/);
    assert.match(curriculumPage, /aria-labelledby="school-values">[\s\S]*?<\/section>\s*<section class="panel-section" aria-labelledby="learning-contexts">/,
        "School Values comes directly before Learning Contexts");
    for (const value of ["Whanaungatanga", "Rangatiratanga", "Manaakitanga", "Kaitiakitanga"]) assert.ok(curriculumPage.includes(`<dt>${value} &mdash;`));
    assert.match(curriculumPage, /aria-labelledby="learning-contexts">[\s\S]*?<\/section>\s*<section class="panel-section curriculum-pathway-aim" aria-labelledby="health-safety">/,
        "Health & Safety follows Learning Contexts in the Aim colour scheme");
    assert.match(curriculumPage, /DTECH-HUB Health &amp; Safety module/);
    assert.match(curriculumPage, /aria-labelledby="health-safety">[\s\S]*?<\/section>\s*<section class="panel-section curriculum-coverage" aria-labelledby="curriculum-coverage">/,
        "Curriculum Coverage follows Health & Safety in its own shade");
    assert.match(curriculumPage, /aria-labelledby="curriculum-coverage">[\s\S]*?<\/section>\s*<section class="panel-section curriculum-pathway-aim" aria-labelledby="reporting-progression">/,
        "Reporting & Progression follows Curriculum Coverage in the Aim colour scheme");
    assert.match(curriculumPage, /aria-labelledby="reporting-progression">[\s\S]*?<\/section>\s*<section class="panel-section" aria-labelledby="progression">[\s\S]*?<\/section>\s*<\/main>/,
        "Progression Matrix sits directly under Reporting & Progression");
    const reporting = curriculumPage.match(/aria-labelledby="reporting-progression">[\s\S]*?<\/section>/)[0];
    assert.match(reporting, /<strong>Reference:<\/strong> <a href="#progression">Digital Systems Progression Matrix<\/a>/);
    assert.deepEqual([...reporting.matchAll(/<li>[\s\S]*?<strong>([^<]+)<\/strong>/g)].map((match) => match[1]),
        ["Emerging", "Developing", "Consolidating", "Proficient", "Exceeding"], "Progress Descriptors close the section");
    for (const unitId of ["binary-and-data", "infrastructure-and-networking"]) {
        assert.ok(seed.some((card) => card.id === unitId && card.cardType === "unit"), "Coverage links target existing Unit cards");
        assert.ok(curriculumPage.includes(`href="/learning-pathways/?type=unit#card-${unitId}"`), "Coverage links open the Unit card");
    }
    assert.equal((curriculumPage.match(/<ul class="curriculum-skills-list">[\s\S]*?<\/ul>/)[0].match(/<li>/g) || []).length, 9);
    assert.throws(() => normalizeCards(null), /cards array/);
    for (const href of ["javascript:alert(1)", "data:text/html,test", "//example.test", "/\\example.test"]) {
        assert.throws(() => normalizeCards([{ ...sample, href }]), /links/);
    }
    assert.throws(() => normalizeCards([sample, sample]), /Duplicate/);
    assert.throws(() => normalizeCards([{ ...sample, status: "unknown" }]), /invalid status/);
    assert.throws(() => normalizeCards([{ ...sample, title: "" }]), /requires/);
    assert.equal(normalizeCards([{ ...sample, href: "https://example.test/path" }])[0].href, "https://example.test/path");
    const existing = { ...sample, id: "digital-systems", title: "Existing edited systems", href: "/learning-pathways/custom-systems.html" };
    let stored = [existing, sample];
    let seedVersion = 0;
    const pool = { query: async (sql, params) => {
        assert.match(sql, /learning_pathways_library_store/, "Never writes the Licence Library table");
        if (sql.includes("INSERT INTO") && (stored === null || !sql.includes("DO NOTHING"))) {
            stored = JSON.parse(params[0]);
            seedVersion = 11;
        }
        if (sql.includes("seed_version < 1") && seedVersion < 1) {
            const starters = JSON.parse(params[0]);
            stored = [...stored, ...starters.filter((card) => !stored.some((old) => old.id === card.id))];
            seedVersion = 1;
        }
        if (sql.includes("seed_version < 2") && seedVersion < 2) {
            const hasOld = stored.some((card) => ["programming", "algorithms"].includes(card.id));
            const hasCombined = stored.some((card) => card.id === "programming-and-algorithms");
            stored = stored.filter((card) => !["programming", "algorithms"].includes(card.id));
            if (hasOld && !hasCombined) stored.push(...JSON.parse(params[0]));
            seedVersion = 2;
        }
        if (sql.includes("seed_version < 3") && seedVersion < 3) {
            stored = stored.map((card) => card.id === "data"
                ? { ...card, title: "Data and Information", area: "Data and Information" } : card);
            seedVersion = 3;
        }
        if (sql.includes("seed_version < 4") && seedVersion < 4) {
            stored = stored.filter((card) => card.id !== "design-and-innovation");
            seedVersion = 4;
        }
        if (sql.includes("seed_version < 5") && seedVersion < 5) {
            assert.match(sql, /COALESCE\(existing\.card ->> 'href', ''\) = ''/, "Migration only links blank cards");
            stored = stored.map((card) => card.id === "digital-systems" && !card.href
                ? { ...card, href: "/learning-pathways/digital-systems.html" } : card);
            seedVersion = 5;
        }
        if (sql.includes("seed_version < 6") && seedVersion < 6) {
            assert.match(sql, /COALESCE\(existing\.card ->> 'href', ''\) = ''/);
            assert.match(sql, /ORDER BY existing\.position/);
            const links = JSON.parse(params[0]);
            assert.deepEqual(links, curriculumLinks, "Migration targets exactly the other four curriculum cards");
            stored = stored.map((card) => links[card.id] && !card.href ? { ...card, href: links[card.id] } : card);
            seedVersion = 6;
        }
        if (sql.includes("seed_version < 7") && seedVersion < 7) {
            const added = JSON.parse(params[0]);
            assert.ok(added.length && added.every((card) => card.cardType === "unit"), "Version 7 only adds unit cards");
            stored = [...stored, ...added.filter((card) => !stored.some((old) => old.id === card.id))];
            seedVersion = 7;
        }
        if (sql.includes("seed_version < 8") && seedVersion < 8) {
            assert.match(sql, /COALESCE\(existing\.card ->> 'href', ''\) = ''/, "Version 8 only links a blank Binary & Data card");
            stored = stored.map((card) => card.id === "binary-and-data" && !card.href
                ? { ...card, href: "/learning-pathways/binary-and-data.html" } : card);
            seedVersion = 8;
        }
        if (sql.includes("seed_version < 9") && seedVersion < 9) {
            const added = JSON.parse(params[0]);
            assert.ok(added.length === 10 && added.every((card) => card.cardType === "lesson"), "Version 9 only adds lesson cards");
            stored = [...stored, ...added.filter((card) => !stored.some((old) => old.id === card.id))];
            seedVersion = 9;
        }
        if (sql.includes("seed_version < 10") && seedVersion < 10) {
            assert.match(sql, /COALESCE\(existing\.card ->> 'href', ''\) = ''/, "Version 10 only links a blank Binary Piano card");
            stored = stored.map((card) => card.id === "lesson-binary-piano" && !card.href
                ? { ...card, href: "/learning-pathways/lesson-binary-piano.html" } : card);
            seedVersion = 10;
        }
        if (sql.includes("seed_version < 11") && seedVersion < 11) {
            const added = JSON.parse(params[0]);
            assert.ok(added.length && added.every((card) => card.cardType === "activity"), "Version 11 only adds Lesson Activity cards");
            stored = [...stored, ...added.filter((card) => !stored.some((old) => old.id === card.id))];
            seedVersion = 11;
        }
        return { rows: sql.startsWith("SELECT") && stored !== null ? [{ cards: stored }] : [] };
    } };
    const app = express();
    app.use(express.json());
    const auth = (req, res, next) => req.headers["x-test-admin"] === "yes" ? next() : res.status(403).json({ error: "Admin required" });
    registerLearningPathways(app, { pool, hasDatabase: true, requireAdminAccess: auth });
    const server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
        let response = await fetch(`${base}/learning-pathways/library.json`);
        assert.match(response.headers.get("cache-control"), /no-store/);
        const migrated = await response.json();
        assert.equal(migrated.length, 19, "One-time preload preserves existing custom cards");
        assert.equal(migrated.find((card) => card.id === "digital-systems").title, "Existing edited systems",
            "Preload does not overwrite existing cards with the same ID");
        assert.equal(migrated.filter((card) => card.id === "digital-systems").length, 1);
        assert.equal((await (await fetch(`${base}/learning-pathways/library.json`)).json()).length, 19,
            "Repeated reads do not duplicate starter cards");
        stored = [existing, sample, { ...sample, id: "programming" }, { ...sample, id: "algorithms" }];
        seedVersion = 1;
        const merged = await (await fetch(`${base}/learning-pathways/library.json`)).json();
        assert.equal(merged.length, 16);
        assert.deepEqual(merged.slice(0, 2), normalizeCards([existing, sample]), "Unrelated cards remain unchanged");
        assert.equal(merged[2].title, "Programming & Algorithms");
        assert.match(merged[2].summary, /algorithms.*debug.*test and improve/);
        assert.equal(merged[2].href, curriculumLinks["programming-and-algorithms"]);
        stored = [existing, { ...seed.find((card) => card.id === "programming-and-algorithms"), title: "Edited combined card" },
            { ...sample, id: "programming" }, { ...sample, id: "algorithms" }];
        seedVersion = 1;
        const preserved = await (await fetch(`${base}/learning-pathways/library.json`)).json();
        assert.equal(preserved.length, 15);
        assert.equal(preserved[1].title, "Edited combined card", "Existing combined edits are preserved");
        const oldData = { ...sample, id: "data", title: "Data", area: "Data" };
        stored = [sample, oldData];
        seedVersion = 2;
        const renamed = await (await fetch(`${base}/learning-pathways/library.json`)).json();
        assert.deepEqual(renamed, plusUnits([sample, { ...oldData, title: "Data and Information", area: "Data and Information" }]),
            "Rename changes only Data heading and category, preserving description and other cards");
        stored = [existing, { ...sample, id: "design-and-innovation", title: "Design and innovation" }, sample];
        seedVersion = 3;
        const removed = await (await fetch(`${base}/learning-pathways/library.json`)).json();
        assert.deepEqual(removed, plusUnits([existing, sample]), "Remove only Design and Innovation, preserving other cards and order");
        assert.deepEqual(await (await fetch(`${base}/learning-pathways/library.json`)).json(), removed,
            "Removed card stays removed after repeated reads");
        const unlinkedSystems = { ...existing, href: "" };
        stored = [sample, unlinkedSystems];
        seedVersion = 4;
        const linked = await (await fetch(`${base}/learning-pathways/library.json`)).json();
        assert.deepEqual(linked, plusUnits([sample, { ...unlinkedSystems, href: "/learning-pathways/digital-systems.html" }]),
            "Curriculum page migration changes only blank Digital Systems link, preserving fields and order");
        stored = [existing, sample];
        seedVersion = 4;
        assert.deepEqual(await (await fetch(`${base}/learning-pathways/library.json`)).json(), plusUnits(stored),
            "Existing custom Digital Systems link is preserved");
        stored = [];
        seedVersion = 4;
        assert.deepEqual(await (await fetch(`${base}/learning-pathways/library.json`)).json(), plusUnits([]),
            "New page does not restore deleted curriculum cards");
        stored = [unlinkedSystems];
        seedVersion = 5;
        assert.equal((await (await fetch(`${base}/learning-pathways/library.json`)).json())[0].href, "",
            "Later removal of the link is not undone");
        const unlinkedCurriculum = strands.filter((card) => card.id !== "digital-systems")
            .map((card) => ({ ...card, href: "", title: `Edited ${card.title}` }));
        stored = [sample, unlinkedSystems, ...unlinkedCurriculum];
        seedVersion = 5;
        const allLinked = await (await fetch(`${base}/learning-pathways/library.json`)).json();
        assert.deepEqual(allLinked, plusUnits([sample, unlinkedSystems,
            ...unlinkedCurriculum.map((card) => ({ ...card, href: curriculumLinks[card.id] }))]),
            "Version 6 links all four blank cards, preserves edits/order, and does not reapply Digital Systems migration");
        assert.deepEqual(await (await fetch(`${base}/learning-pathways/library.json`)).json(), allLinked);
        stored = unlinkedCurriculum.map((card) => ({ ...card, href: "/learning-pathways/custom-systems.html" }));
        seedVersion = 5;
        assert.deepEqual(await (await fetch(`${base}/learning-pathways/library.json`)).json(), plusUnits(stored),
            "Custom links on all four cards are preserved");
        stored = [];
        seedVersion = 5;
        assert.deepEqual(await (await fetch(`${base}/learning-pathways/library.json`)).json(), plusUnits([]),
            "Version 6 does not restore deleted cards");
        stored = unlinkedCurriculum;
        seedVersion = 6;
        assert.deepEqual(await (await fetch(`${base}/learning-pathways/library.json`)).json(), plusUnits(unlinkedCurriculum),
            "Later published link removals are not undone");
        stored = [sample];
        seedVersion = 7;
        assert.deepEqual(await (await fetch(`${base}/learning-pathways/library.json`)).json(), plusLessons([sample]),
            "Version 7 does not restore deleted unit cards");
        stored = [sample, { ...lessons[0], title: "Edited lesson" }];
        seedVersion = 8;
        const lessonMigrated = await (await fetch(`${base}/learning-pathways/library.json`)).json();
        assert.deepEqual(lessonMigrated, plusLessons(stored), "Version 9 adds missing lessons, keeping edits and not duplicating");
        assert.equal(lessonMigrated.filter((card) => card.id === lessons[0].id).length, 1);
        stored = [sample];
        seedVersion = 9;
        assert.deepEqual(await (await fetch(`${base}/learning-pathways/library.json`)).json(), plusActivities([sample]),
            "Version 9 does not restore deleted lesson cards");
        stored = [sample, { ...activities[0], title: "Edited activity" }];
        seedVersion = 10;
        const activityMigrated = await (await fetch(`${base}/learning-pathways/library.json`)).json();
        assert.deepEqual(activityMigrated, normalizeCards(stored), "Version 11 keeps an edited activity and does not duplicate it");
        stored = [sample];
        seedVersion = 10;
        assert.deepEqual(await (await fetch(`${base}/learning-pathways/library.json`)).json(), plusActivities([sample]), "Version 11 adds missing activities");
        stored = [sample];
        seedVersion = 11;
        assert.deepEqual(await (await fetch(`${base}/learning-pathways/library.json`)).json(), normalizeCards([sample]),
            "Version 11 does not restore deleted activity cards");
        const blankPiano = { ...lessons[0], href: "", title: "Edited piano" };
        stored = [sample, blankPiano];
        seedVersion = 9;
        assert.deepEqual(await (await fetch(`${base}/learning-pathways/library.json`)).json(),
            plusActivities([sample, { ...blankPiano, href: "/learning-pathways/lesson-binary-piano.html" }]),
            "Version 10 links the blank Binary Piano card, keeping edits and order");
        stored = [{ ...blankPiano, href: "/learning-pathways/custom.html" }];
        seedVersion = 9;
        assert.equal((await (await fetch(`${base}/learning-pathways/library.json`)).json())[0].href, "/learning-pathways/custom.html",
            "Version 10 preserves a custom Binary Piano link");
        stored = [blankPiano];
        seedVersion = 10;
        assert.equal((await (await fetch(`${base}/learning-pathways/library.json`)).json())[0].href, "", "Later lesson link removal is not undone");
        stored = [sample, { ...units[0], title: "Edited unit" }];
        seedVersion = 6;
        const unitMigrated = await (await fetch(`${base}/learning-pathways/library.json`)).json();
        assert.deepEqual(unitMigrated.slice(0, 3).map((card) => card.title), [sample.title, "Edited unit", "Binary & Data"],
            "Unit migration keeps edits and does not duplicate units");
        const blankBinary = { ...units.find((card) => card.id === "binary-and-data"), href: "", title: "Edited binary" };
        stored = [sample, blankBinary];
        seedVersion = 7;
        assert.deepEqual(await (await fetch(`${base}/learning-pathways/library.json`)).json(),
            plusLessons([sample, { ...blankBinary, href: "/learning-pathways/binary-and-data.html" }]),
            "Version 8 links the blank Binary & Data card, keeping edits and order");
        stored = [{ ...blankBinary, href: "/learning-pathways/custom.html" }];
        seedVersion = 7;
        assert.equal((await (await fetch(`${base}/learning-pathways/library.json`)).json())[0].href, "/learning-pathways/custom.html",
            "Version 8 preserves a custom Binary & Data link");
        stored = [blankBinary];
        seedVersion = 8;
        assert.equal((await (await fetch(`${base}/learning-pathways/library.json`)).json())[0].href, "",
            "Later link removal is not undone");
        assert.equal((await fetch(`${base}/api/admin/learning-pathways/library`)).status, 403);
        const publish = (cards, admin = true) => fetch(`${base}/api/admin/learning-pathways/library`, {
            method: "PUT", headers: { "Content-Type": "application/json", "x-test-admin": admin ? "yes" : "no" },
            body: JSON.stringify({ cards })
        });
        assert.equal((await publish([sample], false)).status, 403);
        assert.equal((await publish([{ ...sample, href: "javascript:test" }])).status, 400);
        assert.equal((await publish([sample])).status, 200);
        response = await fetch(`${base}/api/learning-pathways/library`);
        assert.equal((await response.json())[0].title, sample.title);
        // A newly registered app represents a restart, reading the same durable store.
        const restarted = express();
        const routes = {};
        restarted.get = (url, ...handlers) => { routes[url] = handlers.at(-1); };
        registerLearningPathways(restarted, { pool, hasDatabase: true, requireAdminAccess: auth });
        let result;
        await routes["/learning-pathways/library.json"]({}, { set() {}, json(value) { result = value; } });
        assert.equal(result[0].title, sample.title, "Published cards survive a fresh app registration");
        await publish([]);
        await routes["/learning-pathways/library.json"]({}, { set() {}, json(value) { result = value; } });
        assert.deepEqual(result, [], "Published empty library stays empty after restart");
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
    await testEditor();
    await testDashboard();
    const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
    assert.ok(serverSource.indexOf('require("./learning-pathways/library-store")') < serverSource.indexOf("app.use(express.static(__dirname))"));
    console.log("Learning Pathways library, persistence, editor and dashboard regressions passed.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
