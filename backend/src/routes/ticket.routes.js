/**
 * ticket.routes.js
 * Express Router definitions for Ticket Management Endpoints.
 */

const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticket.controller');
const retrievalController = require('../controllers/retrieval.controller');
const recommendationController = require('../controllers/recommendation.controller');
const { validateCreateTicket } = require('../middleware/validate');

// Aggregation, Search, Similarity & Recommendation routes (Defined BEFORE /:ticketId)
router.get('/search', ticketController.searchTickets);
router.get('/stats', ticketController.getTicketStats);
router.post('/similar', retrievalController.getSimilarTickets);
router.post('/recommend', recommendationController.getRecommendation);

// Collection operations
router.get('/', ticketController.getTickets);
router.post('/', validateCreateTicket, ticketController.createTicket);

// Individual ticket operations
router.get('/:ticketId', ticketController.getTicketById);

module.exports = router;
