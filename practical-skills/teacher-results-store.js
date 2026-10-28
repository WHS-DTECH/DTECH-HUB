"use strict";

async function ensureTeacherKitChocolateSchema(pool) {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS practical_skills_chocolate (
            student_email TEXT NOT NULL,
            kit_id TEXT NOT NULL,
            chocolate BOOLEAN NOT NULL DEFAULT FALSE,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (student_email, kit_id)
        )
    `);
}

function registerTeacherResults(app, { pool, requireAdminAccess, schoolDomain, getDefaultPracticalSkillsKitContent, getClassData }) {
    if (getClassData) {
        app.put("/api/admin/kit-chocolate/:kitId", requireAdminAccess, async (req, res) => {
            res.set("Cache-Control", "private, no-store");
            const kitId = String(req.params.kitId || "");
            const email = String(req.body?.email || "").trim().toLowerCase();
            const chocolate = req.body?.chocolate;
            if (!/^kit-[a-z0-9-]{1,60}$/.test(kitId)
                || !/^[^\s@]+@[^\s@]+$/.test(email) || email.split("@")[1] !== schoolDomain
                || typeof chocolate !== "boolean") {
                return res.status(400).json({ error: "Choose a valid school student, kit and Yes/No chocolate value." });
            }
            try {
                const { students, kits } = await getClassData();
                if (!students.some((student) => student.email.toLowerCase() === email)
                    || !kits.some((kit) => kit.id === kitId)) {
                    return res.status(404).json({ error: "Choose a current student and an active kit from the class list." });
                }
                const result = await pool.query(
                    "INSERT INTO practical_skills_chocolate (student_email, kit_id, chocolate) VALUES ($1, $2, $3) ON CONFLICT (student_email, kit_id) DO UPDATE SET chocolate = EXCLUDED.chocolate, updated_at = NOW() RETURNING chocolate",
                    [email, kitId, chocolate]);
                res.json({ email, kitId, chocolate: result.rows[0].chocolate });
            } catch (error) {
                console.error("[teacher-kit-results] Could not save chocolate:", error.message);
                res.status(503).json({ error: "Could not confirm the chocolate value was saved. Refresh the class list before trying again." });
            }
        });
        app.get("/api/admin/kit-class-progress", requireAdminAccess, async (_req, res) => {
            res.set("Cache-Control", "private, no-store");
            try {
                const { students, kits } = await getClassData();
                const emails = students.map((student) => student.email);
                const kitIds = kits.map((kit) => kit.id);
                if (!emails.length || !kitIds.length) {
                    return res.json({ reviewedAt: new Date().toISOString(), students, kits });
                }
                const progress = await pool.query(
                    "SELECT student_email, kit_id, started_at, completed, completed_at FROM practical_skills_progress WHERE student_email = ANY($1::text[]) AND kit_id = ANY($2::text[])",
                    [emails, kitIds]);
                const chocolate = await pool.query(
                    "SELECT student_email, kit_id, chocolate FROM practical_skills_chocolate WHERE student_email = ANY($1::text[]) AND kit_id = ANY($2::text[])",
                    [emails, kitIds]);
                const chocolateByStudent = new Map();
                for (const row of chocolate.rows) {
                    const email = String(row.student_email || "").toLowerCase();
                    if (!chocolateByStudent.has(email)) chocolateByStudent.set(email, {});
                    chocolateByStudent.get(email)[row.kit_id] = row.chocolate === true;
                }
                const progressByStudent = new Map();
                for (const row of progress.rows) {
                    const email = String(row.student_email || "").toLowerCase();
                    if (!progressByStudent.has(email)) progressByStudent.set(email, {});
                    progressByStudent.get(email)[row.kit_id] = {
                        started: Boolean(row.started_at),
                        completed: Boolean(row.completed),
                        completedAt: row.completed_at || null
                    };
                }
                res.json({
                    reviewedAt: new Date().toISOString(),
                    kits,
                    students: students.map((student) => ({
                        ...student,
                        chocolate: chocolateByStudent.get(student.email.toLowerCase()) || {},
                        kitProgress: progressByStudent.get(student.email.toLowerCase()) || {}
                    }))
                });
            } catch (error) {
                console.error("[teacher-kit-results] Could not read class kit progress:", error.message);
                res.status(503).json({ error: "Could not read the class kit completion list. No results have been changed." });
            }
        });
    }

    app.get("/api/admin/kit-results/:kitId", requireAdminAccess, async (req, res) => {
        res.set("Cache-Control", "private, no-store");
        const kitId = String(req.params.kitId || "");
        const emails = [...new Set(String(req.query.emails || "").toLowerCase().split(/[\s,;]+/).filter(Boolean))];
        if (!/^kit-[a-z0-9-]{1,60}$/.test(kitId) || !emails.length || emails.length > 20 ||
            emails.some((email) => !/^[^\s@]+@[^\s@]+$/.test(email) || email.split("@")[1] !== schoolDomain)) {
            return res.status(400).json({ error: "Choose a valid kit and 1-20 school email addresses." });
        }
        try {
            // SELECT-only: student progress routes can change completion and send certificates.
            const stored = await pool.query("SELECT content FROM practical_skills_kit_content WHERE kit_id = $1", [kitId]);
            const content = stored.rows[0]?.content || getDefaultPracticalSkillsKitContent(kitId);
            if (!content?.worksheets?.length) return res.status(404).json({ error: "No saved worksheets were found for this kit." });
            const progress = await pool.query(
                "SELECT student_email, started_at, completed, completed_at, updated_at, responses, completed_activities, certificate_emailed_at FROM practical_skills_progress WHERE kit_id = $1 AND student_email = ANY($2::text[])",
                [kitId, emails]);
            const schema = await pool.query("SELECT to_regclass('student_kit_documents') AS documents_table");
            const documents = schema.rows[0]?.documents_table
                ? (await pool.query("SELECT student_email, document_key, document_id, folder_id, created_at FROM student_kit_documents WHERE kit_id = $1 AND student_email = ANY($2::text[])", [kitId, emails])).rows
                : [];
            res.json({
                kitId, content, reviewedAt: new Date().toISOString(),
                warnings: schema.rows[0]?.documents_table ? [] : ["Document receipt storage has not been created; no receipt records can be reviewed."],
                students: emails.map((email) => ({
                    email, progress: progress.rows.find((row) => row.student_email === email) || null,
                    documents: documents.filter((row) => row.student_email === email)
                }))
            });
        } catch (error) {
            console.error("[teacher-kit-results] Could not read kit results:", error.message);
            res.status(503).json({ error: "Could not read saved kit results from PostgreSQL. No results have been changed." });
        }
    });
}

module.exports = { registerTeacherResults, ensureTeacherKitChocolateSchema };
