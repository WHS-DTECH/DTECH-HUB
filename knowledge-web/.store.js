"use strict";

const { randomUUID } = require("node:crypto");
const { getSourceMetadata } = require("./.source-metadata");

const FIRST_CLOUD = "77b0456a-d3f0-4a2d-a045-6690868331b3";
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

function problem(status, message) {
    return Object.assign(new Error(message), { status });
}

function text(value, field, limit, required = true) {
    if (typeof value !== "string" || value.trim().length > limit || (required && !value.trim())) {
        throw problem(400, `${field} ${required ? "is required and" : ""} must be no more than ${limit} characters.`.replace(/ {2,}/g, " "));
    }
    return value.trim();
}

function date(value, field) {
    let when = text(value ?? "", field, 10, false);
    if (!when) return "";
    const localDay = when.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    const localMonth = when.match(/^(\d{2})-(\d{4})$/);
    if (localDay) when = `${localDay[3]}-${localDay[2]}-${localDay[1]}`;
    else if (localMonth) when = `${localMonth[2]}-${localMonth[1]}`;
    const day = when.length === 7 ? `${when}-01` : when;
    const parsed = new Date(day);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== day) {
        throw problem(400, `${field} must be a real date in MM-YYYY or DD-MM-YYYY format.`);
    }
    return when;
}

function readCloud(body) {
    if (!Array.isArray(body?.sources) || body.sources.length > 20 || !Array.isArray(body.events) || body.events.length > 20) {
        throw problem(400, "Provide up to 20 sources and 20 dated events.");
    }
    const sources = body.sources.map((source) => {
        const reference = text(source?.reference, "Source URL or reference", 2048);
        const link = /^https?:\/\//i.test(reference) ? URL.parse(reference) : null;
        if ((/^https?:/i.test(reference) && (!link || link.username || link.password))
            || (/^[a-z][a-z0-9+.-]*:\/\//i.test(reference) && !link)) {
            throw problem(400, "Use a public HTTP(S) URL or a written reference for each source.");
        }
        return {
            id: source.id || randomUUID(), title: text(source.title, "Source title", 200),
            author: text(source.author, "Source author or organisation", 200),
            publicationDate: date(source?.publicationDate, "Publication date"),
            reference, url: link?.href || null, supports: text(source.supports, "What this source supports", 1000)
        };
    });
    if (sources.some(({ id }) => typeof id !== "string" || !UUID.test(id)) || new Set(sources.map(({ id }) => id.toLowerCase())).size !== sources.length) {
        throw problem(400, "Source identifiers must be valid and distinct.");
    }
    const events = body.events.map((event) => {
        const when = date(event?.date, "Event date");
        if (!when) throw problem(400, "Each event needs a date.");
        return { date: when, description: text(event.description, "Event description", 500) };
    });
    const { x, y } = body.position || {};
    if (![x, y].every((n) => Number.isInteger(n) && n >= 0 && n <= 3000)) throw problem(400, "Cloud coordinates must be whole numbers from 0 to 3000.");
    if (typeof body.publish !== "boolean") throw problem(400, "Choose whether to save or publish.");
    return {
        title: text(body.title, "Cloud title", 120), description: text(body.description, "Description", 2000),
        significance: text(body.significance, "Historical significance", 2000), sources, events,
        x, y, publish: body.publish, revision: body.revision
    };
}

function readSources(values, required, allowIncomplete = false) {
    if (!Array.isArray(values) || values.length > 20) throw problem(400, "Provide up to 20 sources.");
    const sources = values.map((source) => {
        const reference = text(source?.reference || "", "Source URL or reference", 2048, !allowIncomplete);
        const link = /^https?:\/\//i.test(reference) ? URL.parse(reference) : null;
        if ((/^https?:/i.test(reference) && (!link || link.username || link.password))
            || (/^[a-z][a-z0-9+.-]*:\/\//i.test(reference) && !link)) {
            throw problem(400, "Use a public HTTP(S) URL or a written reference for each source.");
        }
        return {
            id: source?.id || randomUUID(), title: text(source?.title || "", "Source title", 200, !allowIncomplete),
            author: text(source?.author || "", "Source author or organisation", 200, !allowIncomplete),
            publicationDate: date(source.publicationDate, "Publication date"),
            reference, url: link?.href || null,
            supports: text(source?.supports || "", "What this source supports", 1000, !allowIncomplete)
        };
    });
    if (sources.some(({ id }) => typeof id !== "string" || !UUID.test(id))
        || new Set(sources.map(({ id }) => id.toLowerCase())).size !== sources.length) {
        throw problem(400, "Source identifiers must be valid and distinct.");
    }
    if (required && !sources.length) throw problem(400, "Add at least one source before submitting this proposal.");
    return sources;
}

function readProposal(body, allowIncomplete) {
    const title = text(body?.title || "", "Cloud title", 120, !allowIncomplete);
    const description = text(body?.description || "", "Description", 2000, !allowIncomplete);
    const significance = text(body?.significance || "", "Historical significance", 2000, !allowIncomplete);
    const connection = text(body?.connection || "", "Connection explanation", 2000, !allowIncomplete);
    const sources = readSources(body?.sources || [], !allowIncomplete, allowIncomplete);
    const connectionSources = readSources(body?.connectionSources || [], !allowIncomplete, allowIncomplete);
    if (new Set([...sources, ...connectionSources].map(({ id }) => id.toLowerCase())).size !== sources.length + connectionSources.length) {
        throw problem(400, "Each historical and connection source must have a unique identifier.");
    }
    if (!allowIncomplete && !connectionSources.length) {
        throw problem(400, "Add at least one source supporting the proposed connection before submitting.");
    }
    if (body?.events !== undefined && !Array.isArray(body.events)) throw problem(400, "Dated events must be a list.");
    const events = (body?.events || []).map((event) => {
        const when = date(event?.date, "Event date");
        if (!when && !allowIncomplete) throw problem(400, "Each dated event needs a date.");
        return { date: when, description: text(event?.description || "", "Event description", 500, !allowIncomplete) };
    });
    if (events.length > 20) throw problem(400, "Provide up to 20 dated events.");
    const originalCloudId = String(body?.originalCloudId || "");
    if (!UUID.test(originalCloudId)) throw problem(400, "Select a published cloud for the proposed connection.");
    const revision = body?.revision;
    if (revision !== undefined && (!Number.isSafeInteger(revision) || revision < 1)) {
        throw problem(400, "Proposal revision must be a positive whole number.");
    }
    return { title, description, significance, connection, sources, connectionSources, events, originalCloudId, revision };
}

function normalizeTitle(value) {
    return String(value || "").normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function titleSimilarity(first, second) {
    const left = ` ${normalizeTitle(first)} `;
    const right = ` ${normalizeTitle(second)} `;
    if (left === "  " || right === "  ") return 0;
    if (left.includes(right.trim()) || right.includes(left.trim())) return 1;
    const bigrams = (value) => new Set(Array.from({ length: Math.max(0, value.length - 1) },
        (_unused, index) => value.slice(index, index + 2)));
    const a = bigrams(left), b = bigrams(right);
    return 2 * [...a].filter((part) => b.has(part)).length / (a.size + b.size || 1);
}

function registerKnowledgeWeb(app, { pool, getVerifiedEmail, canManage, getStudentProfile, getContributorName }) {
    const base = "/api/knowledge-web";
    let schema;

    async function transaction(operation) {
        const db = await pool.connect();
        try {
            await db.query("BEGIN");
            const result = await operation(db);
            await db.query("COMMIT");
            return result;
        } catch (error) {
            await db.query("ROLLBACK");
            throw error;
        } finally {
            db.release();
        }
    }

    function ensureSchema() {
        return schema ??= transaction(async (db) => {
            await db.query("SELECT pg_advisory_xact_lock(hashtext('dtech-knowledge-web-schema'))");
            await db.query(`CREATE TABLE IF NOT EXISTS knowledge_web_clouds (
                id UUID PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, significance TEXT NOT NULL,
                events JSONB NOT NULL DEFAULT '[]', contributor_email TEXT, contributor_name TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                published_at TIMESTAMPTZ, revision INTEGER NOT NULL DEFAULT 1
            );
            CREATE TABLE IF NOT EXISTS knowledge_web_positions (
                cloud_id UUID PRIMARY KEY REFERENCES knowledge_web_clouds(id) ON DELETE CASCADE,
                x INTEGER NOT NULL CHECK (x BETWEEN 0 AND 3000), y INTEGER NOT NULL CHECK (y BETWEEN 0 AND 3000),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS knowledge_web_sources (
                id UUID PRIMARY KEY, cloud_id UUID NOT NULL REFERENCES knowledge_web_clouds(id) ON DELETE CASCADE,
                title TEXT NOT NULL, author TEXT NOT NULL, publication_date TEXT NOT NULL,
                reference TEXT NOT NULL, url TEXT, supports TEXT NOT NULL,
                ordinal INTEGER NOT NULL, added_by TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS knowledge_web_sources_cloud_idx ON knowledge_web_sources(cloud_id);`);
            await db.query(`CREATE TABLE IF NOT EXISTS knowledge_web_proposals (
                id UUID PRIMARY KEY, contributor_email TEXT NOT NULL, contributor_name TEXT NOT NULL,
                title TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', significance TEXT NOT NULL DEFAULT '',
                events JSONB NOT NULL DEFAULT '[]', status TEXT NOT NULL CHECK (status IN
                    ('Draft','Submitted','Returned for Revision','Approved','Declined')),
                teacher_comment TEXT NOT NULL DEFAULT '', revision INTEGER NOT NULL DEFAULT 1,
                original_cloud_id UUID NOT NULL REFERENCES knowledge_web_clouds(id),
                connection_explanation TEXT NOT NULL DEFAULT '',
                published_cloud_id UUID REFERENCES knowledge_web_clouds(id),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                submitted_at TIMESTAMPTZ, decided_at TIMESTAMPTZ
            );
            CREATE INDEX IF NOT EXISTS knowledge_web_proposals_owner_idx
                ON knowledge_web_proposals(contributor_email, updated_at DESC);
            CREATE INDEX IF NOT EXISTS knowledge_web_proposals_status_idx
                ON knowledge_web_proposals(status, submitted_at);
            CREATE TABLE IF NOT EXISTS knowledge_web_proposal_sources (
                id UUID PRIMARY KEY, proposal_id UUID NOT NULL REFERENCES knowledge_web_proposals(id) ON DELETE CASCADE,
                claim TEXT NOT NULL CHECK (claim IN ('cloud','connection')), title TEXT NOT NULL, author TEXT NOT NULL,
                publication_date TEXT NOT NULL, reference TEXT NOT NULL, url TEXT, supports TEXT NOT NULL,
                ordinal INTEGER NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS knowledge_web_proposal_sources_parent_idx
                ON knowledge_web_proposal_sources(proposal_id, claim, ordinal);
            CREATE TABLE IF NOT EXISTS knowledge_web_proposal_events (
                id UUID PRIMARY KEY, proposal_id UUID NOT NULL REFERENCES knowledge_web_proposals(id),
                action TEXT NOT NULL, actor_email TEXT NOT NULL, actor_name TEXT NOT NULL,
                comment TEXT NOT NULL DEFAULT '', snapshot JSONB NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );`);
            const seeded = await db.query(`INSERT INTO knowledge_web_clouds (id, title, description, significance, events, contributor_name)
                VALUES ($1, $2, $3, $4, $5, 'DTECH teaching team') ON CONFLICT (id) DO NOTHING RETURNING id`, [
                FIRST_CLOUD, "2026 NCEA Digital Examination Disruptions",
                "During the November 2026 NCEA examination period, students experienced disruptions to digital examinations, including the Level 2 English examination. The incidents raised questions about the reliability of digital examination systems and the consequences of technical failures during high-stakes assessments.",
                "A contemporary New Zealand example of digital infrastructure affecting students and the education system.",
                JSON.stringify([{ date: "2026-11", description: "NCEA digital examination disruptions reported during the November examination period." }])
            ]);
            if (seeded.rowCount) await db.query("INSERT INTO knowledge_web_positions (cloud_id, x, y) VALUES ($1, 48, 80)", [FIRST_CLOUD]);
        }).catch((error) => { schema = null; throw error; });
    }

    async function listClouds(includeDrafts) {
        await ensureSchema();
        const { rows } = await pool.query(`SELECT c.id, c.title, c.description, c.significance, c.events,
            c.contributor_name AS contributor, c.created_at AS "createdAt", c.updated_at AS "updatedAt",
            c.published_at AS "publishedAt", c.revision, jsonb_build_object('x', p.x, 'y', p.y) AS position,
            COALESCE((SELECT jsonb_agg(jsonb_build_object(
                'id', s.id, 'title', s.title, 'author', s.author, 'publicationDate', s.publication_date,
                'reference', s.reference, 'url', s.url, 'supports', s.supports, 'addedAt', s.created_at
            ) ORDER BY s.ordinal) FROM knowledge_web_sources s WHERE s.cloud_id = c.id), '[]'::jsonb) AS sources
            FROM knowledge_web_clouds c JOIN knowledge_web_positions p ON p.cloud_id = c.id
            WHERE $1::boolean OR c.published_at IS NOT NULL ORDER BY LOWER(c.title), c.id`, [includeDrafts]);
        return rows;
    }

    async function saveCloud(id, input, email, contributor) {
        await ensureSchema();
        return transaction(async (db) => {
            let existing;
            if (id) {
                existing = (await db.query("SELECT revision, published_at FROM knowledge_web_clouds WHERE id = $1 FOR UPDATE", [id])).rows[0];
                if (!existing) throw problem(404, "Cloud not found.");
                if (existing.revision !== input.revision) throw problem(409, "This cloud changed. Reload before editing it again.");
            }
            if ((input.publish || existing?.published_at) && !input.sources.length) {
                throw problem(400, "A published cloud needs at least one source and an explanation of what it supports.");
            }
            const values = [id || randomUUID(), input.title, input.description, input.significance, JSON.stringify(input.events), input.publish];
            const cloudId = values[0];
            if (existing) {
                await db.query(`UPDATE knowledge_web_clouds SET title=$2, description=$3, significance=$4, events=$5,
                    published_at=COALESCE(published_at, CASE WHEN $6 THEN NOW() END), updated_at=NOW(),
                    revision=revision+1 WHERE id=$1`, values);
            } else {
                await db.query(`INSERT INTO knowledge_web_clouds (id, title, description, significance, events, published_at, contributor_email, contributor_name)
                    VALUES ($1,$2,$3,$4,$5,CASE WHEN $6 THEN NOW() END,$7,$8)`, [...values, email, contributor]);
            }
            await db.query(`INSERT INTO knowledge_web_positions (cloud_id, x, y) VALUES ($1,$2,$3)
                ON CONFLICT (cloud_id) DO UPDATE SET x=EXCLUDED.x, y=EXCLUDED.y, updated_at=NOW()`, [cloudId, input.x, input.y]);
            await db.query("DELETE FROM knowledge_web_sources WHERE cloud_id=$1 AND NOT (id = ANY($2::uuid[]))",
                [cloudId, input.sources.map((source) => source.id)]);
            for (const [ordinal, s] of input.sources.entries()) {
                const result = await db.query(`INSERT INTO knowledge_web_sources
                    (id,cloud_id,title,author,publication_date,reference,url,supports,ordinal,added_by)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO UPDATE SET
                    title=EXCLUDED.title, author=EXCLUDED.author, publication_date=EXCLUDED.publication_date,
                    reference=EXCLUDED.reference, url=EXCLUDED.url, supports=EXCLUDED.supports,
                    ordinal=EXCLUDED.ordinal, updated_at=NOW() WHERE knowledge_web_sources.cloud_id=EXCLUDED.cloud_id`,
                [s.id, cloudId, s.title, s.author, s.publicationDate, s.reference, s.url, s.supports, ordinal, email]);
                if (!result.rowCount) throw problem(400, "A source belongs to a different cloud.");
            }
            return cloudId;
        });
    }

    async function readProposals({ id, ownerEmail, includeDrafts = false, includePrivateComment = false } = {}) {
        await ensureSchema();
        const { rows } = await pool.query(`SELECT p.id, p.contributor_email AS "contributorEmail",
            p.contributor_name AS contributor, p.title, p.description, p.significance, p.events, p.status,
            p.teacher_comment AS "teacherComment", p.revision, p.original_cloud_id AS "originalCloudId",
            parent.title AS "originalCloudTitle", p.connection_explanation AS connection,
            p.created_at AS "createdAt", p.updated_at AS "updatedAt", p.submitted_at AS "submittedAt",
            p.decided_at AS "decidedAt", p.published_cloud_id AS "publishedCloudId",
            COALESCE(s.cloud_sources, '[]'::jsonb) AS sources,
            COALESCE(s.connection_sources, '[]'::jsonb) AS "connectionSources"
            FROM knowledge_web_proposals p
            JOIN knowledge_web_clouds parent ON parent.id=p.original_cloud_id
            LEFT JOIN LATERAL (
                SELECT jsonb_agg(jsonb_build_object('id',src.id,'title',src.title,'author',src.author,
                    'publicationDate',src.publication_date,'reference',src.reference,'url',src.url,
                    'supports',src.supports,'addedAt',src.created_at) ORDER BY src.ordinal)
                    FILTER (WHERE src.claim='cloud') AS cloud_sources,
                    jsonb_agg(jsonb_build_object('id',src.id,'title',src.title,'author',src.author,
                    'publicationDate',src.publication_date,'reference',src.reference,'url',src.url,
                    'supports',src.supports,'addedAt',src.created_at) ORDER BY src.ordinal)
                    FILTER (WHERE src.claim='connection') AS connection_sources
                FROM knowledge_web_proposal_sources src WHERE src.proposal_id=p.id
            ) s ON true
            WHERE ($1::uuid IS NULL OR p.id=$1::uuid) AND ($2::text IS NULL OR p.contributor_email=$2)
                AND ($3::boolean OR p.status<>'Draft')
            ORDER BY p.updated_at DESC,p.id`, [id || null, ownerEmail || null, includeDrafts]);
        return rows.map(({ contributorEmail, teacherComment, ...proposal }) => ({
            ...proposal,
            ...(ownerEmail ? {} : { contributorEmail }),
            ...(includePrivateComment ? { teacherComment } : {})
        }));
    }

    async function auditProposal(db, proposal, action, actorEmail, actorName, comment = "") {
        const snapshot = {
            id: proposal.id, title: proposal.title, description: proposal.description, significance: proposal.significance,
            events: proposal.events, status: proposal.status, originalCloudId: proposal.original_cloud_id || proposal.originalCloudId,
            connection: proposal.connection_explanation || proposal.connection, sources: proposal.sources || [],
            connectionSources: proposal.connection_sources || proposal.connectionSources || [],
            publishedCloudId: proposal.published_cloud_id || null
        };
        await db.query(`INSERT INTO knowledge_web_proposal_events
            (id,proposal_id,action,actor_email,actor_name,comment,snapshot)
            VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
        [randomUUID(), proposal.id, action, actorEmail, actorName, comment, JSON.stringify(snapshot)]);
    }

    async function replaceProposalSources(db, proposalId, claim, sources) {
        await db.query("DELETE FROM knowledge_web_proposal_sources WHERE proposal_id=$1 AND claim=$2", [proposalId, claim]);
        for (const [ordinal, source] of sources.entries()) {
            await db.query(`INSERT INTO knowledge_web_proposal_sources
                (id,proposal_id,claim,title,author,publication_date,reference,url,supports,ordinal)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [source.id, proposalId, claim, source.title, source.author, source.publicationDate,
                source.reference, source.url, source.supports, ordinal]);
        }
    }

    async function ownProposalSourceIds(db, proposalId, sources) {
        const existing = new Set((await db.query("SELECT id FROM knowledge_web_proposal_sources WHERE proposal_id=$1", [proposalId]))
            .rows.map(({ id }) => String(id).toLowerCase()));
        return sources.map((source) => ({
            ...source,
            id: source.id && existing.has(source.id.toLowerCase()) ? source.id : randomUUID()
        }));
    }

    function proposalIdFrom(req) {
        if (!UUID.test(String(req.params.id || ""))) throw problem(404, "Proposal not found.");
        return req.params.id;
    }

    async function findDuplicates(title, email, excludeId) {
        const normalized = normalizeTitle(title);
        if (!normalized) return [];
        await ensureSchema();
        const { rows } = await pool.query(`SELECT id,title,NULL::text AS status,'cloud' AS kind FROM knowledge_web_clouds
            WHERE published_at IS NOT NULL
            UNION ALL
            SELECT id,title,status,'proposal' AS kind FROM knowledge_web_proposals
            WHERE contributor_email=$1 AND status IN ('Draft','Submitted','Returned for Revision')
                AND ($2::uuid IS NULL OR id<>$2::uuid)`,
        [email, excludeId || null]);
        return rows.map((row) => ({ ...row, similarity: titleSimilarity(normalized, row.title) }))
            .filter((row) => row.similarity >= 0.48)
            .sort((a, b) => b.similarity - a.similarity || a.title.localeCompare(b.title))
            .slice(0, 10);
    }

    async function saveProposal(req, res, { email, staff }, existingId = null) {
        if (staff) throw problem(403, "Student cloud proposals are available to Years 9 and 10 only.");
        const intent = req.body?.intent;
        if (!["draft", "submit"].includes(intent)) throw problem(400, "Choose save draft or submit for review.");
        const input = readProposal(req.body, intent === "draft");
        const submittedDuplicates = intent === "submit" ? await findDuplicates(input.title, email, existingId) : [];
        if (submittedDuplicates.length && req.body?.duplicatesAcknowledged !== true) {
            return res.status(409).json({ error: "Possible matching clouds found. Check the warning before submitting.",
                duplicates: submittedDuplicates });
        }

        const result = await transaction(async (db) => {
            await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`knowledge-web-proposal:${email}`]);
            const parent = (await db.query("SELECT id,title FROM knowledge_web_clouds WHERE id=$1 AND published_at IS NOT NULL",
                [input.originalCloudId])).rows[0];
            if (!parent) throw problem(404, "Choose a published cloud for the proposed connection.");
            let proposal;
            if (existingId) {
                proposal = (await db.query(`SELECT * FROM knowledge_web_proposals WHERE id=$1 FOR UPDATE`, [existingId])).rows[0];
                if (!proposal || proposal.contributor_email !== email) throw problem(404, "Proposal not found.");
                if (proposal.revision !== input.revision) throw problem(409, "This proposal changed. Reload your proposals before editing again.");
                if (!["Draft", "Returned for Revision"].includes(proposal.status)) {
                    throw problem(409, "Only a draft or returned proposal can be edited. Submitted proposals are read-only.");
                }
                const status = intent === "submit" ? "Submitted" : "Draft";
                await db.query(`UPDATE knowledge_web_proposals SET title=$2,description=$3,significance=$4,events=$5,
                    original_cloud_id=$6,connection_explanation=$7,status=$8,teacher_comment='',revision=revision+1,
                    updated_at=NOW(),submitted_at=CASE WHEN $8='Submitted' THEN NOW() ELSE submitted_at END,
                    decided_at=NULL WHERE id=$1`,
                [existingId, input.title, input.description, input.significance, JSON.stringify(input.events),
                    parent.id, input.connection, status]);
                const cloudSources = await ownProposalSourceIds(db, existingId, input.sources);
                const connectionSources = await ownProposalSourceIds(db, existingId, input.connectionSources);
                proposal = { ...proposal, title: input.title, description: input.description,
                    significance: input.significance, events: input.events, status,
                    original_cloud_id: parent.id, connection_explanation: input.connection,
                    sources: cloudSources, connection_sources: connectionSources };
                await replaceProposalSources(db, existingId, "cloud", cloudSources);
                await replaceProposalSources(db, existingId, "connection", connectionSources);
            } else {
                const id = randomUUID();
                const status = intent === "submit" ? "Submitted" : "Draft";
                const contributorName = await getContributorName(req, email);
                const contributor = contributorName && !contributorName.includes("@") ? contributorName : "Year 9–10 student";
                await db.query(`INSERT INTO knowledge_web_proposals
                    (id,contributor_email,contributor_name,title,description,significance,events,status,original_cloud_id,connection_explanation,submitted_at)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CASE WHEN $8='Submitted' THEN NOW() END)`,
                [id, email, contributor, input.title, input.description, input.significance,
                    JSON.stringify(input.events), status, parent.id, input.connection]);
                const cloudSources = input.sources.map((source) => ({ ...source, id: randomUUID() }));
                const connectionSources = input.connectionSources.map((source) => ({ ...source, id: randomUUID() }));
                proposal = { id, title: input.title, description: input.description, significance: input.significance,
                    events: input.events, status, original_cloud_id: parent.id, connection_explanation: input.connection,
                    sources: cloudSources, connection_sources: connectionSources };
                await replaceProposalSources(db, id, "cloud", cloudSources);
                await replaceProposalSources(db, id, "connection", connectionSources);
            }
            await auditProposal(db, proposal, intent === "submit" ? "Submitted" : "Draft saved", email,
                proposal.contributor_name || await getContributorName(req, email));
            return { id: proposal.id, status: proposal.status };
        });
        res.status(existingId ? 200 : 201).json(result);
    }

    async function decideProposal(req, res, { email }) {
        const id = proposalIdFrom(req);
        const action = req.body?.action;
        if (!["approve", "return", "decline"].includes(action)) throw problem(400, "Choose approve, return for revision, or decline.");
        const comment = action === "approve" ? text(req.body?.comment || "", "Optional teacher comment", 1000, false)
            : text(req.body?.comment || "", "Teacher comment or reason", 1000);
        const teacherName = await getContributorName(req, email);
        const outcome = await transaction(async (db) => {
            const proposal = (await db.query(`SELECT * FROM knowledge_web_proposals WHERE id=$1 FOR UPDATE`, [id])).rows[0];
            if (!proposal || proposal.status !== "Submitted") throw problem(409, "Only submitted proposals can be reviewed.");
            const cloudSources = (await db.query(`SELECT * FROM knowledge_web_proposal_sources
                WHERE proposal_id=$1 AND claim='cloud' ORDER BY ordinal`, [id])).rows;
            const connectionSources = (await db.query(`SELECT * FROM knowledge_web_proposal_sources
                WHERE proposal_id=$1 AND claim='connection' ORDER BY ordinal`, [id])).rows;
            const status = action === "approve" ? "Approved" : action === "return" ? "Returned for Revision" : "Declined";
            let cloudId = null;
            if (action === "approve") {
                if (!cloudSources.length || !connectionSources.length || !proposal.connection_explanation.trim()) {
                    throw problem(409, "This proposal is missing historical sources or connection evidence.");
                }
                cloudId = randomUUID();
                const parentPosition = (await db.query("SELECT x,y FROM knowledge_web_positions WHERE cloud_id=$1",
                    [proposal.original_cloud_id])).rows[0];
                const x = Math.min(2810, Number(parentPosition?.x || 48) + 230);
                const y = Math.min(2870, Number(parentPosition?.y || 80));
                await db.query(`INSERT INTO knowledge_web_clouds
                    (id,title,description,significance,events,contributor_email,contributor_name,published_at)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
                [cloudId, proposal.title, proposal.description, proposal.significance, JSON.stringify(proposal.events),
                    proposal.contributor_email, proposal.contributor_name]);
                await db.query("INSERT INTO knowledge_web_positions (cloud_id,x,y) VALUES ($1,$2,$3)", [cloudId, x, y]);
                for (const [ordinal, source] of cloudSources.entries()) {
                    await db.query(`INSERT INTO knowledge_web_sources
                        (id,cloud_id,title,author,publication_date,reference,url,supports,ordinal,added_by)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
                    [source.id, cloudId, source.title, source.author, source.publication_date,
                        source.reference, source.url, source.supports, ordinal, proposal.contributor_email]);
                }
            }
            const updated = await db.query(`UPDATE knowledge_web_proposals SET status=$2,teacher_comment=$3,
                revision=revision+1,updated_at=NOW(),decided_at=NOW(),published_cloud_id=$4
                WHERE id=$1 AND status='Submitted' RETURNING id`,
            [id, status, comment, cloudId]);
            if (!updated.rowCount) throw problem(409, "This proposal has already been reviewed.");
            const snapshot = { ...proposal, status, teacher_comment: comment,
                sources: cloudSources, connection_sources: connectionSources, published_cloud_id: cloudId };
            await auditProposal(db, snapshot, status, email, teacherName, comment);
            return { status, cloudId };
        });
        res.json(outcome);
    }

    app.get(`${base}/proposals`, route({}, async (_req, res, { email, staff }) => {
        if (staff) throw problem(403, "Use the teacher proposal review area.");
        await ensureSchema();
        const proposals = await readProposals({ ownerEmail: staff ? null : email, includeDrafts: true, includePrivateComment: true });
        res.json({ proposals });
    }));
    app.get(`${base}/proposals/duplicates`, route({}, async (req, res, { email, staff }) => {
        if (staff) throw problem(403, "Duplicate checks are for student proposals.");
        const title = text(req.query.title || "", "Cloud title", 120);
        const exclude = req.query.exclude || null;
        if (exclude && !UUID.test(exclude)) throw problem(400, "Invalid proposal identifier.");
        res.json({ matches: await findDuplicates(title, email, exclude) });
    }));
    app.post(`${base}/proposals`, route({}, async (req, res, access) => saveProposal(req, res, access)));
    app.put(`${base}/proposals/:id`, route({}, async (req, res, access) =>
        saveProposal(req, res, access, proposalIdFrom(req))));
    app.get(`${base}/manage/proposals`, route({ staffOnly: true }, async (_req, res) =>
        res.json({ proposals: await readProposals({ includePrivateComment: true }) })));
    app.post(`${base}/manage/proposals/:id/decision`, route({ staffOnly: true }, decideProposal));
    app.post(`${base}/manage/source-metadata`, route({ staffOnly: true }, async (req, res) =>
        res.json(await getSourceMetadata(req.body?.url))));

    function route({ staffOnly = false } = {}, handler) {
        return async (req, res) => {
            res.set("Cache-Control", "private, no-store");
            try {
                const email = getVerifiedEmail(req);
                if (!email) throw problem(401, "Sign in with your school Google account to open the Knowledge Web.");
                const staff = await canManage(email);
                if (!staff) {
                    if (staffOnly) throw problem(403, "Only teaching staff can manage the Knowledge Web.");
                    const profile = await getStudentProfile(email);
                    if (!profile?.available || ![9, 10].includes(Number(profile.year))) {
                        throw problem(403, "The Knowledge Web pilot is open to Years 9 and 10.");
                    }
                }
                await handler(req, res, { email, staff });
            } catch (error) {
                if (error.status) return res.status(error.status).json({ error: error.message });
                console.error("[knowledge-web]", error.message);
                res.status(503).json({ error: "The Knowledge Web could not complete this request. Please try again." });
            }
        };
    }

    app.get(`${base}/access`, route({}, (_req, res, { staff }) => res.json({ canManage: staff })));
    app.get(`${base}/clouds`, route({}, async (_req, res, { staff }) =>
        res.json({ canManage: staff, canPropose: !staff, clouds: await listClouds(false) })));
    app.get(`${base}/manage/clouds`, route({ staffOnly: true }, async (_req, res) => res.json({ clouds: await listClouds(true) })));
    const save = route({ staffOnly: true }, async (req, res, { email }) => {
        const id = req.params.id;
        if (id && !UUID.test(id)) throw problem(404, "Cloud not found.");
        const input = readCloud(req.body);
        const contributor = id ? null : await getContributorName(req, email);
        const cloudId = await saveCloud(id, input, email, contributor && !contributor.includes("@") ? contributor : "DTECH teaching team");
        res.status(id ? 200 : 201).json({ id: cloudId });
    });
    app.post(`${base}/manage/clouds`, save);
    app.put(`${base}/manage/clouds/:id`, save);
}

module.exports = { registerKnowledgeWeb };
