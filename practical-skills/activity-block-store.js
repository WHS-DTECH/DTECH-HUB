"use strict";
const B = require("./activity-blocks");

function registerActivityBlocks(app, deps) {
    const {
        requireAdminAccess, getRequestUserEmail, normalizeEmail, schoolDomain, getPracticalSkillsKitDefinition,
        getStoredPracticalSkillsKitContent, getAllPracticalSkillsProgressRows, savePracticalSkillsKitResponses,
        setPracticalSkillsActivityCompletion, syncPracticalSkillsKitCompletion, autoEmailKitCertificate,
        getStudentKitDocument, saveStudentKitDocument, getStudentProgrammeFolder, ensureStudentCourseFolders,
        driveGetLiveFile, driveFindFileByNameInFolder, driveCopyFile, verifyDriveTokenForStudent, withResearchReportLock,
        driveEnsureFolder, driveUploadBinaryFile, driveApiRequest, upload, savePracticalSkillsKitContent
    } = deps;
    function email(req, res) {
        const value = normalizeEmail(getRequestUserEmail(req));
        if (!value.endsWith(`@${schoolDomain}`)) { res.status(401).json({ error: "School sign-in required." }); return ""; }
        return value;
    }
    async function load(req) {
        const { kitId, activityIndex } = req.params;
        if (!getPracticalSkillsKitDefinition(kitId) || !/^\d+$/.test(activityIndex)) throw Object.assign(new Error("Unknown kit or activity."), { status: 404 });
        const content = await getStoredPracticalSkillsKitContent(kitId);
        const activity = content.activities?.[Number(activityIndex)];
        if (!content.worksheets?.[Number(activityIndex)] || !Array.isArray(activity?.blocks)) throw Object.assign(new Error("This activity has no content blocks."), { status: 404 });
        return { content, activity };
    }
    async function check(student, kitId, index, activity, answers) {
        const documents = {};
        for (const b of activity.blocks.filter((b) => b.kind === "document" && b.required)) {
            documents[b.id] = Boolean((await getStudentKitDocument(student, kitId, `block-${index}-${b.id}`))?.document_id);
        }
        return B.grade(activity, answers, documents);
    }
    const base = "/api/practical-skills/blocks/:kitId/:activityIndex";
    async function schoolLicenceSettings(req) {
        if (!getPracticalSkillsKitDefinition(req.params.kitId)) {
            throw Object.assign(new Error("Choose a Unity Setup kit."), { status: 404 });
        }
        const content = await getStoredPracticalSkillsKitContent(req.params.kitId);
        if (content?.deletedAt ||
            !/unity\s+setup/i.test(String(content?.identity?.name || content?.bannerTitle || ""))) {
            throw Object.assign(new Error("Choose a Unity Setup kit."), { status: 404 });
        }
        const activity = content.activities?.find((entry) => entry?.blocks?.some((block) => block.kind === "schoollicence"));
        const block = activity?.blocks.find((entry) => entry.kind === "schoollicence");
        if (!block) throw Object.assign(new Error("Unity school licence viewer not found. Open Activity 1 in the Kit Content Builder first."), { status: 404 });
        return { content, activity, block };
    }
    const settingsPath = "/api/admin/practical-skills/kit-licence/:kitId";
    app.get(settingsPath, requireAdminAccess, async (req, res) => {
        res.set("Cache-Control", "private, no-store");
        try {
            const { block } = await schoolLicenceSettings(req);
            res.json({ activationMethod: block.activationMethod, licenceValue: block.licenceValue || "" });
        } catch (error) {
            console.error("[school-licence] Could not load teacher settings:", error.message);
            res.status(error.status || 500).json({ error: error.message || "Could not load school licence settings." });
        }
    });
    app.put(settingsPath, requireAdminAccess, async (req, res) => {
        res.set("Cache-Control", "private, no-store");
        try {
            const { activationMethod, licenceValue } = req.body || {};
            try { B.validate({ blocks: [{ id: "school", kind: "schoollicence", activationMethod, licenceValue }] }); }
            catch (error) { return res.status(400).json({ error: error.message }); }
            if (typeof licenceValue !== "string") return res.status(400).json({ error: "School licence information must be text." });
            const { content, activity, block } = await schoolLicenceSettings(req);
            const updated = { ...content, activities: content.activities.map((entry) => entry === activity
                ? { ...entry, blocks: entry.blocks.map((item) => item === block ? { ...item, activationMethod, licenceValue } : item) }
                : entry) };
            await savePracticalSkillsKitContent(req.params.kitId, updated, normalizeEmail(getRequestUserEmail(req)));
            res.json({ saved: true });
        } catch (error) {
            console.error("[school-licence] Could not save teacher settings:", error.message);
            res.status(error.status || 500).json({ error: "School licence save was not confirmed. Reload before retrying." });
        }
    });
    app.get(`${base}/licences/:blockId`, async (req, res) => {
        res.set("Cache-Control", "private, no-store");
        const student = email(req, res);
        if (!student) return;
        if (!req.auth_identity?.verified || normalizeEmail(req.auth_identity.email) !== student) {
            return res.status(401).json({ error: "Verify your school Google sign-in to view the school licence." });
        }
        try {
            const { activity } = await load(req);
            const block = activity.blocks.find((block) => block.id === req.params.blockId && block.kind === "schoollicence");
            if (!block) return res.status(404).json({ error: "School licence viewer not found." });
            res.json({ activationMethod: block.activationMethod, value: block.licenceValue || "" });
        } catch (error) {
            console.error("[school-licence] Could not load school licence:", error.message);
            res.status(error.status || 500).json({ error: "Could not load school licence information. Please retry or ask your teacher." });
        }
    });
    app.post(`${base}/check`, async (req, res) => {
        const student = email(req, res);
        if (!student) return;
        try {
            const { content, activity } = await load(req);
            const { kitId, activityIndex } = req.params;
            const row = (await getAllPracticalSkillsProgressRows(student)).find((r) => r.kit_id === kitId);
            const key = `${activityIndex}-blocks`;
            const answers = req.body?.answers;
            if (!answers || typeof answers !== "object" || Array.isArray(answers) || JSON.stringify(answers).length > 200000) {
                return res.status(400).json({ error: "Valid block answers are required (up to 200 KB)." });
            }
            const effectiveAnswers = B.savedAnswers(activity, activityIndex, { ...row?.responses, [key]: answers });
            await savePracticalSkillsKitResponses(student, kitId, { ...row?.responses, [key]: effectiveAnswers });
            const grade = await check(student, kitId, activityIndex, activity, effectiveAnswers);
            let saved;
            if (activity.completionMode === "auto" && !B.specialised(activity)) {
                saved = await setPracticalSkillsActivityCompletion(student, kitId, Number(activityIndex), grade.passed);
                await syncPracticalSkillsKitCompletion(student, kitId, content);
                if (grade.passed) void autoEmailKitCertificate(req, kitId);
            }
            res.json({ ...grade, completedActivities: saved?.completed_activities || row?.completed_activities || {} });
        } catch (error) { res.status(error.status || 500).json({ error: error.message || "Could not check activity blocks." }); }
    });
    app.post(`${base}/documents/:blockId`, async (req, res) => {
        const student = email(req, res);
        if (!student) return;
        try {
            const { activity } = await load(req);
            const block = activity.blocks.find((b) => b.id === req.params.blockId && b.kind === "document");
            if (!block) return res.status(404).json({ error: "Document block not found." });
            const token = String(req.body?.driveAccessToken || "");
            if (!token) return res.status(400).json({ error: "Google Drive permission is required." });
            await verifyDriveTokenForStudent(token, student);
            const { kitId, activityIndex } = req.params;
            B.validate({ blocks: [block] });
            const key = `block-${activityIndex}-${block.id}`;
            const result = await withResearchReportLock(`${student}:${kitId}:${key}`, async () => {
                const existing = await getStudentKitDocument(student, kitId, key);
                const live = existing?.document_id ? await driveGetLiveFile(existing.document_id, token) : null;
                if (live) return { documentId: live.id, created: false };
                const programme = await getStudentProgrammeFolder(student);
                const { kits } = await ensureStudentCourseFolders(student, programme, token);
                const fileName = `${block.fileName || block.title || activity.title || "My activity document"} (${kitId}-${activityIndex}-${block.id})`;
                const templateId = new URL(block.url).pathname.match(/\/d\/([A-Za-z0-9_-]+)/)[1];
                const template = await driveGetLiveFile(templateId, token);
                if (template?.mimeType !== "application/vnd.google-apps.document") throw Object.assign(new Error("The template must be a Google Doc shared with students."), { status: 409 });
                const found = await driveFindFileByNameInFolder(kits.id, fileName, token);
                const copy = found?.id ? await driveGetLiveFile(found.id, token) : await driveCopyFile(templateId, kits.id, fileName, token);
                if (!copy?.id || (copy.mimeType && copy.mimeType !== "application/vnd.google-apps.document")) throw new Error("Could not open a Google Docs copy. Check your KITS folder and retry.");
                await saveStudentKitDocument(student, kitId, key, { document_id: copy.id, folder_id: kits.id, template_id: templateId });
                return { documentId: copy.id, created: !found };
            });
            res.json({ documentUrl: `https://docs.google.com/document/d/${encodeURIComponent(result.documentId)}/edit`, created: result.created });
        } catch (error) { res.status(error.status || 500).json({ error: error.message || "Could not create your document." }); }
    });
    app.post("/api/admin/practical-skills/block-resource", requireAdminAccess, (req, res) => {
        upload.single("file")(req, res, async (error) => {
            if (error) return res.status(400).json({ error: error.message });
            if (!req.file) return res.status(400).json({ error: "Choose a resource file." });
            const mimeTypes = { pdf: "application/pdf", doc: "application/msword",
                docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                txt: "text/plain", csv: "text/csv", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };
            const extension = req.file.originalname.split(".").at(-1).toLowerCase();
            if (!Object.hasOwn(mimeTypes, extension)) return res.status(400).json({ error: "Use a PDF, Office document, text/CSV file or standard image." });
            try {
                const student = email(req, res);
                if (!student) return;
                const token = String(req.body?.driveAccessToken || "");
                if (!token) return res.status(400).json({ error: "Google Drive permission is required to upload resources." });
                await verifyDriveTokenForStudent(token, student);
                const folder = await driveEnsureFolder("root", "DTECH Kit Resources", token);
                if (!folder?.id) throw new Error("Google Drive did not return a resource folder. Retry the upload.");
                const file = await driveUploadBinaryFile({ accessToken: token, folderId: folder.id,
                    fileName: req.file.originalname, mimeType: mimeTypes[extension], buffer: req.file.buffer });
                if (!file?.id) throw new Error("Google Drive did not return the uploaded file. Check your DTECH Kit Resources folder before retrying.");
                try {
                    await driveApiRequest(`/files/${encodeURIComponent(file.id)}/permissions`, {
                        method: "POST", accessToken: token, body: { type: "domain", role: "reader", domain: schoolDomain, allowFileDiscovery: false }
                    });
                } catch (shareError) {
                    throw new Error(`File uploaded to your DTECH Kit Resources folder, but school sharing failed. Share it manually and paste its Drive link, or retry. ${shareError.message}`);
                }
                res.json({ name: file.name || req.file.originalname, url: `https://drive.google.com/file/d/${encodeURIComponent(file.id)}/view` });
            } catch (uploadError) { res.status(uploadError.status || 500).json({ error: uploadError.message || "Could not upload resource." }); }
        });
    });
    return { check };
}
module.exports = { registerActivityBlocks };
