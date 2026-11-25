"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const path = require("node:path");
const { registerSecurityNotices, validateNotice } = require("../.security-notices/store");

const valid = {
  title: "Test advisory", reference: "CVE-test", severity: "high", status: "verification-required",
  notice: "Test notice", remediation: "", verification: "", sourceUrl: "https://example.org/advisory",
  receivedOn: "2026-11-26"
};
async function fixture(t, { database = true, conflict = false } = {}) {
  const queries = [];
  let saved;
  const pool = {
    async query(sql, params) {
      queries.push({ sql, params });
      if (sql.includes("RETURNING")) {
        saved = { id: "1", details: JSON.parse(params[0]), version: 1 };
        return { rows: conflict ? [] : [saved] };
      }
      return { rows: saved ? [saved] : [] };
    }
  };
  const app = express();
  app.use(express.json());
  registerSecurityNotices(app, {
    pool, hasDatabase: database,
    getVerifiedEmail: (req) => req.headers.authorization === "Bearer admin" ? "admin@school.nz"
      : req.headers.authorization === "Bearer student" ? "student@school.nz" : "",
    isAdmin: async (email) => email === "admin@school.nz"
  });
  app.use(express.static(path.join(__dirname, ".."), { dotfiles: "ignore" }));
  const server = await new Promise((resolve) => { const instance = app.listen(0, "127.0.0.1", () => resolve(instance)); });
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const request = (suffix = "", options = {}) => fetch(`http://127.0.0.1:${server.address().port}/api/admin/security-notices${suffix}`, options);
  return { queries, request, base: `http://127.0.0.1:${server.address().port}` };
}
const json = (body, method = "POST") => ({
  method, headers: { Authorization: "Bearer admin", "Content-Type": "application/json" }, body: JSON.stringify(body)
});

test("notice API rejects unsigned identities and forged Admin role hints before touching the database", async (t) => {
  const f = await fixture(t);
  for (const options of [
    { headers: { "x-user-email": "admin@school.nz", "x-user-role": "admin" } },
    { headers: { Authorization: "Bearer invalid", "x-user-role": "admin" } },
    { headers: { Authorization: "Bearer student", "x-user-role": "admin" } }
  ]) {
    const r = await f.request("", options);
    assert.equal(r.status, options.headers.Authorization === "Bearer student" ? 403 : 401);
    assert.match(r.headers.get("cache-control"), /no-store/);
  }
  assert.equal(f.queries.length, 0);
  for (const method of ["POST", "PUT"]) {
    const response = await f.request(method === "PUT" ? "/1" : "", { method, headers: { "x-user-role": "admin" } });
    assert.equal(response.status, 401);
  }
  assert.equal((await f.request("/render-evidence")).status, 401);
});

test("original image and seed source cannot be retrieved as static files", async (t) => {
  const f = await fixture(t);
  for (const suffix of ["/.security-notices/render-upload2shell.png", "/.security-notices/store.js",
    "/%2esecurity-notices/render-upload2shell.png", "/%2esecurity-notices/store.js"]) {
    assert.equal((await fetch(f.base + suffix)).status, 404, suffix);
  }
  const image = await f.request("/render-evidence", { headers: { Authorization: "Bearer admin" } });
  assert.equal(image.status, 200);
  assert.equal(image.headers.get("content-type"), "image/png");
  assert.match(image.headers.get("cache-control"), /no-store/);
});

test("database failure is explicit; notices never fall back to ephemeral storage", async (t) => {
  const f = await fixture(t, { database: false });
  const response = await f.request("", { headers: { Authorization: "Bearer admin" } });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /persistent database/);
  assert.equal(f.queries.length, 0);
});

test("Admin can persist and reload a notice; seed is idempotent and user text is parameterized", async (t) => {
  const f = await fixture(t);
  const title = "'); DROP TABLE security_notices; -- <img src=x onerror=alert(1)>";
  const created = await f.request("", json({ ...valid, title }));
  assert.equal(created.status, 201);
  const listed = await f.request("", { headers: { Authorization: "Bearer admin" } });
  assert.equal((await listed.json()).notices[0].details.title, title);
  assert.equal(f.queries.filter(({ sql }) => sql.includes("ON CONFLICT")).length, 1);
  assert.ok(f.queries.every(({ sql }) => !sql.includes(title)));
});

test("updates preserve previous details and require the current version", async (t) => {
  const f = await fixture(t, { conflict: true });
  const response = await f.request("/1", json({ ...valid, version: 1 }, "PUT"));
  assert.equal(response.status, 409);
  const update = f.queries.find(({ sql }) => sql.startsWith("UPDATE"));
  assert.match(update.sql, /history = history \|\| jsonb_build_array/);
  assert.match(update.sql, /WHERE id = \$3 AND version = \$4/);
  assert.deepEqual(update.params.slice(1), ["admin@school.nz", "1", 1]);
});

test("closing a notice requires evidence; unsafe URLs, dates and oversized text are rejected", () => {
  assert.throws(() => validateNotice({ ...valid, status: "resolved" }), /verification evidence/);
  assert.throws(() => validateNotice({ ...valid, sourceUrl: "javascript:alert(1)" }), /HTTPS/);
  assert.throws(() => validateNotice({ ...valid, sourceUrl: "https://user:secret@example.org" }), /credentials/);
  assert.throws(() => validateNotice({ ...valid, receivedOn: "2026-02-30" }), /valid received date/);
  assert.throws(() => validateNotice({ ...valid, notice: "a".repeat(12001) }), /maximum/);
  assert.equal(validateNotice({ ...valid, status: "resolved", verification: "Verified patched runtime in deployment logs." }).status, "resolved");
});
