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
            return makeResponse(401, { message: "Bad credentials" });
        }
    });
    vm.runInContext(`const GITHUB_TOKEN = "invalid-token"; ${helper}`, context);
    await assert.rejects(
        context.githubApiRequest("/repos/student/project"),
        (error) => error.status === 503 && /GITHUB_TOKEN was rejected/.test(error.message)
    );
    assert.equal(calls.length, 1, "A rejected token is not retried anonymously");
    assert.ok(calls[0].headers.Authorization, "The configured token is attempted first");

    const anonymousCalls = [];
    const anonymousContext = vm.createContext({
        URLSearchParams,
        fetch: async (_url, options) => {
            anonymousCalls.push(options.headers);
            return makeResponse(200, { ok: true });
        }
    });
    vm.runInContext(`const GITHUB_TOKEN = ""; ${helper}`, anonymousContext);
    await assert.rejects(
        anonymousContext.githubApiRequest("/repos/student/project"),
        (error) => error.status === 503 && /GITHUB_TOKEN is not configured/.test(error.message)
    );
    assert.equal(anonymousCalls.length, 0, "Requests without a token do not consume the shared anonymous quota");
}

main().then(() => {
    console.log("GitHub public API credential regressions passed.");
}).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
