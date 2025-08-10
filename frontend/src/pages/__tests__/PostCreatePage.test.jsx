import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/utils';
import PostCreatePage from '../PostCreatePage';
import api from '../../config/axios';
import { showErrorToast, showSuccessToast } from '../../utils/errorHelpers';

// Mock axios
vi.mock('../../config/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
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
    useNavigate: () => vi.fn(),
  };
});

describe('PostCreatePage', () => {
  let user;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    // Mock admin user for these tests
    api.get.mockResolvedValue({
      data: {
        data: {
          user: { id: 1, username: 'admin', role: 'ADMIN' },
        },
      },
    });
  });

  it('should render post creation form for admin', async () => {
    renderWithProviders(<PostCreatePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/content/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create post/i })).toBeInTheDocument();
    expect(screen.getByText(/create new post/i)).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    renderWithProviders(<PostCreatePage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create post/i })).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /create post/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      expect(screen.getByText(/content is required/i)).toBeInTheDocument();
    });
  });

  it('should handle form input correctly', async () => {
    renderWithProviders(<PostCreatePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    });

    const titleInput = screen.getByLabelText(/title/i);
    const contentTextarea = screen.getByLabelText(/content/i);

    await user.type(titleInput, 'Test Post Title');
    await user.type(contentTextarea, 'This is test content for the post.');

    expect(titleInput).toHaveValue('Test Post Title');
    expect(contentTextarea).toHaveValue('This is test content for the post.');
  });

  it('should handle successful post creation', async () => {
    api.post.mockResolvedValue({
      data: {
        data: {
          post: { id: 123 },
        },
      },
    });

    renderWithProviders(<PostCreatePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    });

    const titleInput = screen.getByLabelText(/title/i);
    const contentTextarea = screen.getByLabelText(/content/i);
    const createButton = screen.getByRole('button', { name: /create post/i });

    await user.type(titleInput, 'New Post');
    await user.type(contentTextarea, 'Post content');
    await user.click(createButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/posts', {
        title: 'New Post',
        content: 'Post content',
      });
    });
  });

  it('should handle post creation error', async () => {
    const error = new Error('Failed to create post');
    api.post.mockRejectedValue(error);

    renderWithProviders(<PostCreatePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    });

    const titleInput = screen.getByLabelText(/title/i);
    const contentTextarea = screen.getByLabelText(/content/i);
    const createButton = screen.getByRole('button', { name: /create post/i });

    await user.type(titleInput, 'New Post');
    await user.type(contentTextarea, 'Post content');
    await user.click(createButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/posts', {
        title: 'New Post',
        content: 'Post content',
      });
      expect(showErrorToast).toHaveBeenCalled();
      expect(showSuccessToast).not.toHaveBeenCalled();
    });
  });

  it('should show error for unauthenticated user', async () => {
    // Mock unauthenticated user
    api.get.mockResolvedValue({
      data: {
        data: {
          user: null,
        },
      },
    });

    renderWithProviders(<PostCreatePage />);

    await waitFor(() => {
      expect(screen.getByText(/you must be logged in to create posts/i)).toBeInTheDocument();
    });
  });

  it('should show error for non-admin user', async () => {
    // Mock regular user (non-admin)
    api.get.mockResolvedValue({
      data: {
        data: {
          user: { id: 1, username: 'user', role: 'USER' },
        },
      },
    });

    renderWithProviders(<PostCreatePage />);

    await waitFor(() => {
      expect(screen.getByText(/only administrators can create posts/i)).toBeInTheDocument();
    });
  });
});
