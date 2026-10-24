"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
const jwt = (exp, email = "teacher@school.nz") => `eyJhbGciOiJSUzI1NiJ9.${Buffer.from(JSON.stringify({ exp, email, name: "Test Teacher" })).toString("base64url")}.signature`;
function extract(start, end) {
    const from = source.indexOf(start), to = source.indexOf(end, from);
    assert.ok(from >= 0 && to > from);
    return source.slice(from, to);
}
function fixture() {
    let raw = null;
    const context = vm.createContext({
        hubAuthState: { profile: null, idToken: null, accessToken: null, grantedScopes: "", expiresAt: 0 },
        getHubStoredAuthRaw: () => raw,
        setHubStoredAuthRaw: (value) => { raw = value; },
        clearHubStoredAuthRaw: () => { raw = null; },
        parseJwtPayload: (token) => JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()),
        normalizeEmail: (email) => String(email || "").trim().toLowerCase(),
        isAllowedHubAccount: (profile) => profile.email.endsWith("@school.nz"),
        fetchGoogleUserProfile: async () => ({ email: "teacher@school.nz" }),
        buildHubProfileFromIdTokenPayload: (payload) => ({ email: payload.email }),
        resolveHubAccessState: async () => {},
        renderHubAuthUi() {},
        fetchHubDriveSetup: async () => {}
    });
    vm.runInContext([
        extract("function getActiveHubBearerToken()", "function getActiveHubGrantedScopes()"),
        extract("function saveHubAuthState()", "function clearHubAuthState()"),
        extract("function loadHubAuthState()", "function isAllowedHubAccount("),
        extract("async function handleHubGoogleCredential(", "function signOutHubGoogle()")
    ].join("\n"), context);
    return { context, set: (value) => { raw = JSON.stringify(value); }, get: () => raw && JSON.parse(raw) };
}

test("expired tokens keep the remembered account across repeated navigation without extending token validity", () => {
    const f = fixture();
    f.set({ profile: { email: "teacher@school.nz" }, idToken: jwt(1), accessToken: "expired", expiresAt: 1 });
    f.context.loadHubAuthState();
    assert.equal(f.context.hubAuthState.profile.email, "teacher@school.nz");
    assert.equal(f.get().profile.email, "teacher@school.nz");
    assert.equal(f.context.getActiveHubBearerToken(), "");
    assert.equal(f.context.getActiveHubAccessToken(), "");
    f.context.loadHubAuthState();
    assert.equal(f.context.hubAuthState.profile.email, "teacher@school.nz");
    assert.equal(f.get().expiresAt, 0);
});

test("ID token expiry is independent from the Drive token lifetime", () => {
    const f = fixture();
    const future = Date.now() + 3600000;
    f.context.hubAuthState = { profile: { email: "teacher@school.nz" }, idToken: jwt(1), accessToken: "fresh-drive", expiresAt: future };
    assert.equal(f.context.getActiveHubBearerToken(), "fresh-drive", "Never send expired JWT merely because OAuth refreshed");
    const id = jwt(Math.floor(future / 1000));
    f.context.hubAuthState = { idToken: id, accessToken: "expired-drive", expiresAt: 1 };
    assert.equal(f.context.getActiveHubBearerToken(), id);
    assert.equal(f.context.getActiveHubAccessToken(), "");
});

test("same-account verification retains valid Drive consent; OAuth refresh discards stale or different-account identity", async () => {
    const f = fixture(), c = f.context;
    c.hubAuthState = { profile: { email: "teacher@school.nz" }, accessToken: "drive", grantedScopes: "drive.file", expiresAt: Date.now() + 3600000 };
    await c.handleHubGoogleCredential({ credential: jwt(Math.floor(Date.now() / 1000) + 3600) });
    assert.equal(c.hubAuthState.accessToken, "drive");
    assert.equal(c.hubAuthState.grantedScopes, "drive.file");
    c.hubAuthState.idToken = jwt(1);
    await c.handleHubGoogleToken({ access_token: "refreshed", expires_in: 3600 });
    assert.equal(c.hubAuthState.idToken, null);
    assert.equal(c.hubAuthState.accessToken, "refreshed");
    c.hubAuthState.idToken = jwt(Math.floor(Date.now() / 1000) + 3600);
    c.fetchGoogleUserProfile = async () => ({ email: "other@school.nz" });
    await c.handleHubGoogleToken({ access_token: "other-drive", expires_in: 3600 });
    assert.equal(c.hubAuthState.idToken, null);
    assert.equal(c.hubAuthState.profile.email, "other@school.nz");
});

test("failed refresh leaves the existing account/tokens intact and callback errors do not sign out", async () => {
    const f = fixture(), c = f.context;
    c.hubAuthState = { profile: { email: "teacher@school.nz" }, accessToken: "drive", expiresAt: Date.now() + 3600000 };
    c.saveHubAuthState();
    const before = JSON.stringify(c.hubAuthState);
    c.fetchGoogleUserProfile = async () => { throw new Error("Network unavailable"); };
    await assert.rejects(c.handleHubGoogleToken({ access_token: "new" }), /Network unavailable/);
    assert.equal(JSON.stringify(c.hubAuthState), before);
    assert.equal(f.get().profile.email, "teacher@school.nz");
    const init = source.slice(source.indexOf("function initHubGoogleAuth()"));
    assert.doesNotMatch(init, /clearHubAuthState\(\)/);
});
