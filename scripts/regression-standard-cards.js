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

console.log("Assessment standard card library regressions passed.");
