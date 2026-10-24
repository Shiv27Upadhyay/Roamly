import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  DollarSign,
  Heart,
  MessageSquare,
  Edit3,
  Trash2,
  ArrowLeft,
  Layers,
  Send,
  Share2,
  Globe,
  Lock,
  Link2,
  Users,
  UserPlus
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/common/ConfirmModal';
import { DetailSkeleton } from '../components/common/LoadingSkeleton';
import ShareJourneyModal from '../components/trips/ShareJourneyModal';
import GroupInviteModal from '../components/trips/GroupInviteModal';
import MediaUploadModal from '../components/trips/MediaUploadModal';
import TripPhotosSection from '../components/trips/TripPhotosSection';
import TripVideosSection from '../components/trips/TripVideosSection';
import PhotoLightboxModal from '../components/trips/PhotoLightboxModal';

export default function TripDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const shareToken = searchParams.get('token') || null;
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user, openAuthModal } = useAuth();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Likes & Interactions
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);

  // Comments
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');

  // Modals
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [group, setGroup] = useState(null);

  // Media (Photos & Videos)
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadModalType, setUploadModalType] = useState('photo');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const fetchMedia = async () => {
    setMediaLoading(true);
    try {
      const params = shareToken ? { token: shareToken } : {};
      const res = await api.getTripMedia(id, params);
      setPhotos(res.photos || []);
      setVideos(res.videos || []);
    } catch {
      setPhotos([]);
      setVideos([]);
    } finally {
      setMediaLoading(false);
    }
  };

  const fetchGroup = async () => {
    if (!user) {
      setGroup(null);
      return;
    }
    try {
      const res = await api.getTripGroup(id);
      setGroup(res.data);
    } catch {
      setGroup(null);
    }
  };

  const fetchTrip = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getTripById(id, shareToken);
      const data = res.data;
      setTrip(data);
      setIsLiked(Boolean(data.is_liked));
      setLikesCount(data.likes_count || 0);
      setComments(data.comments || []);
    } catch (err) {
      setError(err.message || 'Itinerary not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrip();
    fetchGroup();
    fetchMedia();
  }, [id, user, shareToken]);

  const handleOpenUpload = (type = 'photo') => {
    if (!user) {
      openAuthModal('Sign in with Google to upload trip photos and videos.');
      return;
    }
    setUploadModalType(type);
    setUploadModalOpen(true);
  };

  const handleDeletePhoto = async (photoId) => {
    try {
      await api.deleteTripMedia(id, photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      addToast('Photo deleted from gallery.', 'info');
    } catch (err) {
      addToast(err.message || 'Failed to delete photo.', 'error');
    }
  };

  const handleDeleteVideo = async (videoId) => {
    try {
      await api.deleteTripMedia(id, videoId);
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
      addToast('Video deleted from gallery.', 'info');
    } catch (err) {
      addToast(err.message || 'Failed to delete video.', 'error');
    }
  };

  const handleOpenLightbox = (index) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleCreateGroup = async () => {
    if (!user) {
      openAuthModal('Sign in with Google to create a companion group.');
      return;
    }
    try {
      const res = await api.createTripGroup(id);
      setGroup(res.data);
      setGroupModalOpen(true);
      addToast('Group workspace created! Invite companions with code or QR.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to create group workspace.', 'error');
    }
  };

  const handleToggleLike = async () => {
    if (!user) {
      openAuthModal('Sign in with Google to like this itinerary.');
      return;
    }
    if (likeLoading) return;
    setLikeLoading(true);
    try {
      const res = await api.toggleTripLike(id, shareToken);
      setIsLiked(res.data.liked);
      setLikesCount(res.data.likes_count);
      if (res.data.liked) {
        addToast(`You liked "${trip.title}"`, 'success');
      }
    } catch (err) {
      if (err.status === 401) {
        openAuthModal('Your session has expired. Please sign in to like this itinerary.');
      } else {
        addToast(err.message || 'Failed to update like.', 'error');
      }
    } finally {
      setLikeLoading(false);
    }
  };

  const handleDeleteTrip = async () => {
    setDeleteLoading(true);
    try {
      await api.deleteTrip(id);
      addToast(`Trip "${trip.title}" deleted successfully.`, 'info');
      navigate('/trips');
    } catch (err) {
      if (err.status === 401) {
        openAuthModal('Your session has expired. Please sign in again.');
      } else {
        addToast(err.message || 'Failed to delete trip.', 'error');
      }
    } finally {
      setDeleteLoading(false);
      setDeleteModalOpen(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('Sign in with Google to post traveler notes and recommendations.');
      return;
    }
    if (!newComment.trim() || newComment.trim().length < 2) {
      setCommentError('Comment must be at least 2 characters long.');
      return;
    }
    setCommentError('');
    setCommentSubmitting(true);
    try {
      const res = await api.addTripComment(id, newComment.trim(), shareToken);
      setComments((prev) => [...prev, res.data]);
      setNewComment('');
      addToast('Comment published!', 'success');
    } catch (err) {
      if (err.status === 401) {
        openAuthModal('Your session has expired. Please sign in to post a comment.');
      } else {
        setCommentError(err.message || 'Failed to post comment.');
      }
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      addToast('Comment deleted.', 'info');
    } catch (err) {
      if (err.status === 401) {
        openAuthModal('Your session has expired. Please sign in again.');
      } else {
        addToast(err.message || 'Failed to delete comment.', 'error');
      }
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-16)' }}>
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="container" style={{ paddingTop: 'var(--space-12)', textAlign: 'center' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <h2>Itinerary Not Found</h2>
          <p style={{ margin: '16px 0 24px', color: 'var(--color-ink-muted)' }}>
            {error || `We couldn't locate a trip with identifier #${id}.`}
          </p>
          <Link to="/trips" className="btn btn-primary btn-sm">
            <ArrowLeft size={16} />
            <span>Back to All Trips</span>
          </Link>
        </div>
      </div>
    );
  }

  // Group stops by day number
  const stopsByDay = (trip.stops || []).reduce((acc, stop) => {
    const day = stop.day_number || 1;
    if (!acc[day]) acc[day] = [];
    acc[day].push(stop);
    return acc;
  }, {});

  const isOwner = Boolean(user && trip.user_id === user.id) || Boolean(trip.is_owner);
  const isGroupMember = Boolean(trip.is_group_member || (group && user && group.members?.some(m => m.user_id === user.id)));
  const canUploadMedia = Boolean(user && (isOwner || isGroupMember));

  return (
    <div style={{ paddingBottom: 'var(--space-20)' }}>
      {/* Top Breadcrumb & Actions Bar */}
      <div className="container" style={{ paddingTop: 'var(--space-4)', paddingBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <Link to="/trips" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--color-ink-muted)' }}>
          <ArrowLeft size={16} />
          <span>Back to Itineraries</span>
        </Link>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {isOwner && (
            <>
              {group ? (
                <button
                  type="button"
                  onClick={() => setGroupModalOpen(true)}
                  className="btn btn-outline btn-sm"
                  style={{ backgroundColor: 'var(--color-ivory)' }}
                  title="Manage companions, invite code, and QR"
                >
                  <Users size={15} color="var(--color-terracotta)" />
                  <span>Companions ({group.members_count || group.members?.length || 1})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateGroup}
                  className="btn btn-outline btn-sm"
                  style={{ backgroundColor: 'var(--color-ivory)' }}
                  title="Invite travel companions to this trip"
                >
                  <UserPlus size={15} color="var(--color-terracotta)" />
                  <span>Invite Companions</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShareModalOpen(true)}
                className="btn btn-outline btn-sm"
                style={{ backgroundColor: 'var(--color-ivory)' }}
                title="Share this journey and manage privacy"
              >
                <Share2 size={15} color="var(--color-terracotta)" />
                <span>Share Journey</span>
              </button>
              <Link to={`/trips/${trip.id}/edit`} className="btn btn-outline btn-sm">
                <Edit3 size={15} />
                <span>Edit Trip</span>
              </Link>
              <button
                onClick={() => setDeleteModalOpen(true)}
                className="btn btn-danger btn-sm"
                title="Delete this itinerary"
              >
                <Trash2 size={15} />
                <span>Delete</span>
              </button>
            </>
          )}

          {!isOwner && (group || trip.is_group_member) && (
            <button
              type="button"
              onClick={() => setGroupModalOpen(true)}
              className="btn btn-outline btn-sm"
              style={{ backgroundColor: 'var(--color-ivory)' }}
              title="View travel companions"
            >
              <Users size={15} color="var(--color-terracotta)" />
              <span>Group Companions ({group?.members_count || group?.members?.length || 'Joined'})</span>
            </button>
          )}
        </div>
      </div>

      {/* Hero Banner */}
      <div style={{ position: 'relative', width: '100%', minHeight: '380px', overflow: 'hidden', background: 'var(--color-ink)' }}>
        <img
          src={trip.cover_image || 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80'}
          alt={trip.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85, position: 'absolute', inset: 0 }}
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80';
          }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(28,36,33,0.92) 0%, rgba(28,36,33,0.3) 60%, transparent 100%)'
        }} />

        <div className="container" style={{ position: 'relative', zIndex: 2, paddingTop: '160px', paddingBottom: '36px', color: 'var(--color-ivory)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
            {trip.destination_title && (
              <Link to={`/destinations/${trip.destination_id}`} className="badge badge-sand" style={{ background: 'rgba(250,247,242,0.95)', color: 'var(--color-ink)' }}>
                <MapPin size={13} color="var(--color-terracotta)" />
                <span>{trip.destination_title}, {trip.destination_country}</span>
              </Link>
            )}

            {/* Owner Visibility Status Pill */}
            {isOwner && (
              <button
                type="button"
                onClick={() => setShareModalOpen(true)}
                className={`badge ${trip.visibility === 'unlisted' ? 'badge-ochre' : trip.visibility === 'private' ? 'badge-sand' : 'badge-sage'}`}
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}
                title="Click to manage trip privacy & sharing"
              >
                {trip.visibility === 'unlisted' ? (
                  <>
                    <Link2 size={13} />
                    <span>Unlisted (Secret Link)</span>
                  </>
                ) : trip.visibility === 'private' ? (
                  <>
                    <Lock size={13} />
                    <span>Private (Only You)</span>
                  </>
                ) : (
                  <>
                    <Globe size={13} />
                    <span>Public</span>
                  </>
                )}
              </button>
            )}

            {/* Group Companions Badge */}
            {group ? (
              <button
                type="button"
                onClick={() => setGroupModalOpen(true)}
                className="badge badge-sage"
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  backgroundColor: 'rgba(79, 99, 82, 0.9)',
                  color: 'var(--color-ivory)'
                }}
                title="View travel companions"
              >
                <Users size={13} />
                <span>Group Trip • {group.members_count || group.members?.length || 1} travelers</span>
              </button>
            ) : isOwner ? (
              <button
                type="button"
                onClick={handleCreateGroup}
                className="badge badge-sand"
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  backgroundColor: 'rgba(250,247,242,0.85)',
                  color: 'var(--color-ink)'
                }}
                title="Click to enable group collaboration"
              >
                <UserPlus size={13} color="var(--color-terracotta)" />
                <span>Enable Group Trip</span>
              </button>
            ) : null}
          </div>

          <h1 style={{ color: 'var(--color-ivory)', marginBottom: '12px' }}>
            {trip.title}
          </h1>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', fontSize: '0.95rem', color: 'rgba(250,247,242,0.85)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={16} color="var(--color-terracotta)" />
              <span>{trip.start_date} to {trip.end_date}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DollarSign size={16} color="var(--color-sage)" />
              <span>Budget: ${Number(trip.estimated_budget || 0).toLocaleString()} {trip.currency}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={16} />
              <span>{trip.stops?.length || 0} Itinerary Stops</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="container" style={{ paddingTop: 'var(--space-8)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.9fr) minmax(0, 1fr)', gap: 'var(--space-12)' }}>
          {/* Left Column: Itinerary Stops & Journal */}
          <div>
            {/* Journal Notes */}
            {trip.notes && (
              <section style={{
                background: 'var(--color-sand)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-6)',
                marginBottom: 'var(--space-8)'
              }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Traveler’s Journal Notes</h3>
                <p style={{ fontSize: '1rem', lineHeight: '1.7', color: 'var(--color-ink)' }}>
                  {trip.notes}
                </p>
              </section>
            )}

            {/* Day-by-Day Stops */}
            <section style={{ marginBottom: 'var(--space-12)' }}>
              <h2 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-6)' }}>Day-by-Day Itinerary</h2>

              {Object.keys(stopsByDay).length === 0 ? (
                <div style={{ padding: '24px', background: '#FFFFFF', border: '1px dashed var(--color-border-dark)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <p style={{ color: 'var(--color-ink-muted)' }}>No stops added to this itinerary yet.</p>
                </div>
              ) : (
                Object.keys(stopsByDay)
                  .sort((a, b) => Number(a) - Number(b))
                  .map((dayNum) => (
                    <div key={dayNum} style={{ marginBottom: 'var(--space-8)' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: 'var(--space-4)',
                        paddingBottom: '8px',
                        borderBottom: '2px solid var(--color-sand)'
                      }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'var(--color-terracotta)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.85rem'
                        }}>
                          {dayNum}
                        </div>
                        <h3 style={{ fontSize: '1.35rem', margin: 0 }}>Day {dayNum}</h3>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {stopsByDay[dayNum].map((stop) => {
                          let badgeClass = 'badge-sand';
                          if (stop.category === 'Food') badgeClass = 'badge-ochre';
                          if (stop.category === 'Culture') badgeClass = 'badge-terracotta';
                          if (stop.category === 'Nature') badgeClass = 'badge-sage';

                          return (
                            <div
                              key={stop.id}
                              style={{
                                background: '#FFFFFF',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                gap: '16px'
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                  <span className={`badge ${badgeClass}`}>{stop.category}</span>
                                  <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{stop.place_name}</h4>
                                </div>
                                {stop.notes && (
                                  <p style={{ fontSize: '0.9rem', color: 'var(--color-ink-muted)', marginTop: '4px' }}>
                                    {stop.notes}
                                  </p>
                                )}
                              </div>

                              {stop.cost > 0 && (
                                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-ink)', whiteSpace: 'nowrap' }}>
                                  ${Number(stop.cost).toLocaleString()}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
              )}

              {/* Total Stops Cost Summary */}
              {trip.stops && trip.stops.length > 0 && (
                <div style={{
                  background: 'var(--color-sand)',
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.95rem',
                  marginTop: 'var(--space-6)'
                }}>
                  <span>Sum of scheduled stops:</span>
                  <strong>${Number(trip.stops_total_cost || 0).toLocaleString()} {trip.currency}</strong>
                </div>
              )}
            </section>

            {/* Trip Photos Gallery */}
            <TripPhotosSection
              photos={photos}
              loading={mediaLoading}
              canUpload={canUploadMedia}
              onOpenUpload={() => handleOpenUpload('photo')}
              onDeletePhoto={handleDeletePhoto}
              onPhotoClick={handleOpenLightbox}
            />

            {/* Trip Videos Gallery */}
            <TripVideosSection
              videos={videos}
              loading={mediaLoading}
              canUpload={canUploadMedia}
              onOpenUpload={() => handleOpenUpload('video')}
              onDeleteVideo={handleDeleteVideo}
            />

            {/* Comments Discussion Section */}
            <section style={{ paddingTop: 'var(--space-8)', borderTop: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-6)' }}>
                <MessageSquare size={22} color="var(--color-terracotta)" />
                <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Traveler Notes &amp; Comments ({comments.length})</h3>
              </div>

              {/* New Comment Form */}
              <form onSubmit={handleCommentSubmit} style={{ marginBottom: 'var(--space-8)' }}>
                <div className="form-group">
                  <label htmlFor="commentInput" className="form-label">
                    Add a recommendation or question
                  </label>
                  <textarea
                    id="commentInput"
                    rows="3"
                    className={`form-textarea ${commentError ? 'has-error' : ''}`}
                    placeholder="Share an insider tip, dining spot, or question about this itinerary..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  {commentError && <div className="form-error">{commentError}</div>}
                </div>
                <button
                  type="submit"
                  disabled={commentSubmitting}
                  className="btn btn-primary btn-sm"
                >
                  <Send size={14} />
                  <span>{commentSubmitting ? 'Posting...' : 'Post Comment'}</span>
                </button>
              </form>

              {/* Comments List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {comments.length === 0 ? (
                  <p style={{ color: 'var(--color-ink-muted)', fontStyle: 'italic' }}>
                    No comments posted yet. Be the first to share your thoughts on this itinerary!
                  </p>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '16px',
                        display: 'flex',
                        gap: '14px',
                        alignItems: 'flex-start'
                      }}
                    >
                      <img
                        src={c.user_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80'}
                        alt={c.user_name}
                        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '0.95rem' }}>{c.user_name}</strong>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)' }}>
                              @{c.user_username}
                            </span>
                          </div>

                          {user && c.user_id === user.id && (
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              style={{ color: 'var(--color-danger)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                              title="Delete your comment"
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>

                        <p style={{ fontSize: '0.925rem', color: 'var(--color-ink)', lineHeight: '1.5' }}>
                          {c.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Right Column: Author card & Quick info */}
          <div>
            {/* Author Profile Card */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-6)',
              marginBottom: 'var(--space-6)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                <img
                  src={trip.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'}
                  alt={trip.author_name}
                  style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-border)' }}
                />
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.2rem' }}>{trip.author_name}</h4>
                  <div style={{ color: 'var(--color-ink-muted)', fontSize: '0.85rem' }}>
                    @{trip.author_username}
                  </div>
                </div>
              </div>

              {trip.author_bio && (
                <p style={{ fontSize: '0.9rem', color: 'var(--color-ink-muted)', lineHeight: '1.5', marginBottom: '16px' }}>
                  "{trip.author_bio}"
                </p>
              )}

              {/* Like Interaction Button */}
              <button
                onClick={handleToggleLike}
                disabled={likeLoading}
                className={`btn ${isLiked ? 'btn-primary' : 'btn-outline'}`}
                style={{ width: '100%' }}
              >
                <Heart size={18} fill={isLiked ? '#FFFFFF' : 'none'} strokeWidth={2.2} />
                <span>{isLiked ? 'Liked this Trip' : 'Like Itinerary'} ({likesCount})</span>
              </button>

              {/* Owner Actions */}
              {isOwner && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShareModalOpen(true)}
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <Share2 size={15} />
                    <span>Share Journey &amp; Privacy</span>
                  </button>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link to={`/trips/${id}/edit`} className="btn btn-outline btn-sm" style={{ flex: 1, display: 'inline-flex', justifyContent: 'center' }}>
                      <Edit3 size={14} />
                      <span>Edit Itinerary</span>
                    </Link>
                    <button
                      onClick={() => setDeleteModalOpen(true)}
                      className="btn btn-danger btn-sm"
                      style={{ flex: 1, display: 'inline-flex', justifyContent: 'center' }}
                    >
                      <Trash2 size={14} />
                      <span>Delete Trip</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Destination Link Card */}
            {trip.destination_id && (
              <div style={{
                background: 'var(--color-sand)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-5)'
              }}>
                <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-terracotta)', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '4px' }}>
                  Destination Spotlight
                </div>
                <h4 style={{ fontSize: '1.15rem', marginBottom: '4px' }}>
                  {trip.destination_title}
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)', marginBottom: '12px' }}>
                  Learn more about seasons, budget tiers, and local attractions in {trip.destination_title}.
                </p>
                <Link to={`/destinations/${trip.destination_id}`} className="btn btn-outline btn-sm" style={{ background: '#FFFFFF' }}>
                  View Destination Guide
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Itinerary"
        message={`Are you sure you want to permanently delete "${trip.title}"? All scheduled stops, likes, and comments associated with this trip will be removed.`}
        confirmLabel="Delete Trip"
        loading={deleteLoading}
        onConfirm={handleDeleteTrip}
        onCancel={() => setDeleteModalOpen(false)}
      />

      {/* Share Journey & Privacy Modal */}
      <ShareJourneyModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        trip={trip}
        onTripUpdated={(updatedTrip) => {
          setTrip((prev) => ({
            ...prev,
            ...updatedTrip
          }));
        }}
      />

      {/* Group Companions & QR Modal */}
      <GroupInviteModal
        isOpen={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        trip={trip}
        group={group}
        isOwner={isOwner}
        onGroupUpdated={fetchGroup}
      />

      {/* Media Upload Modal */}
      <MediaUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        tripId={id}
        initialMediaType={uploadModalType}
        onUploadComplete={fetchMedia}
      />

      {/* Photo Lightbox Modal */}
      <PhotoLightboxModal
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        photos={photos}
        currentIndex={lightboxIndex}
        onNavigate={setLightboxIndex}
        onDelete={async (photoId) => {
          await handleDeletePhoto(photoId);
          if (photos.length <= 1) {
            setLightboxOpen(false);
          } else if (lightboxIndex >= photos.length - 1) {
            setLightboxIndex(Math.max(0, photos.length - 2));
          }
        }}
      />
    </div>
  );
}
