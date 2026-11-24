"use strict";
const { randomUUID } = require("node:crypto");
const KIT = "kit-minecraft-builder-kit";
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const active = (member) => ["pending", "accepted"].includes(member.status);
const fail = (message, status = 400) => Object.assign(new Error(message), { status });

function createBlueprintTeams({ pool, hasDatabase, getStudents, getRequestUserEmail, normalizeEmail,
    schoolDomain, requireAdminAccess, canReview, now = () => new Date() }) {
    let schema;
    const year = () => Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Pacific/Auckland" }).format(now()));
    function schoolEmail(value) {
        const email = normalizeEmail(typeof value === "string" ? value : "");
        if (!/^[^@\s]+@[^@\s]+$/.test(email) || email.split("@")[1] !== schoolDomain) {
            throw fail("A valid school email address is required.");
        }
        return email;
    }
    function text(value, label, limit) {
        if (typeof value !== "string" || !value.trim() || value.trim().length > limit) {
            throw fail(`${label} is required (up to ${limit} characters).`);
        }
        return value.trim();
    }
    async function ensureSchema() {
        if (!hasDatabase) throw fail("Team registration needs the database. Please ask your teacher.", 503);
        if (!schema) schema = pool.query(`
            CREATE TABLE IF NOT EXISTS practical_skills_blueprint_teams (
                id UUID PRIMARY KEY, kit_id TEXT NOT NULL, course_instance TEXT NOT NULL,
                school_year INTEGER NOT NULL, course TEXT NOT NULL, class_name TEXT NOT NULL,
                mode TEXT NOT NULL CHECK (mode IN ('independent', 'team')), building TEXT NOT NULL,
                version INTEGER NOT NULL DEFAULT 1, created_by TEXT NOT NULL, updated_by TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (id, kit_id, course_instance)
            );
            CREATE TABLE IF NOT EXISTS practical_skills_blueprint_members (
                team_id UUID NOT NULL, kit_id TEXT NOT NULL, course_instance TEXT NOT NULL,
                student_key TEXT NOT NULL, student_email TEXT NOT NULL, student_name TEXT NOT NULL,
                status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'removed')),
                area TEXT NOT NULL DEFAULT '', contribution TEXT NOT NULL DEFAULT '',
                acknowledgement_version INTEGER, acknowledged_at TIMESTAMPTZ,
                PRIMARY KEY (team_id, student_key),
                FOREIGN KEY (team_id, kit_id, course_instance)
                    REFERENCES practical_skills_blueprint_teams (id, kit_id, course_instance)
            );
            CREATE UNIQUE INDEX IF NOT EXISTS blueprint_one_active_student
                ON practical_skills_blueprint_members (kit_id, course_instance, student_key)
                WHERE status IN ('pending', 'accepted');
            CREATE UNIQUE INDEX IF NOT EXISTS blueprint_one_active_email
                ON practical_skills_blueprint_members (kit_id, course_instance, student_email)
                WHERE status IN ('pending', 'accepted');
        `).catch((error) => { schema = null; throw error; });
        await schema;
    }
    async function directory() {
        const rows = await getStudents();
        const schoolYear = year();
        const students = rows.filter((row) => row.course && row.timetableClass && row.id && row.name)
            .map((row) => ({
                id: row.id, name: row.name, email: schoolEmail(row.email),
                emails: row.emails.map(schoolEmail), course: row.course, className: row.timetableClass.trim(),
                schoolYear,
                courseInstance: JSON.stringify([schoolYear, row.course, row.timetableClass.trim().toLowerCase()])
            }));
        return students;
    }
    function findStudent(students, email) {
        const matches = students.filter((student) => student.emails.includes(email));
        if (matches.length !== 1) throw fail("Your current timetabled class could not be identified. Ask your teacher to check the student directory.", 409);
        return matches[0];
    }
    async function context(email) {
        const students = await directory();
        const student = findStudent(students, email);
        return { student, students: students.filter((item) => item.courseInstance === student.courseInstance) };
    }
    async function transaction(scope, work) {
        await ensureSchema();
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [scope]);
            const result = await work(client);
            await client.query("COMMIT");
            return result;
        } catch (error) {
            await client.query("ROLLBACK");
            if (error.code === "23505") throw fail("A student is already registered in this kit and class. Ask your teacher to correct membership.", 409);
            throw error;
        } finally { client.release(); }
    }
    async function readTeam(db, id) {
        const team = (await db.query("SELECT * FROM practical_skills_blueprint_teams WHERE id = $1", [id])).rows[0];
        if (!team) throw fail("Team not found.", 404);
        const members = (await db.query(`SELECT * FROM practical_skills_blueprint_members
            WHERE team_id = $1 ORDER BY student_name, student_key`, [id])).rows;
        return { ...team, members };
    }
    async function membership(db, student) {
        return (await db.query(`SELECT team_id FROM practical_skills_blueprint_members
            WHERE kit_id = $1 AND course_instance = $2 AND student_key = $3
            AND status IN ('pending', 'accepted')`, [KIT, student.courseInstance, student.id])).rows[0];
    }
    function publicTeam(team) {
        return {
            id: team.id, kitId: team.kit_id, courseInstance: team.course_instance, schoolYear: team.school_year,
            course: team.course, className: team.class_name, mode: team.mode, building: team.building, version: team.version,
            members: team.members.map((member) => ({
                id: member.student_key, email: member.student_email, name: member.student_name,
                status: member.status, area: member.area, contribution: member.contribution,
                acknowledgementVersion: member.acknowledgement_version
            }))
        };
    }
    function readiness(team, studentId) {
        if (!team || team.mode === "independent") return { passed: true };
        const own = team.members.find((member) => member.student_key === studentId && active(member));
        const passed = own?.status === "accepted" && own.acknowledgement_version === team.version &&
            Boolean(own.area.trim() && own.contribution.trim());
        return { passed: Boolean(passed), message: passed ? "" :
            "Accept your own team membership and save your building area and contribution before submitting your Blueprint Slideshow." };
    }
    async function getReadiness(email) {
        await ensureSchema();
        const students = await directory();
        const matches = students.filter((student) => student.emails.includes(normalizeEmail(email)));
        // Existing independent submissions do not require a new directory entry or registration.
        if (matches.length !== 1) {
            const registered = (await pool.query(`SELECT team_id FROM practical_skills_blueprint_members
                WHERE kit_id = $1 AND student_email = $2 AND status IN ('pending', 'accepted')
                AND team_id IN (SELECT id FROM practical_skills_blueprint_teams WHERE school_year = $3)`,
            [KIT, normalizeEmail(email), year()])).rows.length;
            if (registered) throw fail("Your registered class could not be verified. Ask your teacher to check membership.", 409);
            return { passed: true };
        }
        const member = await membership(pool, matches[0]);
        return readiness(member ? await readTeam(pool, member.team_id) : null, matches[0].id);
    }
    async function assertReady(email) {
        const ready = await getReadiness(email);
        if (!ready.passed) throw fail(ready.message, 422);
    }
    function roster(ids, students, mode, allowEmpty = false) {
        if (!Array.isArray(ids) || (!allowEmpty && !ids.length) || ids.length > 3 || ids.some((id) => typeof id !== "string") ||
            new Set(ids).size !== ids.length || (mode === "independent" && ids.length !== 1 && !(allowEmpty && !ids.length))) {
            throw fail("Choose one student for an independent build, or at most three different students for a team.");
        }
        return ids.map((id) => {
            const student = students.find((item) => item.id === id);
            if (!student) throw fail("Choose current students from the same timetabled class.");
            schoolEmail(student.email);
            return student;
        });
    }
    async function saveMember(db, team, student) {
        await db.query(`INSERT INTO practical_skills_blueprint_members
            (team_id, kit_id, course_instance, student_key, student_email, student_name, status)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            ON CONFLICT (team_id, student_key) DO UPDATE SET
                student_email = EXCLUDED.student_email, student_name = EXCLUDED.student_name,
                status = EXCLUDED.status, area = '', contribution = '',
                acknowledgement_version = NULL, acknowledged_at = NULL`,
        [team.id, KIT, team.course_instance, student.id, student.email, student.name,
            team.mode === "independent" ? "accepted" : "pending"]);
    }
    async function registerTeam(email, body) {
        const { student, students } = await context(email);
        const mode = body?.mode;
        if (!["independent", "team"].includes(mode)) throw fail("Choose an independent or team build.");
        if (body.teammateIds !== undefined && !Array.isArray(body.teammateIds)) throw fail("Choose teammates from the student selector.");
        const members = roster([student.id, ...(body.teammateIds || [])], students, mode);
        const building = text(body.building, "Chosen famous building", 200);
        return transaction(student.courseInstance, async (db) => {
            if (await membership(db, student)) throw fail("You already have a registration. Reload your team details.", 409);
            const team = { id: randomUUID(), course_instance: student.courseInstance, mode };
            await db.query(`INSERT INTO practical_skills_blueprint_teams
                (id,kit_id,course_instance,school_year,course,class_name,mode,building,created_by,updated_by)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)`,
            [team.id, KIT, student.courseInstance, student.schoolYear, student.course, student.className, mode, building, email]);
            for (const member of members) await saveMember(db, team, member);
            return publicTeam(await readTeam(db, team.id));
        });
    }
    async function acknowledge(email, id, body) {
        const { student } = await context(email);
        if (!["accept", "decline"].includes(body?.decision)) throw fail("Choose Accept or Decline.");
        if (Object.hasOwn(body, "studentEmail") || Object.hasOwn(body, "studentId")) {
            throw fail("You can only acknowledge your own membership.", 403);
        }
        return transaction(student.courseInstance, async (db) => {
            const team = await readTeam(db, id);
            const own = team.members.find((member) => member.student_key === student.id && active(member));
            if (team.course_instance !== student.courseInstance || !own || team.mode !== "team") {
                throw fail("You are not an active member of this team.", 403);
            }
            if (body.version !== team.version) throw fail("Membership changed. Reload the team and acknowledge it again.", 409);
            const accepted = body.decision === "accept";
            const area = accepted ? text(body.area, "Your building area", 120) : "";
            const contribution = accepted ? text(body.contribution, "Your intended contribution", 1200) : "";
            await db.query(`UPDATE practical_skills_blueprint_members SET status = $3, area = $4,
                contribution = $5, acknowledgement_version = $6, acknowledged_at = NOW()
                WHERE team_id = $1 AND student_key = $2`,
            [id, student.id, accepted ? "accepted" : "declined", area, contribution, accepted ? team.version : null]);
            return accepted ? publicTeam(await readTeam(db, id)) : null;
        });
    }
    async function correct(email, id, body) {
        await ensureSchema();
        const original = await readTeam(pool, id);
        if (original.school_year !== year()) throw fail("Only current-year team membership can be corrected.", 409);
        const students = (await directory()).filter((student) => student.courseInstance === original.course_instance);
        const members = roster(body?.memberIds, students, original.mode, true);
        const building = text(body?.building, "Chosen famous building", 200);
        return transaction(original.course_instance, async (db) => {
            const team = await readTeam(db, id);
            if (body.version !== team.version) throw fail("This team changed. Reload before correcting membership.", 409);
            const currentIds = team.members.filter(active).map((member) => member.student_key).sort();
            if (building === team.building && JSON.stringify(currentIds) === JSON.stringify(members.map((member) => member.id).sort())) {
                return publicTeam(team);
            }
            await db.query(`UPDATE practical_skills_blueprint_teams SET building = $2,
                version = version + 1, updated_by = $3, updated_at = NOW() WHERE id = $1`, [id, building, email]);
            await db.query(`UPDATE practical_skills_blueprint_members SET status = 'removed',
                area = '', contribution = '', acknowledgement_version = NULL, acknowledged_at = NULL
                WHERE team_id = $1 AND status IN ('pending', 'accepted')`, [id]);
            for (const member of members) await saveMember(db, team, member);
            return publicTeam(await readTeam(db, id));
        });
    }
    function authenticated(req) {
        const email = normalizeEmail(getRequestUserEmail(req));
        if (!req.auth_identity?.verified || !email || normalizeEmail(req.auth_identity.email) !== email) {
            throw fail("Verify your school Google sign-in to use team registration.", 401);
        }
        return schoolEmail(email);
    }
    function endpoint(work, teacher = false) {
        return async (req, res) => {
            res.set("Cache-Control", "private, no-store");
            try {
                const email = authenticated(req);
                if (teacher && !(await canReview(email))) throw fail("Teacher permission is required.", 403);
                await ensureSchema();
                res.json(await work(req, email));
            } catch (error) {
                console.error("[blueprint-teams]", error.message);
                res.status(error.status || 500).json({ error: error.status ? error.message :
                    "Team changes could not be confirmed. Reload before retrying." });
            }
        };
    }
    function register(app) {
        const base = "/api/practical-skills/blueprint-team";
        app.get(base, endpoint(async (_req, email) => {
            const { student } = await context(email);
            const member = await membership(pool, student);
            return { student: { id: student.id, name: student.name, email },
                className: student.className, schoolYear: student.schoolYear,
                team: member ? publicTeam(await readTeam(pool, member.team_id)) : null };
        }));
        app.get(`${base}/students`, endpoint(async (req, email) => {
            const { student, students } = await context(email);
            const search = String(req.query.q || "").trim().toLowerCase().slice(0, 100);
            if (search.length < 2) return { students: [] };
            return { students: students.filter((item) => item.id !== student.id &&
                `${item.name} ${item.email}`.toLowerCase().includes(search))
                .slice(0, 20).map(({ id, name, email }) => ({ id, name, email })) };
        }));
        app.post(base, endpoint(async (req, email) => ({ team: await registerTeam(email, req.body) })));
        app.put(`${base}/:teamId/acknowledgement`, endpoint(async (req, email) => {
            if (!UUID.test(req.params.teamId)) throw fail("Choose a valid team.");
            return { team: await acknowledge(email, req.params.teamId, req.body) };
        }));
        const admin = "/api/admin/practical-skills/blueprint-teams";
        app.get(admin, requireAdminAccess, endpoint(async () => {
            const students = await directory();
            const teams = (await pool.query(`SELECT id FROM practical_skills_blueprint_teams
                WHERE kit_id = $1 AND school_year = $2 ORDER BY class_name, created_at`, [KIT, year()])).rows;
            return { teams: await Promise.all(teams.map(async (team) => publicTeam(await readTeam(pool, team.id)))),
                students: students.map(({ id, name, email, courseInstance, className }) => ({ id, name, email, courseInstance, className })) };
        }, true));
        app.put(`${admin}/:teamId`, requireAdminAccess, endpoint(async (req, email) => {
            if (!UUID.test(req.params.teamId)) throw fail("Choose a valid team.");
            return { team: await correct(email, req.params.teamId, req.body) };
        }, true));
    }
    return { register, getReadiness, assertReady, registerTeam, acknowledge, correct, readiness };
}
module.exports = { createBlueprintTeams, KIT };
