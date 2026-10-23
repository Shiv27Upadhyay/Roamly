import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { PlusCircle, Trash2, ArrowLeft, Save, AlertCircle, Calendar, DollarSign, Layers } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ErrorBanner from '../components/common/ErrorBanner';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import TripPrivacySelector from '../components/trips/TripPrivacySelector';

const STOP_CATEGORIES = ['Culture', 'Food', 'Stay', 'Nature', 'Activity', 'Transit'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];

export default function CreateEditTripPage() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [searchParams] = useSearchParams();
  const preSelectedDestinationId = searchParams.get('destination_id');
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user, loading: authLoading, openAuthModal } = useAuth();

  // Destination options
  const [destinations, setDestinations] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    destination_id: preSelectedDestinationId ? Number(preSelectedDestinationId) : '',
    start_date: '',
    end_date: '',
    currency: 'USD',
    estimated_budget: '',
    cover_image: '',
    notes: '',
    visibility: 'public'
  });

  // Dynamic Stops State
  const [stops, setStops] = useState([
    { day_number: 1, place_name: '', category: 'Culture', cost: '', notes: '' }
  ]);

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  // 1. Fetch available destinations
  useEffect(() => {
    async function loadDestinations() {
      try {
        const res = await api.getDestinations();
        setDestinations(res.data || []);
      } catch (err) {
        console.error('Failed to load destination dropdown:', err);
      }
    }
    loadDestinations();
  }, []);

  // 2. Fetch existing trip data if in Edit Mode
  useEffect(() => {
    if (!isEditMode) return;

    async function loadTripForEdit() {
      setLoading(true);
      try {
        const res = await api.getTripById(id);
        const t = res.data;

        // Verify ownership
        if (t.user_id !== user?.id && !t.is_owner) {
          setServerError('Forbidden: You can only edit itineraries you authored.');
          return;
        }

        setFormData({
          title: t.title || '',
          destination_id: t.destination_id || '',
          start_date: t.start_date || '',
          end_date: t.end_date || '',
          currency: t.currency || 'USD',
          estimated_budget: t.estimated_budget !== undefined ? String(t.estimated_budget) : '',
          cover_image: t.cover_image || '',
          notes: t.notes || '',
          visibility: t.visibility || 'public'
        });

        if (Array.isArray(t.stops) && t.stops.length > 0) {
          setStops(
            t.stops.map((s) => ({
              day_number: s.day_number || 1,
              place_name: s.place_name || '',
              category: s.category || 'Culture',
              cost: s.cost !== undefined ? String(s.cost) : '',
              notes: s.notes || ''
            }))
          );
        }
      } catch (err) {
        setServerError(err.message || 'Failed to load trip for editing.');
      } finally {
        setLoading(false);
      }
    }

    loadTripForEdit();
  }, [id, isEditMode, user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Stop handlers
  const handleAddStop = () => {
    const nextDay = stops.length > 0 ? (Number(stops[stops.length - 1].day_number) || 1) : 1;
    setStops((prev) => [
      ...prev,
      { day_number: nextDay, place_name: '', category: 'Food', cost: '', notes: '' }
    ]);
  };

  const handleRemoveStop = (index) => {
    setStops((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleStopChange = (index, field, value) => {
    setStops((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Client-side Validation
  const validateForm = () => {
    const errs = {};

    if (!formData.title || formData.title.trim().length < 3) {
      errs.title = 'Title must be at least 3 characters long.';
    } else if (formData.title.trim().length > 120) {
      errs.title = 'Title cannot exceed 120 characters.';
    }

    if (!formData.start_date) {
      errs.start_date = 'Start date is required.';
    }

    if (!formData.end_date) {
      errs.end_date = 'End date is required.';
    }

    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      errs.end_date = 'End date cannot precede start date.';
    }

    if (formData.estimated_budget && Number(formData.estimated_budget) < 0) {
      errs.estimated_budget = 'Budget cannot be negative.';
    }

    // Check stops
    stops.forEach((stop, idx) => {
      if (stop.place_name && stop.place_name.trim().length === 0) {
        errs[`stop_${idx}`] = 'Place name cannot be empty.';
      }
      if (stop.cost && Number(stop.cost) < 0) {
        errs[`stop_cost_${idx}`] = 'Cost cannot be negative.';
      }
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!user) {
      openAuthModal('Sign in with Google to save and publish your itinerary.');
      return;
    }

    if (!validateForm()) {
      addToast('Please resolve the validation errors.', 'error');
      return;
    }

    setSubmitting(true);

    const payload = {
      title: formData.title.trim(),
      destination_id: formData.destination_id ? Number(formData.destination_id) : null,
      start_date: formData.start_date,
      end_date: formData.end_date,
      currency: formData.currency,
      estimated_budget: formData.estimated_budget ? Number(formData.estimated_budget) : 0,
      cover_image: formData.cover_image ? formData.cover_image.trim() : null,
      notes: formData.notes ? formData.notes.trim() : null,
      visibility: formData.visibility || 'public',
      stops: stops
        .filter((s) => s.place_name && s.place_name.trim() !== '')
        .map((s, idx) => ({
          day_number: parseInt(s.day_number, 10) || 1,
          place_name: s.place_name.trim(),
          category: s.category || 'Culture',
          cost: s.cost ? Number(s.cost) : 0,
          notes: s.notes ? s.notes.trim() : null,
          sort_order: idx + 1
        }))
    };

    try {
      let savedTrip;
      if (isEditMode) {
        const res = await api.updateTrip(id, payload);
        savedTrip = res.data;
        addToast(`Itinerary "${savedTrip.title}" updated successfully!`, 'success');
      } else {
        const res = await api.createTrip(payload);
        savedTrip = res.data;
        addToast(`Itinerary "${savedTrip.title}" published!`, 'success');
      }

      navigate(`/trips/${savedTrip.id}`);
    } catch (err) {
      if (err.status === 401) {
        openAuthModal('Your session has expired. Please sign in to save your trip.');
        return;
      }
      const msg = err.details ? err.details.join(' ') : err.message;
      setServerError(msg || 'Failed to save itinerary.');
      addToast('Error saving trip. Check the form fields.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="container" style={{ paddingTop: 'var(--space-12)', textAlign: 'center' }}>
        <p>Loading itinerary details...</p>
      </div>
    );
  }

  if (isEditMode && !user) {
    return (
      <div className="container-narrow" style={{ paddingTop: 'var(--space-12)', textAlign: 'center' }}>
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-10) var(--space-8)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h2>Sign In to Edit Itinerary</h2>
          <p style={{ color: 'var(--color-ink-muted)', margin: '16px 0 24px' }}>
            You must be signed in as the itinerary author to make changes.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleSignInButton text="signin_with" theme="outline" size="large" shape="pill" width={260} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-narrow" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-20)' }}>
      {/* Back Link */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Link
          to={isEditMode ? `/trips/${id}` : '/trips'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--color-ink-muted)' }}
        >
          <ArrowLeft size={16} />
          <span>{isEditMode ? 'Cancel and return to trip' : 'Back to Itineraries'}</span>
        </Link>
      </div>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <span className="eyebrow">{isEditMode ? 'Itinerary Studio' : 'New Journey'}</span>
        <h1>{isEditMode ? 'Edit Travel Itinerary' : 'Plan a New Travel Itinerary'}</h1>
        <p className="lead">
          {isEditMode
            ? 'Refine your scheduled stops, adjust planned expenses, or update traveler journal notes.'
            : 'Assemble places to visit, organize dates, allocate budgets, and share your journey.'}
        </p>
      </div>

      <ErrorBanner message={serverError} />

      {/* Main Form */}
      <form onSubmit={handleSubmit}>
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-8)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: 'var(--space-8)'
        }}>
          <h3 style={{ fontSize: '1.35rem', marginBottom: 'var(--space-5)', paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' }}>
            1. Journey Overview
          </h3>

          {/* Title */}
          <div className="form-group">
            <label htmlFor="title" className="form-label">
              Trip Title <span className="required-star">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              className={`form-input ${errors.title ? 'has-error' : ''}`}
              placeholder="e.g. Autumn Light & Kaiseki in Kyoto"
              value={formData.title}
              onChange={handleInputChange}
            />
            {errors.title && <div className="form-error">{errors.title}</div>}
          </div>

          {/* Destination Selector */}
          <div className="form-group">
            <label htmlFor="destination_id" className="form-label">
              Destination Location
            </label>
            <select
              id="destination_id"
              name="destination_id"
              className="form-select"
              value={formData.destination_id}
              onChange={handleInputChange}
            >
              <option value="">-- Select a Curated Destination (Optional) --</option>
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}, {d.country} ({d.continent})
                </option>
              ))}
            </select>
            <span className="form-hint">Associating a destination links photo guides and community recommendations.</span>
          </div>

          {/* Dates Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label htmlFor="start_date" className="form-label">
                Start Date <span className="required-star">*</span>
              </label>
              <input
                id="start_date"
                name="start_date"
                type="date"
                className={`form-input ${errors.start_date ? 'has-error' : ''}`}
                value={formData.start_date}
                onChange={handleInputChange}
              />
              {errors.start_date && <div className="form-error">{errors.start_date}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="end_date" className="form-label">
                End Date <span className="required-star">*</span>
              </label>
              <input
                id="end_date"
                name="end_date"
                type="date"
                className={`form-input ${errors.end_date ? 'has-error' : ''}`}
                value={formData.end_date}
                onChange={handleInputChange}
              />
              {errors.end_date && <div className="form-error">{errors.end_date}</div>}
            </div>
          </div>

          {/* Budget & Currency */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label htmlFor="estimated_budget" className="form-label">
                Estimated Overall Budget
              </label>
              <input
                id="estimated_budget"
                name="estimated_budget"
                type="number"
                min="0"
                step="50"
                className={`form-input ${errors.estimated_budget ? 'has-error' : ''}`}
                placeholder="e.g. 2500"
                value={formData.estimated_budget}
                onChange={handleInputChange}
              />
              {errors.estimated_budget && <div className="form-error">{errors.estimated_budget}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="currency" className="form-label">
                Currency
              </label>
              <select
                id="currency"
                name="currency"
                className="form-select"
                value={formData.currency}
                onChange={handleInputChange}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cover Photo URL */}
          <div className="form-group">
            <label htmlFor="cover_image" className="form-label">
              Cover Image URL (Optional)
            </label>
            <input
              id="cover_image"
              name="cover_image"
              type="url"
              className="form-input"
              placeholder="https://images.unsplash.com/..."
              value={formData.cover_image}
              onChange={handleInputChange}
            />
            <span className="form-hint">Leave blank to inherit the selected destination's photography.</span>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label htmlFor="notes" className="form-label">
              Traveler’s Journal &amp; Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows="3"
              className="form-textarea"
              placeholder="Outline the inspiration, packing notes, pacing, or seasonal considerations for this journey..."
              value={formData.notes}
              onChange={handleInputChange}
            />
          </div>

          {/* Privacy & Visibility Selector */}
          <TripPrivacySelector
            value={formData.visibility}
            onChange={(newVis) => setFormData((prev) => ({ ...prev, visibility: newVis }))}
            disabled={submitting}
          />
        </div>

        {/* 2. Dynamic Stops Section */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-8)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: 'var(--space-8)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)', paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <h3 style={{ fontSize: '1.35rem', margin: 0 }}>2. Itinerary Stops &amp; Activities</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-muted)', margin: '2px 0 0' }}>
                Add scheduled temple walks, trattorias, boutique stays, or mountain paths.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddStop}
              className="btn btn-sand btn-sm"
            >
              <PlusCircle size={15} />
              <span>Add Stop</span>
            </button>
          </div>

          {/* Stops List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {stops.map((stop, index) => (
              <div
                key={index}
                style={{
                  background: 'var(--color-sand)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px',
                  display: 'grid',
                  gridTemplateColumns: '80px 1.5fr 1fr 100px 36px',
                  gap: '12px',
                  alignItems: 'center'
                }}
              >
                {/* Day */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '2px' }}>
                    Day #
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    style={{ padding: '6px 8px', height: '36px' }}
                    value={stop.day_number}
                    onChange={(e) => handleStopChange(index, 'day_number', e.target.value)}
                  />
                </div>

                {/* Place Name */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '2px' }}>
                    Place / Activity Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Fushimi Inari Sunrise"
                    className="form-input"
                    style={{ padding: '6px 8px', height: '36px' }}
                    value={stop.place_name}
                    onChange={(e) => handleStopChange(index, 'place_name', e.target.value)}
                  />
                </div>

                {/* Category */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '2px' }}>
                    Category
                  </label>
                  <select
                    className="form-select"
                    style={{ padding: '6px 8px', height: '36px' }}
                    value={stop.category}
                    onChange={(e) => handleStopChange(index, 'category', e.target.value)}
                  >
                    {STOP_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Cost */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '2px' }}>
                    Cost ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    className="form-input"
                    style={{ padding: '6px 8px', height: '36px' }}
                    value={stop.cost}
                    onChange={(e) => handleStopChange(index, 'cost', e.target.value)}
                  />
                </div>

                {/* Delete Stop */}
                <div style={{ paddingTop: '16px' }}>
                  <button
                    type="button"
                    onClick={() => handleRemoveStop(index)}
                    className="btn-icon"
                    style={{ color: 'var(--color-danger)', padding: '6px' }}
                    title="Remove this stop"
                    aria-label="Remove stop"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '16px' }}>
            <button
              type="button"
              onClick={handleAddStop}
              className="btn btn-outline btn-sm"
            >
              <PlusCircle size={15} />
              <span>Add Another Stop</span>
            </button>
          </div>
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
          <Link to={isEditMode ? `/trips/${id}` : '/trips'} className="btn btn-outline">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ minWidth: '180px' }}
          >
            <Save size={16} />
            <span>{submitting ? 'Saving Itinerary...' : isEditMode ? 'Update Itinerary' : 'Publish Itinerary'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
