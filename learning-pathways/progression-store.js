"use strict";

const pathwayIds = ["digital-systems", "data", "digital-citizenship", "programming-and-algorithms", "systems-and-control"];
const coverageValues = ["not-taught", "partly-taught", "taught"];
const descriptorValues = ["emerging", "developing", "consolidating", "proficient", "exceeding"];

function validateRecord(body) {
    if (!body || typeof body !== "object") throw new Error("A rotation record is required.");
    const studentEmail = String(body.studentEmail || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail)) throw new Error("Select a student.");
    for (const [key, min, max] of [["schoolYear", 2000, 2100], ["term", 1, 4], ["yearLevel", 7, 10], ["revision", 0, Number.MAX_SAFE_INTEGER]]) {
        if (!Number.isSafeInteger(body[key]) || body[key] < min || body[key] > max) throw new Error(`Invalid ${key}.`);
    }
    const text = (value, name, limit = 5000) => {
        if (typeof value !== "string" || value.length > limit) throw new Error(`Invalid ${name} (maximum ${limit} characters).`);
        return value.trim();
    };
    if (!Array.isArray(body.pathways) || body.pathways.length !== pathwayIds.length) throw new Error("All five pathway results are required.");
    const pathways = pathwayIds.map((id) => {
        const matches = body.pathways.filter((row) => row?.id === id);
        if (matches.length !== 1) throw new Error("Pathway IDs must be unique and recognised.");
        const row = matches[0];
        if (!coverageValues.includes(row.coverage)) throw new Error("Invalid curriculum coverage.");
        if (row.descriptor !== null && !descriptorValues.includes(row.descriptor)) throw new Error("Invalid progress descriptor.");
        if (row.coverage === "not-taught" && row.descriptor !== null) throw new Error("Not taught pathways must be Not determined.");
        return { id, coverage: row.coverage, descriptor: row.descriptor,
            addressed: text(row.addressed, "knowledge and practices"),
            evidence: text(row.evidence, "evidence"), notes: text(row.notes, "teacher notes") };
    });
    return { studentEmail, schoolYear: body.schoolYear, term: body.term, yearLevel: body.yearLevel,
        revision: body.revision, formClass: text(body.formClass, "class", 100), pathways,
        ...(body.timetableClass === undefined ? {} : { timetableClass: text(body.timetableClass, "timetable class", 100) }),
        homeroom: body.homeroom === undefined ? text(body.formClass, "class", 100) : text(body.homeroom, "homeroom", 100),
        strengths: text(body.strengths, "strengths"), nextLearning: text(body.nextLearning, "next learning") };
}

function registerProgressionPathway(app, { pool, hasDatabase, requireTeacherAccess, getStudents }) {
    const available = (_req, res, next) => {
        if (!hasDatabase) return res.status(503).json({ error: "Progression results require the database. No results have been saved." });
        next();
    };
    async function schema() {
        await pool.query(`CREATE TABLE IF NOT EXISTS progression_pathway_results (
            student_email TEXT NOT NULL, school_year INTEGER NOT NULL, term INTEGER NOT NULL,
            record JSONB NOT NULL, revision INTEGER NOT NULL DEFAULT 1,
            updated_by TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (student_email, school_year, term)
        )`);
    }
    async function studentsWithHistory() {
        const current = await getStudents();
        if (!hasDatabase) return current;
        await schema();
        const saved = await pool.query(`SELECT DISTINCT ON (student_email) student_email, record
            FROM progression_pathway_results ORDER BY student_email, school_year DESC, term DESC`);
        const students = new Map(current.filter((student) => student.email).map((student) => [student.email, student]));
        for (const row of saved.rows) {
            if (!students.has(row.student_email)) {
                students.set(row.student_email, { email: row.student_email,
                    name: row.record.studentName || row.student_email,
                    yearLevel: row.record.yearLevel, formClass: row.record.formClass,
                    homeroom: row.record.homeroom || row.record.formClass,
                    ...(row.record.timetableClass === undefined ? {} : { timetableClass: row.record.timetableClass }), archived: true });
            }
        }
        return [...current.filter((student) => !student.email), ...students.values()];
    }
    app.get("/api/teacher/progression/students", requireTeacherAccess, async (_req, res) => {
        try {
            res.set("Cache-Control", "no-store");
            res.json({ students: await studentsWithHistory() });
        } catch (error) {
            console.error("Could not load progression students", error);
            res.status(500).json({ error: "Could not load students. Please retry." });
        }
    });
    app.get("/api/teacher/progression/records", requireTeacherAccess, available, async (req, res) => {
        const email = String(req.query.studentEmail || "").trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Select a student." });
        try {
            await schema();
            const result = await pool.query(`SELECT record, revision, updated_at, updated_by
                FROM progression_pathway_results WHERE student_email = $1 ORDER BY school_year DESC, term DESC`, [email]);
            res.set("Cache-Control", "no-store");
            res.json({ records: result.rows.map((row) => ({ ...row.record, revision: row.revision,
                updatedAt: row.updated_at, updatedBy: row.updated_by })) });
        } catch (error) {
            console.error("Could not load progression records", error);
            res.status(500).json({ error: "Could not load saved results. Please retry." });
        }
    });
    app.put("/api/teacher/progression/records", requireTeacherAccess, available, async (req, res) => {
        let record;
        try { record = validateRecord(req.body); }
        catch (error) { return res.status(400).json({ error: error.message }); }
        try {
            const students = await getStudents();
            const student = students.find((student) => student.email === record.studentEmail);
            if (!student && record.revision === 0) return res.status(400).json({ error: "Select a Year 7-10 student from the school directory." });
            const historicalStudent = student || (await studentsWithHistory()).find((item) => item.email === record.studentEmail);
            if (historicalStudent) record.studentName = historicalStudent.name;
            await schema();
            const values = [record.studentEmail, record.schoolYear, record.term, JSON.stringify(record), req.user_email];
            const result = record.revision === 0
                ? await pool.query(`INSERT INTO progression_pathway_results (student_email, school_year, term, record, updated_by)
                    VALUES ($1, $2, $3, $4::jsonb, $5) ON CONFLICT DO NOTHING
                    RETURNING record, revision, updated_at, updated_by`, values)
                : await pool.query(`UPDATE progression_pathway_results SET record = $4::jsonb,
                    updated_by = $5, updated_at = NOW(), revision = revision + 1
                    WHERE student_email = $1 AND school_year = $2 AND term = $3 AND revision = $6
                    RETURNING record, revision, updated_at, updated_by`, [...values, record.revision]);
            if (!result.rows.length) return res.status(409).json({ error: "This rotation was changed by another teacher. Reload saved results before editing again." });
            const row = result.rows[0];
            res.json({ record: { ...row.record, revision: row.revision, updatedAt: row.updated_at, updatedBy: row.updated_by } });
        } catch (error) {
            console.error("Could not save progression results", error);
            res.status(500).json({ error: "Could not save results. Your changes have not been saved." });
        }
    });
}

module.exports = { registerProgressionPathway, validateRecord };
