(function (root) {
    "use strict";
    function termWeek(weekStart) {
        if (weekStart < "2026-10-12" || weekStart > "2026-12-07") return null;
        const days = (Date.parse(`${weekStart}T00:00:00Z`) - Date.parse("2026-10-12T00:00:00Z")) / 86400000;
        return Number.isInteger(days) && days % 7 === 0 ? days / 7 + 1 : null;
    }
    function label(weekStart, logWeek) {
        const week = termWeek(weekStart);
        return week === null ? `Log Week ${logWeek}` : `Term Week ${week}`;
    }
    function range(firstStart, firstLogWeek, lastStart, lastLogWeek) {
        const first = termWeek(firstStart), last = termWeek(lastStart);
        return first !== null && last !== null
            ? `Term Weeks ${first}-${last}` : `Log Weeks ${firstLogWeek}-${lastLogWeek}`;
    }
    const labels = { label, range };
    if (typeof module !== "undefined" && module.exports) module.exports = labels;
    else root.TypingWeekLabels = labels;
})(typeof window !== "undefined" ? window : globalThis);
