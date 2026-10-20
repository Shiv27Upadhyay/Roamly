/**
 * Roamly Centralized API Client
 * Wraps native fetch with consistent error handling, user context headers, and query serialization.
 */

const BASE_URL = '/api';

// Current active demo user ID (defaults to Elena Rostova: ID 1)
let activeUserId = 1;

export function setActiveUserId(id) {
  activeUserId = id;
}

export function getActiveUserId() {
  return activeUserId;
}

/**
 * Core HTTP Request Wrapper
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': String(activeUserId),
    ...(options.headers || {})
  };

  const config = {
    method: options.method || 'GET',
    headers,
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
// Destinations API
// ==========================================
export const api = {
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

  getTripById: (id) => request(`/trips/${id}`),

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

  toggleTripLike: (tripId) =>
    request(`/trips/${tripId}/like`, { method: 'POST' }),

  addTripComment: (tripId, content) =>
    request(`/trips/${tripId}/comments`, {
      method: 'POST',
      body: { content }
    }),

  deleteComment: (commentId) =>
    request(`/comments/${commentId}`, { method: 'DELETE' }),

  // Profile
  getProfile: (userId = null) => {
    const endpoint = userId ? `/profile/${userId}` : '/profile';
    return request(endpoint);
  }
};
