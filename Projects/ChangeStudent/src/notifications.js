const nodemailer = require("nodemailer");

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
}

async function sendEmail({ to, subject, text }) {
  const transporter = getTransporter();
  if (!transporter) {
    return {
      status: "SIMULATED",
      detail: "SMTP not configured. Email was simulated."
    };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await transporter.sendMail({
    from,
    to,
    subject,
    text
  });

  return {
    status: "SENT",
    detail: "Email sent successfully."
  };
}

module.exports = {
  sendEmail
};
