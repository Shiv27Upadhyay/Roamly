import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Search, Compass, X } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import TripCard from '../components/common/TripCard';
import { GridSkeleton } from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import ErrorBanner from '../components/common/ErrorBanner';

export default function TripsPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const fetchTrips = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (search.trim()) filters.search = search.trim();
      const res = await api.getTrips(filters);
      setTrips(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load itineraries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTrips();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, user]);

  return (
    <div className="container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-16)' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        <div>
          <span className="eyebrow" style={{ color: 'var(--color-terracotta)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>
            Itineraries &amp; Journals
          </span>
          <h1>Community Trips</h1>
          <p className="lead" style={{ maxWidth: '640px' }}>
            Explore collaborative journeys, day-by-day stops, budget allocations, and travel reflections.
          </p>
        </div>

        <Link to="/trips/new" className="btn btn-primary">
          <PlusCircle size={18} />
          <span>Plan a New Trip</span>
        </Link>
      </div>

      {/* Search Bar */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-4) var(--space-5)',
        marginBottom: 'var(--space-8)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <Search size={18} color="var(--color-ink-muted)" />
        <input
          type="text"
          placeholder="Filter trips by title, destination, or journal notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input"
          style={{ border: 'none', boxShadow: 'none', padding: '6px 0', fontSize: '0.95rem' }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ color: 'var(--color-ink-muted)' }}>
            <X size={16} />
          </button>
        )}
      </div>

      <ErrorBanner message={error} onRetry={fetchTrips} />

      {/* Trips Grid */}
      {loading ? (
        <GridSkeleton count={6} />
      ) : trips.length === 0 ? (
        <EmptyState
          icon={Compass}
          title={search ? 'No trips match your search' : 'No itineraries published yet'}
          description={search ? 'Try clearing your search query or looking for another keyword.' : 'Be the pioneer! Create and publish your dream travel itinerary.'}
          action={
            search ? (
              <button onClick={() => setSearch('')} className="btn btn-outline btn-sm">
                Clear search
              </button>
            ) : (
              <Link to="/trips/new" className="btn btn-primary btn-sm">
                Plan a Trip Now
              </Link>
            )
          }
        />
      ) : (
        <>
          <div style={{ marginBottom: 'var(--space-4)', fontSize: '0.875rem', color: 'var(--color-ink-muted)' }}>
            Showing <strong>{trips.length}</strong> {trips.length === 1 ? 'itinerary' : 'itineraries'}
          </div>
          <div className="grid-trips">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
