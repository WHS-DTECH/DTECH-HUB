/**
 * Install this script in the Google Sheets response spreadsheet.
 *
 * In Apps Script > Project Settings > Script Properties, add:
 *   DTECH_HUB_WEBHOOK_URL = https://dtech-hub2.onrender.com/api/integrations/external-exam-intention
 *   DTECH_HUB_WEBHOOK_SECRET = the same secret configured as EXTERNAL_EXAM_FORM_WEBHOOK_SECRET in Render
 *
 * Run syncExistingExternalExamResponses() once to import current responses, then run
 * installExternalExamResponseTrigger() once and authorize it. Do not put the secret in the sheet.
 */
function installExternalExamResponseTrigger() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error("Open this script from the form response spreadsheet first.");

  const alreadyInstalled = ScriptApp.getProjectTriggers().some((trigger) =>
    trigger.getHandlerFunction() === "syncExternalExamResponse"
      && trigger.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT
  );
  if (alreadyInstalled) return;

  ScriptApp.newTrigger("syncExternalExamResponse")
    .forSpreadsheet(spreadsheet)
    .onFormSubmit()
    .create();
}

function syncExternalExamResponse(event) {
  const properties = PropertiesService.getScriptProperties();
  const endpoint = String(properties.getProperty("DTECH_HUB_WEBHOOK_URL") || "").trim();
  const secret = String(properties.getProperty("DTECH_HUB_WEBHOOK_SECRET") || "").trim();
  if (!endpoint || !secret) throw new Error("Configure DTECH_HUB_WEBHOOK_URL and DTECH_HUB_WEBHOOK_SECRET in Script Properties.");

  const namedValues = event && event.namedValues && typeof event.namedValues === "object" ? event.namedValues : {};
  const entries = Object.entries(namedValues).map(([key, value]) => [
    String(key || "").trim(),
    Array.isArray(value) ? String(value[0] || "").trim() : String(value || "").trim()
  ]);
  const emailEntry = entries.find(([key]) => /email/i.test(key));
  const decisionEntry = entries.find(([key]) => /external exam.*november|intending.*external exam/i.test(key));
  const studentEmail = String(emailEntry && emailEntry[1] || "").trim().toLowerCase();
  const decisionText = String(decisionEntry && decisionEntry[1] || "").trim();
  const lowered = decisionText.toLowerCase();
  const decision = /^(?:no\b|not\b|i do not\b|i don't\b)/.test(lowered)
    ? "no"
    : /^(?:yes\b|i intend\b|i will\b|i am\b)/.test(lowered) ? "yes" : "";
  if (!studentEmail || !decision) throw new Error("Could not find a school email and a clear Yes/No exam decision in this response.");

  const timestamp = event && Array.isArray(event.values) && event.values[0]
    ? new Date(event.values[0])
    : new Date();
  const payload = {
    student_email: studentEmail,
    decision,
    submitted_at: Number.isNaN(timestamp.getTime()) ? new Date().toISOString() : timestamp.toISOString()
  };
  const response = UrlFetchApp.fetch(endpoint, {
    method: "post",
    contentType: "application/json",
    headers: { "X-External-Exam-Webhook-Secret": secret },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error("DTECH-HUB response sync failed (HTTP " + status + "): " + response.getContentText());
  }
}

function syncExistingExternalExamResponses() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error("Open this script from the form response spreadsheet first.");

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

  let synced = 0;
  values.slice(1).forEach((row) => {
    const email = String(row[emailIndex] || "").trim();
    const decision = String(row[decisionIndex] || "").trim();
    if (!email || !decision) return;
    const namedValues = {};
    namedValues[headers[emailIndex]] = [email];
    namedValues[headers[decisionIndex]] = [decision];
    syncExternalExamResponse({ namedValues, values: [row[0]] });
    synced += 1;
  });
  return synced;
}
