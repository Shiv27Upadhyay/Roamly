/**
 * Roamly Cloudinary Media Service Configuration
 * Centralized signature generation, asset management, and secure delivery URLs.
 */

const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');

// Global configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
  secure: true
});

/**
 * File size and type constraints
 */
const MEDIA_LIMITS = {
  photo: {
    maxBytes: 10 * 1024 * 1024, // 10 MB
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
    resourceType: 'image'
  },
  video: {
    maxBytes: 100 * 1024 * 1024, // 100 MB
    maxDurationSeconds: 180, // 3 minutes
    allowedFormats: ['mp4', 'mov', 'webm'],
    resourceType: 'video'
  }
};

/**
 * Returns true if Cloudinary environment credentials are fully provided.
 */
function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * Asserts Cloudinary credentials are configured.
 */
function assertCloudinaryConfigured() {
  if (!isCloudinaryConfigured()) {
    const error = new Error('Cloudinary media storage is not configured on the server. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the environment.');
    error.status = 503;
    throw error;
  }
}

/**
 * Generates high-entropy folder namespace for trip assets.
 * For private/unlisted trips, incorporates random salt to ensure URLs cannot be enumerated.
 */
function buildTripFolder(tripId, mediaType, privacySalt = '') {
  const salt = privacySalt ? privacySalt.slice(0, 16) : 'public';
  return `roamly/trips/${tripId}/${salt}/${mediaType}s`;
}

/**
 * Generates an HMAC-SHA256 signature for direct client-to-Cloudinary upload.
 * Keeps CLOUDINARY_API_SECRET strictly on the server.
 */
function generateUploadSignature({ tripId, mediaType, privacySalt = '' }) {
  assertCloudinaryConfigured();

  const limits = MEDIA_LIMITS[mediaType];
  if (!limits) {
    const error = new Error(`Unsupported media type '${mediaType}'. Allowed: 'photo' or 'video'.`);
    error.status = 400;
    throw error;
  }

  const timestamp = Math.round(new Date().getTime() / 1000);
  const folder = buildTripFolder(tripId, mediaType, privacySalt);

  // Parameters to sign (Cloudinary signs all parameters alphabetically)
  const paramsToSign = {
    folder,
    timestamp
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET
  );

  return {
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
    resourceType: limits.resourceType,
    maxBytes: limits.maxBytes,
    maxDurationSeconds: limits.maxDurationSeconds || null,
    allowedFormats: limits.allowedFormats
  };
}

/**
 * Generates a signed, secure delivery URL for a Cloudinary public ID.
 */
function generateSignedDeliveryUrl(publicId, { resourceType = 'image', transformation = {} } = {}) {
  if (!isCloudinaryConfigured()) {
    return `https://res.cloudinary.com/roamly-mock/${resourceType}/upload/${publicId}`;
  }

  return cloudinary.url(publicId, {
    resource_type: resourceType,
    secure: true,
    sign_url: true,
    ...transformation
  });
}

/**
 * Generates an optimized thumbnail or video poster URL.
 */
function generateThumbnailUrl(publicId, { resourceType = 'image' } = {}) {
  if (resourceType === 'video') {
    return generateSignedDeliveryUrl(publicId, {
      resourceType: 'video',
      transformation: {
        format: 'jpg',
        transformation: [
          { width: 640, height: 360, crop: 'fill', quality: 'auto' }
        ]
      }
    });
  }

  return generateSignedDeliveryUrl(publicId, {
    resourceType: 'image',
    transformation: {
      transformation: [
        { width: 600, height: 600, crop: 'fill', quality: 'auto', fetch_format: 'auto' }
      ]
    }
  });
}

/**
 * Destroys an asset in Cloudinary by its public ID.
 */
async function destroyCloudinaryAsset(publicId, resourceType = 'image') {
  if (process.env.NODE_ENV === 'test' || !isCloudinaryConfigured()) {
    // Return synthetic success in test mode to avoid destructive network calls to Cloudinary
    return { result: 'ok' };
  }

  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true
  });
}

module.exports = {
  cloudinary,
  MEDIA_LIMITS,
  isCloudinaryConfigured,
  assertCloudinaryConfigured,
  buildTripFolder,
  generateUploadSignature,
  generateSignedDeliveryUrl,
  generateThumbnailUrl,
  destroyCloudinaryAsset
};
