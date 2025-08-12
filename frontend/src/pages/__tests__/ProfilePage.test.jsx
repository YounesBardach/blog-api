import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import ProfilePage from '../ProfilePage';
import api from '../../config/axios';

// Mock axios
vi.mock('../../config/axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('ProfilePage', () => {
  const mockUser = {
    id: 1,
    name: 'John Doe',
    username: 'johndoe',
    email: 'john@example.com',
    role: 'USER',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render user profile information', async () => {
    // Mock authenticated user
    api.get.mockResolvedValue({ data: { authenticated: true, data: { user: mockUser } } });

    renderWithProviders(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    expect(screen.getByText(mockUser.email)).toBeInTheDocument();
    expect(screen.getByText(mockUser.username)).toBeInTheDocument();
    // Note: ProfilePage doesn't display role
  });

  it('should display user avatar with first letter of name', async () => {
    api.get.mockResolvedValue({ data: { authenticated: true, data: { user: mockUser } } });

    renderWithProviders(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('J')).toBeInTheDocument(); // First letter of "John"
    });
  });

  it('should render profile sections', async () => {
    api.get.mockResolvedValue({ data: { authenticated: true, data: { user: mockUser } } });

    renderWithProviders(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText(/username/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/member since/i)).toBeInTheDocument();
  });
});
