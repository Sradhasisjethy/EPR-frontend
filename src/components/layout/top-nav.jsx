import { useLocation, Link } from 'react-router-dom';
import { Check, Menu, Moon, Sun, User, LogOut, Sparkles } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState, useEffect, useRef } from 'react';
import { useLogout, useCurrentUser } from '@/hooks/use-auth';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { findNavTrail } from '@/lib/nav-match';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { GlobalSearch } from './global-search';
import { useUIStore } from '@/store/ui-store';
import { PALETTES } from '@/constants/palettes';
import { cn } from '@/lib/utils';

export function TopNav() {
  const { pathname, search } = useLocation();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const logoutMutation = useLogout();
  const { data: user } = useCurrentUser();
  const { colorScheme, setColorScheme, glassMode, toggleGlassMode, setSidebarOpen } = useUIStore();

  useEffect(() => {
    setMounted(true);
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    // pointerdown, not mousedown: a pen or finger does not always
    // produce a mouse event before the tap lands, so the menu could
    // stay open behind whatever was tapped next.
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  // Titles come from the sidebar tree rather than the URL, so a shared route reads
  // as its module ("Purchase / Returns"), not as a slug ("Returns").
  const trail = findNavTrail(pathname, search);
  const segments = pathname.split('/').filter(Boolean);
  const title = trail.length > 0
    ? trail[trail.length - 1]
    : segments.length > 0
      ? segments[segments.length - 1].charAt(0).toUpperCase() + segments[segments.length - 1].slice(1).replace(/-/g, ' ')
      : 'Dashboard';

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logoutMutation.mutate();
  };

  return (
    <div className={cn("shrink-0 transition-all duration-300 relative z-40", glassMode ? "px-4 sm:px-6 pt-3 pb-1" : "")}>
      <header
        className={cn(
          "flex items-center justify-between gap-2 transition-all duration-300 max-w-7xl mx-auto relative z-40",
          glassMode
            ? "glass-card h-14 rounded-2xl border px-4 sm:px-5 shadow-xs"
            : "h-16 px-4 sm:px-6"
        )}
      >
        {/* Below lg the rail is off-screen, so this is the only way into it. */}
        <button
          onClick={() => setSidebarOpen(true)}
          className={cn(
            "lg:hidden -ml-2 mr-1 p-2 rounded-xl transition-colors shrink-0",
            glassMode
              ? "text-foreground hover:bg-white/20 dark:hover:bg-white/10"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
          )}
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>

        <div className="flex flex-col justify-center min-w-0 flex-1">
          <h1 className={cn("text-xl font-bold tracking-tight truncate leading-none", glassMode && "text-foreground drop-shadow-xs")}>
            {title}
          </h1>
          {trail.length > 1 && (
            <p className={cn("text-xs truncate mt-1", glassMode ? "text-foreground/75 font-medium" : "text-muted-foreground")}>
              {trail.slice(0, -1).join(' / ')}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="hidden sm:block"><GlobalSearch /></div>
          <NotificationBell />

          <div className="relative z-50" ref={dropdownRef}>
            <button
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
                glassMode
                  ? "bg-primary/30 text-primary border border-white/20 shadow-xs hover:bg-primary/40"
                  : "bg-primary/20 text-primary hover:bg-primary/30"
              )}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <User size={18} />
            </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl shadow-2xl bg-popover border border-border py-1 z-50 animate-in fade-in slide-in-from-top-2">
              {user && (
                <div className="px-4 py-2 border-b border-border">
                  <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              )}
              {/* Appearance lives here as well as in Settings: changing the
                  theme is a glance-and-flip action, and making someone open a
                  settings page to do it is the reason the standalone moon icon
                  existed. That icon is gone now — one place in the header, not
                  two. */}
              <div className="px-4 py-3 border-b border-border space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Appearance</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {[['light', 'Light', Sun], ['dark', 'Dark', Moon]].map(([value, label, Icon]) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value)}
                      className={cn(
                        'flex items-center justify-center gap-1.5 h-8 rounded-lg border text-xs font-medium transition-colors',
                        mounted && theme === value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      <Icon size={13} /> {label}
                    </button>
                  ))}
                </div>

                {/* Wraps rather than overflows: on a coarse pointer each swatch
                    is forced to 44px by the hit-target rule, and seven of those
                    do not fit one row of a dropdown. */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {PALETTES.map((p) => (
                    <button
                      key={p.id}
                      title={p.name}
                      aria-label={p.name}
                      onClick={() => setColorScheme(p.id)}
                      className={cn(
                        'relative w-6 h-6 rounded-full shadow-sm ring-1 ring-black/5 dark:ring-white/10 transition-transform hover:scale-110',
                        p.color,
                        colorScheme === p.id && 'ring-2 ring-offset-2 ring-offset-popover ring-foreground/60'
                      )}
                    >
                      {colorScheme === p.id && (
                        <Check size={12} className="absolute inset-0 m-auto text-white drop-shadow" />
                      )}
                    </button>
                  ))}
                </div>

                <button
                  onClick={toggleGlassMode}
                  className="w-full flex items-center justify-between gap-2 text-sm text-foreground hover:text-primary transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles size={14} className="text-muted-foreground" />
                    Glassmorphism
                  </span>
                  <span
                    className={cn(
                      'relative w-9 h-5 rounded-full transition-colors shrink-0',
                      glassMode ? 'bg-primary' : 'bg-muted-foreground/30'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
                        glassMode ? 'left-[18px]' : 'left-0.5'
                      )}
                    />
                  </span>
                </button>
              </div>

              {/* Hidden for PLATFORM_ADMIN, which in practice is the firm's owner
                  rather than staff. The page behind this link is an HR record —
                  joining date, issued assets, employment documents — and none of
                  it applies to someone who is not an employee.

                  A role check on purpose, not an isSystem check: the owner is a
                  real person with a real employee row, so isSystem is false for
                  them. Revisit once the owner-vs-employee modelling is settled
                  with the client. The page also has no change-password or edit,
                  which is what an account page should actually offer. */}
              {user && user.role !== 'PLATFORM_ADMIN' && (
                <Link
                  to="/profile"
                  onClick={() => setIsDropdownOpen(false)}
                  className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted flex items-center transition-colors"
                >
                  <User size={16} className="mr-2" />
                  My Profile
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-muted flex items-center transition-colors"
              >
                <LogOut size={16} className="mr-2" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  </div>
);
}
