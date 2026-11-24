"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createKitPublication } = require("../practical-skills/kit-publication");
const { createMinecraftPrerequisite } = require("../practical-skills/minecraft-prerequisite");

test("Minecraft prerequisite locks Builder and pauses only students with a saved Blueprint slideshow", async (t) => {
    const builder = "kit-minecraft-builder-kit";
    const player = "kit-minecraft";
    const progress = new Map([
        ["student", [{ kit_id: builder, responses: { "1-blocks": { "another-link": "https://example.test/" } } }]],
        ["legacy", [{ kit_id: player, responses: { "3-blocks": { "blueprint-slideshow-link": "https://example.test/slides" } } }]],
        ["staff", [{ kit_id: builder, responses: { "1-blocks": { "blueprint-slideshow-link": "https://example.test/slides" } } }]]
    ]);
    const policy = createMinecraftPrerequisite({
        getVerifiedEmail: (req) => req.headers["x-verified-test-account"],
        getProgress: async (account) => progress.get(account) || [],
        isStaff: async (account) => account === "staff"
    });
    const app = express();
    policy.register(app);
    app.use(policy.gate);
    app.use((_req, res) => res.sendStatus(204));
    const server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const request = (path, account, method = "GET") => fetch(`http://127.0.0.1:${server.address().port}/api/${path}`, {
        method, headers: account ? { "x-verified-test-account": account } : { "x-user-email": "staff" }
    });
    const builderContent = `practical-skills/kit-content/${builder}`;
    const status = "practical-skills/minecraft-access";
    assert.equal((await request(builderContent)).status, 401);
    assert.equal((await request(builderContent + "?preview=1", "student")).status, 403);
    assert.equal((await request(`practical-skills/blocks/${builder}/1/submit`, "student", "POST")).status, 403);
    assert.equal((await request("practical-skills/blueprint-team", "student")).status, 403);
    assert.equal((await request("knowledge-web/clouds", "student")).status, 204, "An unrelated link does not pause the Hub");
    progress.set("student", [{ kit_id: builder, responses: { "1-blocks": {
        "blueprint-slideshow-link": "https://docs.google.com/presentation/d/example/edit"
    } } }]);
    const paused = await request(status, "student");
    assert.equal(paused.headers.get("cache-control"), "private, no-store");
    const notice = await paused.json();
    assert.equal(notice.hubPaused, true);
    assert.match(notice.playerUrl, /kit=kit-minecraft$/);
    assert.equal((await (await request("knowledge-web/clouds", "student")).json()).code, "minecraft-hub-paused");
    assert.equal((await (await request(status, "legacy")).json()).hubPaused, true);
    assert.equal((await request("practical-skills/my-progress", "student")).status, 204);
    assert.equal((await request(`practical-skills/progress/${player}/complete`, "student", "POST")).status, 204);
    assert.equal((await request("student/login-drive-setup", "student", "POST")).status, 204);
    assert.equal((await request(builderContent, "staff")).status, 204);
    assert.equal((await (await request(status, "staff")).json()).hubPaused, false);
    progress.get("student").push({ kit_id: player, completed: true });
    assert.equal((await request(builderContent, "student")).status, 204);
    assert.equal((await request("practical-skills/blueprint-team", "student")).status, 204);
    assert.equal((await request("knowledge-web/clouds", "student")).status, 204);
    assert.equal((await (await request(status, "student")).json()).hubPaused, false);
});

async function fixture(t) {
    const saved = [
        { kit_id: "kit-minecraft", content: { bannerTitle: "Minecraft", identity: { skillArea: "Application Kits", application: "Minecraft" }, worksheets: [{ activity: "Build" }] } },
        { kit_id: "kit-files", content: { identity: { name: "Files & Folders", status: "planning" }, worksheets: [{}] } },
        { kit_id: "kit-deleted", content: { deletedAt: "2026-10-20", worksheets: [{}] } }
    ];
    const flags = new Map();
    const rows = ["a", "b", "unrelated"].map((name) => ({ student_email: `${name}@school.nz`, completed: true, completed_at: "2026-10-20T00:00:00.000Z",
        completed_activities: { "0": "2026-10-20" }, certificate_emailed_at: "2026-10-20", responses: { answer: "Keep me" } }));
    const queries = [], audits = [];
    let failUpdate = false;
    let snapshot;
    const query = async (sql, params) => {
        queries.push({ sql, params });
        if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(sql)) {
            if (sql === "BEGIN") snapshot = structuredClone(rows);
            if (sql === "ROLLBACK") rows.splice(0, rows.length, ...snapshot);
            return { rows: [] };
        }
        if (sql.startsWith("CREATE TABLE") || sql.startsWith("ALTER TABLE")) return { rows: [] };
        if (sql === "SELECT kit_id, content FROM practical_skills_kit_content") return { rows: saved };
        if (sql === "SELECT kit_id, live FROM practical_skills_kit_publication") return { rows: [...flags].map(([kit_id, live]) => ({ kit_id, live })) };
        if (sql.includes("INSERT INTO practical_skills_kit_publication")) { flags.set(params[0], params[1]); return { rows: [] }; }
        if (sql.includes("pg_advisory_xact_lock")) return { rows: [] };
        if (sql.includes("SELECT * FROM practical_skills_progress")) return { rows: rows.filter((row) => params[1].includes(row.student_email)) };
        if (sql.includes("INSERT INTO practical_skills_kit_resets")) { audits.push(params); return { rows: [] }; }
        if (sql.startsWith("UPDATE practical_skills_progress")) {
            if (failUpdate) throw new Error("Update failed");
            const selected = rows.filter((row) => params[1].includes(row.student_email));
            for (const row of selected) {
                Object.assign(row, { completed: false, completed_at: null, completed_activities: {}, certificate_emailed_at: null });
                if (sql.includes("certificate_revoked_at=NOW()")) row.certificate_revoked_at = "2026-10-21";
            }
            return { rows: selected };
        }
        throw new Error(`Unexpected query: ${sql}`);
    };
    const pool = { query, connect: async () => ({ query, release() { queries.push({ sql: "RELEASE" }); } }) };
    const deps = { pool, builtIns: [{ id: "kit-minecraft" }], getDefaultContent: () => ({}), schoolDomain: "school.nz",
        getRequestUserEmail: (req) => req.headers?.["x-admin"] === "yes" ? "teacher@school.nz" : "student@school.nz",
        getVerifiedEmail: (req) => req.headers?.["x-verified-email"] ?? (req.headers?.["x-admin"] === "yes" ? "teacher@school.nz" : ""),
        getStudentCourse: async (email) => ({ junior: "JuniorDTECH", middle: "MiddleDTECH", senior: "SeniorDTECH" })[email.split("@")[0]] || "",
        canManage: async (email) => email === "teacher@school.nz" };
    const service = createKitPublication(deps);
    const app = express();
    app.use(express.json());
    service.register(app, (req, res, next) => req.headers["x-admin"] === "yes" ? next() : res.status(403).json({ error: "Admin required" }));
    app.use(service.gate);
    app.get("/practical-skills/library.json", service.requireLibraryAccess, (_req, res) => res.json([]));
    app.all(/^\/api\/practical-skills\//, (_req, res) => res.json({ reached: true, readOnly: res.locals.kitPreview === true }));
    const server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
    const base = `http://127.0.0.1:${server.address().port}`;
    return { service, deps, rows, audits, queries, saved, flags, failUpdate: () => { failUpdate = true; },
        call: (url, method = "GET", body, admin = true, headers = {}) => fetch(base + url, {
            method, headers: { "Content-Type": "application/json", ...(admin ? { "x-admin": "yes" } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined
        }) };
}

test("Unity category is available from the saved catalogue before opening the worksheet", async (t) => {
    const f = await fixture(t);
    const content = { identity: { name: "Unity Setup kit", skillArea: "Skill Kits" },
        worksheets: [{ activity: "Unity Hub & Licence" }], activities: [{}] };
    f.saved.push({ kit_id: "kit-unity-setup", content });
    const catalog = await f.service.catalog();
    assert.equal(catalog.find((kit) => kit.id === "kit-unity-setup").skillArea, "Application Setups");
    assert.equal(content.identity.skillArea, "Skill Kits", "Reading the catalogue does not mutate stored objects");
});

test("teacher catalog includes database kits without requiring custom marker or prior library navigation; flags survive fresh services", async (t) => {
    const f = await fixture(t);
    const snapshot = { kits: [{ id: "kit-minecraft", isComplete: true }, { id: "kit-files", isComplete: false }], totalPoints: 100 };
    const teacher = f.service.filterSnapshot(snapshot, await f.service.visibleKits({ headers: { "x-admin": "yes" } }, { includePreviews: true }), true);
    assert.deepEqual(teacher.licenceKits.map((kit) => kit.id), ["kit-minecraft", "kit-files"]);
    assert.equal(teacher.licenceKits[1].live, false);
    assert.equal(teacher.licenceKits[0].skillArea, "Application Kits");
    assert.equal(teacher.licenceKits[0].application, "Minecraft");
    assert.equal(teacher.stampTotalKits, 2);
    assert.equal(f.service.filterSnapshot(snapshot, await f.service.visibleKits({})).stampTotalKits, 1);
    assert.equal(teacher.totalPoints, 100);
    await f.service.setLive("kit-minecraft", false, "teacher@school.nz");
    assert.equal(await createKitPublication(f.deps).available("kit-minecraft"), false);
    f.saved[0].content = { bannerTitle: "Edited in an old builder" };
    assert.equal(await f.service.available("kit-minecraft"), false, "Editing kit content cannot silently republish it");
    assert.equal(f.service.filterSnapshot(snapshot, await f.service.visibleKits({})).licenceKits.length, 0);
});

test("Unity and other restricted kits only appear and open for verified Middle/Senior students and staff", async (t) => {
    const f = await fixture(t);
    const content = { identity: { name: "Unity Setup Kit" } };
    f.saved.push({ kit_id: "kit-unity-setup", content },
        { kit_id: "kit-example", content: { identity: { studentAudience: "middle-senior" } } });
    const kits = [{ id: "kit-unity-setup", isComplete: true }];
    for (const [user, allowed, status] of [["junior", false, 403], ["unknown", false, 403],
        ["middle", true, 200], ["senior", true, 200], ["teacher", true, 200], ["", false, 401]]) {
        const headers = user ? { "x-verified-email": `${user}@school.nz` } : { "x-user-email": "teacher@school.nz" };
        const snapshot = f.service.filterSnapshot({ kits }, await f.service.visibleKits({ headers }));
        assert.equal(snapshot.kits.some((kit) => kit.id === "kit-unity-setup"), allowed, user);
        assert.equal(snapshot.stampCompletedCount, allowed ? 1 : 0, user);
        assert.equal(snapshot.stampTotalKits, allowed ? 3 : 1, user);
        for (const [url, method] of [
            ["/kit-content/kit-unity-setup", "GET"],
            ["/progress/kit-unity-setup/certificate.pdf", "GET"],
            ["/blocks/kit-unity-setup/0/licences/unity-school-licence", "GET"],
            ["/kit-content/kit-example", "GET"],
            ["/progress/kit-unity-setup/complete", "POST"]
        ]) assert.equal((await f.call(`/api/practical-skills${url}`, method, undefined, false, headers)).status, status, `${user}: ${url}`);
        assert.equal((await f.call("/practical-skills/library.json", "GET", undefined, false, headers)).status,
            user === "teacher" ? 200 : user ? 403 : 401);
    }
    content.identity.studentAudience = "all";
    assert.equal((await f.call("/api/practical-skills/kit-content/kit-unity-setup", "GET", undefined, false,
        { "x-verified-email": "junior@school.nz" })).status, 200);
});

test("staff see restricted and Not Live kits in Teacher View, but Student View follows their selected course", async (t) => {
    const f = await fixture(t);
    f.saved.push({ kit_id: "kit-unity-setup", content: { identity: { name: "Unity Setup Kit" } } });
    const service = createKitPublication({ ...f.deps, getStudentCourse: async () => "JuniorDTECH" });
    const teacher = { headers: { "x-admin": "yes" } };
    const all = await service.visibleKits(teacher, { includePreviews: true });
    assert.ok(all.some((kit) => kit.id === "kit-unity-setup"));
    assert.ok(all.some((kit) => kit.id === "kit-files" && !kit.live));
    const juniorPreview = await service.visibleKits(teacher, { studentView: true });
    assert.deepEqual(juniorPreview.map((kit) => kit.id), ["kit-minecraft", "kit-typing"]);
    const middlePreview = await createKitPublication({ ...f.deps, getStudentCourse: async () => "MiddleDTECH" })
        .visibleKits(teacher, { studentView: true });
    assert.ok(middlePreview.some((kit) => kit.id === "kit-unity-setup"));
    assert.ok(middlePreview.every((kit) => kit.live));
    const junior = await service.visibleKits({ headers: { "x-verified-email": "junior@school.nz" } }, { includePreviews: true });
    assert.deepEqual(junior.map((kit) => kit.id), ["kit-minecraft", "kit-typing"]);
});

test("Typing publication persists, blocks student reads and all paused writes, and leaves stamp counts unchanged", async (t) => {
    const f = await fixture(t);
    assert.equal(await f.service.available("kit-typing"), true, "Existing access stays Live until explicitly changed");
    const catalog = await (await f.call("/api/admin/kit-publication")).json();
    assert.equal(catalog.kits.find((kit) => kit.id === "kit-typing").title, "Typing Kit");
    assert.equal((await f.call("/api/admin/kit-publication/kit-typing", "PUT", { live: false }, false)).status, 403);
    assert.equal((await f.call("/api/admin/kit-publication/kit-typing", "PUT", { live: false })).status, 200);
    assert.equal(await createKitPublication(f.deps).available("kit-typing"), false);
    assert.equal((await f.call("/api/practical-skills/typing-kit", "GET", undefined, false)).status, 403);
    for (const admin of [true, false]) {
        for (const [route, method] of [["/attempts", "POST"], ["/settings", "PUT"]]) {
            assert.equal((await f.call(`/api/practical-skills/typing-kit${route}`, method, {}, admin)).status, 403);
        }
    }
    assert.equal((await (await f.call("/api/practical-skills/typing-kit")).json()).readOnly, true);
    const snapshot = f.service.filterSnapshot({ kits: [{ id: "kit-minecraft", isComplete: true }] },
        await f.service.visibleKits({ headers: { "x-admin": "yes" } }, { includePreviews: true }), true);
    assert.equal(snapshot.typingKit.live, false);
    assert.equal(snapshot.stampTotalKits, 2);
    assert.equal(snapshot.stampCompletedCount, 1);
    assert.equal(snapshot.licenceKits.some((kit) => kit.id === "kit-typing"), false);
    assert.equal((await f.call("/api/admin/kit-publication/kit-typing", "PUT", { live: true })).status, 200);
    assert.equal((await f.call("/api/practical-skills/typing-kit", "GET", undefined, false)).status, 200);
    assert.equal((await f.call("/api/practical-skills/typing-kit/attempts", "POST", {})).status, 200);
    assert.equal(f.queries.some(({ sql }) => /DELETE.*typing_kit|UPDATE typing_kit_attempts/.test(sql)), false);
});

test("both teacher library routes require teacher access and hide paused Typing", async () => {
    const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
    const requireLibraryAccess = () => {};
    for (const route of ["/practical-skills/library.json", "/api/practical-skills/library"]) {
        const start = source.indexOf(`app.get("${route}"`);
        const end = source.indexOf("\n});", start) + 4;
        const handlers = new Map();
        let live = false;
        const context = vm.createContext({
            app: { get(name, access, handler) { assert.equal(access, requireLibraryAccess); handlers.set(name, handler); } },
            kitPublication: { requireLibraryAccess, catalog: async () => [{ id: "kit-typing", live }] },
            ensureCustomPracticalSkillsKitsLoaded: async () => {},
            readPracticalSkillsLibraryFile: async () => [{ id: "kit-typing" }, { id: "unrelated-resource" }],
            getPracticalSkillsKitDefinition: () => null,
            buildPracticalSkillsActivityLibraryCards: async () => []
        });
        vm.runInContext(source.slice(start, end), context);
        let body;
        const response = { set() {}, json(value) { body = value; }, status(code) { throw new Error(`Library failed: ${code}`); } };
        await handlers.get(route)({}, response);
        assert.deepEqual(Array.from(body, (card) => card.id), ["unrelated-resource"]);
        live = true;
        await handlers.get(route)({}, response);
        assert.deepEqual(Array.from(body, (card) => card.id), ["kit-typing", "unrelated-resource"]);
    }
});

test("Not Live blocks direct content, responses, completion, certificates and documents, including for signed-in teachers", async (t) => {
    const f = await fixture(t);
    for (const method of ["GET", "POST", "PUT"]) {
        assert.equal((await f.call("/api/practical-skills/blueprint-team", method)).status, 403, "Team access follows Builder publication");
    }
    await f.service.setLive("kit-minecraft", false, "teacher@school.nz");
    for (const [path, method] of [
        ["/api/practical-skills/progress/kit-minecraft", "GET"],
        ["/api/practical-skills/progress/kit-minecraft/certificate.pdf", "GET"],
        ["/api/practical-skills/progress/kit-minecraft/certificate/email", "POST"],
        ["/api/practical-skills/progress/kit-minecraft/complete", "POST"],
        ["/api/practical-skills/progress/kit-minecraft/responses", "POST"],
        ["/api/practical-skills/progress/kit-minecraft/activities/0", "PUT"],
        ["/api/practical-skills/blocks/kit-minecraft/0/check", "POST"],
        ["/api/practical-skills/blocks/kit-minecraft/0/documents/test", "POST"],
        ["/api/practical-skills/minecraft-exports-folder", "POST"]
    ]) assert.equal((await f.call(path, method)).status, 403, path);
    assert.equal((await f.call("/api/practical-skills/kit-content/kit-minecraft")).status, 200, "Teachers can preview content");
    const student = createKitPublication({ ...f.deps, canManage: async () => false });
    let passed = false;
    await student.gate({ path: "/api/practical-skills/kit-content/kit-minecraft", method: "GET" }, {
        status(code) { assert.equal(code, 403); return this; }, json() {}
    }, () => { passed = true; });
    assert.equal(passed, false);
});

test("publication and reset require admin; audited reset preserves answers and unrelated students", async (t) => {
    const f = await fixture(t);
    assert.equal((await f.call("/api/admin/kit-publication/kit-minecraft", "PUT", { live: false }, false)).status, 403);
    assert.equal((await f.call("/api/admin/kit-results/kit-minecraft/reset", "POST", { emails: ["a@school.nz"] }, false)).status, 403);
    assert.equal((await f.call("/api/admin/kit-publication/kit-minecraft", "PUT", { live: "false" })).status, 400);
    assert.equal((await f.call("/api/admin/kit-publication/kit-minecraft", "PUT", { live: false })).status, 200);
    const r = await f.call("/api/admin/kit-results/kit-minecraft/reset", "POST", { emails: ["a@school.nz", "b@school.nz", "missing@school.nz"] });
    assert.equal(r.status, 200);
    const data = await r.json();
    assert.equal(data.reset.length, 2);
    assert.deepEqual(data.missing, ["missing@school.nz"]);
    assert.equal(f.rows[0].completed, false);
    assert.deepEqual(f.rows[0].responses, { answer: "Keep me" });
    assert.equal(f.rows[2].completed, true);
    assert.equal(f.audits.length, 2);
    assert.equal(JSON.parse(f.audits[0][3]).completed, true);
    assert.ok(f.queries.some(({ sql }) => sql === "COMMIT"));
    assert.ok(f.queries.some(({ sql }) => sql.includes("pg_advisory_xact_lock")));
    assert.equal(f.queries.at(-1).sql, "RELEASE");
    assert.ok(f.queries.filter(({ sql }) => /UPDATE practical_skills_progress/.test(sql)).every(({ params }) => params[0] === "kit-minecraft"));
});

test("explicit preview requires kit-management permission even for Live kits and never grants progress access", async (t) => {
    const f = await fixture(t);
    assert.equal((await f.call("/api/practical-skills/kit-content/kit-minecraft?preview=1")).status, 200);
    await f.service.setLive("kit-minecraft", false, "teacher@school.nz");
    const response = await f.call("/api/practical-skills/kit-content/kit-minecraft?preview=1");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal((await f.call("/api/practical-skills/progress/kit-minecraft?preview=1")).status, 403);
    const licencePath = "/api/practical-skills/blocks/kit-minecraft/0/licences/school";
    assert.equal((await f.call(`${licencePath}?preview=1`)).status, 200, "Teachers can read licences in a paused-kit preview");
    assert.equal((await f.call(`${licencePath}?preview=1`, "GET", undefined, false)).status, 403);
    assert.equal((await f.call(`${licencePath}?preview=1`, "PUT")).status, 403, "Preview never permits licence writes");
    assert.equal((await f.call(licencePath)).status, 403, "Paused licence reads still require explicit teacher preview");
    const student = createKitPublication({ ...f.deps, canManage: async () => false });
    for (const live of [true, false]) {
        await f.service.setLive("kit-minecraft", live, "teacher@school.nz");
        let passed = false;
        await student.gate({ path: "/api/practical-skills/kit-content/kit-minecraft", method: "GET", query: { preview: "1" } }, {
            set() {}, status(code) { assert.equal(code, 403); return this; }, json() {}
        }, () => { passed = true; });
        assert.equal(passed, false);
    }
});

test("reset rolls back and reports failure instead of claiming success", async (t) => {
    const f = await fixture(t);
    f.failUpdate();
    const response = await f.call("/api/admin/kit-results/kit-minecraft/reset", "POST", { emails: ["a@school.nz"] });
    assert.equal(response.status, 503);
    assert.equal(f.rows[0].completed, true);
    assert.ok(f.queries.some(({ sql }) => sql === "ROLLBACK"));
    assert.equal(f.queries.at(-1).sql, "RELEASE");
});

test("actual Express middleware loads custom kits on cold direct student and admin API requests", async (t) => {
    const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
    const start = source.indexOf('app.use(["/api/practical-skills", "/api/admin/practical-skills"]');
    const end = source.indexOf('\napp.use("/images/activities"', start);
    assert.ok(start >= 0 && end > start);
    const app = express();
    let loaded = false;
    vm.runInContext(source.slice(start, end), vm.createContext({
        app, ensureCustomPracticalSkillsKitsLoaded: async () => { loaded = true; }
    }));
    const paths = ["/api/practical-skills/my-progress", "/api/admin/practical-skills/kits"];
    for (const route of paths) app.get(route, (_req, res) => res.json({ customKitVisible: loaded }));
    const server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
    for (const route of paths) {
        loaded = false;
        const response = await fetch(`http://127.0.0.1:${server.address().port}${route}`);
        assert.equal((await response.json()).customKitVisible, true, route);
        assert.equal(response.headers.get("cache-control"), "private, no-store");
    }
});

test("revocation requires verified teacher access and the exact selected completion, and preserves work", async (t) => {
    const f = await fixture(t);
    const path = "/api/admin/kit-results/kit-minecraft/reset";
    const request = { emails: ["a@school.nz"], revokeCertificate: true, completedAt: f.rows[0].completed_at };
    assert.equal((await f.call(path, "POST", request, false)).status, 403);
    assert.equal((await f.call(path, "POST", request, true, { "x-verified-email": "" })).status, 401);
    assert.equal((await f.call(path, "POST", request, true, { "x-verified-email": "student@school.nz" })).status, 403);
    assert.equal((await f.call(path, "POST", { ...request, completedAt: "2026-10-19T00:00:00Z" })).status, 409);
    assert.equal(f.audits.length, 0);
    assert.equal((await f.call(path, "POST", request)).status, 200);
    assert.equal(f.rows[0].completed_at, null);
    assert.equal(f.rows[0].certificate_emailed_at, null);
    assert.deepEqual(f.rows[0].completed_activities, {});
    assert.equal(f.rows[0].responses.answer, "Keep me");
    assert.ok(f.rows[0].certificate_revoked_at);
    assert.equal(f.rows[1].completed, true);
    assert.equal(f.audits[0][2], "teacher@school.nz");
    assert.equal(JSON.parse(f.audits[0][3]).reset_action, "certificate_revocation");
    assert.equal((await f.call(path, "POST", request)).status, 409);
});

test("a queued certificate send rechecks publication and completion date after taking its lock", async () => {
    const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
    const start = source.indexOf("async function sendKitCertificateEmail(");
    const end = source.indexOf("\n// Claims the one automatic", start);
    let live = false;
    let locked = false;
    let progress = { completed: false };
    const context = vm.createContext({
        pool: { query: async () => { assert.equal(locked, true); return { rows: [progress] }; } },
        hasDatabase: true,
        kitPublication: { available: async () => { assert.equal(locked, true); return live; } },
        withKitCertificateEmailLock: async (_pool, _db, _email, _kitId, callback) => {
            locked = true;
            try { return await callback(); } finally { locked = false; }
        },
        createKitCertificatePdf: async () => assert.fail("No certificate PDF should be created after reset"),
        sendConfiguredHubEmail: async () => assert.fail("No certificate email should be sent after reset")
    });
    vm.runInContext(source.slice(start, end), context);
    await assert.rejects(context.sendKitCertificateEmail("a@school.nz", "kit-minecraft", {}), /Not Live/);
    live = true;
    await assert.rejects(context.sendKitCertificateEmail("a@school.nz", "kit-minecraft", {}), /has been reset/);
    progress = { completed: true, completed_at: "2026-10-21T00:00:00Z" };
    await assert.rejects(context.sendKitCertificateEmail("a@school.nz", "kit-minecraft", { completedAt: "2026-10-20T00:00:00Z" }), /has been replaced/);
});
