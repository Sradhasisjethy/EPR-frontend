import { LayoutDashboard, Users, Building2, Shield, Settings } from 'lucide-react';

export const NAVIGATION = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/',
  },
  {
    title: 'Employees',
    icon: Users,
    href: '/employees',
  },
  {
    title: 'Organization',
    icon: Building2,
    href: '/organization',
  },
  {
    title: 'Roles & Permissions',
    icon: Shield,
    href: '/roles',
  },
  {
    title: 'Settings',
    icon: Settings,
    href: '/settings',
  },
];
