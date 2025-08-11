import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/utils';
import LoginPage from '../LoginPage';
import api from '../../config/axios';

// Mock axios and ensureCsrfToken for components that prefetch CSRF before POST
vi.mock('../../config/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
  ensureCsrfToken: vi.fn().mockResolvedValue('test-csrf-token'),
}));

describe('LoginPage', () => {
  let user;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    api.get.mockResolvedValue({ data: { data: { user: null } } });
  });

  it('should render login form', async () => {
    renderWithProviders(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    renderWithProviders(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    const loginButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/username is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('should handle successful login', async () => {
    api.post.mockResolvedValue({ data: { success: true } });

    renderWithProviders(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const loginButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    await user.click(loginButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/users/login', {
        username: 'testuser',
        password: 'password123',
      });
    });
  });

  it('should handle login errors', async () => {
    const errorResponse = {
      response: {
        status: 401,
        data: {
          detail: 'Invalid username or password',
        },
      },
    };
    api.post.mockRejectedValue(errorResponse);

    renderWithProviders(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const loginButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(usernameInput, 'wronguser');
    await user.type(passwordInput, 'wrongpass');
    await user.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument();
    });
  });

  it('should handle validation errors from backend', async () => {
    const validationError = {
      response: {
        status: 400,
        data: {
          invalid_params: [
            { name: 'username', reason: 'Username is required' },
            { name: 'password', reason: 'Password must be at least 6 characters' },
          ],
        },
      },
    };
    api.post.mockRejectedValue(validationError);

    renderWithProviders(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const loginButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(usernameInput, 'test');
    await user.type(passwordInput, '123');
    await user.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/username is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
    });
  });

  it('should handle rate limiting errors', async () => {
    const rateLimitError = {
      response: {
        status: 429,
        data: {
          detail: 'Too many requests. Please try again later.',
        },
      },
    };
    api.post.mockRejectedValue(rateLimitError);

    renderWithProviders(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const loginButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    await user.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
    });
  });

  it('should disable submit button while submitting', async () => {
    api.post.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const loginButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    await user.click(loginButton);

    expect(loginButton).toBeDisabled();
    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
  });
});
