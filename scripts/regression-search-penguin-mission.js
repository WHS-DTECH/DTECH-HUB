"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
const builderSource = fs.readFileSync(path.join(root, "practical-skills", "admin-kits.js"), "utf8");
const activityEditorSource = fs.readFileSync(path.join(root, "practical-skills", "admin-kit-activity.js"), "utf8");
const renderSource = fs.readFileSync(path.join(root, "practical-skills", "kit-worksheet-render.js"), "utf8");
const penguinImage = path.join(root, "practical-skills", "images", "little-blue-penguin.jpg");

const migrationStart = serverSource.indexOf("function addSearchKitPenguinMission(content) {");
const migrationEnd = serverSource.indexOf("\nfunction normalizePracticalSkillsKitContentForStorage(", migrationStart);
assert.ok(migrationStart >= 0 && migrationEnd > migrationStart, "Search Kit content migration exists");
const context = vm.createContext({});
vm.runInContext(serverSource.slice(migrationStart, migrationEnd), context);

const original = {
    bannerTitle: "Search Kit",
    worksheets: [{ number: 1, activity: "Search Like a Pro" }, { number: 2, activity: "Other activity" }],
    _contentMigrations: { searchPenguinMission: 1 },
    activities: [
        {
            title: "Search Like a Pro",
            information: { title: "Mission 1: Find Google", paragraphs: ["Open Google Search in a new tab."] },
            questions: [
                { id: "google-check", type: "checklist", prompt: "Find Google", options: ["I have opened Google."] },
                { id: "keywords", type: "short-answer", prompt: "What keywords could help find an answer?" }
            ],
            images: [{ url: "/practical-skills/images/little-blue-penguin.svg", caption: "New Zealand's little blue penguin" }]
        },
        { title: "Other activity", questions: [{ id: "other-q", type: "short-answer", prompt: "Unchanged" }] }
    ]
};

const migrated = context.addSearchKitPenguinMission(original);
assert.equal(migrated.worksheets[0].activity, "Search Like a Pro", "Existing activity title is preserved");
assert.equal(migrated.activities[0].information.title, "Mission 1: The Penguin Mystery");
assert.match(migrated.activities[0].information.paragraphs[0], /search engine of your choice/i);
assert.match(migrated.activities[0].information.paragraphs[0], /Bing or another search engine is fine/i);
assert.equal(migrated.activities[0].questions.some((question) => question.id === "google-check"), false, "Google-open confirmation is removed");
assert.equal(migrated.activities[0].questions.some((question) => question.id === "keywords"), true, "Other search-learning questions are retained");
const penguinQuestion = migrated.activities[0].questions.find((question) => question.id === "search-penguin-name");
assert.ok(penguinQuestion, "Penguin search question is added");
assert.match(penguinQuestion.prompt, /another name for New Zealand's little blue penguin/i);
const photo = migrated.activities[0].images.find((image) => image.url === "/practical-skills/images/little-blue-penguin.jpg");
assert.ok(photo, "Openly licensed local penguin photo replaces the illustration");
assert.equal(photo.attribution, "Shaun Lee");
assert.equal(photo.license, "CC BY 4.0");
assert.equal(photo.sourceUrl, "https://commons.wikimedia.org/wiki/File:Eudyptula_minor,_Auckland,_New_Zealand_imported_from_iNaturalist_photo_430247598.jpg");
assert.equal(photo.licenseUrl, "https://creativecommons.org/licenses/by/4.0/");
assert.equal(migrated.activities[0].images.some((image) => image.url.endsWith(".svg")), false, "Old illustration is removed");
assert.equal(migrated.activities[1], original.activities[1], "Other activity content is untouched");
assert.equal(migrated._contentMigrations.searchPenguinMission, 2, "Migration marker records the photo and attribution update");
assert.equal(context.addSearchKitPenguinMission(migrated), migrated, "Migration is idempotent");
assert.ok(fs.existsSync(penguinImage), "Penguin illustration asset exists");

assert.match(renderSource, /content\?\.information/, "Student worksheet renders the mission information heading");
assert.match(renderSource, /images\.map\(\(image\)/, "Student worksheet renders the penguin image");
const renderContext = vm.createContext({
    window: { clearTimeout() {}, setTimeout() {} },
    URL
});
vm.runInContext(renderSource, renderContext);
const imageHost = {
    style: { setProperty() {} },
    innerHTML: "",
    querySelectorAll() { return []; },
    querySelector() { return null; }
};
renderContext.window.KitWorksheetRender.renderWorksheet(imageHost, {
    bannerTitle: "Search Like a Pro",
    images: [photo]
}, { readOnly: true });
assert.match(imageHost.innerHTML, /Photo: Shaun Lee/);
assert.match(imageHost.innerHTML, /href="https:\/\/commons\.wikimedia\.org\/wiki\/File:/, "Photo credit links to its source");
assert.match(imageHost.innerHTML, /href="https:\/\/creativecommons\.org\/licenses\/by\/4\.0\/"/, "Photo credit links to the CC BY 4.0 license");
assert.match(imageHost.innerHTML, /little-blue-penguin\.jpg/);
assert.match(builderSource, /\.\.\.\(state\.content \|\| \{\}\)/, "Kit Builder retains the migration marker when saving");
assert.match(serverSource, /UPDATE practical_skills_kit_content SET content = \$1::jsonb, updated_at = NOW\(\) WHERE kit_id = \$2/, "Migrated mission is persisted for existing saved kits");
assert.match(serverSource, /if \(safeKitId === "kit-google-search"\) \{\s*const migrated = addSearchKitPenguinMission\(merged\);/, "Migration applies to existing Search Kit content");
assert.match(serverSource, /if \(content\?\._contentMigrations\?\.searchPenguinMission >= 2\) return content;/, "Saved migration marker prevents rebuilding a teacher-edited mission");
assert.match(activityEditorSource, /\.\.\.\(content\.activities\?\.\[activityIndex\]\?\.images\?\.\[index\] \|\| \{\}\)/, "Activity Details preserves photo attribution metadata while editing images");

console.log("Search Kit penguin mission migration regression checks passed.");
