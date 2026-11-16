/**
 * ticket.service.js
 * Business Logic and MongoDB Data Access Service for IT Tickets.
 */

const { Ticket } = require('../models/Ticket');
const { AuditEvent } = require('../models/AuditEvent');

/**
 * List paginated tickets with optional metadata filters and date ranges.
 */
const listTickets = async ({
  page = 1,
  limit = 20,
  category,
  priority,
  status,
  affected_service,
  environment,
  startDate,
  endDate,
  sortBy = 'created_at',
  sortOrder = 'desc'
}) => {
  const query = {};

  if (category) query.category = category;
  if (priority) query.priority = priority;
  if (status) query.status = status;
  if (affected_service) query.affected_service = affected_service;
  if (environment) query.environment = environment;

  // Date range filtering
  if (startDate || endDate) {
    query.created_at = {};
    if (startDate) query.created_at.$gte = new Date(startDate);
    if (endDate) query.created_at.$lte = new Date(endDate);
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const sortDirection = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
  const sortOptions = { [sortBy]: sortDirection };

  const [tickets, total] = await Promise.all([
    Ticket.find(query).sort(sortOptions).skip(skip).limit(limitNum).lean(),
    Ticket.countDocuments(query)
  ]);

  const totalPages = Math.ceil(total / limitNum) || 1;

  return {
    tickets,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    }
  };
};

/**
 * Retrieve a single ticket by its stable ticket_id or MongoDB _id.
 */
const getTicketById = async (ticketId) => {
  const cleanId = String(ticketId).trim();
  let ticket = await Ticket.findOne({
    ticket_id: { $regex: new RegExp(`^${cleanId}$`, 'i') }
  }).lean();

  if (!ticket && cleanId.match(/^[0-9a-fA-F]{24}$/)) {
    ticket = await Ticket.findById(cleanId).lean();
  }

  if (!ticket) {
    const error = new Error(`Ticket with ID '${ticketId}' was not found`);
    error.statusCode = 404;
    throw error;
  }

  return ticket;
};

/**
 * Create a new ticket with automatic ID generation and immutable audit logging.
 */
const createTicket = async (ticketData, actor = { actor_id: 'api_user', actor_type: 'user' }) => {
  let nextTicketId = ticketData.ticket_id;

  // Auto-generate unique stable ticket_id if omitted
  if (!nextTicketId) {
    const latest = await Ticket.findOne({ ticket_id: /^INC-\d+$/ })
      .sort({ ticket_id: -1 })
      .lean();

    let nextNum = 1001;
    if (latest && latest.ticket_id) {
      const match = latest.ticket_id.match(/^INC-(\d+)$/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    nextTicketId = `INC-${nextNum}`;
  }

  const newTicket = new Ticket({
    ...ticketData,
    ticket_id: nextTicketId,
    raw_text: ticketData.raw_text || `Title: ${ticketData.title}\nDescription: ${ticketData.description}`
  });

  const saved = await newTicket.save();

  // Create audit event
  const audit = new AuditEvent({
    event_id: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    event_type: 'TICKET_CREATED',
    ticket_id: saved.ticket_id,
    actor_reference: actor,
    change_summary: {
      title: saved.title,
      category: saved.category,
      priority: saved.priority,
      status: saved.status,
      affected_service: saved.affected_service
    }
  });

  await audit.save();

  return saved;
};

/**
 * Keyword and metadata search using MongoDB text index and fallback regex.
 */
const searchTickets = async ({
  q,
  category,
  status,
  priority,
  page = 1,
  limit = 20
}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const query = {};
  if (category) query.category = category;
  if (status) query.status = status;
  if (priority) query.priority = priority;

  let projection = {};
  let sortOptions = { created_at: -1 };

  if (q && q.trim()) {
    const cleanQ = q.trim();
    // Attempt full-text search first
    query.$text = { $search: cleanQ };
    projection = { score: { $meta: 'textScore' } };
    sortOptions = { score: { $meta: 'textScore' } };
  }

  let tickets;
  let total;

  try {
    [tickets, total] = await Promise.all([
      Ticket.find(query, projection).sort(sortOptions).skip(skip).limit(limitNum).lean(),
      Ticket.countDocuments(query)
    ]);
  } catch (err) {
    // If text index search fails (e.g. index build pending in test environment), fall back to regex
    delete query.$text;
    if (q && q.trim()) {
      const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { ticket_id: { $regex: escaped, $options: 'i' } },
        { title: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
        { affected_service: { $regex: escaped, $options: 'i' } }
      ];
    }
    sortOptions = { created_at: -1 };
    [tickets, total] = await Promise.all([
      Ticket.find(query).sort(sortOptions).skip(skip).limit(limitNum).lean(),
      Ticket.countDocuments(query)
    ]);
  }

  const totalPages = Math.ceil(total / limitNum) || 1;

  return {
    tickets,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    }
  };
};

/**
 * Dataset statistical metrics using MongoDB Aggregation Pipeline ($facet).
 */
const getStats = async () => {
  const stats = await Ticket.aggregate([
    {
      $facet: {
        totalTickets: [{ $count: 'count' }],
        categoryDistribution: [
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ],
        priorityDistribution: [
          { $group: { _id: '$priority', count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ],
        statusDistribution: [
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ],
        resolutionMetrics: [
          {
            $group: {
              _id: null,
              resolvedCount: {
                $sum: {
                  $cond: [{ $in: ['$status', ['Resolved', 'Closed']] }, 1, 0]
                }
              },
              unresolvedCount: {
                $sum: {
                  $cond: [{ $not: [{ $in: ['$status', ['Resolved', 'Closed']] }] }, 1, 0]
                }
              },
              resolvedWithTextCount: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $in: ['$status', ['Resolved', 'Closed']] },
                        { $gt: [{ $strLenCP: { $ifNull: ['$resolution_text', ''] } }, 0] }
                      ]
                    },
                    1,
                    0
                  ]
                }
              }
            }
          }
        ]
      }
    }
  ]);

  const facet = stats[0] || {};
  const total = facet.totalTickets?.[0]?.count || 0;
  const res = facet.resolutionMetrics?.[0] || { resolvedCount: 0, unresolvedCount: 0, resolvedWithTextCount: 0 };

  return {
    totalTickets: total,
    categoryDistribution: facet.categoryDistribution || [],
    priorityDistribution: facet.priorityDistribution || [],
    statusDistribution: facet.statusDistribution || [],
    resolutionMetrics: {
      resolved: res.resolvedCount,
      unresolved: res.unresolvedCount,
      resolvedWithResolutionText: res.resolvedWithTextCount,
      resolvedPercentage: total > 0 ? Number(((res.resolvedCount / total) * 100).toFixed(2)) : 0
    }
  };
};

module.exports = {
  listTickets,
  getTicketById,
  createTicket,
  searchTickets,
  getStats
};
