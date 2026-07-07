const User = require("../models/User");
const TravelRequest = require("../models/TravelRequest");
const ReimbursementReport = require("../models/ReimbursementReport");
const ExpenseLineItem = require("../models/ExpenseLineItem");
const HttpError = require("../utils/httpError");
const { createAuditLog } = require("../services/auditLogService");
const { getEligibleApproverById } = require("../services/approverService");
const { notifyReimbursementUser } = require("../services/notificationService");
const { buildReimbursementPdf } = require("../services/pdfService");
const {
  ensureCanAccessReport,
  ensureReportOwner,
  ensureReportApprover,
} = require("../services/reimbursementAccessService");
const {
  getReimbursementPopulateQuery,
  populateReport,
  buildReimbursementResponse,
  buildReimbursementDraftData,
  normalizeLineItems,
  recalculateReportTotal,
  attachLineItems,
  replaceReportLineItems,
  applyReimbursementUpdate,
  applyLiquidation,
  applyApprovalDecision,
} = require("../services/reimbursementService");

async function createReimbursement(req, res) {
  const submitter = await User.findById(req.user.id);

  if (!submitter || !submitter.isActive) {
    throw new HttpError(404, "User not found");
  }

  const travelRequest = await TravelRequest.findById(req.body.travelRequestId);

  if (!travelRequest) {
    throw new HttpError(404, "Travel request not found");
  }

  if (travelRequest.status !== "approved") {
    throw new HttpError(400, "Reimbursement requires an approved travel request");
  }

  if (travelRequest.requestedBy.toString() !== submitter._id.toString()) {
    throw new HttpError(403, "You can only submit reimbursement for your own travel");
  }

  const approver = await getEligibleApproverById(req.body.selected_approver_id);

  const lineItems = normalizeLineItems(req.body.lineItems);
  let report;

  try {
    report = await ReimbursementReport.create(
      buildReimbursementDraftData(
        { ...req.body, travelRequestId: travelRequest._id },
        submitter._id,
        approver._id,
        submitter
      )
    );

    await replaceReportLineItems(report._id, lineItems);

    await recalculateReportTotal(report._id);
  } catch (error) {
    if (report?._id) {
      await ExpenseLineItem.deleteMany({ report: report._id });
      await ReimbursementReport.findByIdAndDelete(report._id);
    }

    if (error.code === 11000) {
      throw new HttpError(
        409,
        "A reimbursement report already exists for this travel request"
      );
    }

    throw error;
  }

  await createAuditLog({
    action: "reimbursement_created",
    performedBy: submitter._id,
    targetReimbursement: report._id,
    metadata: { travelRequest: travelRequest._id, status: "pending" },
  });

  const response = await buildReimbursementResponse(report._id);
  await notifyReimbursementUser(approver, "reimbursement_submitted", response);

  return res.status(201).json(response);
}

async function getMyReimbursements(req, res) {
  const filter = req.user.role === "superadmin" ? {} : { submittedBy: req.user.id };
  const reports = await getReimbursementPopulateQuery(
    ReimbursementReport.find(filter).sort({ createdAt: -1 })
  );

  const data = await attachLineItems(reports);
  return res.json(data);
}

async function getPendingApprovals(req, res) {
  const reports = await getReimbursementPopulateQuery(
    ReimbursementReport.find({
      selected_approver_id: req.user.id,
      status: "pending",
    }).sort({ submittedAt: -1 })
  );

  const data = await attachLineItems(reports);
  return res.json(data);
}

async function getReimbursementById(req, res) {
  const report = await populateReport(req.params.id);

  if (!report) {
    throw new HttpError(404, "Reimbursement report not found");
  }

  ensureCanAccessReport(req.user, report);

  return res.json(await buildReimbursementResponse(report._id));
}

async function updateReimbursement(req, res) {
  const report = await ReimbursementReport.findById(req.params.id);

  if (!report) {
    throw new HttpError(404, "Reimbursement report not found");
  }

  ensureReportOwner(req.user, report);

  if (report.status !== "pending") {
    throw new HttpError(400, "Only pending reimbursement reports can be updated");
  }

  const approver = await getEligibleApproverById(req.body.selected_approver_id);
  const lineItems = normalizeLineItems(req.body.lineItems);

  applyReimbursementUpdate(report, req.body, approver._id);

  await report.save();

  await replaceReportLineItems(report._id, lineItems);
  await recalculateReportTotal(report._id);

  await createAuditLog({
    action: "reimbursement_updated",
    performedBy: req.user.id,
    targetReimbursement: report._id,
    metadata: { status: report.status },
  });

  const response = await buildReimbursementResponse(report._id);
  return res.json(response);
}

async function updateReimbursementStatus(req, res) {
  const { status, comment } = req.body;

  const report = await ReimbursementReport.findById(req.params.id).populate(
    "submittedBy",
    "-passwordHash"
  );

  if (!report) {
    throw new HttpError(404, "Reimbursement report not found");
  }

  if (status === "liquidated") {
    if (report.status !== "approved") {
      throw new HttpError(400, "Only approved reports can be liquidated");
    }

    applyLiquidation(report, req.user.id, comment);

    await report.save();

    await createAuditLog({
      action: "reimbursement_liquidated",
      performedBy: req.user.id,
      targetReimbursement: report._id,
      metadata: { status: "liquidated" },
    });
  } else {
    ensureReportApprover(req.user, report);

    if (report.status !== "pending") {
      throw new HttpError(400, "Only pending reports can be approved or rejected");
    }

    applyApprovalDecision(report, status, req.user.id, comment);

    await report.save();

    await createAuditLog({
      action: status === "approved" ? "reimbursement_approved" : "reimbursement_rejected",
      performedBy: req.user.id,
      targetReimbursement: report._id,
      metadata: { status: report.status, comment: report.decision.comment },
    });
  }

  const response = await buildReimbursementResponse(report._id);

  if (status === "approved") {
    await notifyReimbursementUser(response.submittedBy, "reimbursement_approved", response);
  } else if (status === "rejected") {
    await notifyReimbursementUser(response.submittedBy, "reimbursement_rejected", response);
  }

  return res.json(response);
}

async function downloadReimbursementPdf(req, res) {
  const report = await populateReport(req.params.id);

  if (!report) {
    throw new HttpError(404, "Reimbursement report not found");
  }

  ensureCanAccessReport(req.user, report);

  buildReimbursementPdf(res, await buildReimbursementResponse(report._id));
}

async function deleteReimbursementReport(reportId) {
  await ExpenseLineItem.deleteMany({ report: reportId });
  await ReimbursementReport.findByIdAndDelete(reportId);
}

module.exports = {
  createReimbursement,
  getMyReimbursements,
  getPendingApprovals,
  getReimbursementById,
  updateReimbursement,
  updateReimbursementStatus,
  downloadReimbursementPdf,
  deleteReimbursementReport,
};
