/**
 * The colour schemes offered in Appearance.
 *
 * Shared between the Settings page and the avatar menu so the two lists cannot
 * drift — adding a palette here is enough for it to appear in both. The `id` is
 * what lands on the `data-color-scheme` attribute and selects the token block
 * in index.css.
 *
 * Each swatch is a gradient, and deliberately the *same* pair the scheme
 * actually applies: `--primary` into that palette's `--nav-to`. A flat dot
 * showed only half of what you were choosing, which made the two-stop active
 * navigation row a surprise rather than a preview.
 */
export const PALETTES = [
  // The house ramp, so the chrome can match the logo.
  { id: 'infideep', name: 'Infideep', color: 'bg-gradient-to-br from-[#ff0055] to-[#ff8c00]' },
  { id: 'sapphire', name: 'Sapphire', color: 'bg-gradient-to-br from-blue-500 to-violet-500' },
  { id: 'emerald', name: 'Emerald', color: 'bg-gradient-to-br from-emerald-500 to-teal-500' },
  { id: 'amber', name: 'Amber', color: 'bg-gradient-to-br from-amber-400 to-orange-500' },
  { id: 'ruby', name: 'Ruby', color: 'bg-gradient-to-br from-rose-500 to-pink-500' },
  { id: 'violet', name: 'Violet', color: 'bg-gradient-to-br from-violet-500 to-fuchsia-500' },
  { id: 'slate', name: 'Slate', color: 'bg-gradient-to-br from-slate-600 to-slate-400' },
];
