import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/utils';
import Header from '../Header';
import api from '../../config/axios';

// Mock axios
vi.mock('../../config/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('Header', () => {
  let user;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
  });

  it('should render header with title', async () => {
    api.get.mockResolvedValue({ data: { data: { user: null } } });

    renderWithProviders(<Header />);

    await waitFor(() => {
      expect(screen.getByText(/home/i)).toBeInTheDocument();
    });
  });

  it('should show login/register links when user is not authenticated', async () => {
    api.get.mockResolvedValue({ data: { data: { user: null } } });

    renderWithProviders(<Header />);

    // Wait for the auth query to resolve and assert by role
    await screen.findByRole('link', { name: /login/i });
    await screen.findByRole('link', { name: /register/i });
  });

  it('should show user menu when user is authenticated', async () => {
    const mockUser = { id: 1, username: 'testuser', role: 'USER' };
    api.get.mockResolvedValue({ data: { data: { user: mockUser } } });

    renderWithProviders(<Header />);

    // Wait for the auth query to resolve and check for Profile/Logout using roles
    await screen.findByRole('link', { name: /profile/i });
    await screen.findByRole('button', { name: /logout/i });
  });

  it('should show create post link for admin users', async () => {
    const mockAdminUser = { id: 1, username: 'admin', role: 'ADMIN' };
    api.get.mockResolvedValue({ data: { data: { user: mockAdminUser } } });

    renderWithProviders(<Header />);

    // Wait for the auth query to resolve and assert by role
    await screen.findByRole('link', { name: /create post/i });
  });

  it('should not show create post link for regular users', async () => {
    const mockUser = { id: 1, username: 'testuser', role: 'USER' };
    api.get.mockResolvedValue({ data: { data: { user: mockUser } } });

    renderWithProviders(<Header />);

    // Wait for the auth query to resolve and assert by role
    await screen.findByRole('link', { name: /profile/i });
    expect(screen.queryByRole('link', { name: /create post/i })).not.toBeInTheDocument();
  });

  it('should handle logout when logout button is clicked', async () => {
    const mockUser = { id: 1, username: 'testuser', role: 'USER' };
    api.get.mockResolvedValue({ data: { data: { user: mockUser } } });
    api.post.mockResolvedValue({ data: { success: true } });

    renderWithProviders(<Header />);

    // Wait for the auth query to resolve
    const logoutButton = await screen.findByText(/logout/i);
    await user.click(logoutButton);

    expect(api.post).toHaveBeenCalledWith('/users/logout');
  });

  it('should show loading state while fetching user data', () => {
    // Don't resolve the promise immediately to test loading state
    api.get.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<Header />);

    // Should show loading spinner - AuthProvider loading
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});
