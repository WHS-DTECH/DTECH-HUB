"use strict";

const myLessonsUnits = document.querySelector("#my-lessons-units");
const myLessonsStatus = document.querySelector("#my-lessons-status");
const myLessonsRetry = document.querySelector("#my-lessons-retry");
let myLessonsRequest = 0;

function getMyLessonsGroups(cards) {
    if (!Array.isArray(cards) || cards.some((card) => !card || typeof card.id !== "string"
        || !card.id.trim() || typeof card.title !== "string" || !card.title.trim())) {
        throw new Error("Learning Pathways library is invalid.");
    }
    const byId = new Map(cards.map((card) => [card.id, card]));
    if (byId.size !== cards.length) throw new Error("Learning Pathways contains duplicate card IDs.");
    const units = cards.filter((card) => card.cardType === "unit" && card.status === "active")
        .sort((left, right) => left.title.localeCompare(right.title));
    const groups = new Map(units.map((unit) => [unit.id, { unit, activities: [] }]));
    for (const activity of cards) {
        if (activity.cardType !== "activity" || activity.status !== "active" || !activity.href) continue;
        const lesson = byId.get(activity.lesson);
        const unit = byId.get(lesson?.unit);
        if (lesson?.cardType !== "lesson" || unit?.cardType !== "unit") {
            throw new Error(`"${activity.title}" needs a valid parent Lesson and Unit.`);
        }
        if (lesson.status !== "active" || unit.status !== "active") continue;
        if (typeof activity.href !== "string" || !activity.href.startsWith("/")
            || activity.href.startsWith("//") || activity.href.includes("\\")) {
            throw new Error(`"${activity.title}" has an invalid activity link.`);
        }
        const url = new URL(activity.href, window.location.origin);
        if (url.origin !== window.location.origin || !url.pathname.startsWith("/learning-pathways/")) {
            throw new Error(`"${activity.title}" has an invalid activity link.`);
        }
        groups.get(unit.id).activities.push({ activity, lesson });
    }
    const sequence = (card) => Number.isFinite(card.sequence) ? card.sequence : Number.MAX_SAFE_INTEGER;
    for (const group of groups.values()) {
        group.activities.sort((left, right) => sequence(left.lesson) - sequence(right.lesson)
            || left.lesson.title.localeCompare(right.lesson.title)
            || sequence(left.activity) - sequence(right.activity)
            || left.activity.title.localeCompare(right.activity.title));
    }
    return [...groups.values()];
}

function renderMyLessonsIdentity() {
    const signedIn = hasAllowedSignedInHubAccount();
    document.querySelector("#my-lessons-student-name").textContent = signedIn
        ? getHubDisplayName(hubAuthState.profile) : "Your Pathways lessons";
    document.querySelector("#my-lessons-student-email").textContent = signedIn
        ? hubAuthState.profile.email : "Sign in with your school account to show your name.";
}

async function loadMyLessons() {
    const request = ++myLessonsRequest;
    myLessonsUnits.replaceChildren();
    myLessonsUnits.hidden = true;
    myLessonsRetry.hidden = true;
    myLessonsStatus.hidden = false;
    myLessonsStatus.textContent = "Loading lesson activities...";
    try {
        const response = await fetch("/learning-pathways/library.json", { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const groups = getMyLessonsGroups(await response.json());
        if (request !== myLessonsRequest) return;
        for (const { unit, activities } of groups) {
            const section = document.createElement("section");
            section.className = "my-lessons-unit";
            const heading = document.createElement("h2");
            heading.id = `my-lessons-unit-${unit.id}`;
            heading.textContent = unit.title;
            section.setAttribute("aria-labelledby", heading.id);
            section.append(heading);
            if (!activities.length) {
                const empty = document.createElement("p");
                empty.className = "my-lessons-empty";
                empty.textContent = "No lesson activities published yet.";
                section.append(empty);
            } else {
                const list = document.createElement("ul");
                list.className = "licence-stamps my-lessons-activities";
                for (const { activity, lesson } of activities) {
                    const item = document.createElement("li");
                    const link = document.createElement("a");
                    link.className = "licence-stamp my-lessons-activity";
                    link.href = activity.href;
                    const title = document.createElement("strong");
                    title.textContent = activity.title;
                    const context = document.createElement("span");
                    context.textContent = Number.isFinite(lesson.sequence)
                        ? `Lesson ${lesson.sequence}: ${lesson.title}` : lesson.title;
                    link.append(title, context);
                    if (typeof activity.summary === "string" && activity.summary.trim()) {
                        const summary = document.createElement("span");
                        summary.className = "my-lessons-summary";
                        summary.textContent = activity.summary;
                        link.append(summary);
                    }
                    const action = document.createElement("span");
                    action.className = "stamp-certificate";
                    action.textContent = "Open activity \u2192";
                    link.append(action);
                    item.append(link);
                    list.append(item);
                }
                section.append(list);
            }
            myLessonsUnits.append(section);
        }
        myLessonsUnits.hidden = false;
        myLessonsStatus.textContent = groups.length ? "" : "No Units have been published yet.";
        myLessonsStatus.hidden = groups.length > 0;
    } catch (error) {
        if (request !== myLessonsRequest) return;
        console.error("Could not load My Lessons", error);
        myLessonsStatus.textContent = `Lesson activities could not be loaded. ${error.message} Please retry.`;
        myLessonsRetry.hidden = false;
    }
}

myLessonsRetry.addEventListener("click", () => { void loadMyLessons(); });
window.addEventListener("hub-auth-state-changed", renderMyLessonsIdentity);
renderMyLessonsIdentity();
void loadMyLessons();
