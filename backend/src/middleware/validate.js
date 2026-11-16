/**
 * validate.js
 * Request Payload Validation Middleware for Ticket Creation & Updates.
 */

const {
  ALLOWED_CATEGORIES,
  ALLOWED_PRIORITIES,
  ALLOWED_STATUSES,
  ALLOWED_ENVIRONMENTS
} = require('../models/Ticket');

const validateCreateTicket = (req, res, next) => {
  const { title, description, category, priority } = req.body;
  const errors = [];

  if (!title || typeof title !== 'string' || title.trim().length < 5) {
    errors.push('title is required and must be at least 5 characters');
  }

  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    errors.push('description is required and must be at least 10 characters');
  }

  if (!category || !ALLOWED_CATEGORIES.includes(category)) {
    errors.push(`category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`);
  }

  if (!priority || !ALLOWED_PRIORITIES.includes(priority)) {
    errors.push(`priority must be one of: ${ALLOWED_PRIORITIES.join(', ')}`);
  }

  if (req.body.status && !ALLOWED_STATUSES.includes(req.body.status)) {
    errors.push(`status must be one of: ${ALLOWED_STATUSES.join(', ')}`);
  }

  if (req.body.environment && !ALLOWED_ENVIRONMENTS.includes(req.body.environment)) {
    errors.push(`environment must be one of: ${ALLOWED_ENVIRONMENTS.join(', ')}`);
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Request Body',
      details: errors,
      timestamp: new Date().toISOString()
    });
  }

  next();
};

module.exports = {
  validateCreateTicket
};
