"use strict";

const path = require("node:path");

const RENDER_NOTICE = {
  title: "Render: Ghostscript / ImageMagick - Upload2Shell",
  reference: "CVE-2026-125396",
  severity: "high",
  status: "verification-required",
  notice: "Render notice supplied on 26 November 2026: researchers disclosed Upload2Shell on 21 November. Ghostscript processing a maliciously crafted file may allow remote code execution, including indirect use through ImageMagick or Pillow.",
  remediation: "Render says native runtimes include patched Ghostscript after 20 November 2026 at 20:00 UTC. Confirm a successful deployment after that cutoff. Docker services or services bundling Ghostscript must update that copy before redeploying.",
  verification: "NVD lists CVE-2026-125396 as HIGH (CVSS 4.0: 8.5), affecting Ghostscript before 10.08.0. Repository inspection: render.yaml declares a native Node runtime. No Ghostscript, ImageMagick or Pillow dependency or invocation was identified in the application or lockfile. This does not verify installed system packages or the deployed runtime. Confirm the Render deployment and runtime before marking resolved.",
  sourceUrl: "https://nvd.nist.gov/vuln/detail/CVE-2026-125396",
  receivedOn: "2026-11-26"
};
const STATUSES = ["verification-required", "in-progress", "resolved", "not-affected"];
const SEVERITIES = ["critical", "high", "medium", "low"];

function validateNotice(body) {
  const limits = { title: 200, reference: 100, notice: 12000, remediation: 12000, verification: 12000, sourceUrl: 2000 };
  const value = {};
  for (const [key, limit] of Object.entries(limits)) {
    if (typeof body?.[key] !== "string" || body[key].trim().length > limit) {
      throw Object.assign(new Error(`Enter valid ${key} text (maximum ${limit} characters).`), { status: 400 });
    }
    value[key] = body[key].trim();
  }
  if (!value.title || !value.notice || !SEVERITIES.includes(body.severity) || !STATUSES.includes(body.status)) {
    throw Object.assign(new Error("Title, notice, severity and status are required."), { status: 400 });
  }
  if (value.sourceUrl) {
    let url;
    try { url = new URL(value.sourceUrl); } catch { /* Report invalid input below. */ }
    if (!url || url.protocol !== "https:" || url.username || url.password) {
      throw Object.assign(new Error("The source link must be an HTTPS URL without credentials."), { status: 400 });
    }
  }
  if (typeof body.receivedOn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.receivedOn)
    || !Number.isFinite(Date.parse(body.receivedOn)) || new Date(body.receivedOn).toISOString().slice(0, 10) !== body.receivedOn) {
    throw Object.assign(new Error("Enter a valid received date."), { status: 400 });
  }
  if (["resolved", "not-affected"].includes(body.status) && !value.verification) {
    throw Object.assign(new Error("Record verification evidence before closing a notice."), { status: 400 });
  }
  return { ...value, severity: body.severity, status: body.status, receivedOn: body.receivedOn };
}

function registerSecurityNotices(app, { pool, hasDatabase, getVerifiedEmail, isAdmin }) {
  let schema;
  async function ensureSchema() {
    if (!hasDatabase) throw Object.assign(new Error("Security notices require the persistent database."), { status: 503 });
    if (!schema) {
      schema = (async () => {
        await pool.query(`CREATE TABLE IF NOT EXISTS security_notices (
          id BIGSERIAL PRIMARY KEY, seed_key TEXT UNIQUE, details JSONB NOT NULL,
          history JSONB NOT NULL DEFAULT '[]'::jsonb,
          version INTEGER NOT NULL DEFAULT 1,
          created_by TEXT NOT NULL, updated_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`);
        await pool.query(`INSERT INTO security_notices (seed_key, details, created_by, updated_by)
          VALUES ($1, $2::jsonb, 'system', 'system') ON CONFLICT (seed_key) DO NOTHING`,
        ["render-upload2shell-2026", JSON.stringify(RENDER_NOTICE)]);
      })().catch((error) => { schema = null; throw error; });
    }
    await schema;
  }
  async function authorize(req, res, next) {
    res.set("Cache-Control", "private, no-store");
    const email = getVerifiedEmail(req);
    if (!email) return res.status(401).json({ error: "Verified school Google sign-in is required." });
    try {
      if (!await isAdmin(email)) return res.status(403).json({ error: "Admin access is required." });
      req.security_notice_actor = email;
      next();
    } catch (error) {
      console.error("[security-notices] Access check failed:", error);
      res.status(503).json({ error: "Could not verify Admin access. Please retry." });
    }
  }
  function failure(res, error) {
    if (!error.status || error.status >= 500) console.error("[security-notices]", error);
    res.status(error.status || 500).json({ error: error.status ? error.message : "Could not save or load security notices." });
  }
  app.use("/.security-notices", (_req, res) => res.sendStatus(404));
  app.use("/api/admin/security-notices", authorize);
  app.get("/api/admin/security-notices", async (_req, res) => {
    try {
      await ensureSchema();
      const { rows } = await pool.query("SELECT * FROM security_notices ORDER BY updated_at DESC, id DESC");
      res.json({ notices: rows });
    } catch (error) { failure(res, error); }
  });
  app.get("/api/admin/security-notices/render-evidence", (_req, res) => {
    res.set("X-Content-Type-Options", "nosniff");
    res.sendFile(path.join(__dirname, "render-upload2shell.png"), { dotfiles: "allow" });
  });
  app.post("/api/admin/security-notices", async (req, res) => {
    try {
      const details = validateNotice(req.body);
      await ensureSchema();
      const { rows } = await pool.query(`INSERT INTO security_notices (details, created_by, updated_by)
        VALUES ($1::jsonb, $2, $2) RETURNING *`, [JSON.stringify(details), req.security_notice_actor]);
      res.status(201).json({ notice: rows[0] });
    } catch (error) { failure(res, error); }
  });
  app.put("/api/admin/security-notices/:id", async (req, res) => {
    try {
      if (!/^[1-9]\d{0,17}$/.test(req.params.id) || !Number.isSafeInteger(req.body?.version) || req.body.version < 1) {
        throw Object.assign(new Error("A valid notice ID and version are required."), { status: 400 });
      }
      const details = validateNotice(req.body);
      await ensureSchema();
      const { rows } = await pool.query(`UPDATE security_notices SET
        history = history || jsonb_build_array(jsonb_build_object(
          'details', details, 'version', version, 'updated_by', updated_by, 'updated_at', updated_at)),
        details = $1::jsonb, updated_by = $2, updated_at = NOW(), version = version + 1
        WHERE id = $3 AND version = $4 RETURNING *`,
      [JSON.stringify(details), req.security_notice_actor, req.params.id, req.body.version]);
      if (!rows.length) return res.status(409).json({ error: "Notice changed or no longer exists. Reload before saving." });
      res.json({ notice: rows[0] });
    } catch (error) { failure(res, error); }
  });
}

module.exports = { registerSecurityNotices, validateNotice };
