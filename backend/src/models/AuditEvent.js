/**
 * AuditEvent.js
 * Immutable Audit Log Schema for Enterprise Compliance and Traceability (FR-08).
 * Records end-to-end event chain:
 * Ticket Submitted -> Analysis Started -> Classification -> Retrieval -> Recommendation -> Feedback
 */

const mongoose = require('mongoose');

const AUDIT_EVENT_TYPES = [
  'TICKET_SUBMITTED',
  'TICKET_CREATED',
  'TICKET_UPDATED',
  'TICKET_STATUS_CHANGED',
  'ANALYSIS_STARTED',
  'CLASSIFICATION_COMPLETED',
  'RETRIEVAL_COMPLETED',
  'RECOMMENDATION_COMPLETED',
  'ANALYSIS_COMPLETED',
  'ANALYSIS_PARTIAL',
  'ANALYSIS_FAILED',
  'FEEDBACK_SUBMITTED',
  'FEEDBACK_REVISED',
  'SEED_INGESTED'
];

const auditEventSchema = new mongoose.Schema(
  {
    event_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    correlation_id: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    analysis_id: {
      type: String,
      trim: true,
      index: true,
      default: null
    },
    ticket_id: {
      type: String,
      trim: true,
      index: true,
      default: null
    },
    event_type: {
      type: String,
      required: true,
      enum: {
        values: AUDIT_EVENT_TYPES,
        message: '{VALUE} is not a valid audit event type'
      },
      index: true
    },
    actor_reference: {
      actor_id: { type: String, default: 'system' },
      actor_type: { type: String, enum: ['system', 'user', 'analyst', 'seeder'], default: 'system' },
      ip_address: { type: String, default: null }
    },
    component_status: {
      type: String,
      enum: ['started', 'completed', 'failed', 'unavailable', 'skipped'],
      default: 'completed'
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    versionKey: false
  }
);

auditEventSchema.index({ correlation_id: 1, timestamp: 1 });
auditEventSchema.index({ event_type: 1, timestamp: -1 });

const AuditEvent = mongoose.model('AuditEvent', auditEventSchema);

module.exports = {
  AuditEvent,
  AUDIT_EVENT_TYPES
};
