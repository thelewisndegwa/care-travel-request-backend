const User = require("../models/User");
const HttpError = require("../utils/httpError");

async function getDirectReportIds(adminId) {
  const directReports = await User.find({ managerId: adminId, isActive: true }).select("_id");
  return directReports.map((report) => report._id);
}

async function buildRequestScope(user) {
  if (user.role === "superadmin") {
    return {};
  }

  if (user.role === "admin") {
    const directReportIds = await getDirectReportIds(user.id);

    return {
      $or: [
        { requestedBy: user.id },
        { requestedBy: { $in: directReportIds } },
        { selected_approver_id: user.id },
      ],
    };
  }

  return { requestedBy: user.id };
}

async function canAccessRequest(user, request) {
  if (user.role === "superadmin") {
    return true;
  }

  const requesterId = request.requestedBy?._id
    ? request.requestedBy._id.toString()
    : request.requestedBy.toString();
  const approverId = request.selected_approver_id?._id
    ? request.selected_approver_id._id.toString()
    : request.selected_approver_id.toString();

  if (user.role === "admin") {
    if (requesterId === user.id || approverId === user.id) {
      return true;
    }

    const directReportIds = await getDirectReportIds(user.id);
    return directReportIds.some((reportId) => reportId.toString() === requesterId);
  }

  return requesterId === user.id;
}

async function ensureCanAccessRequest(user, request) {
  const allowed = await canAccessRequest(user, request);

  if (!allowed) {
    throw new HttpError(403, "You do not have access to this request");
  }
}

function ensureApprover(user, request) {
  const approverId = request.selected_approver_id?._id
    ? request.selected_approver_id._id.toString()
    : request.selected_approver_id.toString();

  if (user.role !== "admin" || approverId !== user.id) {
    throw new HttpError(403, "Only the assigned approver can perform this action");
  }
}

function ensureRequestOwner(user, request) {
  const requesterId = request.requestedBy?._id
    ? request.requestedBy._id.toString()
    : request.requestedBy.toString();

  if (requesterId !== user.id) {
    throw new HttpError(403, "Only the requester can modify this request");
  }
}

module.exports = {
  getDirectReportIds,
  buildRequestScope,
  canAccessRequest,
  ensureCanAccessRequest,
  ensureApprover,
  ensureRequestOwner,
};
