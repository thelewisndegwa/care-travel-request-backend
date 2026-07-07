const TravelRequest = require("../models/TravelRequest");

function getTravelRequestPopulateQuery(query) {
  return query
    .populate("requestedBy", "-passwordHash")
    .populate("selected_approver_id", "-passwordHash")
    .populate("decision.decidedBy", "-passwordHash")
    .populate("passengers.user", "-passwordHash");
}

async function populateTravelRequestById(requestId) {
  return getTravelRequestPopulateQuery(TravelRequest.findById(requestId));
}

async function buildTravelRequestResponse(requestId) {
  return populateTravelRequestById(requestId);
}

function getEditableRequestSnapshot(requestDocument) {
  return {
    selected_approver_id: requestDocument.selected_approver_id,
    project: requestDocument.project,
    assignedAreaOfOperation: requestDocument.assignedAreaOfOperation,
    purposeOfTrip: requestDocument.purposeOfTrip,
    modeOfTravel: requestDocument.modeOfTravel,
    itinerary: requestDocument.itinerary,
    passengers: requestDocument.passengers,
  };
}

function applyRequestDecision(requestDocument, status, decidedBy, comment = null) {
  requestDocument.status = status;
  requestDocument.decision = {
    decidedBy,
    decidedAt: new Date(),
    comment,
  };

  if (status === "approved" && requestDocument.submittedAt == null) {
    requestDocument.submittedAt = new Date();
  }
}

function resetRequestDecision(requestDocument) {
  requestDocument.decision = {
    decidedBy: null,
    decidedAt: null,
    comment: null,
  };
}

function applyRequestResubmission(requestDocument, payload, approverId, passengers) {
  requestDocument.project = payload.project;
  requestDocument.assignedAreaOfOperation = payload.assignedAreaOfOperation;
  requestDocument.purposeOfTrip = payload.purposeOfTrip;
  requestDocument.modeOfTravel = payload.modeOfTravel || {};
  requestDocument.itinerary = payload.itinerary;
  requestDocument.passengers = passengers;
  requestDocument.selected_approver_id = approverId;
  requestDocument.version += 1;
  requestDocument.status = "pending";
  resetRequestDecision(requestDocument);
  requestDocument.submittedAt = new Date();
}

module.exports = {
  getTravelRequestPopulateQuery,
  populateTravelRequestById,
  buildTravelRequestResponse,
  getEditableRequestSnapshot,
  applyRequestDecision,
  resetRequestDecision,
  applyRequestResubmission,
};
