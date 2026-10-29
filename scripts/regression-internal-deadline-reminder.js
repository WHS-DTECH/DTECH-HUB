const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");

const start = script.indexOf("let INTERNAL_ASSESSMENT_DEADLINE =");
const end = script.indexOf("function renderHubPracticalSkillsMenu(");
assert.ok(start > 0 && end > start, "Reminder source block found");

function makeDom() {
    const dialogs = [];
    const makeDialog = () => {
        const listeners = {};
        const buttons = [];
        const dialog = {
            className: "", attrs: {}, open: false, removed: false, focused: false,
            setAttribute(name, value) { this.attrs[name] = value; },
            set innerHTML(html) {
                this.html = html;
                const count = (html.match(/data-internal-deadline-dismiss/g) || []).length;
                for (let i = 0; i < count; i += 1) {
                    const handlers = [];
                    buttons.push({ addEventListener: (_t, fn) => handlers.push(fn), click: () => handlers.forEach((fn) => fn()), focus() { dialog.focused = true; } });
                }
            },
            get innerHTML() { return this.html; },
            querySelectorAll: () => buttons,
            querySelector: () => buttons[buttons.length - 1],
            addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
            showModal() { this.open = true; },
            close() { this.open = false; },
            fireClose() { this.open = false; (listeners.close || []).splice(0).forEach((fn) => fn()); },
            remove() { this.removed = true; dialogs.splice(dialogs.indexOf(this), 1); },
            buttons
        };
        return dialog;
    };
    const document = {
        createElement: () => makeDialog(),
        body: { appendChild: (el) => dialogs.push(el) },
        querySelector: (selector) => dialogs.find((d) => selector.includes(d.className)) || null
    };
    return { document, dialogs };
}

function makeContext() {
    const store = new Map();
    const { document, dialogs } = makeDom();
    const context = vm.createContext({
        document, Intl, Date,
        normalizeEmail: (v) => String(v || "").trim().toLowerCase(),
        localStorage: { getItem: (k) => store.get(k) || null, setItem: (k, v) => store.set(k, v) }
    });
    vm.runInContext(script.slice(start, end), context);
    return { context, dialogs, store };
}

// NZ local midday (UTC+13 during daylight saving).
const nz = (iso) => new Date(`${iso}T12:00:00+13:00`);

const { context } = makeContext();
const shows = (iso) => context.shouldShowInternalAssessmentDeadlineReminder(nz(iso));
assert.equal(shows("2026-10-26"), true, "Monday before the deadline");
assert.equal(shows("2026-10-28"), true, "Wednesday before the deadline");
assert.equal(shows("2026-10-21"), true, "Earlier Wednesday");
assert.equal(shows("2026-10-27"), false, "Tuesday");
assert.equal(shows("2026-10-29"), false, "Deadline Thursday is not a reminder day");
assert.equal(shows("2026-10-23"), false, "Friday");
assert.equal(shows("2026-11-02"), false, "No reminders after the deadline");
assert.equal(context.shouldShowInternalAssessmentDeadlineReminder(new Date("2026-10-25T12:30:00Z")), true,
    "Uses NZ time: Sunday 12:30 UTC is already Monday in New Zealand");

{
    const { context: ctx, dialogs, store } = makeContext();
    ctx.showInternalAssessmentDeadlineReminder("Student@WHS.nz", nz("2026-10-26"));
    assert.equal(dialogs.length, 1, "Shows on Monday");
    const dialog = dialogs[0];
    assert.ok(dialog.open && dialog.focused, "Opens modally with the dismiss button focused");
    assert.match(dialog.innerHTML, /must be completed and submitted no later than Thursday 29 October/);
    ctx.showInternalAssessmentDeadlineReminder("student@whs.nz", nz("2026-10-26"));
    assert.equal(dialogs.length, 1, "Does not stack duplicates");
    dialog.buttons[0].click();
    assert.ok(dialog.removed, "Close button dismisses");
    assert.ok(store.has("hub_internal_deadline_reminder_dismissed_v1:student@whs.nz:2026-10-26:2026-10-29"));
    ctx.showInternalAssessmentDeadlineReminder("student@whs.nz", nz("2026-10-26"));
    assert.equal(dialogs.length, 0, "Stays dismissed for the rest of the day");
    ctx.showInternalAssessmentDeadlineReminder("student@whs.nz", nz("2026-10-28"));
    assert.equal(dialogs.length, 1, "Returns on Wednesday");
    dialogs[0].fireClose();
    assert.equal(dialogs.length, 0, "Esc (native close) also dismisses");
    assert.ok(store.has("hub_internal_deadline_reminder_dismissed_v1:student@whs.nz:2026-10-28:2026-10-29"));
    ctx.showInternalAssessmentDeadlineReminder("", nz("2026-10-28"));
}

{
    const { context: ctx, dialogs } = makeContext();
    const listeners = [];
    const exam = { className: "hub-external-exam-reminder", addEventListener: (_t, fn) => listeners.push(fn), remove() { dialogs.splice(dialogs.indexOf(exam), 1); } };
    dialogs.push(exam);
    ctx.showInternalAssessmentDeadlineReminder("student@whs.nz", nz("2026-10-26"));
    assert.equal(dialogs.length, 1, "Waits while the exam reminder is open");
    exam.remove();
    listeners.forEach((fn) => fn());
    assert.equal(dialogs.length, 1);
    assert.equal(dialogs[0].className, "hub-internal-deadline-reminder", "Shows after the exam reminder closes");
}

{
    const { context: ctx, dialogs } = makeContext();
    vm.runInContext('INTERNAL_ASSESSMENT_DEADLINE = "2026-11-05";', ctx);
    ctx.showInternalAssessmentDeadlineReminder("student@whs.nz", nz("2026-11-02"));
    assert.equal(dialogs.length, 1, "An extended due date extends the reminder schedule");
    assert.match(dialogs[0].innerHTML, /Thursday 5 November/);
    assert.match(dialogs[0].innerHTML, /<span>Nov<\/span><strong>5<\/strong><span>Thu<\/span>/);
}

assert.match(script, /if \(hasInternalAssessment\) \{[\s\S]*?await loadInternalAssessmentDeadline\(email\);[\s\S]*?showInternalAssessmentDeadlineReminder\(email\);/,
    "Only students with internal assessment get the reminder");
assert.match(styles, /@media \(prefers-reduced-motion: no-preference\)[\s\S]*?hub-internal-deadline-reminder\[open\]/,
    "Motion only runs when the student allows it");
assert.doesNotMatch(styles.slice(styles.indexOf(".hub-internal-deadline-reminder {"), styles.indexOf(".hub-sidebar-alloc-section {")), /infinite/,
    "No looping or flashing animation");

console.log("Internal assessment deadline reminder regressions passed.");
