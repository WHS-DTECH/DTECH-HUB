"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const seedFile = path.join(__dirname, "library.json");
const statuses = ["active", "planning", "archive"];

function validLink(value, allowEmpty = false) {
    if (!value) return allowEmpty;
    if (value.startsWith("/") && !value.startsWith("//") && !/[\\\s]/.test(value)) return true;
    try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol);
    } catch {
        return false;
    }
}

function normalizeCards(cards) {
    if (!Array.isArray(cards)) throw new Error("A cards array is required.");
    const ids = new Set();
    return cards.map((card, index) => {
        const text = (value, limit) => {
            if (value != null && typeof value !== "string") throw new Error(`Card ${index + 1} fields must be text.`);
            const result = (value || "").trim();
            if (result.length > limit) throw new Error(`Card ${index + 1} has a field that is too long.`);
            return result;
        };
        const title = text(card?.title, 120);
        const summary = text(card?.summary, 600);
        const id = text(card?.id, 120) || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        const href = text(card?.href, 300);
        const imageUrl = text(card?.imageUrl, 300);
        const status = text(card?.status, 20) || "active";
        if (!title || !summary || !id) throw new Error(`Card ${index + 1} requires a title and summary.`);
        if (ids.has(id)) throw new Error(`Duplicate card ID: ${id}`);
        if (!statuses.includes(status)) throw new Error(`Card ${index + 1} has an invalid status.`);
        if (!validLink(href, true) || !validLink(imageUrl, true)) throw new Error(`Card ${index + 1} links must be site paths or HTTP(S) URLs.`);
        ids.add(id);
        return {
            id, title, summary, href, imageUrl, status,
            yearLevel: text(card?.yearLevel, 60) || "All Years",
            area: text(card?.area, 60) || "Learning Pathways",
            visual: { icon: text(card?.visual?.icon, 12) || "LP" }
        };
    });
}

function registerLearningPathways(app, { pool, hasDatabase, requireAdminAccess }) {
    async function ensureSchema() {
        await pool.query(`CREATE TABLE IF NOT EXISTS learning_pathways_library_store (
            id TEXT PRIMARY KEY, cards JSONB NOT NULL DEFAULT '[]'::jsonb,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`);
        await pool.query(`ALTER TABLE learning_pathways_library_store
            ADD COLUMN IF NOT EXISTS seed_version INTEGER NOT NULL DEFAULT 0`);
    }

    async function readCards() {
        if (!hasDatabase) return normalizeCards(JSON.parse(await fs.readFile(seedFile, "utf8")));
        await ensureSchema();
        const seed = normalizeCards(JSON.parse(await fs.readFile(seedFile, "utf8")));
        await pool.query(`INSERT INTO learning_pathways_library_store (id, cards, seed_version) VALUES ('default', $1::jsonb, 3)
            ON CONFLICT (id) DO NOTHING`, [JSON.stringify(seed)]);
        // Add the curriculum starter cards once without replacing existing cards or restoring later deletions.
        await pool.query(`UPDATE learning_pathways_library_store AS library
            SET cards = library.cards || COALESCE((
                SELECT jsonb_agg(starter.card)
                FROM jsonb_array_elements($1::jsonb) AS starter(card)
                WHERE NOT EXISTS (
                    SELECT 1 FROM jsonb_array_elements(library.cards) AS existing(card)
                    WHERE existing.card ->> 'id' = starter.card ->> 'id'
                )
            ), '[]'::jsonb), seed_version = 1, updated_at = NOW()
            WHERE id = 'default' AND seed_version < 1`, [JSON.stringify(seed)]);
        const combined = seed.find((card) => card.id === "programming-and-algorithms");
        await pool.query(`UPDATE learning_pathways_library_store AS library
            SET cards = COALESCE((
                SELECT jsonb_agg(existing.card ORDER BY existing.position)
                FROM jsonb_array_elements(library.cards) WITH ORDINALITY AS existing(card, position)
                WHERE existing.card ->> 'id' NOT IN ('programming', 'algorithms')
            ), '[]'::jsonb) || CASE
                WHEN EXISTS (
                    SELECT 1 FROM jsonb_array_elements(library.cards) AS existing(card)
                    WHERE existing.card ->> 'id' IN ('programming', 'algorithms')
                ) AND NOT EXISTS (
                    SELECT 1 FROM jsonb_array_elements(library.cards) AS existing(card)
                    WHERE existing.card ->> 'id' = 'programming-and-algorithms'
                ) THEN $1::jsonb ELSE '[]'::jsonb END,
                seed_version = 2, updated_at = NOW()
            WHERE id = 'default' AND seed_version < 2`, [JSON.stringify([combined])]);
        await pool.query(`UPDATE learning_pathways_library_store AS library
            SET cards = COALESCE((
                SELECT jsonb_agg(CASE WHEN existing.card ->> 'id' = 'data'
                    THEN existing.card || '{"title":"Data and Information","area":"Data and Information"}'::jsonb
                    ELSE existing.card END ORDER BY existing.position)
                FROM jsonb_array_elements(library.cards) WITH ORDINALITY AS existing(card, position)
            ), '[]'::jsonb), seed_version = 3, updated_at = NOW()
            WHERE id = 'default' AND seed_version < 3`);
        const initialized = await pool.query("SELECT cards FROM learning_pathways_library_store WHERE id = 'default'");
        return normalizeCards(initialized.rows[0].cards);
    }

    async function writeCards(cards) {
        if (!hasDatabase) {
            await fs.writeFile(seedFile, `${JSON.stringify(cards, null, 2)}\n`, "utf8");
            return;
        }
        await readCards();
        await pool.query(`INSERT INTO learning_pathways_library_store (id, cards, seed_version) VALUES ('default', $1::jsonb, 3)
            ON CONFLICT (id) DO UPDATE SET cards = EXCLUDED.cards, seed_version = 3, updated_at = NOW()`, [JSON.stringify(cards)]);
    }

    const load = (admin) => async (_req, res) => {
        try {
            const cards = await readCards();
            res.set("Cache-Control", "no-store");
            res.json(admin ? { cards } : cards);
        } catch (error) {
            console.error("Could not load Learning Pathways library", error);
            res.status(500).json({ error: "Could not load Learning Pathways. Please try again." });
        }
    };
    app.get("/learning-pathways/library.json", load(false));
    app.get("/api/learning-pathways/library", load(false));
    app.get("/api/admin/learning-pathways/library", requireAdminAccess, load(true));
    app.put("/api/admin/learning-pathways/library", requireAdminAccess, async (req, res) => {
        let cards;
        try {
            cards = normalizeCards(req.body?.cards);
        } catch (error) {
            res.status(400).json({ error: error.message });
            return;
        }
        try {
            await writeCards(cards);
            res.json({ ok: true, cards, count: cards.length });
        } catch (error) {
            console.error("Could not publish Learning Pathways library", error);
            res.status(500).json({ error: "Could not publish Learning Pathways. Your changes have not been saved." });
        }
    });
}

module.exports = { registerLearningPathways, normalizeCards };
