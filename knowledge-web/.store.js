"use strict";

const { randomUUID } = require("node:crypto");

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
    const when = text(value ?? "", field, 10, false);
    if (!when) return "";
    const day = when.length === 7 ? `${when}-01` : when;
    const parsed = new Date(day);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== day) {
        throw problem(400, `${field} must be a real date in YYYY-MM or YYYY-MM-DD format.`);
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
            publicationDate: date(source.publicationDate, "Publication date"),
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
    app.get(`${base}/clouds`, route({}, async (_req, res, { staff }) => res.json({ canManage: staff, clouds: await listClouds(false) })));
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
