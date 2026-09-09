import { cn } from '@/lib/utils';

/**
 * The headline figure on the dashboard.
 *
 * Colour carries meaning rather than decoration: an accent groups the tiles in
 * a row, and `tone` overrides the figure's colour when the value itself is bad
 * news. A tile that is red because it is the production tile and a tile that is
 * red because stock ran out must not look alike, so `tone` always wins on the
 * number while the accent stays on the frame.
 *
 * Each accent is three coordinated pieces — a wash across the card, a solid
 * gradient chip behind the icon, and a bloom in the same hue. The wash is kept
 * to the top-left corner and fades out well before the text, so the figure
 * always sits on the card's own surface and stays legible in both themes.
 */

const ACCENTS = {
  rose: {
    ring: 'border-rose-500/45 dark:border-rose-400/45',
    wash: 'from-rose-500/[0.14] via-rose-500/[0.03]',
    glow: 'shadow-[0_10px_30px_-14px] shadow-rose-500/60',
    chip: 'bg-gradient-to-br from-rose-500 to-rose-600 shadow-lg shadow-rose-500/35',
  },
  amber: {
    ring: 'border-amber-500/45 dark:border-amber-400/45',
    wash: 'from-amber-500/[0.16] via-amber-500/[0.04]',
    glow: 'shadow-[0_10px_30px_-14px] shadow-amber-500/60',
    chip: 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/35',
  },
  lime: {
    ring: 'border-lime-500/45 dark:border-lime-400/45',
    wash: 'from-lime-500/[0.15] via-lime-500/[0.03]',
    glow: 'shadow-[0_10px_30px_-14px] shadow-lime-500/60',
    chip: 'bg-gradient-to-br from-lime-400 to-emerald-500 shadow-lg shadow-lime-500/35',
  },
  sky: {
    ring: 'border-sky-500/45 dark:border-sky-400/45',
    wash: 'from-sky-500/[0.15] via-sky-500/[0.03]',
    glow: 'shadow-[0_10px_30px_-14px] shadow-sky-500/60',
    chip: 'bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg shadow-sky-500/35',
  },
  violet: {
    ring: 'border-violet-500/45 dark:border-violet-400/45',
    wash: 'from-violet-500/[0.15] via-violet-500/[0.03]',
    glow: 'shadow-[0_10px_30px_-14px] shadow-violet-500/60',
    chip: 'bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-500/35',
  },
  teal: {
    ring: 'border-teal-500/45 dark:border-teal-400/45',
    wash: 'from-teal-500/[0.15] via-teal-500/[0.03]',
    glow: 'shadow-[0_10px_30px_-14px] shadow-teal-500/60',
    chip: 'bg-gradient-to-br from-teal-400 to-cyan-600 shadow-lg shadow-teal-500/35',
  },
};

const TONES = {
  good: 'text-emerald-600 dark:text-emerald-400',
  warn: 'text-amber-600 dark:text-amber-400',
  danger: 'text-destructive',
};

export function KpiTile({ icon: Icon, label, value, hint, hintTone, accent = 'sky', tone }) {
  const palette = ACCENTS[accent] || ACCENTS.sky;

  return (
    <div
      className={cn(
        'relative overflow-hidden p-4 rounded-2xl border bg-card id-pointer-zoom',
        palette.ring,
        palette.glow
      )}
    >
      {/* The wash is its own layer rather than a background on the card, so the
          card's own surface — including the translucency glass mode gives it —
          shows through underneath. */}
      <div
        aria-hidden
        className={cn('absolute inset-0 bg-gradient-to-br to-transparent pointer-events-none', palette.wash)}
      />

      <div className="relative flex items-start gap-3">
        {Icon && (
          <div
            className={cn(
              'shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-white',
              palette.chip
            )}
          >
            <Icon size={20} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
          <p className={cn('text-2xl font-bold mt-0.5 tabular-nums truncate', tone && TONES[tone])}>{value}</p>
          {hint && (
            <p className={cn('text-xs mt-0.5 truncate', hintTone ? TONES[hintTone] : 'text-muted-foreground')}>
              {hint}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** A titled panel, so every card on the dashboard is framed the same way. */
export function Panel({ title, action, className, children }) {
  // No pointer zoom here: a panel holds a chart or a table, and scaling it while
  // someone is reading a row inside it is a nuisance rather than an affordance.
  // The KPI tiles are the "boxes" worth reacting.
  return (
    <div className={cn('p-4 rounded-2xl border border-border bg-card space-y-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
