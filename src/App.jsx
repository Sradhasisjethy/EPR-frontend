import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthLayout } from '@/layouts/AuthLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
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

        <Route element={<DashboardLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/organization" element={<OrganizationPage />} />
          <Route path="/offices" element={<OfficesPage />} />
          <Route path="/departments" element={<DepartmentsPage />} />
          <Route path="/roles" element={<RolesPage />} />
          {/* Static segment first so /roles/new isn't parsed as a role id. */}
          <Route path="/roles/new" element={<RoleFormPage />} />
          <Route path="/roles/:id" element={<RoleFormPage />} />
          <Route path="/factories" element={<FactoriesPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/parties" element={<PartiesPage />} />
          <Route path="/price-lists" element={<PriceListsPage />} />
          <Route path="/audit-log" element={<AuditLogPage />} />
          <Route path="/sales-orders" element={<SalesOrdersPage />} />
          <Route path="/production" element={<ProductionPage />} />
          <Route path="/quality" element={<QualityPage />} />
          <Route path="/vehicles" element={<VehiclesPage />} />
          <Route path="/reservations" element={<ReservationsPage />} />
          <Route path="/navigation" element={<NavigationPage />} />
          <Route path="/dispatch" element={<DispatchPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/purchasing" element={<PurchasingPage />} />
          <Route path="/transfers" element={<TransfersPage />} />
          <Route path="/invoices" element={<InvoicingPage />} />

          {/* Common User Pages */}
          <Route path="/profile" element={<MyProfilePage />} />

          {/* Reports */}
          <Route path="/returns" element={<ReturnsPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/workforce" element={<WorkforcePage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/ledger" element={<LedgerPage />} />
          <Route path="/gstr" element={<GstrPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          {/* One module, nested by category then report, so a filtered report is
              a shareable URL rather than transient component state. The static
              /reports/saved segment is safe next to /reports/:category —
              React Router ranks static segments above dynamic ones. */}
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/reports/saved" element={<SavedReportsPage />} />
          <Route path="/reports/:category" element={<ReportsPage />} />
          <Route path="/reports/:category/:report" element={<ReportsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/migration" element={<MigrationPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Catch-all last, and inside this layout so an unknown URL keeps the
              shell and a way back rather than rendering an empty document. */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
