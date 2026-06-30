const { body } = require("express-validator");

const travelRequestBaseValidators = [
  body("project.name").isString().notEmpty().withMessage("Project name is required"),
  body("project.businessUnit").isString().notEmpty().withMessage("Business unit is required"),
  body("project.fundCode").isString().notEmpty().withMessage("Fund code is required"),
  body("project.projectId").isString().notEmpty().withMessage("Project ID is required"),
  body("project.departmentId").isString().notEmpty().withMessage("Department ID is required"),
  body("project.activityId").isString().notEmpty().withMessage("Activity ID is required"),
  body("assignedAreaOfOperation")
    .isString()
    .notEmpty()
    .withMessage("Assigned area of operation is required"),
  body("purposeOfTrip").isString().notEmpty().withMessage("Purpose of trip is required"),
  body("modeOfTravel.careVehicle").optional().isBoolean(),
  body("modeOfTravel.publicTransport").optional().isBoolean(),
  body("modeOfTravel.aircraft").optional().isBoolean(),
  body("itinerary.dateFrom").isISO8601().withMessage("Start date is required"),
  body("itinerary.dateTo").isISO8601().withMessage("End date is required"),
  body("itinerary.destination").isString().notEmpty().withMessage("Destination is required"),
  body("itinerary.accommodationNeeded").optional().isBoolean(),
  body("passengers").optional().isArray(),
  body("passengers.*.user").optional().isMongoId(),
  body("passengers.*.employeeNumber").optional().isString(),
  body("passengers.*.name").optional().isString().notEmpty(),
];

const createTravelRequestValidator = travelRequestBaseValidators;

const resubmitTravelRequestValidator = travelRequestBaseValidators;

const rejectTravelRequestValidator = [
  body("comment").isString().notEmpty().withMessage("Rejection comment is required"),
];

module.exports = {
  createTravelRequestValidator,
  resubmitTravelRequestValidator,
  rejectTravelRequestValidator,
};
