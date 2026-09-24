import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { renderWithQuery } from '@/test/render';
import { RequirePermission } from './require-permission';

const currentUser = vi.fn();
vi.mock('@/hooks/use-auth', () => ({
  useCurrentUser: () => currentUser(),
}));

const asUser = (user, isLoading = false) => currentUser.mockReturnValue({ data: user, isLoading });

const renderAt = (path, element) =>
  renderWithQuery(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={element}>
          <Route path="/roles" element={<div>role admin screen</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

/**
 * Before this guard existed the only thing in front of a page was the session
 * check, so every module was one typed URL away for any logged-in user. These
 * cover the cases that made that dangerous, and the two that would make a guard
 * useless in the other direction: denying while permissions are still loading,
 * and denying the wildcard the API leaves unexpanded.
 */
describe('RequirePermission', () => {
  beforeEach(() => currentUser.mockReset());

  it('renders the page when the user holds the permission', () => {
    asUser({ role: 'EMPLOYEE', permissions: ['ROLE_READ'] });
    renderAt('/roles', <RequirePermission permission="ROLE_READ" />);
    expect(screen.getByText('role admin screen')).toBeInTheDocument();
  });

  it('blocks a direct URL when the user does not', () => {
    asUser({ role: 'EMPLOYEE', permissions: ['SALES_READ'] });
    renderAt('/roles', <RequirePermission permission="ROLE_READ" />);
    expect(screen.queryByText('role admin screen')).not.toBeInTheDocument();
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('does not name the permission it wanted', () => {
    // Naming the code tells whoever is probing exactly which grant to target,
    // and the user who legitimately hit this cannot act on it either way.
    asUser({ role: 'EMPLOYEE', permissions: [] });
    renderAt('/roles', <RequirePermission permission="ROLE_READ" />);
    expect(screen.queryByText(/ROLE_READ/)).not.toBeInTheDocument();
  });

  it('honours the unexpanded wildcard the API sends', () => {
    // The old hook did not, which left a wildcard user staring at an empty app.
    asUser({ role: 'EMPLOYEE', permissions: ['*'] });
    renderAt('/roles', <RequirePermission permission="ROLE_READ" />);
    expect(screen.getByText('role admin screen')).toBeInTheDocument();
  });

  it('lets the bypass roles through', () => {
    asUser({ role: 'PLATFORM_ADMIN', permissions: [] });
    renderAt('/roles', <RequirePermission permission="ROLE_READ" />);
    expect(screen.getByText('role admin screen')).toBeInTheDocument();
  });

  it('does not treat ORG_ADMIN as a bypass role', () => {
    // The backend bypass list is PLATFORM_ADMIN and TENANT_OWNER only; the old
    // hook added ORG_ADMIN and showed controls the API would refuse.
    asUser({ role: 'ORG_ADMIN', permissions: [] });
    renderAt('/roles', <RequirePermission permission="ROLE_READ" />);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('renders nothing while the session is still resolving', () => {
    // Deny-by-default must not flash Access Denied on every page load.
    asUser(undefined, true);
    renderAt('/roles', <RequirePermission permission="ROLE_READ" />);
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
    expect(screen.queryByText('role admin screen')).not.toBeInTheDocument();
  });

  it('admits on any one of anyPermissions, and refuses when none match', () => {
    asUser({ role: 'EMPLOYEE', permissions: ['JOURNAL_READ'] });
    renderAt('/roles', <RequirePermission anyPermissions={['LEDGER_READ', 'JOURNAL_READ']} />);
    expect(screen.getByText('role admin screen')).toBeInTheDocument();
  });

  it('refuses when none of anyPermissions match', () => {
    asUser({ role: 'EMPLOYEE', permissions: ['SALES_READ'] });
    renderAt('/roles', <RequirePermission anyPermissions={['LEDGER_READ', 'JOURNAL_READ']} />);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });
});
