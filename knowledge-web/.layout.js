"use strict";

const schema = `
CREATE TABLE IF NOT EXISTS knowledge_web_layout_positions (
    owner TEXT NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('cloud','kite')),
    item_id UUID NOT NULL,
    x INTEGER NOT NULL CHECK (x BETWEEN 0 AND 6000),
    y INTEGER NOT NULL CHECK (y BETWEEN 0 AND 6000),
    PRIMARY KEY (owner,item_type,item_id)
);`;

function registerLayout(app, { base, pool, route, ensureSchema, UUID, problem }) {
    async function readLayout(email) {
        const { rows } = await pool.query(`SELECT p.owner='' AS shared,p.item_type AS type,p.item_id AS id,p.x,p.y
            FROM knowledge_web_layout_positions p JOIN knowledge_web_connection_endpoints e
            ON e.id=p.item_id AND e.type=p.item_type WHERE p.owner IN ('',$1)`, [email]);
        const positions = (shared) => rows.filter((row) => row.shared === shared).map(({ type, id, x, y }) => ({ type, id, x, y }));
        return { defaults: positions(true), personal: positions(false) };
    }
    app.get(`${base}/layout`, route({}, async (_req, res, { email }) => {
        await ensureSchema();
        res.json(await readLayout(email));
    }));

    function save(defaultLayout) {
        return route({ staffOnly: defaultLayout }, async (req, res, { email }) => {
            const { type, id } = req.params;
            const { x, y } = req.body || {};
            if (!["cloud", "kite"].includes(type) || !UUID.test(id)) throw problem(400, "Choose a cloud or kite.");
            if (![x, y].every((value) => Number.isInteger(value) && value >= 0 && value <= 6000)) {
                throw problem(400, "Choose a position within the canvas.");
            }
            await ensureSchema();
            const result = await pool.query(`INSERT INTO knowledge_web_layout_positions (owner,item_type,item_id,x,y)
                SELECT $1,type,id,$4,$5 FROM knowledge_web_connection_endpoints WHERE type=$2 AND id=$3
                ON CONFLICT (owner,item_type,item_id) DO UPDATE SET x=EXCLUDED.x,y=EXCLUDED.y`,
            [defaultLayout ? "" : email, type, id, x, y]);
            if (!result.rowCount) throw problem(404, "This canvas item is not available.");
            res.json({ x, y });
        });
    }

    app.put(`${base}/layout/:type/:id`, save(false));
    app.put(`${base}/manage/default-layout/:type/:id`, save(true));
    app.delete(`${base}/layout`, route({}, async (_req, res, { email }) => {
        await ensureSchema();
        await pool.query("DELETE FROM knowledge_web_layout_positions WHERE owner=$1", [email]);
        res.json({ defaults: (await readLayout(email)).defaults });
    }));
}

module.exports = { schema, registerLayout };
