"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { weeklyTypingProgress, createTypingAttendanceClient } = require("../practical-skills/typing-attendance");
const { addDays } = require("../practical-skills/typing-kit-store");
const startDate = "2026-10-26";
function attendance(marks = ["P", "P"], active = true) {
    return { active, status: "available", weeks: Array.from({ length: 7 }, (_, index) => {
        const weekStart = addDays(startDate, index * 7);
        return { weekStart, confirmed: true, lessons: [
            { date: addDays(weekStart, 1), period: "p1", mark: marks[0] },
            { date: addDays(weekStart, 4), period: "p3", mark: marks[1] }
        ] };
    }) };
}
test("one result per attended week from Week 5 satisfies the rule; Weeks 1-4 need nothing", () => {
    const attempts = [4, 5, 6].map(index => ({ week_start: addDays(startDate, index * 7), period: 2 }));
    const progress = weeklyTypingProgress(startDate, attempts, attendance(), "2026-12-12");
    assert.equal(progress.satisfied, true);
    assert.equal(progress.completedWeeks, 3);
    assert.equal(progress.excusedWeeks, 0);
    assert.deepEqual(progress.weeks.slice(0, 4).map(week => week.status), ["legacy", "legacy", "legacy", "legacy"]);
    assert.equal(weeklyTypingProgress(startDate, [{ week_start: startDate }], attendance(), "2026-12-12").satisfied, false);
});
test("fully absent weeks are excused without catch-up; partial, blank and late attendance are not", () => {
    assert.equal(weeklyTypingProgress(startDate, [], attendance(["A", "A"]), "2026-12-12").excusedWeeks, 3);
    assert.equal(weeklyTypingProgress(startDate, [], attendance(["A", "A"]), "2026-12-12").satisfied, true);
    for (const marks of [["A", "P"], ["A", "L"], ["A", ""], ["", ""], ["P", "P"]]) {
        const progress = weeklyTypingProgress(startDate, [], attendance(marks), "2026-12-12");
        assert.equal(progress.excusedWeeks, 0);
        assert.equal(progress.satisfied, false);
        assert.equal(progress.weeks[4].status, marks.some(mark => ["P", "L"].includes(mark)) ? "required" : "pending");
    }
});
test("unknown schedules and future marks never excuse a week; saved results still satisfy unknown attendance", () => {
    const source = attendance(["A", "A"]);
    source.weeks[4].confirmed = false;
    assert.equal(weeklyTypingProgress(startDate, [], source, "2026-12-12").weeks[4].status, "pending");
    const empty = { active: true, status: "unavailable", weeks: [], error: "Source unavailable" };
    assert.equal(weeklyTypingProgress(startDate, [], empty, "2026-12-12").satisfied, false);
    assert.equal(weeklyTypingProgress(startDate, [4, 5, 6].map(index => ({ week_start: addDays(startDate, index * 7) })), empty, "2026-12-12").satisfied, true);
    const early = weeklyTypingProgress(startDate, [], attendance(["A", "A"]), "2026-11-24");
    assert.equal(early.weeks[4].status, "pending");
    assert.equal(early.weeks[5].status, "future");
    assert.equal(early.weeks[4].absentClasses, 1);
});
test("client is explicitly inactive until configured and rejects insecure or partial configuration", async () => {
    assert.equal((await createTypingAttendanceClient({ env: {} })()).active, false);
    for (const env of [{ TYPING_ATTENDANCE_KEY: "short" },
        { TYPING_ATTENDANCE_KEY: "x".repeat(40), TYPING_ATTENDANCE_URL: "http://example.test/integrations/typing-attendance" },
        { TYPING_ATTENDANCE_KEY: "x".repeat(40), TYPING_ATTENDANCE_URL: "https://user:secret@example.test/integrations/typing-attendance" }]) {
        assert.throws(() => createTypingAttendanceClient({ env }));
    }
});
test("client sends only verified server-supplied identity and validates current, private attendance responses", async () => {
    const source = attendance(), email = "synthetic@school.nz", requests = [];
    let data = { version: 1, studentEmail: email, startDate, fetchedAt: new Date().toISOString(), weeks: source.weeks };
    let status = 200;
    const client = createTypingAttendanceClient({
        env: { TYPING_ATTENDANCE_KEY: "synthetic-key-" + "x".repeat(32), TYPING_ATTENDANCE_URL: "https://example.test/integrations/typing-attendance" },
        fetchSource: async (url, options) => {
            requests.push({ url, options });
            return { ok: status === 200, status, json: async () => data };
        }
    });
    assert.equal((await client(email, startDate)).status, "available");
    assert.deepEqual(JSON.parse(requests[0].options.body), { studentEmail: email, startDate });
    assert.equal(requests[0].options.redirect, "error");
    assert.match(requests[0].options.headers.Authorization, /^Bearer /);
    const original = structuredClone(data);
    data = { students: [original, { studentEmail: "other@school.nz", error: "No class" }] };
    const batch = await client.batch([email, "other@school.nz"], startDate);
    assert.equal(batch[email].status, "available");
    assert.equal(batch["other@school.nz"].status, "unavailable");
    assert.deepEqual(JSON.parse(requests.at(-1).options.body), { studentEmails: [email, "other@school.nz"], startDate });
    assert.ok(requests.at(-1).url.endsWith("/batch"));
    data = { students: [original, original] };
    assert.equal((await client.batch([email, "other@school.nz"], startDate))[email].status, "unavailable");
    data = { students: [original, { ...structuredClone(original), studentEmail: "other@school.nz", fetchedAt: "2020-01-01" }] };
    const partial = await client.batch([email, "other@school.nz"], startDate);
    assert.equal(partial[email].status, "available", "One invalid response does not hide another student's attendance");
    assert.equal(partial["other@school.nz"].status, "unavailable");
    for (const mutate of [
        data => { data.studentEmail = "another@school.nz"; },
        data => { data.startDate = "2026-11-02"; },
        data => { data.fetchedAt = "2020-01-01"; },
        data => { data.weeks.pop(); },
        data => { data.weeks[0].lessons[0].mark = "SICK"; },
        data => { data.weeks[0].lessons.push(data.weeks[0].lessons[0]); },
        data => { data.weeks[0].lessons[0].date = "2026-12-30"; }
    ]) {
        data = structuredClone(original);
        mutate(data);
        const result = await client(email, startDate);
        assert.equal(result.status, "unavailable");
        assert.deepEqual(result.weeks, []);
        assert.ok(result.error);
    }
    status = 401;
    assert.equal((await client(email, startDate)).status, "unavailable", "Authentication failure is never a successful empty attendance response");
});
test("a missing batch endpoint falls back to bounded individual reads", async () => {
    let active = 0, maximum = 0;
    const emails = Array.from({ length: 9 }, (_, index) => `student${index}@school.nz`);
    const client = createTypingAttendanceClient({
        env: { TYPING_ATTENDANCE_KEY: "x".repeat(40), TYPING_ATTENDANCE_URL: "https://example.test/integrations/typing-attendance" },
        fetchSource: async (url, options) => {
            if (url.endsWith("/batch")) return { status: 404, ok: false };
            active++;
            maximum = Math.max(maximum, active);
            await new Promise(resolve => setImmediate(resolve));
            active--;
            const { studentEmail } = JSON.parse(options.body);
            return { status: 200, ok: true, json: async () => ({ version: 1, studentEmail, startDate,
                fetchedAt: new Date().toISOString(), weeks: attendance().weeks }) };
        }
    });
    const results = await client.batch(emails, startDate);
    assert.ok(emails.every(email => results[email].status === "available"));
    assert.equal(maximum, 4);
});
test("student UI labels completed and excused weeks without confusing school periods and typing slots", () => {
    const source = fs.readFileSync(path.join(__dirname, "..", "practical-skills", "typing-kit.js"), "utf8");
    const start = source.indexOf("    function weeklyRulesNotice()");
    const end = source.indexOf("    function weeks()", start);
    const progress = weeklyTypingProgress(startDate, [], attendance(["A", "A"]), "2026-12-12");
    const context = vm.createContext({
        state: { snapshot: { weeklyProgress: progress } },
        escapeHtml: value => String(value).replace(/</g, "&lt;"),
        dateLabel: value => value, timeLabel: value => value
    });
    vm.runInContext(source.slice(start, end), context);
    assert.match(context.weeklyRulesNotice(), /Weeks 5-7: 0 completed &middot; 3 excused/);
    assert.match(context.weekAttendance("2026-11-23"), /Week excused/);
    assert.match(context.weekAttendance("2026-11-23"), /school P1/);
    assert.match(context.weekAttendance("2026-11-23"), /No catch-up needed/);
    assert.match(context.weekAttendance(startDate), /no new weekly requirement/);
    progress.active = false;
    assert.match(context.weeklyRulesNotice(), /not active yet/);
    assert.equal(context.weekAttendance(startDate), "");
});
