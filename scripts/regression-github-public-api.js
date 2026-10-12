"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

async function main() {
    const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
    const start = server.indexOf("async function githubApiRequest(");
    const end = server.indexOf("\nfunction computeGithubEfficientToolsCategories(", start);
    assert.ok(start >= 0 && end > start, "GitHub API helper is present");
    const helper = server.slice(start, end);
    const makeResponse = (status, payload) => ({
        status,
        ok: status >= 200 && status < 300,
        json: async () => payload
    });
    const calls = [];
    const context = vm.createContext({
        URLSearchParams,
        fetch: async (url, options) => {
            calls.push({ url, headers: options.headers });
            return calls.length === 1
                ? makeResponse(401, { message: "Bad credentials" })
                : makeResponse(200, { default_branch: "main" });
        }
    });
    vm.runInContext(`const GITHUB_TOKEN = "invalid-token"; ${helper}`, context);
    const result = await context.githubApiRequest("/repos/student/project");
    assert.equal(result.default_branch, "main", "A rejected token falls back to anonymous public access");
    assert.equal(calls.length, 2, "The request is retried only once");
    assert.ok(calls[0].headers.Authorization, "The configured token is attempted first");
    assert.ok(!("Authorization" in calls[1].headers), "The fallback request omits Authorization");

    const anonymousCalls = [];
    const anonymousContext = vm.createContext({
        URLSearchParams,
        fetch: async (_url, options) => {
            anonymousCalls.push(options.headers);
            return makeResponse(200, { ok: true });
        }
    });
    vm.runInContext(`const GITHUB_TOKEN = ""; ${helper}`, anonymousContext);
    await anonymousContext.githubApiRequest("/repos/student/project");
    assert.equal(anonymousCalls.length, 1, "Requests without a token are not duplicated");
    assert.ok(!("Authorization" in anonymousCalls[0]), "Anonymous requests remain unauthenticated");
}

main().then(() => {
    console.log("GitHub public API credential fallback regressions passed.");
}).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
