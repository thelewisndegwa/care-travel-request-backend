const AuditLog = require("../models/AuditLog");

async function createAuditLog({ action, performedBy, targetRequest, metadata = {} }) {
  return AuditLog.create({
    action,
    performedBy,
    targetRequest,
    metadata,
  });
}

module.exports = {
  createAuditLog,
};
