/**
 * Roamly Trip Media Controller
 * Handles photo/video signed upload signatures, metadata registration,
 * secure retrieval with role-based visibility, and uploader/owner deletion.
 */

const crypto = require('crypto');
const { getDb } = require('../config/db');
const { isValidShareToken } = require('../utils/token');
const {
  MEDIA_LIMITS,
  generateUploadSignature,
  generateSignedDeliveryUrl,
  generateThumbnailUrl,
  destroyCloudinaryAsset
} = require('../config/cloudinary');

/**
 * Helper to check trip visibility access for media viewing.
 * Uniformly returns 404 for unauthorized private/unlisted access to prevent leakage.
 */
async function checkTripMediaAccess(trip, currentUserId, providedToken, db) {
  const isOwner = Boolean(currentUserId && trip.user_id === currentUserId);
  let isGroupMember = false;

  if (currentUserId && !isOwner) {
    const membership = await db.prepare(`
      SELECT tgm.role
      FROM trip_group_members tgm
      JOIN trip_groups tg ON tg.id = tgm.group_id
      WHERE tg.trip_id = ? AND tgm.user_id = ?
    `).get(trip.id, currentUserId);
    isGroupMember = Boolean(membership);
  }

  if (trip.visibility === 'private') {
    if (!isOwner && !isGroupMember) {
      return { allowed: false, isOwner, isGroupMember };
    }
  } else if (trip.visibility === 'unlisted') {
    const hasValidToken = trip.share_token && isValidShareToken(providedToken, trip.share_token);
    if (!isOwner && !isGroupMember && !hasValidToken) {
      return { allowed: false, isOwner, isGroupMember };
    }
  }

  return { allowed: true, isOwner, isGroupMember };
}

/**
 * Helper to check if a user is authorized to upload media to a trip.
 * Authorized users: Trip Owner OR Active Group Member.
 */
async function checkTripUploadPermission(trip, currentUserId, db) {
  if (!currentUserId) return false;
  if (trip.user_id === currentUserId) return true; // Owner

  const membership = await db.prepare(`
    SELECT tgm.role
    FROM trip_group_members tgm
    JOIN trip_groups tg ON tg.id = tgm.group_id
    WHERE tg.trip_id = ? AND tgm.user_id = ?
  `).get(trip.id, currentUserId);

  return Boolean(membership);
}

/**
 * Computes a privacy salt for a trip to prevent URL enumeration.
 */
function getTripPrivacySalt(trip) {
  if (trip.visibility === 'public') return 'public';
  const secretSource = trip.share_token || `salt-${trip.id}-${trip.created_at || 'media'}`;
  return crypto.createHash('sha256').update(secretSource).digest('hex').slice(0, 16);
}

/**
 * GET /api/trips/:id/media
 * Retrieves shared photos and videos for a trip.
 * Respects trip visibility (public, unlisted, private) and group membership.
 */
async function getTripMedia(req, res, next) {
  try {
    const db = getDb();
    const tripId = req.params.id;
    const currentUserId = req.user ? req.user.id : null;
    const providedToken = req.query.token || req.headers['x-share-token'] || null;
    const typeFilter = req.query.type; // 'photo' | 'video'

    // 1. Fetch trip
    const trip = await db.prepare(`
      SELECT id, user_id, title, visibility, share_token, created_at
      FROM trips
      WHERE id = ?
    `).get(tripId);

    if (!trip) {
      return res.status(404).json({
        success: false,
        error: `Trip with ID ${tripId} not found.`
      });
    }

    // 2. Access control verification
    const { allowed, isOwner } = await checkTripMediaAccess(trip, currentUserId, providedToken, db);
    if (!allowed) {
      // Uniform 404 to avoid disclosing existence of private or unauthorized trip
      return res.status(404).json({
        success: false,
        error: `Trip with ID ${tripId} not found.`
      });
    }

    // 3. Build query for media items
    let query = `
      SELECT
        tm.id,
        tm.trip_id,
        tm.user_id,
        tm.media_type,
        tm.public_id,
        tm.secure_url,
        tm.thumbnail_url,
        tm.format,
        tm.bytes,
        tm.width,
        tm.height,
        tm.duration,
        tm.caption,
        tm.created_at,
        u.name AS uploader_name,
        u.username AS uploader_username,
        u.avatar_url AS uploader_avatar
      FROM trip_media tm
      JOIN users u ON u.id = tm.user_id
      WHERE tm.trip_id = ?
    `;
    const params = [tripId];

    if (typeFilter === 'photo' || typeFilter === 'video') {
      query += ` AND tm.media_type = ?`;
      params.push(typeFilter);
    }

    query += ` ORDER BY tm.created_at DESC, tm.id DESC`;

    const rawItems = await db.prepare(query).all(...params);

    // 4. Transform items with permissions and signed delivery URLs
    const isPrivateOrUnlisted = trip.visibility === 'private' || trip.visibility === 'unlisted';

    const items = rawItems.map((item) => {
      const canDelete = Boolean(
        currentUserId && (item.user_id === currentUserId || isOwner)
      );

      // For private/unlisted trips, ensure secure delivery with signed token URLs
      let deliveryUrl = item.secure_url;
      let thumbnailUrl = item.thumbnail_url;

      if (isPrivateOrUnlisted && item.public_id) {
        deliveryUrl = generateSignedDeliveryUrl(item.public_id, {
          resourceType: item.media_type === 'video' ? 'video' : 'image'
        });
        thumbnailUrl = generateThumbnailUrl(item.public_id, {
          resourceType: item.media_type === 'video' ? 'video' : 'image'
        });
      }

      return {
        id: item.id,
        trip_id: item.trip_id,
        user_id: item.user_id,
        media_type: item.media_type,
        public_id: item.public_id,
        secure_url: deliveryUrl,
        thumbnail_url: thumbnailUrl || deliveryUrl,
        format: item.format,
        bytes: item.bytes,
        width: item.width,
        height: item.height,
        duration: item.duration,
        caption: item.caption,
        created_at: item.created_at,
        can_delete: canDelete,
        uploader: {
          id: item.user_id,
          name: item.uploader_name,
          username: item.uploader_username,
          avatar_url: item.uploader_avatar
        }
      };
    });

    const photos = items.filter((m) => m.media_type === 'photo');
    const videos = items.filter((m) => m.media_type === 'video');

    return res.status(200).json({
      success: true,
      trip_id: trip.id,
      count: items.length,
      photos_count: photos.length,
      videos_count: videos.length,
      data: items,
      photos,
      videos
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/trips/:id/media/signature
 * Generates an HMAC-SHA256 signature for direct client-to-Cloudinary upload.
 * Restricted to Trip Owner and Active Group Members.
 */
async function getUploadSignature(req, res, next) {
  try {
    const db = getDb();
    const tripId = req.params.id;
    const currentUserId = req.user.id;
    const media_type = req.body.media_type || req.body.mediaType;

    // 1. Validate media_type
    if (!media_type || (media_type !== 'photo' && media_type !== 'video')) {
      return res.status(400).json({
        success: false,
        error: "Field 'media_type' is required and must be either 'photo' or 'video'."
      });
    }

    // 2. Fetch trip
    const trip = await db.prepare(`
      SELECT id, user_id, visibility, share_token, created_at
      FROM trips
      WHERE id = ?
    `).get(tripId);

    if (!trip) {
      return res.status(404).json({
        success: false,
        error: `Trip with ID ${tripId} not found.`
      });
    }

    // 3. Authorization check
    const isAuthorized = await checkTripUploadPermission(trip, currentUserId, db);
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'Only the trip organizer and confirmed travel companions may upload media.'
      });
    }

    // 4. Generate Cloudinary upload signature
    const privacySalt = getTripPrivacySalt(trip);
    const signatureData = generateUploadSignature({
      tripId: trip.id,
      mediaType: media_type,
      privacySalt
    });

    return res.status(200).json({
      success: true,
      data: signatureData
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/trips/:id/media
 * Registers successfully uploaded Cloudinary media metadata in SQLite.
 * Restricted to Trip Owner and Active Group Members.
 */
async function registerMedia(req, res, next) {
  try {
    const db = getDb();
    const tripId = req.params.id;
    const currentUserId = req.user.id;
    const public_id = req.body.public_id || req.body.publicId;
    const secure_url = req.body.secure_url || req.body.secureUrl;
    const media_type = req.body.media_type || req.body.mediaType;
    const {
      format,
      bytes,
      width,
      height,
      duration,
      caption
    } = req.body;

    // 1. Fetch trip
    const trip = await db.prepare(`
      SELECT id, user_id, visibility, share_token, created_at
      FROM trips
      WHERE id = ?
    `).get(tripId);

    if (!trip) {
      return res.status(404).json({
        success: false,
        error: `Trip with ID ${tripId} not found.`
      });
    }

    // 2. Authorization check
    const isAuthorized = await checkTripUploadPermission(trip, currentUserId, db);
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'Only the trip organizer and confirmed travel companions may upload media.'
      });
    }

    // 3. Comprehensive input validation
    if (!public_id || typeof public_id !== 'string') {
      return res.status(400).json({
        success: false,
        error: "Field 'public_id' is required and must be a valid string."
      });
    }

    // Security: Namespace check prevents cross-trip asset substitution or arbitrary registration
    const expectedPrefix = `roamly/trips/${tripId}/`;
    if (!public_id.startsWith(expectedPrefix)) {
      return res.status(400).json({
        success: false,
        error: `Security violation: public_id must belong to the trip folder namespace '${expectedPrefix}'.`
      });
    }

    if (!secure_url || typeof secure_url !== 'string' || !secure_url.startsWith('https://')) {
      return res.status(400).json({
        success: false,
        error: "Field 'secure_url' is required and must be a valid HTTPS URL."
      });
    }

    if (!media_type || (media_type !== 'photo' && media_type !== 'video')) {
      return res.status(400).json({
        success: false,
        error: "Field 'media_type' must be 'photo' or 'video'."
      });
    }

    const limits = MEDIA_LIMITS[media_type];
    const normalizedFormat = typeof format === 'string' ? format.toLowerCase().trim() : '';
    if (!normalizedFormat || !limits.allowedFormats.includes(normalizedFormat)) {
      return res.status(400).json({
        success: false,
        error: `Invalid format '${format}'. Allowed formats for ${media_type}: ${limits.allowedFormats.join(', ')}.`
      });
    }

    const parsedBytes = parseInt(bytes, 10);
    if (isNaN(parsedBytes) || parsedBytes <= 0) {
      return res.status(400).json({
        success: false,
        error: "Field 'bytes' must be a positive integer file size."
      });
    }

    if (parsedBytes > limits.maxBytes) {
      return res.status(400).json({
        success: false,
        error: `File size ${parsedBytes} bytes exceeds maximum allowed limit of ${limits.maxBytes} bytes (${limits.maxBytes / (1024 * 1024)} MB).`
      });
    }

    // Video duration check
    let parsedDuration = null;
    if (media_type === 'video') {
      if (duration !== undefined && duration !== null) {
        parsedDuration = parseFloat(duration);
        if (isNaN(parsedDuration) || parsedDuration <= 0) {
          return res.status(400).json({
            success: false,
            error: "Field 'duration' for video must be a positive number."
          });
        }
        if (limits.maxDurationSeconds && parsedDuration > limits.maxDurationSeconds) {
          return res.status(400).json({
            success: false,
            error: `Video duration ${parsedDuration.toFixed(1)}s exceeds maximum allowed duration of ${limits.maxDurationSeconds}s.`
          });
        }
      }
    }

    // Caption sanitization
    let cleanCaption = null;
    if (caption !== undefined && caption !== null) {
      if (typeof caption !== 'string') {
        return res.status(400).json({
          success: false,
          error: "Field 'caption' must be a string."
        });
      }
      cleanCaption = caption.trim().slice(0, 255) || null;
    }

    // Duplicate registration check
    const existingMedia = await db.prepare('SELECT id FROM trip_media WHERE public_id = ?').get(public_id);
    if (existingMedia) {
      return res.status(400).json({
        success: false,
        error: 'Media with this public_id has already been registered in the database.'
      });
    }

    // 4. Generate thumbnail URL
    const thumbnailUrl = generateThumbnailUrl(public_id, {
      resourceType: limits.resourceType
    });

    // 5. Insert into SQLite / Postgres
    const insertStmt = db.prepare(`
      INSERT INTO trip_media (
        trip_id,
        user_id,
        media_type,
        public_id,
        secure_url,
        thumbnail_url,
        format,
        bytes,
        width,
        height,
        duration,
        caption
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = await insertStmt.run(
      trip.id,
      currentUserId,
      media_type,
      public_id,
      secure_url,
      thumbnailUrl,
      normalizedFormat,
      parsedBytes,
      width ? parseInt(width, 10) : null,
      height ? parseInt(height, 10) : null,
      parsedDuration,
      cleanCaption
    );

    const createdRecord = await db.prepare(`
      SELECT
        tm.*,
        u.name AS uploader_name,
        u.username AS uploader_username,
        u.avatar_url AS uploader_avatar
      FROM trip_media tm
      JOIN users u ON u.id = tm.user_id
      WHERE tm.id = ?
    `).get(result.lastInsertRowid);

    return res.status(201).json({
      success: true,
      message: `${media_type === 'video' ? 'Video' : 'Photo'} uploaded and registered successfully.`,
      data: {
        ...createdRecord,
        can_delete: true,
        uploader: {
          id: currentUserId,
          name: createdRecord.uploader_name,
          username: createdRecord.uploader_username,
          avatar_url: createdRecord.uploader_avatar
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/trips/:id/media/:mediaId
 * Deletes a media asset from Cloudinary and removes its SQLite record.
 * Allowed: The original uploader OR the Trip Owner (moderator).
 */
async function deleteMedia(req, res, next) {
  try {
    const db = getDb();
    const tripId = req.params.id;
    const mediaId = req.params.mediaId;
    const currentUserId = req.user.id;

    // 1. Fetch trip
    const trip = await db.prepare('SELECT id, user_id FROM trips WHERE id = ?').get(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: `Trip with ID ${tripId} not found.`
      });
    }

    // 2. Fetch media record
    const media = await db.prepare(`
      SELECT id, trip_id, user_id, media_type, public_id
      FROM trip_media
      WHERE id = ? AND trip_id = ?
    `).get(mediaId, tripId);

    if (!media) {
      return res.status(404).json({
        success: false,
        error: `Media item with ID ${mediaId} not found on this trip.`
      });
    }

    // 3. Authorization: Uploader OR Trip Owner
    const isUploader = media.user_id === currentUserId;
    const isTripOwner = trip.user_id === currentUserId;

    if (!isUploader && !isTripOwner) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to delete this media item. Only the uploader or trip organizer may remove media.'
      });
    }

    // 4. Remove asset from Cloudinary
    try {
      await destroyCloudinaryAsset(
        media.public_id,
        media.media_type === 'video' ? 'video' : 'image'
      );
    } catch (cloudErr) {
      console.warn(`[Cloudinary Warning] Asset destruction failed for ${media.public_id}:`, cloudErr.message);
      // We proceed with database record deletion to avoid broken media links
    }

    // 5. Delete metadata record from SQLite / Postgres
    await db.prepare('DELETE FROM trip_media WHERE id = ?').run(mediaId);

    return res.status(200).json({
      success: true,
      message: 'Media deleted successfully.',
      deleted_id: mediaId
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTripMedia,
  getUploadSignature,
  registerMedia,
  deleteMedia
};
