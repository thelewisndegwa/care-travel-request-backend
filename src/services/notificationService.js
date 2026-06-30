const Notification = require("../models/Notification");
const { sendEmail } = require("./emailService");

function buildNotificationContent(type, requestDocument) {
  const destination = requestDocument.itinerary.destination;
  const purpose = requestDocument.purposeOfTrip;

  switch (type) {
    case "new_request":
      return {
        subject: "New travel request awaiting approval",
        message: `A new travel request to ${destination} for ${purpose} is awaiting your approval.`,
      };
    case "approved":
      return {
        subject: "Travel request approved",
        message: `Your travel request to ${destination} for ${purpose} was approved.`,
      };
    case "rejected":
      return {
        subject: "Travel request rejected",
        message: `Your travel request to ${destination} for ${purpose} was rejected.`,
      };
    case "resubmitted":
      return {
        subject: "Travel request resubmitted",
        message: `A travel request to ${destination} for ${purpose} was edited and resubmitted for your review.`,
      };
    default:
      return {
        subject: "Travel request update",
        message: `A travel request to ${destination} for ${purpose} was updated.`,
      };
  }
}

async function notifyUser(recipient, type, requestDocument) {
  const content = buildNotificationContent(type, requestDocument);

  const notification = await Notification.create({
    recipient: recipient._id,
    type,
    request: requestDocument._id,
    message: content.message,
  });

  const html = `
    <p>Hello ${recipient.name},</p>
    <p>${content.message}</p>
    <p>Request ID: ${requestDocument._id}</p>
  `;

  await sendEmail(recipient.email, content.subject, html);

  return notification;
}

module.exports = {
  notifyUser,
};
