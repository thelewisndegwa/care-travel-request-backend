function getEditableRequestSnapshot(requestDocument) {
  return {
    project: requestDocument.project,
    assignedAreaOfOperation: requestDocument.assignedAreaOfOperation,
    purposeOfTrip: requestDocument.purposeOfTrip,
    modeOfTravel: requestDocument.modeOfTravel,
    itinerary: requestDocument.itinerary,
    passengers: requestDocument.passengers,
  };
}

module.exports = {
  getEditableRequestSnapshot,
};
