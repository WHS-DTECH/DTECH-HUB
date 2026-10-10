"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
const builderSource = fs.readFileSync(path.join(root, "practical-skills", "admin-kits.js"), "utf8");
const worksheetSource = fs.readFileSync(path.join(root, "practical-skills", "kit-worksheet.js"), "utf8");
const activityEditorSource = fs.readFileSync(path.join(root, "practical-skills", "admin-kit-activity.js"), "utf8");
const renderSource = fs.readFileSync(path.join(root, "practical-skills", "kit-worksheet-render.js"), "utf8");
const worksheetCss = fs.readFileSync(path.join(root, "practical-skills", "kit-worksheet.css"), "utf8");
const penguinImage = path.join(root, "practical-skills", "images", "little-blue-penguin.jpg");
const ruapehuImage = path.join(root, "practical-skills", "images", "mount-ruapehu.jpg");
const aorakiImage = path.join(root, "practical-skills", "images", "aoraki-mount-cook.jpg");
const taranakiImage = path.join(root, "practical-skills", "images", "mount-taranaki.jpg");
const pounamuImage = path.join(root, "practical-skills", "images", "pounamu-arahura-river.jpg");
const glowwormImage = path.join(root, "practical-skills", "images", "new-zealand-glowworm.jpg");

const migrationStart = serverSource.indexOf("function addSearchKitKeywordChallenge(content) {");
const migrationEnd = serverSource.indexOf("\nfunction normalizePracticalSkillsKitContentForStorage(", migrationStart);
assert.ok(migrationStart >= 0 && migrationEnd > migrationStart, "Search Kit content migration exists");
const context = vm.createContext({});
vm.runInContext(serverSource.slice(migrationStart, migrationEnd), context);
const gradeStart = serverSource.indexOf("const SEARCH_PENGUIN_MISSIONS_ID =");
const gradeEnd = serverSource.indexOf("\nconst { visibleActivityIndexes", gradeStart);
assert.ok(gradeStart >= 0 && gradeEnd > gradeStart, "Server-side Search Kit grader exists");
const gradeContext = vm.createContext({});
vm.runInContext(serverSource.slice(gradeStart, gradeEnd), gradeContext);

const original = {
    bannerTitle: "Search Kit",
    worksheets: [{ number: 1, activity: "Search Like a Pro", establishes: "Understands search engines and keywords" }, { number: 2, activity: "The Keyword Challenge" }],
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
        {
            title: "The Keyword Challenge",
            information: { title: "Old keyword intro", paragraphs: ["Old introduction"] },
            questions: [{ id: "other-q", type: "short-answer", prompt: "Unchanged" }]
        }
    ]
};

const migrated = context.addSearchKitPenguinMission(original);
assert.equal(migrated.worksheets[0].activity, "Search Like a Pro", "Existing activity title is preserved");
assert.equal(migrated.worksheets[0].establishes, "Uses a search engine to discover information");
assert.equal(migrated.activities[0].questionAutoMarkAssessmentId, "search-penguin-missions-v1", "Search mission activity enables server-checked auto-marking");
assert.equal(migrated.activities[0].information.title, "THE MISSION: The Penguin Mystery");
assert.deepEqual(Array.from(migrated.activities[0].information.paragraphs), [
    "Did you know that the world's smallest penguin lives right here on the West Coast of the South Island?",
    "Your mission is to investigate the Little Blue Penguin and discover more about its life on our coastline.",
    "Use a search engine of your choice to find the answers to the questions below. Google, Bing or another search engine will do!",
    "Can you solve the Penguin Mystery?"
]);
assert.equal(migrated.activities[1].information.title, "🔎 THE MISSION: The West Coast Treasure Hunt");
assert.equal(migrated.activities[1].questionAutoMarkAssessmentId, "search-keyword-challenge-v1", "Keyword Challenge uses server-checked auto-marking");
assert.deepEqual(Array.from(migrated.activities[1].information.paragraphs), [
    "You're on a treasure hunt across the West Coast!",
    "Your challenge is to choose the best search words to find clues about places, objects and wildlife.",
    "Sometimes your first search won't give you what you need. That's when clever searchers change their keywords!",
    "Can you solve all five clues?"
]);
const keywordChallengeQuestion = migrated.activities[1].questions[0];
assert.equal(keywordChallengeQuestion.id, "keyword-pounamu-treasure");
assert.equal(keywordChallengeQuestion.type, "multiple-choice");
assert.equal(keywordChallengeQuestion.heading, "Mission 1: Find the Treasure");
assert.equal(keywordChallengeQuestion.prompt, "You want to find out where pounamu can be found on the West Coast. Which search would be most useful?");
assert.deepEqual(Array.from(keywordChallengeQuestion.options), [
    "beautiful green rocks",
    "where to find pounamu West Coast NZ",
    "New Zealand beaches"
]);
assert.equal(Object.hasOwn(keywordChallengeQuestion, "correctAnswer"), false, "Keyword challenge answer is not exposed in student content");
assert.equal(keywordChallengeQuestion.images[0].url, "/practical-skills/images/pounamu-arahura-river.jpg");
assert.equal(keywordChallengeQuestion.images[0].attribution, "Daderot");
assert.equal(keywordChallengeQuestion.images[0].license, "CC0");
assert.equal(keywordChallengeQuestion.images[0].sourceUrl, "https://commons.wikimedia.org/wiki/File:Pounamu_(greenstone),_sourced_from_Arahura_River_-_Wellington_Museum_-_Wellington,_NZ_-_DSC00054.jpg");
assert.equal(keywordChallengeQuestion.images[0].licenseUrl, "https://creativecommons.org/publicdomain/zero/1.0/");
const keywordChallengeMissionTwo = migrated.activities[1].questions[1];
assert.equal(keywordChallengeMissionTwo.id, "keyword-too-many-results");
assert.equal(keywordChallengeMissionTwo.type, "multiple-choice");
assert.equal(keywordChallengeMissionTwo.heading, "Mission 2: Too Many Results!");
assert.equal(keywordChallengeMissionTwo.prompt, "You search for bridge but get results from all over the world. You actually want to find the historic swing bridge at Hokitika Gorge. Which search would help you narrow the results?");
assert.deepEqual(Array.from(keywordChallengeMissionTwo.options), [
    "bridge",
    "bridges New Zealand",
    "Hokitika Gorge swing bridge"
]);
const keywordChallengeMissionThree = migrated.activities[1].questions[2];
assert.equal(keywordChallengeMissionThree.id, "keyword-glowworm-mystery");
assert.equal(keywordChallengeMissionThree.type, "multiple-choice");
assert.equal(keywordChallengeMissionThree.heading, "Mission 3 – The Glowworm Mystery");
assert.equal(keywordChallengeMissionThree.prompt, "Your challenge: You've heard about the glowworms at Hokitika's Glow Worm Dell. You want to discover what glowworms eat. Which search would help you find the answer?");
assert.deepEqual(Array.from(keywordChallengeMissionThree.options), [
    "Hokitika glowworm photos",
    "New Zealand glowworm diet",
    "Hokitika Glow Worm Dell directions"
]);
assert.equal(keywordChallengeMissionThree.images[0].url, "/practical-skills/images/new-zealand-glowworm.jpg");
assert.equal(keywordChallengeMissionThree.images[0].attribution, "Jon Sullivan");
assert.equal(keywordChallengeMissionThree.images[0].license, "CC BY 4.0");
assert.equal(keywordChallengeMissionThree.images[0].sourceUrl, "https://commons.wikimedia.org/wiki/File:Arachnocampa_luminosa_2936220.jpg");
assert.equal(keywordChallengeMissionThree.images[0].licenseUrl, "https://creativecommons.org/licenses/by/4.0/");
const keywordChallengeMissionFour = migrated.activities[1].questions[3];
assert.equal(keywordChallengeMissionFour.id, "keyword-fix-the-search");
assert.equal(keywordChallengeMissionFour.type, "multiple-choice");
assert.equal(keywordChallengeMissionFour.heading, "Mission 4: Fix the Search");
assert.equal(keywordChallengeMissionFour.prompt, "Someone typed weather but wants to know whether it will rain in Hokitika tomorrow. Which words should they add?");
assert.deepEqual(Array.from(keywordChallengeMissionFour.options), [
    "Hokitika tomorrow",
    "sunshine",
    "New Zealand"
]);
const keywordChallengeMissionFive = migrated.activities[1].questions[4];
assert.equal(keywordChallengeMissionFive.id, "keyword-hokitika-founded");
assert.equal(keywordChallengeMissionFive.type, "short-answer");
assert.equal(keywordChallengeMissionFive.heading, "Mission 5: Your Turn – Find the Answer!");
assert.equal(keywordChallengeMissionFive.prompt, "Use a search engine to find out what year Hokitika was founded as a gold-mining settlement. What year did you find?");
assert.equal(keywordChallengeMissionFive.lines, 1);
assert.deepEqual(Array.from(migrated.activities[1].questions.slice(5), (question) => question.id), ["other-q"], "Existing Keyword Challenge questions are preserved");
assert.equal(migrated._contentMigrations.searchKeywordChallenge, 9, "Keyword Challenge migration is recorded");
const teacherEditedKeywordChallenge = JSON.parse(JSON.stringify(migrated));
teacherEditedKeywordChallenge._contentMigrations.searchKeywordChallenge = 1;
teacherEditedKeywordChallenge.activities[1].information = { title: "Teacher-edited title", paragraphs: ["Teacher-edited introduction"] };
teacherEditedKeywordChallenge.activities[1].questions = teacherEditedKeywordChallenge.activities[1].questions
    .filter((question) => question.id !== "keyword-pounamu-treasure");
const upgradedKeywordChallenge = context.addSearchKitKeywordChallenge(teacherEditedKeywordChallenge);
assert.deepEqual(upgradedKeywordChallenge.activities[1].information, {
    title: "Teacher-edited title",
    paragraphs: ["Teacher-edited introduction"]
}, "Keyword Challenge question migration preserves teacher-edited introduction");
assert.ok(upgradedKeywordChallenge.activities[1].questions.some((question) => question.id === "keyword-pounamu-treasure"), "Saved Keyword Challenge gains the pounamu mission");
const savedKitMissingKeywordActivity = {
    ...original,
    _contentMigrations: { searchPenguinMission: 11, searchKeywordChallenge: 1 },
    activities: original.activities.slice(0, 1)
};
const repairedKeywordKit = context.addSearchKitPenguinMission(savedKitMissingKeywordActivity);
assert.equal(repairedKeywordKit.activities[1].title, "The Keyword Challenge", "Migration creates the missing activity listed in worksheets");
assert.equal(repairedKeywordKit.activities[1].information.title, "🔎 THE MISSION: The West Coast Treasure Hunt");
assert.ok(repairedKeywordKit.activities[1].questions.some((question) => question.id === "keyword-pounamu-treasure"), "Missing activity is populated with the pounamu mission");
assert.ok(repairedKeywordKit.activities[1].questions.some((question) => question.id === "keyword-too-many-results"), "Missing activity includes Mission 2");
assert.ok(repairedKeywordKit.activities[1].questions.some((question) => question.id === "keyword-glowworm-mystery"), "Missing activity includes Mission 3");
assert.ok(repairedKeywordKit.activities[1].questions.some((question) => question.id === "keyword-fix-the-search"), "Missing activity includes Mission 4");
assert.ok(repairedKeywordKit.activities[1].questions.some((question) => question.id === "keyword-hokitika-founded"), "Missing activity includes Mission 5");
assert.equal(repairedKeywordKit._contentMigrations.searchKeywordChallenge, 9, "Repair migration is recorded for previously incomplete saved kits");
assert.equal(migrated.activities[0].questions.some((question) => question.id === "google-check"), false, "Google-open confirmation is removed");
assert.equal(migrated.activities[0].questions.some((question) => question.id === "keywords"), true, "Other search-learning questions are retained");
const penguinQuestion = migrated.activities[0].questions.find((question) => question.id === "search-penguin-name");
assert.ok(penguinQuestion, "Penguin search question is added");
assert.match(penguinQuestion.prompt, /^Mission 1: What is another name for New Zealand's little blue penguin\?$/i);
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
const missionFour = migrated.activities[0].questions.find((question) => question.id === "search-penguin-location");
assert.ok(missionFour, "Mission 4 question is added");
assert.equal(missionFour.type, "multiple-choice");
assert.equal(missionFour.heading, "Mission 4 – Penguins on the Coast");
assert.equal(missionFour.prompt, "Find out where Little Blue Penguins can be seen near Hokitika.");
assert.deepEqual(Array.from(missionFour.options), [
    "The West Coast Wildlife Centre in Franz Josef",
    "Hokitika Beach",
    "The Hokitika Gorge"
]);
assert.equal(Object.hasOwn(missionFour, "correctAnswer"), false, "Mission 4 is not automatically marked");
const missionFive = migrated.activities[0].questions.find((question) => question.id === "search-penguin-safety");
assert.ok(missionFive, "Mission 5 question is added");
assert.equal(missionFive.type, "multiple-choice");
assert.equal(missionFive.heading, "Mission 5 – Keeping Kororā Safe");
assert.equal(missionFive.prompt, "Little Blue Penguins face dangers along the West Coast. Which of these can harm them?");
assert.deepEqual(Array.from(missionFive.options), ["Uncontrolled dogs", "Native flax plants", "Rainbows"]);
assert.equal(Object.hasOwn(missionFive, "correctAnswer"), false, "Mission 5 is not automatically marked");
const correctMissionAnswers = {
    "search-penguin-name": "kororā",
    "search-korora-food-search": "kororā food",
    "search-tallest-mountain": "Aoraki / Mount Cook",
    "search-penguin-location": "Hokitika Beach",
    "search-penguin-safety": "Uncontrolled dogs"
};
const completeGrade = gradeContext.gradeSearchPenguinMissions(correctMissionAnswers);
assert.equal(completeGrade.passed, true, "All five correct answers pass the activity");
assert.equal(completeGrade.score, 5);
assert.equal(completeGrade.total, 5);
assert.equal(gradeContext.gradeSearchPenguinMissions({ ...correctMissionAnswers, "search-penguin-name": "korora" }).passed, true, "Macron-free korora is accepted");
const incorrectGrade = gradeContext.gradeSearchPenguinMissions({ ...correctMissionAnswers, "search-penguin-safety": "Rainbows" });
assert.equal(incorrectGrade.passed, false, "An incorrect answer prevents completion");
assert.equal(incorrectGrade.score, 4);
const correctKeywordAnswers = {
    "1-keyword-pounamu-treasure": "where to find pounamu West Coast NZ",
    "1-keyword-too-many-results": "Hokitika Gorge swing bridge",
    "1-keyword-glowworm-mystery": "New Zealand glowworm diet",
    "1-keyword-fix-the-search": "Hokitika tomorrow",
    "1-keyword-hokitika-founded": "1864"
};
const completeKeywordGrade = gradeContext.gradeSearchKeywordChallenge(correctKeywordAnswers, 1);
assert.equal(completeKeywordGrade.passed, true, "All five correct Keyword Challenge answers pass");
assert.equal(completeKeywordGrade.score, 5);
assert.equal(completeKeywordGrade.total, 5);
assert.equal(completeKeywordGrade.assessmentId, "search-keyword-challenge-v1");
const incorrectKeywordGrade = gradeContext.gradeSearchKeywordChallenge({
    ...correctKeywordAnswers,
    "1-keyword-hokitika-founded": "1865"
}, 1);
assert.equal(incorrectKeywordGrade.passed, false, "Incorrect Keyword Challenge answer prevents completion");
assert.equal(incorrectKeywordGrade.score, 4);
const savedContentBeforeMissionFour = JSON.parse(JSON.stringify(migrated));
savedContentBeforeMissionFour._contentMigrations.searchPenguinMission = 7;
savedContentBeforeMissionFour.activities[0].questions = savedContentBeforeMissionFour.activities[0].questions
    .filter((question) => question.id !== "search-penguin-location");
const savedContentWithMissionFour = context.addSearchKitPenguinMission(savedContentBeforeMissionFour);
assert.ok(savedContentWithMissionFour.activities[0].questions.some((question) => question.id === "search-penguin-location"), "Existing saved Search Kits gain Mission 4");
assert.equal(savedContentWithMissionFour._contentMigrations.searchPenguinMission, 11, "Migration marker records the latest Search Kit content");
const savedContentBeforeMissionFive = JSON.parse(JSON.stringify(migrated));
savedContentBeforeMissionFive._contentMigrations.searchPenguinMission = 9;
savedContentBeforeMissionFive.activities[0].questions = savedContentBeforeMissionFive.activities[0].questions
    .filter((question) => question.id !== "search-penguin-safety");
const savedContentWithMissionFive = context.addSearchKitPenguinMission(savedContentBeforeMissionFive);
assert.ok(savedContentWithMissionFive.activities[0].questions.some((question) => question.id === "search-penguin-safety"), "Existing saved Search Kits gain Mission 5");
assert.equal(savedContentWithMissionFive._contentMigrations.searchPenguinMission, 11, "Migration marker records latest Search Kit content");
const savedKitWithOldDescription = JSON.parse(JSON.stringify(migrated));
savedKitWithOldDescription._contentMigrations.searchPenguinMission = 9;
savedKitWithOldDescription.worksheets[0].establishes = "Understands search engines and keywords";
const savedKitWithUpdatedDescription = context.addSearchKitPenguinMission(savedKitWithOldDescription);
assert.equal(savedKitWithUpdatedDescription.worksheets[0].establishes, "Uses a search engine to discover information", "Existing saved Search Kits receive the new worksheet description");
const savedMissionThree = JSON.parse(JSON.stringify(migrated));
savedMissionThree._contentMigrations.searchPenguinMission = 5;
savedMissionThree.activities[0].questions.find((question) => question.id === "search-tallest-mountain").options.pop();
savedMissionThree.activities[0].questions.find((question) => question.id === "search-tallest-mountain").images.pop();
const upgradedSavedKit = context.addSearchKitPenguinMission(savedMissionThree);
const upgradedMissionThree = upgradedSavedKit.activities[0].questions.find((question) => question.id === "search-tallest-mountain");
assert.ok(upgradedMissionThree.options.includes("Mount Taranaki"), "Existing saved Mission 3 gains the Taranaki option");
assert.ok(upgradedMissionThree.images.some((image) => image.url === "/practical-skills/images/mount-taranaki.jpg"), "Existing saved Mission 3 gains the Taranaki image");
assert.equal(upgradedSavedKit._contentMigrations.searchPenguinMission, 11, "Migration marker records latest Search Kit content");
const photo = migrated.activities[0].images.find((image) => image.url === "/practical-skills/images/little-blue-penguin.jpg");
assert.ok(photo, "Openly licensed local penguin photo replaces the illustration");
assert.equal(photo.attribution, "Duncan Wright");
assert.equal(photo.license, "CC BY-SA 3.0");
assert.equal(photo.sourceUrl, "https://commons.wikimedia.org/wiki/File:Blue_Penguin_Kapiti.jpg");
assert.equal(photo.licenseUrl, "https://creativecommons.org/licenses/by-sa/3.0/");
assert.equal(migrated.activities[0].images.some((image) => image.url.endsWith(".svg")), false, "Old illustration is removed");
assert.equal(migrated.activities[1].title, original.activities[1].title, "Keyword Challenge title is preserved");
assert.deepEqual(Array.from(migrated.activities[1].questions.slice(5), (question) => question.id), ["other-q"], "Keyword Challenge questions are untouched");
assert.equal(migrated._contentMigrations.searchPenguinMission, 11, "Migration marker records latest Search Kit content");
assert.equal(context.addSearchKitPenguinMission(migrated), migrated, "Migration is idempotent");
assert.ok(fs.existsSync(penguinImage), "Penguin illustration asset exists");
assert.ok(fs.existsSync(ruapehuImage), "Ruapehu photo is stored locally");
assert.ok(fs.existsSync(aorakiImage), "Aoraki / Mount Cook photo is stored locally");
assert.ok(fs.existsSync(taranakiImage), "Taranaki photo is stored locally");
assert.ok(fs.existsSync(pounamuImage), "Pounamu photo is stored locally");
assert.ok(fs.existsSync(glowwormImage), "Glowworm photo is stored locally");

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
    information: { title: "THE MISSION: The Penguin Mystery", paragraphs: ["Can you solve the Penguin Mystery?"] },
    images: [photo],
    questions: [keywordChallengeQuestion, keywordChallengeMissionTwo, keywordChallengeMissionThree, keywordChallengeMissionFour, keywordChallengeMissionFive, missionTwo, missionThree, missionFour, missionFive]
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
assert.match(imageHost.innerHTML, /Mission 4 – Penguins on the Coast/);
assert.match(imageHost.innerHTML, /Mission 1: Find the Treasure/);
assert.match(imageHost.innerHTML, /where to find pounamu West Coast NZ/);
assert.match(imageHost.innerHTML, /pounamu-arahura-river\.jpg/);
assert.match(imageHost.innerHTML, /Mission 2: Too Many Results!/);
assert.match(imageHost.innerHTML, /Hokitika Gorge swing bridge/);
assert.match(imageHost.innerHTML, /Mission 3 – The Glowworm Mystery/);
assert.match(imageHost.innerHTML, /New Zealand glowworm diet/);
assert.match(imageHost.innerHTML, /new-zealand-glowworm\.jpg/);
assert.match(imageHost.innerHTML, /Mission 4: Fix the Search/);
assert.match(imageHost.innerHTML, /Hokitika tomorrow/);
assert.match(imageHost.innerHTML, /Mission 5: Your Turn – Find the Answer!/);
assert.match(imageHost.innerHTML, /What year did you find\?/);
assert.match(imageHost.innerHTML, /Find out where Little Blue Penguins can be seen near Hokitika\./);
for (const option of missionFour.options) assert.ok(imageHost.innerHTML.includes(option), `Mission 4 includes ${option}`);
assert.match(imageHost.innerHTML, /data-question-id="search-penguin-location"/, "Mission 4 choices are ordinary response buttons, not auto-marked answers");
assert.match(imageHost.innerHTML, /Mission 5 – Keeping Kororā Safe/);
assert.match(imageHost.innerHTML, /Little Blue Penguins face dangers along the West Coast\. Which of these can harm them\?/);
for (const option of missionFive.options) assert.ok(imageHost.innerHTML.includes(option), `Mission 5 includes ${option}`);
assert.match(imageHost.innerHTML, /data-question-id="search-penguin-safety"/, "Mission 5 choices are ordinary response buttons, not auto-marked answers");
assert.match(worksheetCss, /\.worksheet-question-images\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/, "Three mountain photos are displayed in a responsive three-column grid");
assert.match(imageHost.innerHTML, /<div class="worksheet-image-information-layout">\s*<div class="worksheet-image-panel">[\s\S]*?<section class="worksheet-assessment-intro worksheet-identity-guide"/, "Penguin mission text is grouped beside its image");
assert.match(worksheetCss, /\.worksheet-image-information-layout\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*minmax\(140px,\s*220px\)\s+minmax\(0,\s*1fr\);/s, "Penguin image and mission use a side-by-side layout");
assert.match(worksheetCss, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.worksheet-image-information-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/, "Image and mission stack on narrow screens");
assert.match(builderSource, /\.\.\.\(state\.content \|\| \{\}\)/, "Kit Builder retains the migration marker when saving");
assert.match(serverSource, /UPDATE practical_skills_kit_content SET content = \$1::jsonb, updated_at = NOW\(\) WHERE kit_id = \$2/, "Migrated mission is persisted for existing saved kits");
assert.match(serverSource, /if \(safeKitId === "kit-google-search"\) \{\s*const migrated = addSearchKitPenguinMission\(merged\);/, "Migration applies to existing Search Kit content");
assert.match(serverSource, /if \(content\?\._contentMigrations\?\.searchPenguinMission >= 11\) \{\s*return addSearchKitKeywordChallenge\(content\);\s*\}/, "Saved migration marker preserves existing missions while applying the Keyword Challenge update");
assert.match(serverSource, /!\["search-penguin-missions-v1", "search-keyword-challenge-v1"\]\.includes\(activity\?\.questionAutoMarkAssessmentId\)/, "Search Kit auto-marking activities are accepted by the server");
assert.match(serverSource, /activity\.questionAutoMarkAssessmentId === "search-keyword-challenge-v1"[\s\S]{0,100}gradeSearchKeywordChallenge\(req\.body\.answers, activityIndex\)/, "Keyword Challenge answers are graded server-side");
assert.match(serverSource, /grade\.assessmentId === "search-penguin-missions-v1" \|\|\s*grade\.assessmentId === "search-keyword-challenge-v1"/, "Keyword Challenge answers are merged into saved question responses");
assert.match(serverSource, /if \(req\.body\.completed && \(activity\?\.assessmentId \|\| activity\?\.identityLessonVersion \|\|\s*activity\?\.questionAutoMarkAssessmentId \|\| siteQuestions\)\)/, "Manual completion cannot bypass Search Kit auto-marking");
assert.match(worksheetSource, /function scheduleSearchActivityAutoMark\(activityIndex, assessmentId\)/, "Student worksheet automatically checks complete self-marked activity answers");
assert.match(worksheetSource, /scheduleSearchActivityAutoMark\(activityIndex, activity\.questionAutoMarkAssessmentId\)/, "Answer changes trigger automatic marking");
assert.match(worksheetSource, /if \(\["search-penguin-missions-v1", "search-keyword-challenge-v1"\]\.includes\(activity\?\.questionAutoMarkAssessmentId\)\) \{\s*scheduleSearchActivityAutoMark\(activityIndex, activity\.questionAutoMarkAssessmentId\);/, "Previously saved complete answers are auto-marked when the activity opens");
assert.match(worksheetSource, /"search-keyword-challenge-v1"[\s\S]*"keyword-pounamu-treasure"[\s\S]*"keyword-hokitika-founded"/, "Keyword Challenge auto-marking waits for all five mission answers");
assert.match(activityEditorSource, /\.\.\.\(content\.activities\?\.\[activityIndex\]\?\.images\?\.\[index\] \|\| \{\}\)/, "Activity Details preserves photo attribution metadata while editing images");

console.log("Search Kit penguin mission migration regression checks passed.");
