"use strict";
const B = require("./activity-blocks");
const { POLICY: RATTLESNAKES_POLICY, checkRattlesnakes } = require("./rattlesnakes-check");
const mammoth = require("mammoth");
const DRAWING_POLICY = B.GOOGLE_DRAWING_POLICY;
const POLICIES = new Set([RATTLESNAKES_POLICY, DRAWING_POLICY]);
// Policies that only a teacher can pass; students Submit instead of running an automatic check.
const TEACHER_ONLY = new Set([DRAWING_POLICY]);

function createDocumentVerification({ pool, getDefaultPracticalSkillsKitContent,
    syncCompletion, getRequestUserEmail, normalizeEmail, schoolDomain, verifyDriveTokenForStudent,
    driveApiRequest, requireAdminAccess, canReview, autoEmailKitCertificate, notifySubmission = async () => false,
    fetchFile = fetch }) {
    let schema, submissionSchema;
    async function ensureSchema() {
        if (!schema) schema = pool.query(`CREATE TABLE IF NOT EXISTS practical_skills_document_checks (
            student_email TEXT NOT NULL, kit_id TEXT NOT NULL, activity_index INTEGER NOT NULL,
            document_key TEXT NOT NULL, policy TEXT NOT NULL, passed BOOLEAN NOT NULL,
            method TEXT NOT NULL, feedback JSONB NOT NULL, reviewed_by TEXT,
            checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (student_email, kit_id, activity_index, document_key, policy)
        )`).catch((error) => { schema = null; throw error; });
        await schema;
    }
    async function ensureSubmissionSchema() {
        if (!submissionSchema) submissionSchema = pool.query(`CREATE TABLE IF NOT EXISTS practical_skills_submissions (
            student_email TEXT NOT NULL, kit_id TEXT NOT NULL, activity_index INTEGER NOT NULL,
            document_key TEXT NOT NULL, url TEXT NOT NULL, submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            notified_document_key TEXT,
            PRIMARY KEY (student_email, kit_id, activity_index)
        )`).catch((error) => { submissionSchema = null; throw error; });
        await submissionSchema;
    }
    // Submission for the student's current link only; a changed link means not yet submitted.
    async function getSubmission(student, kit, index, documentKey) {
        if (!documentKey) return null;
        if (!(await pool.query("SELECT to_regclass('practical_skills_submissions') AS submissions_table")).rows[0]?.submissions_table) return null;
        const row = (await pool.query(`SELECT document_key, submitted_at FROM practical_skills_submissions
            WHERE student_email = $1 AND kit_id = $2 AND activity_index = $3 AND document_key = $4
            AND submitted_at >= COALESCE((SELECT started_at FROM practical_skills_progress
                WHERE student_email = $1 AND kit_id = $2), '-infinity'::timestamptz)`, [student, kit, index, documentKey])).rows[0];
        return row ? { documentKey: row.document_key, submittedAt: row.submitted_at } : null;
    }
    function submission(activity, index, responses) {
        const block = activity.blocks.find((block) => block.kind === "studentlink");
        const url = B.savedAnswers(activity, index, responses)[block?.id];
        return { url, documentKey: B.documentLinkKey(url) };
    }
    async function get(student, kit, index, activity, responses) {
        const policy = activity?.documentCheck;
        if (!POLICIES.has(policy)) return null;
        const { documentKey } = submission(activity, index, responses);
        if (!documentKey) return null;
        if (!(await pool.query("SELECT to_regclass('practical_skills_document_checks') AS checks_table")).rows[0]?.checks_table) return null;
        const result = await pool.query(`SELECT document_key, policy, passed, method, feedback, reviewed_by, checked_at
            FROM practical_skills_document_checks WHERE student_email = $1 AND kit_id = $2 AND activity_index = $3
            AND document_key = $4 AND policy = $5
            AND checked_at >= COALESCE((SELECT started_at FROM practical_skills_progress
                WHERE student_email = $1 AND kit_id = $2), '-infinity'::timestamptz)`, [student, kit, index, documentKey, policy]);
        const row = result.rows[0];
        return row ? { documentKey: row.document_key, policy: row.policy, passed: row.passed,
            method: row.method, feedback: row.feedback, reviewedBy: row.reviewed_by, checkedAt: row.checked_at } : null;
    }
    async function save(student, kit, index, documentKey, policy, passed, method, feedback, reviewer = null) {
        await ensureSchema();
        await pool.query(`INSERT INTO practical_skills_document_checks
            (student_email, kit_id, activity_index, document_key, policy, passed, method, feedback, reviewed_by)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)
            ON CONFLICT (student_email, kit_id, activity_index, document_key, policy)
            DO UPDATE SET passed = EXCLUDED.passed, method = EXCLUDED.method, feedback = EXCLUDED.feedback,
            reviewed_by = EXCLUDED.reviewed_by, checked_at = NOW()`,
        [student, kit, index, documentKey, policy, passed, method, JSON.stringify(feedback), reviewer]);
    }
    async function loadContent(kit) {
        const stored = await pool.query("SELECT content FROM practical_skills_kit_content WHERE kit_id = $1", [kit]);
        return B.withFilesFoldersLinks(stored.rows[0]?.content || getDefaultPracticalSkillsKitContent(kit));
    }
    async function load(req, student) {
        const kit = String(req.params.kitId || "");
        if (!/^kit-[a-z0-9-]{1,60}$/.test(kit) || !/^\d+$/.test(req.params.activityIndex)) {
            throw Object.assign(new Error("Choose a valid kit activity."), { status: 400 });
        }
        const index = Number(req.params.activityIndex);
        const content = await loadContent(kit);
        const activity = content.activities?.[index];
        if (content.deletedAt || !content.worksheets?.[index] || content.worksheets[index].hidden ||
            content.worksheets[index].mergedInto !== undefined || !POLICIES.has(activity?.documentCheck)) {
            throw Object.assign(new Error("This activity does not support a document check."), { status: 404 });
        }
        const row = (await pool.query("SELECT responses FROM practical_skills_progress WHERE student_email = $1 AND kit_id = $2", [student, kit])).rows[0] || { responses: {} };
        return { kit, index, content, activity, policy: activity.documentCheck, row, ...submission(activity, index, row.responses) };
    }
    async function readBytes(url, token, limit) {
        const response = await fetchFile(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw Object.assign(new Error("Could not read the document. Check Google Drive access, or ask your teacher to review it."), { status: 422 });
        if (Number(response.headers.get("content-length")) > limit) {
            await response.body?.cancel();
            throw Object.assign(new Error("The document is too large for automatic checking. Ask your teacher to review it."), { status: 422 });
        }
        const chunks = [];
        let size = 0;
        for await (const chunk of response.body) {
            size += chunk.length;
            if (size > limit) throw Object.assign(new Error("The document is too large for automatic checking. Ask your teacher to review it."), { status: 422 });
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    }
    function student(req, res) {
        const email = normalizeEmail(getRequestUserEmail(req));
        if (!email || !email.endsWith(`@${schoolDomain}`) || !req.auth_identity?.verified ||
            normalizeEmail(req.auth_identity.email) !== email) {
            res.status(401).json({ error: "Verify your school Google sign-in to check this document." });
            return "";
        }
        return email;
    }
    function failure(res, error) {
        console.error("[kit-document-check]", error.message);
        res.status(error.status || 500).json({ error: error.message || "Document check failed. Please retry or ask your teacher." });
    }
    function register(app) {
        async function reviewer(req, res, next) {
            try {
                if (!req.auth_identity?.verified || normalizeEmail(req.auth_identity.email) !== normalizeEmail(getRequestUserEmail(req))) {
                    return res.status(401).json({ error: "Verify your school Google sign-in before reviewing a document." });
                }
                if (!(await canReview(getRequestUserEmail(req)))) return res.status(403).json({ error: "Teacher document-review permission is required." });
                next();
            } catch (error) { failure(res, error); }
        }
        const base = "/api/practical-skills/blocks/:kitId/:activityIndex/document-check";
        app.get(base, async (req, res) => {
            res.set("Cache-Control", "private, no-store");
            const email = student(req, res);
            if (!email) return;
            try {
                const item = await load(req, email);
                res.json({ verification: await get(email, item.kit, item.index, item.activity, item.row.responses),
                    submission: TEACHER_ONLY.has(item.policy) ? await getSubmission(email, item.kit, item.index, item.documentKey) : null });
            } catch (error) { failure(res, error); }
        });
        app.post("/api/practical-skills/blocks/:kitId/:activityIndex/submit", async (req, res) => {
            res.set("Cache-Control", "private, no-store");
            const email = student(req, res);
            if (!email) return;
            try {
                const item = await load(req, email);
                if (!TEACHER_ONLY.has(item.policy)) throw Object.assign(new Error("This activity uses its own completion check."), { status: 404 });
                const answers = B.savedAnswers(item.activity, item.index, item.row.responses);
                // A stand-in teacher receipt checks everything except the teacher's tick (valid link, other blocks, different file).
                const ready = B.grade(item.activity, answers, {}, { content: item.content, index: item.index, responses: item.row.responses,
                    documentVerification: { passed: true, policy: item.policy, documentKey: item.documentKey } });
                if (!item.documentKey || !ready.passed) {
                    throw Object.assign(new Error(ready.results.find((result) => !result.passed && result.message)?.message ||
                        "Save a valid HTTPS sharing link to your Google Drawing before submitting."), { status: 422 });
                }
                await ensureSubmissionSchema();
                const previous = (await pool.query(`SELECT notified_document_key FROM practical_skills_submissions
                    WHERE student_email = $1 AND kit_id = $2 AND activity_index = $3`, [email, item.kit, item.index])).rows[0];
                await pool.query(`INSERT INTO practical_skills_submissions (student_email, kit_id, activity_index, document_key, url)
                    VALUES ($1,$2,$3,$4,$5) ON CONFLICT (student_email, kit_id, activity_index)
                    DO UPDATE SET document_key = EXCLUDED.document_key, url = EXCLUDED.url, submitted_at = NOW()`,
                [email, item.kit, item.index, item.documentKey, item.url]);
                let emailed = false;
                if (previous?.notified_document_key !== item.documentKey) {
                    try {
                        emailed = await notifySubmission({ studentEmail: email, kitId: item.kit, index: item.index, url: item.url,
                            subject: item.activity.submissionSubject || item.content.worksheets[item.index].activity || `Activity ${item.index + 1}` });
                        if (emailed) await pool.query(`UPDATE practical_skills_submissions SET notified_document_key = $4
                            WHERE student_email = $1 AND kit_id = $2 AND activity_index = $3`, [email, item.kit, item.index, item.documentKey]);
                    } catch (error) {
                        console.error("[kit-submission] Could not email teacher:", error.message);
                    }
                }
                res.json({ submission: await getSubmission(email, item.kit, item.index, item.documentKey), emailed,
                    verification: await get(email, item.kit, item.index, item.activity, item.row.responses) });
            } catch (error) { failure(res, error); }
        });
        app.get("/api/admin/kit-submissions", requireAdminAccess, async (req, res) => {
            res.set("Cache-Control", "private, no-store");
            const kits = [...new Set(String(req.query.kits || "").split(","))].filter((kit) => /^kit-[a-z0-9-]{1,60}$/.test(kit)).slice(0, 40);
            try {
                const result = [];
                for (const kit of kits) {
                    const content = await loadContent(kit);
                    const activities = (content.worksheets || []).map((worksheet, index) => ({ worksheet, index, activity: content.activities?.[index] }))
                        .filter(({ worksheet, activity }) => worksheet && !worksheet.hidden && worksheet.mergedInto === undefined && TEACHER_ONLY.has(activity?.documentCheck));
                    if (content.deletedAt || !activities.length) continue;
                    const progress = (await pool.query("SELECT student_email, started_at, responses FROM practical_skills_progress WHERE kit_id = $1", [kit])).rows;
                    const tables = (await pool.query(`SELECT to_regclass('practical_skills_document_checks') AS checks_table,
                        to_regclass('practical_skills_submissions') AS submissions_table`)).rows[0] || {};
                    const checks = tables.checks_table ? (await pool.query(`SELECT student_email, activity_index, document_key, policy, passed, checked_at
                        FROM practical_skills_document_checks WHERE kit_id = $1`, [kit])).rows : [];
                    const submissions = tables.submissions_table ? (await pool.query(`SELECT student_email, activity_index, document_key, submitted_at
                        FROM practical_skills_submissions WHERE kit_id = $1`, [kit])).rows : [];
                    const current = (row, email, started) => normalizeEmail(row.student_email) === email &&
                        (!started || new Date(row.checked_at || row.submitted_at) >= new Date(started));
                    const students = {};
                    for (const row of progress) {
                        const email = normalizeEmail(row.student_email);
                        students[email] = Object.fromEntries(activities.map(({ index, activity }) => {
                            const { url, documentKey } = submission(activity, index, row.responses || {});
                            const mine = (list) => list.find((entry) => current(entry, email, row.started_at) &&
                                Number(entry.activity_index) === index && entry.document_key === documentKey && documentKey);
                            const check = mine(checks.filter((entry) => entry.policy === activity.documentCheck));
                            return [index, { url: documentKey ? url : "", documentKey, submittedAt: mine(submissions)?.submitted_at || null,
                                completed: check?.passed === true }];
                        }));
                    }
                    result.push({ id: kit, activities: activities.map(({ worksheet, index }) => ({ index, title: worksheet.activity || `Activity ${index + 1}` })), students });
                }
                res.json({ kits: result });
            } catch (error) {
                console.error("[kit-submission] Could not read submissions:", error.message);
                res.status(503).json({ error: "Could not read submitted links. No results have been changed." });
            }
        });
        app.post(base, async (req, res) => {
            res.set("Cache-Control", "private, no-store");
            const email = student(req, res);
            if (!email) return;
            try {
                const item = await load(req, email);
                if (TEACHER_ONLY.has(item.policy)) throw Object.assign(new Error("Press Submit. Your teacher reviews this activity and marks it Completed."), { status: 409 });
                if (!item.documentKey.startsWith("google-file:")) throw Object.assign(new Error(
                    "Automatic checking supports Google Docs and Word (.docx) files in Google Drive. For OneDrive or other links, ask your teacher to review the document."), { status: 422 });
                const token = String(req.body?.driveAccessToken || "");
                if (!token) throw Object.assign(new Error("Google Drive permission is required to read your document."), { status: 400 });
                await verifyDriveTokenForStudent(token, email);
                const id = item.documentKey.slice("google-file:".length);
                const metadata = () => driveApiRequest(`/files/${encodeURIComponent(id)}`, {
                    accessToken: token, signal: AbortSignal.timeout(30000),
                    queryParams: { fields: "id,mimeType,trashed,modifiedTime,size", supportsAllDrives: true }
                });
                const before = await metadata();
                if (before.trashed) throw Object.assign(new Error("This document is in the bin. Restore it or submit the correct link."), { status: 422 });
                let text;
                if (before.mimeType === "application/vnd.google-apps.document") {
                    text = (await readBytes(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}/export?mimeType=text%2Fplain`, token, 2 * 1024 * 1024)).toString("utf8");
                } else if (before.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
                    if (Number(before.size) > 5 * 1024 * 1024) throw Object.assign(new Error("The Word document is too large for automatic checking. Ask your teacher to review it."), { status: 422 });
                    const bytes = await readBytes(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`, token, 5 * 1024 * 1024);
                    try {
                        text = (await mammoth.extractRawText({ buffer: bytes })).value;
                    } catch (error) {
                        console.error("[kit-document-check] Word text extraction failed:", error.message);
                        throw Object.assign(new Error("This Word file could not be read. Save it as .docx again, or ask your teacher to review it."), { status: 422 });
                    }
                } else throw Object.assign(new Error("Submit the typed Google Doc or Word (.docx) document, not a PDF, image, folder or scene file. Your teacher can review unsupported files."), { status: 422 });
                const result = checkRattlesnakes(text);
                const after = await metadata();
                const current = await load(req, email);
                if (!before.modifiedTime || after.trashed || before.modifiedTime !== after.modifiedTime || item.documentKey !== current.documentKey) {
                    throw Object.assign(new Error("The document or submitted link changed during checking. Save your changes and check again."), { status: 409 });
                }
                await save(email, item.kit, item.index, item.documentKey, item.policy, result.passed, "automatic",
                    { ...result, modifiedTime: after.modifiedTime });
                const synced = await syncCompletion(email, item.kit, item.content);
                if (synced.completed) void autoEmailKitCertificate(req, item.kit);
                res.json({ verification: await get(email, item.kit, item.index, item.activity, current.row.responses),
                    completedActivities: synced.completed_activities });
            } catch (error) { failure(res, error); }
        });
        const review = "/api/admin/kit-document-review/:kitId/:activityIndex";
        app.get(review, requireAdminAccess, reviewer, async (req, res) => {
            res.set("Cache-Control", "private, no-store");
            const email = normalizeEmail(req.query.email || "");
            if (!email.endsWith(`@${schoolDomain}`)) return res.status(400).json({ error: "Choose a school student." });
            try {
                const item = await load(req, email);
                res.json({ url: item.url || "", documentKey: item.documentKey,
                    verification: await get(email, item.kit, item.index, item.activity, item.row.responses) });
            } catch (error) { failure(res, error); }
        });
        app.put(review, requireAdminAccess, reviewer, async (req, res) => {
            res.set("Cache-Control", "private, no-store");
            const email = normalizeEmail(req.body?.email || "");
            if (!email.endsWith(`@${schoolDomain}`) || typeof req.body?.approved !== "boolean") {
                return res.status(400).json({ error: "Choose a school student and an approval state." });
            }
            try {
                const item = await load(req, email);
                if (!item.documentKey || req.body.documentKey !== item.documentKey) throw Object.assign(new Error("The submitted link changed. Reload the review before approving."), { status: 409 });
                const drawing = item.policy === DRAWING_POLICY;
                await save(email, item.kit, item.index, item.documentKey, item.policy, req.body.approved, "teacher",
                    { message: req.body.approved
                        ? drawing ? "Teacher reviewed the drawing and marked it Completed." : "Teacher reviewed the document and approved text completion."
                        : drawing ? "Teacher removed the Completed tick. Update your drawing and press Submit again." : "Teacher approval removed. Check the document again or request another review." },
                    normalizeEmail(getRequestUserEmail(req)));
                if (TEACHER_ONLY.has(item.policy) && !req.body.approved) {
                    // Lets the student Submit the same link again once fixed, which re-emails the teacher.
                    await ensureSubmissionSchema();
                    await pool.query(`DELETE FROM practical_skills_submissions WHERE student_email = $1 AND kit_id = $2 AND activity_index = $3`,
                        [email, item.kit, item.index]);
                }
                const synced = await syncCompletion(email, item.kit, item.content);
                res.json({ verification: await get(email, item.kit, item.index, item.activity, item.row.responses),
                    completedActivities: synced.completed_activities });
            } catch (error) { failure(res, error); }
        });
    }
    return { get, register };
}

module.exports = { createDocumentVerification };
