"use strict";
const { createHash } = require("node:crypto");
const { studentUrl } = require("./activity-blocks");

function presentationId(value) {
    const safe = studentUrl(value, true);
    if (!safe) return "";
    const url = new URL(safe);
    const match = url.hostname === "docs.google.com"
        ? url.pathname.match(/^\/presentation\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]+)(?:\/|$)/i)
        : url.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]+)(?:\/|$)/i);
    if (match) return match[1];
    const id = url.hostname === "drive.google.com" && url.pathname === "/open" ? url.searchParams.get("id") : "";
    return /^[A-Za-z0-9_-]+$/.test(id || "") ? id : "";
}

function slideRequests(presentation, team) {
    const suffix = createHash("sha256").update(team.id).digest("hex").slice(0, 24);
    const pageId = `whs_team_${suffix}`;
    const textId = `whs_team_text_${suffix}`;
    const slide = (presentation.slides || []).find((page) => page.objectId === pageId);
    if (!slide && (presentation.slides || []).some((page) => (page.pageElements || []).some((element) =>
        (element.shape?.text?.textElements || []).map((part) => part.textRun?.content || "").join("")
            .trim().split(/\r?\n/)[0] === "Our Building Team"))) {
        throw Object.assign(new Error("An existing Our Building Team slide was not created by the Hub. Update it manually to avoid a duplicate."), { code: "team_slide_conflict" });
    }
    const shape = slide?.pageElements?.find((item) => item.objectId === textId);
    const members = team.members.filter((member) => member.status === "accepted" &&
        (team.mode === "independent" || member.acknowledgementVersion === team.version));
    const withoutEmail = (value) => String(value || "").replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email removed]");
    const text = ["Our Building Team", `Building: ${withoutEmail(team.building)}`,
        ...members.map((member) => `${withoutEmail(member.name)}\nBuilding area: ${withoutEmail(member.area || "Independent build")}\nContribution: ${withoutEmail(member.contribution || "Independent build")}`)].join("\n\n");
    const currentText = (shape?.shape?.text?.textElements || []).map((part) => part.textRun?.content || "").join("").replace(/\n$/, "");
    if (shape && currentText === text) return [];
    const requests = [];
    if (!slide) requests.push({ createSlide: { objectId: pageId, slideLayoutReference: { predefinedLayout: "BLANK" } } });
    if (!shape) requests.push({ createShape: { objectId: textId, shapeType: "TEXT_BOX", elementProperties: {
        pageObjectId: pageId,
        size: { width: { magnitude: 600, unit: "PT" }, height: { magnitude: 350, unit: "PT" } },
        transform: { scaleX: 1, scaleY: 1, translateX: 30, translateY: 25, unit: "PT" }
    } } });
    else requests.push({ deleteText: { objectId: textId, textRange: { type: "ALL" } } });
    requests.push({ insertText: { objectId: textId, insertionIndex: 0, text } });
    return requests;
}

async function updateTeamSlide({ team, fileId, token, driveApiRequest, googleSlidesApiRequest, googleSlidesApiBatchUpdate }) {
    const file = await driveApiRequest(`/files/${encodeURIComponent(fileId)}`, {
        accessToken: token, queryParams: { fields: "id,mimeType,trashed,capabilities(canEdit)", supportsAllDrives: true }
    });
    if (file.trashed || file.mimeType !== "application/vnd.google-apps.presentation" || !file.capabilities?.canEdit) {
        throw Object.assign(new Error("Cannot edit this Google Slideshow. Ask its owner for Editor access, then try updating the team slide; alternatively add the team details manually."), { status: 403 });
    }
    const presentation = await googleSlidesApiRequest(fileId, token);
    if (!presentation.revisionId) throw new Error("Google Slides did not return a revision. The team slide was not changed; try again.");
    const requests = slideRequests(presentation, team);
    if (requests.length) await googleSlidesApiBatchUpdate(fileId, requests, token, presentation.revisionId);
    return { updated: requests.length > 0 };
}
module.exports = { presentationId, slideRequests, updateTeamSlide };
