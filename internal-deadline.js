"use strict";

const DEFAULT_INTERNAL_DEADLINE = "2026-10-29";
const DEADLINE_COURSES = ["JuniorDTECH", "MiddleDTECH", "SeniorDTECH"];

function validDeadline(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "2000-01-01" || value > "2100-12-31") return false;
    const date = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validDeadlineCourses(value) {
    return Array.isArray(value) && value.length > 0 && value.length <= DEADLINE_COURSES.length &&
        value.every((course) => DEADLINE_COURSES.includes(course)) && new Set(value).size === value.length;
}

function parseSavedCourses(value) {
    if (value === null || value === undefined || value === "") return DEADLINE_COURSES.slice();
    const courses = JSON.parse(value);
    if (!validDeadlineCourses(courses)) throw new Error("The saved internal due date courses are invalid.");
    return DEADLINE_COURSES.filter((course) => courses.includes(course));
}

function registerInternalDeadline(app, { pool, getRequestUserEmail, normalizeEmail, schoolDomain, canManage, getCourse }) {
    let schema;
    async function ensureSchema() {
        if (!schema) schema = (async () => {
            await pool.query(`CREATE TABLE IF NOT EXISTS hub_internal_deadline (
                id INTEGER PRIMARY KEY CHECK (id = 1), due_date TEXT NOT NULL,
                updated_by_email TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )`);
            await pool.query("ALTER TABLE hub_internal_deadline ADD COLUMN IF NOT EXISTS courses TEXT");
        })().catch((error) => { schema = null; throw error; });
        await schema;
    }
    async function readSetting() {
        await ensureSchema();
        const result = await pool.query("SELECT due_date, courses FROM hub_internal_deadline WHERE id = 1");
        const date = result.rows[0]?.due_date ?? DEFAULT_INTERNAL_DEADLINE;
        if (!validDeadline(date)) throw new Error("The saved internal due date is invalid.");
        return { date, courses: parseSavedCourses(result.rows[0]?.courses) };
    }
    async function isVisible(email, courses) {
        if (courses.length === DEADLINE_COURSES.length || await canManage(email)) return true;
        return courses.includes(String(await getCourse(email) || ""));
    }
    app.get("/api/internal-assessment-deadline", async (req, res) => {
        res.set("Cache-Control", "private, no-store");
        const email = normalizeEmail(getRequestUserEmail(req));
        if (!email || !email.endsWith(`@${schoolDomain}`)) return res.status(401).json({ error: "School sign-in required." });
        try {
            const setting = await readSetting();
            res.json({ ...setting, visible: await isVisible(email, setting.courses) });
        } catch (error) {
            console.error("[internal-deadline] Could not load date:", error.message);
            res.status(500).json({ error: "Could not load the internal due date. Please retry." });
        }
    });
    app.put("/api/internal-assessment-deadline", async (req, res) => {
        res.set("Cache-Control", "private, no-store");
        const email = normalizeEmail(getRequestUserEmail(req));
        if (!email || !email.endsWith(`@${schoolDomain}`)) return res.status(401).json({ error: "School sign-in required." });
        try {
            if (!(await canManage(email))) return res.status(403).json({ error: "Teacher access required." });
            if (!validDeadline(req.body?.date)) return res.status(400).json({ error: "Choose a valid date between 2000 and 2100." });
            if (req.body.courses !== undefined && !validDeadlineCourses(req.body.courses)) {
                return res.status(400).json({ error: "Choose at least one course: JuniorDTECH, MiddleDTECH or SeniorDTECH." });
            }
            const courses = req.body.courses === undefined ? (await readSetting()).courses
                : DEADLINE_COURSES.filter((course) => req.body.courses.includes(course));
            await ensureSchema();
            await pool.query(`INSERT INTO hub_internal_deadline (id, due_date, updated_by_email, courses)
                VALUES (1, $1, $2, $3) ON CONFLICT (id) DO UPDATE SET due_date = EXCLUDED.due_date,
                updated_by_email = EXCLUDED.updated_by_email, courses = EXCLUDED.courses, updated_at = NOW()`,
            [req.body.date, email, JSON.stringify(courses)]);
            res.json({ date: req.body.date, courses, visible: true });
        } catch (error) {
            console.error("[internal-deadline] Could not save date:", error.message);
            res.status(500).json({ error: "Due date save was not confirmed. Reload before retrying." });
        }
    });
}

module.exports = { registerInternalDeadline, validDeadline, validDeadlineCourses, DEADLINE_COURSES };
