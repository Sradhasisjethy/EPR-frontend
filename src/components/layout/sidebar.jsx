import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
// import { LogOut } from 'lucide-react';  // for the commented-out footer block
import { useUIStore } from '@/store/ui-store';
import { useCurrentUser } from '@/hooks/use-auth';
// import { useLogout } from '@/hooks/use-auth';  // for the commented-out footer block
import { usePermissions } from '@/hooks/use-permissions';
import { NAVIGATION } from '@/constants/navigation';
import { applyNavPreferences } from '@/lib/nav-preferences';
import { isNavHrefActive } from '@/lib/nav-match';
import { cn } from '@/lib/utils';
import { InfideepLogo } from '@/components/auth/infideep-logo';

/**
 * The navigation rail.
 *
 * Two shapes, both driven by the same list: a 76px rail of icons, and a 248px
 * column with labels. The rail names each icon through its title attribute
 * rather than on screen, so the column stays narrow.
 *
 * The active row uses the brand ramp (see .id-nav-active) rather than a flat
 * tint — beside a floating panel a flat fill reads as hover, and the current
 * module has to be unmistakable at a glance.
 *
 * The tree is flat — every entry is a destination, none has children — so
 * neither shape needs an accordion. An earlier version carried one; it was dead
 * code against this navigation and is gone.
 */
export function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, glassMode } = useUIStore();
  const { pathname, search } = useLocation();
  const { data: user } = useCurrentUser();
  const { hasPermission, hasAnyPermission } = usePermissions();
  // const logoutMutation = useLogout();  // only the footer block below used this

  const isActiveHref = (href) => isNavHrefActive(href, pathname, search);

  // Hide what the user cannot reach, then drop any group left with nothing in it.
  const navigation = useMemo(() => {
    const allowed = (item) => {
      if (item.anyPermissions) return hasAnyPermission(item.anyPermissions);
      if (item.permission) return hasPermission(item.permission);
      return true;
    };
    const permitted = NAVIGATION.filter(allowed)
      .map((item) => (item.children ? { ...item, children: item.children.filter(allowed) } : item))
      .filter((item) => !item.children || item.children.length > 0);

    // The tenant's customisation is applied AFTER the permission filter, never
    // before — hiding is cosmetic and must not be able to reveal a module the
    // user holds no grant for.
    return applyNavPreferences(permitted, user?.navigationPreferences);
  }, [user, hasPermission, hasAnyPermission]);

  // Only the commented-out footer block below used these.
  // const displayName = user?.name || 'User';
  // const initials = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
  // const role = user?.role ? user.role.replace(/_/g, ' ') : 'User';

  return (
    <aside
      className={cn(
        // Floating panel rather than a full-height edge-to-edge column: the
        // inset and the rounding are what separate the chrome from the content.
        'fixed top-3 bottom-3 left-3 z-40 flex flex-col rounded-3xl border id-panel-edge',
        'transition-all duration-300 ease-in-out overflow-hidden',
        glassMode ? 'bg-background/80 backdrop-blur-2xl' : 'bg-card',
        sidebarCollapsed ? 'w-[76px]' : 'w-[248px]'
      )}
    >
      <div className={cn('flex items-center gap-2 px-3 pt-4 pb-3', sidebarCollapsed && 'flex-col')}>
        <Link to="/" className={cn('flex items-center justify-center', !sidebarCollapsed && 'flex-1 justify-start pl-1')}>
          <InfideepLogo showWordmark={!sidebarCollapsed} className={sidebarCollapsed ? 'h-8 w-auto' : 'h-8 w-auto'} />
        </Link>
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className={cn('flex-1 overflow-y-auto no-scrollbar px-2 pb-2', sidebarCollapsed ? 'space-y-1' : 'space-y-0.5')}>
        {navigation.map((item) => {
          const active = isActiveHref(item.href);

          return (
            <Link
              key={item.title}
              to={item.href}
              title={sidebarCollapsed ? item.title : undefined}
              className={cn(
                'group relative transition-all rounded-2xl',
                sidebarCollapsed
                  ? 'flex items-center justify-center h-11 w-11 mx-auto'
                  : 'flex items-center gap-3 px-3 py-2.5',
                active
                  ? 'id-nav-active font-semibold'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              )}
            >
              <item.icon size={19} className="shrink-0" />
              {/* Collapsed is icons only — the label lives in the tooltip. */}
              {!sidebarCollapsed && <span className="text-sm font-medium truncate">{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Identity and sign-out live in the top bar's avatar menu. Kept here,
          commented, in case the rail should carry them again — restore the
          `displayName` / `initials` / `role` / `logoutMutation` lines above
          along with this block.

      <div className={cn('border-t border-border/60 p-3', sidebarCollapsed && 'px-2')}>
        <div className={cn('flex items-center gap-2', sidebarCollapsed && 'flex-col')}>
          <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-tr from-primary to-violet-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {initials}
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate capitalize">{role.toLowerCase()}</p>
            </div>
          )}
          <button
            onClick={() => logoutMutation.mutate()}
            className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      */}
    </aside>
  );
}
