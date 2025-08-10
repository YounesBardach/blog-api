import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, mockPost } from '../../test/utils';
import HomePage from '../HomePage';
import api from '../../config/axios';

// Mock axios
vi.mock('../../config/axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    // Don't resolve the promise immediately to test loading state
    api.get.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<HomePage />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should render posts when data is loaded successfully', async () => {
    const mockPosts = [
      { ...mockPost, id: 1, title: 'First Post' },
      { ...mockPost, id: 2, title: 'Second Post' },
    ];

    api.get.mockResolvedValue({
      data: {
        data: {
          posts: mockPosts,
        },
      },
    });

    renderWithProviders(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('First Post')).toBeInTheDocument();
      expect(screen.getByText('Second Post')).toBeInTheDocument();
    });
  });

  it('should render empty state when no posts are available', async () => {
    api.get.mockResolvedValue({
      data: {
        data: {
          posts: [],
        },
      },
    });

    renderWithProviders(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText(/no posts yet/i)).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    const error = new Error('Failed to fetch posts');
    api.get.mockRejectedValue(error);

    renderWithProviders(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load posts/i)).toBeInTheDocument();
    });
  });

  it('should display post information correctly', async () => {
    const mockPosts = [
      {
        id: 1,
        title: 'Test Post Title',
        content: 'This is the post content that should be truncated...',
        author: {
          id: 1,
          username: 'testauthor',
          name: 'Test Author',
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    api.get.mockResolvedValue({
      data: {
        data: {
          posts: mockPosts,
        },
      },
    });

    renderWithProviders(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      expect(screen.getAllByText('Test Author')).toHaveLength(2); // sr-only + visible
    });
  });

  it('should make correct API call to fetch posts', async () => {
    api.get.mockResolvedValue({
      data: {
        data: {
          posts: [],
        },
      },
    });

    renderWithProviders(<HomePage />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/posts');
    });
  });
});
