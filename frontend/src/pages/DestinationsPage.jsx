import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Compass, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import DestinationCard from '../components/common/DestinationCard';
import { GridSkeleton } from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import ErrorBanner from '../components/common/ErrorBanner';

const CONTINENTS = ['All', 'Europe', 'Asia', 'Americas', 'Africa', 'Oceania'];
const BUDGET_TIERS = [
  { label: 'All Budgets', value: 'All' },
  { label: '₹ Budget', value: '$' },
  { label: '₹₹ Moderate', value: '$$' },
  { label: '₹₹₹ Luxury', value: '$$$' }
];

export default function DestinationsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSearch = searchParams.get('search') || '';
  const initialContinent = searchParams.get('continent') || 'All';
  const initialBudget = searchParams.get('budget_tier') || 'All';

  const [search, setSearch] = useState(initialSearch);
  const [continent, setContinent] = useState(initialContinent);
  const [budgetTier, setBudgetTier] = useState(initialBudget);

  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDestinations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (search.trim()) filters.search = search.trim();
      if (continent !== 'All') filters.continent = continent;
      if (budgetTier !== 'All') filters.budget_tier = budgetTier;

      const res = await api.getDestinations(filters);
      setDestinations(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch destinations.');
    } finally {
      setLoading(false);
    }
  }, [search, continent, budgetTier, user]);

  useEffect(() => {
    fetchDestinations();

    // Sync state to URL search params
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (continent !== 'All') params.set('continent', continent);
    if (budgetTier !== 'All') params.set('budget_tier', budgetTier);
    setSearchParams(params, { replace: true });
  }, [search, continent, budgetTier, fetchDestinations, setSearchParams]);

  const handleClearFilters = () => {
    setSearch('');
    setContinent('All');
    setBudgetTier('All');
  };

  const hasActiveFilters = search.trim() !== '' || continent !== 'All' || budgetTier !== 'All';

  return (
    <div className="container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-16)' }}>
      {/* Page Header */}
      <div className="page-header">
        <span className="eyebrow">Worldwide Discovery</span>
        <h1>Curated Destinations</h1>
        <p className="lead">
          Explore sanctuaries of architecture, culinary mastery, untouched fjords, and contemplative landscapes.
        </p>
      </div>

      {/* Search & Filter Toolbar */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-6)',
        marginBottom: 'var(--space-8)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Search Input Row */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
          <div style={{
            position: 'relative',
            flex: 1,
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search size={18} color="var(--color-ink-muted)" style={{ position: 'absolute', left: '12px' }} />
            <input
              type="text"
              placeholder="Search by destination name, country, highlights, or tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '38px', height: '44px' }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: '12px', color: 'var(--color-ink-muted)' }}
                aria-label="Clear search text"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills: Continents & Budgets */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-6)', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Continent Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-ink-muted)', marginRight: '4px' }}>
              Region:
            </span>
            {CONTINENTS.map((c) => (
              <button
                key={c}
                onClick={() => setContinent(c)}
                className={`filter-pill ${continent === c ? 'active' : ''}`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Budget Tier Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-ink-muted)', marginRight: '4px' }}>
              Budget:
            </span>
            {BUDGET_TIERS.map((b) => (
              <button
                key={b.value}
                onClick={() => setBudgetTier(b.value)}
                className={`filter-pill ${budgetTier === b.value ? 'active' : ''}`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status / Clear Filter Bar */}
        {hasActiveFilters && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 'var(--space-4)',
            paddingTop: 'var(--space-3)',
            borderTop: '1px solid var(--color-border)',
            fontSize: '0.875rem'
          }}>
            <span style={{ color: 'var(--color-ink-muted)' }}>
              Filtering active • Found {destinations.length} matching destinations
            </span>
            <button
              onClick={handleClearFilters}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--color-terracotta)',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              <X size={14} />
              <span>Reset all filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
      <ErrorBanner message={error} onRetry={fetchDestinations} />

      {/* Content Grid */}
      {loading ? (
        <GridSkeleton count={8} />
      ) : destinations.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No destinations match your criteria"
          description="We couldn't find any destinations matching your current combination of keywords and filters."
          action={
            <button onClick={handleClearFilters} className="btn btn-outline btn-sm">
              Clear filters and view all destinations
            </button>
          }
        />
      ) : (
        <>
          <div style={{ marginBottom: 'var(--space-4)', fontSize: '0.875rem', color: 'var(--color-ink-muted)' }}>
            Showing <strong>{destinations.length}</strong> {destinations.length === 1 ? 'destination' : 'destinations'}
          </div>
          <div className="grid-destinations">
            {destinations.map((dest) => (
              <DestinationCard key={dest.id} destination={dest} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
