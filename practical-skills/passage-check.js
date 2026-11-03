"use strict";

const POLICY = "rattlesnakes-v1";
const WEATHERING_POLICY = "weathering-storm-v1";
const BIBLIOGRAPHY_POLICY = "bibliography-v1";
const paragraphs = [
    "Rattlesnakes are the most common poisonous snake in the United States and Canada. The first part of the scientific name for all rattlesnakes is Crotalus or Sistrurus. Both of these words mean rattle-tail.",
    "When a rattlesnake becomes angry its tail shakes, making a buzzing or hissing sound. All snakes must shed their skin to grow, and each time a rattlesnake sheds its skin the rattle gets longer. In an adult the rattle can reach 5 cm or more.",
    "Snakes are cold-blooded which means they are only as warm as the air around them unless they can find a place to sun themselves. In cold areas rattlesnakes hibernate. Scientists believe snakes cannot see or hear well. Rattlesnakes are predators so they use their tongue instead of their eyes and ears to sense what is near them. They have small pits between their eyes and nose called loreal pits which allow the snake to detect warm prey even at night.",
    "Rattlesnakes eat small mammals like rats and mice but they can also eat lizards, frogs and birds. They usually strike and let go as their venom works quickly and their prey do not escape. However, if they attack birds they hold on, as birds can fly too far after being bitten for the snake to find them again. Camouflage is the rattlesnake's best defence. It can be difficult to see one when it is lying quietly on the ground."
];
// Words the proofreading marks change (in to/into, shakey, gusts bigger, scarcely/barely, reading) are left out,
// so the passage passes whether or not the student applied the corrections.
const weatheringParagraphs = [
    "The blizzard that began yesterday morning had worked itself up to a raging frenzy by the time we went to bed.",
    "We lay there listening to the ice and stones being blown against the walls, and felt the lurching of the hut as gusts hit us.",
    "We could hear each other speaking as the wind was so ferocious.",
    "In the early hours of morning the winds hit with such force that the walls flexed inward. We thought through our Emergency Evacuation Plan.",
    "Surprisingly, when we checked the hut the next morning, everything was fine.",
    "We were still secured to our rocky perch. The weather station showed that we had endured gusts of up to 120 knots."
];
const bibliographyParagraphs = [
    "A bibliography is a systematic description of books, magazines etc. It is a list of sources where you found information which you have used in your work.",
    "A bibliography is written on a separate sheet of paper, after you have written an essay or assignment. It lists in alphabetical order all of the books, etc which the writer referred to and used. When keying in a bibliography please note the following:",
    "Underline the title of each book, magazine, video. Do not use capital letters, unless proper nouns appear in the titles. Use the publisher's name in its simplest form eg Bushman, not Bushman Press Ltd. The place of publication is the town/city, not country.",
    "Page numbers of article must be included. List alphabetically according to the author of a book, periodical, interview or Internet. List alphabetically according to the title of a CD ROM or video/film.",
    "The Format of a Bibliography (based on American Psychological Association (APA) format)",
    "Hunt, Sam. (1980). Sam Hunt Collected Poems. Middlesex: Penguin. Schonauer, B. (1999). Speechless. Chicago: NSDA.",
    "Philp, M. (1998 November). NZ Listener, pp. 20-22. Encarta. (2001). Microsoft. Phillips, T. (3.5.99). Telephone interview recorded by K Smith.",
    "The End of the Golden Weather. (1991). Auckland: South Pacific Pictures. [video, 103 min.]",
    "Jay, Gary (2001). \"cruising holiday\", email to main@ihug.co.nz, 14 February. Merton, D. (1998). Kakapo Update. http://www.resort.com/~ruhue/kakapo/update98.html"
];
const PASSAGES = {
    [POLICY]: { title: "Rattlesnakes", paragraphs },
    [WEATHERING_POLICY]: { title: "Weathering the Storm", paragraphs: weatheringParagraphs },
    [BIBLIOGRAPHY_POLICY]: { title: "A Bibliography", paragraphs: bibliographyParagraphs }
};
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

function checkPassage(policy, text) {
    const passage = PASSAGES[policy];
    if (!passage) throw Object.assign(new Error("This activity does not have an automatic text check."), { status: 404 });
    const actual = words(text);
    if (actual.length > 20000) throw Object.assign(new Error("This document is too long to check automatically. Ask your teacher to review it."), { status: 422 });
    const results = passage.paragraphs.map((paragraph, index) => {
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
    const missing = results.filter((item) => item.coverage < 0.95)
        .map((item) => `${item.paragraph} ("${passage.paragraphs[item.paragraph - 1].split(/\s+/).slice(0, 5).join(" ")}...")`);
    return {
        passed, coverage: Math.round(coverage * 100),
        paragraphs: results.map(({ paragraph, coverage }) => ({ paragraph, coverage: Math.round(coverage * 100) })),
        message: passed
            ? "Expected passage substantially complete. This checks text presence, not manual typing, formatting or sharing permissions."
            : `Some text is missing or different. Check part${missing.length === 1 ? "" : "s"} ${missing.join(", ")} against the worksheet, then check again.`
    };
}
const checkRattlesnakes = (text) => checkPassage(POLICY, text);

module.exports = { POLICY, WEATHERING_POLICY, BIBLIOGRAPHY_POLICY, PASSAGES, checkPassage, checkRattlesnakes, paragraphs };
