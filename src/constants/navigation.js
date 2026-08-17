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
    permission: 'EMPLOYEE_READ',
  },
  {
    title: 'Organization',
    icon: Building2,
    href: '/organization',
    permission: 'ORG_READ',
  },
  {
    title: 'Roles & Permissions',
    icon: Shield,
    href: '/roles',
    permission: 'ROLE_READ',
  },
  {
    title: 'Settings',
    icon: Settings,
    href: '/settings',
    permission: 'SETTINGS_READ',
  },
];
