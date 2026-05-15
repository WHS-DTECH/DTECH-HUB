const path = require("path");
const express = require("express");
const multer = require("multer");
const nodemailer = require("nodemailer");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;
const hasDatabase = Boolean(process.env.DATABASE_URL);
const staffDirectoryApiUrl = String(process.env.STAFF_DIRECTORY_API_URL || "").trim();
const staffDirectoryApiKey = String(process.env.STAFF_DIRECTORY_API_KEY || "").trim();
const memoryActivities = new Map();
const memoryUserRoles = new Map();
const memoryStaffDirectory = new Map();
const memorySuggestions = [];
let memorySuggestionId = 1;
const memoryPracticalEvents = [];
let memoryPracticalEventId = 1;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

const STAFF_TABLE_CANDIDATES = ["staff_upload", "upload_staff"];
const STUDENT_TABLE_CANDIDATES = ["student_timetable"];
const TEACHER_TIMETABLE_TABLE_CANDIDATES = ["upload_timetable", "timetable", "teacher_timetable"];
const SCHOOL_EMAIL_DOMAIN = "westlandhigh.school.nz";
const DTECH_HUB_NAME = "DTECH-HUB";
const STUDENT_TIMETABLE_PERIOD_COLUMNS = [
  "mon_p1_1", "mon_p1_2", "mon_p2", "mon_i", "mon_p3", "mon_p4", "mon_l", "mon_p5",
  "tue_p1_1", "tue_p1_2", "tue_p2", "tue_i", "tue_p3", "tue_p4", "tue_l", "tue_p5",
  "wed_p1_1", "wed_p1_2", "wed_p2", "wed_i", "wed_p3", "wed_p4", "wed_l", "wed_p5",
  "thu_p1_1", "thu_p1_2", "thu_p2", "thu_i", "thu_p3", "thu_p4", "thu_l", "thu_p5",
  "fri_p1_1", "fri_p1_2", "fri_p2", "fri_i", "fri_p3", "fri_p4", "fri_l", "fri_p5"
];
const DTECH_TIMETABLE_KEYWORDS = [
  "dtech",
  "d-tec",
  "digital tech",
  "digital technologies",
  "digitech",
  "computer",
  "computing",
  "programming",
  "python",
  "robotics",
  "electronics",
  "web design",
  "office suite",
  "network",
  "networking",
  "infrastructure",
  "cyber",
  "tinkercad"
];

// Program-specific keyword mappings
const PROGRAM_KEYWORDS = {
  "DTECH": ["dtech", "d-tec", "digital tech", "digital technologies", "digitech"],
  "DTONLINE": ["dtonline", "dt online", "d-t online", "online tech"],
  "COMP": ["comp", "computing", "computer", "programming", "python"],
  "TEXT": ["text", "textile", "textiles", "sewing"],
  "MPROG": ["mprog", "media prog", "media programming"],
  "MDTECH": ["mdtech", "m-dtech", "media dtech"]
};

function getStudentPrograms(row) {
  if (!row || typeof row !== "object") {
    return [];
  }

  const sourceValues = [
    row.program,
    row.program_code,
    row.program_name,
    row.subject,
    row.subjects,
    row.course,
    row.course_name,
    row.class_name,
    row.form_class,
    row.year_level,
    row.status,
    row.id_number,
    row.student_name,
    ...STUDENT_TIMETABLE_PERIOD_COLUMNS.map((columnName) => row[columnName])
  ];

  const normalizedText = sourceValues
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .map((value) => String(value || "").toLowerCase())
    .filter(Boolean)
    .join(" | ");

  const detectedPrograms = [];

  Object.entries(PROGRAM_KEYWORDS).forEach(([programCode, keywords]) => {
    if (keywords.some((keyword) => normalizedText.includes(keyword))) {
      detectedPrograms.push(programCode);
    }
  });

  if (DTECH_TIMETABLE_KEYWORDS.some((keyword) => normalizedText.includes(keyword)) && !detectedPrograms.includes("DTECH")) {
    detectedPrograms.push("DTECH");
  }

  return detectedPrograms;
}

const TIMETABLE_LABELS = new Map(STUDENT_TIMETABLE_PERIOD_COLUMNS.map((columnName) => {
  const label = columnName
    .replace(/_/g, " ")
    .replace(/\bp\b/gi, "P")
    .replace(/\bi\b/gi, "I")
    .replace(/\bl\b/gi, "L")
    .replace(/\bmon\b/i, "Mon")
    .replace(/\btue\b/i, "Tue")
    .replace(/\bwed\b/i, "Wed")
    .replace(/\bthu\b/i, "Thu")
    .replace(/\bfri\b/i, "Fri")
    .replace(/\s+/g, " ")
    .trim();
  return [columnName, label];
}));
const suggestionNotificationFallback = String(process.env.SUGGESTION_NOTIFY_EMAILS || "");
const SMTP_HOST = String(process.env.SMTP_HOST || "").trim();
const SMTP_PORT = Number.parseInt(process.env.SMTP_PORT || "", 10) || 587;
const SMTP_SECURE = String(process.env.SMTP_SECURE || "false").trim().toLowerCase() === "true";
const SMTP_USER = String(process.env.SMTP_USER || "").trim();
const SMTP_PASS = String(process.env.SMTP_PASS || "").trim();
const SMTP_FROM = String(process.env.SMTP_FROM || SMTP_USER || "").trim();
const suggestionUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const isPdfMime = String(file.mimetype || "").toLowerCase() === "application/pdf";
    const isPdfName = String(file.originalname || "").toLowerCase().endsWith(".pdf");
    callback(null, isPdfMime || isPdfName);
  }
});

let smtpTransporter = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  smtpTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
}

const DEFAULT_ROLE_PERMISSIONS = [
  { role_name: "Admin", home_page: true, upload_activity: true, browse_activities: true, planning: true, admin: true },
  { role_name: "Lead Teacher", home_page: true, upload_activity: true, browse_activities: true, planning: true, admin: false },
  { role_name: "Public Access", home_page: true, upload_activity: false, browse_activities: false, planning: false, admin: false },
  { role_name: "Staff", home_page: true, upload_activity: false, browse_activities: true, planning: false, admin: false },
  { role_name: "Student", home_page: true, upload_activity: false, browse_activities: true, planning: false, admin: false },
  { role_name: "Student Admin", home_page: true, upload_activity: false, browse_activities: true, planning: true, admin: true },
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
  ["studentadmin", "Student Admin"],
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

const EXCLUDED_NON_DTECH_KEYWORDS = [
  "sewing",
  "sew",
  "stitch",
  "cross stitch",
  "embroidery",
  "apron",
  "buttonhole",
  "bias binding",
  "aida cloth",
  "fabric",
  "textiles",
  "tassel",
  "seam allowance",
  "needlework"
];

const EXCLUDED_NON_DTECH_ACTIVITY_IDS = new Set(["5", "12", "14"]);

const EXCLUDED_NON_DTECH_ACTIVITY_TITLES = new Set([
  "flat-felled seam practice",
  "french seam cushion",
  "invisible zip insertion"
]);

function isExcludedNonDtechActivity(record) {
  if (!record || typeof record !== "object") {
    return false;
  }

  const recordId = String(record.id || "").trim();
  if (recordId && EXCLUDED_NON_DTECH_ACTIVITY_IDS.has(recordId)) {
    return true;
  }

  const recordTitle = String(record.name || record.title || "").trim().toLowerCase();
  if (recordTitle && EXCLUDED_NON_DTECH_ACTIVITY_TITLES.has(recordTitle)) {
    return true;
  }

  const joined = [
    record.name,
    record.title,
    record.type,
    record.activity_category,
    record.description,
    ...(Array.isArray(record.resources) ? record.resources : []),
    ...(Array.isArray(record.equipment) ? record.equipment : []),
    ...(Array.isArray(record.instructions) ? record.instructions : [])
  ]
    .join(" ")
    .toLowerCase();

  return EXCLUDED_NON_DTECH_KEYWORDS.some((keyword) => joined.includes(keyword));
}

function filterDtechActivities(rows) {
  return (Array.isArray(rows) ? rows : []).filter((row) => !isExcludedNonDtechActivity(row));
}

async function upsertHubVisibility(activityIds, hubName, isVisible) {
  if (!hasDatabase || !Array.isArray(activityIds) || !activityIds.length) {
    return;
  }

  const ids = Array.from(new Set(activityIds.map((id) => String(id || "").trim()).filter(Boolean)));
  if (!ids.length) {
    return;
  }

  await pool.query(
    `
      INSERT INTO activity_hub_visibility (activity_id, hub_name, is_visible, updated_at)
      SELECT id_value, $2, $3, NOW()
      FROM UNNEST($1::text[]) AS ids(id_value)
      ON CONFLICT (activity_id, hub_name) DO UPDATE
      SET is_visible = EXCLUDED.is_visible,
          updated_at = NOW()
    `,
    [ids, hubName, Boolean(isVisible)]
  );
}

async function syncDtechExcludedActivitiesVisibility() {
  if (!hasDatabase) {
    return;
  }

  const result = await pool.query(`
    SELECT id, name, year_level, type, activity_category, description, resources, equipment, instructions
    FROM activities
  `);

  const excludedIds = result.rows
    .filter((row) => isExcludedNonDtechActivity(row))
    .map((row) => row.id);

  if (!excludedIds.length) {
    return;
  }

  await upsertHubVisibility(excludedIds, DTECH_HUB_NAME, false);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function canonicalizeEmail(value) {
  const normalized = normalizeEmail(value);
  if (!normalized.includes("@")) {
    return "";
  }

  const [localPart, domain] = normalized.split("@");
  const canonicalLocalPart = String(localPart || "").replace(/[^a-z0-9]/g, "");
  if (!canonicalLocalPart || !domain) {
    return "";
  }

  return `${canonicalLocalPart}@${domain}`;
}

function parseCsvEmails(raw) {
  return String(raw || "")
    .split(",")
    .map((item) => normalizeEmail(item))
    .filter(Boolean);
}

function normalizeDateOnly(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysToIsoDate(isoDate, daysToAdd) {
  const parsed = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  parsed.setUTCDate(parsed.getUTCDate() + daysToAdd);
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toIcsDate(isoDate) {
  return String(isoDate || "").replace(/-/g, "");
}

function escapeIcsText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function buildIcsCalendar(events) {
  const now = new Date();
  const timestamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}T${String(now.getUTCHours()).padStart(2, "0")}${String(now.getUTCMinutes()).padStart(2, "0")}${String(now.getUTCSeconds()).padStart(2, "0")}Z`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WHS DTECH HUB//Browse Practicals//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Browse Practicals",
    "X-WR-TIMEZONE:Pacific/Auckland"
  ];

  events.forEach((event) => {
    const startDate = normalizeDateOnly(event.start_date);
    const endDate = normalizeDateOnly(event.end_date || event.start_date) || startDate;
    if (!startDate || !endDate) return;

    const endExclusive = addDaysToIsoDate(endDate, 1);
    const uid = `${escapeIcsText(event.id)}@dtech-hub2.onrender.com`;
    const title = `${escapeIcsText(event.event_type || "Activity")}: ${escapeIcsText(event.title)}`;
    const description = escapeIcsText(event.notes || "Scheduled in Browse Practicals");

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${timestamp}`);
    lines.push(`DTSTART;VALUE=DATE:${toIcsDate(startDate)}`);
    lines.push(`DTEND;VALUE=DATE:${toIcsDate(endExclusive)}`);
    lines.push(`SUMMARY:${title}`);
    lines.push(`DESCRIPTION:${description}`);
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

function buildSchoolEmail(value) {
  const localPart = String(value || "").trim().toLowerCase();
  if (!localPart || localPart.includes("@")) {
    return "";
  }

  if (!/^[a-z0-9._%+-]+$/i.test(localPart)) {
    return "";
  }

  return `${localPart}@${SCHOOL_EMAIL_DOMAIN}`;
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

async function getTableColumnMetadata(tableName) {
  const result = await pool.query(
    `
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
    `,
    [tableName]
  );

  const metadata = new Map();
  result.rows.forEach((row) => {
    const name = String(row.column_name || "").trim().toLowerCase();
    if (!name) return;
    metadata.set(name, {
      dataType: String(row.data_type || "").trim().toLowerCase(),
      udtName: String(row.udt_name || "").trim().toLowerCase()
    });
  });

  return metadata;
}

function isIntegerLikeColumn(metadataRow) {
  if (!metadataRow) return false;
  const dataType = String(metadataRow.dataType || "").toLowerCase();
  const udtName = String(metadataRow.udtName || "").toLowerCase();

  return dataType === "integer" ||
    dataType === "smallint" ||
    dataType === "bigint" ||
    udtName === "int2" ||
    udtName === "int4" ||
    udtName === "int8";
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
  const preferredAdditionalRole = pickExistingColumn(availableColumns, ["additional_role", "role", "extra_role"]);
  const legacyRoleName = pickExistingColumn(availableColumns, ["role_name"]);

  return {
    availableColumns,
    email: pickExistingColumn(availableColumns, ["user_email", "email", "staff_email"]),
    userType: pickExistingColumn(availableColumns, ["user_type", "type", "staff_type"]),
    displayName: pickExistingColumn(availableColumns, ["display_name", "name", "full_name"]),
    additionalRole: preferredAdditionalRole || legacyRoleName,
    legacyRoleName,
    hubAccess: pickExistingColumn(availableColumns, ["hub_access", "hubs_access", "website_hubs", "hub"]),
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

async function resolveTeacherTimetableTableName() {
  const result = await pool.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])
    `,
    [TEACHER_TIMETABLE_TABLE_CANDIDATES]
  );

  const availableTables = new Set(result.rows.map((row) => String(row.table_name || "").toLowerCase()));
  return TEACHER_TIMETABLE_TABLE_CANDIDATES.find((tableName) => availableTables.has(tableName)) || "";
}

async function getTeacherTimetableRows() {
  if (!hasDatabase) {
    return [];
  }

  const tableName = await resolveTeacherTimetableTableName();
  if (!tableName) {
    return [];
  }

  const columns = await getAllTableColumns(tableName);
  if (!columns.length) {
    return [];
  }

  const quotedColumns = columns.map((columnName) => quoteIdentifier(columnName)).join(", ");
  const result = await pool.query(
    `SELECT ${quotedColumns} FROM ${tableName}${buildOrderByClause(columns)}`
  );

  return result.rows;
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
    , ...STUDENT_TIMETABLE_PERIOD_COLUMNS
  ]);

  if (!availableColumns.length) {
    return [];
  }

  const result = await pool.query(
    `SELECT ${availableColumns.join(", ")} FROM ${studentTableName}${buildOrderByClause(availableColumns)}`
  );
  return result.rows;
}

function normalizePersonName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function getStudentTimetableEntries(row) {
  return STUDENT_TIMETABLE_PERIOD_COLUMNS
    .map((columnName) => ({
      key: columnName,
      label: TIMETABLE_LABELS.get(columnName) || columnName,
      value: String(row?.[columnName] || "").trim()
    }))
    .filter((entry) => entry.value);
}

function isDtechTimetableValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return DTECH_TIMETABLE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function buildStudentClassManagementRow(row) {
  const timetable = getStudentTimetableEntries(row);
  const dtechTimetable = timetable.filter((entry) => isDtechTimetableValue(entry.value));
  const linkedEmails = Array.from(
    collectDirectoryEmails(
      row,
      ["email_school", "student_email", "email", "email_address", "school_email", "google_email", "student_google_email", "student_mail", "mail", "upn"],
      ["username", "user_name", "student_username", "login", "student_login"]
    )
  );

  return {
    id: row?.id ?? null,
    student_name: String(row?.student_name || "").trim(),
    normalized_name: normalizePersonName(row?.student_name),
    id_number: String(row?.id_number || "").trim(),
    form_class: String(row?.form_class || row?.formclass || row?.class_code || row?.class || "").trim(),
    year_level: String(row?.year_level || row?.yearlevel || "").trim(),
    status: String(row?.status || "Current").trim() || "Current",
    upload_year: row?.upload_year ?? null,
    upload_term: String(row?.upload_term || "").trim(),
    upload_date: String(row?.upload_date || "").trim(),
    linked_emails: linkedEmails,
    has_dtech: dtechTimetable.length > 0,
    dtech_period_count: dtechTimetable.length,
    dtech_timetable: dtechTimetable,
    programs: getStudentPrograms(row),
    timetable
  };
}

function collectDirectoryEmails(row, exactEmailColumns, usernameColumns = []) {
  const emails = new Set();
  if (!row || typeof row !== "object") {
    return emails;
  }

  exactEmailColumns.forEach((columnName) => {
    const normalized = normalizeEmail(row[columnName]);
    if (normalized.includes("@")) {
      emails.add(normalized);
    }
  });

  usernameColumns.forEach((columnName) => {
    const candidate = buildSchoolEmail(row[columnName]);
    if (candidate) {
      emails.add(candidate);
    }
  });

  return emails;
}

async function getMergedRolePermissions() {
  if (!hasDatabase) {
    return mergeRolePermissionRows(memoryRolePermissions);
  }

  try {
    const result = await pool.query(
      `
        SELECT role_name, home_page, upload_activity, browse_activities, planning, admin
        FROM role_permissions
        ORDER BY role_name ASC
      `
    );
    return mergeRolePermissionRows(result.rows);
  } catch (_error) {
    return mergeRolePermissionRows(memoryRolePermissions);
  }
}

async function getUserRoleByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  const memoryMatch = memoryUserRoles.get(normalizedEmail) || null;

  if (!hasDatabase) {
    return memoryMatch;
  }

  try {
    const columns = await resolveUserRolesColumns();
    if (!columns.email) {
      return memoryMatch;
    }

    const selectColumns = [
      columns.userType ? `${quoteIdentifier(columns.userType)} AS user_type` : `'Staff' AS user_type`,
      `${quoteIdentifier(columns.email)} AS user_email`,
      columns.displayName ? `${quoteIdentifier(columns.displayName)} AS display_name` : `'' AS display_name`,
      columns.additionalRole && columns.legacyRoleName && columns.additionalRole !== columns.legacyRoleName
        ? `COALESCE(NULLIF(${quoteIdentifier(columns.additionalRole)}, ''), ${quoteIdentifier(columns.legacyRoleName)}) AS additional_role`
        : columns.additionalRole
          ? `${quoteIdentifier(columns.additionalRole)} AS additional_role`
          : `'' AS additional_role`,
      columns.hubAccess
        ? `${quoteIdentifier(columns.hubAccess)} AS hub_access`
        : `ARRAY['DTECH-HUB']::text[] AS hub_access`
    ];

    const result = await pool.query(
      `
        SELECT ${selectColumns.join(", ")}
        FROM user_additional_roles
        WHERE LOWER(${quoteIdentifier(columns.email)}) = LOWER($1)
        ORDER BY ${quoteIdentifier(columns.updatedAt || columns.email)} DESC
        LIMIT 1
      `,
      [normalizedEmail]
    );

    if (result.rows.length) {
      return result.rows[0];
    }
  } catch (_error) {
  }

  return memoryMatch;
}

function getRequestUserEmail(req) {
  const headerEmail = normalizeEmail(
    req.headers["x-user-email"] ||
    req.headers["x-hub-user-email"] ||
    req.headers["x-forwarded-email"]
  );

  if (headerEmail) {
    return headerEmail;
  }

  const queryEmail = normalizeEmail(req.query?.email);
  if (queryEmail) {
    return queryEmail;
  }

  return normalizeEmail(req.body?.user_email);
}

async function resolveActivityWriteAccess(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return {
      email: "",
      isAdmin: false,
      isStaff: false,
      allowed: false
    };
  }

  const userRole = await getUserRoleByEmail(normalizedEmail);
  const assignedRole = canonicalizeRoleName(userRole?.additional_role || userRole?.role_name || "");
  const allPermissions = await getMergedRolePermissions();
  const rolePermission = allPermissions.find(
    (row) => canonicalizeRoleName(row.role_name) === assignedRole
  ) || null;

  let isStaffFromDirectory = false;
  try {
    const staffRows = await getStaffDirectoryRows();
    isStaffFromDirectory = staffRows.some((row) =>
      collectDirectoryEmails(row, ["email_school", "email", "user_email", "staff_email", "google_email"]).has(normalizedEmail)
    );
  } catch (_error) {
    isStaffFromDirectory = false;
  }

  const staffRoles = new Set(["Admin", "Lead Teacher", "Teacher", "Technician", "Staff"]);
  const isStaffFromRole = staffRoles.has(assignedRole);
  const isAdmin = Boolean(rolePermission?.admin) || assignedRole === "Admin" || assignedRole === "Student Admin";
  const canUploadByRolePermission = Boolean(rolePermission?.upload_activity || rolePermission?.admin);
  const isStaff = isStaffFromDirectory || isStaffFromRole;

  return {
    email: normalizedEmail,
    isAdmin,
    isStaff,
    allowed: Boolean(isAdmin || isStaff || canUploadByRolePermission)
  };
}

async function requireActivityWriteAccess(req, res, next) {
  const requesterEmail = getRequestUserEmail(req);
  if (!requesterEmail) {
    res.status(401).json({ error: "Sign-in required. Missing user email." });
    return;
  }

  try {
    const access = await resolveActivityWriteAccess(requesterEmail);
    if (!access.allowed) {
      res.status(403).json({ error: "Staff or admin access is required for this action." });
      return;
    }

    req.activityWriteAccess = access;
    next();
  } catch (_error) {
    res.status(500).json({ error: "Could not verify write permissions." });
  }
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
      time_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
      show_in_this_week BOOLEAN NOT NULL DEFAULT FALSE,
      term TEXT NOT NULL DEFAULT 'Term 2',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Remove any check constraints on activity_category that may block proposal submissions
  try {
    await pool.query(`ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_activity_category_check`);
  } catch (e) {
    // Constraint may not exist, that's fine
  }

  // Add proposal fields if they don't exist
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS duration_minutes INTEGER`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS card_url TEXT`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS time_sensitive BOOLEAN NOT NULL DEFAULT FALSE`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS show_in_this_week BOOLEAN NOT NULL DEFAULT FALSE`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS start_date TEXT`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS contact_name TEXT`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS contact_phone TEXT`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS contact_email TEXT`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS company TEXT`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS address TEXT`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS overview JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS services JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS costs JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS outcomes JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS withdrawal_date TEXT`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS client_id TEXT`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS activity_hub_visibility (
      activity_id TEXT NOT NULL,
      hub_name TEXT NOT NULL,
      is_visible BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (activity_id, hub_name)
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
  await pool.query(`ALTER TABLE user_additional_roles ADD COLUMN IF NOT EXISTS hub_access TEXT[] NOT NULL DEFAULT ARRAY['DTECH-HUB']::text[]`);
  await pool.query(`ALTER TABLE user_additional_roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);

  try {
    const roleColumns = await getAllTableColumns("user_additional_roles");

    if (roleColumns.includes("additional_role") && roleColumns.includes("role_name")) {
      await pool.query(`
        UPDATE user_additional_roles
        SET additional_role = role_name
        WHERE (additional_role IS NULL OR BTRIM(additional_role) = '')
          AND role_name IS NOT NULL
          AND BTRIM(role_name) <> ''
      `);
    }

    if (roleColumns.includes("hub_access")) {
      await pool.query(`
        UPDATE user_additional_roles
        SET hub_access = ARRAY['DTECH-HUB']::text[]
        WHERE hub_access IS NULL
      `);
    }
  } catch (_error) {
  }

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS suggestions (
      id BIGSERIAL PRIMARY KEY,
      submitted_by_name TEXT NOT NULL,
      submitted_by_email TEXT NOT NULL,
      suggestion_type TEXT NOT NULL DEFAULT 'Activity',
      suggestion_title TEXT NOT NULL,
      reference_url TEXT,
      reason TEXT NOT NULL,
      attachment_filename TEXT,
      attachment_mime TEXT,
      attachment_size INTEGER,
      attachment_data BYTEA,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS submitted_by_name TEXT`);
  await pool.query(`ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS submitted_by_email TEXT`);
  await pool.query(`ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS suggestion_type TEXT NOT NULL DEFAULT 'Activity'`);
  await pool.query(`ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS suggestion_title TEXT`);
  await pool.query(`ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS reference_url TEXT`);
  await pool.query(`ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS reason TEXT`);
  await pool.query(`ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS attachment_filename TEXT`);
  await pool.query(`ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS attachment_mime TEXT`);
  await pool.query(`ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS attachment_size INTEGER`);
  await pool.query(`ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS attachment_data BYTEA`);
  await pool.query(`ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS practical_schedule (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      event_type TEXT NOT NULL DEFAULT 'Activity',
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      notes TEXT,
      linked_activity_id TEXT,
      linked_url TEXT,
      created_by_email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`ALTER TABLE practical_schedule ADD COLUMN IF NOT EXISTS title TEXT`);
  await pool.query(`ALTER TABLE practical_schedule ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'Activity'`);
  await pool.query(`ALTER TABLE practical_schedule ADD COLUMN IF NOT EXISTS start_date DATE`);
  await pool.query(`ALTER TABLE practical_schedule ADD COLUMN IF NOT EXISTS end_date DATE`);
  await pool.query(`ALTER TABLE practical_schedule ADD COLUMN IF NOT EXISTS notes TEXT`);
  await pool.query(`ALTER TABLE practical_schedule ADD COLUMN IF NOT EXISTS linked_activity_id TEXT`);
  await pool.query(`ALTER TABLE practical_schedule ADD COLUMN IF NOT EXISTS linked_url TEXT`);
  await pool.query(`ALTER TABLE practical_schedule ADD COLUMN IF NOT EXISTS created_by_email TEXT`);
  await pool.query(`ALTER TABLE practical_schedule ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await pool.query(`ALTER TABLE practical_schedule ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_interests (
      project_id TEXT NOT NULL,
      student_email TEXT NOT NULL,
      confirmed BOOLEAN NOT NULL DEFAULT FALSE,
      standard_1 TEXT,
      standard_2 TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (project_id, student_email)
    );
  `);

  await pool.query(`ALTER TABLE project_interests ADD COLUMN IF NOT EXISTS standard_1 TEXT`);
  await pool.query(`ALTER TABLE project_interests ADD COLUMN IF NOT EXISTS standard_2 TEXT`);
}

app.use(express.json({ limit: "8mb" }));
app.use("/images/activities", express.static(path.join(__dirname, "images", "activities")));
app.use("/images/activities", express.static(path.join(__dirname, "public", "images", "activities")));
app.use(express.static(__dirname));

async function canManagePracticalSchedule(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;

  const staffEmailSet = new Set();
  try {
    const staffRows = await getStaffDirectoryRows();
    staffRows.forEach((row) => {
      collectDirectoryEmails(row, ["email_school", "email", "user_email", "staff_email", "google_email"]).forEach((value) => {
        staffEmailSet.add(value);
      });
    });
  } catch (_error) {
  }

  const userRole = await getUserRoleByEmail(normalizedEmail);
  const assignedRole = canonicalizeRoleName(userRole?.additional_role || userRole?.role_name || "");
  const allPermissions = await getMergedRolePermissions();
  const rolePermission = allPermissions.find(
    (row) => canonicalizeRoleName(row.role_name) === assignedRole
  ) || null;

  const roleGrantsTeacherView = ["Admin", "Lead Teacher", "Teacher", "Technician"].includes(assignedRole);
  const canAdmin = Boolean(rolePermission?.admin);
  return Boolean(staffEmailSet.has(normalizedEmail) || roleGrantsTeacherView || canAdmin);
}

async function listPracticalEvents() {
  if (!hasDatabase) {
    return memoryPracticalEvents
      .slice()
      .sort((left, right) => {
        const leftDate = normalizeDateOnly(left.start_date);
        const rightDate = normalizeDateOnly(right.start_date);
        if (leftDate !== rightDate) return leftDate.localeCompare(rightDate);
        return String(left.title || "").localeCompare(String(right.title || ""));
      });
  }

  const result = await pool.query(`
    SELECT id, title, event_type, start_date, end_date, notes, linked_activity_id, linked_url, created_by_email, created_at, updated_at
    FROM practical_schedule
    ORDER BY start_date ASC, title ASC
  `);
  return result.rows;
}

async function getSuggestionRecipients() {
  const recipients = new Set(parseCsvEmails(suggestionNotificationFallback));

  const includeRole = (value) => {
    const role = canonicalizeRoleName(value);
    return ["Admin", "Lead Teacher", "Teacher"].includes(role);
  };

  for (const row of memoryUserRoles.values()) {
    if (includeRole(row.additional_role) || includeRole(row.user_type)) {
      const email = normalizeEmail(row.user_email);
      if (email) recipients.add(email);
    }
  }

  if (!hasDatabase) {
    return Array.from(recipients);
  }

  try {
    const columns = await resolveUserRolesColumns();
    if (!columns.email) {
      return Array.from(recipients);
    }

    const selectColumns = [
      `${quoteIdentifier(columns.email)} AS user_email`,
      columns.userType ? `${quoteIdentifier(columns.userType)} AS user_type` : `'' AS user_type`,
      columns.additionalRole && columns.legacyRoleName && columns.additionalRole !== columns.legacyRoleName
        ? `COALESCE(NULLIF(${quoteIdentifier(columns.additionalRole)}, ''), ${quoteIdentifier(columns.legacyRoleName)}) AS additional_role`
        : columns.additionalRole
          ? `${quoteIdentifier(columns.additionalRole)} AS additional_role`
          : `'' AS additional_role`,
      columns.hubAccess
        ? `${quoteIdentifier(columns.hubAccess)} AS hub_access`
        : `ARRAY['DTECH-HUB']::text[] AS hub_access`
    ];

    const result = await pool.query(`SELECT ${selectColumns.join(", ")} FROM user_additional_roles`);
    result.rows.forEach((row) => {
      if (includeRole(row.additional_role) || includeRole(row.user_type)) {
        const email = normalizeEmail(row.user_email);
        if (email) recipients.add(email);
      }
    });
  } catch (_error) {
  }

  return Array.from(recipients);
}

function buildSuggestionEmailHtml(record) {
  const safe = (value) => String(value || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const referenceCell = record.reference_url
    ? `<a href="${safe(record.reference_url)}">${safe(record.reference_url)}</a>`
    : "N/A";

  return `
    <div style="font-family:Arial,sans-serif;max-width:760px;margin:0 auto;border:1px solid #d4dbe5;border-radius:12px;overflow:hidden;">
      <div style="background:#2f74b9;color:#fff;padding:16px 20px;">
        <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.9;">DTECH HUB</div>
        <h2 style="margin:6px 0 0;font-size:32px;">New ${safe(record.suggestion_type)} Suggestion</h2>
      </div>
      <div style="padding:16px 20px;background:#f8fbff;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px;border:1px solid #d4dbe5;font-weight:700;">Date</td><td style="padding:8px;border:1px solid #d4dbe5;">${safe(new Date(record.created_at).toISOString().slice(0, 10))}</td></tr>
          <tr><td style="padding:8px;border:1px solid #d4dbe5;font-weight:700;">Type</td><td style="padding:8px;border:1px solid #d4dbe5;">${safe(record.suggestion_type)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #d4dbe5;font-weight:700;">Title</td><td style="padding:8px;border:1px solid #d4dbe5;">${safe(record.suggestion_title)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #d4dbe5;font-weight:700;">Suggested By</td><td style="padding:8px;border:1px solid #d4dbe5;">${safe(record.submitted_by_name)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #d4dbe5;font-weight:700;">Email</td><td style="padding:8px;border:1px solid #d4dbe5;">${safe(record.submitted_by_email)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #d4dbe5;font-weight:700;">URL</td><td style="padding:8px;border:1px solid #d4dbe5;">${referenceCell}</td></tr>
        </table>
        <div style="margin-top:14px;">
          <div style="font-weight:700;margin-bottom:6px;">Reason</div>
          <div style="padding:10px;border:1px solid #d4dbe5;border-radius:8px;background:#fff;">${safe(record.reason)}</div>
        </div>
      </div>
    </div>
  `;
}

async function notifySuggestionByEmail(record, attachment) {
  if (!smtpTransporter || !SMTP_FROM) {
    return { status: "not_configured", recipients: [] };
  }

  const recipients = await getSuggestionRecipients();
  if (!recipients.length) {
    return { status: "no_recipients", recipients: [] };
  }

  const mailOptions = {
    from: SMTP_FROM,
    to: recipients.join(","),
    subject: `[Hub Suggestion] ${record.suggestion_type}: ${record.suggestion_title}`,
    html: buildSuggestionEmailHtml(record)
  };

  if (attachment?.buffer?.length) {
    mailOptions.attachments = [
      {
        filename: attachment.originalname || "suggestion.pdf",
        content: attachment.buffer,
        contentType: attachment.mimetype || "application/pdf"
      }
    ];
  }

  await smtpTransporter.sendMail(mailOptions);
  return { status: "sent", recipients };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/activities", async (_req, res) => {
  if (!hasDatabase) {
    const rows = filterDtechActivities(Array.from(memoryActivities.values())).sort((left, right) => {
      return new Date(right.created_at) - new Date(left.created_at);
    });
    res.json(rows);
    return;
  }

  try {
    const result = await pool.query(
      `
        SELECT a.*
        FROM activities a
        LEFT JOIN activity_hub_visibility v
          ON v.activity_id = a.id::text
         AND v.hub_name = $1
        WHERE COALESCE(v.is_visible, TRUE) = TRUE
        ORDER BY a.created_at DESC
      `,
      [DTECH_HUB_NAME]
    );
    res.json(filterDtechActivities(result.rows));
  } catch (error) {
    res.status(500).json({ error: "Could not load activities" });
  }
});

app.get("/api/activities/:id", async (req, res) => {
  if (!hasDatabase) {
    const found = memoryActivities.get(req.params.id);
    if (!found || isExcludedNonDtechActivity(found)) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json(found);
    return;
  }

  try {
    const result = await pool.query(
      `
        SELECT a.*
        FROM activities a
        LEFT JOIN activity_hub_visibility v
          ON v.activity_id = a.id::text
         AND v.hub_name = $1
        WHERE a.id = $2
          AND COALESCE(v.is_visible, TRUE) = TRUE
        LIMIT 1
      `,
      [DTECH_HUB_NAME, req.params.id]
    );
    if (!result.rows.length || isExcludedNonDtechActivity(result.rows[0])) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Could not load activity" });
  }
});

app.post("/api/activities", requireActivityWriteAccess, async (req, res) => {
  const body = req.body || {};
  const name = String(body.name || "").trim();
  const yearLevel = String(body.year_level || "").trim();
  const type = String(body.type || "").trim();
  const durationMinutesInput = Number.parseInt(
    body.duration_minutes ?? body.durationMinutes ?? body.duration_hours,
    10
  );

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
    duration_minutes: Number.isInteger(durationMinutesInput) && durationMinutesInput > 0 ? durationMinutesInput : 1,
    difficulty: String(body.difficulty || "Beginner").trim() || "Beginner",
    subject_stream: String(body.subject_stream || body.subject || "").trim().toUpperCase(),
    card_color: String(body.card_color || "Rose").trim() || "Rose",
    card_url: String(body.card_url || "").trim(),
    outcome_image_url: String(body.outcome_image_url || "").trim(),
    description: String(body.description || "").trim(),
    resources: normalizeArray(body.resources),
    equipment: normalizeArray(body.equipment),
    instructions: normalizeArray(body.instructions),
    class_management_notes: normalizeArray(body.class_management_notes),
    class_preparation: normalizeArray(body.class_preparation),
    assessment_focus: normalizeArray(body.assessment_focus ?? body.tasks_list),
    time_sensitive: Boolean(body.time_sensitive ?? body.timeSensitive),
    show_in_this_week: Boolean(body.show_in_this_week),
    term: String(body.term || "Term 2").trim() || "Term 2",
    created_at: String(body.created_at || new Date().toISOString()),
    updated_at: new Date().toISOString(),
    
    // Proposal fields
    start_date: String(body.start_date || "").trim(),
    contact_name: String(body.contact_name || "").trim(),
    contact_phone: String(body.contact_phone || "").trim(),
    contact_email: String(body.contact_email || "").trim(),
    company: String(body.company || "").trim(),
    address: String(body.address || "").trim(),
    overview: normalizeArray(body.overview),
    services: normalizeArray(body.services),
    costs: normalizeArray(body.costs),
    outcomes: normalizeArray(body.outcomes),
    withdrawal_date: String(body.withdrawal_date || "").trim(),
    client_id: String(body.client_id || "").trim(),
    standard_details: normalizeArray(body.standard_details),
    tasks_list: normalizeArray(body.tasks_list),
    achieved: normalizeArray(body.achieved),
    merit: normalizeArray(body.merit),
    excellence: normalizeArray(body.excellence),
    submission_requirements: normalizeArray(body.submission_requirements),
    relevant_implications: normalizeArray(body.relevant_implications),
    progress_logging: normalizeArray(body.progress_logging),
    feedback_trialling: normalizeArray(body.feedback_trialling)
  };

  if (isExcludedNonDtechActivity(payload)) {
    res.status(400).send("This app only accepts DTECH activities/projects. Sewing Hub content is blocked.");
    return;
  }

  if (!hasDatabase) {
    memoryActivities.set(payload.id, payload);
    res.status(201).json(payload);
    return;
  }

  try {
    const activityColumns = await getAllTableColumns("activities");
    const activityColumnMetadata = await getTableColumnMetadata("activities");
    const idColumn = pickExistingColumn(activityColumns, ["id"]);
    const nameColumn = pickExistingColumn(activityColumns, ["name", "activity_name", "title"]);
    const yearLevelColumn = pickExistingColumn(activityColumns, ["year_level", "year", "yeargroup"]);
    const typeColumn = pickExistingColumn(activityColumns, ["type", "activity_type"]);

    if (!idColumn || !nameColumn || !yearLevelColumn || !typeColumn) {
      res.status(500).send("Could not save activity: activities table is missing one or more required columns (id, name, year_level, type).");
      return;
    }

    const activityCategoryColumn = pickExistingColumn(activityColumns, ["activity_category", "category"]);
    const durationMinutesColumn = pickExistingColumn(activityColumns, ["duration_minutes"]);
    const durationHoursColumn = pickExistingColumn(activityColumns, ["duration_hours"]);
    const durationColumn = pickExistingColumn(activityColumns, ["duration"]);
    const difficultyColumn = pickExistingColumn(activityColumns, ["difficulty", "level"]);
    const subjectStreamColumn = pickExistingColumn(activityColumns, ["subject_stream", "subject", "teaching_subject", "stream"]);
    const cardColorColumn = pickExistingColumn(activityColumns, ["card_color", "card_colour", "color"]);
    const cardUrlColumn = pickExistingColumn(activityColumns, ["card_url", "activity_url", "url"]);
    const outcomeImageColumn = pickExistingColumn(activityColumns, ["outcome_image_url", "image_url", "thumbnail_url"]);
    const descriptionColumn = pickExistingColumn(activityColumns, ["description", "summary"]);
    const resourcesColumn = pickExistingColumn(activityColumns, ["resources"]);
    const equipmentColumn = pickExistingColumn(activityColumns, ["equipment"]);
    const instructionsColumn = pickExistingColumn(activityColumns, ["instructions", "steps"]);
    const classManagementColumn = pickExistingColumn(activityColumns, ["class_management_notes"]);
    const classPreparationColumn = pickExistingColumn(activityColumns, ["class_preparation"]);
    const assessmentFocusColumn = pickExistingColumn(activityColumns, ["assessment_focus"]);
    const timeSensitiveColumn = pickExistingColumn(activityColumns, ["time_sensitive"]);
    const showInWeekColumn = pickExistingColumn(activityColumns, ["show_in_this_week", "show_this_week", "is_pinned", "is_this_week"]);
    const termColumn = pickExistingColumn(activityColumns, ["term"]);
    const updatedAtColumn = pickExistingColumn(activityColumns, ["updated_at", "updatedon", "modified_at"]);
    
    // Proposal fields
    const startDateColumn = pickExistingColumn(activityColumns, ["start_date"]);
    const contactNameColumn = pickExistingColumn(activityColumns, ["contact_name"]);
    const contactPhoneColumn = pickExistingColumn(activityColumns, ["contact_phone"]);
    const contactEmailColumn = pickExistingColumn(activityColumns, ["contact_email"]);
    const companyColumn = pickExistingColumn(activityColumns, ["company"]);
    const addressColumn = pickExistingColumn(activityColumns, ["address"]);
    const overviewColumn = pickExistingColumn(activityColumns, ["overview"]);
    const servicesColumn = pickExistingColumn(activityColumns, ["services"]);
    const costsColumn = pickExistingColumn(activityColumns, ["costs"]);
    const outcomesColumn = pickExistingColumn(activityColumns, ["outcomes"]);
    const withdrawalDateColumn = pickExistingColumn(activityColumns, ["withdrawal_date"]);
    const clientIdColumn = pickExistingColumn(activityColumns, ["client_id"]);
    const standardDetailsColumn = pickExistingColumn(activityColumns, ["standard_details"]);
    const tasksListColumn = pickExistingColumn(activityColumns, ["tasks_list"]);
    const achievedColumn = pickExistingColumn(activityColumns, ["achieved"]);
    const meritColumn = pickExistingColumn(activityColumns, ["merit"]);
    const excellenceColumn = pickExistingColumn(activityColumns, ["excellence"]);
    const submissionRequirementsColumn = pickExistingColumn(activityColumns, ["submission_requirements"]);
    const relevantImplicationsColumn = pickExistingColumn(activityColumns, ["relevant_implications"]);
    const progressLoggingColumn = pickExistingColumn(activityColumns, ["progress_logging"]);
    const feedbackTriallingColumn = pickExistingColumn(activityColumns, ["feedback_trialling"]);

    const idMetadata = idColumn ? activityColumnMetadata.get(String(idColumn).toLowerCase()) : null;
    const idIsInteger = isIntegerLikeColumn(idMetadata);
    const numericBodyId = Number.parseInt(body.id, 10);
    const canUseExplicitId = Boolean(idColumn) && (!idIsInteger || Number.isInteger(numericBodyId));
    const idValueToSave = idIsInteger ? numericBodyId : payload.id;

    const sqlColumns = [
      { name: nameColumn, value: payload.name },
      { name: yearLevelColumn, value: payload.year_level },
      { name: typeColumn, value: payload.type }
    ];

    if (canUseExplicitId) {
      sqlColumns.unshift({ name: idColumn, value: idValueToSave });
    }

    if (activityCategoryColumn) sqlColumns.push({ name: activityCategoryColumn, value: payload.activity_category });
    if (durationMinutesColumn) {
      sqlColumns.push({ name: durationMinutesColumn, value: payload.duration_minutes });
    }
    if (durationHoursColumn) {
      sqlColumns.push({ name: durationHoursColumn, value: payload.duration_minutes / 60 });
    }
    if (durationColumn) {
      sqlColumns.push({ name: durationColumn, value: payload.duration_minutes });
    }
    if (difficultyColumn) sqlColumns.push({ name: difficultyColumn, value: payload.difficulty });
    if (subjectStreamColumn) sqlColumns.push({ name: subjectStreamColumn, value: payload.subject_stream });
    if (cardColorColumn) sqlColumns.push({ name: cardColorColumn, value: payload.card_color });
    if (cardUrlColumn) sqlColumns.push({ name: cardUrlColumn, value: payload.card_url });
    if (outcomeImageColumn) sqlColumns.push({ name: outcomeImageColumn, value: payload.outcome_image_url });
    if (descriptionColumn) sqlColumns.push({ name: descriptionColumn, value: payload.description });
    if (resourcesColumn) sqlColumns.push({ name: resourcesColumn, value: JSON.stringify(payload.resources), cast: "jsonb" });
    if (equipmentColumn) sqlColumns.push({ name: equipmentColumn, value: JSON.stringify(payload.equipment), cast: "jsonb" });
    if (instructionsColumn) sqlColumns.push({ name: instructionsColumn, value: JSON.stringify(payload.instructions), cast: "jsonb" });
    if (classManagementColumn) sqlColumns.push({ name: classManagementColumn, value: JSON.stringify(payload.class_management_notes), cast: "jsonb" });
    if (classPreparationColumn) sqlColumns.push({ name: classPreparationColumn, value: JSON.stringify(payload.class_preparation), cast: "jsonb" });
    if (assessmentFocusColumn) sqlColumns.push({ name: assessmentFocusColumn, value: JSON.stringify(payload.assessment_focus), cast: "jsonb" });
    if (timeSensitiveColumn) sqlColumns.push({ name: timeSensitiveColumn, value: payload.time_sensitive });
    if (showInWeekColumn) sqlColumns.push({ name: showInWeekColumn, value: payload.show_in_this_week });
    if (termColumn) sqlColumns.push({ name: termColumn, value: payload.term });
    
    // Add proposal fields
    if (startDateColumn) sqlColumns.push({ name: startDateColumn, value: payload.start_date });
    if (contactNameColumn) sqlColumns.push({ name: contactNameColumn, value: payload.contact_name });
    if (contactPhoneColumn) sqlColumns.push({ name: contactPhoneColumn, value: payload.contact_phone });
    if (contactEmailColumn) sqlColumns.push({ name: contactEmailColumn, value: payload.contact_email });
    if (companyColumn) sqlColumns.push({ name: companyColumn, value: payload.company });
    if (addressColumn) sqlColumns.push({ name: addressColumn, value: payload.address });
    if (overviewColumn) sqlColumns.push({ name: overviewColumn, value: JSON.stringify(payload.overview), cast: "jsonb" });
    if (servicesColumn) sqlColumns.push({ name: servicesColumn, value: JSON.stringify(payload.services), cast: "jsonb" });
    if (costsColumn) sqlColumns.push({ name: costsColumn, value: JSON.stringify(payload.costs), cast: "jsonb" });
    if (outcomesColumn) sqlColumns.push({ name: outcomesColumn, value: JSON.stringify(payload.outcomes), cast: "jsonb" });
    if (withdrawalDateColumn) sqlColumns.push({ name: withdrawalDateColumn, value: payload.withdrawal_date });
    if (clientIdColumn) sqlColumns.push({ name: clientIdColumn, value: payload.client_id });
    if (standardDetailsColumn) sqlColumns.push({ name: standardDetailsColumn, value: JSON.stringify(payload.standard_details), cast: "jsonb" });
    if (tasksListColumn) sqlColumns.push({ name: tasksListColumn, value: JSON.stringify(payload.tasks_list), cast: "jsonb" });
    if (achievedColumn) sqlColumns.push({ name: achievedColumn, value: JSON.stringify(payload.achieved), cast: "jsonb" });
    if (meritColumn) sqlColumns.push({ name: meritColumn, value: JSON.stringify(payload.merit), cast: "jsonb" });
    if (excellenceColumn) sqlColumns.push({ name: excellenceColumn, value: JSON.stringify(payload.excellence), cast: "jsonb" });
    if (submissionRequirementsColumn) sqlColumns.push({ name: submissionRequirementsColumn, value: JSON.stringify(payload.submission_requirements), cast: "jsonb" });
    if (relevantImplicationsColumn) sqlColumns.push({ name: relevantImplicationsColumn, value: JSON.stringify(payload.relevant_implications), cast: "jsonb" });
    if (progressLoggingColumn) sqlColumns.push({ name: progressLoggingColumn, value: JSON.stringify(payload.progress_logging), cast: "jsonb" });
    if (feedbackTriallingColumn) sqlColumns.push({ name: feedbackTriallingColumn, value: JSON.stringify(payload.feedback_trialling), cast: "jsonb" });

    const insertColumnsSql = sqlColumns.map((column) => quoteIdentifier(column.name)).join(", ");
    const insertValuesSql = sqlColumns
      .map((column, index) => `$${index + 1}${column.cast ? `::${column.cast}` : ""}`)
      .join(", ");
    const updateAssignments = sqlColumns
      .filter((column) => column.name !== idColumn)
      .map((column) => `${quoteIdentifier(column.name)} = EXCLUDED.${quoteIdentifier(column.name)}`);

    if (updatedAtColumn) {
      updateAssignments.push(`${quoteIdentifier(updatedAtColumn)} = NOW()`);
    }

    const updateSql = updateAssignments.length
      ? updateAssignments.join(",\n              ")
      : `${quoteIdentifier(nameColumn)} = EXCLUDED.${quoteIdentifier(nameColumn)}`;

    const insertColumnsWithAudit = updatedAtColumn
      ? `${insertColumnsSql},\n          ${quoteIdentifier(updatedAtColumn)}`
      : insertColumnsSql;

    const insertValuesWithAudit = updatedAtColumn
      ? `${insertValuesSql},\n          NOW()`
      : insertValuesSql;

    const result = canUseExplicitId
      ? await pool.query(
          `
            INSERT INTO activities (
              ${insertColumnsWithAudit}
            ) VALUES (
              ${insertValuesWithAudit}
            )
            ON CONFLICT (${quoteIdentifier(idColumn)}) DO UPDATE SET
              ${updateSql},
              ${quoteIdentifier(idColumn)} = EXCLUDED.${quoteIdentifier(idColumn)}
            RETURNING *
          `,
          sqlColumns.map((column) => column.value)
        )
      : await pool.query(
          `
            INSERT INTO activities (
              ${insertColumnsWithAudit}
            ) VALUES (
              ${insertValuesWithAudit}
            )
            RETURNING *
          `,
          sqlColumns.map((column) => column.value)
        );

    await upsertHubVisibility([result.rows[0].id], DTECH_HUB_NAME, true);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    const detail = String(error?.message || "Could not save activity");
    res.status(500).send(`Could not save activity: ${detail}`);
  }
});

app.delete("/api/activities/:id", requireActivityWriteAccess, async (req, res) => {
  const requestedId = String(req.params.id || "").trim();
  if (!requestedId) {
    res.status(400).json({ error: "Activity ID is required" });
    return;
  }

  if (!hasDatabase) {
    const deleted = memoryActivities.delete(requestedId);
    if (!deleted) {
      res.status(404).json({ error: "Activity not found" });
      return;
    }

    res.status(200).json({ ok: true, id: requestedId });
    return;
  }

  try {
    const result = await pool.query(
      `
        DELETE FROM activities
        WHERE id::text = $1
        RETURNING id
      `,
      [requestedId]
    );

    if (!result.rows.length) {
      res.status(404).json({ error: "Activity not found" });
      return;
    }

    try {
      await pool.query(
        `DELETE FROM activity_hub_visibility WHERE activity_id = $1`,
        [requestedId]
      );
    } catch (_visibilityError) {
    }

    res.status(200).json({ ok: true, id: String(result.rows[0].id) });
  } catch (error) {
    res.status(500).json({ error: "Could not delete activity" });
  }
});

app.delete("/api/activities", requireActivityWriteAccess, async (_req, res) => {
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

app.post("/api/activities/:id/upload-image", requireActivityWriteAccess, async (req, res) => {
  const activityId = String(req.params.id || "").trim();
  const body = req.body || {};
  const imageData = String(body.image_data || "").trim();

  if (!activityId) {
    res.status(400).json({ error: "Activity ID is required" });
    return;
  }

  if (!imageData || !imageData.startsWith("data:image/")) {
    res.status(400).json({ error: "Invalid image data" });
    return;
  }

  try {
    const matches = imageData.match(/^data:image\/([a-z]+);base64,(.+)$/i);
    if (!matches) {
      res.status(400).json({ error: "Invalid base64 image format" });
      return;
    }

    // Persist as a data URL so hosted deploys do not lose files on restart/redeploy.
    res.status(200).json({ image_url: imageData });
  } catch (error) {
    console.error("Image upload error:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

// POST /api/activities/:id/interest — toggle a student's interest in a project
app.post("/api/activities/:id/interest", async (req, res) => {
  const projectId = String(req.params.id || "").trim();
  const email = normalizeEmail(req.headers["x-user-email"] || "");

  if (!projectId) {
    res.status(400).json({ error: "Project ID is required" });
    return;
  }

  if (!email || !email.endsWith(`@${SCHOOL_EMAIL_DOMAIN}`)) {
    res.status(401).json({ error: "School sign-in required" });
    return;
  }

  if (!hasDatabase) {
    res.json({ interested: true, count: 1 });
    return;
  }

  try {
    const existing = await pool.query(
      "SELECT 1 FROM project_interests WHERE project_id = $1 AND student_email = $2",
      [projectId, email]
    );

    let interested;
    if (existing.rows.length) {
      await pool.query(
        "DELETE FROM project_interests WHERE project_id = $1 AND student_email = $2",
        [projectId, email]
      );
      interested = false;
    } else {
      await pool.query(
        "INSERT INTO project_interests (project_id, student_email) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [projectId, email]
      );
      interested = true;
    }

    const countResult = await pool.query(
      "SELECT COUNT(*)::int AS count FROM project_interests WHERE project_id = $1",
      [projectId]
    );
    res.json({ interested, count: countResult.rows[0].count });
  } catch (error) {
    console.error("Interest toggle error:", error);
    res.status(500).json({ error: "Could not update interest" });
  }
});

// POST /api/activities/:id/interests — teacher assigns a student to this task/project
app.post("/api/activities/:id/interests", requireActivityWriteAccess, async (req, res) => {
  const projectId = String(req.params.id || "").trim();
  const rawStudentEmail = String(req.body?.student_email || req.body?.studentEmail || "").trim();
  const studentEmail = normalizeEmail(rawStudentEmail);

  if (!projectId || !studentEmail) {
    res.status(400).json({ error: "Project ID and student email are required" });
    return;
  }

  if (!studentEmail.endsWith(`@${SCHOOL_EMAIL_DOMAIN}`)) {
    res.status(400).json({ error: `Student email must end with @${SCHOOL_EMAIL_DOMAIN}` });
    return;
  }

  if (!hasDatabase) {
    res.status(201).json({ ok: true, student_email: studentEmail });
    return;
  }

  try {
    await pool.query(
      "INSERT INTO project_interests (project_id, student_email) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [projectId, studentEmail]
    );

    const countResult = await pool.query(
      "SELECT COUNT(*)::int AS count FROM project_interests WHERE project_id = $1",
      [projectId]
    );

    res.status(201).json({
      ok: true,
      student_email: studentEmail,
      count: Number(countResult.rows?.[0]?.count || 0)
    });
  } catch (error) {
    res.status(500).json({ error: "Could not add student interest" });
  }
});

// GET /api/activities/:id/interests — get interest count/list for a project
app.get("/api/activities/:id/interests", async (req, res) => {
  const projectId = String(req.params.id || "").trim();
  const email = normalizeEmail(req.headers["x-user-email"] || "");

  if (!projectId) {
    res.status(400).json({ error: "Project ID is required" });
    return;
  }

  if (!hasDatabase) {
    res.json({ count: 0, my_interest: false, emails: [], confirmed: [] });
    return;
  }

  try {
    const result = await pool.query(
      "SELECT student_email, confirmed, standard_1, standard_2 FROM project_interests WHERE project_id = $1 ORDER BY created_at ASC",
      [projectId]
    );

    let isTeacher = false;
    if (email) {
      try {
        const access = await resolveActivityWriteAccess(email);
        isTeacher = Boolean(access.allowed);
      } catch (_err) {}
    }

    const myInterest = email ? result.rows.some((r) => r.student_email === email) : false;
    res.json({
      count: result.rows.length,
      my_interest: myInterest,
      emails: isTeacher ? result.rows.map((r) => r.student_email) : [],
      confirmed: isTeacher ? result.rows.filter((r) => r.confirmed).map((r) => r.student_email) : [],
      students: isTeacher
        ? result.rows.map((r) => ({
          email: r.student_email,
          confirmed: Boolean(r.confirmed),
          standard_1: String(r.standard_1 || "").trim(),
          standard_2: String(r.standard_2 || "").trim()
        }))
        : []
    });
  } catch (error) {
    res.status(500).json({ error: "Could not load interests" });
  }
});

// PATCH /api/activities/:id/interests/:studentEmail/confirm — teacher confirm/unconfirm allocation
app.patch("/api/activities/:id/interests/:studentEmail/confirm", requireActivityWriteAccess, async (req, res) => {
  const projectId = String(req.params.id || "").trim();
  const studentEmail = normalizeEmail(req.params.studentEmail || "");
  const confirmed = req.body?.confirmed !== false;

  if (!projectId || !studentEmail) {
    res.status(400).json({ error: "Project ID and student email are required" });
    return;
  }

  if (!hasDatabase) {
    res.json({ confirmed });
    return;
  }

  try {
    await pool.query(
      "UPDATE project_interests SET confirmed = $1 WHERE project_id = $2 AND student_email = $3",
      [confirmed, projectId, studentEmail]
    );
    res.json({ confirmed });
  } catch (error) {
    res.status(500).json({ error: "Could not update confirmation" });
  }
});

// PATCH /api/activities/:id/interests/:studentEmail/standards — teacher assigns up to 2 standards
app.patch("/api/activities/:id/interests/:studentEmail/standards", requireActivityWriteAccess, async (req, res) => {
  const projectId = String(req.params.id || "").trim();
  const studentEmail = normalizeEmail(req.params.studentEmail || "");
  const standard1 = String(req.body?.standard_1 || req.body?.standard1 || "").trim();
  const standard2 = String(req.body?.standard_2 || req.body?.standard2 || "").trim();

  if (!projectId || !studentEmail) {
    res.status(400).json({ error: "Project ID and student email are required" });
    return;
  }

  if (!hasDatabase) {
    res.json({ standard_1: standard1, standard_2: standard2 });
    return;
  }

  try {
    await pool.query(
      "UPDATE project_interests SET standard_1 = $1, standard_2 = $2 WHERE project_id = $3 AND student_email = $4",
      [standard1 || null, standard2 || null, projectId, studentEmail]
    );
    res.json({ standard_1: standard1, standard_2: standard2 });
  } catch (error) {
    res.status(500).json({ error: "Could not update standards" });
  }
});

// DELETE /api/activities/:id/interests/:studentEmail — teacher removes a student's interest
app.delete("/api/activities/:id/interests/:studentEmail", requireActivityWriteAccess, async (req, res) => {
  const projectId = String(req.params.id || "").trim();
  const studentEmail = normalizeEmail(req.params.studentEmail || "");

  if (!projectId || !studentEmail) {
    res.status(400).json({ error: "Project ID and student email are required" });
    return;
  }

  if (!hasDatabase) {
    res.status(204).send();
    return;
  }

  try {
    await pool.query(
      "DELETE FROM project_interests WHERE project_id = $1 AND student_email = $2",
      [projectId, studentEmail]
    );
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Could not remove interest" });
  }
});

// GET /api/project-interests — all projects with interest summaries (teacher-only)
app.get("/api/project-interests", requireActivityWriteAccess, async (_req, res) => {
  if (!hasDatabase) {
    res.json([]);
    return;
  }

  try {
    const result = await pool.query(`
      SELECT
        pi.project_id,
        MAX(a.name) AS project_name,
        COUNT(*)::int AS interest_count,
        COUNT(*) FILTER (WHERE pi.confirmed)::int AS confirmed_count,
        json_agg(
          json_build_object(
            'email', pi.student_email,
            'student_email', pi.student_email,
            'confirmed', pi.confirmed,
            'standard_1', pi.standard_1,
            'standard_2', pi.standard_2,
            'created_at', pi.created_at
          )
        ) FILTER (WHERE pi.student_email IS NOT NULL) AS students
      FROM project_interests pi
      LEFT JOIN activities a ON a.id::text = pi.project_id
      GROUP BY pi.project_id
      ORDER BY interest_count DESC
    `);

    res.json(result.rows.map((row) => ({
      project_id: row.project_id,
      project_name: row.project_name || row.project_id,
      interest_count: row.interest_count,
      confirmed_count: row.confirmed_count,
      students: Array.isArray(row.students) ? row.students.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)) : []
    })));
  } catch (error) {
    console.error("[project-interests] Query failed:", error.message);
    res.status(500).json({ error: "Could not load project interests" });
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

app.get("/api/timetable/all", async (_req, res) => {
  try {
    const rows = await getTeacherTimetableRows();
    res.json({ timetable: rows });
  } catch (_error) {
    res.json({ timetable: [] });
  }
});

app.get("/api/class-management/students", async (req, res) => {
  const userEmail = getRequestUserEmail(req);
  if (!userEmail || !(await canManagePracticalSchedule(userEmail))) {
    res.status(403).json({ error: "Teacher/Admin access is required." });
    return;
  }

  try {
    const rows = await getStudentDirectoryRows();
    const normalizedRows = rows.map(buildStudentClassManagementRow);
    const currentOnly = String(req.query?.current_only || "true").toLowerCase() !== "false";
    const dtechOnly = String(req.query?.dtech_only || "false").toLowerCase() === "true";

    const filteredRows = normalizedRows.filter((row) => {
      if (currentOnly && String(row.status || "").toLowerCase() === "not current") {
        return false;
      }
      if (dtechOnly && !row.has_dtech) {
        return false;
      }
      return true;
    });

    res.json({
      students: filteredRows,
      summary: {
        total_students: filteredRows.length,
        dtech_students: filteredRows.filter((row) => row.has_dtech).length,
        current_only: currentOnly,
        dtech_only: dtechOnly
      }
    });
  } catch (_error) {
    res.status(500).json({ error: "Could not load class management students" });
  }
});

app.get("/api/practicals/events", async (_req, res) => {
  try {
    const rows = await listPracticalEvents();
    res.json(rows);
  } catch (_error) {
    res.status(500).json({ error: "Could not load practical events" });
  }
});

app.post("/api/practicals/events", async (req, res) => {
  const title = String(req.body?.title || "").trim();
  const eventTypeRaw = String(req.body?.event_type || "Activity").trim();
  const eventType = eventTypeRaw.toLowerCase().includes("project") ? "Project" : "Activity";
  const startDate = normalizeDateOnly(req.body?.start_date);
  const endDateInput = normalizeDateOnly(req.body?.end_date);
  const endDate = endDateInput || startDate;
  const notes = String(req.body?.notes || "").trim();
  const linkedActivityId = String(req.body?.linked_activity_id || "").trim();
  const linkedUrl = String(req.body?.linked_url || "").trim();
  const createdByEmail = normalizeEmail(req.body?.user_email);

  if (!title || !startDate) {
    res.status(400).json({ error: "title and start_date are required" });
    return;
  }

  if (!createdByEmail || !(await canManagePracticalSchedule(createdByEmail))) {
    res.status(403).json({ error: "Only Teacher/Admin users can add calendar events" });
    return;
  }

  if (!hasDatabase) {
    const row = {
      id: memoryPracticalEventId++,
      title,
      event_type: eventType,
      start_date: startDate,
      end_date: endDate,
      notes,
      linked_activity_id: linkedActivityId || null,
      linked_url: linkedUrl || null,
      created_by_email: createdByEmail,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    memoryPracticalEvents.push(row);
    res.status(201).json(row);
    return;
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO practical_schedule (
          title, event_type, start_date, end_date, notes, linked_activity_id, linked_url, created_by_email, created_at, updated_at
        ) VALUES (
          $1, $2, $3::date, $4::date, $5, $6, $7, $8, NOW(), NOW()
        )
        RETURNING id, title, event_type, start_date, end_date, notes, linked_activity_id, linked_url, created_by_email, created_at, updated_at
      `,
      [title, eventType, startDate, endDate, notes, linkedActivityId || null, linkedUrl || null, createdByEmail]
    );
    res.status(201).json(result.rows[0]);
  } catch (_error) {
    res.status(500).json({ error: "Could not save practical event" });
  }
});

app.delete("/api/practicals/events/:id", async (req, res) => {
  const eventId = Number.parseInt(req.params.id, 10);
  const userEmail = normalizeEmail(req.query.user_email || req.body?.user_email);

  if (!Number.isInteger(eventId) || eventId <= 0) {
    res.status(400).json({ error: "invalid event id" });
    return;
  }

  if (!userEmail || !(await canManagePracticalSchedule(userEmail))) {
    res.status(403).json({ error: "Only Teacher/Admin users can delete calendar events" });
    return;
  }

  if (!hasDatabase) {
    const index = memoryPracticalEvents.findIndex((row) => Number(row.id) === eventId);
    if (index < 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    memoryPracticalEvents.splice(index, 1);
    res.status(204).send();
    return;
  }

  try {
    const result = await pool.query("DELETE FROM practical_schedule WHERE id = $1", [eventId]);
    if (!result.rowCount) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).send();
  } catch (_error) {
    res.status(500).json({ error: "Could not delete practical event" });
  }
});

app.get("/api/practicals/calendar.ics", async (_req, res) => {
  try {
    const rows = await listPracticalEvents();
    const ics = buildIcsCalendar(rows);
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", "inline; filename=Browse-Practicals.ics");
    res.send(ics);
  } catch (_error) {
    res.status(500).send("Could not generate calendar feed");
  }
});

app.post("/api/suggestions", suggestionUpload.single("attachment"), async (req, res) => {
  const submittedByName = String(req.body?.submitted_by_name || "").trim();
  const submittedByEmail = normalizeEmail(req.body?.submitted_by_email);
  const suggestionTypeRaw = String(req.body?.suggestion_type || "Activity").trim();
  const suggestionType = suggestionTypeRaw.toLowerCase().includes("project") ? "Project" : "Activity";
  const suggestionTitle = String(req.body?.suggestion_title || "").trim();
  const referenceUrl = String(req.body?.reference_url || "").trim();
  const reason = String(req.body?.reason || "").trim();
  const attachment = req.file || null;

  if (!submittedByName || !submittedByEmail || !suggestionTitle || !reason) {
    res.status(400).json({ error: "name, email, title and reason are required" });
    return;
  }

  const suggestionRecord = {
    submitted_by_name: submittedByName,
    submitted_by_email: submittedByEmail,
    suggestion_type: suggestionType,
    suggestion_title: suggestionTitle,
    reference_url: referenceUrl,
    reason,
    attachment_filename: attachment?.originalname || null,
    attachment_mime: attachment?.mimetype || null,
    attachment_size: attachment?.size || null,
    created_at: new Date().toISOString()
  };

  if (!hasDatabase) {
    const memoryRow = {
      id: memorySuggestionId++,
      ...suggestionRecord,
      attachment_data: attachment?.buffer || null
    };
    memorySuggestions.unshift(memoryRow);

    try {
      const emailResult = await notifySuggestionByEmail(memoryRow, attachment);
      res.status(201).json({ ok: true, id: memoryRow.id, email_status: emailResult.status, recipients: emailResult.recipients.length });
    } catch (_error) {
      res.status(201).json({ ok: true, id: memoryRow.id, email_status: "failed", recipients: 0 });
    }
    return;
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO suggestions (
          submitted_by_name,
          submitted_by_email,
          suggestion_type,
          suggestion_title,
          reference_url,
          reason,
          attachment_filename,
          attachment_mime,
          attachment_size,
          attachment_data,
          created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()
        )
        RETURNING id, submitted_by_name, submitted_by_email, suggestion_type, suggestion_title, reference_url, reason,
                  attachment_filename, attachment_mime, attachment_size, created_at
      `,
      [
        submittedByName,
        submittedByEmail,
        suggestionType,
        suggestionTitle,
        referenceUrl,
        reason,
        attachment?.originalname || null,
        attachment?.mimetype || null,
        attachment?.size || null,
        attachment?.buffer || null
      ]
    );

    const savedRow = result.rows[0];

    try {
      const emailResult = await notifySuggestionByEmail(savedRow, attachment);
      res.status(201).json({ ok: true, id: savedRow.id, email_status: emailResult.status, recipients: emailResult.recipients.length });
    } catch (_error) {
      res.status(201).json({ ok: true, id: savedRow.id, email_status: "failed", recipients: 0 });
    }
  } catch (error) {
    res.status(500).json({ error: "Could not save suggestion" });
  }
});

app.get("/api/admin/suggestions", async (_req, res) => {
  if (!hasDatabase) {
    res.json(memorySuggestions.map((row) => ({
      id: row.id,
      created_at: row.created_at,
      suggestion_type: row.suggestion_type,
      suggestion_title: row.suggestion_title,
      submitted_by_name: row.submitted_by_name,
      submitted_by_email: row.submitted_by_email,
      reference_url: row.reference_url,
      reason: row.reason,
      has_attachment: Boolean(row.attachment_data),
      attachment_filename: row.attachment_filename
    })));
    return;
  }

  try {
    const result = await pool.query(
      `
        SELECT
          id,
          created_at,
          suggestion_type,
          suggestion_title,
          submitted_by_name,
          submitted_by_email,
          reference_url,
          reason,
          attachment_filename,
          COALESCE(OCTET_LENGTH(attachment_data), 0) > 0 AS has_attachment
        FROM suggestions
        ORDER BY created_at DESC, id DESC
      `
    );

    res.json(result.rows);
  } catch (_error) {
    res.status(500).json({ error: "Could not load suggestions" });
  }
});

app.get("/api/admin/suggestions/:id/attachment", async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).send("invalid id");
    return;
  }

  if (!hasDatabase) {
    const row = memorySuggestions.find((item) => Number(item.id) === id);
    if (!row?.attachment_data) {
      res.status(404).send("attachment not found");
      return;
    }

    res.setHeader("Content-Type", row.attachment_mime || "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${row.attachment_filename || `suggestion-${id}.pdf`}"`);
    res.send(row.attachment_data);
    return;
  }

  try {
    const result = await pool.query(
      `
        SELECT attachment_data, attachment_filename, attachment_mime
        FROM suggestions
        WHERE id = $1
        LIMIT 1
      `,
      [id]
    );

    if (!result.rows.length || !result.rows[0].attachment_data) {
      res.status(404).send("attachment not found");
      return;
    }

    const row = result.rows[0];
    res.setHeader("Content-Type", row.attachment_mime || "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${row.attachment_filename || `suggestion-${id}.pdf`}"`);
    res.send(row.attachment_data);
  } catch (_error) {
    res.status(500).send("Could not download attachment");
  }
});

app.get("/api/auth/user-access", async (req, res) => {
  const email = normalizeEmail(req.query.email);
  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }

  const staffEmailSet = new Set();
  const studentEmailSet = new Set();

  try {
    const staffRows = await getStaffDirectoryRows();
    staffRows.forEach((row) => {
      collectDirectoryEmails(row, ["email_school", "email", "user_email", "staff_email", "google_email"]).forEach((value) => {
        staffEmailSet.add(value);
      });
    });
  } catch (_error) {
  }

  try {
    const studentRows = await getStudentDirectoryRows();
    studentRows.forEach((row) => {
      collectDirectoryEmails(
        row,
        [
          "email_school",
          "student_email",
          "email",
          "email_address",
          "school_email",
          "google_email",
          "student_google_email",
          "student_mail",
          "mail",
          "upn"
        ],
        ["username", "user_name", "student_username", "login", "student_login"]
      ).forEach((value) => {
        studentEmailSet.add(value);
      });
    });
  } catch (_error) {
  }

  const userRole = await getUserRoleByEmail(email);
  const assignedRole = canonicalizeRoleName(userRole?.additional_role || userRole?.role_name || "");
  const allPermissions = await getMergedRolePermissions();
  const rolePermission = allPermissions.find(
    (row) => canonicalizeRoleName(row.role_name) === assignedRole
  ) || null;

  const canonicalEmail = canonicalizeEmail(email);
  const canonicalStaffEmailSet = new Set(Array.from(staffEmailSet).map((value) => canonicalizeEmail(value)).filter(Boolean));
  const canonicalStudentEmailSet = new Set(Array.from(studentEmailSet).map((value) => canonicalizeEmail(value)).filter(Boolean));
  const isStaff = staffEmailSet.has(email) || (canonicalEmail ? canonicalStaffEmailSet.has(canonicalEmail) : false);
  const isStudent = studentEmailSet.has(email) || (canonicalEmail ? canonicalStudentEmailSet.has(canonicalEmail) : false);
  const roleGrantsTeacherView = ["Admin", "Lead Teacher", "Teacher", "Technician"].includes(assignedRole);
  const canAdmin = Boolean(rolePermission?.admin);

  let canTeacherView = Boolean(isStaff || roleGrantsTeacherView || canAdmin);
  if (isStudent && !isStaff && !roleGrantsTeacherView && !canAdmin) {
    canTeacherView = false;
  }

  res.json({
    email,
    is_staff: isStaff,
    is_student: isStudent,
    additional_role: assignedRole || null,
    can_teacher_view: canTeacherView,
    can_admin: canAdmin,
    default_view: canTeacherView ? "teacher" : "student"
  });
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
      columns.additionalRole && columns.legacyRoleName && columns.additionalRole !== columns.legacyRoleName
        ? `COALESCE(NULLIF(${quoteIdentifier(columns.additionalRole)}, ''), ${quoteIdentifier(columns.legacyRoleName)}) AS additional_role`
        : columns.additionalRole
          ? `${quoteIdentifier(columns.additionalRole)} AS additional_role`
          : `'' AS additional_role`,
      columns.hubAccess
        ? `${quoteIdentifier(columns.hubAccess)} AS hub_access`
        : `ARRAY['DTECH-HUB']::text[] AS hub_access`
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
  const hubAccessInput = Array.isArray(body.hub_access)
    ? body.hub_access
    : String(body.hub_access || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
  const hubAccess = Array.from(new Set(hubAccessInput.length ? hubAccessInput : ["DTECH-HUB"]));

  if (!userType || !userEmail || !additionalRole) {
    res.status(400).send("user_type, user_email and additional_role are required");
    return;
  }

  const payload = {
    user_type: userType,
    user_email: userEmail,
    display_name: displayName,
    additional_role: additionalRole,
    hub_access: hubAccess
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
    if (columns.legacyRoleName && columns.legacyRoleName !== columns.additionalRole) {
      updateAssignments.push(`role_name = $${updateValues.length + 1}`);
      updateValues.push(additionalRole);
    }
    if (columns.hubAccess) {
      updateAssignments.push(`hub_access = $${updateValues.length + 1}`);
      updateValues.push(hubAccess);
    }
    if (columns.updatedAt) {
      updateAssignments.push("updated_at = NOW()");
    }

    const returnColumns = [
      columns.userType ? `${quoteIdentifier(columns.userType)} AS user_type` : `'Staff' AS user_type`,
      `${quoteIdentifier(columns.email)} AS user_email`,
      columns.displayName ? `${quoteIdentifier(columns.displayName)} AS display_name` : `'' AS display_name`,
      columns.additionalRole && columns.legacyRoleName && columns.additionalRole !== columns.legacyRoleName
        ? `COALESCE(NULLIF(${quoteIdentifier(columns.additionalRole)}, ''), ${quoteIdentifier(columns.legacyRoleName)}) AS additional_role`
        : columns.additionalRole
          ? `${quoteIdentifier(columns.additionalRole)} AS additional_role`
          : `'' AS additional_role`,
      columns.hubAccess
        ? `${quoteIdentifier(columns.hubAccess)} AS hub_access`
        : `ARRAY['DTECH-HUB']::text[] AS hub_access`
    ];

    const updateSqlAssignments = updateAssignments
      .map((assignment) => assignment
        .replace("user_type", columns.userType ? quoteIdentifier(columns.userType) : "user_type")
        .replace("display_name", columns.displayName ? quoteIdentifier(columns.displayName) : "display_name")
        .replace("additional_role", columns.additionalRole ? quoteIdentifier(columns.additionalRole) : "additional_role")
        .replace("role_name", columns.legacyRoleName ? quoteIdentifier(columns.legacyRoleName) : "role_name")
        .replace("hub_access", columns.hubAccess ? quoteIdentifier(columns.hubAccess) : "hub_access")
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
      if (columns.legacyRoleName && columns.legacyRoleName !== columns.additionalRole) {
        insertColumns.push(quoteIdentifier(columns.legacyRoleName));
        insertValues.push(additionalRole);
      }
      if (columns.hubAccess) {
        insertColumns.push(quoteIdentifier(columns.hubAccess));
        insertValues.push(hubAccess);
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
  try {
    const permissions = await getMergedRolePermissions();
    res.json(permissions);
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
  .then(() => syncDtechExcludedActivitiesVisibility())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`DTECH-HUB running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize schema", error);
    process.exit(1);
  });
