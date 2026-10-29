"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
const start = source.indexOf("function renderHubAuthUi()");
const end = source.indexOf("\nasync function fetchGoogleUserProfile(", start);

test("Upload and kit editing links follow view mode as well as permissions on every auth render", () => {
    let signedIn = true;
    let mode = "student";
    let teacherPath = false;
    const nodes = {};
    for (const name of ["hubSignInButton", "hubStartupSignInBanner", "hubSignOutButton",
        "hubUserBadge", "hubStaffLink", "hubTeacherDashboardLink", "hubAdminLink",
        "hubUploadKitsLink", "hubTeacherReviewLink", "hubLicenceSetupLink",
        "worksheetLicenceSetupLink", "hubSettingsLink", "hubUploadMenu",
        "hubStudentWorkMenu", "hubPracticalSkillsMenu", "hubSeniorTaskListLink",
        "hubAccessBadge", "hubBrowseMenu"]) {
        nodes[name] = { hidden: true, open: false };
    }
    const noop = () => {};
    const context = vm.createContext({
        ...nodes, hubBrowseButtons: [], hubUnitPlansButtons: [], hubCourseOutlinesButtons: [],
        hubAuthState: { profile: {} },
        hubAccessState: { canTeacherView: true, canAdmin: true, resolved: true },
        hasAllowedSignedInHubAccount: () => signedIn,
        isTeacherWorkspacePath: () => teacherPath,
        writeStoredHubViewMode: (value) => { mode = value; },
        getEffectiveHubViewMode: () => mode,
        isHomepagePath: () => false,
        getHubUserInitials: () => "AB", getHubDisplayName: () => "Test",
        document: { querySelector: () => null },
        window: { dispatchEvent: noop }, CustomEvent: function () {},
        renderHubDriveSyncButton: noop, routeHubCourseHomepage: noop,
        refreshTemplateLibraryAccessUi: noop, renderGlobalHubSidebar: noop,
        renderInternalDeadlineCard: noop, setPublicHomepageUiState: noop,
        setHubProfileOpen: noop, renderCurrentWeek: noop, populateHubProfilePanel: noop
    });
    vm.runInContext(source.slice(start, end), context);
    const adminTools = ["hubTeacherDashboardLink", "hubUploadKitsLink",
        "hubLicenceSetupLink", "worksheetLicenceSetupLink"];
    const check = (uploadVisible, adminVisible) => {
        context.renderHubAuthUi();
        assert.equal(nodes.hubUploadMenu.hidden, !uploadVisible);
        for (const name of adminTools) assert.equal(nodes[name].hidden, !adminVisible, name);
    };
    check(false, false);
    assert.equal(nodes.hubStaffLink.hidden, false, "Staff can still switch back to Teacher View");
    mode = "teacher";
    check(true, true);
    nodes.hubUploadMenu.open = true;
    mode = "student";
    check(false, false);
    assert.equal(nodes.hubUploadMenu.open, false, "Switching view closes the Upload menu");
    context.hubAccessState.canAdmin = false;
    mode = "teacher";
    check(true, false);
    context.hubAccessState.canTeacherView = false;
    check(false, false);
    context.hubAccessState.canAdmin = true;
    check(true, true);
    signedIn = false;
    check(false, false);
    signedIn = true;
    mode = "student";
    teacherPath = true;
    check(true, true);
});
