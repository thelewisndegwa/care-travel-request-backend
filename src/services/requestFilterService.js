const User = require("../models/User");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function buildRequestFilters(query, user) {
  const filters = [];

  if (query.status) {
    filters.push({ status: query.status });
  }

  if (query.destination) {
    filters.push({
      "itinerary.destination": {
        $regex: escapeRegex(query.destination),
        $options: "i",
      },
    });
  }

  if (query.dateFrom || query.dateTo) {
    const dateFilter = {};

    if (query.dateFrom) {
      dateFilter.$gte = new Date(query.dateFrom);
    }

    if (query.dateTo) {
      dateFilter.$lte = new Date(query.dateTo);
    }

    filters.push({ "itinerary.dateFrom": dateFilter });
  }

  if (query.requestedByEmail && (user.role === "admin" || user.role === "superadmin")) {
    const requester = await User.findOne({
      email: String(query.requestedByEmail).toLowerCase(),
    }).select("_id");

    if (!requester) {
      return { _id: null };
    }

    filters.push({ requestedBy: requester._id });
  }

  if (query.search && (user.role === "admin" || user.role === "superadmin")) {
    const pattern = {
      $regex: escapeRegex(query.search),
      $options: "i",
    };

    filters.push({
      $or: [
        { purposeOfTrip: pattern },
        { assignedAreaOfOperation: pattern },
        { "itinerary.destination": pattern },
        { "project.name": pattern },
        { "project.businessUnit": pattern },
      ],
    });
  }

  if (!filters.length) {
    return {};
  }

  if (filters.length === 1) {
    return filters[0];
  }

  return { $and: filters };
}

function getPagination(query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

function buildPaginatedResponse(data, total, pagination) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / pagination.limit);

  return {
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
    },
  };
}

module.exports = {
  buildRequestFilters,
  getPagination,
  buildPaginatedResponse,
};
