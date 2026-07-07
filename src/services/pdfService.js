const PDFDocument = require("pdfkit");

function formatDate(value) {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return `KES ${amount.toFixed(2)}`;
}

function writeSectionTitle(doc, title) {
  doc.moveDown().font("Helvetica-Bold").fontSize(14).text(title);
  doc.moveDown(0.5).font("Helvetica").fontSize(11);
}

function streamPdf(res, filename, buildContent) {
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  doc.pipe(res);
  buildContent(doc);
  doc.end();
}

function buildTravelRequestPdf(res, requestDocument) {
  streamPdf(res, `travel-request-${requestDocument._id}.pdf`, (doc) => {
    doc.font("Helvetica-Bold").fontSize(18).text("Travel Request");
    doc.moveDown();
    doc.font("Helvetica").fontSize(11);
    doc.text(`Request ID: ${requestDocument._id}`);
    doc.text(`Submitted At: ${formatDate(requestDocument.submittedAt)}`);
    doc.text(`Status: ${requestDocument.status}`);
    doc.text(`Requester: ${requestDocument.requestedBy?.name || "N/A"}`);
    doc.text(
      `Selected Approver: ${requestDocument.selected_approver_id?.name || "N/A"}`
    );

    writeSectionTitle(doc, "Project");
    doc.text(`Name: ${requestDocument.project?.name || "N/A"}`);
    doc.text(`Business Unit: ${requestDocument.project?.businessUnit || "N/A"}`);
    doc.text(`Fund Code: ${requestDocument.project?.fundCode || "N/A"}`);
    doc.text(`Project ID: ${requestDocument.project?.projectId || "N/A"}`);
    doc.text(`Department ID: ${requestDocument.project?.departmentId || "N/A"}`);
    doc.text(`Activity ID: ${requestDocument.project?.activityId || "N/A"}`);

    writeSectionTitle(doc, "Trip Details");
    doc.text(
      `Assigned Area Of Operation: ${requestDocument.assignedAreaOfOperation || "N/A"}`
    );
    doc.text(`Purpose Of Trip: ${requestDocument.purposeOfTrip || "N/A"}`);
    doc.text(`Destination: ${requestDocument.itinerary?.destination || "N/A"}`);
    doc.text(`Date From: ${formatDate(requestDocument.itinerary?.dateFrom)}`);
    doc.text(`Date To: ${formatDate(requestDocument.itinerary?.dateTo)}`);
    doc.text(
      `Accommodation Needed: ${requestDocument.itinerary?.accommodationNeeded ? "Yes" : "No"}`
    );

    writeSectionTitle(doc, "Passengers");
    if (!requestDocument.passengers?.length) {
      doc.text("No passengers listed.");
    } else {
      requestDocument.passengers.forEach((passenger, index) => {
        doc.text(
          `${index + 1}. ${passenger.name} (${passenger.employeeNumber || "No employee number"})`
        );
      });
    }

    if (requestDocument.decision?.decidedAt) {
      writeSectionTitle(doc, "Decision");
      doc.text(`Decided By: ${requestDocument.decision.decidedBy?.name || "N/A"}`);
      doc.text(`Decided At: ${formatDate(requestDocument.decision.decidedAt)}`);
      doc.text(`Comment: ${requestDocument.decision.comment || "None"}`);
    }
  });
}

function buildReimbursementPdf(res, report) {
  streamPdf(res, `reimbursement-${report._id}.pdf`, (doc) => {
    doc.font("Helvetica-Bold").fontSize(18).text("Reimbursement Report");
    doc.moveDown();
    doc.font("Helvetica").fontSize(11);
    doc.text(`Report ID: ${report._id}`);
    doc.text(`Travel Request ID: ${report.travelRequest?._id || "N/A"}`);
    doc.text(`Submitted At: ${formatDate(report.submittedAt)}`);
    doc.text(`Status: ${report.status}`);
    doc.text(`Submitted By: ${report.submittedBy?.name || "N/A"}`);
    doc.text(`Selected Approver: ${report.selected_approver_id?.name || "N/A"}`);
    doc.text(`Base Location: ${report.baseLocation || "N/A"}`);
    doc.text(`Department: ${report.department || "N/A"}`);
    doc.text(`Position: ${report.position || "N/A"}`);
    doc.text(`Employee Number: ${report.employeeNumber || "N/A"}`);
    doc.text(`Total Amount: ${formatCurrency(report.totalAmountKsh)}`);

    writeSectionTitle(doc, "Line Items");
    if (!report.lineItems?.length) {
      doc.text("No line items found.");
    } else {
      report.lineItems.forEach((item, index) => {
        doc
          .font("Helvetica-Bold")
          .text(`${index + 1}. ${item.description}`)
          .font("Helvetica");
        doc.text(`Date: ${formatDate(item.expenseDate)}`);
        doc.text(`Location: ${item.location}`);
        doc.text(`Amount: ${formatCurrency(item.amount)}`);
        doc.text(`Receipt URL: ${item.receiptUrl || "N/A"}`);
        doc.moveDown(0.5);
      });
    }

    if (report.decision?.decidedAt) {
      writeSectionTitle(doc, "Decision");
      doc.text(`Decided By: ${report.decision.decidedBy?.name || "N/A"}`);
      doc.text(`Decided At: ${formatDate(report.decision.decidedAt)}`);
      doc.text(`Comment: ${report.decision.comment || "None"}`);
    }
  });
}

module.exports = {
  buildTravelRequestPdf,
  buildReimbursementPdf,
};
