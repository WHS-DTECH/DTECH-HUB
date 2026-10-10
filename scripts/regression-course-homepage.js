"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
const start = source.indexOf("function routeHubCourseHomepage(");
const end = source.indexOf("\nfunction updateSidebarCourseSections(", start);
let signedIn = true;
let mode = "student";
const brand = { href: "" };
let redirected = "";
const context = vm.createContext({
    hasAllowedSignedInHubAccount: () => signedIn,
    getEffectiveHubViewMode: () => mode,
    hubAccessState: { resolved: true, canTeacherView: true, canAdmin: true },
    document: { querySelector: () => brand },
    window: { location: { pathname: "/index.html", replace: (destination) => { redirected = destination; } } }
});
vm.runInContext(source.slice(start, end), context);
for (const entry of ["/", "/index.html"]) {
    for (const course of ["JuniorDTECH", "MiddleDTECH", "SeniorDTECH", "", "invalid"]) {
        context.window.location.pathname = entry;
        redirected = "";
        context.routeHubCourseHomepage(course);
        const younger = ["JuniorDTECH", "MiddleDTECH"].includes(course);
        assert.equal(redirected, younger ? "/learning-pathways/" : "");
        assert.equal(brand.href, younger ? "/learning-pathways/" : "/index.html");
    }
}
for (const entry of ["/learning-pathways/", "/learning-pathways/index.html"]) {
    for (const course of ["JuniorDTECH", "MiddleDTECH", "SeniorDTECH", ""]) {
        context.window.location.pathname = entry;
        redirected = "";
        context.routeHubCourseHomepage(course);
        assert.equal(redirected, course === "SeniorDTECH" ? "/index.html" : "", "Correct home stays put without redirect loops");
    }
}
for (const entry of ["/admin-menu.html", "/practical-skills/admin.html", "/teacher-view.html",
    "/practical-skills/", "/practical-skills/index.html", "/learning-pathways/web.html", "/task-list.html"]) {
    context.window.location.pathname = entry;
    redirected = "";
    context.routeHubCourseHomepage("JuniorDTECH");
    assert.equal(redirected, "", "Deep links and admin/teacher pages are not redirected");
}
context.window.location.pathname = "/index.html";
for (const guard of ["signed-out", "teacher", "access-pending"]) {
    signedIn = guard !== "signed-out";
    mode = guard === "teacher" ? "teacher" : "student";
    context.hubAccessState.resolved = guard !== "access-pending";
    redirected = "";
    context.routeHubCourseHomepage("JuniorDTECH");
    assert.equal(redirected, "", "Do not redirect signed-out, teacher or unresolved access");
}
signedIn = true;
mode = "student";
context.hubAccessState.resolved = true;
context.routeHubCourseHomepage("MiddleDTECH");
assert.equal(redirected, "/learning-pathways/", "Resolving access after reload routes saved course");
mode = "teacher";
context.hubAccessState.canTeacherView = false;
context.hubAccessState.canAdmin = false;
redirected = "";
context.routeHubCourseHomepage("JuniorDTECH");
assert.equal(redirected, "/learning-pathways/", "A student cannot inherit a previous staff member's Teacher View");
assert.match(source, /updateSidebarCourseSections\(panel, data\.course\);\s*routeHubCourseHomepage\(data\.course\);/);
const homeStart = source.indexOf("function isHomepagePath()");
const homeEnd = source.indexOf("\nfunction isTeacherWorkspacePath()", homeStart);
context.window.location.pathname = "/learning-pathways/index.html";
vm.runInContext(source.slice(homeStart, homeEnd), context);
assert.equal(context.isHomepagePath(), false, "Pathways is not treated as the senior activity homepage");
console.log("Course-aware homepage routing regressions passed.");
