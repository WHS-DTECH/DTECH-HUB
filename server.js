const path = require("path");
const fs = require("fs");
const express = require("express");
const multer = require("multer");
const mammoth = require("mammoth");
const nodemailer = require("nodemailer");
const { Pool } = require("pg");

let OAuth2Client = null;
try {
  ({ OAuth2Client } = require("google-auth-library"));
} catch (_error) {
  OAuth2Client = null;
  console.warn("[startup] Optional dependency 'google-auth-library' is not available. Verified Google ID token auth is disabled until installed.");
}

let PDFParse = null;
try {
  ({ PDFParse } = require("pdf-parse"));
} catch (_error) {
  PDFParse = null;
  console.warn("[startup] Optional dependency 'pdf-parse' is not available. PDF extraction features will use fallback behavior.");
}

const app = express();
const PORT = process.env.PORT || 3000;
const SERVER_STARTED_AT = new Date().toISOString();
const hasDatabase = Boolean(process.env.DATABASE_URL);
const TRELLO_API_KEY = String(process.env.TRELLO_API_KEY || "").trim();
const AUTH_MODE = String(process.env.AUTH_MODE || "hybrid").trim().toLowerCase();
const GOOGLE_ID_TOKEN_AUDIENCES = Array.from(
  new Set(
    [
      process.env.HUB_GOOGLE_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      ...(String(process.env.GOOGLE_ID_TOKEN_AUDIENCES || "")
        .split(",")
        .map((value) => String(value || "").trim())
        .filter(Boolean))
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  )
);
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
const memoryTrelloConnections = new Map();
const memoryAssessmentStandardCards = new Map();
const memoryStudentHaparaFolders = new Map();
const memoryStudentDriveSetup = new Map();
const memoryTemplateLibraryEntries = new Map();

const DEFAULT_TEMPLATE_LIBRARY_ENTRIES = [
  {
    id: "digital-outcome-description",
    title: "Digital Outcome Description",
    standardCodes: ["91897", "91907"],
    criteriaText: "Describe what the digital outcome is, who it is for, and what it must do.",
    summary: "Uses a two-column prompt-and-response slide structure for clear assessment evidence.",
    imageUrl: "https://drive.google.com/thumbnail?id=1brOY70u9aJdsoiEtxVepr82vRhiv9VzpMm8TUv3lcTo&sz=w1000",
    templateUrl: "https://docs.google.com/presentation/d/1brOY70u9aJdsoiEtxVepr82vRhiv9VzpMm8TUv3lcTo/edit?usp=sharing",
    status: "live",
    sortOrder: 1,
    sourceFolderId: ""
  },
  {
    id: "speaker-notes-criteria-mapping",
    title: "Speaker Notes Criteria Mapping",
    standardCodes: ["91897"],
    criteriaText: "Map each presented slide to assessment criteria in Speaker Notes.",
    summary: "Template slot reserved. Add the final template URL when this slide is complete.",
    imageUrl: "https://placehold.co/540x760/d8e6d9/1f3a56?text=Coming+Soon+Template",
    templateUrl: "",
    status: "coming-soon",
    sortOrder: 2,
    sourceFolderId: ""
  }
];

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

const googleAuthClient = OAuth2Client ? new OAuth2Client() : null;

const STAFF_TABLE_CANDIDATES = ["staff_upload", "upload_staff"];
const STUDENT_TABLE_CANDIDATES = ["student_details_upload", "student_upload", "student_timetable", "upload_student"];
const TEACHER_TIMETABLE_TABLE_CANDIDATES = ["kamar_timetable", "upload_timetable", "timetable", "teacher_timetable"];
const SCHOOL_EMAIL_DOMAIN = "westlandhigh.school.nz";
// ID of the "Client Projects" Assessment Task. Students assigned to any Project are
// automatically allocated to this task too. Override via CLIENT_PROJECTS_TASK_ID env var.
const CLIENT_PROJECTS_TASK_ID = process.env.CLIENT_PROJECTS_TASK_ID || "49";
const DTECH_HUB_NAME = "DTECH-HUB";
const SEWING_ROOM_HUB_NAME = "SEWING-ROOM-HUB";
const NZQA_BASE_URL = "https://www.nzqa.govt.nz";
const LOCAL_STANDARDS_DIR = path.join(__dirname, "TeacherFiles", "Standards");
const NZQA_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const NZQA_LINKS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const NZQA_DETAILS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const nzqaStandardsCache = new Map();
const nzqaStandardLinksCache = new Map();
const nzqaStandardDetailsCache = new Map();
const NZQA_STANDARDS_FALLBACK = [
  // Digital Technologies (aligned with NZQA level pages)
  { standard_number: "92004", standard_name: "Create a computer program", version: "2024", level: 1, credits: 5, stream: "digital", assessment_type: "Internal" },
  { standard_number: "92005", standard_name: "Develop a digital technologies outcome", version: "2024", level: 1, credits: 5, stream: "digital", assessment_type: "Internal" },
  { standard_number: "92006", standard_name: "Demonstrate understanding of usability in human-computer interfaces", version: "2024", level: 1, credits: 5, stream: "digital", assessment_type: "External" },
  { standard_number: "92007", standard_name: "Design a digital technologies outcome", version: "2025", level: 1, credits: 5, stream: "digital", assessment_type: "External" },
  { standard_number: "91890", standard_name: "Conduct an inquiry to propose a digital technologies outcome", version: "2019", level: 2, credits: 6, stream: "digital", assessment_type: "Internal" },
  { standard_number: "91891", standard_name: "Apply conventions to develop a design for a digital technologies outcome", version: "2019", level: 2, credits: 3, stream: "digital", assessment_type: "Internal" },
  { standard_number: "91892", standard_name: "Use advanced techniques to develop a database", version: "2019", level: 2, credits: 4, stream: "digital", assessment_type: "Internal" },
  { standard_number: "91893", standard_name: "Use advanced techniques to develop a digital media outcome", version: "2019", level: 2, credits: 4, stream: "digital", assessment_type: "Internal" },
  { standard_number: "91894", standard_name: "Use advanced techniques to develop an electronics outcome", version: "2019", level: 2, credits: 6, stream: "digital", assessment_type: "Internal" },
  { standard_number: "91895", standard_name: "Use advanced techniques to develop a network", version: "2019", level: 2, credits: 4, stream: "digital", assessment_type: "Internal" },
  { standard_number: "91896", standard_name: "Use advanced programming techniques to develop a computer program", version: "2024", level: 2, credits: 6, stream: "digital", assessment_type: "Internal" },
  { standard_number: "91897", standard_name: "Use advanced processes to develop a digital technologies outcome", version: "2019", level: 2, credits: 6, stream: "digital", assessment_type: "Internal" },
  { standard_number: "91898", standard_name: "Demonstrate understanding of a computer science concept", version: "2019", level: 2, credits: 3, stream: "digital", assessment_type: "External" },
  { standard_number: "91899", standard_name: "Present a summary of developing a digital outcome", version: "2019", level: 2, credits: 3, stream: "digital", assessment_type: "External" },
  { standard_number: "91900", standard_name: "Conduct a critical inquiry to propose a digital technologies outcome", version: "2019", level: 3, credits: 6, stream: "digital", assessment_type: "Internal" },
  { standard_number: "91901", standard_name: "Apply user experience methodologies to develop a design for a digital technologies outcome", version: "2019", level: 3, credits: 3, stream: "digital", assessment_type: "Internal" },
  { standard_number: "91902", standard_name: "Use complex techniques to develop a database", version: "2024", level: 3, credits: 4, stream: "digital", assessment_type: "Internal" },
  { standard_number: "91903", standard_name: "Use complex techniques to develop a digital media outcome", version: "2019", level: 3, credits: 4, stream: "digital", assessment_type: "Internal" },
  { standard_number: "91904", standard_name: "Use complex techniques to develop an electronics outcome", version: "2019", level: 3, credits: 6, stream: "digital", assessment_type: "Internal" },
  { standard_number: "91905", standard_name: "Use complex techniques to develop a network", version: "2019", level: 3, credits: 4, stream: "digital", assessment_type: "Internal" },
  { standard_number: "91906", standard_name: "Use complex programming techniques to develop a computer program", version: "2024", level: 3, credits: 6, stream: "digital", assessment_type: "Internal" },
  { standard_number: "91907", standard_name: "Use complex processes to develop a digital technologies outcome", version: "2024", level: 3, credits: 6, stream: "digital", assessment_type: "Internal" },
  { standard_number: "91908", standard_name: "Analyse an area of computer science", version: "2019", level: 3, credits: 3, stream: "digital", assessment_type: "External" },
  { standard_number: "91909", standard_name: "Present a reflective analysis of developing a digital outcome", version: "2019", level: 3, credits: 3, stream: "digital", assessment_type: "External" },

  // Generic Computing
  { standard_number: "91896", standard_name: "Use advanced programming techniques to develop a computer program", version: "3", level: 1, credits: 4, stream: "computing" },
  { standard_number: "91897", standard_name: "Demonstrate understanding of how data is represented, accessed, and stored", version: "3", level: 1, credits: 4, stream: "computing" },
  { standard_number: "91898", standard_name: "Demonstrate understanding of a computer science concept", version: "3", level: 1, credits: 3, stream: "computing" },
  { standard_number: "91899", standard_name: "Present a summary of developing a computer program", version: "3", level: 1, credits: 3, stream: "computing" },
  { standard_number: "91906", standard_name: "Use advanced programming techniques to develop a complex computer program", version: "2", level: 2, credits: 4, stream: "computing" },
  { standard_number: "91907", standard_name: "Demonstrate understanding of advanced concepts from computer science", version: "2", level: 2, credits: 3, stream: "computing" },
  { standard_number: "91912", standard_name: "Use complex programming techniques to develop a complex computer program", version: "1", level: 3, credits: 6, stream: "computing" },
  { standard_number: "91913", standard_name: "Demonstrate understanding of complex concepts of computer science", version: "1", level: 3, credits: 3, stream: "computing" }
];
const DEFAULT_CLASS_DATA_AGING_DAYS = 3;
const DEFAULT_CLASS_DATA_STALE_DAYS = 7;

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function buildNzqaLinks(standardNumber) {
  const number = String(standardNumber || "").trim();
  if (!number) {
    return { details_url: "", pdf_url: "", docx_url: "" };
  }

  const details_url = `${NZQA_BASE_URL}/ncea/assessment/search.do?query=${encodeURIComponent(number)}&view=all`;
  return {
    details_url,
    pdf_url: "",
    docx_url: ""
  };
}

function toStaticUrlPath(relativePath) {
  return `/${String(relativePath || "").replace(/\\/g, "/")}`;
}

function findLocalStandardDocuments(standardNumber) {
  const number = String(standardNumber || "").trim();
  if (!number) {
    return { pdf_url: "", docx_url: "" };
  }

  try {
    if (!fs.existsSync(LOCAL_STANDARDS_DIR)) {
      return { pdf_url: "", docx_url: "" };
    }

    const entries = fs.readdirSync(LOCAL_STANDARDS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => String(entry.name || "").trim())
      .filter(Boolean);

    const matching = entries.filter((name) =>
      String(name || "").toLowerCase().includes(number.toLowerCase())
    );

    const pick = (regex) => matching.find((name) => regex.test(name)) || "";
    const pdfName = pick(/\.pdf$/i);
    const docName = pick(/\.(?:doc|docx)$/i);

    return {
      pdf_url: pdfName ? toStaticUrlPath(path.join("TeacherFiles", "Standards", pdfName)) : "",
      docx_url: docName ? toStaticUrlPath(path.join("TeacherFiles", "Standards", docName)) : ""
    };
  } catch (_error) {
    return { pdf_url: "", docx_url: "" };
  }
}

function readLocalStandardDocumentBuffer(urlPath) {
  const url = String(urlPath || "").trim();
  if (!url || !url.startsWith("/TeacherFiles/Standards/")) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(url);
    const absolutePath = path.join(__dirname, decoded.replace(/^\//, ""));
    if (!absolutePath.startsWith(LOCAL_STANDARDS_DIR)) {
      return null;
    }
    if (!fs.existsSync(absolutePath)) {
      return null;
    }
    return fs.readFileSync(absolutePath);
  } catch (_error) {
    return null;
  }
}

function stripNzqaHtmlToText(html) {
  const source = String(html || "");
  const withoutScripts = source
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const text = withoutScripts
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text;
}

function normalizeCriteriaSectionText(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^[\s\-:;,.]+|[\s\-:;,.]+$/g, "")
    .trim();
}

function extractAssessmentCriteriaFromText(text) {
  const source = String(text || "").replace(/\r/g, "");
  if (!source) {
    return {
      achieved_text: "",
      merit_text: "",
      excellence_text: ""
    };
  }

  // First pass: NZQA achievement criteria table layout.
  const tableBlockMatch = source.match(/Achievement\s+Criteria([\s\S]{0,2200}?)(?:Explanatory\s+Notes|\n\s*Page\s+\d+\s+of\s+\d+|$)/i);
  if (tableBlockMatch) {
    const tableBlock = String(tableBlockMatch[1] || "");
    const bulletSegments = tableBlock
      .split(/(?:^|\n)\s*[\u2022\u25CF\u2023\u00B7]\s*/)
      .map((segment) => normalizeCriteriaSectionText(segment))
      .filter(Boolean);

    if (bulletSegments.length >= 3) {
      return {
        achieved_text: bulletSegments[0],
        merit_text: bulletSegments[1],
        excellence_text: bulletSegments[2]
      };
    }
  }

  const headingPatterns = [
    { key: "achieved", regex: /(^|\n)\s*(Achieved|Achievement)\s*(Criteria|Requirements|Evidence)?\s*[:\-]?/ig },
    { key: "merit", regex: /(^|\n)\s*Merit\s*(Criteria|Requirements|Evidence)?\s*[:\-]?/ig },
    { key: "excellence", regex: /(^|\n)\s*Excellence\s*(Criteria|Requirements|Evidence)?\s*[:\-]?/ig }
  ];

  const hits = [];
  headingPatterns.forEach((pattern) => {
    let match = pattern.regex.exec(source);
    while (match) {
      hits.push({
        key: pattern.key,
        index: match.index,
        length: String(match[0] || "").length
      });
      match = pattern.regex.exec(source);
    }
  });

  if (!hits.length) {
    return {
      achieved_text: "",
      merit_text: "",
      excellence_text: ""
    };
  }

  hits.sort((a, b) => a.index - b.index);

  const sections = {
    achieved: "",
    merit: "",
    excellence: ""
  };

  for (let index = 0; index < hits.length; index += 1) {
    const current = hits[index];
    const next = hits[index + 1];
    const start = current.index + current.length;
    const end = next ? next.index : source.length;
    const segment = normalizeCriteriaSectionText(source.slice(start, end));
    if (segment && !sections[current.key]) {
      sections[current.key] = segment;
    }
  }

  return {
    achieved_text: sections.achieved,
    merit_text: sections.merit,
    excellence_text: sections.excellence
  };
}

function extractHrefListFromHtml(html) {
  const source = String(html || "");
  const hrefs = [];
  const regex = /href\s*=\s*["']([^"']+)["']/gi;
  let match = regex.exec(source);
  while (match) {
    const value = String(match?.[1] || "").trim().replace(/&amp;/gi, "&");
    if (value) {
      hrefs.push(value);
    }
    match = regex.exec(source);
  }
  return hrefs;
}

function toNzqaAbsoluteUrl(href) {
  const value = String(href || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  try {
    return new URL(value, `${NZQA_BASE_URL}/`).toString();
  } catch (_error) {
    return "";
  }
}

function isDocumentAttachmentUrl(url) {
  const value = String(url || "").trim();
  if (!value) return false;
  return /\.(?:pdf|doc|docx)(?:\b|[^a-z0-9])/i.test(value);
}

function looksLikeBinaryGarble(text) {
  const sample = String(text || "").slice(0, 300);
  if (!sample) return false;
  if (/^PK[\x00-\x7F]{0,40}/.test(sample)) return true;
  const replacementCount = (sample.match(/�/g) || []).length;
  return replacementCount > 8;
}

function isPdfAttachmentUrl(url) {
  return /\.pdf(?:\b|[^a-z0-9])/i.test(String(url || ""));
}

function isDocAttachmentUrl(url) {
  return /\.(?:doc|docx)(?:\b|[^a-z0-9])/i.test(String(url || ""));
}

function scoreAttachmentUrlForStandard(url, standardNumber) {
  const href = String(url || "").toLowerCase();
  const number = String(standardNumber || "").trim().toLowerCase();
  if (!href) return 0;

  let score = 0;
  if (number && href.includes(number)) score += 10;
  if (number && href.includes(`as${number}`)) score += 6;
  if (isPdfAttachmentUrl(href) || isDocAttachmentUrl(href)) score += 2;
  if (/download|attachment|resource/i.test(href)) score += 1;
  return score;
}

function pickNzqaAttachmentsFromHrefs(hrefs, standardNumber = "") {
  const values = Array.isArray(hrefs) ? hrefs : [];
  const ranked = values
    .map((href) => toNzqaAbsoluteUrl(href))
    .filter(Boolean)
    .map((absolute) => ({
      url: absolute,
      score: scoreAttachmentUrlForStandard(absolute, standardNumber)
    }))
    .sort((a, b) => b.score - a.score);

  const pdfMatch = ranked.find((row) => isPdfAttachmentUrl(row.url));
  const docMatch = ranked.find((row) => isDocAttachmentUrl(row.url));

  return {
    pdfUrl: pdfMatch?.url || "",
    docxUrl: docMatch?.url || ""
  };
}

function pickNzqaDetailPageUrl(hrefs, standardNumber) {
  const number = String(standardNumber || "").trim();
  if (!number) return "";

  const candidates = (Array.isArray(hrefs) ? hrefs : [])
    .map((href) => toNzqaAbsoluteUrl(href))
    .filter(Boolean)
    .filter((href) => href.includes("nzqa.govt.nz") && href.includes("/ncea/assessment/"))
    .filter((href) => !isDocumentAttachmentUrl(href));

  const byNumber = candidates.find((href) => href.includes(number) && /search\.do\?|view\//i.test(href));
  if (byNumber) return byNumber;

  return candidates.find((href) => /search\.do\?|view\//i.test(href)) || "";
}

async function fetchNzqaAttachmentLinks(standardNumber) {
  const number = String(standardNumber || "").trim();
  if (!number) {
    return { details_url: "", pdf_url: "", docx_url: "" };
  }

  const localDocuments = findLocalStandardDocuments(number);
  if (localDocuments.pdf_url || localDocuments.docx_url) {
    return {
      details_url: buildNzqaLinks(number).details_url,
      pdf_url: localDocuments.pdf_url,
      docx_url: localDocuments.docx_url
    };
  }

  const cacheKey = number;
  const cached = nzqaStandardLinksCache.get(cacheKey);
  const now = Date.now();
  if (cached && Number(cached.timestamp) + NZQA_LINKS_CACHE_TTL_MS > now && cached.value) {
    return cached.value;
  }

  const fallback = buildNzqaLinks(number);
  try {
    const searchResponse = await fetch(fallback.details_url, {
      headers: {
        "user-agent": "Mozilla/5.0 (DTECH-HUB/1.0)",
        "accept": "text/html,application/xhtml+xml"
      }
    });
    const searchHtml = await searchResponse.text();
    const searchHrefs = extractHrefListFromHtml(searchHtml);
    const searchAttachments = pickNzqaAttachmentsFromHrefs(searchHrefs, number);
    const detailUrl = pickNzqaDetailPageUrl(searchHrefs, number) || fallback.details_url;

    let pdfUrl = searchAttachments.pdfUrl;
    let docxUrl = searchAttachments.docxUrl;

    if ((!pdfUrl || !docxUrl) && detailUrl) {
      try {
        const detailResponse = await fetch(detailUrl, {
          headers: {
            "user-agent": "Mozilla/5.0 (DTECH-HUB/1.0)",
            "accept": "text/html,application/xhtml+xml"
          }
        });
        const detailHtml = await detailResponse.text();
        const detailAttachments = pickNzqaAttachmentsFromHrefs(extractHrefListFromHtml(detailHtml), number);
        if (!pdfUrl && detailAttachments.pdfUrl) {
          pdfUrl = detailAttachments.pdfUrl;
        }
        if (!docxUrl && detailAttachments.docxUrl) {
          docxUrl = detailAttachments.docxUrl;
        }
      } catch (_error) {
        // Keep fallback URLs if detail page fetch fails.
      }
    }

    const value = {
      details_url: detailUrl || fallback.details_url,
      pdf_url: pdfUrl || "",
      docx_url: docxUrl || ""
    };
    nzqaStandardLinksCache.set(cacheKey, { timestamp: now, value });
    return value;
  } catch (_error) {
    nzqaStandardLinksCache.set(cacheKey, { timestamp: now, value: fallback });
    return fallback;
  }
}

async function fetchNzqaStandardDetails(standardNumber) {
  const number = String(standardNumber || "").trim();
  if (!number) {
    throw new Error("standard number is required");
  }

  const cacheKey = number;
  const now = Date.now();
  const cached = nzqaStandardDetailsCache.get(cacheKey);
  if (cached && Number(cached.timestamp) + NZQA_DETAILS_CACHE_TTL_MS > now && cached.value) {
    return cached.value;
  }

  const links = await fetchNzqaAttachmentLinks(number);
  const result = {
    standard_number: number,
    details_url: String(links.details_url || ""),
    pdf_url: String(links.pdf_url || ""),
    docx_url: String(links.docx_url || ""),
    source_type: "none",
    extracted_text: "",
    fetched_at: new Date().toISOString()
  };

  // Prefer DOCX first because it tends to contain cleaner section text for parsing.
  if (!result.extracted_text && result.docx_url && /\.docx(?:$|[?#])/i.test(result.docx_url)) {
    try {
      const localBuffer = readLocalStandardDocumentBuffer(result.docx_url);
      const bytes = localBuffer || await (async () => {
        const response = await fetch(result.docx_url, {
          headers: {
            "user-agent": "Mozilla/5.0 (DTECH-HUB/1.0)",
            "accept": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          }
        });
        return Buffer.from(await response.arrayBuffer());
      })();
      const extraction = await mammoth.extractRawText({ buffer: bytes });
      result.source_type = "docx";
      result.extracted_text = String(extraction?.value || "").replace(/\r/g, "").trim();
    } catch (_error) {
      // Continue to PDF fallback.
    }
  }

  if (!result.extracted_text && result.pdf_url) {
    try {
      const localBuffer = readLocalStandardDocumentBuffer(result.pdf_url);
      const bytes = localBuffer || await (async () => {
        const response = await fetch(result.pdf_url, {
          headers: {
            "user-agent": "Mozilla/5.0 (DTECH-HUB/1.0)",
            "accept": "application/pdf"
          }
        });
        return Buffer.from(await response.arrayBuffer());
      })();
      if (PDFParse) {
        const parser = new PDFParse({ data: bytes, verbosity: 0 });
        const extraction = await parser.getText();
        result.source_type = "pdf";
        result.extracted_text = String(extraction?.text || "").replace(/\r/g, "").trim();
      }
    } catch (_error) {
      // No further source fallback.
    }
  }

  if (!result.extracted_text || looksLikeBinaryGarble(result.extracted_text)) {
    result.source_type = "none";
    result.extracted_text = "No usable DOCX/PDF content could be extracted for this standard. The source has been limited to standard documents only (no general website fallback).";
  }

  result.criteria = extractAssessmentCriteriaFromText(result.extracted_text);

  nzqaStandardDetailsCache.set(cacheKey, {
    timestamp: now,
    value: result
  });

  return result;
}

async function fetchNzqaStandards(stream, level, options = {}) {
  const normalizedStream = String(stream || "").trim().toLowerCase();
  const normalizedLevel = Number.parseInt(level, 10);
  const includeDocs = options?.includeDocs === true;

  if (!["digital", "computing"].includes(normalizedStream)) {
    return [];
  }

  if (![1, 2, 3].includes(normalizedLevel)) {
    return [];
  }

  const cacheKey = `${normalizedStream}:${normalizedLevel}:${includeDocs ? "docs" : "base"}`;
  const now = Date.now();
  const cached = nzqaStandardsCache.get(cacheKey);
  if (cached && Number(cached.timestamp) + NZQA_CACHE_TTL_MS > now && Array.isArray(cached.rows)) {
    return cached.rows;
  }

  let rows = NZQA_STANDARDS_FALLBACK
    .filter((row) => String(row.stream || "").toLowerCase() === normalizedStream)
    .filter((row) => Number.parseInt(row.level, 10) === normalizedLevel)
    .map((row) => {
      const standard_number = String(row.standard_number || "").trim();
      const links = buildNzqaLinks(standard_number);
      return {
        standard_number,
        standard_name: String(row.standard_name || "").trim(),
        version: String(row.version || "").trim() || "1",
        level: Number.parseInt(row.level, 10) || normalizedLevel,
        credits: Number.isFinite(Number(row.credits)) ? Number(row.credits) : null,
        stream: normalizedStream,
        details_url: links.details_url,
        pdf_url: links.pdf_url,
        docx_url: links.docx_url
      };
    })
    .sort((left, right) => String(left.standard_number || "").localeCompare(String(right.standard_number || ""), undefined, { numeric: true }));

  if (includeDocs && rows.length) {
    rows = await Promise.all(rows.map(async (row) => {
      const links = await fetchNzqaAttachmentLinks(row.standard_number);
      return {
        ...row,
        details_url: links.details_url || row.details_url,
        pdf_url: links.pdf_url || row.pdf_url,
        docx_url: links.docx_url || row.docx_url
      };
    }));
  }

  nzqaStandardsCache.set(cacheKey, {
    timestamp: now,
    rows
  });

  return rows;
}

const CLASS_DATA_AGING_DAYS = parsePositiveInteger(process.env.CLASS_DATA_AGING_DAYS, DEFAULT_CLASS_DATA_AGING_DAYS);
const CLASS_DATA_STALE_DAYS = Math.max(
  CLASS_DATA_AGING_DAYS + 1,
  parsePositiveInteger(process.env.CLASS_DATA_STALE_DAYS, DEFAULT_CLASS_DATA_STALE_DAYS)
);
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
    ...STUDENT_TIMETABLE_PERIOD_COLUMNS.map((columnName) => row[columnName]),
    ...Object.values(row || {})
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

async function resolveExistingTableName(candidates) {
  const candidateList = Array.isArray(candidates) ? candidates.map((value) => String(value || "").trim()).filter(Boolean) : [];
  if (!candidateList.length) {
    return null;
  }

  if (!hasDatabase) {
    return candidateList[0] || null;
  }

  for (const tableName of candidateList) {
    try {
      const result = await pool.query("SELECT to_regclass($1) AS table_ref", [`public.${tableName}`]);
      if (String(result.rows?.[0]?.table_ref || "").trim()) {
        return tableName;
      }
    } catch (_error) {
    }
  }

  return null;
}

async function resolveExistingTableNames(candidates) {
  const candidateList = Array.isArray(candidates) ? candidates.map((value) => String(value || "").trim()).filter(Boolean) : [];
  if (!candidateList.length) {
    return [];
  }

  if (!hasDatabase) {
    return candidateList;
  }

  const existing = [];
  for (const tableName of candidateList) {
    try {
      const result = await pool.query("SELECT to_regclass($1) AS table_ref", [`public.${tableName}`]);
      if (String(result.rows?.[0]?.table_ref || "").trim()) {
        existing.push(tableName);
      }
    } catch (_error) {
    }
  }

  return existing;
}

async function getStudentDirectoryRows() {
  if (!hasDatabase) {
    return [];
  }

  const tableNames = await resolveExistingTableNames(STUDENT_TABLE_CANDIDATES);
  if (!tableNames.length) {
    return [];
  }

  const mergedRows = [];
  for (const tableName of tableNames) {
    try {
      const result = await pool.query(`SELECT * FROM ${quoteIdentifier(tableName)}`);
      if (Array.isArray(result.rows) && result.rows.length) {
        mergedRows.push(...result.rows);
      }
    } catch (_error) {
    }
  }

  return mergedRows;
}

function buildLowerKeyMap(row) {
  const map = new Map();
  Object.keys(row || {}).forEach((key) => {
    map.set(String(key || "").toLowerCase(), row[key]);
  });
  return map;
}

function pickRowValue(lowerMap, keys) {
  for (const key of Array.isArray(keys) ? keys : []) {
    const value = lowerMap.get(String(key || "").toLowerCase());
    if (typeof value === "undefined" || value === null) {
      continue;
    }
    const text = String(value || "").trim();
    if (text) {
      return text;
    }
  }
  return "";
}

function mergeUniqueStrings(values) {
  const seen = new Set();
  (Array.isArray(values) ? values : []).forEach((value) => {
    const text = String(value || "").trim();
    if (text) {
      seen.add(text);
    }
  });
  return Array.from(seen);
}

function collectStudentLinkedEmails(row) {
  const lower = buildLowerKeyMap(row);
  const linked = new Set();

  [
    "email_school",
    "email school",
    "student_email",
    "student email",
    "studentemail",
    "email",
    "email_address",
    "email address",
    "school_email",
    "school email",
    "google_email",
    "google email",
    "student_google_email",
    "student google email",
    "student_mail",
    "student mail",
    "mail",
    "upn"
  ].forEach((key) => {
    const raw = String(lower.get(key) || "").trim().toLowerCase();
    if (!raw) {
      return;
    }
    linked.add(raw.includes("@") ? raw : `${raw}@${SCHOOL_EMAIL_DOMAIN}`);
  });

  ["username", "user_name", "student_username", "login", "student_login"].forEach((key) => {
    const raw = String(lower.get(key) || "").trim().toLowerCase();
    if (!raw) {
      return;
    }
    linked.add(raw.includes("@") ? raw : `${raw}@${SCHOOL_EMAIL_DOMAIN}`);
  });

  return Array.from(linked);
}

function buildStudentClassManagementRow(row) {
  const lower = buildLowerKeyMap(row);
  const firstName = pickRowValue(lower, ["first_name", "first name", "firstname", "given_name", "given name"]);
  const lastName = pickRowValue(lower, ["last_name", "last name", "lastname", "surname", "family_name", "family name"]);
  const fullNameFallback = [firstName, lastName].filter(Boolean).join(" ").trim();
  const status = pickRowValue(lower, ["status", "student_status"]) || "Current";
  const timetable = STUDENT_TIMETABLE_PERIOD_COLUMNS
    .map((columnName) => {
      const value = String(row?.[columnName] || "").trim();
      if (!value) {
        return null;
      }
      return {
        label: TIMETABLE_LABELS.get(columnName) || columnName,
        value
      };
    })
    .filter(Boolean);

  const dtechTimetable = timetable.filter((entry) => {
    const text = String(entry?.value || "").toLowerCase();
    return DTECH_TIMETABLE_KEYWORDS.some((keyword) => text.includes(keyword));
  });

  const programs = getStudentPrograms(row);

  return {
    student_name: pickRowValue(lower, ["student_name", "student name", "full_name", "full name", "name", "student"]) || fullNameFallback || "Unnamed student",
    id_number: pickRowValue(lower, ["id_number", "student_id", "id", "idnumber"]),
    year_level: pickRowValue(lower, ["year_level", "year level", "year", "level", "yeargroup", "year_group"]),
    form_class: pickRowValue(lower, ["form_class", "form class", "form", "tutor", "tutor_class", "timetable_class", "home_room", "homeroom", "class"]),
    status,
    upload_term: pickRowValue(lower, ["upload_term", "term"]),
    upload_year: pickRowValue(lower, ["upload_year", "year_uploaded"]),
    upload_date: pickRowValue(lower, ["upload_date", "updated_at", "created_at"]),
    programs,
    has_dtech: programs.includes("DTECH"),
    linked_emails: collectStudentLinkedEmails(row),
    dtech_timetable: dtechTimetable,
    timetable
  };
}

function getStudentIdentityKey(row) {
  const idNumber = String(row?.id_number || "").trim().toLowerCase();
  if (idNumber) {
    return `id:${idNumber}`;
  }

  const name = String(row?.student_name || "").trim().toLowerCase();
  if (name) {
    return `name:${name}`;
  }

  const formClass = String(row?.form_class || "").trim().toLowerCase();
  const yearLevel = String(row?.year_level || "").trim().toLowerCase();
  return `fallback:${name}|${formClass}|${yearLevel}`;
}

function toEpochMillis(value) {
  const raw = String(value || "").trim();
  if (!raw) return 0;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function parseTermOrdinal(value) {
  const text = String(value || "").trim().toLowerCase();
  const matched = text.match(/term\s*(\d+)/i) || text.match(/\b(\d+)\b/);
  const term = Number.parseInt(matched?.[1] || "", 10);
  return Number.isInteger(term) ? term : 0;
}

function parseYearOrdinal(value) {
  const year = Number.parseInt(String(value || "").replace(/[^0-9]/g, ""), 10);
  return Number.isInteger(year) ? year : 0;
}

function getDtechSignalScore(row) {
  const hasDtech = row?.has_dtech ? 1 : 0;
  const dtechSlots = Array.isArray(row?.dtech_timetable) ? row.dtech_timetable.length : 0;
  return hasDtech * 100 + dtechSlots;
}

function shouldReplaceStudentSnapshot(currentRow, candidateRow) {
  const currentDate = toEpochMillis(currentRow?.upload_date);
  const candidateDate = toEpochMillis(candidateRow?.upload_date);
  if (candidateDate !== currentDate) {
    return candidateDate > currentDate;
  }

  const currentYear = parseYearOrdinal(currentRow?.upload_year);
  const candidateYear = parseYearOrdinal(candidateRow?.upload_year);
  if (candidateYear !== currentYear) {
    return candidateYear > currentYear;
  }

  const currentTerm = parseTermOrdinal(currentRow?.upload_term);
  const candidateTerm = parseTermOrdinal(candidateRow?.upload_term);
  if (candidateTerm !== currentTerm) {
    return candidateTerm > currentTerm;
  }

  const currentDtechSignal = getDtechSignalScore(currentRow);
  const candidateDtechSignal = getDtechSignalScore(candidateRow);
  if (candidateDtechSignal !== currentDtechSignal) {
    return candidateDtechSignal > currentDtechSignal;
  }

  const currentSlots = Array.isArray(currentRow?.timetable) ? currentRow.timetable.length : 0;
  const candidateSlots = Array.isArray(candidateRow?.timetable) ? candidateRow.timetable.length : 0;
  return candidateSlots > currentSlots;
}

function dedupeToLatestStudentRows(rows) {
  const latestByStudent = new Map();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const key = getStudentIdentityKey(row);
    const existing = latestByStudent.get(key);
    if (!existing) {
      latestByStudent.set(key, row);
      return;
    }

    const replace = shouldReplaceStudentSnapshot(existing, row);
    const preferred = replace ? row : existing;
    const secondary = replace ? existing : row;

    latestByStudent.set(key, {
      ...preferred,
      linked_emails: mergeUniqueStrings([
        ...(Array.isArray(preferred?.linked_emails) ? preferred.linked_emails : []),
        ...(Array.isArray(secondary?.linked_emails) ? secondary.linked_emails : [])
      ]),
      programs: mergeUniqueStrings([
        ...(Array.isArray(preferred?.programs) ? preferred.programs : []),
        ...(Array.isArray(secondary?.programs) ? secondary.programs : [])
      ])
    });
  });

  return Array.from(latestByStudent.values()).map((row) => ({
    ...row,
    has_dtech: Array.isArray(row?.programs) && row.programs.includes("DTECH")
  }));
}
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

const courseOutlinePdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const mime = String(file.mimetype || "").toLowerCase();
    const name = String(file.originalname || "").toLowerCase();
    const isPdfMime = mime === "application/pdf";
    const isPdfName = name.endsWith(".pdf");
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

async function getAllTableColumns(tableName) {
  if (!hasDatabase) {
    return [];
  }

  const safeTableName = String(tableName || "").trim().toLowerCase();
  if (!safeTableName) {
    return [];
  }

  try {
    const result = await pool.query(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
      `,
      [safeTableName]
    );

    return result.rows
      .map((row) => String(row?.column_name || "").trim())
      .filter(Boolean);
  } catch (_error) {
    return [];
  }
}

async function getTableColumnMetadata(tableName) {
  const metadataByColumn = new Map();
  if (!hasDatabase) {
    return metadataByColumn;
  }

  const safeTableName = String(tableName || "").trim().toLowerCase();
  if (!safeTableName) {
    return metadataByColumn;
  }

  try {
    const result = await pool.query(
      `
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
      `,
      [safeTableName]
    );

    result.rows.forEach((row) => {
      const columnName = String(row?.column_name || "").trim().toLowerCase();
      if (!columnName) {
        return;
      }

      metadataByColumn.set(columnName, {
        columnName,
        dataType: String(row?.data_type || "").trim().toLowerCase(),
        udtName: String(row?.udt_name || "").trim().toLowerCase()
      });
    });
  } catch (_error) {
    return metadataByColumn;
  }

  return metadataByColumn;
}

function pickExistingColumn(availableColumns, candidates) {
  const available = new Set(
    (Array.isArray(availableColumns) ? availableColumns : [])
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean)
  );

  for (const candidate of Array.isArray(candidates) ? candidates : []) {
    const normalized = String(candidate || "").trim().toLowerCase();
    if (normalized && available.has(normalized)) {
      return normalized;
    }
  }

  return null;
}

function isIntegerLikeColumn(metadata) {
  if (!metadata) {
    return false;
  }

  const dataType = String(metadata?.dataType || "").toLowerCase();
  const udtName = String(metadata?.udtName || "").toLowerCase();
  return ["smallint", "integer", "bigint"].includes(dataType)
    || ["int2", "int4", "int8"].includes(udtName);
}

function isJsonLikeColumn(metadata) {
  if (!metadata) {
    return false;
  }

  const dataType = String(metadata?.dataType || "").toLowerCase();
  const udtName = String(metadata?.udtName || "").toLowerCase();
  return dataType === "json" || dataType === "jsonb" || udtName === "json" || udtName === "jsonb";
}

async function getCheckConstraintAllowedValues(tableName, constraintName) {
  if (!hasDatabase) {
    return [];
  }

  const safeTableName = String(tableName || "").trim();
  const safeConstraintName = String(constraintName || "").trim();
  if (!safeTableName || !safeConstraintName) {
    return [];
  }

  try {
    const result = await pool.query(
      `
        SELECT pg_get_constraintdef(c.oid) AS definition
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = $1
          AND c.conname = $2
        LIMIT 1
      `,
      [safeTableName, safeConstraintName]
    );

    const definition = String(result.rows?.[0]?.definition || "");
    if (!definition) {
      return [];
    }

    const matches = definition.match(/'([^']+)'/g) || [];
    const values = matches
      .map((value) => String(value || "").replace(/^'/, "").replace(/'$/, "").trim())
      .filter(Boolean);

    return Array.from(new Set(values));
  } catch (_error) {
    return [];
  }
}

async function resolveActivityCategoryForInsert(activityCategory, activityType, options = {}) {
  const rawCategory = String(activityCategory || "").trim();
  const rawCategoryLower = rawCategory.toLowerCase();
  const preferAssessment = Boolean(options?.preferAssessment) || ["assessment", "assessment activity", "assessment task"].includes(rawCategoryLower);
  const isExplicitProjectRequest = rawCategoryLower === "project";
  const isExplicitPracticeRequest = ["practice", "skill activity", "practice activity"].includes(rawCategoryLower);
  const isExplicitActivityRequest = rawCategoryLower === "activity";

  if (!hasDatabase) {
    if (preferAssessment) {
      return rawCategory || "Assessment Task";
    }
    return rawCategory || "Activity";
  }

  const allowedActivityCategories = await getCheckConstraintAllowedValues(
    "activities",
    "activities_activity_category_check"
  );

  if (!allowedActivityCategories.length) {
    return rawCategory || "Activity";
  }

  const allowedByLower = new Map(
    allowedActivityCategories.map((value) => [String(value).toLowerCase(), value])
  );

  const findAllowed = (candidates) => {
    const found = (Array.isArray(candidates) ? candidates : [])
      .map((candidate) => String(candidate || "").trim())
      .filter(Boolean)
      .find((candidate) => allowedByLower.has(String(candidate).toLowerCase()));
    return found ? allowedByLower.get(String(found).toLowerCase()) : "";
  };

  if (preferAssessment) {
    const matchedAssessment = findAllowed([
      rawCategory,
      "Assessment Task",
      "Assessment",
      "Assessment Activity"
    ]);
    if (matchedAssessment) {
      return matchedAssessment;
    }
  }

  const preferredFallbacks = preferAssessment
    ? ["Assessment", "Assessment Task", "Assessment Activity", "Project", "Practice", "Activity"]
    : (isExplicitProjectRequest
      ? ["Project", "Practice", "Activity", "Assessment", "Assessment Task", "Assessment Activity"]
      : (isExplicitPracticeRequest
        ? ["Practice", "Activity", "Project", "Assessment", "Assessment Task", "Assessment Activity"]
        : (isExplicitActivityRequest
          ? ["Activity", "Practice", "Project", "Assessment", "Assessment Task", "Assessment Activity"]
          : ["Project", "Practice", "Activity", "Assessment", "Assessment Task", "Assessment Activity"]
        )
      )
    );

  const candidateValues = [
    rawCategory,
    rawCategory.replace(/\s*activity\s*$/i, "").trim(),
    String(activityType || "").trim(),
    ...preferredFallbacks
  ].filter(Boolean);

  const matched = findAllowed(candidateValues);
  return matched
    ? matched
    : allowedActivityCategories[0];
}

async function resolveActivityIdForInsert(idColumn, idMetadata, requestId, fallbackId) {
  const idIsInteger = isIntegerLikeColumn(idMetadata);
  const numericBodyId = Number.parseInt(requestId, 10);
  let resolvedNumericId = Number.isInteger(numericBodyId) ? numericBodyId : null;

  if (idIsInteger && !Number.isInteger(resolvedNumericId) && idColumn) {
    const nextIdResult = await pool.query(
      `SELECT COALESCE(MAX(${quoteIdentifier(idColumn)}), 0) + 1 AS next_id FROM activities`
    );
    const nextId = Number.parseInt(nextIdResult.rows?.[0]?.next_id, 10);
    if (Number.isInteger(nextId) && nextId > 0) {
      resolvedNumericId = nextId;
    }
  }

  const canUseExplicitId = Boolean(idColumn) && (!idIsInteger || Number.isInteger(resolvedNumericId));
  return {
    canUseExplicitId,
    idValueToSave: idIsInteger ? resolvedNumericId : fallbackId
  };
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

function normalizeStandardCodeList(value) {
  const raw = Array.isArray(value)
    ? value
    : String(value || "")
      .split(/[\r\n,;]+/);

  const unique = new Set();
  raw.forEach((entry) => {
    const code = String(entry || "").trim();
    if (code) {
      unique.add(code);
    }
  });

  return Array.from(unique);
}

function normalizeAssessmentStandardCardRow(row) {
  const source = row && typeof row === "object" ? row : {};
  const yearVersionRaw = Number.parseInt(source.year_version ?? source.year ?? source.yearVersion, 10);
  const creditsRaw = Number.parseInt(source.credits, 10);
  return {
    id: String(source.id || "").trim(),
    course_name: String(source.course_name || source.courseName || "").trim(),
    year_level: String(source.year_level || source.yearLevel || "").trim(),
    year_version: Number.isInteger(yearVersionRaw) ? yearVersionRaw : null,
    credits: Number.isInteger(creditsRaw) && creditsRaw >= 0 ? creditsRaw : null,
    standard_codes: normalizeStandardCodeList(source.standard_codes || source.standardCodes),
    achieved_text: String(source.achieved_text || source.achievedText || "").trim(),
    merit_text: String(source.merit_text || source.meritText || "").trim(),
    excellence_text: String(source.excellence_text || source.excellenceText || "").trim(),
    achieved_checklist: normalizeArray(source.achieved_checklist || source.achievedChecklist),
    merit_checklist: normalizeArray(source.merit_checklist || source.meritChecklist),
    excellence_checklist: normalizeArray(source.excellence_checklist || source.excellenceChecklist),
    card_color: "Teal",
    is_active: source.is_active === false ? false : source.isActive === false ? false : true,
    created_by_email: String(source.created_by_email || "").trim().toLowerCase(),
    updated_by_email: String(source.updated_by_email || "").trim().toLowerCase(),
    created_at: source.created_at || source.createdAt || null,
    updated_at: source.updated_at || source.updatedAt || null
  };
}

function pickBestAssessmentStandardCardMatch(cards, { standardCode, yearLevel, courseName, yearVersion }) {
  const normalizedCode = String(standardCode || "").trim();
  if (!normalizedCode) {
    return null;
  }

  const normalizedYearLevel = String(yearLevel || "").trim().toLowerCase();
  const normalizedCourseName = String(courseName || "").trim().toLowerCase();
  const normalizedYearVersion = Number.isInteger(Number.parseInt(yearVersion, 10))
    ? Number.parseInt(yearVersion, 10)
    : null;

  const scored = (Array.isArray(cards) ? cards : [])
    .map((row) => normalizeAssessmentStandardCardRow(row))
    .filter((row) => row.is_active)
    .filter((row) => {
      const rowCourseName = String(row.course_name || "").trim();
      const rowCodeList = Array.isArray(row.standard_codes)
        ? row.standard_codes.map((code) => String(code || "").trim())
        : [];

      if (rowCodeList.includes(normalizedCode)) {
        return true;
      }

      if (rowCodeList.some((code) => code.includes(normalizedCode))) {
        return true;
      }

      return rowCourseName.includes(normalizedCode);
    })
    .map((row) => {
      let score = 0;
      const rowYearLevel = String(row.year_level || "").trim().toLowerCase();
      const rowCourseName = String(row.course_name || "").trim().toLowerCase();
      const rowYearVersion = Number.parseInt(row.year_version, 10);

      if (normalizedYearLevel && rowYearLevel === normalizedYearLevel) score += 5;
      if (normalizedCourseName && rowCourseName === normalizedCourseName) score += 3;
      if (Number.isInteger(normalizedYearVersion) && Number.isInteger(rowYearVersion) && rowYearVersion === normalizedYearVersion) score += 4;
      if (!normalizedYearLevel && rowYearLevel) score += 1;

      const updatedAtTime = Number.isNaN(new Date(row.updated_at || 0).getTime()) ? 0 : new Date(row.updated_at || 0).getTime();
      return { row, score, updatedAtTime };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return right.updatedAtTime - left.updatedAtTime;
    });

  return scored.length ? scored[0].row : null;
}

async function ensureAssessmentStandardCardsSchema() {
  if (!hasDatabase) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS assessment_standard_cards (
      id TEXT PRIMARY KEY,
      course_name TEXT NOT NULL,
      year_level TEXT NOT NULL,
      year_version INTEGER NOT NULL,
      credits INTEGER,
      standard_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
      achieved_text TEXT NOT NULL DEFAULT '',
      merit_text TEXT NOT NULL DEFAULT '',
      excellence_text TEXT NOT NULL DEFAULT '',
      achieved_checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
      merit_checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
      excellence_checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
      card_color TEXT NOT NULL DEFAULT 'Teal',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by_email TEXT,
      updated_by_email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`ALTER TABLE assessment_standard_cards ADD COLUMN IF NOT EXISTS course_name TEXT`);
  await pool.query(`ALTER TABLE assessment_standard_cards ADD COLUMN IF NOT EXISTS year_level TEXT`);
  await pool.query(`ALTER TABLE assessment_standard_cards ADD COLUMN IF NOT EXISTS year_version INTEGER`);
  await pool.query(`ALTER TABLE assessment_standard_cards ADD COLUMN IF NOT EXISTS credits INTEGER`);
  await pool.query(`ALTER TABLE assessment_standard_cards ADD COLUMN IF NOT EXISTS standard_codes JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE assessment_standard_cards ADD COLUMN IF NOT EXISTS achieved_text TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE assessment_standard_cards ADD COLUMN IF NOT EXISTS merit_text TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE assessment_standard_cards ADD COLUMN IF NOT EXISTS excellence_text TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE assessment_standard_cards ADD COLUMN IF NOT EXISTS achieved_checklist JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE assessment_standard_cards ADD COLUMN IF NOT EXISTS merit_checklist JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE assessment_standard_cards ADD COLUMN IF NOT EXISTS excellence_checklist JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE assessment_standard_cards ADD COLUMN IF NOT EXISTS card_color TEXT NOT NULL DEFAULT 'Teal'`);
  await pool.query(`ALTER TABLE assessment_standard_cards ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`);
  await pool.query(`ALTER TABLE assessment_standard_cards ADD COLUMN IF NOT EXISTS created_by_email TEXT`);
  await pool.query(`ALTER TABLE assessment_standard_cards ADD COLUMN IF NOT EXISTS updated_by_email TEXT`);
  await pool.query(`ALTER TABLE assessment_standard_cards ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await pool.query(`ALTER TABLE assessment_standard_cards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await pool.query(`CREATE INDEX IF NOT EXISTS assessment_standard_cards_year_idx ON assessment_standard_cards (year_version)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS assessment_standard_cards_active_idx ON assessment_standard_cards (is_active)`);
}

async function ensureActivityHubVisibilitySchema() {
  if (!hasDatabase) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS activity_hub_visibility (
      activity_id TEXT NOT NULL,
      hub_name TEXT NOT NULL,
      is_visible BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (activity_id, hub_name)
    );
  `);

  await pool.query(`ALTER TABLE activity_hub_visibility ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT TRUE`);
  await pool.query(`ALTER TABLE activity_hub_visibility ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
}

async function upsertHubVisibility(activityIds, hubName, isVisible) {
  if (!hasDatabase) {
    return 0;
  }

  const ids = Array.isArray(activityIds)
    ? activityIds.map((value) => String(value || "").trim()).filter(Boolean)
    : [];

  if (!ids.length || !String(hubName || "").trim()) {
    return 0;
  }

  await ensureActivityHubVisibilitySchema();

  let affected = 0;
  for (const activityId of ids) {
    await pool.query(
      `
        INSERT INTO activity_hub_visibility (activity_id, hub_name, is_visible, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (activity_id, hub_name) DO UPDATE SET
          is_visible = EXCLUDED.is_visible,
          updated_at = NOW()
      `,
      [activityId, String(hubName).trim(), Boolean(isVisible)]
    );
    affected += 1;
  }

  return affected;
}

function isExcludedNonDtechActivity(activity) {
  const row = activity && typeof activity === "object" ? activity : {};
  const fields = [
    row.name,
    row.title,
    row.type,
    row.subject_stream,
    row.subject,
    row.description,
    row.summary,
    row.short_description,
    row.topic,
    row.learning_area,
    row.tags,
    row.keywords,
    row.activity_category,
    row.category
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);

  const combined = `${fields.join(" | ")} | ${JSON.stringify(row || {}).toLowerCase()}`;
  const looksLikeSewingRoomContent = [
    "sewing room",
    "machine sewing",
    "fabric",
    "textile",
    "textiles",
    "garment",
    "pattern making",
    "sampler",
    "felt",
    "felting",
    "fixings",
    "zip",
    "zipper",
    "zips",
    "button",
    "buttons",
    "bow",
    "bows",
    "lacing",
    "fastening",
    "fastenings",
    "needle",
    "stitch"
  ].some((token) => combined.includes(token));

  const explicitSewingStream = ["text", "textiles", "sewing", "fashion"].includes(
    String(row.subject_stream || row.subject || "").trim().toLowerCase()
  );

  return looksLikeSewingRoomContent || explicitSewingStream;
}

function hasAssessmentSignals(activity) {
  const row = activity || {};
  const hasMeaningfulValue = (value) => {
    if (Array.isArray(value)) {
      return value.map((item) => String(item || "").trim()).filter(Boolean).length > 0;
    }

    const text = String(value || "").trim();
    if (!text) return false;
    if (text === "[]" || text === "{}") return false;

    const lowered = text.toLowerCase();
    if (lowered === "null" || lowered === "undefined" || lowered === "none" || lowered === "n/a") {
      return false;
    }

    return true;
  };

  return [
    row.standard_details,
    row.tasks_list,
    row.assessment_focus,
    row.achieved,
    row.merit,
    row.excellence,
    row.submission_requirements,
    row.relevant_implications,
    row.progress_logging,
    row.feedback_trialling
  ].some((value) => hasMeaningfulValue(value));
}

function hasAssessmentPayloadShape(activity) {
  const row = activity || {};
  const keys = [
    "standard_details",
    "tasks_list",
    "assessment_focus",
    "achieved",
    "merit",
    "excellence",
    "submission_requirements",
    "relevant_implications",
    "progress_logging",
    "feedback_trialling"
  ];

  return keys.some((key) => Object.prototype.hasOwnProperty.call(row, key));
}

function isAssessmentCategoryLabel(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized.includes("assessment");
}

function isExplicitActivityCategoryLabel(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "activity" || normalized === "skill activity" || normalized === "practice" || normalized === "practice activity";
}

function hasMeaningfulCategorySignalValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean).length > 0;
  }

  const text = String(value || "").trim();
  if (!text) return false;
  if (text === "[]" || text === "{}") return false;

  const lowered = text.toLowerCase();
  if (lowered === "null" || lowered === "undefined" || lowered === "none" || lowered === "n/a") return false;

  return true;
}

function hasProjectPayloadShape(row) {
  const candidate = row && typeof row === "object" ? row : {};
  return [
    candidate.start_date,
    candidate.startDate,
    candidate.contact_name,
    candidate.contactName,
    candidate.contact_email,
    candidate.contactEmail,
    candidate.company,
    candidate.address,
    candidate.overview,
    candidate.services,
    candidate.costs,
    candidate.outcomes
  ].some((value) => hasMeaningfulCategorySignalValue(value));
}

function normalizeActivityCategoryForResponse(activity) {
  const row = activity && typeof activity === "object" ? { ...activity } : {};
  const resolvedCategoryText = String(row.activity_category || row.category || "").trim();
  if (resolvedCategoryText && !String(row.activity_category || "").trim()) {
    row.activity_category = resolvedCategoryText;
  }

  const rawCategory = String(row.activity_category || "").trim().toLowerCase();
  const hasProjectShape = hasProjectPayloadShape(row);
  const normalizedTitle = String(row.name || row.title || "").trim().toLowerCase();
  const isKnownLegacyAssessmentTitle = normalizedTitle === "making interview show";
  const assessmentText = [row.name, row.title, row.description, row.summary]
    .map((value) => String(value || "").trim().toLowerCase())
    .join(" ");
  const hasAssessmentTextSignal = /\bassessment\b/.test(assessmentText);

  if (isKnownLegacyAssessmentTitle) {
    row.activity_category = "Assessment Task";
    return row;
  }

  if (rawCategory === "assessment" || rawCategory === "assessment activity") {
    row.activity_category = "Assessment Task";
    return row;
  }

  if ((rawCategory === "activity" || rawCategory === "practice" || rawCategory === "practice activity" || rawCategory === "skill activity") && hasProjectShape && !hasAssessmentSignals(row)) {
    row.activity_category = "Project";
    return row;
  }

  if (rawCategory === "" && (hasAssessmentSignals(row) || hasAssessmentTextSignal)) {
    row.activity_category = "Assessment Task";
    return row;
  }

  if (rawCategory === "" && hasProjectShape) {
    row.activity_category = "Project";
  }

  return row;
}

function getDefaultCardColorForCategory(categoryValue) {
  const category = String(categoryValue || "").trim().toLowerCase();

  if (category.includes("task topic")) return "Azure";
  if (category.includes("standard")) return "Teal";
  if (category.includes("lesson")) return "Rose";
  if (category.includes("assessment")) return "Slate";
  if (category.includes("project")) return "Violet";
  if (category.includes("activity") || category.includes("practice")) return "Amber";

  return "Amber";
}

function filterDtechActivities(rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => !isExcludedNonDtechActivity(row))
    .map((row) => normalizeActivityCategoryForResponse(row));
}

function normalizeUnitLessons(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const coerceBoolean = (rawValue, defaultValue = false) => {
    if (typeof rawValue === "boolean") {
      return rawValue;
    }

    if (typeof rawValue === "string") {
      const normalized = rawValue.trim().toLowerCase();
      if (["true", "yes", "y", "1", "on"].includes(normalized)) {
        return true;
      }
      if (["false", "no", "n", "0", "off", ""].includes(normalized)) {
        return false;
      }
      return defaultValue;
    }

    if (typeof rawValue === "number") {
      return rawValue !== 0;
    }

    if (rawValue === null || rawValue === undefined) {
      return defaultValue;
    }

    return Boolean(rawValue);
  };

  return value.map((lesson, index) => {
    const lessonIndex = Number.parseInt(lesson?.lesson_index ?? lesson?.lessonIndex ?? index + 1, 10);
    const explicitUnitTopic = String(lesson?.unit_topic ?? lesson?.unitTopic ?? lesson?.lessonUnitTopic ?? "").trim();

    return {
      lesson_index: Number.isInteger(lessonIndex) && lessonIndex > 0 ? lessonIndex : index + 1,
      unit_topic: explicitUnitTopic,
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
      publish_activity: coerceBoolean(lesson?.publish_activity ?? lesson?.publishActivity, true),
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

function normalizeTimestamp(value, fallback = new Date()) {
  const fallbackDate = fallback instanceof Date ? fallback : new Date(fallback || Date.now());

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  const rawValue = String(value || "").trim();
  if (!rawValue) {
    return fallbackDate.toISOString();
  }

  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) {
    return fallbackDate.toISOString();
  }

  return parsed.toISOString();
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
  let currentYearLevel = "";
  let currentUnitTopic = "";
  let waitingForTopicAfterYear = false;
  const urlPattern = /(https?:\/\/[^\s)]+|www\.[^\s)]+)/i;
  const activityHeadingPattern = /^(.+?)(?:\s+activities?)?\s*:\s*$/i;
  const yearLevelPattern = /^(juniors?|middle(?:\/seniors?)?|seniors?|year\s*\d+(?:\s*(?:\/|and|&)\s*\d+)?)\b/i;
  const likelyLessonObjectivePattern = /^l\d+\s*[-:]|^\d+\s*[-:]/i;
  const blockedTopicLabelPattern = /^(school\s*values?|level\s*\d+|year\s*\d+|technology\s*strand|whanaungatanga|manaakitanga|rangatiratanga|kotahitanga|kaitiakitanga|\d+|\d+\s*\/\s*\d+)$/i;
  const standaloneTopicPattern = /(\bblock\s+programming\b|\btutorial\s+programming\b|\bproject\s+programming\b|^binary\b|^assessment\b|\bbreadboard\b|\bmicro(?:\s*::?\s*|\s*:\s*|\s+)?bit\b|\bmicrobit\b|\bsolder(?:ing)?\b|\bpcb\b|\bprinted\s*circuit\s*boards?\b|\barduino\b)/i;

  const looksLikeUnitTopicLabel = (value) => {
    const text = String(value || "").trim();
    if (!text) return false;
    if (likelyLessonObjectivePattern.test(text)) return false;
    if (blockedTopicLabelPattern.test(text)) return false;
    if (/^\d+(?:\s*\/\s*\d+)?$/.test(text)) return false;
    if (/[.;!?]$/.test(text) || text.includes(". ")) return false;
    if (text.length > 70) return false;
    return true;
  };

  const formatContextUnitTopic = () => {
    const year = String(currentYearLevel || "").trim();
    const topic = String(currentUnitTopic || "").trim();
    if (!topic) {
      return "";
    }
    return year ? `${year} | ${topic}` : topic;
  };

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
        year_level: String(currentLesson.year_level || currentYearLevel || "").trim(),
        unit_topic: formatContextUnitTopic(),
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

    if (yearLevelPattern.test(text)) {
      flushLesson();
      currentYearLevel = text;
      waitingForTopicAfterYear = true;
      return;
    }

    const activityHeadingMatch = text.match(activityHeadingPattern);
    if (activityHeadingMatch) {
      flushLesson();
      currentUnitTopic = String(activityHeadingMatch[1] || "").replace(/:\s*$/, "").trim();
      waitingForTopicAfterYear = false;
      return;
    }

    if (!currentLesson && looksLikeUnitTopicLabel(text) && standaloneTopicPattern.test(text)) {
      flushLesson();
      currentUnitTopic = String(text || "").replace(/:\s*$/, "").trim();
      waitingForTopicAfterYear = false;
      return;
    }

    if (waitingForTopicAfterYear && blockedTopicLabelPattern.test(text)) {
      waitingForTopicAfterYear = false;
      return;
    }

    if (waitingForTopicAfterYear && looksLikeUnitTopicLabel(text)) {
      currentUnitTopic = text;
      waitingForTopicAfterYear = false;
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

function extractOrderedUnitTopicsFromSlideshow(lines) {
  const topics = [];
  const seen = new Set();
  let currentYearLevel = "";
  let waitingForTopicAfterYear = false;

  const yearLevelPattern = /^(juniors?|middle(?:\/seniors?)?|seniors?|year\s*\d+(?:\s*(?:\/|and|&)\s*\d+)?)\b/i;
  const activityHeadingPattern = /^(.+?)(?:\s+activities?)?\s*:\s*$/i;
  const ignoredHeadingPattern = /^(slideshow|reporting\s*&\s*assessment\s*link|unit\s*evaluation|assessment\s*link)$/i;
  const likelyLessonObjectivePattern = /^l\d+\s*[-:]|^\d+\s*[-:]/i;
  const blockedTopicLabelPattern = /^(school\s*values?|level\s*\d+|year\s*\d+|technology\s*strand|whanaungatanga|manaakitanga|rangatiratanga|kotahitanga|kaitiakitanga|\d+|\d+\s*\/\s*\d+)$/i;
  const standaloneTopicPattern = /(\bblock\s+programming\b|\btutorial\s+programming\b|\bproject\s+programming\b|^binary\b|^assessment\b|\bbreadboard\b|\bmicro(?:\s*::?\s*|\s*:\s*|\s+)?bit\b|\bmicrobit\b|\bsolder(?:ing)?\b|\bpcb\b|\bprinted\s*circuit\s*boards?\b|\barduino\b)/i;

  const looksLikeUnitTopicLabel = (value) => {
    const text = String(value || "").trim();
    if (!text) return false;
    if (ignoredHeadingPattern.test(text)) return false;
    if (yearLevelPattern.test(text)) return false;
    if (likelyLessonObjectivePattern.test(text)) return false;
    if (blockedTopicLabelPattern.test(text)) return false;
    if (/^\d+(?:\s*\/\s*\d+)?$/.test(text)) return false;
    if (/[.;!?]$/.test(text) || text.includes(". ")) return false;
    if (text.length > 70) return false;
    return true;
  };

  const canonicalizeYearLevel = (value) => {
    const text = String(value || "").trim().toLowerCase();
    if (!text) return "";
    if (/\bjunior/.test(text)) return "juniors";
    if (/\bmiddle/.test(text)) return "middle";
    if (/\bsenior/.test(text)) return "senior";
    const yearMatch = text.match(/year\s*(\d{1,2})/);
    if (yearMatch?.[1]) return `year${yearMatch[1]}`;
    return text.replace(/[^a-z0-9]+/g, " ").trim();
  };

  const canonicalizeTopicName = (value) => {
    const text = String(value || "").trim().toLowerCase();
    if (!text) return "";
    if (/\bpcb\b/.test(text) || /printed\s*circuit\s*boards?/.test(text)) return "pcb";
    if (/micro\s*:?\s*:?-?\s*bit/.test(text) || /microbit/.test(text)) return "microbit";
    if (/^ardunio$/.test(text) || /^arduino$/.test(text)) return "arduino";
    return text.replace(/[^a-z0-9]+/g, " ").trim();
  };

  const addTopic = (topicValue) => {
    const topic = String(topicValue || "").trim();
    if (!topic) {
      return;
    }

    const label = currentYearLevel ? `${currentYearLevel} | ${topic}` : topic;
    const key = `${canonicalizeYearLevel(currentYearLevel)}|${canonicalizeTopicName(topic)}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    topics.push(label);
  };

  (Array.isArray(lines) ? lines : []).forEach((line) => {
    const text = String(line || "").trim();
    if (!text) {
      return;
    }

    if (yearLevelPattern.test(text)) {
      currentYearLevel = text;
      waitingForTopicAfterYear = true;
      return;
    }

    if (ignoredHeadingPattern.test(text)) {
      waitingForTopicAfterYear = false;
      return;
    }

    const activityMatch = text.match(activityHeadingPattern);
    if (activityMatch) {
      const topic = String(activityMatch[1] || "").replace(/:\s*$/, "").trim();
      addTopic(topic);
      waitingForTopicAfterYear = false;
      return;
    }

    if (looksLikeUnitTopicLabel(text) && standaloneTopicPattern.test(text)) {
      addTopic(String(text || "").replace(/:\s*$/, "").trim());
      waitingForTopicAfterYear = false;
      return;
    }

    if (waitingForTopicAfterYear && blockedTopicLabelPattern.test(text)) {
      waitingForTopicAfterYear = false;
      return;
    }

    if (waitingForTopicAfterYear && looksLikeUnitTopicLabel(text)) {
      addTopic(text);
      waitingForTopicAfterYear = false;
      return;
    }
  });

  return topics;
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
  const lessons = normalizeUnitLessons(parseLessonRowsFromSlideshow(lessonLines));
  const orderedTopicsFromTable = extractOrderedUnitTopicsFromSlideshow(lessonLines);
  const topicsFromLessons = Array.from(new Set(
    lessons
      .map((lesson) => String(lesson?.unit_topic || "").trim())
      .filter(Boolean)
  ));
  const unitTopics = (() => {
    const ordered = Array.isArray(orderedTopicsFromTable) ? orderedTopicsFromTable : [];
    const fromLessons = Array.isArray(topicsFromLessons) ? topicsFromLessons : [];
    const source = ordered.length ? [...ordered, ...fromLessons] : fromLessons;
    const seen = new Set();
    const result = [];

    source.forEach((topic) => {
      const label = String(topic || "").trim();
      if (!label) return;
      const key = label.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      result.push(label);
    });

    return result;
  })();

  return {
    title: topic,
    topic,
    strand: "",
    year_level: yearLevel || "Middle",
    term: "",
    subject_stream: detectSubjectStreamFromText(rawText),
    duration_weeks: Math.max(1, lessons.length ? Math.ceil(lessons.length / 5) : 1),
    overview,
    unit_topics: unitTopics,
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
    unit_topics: normalizeArray(body?.unit_topics ?? body?.unitTopics),
    unit_aims: normalizeArray(body?.unit_aims ?? body?.unitAims),
    unit_values: normalizeArray(body?.unit_values ?? body?.unitValues),
    contexts: normalizeArray(body?.contexts ?? body?.unitContexts),
    curriculum_links: normalizeArray(body?.curriculum_links ?? body?.curriculumLinks),
    assessment_link: String(body?.assessment_link || body?.assessmentLink || "").trim(),
    notes: String(body?.notes || body?.unitNotes || "").trim(),
    lessons: normalizeUnitLessons(body?.lessons),
    created_by_email: userEmail,
    created_at: normalizeTimestamp(body?.created_at),
    updated_at: normalizeTimestamp(new Date())
  };
}

async function saveUnitPlanPayload(payload) {
  if (!hasDatabase) {
    memoryUnitPlans.set(payload.id, payload);
    return payload;
  }

  await ensureUnitPlanSchema();
  const createdAt = normalizeTimestamp(payload.created_at);
  const updatedAt = normalizeTimestamp(payload.updated_at);
  const result = await pool.query(
    `
      INSERT INTO unit_plans (
        id, title, topic, strand, year_level, term, subject_stream, duration_weeks, overview, unit_topics, unit_aims, unit_values, contexts, curriculum_links, assessment_link, notes, lessons, created_by_email, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, $15, $16, $17::jsonb, $18, $19::timestamptz, $20::timestamptz
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
        unit_topics = EXCLUDED.unit_topics,
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
      JSON.stringify(payload.unit_topics || []),
      JSON.stringify(payload.unit_aims || []),
      JSON.stringify(payload.unit_values || []),
      JSON.stringify(payload.contexts || []),
      JSON.stringify(payload.curriculum_links || []),
      payload.assessment_link || null,
      payload.notes || null,
      JSON.stringify(payload.lessons || []),
      payload.created_by_email,
      createdAt,
      updatedAt
    ]
  );

  return result.rows[0];
}

function getUnitPlanLessonCardId(unitPlanId, lessonIndex) {
  const safePlanId = slugify(unitPlanId || "unit-plan");
  return `unitplan-${safePlanId}-lesson-${lessonIndex}`;
}

function buildLessonCardFromUnitLesson(unitPlan, lesson, fallbackIndex = 1) {
  const lessonIndex = Number.parseInt(lesson?.lesson_index ?? fallbackIndex, 10);
  const safeLessonIndex = Number.isInteger(lessonIndex) && lessonIndex > 0 ? lessonIndex : fallbackIndex;
  const lessonTitle = String(lesson?.title || lesson?.activity_name || `Lesson ${safeLessonIndex}`).trim() || `Lesson ${safeLessonIndex}`;
  const lessonFocus = String(lesson?.focus || lesson?.notes || "").trim() || `Lesson ${safeLessonIndex} from ${String(unitPlan?.title || "Unit Plan").trim()}`;
  const explicitPublish = lesson?.publish_activity ?? lesson?.publishActivity;
  const publishActivity =
    typeof explicitPublish === "boolean"
      ? explicitPublish
      : ["false", "no", "0", "off"].includes(String(explicitPublish || "").trim().toLowerCase())
        ? false
        : true;

  return {
    id: getUnitPlanLessonCardId(unitPlan?.id, safeLessonIndex),
    lesson_title: lessonTitle,
    lesson_week: String(lesson?.week_label || "").trim(),
    lesson_date: String(lesson?.calendar_date || "").trim(),
    lesson_duration_minutes: Number.parseInt(lesson?.duration_minutes ?? 1, 10) || 1,
    lesson_type: String(lesson?.activity_type || unitPlan?.topic || "Lesson").trim() || "Lesson",
    lesson_card_color: String(lesson?.card_color || "Rose").trim() || "Rose",
    activity_name: String(lesson?.activity_name || lessonTitle).trim() || lessonTitle,
    lesson_year_level: String(lesson?.year_level || unitPlan?.year_level || "").trim(),
    lesson_link_url: String(lesson?.link_url || "").trim(),
    lesson_focus: lessonFocus,
    lesson_notes: String(lesson?.notes || lessonFocus).trim(),
    publish_activity: publishActivity,
    add_to_calendar: Boolean(lesson?.add_to_calendar),
    created_by_email: String(unitPlan?.created_by_email || "").trim(),
    created_at: normalizeTimestamp(unitPlan?.created_at),
    updated_at: normalizeTimestamp(new Date())
  };
}

function getUnitPlanLessonCardFingerprint(card) {
  const normalize = (value) => String(value || "").trim().toLowerCase();
  return [
    normalize(card?.lesson_title),
    normalize(card?.lesson_type),
    normalize(card?.lesson_year_level),
    normalize(card?.lesson_focus)
  ].join("|");
}

async function syncUnitPlanLessonsToLibrary(unitPlan) {
  const unitPlanId = String(unitPlan?.id || "").trim();
  if (!unitPlanId) {
    return 0;
  }

  const lessons = normalizeUnitLessons(unitPlan?.lessons);
  const cardPrefix = `unitplan-${slugify(unitPlanId)}-lesson-`;
  let syncedCount = 0;

  if (!hasDatabase) {
    Array.from(memoryLessons.keys())
      .filter((lessonId) => String(lessonId || "").startsWith(cardPrefix))
      .forEach((lessonId) => {
        memoryLessons.delete(lessonId);
      });

    for (let index = 0; index < lessons.length; index += 1) {
      const lesson = lessons[index];
      const card = buildLessonCardFromUnitLesson(unitPlan, lesson, index + 1);
      const fingerprint = getUnitPlanLessonCardFingerprint(card);
      const duplicateExists = Array.from(memoryLessons.values()).some((existing) => (
        String(existing?.id || "").startsWith("unitplan-") &&
        String(existing?.id || "") !== card.id &&
        getUnitPlanLessonCardFingerprint(existing) === fingerprint
      ));

      if (duplicateExists) {
        continue;
      }

      memoryLessons.set(card.id, card);
      syncedCount += 1;
    }

    return syncedCount;
  }

  await pool.query("DELETE FROM lessons WHERE id LIKE $1", [`${cardPrefix}%`]);

  for (let index = 0; index < lessons.length; index += 1) {
    const lesson = lessons[index];
    const card = buildLessonCardFromUnitLesson(unitPlan, lesson, index + 1);

    const duplicateResult = await pool.query(
      `SELECT id FROM lessons
       WHERE id LIKE 'unitplan-%'
         AND id <> $1
         AND lower(trim(COALESCE(lesson_title, ''))) = lower(trim($2))
         AND lower(trim(COALESCE(lesson_type, ''))) = lower(trim($3))
         AND lower(trim(COALESCE(lesson_year_level, ''))) = lower(trim($4))
         AND lower(trim(COALESCE(lesson_focus, ''))) = lower(trim($5))
       LIMIT 1`,
      [card.id, card.lesson_title, card.lesson_type, card.lesson_year_level, card.lesson_focus]
    );

    if (duplicateResult.rowCount) {
      continue;
    }

    await pool.query(
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
       updated_at = EXCLUDED.updated_at`,
      [
        card.id,
        card.lesson_title,
        card.lesson_week,
        card.lesson_date,
        card.lesson_duration_minutes,
        card.lesson_type,
        card.lesson_card_color,
        card.activity_name,
        card.lesson_year_level,
        card.lesson_link_url,
        card.lesson_focus,
        card.lesson_notes,
        card.publish_activity,
        card.add_to_calendar,
        card.created_by_email,
        card.created_at,
        card.updated_at
      ]
    );

    syncedCount += 1;
  }

  return syncedCount;
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'");
}

function normalizeHtmlCellText(html) {
  const withLineBreaks = String(html || "")
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/?\s*(p|div|li|ul|ol)\b[^>]*>/gi, "\n");

  const plain = withLineBreaks.replace(/<[^>]+>/g, " ");
  return decodeHtmlEntities(plain)
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHtmlCellLines(html) {
  const withLineBreaks = String(html || "")
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/?\s*(p|div|li|ul|ol)\b[^>]*>/gi, "\n");

  const plain = withLineBreaks.replace(/<[^>]+>/g, " ");
  return decodeHtmlEntities(plain)
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function isLikelyYearLabel(value) {
  const text = String(value || "").trim().toLowerCase();
  return /^(juniors?|middle(?:\/seniors?)?|seniors?|year\s*\d+)/i.test(text);
}

function isLikelyValidTopicText(value) {
  const text = String(value || "").trim();
  const lower = text.toLowerCase();
  if (!text) return false;
  if (text.length > 90) return false;
  if (/^(school\s*values?|technology\s*strand|level\s*\d+|\d+|\d+\s*\/\s*\d+)$/i.test(lower)) return false;
  if (/^(assessment\s*instructions?|assessment\s*schedule|assessment\s*clarity|assessment\s*due|assessment\s*time)$/i.test(lower)) return false;
  return true;
}

function extractUnitTopicsFromDocxHtml(html) {
  const source = String(html || "");
  if (!source) {
    return [];
  }

  const tableMatches = source.match(/<table[\s\S]*?<\/table>/gi) || [];

  const evaluateTable = (tableHtml) => {
    const lowerTable = String(tableHtml || "").toLowerCase();
    if (!tableHtml) {
      return { score: -1, topics: [] };
    }

    // Explicitly avoid slideshow/reporting/evaluation tables, which contain lesson flow not unit topic map.
    if (/slideshow|reporting\s*&\s*assessment|unit\s*evaluation/.test(lowerTable)) {
      return { score: -1, topics: [] };
    }

    const topics = [];
    const seen = new Set();
    let lastYear = "";
    let validTopicRows = 0;
    let yearTopicRows = 0;

    const rowMatches = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];
    rowMatches.forEach((rowHtml) => {
      const cellMatches = rowHtml.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || [];
      const cells = cellMatches
        .map((cellHtml) => normalizeHtmlCellText(cellHtml))
        .filter(Boolean);

      if (cells.length < 2) {
        return;
      }

      const first = cells[0] || "";
      const second = cells[1] || "";
      const rowText = cells.join(" | ").toLowerCase();

      if (/unit\s*topics?|lessons?|learning\s*experience|intentions?/.test(rowText)) {
        return;
      }

      let year = "";
      let topic = "";

      if (isLikelyYearLabel(first)) {
        year = first;
        topic = second;
        lastYear = year;
        yearTopicRows += 1;
      } else if (isLikelyYearLabel(second) && cells.length >= 3) {
        year = second;
        topic = cells[2] || "";
        lastYear = year;
        yearTopicRows += 1;
      } else {
        year = lastYear;
        topic = second || first;
      }

      if (!isLikelyValidTopicText(topic)) {
        return;
      }

      const label = year ? `${year} | ${topic}` : topic;
      const key = label.toLowerCase();
      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      topics.push(label);
      validTopicRows += 1;
    });

    const hasUnitHeadingHint = /unit\s*topics?/.test(lowerTable) ? 4 : 0;
    const score = validTopicRows + (yearTopicRows * 2) + hasUnitHeadingHint;
    return { score, topics };
  };

  let best = { score: -1, topics: [] };
  tableMatches.forEach((tableHtml) => {
    const candidate = evaluateTable(tableHtml);
    if (candidate.score > best.score && candidate.topics.length) {
      best = candidate;
    }
  });

  return best.topics;
}

function extractLessonsFromDocxHtml(html) {
  const source = String(html || "");
  if (!source) {
    return [];
  }

  const tableMatches = source.match(/<table[\s\S]*?<\/table>/gi) || [];
  const lessonTable = tableMatches.find((tableHtml) => /slideshow/i.test(tableHtml) && /slides?/i.test(tableHtml)) || "";
  if (!lessonTable) {
    return [];
  }

  const lessons = [];
  const seen = new Set();
  let currentYear = "";
  let sequence = 1;

  const rowMatches = lessonTable.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  rowMatches.forEach((rowHtml) => {
    const cellMatches = rowHtml.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || [];
    if (cellMatches.length < 2) {
      return;
    }

    const col1Lines = normalizeHtmlCellLines(cellMatches[0]);
    const col2Lines = normalizeHtmlCellLines(cellMatches[1]);
    const col3Lines = cellMatches[2] ? normalizeHtmlCellLines(cellMatches[2]) : [];

    const col1Text = col1Lines.join(" ").trim();
    const col2Text = col2Lines.join(" ").trim();
    const rowText = `${col1Text} | ${col2Text} | ${col3Lines.join(" ")}`.toLowerCase();

    if (!col2Lines.length) {
      return;
    }

    if (/main\s*lesson\s*resource|lesson\s*topic|lesson\s*objectives|activity\s*details|slideshow/.test(rowText)) {
      return;
    }

    if (isLikelyYearLabel(col1Text)) {
      currentYear = col1Text;
    }

    const title = String(col2Lines[0] || "").replace(/:\s*$/, "").trim();
    if (!title) {
      return;
    }

    const notesLines = [...col2Lines.slice(1), ...col3Lines].filter(Boolean);
    const focus = notesLines.join(" ").trim();
    const yearLevel = currentYear || col1Text;
    const unitTopic = yearLevel ? `${yearLevel} | ${title}` : title;

    const dedupeKey = `${title.toLowerCase()}|${(yearLevel || "").toLowerCase()}`;
    if (seen.has(dedupeKey)) {
      return;
    }
    seen.add(dedupeKey);

    lessons.push({
      lesson_index: sequence,
      title,
      focus,
      notes: focus,
      duration_minutes: 1,
      activity_name: title,
      year_level: yearLevel,
      unit_topic: unitTopic,
      publish_activity: true,
      add_to_calendar: false
    });
    sequence += 1;
  });

  return lessons;
}

function mergeLessonsPreferComplete(primaryLessons, secondaryLessons) {
  const merged = [];
  const seen = new Set();
  const pushUnique = (lesson) => {
    const title = String(lesson?.title || lesson?.lessonTitle || lesson?.activity_name || "").trim();
    const year = String(lesson?.year_level || lesson?.lessonYearLevel || "").trim();
    if (!title) {
      return;
    }
    const key = `${title.toLowerCase()}|${year.toLowerCase()}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    merged.push(lesson);
  };

  (Array.isArray(primaryLessons) ? primaryLessons : []).forEach(pushUnique);
  (Array.isArray(secondaryLessons) ? secondaryLessons : []).forEach(pushUnique);

  return normalizeUnitLessons(merged);
}

async function parseDocxBufferToUnitPlanPayload(buffer, originalName, userEmail) {
  const [rawExtraction, htmlExtraction] = await Promise.all([
    mammoth.extractRawText({ buffer }),
    mammoth.convertToHtml({ buffer })
  ]);

  const parsed = parseUnitPlanFromDocxText(rawExtraction.value || "", originalName || "");
  const payload = buildUnitPlanPayload(parsed, userEmail);
  const htmlTopics = extractUnitTopicsFromDocxHtml(htmlExtraction?.value || "");
  const htmlLessons = extractLessonsFromDocxHtml(htmlExtraction?.value || "");

  if (htmlTopics.length) {
    payload.unit_topics = htmlTopics;
  }

  if (htmlLessons.length) {
    payload.lessons = mergeLessonsPreferComplete(htmlLessons, payload.lessons || []);
  }

  if (!payload.title || !payload.topic || !payload.year_level) {
    throw new Error("Could not detect unit title, topic, or year level from document");
  }

  return payload;
}

function normalizePdfWhitespace(value) {
  return String(value || "").replace(/\r/g, "").trim();
}

function extractStandardRowsFromCourseOutlineText(text) {
  const source = normalizePdfWhitespace(text);
  if (!source) {
    return [];
  }

  const standards = [];
  const seen = new Set();
  const matches = Array.from(source.matchAll(/\b(9\d{4})\s+([\s\S]*?)(?=\n\s*\d+\s+\d+\s+\d+\s+\d+\s+|\n\s*9\d{4}\b|$)/g));

  matches.forEach((match) => {
    const standardNumber = String(match?.[1] || "").trim();
    let titleBlock = String(match?.[2] || "")
      .replace(/\s+/g, " ")
      .replace(/\s+-\s+/g, " - ")
      .trim();

    if (!standardNumber || !titleBlock) {
      return;
    }

    if (seen.has(standardNumber)) {
      return;
    }

    const titleStart = titleBlock.search(/(Digital Technologies|Computing|Hangarau Matihiko|Technology)/i);
    if (titleStart > 0) {
      titleBlock = titleBlock.slice(titleStart).trim();
    }

    const trailingNoiseIndex = titleBlock.search(/\b(Practical Demonstration|Opportunity|Topic Start|Assessment Date|External:)\b/i);
    if (trailingNoiseIndex > 0) {
      titleBlock = titleBlock.slice(0, trailingNoiseIndex).trim();
    }

    if (!titleBlock) {
      return;
    }

    const snippet = source.slice(match.index, Math.min(source.length, match.index + 500));
    const metricsMatch = snippet.match(/\n\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\b/);
    const version = Number.parseInt(metricsMatch?.[1], 10);
    const level = Number.parseInt(metricsMatch?.[2], 10);
    const credits = Number.parseInt(metricsMatch?.[3], 10);

    standards.push({
      standardNumber,
      title: titleBlock,
      version: Number.isInteger(version) ? version : null,
      level: Number.isInteger(level) ? level : null,
      credits: Number.isInteger(credits) ? credits : null,
      standardLabel: [
        standardNumber,
        titleBlock,
        Number.isInteger(level) ? `L${level}` : "",
        Number.isInteger(credits) ? `${credits} credits` : ""
      ].filter(Boolean).join(" | ")
    });

    seen.add(standardNumber);
  });

  return standards;
}

function parseCourseOutlineFromPdfText(text, sourceName = "") {
  const source = normalizePdfWhitespace(text);
  const nowYear = new Date().getFullYear();

  const courseLineMatch = source.match(/^(Level\s+\d+[^\n]+)/im);
  const extractedCourseName = String(courseLineMatch?.[1] || "").replace(/\s+/g, " ").trim();

  const sourceBaseName = String(sourceName || "").replace(/\.pdf$/i, "").trim();
  const baseCourseName = sourceBaseName.replace(/\s*-\s*assessment\s+statement\s*\d{4}?/i, "").trim();
  const courseName = extractedCourseName || baseCourseName || "";

  const yearMatch = source.match(/\bYear\s*:?\s*(\d{1,2})\b/i);
  const yearLevel = yearMatch ? `Year ${yearMatch[1]}` : "";

  const yearVersionMatch = source.match(/\b(20\d{2})\b/);
  const yearVersion = Number.parseInt(yearVersionMatch?.[1], 10) || nowYear;

  const summaryMatch = source.match(/(This Level[\s\S]{80,}?)(?=\n\s*Course is endorsable|\n\s*Teacher\b|\n\s*Signature\b)/i);
  const summary = String(summaryMatch?.[1] || "")
    .replace(/\s+/g, " ")
    .replace(/\s*Course is endorsable[\s\S]*$/i, "")
    .trim();

  const subjectStream = /\bDigital Technolog/i.test(source) ? "DTECH" : "";
  const standards = extractStandardRowsFromCourseOutlineText(source);

  return {
    courseName,
    yearLevel,
    yearVersion,
    subjectStream,
    summary,
    standards,
    source: String(sourceName || "").trim()
  };
}

app.post("/api/course-outlines/parse-pdf", requireActivityWriteAccess, courseOutlinePdfUpload.single("courseOutlineFile"), async (req, res) => {
  const file = req.file;
  if (!file?.buffer) {
    res.status(400).json({ error: "A .pdf file is required." });
    return;
  }

  try {
    if (!PDFParse) {
      res.status(503).json({ error: "PDF import is temporarily unavailable because pdf-parse is not installed on the server." });
      return;
    }

    const parser = new PDFParse({
      data: file.buffer,
      verbosity: 0
    });
    const extraction = await parser.getText();
    const parsed = parseCourseOutlineFromPdfText(extraction?.text || "", file.originalname || "");

    res.json({
      ok: true,
      source: file.originalname,
      parsed,
      standardCount: Array.isArray(parsed?.standards) ? parsed.standards.length : 0
    });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Could not parse course outline PDF" });
  }
});

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
    const createdLessonCards = await syncUnitPlanLessonsToLibrary(savedPlan);
    res.status(201).json({
      ok: true,
      unitPlan: savedPlan,
      lessonCount: Array.isArray(savedPlan?.lessons) ? savedPlan.lessons.length : 0,
      createdLessonCards,
      createdActivities: createdLessonCards,
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
    const createdLessonCards = await syncUnitPlanLessonsToLibrary(savedPlan);
    res.status(201).json({
      ok: true,
      source: templateRelativePath.replace(/\\/g, "/"),
      unitPlan: savedPlan,
      lessonCount: Array.isArray(savedPlan?.lessons) ? savedPlan.lessons.length : 0,
      createdLessonCards,
      createdActivities: createdLessonCards,
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

  // Unit-plan flows can run before activity/calendar routes on fresh deployments.
  // Ensure dependent tables exist before ALTER statements below.
  await ensureActivitiesSchema();

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
      unit_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
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
  await pool.query(`ALTER TABLE unit_plans ADD COLUMN IF NOT EXISTS unit_topics JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE unit_plans ADD COLUMN IF NOT EXISTS unit_values JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE unit_plans ADD COLUMN IF NOT EXISTS contexts JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE unit_plans ADD COLUMN IF NOT EXISTS curriculum_links JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE unit_plans ADD COLUMN IF NOT EXISTS lessons JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE unit_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      lesson_title TEXT NOT NULL,
      lesson_week TEXT,
      lesson_date TEXT,
      lesson_duration_minutes INTEGER NOT NULL DEFAULT 60,
      lesson_type TEXT NOT NULL,
      lesson_card_color TEXT,
      activity_name TEXT NOT NULL,
      lesson_year_level TEXT NOT NULL,
      lesson_link_url TEXT,
      lesson_focus TEXT NOT NULL,
      lesson_notes TEXT,
      publish_activity BOOLEAN NOT NULL DEFAULT FALSE,
      add_to_calendar BOOLEAN NOT NULL DEFAULT FALSE,
      created_by_email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS lesson_week TEXT`);
  await pool.query(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS lesson_date TEXT`);
  await pool.query(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS lesson_duration_minutes INTEGER NOT NULL DEFAULT 60`);
  await pool.query(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS lesson_card_color TEXT`);
  await pool.query(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS lesson_link_url TEXT`);
  await pool.query(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS lesson_notes TEXT`);
  await pool.query(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS publish_activity BOOLEAN NOT NULL DEFAULT FALSE`);
  await pool.query(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS add_to_calendar BOOLEAN NOT NULL DEFAULT FALSE`);
  await pool.query(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS created_by_email TEXT`);
  await pool.query(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await pool.query(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS practical_schedule (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      event_type TEXT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE,
      notes TEXT,
      linked_activity_id TEXT,
      linked_url TEXT,
      unit_plan_id TEXT,
      lesson_index INTEGER,
      created_by_email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  // Backfill older unit-plan lesson cards that were unintentionally saved as unpublished.
  await pool.query(`
    UPDATE lessons
    SET publish_activity = TRUE
    WHERE publish_activity = FALSE
      AND id LIKE 'unitplan-%'
  `);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS unit_plan_id TEXT`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS unit_lesson_index INTEGER`);
  await pool.query(`ALTER TABLE practical_schedule ADD COLUMN IF NOT EXISTS unit_plan_id TEXT`);
  await pool.query(`ALTER TABLE practical_schedule ADD COLUMN IF NOT EXISTS lesson_index INTEGER`);
  await ensureActivityHubVisibilitySchema();
}

async function ensureActivitiesSchema() {
  if (!hasDatabase) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      year_level TEXT NOT NULL,
      type TEXT NOT NULL,
      activity_category TEXT,
      duration_minutes INTEGER,
      difficulty TEXT,
      subject_stream TEXT,
      card_color TEXT,
      card_url TEXT,
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
      term TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS name TEXT`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS year_level TEXT`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS type TEXT`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS activity_category TEXT`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS duration_minutes INTEGER`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS difficulty TEXT`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS subject_stream TEXT`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS card_color TEXT`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS card_url TEXT`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS outcome_image_url TEXT`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS description TEXT`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS resources JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS equipment JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS instructions JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS class_management_notes JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS class_preparation JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS assessment_focus JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS time_sensitive BOOLEAN NOT NULL DEFAULT FALSE`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS show_in_this_week BOOLEAN NOT NULL DEFAULT FALSE`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS term TEXT`);
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
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS standard_details JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS tasks_list JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS achieved JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS merit JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS excellence JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS submission_requirements JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS relevant_implications JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS progress_logging JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS feedback_trialling JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
}

async function ensureProjectInterestsSchema() {
  if (!hasDatabase) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_interests (
      project_id TEXT NOT NULL,
      student_email TEXT NOT NULL,
      confirmed BOOLEAN NOT NULL DEFAULT FALSE,
      standard_1 TEXT,
      standard_2 TEXT,
      evidence_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (project_id, student_email)
    );
  `);

  await pool.query(`ALTER TABLE project_interests ADD COLUMN IF NOT EXISTS confirmed BOOLEAN NOT NULL DEFAULT FALSE`);
  await pool.query(`ALTER TABLE project_interests ADD COLUMN IF NOT EXISTS standard_1 TEXT`);
  await pool.query(`ALTER TABLE project_interests ADD COLUMN IF NOT EXISTS standard_2 TEXT`);
  await pool.query(`ALTER TABLE project_interests ADD COLUMN IF NOT EXISTS evidence_steps JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE project_interests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await pool.query(`ALTER TABLE project_interests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
}

async function ensureTrelloConnectionsSchema() {
  if (!hasDatabase) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_trello_connections (
      student_email TEXT PRIMARY KEY,
      trello_token TEXT NOT NULL,
      trello_member_id TEXT,
      trello_username TEXT,
      trello_full_name TEXT,
      connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`ALTER TABLE student_trello_connections ADD COLUMN IF NOT EXISTS trello_token TEXT`);
  await pool.query(`ALTER TABLE student_trello_connections ADD COLUMN IF NOT EXISTS trello_member_id TEXT`);
  await pool.query(`ALTER TABLE student_trello_connections ADD COLUMN IF NOT EXISTS trello_username TEXT`);
  await pool.query(`ALTER TABLE student_trello_connections ADD COLUMN IF NOT EXISTS trello_full_name TEXT`);
  await pool.query(`ALTER TABLE student_trello_connections ADD COLUMN IF NOT EXISTS connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await pool.query(`ALTER TABLE student_trello_connections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
}

async function ensureStudentHaparaFoldersSchema() {
  if (!hasDatabase) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_hapara_folders (
      student_email TEXT PRIMARY KEY,
      folder_url TEXT NOT NULL,
      folder_id TEXT NOT NULL,
      class_label TEXT,
      notes TEXT,
      updated_by_email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`ALTER TABLE student_hapara_folders ADD COLUMN IF NOT EXISTS folder_url TEXT`);
  await pool.query(`ALTER TABLE student_hapara_folders ADD COLUMN IF NOT EXISTS folder_id TEXT`);
  await pool.query(`ALTER TABLE student_hapara_folders ADD COLUMN IF NOT EXISTS class_label TEXT`);
  await pool.query(`ALTER TABLE student_hapara_folders ADD COLUMN IF NOT EXISTS notes TEXT`);
  await pool.query(`ALTER TABLE student_hapara_folders ADD COLUMN IF NOT EXISTS updated_by_email TEXT`);
  await pool.query(`ALTER TABLE student_hapara_folders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await pool.query(`ALTER TABLE student_hapara_folders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await pool.query(`CREATE INDEX IF NOT EXISTS student_hapara_folders_class_idx ON student_hapara_folders (class_label)`);
}

async function ensureCourseOutlinesSchema() {
  if (!hasDatabase) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS course_outlines (
      id TEXT PRIMARY KEY,
      course_name TEXT NOT NULL,
      year_level TEXT NOT NULL,
      year_version INTEGER NOT NULL,
      subject_stream TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      card_color TEXT NOT NULL DEFAULT 'Teal',
      standards JSONB NOT NULL DEFAULT '[]'::jsonb,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by_email TEXT,
      updated_by_email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`ALTER TABLE course_outlines ADD COLUMN IF NOT EXISTS course_name TEXT`);
  await pool.query(`ALTER TABLE course_outlines ADD COLUMN IF NOT EXISTS year_level TEXT`);
  await pool.query(`ALTER TABLE course_outlines ADD COLUMN IF NOT EXISTS year_version INTEGER`);
  await pool.query(`ALTER TABLE course_outlines ADD COLUMN IF NOT EXISTS subject_stream TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE course_outlines ADD COLUMN IF NOT EXISTS summary TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE course_outlines ADD COLUMN IF NOT EXISTS card_color TEXT NOT NULL DEFAULT 'Teal'`);
  await pool.query(`ALTER TABLE course_outlines ADD COLUMN IF NOT EXISTS standards JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE course_outlines ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`);
  await pool.query(`ALTER TABLE course_outlines ADD COLUMN IF NOT EXISTS created_by_email TEXT`);
  await pool.query(`ALTER TABLE course_outlines ADD COLUMN IF NOT EXISTS updated_by_email TEXT`);
  await pool.query(`ALTER TABLE course_outlines ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await pool.query(`ALTER TABLE course_outlines ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await pool.query(`CREATE INDEX IF NOT EXISTS course_outlines_year_idx ON course_outlines (year_version)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS course_outlines_active_idx ON course_outlines (is_active)`);
}

async function backfillClientProjectsAllocations() {
  if (!hasDatabase) {
    return 0;
  }

  const clientProjectsTaskId = String(CLIENT_PROJECTS_TASK_ID || "").trim();
  if (!clientProjectsTaskId) {
    return 0;
  }

  const result = await pool.query(
    `
      INSERT INTO project_interests (project_id, student_email, confirmed)
      SELECT
        $1 AS project_id,
        pi.student_email,
        BOOL_OR(COALESCE(pi.confirmed, FALSE)) AS confirmed
      FROM project_interests pi
      JOIN activities a ON a.id::text = pi.project_id::text
      WHERE pi.project_id::text <> $1
        AND LOWER(TRIM(COALESCE(a.activity_category, to_jsonb(a)->>'category', ''))) NOT LIKE '%assessment%'
      GROUP BY pi.student_email
      ON CONFLICT (project_id, student_email) DO NOTHING
    `,
    [clientProjectsTaskId]
  );

  return Number(result.rowCount || 0);
}

async function ensureSchema() {
  await ensureActivitiesSchema();
  await ensureProjectInterestsSchema();
  await ensureTrelloConnectionsSchema();
  await ensureStudentHaparaFoldersSchema();
  await ensureStudentDriveSetupSchema();
  await ensureUnitPlanSchema();
  await ensureAssessmentStandardCardsSchema();
  await ensureCourseOutlinesSchema();
  const seededClientProjectAllocations = await backfillClientProjectsAllocations();
  if (seededClientProjectAllocations > 0) {
    console.log(`[startup] Backfilled ${seededClientProjectAllocations} student allocation(s) into Client Projects (${CLIENT_PROJECTS_TASK_ID}).`);
  }
}

async function syncDtechExcludedActivitiesVisibility() {
  if (!hasDatabase) {
    return 0;
  }

  await ensureActivityHubVisibilitySchema();

  const result = await pool.query(`SELECT * FROM activities`);
  const excludedIds = (Array.isArray(result.rows) ? result.rows : [])
    .filter((row) => isExcludedNonDtechActivity(row))
    .map((row) => String(row?.id || "").trim())
    .filter(Boolean);

  if (!excludedIds.length) {
    return 0;
  }

  await upsertHubVisibility(excludedIds, DTECH_HUB_NAME, false);
  await upsertHubVisibility(excludedIds, SEWING_ROOM_HUB_NAME, true);

  return excludedIds.length;
}

app.use(express.json({ limit: "8mb" }));
app.use(async (req, _res, next) => {
  req.auth_identity = {
    mode: effectiveAuthMode,
    token_present: false,
    verified: false,
    source: "none",
    error: "",
    email: ""
  };

  const bearerToken = extractBearerToken(req);
  if (!bearerToken) {
    next();
    return;
  }

  req.auth_identity.token_present = true;
  const verification = await verifyGoogleIdTokenAndExtractIdentity(bearerToken);
  if (!verification.ok) {
    req.auth_identity.error = verification.error || "token_verification_failed";
    next();
    return;
  }

  req.auth_identity.verified = true;
  req.auth_identity.source = "google_id_token";
  req.auth_identity.email = verification.email;
  req.auth_identity.subject = verification.subject;
  req.auth_identity.audience = verification.audience;
  req.auth_identity.issuer = verification.issuer;
  req.authenticated_email = verification.email;

  next();
});
app.use("/images/activities", express.static(path.join(__dirname, "images", "activities")));
app.use("/images/activities", express.static(path.join(__dirname, "public", "images", "activities")));
app.use(express.static(__dirname));

function normalizeEvidenceStepsPayload(value) {
  const rows = Array.isArray(value) ? value : [];

  return rows
    .map((row) => {
      const standard = String(row?.standard || "").trim();
      const steps = Array.isArray(row?.steps)
        ? row.steps
          .map((step) => ({
            text: String(step?.text || "").trim(),
            done: Boolean(step?.done)
          }))
          .filter((step) => step.text)
        : [];

      if (!standard) {
        return null;
      }

      return { standard, steps };
    })
    .filter(Boolean);
}

function upsertEvidenceRow(rows, standardKey, nextSteps) {
  const normalizedRows = normalizeEvidenceStepsPayload(rows).filter(
    (row) => String(row?.standard || "").trim() !== String(standardKey || "").trim()
  );

  normalizedRows.push({
    standard: String(standardKey || "").trim(),
    steps: Array.isArray(nextSteps) ? nextSteps : []
  });

  return normalizeEvidenceStepsPayload(normalizedRows);
}

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

function buildAllocationApprovalEmailHtml({ studentEmail, activityName, activityCategory, teacherEmail, approvedAt }) {
  const safe = (value) => String(value || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `
    <div style="font-family:Arial,sans-serif;max-width:760px;margin:0 auto;border:1px solid #d4dbe5;border-radius:12px;overflow:hidden;">
      <div style="background:#2f74b9;color:#fff;padding:16px 20px;">
        <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.9;">DTECH HUB</div>
        <h2 style="margin:6px 0 0;font-size:28px;">Allocation Approved</h2>
      </div>
      <div style="padding:16px 20px;background:#f8fbff;">
        <p style="margin:0 0 10px;">Kia ora ${safe(studentEmail)},</p>
        <p style="margin:0 0 14px;">Your ${safe(activityCategory)} allocation has been approved.</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px;border:1px solid #d4dbe5;font-weight:700;">Task</td><td style="padding:8px;border:1px solid #d4dbe5;">${safe(activityName)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #d4dbe5;font-weight:700;">Category</td><td style="padding:8px;border:1px solid #d4dbe5;">${safe(activityCategory)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #d4dbe5;font-weight:700;">Approved At</td><td style="padding:8px;border:1px solid #d4dbe5;">${safe(approvedAt)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #d4dbe5;font-weight:700;">Teacher</td><td style="padding:8px;border:1px solid #d4dbe5;">${safe(teacherEmail || "Teacher")}</td></tr>
        </table>
        <p style="margin:14px 0 0;">Please check your task detail page for any standards and evidence checklist expectations.</p>
      </div>
    </div>
  `;
}

async function notifyAllocationApprovedByEmail({ studentEmail, teacherEmail, activityName, activityCategory }) {
  if (!smtpTransporter || !SMTP_FROM) {
    return { status: "not_configured" };
  }

  const toEmail = normalizeEmail(studentEmail);
  const ccEmail = normalizeEmail(teacherEmail);
  if (!toEmail) {
    return { status: "missing_student_email" };
  }

  const approvedAt = new Date().toISOString().slice(0, 10);
  const categoryLabel = String(activityCategory || "Project").trim() || "Project";
  const taskName = String(activityName || "Allocated task").trim() || "Allocated task";

  const mailOptions = {
    from: SMTP_FROM,
    to: toEmail,
    cc: ccEmail || undefined,
    subject: `[DTECH HUB] ${categoryLabel} Approved: ${taskName}`,
    html: buildAllocationApprovalEmailHtml({
      studentEmail: toEmail,
      activityName: taskName,
      activityCategory: categoryLabel,
      teacherEmail: ccEmail,
      approvedAt
    })
  };

  await smtpTransporter.sendMail(mailOptions);
  return {
    status: "sent",
    to: toEmail,
    cc: ccEmail || ""
  };
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function getEffectiveAuthMode() {
  if (AUTH_MODE === "legacy" || AUTH_MODE === "hybrid" || AUTH_MODE === "strict") {
    return AUTH_MODE;
  }
  return "hybrid";
}

const effectiveAuthMode = getEffectiveAuthMode();
if (effectiveAuthMode !== AUTH_MODE) {
  console.warn(`[startup] Invalid AUTH_MODE='${AUTH_MODE}'. Falling back to '${effectiveAuthMode}'.`);
}

function extractBearerToken(req) {
  const header = String(req?.headers?.authorization || "").trim();
  if (!header) {
    return "";
  }

  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ? String(match[1]).trim() : "";
}

async function verifyGoogleIdTokenAndExtractIdentity(idToken) {
  const token = String(idToken || "").trim();
  if (!token) {
    return { ok: false, error: "missing_token" };
  }

  if (!googleAuthClient) {
    return { ok: false, error: "google_auth_library_unavailable" };
  }

  if (!GOOGLE_ID_TOKEN_AUDIENCES.length) {
    return { ok: false, error: "missing_google_audience_config" };
  }

  try {
    const ticket = await googleAuthClient.verifyIdToken({
      idToken: token,
      audience: GOOGLE_ID_TOKEN_AUDIENCES
    });

    const payload = ticket?.getPayload?.() || {};
    const email = normalizeEmail(payload?.email || "");
    const emailVerified = Boolean(payload?.email_verified);
    const hostedDomain = String(payload?.hd || "").trim().toLowerCase();

    if (!email || !emailVerified) {
      return { ok: false, error: "email_not_verified" };
    }

    if (!isSchoolEmail(email)) {
      return { ok: false, error: "non_school_email" };
    }

    return {
      ok: true,
      email,
      hostedDomain,
      subject: String(payload?.sub || "").trim(),
      audience: String(payload?.aud || "").trim(),
      issuer: String(payload?.iss || "").trim()
    };
  } catch (_error) {
    return { ok: false, error: "token_verification_failed" };
  }
}

function getRequestUserEmail(req) {
  if (req?.authenticated_email) {
    return normalizeEmail(req.authenticated_email);
  }

  if (effectiveAuthMode === "strict") {
    return "";
  }

  if (effectiveAuthMode === "hybrid") {
    const tokenPresented = Boolean(req?.auth_identity?.token_present);
    const tokenVerified = Boolean(req?.auth_identity?.verified);
    if (tokenPresented && !tokenVerified) {
      return "";
    }
  }

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

function isSchoolEmail(email) {
  const normalized = normalizeEmail(email);
  return Boolean(normalized && normalized.endsWith(`@${SCHOOL_EMAIL_DOMAIN}`));
}

function parseTrelloCardIdentifier(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const shortLinkFromRaw = raw.match(/^[a-zA-Z0-9]{8}$/);
  if (shortLinkFromRaw) {
    return shortLinkFromRaw[0];
  }

  try {
    const parsed = new URL(raw);
    const cardMatch = parsed.pathname.match(/\/c\/([a-zA-Z0-9]+)/i);
    if (cardMatch?.[1]) {
      return cardMatch[1];
    }
  } catch (_error) {
  }

  return "";
}

function parseTrelloBoardIdentifier(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const shortLinkFromRaw = raw.match(/^[a-zA-Z0-9]{8}$/);
  if (shortLinkFromRaw) {
    return shortLinkFromRaw[0];
  }

  try {
    const parsed = new URL(raw);
    const boardMatch = parsed.pathname.match(/\/b\/([a-zA-Z0-9]+)/i);
    if (boardMatch?.[1]) {
      return boardMatch[1];
    }
  } catch (_error) {
  }

  return "";
}

function formatTrelloCommentText({ activityTitle, progressPercent, note, createdByEmail }) {
  const lines = [];
  lines.push(`[DTECH-HUB] Work log update`);
  if (activityTitle) {
    lines.push(`Activity: ${activityTitle}`);
  }
  if (Number.isFinite(progressPercent)) {
    lines.push(`Progress: ${Math.max(0, Math.min(100, Math.round(progressPercent)))}%`);
  }
  if (createdByEmail) {
    lines.push(`Student: ${createdByEmail}`);
  }
  if (note) {
    lines.push(`Note: ${note}`);
  }
  return lines.join("\n");
}

async function trelloApiRequest(pathname, { token = "", method = "GET", query = {}, body = null } = {}) {
  if (!TRELLO_API_KEY) {
    const error = new Error("Trello API key is not configured.");
    error.status = 503;
    throw error;
  }

  const params = new URLSearchParams({ key: TRELLO_API_KEY });
  if (token) {
    params.set("token", token);
  }

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });

  const response = await fetch(`https://api.trello.com/1${pathname}?${params.toString()}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = String(payload?.message || payload?.error || `Trello request failed (${response.status}).`);
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return payload;
}

async function getStoredTrelloConnection(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  if (!hasDatabase) {
    return memoryTrelloConnections.get(normalizedEmail) || null;
  }

  const result = await pool.query(
    `
      SELECT student_email, trello_token, trello_member_id, trello_username, trello_full_name, connected_at, updated_at
      FROM student_trello_connections
      WHERE student_email = $1
      LIMIT 1
    `,
    [normalizedEmail]
  );

  return result.rows?.[0] || null;
}

async function saveTrelloConnection(email, token, member) {
  const normalizedEmail = normalizeEmail(email);
  const row = {
    student_email: normalizedEmail,
    trello_token: String(token || "").trim(),
    trello_member_id: String(member?.id || "").trim(),
    trello_username: String(member?.username || "").trim(),
    trello_full_name: String(member?.fullName || "").trim(),
    connected_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (!hasDatabase) {
    memoryTrelloConnections.set(normalizedEmail, row);
    return row;
  }

  const result = await pool.query(
    `
      INSERT INTO student_trello_connections (
        student_email,
        trello_token,
        trello_member_id,
        trello_username,
        trello_full_name,
        connected_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (student_email)
      DO UPDATE SET
        trello_token = EXCLUDED.trello_token,
        trello_member_id = EXCLUDED.trello_member_id,
        trello_username = EXCLUDED.trello_username,
        trello_full_name = EXCLUDED.trello_full_name,
        updated_at = NOW()
      RETURNING student_email, trello_token, trello_member_id, trello_username, trello_full_name, connected_at, updated_at
    `,
    [
      normalizedEmail,
      row.trello_token,
      row.trello_member_id || null,
      row.trello_username || null,
      row.trello_full_name || null
    ]
  );

  return result.rows?.[0] || row;
}

async function deleteTrelloConnection(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return;

  if (!hasDatabase) {
    memoryTrelloConnections.delete(normalizedEmail);
    return;
  }

  await pool.query(`DELETE FROM student_trello_connections WHERE student_email = $1`, [normalizedEmail]);
}

function extractGoogleDriveFolderId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (/^[A-Za-z0-9_-]{20,}$/.test(raw)) {
    return raw;
  }

  try {
    const parsed = new URL(raw);
    const host = String(parsed.hostname || "").toLowerCase();
    if (!host.includes("google.com")) {
      return "";
    }

    const folderPathMatch = String(parsed.pathname || "").match(/\/folders\/([A-Za-z0-9_-]+)/i);
    if (folderPathMatch?.[1]) {
      return String(folderPathMatch[1]).trim();
    }

    const queryId = String(parsed.searchParams.get("id") || "").trim();
    if (/^[A-Za-z0-9_-]{20,}$/.test(queryId)) {
      return queryId;
    }
  } catch (_error) {
    return "";
  }

  return "";
}

function normalizeGoogleDriveFolderUrl(value) {
  const folderId = extractGoogleDriveFolderId(value);
  if (!folderId) return "";
  return `https://drive.google.com/drive/folders/${folderId}`;
}

async function listStudentHaparaFolders() {
  if (!hasDatabase) {
    return Array.from(memoryStudentHaparaFolders.values())
      .sort((a, b) => String(a?.student_email || "").localeCompare(String(b?.student_email || "")));
  }

  await ensureStudentHaparaFoldersSchema();
  const result = await pool.query(
    `
      SELECT student_email, folder_url, folder_id, class_label, notes, updated_by_email, created_at, updated_at
      FROM student_hapara_folders
      ORDER BY student_email ASC
    `
  );

  return Array.isArray(result?.rows) ? result.rows : [];
}

async function upsertStudentHaparaFoldersBulk(rows, updatedByEmail = "") {
  const sourceRows = Array.isArray(rows) ? rows : [];
  const dedupedByEmail = new Map();
  let skipped = 0;

  sourceRows.forEach((entry) => {
    const studentEmail = normalizeEmail(entry?.student_email || entry?.email || entry?.studentEmail || "");
    const rawFolderValue = String(entry?.folder_url || entry?.folderUrl || entry?.folder_id || entry?.folderId || "").trim();
    const folderId = extractGoogleDriveFolderId(rawFolderValue);
    const normalizedDriveFolderUrl = normalizeGoogleDriveFolderUrl(rawFolderValue);
    const folderUrl = normalizedDriveFolderUrl || rawFolderValue;

    if (!studentEmail || !folderUrl) {
      skipped += 1;
      return;
    }

    dedupedByEmail.set(studentEmail, {
      student_email: studentEmail,
      folder_url: folderUrl,
      folder_id: folderId || "",
      class_label: String(entry?.class_label || entry?.classLabel || entry?.class || "").trim(),
      notes: String(entry?.notes || "").trim(),
      updated_by_email: normalizeEmail(updatedByEmail)
    });
  });

  const normalizedRows = Array.from(dedupedByEmail.values());
  if (!normalizedRows.length) {
    return { upserted: 0, skipped, rows: [] };
  }

  if (!hasDatabase) {
    normalizedRows.forEach((row) => {
      const existing = memoryStudentHaparaFolders.get(row.student_email) || {};
      const next = {
        ...existing,
        ...row,
        created_at: existing?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      memoryStudentHaparaFolders.set(row.student_email, next);
    });

    return { upserted: normalizedRows.length, skipped, rows: normalizedRows };
  }

  await ensureStudentHaparaFoldersSchema();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const row of normalizedRows) {
      await client.query(
        `
          INSERT INTO student_hapara_folders (
            student_email,
            folder_url,
            folder_id,
            class_label,
            notes,
            updated_by_email,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          ON CONFLICT (student_email)
          DO UPDATE SET
            folder_url = EXCLUDED.folder_url,
            folder_id = EXCLUDED.folder_id,
            class_label = EXCLUDED.class_label,
            notes = EXCLUDED.notes,
            updated_by_email = EXCLUDED.updated_by_email,
            updated_at = NOW()
        `,
        [
          row.student_email,
          row.folder_url || "",
          row.folder_id || "",
          row.class_label || null,
          row.notes || null,
          row.updated_by_email || null
        ]
      );
    }

    await client.query("COMMIT");
    return { upserted: normalizedRows.length, skipped, rows: normalizedRows };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function deleteStudentHaparaFolder(email) {
  const studentEmail = normalizeEmail(email);
  if (!studentEmail) return false;

  if (!hasDatabase) {
    return memoryStudentHaparaFolders.delete(studentEmail);
  }

  await ensureStudentHaparaFoldersSchema();
  const result = await pool.query(
    `DELETE FROM student_hapara_folders WHERE student_email = $1`,
    [studentEmail]
  );
  return Number(result?.rowCount || 0) > 0;
}

async function ensureStudentDriveSetupSchema() {
  if (!hasDatabase) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_drive_setup (
      student_email TEXT PRIMARY KEY,
      process_assessment_folder_id TEXT,
      confirmed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE student_drive_setup ADD COLUMN IF NOT EXISTS process_assessment_folder_id TEXT`);
  await pool.query(`ALTER TABLE student_drive_setup ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE student_drive_setup ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
}

async function ensureTemplateLibrarySchema() {
  if (!hasDatabase) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS template_library_entries (
      template_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      standard_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
      criteria_text TEXT,
      summary TEXT,
      image_url TEXT,
      template_url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'live',
      sort_order INTEGER NOT NULL DEFAULT 0,
      source_folder_id TEXT,
      updated_by_email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE template_library_entries ADD COLUMN IF NOT EXISTS standard_codes JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE template_library_entries ADD COLUMN IF NOT EXISTS criteria_text TEXT`);
  await pool.query(`ALTER TABLE template_library_entries ADD COLUMN IF NOT EXISTS summary TEXT`);
  await pool.query(`ALTER TABLE template_library_entries ADD COLUMN IF NOT EXISTS image_url TEXT`);
  await pool.query(`ALTER TABLE template_library_entries ADD COLUMN IF NOT EXISTS template_url TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE template_library_entries ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'live'`);
  await pool.query(`ALTER TABLE template_library_entries ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE template_library_entries ADD COLUMN IF NOT EXISTS source_folder_id TEXT`);
  await pool.query(`ALTER TABLE template_library_entries ADD COLUMN IF NOT EXISTS updated_by_email TEXT`);
  await pool.query(`ALTER TABLE template_library_entries ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await pool.query(`ALTER TABLE template_library_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
}

function toTemplateLibraryEntry(row, fallbackIndex = 0) {
  const standardCodes = Array.isArray(row?.standard_codes)
    ? row.standard_codes
    : (Array.isArray(row?.standardCodes) ? row.standardCodes : []);
  return {
    id: String(row?.template_id || row?.id || "").trim(),
    title: String(row?.title || "Untitled Template").trim(),
    standardCodes: standardCodes.map((code) => String(code || "").trim()).filter(Boolean),
    criteriaText: String(row?.criteria_text || row?.criteriaText || "").trim(),
    summary: String(row?.summary || "").trim(),
    imageUrl: String(row?.image_url || row?.imageUrl || "").trim(),
    templateUrl: String(row?.template_url || row?.templateUrl || "").trim(),
    status: String(row?.status || "live").trim().toLowerCase() === "coming-soon" ? "coming-soon" : "live",
    sortOrder: Number(row?.sort_order ?? row?.sortOrder ?? fallbackIndex + 1) || fallbackIndex + 1,
    sourceFolderId: String(row?.source_folder_id || row?.sourceFolderId || "").trim()
  };
}

function compareTemplateLibraryEntries(left, right) {
  const leftTitle = String(left?.title || "").trim().toLowerCase();
  const rightTitle = String(right?.title || "").trim().toLowerCase();
  const leftPriority = leftTitle === "process slide templates" ? 0 : 1;
  const rightPriority = rightTitle === "process slide templates" ? 0 : 1;
  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  const leftSort = Number(left?.sortOrder || 0);
  const rightSort = Number(right?.sortOrder || 0);
  if (leftSort !== rightSort) {
    return leftSort - rightSort;
  }

  return leftTitle.localeCompare(rightTitle);
}

async function listTemplateLibraryEntries() {
  if (!hasDatabase) {
    const rows = Array.from(memoryTemplateLibraryEntries.values())
      .sort(compareTemplateLibraryEntries);
    const memoryEntries = rows.map((row, index) => toTemplateLibraryEntry(row, index));
    return memoryEntries.length ? memoryEntries : DEFAULT_TEMPLATE_LIBRARY_ENTRIES.map((row, index) => toTemplateLibraryEntry(row, index));
  }

  await ensureTemplateLibrarySchema();
  const result = await pool.query(
    `
      SELECT template_id, title, standard_codes, criteria_text, summary, image_url, template_url, status, sort_order, source_folder_id
      FROM template_library_entries
      ORDER BY CASE WHEN lower(title) = 'process slide templates' THEN 0 ELSE 1 END ASC, sort_order ASC, lower(title) ASC
    `
  );

  const entries = Array.isArray(result?.rows) ? result.rows.map((row, index) => toTemplateLibraryEntry(row, index)).sort(compareTemplateLibraryEntries) : [];
  return entries.length ? entries : DEFAULT_TEMPLATE_LIBRARY_ENTRIES.map((row, index) => toTemplateLibraryEntry(row, index));
}

async function upsertTemplateLibraryEntries(entries, updatedByEmail = "") {
  const source = Array.isArray(entries) ? entries : [];
  const normalized = source
    .map((row, index) => toTemplateLibraryEntry(row, index))
    .filter((row) => row.id && row.templateUrl);

  if (!normalized.length) {
    return { upserted: 0 };
  }

  if (!hasDatabase) {
    normalized.forEach((entry, index) => {
      memoryTemplateLibraryEntries.set(entry.id, {
        ...entry,
        sortOrder: entry.sortOrder || index + 1,
        updatedByEmail: normalizeEmail(updatedByEmail),
        updatedAt: new Date().toISOString()
      });
    });
    return { upserted: normalized.length };
  }

  await ensureTemplateLibrarySchema();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const entry of normalized) {
      await client.query(
        `
          INSERT INTO template_library_entries (
            template_id, title, standard_codes, criteria_text, summary, image_url, template_url,
            status, sort_order, source_folder_id, updated_by_email, created_at, updated_at
          )
          VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
          ON CONFLICT (template_id)
          DO UPDATE SET
            title = EXCLUDED.title,
            standard_codes = EXCLUDED.standard_codes,
            criteria_text = EXCLUDED.criteria_text,
            summary = EXCLUDED.summary,
            image_url = EXCLUDED.image_url,
            template_url = EXCLUDED.template_url,
            status = EXCLUDED.status,
            sort_order = EXCLUDED.sort_order,
            source_folder_id = EXCLUDED.source_folder_id,
            updated_by_email = EXCLUDED.updated_by_email,
            updated_at = NOW()
        `,
        [
          entry.id,
          entry.title,
          JSON.stringify(entry.standardCodes || []),
          entry.criteriaText || null,
          entry.summary || null,
          entry.imageUrl || null,
          entry.templateUrl,
          entry.status || "live",
          Number(entry.sortOrder || 0),
          entry.sourceFolderId || null,
          normalizeEmail(updatedByEmail) || null
        ]
      );
    }

    await client.query("COMMIT");
    return { upserted: normalized.length };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function deleteTemplateLibraryEntry(templateId) {
  const id = String(templateId || "").trim();
  if (!id) return false;

  if (!hasDatabase) {
    return memoryTemplateLibraryEntries.delete(id);
  }

  await ensureTemplateLibrarySchema();
  const result = await pool.query(
    `DELETE FROM template_library_entries WHERE template_id = $1`,
    [id]
  );
  return Number(result?.rowCount || 0) > 0;
}

async function driveApiRequest(pathname, { accessToken, method = "GET", queryParams = {}, body = null } = {}) {
  const params = new URLSearchParams();
  Object.entries(queryParams || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  const qs = params.toString();
  const url = `https://www.googleapis.com/drive/v3${pathname}${qs ? `?${qs}` : ""}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = String(payload?.error?.message || `Drive API error (${response.status})`);
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function driveFindFolderByName(parentFolderId, folderName, accessToken) {
  const safeName = folderName.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const safeParent = parentFolderId.replace(/'/g, "\\'");
  const q = `name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and '${safeParent}' in parents and trashed = false`;
  const result = await driveApiRequest("/files", {
    accessToken,
    queryParams: {
      q,
      fields: "files(id,name,webViewLink)",
      pageSize: 1,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true
    }
  });
  return result.files?.[0] || null;
}

async function driveFindFolderByNameAnywhere(folderName, accessToken) {
  const name = String(folderName || "").trim().replace(/^\/+|\/+$/g, "");
  if (!name) return null;

  const safeName = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const q = `name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const result = await driveApiRequest("/files", {
    accessToken,
    queryParams: {
      q,
      fields: "files(id,name,webViewLink)",
      orderBy: "modifiedTime desc",
      pageSize: 25,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true
    }
  });

  const matches = Array.isArray(result.files) ? result.files : [];
  const exactMatch = matches.find((file) => String(file?.name || "").trim().toLowerCase() === name.toLowerCase());
  return exactMatch || matches[0] || null;
}

async function driveCreateFolder(parentFolderId, folderName, accessToken) {
  return driveApiRequest("/files", {
    accessToken, method: "POST",
    body: { name: folderName, mimeType: "application/vnd.google-apps.folder", parents: [parentFolderId] },
    queryParams: { fields: "id,name,webViewLink" }
  });
}

async function driveEnsureProcessAssessmentFolder(haparaFolderId, accessToken) {
  const existing = await driveFindFolderByName(haparaFolderId, "Process Assessment", accessToken);
  if (existing?.id) return existing;
  return driveCreateFolder(haparaFolderId, "Process Assessment", accessToken);
}

async function driveEnsureFolder(parentFolderId, folderName, accessToken) {
  const existing = await driveFindFolderByName(parentFolderId, folderName, accessToken);
  if (existing?.id) return existing;
  return driveCreateFolder(parentFolderId, folderName, accessToken);
}

async function driveFindTemplateInFolder(folderId, templateTitle, accessToken) {
  const safeTitle = templateTitle.replace(/\\/g, "\\\\").replace(/'/g, "\\'").slice(0, 60);
  const safeFolder = folderId.replace(/'/g, "\\'");
  const q = `name contains '${safeTitle}' and '${safeFolder}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.presentation'`;
  const result = await driveApiRequest("/files", { accessToken, queryParams: { q, fields: "files(id,name,webViewLink)", pageSize: 5 } });
  return Array.isArray(result.files) ? result.files : [];
}

async function driveCopyFile(fileId, destinationFolderId, copyName, accessToken) {
  return driveApiRequest(`/files/${encodeURIComponent(fileId)}/copy`, {
    accessToken, method: "POST",
    body: { name: copyName, parents: [destinationFolderId] },
    queryParams: { fields: "id,name,webViewLink" }
  });
}

async function driveListSlidesInFolder(folderId, accessToken) {
  const safeFolder = String(folderId || "").trim().replace(/'/g, "\\'");
  if (!safeFolder) return [];
  const q = `'${safeFolder}' in parents and mimeType = 'application/vnd.google-apps.presentation' and trashed = false`;
  const result = await driveApiRequest("/files", {
    accessToken,
    queryParams: {
      q,
      fields: "files(id,name,webViewLink,thumbnailLink,modifiedTime)",
      orderBy: "name_natural asc",
      pageSize: 200,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true
    }
  });
  return Array.isArray(result?.files) ? result.files : [];
}

function extractSlidesFileId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (!parsed.hostname.includes("google.com")) return "";
    const match = parsed.pathname.match(/\/presentation\/d\/([A-Za-z0-9_-]+)/i);
    return match?.[1] || "";
  } catch (_error) {
    return "";
  }
}

async function getStudentDriveSetup(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const haparaRow = hasDatabase
    ? await (async () => {
        await ensureStudentHaparaFoldersSchema();
        const r = await pool.query(`SELECT * FROM student_hapara_folders WHERE student_email = $1 LIMIT 1`, [normalizedEmail]);
        return r.rows?.[0] || null;
      })()
    : memoryStudentHaparaFolders.get(normalizedEmail) || null;

  const setupRow = hasDatabase
    ? await (async () => {
        await ensureStudentDriveSetupSchema();
        const r = await pool.query(`SELECT * FROM student_drive_setup WHERE student_email = $1 LIMIT 1`, [normalizedEmail]);
        return r.rows?.[0] || null;
      })()
    : memoryStudentDriveSetup.get(normalizedEmail) || null;

  if (!haparaRow && !setupRow) return null;

  return {
    haparaFolderId: String(haparaRow?.folder_id || "").trim(),
    haparaFolderUrl: String(haparaRow?.folder_url || "").trim(),
    classLabel: String(haparaRow?.class_label || "").trim(),
    processAssessmentFolderId: String(setupRow?.process_assessment_folder_id || "").trim(),
    confirmed: Boolean(setupRow?.confirmed_at)
  };
}

async function saveStudentDriveSetup(email, processAssessmentFolderId) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !processAssessmentFolderId) return null;

  if (!hasDatabase) {
    const existing = memoryStudentDriveSetup.get(normalizedEmail) || {};
    const next = { ...existing, student_email: normalizedEmail, process_assessment_folder_id: processAssessmentFolderId, confirmed_at: existing.confirmed_at || new Date().toISOString(), updated_at: new Date().toISOString() };
    memoryStudentDriveSetup.set(normalizedEmail, next);
    return next;
  }

  await ensureStudentDriveSetupSchema();
  const r = await pool.query(
    `
      INSERT INTO student_drive_setup (student_email, process_assessment_folder_id, confirmed_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (student_email) DO UPDATE SET
        process_assessment_folder_id = EXCLUDED.process_assessment_folder_id,
        confirmed_at = COALESCE(student_drive_setup.confirmed_at, NOW()),
        updated_at = NOW()
      RETURNING *
    `,
    [normalizedEmail, processAssessmentFolderId]
  );
  return r.rows?.[0] || null;
}

app.get("/api/template-library", async (_req, res) => {
  try {
    const entries = await listTemplateLibraryEntries();
    res.json({ ok: true, entries });
  } catch (error) {
    res.status(500).json({ error: error.message || "Could not load template library." });
  }
});

app.post("/api/template-library/sync", async (req, res) => {
  const email = normalizeEmail(getRequestUserEmail(req));
  if (!email) {
    res.status(401).json({ error: "Sign in is required." });
    return;
  }

  const access = await resolveActivityWriteAccess(email);
  if (!access.allowed) {
    res.status(403).json({ error: "Teacher/Admin access is required." });
    return;
  }

  const driveAccessToken = String(req.body?.driveAccessToken || "").trim();
  const folderName = String(req.body?.folderName || "Process Slide Templates").trim();
  if (!driveAccessToken) {
    res.status(400).json({ error: "driveAccessToken is required." });
    return;
  }

  try {
    const folder = await driveFindFolderByNameAnywhere(folderName, driveAccessToken);
    if (!folder?.id) {
      res.status(404).json({ error: `Could not find a Google Drive folder named "${folderName}".` });
      return;
    }

    const slides = await driveListSlidesInFolder(folder.id, driveAccessToken);
    const syncEntries = slides.map((file, index) => {
      const title = String(file?.name || "Untitled Template").trim();
      const standardCodes = Array.from(new Set((title.match(/\b\d{5}\b/g) || []).map((code) => String(code || "").trim())));
      return {
        id: String(file?.id || "").trim(),
        title,
        standardCodes,
        criteriaText: "",
        summary: `Synced from ${folderName}.`,
        imageUrl: String(file?.thumbnailLink || "").trim(),
        templateUrl: String(file?.webViewLink || `https://docs.google.com/presentation/d/${String(file?.id || "").trim()}/edit`).trim(),
        status: "live",
        sortOrder: title.toLowerCase() === "process slide templates" ? 0 : index + 1,
        sourceFolderId: String(folder.id).trim()
      };
    });

    if (!syncEntries.length) {
      res.status(400).json({ error: `No Google Slides files were found in "${folderName}".` });
      return;
    }

    const result = await upsertTemplateLibraryEntries(syncEntries, access.email);
    const entries = await listTemplateLibraryEntries();

    res.json({
      ok: true,
      folder: {
        id: String(folder.id || "").trim(),
        name: String(folder.name || folderName).trim(),
        url: String(folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`).trim()
      },
      syncedCount: Number(result?.upserted || 0),
      entries
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || "Could not sync template library." });
  }
});

app.delete("/api/template-library/:templateId", async (req, res) => {
  const email = normalizeEmail(getRequestUserEmail(req));
  if (!email) {
    res.status(401).json({ error: "Sign in is required." });
    return;
  }

  const access = await resolveActivityWriteAccess(email);
  if (!access.allowed) {
    res.status(403).json({ error: "Teacher/Admin access is required." });
    return;
  }

  const templateId = String(req.params?.templateId || "").trim();
  if (!templateId) {
    res.status(400).json({ error: "templateId is required." });
    return;
  }

  try {
    const deleted = await deleteTemplateLibraryEntry(templateId);
    const entries = await listTemplateLibraryEntries();
    res.json({ ok: true, deleted, entries });
  } catch (error) {
    res.status(500).json({ error: error.message || "Could not delete template." });
  }
});

app.get("/api/student/drive-setup", async (req, res) => {
  const email = normalizeEmail(getRequestUserEmail(req));
  if (!email) { res.status(401).json({ error: "Sign in is required." }); return; }
  try {
    const setup = await getStudentDriveSetup(email);
    if (!setup) {
      res.json({
        configured: false,
        driveReady: false,
        haparaFolderId: null,
        haparaFolderUrl: null,
        classLabel: null,
        processAssessmentFolderId: null,
        confirmed: false
      });
      return;
    }

    const haparaFolderId = String(setup.haparaFolderId || "").trim();
    res.json({
      configured: true,
      driveReady: Boolean(haparaFolderId),
      ...setup
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Could not load drive setup" });
  }
});

app.post("/api/student/drive-setup/confirm", async (req, res) => {
  const email = normalizeEmail(getRequestUserEmail(req));
  if (!email) { res.status(401).json({ error: "Sign in is required." }); return; }
  const driveAccessToken = String(req.body?.driveAccessToken || "").trim();
  if (!driveAccessToken) { res.status(400).json({ error: "driveAccessToken is required." }); return; }
  try {
    const seniorDtechFolder = await driveEnsureFolder("root", "SeniorDTECH", driveAccessToken);
    if (!seniorDtechFolder?.id) { res.status(500).json({ error: "Could not find or create the SeniorDTECH folder." }); return; }

    const folder = await driveEnsureFolder(String(seniorDtechFolder.id), "Process Assessment", driveAccessToken);
    if (!folder?.id) { res.status(500).json({ error: "Could not find or create the Process Assessment folder." }); return; }

    await saveStudentDriveSetup(email, folder.id);
    res.json({
      ok: true,
      seniorDtechFolderId: seniorDtechFolder.id,
      seniorDtechFolderUrl: seniorDtechFolder.webViewLink || `https://drive.google.com/drive/folders/${seniorDtechFolder.id}`,
      processAssessmentFolderId: folder.id,
      processAssessmentFolderUrl: folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || "Could not confirm drive setup." });
  }
});

app.post("/api/student/drive-setup/copy-template", async (req, res) => {
  const email = normalizeEmail(getRequestUserEmail(req));
  if (!email) { res.status(401).json({ error: "Sign in is required." }); return; }
  const driveAccessToken = String(req.body?.driveAccessToken || "").trim();
  const templateTitle = String(req.body?.templateTitle || "").trim();
  const templateFileId = String(req.body?.templateFileId || "").trim();
  if (!driveAccessToken || !templateTitle || !templateFileId) {
    res.status(400).json({ error: "driveAccessToken, templateTitle, and templateFileId are required." });
    return;
  }
  if (!/^[A-Za-z0-9_-]{20,}$/.test(templateFileId)) {
    res.status(400).json({ error: "Invalid templateFileId." });
    return;
  }
  try {
    const setup = await getStudentDriveSetup(email);
    if (!setup?.processAssessmentFolderId) {
      res.status(400).json({ error: "Please confirm your Process Assessment folder first." });
      return;
    }
    const folderId = setup.processAssessmentFolderId;
    const existing = await driveFindTemplateInFolder(folderId, templateTitle, driveAccessToken);
    if (existing.length > 0) {
      const file = existing[0];
      return res.json({ ok: true, alreadyExists: true, fileId: file.id, fileUrl: file.webViewLink || `https://docs.google.com/presentation/d/${file.id}/edit`, fileName: file.name });
    }
    const emailUsername = email.split("@")[0];
    const firstName = emailUsername.split(/[._]/)[0] || emailUsername;
    const formattedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
    const copyName = `${templateTitle} - ${formattedFirstName}`;
    const copied = await driveCopyFile(templateFileId, folderId, copyName, driveAccessToken);
    res.json({ ok: true, alreadyExists: false, fileId: copied.id, fileUrl: copied.webViewLink || `https://docs.google.com/presentation/d/${copied.id}/edit`, fileName: copied.name });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || "Could not copy template." });
  }
});

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
    const authError = req?.auth_identity?.error || "";
    const strictMessage = effectiveAuthMode === "strict"
      ? "Google ID token is required. Send Authorization: Bearer <id_token>."
      : "User email is required";
    const hybridMessage = authError
      ? "Google token verification failed. Please sign in again and retry."
      : strictMessage;
    res.status(401).json({ error: hybridMessage, auth_mode: effectiveAuthMode, auth_error: authError || undefined });
    return;
  }

  const access = await resolveActivityWriteAccess(email);
  if (!access.allowed) {
    res.status(403).json({ error: "Teacher/Admin access is required." });
    return;
  }

  req.user_email = access.email;
  req.user_auth_source = req?.auth_identity?.verified ? "google_id_token" : "legacy_header";
  next();
}

async function requireAdminAccess(req, res, next) {
  const email = getRequestUserEmail(req);
  if (!email) {
    const authError = req?.auth_identity?.error || "";
    const strictMessage = effectiveAuthMode === "strict"
      ? "Google ID token is required. Send Authorization: Bearer <id_token>."
      : "User email is required";
    const hybridMessage = authError
      ? "Google token verification failed. Please sign in again and retry."
      : strictMessage;
    res.status(401).json({ error: hybridMessage, auth_mode: effectiveAuthMode, auth_error: authError || undefined });
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
    if (effectiveAuthMode === "strict" && !req?.auth_identity?.verified) {
      res.status(401).json({ error: "Verified Google identity is required for admin access.", auth_mode: effectiveAuthMode });
      return;
    }
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
  res.json({
    ok: true,
    auth_mode: effectiveAuthMode,
    google_id_token_audiences_configured: GOOGLE_ID_TOKEN_AUDIENCES.length
  });
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

    res.json(normalizeActivityCategoryForResponse(found));
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

    res.json(normalizeActivityCategoryForResponse(result.rows[0]));
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
  const requestedActivityCategory = String(body.activity_category || body.activityCategory || "").trim();
  const explicitCardColor = String(body.card_color || body.cardColor || "").trim();
  const isExplicitActivityRequest = isExplicitActivityCategoryLabel(requestedActivityCategory);
  const isExplicitNonAssessmentCategoryRequest = [
    "project",
    "activity",
    "practice",
    "practice activity",
    "skill activity",
    "lesson"
  ].includes(String(requestedActivityCategory || "").trim().toLowerCase());
  const hasAssessmentPayload = hasAssessmentSignals(body) || hasAssessmentPayloadShape(body);
  const hasProjectPayload = hasProjectPayloadShape(body);
  const resolvedRequestedCategory = (() => {
    const normalizedRequested = requestedActivityCategory.toLowerCase();
    if (normalizedRequested === "assessment" || normalizedRequested === "assessment activity") {
      return "Assessment Task";
    }
    if (normalizedRequested === "" && hasAssessmentPayload) {
      return "Assessment Task";
    }
    if (normalizedRequested === "" && hasProjectPayload) {
      return "Project";
    }
    return requestedActivityCategory || "Activity";
  })();

  const payload = {
    id,
    name,
    year_level: yearLevel,
    type,
    activity_category: resolvedRequestedCategory,
    duration_minutes: Number.isInteger(durationMinutesInput) && durationMinutesInput > 0 ? durationMinutesInput : 1,
    difficulty: String(body.difficulty || "Beginner").trim() || "Beginner",
    subject_stream: String(body.subject_stream || body.subject || "").trim().toUpperCase(),
    card_color: explicitCardColor || getDefaultCardColorForCategory(resolvedRequestedCategory || requestedActivityCategory),
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
    const updatedAtColumn = pickExistingColumn(activityColumns, ["updated_at", "updatedon", "last_updated"]);
    
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

    const categoryRequestsAssessment = ["assessment", "assessment activity", "assessment task"].includes(String(payload.activity_category || "").toLowerCase());
    const shouldPreferAssessmentResolution = categoryRequestsAssessment || (!requestedActivityCategory && hasAssessmentPayload);

    let resolvedActivityCategory = activityCategoryColumn
      ? await resolveActivityCategoryForInsert(payload.activity_category, payload.type, {
          preferAssessment: shouldPreferAssessmentResolution
        })
      : payload.activity_category;

    if (hasAssessmentPayload && !isAssessmentCategoryLabel(resolvedActivityCategory) && !isExplicitNonAssessmentCategoryRequest) {
      console.warn(
        `[assessment-category-guard] Non-assessment category resolved for assessment payload id=${payload.id} name="${payload.name}" category="${resolvedActivityCategory}"`
      );

      if (activityCategoryColumn) {
        const forcedAssessmentCategory = await resolveActivityCategoryForInsert("Assessment Task", payload.type, {
          preferAssessment: true
        });
        if (isAssessmentCategoryLabel(forcedAssessmentCategory)) {
          resolvedActivityCategory = forcedAssessmentCategory;
        }
      }
    }

    if (!explicitCardColor) {
      payload.card_color = getDefaultCardColorForCategory(resolvedActivityCategory || payload.activity_category);
    }

    const idMetadata = idColumn ? activityColumnMetadata.get(String(idColumn).toLowerCase()) : null;
    const { canUseExplicitId, idValueToSave } = await resolveActivityIdForInsert(
      idColumn,
      idMetadata,
      body.id,
      payload.id
    );

    const sqlColumns = [
      { name: nameColumn, value: payload.name },
      { name: yearLevelColumn, value: payload.year_level },
      { name: typeColumn, value: payload.type }
    ];

    const pushArrayField = (columnName, values) => {
      if (!columnName) {
        return;
      }

      const columnMeta = activityColumnMetadata.get(String(columnName).toLowerCase());
      const arrayValues = Array.isArray(values)
        ? values.map((item) => String(item || "").trim()).filter(Boolean)
        : [];

      if (isJsonLikeColumn(columnMeta)) {
        const cast = String(columnMeta?.dataType || "").toLowerCase() === "json" ? "json" : "jsonb";
        sqlColumns.push({ name: columnName, value: JSON.stringify(arrayValues), cast });
        return;
      }

      sqlColumns.push({ name: columnName, value: arrayValues.join("\n") });
    };

    if (canUseExplicitId) {
      sqlColumns.unshift({ name: idColumn, value: idValueToSave });
    }

    if (activityCategoryColumn) sqlColumns.push({ name: activityCategoryColumn, value: resolvedActivityCategory });
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
    pushArrayField(resourcesColumn, payload.resources);
    pushArrayField(equipmentColumn, payload.equipment);
    pushArrayField(instructionsColumn, payload.instructions);
    pushArrayField(classManagementColumn, payload.class_management_notes);
    pushArrayField(classPreparationColumn, payload.class_preparation);
    pushArrayField(assessmentFocusColumn, payload.assessment_focus);
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
    pushArrayField(overviewColumn, payload.overview);
    pushArrayField(servicesColumn, payload.services);
    pushArrayField(costsColumn, payload.costs);
    pushArrayField(outcomesColumn, payload.outcomes);
    if (withdrawalDateColumn) sqlColumns.push({ name: withdrawalDateColumn, value: payload.withdrawal_date });
    if (clientIdColumn) sqlColumns.push({ name: clientIdColumn, value: payload.client_id });
    pushArrayField(standardDetailsColumn, payload.standard_details);
    pushArrayField(tasksListColumn, payload.tasks_list);
    pushArrayField(achievedColumn, payload.achieved);
    pushArrayField(meritColumn, payload.merit);
    pushArrayField(excellenceColumn, payload.excellence);
    pushArrayField(submissionRequirementsColumn, payload.submission_requirements);
    pushArrayField(relevantImplicationsColumn, payload.relevant_implications);
    pushArrayField(progressLoggingColumn, payload.progress_logging);
    pushArrayField(feedbackTriallingColumn, payload.feedback_trialling);

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

    res.status(201).json(normalizeActivityCategoryForResponse(result.rows[0]));
  } catch (error) {
    console.error("Activity save error:", error);
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
  const email = normalizeEmail(getRequestUserEmail(req));

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

      // Keep Client Projects assessment in sync when a student self-registers
      // interest in a non-assessment project.
      const clientProjectsTaskId = String(CLIENT_PROJECTS_TASK_ID || "").trim();
      if (clientProjectsTaskId && clientProjectsTaskId !== projectId) {
        try {
          const activityRow = await pool.query(
            "SELECT activity_category, to_jsonb(activities)->>'category' AS legacy_category FROM activities WHERE id = $1 LIMIT 1",
            [projectId]
          );
          const rawCat = String(activityRow.rows?.[0]?.activity_category || activityRow.rows?.[0]?.legacy_category || "")
            .toLowerCase()
            .trim();
          const isProjectCategory = !rawCat.includes("assessment");
          if (isProjectCategory) {
            await pool.query(
              "INSERT INTO project_interests (project_id, student_email) VALUES ($1, $2) ON CONFLICT DO NOTHING",
              [clientProjectsTaskId, email]
            );
          }
        } catch (_autoAllocErr) {
          // Non-fatal: do not block the main interest toggle path.
          console.error("[interest-auto-alloc] Could not allocate to Client Projects task:", _autoAllocErr.message);
        }
      }
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

    // Auto-allocate to Client Projects assessment when assigning to a Project category item
    const clientProjectsTaskId = String(CLIENT_PROJECTS_TASK_ID || "").trim();
    if (clientProjectsTaskId && clientProjectsTaskId !== projectId) {
      try {
        const activityRow = await pool.query(
          "SELECT activity_category, to_jsonb(activities)->>'category' AS legacy_category FROM activities WHERE id = $1 LIMIT 1",
          [projectId]
        );
        const rawCat = String(activityRow.rows?.[0]?.activity_category || activityRow.rows?.[0]?.legacy_category || "")
          .toLowerCase()
          .trim();
        const isProjectCategory = !rawCat.includes("assessment");
        if (isProjectCategory) {
          await pool.query(
            "INSERT INTO project_interests (project_id, student_email) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [clientProjectsTaskId, studentEmail]
          );
        }
      } catch (_autoAllocErr) {
        // Non-fatal: log but do not block the main response
        console.error("[auto-alloc] Could not allocate to Client Projects task:", _autoAllocErr.message);
      }
    }

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
  const email = normalizeEmail(getRequestUserEmail(req));

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
      "SELECT student_email, confirmed, standard_1, standard_2, evidence_steps FROM project_interests WHERE project_id = $1 ORDER BY created_at ASC",
      [projectId]
    );

    let isTeacher = false;
    if (email) {
      try {
        const access = await resolveActivityWriteAccess(email);
        isTeacher = Boolean(access.allowed);
      } catch (_err) {}
    }

    const sourceProjectsByEmail = new Map();
    const isClientProjectsTask = String(projectId) === String(CLIENT_PROJECTS_TASK_ID);
    if (isTeacher && isClientProjectsTask && result.rows.length) {
      const studentEmails = result.rows
        .map((row) => normalizeEmail(row?.student_email || ""))
        .filter(Boolean);

      if (studentEmails.length) {
        const sourceResult = await pool.query(
          `
            SELECT pi.student_email, a.name AS project_name
            FROM project_interests pi
            JOIN activities a ON a.id::text = pi.project_id::text
            WHERE pi.student_email = ANY($1::text[])
              AND pi.project_id::text <> $2
              AND LOWER(TRIM(COALESCE(a.activity_category, to_jsonb(a)->>'category', ''))) NOT LIKE '%assessment%'
            ORDER BY a.name ASC
          `,
          [studentEmails, projectId]
        );

        for (const row of sourceResult.rows || []) {
          const student = normalizeEmail(row?.student_email || "");
          const projectName = String(row?.project_name || "").trim();
          if (!student || !projectName) {
            continue;
          }
          const existing = sourceProjectsByEmail.get(student) || [];
          if (!existing.includes(projectName)) {
            existing.push(projectName);
          }
          sourceProjectsByEmail.set(student, existing);
        }
      }
    }

    const myAllocationRow = email ? result.rows.find((r) => r.student_email === email) : null;
    const myInterest = Boolean(myAllocationRow);
    res.json({
      count: result.rows.length,
      my_interest: myInterest,
      my_allocation: myAllocationRow
        ? {
          email,
          confirmed: Boolean(myAllocationRow.confirmed),
          standard_1: String(myAllocationRow.standard_1 || "").trim(),
          standard_2: String(myAllocationRow.standard_2 || "").trim(),
          evidence_steps: normalizeEvidenceStepsPayload(myAllocationRow.evidence_steps)
        }
        : null,
      emails: isTeacher ? result.rows.map((r) => r.student_email) : [],
      confirmed: isTeacher ? result.rows.filter((r) => r.confirmed).map((r) => r.student_email) : [],
      students: isTeacher
        ? result.rows.map((r) => ({
          email: r.student_email,
          confirmed: Boolean(r.confirmed),
          standard_1: String(r.standard_1 || "").trim(),
          standard_2: String(r.standard_2 || "").trim(),
          evidence_steps: normalizeEvidenceStepsPayload(r.evidence_steps),
          source_projects: sourceProjectsByEmail.get(normalizeEmail(r.student_email || "")) || []
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
  const teacherEmail = normalizeEmail(req.user_email || getRequestUserEmail(req));

  if (!projectId || !studentEmail) {
    res.status(400).json({ error: "Project ID and student email are required" });
    return;
  }

  if (!hasDatabase) {
    res.json({ confirmed, email_notification: "skipped_no_database" });
    return;
  }

  try {
    const currentRowResult = await pool.query(
      "SELECT confirmed FROM project_interests WHERE project_id = $1 AND student_email = $2 LIMIT 1",
      [projectId, studentEmail]
    );

    if (!currentRowResult.rowCount) {
      res.status(404).json({ error: "Student allocation not found" });
      return;
    }

    const previousConfirmed = Boolean(currentRowResult.rows[0]?.confirmed);

    await pool.query(
      "UPDATE project_interests SET confirmed = $1 WHERE project_id = $2 AND student_email = $3",
      [confirmed, projectId, studentEmail]
    );

    let emailNotification = "not_sent";
    if (confirmed && !previousConfirmed) {
      try {
        const activityResult = await pool.query(
          "SELECT name, activity_category, category FROM activities WHERE id::text = $1 LIMIT 1",
          [projectId]
        );
        const activityRow = activityResult.rows?.[0] || {};
        const rawCategory = String(activityRow.activity_category || activityRow.category || "Project").toLowerCase();
        const activityCategory = rawCategory.includes("assessment") ? "Assessment Task" : "Project";

        const emailResult = await notifyAllocationApprovedByEmail({
          studentEmail,
          teacherEmail,
          activityName: String(activityRow.name || projectId),
          activityCategory
        });

        emailNotification = String(emailResult?.status || "not_sent");
      } catch (_emailError) {
        emailNotification = "failed";
      }
    }

    res.json({ confirmed, email_notification: emailNotification });
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

app.get("/api/activities/:id/interests/:studentEmail/evidence", async (req, res) => {
  const projectId = String(req.params.id || "").trim();
  const studentEmail = normalizeEmail(req.params.studentEmail || "");
  const requesterEmail = normalizeEmail(getRequestUserEmail(req));

  if (!projectId || !studentEmail) {
    res.status(400).json({ error: "Project ID and student email are required" });
    return;
  }

  if (!requesterEmail || !requesterEmail.endsWith(`@${SCHOOL_EMAIL_DOMAIN}`)) {
    res.status(401).json({ error: "School sign-in required" });
    return;
  }

  let isTeacher = false;
  try {
    const access = await resolveActivityWriteAccess(requesterEmail);
    isTeacher = Boolean(access.allowed);
  } catch (_error) {
    isTeacher = false;
  }

  if (!isTeacher && requesterEmail !== studentEmail) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  if (!hasDatabase) {
    res.json({
      student_email: studentEmail,
      standard_1: "",
      standard_2: "",
      evidence_steps: []
    });
    return;
  }

  try {
    const result = await pool.query(
      "SELECT standard_1, standard_2, evidence_steps FROM project_interests WHERE project_id = $1 AND student_email = $2 LIMIT 1",
      [projectId, studentEmail]
    );

    if (!result.rowCount) {
      res.status(404).json({ error: "Student allocation not found" });
      return;
    }

    const row = result.rows[0] || {};
    res.json({
      student_email: studentEmail,
      standard_1: String(row.standard_1 || "").trim(),
      standard_2: String(row.standard_2 || "").trim(),
      evidence_steps: normalizeEvidenceStepsPayload(row.evidence_steps)
    });
  } catch (_error) {
    res.status(500).json({ error: "Could not load evidence steps" });
  }
});

app.get("/api/activities/:id/interests/me/evidence", async (req, res) => {
  const projectId = String(req.params.id || "").trim();
  const requesterEmail = normalizeEmail(getRequestUserEmail(req));

  if (!projectId) {
    res.status(400).json({ error: "Project ID is required" });
    return;
  }

  if (!requesterEmail || !requesterEmail.endsWith(`@${SCHOOL_EMAIL_DOMAIN}`)) {
    res.status(401).json({ error: "School sign-in required" });
    return;
  }

  if (!hasDatabase) {
    res.json({
      student_email: requesterEmail,
      standard_1: "",
      standard_2: "",
      evidence_steps: []
    });
    return;
  }

  try {
    const result = await pool.query(
      "SELECT standard_1, standard_2, evidence_steps FROM project_interests WHERE project_id = $1 AND student_email = $2 LIMIT 1",
      [projectId, requesterEmail]
    );

    if (!result.rowCount) {
      res.status(404).json({ error: "Student allocation not found" });
      return;
    }

    const row = result.rows[0] || {};
    res.json({
      student_email: requesterEmail,
      standard_1: String(row.standard_1 || "").trim(),
      standard_2: String(row.standard_2 || "").trim(),
      evidence_steps: normalizeEvidenceStepsPayload(row.evidence_steps)
    });
  } catch (_error) {
    res.status(500).json({ error: "Could not load evidence steps" });
  }
});

app.patch("/api/activities/:id/interests/:studentEmail/evidence", async (req, res) => {
  const projectId = String(req.params.id || "").trim();
  const studentEmail = normalizeEmail(req.params.studentEmail || "");
  const requesterEmail = normalizeEmail(getRequestUserEmail(req));

  if (!projectId || !studentEmail) {
    res.status(400).json({ error: "Project ID and student email are required" });
    return;
  }

  if (!requesterEmail || !requesterEmail.endsWith(`@${SCHOOL_EMAIL_DOMAIN}`)) {
    res.status(401).json({ error: "School sign-in required" });
    return;
  }

  let isTeacher = false;
  try {
    const access = await resolveActivityWriteAccess(requesterEmail);
    isTeacher = Boolean(access.allowed);
  } catch (_error) {
    isTeacher = false;
  }

  if (!isTeacher && requesterEmail !== studentEmail) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const evidenceSteps = normalizeEvidenceStepsPayload(req.body?.evidence_steps);

  if (!hasDatabase) {
    res.json({
      student_email: studentEmail,
      evidence_steps: evidenceSteps
    });
    return;
  }

  try {
    const result = await pool.query(
      `
        UPDATE project_interests
        SET evidence_steps = $1::jsonb,
            updated_at = NOW()
        WHERE project_id = $2 AND student_email = $3
        RETURNING student_email
      `,
      [JSON.stringify(evidenceSteps), projectId, studentEmail]
    );

    if (!result.rowCount) {
      res.status(404).json({ error: "Student allocation not found" });
      return;
    }

    res.json({
      student_email: studentEmail,
      evidence_steps: evidenceSteps
    });
  } catch (_error) {
    res.status(500).json({ error: "Could not save evidence steps" });
  }
});

app.patch("/api/activities/:id/interests/me/evidence", async (req, res) => {
  const projectId = String(req.params.id || "").trim();
  const requesterEmail = normalizeEmail(getRequestUserEmail(req));

  if (!projectId) {
    res.status(400).json({ error: "Project ID is required" });
    return;
  }

  if (!requesterEmail || !requesterEmail.endsWith(`@${SCHOOL_EMAIL_DOMAIN}`)) {
    res.status(401).json({ error: "School sign-in required" });
    return;
  }

  const evidenceSteps = normalizeEvidenceStepsPayload(req.body?.evidence_steps);

  if (!hasDatabase) {
    res.json({
      student_email: requesterEmail,
      evidence_steps: evidenceSteps
    });
    return;
  }

  try {
    const ensureRow = await pool.query(
      `
        INSERT INTO project_interests (project_id, student_email, confirmed, created_at, updated_at, evidence_steps)
        VALUES ($1, $2, FALSE, NOW(), NOW(), '[]'::jsonb)
        ON CONFLICT (project_id, student_email) DO NOTHING
        RETURNING student_email
      `,
      [projectId, requesterEmail]
    );

    const result = await pool.query(
      `
        UPDATE project_interests
        SET evidence_steps = $1::jsonb,
            updated_at = NOW()
        WHERE project_id = $2 AND student_email = $3
        RETURNING student_email
      `,
      [JSON.stringify(evidenceSteps), projectId, requesterEmail]
    );

    if (!result.rowCount && !ensureRow.rowCount) {
      res.status(404).json({ error: "Student allocation not found" });
      return;
    }

    res.json({
      student_email: requesterEmail,
      evidence_steps: evidenceSteps
    });
  } catch (_error) {
    res.status(500).json({ error: "Could not save evidence steps" });
  }
});

app.get("/api/activities/:id/my-evidence", async (req, res) => {
  const projectId = String(req.params.id || "").trim();
  const requesterEmail = normalizeEmail(getRequestUserEmail(req));

  if (!projectId) {
    res.status(400).json({ error: "Project ID is required" });
    return;
  }

  if (!requesterEmail || !requesterEmail.endsWith(`@${SCHOOL_EMAIL_DOMAIN}`)) {
    res.status(401).json({ error: "School sign-in required" });
    return;
  }

  if (!hasDatabase) {
    res.json({ student_email: requesterEmail, evidence_steps: [] });
    return;
  }

  try {
    const result = await pool.query(
      "SELECT evidence_steps FROM project_interests WHERE project_id = $1 AND student_email = $2 LIMIT 1",
      [projectId, requesterEmail]
    );

    if (!result.rowCount) {
      res.status(404).json({ error: "Student allocation not found" });
      return;
    }

    res.json({
      student_email: requesterEmail,
      evidence_steps: normalizeEvidenceStepsPayload(result.rows?.[0]?.evidence_steps)
    });
  } catch (_error) {
    res.status(500).json({ error: "Could not load evidence steps" });
  }
});

app.patch("/api/activities/:id/my-evidence", async (req, res) => {
  const projectId = String(req.params.id || "").trim();
  const requesterEmail = normalizeEmail(getRequestUserEmail(req));

  if (!projectId) {
    res.status(400).json({ error: "Project ID is required" });
    return;
  }

  if (!requesterEmail || !requesterEmail.endsWith(`@${SCHOOL_EMAIL_DOMAIN}`)) {
    res.status(401).json({ error: "School sign-in required" });
    return;
  }

  const evidenceSteps = normalizeEvidenceStepsPayload(req.body?.evidence_steps);

  if (!hasDatabase) {
    res.json({ student_email: requesterEmail, evidence_steps: evidenceSteps });
    return;
  }

  try {
    const ensureRow = await pool.query(
      `
        INSERT INTO project_interests (project_id, student_email, confirmed, created_at, updated_at, evidence_steps)
        VALUES ($1, $2, FALSE, NOW(), NOW(), '[]'::jsonb)
        ON CONFLICT (project_id, student_email) DO NOTHING
        RETURNING student_email
      `,
      [projectId, requesterEmail]
    );

    const result = await pool.query(
      `
        UPDATE project_interests
        SET evidence_steps = $1::jsonb,
            updated_at = NOW()
        WHERE project_id = $2 AND student_email = $3
        RETURNING student_email
      `,
      [JSON.stringify(evidenceSteps), projectId, requesterEmail]
    );

    if (!result.rowCount && !ensureRow.rowCount) {
      res.status(404).json({ error: "Student allocation not found" });
      return;
    }

    res.json({ student_email: requesterEmail, evidence_steps: evidenceSteps });
  } catch (_error) {
    res.status(500).json({ error: "Could not save evidence steps" });
  }
});

app.patch("/api/activities/:id/interests/:studentEmail/trello-link", async (req, res) => {
  const projectId = String(req.params.id || "").trim();
  const studentEmail = normalizeEmail(req.params.studentEmail || "");
  const requesterEmail = normalizeEmail(getRequestUserEmail(req));
  const trelloCardUrl = String(req.body?.trello_card_url || req.body?.trelloCardUrl || "").trim();

  if (!projectId || !studentEmail) {
    res.status(400).json({ error: "Project ID and student email are required" });
    return;
  }

  if (!requesterEmail || !requesterEmail.endsWith(`@${SCHOOL_EMAIL_DOMAIN}`)) {
    res.status(401).json({ error: "School sign-in required" });
    return;
  }

  let isTeacher = false;
  try {
    const access = await resolveActivityWriteAccess(requesterEmail);
    isTeacher = Boolean(access.allowed);
  } catch (_error) {
    isTeacher = false;
  }

  if (!isTeacher && requesterEmail !== studentEmail) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  if (!trelloCardUrl) {
    res.status(400).json({ error: "Trello card or board link is required" });
    return;
  }

  if (!hasDatabase) {
    res.json({ student_email: studentEmail, trello_card_url: trelloCardUrl, saved: true });
    return;
  }

  try {
    const currentResult = await pool.query(
      "SELECT evidence_steps FROM project_interests WHERE project_id = $1 AND student_email = $2 LIMIT 1",
      [projectId, studentEmail]
    );

    if (!currentResult.rowCount) {
      res.status(404).json({ error: "Student allocation not found" });
      return;
    }

    const existingRows = normalizeEvidenceStepsPayload(currentResult.rows?.[0]?.evidence_steps);
    const nextRows = upsertEvidenceRow(existingRows, "trello-sync", [
      { text: `TRELLO_CARD_URL|${trelloCardUrl}`, done: true },
      { text: `TRELLO_SAVED_AT|${new Date().toISOString()}`, done: true }
    ]);

    await pool.query(
      `
        UPDATE project_interests
        SET evidence_steps = $1::jsonb,
            updated_at = NOW()
        WHERE project_id = $2 AND student_email = $3
      `,
      [JSON.stringify(nextRows), projectId, studentEmail]
    );

    res.json({
      student_email: studentEmail,
      trello_card_url: trelloCardUrl,
      evidence_steps: nextRows,
      saved: true
    });
  } catch (_error) {
    res.status(500).json({ error: "Could not save Trello link" });
  }
});

app.patch("/api/activities/:id/interests/me/trello-link", async (req, res) => {
  const projectId = String(req.params.id || "").trim();
  const requesterEmail = normalizeEmail(getRequestUserEmail(req));
  const trelloCardUrl = String(req.body?.trello_card_url || req.body?.trelloCardUrl || "").trim();

  if (!projectId) {
    res.status(400).json({ error: "Project ID is required" });
    return;
  }

  if (!requesterEmail || !requesterEmail.endsWith(`@${SCHOOL_EMAIL_DOMAIN}`)) {
    res.status(401).json({ error: "School sign-in required" });
    return;
  }

  if (!trelloCardUrl) {
    res.status(400).json({ error: "Trello card or board link is required" });
    return;
  }

  if (!hasDatabase) {
    res.json({ student_email: requesterEmail, trello_card_url: trelloCardUrl, saved: true });
    return;
  }

  try {
    const currentResult = await pool.query(
      "SELECT evidence_steps FROM project_interests WHERE project_id = $1 AND student_email = $2 LIMIT 1",
      [projectId, requesterEmail]
    );

    let existingRows = [];
    if (currentResult.rowCount) {
      existingRows = normalizeEvidenceStepsPayload(currentResult.rows?.[0]?.evidence_steps);
    } else {
      await pool.query(
        `
          INSERT INTO project_interests (project_id, student_email, confirmed, created_at, updated_at, evidence_steps)
          VALUES ($1, $2, FALSE, NOW(), NOW(), '[]'::jsonb)
          ON CONFLICT (project_id, student_email) DO NOTHING
        `,
        [projectId, requesterEmail]
      );
    }

    const nextRows = upsertEvidenceRow(existingRows, "trello-sync", [
      { text: `TRELLO_CARD_URL|${trelloCardUrl}`, done: true },
      { text: `TRELLO_SAVED_AT|${new Date().toISOString()}`, done: true }
    ]);

    await pool.query(
      `
        UPDATE project_interests
        SET evidence_steps = $1::jsonb,
            updated_at = NOW()
        WHERE project_id = $2 AND student_email = $3
      `,
      [JSON.stringify(nextRows), projectId, requesterEmail]
    );

    res.json({
      student_email: requesterEmail,
      trello_card_url: trelloCardUrl,
      evidence_steps: nextRows,
      saved: true
    });
  } catch (_error) {
    res.status(500).json({ error: "Could not save Trello link" });
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

// GET /api/my-allocations — returns all projects and assessment tasks the signed-in student is allocated to
app.get("/api/my-allocations", async (req, res) => {
  const email = normalizeEmail(
    req?.authenticated_email ||
    req?.headers?.["x-user-email"] ||
    req?.headers?.["x-ms-client-principal-name"] ||
    req?.query?.user_email ||
    req?.query?.email ||
    ""
  );
  if (!email) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }

  if (!hasDatabase) {
    res.json({ assessment_tasks: [], projects: [] });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT a.id, a.name, a.activity_category, a.type
       FROM project_interests pi
       JOIN activities a ON a.id::text = pi.project_id::text
       WHERE pi.student_email = $1
       ORDER BY a.name ASC`,
      [email]
    );

    const assessmentTasks = [];
    const projects = [];
    for (const row of result.rows) {
      const cat = String(row.activity_category || "").toLowerCase();
      const item = {
        id: String(row.id),
        name: String(row.name || "Untitled"),
        topic_type: String(row.type || "").trim(),
        activity_category: String(row.activity_category || "").trim()
      };
      if (cat.includes("assessment")) {
        assessmentTasks.push(item);
      } else {
        projects.push(item);
      }
    }

    res.json({ assessment_tasks: assessmentTasks, projects });
  } catch (error) {
    console.error("[my-allocations] Query failed:", error.message);
    res.status(500).json({ error: "Could not load allocations" });
  }
});

// POST /api/client-projects/backfill — teacher/admin manual backfill for existing project allocations
app.post("/api/client-projects/backfill", requireActivityWriteAccess, async (_req, res) => {
  if (!hasDatabase) {
    res.json({ ok: true, inserted: 0, client_projects_task_id: CLIENT_PROJECTS_TASK_ID });
    return;
  }

  try {
    const inserted = await backfillClientProjectsAllocations();
    res.json({
      ok: true,
      inserted,
      client_projects_task_id: CLIENT_PROJECTS_TASK_ID
    });
  } catch (error) {
    console.error("[client-projects-backfill] Failed:", error.message);
    res.status(500).json({ error: "Could not run client projects backfill" });
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
  const includeDocs = String(req.query?.include_docs || "false").trim().toLowerCase() === "true";

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
        jobs.push(fetchNzqaStandards(stream, level, { includeDocs }));
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
        standard: standardQuery,
        include_docs: includeDocs
      },
      count: standards.length,
      standards
    });
  } catch (error) {
    res.status(500).json({ error: `Could not load NZQA standards: ${String(error?.message || "unknown error")}` });
  }
});

// GET /api/admin/nzqa-standards/details — load standard details text from PDF/DOCX/HTML
app.get("/api/admin/nzqa-standards/details", requireAdminAccess, async (req, res) => {
  const standardNumber = String(req.query?.standard || "").trim();
  const force = String(req.query?.force || "").trim().toLowerCase() === "true";

  if (!standardNumber) {
    res.status(400).json({ error: "standard is required" });
    return;
  }

  if (force) {
    nzqaStandardDetailsCache.delete(standardNumber);
    nzqaStandardLinksCache.delete(standardNumber);
  }

  try {
    const details = await fetchNzqaStandardDetails(standardNumber);
    res.json({
      ok: true,
      details
    });
  } catch (error) {
    res.status(500).json({ error: `Could not load standard details: ${String(error?.message || "unknown error")}` });
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

app.get("/api/admin/assessment-standard-cards", requireAdminAccess, async (req, res) => {
  const standardCode = String(req.query?.standard || "").trim();
  const yearLevel = String(req.query?.year_level || req.query?.yearLevel || "").trim().toLowerCase();
  const courseName = String(req.query?.course_name || req.query?.courseName || "").trim().toLowerCase();
  const yearVersion = Number.parseInt(req.query?.year || req.query?.year_version || req.query?.yearVersion, 10);

  if (!hasDatabase) {
    let rows = Array.from(memoryAssessmentStandardCards.values()).map((row) => normalizeAssessmentStandardCardRow(row));
    if (standardCode) {
      rows = rows.filter((row) => row.standard_codes.includes(standardCode));
    }
    if (yearLevel) {
      rows = rows.filter((row) => String(row.year_level || "").trim().toLowerCase() === yearLevel);
    }
    if (courseName) {
      rows = rows.filter((row) => String(row.course_name || "").trim().toLowerCase() === courseName);
    }
    if (Number.isInteger(yearVersion)) {
      rows = rows.filter((row) => Number.parseInt(row.year_version, 10) === yearVersion);
    }

    rows.sort((a, b) => {
      const aTime = Number.isNaN(new Date(a.updated_at || 0).getTime()) ? 0 : new Date(a.updated_at || 0).getTime();
      const bTime = Number.isNaN(new Date(b.updated_at || 0).getTime()) ? 0 : new Date(b.updated_at || 0).getTime();
      return bTime - aTime;
    });

    res.json({ count: rows.length, cards: rows });
    return;
  }

  try {
    await ensureAssessmentStandardCardsSchema();
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (standardCode) {
      conditions.push(`standard_codes ? $${paramIndex}`);
      values.push(standardCode);
      paramIndex += 1;
    }
    if (yearLevel) {
      conditions.push(`LOWER(year_level) = $${paramIndex}`);
      values.push(yearLevel);
      paramIndex += 1;
    }
    if (courseName) {
      conditions.push(`LOWER(course_name) = $${paramIndex}`);
      values.push(courseName);
      paramIndex += 1;
    }
    if (Number.isInteger(yearVersion)) {
      conditions.push(`year_version = $${paramIndex}`);
      values.push(yearVersion);
      paramIndex += 1;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await pool.query(
      `
        SELECT *
        FROM assessment_standard_cards
        ${whereClause}
        ORDER BY updated_at DESC
      `,
      values
    );

    const cards = result.rows.map((row) => normalizeAssessmentStandardCardRow(row));
    res.json({ count: cards.length, cards });
  } catch (error) {
    res.status(500).json({ error: error.message || "Could not load Assessment Standard Cards" });
  }
});

app.get("/api/admin/hapara-folders", requireAdminAccess, async (_req, res) => {
  try {
    const rows = await listStudentHaparaFolders();
    res.json({ count: rows.length, folders: rows });
  } catch (error) {
    res.status(500).json({ error: error.message || "Could not load Hapara folder mappings" });
  }
});

app.post("/api/admin/hapara-folders/bulk", requireAdminAccess, async (req, res) => {
  const payloadRows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (!payloadRows.length) {
    res.status(400).json({ error: "rows array is required" });
    return;
  }

  if (payloadRows.length > 5000) {
    res.status(400).json({ error: "Maximum 5000 rows per upload" });
    return;
  }

  try {
    const result = await upsertStudentHaparaFoldersBulk(payloadRows, req.user_email || "");
    res.json({
      ok: true,
      upserted: Number(result?.upserted || 0),
      skipped: Number(result?.skipped || 0)
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Could not save Hapara folder mappings" });
  }
});

app.delete("/api/admin/hapara-folders/:email", requireAdminAccess, async (req, res) => {
  const email = normalizeEmail(req.params?.email || "");
  if (!email) {
    res.status(400).json({ error: "Valid email is required" });
    return;
  }

  try {
    const deleted = await deleteStudentHaparaFolder(email);
    res.json({ ok: true, deleted: Boolean(deleted) });
  } catch (error) {
    res.status(500).json({ error: error.message || "Could not delete mapping" });
  }
});

app.get("/api/assessment-standard-cards", requireActivityWriteAccess, async (_req, res) => {
  if (!hasDatabase) {
    const cards = Array.from(memoryAssessmentStandardCards.values())
      .map((row) => normalizeAssessmentStandardCardRow(row))
      .filter((row) => row.is_active)
      .sort((a, b) => {
        const aTime = Number.isNaN(new Date(a.updated_at || 0).getTime()) ? 0 : new Date(a.updated_at || 0).getTime();
        const bTime = Number.isNaN(new Date(b.updated_at || 0).getTime()) ? 0 : new Date(b.updated_at || 0).getTime();
        return bTime - aTime;
      });

    res.json({ count: cards.length, cards });
    return;
  }

  try {
    await ensureAssessmentStandardCardsSchema();
    const result = await pool.query(
      `
        SELECT *
        FROM assessment_standard_cards
        WHERE is_active = TRUE
        ORDER BY updated_at DESC
      `
    );

    const cards = result.rows.map((row) => normalizeAssessmentStandardCardRow(row));
    res.json({ count: cards.length, cards });
  } catch (error) {
    res.status(500).json({ error: error.message || "Could not load Assessment Standard Cards" });
  }
});

app.post("/api/admin/maintenance/repair-activity-categories", requireAdminAccess, async (req, res) => {
  const confirmation = String(req.body?.confirm || "").trim();
  if (confirmation !== "REPAIR_ACTIVITY_CATEGORIES") {
    res.status(400).json({
      error: "Confirmation token is required.",
      expected: "REPAIR_ACTIVITY_CATEGORIES"
    });
    return;
  }

  if (!hasDatabase) {
    const rows = Array.from(memoryActivities.values());
    let repaired = 0;

    rows.forEach((row) => {
      const next = normalizeActivityCategoryForResponse(row);
      const nextCategory = String(next?.activity_category || row?.activity_category || row?.category || "Activity").trim() || "Activity";
      const nextColor = getDefaultCardColorForCategory(nextCategory);

      const currentCategory = String(row?.activity_category || row?.category || "").trim();
      const currentColor = String(row?.card_color || row?.card_colour || row?.color || "").trim();
      if (currentCategory !== nextCategory || currentColor !== nextColor) {
        row.activity_category = nextCategory;
        row.card_color = nextColor;
        row.updated_at = new Date().toISOString();
        repaired += 1;
      }

      if (row?.id) {
        memoryActivities.set(String(row.id), row);
      }
    });

    res.status(200).json({
      ok: true,
      dryRun: false,
      hasDatabase: false,
      scanned: rows.length,
      repaired,
      unchanged: Math.max(0, rows.length - repaired),
      samples: []
    });
    return;
  }

  try {
    const activityColumns = await getAllTableColumns("activities");
    const idColumn = pickExistingColumn(activityColumns, ["id"]);
    const categoryColumn = pickExistingColumn(activityColumns, ["activity_category", "category"]);
    const cardColorColumn = pickExistingColumn(activityColumns, ["card_color", "card_colour", "color"]);
    const updatedAtColumn = pickExistingColumn(activityColumns, ["updated_at", "updatedon", "last_updated"]);

    if (!idColumn || !categoryColumn) {
      res.status(500).json({
        error: "Could not repair categories because activities table is missing id or category columns."
      });
      return;
    }

    const allRowsResult = await pool.query(`SELECT * FROM activities`);
    const rows = Array.isArray(allRowsResult?.rows) ? allRowsResult.rows : [];
    const allowedActivityCategories = await getCheckConstraintAllowedValues(
      "activities",
      "activities_activity_category_check"
    );
    const allowedByLower = new Map(
      (Array.isArray(allowedActivityCategories) ? allowedActivityCategories : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .map((value) => [value.toLowerCase(), value])
    );

    const toConstraintSafeCategory = async (candidateCategory, fallbackType) => {
      const raw = String(candidateCategory || "").trim();
      if (!raw) {
        return await resolveActivityCategoryForInsert("Activity", fallbackType, { preferAssessment: false });
      }

      const directMatch = allowedByLower.get(raw.toLowerCase());
      if (directMatch) {
        return directMatch;
      }

      return await resolveActivityCategoryForInsert(raw, fallbackType, {
        preferAssessment: isAssessmentCategoryLabel(raw)
      });
    };

    let repaired = 0;
    const samples = [];
    const failures = [];

    for (const row of rows) {
      const normalized = normalizeActivityCategoryForResponse(row);
      const currentCategory = String(row?.[categoryColumn] || row?.activity_category || row?.category || "").trim();
      const normalizedNextCategory = String(normalized?.activity_category || currentCategory || "Activity").trim() || "Activity";
      const nextCategory = await toConstraintSafeCategory(normalizedNextCategory, row?.type);

      const currentColor = cardColorColumn
        ? String(row?.[cardColorColumn] || row?.card_color || row?.card_colour || row?.color || "").trim()
        : "";
      const nextColor = getDefaultCardColorForCategory(nextCategory);

      const shouldUpdateCategory = currentCategory !== nextCategory;
      const shouldUpdateColor = Boolean(cardColorColumn) && currentColor !== nextColor;

      if (!shouldUpdateCategory && !shouldUpdateColor) {
        continue;
      }

      try {
        const setClauses = [];
        const values = [];

        if (shouldUpdateCategory) {
          values.push(nextCategory);
          setClauses.push(`${quoteIdentifier(categoryColumn)} = $${values.length}`);
        }

        if (shouldUpdateColor && cardColorColumn) {
          values.push(nextColor);
          setClauses.push(`${quoteIdentifier(cardColorColumn)} = $${values.length}`);
        }

        if (updatedAtColumn) {
          setClauses.push(`${quoteIdentifier(updatedAtColumn)} = NOW()`);
        }

        values.push(row[idColumn]);
        await pool.query(
          `
            UPDATE activities
            SET ${setClauses.join(", ")}
            WHERE ${quoteIdentifier(idColumn)} = $${values.length}
          `,
          values
        );

        repaired += 1;
        if (samples.length < 25) {
          samples.push({
            id: String(row[idColumn] || ""),
            beforeCategory: currentCategory || "",
            afterCategory: nextCategory,
            beforeColor: currentColor || "",
            afterColor: shouldUpdateColor ? nextColor : currentColor || nextColor
          });
        }
      } catch (rowError) {
        if (failures.length < 25) {
          failures.push({
            id: String(row[idColumn] || ""),
            categoryAttempted: nextCategory,
            detail: String(rowError?.message || "unknown error")
          });
        }
      }
    }

    res.status(200).json({
      ok: true,
      dryRun: false,
      hasDatabase: true,
      scanned: rows.length,
      repaired,
      unchanged: Math.max(0, rows.length - repaired),
      failed: failures.length,
      samples,
      failures
    });
  } catch (error) {
    console.error("[admin-repair-activity-categories]", error);
    res.status(500).json({
      error: "Could not repair activity categories.",
      detail: String(error?.message || "unknown error")
    });
  }
});

app.post("/api/admin/assessment-standard-cards", requireAdminAccess, async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const requestEmail = normalizeEmail(getRequestUserEmail(req));
  const courseName = String(body.course_name || body.courseName || "").trim();
  const yearLevel = String(body.year_level || body.yearLevel || "").trim();
  const yearVersion = Number.parseInt(body.year_version ?? body.yearVersion ?? body.year, 10);
  const creditsRaw = Number.parseInt(body.credits, 10);
  const credits = Number.isInteger(creditsRaw) && creditsRaw >= 0 ? creditsRaw : null;
  const standardCodes = normalizeStandardCodeList(body.standard_codes || body.standardCodes);
  const achievedText = String(body.achieved_text || body.achievedText || "").trim();
  const meritText = String(body.merit_text || body.meritText || "").trim();
  const excellenceText = String(body.excellence_text || body.excellenceText || "").trim();
  const achievedChecklist = normalizeArray(body.achieved_checklist || body.achievedChecklist);
  const meritChecklist = normalizeArray(body.merit_checklist || body.meritChecklist);
  const excellenceChecklist = normalizeArray(body.excellence_checklist || body.excellenceChecklist);
  const isActive = body.is_active === false || body.isActive === false ? false : true;

  if (!courseName) {
    res.status(400).json({ error: "course_name is required" });
    return;
  }
  if (!yearLevel) {
    res.status(400).json({ error: "year_level is required" });
    return;
  }
  if (!Number.isInteger(yearVersion)) {
    res.status(400).json({ error: "year_version must be an integer" });
    return;
  }
  if (!standardCodes.length) {
    res.status(400).json({ error: "At least one standard code is required" });
    return;
  }

  const firstCode = String(standardCodes[0] || "").trim();
  const generatedId = slugify(`${courseName}-${yearLevel}-${yearVersion}-${firstCode}`) || `standard-card-${Date.now()}`;
  const id = String(body.id || generatedId).trim();

  if (!hasDatabase) {
    const nowIso = new Date().toISOString();
    const existing = normalizeAssessmentStandardCardRow(memoryAssessmentStandardCards.get(id) || {});
    const row = normalizeAssessmentStandardCardRow({
      id,
      course_name: courseName,
      year_level: yearLevel,
      year_version: yearVersion,
      credits,
      standard_codes: standardCodes,
      achieved_text: achievedText,
      merit_text: meritText,
      excellence_text: excellenceText,
      achieved_checklist: achievedChecklist,
      merit_checklist: meritChecklist,
      excellence_checklist: excellenceChecklist,
      is_active: isActive,
      created_by_email: existing.created_by_email || requestEmail,
      updated_by_email: requestEmail,
      created_at: existing.created_at || nowIso,
      updated_at: nowIso
    });
    memoryAssessmentStandardCards.set(id, row);
    res.status(201).json({ ok: true, card: row });
    return;
  }

  try {
    await ensureAssessmentStandardCardsSchema();
    const result = await pool.query(
      `
        INSERT INTO assessment_standard_cards (
          id,
          course_name,
          year_level,
          year_version,
          credits,
          standard_codes,
          achieved_text,
          merit_text,
          excellence_text,
          achieved_checklist,
          merit_checklist,
          excellence_checklist,
          card_color,
          is_active,
          created_by_email,
          updated_by_email,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6::jsonb,
          $7,
          $8,
          $9,
          $10::jsonb,
          $11::jsonb,
          $12::jsonb,
          'Teal',
          $13,
          $14,
          $15,
          NOW(),
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          course_name = EXCLUDED.course_name,
          year_level = EXCLUDED.year_level,
          year_version = EXCLUDED.year_version,
          credits = EXCLUDED.credits,
          standard_codes = EXCLUDED.standard_codes,
          achieved_text = EXCLUDED.achieved_text,
          merit_text = EXCLUDED.merit_text,
          excellence_text = EXCLUDED.excellence_text,
          achieved_checklist = EXCLUDED.achieved_checklist,
          merit_checklist = EXCLUDED.merit_checklist,
          excellence_checklist = EXCLUDED.excellence_checklist,
          card_color = 'Teal',
          is_active = EXCLUDED.is_active,
          updated_by_email = EXCLUDED.updated_by_email,
          updated_at = NOW()
        RETURNING *
      `,
      [
        id,
        courseName,
        yearLevel,
        yearVersion,
        credits,
        JSON.stringify(standardCodes),
        achievedText,
        meritText,
        excellenceText,
        JSON.stringify(achievedChecklist),
        JSON.stringify(meritChecklist),
        JSON.stringify(excellenceChecklist),
        isActive,
        requestEmail,
        requestEmail
      ]
    );

    res.status(201).json({ ok: true, card: normalizeAssessmentStandardCardRow(result.rows[0] || {}) });
  } catch (error) {
    res.status(500).json({ error: error.message || "Could not save Assessment Standard Card" });
  }
});

app.delete("/api/admin/assessment-standard-cards/:id", requireAdminAccess, async (req, res) => {
  const id = String(req.params.id || "").trim();
  if (!id) {
    res.status(400).json({ error: "id is required" });
    return;
  }

  if (!hasDatabase) {
    const existed = memoryAssessmentStandardCards.delete(id);
    res.json({ ok: true, deleted: existed ? 1 : 0 });
    return;
  }

  try {
    await ensureAssessmentStandardCardsSchema();
    const result = await pool.query(`DELETE FROM assessment_standard_cards WHERE id = $1`, [id]);
    res.json({ ok: true, deleted: Number(result.rowCount) || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message || "Could not delete Assessment Standard Card" });
  }
});

app.get("/api/assessment-standard-cards/match", requireActivityWriteAccess, async (req, res) => {
  const standardCode = String(req.query?.standard || "").trim();
  const yearLevel = String(req.query?.year_level || req.query?.yearLevel || "").trim();
  const courseName = String(req.query?.course_name || req.query?.courseName || "").trim();
  const yearVersionRaw = Number.parseInt(req.query?.year || req.query?.year_version || req.query?.yearVersion, 10);

  if (!standardCode) {
    res.status(400).json({ error: "standard is required" });
    return;
  }

  if (!hasDatabase) {
    const match = pickBestAssessmentStandardCardMatch(
      Array.from(memoryAssessmentStandardCards.values()),
      {
        standardCode,
        yearLevel,
        courseName,
        yearVersion: Number.isInteger(yearVersionRaw) ? yearVersionRaw : null
      }
    );

    res.json({ matched: Boolean(match), card: match || null });
    return;
  }

  try {
    await ensureAssessmentStandardCardsSchema();
    const result = await pool.query(
      `
        SELECT *
        FROM assessment_standard_cards
        WHERE is_active = TRUE
        ORDER BY updated_at DESC
      `
    );

    const match = pickBestAssessmentStandardCardMatch(result.rows, {
      standardCode,
      yearLevel,
      courseName,
      yearVersion: Number.isInteger(yearVersionRaw) ? yearVersionRaw : null
    });

    res.json({ matched: Boolean(match), card: match || null });
  } catch (error) {
    res.status(500).json({ error: error.message || "Could not match Assessment Standard Card" });
  }
});

// ─── Course Outlines ────────────────────────────────────────────────────────

const memoryCourseOutlines = new Map();

function normalizeCourseOutlineRow(row) {
  if (!row || typeof row !== "object") return null;
  const standards = Array.isArray(row.standards)
    ? row.standards
    : (() => { try { return JSON.parse(row.standards || "[]"); } catch (_) { return []; } })();
  return {
    id: String(row.id || ""),
    course_name: String(row.course_name || ""),
    year_level: String(row.year_level || ""),
    year_version: Number.parseInt(row.year_version, 10) || 0,
    subject_stream: String(row.subject_stream || ""),
    summary: String(row.summary || ""),
    card_color: String(row.card_color || "Teal"),
    standards: standards.map((s) => ({
      standardLabel: String(s?.standardLabel || ""),
      achieved: String(s?.achieved || ""),
      merit: String(s?.merit || ""),
      excellence: String(s?.excellence || "")
    })),
    is_active: row.is_active !== false,
    created_by_email: String(row.created_by_email || ""),
    updated_by_email: String(row.updated_by_email || ""),
    created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
    updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null
  };
}

app.get("/api/course-outlines", requireActivityWriteAccess, async (req, res) => {
  if (!hasDatabase) {
    const rows = Array.from(memoryCourseOutlines.values())
      .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
    res.json({ count: rows.length, outlines: rows });
    return;
  }

  try {
    await ensureCourseOutlinesSchema();
    const result = await pool.query(
      `SELECT * FROM course_outlines WHERE is_active = TRUE ORDER BY updated_at DESC`
    );
    const outlines = result.rows.map((row) => normalizeCourseOutlineRow(row));
    res.json({ count: outlines.length, outlines });
  } catch (error) {
    res.status(500).json({ error: error.message || "Could not load Course Outlines" });
  }
});

app.post("/api/course-outlines", requireActivityWriteAccess, async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const requestEmail = normalizeEmail(getRequestUserEmail(req));
  const courseName = String(body.course_name || body.courseName || "").trim();
  const yearLevel = String(body.year_level || body.yearLevel || "").trim();
  const yearVersion = Number.parseInt(body.year_version ?? body.yearVersion ?? body.year, 10);
  const subjectStream = String(body.subject_stream || body.subjectStream || "").trim();
  const summary = String(body.summary || "").trim();
  const rawStandards = Array.isArray(body.standards) ? body.standards : [];
  const standards = rawStandards.map((s) => ({
    standardLabel: String(s?.standardLabel || "").trim(),
    achieved: String(s?.achieved || "").trim(),
    merit: String(s?.merit || "").trim(),
    excellence: String(s?.excellence || "").trim()
  })).filter((s) => s.standardLabel);

  if (!courseName) { res.status(400).json({ error: "course_name is required" }); return; }
  if (!yearLevel) { res.status(400).json({ error: "year_level is required" }); return; }
  if (!Number.isInteger(yearVersion)) { res.status(400).json({ error: "year_version must be an integer" }); return; }

  const generatedId = slugify(`${courseName}-${yearLevel}-${yearVersion}`) || `course-outline-${Date.now()}`;
  const id = String(body.id || generatedId).trim();

  if (!hasDatabase) {
    const nowIso = new Date().toISOString();
    const existing = memoryCourseOutlines.get(id) || {};
    const row = normalizeCourseOutlineRow({
      id,
      course_name: courseName,
      year_level: yearLevel,
      year_version: yearVersion,
      subject_stream: subjectStream,
      summary,
      card_color: "Teal",
      standards,
      is_active: true,
      created_by_email: existing.created_by_email || requestEmail,
      updated_by_email: requestEmail,
      created_at: existing.created_at || nowIso,
      updated_at: nowIso
    });
    memoryCourseOutlines.set(id, row);
    res.status(201).json({ ok: true, outline: row });
    return;
  }

  try {
    await ensureCourseOutlinesSchema();
    const result = await pool.query(
      `
        INSERT INTO course_outlines (
          id, course_name, year_level, year_version, subject_stream,
          summary, card_color, standards, is_active,
          created_by_email, updated_by_email, created_at, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,'Teal',$7::jsonb,$8,$9,$10,NOW(),NOW())
        ON CONFLICT (id) DO UPDATE SET
          course_name = EXCLUDED.course_name,
          year_level = EXCLUDED.year_level,
          year_version = EXCLUDED.year_version,
          subject_stream = EXCLUDED.subject_stream,
          summary = EXCLUDED.summary,
          card_color = 'Teal',
          standards = EXCLUDED.standards,
          updated_by_email = EXCLUDED.updated_by_email,
          updated_at = NOW()
        RETURNING *
      `,
      [id, courseName, yearLevel, yearVersion, subjectStream, summary,
       JSON.stringify(standards), true, requestEmail, requestEmail]
    );

    const savedOutline = normalizeCourseOutlineRow(result.rows[0] || {});

    // Sync each standard entry to assessment_standard_cards for auto-populate.
    await ensureAssessmentStandardCardsSchema();
    for (const s of standards) {
      const codeMatch = String(s.standardLabel || "").match(/\b(\d{5})\b/);
      if (!codeMatch) continue;
      const code = codeMatch[1];
      const cardId = slugify(`${courseName}-${yearLevel}-${yearVersion}-${code}`) || `card-${code}-${Date.now()}`;
      await pool.query(
        `
          INSERT INTO assessment_standard_cards (
            id, course_name, year_level, year_version, standard_codes,
            achieved_text, merit_text, excellence_text,
            achieved_checklist, merit_checklist, excellence_checklist,
            card_color, is_active, created_by_email, updated_by_email, created_at, updated_at
          )
          VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,'Teal',TRUE,$9,$10,NOW(),NOW())
          ON CONFLICT (id) DO UPDATE SET
            course_name = EXCLUDED.course_name,
            year_level = EXCLUDED.year_level,
            year_version = EXCLUDED.year_version,
            standard_codes = EXCLUDED.standard_codes,
            achieved_text = EXCLUDED.achieved_text,
            merit_text = EXCLUDED.merit_text,
            excellence_text = EXCLUDED.excellence_text,
            card_color = 'Teal',
            updated_by_email = EXCLUDED.updated_by_email,
            updated_at = NOW()
        `,
        [cardId, courseName, yearLevel, yearVersion, JSON.stringify([code]),
         s.achieved, s.merit, s.excellence, requestEmail, requestEmail]
      );
    }

    res.status(201).json({ ok: true, outline: savedOutline });
  } catch (error) {
    res.status(500).json({ error: error.message || "Could not save Course Outline" });
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
    const normalizedRows = dedupeToLatestStudentRows(rows.map(buildStudentClassManagementRow));
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

app.get("/api/class-management/freshness-config", async (req, res) => {
  const userEmail = getRequestUserEmail(req);
  if (!userEmail || !(await canManagePracticalSchedule(userEmail))) {
    res.status(403).json({ error: "Teacher/Admin access is required." });
    return;
  }

  res.json({
    aging_days: CLASS_DATA_AGING_DAYS,
    stale_days: CLASS_DATA_STALE_DAYS
  });
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

app.post("/api/unit-plans/resync-lessons", async (req, res) => {
  const userEmail = normalizeEmail(req.body?.created_by_email || req.body?.user_email || req.query?.user_email || getRequestUserEmail(req));
  if (!userEmail || !(await canManagePracticalSchedule(userEmail))) {
    res.status(403).json({ error: "Teacher/Admin access is required." });
    return;
  }

  try {
    let unitPlans = [];

    if (!hasDatabase) {
      unitPlans = Array.from(memoryUnitPlans.values());
    } else {
      await ensureUnitPlanSchema();
      const result = await pool.query("SELECT * FROM unit_plans ORDER BY updated_at DESC, created_at DESC");
      unitPlans = result.rows || [];
    }

    let lessonCardsSynced = 0;
    for (const unitPlan of unitPlans) {
      lessonCardsSynced += await syncUnitPlanLessonsToLibrary(unitPlan);
    }

    res.status(200).json({
      ok: true,
      unit_plans_processed: unitPlans.length,
      lesson_cards_synced: lessonCardsSynced
    });
  } catch (_error) {
    res.status(500).json({ error: "Could not resync unit lessons" });
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
    const createdLessonCards = await syncUnitPlanLessonsToLibrary(savedPlan);
    res.status(201).json({
      ...savedPlan,
      lesson_cards_created: createdLessonCards
    });
  } catch (error) {
    console.error("Unit plan save error:", error);
    res.status(500).json({ error: "Could not save unit plan" });
  }
});

app.put("/api/unit-plans/:id", async (req, res) => {
  const unitPlanId = String(req.params.id || "").trim();
  const userEmail = normalizeEmail(req.body?.created_by_email || req.body?.user_email || getRequestUserEmail(req));

  if (!unitPlanId) {
    res.status(400).json({ error: "Unit plan ID is required" });
    return;
  }

  if (!userEmail || !(await canManagePracticalSchedule(userEmail))) {
    res.status(403).json({ error: "Teacher/Admin access is required." });
    return;
  }

  const payload = buildUnitPlanPayload(req.body, userEmail);
  payload.id = unitPlanId;

  if (!payload.title || !payload.topic || !payload.year_level) {
    res.status(400).json({ error: "title, topic and year_level are required" });
    return;
  }

  try {
    const savedPlan = await saveUnitPlanPayload(payload);
    const createdLessonCards = await syncUnitPlanLessonsToLibrary(savedPlan);
    res.status(200).json({
      ...savedPlan,
      lesson_cards_created: createdLessonCards
    });
  } catch (error) {
    console.error("Unit plan update error:", error);
    res.status(500).json({ error: "Could not update unit plan" });
  }
});

app.delete("/api/unit-plans/:id", async (req, res) => {
  const unitPlanId = String(req.params.id || "").trim();
  const userEmail = getRequestUserEmail(req);
  const deleteLessonsRaw = String(req.query?.delete_lessons || req.body?.delete_lessons || "").trim().toLowerCase();
  const shouldDeleteLessons = ["1", "true", "yes", "on"].includes(deleteLessonsRaw);
  const lessonCardPrefix = `unitplan-${slugify(unitPlanId)}-lesson-`;

  if (!unitPlanId) {
    res.status(400).json({ error: "Unit plan ID is required" });
    return;
  }

  if (!userEmail || !(await canManagePracticalSchedule(userEmail))) {
    res.status(403).json({ error: "Only Teacher/Admin users can delete unit plans" });
    return;
  }

  if (!hasDatabase) {
    if (!memoryUnitPlans.has(unitPlanId)) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    let deletedLessonCards = 0;
    if (shouldDeleteLessons) {
      Array.from(memoryLessons.keys())
        .filter((lessonId) => String(lessonId || "").startsWith(lessonCardPrefix))
        .forEach((lessonId) => {
          memoryLessons.delete(lessonId);
          deletedLessonCards += 1;
        });
    }

    memoryUnitPlans.delete(unitPlanId);
    res.status(200).json({
      ok: true,
      deleted_unit_plan_id: unitPlanId,
      deleted_lesson_cards: deletedLessonCards,
      kept_lesson_cards: !shouldDeleteLessons
    });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let deletedLessonCards = 0;
    if (shouldDeleteLessons) {
      const deletedLessonsResult = await client.query("DELETE FROM lessons WHERE id LIKE $1", [`${lessonCardPrefix}%`]);
      deletedLessonCards = Number(deletedLessonsResult.rowCount || 0);
    }

    const deletedPlanResult = await client.query("DELETE FROM unit_plans WHERE id = $1", [unitPlanId]);
    if (!deletedPlanResult.rowCount) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Not found" });
      return;
    }

    await client.query("COMMIT");
    res.status(200).json({
      ok: true,
      deleted_unit_plan_id: unitPlanId,
      deleted_lesson_cards: deletedLessonCards,
      kept_lesson_cards: !shouldDeleteLessons
    });
  } catch (_error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Could not delete unit plan" });
  } finally {
    client.release();
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

app.get("/api/integrations/trello/config", (_req, res) => {
  res.json({
    enabled: Boolean(TRELLO_API_KEY),
    api_key: TRELLO_API_KEY || ""
  });
});

app.get("/api/integrations/trello/status", async (req, res) => {
  const email = getRequestUserEmail(req);
  if (!isSchoolEmail(email)) {
    res.status(401).json({ error: "School sign-in required" });
    return;
  }

  try {
    const existing = await getStoredTrelloConnection(email);
    if (!existing?.trello_token) {
      res.json({ connected: false, email: normalizeEmail(email) });
      return;
    }

    let me = null;
    try {
      me = await trelloApiRequest("/members/me", {
        token: existing.trello_token,
        query: { fields: "id,username,fullName,url" }
      });
    } catch (_error) {
      res.json({
        connected: false,
        email: normalizeEmail(email),
        reason: "token_invalid"
      });
      return;
    }

    res.json({
      connected: true,
      email: normalizeEmail(email),
      trello: {
        id: String(me?.id || existing.trello_member_id || "").trim(),
        username: String(me?.username || existing.trello_username || "").trim(),
        full_name: String(me?.fullName || existing.trello_full_name || "").trim(),
        url: String(me?.url || "").trim()
      },
      connected_at: existing.connected_at || null,
      updated_at: existing.updated_at || null
    });
  } catch (_error) {
    res.status(500).json({ error: "Could not load Trello connection status" });
  }
});

app.get("/api/integrations/trello/connections", requireActivityWriteAccess, async (req, res) => {
  const emailsParam = String(req.query?.emails || "").trim();
  const parsedEmails = emailsParam
    .split(",")
    .map((value) => normalizeEmail(value))
    .filter((value) => isSchoolEmail(value));
  const uniqueEmails = Array.from(new Set(parsedEmails));

  if (!uniqueEmails.length) {
    res.json({ connections: [] });
    return;
  }

  try {
    if (!hasDatabase) {
      const rows = uniqueEmails.map((email) => {
        const existing = memoryTrelloConnections.get(email) || null;
        return {
          email,
          connected: Boolean(existing?.trello_token),
          connected_at: existing?.connected_at || null,
          updated_at: existing?.updated_at || null
        };
      });
      res.json({ connections: rows });
      return;
    }

    await ensureTrelloConnectionsSchema();
    const result = await pool.query(
      `
        SELECT student_email, trello_token, connected_at, updated_at
        FROM student_trello_connections
        WHERE student_email = ANY($1::text[])
      `,
      [uniqueEmails]
    );

    const byEmail = new Map(
      (result.rows || []).map((row) => [
        normalizeEmail(row.student_email),
        {
          email: normalizeEmail(row.student_email),
          connected: Boolean(row?.trello_token),
          connected_at: row?.connected_at || null,
          updated_at: row?.updated_at || null
        }
      ])
    );

    const rows = uniqueEmails.map((email) => {
      const found = byEmail.get(email);
      return found || { email, connected: false, connected_at: null, updated_at: null };
    });

    res.json({ connections: rows });
  } catch (_error) {
    res.status(500).json({ error: "Could not load Trello connection statuses" });
  }
});

app.get("/api/integrations/trello/list-progress", requireActivityWriteAccess, async (req, res) => {
  const studentEmail = normalizeEmail(req.query?.student_email || req.query?.studentEmail || "");
  const boardUrl = String(req.query?.board_url || req.query?.boardUrl || "").trim();

  if (!isSchoolEmail(studentEmail)) {
    res.status(400).json({ error: "A valid student email is required" });
    return;
  }

  if (!boardUrl) {
    res.status(400).json({ error: "A Trello board or card URL is required" });
    return;
  }

  try {
    const existing = await getStoredTrelloConnection(studentEmail);
    if (!existing?.trello_token) {
      res.status(404).json({ error: "Student has not connected Trello" });
      return;
    }

    let boardId = parseTrelloBoardIdentifier(boardUrl);
    if (!boardId) {
      const cardId = parseTrelloCardIdentifier(boardUrl);
      if (cardId) {
        const card = await trelloApiRequest(`/cards/${encodeURIComponent(cardId)}`, {
          token: existing.trello_token,
          query: { fields: "id,idBoard,url" }
        });
        boardId = String(card?.idBoard || "").trim();
      }
    }

    if (!boardId) {
      res.status(400).json({ error: "Could not resolve Trello board id from URL" });
      return;
    }

    const lists = await trelloApiRequest(`/boards/${encodeURIComponent(boardId)}/lists`, {
      token: existing.trello_token,
      query: { fields: "id,name,closed", filter: "open" }
    });
    const cards = await trelloApiRequest(`/boards/${encodeURIComponent(boardId)}/cards`, {
      token: existing.trello_token,
      query: { fields: "id,idList,closed", filter: "open" }
    });

    const openLists = (Array.isArray(lists) ? lists : []).map((list) => ({
      id: String(list?.id || "").trim(),
      name: String(list?.name || "").trim()
    })).filter((list) => list.id);

    const listNameById = new Map(openLists.map((list) => [list.id, list.name]));
    const toDoListIds = openLists
      .filter((list) => /(^|\s)to\s*do($|\s)|^todo$/i.test(list.name))
      .map((list) => list.id);
    const doingListIds = openLists
      .filter((list) => /(^|\s)doing($|\s)|in\s*progress/i.test(list.name))
      .map((list) => list.id);
    const doneListIds = openLists
      .filter((list) => /(^|\s)done($|\s)|complete(d)?|finished/i.test(list.name))
      .map((list) => list.id);

    const openCards = (Array.isArray(cards) ? cards : []).map((card) => ({
      id: String(card?.id || "").trim(),
      idList: String(card?.idList || "").trim(),
      closed: Boolean(card?.closed)
    })).filter((card) => card.id && card.idList && !card.closed);

    const toDoCount = openCards.filter((card) => toDoListIds.includes(card.idList)).length;
    const doingCount = openCards.filter((card) => doingListIds.includes(card.idList)).length;
    const doneCount = openCards.filter((card) => doneListIds.includes(card.idList)).length;
    const trackedTotal = toDoCount + doingCount + doneCount;
    const completionPercent = trackedTotal > 0
      ? Math.round((doneCount / trackedTotal) * 100)
      : 0;

    res.json({
      student_email: studentEmail,
      board_id: boardId,
      open_cards_total: openCards.length,
      todo_count: toDoCount,
      doing_count: doingCount,
      done_count: doneCount,
      completion_percent: completionPercent,
      todo_lists: toDoListIds.map((id) => listNameById.get(id) || id),
      doing_lists: doingListIds.map((id) => listNameById.get(id) || id),
      done_lists: doneListIds.map((id) => listNameById.get(id) || id)
    });
  } catch (error) {
    const status = Number(error?.status) || 500;
    res.status(status).json({ error: error.message || "Could not load Trello list progress" });
  }
});

app.post("/api/integrations/trello/connect", async (req, res) => {
  const email = getRequestUserEmail(req);
  if (!isSchoolEmail(email)) {
    res.status(401).json({ error: "School sign-in required" });
    return;
  }

  if (!TRELLO_API_KEY) {
    res.status(503).json({ error: "Trello integration is not configured yet" });
    return;
  }

  const token = String(req.body?.token || "").trim();
  if (!token) {
    res.status(400).json({ error: "Trello token is required" });
    return;
  }

  try {
    const me = await trelloApiRequest("/members/me", {
      token,
      query: { fields: "id,username,fullName,url" }
    });

    const saved = await saveTrelloConnection(email, token, me);

    res.status(201).json({
      connected: true,
      email: normalizeEmail(email),
      trello: {
        id: String(me?.id || "").trim(),
        username: String(me?.username || "").trim(),
        full_name: String(me?.fullName || "").trim(),
        url: String(me?.url || "").trim()
      },
      connected_at: saved.connected_at || null,
      updated_at: saved.updated_at || null
    });
  } catch (error) {
    const status = Number(error?.status) || 400;
    const safeStatus = status === 401 ? 400 : status;
    const baseMessage = String(error?.message || "Could not connect Trello account");
    const errorMessage = status === 401
      ? `${baseMessage} Generate a token using this app's key and try again.`
      : baseMessage;

    res.status(safeStatus).json({ error: errorMessage });
  }
});

app.delete("/api/integrations/trello/connect", async (req, res) => {
  const email = getRequestUserEmail(req);
  if (!isSchoolEmail(email)) {
    res.status(401).json({ error: "School sign-in required" });
    return;
  }

  try {
    await deleteTrelloConnection(email);
    res.status(204).send();
  } catch (_error) {
    res.status(500).json({ error: "Could not disconnect Trello account" });
  }
});

app.get("/api/integrations/trello/boards", async (req, res) => {
  const email = getRequestUserEmail(req);
  if (!isSchoolEmail(email)) {
    res.status(401).json({ error: "School sign-in required" });
    return;
  }

  try {
    const existing = await getStoredTrelloConnection(email);
    if (!existing?.trello_token) {
      res.status(404).json({ error: "Connect Trello first" });
      return;
    }

    const boards = await trelloApiRequest("/members/me/boards", {
      token: existing.trello_token,
      query: { fields: "id,name,url,closed", filter: "open" }
    });

    res.json((Array.isArray(boards) ? boards : []).map((board) => ({
      id: String(board?.id || "").trim(),
      name: String(board?.name || "").trim(),
      url: String(board?.url || "").trim()
    })).filter((board) => board.id));
  } catch (error) {
    const status = Number(error?.status) || 500;
    res.status(status).json({ error: error.message || "Could not load Trello boards" });
  }
});

app.get("/api/integrations/trello/boards/:boardId/lists", async (req, res) => {
  const email = getRequestUserEmail(req);
  if (!isSchoolEmail(email)) {
    res.status(401).json({ error: "School sign-in required" });
    return;
  }

  const boardId = String(req.params.boardId || "").trim();
  if (!boardId) {
    res.status(400).json({ error: "Board id is required" });
    return;
  }

  try {
    const existing = await getStoredTrelloConnection(email);
    if (!existing?.trello_token) {
      res.status(404).json({ error: "Connect Trello first" });
      return;
    }

    const lists = await trelloApiRequest(`/boards/${encodeURIComponent(boardId)}/lists`, {
      token: existing.trello_token,
      query: { fields: "id,name,closed,pos", filter: "open" }
    });

    res.json((Array.isArray(lists) ? lists : []).map((list) => ({
      id: String(list?.id || "").trim(),
      name: String(list?.name || "").trim(),
      pos: Number(list?.pos) || 0
    })).filter((list) => list.id));
  } catch (error) {
    const status = Number(error?.status) || 500;
    res.status(status).json({ error: error.message || "Could not load Trello lists" });
  }
});

app.post("/api/integrations/trello/cards", async (req, res) => {
  const email = getRequestUserEmail(req);
  if (!isSchoolEmail(email)) {
    res.status(401).json({ error: "School sign-in required" });
    return;
  }

  const listId = String(req.body?.list_id || req.body?.idList || "").trim();
  const cardName = String(req.body?.name || "").trim();
  const cardDesc = String(req.body?.desc || "").trim();
  if (!listId || !cardName) {
    res.status(400).json({ error: "List and card name are required" });
    return;
  }

  try {
    const existing = await getStoredTrelloConnection(email);
    if (!existing?.trello_token) {
      res.status(404).json({ error: "Connect Trello first" });
      return;
    }

    const created = await trelloApiRequest("/cards", {
      token: existing.trello_token,
      method: "POST",
      query: {
        idList: listId,
        name: cardName,
        desc: cardDesc,
        pos: String(req.body?.pos || "top").trim() || "top"
      }
    });

    res.status(201).json({
      id: String(created?.id || "").trim(),
      name: String(created?.name || cardName).trim(),
      url: String(created?.url || "").trim(),
      short_link: String(created?.shortLink || "").trim()
    });
  } catch (error) {
    const status = Number(error?.status) || 500;
    res.status(status).json({ error: error.message || "Could not create Trello card" });
  }
});

app.post("/api/integrations/trello/work-log", async (req, res) => {
  const email = getRequestUserEmail(req);
  if (!isSchoolEmail(email)) {
    res.status(401).json({ error: "School sign-in required" });
    return;
  }

  try {
    const existing = await getStoredTrelloConnection(email);
    if (!existing?.trello_token) {
      res.status(404).json({ error: "Connect Trello first" });
      return;
    }

    const cardIdentifier = parseTrelloCardIdentifier(req.body?.card_id || req.body?.card_url);
    if (!cardIdentifier) {
      res.status(400).json({ error: "A Trello card link or card id is required" });
      return;
    }

    const note = String(req.body?.note || "").trim();
    const activityTitle = String(req.body?.activity_title || req.body?.activity_name || "").trim();
    const progressRaw = Number(req.body?.progress_percent);
    const progressPercent = Number.isFinite(progressRaw) ? Math.max(0, Math.min(100, Math.round(progressRaw))) : NaN;

    const text = formatTrelloCommentText({
      activityTitle,
      progressPercent,
      note,
      createdByEmail: normalizeEmail(email)
    });

    const action = await trelloApiRequest(`/cards/${encodeURIComponent(cardIdentifier)}/actions/comments`, {
      token: existing.trello_token,
      method: "POST",
      query: { text }
    });

    const shortLink = String(action?.data?.card?.shortLink || cardIdentifier).trim();
    const cardUrl = shortLink ? `https://trello.com/c/${shortLink}` : "";

    res.status(201).json({
      ok: true,
      card_id: cardIdentifier,
      card_url: cardUrl,
      action_id: String(action?.id || "").trim()
    });
  } catch (error) {
    const status = Number(error?.status) || 500;
    res.status(status).json({ error: error.message || "Could not send Trello work log" });
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
    created_by_email: String(body.created_by_email || getRequestUserEmail(req) || "").trim(),
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

app.get("/assessment-standard-card.html", (_req, res) => {
  res.sendFile(path.join(__dirname, "assessment-standard-card.html"));
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
