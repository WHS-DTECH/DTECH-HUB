"use strict";

const DEFAULT_START_DATE = "2026-10-26";
const WEEK_COUNT = 7;
const PERIOD_COUNT = 2;
const TYPING_KIT_CARD = {
    id: "kit-typing",
    title: "Typing Kit",
    summary: "Keep a seven-week typing log: two periods each week, with every attempt saved. Copy your saved results into your exercise book.",
    yearLevel: "All Years",
    area: "Skill Kits",
    status: "active",
    href: "/practical-skills/typing-kit.html",
    imageUrl: "",
    cardLabel: "LICENCE KIT",
    visual: { icon: "\u2328", palette: "linear-gradient(135deg, #173858 0%, #246b78 54%, #4fa38d 100%)" }
};

function withTypingKitCard(cards) {
    const existing = cards.find((card) => card.id === TYPING_KIT_CARD.id);
    return existing ? cards.map((card) => card === existing
        ? { ...TYPING_KIT_CARD, ...card, title: TYPING_KIT_CARD.title, href: TYPING_KIT_CARD.href, cardLabel: "LICENCE KIT" } : card)
        : [...cards, { ...TYPING_KIT_CARD }];
}

function isMonday(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
        && date.getUTCDay() === 1;
}

function addDays(value, days) {
    const date = new Date(`${value}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

function parseTypingResult(value) {
    if (typeof value !== "string" || value.length > 4096) throw new Error("Paste the complete TypingTest.com results link.");
    let url;
    try { url = new URL(value.trim()); }
    catch { throw new Error("Paste a valid TypingTest.com results link."); }
    if (url.protocol !== "https:" || !["typingtest.com", "www.typingtest.com"].includes(url.hostname)
        || url.port || url.username || url.password || url.pathname !== "/result.php") {
        throw new Error("Use the HTTPS results page link from TypingTest.com, not the test or another website.");
    }
    const number = (key, maximum) => {
        const values = url.searchParams.getAll(key);
        if (values.length !== 1 || !/^\d+(?:\.\d+)?$/.test(values[0])) {
            throw new Error(`The results link needs one valid ${key} value. Copy the full address from your results page.`);
        }
        const result = Number(values[0]);
        if (!Number.isFinite(result) || result > maximum) throw new Error(`The results link has an invalid ${key} value.`);
        return result;
    };
    const accuracy = number("acc", 100);
    const netWpm = number("nwpm", 1000);
    const grossWpm = number("gwpm", 1000);
    const durationSeconds = number("dur", 3600);
    const elapsedSeconds = number("time", 3600);
    if (netWpm > grossWpm) throw new Error("Net WPM cannot be greater than gross WPM. Copy your original results link.");
    if (durationSeconds !== 60 || elapsedSeconds !== 60) throw new Error("Complete a full one-minute typing test before saving your result.");
    if (url.searchParams.has("unit") && (url.searchParams.getAll("unit").length !== 1 || url.searchParams.get("unit") !== "wpm")) {
        throw new Error("Use a typing result measured in WPM.");
    }
    // Keep score evidence, not advertising fragments or unrelated tracking parameters.
    const source = new URL("https://www.typingtest.com/result.php");
    for (const key of ["acc", "nwpm", "gwpm", "dur", "time", "ncpm", "gcpm", "chksum", "unit", "kh", "td", "err", "hits", "textfile", "mobile"]) {
        if (url.searchParams.getAll(key).length > 1) throw new Error(`The results link contains duplicate ${key} values.`);
        if (url.searchParams.has(key)) source.searchParams.set(key, url.searchParams.get(key));
    }
    return { accuracy, netWpm, grossWpm, durationSeconds, sourceUrl: source.href };
}

function registerTypingKit(app, { pool, hasDatabase, getRequestUserEmail, normalizeEmail, schoolDomain, canManagePracticalSchedule }) {
    let schemaReady;
    async function ensureSchema() {
        if (!hasDatabase) {
            const error = new Error("The Typing Kit needs database storage. Results cannot be saved until the database is configured.");
            error.status = 503;
            throw error;
        }
        if (!schemaReady) {
            schemaReady = (async () => {
                await pool.query(`CREATE TABLE IF NOT EXISTS typing_kit_settings (
                    id TEXT PRIMARY KEY, start_date TEXT NOT NULL, updated_by_email TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )`);
                await pool.query(`INSERT INTO typing_kit_settings (id, start_date) VALUES ('default', $1) ON CONFLICT (id) DO NOTHING`, [DEFAULT_START_DATE]);
                await pool.query(`CREATE TABLE IF NOT EXISTS typing_kit_attempts (
                    id BIGSERIAL PRIMARY KEY, student_email TEXT NOT NULL, submission_id UUID NOT NULL,
                    week_start TEXT NOT NULL, period SMALLINT NOT NULL CHECK (period IN (1, 2)),
                    result JSONB NOT NULL, submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE (student_email, submission_id)
                )`);
                await pool.query(`CREATE INDEX IF NOT EXISTS typing_kit_attempts_student_idx ON typing_kit_attempts (student_email, submitted_at)`);
            })().catch((error) => { schemaReady = null; throw error; });
        }
        await schemaReady;
    }
    const identity = (req, res) => {
        const email = normalizeEmail(getRequestUserEmail(req));
        if (!email || !email.endsWith(`@${schoolDomain}`)) {
            res.status(401).json({ error: "Sign in with your school Google account to use your Typing Kit." });
            return "";
        }
        return email;
    };
    const shape = (row) => ({
        id: String(row.id), submissionId: row.submission_id, weekStart: row.week_start,
        period: row.period, submittedAt: new Date(row.submitted_at).toISOString(), ...row.result
    });
    async function settings() {
        const row = (await pool.query("SELECT start_date FROM typing_kit_settings WHERE id = 'default'")).rows[0];
        if (!row || !isMonday(row.start_date)) throw new Error("The Typing Kit calendar could not be loaded.");
        return row.start_date;
    }
    function failure(res, error) {
        console.error("[typing-kit]", error);
        res.status(error.status || 500).json({ error: error.status ? error.message : "Could not access the typing log. Please try again; no results have been removed." });
    }

    app.get("/api/practical-skills/typing-kit", async (req, res) => {
        const email = identity(req, res);
        if (!email) return;
        res.set("Cache-Control", "no-store");
        try {
            await ensureSchema();
            const [startDate, rows, canManage] = await Promise.all([
                settings(),
                pool.query(`SELECT * FROM typing_kit_attempts WHERE student_email = $1 ORDER BY submitted_at, id`, [email]),
                canManagePracticalSchedule(email)
            ]);
            res.json({ startDate, weekCount: WEEK_COUNT, periodsPerWeek: PERIOD_COUNT, canManage, attempts: rows.rows.map(shape) });
        } catch (error) { failure(res, error); }
    });

    app.put("/api/practical-skills/typing-kit/settings", async (req, res) => {
        const email = identity(req, res);
        if (!email) return;
        try {
            if (!(await canManagePracticalSchedule(email))) return res.status(403).json({ error: "Only teaching staff can change the Typing Kit start date." });
            const startDate = req.body?.startDate;
            if (!isMonday(startDate) || startDate < "2000-01-01" || startDate > "2100-12-31") {
                return res.status(400).json({ error: "Choose a valid Monday for the start of Week 1 (2000-2100)." });
            }
            await ensureSchema();
            await pool.query(`UPDATE typing_kit_settings SET start_date = $1, updated_by_email = $2, updated_at = NOW() WHERE id = 'default'`, [startDate, email]);
            res.json({ startDate });
        } catch (error) { failure(res, error); }
    });

    app.post("/api/practical-skills/typing-kit/attempts", async (req, res) => {
        const email = identity(req, res);
        if (!email) return;
        const { weekStart, period, submissionId } = req.body || {};
        if (!isMonday(weekStart) || ![1, 2].includes(period)
            || typeof submissionId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId)) {
            return res.status(400).json({ error: "Choose a valid week and period, then submit your result again." });
        }
        let result;
        try { result = parseTypingResult(req.body?.resultUrl); }
        catch (error) { return res.status(400).json({ error: error.message }); }
        try {
            await ensureSchema();
            // A retry returns the original attempt, even if the teacher has since changed the calendar.
            const existing = (await pool.query(`SELECT * FROM typing_kit_attempts WHERE student_email = $1 AND submission_id = $2`, [email, submissionId])).rows[0];
            if (existing) {
                if (existing.week_start !== weekStart || existing.period !== period || existing.result.sourceUrl !== result.sourceUrl) {
                    return res.status(409).json({ error: "This submission was already saved with different details. Reload your daily record before adding another attempt." });
                }
                return res.json({ attempt: shape(existing) });
            }
            const saved = await pool.query(`INSERT INTO typing_kit_attempts (student_email, submission_id, week_start, period, result)
                SELECT $1::text, $2::uuid, $3::text, $4::smallint, $5::jsonb FROM typing_kit_settings
                WHERE id = 'default' AND $3::date >= start_date::date AND $3::date <= start_date::date + 42
                ON CONFLICT (student_email, submission_id) DO NOTHING RETURNING *`,
            [email, submissionId, weekStart, period, JSON.stringify(result)]);
            let row = saved.rows[0];
            if (!row) {
                row = (await pool.query(`SELECT * FROM typing_kit_attempts WHERE student_email = $1 AND submission_id = $2`, [email, submissionId])).rows[0];
                if (!row || row.week_start !== weekStart || row.period !== period || row.result.sourceUrl !== result.sourceUrl) {
                    return res.status(409).json({ error: "The calendar changed or this submission was already used. Reload your Typing Kit before submitting again." });
                }
            }
            res.status(saved.rows.length ? 201 : 200).json({ attempt: shape(row) });
        } catch (error) { failure(res, error); }
    });
}

module.exports = { DEFAULT_START_DATE, WEEK_COUNT, PERIOD_COUNT, TYPING_KIT_CARD, withTypingKitCard, isMonday, addDays, parseTypingResult, registerTypingKit };
