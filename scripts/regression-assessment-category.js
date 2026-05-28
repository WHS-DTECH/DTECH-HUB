"use strict";

function fail(message) {
  throw new Error(message);
}

function getCategoryLabel(record) {
  return String(record?.activity_category || record?.category || "").trim();
}

function isAssessmentCategory(value) {
  return String(value || "").toLowerCase().includes("assessment");
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function run() {
  const baseUrl = String(process.env.HUB_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
  const userEmail = String(process.env.HUB_TEST_USER_EMAIL || "").trim().toLowerCase();

  if (!userEmail) {
    fail("Missing HUB_TEST_USER_EMAIL. Set a teacher/admin email that can save activities.");
  }

  const id = `assessment-guard-${Date.now()}`;
  const headers = {
    "Content-Type": "application/json",
    "x-user-email": userEmail
  };

  const createPayload = {
    id,
    name: `Assessment Category Guard ${new Date().toISOString()}`,
    year_level: "Year 12",
    type: "Programming",
    activity_category: "Assessment Task",
    difficulty: "Intermediate",
    card_color: "Slate",
    show_in_this_week: false,
    description: "Regression test payload for assessment category.",
    standard_details: ["91907 | Regression Test Standard | L2 | 4 credits"],
    tasks_list: ["Task 1"],
    achieved: ["Achieved criteria"],
    merit: ["Merit criteria"],
    excellence: ["Excellence criteria"],
    submission_requirements: ["Submission item"],
    relevant_implications: ["Implication item"],
    progress_logging: ["Progress item"],
    feedback_trialling: ["Feedback item"]
  };

  console.log(`[assessment-guard-test] Creating assessment record id=${id}`);
  const createResult = await requestJson(`${baseUrl}/api/activities`, {
    method: "POST",
    headers,
    body: JSON.stringify(createPayload)
  });

  if (!createResult.response.ok) {
    fail(`Create failed (${createResult.response.status}): ${JSON.stringify(createResult.body)}`);
  }

  const createCategory = getCategoryLabel(createResult.body);
  if (!isAssessmentCategory(createCategory)) {
    fail(`Create returned non-assessment category: "${createCategory}"`);
  }

  const editPayload = {
    ...createPayload,
    standard_details: [
      "91907 | Regression Test Standard | L2 | 4 credits",
      "91897 | Regression Test Standard 2 | L2 | 6 credits"
    ]
  };

  console.log(`[assessment-guard-test] Editing assessment record id=${id}`);
  const editResult = await requestJson(`${baseUrl}/api/activities`, {
    method: "POST",
    headers,
    body: JSON.stringify(editPayload)
  });

  if (!editResult.response.ok) {
    fail(`Edit failed (${editResult.response.status}): ${JSON.stringify(editResult.body)}`);
  }

  const editCategory = getCategoryLabel(editResult.body);
  if (!isAssessmentCategory(editCategory)) {
    fail(`Edit returned non-assessment category: "${editCategory}"`);
  }

  console.log(`[assessment-guard-test] Fetching assessment record id=${id}`);
  const fetchResult = await requestJson(`${baseUrl}/api/activities/${encodeURIComponent(id)}`, {
    method: "GET"
  });

  if (!fetchResult.response.ok) {
    fail(`Fetch failed (${fetchResult.response.status}): ${JSON.stringify(fetchResult.body)}`);
  }

  const fetchedCategory = getCategoryLabel(fetchResult.body);
  if (!isAssessmentCategory(fetchedCategory)) {
    fail(`Fetched record returned non-assessment category: "${fetchedCategory}"`);
  }

  console.log(`[assessment-guard-test] PASS id=${id} category=${fetchedCategory}`);

  // Cleanup is best-effort to avoid leaving test records when permissions allow.
  try {
    await fetch(`${baseUrl}/api/activities/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers
    });
  } catch (_error) {
    // Ignore cleanup errors.
  }
}

run().catch((error) => {
  console.error(`[assessment-guard-test] FAIL ${error.message}`);
  process.exitCode = 1;
});
