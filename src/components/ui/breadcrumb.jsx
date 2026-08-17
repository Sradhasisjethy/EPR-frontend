import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export function Breadcrumb() {
  const { pathname } = useLocation();

  // Helper to build hierarchy items based on current path
  const getBreadcrumbs = () => {
    if (pathname === '/' || pathname === '') {
      return [{ title: 'Dashboard', href: '/' }];
    }

    if (pathname === '/organization') {
      return [
        { title: 'Organization', href: '/organization' },
      ];
    }

    if (pathname === '/offices') {
      return [
        { title: 'Organization', href: '/organization' },
        { title: 'Offices', href: '/offices' },
      ];
    }

    if (pathname === '/departments') {
      return [
        { title: 'Organization', href: '/organization' },
        { title: 'Offices', href: '/offices' },
        { title: 'Departments', href: '/departments' },
      ];
    }

    if (pathname === '/employees') {
      return [
        { title: 'Employees', href: '/employees' },
      ];
    }

    if (pathname === '/roles') {
      return [
        { title: 'Roles & Permissions', href: '/roles' },
      ];
    }

    if (pathname === '/settings') {
      return [
        { title: 'Settings', href: '/settings' },
      ];
    }

    // Default dynamic fallback
    const segments = pathname.split('/').filter(Boolean);
    const items = [];
    let currentPath = '';

    segments.forEach((seg) => {
      currentPath += `/${seg}`;
      const title = seg.charAt(0).toUpperCase() + seg.slice(1).replace('-', ' ');
      items.push({ title, href: currentPath });
    });

    return items;
  };

  const crumbs = getBreadcrumbs();
  const currentPageTitle = crumbs[crumbs.length - 1]?.title || 'Dashboard';

  return (
    <div className="flex items-center gap-3">
      <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white drop-shadow-sm">{currentPageTitle}</h1>
      
      <nav aria-label="Breadcrumb" className="hidden sm:flex items-center text-xs font-medium text-slate-600 dark:text-slate-300">
        <span className="mx-2 text-slate-400">/</span>
        <ol className="flex items-center gap-1.5 list-none m-0 p-0">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            return (
              <li key={crumb.href} className="flex items-center gap-1.5">
                {index > 0 && <ChevronRight size={13} className="text-slate-400 shrink-0" />}
                {isLast ? (
                  <span className="font-semibold text-slate-900 dark:text-white bg-slate-200/60 dark:bg-white/10 px-2.5 py-0.5 rounded-lg border border-slate-300/60 dark:border-white/15 shadow-sm">
                    {crumb.title}
                  </span>
                ) : (
                  <Link
                    to={crumb.href}
                    className="hover:text-blue-500 text-slate-600 dark:text-slate-300 transition-colors hover:underline"
                  >
                    {crumb.title}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
