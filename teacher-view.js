const exportButton = document.querySelector("#teacher-export");
const clearButton = document.querySelector("#teacher-clear");
const teacherStatus = document.querySelector("#teacher-status");

function setTeacherStatus(message, isError = false) {
    if (!teacherStatus) return;
    teacherStatus.textContent = message;
    teacherStatus.style.color = isError ? "#bb3f3f" : "#2f4e73";
}

async function fetchSharedActivities() {
    const response = await fetch("/api/activities");
    if (!response.ok) {
        throw new Error("Could not load shared activities");
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
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
    exportButton.addEventListener("click", async () => {
        try {
            const activities = await fetchSharedActivities();
            if (!activities.length) {
                setTeacherStatus("No shared uploaded activities to export yet.", true);
                return;
            }

            downloadJson("dtech-hub-shared-activities.json", activities);
            setTeacherStatus(`Exported ${activities.length} shared activit${activities.length === 1 ? "y" : "ies"}.`);
        } catch (error) {
            setTeacherStatus(error.message, true);
        }
    });
}

if (clearButton) {
    clearButton.addEventListener("click", async () => {
        try {
            const response = await fetch("/api/activities", { method: "DELETE" });
            if (!response.ok) {
                throw new Error("Could not clear shared activities");
            }

            setTeacherStatus("Shared uploaded activities cleared. Reloading view...");
            window.setTimeout(() => {
                window.location.reload();
            }, 500);
        } catch (error) {
            setTeacherStatus(error.message, true);
        }
    });
}
