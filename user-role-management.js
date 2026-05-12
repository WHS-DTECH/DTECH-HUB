const roleForm = document.querySelector("#add-role-form");
const roleStatus = document.querySelector("#user-role-status");
const roleTableBody = document.querySelector("#user-role-table tbody");
const staffList = document.querySelector("#staff-list");
const staffSearch = document.querySelector("#staff-search");

let cachedStaffRows = [];
let selectedStaffEmail = "";

function getStaffDisplayName(row) {
  const firstName = String(row.first_name || row.firstname || row.first || "").trim();
  const lastName = String(row.last_name || row.lastname || row.surname || "").trim();
  const displayName = String(row.display_name || row.name || "").trim();

  if (displayName) return displayName;
  return [firstName, lastName].filter(Boolean).join(" ") || String(row.email || row.email_school || row.user_email || "").split("@")[0];
}

function getStaffEmail(row) {
  return String(row.email_school || row.email || row.user_email || row.staff_email || "").trim().toLowerCase();
}

function getStaffCode(row) {
  return String(row.code || row.staff_code || row.employee_code || "").trim();
}

function getStaffType(row) {
  return String(row.title || row.user_type || row.staff_type || "Staff").trim() || "Staff";
}

function populateRoleFormFromStaff(row) {
  if (!roleForm) return;

  const userEmailField = roleForm.querySelector('[name="userEmail"]');
  const userTypeField = roleForm.querySelector('[name="userType"]');
  const displayName = getStaffDisplayName(row);
  const email = getStaffEmail(row);
  const code = getStaffCode(row);

  if (userEmailField) userEmailField.value = email || "";
  if (userTypeField) userTypeField.value = getStaffType(row);

  selectedStaffEmail = email;
  if (staffList) {
    staffList.querySelectorAll(".staff-chip").forEach((chip) => {
      chip.classList.toggle("is-selected", chip.dataset.email === selectedStaffEmail);
    });
  }

  setStatus(`Selected ${displayName}${code ? ` (${code})` : ""}. Choose an additional role to add.`);
}

function renderStaffList(rows) {
  if (!staffList) return;

  const query = String(staffSearch?.value || "").trim().toLowerCase();
  const filtered = rows.filter((row) => {
    const name = getStaffDisplayName(row).toLowerCase();
    const email = getStaffEmail(row);
    return !query || name.includes(query) || email.includes(query);
  });

  staffList.innerHTML = "";

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "admin-empty-state";
    empty.textContent = rows.length ? "No staff matched your search." : "No staff records are available from this site yet.";
    staffList.appendChild(empty);
    return;
  }

  filtered.forEach((row) => {
    const name = getStaffDisplayName(row);
    const email = getStaffEmail(row);
    const code = getStaffCode(row);
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "staff-chip";
    chip.dataset.email = email;
    chip.innerHTML = `
      <strong>${name}</strong>
      <span>${email}</span>
      ${code ? `<small>${code}</small>` : ""}
    `;
    chip.addEventListener("click", () => populateRoleFormFromStaff(row));
    staffList.appendChild(chip);
  });
}

async function loadStaffRows() {
  const response = await fetch("/api/admin/staff-list");
  if (!response.ok) {
    return [];
  }
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

function setStatus(message, isError = false) {
  if (!roleStatus) return;
  roleStatus.textContent = message;
  roleStatus.style.color = isError ? "#bb3f3f" : "#2f4e73";
}

async function loadUserRoles() {
  const response = await fetch("/api/admin/user-roles");
  if (!response.ok) {
    return [];
  }
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

async function refreshStaff() {
  cachedStaffRows = await loadStaffRows();
  renderStaffList(cachedStaffRows);
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
      selectedStaffEmail = "";
      if (staffList) {
        staffList.querySelectorAll(".staff-chip").forEach((chip) => chip.classList.remove("is-selected"));
      }
      await refresh();
    } catch (error) {
      setStatus(error.message, true);
    }
  });
}

if (staffSearch) {
  staffSearch.addEventListener("input", () => renderStaffList(cachedStaffRows));
}

refresh().catch(() => {});
refreshStaff().catch(() => {});
