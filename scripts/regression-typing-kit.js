"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { randomUUID } = require("node:crypto");
const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { DEFAULT_START_DATE, WEEK_COUNT, PERIOD_COUNT, withTypingKitCard, isMonday, addDays, parseTypingResult, registerTypingKit } = require("../practical-skills/typing-kit-store");

const resultUrl = "https://www.typingtest.com/result.php?acc=97&nwpm=35&gwpm=36&ncpm=175&gcpm=180&dur=60&time=60&chksum=16988&unit=wpm&kh=998&td=null&err=1&hits=180&textfile=mediumText.txt&mobile=0&TIPS=RSHIFT#goog_game_inter";
const student = "student@school.nz";
const teacher = "teacher@school.nz";
const result = parseTypingResult(resultUrl);

function database() {
    const data = { start: DEFAULT_START_DATE, attempts: [], queries: [], fail: false };
    const pool = { async query(sql, params = []) {
        data.queries.push({ sql, params });
        if (data.fail) throw new Error("Database unavailable");
        if (/CREATE |INSERT INTO typing_kit_settings/.test(sql)) return { rows: [] };
        if (/SELECT start_date/.test(sql)) return { rows: [{ start_date: data.start }] };
        if (/UPDATE typing_kit_settings/.test(sql)) { data.start = params[0]; return { rows: [] }; }
        if (/SELECT \* FROM typing_kit_attempts/.test(sql)) {
            const rows = data.attempts.filter((row) => row.student_email === params[0] && (!params[1] || row.submission_id === params[1]));
            return { rows };
        }
        if (/INSERT INTO typing_kit_attempts/.test(sql)) {
            assert.match(sql, /FROM typing_kit_settings/, "Calendar membership is checked atomically when writing");
            assert.match(sql, /ON CONFLICT \(student_email, submission_id\) DO NOTHING/);
            const [email, id, weekStart, period, rawResult] = params;
            if (weekStart < data.start || weekStart > addDays(data.start, 42)
                || data.attempts.some((row) => row.student_email === email && row.submission_id === id)) return { rows: [] };
            const row = { id: data.attempts.length + 1, student_email: email, submission_id: id,
                week_start: weekStart, period, result: JSON.parse(rawResult), submitted_at: new Date().toISOString() };
            data.attempts.push(row);
            return { rows: [row] };
        }
        throw new Error(`Unexpected SQL: ${sql}`);
    } };
    return { data, pool };
}

async function fixture(t, options = {}) {
    const db = options.db || database();
    const app = express();
    app.use(express.json());
    // Simulate the server's already-verified Google middleware identity, never a client email claim.
    app.use((req, _res, next) => {
        const verifiedEmail = req.headers["x-test-verified-email"];
        if (verifiedEmail) req.auth_identity = { verified: true, source: "google_id_token", email: verifiedEmail };
        else if (req.headers.authorization) req.auth_identity = { verified: false, source: "none", error: "token_verification_failed" };
        next();
    });
    registerTypingKit(app, {
        pool: db.pool, hasDatabase: options.hasDatabase !== false,
        normalizeEmail: (value) => String(value || "").toLowerCase(),
        verifyGoogleAccessTokenAndExtractIdentity: options.verifyAccessToken,
        schoolDomain: "school.nz",
        canManagePracticalSchedule: async (email) => email === teacher
    });
    const server = await new Promise((resolve) => {
        const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    });
    t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
    async function call(route = "", { method = "GET", email = student, body, verified = true, claimedEmail = email, bearer = "" } = {}) {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/practical-skills/typing-kit${route}`, {
            method, headers: { "Content-Type": "application/json", "x-user-email": claimedEmail,
                ...(verified ? { "x-test-verified-email": email } : {}),
                ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
            body: body === undefined ? undefined : JSON.stringify(body)
        });
        return { status: response.status, body: await response.json(), headers: response.headers };
    }
    return { ...db, call };
}

test("seven Monday weeks, fourteen periods, and safe result-link extraction", () => {
    assert.equal(DEFAULT_START_DATE, "2026-10-26");
    assert.equal(WEEK_COUNT * PERIOD_COUNT, 14);
    assert.equal(addDays(DEFAULT_START_DATE, 48), "2026-12-13");
    assert.equal(isMonday("2026-10-26"), true);
    for (const value of ["2026-10-27", "2026-02-30", "2026-2-02", null]) assert.equal(isMonday(value), false);
    assert.equal(isMonday(addDays("2100-12-27", 42)), true, "A permitted start date can have weeks in the following year");
    assert.equal(result.netWpm, 35);
    assert.equal(result.grossWpm, 36);
    assert.equal(result.accuracy, 97);
    assert.equal(result.durationSeconds, 60);
    assert.doesNotMatch(result.sourceUrl, /TIPS|goog_game/);
    assert.equal(parseTypingResult(resultUrl.replace("www.typingtest.com", "typingtest.com")).netWpm, 35);
    for (const bad of [
        "not a URL", "https://www.typingtest.com/", resultUrl.replace("https:", "http:"),
        resultUrl.replace("www.typingtest.com", "typingtest.com.example.org"),
        resultUrl.replace("www.typingtest.com", "user@www.typingtest.com"),
        resultUrl.replace("www.typingtest.com", "www.typingtest.com:444"),
        resultUrl.replace("acc=97", "acc=101"), resultUrl.replace("acc=97", "acc="),
        resultUrl.replace("nwpm=35", "nwpm=-35"), resultUrl.replace("nwpm=35", "nwpm=37"),
        resultUrl.replace("nwpm=35", "nwpm=NaN"), resultUrl.replace("dur=60", "dur=120"),
        resultUrl.replace("time=60", "time=20"), resultUrl.replace("unit=wpm", "unit=cpm"),
        resultUrl.replace("acc=97", "acc=97&acc=50"), resultUrl.replace("acc=97&", ""),
        resultUrl.replace("hits=180", "hits=180&hits=100")
    ]) assert.throws(() => parseTypingResult(bad), Error, bad);
    assert.equal(parseTypingResult(resultUrl.replace("acc=97", "acc=0").replace("nwpm=35", "nwpm=0")).netWpm, 0, "A zero score remains a valid result");
});

test("Typing Kit is discoverable in existing and seeded libraries without duplicates", () => {
    const cards = withTypingKitCard([{ id: "kit-login" }]);
    assert.equal(cards.length, 2);
    assert.equal(cards[1].title, "Typing Kit");
    assert.equal(cards[1].cardLabel, "LICENCE KIT");
    assert.match(cards[1].href, /typing-kit\.html$/);
    assert.equal(withTypingKitCard(cards).length, 2);
    assert.equal(withTypingKitCard([{ id: "kit-typing", href: "/wrong" }])[0].href, cards[1].href);
    const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
    assert.match(source, /return withTypingKitCard\(parsed/);
    assert.match(source, /return withTypingKitCard\(stored/);
    assert.match(source, /candidate !== "kit-typing"/);
});

test("school identity, staff settings, input validation and explicit database failures", async (t) => {
    const errors = t.mock.method(console, "error", () => {});
    const { call, data } = await fixture(t);
    assert.equal((await call("", { email: "" })).status, 401);
    assert.equal((await call("", { email: "other@example.org" })).status, 401);
    const initial = await call();
    assert.equal(initial.body.startDate, DEFAULT_START_DATE);
    assert.equal(initial.body.weekCount, 7);
    assert.equal(initial.body.periodsPerWeek, 2);
    assert.equal(initial.body.canManage, false);
    assert.equal(initial.headers.get("cache-control"), "no-store");
    assert.equal((await call("", { email: teacher })).body.canManage, true);
    assert.equal((await call("/settings", { method: "PUT", body: { startDate: DEFAULT_START_DATE } })).status, 403);
    assert.equal((await call("/settings", { method: "PUT", email: teacher, body: { startDate: "2026-10-27" } })).status, 400);
    assert.equal((await call("/settings", { method: "PUT", email: teacher, body: { startDate: "1999-12-27" } })).status, 400);
    for (const body of [
        { weekStart: DEFAULT_START_DATE, period: 3, submissionId: randomUUID(), resultUrl },
        { weekStart: "2026-10-27", period: 1, submissionId: randomUUID(), resultUrl },
        { weekStart: DEFAULT_START_DATE, period: 1, submissionId: "bad", resultUrl },
        { weekStart: DEFAULT_START_DATE, period: 1, submissionId: randomUUID(), resultUrl: "https://example.org" }
    ]) assert.equal((await call("/attempts", { method: "POST", body })).status, 400);
    data.fail = true;
    assert.equal((await call()).status, 500);
    const noStorage = await fixture(t, { hasDatabase: false });
    assert.equal((await noStorage.call()).status, 503);
    const write = await noStorage.call("/attempts", { method: "POST", body: { weekStart: DEFAULT_START_DATE, period: 1, submissionId: randomUUID(), resultUrl } });
    assert.equal(write.status, 503);
    assert.match(write.body.error, /database storage/);
    assert.equal(noStorage.data.attempts.length, 0);
    assert.equal(errors.mock.calls.length, 3, "Database errors are logged as well as surfaced to the student");
});

test("all Typing Kit endpoints require verified Google identity and ignore spoofed email claims", async (t) => {
    const { call, data } = await fixture(t);
    const cases = [
        ["", { method: "GET" }],
        ["/attempts", { method: "POST", body: { weekStart: DEFAULT_START_DATE, period: 1, submissionId: randomUUID(), resultUrl } }],
        ["/settings", { method: "PUT", body: { startDate: "2026-11-02" } }]
    ];
    for (const [route, options] of cases) {
        for (const email of [student, teacher]) {
            const denied = await call(route, { ...options, email, verified: false });
            assert.equal(denied.status, 401, "An email header alone must never authenticate");
            assert.match(denied.body.error, /verified Google sign-in/);
            assert.equal(denied.headers.get("cache-control"), "no-store");
            assert.equal((await call(route, { ...options, email, verified: false, bearer: "invalid-or-expired" })).status, 401);
        }
    }
    assert.equal(data.queries.length, 0, "Reject unverified requests before any database access");
    const snapshot = await call("", { email: student, claimedEmail: teacher });
    assert.equal(snapshot.status, 200);
    assert.equal(snapshot.body.canManage, false, "A student cannot become staff via an email header");
    assert.equal((await call("/settings", { method: "PUT", email: student, claimedEmail: teacher,
        body: { startDate: "2026-11-02" } })).status, 403);
    await call("/attempts", { method: "POST", email: student, claimedEmail: teacher,
        body: { weekStart: DEFAULT_START_DATE, period: 1, submissionId: randomUUID(), resultUrl } });
    assert.equal(data.attempts[0].student_email, student, "Results belong only to the verified Google account");
    assert.equal((await call("", { email: teacher, claimedEmail: student })).body.attempts.length, 0);
    assert.equal((await call("/settings", { method: "PUT", email: teacher, claimedEmail: student,
        body: { startDate: "2026-11-02" } })).status, 200, "Verified staff can still manage the calendar");
});

test("Google-validated OAuth identities work without trusting header emails", async (t) => {
    const { call, data } = await fixture(t, {
        verifyAccessToken: async (token) => token === "google-validated-token"
            ? { ok: true, email: student } : { ok: false }
    });
    const options = { verified: false, bearer: "google-validated-token", claimedEmail: teacher };
    assert.equal((await call("", options)).status, 200);
    assert.equal((await call("", options)).body.canManage, false);
    assert.equal((await call("/settings", { ...options, method: "PUT", body: { startDate: DEFAULT_START_DATE } })).status, 403);
    assert.equal((await call("/attempts", { ...options, method: "POST",
        body: { weekStart: DEFAULT_START_DATE, period: 1, submissionId: randomUUID(), resultUrl } })).status, 201);
    assert.equal(data.attempts[0].student_email, student);
    assert.equal((await call("", { ...options, bearer: "untrusted-token" })).status, 401);
});

test("OAuth verification requires this app's audience, a live token and a Google-verified school email", async () => {
    const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
    const start = source.indexOf("async function verifyGoogleAccessTokenAndExtractIdentity(");
    const end = source.indexOf("\nfunction getRequestUserEmail(", start);
    let info = { aud: "our-client", expiry_date: Date.now() + 60000 };
    let profile = { email: student, email_verified: true };
    let fail = false;
    const context = vm.createContext({
        googleAuthClient: { getTokenInfo: async () => { if (fail) throw new Error("Invalid token"); return info; } },
        GOOGLE_ID_TOKEN_AUDIENCES: ["our-client"], Date, Number, String, AbortSignal,
        normalizeEmail: (value) => String(value || "").toLowerCase(),
        isSchoolEmail: (email) => email.endsWith("@school.nz"),
        fetch: async () => ({ ok: true, json: async () => profile })
    });
    vm.runInContext(source.slice(start, end), context);
    assert.equal((await context.verifyGoogleAccessTokenAndExtractIdentity("token")).email, student);
    info = { aud: "another-app", expiry_date: Date.now() + 60000 };
    assert.equal((await context.verifyGoogleAccessTokenAndExtractIdentity("token")).ok, false);
    info = { aud: "our-client", expiry_date: Date.now() - 1 };
    assert.equal((await context.verifyGoogleAccessTokenAndExtractIdentity("token")).ok, false);
    info = { aud: "our-client", expiry_date: Date.now() + 60000 };
    profile = { email: teacher, email_verified: false };
    assert.equal((await context.verifyGoogleAccessTokenAndExtractIdentity("token")).ok, false);
    profile = { email: "other@example.org", email_verified: true };
    assert.equal((await context.verifyGoogleAccessTokenAndExtractIdentity("token")).ok, false);
    fail = true;
    assert.equal((await context.verifyGoogleAccessTokenAndExtractIdentity("token")).ok, false);
});

test("all attempts retained, identity isolated, retries idempotent, dated history survives calendar changes and module reload", async (t) => {
    const db = database();
    const { call } = await fixture(t, { db });
    const first = { weekStart: DEFAULT_START_DATE, period: 1, submissionId: randomUUID(), resultUrl };
    const saved = await call("/attempts", { method: "POST", body: first });
    assert.equal(saved.status, 201);
    assert.equal(saved.body.attempt.netWpm, 35);
    assert.ok(saved.body.attempt.submittedAt);
    const retry = await call("/attempts", { method: "POST", body: first });
    assert.equal(retry.status, 200);
    assert.equal(retry.body.attempt.id, saved.body.attempt.id);
    const concurrent = { ...first, period: 2, submissionId: randomUUID() };
    const concurrentWrites = await Promise.all([
        call("/attempts", { method: "POST", body: concurrent }),
        call("/attempts", { method: "POST", body: concurrent })
    ]);
    assert.equal(concurrentWrites[0].body.attempt.id, concurrentWrites[1].body.attempt.id, "Concurrent retries save only one attempt");
    assert.equal((await call("/attempts", { method: "POST", body: { ...first, period: 2 } })).status, 409);
    assert.equal((await call("/attempts", { method: "POST", body: { ...first, resultUrl: resultUrl.replace("nwpm=35", "nwpm=34") } })).status, 409);
    assert.equal((await call("/attempts", { method: "POST", body: { ...first, submissionId: randomUUID() } })).status, 201, "An explicit new attempt is retained");
    assert.equal((await call()).body.attempts.length, 3);
    assert.equal((await call("", { email: "another@school.nz" })).body.attempts.length, 0);
    assert.equal((await call("/attempts", { method: "POST", body: { ...first, weekStart: "2026-12-14", submissionId: randomUUID() } })).status, 409);
    const last = { ...first, weekStart: "2026-12-07", period: 2, submissionId: randomUUID() };
    assert.equal((await call("/attempts", { method: "POST", body: last })).status, 201);
    assert.equal((await call("/settings", { method: "PUT", email: teacher, body: { startDate: "2027-02-01" } })).status, 200);
    assert.equal((await call("/attempts", { method: "POST", body: first })).status, 200, "Retry can recover a saved attempt after schedule changes");
    const after = (await call()).body;
    assert.equal(after.startDate, "2027-02-01");
    assert.equal(after.attempts.length, 4);
    assert.equal(after.attempts[0].weekStart, DEFAULT_START_DATE, "Changing dates never relabels existing attempts");
    const restarted = await fixture(t, { db });
    assert.equal((await restarted.call()).body.attempts.length, 4);
    assert.equal((await restarted.call()).body.startDate, "2027-02-01");
    assert.equal(db.data.queries.some(({ sql }) => /DELETE|certificate|practical_skills_progress/.test(sql)), false);
});

function frontend({ search = "", snapshot, deferred, failFirstPost = false } = {}) {
    const nodes = new Map();
    const events = {};
    const requests = [];
    let auth = JSON.stringify({ expiresAt: Date.now() + 60000, profile: { email: student }, idToken: "test-token" });
    function node() {
        const handlers = {};
        const button = { disabled: false };
        const input = { value: "", disabled: false };
        return { innerHTML: "", textContent: "", hidden: false, disabled: false, value: "",
            classList: { toggle() {} }, handlers, addEventListener(name, callback) { handlers[name] = callback; },
            querySelector: (selector) => selector === "button" ? button : input,
            querySelectorAll: () => [button, input], scrollIntoView() {} };
    }
    const get = (id) => { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); };
    const base = snapshot || { startDate: DEFAULT_START_DATE, canManage: false, attempts: [] };
    const context = vm.createContext({
        document: { hidden: false, getElementById: get, querySelector: () => node(),
            addEventListener(name, callback) { events[name] = callback; } },
        window: { location: { search }, addEventListener(name, callback) { events[name] = callback; } },
        localStorage: { getItem: () => auth }, sessionStorage: { getItem: () => null },
        crypto: { randomUUID }, URLSearchParams, Intl, Date,
        fetch: async (url, options) => {
            requests.push({ url, options });
            if (deferred) return new Promise((resolve) => { deferred.resolve = resolve; });
            if (options.method === "POST" && failFirstPost) {
                failFirstPost = false;
                throw new Error("Network connection lost");
            }
            const attempt = options.method === "POST" ? { id: String(requests.length), ...result,
                weekStart: DEFAULT_START_DATE, period: 1, submittedAt: "2026-10-26T01:00:00Z" } : null;
            return { ok: true, json: async () => attempt ? { attempt } : structuredClone(base) };
        }
    });
    const source = fs.readFileSync(path.join(__dirname, "..", "practical-skills", "typing-kit.js"), "utf8");
    vm.runInContext(source, context);
    return { nodes, get, events, requests, signOut() { auth = null; events["hub-auth-state-changed"](); } };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("dashboard renders exactly seven dated weeks and fourteen daily record links", async () => {
    const ui = frontend();
    await settle();
    const html = ui.get("typing-content").innerHTML;
    assert.equal((html.match(/class="typing-week"/g) || []).length, 7);
    assert.equal((html.match(/Open daily record/g) || []).length, 14);
    assert.match(html, /26 Oct 2026/);
    assert.match(html, /13 Dec 2026/);
    assert.match(html, /0 \/ 14 period records started/);
    assert.equal(ui.get("typing-identity-verification").hidden, true);
    assert.match(html, /week=2026-12-07&amp;period=2|week=2026-12-07&period=2/);
    assert.doesNotMatch(html, /typing-settings-form|certificate|Mark Complete/);
    assert.equal(ui.requests[0].options.headers.Authorization, "Bearer test-token");
});

test("saved result shows a fourth date circle using the saved timestamp in New Zealand time", async () => {
    const ui = frontend({ search: "?week=2026-10-26&period=1", snapshot: {
        startDate: DEFAULT_START_DATE, canManage: false, attempts: [
            { ...result, weekStart: DEFAULT_START_DATE, period: 1, submittedAt: "2026-10-26T12:30:00Z" }
        ]
    } });
    await settle();
    const html = ui.get("typing-content").innerHTML;
    assert.match(html, /typing-metric-date/);
    assert.match(html, /<dt>Date saved<\/dt>/);
    assert.match(html, /datetime="2026-10-26T12:30:00Z">27 Oct 2026<\/time>/);
    assert.equal((html.match(/class="typing-metric typing-metric-/g) || []).length, 4);
    assert.match(html, /When your result was saved/);
    assert.doesNotMatch(html, /<dt>Test date<\/dt>/);
});

test("paused teacher typing preview displays the log but disables submission and calendar controls", async () => {
    for (const search of ["", "?week=2026-10-26&period=1"]) {
        const ui = frontend({ search, snapshot: { startDate: DEFAULT_START_DATE, canManage: true, attempts: [], readOnly: true } });
        await settle();
        assert.match(ui.get("typing-status").textContent, /Teacher preview.*Not Live/);
        const controls = ui.get("typing-content").querySelectorAll();
        assert.ok(controls.every((control) => control.disabled));
        assert.equal(ui.requests.length, 1);
        assert.equal(ui.get("typing-identity-verification").hidden, true);
    }
});

test("daily page saves before asking for book copying, keeps repeated attempts, and prompts only after launch", async () => {
    const ui = frontend({ search: "?week=2026-10-26&period=1" });
    await settle();
    assert.match(ui.get("typing-content").innerHTML, /Daily record details/);
    assert.doesNotMatch(ui.get("typing-content").innerHTML, /Latest saved result/);
    ui.events.focus();
    assert.equal(ui.get("typing-return-prompt").textContent, "");
    ui.get("typing-launch-easy").handlers.click();
    ui.events.focus();
    assert.match(ui.get("typing-return-prompt").textContent, /Finished your test\?/);
    ui.get("typing-result-url").value = resultUrl;
    const form = ui.get("typing-result-form");
    await form.handlers.submit({ preventDefault() {}, currentTarget: form });
    assert.match(ui.get("typing-status").textContent, /Result saved: 35 WPM, 97% accuracy/);
    assert.match(ui.get("typing-content").innerHTML, /Now copy this result into your exercise book/);
    assert.match(ui.get("typing-content").innerHTML, /35<\/td>/);
    ui.get("typing-result-url").value = resultUrl;
    await form.handlers.submit({ preventDefault() {}, currentTarget: form });
    const postBodies = ui.requests.filter(({ options }) => options.method === "POST").map(({ options }) => JSON.parse(options.body));
    assert.equal(postBodies.length, 2);
    assert.notEqual(postBodies[0].submissionId, postBodies[1].submissionId);
    assert.equal((ui.get("typing-content").innerHTML.match(/Results link \(new tab\)/g) || []).length, 2);
});

test("latest scorecard shows saved gross speed, accuracy and net speed with an exercise-book record", async () => {
    for (const saved of [
        { grossWpm: 37, accuracy: 97, netWpm: 36 },
        { grossWpm: 0, accuracy: 0, netWpm: 0 },
        { grossWpm: 123.5, accuracy: 98.5, netWpm: 121.6 }
    ]) {
        const ui = frontend({ search: "?week=2026-10-26&period=1", snapshot: {
            startDate: DEFAULT_START_DATE, canManage: false, attempts: [
                { ...result, netWpm: 200, weekStart: DEFAULT_START_DATE, period: 1, submittedAt: "2026-10-26T00:00:00Z" },
                { ...result, ...saved, weekStart: DEFAULT_START_DATE, period: 1, submittedAt: "2026-10-26T01:00:00Z" }
            ]
        } });
        await settle();
        const html = ui.get("typing-content").innerHTML;
        assert.match(html, /<dl class="typing-scoreboard">/);
        assert.equal((html.match(/class="typing-score-value"/g) || []).length, 3);
        assert.ok(html.includes(`class="typing-score-value">${saved.grossWpm}</span>`));
        assert.ok(html.includes(`class="typing-score-value">${saved.accuracy}<span`));
        assert.ok(html.includes(`class="typing-score-value">${saved.netWpm}</span>`));
        assert.ok(html.includes(`Net speed: <b>${saved.netWpm} WPM</b>`));
        assert.ok(html.includes(`Accuracy: <b>${saved.accuracy}%</b>`));
        assert.match(html, /Week 1.*Period 1<\/b>.*Week of 26 Oct 2026/);
        assert.match(html, /Then show your teacher/);
        assert.match(html, /ask them to sign your exercise book/);
        assert.match(html, /200<\/td>/, "Earlier attempts remain in the history");
        assert.doesNotMatch(html, /typos|personal best|new record/i);
    }
});

test("three coloured difficulty buttons directly launch one-minute tests and retain return prompts", async () => {
    const files = { easy: "easyText.txt", medium: "mediumText.txt", hard: "difficultText.txt" };
    const css = fs.readFileSync(path.join(__dirname, "..", "practical-skills", "typing-kit.css"), "utf8");
    const colours = [];
    for (const [difficulty, file] of Object.entries(files)) {
        const ui = frontend({ search: "?week=2026-10-26&period=1" });
        await settle();
        const html = ui.get("typing-content").innerHTML;
        assert.equal((html.match(/id="typing-launch-(?:easy|medium|hard)"/g) || []).length, 3);
        const anchor = html.match(new RegExp(`<a id="typing-launch-${difficulty}"[^>]+>`))?.[0];
        assert.ok(anchor);
        const url = new URL(anchor.match(/href="([^"]+)"/)[1].replace(/&amp;/g, "&"));
        assert.equal(url.origin, "https://www.typingtest.com");
        assert.equal(url.pathname, "/test.php");
        assert.equal(url.searchParams.get("minutes"), "1");
        assert.equal(url.searchParams.get("textfile"), file);
        assert.equal(url.searchParams.get("mode"), "sent");
        assert.equal(url.searchParams.get("result_url"), "/result.php");
        assert.match(anchor, /target="_blank" rel="noopener noreferrer"/);
        assert.match(html, /Each button opens a new tab/);
        ui.get(`typing-launch-${difficulty}`).handlers.click();
        ui.events.focus();
        assert.match(ui.get("typing-return-prompt").textContent, /Finished your test\?/);
        const style = css.match(new RegExp(`\\.typing-launch-${difficulty} \\{ background: (#[0-9a-f]+); color: #fff; \\}`));
        assert.ok(style, "Each level has a distinct colour and white text");
        colours.push(style[1]);
        const channels = style[1].slice(1).match(/../g).map((hex) => parseInt(hex, 16) / 255)
            .map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
        const luminance = channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
        assert.ok(1.05 / (luminance + .05) >= 4.5, "Button text meets WCAG AA contrast");
    }
    assert.equal(new Set(colours).size, 3);
});

test("archived dated records remain reachable and are read-only; invalid daily routes are rejected", async () => {
    const snapshot = { startDate: "2027-02-01", canManage: true, attempts: [
        { id: "1", ...result, weekStart: DEFAULT_START_DATE, period: 1, submittedAt: "2026-10-26T01:00:00Z" }
    ] };
    const overview = frontend({ snapshot });
    await settle();
    assert.match(overview.get("typing-content").innerHTML, /Earlier \/ other dated records/);
    assert.match(overview.get("typing-content").innerHTML, /typing-settings-form/);
    assert.match(overview.get("typing-content").innerHTML, /applies to all students/);
    const archived = frontend({ snapshot, search: "?week=2026-10-26&period=1" });
    const invalid = frontend({ search: "?week=2026-10-26&period=3" });
    await settle();
    assert.match(archived.get("typing-content").innerHTML, /Archived period 1/);
    assert.doesNotMatch(archived.get("typing-content").innerHTML, /typing-result-form|typing-launch/);
    assert.match(invalid.get("typing-status").textContent, /Choose a valid daily record/);
});

test("sign-out clears history and ignores outstanding responses", async () => {
    const deferred = {};
    const ui = frontend({ deferred });
    await settle();
    ui.signOut();
    assert.equal(ui.get("typing-identity-verification").hidden, false, "Google verification remains available after sign-out");
    deferred.resolve({ ok: true, json: async () => ({ startDate: DEFAULT_START_DATE, attempts: [], canManage: false }) });
    await settle();
    assert.equal(ui.get("typing-content").innerHTML, "");
    assert.match(ui.get("typing-status").textContent, /Sign in with your school Google account/);
});

test("a failed submission keeps its input and reuses the submission ID on retry", async () => {
    const ui = frontend({ search: "?week=2026-10-26&period=1", failFirstPost: true });
    await settle();
    ui.get("typing-result-url").value = resultUrl;
    const form = ui.get("typing-result-form");
    await form.handlers.submit({ preventDefault() {}, currentTarget: form });
    assert.match(ui.get("typing-status").textContent, /Network connection lost/);
    assert.equal(ui.get("typing-result-url").value, resultUrl);
    assert.equal(ui.get("typing-result-url").disabled, false);
    assert.doesNotMatch(ui.get("typing-content").innerHTML, /Latest saved result/);
    await form.handlers.submit({ preventDefault() {}, currentTarget: form });
    const writes = ui.requests.filter(({ options }) => options.method === "POST").map(({ options }) => JSON.parse(options.body));
    assert.equal(writes.length, 2);
    assert.equal(writes[0].submissionId, writes[1].submissionId, "A retry must not add another attempt if the original reached the server");
    assert.match(ui.get("typing-status").textContent, /Result saved/);
});
