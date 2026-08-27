/**
 * INFIDEEP brand lockup.
 *
 * The artwork lives in `public/` as two SVGs rather than inline markup so the
 * brand asset can be swapped without touching React:
 *
 *   /infideep-logo.svg  mark + INFIDEEP wordmark (258 x 104)
 *   /infideep-mark.svg  mark only               (97 x 72)
 *
 * The mark is true vector — traced from the brand artwork and filled with the
 * canonical #ff0055 -> #ff8c00 gradient, so it stays sharp at any size. The
 * wordmark is a custom face with no font file available, so it rides along
 * inside the lockup as a lossless alpha raster.
 *
 * `glow` adds the neon bloom the brand uses on dark grounds.
 */
export function InfideepLogo({ className = '', showWordmark = true, glow = false }) {
  return (
    <img
      src={showWordmark ? '/infideep-logo.svg' : '/infideep-mark.svg'}
      alt="INFIDEEP"
      className={`${glow ? 'id-logo-glow ' : ''}${className}`}
      draggable="false"
    />
  );
}
