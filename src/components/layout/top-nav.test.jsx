import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { renderWithQuery } from '@/test/render';
import { TopNav } from './top-nav';
import { useUIStore } from '@/store/ui-store';

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(() => Promise.resolve({ data: { data: null } })), post: vi.fn() },
}));
vi.mock('next-themes', () => ({ useTheme: () => ({ theme: 'dark', setTheme: vi.fn() }) }));
vi.mock('@/components/notifications/notification-bell', () => ({ NotificationBell: () => null }));
vi.mock('./global-search', () => ({ GlobalSearch: () => null }));


/**
 * Appearance is in the avatar menu because changing the theme is a
 * glance-and-flip action; making someone open a settings page for it is why a
 * standalone moon icon used to sit in the header.
 */
describe('TopNav appearance menu', () => {
  beforeEach(() => {
    useUIStore.setState({ colorScheme: 'sapphire', glassMode: true });
  });

  it('changes the colour scheme from the menu', async () => {
    const user = userEvent.setup();
    renderWithQuery(<MemoryRouter><TopNav /></MemoryRouter>);
    await user.click(screen.getAllByRole('button').pop());

    await user.click(await screen.findByRole('button', { name: 'Emerald' }));
    expect(useUIStore.getState().colorScheme).toBe('emerald');
  });

  it('toggles glassmorphism from the menu', async () => {
    const user = userEvent.setup();
    renderWithQuery(<MemoryRouter><TopNav /></MemoryRouter>);
    await user.click(screen.getAllByRole('button').pop());

    await user.click(await screen.findByRole('button', { name: /Glassmorphism/i }));
    expect(useUIStore.getState().glassMode).toBe(false);
  });

  it('offers every palette the settings page does', async () => {
    const { PALETTES } = await import('@/constants/palettes');
    const user = userEvent.setup();
    renderWithQuery(<MemoryRouter><TopNav /></MemoryRouter>);
    await user.click(screen.getAllByRole('button').pop());

    // One shared list, so the menu and Settings cannot drift apart.
    await waitFor(() => expect(screen.getByRole('button', { name: PALETTES[0].name })).toBeInTheDocument());
    for (const palette of PALETTES) {
      expect(screen.getByRole('button', { name: palette.name })).toBeInTheDocument();
    }
  });
});
