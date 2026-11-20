"use strict";

const { randomUUID } = require("node:crypto");

const kiteSchema = `
CREATE TABLE IF NOT EXISTS knowledge_web_kites (
    id UUID PRIMARY KEY, cloud_a UUID NOT NULL REFERENCES knowledge_web_clouds(id),
    cloud_b UUID REFERENCES knowledge_web_clouds(id), CHECK (cloud_a < cloud_b),
    proposal_id UUID UNIQUE REFERENCES knowledge_web_proposals(id),
    argument TEXT NOT NULL, contributor_email TEXT NOT NULL, contributor_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), hidden_at TIMESTAMPTZ
);
ALTER TABLE knowledge_web_kites ALTER COLUMN cloud_b DROP NOT NULL;
CREATE INDEX IF NOT EXISTS knowledge_web_kites_pair_idx ON knowledge_web_kites(cloud_a, cloud_b);`;

const families = [
    { root: "kite", tables: { kite: "knowledge_web_kites", comment: "knowledge_web_kite_comments", evidence: "knowledge_web_kite_evidence" },
        reports: "knowledge_web_reports", revisions: "knowledge_web_contribution_revisions", audit: "knowledge_web_moderation_actions" },
    { root: "connection", tables: { connection: "knowledge_web_connections", comment: "knowledge_web_connection_comments", evidence: "knowledge_web_connection_evidence" },
        reports: "knowledge_web_connection_reports", revisions: "knowledge_web_connection_revisions", audit: "knowledge_web_connection_moderation_actions" },
    { root: "balloon", tables: { balloon: "knowledge_web_balloons", comment: "knowledge_web_balloon_comments", evidence: "knowledge_web_balloon_evidence" },
        reports: "knowledge_web_balloon_reports", revisions: "knowledge_web_balloon_revisions", audit: "knowledge_web_balloon_moderation_actions" }
];
function childSchema({ root, tables, reports, revisions, audit }) {
    const key = `${root}_id`;
    return `
CREATE TABLE IF NOT EXISTS ${tables.comment} (
    id UUID PRIMARY KEY, ${key} UUID NOT NULL REFERENCES ${tables[root]}(id),
    reply_to UUID REFERENCES ${tables.comment}(id), body TEXT NOT NULL,
    contributor_email TEXT NOT NULL, contributor_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), hidden_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ${tables.comment}_${root}_idx ON ${tables.comment}(${key}, created_at);
CREATE TABLE IF NOT EXISTS ${tables.evidence} (
    id UUID PRIMARY KEY, ${key} UUID NOT NULL REFERENCES ${tables[root]}(id),
    initial BOOLEAN NOT NULL DEFAULT FALSE, title TEXT NOT NULL, reference TEXT NOT NULL, url TEXT,
    author TEXT NOT NULL DEFAULT '', publication_date TEXT NOT NULL DEFAULT '',
    supports TEXT NOT NULL, stance TEXT NOT NULL CHECK (stance IN ('supports','challenges','context')),
    contributor_email TEXT NOT NULL, contributor_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), hidden_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ${tables.evidence}_${root}_idx ON ${tables.evidence}(${key}, created_at);
CREATE TABLE IF NOT EXISTS ${revisions} (
    id UUID PRIMARY KEY, kind TEXT NOT NULL, target_id UUID NOT NULL, actor_email TEXT NOT NULL,
    previous JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS ${reports} (
    id UUID PRIMARY KEY, ${key} UUID NOT NULL REFERENCES ${tables[root]}(id),
    kind TEXT NOT NULL CHECK (kind IN ('${root}','comment','evidence')), target_id UUID NOT NULL, reporter_email TEXT NOT NULL,
    reason TEXT NOT NULL, details TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ${reports}_open_idx ON ${reports}(kind, target_id) WHERE resolved_at IS NULL;
CREATE TABLE IF NOT EXISTS ${audit} (
    id UUID PRIMARY KEY, report_id UUID NOT NULL REFERENCES ${reports}(id),
    action TEXT NOT NULL CHECK (action IN ('hide','dismiss')), note TEXT NOT NULL, actor_email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`;
}

const kiteFrom = `FROM knowledge_web_kites k JOIN knowledge_web_clouds a ON a.id=k.cloud_a
    LEFT JOIN knowledge_web_clouds b ON b.id=k.cloud_b`;
const visible = "k.hidden_at IS NULL AND a.published_at IS NOT NULL AND (k.cloud_b IS NULL OR b.published_at IS NOT NULL)";
const kiteFields = `k.id,k.cloud_a AS "cloudA",k.cloud_b AS "cloudB",a.title AS "titleA",b.title AS "titleB",k.argument`;
const attribution = `contributor_name AS contributor,created_at AS "createdAt",updated_at AS "updatedAt"`;
const evidenceFields = `id,initial,title,reference,url,author,publication_date AS "publicationDate",supports,stance`;
const commentFields = `c.id,c.body,c.reply_to AS "replyTo"`;
const connectionJoins = (join) => [["first", "a"], ["second", "b"]].map(([side, alias]) => `
    ${join} knowledge_web_connection_endpoints ${alias} ON ${alias}.id=COALESCE(k.${side}_cloud,k.${side}_kite,k.${side}_balloon)
        AND ${alias}.type=CASE WHEN k.${side}_cloud IS NOT NULL THEN 'cloud' WHEN k.${side}_kite IS NOT NULL THEN 'kite' ELSE 'balloon' END`).join("");
const connectionFrom = `FROM knowledge_web_connections k ${connectionJoins("JOIN")}`;
const connectionFields = `k.id,k.argument AS explanation,
    json_build_object('type',a.type,'id',a.id,'label',a.label) AS "first",
    json_build_object('type',b.type,'id',b.id,'label',b.label) AS "second"`;
const connectionVisible = "k.hidden_at IS NULL";
const balloonFrom = `FROM knowledge_web_balloons k JOIN knowledge_web_balloon_origins a
    ON a.id=COALESCE(k.origin_cloud,k.origin_kite) AND a.type=CASE WHEN k.origin_cloud IS NULL THEN 'kite' ELSE 'cloud' END`;
const balloonFields = `k.id,k.argument AS idea,k.principle,k.explanation,
    json_build_object('type',a.type,'id',a.id,'label',a.label) AS origin`;
const balloonVisible = "k.hidden_at IS NULL AND k.published_at IS NOT NULL";
const balloonSchema = `
CREATE TABLE IF NOT EXISTS knowledge_web_balloons (
    id UUID PRIMARY KEY, origin_cloud UUID REFERENCES knowledge_web_clouds(id), origin_kite UUID REFERENCES knowledge_web_kites(id),
    CHECK (num_nonnulls(origin_cloud,origin_kite)=1),
    argument TEXT NOT NULL, principle TEXT NOT NULL, explanation TEXT NOT NULL,
    contributor_email TEXT NOT NULL, contributor_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), hidden_at TIMESTAMPTZ
);`;
const connectionSchema = `
CREATE TABLE IF NOT EXISTS knowledge_web_connections (
    id UUID PRIMARY KEY,
    first_cloud UUID REFERENCES knowledge_web_clouds(id), first_kite UUID REFERENCES knowledge_web_kites(id),
    second_cloud UUID REFERENCES knowledge_web_clouds(id), second_kite UUID REFERENCES knowledge_web_kites(id),
    CONSTRAINT knowledge_web_connections_check CHECK (num_nonnulls(first_cloud,first_kite)=1 AND num_nonnulls(second_cloud,second_kite)=1),
    CHECK (first_cloud IS NULL OR second_cloud IS NULL OR first_cloud<>second_cloud),
    CHECK (first_kite IS NULL OR second_kite IS NULL OR first_kite<>second_kite),
    argument TEXT NOT NULL, contributor_email TEXT NOT NULL, contributor_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), hidden_at TIMESTAMPTZ
);
ALTER TABLE knowledge_web_connections
    ADD COLUMN IF NOT EXISTS first_balloon UUID REFERENCES knowledge_web_balloons(id),
    ADD COLUMN IF NOT EXISTS second_balloon UUID REFERENCES knowledge_web_balloons(id);
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='knowledge_web_connections'::regclass
        AND conname='knowledge_web_connections_endpoint_types') THEN
        ALTER TABLE knowledge_web_connections DROP CONSTRAINT IF EXISTS knowledge_web_connections_check,
            ADD CONSTRAINT knowledge_web_connections_endpoint_types CHECK (
                num_nonnulls(first_cloud,first_kite,first_balloon)=1 AND num_nonnulls(second_cloud,second_kite,second_balloon)=1
                AND (first_balloon IS NULL OR second_balloon IS NULL OR first_balloon<>second_balloon));
    END IF;
END $$;
CREATE OR REPLACE VIEW knowledge_web_balloon_origins AS
    SELECT 'cloud'::text AS type,id,title AS label FROM knowledge_web_clouds WHERE published_at IS NOT NULL
    UNION ALL SELECT 'kite',k.id,concat_ws(' / ',a.title,b.title) || ': ' || left(k.argument,105)
        ${kiteFrom} WHERE ${visible};
CREATE OR REPLACE VIEW knowledge_web_connection_endpoints AS
    SELECT type,id,label FROM knowledge_web_balloon_origins
    UNION ALL SELECT 'balloon',k.id,left(k.argument,105) ${balloonFrom} WHERE ${balloonVisible};`;
const contributionFamilies = [
    { ...families[0], from: kiteFrom, fields: kiteFields, visible },
    { ...families[1], from: connectionFrom, fields: connectionFields, visible: connectionVisible },
    { ...families[2], from: balloonFrom, fields: balloonFields, visible: balloonVisible }
];

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
    const nameFor = async (req, { email, staff }) => {
        const name = await getContributorName(req, email);
        return name && !name.includes("@") ? name : staff ? "DTECH teacher" : "DTECH student";
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

    async function addEvidence(db, table, parentKey, parentId, values, email, name, initial) {
        const id = randomUUID();
        await db.query(`INSERT INTO ${table}
            (id,${parentKey},title,reference,url,author,publication_date,supports,stance,contributor_email,contributor_name,initial)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [id, parentId, ...values, email, name, initial]);
        return id;
    }

    app.post(`${base}/kites`, handler(async (req, res, access) => {
        const { email, staff } = access;
        const anchored = Object.hasOwn(req.body || {}, "originCloudId");
        if (anchored && (req.body.cloudA != null || req.body.cloudB != null || req.body.proposalId != null)) {
            throw problem(400, "A new kite starts from just one published cloud.");
        }
        const [cloudA, cloudB] = anchored ? [uid(req.body.originCloudId), null]
            : [uid(req.body?.cloudA), uid(req.body?.cloudB)].sort();
        if (cloudA === cloudB) throw problem(400, "Select two different clouds.");
        const argument = text(req.body?.argument, anchored ? "Kite idea" : "Connection argument", 4000);
        const entries = anchored && req.body.evidence === undefined ? [] : req.body?.evidence;
        if (!Array.isArray(entries) || entries.length > 20 || (!anchored && !entries.length)) {
            throw problem(400, anchored ? "Add up to 20 pieces of supporting evidence." : "Add at least one piece of supporting evidence (up to 20).");
        }
        const sources = entries.map((entry) => evidence(entry, true));
        const proposalId = req.body.proposalId ? uid(req.body.proposalId) : null;
        if (proposalId && staff) throw problem(403, "Use Connect Clouds to publish a teacher kite.");
        const name = await nameFor(req, access);
        const id = randomUUID();
        await transaction(async (db) => {
            const cloudIds = anchored ? [cloudA] : [cloudA, cloudB];
            if ((await db.query("SELECT id FROM knowledge_web_clouds WHERE id=ANY($1::uuid[]) AND published_at IS NOT NULL",
                [cloudIds])).rowCount !== cloudIds.length) throw problem(404, anchored ? "Choose a published cloud." : "Choose two published clouds.");
            if (proposalId && !(await db.query(`SELECT id FROM knowledge_web_proposals WHERE id=$1 AND contributor_email=$2
                AND status='Approved' AND original_cloud_id=ANY($3::uuid[]) AND published_cloud_id=ANY($3::uuid[])`,
            [proposalId, email, [cloudA, cloudB]])).rowCount) throw problem(404, "This approved proposal is not available for these clouds.");
            if (!(await db.query(`INSERT INTO knowledge_web_kites
                (id,cloud_a,cloud_b,proposal_id,argument,contributor_email,contributor_name)
                VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (proposal_id) DO NOTHING`,
            [id, cloudA, cloudB, proposalId, argument, email, name])).rowCount) {
                throw problem(409, "A kite has already been published from this proposal.");
            }
            for (const values of sources) await addEvidence(db, families[0].tables.evidence, "kite_id", id, values, email, name, true);
        });
        res.status(201).json({ id });
    }));

    const balloonContent = (body) => [text(body?.idea, "Balloon idea", 4000), text(body?.principle, "Theoretical principle", 4000),
        text(body?.explanation, "Idea and principle explanation", 4000)];
    app.post(`${base}/balloons`, handler(async (req, res, access) => {
        const origin = req.body?.origin;
        if (!["cloud", "kite"].includes(origin?.type)) throw problem(400, "Choose an originating cloud or kite.");
        const originId = uid(origin.id), content = balloonContent(req.body);
        const entries = req.body.evidence === undefined ? [] : req.body.evidence;
        if (!Array.isArray(entries) || entries.length > 20) throw problem(400, "Add up to 20 pieces of supporting evidence.");
        const sources = entries.map((entry) => evidence(entry, true));
        const id = randomUUID(), name = await nameFor(req, access);
        await transaction(async (db) => {
            if (!(await db.query("SELECT id FROM knowledge_web_balloon_origins WHERE type=$1 AND id=$2", [origin.type, originId])).rowCount) {
                throw problem(404, "Choose an available originating cloud or kite.");
            }
            await db.query(`INSERT INTO knowledge_web_balloons
                (id,origin_cloud,origin_kite,argument,principle,explanation,contributor_email,contributor_name)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [id, origin.type === "cloud" ? originId : null, origin.type === "kite" ? originId : null, ...content, access.email, name]);
            for (const values of sources) await addEvidence(db, families[2].tables.evidence, "balloon_id", id, values, access.email, name, true);
        });
        res.status(201).json({ id });
    }));

    app.post(`${base}/connections`, handler(async (req, res, access) => {
        function endpoint(input) {
            if (!["cloud", "kite", "balloon"].includes(input?.type)) throw problem(400, "Choose a cloud, kite or balloon.");
            return { type: input.type, id: uid(input.id) };
        }
        const first = endpoint(req.body?.first), second = endpoint(req.body?.second);
        if (first.type === second.type && first.id === second.id) throw problem(400, "Choose two different items.");
        const explanation = text(req.body?.explanation, "Connection explanation", 4000);
        const entries = req.body.evidence === undefined ? [] : req.body.evidence;
        if (!Array.isArray(entries) || entries.length > 20) throw problem(400, "Add up to 20 pieces of supporting evidence.");
        const sources = entries.map((entry) => evidence(entry, true));
        const id = randomUUID(), name = await nameFor(req, access);
        await transaction(async (db) => {
            if ((await db.query(`SELECT id FROM knowledge_web_connection_endpoints
                WHERE (type,id) IN (($1,$2::uuid),($3,$4::uuid))`, [first.type, first.id, second.type, second.id])).rowCount !== 2) {
                throw problem(404, "Choose two available items.");
            }
            await db.query(`INSERT INTO knowledge_web_connections
                (id,first_cloud,first_kite,first_balloon,second_cloud,second_kite,second_balloon,argument,contributor_email,contributor_name)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [id, ...[first, second].flatMap((item) =>
                    ["cloud", "kite", "balloon"].map((type) => item.type === type ? item.id : null)), explanation, access.email, name]);
            for (const values of sources) await addEvidence(db, families[1].tables.evidence, "connection_id", id, values, access.email, name, true);
        });
        res.status(201).json({ id });
    }));

    for (const family of contributionFamilies) {
        registerFamily(family);
    }

    function registerFamily({ root, from, fields, visible: available, tables, reports, revisions, audit }) {
    const collection = `${base}/${root}s`, parentKey = `${root}_id`;
    const kindOf = (value) => {
        if (!Object.hasOwn(tables, value)) throw problem(400, "Choose a contribution to act on.");
        return value;
    };
    async function lockParent(db, id) {
        const parent = (await db.query(`SELECT k.* ${from} WHERE k.id=$1 AND ${available} FOR UPDATE OF k`, [id])).rows[0];
        if (!parent) throw problem(404, `This ${root} is not available.`);
        return parent;
    }
    async function target(db, parent, kind, id) {
        const row = kind === root ? (parent.id === id ? parent : null)
            : (await db.query(`SELECT * FROM ${tables[kind]} WHERE id=$1 AND ${parentKey}=$2 AND hidden_at IS NULL`, [id, parent.id])).rows[0];
        if (!row) throw problem(404, "This contribution is not available.");
        return row;
    }
    app.get(collection, handler(async (_req, res, { email }) => {
        const { rows } = await pool.query(`SELECT ${fields},k.contributor_name AS contributor,k.created_at AS "createdAt",
            k.updated_at AS "updatedAt",k.contributor_email=$1 AS mine ${from} WHERE ${available} ORDER BY k.created_at,k.id`, [email]);
        res.json({ [`${root}s`]: rows });
    }));
    app.get(`${collection}/:id`, handler(async (req, res, { email }) => {
        const id = uid(req.params.id);
        res.json(await transaction(async (db) => {
            await db.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
            const parent = (await db.query(`SELECT ${fields},k.contributor_name AS contributor,k.created_at AS "createdAt",
                k.updated_at AS "updatedAt",k.contributor_email=$2 AS mine ${from} WHERE k.id=$1 AND ${available}`, [id, email])).rows[0];
            if (!parent) throw problem(404, `This ${root} is not available.`);
            const comments = (await db.query(`SELECT ${commentFields},c.contributor_name AS contributor,
                c.created_at AS "createdAt",c.updated_at AS "updatedAt",c.contributor_email=$2 AS mine,
                parent.hidden_at IS NOT NULL AS "replyUnavailable" FROM ${tables.comment} c
                LEFT JOIN ${tables.comment} parent ON parent.id=c.reply_to
                WHERE c.${parentKey}=$1 AND c.hidden_at IS NULL ORDER BY c.created_at,c.id`, [id, email])).rows;
            const sources = (await db.query(`SELECT ${evidenceFields},${attribution},contributor_email=$2 AS mine
                FROM ${tables.evidence} WHERE ${parentKey}=$1 AND hidden_at IS NULL ORDER BY initial DESC,created_at,id`, [id, email])).rows;
            const result = { [root]: parent, comments, evidence: sources };
            if (root === "balloon") {
                result.connections = (await db.query(`SELECT ${connectionFields} ${connectionFrom}
                    WHERE ${connectionVisible} AND $1 IN (k.first_balloon,k.second_balloon) ORDER BY k.created_at,k.id`, [id])).rows;
            }
            return result;
        }));
    }));

    app.post(`${collection}/:id/comments`, handler(async (req, res, access) => {
        const { email } = access;
        const id = randomUUID();
        const body = text(req.body?.body, "Comment", 3000);
        const replyTo = req.body?.replyTo ? uid(req.body.replyTo) : null;
        const name = await nameFor(req, access);
        await transaction(async (db) => {
            const kite = await lockParent(db, uid(req.params.id));
            if (replyTo) await target(db, kite, "comment", replyTo);
            await db.query(`INSERT INTO ${tables.comment}
                (id,${parentKey},reply_to,body,contributor_email,contributor_name) VALUES ($1,$2,$3,$4,$5,$6)`,
            [id, kite.id, replyTo, body, email, name]);
        });
        res.status(201).json({ id });
    }));

    app.post(`${collection}/:id/evidence`, handler(async (req, res, access) => {
        const { email } = access;
        const values = evidence(req.body);
        const name = await nameFor(req, access);
        const id = await transaction(async (db) => {
            const kite = await lockParent(db, uid(req.params.id));
            return addEvidence(db, tables.evidence, parentKey, kite.id, values, email, name, false);
        });
        res.status(201).json({ id });
    }));

    app.put(`${collection}/:id/contributions/:kind/:target`, handler(async (req, res, { email }) => {
        const kind = kindOf(req.params.kind);
        const id = uid(req.params.target);
        await transaction(async (db) => {
            const kite = await lockParent(db, uid(req.params.id));
            const current = await target(db, kite, kind, id);
            if (current.contributor_email !== email) throw problem(403, "You can only edit your own contributions.");
            const fields = kind === root ? (root === "balloon" ? ["argument", "principle", "explanation"] : ["argument"]) : kind === "comment" ? ["body"]
                : ["title", "reference", "url", "author", "publication_date", "supports", "stance"];
            const values = kind === root ? (root === "balloon" ? balloonContent(req.body) : [text(root === "connection" ? req.body?.explanation : req.body?.argument,
                root === "connection" ? "Connection explanation" : kite.cloud_b ? "Connection argument" : "Kite idea", 4000)])
                : kind === "comment" ? [text(req.body?.body, "Comment", 3000)] : evidence(req.body, current.initial);
            if (fields.every((field, index) => current[field] === values[index])) return;
            await db.query(`INSERT INTO ${revisions} (id,kind,target_id,actor_email,previous)
                VALUES ($1,$2,$3,$4,$5)`, [randomUUID(), kind, id, email, JSON.stringify(current)]);
            await db.query(`UPDATE ${tables[kind]} SET ${fields.map((field, i) => `${field}=$${i + 2}`).join(",")},
                updated_at=NOW() WHERE id=$1`, [id, ...values]);
        });
        res.json({ id });
    }));

    app.post(`${collection}/:id/reports`, handler(async (req, res, { email }) => {
        const kind = kindOf(req.body?.kind);
        const targetId = uid(req.body?.targetId);
        const reason = req.body?.reason;
        if (!["harassment", "personal-information", "spam", "disruption", "other"].includes(reason)) {
            throw problem(400, "Choose a reason for reporting this behaviour.");
        }
        const details = text(req.body?.details ?? "", "Report details", 1000, reason === "other");
        const result = await transaction(async (db) => {
            const kite = await lockParent(db, uid(req.params.id));
            await target(db, kite, kind, targetId);
            const open = (await db.query(`SELECT id,reporter_email FROM ${reports}
                WHERE kind=$1 AND target_id=$2 AND resolved_at IS NULL`, [kind, targetId])).rows;
            const own = open.find((row) => row.reporter_email === email);
            if (own) return { id: own.id, notify: false };
            const id = randomUUID();
            await db.query(`INSERT INTO ${reports} (id,${parentKey},kind,target_id,reporter_email,reason,details)
                VALUES ($1,$2,$3,$4,$5,$6,$7)`, [id, kite.id, kind, targetId, email, reason, details]);
            return { id, notify: !open.length };
        });
        if (result.notify && notifyReport) {
            try { await notifyReport(); }
            catch (error) { console.error("[knowledge-web] Could not notify staff of a report:", error.message); }
        }
        res.status(201).json({ id: result.id });
    }, student));

    const reportPath = root === "kite" ? "reports" : `${root}-reports`;
    app.post(`${base}/manage/${reportPath}/:id`, handler(async (req, res, { email }) => {
        const id = uid(req.params.id);
        const action = req.body?.action;
        if (!["hide", "dismiss"].includes(action)) throw problem(400, "Choose hide or dismiss.");
        const note = text(req.body?.note ?? "", "Moderation note", 1000);
        await transaction(async (db) => {
            const report = (await db.query(`SELECT * FROM ${reports} WHERE id=$1`, [id])).rows[0];
            if (!report) throw problem(404, "Report not found.");
            await db.query(`SELECT id FROM ${tables[root]} WHERE id=$1 FOR UPDATE`, [report[parentKey]]);
            if (!(await db.query(`SELECT id FROM ${reports} WHERE id=$1 AND resolved_at IS NULL`, [id])).rowCount) {
                throw problem(409, "This report has already been resolved.");
            }
            if (action === "hide") {
                await db.query(`UPDATE ${tables[kindOf(report.kind)]} SET hidden_at=NOW() WHERE id=$1 AND hidden_at IS NULL`, [report.target_id]);
                await db.query(`UPDATE ${reports} SET resolved_at=NOW() WHERE resolved_at IS NULL
                    AND ((kind=$1 AND target_id=$2) OR ($3::boolean AND ${parentKey}=$4))`,
                [report.kind, report.target_id, report.kind === root, report[parentKey]]);
            } else {
                await db.query(`UPDATE ${reports} SET resolved_at=NOW() WHERE id=$1`, [id]);
            }
            await db.query(`INSERT INTO ${audit} (id,report_id,action,note,actor_email)
                VALUES ($1,$2,$3,$4,$5)`, [randomUUID(), id, action, note, email]);
        });
        res.json({ action });
    }, teacher));
    }

    function historySql({ root, from, visible, tables }) {
        const key = `${root}_id`;
        return `SELECT k.id,k.id AS "subjectId",'${root}' AS subject,'${root}' AS kind,k.argument AS summary,
            k.created_at AS "createdAt",k.updated_at AS "updatedAt" ${from} WHERE ${visible} AND k.contributor_email=$1
            UNION ALL SELECT c.id,k.id,'${root}','comment',c.body,c.created_at,c.updated_at
            ${from} JOIN ${tables.comment} c ON c.${key}=k.id WHERE ${visible} AND c.hidden_at IS NULL AND c.contributor_email=$1
            UNION ALL SELECT e.id,k.id,'${root}','evidence',e.title,e.created_at,e.updated_at
            ${from} JOIN ${tables.evidence} e ON e.${key}=k.id WHERE ${visible} AND e.hidden_at IS NULL AND e.contributor_email=$1`;
    }
    app.get(`${base}/contributions`, handler(async (_req, res, { email }) => {
        const { rows } = await pool.query(`${contributionFamilies.map(historySql).join(" UNION ALL ")} ORDER BY "updatedAt" DESC,id`, [email]);
        const { rows: converted } = await pool.query("SELECT proposal_id AS id FROM knowledge_web_kites WHERE contributor_email=$1 AND proposal_id IS NOT NULL", [email]);
        res.json({ contributions: rows.map((row) => row.subject === "kite" ? { ...row, kiteId: row.subjectId } : row),
            convertedProposalIds: converted.map(({ id }) => id) });
    }));

    app.get(`${base}/manage/reports`, handler(async (_req, res) => {
        const queries = families.map(({ root, tables, reports }) => {
            const key = `${root}_id`;
            const isKite = root === "kite";
            return `SELECT r.id,k.id AS "subjectId",'${root}' AS subject,r.target_id AS "targetId",r.kind,
                r.reason,r.details,r.created_at AS "createdAt",${isKite ? "a.title" : "COALESCE(a.label,'Unavailable item')"} AS "titleA",
                ${isKite ? "b.title" : root === "balloon" ? "NULL::text" : "COALESCE(b.label,'Unavailable item')"} AS "titleB",
                CASE r.kind WHEN 'comment' THEN c.body WHEN 'evidence' THEN concat_ws(' — ',e.title,e.supports,e.reference)
                    ELSE ${root === "balloon" ? "concat_ws(' / ',k.argument,k.principle,k.explanation)" : "k.argument"} END AS content,COALESCE(c.contributor_name,e.contributor_name,k.contributor_name) AS contributor
                FROM ${reports} r JOIN ${tables[root]} k ON k.id=r.${key}
                ${isKite ? `JOIN knowledge_web_clouds a ON a.id=k.cloud_a LEFT JOIN knowledge_web_clouds b ON b.id=k.cloud_b` :
                root === "balloon" ? `LEFT JOIN knowledge_web_balloon_origins a ON a.id=COALESCE(k.origin_cloud,k.origin_kite)
                    AND a.type=CASE WHEN k.origin_cloud IS NULL THEN 'kite' ELSE 'cloud' END` : connectionJoins("LEFT JOIN")}
                LEFT JOIN ${tables.comment} c ON r.kind='comment' AND c.id=r.target_id
                LEFT JOIN ${tables.evidence} e ON r.kind='evidence' AND e.id=r.target_id
                WHERE r.resolved_at IS NULL`;
        });
        const { rows } = await pool.query(`${queries.join(" UNION ALL ")} ORDER BY "createdAt",id`);
        res.json({ reports: rows });
    }, teacher));
}

module.exports = { registerContributions, schema: kiteSchema + balloonSchema + connectionSchema + families.map(childSchema).join("") };
