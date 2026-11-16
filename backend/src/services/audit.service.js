/**
 * audit.service.js
 * Immutable Audit Event Logging Service (FR-08 Traceability and Compliance).
 */

const { AuditEvent } = require('../models/AuditEvent');

/**
 * Creates an immutable audit event record in MongoDB.
 * Never leaks credentials or sensitive secrets.
 */
const logEvent = async ({
  event_type,
  correlation_id,
  analysis_id = null,
  ticket_id = null,
  actor_reference = { actor_id: 'system', actor_type: 'system' },
  component_status = 'completed',
  metadata = {}
}) => {
  try {
    const event_id = `AUD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const event = new AuditEvent({
      event_id,
      correlation_id: correlation_id || `CORR-${Date.now()}`,
      analysis_id,
      ticket_id,
      event_type,
      actor_reference,
      component_status,
      metadata,
      timestamp: new Date()
    });

    await event.save();
    return event;
  } catch (err) {
    // Non-blocking for primary application flow, but logged for ops
    console.error(`[AUDIT_ERROR] Failed to persist audit event ${event_type}:`, err.message);
    return null;
  }
};

module.exports = {
  logEvent
};
