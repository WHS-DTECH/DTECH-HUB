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
const treeImage = path.join(root, "practical-skills", "images", "west-coast-tall-tree.jpg");
const glowwormImage = path.join(root, "practical-skills", "images", "new-zealand-glowworm.jpg");
const clockTowerImage = path.join(root, "practical-skills", "images", "hokitika-clock-tower.jpg");
const mountainBirdImage = path.join(root, "practical-skills", "images", "west-coast-mountain-bird.jpg");
const pancakeRocksImage = path.join(root, "practical-skills", "images", "punakaiki-pancake-rocks.jpg");
const glacierRecentImage = path.join(root, "practical-skills", "images", "franz-josef-glacier-2019.jpg");
const glacierHistoryImage = path.join(root, "practical-skills", "images", "franz-josef-glacier-1906.jpg");

const migrationStart = serverSource.indexOf("function addSearchResultsDetectiveIntroduction(content) {");
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
    worksheets: [
        { number: 1, activity: "Search Like a Pro", establishes: "Understands search engines and keywords" },
        { number: 2, activity: "The Keyword Challenge" },
        { number: 3, activity: "Finding the Right Result" },
        { number: 4, activity: "Search and Find!" }
    ],
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
        },
        {
            title: "Finding the Right Result",
            information: { title: "Old result intro", paragraphs: ["Old result instructions"] },
            questions: [{ id: "result-q", type: "short-answer", prompt: "Find a useful result" }]
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
assert.equal(migrated.activities[2].information.title, "THE MISSION: The Search Results Detective");
assert.deepEqual(Array.from(migrated.activities[2].information.paragraphs), [
    "You've found the right search words. Now it's time to choose the right results!",
    "Not every result will give you the information you're looking for.",
    "Look at the search results, follow the clues and find the information you need.",
    "Can you solve all five missions?"
]);
assert.equal(migrated.activities[3].title, "Search and Find!",
    "Migration creates the missing activity object for the Search and Find worksheet");
assert.equal(migrated.activities[3].information.title, "🔎 THE MISSION: The West Coast Mystery Trail");
assert.deepEqual(Array.from(migrated.activities[3].questions, (question) => question.id), [
    "search-find-giant-tree",
    "search-find-gold-rush-town",
    "search-find-mountain-bird",
    "search-find-pancake-rocks",
    "search-find-glacier-mystery"
], "Search and Find receives its own Mystery Trail missions in order");
assert.equal(migrated.activities[3].questionAutoMarkAssessmentId, "search-and-find-v1");
assert.equal(fs.existsSync(pancakeRocksImage), true, "Pancake Rocks photo asset exists");
assert.deepEqual(Array.from(migrated.activities[2].questions, (question) => question.id), [
    "result-q",
    "search-result-clock-tower",
    "search-result-pool-hours",
    "search-result-wrong-place",
    "search-result-glowworm-time",
    "search-result-doc-track"
], "Search results questions are preserved and all five missions are added");
const clockTowerMission = migrated.activities[2].questions.find((question) => question.id === "search-result-clock-tower");
assert.equal(clockTowerMission.type, "multiple-choice");
assert.equal(clockTowerMission.heading, "Mission 1 – Which Result Would You Open?");
assert.equal(clockTowerMission.prompt, "You want to find out how tall the Hokitika Clock Tower is. You search for `Hokitika Clock Tower height`. Which result would you choose?");
assert.deepEqual(Array.from(clockTowerMission.options), [
    "Hokitika Clock Tower – History and Dimensions",
    "Beautiful Photos of Hokitika",
    "Hokitika Weather Forecast"
]);
assert.equal(clockTowerMission.images[0].url, "/practical-skills/images/hokitika-clock-tower.jpg");
assert.equal(clockTowerMission.images[0].attribution, "Mike Dickison");
assert.equal(clockTowerMission.images[0].license, "CC BY 4.0");
assert.equal(clockTowerMission.images[0].sourceUrl, "https://commons.wikimedia.org/wiki/File:Hokitika_Clock_Tower_MRD_02.jpg");
assert.deepEqual(Array.from(clockTowerMission.searchResults.results, (result) => result.domain), [
    "heritage.example",
    "westcoastphotos.example",
    "weather.example"
]);
assert.equal(clockTowerMission.searchResults.note, "These are fictional results for practice, not links to real websites.");
assert.equal(clockTowerMission.searchResults.title, "Simulated (Fake website) search results");
assert.equal(migrated._contentMigrations.searchResultsDetective, 11, "Search Results Detective migration marker is recorded");
assert.equal(migrated.activities[2].questionAutoMarkAssessmentId, "search-results-detective-v1",
    "Search Results Detective uses server-checked self-marking");
assert.equal(context.addSearchResultsDetectiveIntroduction(migrated), migrated, "Search Results Detective migration is idempotent");
const savedResultKitWithOldTitle = JSON.parse(JSON.stringify(migrated));
savedResultKitWithOldTitle._contentMigrations.searchResultsDetective = 10;
for (const id of ["search-result-clock-tower", "search-result-pool-hours", "search-result-wrong-place"]) {
    savedResultKitWithOldTitle.activities[2].questions.find((question) => question.id === id)
        .searchResults.title = "Simulated search results";
}
const upgradedResultTitle = context.addSearchResultsDetectiveIntroduction(savedResultKitWithOldTitle);
for (const id of ["search-result-clock-tower", "search-result-pool-hours", "search-result-wrong-place"]) {
    assert.equal(upgradedResultTitle.activities[2].questions.find((question) => question.id === id)
        .searchResults.title, "Simulated (Fake website) search results",
    `Existing ${id} gets the clearer fake-website label`);
}
assert.equal(upgradedResultTitle._contentMigrations.searchResultsDetective, 11);
assert.equal(context.addSearchResultsDetectiveIntroduction(upgradedResultTitle), upgradedResultTitle,
    "Fake website title migration is idempotent");
const savedResultKitBeforeShuffle = JSON.parse(JSON.stringify(migrated));
savedResultKitBeforeShuffle._contentMigrations.searchResultsDetective = 10;
const savedQuestionsBeforeShuffle = savedResultKitBeforeShuffle.activities[2].questions;
const oldResultOrders = {
    "search-result-clock-tower": [
        "Beautiful Photos of Hokitika",
        "Hokitika Clock Tower – History and Dimensions",
        "Hokitika Weather Forecast"
    ],
    "search-result-pool-hours": [
        "Hokitika Swimming Club – Competition Results",
        "Hokitika Swimming Pool – Opening Hours and Contact Details",
        "Best Swimming Pools in New Zealand – Photo Gallery"
    ],
    "search-result-wrong-place": [
        "Hokitika Gorge Walk – Department of Conservation",
        "Hokitika Gorge – Walking Track Information",
        "Waimea Gorge Walking Track – Nelson"
    ]
};
for (const [id, order] of Object.entries(oldResultOrders)) {
    const question = savedQuestionsBeforeShuffle.find((entry) => entry.id === id);
    question.options = order;
    const byTitle = new Map(question.searchResults.results.map((result) => [result.title, result]));
    question.searchResults.results = order.map((title) => byTitle.get(title));
}
const shuffledSavedResultKit = context.addSearchResultsDetectiveIntroduction(savedResultKitBeforeShuffle);
assert.deepEqual(Array.from(shuffledSavedResultKit.activities[2].questions.find((question) =>
    question.id === "search-result-clock-tower").options), [
    "Hokitika Clock Tower – History and Dimensions",
    "Beautiful Photos of Hokitika",
    "Hokitika Weather Forecast"
], "Existing saved Mission 1 receives its new answer order");
assert.deepEqual(Array.from(shuffledSavedResultKit.activities[2].questions.find((question) =>
    question.id === "search-result-pool-hours").options), [
    "Hokitika Swimming Club – Competition Results",
    "Best Swimming Pools in New Zealand – Photo Gallery",
    "Hokitika Swimming Pool – Opening Hours and Contact Details"
], "Existing saved Mission 2 receives its new answer order");
assert.deepEqual(Array.from(shuffledSavedResultKit.activities[2].questions.find((question) =>
    question.id === "search-result-wrong-place").options), [
    "Hokitika Gorge Walk – Department of Conservation",
    "Waimea Gorge Walking Track – Nelson",
    "Hokitika Gorge – Walking Track Information"
], "Existing saved Mission 3 receives its new answer order");
assert.deepEqual(Array.from(shuffledSavedResultKit.activities[2].questions.find((question) =>
    question.id === "search-result-clock-tower").searchResults.results, (result) => result.title),
[
    "Hokitika Clock Tower – History and Dimensions",
    "Beautiful Photos of Hokitika",
    "Hokitika Weather Forecast"
], "Saved result cards stay aligned with the reordered choices");
assert.equal(shuffledSavedResultKit._contentMigrations.searchResultsDetective, 11);
const teacherEditedResultKit = JSON.parse(JSON.stringify(savedResultKitBeforeShuffle));
teacherEditedResultKit.activities[2].questions.find((question) =>
    question.id === "search-result-clock-tower").options[0] = "Teacher's preferred result";
const preservedTeacherEdit = context.addSearchResultsDetectiveIntroduction(teacherEditedResultKit);
assert.equal(preservedTeacherEdit.activities[2].questions.find((question) =>
    question.id === "search-result-clock-tower").options[0], "Teacher's preferred result",
"Answer-order migration preserves teacher-edited choices");
const poolHoursMission = migrated.activities[2].questions.find((question) => question.id === "search-result-pool-hours");
assert.ok(poolHoursMission, "Mission 2 is added");
assert.equal(poolHoursMission.heading, "Mission 2 – Read Before You Click!");
assert.equal(poolHoursMission.prompt, "You want to know what time the Hokitika swimming pool opens. Which result is most likely to give you the opening hours?");
assert.deepEqual(Array.from(poolHoursMission.options), [
    "Hokitika Swimming Club – Competition Results",
    "Best Swimming Pools in New Zealand – Photo Gallery",
    "Hokitika Swimming Pool – Opening Hours and Contact Details"
]);
assert.deepEqual(Array.from(poolHoursMission.searchResults.results, (result) => result.domain), [
    "hokitikaswimmingclub.example",
    "nzpoolphotos.example",
    "hokitikapool.example"
]);
assert.equal(poolHoursMission.searchResults.note, "These are fictional results for practice, not links to real websites.");
assert.equal(poolHoursMission.searchResults.title, "Simulated (Fake website) search results");
const wrongPlaceMission = migrated.activities[2].questions.find((question) => question.id === "search-result-wrong-place");
assert.ok(wrongPlaceMission, "Mission 3 is added");
assert.equal(wrongPlaceMission.heading, "Mission 3 – The Wrong Place!");
assert.equal(wrongPlaceMission.prompt, "You search for `Hokitika Gorge walking track` but one result is about a different location. Which result doesn't belong?");
assert.deepEqual(Array.from(wrongPlaceMission.options), [
    "Hokitika Gorge Walk – Department of Conservation",
    "Waimea Gorge Walking Track – Nelson",
    "Hokitika Gorge – Walking Track Information"
]);
assert.deepEqual(Array.from(wrongPlaceMission.searchResults.results, (result) => result.domain), [
    "doc.govt.nz.example",
    "waimeagorge.example",
    "hokitikagorge.example"
]);
assert.equal(wrongPlaceMission.searchResults.note, "These are fictional results for practice, not links to real websites.");
assert.equal(wrongPlaceMission.searchResults.title, "Simulated (Fake website) search results");
const glowwormTimeMission = migrated.activities[2].questions.find((question) => question.id === "search-result-glowworm-time");
assert.ok(glowwormTimeMission, "Mission 4 is added");
assert.equal(glowwormTimeMission.type, "multiple-choice");
assert.equal(glowwormTimeMission.heading, "Mission 4 – Find the Useful Information");
assert.equal(glowwormTimeMission.prompt, "Use your search engine to find information about the Hokitika Glow Worm Dell. What is the best time of day to see the glowworms?");
assert.deepEqual(Array.from(glowwormTimeMission.options), [
    "During the middle of the day",
    "After dark",
    "At lunchtime"
]);
assert.equal(glowwormTimeMission.presentation, "real-search");
assert.equal(Object.hasOwn(glowwormTimeMission, "correctAnswer"), false, "Mission 4 does not expose an answer in student content");
const docTrackMission = migrated.activities[2].questions.find((question) => question.id === "search-result-doc-track");
assert.ok(docTrackMission, "Mission 5 is added");
assert.equal(docTrackMission.heading, "Mission 5 – Find the Official Information");
assert.equal(docTrackMission.type, "short-answer");
assert.equal(docTrackMission.prompt, "Search for `Hokitika Gorge DOC`. Find and open the Department of Conservation's Hokitika Gorge Walk webpage. What is the name of the river that flows through Hokitika Gorge?");
assert.equal(docTrackMission.lines, 1);
assert.equal(Object.hasOwn(docTrackMission, "options"), false);
assert.equal(docTrackMission.presentation, "real-search");
assert.equal(Object.hasOwn(docTrackMission, "correctAnswer"), false, "Mission 5 does not expose an answer in student content");
assert.equal(migrated._contentMigrations.searchResultsDetective, 11, "Search Results Detective migration marker is recorded");
const editedResultActivity = JSON.parse(JSON.stringify(migrated));
editedResultActivity._contentMigrations.searchResultsDetective = 1;
editedResultActivity.activities[2].information.title = "Teacher-edited introduction";
const upgradedResultActivity = context.addSearchResultsDetectiveIntroduction(editedResultActivity);
assert.equal(upgradedResultActivity.activities[2].information.title, "Teacher-edited introduction", "Mission migration preserves teacher-edited introduction");
const savedResultActivityWithoutMission = JSON.parse(JSON.stringify(migrated));
savedResultActivityWithoutMission._contentMigrations.searchResultsDetective = 1;
savedResultActivityWithoutMission.activities[2].questions = savedResultActivityWithoutMission.activities[2].questions
    .filter((question) => question.id !== "search-result-clock-tower");
assert.ok(context.addSearchResultsDetectiveIntroduction(savedResultActivityWithoutMission).activities[2].questions
    .some((question) => question.id === "search-result-clock-tower"), "Migration adds the mission to saved activities without replacing existing questions");
const savedActivityWithoutMissionTwo = JSON.parse(JSON.stringify(migrated));
savedActivityWithoutMissionTwo._contentMigrations.searchResultsDetective = 2;
savedActivityWithoutMissionTwo.activities[2].questions = savedActivityWithoutMissionTwo.activities[2].questions
    .filter((question) => question.id !== "search-result-pool-hours");
const upgradedWithMissionTwo = context.addSearchResultsDetectiveIntroduction(savedActivityWithoutMissionTwo);
assert.ok(upgradedWithMissionTwo.activities[2].questions.some((question) => question.id === "search-result-pool-hours"),
    "Migration adds Mission 2 to saved activities while preserving existing questions");
assert.equal(upgradedWithMissionTwo._contentMigrations.searchResultsDetective, 11);
const savedActivityWithoutMissionThree = JSON.parse(JSON.stringify(migrated));
savedActivityWithoutMissionThree._contentMigrations.searchResultsDetective = 3;
savedActivityWithoutMissionThree.activities[2].questions = savedActivityWithoutMissionThree.activities[2].questions
    .filter((question) => question.id !== "search-result-wrong-place");
const upgradedWithMissionThree = context.addSearchResultsDetectiveIntroduction(savedActivityWithoutMissionThree);
assert.ok(upgradedWithMissionThree.activities[2].questions.some((question) => question.id === "search-result-wrong-place"),
    "Migration adds Mission 3 to saved activities while preserving existing questions");
assert.equal(upgradedWithMissionThree._contentMigrations.searchResultsDetective, 11);
const savedActivityWithoutMissionFour = JSON.parse(JSON.stringify(migrated));
savedActivityWithoutMissionFour._contentMigrations.searchResultsDetective = 4;
savedActivityWithoutMissionFour.activities[2].questions = savedActivityWithoutMissionFour.activities[2].questions
    .filter((question) => question.id !== "search-result-glowworm-time");
const upgradedWithMissionFour = context.addSearchResultsDetectiveIntroduction(savedActivityWithoutMissionFour);
assert.ok(upgradedWithMissionFour.activities[2].questions.some((question) => question.id === "search-result-glowworm-time"),
    "Migration adds Mission 4 to saved activities while preserving existing questions");
assert.equal(upgradedWithMissionFour._contentMigrations.searchResultsDetective, 11);
const savedActivityWithoutMissionFive = JSON.parse(JSON.stringify(migrated));
savedActivityWithoutMissionFive._contentMigrations.searchResultsDetective = 5;
savedActivityWithoutMissionFive.activities[2].questions = savedActivityWithoutMissionFive.activities[2].questions
    .filter((question) => question.id !== "search-result-doc-track");
const upgradedWithMissionFive = context.addSearchResultsDetectiveIntroduction(savedActivityWithoutMissionFive);
assert.ok(upgradedWithMissionFive.activities[2].questions.some((question) => question.id === "search-result-doc-track"),
    "Migration adds Mission 5 to saved activities while preserving existing questions");
assert.equal(upgradedWithMissionFive._contentMigrations.searchResultsDetective, 11);
const savedActivityWithOldMissionFive = JSON.parse(JSON.stringify(migrated));
savedActivityWithOldMissionFive._contentMigrations.searchResultsDetective = 10;
savedActivityWithOldMissionFive.activities[2].questions.find((question) =>
    question.id === "search-result-doc-track").type = "multiple-choice";
savedActivityWithOldMissionFive.activities[2].questions.find((question) =>
    question.id === "search-result-doc-track").prompt = "Search for `Hokitika Gorge DOC`. Find and open the Department of Conservation's Hokitika Gorge Walk webpage. Which organisation manages the walking track?";
savedActivityWithOldMissionFive.activities[2].questions.find((question) =>
    question.id === "search-result-doc-track").options = ["Department of Conservation (DOC)", "New Zealand Police", "MetService"];
const upgradedOldMissionFive = context.addSearchResultsDetectiveIntroduction(savedActivityWithOldMissionFive);
const upgradedDocTrackMission = upgradedOldMissionFive.activities[2].questions.find((question) =>
    question.id === "search-result-doc-track");
assert.equal(upgradedDocTrackMission.type, "short-answer", "Existing Mission 5 changes to a typed response");
assert.equal(upgradedDocTrackMission.prompt, "Search for `Hokitika Gorge DOC`. Find and open the Department of Conservation's Hokitika Gorge Walk webpage. What is the name of the river that flows through Hokitika Gorge?");
assert.equal(Object.hasOwn(upgradedDocTrackMission, "options"), false, "Old multiple-choice options are removed");
assert.equal(upgradedOldMissionFive._contentMigrations.searchResultsDetective, 11);
const savedKitMissingResultsActivity = {
    ...original,
    _contentMigrations: { searchPenguinMission: 11, searchKeywordChallenge: 9 },
    activities: original.activities.slice(0, 2)
};
const repairedResultsKit = context.addSearchKitPenguinMission(savedKitMissingResultsActivity);
assert.equal(repairedResultsKit.activities[2].title, "Finding the Right Result", "Migration creates the missing worksheet activity");
assert.equal(repairedResultsKit.activities[2].information.title, "THE MISSION: The Search Results Detective");
assert.deepEqual(Array.from(repairedResultsKit.activities[2].questions || [], (question) => question.id), [
    "search-result-clock-tower",
    "search-result-pool-hours",
    "search-result-wrong-place",
    "search-result-glowworm-time",
    "search-result-doc-track"
]);
assert.equal(repairedResultsKit._contentMigrations.searchResultsDetective, 11);
const treasureHuntIntroduction = {
    title: "🔎 THE MISSION: The West Coast Treasure Hunt",
    paragraphs: [
        "You're on a treasure hunt across the West Coast!",
        "Your challenge is to choose the best search words to find clues about places, objects and wildlife.",
        "Sometimes your first search won't give you what you need. That's when clever searchers change their keywords!",
        "Can you solve all five clues?"
    ]
};
const mysteryTrailIntroduction = {
    title: "🔎 THE MISSION: The West Coast Mystery Trail",
    paragraphs: [
        "There are mysteries hiding all over the West Coast!",
        "Your challenge is to follow five clues and use a search engine to discover the answers.",
        "You can search however you like. If your first search doesn't help, try different words.",
        "Can you solve all five mysteries?"
    ]
};
const keywordChallengeIds = [
    "keyword-pounamu-treasure",
    "keyword-too-many-results",
    "keyword-glowworm-mystery",
    "keyword-fix-the-search",
    "keyword-hokitika-founded"
];
const searchAndFindIds = [
    "search-find-giant-tree",
    "search-find-gold-rush-town",
    "search-find-mountain-bird",
    "search-find-pancake-rocks",
    "search-find-glacier-mystery"
];
assert.deepEqual(Array.from(migrated.activities[1].questions, (question) => question.id), [...keywordChallengeIds, "other-q"],
    "Keyword Challenge has its five Treasure Hunt missions and keeps existing questions");
const keywordPounamu = migrated.activities[1].questions[0];
assert.equal(keywordPounamu.type, "multiple-choice");
assert.equal(keywordPounamu.heading, "Mission 1: Find the Treasure");
assert.deepEqual(Array.from(keywordPounamu.options), ["beautiful green rocks", "where to find pounamu West Coast NZ", "New Zealand beaches"]);
assert.equal(keywordPounamu.images[0].url, "/practical-skills/images/pounamu-arahura-river.jpg");
assert.equal(fs.existsSync(pounamuImage), true, "Pounamu photo asset exists");
const keywordBridge = migrated.activities[1].questions[1];
assert.equal(keywordBridge.heading, "Mission 2: Too Many Results!");
assert.deepEqual(Array.from(keywordBridge.options), ["bridge", "bridges New Zealand", "Hokitika Gorge swing bridge"]);
const keywordGlowworm = migrated.activities[1].questions[2];
assert.equal(keywordGlowworm.heading, "Mission 3 – The Glowworm Mystery");
assert.deepEqual(Array.from(keywordGlowworm.options), ["Hokitika glowworm photos", "New Zealand glowworm diet", "Hokitika Glow Worm Dell directions"]);
assert.equal(keywordGlowworm.images[0].url, "/practical-skills/images/new-zealand-glowworm.jpg");
assert.equal(fs.existsSync(glowwormImage), true, "Glowworm photo asset exists");
const keywordFixSearch = migrated.activities[1].questions[3];
assert.equal(keywordFixSearch.heading, "Mission 4: Fix the Search");
assert.equal(keywordFixSearch.prompt, "Someone typed weather but wants to know whether it will rain in Hokitika tomorrow. Which words should they add?");
assert.deepEqual(Array.from(keywordFixSearch.options), ["Hokitika tomorrow", "sunshine", "New Zealand"]);
const keywordChallengeMissionFive = migrated.activities[1].questions[4];
assert.equal(keywordChallengeMissionFive.type, "short-answer");
assert.equal(keywordChallengeMissionFive.heading, "Mission 5: Your Turn – Find the Answer!");
assert.equal(keywordChallengeMissionFive.prompt, "Use a search engine to find out what year Hokitika was founded as a gold-mining settlement. What year did you find?");
assert.equal(keywordChallengeMissionFive.lines, 1);
assert.equal(migrated._contentMigrations.searchKeywordChallenge, 18, "Keyword Challenge migration is recorded");

const searchFindMissionOne = migrated.activities[3].questions[0];
assert.equal(searchFindMissionOne.id, "search-find-giant-tree");
assert.equal(searchFindMissionOne.type, "short-answer");
assert.equal(searchFindMissionOne.heading, "Mission 1 – The Giant Tree");
assert.equal(searchFindMissionOne.prompt, "One of New Zealand's tallest native tree species grows in West Coast forests. What is the name of this tree?");
assert.equal(searchFindMissionOne.lines, 1);
assert.equal(searchFindMissionOne.hint, "Search for New Zealand's tallest native tree species");
assert.equal(searchFindMissionOne.images[0].url, "/practical-skills/images/west-coast-tall-tree.jpg");
assert.equal(searchFindMissionOne.images[0].attribution, "Geoff McKay");
assert.equal(searchFindMissionOne.images[0].license, "CC BY 2.0");
assert.equal(searchFindMissionOne.images[0].sourceUrl, "https://commons.wikimedia.org/wiki/File:Standing_Straight_And_Tall_-_Kahikatea_(51236257730)_(cropped).jpg");
assert.equal(searchFindMissionOne.images[0].licenseUrl, "https://creativecommons.org/licenses/by/2.0/");
assert.equal(searchFindMissionOne.images[0].caption.includes("Kahikatea"), false, "Tree image caption does not reveal the species name");
assert.equal(searchFindMissionOne.images[0].alt.toLowerCase().includes("kahikatea"), false, "Tree image alt text does not reveal the species name");
assert.equal(Object.hasOwn(searchFindMissionOne, "correctAnswer"), false, "Search and Find answer is not exposed in student content");
assert.equal(fs.existsSync(treeImage), true, "West Coast tree photo asset exists");
const searchFindMissionTwo = migrated.activities[3].questions[1];
assert.equal(searchFindMissionTwo.id, "search-find-gold-rush-town");
assert.equal(searchFindMissionTwo.heading, "Mission 2 – The Gold Rush Town");
assert.equal(searchFindMissionTwo.prompt, "Approximately 25 km south of Hokitika is a small town famous for its gold-mining history. What is the name of this town?");
assert.equal(searchFindMissionTwo.hint, "Search for a historic gold-mining town south of Hokitika.");
const searchFindMissionThree = migrated.activities[3].questions[2];
assert.equal(searchFindMissionThree.id, "search-find-mountain-bird");
assert.equal(searchFindMissionThree.heading, "Mission 3 – The Mountain Bird");
assert.equal(searchFindMissionThree.prompt, "A large species of kiwi lives in the forests and mountains of the West Coast. What is the Māori name of the great spotted kiwi?");
assert.equal(searchFindMissionThree.hint, "Search for the great spotted kiwi's Māori name.");
assert.equal(searchFindMissionThree.images[0].url, "/practical-skills/images/west-coast-mountain-bird.jpg");
assert.equal(searchFindMissionThree.images[0].attribution, "J Brew");
assert.equal(searchFindMissionThree.images[0].license, "CC BY-SA 2.0");
assert.equal(fs.existsSync(mountainBirdImage), true, "Mountain Bird photo asset exists");
const searchFindMissionFour = migrated.activities[3].questions[3];
assert.equal(searchFindMissionFour.id, "search-find-pancake-rocks");
assert.equal(searchFindMissionFour.heading, "Mission 4 – The Famous Rock Formation");
assert.equal(searchFindMissionFour.prompt, "Near Punakaiki, there are famous rocks that look like stacks of pancakes. What type of rock are the Pancake Rocks made from?");
assert.equal(searchFindMissionFour.hint, "Search for what the Punakaiki Pancake Rocks are made of.");
assert.equal(searchFindMissionFour.images[0].url, "/practical-skills/images/punakaiki-pancake-rocks.jpg");
assert.equal(searchFindMissionFour.images[0].attribution, "W. Bulach");
assert.equal(searchFindMissionFour.images[0].license, "CC BY-SA 4.0");
const searchFindMissionFive = migrated.activities[3].questions[4];
assert.equal(searchFindMissionFive.id, "search-find-glacier-mystery");
assert.equal(searchFindMissionFive.type, "short-answer");
assert.equal(searchFindMissionFive.heading, "Mission 5 – The Glacier Mystery");
assert.equal(searchFindMissionFive.prompt, "The West Coast is home to a famous glacier called Franz Josef Glacier. What is its Māori name?");
assert.equal(searchFindMissionFive.hint, "Search for the Māori name of Franz Josef Glacier.");
assert.deepEqual(Array.from(searchFindMissionFive.images, (image) => image.url), [
    "/practical-skills/images/franz-josef-glacier-1906.jpg",
    "/practical-skills/images/franz-josef-glacier-2019.jpg",
    "/practical-skills/images/franz-josef-glacier-2024.jpg"
], "Mission 5 shows glacier photos oldest to newest");
assert.deepEqual(Array.from(searchFindMissionFive.images, (image) => image.timelineYear), ["1906", "2019", "2024"]);
assert.equal(searchFindMissionFive.imageTimeline, true, "Mission 5 shows a timeline under the photos");
assert.equal(searchFindMissionFive.images[0].license, "Public domain");
assert.equal(searchFindMissionFive.images[1].license, "CC BY-SA 2.0");
assert.equal(searchFindMissionFive.images[2].license, "Public domain");
assert.equal(fs.existsSync(path.join(root, "practical-skills", "images", "franz-josef-glacier-2024.jpg")), true,
    "Current glacier photo asset exists");
assert.equal(fs.existsSync(glacierRecentImage), true, "Recent glacier photo asset exists");
assert.equal(fs.existsSync(glacierHistoryImage), true, "Historical glacier photo asset exists");
assert.equal(migrated.activities[1].questions.some((question) => question.id === "search-find-glacier-mystery"), false,
    "Mission 5 is not added to The Keyword Challenge");

// Live content already migrated to version 16 gains Mission 5 without touching the Keyword Challenge.
const versionSixteenKit = JSON.parse(JSON.stringify(migrated));
versionSixteenKit._contentMigrations.searchKeywordChallenge = 16;
versionSixteenKit.activities[3].questions = [
    ...versionSixteenKit.activities[3].questions.slice(0, 4),
    { id: "teacher-search-question", type: "short-answer", prompt: "Teacher question" }
];
const upgradedKit = context.addSearchKitKeywordChallenge(versionSixteenKit);
assert.deepEqual(Array.from(upgradedKit.activities[3].questions, (question) => question.id),
    [...searchAndFindIds, "teacher-search-question"], "Mission 5 is added after Mission 4 on Search and Find!");
assert.deepEqual(JSON.parse(JSON.stringify(upgradedKit.activities[1])), JSON.parse(JSON.stringify(versionSixteenKit.activities[1])),
    "Adding Mission 5 leaves The Keyword Challenge unchanged");
assert.equal(upgradedKit._contentMigrations.searchKeywordChallenge, 18);

// Live content at version 17 swaps the old two glacier photos for the three-photo timeline.
const versionSeventeenKit = JSON.parse(JSON.stringify(migrated));
versionSeventeenKit._contentMigrations.searchKeywordChallenge = 17;
const oldGlacierQuestion = versionSeventeenKit.activities[3].questions[4];
delete oldGlacierQuestion.imageTimeline;
oldGlacierQuestion.images = [
    { url: "/practical-skills/images/franz-josef-glacier-2019.jpg", alt: "Recent" },
    { url: "/practical-skills/images/franz-josef-glacier-1906.jpg", alt: "History" }
];
const timelineKit = context.addSearchKitKeywordChallenge(versionSeventeenKit);
const timelineGlacier = timelineKit.activities[3].questions[4];
assert.equal(timelineGlacier.imageTimeline, true);
assert.deepEqual(Array.from(timelineGlacier.images, (image) => image.timelineYear), ["1906", "2019", "2024"],
    "Version 17 glacier photos are upgraded to the timeline");
assert.deepEqual(JSON.parse(JSON.stringify(timelineKit.activities[1])), JSON.parse(JSON.stringify(versionSeventeenKit.activities[1])),
    "Glacier timeline upgrade leaves The Keyword Challenge unchanged");

// The Great West Coast Adventure introduction is added to the Google Search Challenge only.
const challengeKit = JSON.parse(JSON.stringify(timelineKit));
delete challengeKit._contentMigrations.googleSearchChallenge;
challengeKit.worksheets.push({ number: 5, activity: "Google Search Challenge", establishes: "Challenge\tUse Google independently to find information" });
const challengeMigrated = context.addSearchKitPenguinMission(challengeKit);
assert.deepEqual(JSON.parse(JSON.stringify(challengeMigrated.activities[4].information)), {
    title: "🏆 THE MISSION: The Great West Coast Adventure!",
    paragraphs: [
        "You've been asked to help a visitor explore the amazing West Coast!",
        "They want to see interesting places, discover something unusual and enjoy a great day out.",
        "Your challenge is to use a search engine to help them plan their adventure.",
        "There are five missions to complete. You can use any search engine you like.",
        "Ready to become a West Coast Search Champion?"
    ]
}, "Google Search Challenge shows The Great West Coast Adventure introduction");
assert.equal(challengeMigrated.worksheets[4].establishes, "Use Google independently to find information",
    "Stray 'Challenge' tab text is removed from the activity subtitle");
assert.equal(challengeMigrated._contentMigrations.googleSearchChallenge, 2);
assert.deepEqual(JSON.parse(JSON.stringify(challengeMigrated.activities[4].researchReport)), {
    id: "search-research-report-v1",
    fileName: "Search Kit - My West Coast Discoveries",
    templateId: "",
    minimumWords: 25
}, "Google Search Challenge gets the research report settings");
const versionOneChallenge = JSON.parse(JSON.stringify(challengeMigrated));
versionOneChallenge._contentMigrations.googleSearchChallenge = 1;
delete versionOneChallenge.activities[4].researchReport;
versionOneChallenge.activities[4].information = { title: "Teacher intro", paragraphs: ["Kept"] };
const versionTwoChallenge = context.addSearchKitPenguinMission(versionOneChallenge);
assert.equal(versionTwoChallenge.activities[4].information.title, "Teacher intro", "v1 -> v2 keeps the introduction");
assert.equal(versionTwoChallenge.activities[4].researchReport.id, "search-research-report-v1");
assert.deepEqual(JSON.parse(JSON.stringify(versionTwoChallenge.activities.slice(0, 4))), JSON.parse(JSON.stringify(versionOneChallenge.activities.slice(0, 4))),
    "Adding the research report leaves the first four activities unchanged");
const teacherTemplateKit = JSON.parse(JSON.stringify(versionOneChallenge));
teacherTemplateKit.activities[4].researchReport = { templateId: "https://docs.google.com/document/d/teacherTemplateId1234567890/edit" };
assert.equal(context.addSearchKitPenguinMission(teacherTemplateKit).activities[4].researchReport.templateId,
    "https://docs.google.com/document/d/teacherTemplateId1234567890/edit", "Teacher template link is preserved");
assert.deepEqual(JSON.parse(JSON.stringify(challengeMigrated.activities.slice(0, 4))), JSON.parse(JSON.stringify(challengeKit.activities.slice(0, 4))),
    "Adding the Google Search Challenge introduction leaves the first four activities unchanged");
assert.deepEqual(JSON.parse(JSON.stringify(challengeMigrated.worksheets.slice(0, 4))), JSON.parse(JSON.stringify(challengeKit.worksheets.slice(0, 4))));
assert.equal(context.addSearchKitPenguinMission(challengeMigrated), challengeMigrated, "Google Search Challenge migration runs once");
const teacherChallengeKit = JSON.parse(JSON.stringify(challengeKit));
teacherChallengeKit.activities[4] = { title: "Google Search Challenge", information: { title: "Teacher intro", paragraphs: ["Mine"] } };
assert.equal(context.addSearchKitPenguinMission(teacherChallengeKit).activities[4].information.title, "Teacher intro",
    "Teacher-written Google Search Challenge introductions are preserved");
assert.equal(timelineKit._contentMigrations.searchKeywordChallenge, 18);

const teacherGlacierKit = JSON.parse(JSON.stringify(versionSeventeenKit));
teacherGlacierKit.activities[3].questions[4].images = [{ url: "/teacher-glacier.jpg", alt: "Teacher photo" }];
const preservedGlacier = context.addSearchKitKeywordChallenge(teacherGlacierKit).activities[3].questions[4];
assert.deepEqual(Array.from(preservedGlacier.images, (image) => image.url), ["/teacher-glacier.jpg"],
    "Teacher-edited glacier photos are preserved");

// Saved content previously overwritten by the misplaced Mystery Trail migrations (versions 10-15).
const overwrittenKit = JSON.parse(JSON.stringify(migrated));
overwrittenKit._contentMigrations.searchKeywordChallenge = 15;
const misplacedMysteryQuestions = [
    { ...searchFindMissionOne, id: "keyword-west-coast-tree" },
    { ...keywordBridge },
    { ...searchFindMissionThree, id: "keyword-mountain-bird" },
    { ...searchFindMissionFour, id: "keyword-pancake-rocks" },
    { ...keywordChallengeMissionFive }
];
overwrittenKit.activities[1] = {
    ...overwrittenKit.activities[1],
    information: mysteryTrailIntroduction,
    questions: misplacedMysteryQuestions
};
overwrittenKit.activities[3] = {
    title: "Search and Find!",
    information: mysteryTrailIntroduction,
    questionAutoMarkAssessmentId: "search-keyword-challenge-v1",
    questions: [
        { ...searchFindMissionOne, id: "keyword-west-coast-tree" },
        { ...searchFindMissionTwo, id: "keyword-gold-rush-town" },
        { ...searchFindMissionThree, id: "keyword-mountain-bird" },
        { ...searchFindMissionFour, id: "keyword-pancake-rocks" },
        { ...keywordChallengeMissionFive },
        { id: "teacher-search-question", type: "short-answer", prompt: "Teacher question" }
    ]
};
const restoredKit = context.addSearchKitPenguinMission(overwrittenKit);
assert.deepEqual(JSON.parse(JSON.stringify(restoredKit.activities[1].information)), treasureHuntIntroduction,
    "Overwritten Keyword Challenge gets its Treasure Hunt introduction back");
assert.deepEqual(Array.from(restoredKit.activities[1].questions, (question) => question.id), keywordChallengeIds,
    "Overwritten Keyword Challenge gets its original five missions back in order");
assert.equal(restoredKit.activities[1].questions[0].heading, "Mission 1: Find the Treasure");
assert.equal(restoredKit.activities[1].questions[2].heading, "Mission 3 – The Glowworm Mystery");
assert.equal(restoredKit.activities[1].questions[3].heading, "Mission 4: Fix the Search");
assert.equal(restoredKit.activities[1].questionAutoMarkAssessmentId, "search-keyword-challenge-v1");
assert.deepEqual(JSON.parse(JSON.stringify(restoredKit.activities[3].information)), mysteryTrailIntroduction);
assert.deepEqual(Array.from(restoredKit.activities[3].questions, (question) => question.id),
    [...searchAndFindIds, "teacher-search-question"],
    "Search and Find keeps only its own missions plus teacher-added questions");
assert.equal(restoredKit.activities[3].questionAutoMarkAssessmentId, "search-and-find-v1",
    "Search and Find is graded separately from the Keyword Challenge");
assert.equal(restoredKit._contentMigrations.searchKeywordChallenge, 18);
assert.equal(context.addSearchKitKeywordChallenge(restoredKit), restoredKit, "Restoration runs once");

const teacherEditedKeywordChallenge = JSON.parse(JSON.stringify(overwrittenKit));
teacherEditedKeywordChallenge.activities[1].information = { title: "Teacher-edited title", paragraphs: ["Teacher-edited introduction"] };
const preservedTeacherIntro = context.addSearchKitKeywordChallenge(teacherEditedKeywordChallenge);
assert.deepEqual(JSON.parse(JSON.stringify(preservedTeacherIntro.activities[1].information)), {
    title: "Teacher-edited title",
    paragraphs: ["Teacher-edited introduction"]
}, "Restoration preserves a teacher-edited Keyword Challenge introduction");

const savedKitMissingSearchAndFind = JSON.parse(JSON.stringify(overwrittenKit));
savedKitMissingSearchAndFind.activities.splice(3, 1);
const repairedSearchAndFind = context.addSearchKitPenguinMission(savedKitMissingSearchAndFind);
assert.equal(repairedSearchAndFind.activities[3].title, "Search and Find!", "A saved kit missing its Search and Find activity is repaired");
assert.deepEqual(Array.from(repairedSearchAndFind.activities[3].questions, (question) => question.id), searchAndFindIds);
assert.deepEqual(JSON.parse(JSON.stringify(repairedSearchAndFind.activities[3].information)), mysteryTrailIntroduction);

const savedKitMissingKeywordActivity = {
    ...original,
    _contentMigrations: { searchPenguinMission: 11, searchKeywordChallenge: 1 },
    activities: original.activities.slice(0, 1)
};
const repairedKeywordKit = context.addSearchKitPenguinMission(savedKitMissingKeywordActivity);
assert.equal(repairedKeywordKit.activities[1].title, "The Keyword Challenge", "Migration creates the missing activity listed in worksheets");
assert.deepEqual(JSON.parse(JSON.stringify(repairedKeywordKit.activities[1].information)), treasureHuntIntroduction);
assert.deepEqual(Array.from(repairedKeywordKit.activities[1].questions, (question) => question.id), keywordChallengeIds);
assert.equal(repairedKeywordKit._contentMigrations.searchKeywordChallenge, 18, "Repair migration is recorded for previously incomplete saved kits");
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
    "1-keyword-fix-the-search": "sunshine"
}, 1);
assert.equal(incorrectKeywordGrade.passed, false, "Incorrect Keyword Challenge answer prevents completion");
assert.equal(incorrectKeywordGrade.score, 4);
const correctSearchAndFindAnswers = {
    "3-search-find-giant-tree": "Kahikatea",
    "3-search-find-gold-rush-town": "Ross",
    "3-search-find-mountain-bird": "Roroa",
    "3-search-find-pancake-rocks": "Limestone",
    "3-search-find-glacier-mystery": "Kā Roimata o Hine Hukatere"
};
const completeSearchAndFindGrade = gradeContext.gradeSearchAndFind(correctSearchAndFindAnswers, 3);
assert.equal(completeSearchAndFindGrade.passed, true, "All Search and Find answers pass");
assert.equal(completeSearchAndFindGrade.total, 5);
assert.equal(gradeContext.gradeSearchAndFind({ ...correctSearchAndFindAnswers, "3-search-find-glacier-mystery": "ka roimata o hine hukatere" }, 3).passed, true,
    "Glacier answer is accepted without the macron");
assert.equal(gradeContext.gradeSearchAndFind({ ...correctSearchAndFindAnswers, "3-search-find-glacier-mystery": "Roimata o Hine Hukatere" }, 3).passed, true,
    "Glacier answer is accepted without the leading Kā");
assert.equal(gradeContext.gradeSearchAndFind({ ...correctSearchAndFindAnswers, "3-search-find-glacier-mystery": "Fox Glacier" }, 3).passed, false,
    "Incorrect glacier answer prevents completion");
assert.equal(completeSearchAndFindGrade.assessmentId, "search-and-find-v1");
assert.equal(gradeContext.gradeSearchAndFind({ ...correctSearchAndFindAnswers, "3-search-find-pancake-rocks": "Sandstone" }, 3).passed, false,
    "Incorrect Pancake Rocks answer prevents completion");
assert.equal(gradeContext.gradeSearchAndFind({ ...correctSearchAndFindAnswers, "3-search-find-gold-rush-town": "Hokitika" }, 3).passed, false,
    "Incorrect Gold Rush Town answer prevents completion");
const correctSearchResultsAnswers = {
    "2-search-result-clock-tower": "Hokitika Clock Tower – History and Dimensions",
    "2-search-result-pool-hours": "Hokitika Swimming Pool – Opening Hours and Contact Details",
    "2-search-result-wrong-place": "Waimea Gorge Walking Track – Nelson",
    "2-search-result-glowworm-time": "After dark",
    "2-search-result-doc-track": "Hokitika River"
};
const completeSearchResultsGrade = gradeContext.gradeSearchResultsDetective(correctSearchResultsAnswers, 2);
assert.equal(completeSearchResultsGrade.passed, true, "All five correct Search Results Detective answers pass");
assert.equal(completeSearchResultsGrade.score, 5);
assert.equal(completeSearchResultsGrade.total, 5);
assert.equal(completeSearchResultsGrade.assessmentId, "search-results-detective-v1");
const incorrectSearchResultsGrade = gradeContext.gradeSearchResultsDetective({
    ...correctSearchResultsAnswers,
    "2-search-result-wrong-place": "Hokitika Gorge – Walking Track Information"
}, 2);
assert.equal(incorrectSearchResultsGrade.passed, false, "Incorrect Search Results Detective answer prevents completion");
assert.equal(incorrectSearchResultsGrade.score, 4);
assert.equal(gradeContext.gradeSearchResultsDetective({
    ...correctSearchResultsAnswers,
    "2-search-result-doc-track": "Department of Conservation"
}, 2).passed, false, "Former multiple-choice answer does not pass the updated Mission 5 grader");
assert.equal(gradeContext.gradeSearchResultsDetective({
    ...correctSearchResultsAnswers,
    "2-search-result-doc-track": "hokitika river"
}, 2).passed, true, "Grader accepts case-insensitive answers");
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
assert.ok(fs.existsSync(clockTowerImage), "Clock Tower photo is stored locally");

assert.match(renderSource, /content\?\.information/, "Student worksheet renders the mission information heading");
assert.match(renderSource, /images\.map\(\(image\)/, "Student worksheet renders the penguin image");
assert.equal((renderSource.match(/renderInstructions\(content\.instructions\)/g) || []).length, 2,
    "Kit overview and activity pages both render structured instructions");
assert.match(renderSource, /querySelectorAll\("\.worksheet-choice-bubble, \.worksheet-search-result"\)\.forEach\(\(button\) => \{\s*button\.addEventListener\("click"/,
    "Search-result cards and standard choices both save selections on click");
assert.match(renderSource, /sibling\.setAttribute\("aria-pressed", String\(selected\)\)/,
    "Search-result selected state is reflected for assistive technology");
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
    questions: [searchFindMissionOne, searchFindMissionTwo, searchFindMissionThree, searchFindMissionFour, searchFindMissionFive, keywordChallengeMissionFive, missionTwo, missionThree, missionFour, missionFive]
}, { readOnly: true });
assert.match(imageHost.innerHTML, /Photo: Duncan Wright/);
const reportHost = { style: { setProperty() {} }, innerHTML: "", querySelectorAll() { return []; }, querySelector() { return null; } };
renderContext.window.KitWorksheetRender.renderWorksheet(reportHost, {
    bannerTitle: "Google Search Challenge",
    researchReport: { id: "search-research-report-v1" },
    questions: []
}, { readOnly: true });
assert.match(reportHost.innerHTML, /data-research-report-open disabled>Create My Research Report<\/button>/, "Research report Create button is rendered");
assert.match(reportHost.innerHTML, /data-research-report-check disabled hidden>Check My Report<\/button>/, "Check My Report appears once a report exists");
assert.doesNotMatch(reportHost.innerHTML, /does not have any questions yet/, "Research report activities do not show the empty-questions note");
assert.match(imageHost.innerHTML, /href="https:\/\/commons\.wikimedia\.org\/wiki\/File:Blue_Penguin_Kapiti\.jpg"/, "Photo credit links to its source");
assert.match(imageHost.innerHTML, /href="https:\/\/creativecommons\.org\/licenses\/by-sa\/3\.0\/"/, "Photo credit links to the CC BY-SA 3.0 license");
assert.match(imageHost.innerHTML, /west-coast-tall-tree\.jpg/);
assert.match(imageHost.innerHTML, /Photo: Geoff McKay/);
assert.match(imageHost.innerHTML, /Tall native forest trees/);
assert.match(imageHost.innerHTML, /<textarea[^>]*data-question-id="search-find-giant-tree"/,
    "Giant Tree answer box is rendered");
assert.match(imageHost.innerHTML, /data-hint-toggle="search-find-giant-tree"[^>]*>HINT<\/button>/,
    "Giant Tree HINT button is rendered");
assert.match(imageHost.innerHTML, /data-question-hint="search-find-giant-tree" hidden>Hint: Search for New Zealand&#039;s tallest native tree species<\/p>/,
    "Giant Tree hint is initially hidden and shows the requested wording");
assert.match(renderSource, /querySelectorAll\("\[data-hint-toggle\]"\)\.forEach\(\(button\) => \{\s*button\.addEventListener\("click"/,
    "Hint button reveals its matching hint when clicked");
const hintButton = {
    attributes: { "aria-expanded": "false", "data-hint-toggle": "search-find-giant-tree" },
    listeners: {},
    getAttribute(name) { return this.attributes[name]; },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, callback) { this.listeners[name] = callback; }
};
const hintText = {
    hidden: true,
    getAttribute(name) { return name === "data-question-hint" ? "search-find-giant-tree" : null; }
};
const interactiveHintHost = {
    style: { setProperty() {} },
    innerHTML: "",
    querySelectorAll(selector) {
        if (selector === "[data-hint-toggle]") return [hintButton];
        if (selector === "[data-question-hint]") return [hintText];
        return [];
    },
    querySelector() { return null; }
};
renderContext.window.KitWorksheetRender.renderWorksheet(interactiveHintHost, {
    questions: [searchFindMissionOne]
}, { readOnly: false });
hintButton.listeners.click();
assert.equal(hintText.hidden, false, "Clicking HINT reveals the hint");
assert.equal(hintButton.getAttribute("aria-expanded"), "true", "Hint button announces its expanded state");
hintButton.listeners.click();
assert.equal(hintText.hidden, true, "Clicking HINT again hides the hint");
const clockTowerHost = {
    style: { setProperty() {} },
    innerHTML: "",
    querySelectorAll() { return []; },
    querySelector() { return null; }
};
renderContext.window.KitWorksheetRender.renderWorksheet(clockTowerHost, {
    information: { title: "THE MISSION: The Search Results Detective", paragraphs: [] },
    questions: [clockTowerMission],
    questionAutoMarkAssessmentId: "search-results-detective-v1"
}, { readOnly: true });
assert.match(clockTowerHost.innerHTML, /Mission 1 – Which Result Would You Open\?/);
assert.match(clockTowerHost.innerHTML, /hokitika-clock-tower\.jpg/);
assert.match(clockTowerHost.innerHTML, /Photo: Mike Dickison/);
assert.match(clockTowerHost.innerHTML, /href="https:\/\/creativecommons\.org\/licenses\/by\/4\.0\/"/);
assert.match(clockTowerHost.innerHTML, /westcoastphotos\.example/);
assert.match(clockTowerHost.innerHTML, /heritage\.example/);
assert.match(clockTowerHost.innerHTML, /weather\.example/);
assert.match(clockTowerHost.innerHTML, /These are fictional results for practice, not links to real websites\./);
assert.match(clockTowerHost.innerHTML, /Simulated \(Fake website\) search results/);
assert.match(clockTowerHost.innerHTML, /class="worksheet-search-result[\s\S]*data-option-value="Hokitika Clock Tower – History and Dimensions"[\s\S]*aria-pressed="false"/, "Fictional result cards are selectable button answers rather than external links");
assert.match(clockTowerHost.innerHTML, /data-question-feedback="search-result-clock-tower" role="status" aria-live="polite"/,
    "Search Results Detective questions include an accessible live feedback area");
const searchFindFeedbackHost = { style: { setProperty() {} }, innerHTML: "", querySelectorAll() { return []; }, querySelector() { return null; } };
renderContext.window.KitWorksheetRender.renderWorksheet(searchFindFeedbackHost, {
    questions: [{ ...searchFindMissionFour, id: "3-search-find-pancake-rocks" }],
    questionAutoMarkAssessmentId: "search-and-find-v1"
}, { readOnly: true });
assert.match(searchFindFeedbackHost.innerHTML, /data-question-feedback="3-search-find-pancake-rocks" role="status" aria-live="polite"/,
    "Search and Find missions include an accessible live feedback area");
assert.match(worksheetSource, /"search-find-giant-tree": "You found it! The kahikatea is New Zealand's tallest native tree\. Great searching!"/);
assert.match(worksheetSource, /"search-find-gold-rush-town": "You found it! Ross is the historic gold-mining town south of Hokitika\. Great searching!"/);
assert.match(worksheetSource, /"search-find-mountain-bird": "You found it! Roroa is the Māori name for the great spotted kiwi\. Great searching!"/);
assert.match(worksheetSource, /"search-find-pancake-rocks": "You found it! The Pancake Rocks are made of limestone\. Great searching!"/);
assert.match(worksheetSource, /"search-find-glacier-mystery": "You found it! Kā Roimata o Hine Hukatere is the Māori name for Franz Josef Glacier\. Great searching!"/);
assert.match(worksheetSource, /Good try! That's not quite it yet\. Tap HINT or try different search words, then update your answer\./,
    "An incorrect Search and Find answer receives an encouraging retry message");
assert.match(worksheetSource, /\["search-results-detective-v1", "search-and-find-v1"\]\.includes\(assessmentId\)/,
    "Search and Find answers are checked in real time");
assert.match(worksheetSource, /isTypedAnswer \? 900 : 250/, "Typed answers are checked after the student pauses typing");
assert.match(worksheetSource, /showSavedSearchAndFindFeedback\(activityIndex, questions\)/, "Saved Search and Find answers show feedback when the activity opens");
assert.match(worksheetSource, /You solved all five West Coast mysteries\. Your activity tick is saved\./);
assert.doesNotMatch(clockTowerHost.innerHTML, /href="https:\/\/(?:westcoastphotos|heritage|weather)\.example/, "Fictional result domains are never linked");
const poolHoursHost = {
    style: { setProperty() {} },
    innerHTML: "",
    querySelectorAll() { return []; },
    querySelector() { return null; }
};
renderContext.window.KitWorksheetRender.renderWorksheet(poolHoursHost, {
    information: { title: "THE MISSION: The Search Results Detective", paragraphs: [] },
    questions: [poolHoursMission]
}, { readOnly: true });
assert.match(poolHoursHost.innerHTML, /Mission 2 – Read Before You Click!/);
assert.match(poolHoursHost.innerHTML, /Hokitika Swimming Pool – Opening Hours and Contact Details/);
assert.match(poolHoursHost.innerHTML, /hokitikapool\.example/);
assert.match(poolHoursHost.innerHTML, /These are fictional results for practice, not links to real websites\./);
assert.match(poolHoursHost.innerHTML, /Simulated \(Fake website\) search results/);
assert.doesNotMatch(poolHoursHost.innerHTML, /href="https:\/\/(?:hokitikaswimmingclub|hokitikapool|nzpoolphotos)\.example/,
    "Mission 2 fictional results are not links");
const wrongPlaceHost = {
    style: { setProperty() {} },
    innerHTML: "",
    querySelectorAll() { return []; },
    querySelector() { return null; }
};
renderContext.window.KitWorksheetRender.renderWorksheet(wrongPlaceHost, {
    information: { title: "THE MISSION: The Search Results Detective", paragraphs: [] },
    questions: [wrongPlaceMission]
}, { readOnly: true });
assert.match(wrongPlaceHost.innerHTML, /Mission 3 – The Wrong Place!/);
assert.match(wrongPlaceHost.innerHTML, /Waimea Gorge Walking Track – Nelson/);
assert.match(wrongPlaceHost.innerHTML, /waimeagorge\.example/);
assert.match(wrongPlaceHost.innerHTML, /These are fictional results for practice, not links to real websites\./);
assert.match(wrongPlaceHost.innerHTML, /Simulated \(Fake website\) search results/);
assert.doesNotMatch(wrongPlaceHost.innerHTML, /href="https:\/\/(?:doc\.govt\.nz|hokitikagorge|waimeagorge)\.example/,
    "Mission 3 fictional results are not links");
const glowwormTimeHost = {
    style: { setProperty() {} },
    innerHTML: "",
    querySelectorAll() { return []; },
    querySelector() { return null; }
};
renderContext.window.KitWorksheetRender.renderWorksheet(glowwormTimeHost, {
    information: { title: "THE MISSION: The Search Results Detective", paragraphs: [] },
    questions: [glowwormTimeMission]
}, { readOnly: true });
assert.match(glowwormTimeHost.innerHTML, /Mission 4 – Find the Useful Information/);
assert.match(glowwormTimeHost.innerHTML, /Hokitika Glow Worm Dell/);
assert.match(glowwormTimeHost.innerHTML, /After dark/);
assert.match(glowwormTimeHost.innerHTML, /During the middle of the day/);
assert.match(glowwormTimeHost.innerHTML, /At lunchtime/);
assert.match(glowwormTimeHost.innerHTML, /worksheet-question--real-search/);
assert.match(glowwormTimeHost.innerHTML, /Real-world search/);
const docTrackHost = {
    style: { setProperty() {} },
    innerHTML: "",
    querySelectorAll() { return []; },
    querySelector() { return null; }
};
renderContext.window.KitWorksheetRender.renderWorksheet(docTrackHost, {
    information: { title: "THE MISSION: The Search Results Detective", paragraphs: [] },
    questions: [docTrackMission]
}, { readOnly: true });
assert.match(docTrackHost.innerHTML, /Mission 5 – Find the Official Information/);
assert.match(docTrackHost.innerHTML, /Hokitika Gorge DOC/);
assert.match(docTrackHost.innerHTML, /Hokitika Gorge Walk webpage/);
assert.match(docTrackHost.innerHTML, /What is the name of the river that flows through Hokitika Gorge\?/);
assert.match(docTrackHost.innerHTML, /<textarea[^>]*data-question-id="search-result-doc-track"/);
assert.match(docTrackHost.innerHTML, /worksheet-question--real-search/);
assert.match(docTrackHost.innerHTML, /Real-world search/);
assert.match(worksheetCss, /\.worksheet-search-result-list\s*\{[^}]*display:\s*grid;/, "Simulated search results render in a clear card layout");
assert.match(worksheetCss, /\.worksheet-search-result::before\s*\{[^}]*counter\(search-result\)/, "Simulated search result cards receive numbered visual markers");
assert.match(worksheetCss, /\.worksheet-question--real-search \.worksheet-choice-bubble\.is-selected\s*\{[^}]*background:\s*#32764d;/, "Real-world mission choices use a distinct selected style");
assert.match(worksheetCss, /\.worksheet-choice-feedback\.is-retry\s*\{[^}]*background:\s*#fff8e1;/,
    "Retry feedback uses a calm, positive visual style rather than an error-red treatment");
const instructions = "Welcome to the Search Kit! Complete five activities. 1. Read the information in each activity. 2. Follow the instructions and try the examples. 3. Complete the questions and search challenges. 4. Ask your teacher for help if you get stuck. 5. Finish all five activities to earn your Search Kit stamp! Remember: You do not need to know everything.";
const instructionHost = {
    style: { setProperty() {} },
    innerHTML: "",
    querySelectorAll() { return []; },
    querySelector() { return null; }
};
renderContext.window.KitWorksheetRender.renderWorksheet(instructionHost, {
    bannerTitle: "Search Kit",
    instructions,
    questions: []
}, { readOnly: true });
assert.match(instructionHost.innerHTML, /<p>Welcome to the Search Kit! Complete five activities\.<\/p>/);
assert.match(instructionHost.innerHTML, /<ol class="worksheet-instructions-list">/);
assert.match(instructionHost.innerHTML, /<li>Read the information in each activity\.<\/li>/);
assert.match(instructionHost.innerHTML, /<li>Follow the instructions and try the examples\.<\/li>/);
assert.match(instructionHost.innerHTML, /<li>Complete the questions and search challenges\.<\/li>/);
assert.match(instructionHost.innerHTML, /<li>Ask your teacher for help if you get stuck\.<\/li>/);
assert.match(instructionHost.innerHTML, /<li>Finish all five activities to earn your Search Kit stamp!<\/li>/);
assert.match(instructionHost.innerHTML, /<p>Remember: You do not need to know everything\.<\/p>/);
assert.match(worksheetCss, /\.worksheet-instructions-list\s*\{[^}]*display:\s*grid;/);
const overviewHost = {
    style: { setProperty() {} },
    innerHTML: "",
    querySelectorAll() { return []; },
    querySelector() { return null; }
};
renderContext.window.KitWorksheetRender.renderKitOverview(overviewHost, {
    bannerTitle: "Search Kit",
    instructions,
    worksheets: []
});
assert.match(overviewHost.innerHTML, /<ol class="worksheet-instructions-list">/,
    "Kit landing page instructions render as an ordered list too");
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
assert.match(imageHost.innerHTML, /Mission 1 – The Giant Tree/);
assert.match(imageHost.innerHTML, /What is the name of this tree\?/);
assert.match(imageHost.innerHTML, /west-coast-tall-tree\.jpg/);
assert.match(imageHost.innerHTML, /Search for New Zealand&#039;s tallest native tree species/);
assert.match(imageHost.innerHTML, /Mission 2 – The Gold Rush Town/);
assert.match(imageHost.innerHTML, /Approximately 25 km south of Hokitika is a small town famous for its gold-mining history/);
assert.match(imageHost.innerHTML, /data-question-id="search-find-gold-rush-town"/);
assert.match(imageHost.innerHTML, /data-hint-toggle="search-find-gold-rush-town"[^>]*>HINT<\/button>/);
assert.match(imageHost.innerHTML, /Hint: Search for a historic gold-mining town south of Hokitika\./);
assert.match(imageHost.innerHTML, /Mission 3 – The Mountain Bird/);
assert.match(imageHost.innerHTML, /What is the Māori name of the great spotted kiwi\?/);
assert.match(imageHost.innerHTML, /west-coast-mountain-bird\.jpg/);
assert.match(imageHost.innerHTML, /data-hint-toggle="search-find-mountain-bird"[^>]*>HINT<\/button>/);
assert.match(imageHost.innerHTML, /Hint: Search for the great spotted kiwi&#039;s Māori name\./);
assert.match(imageHost.innerHTML, /Mission 4 – The Famous Rock Formation/);
assert.match(imageHost.innerHTML, /What type of rock are the Pancake Rocks made from\?/);
assert.match(imageHost.innerHTML, /punakaiki-pancake-rocks\.jpg/);
assert.match(imageHost.innerHTML, /data-hint-toggle="search-find-pancake-rocks"[^>]*>HINT<\/button>/);
assert.match(imageHost.innerHTML, /Hint: Search for what the Punakaiki Pancake Rocks are made of\./);
assert.match(imageHost.innerHTML, /Mission 5 – The Glacier Mystery/);
assert.match(imageHost.innerHTML, /What is its Māori name\?/);
assert.match(imageHost.innerHTML, /class="worksheet-question-images has-timeline"[^>]*>[\s\S]*franz-josef-glacier-1906\.jpg[\s\S]*franz-josef-glacier-2019\.jpg[\s\S]*franz-josef-glacier-2024\.jpg[\s\S]*?<\/div>\s*<ol class="worksheet-image-timeline"[\s\S]*1906[\s\S]*2019[\s\S]*2024[\s\S]*<\/ol>/,
    "Glacier photos render oldest to newest with a timeline directly underneath");
assert.match(imageHost.innerHTML, /Photo: Pseudopanax/);
assert.match(imageHost.innerHTML, /Photo: Pedro Szekely/);
assert.match(imageHost.innerHTML, /Photo: James Ring, Alexander Turnbull Library/);
assert.match(imageHost.innerHTML, /data-hint-toggle="search-find-glacier-mystery"[^>]*>HINT<\/button>/);
assert.match(imageHost.innerHTML, /Hint: Search for the Māori name of Franz Josef Glacier\./);
assert.match(worksheetCss, /\.worksheet-question-images\.has-two-images\s*\{[^}]*grid-template-columns:\s*repeat\(2,/);
assert.match(worksheetCss, /\.worksheet-image-timeline\s*\{[^}]*grid-template-columns:\s*repeat\(var\(--timeline-count/);
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
assert.match(serverSource, /if \(content\?\._contentMigrations\?\.searchPenguinMission >= 11\) \{\s*return addGoogleSearchChallenge\(addSearchResultsDetectiveIntroduction\(addSearchKitKeywordChallenge\(content\)\)\);\s*\}/, "Saved migration marker preserves existing missions while applying activity introductions");
assert.match(serverSource, /!\["search-penguin-missions-v1", "search-keyword-challenge-v1", SEARCH_RESULTS_DETECTIVE_ID, SEARCH_AND_FIND_ID\]\.includes\(activity\?\.questionAutoMarkAssessmentId\)/, "Search Results Detective auto-marking is accepted by the server");
assert.match(serverSource, /activity\.questionAutoMarkAssessmentId === "search-keyword-challenge-v1"[\s\S]{0,100}gradeSearchKeywordChallenge\(req\.body\.answers, activityIndex\)/, "Keyword Challenge answers are graded server-side");
assert.match(serverSource, /activity\.questionAutoMarkAssessmentId === SEARCH_RESULTS_DETECTIVE_ID[\s\S]{0,100}gradeSearchResultsDetective\(req\.body\.answers, activityIndex\)/, "Search Results Detective answers are graded server-side");
assert.match(serverSource, /grade\.assessmentId === "search-penguin-missions-v1" \|\|\s*grade\.assessmentId === "search-keyword-challenge-v1" \|\|\s*grade\.assessmentId === SEARCH_RESULTS_DETECTIVE_ID \|\|\s*grade\.assessmentId === SEARCH_AND_FIND_ID/, "Search Results Detective answers are merged into saved question responses");
assert.match(serverSource, /if \(req\.body\.completed && \(activity\?\.assessmentId \|\| activity\?\.identityLessonVersion \|\|\s*activity\?\.questionAutoMarkAssessmentId \|\| activity\?\.researchReport \|\| siteQuestions\)\)/, "Manual completion cannot bypass Search Kit auto-marking");
assert.match(worksheetSource, /function scheduleSearchActivityAutoMark\(activityIndex, assessmentId\)/, "Student worksheet automatically checks complete self-marked activity answers");
assert.match(worksheetSource, /scheduleSearchActivityAutoMark\(activityIndex, activity\.questionAutoMarkAssessmentId\)/, "Answer changes trigger automatic marking");
assert.match(worksheetSource, /function scheduleSearchChoiceCheck\(activityIndex, assessmentId, questionId\)/,
    "Search Results Detective choices are checked as soon as a student selects one");
assert.match(worksheetSource, /Good try! This result may not be the best match/,
    "A non-matching choice receives an encouraging retry message");
assert.match(worksheetSource, /Nice investigating! This result matches what you are looking for/,
    "A matching choice receives positive feedback");
assert.match(worksheetSource, /questionId\.endsWith\("-search-result-doc-track"\)[\s\S]*You found it! The Hokitika River flows through Hokitika Gorge\. Great searching!/,
    "A correct Mission 5 answer receives feedback specific to finding the river");
assert.match(worksheetSource, /if \(\["search-penguin-missions-v1", "search-keyword-challenge-v1", "search-results-detective-v1", "search-and-find-v1"\]\.includes\(activity\?\.questionAutoMarkAssessmentId\)\) \{\s*scheduleSearchActivityAutoMark\(activityIndex, activity\.questionAutoMarkAssessmentId\);/, "Previously saved complete answers are auto-marked when the activity opens");
assert.match(worksheetSource, /"search-keyword-challenge-v1"[\s\S]*"keyword-pounamu-treasure"[\s\S]*"keyword-too-many-results"[\s\S]*"keyword-glowworm-mystery"[\s\S]*"keyword-fix-the-search"[\s\S]*"keyword-hokitika-founded"/, "Keyword Challenge auto-marking waits for its five mission answers");
assert.match(worksheetSource, /"search-and-find-v1"[\s\S]*"search-find-giant-tree"[\s\S]*"search-find-gold-rush-town"[\s\S]*"search-find-mountain-bird"[\s\S]*"search-find-pancake-rocks"[\s\S]*"search-find-glacier-mystery"/, "Search and Find auto-marking waits for its own mission answers");
assert.match(serverSource, /activity\.questionAutoMarkAssessmentId === SEARCH_AND_FIND_ID[\s\S]{0,100}gradeSearchAndFind\(req\.body\.answers, activityIndex\)/, "Search and Find answers are graded server-side");
assert.match(worksheetSource, /"search-results-detective-v1"[\s\S]*"search-result-clock-tower"[\s\S]*"search-result-doc-track"/, "Search Results Detective auto-marking waits for all five mission answers");
assert.match(worksheetSource, /You found a useful result for every mission\. Your activity tick is saved\./,
    "Self-marking celebrates finding a useful result for every mission");
assert.doesNotMatch(worksheetSource, /\$\{grade\.score\} \/ \$\{grade\.total\} answers correct/,
    "Progress feedback does not frame the activity as a score");
assert.match(activityEditorSource, /\.\.\.\(content\.activities\?\.\[activityIndex\]\?\.images\?\.\[index\] \|\| \{\}\)/, "Activity Details preserves photo attribution metadata while editing images");

console.log("Search Kit penguin mission migration regression checks passed.");
