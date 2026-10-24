import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, MapPin, ArrowRight, Heart, Compass, ChevronDown, X } from 'lucide-react';
import heroImage from '../../assets/hero.png';
import { formatBudgetTier } from '../../utils/currency';

/**
 * Derives top 3 destinations based strictly on verifiable itinerary likes.
 */
function getTopDestinations(destinations, trips) {
  if (!destinations || destinations.length === 0) return [];

  const likesMap = {};
  if (trips && trips.length > 0) {
    for (const trip of trips) {
      if (trip.destination_id) {
        const destId = Number(trip.destination_id);
        likesMap[destId] = (likesMap[destId] || 0) + (Number(trip.likes_count) || 0);
      }
    }
  }

  const sorted = [...destinations].sort((a, b) => {
    const likesA = likesMap[a.id] || 0;
    const likesB = likesMap[b.id] || 0;
    if (likesB !== likesA) return likesB - likesA;
    return a.id - b.id;
  });

  return sorted.slice(0, 3).map((dest) => ({
    ...dest,
    verified_likes: likesMap[dest.id] || 0
  }));
}

/**
 * CinematicDestinationExperience Component
 * 100% Scroll-Driven luxury travel reveal for Roamly's Most-Loved Destinations:
 * - Controlled entirely by user scroll (normalized progress 0.0 to 1.0).
 * - Zero autoplay timers or independent scene advancement.
 * - Pausing scroll freezes the exact visual state.
 * - Scrolling upward smoothly reverses the sequence.
 * - Scene 1: Atmosphere & “PLAN YOUR NEXT TRIP”
 * - Scene 2: Wave flight with dynamic terracotta airplane & trailing ropes
 * - Scene 3: Asymmetrical zigzag layout of three floating postcards
 * - Scene 4: Centered “MOST-LOVED DESTINATIONS” heading & 3D card flips with synchronized glow bursts
 * - Scene 5: Sequenced focal spotlight (Kyoto -> Amalfi Coast -> Oaxaca) with depth-of-field optics
 * - Finale: Smooth resolution into destination catalog
 */
export default function CinematicDestinationExperience({
  destinations = [],
  trips = [],
  mode = 'overlay', // 'overlay' | 'page'
  onDismiss = null
}) {
  const trackRef = useRef(null);
  const stageRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [stageDimensions, setStageDimensions] = useState({ width: 1200, height: 750 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  });

  const topDestinations = useMemo(() => {
    return getTopDestinations(destinations, trips);
  }, [destinations, trips]);

  const isMobile = stageDimensions.width < 768;
  const cardTargets = useMemo(() => {
    if (isMobile) {
      return [
        { x: stageDimensions.width * 0.5, y: stageDimensions.height * 0.46, rot: 0 },
        { x: stageDimensions.width * 0.5, y: stageDimensions.height * 0.46, rot: 0 },
        { x: stageDimensions.width * 0.5, y: stageDimensions.height * 0.46, rot: 0 }
      ];
    }
    return [
      { x: stageDimensions.width * 0.22, y: stageDimensions.height * 0.52, rot: -3.8 },
      { x: stageDimensions.width * 0.50, y: stageDimensions.height * 0.42, rot: 2.6 },
      { x: stageDimensions.width * 0.78, y: stageDimensions.height * 0.54, rot: -2.0 }
    ];
  }, [stageDimensions, isMobile]);

  // Reduced motion preference listener
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Update stage geometry on resize
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateSize = () => {
      if (stageRef.current) {
        setStageDimensions({
          width: stageRef.current.clientWidth || window.innerWidth,
          height: stageRef.current.clientHeight || window.innerHeight
        });
      } else {
        setStageDimensions({
          width: window.innerWidth,
          height: window.innerHeight
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize, { passive: true });
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Dismiss callback helper
  const handleDismiss = useCallback(() => {
    if (onDismiss) onDismiss();
  }, [onDismiss]);

  // Keyboard shortcut listener (Escape = skip intro)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mode === 'overlay') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, handleDismiss]);

  // --- 100% SCROLL-DRIVEN PROGRESS ENGINE ---
  // Calculates normalized scroll progress 0.0 -> 1.0 from track geometry
  const updateScrollProgress = useCallback(() => {
    if (!trackRef.current || prefersReducedMotion || typeof window === 'undefined') return;

    const rect = trackRef.current.getBoundingClientRect();
    const stageTopOffset = mode === 'page' ? 72 : 0;
    const stageHeight = window.innerHeight - stageTopOffset;
    const totalScrollable = rect.height - stageHeight;

    if (totalScrollable <= 0) {
      setProgress(0);
      return;
    }

    const currentScroll = stageTopOffset - rect.top;
    const rawProgress = currentScroll / totalScrollable;
    const clampedProgress = Math.min(Math.max(rawProgress, 0), 1);

    setProgress(clampedProgress);

    // If overlay reached completion (>= 0.985), trigger onDismiss
    if (mode === 'overlay' && clampedProgress >= 0.985) {
      handleDismiss();
    }
  }, [prefersReducedMotion, mode, handleDismiss]);


  useEffect(() => {
    if (prefersReducedMotion) return;

    let rafId = null;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateScrollProgress();
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    updateScrollProgress();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [updateScrollProgress, prefersReducedMotion]);

  // Reduced motion alternative: clean static presentation
  if (prefersReducedMotion) {
    return (
      <div className={mode === 'overlay' ? 'cinematic-overlay-stage' : 'cinematic-page-stage'}>
        <div className="cinematic-atmosphere" />
        <div className="cinematic-reduced-view">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-terracotta)', display: 'block', marginBottom: '4px' }}>
              Most-Loved Sanctuaries
            </span>
            <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-serif)' }}>Plan Your Next Trip</h2>
            <p style={{ color: 'var(--color-ink-muted)', maxWidth: '540px', margin: '0 auto' }}>
              Top verified destinations celebrated by slow travelers for artisan heritage and unhurried character.
            </p>
          </div>

          <div className="cinematic-reduced-grid">
            {topDestinations.map((dest) => (
              <article key={dest.id} className="editorial-card" style={{ background: '#FFFFFF' }}>
                <div style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden' }}>
                  <img
                    src={dest.cover_image || heroImage}
                    alt={`${dest.title}, ${dest.country}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '6px' }}>
                    <span className="badge badge-ochre">{dest.continent}</span>
                    <span className="badge badge-sand">{formatBudgetTier(dest.budget_tier)}</span>
                  </div>
                </div>
                <div className="card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-ink-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>
                    <MapPin size={14} color="var(--color-terracotta)" />
                    <span>{dest.country}</span>
                  </div>
                  <h3 style={{ fontSize: '1.35rem', marginBottom: '6px' }}>{dest.title}</h3>
                  <p style={{ fontSize: '0.875rem', marginBottom: '14px', flex: 1 }}>{dest.tagline}</p>
                  <Link to={`/destinations/${dest.id}`} className="btn btn-primary btn-sm" style={{ width: '100%', textAlign: 'center' }}>
                    <span>Explore Destination Guide</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {mode === 'overlay' && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <button type="button" onClick={handleDismiss} className="btn btn-outline">
                <span>Continue to Homepage</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- MATHEMATICAL DERIVATION OF ALL PROPERTIES FROM SCROLL PROGRESS (p) ---
  const p = progress;

  // 1. Scene 1: Opening Title ("PLAN YOUR NEXT TRIP") — p: 0.00 to 0.16
  const showScene1Title = p < 0.18;
  const titleOpacity = p < 0.10 ? 1 : Math.max(0, 1 - (p - 0.10) / 0.06);
  const titleTranslateY = p > 0.10 ? -((p - 0.10) / 0.06) * 35 : 0;

  // 2. Scene 4 & 5: Centered Heading ("MOST-LOVED DESTINATIONS") — p: 0.40 to 0.92
  const showHeading = p >= 0.40 && p <= 0.94;
  const headingOpacity = showHeading
    ? Math.min((p - 0.40) / 0.06, 1) * (p > 0.88 ? Math.max(0, 1 - (p - 0.88) / 0.06) : 1)
    : 0;
  const headingTranslateY = showHeading ? (1 - Math.min((p - 0.40) / 0.06, 1)) * -18 : -18;

  // 3. Scene 2: Terracotta Airplane Wave Flight & Trailing Ropes — p: 0.12 to 0.40
  const flightActive = p >= 0.12 && p <= 0.40;
  const flightP = Math.min(Math.max((p - 0.12) / 0.26, 0), 1);

  // Wave trajectory coordinates:
  // x: starts at -80px (left of stage) and traverses to stageWidth + 80px (right of stage)
  const flightW = stageDimensions.width + 160;
  const planeX = -80 + flightP * flightW;
  const planeBaseY = stageDimensions.height * 0.22;
  const planeAmplitude = 44;
  // Sinusoidal wave: y = y_base + amplitude * sin(2.8 * PI * f)
  const planeY = planeBaseY + Math.sin(flightP * Math.PI * 2.8) * planeAmplitude;
  // Tangent angle for dynamic banking
  const planeTangent = Math.cos(flightP * Math.PI * 2.8) * ((planeAmplitude * Math.PI * 2.8) / flightW);
  const planeAngleDeg = Math.atan(planeTangent) * (180 / Math.PI);

  // Ropes visibility (fades in as plane enters, fades out as plane exits)
  const ropesOpacity = p < 0.15
    ? Math.max(0, (p - 0.12) / 0.03)
    : p > 0.35
    ? Math.max(0, 1 - (p - 0.35) / 0.05)
    : 1;

  // 4. Scene 3: Asymmetrical Zigzag Postcards Layout & Float

  // Staggered card entrance pulled in by plane (p: 0.16 to 0.36)
  const cardEntryProgresses = [
    Math.min(Math.max((p - 0.16) / 0.14, 0), 1),
    Math.min(Math.max((p - 0.19) / 0.14, 0), 1),
    Math.min(Math.max((p - 0.22) / 0.14, 0), 1)
  ];

  // 5. Scene 4: Card 3D Flips & Synchronized Light Bursts — p: 0.46 to 0.65
  // Staggered flips (0deg to 180deg)
  const flip0P = Math.min(Math.max((p - 0.46) / 0.07, 0), 1);
  const flip1P = Math.min(Math.max((p - 0.52) / 0.07, 0), 1);
  const flip2P = Math.min(Math.max((p - 0.58) / 0.07, 0), 1);
  const flipAngles = [flip0P * 180, flip1P * 180, flip2P * 180];

  // Individual light bursts: peaked at 90deg mid-flip via sin(progress * PI)
  const burstOpacities = [
    Math.sin(flip0P * Math.PI),
    Math.sin(flip1P * Math.PI),
    Math.sin(flip2P * Math.PI)
  ];

  // 6. Scene 5: Sequenced Destination Spotlight (Kyoto -> Amalfi -> Oaxaca) — p: 0.65 to 0.89
  const activeFocal = p >= 0.65 && p < 0.73
    ? 0 // Kyoto
    : p >= 0.73 && p < 0.81
    ? 1 // Amalfi Coast
    : p >= 0.81 && p < 0.89
    ? 2 // Oaxaca
    : -1; // Balanced / Finale

  // 7. Finale & Final Transition — p: 0.89 to 1.00
  const exitP = Math.min(Math.max((p - 0.91) / 0.08, 0), 1);
  const stageOpacity = mode === 'overlay' ? (1 - exitP) : 1;

  // Calculate dynamic current position for each card
  const cardsRenderData = topDestinations.map((dest, idx) => {
    const entryP = cardEntryProgresses[idx];
    const target = cardTargets[idx] || { x: stageDimensions.width * 0.5, y: stageDimensions.height * 0.5, rot: 0 };

    // Initial position when entering: off-screen left/bottom, pulled into target
    const startX = -280;
    const startY = stageDimensions.height * 0.6 + idx * 40;
    const currentX = startX + (target.x - startX) * entryP;
    const currentY = startY + (target.y - startY) * entryP;
    const currentRot = target.rot * entryP;

    // Card attachment anchor point at top-center of card for rope
    const cardAnchorX = currentX;
    const cardAnchorY = currentY - 210; // top edge of 420px card

    // Focal state
    const isFocal = activeFocal === idx;
    const isDimmed = activeFocal !== -1 && !isFocal;

    return {
      dest,
      idx,
      x: currentX,
      y: currentY,
      rot: currentRot,
      anchorX: cardAnchorX,
      anchorY: cardAnchorY,
      flipAngle: flipAngles[idx] || 0,
      burstOpacity: burstOpacities[idx] || 0,
      isFocal,
      isDimmed
    };
  });

  return (
    <div
      ref={trackRef}
      className={mode === 'overlay' ? 'cinematic-scroll-track-overlay' : 'cinematic-scroll-track-page'}
      style={{
        position: 'relative',
        width: '100%',
        height: isMobile ? '300vh' : '380vh'
      }}
      aria-label="Scroll-Driven Cinematic Most-Loved Destinations Reveal"
    >
      {/* Pinned Sticky Full-Viewport Stage */}
      <aside
        ref={stageRef}
        className={mode === 'overlay' ? 'cinematic-overlay-stage' : 'cinematic-page-stage'}
        style={{
          position: 'sticky',
          top: mode === 'page' ? '72px' : 0,
          left: 0,
          width: '100%',
          height: mode === 'page' ? 'calc(100dvh - 72px)' : '100dvh',
          opacity: stageOpacity,
          pointerEvents: (mode === 'overlay' && exitP >= 0.95) ? 'none' : 'auto',
          visibility: (mode === 'overlay' && stageOpacity <= 0.01) ? 'hidden' : 'visible'
        }}
        aria-label="Roamly Cinematic Destination Reveal Stage"
      >
        {/* 1. Translucent Atmospheric Lighting & Depth */}
        <div className="cinematic-atmosphere" />
        <div
          className="cinematic-radial-glow"
          style={{ opacity: 0.85 * (1 - exitP * 0.5) }}
        />
        <div className="cinematic-vignette" />

        {/* 2. Top Control Bar */}
        <header className="cinematic-top-bar">
          <div className="cinematic-brand-pill">
            <Sparkles size={14} color="var(--color-terracotta)" />
            <span>Scroll to Pilot Journey • {Math.round(p * 100)}%</span>
          </div>

          <div className="cinematic-top-actions">
            {mode === 'page' && (
              <a
                href="#destination-catalog"
                className="cinematic-btn-action"
                title="Jump directly to destination catalog"
              >
                <span>Jump to Catalog</span>
                <ChevronDown size={14} />
              </a>
            )}

            {mode === 'overlay' && (
              <button
                type="button"
                onClick={handleDismiss}
                className="cinematic-btn-action"
                title="Skip cinematic introduction and view homepage"
                aria-label="Skip cinematic introduction and view homepage"
              >
                <span>Skip Intro</span>
                <X size={14} />
              </button>
            )}
          </div>
        </header>

        {/* 3. Scene 1 — “PLAN YOUR NEXT TRIP” Atmospheric Title */}
        {showScene1Title && (
          <div
            className="cinematic-title-scene"
            style={{
              opacity: titleOpacity,
              transform: `translateY(${titleTranslateY}px)`
            }}
          >
            <span className="cinematic-eyebrow">A Slow Travel Experience</span>
            <h1>Plan Your Next Trip</h1>
            <p>
              Scroll down to guide our airliner and uncover the world’s most celebrated travel sanctuaries.
            </p>
          </div>
        )}

        {/* 4. Scene 4 & 5 — Centered Heading (“MOST-LOVED DESTINATIONS”) */}
        {showHeading && (
          <div
            className="cinematic-heading-reveal"
            style={{
              opacity: headingOpacity,
              transform: `translateY(${headingTranslateY}px)`
            }}
          >
            <span className="cinematic-subtitle">Curated Traveler Favorites</span>
            <h2>Most-Loved Destinations</h2>
          </div>
        )}

        {/* 5. Scene 2 — Wave Flight Airplane & Dynamic Ropes */}
        <div className="cinematic-flight-layer">
          {/* SVG Dynamic Ropes connecting plane tail to each card's anchor */}
          {flightActive && ropesOpacity > 0.01 && (
            <svg className="cinematic-ropes-svg" style={{ opacity: ropesOpacity }}>
              {cardsRenderData.map((c) => {
                if (cardEntryProgresses[c.idx] <= 0.05) return null;
                // Curved bezier rope: Plane tail notch -> Card top anchor
                const ropeStart = { x: planeX - 16, y: planeY + 8 };
                const ropeEnd = { x: c.anchorX, y: c.anchorY };
                const controlX = (ropeStart.x + ropeEnd.x) / 2;
                const controlY = Math.max(ropeStart.y, ropeEnd.y) + 32;

                return (
                  <path
                    key={`rope-${c.idx}`}
                    d={`M ${ropeStart.x} ${ropeStart.y} Q ${controlX} ${controlY} ${ropeEnd.x} ${ropeEnd.y}`}
                    stroke="rgba(208, 106, 76, 0.75)"
                    strokeWidth="1.8"
                    strokeDasharray="4 3"
                    fill="none"
                  />
                );
              })}
            </svg>
          )}

          {/* Soaring Terracotta Airliner following wave trajectory */}
          {flightActive && (
            <div
              className="cinematic-airplane-sprite"
              style={{
                transform: `translate(${planeX}px, ${planeY}px) rotate(${planeAngleDeg + 45}deg)`,
                opacity: flightP < 0.08 ? flightP / 0.08 : flightP > 0.92 ? (1 - flightP) / 0.08 : 1
              }}
            >
              <div className="cinematic-plane-contrail" />
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.3c.4-.2.6-.6.5-1.1z"
                  fill="#D06A4C"
                  stroke="#1C2421"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </div>

        {/* 6. Scene 3, 4, 5 — Three Asymmetrical Zigzag Postcards */}
        <div className="cinematic-cards-stage">
          {cardsRenderData.map((c) => {
            if (cardEntryProgresses[c.idx] <= 0.02) return null;

            let focalScale = 1;
            let focalZIndex = 10 + c.idx;
            let focalOpacity = 1;

            if (c.isFocal) {
              focalScale = 1.18;
              focalZIndex = 30;
              focalOpacity = 1;
            } else if (c.isDimmed) {
              focalScale = 0.90;
              focalZIndex = 8;
              focalOpacity = 0.48;
            }

            // Mobile responsive position adjustments
            const posX = isMobile
              ? stageDimensions.width * 0.5
              : c.x;
            const posY = isMobile
              ? stageDimensions.height * 0.48
              : c.y;

            // In mobile, only display active focal or card 0
            if (isMobile && activeFocal !== -1 && activeFocal !== c.idx) {
              return null;
            }

            return (
              <div
                key={c.dest.id}
                className={`cinematic-postcard-wrap card-slot-${c.idx} ${c.isFocal ? 'is-focal' : ''} ${c.isDimmed ? 'is-dimmed' : ''}`}
                style={{
                  left: `${posX}px`,
                  top: `${posY}px`,
                  transform: `translate(-50%, -50%) rotate(${c.rot}deg) scale(${focalScale})`,
                  zIndex: focalZIndex,
                  opacity: focalOpacity
                }}
              >
                {/* Scene 4: Specific Light Burst behind this flipping card */}
                <div
                  className="cinematic-card-glow-burst"
                  style={{
                    opacity: c.burstOpacity,
                    transform: `translate(-50%, -50%) scale(${0.85 + c.burstOpacity * 0.45})`
                  }}
                />

                {/* Gentle Floating Shell */}
                <div className="cinematic-floating-inner">
                  {/* 3D Flippable Card */}
                  <div
                    className="cinematic-flipper"
                    style={{
                      transform: `rotateY(${c.flipAngle}deg)`
                    }}
                  >
                    {/* --- FRONT: Editorial Postcard --- */}
                    <div className="cinematic-face cinematic-face-front">
                      <div className="cinematic-face-front-header">
                        <span style={{ fontSize: '0.725rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-terracotta)' }}>
                          Sanctuary #0{c.idx + 1}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-faint)' }}>{c.dest.continent}</span>
                      </div>

                      <div className="cinematic-face-front-body">
                        <div className="cinematic-face-front-icon">
                          <Compass size={24} />
                        </div>
                        <h3 className="cinematic-face-front-title">{c.dest.title}</h3>
                        <p className="cinematic-face-front-country">{c.dest.country}</p>
                        <div style={{ marginTop: '10px' }}>
                          <span style={{ fontSize: '0.725rem', padding: '3px 10px', background: 'var(--color-sand)', borderRadius: 'var(--radius-pill)', color: 'var(--color-ink-muted)' }}>
                            Scroll to Flip Photo
                          </span>
                        </div>
                      </div>

                      <div className="cinematic-face-front-footer">
                        <span>{c.dest.season}</span>
                        <span>Budget Tier {formatBudgetTier(c.dest.budget_tier)}</span>
                      </div>
                    </div>

                    {/* --- BACK: High-Definition Photography Reveal --- */}
                    <div className="cinematic-face-back">
                      <img
                        src={c.dest.cover_image || heroImage}
                        alt={`${c.dest.title}, ${c.dest.country}`}
                        onError={(e) => {
                          if (e.currentTarget.src !== heroImage) {
                            e.currentTarget.src = heroImage;
                          }
                        }}
                      />
                      <div className="cinematic-face-back-overlay" />

                      {/* Top Badges */}
                      <div className="cinematic-face-back-top">
                        <div className="cinematic-verified-pill">
                          <Heart size={12} fill="#F1C67E" color="#F1C67E" />
                          <span>
                            {c.dest.verified_likes > 0
                              ? `${c.dest.verified_likes} Itinerary ${c.dest.verified_likes === 1 ? 'Like' : 'Likes'}`
                              : 'Curated Favorite'}
                          </span>
                        </div>

                        <span className="badge badge-sand" style={{ fontSize: '0.725rem' }}>
                          {formatBudgetTier(c.dest.budget_tier)}
                        </span>
                      </div>

                      {/* Bottom Details & Guide Link */}
                      <div className="cinematic-face-back-bottom">
                        <div className="cinematic-face-back-country">
                          <MapPin size={13} color="var(--color-terracotta)" />
                          <span>{c.dest.country}</span>
                        </div>

                        <h3 className="cinematic-face-back-title">{c.dest.title}</h3>

                        <p className="cinematic-face-back-desc">
                          {c.dest.tagline || c.dest.description}
                        </p>

                        <Link
                          to={`/destinations/${c.dest.id}`}
                          onClick={mode === 'overlay' ? handleDismiss : undefined}
                          className="cinematic-face-back-cta"
                          aria-label={`View full travel guide for ${c.dest.title}, ${c.dest.country}`}
                        >
                          <span>Explore {c.dest.title}</span>
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 7. Bottom Navigation Bar & Scroll Status */}
        <footer className="cinematic-bottom-bar">
          <div className="cinematic-timeline-status">
            <span className="cinematic-status-dot" />
            <span>
              {p < 0.16 && 'Scroll down to launch the journey'}
              {p >= 0.16 && p < 0.40 && 'The Terracotta Flight Journey'}
              {p >= 0.40 && p < 0.65 && 'Flipping Postcards into Photography'}
              {p >= 0.65 && p < 0.73 && `Spotlight: ${topDestinations[0]?.title}, ${topDestinations[0]?.country}`}
              {p >= 0.73 && p < 0.81 && `Spotlight: ${topDestinations[1]?.title}, ${topDestinations[1]?.country}`}
              {p >= 0.81 && p < 0.89 && `Spotlight: ${topDestinations[2]?.title}, ${topDestinations[2]?.country}`}
              {p >= 0.89 && (mode === 'overlay' ? 'Scroll to complete • Revealing Homepage' : 'Scroll to complete • Resolving into Catalog')}
            </span>
          </div>
        </footer>
      </aside>
    </div>
  );
}
