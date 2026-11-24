"use strict";

const { studentUrl } = require("./activity-blocks");

const PLAYER = "kit-minecraft";
const BUILDER = "kit-minecraft-builder-kit";
const LICENCE = "/practical-skills/checklist.html";
const PLAYER_URL = `/practical-skills/kit-worksheet.html?kit=${PLAYER}`;
const STATUS_PATH = "/api/practical-skills/minecraft-access";
const BUILDER_MESSAGE = "Complete Minecraft Player Kit before opening Minecraft Builder Kit.";
const PAUSE_MESSAGE = "You already saved your Blueprint Mission slideshow link. Complete Minecraft Player Kit to unlock the rest of DTECH-HUB.";
const kitRoute = /^\/api\/practical-skills\/(?:kit-content|progress|blocks|research-report)\/([^/]+)(?:\/|$)/i;
const allowedDuringPause = /^(?:\/api\/auth\/user-access|\/api\/practical-skills\/(?:minecraft-access|my-progress|my-course|minecraft-exports-folder)|\/api\/student\/(?:login-drive-setup|drive-setup(?:\/(?:status|confirm))?))\/?$/i;

function minecraftAccess(rows) {
    const playerComplete = rows.some((row) => row.kit_id === PLAYER && row.completed === true);
    if (playerComplete) return { builderLocked: false, hubPaused: false };
    const hubPaused = rows.some((row) => [BUILDER, PLAYER].includes(row.kit_id) &&
        Object.entries(row.responses || {}).some(([key, answers]) => /^\d+-blocks$/.test(key) &&
            typeof answers?.["blueprint-slideshow-link"] === "string" &&
            Boolean(studentUrl(answers["blueprint-slideshow-link"]))));
    return { builderLocked: true, hubPaused };
}

function createMinecraftPrerequisite({ getVerifiedEmail, getProgress, isStaff }) {
    const checks = new WeakMap();
    function check(req) {
        if (!checks.has(req)) checks.set(req, (async () => {
            const email = getVerifiedEmail(req);
            if (!email) return null;
            return { email, ...minecraftAccess(await getProgress(email)) };
        })());
        return checks.get(req);
    }

    async function status(req) {
        const access = await check(req);
        if (!access) return null;
        const locked = access.builderLocked && !await isStaff(access.email);
        return { builderLocked: locked, hubPaused: locked && access.hubPaused };
    }

    async function gate(req, res, next) {
        const path = req.path;
        if (!/^\/api\//i.test(path)) return next();
        const match = kitRoute.exec(path);
        let kit;
        try {
            kit = match ? decodeURIComponent(match[1]).trim().toLowerCase() :
                /^\/api\/practical-skills\/blueprint-team(?:\/|$)/i.test(path) ? BUILDER : "";
        } catch {
            return res.status(400).json({ error: "Invalid kit link." });
        }
        if (kit === PLAYER || allowedDuringPause.test(path)) return next();
        if (!getVerifiedEmail(req) && kit !== BUILDER) return next();
        try {
            const access = await check(req);
            if (!access || ((access.hubPaused || (kit === BUILDER && access.builderLocked)) && !await isStaff(access.email))) {
                res.set("Cache-Control", "private, no-store");
                if (!access) return res.status(401).json({ error: "Sign in with your school account to open Minecraft Builder Kit." });
                return res.status(403).json({
                    error: access.hubPaused ? PAUSE_MESSAGE : BUILDER_MESSAGE,
                    code: access.hubPaused ? "minecraft-hub-paused" : "minecraft-builder-locked",
                    licenceUrl: LICENCE, playerUrl: PLAYER_URL
                });
            }
            return next();
        } catch (error) {
            console.error("[minecraft-prerequisite] Could not check access:", error.message);
            return res.status(503).json({ error: "Could not check Minecraft Player Kit progress. Please retry." });
        }
    }

    function register(app) {
        app.get(STATUS_PATH, async (req, res) => {
            res.set("Cache-Control", "private, no-store");
            try {
                const access = await status(req);
                if (!access) return res.status(401).json({ error: "School sign-in required." });
                return res.json({ ...access, licenceUrl: LICENCE, playerUrl: PLAYER_URL, message: PAUSE_MESSAGE });
            } catch (error) {
                console.error("[minecraft-prerequisite] Could not load status:", error.message);
                return res.status(503).json({ error: "Could not check Minecraft Player Kit progress. Please retry." });
            }
        });
    }
    return { gate, register, status };
}

module.exports = { createMinecraftPrerequisite, PLAYER, BUILDER };
