/**
 * Analysis.js
 * Comprehensive Mongoose Model for Unified AI Ticket Analysis Records (FR-04, FR-08).
 * Stores Classification, Hybrid Retrieval, Evidence-Backed Recommendations, and Audit Trail.
 */

const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema(
  {
    analysis_id: {
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
    ticket_id: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    input_snapshot: {
      title: { type: String, required: true },
      description: { type: String, required: true },
      affected_service: { type: String, default: null },
      environment: { type: String, default: null },
      user_access_level: { type: String, default: 'internal' }
    },
    classification: {
      category: { type: String, default: null },
      subcategory: { type: String, default: null },
      priority: { type: String, default: null },
      intent: { type: String, default: null },
      confidence_score: { type: Number, default: 0.0 },
      calibrated: { type: Boolean, default: false },
      review_required: { type: Boolean, default: false },
      review_reason: { type: String, default: null },
      model_version: { type: String, default: null },
      status: {
        type: String,
        enum: ['completed', 'failed', 'unavailable', 'skipped'],
        default: 'completed'
      }
    },
    similar_tickets: [
      {
        ticket_id: { type: String, required: true },
        title: { type: String, required: true },
        description_excerpt: { type: String },
        affected_service: { type: String },
        category: { type: String },
        status: { type: String },
        similarity_score: { type: Number },
        bm25_score: { type: Number },
        rrf_score: { type: Number },
        hybrid_rank: { type: Number },
        potential_duplicate: { type: Boolean, default: false },
        duplicate_confidence: { type: Number, default: 0.0 },
        duplicate_reason: { type: String },
        match_reason: { type: String }
      }
    ],
    recommendations: [
      {
        recommendation_id: { type: String, required: true },
        title: { type: String, required: true },
        steps: [{ type: String }],
        evidence: [
          {
            source_id: { type: String, required: true },
            source_type: { type: String, default: 'historical_ticket' },
            title: { type: String },
            excerpt: { type: String, required: true },
            relevance_reason: { type: String, required: true },
            similarity_score: { type: Number }
          }
        ],
        limitations: [{ type: String }],
        security_warnings: [{ type: String }]
      }
    ],
    confidence: {
      level: {
        type: String,
        enum: ['high', 'medium', 'low', 'insufficient_evidence'],
        default: 'insufficient_evidence'
      },
      basis: { type: String, default: '' }
    },
    clarification_questions: [{ type: String }],
    review_required: {
      type: Boolean,
      default: true
    },
    review_reasons: [{ type: String }],
    component_statuses: {
      classification: {
        type: String,
        enum: ['completed', 'failed', 'unavailable', 'skipped'],
        default: 'completed'
      },
      retrieval: {
        type: String,
        enum: ['completed', 'failed', 'unavailable', 'skipped'],
        default: 'completed'
      },
      recommendation: {
        type: String,
        enum: ['completed', 'failed', 'unavailable', 'skipped'],
        default: 'completed'
      }
    },
    status: {
      type: String,
      enum: ['completed', 'partial', 'failed', 'review_required'],
      default: 'completed',
      index: true
    },
    model_versions: {
      classification: { type: String, default: 'category-tfidf-logreg-v1' },
      retrieval: { type: String, default: 'hybrid-rrf-v1' },
      recommendation: { type: String, default: 'recommendation-v1' }
    },
    execution_latency_ms: {
      total: { type: Number, default: 0 },
      classification: { type: Number, default: 0 },
      retrieval: { type: Number, default: 0 },
      recommendation: { type: Number, default: 0 },
      orchestration: { type: Number, default: 0 }
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

analysisSchema.index({ ticket_id: 1, created_at: -1 });

const Analysis = mongoose.model('Analysis', analysisSchema);

module.exports = Analysis;
