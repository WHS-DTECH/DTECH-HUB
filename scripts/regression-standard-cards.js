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
  .map((match) => match[1]), ["DECODE the question", "Write the model answer", "Check the answer against DECODE"],
  "Model answer follows the three supplied steps");
const modelAnswer = decodeHtml.match(/<div class="decode-answer">([\s\S]*?)<\/div>/)[1];
assert.deepEqual([...modelAnswer.matchAll(/<p>([^<]+)<\/p>/g)].map((match) => match[1]), [
  "Nielsen's Error prevention heuristic means designing an interface to stop users from making mistakes before they happen.",
  "For example, an online appointment booking system could grey out dates that are unavailable, preventing users from selecting them.",
  "This reduces user errors because people can only select available appointments, avoiding incorrect bookings and saving time correcting mistakes."
], "Complete model answer preserves all three supplied paragraphs");
const answerChecks = decodeHtml.match(/<ul class="decode-checklist"[^>]*>([\s\S]*?)<\/ul>/)[1];
assert.deepEqual([...answerChecks.matchAll(/<h4>([^<]+)<\/h4><p>([^<]+)<\/p>/g)].map((match) => [match[1], match[2]]), [
  ["Action", "Describes the principle and explains how it reduces errors."],
  ["Quantity", "Provides exactly ONE example."],
  ["Context", "Uses error prevention in an appointment booking interface."],
  ["Detail", "Explains what the principle means, how it is applied and why it helps users."]
], "Model answer is checked against all four requirements");
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
