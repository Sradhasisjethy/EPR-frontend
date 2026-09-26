/**
 * Every code-split page, in one place, so the router and the preloader load
 * the same modules.
 *
 * Pages are split so first paint after login does not wait for 1.5 MB of
 * screens the user may never open. The cost was a pause the first time each
 * module was opened, while its chunk downloaded and the table skeleton sat
 * there. preloadPages() removes that pause: once the session is confirmed it
 * fetches every page in the background, a few at a time and only while the
 * browser is idle, so by the time someone clicks a module it is already here.
 * A chunk fetched once is reused, so calling this again costs nothing.
 */
export const pageLoaders = {
  EmployeesPage: () => import('@/pages/EmployeesPage'),
  OrganizationPage: () => import('@/pages/OrganizationPage'),
  OfficesPage: () => import('@/pages/OfficesPage'),
  DepartmentsPage: () => import('@/pages/DepartmentsPage'),
  RolesPage: () => import('@/pages/RolesPage'),
  RoleFormPage: () => import('@/pages/RoleFormPage'),
  SettingsPage: () => import('@/pages/SettingsPage'),
  FactoriesPage: () => import('@/pages/FactoriesPage'),
  ProductsPage: () => import('@/pages/ProductsPage'),
  PartiesPage: () => import('@/pages/PartiesPage'),
  AuditLogPage: () => import('@/pages/AuditLogPage'),
  MyProfilePage: () => import('@/pages/MyProfilePage'),
  PriceListsPage: () => import('@/pages/PriceListsPage'),
  InventoryPage: () => import('@/pages/InventoryPage'),
  PurchasingPage: () => import('@/pages/PurchasingPage'),
  TransfersPage: () => import('@/pages/TransfersPage'),
  SalesOrdersPage: () => import('@/pages/SalesOrdersPage'),
  ProductionPage: () => import('@/pages/ProductionPage'),
  QualityPage: () => import('@/pages/QualityPage'),
  VehiclesPage: () => import('@/pages/VehiclesPage'),
  ReservationsPage: () => import('@/pages/ReservationsPage'),
  NavigationPage: () => import('@/pages/NavigationPage'),
  DispatchPage: () => import('@/pages/DispatchPage'),
  InvoicingPage: () => import('@/pages/InvoicingPage'),
  ReturnsPage: () => import('@/pages/ReturnsPage'),
  PaymentsPage: () => import('@/pages/PaymentsPage'),
  WorkforcePage: () => import('@/pages/WorkforcePage'),
  ExpensesPage: () => import('@/pages/ExpensesPage'),
  LedgerPage: () => import('@/pages/LedgerPage'),
  GstrPage: () => import('@/pages/GstrPage'),
  AnalyticsPage: () => import('@/pages/AnalyticsPage'),
  ReportsPage: () => import('@/pages/ReportsPage'),
  SavedReportsPage: () => import('@/pages/SavedReportsPage'),
  NotificationsPage: () => import('@/pages/NotificationsPage'),
  MigrationPage: () => import('@/pages/MigrationPage'),
  AdministrationPage: () => import('@/pages/AdministrationPage'),
  MastersPage: () => import('@/pages/MastersPage'),
  SalesPage: () => import('@/pages/SalesPage'),
  ProductionModulePage: () => import('@/pages/ProductionModulePage'),
  InventoryModulePage: () => import('@/pages/InventoryModulePage'),
  FinancePage: () => import('@/pages/FinancePage'),
};

const BATCH = 4;
let started = null;

const whenIdle = (fn) =>
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? window.requestIdleCallback(fn, { timeout: 2000 })
    : setTimeout(fn, 200);

export function preloadPages() {
  if (started) return started;
  started = new Promise((resolve) => {
    const queue = Object.values(pageLoaders);
    const next = () => {
      const batch = queue.splice(0, BATCH);
      if (!batch.length) {
        resolve();
        return;
      }
      // A failed preload is harmless: the route loads the chunk again on visit
      // and shows its own error there if the network is really down.
      Promise.allSettled(batch.map((load) => load())).then(() => whenIdle(next));
    };
    whenIdle(next);
  });
  return started;
}
