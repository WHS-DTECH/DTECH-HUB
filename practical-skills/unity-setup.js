"use strict";

function withUnityHubLicence(content) {
    if (!/unity\s+setup/i.test(String(content?.identity?.name || content?.bannerTitle || ""))) return content;
    const index = (content.worksheets || []).findIndex((worksheet) => /^unity hub\s*(?:&|and)\s*licen[cs]e$/i.test(String(worksheet?.activity || "").trim()));
    if (index < 0) return content;
    const activities = [...(content.activities || [])];
    let changed = false;
    if (activities[index]?.unityHubLicenceVersion !== 1) changed = true;
    if (activities[index]?.unityHubLicenceVersion !== 1) activities[index] = {
        ...activities[index],
        title: "Unity Hub & Licence",
        unityHubLicenceVersion: 1,
        completionMode: "manual",
        questions: [],
        images: [],
        taskBrief: {
            challenge: "Find Unity Hub on your school computer and activate the school Unity Education licence.",
            evidenceRequired: "No screenshots, uploads or written answers are required for this activity. After activating your licence, choose Mark Activity Complete. This does not award the Unity Setup Licence: submit the Google Drive link to your completed UnityTest project in the final activity."
        },
        blocks: [
            { id: "unity-find-hub", kind: "tasks", title: "Step 1 - Find Unity Hub",
                text: "Click the Windows Start button.\nType Unity Hub into the search box.\nSelect Unity Hub to open it." },
            { id: "unity-licence-settings", kind: "tasks", title: "Step 2 - Open Licence Settings",
                text: "In Unity Hub, click Settings (gear icon).\nSelect Licenses.\nChoose Add license or the appropriate activation option." },
            { id: "unity-school-licence", kind: "schoollicence", title: "Step 3 - Activate Your School Licence",
                text: "Use the Unity Education licence provided by your teacher. View the school licence below, then complete the activation process in Unity Hub.",
                activationMethod: "instructions", licenceValue: "" },
            { id: "unity-check-licence", kind: "text", numbered: false, title: "Step 4 - Check Your Licence",
                text: "Return to Settings > Licenses and confirm that the licence is activated." }
        ]
    };
    const finalIndex = content.worksheets.findIndex((worksheet) => /^unity\s*test\s+project$/i.test(String(worksheet?.activity || "").trim()));
    if (finalIndex >= 0 && !activities[finalIndex]?.blocks?.some((block) => block.id === "unitytest-project-link")) {
        changed = true;
        const finalActivity = activities[finalIndex] || {};
        activities[finalIndex] = {
            ...finalActivity,
            completionMode: "auto",
            blocks: [
                ...(finalActivity.blocks || []),
                { id: "unitytest-project-link", kind: "studentlink", title: "Submit your completed UnityTest project",
                    text: "Paste the Google Drive link to your completed UnityTest project. This is the required practical evidence for the Unity Setup Licence. Make sure your teacher can access it. Submitting a link does not verify the project contents.",
                    required: true, driveOnly: true }
            ]
        };
    }
    return changed ? { ...content, activities } : content;
}

module.exports = { withUnityHubLicence };
