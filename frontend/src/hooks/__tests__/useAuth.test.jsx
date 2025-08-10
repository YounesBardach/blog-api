import { renderHook } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { AuthContext } from '../../context/authContext';

// Mock the AuthContext
const createMockProvider = (contextValue) => {
  return ({ children }) => (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

describe('useAuth', () => {
  it('should return authentication context when used within AuthProvider', () => {
    const mockContextValue = {
      user: { id: 1, username: 'testuser' },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    };

    const { result } = renderHook(() => useAuth(), {
      wrapper: createMockProvider(mockContextValue),
    });

    expect(result.current).toEqual(mockContextValue);
    expect(result.current.user).toEqual({ id: 1, username: 'testuser' });
    expect(result.current.isAuthenticated).toBe(true);
    expect(typeof result.current.login).toBe('function');
    expect(typeof result.current.logout).toBe('function');
  });

  it('should return null user when not authenticated', () => {
    const mockContextValue = {
      user: null,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
    };

    const { result } = renderHook(() => useAuth(), {
      wrapper: createMockProvider(mockContextValue),
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should throw error when used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });

  it('should throw error when context is null', () => {
    expect(() => {
      renderHook(() => useAuth(), {
        wrapper: createMockProvider(null),
      });
    }).toThrow('useAuth must be used within an AuthProvider');
  });
});
