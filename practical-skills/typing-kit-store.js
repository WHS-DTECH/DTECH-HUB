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

// Final Typing Kit classes are on Friday of Week 7, so the certificate unlocks then (NZ time), not per session.
const CERTIFICATE_UNLOCK_OFFSET_DAYS = (WEEK_COUNT - 1) * 7 + 4;

function certificateUnlockDate(startDate) {
    return addDays(startDate, CERTIFICATE_UNLOCK_OFFSET_DAYS);
}

function nzDate(now = new Date()) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit" })
        .formatToParts(now).map((part) => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
}

function typingCertificateEligible(startDate, attempts, now = new Date()) {
    const lastWeek = addDays(startDate, (WEEK_COUNT - 1) * 7);
    return nzDate(now) >= certificateUnlockDate(startDate)
        && attempts.some((row) => row.week_start >= startDate && row.week_start <= lastWeek);
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

function registerTypingKit(app, { pool, hasDatabase, normalizeEmail, schoolDomain, canManagePracticalSchedule, verifyGoogleAccessTokenAndExtractIdentity,
    certificates = null, now = () => new Date() }) {
    let schemaReady;
    const certificateEmailCooldowns = new Map();
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
    const identity = async (req, res) => {
        res.set("Cache-Control", "no-store");
        let email = req.auth_identity?.verified === true && req.auth_identity.source === "google_id_token"
            ? normalizeEmail(req.auth_identity.email) : "";
        if (!email && verifyGoogleAccessTokenAndExtractIdentity) {
            const token = String(req.headers?.authorization || "").match(/^Bearer\s+(\S+)$/i)?.[1];
            if (token) {
                try {
                    const verified = await verifyGoogleAccessTokenAndExtractIdentity(token);
                    if (verified.ok) email = normalizeEmail(verified.email);
                } catch (error) {
                    console.error("[typing-kit] Google identity check failed:", error.message);
                    res.status(503).json({ error: "Google identity verification is temporarily unavailable. Please retry." });
                    return "";
                }
            }
        }
        if (!email) {
            res.status(401).json({ error: "A verified Google sign-in is required. Sign out, then sign in with your school Google account again." });
            return "";
        }
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
    // Issues the completion record only from Friday of Week 7; earlier log sessions never create a certificate.
    async function certificateFor(req, email, startDate, attempts) {
        if (!certificates) return null;
        return certificates.get(req, email, {
            eligible: typingCertificateEligible(startDate, attempts, now()),
            issuedOn: certificateUnlockDate(startDate)
        });
    }
    async function loadAttempts(email) {
        return (await pool.query(`SELECT * FROM typing_kit_attempts WHERE student_email = $1 ORDER BY submitted_at, id`, [email])).rows;
    }
    async function requiredCertificate(req, res, email) {
        await ensureSchema();
        const startDate = await settings();
        const certificate = await certificateFor(req, email, startDate, await loadAttempts(email));
        if (!certificate) {
            const unlock = new Intl.DateTimeFormat("en-NZ", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
                .format(new Date(`${certificateUnlockDate(startDate)}T00:00:00Z`));
            res.status(409).json({ error: `Your Typing Kit certificate unlocks at the end of Week 7 (${unlock}) once you have saved a result.` });
        }
        return certificate;
    }

    app.get("/api/practical-skills/typing-kit", async (req, res) => {
        const email = await identity(req, res);
        if (!email) return;
        res.set("Cache-Control", "no-store");
        try {
            await ensureSchema();
            const [startDate, attempts, canManage] = await Promise.all([settings(), loadAttempts(email), canManagePracticalSchedule(email)]);
            const readOnly = res.locals.kitPreview === true;
            let certificate = null;
            let certificateEmailed = false;
            if (!readOnly) {
                try {
                    certificate = await certificateFor(req, email, startDate, attempts);
                    if (certificate) certificateEmailed = await certificates.autoEmail(email, certificate);
                } catch (error) {
                    console.error("[typing-kit] Certificate check failed; the log is still available:", error);
                }
            }
            res.json({ startDate, weekCount: WEEK_COUNT, periodsPerWeek: PERIOD_COUNT, canManage,
                readOnly, attempts: attempts.map(shape),
                certificateUnlockDate: certificateUnlockDate(startDate), certificate, certificateEmailed });
        } catch (error) { failure(res, error); }
    });

    app.get("/api/practical-skills/typing-kit/certificate.pdf", async (req, res) => {
        const email = await identity(req, res);
        if (!email) return;
        try {
            const certificate = await requiredCertificate(req, res, email);
            if (!certificate) return;
            const buffer = await certificates.createPdf(certificate);
            res.set("Cache-Control", "private, no-store");
            res.type("application/pdf").attachment("kit-typing-certificate.pdf").send(buffer);
        } catch (error) { failure(res, error); }
    });

    app.post("/api/practical-skills/typing-kit/certificate/email", async (req, res) => {
        const email = await identity(req, res);
        if (!email) return;
        if (!certificates?.emailConfigured()) {
            return res.status(503).json({ error: "Email is not configured on the hub. You can still download or print your certificate." });
        }
        for (const [entry, expires] of certificateEmailCooldowns) {
            if (expires <= Date.now()) certificateEmailCooldowns.delete(entry);
        }
        if (certificateEmailCooldowns.has(email)) return res.status(429).json({ error: "Please wait a minute before emailing another copy." });
        certificateEmailCooldowns.set(email, Date.now() + 60000);
        try {
            const certificate = await requiredCertificate(req, res, email);
            if (!certificate) return certificateEmailCooldowns.delete(email);
            await certificates.send(email, certificate);
            res.json({ sent: true, recipient: email });
        } catch (error) {
            certificateEmailCooldowns.delete(email);
            console.error("[typing-kit] Could not email certificate:", error);
            res.status(error.status || 500).json({ error: certificates.emailErrorMessage?.(error) || "Could not email your certificate." });
        }
    });

    app.put("/api/practical-skills/typing-kit/settings", async (req, res) => {
        const email = await identity(req, res);
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
        const email = await identity(req, res);
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

module.exports = { DEFAULT_START_DATE, WEEK_COUNT, PERIOD_COUNT, TYPING_KIT_CARD, withTypingKitCard, isMonday, addDays, parseTypingResult,
    certificateUnlockDate, typingCertificateEligible, registerTypingKit };
