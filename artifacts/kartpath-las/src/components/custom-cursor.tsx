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
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    // Capture as HTMLDivElement (not HTMLDivElement | null) so TypeScript
    // accepts it inside all closure callbacks without null-check repetition.
    const el = ref.current;
    if (!el) return;
    const cursor: HTMLDivElement = el;

    let raf = 0;

    function onMove(e: MouseEvent) {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        cursor.style.transform =
          `translate3d(${e.clientX}px,${e.clientY}px,0) translate(-50%,-50%)`;
      });
      if (cursor.style.opacity === '0') cursor.style.opacity = '1';
    }

    function onOver(e: MouseEvent) {
      if ((e.target as Element | null)?.closest(CLICKABLE)) {
        cursor.classList.add('cursor--on');
      }
    }

    function onOut(e: MouseEvent) {
      if ((e.target as Element | null)?.closest(CLICKABLE)) {
        cursor.classList.remove('cursor--on');
      }
    }

    function onLeave() { cursor.style.opacity = '0'; }
    function onEnter() { cursor.style.opacity = '1'; }

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
      style={{ opacity: 0 }}
    />
  );
}
