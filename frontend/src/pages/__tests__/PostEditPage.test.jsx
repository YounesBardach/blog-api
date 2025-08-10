import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockPost } from '../../test/utils';
import PostEditPage from '../PostEditPage';
import api from '../../config/axios';
import { showErrorToast, showSuccessToast } from '../../utils/errorHelpers';

// Mock axios
vi.mock('../../config/axios', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

// Mock toast helpers to assert user feedback
vi.mock('../../utils/errorHelpers', async () => {
  const actual = await vi.importActual('../../utils/errorHelpers');
  return {
    ...actual,
    showErrorToast: vi.fn(),
    showSuccessToast: vi.fn(),
  };
});

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: '1' }),
    useNavigate: () => vi.fn(),
    Link: ({ children, to, ...props }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

describe('PostEditPage', () => {
  let user;
  const testPost = {
    ...mockPost,
    content: 'This is the original content that can be edited.',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();

    // Mock authenticated admin user
    api.get.mockImplementation((url) => {
      if (url === '/users/profile') {
        return Promise.resolve({
          data: {
            data: {
              user: { id: 1, username: 'admin', role: 'ADMIN' },
            },
          },
        });
      }
      if (url === '/posts/1') {
        return Promise.resolve({ data: { data: { post: testPost } } });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  it('should render edit form with post data', async () => {
    renderWithProviders(<PostEditPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue(testPost.title)).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue(testPost.content)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update post/i })).toBeInTheDocument();
    expect(screen.getByText(/edit post/i)).toBeInTheDocument();
  });

  it('should show loading state initially', () => {
    // Mock loading state by not resolving the promise immediately
    api.get.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<PostEditPage />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should display cancel button', async () => {
    renderWithProviders(<PostEditPage />);

    await screen.findByRole('button', { name: /cancel/i });
  });

  it('should show validation errors for empty fields', async () => {
    renderWithProviders(<PostEditPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue(testPost.title)).toBeInTheDocument();
    });

    // Clear the form fields
    const titleInput = screen.getByDisplayValue(testPost.title);
    const contentTextarea = screen.getByDisplayValue(testPost.content);

    await user.clear(titleInput);
    await user.clear(contentTextarea);

    const updateButton = screen.getByRole('button', { name: /update post/i });
    await user.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      expect(screen.getByText(/content is required/i)).toBeInTheDocument();
    });
  });

  it('should handle form input correctly', async () => {
    renderWithProviders(<PostEditPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue(testPost.title)).toBeInTheDocument();
    });

    const titleInput = screen.getByDisplayValue(testPost.title);
    const contentTextarea = screen.getByDisplayValue(testPost.content);

    await user.clear(titleInput);
    await user.clear(contentTextarea);
    await user.type(titleInput, 'Updated Post Title');
    await user.type(contentTextarea, 'This is the updated content.');

    expect(titleInput).toHaveValue('Updated Post Title');
    expect(contentTextarea).toHaveValue('This is the updated content.');
  });

  it('should handle successful post update', async () => {
    api.put.mockResolvedValue({ data: { success: true } });

    renderWithProviders(<PostEditPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue(testPost.title)).toBeInTheDocument();
    });

    const titleInput = screen.getByDisplayValue(testPost.title);
    const contentTextarea = screen.getByDisplayValue(testPost.content);
    const updateButton = screen.getByRole('button', { name: /update post/i });

    await user.clear(titleInput);
    await user.clear(contentTextarea);
    await user.type(titleInput, 'Updated Title');
    await user.type(contentTextarea, 'Updated content');
    await user.click(updateButton);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/posts/1', {
        title: 'Updated Title',
        content: 'Updated content',
      });
    });
  });

  it('should handle post update error', async () => {
    const error = new Error('Failed to update post');
    api.put.mockRejectedValue(error);

    renderWithProviders(<PostEditPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue(testPost.title)).toBeInTheDocument();
    });

    const titleInput = screen.getByDisplayValue(testPost.title);
    const updateButton = screen.getByRole('button', { name: /update post/i });

    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Title');
    await user.click(updateButton);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/posts/1', {
        title: 'Updated Title',
        content: testPost.content,
      });
      expect(showErrorToast).toHaveBeenCalled();
      expect(showSuccessToast).not.toHaveBeenCalled();
    });
  });

  it('should show error for unauthenticated user', async () => {
    // Mock unauthenticated user
    api.get.mockImplementation((url) => {
      if (url === '/users/profile') {
        return Promise.resolve({
          data: {
            data: {
              user: null,
            },
          },
        });
      }
      if (url === '/posts/1') {
        return Promise.resolve({ data: { data: { post: testPost } } });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    renderWithProviders(<PostEditPage />);

    await waitFor(() => {
      expect(screen.getByText(/you must be logged in to edit posts/i)).toBeInTheDocument();
    });
  });

  it('should show error for non-admin user', async () => {
    // Mock regular user (non-admin)
    api.get.mockImplementation((url) => {
      if (url === '/users/profile') {
        return Promise.resolve({
          data: {
            data: {
              user: { id: 1, username: 'user', role: 'USER' },
            },
          },
        });
      }
      if (url === '/posts/1') {
        return Promise.resolve({ data: { data: { post: testPost } } });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    renderWithProviders(<PostEditPage />);

    await waitFor(() => {
      expect(screen.getByText(/only administrators can edit posts/i)).toBeInTheDocument();
    });
  });
});
