"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
const start = source.indexOf('app.post("/api/student/drive-setup/copy-template"');
const end = source.indexOf('app.post("/api/student/drive-setup/create-client-presentation"', start);

for (const location of ["current", "legacy", "new"]) {
    test(`Testing template ${location}: populate only a newly created copy, never existing student evidence`, async () => {
        let route;
        let copies = 0;
        let populations = 0;
        let sourceReads = 0;
        const recorded = [];
        const originalText = "Student's edited testing requirements and observations";
        let studentText = originalText;
        const file = { id: "student-slides", name: "Testing Functions - Student",
            webViewLink: "https://docs.google.com/presentation/d/student-slides/edit" };
        const ctx = vm.createContext({
            app: { post(_path, handler) { route = handler; } },
            normalizeEmail: (value) => value, getRequestUserEmail: () => "student@school.nz",
            getStudentTaskListDriveFolder: async () => ({ folderId: "process", folderName: "Process Assessment" }),
            buildDriveFolderUrlFromId: (id) => `https://drive.google.com/drive/folders/${id}`,
            driveEnsureAnyoneEditorPermission: async () => {},
            resolveProcessAssessmentSubfolderName: () => "Testing Functions",
            driveEnsureFolder: async () => ({ id: "testing-folder" }),
            driveFindTemplateInFolder: async (folder) =>
                (location === "current" && folder === "testing-folder") ||
                (location === "legacy" && folder === "process") ? [file] : [],
            driveCopyFile: async () => { copies++; return file; },
            googleSlidesApiRequest: async () => { sourceReads++; return {}; },
            extractGoogleSlidesMustDos: () => ["Original source requirement"],
            populateTestingFunctionsMustDos: async () => {
                populations++;
                studentText = "Original source requirement";
                return { updated: true, count: 1 };
            },
            ensureProjectInterestGoogleDriveFolderEvidence: async () => {},
            recordTemplateCopyInDb: async (_activity, _email, entry) => { recorded.push(entry); },
            hasDatabase: true
        });
        assert.ok(start >= 0 && end > start);
        vm.runInContext(source.slice(start, end), ctx);
        const request = { body: {
            driveAccessToken: "test-token", templateTitle: "Testing Functions", templateId: "testing-functions",
            templateFileId: "template-id-123456789012345", activityId: "assessment",
            sourcePresentationId: "source-slides"
        } };
        let payload;
        const res = {
            status(code) { assert.fail(`Unexpected HTTP ${code}`); },
            json(value) { payload = value; return this; }
        };
        await route(request, res);
        assert.equal(payload.alreadyExists, location !== "new");
        assert.equal(copies, location === "new" ? 1 : 0);
        assert.equal(populations, location === "new" ? 1 : 0);
        assert.equal(sourceReads, location === "new" ? 1 : 0);
        assert.equal(studentText, location === "new" ? "Original source requirement" : originalText);
        assert.equal(recorded[0].fileUrl, file.webViewLink, "Keep the teacher's saved evidence link");
        assert.equal(payload.fileId, file.id);
        if (location !== "new") {
            await route(request, res);
            assert.equal(populations, 0, "A fresh request on another day still cannot repopulate the slides");
            assert.equal(studentText, originalText);
        }
    });
}
