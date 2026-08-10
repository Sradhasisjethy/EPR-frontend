import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useUIStore } from '@/store/ui-store';
import { useCurrentUser, useLogout } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { NAVIGATION } from '@/constants/navigation';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, glassMode } = useUIStore();
  const { pathname } = useLocation();
  const [expandedItems, setExpandedItems] = useState([]);
  const { data: user } = useCurrentUser();
  const { hasPermission } = usePermissions();
  const logoutMutation = useLogout();

  const displayName = user?.name || 'User';
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const role = user?.role ? user.role.replace('_', ' ') : 'User';

  const toggleExpand = (title) => {
    setExpandedItems(prev =>
      prev.includes(title) ? prev.filter(i => i !== title) : [...prev, title]
    );
  };

  const filteredNavigation = NAVIGATION.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  return (
    <aside className={cn(
      "fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out border-r border-border/70 shadow-xl",
      glassMode ? "bg-background/80 backdrop-blur-2xl" : "bg-card",
      sidebarCollapsed ? "w-[80px]" : "w-[280px]"
    )}>
      {/* Header Branding */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border/70">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary via-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-base shadow-md shadow-primary/25">
              🏭
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold bg-gradient-to-r from-primary via-indigo-500 to-purple-500 bg-clip-text text-transparent tracking-tight">
                ERP Pro
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest -mt-1">
                Industrial 4.0
              </span>
            </div>
          </div>
        )}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-2 rounded-xl hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all mx-auto shadow-sm border border-transparent hover:border-border/50"
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      {/* Main Navigation */}
      <div className="py-4 overflow-y-auto h-[calc(100vh-140px)] px-3">
        {!sidebarCollapsed && (
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 mb-2 opacity-70">
            Menu
          </p>
        )}
        <nav className="space-y-1.5">
          {filteredNavigation.map((item) => {
            const isActive = item.href ? pathname === item.href : pathname.startsWith(item.children?.[0].href?.split('/')[1] || '');
            const isExpanded = expandedItems.includes(item.title);

            return (
              <div key={item.title}>
                {item.href ? (
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm font-medium relative overflow-hidden",
                      isActive
                        ? "bg-primary/15 text-primary font-bold border-l-4 border-primary shadow-sm"
                        : "text-foreground/80 hover:bg-primary/10 hover:text-primary",
                      sidebarCollapsed ? "justify-center px-0" : ""
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0",
                      isActive ? "bg-primary text-primary-foreground shadow-md shadow-primary/30" : "bg-muted/50 text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                    )}>
                      <item.icon size={18} />
                    </div>
                    {!sidebarCollapsed && (
                      <span className="ml-3 truncate font-semibold">{item.title}</span>
                    )}
                  </Link>
                ) : (
                  <div>
                    <button
                      onClick={() => toggleExpand(item.title)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm font-medium",
                        isActive ? "text-primary font-bold" : "text-foreground/80 hover:bg-primary/10 hover:text-primary"
                      )}
                    >
                      <div className="flex items-center">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0",
                          isActive ? "bg-primary text-primary-foreground shadow-md" : "bg-muted/50 text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                        )}>
                          <item.icon size={18} />
                        </div>
                        {!sidebarCollapsed && <span className="ml-3 font-semibold">{item.title}</span>}
                      </div>
                      {!sidebarCollapsed && (
                        isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                      )}
                    </button>

                    {!sidebarCollapsed && isExpanded && item.children && (
                      <div className="ml-9 mt-1 space-y-1 border-l-2 border-primary/20 pl-2">
                        {item.children.map((child) => (
                          <Link
                            key={child.title}
                            to={child.href}
                            className={cn(
                              "block px-3 py-2 text-xs rounded-lg font-medium transition-all",
                              pathname === child.href ? "bg-primary/15 text-primary font-bold" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            {child.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* User Profile Card at Bottom */}
      <div className="absolute bottom-0 w-full p-3 border-t border-border/70 bg-inherit">
        <div className={cn(
          "flex items-center p-2 rounded-2xl bg-card/70 backdrop-blur-md border border-border/60 shadow-md transition-all",
          sidebarCollapsed ? "justify-center" : "justify-between"
        )}>
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-white font-extrabold text-sm shadow-md">
                {initials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background shadow-sm" title="Online" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold text-foreground truncate">{displayName}</p>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{role}</p>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <button
              onClick={() => logoutMutation.mutate()}
              className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
