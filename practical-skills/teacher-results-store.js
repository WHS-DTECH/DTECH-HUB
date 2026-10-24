"use strict";

function registerTeacherResults(app, { pool, requireAdminAccess, schoolDomain, getDefaultPracticalSkillsKitContent }) {
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

module.exports = { registerTeacherResults };
