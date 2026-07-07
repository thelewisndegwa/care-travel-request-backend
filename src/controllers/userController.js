const User = require("../models/User");
const { listEligibleApprovers } = require("../services/approverService");

async function getMe(req, res) {
  const user = await User.findById(req.user.id).select("-passwordHash");
  return res.json(user);
}

async function listUsers(req, res) {
  const users = await User.find().select("-passwordHash").sort({ name: 1 });
  return res.json(users);
}

async function getMyTeam(req, res) {
  const users = await User.find({ managerId: req.user.id, isActive: true })
    .select("-passwordHash")
    .sort({ name: 1 });

  return res.json(users);
}

async function listApprovers(req, res) {
  const approvers = await listEligibleApprovers();
  return res.json(approvers);
}

module.exports = {
  getMe,
  listUsers,
  getMyTeam,
  listApprovers,
};
