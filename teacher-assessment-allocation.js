document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById("allocation-container");

    try {
        const response = await fetch("/api/activities");
        const activities = await response.json();

        const assessmentTasks = activities.filter(activity => activity.activity_category.includes("assessment"));

        if (assessmentTasks.length === 0) {
            container.innerHTML = "<p>No assessment tasks available.</p>";
            return;
        }

        container.innerHTML = assessmentTasks.map(task => `
            <section class="allocation-card">
                <h2>${task.name}</h2>
                <p><strong>Client:</strong> ${task.company || "N/A"}</p>
                <p><strong>EST Start Date:</strong> ${task.start_date || "TBD"}</p>
                <div class="allocation-details">
                    <h3>Student Allocations</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Student Email</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${task.allocations && task.allocations.length ? task.allocations.map(allocation => `
                                <tr>
                                    <td>${allocation.student_email}</td>
                                    <td>${allocation.confirmed ? "Confirmed" : "Registered"}</td>
                                    <td>
                                        <button data-action="confirm" data-id="${allocation.id}">Confirm</button>
                                        <button data-action="remove" data-id="${allocation.id}">Remove</button>
                                    </td>
                                </tr>
                            `).join("") : "<tr><td colspan='3'>No students are interested yet.</td></tr>"}
                        </tbody>
                    </table>
                </div>
            </section>
        `).join("");

        container.addEventListener("click", async (event) => {
            const button = event.target.closest("button[data-action]");
            if (!button) return;

            const action = button.dataset.action;
            const id = button.dataset.id;

            try {
                if (action === "confirm") {
                    await fetch(`/api/allocations/${id}/confirm`, { method: "POST" });
                } else if (action === "remove") {
                    await fetch(`/api/allocations/${id}`, { method: "DELETE" });
                }

                alert("Action completed successfully.");
                location.reload();
            } catch (error) {
                console.error(error);
                alert("Failed to complete action.");
            }
        });
    } catch (error) {
        console.error(error);
        container.innerHTML = "<p>Failed to load assessment tasks. Please try again later.</p>";
    }
});