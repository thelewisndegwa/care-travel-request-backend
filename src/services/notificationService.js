const Notification = require("../models/Notification");
const { sendEmail } = require("./emailService");

function buildNotificationEmail(recipientName, message, entityLabel, entityId) {
  return `
    <p>Hello ${recipientName},</p>
    <p>${message}</p>
    <p>${entityLabel}: ${entityId}</p>
  `;
}

async function createAndSendNotification({
  recipient,
  type,
  message,
  subject,
  requestId = null,
  reimbursementId = null,
  entityLabel,
  entityId,
}) {
  const notification = await Notification.create({
    recipient: recipient._id,
    type,
    request: requestId,
    reimbursement: reimbursementId,
    message,
  });

  const html = buildNotificationEmail(recipient.name, message, entityLabel, entityId);
  await sendEmail(recipient.email, subject, html);

  return notification;
}

function buildTravelRequestNotificationContent(type, requestDocument) {
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

function buildReimbursementNotificationContent(type, report) {
  const destination = report.travelRequest?.itinerary?.destination || "the trip";
  const amount = Number(report.totalAmountKsh || 0).toFixed(2);

  switch (type) {
    case "reimbursement_submitted":
      return {
        subject: "New reimbursement awaiting approval",
        message: `A reimbursement request for ${destination} totaling KES ${amount} is awaiting your approval.`,
      };
    case "reimbursement_approved":
      return {
        subject: "Reimbursement approved",
        message: `Your reimbursement request for ${destination} totaling KES ${amount} was approved.`,
      };
    case "reimbursement_rejected":
      return {
        subject: "Reimbursement rejected",
        message: `Your reimbursement request for ${destination} totaling KES ${amount} was rejected.`,
      };
    default:
      return {
        subject: "Reimbursement update",
        message: `Your reimbursement request for ${destination} was updated.`,
      };
  }
}

async function notifyTravelRequestUser(recipient, type, requestDocument) {
  const content = buildTravelRequestNotificationContent(type, requestDocument);

  return createAndSendNotification({
    recipient,
    type,
    message: content.message,
    subject: content.subject,
    requestId: requestDocument._id,
    entityLabel: "Request ID",
    entityId: requestDocument._id,
  });
}

async function notifyReimbursementUser(recipient, type, report) {
  const content = buildReimbursementNotificationContent(type, report);

  return createAndSendNotification({
    recipient,
    type,
    message: content.message,
    subject: content.subject,
    requestId: report.travelRequest?._id || report.travelRequest || null,
    reimbursementId: report._id,
    entityLabel: "Reimbursement ID",
    entityId: report._id,
  });
}

module.exports = {
  notifyTravelRequestUser,
  notifyReimbursementUser,
};
