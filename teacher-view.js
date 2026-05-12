const LOCAL_ACTIVITY_STORAGE_KEY = "dtechHub:activities";

const exportButton = document.querySelector("#teacher-export");
const clearButton = document.querySelector("#teacher-clear");
const teacherStatus = document.querySelector("#teacher-status");

function setTeacherStatus(message, isError = false) {
    if (!teacherStatus) return;
    teacherStatus.textContent = message;
    teacherStatus.style.color = isError ? "#bb3f3f" : "#2f4e73";
}

function getLocalActivities() {
    try {
        const parsed = JSON.parse(localStorage.getItem(LOCAL_ACTIVITY_STORAGE_KEY) || "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
        return [];
    }
}

function downloadJson(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
}

if (exportButton) {
    exportButton.addEventListener("click", () => {
        const activities = getLocalActivities();
        if (!activities.length) {
            setTeacherStatus("No local uploaded activities to export yet.", true);
            return;
        }

        downloadJson("dtech-hub-local-activities.json", activities);
        setTeacherStatus(`Exported ${activities.length} local activit${activities.length === 1 ? "y" : "ies"}.`);
    });
}

if (clearButton) {
    clearButton.addEventListener("click", () => {
        const activities = getLocalActivities();
        if (!activities.length) {
            setTeacherStatus("Local activity storage is already empty.");
            return;
        }

        localStorage.removeItem(LOCAL_ACTIVITY_STORAGE_KEY);
        setTeacherStatus("Local uploaded activities were cleared. Reloading view...");
        window.setTimeout(() => {
            window.location.reload();
        }, 500);
    });
}
