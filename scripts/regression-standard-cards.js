"use strict";

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");

function extractDeclaration(name) {
  const start = server.indexOf(`const ${name} = [`);
  assert.ok(start >= 0, `${name} is declared in server.js`);
  const end = server.indexOf("\n];", start);
  assert.ok(end > start, `${name} ends with a closing bracket`);
  // `const` stays lexically scoped inside vm, so expose the literal as a context property.
  return `globalThis.${server.slice(start + "const ".length, end + 3)}`;
}

const context = vm.createContext({});
vm.runInContext(extractDeclaration("NZQA_STANDARDS_FALLBACK"), context);
vm.runInContext(extractDeclaration("DEFAULT_ASSESSMENT_STANDARD_CARDS"), context);

const { NZQA_STANDARDS_FALLBACK, DEFAULT_ASSESSMENT_STANDARD_CARDS } = context;
const cardsByNumber = new Map(DEFAULT_ASSESSMENT_STANDARD_CARDS.map((card) => [card.standardNumber, card]));

assert.equal(cardsByNumber.size, DEFAULT_ASSESSMENT_STANDARD_CARDS.length,
  "Each standard appears once so seeding cannot overwrite a card with a different one");

// The homepage library builds a card per seeded standard, so every entry needs the full 92007 shape.
for (const card of DEFAULT_ASSESSMENT_STANDARD_CARDS) {
  const label = `AS ${card.standardNumber}`;
  assert.match(card.standardNumber, /^\d{5}$/, `${label} uses an NZQA standard number`);
  assert.ok(card.standardName, `${label} has a standard name`);
  assert.match(card.level, /^Level [123]$/, `${label} has a level`);
  assert.ok(Number.isInteger(card.version), `${label} has a version year`);
  assert.ok(Number.isInteger(card.credits) && card.credits > 0, `${label} has credits`);
  for (const grade of ["achieved", "merit", "excellence"]) {
    assert.ok(String(card[`${grade}Text`] || "").trim(), `${label} has ${grade} text`);
    const checklist = card[`${grade}Checklist`];
    assert.ok(Array.isArray(checklist) && checklist.length > 0, `${label} has a ${grade} checklist`);
    assert.ok(checklist.every((item) => String(item || "").trim()), `${label} has no blank ${grade} checklist rows`);
  }

  const nzqa = NZQA_STANDARDS_FALLBACK.find((standard) =>
    standard.stream === "digital" && standard.standard_number === card.standardNumber);
  if (nzqa) {
    assert.equal(card.standardName, nzqa.standard_name, `${label} matches the NZQA standard name`);
    assert.equal(card.level, `Level ${nzqa.level}`, `${label} matches the NZQA level`);
    assert.equal(card.credits, nzqa.credits, `${label} matches the NZQA credits`);
  }
}

for (const standardNumber of ["92004", "91896", "91906"]) {
  const card = cardsByNumber.get(standardNumber);
  assert.ok(card, `Programming standard ${standardNumber} is in the homepage standard library`);
  assert.match(card.standardName, /program/i, `AS ${standardNumber} is a programming standard`);
}

assert.equal(cardsByNumber.get("92004").level, "Level 1");
assert.equal(cardsByNumber.get("91896").level, "Level 2");
assert.equal(cardsByNumber.get("91906").level, "Level 3");

const client = fs.readFileSync(path.join(root, "assessment-standard-card.js"), "utf8");
const html = fs.readFileSync(path.join(root, "assessment-standard-card.html"), "utf8");
const nodes = Object.fromEntries(["sc-student-guide", "ssg-title", "ssg-purpose", "ssg-meta",
  "ssg-criteria", "ssg-learning-link", "ssg-external-resources"].map((id) => [id, { hidden: true }]));
const teacherShell = { hidden: false };
const guideContext = vm.createContext({
  document: { getElementById: (id) => nodes[id], querySelector: () => teacherShell },
  window: {},
  safeText: (value) => String(value || "").trim()
});
const guideStart = client.indexOf("function getLearningSiteUrlForStandard(");
const guideEnd = client.indexOf("\nasync function renderAssessmentTracker(", guideStart);
vm.runInContext(client.slice(guideStart, guideEnd), guideContext);
for (const standardNumber of ["92006", "91898", "91908", "92007", "91897", "92006", "91909"]) {
  const card = cardsByNumber.get(standardNumber);
  guideContext.renderStudentStandardGuide({
    standardNumber, standardName: card.standardName, yearLevel: card.level, credits: card.credits,
    achievedText: card.achievedText, meritText: card.meritText, excellenceText: card.excellenceText,
    achievedChecklist: card.achievedChecklist, meritChecklist: card.meritChecklist, excellenceChecklist: card.excellenceChecklist
  });
  assert.equal(nodes["ssg-external-resources"].hidden, standardNumber !== "92006",
    "Usability resources are only shown for AS 92006, and switching standards hides them");
  assert.equal(teacherShell.hidden, true, "Student guide retains the existing teacher-shell behaviour");
  assert.ok(nodes["ssg-criteria"].innerHTML.includes(card.achievedText), "Grade criteria remain visible");
}
const resourceMarkup = html.match(/<section class="student-standard-study-resources"[\s\S]*?<\/section>/)[0];
assert.equal((resourceMarkup.match(/class="student-standard-study-column(?: |")/g) || []).length, 3,
  "Study area has three columns, including the four-stage right column");
assert.ok(html.indexOf('id="ssg-criteria"') < html.indexOf('id="ssg-external-resources"'),
  "New study area appears below the existing criteria");
const stageMarkup = resourceMarkup.match(/<ol class="student-standard-study-stages"[^>]*>([\s\S]*?)<\/ol>/)[1];
const stages = [...stageMarkup.matchAll(/<li class="([^"]+)">([\s\S]*?)<\/li>/g)];
assert.deepEqual(stages.map((stage) => [
  stage[1], stage[2].match(/<h4>(.*?)<\/h4>/)[1], stage[2].match(/<p>(.*?)<\/p>/)[1]
]), [
  ["decode", "Decode", "Read the question."],
  ["think", "Think", "5Ws &amp; H."],
  ["write", "Write", "SEED."],
  ["check", "Check", "Answer the question?"]
], "Pastel cards preserve the four instructions in order as readable text");
assert.doesNotMatch(resourceMarkup.replace(/<[^>]+>/g, ""), /Stage/i,
  "Stage wording is not displayed in the answering column");
for (const stage of stages) {
  assert.match(stage[2], /<svg [^>]*aria-hidden="true"/,
    "Decorative icons do not duplicate the readable instructions for screen readers");
}
assert.doesNotMatch(stageMarkup, /<img/, "Answering cards no longer use black-background pictures");
const decodeLink = stages[0][2].match(/<a href="([^"]+)">/);
assert.ok(decodeLink, "Entire Decode card links to its concept page");
const decodeHtml = fs.readFileSync(path.join(root, decodeLink[1]), "utf8");
const concepts = [...decodeHtml.matchAll(/<li>\s*<h3><span[^>]*>\d<\/span>([^<]+)<\/h3>\s*<p>([^<]+)<\/p>/g)];
assert.deepEqual(concepts.map((concept) => [concept[1], concept[2]]), [
  ["Action", "What am I being asked to do?"],
  ["Quantity", "How many things are required?"],
  ["Context", "What must my answer refer to?"],
  ["Detail", "What specific information must I include?"]
], "Dedicated Decode page preserves all four supplied prompts in order");
assert.match(decodeHtml, /href="assessment-standard-card.html\?standard=92006"/,
  "Decode page returns to the Level 1 standard");
assert.match(decodeHtml, /\.decode-grid \{[\s\S]*?grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/,
  "Four Decode concepts appear across desktop screens");
assert.match(decodeHtml, /@media \(max-width: 620px\) \{\s*\.decode-grid \{ grid-template-columns: 1fr;/,
  "Decode concepts stack on small screens");
const exampleQuestion = decodeHtml.match(/<blockquote>([\s\S]*?)<\/blockquote>/)[1];
assert.deepEqual([...exampleQuestion.matchAll(/<strong>([^<]+)<\/strong>/g)].map((match) => match[1]),
  ["Describe", "Give", "describe"], "Worked question identifies each action word");
assert.match(exampleQuestion, /<mark>ONE specific example<\/mark>/, "Worked question highlights the quantity");
const breakdown = decodeHtml.match(/<dl>([\s\S]*?)<\/dl>/)[1];
assert.deepEqual([...breakdown.matchAll(/<dt>[\s\S]*?<\/span>([^<]+)<\/dt>\s*<dd>([^<]+)<\/dd>/g)]
  .map((match) => [match[1], match[2]]), [
  ["Action", "Describe, Give, Describe."],
  ["Quantity", "ONE specific example."],
  ["Context", "Nielsen's Error prevention heuristic in a human-computer interface."],
  ["Detail", "Explain the principle, provide an example and describe how it reduces user mistakes."]
], "Worked example includes all four supplied explanations as readable text");
assert.match(decodeHtml, /<strong class="decode-remember-title">Remember<\/strong> DECODE helps you work out what to include in your answer before you start writing\./,
  "Worked example retains the planning reminder");
assert.deepEqual([...decodeHtml.matchAll(/<h3 class="decode-step-heading"[^>]*><span[^>]*>\d<\/span>([^<]+)<\/h3>/g)]
  .map((match) => match[1]), ["DECODE the question", "Check the answer against DECODE", "Your Turn &ndash; DECODE"],
  "Worked example is followed by the DECODE self-check and student practice in order");
assert.ok(decodeHtml.indexOf('<h3 class="decode-step-heading" id="decode-step-one"') <
  decodeHtml.indexOf('<h3 class="decode-step-heading" id="decode-step-two"'),
  "DECODE self-check follows the worked question breakdown");
const practiceFields = [...decodeHtml.matchAll(/<label for="decode-practice-(action|quantity|context|detail)">([^<]+)<\/label>/g)]
  .map((match) => [match[1], match[2]]);
assert.deepEqual(practiceFields, [
  ["action", "1. Action"],
  ["quantity", "2. Quantity"],
  ["context", "3. Context"],
  ["detail", "4. Detail"]
], "Your Turn provides four labelled answer fields in DECODE order");
const hiddenModel = decodeHtml.match(/<details class="decode-model-disclosure">([\s\S]*?)<\/details>/)[1];
assert.match(hiddenModel, /^\s*<summary>Compare with model answers<\/summary>/,
  "Practice model is hidden behind the requested disclosure control");
assert.ok(hiddenModel.indexOf('id="decode-hidden-breakdown"') < hiddenModel.indexOf('class="decode-written-model"'),
  "Hidden model presents the DECODE breakdown before the written answer");
const modelBreakdown = hiddenModel.match(/<div class="decode-model-breakdown">([\s\S]*?)<\/div>\s*<\/section>/)[1];
assert.deepEqual([...modelBreakdown.matchAll(/<h5>[\s\S]*?<\/span>([^<]+)<\/h5>/g)].map((match) => match[1]), [
  "ACTION &ndash; Describe, Give, Describe",
  "QUANTITY &ndash; ONE example",
  "CONTEXT &ndash; Error prevention in an interface",
  "DETAIL &ndash; Explain how errors are reduced"
], "Hidden DECODE model breaks the question into the four supplied requirements");
const modelAnswer = hiddenModel.match(/<div class="decode-answer">([\s\S]*?)<\/div>/)[1];
assert.deepEqual([...modelAnswer.matchAll(/<p>([^<]+)<\/p>/g)].map((match) => match[1]), [
  "Nielsen's Error prevention heuristic means designing an interface to stop users from making mistakes before they happen.",
  "For example, an online appointment booking system could grey out dates that are unavailable, preventing users from selecting them.",
  "This reduces user errors because people can only select available appointments, avoiding incorrect bookings and saving time correcting mistakes."
], "Hidden written model answer preserves all three supplied paragraphs after its breakdown");
const answerChecks = decodeHtml.match(/<ul class="decode-checklist"[^>]*>([\s\S]*?)<\/ul>/)[1];
assert.deepEqual([...answerChecks.matchAll(/<h4>([^<]+)<\/h4><p>([^<]+)<\/p>/g)].map((match) => [match[1], match[2]]), [
  ["Action", "Describes the principle and explains how it reduces errors."],
  ["Quantity", "Provides exactly ONE example."],
  ["Context", "Uses error prevention in an appointment booking interface."],
  ["Detail", "Explains what the principle means, how it is applied and why it helps users."]
], "DECODE self-check provides the four supplied criteria before the hidden model");
assert.match(decodeHtml, /\.decode-practice-fields \{ display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
assert.match(decodeHtml, /\.decode-model-disclosure summary:[\s\S]*?focus-visible/);
assert.match(decodeHtml, /@media \(max-width: 620px\) \{[\s\S]*?\.decode-practice-fields \{ grid-template-columns: minmax\(0, 1fr\);/,
  "Practice fields stack on small screens");
assert.match(decodeHtml, /DECODE is <em>not<\/em> a paragraph-writing formula\.[\s\S]*?<strong>5Ws &amp; H<\/strong> to develop your ideas and <strong>SEED<\/strong> to organise longer written responses\./,
  "Reminder distinguishes decoding from idea development and paragraph organisation");
const thinkLink = stages[1][2].match(/<a href="([^"]+)">/);
assert.ok(thinkLink, "Entire Think card links to its concept page");
const thinkHtml = fs.readFileSync(path.join(root, thinkLink[1]), "utf8");
const thinkPrompts = [...thinkHtml.matchAll(/<li>\s*<h3><span[^>]*>\d<\/span>([^<]+)<\/h3>\s*<p>([^<]+)<\/p>/g)];
assert.deepEqual(thinkPrompts.map((prompt) => [prompt[1], prompt[2]]), [
  ["What?", "What is the technical concept or principle?"],
  ["Who?", "Who uses it or is affected by it?"],
  ["Where?", "Where is it used or applied?"],
  ["When?", "When does it become important?"],
  ["Why?", "Why does it matter to the user?"],
  ["How?", "How does it work or affect the user?"]
], "Think page preserves the six supplied questions in order");
assert.ok(thinkHtml.includes("Before writing your answer, use <strong>Who, What, Where, When, Why and How</strong> to explore your technical knowledge and develop your ideas. These questions help you identify relevant examples, explain how technology works and consider its effects on users."),
  "Think page includes the complete supplied introduction");
assert.match(thinkHtml, /href="assessment-standard-card.html\?standard=92006"/,
  "Think page returns to the Level 1 standard");
assert.match(thinkHtml, /\.think-grid \{[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/,
  "Think prompts form a three-column desktop grid");
assert.match(thinkHtml, /@media \(max-width: 620px\) \{\s*\.think-grid \{ grid-template-columns: minmax\(0, 1fr\);/,
  "Think prompts stack on small screens");
const thinkSectionOrder = [...thinkHtml.matchAll(/<section[^>]* aria-labelledby="([^"]+)"/g)].map((match) => match[1]);
assert.deepEqual(thinkSectionOrder, [
  "think-title", "think-concepts-title", "think-types-title", "think-example-title", "think-reflection-title", "think-reminder-title"
], "Think page places the thinking types before the worked example and reflection, in the requested image order");
assert.match(thinkHtml, /WHAT, WHO, WHERE and WHEN<\/p>\s*<h3>Build the facts<\/h3>/);
assert.match(thinkHtml, /WHY and HOW<\/p>\s*<h3>Develop your explanation<\/h3>/);
const thinkExample = thinkHtml.match(/<dl class="think-example-list">([\s\S]*?)<\/dl>/)[1];
assert.deepEqual([...thinkExample.matchAll(/<dt><span[^>]*>([^<]+)<\/span>([^<]+)<\/dt>\s*<dd>([^<]+)<\/dd>/g)]
  .map((match) => [match[1], match[2], match[3]]), [
  ["WHAT?", "What is the technology?", "Multi-factor authentication (MFA) is a security method that requires users to verify their identity using two or more different types of authentication factors."],
  ["WHO?", "Who uses it or is affected?", "Teachers and staff accessing student information, as well as the students whose information is protected."],
  ["WHERE?", "Where is it used?", "When signing into school accounts or systems containing confidential information."],
  ["WHEN?", "When is it important?", "When someone signs in to a protected school account, especially when their password may have been compromised."],
  ["WHY?", "Why does it matter?", "It reduces the risk of someone accessing private information using a stolen password."],
  ["HOW?", "How does it work?", "A user enters their password and then verifies their identity using a different factor, such as an authenticator app or security key."]
], "Worked example preserves all six supplied MFA explanations");
assert.match(thinkHtml, /<blockquote>Explain how multi-factor authentication works and how it could help protect a school's student information from unauthorised access\.<\/blockquote>/,
  "Worked example includes the supplied examination question");
assert.match(thinkHtml, /Which of your 5Ws &amp; H ideas actually help answer the examination question\?/,
  "Reflection asks students to select relevant ideas");
const thinkReminder = thinkHtml.match(/<section class="think-concepts think-reminder"[^>]*>([\s\S]*?)<\/section>/)[1];
assert.deepEqual([...thinkReminder.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((match) => match[1].replace(/<\/?strong>/g, "")), [
  "Not every idea needs to appear in your answer!",
  "Use WHAT, WHO, WHERE and WHEN to gather relevant facts. Use WHY and HOW to develop your technical explanation.",
  "Choose the information that directly answers the examination question. More information does not necessarily mean a better answer."
], "Closing reminder preserves the supplied guidance on selecting relevant ideas");
const writeLink = stages[2][2].match(/<a href="([^"]+)">/);
assert.ok(writeLink, "Entire Write card links to its SEED page");
const writeHtml = fs.readFileSync(path.join(root, writeLink[1]), "utf8");
const writeSections = [...writeHtml.matchAll(/<section[^>]* aria-labelledby="([^"]+)">([\s\S]*?)<\/section>/g)];
assert.deepEqual(writeSections.map((section) => section[1]), [
  "write-title", "seed-parts-title", "write-example-title", "seed-annotated-title", "seed-completed-title"
], "Write page follows the five supplied sections");
const seedParts = [
  ["seed-statement", "S", "Statement"],
  ["seed-explain", "E", "Explain or Expand"],
  ["seed-evidence", "E", "Example or Evidence"],
  ["seed-discuss", "D", "Discuss or Depth"]
];
for (const section of writeSections.slice(1, 4)) {
  assert.deepEqual([...section[2].matchAll(/class="seed-part ([^"]+)">\s*<h3><span[^>]*>([SED])<\/span>([^<]+)<\/h3>/g)]
    .map((match) => [match[1], match[2], match[3]]), seedParts,
  "SEED parts retain their letters, full labels and colour classes across definitions and examples");
}
const seedModelText = [
  "CrowdCare's predictions could be biased because social media activity does not necessarily represent the emergency-service needs of an entire community.",
  "People who use social media frequently generate more data, while people with limited internet access may be underrepresented. This means the system could mistake high levels of online activity for high demand for emergency services.",
  "For example, CrowdCare may rank a suburb with many social media posts as high priority, while ranking a less-connected suburb as low priority, even if both have similar emergency-service needs.",
  "As a result, emergency resources could be directed towards areas with greater digital activity rather than greater need. This could disadvantage less-connected communities. CrowdCare should therefore use additional evidence, such as ambulance call-outs and hospital demand, while checking whether these sources also underrepresent particular communities."
];
for (const section of writeSections.slice(2, 4)) {
  const paragraphs = [...section[2].matchAll(/<h3>[\s\S]*?<\/h3>\s*<p>([^<]+)<\/p>/g)].map((match) => match[1]);
  assert.deepEqual(paragraphs, seedModelText, "Worked and labelled models preserve every supplied sentence");
}
const completedSeed = writeSections[4][2].match(/<p class="seed-completed">([\s\S]*?)<\/p>/)[1];
const highlights = [...completedSeed.matchAll(/<span class="(seed-[^"]+)"><span class="visually-hidden">([^<]+)<\/span>([^<]+)<\/span>/g)];
assert.deepEqual(highlights.map((match) => match[1]), seedParts.map((part) => part[0]),
  "Completed paragraph uses matching SEED colour classes in order");
assert.deepEqual(highlights.map((match) => match[2]), seedParts.map((part) => `${part[2]}: `),
  "Completed paragraph identifies each part for screen readers, not only by colour");
assert.deepEqual(highlights.map((match) => match[3]), seedModelText,
  "Colour coding preserves the complete continuous model paragraph");
assert.match(writeHtml, /href="assessment-standard-card.html\?standard=92006"/,
  "Write page returns to the Level 1 standard");
const checkLink = stages[3][2].match(/<a href="([^"]+)">/);
assert.ok(checkLink, "Entire Check card links to its concept page");
const checkHtml = fs.readFileSync(path.join(root, checkLink[1]), "utf8");
assert.match(checkHtml, /<h1 id="check-title">CHECK &ndash; Answer the Question\?<\/h1>/,
  "Check page has the requested heading");
assert.deepEqual([...checkHtml.matchAll(/<li><a class="(decode|think|write)" href="([^"]+)"><strong>([^<]+)<\/strong><small>([^<]+)<\/small><\/a><\/li>/g)]
  .map((match) => [match[1], match[2], match[3], match[4]]), [
  ["decode", "assessment-decode.html", "DECODE", "Requirements"],
  ["think", "assessment-think.html", "THINK", "Ideas"],
  ["write", "assessment-write.html", "WRITE", "Response"]
], "Check page links back through the first three steps in the supplied answer-process order");
assert.match(checkHtml, /<span class="check" aria-current="step"><strong>CHECK<\/strong><small>Evidence<\/small><\/span>/,
  "Answer-process ribbon marks Check as the current step");
assert.match(checkHtml, /Bring everything together! Use <strong>DECODE, THINK and WRITE<\/strong> to develop an examination answer, then <strong>CHECK<\/strong> that you have answered every part of the question with accurate technical explanations, relevant examples and clear reasoning\./,
  "Check page preserves its supplied introduction");
const checkQuestion = checkHtml.match(/<figure class="check-question">([\s\S]*?)<\/figure>/)[1];
assert.match(checkQuestion, /Example question &ndash; AS 92006, Part C/);
assert.match(checkQuestion, /Name ONE sufficiently complex interface that is commonly used or easily recognisable and that you studied before this assessment\. State the purpose of the interface\./);
assert.match(checkQuestion, /Explain how effectively TWO different usability principles have been applied in the interface\./);
assert.deepEqual([...checkQuestion.matchAll(/<li>([^<]+)<\/li>/g)].map((match) => match[1]), [
  "Identify a specific interface feature.",
  "Explain how the feature applies the principle.",
  "Explain how it affects the interface's ability to achieve its purpose."
], "AS 92006 Part C retains each of its three per-principle requirements");
assert.match(checkHtml, /<section class="check-work-grid" aria-label="Write and check your answer">/,
  "Answer-writing, self-check and model answer share the three-column work area");
assert.match(checkHtml, /<textarea class="check-answer-input" id="student-answer" name="student-answer" placeholder="Write your response here\.\.\."><\/textarea>/,
  "Students have a dedicated written-answer area");
assert.deepEqual([...checkHtml.matchAll(/<li><label><input type="checkbox"><span>([^<]+)<\/span><\/label><\/li>/g)].map((match) => match[1]), [
  "I named ONE interface and stated its purpose.",
  "I identified TWO different usability principles.",
  "I identified a specific feature for EACH principle.",
  "I explained HOW each feature applies its principle.",
  "I explained WHY each feature helps the interface achieve its purpose.",
  "I examined HOW EFFECTIVELY both principles are applied.",
  "My technical explanations are accurate and supported by relevant examples."
], "Student self-check contains all seven supplied criteria");
assert.match(checkHtml, /<details class="check-model">\s*<summary>Reveal model answer<\/summary>/,
  "Model answer is hidden in a native disclosure until requested");
assert.match(checkHtml, /Usability Principle 1 &ndash; Visibility of system status/);
assert.match(checkHtml, /Usability Principle 2 &ndash; User control and freedom/);
assert.equal([...checkHtml.matchAll(/<p class="seed-statement">/g)].length, 2);
assert.equal([...checkHtml.matchAll(/<p class="seed-explain">/g)].length, 2);
assert.equal([...checkHtml.matchAll(/<p class="seed-evidence">/g)].length, 2);
assert.equal([...checkHtml.matchAll(/<p class="seed-discuss">/g)].length, 2);
assert.match(checkHtml, /<button class="check-reset" id="check-reset" type="button">Reset checklist<\/button>/,
  "Student self-check can be reset");
assert.match(checkHtml, /checkedCount\} of \$\{selfCheckBoxes\.length\} checked/,
  "Student self-check reports the number of criteria checked");
const checkScenario = checkHtml.match(/<div class="check-scenario">([\s\S]*?)<\/div>/)[1];
const scenarioParagraphs = [...checkScenario.matchAll(/<p(?: class="check-consider")?>([\s\S]*?)<\/p>/g)]
  .map((match) => match[1].replace(/<[^>]+>/g, "").trim());
assert.deepEqual(scenarioParagraphs, [
  "A student is travelling from Hokitika to Greymouth for a sports event. They use Google Maps to find the venue, plan their journey and navigate to their destination.",
  "After entering the destination, Google Maps displays possible routes, estimated travel times and distances. The student selects a route and starts navigation.",
  "During the journey, Google Maps displays their current location, upcoming turns and estimated arrival time. The student can follow their progress on the map as they travel.",
  "Partway through the journey, the student decides to take a different route. Google Maps allows them to select an alternative route or stop navigation if their plans change.",
  "Consider: How do these features help the student complete their journey? How effectively does Google Maps support the needs of its users?"
], "Check page preserves the complete supplied Google Maps scenario and reflection");
assert.match(checkHtml, /\.check-work-grid \{ display: grid; grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/,
  "Student answer, self-check and model answer display in three desktop columns");
assert.match(checkHtml, /@media \(max-width: 900px\)[\s\S]*?\.check-work-grid \{ grid-template-columns: minmax\(0, 1fr\); \}/,
  "Three-column work area stacks on smaller screens");
assert.match(checkHtml, /href="assessment-standard-card.html\?standard=92006"/,
  "Check page returns to the Level 1 standard");
const resourceLinks = [...resourceMarkup.matchAll(/<a class="student-standard-study-link[^"]*" href="([^"]+)"([^>]+)>\s*<img src="([^"]+)"/g)];
assert.deepEqual(resourceLinks.map((match) => match[1]), [
  "https://docs.google.com/presentation/d/1NC3TENDS_0XBDVMfFxgxdVAS2_sPn1ESp8RRP_xKYxY/edit?usp=sharing",
  "https://drive.google.com/file/d/1Jy7rVeCvVH5Yzl39Apc8VZn2wP0I1B8H/view?usp=drive_link",
  "https://drive.google.com/file/d/16h6Uhwq7cj2BH8OTU1NYI3XIw7SlR09q/view?usp=drive_link"
], "Slideshow, Tutorial and Cram Cards images open the requested resources in column order");
for (const link of resourceLinks) {
  assert.match(link[2], /target="_blank" rel="noopener noreferrer"/);
  const image = fs.readFileSync(path.join(root, link[3]));
  assert.equal(image.subarray(1, 4).toString(), "PNG", "Clickable resource images are real PNG files");
}
assert.match(html, /@media \(max-width: 620px\)[\s\S]*\.student-standard-study-grid \{\s*grid-template-columns: 1fr;/,
  "Study area stacks on small screens");
assert.match(html, /\.student-standard-study-resources\[hidden\] \{ display: none; \}/);

console.log("Assessment standard card library and student resource regressions passed.");
