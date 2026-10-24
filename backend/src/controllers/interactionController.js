/**
 * Interaction Controller
 * Manages user interactions: Bookmarking destinations, Liking trips, and Posting comments.
 */

const { getDb } = require('../config/db');
const { isValidShareToken } = require('../utils/token');

/**
 * Toggle bookmark for a destination (Add / Remove)
 */
async function toggleBookmark(req, res, next) {
  try {
    const db = getDb();
    const userId = req.user.id;
    const destinationId = req.params.id;

    // Verify destination exists
    const dest = await db.prepare('SELECT id, title FROM destinations WHERE id = ?').get(destinationId);
    if (!dest) {
      return res.status(404).json({
        success: false,
        error: `Destination with ID ${destinationId} not found.`
      });
    }

    // Check existing bookmark
    const existing = await db.prepare('SELECT id FROM bookmarks WHERE user_id = ? AND destination_id = ?').get(userId, destinationId);

    if (existing) {
      await db.prepare('DELETE FROM bookmarks WHERE id = ?').run(existing.id);
      return res.status(200).json({
        success: true,
        message: `Removed '${dest.title}' from saved wishlist.`,
        data: {
          destination_id: destinationId,
          bookmarked: false
        }
      });
    } else {
      await db.prepare('INSERT INTO bookmarks (user_id, destination_id) VALUES (?, ?)').run(userId, destinationId);
      return res.status(201).json({
        success: true,
        message: `Saved '${dest.title}' to wishlist.`,
        data: {
          destination_id: destinationId,
          bookmarked: true
        }
      });
    }
  } catch (err) {
    next(err);
  }
}

/**
 * Get all bookmarks for the active user
 */
async function getUserBookmarks(req, res, next) {
  try {
    const db = getDb();
    const userId = req.user.id;

    const bookmarkedDestinations = await db.prepare(`
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
        b.created_at AS bookmarked_at,
        1 AS is_bookmarked
      FROM bookmarks b
      JOIN destinations d ON d.id = b.destination_id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `).all(userId);

    const formatted = bookmarkedDestinations.map(d => ({
      ...d,
      is_bookmarked: true,
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

/**
 * Toggle like for a trip (Add / Remove)
 */
async function toggleTripLike(req, res, next) {
  try {
    const db = getDb();
    const userId = req.user.id;
    const tripId = req.params.id;

    // Verify trip exists and user has authorization to interact
    const trip = await db.prepare('SELECT id, user_id, title, visibility, share_token FROM trips WHERE id = ?').get(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: `Trip with ID ${tripId} not found.`
      });
    }

    const isOwner = Boolean(trip.user_id === userId);
    const providedToken = req.query.token || req.headers['x-share-token'] || (req.body && req.body.token) || null;

    let isGroupMember = false;
    if (!isOwner) {
      const membership = await db.prepare(`
        SELECT 1
        FROM trip_group_members tgm
        JOIN trip_groups tg ON tg.id = tgm.group_id
        WHERE tg.trip_id = ? AND tgm.user_id = ?
      `).get(tripId, userId);
      isGroupMember = Boolean(membership);
    }

    if (trip.visibility === 'private' && !isOwner && !isGroupMember) {
      return res.status(404).json({
        success: false,
        error: `Trip with ID ${tripId} not found.`
      });
    }

    if (trip.visibility === 'unlisted') {
      const hasValidToken = trip.share_token && isValidShareToken(providedToken, trip.share_token);
      if (!isOwner && !isGroupMember && !hasValidToken) {
        return res.status(404).json({
          success: false,
          error: `Trip with ID ${tripId} not found.`
        });
      }
    }

    const existing = await db.prepare('SELECT id FROM trip_likes WHERE user_id = ? AND trip_id = ?').get(userId, tripId);
    let isLikedNow = false;

    if (existing) {
      await db.prepare('DELETE FROM trip_likes WHERE id = ?').run(existing.id);
      isLikedNow = false;
    } else {
      await db.prepare('INSERT INTO trip_likes (user_id, trip_id) VALUES (?, ?)').run(userId, tripId);
      isLikedNow = true;
    }

    const likesCountRes = await db.prepare('SELECT COUNT(*) as count FROM trip_likes WHERE trip_id = ?').get(tripId);
    const likesCount = parseInt(likesCountRes.count, 10);

    res.status(200).json({
      success: true,
      message: isLikedNow ? 'Trip liked' : 'Trip unliked',
      data: {
        trip_id: tripId,
        liked: isLikedNow,
        likes_count: likesCount
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Add a comment to a trip
 */
async function addTripComment(req, res, next) {
  try {
    const db = getDb();
    const userId = req.user.id;
    const tripId = req.params.id;
    const { content } = req.body;

    // Verify trip exists and user has authorization to comment
    const trip = await db.prepare('SELECT id, user_id, visibility, share_token FROM trips WHERE id = ?').get(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: `Trip with ID ${tripId} not found.`
      });
    }

    const isOwner = Boolean(trip.user_id === userId);
    const providedToken = req.query.token || req.headers['x-share-token'] || (req.body && req.body.token) || null;

    let isGroupMember = false;
    if (!isOwner) {
      const membership = await db.prepare(`
        SELECT 1
        FROM trip_group_members tgm
        JOIN trip_groups tg ON tg.id = tgm.group_id
        WHERE tg.trip_id = ? AND tgm.user_id = ?
      `).get(tripId, userId);
      isGroupMember = Boolean(membership);
    }

    if (trip.visibility === 'private' && !isOwner && !isGroupMember) {
      return res.status(404).json({
        success: false,
        error: `Trip with ID ${tripId} not found.`
      });
    }

    if (trip.visibility === 'unlisted') {
      const hasValidToken = trip.share_token && isValidShareToken(providedToken, trip.share_token);
      if (!isOwner && !isGroupMember && !hasValidToken) {
        return res.status(404).json({
          success: false,
          error: `Trip with ID ${tripId} not found.`
        });
      }
    }

    const result = await db.prepare(`
      INSERT INTO comments (trip_id, user_id, content)
      VALUES (?, ?, ?)
    `).run(tripId, userId, content.trim());

    const commentId = Number(result.lastInsertRowid);

    const createdComment = await db.prepare(`
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
      WHERE c.id = ?
    `).get(commentId);

    res.status(201).json({
      success: true,
      message: 'Comment posted successfully',
      data: createdComment
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a comment (Ownership verified)
 */
async function deleteComment(req, res, next) {
  try {
    const db = getDb();
    const currentUserId = req.user.id;
    const { id } = req.params;

    const comment = await db.prepare('SELECT id, user_id, trip_id FROM comments WHERE id = ?').get(id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: `Comment with ID ${id} not found.`
      });
    }

    if (comment.user_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have permission to delete this comment. Only the author can remove it.'
      });
    }

    await db.prepare('DELETE FROM comments WHERE id = ?').run(id);

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully',
      deleted_id: id
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  toggleBookmark,
  getUserBookmarks,
  toggleTripLike,
  addTripComment,
  deleteComment
};
