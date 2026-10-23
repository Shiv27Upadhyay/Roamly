import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * RouteTransition Component
 * Signature Roamly navigation transition:
 * - Relaxed passenger aircraft glides across the viewport at a calm, natural cruising pace (~1,550ms).
 * - Progressive, soft blush-pink smoke reveal unmasks the incoming page from left to right.
 * - Feathered vapor edge eliminates abrupt jumps, harsh lines, or blank screen flashes.
 * - Airplane, contrail stream, and vapor puffs remain visually synchronized in lockstep.
 * - Coordinated blush-pink vapor palette (#F2A0A8, #F8D8D8, #D96F7D) blending into warm cream veil.
 * - Operates only on genuine pathname changes (query-parameter immune, Back/Forward compatible).
 * - Fully accessible, auto-cleans timers/frames, and respects prefers-reduced-motion.
 */
export default function RouteTransition() {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevPathRef = useRef(location.pathname);
  const isFirstMountRef = useRef(true);

  useEffect(() => {
    // 1. Skip transition on initial app load (InitialLoader handles session entrance)
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }

    // 2. Only trigger on actual pathname changes, ignoring query parameter / filter changes
    if (location.pathname === prevPathRef.current) {
      return;
    }
    prevPathRef.current = location.pathname;

    // 3. Check for prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      return;
    }

    // 4. Trigger signature airplane transition
    setIsTransitioning(true);

    // Relaxed passenger flight runs for 1,550ms; dismiss cleanly at 1,580ms
    const completeTimer = setTimeout(() => {
      setIsTransitioning(false);
    }, 1580);

    // Safety guard at 1,800ms to guarantee overlay never remains active
    const safetyTimer = setTimeout(() => {
      setIsTransitioning(false);
    }, 1800);

    return () => {
      clearTimeout(completeTimer);
      clearTimeout(safetyTimer);
    };
  }, [location.pathname]);

  if (!isTransitioning) return null;

  return (
    <div
      className="route-flight-transition-overlay"
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        pointerEvents: 'none',
        overflow: 'hidden'
      }}
    >
      {/* Flight Assembly: Mist Veil + Blush Contrail + Commercial Aircraft in synchronized lockstep */}
      <div className="route-flight-assembly">
        {/* Soft atmospheric mist veil extending ahead of the flight front */}
        <div className="route-flight-mist-veil" />

        {/* Flight Front containing the Commercial Aircraft and Billowing Contrail */}
        <div className="route-flight-front">
          {/* Main Contrail Ribbon in Blush Pink */}
          <div className="route-vapor-stream" />

          {/* Billowing Contrail Cloud Puffs (layered blush pink, pale rose & muted depth) */}
          <div className="route-vapor-puff puff-1" />
          <div className="route-vapor-puff puff-2" />
          <div className="route-vapor-puff puff-3" />
          <div className="route-vapor-puff puff-4" />

          {/* Commercial Passenger Aircraft (stately cruise angle) */}
          <div className="route-flight-plane">
            <svg
              width="34"
              height="34"
              viewBox="0 0 24 24"
              fill="none"
              style={{ display: 'block', transform: 'rotate(45deg)' }}
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
      </div>

      <style>{`
        .route-flight-assembly {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          animation: routeFlightCruise 1550ms cubic-bezier(0.35, 0.05, 0.25, 1) forwards;
          will-change: transform;
        }

        /* The mist veil extends ahead of the plane, unmasking content progressively with a wide feathered blush-to-cream falloff */
        .route-flight-mist-veil {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 140px;
          width: calc(100vw + 320px);
          background: linear-gradient(
            to right,
            transparent 0%,
            rgba(248, 232, 234, 0.22) 35px,
            rgba(245, 225, 228, 0.45) 85px,
            rgba(250, 246, 242, 0.65) 150px,
            rgba(250, 247, 242, 0.70) 220px,
            rgba(250, 247, 242, 0.70) 100%
          );
        }

        .route-flight-front {
          position: absolute;
          top: 36%;
          left: 140px;
          width: 60px;
          height: 60px;
        }

        .route-vapor-stream {
          position: absolute;
          left: -245px;
          top: 50%;
          transform: translateY(-50%);
          width: 250px;
          height: 18px;
          background: linear-gradient(
            to right,
            transparent 0%,
            rgba(248, 216, 216, 0.35) 25%,
            rgba(242, 160, 168, 0.70) 65%,
            rgba(217, 111, 125, 0.40) 88%,
            rgba(208, 106, 76, 0.40) 98%,
            transparent 100%
          );
          border-radius: var(--radius-pill);
          filter: blur(3px);
          opacity: 0.85;
        }

        .route-vapor-puff {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          transform: translateY(-50%);
        }

        .puff-1 {
          left: -20px;
          top: 50%;
          width: 34px;
          height: 18px;
          background: radial-gradient(ellipse at center, rgba(217, 111, 125, 0.65) 0%, rgba(242, 160, 168, 0.45) 45%, transparent 70%);
          filter: blur(3px);
        }

        .puff-2 {
          left: -65px;
          top: 50%;
          width: 48px;
          height: 24px;
          background: radial-gradient(ellipse at center, rgba(242, 160, 168, 0.70) 0%, rgba(248, 216, 216, 0.40) 50%, transparent 70%);
          filter: blur(5px);
        }

        .puff-3 {
          left: -125px;
          top: 50%;
          width: 64px;
          height: 30px;
          background: radial-gradient(ellipse at center, rgba(248, 216, 216, 0.65) 0%, rgba(252, 240, 240, 0.35) 50%, transparent 70%);
          filter: blur(7px);
        }

        .puff-4 {
          left: -200px;
          top: 50%;
          width: 80px;
          height: 36px;
          background: radial-gradient(ellipse at center, rgba(255, 245, 245, 0.50) 0%, transparent 70%);
          filter: blur(9px);
        }

        .route-flight-plane {
          position: absolute;
          left: 0;
          top: 50%;
          margin-top: -17px;
          transform: rotate(-3deg);
          filter: drop-shadow(0 3px 8px rgba(28, 36, 33, 0.16));
        }

        /* Relaxed passenger aircraft trajectory: gentle rollout, steady cruising speed (~1,550ms), seamless fade-out */
        @keyframes routeFlightCruise {
          0% {
            transform: translateX(-240px);
            opacity: 0;
          }
          5% {
            opacity: 1;
          }
          83% {
            opacity: 1;
          }
          100% {
            transform: translateX(calc(100vw + 60px));
            opacity: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .route-flight-transition-overlay {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
