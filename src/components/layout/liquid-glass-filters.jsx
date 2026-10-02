/**
 * The displacement filter behind liquid glass refraction.
 *
 * Referenced from index.css as `backdrop-filter: url('#id-liquid-refract')`
 * on the rail and the top bar, and only on Chromium (see use-liquid-glass.js
 * for the gate). The chain is: a low-frequency noise field, softened so the
 * lensing is smooth rather than grainy; the backdrop displaced through it so
 * what sits behind the glass bends; then the same blur and saturation the
 * CSS fallback uses, because a url() filter replaces the whole filter list
 * rather than adding to it.
 *
 * The SVG is zero-size and out of flow: it exists only to host the <filter>.
 */
export function LiquidGlassFilters() {
  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <defs>
        <filter id="id-liquid-refract" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.0045 0.0075" numOctaves="2" seed="11" result="field" />
          <feGaussianBlur in="field" stdDeviation="4" result="softField" />
          <feDisplacementMap in="SourceGraphic" in2="softField" scale="34" xChannelSelector="R" yChannelSelector="G" result="bent" />
          <feGaussianBlur in="bent" stdDeviation="20" result="frosted" />
          <feColorMatrix in="frosted" type="saturate" values="1.9" />
        </filter>
      </defs>
    </svg>
  );
}
