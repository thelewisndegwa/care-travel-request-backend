const HttpError = require("../utils/httpError");

function canAccessReport(user, report) {
  if (user.role === "superadmin") {
    return true;
  }

  const ownerId = report.submittedBy?._id
    ? report.submittedBy._id.toString()
    : report.submittedBy.toString();
  const approverId = report.selected_approver_id?._id
    ? report.selected_approver_id._id.toString()
    : report.selected_approver_id.toString();

  return ownerId === user.id || approverId === user.id;
}

function ensureCanAccessReport(user, report) {
  if (!canAccessReport(user, report)) {
    throw new HttpError(403, "You do not have access to this reimbursement report");
  }
}

function ensureReportOwner(user, report) {
  const ownerId = report.submittedBy?._id
    ? report.submittedBy._id.toString()
    : report.submittedBy.toString();

  if (ownerId !== user.id) {
    throw new HttpError(403, "Only the submitter can access this reimbursement report");
  }
}

function ensureReportApprover(user, report) {
  const approverId = report.selected_approver_id?._id
    ? report.selected_approver_id._id.toString()
    : report.selected_approver_id.toString();

  if (user.role !== "admin" || approverId !== user.id) {
    throw new HttpError(403, "Only the assigned approver can perform this action");
  }
}

module.exports = {
  canAccessReport,
  ensureCanAccessReport,
  ensureReportOwner,
  ensureReportApprover,
};
