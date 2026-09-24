import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthLayout } from '@/layouts/AuthLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { RequirePermission } from '@/components/auth/require-permission';
import { WebPermissions as P } from '@/constants/enums';
import { NAV_GATE } from '@/constants/navigation';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import EmployeesPage from '@/pages/EmployeesPage';
import OrganizationPage from '@/pages/OrganizationPage';
import OfficesPage from '@/pages/OfficesPage';
import DepartmentsPage from '@/pages/DepartmentsPage';
import RolesPage from '@/pages/RolesPage';
import RoleFormPage from '@/pages/RoleFormPage';
import SettingsPage from '@/pages/SettingsPage';
import FactoriesPage from '@/pages/FactoriesPage';
import ProductsPage from '@/pages/ProductsPage';
import PartiesPage from '@/pages/PartiesPage';
import AuditLogPage from '@/pages/AuditLogPage';
import MyProfilePage from '@/pages/MyProfilePage';
import PriceListsPage from '@/pages/PriceListsPage';
import InventoryPage from '@/pages/InventoryPage';
import PurchasingPage from '@/pages/PurchasingPage';
import TransfersPage from '@/pages/TransfersPage';
import SalesOrdersPage from '@/pages/SalesOrdersPage';
import ProductionPage from '@/pages/ProductionPage';
import QualityPage from '@/pages/QualityPage';
import VehiclesPage from '@/pages/VehiclesPage';
import ReservationsPage from '@/pages/ReservationsPage';
import NavigationPage from '@/pages/NavigationPage';
import DispatchPage from '@/pages/DispatchPage';
import InvoicingPage from '@/pages/InvoicingPage';
import ReturnsPage from '@/pages/ReturnsPage';
import PaymentsPage from '@/pages/PaymentsPage';
import WorkforcePage from '@/pages/WorkforcePage';
import ExpensesPage from '@/pages/ExpensesPage';
import LedgerPage from '@/pages/LedgerPage';
import GstrPage from '@/pages/GstrPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import ReportsPage from '@/pages/ReportsPage';
import SavedReportsPage from '@/pages/SavedReportsPage';
import NotificationsPage from '@/pages/NotificationsPage';
import MigrationPage from '@/pages/MigrationPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import NotFoundPage from '@/pages/NotFoundPage';
import AdministrationPage from '@/pages/AdministrationPage';
import MastersPage from '@/pages/MastersPage';
import SalesPage from '@/pages/SalesPage';
import ProductionModulePage from '@/pages/ProductionModulePage';
import InventoryModulePage from '@/pages/InventoryModulePage';
import FinancePage from '@/pages/FinancePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login owns the full viewport (split brand panel + form), so it sits
            outside AuthLayout's centred-card shell rather than inside it. */}
        <Route path="/login" element={<LoginPage />} />

        <Route element={<AuthLayout />}>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

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
    </BrowserRouter>
  );
}
