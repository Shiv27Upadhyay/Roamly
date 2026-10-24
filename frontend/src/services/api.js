/**
 * Roamly Centralized API Client
 * Wraps native fetch with consistent error handling, user context headers, and query serialization.
 */

const BASE_URL = '/api';

/**
 * Core HTTP Request Wrapper
 */
async function request(endpoint, options = {}) {
  // Guard: ensure relative API endpoint to never send credentials to external origins
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    throw new Error('External origin requests are forbidden via internal api client.');
  }

  const url = `${BASE_URL}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const config = {
    method: options.method || 'GET',
    headers,
    credentials: 'include',
    ...(options.body ? { body: JSON.stringify(options.body) } : {})
  };

  try {
    const response = await fetch(url, config);
    const contentType = response.headers.get('content-type') || '';
    let result = null;

    if (contentType.includes('application/json')) {
      result = await response.json();
    } else {
      const text = await response.text();
      result = { success: response.ok, message: text };
    }

    if (!response.ok) {
      const errorMessage = result?.error || `Request failed with status ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.details = result?.details || null;
      throw error;
    }

    return result;
  } catch (err) {
    if (!err.status) {
      err.message = 'Unable to connect to the Roamly server. Please check your network or ensure the backend is running.';
      err.status = 0;
    }
    throw err;
  }
}

// ==========================================
// API Methods
// ==========================================
export const api = {
  // Authentication & Session
  loginWithGoogle: (credential) =>
    request('/auth/google', {
      method: 'POST',
      body: { credential }
    }),

  getCurrentUser: () => request('/auth/me'),

  logout: () =>
    request('/auth/logout', {
      method: 'POST'
    }),

  // Health
  getHealth: () => request('/health'),

  // Destinations
  getDestinations: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.continent) params.append('continent', filters.continent);
    if (filters.budget_tier) params.append('budget_tier', filters.budget_tier);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request(`/destinations${query}`);
  },

  getDestinationById: (id) => request(`/destinations/${id}`),

  toggleBookmark: (destinationId) =>
    request(`/destinations/${destinationId}/bookmark`, { method: 'POST' }),

  getBookmarks: () => request('/bookmarks'),

  // Trips
  getTrips: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.destination_id) params.append('destination_id', filters.destination_id);
    if (filters.user_id) params.append('user_id', filters.user_id);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request(`/trips${query}`);
  },

  getTripById: (id, token = null) => {
    const headers = token ? { 'x-share-token': token } : {};
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    return request(`/trips/${id}${query}`, { headers });
  },

  createTrip: (tripData) =>
    request('/trips', {
      method: 'POST',
      body: tripData
    }),

  updateTrip: (id, tripData) =>
    request(`/trips/${id}`, {
      method: 'PUT',
      body: tripData
    }),

  deleteTrip: (id) =>
    request(`/trips/${id}`, {
      method: 'DELETE'
    }),

  toggleTripLike: (tripId, token = null) => {
    const headers = token ? { 'x-share-token': token } : {};
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    return request(`/trips/${tripId}/like${query}`, { method: 'POST', headers });
  },

  addTripComment: (tripId, content, token = null) => {
    const headers = token ? { 'x-share-token': token } : {};
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    return request(`/trips/${tripId}/comments${query}`, {
      method: 'POST',
      headers,
      body: { content }
    });
  },

  deleteComment: (commentId) =>
    request(`/comments/${commentId}`, { method: 'DELETE' }),

  // Group Trips & Companions
  getTripGroup: (tripId) => request(`/trips/${tripId}/group`),

  createTripGroup: (tripId, name = null) =>
    request(`/trips/${tripId}/group`, {
      method: 'POST',
      body: name ? { name } : {}
    }),

  getTripGroupQr: (tripId, format) =>
    request(format ? `/trips/${tripId}/group/qr?format=${format}` : `/trips/${tripId}/group/qr`),

  rotateGroupInvite: (tripId) =>
    request(`/trips/${tripId}/group/invite/rotate`, {
      method: 'POST'
    }),

  updateGroupInviteStatus: (tripId, status) =>
    request(`/trips/${tripId}/group/invite/status`, {
      method: 'PATCH',
      body: { status }
    }),

  getGroupInvitationPreview: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.code) searchParams.append('code', params.code);
    if (params.token) searchParams.append('token', params.token);
    return request(`/groups/preview?${searchParams.toString()}`);
  },

  joinGroup: (joinData) =>
    request('/groups/join', {
      method: 'POST',
      body: joinData
    }),

  removeGroupMember: (tripId, userId) =>
    request(`/trips/${tripId}/group/members/${userId}`, {
      method: 'DELETE'
    }),

  // Trip Media (Photos & Videos)
  getTripMedia: (tripId, options = {}) => {
    const searchParams = new URLSearchParams();
    if (options.type) searchParams.append('type', options.type);
    if (options.token) searchParams.append('token', options.token);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';

    const headers = {};
    if (options.token) {
      headers['x-share-token'] = options.token;
    }

    return request(`/trips/${tripId}/media${query}`, { headers });
  },

  getMediaUploadSignature: (tripId, mediaType) => {
    const resolvedType = typeof mediaType === 'string'
      ? mediaType
      : (mediaType?.media_type || mediaType?.mediaType || (mediaType?.resourceType === 'video' ? 'video' : 'photo'));
    return request(`/trips/${tripId}/media/signature`, {
      method: 'POST',
      body: { media_type: resolvedType }
    });
  },

  registerTripMedia: (tripId, mediaData) => {
    const payload = {
      media_type: mediaData.media_type || mediaData.mediaType,
      public_id: mediaData.public_id || mediaData.publicId,
      secure_url: mediaData.secure_url || mediaData.secureUrl,
      format: mediaData.format,
      bytes: mediaData.bytes,
      width: mediaData.width,
      height: mediaData.height,
      duration: mediaData.duration,
      caption: mediaData.caption
    };
    return request(`/trips/${tripId}/media`, {
      method: 'POST',
      body: payload
    });
  },

  deleteTripMedia: (tripId, mediaId) =>
    request(`/trips/${tripId}/media/${mediaId}`, {
      method: 'DELETE'
    }),

  // Profile
  getProfile: (userId = null) => {
    const endpoint = userId ? `/profile/${userId}` : '/profile';
    return request(endpoint);
  }
};

/**
 * Direct client-to-Cloudinary signed file uploader.
 * Uses native XMLHttpRequest to deliver real byte-level progress events.
 */
export function uploadFileToCloudinary(file, signatureData, optionsOrProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/${signatureData.resourceType}/upload`;

    xhr.open('POST', url);

    const progressCallback = typeof optionsOrProgress === 'function'
      ? optionsOrProgress
      : optionsOrProgress?.onProgress;

    if (xhr.upload && typeof progressCallback === 'function') {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          progressCallback(percent, e.loaded, e.total);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          resolve(res);
        } catch {
          reject(new Error('Invalid JSON response received from media storage.'));
        }
      } else {
        try {
          const errRes = JSON.parse(xhr.responseText);
          reject(new Error(errRes.error?.message || `Upload failed with status ${xhr.status}`));
        } catch {
          reject(new Error(`Media upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during media upload. Please check your internet connection.'));
    };

    xhr.onabort = () => {
      reject(new Error('Upload was cancelled.'));
    };

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', signatureData.apiKey);
    formData.append('timestamp', String(signatureData.timestamp));
    formData.append('signature', signatureData.signature);
    formData.append('folder', signatureData.folder);

    xhr.send(formData);
  });
}
