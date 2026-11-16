/**
 * classify.controller.js
 * Express Controller orchestrating ticket classification, ML service delegation,
 * and MongoDB Analysis persistence.
 */

const mlService = require('../services/ml.service');
const Analysis = require('../models/Analysis');

const classifyTicket = async (req, res, next) => {
  const { title, description, affected_service, ticket_id } = req.body;

  // 1. Basic Request Validation
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'title is required and cannot be empty',
      timestamp: new Date().toISOString()
    });
  }

  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'description is required and cannot be empty',
      timestamp: new Date().toISOString()
    });
  }

  try {
    // 2. Delegate to FastAPI ML Service
    const mlResponse = await mlService.classifyTicket({
      ticket_id,
      title,
      description,
      affected_service
    });

    // 3. Persist Analysis Record in MongoDB (if ticket_id is present and category predicted)
    let analysisId = `ANL-${Date.now()}`;
    if (mlResponse.classification?.category) {
      try {
        const analysisDoc = new Analysis({
          analysis_id: analysisId,
          ticket_id: req.body.ticket_id || `DRAFT-${Date.now()}`,
          predicted_classification: {
            category: mlResponse.classification.category,
            subcategory: mlResponse.classification.subcategory || 'Unassigned',
            priority: mlResponse.classification.priority || 'P3'
          },
          classification_confidence: mlResponse.confidence.category_score,
          similar_ticket_references: [],
          recommended_resolution: {
            text: 'Triage pending (Phase 3 resolution engine)',
            confidence: 0.0,
            source: 'historical_match'
          },
          evidence_references: [],
          review_required: mlResponse.review_required,
          model_version: mlResponse.model_version
        });

        await analysisDoc.save();
      } catch (dbErr) {
        // Non-blocking: DB save failure should not break real-time classification return
        console.warn(`[Classify Controller] Could not persist Analysis record: ${dbErr.message}`);
      }
    }

    // 4. Return Standardized Response
    return res.status(200).json({
      success: true,
      data: mlResponse,
      analysis_id: analysisId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Graceful Fallback if ML service is down or timed out
    if (error.statusCode === 503 || error.statusCode === 504) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        fallback: {
          ticket_id: ticket_id || null,
          classification: {
            category: null,
            subcategory: null,
            priority: null,
            intent: null
          },
          confidence: {
            category_score: 0.0,
            score_type: "fallback",
            calibrated: false
          },
          review_required: true,
          review_reason: `ML service unavailable (${error.code || 'TIMEOUT'}); ticket automatically routed to human triage`
        },
        timestamp: new Date().toISOString()
      });
    }

    next(error);
  }
};

const getServiceHealth = async (req, res) => {
  const health = await mlService.checkHealth();
  res.status(200).json({
    success: true,
    data: health
  });
};

module.exports = {
  classifyTicket,
  getServiceHealth
};
