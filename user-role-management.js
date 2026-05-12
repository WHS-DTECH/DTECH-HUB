const roleForm = document.querySelector("#add-role-form");
const roleStatus = document.querySelector("#user-role-status");
const roleTableBody = document.querySelector("#user-role-table tbody");

function setStatus(message, isError = false) {
  if (!roleStatus) return;
  roleStatus.textContent = message;
  roleStatus.style.color = isError ? "#bb3f3f" : "#2f4e73";
}

async function loadUserRoles() {
  const response = await fetch("/api/admin/user-roles");
  if (!response.ok) throw new Error("Could not load user roles");
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

function renderRows(rows) {
  if (!roleTableBody) return;
  roleTableBody.innerHTML = "";

  if (!rows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="4">No additional roles assigned yet.</td>`;
    roleTableBody.appendChild(tr);
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="project-tag">${row.user_type || ""}</span></td>
      <td>
        <strong>${row.user_email || ""}</strong>
        <div>${row.display_name || "-"}</div>
      </td>
      <td><span class="status-tag status-planning">${row.additional_role || "None"}</span></td>
      <td><button type="button" class="button button-secondary" data-remove="${row.user_email}">Remove</button></td>
    `;

    const removeButton = tr.querySelector("[data-remove]");
    if (removeButton) {
      removeButton.addEventListener("click", async () => {
        try {
          const response = await fetch(`/api/admin/user-roles/${encodeURIComponent(row.user_email)}`, {
            method: "DELETE"
          });
          if (!response.ok) throw new Error("Could not remove role");
          setStatus(`Removed additional role for ${row.user_email}.`);
          await refresh();
        } catch (error) {
          setStatus(error.message, true);
        }
      });
    }

    roleTableBody.appendChild(tr);
  });
}

async function refresh() {
  const rows = await loadUserRoles();
  renderRows(rows);
}

if (roleForm) {
  roleForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(roleForm);

    const payload = {
      user_type: String(formData.get("userType") || "").trim(),
      user_email: String(formData.get("userEmail") || "").trim().toLowerCase(),
      additional_role: String(formData.get("roleToAdd") || "").trim(),
      display_name: ""
    };

    if (!payload.display_name && payload.user_email.includes("@")) {
      const localPart = payload.user_email.split("@")[0] || "";
      payload.display_name = localPart
        .split(/[._-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    }

    if (!payload.user_type || !payload.user_email || !payload.additional_role) {
      setStatus("User type, email, and role are required.", true);
      return;
    }

    try {
      const response = await fetch("/api/admin/user-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(await response.text() || "Could not add role");
      }

      setStatus(`Saved role ${payload.additional_role} for ${payload.user_email}.`);
      roleForm.reset();
      await refresh();
    } catch (error) {
      setStatus(error.message, true);
    }
  });
}

refresh().catch((error) => setStatus(error.message, true));
