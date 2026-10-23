"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");

test("admin removal protects built-ins and retains custom kit content and progress", async () => {
    let handler;
    const auth = () => {};
    let stored = { customKit: true, identity: { name: "File Management Kit", status: "active" }, worksheets: [{ activity: "Create a folder" }] };
    let cards = [{ id: "kit-files" }, { id: "kit-login" }];
    let fail = false;
    const context = vm.createContext({
        app: { delete(_path, middleware, callback) { assert.equal(middleware, auth); handler = callback; } },
        requireAdminAccess: auth,
        customPracticalSkillsKits: new Map([["kit-files", { id: "kit-files" }]]),
        getStoredPracticalSkillsKitContent: async () => stored,
        savePracticalSkillsKitContent: async (_id, content) => {
            if (fail) throw new Error("Storage unavailable");
            stored = content;
        },
        getRequestUserEmail: () => "admin@school.nz",
        normalizeEmail: (value) => value,
        readPracticalSkillsLibraryFile: async () => cards,
        writePracticalSkillsLibraryFile: async (next) => { cards = next; }
    });
    const start = source.indexOf('app.delete("/api/admin/practical-skills/kits/:kitId"');
    const end = source.indexOf('\napp.post("/api/admin/practical-skills/kits"', start);
    vm.runInContext(source.slice(start, end), context);
    const call = async (kitId) => {
        const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
        await handler({ params: { kitId } }, res);
        return res;
    };
    assert.equal((await call("kit-login")).code, 403);
    assert.equal((await call("kit-typing")).code, 403);
    assert.equal((await call("kit-files")).code, 200);
    assert.equal(stored.identity.status, "archive");
    assert.ok(stored.deletedAt);
    assert.equal(stored.worksheets[0].activity, "Create a folder");
    assert.equal(cards.length, 1);
    assert.equal(cards[0].id, "kit-login");
    assert.equal((await call("kit-files")).code, 200, "Removal can safely be retried");
    fail = true;
    assert.equal((await call("kit-files")).code, 500);
    assert.doesNotMatch(source.slice(start, end), /DELETE FROM|setPracticalSkillsKitCompletion|memoryPracticalSkillsProgress\.delete/);
});
