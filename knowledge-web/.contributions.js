"use strict";

const { randomUUID } = require("node:crypto");

const schema = `
CREATE TABLE IF NOT EXISTS knowledge_web_kites (
    id UUID PRIMARY KEY, cloud_a UUID NOT NULL REFERENCES knowledge_web_clouds(id),
    cloud_b UUID NOT NULL REFERENCES knowledge_web_clouds(id), CHECK (cloud_a < cloud_b),
    proposal_id UUID UNIQUE REFERENCES knowledge_web_proposals(id),
    argument TEXT NOT NULL, contributor_email TEXT NOT NULL, contributor_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), hidden_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS knowledge_web_kites_pair_idx ON knowledge_web_kites(cloud_a, cloud_b);
CREATE TABLE IF NOT EXISTS knowledge_web_kite_comments (
    id UUID PRIMARY KEY, kite_id UUID NOT NULL REFERENCES knowledge_web_kites(id),
    reply_to UUID REFERENCES knowledge_web_kite_comments(id), body TEXT NOT NULL,
    contributor_email TEXT NOT NULL, contributor_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), hidden_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS knowledge_web_kite_comments_kite_idx ON knowledge_web_kite_comments(kite_id, created_at);
CREATE TABLE IF NOT EXISTS knowledge_web_kite_evidence (
    id UUID PRIMARY KEY, kite_id UUID NOT NULL REFERENCES knowledge_web_kites(id),
    initial BOOLEAN NOT NULL DEFAULT FALSE, title TEXT NOT NULL, reference TEXT NOT NULL, url TEXT,
    author TEXT NOT NULL DEFAULT '', publication_date TEXT NOT NULL DEFAULT '',
    supports TEXT NOT NULL, stance TEXT NOT NULL CHECK (stance IN ('supports','challenges','context')),
    contributor_email TEXT NOT NULL, contributor_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), hidden_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS knowledge_web_kite_evidence_kite_idx ON knowledge_web_kite_evidence(kite_id, created_at);
CREATE TABLE IF NOT EXISTS knowledge_web_contribution_revisions (
    id UUID PRIMARY KEY, kind TEXT NOT NULL, target_id UUID NOT NULL, actor_email TEXT NOT NULL,
    previous JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS knowledge_web_reports (
    id UUID PRIMARY KEY, kite_id UUID NOT NULL REFERENCES knowledge_web_kites(id),
    kind TEXT NOT NULL CHECK (kind IN ('kite','comment','evidence')), target_id UUID NOT NULL, reporter_email TEXT NOT NULL,
    reason TEXT NOT NULL, details TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS knowledge_web_reports_open_idx ON knowledge_web_reports(kind, target_id) WHERE resolved_at IS NULL;
CREATE TABLE IF NOT EXISTS knowledge_web_moderation_actions (
    id UUID PRIMARY KEY, report_id UUID NOT NULL REFERENCES knowledge_web_reports(id),
    action TEXT NOT NULL CHECK (action IN ('hide','dismiss')), note TEXT NOT NULL, actor_email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`;

const tables = { kite: "knowledge_web_kites", comment: "knowledge_web_kite_comments", evidence: "knowledge_web_kite_evidence" };
const kiteFrom = `FROM knowledge_web_kites k JOIN knowledge_web_clouds a ON a.id=k.cloud_a
    JOIN knowledge_web_clouds b ON b.id=k.cloud_b`;
const visible = "k.hidden_at IS NULL AND a.published_at IS NOT NULL AND b.published_at IS NOT NULL";
const kiteFields = `k.id,k.cloud_a AS "cloudA",k.cloud_b AS "cloudB",a.title AS "titleA",b.title AS "titleB",k.argument`;
const attribution = `contributor_name AS contributor,created_at AS "createdAt",updated_at AS "updatedAt"`;
const evidenceFields = `id,initial,title,reference,url,author,publication_date AS "publicationDate",supports,stance`;
const commentFields = `c.id,c.body,c.reply_to AS "replyTo"`;

function registerContributions(app, { base, pool, route, ensureSchema, transaction, getContributorName, notifyReport, UUID, problem, text, date }) {
    const handler = (callback, { staffOnly = false, studentOnly = false } = {}) => route({ staffOnly }, async (req, res, access) => {
        if (studentOnly && access.staff) throw problem(403, "This action is available to students.");
        await ensureSchema();
        await callback(req, res, access);
    });
    const student = { studentOnly: true };
    const teacher = { staffOnly: true };
    const uid = (value) => {
        if (typeof value !== "string" || !UUID.test(value)) throw problem(400, "A valid contribution or cloud identifier is required.");
        return value.toLowerCase();
    };
    const kindOf = (value) => {
        if (!Object.hasOwn(tables, value)) throw problem(400, "Choose a kite, comment or piece of evidence.");
        return value;
    };
    const nameFor = async (req, email) => {
        const name = await getContributorName(req, email);
        return name && !name.includes("@") ? name : "DTECH student";
    };
    function evidence(body, initial = false) {
        const reference = text(body?.reference ?? "", "URL or reference", 2048, false);
        const url = /^https?:\/\//i.test(reference) ? URL.parse(reference) : null;
        if ((/^https?:/i.test(reference) && (!url || url.username || url.password))
            || (/^[a-z][a-z0-9+.-]*:\/\//i.test(reference) && !url)) {
            throw problem(400, "Use an HTTP(S) URL or a written reference.");
        }
        const stance = initial ? "supports" : body?.stance ?? "supports";
        if (!["supports", "challenges", "context"].includes(stance)) throw problem(400, "Choose how the evidence relates to the argument.");
        return [text(body?.title, "Evidence title or description", 200), reference, url?.href || null,
            text(body?.author ?? "", "Source author or organisation", 200, false), date(body?.publicationDate, "Publication date"),
            text(body?.supports, "Explanation of what the evidence supports", 1000), stance];
    }

    async function lockKite(db, id) {
        const kite = (await db.query(`SELECT k.* ${kiteFrom} WHERE k.id=$1 AND ${visible} FOR UPDATE OF k`, [id])).rows[0];
        if (!kite) throw problem(404, "This kite is not available.");
        return kite;
    }

    async function target(db, kite, kind, id) {
        const row = kind === "kite" ? (kite.id === id ? kite : null)
            : (await db.query(`SELECT * FROM ${tables[kind]} WHERE id=$1 AND kite_id=$2 AND hidden_at IS NULL`, [id, kite.id])).rows[0];
        if (!row) throw problem(404, "This contribution is not available.");
        return row;
    }

    async function addEvidence(db, kiteId, values, email, name, initial) {
        const id = randomUUID();
        await db.query(`INSERT INTO knowledge_web_kite_evidence
            (id,kite_id,title,reference,url,author,publication_date,supports,stance,contributor_email,contributor_name,initial)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [id, kiteId, ...values, email, name, initial]);
        return id;
    }

    app.get(`${base}/kites`, handler(async (_req, res, { email }) => {
        const { rows } = await pool.query(`SELECT ${kiteFields},k.contributor_name AS contributor,
            k.created_at AS "createdAt",k.updated_at AS "updatedAt",k.contributor_email=$1 AS "mine"
            ${kiteFrom} WHERE ${visible} ORDER BY k.created_at,k.id`, [email]);
        res.json({ kites: rows });
    }));

    app.get(`${base}/kites/:id`, handler(async (req, res, { email }) => {
        const id = uid(req.params.id);
        const result = await transaction(async (db) => {
            await db.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
            const kite = (await db.query(`SELECT ${kiteFields},k.contributor_name AS contributor,k.created_at AS "createdAt",
                k.updated_at AS "updatedAt",k.contributor_email=$2 AS "mine" ${kiteFrom}
                WHERE k.id=$1 AND ${visible}`, [id, email])).rows[0];
            if (!kite) throw problem(404, "This kite is not available.");
            const comments = (await db.query(`SELECT ${commentFields},c.contributor_name AS contributor,
                c.created_at AS "createdAt",c.updated_at AS "updatedAt",c.contributor_email=$2 AS "mine",
                parent.hidden_at IS NOT NULL AS "replyUnavailable"
                FROM knowledge_web_kite_comments c LEFT JOIN knowledge_web_kite_comments parent ON parent.id=c.reply_to
                WHERE c.kite_id=$1 AND c.hidden_at IS NULL ORDER BY c.created_at,c.id`, [id, email])).rows;
            const sources = (await db.query(`SELECT ${evidenceFields},${attribution},contributor_email=$2 AS "mine"
                FROM knowledge_web_kite_evidence WHERE kite_id=$1 AND hidden_at IS NULL
                ORDER BY initial DESC,created_at,id`, [id, email])).rows;
            return { kite, comments, evidence: sources };
        });
        res.json(result);
    }));

    app.post(`${base}/kites`, handler(async (req, res, { email }) => {
        const [cloudA, cloudB] = [uid(req.body?.cloudA), uid(req.body?.cloudB)].sort();
        if (cloudA === cloudB) throw problem(400, "Select two different clouds.");
        const argument = text(req.body?.argument, "Connection argument", 4000);
        if (!Array.isArray(req.body?.evidence) || !req.body.evidence.length || req.body.evidence.length > 20) {
            throw problem(400, "Add at least one piece of supporting evidence (up to 20).");
        }
        const sources = req.body.evidence.map((entry) => evidence(entry, true));
        const proposalId = req.body.proposalId ? uid(req.body.proposalId) : null;
        const name = await nameFor(req, email);
        const id = randomUUID();
        await transaction(async (db) => {
            if ((await db.query("SELECT id FROM knowledge_web_clouds WHERE id=ANY($1::uuid[]) AND published_at IS NOT NULL",
                [[cloudA, cloudB]])).rowCount !== 2) throw problem(404, "Choose two published clouds.");
            if (proposalId && !(await db.query(`SELECT id FROM knowledge_web_proposals WHERE id=$1 AND contributor_email=$2
                AND status='Approved' AND original_cloud_id=ANY($3::uuid[]) AND published_cloud_id=ANY($3::uuid[])`,
            [proposalId, email, [cloudA, cloudB]])).rowCount) throw problem(404, "This approved proposal is not available for these clouds.");
            if (!(await db.query(`INSERT INTO knowledge_web_kites
                (id,cloud_a,cloud_b,proposal_id,argument,contributor_email,contributor_name)
                VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (proposal_id) DO NOTHING`,
            [id, cloudA, cloudB, proposalId, argument, email, name])).rowCount) {
                throw problem(409, "A kite has already been published from this proposal.");
            }
            for (const values of sources) await addEvidence(db, id, values, email, name, true);
        });
        res.status(201).json({ id });
    }, student));

    app.post(`${base}/kites/:id/comments`, handler(async (req, res, { email }) => {
        const id = randomUUID();
        const body = text(req.body?.body, "Comment", 3000);
        const replyTo = req.body?.replyTo ? uid(req.body.replyTo) : null;
        const name = await nameFor(req, email);
        await transaction(async (db) => {
            const kite = await lockKite(db, uid(req.params.id));
            if (replyTo) await target(db, kite, "comment", replyTo);
            await db.query(`INSERT INTO knowledge_web_kite_comments
                (id,kite_id,reply_to,body,contributor_email,contributor_name) VALUES ($1,$2,$3,$4,$5,$6)`,
            [id, kite.id, replyTo, body, email, name]);
        });
        res.status(201).json({ id });
    }, student));

    app.post(`${base}/kites/:id/evidence`, handler(async (req, res, { email }) => {
        const values = evidence(req.body);
        const name = await nameFor(req, email);
        const id = await transaction(async (db) => {
            const kite = await lockKite(db, uid(req.params.id));
            return addEvidence(db, kite.id, values, email, name, false);
        });
        res.status(201).json({ id });
    }, student));

    app.put(`${base}/kites/:id/contributions/:kind/:target`, handler(async (req, res, { email }) => {
        const kind = kindOf(req.params.kind);
        const id = uid(req.params.target);
        await transaction(async (db) => {
            const kite = await lockKite(db, uid(req.params.id));
            const current = await target(db, kite, kind, id);
            if (current.contributor_email !== email) throw problem(403, "You can only edit your own contributions.");
            const fields = kind === "kite" ? ["argument"] : kind === "comment" ? ["body"]
                : ["title", "reference", "url", "author", "publication_date", "supports", "stance"];
            const values = kind === "kite" ? [text(req.body?.argument, "Connection argument", 4000)]
                : kind === "comment" ? [text(req.body?.body, "Comment", 3000)] : evidence(req.body, current.initial);
            if (fields.every((field, index) => current[field] === values[index])) return;
            await db.query(`INSERT INTO knowledge_web_contribution_revisions (id,kind,target_id,actor_email,previous)
                VALUES ($1,$2,$3,$4,$5)`, [randomUUID(), kind, id, email, JSON.stringify(current)]);
            await db.query(`UPDATE ${tables[kind]} SET ${fields.map((field, i) => `${field}=$${i + 2}`).join(",")},
                updated_at=NOW() WHERE id=$1`, [id, ...values]);
        });
        res.json({ id });
    }, student));

    app.get(`${base}/contributions`, handler(async (_req, res, { email }) => {
        const { rows } = await pool.query(`SELECT k.id,k.id AS "kiteId",'kite' AS kind,k.argument AS summary,
            k.created_at AS "createdAt",k.updated_at AS "updatedAt",NULL::uuid AS "proposalId"
            ${kiteFrom} WHERE ${visible} AND k.contributor_email=$1
            UNION ALL SELECT c.id,k.id,'comment',c.body,c.created_at,c.updated_at,NULL::uuid
            ${kiteFrom} JOIN knowledge_web_kite_comments c ON c.kite_id=k.id
            WHERE ${visible} AND c.hidden_at IS NULL AND c.contributor_email=$1
            UNION ALL SELECT e.id,k.id,'evidence',e.title,e.created_at,e.updated_at,NULL::uuid
            ${kiteFrom} JOIN knowledge_web_kite_evidence e ON e.kite_id=k.id
            WHERE ${visible} AND e.hidden_at IS NULL AND e.contributor_email=$1
            ORDER BY "updatedAt" DESC,id`, [email]);
        const { rows: converted } = await pool.query("SELECT proposal_id AS id FROM knowledge_web_kites WHERE contributor_email=$1 AND proposal_id IS NOT NULL", [email]);
        res.json({ contributions: rows, convertedProposalIds: converted.map(({ id }) => id) });
    }, student));

    app.post(`${base}/kites/:id/reports`, handler(async (req, res, { email }) => {
        const kind = kindOf(req.body?.kind);
        const targetId = uid(req.body?.targetId);
        const reason = req.body?.reason;
        if (!["harassment", "personal-information", "spam", "disruption", "other"].includes(reason)) {
            throw problem(400, "Choose a reason for reporting this behaviour.");
        }
        const details = text(req.body?.details ?? "", "Report details", 1000, reason === "other");
        const result = await transaction(async (db) => {
            const kite = await lockKite(db, uid(req.params.id));
            await target(db, kite, kind, targetId);
            const open = (await db.query(`SELECT id,reporter_email FROM knowledge_web_reports
                WHERE kind=$1 AND target_id=$2 AND resolved_at IS NULL`, [kind, targetId])).rows;
            const own = open.find((row) => row.reporter_email === email);
            if (own) return { id: own.id, notify: false };
            const id = randomUUID();
            await db.query(`INSERT INTO knowledge_web_reports (id,kite_id,kind,target_id,reporter_email,reason,details)
                VALUES ($1,$2,$3,$4,$5,$6,$7)`, [id, kite.id, kind, targetId, email, reason, details]);
            return { id, notify: !open.length };
        });
        if (result.notify && notifyReport) {
            try { await notifyReport(); }
            catch (error) { console.error("[knowledge-web] Could not notify staff of a report:", error.message); }
        }
        res.status(201).json({ id: result.id });
    }, student));

    app.get(`${base}/manage/reports`, handler(async (_req, res) => {
        const { rows } = await pool.query(`SELECT r.id,r.kite_id AS "kiteId",r.target_id AS "targetId",r.kind,
            r.reason,r.details,r.created_at AS "createdAt",a.title AS "titleA",b.title AS "titleB",
            CASE r.kind WHEN 'comment' THEN c.body WHEN 'evidence' THEN concat_ws(' — ',e.title,e.supports,e.reference)
                ELSE k.argument END AS content,
            COALESCE(c.contributor_name,e.contributor_name,k.contributor_name) AS contributor
            FROM knowledge_web_reports r JOIN knowledge_web_kites k ON k.id=r.kite_id
            JOIN knowledge_web_clouds a ON a.id=k.cloud_a JOIN knowledge_web_clouds b ON b.id=k.cloud_b
            LEFT JOIN knowledge_web_kite_comments c ON r.kind='comment' AND c.id=r.target_id
            LEFT JOIN knowledge_web_kite_evidence e ON r.kind='evidence' AND e.id=r.target_id
            WHERE r.resolved_at IS NULL ORDER BY r.created_at,r.id`);
        res.json({ reports: rows });
    }, teacher));

    app.post(`${base}/manage/reports/:id`, handler(async (req, res, { email }) => {
        const id = uid(req.params.id);
        const action = req.body?.action;
        if (!["hide", "dismiss"].includes(action)) throw problem(400, "Choose hide or dismiss.");
        const note = text(req.body?.note ?? "", "Moderation note", 1000);
        await transaction(async (db) => {
            const report = (await db.query("SELECT * FROM knowledge_web_reports WHERE id=$1", [id])).rows[0];
            if (!report) throw problem(404, "Report not found.");
            await db.query("SELECT id FROM knowledge_web_kites WHERE id=$1 FOR UPDATE", [report.kite_id]);
            if (!(await db.query("SELECT id FROM knowledge_web_reports WHERE id=$1 AND resolved_at IS NULL", [id])).rowCount) {
                throw problem(409, "This report has already been resolved.");
            }
            if (action === "hide") {
                await db.query(`UPDATE ${tables[kindOf(report.kind)]} SET hidden_at=NOW() WHERE id=$1 AND hidden_at IS NULL`, [report.target_id]);
                await db.query(`UPDATE knowledge_web_reports SET resolved_at=NOW() WHERE resolved_at IS NULL
                    AND ((kind=$1 AND target_id=$2) OR ($3::boolean AND kite_id=$4))`,
                [report.kind, report.target_id, report.kind === "kite", report.kite_id]);
            } else {
                await db.query("UPDATE knowledge_web_reports SET resolved_at=NOW() WHERE id=$1", [id]);
            }
            await db.query(`INSERT INTO knowledge_web_moderation_actions (id,report_id,action,note,actor_email)
                VALUES ($1,$2,$3,$4,$5)`, [randomUUID(), id, action, note, email]);
        });
        res.json({ action });
    }, teacher));
}

module.exports = { registerContributions, schema };
