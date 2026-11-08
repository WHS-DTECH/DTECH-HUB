"use strict";

const RULE_START_WEEK = 5;
const addDays = (start, days) => {
    const date = new Date(`${start}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
};

function weeklyTypingProgress(startDate, attempts, attendance, today) {
    const weeks = Array.from({ length: 7 }, (_, index) => {
        const weekStart = addDays(startDate, index * 7);
        const source = attendance.weeks?.find(week => week.weekStart === weekStart);
        const lessons = source?.lessons || [];
        const absent = lessons.filter(lesson => lesson.mark === "A" && lesson.date <= today).length;
        const attended = lessons.some(lesson => ["P", "L"].includes(lesson.mark) && lesson.date <= today);
        const recorded = attempts.some(attempt => attempt.week_start === weekStart);
        let status = index < RULE_START_WEEK - 1 ? "legacy" : weekStart > today ? "future" : recorded ? "completed" : "pending";
        if (status === "pending" && source?.confirmed && lessons.length &&
            lessons.every(lesson => lesson.date <= today && lesson.mark === "A")) status = "excused";
        else if (status === "pending" && attended) status = "required";
        return { week: index + 1, weekStart, status, recorded, absentClasses: absent, scheduledClasses: lessons.length,
            attendanceConfirmed: source?.confirmed === true, lessons };
    });
    const required = weeks.filter(week => week.week >= RULE_START_WEEK);
    return { active: attendance.active, sourceStatus: attendance.status, error: attendance.error || "", today,
        fetchedAt: attendance.fetchedAt || null, ruleStartWeek: RULE_START_WEEK, weeks,
        completedWeeks: required.filter(week => week.status === "completed").length,
        excusedWeeks: required.filter(week => week.status === "excused").length,
        satisfied: required.every(week => ["completed", "excused"].includes(week.status)) };
}

function createTypingAttendanceClient({ env = process.env, fetchSource = fetch } = {}) {
    const url = env.TYPING_ATTENDANCE_URL;
    const key = env.TYPING_ATTENDANCE_KEY;
    if (!url && !key) return async () => ({ active: false, status: "not-configured", weeks: [] });
    if (!url || !key || key.length < 32) throw new Error("Configure both TYPING_ATTENDANCE_URL and a TYPING_ATTENDANCE_KEY of at least 32 characters.");
    const endpoint = new URL(url);
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.search || endpoint.hash ||
        endpoint.pathname !== "/integrations/typing-attendance") throw new Error("TYPING_ATTENDANCE_URL must be an HTTPS typing-attendance integration endpoint.");
    function validate(data, studentEmail, startDate) {
        if (data.version !== 1 || data.studentEmail !== studentEmail || data.startDate !== startDate ||
            !Array.isArray(data.weeks) || data.weeks.length !== 7 || !Number.isFinite(Date.parse(data.fetchedAt)) ||
            Date.parse(data.fetchedAt) < Date.now() - 5 * 60000 || Date.parse(data.fetchedAt) > Date.now() + 60000 ||
            data.weeks.some((week, index) => week.weekStart !== addDays(startDate, index * 7) ||
                typeof week.confirmed !== "boolean" || !Array.isArray(week.lessons) || week.lessons.length > 25 ||
                new Set(week.lessons.map(lesson => `${lesson.date}:${lesson.period}`)).size !== week.lessons.length ||
                week.lessons.some(lesson => !["", "P", "A", "L"].includes(lesson.mark) || !/^p[1-5]$/.test(lesson.period) ||
                    !Array.from({ length: 5 }, (_, day) => addDays(week.weekStart, day)).includes(lesson.date)))) {
            throw new Error("Planner attendance response is invalid or stale");
        }
        return { active: true, status: "available", fetchedAt: data.fetchedAt, weeks: data.weeks };
    }
    const unavailable = () => ({ active: true, status: "unavailable", weeks: [],
        error: "Teacher Planner attendance could not be confirmed. Retry shortly or ask your teacher. Saved typing results are safe." });
    const client = async (studentEmail, startDate) => {
        try {
            const response = await fetchSource(endpoint.href, {
                method: "POST", redirect: "error", signal: AbortSignal.timeout(45000),
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
                body: JSON.stringify({ studentEmail, startDate })
            });
            if (!response.ok) throw new Error(`Planner returned ${response.status}`);
            const data = await response.json();
            return validate(data, studentEmail, startDate);
        } catch (error) {
            console.error("[typing-attendance] Read failed:", error.name);
            return unavailable();
        }
    };
    client.batch = async (studentEmails, startDate) => {
        try {
            const response = await fetchSource(endpoint.href + "/batch", {
                method: "POST", redirect: "error", signal: AbortSignal.timeout(45000),
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
                body: JSON.stringify({ studentEmails, startDate })
            });
            if (response.status === 404) {
                console.warn("[typing-attendance] Batch endpoint not available; using individual reads.");
                const results = [];
                for (let index = 0; index < studentEmails.length; index += 4) {
                    results.push(...await Promise.all(studentEmails.slice(index, index + 4).map(email => client(email, startDate))));
                }
                return Object.fromEntries(studentEmails.map((email, index) => [email, results[index]]));
            }
            if (!response.ok) throw new Error(`Planner returned ${response.status}`);
            const data = await response.json();
            if (!Array.isArray(data.students) || data.students.length !== studentEmails.length ||
                new Set(data.students.map(item => item.studentEmail)).size !== studentEmails.length ||
                data.students.some(item => !studentEmails.includes(item.studentEmail))) throw new Error("Invalid batch response");
            return Object.fromEntries(data.students.map(item => {
                if (item.error) return [item.studentEmail, unavailable()];
                try {
                    return [item.studentEmail, validate(item, item.studentEmail, startDate)];
                } catch (error) {
                    console.error("[typing-attendance] Student response invalid:", error.name);
                    return [item.studentEmail, unavailable()];
                }
            }));
        } catch (error) {
            console.error("[typing-attendance] Batch read failed:", error.name);
            return Object.fromEntries(studentEmails.map(email => [email, unavailable()]));
        }
    };
    return client;
}

module.exports = { RULE_START_WEEK, weeklyTypingProgress, createTypingAttendanceClient };
