const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        "request_created",
        "request_approved",
        "request_rejected",
        "request_resubmitted",
      ],
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TravelRequest",
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

auditLogSchema.index({ targetRequest: 1, timestamp: -1 });
auditLogSchema.index({ performedBy: 1, timestamp: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
