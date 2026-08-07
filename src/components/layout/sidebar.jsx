import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useUIStore } from '@/store/ui-store';
import { useCurrentUser, useLogout } from '@/hooks/use-auth';
import { NAVIGATION } from '@/constants/navigation';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, glassMode } = useUIStore();
  const { pathname } = useLocation();
  const [expandedItems, setExpandedItems] = useState([]);
  const { data: user } = useCurrentUser();
  const logoutMutation = useLogout();

  const displayName = user?.name || 'User';
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const role = user?.role || 'User';

  const toggleExpand = (title) => {
    setExpandedItems(prev =>
      prev.includes(title) ? prev.filter(i => i !== title) : [...prev, title]
    );
  };

  return (
    <aside className={cn(
      "fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out border-r border-border",
      glassMode ? "bg-background/80 backdrop-blur-xl" : "bg-card",
      sidebarCollapsed ? "w-[80px]" : "w-[280px]"
    )}>
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        {!sidebarCollapsed && (
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
            ERP Pro
          </span>
        )}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-2 rounded-md hover:bg-muted transition-colors mx-auto"
        >
          {sidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      <div className="py-4 overflow-y-auto h-[calc(100vh-140px)]">
        <nav className="space-y-1 px-3">
          {NAVIGATION.map((item) => {
            const isActive = item.href ? pathname === item.href : pathname.startsWith(item.children?.[0].href?.split('/')[1] || '');
            const isExpanded = expandedItems.includes(item.title);

            return (
              <div key={item.title}>
                {item.href ? (
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group",
                      isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      sidebarCollapsed ? "justify-center" : ""
                    )}
                  >
                    <item.icon size={20} className={cn("shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                    {!sidebarCollapsed && <span className="ml-3">{item.title}</span>}
                  </Link>
                ) : (
                  <div>
                    <button
                      onClick={() => toggleExpand(item.title)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group",
                        isActive ? "text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center">
                        <item.icon size={20} className={cn("shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                        {!sidebarCollapsed && <span className="ml-3">{item.title}</span>}
                      </div>
                      {!sidebarCollapsed && (
                        isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                      )}
                    </button>

                    {!sidebarCollapsed && isExpanded && item.children && (
                      <div className="ml-9 mt-1 space-y-1 border-l border-border pl-2">
                        {item.children.map((child) => (
                          <Link
                            key={child.title}
                            to={child.href}
                            className={cn(
                              "block px-3 py-2 text-sm rounded-md transition-colors",
                              pathname === child.href ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
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

      <div className="absolute bottom-0 w-full p-4 border-t border-border bg-inherit">
        <div className={cn("flex items-center", sidebarCollapsed ? "justify-center" : "")}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-violet-500 flex items-center justify-center text-white font-bold shadow-sm">
            {initials}
          </div>
          {!sidebarCollapsed && (
            <div className="ml-3 flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{role}</p>
            </div>
          )}
          {!sidebarCollapsed && (
            <button
              onClick={() => logoutMutation.mutate()}
              className="p-2 text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
