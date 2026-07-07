const User = require("../models/User");
const HttpError = require("../utils/httpError");

async function listEligibleApprovers() {
  return User.find({
    role: "admin",
    isActive: true,
  })
    .select("-passwordHash")
    .sort({ name: 1 });
}

async function getEligibleApproverById(approverId) {
  const approver = await User.findById(approverId).select("-passwordHash");

  if (!approver || !approver.isActive) {
    throw new HttpError(400, "Selected approver was not found or is inactive");
  }

  if (approver.role !== "admin") {
    throw new HttpError(400, "Selected approver must be an active admin");
  }

  return approver;
}

module.exports = {
  listEligibleApprovers,
  getEligibleApproverById,
};
