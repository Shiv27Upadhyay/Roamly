/**
 * Roamly Group Trips Controller
 * Handles group workspace creation, membership management, invitation lifecycle,
 * and secure join flows.
 */

const QRCode = require('qrcode');
const { getDb, withTransaction } = require('../config/db');
const {
  generateUniqueInviteCode,
  generateUniqueInviteToken,
  normalizeInviteCode
} = require('../utils/inviteCode');
const {
  recordFailedAttempt,
  resetFailedAttempts
} = require('../middleware/rateLimiter');

/**
 * Helper to fetch trip and verify existence.
 */
function getTrip(db, tripId) {
  return db.prepare('SELECT id, user_id, title, visibility, share_token FROM trips WHERE id = ?').get(tripId);
}

/**
 * Helper to fetch group by tripId.
 */
function getGroupByTripId(db, tripId) {
  return db.prepare('SELECT * FROM trip_groups WHERE trip_id = ?').get(tripId);
}

/**
 * POST /api/trips/:id/group
 * Authenticated trip owner creates a group workspace for a trip.
 */
function createTripGroup(req, res, next) {
  try {
    const db = getDb();
    const currentUserId = req.user.id;
    const tripId = req.params.id;
    const { name } = req.body || {};

    const trip = getTrip(db, tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: `Trip with ID ${tripId} not found.`
      });
    }

    if (trip.user_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: 'Only the trip owner can create a group workspace.'
      });
    }

    const existingGroup = getGroupByTripId(db, tripId);
    if (existingGroup) {
      return res.status(400).json({
        success: false,
        error: 'A group workspace already exists for this trip.'
      });
    }

    const groupName = (name && name.trim()) ? name.trim() : `${trip.title} Travelers`;
    const inviteCode = generateUniqueInviteCode(db);
    const inviteToken = generateUniqueInviteToken(db);

    const result = withTransaction((trxDb) => {
      trxDb.prepare(`
        INSERT INTO trip_groups (trip_id, created_by, name, invite_code, invite_token, invite_status)
        VALUES (?, ?, ?, ?, ?, 'active')
      `).run(tripId, currentUserId, groupName, inviteCode, inviteToken);

      const created = trxDb.prepare('SELECT * FROM trip_groups WHERE trip_id = ?').get(tripId);

      trxDb.prepare(`
        INSERT INTO trip_group_members (group_id, user_id, role, joined_via)
        VALUES (?, ?, 'owner', 'owner')
      `).run(created.id, currentUserId);

      return created;
    });

    const members = db.prepare(`
      SELECT
        tgm.id,
        tgm.group_id,
        tgm.user_id,
        tgm.role,
        tgm.joined_via,
        tgm.joined_at,
        u.name,
        u.username,
        u.avatar_url,
        u.email
      FROM trip_group_members tgm
      JOIN users u ON u.id = tgm.user_id
      WHERE tgm.group_id = ?
      ORDER BY tgm.joined_at ASC
    `).all(result.id);

    res.status(201).json({
      success: true,
      message: 'Group workspace created successfully.',
      data: {
        id: result.id,
        trip_id: result.trip_id,
        name: result.name,
        invite_code: result.invite_code,
        invite_token: result.invite_token,
        invite_status: result.invite_status,
        created_by: result.created_by,
        created_at: result.created_at,
        members_count: members.length,
        members
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/trips/:id/group
 * Authorized group members or trip owner retrieve group details and roster.
 */
function getTripGroup(req, res, next) {
  try {
    const db = getDb();
    const currentUserId = req.user.id;
    const tripId = req.params.id;

    const trip = getTrip(db, tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: `Trip with ID ${tripId} not found.`
      });
    }

    const group = getGroupByTripId(db, tripId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: `No group workspace found for trip ID ${tripId}.`
      });
    }

    const isOwner = trip.user_id === currentUserId;
    const membership = db.prepare(`
      SELECT role FROM trip_group_members WHERE group_id = ? AND user_id = ?
    `).get(group.id, currentUserId);

    if (!isOwner && !membership) {
      // If trip is private, return uniform 404 to prevent enumeration
      if (trip.visibility === 'private') {
        return res.status(404).json({
          success: false,
          error: `Trip with ID ${tripId} not found.`
        });
      }
      return res.status(403).json({
        success: false,
        error: 'You are not a member of this trip\'s group workspace.'
      });
    }

    const members = db.prepare(`
      SELECT
        tgm.id,
        tgm.group_id,
        tgm.user_id,
        tgm.role,
        tgm.joined_via,
        tgm.joined_at,
        u.name,
        u.username,
        u.avatar_url,
        u.email
      FROM trip_group_members tgm
      JOIN users u ON u.id = tgm.user_id
      WHERE tgm.group_id = ?
      ORDER BY
        CASE WHEN tgm.role = 'owner' THEN 0 WHEN tgm.role = 'editor' THEN 1 ELSE 2 END,
        tgm.joined_at ASC
    `).all(group.id);

    const responseData = {
      id: group.id,
      trip_id: group.trip_id,
      name: group.name,
      invite_code: group.invite_code,
      invite_status: group.invite_status,
      created_by: group.created_by,
      created_at: group.created_at,
      updated_at: group.updated_at,
      members_count: members.length,
      members
    };

    // Only expose invitation token to group managers (owners)
    if (isOwner || (membership && membership.role === 'owner')) {
      responseData.invite_token = group.invite_token;
    }

    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/trips/:id/group/invite/rotate
 * Owner rotates both invite code and invite token atomically.
 */
function rotateGroupInvite(req, res, next) {
  try {
    const db = getDb();
    const currentUserId = req.user.id;
    const tripId = req.params.id;

    const trip = getTrip(db, tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: `Trip with ID ${tripId} not found.`
      });
    }

    const group = getGroupByTripId(db, tripId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: `No group workspace found for trip ID ${tripId}.`
      });
    }

    if (trip.user_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: 'Only the trip owner can rotate group invitations.'
      });
    }

    const newCode = generateUniqueInviteCode(db);
    const newToken = generateUniqueInviteToken(db);

    db.prepare(`
      UPDATE trip_groups
      SET invite_code = ?, invite_token = ?, invite_status = 'active', updated_at = datetime('now')
      WHERE id = ?
    `).run(newCode, newToken, group.id);

    res.status(200).json({
      success: true,
      message: 'Group invitation code and token rotated successfully.',
      data: {
        group_id: group.id,
        trip_id: trip.id,
        invite_code: newCode,
        invite_token: newToken,
        invite_status: 'active'
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/trips/:id/group/invite/status
 * Owner revokes or reactivates invitations.
 */
function updateGroupInviteStatus(req, res, next) {
  try {
    const db = getDb();
    const currentUserId = req.user.id;
    const tripId = req.params.id;
    const { status } = req.body || {};

    if (!status || !['active', 'revoked'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Status must be either 'active' or 'revoked'."
      });
    }

    const trip = getTrip(db, tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: `Trip with ID ${tripId} not found.`
      });
    }

    const group = getGroupByTripId(db, tripId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: `No group workspace found for trip ID ${tripId}.`
      });
    }

    if (trip.user_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: 'Only the trip owner can update invitation status.'
      });
    }

    db.prepare(`
      UPDATE trip_groups
      SET invite_status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(status, group.id);

    res.status(200).json({
      success: true,
      message: `Group invitation status updated to '${status}'.`,
      data: {
        group_id: group.id,
        trip_id: trip.id,
        invite_status: status
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/groups/join
 * Authenticated user joins a group trip via invite code or token.
 */
function joinGroup(req, res, next) {
  try {
    const db = getDb();
    const currentUserId = req.user.id;
    const { code, token, via } = req.body || {};

    if ((!code || !code.trim()) && (!token || !token.trim())) {
      return res.status(400).json({
        success: false,
        error: 'Either an invite code or invite token is required to join a group.'
      });
    }

    let group = null;
    let joinedViaMethod = 'invite_code';

    if (code && code.trim()) {
      const normalizedCode = normalizeInviteCode(code);
      group = db.prepare(`
        SELECT tg.*, t.title AS trip_title, t.visibility AS trip_visibility, t.user_id AS trip_owner_id
        FROM trip_groups tg
        JOIN trips t ON t.id = tg.trip_id
        WHERE tg.invite_code = ?
      `).get(normalizedCode);
      joinedViaMethod = 'invite_code';
    } else if (token && token.trim()) {
      group = db.prepare(`
        SELECT tg.*, t.title AS trip_title, t.visibility AS trip_visibility, t.user_id AS trip_owner_id
        FROM trip_groups tg
        JOIN trips t ON t.id = tg.trip_id
        WHERE tg.invite_token = ?
      `).get(token.trim());
      joinedViaMethod = via === 'qr_code' ? 'qr_code' : 'invite_link';
    }

    if (!group) {
      if (req.rateLimitKey) recordFailedAttempt(req.rateLimitKey);
      return res.status(404).json({
        success: false,
        error: 'Invalid group invitation code or token.'
      });
    }

    if (group.invite_status === 'revoked') {
      if (req.rateLimitKey) recordFailedAttempt(req.rateLimitKey);
      return res.status(403).json({
        success: false,
        error: 'This group invitation has been revoked by the trip organizer.'
      });
    }

    // Invitation is valid -> clear failed attempts
    if (req.rateLimitKey) resetFailedAttempts(req.rateLimitKey);

    // Check if user is already a member
    const existingMembership = db.prepare(`
      SELECT id, role, joined_via, joined_at
      FROM trip_group_members
      WHERE group_id = ? AND user_id = ?
    `).get(group.id, currentUserId);

    if (existingMembership) {
      return res.status(200).json({
        success: true,
        message: 'You are already a member of this group trip.',
        data: {
          group_id: group.id,
          trip_id: group.trip_id,
          trip_title: group.trip_title,
          role: existingMembership.role,
          already_member: true
        }
      });
    }

    // Insert new membership with role 'member'
    db.prepare(`
      INSERT INTO trip_group_members (group_id, user_id, role, joined_via)
      VALUES (?, ?, 'member', ?)
    `).run(group.id, currentUserId, joinedViaMethod);

    res.status(201).json({
      success: true,
      message: 'Successfully joined the group trip!',
      data: {
        group_id: group.id,
        trip_id: group.trip_id,
        trip_title: group.trip_title,
        role: 'member',
        already_member: false
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/trips/:id/group/members/:userId
 * Owner removes a member, or a member leaves voluntarily.
 */
function removeGroupMember(req, res, next) {
  try {
    const db = getDb();
    const currentUserId = req.user.id;
    const tripId = req.params.id;
    const targetUserId = req.params.userId;

    const trip = getTrip(db, tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: `Trip with ID ${tripId} not found.`
      });
    }

    const group = getGroupByTripId(db, tripId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: `No group workspace found for trip ID ${tripId}.`
      });
    }

    const member = db.prepare(`
      SELECT id, user_id, role FROM trip_group_members WHERE group_id = ? AND user_id = ?
    `).get(group.id, targetUserId);

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found in this group workspace.'
      });
    }

    // Owner cannot leave or be removed
    if (member.role === 'owner' || targetUserId === group.created_by) {
      return res.status(400).json({
        success: false,
        error: 'The group owner cannot leave or be removed from the group.'
      });
    }

    // Permission check: must be trip owner OR member removing themselves
    const isOwner = trip.user_id === currentUserId;
    const isSelf = currentUserId === targetUserId;

    if (!isOwner && !isSelf) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to remove this member.'
      });
    }

    db.prepare('DELETE FROM trip_group_members WHERE id = ?').run(member.id);

    const message = isSelf ? 'You have left the group trip.' : 'Member removed from group successfully.';

    res.status(200).json({
      success: true,
      message,
      data: {
        group_id: group.id,
        trip_id: trip.id,
        removed_user_id: targetUserId
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/trips/:id/group/qr
 * Returns dynamically generated QR code representation of the current invitation URL.
 * Only accessible to authorized group managers (trip owner).
 */
async function getTripGroupQr(req, res, next) {
  try {
    const db = getDb();
    const currentUserId = req.user.id;
    const tripId = req.params.id;

    const trip = getTrip(db, tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: `Trip with ID ${tripId} not found.`
      });
    }

    const group = getGroupByTripId(db, tripId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: `No group workspace found for trip ID ${tripId}.`
      });
    }

    const isOwner = trip.user_id === currentUserId;
    const membership = db.prepare(`
      SELECT role FROM trip_group_members WHERE group_id = ? AND user_id = ?
    `).get(group.id, currentUserId);

    if (!isOwner && (!membership || membership.role !== 'owner')) {
      if (trip.visibility === 'private') {
        return res.status(404).json({
          success: false,
          error: `Trip with ID ${tripId} not found.`
        });
      }
      return res.status(403).json({
        success: false,
        error: 'Only group managers can access the invitation QR code.'
      });
    }

    if (group.invite_status === 'revoked') {
      return res.status(403).json({
        success: false,
        error: 'Group invitations are currently revoked for this trip. Please reactivate invitations first.'
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteUrl = `${frontendUrl}/trips/join?token=${encodeURIComponent(group.invite_token)}`;

    const qrDataUrl = await QRCode.toDataURL(inviteUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale: 8,
      color: {
        dark: '#1C2421',
        light: '#FAF7F2'
      }
    });

    const qrSvg = await QRCode.toString(inviteUrl, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 2,
      color: {
        dark: '#1C2421',
        light: '#FAF7F2'
      }
    });

    const wantsSvg = req.query.format === 'svg' || req.headers['accept'] === 'image/svg+xml';
    if (wantsSvg) {
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(qrSvg);
    }

    res.status(200).json({
      success: true,
      data: {
        group_id: group.id,
        trip_id: trip.id,
        invite_code: group.invite_code,
        invite_token: group.invite_token,
        invite_url: inviteUrl,
        invite_status: group.invite_status,
        qr_data_url: qrDataUrl,
        qr_svg: qrSvg
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/groups/preview?code=... OR ?token=...
 * Safe invitation destination and organizer preview for travelers landing on /trips/join.
 * Never leaks private itinerary details, stops, or secret tokens.
 */
function getGroupInvitationPreview(req, res, next) {
  try {
    const db = getDb();
    const { code, token } = req.query || {};

    if ((!code || !code.trim()) && (!token || !token.trim())) {
      return res.status(400).json({
        success: false,
        error: 'Either code or token query parameter is required for invitation preview.'
      });
    }

    let group = null;
    if (code && code.trim()) {
      const normalizedCode = normalizeInviteCode(code);
      group = db.prepare(`
        SELECT
          tg.id AS group_id,
          tg.name AS group_name,
          tg.invite_code,
          tg.invite_status,
          t.id AS trip_id,
          t.title AS trip_title,
          t.start_date,
          t.end_date,
          COALESCE(t.cover_image, d.cover_image) AS cover_image,
          u.name AS organizer_name,
          u.avatar_url AS organizer_avatar,
          d.title AS destination_title,
          d.country AS destination_country,
          (SELECT COUNT(*) FROM trip_group_members tgm WHERE tgm.group_id = tg.id) AS members_count
        FROM trip_groups tg
        JOIN trips t ON t.id = tg.trip_id
        JOIN users u ON u.id = tg.created_by
        LEFT JOIN destinations d ON d.id = t.destination_id
        WHERE tg.invite_code = ?
      `).get(normalizedCode);
    } else if (token && token.trim()) {
      group = db.prepare(`
        SELECT
          tg.id AS group_id,
          tg.name AS group_name,
          tg.invite_code,
          tg.invite_status,
          t.id AS trip_id,
          t.title AS trip_title,
          t.start_date,
          t.end_date,
          COALESCE(t.cover_image, d.cover_image) AS cover_image,
          u.name AS organizer_name,
          u.avatar_url AS organizer_avatar,
          d.title AS destination_title,
          d.country AS destination_country,
          (SELECT COUNT(*) FROM trip_group_members tgm WHERE tgm.group_id = tg.id) AS members_count
        FROM trip_groups tg
        JOIN trips t ON t.id = tg.trip_id
        JOIN users u ON u.id = tg.created_by
        LEFT JOIN destinations d ON d.id = t.destination_id
        WHERE tg.invite_token = ?
      `).get(token.trim());
    }

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Invitation not found or no longer valid.'
      });
    }

    if (group.invite_status === 'revoked') {
      return res.status(403).json({
        success: false,
        error: 'This group invitation has been revoked by the organizer.',
        data: {
          group_name: group.group_name,
          trip_title: group.trip_title,
          invite_status: 'revoked'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        group_id: group.group_id,
        group_name: group.group_name,
        trip_id: group.trip_id,
        trip_title: group.trip_title,
        destination_title: group.destination_title,
        destination_country: group.destination_country,
        cover_image: group.cover_image,
        start_date: group.start_date,
        end_date: group.end_date,
        organizer_name: group.organizer_name,
        organizer_avatar: group.organizer_avatar,
        members_count: group.members_count,
        invite_code: group.invite_code,
        invite_status: group.invite_status
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createTripGroup,
  getTripGroup,
  getTripGroupQr,
  rotateGroupInvite,
  updateGroupInviteStatus,
  joinGroup,
  getGroupInvitationPreview,
  removeGroupMember
};
