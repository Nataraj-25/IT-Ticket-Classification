/**
 * Ticket.js
 * Core Mongoose Model representing Historical and Live IT Incident Records.
 * 
 * Supports FR-01 (Classification), FR-02 (Similarity), FR-03 (Resolution Recommendation),
 * FR-04 (Evidence Traceability), FR-07 (Search & Filtering), and FR-08 (Audit-friendly Output).
 */

const mongoose = require('mongoose');

const ALLOWED_CATEGORIES = [
  'Network',
  'Access & Identity',
  'Hardware',
  'Software',
  'Server & Infrastructure',
  'Email & Collaboration'
];

const ALLOWED_PRIORITIES = ['P1', 'P2', 'P3', 'P4'];

const ALLOWED_INTENTS = ['Incident', 'Service Request', 'Problem', 'Change Request'];

const ALLOWED_ENVIRONMENTS = ['Production', 'Staging', 'Development', 'QA', 'DR'];

const ALLOWED_STATUSES = [
  'New',
  'Assigned',
  'In Progress',
  'Pending',
  'Resolved',
  'Closed',
  'Cancelled'
];

const ALLOWED_ACCESS_LEVELS = ['internal', 'confidential', 'restricted', 'public'];

const ALLOWED_SOURCES = ['synthetic', 'production', 'sanitized_enterprise'];

const ticketSchema = new mongoose.Schema(
  {
    ticket_id: {
      type: String,
      required: [true, 'ticket_id is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^INC-\d{4,8}$/, 'ticket_id must follow the pattern INC-XXXX (e.g. INC-1001)']
    },
    title: {
      type: String,
      required: [true, 'title is required'],
      trim: true,
      minlength: [5, 'title must be at least 5 characters long'],
      maxlength: [200, 'title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'description is required'],
      trim: true,
      minlength: [10, 'description must be at least 10 characters long'],
      maxlength: [5000, 'description cannot exceed 5000 characters']
    },
    raw_text: {
      type: String,
      trim: true,
      default: function() {
        return `Title: ${this.title || ''}\nDescription: ${this.description || ''}`;
      }
    },
    category: {
      type: String,
      required: [true, 'category is required'],
      enum: {
        values: ALLOWED_CATEGORIES,
        message: '{VALUE} is not a supported ticket category'
      }
    },
    subcategory: {
      type: String,
      required: [true, 'subcategory is required'],
      trim: true
    },
    priority: {
      type: String,
      required: [true, 'priority is required'],
      enum: {
        values: ALLOWED_PRIORITIES,
        message: '{VALUE} is not a valid priority level (expected P1, P2, P3, or P4)'
      }
    },
    intent: {
      type: String,
      required: [true, 'intent is required'],
      enum: {
        values: ALLOWED_INTENTS,
        message: '{VALUE} is not a valid intent'
      },
      default: 'Incident'
    },
    affected_service: {
      type: String,
      required: [true, 'affected_service is required'],
      trim: true
    },
    environment: {
      type: String,
      required: [true, 'environment is required'],
      enum: {
        values: ALLOWED_ENVIRONMENTS,
        message: '{VALUE} is not a recognized environment'
      },
      default: 'Production'
    },
    status: {
      type: String,
      required: [true, 'status is required'],
      enum: {
        values: ALLOWED_STATUSES,
        message: '{VALUE} is not a valid ticket status'
      },
      default: 'New'
    },
    assignment_group: {
      type: String,
      required: [true, 'assignment_group is required'],
      trim: true
    },
    resolution_text: {
      type: String,
      trim: true,
      default: null,
      validate: {
        validator: function(val) {
          // If status is Resolved or Closed, resolution_text must be provided and not empty
          if (['Resolved', 'Closed'].includes(this.status)) {
            return typeof val === 'string' && val.trim().length >= 5;
          }
          return true;
        },
        message: 'A detailed resolution_text (min 5 characters) is required when status is Resolved or Closed'
      }
    },
    created_at: {
      type: Date,
      required: true,
      default: Date.now
    },
    resolved_at: {
      type: Date,
      default: null,
      validate: {
        validator: function(val) {
          if (!val) {
            // Missing resolved_at is only permitted if status is NOT Resolved or Closed
            return !['Resolved', 'Closed'].includes(this.status);
          }
          // resolved_at cannot precede created_at
          const created = this.created_at ? new Date(this.created_at) : new Date();
          return new Date(val) >= created;
        },
        message: 'resolved_at cannot precede created_at, and is mandatory for Resolved or Closed tickets'
      }
    },
    source_type: {
      type: String,
      enum: ALLOWED_SOURCES,
      default: 'synthetic'
    },
    data_access_level: {
      type: String,
      enum: ALLOWED_ACCESS_LEVELS,
      default: 'internal'
    }
  },
  {
    timestamps: false, // We use explicit created_at and resolved_at for strict audit fidelity
    versionKey: false
  }
);

// Indexes for High-Performance Read Queries
// 1. Unique index on ticket_id
ticketSchema.index({ ticket_id: 1 }, { unique: true });

// 2. Compound index for common dashboard filters: category + status
ticketSchema.index({ category: 1, status: 1 });

// 3. Compound index for priority triage queues
ticketSchema.index({ priority: 1, created_at: -1 });

// 4. Single field indexes for service and date filtering
ticketSchema.index({ affected_service: 1 });
ticketSchema.index({ created_at: -1 });

// 5. Full-Text Index for Keyword Search (FR-07)
ticketSchema.index(
  {
    title: 'text',
    description: 'text',
    resolution_text: 'text'
  },
  {
    name: 'TicketTextSearchIndex',
    weights: {
      title: 5,
      description: 2,
      resolution_text: 1
    }
  }
);

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = {
  Ticket,
  ALLOWED_CATEGORIES,
  ALLOWED_PRIORITIES,
  ALLOWED_INTENTS,
  ALLOWED_ENVIRONMENTS,
  ALLOWED_STATUSES,
  ALLOWED_ACCESS_LEVELS,
  ALLOWED_SOURCES
};
