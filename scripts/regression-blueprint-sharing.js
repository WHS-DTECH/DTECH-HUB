"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBlueprintSharing } = require("../practical-skills/blueprint-sharing");

function fixture({ teachers = ["teacher@school.nz"], canShare = true, mimeType = "application/vnd.google-apps.presentation",
    pages = [{ permissions: [] }], tokenError = false, failCreate = false } = {}) {
    const calls = [];
    const share = createBlueprintSharing({
        normalizeEmail: value => String(value || "").trim().toLowerCase(), schoolDomain: "school.nz",
        getTeachers: async () => teachers,
        verifyDriveTokenForStudent: async (token, email) => {
            assert.equal(email, "student@school.nz");
            if (tokenError || token !== "student-token") throw Object.assign(new Error("Wrong account"), { status: 403 });
        },
        driveApiRequest: async (path, options) => {
            calls.push({ path, ...options });
            if (!path.endsWith("/permissions")) return { id: "slides-id", mimeType, capabilities: { canShare } };
            if (options.method === "POST") {
                if (failCreate) throw Object.assign(new Error("private upstream error"), { status: 403 });
                return { id: "permission-id", ...options.body };
            }
            return options.queryParams.pageToken ? pages[1] : pages[0];
        }
    });
    const run = (overrides = {}) => share({ studentEmail: "student@school.nz", documentKey: "google-file:slides-id",
        driveAccessToken: "student-token", ...overrides });
    return { run, calls };
}

test("shares only the presentation with the configured teacher as a reader", async () => {
    const f = fixture();
    await f.run();
    const creates = f.calls.filter(call => call.method === "POST");
    assert.equal(creates.length, 1);
    assert.deepEqual(creates[0].body, { type: "user", role: "reader", emailAddress: "teacher@school.nz" });
    assert.equal(creates[0].queryParams.sendNotificationEmail, false);
    assert.ok(f.calls.every(call => call.accessToken === "student-token"));
});

test("existing teacher editor permission on a later page is retained even without share capability", async () => {
    const f = fixture({ canShare: false, pages: [
        { permissions: [], nextPageToken: "next" },
        { permissions: [{ type: "user", role: "writer", emailAddress: "Teacher@school.nz" }] }
    ] });
    await f.run();
    assert.equal(f.calls.length, 3);
    assert.equal(f.calls[2].queryParams.pageToken, "next");
    assert.ok(f.calls.every(call => call.method !== "POST"));
});

test("rejects wrong account, invalid link, missing token and non-Slides files", async () => {
    const wrong = fixture({ tokenError: true });
    await assert.rejects(wrong.run(), /Wrong account/);
    assert.equal(wrong.calls.length, 0);
    await assert.rejects(fixture().run({ documentKey: "url:somewhere" }), /Google Slides/);
    await assert.rejects(fixture().run({ driveAccessToken: "" }), /Allow Google Drive/);
    const notSlides = fixture({ mimeType: "application/pdf" });
    await assert.rejects(notSlides.run(), /Google Slides/);
    assert.equal(notSlides.calls.length, 1);
});

test("does not guess teacher or silently submit when sharing is denied", async () => {
    for (const teachers of [[], ["one@school.nz", "two@school.nz"], ["outsider@example.com"]]) {
        const f = fixture({ teachers });
        await assert.rejects(f.run(), /identified uniquely/);
        assert.equal(f.calls.length, 0);
    }
    const noShare = fixture({ canShare: false });
    await assert.rejects(noShare.run(), /owner to share/);
    assert.ok(noShare.calls.every(call => call.method !== "POST"));
    await assert.rejects(fixture({ failCreate: true }).run(), error =>
        error.status === 502 && !error.message.includes("private upstream error"));
});
