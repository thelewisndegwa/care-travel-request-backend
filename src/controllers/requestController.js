const TravelRequest = require("../models/TravelRequest");
const User = require("../models/User");
const HttpError = require("../utils/httpError");
const { notifyTravelRequestUser } = require("../services/notificationService");
const { createAuditLog } = require("../services/auditLogService");
const { getEligibleApproverById } = require("../services/approverService");
const { buildTravelRequestPdf } = require("../services/pdfService");
const {
  ensureCanAccessRequest,
  ensureApprover,
  ensureRequestOwner,
} = require("../services/requestAccessService");
const {
  getPagination,
  buildPaginatedResponse,
} = require("../services/requestFilterService");
const {
  getTravelRequestPopulateQuery,
  populateTravelRequestById,
  buildTravelRequestResponse,
  getEditableRequestSnapshot,
  applyRequestDecision,
  applyRequestResubmission,
} = require("../services/travelRequestService");

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

  const approver = await getEligibleApproverById(req.body.selected_approver_id);

  const requestDocument = await TravelRequest.create({
    requestedBy: requester._id,
    selected_approver_id: approver._id,
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

  await notifyTravelRequestUser(approver, "new_request", requestDocument);

  const populated = await buildTravelRequestResponse(requestDocument._id);

  return res.status(201).json(populated);
}

async function listRequests(req, res) {
  const pagination = getPagination(req.query);
  const query = TravelRequest.find(req.requestScope).sort({ createdAt: -1 });

  const [requests, total] = await Promise.all([
    getTravelRequestPopulateQuery(query.skip(pagination.skip).limit(pagination.limit)),
    TravelRequest.countDocuments(req.requestScope),
  ]);

  return res.json(buildPaginatedResponse(requests, total, pagination));
}

async function getRequestById(req, res) {
  const requestDocument = await populateTravelRequestById(req.params.id);

  if (!requestDocument) {
    throw new HttpError(404, "Travel request not found");
  }

  await ensureCanAccessRequest(req.user, requestDocument);

  return res.json(requestDocument);
}

async function approveRequest(req, res) {
  const requestDocument = await TravelRequest.findById(req.params.id).populate(
    "requestedBy",
    "-passwordHash"
  );

  if (!requestDocument) {
    throw new HttpError(404, "Travel request not found");
  }

  ensureApprover(req.user, requestDocument);

  if (requestDocument.status !== "pending") {
    throw new HttpError(400, "Only pending requests can be approved");
  }

  applyRequestDecision(requestDocument, "approved", req.user.id, req.body?.comment || null);

  await requestDocument.save();

  await createAuditLog({
    action: "request_approved",
    performedBy: req.user.id,
    targetRequest: requestDocument._id,
    metadata: { comment: requestDocument.decision.comment },
  });

  await notifyTravelRequestUser(requestDocument.requestedBy, "approved", requestDocument);

  const populated = await buildTravelRequestResponse(requestDocument._id);

  return res.json(populated);
}

async function rejectRequest(req, res) {
  const requestDocument = await TravelRequest.findById(req.params.id).populate(
    "requestedBy",
    "-passwordHash"
  );

  if (!requestDocument) {
    throw new HttpError(404, "Travel request not found");
  }

  ensureApprover(req.user, requestDocument);

  if (requestDocument.status !== "pending") {
    throw new HttpError(400, "Only pending requests can be rejected");
  }

  applyRequestDecision(requestDocument, "rejected", req.user.id, req.body?.comment);

  await requestDocument.save();

  await createAuditLog({
    action: "request_rejected",
    performedBy: req.user.id,
    targetRequest: requestDocument._id,
    metadata: { comment: req.body?.comment ?? null },
  });

  await notifyTravelRequestUser(requestDocument.requestedBy, "rejected", requestDocument);

  const populated = await buildTravelRequestResponse(requestDocument._id);

  return res.json(populated);
}

async function resubmitRequest(req, res) {
  const requestDocument = await TravelRequest.findById(req.params.id)
    .populate("requestedBy")
    .populate("selected_approver_id");

  if (!requestDocument) {
    throw new HttpError(404, "Travel request not found");
  }

  ensureRequestOwner(req.user, requestDocument);

  if (requestDocument.status !== "rejected") {
    throw new HttpError(400, "Only rejected requests can be edited and resubmitted");
  }

  const approver = await getEligibleApproverById(req.body.selected_approver_id);

  requestDocument.history.push({
    snapshot: getEditableRequestSnapshot(requestDocument),
    status: requestDocument.status,
    decision: requestDocument.decision,
    editedAt: new Date(),
  });

  applyRequestResubmission(
    requestDocument,
    req.body,
    approver._id,
    normalizePassengers(req.body.passengers)
  );

  await requestDocument.save();

  await createAuditLog({
    action: "request_resubmitted",
    performedBy: req.user.id,
    targetRequest: requestDocument._id,
    metadata: { version: requestDocument.version },
  });

  await notifyTravelRequestUser(approver, "resubmitted", requestDocument);

  const populated = await buildTravelRequestResponse(requestDocument._id);

  return res.json(populated);
}

async function getPendingMyApproval(req, res) {
  const requests = await getTravelRequestPopulateQuery(
    TravelRequest.find({
    selected_approver_id: req.user.id,
    status: "pending",
  })
      .sort({ createdAt: -1 })
  );

  return res.json(requests);
}

async function downloadTravelRequestPdf(req, res) {
  const requestDocument = await populateTravelRequestById(req.params.id);

  if (!requestDocument) {
    throw new HttpError(404, "Travel request not found");
  }

  await ensureCanAccessRequest(req.user, requestDocument);

  buildTravelRequestPdf(res, requestDocument);
}

module.exports = {
  createRequest,
  listRequests,
  getRequestById,
  approveRequest,
  rejectRequest,
  resubmitRequest,
  getPendingMyApproval,
  downloadTravelRequestPdf,
};
