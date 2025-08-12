import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import ProtectedRoute from '../ProtectedRoute';
import api from '../../config/axios';

// Mock axios
vi.mock('../../config/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children when user is authenticated', async () => {
    const mockUser = { id: 1, username: 'testuser', role: 'USER' };
    api.get.mockResolvedValue({ data: { authenticated: true, data: { user: mockUser } } });

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    // Wait for the auth query to resolve
    await screen.findByText('Protected Content');

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect to login when user is not authenticated', async () => {
    api.get.mockResolvedValue({ data: { authenticated: false } });
    const replaceSpy = vi.spyOn(window.history, 'replaceState');

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(window.location.pathname).toBe('/login');
      // optional: also assert replace was used
      expect(replaceSpy).toHaveBeenCalledWith(expect.anything(), expect.anything(), '/login');
    });
    replaceSpy.mockRestore();
  });

  it('should show loading state while checking authentication', () => {
    // Don't resolve the promise immediately to test loading state
    api.get.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    // Should show loading spinner - AuthProvider loading
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should redirect to login on authentication error', async () => {
    api.get.mockRejectedValue(new Error('Network error'));
    const replaceSpy = vi.spyOn(window.history, 'replaceState');

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(window.location.pathname).toBe('/login');
      expect(replaceSpy).toHaveBeenCalledWith(expect.anything(), expect.anything(), '/login');
    });
    replaceSpy.mockRestore();
  });
});
