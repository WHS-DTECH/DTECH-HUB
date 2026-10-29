(function (root, factory) {
    if (typeof module === "object" && module.exports) module.exports = factory();
    else root.ActivityBlocks = factory();
})(typeof window === "object" ? window : globalThis, () => {
    "use strict";
    const types = {
        text: "Text / Instructions", image: "Image", tasks: "Task List", question: "Question",
        link: "Website Link", studentlink: "Student Add a Link", resource: "Resource File", checkbox: "Checkbox", table: "Table",
        wordsearch: "Word Search", document: "Create Document", crossword: "Crossword", schoollicence: "School Licence Viewer"
    };
    const interactive = ["question", "checkbox", "wordsearch", "crossword", "document", "table", "studentlink"];
    const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    function safeUrl(value) {
        try {
            const url = new URL(value);
            return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
        } catch (_) { return ""; }
    }
    function specialised(activity) {
        return Boolean(activity?.assessmentId || activity?.assessment || activity?.identityLessonVersion ||
            activity?.questionAutoMarkAssessmentId || activity?.researchReport || activity?.loginSites);
    }
    function studentUrl(value, driveOnly = false, driveFolderOnly = false) {
        const url = typeof value === "string" && value.trim().length <= 5000 ? safeUrl(value.trim()) : "";
        if (url && driveFolderOnly) {
            const parsed = new URL(url);
            return parsed.origin === "https://drive.google.com" &&
                /^\/drive\/(?:u\/\d+\/)?folders\/[A-Za-z0-9_-]+\/?$/.test(parsed.pathname) ? url : "";
        }
        return url && (!driveOnly || ["drive.google.com", "docs.google.com"].includes(new URL(url).hostname)) ? url : "";
    }
    function initialBlocks(activity, index, content) {
        if (Array.isArray(activity.blocks)) return activity.blocks;
        if (specialised(activity)) return [];
        const questions = activity.questions || (index === 0 ? content.questions : []) || [];
        const images = activity.images || (index === 0 ? content.images : []) || [];
        return [
            ...images.map((image, i) => ({ ...image, id: `legacy-image-${i}`, kind: "image" })),
            ...questions.map((q, i) => ({ ...q, id: `legacy-q-${i}`, kind: "question", questionType: q.type || "short-answer",
                responseKey: index ? `${index}-${q.id}` : q.id, title: q.heading || "", text: q.prompt, required: true }))
        ];
    }
    function entries(block) {
        return String(block.entries || "").split(/\r?\n/).filter((s) => s.trim()).map((line) => {
            const [word, ...clue] = line.split("|");
            return { word: word.trim().toUpperCase(), clue: clue.join("|").trim() };
        });
    }
    function savedAnswers(activity, index, responses) {
        const saved = responses?.[`${index}-blocks`];
        const answers = saved && typeof saved === "object" && !Array.isArray(saved) ? { ...saved } : {};
        for (const b of activity.blocks || []) {
            if (b.responseKey && answers[b.id] === undefined && responses?.[b.responseKey] !== undefined) answers[b.id] = responses[b.responseKey];
        }
        return answers;
    }
    function withFilesFoldersLinks(content) {
        content = withGoogleDrawingsLinks(content);
        if (!/files\s*(?:&|and)\s*folders/i.test(String(content?.identity?.name || content?.bannerTitle || ""))) return content;
        let changed = false;
        const activities = [...(content.activities || [])];
        (content.worksheets || []).forEach((worksheet, index) => {
            if (!worksheet || worksheet.hidden || worksheet.mergedInto !== undefined) return;
            const activity = activities[index] || {};
            let blocks = initialBlocks(activity, index, content);
            if (!blocks.some((b) => b.kind === "studentlink")) blocks = [...blocks, {
                id: `files-folders-link-${index}`, kind: "studentlink", required: true,
                title: `Share your link for ${worksheet.activity || activity.title || `Activity ${index + 1}`}`,
                text: "Paste the HTTPS sharing link to your document or PDF, not a local Windows file path. Share it so your teacher can open it. Use a different file for each activity."
            }];
            blocks = blocks.map((b) => b.kind === "studentlink" && !b.required ? { ...b, required: true } : b);
            const documentCheck = /^rattlesnakes$/i.test(String(worksheet.activity || activity.title || "").trim())
                ? "rattlesnakes-v1" : activity.documentCheck;
            if (activity.completionMode !== "auto" || activity.uniqueDocumentLinks !== true ||
                activity.documentCheck !== documentCheck ||
                !activity.blocks || blocks.length !== activity.blocks.length || blocks.some((b, i) => b !== activity.blocks[i])) {
                changed = true;
                activities[index] = { ...activity, blocks, completionMode: "auto", uniqueDocumentLinks: true,
                    ...(documentCheck ? { documentCheck } : {}) };
            }
        });
        return changed ? { ...content, activities } : content;
    }
    function withGoogleDrawingsLinks(content) {
        if (!/^google\s+drawings\s+kit$/i.test(String(content?.identity?.name || content?.bannerTitle || "").trim())) return content;
        const activities = [...(content.activities || [])];
        let changed = false;
        (content.worksheets || []).forEach((worksheet, index) => {
            if (!worksheet || worksheet.hidden || worksheet.mergedInto !== undefined ||
                !/^(?:ship|tv|flower pot)$/i.test(String(worksheet.activity || "").trim())) return;
            const activity = activities[index] || {};
            let blocks = initialBlocks(activity, index, content);
            const ship = /^ship$/i.test(String(worksheet.activity).trim()) && !activity.shipShapesReferenceVersion;
            if (ship) blocks = [
                { id: "ship-shapes-reference", kind: "image", title: "Ship reference picture",
                    url: "https://dtech-hub2.onrender.com/practical-skills/images/ship-reference.png",
                    alt: "A sailing ship with a dark hull, two masts, several sails, a flag, lightning bolts and a starburst-shaped sea.",
                    caption: "Use this ship as your reference. Create your own similar drawing using Insert > Shape." },
                { id: "ship-shapes-instructions", kind: "tasks", title: "Build your ship with shapes",
                    text: "Open Google Drawings and create your own ship similar to the reference picture.\nUse Insert > Shape to build the main parts: the hull, sails, masts, flag and sea. Resize, rotate and layer the shapes to fit your design.\nUse fill colours and borders to make the ship clear. You can use lines for extra details, but do not build the whole picture with the Line tool only.\nDo not paste the reference picture as your finished work. Your drawing should contain your own separate, editable shapes.\nCheck that your picture looks like a sailing ship with a hull, masts and sails. It does not need to be an exact copy.\nShare your finished drawing so your teacher can open it, then paste its Share Link below. The automatic tick confirms a saved link only; your teacher may review the drawing and its shapes." },
                ...blocks
            ];
            if (!blocks.some((block) => block.kind === "studentlink")) blocks = [...blocks, {
                id: `google-drawings-share-link-${index}`, kind: "studentlink", required: true,
                title: `${worksheet.activity} Share Link`,
                text: "Paste the HTTPS sharing link to your finished drawing. Set sharing so your teacher can open it. Your link is saved and the activity ticks automatically. This checks the link, not the drawing contents or sharing permissions."
            }];
            blocks = blocks.map((block) => {
                const required = block.kind === "studentlink";
                return Boolean(block.required) === required ? block : { ...block, required };
            });
            if (ship || activity.completionMode !== "auto" || activity.shareLinkCompletion !== true ||
                !activity.blocks || blocks.length !== activity.blocks.length || blocks.some((block, i) => block !== activity.blocks[i])) {
                activities[index] = { ...activity, blocks, completionMode: "auto", shareLinkCompletion: true,
                    ...(ship ? { shipShapesReferenceVersion: 1 } : {}) };
                changed = true;
            }
        });
        return changed ? { ...content, activities } : content;
    }
    function documentLinkKey(value) {
        const safe = studentUrl(value);
        if (!safe) return "";
        const url = new URL(safe);
        if (["docs.google.com", "drive.google.com"].includes(url.hostname)) {
            const id = url.pathname.match(/\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/)?.[1] ||
                (/^\/(?:open|uc)$/.test(url.pathname) ? url.searchParams.get("id") : "");
            if (id) return `google-file:${id}`;
        }
        if (url.hostname.endsWith(".sharepoint.com") || ["onedrive.live.com", "1drv.ms"].includes(url.hostname)) {
            const id = url.searchParams.get("sourcedoc") || url.searchParams.get("resid") || url.searchParams.get("id");
            if (id) return `${url.hostname}:file:${id.toLowerCase().replace(/[{}]/g, "")}`;
        }
        return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
    }
    function publicActivity(activity) {
        if (!activity || !Array.isArray(activity.blocks)) return activity;
        return { ...activity, blocks: activity.blocks.map((block) => {
            if (block.kind !== "schoollicence") return block;
            const { licenceValue, ...visible } = block;
            return visible;
        }) };
    }
    function puzzle(block) {
        const words = entries(block);
        const size = block.kind === "crossword" ? 31 : 18;
        const grid = Array.from({ length: size }, () => Array(size).fill(""));
        const directions = Array.from({ length: size }, () => Array(size).fill(0));
        const placed = [];
        words.forEach((entry, i) => {
            let best = null;
            for (let direction = 0; direction < 2; direction += 1) {
                const dr = direction, dc = 1 - direction;
                for (let r = 0; r < size; r += 1) for (let c = 0; c < size; c += 1) {
                    if (r + dr * (entry.word.length - 1) >= size || c + dc * (entry.word.length - 1) >= size) continue;
                    let crossings = 0, valid = true;
                    const cells = [];
                    for (let k = 0; k < entry.word.length; k += 1) {
                        const row = r + dr * k, col = c + dc * k;
                        cells.push([row, col]);
                        if (grid[row][col]) {
                            if (grid[row][col] !== entry.word[k]) { valid = false; break; }
                            if (block.kind === "crossword" && (directions[row][col] & (1 << direction))) { valid = false; break; }
                            crossings += 1;
                        } else if (block.kind === "crossword") {
                            const neighbours = dr ? [[row, col - 1], [row, col + 1]] : [[row - 1, col], [row + 1, col]];
                            if (neighbours.some(([nr, nc]) => grid[nr]?.[nc])) { valid = false; break; }
                        }
                    }
                    if (block.kind === "crossword" && (grid[r - dr]?.[c - dc] || grid[r + dr * entry.word.length]?.[c + dc * entry.word.length])) valid = false;
                    if (!valid || crossings === entry.word.length) continue;
                    const rank = crossings * 10000 - r * 40 - c + (direction === i % 2 ? 1 : 0);
                    if (!best || rank > best.rank) best = { cells, rank, direction };
                }
            }
            if (!best) throw new Error(`Could not place "${entry.word}". Use fewer or shorter puzzle words.`);
            best.cells.forEach(([r, c], k) => { grid[r][c] = entry.word[k]; directions[r][c] |= 1 << best.direction; });
            placed.push({ ...entry, cells: best.cells, direction: best.direction ? "Down" : "Across", number: i + 1 });
        });
        let rows = size, cols = size;
        if (block.kind === "wordsearch") {
            for (let r = 0; r < size; r += 1) for (let c = 0; c < size; c += 1) if (!grid[r][c]) grid[r][c] = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[(r * 7 + c * 11 + 3) % 26];
        } else {
            rows = Math.max(1, ...placed.flatMap((p) => p.cells.map(([r]) => r + 1)));
            cols = Math.max(1, ...placed.flatMap((p) => p.cells.map(([, c]) => c + 1)));
            const starts = [...new Set(placed.map((p) => p.cells[0].join("-")))].sort((a, b) => {
                const [ar, ac] = a.split("-").map(Number), [br, bc] = b.split("-").map(Number);
                return ar - br || ac - bc;
            });
            placed.forEach((p) => { p.number = starts.indexOf(p.cells[0].join("-")) + 1; });
        }
        return { grid: grid.slice(0, rows).map((row) => row.slice(0, cols)), placed };
    }
    function validate(activity) {
        if (activity.unityEditor !== undefined) {
            const config = activity.unityEditor;
            if (!config || typeof config !== "object" || Array.isArray(config) ||
                typeof config.version !== "string" || !config.version.trim() || config.version.length > 200 ||
                ["modules", "notes"].some((key) => config[key] !== undefined &&
                    (typeof config[key] !== "string" || config[key].length > 10000))) {
                throw new Error("Unity Editor settings need a version (up to 200 characters) and optional modules and notes (up to 10,000 characters each).");
            }
        }
        if (activity.completionMode !== undefined && !["manual", "auto"].includes(activity.completionMode)) throw new Error("Choose manual or automatic activity completion.");
        if (activity.blocks === undefined) {
            if (activity.completionMode === "auto") throw new Error("Automatic completion requires content blocks.");
            return;
        }
        if (!Array.isArray(activity.blocks)) throw new Error("Content blocks must be a list.");
        if (activity.blocks.length > 60) throw new Error("Use at most 60 content blocks per activity.");
        const ids = new Set();
        for (const b of activity.blocks) {
            if (!b || typeof b.kind !== "string" || !Object.hasOwn(types, b.kind) || typeof b.id !== "string" || !/^[a-zA-Z0-9_-]{1,90}$/.test(b.id) ||
                ["__proto__", "constructor", "prototype"].includes(b.id) || ids.has(b.id)) throw new Error("Content blocks need unique valid IDs and supported types.");
            ids.add(b.id);
            if (b.kind === "schoollicence") {
                if (!["serial", "instructions"].includes(b.activationMethod)) throw new Error("Choose serial number or activation instructions for the school licence.");
                if (b.licenceValue !== undefined && (typeof b.licenceValue !== "string" || b.licenceValue.length > 10000)) throw new Error("School licence information must be text of at most 10,000 characters.");
            }
            for (const key of ["title", "text", "url", "alt", "caption", "attribution", "entries", "fileName", "responseKey"]) {
                if (b[key] !== undefined && (typeof b[key] !== "string" || b[key].length > (key === "text" ? 20000 : 5000))) throw new Error(`${types[b.kind]}: ${key} must be text within the size limit.`);
            }
            for (const key of ["required", "editable", "numbered", "driveOnly", "driveFolderOnly"]) if (b[key] !== undefined && typeof b[key] !== "boolean") throw new Error("Block options must be true or false.");
            if (["link", "resource", "image"].includes(b.kind) && !safeUrl(b.url)) throw new Error(`${types[b.kind]}: enter a full HTTPS link.`);
            if (b.kind === "image" && !String(b.alt || "").trim()) throw new Error("Images need alternative text.");
            if (b.kind === "document" && (!safeUrl(b.url) || !/^https:\/\/docs\.google\.com\/document\/(?:u\/\d+\/)?d\/[a-zA-Z0-9_-]{20,}(?:[/?#]|$)/.test(b.url || ""))) throw new Error("Create Document needs a Google Docs template link.");
            if (["wordsearch", "crossword"].includes(b.kind)) {
                const list = entries(b);
                if (!list.length || list.length > 15 || list.some((e) => !/^[A-Z]{2,15}$/.test(e.word)) ||
                    new Set(list.map((e) => e.word)).size !== list.length) throw new Error("Puzzles need 1–15 unique words, each 2–15 letters (A–Z).");
                if (b.kind === "crossword" && list.some((e) => !e.clue)) throw new Error("Each crossword answer needs a clue: ANSWER | Clue.");
                puzzle(b);
            }
            if (b.kind === "table") {
                const rows = String(b.text || "").split(/\r?\n/).filter((line) => line.trim());
                if (!rows.length || rows.length > 30 || rows.some((line) => line.split("|").length > 10)) throw new Error("Tables need 1–30 rows and at most 10 columns, separated by |.");
                const width = rows[0].split("|").length;
                if (rows.some((line) => line.split("|").length !== width) || rows[0].split("|").some((cell) => !cell.trim())) throw new Error("Use a heading for every table column and the same number of columns in each row.");
                const answerRows = Number(b.rows ?? 3);
                if (b.editable && (!Number.isInteger(answerRows) || answerRows < 1 || answerRows > 15)) throw new Error("Editable tables need 1–15 answer rows.");
            }
            if (["text", "tasks", "checkbox"].includes(b.kind) && !String(b.text || "").trim()) throw new Error(`${types[b.kind]} needs text.`);
            if (b.kind === "question" && !String(b.text || "").trim()) throw new Error("Questions need a prompt.");
            if (b.kind === "question" && !["short-answer", "multiple-choice", "checklist"].includes(b.questionType)) throw new Error("Choose a supported question answer type.");
            if (b.kind === "question" && b.questionType !== "short-answer" &&
                (!Array.isArray(b.options) || !b.options.length || b.options.length > 50 ||
                    b.options.some((s) => typeof s !== "string" || !s.trim() || s.length > 2000) || new Set(b.options).size !== b.options.length)) throw new Error("Choice questions need 1–50 unique text options.");
        }
        if (activity.completionMode === "auto" && !specialised(activity) &&
            !activity.blocks.some((b) => b.required && interactive.includes(b.kind) && (b.kind !== "table" || b.editable))) {
            throw new Error("Automatic tick needs at least one required question, checkbox, puzzle, editable table, document or student link block.");
        }
    }
    function grade(activity, answers, documents = {}, context = {}) {
        const required = (activity.blocks || []).filter((b) => b.required && interactive.includes(b.kind) && (b.kind !== "table" || b.editable));
        const results = required.map((b) => {
            const value = answers?.[b.id];
            let passed = false;
            let message;
            if (b.kind === "studentlink") passed = Boolean(studentUrl(value, b.driveOnly, b.driveFolderOnly));
            if (b.kind === "studentlink" && passed && activity.uniqueDocumentLinks) {
                const key = documentLinkKey(value);
                const duplicateHere = (activity.blocks || []).some((other) =>
                    other.kind === "studentlink" && other.id !== b.id && documentLinkKey(answers?.[other.id]) === key);
                const duplicateElsewhere = (context.content?.activities || []).some((other, index) => {
                    const worksheet = context.content.worksheets?.[index];
                    if (!other || index === Number(context.index) || !worksheet || worksheet.hidden || worksheet.mergedInto !== undefined) return false;
                    const saved = savedAnswers(other, index, context.responses);
                    return (other?.blocks || []).some((link) => link.kind === "studentlink" && documentLinkKey(saved[link.id]) === key);
                });
                if (!context.content || duplicateHere || duplicateElsewhere) {
                    passed = false;
                    message = !context.content ? "The whole kit must be checked before awarding this tick."
                        : "This file is also linked in another activity. Submit a different document or PDF for each activity.";
                }
            }
            if (b.kind === "studentlink" && passed && activity.documentCheck &&
                b === activity.blocks.find((block) => block.kind === "studentlink")) {
                const receipt = context.documentVerification;
                passed = receipt?.passed === true && receipt.policy === activity.documentCheck &&
                    receipt.documentKey === documentLinkKey(value);
                if (!passed) message = receipt?.feedback?.message ||
                    "Link saved. Use Check my document to check the Rattlesnakes text, or ask your teacher to review it.";
            }
            if (b.kind === "checkbox") passed = value === true;
            if (b.kind === "question") passed = b.questionType === "checklist"
                ? Array.isArray(value) && b.options.every((option) => value.includes(option))
                : b.questionType === "multiple-choice" ? b.options.includes(value) : typeof value === "string" && Boolean(value.trim());
            if (b.kind === "document") passed = Boolean(documents[b.id]);
            if (b.kind === "table") {
                const cols = String(b.text).split(/\r?\n/).filter((s) => s.trim())[0].split("|").length;
                passed = Array.isArray(value) && value.length === Number(b.rows || 3) &&
                    value.every((row) => Array.isArray(row) && row.length === cols && row.every((cell) => typeof cell === "string" && cell.trim()));
            }
            if (b.kind === "crossword") {
                const { placed } = puzzle(b);
                passed = placed.every((p) => p.cells.every(([r, c], i) => String(value?.[`${r}-${c}`] || "").toUpperCase() === p.word[i]));
            }
            if (b.kind === "wordsearch") {
                const { grid } = puzzle(b);
                const selected = Array.isArray(value) ? value : [];
                passed = entries(b).every(({ word }) => selected.some((pair) => {
                    if (!Array.isArray(pair) || pair.length !== 2 || !pair.every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isInteger))) return false;
                    const [[r, c], [er, ec]] = pair;
                    if ([r, er].some((n) => n < 0 || n >= grid.length) || [c, ec].some((n) => n < 0 || n >= grid[0].length)) return false;
                    if (r !== er && c !== ec || Math.max(Math.abs(er - r), Math.abs(ec - c)) + 1 !== word.length) return false;
                    const dr = Math.sign(er - r), dc = Math.sign(ec - c);
                    const text = Array.from(word, (_, i) => grid[r + dr * i]?.[c + dc * i] || "").join("");
                    return text === word || [...text].reverse().join("") === word;
                }));
            }
            return { id: b.id, passed, ...(message ? { message } : {}) };
        });
        return { passed: required.length > 0 && results.every((r) => r.passed), results };
    }
    return { types, interactive, escape, safeUrl, studentUrl, specialised, initialBlocks, savedAnswers, publicActivity, entries, puzzle, validate, grade,
        withFilesFoldersLinks, withGoogleDrawingsLinks, documentLinkKey };
});
