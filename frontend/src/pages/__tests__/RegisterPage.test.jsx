import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/utils';
import RegisterPage from '../RegisterPage';
import api from '../../config/axios';
import { showErrorToast, showSuccessToast } from '../../utils/errorHelpers';

// Mock axios module (no CSRF prefetch at page level anymore)
vi.mock('../../config/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../../utils/errorHelpers', async () => {
  const actual = await vi.importActual('../../utils/errorHelpers');
  return {
    ...actual,
    showErrorToast: vi.fn(),
    showSuccessToast: vi.fn(),
  };
});

describe('RegisterPage', () => {
  let user;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    api.get.mockResolvedValue({ data: { data: { user: null } } });
  });

  it('should render registration form', async () => {
    renderWithProviders(<RegisterPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^username$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
  });

  it('should show register form with title and navigation', async () => {
    renderWithProviders(<RegisterPage />);

    await waitFor(() => {
      expect(screen.getByText(/create a new account/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/sign in to your existing account/i)).toBeInTheDocument();

    // Check for login link
    const loginLink = screen.getByText(/sign in to your existing account/i).closest('a');
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('should handle successful registration', async () => {
    api.post.mockResolvedValue({ data: { success: true } });

    renderWithProviders(<RegisterPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText('Name');
    const usernameInput = screen.getByLabelText(/^username$/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const registerButton = screen.getByRole('button', { name: /register/i });

    await user.type(nameInput, 'Test User');
    await user.type(usernameInput, 'testuser');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    await user.click(registerButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/users/register', {
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });
    });

    expect(showSuccessToast).toHaveBeenCalledWith('Registration successful! Welcome to the blog.');
  });

  it('should show loading state during registration', async () => {
    // Mock a slow API response
    api.post.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: { success: true } }), 100);
        })
    );

    renderWithProviders(<RegisterPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText('Name');
    const usernameInput = screen.getByLabelText(/^username$/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const registerButton = screen.getByRole('button', { name: /register/i });

    await user.type(nameInput, 'Test User');
    await user.type(usernameInput, 'testuser');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    await user.click(registerButton);

    // Check for loading text
    expect(screen.getByText(/creating account/i)).toBeInTheDocument();
    expect(registerButton).toBeDisabled();
  });

  it('should handle form input correctly', async () => {
    renderWithProviders(<RegisterPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText('Name');
    const usernameInput = screen.getByLabelText(/^username$/i);
    const emailInput = screen.getByLabelText(/email/i);

    await user.type(nameInput, 'John Doe');
    await user.type(usernameInput, 'johndoe');
    await user.type(emailInput, 'john@example.com');

    expect(nameInput).toHaveValue('John Doe');
    expect(usernameInput).toHaveValue('johndoe');
    expect(emailInput).toHaveValue('john@example.com');
  });

  it('should redirect authenticated users', async () => {
    // Mock authenticated user
    api.get.mockResolvedValue({
      data: {
        data: {
          user: { id: 1, username: 'testuser', role: 'USER' },
        },
      },
    });

    renderWithProviders(<RegisterPage />);

    // The component should not render the form for authenticated users
    await waitFor(() => {
      expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
    });
  });

  it('should handle duplicate username error', async () => {
    const error = {
      response: {
        status: 409,
        data: {
          type: '/errors/conflict/duplicate-entry',
          field: 'username',
          detail: 'Username already exists',
        },
      },
    };
    api.post.mockRejectedValue(error);

    renderWithProviders(<RegisterPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText('Name');
    const usernameInput = screen.getByLabelText(/^username$/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const registerButton = screen.getByRole('button', { name: /register/i });

    await user.type(nameInput, 'Test User');
    await user.type(usernameInput, 'existinguser');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    await user.click(registerButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
      expect(showErrorToast).toHaveBeenCalled();
      expect(showSuccessToast).not.toHaveBeenCalled();
      const errArg = showErrorToast.mock.calls[0][0];
      expect(errArg?.response?.status).toBe(409);
    });
  });

  it('should handle 403 forbidden error', async () => {
    const error = {
      response: {
        status: 403,
        data: {
          detail: 'Registration is temporarily disabled',
        },
      },
    };
    api.post.mockRejectedValue(error);

    renderWithProviders(<RegisterPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText('Name');
    const usernameInput = screen.getByLabelText(/^username$/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const registerButton = screen.getByRole('button', { name: /register/i });

    await user.type(nameInput, 'Test User');
    await user.type(usernameInput, 'testuser');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    await user.click(registerButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
      expect(showErrorToast).toHaveBeenCalled();
      expect(showSuccessToast).not.toHaveBeenCalled();
      const errArg = showErrorToast.mock.calls[0][0];
      expect(errArg?.response?.status).toBe(403);
    });
  });
});
