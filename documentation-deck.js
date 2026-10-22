"use strict";

const DOCUMENTATION_TEMPLATE_ID = "submission-documentation-deck";

function documentationPresentationId(value) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:" || url.hostname !== "docs.google.com") return "";
    return url.pathname.match(/^\/presentation\/d\/([A-Za-z0-9_-]+)(?:\/|$)/)?.[1] || "";
  } catch (_error) {
    return "";
  }
}

function isDocumentationTemplateId(value) {
  return /^(?:digital-outcome-description|target-audience|development-steps|tools-and-techniques|use-of-tools-and-techniques|trialling-components|testing-functions(?:-[a-z0-9-]+)?|project-success-criteria|relevant-digimed-conventions|user-experience-principles|relevant-implications(?:-[a-z0-9-]+)?|video-(?:conventions|integrity-testing|ux-principles)|image-integrity-testing|project-management|decomposition-tasks)$/.test(String(value || ""));
}

function buildDocumentationMergePlan({ topics = [], copies = [], files = [], excludedFileIds = [] } = {}) {
  const excluded = new Set(excludedFileIds.filter(Boolean));
  copies.forEach((copy) => {
    if ([DOCUMENTATION_TEMPLATE_ID, "assessment-full-slide-set", "final-client-presentation"].includes(copy?.templateId)) {
      excluded.add(documentationPresentationId(copy?.fileUrl));
    }
  });
  const available = files.filter((file) => file?.id && !excluded.has(file.id)
    && !/^(?:Final Client Presentation|Submission Documentation)(?:\s*-|$)/i.test(String(file.name || "")));
  const selected = new Set();
  const seenTopics = new Set();
  const sources = [];
  const missingTopics = [];
  topics.slice(0, 100).forEach((topic) => {
    const templateId = String(topic?.templateId || "").trim().toLowerCase();
    if (!isDocumentationTemplateId(templateId) || seenTopics.has(templateId)) return;
    seenTopics.add(templateId);
    const copyIds = copies.filter((copy) => copy?.templateId === templateId)
      .map((copy) => documentationPresentationId(copy.fileUrl));
    const file = available.find((candidate) => copyIds.includes(candidate.id))
      || available.find((candidate) => candidate.templateId === templateId);
    const label = String(topic?.label || templateId).slice(0, 200);
    if (!file) {
      missingTopics.push(label);
    } else if (!selected.has(file.id)) {
      selected.add(file.id);
      sources.push({ presentationId: file.id, templateId, label });
    }
  });
  return { sources, missingTopics };
}

module.exports = { DOCUMENTATION_TEMPLATE_ID, documentationPresentationId, buildDocumentationMergePlan };