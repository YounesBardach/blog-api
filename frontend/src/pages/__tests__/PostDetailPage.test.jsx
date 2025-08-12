import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockPost, mockComment } from '../../test/utils';
import PostDetailPage from '../PostDetailPage';
import api from '../../config/axios';
import { showErrorToast, showSuccessToast } from '../../utils/errorHelpers';

// Mock axios
vi.mock('../../config/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock toast helpers to assert error/success feedback
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
    Link: ({ children, to, ...props }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

describe('PostDetailPage', () => {
  let user;
  const testPost = {
    ...mockPost,
    content:
      'This is the full content of the test post. It contains multiple sentences and provides detailed information about the topic.',
  };

  const testComments = [
    { ...mockComment, id: 1, content: 'First comment' },
    { ...mockComment, id: 2, content: 'Second comment' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();

    // Mock authenticated user via session probe
    api.get.mockImplementation((url) => {
      if (url === '/users/session') {
        return Promise.resolve({
          data: {
            authenticated: true,
            data: { user: { id: 1, username: 'testuser', role: 'USER' } },
          },
        });
      }
      if (url === '/posts/1') {
        return Promise.resolve({ data: { data: { post: testPost } } });
      }
      if (url === '/comments/post/1') {
        return Promise.resolve({ data: { data: { comments: testComments } } });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  it('should render post title and content when loaded', async () => {
    renderWithProviders(<PostDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(testPost.title)).toBeInTheDocument();
    });

    expect(screen.getByText(/this is the full content/i)).toBeInTheDocument();
  });

  it('should show loading state initially', () => {
    // Mock loading state by not resolving the promise
    api.get.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<PostDetailPage />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should render back to home link', async () => {
    renderWithProviders(<PostDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/back to home/i)).toBeInTheDocument();
    });

    const backLink = screen.getByText(/back to home/i);
    expect(backLink.closest('a')).toHaveAttribute('href', '/');
  });

  it('should render comments when available', async () => {
    renderWithProviders(<PostDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('First comment')).toBeInTheDocument();
    });

    expect(screen.getByText('Second comment')).toBeInTheDocument();
  });

  it('should show comment form for authenticated users', async () => {
    renderWithProviders(<PostDetailPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/add a comment/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /add comment/i })).toBeInTheDocument();
  });

  it('should show empty state when no comments', async () => {
    // Mock empty comments
    api.get.mockImplementation((url) => {
      if (url === '/users/session') {
        return Promise.resolve({
          data: {
            authenticated: true,
            data: { user: { id: 1, username: 'testuser', role: 'USER' } },
          },
        });
      }
      if (url === '/posts/1') {
        return Promise.resolve({ data: { data: { post: testPost } } });
      }
      if (url === '/comments/post/1') {
        return Promise.resolve({ data: { data: { comments: [] } } });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    renderWithProviders(<PostDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/no comments yet/i)).toBeInTheDocument();
    });
  });

  it('should display post author information', async () => {
    renderWithProviders(<PostDetailPage />);

    await waitFor(() => {
      // Use getAllByText since author name appears multiple times
      const authorElements = screen.getAllByText(testPost.author.name);
      expect(authorElements.length).toBeGreaterThan(0);
    });
  });

  it('should show comments count', async () => {
    renderWithProviders(<PostDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/comments \(2\)/i)).toBeInTheDocument();
    });
  });

  it('should handle comment submission', async () => {
    api.post.mockResolvedValue({ data: { success: true } });

    renderWithProviders(<PostDetailPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/add a comment/i)).toBeInTheDocument();
    });

    //getByPlaceholderText gets you the input field
    const commentInput = screen.getByPlaceholderText(/add a comment/i);
    const submitButton = screen.getByRole('button', { name: /add comment/i });

    await user.type(commentInput, 'This is a new comment');
    await user.click(submitButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/comments/post/1', {
        content: 'This is a new comment',
      });
    });
  });

  it('should handle comment submission error', async () => {
    const error = new Error('Failed to add comment');
    api.post.mockRejectedValue(error);

    renderWithProviders(<PostDetailPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/add a comment/i)).toBeInTheDocument();
    });

    const commentInput = screen.getByPlaceholderText(/add a comment/i);
    const submitButton = screen.getByRole('button', { name: /add comment/i });

    await user.type(commentInput, 'This is a new comment');
    await user.click(submitButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/comments/post/1', {
        content: 'This is a new comment',
      });
      expect(showErrorToast).toHaveBeenCalled();
      expect(showSuccessToast).not.toHaveBeenCalled();
    });
  });
});
