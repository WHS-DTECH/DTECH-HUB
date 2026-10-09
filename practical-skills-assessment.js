"use strict";

const PASSWORD_PROBLEMS_ID = "password-problems-v1";

const passwordProblems = {
  id: PASSWORD_PROBLEMS_ID,
  title: "Password detective",
  introduction: "Your school login is not working. Can you spot the problem and choose a safe fix? Match the problems, then solve five mini mysteries. Get all 10 right to earn your completion tick. You can check, learn from the feedback and try again.",
  safety: "Never type a real password into this activity, share it with a friend, or send it in a message. A teacher or school IT staff can help you reset it without you telling them your password.",
  tips: [
    "Check: Am I on the correct school sign-in page, using my school account?",
    "Look: Is Caps Lock on? Have I typed my username correctly?",
    "Pause: Do not keep guessing. Too many tries can lock an account.",
    "Ask: If you are stuck, tell your teacher the error message. Keep your password private."
  ],
  matchOptions: [
    { id: "teacher", text: "Stop guessing and ask a teacher or school IT staff for help." },
    { id: "account", text: "Choose your school account or sign out of the personal account." },
    { id: "connection", text: "Check the internet connection and tell your teacher if it is not working." },
    { id: "username", text: "Check your school username or email for a typing mistake." },
    { id: "caps", text: "Turn Caps Lock off and carefully type the password again." }
  ],
  matches: [
    { id: "caps-lock", prompt: "Every letter comes out as a capital, but your password uses small letters.", answer: "caps", explanation: "Passwords are case-sensitive: a capital A and a small a are different. Check Caps Lock before trying again." },
    { id: "wrong-account", prompt: "The screen shows your home Google account, not your school account.", answer: "account", explanation: "A home account and a school account are different. Choose your school account on the correct sign-in page." },
    { id: "unknown-user", prompt: "The sign-in page says it cannot find your account.", answer: "username", explanation: "Read your school username or email carefully. A missing letter or wrong school address can stop the site finding your account." },
    { id: "no-internet", prompt: "Several websites will not load and the device says it is offline.", answer: "connection", explanation: "This may be an internet problem, not a password problem. Check the connection and ask your teacher for help." },
    { id: "locked-out", prompt: "After several guesses, the screen says your account is locked.", answer: "teacher", explanation: "Stop trying passwords. Tell your teacher or school IT staff the error message so they can help you safely." }
  ],
  quiz: [
    {
      id: "forgotten",
      prompt: "You have forgotten your school password. What is the safest next step?",
      options: [
        { id: "borrow", text: "Borrow a friend's account." },
        { id: "reset", text: "Ask your teacher or school IT staff to help you reset it." },
        { id: "guess", text: "Keep guessing until it works." }
      ],
      answer: "reset",
      explanation: "Use your own account. Your teacher or school IT staff can guide you through the school's reset process. Do not keep guessing."
    },
    {
      id: "sharing",
      prompt: "A friend says, 'Tell me your password and I will fix your login.' What do you do?",
      options: [
        { id: "secret", text: "Tell them, but ask them to keep it secret." },
        { id: "message", text: "Send it in a private message." },
        { id: "private", text: "Keep it private and ask a teacher for help." }
      ],
      answer: "private",
      explanation: "Even a helpful friend should not know your password. Ask for help without sharing it."
    },
    {
      id: "new-password",
      prompt: "School IT has reset your password. The browser keeps filling in the old one. What should you do?",
      options: [
        { id: "replace", text: "Clear the old saved password and type the new one carefully." },
        { id: "old", text: "Keep trying the old password." },
        { id: "public", text: "Write the new password on the classroom wall." }
      ],
      answer: "replace",
      explanation: "A browser may remember an old password. Remove the old entry from the sign-in box, then use your new password. Keep it private."
    },
    {
      id: "help-message",
      prompt: "You need to tell your teacher about a login problem. Which message is most helpful and safe?",
      options: [
        { id: "vague", text: "'It is broken.'" },
        { id: "details", text: "'My school sign-in says account locked. I checked my username and Caps Lock.'" },
        { id: "password", text: "'Here is my password. Can you try it?'" }
      ],
      answer: "details",
      explanation: "Say which sign-in page you used, what the error says and what you checked. Do not include your password or a screenshot that shows it."
    },
    {
      id: "suspicious-link",
      prompt: "A message says, 'Your school account will close! Click this strange link and enter your password.' What should you do?",
      options: [
        { id: "click", text: "Click quickly before the account closes." },
        { id: "forward", text: "Forward the link to friends so they can try it." },
        { id: "report", text: "Do not enter your password. Show the message to a teacher and use the usual school sign-in page." }
      ],
      answer: "report",
      explanation: "A message that rushes you into sharing a password could be a trick called phishing. Pause and check with a trusted adult."
    }
  ]
};

function withPasswordProblemsActivity(kitId, content) {
  if (kitId !== "kit-login" || !Array.isArray(content?.worksheets)) return content;
  const index = content.worksheets.findIndex((worksheet) =>
    String(worksheet?.activity || "").trim().toLowerCase() === "password problems"
  );
  if (index < 0) return content;
  const activities = Array.isArray(content.activities) ? content.activities.slice() : [];
  activities[index] = { ...activities[index], assessmentId: PASSWORD_PROBLEMS_ID };
  return { ...content, activities };
}

function getStudentAssessment(assessmentId) {
  if (assessmentId !== PASSWORD_PROBLEMS_ID) return null;
  return {
    ...passwordProblems,
    matches: passwordProblems.matches.map(({ answer, explanation, ...question }) => question),
    quiz: passwordProblems.quiz.map(({ answer, explanation, ...question }) => question)
  };
}

function gradePasswordProblems(answers) {
  const safeAnswers = answers && typeof answers === "object" && !Array.isArray(answers) ? answers : {};
  const results = [...passwordProblems.matches, ...passwordProblems.quiz].map((question) => ({
    id: question.id,
    correct: safeAnswers[question.id] === question.answer,
    explanation: question.explanation
  }));
  const score = results.filter((result) => result.correct).length;
  const cleanAnswers = {};
  for (const question of [...passwordProblems.matches, ...passwordProblems.quiz]) {
    const options = question.options || passwordProblems.matchOptions;
    if (options.some((option) => option.id === safeAnswers[question.id])) {
      cleanAnswers[question.id] = safeAnswers[question.id];
    }
  }
  return { score, total: results.length, passed: score === results.length, results, answers: cleanAnswers };
}

module.exports = { PASSWORD_PROBLEMS_ID, withPasswordProblemsActivity, getStudentAssessment, gradePasswordProblems };
