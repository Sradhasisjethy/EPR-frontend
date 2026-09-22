import { useTabParam } from '@/hooks/use-tab-param';
import { cn } from '@/lib/utils';
import { WebPermissions } from '@/constants/enums';
import { useCurrentUser } from '@/hooks/use-auth';
import { hasPermission } from '@/lib/permissions';

// Import child pages to render as tabs
import EmployeesPage from './EmployeesPage';
import RolesPage from './RolesPage';
import StaffLeavePage from './StaffLeavePage';
import StaffAttendancePage from './StaffAttendancePage';
import OrganizationPage from './OrganizationPage';
import OfficesPage from './OfficesPage';
import DepartmentsPage from './DepartmentsPage';
import FactoriesPage from './FactoriesPage';
import NavigationPage from './NavigationPage';
// import MigrationPage from './MigrationPage';

const ALL_TABS = [
  { key: 'users', label: 'Users' },
  { key: 'roles', label: 'Roles & Permissions' },
  { key: 'staff-leave', label: 'Staff Leave', permission: WebPermissions.LEAVE_READ },
  { key: 'staff-attendance', label: 'Staff Attendance', permission: WebPermissions.STAFF_ATTENDANCE_READ },
  { key: 'organization', label: 'Organization' },
  { key: 'offices', label: 'Offices' },
  { key: 'departments', label: 'Departments' },
  { key: 'locations', label: 'Locations', permission: WebPermissions.FACTORY_READ },
  { key: 'navigation', label: 'Navigation', permission: 'SETTINGS_MODIFY' },
  // { key: 'migration', label: 'Data Migration', permission: WebPermissions.MIGRATION_RUN },
];

export default function AdministrationPage() {
  const { data: user } = useCurrentUser();

  // Filter tabs based on permissions
  const tabs = ALL_TABS.filter((tab) => {
    if (!tab.permission) return true;
    return hasPermission(user, tab.permission);
  });

  const tabKeys = tabs.map((tab) => tab.key);
  const [activeTab, setActiveTab] = useTabParam(tabKeys, tabKeys[0] || 'users');

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground">Manage organization settings, users, and core configuration</p>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap',
              activeTab === tab.key
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pt-2">
        {activeTab === 'users' && <EmployeesPage />}
        {activeTab === 'roles' && <RolesPage />}
        {activeTab === 'staff-leave' && <StaffLeavePage />}
        {activeTab === 'staff-attendance' && <StaffAttendancePage />}
        {activeTab === 'organization' && <OrganizationPage />}
        {activeTab === 'offices' && <OfficesPage />}
        {activeTab === 'departments' && <DepartmentsPage />}
        {activeTab === 'locations' && <FactoriesPage />}
        {activeTab === 'navigation' && <NavigationPage />}
        {/* {activeTab === 'migration' && <MigrationPage />} */}
      </div>
    </div>
  );
}
