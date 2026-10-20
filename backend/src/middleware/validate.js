/**
 * Request Validation & Context Middleware
 */

const { getDb } = require('../config/db');

/**
 * Resolves active user context.
 * In Phase 1 without authentication, user context is provided via:
 * 1) 'x-user-id' header, OR
 * 2) 'user_id' query param, OR
 * 3) Defaults to Demo User (ID: 1 - Elena Rostova).
 */
function resolveUser(req, res, next) {
  try {
    const db = getDb();
    const rawUserId = req.headers['x-user-id'] || req.query.user_id || 1;
    const userId = parseInt(rawUserId, 10);

    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID provided in x-user-id header or query parameter.'
      });
    }

    const user = db.prepare('SELECT id, name, username, email, avatar_url, bio, home_city FROM users WHERE id = ?').get(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: `User with ID ${userId} does not exist.`
      });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Validates integer ID in request URL params (e.g. :id)
 */
function validateIdParam(paramName = 'id') {
  return (req, res, next) => {
    const raw = req.params[paramName];
    const val = parseInt(raw, 10);
    if (isNaN(val) || val <= 0 || String(val) !== String(raw).trim()) {
      return res.status(400).json({
        success: false,
        error: `Invalid '${paramName}' parameter. Must be a positive integer.`
      });
    }
    req.params[paramName] = val;
    next();
  };
}

/**
 * Validates trip creation/update body payload
 */
function validateTripPayload(isUpdate = false) {
  const ALLOWED_CATEGORIES = ['Stay', 'Food', 'Culture', 'Nature', 'Activity', 'Transit'];

  return (req, res, next) => {
    const { title, start_date, end_date, estimated_budget, destination_id, currency, notes, stops } = req.body;
    const errors = [];

    // Title validation
    if (!isUpdate || title !== undefined) {
      if (!title || typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 120) {
        errors.push("Field 'title' is required and must be between 3 and 120 characters.");
      }
    }

    // Dates validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!isUpdate || (start_date !== undefined || end_date !== undefined)) {
      if (!start_date || !dateRegex.test(start_date)) {
        errors.push("Field 'start_date' is required in YYYY-MM-DD format.");
      }
      if (!end_date || !dateRegex.test(end_date)) {
        errors.push("Field 'end_date' is required in YYYY-MM-DD format.");
      }
      if (start_date && end_date && start_date > end_date) {
        errors.push("'start_date' cannot be after 'end_date'.");
      }
    }

    // Budget validation
    if (!isUpdate || estimated_budget !== undefined) {
      if (estimated_budget !== undefined && estimated_budget !== null) {
        const num = Number(estimated_budget);
        if (isNaN(num) || num < 0) {
          errors.push("Field 'estimated_budget' must be a positive number or zero.");
        }
      }
    }

    // Destination ID validation
    if (destination_id !== undefined && destination_id !== null) {
      const destId = parseInt(destination_id, 10);
      if (isNaN(destId) || destId <= 0) {
        errors.push("Field 'destination_id' must be a valid positive integer if provided.");
      } else {
        const db = getDb();
        const destExists = db.prepare('SELECT id FROM destinations WHERE id = ?').get(destId);
        if (!destExists) {
          errors.push(`Referenced destination_id ${destId} does not exist.`);
        }
      }
    }

    // Stops array validation (if provided)
    if (stops !== undefined) {
      if (!Array.isArray(stops)) {
        errors.push("Field 'stops' must be an array of itinerary stop objects.");
      } else {
        stops.forEach((stop, idx) => {
          if (!stop.place_name || typeof stop.place_name !== 'string' || stop.place_name.trim().length === 0) {
            errors.push(`Stop #${idx + 1}: 'place_name' is required.`);
          }
          if (stop.category && !ALLOWED_CATEGORIES.includes(stop.category)) {
            errors.push(`Stop #${idx + 1}: Invalid category '${stop.category}'. Allowed: ${ALLOWED_CATEGORIES.join(', ')}.`);
          }
          if (stop.day_number !== undefined && (isNaN(Number(stop.day_number)) || Number(stop.day_number) < 1)) {
            errors.push(`Stop #${idx + 1}: 'day_number' must be an integer >= 1.`);
          }
          if (stop.cost !== undefined && (isNaN(Number(stop.cost)) || Number(stop.cost) < 0)) {
            errors.push(`Stop #${idx + 1}: 'cost' must be a non-negative number.`);
          }
        });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed.',
        details: errors
      });
    }

    next();
  };
}

/**
 * Validates comment payload
 */
function validateCommentPayload(req, res, next) {
  const { content } = req.body;
  if (!content || typeof content !== 'string' || content.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: "Field 'content' is required and must be at least 2 characters long."
    });
  }
  if (content.length > 1000) {
    return res.status(400).json({
      success: false,
      error: "Field 'content' cannot exceed 1000 characters."
    });
  }
  next();
}

module.exports = {
  resolveUser,
  validateIdParam,
  validateTripPayload,
  validateCommentPayload
};
