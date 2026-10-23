import React, { useEffect, useRef } from 'react';

/**
 * CursorTrail Component
 * Signature Roamly airplane cursor smoke trail:
 * - Active on desktop devices with a fine pointer only.
 * - Stops completely when the mouse stops moving (zero idle RAF / CPU usage).
 * - Bounded particle pool (max 32 particles) for rock-solid performance.
 * - Zero React re-renders on mousemove (pure 2D Canvas rendering).
 * - Coordinated blush-pink smoke palette:
 *     * Main smoke: soft blush pink (~#F2A0A8)
 *     * Highlights: pale rose (~#F8D8D8)
 *     * Depth: muted rose (~#D96F7D, used sparingly)
 * - Shorter, refined trail (~400–500 ms fade duration) with gentle drift and smooth dissipation.
 * - Tuned visible density: ~10–15% fuller through modest particle overlap and soft opacity feathering.
 * - Non-blocking: pointer-events: none guarantees no click/selection/form interference.
 * - Completely disabled on mobile/touch devices and when prefers-reduced-motion is active.
 */
export default function CursorTrail() {
  const canvasRef = useRef(null);

  useEffect(() => {
    // 1. Guard: Check fine pointer & hover capability (desktop only)
    const isFinePointer =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    // 2. Guard: Check prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!isFinePointer || prefersReducedMotion) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);

    const handleResize = () => {
      dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    window.addEventListener('resize', handleResize, { passive: true });

    // Bounded particle pool: 32 particles (accommodates modest overlap with zero lag)
    const MAX_PARTICLES = 32;
    const particles = [];
    let lastX = -1;
    let lastY = -1;
    let rafId = null;
    let lastTime = performance.now();

    const render = (now) => {
      const dt = Math.min(now - lastTime, 50); // cap delta time to 50ms to prevent jumps on tab switch
      lastTime = now;

      // Clear the logical canvas area
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.age += dt;
        const progress = p.age / p.life;

        if (progress >= 1) {
          particles.splice(i, 1);
          continue;
        }

        // Natural physics: gentle counter-drift, subtle thermal rise, and slight atmospheric drag
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.014; // subtle upward thermal float
        p.vx *= 0.98;

        // Smooth non-linear expansion (starts expanding softly, then gently decelerates)
        const currentRadius = p.initialRadius + (p.maxRadius - p.initialRadius) * Math.sin((progress * Math.PI) / 2);
        // Smooth non-linear fade (gracefully dissipates over 400-500ms)
        const currentAlpha = p.baseAlpha * Math.pow(1 - progress, 1.25);

        if (currentAlpha <= 0.005 || currentRadius <= 0) {
          particles.splice(i, 1);
          continue;
        }

        // Draw soft, feathered vapor cloud puff using multi-stop radial gradient
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentRadius);
        grad.addColorStop(0, `rgba(${p.rgb}, ${currentAlpha.toFixed(3)})`);
        grad.addColorStop(0.42, `rgba(${p.rgb}, ${(currentAlpha * 0.68).toFixed(3)})`);
        grad.addColorStop(0.78, `rgba(${p.rgb}, ${(currentAlpha * 0.28).toFixed(3)})`);
        grad.addColorStop(1, `rgba(${p.rgb}, 0)`);

        ctx.beginPath();
        ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      if (particles.length > 0) {
        rafId = requestAnimationFrame(render);
      } else {
        rafId = null;
      }
    };

    const handleMouseMove = (e) => {
      const curX = e.clientX;
      const curY = e.clientY;

      if (lastX === -1) {
        lastX = curX;
        lastY = curY;
        return;
      }

      const dx = curX - lastX;
      const dy = curY - lastY;
      const dist = Math.hypot(dx, dy);

      // Tuned spawn threshold (6.8px) provides ~10-15% fuller density and modest overlap without clumping
      if (dist > 6.8) {
        lastX = curX;
        lastY = curY;

        // Spawn position: at the tail notch of the plane cursor (hotspot 2,2 -> tail notch at +13,+13)
        const spawnX = curX + 13 + (Math.random() * 2 - 1);
        const spawnY = curY + 13 + (Math.random() * 2 - 1);

        // Coordinated blush-pink smoke palette:
        // - 50% Soft blush pink (#F2A0A8 / 242, 160, 168) — main smoke body
        // - 35% Pale rose (#F8D8D8 / 248, 216, 216) — luminous highlights
        // - 15% Muted rose (#D96F7D / 217, 111, 125) — subtle depth shading, used sparingly
        const rand = Math.random();
        let rgb;
        let baseAlpha;
        let initialRadius;
        let maxRadius;

        if (rand < 0.50) {
          // Main smoke: soft blush pink (slightly fuller body, alpha 0.39)
          rgb = '242, 160, 168';
          baseAlpha = 0.39;
          initialRadius = 4.0 + Math.random() * 1.2;
          maxRadius = 12.8 + Math.random() * 2.5;
        } else if (rand < 0.85) {
          // Highlight: pale rose (subtle highlight, alpha 0.46)
          rgb = '248, 216, 216';
          baseAlpha = 0.46;
          initialRadius = 3.5 + Math.random() * 1.0;
          maxRadius = 11.2 + Math.random() * 2.0;
        } else {
          // Depth: muted rose (sparingly for cloud volume, alpha 0.25)
          rgb = '217, 111, 125';
          baseAlpha = 0.25;
          initialRadius = 3.8 + Math.random() * 1.0;
          maxRadius = 11.8 + Math.random() * 2.0;
        }

        // Fade duration: 400ms to 500ms (~450ms average, preserving shorter trail)
        const life = 400 + Math.random() * 100;

        // Gentle counter-velocity behind cursor trajectory with slight organic scatter
        const vx = -dx * 0.032 + (Math.random() - 0.5) * 0.22;
        const vy = -dy * 0.032 + (Math.random() - 0.5) * 0.22;

        particles.push({
          x: spawnX,
          y: spawnY,
          vx,
          vy,
          initialRadius,
          maxRadius,
          baseAlpha,
          rgb,
          age: 0,
          life
        });

        // Keep particle count bounded
        if (particles.length > MAX_PARTICLES) {
          particles.shift();
        }

        if (!rafId) {
          lastTime = performance.now();
          rafId = requestAnimationFrame(render);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9997
      }}
    />
  );
}
