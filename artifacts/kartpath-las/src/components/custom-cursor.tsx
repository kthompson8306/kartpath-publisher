import { useEffect, useRef } from 'react';

const CLICKABLE = [
  'a',
  'button',
  '[role="button"]',
  'select',
  'input[type="submit"]',
  'input[type="button"]',
  'input[type="checkbox"]',
  'input[type="radio"]',
  '.spread-side-item',
  '.index-row',
  '.biz-card',
  '.filter-pill',
  '.btn-sharp',
  '.dot',
  '.edition-promo',
  '.archive-item',
  '.team-card',
  '.strip-img--carousel',
  '.nav-links a',
  '.footer-grid a',
].join(', ');

/**
 * Subtle custom cursor — a soft ring that expands over clickable elements.
 * Purely additive: native cursor remains visible. Zero React re-renders during
 * mouse movement — all position updates go direct to the DOM via RAF.
 * Automatically does nothing on touch / coarse-pointer devices.
 */
export function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Bail on touch screens — no mouse, no cursor needed.
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const el = ref.current;
    if (!el) return;

    let raf = 0;

    function onMove(e: MouseEvent) {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // translate3d keeps positioning on the GPU compositor thread.
        // translate(-50%,-50%) centers the ring on the cursor tip at any size.
        el.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0) translate(-50%,-50%)`;
      });
      // Make visible on first real mouse movement.
      if (el.style.opacity === '0') el.style.opacity = '1';
    }

    function onOver(e: MouseEvent) {
      const t = e.target as Element | null;
      if (t?.closest(CLICKABLE)) el.classList.add('cursor--on');
    }

    function onOut(e: MouseEvent) {
      const t = e.target as Element | null;
      if (t?.closest(CLICKABLE)) el.classList.remove('cursor--on');
    }

    // Hide when the pointer leaves the viewport entirely.
    function onLeave() { el.style.opacity = '0'; }
    function onEnter() { el.style.opacity = '1'; }

    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseover', onOver, { passive: true });
    document.addEventListener('mouseout', onOut, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    document.documentElement.addEventListener('mouseenter', onEnter);

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      document.documentElement.removeEventListener('mouseenter', onEnter);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="custom-cursor"
      // Start invisible; becomes visible on first mousemove so it doesn't
      // flash at (0,0) before any movement is recorded.
      style={{ opacity: 0 }}
    />
  );
}
