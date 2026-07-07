const { body } = require("express-validator");

const selectedApproverValidator = body("selected_approver_id")
  .isMongoId()
  .withMessage("A valid selected approver ID is required");

const reimbursementHeaderValidators = [
  selectedApproverValidator,
  body("baseLocation").isString().notEmpty().withMessage("Base location is required"),
  body("employeeNumber").optional().isString(),
  body("department").optional().isString(),
  body("position").optional().isString(),
];

const reimbursementLineItemValidators = [
  body("lineItems").isArray({ min: 1 }).withMessage("At least one expense line item is required"),
  body("lineItems.*.expenseDate").isISO8601().withMessage("Each line item needs a valid expense date"),
  body("lineItems.*.location").isString().notEmpty().withMessage("Each line item needs a location"),
  body("lineItems.*.description")
    .isString()
    .notEmpty()
    .withMessage("Each line item needs a description"),
  body("lineItems.*.amount")
    .isFloat({ min: 0.01 })
    .withMessage("Each line item amount must be greater than zero"),
  body("lineItems.*.receiptUrl").optional({ values: "null" }).isString(),
];

const createReimbursementValidator = [
  body("travelRequestId").isMongoId().withMessage("A valid travel request ID is required"),
  ...reimbursementHeaderValidators,
  ...reimbursementLineItemValidators,
];

const updateReimbursementValidator = [
  ...reimbursementHeaderValidators,
  ...reimbursementLineItemValidators,
];

const updateReimbursementStatusValidator = [
  body("status")
    .isIn(["approved", "rejected", "liquidated"])
    .withMessage("Status must be approved, rejected, or liquidated"),
  body("comment")
    .if(body("status").equals("rejected"))
    .isString()
    .notEmpty()
    .withMessage("Rejection comment is required"),
  body("comment").optional({ values: "null" }).isString(),
];

module.exports = {
  createReimbursementValidator,
  updateReimbursementValidator,
  updateReimbursementStatusValidator,
};
