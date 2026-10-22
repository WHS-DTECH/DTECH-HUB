"use strict";

function mergeDocumentationDeck(request) {
  const startedAt = Date.now();
  const email = String(Session.getActiveUser().getEmail() || "").trim().toLowerCase();
  if (!email.endsWith("@westlandhigh.school.nz") || email !== String(request.email || "").toLowerCase()) {
    throw new Error("Run this action using your own Westland High School account.");
  }
  if (!/^[A-Za-z0-9_-]+$/.test(String(request.activityId || ""))) throw new Error("Invalid assessment ID.");
  if (!Array.isArray(request.sources) || !request.sources.length || request.sources.length > 100) {
    throw new Error("Select between one and 100 written-evidence decks.");
  }

  const lock = LockService.getUserLock();
  lock.waitLock(30000);
  try {
    const folder = DriveApp.getFolderById(request.folderId);
    if (folder.getName() !== "Process Assessment" || folder.getOwner().getEmail().toLowerCase() !== email) {
      throw new Error("Use your own SeniorDTECH/Process Assessment folder.");
    }
    const parents = folder.getParents();
    let seniorFolder = false;
    while (parents.hasNext()) {
      if (parents.next().getName() === "SeniorDTECH") seniorFolder = true;
    }
    if (!seniorFolder) throw new Error("The destination must be inside SeniorDTECH.");

    const isInsideFolder = (file) => {
      const pending = [file];
      const visited = new Set();
      while (pending.length && visited.size < 1000) {
        const current = pending.pop();
        if (visited.has(current.getId())) continue;
        visited.add(current.getId());
        const parentFolders = current.getParents();
        while (parentFolders.hasNext()) {
          const parent = parentFolders.next();
          if (parent.getId() === folder.getId()) return true;
          pending.push(parent);
        }
      }
      return false;
    };

    const properties = PropertiesService.getUserProperties();
    const propertyKey = `documentation:${request.activityId}:${folder.getId()}`;
    const blankPropertyKey = `${propertyKey}:blank`;
    const marker = `DTECH-HUB linked documentation: ${request.activityId}`;
    let destinationId = String(request.destinationId || properties.getProperty(propertyKey) || "");
    let destination;
    let blankSlideId = String(properties.getProperty(blankPropertyKey) || "");
    if (destinationId) {
      const file = DriveApp.getFileById(destinationId);
      if (file.isTrashed() || !isInsideFolder(file) || file.getDescription() !== marker
        || file.getOwner().getEmail().toLowerCase() !== email) {
        throw new Error("The saved master is unavailable or is not this assessment's generated deck. No slides were changed.");
      }
      destination = SlidesApp.openById(destinationId);
    }

    const uniqueSources = new Set();
    const sourceSlides = [];
    request.sources.forEach((source) => {
      const sourceId = String(source.presentationId || "");
      if (!sourceId || sourceId === destinationId || uniqueSources.has(sourceId)) return;
      const file = DriveApp.getFileById(sourceId);
      if (!isInsideFolder(file) || file.isTrashed()
        || /^(?:Final Client Presentation|Submission Documentation)(?:\s*-|$)/i.test(file.getName())
        || /^DTECH-HUB linked documentation:/.test(file.getDescription() || "")) {
        throw new Error("Merge sources must be written-evidence decks in your Process Assessment folder.");
      }
      uniqueSources.add(sourceId);
      SlidesApp.openById(sourceId).getSlides().forEach((slide) => {
        sourceSlides.push({ presentationId: sourceId, slide });
      });
    });
    if (!sourceSlides.length) throw new Error("No written-evidence slides were found.");

    if (!destination) {
      destination = SlidesApp.create(`Submission Documentation - Assessment ${request.activityId}`);
      destinationId = destination.getId();
      const file = DriveApp.getFileById(destinationId);
      file.setDescription(marker);
      file.moveTo(folder);
      properties.setProperty(propertyKey, destinationId);
      blankSlideId = destination.getSlides()[0].getObjectId();
      properties.setProperty(blankPropertyKey, blankSlideId);
    }

    const linkedSlides = new Map();
    destination.getSlides().forEach((slide) => {
      if (slide.getSlideLinkingMode() === SlidesApp.SlideLinkingMode.LINKED) {
        linkedSlides.set(`${slide.getSourcePresentationId()}:${slide.getSourceSlideObjectId()}`, slide.getObjectId());
      }
    });
    let insertionIndex = 0;
    let addedSlides = 0;
    let processedSlides = 0;
    for (const source of sourceSlides) {
      if (Date.now() - startedAt > 210000) break;
      const key = `${source.presentationId}:${source.slide.getObjectId()}`;
      const existingId = linkedSlides.get(key);
      if (existingId) {
        insertionIndex = destination.getSlides().findIndex((slide) => slide.getObjectId() === existingId) + 1;
      } else {
        const inserted = destination.insertSlide(insertionIndex, source.slide, SlidesApp.SlideLinkingMode.LINKED);
        linkedSlides.set(key, inserted.getObjectId());
        insertionIndex += 1;
        addedSlides += 1;
      }
      processedSlides += 1;
    }
    if (blankSlideId && linkedSlides.size > 0) {
      const blankSlide = destination.getSlideById(blankSlideId);
      if (blankSlide) blankSlide.remove();
      properties.setProperty(blankPropertyKey, "");
    }
    const slideCount = destination.getSlides().length;
    const fileUrl = destination.getUrl();
    destination.saveAndClose();
    return {
      fileUrl,
      fileName: `Submission Documentation - Assessment ${request.activityId}`,
      addedSlides,
      slideCount,
      remainingSlides: sourceSlides.length - processedSlides,
      partial: processedSlides < sourceSlides.length
    };
  } finally {
    lock.releaseLock();
  }
}