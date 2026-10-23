/**
 * Trip Controller
 * Handles CRUD operations for travel itineraries and trip stops with ownership verification.
 */

const { getDb, withTransaction } = require('../config/db');
const { generateShareToken, isValidShareToken } = require('../utils/token');

function getAllTrips(req, res, next) {
  try {
    const db = getDb();
    const currentUserId = req.user ? req.user.id : null;
    const { destination_id, user_id, search } = req.query;

    let query = `
      SELECT 
        t.id,
        t.user_id,
        t.destination_id,
        t.title,
        t.start_date,
        t.end_date,
        t.currency,
        t.estimated_budget,
        COALESCE(t.cover_image, d.cover_image) AS cover_image,
        t.notes,
        t.visibility,
        t.created_at,
        t.updated_at,
        u.name AS author_name,
        u.username AS author_username,
        u.avatar_url AS author_avatar,
        d.title AS destination_title,
        d.country AS destination_country,
        (SELECT COUNT(*) FROM trip_likes tl WHERE tl.trip_id = t.id) AS likes_count,
        (SELECT COUNT(*) FROM comments c WHERE c.trip_id = t.id) AS comments_count,
        (SELECT COUNT(*) FROM trip_stops ts WHERE ts.trip_id = t.id) AS stops_count,
        CASE WHEN (SELECT 1 FROM trip_likes tl2 WHERE tl2.trip_id = t.id AND tl2.user_id = ?) IS NOT NULL THEN 1 ELSE 0 END AS is_liked
      FROM trips t
      JOIN users u ON u.id = t.user_id
      LEFT JOIN destinations d ON d.id = t.destination_id
      WHERE 1=1
    `;
    const params = [currentUserId];

    if (destination_id) {
      query += ` AND t.destination_id = ?`;
      params.push(parseInt(destination_id, 10));
    }

    if (user_id) {
      const targetUserId = parseInt(user_id, 10);
      query += ` AND t.user_id = ?`;
      params.push(targetUserId);

      // If viewing own trips in personal context, owner can see public, unlisted, and private
      if (!currentUserId || currentUserId !== targetUserId) {
        query += ` AND t.visibility = 'public'`;
      }
    } else {
      // General discovery feed (Home, /trips directory) only lists public trips
      query += ` AND t.visibility = 'public'`;
    }

    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      query += ` AND (t.title LIKE ? OR t.notes LIKE ? OR d.title LIKE ? OR d.country LIKE ?)`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY t.created_at DESC`;

    const trips = db.prepare(query).all(...params);

    const formatted = trips.map(t => {
      const item = {
        ...t,
        is_liked: Boolean(t.is_liked)
      };
      delete item.share_token;
      return item;
    });

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (err) {
    next(err);
  }
}

function getTripById(req, res, next) {
  try {
    const db = getDb();
    const currentUserId = req.user ? req.user.id : null;
    const { id } = req.params;
    const providedToken = req.query.token || req.headers['x-share-token'] || null;

    const trip = db.prepare(`
      SELECT 
        t.id,
        t.user_id,
        t.destination_id,
        t.title,
        t.start_date,
        t.end_date,
        t.currency,
        t.estimated_budget,
        COALESCE(t.cover_image, d.cover_image) AS cover_image,
        t.notes,
        t.visibility,
        t.share_token,
        t.created_at,
        t.updated_at,
        u.name AS author_name,
        u.username AS author_username,
        u.avatar_url AS author_avatar,
        u.bio AS author_bio,
        d.title AS destination_title,
        d.country AS destination_country,
        d.continent AS destination_continent,
        (SELECT COUNT(*) FROM trip_likes tl WHERE tl.trip_id = t.id) AS likes_count,
        CASE WHEN (SELECT 1 FROM trip_likes tl2 WHERE tl2.trip_id = t.id AND tl2.user_id = ?) IS NOT NULL THEN 1 ELSE 0 END AS is_liked
      FROM trips t
      JOIN users u ON u.id = t.user_id
      LEFT JOIN destinations d ON d.id = t.destination_id
      WHERE t.id = ?
    `).get(currentUserId, id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        error: `Trip with ID ${id} not found.`
      });
    }

    const isOwner = Boolean(currentUserId && trip.user_id === currentUserId);

    // Enforce visibility authorization rules
    if (trip.visibility === 'private') {
      if (!isOwner) {
        // Uniform 404 to avoid disclosing existence of private trip
        return res.status(404).json({
          success: false,
          error: `Trip with ID ${id} not found.`
        });
      }
    } else if (trip.visibility === 'unlisted') {
      const hasValidToken = trip.share_token && isValidShareToken(providedToken, trip.share_token);
      if (!isOwner && !hasValidToken) {
        return res.status(404).json({
          success: false,
          error: `Trip with ID ${id} not found.`
        });
      }
    }

    // Fetch Stops
    const stops = db.prepare(`
      SELECT id, trip_id, day_number, place_name, category, cost, notes, sort_order, created_at
      FROM trip_stops
      WHERE trip_id = ?
      ORDER BY day_number ASC, sort_order ASC, id ASC
    `).all(id);

    // Fetch Comments
    const comments = db.prepare(`
      SELECT 
        c.id,
        c.trip_id,
        c.user_id,
        c.content,
        c.created_at,
        u.name AS user_name,
        u.username AS user_username,
        u.avatar_url AS user_avatar
      FROM comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.trip_id = ?
      ORDER BY c.created_at ASC
    `).all(id);

    // Calculate total stops cost
    const stopsTotalCost = stops.reduce((sum, s) => sum + (Number(s.cost) || 0), 0);

    const responseData = {
      ...trip,
      is_liked: Boolean(trip.is_liked),
      is_owner: isOwner,
      stops_total_cost: stopsTotalCost,
      stops,
      comments
    };

    // Never disclose share_token to non-owners
    if (!isOwner) {
      delete responseData.share_token;
    }

    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (err) {
    next(err);
  }
}

function createTrip(req, res, next) {
  try {
    const currentUserId = req.user.id;
    const {
      title,
      destination_id,
      start_date,
      end_date,
      currency = 'USD',
      estimated_budget = 0,
      cover_image,
      notes,
      stops = [],
      visibility = 'public'
    } = req.body;

    const newTrip = withTransaction((db) => {
      // Determine cover image: explicit OR destination cover OR fallback
      let resolvedCover = cover_image;
      if (!resolvedCover && destination_id) {
        const dest = db.prepare('SELECT cover_image FROM destinations WHERE id = ?').get(destination_id);
        if (dest) resolvedCover = dest.cover_image;
      }

      let shareToken = null;
      if (visibility === 'unlisted') {
        for (let attempt = 0; attempt < 5; attempt++) {
          const candidate = generateShareToken();
          const collision = db.prepare('SELECT 1 FROM trips WHERE share_token = ?').get(candidate);
          if (!collision) {
            shareToken = candidate;
            break;
          }
        }
      }

      const insertTripStmt = db.prepare(`
        INSERT INTO trips (user_id, destination_id, title, start_date, end_date, currency, estimated_budget, cover_image, notes, visibility, share_token)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = insertTripStmt.run(
        currentUserId,
        destination_id || null,
        title.trim(),
        start_date,
        end_date,
        currency,
        Number(estimated_budget) || 0,
        resolvedCover || null,
        notes ? notes.trim() : null,
        visibility,
        shareToken
      );

      const tripId = Number(result.lastInsertRowid);

      // Insert stops if provided
      if (Array.isArray(stops) && stops.length > 0) {
        const insertStopStmt = db.prepare(`
          INSERT INTO trip_stops (trip_id, day_number, place_name, category, cost, notes, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        stops.forEach((stop, idx) => {
          insertStopStmt.run(
            tripId,
            parseInt(stop.day_number, 10) || 1,
            stop.place_name.trim(),
            stop.category || 'Culture',
            Number(stop.cost) || 0,
            stop.notes ? stop.notes.trim() : null,
            parseInt(stop.sort_order, 10) || (idx + 1)
          );
        });
      }

      return tripId;
    });

    // Return the created trip using getTripById logic
    req.params.id = newTrip;
    return getTripById(req, res, next);
  } catch (err) {
    next(err);
  }
}

function updateTrip(req, res, next) {
  try {
    const db = getDb();
    const currentUserId = req.user.id;
    const { id } = req.params;

    // Check if trip exists
    const existingTrip = db.prepare('SELECT id, user_id, visibility, share_token FROM trips WHERE id = ?').get(id);
    if (!existingTrip) {
      return res.status(404).json({
        success: false,
        error: `Trip with ID ${id} not found.`
      });
    }

    // Mandatory Ownership Verification
    if (existingTrip.user_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have permission to modify this trip. Only the owner can edit it.'
      });
    }

    const {
      title,
      destination_id,
      start_date,
      end_date,
      currency,
      estimated_budget,
      cover_image,
      notes,
      stops,
      visibility
    } = req.body;

    withTransaction((txDb) => {
      // Build dynamic update for provided fields
      const updates = [];
      const params = [];

      if (title !== undefined) {
        updates.push('title = ?');
        params.push(title.trim());
      }
      if (destination_id !== undefined) {
        updates.push('destination_id = ?');
        params.push(destination_id || null);
      }
      if (start_date !== undefined) {
        updates.push('start_date = ?');
        params.push(start_date);
      }
      if (end_date !== undefined) {
        updates.push('end_date = ?');
        params.push(end_date);
      }
      if (currency !== undefined) {
        updates.push('currency = ?');
        params.push(currency);
      }
      if (estimated_budget !== undefined) {
        updates.push('estimated_budget = ?');
        params.push(Number(estimated_budget));
      }
      if (cover_image !== undefined) {
        updates.push('cover_image = ?');
        params.push(cover_image || null);
      }
      if (notes !== undefined) {
        updates.push('notes = ?');
        params.push(notes ? notes.trim() : null);
      }

      if (visibility !== undefined) {
        updates.push('visibility = ?');
        params.push(visibility);

        if (visibility === 'unlisted') {
          let tokenToUse = existingTrip.share_token;
          // Rotate token if previous was private, or if no token exists yet
          if (existingTrip.visibility === 'private' || !tokenToUse) {
            for (let attempt = 0; attempt < 5; attempt++) {
              const candidate = generateShareToken();
              const collision = txDb.prepare('SELECT 1 FROM trips WHERE share_token = ? AND id != ?').get(candidate, id);
              if (!collision) {
                tokenToUse = candidate;
                break;
              }
            }
          }
          updates.push('share_token = ?');
          params.push(tokenToUse);
        } else {
          // Clear share_token when changing to public or private
          updates.push('share_token = ?');
          params.push(null);
        }
      }

      updates.push("updated_at = datetime('now')");

      if (updates.length > 0) {
        params.push(id);
        txDb.prepare(`UPDATE trips SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      }

      // If stops are passed, synchronize them
      if (Array.isArray(stops)) {
        txDb.prepare('DELETE FROM trip_stops WHERE trip_id = ?').run(id);

        const insertStopStmt = txDb.prepare(`
          INSERT INTO trip_stops (trip_id, day_number, place_name, category, cost, notes, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        stops.forEach((stop, idx) => {
          insertStopStmt.run(
            id,
            parseInt(stop.day_number, 10) || 1,
            stop.place_name.trim(),
            stop.category || 'Culture',
            Number(stop.cost) || 0,
            stop.notes ? stop.notes.trim() : null,
            parseInt(stop.sort_order, 10) || (idx + 1)
          );
        });
      }
    });

    return getTripById(req, res, next);
  } catch (err) {
    next(err);
  }
}

function deleteTrip(req, res, next) {
  try {
    const db = getDb();
    const currentUserId = req.user.id;
    const { id } = req.params;

    // Check if trip exists
    const existingTrip = db.prepare('SELECT id, user_id, title FROM trips WHERE id = ?').get(id);
    if (!existingTrip) {
      return res.status(404).json({
        success: false,
        error: `Trip with ID ${id} not found.`
      });
    }

    // Mandatory Ownership Verification
    if (existingTrip.user_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have permission to delete this trip. Only the owner can delete it.'
      });
    }

    // Delete trip (cascade deletes stops, likes, comments)
    db.prepare('DELETE FROM trips WHERE id = ?').run(id);

    res.status(200).json({
      success: true,
      message: `Trip '${existingTrip.title}' (ID: ${id}) was successfully deleted.`,
      deleted_id: id
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllTrips,
  getTripById,
  createTrip,
  updateTrip,
  deleteTrip
};
