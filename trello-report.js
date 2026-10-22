"use strict";

const path = require("node:path");
const { randomUUID } = require("node:crypto");
const PDFDocument = require("pdfkit");

function reportError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

function parseReportTrelloUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:" || url.hostname !== "trello.com" || url.username || url.password || url.port) return null;
    const match = url.pathname.match(/^\/(b|c)\/([A-Za-z0-9]{8,32})(?:\/[^/]*)?\/?$/);
    return match ? { type: match[1], id: match[2], url: `https://trello.com/${match[1]}/${match[2]}` } : null;
  } catch (_error) {
    return null;
  }
}

function trelloReportSources(evidence) {
  const links = new Map();
  (Array.isArray(evidence) ? evidence : []).forEach((row) => {
    (Array.isArray(row?.steps) ? row.steps : []).forEach((step) => {
      const text = String(step?.text || "").trim();
      if (!text.startsWith("TRELLO_CARD_URL|")) return;
      const link = parseReportTrelloUrl(text.slice("TRELLO_CARD_URL|".length).trim());
      if (link) links.set(link.url, link);
    });
  });
  if (links.size > 50) throw reportError("Too many saved Trello links to resolve. Keep at most 50 links on this assessment.");
  return Array.from(links.values());
}

async function resolveReportBoards(sources, token, trelloApiRequest) {
  const boards = new Map();
  for (const source of sources) {
    let id = source.id;
    if (source.type === "c") {
      const card = await trelloApiRequest(`/cards/${encodeURIComponent(id)}`, { token, query: { fields: "idBoard" } });
      id = String(card.idBoard || "");
    }
    if (!/^[A-Za-z0-9]{8,32}$/.test(id)) throw reportError("A saved Trello link no longer resolves to a board.");
    if (boards.has(id)) continue;
    const board = await trelloApiRequest(`/boards/${encodeURIComponent(id)}`, { token, query: { fields: "id,name,url,closed" } });
    if (!/^[A-Za-z0-9]{8,32}$/.test(String(board.id || ""))) throw reportError("Trello returned an invalid board.", 502);
    const link = parseReportTrelloUrl(board.url);
    if (!link || link.type !== "b") throw reportError("Trello returned an invalid board link.", 502);
    boards.set(board.id, { id: board.id, name: String(board.name || "Untitled board"), url: link.url, closed: Boolean(board.closed) });
  }
  return Array.from(boards.values());
}

function createTrelloReportPdf({ board, lists, cards, email, activityId, generatedAt }) {
  if (!Array.isArray(cards) || !Array.isArray(lists)) throw reportError("Trello did not return a complete board.", 502);
  if (cards.length > 500 || lists.length > 100) throw reportError("This board exceeds the report limit of 500 cards and 100 lists. No partial report was created.");
  if (cards.reduce((total, card) => total + String(card.name || "").length + String(card.desc || "").length, 0) > 500000) {
    throw reportError("This board exceeds the report text limit. No partial report was created.");
  }
  const listNames = new Map(lists.map((list) => [list.id, list.name]));
  if (cards.some((card) => !listNames.has(card.idList))) throw reportError("The board changed while it was being read. Generate the report again.", 409);
  const dateLabel = (value) => {
    if (!value) return "Not set";
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", dateStyle: "medium", timeStyle: "short" }) : "Not set";
  };
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true, info: { Title: `${board.name} - Trello Board Report`, Author: "WHS DTECH-HUB" } });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    try {
      const fonts = path.join(path.dirname(require.resolve("dejavu-fonts-ttf/package.json")), "ttf");
      doc.registerFont("report", path.join(fonts, "DejaVuSans.ttf"));
      doc.registerFont("report-bold", path.join(fonts, "DejaVuSans-Bold.ttf"));
      const width = doc.page.width - 96;
      const text = (value, size = 10, bold = false, color = "#243c46") => {
        doc.font(bold ? "report-bold" : "report").fontSize(size).fillColor(color).text(String(value || ""), { width, lineGap: 3 });
        doc.moveDown(0.5);
      };
      const ensureSpace = (height) => { if (doc.y + height > doc.page.height - 65) doc.addPage(); };
      text("TRELLO BOARD REPORT", 12, true, "#236b91");
      doc.moveDown(3);
      text(board.name, 28, true);
      text(`Student: ${email}`, 11);
      text(`Assessment: ${activityId}`, 11);
      text(`Exported: ${dateLabel(generatedAt)}`, 11);
      text(`Board: ${board.url}`, 10);
      if (board.closed) text("Archived board", 11, true);
      doc.moveDown(2);
      const summaries = [
        ["CARDS", String(cards.length)], ["LISTS", String(lists.length)],
        ["DUE DATES", String(cards.filter((card) => card.due).length)],
        ["ARCHIVED CARDS", String(cards.filter((card) => card.closed).length)]
      ];
      const summaryTop = doc.y;
      summaries.forEach(([label, value], index) => {
        const left = 48 + index * width / 4;
        doc.font("report").fontSize(8).fillColor("#526772").text(label, left, summaryTop, { width: width / 4 - 8 });
        doc.font("report-bold").fontSize(22).fillColor("#173c4a").text(value, left, summaryTop + 22, { width: width / 4 - 8 });
      });
      doc.x = 48;
      doc.y = summaryTop + 90;
      text("Lists", 12, true);
      for (const list of [...lists].sort((first, second) => Number(first.pos || 0) - Number(second.pos || 0))) {
        const count = cards.filter((card) => card.idList === list.id).length;
        text(`${list.name}${list.closed ? " (archived)" : ""}: ${count} ${count === 1 ? "card" : "cards"}`);
      }
      doc.addPage();
      text(`Cards (${cards.length})`, 18, true);
      if (!cards.length) text("No cards on this board.");
      const ordered = [...lists].sort((first, second) => Number(first.pos || 0) - Number(second.pos || 0))
        .flatMap((list) => cards.filter((card) => card.idList === list.id).sort((first, second) => Number(first.pos || 0) - Number(second.pos || 0)));
      for (const card of ordered) {
        ensureSpace(125);
        const cleanName = String(card.name || "Untitled card");
        text(cleanName, 13, true);
        text(`List: ${listNames.get(card.idList)}${card.closed ? " | Archived card" : ""}`);
        text(`Due: ${dateLabel(card.due)}${card.dueComplete ? " | Marked complete" : ""}`);
        if (card.start) text(`Start: ${dateLabel(card.start)}`);
        if (card.dateLastActivity) text(`Last activity: ${dateLabel(card.dateLastActivity)}`);
        const labels = (Array.isArray(card.labels) ? card.labels : []).map((label) => label.name || label.color).filter(Boolean);
        if (labels.length) text(`Labels: ${labels.join(", ")}`);
        text("Description", 9, true, "#526772");
        text(card.desc || "No description provided.");
        const link = parseReportTrelloUrl(card.url);
        if (link?.type === "c") {
          doc.font("report").fontSize(9).fillColor("#236b91").text(link.url, { width, link: link.url, underline: true });
          doc.moveDown();
        }
        doc.moveDown(0.7);
      }
      const pages = doc.bufferedPageRange();
      for (let index = pages.start; index < pages.start + pages.count; index += 1) {
        doc.switchToPage(index);
        const bottomMargin = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        doc.font("report").fontSize(8).fillColor("#526772").text(`WHS DTECH-HUB | ${dateLabel(generatedAt)} | Page ${index + 1} of ${pages.count}`,
          48, doc.page.height - 30, { width, lineBreak: false });
        doc.page.margins.bottom = bottomMargin;
      }
      doc.end();
    } catch (error) {
      doc.destroy();
      reject(error);
    }
  });
}

function createTrelloReportStore({ now = Date.now, ttlMs = 900000, maxBytes = 10 * 1024 * 1024, maxCacheBytes = 20 * 1024 * 1024 } = {}) {
  const reports = new Map();
  const prune = () => { for (const [id, report] of reports) if (report.expiresAt <= now()) reports.delete(id); };
  return {
    save({ email, activityId, board, buffer, generatedAt }) {
      prune();
      if (buffer.length > maxBytes) throw reportError("The generated report exceeds the 10 MB limit.", 413);
      let bytes = Array.from(reports.values()).reduce((total, report) => total + report.buffer.length, 0);
      while (reports.size && bytes + buffer.length > maxCacheBytes) {
        const oldest = reports.keys().next().value;
        bytes -= reports.get(oldest).buffer.length;
        reports.delete(oldest);
      }
      const snapshot = {
        snapshotId: randomUUID(), boardId: board.id, boardName: board.name, boardUrl: board.url,
        generatedAt, expiresAt: now() + ttlMs, bytes: buffer.length,
        fileName: `Trello-Report-${activityId}-${board.id}-${randomUUID()}.pdf`
      };
      reports.set(snapshot.snapshotId, { ...snapshot, email, activityId, buffer });
      return snapshot;
    },
    read(id, email, activityId) {
      prune();
      const report = reports.get(String(id || ""));
      if (!report || report.email !== email || report.activityId !== activityId) throw reportError("This report preview has expired. Generate a new Trello report.", 410);
      return report;
    }
  };
}

module.exports = { parseReportTrelloUrl, trelloReportSources, resolveReportBoards, createTrelloReportPdf, createTrelloReportStore };