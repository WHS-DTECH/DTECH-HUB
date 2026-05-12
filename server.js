const path = require("path");
const express = require("express");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;
const hasDatabase = Boolean(process.env.DATABASE_URL);
const memoryActivities = new Map();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

async function ensureSchema() {
  if (!hasDatabase) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      year_level TEXT NOT NULL,
      type TEXT NOT NULL,
      activity_category TEXT NOT NULL DEFAULT 'Practice',
      duration_hours INTEGER NOT NULL DEFAULT 1,
      difficulty TEXT NOT NULL DEFAULT 'Beginner',
      card_color TEXT NOT NULL DEFAULT 'Rose',
      outcome_image_url TEXT,
      description TEXT,
      resources JSONB NOT NULL DEFAULT '[]'::jsonb,
      equipment JSONB NOT NULL DEFAULT '[]'::jsonb,
      instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
      class_management_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
      class_preparation JSONB NOT NULL DEFAULT '[]'::jsonb,
      assessment_focus JSONB NOT NULL DEFAULT '[]'::jsonb,
      show_in_this_week BOOLEAN NOT NULL DEFAULT FALSE,
      term TEXT NOT NULL DEFAULT 'Term 2',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

app.use(express.json({ limit: "2mb" }));
app.use(express.static(__dirname));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/activities", async (_req, res) => {
  if (!hasDatabase) {
    const rows = Array.from(memoryActivities.values()).sort((left, right) => {
      return new Date(right.created_at) - new Date(left.created_at);
    });
    res.json(rows);
    return;
  }

  try {
    const result = await pool.query("SELECT * FROM activities ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Could not load activities" });
  }
});

app.get("/api/activities/:id", async (req, res) => {
  if (!hasDatabase) {
    const found = memoryActivities.get(req.params.id);
    if (!found) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json(found);
    return;
  }

  try {
    const result = await pool.query("SELECT * FROM activities WHERE id = $1 LIMIT 1", [req.params.id]);
    if (!result.rows.length) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Could not load activity" });
  }
});

app.post("/api/activities", async (req, res) => {
  const body = req.body || {};
  const name = String(body.name || "").trim();
  const yearLevel = String(body.year_level || "").trim();
  const type = String(body.type || "").trim();

  if (!name || !yearLevel || !type) {
    res.status(400).send("name, year_level, and type are required");
    return;
  }

  const id = String(body.id || slugify(name));
  const payload = {
    id,
    name,
    year_level: yearLevel,
    type,
    activity_category: String(body.activity_category || "Practice").trim() || "Practice",
    duration_hours: Number.parseInt(body.duration_hours, 10) || 1,
    difficulty: String(body.difficulty || "Beginner").trim() || "Beginner",
    card_color: String(body.card_color || "Rose").trim() || "Rose",
    outcome_image_url: String(body.outcome_image_url || "").trim(),
    description: String(body.description || "").trim(),
    resources: normalizeArray(body.resources),
    equipment: normalizeArray(body.equipment),
    instructions: normalizeArray(body.instructions),
    class_management_notes: normalizeArray(body.class_management_notes),
    class_preparation: normalizeArray(body.class_preparation),
    assessment_focus: normalizeArray(body.assessment_focus),
    show_in_this_week: Boolean(body.show_in_this_week),
    term: String(body.term || "Term 2").trim() || "Term 2",
    created_at: String(body.created_at || new Date().toISOString()),
    updated_at: new Date().toISOString()
  };

  if (!hasDatabase) {
    memoryActivities.set(payload.id, payload);
    res.status(201).json(payload);
    return;
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO activities (
          id, name, year_level, type, activity_category, duration_hours, difficulty,
          card_color, outcome_image_url, description, resources, equipment, instructions,
          class_management_notes, class_preparation, assessment_focus, show_in_this_week,
          term, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11::jsonb, $12::jsonb, $13::jsonb,
          $14::jsonb, $15::jsonb, $16::jsonb, $17,
          $18, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          year_level = EXCLUDED.year_level,
          type = EXCLUDED.type,
          activity_category = EXCLUDED.activity_category,
          duration_hours = EXCLUDED.duration_hours,
          difficulty = EXCLUDED.difficulty,
          card_color = EXCLUDED.card_color,
          outcome_image_url = EXCLUDED.outcome_image_url,
          description = EXCLUDED.description,
          resources = EXCLUDED.resources,
          equipment = EXCLUDED.equipment,
          instructions = EXCLUDED.instructions,
          class_management_notes = EXCLUDED.class_management_notes,
          class_preparation = EXCLUDED.class_preparation,
          assessment_focus = EXCLUDED.assessment_focus,
          show_in_this_week = EXCLUDED.show_in_this_week,
          term = EXCLUDED.term,
          updated_at = NOW()
        RETURNING *
      `,
      [
        payload.id,
        payload.name,
        payload.year_level,
        payload.type,
        payload.activity_category,
        payload.duration_hours,
        payload.difficulty,
        payload.card_color,
        payload.outcome_image_url,
        payload.description,
        JSON.stringify(payload.resources),
        JSON.stringify(payload.equipment),
        JSON.stringify(payload.instructions),
        JSON.stringify(payload.class_management_notes),
        JSON.stringify(payload.class_preparation),
        JSON.stringify(payload.assessment_focus),
        payload.show_in_this_week,
        payload.term
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).send("Could not save activity");
  }
});

app.delete("/api/activities", async (_req, res) => {
  if (!hasDatabase) {
    memoryActivities.clear();
    res.status(204).send();
    return;
  }

  try {
    await pool.query("DELETE FROM activities");
    res.status(204).send();
  } catch (error) {
    res.status(500).send("Could not clear activities");
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

ensureSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`DTECH-HUB running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize schema", error);
    process.exit(1);
  });
