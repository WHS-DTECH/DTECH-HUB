"use strict";
const { TYPING_KIT_CARD } = require("./typing-kit-store");
const { withUnityHubLicence } = require("./unity-setup");

function getStudentAudience(kitId, content) {
    const saved = content.identity?.studentAudience;
    if (saved === "all" || saved === "middle-senior") return saved;
    const unity = /^kit-unity-setup(?:-|$)/.test(kitId) || /\bunity\s+setup\b/i.test(content.identity?.name || content.bannerTitle || "");
    return unity ? "middle-senior" : "all";
}

function createKitPublication({ pool, builtIns, getDefaultContent, schoolDomain, getRequestUserEmail, getVerifiedEmail, canManage, getStudentCourse }) {
    let schema;
    async function ensureSchema() {
        if (!schema) schema = (async () => {
            await pool.query(`CREATE TABLE IF NOT EXISTS practical_skills_kit_publication (
                kit_id TEXT PRIMARY KEY, live BOOLEAN NOT NULL, updated_by_email TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
            await pool.query(`CREATE TABLE IF NOT EXISTS practical_skills_kit_resets (
                id BIGSERIAL PRIMARY KEY, kit_id TEXT NOT NULL, student_email TEXT NOT NULL, reset_by_email TEXT NOT NULL,
                previous_progress JSONB NOT NULL, reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
        })().catch((error) => { schema = null; throw error; });
        await schema;
    }
    async function catalog() {
        await ensureSchema();
        const stored = await pool.query("SELECT kit_id, content FROM practical_skills_kit_content");
        const publication = await pool.query("SELECT kit_id, live FROM practical_skills_kit_publication");
        const ids = new Set([...builtIns.map((kit) => kit.id), ...stored.rows.map((row) => row.kit_id), "kit-typing"]);
        return [...ids].filter((id) => /^kit-[a-z0-9-]{1,60}$/.test(id)).map((id) => {
            const content = withUnityHubLicence(id === "kit-typing" ? {
                bannerTitle: TYPING_KIT_CARD.title, bannerSubtitle: TYPING_KIT_CARD.summary,
                theme: { icon: TYPING_KIT_CARD.visual.icon }
            } : stored.rows.find((row) => row.kit_id === id)?.content || getDefaultContent(id));
            const explicit = publication.rows.find((row) => row.kit_id === id)?.live;
            return {
                id, title: content.identity?.name || content.bannerTitle || id,
                icon: content.theme?.icon || "\ud83d\udcc1", description: content.bannerSubtitle || "",
                skillArea: content.identity?.skillArea || "Skill Kits",
                application: content.identity?.application || "",
                applicationOrder: Number.isFinite(content.identity?.applicationOrder) ? content.identity.applicationOrder : 0,
                studentAudience: getStudentAudience(id, content),
                status: content.deletedAt ? "deleted" : content.identity?.status || "active",
                live: !content.deletedAt && (explicit ?? (content.publicationLive !== false && (content.identity?.status || "active") === "active")),
                custom: id !== "kit-typing" && !builtIns.some((kit) => kit.id === id)
            };
        });
    }
    async function available(kitId) {
        return Boolean((await catalog()).find((kit) => kit.id === kitId)?.live);
    }
    const requestAccess = new WeakMap();
    function accessFor(req) {
        if (!requestAccess.has(req)) {
            const email = getVerifiedEmail(req);
            let manager;
            let course;
            requestAccess.set(req, {
                email,
                isManager: () => manager ??= email ? canManage(email) : false,
                course: () => course ??= email ? getStudentCourse(email) : ""
            });
        }
        return requestAccess.get(req);
    }
    async function audienceAllows(kit, access) {
        return kit.studentAudience === "all" || await access.isManager()
            || ["MiddleDTECH", "SeniorDTECH"].includes(await access.course());
    }
    async function visibleKits(req, { includePreviews = false } = {}) {
        const access = accessFor(req);
        const manager = includePreviews && await access.isManager();
        const all = (await catalog()).filter((kit) => kit.status !== "deleted" && (manager || kit.live));
        if (manager) return all;
        const allowed = await Promise.all(all.map((kit) => audienceAllows(kit, access)));
        return all.filter((_kit, index) => allowed[index]);
    }
    async function requireLibraryAccess(req, res, next) {
        res.set("Cache-Control", "private, no-store");
        const access = accessFor(req);
        if (!access.email) return res.status(401).json({ error: "School sign-in required." });
        try {
            if (await access.isManager()) return next();
            return res.status(403).json({ error: "The Licence Library is for teachers. Open My Licence to find your kits." });
        } catch (error) {
            console.error("[kit-publication] Library access check failed:", error.message);
            return res.status(503).json({ error: "Library access could not be checked. Please retry." });
        }
    }
    async function setLive(kitId, live, email) {
        await ensureSchema();
        await pool.query(`INSERT INTO practical_skills_kit_publication (kit_id, live, updated_by_email) VALUES ($1,$2,$3)
            ON CONFLICT (kit_id) DO UPDATE SET live=EXCLUDED.live, updated_by_email=EXCLUDED.updated_by_email, updated_at=NOW()`,
        [kitId, live, email]);
    }
    async function gate(req, res, next) {
        const path = req.path.toLowerCase();
        const match = req.path.match(/^\/api\/practical-skills\/(?:progress|kit-content|research-report|blocks)\/([^/]+)/i);
        let kitId;
        try {
            kitId = match ? decodeURIComponent(match[1]).trim()
                : /^\/api\/practical-skills\/minecraft-exports-folder\/?$/.test(path) ? "kit-minecraft"
                : /^\/api\/practical-skills\/typing-kit(?:\/|$)/.test(path) ? "kit-typing" : null;
        } catch (_error) {
            return res.status(400).json({ error: "Invalid kit link." });
        }
        if (!kitId) return next();
        try {
            const access = accessFor(req);
            const licencePreview = /^\/api\/practical-skills\/blocks\/kit-[a-z0-9-]+\/\d+\/licences\/[a-zA-Z0-9_-]+$/.test(path);
            if (req.method === "GET" && (path.startsWith("/api/practical-skills/kit-content/") || licencePreview) && req.query?.preview === "1") {
                res.set("Cache-Control", "private, no-store");
                if (await access.isManager()) return next();
                return res.status(403).json({ error: "Kit preview is only available to teachers who manage kits." });
            }
            const kit = (await catalog()).find((item) => item.id === kitId);
            if (kit?.live) {
                if (await audienceAllows(kit, access)) return next();
                if (!access.email) return res.status(401).json({ error: "School sign-in required." });
                return res.status(403).json({ error: "This kit is not available for your DTECH course." });
            }
            if (kitId === "kit-typing" && /^\/api\/practical-skills\/typing-kit\/?$/.test(path) && req.method === "GET"
                && await access.isManager()) {
                res.locals.kitPreview = true;
                return next();
            }
            const preview = req.method === "GET" && /\/(?:kit-content|research-report)\//.test(path)
                && await access.isManager();
            if (preview) return next();
            return res.status(403).json({ error: "This kit is Not Live. Student access, completion and certificates are paused." });
        } catch (error) {
            console.error("[kit-publication] Availability check failed:", error.message);
            return res.status(503).json({ error: "Kit availability could not be checked. Please retry." });
        }
    }
    function filterSnapshot(snapshot, all, manager = false) {
        const visible = all.filter((kit) => kit.id !== "kit-typing");
        const byId = new Map(snapshot.kits.map((kit) => [kit.id, kit]));
        const kits = visible.map((kit) => ({ ...byId.get(kit.id), ...kit }));
        return {
            ...snapshot, kits, customKits: kits.filter((kit) => kit.custom), licenceKits: kits,
            stampTotalKits: kits.length, stampCompletedCount: kits.filter((kit) => kit.isComplete).length,
            canManageKits: manager,
            typingKit: all.find((kit) => kit.id === "kit-typing") || { live: false }
        };
    }
    function register(app, requireAdminAccess) {
        app.get("/api/admin/kit-publication", requireAdminAccess, async (_req, res) => {
            res.set("Cache-Control", "private, no-store");
            try { res.json({ kits: (await catalog()).filter((kit) => kit.status !== "deleted") }); }
            catch (error) { console.error("[kit-publication]", error.message); res.status(503).json({ error: "Could not load saved kits." }); }
        });
        app.put("/api/admin/kit-publication/:kitId", requireAdminAccess, async (req, res) => {
            res.set("Cache-Control", "private, no-store");
            if (typeof req.body?.live !== "boolean") return res.status(400).json({ error: "Choose Live or Not Live." });
            try {
                const kit = (await catalog()).find((item) => item.id === req.params.kitId && item.status !== "deleted");
                if (!kit) return res.status(404).json({ error: "Unknown kit." });
                await setLive(kit.id, req.body.live, getRequestUserEmail(req));
                res.json({ ok: true, kitId: kit.id, live: req.body.live });
            } catch (error) { console.error("[kit-publication]", error.message); res.status(503).json({ error: "Publication change was not confirmed. Reload before retrying." }); }
        });
        app.post("/api/admin/kit-results/:kitId/reset", requireAdminAccess, async (req, res) => {
            res.set("Cache-Control", "private, no-store");
            const emails = Array.isArray(req.body?.emails) ? [...new Set(req.body.emails)] : [];
            if (!emails.length || emails.length > 20 || emails.some((email) => typeof email !== "string" ||
                !/^[^\s@]+@[^\s@]+$/.test(email) || email.split("@")[1] !== schoolDomain)) {
                return res.status(400).json({ error: "Choose 1-20 valid school emails." });
            }
            let client;
            try {
                if (!(await catalog()).some((kit) => kit.id === req.params.kitId)) return res.status(404).json({ error: "Unknown kit." });
                await pool.query("ALTER TABLE practical_skills_progress ADD COLUMN IF NOT EXISTS search_tick_recovery_version INTEGER NOT NULL DEFAULT 0");
                client = await pool.connect();
                await client.query("BEGIN");
                for (const email of [...emails].sort()) await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`kit-certificate:${email}:${req.params.kitId}`]);
                const previous = await client.query("SELECT * FROM practical_skills_progress WHERE kit_id=$1 AND student_email=ANY($2::text[]) FOR UPDATE", [req.params.kitId, emails]);
                for (const row of previous.rows) await client.query(`INSERT INTO practical_skills_kit_resets
                    (kit_id, student_email, reset_by_email, previous_progress) VALUES ($1,$2,$3,$4::jsonb)`,
                [req.params.kitId, row.student_email, getRequestUserEmail(req), JSON.stringify(row)]);
                const result = await client.query(`UPDATE practical_skills_progress SET completed=FALSE, completed_at=NULL,
                    completed_activities='{}'::jsonb, certificate_emailed_at=NULL, started_at=NOW(), updated_at=NOW(),
                    search_tick_recovery_version=CASE WHEN kit_id='kit-google-search' THEN 1 ELSE search_tick_recovery_version END
                    WHERE kit_id=$1 AND student_email=ANY($2::text[]) RETURNING student_email, completed, completed_activities, certificate_emailed_at`,
                [req.params.kitId, emails]);
                await client.query("COMMIT");
                res.json({ reset: result.rows, missing: emails.filter((email) => !result.rows.some((row) => row.student_email === email)),
                    message: "Completion and in-app certificate eligibility reset. Answers, Drive files and email history retained. Emailed PDFs cannot be recalled." });
            } catch (error) {
                if (client) {
                    try { await client.query("ROLLBACK"); }
                    catch (rollbackError) { console.error("[kit-reset] Rollback failed:", rollbackError.message); }
                }
                console.error("[kit-reset]", error.message);
                res.status(503).json({ error: "Reset was not confirmed. Read the saved records before retrying." });
            } finally { client?.release(); }
        });
    }
    return { catalog, available, accessFor, visibleKits, requireLibraryAccess, gate, filterSnapshot, register, setLive };
}

module.exports = { createKitPublication };
