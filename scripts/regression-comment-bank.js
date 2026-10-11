"use strict";
const assert = require("node:assert/strict");
const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const cb = require("../learning-pathways/comment-bank");
const { registerCommentBank } = require("../learning-pathways/comment-bank-store");

(async () => {
    const bank = cb.defaultBank();
    assert.deepEqual(cb.validateBank(bank), bank, "Starter bank validates unchanged");
    assert.ok(bank.comments.length >= 150, `Starter bank has an extensive range (${bank.comments.length})`);
    for (const [category] of cb.categories) {
        assert.ok(bank.subcategories[category].length >= 4, `${category} has subcategories`);
        for (const sub of bank.subcategories[category]) assert.ok(bank.comments.some((c) => c.category === category && c.subcategory === sub), `${sub} has comments`);
    }
    for (const category of ["strengths", "behaviours", "next"]) for (const level of ["beginning", "developing", "confident", "extending"]) {
        assert.ok(bank.comments.filter((c) => c.category === category && c.level === level).length >= 8, `${category}/${level} has comments`);
    }
    assert.ok(bank.comments.every((c) => c.text.includes("{name}")), "Every starter comment names the student");
    assert.equal(new Set(bank.comments.map((c) => c.text.toLowerCase())).size, bank.comments.length, "Starter comments are unique");

    const bad = (mutate, message) => {
        const copy = JSON.parse(JSON.stringify(bank)); mutate(copy);
        assert.throws(() => cb.validateBank(copy), undefined, message);
    };
    bad((b) => { b.comments[1].id = b.comments[0].id; }, "Duplicate ids rejected");
    bad((b) => { b.comments[0].subcategory = "Nope"; }, "Unknown subcategory rejected");
    bad((b) => { b.comments[0].level = "expert"; }, "Unknown level rejected");
    bad((b) => { b.comments[0].text = " "; }, "Blank text rejected");
    bad((b) => { b.comments[0].active = "yes"; }, "Non-boolean active rejected");
    bad((b) => { b.subcategories.context.push(b.subcategories.context[0].toUpperCase()); }, "Duplicate subcategory rejected");

    const texts = ["{name} has been exploring binary", "{name} applies skills well.", "{name}'s next step is to test, and {name} should explain."];
    assert.equal(cb.compose(texts, { name: "Ana", pronoun: "name" }),
        "Ana has been exploring binary. Ana applies skills well. Ana's next step is to test, and Ana should explain.");
    assert.equal(cb.compose(texts, { name: "Ana", pronoun: "she" }),
        "Ana has been exploring binary. She applies skills well. Her next step is to test, and she should explain.");
    assert.equal(cb.compose(["{name}'s work", "{name}'s next"], { name: "James", pronoun: "he" }), "James' work. His next.");
    assert.equal(cb.compose(["Next, {name} should test"], {}), "Next, this student should test.");
    assert.equal(cb.firstName("Pringle, Vanessa"), "Vanessa");
    assert.equal(cb.firstName("Ana Smith"), "Ana");

    const tricky = JSON.parse(JSON.stringify(bank));
    tricky.comments[0].text = 'Has "quotes", commas\nand lines {name}';
    tricky.comments[1].active = false;
    const roundTrip = cb.fromCsv(cb.toCsv(tricky));
    assert.equal(roundTrip.comments[0].text, 'Has "quotes", commas and lines {name}');
    assert.equal(roundTrip.comments[1].active, false);
    assert.equal(roundTrip.comments.length, bank.comments.length);
    const labelled = cb.fromCsv("discipline,category,subcategory,level,text\nTextiles,Learning Strengths,Sewing,Confident,{name} sews neatly\n");
    assert.deepEqual([labelled.comments[0].discipline, labelled.comments[0].category, labelled.comments[0].level], ["textiles", "strengths", "confident"]);
    assert.deepEqual(labelled.subcategories.strengths, ["Sewing"]);
    assert.throws(() => cb.fromCsv("category,text\nNope,x\n"));

    const sorted = cb.sortComments(bank, bank.comments.slice().reverse());
    assert.deepEqual(sorted.map((c) => c.id), bank.comments.map((c) => c.id), "Sorted in hierarchy order");
    const group = bank.comments.filter((c) => c.category === "strengths" && c.level === "beginning" && c.subcategory === bank.comments.find((x) => x.category === "strengths").subcategory);
    group[0].order = 999; cb.renumber(bank, group[0]);
    assert.deepEqual(cb.sortComments(bank, group).map((c) => c.order), group.map((_c, i) => (i + 1) * 10));

    // Endpoints
    let stored = null;
    const pool = { query: async (sql, params = []) => {
        if (/^CREATE/.test(sql.trim())) return { rows: [] };
        if (/^SELECT/.test(sql.trim())) return { rows: stored ? [stored] : [] };
        if (/^INSERT/.test(sql.trim())) {
            if (stored) return { rows: [] };
            stored = { bank: JSON.parse(params[0]), revision: 1, updated_by: params[1], updated_at: new Date().toISOString() };
            return { rows: [{ revision: 1 }] };
        }
        if (/^UPDATE/.test(sql.trim())) {
            if (!stored || stored.revision !== params[2]) return { rows: [] };
            stored = { bank: JSON.parse(params[0]), revision: stored.revision + 1, updated_by: params[1], updated_at: new Date().toISOString() };
            return { rows: [{ revision: stored.revision }] };
        }
        throw new Error(`Unexpected SQL ${sql}`);
    } };
    const teacher = (req, res, next) => ["teacher", "admin"].includes(req.headers["x-test-role"]) ? next() : res.status(403).json({ error: "Teacher required" });
    const admin = (req, res, next) => { if (req.headers["x-test-role"] !== "admin") return res.status(403).json({ error: "Admin required" }); req.user_email = "admin@example.test"; next(); };
    const start = async (hasDatabase) => {
        const app = express(); app.use(express.json({ limit: "8mb" }));
        registerCommentBank(app, { pool, hasDatabase, requireTeacherAccess: teacher, requireAdminAccess: admin });
        const server = app.listen(0, "127.0.0.1");
        await new Promise((resolve) => server.once("listening", resolve));
        return { server, base: `http://127.0.0.1:${server.address().port}/api` };
    };
    for (const hasDatabase of [true, false]) {
        const { server, base } = await start(hasDatabase);
        const get = (url, role) => fetch(`${base}${url}`, { headers: { "x-test-role": role } });
        const put = (body, role = "admin") => fetch(`${base}/admin/progression/comment-bank`, { method: "PUT",
            headers: { "x-test-role": role, "Content-Type": "application/json" }, body: JSON.stringify(body) });
        try {
            assert.equal((await get("/teacher/progression/comment-bank", "student")).status, 403);
            assert.equal((await get("/admin/progression/comment-bank", "teacher")).status, 403);
            const first = await (await get("/admin/progression/comment-bank", "admin")).json();
            assert.equal(first.bank.comments.length, bank.comments.length);
            if (hasDatabase) assert.equal(first.revision, 1, "Starter bank is seeded into the database");
            else assert.equal(first.revision, 0);
            const edited = first.bank;
            edited.comments[0].active = false;
            edited.comments[1].text = "{name} edited comment.";
            assert.equal((await put({ bank: edited, revision: first.revision }, "teacher")).status, 403);
            assert.equal((await put({ bank: { ...edited, comments: "x" }, revision: first.revision })).status, 400);
            const saved = await put({ bank: edited, revision: first.revision });
            assert.equal(saved.status, 200);
            const savedData = await saved.json();
            assert.equal(savedData.revision, first.revision + 1);
            assert.equal(savedData.bank.comments[1].text, "{name} edited comment.");
            assert.equal((await put({ bank: edited, revision: first.revision })).status, 409, "Stale revision conflicts");
            const teacherView = await (await get("/teacher/progression/comment-bank", "teacher")).json();
            assert.equal(teacherView.bank.comments.length, bank.comments.length - 1, "Teachers only see active comments");
            assert.ok(!teacherView.bank.comments.some((c) => c.id === edited.comments[0].id));
        } finally { server.close(); }
    }

    const html = fs.readFileSync(path.join(__dirname, "../learning-pathways/progression-pathway.html"), "utf8");
    assert.ok(html.indexOf("comment-bank.js") < html.indexOf("progression-pathway.js"), "Builder loads the shared module first");
    assert.ok(html.indexOf("progression-comment-builder") < html.indexOf("progression-narrative"), "Builder sits above the narrative");
    const adminMenu = fs.readFileSync(path.join(__dirname, "../admin-menu.html"), "utf8");
    assert.ok(adminMenu.includes("learning-pathways/comment-bank.html"), "Admin menu links the comment bank");
    const serverJs = fs.readFileSync(path.join(__dirname, "../server.js"), "utf8");
    assert.ok(serverJs.includes("registerCommentBank(app"), "Server registers the comment bank");
    console.log("Comment bank regression passed.");
})().catch((error) => { console.error(error); process.exit(1); });
