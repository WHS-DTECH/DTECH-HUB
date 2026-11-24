"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createBlueprintTeams } = require("../practical-skills/blueprint-teams");
const { presentationId, slideRequests, updateTeamSlide } = require("../practical-skills/blueprint-team-slide");
const B = require("../practical-skills/activity-blocks");

async function fixture(t, { onChange, updateSlides } = {}) {
    let teams = new Map(), members = new Map(), tail = Promise.resolve();
    const statements = [];
    const students = ["a", "b", "c", "d", "e"].map((id) => ({
        id, name: `Student ${id}`, email: `${id}@school.nz`, emails: [`${id}@school.nz`, `${id}-old@school.nz`],
        course: id === "e" ? "MiddleDTECH" : "JuniorDTECH", timetableClass: id === "d" ? "OTHER" : "JVE"
    }));
    const query = async (raw, params = []) => {
        const sql = raw.trim();
        statements.push(sql);
        if (sql.startsWith("CREATE TABLE")) return { rows: [] };
        if (sql.startsWith("SELECT * FROM practical_skills_blueprint_teams")) return { rows: teams.has(params[0]) ? [structuredClone(teams.get(params[0]))] : [] };
        if (sql.startsWith("SELECT * FROM practical_skills_blueprint_members")) return { rows: [...members.values()].filter((member) => member.team_id === params[0]).map((member) => structuredClone(member)) };
        if (sql.startsWith("SELECT team_id FROM practical_skills_blueprint_members")) {
            return { rows: [...members.values()].filter((member) => ["pending", "accepted"].includes(member.status) &&
                member.kit_id === params[0] && (sql.includes("student_email = $2")
                    ? member.student_email === params[1] && teams.get(member.team_id).school_year === params[2]
                    : member.course_instance === params[1] && member.student_key === params[2])).map((member) => ({ team_id: member.team_id })) };
        }
        if (sql.startsWith("SELECT id FROM practical_skills_blueprint_teams")) return { rows: [...teams.values()].filter((team) => team.school_year === params[1]).map(({ id }) => ({ id })) };
        if (sql.startsWith("INSERT INTO practical_skills_blueprint_teams")) {
            const [id, kit_id, course_instance, school_year, course, class_name, mode, building, email] = params;
            teams.set(id, { id, kit_id, course_instance, school_year, course, class_name, mode, building, version: 1, created_by: email });
            return { rows: [] };
        }
        if (sql.startsWith("INSERT INTO practical_skills_blueprint_members")) {
            const [team_id, kit_id, course_instance, student_key, student_email, student_name, status] = params;
            if ([...members.values()].some((member) => member.team_id !== team_id && member.kit_id === kit_id &&
                member.course_instance === course_instance && ["pending", "accepted"].includes(member.status) &&
                (member.student_key === student_key || member.student_email === student_email))) {
                throw Object.assign(new Error("Unique active membership violation"), { code: "23505" });
            }
            members.set(`${team_id}:${student_key}`, { team_id, kit_id, course_instance, student_key, student_email, student_name,
                status, area: "", contribution: "", acknowledgement_version: null });
            return { rows: [] };
        }
        if (sql.startsWith("UPDATE practical_skills_blueprint_teams")) {
            const team = teams.get(params[0]);
            team.building = params[1];
            team.version += 1;
            return { rows: [] };
        }
        if (sql.startsWith("UPDATE practical_skills_blueprint_members SET status = 'removed'")) {
            for (const member of members.values()) if (member.team_id === params[0] && ["pending", "accepted"].includes(member.status)) {
                Object.assign(member, { status: "removed", area: "", contribution: "", acknowledgement_version: null });
            }
            return { rows: [] };
        }
        if (sql.startsWith("UPDATE practical_skills_blueprint_members SET status = $3")) {
            Object.assign(members.get(`${params[0]}:${params[1]}`),
                { status: params[2], area: params[3], contribution: params[4], acknowledgement_version: params[5] });
            return { rows: [] };
        }
        throw new Error(`Unexpected query: ${sql}`);
    };
    const pool = { query, async connect() {
        let unlock, snapshot;
        return {
            async query(sql, params) {
                if (sql === "BEGIN") return { rows: [] };
                if (sql.includes("pg_advisory_xact_lock")) {
                    const previous = tail;
                    tail = new Promise((resolve) => { unlock = resolve; });
                    await previous;
                    snapshot = structuredClone([teams, members]);
                    return { rows: [] };
                }
                if (sql === "ROLLBACK") [teams, members] = snapshot;
                if (["COMMIT", "ROLLBACK"].includes(sql)) { unlock(); return { rows: [] }; }
                return query(sql, params);
            },
            release() {}
        };
    } };
    const deps = { pool, hasDatabase: true, getStudents: async () => students, onChange, updateSlides, now: () => new Date("2026-11-24T00:00:00Z"),
        normalizeEmail: (email) => String(email || "").trim().toLowerCase(), schoolDomain: "school.nz",
        getRequestUserEmail: (req) => req.headers["x-user-email"],
        requireAdminAccess: (req, res, next) => req.headers["x-user-email"] === "teacher@school.nz" ? next() : res.sendStatus(403),
        canReview: async (email) => email === "teacher@school.nz" };
    const service = createBlueprintTeams(deps);
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
        req.auth_identity = { verified: req.headers["x-verified"] !== "no", email: req.headers["x-identity-email"] || req.headers["x-user-email"] };
        next();
    });
    service.register(app);
    const server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const request = async (url = "", email = "a@school.nz", method = "GET", body, headers = {}) => {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/practical-skills/blueprint-team${url}`,
            { method, headers: { "Content-Type": "application/json", "x-user-email": email, ...headers }, body: body ? JSON.stringify(body) : undefined });
        return { status: response.status, body: await response.json() };
    };
    return { service, deps, students, request, statements, count: () => teams.size };
}

test("verified account and searchable class directory govern registration; size, duplicate and cross-class inputs are rejected", async (t) => {
    const f = await fixture(t);
    assert.equal((await f.request("", "a@school.nz", "GET", undefined, { "x-verified": "no" })).status, 401);
    assert.equal((await f.request("", "a@school.nz", "GET", undefined, { "x-identity-email": "b@school.nz" })).status, 401);
    assert.equal((await f.request(`/${"-".repeat(36)}/acknowledgement`, "a@school.nz", "PUT", { decision: "accept" })).status, 400);
    const peers = (await f.request("/students?q=Student")).body.students.map((student) => student.id);
    assert.deepEqual(peers, ["b", "c"]);
    const create = (teammateIds) => f.request("", "a@school.nz", "POST", { mode: "team", building: "Eiffel Tower", teammateIds });
    for (const ids of [["b", "c", "d"], ["a"], ["b", "b"], ["d"], ["e"], ["outsider@gmail.com"], "b"]) {
        assert.equal((await create(ids)).status, 400);
    }
    const saved = await create(["b", "c"]);
    assert.equal(saved.status, 200);
    assert.equal(saved.body.team.members.length, 3);
    assert.match(saved.body.team.id, /^[a-f0-9-]{36}$/);
    assert.equal(f.count(), 1);
    assert.equal((await create([])).status, 409);
    assert.equal((await f.request("", "b@school.nz")).body.team.id, saved.body.team.id);
    assert.equal((await f.request("", "b-old@school.nz")).body.team.id, saved.body.team.id, "Linked school-email aliases use the same student identity");
    assert.ok(f.statements.some((sql) => sql.includes("CREATE UNIQUE INDEX IF NOT EXISTS blueprint_one_active_student")));
});

test("each member acknowledges only themselves; peers do not block completion; decline frees membership and persists history", async (t) => {
    const f = await fixture(t);
    const team = (await f.request("", "a@school.nz", "POST", { mode: "team", building: "Notre-Dame", teammateIds: ["b", "c"] })).body.team;
    const path = `/${team.id}/acknowledgement`;
    const accept = { decision: "accept", version: 1, area: "Entrance", contribution: "I will build the doorway." };
    assert.equal((await f.request(path, "a@school.nz", "PUT", { ...accept, studentId: "b" })).status, 403);
    assert.equal((await f.request(path, "d@school.nz", "PUT", accept)).status, 403);
    assert.equal((await f.request(path, "a@school.nz", "PUT", { ...accept, contribution: " " })).status, 400);
    assert.equal((await f.service.getReadiness("a@school.nz")).passed, false);
    assert.equal((await f.request(path, "a@school.nz", "PUT", accept)).status, 200);
    assert.equal((await f.service.getReadiness("a@school.nz")).passed, true);
    assert.equal((await f.service.getReadiness("b@school.nz")).passed, false);
    const restarted = createBlueprintTeams(f.deps);
    assert.equal((await restarted.getReadiness("a-old@school.nz")).passed, true, "Reads persisted membership after module restart");
    assert.equal((await f.request(path, "b@school.nz", "PUT", { decision: "decline", version: 1 })).status, 200);
    assert.equal((await f.request("", "b@school.nz")).body.team, null);
    const independent = await f.request("", "b@school.nz", "POST", { mode: "independent", building: "Opera House", teammateIds: [] });
    assert.equal(independent.status, 200);
    assert.equal((await f.service.getReadiness("b@school.nz")).passed, true);
    assert.equal((await f.request("", "a@school.nz")).body.team.members.find((member) => member.id === "b").status, "declined");
});

test("concurrent invitations cannot create duplicate active membership or orphan teams; teacher changes require fresh acknowledgement", async (t) => {
    const f = await fixture(t);
    const results = await Promise.all([
        f.request("", "a@school.nz", "POST", { mode: "team", building: "Tower", teammateIds: ["b"] }),
        f.request("", "c@school.nz", "POST", { mode: "team", building: "Castle", teammateIds: ["b"] })
    ]);
    assert.deepEqual(results.map((result) => result.status).sort(), [200, 409]);
    assert.equal(f.count(), 1);
    const team = results.find((result) => result.status === 200).body.team;
    const owner = team.members.find((member) => member.id !== "b");
    await f.service.acknowledge(owner.email, team.id, { decision: "accept", version: 1, area: "Roof", contribution: "Build the pitched roof." });
    const corrected = await f.service.correct("teacher@school.nz", team.id,
        { version: 1, building: team.building, memberIds: ["a", "b", "c"] });
    assert.equal(corrected.version, 2);
    assert.ok(corrected.members.every((member) => member.status === "pending" && !member.contribution));
    assert.equal((await f.service.getReadiness(owner.email)).passed, false);
    await assert.rejects(f.service.acknowledge(owner.email, team.id,
        { decision: "accept", version: 1, area: "Roof", contribution: "Roof" }), /Membership changed/);
    await assert.rejects(f.service.correct("teacher@school.nz", team.id,
        { version: 2, building: team.building, memberIds: ["a", "b", "c", "d"] }), /at most three/);
    const closed = await f.service.correct("teacher@school.nz", team.id, { version: 2, building: team.building, memberIds: [] });
    assert.ok(closed.members.every((member) => member.status === "removed"));
    assert.equal((await f.request("", owner.email)).body.team, null);
    assert.equal((await f.request("", owner.email, "POST", { mode: "independent", building: "New building" })).status, 200);
});

test("team panel follows Step 2 for separate blocks and numbered lists; later activities show read-only shared summaries", () => {
    const context = vm.createContext({ window: { ActivityBlocks: B }, structuredClone });
    for (const file of ["activity-block-view.js", "blueprint-teams-view.js", "kit-worksheet-render.js"]) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "practical-skills", file), "utf8"), context);
    }
    const host = { style: { setProperty() {} }, innerHTML: "", querySelector: () => null, querySelectorAll: () => [] };
    const content = { bannerTitle: "The Blueprint Mission", blocks: [
        { id: "step-1", kind: "text", title: "Step 1: Choose a building", text: "Choose it." },
        { id: "step-2", kind: "tasks", title: "Step 2: Decide how you will build it", text: "Independent\nTeam" },
        { id: "step-3", kind: "text", title: "Step 3: Plan", text: "Draw plans." }
    ] };
    const render = (content) => context.window.KitWorksheetRender.renderWorksheet(host, content,
        { kitId: "kit-minecraft-builder-kit", readOnly: true });
    render(content);
    assert.match(host.innerHTML, /data-content-block="step-2"[\s\S]*data-blueprint-team[\s\S]*data-content-block="step-3"/);
    assert.equal((host.innerHTML.match(/data-blueprint-team /g) || []).length, 1);
    render({ ...content, blocks: [{ id: "steps", kind: "tasks", text: "Choose a building\nDecide how you will build it\nDraw the plan" }] });
    assert.match(host.innerHTML, /Decide how you will build it<section[\s\S]*data-blueprint-team[\s\S]*<\/section><\/li><li class="activity-block-text">Draw the plan/);
    for (const title of ["Build It Better", "Famous Building Challenge"]) {
        render({ ...content, bannerTitle: title });
        assert.equal((host.innerHTML.match(/data-blueprint-team /g) || []).length, 1);
    }
    render({ ...content, bannerTitle: "Another activity" });
    assert.doesNotMatch(host.innerHTML, /data-blueprint-team/);
});

test("saving own team details recalculates completion after persistence without waiting for other members", async (t) => {
    let f;
    let confirmed = false;
    f = await fixture(t, { onChange: async (_req, email) => {
        const ready = await f.service.getReadiness(email);
        return { completedActivities: confirmed && ready.passed ? { 0: "2026-11-24" } : {} };
    } });
    const saved = await f.request("", "a@school.nz", "POST", { mode: "team", building: "Tower", teammateIds: ["b"] });
    assert.deepEqual(saved.body.completedActivities, {});
    confirmed = true;
    const accepted = await f.request(`/${saved.body.team.id}/acknowledgement`, "a@school.nz", "PUT",
        { decision: "accept", version: 1, area: "Roof", contribution: "Build the roof." });
    assert.equal(accepted.body.completedActivities[0], "2026-11-24");
    assert.equal((await f.service.getReadiness("b@school.nz")).passed, false);
});

test("storyboard instructions add three required links and confirmation without replacing existing evidence IDs", () => {
    const original = { worksheets: [{ activity: "The Blueprint Mission" }, { activity: "Famous Building Challenge" }],
        activities: [{ blocks: [{ id: "original", kind: "studentlink" }] }, { completionMode: "auto", uniqueDocumentLinks: true, noGoogleLinks: true, taskBrief: { evidenceRequired: "Two links" }, blocks: [
            { id: "steps", kind: "tasks", title: "Your steps", text: "Old instructions" },
            { id: "team", kind: "text", title: "Working in a team?", text: "Old instructions" },
            { id: "video", kind: "studentlink", title: "Minecraft video walkthrough share link", driveOnly: true, required: true },
            { id: "world", kind: "studentlink", title: "Minecraft world share link", driveOnly: true, required: true }
        ] }] };
    const content = B.withFilesFoldersLinks(original, "kit-minecraft-builder-kit");
    const activity = content.activities[1];
    assert.equal(B.withFilesFoldersLinks(content, "kit-minecraft-builder-kit"), content);
    assert.deepEqual(activity.blocks.map((block) => block.id), ["steps", "team", B.STORYBOARD_LINK_ID, B.STORYBOARD_CONFIRM_ID, "video", "world"]);
    assert.match(activity.blocks[0].text, /screenshots[\s\S]*storyboard[\s\S]*\.mcworld/);
    const view = { window: { ActivityBlocks: B } };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../practical-skills/activity-block-view.js"), "utf8"), view);
    const html = view.window.ActivityBlockView.markup(activity.blocks, {}, false);
    assert.match(html, /<strong>Prepare your building:<\/strong>/);
    assert.match(html, /<strong>Submit your evidence:<\/strong>/);
    assert.match(activity.blocks[1].text, /Every team member must submit all three links/);
    assert.match(activity.taskBrief.evidenceRequired, /three Google Drive share links/);
    B.validate(activity);
    const answers = { [B.STORYBOARD_LINK_ID]: "https://docs.google.com/presentation/d/shared/edit",
        video: "https://drive.google.com/file/d/shared-video/view",
        world: "https://drive.google.com/file/d/shared-world/view", [B.STORYBOARD_CONFIRM_ID]: true };
    const grade = () => B.grade(activity, answers, {}, { content, index: 1, responses: {
        "0-blocks": { original: answers[B.STORYBOARD_LINK_ID] }, "1-blocks": answers } });
    assert.equal(grade().passed, true);
    for (const id of [B.STORYBOARD_LINK_ID, "video", "world", B.STORYBOARD_CONFIRM_ID]) {
        const saved = answers[id];
        delete answers[id];
        assert.equal(grade().passed, false, `${id} is required`);
        answers[id] = saved;
    }
});

test("storyboard prefill uses only the submitted current slideshow and preserves existing answers", () => {
    const content = { activities: [{ documentCheck: B.BLUEPRINT_REVIEW_POLICY, blocks: [] }, { blocks: [] }] };
    const link = "https://docs.google.com/presentation/d/shared/edit";
    const responses = { "0-blocks": { "blueprint-slideshow-link": link }, "1-blocks": {} };
    assert.deepEqual(B.storyboardPrefill(content, 1, responses, null), { link: "", prefilled: false });
    assert.deepEqual(B.storyboardPrefill(content, 1, responses, { documentKey: "different" }), { link: "", prefilled: false });
    const submission = { documentKey: B.documentLinkKey(link) };
    assert.deepEqual(B.storyboardPrefill(content, 1, responses, submission), { link, prefilled: true });
    responses["1-blocks"][B.STORYBOARD_LINK_ID] = "https://drive.google.com/file/d/other/view";
    assert.deepEqual(B.storyboardPrefill(content, 1, responses, submission), { link, prefilled: false });
    assert.match(responses["1-blocks"][B.STORYBOARD_LINK_ID], /other/);
});

test("slide updates require a verified active member", async (t) => {
    const calls = [];
    const f = await fixture(t, { updateSlides: async (_req, email, team) => { calls.push({ email, team }); return { updated: 1 }; } });
    await f.service.registerTeam("a@school.nz", { mode: "team", teammateIds: ["b"], building: "Tower" });
    assert.equal((await f.request("/slides", "a@school.nz", "POST", {}, { "x-verified": "no" })).status, 401);
    assert.equal((await f.request("/slides", "c@school.nz", "POST", {})).status, 409);
    assert.equal((await f.request("/slides", "b-old@school.nz", "POST", {})).status, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].team.building, "Tower");
});

test("team slide refresh serializes with contribution changes and a decline refreshes the old team", async (t) => {
    let started, release;
    const entered = new Promise((resolve) => { started = resolve; });
    const paused = new Promise((resolve) => { release = resolve; });
    const seen = [];
    const f = await fixture(t, { updateSlides: async (_req, _email, team) => {
        seen.push(team);
        if (seen.length === 1) { started(); await paused; }
        return { updated: 1, total: 1, failures: [] };
    } });
    const team = await f.service.registerTeam("a@school.nz", { mode: "team", teammateIds: ["b"], building: "Tower" });
    const sync = f.request("/slides", "a@school.nz", "POST", {});
    await entered;
    const acknowledgement = f.request(`/${team.id}/acknowledgement`, "b@school.nz", "PUT",
        { decision: "accept", version: team.version, area: "Roof", contribution: "Build roof" });
    release();
    assert.equal((await sync).status, 200);
    assert.equal((await acknowledgement).status, 200);
    const declined = await f.request(`/${team.id}/acknowledgement`, "b@school.nz", "PUT",
        { decision: "decline", version: team.version, driveAccessToken: "token" });
    assert.equal(declined.status, 200);
    assert.match(declined.body.slideStatus, /up to date/);
    assert.equal(seen[1].members.find((member) => member.id === "b").status, "declined");
});

test("team slide updates only its managed objects, excludes unconfirmed members and emails, and checks edit permission", async () => {
    const team = { id: "a7e2561b-001c-4017-9e03-bc1775c5a7b2", mode: "team", version: 1, building: "A Tower",
        members: [{ name: "Ana", email: "private@school.nz", status: "accepted", acknowledgementVersion: 1,
            area: "Roof", contribution: "Build the roof; contact private@school.nz" },
        { name: "Ben", email: "other@school.nz", status: "pending", area: "", contribution: "" }] };
    const created = slideRequests({ slides: [{ objectId: "student_page" }] }, team);
    assert.equal(created[0].createSlide.slideLayoutReference.predefinedLayout, "BLANK");
    const slideId = created[0].createSlide.objectId, shapeId = created[1].createShape.objectId;
    const text = created[2].insertText.text;
    assert.match(text, /Our Building Team[\s\S]*A Tower[\s\S]*Ana[\s\S]*Roof[\s\S]*Build the roof/);
    assert.doesNotMatch(text, /school\.nz|Ben/);
    const presentation = { revisionId: "rev", slides: [{ objectId: "student_page" }, { objectId: slideId, pageElements: [
        { objectId: shapeId, shape: { text: { textElements: [{ textRun: { content: `${text}\n` } }] } } },
        { objectId: "student_element" }
    ] }] };
    assert.deepEqual(slideRequests(presentation, team), []);
    assert.throws(() => slideRequests({ slides: [{ objectId: "manual", pageElements: [
        { shape: { text: { textElements: [{ textRun: { content: "Our Building Team\n" } }] } } }
    ] }] }, team), /Update it manually/);
    team.members[0].contribution = "Build the roof and tower";
    const changed = slideRequests(presentation, team);
    assert.deepEqual(changed.map((request) => Object.keys(request)[0]), ["deleteText", "insertText"]);
    assert.equal(changed[0].deleteText.objectId, shapeId, "Never delete a student slide or shape");
    let writes = 0;
    const deps = { team, fileId: "slides", token: "token",
        driveApiRequest: async () => ({ mimeType: "application/vnd.google-apps.presentation", capabilities: { canEdit: false } }),
        googleSlidesApiRequest: async () => presentation,
        googleSlidesApiBatchUpdate: async (_id, requests, _token, revision) => { writes++; assert.equal(revision, "rev"); assert.deepEqual(requests, changed); } };
    await assert.rejects(updateTeamSlide(deps), /Editor access/);
    assert.equal(writes, 0);
    deps.driveApiRequest = async () => ({ mimeType: "application/vnd.google-apps.presentation", capabilities: { canEdit: true } });
    assert.deepEqual(await updateTeamSlide(deps), { updated: true });
    assert.equal(writes, 1);
    deps.googleSlidesApiBatchUpdate = async () => { throw new Error("Google update failed"); };
    await assert.rejects(updateTeamSlide(deps), /Google update failed/, "Never claim success after failed Google writes");
    assert.equal(presentationId("https://docs.google.com/presentation/d/abc-123/edit"), "abc-123");
    assert.equal(presentationId("https://drive.google.com/file/d/abc-123/view"), "abc-123");
    assert.equal(presentationId("https://drive.google.com/open?id=abc-123"), "abc-123");
    assert.equal(presentationId("https://docs.google.com.evil.example/presentation/d/abc/edit"), "");
});
