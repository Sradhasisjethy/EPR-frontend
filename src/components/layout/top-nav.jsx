import { useLocation } from 'react-router-dom';
import { Moon, Sun, User, LogOut } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useUIStore } from '@/store/ui-store';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { useLogout, useCurrentUser } from '@/hooks/use-auth';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { findNavTrail } from '@/lib/nav-match';

export function TopNav() {
  const { pathname, search } = useLocation();
  const { theme, setTheme } = useTheme();
  const { glassMode } = useUIStore();
  const [mounted, setMounted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const logoutMutation = useLogout();
  const { data: user } = useCurrentUser();

  useEffect(() => {
    setMounted(true);
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    <header className={cn(
      "h-16 flex items-center justify-between px-6 border-b border-border sticky top-0 z-30 transition-all",
      glassMode ? "bg-background/60 backdrop-blur-md" : "bg-card"
    )}>
      <div className="flex items-center">
        <h1 className="text-xl font-semibold">{title}</h1>
        {(trail.length > 1 || segments.length > 0) && (
          <div className="hidden md:flex ml-4 items-center text-sm text-muted-foreground">
            <span className="mx-2">/</span>
            <span>{(trail.length > 0 ? trail : segments).join(' / ')}</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <NotificationBell />

        <button
          className="p-2 rounded-full hover:bg-muted transition-colors relative"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {mounted && theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary hover:bg-primary/30 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <User size={18} />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-card border border-border py-1 z-50 animate-in fade-in slide-in-from-top-2">
              {user && (
                <div className="px-4 py-2 border-b border-border">
                  <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
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
