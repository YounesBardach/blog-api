import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { AuthProvider } from '../AuthProvider';
import api from '../../config/axios';

vi.mock('../../config/axios', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('../../utils/errorHelpers', async () => {
  const actual = await vi.importActual('../../utils/errorHelpers');
  return {
    ...actual,
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
  };
});

import { showSuccessToast, showErrorToast } from '../../utils/errorHelpers';

const renderWithQueryClient = (ui) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

const AuthConsumer = () => {
  const { user, isAuthenticated, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="name">{user?.username ?? ''}</div>
      <div data-testid="auth">{isAuthenticated ? 'yes' : 'no'}</div>
      <button onClick={login}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
};

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows loading while profile is fetching', async () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderWithQueryClient(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('provides user and isAuthenticated after profile success', async () => {
    api.get.mockResolvedValue({
      data: { authenticated: true, data: { user: { id: 1, username: 'test' } } },
    });
    renderWithQueryClient(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('yes'));
    expect(screen.getByTestId('name').textContent).toBe('test');
  });

  it('login invalidates profile and refetches', async () => {
    const first = { data: { authenticated: true, data: { user: { id: 1, username: 'old' } } } };
    const second = { data: { authenticated: true, data: { user: { id: 1, username: 'new' } } } };
    api.get.mockResolvedValueOnce(first).mockResolvedValue(second);

    const userEv = userEvent.setup();
    renderWithQueryClient(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('name').textContent).toBe('old'));
    await userEv.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('name').textContent).toBe('new'));
  });

  it('logout posts, clears user and shows success toast', async () => {
    api.get
      .mockResolvedValueOnce({
        data: { authenticated: true, data: { user: { id: 1, username: 'test' } } },
      })
      .mockResolvedValueOnce({ data: { authenticated: false } });
    api.post.mockResolvedValue({ data: { success: true } });

    const userEv = userEvent.setup();
    renderWithQueryClient(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await screen.findByText('test');
    await userEv.click(screen.getByText('logout'));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/users/logout'));
    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('no'));
    expect(showSuccessToast).toHaveBeenCalled();
    expect(showErrorToast).not.toHaveBeenCalled();
  });

  it('logout error shows error toast and does not clear user', async () => {
    api.get.mockResolvedValue({
      data: { authenticated: true, data: { user: { id: 1, username: 'test' } } },
    });
    api.post.mockRejectedValue(new Error('boom'));

    const userEv = userEvent.setup();
    renderWithQueryClient(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await screen.findByText('test');
    await userEv.click(screen.getByText('logout'));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/users/logout'));
    expect(screen.getByTestId('auth').textContent).toBe('yes');
    expect(screen.getByTestId('name').textContent).toBe('test');
    expect(showErrorToast).toHaveBeenCalled();
  });
});
