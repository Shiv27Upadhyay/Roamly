import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Sparkles,
  Search,
  Users,
  UserCheck,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Compass,
  ArrowRight,
  X,
  Camera,
  Tag,
  Check,
  MapPin,
  Calendar,
  Heart,
  Image as ImageIcon
} from 'lucide-react';

// Sample demo trips for Smart Memories
const DEMO_TRIPS = [
  {
    id: 'kyoto',
    title: 'Autumn Reflections in Kyoto',
    destination: 'Kyoto, Japan',
    dates: 'Oct 14 – Oct 21, 2024',
    totalPhotos: 24,
    coverImage: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
    travelerIds: ['elena', 'marcus', 'sofia', 'lucas'],
    description: 'Centuries-old shrines, tranquil Zen gardens, and vermilion mountain paths in autumn foliage.'
  },
  {
    id: 'amalfi',
    title: 'Amalfi Coast Odyssey',
    destination: 'Amalfi Coast, Italy',
    dates: 'Jun 18 – Jun 25, 2024',
    totalPhotos: 18,
    coverImage: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80',
    travelerIds: ['elena', 'marcus', 'mateo'],
    description: 'Dramatic cliffside towns, azure Mediterranean vistas, fragrant lemon groves, and sunset ferry rides.'
  },
  {
    id: 'queenstown',
    title: 'Southern Alps & Fjordlands',
    destination: 'Queenstown, New Zealand',
    dates: 'Feb 12 – Feb 19, 2025',
    totalPhotos: 16,
    coverImage: 'https://images.unsplash.com/photo-1507699622108-4be3abd695ad?auto=format&fit=crop&w=800&q=80',
    travelerIds: ['elena', 'sofia', 'lucas'],
    description: 'Crystal alpine lakes, dramatic peaks, scenic glacier trails, and fiord boat excursions.'
  }
];

// Sample demo travelers catalog
const TRAVELERS_CATALOG = {
  elena: {
    id: 'elena',
    name: 'Elena Rostova',
    role: 'Trip Organizer',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
    bio: 'Itinerary curator & cultural explorer'
  },
  marcus: {
    id: 'marcus',
    name: 'Marcus Vance',
    role: 'Companion',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80',
    bio: 'Landscape enthusiast & trail navigator'
  },
  sofia: {
    id: 'sofia',
    name: 'Sofia Chen',
    role: 'Explorer',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=160&q=80',
    bio: 'Artisan craft collector & culinary seeker'
  },
  lucas: {
    id: 'lucas',
    name: 'Lucas Silva',
    role: 'Photographer',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80',
    bio: 'Golden hour specialist & visual diarist'
  },
  mateo: {
    id: 'mateo',
    name: 'Mateo Cruz',
    role: 'Adventurer',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=160&q=80',
    bio: 'Coastal hiker & boat enthusiast'
  }
};

// Coherent multi-trip demo photo dataset with explicit trip IDs and persona associations
const DEMO_TRIP_PHOTOS = [
  // --- KYOTO, JAPAN (tripId: 'kyoto') ---
  {
    id: 'k1',
    tripId: 'kyoto',
    title: 'Arashiyama Bamboo Path',
    location: 'Arashiyama, Kyoto',
    date: 'Oct 15, 2024',
    url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
    personas: ['elena', 'marcus'],
    personaLabels: ['Elena Rostova', 'Marcus Vance'],
    caption: 'Morning light filtering through the towering bamboo grove.'
  },
  {
    id: 'k2',
    tripId: 'kyoto',
    title: 'Fushimi Inari Torii Gates',
    location: 'Fushimi Ward, Kyoto',
    date: 'Oct 16, 2024',
    url: 'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?auto=format&fit=crop&w=800&q=80',
    personas: ['elena', 'sofia'],
    personaLabels: ['Elena Rostova', 'Sofia Chen'],
    caption: 'Ascending the sacred mountain paths through thousands of vermilion gates.'
  },
  {
    id: 'k3',
    tripId: 'kyoto',
    title: 'Traditional Tea Ceremony',
    location: 'Gion District, Kyoto',
    date: 'Oct 17, 2024',
    url: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=800&q=80',
    personas: ['sofia'],
    personaLabels: ['Sofia Chen'],
    caption: 'Mindful matcha preparation in a historic wooden machiya teahouse.'
  },
  {
    id: 'k4',
    tripId: 'kyoto',
    title: 'Kiyomizu-dera Veranda View',
    location: 'Higashiyama, Kyoto',
    date: 'Oct 18, 2024',
    url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
    personas: ['elena', 'marcus', 'sofia'],
    personaLabels: ['Elena Rostova', 'Marcus Vance', 'Sofia Chen'],
    caption: 'Sunset panorama over the wooden temple stage surrounded by crimson maples.'
  },
  {
    id: 'k5',
    tripId: 'kyoto',
    title: 'Philosopher’s Path Walk',
    location: 'Northern Higashiyama',
    date: 'Oct 19, 2024',
    url: 'https://images.unsplash.com/photo-1528164344705-475426879c0d?auto=format&fit=crop&w=800&q=80',
    personas: ['marcus'],
    personaLabels: ['Marcus Vance'],
    caption: 'Quiet reflections beside the stone canal under vibrant autumn foliage.'
  },
  {
    id: 'k6',
    tripId: 'kyoto',
    title: 'Kaiseki Dinner Gathering',
    location: 'Pontocho Alley, Kyoto',
    date: 'Oct 20, 2024',
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    personas: ['elena', 'marcus', 'sofia'],
    personaLabels: ['Elena Rostova', 'Marcus Vance', 'Sofia Chen'],
    caption: 'Multi-course seasonal dining celebrated with travel companions.'
  },

  // --- AMALFI COAST, ITALY (tripId: 'amalfi') ---
  {
    id: 'a1',
    tripId: 'amalfi',
    title: 'Positano Cliffside Harbor',
    location: 'Positano, Italy',
    date: 'Jun 19, 2024',
    url: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80',
    personas: ['elena', 'marcus'],
    personaLabels: ['Elena Rostova', 'Marcus Vance'],
    caption: 'Pastel houses cascading down steep limestone cliffs into the Tyrrhenian Sea.'
  },
  {
    id: 'a2',
    tripId: 'amalfi',
    title: 'Ravello Terrace of Infinity',
    location: 'Villa Cimbrone, Ravello',
    date: 'Jun 21, 2024',
    url: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80',
    personas: ['elena', 'mateo'],
    personaLabels: ['Elena Rostova', 'Mateo Cruz'],
    caption: 'Marble bust parapet offering infinite panoramic views above the Mediterranean coastline.'
  },
  {
    id: 'a3',
    tripId: 'amalfi',
    title: 'Sunset Ferry to Capri',
    location: 'Gulf of Salerno, Italy',
    date: 'Jun 22, 2024',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    personas: ['marcus', 'mateo'],
    personaLabels: ['Marcus Vance', 'Mateo Cruz'],
    caption: 'Golden hour reflections dancing on the open waters en route to the Faraglioni rocks.'
  },
  {
    id: 'a4',
    tripId: 'amalfi',
    title: 'Lemon Grove Luncheon',
    location: 'Amalfi Town, Italy',
    date: 'Jun 23, 2024',
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    personas: ['elena', 'marcus', 'mateo'],
    personaLabels: ['Elena Rostova', 'Marcus Vance', 'Mateo Cruz'],
    caption: 'Fresh handmade pasta and limoncello under shady pergolas of fragrant sfusato lemons.'
  },
  {
    id: 'a5',
    tripId: 'amalfi',
    title: 'Path of the Gods Trail',
    location: 'Bomerano to Nocelle',
    date: 'Jun 24, 2024',
    url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80',
    personas: ['mateo'],
    personaLabels: ['Mateo Cruz'],
    caption: 'High cliffside hiking along ancient donkey paths suspended between sky and sea.'
  },

  // --- QUEENSTOWN, NEW ZEALAND (tripId: 'queenstown') ---
  {
    id: 'q1',
    tripId: 'queenstown',
    title: 'Lake Wakatipu Morning Mist',
    location: 'Queenstown Bay, New Zealand',
    date: 'Feb 13, 2025',
    url: 'https://images.unsplash.com/photo-1507699622108-4be3abd695ad?auto=format&fit=crop&w=800&q=80',
    personas: ['elena', 'lucas'],
    personaLabels: ['Elena Rostova', 'Lucas Silva'],
    caption: 'Glacial blue waters reflecting the dramatic jagged ridges of the Remarkables range.'
  },
  {
    id: 'q2',
    tripId: 'queenstown',
    title: 'Milford Sound Cruise',
    location: 'Fiordland National Park',
    date: 'Feb 15, 2025',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
    personas: ['elena', 'sofia', 'lucas'],
    personaLabels: ['Elena Rostova', 'Sofia Chen', 'Lucas Silva'],
    caption: 'Sailing beneath towering vertical granite cliffs and thunderous cascading waterfalls.'
  },
  {
    id: 'q3',
    tripId: 'queenstown',
    title: 'Glenorchy Lagoon Boardwalk',
    location: 'Glenorchy, New Zealand',
    date: 'Feb 16, 2025',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    personas: ['sofia'],
    personaLabels: ['Sofia Chen'],
    caption: 'Still waters mirroring Mount Earnslaw along serene wetland boardwalk loops.'
  },
  {
    id: 'q4',
    tripId: 'queenstown',
    title: 'Ben Lomond Summit Vista',
    location: 'Ben Lomond Saddle',
    date: 'Feb 17, 2025',
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80',
    personas: ['sofia', 'lucas'],
    personaLabels: ['Sofia Chen', 'Lucas Silva'],
    caption: 'Strenuous ridge climb rewarded by 360-degree vistas across alpine basins.'
  }
];

// Sample travel interest chips
const INTEREST_CHIPS = [
  { label: 'Mountains & Alpine', icon: '🏔️', query: 'peaceful mountain hiking trails with alpine lake vistas' },
  { label: 'Coastal & Beaches', icon: '🏖️', query: 'picturesque coastal road trip with cliffside dining' },
  { label: 'Heritage & Culture', icon: '🏛️', query: 'historic temples, preservation districts, and artisan crafts' },
  { label: 'Budget Getaways', icon: '💰', query: 'budget-friendly destinations under $1,200 total estimated spend' },
  { label: 'Culinary Traditions', icon: '🍜', query: 'renowned street markets and traditional tasting experiences' },
  { label: 'Nature & Escapes', icon: '🌿', query: 'quiet forest walks, scenic hot springs, and tranquil landscapes' }
];

// Example search prompts
const EXAMPLE_PROMPTS = [
  'Quiet 5-day cultural trip to Japan with historic temples and great matcha',
  'Mediterranean coastal road trip with cliffside views under $1,800',
  'Alpine hiking getaway with panoramic mountain trails and lake viewpoints',
  'Vibrant culinary escape exploring authentic street markets and local cafes'
];

// Illustrative destination results for Smart Search preview
const ILLUSTRATIVE_DESTINATIONS = [
  {
    id: 1,
    name: 'Kyoto, Japan',
    continent: 'Asia',
    budgetTier: '$$',
    bestSeason: 'Autumn (Oct–Nov)',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80',
    matchScore: '98% Match',
    reasoning: 'Matches historic shrines, quiet tea houses, and scenic bamboo walks from your prompt.'
  },
  {
    id: 2,
    name: 'Amalfi Coast, Italy',
    continent: 'Europe',
    budgetTier: '$$$',
    bestSeason: 'Late Spring & Summer',
    image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=600&q=80',
    matchScore: '94% Match',
    reasoning: 'Matches dramatic cliffside drives, azure ocean views, and fresh Mediterranean cuisine.'
  },
  {
    id: 3,
    name: 'Oaxaca, Mexico',
    continent: 'Americas',
    budgetTier: '$',
    bestSeason: 'Dry Season (Nov–Apr)',
    image: 'https://images.unsplash.com/photo-1512813195386-6cf811ad3542?auto=format&fit=crop&w=600&q=80',
    matchScore: '91% Match',
    reasoning: 'Matches renowned regional gastronomy, indigenous artisanal crafts, and vibrant plazas.'
  },
  {
    id: 6,
    name: 'Queenstown, New Zealand',
    continent: 'Oceania',
    budgetTier: '$$',
    bestSeason: 'Summer & Autumn',
    image: 'https://images.unsplash.com/photo-1507699622108-4be3abd695ad?auto=format&fit=crop&w=600&q=80',
    matchScore: '89% Match',
    reasoning: 'Matches alpine walking paths, turquoise glacier waters, and tranquil outdoor escapes.'
  }
];

export default function SmartFeaturesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'search' ? 'search' : 'memories';

  // State for Smart Memories concept
  const [selectedTripId, setSelectedTripId] = useState('kyoto');
  const [selectedTravelerId, setSelectedTravelerId] = useState('all');

  // State for Smart Search concept
  const [searchQuery, setSearchQuery] = useState('');
  const [activeInterest, setActiveInterest] = useState('');

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
  };

  const handleSelectPrompt = (prompt) => {
    setSearchQuery(prompt);
    setActiveInterest('');
  };

  const handleSelectInterest = (chip) => {
    setActiveInterest(chip.label);
    setSearchQuery(chip.query);
  };

  // Safe trip lookup with fallback
  const selectedTrip = DEMO_TRIPS.find((t) => t.id === selectedTripId) || DEMO_TRIPS[0];

  const handleTripChange = (tripId) => {
    setSelectedTripId(tripId);
    const newTrip = DEMO_TRIPS.find((t) => t.id === tripId);
    // If the currently selected traveler is not on the new trip, reset to 'all'
    if (selectedTravelerId !== 'all' && newTrip && !newTrip.travelerIds.includes(selectedTravelerId)) {
      setSelectedTravelerId('all');
    }
  };

  const handleTravelerChange = (travelerId) => {
    setSelectedTravelerId(travelerId);
  };

  // Travelers available for the current trip
  const currentTripTravelers = (selectedTrip?.travelerIds || [])
    .map((id) => TRAVELERS_CATALOG[id])
    .filter(Boolean);

  const selectedTraveler = selectedTravelerId === 'all'
    ? null
    : TRAVELERS_CATALOG[selectedTravelerId];

  // Filter photos strictly within the selected trip and selected traveler
  const matchingPhotos = DEMO_TRIP_PHOTOS.filter((photo) => {
    if (photo.tripId !== selectedTripId) return false;
    if (selectedTravelerId === 'all') return true;
    return photo.personas.includes(selectedTravelerId);
  });

  return (
    <div style={{ paddingBottom: 'var(--space-20)' }}>
      {/* Editorial Header */}
      <div
        style={{
          background: 'var(--color-sand)',
          borderBottom: '1px solid var(--color-border)',
          paddingTop: 'var(--space-12)',
          paddingBottom: 'var(--space-10)'
        }}
      >
        <div className="container">
          <div style={{ maxWidth: '780px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-3)' }}>
              <span className="badge badge-terracotta" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.75rem' }}>
                <Sparkles size={12} style={{ marginRight: '4px' }} />
                Labs &amp; Design Concepts
              </span>
            </div>

            <h1 style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)', color: 'var(--color-ink)' }}>
              Smart Travel Features
            </h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--color-ink-muted)', lineHeight: 1.6, margin: 0 }}>
              Experimental frontend design prototypes exploring companion-centric photo grouping and natural-language destination discovery for future Roamly releases.
            </p>
          </div>

          {/* Interactive Concept Selector Tabs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
              marginTop: 'var(--space-8)'
            }}
          >
            {/* Tab 1: Smart Memories */}
            <button
              type="button"
              onClick={() => handleTabChange('memories')}
              style={{
                textAlign: 'left',
                backgroundColor: activeTab === 'memories' ? 'var(--color-ivory)' : '#FFFFFF',
                border: activeTab === 'memories' ? '2px solid var(--color-terracotta)' : '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '18px 20px',
                cursor: 'pointer',
                boxShadow: activeTab === 'memories' ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px'
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: activeTab === 'memories' ? 'var(--color-terracotta-soft)' : 'var(--color-sand)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-terracotta)',
                  flexShrink: 0
                }}
              >
                <Users size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-ink)', fontWeight: 600 }}>
                    Smart Memories
                  </h3>
                  {activeTab === 'memories' && (
                    <span className="badge badge-terracotta" style={{ fontSize: '0.7rem' }}>Active</span>
                  )}
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-ink-muted)', lineHeight: 1.4 }}>
                  Facial-recognition-inspired photo discovery concept across shared companion albums.
                </p>
              </div>
            </button>

            {/* Tab 2: Smart Search */}
            <button
              type="button"
              onClick={() => handleTabChange('search')}
              style={{
                textAlign: 'left',
                backgroundColor: activeTab === 'search' ? 'var(--color-ivory)' : '#FFFFFF',
                border: activeTab === 'search' ? '2px solid var(--color-terracotta)' : '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '18px 20px',
                cursor: 'pointer',
                boxShadow: activeTab === 'search' ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px'
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: activeTab === 'search' ? 'var(--color-terracotta-soft)' : 'var(--color-sand)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-terracotta)',
                  flexShrink: 0
                }}
              >
                <Search size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-ink)', fontWeight: 600 }}>
                    Smart Search
                  </h3>
                  {activeTab === 'search' && (
                    <span className="badge badge-terracotta" style={{ fontSize: '0.7rem' }}>Active</span>
                  )}
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-ink-muted)', lineHeight: 1.4 }}>
                  Natural-language itinerary and destination discovery concept powered by travel intent.
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container" style={{ paddingTop: 'var(--space-8)' }}>
        {/* ==================================================================== */}
        {/* 1. SMART MEMORIES CONCEPT SCREEN                                     */}
        {/* ==================================================================== */}
        {activeTab === 'memories' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
            {/* Required Concept Preview Notice */}
            <div
              style={{
                backgroundColor: 'rgba(217, 158, 75, 0.12)',
                border: '1px solid var(--color-ochre)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px'
              }}
            >
              <AlertTriangle size={22} color="var(--color-ochre)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: 'var(--color-ink)', fontSize: '0.95rem' }}>
                  Concept Preview — Recognition Not Implemented
                </strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--color-ink-muted)', lineHeight: 1.5 }}>
                  This preview demonstrates how travelers could find photos featuring a selected companion within a trip.
                  All people, photos, counts, and person-to-photo associations are illustrative demo content.
                  No real facial recognition, face embeddings, image scanning, or automatic identity matching is implemented.
                  The displayed associations are manually defined sample data, not actual recognition results.
                </p>
              </div>
            </div>

            {/* Explanation & Value Overview */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-6)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ maxWidth: '720px' }}>
                <h2 style={{ fontSize: '1.6rem', marginBottom: '8px', color: 'var(--color-ink)' }}>
                  Finding People Across Shared Memories
                </h2>
                <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
                  On group journeys with companions, hundreds of shared photos are captured across destinations.
                  The Smart Memories concept visualizes how travelers could instantly discover memories featuring themselves or specific companions without manually sifting through entire albums.
                </p>
              </div>

              {/* Three Pillars Overview */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '16px',
                  marginTop: 'var(--space-6)'
                }}
              >
                <div style={{ background: 'var(--color-sand)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: 'var(--color-terracotta)', marginBottom: '6px' }}>
                    <Camera size={20} />
                  </div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>1. Companion Grouping</h4>
                  <p style={{ margin: '4px 0 0', fontSize: '0.825rem', color: 'var(--color-ink-muted)', lineHeight: 1.4 }}>
                    Simulates automatically grouping shared trip photos by companion presence.
                  </p>
                </div>

                <div style={{ background: 'var(--color-sand)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: 'var(--color-terracotta)', marginBottom: '6px' }}>
                    <UserCheck size={20} />
                  </div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>2. Personalized Albums</h4>
                  <p style={{ margin: '4px 0 0', fontSize: '0.825rem', color: 'var(--color-ink-muted)', lineHeight: 1.4 }}>
                    Each traveler can quickly download or relive moments they participated in.
                  </p>
                </div>

                <div style={{ background: 'var(--color-sand)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: 'var(--color-terracotta)', marginBottom: '6px' }}>
                    <ShieldCheck size={20} />
                  </div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>3. Consent &amp; Privacy</h4>
                  <p style={{ margin: '4px 0 0', fontSize: '0.825rem', color: 'var(--color-ink-muted)', lineHeight: 1.4 }}>
                    Opt-in only, restricted strictly to authorized group companions with full erasure rights.
                  </p>
                </div>
              </div>
            </div>

            {/* STEP A: Select a Trip or Location */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-terracotta" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Step A
                    </span>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-ink)' }}>
                      Select a Trip or Location
                    </h3>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)' }}>
                    Choose an illustrative journey to inspect its shared photo gallery and companion roster:
                  </span>
                </div>
                <span className="badge badge-sand" style={{ fontSize: '0.75rem' }}>
                  {DEMO_TRIPS.length} Demo Trips Available
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '16px'
                }}
              >
                {DEMO_TRIPS.map((trip) => {
                  const isSelected = selectedTripId === trip.id;
                  return (
                    <button
                      key={trip.id}
                      type="button"
                      onClick={() => handleTripChange(trip.id)}
                      aria-pressed={isSelected}
                      aria-label={`Select trip: ${trip.title}, ${trip.destination}`}
                      style={{
                        textAlign: 'left',
                        backgroundColor: isSelected ? 'var(--color-ivory)' : '#FFFFFF',
                        border: isSelected ? '2px solid var(--color-terracotta)' : '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        padding: 0,
                        cursor: 'pointer',
                        boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      {/* Trip Cover Image */}
                      <div style={{ position: 'relative', width: '100%', height: '140px', backgroundColor: 'var(--color-sand)', overflow: 'hidden' }}>
                        <img
                          src={trip.coverImage}
                          alt={trip.destination}
                          loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            backgroundColor: 'rgba(28, 36, 33, 0.8)',
                            color: 'var(--color-ivory)',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-xs)',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            backdropFilter: 'blur(4px)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <ImageIcon size={12} />
                          <span>{trip.totalPhotos} demo photos</span>
                        </div>
                        {isSelected && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '10px',
                              left: '10px',
                              backgroundColor: 'var(--color-terracotta)',
                              color: 'var(--color-ivory)',
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-xs)',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: 'var(--shadow-sm)'
                            }}
                          >
                            <Check size={12} />
                            <span>Selected Trip</span>
                          </div>
                        )}
                      </div>

                      {/* Trip Details */}
                      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--color-terracotta)', fontWeight: 600 }}>
                            <MapPin size={13} />
                            <span>{trip.destination}</span>
                          </div>
                          <h4 style={{ margin: '4px 0 0', fontSize: '1.05rem', color: 'var(--color-ink)', fontWeight: 600 }}>
                            {trip.title}
                          </h4>
                          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--color-ink-muted)', lineHeight: 1.4 }}>
                            {trip.description}
                          </p>
                        </div>

                        <div style={{ borderTop: '1px solid var(--color-sand)', paddingTop: '8px', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} />
                            <span>{trip.dates}</span>
                          </span>
                          <span style={{ fontWeight: 500, color: 'var(--color-ink)' }}>
                            {trip.travelerIds.length} companions
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP B: Select a Traveler */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-terracotta" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Step B
                    </span>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-ink)' }}>
                      Select a Traveler in {selectedTrip.destination}
                    </h3>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)' }}>
                    Filter memories featuring an individual companion, or explore all journey photos together:
                  </span>
                </div>
                <span className="badge badge-ochre" style={{ fontSize: '0.75rem' }}>
                  Illustrative Tagging
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '14px'
                }}
              >
                {/* Option 1: All Companions */}
                {(() => {
                  const isAllSelected = selectedTravelerId === 'all';
                  const allTripPhotosCount = DEMO_TRIP_PHOTOS.filter((p) => p.tripId === selectedTripId).length;
                  return (
                    <button
                      type="button"
                      onClick={() => handleTravelerChange('all')}
                      aria-pressed={isAllSelected}
                      aria-label={`Show all companions in ${selectedTrip.destination}`}
                      style={{
                        textAlign: 'left',
                        backgroundColor: isAllSelected ? 'var(--color-ivory)' : '#FFFFFF',
                        border: isAllSelected ? '2px solid var(--color-terracotta)' : '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px',
                        cursor: 'pointer',
                        boxShadow: isAllSelected ? 'var(--shadow-sm)' : 'none',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          backgroundColor: isAllSelected ? 'var(--color-terracotta-soft)' : 'var(--color-sand)',
                          color: 'var(--color-terracotta)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          border: isAllSelected ? '2px solid var(--color-terracotta)' : '1px solid var(--color-border)'
                        }}
                      >
                        <Users size={20} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-ink)' }}>
                          All Companions
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-ink-muted)' }}>
                          Full Album • {allTripPhotosCount} {allTripPhotosCount === 1 ? 'photo' : 'photos'}
                        </div>
                      </div>
                      {isAllSelected && <Check size={16} color="var(--color-terracotta)" />}
                    </button>
                  );
                })()}

                {/* Options 2..N: Individual Companions on this Trip */}
                {currentTripTravelers.map((traveler) => {
                  const isSelected = selectedTravelerId === traveler.id;
                  const count = DEMO_TRIP_PHOTOS.filter(
                    (p) => p.tripId === selectedTripId && p.personas.includes(traveler.id)
                  ).length;

                  return (
                    <button
                      key={traveler.id}
                      type="button"
                      onClick={() => handleTravelerChange(traveler.id)}
                      aria-pressed={isSelected}
                      aria-label={`Select companion ${traveler.name} in ${selectedTrip.destination}`}
                      style={{
                        textAlign: 'left',
                        backgroundColor: isSelected ? 'var(--color-ivory)' : '#FFFFFF',
                        border: isSelected ? '2px solid var(--color-terracotta)' : '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px',
                        cursor: 'pointer',
                        boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <img
                        src={traveler.avatar}
                        alt={traveler.name}
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          flexShrink: 0,
                          border: isSelected ? '2px solid var(--color-terracotta)' : '1px solid var(--color-border)'
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {traveler.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-ink-muted)' }}>
                          {traveler.role} • {count} {count === 1 ? 'photo' : 'photos'}
                        </div>
                      </div>
                      {isSelected && <Check size={16} color="var(--color-terracotta)" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP C: Explore Matching Photos */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="badge badge-terracotta" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Step C
                    </span>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-ink)' }}>
                      {selectedTravelerId === 'all'
                        ? `All Memories from ${selectedTrip.destination}`
                        : `Memories featuring ${selectedTraveler?.name || 'Selected Companion'} in ${selectedTrip.destination}`}
                    </h3>
                    <span className="badge badge-sand" style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                      {matchingPhotos.length} {matchingPhotos.length === 1 ? 'demo photo' : 'demo photos'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)' }}>
                    {selectedTravelerId === 'all'
                      ? `Showing all sample memories captured during the ${selectedTrip.title} itinerary.`
                      : `Showing sample memories tagged with ${selectedTraveler?.name} on this trip.`}
                  </span>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)', fontStyle: 'italic' }}>
                  Illustrative sample memories • Does not identify real persons
                </span>
              </div>

              {/* Photo Grid or Empty State */}
              {matchingPhotos.length > 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '18px'
                  }}
                >
                  {matchingPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', backgroundColor: 'var(--color-sand)', overflow: 'hidden' }}>
                        <img
                          src={photo.url}
                          alt={photo.title}
                          loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            backgroundColor: 'rgba(28, 36, 33, 0.75)',
                            color: 'var(--color-ivory)',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-xs)',
                            fontSize: '0.72rem',
                            fontWeight: 500,
                            backdropFilter: 'blur(4px)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Tag size={10} />
                          <span>Demo Tag</span>
                        </div>
                        {photo.date && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '10px',
                              right: '10px',
                              backgroundColor: 'rgba(28, 36, 33, 0.7)',
                              color: 'var(--color-ivory)',
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-xs)',
                              fontSize: '0.7rem',
                              backdropFilter: 'blur(4px)'
                            }}
                          >
                            {photo.date}
                          </div>
                        )}
                      </div>

                      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                            <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--color-ink)' }}>
                              {photo.title}
                            </h4>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)', whiteSpace: 'nowrap' }}>
                              {photo.location}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--color-ink-muted)', lineHeight: 1.4 }}>
                            {photo.caption}
                          </p>
                        </div>

                        <div style={{ borderTop: '1px solid var(--color-sand)', paddingTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {photo.personaLabels.map((name, idx) => {
                              const personaId = photo.personas[idx];
                              const isCurrentPerson = selectedTravelerId !== 'all' && personaId === selectedTravelerId;
                              return (
                                <span
                                  key={name}
                                  style={{
                                    fontSize: '0.72rem',
                                    backgroundColor: isCurrentPerson ? 'var(--color-terracotta-soft)' : 'var(--color-sand)',
                                    color: isCurrentPerson ? 'var(--color-terracotta)' : 'var(--color-ink)',
                                    border: isCurrentPerson ? '1px solid var(--color-terracotta)' : '1px solid transparent',
                                    padding: '2px 6px',
                                    borderRadius: 'var(--radius-xs)',
                                    fontWeight: isCurrentPerson ? 600 : 500
                                  }}
                                >
                                  {name}
                                </span>
                              );
                            })}
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-faint)', whiteSpace: 'nowrap' }}>
                            Demo Data
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Friendly Empty State */
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px dashed var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-12) var(--space-6)',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-sand)',
                      color: 'var(--color-ink-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Camera size={26} />
                  </div>
                  <h4 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-ink)' }}>
                    No sample photos featuring {selectedTraveler?.name || 'this companion'} in {selectedTrip.destination}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-ink-muted)', maxWidth: '480px', lineHeight: 1.5 }}>
                    {selectedTraveler?.name || 'This companion'} is part of the {selectedTrip.destination} group trip, but has no tagged demo photos in this illustrative album. Select another companion or browse the full album.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleTravelerChange('all')}
                    className="btn btn-outline btn-sm"
                    style={{ marginTop: '6px' }}
                  >
                    <Users size={14} />
                    <span>View All Companions in {selectedTrip.destination}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Required Privacy & Safeguards Note */}
            <div
              style={{
                backgroundColor: 'var(--color-sand)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-6)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px'
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.85)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-sage)',
                  flexShrink: 0
                }}
              >
                <ShieldCheck size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 6px', fontSize: '1.05rem', color: 'var(--color-ink)' }}>
                  Privacy Safeguards &amp; Ethical Foundation
                </h4>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-ink-muted)', lineHeight: 1.6 }}>
                  A production facial-recognition implementation would require comprehensive user safeguards:
                  explicit, revocable opt-in consent before any facial biometric processing; client-side or zero-knowledge biometric templates;
                  strict restriction exclusively to confirmed travel companions within private group itineraries; and absolute prevention of external profiling or advertising surveillance.
                  Travelers would maintain an unconditional right to instantaneous data erasure at any time.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* 2. SMART SEARCH CONCEPT SCREEN                                       */}
        {/* ==================================================================== */}
        {activeTab === 'search' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
            {/* Required Coming Soon Notice */}
            <div
              style={{
                backgroundColor: 'rgba(79, 99, 82, 0.1)',
                border: '1px solid var(--color-sage)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px'
              }}
            >
              <AlertCircle size={22} color="var(--color-sage)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: 'var(--color-ink)', fontSize: '0.95rem' }}>
                  Coming Soon — Search Not Connected
                </strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--color-ink-muted)', lineHeight: 1.5 }}>
                  This interface illustrates a natural-language search experience designed to translate holistic travel dreams into curated itineraries.
                  No AI model, machine-learning inference pipeline, search backend, or external travel search API is currently connected.
                  Interacting with sample prompts populates the search input for demonstration purposes without generating fabricated live results.
                </p>
              </div>
            </div>

            {/* Natural-Language Search Field */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-8)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-terracotta-soft)',
                    color: 'var(--color-terracotta)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px'
                  }}
                >
                  <Search size={24} />
                </div>
                <h2 style={{ fontSize: '1.75rem', margin: '0 0 8px', color: 'var(--color-ink)' }}>
                  Natural-Language Travel Discovery
                </h2>
                <p style={{ fontSize: '0.95rem', color: 'var(--color-ink-muted)', margin: '0 0 24px', lineHeight: 1.5 }}>
                  Describe your ideal voyage in plain language — season, pacing, budget, scenery, or cuisine.
                </p>

                {/* Search Input Container */}
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: 'var(--color-ivory)',
                    border: '2px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 14px',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'border-color 0.2s ease'
                  }}
                >
                  <Search size={20} color="var(--color-ink-muted)" style={{ flexShrink: 0, marginRight: '10px' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setActiveInterest('');
                    }}
                    placeholder="Describe your dream journey (e.g. A peaceful 4-day autumn cultural trip with historic temples)..."
                    style={{
                      border: 'none',
                      background: 'transparent',
                      width: '100%',
                      fontSize: '0.975rem',
                      color: 'var(--color-ink)',
                      outline: 'none',
                      fontFamily: 'var(--font-sans)'
                    }}
                    aria-label="Natural-language travel prompt input"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setActiveInterest('');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-ink-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      aria-label="Clear input"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                {/* Notice text below search bar */}
                <div style={{ marginTop: '12px', fontSize: '0.825rem', color: 'var(--color-ink-muted)' }}>
                  {searchQuery ? (
                    <span style={{ color: 'var(--color-terracotta)', fontWeight: 500 }}>
                      Query entered • Live AI inference is not connected in this prototype. Explore our verified destinations below.
                    </span>
                  ) : (
                    <span>Click an example prompt or travel interest below to populate the search query:</span>
                  )}
                </div>
              </div>

              {/* Example Prompts */}
              <div style={{ marginTop: 'var(--space-6)', borderTop: '1px solid var(--color-sand)', paddingTop: 'var(--space-6)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '10px', textAlign: 'center' }}>
                  Illustrative Example Prompts
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: '10px'
                  }}
                >
                  {EXAMPLE_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleSelectPrompt(prompt)}
                      style={{
                        textAlign: 'left',
                        background: searchQuery === prompt ? 'var(--color-terracotta-soft)' : 'var(--color-sand)',
                        border: searchQuery === prompt ? '1px solid var(--color-terracotta)' : '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 14px',
                        fontSize: '0.825rem',
                        color: 'var(--color-ink)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ lineHeight: 1.4 }}>"{prompt}"</span>
                      <Sparkles size={14} color="var(--color-terracotta)" style={{ flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Travel Interest Chips */}
              <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '10px' }}>
                  Travel-Interest Categories
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {INTEREST_CHIPS.map((chip) => {
                    const isSelected = activeInterest === chip.label;
                    return (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => handleSelectInterest(chip)}
                        style={{
                          backgroundColor: isSelected ? 'var(--color-terracotta)' : '#FFFFFF',
                          color: isSelected ? 'var(--color-ivory)' : 'var(--color-ink)',
                          border: isSelected ? '1px solid var(--color-terracotta)' : '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-pill)',
                          padding: '6px 14px',
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: 'var(--shadow-sm)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>{chip.icon}</span>
                        <span>{chip.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Illustrative Destination Preview Layout */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-ink)' }}>
                    Illustrative Destination Previews
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)' }}>
                    Simulated semantic matches showcasing how natural-language intent maps to curated journeys:
                  </span>
                </div>
                <span className="badge badge-sage" style={{ fontSize: '0.75rem' }}>
                  Illustrative Prototype Results
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '20px'
                }}
              >
                {ILLUSTRATIVE_DESTINATIONS.map((dest) => (
                  <div
                    key={dest.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      boxShadow: 'var(--shadow-sm)',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 10', backgroundColor: 'var(--color-sand)', overflow: 'hidden' }}>
                      <img
                        src={dest.image}
                        alt={dest.name}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '10px',
                          left: '10px',
                          backgroundColor: 'var(--color-terracotta)',
                          color: 'var(--color-ivory)',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-xs)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          boxShadow: 'var(--shadow-sm)'
                        }}
                      >
                        {dest.matchScore}
                      </div>
                    </div>

                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-ink)' }}>
                            {dest.name}
                          </h4>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)' }}>
                            {dest.continent}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--color-ink-muted)', marginBottom: '8px' }}>
                          <span>{dest.budgetTier} Budget</span>
                          <span>•</span>
                          <span>{dest.bestSeason}</span>
                        </div>

                        {/* Semantic reasoning match preview pill */}
                        <div
                          style={{
                            backgroundColor: 'var(--color-sand)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-xs)',
                            padding: '8px 10px',
                            fontSize: '0.78rem',
                            color: 'var(--color-ink)',
                            lineHeight: 1.4
                          }}
                        >
                          <strong style={{ color: 'var(--color-terracotta)' }}>Semantic Match: </strong>
                          {dest.reasoning}
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid var(--color-sand)', paddingTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-ink-faint)' }}>
                          Preview result
                        </span>
                        <Link
                          to={`/destinations/${dest.id}`}
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '0.78rem', padding: '3px 8px' }}
                        >
                          <span>View Real Guide</span>
                          <ArrowRight size={12} />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dedicated Most-Loved Destinations Entry Point */}
              <div
                style={{
                  backgroundColor: 'var(--color-ink)',
                  color: 'var(--color-ivory)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-8)',
                  marginTop: 'var(--space-8)',
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 0.8fr)',
                  gap: 'var(--space-8)',
                  alignItems: 'center',
                  boxShadow: 'var(--shadow-md)'
                }}
              >
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: 'var(--radius-pill)', background: 'rgba(217, 158, 75, 0.25)', border: '1px solid rgba(217,158,75,0.4)', color: '#F1C67E', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                    <Sparkles size={13} color="#F1C67E" />
                    <span>Interactive Scroll Experience</span>
                  </div>
                  <h3 style={{ color: 'var(--color-ivory)', fontSize: '1.75rem', marginBottom: '10px' }}>
                    Most-Loved Destinations
                  </h3>
                  <p style={{ color: 'rgba(250, 247, 242, 0.82)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '20px', maxWidth: '520px' }}>
                    Step into our cinematic, scroll-driven journey featuring top verified community favorites—from moss-laden teahouses in Kyoto to sun-drenched Amalfi cliffs and Oaxaca's culinary heart.
                  </p>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Link
                      to="/most-loved"
                      className="btn btn-primary"
                      style={{ textDecoration: 'none' }}
                    >
                      <span>Launch Cinematic Experience</span>
                      <ArrowRight size={15} />
                    </Link>
                    <Link
                      to="/destinations"
                      className="btn btn-outline"
                      style={{ color: 'var(--color-ivory)', borderColor: 'rgba(250, 247, 242, 0.3)', backgroundColor: 'transparent' }}
                    >
                      <span>View Full Catalog</span>
                    </Link>
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    border: '1px solid rgba(250, 247, 242, 0.2)',
                    aspectRatio: '16/10',
                    backgroundColor: '#2C3531',
                    position: 'relative'
                  }}
                >
                  <img
                    src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80"
                    alt="Most-Loved Destinations preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(28,36,33,0.85) 0%, transparent 60%)',
                      display: 'flex',
                      alignItems: 'flex-end',
                      padding: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#FAF7F2', fontSize: '0.8rem', fontWeight: 600 }}>
                      <Heart size={14} fill="var(--color-terracotta)" color="var(--color-terracotta)" />
                      <span>Kyoto, Amalfi Coast, Oaxaca &amp; more</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Catalog Discovery CTA */}
              <div
                style={{
                  backgroundColor: 'var(--color-sand)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-6)',
                  marginTop: 'var(--space-6)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Compass size={28} color="var(--color-terracotta)" />
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-ink)' }}>
                  Looking for verified editorial itineraries?
                </h4>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-ink-muted)', maxWidth: '520px' }}>
                  Explore Roamly’s curated destinations and community-crafted itineraries with day-by-day stops and budget calculations.
                </p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <Link to="/destinations" className="btn btn-primary btn-sm">
                    <span>Browse All Destinations</span>
                    <ArrowRight size={14} />
                  </Link>
                  <Link to="/trips" className="btn btn-outline btn-sm" style={{ backgroundColor: '#FFFFFF' }}>
                    <span>Explore Itineraries</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
