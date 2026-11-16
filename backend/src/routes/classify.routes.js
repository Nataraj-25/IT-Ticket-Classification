/**
 * classify.routes.js
 * Express Routes for Ticket Classification and ML Health Integration.
 */

const express = require('express');
const router = express.Router();
const classifyController = require('../controllers/classify.controller');

// POST /api/classify - Submit ticket for ML classification
router.post('/', classifyController.classifyTicket);

// GET /api/classify/health - Inspect Python ML service health and model version
router.get('/health', classifyController.getServiceHealth);

module.exports = router;
