import React, { useState, useEffect, useRef } from 'react';

const SESSION_KEY = 'roamly_initial_flight_seen';

/**
 * Determine if the loader should be shown for this session.
 * Safely handles SSR, sessionStorage, and prefers-reduced-motion.
 */
function shouldShowLoader() {
  if (typeof window === 'undefined') return false;
  try {
    // 1. If already seen in this browser session, skip immediately
    if (sessionStorage.getItem(SESSION_KEY)) return false;

    // 2. If user prefers reduced motion, mark session seen and skip
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * InitialLoader Component
 * - Displays a refined, editorial airplane flight screen on the first visit of a session.
 * - Warm cream radial atmosphere, centered Roamly wordmark, terracotta airliner with blush-pink vapor mist.
 * - Understated ambient status indicator (never falsely implies percentage progress).
 * - Dual auto-dismiss engine: CSS animation/transition events + backup setTimeout safety timers.
 * - React Strict Mode safe (no stuck overlays or orphaned timers).
 */
export default function InitialLoader() {
  const [shouldAnimate] = useState(() => shouldShowLoader());
  const [visible, setVisible] = useState(shouldAnimate);
  const [fading, setFading] = useState(false);
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (!shouldAnimate) return;

    const dismiss = () => {
      if (dismissedRef.current) return;
      dismissedRef.current = true;
      try {
        sessionStorage.setItem(SESSION_KEY, 'true');
      } catch {
        // Storage might be restricted in some private modes
      }
      setVisible(false);
    };

    // 1. Auto fade-out initiation at 950ms (aligns with 950ms plane travel)
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 950);

    // 2. Auto unmount timer at 1250ms (allows 300ms fade-out transition)
    const unmountTimer = setTimeout(() => {
      dismiss();
    }, 1250);

    // 3. Absolute safety fallback timeout (1500ms) to ensure overlay NEVER gets stuck
    const safetyTimer = setTimeout(() => {
      dismiss();
    }, 1500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
      clearTimeout(safetyTimer);
    };
  }, [shouldAnimate]);

  if (!visible) return null;

  const handlePlaneAnimationEnd = () => {
    // When airplane finishes traversing, start smooth fade-out immediately
    setFading(true);
  };

  const handleOverlayTransitionEnd = (e) => {
    // When fade-out transition finishes, unmount cleanly
    if (e.target === e.currentTarget && fading) {
      if (!dismissedRef.current) {
        dismissedRef.current = true;
        try {
          sessionStorage.setItem(SESSION_KEY, 'true');
        } catch {
          // ignore storage error
        }
        setVisible(false);
      }
    }
  };

  return (
    <aside
      aria-label="Roamly initial flight screen"
      aria-live="polite"
      onTransitionEnd={handleOverlayTransitionEnd}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'radial-gradient(ellipse 70% 60% at 50% 48%, #FFFFFF 0%, #FAF7F2 65%, #F4ECE2 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fading ? 0 : 1,
        transition: 'opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: fading ? 'none' : 'auto',
        userSelect: 'none'
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '420px',
          width: '90%',
          textAlign: 'center'
        }}
      >
        {/* Brand Wordmark & Editorial Tag */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: '2.25rem',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              color: '#1C2421',
              lineHeight: 1.1
            }}
          >
            Roamly<span style={{ color: '#D06A4C' }}>.</span>
          </div>
          <div
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: '0.74rem',
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'rgba(28, 36, 33, 0.44)',
              marginTop: '6px'
            }}
          >
            Curated Travel Journals
          </div>
        </div>

        {/* Flight Track & Animated Plane */}
        <div
          style={{
            position: 'relative',
            width: '280px',
            height: '52px',
            display: 'flex',
            alignItems: 'center',
            marginBottom: '24px'
          }}
        >
          {/* Subtle Ambient Track Glow in Blush Rose */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '10px',
              right: '10px',
              height: '16px',
              background: 'radial-gradient(ellipse at center, rgba(242, 160, 168, 0.12) 0%, transparent 75%)',
              transform: 'translateY(-50%)',
              pointerEvents: 'none'
            }}
          />

          {/* Dashed Flight Track Line */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              height: '2px',
              borderTop: '2px dashed #D2C8BC',
              transform: 'translateY(-50%)'
            }}
          />

          {/* Departure Waypoint */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: '50%',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#D06A4C',
              boxShadow: '0 0 0 3px rgba(208, 106, 76, 0.15)',
              transform: 'translateY(-50%)'
            }}
          />

          {/* Arrival Waypoint */}
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              border: '2px solid #D06A4C',
              backgroundColor: '#FAF7F2',
              boxShadow: '0 0 0 3px rgba(208, 106, 76, 0.12)',
              transform: 'translateY(-50%)'
            }}
          />

          {/* Gliding Airplane with Integrated Blush Vapor Contrail */}
          <div
            className="roamly-flight-plane"
            onAnimationEnd={handlePlaneAnimationEnd}
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              marginTop: '-14px',
              animation: 'roamlyFlightTravel 950ms cubic-bezier(0.3, 0.05, 0.25, 1) forwards'
            }}
          >
            {/* Streamlined Blush-Pink Vapor Contrail Stream */}
            <div
              className="roamly-plane-vapor-stream"
              style={{
                position: 'absolute',
                right: 'calc(100% - 6px)',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '64px',
                height: '8px',
                background: 'linear-gradient(to left, rgba(208, 106, 76, 0.35) 0%, rgba(242, 160, 168, 0.6) 35%, rgba(248, 216, 216, 0.35) 70%, transparent 100%)',
                borderRadius: '9999px',
                filter: 'blur(2px)',
                pointerEvents: 'none'
              }}
            />

            {/* Layered Blush Vapor Mist Puffs */}
            <div
              className="roamly-plane-vapor-puff"
              style={{
                position: 'absolute',
                right: 'calc(100% + 14px)',
                top: '40%',
                transform: 'translateY(-50%)',
                width: '18px',
                height: '12px',
                background: 'radial-gradient(ellipse at center, rgba(242, 160, 168, 0.55) 0%, rgba(248, 216, 216, 0.3) 50%, transparent 70%)',
                borderRadius: '50%',
                filter: 'blur(2.5px)',
                pointerEvents: 'none'
              }}
            />
            <div
              className="roamly-plane-vapor-puff-outer"
              style={{
                position: 'absolute',
                right: 'calc(100% + 32px)',
                top: '30%',
                transform: 'translateY(-50%)',
                width: '24px',
                height: '14px',
                background: 'radial-gradient(ellipse at center, rgba(248, 216, 216, 0.45) 0%, transparent 70%)',
                borderRadius: '50%',
                filter: 'blur(3.5px)',
                pointerEvents: 'none'
              }}
            />

            {/* Airplane Silhouette */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              style={{
                display: 'block',
                transform: 'rotate(45deg)',
                filter: 'drop-shadow(0 2px 4px rgba(28, 36, 33, 0.14))'
              }}
            >
              <path
                d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.3c.4-.2.6-.6.5-1.1z"
                fill="#D06A4C"
                stroke="#1C2421"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Subtle Ambient Status Indicator */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                backgroundColor: '#D06A4C',
                animation: 'roamlyDotPulse 1.6s ease-in-out infinite'
              }}
            />
            <span
              style={{
                fontSize: '0.82rem',
                color: '#55645F',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontWeight: 600
              }}
            >
              Preparing your travel journal
            </span>
          </div>

          {/* Understated hairline in blush rose that pulses gently without false measurable progress */}
          <div
            style={{
              width: '54px',
              height: '1.5px',
              background: 'linear-gradient(to right, transparent, rgba(242, 160, 168, 0.45), transparent)',
              borderRadius: '9999px',
              marginTop: '10px',
              animation: 'roamlyLineGlow 2s ease-in-out infinite'
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes roamlyFlightTravel {
          0% {
            transform: translateX(-10px) translateY(3px);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            transform: translateX(254px) translateY(-3px);
            opacity: 0.95;
          }
        }

        @keyframes roamlyDotPulse {
          0%, 100% {
            transform: scale(0.9);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.25);
            opacity: 1;
          }
        }

        @keyframes roamlyLineGlow {
          0%, 100% {
            opacity: 0.3;
            transform: scaleX(0.85);
          }
          50% {
            opacity: 0.75;
            transform: scaleX(1.15);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .roamly-flight-plane {
            animation: none !important;
          }
        }
      `}</style>
    </aside>
  );
}
