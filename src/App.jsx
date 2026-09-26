import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthLayout } from '@/layouts/AuthLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { RequirePermission } from '@/components/auth/require-permission';
import { WebPermissions as P } from '@/constants/enums';
import { NAV_GATE } from '@/constants/navigation';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import NotFoundPage from '@/pages/NotFoundPage';
import { pageLoaders } from '@/pages/page-loaders';

/**
 * Every page past the dashboard is its own chunk, fetched the first time it is
 * visited. Before this the whole app was one 1.5 MB script: a counter clerk
 * who only ever opens Sales downloaded the GST return, the ledger, analytics
 * and the report builder on every fresh login. The four pages that gate or
 * follow login stay eager so first paint does not wait on a second request.
 * The rest are fetched in the background right after login; see page-loaders.js.
 */
const EmployeesPage = lazy(pageLoaders.EmployeesPage);
const OrganizationPage = lazy(pageLoaders.OrganizationPage);
const OfficesPage = lazy(pageLoaders.OfficesPage);
const DepartmentsPage = lazy(pageLoaders.DepartmentsPage);
const RolesPage = lazy(pageLoaders.RolesPage);
const RoleFormPage = lazy(pageLoaders.RoleFormPage);
const SettingsPage = lazy(pageLoaders.SettingsPage);
const FactoriesPage = lazy(pageLoaders.FactoriesPage);
const ProductsPage = lazy(pageLoaders.ProductsPage);
const PartiesPage = lazy(pageLoaders.PartiesPage);
const AuditLogPage = lazy(pageLoaders.AuditLogPage);
const MyProfilePage = lazy(pageLoaders.MyProfilePage);
const PriceListsPage = lazy(pageLoaders.PriceListsPage);
const InventoryPage = lazy(pageLoaders.InventoryPage);
const PurchasingPage = lazy(pageLoaders.PurchasingPage);
const TransfersPage = lazy(pageLoaders.TransfersPage);
const SalesOrdersPage = lazy(pageLoaders.SalesOrdersPage);
const ProductionPage = lazy(pageLoaders.ProductionPage);
const QualityPage = lazy(pageLoaders.QualityPage);
const VehiclesPage = lazy(pageLoaders.VehiclesPage);
const ReservationsPage = lazy(pageLoaders.ReservationsPage);
const NavigationPage = lazy(pageLoaders.NavigationPage);
const DispatchPage = lazy(pageLoaders.DispatchPage);
const InvoicingPage = lazy(pageLoaders.InvoicingPage);
const ReturnsPage = lazy(pageLoaders.ReturnsPage);
const PaymentsPage = lazy(pageLoaders.PaymentsPage);
const WorkforcePage = lazy(pageLoaders.WorkforcePage);
const ExpensesPage = lazy(pageLoaders.ExpensesPage);
const LedgerPage = lazy(pageLoaders.LedgerPage);
const GstrPage = lazy(pageLoaders.GstrPage);
const AnalyticsPage = lazy(pageLoaders.AnalyticsPage);
const ReportsPage = lazy(pageLoaders.ReportsPage);
const SavedReportsPage = lazy(pageLoaders.SavedReportsPage);
const NotificationsPage = lazy(pageLoaders.NotificationsPage);
const MigrationPage = lazy(pageLoaders.MigrationPage);
const AdministrationPage = lazy(pageLoaders.AdministrationPage);
const MastersPage = lazy(pageLoaders.MastersPage);
const SalesPage = lazy(pageLoaders.SalesPage);
const ProductionModulePage = lazy(pageLoaders.ProductionModulePage);
const InventoryModulePage = lazy(pageLoaders.InventoryModulePage);
const FinancePage = lazy(pageLoaders.FinancePage);

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
      <Routes>
        {/* Login owns the full viewport (split brand panel + form), so it sits
            outside AuthLayout's centred-card shell rather than inside it. */}
        <Route path="/login" element={<LoginPage />} />

        <Route element={<AuthLayout />}>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Lazy pages inside the shell suspend on DashboardLayout's own boundary,
            so the sidebar stays put while a chunk loads; this outer one only
            catches a chunk that suspends before the shell exists. */}

        {/* DashboardLayout proves you are logged in; RequirePermission proves
            you may be on this particular page. Without the second, hiding a
            sidebar item was the whole of the client-side access control and
            every page was one typed URL away. The API is still the authority —
            these gates exist so the user meets an honest "Access Denied" rather
            than a screenful of failed requests that reads like an outage. */}
        <Route element={<DashboardLayout />}>
          {/* Open to any authenticated user: the dashboard already omits the
              financial block server-side for users without VIEW_RATES, and
              everyone needs their own notifications and profile. */}
          <Route path="/" element={<DashboardPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<MyProfilePage />} />

          {/* Module landing pages. Gates come from NAV_GATE so the sidebar and
              the router read the same list; each page then filters its own tabs
              to the subset the user can actually see. */}
          <Route element={<RequirePermission {...NAV_GATE['/administration']} />}>
            <Route path="/administration" element={<AdministrationPage />} />
          </Route>
          <Route element={<RequirePermission {...NAV_GATE['/masters']} />}>
            <Route path="/masters" element={<MastersPage />} />
          </Route>
          <Route element={<RequirePermission {...NAV_GATE['/sales']} />}>
            <Route path="/sales" element={<SalesPage />} />
          </Route>
          <Route element={<RequirePermission {...NAV_GATE['/production-module']} />}>
            <Route path="/production-module" element={<ProductionModulePage />} />
          </Route>
          <Route element={<RequirePermission {...NAV_GATE['/inventory-module']} />}>
            <Route path="/inventory-module" element={<InventoryModulePage />} />
          </Route>
          <Route element={<RequirePermission {...NAV_GATE['/finance']} />}>
            <Route path="/finance" element={<FinancePage />} />
          </Route>
          <Route element={<RequirePermission {...NAV_GATE['/workforce']} />}>
            <Route path="/workforce" element={<WorkforcePage />} />
          </Route>

          {/* Administration leaves. These are not sidebar destinations, so they
              name their own permission — and they are the ones that mattered
              most: /roles and /migration were reachable by anyone who typed them. */}
          <Route element={<RequirePermission permission={P.EMPLOYEE_READ} />}>
            <Route path="/employees" element={<EmployeesPage />} />
          </Route>
          <Route element={<RequirePermission permission={P.ORG_READ} />}>
            <Route path="/organization" element={<OrganizationPage />} />
            <Route path="/offices" element={<OfficesPage />} />
            <Route path="/departments" element={<DepartmentsPage />} />
          </Route>
          <Route element={<RequirePermission permission={P.ROLE_READ} />}>
            <Route path="/roles" element={<RolesPage />} />
          </Route>
          {/* Opening the role editor is a write, not a read: /roles/new creates
              and /roles/:id edits. Static segment first so /roles/new isn't
              parsed as a role id. */}
          <Route element={<RequirePermission anyPermissions={[P.ROLE_CREATE, P.ROLE_MODIFY]} />}>
            <Route path="/roles/new" element={<RoleFormPage />} />
            <Route path="/roles/:id" element={<RoleFormPage />} />
          </Route>
          <Route element={<RequirePermission permission={P.FACTORY_READ} />}>
            <Route path="/factories" element={<FactoriesPage />} />
          </Route>
          {/* Writes the tenant-wide menu configuration for everyone. */}
          <Route element={<RequirePermission permission={P.SETTINGS_MODIFY} />}>
            <Route path="/navigation" element={<NavigationPage />} />
          </Route>
          <Route element={<RequirePermission permission={P.SETTINGS_READ} />}>
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          {/* One-time opening-balance import: high blast radius, its own grant. */}
          <Route element={<RequirePermission permission={P.MIGRATION_RUN} />}>
            <Route path="/migration" element={<MigrationPage />} />
          </Route>
          <Route element={<RequirePermission permission={P.AUDIT_READ} />}>
            <Route path="/audit-log" element={<AuditLogPage />} />
          </Route>

          {/* Masters leaves */}
          <Route element={<RequirePermission permission={P.PRODUCT_READ} />}>
            <Route path="/products" element={<ProductsPage />} />
          </Route>
          <Route element={<RequirePermission permission={P.PARTY_READ} />}>
            <Route path="/parties" element={<PartiesPage />} />
          </Route>
          <Route element={<RequirePermission permission={P.PRICING_READ} />}>
            <Route path="/price-lists" element={<PriceListsPage />} />
          </Route>
          <Route element={<RequirePermission permission={P.VEHICLE_READ} />}>
            <Route path="/vehicles" element={<VehiclesPage />} />
          </Route>

          {/* Sales leaves */}
          <Route element={<RequirePermission permission={P.SALES_READ} />}>
            <Route path="/sales-orders" element={<SalesOrdersPage />} />
            <Route path="/reservations" element={<ReservationsPage />} />
          </Route>
          <Route element={<RequirePermission permission={P.DISPATCH_READ} />}>
            <Route path="/dispatch" element={<DispatchPage />} />
          </Route>
          <Route element={<RequirePermission permission={P.INVOICE_READ} />}>
            <Route path="/invoices" element={<InvoicingPage />} />
          </Route>
          <Route element={<RequirePermission permission={P.RETURN_READ} />}>
            <Route path="/returns" element={<ReturnsPage />} />
          </Route>

          {/* Purchase, production, inventory leaves */}
          <Route element={<RequirePermission {...NAV_GATE['/purchasing']} />}>
            <Route path="/purchasing" element={<PurchasingPage />} />
          </Route>
          <Route element={<RequirePermission permission={P.PRODUCTION_READ} />}>
            <Route path="/production" element={<ProductionPage />} />
          </Route>
          <Route element={<RequirePermission permission={P.QUALITY_READ} />}>
            <Route path="/quality" element={<QualityPage />} />
          </Route>
          <Route element={<RequirePermission permission={P.INVENTORY_READ} />}>
            <Route path="/inventory" element={<InventoryPage />} />
          </Route>
          <Route element={<RequirePermission permission={P.TRANSFER_READ} />}>
            <Route path="/transfers" element={<TransfersPage />} />
          </Route>

          {/* Finance leaves */}
          <Route element={<RequirePermission anyPermissions={[P.PAYMENT_READ, P.RECEIPT_READ]} />}>
            <Route path="/payments" element={<PaymentsPage />} />
          </Route>
          <Route element={<RequirePermission permission={P.EXPENSE_READ} />}>
            <Route path="/expenses" element={<ExpensesPage />} />
          </Route>
          <Route element={<RequirePermission anyPermissions={[P.LEDGER_READ, P.JOURNAL_READ]} />}>
            <Route path="/ledger" element={<LedgerPage />} />
          </Route>
          <Route element={<RequirePermission permission={P.GSTR_READ} />}>
            <Route path="/gstr" element={<GstrPage />} />
          </Route>

          <Route element={<RequirePermission permission={P.ANALYTICS_READ} />}>
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Route>

          {/* Reports. The catalog routes are gated per report by the API — it
              returns only the definitions the caller may view — so entry needs
              just one report grant, not a blanket one. Nested by category then
              report, so a filtered report is a shareable URL rather than
              transient component state. The static /reports/saved segment is
              safe next to /reports/:category — React Router ranks static
              segments above dynamic ones. */}
          <Route element={<RequirePermission {...NAV_GATE['/reports']} />}>
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/reports/:category" element={<ReportsPage />} />
            <Route path="/reports/:category/:report" element={<ReportsPage />} />
          </Route>
          <Route element={<RequirePermission permission={P.REPORT_READ} />}>
            <Route path="/reports/saved" element={<SavedReportsPage />} />
          </Route>

          {/* Catch-all last, and inside this layout so an unknown URL keeps the
              shell and a way back rather than rendering an empty document. */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
