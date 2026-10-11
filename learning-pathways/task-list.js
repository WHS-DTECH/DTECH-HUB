"use strict";

const pathwayTaskList = document.querySelector("#pathway-task-list");
const pathwayTaskStatus = document.querySelector("#pathway-task-status");
const pathwayTaskRetry = document.querySelector("#pathway-task-retry");
let pathwayTaskRequest = 0;

async function renderPathwayTaskList() {
    const request = ++pathwayTaskRequest;
    pathwayTaskList.replaceChildren();
    pathwayTaskList.hidden = true;
    pathwayTaskRetry.hidden = true;
    if (!hasAllowedSignedInHubAccount()) {
        pathwayTaskStatus.textContent = "Sign in with your school account to see your Task List.";
        return;
    }
    const panel = document.querySelector("#hub-global-sidebar");
    const course = panel?.dataset.course || "";
    if (panel?.dataset.courseStatus === "error") {
        pathwayTaskStatus.textContent = "Your course could not be loaded. Please retry.";
        pathwayTaskRetry.hidden = false;
        return;
    }
    if (!course) {
        pathwayTaskStatus.textContent = panel?.dataset.courseStatus === "ready"
            ? "Your course is not confirmed yet. Complete your course check-in first."
            : "Checking your course...";
        return;
    }
    if (course !== "JuniorDTECH") {
        pathwayTaskStatus.textContent = course === "SeniorDTECH"
            ? "Your SeniorDTECH Task List is available using the green Task List button above."
            : "This Task List is for JuniorDTECH. The MiddleDTECH Task List has not been set up yet.";
        return;
    }
    pathwayTaskStatus.textContent = "Loading your learning pathways...";
    const progressRequest = fetch("/api/learning-pathways/activity-progress", {
        cache: "no-store", headers: withHubAuthHeaders()
    }).then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!data || !Array.isArray(data.tracked) || typeof data.progress !== "object" || data.progress === null) {
            throw new Error("Activity progress is invalid.");
        }
        return data;
    });
    progressRequest.catch(() => {});
    try {
        const response = await fetch("/learning-pathways/library.json", { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const cards = await response.json();
        if (!Array.isArray(cards) || cards.some((card) => !card || typeof card.title !== "string"
            || !card.title.trim() || typeof card.yearLevel !== "string")) {
            throw new Error("Learning Pathways library is invalid.");
        }
        let progress = null;
        try {
            progress = await progressRequest;
        } catch (error) {
            console.error("Could not load activity progress", error);
        }
        if (request !== pathwayTaskRequest) return;
        const juniorCards = cards.filter((card) => card.yearLevel === "Junior DTECH" && !["unit", "lesson", "activity"].includes(card.cardType))
            .sort((left, right) => left.title.localeCompare(right.title));
        let activityCount = 0;
        for (const card of juniorCards) {
            const item = document.createElement("li");
            const heading = document.createElement("h3");
            heading.textContent = card.title;
            item.append(heading);
            const activities = (progress?.tracked || []).filter((activity) => activity && activity.strand === card.id
                && typeof activity.title === "string" && typeof activity.href === "string" && activity.href.startsWith("/"));
            if (activities.length) {
                const activityList = document.createElement("ul");
                activityList.className = "pathway-task-activities";
                for (const activity of activities) {
                    const done = progress.progress[activity.id]?.completed === true;
                    const row = document.createElement("li");
                    row.className = done ? "pathway-task-activity is-complete" : "pathway-task-activity";
                    const link = document.createElement("a");
                    link.href = activity.href;
                    link.textContent = activity.title;
                    const context = document.createElement("span");
                    context.className = "pathway-task-context";
                    context.textContent = typeof activity.context === "string" ? activity.context : "";
                    const state = document.createElement("span");
                    state.className = "pathway-task-state";
                    state.textContent = done ? "\u2713 Completed" : "To do";
                    row.append(link, context, state);
                    activityList.append(row);
                    activityCount++;
                }
                item.append(activityList);
            }
            pathwayTaskList.append(item);
        }
        pathwayTaskList.hidden = juniorCards.length === 0;
        if (juniorCards.length && !progress) {
            pathwayTaskStatus.textContent = "Your learning pathways are listed below. Your activity progress could not be loaded. Please retry.";
            pathwayTaskRetry.hidden = false;
        } else {
            pathwayTaskStatus.textContent = !juniorCards.length
                ? "No JuniorDTECH learning pathways have been added yet."
                : activityCount
                    ? "Complete the activities listed under each learning pathway."
                    : "Your learning pathways are listed below. Tasks will be added later.";
        }
    } catch (error) {
        console.error("Could not load pathway Task List", error);
        if (request !== pathwayTaskRequest) return;
        pathwayTaskStatus.textContent = "Your learning pathways could not be loaded. Please retry.";
        pathwayTaskRetry.hidden = false;
    }
}

pathwayTaskRetry.addEventListener("click", () => {
    const panel = document.querySelector("#hub-global-sidebar");
    if (panel?.dataset.courseStatus === "error") {
        void loadAndRenderSidebarCourse(panel);
    } else {
        void renderPathwayTaskList();
    }
});
window.addEventListener("hub-course-resolved", () => { void renderPathwayTaskList(); });
window.addEventListener("hub-auth-state-changed", () => { void renderPathwayTaskList(); });
document.addEventListener("DOMContentLoaded", () => { void renderPathwayTaskList(); });
