const Notification = require("../models/Notification");
const HttpError = require("../utils/httpError");

async function listNotifications(req, res) {
  const notifications = await Notification.find({ recipient: req.user.id })
    .sort({ createdAt: -1 })
    .populate("request")
    .populate("recipient", "-passwordHash");

  return res.json(notifications);
}

async function markNotificationRead(req, res) {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    throw new HttpError(404, "Notification not found");
  }

  if (notification.recipient.toString() !== req.user.id) {
    throw new HttpError(403, "You do not have access to this notification");
  }

  notification.read = true;
  await notification.save();

  return res.json(notification);
}

module.exports = {
  listNotifications,
  markNotificationRead,
};
