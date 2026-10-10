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
const worksheetCss = fs.readFileSync(path.join(root, "practical-skills", "kit-worksheet.css"), "utf8");
const penguinImage = path.join(root, "practical-skills", "images", "little-blue-penguin.jpg");
const ruapehuImage = path.join(root, "practical-skills", "images", "mount-ruapehu.jpg");
const aorakiImage = path.join(root, "practical-skills", "images", "aoraki-mount-cook.jpg");
const taranakiImage = path.join(root, "practical-skills", "images", "mount-taranaki.jpg");

const migrationStart = serverSource.indexOf("function addSearchKitPenguinMission(content) {");
const migrationEnd = serverSource.indexOf("\nfunction normalizePracticalSkillsKitContentForStorage(", migrationStart);
assert.ok(migrationStart >= 0 && migrationEnd > migrationStart, "Search Kit content migration exists");
const context = vm.createContext({});
vm.runInContext(serverSource.slice(migrationStart, migrationEnd), context);

const original = {
    bannerTitle: "Search Kit",
    worksheets: [{ number: 1, activity: "Search Like a Pro" }, { number: 2, activity: "Other activity" }],
    _contentMigrations: { searchPenguinMission: 3 },
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
const missionTwo = migrated.activities[0].questions.find((question) => question.id === "search-korora-food-search");
assert.ok(missionTwo, "Mission 2 question is added");
assert.equal(missionTwo.heading, "Mission 2: Choose your own search words");
assert.equal(missionTwo.prompt, "Now find out what a kororā eats. Which search would help you find the answer?");
assert.equal(missionTwo.type, "multiple-choice");
assert.deepEqual(Array.from(missionTwo.options), ["kororā food", "penguin colours", "birds in New Zealand"]);
const missionThree = migrated.activities[0].questions.find((question) => question.id === "search-tallest-mountain");
assert.ok(missionThree, "Mission 3 question is added");
assert.equal(missionThree.heading, "Mission 3: Search independently");
assert.equal(missionThree.prompt, "Find the name of New Zealand's tallest mountain. What did you find?");
assert.deepEqual(Array.from(missionThree.options), ["Mount Ruapehu", "Aoraki / Mount Cook", "Mount Taranaki"]);
assert.equal(missionThree.images.length, 3, "Mission 3 includes photos of all three mountains");
assert.equal(missionThree.images[0].attribution, "Geoff McKay");
assert.equal(missionThree.images[0].license, "CC BY 2.0");
assert.equal(missionThree.images[1].attribution, "Michal Klajban");
assert.equal(missionThree.images[1].license, "CC BY-SA 4.0");
assert.equal(missionThree.images[2].attribution, "Michal Klajban");
assert.equal(missionThree.images[2].license, "CC BY-SA 4.0");
const savedMissionThree = JSON.parse(JSON.stringify(migrated));
savedMissionThree._contentMigrations.searchPenguinMission = 5;
savedMissionThree.activities[0].questions.find((question) => question.id === "search-tallest-mountain").options.pop();
savedMissionThree.activities[0].questions.find((question) => question.id === "search-tallest-mountain").images.pop();
const upgradedSavedKit = context.addSearchKitPenguinMission(savedMissionThree);
const upgradedMissionThree = upgradedSavedKit.activities[0].questions.find((question) => question.id === "search-tallest-mountain");
assert.ok(upgradedMissionThree.options.includes("Mount Taranaki"), "Existing saved Mission 3 gains the Taranaki option");
assert.ok(upgradedMissionThree.images.some((image) => image.url === "/practical-skills/images/mount-taranaki.jpg"), "Existing saved Mission 3 gains the Taranaki image");
assert.equal(upgradedSavedKit._contentMigrations.searchPenguinMission, 6, "Migration marker records the Taranaki update");
const photo = migrated.activities[0].images.find((image) => image.url === "/practical-skills/images/little-blue-penguin.jpg");
assert.ok(photo, "Openly licensed local penguin photo replaces the illustration");
assert.equal(photo.attribution, "Duncan Wright");
assert.equal(photo.license, "CC BY-SA 3.0");
assert.equal(photo.sourceUrl, "https://commons.wikimedia.org/wiki/File:Blue_Penguin_Kapiti.jpg");
assert.equal(photo.licenseUrl, "https://creativecommons.org/licenses/by-sa/3.0/");
assert.equal(migrated.activities[0].images.some((image) => image.url.endsWith(".svg")), false, "Old illustration is removed");
assert.equal(migrated.activities[1], original.activities[1], "Other activity content is untouched");
assert.equal(migrated._contentMigrations.searchPenguinMission, 6, "Migration marker records the Taranaki update");
assert.equal(context.addSearchKitPenguinMission(migrated), migrated, "Migration is idempotent");
assert.ok(fs.existsSync(penguinImage), "Penguin illustration asset exists");
assert.ok(fs.existsSync(ruapehuImage), "Ruapehu photo is stored locally");
assert.ok(fs.existsSync(aorakiImage), "Aoraki / Mount Cook photo is stored locally");
assert.ok(fs.existsSync(taranakiImage), "Taranaki photo is stored locally");

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
    information: { title: "Mission 1: The Penguin Mystery", paragraphs: ["Find another name for the little blue penguin."] },
    images: [photo],
    questions: [missionTwo, missionThree]
}, { readOnly: true });
assert.match(imageHost.innerHTML, /Photo: Duncan Wright/);
assert.match(imageHost.innerHTML, /href="https:\/\/commons\.wikimedia\.org\/wiki\/File:Blue_Penguin_Kapiti\.jpg"/, "Photo credit links to its source");
assert.match(imageHost.innerHTML, /href="https:\/\/creativecommons\.org\/licenses\/by-sa\/3\.0\/"/, "Photo credit links to the CC BY-SA 3.0 license");
assert.match(imageHost.innerHTML, /little-blue-penguin\.jpg/);
assert.match(imageHost.innerHTML, /Mission 2: Choose your own search words/);
assert.match(imageHost.innerHTML, /Now find out what a kororā eats\. Which search would help you find the answer\?/);
for (const option of missionTwo.options) assert.ok(imageHost.innerHTML.includes(option), `Mission 2 includes ${option}`);
assert.match(imageHost.innerHTML, /Mission 3: Search independently/);
assert.match(imageHost.innerHTML, /Find the name of New Zealand&#039;s tallest mountain\. What did you find\?/);
assert.match(imageHost.innerHTML, /mount-ruapehu\.jpg/);
assert.match(imageHost.innerHTML, /aoraki-mount-cook\.jpg/);
assert.match(imageHost.innerHTML, /mount-taranaki\.jpg/);
assert.match(imageHost.innerHTML, /Photo: Geoff McKay/);
assert.equal((imageHost.innerHTML.match(/Photo: Michal Klajban/g) || []).length, 2);
assert.match(imageHost.innerHTML, /href="https:\/\/commons\.wikimedia\.org\/wiki\/File:Mount_Taranaki,_New_Zealand_\(03\)\.JPG"/);
assert.match(imageHost.innerHTML, /href="https:\/\/creativecommons\.org\/licenses\/by\/2\.0\/"/);
assert.match(imageHost.innerHTML, /href="https:\/\/creativecommons\.org\/licenses\/by-sa\/4\.0\/"/);
assert.match(imageHost.innerHTML, /class="worksheet-question-images">[\s\S]*mount-ruapehu\.jpg[\s\S]*aoraki-mount-cook\.jpg[\s\S]*mount-taranaki\.jpg[\s\S]*class="worksheet-choices"/, "Mountain photos render with Mission 3 rather than in the activity image panel");
assert.match(worksheetCss, /\.worksheet-question-images\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/, "Three mountain photos are displayed in a responsive three-column grid");
assert.match(imageHost.innerHTML, /<div class="worksheet-image-information-layout">\s*<div class="worksheet-image-panel">[\s\S]*?<section class="worksheet-assessment-intro worksheet-identity-guide"/, "Penguin mission text is grouped beside its image");
assert.match(worksheetCss, /\.worksheet-image-information-layout\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*minmax\(140px,\s*220px\)\s+minmax\(0,\s*1fr\);/s, "Penguin image and mission use a side-by-side layout");
assert.match(worksheetCss, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.worksheet-image-information-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/, "Image and mission stack on narrow screens");
assert.match(builderSource, /\.\.\.\(state\.content \|\| \{\}\)/, "Kit Builder retains the migration marker when saving");
assert.match(serverSource, /UPDATE practical_skills_kit_content SET content = \$1::jsonb, updated_at = NOW\(\) WHERE kit_id = \$2/, "Migrated mission is persisted for existing saved kits");
assert.match(serverSource, /if \(safeKitId === "kit-google-search"\) \{\s*const migrated = addSearchKitPenguinMission\(merged\);/, "Migration applies to existing Search Kit content");
assert.match(serverSource, /if \(content\?\._contentMigrations\?\.searchPenguinMission >= 6\) return content;/, "Saved migration marker prevents rebuilding a teacher-edited mission");
assert.match(activityEditorSource, /\.\.\.\(content\.activities\?\.\[activityIndex\]\?\.images\?\.\[index\] \|\| \{\}\)/, "Activity Details preserves photo attribution metadata while editing images");

console.log("Search Kit penguin mission migration regression checks passed.");
