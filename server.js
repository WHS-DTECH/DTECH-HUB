const path = require("path");
const express = require("express");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;
const hasDatabase = Boolean(process.env.DATABASE_URL);
const staffDirectoryApiUrl = String(process.env.STAFF_DIRECTORY_API_URL || "").trim();
const staffDirectoryApiKey = String(process.env.STAFF_DIRECTORY_API_KEY || "").trim();
const memoryActivities = new Map();
const memoryUserRoles = new Map();
const memoryStaffDirectory = new Map();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

const STAFF_TABLE_CANDIDATES = ["staff_upload", "upload_staff"];
const STUDENT_TABLE_CANDIDATES = ["student_timetable"];

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

const ROLE_NAME_ALIASES = new Map([
  ["admin", "Admin"],
  ["leadteacher", "Lead Teacher"],
  ["publicaccess", "Public Access"],
  ["staff", "Staff"],
  ["student", "Student"],
  ["teacher", "Teacher"],
  ["technician", "Technician"]
]);

const DEFAULT_ROLE_ORDER = DEFAULT_ROLE_PERMISSIONS.map((row) => String(row.role_name || "").trim());

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

function normalizeRoleKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function toTitleCaseWords(value) {
  return String(value || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function canonicalizeRoleName(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const aliasMatch = ROLE_NAME_ALIASES.get(normalizeRoleKey(raw));
  if (aliasMatch) {
    return aliasMatch;
  }

  return toTitleCaseWords(raw.replace(/[_-]+/g, " "));
}

function mergeRolePermissionRows(rows) {
  const mergedByRole = new Map();

  for (const row of rows || []) {
    const roleName = canonicalizeRoleName(row.role_name);
    if (!roleName) continue;

    const existing = mergedByRole.get(roleName) || {
      role_name: roleName,
      home_page: false,
      upload_activity: false,
      browse_activities: false,
      planning: false,
      admin: false
    };

    existing.home_page = existing.home_page || Boolean(row.home_page);
    existing.upload_activity = existing.upload_activity || Boolean(row.upload_activity);
    existing.browse_activities = existing.browse_activities || Boolean(row.browse_activities);
    existing.planning = existing.planning || Boolean(row.planning);
    existing.admin = existing.admin || Boolean(row.admin);

    mergedByRole.set(roleName, existing);
  }

  const orderLookup = new Map(DEFAULT_ROLE_ORDER.map((name, index) => [name, index]));
  return Array.from(mergedByRole.values()).sort((left, right) => {
    const leftOrder = orderLookup.has(left.role_name) ? orderLookup.get(left.role_name) : Number.MAX_SAFE_INTEGER;
    const rightOrder = orderLookup.has(right.role_name) ? orderLookup.get(right.role_name) : Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.role_name.localeCompare(right.role_name);
  });
}

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findHeaderIndex(headers, aliases) {
  const normalizedHeaders = Array.isArray(headers) ? headers.map(normalizeHeader) : [];
  return aliases
    .map((alias) => normalizedHeaders.indexOf(normalizeHeader(alias)))
    .find((index) => index >= 0) ?? -1;
}

function getUploadCell(row, index) {
  if (!Array.isArray(row) || index < 0 || index >= row.length) {
    return "";
  }

  return String(row[index] || "").trim();
}

function buildStaffUploadRecord(headers, row, metadata = {}) {
  const codeIndex = findHeaderIndex(headers, ["code", "staff_code", "staff code"]);
  const lastNameIndex = findHeaderIndex(headers, ["last_name", "last name", "surname", "family_name"]);
  const firstNameIndex = findHeaderIndex(headers, ["first_name", "first name", "given_name", "forename"]);
  const titleIndex = findHeaderIndex(headers, ["title"]);
  const emailIndex = findHeaderIndex(headers, ["email_school", "email school", "email", "school_email", "email_address", "email address"]);

  const email = normalizeEmail(getUploadCell(row, emailIndex));
  return {
    code: getUploadCell(row, codeIndex),
    last_name: getUploadCell(row, lastNameIndex),
    first_name: getUploadCell(row, firstNameIndex),
    title: getUploadCell(row, titleIndex),
    email_school: email,
    status: "Current",
    primary_role: String(metadata.primary_role || "Staff").trim() || "Staff",
    upload_year: Number.parseInt(metadata.upload_year, 10) || null,
    upload_term: String(metadata.upload_term || "").trim(),
    upload_date: String(metadata.upload_date || "").trim()
  };
}

function upsertMemoryStaffRows(rows) {
  rows.forEach((row) => {
    if (row.email_school) {
      memoryStaffDirectory.set(row.email_school, { ...row });
    }
  });
}

function normalizeStaffDirectoryRows(payload) {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.staff)
      ? payload.staff
      : [];

  return rows
    .map((row) => ({
      id: row.id ?? null,
      code: String(row.code || row.staff_code || "").trim(),
      last_name: String(row.last_name || row.lastname || row.surname || "").trim(),
      first_name: String(row.first_name || row.firstname || row.first || "").trim(),
      title: String(row.title || "").trim(),
      email_school: normalizeEmail(row.email_school || row.email || row.user_email || row.staff_email),
      status: String(row.status || "Current").trim() || "Current",
      primary_role: String(row.primary_role || row.user_type || "Staff").trim() || "Staff",
      upload_year: row.upload_year ?? null,
      upload_term: String(row.upload_term || "").trim(),
      upload_date: String(row.upload_date || "").trim()
    }))
    .filter((row) => row.email_school);
}

async function loadRemoteStaffDirectory() {
  if (!staffDirectoryApiUrl) {
    return [];
  }

  try {
    const headers = {};
    if (staffDirectoryApiKey) {
      headers["x-api-key"] = staffDirectoryApiKey;
    }

    const response = await fetch(staffDirectoryApiUrl, { headers });
    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    return normalizeStaffDirectoryRows(payload);
  } catch (_error) {
    return [];
  }
}

async function getStaffDirectoryRows() {
  if (!hasDatabase) {
    const memoryRows = Array.from(memoryStaffDirectory.values());
    return memoryRows.length ? memoryRows : loadRemoteStaffDirectory();
  }

  try {
    const staffTableName = await resolveStaffTableName();
    const availableColumns = await getExistingTableColumns(staffTableName, [
      "id",
      "code",
      "last_name",
      "first_name",
      "title",
      "email_school",
      "status",
      "primary_role",
      "upload_year",
      "upload_term",
      "upload_date"
    ]);

    if (availableColumns.length) {
      const result = await pool.query(
        `SELECT ${availableColumns.join(", ")} FROM ${staffTableName}${buildOrderByClause(availableColumns)}`
      );

      if (result.rows.length) {
        return result.rows;
      }
    }
  } catch (_error) {
  }

  return loadRemoteStaffDirectory();
}

async function getExistingTableColumns(tableName, candidateColumns) {
  const result = await pool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
    `,
    [tableName]
  );

  const available = new Set(result.rows.map((row) => String(row.column_name || "").toLowerCase()));
  return candidateColumns.filter((columnName) => available.has(String(columnName).toLowerCase()));
}

async function getAllTableColumns(tableName) {
  const result = await pool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
    `,
    [tableName]
  );

  return result.rows
    .map((row) => String(row.column_name || "").trim().toLowerCase())
    .filter(Boolean);
}

function quoteIdentifier(identifier) {
  const value = String(identifier || "").trim();
  if (!/^[a-z_][a-z0-9_]*$/i.test(value)) {
    throw new Error(`Invalid SQL identifier: ${identifier}`);
  }
  return `"${value.replace(/"/g, '""')}"`;
}

function pickExistingColumn(availableColumns, candidates) {
  return candidates.find((columnName) => availableColumns.includes(columnName)) || null;
}

async function resolveUserRolesColumns() {
  const availableColumns = await getAllTableColumns("user_additional_roles");
  return {
    availableColumns,
    email: pickExistingColumn(availableColumns, ["user_email", "email", "staff_email"]),
    userType: pickExistingColumn(availableColumns, ["user_type", "type", "staff_type"]),
    displayName: pickExistingColumn(availableColumns, ["display_name", "name", "full_name"]),
    additionalRole: pickExistingColumn(availableColumns, ["additional_role", "role", "extra_role"]),
    updatedAt: pickExistingColumn(availableColumns, ["updated_at", "modified_at", "last_updated"])
  };
}

async function resolveStaffTableName() {
  const result = await pool.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])
    `,
    [STAFF_TABLE_CANDIDATES]
  );

  const availableTables = new Set(result.rows.map((row) => String(row.table_name || "").toLowerCase()));
  return STAFF_TABLE_CANDIDATES.find((tableName) => availableTables.has(tableName)) || "staff_upload";
}

async function resolveStudentTableName() {
  const result = await pool.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])
    `,
    [STUDENT_TABLE_CANDIDATES]
  );

  const availableTables = new Set(result.rows.map((row) => String(row.table_name || "").toLowerCase()));
  return STUDENT_TABLE_CANDIDATES.find((tableName) => availableTables.has(tableName)) || "student_timetable";
}

async function getStudentDirectoryRows() {
  if (!hasDatabase) {
    return [];
  }

  const studentTableName = await resolveStudentTableName();
  const availableColumns = await getExistingTableColumns(studentTableName, [
    "id",
    "student_name",
    "id_number",
    "form_class",
    "year_level",
    "status",
    "primary_role",
    "upload_year",
    "upload_term",
    "upload_date",
    "email_school",
    "student_email",
    "email",
    "email_address",
    "school_email",
    "google_email",
    "student_google_email",
    "student_mail",
    "mail",
    "username",
    "user_name",
    "student_username",
    "login",
    "student_login",
    "upn"
  ]);

  if (!availableColumns.length) {
    return [];
  }

  const result = await pool.query(
    `SELECT ${availableColumns.join(", ")} FROM ${studentTableName}${buildOrderByClause(availableColumns)}`
  );
  return result.rows;
}

function buildOrderByClause(availableColumns) {
  const preferredOrder = ["last_name", "first_name", "user_type", "user_email", "id"];
  const orderColumns = preferredOrder.filter((columnName) => availableColumns.includes(columnName));
  if (!orderColumns.length) {
    return "";
  }

  return ` ORDER BY ${orderColumns.map((columnName) => `${columnName} ASC`).join(", ")}`;
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

  await pool.query(`ALTER TABLE user_additional_roles ADD COLUMN IF NOT EXISTS user_type TEXT`);
  await pool.query(`ALTER TABLE user_additional_roles ADD COLUMN IF NOT EXISTS display_name TEXT`);
  await pool.query(`ALTER TABLE user_additional_roles ADD COLUMN IF NOT EXISTS additional_role TEXT`);
  await pool.query(`ALTER TABLE user_additional_roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS staff_upload (
      id BIGSERIAL PRIMARY KEY,
      code TEXT,
      last_name TEXT,
      first_name TEXT,
      title TEXT,
      email_school TEXT,
      status TEXT NOT NULL DEFAULT 'Current',
      primary_role TEXT NOT NULL DEFAULT 'Staff',
      upload_year INTEGER,
      upload_term TEXT,
      upload_date TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`ALTER TABLE staff_upload ADD COLUMN IF NOT EXISTS code TEXT`);
  await pool.query(`ALTER TABLE staff_upload ADD COLUMN IF NOT EXISTS last_name TEXT`);
  await pool.query(`ALTER TABLE staff_upload ADD COLUMN IF NOT EXISTS first_name TEXT`);
  await pool.query(`ALTER TABLE staff_upload ADD COLUMN IF NOT EXISTS title TEXT`);
  await pool.query(`ALTER TABLE staff_upload ADD COLUMN IF NOT EXISTS email_school TEXT`);
  await pool.query(`ALTER TABLE staff_upload ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Current'`);
  await pool.query(`ALTER TABLE staff_upload ADD COLUMN IF NOT EXISTS primary_role TEXT NOT NULL DEFAULT 'Staff'`);
  await pool.query(`ALTER TABLE staff_upload ADD COLUMN IF NOT EXISTS upload_year INTEGER`);
  await pool.query(`ALTER TABLE staff_upload ADD COLUMN IF NOT EXISTS upload_term TEXT`);
  await pool.query(`ALTER TABLE staff_upload ADD COLUMN IF NOT EXISTS upload_date TEXT`);
  await pool.query(`ALTER TABLE staff_upload ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);

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

  await pool.query(`ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS home_page BOOLEAN NOT NULL DEFAULT FALSE`);
  await pool.query(`ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS upload_activity BOOLEAN NOT NULL DEFAULT FALSE`);
  await pool.query(`ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS browse_activities BOOLEAN NOT NULL DEFAULT FALSE`);
  await pool.query(`ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS planning BOOLEAN NOT NULL DEFAULT FALSE`);
  await pool.query(`ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS admin BOOLEAN NOT NULL DEFAULT FALSE`);
  await pool.query(`ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);

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

app.post("/api/staff_upload", async (req, res) => {
  const headers = Array.isArray(req.body?.headers) ? req.body.headers : [];
  const staffRows = Array.isArray(req.body?.staff) ? req.body.staff : [];
  const uploadYear = Number.parseInt(req.body?.uploadYear ?? req.body?.upload_year, 10) || null;
  const uploadTerm = String(req.body?.uploadTerm ?? req.body?.upload_term ?? "").trim();
  const uploadDate = String(req.body?.uploadDate ?? req.body?.upload_date ?? "").trim();

  if (!headers.length || !staffRows.length) {
    res.status(400).json({ error: "headers and staff rows are required" });
    return;
  }

  const dedupedRows = new Map();
  let skippedNoEmail = 0;
  let duplicateEmailsInUpload = 0;

  staffRows.forEach((row) => {
    const record = buildStaffUploadRecord(headers, row, {
      upload_year: uploadYear,
      upload_term: uploadTerm,
      upload_date: uploadDate
    });

    if (!record.email_school) {
      skippedNoEmail += 1;
      return;
    }

    if (dedupedRows.has(record.email_school)) {
      duplicateEmailsInUpload += 1;
    }

    dedupedRows.set(record.email_school, record);
  });

  const normalizedRows = Array.from(dedupedRows.values());

  if (!normalizedRows.length) {
    res.json({
      success: true,
      processed: staffRows.length,
      inserted: 0,
      updated: 0,
      marked_not_current: 0,
      skipped_no_email: skippedNoEmail,
      duplicate_emails_in_upload: duplicateEmailsInUpload,
      upload_year: uploadYear,
      upload_term: uploadTerm,
      upload_date: uploadDate
    });
    return;
  }

  if (!hasDatabase) {
    upsertMemoryStaffRows(normalizedRows);
    res.json({
      success: true,
      processed: staffRows.length,
      inserted: normalizedRows.length,
      updated: 0,
      marked_not_current: 0,
      skipped_no_email: skippedNoEmail,
      duplicate_emails_in_upload: duplicateEmailsInUpload,
      upload_year: uploadYear,
      upload_term: uploadTerm,
      upload_date: uploadDate
    });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const staffTableName = await resolveStaffTableName();

    let inserted = 0;
    let updated = 0;

    for (const row of normalizedRows) {
      const existing = await client.query(
        `SELECT id FROM ${staffTableName} WHERE LOWER(email_school) = LOWER($1) LIMIT 1`,
        [row.email_school]
      );

      if (existing.rows.length) {
        await client.query(
          `
            UPDATE ${staffTableName}
            SET code = $2,
                last_name = $3,
                first_name = $4,
                title = $5,
                status = $6,
                primary_role = $7,
                upload_year = $8,
                upload_term = $9,
                upload_date = $10,
                updated_at = NOW()
            WHERE id = $1
          `,
          [
            existing.rows[0].id,
            row.code,
            row.last_name,
            row.first_name,
            row.title,
            row.status,
            row.primary_role,
            row.upload_year,
            row.upload_term,
            row.upload_date
          ]
        );
        updated += 1;
      } else {
        await client.query(
          `
            INSERT INTO ${staffTableName} (
              code, last_name, first_name, title, email_school, status,
              primary_role, upload_year, upload_term, upload_date, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6,
              $7, $8, $9, $10, NOW()
            )
          `,
          [
            row.code,
            row.last_name,
            row.first_name,
            row.title,
            row.email_school,
            row.status,
            row.primary_role,
            row.upload_year,
            row.upload_term,
            row.upload_date
          ]
        );
        inserted += 1;
      }
    }

    const currentEmails = normalizedRows.map((row) => row.email_school);
    const markNotCurrentResult = await client.query(
      `
        UPDATE ${staffTableName}
        SET status = 'Not Current', updated_at = NOW()
        WHERE COALESCE(email_school, '') <> ''
          AND LOWER(email_school) <> ALL($1::text[])
          AND COALESCE(status, 'Current') <> 'Not Current'
      `,
      [currentEmails]
    );

    await client.query("COMMIT");
    res.json({
      success: true,
      processed: staffRows.length,
      inserted,
      updated,
      marked_not_current: markNotCurrentResult.rowCount || 0,
      skipped_no_email: skippedNoEmail,
      duplicate_emails_in_upload: duplicateEmailsInUpload,
      upload_year: uploadYear,
      upload_term: uploadTerm,
      upload_date: uploadDate
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Could not import staff upload data" });
  } finally {
    client.release();
  }
});

app.get("/api/admin/staff-list", async (_req, res) => {
  try {
    const rows = await getStaffDirectoryRows();
    res.json(rows);
  } catch (_error) {
    res.json([]);
  }
});

app.get("/api/staff_upload/all", async (_req, res) => {
  try {
    const rows = await getStaffDirectoryRows();
    res.json({ staff: rows });
  } catch (_error) {
    res.json({ staff: [] });
  }
});

app.get("/api/student_timetable/all", async (_req, res) => {
  try {
    const rows = await getStudentDirectoryRows();
    res.json({ students: rows });
  } catch (_error) {
    res.json({ students: [] });
  }
});

app.get("/api/admin/user-roles", async (_req, res) => {
  if (!hasDatabase) {
    res.json(Array.from(memoryUserRoles.values()));
    return;
  }

  try {
    const columns = await resolveUserRolesColumns();
    if (!columns.email) {
      res.json([]);
      return;
    }

    const selectColumns = [
      columns.userType ? `${quoteIdentifier(columns.userType)} AS user_type` : `'Staff' AS user_type`,
      `${quoteIdentifier(columns.email)} AS user_email`,
      columns.displayName ? `${quoteIdentifier(columns.displayName)} AS display_name` : `'' AS display_name`,
      columns.additionalRole ? `${quoteIdentifier(columns.additionalRole)} AS additional_role` : `'' AS additional_role`
    ];

    const orderByColumn = columns.updatedAt || columns.email;

    const result = await pool.query(
      `SELECT ${selectColumns.join(", ")} FROM user_additional_roles ORDER BY ${quoteIdentifier(orderByColumn)} DESC`
    );
    const mergedByEmail = new Map();
    result.rows.forEach((row) => {
      const email = normalizeEmail(row.user_email);
      if (email) mergedByEmail.set(email, row);
    });
    for (const row of memoryUserRoles.values()) {
      const email = normalizeEmail(row.user_email);
      if (email && !mergedByEmail.has(email)) {
        mergedByEmail.set(email, row);
      }
    }
    res.json(Array.from(mergedByEmail.values()));
  } catch (error) {
    console.error("Could not load user roles", error);
    res.json(Array.from(memoryUserRoles.values()));
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

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const columns = await resolveUserRolesColumns();
    if (!columns.email) {
      throw new Error("Missing user_email column");
    }

    const updateAssignments = [];
    const updateValues = [userEmail];

    if (columns.userType) {
      updateAssignments.push(`user_type = $${updateValues.length + 1}`);
      updateValues.push(userType);
    }
    if (columns.displayName) {
      updateAssignments.push(`display_name = $${updateValues.length + 1}`);
      updateValues.push(displayName);
    }
    if (columns.additionalRole) {
      updateAssignments.push(`additional_role = $${updateValues.length + 1}`);
      updateValues.push(additionalRole);
    }
    if (columns.updatedAt) {
      updateAssignments.push("updated_at = NOW()");
    }

    const returnColumns = [
      columns.userType ? `${quoteIdentifier(columns.userType)} AS user_type` : `'Staff' AS user_type`,
      `${quoteIdentifier(columns.email)} AS user_email`,
      columns.displayName ? `${quoteIdentifier(columns.displayName)} AS display_name` : `'' AS display_name`,
      columns.additionalRole ? `${quoteIdentifier(columns.additionalRole)} AS additional_role` : `'' AS additional_role`
    ];

    const updateSqlAssignments = updateAssignments
      .map((assignment) => assignment
        .replace("user_type", columns.userType ? quoteIdentifier(columns.userType) : "user_type")
        .replace("display_name", columns.displayName ? quoteIdentifier(columns.displayName) : "display_name")
        .replace("additional_role", columns.additionalRole ? quoteIdentifier(columns.additionalRole) : "additional_role")
        .replace("updated_at", columns.updatedAt ? quoteIdentifier(columns.updatedAt) : "updated_at"));

    const updateResult = updateSqlAssignments.length
      ? await client.query(
          `
            UPDATE user_additional_roles
            SET ${updateSqlAssignments.join(", ")}
            WHERE LOWER(${quoteIdentifier(columns.email)}) = LOWER($1)
            RETURNING ${returnColumns.join(", ")}
          `,
          updateValues
        )
      : { rows: [] };

    let savedRow = updateResult.rows[0];

    if (!savedRow) {
      const insertColumns = [quoteIdentifier(columns.email)];
      const insertValues = [userEmail];

      if (columns.userType) {
        insertColumns.push(quoteIdentifier(columns.userType));
        insertValues.push(userType);
      }
      if (columns.displayName) {
        insertColumns.push(quoteIdentifier(columns.displayName));
        insertValues.push(displayName);
      }
      if (columns.additionalRole) {
        insertColumns.push(quoteIdentifier(columns.additionalRole));
        insertValues.push(additionalRole);
      }

      const valuePlaceholders = insertValues.map((_, index) => `$${index + 1}`);
      if (columns.updatedAt) {
        insertColumns.push(quoteIdentifier(columns.updatedAt));
        valuePlaceholders.push("NOW()");
      }

      const insertResult = await client.query(
        `
          INSERT INTO user_additional_roles (
            ${insertColumns.join(", ")}
          ) VALUES (
            ${valuePlaceholders.join(", ")}
          )
          RETURNING ${returnColumns.join(", ")}
        `,
        insertValues
      );

      savedRow = insertResult.rows[0];
    }

    await client.query("COMMIT");

    res.status(201).json(savedRow);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Could not save user role", error);
    memoryUserRoles.set(userEmail, payload);
    res.status(201).json(payload);
  } finally {
    client.release();
  }
});

app.delete("/api/admin/user-roles/:email", async (req, res) => {
  const email = normalizeEmail(req.params.email);
  if (!email) {
    res.status(400).send("email is required");
    return;
  }

  memoryUserRoles.delete(email);

  if (!hasDatabase) {
    res.status(204).send();
    return;
  }

  try {
    const columns = await resolveUserRolesColumns();
    if (!columns.email) {
      res.status(204).send();
      return;
    }

    await pool.query(
      `DELETE FROM user_additional_roles WHERE LOWER(${quoteIdentifier(columns.email)}) = LOWER($1)`,
      [email]
    );
    res.status(204).send();
  } catch (error) {
    console.error("Could not remove user role", error);
    res.status(204).send();
  }
});

app.get("/api/admin/role-permissions", async (_req, res) => {
  if (!hasDatabase) {
    res.json(mergeRolePermissionRows(memoryRolePermissions));
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
    res.json(mergeRolePermissionRows(result.rows));
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
    role_name: canonicalizeRoleName(row.role_name),
    home_page: Boolean(row.home_page),
    upload_activity: Boolean(row.upload_activity),
    browse_activities: Boolean(row.browse_activities),
    planning: Boolean(row.planning),
    admin: Boolean(row.admin)
  })).filter((row) => row.role_name);

  const merged = mergeRolePermissionRows(normalized);

  if (!merged.length) {
    res.status(400).send("at least one valid role permission row is required");
    return;
  }

  if (!hasDatabase) {
    memoryRolePermissions = merged;
    res.json({ ok: true });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM role_permissions");

    for (const row of merged) {
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
