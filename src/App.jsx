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
import SettingsPage from '@/pages/SettingsPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route element={<DashboardLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/organization" element={<OrganizationPage />} />
          <Route path="/offices" element={<OfficesPage />} />
          <Route path="/departments" element={<DepartmentsPage />} />
          <Route path="/roles" element={<RolesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
