const User = require("../models/User");
const { listEligibleApprovers } = require("../services/approverService");
const { listEligiblePassengers } = require("../services/passengerService");

async function getMe(req, res) {
  return res.json(req.currentUser);
}

async function listUsers(req, res) {
  const users = await User.find()
    .select("-passwordHash -inviteToken -inviteTokenExpires")
    .sort({ name: 1 });
  return res.json(users);
}

async function listApprovers(req, res) {
  const approvers = await listEligibleApprovers();
  return res.json(approvers);
}

async function listPassengers(req, res) {
  const passengers = await listEligiblePassengers();
  return res.json(passengers);
}

module.exports = {
  getMe,
  listUsers,
  listApprovers,
  listPassengers,
};
