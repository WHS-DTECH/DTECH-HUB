"use strict";
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const dns = require("node:dns").promises;
const fs = require("node:fs");
const http = require("node:http");
const { EventEmitter } = require("node:events");
const { Readable } = require("node:stream");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const express = require("express");
const { Pool } = require("pg");
const { registerKnowledgeWeb } = require("../knowledge-web/.store");
const { getSourceMetadata, parseMetadata, isPublicIPv4 } = require("../knowledge-web/.source-metadata");

const connectionString = process.env.KNOWLEDGE_WEB_TEST_DATABASE_URL;

test("Timeline includes dated source publications alongside events without inventing dates or times", () => {
    const script = fs.readFileSync(path.join(__dirname, "../knowledge-web/web.js"), "utf8");
    const start = script.indexOf("    function timelineEntries(");
    const end = script.indexOf("    function appendTimelineEntry(", start);
    assert.ok(start >= 0 && end > start, "Timeline entry function is available");
    const entries = vm.runInThisContext(`(() => { ${script.slice(start, end)} return timelineEntries; })()`);
    const cloud = {
        events: [{ date: "2026-11-12", time: "09:30", description: "Historical event" }],
        sources: [
            { title: "Dated report", publicationDate: "2026-11-17", addedAt: "2026-11-20T00:00:00Z" },
            { title: "Month-only report", publicationDate: "2025-03" },
            { title: "Undated report", publicationDate: "", addedAt: "2026-11-20T00:00:00Z" }
        ]
    };
    const result = entries(cloud);
    assert.deepEqual(result.map(({ kind, date, time }) => ({ kind, date, time })), [
        { kind: "event", date: "2026-11-12", time: "09:30" },
        { kind: "source", date: "2026-11-17", time: undefined },
        { kind: "source", date: "2025-03", time: undefined }
    ]);
    assert.equal(result[1].source.title, "Dated report");
    assert.equal(entries({ events: [], sources: cloud.sources }).length, 2, "Dated sources work without events");
    assert.equal(entries({ events: [], sources: [cloud.sources[2]] }).length, 0, "Date added is not a publication date");
});

test("Canvas separates overlapping clouds without changing saved positions", () => {
    const script = fs.readFileSync(path.join(__dirname, "../knowledge-web/web.js"), "utf8");
    const start = script.indexOf("    const CLOUD_WIDTH =");
    const end = script.indexOf("    function renderExplore()", start);
    assert.ok(start >= 0 && end > start, "Canvas layout function is available");
    const layout = vm.runInThisContext(`(() => { ${script.slice(start, end)} return layoutClouds; })()`);
    const clouds = [
        { id: "first", publishedAt: "2025-01-01", position: { x: 48, y: 80 } },
        { id: "second", publishedAt: "2025-01-02", position: { x: 50, y: 90 } },
        { id: "third", publishedAt: "2025-01-03", position: { x: 75, y: 200 } },
        { id: "separate", publishedAt: "2025-01-03", position: { x: 600, y: 80 } },
        ...Array.from({ length: 20 }, (_, i) => ({
            id: `additional-${i}`, publishedAt: "2025-01-04", position: { x: 48, y: 80 }
        }))
    ];
    const saved = JSON.stringify(clouds);
    const positions = layout(clouds);
    assert.deepEqual(positions.get("first"), { x: 48, y: 80 });
    assert.deepEqual(positions.get("separate"), { x: 600, y: 80 });
    assert.equal(JSON.stringify(clouds), saved, "Saved positions are not modified");
    assert.deepEqual([...layout([...clouds].reverse())], [...positions], "Placement is stable regardless of list order");
    const rectangles = [...positions.values()];
    for (let i = 0; i < rectangles.length; i++) {
        for (let j = i + 1; j < rectangles.length; j++) {
            const a = rectangles[i], b = rectangles[j];
            assert.ok(a.x + 190 <= b.x || b.x + 190 <= a.x || a.y + 100 <= b.y || b.y + 100 <= a.y,
                `Clouds ${i} and ${j} overlap`);
        }
    }
});

test("Knowledge Web allows only eligible readers and verified teachers to manage clouds", async (t) => {
    const app = express();
    app.use(express.json());
    registerKnowledgeWeb(app, {
        getVerifiedEmail: (req) => req.headers["x-verified-test-account"] || "",
        canManage: async (account) => account === "teacher@test.invalid",
        getStudentProfile: async (account) => ({
            available: account !== "inactive@test.invalid",
            year: { "junior@test.invalid": 8, "student-one@test.invalid": 10, "student-two@test.invalid": 9,
                "senior@test.invalid": 11, "year-twelve@test.invalid": 12, "year-thirteen@test.invalid": 13,
                "inactive@test.invalid": 13 }[account]
        })
    });
    const server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const url = `http://127.0.0.1:${server.address().port}/api/knowledge-web`;
    for (const [account, expected] of [["", 401], ["junior@test.invalid", 403], ["student-one@test.invalid", 200],
        ["student-two@test.invalid", 200], ["senior@test.invalid", 200], ["year-twelve@test.invalid", 200],
        ["year-thirteen@test.invalid", 200], ["inactive@test.invalid", 403], ["unknown@test.invalid", 403]]) {
        const headers = { "x-verified-test-account": account, "x-user-role": "admin", "x-user-email": "teacher@test.invalid" };
        assert.equal((await fetch(`${url}/access`, { headers })).status, expected, account);
        assert.equal((await fetch(`${url}/manage/clouds`, { method: "POST", headers })).status, account ? 403 : 401);
        assert.equal((await fetch(`${url}/manage/source-metadata`, { method: "POST", headers })).status, account ? 403 : 401);
    }
    const invalid = await fetch(`${url}/manage/source-metadata`, { method: "POST",
        headers: { "x-verified-test-account": "teacher@test.invalid", "Content-Type": "application/json" },
        body: JSON.stringify({ url: "http://127.0.0.1/" }) });
    assert.equal(invalid.status, 400, "Even teachers cannot fetch private addresses");
});

test("Source lookup extracts supported metadata without inventing missing values", () => {
    assert.deepEqual(parseMetadata(`<title>Research &amp; computing - Example Museum</title>
        <meta name="author" content="A Researcher"><meta property="article:published_time" content="2025-03-19T12:00:00Z">`),
    { title: "Research & computing - Example Museum", author: "A Researcher", publicationDate: "2025-03-19" });
    assert.deepEqual(parseMetadata(`<title>NZQA announcement - NZQA</title>
        <div class="page-hero__publish-date">12 November 2026</div>`),
    { title: "NZQA announcement - NZQA", author: "NZQA", publicationDate: "2026-11-12" });
    assert.deepEqual(parseMetadata(`<title>Untitled source</title><meta name="date" content="2025-02-31">`),
        { title: "Untitled source", author: "", publicationDate: "" });
});

test("Source lookup rejects private addresses and revalidates redirects", async (t) => {
    for (const address of ["127.0.0.1", "10.1.2.3", "169.254.169.254", "100.64.0.1", "198.18.0.1", "192.0.2.1"]) {
        assert.equal(isPublicIPv4(address), false, address);
        await assert.rejects(getSourceMetadata(`http://${address}/`), { status: 400 });
    }
    for (const url of ["http://[::1]/", "file:///etc/passwd", "https://user:password@example.com/", "http://example.com:8080/"]) {
        await assert.rejects(getSourceMetadata(url), { status: 400 });
    }
    t.mock.method(dns, "lookup", async (host) => host === "mixed.example"
        ? [{ address: "8.8.8.8", family: 4 }, { address: "10.0.0.1", family: 4 }]
        : [{ address: "8.8.8.8", family: 4 }]);
    let requests = 0;
    t.mock.method(http, "request", (_url, options, callback) => {
        requests++;
        const request = new EventEmitter();
        request.end = () => {
            options.lookup("example.com", {}, (_error, address) => assert.equal(address, "8.8.8.8"));
            const response = Readable.from([]);
            response.statusCode = 302;
            response.headers = { location: "http://127.0.0.1/private" };
            callback(response);
        };
        return request;
    });
    await assert.rejects(getSourceMetadata("http://example.com/"), { status: 400 });
    assert.equal(requests, 1, "The redirect to a private address is not requested");
    await assert.rejects(getSourceMetadata("http://mixed.example/"), { status: 400 });
    assert.equal(requests, 1, "A hostname with mixed public and private addresses is not requested");
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
        const notifications = [];
        let authorYear = 10;
        let authorName = "Test Student One";
        async function startApp() {
            const app = express();
            app.use(express.json());
            registerKnowledgeWeb(app, {
                pool, getVerifiedEmail: (req) => req.headers["x-verified-test-account"] || "",
                canManage: async (account) => account === "teacher@test.invalid",
                getStudentProfile: async (account) => ({ available: true, year: account.startsWith("student-two") ? 13 : authorYear }),
                notifyReport: async (...args) => { notifications.push(args); },
                getContributorName: async (_req, account) => account === "teacher@test.invalid" ? "Test Teacher"
                    : account.startsWith("student-two") ? "Test Student Two" : account.startsWith("student-three") ? "Test Student Three"
                        : account.startsWith("student-four") ? "Test Student Four" : authorName
            });
            app.use(express.static(path.resolve(__dirname, "..")));
            const server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
            servers.push(server);
            return `http://127.0.0.1:${server.address().port}`;
        }
        let host = await startApp();
        const call = (uri, { student = false, account, method = "GET", body } = {}) => fetch(`${host}/api/knowledge-web/${uri}`, {
            method,
            headers: { "Content-Type": "application/json", "x-verified-test-account": account
                || (student ? "student-one@test.invalid" : "teacher@test.invalid") },
            body: body && JSON.stringify(body)
        });
        const list = async (uri, student) => {
            const res = await call(uri, { student });
            assert.equal(res.headers.get("cache-control"), "private, no-store");
            assert.equal(res.status, 200);
            return (await res.json()).clouds;
        };
        const teacherCloudResponse = await call("clouds");
        assert.equal(teacherCloudResponse.status, 200);
        assert.equal((await teacherCloudResponse.json()).canManage, true, "Teachers can open the shared-cloud view");
        assert.equal((await call("proposals")).status, 403,
            "The student-private proposal list remains teacher-restricted");
        assert.equal((await fetch(`${host}/knowledge-web/%2estore.js`)).status, 404);
        assert.equal((await fetch(`${host}/knowledge-web/%2esource-metadata.js`)).status, 404);
        assert.deepEqual(await list("clouds", true), []);
        const [seed] = await list("manage/clouds");
        assert.equal(seed.title, "2026 NCEA Digital Examination Disruptions");
        assert.equal(seed.publishedAt, null);
        assert.equal(seed.events[0].date, "2026-11");
        assert.deepEqual(seed.sources, []);
        assert.equal((await call(`manage/clouds/${seed.id}`, { method: "PUT", body: { ...seed, publish: true } })).status, 400);

        const body = {
            title: "Test-only historical cloud", description: "Test description", significance: "Test significance",
            events: [{ date: "18-11-2026", time: "09:05", description: "Test event" }, { date: "2026-10", description: "Earlier event" }],
            position: { x: 70, y: 120 }, publish: false,
            sources: [{ title: "Test source", author: "Test organisation", publicationDate: "11-2026",
                reference: "https://example.test/article", supports: "Supports the test event." }]
        };
        for (const invalidDate of ["31-02-2026", "13-2026", "00-11-2026"]) {
            const invalid = await call("manage/clouds", {
                method: "POST", body: { ...body, events: [{ date: invalidDate, description: "Invalid" }] }
            });
            assert.equal(invalid.status, 400, invalidDate);
            assert.match((await invalid.json()).error, /MM-YYYY or DD-MM-YYYY/);
        }
        for (const [date, time] of [["18-11-2026", "24:00"], ["18-11-2026", "09:60"],
            ["18-11-2026", "9:05"], ["11-2026", "09:05"]]) {
            const invalid = await call("manage/clouds", {
                method: "POST", body: { ...body, events: [{ date, time, description: "Invalid" }] }
            });
            assert.equal(invalid.status, 400, `${date} ${time}`);
        }
        const created = await call("manage/clouds", { method: "POST", body });
        assert.equal(created.status, 201);
        const { id } = await created.json();
        const find = (clouds) => clouds.find((cloud) => cloud.id === id);
        const cloudDraft = find(await list("manage/clouds"));
        assert.equal(cloudDraft.publishedAt, null);
        assert.deepEqual(cloudDraft.events.map((event) => event.date), ["2026-11-18", "2026-10"]);
        assert.equal(cloudDraft.events[0].time, "09:05");
        assert.equal(cloudDraft.events[1].time, undefined, "Legacy month-only events have no invented time");
        assert.equal(cloudDraft.sources[0].publicationDate, "2026-11");
        assert.ok(cloudDraft.sources[0].addedAt);
        assert.deepEqual(await list("clouds", true), []);
        assert.equal((await call(`manage/clouds/${id}`, { student: true, method: "PUT", body: { ...cloudDraft, publish: true } })).status, 403);
        const update = { ...cloudDraft, position: { x: 280, y: 130 }, publish: true };
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
        assert.equal(published.sources[0].id, cloudDraft.sources[0].id);
        assert.equal(published.sources[0].addedAt, cloudDraft.sources[0].addedAt);
        assert.equal(published.sources[0].url, "https://example.test/article");
        assert.deepEqual(published.events, cloudDraft.events, "Event times and legacy events survive publication and restart");
        assert.doesNotMatch(JSON.stringify(published), /teacher@test\.invalid/);
        assert.equal((await call(`manage/clouds/${id}`, { method: "PUT", body: { ...published, publish: false, sources: [] } })).status, 400);
        assert.equal((await list("clouds", true))[0].sources.length, 1);

        const firstPublished = (await list("clouds", true))[0];
        const draftBody = {
            intent: "draft", title: "", description: "", significance: "", connection: "",
            originalCloudId: firstPublished.id, sources: [{ title: "Researching this source" }],
            connectionSources: [], events: [{ date: "10-2025", time: "23:59", description: "" }]
        };
        const draftResponse = await call("proposals", { student: true, method: "POST", body: draftBody });
        assert.equal(draftResponse.status, 201);
        const draftResult = await draftResponse.json();
        assert.equal(draftResult.status, "Draft");
        const studentDrafts = await (await call("proposals", { student: true })).json();
        assert.equal(studentDrafts.proposals.length, 1);
        const draft = studentDrafts.proposals[0];
        assert.equal(draft.id, draftResult.id);
        assert.equal(draft.title, "");
        assert.equal(draft.originalCloudId, firstPublished.id);
        assert.equal(draft.revision, 1);
        assert.equal(draft.contributor, "Test Student One");
        assert.equal(draft.sources[0].title, "Researching this source");
        assert.deepEqual(draft.events, [{ date: "2025-10", time: "23:59", description: "" }],
            "An unfinished proposal can retain a time while the student researches the exact day");
        assert.ok(!JSON.stringify(draft).includes("contributorEmail"));
        assert.deepEqual((await (await call("proposals", { account: "student-two@test.invalid" })).json()).proposals, []);
        const secondStudentDraftResponse = await call("proposals", { account: "student-two@test.invalid", method: "POST", body: {
            ...draftBody, title: "Private Draft About Connected Networks"
        } });
        assert.equal(secondStudentDraftResponse.status, 201);
        const secondStudentDraft = await secondStudentDraftResponse.json();
        const ownDraftDuplicate = await (await call(
            `proposals/duplicates?title=${encodeURIComponent("Private Draft About Connected Networks")}`,
            { account: "student-two@test.invalid" }
        )).json();
        assert.equal(ownDraftDuplicate.matches[0].id, secondStudentDraft.id);
        assert.equal(ownDraftDuplicate.matches[0].kind, "proposal");
        assert.equal(ownDraftDuplicate.matches[0].status, "Draft");
        assert.equal((await (await call("manage/proposals")).json()).proposals.length, 0,
            "Unfinished drafts are not placed in the teacher review area");
        assert.equal((await call("proposals", { account: "teacher@test.invalid" })).status, 403);
        assert.equal((await call("manage/proposals", { student: true })).status, 403);
        assert.equal((await call(`manage/proposals/${draft.id}/decision`, {
            student: true, method: "POST", body: { action: "approve", comment: "fake teacher" }
        })).status, 403);
        assert.equal((await call(`proposals/${draft.id}`, {
            account: "student-two@test.invalid", method: "PUT", body: { ...draft, ...draftBody }
        })).status, 404);

        const possibleDuplicates = await (await call(`proposals/duplicates?title=${encodeURIComponent("Test only historical cloud")}`, {
            student: true
        })).json();
        assert.equal(possibleDuplicates.matches[0].id, id, "Published similar titles are suggested before submission");
        assert.equal(possibleDuplicates.matches[0].kind, "cloud");
        const connectionSource = { title: "Connection evidence", author: "Test publisher", publicationDate: "02-2024",
            reference: "Document 7", supports: "Supports the relationship between the historical topics." };
        const cloudSource = { title: "Historical source", author: "Test publisher", publicationDate: "29-02-2024",
            reference: "https://example.test/history", supports: "Supports the historical description." };
        const submission = {
            ...draft, ...draftBody, intent: "submit", title: "Test-only historical cloud",
            description: "A historical description supported by the submitted sources.",
            significance: "This topic belongs in computing history.",
            connection: "The events share an underlying relationship described by the cited evidence.",
            sources: [{ ...cloudSource, id: draft.sources[0].id }], connectionSources: [connectionSource],
            events: [{ date: "12-10-2025", time: "00:00", description: "A significant historical milestone." }]
        };
        for (const invalidEvent of [
            { date: "10-2025", time: "12:00", description: "No recorded day" },
            { date: "12-10-2025", time: "25:00", description: "Invalid time" },
            { date: "", time: "12:00", description: "No date" }
        ]) {
            const invalid = await call(`proposals/${draft.id}`, {
                student: true, method: "PUT", body: { ...submission, events: [invalidEvent], duplicatesAcknowledged: true }
            });
            assert.equal(invalid.status, 400);
        }
        const duplicateGuard = await call(`proposals/${draft.id}`, { student: true, method: "PUT", body: submission });
        assert.equal(duplicateGuard.status, 409);
        assert.ok((await duplicateGuard.json()).duplicates.some((match) => match.id === id));
        const submitResponse = await call(`proposals/${draft.id}`, {
            student: true, method: "PUT", body: { ...submission, duplicatesAcknowledged: true }
        });
        assert.equal(submitResponse.status, 200);
        assert.equal((await submitResponse.json()).status, "Submitted");
        const submitted = (await (await call("proposals", { student: true })).json()).proposals[0];
        assert.equal(submitted.status, "Submitted");
        assert.equal(submitted.sources.length, 1);
        assert.equal(submitted.connectionSources.length, 1);
        assert.equal(submitted.sources[0].publicationDate, "2024-02-29");
        assert.equal(submitted.sources[0].id, draft.sources[0].id);
        assert.equal(submitted.sources[0].addedAt, draft.sources[0].addedAt);
        assert.ok(Date.parse(submitted.sources[0].updatedAt) > Date.parse(draft.sources[0].updatedAt));
        assert.equal(submitted.connectionSources[0].publicationDate, "2024-02");
        assert.equal(submitted.events[0].date, "2025-10-12");
        assert.equal(submitted.events[0].time, "00:00");
        assert.ok(submitted.submittedAt);
        const reviewerList = (await (await call("manage/proposals")).json()).proposals;
        assert.equal(reviewerList.length, 1);
        assert.equal(reviewerList[0].contributorEmail, "student-one@test.invalid");
        assert.equal((await call(`proposals/${draft.id}`, {
            student: true, method: "PUT", body: { ...submission, duplicatesAcknowledged: true }
        })).status, 409, "Submitted proposals cannot be edited until returned");
        assert.equal((await call(`manage/proposals/${draft.id}/decision`, {
            student: true, method: "POST", body: { action: "approve", comment: "No" }
        })).status, 403);
        assert.equal((await call(`manage/proposals/${draft.id}/decision`, {
            method: "POST", body: { action: "return", comment: "" }
        })).status, 400, "Returning requires a private explanation");
        const returnedResponse = await call(`manage/proposals/${draft.id}/decision`, {
            method: "POST", body: { action: "return", comment: "Please add one clearer dated event." }
        });
        assert.equal((await returnedResponse.json()).status, "Returned for Revision");
        const returned = (await (await call("proposals", { student: true })).json()).proposals[0];
        assert.equal(returned.teacherComment, "Please add one clearer dated event.");
        assert.equal(returned.originalCloudId, firstPublished.id);
        assert.equal(returned.connectionSources[0].supports, connectionSource.supports);
        const secondStudentProposals = (await (await call("proposals", { account: "student-two@test.invalid" })).json()).proposals;
        assert.deepEqual(secondStudentProposals.map((proposal) => proposal.id), [secondStudentDraft.id],
            "Revision comments and proposals remain private to their author");

        authorYear = 11;
        authorName = "Changed Display Name";
        const revisedSubmit = await call(`proposals/${draft.id}`, {
            student: true, method: "PUT",
            body: { ...submission, connectionSources: returned.connectionSources, revision: returned.revision, duplicatesAcknowledged: true,
                description: "Revised factual description, with an added source explanation." }
        });
        assert.equal((await revisedSubmit.json()).status, "Submitted");
        assert.equal((await call(`manage/proposals/${draft.id}/decision`, {
            method: "POST", body: { action: "approve", comment: "" }
        })).status, 200);
        const approved = (await (await call("proposals", { student: true })).json()).proposals[0];
        assert.equal(approved.status, "Approved");
        assert.ok(approved.publishedAt === undefined, "Review decisions do not invent a separate proposal timestamp");
        assert.ok(approved.decidedAt);
        assert.ok(approved.publishedCloudId);
        assert.equal(approved.originalCloudId, firstPublished.id);
        assert.equal(approved.connection, submission.connection);
        assert.equal(approved.connectionSources[0].supports, connectionSource.supports);
        assert.equal(approved.contributor, draft.contributor);
        assert.equal(approved.createdAt, draft.createdAt);
        assert.equal(approved.connectionSources[0].id, returned.connectionSources[0].id);
        assert.equal(approved.connectionSources[0].updatedAt, returned.connectionSources[0].updatedAt);
        const sharedClouds = await list("clouds", true);
        assert.equal(sharedClouds.length, 2);
        const approvedCloud = sharedClouds.find((cloud) => cloud.id === approved.publishedCloudId);
        assert.equal(approvedCloud.title, submission.title);
        assert.equal(approvedCloud.description, "Revised factual description, with an added source explanation.");
        assert.equal(approvedCloud.contributor, "Test Student One");
        assert.equal(approvedCloud.sources[0].supports, cloudSource.supports);
        assert.equal(approvedCloud.sources[0].contributor, "Test Student One");
        assert.equal(approvedCloud.sources[0].addedAt, draft.sources[0].addedAt);
        const seniorShared = await call("clouds", { account: "student-two@test.invalid" });
        assert.equal(seniorShared.status, 200);
        const seniorClouds = (await seniorShared.json()).clouds;
        assert.ok(seniorClouds.some((cloud) => cloud.id === approved.publishedCloudId));
        assert.doesNotMatch(JSON.stringify(seniorClouds), /student-one@test\.invalid|contributorEmail|added_by/);
        assert.deepEqual(approvedCloud.events, submitted.events, "Proposal event time survives review and cloud publication");
        assert.equal((await list("clouds", false)).length, 2, "Another eligible student can see the approved cloud");
        assert.deepEqual((await (await call("kites", { student: true })).json()).kites, [],
            "Cloud approval does not automatically publish a kite");
        const audit = await pool.query(`SELECT action,actor_email,comment FROM knowledge_web_proposal_events WHERE proposal_id=$1 ORDER BY created_at,id`, [draft.id]);
        assert.deepEqual(audit.rows.map((row) => row.action), ["Draft saved", "Submitted", "Returned for Revision", "Submitted", "Approved"]);
        assert.equal(audit.rows[2].actor_email, "teacher@test.invalid");
        assert.equal(audit.rows[2].comment, "Please add one clearer dated event.");

        const declineDraft = await call("proposals", { account: "student-two@test.invalid", method: "POST", body: {
            ...draftBody, intent: "submit", title: "Distinct declined cloud", description: "A supported historical description.",
            significance: "Historical relevance.", connection: "Supported proposed relationship.", sources: [cloudSource],
            connectionSources: [connectionSource], events: [], duplicatesAcknowledged: true
        } });
        const declinedId = (await declineDraft.json()).id;
        assert.equal(declineDraft.status, 201);
        const declined = await call(`manage/proposals/${declinedId}/decision`, {
            method: "POST", body: { action: "decline", comment: "This proposal needs a stronger historical foundation." }
        });
        assert.equal((await declined.json()).status, "Declined");
        const declinedStudent = (await (await call("proposals", { account: "student-two@test.invalid" })).json())
            .proposals.find((proposal) => proposal.id === declinedId);
        assert.equal(declinedStudent.status, "Declined");
        assert.equal(declinedStudent.teacherComment, "This proposal needs a stronger historical foundation.");

        const studentB = "student-two@test.invalid", studentC = "student-three@test.invalid", studentD = "student-four@test.invalid";
        const post = (uri, body, account = "student-one@test.invalid") => call(uri, { method: "POST", body, account });
        const put = (uri, body, account = "student-one@test.invalid") => call(uri, { method: "PUT", body, account });
        const get = async (uri, account = "student-one@test.invalid") => {
            const response = await call(uri, { account });
            assert.equal(response.status, 200, uri);
            return response.json();
        };
        const fromProposal = { cloudA: approved.originalCloudId, cloudB: approved.publishedCloudId,
            argument: approved.connection, evidence: approved.connectionSources, proposalId: approved.id };
        assert.equal((await post("kites", { ...fromProposal, evidence: [] })).status, 400);
        assert.equal((await post("kites", { ...fromProposal, cloudB: fromProposal.cloudA })).status, 400);
        assert.equal((await post("kites", { ...fromProposal, proposalId: undefined, cloudB: seed.id })).status, 404);
        assert.equal((await post("kites", fromProposal, studentB)).status, 404);
        const firstKite = await post("kites", fromProposal);
        assert.equal(firstKite.status, 201);
        const { id: kiteA } = await firstKite.json();
        assert.equal((await post("kites", fromProposal)).status, 409);
        const originalKite = await get(`kites/${kiteA}`, studentB);
        assert.equal(originalKite.kite.argument, fromProposal.argument);
        assert.equal(originalKite.evidence[0].supports, fromProposal.evidence[0].supports);
        assert.equal(originalKite.kite.contributor, "Changed Display Name");
        assert.equal(originalKite.kite.mine, false);
        assert.doesNotMatch(JSON.stringify(originalKite), /@test\.invalid|contributor_email|proposalId/);
        const opponent = await post("kites", { ...fromProposal, cloudA: fromProposal.cloudB, cloudB: fromProposal.cloudA,
            proposalId: undefined, argument: "An alternative interpretation of the same two events." }, studentB);
        assert.equal(opponent.status, 201);
        const { id: kiteB } = await opponent.json();
        const grouped = (await get("kites", studentB)).kites;
        assert.deepEqual(new Set(grouped.map(({ id }) => id)), new Set([kiteA, kiteB]));
        assert.deepEqual(grouped.map(({ cloudA, cloudB }) => [cloudA, cloudB]), Array(2).fill([originalKite.kite.cloudA, originalKite.kite.cloudB]));
        assert.equal((await put(`kites/${kiteA}/contributions/kite/${kiteA}`, { argument: "Unauthorised edit" }, studentB)).status, 403);
        assert.equal((await put(`kites/${kiteA}/contributions/kite/${kiteA}`, { argument: "An updated argument." })).status, 200);
        const comment = await post(`kites/${kiteA}/comments`, { body: "How do you explain the timing?" }, studentC);
        assert.equal(comment.status, 201, "Ordinary comments need no citation");
        const { id: commentId } = await comment.json();
        assert.equal((await post(`kites/${kiteB}/comments`, { body: "Cross-kite reply", replyTo: commentId }, studentC)).status, 404);
        const reply = await post(`kites/${kiteA}/comments`, { body: "The timing may be coincidental.", replyTo: commentId }, studentB);
        assert.equal(reply.status, 201);
        const additional = await post(`kites/${kiteA}/evidence`, { title: "Alternative source", reference: "https://example.test/alternative",
            supports: "Offers another explanation for the timing.", stance: "challenges" }, studentD);
        assert.equal(additional.status, 201);
        const { id: evidenceId } = await additional.json();
        const expanded = await get(`kites/${kiteA}`);
        assert.equal(expanded.kite.createdAt, originalKite.kite.createdAt);
        assert.equal(expanded.kite.argument, "An updated argument.");
        assert.equal(expanded.comments.find(({ id }) => id === commentId).contributor, "Test Student Three");
        assert.equal(expanded.comments.find(({ id }) => id !== commentId).replyTo, commentId);
        assert.deepEqual(expanded.evidence.map(({ contributor }) => contributor), ["Changed Display Name", "Test Student Four"]);
        assert.equal(expanded.evidence[1].url, "https://example.test/alternative");
        assert.equal(expanded.evidence[1].stance, "challenges");
        const own = await get("contributions");
        assert.ok(own.contributions.some((item) => item.id === kiteA && item.kind === "kite"));
        assert.deepEqual(own.convertedProposalIds, [approved.id]);
        assert.deepEqual((await get("contributions", studentC)).contributions.map(({ id }) => id), [commentId]);
        assert.deepEqual((await get("contributions", studentD)).contributions.map(({ id }) => id), [evidenceId]);
        const savedReport = await post(`kites/${kiteA}/reports`, {
            kind: "comment", targetId: commentId, reason: "harassment", details: "Private report details"
        }, studentB);
        assert.equal(savedReport.status, 201);
        const { id: reportId } = await savedReport.json();
        const secondReport = await post(`kites/${kiteA}/reports`, {
            kind: "comment", targetId: commentId, reason: "personal-information"
        }, studentD);
        assert.equal(secondReport.status, 201);
        const secondReportId = (await secondReport.json()).id;
        assert.deepEqual(notifications, [[]], "Only the first open report notifies staff, without private contents");
        assert.equal((await call("manage/reports", { account: studentB })).status, 403);
        assert.equal((await get(`kites/${kiteA}`, studentB)).comments.length, 2, "Reporting does not hide content");
        const queue = await get("manage/reports", "teacher@test.invalid");
        assert.equal(queue.reports.find(({ id }) => id === reportId).details, "Private report details");
        assert.equal((await post(`manage/reports/${reportId}`, { action: "hide", note: "Not suitable." }, studentC)).status, 403);
        assert.equal((await post(`manage/reports/${secondReportId}`, { action: "dismiss", note: "No personal details." }, "teacher@test.invalid")).status, 200);
        assert.deepEqual((await get("manage/reports", "teacher@test.invalid")).reports.map(({ id }) => id), [reportId]);
        assert.equal((await post(`manage/reports/${reportId}`, { action: "hide", note: "Not suitable." }, "teacher@test.invalid")).status, 200);
        const moderated = await get(`kites/${kiteA}`, studentB);
        assert.equal(moderated.comments.length, 1);
        assert.equal(moderated.comments[0].replyUnavailable, true);
        assert.doesNotMatch(JSON.stringify(moderated), /How do you explain|Private report details/);
        assert.deepEqual((await get("contributions", studentC)).contributions, []);
        const kiteReport = await post(`kites/${kiteA}/reports`, { kind: "kite", targetId: kiteA, reason: "spam" }, studentB);
        assert.equal(kiteReport.status, 201);
        assert.equal((await post(`manage/reports/${(await kiteReport.json()).id}`, { action: "hide", note: "Confirmed." }, "teacher@test.invalid")).status, 200);
        host = await startApp();
        assert.equal((await call(`kites/${kiteA}`, { account: studentB })).status, 404);
        assert.deepEqual((await get("kites", studentB)).kites.map(({ id }) => id), [kiteB]);
        assert.equal((await get(`kites/${kiteB}`, studentB)).kite.contributor, "Test Student Two");
        assert.deepEqual((await get("contributions", studentD)).contributions, [], "Hidden kite evidence is not exposed");
        assert.equal((await pool.query("SELECT id FROM knowledge_web_moderation_actions")).rowCount, 3);
        assert.equal((await pool.query("SELECT id FROM knowledge_web_contribution_revisions")).rowCount, 1);
    });
