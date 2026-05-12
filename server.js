const path = require("path");
const express = require("express");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;
const hasDatabase = Boolean(process.env.DATABASE_URL);
const memoryActivities = new Map();
const memoryUserRoles = new Map();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

const DEFAULT_ROLE_PERMISSIONS = [
  { role_name: "Admin", home_page: true, upload_activity: true, browse_activities: true, planning: true, admin: true },
  { role_name: "Lead Teacher", home_page: true, upload_activity: true, browse_activities: true, planning: true, admin: false },
  { role_name: "Public Access", home_page: true, upload_activity: false, browse_activities: false, planning: false, admin: false },
  { role_name: "Staff", home_page: true, upload_activity: false, browse_activities: true, planning: false, admin: false },
  { role_name: "Student", home_page: true, upload_activity: false, browse_activities: true, planning: false, admin: false },
  { role_name: "Teacher", home_page: true, upload_activity: false, browse_activities: true, planning: false, admin: false },
  { role_name: "Technician", home_page: true, upload_activity: false, browse_activities: true, planning: false, admin: false }
];

let memoryRolePermissions = DEFAULT_ROLE_PERMISSIONS.map((row) => ({ ...row }));

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

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_additional_roles (
      user_email TEXT PRIMARY KEY,
      user_type TEXT NOT NULL,
      display_name TEXT,
      additional_role TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_name TEXT PRIMARY KEY,
      home_page BOOLEAN NOT NULL DEFAULT FALSE,
      upload_activity BOOLEAN NOT NULL DEFAULT FALSE,
      browse_activities BOOLEAN NOT NULL DEFAULT FALSE,
      planning BOOLEAN NOT NULL DEFAULT FALSE,
      admin BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  for (const row of DEFAULT_ROLE_PERMISSIONS) {
    await pool.query(
      `
        INSERT INTO role_permissions (
          role_name, home_page, upload_activity, browse_activities, planning, admin, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, NOW()
        )
        ON CONFLICT (role_name) DO NOTHING
      `,
      [row.role_name, row.home_page, row.upload_activity, row.browse_activities, row.planning, row.admin]
    );
  }
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

app.get("/api/admin/staff-list", async (_req, res) => {
  if (!hasDatabase) {
    res.json([]);
    return;
  }

  try {
    const result = await pool.query("SELECT * FROM upload_staff");
    res.json(result.rows);
  } catch (_error) {
    res.json([]);
  }
});

app.get("/api/admin/user-roles", async (_req, res) => {
  if (!hasDatabase) {
    res.json(Array.from(memoryUserRoles.values()));
    return;
  }

  try {
    const result = await pool.query(
      `
        SELECT user_type, user_email, display_name, additional_role
        FROM user_additional_roles
        ORDER BY user_type ASC, user_email ASC
      `
    );
    res.json(result.rows);
  } catch (_error) {
    res.status(500).json({ error: "Could not load user roles" });
  }
});

app.post("/api/admin/user-roles", async (req, res) => {
  const body = req.body || {};
  const userType = String(body.user_type || "").trim();
  const userEmail = normalizeEmail(body.user_email);
  const additionalRole = String(body.additional_role || "").trim();
  const displayName = String(body.display_name || "").trim();

  if (!userType || !userEmail || !additionalRole) {
    res.status(400).send("user_type, user_email and additional_role are required");
    return;
  }

  const payload = {
    user_type: userType,
    user_email: userEmail,
    display_name: displayName,
    additional_role: additionalRole
  };

  if (!hasDatabase) {
    memoryUserRoles.set(userEmail, payload);
    res.status(201).json(payload);
    return;
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO user_additional_roles (
          user_type, user_email, display_name, additional_role, updated_at
        ) VALUES (
          $1, $2, $3, $4, NOW()
        )
        ON CONFLICT (user_email) DO UPDATE SET
          user_type = EXCLUDED.user_type,
          display_name = EXCLUDED.display_name,
          additional_role = EXCLUDED.additional_role,
          updated_at = NOW()
        RETURNING user_type, user_email, display_name, additional_role
      `,
      [userType, userEmail, displayName, additionalRole]
    );

    res.status(201).json(result.rows[0]);
  } catch (_error) {
    res.status(500).send("Could not save user role");
  }
});

app.delete("/api/admin/user-roles/:email", async (req, res) => {
  const email = normalizeEmail(req.params.email);
  if (!email) {
    res.status(400).send("email is required");
    return;
  }

  if (!hasDatabase) {
    memoryUserRoles.delete(email);
    res.status(204).send();
    return;
  }

  try {
    await pool.query("DELETE FROM user_additional_roles WHERE user_email = $1", [email]);
    res.status(204).send();
  } catch (_error) {
    res.status(500).send("Could not remove user role");
  }
});

app.get("/api/admin/role-permissions", async (_req, res) => {
  if (!hasDatabase) {
    res.json(memoryRolePermissions);
    return;
  }

  try {
    const result = await pool.query(
      `
        SELECT role_name, home_page, upload_activity, browse_activities, planning, admin
        FROM role_permissions
        ORDER BY role_name ASC
      `
    );
    res.json(result.rows);
  } catch (_error) {
    res.status(500).json({ error: "Could not load role permissions" });
  }
});

app.put("/api/admin/role-permissions", async (req, res) => {
  const rows = Array.isArray(req.body?.permissions) ? req.body.permissions : [];
  if (!rows.length) {
    res.status(400).send("permissions array is required");
    return;
  }

  const normalized = rows.map((row) => ({
    role_name: String(row.role_name || "").trim(),
    home_page: Boolean(row.home_page),
    upload_activity: Boolean(row.upload_activity),
    browse_activities: Boolean(row.browse_activities),
    planning: Boolean(row.planning),
    admin: Boolean(row.admin)
  })).filter((row) => row.role_name);

  if (!normalized.length) {
    res.status(400).send("at least one valid role permission row is required");
    return;
  }

  if (!hasDatabase) {
    memoryRolePermissions = normalized;
    res.json({ ok: true });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM role_permissions");

    for (const row of normalized) {
      await client.query(
        `
          INSERT INTO role_permissions (
            role_name, home_page, upload_activity, browse_activities, planning, admin, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `,
        [row.role_name, row.home_page, row.upload_activity, row.browse_activities, row.planning, row.admin]
      );
    }

    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (_error) {
    await client.query("ROLLBACK");
    res.status(500).send("Could not update role permissions");
  } finally {
    client.release();
  }
});

app.post("/api/admin/role-permissions/reset", async (_req, res) => {
  if (!hasDatabase) {
    memoryRolePermissions = DEFAULT_ROLE_PERMISSIONS.map((row) => ({ ...row }));
    res.json({ ok: true, permissions: memoryRolePermissions });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM role_permissions");

    for (const row of DEFAULT_ROLE_PERMISSIONS) {
      await client.query(
        `
          INSERT INTO role_permissions (
            role_name, home_page, upload_activity, browse_activities, planning, admin, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `,
        [row.role_name, row.home_page, row.upload_activity, row.browse_activities, row.planning, row.admin]
      );
    }

    await client.query("COMMIT");
    res.json({ ok: true, permissions: DEFAULT_ROLE_PERMISSIONS });
  } catch (_error) {
    await client.query("ROLLBACK");
    res.status(500).send("Could not reset role permissions");
  } finally {
    client.release();
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
