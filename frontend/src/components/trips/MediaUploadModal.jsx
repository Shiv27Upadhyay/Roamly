import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  UploadCloud,
  Image as ImageIcon,
  Video as VideoIcon,
  AlertCircle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Loader2,
  FileText
} from 'lucide-react';
import { api, uploadFileToCloudinary } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_VIDEO_SECONDS = 180; // 3 minutes

const ALLOWED_PHOTO_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'heic'];
const ALLOWED_VIDEO_EXTS = ['mp4', 'mov', 'webm'];

/**
 * Extracts lowercase file extension without dot.
 */
function getExtension(filename = '') {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

/**
 * Formats bytes to human-readable size.
 */
function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Formats duration seconds to mm:ss.
 */
function formatDuration(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function MediaUploadModal({
  isOpen,
  onClose,
  tripId,
  initialMediaType = 'photo',
  onUploadComplete
}) {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState(initialMediaType); // 'photo' | 'video'
  const [fileQueue, setFileQueue] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef(null);
  const queueRef = useRef(fileQueue);

  useEffect(() => {
    queueRef.current = fileQueue;
  }, [fileQueue]);

  // Sync tab if initialMediaType prop changes on open
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMediaType);
      setFileQueue([]);
    }
  }, [isOpen, initialMediaType]);

  // Clean up object URLs on unmount or modal close
  useEffect(() => {
    return () => {
      queueRef.current.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  // Keyboard escape listener (when not actively uploading)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isUploading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isUploading, onClose]);

  if (!isOpen) return null;

  /**
   * Helper to inspect video duration via client-side video element
   */
  const probeVideoDuration = (file) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      const objUrl = URL.createObjectURL(file);
      video.src = objUrl;

      video.onloadedmetadata = () => {
        const dur = video.duration;
        URL.revokeObjectURL(objUrl);
        resolve(dur);
      };

      video.onerror = () => {
        URL.revokeObjectURL(objUrl);
        reject(new Error('Could not read video metadata. Please check the video format.'));
      };
    });
  };

  /**
   * Validates and prepares files to be queued
   */
  const handleAddFiles = async (rawFiles) => {
    if (!rawFiles || rawFiles.length === 0) return;

    const fileList = Array.from(rawFiles);
    const newItems = [];

    if (activeTab === 'video') {
      // Single video upload flow
      const file = fileList[0];
      const ext = getExtension(file.name);

      if (!ALLOWED_VIDEO_EXTS.includes(ext)) {
        addToast(`Unsupported video format (.${ext}). Allowed: MP4, MOV, WEBM.`, 'error');
        return;
      }

      if (file.size > MAX_VIDEO_BYTES) {
        addToast(
          `Video exceeds maximum allowed size of 100 MB (${formatBytes(file.size)}).`,
          'error'
        );
        return;
      }

      let duration = 0;
      try {
        duration = await probeVideoDuration(file);
        if (duration > MAX_VIDEO_SECONDS) {
          addToast(
            `Video duration (${formatDuration(duration)}) exceeds the maximum allowed length of 180 seconds (3 minutes).`,
            'error'
          );
          return;
        }
      } catch (err) {
        addToast(err.message || 'Failed to inspect video duration.', 'error');
        return;
      }

      // Clear existing and replace with single validated video
      newItems.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        previewUrl: null,
        name: file.name,
        size: file.size,
        ext,
        duration,
        caption: '',
        status: 'ready', // 'ready' | 'uploading' | 'registering' | 'success' | 'error'
        progress: 0,
        bytesUploaded: 0,
        error: null,
        cloudinaryResult: null
      });

      setFileQueue(newItems);
    } else {
      // Multiple photos flow
      for (const file of fileList) {
        const ext = getExtension(file.name);

        if (!ALLOWED_PHOTO_EXTS.includes(ext)) {
          addToast(`File "${file.name}" skipped: unsupported format (.${ext}). Allowed: JPEG, PNG, WEBP, HEIC.`, 'error');
          continue;
        }

        if (file.size > MAX_PHOTO_BYTES) {
          addToast(`File "${file.name}" skipped: exceeds maximum 10 MB limit (${formatBytes(file.size)}).`, 'error');
          continue;
        }

        // Create preview URL for photo
        let previewUrl = null;
        try {
          previewUrl = URL.createObjectURL(file);
        } catch {
          previewUrl = null;
        }

        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          file,
          previewUrl,
          name: file.name,
          size: file.size,
          ext,
          duration: 0,
          caption: '',
          status: 'ready',
          progress: 0,
          bytesUploaded: 0,
          error: null,
          cloudinaryResult: null
        });
      }

      setFileQueue((prev) => [...prev, ...newItems]);
    }
  };

  /**
   * Drag-and-drop event handlers
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isUploading) return;

    if (e.dataTransfer && e.dataTransfer.files) {
      await handleAddFiles(e.dataTransfer.files);
    }
  };

  /**
   * Remove item from queue
   */
  const handleRemoveQueueItem = (id) => {
    if (isUploading) return;
    setFileQueue((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  /**
   * Update item caption
   */
  const handleCaptionChange = (id, caption) => {
    setFileQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, caption } : item))
    );
  };

  /**
   * Process upload for a single item
   */
  const processItemUpload = async (item) => {
    const mediaType = activeTab === 'video' ? 'video' : 'photo';

    let cloudResult = item.cloudinaryResult;

    // 1. Direct Cloudinary Upload (if not already uploaded)
    if (!cloudResult) {
      // Update item to uploading state
      setFileQueue((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, status: 'uploading', progress: 0, bytesUploaded: 0, error: null }
            : i
        )
      );

      try {
        // Fetch signed upload parameters from backend
        const sigResponse = await api.getMediaUploadSignature(tripId, mediaType);
        const signatureData = sigResponse.data;

        // Perform actual upload to Cloudinary via XMLHttpRequest with byte progress
        cloudResult = await uploadFileToCloudinary(item.file, signatureData, {
          onProgress: (percent, loaded) => {
            setFileQueue((prev) =>
              prev.map((i) =>
                i.id === item.id
                  ? { ...i, progress: percent, bytesUploaded: loaded }
                  : i
              )
            );
          }
        });

        // Store result on item
        setFileQueue((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, cloudinaryResult: cloudResult, progress: 100 }
              : i
          )
        );
      } catch (err) {
        const errorMsg = err.message || 'Direct upload to Cloudinary failed.';
        setFileQueue((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: 'error', error: errorMsg } : i
          )
        );
        return false;
      }
    }

    // 2. Register metadata with backend
    setFileQueue((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, status: 'registering', error: null } : i
      )
    );

    try {
      await api.registerTripMedia(tripId, {
        media_type: mediaType,
        public_id: cloudResult.public_id,
        secure_url: cloudResult.secure_url,
        format: cloudResult.format || item.ext,
        bytes: cloudResult.bytes || item.size,
        width: cloudResult.width || null,
        height: cloudResult.height || null,
        duration: mediaType === 'video' ? (cloudResult.duration || item.duration || null) : null,
        caption: item.caption?.trim() || null
      });

      setFileQueue((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: 'success', error: null } : i
        )
      );
      return true;
    } catch (err) {
      const errorMsg =
        `Upload succeeded to cloud storage, but registering media with the trip itinerary failed (${err.message || 'Server error'}). Please retry to link this asset.`;
      setFileQueue((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, status: 'error', error: errorMsg, cloudinaryResult: cloudResult }
            : i
        )
      );
      return false;
    }
  };

  /**
   * Start uploading all ready or errored items in queue
   */
  const handleStartUpload = async () => {
    const pendingItems = fileQueue.filter(
      (item) => item.status === 'ready' || item.status === 'error'
    );
    if (pendingItems.length === 0) return;

    setIsUploading(true);
    let successCount = 0;

    for (const item of pendingItems) {
      const success = await processItemUpload(item);
      if (success) successCount++;
    }

    setIsUploading(false);

    if (successCount > 0) {
      addToast(
        `Successfully uploaded and registered ${successCount} ${
          activeTab === 'video' ? 'video' : 'photo(s)'
        }!`,
        'success'
      );
      if (onUploadComplete) {
        onUploadComplete();
      }
    }
  };

  /**
   * Retry single item
   */
  const handleRetryItem = async (itemId) => {
    const item = fileQueue.find((i) => i.id === itemId);
    if (!item || isUploading) return;

    setIsUploading(true);
    const success = await processItemUpload(item);
    setIsUploading(false);

    if (success) {
      addToast('Asset registered successfully!', 'success');
      if (onUploadComplete) {
        onUploadComplete();
      }
    }
  };

  const allDone =
    fileQueue.length > 0 &&
    fileQueue.every((item) => item.status === 'success');
  const hasErrors = fileQueue.some((item) => item.status === 'error');
  const hasPending = fileQueue.some(
    (item) => item.status === 'ready' || item.status === 'error'
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(28, 36, 33, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={() => {
        if (!isUploading) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-upload-title"
    >
      <div
        style={{
          backgroundColor: 'var(--color-ivory)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          width: '100%',
          maxWidth: '620px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: 'var(--space-5) var(--space-6)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-sand)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-terracotta-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-terracotta)'
              }}
            >
              <UploadCloud size={20} />
            </div>
            <div>
              <h3
                id="media-upload-title"
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  margin: 0,
                  color: 'var(--color-ink)'
                }}
              >
                Upload Trip Media
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-ink-muted)' }}>
                Share memories with all trip companions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isUploading}
            style={{
              background: 'none',
              border: 'none',
              color: isUploading ? 'var(--color-border)' : 'var(--color-ink-muted)',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Close upload modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Selection (Photos vs Video) */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-ivory)'
          }}
        >
          <button
            type="button"
            disabled={isUploading || fileQueue.length > 0}
            onClick={() => {
              setActiveTab('photo');
              setFileQueue([]);
            }}
            style={{
              flex: 1,
              padding: '14px 16px',
              border: 'none',
              background: activeTab === 'photo' ? '#FFFFFF' : 'transparent',
              borderBottom: activeTab === 'photo' ? '2px solid var(--color-terracotta)' : '2px solid transparent',
              color: activeTab === 'photo' ? 'var(--color-terracotta)' : 'var(--color-ink-muted)',
              fontWeight: activeTab === 'photo' ? 600 : 500,
              fontSize: '0.95rem',
              cursor: isUploading || fileQueue.length > 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s ease'
            }}
          >
            <ImageIcon size={18} />
            <span>Photos (Multi-upload, max 10 MB)</span>
          </button>

          <button
            type="button"
            disabled={isUploading || fileQueue.length > 0}
            onClick={() => {
              setActiveTab('video');
              setFileQueue([]);
            }}
            style={{
              flex: 1,
              padding: '14px 16px',
              border: 'none',
              background: activeTab === 'video' ? '#FFFFFF' : 'transparent',
              borderBottom: activeTab === 'video' ? '2px solid var(--color-terracotta)' : '2px solid transparent',
              color: activeTab === 'video' ? 'var(--color-terracotta)' : 'var(--color-ink-muted)',
              fontWeight: activeTab === 'video' ? 600 : 500,
              fontSize: '0.95rem',
              cursor: isUploading || fileQueue.length > 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s ease'
            }}
          >
            <VideoIcon size={18} />
            <span>Video (Up to 3 min, 100 MB)</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div
          style={{
            padding: 'var(--space-6)',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-5)'
          }}
        >
          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              if (!isUploading && fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
            style={{
              border: `2px dashed ${isDragging ? 'var(--color-terracotta)' : 'var(--color-border)'}`,
              backgroundColor: isDragging ? 'var(--color-terracotta-soft)' : 'var(--color-sand)',
              borderRadius: 'var(--radius-md)',
              padding: '32px 20px',
              textAlign: 'center',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              accept={
                activeTab === 'photo'
                  ? 'image/jpeg,image/png,image/webp,image/heic,.jpg,.jpeg,.png,.webp,.heic'
                  : 'video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm'
              }
              multiple={activeTab === 'photo'}
              onChange={(e) => {
                handleAddFiles(e.target.files);
                e.target.value = '';
              }}
              disabled={isUploading}
            />

            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-terracotta)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              {activeTab === 'photo' ? <ImageIcon size={24} /> : <VideoIcon size={24} />}
            </div>

            <div>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-ink)', fontSize: '1rem' }}>
                {activeTab === 'photo'
                  ? 'Drag & drop photos here, or click to browse'
                  : 'Drag & drop video clip here, or click to browse'}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '0.825rem', color: 'var(--color-ink-muted)' }}>
                {activeTab === 'photo'
                  ? 'Supports JPG, PNG, WEBP, HEIC (up to 10 MB each)'
                  : 'Supports MP4, MOV, WEBM (up to 100 MB, max 3 minutes)'}
              </p>
            </div>
          </div>

          {/* Queued Files List */}
          {fileQueue.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--color-ink)'
                }}
              >
                <span>
                  Files selected ({fileQueue.length})
                </span>
                {!isUploading && !allDone && (
                  <button
                    type="button"
                    onClick={() => setFileQueue([])}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-danger)',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    Clear All
                  </button>
                )}
              </div>

              {fileQueue.map((item) => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Thumbnail preview */}
                    {item.previewUrl ? (
                      <img
                        src={item.previewUrl}
                        alt={item.name}
                        style={{
                          width: '48px',
                          height: '48px',
                          objectFit: 'cover',
                          borderRadius: 'var(--radius-xs)',
                          border: '1px solid var(--color-border)'
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: 'var(--radius-xs)',
                          backgroundColor: 'var(--color-sand)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--color-terracotta)'
                        }}
                      >
                        {activeTab === 'photo' ? <ImageIcon size={20} /> : <VideoIcon size={20} />}
                      </div>
                    )}

                    {/* File info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '0.9rem',
                          fontWeight: 500,
                          color: 'var(--color-ink)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {item.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-ink-muted)' }}>
                        {formatBytes(item.size)}
                        {item.duration > 0 && ` • ${formatDuration(item.duration)}`}
                      </div>
                    </div>

                    {/* Status indicator or action */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {item.status === 'ready' && !isUploading && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQueueItem(item.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-ink-muted)',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                          title="Remove file"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}

                      {item.status === 'uploading' && (
                        <span
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: 'var(--color-terracotta)',
                            fontFamily: 'var(--font-mono)'
                          }}
                        >
                          {item.progress}%
                        </span>
                      )}

                      {item.status === 'registering' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-terracotta)' }}>
                          <Loader2 size={16} className="animate-spin" />
                          <span style={{ fontSize: '0.75rem' }}>Saving...</span>
                        </div>
                      )}

                      {item.status === 'success' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-sage)' }}>
                          <CheckCircle2 size={18} />
                          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Done</span>
                        </div>
                      )}

                      {item.status === 'error' && (
                        <button
                          type="button"
                          onClick={() => handleRetryItem(item.id)}
                          disabled={isUploading}
                          style={{
                            background: 'rgba(184, 58, 46, 0.1)',
                            border: '1px solid rgba(184, 58, 46, 0.3)',
                            color: 'var(--color-danger)',
                            borderRadius: 'var(--radius-xs)',
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: isUploading ? 'not-allowed' : 'pointer'
                          }}
                          title="Retry registration or upload"
                        >
                          <RefreshCw size={12} />
                          <span>Retry</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Caption Input */}
                  {item.status !== 'success' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={14} color="var(--color-ink-muted)" />
                      <input
                        type="text"
                        placeholder="Add an optional caption (e.g. Sunset in Oia)..."
                        value={item.caption}
                        onChange={(e) => handleCaptionChange(item.id, e.target.value)}
                        disabled={item.status === 'uploading' || item.status === 'registering'}
                        style={{
                          flex: 1,
                          fontSize: '0.825rem',
                          padding: '6px 10px',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-xs)',
                          backgroundColor: 'var(--color-ivory)',
                          color: 'var(--color-ink)'
                        }}
                      />
                    </div>
                  )}

                  {/* Progress bar during upload */}
                  {item.status === 'uploading' && (
                    <div
                      style={{
                        width: '100%',
                        height: '4px',
                        backgroundColor: 'var(--color-sand)',
                        borderRadius: '2px',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${item.progress}%`,
                          backgroundColor: 'var(--color-terracotta)',
                          transition: 'width 0.1s ease'
                        }}
                      />
                    </div>
                  )}

                  {/* Error banner on failed item */}
                  {item.status === 'error' && item.error && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '6px',
                        padding: '6px 8px',
                        backgroundColor: 'rgba(184, 58, 46, 0.08)',
                        borderRadius: 'var(--radius-xs)',
                        color: 'var(--color-danger)',
                        fontSize: '0.78rem',
                        lineHeight: 1.4
                      }}
                    >
                      <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{item.error}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div
          style={{
            padding: 'var(--space-4) var(--space-6)',
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-sand)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)' }}>
            {allDone
              ? 'All files processed!'
              : hasErrors
              ? 'Some uploads require retry'
              : fileQueue.length > 0
              ? `${fileQueue.length} file(s) ready`
              : 'Select files to begin'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="btn btn-outline btn-sm"
              style={{
                backgroundColor: '#FFFFFF',
                cursor: isUploading ? 'not-allowed' : 'pointer'
              }}
            >
              {allDone ? 'Done' : 'Cancel'}
            </button>

            {hasPending && !allDone && (
              <button
                type="button"
                onClick={handleStartUpload}
                disabled={isUploading || fileQueue.length === 0}
                className="btn btn-primary btn-sm"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={16} />
                    <span>Start Upload</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
