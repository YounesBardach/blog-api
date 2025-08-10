import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockComment } from '../../test/utils';
import Comment from '../Comment';
import api from '../../config/axios';
import { showErrorToast, showSuccessToast } from '../../utils/errorHelpers';

// Mock axios
vi.mock('../../config/axios', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
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

describe('Comment', () => {
  let user;
  const testComment = {
    ...mockComment,
    author: {
      id: 1,
      name: 'Test Author',
    },
    content: 'This is a test comment content.',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
  });

  it('should render comment information correctly', async () => {
    api.get.mockResolvedValue({ data: { data: { user: null } } });

    renderWithProviders(<Comment comment={testComment} postId={1} />);

    await waitFor(() => {
      expect(screen.getByText(testComment.content)).toBeInTheDocument();
    });
    expect(screen.getByText(testComment.author.name)).toBeInTheDocument();
  });

  it('should display author initial in avatar', async () => {
    api.get.mockResolvedValue({ data: { data: { user: null } } });

    renderWithProviders(<Comment comment={testComment} postId={1} />);

    await waitFor(() => {
      expect(screen.getByText('T')).toBeInTheDocument(); // First letter of "Test Author"
    });
  });

  it('should format date correctly', async () => {
    api.get.mockResolvedValue({ data: { data: { user: null } } });

    renderWithProviders(<Comment comment={testComment} postId={1} />);

    await waitFor(() => {
      const expectedDate = new Date(testComment.createdAt).toLocaleDateString();
      expect(screen.getByText(expectedDate)).toBeInTheDocument();
    });
  });

  it('should not show edit/delete buttons for unauthenticated users', async () => {
    api.get.mockResolvedValue({ data: { data: { user: null } } });

    renderWithProviders(<Comment comment={testComment} postId={1} />);

    await waitFor(() => {
      expect(screen.queryByText(/edit/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/delete/i)).not.toBeInTheDocument();
    });
  });

  it('should show edit/delete buttons for comment author', async () => {
    const authorUser = { id: 1, username: 'testauthor', role: 'USER' };
    api.get.mockResolvedValue({ data: { data: { user: authorUser } } });

    renderWithProviders(<Comment comment={testComment} postId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/edit/i)).toBeInTheDocument();
      expect(screen.getByText(/delete/i)).toBeInTheDocument();
    });
  });

  it('should show edit/delete buttons for admin users', async () => {
    const adminUser = { id: 2, username: 'admin', role: 'ADMIN' };
    api.get.mockResolvedValue({ data: { data: { user: adminUser } } });

    renderWithProviders(<Comment comment={testComment} postId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/edit/i)).toBeInTheDocument();
      expect(screen.getByText(/delete/i)).toBeInTheDocument();
    });
  });

  it('should enter edit mode when edit button is clicked', async () => {
    const authorUser = { id: 1, username: 'testauthor', role: 'USER' };
    api.get.mockResolvedValue({ data: { data: { user: authorUser } } });

    renderWithProviders(<Comment comment={testComment} postId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/edit/i)).toBeInTheDocument();
    });

    const editButton = screen.getByText(/edit/i);
    await user.click(editButton);

    // Should show edit form
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();

    // Original content should be in the textarea
    expect(screen.getByDisplayValue(testComment.content)).toBeInTheDocument();
  });

  it('should cancel edit mode when cancel button is clicked', async () => {
    const authorUser = { id: 1, username: 'testauthor', role: 'USER' };
    api.get.mockResolvedValue({ data: { data: { user: authorUser } } });

    renderWithProviders(<Comment comment={testComment} postId={1} />);

    // Enter edit mode
    await waitFor(() => {
      expect(screen.getByText(/edit/i)).toBeInTheDocument();
    });

    const editButton = screen.getByText(/edit/i);
    await user.click(editButton);

    // Cancel edit
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Should be back to view mode
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText(testComment.content)).toBeInTheDocument();
  });

  it('should handle successful comment edit', async () => {
    const authorUser = { id: 1, username: 'testauthor', role: 'USER' };
    api.get.mockResolvedValue({ data: { data: { user: authorUser } } });
    api.put.mockResolvedValue({ data: { success: true } });

    renderWithProviders(<Comment comment={testComment} postId={1} />);

    // Enter edit mode
    await waitFor(() => {
      expect(screen.getByText(/edit/i)).toBeInTheDocument();
    });

    const editButton = screen.getByText(/edit/i);
    await user.click(editButton);

    // Edit content
    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'Updated comment content');

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(`/comments/${testComment.id}`, {
        content: 'Updated comment content',
      });
    });
  });

  it('should show validation errors for empty content', async () => {
    const authorUser = { id: 1, username: 'testauthor', role: 'USER' };
    api.get.mockResolvedValue({ data: { data: { user: authorUser } } });

    renderWithProviders(<Comment comment={testComment} postId={1} />);

    // Enter edit mode
    await waitFor(() => {
      expect(screen.getByText(/edit/i)).toBeInTheDocument();
    });

    const editButton = screen.getByText(/edit/i);
    await user.click(editButton);

    // Clear content
    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);

    // Try to save
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/content is required/i)).toBeInTheDocument();
    });
  });

  it('should show delete confirmation modal when delete button is clicked', async () => {
    const authorUser = { id: 1, username: 'testauthor', role: 'USER' };
    api.get.mockResolvedValue({ data: { data: { user: authorUser } } });

    renderWithProviders(<Comment comment={testComment} postId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/delete/i)).toBeInTheDocument();
    });

    const deleteButton = screen.getByText(/delete/i);
    await user.click(deleteButton);

    // Check for modal content
    expect(screen.getByText(/are you sure you want to delete this comment/i)).toBeInTheDocument();
    expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();

    // Check that we now have two delete buttons (original + modal)
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    expect(deleteButtons).toHaveLength(2);
  });

  it('should cancel delete when cancel button is clicked', async () => {
    const authorUser = { id: 1, username: 'testauthor', role: 'USER' };
    api.get.mockResolvedValue({ data: { data: { user: authorUser } } });

    renderWithProviders(<Comment comment={testComment} postId={1} />);

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
      screen.queryByText(/are you sure you want to delete this comment/i)
    ).not.toBeInTheDocument();
  });

  it('should handle successful comment deletion', async () => {
    const authorUser = { id: 1, username: 'testauthor', role: 'USER' };
    api.get.mockResolvedValue({ data: { data: { user: authorUser } } });
    api.delete.mockResolvedValue({ data: { success: true } });

    renderWithProviders(<Comment comment={testComment} postId={1} />);

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
      expect(api.delete).toHaveBeenCalledWith(`/comments/${testComment.id}`);
    });
  });

  it('should handle delete errors', async () => {
    const authorUser = { id: 1, username: 'testauthor', role: 'USER' };
    api.get.mockResolvedValue({ data: { data: { user: authorUser } } });
    api.delete.mockRejectedValue(new Error('Delete failed'));

    renderWithProviders(<Comment comment={testComment} postId={1} />);

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
      expect(api.delete).toHaveBeenCalledWith(`/comments/${testComment.id}`);
      // Error feedback shown, success not shown
      expect(showErrorToast).toHaveBeenCalled();
      expect(showSuccessToast).not.toHaveBeenCalled();
    });

    // Modal should remain open after failure (confirmation button still present)
    const modalDeleteButtons = screen.getAllByRole('button', { name: /delete/i });
    expect(modalDeleteButtons.length).toBeGreaterThan(1);

    // Original content should still be visible (no optimistic removal)
    expect(screen.getByText(testComment.content)).toBeInTheDocument();
  });

  it('should disable save button while editing', async () => {
    const authorUser = { id: 1, username: 'testauthor', role: 'USER' };
    api.get.mockResolvedValue({ data: { data: { user: authorUser } } });
    api.put.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<Comment comment={testComment} postId={1} />);

    // Enter edit mode
    await waitFor(() => {
      expect(screen.getByText(/edit/i)).toBeInTheDocument();
    });

    const editButton = screen.getByText(/edit/i);
    await user.click(editButton);

    // Edit and save
    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'Updated content');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/saving/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    });
  });

  it('should disable delete button while deleting', async () => {
    const authorUser = { id: 1, username: 'testauthor', role: 'USER' };
    api.get.mockResolvedValue({ data: { data: { user: authorUser } } });
    api.delete.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<Comment comment={testComment} postId={1} />);

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
});
