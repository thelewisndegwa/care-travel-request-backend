const nodemailer = require("nodemailer");
const env = require("../config/env");

let transporter = null;

function getTransporter() {
  if (!env.gmailUser || !env.gmailAppPassword) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: env.gmailUser,
        pass: env.gmailAppPassword,
      },
    });
  }

  return transporter;
}

async function sendEmail(to, subject, html) {
  const mailer = getTransporter();

  if (!mailer) {
    console.warn("Email skipped: GMAIL_USER and GMAIL_APP_PASSWORD are not configured.");
    return false;
  }

  try {
    await mailer.sendMail({
      from: env.emailFrom || env.gmailUser,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error("Email failed:", error.message);
    return false;
  }
}

function buildActivationEmail(user, inviteToken) {
  const activationUrl = `${env.frontendUrl}/activate?email=${encodeURIComponent(user.email)}&token=${inviteToken}`;

  return {
    subject: "Activate your CARE travel request account",
    html: `
      <p>Hello ${user.name},</p>
      <p>Your CARE travel request account has been created. Please set your password to activate it:</p>
      <p><a href="${activationUrl}">Activate your account</a></p>
      <p>Or use this activation token in the app:</p>
      <p><strong>${inviteToken}</strong></p>
      <p>This link expires in 7 days.</p>
    `,
  };
}

async function sendActivationEmail(user, inviteToken) {
  const content = buildActivationEmail(user, inviteToken);
  return sendEmail(user.email, content.subject, content.html);
}

module.exports = {
  sendEmail,
  sendActivationEmail,
  buildActivationEmail,
};
