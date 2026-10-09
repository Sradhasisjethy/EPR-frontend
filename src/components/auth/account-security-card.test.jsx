import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQuery } from '@/test/render';
import { apiClient } from '@/lib/api-client';
import { AccountSecurityCard } from './account-security-card';

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

const fill = async (user, { current, next, confirm }) => {
  await user.type(screen.getByLabelText('Current password'), current);
  await user.type(screen.getByLabelText('New password'), next);
  await user.type(screen.getByLabelText('Confirm new password'), confirm);
  await user.click(screen.getByRole('button', { name: /change password/i }));
};

/**
 * Changing a password ends every session, so the form refuses what the API
 * would refuse before anything is sent, and shows the API's own reason when it
 * does refuse (a wrong current password comes back as a 400, not a 401, so the
 * client does not mistake it for an expired session).
 */
describe('AccountSecurityCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refuses mismatched new passwords without calling the API', async () => {
    const user = userEvent.setup();
    renderWithQuery(<AccountSecurityCard />);
    await fill(user, { current: 'old-password', next: 'new-password-1', confirm: 'new-password-2' });
    expect(await screen.findByRole('alert')).toHaveTextContent('do not match');
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('refuses a new password shorter than eight characters', async () => {
    const user = userEvent.setup();
    renderWithQuery(<AccountSecurityCard />);
    await fill(user, { current: 'old-password', next: 'short', confirm: 'short' });
    expect(await screen.findByRole('alert')).toHaveTextContent('at least 8');
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('shows the reason the API gives for refusing', async () => {
    apiClient.post.mockRejectedValueOnce({ response: { status: 400, data: { message: 'Current password is incorrect' } } });
    const user = userEvent.setup();
    renderWithQuery(<AccountSecurityCard />);
    await fill(user, { current: 'wrong-one', next: 'new-password-1', confirm: 'new-password-1' });
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/auth/change-password', {
      currentPassword: 'wrong-one', newPassword: 'new-password-1',
    }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Current password is incorrect');
  });

  it('asks before signing out everywhere', async () => {
    const user = userEvent.setup();
    renderWithQuery(<AccountSecurityCard />);
    await user.click(screen.getByRole('button', { name: /sign out everywhere/i }));
    expect(await screen.findByText('Sign out everywhere?')).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
