"use strict";

const KIT_TITLES = { "kit-login": ["Login Kit", "Login"], "kit-google-search": ["Search Kit", "Google Search", "Google Search Kit"] };
const normalize = (value) => String(value || "").trim().toLowerCase();

function teacherAlreadyEmailed(logs, studentEmail, kitId, teacherEmail) {
    const subjects = (KIT_TITLES[kitId] || []).map((title) => normalize(`[DTECH HUB] ${title} - Certificate of Completion`));
    return logs.some((log) => {
        const recipients = (Array.isArray(log.recipients) ? log.recipients : []).flatMap((value) => String(value).split(",")).map(normalize);
        return recipients.includes(normalize(studentEmail)) && recipients.includes(normalize(teacherEmail))
            && subjects.some((subject) => normalize(log.subject) === subject || normalize(log.subject).startsWith(`${subject} - `));
    });
}

async function withKitCertificateEmailLock(pool, hasDatabase, studentEmail, kitId, callback) {
    if (!hasDatabase) return callback();
    const client = await pool.connect();
    const key = `kit-certificate:${normalize(studentEmail)}:${kitId}`;
    try {
        await client.query("SELECT pg_advisory_lock(hashtextextended($1, 0))", [key]);
        return await callback();
    } finally {
        try { await client.query("SELECT pg_advisory_unlock(hashtextextended($1, 0))", [key]); }
        finally { client.release(); }
    }
}

function registerCertificateCatchup(app, dependencies) {
    const { pool, hasDatabase, requireAdminAccess, ensurePracticalSkillsProgressSchema, ensureEmailLogsSchema,
        getPracticalSkillsCertificateTeacherRecipients, getStoredPracticalSkillsKitContent, buildKitCertificate,
        getPracticalSkillsStudentName, createKitCertificatePdf, sendConfiguredHubEmail, emailConfigured } = dependencies;
    let schema;
    async function ensureSchema() {
        if (!hasDatabase) throw new Error("Catch-up requires the production database; no emails were sent.");
        if (!schema) schema = (async () => {
            await ensurePracticalSkillsProgressSchema();
            await ensureEmailLogsSchema();
            await pool.query(`CREATE TABLE IF NOT EXISTS kit_teacher_certificate_deliveries (
                student_email TEXT NOT NULL, kit_id TEXT NOT NULL, teacher_email TEXT NOT NULL,
                status TEXT NOT NULL, attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), sent_at TIMESTAMPTZ,
                PRIMARY KEY (student_email, kit_id, teacher_email)
            )`);
        })().catch((error) => { schema = null; throw error; });
        await schema;
    }
    async function preview() {
        await ensureSchema();
        const teachers = [...new Set((await getPracticalSkillsCertificateTeacherRecipients()).map(normalize))];
        if (!teachers.length) throw new Error("No DTECH Lead Teacher certificate recipients are configured.");
        const [progress, emails, deliveries] = await Promise.all([
            pool.query(`SELECT * FROM practical_skills_progress WHERE completed = TRUE AND kit_id = ANY($1::text[]) ORDER BY student_email, kit_id`, [Object.keys(KIT_TITLES)]),
            pool.query(`SELECT recipients, subject FROM email_logs WHERE email_type = 'kit_certificate' OR subject ILIKE '%Certificate of Completion%'`),
            pool.query("SELECT * FROM kit_teacher_certificate_deliveries")
        ]);
        const rows = [];
        for (const progressRow of progress.rows) {
            const email = normalize(progressRow.student_email);
            const content = await getStoredPracticalSkillsKitContent(progressRow.kit_id);
            const certificate = buildKitCertificate(content, progressRow, email);
            const relevantTeachers = teachers.filter((teacher) => teacher !== email);
            const pendingTeachers = relevantTeachers.filter((teacher) =>
                !teacherAlreadyEmailed(emails.rows, email, progressRow.kit_id, teacher)
                && !deliveries.rows.some((delivery) => normalize(delivery.student_email) === email && delivery.kit_id === progressRow.kit_id
                    && normalize(delivery.teacher_email) === teacher));
            const uncertainTeachers = relevantTeachers.filter((teacher) => deliveries.rows.some((delivery) =>
                normalize(delivery.student_email) === email && delivery.kit_id === progressRow.kit_id
                && normalize(delivery.teacher_email) === teacher && delivery.status !== "sent"));
            rows.push({ studentEmail: email, kitId: progressRow.kit_id, kitTitle: content.bannerTitle,
                completedAt: progressRow.completed_at, pendingTeachers, uncertainTeachers, ready: Boolean(certificate) });
        }
        return { teachers, rows, emailConfigured: emailConfigured() };
    }
    const fail = (res, error) => {
        console.error("[kit-certificate-catchup]", error);
        res.status(500).json({ error: error.message || "Could not check missing teacher certificates." });
    };
    app.get("/api/admin/practical-skills/certificate-catchup", requireAdminAccess, async (_req, res) => {
        res.set("Cache-Control", "no-store");
        try { res.json(await preview()); }
        catch (error) { fail(res, error); }
    });
    app.post("/api/admin/practical-skills/certificate-catchup", requireAdminAccess, async (req, res) => {
        const { studentEmail, kitId } = req.body || {};
        if (typeof studentEmail !== "string" || !Object.hasOwn(KIT_TITLES, kitId)) return res.status(400).json({ error: "Select a Login or Search Kit record from the preview." });
        try {
            await withKitCertificateEmailLock(pool, hasDatabase, studentEmail, kitId, async () => {
            const snapshot = await preview();
            const row = snapshot.rows.find((entry) => entry.studentEmail === normalize(studentEmail) && entry.kitId === kitId);
            if (!row || !row.ready) return res.status(409).json({ error: "This completed certificate is not available. Refresh the preview." });
            if (!row.pendingTeachers.length) return res.json({ sent: [], skipped: true, uncertainTeachers: row.uncertainTeachers });
            if (!snapshot.emailConfigured) return res.status(503).json({ error: "Hub email is not configured. No emails were sent." });
            const content = await getStoredPracticalSkillsKitContent(kitId);
            const progress = (await pool.query(`SELECT * FROM practical_skills_progress WHERE student_email = $1 AND kit_id = $2 AND completed = TRUE`, [row.studentEmail, kitId])).rows[0];
            const name = await getPracticalSkillsStudentName({ auth_identity: null, authenticated_email: row.studentEmail, headers: { "x-user-email": row.studentEmail } });
            const certificate = buildKitCertificate(content, progress, name);
            if (!certificate) return res.status(409).json({ error: "The certificate changed. Refresh the preview before sending." });
            const buffer = await createKitCertificatePdf(certificate);
            const sent = [];
            const uncertain = [];
            for (const teacher of row.pendingTeachers) {
                // Reserve before SMTP: an interrupted/ambiguous send requires manual review, never an automatic duplicate.
                const claimed = await pool.query(`INSERT INTO kit_teacher_certificate_deliveries
                    (student_email, kit_id, teacher_email, status) VALUES ($1, $2, $3, 'sending')
                    ON CONFLICT DO NOTHING RETURNING teacher_email`, [row.studentEmail, kitId, teacher]);
                if (!claimed.rows.length) continue;
                try {
                    const safe = (value) => String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
                    await sendConfiguredHubEmail({
                        to: teacher,
                        subject: `[DTECH HUB] ${certificate.kitTitle} - Certificate of Completion - ${certificate.studentName} (teacher catch-up: ${row.studentEmail})`,
                        html: `<h2>Previously completed kit: teacher copy</h2><p>${safe(certificate.studentName)} (${safe(row.studentEmail)}) completed <strong>${safe(certificate.kitTitle)}</strong> on ${safe(certificate.completedDate)}.</p><p>No earlier teacher copy was found in the Hub email records. The certificate is attached. No email has been resent to the student.</p>`,
                        attachment: { buffer, originalname: `${kitId}-certificate.pdf`, mimetype: "application/pdf" },
                        emailType: "kit_certificate_teacher_catchup"
                    });
                    await pool.query(`UPDATE kit_teacher_certificate_deliveries SET status = 'sent', sent_at = NOW()
                        WHERE student_email = $1 AND kit_id = $2 AND teacher_email = $3`, [row.studentEmail, kitId, teacher]);
                    sent.push(teacher);
                } catch (error) {
                    console.error("[kit-certificate-catchup] Delivery needs review:", row.studentEmail, kitId, teacher, error);
                    uncertain.push(teacher);
                }
            }
            res.json({ sent, uncertainTeachers: uncertain, skipped: !sent.length && !uncertain.length });
            });
        } catch (error) { fail(res, error); }
    });
}

module.exports = { KIT_TITLES, teacherAlreadyEmailed, withKitCertificateEmailLock, registerCertificateCatchup };
