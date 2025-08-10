import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthProvider';

// Create a custom render function that includes providers
export const renderWithProviders = (ui, options = {}) => {
  const {
    // Create a new QueryClient for each test to ensure clean state
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    }),
    ...renderOptions
  } = options;

  const Wrapper = ({ children }) => {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>{children}</AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  //render from @testing-library/react (different from the react-dom/client render)
  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
};

// Mock data objects used across tests
export const mockPost = {
  id: 1,
  title: 'Test Post Title',
  content: 'This is test content for the post.',
  summary: 'This is a test summary.',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  author: {
    id: 1,
    username: 'testauthor',
    name: 'Test Author', // Added name field that components expect
    role: 'ADMIN',
  },
};

export const mockComment = {
  id: 1,
  content: 'This is a test comment content.',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  authorId: 1, // Added flat authorId for permission checks
  author: {
    id: 1, // Changed to match authorId
    username: 'testauthor', // Changed to match test expectations
    name: 'Test Author', // Changed to match test expectations
    role: 'USER',
  },
  postId: 1,
};
