"use strict";

function withUnityHubLicence(content) {
    if (!/unity\s+setup/i.test(String(content?.identity?.name || content?.bannerTitle || ""))) return content;
    const index = (content.worksheets || []).findIndex((worksheet) => /^unity hub\s*(?:&|and)\s*licen[cs]e$/i.test(String(worksheet?.activity || "").trim()));
    if (index < 0) return content;
    const activities = [...(content.activities || [])];
    let changed = false;
    if (content.unitySetupCategoryVersion !== 1) {
        content = { ...content, identity: { ...content.identity, skillArea: "Application Setups" }, unitySetupCategoryVersion: 1 };
        changed = true;
    }
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
    const editorIndex = content.worksheets.findIndex((worksheet) => /^unity\s+editor$/i.test(String(worksheet?.activity || "").trim()));
    if (editorIndex >= 0 && activities[editorIndex]?.unityEditorVersion !== 1) {
        changed = true;
        activities[editorIndex] = {
            ...activities[editorIndex],
            title: "Unity Editor",
            unityEditorVersion: 1,
            unityEditor: { version: "6000.5", modules: "", notes: "", ...activities[editorIndex]?.unityEditor },
            completionMode: "manual",
            questions: [],
            images: [],
            taskBrief: {
                challenge: "Locate and install the Unity Editor version required for your school projects through Unity Hub.",
                evidenceRequired: "No screenshots, file uploads or written answers are required. If the correct Editor is already installed, you do not need to reinstall it. Once it is installed, choose Mark Activity Complete, then continue to Activity 3 - Unity Project Folder."
            },
            blocks: [
                { id: "unity-editor-open", kind: "tasks", title: "Step 1 - Open Unity Hub",
                    text: "Open Unity Hub from the Windows Start menu.\nSelect Installs from the left-hand menu.\nCheck whether the required Editor version is already installed.\nIf the correct version is already installed, skip installation and confirm it in Step 4." },
                { id: "unity-editor-version", kind: "text", title: "Step 2 - Find the Correct Editor Version",
                    text: "Select Install Editor and find the version specified below by your teacher. If it is not listed, ask your teacher for the correct installation method." },
                { id: "unity-editor-modules", kind: "text", title: "Step 3 - Select Installation Modules",
                    text: "Select only the modules specified below by your teacher. Leave other optional modules unselected unless instructed. Choose Continue or Install, depending on the options shown in Unity Hub." },
                { id: "unity-editor-install", kind: "tasks", title: "Step 4 - Install the Editor",
                    text: "Complete the download and installation. Keep Unity Hub open until it finishes.\nReturn to Installs.\nConfirm the required version appears in your installed Editor list.\nMark this activity complete, then continue to Activity 3 - Unity Project Folder. You can reopen these instructions whenever you need them." }
            ]
        };
    }
    const folderIndex = content.worksheets.findIndex((worksheet) => /^unity\s+project\s+folder$/i.test(String(worksheet?.activity || "").trim()));
    if (folderIndex >= 0 && activities[folderIndex]?.unityProjectFolderVersion !== 1) {
        changed = true;
        activities[folderIndex] = {
            ...activities[folderIndex],
            title: "Unity Project Folder",
            unityProjectFolderVersion: 1,
            completionMode: "manual",
            questions: [],
            images: [],
            taskBrief: {
                challenge: "Create a local folder for your Unity projects and select it as the project location in Unity Hub.",
                evidenceRequired: "No screenshots, file uploads or written answers are required. Once your Unity folder exists inside Videos and the correct project location is selected, choose Mark Activity Complete. Then continue to Activity 4 - Google Drive Backup. Reopen these instructions whenever you change computers."
            },
            blocks: [
                { id: "unity-folder-videos", kind: "tasks", title: "Step 1 - Find Your Videos Folder",
                    text: "Open Windows File Explorer from the taskbar or Start menu.\nSelect This PC, then open Videos.\nUse the Windows Videos folder, not a folder in Downloads or Documents." },
                { id: "unity-folder-create", kind: "text", numbered: false, title: "Step 2 - Create Your Unity Folder",
                    text: "Inside Videos, right-click an empty space and choose New > Folder. Name the folder Unity and press Enter.\nIf Unity already exists inside Videos, use that existing folder rather than creating another.\n\nYour folder structure should look like this:\nVideos\n\u2514\u2500\u2500 Unity" },
                { id: "unity-folder-location", kind: "tasks", title: "Step 3 - Set Your Unity Project Location",
                    text: "Open Unity Hub and select Projects.\nSelect New project to open the setup screen only.\nFind the Location field and use its folder icon to select Videos\\Unity.\nDo not click Create project. Do not create a Unity project during this activity; the test project will be created in Activity 5." },
                { id: "unity-folder-check", kind: "text", numbered: false, title: "Step 4 - Check Your Folder Location",
                    text: "Confirm that Unity Hub displays your Unity folder inside Videos as the project location. Your Windows username and full path may differ from other students' paths; you do not need to type or submit a fixed username or full file path.\nAfter checking the location, leave the setup screen without creating a project. You will create the test project in Activity 5.\nMark this activity complete, then continue to Activity 4 - Google Drive Backup." }
            ]
        };
    }
    const backupIndex = content.worksheets.findIndex((worksheet) => /^google\s+drive\s+backup$/i.test(String(worksheet?.activity || "").trim()));
    if (backupIndex >= 0 && activities[backupIndex]?.unityDriveBackupVersion !== 1) {
        changed = true;
        activities[backupIndex] = {
            ...activities[backupIndex],
            title: "Google Drive Backup",
            unityDriveBackupVersion: 1,
            completionMode: "manual",
            questions: [],
            images: [],
            taskBrief: {
                challenge: "Connect your Windows Videos folder to Google Drive for desktop so Unity projects saved in Videos\\Unity can be backed up to your school Google Drive.",
                evidenceRequired: "No screenshots, uploads or written answers are required. Once Videos is connected to Google Drive with synchronisation enabled, choose Mark Activity Complete, then continue to Activity 5 - Unity Test Project. You can reopen these instructions whenever you need to configure another computer."
            },
            blocks: [
                { id: "unity-backup-find", kind: "tasks", title: "Step 1 - Find Google Drive for desktop",
                    text: "Click the Windows Start button.\nSearch for Google Drive.\nOpen Google Drive for desktop.\nLook for the Google Drive icon in the Windows system tray near the clock." },
                { id: "unity-backup-signin", kind: "tasks", title: "Step 2 - Sign In",
                    text: "Click Sign in with browser if prompted.\nSelect your WHS school Google account, not a personal Google account.\nComplete the sign-in process and return to Google Drive for desktop.\nIf you are already signed in, check that it is your WHS school account before continuing." },
                { id: "unity-backup-preferences", kind: "tasks", title: "Step 3 - Open Google Drive Preferences",
                    text: "Click the Google Drive icon in the Windows system tray. If it is hidden, open the tray's hidden icons.\nSelect Settings (gear icon).\nSelect Preferences.\nFind Folders from your computer." },
                { id: "unity-backup-connect", kind: "tasks", title: "Step 4 - Connect Your Videos Folder",
                    text: "If Videos is already configured for syncing, use the existing connection; do not add it again.\nOtherwise, under Folders from your computer, select Add folder.\nChoose your Windows Videos folder, not a similarly named folder inside Google Drive.\nEnable Sync with Google Drive, then click Done and Save if prompted.\nKeep your Unity folder in Videos\\Unity. Do not move the Unity project folder into the Google Drive virtual drive." },
                { id: "unity-backup-check", kind: "tasks", title: "Step 5 - Check Your Backup Connection",
                    text: "Return to Google Drive Preferences.\nConfirm Videos appears under Folders from your computer with Sync with Google Drive enabled.\nCheck the Google Drive activity window for sync errors. If Google Drive reports a sync error, resolve it before relying on the backup; ask your teacher for help if needed.\nAllow synchronisation to finish before changing computers. Your Unity projects are included when saved inside Videos\\Unity.\nMark this activity complete, then continue to Activity 5 - Unity Test Project." }
            ]
        };
    }
    const finalIndex = content.worksheets.findIndex((worksheet) => /^unity\s*test\s+project$/i.test(String(worksheet?.activity || "").trim()));
    if (finalIndex >= 0 && activities[finalIndex]?.unityTestProjectVersion !== 1) {
        changed = true;
        const finalActivity = activities[finalIndex] || {};
        activities[finalIndex] = {
            ...finalActivity,
            title: "Unity Test Project",
            unityTestProjectVersion: 1,
            completionMode: "auto",
            questions: [],
            images: [],
            taskBrief: {
                challenge: "Demonstrate that Unity is operational: create and save UnityTest, then back up the complete project using Google Drive for desktop. This is the only activity requiring submitted evidence.",
                evidenceRequired: "Submit one Google Drive folder link below. No screenshots, written explanations or additional uploads are required. A valid folder URL completes this activity automatically; it does not verify the project contents or sharing permissions. The Unity Setup Licence follows the kit's existing process and requires all activities to be complete."
            },
            blocks: [
                { id: "unitytest-create", kind: "tasks", title: "Step 1 - Create a New Unity Project",
                    text: "Open Unity Hub and select Projects > New project.\nSelect the required Unity Editor version from Activity 2.\nChoose the Universal 3D (URP) template. If it is unavailable, ask your teacher which 3D template to use.\nName the project UnityTest.\nSet the Location to Videos\\Unity so the project folder will be Videos\\Unity\\UnityTest.\nClick Create project and wait for Unity Editor to open." },
                { id: "unitytest-cube", kind: "tasks", title: "Step 2 - Add a Cube",
                    text: "In Unity Editor, find the Hierarchy window.\nRight-click inside the Hierarchy and select 3D Object > Cube.\nConfirm the Cube appears in your scene." },
                { id: "unitytest-scene", kind: "tasks", title: "Step 3 - Save Your Scene",
                    text: "Select File > Save As or Save Scene As.\nSave the scene as TestScene inside this project's Assets folder.\nConfirm TestScene appears in the Project window. The saved scene is Assets\\TestScene.unity.\nYour complete UnityTest project must include Assets, Packages and ProjectSettings; do not back up only the scene file." },
                { id: "unitytest-backup", kind: "tasks", title: "Step 4 - Check Your Google Drive Backup",
                    text: "Save your work and close Unity Editor.\nWait for Google Drive for desktop to finish syncing. Resolve any sync errors before relying on the backup.\nOpen Google Drive in your browser using your WHS school account.\nSelect Computers, choose the computer containing your backup, then open Videos > Unity > UnityTest.\nConfirm the essential project folders Assets, Packages and ProjectSettings are present, including Assets\\TestScene.unity." },
                { id: "unitytest-share", kind: "tasks", title: "Step 5 - Share Your Unity Project",
                    text: "In Google Drive, right-click the backed-up UnityTest folder and select Share.\nGive your teacher access using your school's sharing permissions.\nSelect Copy link and paste it into My Unity Test Project below.\nSubmit the folder link, not a screenshot, an individual scene file or a link to the local Google Drive virtual drive." },
                { id: "unitytest-success", kind: "text", numbered: false, title: "Success criteria",
                    text: "UnityTest is created using the required Unity Editor from Activity 2.\nTestScene is saved with a Cube.\nThe UnityTest folder is present in Google Drive.\nThe shared folder link is submitted successfully." },
                { ...(finalActivity.blocks || []).find((block) => block.id === "unitytest-project-link"),
                    id: "unitytest-project-link", kind: "studentlink", title: "My Unity Test Project",
                    text: "Paste the Google Drive share link to your complete backed-up UnityTest folder. Make sure your teacher can access it. This saves the link for teacher review; it does not verify the project contents or sharing permissions.",
                    required: true, driveOnly: true, driveFolderOnly: true },
                { id: "unitytest-return", kind: "text", numbered: false, title: "Optional reference - Returning to another computer",
                    text: "This reference is optional and is not required for Licence completion.\nIn your school Google Drive, open Computers > your backed-up computer > Videos > Unity > UnityTest. Download the complete UnityTest folder; if downloaded as a ZIP, extract it first.\nCopy the complete project into the new computer's Videos\\Unity folder. Confirm Assets, Packages and ProjectSettings are inside UnityTest.\nIn Unity Hub, select Add project from disk (or Open), choose Videos\\Unity\\UnityTest and open it with the required Editor version. Open TestScene from Assets.\nConfigure Videos backup on the new computer using Activity 4. Keep one current working copy and let syncing finish before changing computers." }
            ]
        };
    }
    return changed ? { ...content, activities } : content;
}

module.exports = { withUnityHubLicence };
