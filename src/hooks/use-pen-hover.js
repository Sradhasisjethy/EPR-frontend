import { useEffect } from 'react';

/**
 * Restores hover feedback for an Apple Pencil, without restoring it for fingers.
 *
 * Every `hover:` style in the app is gated behind
 * `@media (hover: hover) and (pointer: fine)` (Tailwind's hoverOnlyWhenSupported).
 * That is what stopped iPadOS spending the first tap activating a hover state
 * before it would deliver a click. The cost is that a hover-capable Pencil gets
 * no feedback either, because iPadOS reports the *primary* pointer as coarse
 * regardless of what is being held.
 *
 * Widening the query to `any-hover` would bring the feedback back and the
 * swallowed taps with it. So the distinction is made at the event level
 * instead: `pointerover` carries a `pointerType`, and only `pen` flips the
 * flag. A finger never sets it, so a touch can never be spent on hover.
 *
 * The flag is a data attribute on <html>, so the styling lives in CSS
 * (see [data-pen-hover] in index.css) rather than in inline styles here.
 */
export function usePenHover() {
  useEffect(() => {
    const root = document.documentElement;

    const onOver = (event) => {
      if (event.pointerType === 'pen') root.setAttribute('data-pen-hover', '');
    };

    // pointerout fires when the pen lifts away from the glass; pointerdown
    // clears it too, so the hover highlight does not linger under a tap.
    const clear = (event) => {
      if (!event.pointerType || event.pointerType === 'pen') root.removeAttribute('data-pen-hover');
    };

    window.addEventListener('pointerover', onOver, { passive: true });
    window.addEventListener('pointerout', clear, { passive: true });
    window.addEventListener('pointerdown', clear, { passive: true });
    // A pen leaving the window entirely produces no pointerout on some builds.
    window.addEventListener('blur', clear);

    return () => {
      window.removeEventListener('pointerover', onOver);
      window.removeEventListener('pointerout', clear);
      window.removeEventListener('pointerdown', clear);
      window.removeEventListener('blur', clear);
      root.removeAttribute('data-pen-hover');
    };
  }, []);
}
