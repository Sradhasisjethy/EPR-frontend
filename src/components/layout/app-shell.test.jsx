import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { renderWithQuery } from '@/test/render';
import { AppShell } from './app-shell';
import { useUIStore } from '@/store/ui-store';

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(() => Promise.resolve({ data: { data: null } })), post: vi.fn() },
}));
vi.mock('next-themes', () => ({ useTheme: () => ({ theme: 'dark', setTheme: vi.fn() }) }));
vi.mock('@/components/notifications/notification-bell', () => ({ NotificationBell: () => null }));
vi.mock('./global-search', () => ({ GlobalSearch: () => null }));

const render = () =>
  renderWithQuery(
    <MemoryRouter>
      <AppShell><div>page content</div></AppShell>
    </MemoryRouter>
  );

/**
 * On a phone the rail is a drawer, not a column. The desktop layout offset the
 * content by a fixed 260px, which at 375px left 115px of usable width.
 */
describe('AppShell navigation drawer', () => {
  beforeEach(() => useUIStore.setState({ sidebarOpen: false, sidebarCollapsed: false }));

  it('starts closed', () => {
    render();
    expect(useUIStore.getState().sidebarOpen).toBe(false);
  });

  it('opens from the header button', async () => {
    const user = userEvent.setup();
    render();
    await user.click(screen.getByRole('button', { name: /open navigation/i }));
    expect(useUIStore.getState().sidebarOpen).toBe(true);
  });

  it('closes when the backdrop is tapped', async () => {
    const user = userEvent.setup();
    render();
    await user.click(screen.getByRole('button', { name: /open navigation/i }));

    // The backdrop is the only dismissal on a phone — there is no visible edge
    // of the page to click past.
    const backdrop = document.querySelector('[aria-hidden].fixed.inset-0');
    expect(backdrop).toBeTruthy();
    await user.click(backdrop);
    expect(useUIStore.getState().sidebarOpen).toBe(false);
  });

  it('renders no backdrop while closed, so the page stays clickable', () => {
    render();
    expect(document.querySelector('[aria-hidden].fixed.inset-0')).toBeNull();
  });
});
