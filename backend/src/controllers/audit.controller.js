/**
 * audit.controller.js
 * Controller for Querying Immutable Compliance Audit Trails (FR-08).
 */

const { AuditEvent } = require('../models/AuditEvent');

/**
 * GET /api/audit
 * Retrieves audit event log with pagination and metadata filtering.
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.event_type) {
      filter.event_type = req.query.event_type;
    }
    if (req.query.analysis_id) {
      filter.analysis_id = req.query.analysis_id;
    }
    if (req.query.ticket_id) {
      filter.ticket_id = req.query.ticket_id;
    }
    if (req.query.correlation_id) {
      filter.correlation_id = req.query.correlation_id;
    }

    const [logs, total] = await Promise.all([
      AuditEvent.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditEvent.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAuditLogs
};
