/**
 * Install this script in the Google Sheets response spreadsheet.
 *
 * In Apps Script > Project Settings > Script Properties, add:
 *   DTECH_HUB_WEBHOOK_URL = https://dtech-hub2.onrender.com/api/integrations/external-exam-intentions/sync
 *   DTECH_HUB_WEBHOOK_SECRET = the same secret configured as EXTERNAL_EXAM_FORM_WEBHOOK_SECRET in Render
 *
 * Run installExternalExamResponseTrigger() once and authorize it. It imports current responses,
 * syncs on new submissions, and reconciles deletions every 15 minutes. Do not put the secret in the sheet.
 */
function installExternalExamResponseTrigger() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error("Open this script from the form response spreadsheet first.");
  PropertiesService.getScriptProperties().setProperty("DTECH_HUB_RESPONSE_SPREADSHEET_ID", spreadsheet.getId());

  const triggers = ScriptApp.getProjectTriggers();
  const hasSubmitTrigger = triggers.some((trigger) =>
    trigger.getHandlerFunction() === "syncExternalExamResponse"
      && trigger.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT
  );
  const hasReconcileTrigger = triggers.some((trigger) =>
    trigger.getHandlerFunction() === "syncExistingExternalExamResponses"
      && trigger.getEventType() === ScriptApp.EventType.CLOCK
  );

  if (!hasSubmitTrigger) {
    ScriptApp.newTrigger("syncExternalExamResponse")
      .forSpreadsheet(spreadsheet)
      .onFormSubmit()
      .create();
  }
  if (!hasReconcileTrigger) {
    ScriptApp.newTrigger("syncExistingExternalExamResponses")
      .timeBased()
      .everyMinutes(15)
      .create();
  }
}

function syncExternalExamResponse(_event) {
  return syncExistingExternalExamResponses();
}

function syncExistingExternalExamResponses() {
  const spreadsheetId = String(PropertiesService.getScriptProperties().getProperty("DTECH_HUB_RESPONSE_SPREADSHEET_ID") || "").trim();
  const spreadsheet = spreadsheetId
    ? SpreadsheetApp.openById(spreadsheetId)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error("Open this script from the form response spreadsheet and install the sync trigger first.");

  const properties = PropertiesService.getScriptProperties();
  const endpoint = String(properties.getProperty("DTECH_HUB_WEBHOOK_URL") || "").trim();
  const secret = String(properties.getProperty("DTECH_HUB_WEBHOOK_SECRET") || "").trim();
  if (!endpoint || !secret) throw new Error("Configure DTECH_HUB_WEBHOOK_URL and DTECH_HUB_WEBHOOK_SECRET in Script Properties.");

  const sheet = spreadsheet.getSheets().find((candidate) => {
    const lastColumn = candidate.getLastColumn();
    if (!lastColumn) return false;
    const headers = candidate.getRange(1, 1, 1, lastColumn).getDisplayValues()[0].map((value) => String(value || "").trim());
    return headers.some((header) => /email/i.test(header))
      && headers.some((header) => /external exam.*november|intending.*external exam/i.test(header));
  });
  if (!sheet) throw new Error("Could not find the Form responses sheet headers for email and the November external exam question.");

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return 0;
  const headers = values[0].map((value) => String(value || "").trim());
  const emailIndex = headers.findIndex((header) => /email/i.test(header));
  const decisionIndex = headers.findIndex((header) => /external exam.*november|intending.*external exam/i.test(header));
  if (emailIndex < 0 || decisionIndex < 0) throw new Error("Required Form response columns were not found.");

  const responses = [];
  values.slice(1).forEach((row) => {
    const email = String(row[emailIndex] || "").trim();
    const decision = String(row[decisionIndex] || "").trim();
    if (!email && !decision) return;
    if (!email || !decision) throw new Error("A response row is missing its email or external exam decision.");
    const lowered = decision.toLowerCase();
    const normalizedDecision = /^(?:no\b|not\b|i do not\b|i don't\b)/.test(lowered)
      ? "no"
      : /^(?:yes\b|i intend\b|i will\b|i am\b)/.test(lowered) ? "yes" : "";
    if (!normalizedDecision) throw new Error("Unrecognized exam decision for " + email + ". No response snapshot was sent.");
    const timestamp = row[0] ? new Date(row[0]) : new Date();
    responses.push({
      student_email: email.trim().toLowerCase(),
      decision: normalizedDecision,
      submitted_at: Number.isNaN(timestamp.getTime()) ? new Date().toISOString() : timestamp.toISOString()
    });
  });

  const response = UrlFetchApp.fetch(endpoint, {
    method: "post",
    contentType: "application/json",
    headers: { "X-External-Exam-Webhook-Secret": secret },
    payload: JSON.stringify({ responses }),
    muteHttpExceptions: true
  });
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error("DTECH-HUB response reconciliation failed (HTTP " + status + "): " + response.getContentText());
  }
  return responses.length;
}
