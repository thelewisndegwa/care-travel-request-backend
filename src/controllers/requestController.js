const TravelRequest = require("../models/TravelRequest");
const User = require("../models/User");
const HttpError = require("../utils/httpError");
const { notifyUser } = require("../services/notificationService");
const { createAuditLog } = require("../services/auditLogService");
const {
  ensureCanAccessRequest,
  ensureApprover,
  ensureRequestOwner,
} = require("../services/requestAccessService");
const {
  getPagination,
  buildPaginatedResponse,
} = require("../services/requestFilterService");
const { getEditableRequestSnapshot } = require("../services/travelRequestService");

const MANAGER_MISSING_MESSAGE =
  "You do not have a manager who can approve your request according to the database. Please contact HR to update your manager information.";

function normalizePassengers(passengers = []) {
  return passengers.map((passenger) => ({
    user: passenger.user || null,
    employeeNumber: passenger.employeeNumber || null,
    name: passenger.name,
  }));
}

async function createRequest(req, res) {
  const requester = await User.findById(req.user.id);

  if (!requester || !requester.isActive) {
    throw new HttpError(404, "Requester not found");
  }

  if (!requester.managerId) {
    throw new HttpError(400, MANAGER_MISSING_MESSAGE);
  }

  const approver = await User.findById(requester.managerId);

  if (!approver || !approver.isActive) {
    throw new HttpError(400, MANAGER_MISSING_MESSAGE);
  }

  if (approver.role === "superadmin") {
    throw new HttpError(400, "Superadmins cannot act as approvers");
  }

  const requestDocument = await TravelRequest.create({
    requestedBy: requester._id,
    approver: approver._id,
    project: req.body.project,
    assignedAreaOfOperation: req.body.assignedAreaOfOperation,
    purposeOfTrip: req.body.purposeOfTrip,
    modeOfTravel: req.body.modeOfTravel || {},
    itinerary: req.body.itinerary,
    passengers: normalizePassengers(req.body.passengers),
    submittedAt: new Date(),
  });

  await createAuditLog({
    action: "request_created",
    performedBy: requester._id,
    targetRequest: requestDocument._id,
    metadata: { status: requestDocument.status },
  });

  await notifyUser(approver, "new_request", requestDocument);

  const populated = await TravelRequest.findById(requestDocument._id)
    .populate("requestedBy", "-passwordHash")
    .populate("approver", "-passwordHash")
    .populate("passengers.user", "-passwordHash");

  return res.status(201).json(populated);
}

async function listRequests(req, res) {
  const pagination = getPagination(req.query);
  const query = TravelRequest.find(req.requestScope).sort({ createdAt: -1 });

  const [requests, total] = await Promise.all([
    query
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate("requestedBy", "-passwordHash")
      .populate("approver", "-passwordHash")
      .populate("decision.decidedBy", "-passwordHash")
      .populate("passengers.user", "-passwordHash"),
    TravelRequest.countDocuments(req.requestScope),
  ]);

  return res.json(buildPaginatedResponse(requests, total, pagination));
}

async function getRequestById(req, res) {
  const requestDocument = await TravelRequest.findById(req.params.id)
    .populate("requestedBy", "-passwordHash")
    .populate("approver", "-passwordHash")
    .populate("decision.decidedBy", "-passwordHash")
    .populate("passengers.user", "-passwordHash");

  if (!requestDocument) {
    throw new HttpError(404, "Travel request not found");
  }

  await ensureCanAccessRequest(req.user, requestDocument);

  return res.json(requestDocument);
}

async function approveRequest(req, res) {
  const requestDocument = await TravelRequest.findById(req.params.id).populate({
    path: "requestedBy",
    select: "-passwordHash",
    populate: { path: "managerId", select: "-passwordHash" },
  });

  if (!requestDocument) {
    throw new HttpError(404, "Travel request not found");
  }

  ensureApprover(req.user, requestDocument);

  if (requestDocument.status !== "pending") {
    throw new HttpError(400, "Only pending requests can be approved");
  }

  requestDocument.status = "approved";
  requestDocument.decision = {
    decidedBy: req.user.id,
    decidedAt: new Date(),
    comment: req.body.comment || null,
  };

  await requestDocument.save();

  await createAuditLog({
    action: "request_approved",
    performedBy: req.user.id,
    targetRequest: requestDocument._id,
    metadata: { comment: requestDocument.decision.comment },
  });

  await notifyUser(requestDocument.requestedBy, "approved", requestDocument);

  const populated = await TravelRequest.findById(requestDocument._id)
    .populate("requestedBy", "-passwordHash")
    .populate("approver", "-passwordHash")
    .populate("decision.decidedBy", "-passwordHash")
    .populate("passengers.user", "-passwordHash");

  return res.json(populated);
}

async function rejectRequest(req, res) {
  const requestDocument = await TravelRequest.findById(req.params.id).populate({
    path: "requestedBy",
    select: "-passwordHash",
    populate: { path: "managerId", select: "-passwordHash" },
  });

  if (!requestDocument) {
    throw new HttpError(404, "Travel request not found");
  }

  ensureApprover(req.user, requestDocument);

  if (requestDocument.status !== "pending") {
    throw new HttpError(400, "Only pending requests can be rejected");
  }

  requestDocument.status = "rejected";
  requestDocument.decision = {
    decidedBy: req.user.id,
    decidedAt: new Date(),
    comment: req.body.comment,
  };

  await requestDocument.save();

  await createAuditLog({
    action: "request_rejected",
    performedBy: req.user.id,
    targetRequest: requestDocument._id,
    metadata: { comment: req.body.comment },
  });

  await notifyUser(requestDocument.requestedBy, "rejected", requestDocument);

  const populated = await TravelRequest.findById(requestDocument._id)
    .populate("requestedBy", "-passwordHash")
    .populate("approver", "-passwordHash")
    .populate("decision.decidedBy", "-passwordHash")
    .populate("passengers.user", "-passwordHash");

  return res.json(populated);
}

async function resubmitRequest(req, res) {
  const requestDocument = await TravelRequest.findById(req.params.id)
    .populate("requestedBy")
    .populate("approver");

  if (!requestDocument) {
    throw new HttpError(404, "Travel request not found");
  }

  ensureRequestOwner(req.user, requestDocument);

  if (requestDocument.status !== "rejected") {
    throw new HttpError(400, "Only rejected requests can be edited and resubmitted");
  }

  requestDocument.history.push({
    snapshot: getEditableRequestSnapshot(requestDocument),
    status: requestDocument.status,
    decision: requestDocument.decision,
    editedAt: new Date(),
  });

  requestDocument.project = req.body.project;
  requestDocument.assignedAreaOfOperation = req.body.assignedAreaOfOperation;
  requestDocument.purposeOfTrip = req.body.purposeOfTrip;
  requestDocument.modeOfTravel = req.body.modeOfTravel || {};
  requestDocument.itinerary = req.body.itinerary;
  requestDocument.passengers = normalizePassengers(req.body.passengers);
  requestDocument.version += 1;
  requestDocument.status = "pending";
  requestDocument.decision = {
    decidedBy: null,
    decidedAt: null,
    comment: null,
  };
  requestDocument.submittedAt = new Date();

  await requestDocument.save();

  await createAuditLog({
    action: "request_resubmitted",
    performedBy: req.user.id,
    targetRequest: requestDocument._id,
    metadata: { version: requestDocument.version },
  });

  await notifyUser(requestDocument.approver, "resubmitted", requestDocument);

  const populated = await TravelRequest.findById(requestDocument._id)
    .populate("requestedBy", "-passwordHash")
    .populate("approver", "-passwordHash")
    .populate("decision.decidedBy", "-passwordHash")
    .populate("passengers.user", "-passwordHash");

  return res.json(populated);
}

async function getPendingMyApproval(req, res) {
  const requests = await TravelRequest.find({
    approver: req.user.id,
    status: "pending",
  })
    .sort({ createdAt: -1 })
    .populate("requestedBy", "-passwordHash")
    .populate("approver", "-passwordHash")
    .populate("passengers.user", "-passwordHash");

  return res.json(requests);
}

module.exports = {
  createRequest,
  listRequests,
  getRequestById,
  approveRequest,
  rejectRequest,
  resubmitRequest,
  getPendingMyApproval,
};
