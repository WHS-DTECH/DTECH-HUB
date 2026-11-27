"use strict";

const { createHash, randomBytes } = require("node:crypto");

const COOKIE = "hub_session";
const SESSION_SECONDS = 8 * 60 * 60;
const publicFiles = new Set([
    "/", "/index.html", "/styles.css", "/script.js",
    "/images/favicon.ico", "/images/whs logo circular reo .png"
]);
const webhooks = new Set([
    "/api/integrations/external-exam-intention",
    "/api/integrations/external-exam-intentions/sync"
]);

function sessionHash(token) {
    return createHash("sha256").update(token).digest("hex");
}

function sessionCookie(req, maxAge) {
    return {
        httpOnly: true,
        sameSite: "lax",
        secure: req.secure,
        path: "/",
        maxAge
    };
}

function readSessionCookie(req) {
    const cookies = String(req.headers.cookie || "").split(";");
    const matches = cookies.map((cookie) => cookie.trim()).filter((cookie) => cookie.startsWith(`${COOKIE}=`));
    if (matches.length !== 1) return "";
    const token = matches[0].slice(COOKIE.length + 1);
    return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : "";
}

function isSameOrigin(req) {
    if (req.get("sec-fetch-site") === "cross-site") return false;
    const origin = req.get("origin");
    if (!origin) return true;
    try {
        const parsed = new URL(origin);
        return parsed.host === req.get("host") && parsed.protocol === `${req.protocol}:`;
    } catch {
        return false;
    }
}

function registerHubAccess(app, { pool, authenticateRequest }) {
    let schemaPromise;
    function ensureSchema() {
        if (!schemaPromise) {
            schemaPromise = pool.query(`CREATE TABLE IF NOT EXISTS hub_sessions (
                token_hash TEXT PRIMARY KEY,
                email TEXT NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL
            )`).catch((error) => {
                schemaPromise = null;
                throw error;
            });
        }
        return schemaPromise;
    }

    app.use(authenticateRequest);
    app.use(async (req, res, next) => {
        const sessionToken = readSessionCookie(req);
        req.hubSessionToken = sessionToken;
        if (!sessionToken || req.auth_identity?.token_present) return next();
        try {
            await ensureSchema();
            const result = await pool.query(
                "SELECT email FROM hub_sessions WHERE token_hash = $1 AND expires_at > NOW()",
                [sessionHash(sessionToken)]
            );
            if (result.rows[0]) {
                req.auth_identity = { mode: "session", token_present: false, verified: true, source: "session", email: result.rows[0].email, error: "" };
                req.authenticated_email = result.rows[0].email;
            }
            return next();
        } catch (error) {
            console.error("[hub-session] Could not verify session:", error.message);
            return res.status(503).json({ error: "Sign-in verification is unavailable. Please retry." });
        }
    });

    app.post("/api/auth/session", async (req, res) => {
        res.set("Cache-Control", "no-store");
        if (!isSameOrigin(req)) return res.status(403).json({ error: "Cross-site sign-in is not allowed." });
        if (!req.auth_identity?.verified || !req.auth_identity.token_present) {
            return res.status(401).json({ error: "Verified Google sign-in is required." });
        }
        const lifetime = Math.min(SESSION_SECONDS, Math.floor((Number(req.auth_identity.expiresAt) - Date.now()) / 1000));
        if (!Number.isFinite(lifetime) || lifetime <= 0) {
            return res.status(401).json({ error: "Google sign-in has expired. Please sign in again." });
        }
        try {
            await ensureSchema();
            const token = randomBytes(32).toString("base64url");
            await pool.query("DELETE FROM hub_sessions WHERE expires_at <= NOW()");
            await pool.query(
                "INSERT INTO hub_sessions (token_hash, email, expires_at) VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 second'))",
                [sessionHash(token), req.auth_identity.email, lifetime]
            );
            if (req.hubSessionToken) {
                await pool.query("DELETE FROM hub_sessions WHERE token_hash = $1", [sessionHash(req.hubSessionToken)]);
            }
            res.cookie(COOKIE, token, sessionCookie(req, lifetime * 1000));
            return res.status(204).end();
        } catch (error) {
            console.error("[hub-session] Could not create session:", error.message);
            return res.status(503).json({ error: "Could not establish a sign-in session. Please retry." });
        }
    });

    app.get("/api/auth/session", (req, res) => {
        res.set("Cache-Control", "no-store");
        if (!req.auth_identity?.verified) return res.status(401).json({ error: "Sign in is required." });
        return res.json({ email: req.auth_identity.email });
    });

    app.delete("/api/auth/session", async (req, res) => {
        res.set("Cache-Control", "no-store");
        if (!isSameOrigin(req)) return res.status(403).json({ error: "Cross-site sign-out is not allowed." });
        try {
            if (req.hubSessionToken) {
                await ensureSchema();
                await pool.query("DELETE FROM hub_sessions WHERE token_hash = $1", [sessionHash(req.hubSessionToken)]);
            }
            res.clearCookie(COOKIE, sessionCookie(req));
            return res.status(204).end();
        } catch (error) {
            console.error("[hub-session] Could not end session:", error.message);
            return res.status(503).json({ error: "Could not sign out. Please retry." });
        }
    });

    app.use((req, res, next) => {
        let path;
        try {
            path = decodeURIComponent(req.path);
        } catch {
            return res.status(400).json({ error: "Invalid request path." });
        }
        const publicGet = (req.method === "GET" || req.method === "HEAD") &&
            (publicFiles.has(path) || path === "/health" || path === "/api/health");
        if (publicGet) {
            if (path === "/" || path === "/index.html" || path === "/script.js") res.set("Cache-Control", "no-cache");
            return next();
        }
        if (req.method === "POST" && webhooks.has(path)) return next();
        if (!req.auth_identity?.verified) {
            res.set("Cache-Control", "no-store");
            if ((req.method === "GET" || req.method === "HEAD") &&
                !path.startsWith("/api/") && (path.endsWith(".html") || path.endsWith("/") ||
                    String(req.get("accept") || "").includes("text/html"))) {
                return res.redirect(302, `/?next=${encodeURIComponent(req.originalUrl)}`);
            }
            return res.status(401).json({ error: "Sign in with your school account to access DTECH-HUB." });
        }
        if (req.hubSessionToken && !["GET", "HEAD", "OPTIONS"].includes(req.method) && !isSameOrigin(req)) {
            return res.status(403).json({ error: "Cross-site requests are not allowed." });
        }
        res.set("Cache-Control", "private, no-store");
        return next();
    });
}

module.exports = { registerHubAccess };
