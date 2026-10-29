"use strict";

const DEFAULT_INTERNAL_DEADLINE = "2026-10-29";

function validDeadline(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "2000-01-01" || value > "2100-12-31") return false;
    const date = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function registerInternalDeadline(app, { pool, getRequestUserEmail, normalizeEmail, schoolDomain, canManage }) {
    let schema;
    async function ensureSchema() {
        if (!schema) schema = pool.query(`CREATE TABLE IF NOT EXISTS hub_internal_deadline (
            id INTEGER PRIMARY KEY CHECK (id = 1), due_date TEXT NOT NULL,
            updated_by_email TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`).catch((error) => { schema = null; throw error; });
        await schema;
    }
    app.get("/api/internal-assessment-deadline", async (req, res) => {
        res.set("Cache-Control", "private, no-store");
        const email = normalizeEmail(getRequestUserEmail(req));
        if (!email || !email.endsWith(`@${schoolDomain}`)) return res.status(401).json({ error: "School sign-in required." });
        try {
            await ensureSchema();
            const result = await pool.query("SELECT due_date FROM hub_internal_deadline WHERE id = 1");
            const date = result.rows[0]?.due_date ?? DEFAULT_INTERNAL_DEADLINE;
            if (!validDeadline(date)) throw new Error("The saved internal due date is invalid.");
            res.json({ date });
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
            await ensureSchema();
            await pool.query(`INSERT INTO hub_internal_deadline (id, due_date, updated_by_email)
                VALUES (1, $1, $2) ON CONFLICT (id) DO UPDATE SET due_date = EXCLUDED.due_date,
                updated_by_email = EXCLUDED.updated_by_email, updated_at = NOW()`, [req.body.date, email]);
            res.json({ date: req.body.date });
        } catch (error) {
            console.error("[internal-deadline] Could not save date:", error.message);
            res.status(500).json({ error: "Due date save was not confirmed. Reload before retrying." });
        }
    });
}

module.exports = { registerInternalDeadline, validDeadline };
