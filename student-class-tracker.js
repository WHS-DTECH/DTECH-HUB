"use strict";

const { getCourseProgrammeFolder } = require("./learning-sites-assessment");

const DESCRIPTION_ID = "digital-outcome-description";
const cleanEmail = (value) => String(value || "").trim().toLowerCase();

function presentationId(value) {
    return String(value || "").match(/^https:\/\/docs\.google\.com\/presentation\/d\/([A-Za-z0-9_-]+)(?:[/?#]|$)/i)?.[1] || "";
}

function firstSlideText(presentation) {
    const slide = presentation?.slides?.[0];
    if (!slide) throw new Error("The slideshow has no first slide to check.");
    const text = (value) => (value?.textElements || []).map((entry) => entry.textRun?.content || "").join("");
    const walk = (elements) => (elements || []).flatMap((element) => {
        if (element.elementGroup) return walk(element.elementGroup.children);
        if (element.table) return (element.table.tableRows || []).flatMap((row) =>
            (row.tableCells || []).map((cell) => text(cell.text)));
        return [text(element.shape?.text)];
    });
    return walk(slide.pageElements).join("\n");
}

function hasAddedWriting(presentation, template) {
    const words = (value) => value.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
    const baseline = new Map();
    words(firstSlideText(template)).forEach((word) => baseline.set(word, (baseline.get(word) || 0) + 1));
    // Count added words, not formatting changes, reordered prompts or deleted instructions.
    return words(firstSlideText(presentation)).some((word) => {
        const remaining = baseline.get(word) || 0;
        if (!remaining) return true;
        baseline.set(word, remaining - 1);
        return false;
    });
}

function findDescriptionCopy(rows) {
    const candidates = [];
    for (const row of rows) {
        for (const copy of Array.isArray(row.template_copies) ? row.template_copies : []) {
            if (String(copy?.templateId || "").toLowerCase() !== DESCRIPTION_ID) continue;
            const fileId = presentationId(copy.fileUrl);
            if (fileId) candidates.push({ fileId, fileUrl: `https://docs.google.com/presentation/d/${fileId}/edit`, date: copy.copiedAt || row.updated_at });
        }
        for (const evidence of Array.isArray(row.evidence_steps) ? row.evidence_steps : []) {
            if (!/^task-topic:/i.test(evidence?.standard || "") ||
                !/description-google-slides|describe-the-digital-outcome/i.test(evidence.standard)) continue;
            for (const step of Array.isArray(evidence.steps) ? evidence.steps : []) {
                const fileId = presentationId(String(step?.text || "").replace(/^(GOOGLE_SLIDES_URL|LINK)\|/, ""));
                if (fileId) candidates.push({ fileId, fileUrl: `https://docs.google.com/presentation/d/${fileId}/edit`, date: row.updated_at });
            }
        }
    }
    candidates.sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
    return candidates[0] || null;
}

function teacherCommentThreads(comments, teacherEmail) {
    const isTeacher = (author) => author?.me === true || (cleanEmail(author?.emailAddress) !== "" &&
        cleanEmail(author.emailAddress) === cleanEmail(teacherEmail));
    const entry = (item) => ({
        id: String(item.id || ""),
        text: String(item.content || ""),
        author: String(item.author?.displayName || item.author?.emailAddress || "Google user"),
        yours: isTeacher(item.author) && Boolean(String(item.content || "").trim()),
        createdAt: item.createdTime || "",
        modifiedAt: item.modifiedTime || ""
    });
    return comments.filter((comment) => !comment.deleted).map((comment) => ({
        ...entry(comment),
        resolved: Boolean(comment.resolved),
        replies: (comment.replies || []).filter((reply) => !reply.deleted && String(reply.content || "").trim()).map(entry)
    })).filter((comment) => comment.yours || comment.replies.some((reply) => reply.yours));
}

async function readTeacherComments(fileId, token, teacherEmail, driveApiRequest) {
    const comments = [];
    const seen = new Set();
    let pageToken = "";
    do {
        const page = await driveApiRequest(`/files/${encodeURIComponent(fileId)}/comments`, {
            accessToken: token,
            queryParams: {
                fields: "nextPageToken,comments(id,content,createdTime,modifiedTime,resolved,deleted,author(displayName,emailAddress,me),replies(id,content,createdTime,modifiedTime,deleted,author(displayName,emailAddress,me)))",
                pageSize: 100,
                includeDeleted: false,
                pageToken
            }
        });
        if (!Array.isArray(page.comments)) throw new Error("Google returned an incomplete comments response.");
        comments.push(...page.comments);
        pageToken = String(page.nextPageToken || "");
        if (pageToken && seen.has(pageToken)) throw new Error("Google comments pagination could not be completed.");
        seen.add(pageToken);
    } while (pageToken);
    return teacherCommentThreads(comments, teacherEmail);
}

function registerStudentClassTracker(app, deps) {
    const {
        pool, hasDatabase, requireActivityWriteAccess, getStudentDirectoryRows,
        buildStudentClassManagementRow, dedupeToLatestStudentRows, getStudentIdentityKey,
        listTemplateLibraryEntries, googleSlidesApiRequest, driveApiRequest,
        verifyDriveTokenForStudent, getStudentDriveSetup, driveFindFolderByName
    } = deps;
    let schemaReady;
    function ensureSchema() {
        if (!hasDatabase) {
            const error = new Error("The class tracker needs the database to save and load checks.");
            error.status = 503;
            throw error;
        }
        if (!schemaReady) {
            schemaReady = pool.query(`CREATE TABLE IF NOT EXISTS student_class_description_checks (
                teacher_email TEXT NOT NULL,
                student_key TEXT NOT NULL,
                result JSONB NOT NULL,
                checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY (teacher_email, student_key)
            )`).catch((error) => { schemaReady = null; throw error; });
        }
        return schemaReady;
    }

    async function loadRoster(teacherEmail) {
        await ensureSchema();
        const students = dedupeToLatestStudentRows((await getStudentDirectoryRows()).map(buildStudentClassManagementRow))
            .filter((row) => row.has_dtech && String(row.status || "").toLowerCase() !== "not current");
        const emails = [...new Set(students.flatMap((row) => row.linked_emails || []).map(cleanEmail).filter(Boolean))];
        const [interestResult, savedResult] = await Promise.all([
            pool.query("SELECT student_email, template_copies, evidence_steps, updated_at FROM project_interests WHERE lower(student_email) = ANY($1::text[])", [emails]),
            pool.query("SELECT student_key, result FROM student_class_description_checks WHERE teacher_email = $1", [teacherEmail])
        ]);
        const interests = new Map();
        for (const row of interestResult.rows) {
            const email = cleanEmail(row.student_email);
            if (!interests.has(email)) interests.set(email, []);
            interests.get(email).push(row);
        }
        const saved = new Map(savedResult.rows.map((row) => [row.student_key, row.result]));
        return students.map((student) => {
            const id = getStudentIdentityKey(student);
            const linkedEmails = (student.linked_emails || []).map(cleanEmail).filter(Boolean);
            const copy = findDescriptionCopy(linkedEmails.flatMap((email) => interests.get(email) || []));
            const snapshot = saved.get(id) || null;
            const year = Number.parseInt(String(student.year_level || "").replace(/[^0-9]/g, ""), 10);
            return {
                id, name: student.student_name, year: student.year_level, form: student.form_class,
                course: getCourseProgrammeFolder(`${year}DTECH`), linkedEmails,
                fileId: copy?.fileId || snapshot?.fileId || "",
                fileUrl: copy?.fileUrl || (snapshot?.fileId ? `https://docs.google.com/presentation/d/${snapshot.fileId}/edit` : ""),
                check: copy && snapshot?.fileId !== copy.fileId ? null : snapshot
            };
        }).sort((a, b) => a.name.localeCompare(b.name));
    }

    async function discoverDescription(student, token) {
        for (const email of student.linkedEmails) {
            const setup = await getStudentDriveSetup(email);
            const root = String(setup?.mdtechProjectFolderId || "");
            if (!root) continue;
            const folder = await driveFindFolderByName(root, "Digital Outcome Details", token);
            const folderIds = [...new Set([root, folder?.id].filter(Boolean))];
            const candidates = [];
            for (const folderId of folderIds) {
                const page = await driveApiRequest("/files", {
                    accessToken: token,
                    queryParams: {
                        q: `'${folderId.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.presentation' and name contains 'Digital Outcome Description'`,
                        fields: "files(id,name,modifiedTime)", pageSize: 1, orderBy: "modifiedTime desc"
                    }
                });
                if (page.files?.[0]?.id) candidates.push(page.files[0]);
            }
            candidates.sort((a, b) => (Date.parse(b.modifiedTime) || 0) - (Date.parse(a.modifiedTime) || 0));
            if (candidates.length) return candidates[0].id;
        }
        return "";
    }

    async function checkStudent(student, token, teacherEmail, baseline) {
        const result = {
            fileId: student.fileId, checkedAt: new Date().toISOString(),
            created: { status: "not_linked" }, writing: { status: "not_applicable" },
            comments: { status: "not_applicable", threads: [] }
        };
        try {
            if (!result.fileId) result.fileId = await discoverDescription(student, token);
            if (!result.fileId) return result;
            if (result.fileId === baseline.fileId) {
                result.created = { status: "unavailable", message: "This link opens the shared template, not a student's personal description." };
                return result;
            }
            const file = await driveApiRequest(`/files/${encodeURIComponent(result.fileId)}`, {
                accessToken: token, queryParams: { fields: "id,trashed,mimeType", supportsAllDrives: true }
            });
            if (file.trashed || file.mimeType !== "application/vnd.google-apps.presentation") {
                result.created = { status: "unavailable", message: "The linked file is in the bin or is not a Google slideshow." };
                return result;
            }
            result.created = { status: "yes" };
        } catch (error) {
            result.created = { status: "error", message: error.message || "Could not check the description file." };
            return result;
        }
        await Promise.all([
            (async () => {
                try {
                    if (baseline.error) throw baseline.error;
                    const presentation = await googleSlidesApiRequest(result.fileId, token);
                    result.writing = { status: hasAddedWriting(presentation, baseline.presentation) ? "yes" : "no" };
                } catch (error) {
                    result.writing = { status: "error", message: error.message || "Could not read the first slide." };
                }
            })(),
            (async () => {
                try {
                    const threads = await readTeacherComments(result.fileId, token, teacherEmail, driveApiRequest);
                    result.comments = { status: threads.length ? "yes" : "no", threads };
                } catch (error) {
                    result.comments = { status: "error", message: error.message || "Could not read Google comments.", threads: [] };
                }
            })()
        ]);
        return result;
    }

    app.get("/api/student-tracker/my-class", requireActivityWriteAccess, async (req, res) => {
        res.set("Cache-Control", "no-store");
        try {
            const students = await loadRoster(req.user_email);
            res.json({ students: students.map(({ linkedEmails, ...student }) => student) });
        } catch (error) {
            console.error("My Class roster could not be loaded:", error.message);
            res.status(error.status || 500).json({ error: error.message || "Could not load My Class." });
        }
    });

    app.post("/api/student-tracker/my-class/check", requireActivityWriteAccess, async (req, res) => {
        res.set("Cache-Control", "no-store");
        const token = String(req.body?.driveAccessToken || "").trim();
        const ids = req.body?.studentIds;
        if (!token || !Array.isArray(ids) || !ids.length || ids.length > 5 ||
            ids.some((id) => typeof id !== "string") || new Set(ids).size !== ids.length) {
            res.status(400).json({ error: "A Drive access token and one to five unique student IDs are required." });
            return;
        }
        try {
            await verifyDriveTokenForStudent(token, req.user_email);
            const roster = await loadRoster(req.user_email);
            const selected = ids.map((id) => roster.find((student) => student.id === id));
            if (selected.some((student) => !student || student.course !== "MiddleDTECH")) {
                res.status(400).json({ error: "Choose current MiddleDTECH students from My Class." });
                return;
            }
            const baseline = {};
            try {
                const template = (await listTemplateLibraryEntries()).find((entry) => entry.id === DESCRIPTION_ID);
                const templateId = presentationId(template?.templateUrl);
                if (!templateId) throw new Error("The Digital Outcome Description template is not configured.");
                baseline.fileId = templateId;
                baseline.presentation = await googleSlidesApiRequest(templateId, token);
                firstSlideText(baseline.presentation);
            } catch (error) {
                baseline.error = error;
            }
            const results = [];
            // Small sequential batches keep a class refresh within Google API quotas.
            for (const student of selected) {
                const result = await checkStudent(student, token, req.user_email, baseline);
                await pool.query(`INSERT INTO student_class_description_checks (teacher_email, student_key, result, checked_at)
                    VALUES ($1, $2, $3::jsonb, NOW())
                    ON CONFLICT (teacher_email, student_key) DO UPDATE SET result = EXCLUDED.result, checked_at = NOW()`,
                [req.user_email, student.id, JSON.stringify(result)]);
                results.push({ id: student.id, check: result });
            }
            res.json({ results });
        } catch (error) {
            console.error("My Class description check failed:", error.message);
            res.status(error.status || 500).json({ error: error.message || "Could not refresh class descriptions." });
        }
    });
}

module.exports = { presentationId, firstSlideText, hasAddedWriting, findDescriptionCopy, teacherCommentThreads, readTeacherComments, registerStudentClassTracker };
