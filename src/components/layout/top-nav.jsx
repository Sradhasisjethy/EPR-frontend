import { useLocation, Link } from 'react-router-dom';
import { Check, Moon, Sun, User, LogOut, Sparkles } from 'lucide-react';
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
  const { colorScheme, setColorScheme, glassMode, toggleGlassMode } = useUIStore();

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
    // No background, no blur, no border, and not sticky. AppShell puts the
    // scroll container on <main>, and this header is its sibling — the page
    // scrolls underneath it, never through it. Every wash I tried here was
    // solving a collision that cannot happen, and over a wallpaper the blur
    // was itself the white band it was meant to avoid.
    <header className="h-16 flex items-center justify-between px-6 shrink-0">
      <div className="flex flex-col justify-center min-w-0">
        <h1 className="text-xl font-bold tracking-tight truncate leading-none">{title}</h1>
        {trail.length > 1 && (
          <p className="text-xs text-muted-foreground truncate mt-1">
            {trail.slice(0, -1).join(' / ')}
          </p>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <GlobalSearch />
        <NotificationBell />

        <div className="relative" ref={dropdownRef}>
          <button
            className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary hover:bg-primary/30 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <User size={18} />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl shadow-lg bg-popover border border-border py-1 z-50 animate-in fade-in slide-in-from-top-2">
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

                <div className="grid grid-cols-2 gap-1.5">
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

                <div className="flex items-center gap-1.5">
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
  );
}
