/**
 * Profile Controller
 * Provides user profile data, aggregated travel stats, created trips, and saved wishlists.
 */

const { getDb } = require('../config/db');

function getUserProfile(req, res, next) {
  try {
    const db = getDb();
    // Support target user via /api/profile or /api/profile/:id (defaults to current user)
    const targetUserId = req.params.id ? parseInt(req.params.id, 10) : (req.user ? req.user.id : null);

    if (!targetUserId || isNaN(targetUserId) || targetUserId <= 0) {
      return res.status(req.params.id ? 400 : 401).json({
        success: false,
        error: req.params.id ? 'Invalid user ID.' : 'Authentication required to view own profile.'
      });
    }

    const user = db.prepare(`
      SELECT id, name, username, email, avatar_url, bio, home_city, created_at
      FROM users
      WHERE id = ?
    `).get(targetUserId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: `User with ID ${targetUserId} not found.`
      });
    }

    const isOwner = Boolean(req.user && req.user.id === targetUserId);

    // User's created trips
    const tripsQuery = `
      SELECT 
        t.id,
        t.title,
        t.destination_id,
        t.start_date,
        t.end_date,
        t.currency,
        t.estimated_budget,
        COALESCE(t.cover_image, d.cover_image) AS cover_image,
        t.notes,
        t.visibility,
        ${isOwner ? 't.share_token,' : ''}
        t.created_at,
        t.updated_at,
        d.title AS destination_title,
        d.country AS destination_country,
        (SELECT COUNT(*) FROM trip_likes tl WHERE tl.trip_id = t.id) AS likes_count,
        (SELECT COUNT(*) FROM comments c WHERE c.trip_id = t.id) AS comments_count,
        (SELECT COUNT(*) FROM trip_stops ts WHERE ts.trip_id = t.id) AS stops_count
      FROM trips t
      LEFT JOIN destinations d ON d.id = t.destination_id
      WHERE t.user_id = ? ${isOwner ? '' : "AND t.visibility = 'public'"}
      ORDER BY t.created_at DESC
    `;
    const trips = db.prepare(tripsQuery).all(targetUserId);

    // User's saved destinations
    const savedDestinations = db.prepare(`
      SELECT 
        d.id,
        d.title,
        d.country,
        d.continent,
        d.tagline,
        d.cover_image,
        d.season,
        d.budget_tier,
        d.tags,
        b.created_at AS saved_at
      FROM bookmarks b
      JOIN destinations d ON d.id = b.destination_id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `).all(targetUserId);

    const formattedSaved = savedDestinations.map(d => ({
      ...d,
      is_bookmarked: true,
      tags: d.tags ? d.tags.split(',').map(t => t.trim()) : []
    }));

    // Calculate aggregated stats
    const likesReceivedQuery = `
      SELECT COUNT(*) as count
      FROM trip_likes tl
      JOIN trips t ON t.id = tl.trip_id
      WHERE t.user_id = ? ${isOwner ? '' : "AND t.visibility = 'public'"}
    `;
    const likesReceived = db.prepare(likesReceivedQuery).get(targetUserId).count;

    const commentsPosted = db.prepare(`
      SELECT COUNT(*) as count
      FROM comments
      WHERE user_id = ?
    `).get(targetUserId).count;

    res.status(200).json({
      success: true,
      data: {
        user,
        stats: {
          trips_count: trips.length,
          saved_destinations_count: savedDestinations.length,
          likes_received_count: likesReceived,
          comments_posted_count: commentsPosted
        },
        trips,
        saved_destinations: formattedSaved
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUserProfile
};
