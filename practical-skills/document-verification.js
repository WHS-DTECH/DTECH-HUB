"use strict";
const B = require("./activity-blocks");
const { POLICY, checkRattlesnakes } = require("./rattlesnakes-check");
const mammoth = require("mammoth");

function createDocumentVerification({ pool, getDefaultPracticalSkillsKitContent,
    syncCompletion, getRequestUserEmail, normalizeEmail, schoolDomain, verifyDriveTokenForStudent,
    driveApiRequest, requireAdminAccess, canReview, autoEmailKitCertificate, fetchFile = fetch }) {
    let schema;
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
    function submission(activity, index, responses) {
        const block = activity.blocks.find((block) => block.kind === "studentlink");
        const url = B.savedAnswers(activity, index, responses)[block?.id];
        return { url, documentKey: B.documentLinkKey(url) };
    }
    async function get(student, kit, index, activity, responses) {
        if (activity?.documentCheck !== POLICY) return null;
        const { documentKey } = submission(activity, index, responses);
        if (!documentKey) return null;
        if (!(await pool.query("SELECT to_regclass('practical_skills_document_checks') AS checks_table")).rows[0]?.checks_table) return null;
        const result = await pool.query(`SELECT document_key, policy, passed, method, feedback, reviewed_by, checked_at
            FROM practical_skills_document_checks WHERE student_email = $1 AND kit_id = $2 AND activity_index = $3
            AND document_key = $4 AND policy = $5
            AND checked_at >= COALESCE((SELECT started_at FROM practical_skills_progress
                WHERE student_email = $1 AND kit_id = $2), '-infinity'::timestamptz)`, [student, kit, index, documentKey, POLICY]);
        const row = result.rows[0];
        return row ? { documentKey: row.document_key, policy: row.policy, passed: row.passed,
            method: row.method, feedback: row.feedback, reviewedBy: row.reviewed_by, checkedAt: row.checked_at } : null;
    }
    async function save(student, kit, index, documentKey, passed, method, feedback, reviewer = null) {
        await ensureSchema();
        await pool.query(`INSERT INTO practical_skills_document_checks
            (student_email, kit_id, activity_index, document_key, policy, passed, method, feedback, reviewed_by)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)
            ON CONFLICT (student_email, kit_id, activity_index, document_key, policy)
            DO UPDATE SET passed = EXCLUDED.passed, method = EXCLUDED.method, feedback = EXCLUDED.feedback,
            reviewed_by = EXCLUDED.reviewed_by, checked_at = NOW()`,
        [student, kit, index, documentKey, POLICY, passed, method, JSON.stringify(feedback), reviewer]);
    }
    async function load(req, student) {
        const kit = String(req.params.kitId || "");
        if (!/^kit-[a-z0-9-]{1,60}$/.test(kit) || !/^\d+$/.test(req.params.activityIndex)) {
            throw Object.assign(new Error("Choose a valid kit activity."), { status: 400 });
        }
        const index = Number(req.params.activityIndex);
        const stored = await pool.query("SELECT content FROM practical_skills_kit_content WHERE kit_id = $1", [kit]);
        const content = B.withFilesFoldersLinks(stored.rows[0]?.content || getDefaultPracticalSkillsKitContent(kit));
        const activity = content.activities?.[index];
        if (content.deletedAt || !content.worksheets?.[index] || content.worksheets[index].hidden ||
            content.worksheets[index].mergedInto !== undefined || activity?.documentCheck !== POLICY) {
            throw Object.assign(new Error("This activity does not support a document check."), { status: 404 });
        }
        const row = (await pool.query("SELECT responses FROM practical_skills_progress WHERE student_email = $1 AND kit_id = $2", [student, kit])).rows[0] || { responses: {} };
        return { kit, index, content, activity, row, ...submission(activity, index, row.responses) };
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
                res.json({ verification: await get(email, item.kit, item.index, item.activity, item.row.responses) });
            } catch (error) { failure(res, error); }
        });
        app.post(base, async (req, res) => {
            res.set("Cache-Control", "private, no-store");
            const email = student(req, res);
            if (!email) return;
            try {
                const item = await load(req, email);
                if (!item.documentKey.startsWith("google-file:")) throw Object.assign(new Error("Automatic checking supports Google Docs and Word (.docx) files in Google Drive. For OneDrive or other links, ask your teacher to review the document."), { status: 422 });
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
                await save(email, item.kit, item.index, item.documentKey, result.passed, "automatic",
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
                await save(email, item.kit, item.index, item.documentKey, req.body.approved, "teacher",
                    { message: req.body.approved ? "Teacher reviewed the document and approved text completion." : "Teacher approval removed. Check the document again or request another review." },
                    normalizeEmail(getRequestUserEmail(req)));
                const synced = await syncCompletion(email, item.kit, item.content);
                res.json({ verification: await get(email, item.kit, item.index, item.activity, item.row.responses),
                    completedActivities: synced.completed_activities });
            } catch (error) { failure(res, error); }
        });
    }
    return { get, register };
}

module.exports = { createDocumentVerification };
