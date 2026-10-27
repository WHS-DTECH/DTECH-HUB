"use strict";

const ID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const SOURCE_PREFIX = "submission-extra-slideshow-";
const PDF_PREFIX = "submission-extra-slideshow-pdf-";

function additionalSlideshowId(templateId, prefix = SOURCE_PREFIX) {
  const match = String(templateId || "").match(new RegExp(`^${prefix}(${ID_PATTERN})$`, "i"));
  return match?.[1]?.toLowerCase() || "";
}

function additionalSlideshowTemplateId(id) {
  return additionalSlideshowId(`${SOURCE_PREFIX}${id}`) ? `${SOURCE_PREFIX}${String(id).toLowerCase()}` : "";
}

function additionalSlideshowPdfTemplateId(id) {
  return additionalSlideshowId(`${PDF_PREFIX}${id}`, PDF_PREFIX) ? `${PDF_PREFIX}${String(id).toLowerCase()}` : "";
}

function additionalSlideshowCopies(copies) {
  const records = (Array.isArray(copies) ? copies : [])
    .map((entry) => ({ entry, id: additionalSlideshowId(entry?.templateId) }))
    .filter(({ id }) => id);
  return records.map(({ entry, id }) => ({
    id,
    source: entry,
    pdf: (Array.isArray(copies) ? copies : []).find((copy) => copy?.templateId === additionalSlideshowPdfTemplateId(id)) || null
  }));
}

module.exports = {
  SOURCE_PREFIX, PDF_PREFIX, additionalSlideshowId,
  additionalSlideshowTemplateId, additionalSlideshowPdfTemplateId, additionalSlideshowCopies
};
