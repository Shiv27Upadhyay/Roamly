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

  // Profile
  getProfile: (userId = null) => {
    const endpoint = userId ? `/profile/${userId}` : '/profile';
    return request(endpoint);
  }
};
