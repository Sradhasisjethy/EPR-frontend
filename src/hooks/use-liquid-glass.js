import { useEffect } from 'react';

/**
 * The two pieces of liquid glass that CSS cannot do on its own.
 *
 * 1. The specular sheen follows the pointer. CSS has no "where is the cursor
 *    inside this element", so one window-level pointermove listener finds the
 *    glass surface under the pointer and writes its local coordinates into
 *    --id-mx / --id-my on that element. The ::after layer in index.css reads
 *    them. Work is coalesced to one getBoundingClientRect per frame, and only
 *    runs at all for a hovering pointer — a finger gets no sheen, because a
 *    sheen that appears under a tap reads as the tap having missed.
 *
 * 2. Refraction is Chromium-only. `backdrop-filter: url(#svg-filter)` renders
 *    there and nowhere else — WebKit and Gecko drop the declaration — so the
 *    flag that switches the rail and the top bar from blur() to the
 *    displacement filter is set here, after a capability check, rather than
 *    in a stylesheet that cannot tell the engines apart.
 *
 * Both are attributes on the DOM, so the look stays in CSS (see LIQUID GLASS
 * in index.css) and nothing here styles anything.
 */

const GLASS = '.glass-card, .glass-surface, .bg-card, aside';

function supportsSvgBackdrop() {
  if (typeof CSS === 'undefined' || !CSS.supports) return false;
  const parses =
    CSS.supports('backdrop-filter', 'url(#id-liquid-refract)') ||
    CSS.supports('-webkit-backdrop-filter', 'url(#id-liquid-refract)');
  if (!parses) return false;
  // Parsing is not rendering: Gecko accepts the value and paints nothing.
  // Chromium is the engine that draws it, and every Chromium shell (Edge,
  // Brave, Opera) advertises the Chromium brand.
  const brands = navigator.userAgentData?.brands;
  if (brands) return brands.some((b) => /chromium/i.test(b.brand));
  const ua = navigator.userAgent;
  return /Chrome\/\d+/.test(ua) && !/Edge\/\d+/.test(ua);
}

export function useLiquidGlass(enabled) {
  useEffect(() => {
    if (!enabled) return undefined;
    const root = document.documentElement;

    if (supportsSvgBackdrop()) root.setAttribute('data-liquid-refract', '');

    const canHover = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
    if (!canHover) {
      return () => root.removeAttribute('data-liquid-refract');
    }

    let current = null;
    let frame = 0;
    let lastX = 0;
    let lastY = 0;

    const paint = () => {
      frame = 0;
      if (!current) return;
      const rect = current.getBoundingClientRect();
      current.style.setProperty('--id-mx', `${Math.round(lastX - rect.left)}px`);
      current.style.setProperty('--id-my', `${Math.round(lastY - rect.top)}px`);
    };

    const leave = () => {
      if (!current) return;
      current.removeAttribute('data-liquid-hover');
      current.removeAttribute('data-liquid-press');
      current = null;
    };

    const onMove = (event) => {
      if (event.pointerType === 'touch') return;
      const target = event.target instanceof Element ? event.target.closest(GLASS) : null;
      if (target !== current) {
        leave();
        current = target;
        if (current) current.setAttribute('data-liquid-hover', '');
      }
      if (!current) return;
      lastX = event.clientX;
      lastY = event.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const onDown = (event) => {
      if (event.pointerType === 'touch' || !current) return;
      current.setAttribute('data-liquid-press', '');
    };

    const onUp = () => {
      if (current) current.removeAttribute('data-liquid-press');
    };

    const onOut = (event) => {
      // Only when the pointer leaves the window; moving between elements is
      // handled by onMove, which already knows the new surface.
      if (!event.relatedTarget) leave();
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });
    window.addEventListener('pointerout', onOut, { passive: true });
    window.addEventListener('blur', leave);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('pointerout', onOut);
      window.removeEventListener('blur', leave);
      if (frame) cancelAnimationFrame(frame);
      leave();
      root.removeAttribute('data-liquid-refract');
    };
  }, [enabled]);
}
