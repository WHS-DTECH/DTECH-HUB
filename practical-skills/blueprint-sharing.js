"use strict";

function createBlueprintSharing({ verifyDriveTokenForStudent, driveApiRequest, getTeachers, normalizeEmail, schoolDomain }) {
    return async function shareBlueprint({ studentEmail, documentKey, driveAccessToken }) {
        const id = /^google-file:([a-zA-Z0-9_-]+)$/.exec(String(documentKey || ""))?.[1];
        if (!id) throw Object.assign(new Error("Use a Google Slides sharing link before submitting."), { status: 422 });
        if (!driveAccessToken) throw Object.assign(new Error("Allow Google Drive access to share your slideshow with your teacher."), { status: 400 });
        await verifyDriveTokenForStudent(driveAccessToken, studentEmail);
        let configuredTeachers;
        try {
            configuredTeachers = await getTeachers();
        } catch (error) {
            console.error("[blueprint-sharing] Could not load teacher settings:", error.name);
            throw Object.assign(new Error("Teacher settings could not be loaded. Please try again or ask an administrator for help."), { status: 503 });
        }
        const teachers = [...new Set(configuredTeachers.map(normalizeEmail))]
            .filter(email => email && email !== studentEmail && email.endsWith(`@${schoolDomain}`));
        if (teachers.length !== 1) {
            throw Object.assign(new Error("The designated DTECH Lead Teacher could not be identified uniquely. Ask an administrator to check the teacher settings."), { status: 503 });
        }
        const teacher = teachers[0], filePath = `/files/${encodeURIComponent(id)}`;
        let file;
        try {
            file = await driveApiRequest(filePath, { accessToken: driveAccessToken,
                queryParams: { fields: "id,mimeType,trashed,capabilities(canShare)", supportsAllDrives: true } });
        } catch (error) {
            console.error("[blueprint-sharing] Could not read slideshow metadata:", error.status || error.name);
            throw Object.assign(new Error("Google Drive could not open this slideshow with your account. Ask the owner to share it with you and your teacher."), { status: 422 });
        }
        if (file.id !== id || file.trashed || file.mimeType !== "application/vnd.google-apps.presentation") {
            throw Object.assign(new Error("The saved link must point to an available Google Slides presentation."), { status: 422 });
        }
        try {
            let pageToken;
            do {
                const page = await driveApiRequest(`${filePath}/permissions`, { accessToken: driveAccessToken,
                    queryParams: { fields: "nextPageToken,permissions(id,type,role,emailAddress)", pageSize: 100,
                        supportsAllDrives: true, ...(pageToken ? { pageToken } : {}) } });
                if (!Array.isArray(page.permissions)) throw new Error("Invalid permissions response");
                if (page.permissions.some(permission => permission.type === "user" &&
                    normalizeEmail(permission.emailAddress) === teacher &&
                    ["reader", "commenter", "writer", "owner", "organizer", "fileOrganizer"].includes(permission.role))) return;
                pageToken = page.nextPageToken;
            } while (pageToken);
            if (!file.capabilities?.canShare) {
                throw Object.assign(new Error("Your Google account cannot share this slideshow. Ask its owner to share it with the DTECH Lead Teacher."), { status: 403 });
            }
            const permission = await driveApiRequest(`${filePath}/permissions`, { accessToken: driveAccessToken, method: "POST",
                queryParams: { supportsAllDrives: true, sendNotificationEmail: false, fields: "id,type,role,emailAddress" },
                body: { type: "user", role: "reader", emailAddress: teacher } });
            if (!permission.id || permission.type !== "user" || permission.role !== "reader" ||
                normalizeEmail(permission.emailAddress) !== teacher) throw new Error("Google did not confirm the permission");
        } catch (error) {
            if (error.status === 403 && error.message.startsWith("Your Google account cannot share")) throw error;
            console.error("[blueprint-sharing] Could not share slideshow:", error.status || error.name);
            throw Object.assign(new Error("Google could not confirm teacher access. Ask the slideshow owner to share it with the DTECH Lead Teacher, then try again."), { status: 502 });
        }
    };
}

module.exports = { createBlueprintSharing };
