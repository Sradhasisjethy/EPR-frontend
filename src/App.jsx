import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthLayout } from '@/layouts/AuthLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import EmployeesPage from '@/pages/EmployeesPage';
import OrganizationPage from '@/pages/OrganizationPage';
import RolesPage from '@/pages/RolesPage';
import RoleFormPage from '@/pages/RoleFormPage';
import SettingsPage from '@/pages/SettingsPage';
import FactoriesPage from '@/pages/FactoriesPage';
import ProductsPage from '@/pages/ProductsPage';
import PartiesPage from '@/pages/PartiesPage';
import PriceListsPage from '@/pages/PriceListsPage';
import AuditLogPage from '@/pages/AuditLogPage';
import InventoryPage from '@/pages/InventoryPage';
import PurchasingPage from '@/pages/PurchasingPage';
import TransfersPage from '@/pages/TransfersPage';
import SalesOrdersPage from '@/pages/SalesOrdersPage';
import ProductionPage from '@/pages/ProductionPage';
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<DashboardLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/organization" element={<OrganizationPage />} />
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
          <Route path="/dispatch" element={<DispatchPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/purchasing" element={<PurchasingPage />} />
          <Route path="/transfers" element={<TransfersPage />} />
          <Route path="/invoices" element={<InvoicingPage />} />
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
