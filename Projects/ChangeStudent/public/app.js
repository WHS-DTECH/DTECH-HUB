const requestForm = document.getElementById("request-form");
const actionForm = document.getElementById("action-form");
const studentSelect = document.getElementById("studentId");
const requestSelect = document.getElementById("requestId");
const requestList = document.getElementById("request-list");
const timeline = document.getElementById("timeline");

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }

  return response.json();
}

function setRequestOptions(requests) {
  requestSelect.innerHTML = requests
    .map((r) => `<option value="${r.id}">#${r.id} - ${r.student_name} (${r.status})</option>`)
    .join("");
}

async function loadStudents() {
  const students = await api("/api/students");
  studentSelect.innerHTML = students
    .map((s) => `<option value="${s.id}">${s.name} - ${s.current_class}</option>`)
    .join("");
}

function renderRequests(requests) {
  if (!requests.length) {
    requestList.innerHTML = "<p>No requests yet.</p>";
    return;
  }

  requestList.innerHTML = requests
    .map(
      (r) => `
      <article class="request-card" data-id="${r.id}">
        <h3>#${r.id} ${r.student_name}</h3>
        <div class="code">${r.from_class} -> ${r.to_class}</div>
        <div>Requested by: ${r.requested_by}</div>
        <div>Status: <span class="status ${r.status}">${r.status}</span></div>
        <button type="button" data-timeline="${r.id}">View Confirmation Timeline</button>
      </article>
    `
    )
    .join("");
}

async function loadRequests() {
  const requests = await api("/api/requests");
  renderRequests(requests);
  setRequestOptions(requests);
}

async function loadTimeline(requestId) {
  const data = await api(`/api/requests/${requestId}/timeline`);
  timeline.textContent = JSON.stringify(data, null, 2);
}

requestForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    studentId: Number(document.getElementById("studentId").value),
    toClass: document.getElementById("toClass").value,
    reason: document.getElementById("reason").value,
    requestedBy: document.getElementById("requestedBy").value
  };

  try {
    await api("/api/requests", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    requestForm.reset();
    await loadStudents();
    await loadRequests();
  } catch (error) {
    alert(error.message);
  }
});

actionForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const requestId = requestSelect.value;
  const action = document.getElementById("action").value;
  const actorName = document.getElementById("actorName").value;
  const role = document.getElementById("role").value;
  const notes = document.getElementById("notes").value;

  let endpoint = `/api/requests/${requestId}/${action}`;
  let payload = { actorName, role, notes };

  if (action === "complete") {
    payload = { actorName, notes };
  }

  try {
    await api(endpoint, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    actionForm.reset();
    await loadStudents();
    await loadRequests();
    await loadTimeline(requestId);
  } catch (error) {
    alert(error.message);
  }
});

requestList.addEventListener("click", async (event) => {
  const btn = event.target.closest("button[data-timeline]");
  if (!btn) {
    return;
  }

  const requestId = btn.dataset.timeline;
  await loadTimeline(requestId);
});

async function bootstrap() {
  await loadStudents();
  await loadRequests();
}

bootstrap().catch((error) => {
  timeline.textContent = error.message;
});
