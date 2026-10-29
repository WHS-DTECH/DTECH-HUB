"use strict";

const POLICY = "rattlesnakes-v1";
const paragraphs = [
    "Rattlesnakes are the most common poisonous snake in the United States and Canada. The first part of the scientific name for all rattlesnakes is Crotalus or Sistrurus. Both of these words mean rattle-tail.",
    "When a rattlesnake becomes angry its tail shakes, making a buzzing or hissing sound. All snakes must shed their skin to grow, and each time a rattlesnake sheds its skin the rattle gets longer. In an adult the rattle can reach 5 cm or more.",
    "Snakes are cold-blooded which means they are only as warm as the air around them unless they can find a place to sun themselves. In cold areas rattlesnakes hibernate. Scientists believe snakes cannot see or hear well. Rattlesnakes are predators so they use their tongue instead of their eyes and ears to sense what is near them. They have small pits between their eyes and nose called loreal pits which allow the snake to detect warm prey even at night.",
    "Rattlesnakes eat small mammals like rats and mice but they can also eat lizards, frogs and birds. They usually strike and let go as their venom works quickly and their prey do not escape. However, if they attack birds they hold on, as birds can fly too far after being bitten for the snake to find them again. Camouflage is the rattlesnake's best defence. It can be difficult to see one when it is lying quietly on the ground."
];

function words(text) {
    return String(text).toLowerCase().replace(/[\u2018\u2019']/g, "").match(/[a-z0-9]+/g) || [];
}

function similarWord(a, b) {
    if (a === b) return true;
    if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false;
    let i = 0, j = 0, differences = 0;
    while (i < a.length && j < b.length) {
        if (a[i] === b[j]) { i++; j++; continue; }
        if (++differences > 1) return false;
        if (a.length >= b.length) i++;
        if (b.length >= a.length) j++;
    }
    return differences + (a.length - i) + (b.length - j) <= 1;
}

function checkRattlesnakes(text) {
    const actual = words(text);
    if (actual.length > 20000) throw Object.assign(new Error("This document is too long to check automatically. Ask your teacher to review it."), { status: 422 });
    const results = paragraphs.map((paragraph, index) => {
        const expected = words(paragraph);
        let previous = new Uint16Array(actual.length + 1);
        for (const word of expected) {
            const next = new Uint16Array(actual.length + 1);
            for (let j = 0; j < actual.length; j++) {
                next[j + 1] = similarWord(word, actual[j]) ? previous[j] + 1 : Math.max(previous[j + 1], next[j]);
            }
            previous = next;
        }
        const matched = previous[actual.length];
        return { paragraph: index + 1, matched, expected: expected.length, coverage: matched / expected.length };
    });
    const coverage = results.reduce((sum, item) => sum + item.matched, 0) / results.reduce((sum, item) => sum + item.expected, 0);
    const passed = coverage >= 0.95 && results.every((item) => item.coverage >= 0.90);
    const missing = results.filter((item) => item.coverage < 0.95).map((item) => item.paragraph);
    return {
        passed, coverage: Math.round(coverage * 100),
        paragraphs: results.map(({ paragraph, coverage }) => ({ paragraph, coverage: Math.round(coverage * 100) })),
        message: passed
            ? "Expected passage substantially complete. This checks text presence, not manual typing, formatting or sharing permissions."
            : `Some text is missing or different. Check paragraph${missing.length === 1 ? "" : "s"} ${missing.join(", ")} against the worksheet, then check again.`
    };
}

module.exports = { POLICY, checkRattlesnakes, paragraphs };
