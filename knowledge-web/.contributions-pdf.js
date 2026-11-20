"use strict";

const path = require("node:path");
const PDFDocument = require("pdfkit");

const types = { cloud: "Teacher Cloud", kite: "Kite", balloon: "Hot-air balloon", connection: "Explained connection" };
const keyFor = (type, id) => `${type}:${id}`;

function buildContributionSets(records, context) {
    const nodes = new Map(context.map((node, index) => {
        const key = keyFor(node.type, node.id);
        const targets = ["cloud", "kite", "balloon"].flatMap((type) =>
            node[`${type}s`].map((id) => keyFor(type, id)));
        return [key, { ...node, key, targets, label: `${types[node.type]} ${index + 1}` }];
    }));
    const articles = new Map();
    for (const record of records) {
        const key = keyFor(record.subject, record.subjectId);
        if (!articles.has(key)) articles.set(key, { records: [], neighbours: new Set(), owned: null });
        const article = articles.get(key);
        article.records.push(record);
        if (record.kind === record.subject) article.owned = record;
    }

    for (const [key, article] of articles) {
        if (!article.owned) continue;
        // A shared cloud supplies context, not a relationship between two authored records.
        for (const target of nodes.get(key).targets) {
            if (!articles.has(target)) continue;
            article.neighbours.add(target);
            articles.get(target).neighbours.add(key);
        }
    }

    const sets = [];
    const pending = new Set(articles.keys());
    for (const first of pending) {
        const subjects = [first];
        pending.delete(first);
        for (const key of subjects) {
            for (const target of articles.get(key).neighbours) {
                if (pending.delete(target)) subjects.push(target);
            }
        }
        const refs = new Set(subjects);
        for (const key of refs) for (const target of nodes.get(key).targets) refs.add(target);
        const included = new Set(subjects);
        const objects = [...refs].map((key) => ({
            ...nodes.get(key), owned: included.has(key) ? articles.get(key).owned : null
        }));
        sets.push({
            objects,
            records: subjects.flatMap((key) => {
                const { owned, records } = articles.get(key);
                return [...(owned ? [owned] : []), ...records.filter((record) => record !== owned)];
            })
        });
    }
    return sets;
}

const fonts = path.join(path.dirname(require.resolve("dejavu-fonts-ttf/package.json")), "ttf");
const dateFormat = new Intl.DateTimeFormat("en-NZ", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Pacific/Auckland"
});
const ink = "#143347";
const muted = "#426174";
const teal = "#1b5b69";

function renderContributionsPdf({ name, sets, now = new Date() }) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: "A4", margin: 42, bufferPages: true, info: { Title: "Knowledge Web - My Contributions" } });
        const chunks = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("error", reject);
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.registerFont("Body", path.join(fonts, "DejaVuSans.ttf"));
        doc.registerFont("Heading", path.join(fonts, "DejaVuSans-Bold.ttf"));
        const left = doc.page.margins.left;
        const width = doc.page.width - left - doc.page.margins.right;
        const space = (height) => {
            if (doc.y + height > doc.page.maxY()) doc.addPage();
        };
        const text = (value, { size = 10.5, bold = false, color = ink } = {}) => {
            doc.font(bold ? "Heading" : "Body").fontSize(size).fillColor(color)
                .text(value, left, doc.y, { width, lineGap: 2 });
        };
        const field = (label, value) => {
            if (!value) return;
            space(42);
            text(label, { bold: true });
            text(value);
            doc.moveDown(0.35);
        };
        const small = (value, x, y, w, height, bold = false, align = "left") => doc
            .font(bold ? "Heading" : "Body").fontSize(9).fillColor(ink)
            .text(value, x, y, { width: w, height, align, ellipsis: true });
        const displayName = (value) => value && !value.includes("@") ? value : "another contributor";
        const card = (object, x, y, w, showBalloon) => {
            const authored = object.owned;
            doc.roundedRect(x, y, w, 108, 8).fillAndStroke(object.type === "cloud" ? "#edf6fb" : "#f7f9fa", "#b6cdd5");
            const label = object.type === "cloud" ? "Teacher Cloud" : object.label;
            if (object.type === "kite") {
                doc.polygon([x + 17, y + 9], [x + 23, y + 15], [x + 17, y + 24], [x + 11, y + 15]).fill("#e8bf65");
            }
            const offset = object.type === "kite" ? 29 : 9;
            small(label, x + offset, y + 9, w - offset - 9, 14, true);
            if (object.type === "balloon" && authored && showBalloon) {
                const { principle, principleExplanation, idea } = authored.content;
                doc.roundedRect(x + 9, y + 25, w - 18, 38, 17).fillAndStroke("#f9ddd5", "#9d5a50");
                doc.strokeColor("#9d5a50").moveTo(x + 31, y + 63).lineTo(x + 36, y + 70)
                    .moveTo(x + w - 31, y + 63).lineTo(x + w - 36, y + 70).stroke();
                doc.roundedRect(x + 22, y + 70, w - 44, 32, 4).fillAndStroke("#f4e3ba", "#89662f");
                small(principleExplanation || idea, x + 17, y + 29, w - 34, 31, false, "center");
                small(principle, x + 26, y + 74, w - 52, 25, true, "center");
            } else {
                small(object.type === "cloud" ? object.title : authored ? "Your contribution"
                    : `Context only: ${displayName(object.contributor)}`, x + 9, y + 29, w - 18, 56);
            }
        };
        const diagram = (first, second, relation, dashed, showBalloon) => {
            space(125);
            const y = doc.y;
            const cardWidth = (width - 100) / 2;
            const secondX = left + width - cardWidth;
            if (dashed) doc.dash(4, { space: 3 });
            doc.strokeColor(teal).lineWidth(1.5).moveTo(left + cardWidth, y + 52).lineTo(secondX, y + 52).stroke().undash().lineWidth(1);
            small(relation, left + cardWidth + 4, y + 17, 92, 33, true, "center");
            card(first, left, y, cardWidth, showBalloon);
            card(second, secondX, y, cardWidth, false);
            doc.y = y + 119;
        };

        text("Knowledge Web", { size: 12, color: teal });
        text("My Contributions", { size: 24, bold: true });
        text(name, { bold: true });
        text(`Exported ${dateFormat.format(now)}`, { color: muted });
        doc.moveDown();

        if (!sets.length) text("You have no visible authored contributions to export.");
        for (const [index, set] of sets.entries()) {
            space(166);
            text(`Contribution set ${index + 1}`, { size: 15, bold: true, color: teal });
            const objects = new Map(set.objects.map((object) => [object.key, object]));
            field("Teacher Cloud context", set.objects.filter(({ type }) => type === "cloud").map(({ title }) => title).join("\n"));
            const recordById = new Map(set.records.map((record) => [record.id, record]));
            for (const object of set.objects) {
                const targets = object.targets.map((key) => objects.get(key));
                if (object.type === "connection") {
                    if (!object.owned) field(`${object.label} (context only)`, displayName(object.contributor));
                    diagram(targets[0], targets[1], object.label, true, false);
                } else {
                    for (const [targetIndex, target] of targets.entries()) {
                        diagram(object, target, "Original attachment", false, targetIndex === 0);
                    }
                }
            }
            for (const record of set.records) {
                const subject = objects.get(keyFor(record.subject, record.subjectId));
                const { content } = record;
                const heading = record.kind === "comment" ? `${content.replyTo ? "Discussion reply" : "Discussion comment"} on ${subject.label}`
                    : record.kind === "evidence" ? `Supporting evidence on ${subject.label}` : subject.label;
                space(82);
                text(heading, { size: 12, bold: true });
                text(`Created ${dateFormat.format(new Date(record.createdAt))}`, { color: muted, size: 9 });
                if (record.kind === "kite") text(content.argument);
                if (record.kind === "balloon") {
                    field("Theoretical principle (basket)", content.principle);
                    field(content.idea ? "Idea (earlier balloon format)" : "Explanation of the principle (envelope)", content.idea || content.principleExplanation);
                    field(content.idea ? "Relationship between the principle and idea" : "Relationship to the originating cloud or kite (attachment)", content.explanation);
                }
                if (record.kind === "connection") field("Connection explanation", content.explanation);
                if (record.kind === "comment") {
                    const parent = recordById.get(content.replyTo);
                    if (parent) text(`Reply to your comment from ${dateFormat.format(new Date(parent.createdAt))}`, { size: 9, color: muted });
                    text(content.body);
                }
                if (record.kind === "evidence") {
                    field("Title", content.title);
                    field("URL or reference", content.reference);
                    field("Source author or organisation", content.author);
                    field("Source publication date", content.publicationDate);
                    field(`What the evidence ${content.stance === "context" ? "gives context for" : content.stance}`, content.supports);
                }
                doc.moveDown(0.7);
            }
            doc.moveDown();
        }
        const pages = doc.bufferedPageRange();
        for (let index = 0; index < pages.count; index++) {
            doc.switchToPage(pages.start + index);
            const label = `Page ${index + 1} of ${pages.count}`;
            const bottomMargin = doc.page.margins.bottom;
            doc.page.margins.bottom = 0;
            doc.font("Body").fontSize(9).fillColor(muted);
            doc.text(label, left + width - doc.widthOfString(label), doc.page.height - 28, { lineBreak: false });
            doc.page.margins.bottom = bottomMargin;
        }
        doc.end();
    });
}

module.exports = { buildContributionSets, renderContributionsPdf };
