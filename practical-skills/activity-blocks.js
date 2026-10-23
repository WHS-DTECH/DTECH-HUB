(function (root, factory) {
    if (typeof module === "object" && module.exports) module.exports = factory();
    else root.ActivityBlocks = factory();
})(typeof window === "object" ? window : globalThis, () => {
    "use strict";
    const types = {
        text: "Text / Instructions", image: "Image", tasks: "Task List", question: "Question",
        link: "Website Link", resource: "Resource File", checkbox: "Checkbox", table: "Table",
        wordsearch: "Word Search", document: "Create Document", crossword: "Crossword"
    };
    const interactive = ["question", "checkbox", "wordsearch", "crossword", "document", "table"];
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
            for (const key of ["title", "text", "url", "alt", "caption", "attribution", "entries", "fileName", "responseKey"]) {
                if (b[key] !== undefined && (typeof b[key] !== "string" || b[key].length > (key === "text" ? 20000 : 5000))) throw new Error(`${types[b.kind]}: ${key} must be text within the size limit.`);
            }
            for (const key of ["required", "editable"]) if (b[key] !== undefined && typeof b[key] !== "boolean") throw new Error("Block options must be true or false.");
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
            throw new Error("Automatic tick needs at least one required question, checkbox, puzzle, editable table or document block.");
        }
    }
    function grade(activity, answers, documents = {}) {
        const required = (activity.blocks || []).filter((b) => b.required && interactive.includes(b.kind) && (b.kind !== "table" || b.editable));
        const results = required.map((b) => {
            const value = answers?.[b.id];
            let passed = false;
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
            return { id: b.id, passed };
        });
        return { passed: required.length > 0 && results.every((r) => r.passed), results };
    }
    return { types, interactive, escape, safeUrl, specialised, initialBlocks, savedAnswers, entries, puzzle, validate, grade };
});
