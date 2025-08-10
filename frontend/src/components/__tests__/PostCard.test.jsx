import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockPost } from '../../test/utils';
import PostCard from '../PostCard';
import api from '../../config/axios';
// Navigation is verified via history.pushState spy
import { showErrorToast, showSuccessToast } from '../../utils/errorHelpers';

// Mock axios
vi.mock('../../config/axios', () => ({
  default: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock toast helpers to observe user feedback on errors/success
vi.mock('../../utils/errorHelpers', async () => {
  const actual = await vi.importActual('../../utils/errorHelpers');
  return {
    ...actual,
    showErrorToast: vi.fn(),
    showSuccessToast: vi.fn(),
  };
});

describe('PostCard', () => {
  let user;
  const testPost = {
    ...mockPost,
    author: {
      id: 1,
      name: 'Test Author',
    },
    content:
      'This is a test post content that should be truncated when displayed in the card preview.',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
  });

  // No extra router: renderWithProviders already wraps BrowserRouter

  it('should render post information correctly', async () => {
    api.get.mockResolvedValue({ data: { data: { user: null } } });

    renderWithProviders(<PostCard post={testPost} />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.getByText(testPost.title)).toBeInTheDocument();
    });

    expect(screen.getByText(/this is a test post content/i)).toBeInTheDocument();
    expect(screen.getAllByText(testPost.author.name)).toHaveLength(2); // sr-only + visible
  });

  it('should display exactly 150 characters plus ellipsis when content is long', async () => {
    api.get.mockResolvedValue({ data: { data: { user: null } } });

    const longContent = 'a'.repeat(200); // deterministic > 150 chars
    const expected = longContent.slice(0, 150) + '...';

    renderWithProviders(
      <PostCard post={{ ...testPost, title: 'Test Post Title', content: longContent }} />
    );

    await screen.findByText((_, node) => node?.textContent === expected);
  });

  it('should not show ellipsis for short content', async () => {
    api.get.mockResolvedValue({ data: { data: { user: null } } });

    const shortPost = {
      ...testPost,
      content: 'Hello',
    };

    renderWithProviders(<PostCard post={shortPost} />);

    await waitFor(() => {
      const contentElement = screen.getByText('Hello');
      expect(contentElement.textContent).toBe('Hello');
    });
  });

  it('should show author initial in avatar', async () => {
    api.get.mockResolvedValue({ data: { data: { user: null } } });

    renderWithProviders(<PostCard post={testPost} />);

    await waitFor(() => {
      expect(screen.getByText('T')).toBeInTheDocument(); // First letter of "Test Author"
    });
  });

  it('should format date correctly', async () => {
    api.get.mockResolvedValue({ data: { data: { user: null } } });

    renderWithProviders(<PostCard post={testPost} />);

    await waitFor(() => {
      const expectedDate = new Date(testPost.createdAt).toLocaleDateString();
      expect(screen.getByText(expectedDate)).toBeInTheDocument();
    });
  });

  it('should not show edit/delete buttons for unauthenticated users', async () => {
    api.get.mockResolvedValue({ data: { data: { user: null } } });

    renderWithProviders(<PostCard post={testPost} />);

    await waitFor(() => {
      expect(screen.queryByText(/edit/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/delete/i)).not.toBeInTheDocument();
    });
  });

  it('should not show edit/delete buttons for regular users', async () => {
    const regularUser = { id: 1, username: 'testuser', role: 'USER' };
    api.get.mockResolvedValue({ data: { data: { user: regularUser } } });

    renderWithProviders(<PostCard post={testPost} />);

    await waitFor(() => {
      expect(screen.queryByText(/edit/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/delete/i)).not.toBeInTheDocument();
    });
  });

  it('should show edit/delete buttons for admin users', async () => {
    const adminUser = { id: 1, username: 'admin', role: 'ADMIN' };
    api.get.mockResolvedValue({ data: { data: { user: adminUser } } });

    renderWithProviders(<PostCard post={testPost} />);

    await waitFor(() => {
      expect(screen.getByText(/edit/i)).toBeInTheDocument();
      expect(screen.getByText(/delete/i)).toBeInTheDocument();
    });
  });

  it('should show delete confirmation modal when delete button is clicked', async () => {
    const adminUser = { id: 1, username: 'admin', role: 'ADMIN' };
    api.get.mockResolvedValue({ data: { data: { user: adminUser } } });

    renderWithProviders(<PostCard post={testPost} />);

    // Wait for admin buttons to appear
    await waitFor(() => {
      expect(screen.getByText(/delete/i)).toBeInTheDocument();
    });

    const deleteButton = screen.getByText(/delete/i);
    await user.click(deleteButton);

    // Check for modal content
    expect(screen.getByText(/are you sure you want to delete this post/i)).toBeInTheDocument();
    expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();

    // Get the modal delete button (different from the initial delete button)
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    expect(deleteButtons).toHaveLength(2); // Initial button + modal button
  });

  it('should cancel delete when cancel button is clicked', async () => {
    const adminUser = { id: 1, username: 'admin', role: 'ADMIN' };
    api.get.mockResolvedValue({ data: { data: { user: adminUser } } });

    renderWithProviders(<PostCard post={testPost} />);

    // Open delete modal
    await waitFor(() => {
      expect(screen.getByText(/delete/i)).toBeInTheDocument();
    });

    const deleteButton = screen.getByText(/delete/i);
    await user.click(deleteButton);

    // Click cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Modal should be closed
    expect(
      screen.queryByText(/are you sure you want to delete this post/i)
    ).not.toBeInTheDocument();
  });

  it('should handle successful post deletion', async () => {
    const adminUser = { id: 1, username: 'admin', role: 'ADMIN' };
    api.get.mockResolvedValue({ data: { data: { user: adminUser } } });
    api.delete.mockResolvedValue({ data: { success: true } });

    renderWithProviders(<PostCard post={testPost} />);

    // Open delete modal
    await waitFor(() => {
      expect(screen.getByText(/delete/i)).toBeInTheDocument();
    });

    const deleteButton = screen.getByText(/delete/i);
    await user.click(deleteButton);

    // Confirm deletion - get the modal delete button (second one)
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    const confirmButton = deleteButtons[1]; // Modal delete button
    await user.click(confirmButton);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith(`/posts/${testPost.id}`);
    });
  });

  it('should handle delete errors', async () => {
    const adminUser = { id: 1, username: 'admin', role: 'ADMIN' };
    api.get.mockResolvedValue({ data: { data: { user: adminUser } } });
    api.delete.mockRejectedValue(new Error('Delete failed'));

    renderWithProviders(<PostCard post={testPost} />);

    // Open delete modal
    await waitFor(() => {
      expect(screen.getByText(/delete/i)).toBeInTheDocument();
    });

    const deleteButton = screen.getByText(/delete/i);
    await user.click(deleteButton);

    // Confirm deletion - get the modal delete button (second one)
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    const confirmButton = deleteButtons[1]; // Modal delete button
    await user.click(confirmButton);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith(`/posts/${testPost.id}`);
      expect(showErrorToast).toHaveBeenCalled();
      expect(showSuccessToast).not.toHaveBeenCalled();
    });

    // Modal should remain open after a failed deletion
    expect(screen.getByText(/are you sure you want to delete this post/i)).toBeInTheDocument();
    // Both the original delete button and the modal confirm delete should still be present
    expect(screen.getAllByRole('button', { name: /delete/i }).length).toBeGreaterThan(1);
  });

  it('should disable delete button while deleting', async () => {
    const adminUser = { id: 1, username: 'admin', role: 'ADMIN' };
    api.get.mockResolvedValue({ data: { data: { user: adminUser } } });
    api.delete.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<PostCard post={testPost} />);

    // Open delete modal
    await waitFor(() => {
      expect(screen.getByText(/delete/i)).toBeInTheDocument();
    });

    const deleteButton = screen.getByText(/delete/i);
    await user.click(deleteButton);

    // Confirm deletion - get the modal delete button (second one)
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    const confirmButton = deleteButtons[1]; // Modal delete button
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText(/deleting/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /deleting/i })).toBeDisabled();
    });
  });

  it('should navigate to post detail page when clicked', async () => {
    api.get.mockResolvedValue({ data: { data: { user: null } } });
    const pushSpy = vi.spyOn(window.history, 'pushState');

    renderWithProviders(<PostCard post={testPost} />);

    const links = await screen.findAllByRole('link');
    const postLink = links.find((a) => a.getAttribute('href') === `/posts/${testPost.id}`);
    expect(postLink).toBeTruthy();
    await user.click(postLink);

    expect(pushSpy).toHaveBeenCalledWith(
      //with any object, any title and /posts/testPost.id path as arguments
      expect.anything(),
      expect.anything(),
      `/posts/${testPost.id}`
    );
  });

  it('should navigate to edit page for admin users when Edit is clicked', async () => {
    const adminUser = { id: 1, username: 'admin', role: 'ADMIN' };
    api.get.mockResolvedValue({ data: { data: { user: adminUser } } });
    const pushSpy = vi.spyOn(window.history, 'pushState');

    renderWithProviders(<PostCard post={testPost} />);

    const editLink = await screen.findByRole('link', { name: /edit/i });
    await user.click(editLink);

    expect(pushSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      `/posts/${testPost.id}/edit`
    );
  });
});
