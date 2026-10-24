import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import CinematicDestinationExperience from '../components/home/CinematicDestinationExperience';
import DestinationCard from '../components/common/DestinationCard';
import { GridSkeleton } from '../components/common/LoadingSkeleton';
import ErrorBanner from '../components/common/ErrorBanner';

export default function MostLovedPage() {
  const [destinations, setDestinations] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [destsRes, tripsRes] = await Promise.all([
        api.getDestinations(),
        api.getTrips()
      ]);
      setDestinations(destsRes.data || []);
      setTrips(tripsRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load destinations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="most-loved-page">
      {/* Interactive Cinematic Stage (Dedicated Page Mode: Full-viewport sticky stage within scroll track) */}
      <CinematicDestinationExperience
        mode="page"
        destinations={destinations}
        trips={trips}
        loading={loading}
      />

      {/* Catalog Highlights Section */}
      <div className="container" id="destination-catalog" style={{ paddingTop: 'var(--space-16)', paddingBottom: 'var(--space-20)' }}>
        <ErrorBanner message={error} onRetry={fetchData} />

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 'var(--space-8)' }}>
          <div>
            <span className="eyebrow" style={{ color: 'var(--color-terracotta)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>
              All Sanctuaries
            </span>
            <h2>Explore Full Destination Catalog</h2>
            <p style={{ maxWidth: '560px' }}>
              Handpicked places celebrated for character, artisan heritage, breathtaking landscapes, and distinctive regional dining.
            </p>
          </div>
          <Link to="/destinations" className="btn btn-outline btn-sm">
            <span>Filter All {destinations.length} Destinations</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        {loading ? (
          <GridSkeleton count={4} />
        ) : (
          <div className="grid-destinations">
            {destinations.map((dest) => (
              <DestinationCard key={dest.id} destination={dest} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
