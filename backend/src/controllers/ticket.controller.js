/**
 * ticket.controller.js
 * Express Controller handling HTTP Requests and Responses for Ticket Operations.
 */

const ticketService = require('../services/ticket.service');

const getTickets = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      category,
      priority,
      status,
      affected_service,
      environment,
      startDate,
      endDate,
      sortBy,
      sortOrder
    } = req.query;

    const result = await ticketService.listTickets({
      page,
      limit,
      category,
      priority,
      status,
      affected_service,
      environment,
      startDate,
      endDate,
      sortBy,
      sortOrder
    });

    res.status(200).json({
      success: true,
      data: result.tickets,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

const getTicketById = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const ticket = await ticketService.getTicketById(ticketId);

    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

const createTicket = async (req, res, next) => {
  try {
    const ticket = await ticketService.createTicket(req.body, {
      actor_id: req.headers['x-user-id'] || 'analyst_01',
      actor_type: 'user',
      ip_address: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

const searchTickets = async (req, res, next) => {
  try {
    const { q, category, status, priority, page, limit } = req.query;

    const result = await ticketService.searchTickets({
      q,
      category,
      status,
      priority,
      page,
      limit
    });

    res.status(200).json({
      success: true,
      data: result.tickets,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

const getTicketStats = async (req, res, next) => {
  try {
    const stats = await ticketService.getStats();

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTickets,
  getTicketById,
  createTicket,
  searchTickets,
  getTicketStats
};
