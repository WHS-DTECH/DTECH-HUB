const path = require("path");
const express = require("express");
const multer = require("multer");
const mammoth = require("mammoth");
const nodemailer = require("nodemailer");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;
const SERVER_STARTED_AT = new Date().toISOString();
const hasDatabase = Boolean(process.env.DATABASE_URL);
const staffDirectoryApiUrl = String(process.env.STAFF_DIRECTORY_API_URL || "").trim();
const staffDirectoryApiKey = String(process.env.STAFF_DIRECTORY_API_KEY || "").trim();
const memoryActivities = new Map();
const memoryUnitPlans = new Map();
const memoryUserRoles = new Map();
const memoryStaffDirectory = new Map();
const memoryLessons = new Map();
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
const NZQA_BASE_URL = "https://www.nzqa.govt.nz";
const NZQA_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const nzqaStandardsCache = new Map();
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

const unitPlanUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const mime = String(file.mimetype || "").toLowerCase();
    const name = String(file.originalname || "").toLowerCase();
    const isDocxMime = mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const isDocxName = name.endsWith(".docx");
    callback(null, isDocxMime || isDocxName);
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

function quoteIdentifier(value) {
  return `"${String(value || "").replace(/"/g, '""')}"`;
}

function canonicalizeEmail(value) {
  const email = normalizeEmail(value);
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) {
    return email;
  }

  const localPart = email.slice(0, atIndex).replace(/\+.*/, "");
  const domain = email.slice(atIndex + 1);
  return `${localPart}@${domain}`;
}

function canonicalizeRoleName(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  const aliasKey = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (ROLE_NAME_ALIASES.has(aliasKey)) {
    return ROLE_NAME_ALIASES.get(aliasKey);
  }

  const words = raw
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

  return words;
}

function mergeRolePermissionRows(rows) {
  const mergedByRole = new Map();

  const seedRows = Array.isArray(DEFAULT_ROLE_PERMISSIONS) ? DEFAULT_ROLE_PERMISSIONS : [];
  seedRows.forEach((row) => {
    const roleName = canonicalizeRoleName(row?.role_name);
    if (!roleName) {
      return;
    }

    mergedByRole.set(roleName, {
      role_name: roleName,
      home_page: Boolean(row?.home_page),
      upload_activity: Boolean(row?.upload_activity),
      browse_activities: Boolean(row?.browse_activities),
      planning: Boolean(row?.planning),
      admin: Boolean(row?.admin)
    });
  });

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const roleName = canonicalizeRoleName(row?.role_name);
    if (!roleName) {
      return;
    }

    mergedByRole.set(roleName, {
      role_name: roleName,
      home_page: Boolean(row?.home_page),
      upload_activity: Boolean(row?.upload_activity),
      browse_activities: Boolean(row?.browse_activities),
      planning: Boolean(row?.planning),
      admin: Boolean(row?.admin)
    });
  });

  return Array.from(mergedByRole.values()).sort((left, right) => {
    const leftIndex = DEFAULT_ROLE_ORDER.findIndex((value) => value === left.role_name);
    const rightIndex = DEFAULT_ROLE_ORDER.findIndex((value) => value === right.role_name);
    const safeLeft = leftIndex >= 0 ? leftIndex : Number.MAX_SAFE_INTEGER;
    const safeRight = rightIndex >= 0 ? rightIndex : Number.MAX_SAFE_INTEGER;
    if (safeLeft !== safeRight) {
      return safeLeft - safeRight;
    }
    return String(left.role_name || "").localeCompare(String(right.role_name || ""));
  });
}

async function resolveUserRolesColumns() {
  const fallbackColumns = {
    email: "user_email",
    userType: "user_type",
    displayName: "display_name",
    additionalRole: "additional_role",
    legacyRoleName: "role_name",
    hubAccess: "hub_access",
    updatedAt: "updated_at"
  };

  if (!hasDatabase) {
    return fallbackColumns;
  }

  try {
    const result = await pool.query(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_additional_roles'
      `
    );

    const available = new Set(result.rows.map((row) => String(row.column_name || "")));
    const pick = (candidates) => candidates.find((name) => available.has(name)) || null;

    return {
      email: pick(["user_email", "email", "staff_email", "google_email"]),
      userType: pick(["user_type", "type"]),
      displayName: pick(["display_name", "name", "full_name"]),
      additionalRole: pick(["additional_role", "role", "role_name"]),
      legacyRoleName: pick(["role_name"]),
      hubAccess: pick(["hub_access"]),
      updatedAt: pick(["updated_at", "modified_at", "created_at"])
    };
  } catch (_error) {
    return fallbackColumns;
  }
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

  const exactMemory = memoryUserRoles.get(normalizedEmail);
  if (exactMemory) {
    return exactMemory;
  }

  const canonicalEmail = canonicalizeEmail(normalizedEmail);

  for (const row of memoryUserRoles.values()) {
    const rowEmail = normalizeEmail(row?.user_email || row?.email || "");
    if (rowEmail && canonicalizeEmail(rowEmail) === canonicalEmail) {
      return row;
    }
  }

  if (!hasDatabase) {
    return null;
  }

  try {
    const columns = await resolveUserRolesColumns();
    if (!columns.email) {
      return null;
    }

    const selectColumns = [
      `${quoteIdentifier(columns.email)} AS user_email`,
      columns.userType ? `${quoteIdentifier(columns.userType)} AS user_type` : `'' AS user_type`,
      columns.displayName ? `${quoteIdentifier(columns.displayName)} AS display_name` : `'' AS display_name`,
      columns.additionalRole && columns.legacyRoleName && columns.additionalRole !== columns.legacyRoleName
        ? `COALESCE(NULLIF(${quoteIdentifier(columns.additionalRole)}, ''), ${quoteIdentifier(columns.legacyRoleName)}) AS additional_role`
        : columns.additionalRole
          ? `${quoteIdentifier(columns.additionalRole)} AS additional_role`
          : `'' AS additional_role`,
      columns.legacyRoleName ? `${quoteIdentifier(columns.legacyRoleName)} AS role_name` : `'' AS role_name`,
      columns.hubAccess ? `${quoteIdentifier(columns.hubAccess)} AS hub_access` : `ARRAY['DTECH-HUB']::text[] AS hub_access`
    ];

    const result = await pool.query(
      `
        SELECT ${selectColumns.join(", ")}
        FROM user_additional_roles
        WHERE LOWER(${quoteIdentifier(columns.email)}) = LOWER($1)
        LIMIT 1
      `,
      [normalizedEmail]
    );

    const row = result.rows[0] || null;
    if (row) {
      memoryUserRoles.set(normalizedEmail, row);
    }
    return row;
  } catch (_error) {
    return null;
  }
}

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

function isExcludedNonDtechActivity(_activity) {
  // Visibility is already controlled by activity_hub_visibility in SQL.
  // Keep this helper to avoid runtime failures in routes that call it.
  return false;
}

function filterDtechActivities(rows) {
  return (Array.isArray(rows) ? rows : []).filter((row) => !isExcludedNonDtechActivity(row));
}

function normalizeUnitLessons(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((lesson, index) => {
    const lessonIndex = Number.parseInt(lesson?.lesson_index ?? lesson?.lessonIndex ?? index + 1, 10);

    return {
      lesson_index: Number.isInteger(lessonIndex) && lessonIndex > 0 ? lessonIndex : index + 1,
      week_label: String(lesson?.week_label ?? lesson?.weekLabel ?? lesson?.week ?? "").trim(),
      title: String(lesson?.title ?? lesson?.lesson_title ?? lesson?.lessonTitle ?? "").trim(),
      focus: String(lesson?.focus ?? lesson?.lesson_focus ?? lesson?.lessonFocus ?? "").trim(),
      calendar_date: String(lesson?.calendar_date ?? lesson?.calendarDate ?? "").trim(),
      duration_minutes: Number.parseInt(lesson?.duration_minutes ?? lesson?.durationMinutes ?? 1, 10) || 1,
      activity_name: String(lesson?.activity_name ?? lesson?.activityName ?? "").trim(),
      activity_type: String(lesson?.activity_type ?? lesson?.activityType ?? "").trim(),
      card_color: String(lesson?.card_color ?? lesson?.cardColor ?? "").trim(),
      year_level: normalizeYearLevel(lesson?.year_level ?? lesson?.yearLevel ?? lesson?.lessonYearLevel ?? []),
      link_url: String(lesson?.link_url ?? lesson?.linkUrl ?? lesson?.lessonLinkUrl ?? lesson?.resource_link ?? lesson?.resourceLink ?? "").trim(),
      subject_stream: String(lesson?.subject_stream ?? lesson?.subjectStream ?? "").trim().toUpperCase(),
      publish_activity: Boolean(lesson?.publish_activity ?? lesson?.publishActivity),
      add_to_calendar: Boolean(lesson?.add_to_calendar ?? lesson?.addToCalendar),
      notes: String(lesson?.notes ?? lesson?.lessonNotes ?? "").trim()
    };
  });
}

function normalizeYearLevel(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean).join(", ");
  }

  return String(value || "")
    .split(/\s*,\s*/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join(", ");
}

function splitDocxLines(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function findLineIndex(lines, matcher) {
  return lines.findIndex((line) => matcher(String(line || "").trim().toLowerCase()));
}

function extractLinesBetween(lines, startIndex, endIndex) {
  if (!Number.isInteger(startIndex) || startIndex < 0) {
    return [];
  }

  const safeEndIndex = Number.isInteger(endIndex) && endIndex > startIndex ? endIndex : lines.length;
  return lines.slice(startIndex, safeEndIndex).map((line) => String(line || "").trim()).filter(Boolean);
}

function sanitizeUnitAims(lines) {
  const sourceLines = Array.isArray(lines)
    ? lines.map((line) => String(line || "").trim()).filter(Boolean)
    : [];

  // Remove leading lines that are clearly section headers or not aims content
  const mainSectionPattern = /^(year\s*groups?|main\s*focus|school\s*values|contexts\s*of\s*learning|local\s*curriculum\s*links|skills|slideshow|reporting|assessment|evaluation)\s*(?:[-:]|$)/i;
  const cleaned = [];
  let foundContent = false;

  for (const rawLine of sourceLines) {
    const line = String(rawLine || "").trim();
    if (!line) {
      continue;
    }

    // Skip lines that are clearly main section headers
    if (mainSectionPattern.test(line)) {
      if (foundContent) {
        // If we already have content, stop at main sections
        break;
      }
      // Otherwise skip this header and continue looking for aims
      continue;
    }

    foundContent = true;
    cleaned.push(line);
  }

  return cleaned;
}

function isLessonHeadingLine(line) {
  const text = String(line || "").trim();
  if (!text) {
    return false;
  }

  return /^\d+(?:\/\d+)?(?:\s+.+)?$/.test(text);
}

function parseLessonRowsFromSlideshow(lines) {
  const lessons = [];
  let currentLesson = null;
  let waitingForTitle = false;
  const urlPattern = /(https?:\/\/[^\s)]+|www\.[^\s)]+)/i;

  const flushLesson = () => {
    if (!currentLesson) {
      return;
    }

    const lessonTitle = String(currentLesson.lessonTitle || currentLesson.title || "").trim();
    const lessonFocus = currentLesson.notes.join(" ").trim();

    if (lessonTitle || lessonFocus) {
      const detectedUrl = String(currentLesson.link_url || "").trim();
      lessons.push({
        lesson_index: lessons.length + 1,
        title: lessonTitle || `Lesson ${lessons.length + 1}`,
        focus: lessonFocus,
        notes: lessonFocus,
        duration_minutes: 1,
        activity_name: lessonTitle || `Lesson ${lessons.length + 1}`,
        year_level: String(currentLesson.year_level || "").trim(),
        link_url: detectedUrl,
        publish_activity: true,
        add_to_calendar: false
      });
    }

    currentLesson = null;
    waitingForTitle = false;
  };

  lines.forEach((line) => {
    const text = String(line || "").trim();
    if (!text) {
      return;
    }

    if (/^reporting\s*&\s*assessment\s*link$/i.test(text) || /^unit evaluation$/i.test(text)) {
      flushLesson();
      return;
    }

    if (/^(juniors?|middle(?:\/seniors?)?|seniors?|year\s*\d+(?:\s*(?:\/|and|&)\s*\d+)?)\b/i.test(text)) {
      flushLesson();
      currentLesson = {
        year_level: text,
        title: "",
        notes: []
      };
      waitingForTitle = true;
      return;
    }

    if (/^slideshow$/i.test(text)) {
      return;
    }

    const headingMatch = text.match(/^(\d+(?:\/\d+)?)(?:\s+(.*))?$/);
    if (headingMatch) {
      flushLesson();
      currentLesson = {
        title: String(headingMatch[2] || "").trim(),
        notes: []
      };
      waitingForTitle = !headingMatch[2];
      return;
    }

    if (!currentLesson) {
      return;
    }

    if (waitingForTitle) {
      currentLesson.title = text;
      waitingForTitle = false;
      return;
    }

    if (!currentLesson.title && text.length <= 40 && !/[.!?]$/.test(text)) {
      currentLesson.title = text;
      return;
    }

    if (!currentLesson.link_url) {
      const urlMatch = text.match(urlPattern);
      if (urlMatch) {
        const rawUrl = String(urlMatch[1] || "").trim();
        currentLesson.link_url = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
      }
    }

    currentLesson.notes.push(text);
  });

  flushLesson();
  return lessons;
}

function detectSubjectStreamFromText(text) {
  const lower = String(text || "").toLowerCase();
  if (lower.includes("dtech") || lower.includes("digital technology")) return "DTECH";
  if (lower.includes("computing") || lower.includes("python") || lower.includes("programming") || lower.includes("computer")) return "COMP";
  if (lower.includes("textile") || lower.includes("sewing")) return "TEXT";
  return "";
}

function parseUnitPlanFromDocxText(rawText, originalName = "") {
  const lines = splitDocxLines(rawText);
  const lineHas = (line, text) => String(line || "").toLowerCase().includes(String(text || "").toLowerCase());
  const isAimsHeading = (line) => {
    const value = String(line || "").trim().toLowerCase();
    return (
      value === "aims" ||
      value === "aims:" ||
      value === "aim(s)" ||
      value === "aim(s):" ||
      value.startsWith("aims of unit") ||
      value.startsWith("aim(s) of unit") ||
      value.startsWith("aim(s) of unit:") ||
      value.startsWith("aim(s) of unit")
    );
  };
  const isAimsStopHeading = (line) => {
    const value = String(line || "").trim().toLowerCase();
    return (
      value.startsWith("year groups") ||
      value.startsWith("year group") ||
      value.startsWith("main focus") ||
      value.startsWith("school values") ||
      lineHas(value, "contexts of learning") ||
      lineHas(value, "local curriculum links") ||
      lineHas(value, "maturanga maori") ||
      lineHas(value, "matauranga maori") ||
      value.startsWith("skills") ||
      value.startsWith("health & safety") ||
      value.startsWith("health and safety") ||
      value.startsWith("safety issues") ||
      value.startsWith("slideshow") ||
      value.startsWith("reporting & assessment link") ||
      value.startsWith("unit evaluation")
    );
  };
  const findNextSectionIndex = (startIndex, matchers = []) => {
    if (!Number.isInteger(startIndex) || startIndex < 0) {
      return -1;
    }

    for (let index = startIndex + 1; index < lines.length; index += 1) {
      const candidate = String(lines[index] || "").trim().toLowerCase();
      if (!candidate) {
        continue;
      }

      if (matchers.some((matcher) => matcher(candidate))) {
        return index;
      }
    }

    return -1;
  };

  const normalizedName = String(originalName || "").replace(/\.docx$/i, "").trim();
  const unitPlanHeadingIndex = findLineIndex(lines, (line) => line.includes("unit plan"));
  const topicIndex = (() => {
    if (unitPlanHeadingIndex < 0) {
      return lines.findIndex((line) => line.length > 0);
    }

    for (let index = unitPlanHeadingIndex + 1; index < Math.min(lines.length, unitPlanHeadingIndex + 8); index += 1) {
      const candidate = lines[index];
      const lower = candidate.toLowerCase();
      if (!candidate || lower.includes("westland high school") || lower.includes("digital technology") || lower.includes("unit plan")) {
        continue;
      }
      return index;
    }

    return -1;
  })();

  const topic = topicIndex >= 0 ? lines[topicIndex] : normalizedName || "Imported Unit Plan";
  const yearLevelLine = lines.find((line) => /year\s*\d|junior|middle|senior/i.test(line) || /main focus:/i.test(line)) || "";
  const yearLevel = (() => {
    const match = yearLevelLine.match(/main focus:\s*(.*)$/i) || yearLevelLine.match(/year\s*groups?:\s*(.*)$/i);
    if (match && String(match[1] || "").trim()) {
      return String(match[1] || "").trim();
    }
    return yearLevelLine || "";
  })();

  const aimIndex = findLineIndex(lines, isAimsHeading);
  const yearGroupsIndex = findLineIndex(lines, (line) => line.toLowerCase().startsWith("year groups"));
  const schoolValuesIndex = findLineIndex(lines, (line) => line.toLowerCase().startsWith("school values"));
  const contextsIndex = findLineIndex(lines, (line) => line.toLowerCase().startsWith("contexts of learning"));
  const localCurriculumIndex = findLineIndex(lines, (line) => line.toLowerCase().startsWith("local curriculum links"));
  const slideshowIndex = findLineIndex(lines, (line) => line.toLowerCase().startsWith("slideshow"));
  const reportingIndex = findLineIndex(lines, (line) => line.toLowerCase().startsWith("reporting & assessment link"));
  const evaluationIndex = findLineIndex(lines, (line) => line.toLowerCase().startsWith("unit evaluation"));

  const aimsEndIndex = (() => {
    if (aimIndex < 0) {
      return -1;
    }

    // Find the next main section header after aims
    const nextSectionIndex = Math.min(
      ...[yearGroupsIndex, schoolValuesIndex, contextsIndex, localCurriculumIndex, slideshowIndex, reportingIndex, evaluationIndex]
        .filter((idx) => idx > aimIndex)
    );

    return Number.isFinite(nextSectionIndex) ? nextSectionIndex : lines.length;
  })();

  const extractedAims = aimIndex >= 0 ? extractLinesBetween(lines, aimIndex + 1, aimsEndIndex) : [];
  const unitAims = sanitizeUnitAims(extractedAims);
  const unitValues = extractLinesBetween(lines, schoolValuesIndex + 1, contextsIndex);
  const contexts = extractLinesBetween(lines, contextsIndex + 1, localCurriculumIndex);
  const curriculumLinks = extractLinesBetween(lines, localCurriculumIndex + 1, slideshowIndex);
  const overviewEndIndex = aimIndex > topicIndex ? aimIndex : yearGroupsIndex;
  const overview = extractLinesBetween(lines, topicIndex + 1, overviewEndIndex).slice(0, 5).join(" ");
  const assessmentLink = extractLinesBetween(lines, reportingIndex + 1, evaluationIndex).slice(0, 4).join(" ");
  const notes = extractLinesBetween(lines, evaluationIndex + 1, lines.length).join(" ");
  const lessonLines = extractLinesBetween(lines, slideshowIndex + 1, reportingIndex);
  const lessons = parseLessonRowsFromSlideshow(lessonLines);

  return {
    title: topic,
    topic,
    strand: "",
    year_level: yearLevel || "Middle",
    term: "",
    subject_stream: detectSubjectStreamFromText(rawText),
    duration_weeks: Math.max(1, lessons.length ? Math.ceil(lessons.length / 5) : 1),
    overview,
    unit_aims: unitAims,
    unit_values: unitValues,
    contexts,
    curriculum_links: curriculumLinks,
    assessment_link: assessmentLink,
    notes,
    lessons
  };
}

function buildUnitPlanPayload(body, userEmail) {
  const title = String(body?.title || body?.unit_title || "").trim();
  const topic = String(body?.topic || body?.unit_topic || "").trim();
  const yearLevel = normalizeYearLevel(body?.year_level ?? body?.yearLevel);
  const fallbackIdSource = title || topic || `unit-plan-${Date.now()}`;
  const id = String(body?.id || slugify(fallbackIdSource)).trim();

  return {
    id,
    title,
    topic,
    strand: String(body?.strand || "").trim(),
    year_level: yearLevel,
    term: String(body?.term || "").trim(),
    subject_stream: String(body?.subject_stream || body?.subjectStream || "").trim().toUpperCase(),
    duration_weeks: Number.parseInt(body?.duration_weeks ?? body?.durationWeeks, 10) || 1,
    overview: String(body?.overview || "").trim(),
    unit_aims: normalizeArray(body?.unit_aims ?? body?.unitAims),
    unit_values: normalizeArray(body?.unit_values ?? body?.unitValues),
    contexts: normalizeArray(body?.contexts ?? body?.unitContexts),
    curriculum_links: normalizeArray(body?.curriculum_links ?? body?.curriculumLinks),
    assessment_link: String(body?.assessment_link || body?.assessmentLink || "").trim(),
    notes: String(body?.notes || body?.unitNotes || "").trim(),
    lessons: normalizeUnitLessons(body?.lessons),
    created_by_email: userEmail,
    created_at: String(body?.created_at || new Date().toISOString()),
    updated_at: new Date().toISOString()
  };
}

async function saveUnitPlanPayload(payload) {
  if (!hasDatabase) {
    memoryUnitPlans.set(payload.id, payload);
    return payload;
  }

  await ensureUnitPlanSchema();
  const result = await pool.query(
    `
      INSERT INTO unit_plans (
        id, title, topic, strand, year_level, term, subject_stream, duration_weeks, overview, unit_aims, unit_values, contexts, curriculum_links, assessment_link, notes, lessons, created_by_email, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14, $15, $16::jsonb, $17, $18::timestamptz, $19::timestamptz
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        topic = EXCLUDED.topic,
        strand = EXCLUDED.strand,
        year_level = EXCLUDED.year_level,
        term = EXCLUDED.term,
        subject_stream = EXCLUDED.subject_stream,
        duration_weeks = EXCLUDED.duration_weeks,
        overview = EXCLUDED.overview,
        unit_aims = EXCLUDED.unit_aims,
        unit_values = EXCLUDED.unit_values,
        contexts = EXCLUDED.contexts,
        curriculum_links = EXCLUDED.curriculum_links,
        assessment_link = EXCLUDED.assessment_link,
        notes = EXCLUDED.notes,
        lessons = EXCLUDED.lessons,
        created_by_email = EXCLUDED.created_by_email,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `,
    [
      payload.id,
      payload.title,
      payload.topic,
      payload.strand || null,
      payload.year_level,
      payload.term || null,
      payload.subject_stream || null,
      payload.duration_weeks,
      payload.overview || null,
      JSON.stringify(payload.unit_aims || []),
      JSON.stringify(payload.unit_values || []),
      JSON.stringify(payload.contexts || []),
      JSON.stringify(payload.curriculum_links || []),
      payload.assessment_link || null,
      payload.notes || null,
      JSON.stringify(payload.lessons || []),
      payload.created_by_email,
      payload.created_at,
      payload.updated_at
    ]
  );

  return result.rows[0];
}

async function parseDocxBufferToUnitPlanPayload(buffer, originalName, userEmail) {
  const extraction = await mammoth.extractRawText({ buffer });
  const parsed = parseUnitPlanFromDocxText(extraction.value || "", originalName || "");
  const payload = buildUnitPlanPayload(parsed, userEmail);

  if (!payload.title || !payload.topic || !payload.year_level) {
    throw new Error("Could not detect unit title, topic, or year level from document");
  }

  return payload;
}

app.post("/api/unit-plans/import-docx", unitPlanUpload.single("unitPlanFile"), async (req, res) => {
  const userEmail = normalizeEmail(req.body?.created_by_email || req.body?.user_email || getRequestUserEmail(req));
  if (!userEmail || !(await canManagePracticalSchedule(userEmail))) {
    res.status(403).json({ error: "Teacher/Admin access is required." });
    return;
  }

  const file = req.file;
  if (!file?.buffer) {
    res.status(400).json({ error: "A .docx file is required." });
    return;
  }

  try {
    const payload = await parseDocxBufferToUnitPlanPayload(file.buffer, file.originalname, userEmail);
    const savedPlan = await saveUnitPlanPayload(payload);
    res.status(201).json({
      ok: true,
      unitPlan: savedPlan,
      lessonCount: Array.isArray(savedPlan?.lessons) ? savedPlan.lessons.length : 0,
      createdActivities: 0,
      createdCalendarEvents: 0
    });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Could not import unit plan document" });
  }
});

app.post("/api/unit-plans/preview-docx", unitPlanUpload.single("unitPlanFile"), async (req, res) => {
  const userEmail = normalizeEmail(req.body?.created_by_email || req.body?.user_email || getRequestUserEmail(req));
  if (!userEmail || !(await canManagePracticalSchedule(userEmail))) {
    res.status(403).json({ error: "Teacher/Admin access is required." });
    return;
  }

  const file = req.file;
  if (!file?.buffer) {
    res.status(400).json({ error: "A .docx file is required." });
    return;
  }

  try {
    const payload = await parseDocxBufferToUnitPlanPayload(file.buffer, file.originalname, userEmail);
    res.status(200).json({
      ok: true,
      source: file.originalname,
      unitPlan: payload,
      lessonCount: Array.isArray(payload?.lessons) ? payload.lessons.length : 0
    });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Could not preview unit plan document" });
  }
});

app.post("/api/unit-plans/import-docx-template", async (req, res) => {
  const userEmail = normalizeEmail(req.body?.created_by_email || req.body?.user_email || getRequestUserEmail(req));
  if (!userEmail || !(await canManagePracticalSchedule(userEmail))) {
    res.status(403).json({ error: "Teacher/Admin access is required." });
    return;
  }

  const templateRelativePath = path.join("TeacherFiles", "Programming - TECHNOLOGY Unit Plan - DT (1).docx");
  const templateAbsolutePath = path.join(__dirname, templateRelativePath);

  try {
    const templateBuffer = await require("fs").promises.readFile(templateAbsolutePath);
    const payload = await parseDocxBufferToUnitPlanPayload(templateBuffer, "Programming - TECHNOLOGY Unit Plan - DT (1).docx", userEmail);
    const savedPlan = await saveUnitPlanPayload(payload);
    res.status(201).json({
      ok: true,
      source: templateRelativePath.replace(/\\/g, "/"),
      unitPlan: savedPlan,
      lessonCount: Array.isArray(savedPlan?.lessons) ? savedPlan.lessons.length : 0,
      createdActivities: 0,
      createdCalendarEvents: 0
    });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Could not import TeacherFiles template document" });
  }
});

app.post("/api/unit-plans/preview-docx-template", async (req, res) => {
  const userEmail = normalizeEmail(req.body?.created_by_email || req.body?.user_email || getRequestUserEmail(req));
  if (!userEmail || !(await canManagePracticalSchedule(userEmail))) {
    res.status(403).json({ error: "Teacher/Admin access is required." });
    return;
  }

  const templateRelativePath = path.join("TeacherFiles", "Programming - TECHNOLOGY Unit Plan - DT (1).docx");
  const templateAbsolutePath = path.join(__dirname, templateRelativePath);

  try {
    const templateBuffer = await require("fs").promises.readFile(templateAbsolutePath);
    const payload = await parseDocxBufferToUnitPlanPayload(templateBuffer, "Programming - TECHNOLOGY Unit Plan - DT (1).docx", userEmail);
    res.status(200).json({
      ok: true,
      source: templateRelativePath.replace(/\\/g, "/"),
      unitPlan: payload,
      lessonCount: Array.isArray(payload?.lessons) ? payload.lessons.length : 0
    });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Could not preview TeacherFiles template document" });
  }
});

async function ensureUnitPlanSchema() {
  if (!hasDatabase) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS unit_plans (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      topic TEXT NOT NULL,
      strand TEXT,
      year_level TEXT NOT NULL,
      term TEXT,
      subject_stream TEXT,
      duration_weeks INTEGER NOT NULL DEFAULT 1,
      overview TEXT,
      unit_aims JSONB NOT NULL DEFAULT '[]'::jsonb,
      unit_values JSONB NOT NULL DEFAULT '[]'::jsonb,
      contexts JSONB NOT NULL DEFAULT '[]'::jsonb,
      curriculum_links JSONB NOT NULL DEFAULT '[]'::jsonb,
      assessment_link TEXT,
      notes TEXT,
      lessons JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_by_email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`ALTER TABLE unit_plans ADD COLUMN IF NOT EXISTS unit_aims JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE unit_plans ADD COLUMN IF NOT EXISTS unit_values JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE unit_plans ADD COLUMN IF NOT EXISTS contexts JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE unit_plans ADD COLUMN IF NOT EXISTS curriculum_links JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE unit_plans ADD COLUMN IF NOT EXISTS lessons JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE unit_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS unit_plan_id TEXT`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS unit_lesson_index INTEGER`);
  await pool.query(`ALTER TABLE practical_schedule ADD COLUMN IF NOT EXISTS unit_plan_id TEXT`);
  await pool.query(`ALTER TABLE practical_schedule ADD COLUMN IF NOT EXISTS lesson_index INTEGER`);
}

async function ensureSchema() {
  await ensureUnitPlanSchema();
}

async function syncDtechExcludedActivitiesVisibility() {
  return;
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
    (row) => canonicalizeRoleName(row?.role_name) === assignedRole
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

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function getRequestUserEmail(req) {
  return normalizeEmail(
    req?.headers?.["x-user-email"] ||
    req?.headers?.["x-ms-client-principal-name"] ||
    req?.query?.user_email ||
    req?.query?.email ||
    req?.body?.user_email ||
    req?.body?.created_by_email ||
    ""
  );
}

async function resolveActivityWriteAccess(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return { allowed: false, email: "", reason: "missing_email" };
  }

  try {
    const allowed = await canManagePracticalSchedule(normalizedEmail);
    return {
      allowed: Boolean(allowed),
      email: normalizedEmail,
      reason: allowed ? "allowed" : "forbidden"
    };
  } catch (_error) {
    return { allowed: false, email: normalizedEmail, reason: "lookup_failed" };
  }
}

async function requireActivityWriteAccess(req, res, next) {
  const email = getRequestUserEmail(req);
  if (!email) {
    res.status(401).json({ error: "User email is required" });
    return;
  }

  const access = await resolveActivityWriteAccess(email);
  if (!access.allowed) {
    res.status(403).json({ error: "Teacher/Admin access is required." });
    return;
  }

  req.user_email = access.email;
  next();
}

async function requireAdminAccess(req, res, next) {
  const email = getRequestUserEmail(req);
  if (!email) {
    res.status(401).json({ error: "User email is required" });
    return;
  }

  const roleHint = String(
    req?.headers?.["x-user-role"] ||
    req?.query?.role ||
    req?.body?.role ||
    req?.body?.user_role ||
    ""
  ).trim().toLowerCase();

  if (roleHint === "admin" || roleHint === "student admin" || roleHint === "student_admin") {
    req.user_email = email;
    next();
    return;
  }

  try {
    if (typeof getUserRoleByEmail === "function" && typeof getMergedRolePermissions === "function") {
      const userRole = await getUserRoleByEmail(email);
      const assignedRole = String(userRole?.additional_role || userRole?.role_name || "").trim();
      const mergedPermissions = await getMergedRolePermissions();
      const matchedRole = mergedPermissions.find(
        (row) => String(row?.role_name || "").trim().toLowerCase() === assignedRole.toLowerCase()
      );

      if (Boolean(matchedRole?.admin) || /\badmin\b/i.test(assignedRole)) {
        req.user_email = email;
        next();
        return;
      }
    }
  } catch (_error) {
  }

  res.status(403).json({ error: "Admin access is required." });
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
    const unitPlanIdColumn = pickExistingColumn(activityColumns, ["unit_plan_id", "unit_plan"]);
    const unitLessonIndexColumn = pickExistingColumn(activityColumns, ["unit_lesson_index", "lesson_index"]);
    const resourcesColumn = pickExistingColumn(activityColumns, ["resources"]);
    const equipmentColumn = pickExistingColumn(activityColumns, ["equipment"]);
    const instructionsColumn = pickExistingColumn(activityColumns, ["instructions", "steps"]);
    const classManagementColumn = pickExistingColumn(activityColumns, ["class_management_notes"]);
    const classPreparationColumn = pickExistingColumn(activityColumns, ["class_preparation"]);
    const assessmentFocusColumn = pickExistingColumn(activityColumns, ["assessment_focus"]);
    const timeSensitiveColumn = pickExistingColumn(activityColumns, ["time_sensitive"]);
    const showInWeekColumn = pickExistingColumn(activityColumns, ["show_in_this_week", "show_this_week", "is_pinned", "is_this_week"]);
    const termColumn = pickExistingColumn(activityColumns, ["term"]);
    const updatedAtColumn = pickExistingColumn(activityColumns, ["updated_at", "updatedon", "last_updated"])
    
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
    if (unitPlanIdColumn) sqlColumns.push({ name: unitPlanIdColumn, value: String(body.unit_plan_id || body.unitPlanId || "").trim() });
    if (unitLessonIndexColumn) sqlColumns.push({ name: unitLessonIndexColumn, value: Number.parseInt(body.unit_lesson_index ?? body.unitLessonIndex, 10) || null });
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

// GET /api/admin/nzqa-standards — admin standards index for assessment management
app.get("/api/admin/nzqa-standards", requireAdminAccess, async (req, res) => {
  const levelParam = String(req.query?.level || "all").trim().toLowerCase();
  const streamParam = String(req.query?.stream || "digital").trim().toLowerCase();
  const standardQuery = String(req.query?.standard || "").trim().toLowerCase();

  const levels = levelParam === "all"
    ? [1, 2, 3]
    : [Number.parseInt(levelParam, 10)].filter((value) => [1, 2, 3].includes(value));

  if (!levels.length) {
    res.status(400).json({ error: "level must be one of all, 1, 2, or 3" });
    return;
  }

  const streams = streamParam === "both"
    ? ["digital", "computing"]
    : [streamParam];

  if (!streams.every((stream) => ["digital", "computing"].includes(stream))) {
    res.status(400).json({ error: "stream must be one of digital, computing, or both" });
    return;
  }

  try {
    const jobs = [];
    levels.forEach((level) => {
      streams.forEach((stream) => {
        jobs.push(fetchNzqaStandards(stream, level));
      });
    });

    const results = await Promise.all(jobs);
    let standards = results.flat();

    if (standardQuery) {
      standards = standards.filter((item) =>
        String(item.standard_number || "").toLowerCase().includes(standardQuery)
      );
    }

    standards.sort((left, right) => {
      if (left.level !== right.level) {
        return left.level - right.level;
      }
      return String(left.standard_number || "").localeCompare(String(right.standard_number || ""), undefined, { numeric: true });
    });

    res.json({
      generated_at: new Date().toISOString(),
      filters: {
        level: levelParam,
        stream: streamParam,
        standard: standardQuery
      },
      count: standards.length,
      standards
    });
  } catch (error) {
    res.status(500).json({ error: `Could not load NZQA standards: ${String(error?.message || "unknown error")}` });
  }
});

// GET /api/assessment-standards/options — staff/admin standards options for allocation dropdowns
app.get("/api/assessment-standards/options", requireActivityWriteAccess, async (req, res) => {
  const levelParam = String(req.query?.level || "all").trim().toLowerCase();
  const streamParam = String(req.query?.stream || "both").trim().toLowerCase();

  const levels = levelParam === "all"
    ? [1, 2, 3]
    : [Number.parseInt(levelParam, 10)].filter((value) => [1, 2, 3].includes(value));

  if (!levels.length) {
    res.status(400).json({ error: "level must be one of all, 1, 2, or 3" });
    return;
  }

  const streams = streamParam === "both"
    ? ["digital", "computing"]
    : [streamParam];

  if (!streams.every((stream) => ["digital", "computing"].includes(stream))) {
    res.status(400).json({ error: "stream must be one of digital, computing, or both" });
    return;
  }

  try {
    const jobs = [];
    levels.forEach((level) => {
      streams.forEach((stream) => {
        jobs.push(fetchNzqaStandards(stream, level));
      });
    });

    const results = await Promise.all(jobs);
    const deduped = new Map();

    results.flat().forEach((row) => {
      const standardNumber = String(row.standard_number || "").trim();
      const level = Number.parseInt(row.level, 10) || 0;
      if (!standardNumber || !level) return;

      const key = `${standardNumber}:${level}`;
      const existing = deduped.get(key);
      const existingVersion = Number.parseInt(existing?.version, 10) || 0;
      const candidateVersion = Number.parseInt(row.version, 10) || 0;

      if (!existing || candidateVersion >= existingVersion) {
        deduped.set(key, row);
      }
    });

    const options = Array.from(deduped.values())
      .map((row) => ({
        standard_number: String(row.standard_number || "").trim(),
        standard_name: String(row.standard_name || "").trim(),
        short_name: String(row.standard_name || "").trim().replace(/\s+/g, " ").slice(0, 88),
        version: String(row.version || "").trim(),
        level: Number.parseInt(row.level, 10) || null,
        credits: Number.isFinite(Number(row.credits)) ? Number(row.credits) : null,
        stream: String(row.stream || "").trim(),
        details_url: String(row.details_url || "").trim()
      }))
      .sort((left, right) => {
        if (left.level !== right.level) {
          return Number(left.level || 0) - Number(right.level || 0);
        }
        return String(left.standard_number || "").localeCompare(String(right.standard_number || ""), undefined, { numeric: true });
      });

    res.json({
      generated_at: new Date().toISOString(),
      count: options.length,
      options
    });
  } catch (error) {
    res.status(500).json({ error: `Could not load standards options: ${String(error?.message || "unknown error")}` });
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
  const unitPlanId = String(req.body?.unit_plan_id || req.body?.unitPlanId || "").trim();
  const lessonIndex = Number.parseInt(req.body?.lesson_index ?? req.body?.lessonIndex, 10);
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
    const existingIndex = unitPlanId && Number.isInteger(lessonIndex) && lessonIndex > 0
      ? memoryPracticalEvents.findIndex((row) => String(row.unit_plan_id || "") === unitPlanId && Number(row.lesson_index) === lessonIndex)
      : -1;

    const row = {
      id: memoryPracticalEventId++,
      title,
      event_type: eventType,
      start_date: startDate,
      end_date: endDate,
      notes,
      linked_activity_id: linkedActivityId || null,
      linked_url: linkedUrl || null,
      unit_plan_id: unitPlanId || null,
      lesson_index: Number.isInteger(lessonIndex) && lessonIndex > 0 ? lessonIndex : null,
      created_by_email: createdByEmail,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (existingIndex >= 0) {
      memoryPracticalEvents[existingIndex] = { ...memoryPracticalEvents[existingIndex], ...row };
      res.status(200).json(memoryPracticalEvents[existingIndex]);
      return;
    }

    memoryPracticalEvents.push(row);
    res.status(201).json(row);
    return;
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO practical_schedule (
          title, event_type, start_date, end_date, notes, linked_activity_id, linked_url, unit_plan_id, lesson_index, created_by_email, created_at, updated_at
        ) VALUES (
          $1, $2, $3::date, $4::date, $5, $6, $7, $8, $9, $10, NOW(), NOW()
        )
        ON CONFLICT (unit_plan_id, lesson_index) DO UPDATE SET
          title = EXCLUDED.title,
          event_type = EXCLUDED.event_type,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          notes = EXCLUDED.notes,
          linked_activity_id = EXCLUDED.linked_activity_id,
          linked_url = EXCLUDED.linked_url,
          created_by_email = EXCLUDED.created_by_email,
          updated_at = NOW()
        RETURNING id, title, event_type, start_date, end_date, notes, linked_activity_id, linked_url, unit_plan_id, lesson_index, created_by_email, created_at, updated_at
      `,
      [title, eventType, startDate, endDate, notes, linkedActivityId || null, linkedUrl || null, unitPlanId || null, Number.isInteger(lessonIndex) && lessonIndex > 0 ? lessonIndex : null, createdByEmail]
    );
    res.status(201).json(result.rows[0]);
  } catch (_error) {
    res.status(500).json({ error: "Could not save practical event" });
  }
});

app.get("/api/unit-plans", async (_req, res) => {
  if (!hasDatabase) {
    res.json(Array.from(memoryUnitPlans.values()).sort((left, right) => String(right.updated_at || "").localeCompare(String(left.updated_at || ""))));
    return;
  }

  try {
    await ensureUnitPlanSchema();
    const result = await pool.query("SELECT * FROM unit_plans ORDER BY updated_at DESC, created_at DESC");
    res.json(result.rows);
  } catch (_error) {
    res.status(500).json({ error: "Could not load unit plans" });
  }
});

app.get("/api/unit-plans/:id", async (req, res) => {
  const requestedId = String(req.params.id || "").trim();
  if (!requestedId) {
    res.status(400).json({ error: "Unit plan ID is required" });
    return;
  }

  if (!hasDatabase) {
    const found = memoryUnitPlans.get(requestedId);
    if (!found) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(found);
    return;
  }

  try {
    await ensureUnitPlanSchema();
    const result = await pool.query("SELECT * FROM unit_plans WHERE id = $1", [requestedId]);
    if (!result.rowCount) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (_error) {
    res.status(500).json({ error: "Could not load unit plan" });
  }
});

app.post("/api/unit-plans", async (req, res) => {
  const userEmail = normalizeEmail(req.body?.created_by_email || req.body?.user_email || getRequestUserEmail(req));
  if (!userEmail || !(await canManagePracticalSchedule(userEmail))) {
    res.status(403).json({ error: "Teacher/Admin access is required." });
    return;
  }

  const payload = buildUnitPlanPayload(req.body, userEmail);

  if (!payload.title || !payload.topic || !payload.year_level) {
    res.status(400).json({ error: "title, topic and year_level are required" });
    return;
  }

  try {
    const savedPlan = await saveUnitPlanPayload(payload);
    res.status(201).json(savedPlan);
  } catch (_error) {
    res.status(500).json({ error: "Could not save unit plan" });
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

// GET /api/lessons — List all lessons
app.get("/api/lessons", async (_req, res) => {
  if (!hasDatabase) {
    const lessonsArray = Array.from(memoryLessons.values()).sort((left, right) => {
      const leftTime = new Date(left.created_at || 0);
      const rightTime = new Date(right.created_at || 0);
      return rightTime - leftTime;
    });
    res.json(lessonsArray);
    return;
  }

  try {
    const result = await pool.query("SELECT * FROM lessons ORDER BY created_at DESC");
    res.json(result.rows || []);
  } catch (_error) {
    res.json([]);
  }
});

// GET /api/lessons/:id — Get a specific lesson
app.get("/api/lessons/:id", async (req, res) => {
  const found = memoryLessons.get(req.params.id);
  if (found) {
    res.json(found);
    return;
  }

  if (!hasDatabase) {
    res.status(404).send("Lesson not found");
    return;
  }

  try {
    const result = await pool.query("SELECT * FROM lessons WHERE id = $1", [req.params.id]);
    if (result.rows && result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).send("Lesson not found");
    }
  } catch (_error) {
    res.status(404).send("Lesson not found");
  }
});

// POST /api/lessons — Create a new lesson
app.post("/api/lessons", async (req, res) => {
  const body = req.body || {};
  const lessonTitle = String(body.lesson_title || body.lessonTitle || "").trim();
  const lessonType = String(body.lesson_type || body.lessonType || "").trim();
  const activityName = String(body.activity_name || body.activityName || "").trim();
  const lessonYearLevel = String(body.lesson_year_level || body.lessonYearLevel || "").trim();
  const lessonFocus = String(body.lesson_focus || body.lessonFocus || "").trim();

  if (!lessonTitle || !lessonType || !activityName || !lessonYearLevel || !lessonFocus) {
    res.status(400).send("lesson_title, lesson_type, activity_name, lesson_year_level, and lesson_focus are required");
    return;
  }

  const lessonId = String(body.id || `lesson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const payload = {
    id: lessonId,
    lesson_title: lessonTitle,
    lesson_week: String(body.lesson_week || body.lessonWeek || "").trim(),
    lesson_date: String(body.lesson_date || body.lessonDate || "").trim(),
    lesson_duration_minutes: Number.parseInt(body.lesson_duration_minutes ?? body.lessonDurationMinutes ?? "60", 10) || 60,
    lesson_type: lessonType,
    lesson_card_color: String(body.lesson_card_color || body.lessonCardColor || "Rose").trim(),
    activity_name: activityName,
    lesson_year_level: lessonYearLevel,
    lesson_link_url: String(body.lesson_link_url || body.lessonLinkUrl || "").trim(),
    lesson_focus: lessonFocus,
    lesson_notes: String(body.lesson_notes || body.lessonNotes || "").trim(),
    publish_activity: Boolean(body.publish_activity ?? body.publishActivity),
    add_to_calendar: Boolean(body.add_to_calendar ?? body.addToCalendar),
    created_by_email: String(body.created_by_email || req.headers["x-user-email"] || "").trim(),
    created_at: String(body.created_at || new Date().toISOString()),
    updated_at: new Date().toISOString()
  };

  if (!hasDatabase) {
    memoryLessons.set(payload.id, payload);
    res.status(201).json(payload);
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO lessons 
       (id, lesson_title, lesson_week, lesson_date, lesson_duration_minutes, lesson_type, lesson_card_color, 
        activity_name, lesson_year_level, lesson_link_url, lesson_focus, lesson_notes, publish_activity, 
        add_to_calendar, created_by_email, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       ON CONFLICT(id) DO UPDATE SET
       lesson_title = EXCLUDED.lesson_title,
       lesson_week = EXCLUDED.lesson_week,
       lesson_date = EXCLUDED.lesson_date,
       lesson_duration_minutes = EXCLUDED.lesson_duration_minutes,
       lesson_type = EXCLUDED.lesson_type,
       lesson_card_color = EXCLUDED.lesson_card_color,
       activity_name = EXCLUDED.activity_name,
       lesson_year_level = EXCLUDED.lesson_year_level,
       lesson_link_url = EXCLUDED.lesson_link_url,
       lesson_focus = EXCLUDED.lesson_focus,
       lesson_notes = EXCLUDED.lesson_notes,
       publish_activity = EXCLUDED.publish_activity,
       add_to_calendar = EXCLUDED.add_to_calendar,
       updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [
        payload.id, payload.lesson_title, payload.lesson_week, payload.lesson_date,
        payload.lesson_duration_minutes, payload.lesson_type, payload.lesson_card_color,
        payload.activity_name, payload.lesson_year_level, payload.lesson_link_url,
        payload.lesson_focus, payload.lesson_notes, payload.publish_activity,
        payload.add_to_calendar, payload.created_by_email, payload.created_at, payload.updated_at
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Lesson save error:", error);
    res.status(500).send(`Could not save lesson: ${String(error?.message || "Unknown error")}`);
  }
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "DTECH-HUB",
    startedAt: SERVER_STARTED_AT,
    hasDatabase
  });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

ensureSchema()
  .then(() => syncDtechExcludedActivitiesVisibility())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`DTECH-HUB is running on port ${PORT} and waiting for requests`);
      console.log(`Health check available at /health`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize schema", error);
    process.exit(1);
  });
