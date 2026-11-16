/**
 * app.js
 * Express Application Configuration and Middleware Pipeline.
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const ticketRoutes = require('./routes/ticket.routes');
const classifyRoutes = require('./routes/classify.routes');
const analysisRoutes = require('./routes/analysis.routes');
const auditRoutes = require('./routes/audit.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security and Cross-Origin Configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-user-access-level', 'x-correlation-id']
  })
);

// Body Parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request Logging (disabled during automated test execution)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Service Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'IT Ticket Resolution Assistant - Backend',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/tickets', ticketRoutes);
app.use('/api/classify', classifyRoutes);
app.use('/api/analyses', analysisRoutes);
app.use('/api/audit', auditRoutes);

// Direct alias for Master Analysis Endpoint (Section 4: POST /api/analyze)
app.post('/api/analyze', (req, res, next) => {
  const analysisController = require('./controllers/analysis.controller');
  return analysisController.analyzeTicket(req, res, next);
});

// Catch-all for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
