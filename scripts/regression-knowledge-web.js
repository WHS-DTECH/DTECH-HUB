"use strict";
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const path = require("node:path");
const { test } = require("node:test");
const express = require("express");
const { Pool } = require("pg");
const { registerKnowledgeWeb } = require("../knowledge-web/.store");

const connectionString = process.env.KNOWLEDGE_WEB_TEST_DATABASE_URL;

test("Knowledge Web allows only eligible readers and verified teachers to manage clouds", async (t) => {
    const app = express();
    registerKnowledgeWeb(app, {
        getVerifiedEmail: (req) => req.headers["x-verified-test-account"] || "",
        canManage: async () => false,
        getStudentProfile: async (account) => ({ available: account !== "inactive", year: { junior: 8, middle: 9, senior: 11, inactive: 10 }[account] })
    });
    const server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const url = `http://127.0.0.1:${server.address().port}/api/knowledge-web`;
    for (const [account, expected] of [["", 401], ["junior", 403], ["middle", 200], ["senior", 403], ["inactive", 403]]) {
        const headers = { "x-verified-test-account": account, "x-user-role": "admin", "x-user-email": "teacher@test.invalid" };
        assert.equal((await fetch(`${url}/access`, { headers })).status, expected, account);
        assert.equal((await fetch(`${url}/manage/clouds`, { method: "POST", headers })).status, account ? 403 : 401);
    }
});

test("PostgreSQL persists drafts, sources and positions; only published clouds reach students",
    { skip: !connectionString && "Set KNOWLEDGE_WEB_TEST_DATABASE_URL to an isolated PostgreSQL database" }, async (t) => {
        const schemaName = `kw_${randomUUID().replaceAll("-", "")}`;
        const admin = new Pool({ connectionString });
        await admin.query(`CREATE SCHEMA ${schemaName}`);
        const pool = new Pool({ connectionString, options: `-c search_path=${schemaName}` });
        const servers = [];
        t.after(async () => {
            for (const server of servers) await new Promise((resolve) => server.close(resolve));
            await pool.end();
            await admin.query(`DROP SCHEMA ${schemaName} CASCADE`);
            await admin.end();
        });
        async function startApp() {
            const app = express();
            app.use(express.json());
            registerKnowledgeWeb(app, {
                pool, getVerifiedEmail: (req) => req.headers["x-verified-test-account"] || "",
                canManage: async (account) => account === "teacher@test.invalid",
                getStudentProfile: async () => ({ available: true, year: 10 }),
                getContributorName: async () => "Test Teacher"
            });
            app.use(express.static(path.resolve(__dirname, "..")));
            const server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
            servers.push(server);
            return `http://127.0.0.1:${server.address().port}`;
        }
        let host = await startApp();
        const call = (uri, { student = false, method = "GET", body } = {}) => fetch(`${host}/api/knowledge-web/${uri}`, {
            method,
            headers: { "Content-Type": "application/json", "x-verified-test-account": student ? "student@test.invalid" : "teacher@test.invalid" },
            body: body && JSON.stringify(body)
        });
        const list = async (uri, student) => {
            const res = await call(uri, { student });
            assert.equal(res.headers.get("cache-control"), "private, no-store");
            assert.equal(res.status, 200);
            return (await res.json()).clouds;
        };
        assert.equal((await fetch(`${host}/knowledge-web/%2estore.js`)).status, 404);
        assert.deepEqual(await list("clouds", true), []);
        const [seed] = await list("manage/clouds");
        assert.equal(seed.title, "2026 NCEA Digital Examination Disruptions");
        assert.equal(seed.publishedAt, null);
        assert.equal(seed.events[0].date, "2026-11");
        assert.deepEqual(seed.sources, []);
        assert.equal((await call(`manage/clouds/${seed.id}`, { method: "PUT", body: { ...seed, publish: true } })).status, 400);

        const body = {
            title: "Test-only historical cloud", description: "Test description", significance: "Test significance",
            events: [{ date: "2026-11-18", description: "Test event" }], position: { x: 70, y: 120 }, publish: false,
            sources: [{ title: "Test source", author: "Test organisation", publicationDate: "2026-11",
                reference: "https://example.test/article", supports: "Supports the test event." }]
        };
        const created = await call("manage/clouds", { method: "POST", body });
        assert.equal(created.status, 201);
        const { id } = await created.json();
        const find = (clouds) => clouds.find((cloud) => cloud.id === id);
        const draft = find(await list("manage/clouds"));
        assert.equal(draft.publishedAt, null);
        assert.ok(draft.sources[0].addedAt);
        assert.deepEqual(await list("clouds", true), []);
        assert.equal((await call(`manage/clouds/${id}`, { student: true, method: "PUT", body: { ...draft, publish: true } })).status, 403);
        const update = { ...draft, position: { x: 280, y: 130 }, publish: true };
        assert.equal((await call(`manage/clouds/${id}`, { method: "PUT", body: update })).status, 200);
        assert.equal((await call(`manage/clouds/${id}`, { method: "PUT", body: update })).status, 409);

        host = await startApp();
        const publicClouds = await list("clouds", true);
        assert.equal(publicClouds.length, 1, "The original draft is still private after reinitialisation");
        const [published] = publicClouds;
        assert.equal(published.id, id);
        assert.ok(published.publishedAt);
        assert.equal(published.contributor, "Test Teacher");
        assert.deepEqual(published.position, update.position);
        assert.equal(published.sources[0].id, draft.sources[0].id);
        assert.equal(published.sources[0].addedAt, draft.sources[0].addedAt);
        assert.equal(published.sources[0].url, "https://example.test/article");
        assert.doesNotMatch(JSON.stringify(published), /teacher@test\.invalid/);
        assert.equal((await call(`manage/clouds/${id}`, { method: "PUT", body: { ...published, publish: false, sources: [] } })).status, 400);
        assert.equal((await list("clouds", true))[0].sources.length, 1);
    });
