/**
 * Destination Controller
 * Handles travel destination discovery, search, filtering, and detail views.
 */

const { getDb } = require('../config/db');

function getAllDestinations(req, res, next) {
  try {
    const db = getDb();
    const userId = req.user ? req.user.id : 1;
    const { search, continent, budget_tier } = req.query;

    let query = `
      SELECT 
        d.id,
        d.title,
        d.country,
        d.continent,
        d.tagline,
        d.description,
        d.cover_image,
        d.season,
        d.budget_tier,
        d.tags,
        d.created_at,
        CASE WHEN b.id IS NOT NULL THEN 1 ELSE 0 END AS is_bookmarked
      FROM destinations d
      LEFT JOIN bookmarks b ON b.destination_id = d.id AND b.user_id = ?
      WHERE 1=1
    `;
    const params = [userId];

    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      query += ` AND (d.title LIKE ? OR d.country LIKE ? OR d.tags LIKE ? OR d.tagline LIKE ? OR d.description LIKE ?)`;
      params.push(term, term, term, term, term);
    }

    if (continent && continent.trim() !== '') {
      query += ` AND LOWER(d.continent) = LOWER(?)`;
      params.push(continent.trim());
    }

    if (budget_tier && budget_tier.trim() !== '') {
      query += ` AND d.budget_tier = ?`;
      params.push(budget_tier.trim());
    }

    query += ` ORDER BY d.id ASC`;

    const destinations = db.prepare(query).all(...params);

    // Convert is_bookmarked from 0/1 to boolean
    const formatted = destinations.map(d => ({
      ...d,
      is_bookmarked: Boolean(d.is_bookmarked),
      tags: d.tags ? d.tags.split(',').map(t => t.trim()) : []
    }));

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (err) {
    next(err);
  }
}

function getDestinationById(req, res, next) {
  try {
    const db = getDb();
    const userId = req.user ? req.user.id : 1;
    const { id } = req.params;

    const dest = db.prepare(`
      SELECT 
        d.id,
        d.title,
        d.country,
        d.continent,
        d.tagline,
        d.description,
        d.cover_image,
        d.season,
        d.budget_tier,
        d.tags,
        d.created_at,
        CASE WHEN b.id IS NOT NULL THEN 1 ELSE 0 END AS is_bookmarked
      FROM destinations d
      LEFT JOIN bookmarks b ON b.destination_id = d.id AND b.user_id = ?
      WHERE d.id = ?
    `).get(userId, id);

    if (!dest) {
      return res.status(404).json({
        success: false,
        error: `Destination with ID ${id} not found.`
      });
    }

    // Fetch associated itineraries / trips for this destination
    const trips = db.prepare(`
      SELECT 
        t.id,
        t.title,
        t.start_date,
        t.end_date,
        t.estimated_budget,
        t.currency,
        t.cover_image,
        u.name AS author_name,
        u.username AS author_username,
        u.avatar_url AS author_avatar,
        (SELECT COUNT(*) FROM trip_likes tl WHERE tl.trip_id = t.id) AS likes_count,
        (SELECT COUNT(*) FROM comments c WHERE c.trip_id = t.id) AS comments_count
      FROM trips t
      JOIN users u ON u.id = t.user_id
      WHERE t.destination_id = ?
      ORDER BY t.created_at DESC
    `).all(id);

    res.status(200).json({
      success: true,
      data: {
        ...dest,
        is_bookmarked: Boolean(dest.is_bookmarked),
        tags: dest.tags ? dest.tags.split(',').map(t => t.trim()) : [],
        associated_trips: trips
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllDestinations,
  getDestinationById
};
