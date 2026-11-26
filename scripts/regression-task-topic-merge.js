"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
const topics = ["Explaining relevant implications.", "Addressing relevant implications."];

function fixture() {
    const stored = new Map();
    let writes = 0;
    const context = vm.createContext({
        TASK_TOPIC_MERGE_PREFS_KEY: "merge-preferences",
        localStorage: {
            getItem: (key) => stored.get(key) || null,
            setItem: (key, value) => { writes++; stored.set(key, value); }
        },
        hasAllowedSignedInHubAccount: () => true,
        hubAccessState: { canAdmin: true },
        window: { confirm() { throw new Error("Rendering must not ask automatic merge questions."); } }
    });
    const start = source.indexOf("function readTaskTopicMergePrefs(");
    const end = source.indexOf("function shouldHideStudentAssessmentTask(", start);
    assert.ok(start >= 0 && end > start);
    vm.runInContext(source.slice(start, end), context);
    return { context, writes: () => writes };
}

test("duplicate-topic rendering keeps topics separate without prompting or writing a merge decision", () => {
    const f = fixture();
    assert.equal(f.context.resolveTaskTopicMergeDecision({ id: "53", title: "Animation" }, topics), false);
    assert.equal(f.context.resolveTaskTopicMergeDecision({ id: "53", title: "Animation" }, topics), false);
    assert.equal(f.writes(), 0);
});

test("explicit manual merge and unmerge preferences still work without automatic prompts", () => {
    const f = fixture();
    f.context.setTaskTopicMergePreference("53", topics, true);
    assert.equal(f.context.resolveTaskTopicMergeDecision({ id: "53" }, topics), true);
    assert.equal(f.writes(), 1);
    f.context.clearTaskTopicMergePreference("53", topics);
    assert.equal(f.context.resolveTaskTopicMergeDecision({ id: "53" }, topics), false);
    assert.equal(f.writes(), 2);
    f.context.setTaskTopicMergePreference("53", topics, false);
    assert.equal(f.context.resolveTaskTopicMergeDecision({ id: "53" }, topics), false);
    assert.equal(f.writes(), 3);
    f.context.hubAccessState.canAdmin = false;
    assert.equal(f.context.resolveTaskTopicMergeDecision({ id: "53" }, topics), false);
    assert.equal(f.writes(), 3);
});
