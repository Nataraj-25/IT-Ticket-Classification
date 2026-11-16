/**
 * AnalystFeedback.js
 * Captures Human Expert Adjudication and Feedback on Classification, Retrieval, and Recommendations.
 * Supports FR-06 Analyst Feedback.
 */

const mongoose = require('mongoose');

const FEEDBACK_STATUSES = ['useful', 'incorrect', 'unresolved'];
const TARGET_TYPES = ['recommendation', 'similar_ticket', 'classification'];

const analystFeedbackSchema = new mongoose.Schema(
  {
    feedback_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    analysis_id: {
      type: String,
      required: true,
      ref: 'Analysis',
      index: true
    },
    target_type: {
      type: String,
      required: true,
      enum: {
        values: TARGET_TYPES,
        message: '{VALUE} is not a supported feedback target_type'
      }
    },
    target_id: {
      type: String,
      required: true,
      trim: true
    },
    reviewer_reference: {
      user_id: { type: String, default: 'analyst-current' },
      role: { type: String, default: 'IT Support Analyst' },
      name: { type: String, default: 'IT Triage Specialist' }
    },
    feedback_status: {
      type: String,
      required: true,
      enum: {
        values: FEEDBACK_STATUSES,
        message: '{VALUE} is not a valid feedback status (must be useful, incorrect, or unresolved)'
      }
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: ''
    },
    created_at: {
      type: Date,
      default: Date.now,
      index: true
    },
    updated_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    versionKey: false
  }
);

analystFeedbackSchema.index({ analysis_id: 1, target_id: 1 });

const AnalystFeedback = mongoose.model('AnalystFeedback', analystFeedbackSchema);

module.exports = {
  AnalystFeedback,
  FEEDBACK_STATUSES,
  TARGET_TYPES
};
