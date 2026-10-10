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
    try {
        const response = await fetch("/learning-pathways/library.json", { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const cards = await response.json();
        if (!Array.isArray(cards) || cards.some((card) => !card || typeof card.title !== "string"
            || !card.title.trim() || typeof card.yearLevel !== "string")) {
            throw new Error("Learning Pathways library is invalid.");
        }
        if (request !== pathwayTaskRequest) return;
        const juniorCards = cards.filter((card) => card.yearLevel === "Junior DTECH")
            .sort((left, right) => left.title.localeCompare(right.title));
        for (const card of juniorCards) {
            const item = document.createElement("li");
            const heading = document.createElement("h3");
            heading.textContent = card.title;
            item.append(heading);
            pathwayTaskList.append(item);
        }
        pathwayTaskList.hidden = juniorCards.length === 0;
        pathwayTaskStatus.textContent = juniorCards.length
            ? "Your learning pathways are listed below. Tasks will be added later."
            : "No JuniorDTECH learning pathways have been added yet.";
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
