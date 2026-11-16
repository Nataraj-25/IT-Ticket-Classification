/**
 * retrieval.controller.js
 * Express Controller for Hybrid Ticket Similarity & Duplicate Candidate Detection.
 */

const { Ticket } = require('../models/Ticket');
const mlService = require('../services/ml.service');

const getSimilarTickets = async (req, res, next) => {
  try {
    let { ticket_id, title, description, affected_service, environment, top_k = 5, filters = {}, method = 'hybrid' } = req.body;

    // If ticket_id provided, fetch ground truth record from MongoDB
    if (ticket_id && (!title || !description)) {
      const existingTicket = await Ticket.findOne({
        ticket_id: { $regex: new RegExp(`^${ticket_id.trim()}$`, 'i') }
      }).lean();

      if (!existingTicket) {
        return res.status(404).json({
          success: false,
          error: `Ticket with ID '${ticket_id}' was not found in MongoDB`,
          timestamp: new Date().toISOString()
        });
      }

      title = title || existingTicket.title;
      description = description || existingTicket.description;
      affected_service = affected_service || existingTicket.affected_service;
      environment = environment || existingTicket.environment;
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'title is required to perform similarity retrieval',
        timestamp: new Date().toISOString()
      });
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'description is required to perform similarity retrieval',
        timestamp: new Date().toISOString()
      });
    }

    // Attach caller's access level to filters
    const userAccess = req.headers['x-user-access-level'] || 'internal';
    const effectiveFilters = {
      ...(filters || {}),
      user_data_access_level: userAccess
    };

    const topKNum = Math.min(20, Math.max(1, parseInt(top_k, 10) || 5));

    // Delegate to Python FastAPI retrieval service
    const retrievalResult = await mlService.retrieveSimilarTickets({
      ticket_id,
      title: title.trim(),
      description: description.trim(),
      affected_service: affected_service ? affected_service.trim() : null,
      environment: environment ? environment.trim() : null,
      top_k: topKNum,
      filters: effectiveFilters,
      method
    });

    return res.status(200).json({
      success: true,
      data: retrievalResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    if (error.statusCode === 503 || error.statusCode === 504) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        fallback: {
          query_ticket_id: req.body.ticket_id || null,
          retrieval_method: req.body.method || 'hybrid',
          results: [],
          retrieval_model_version: 'fallback-offline',
          notice: 'ML Retrieval service is currently unavailable; duplicate detection deferred to human triage.'
        },
        timestamp: new Date().toISOString()
      });
    }
    next(error);
  }
};

module.exports = {
  getSimilarTickets
};
