import { renderHook } from '@testing-library/react';
import { usePermissions } from '../usePermissions';
import { AuthContext } from '../../context/authContext';

// Mock the useAuth hook by providing AuthContext directly
const createMockProvider = (user) => {
  return ({ children }) => (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, login: vi.fn(), logout: vi.fn() }}
    >
      {children}
    </AuthContext.Provider>
  );
};

describe('usePermissions', () => {
  it('should return correct permissions for admin user', () => {
    const adminUser = { id: 1, username: 'admin', role: 'ADMIN' };

    const { result } = renderHook(() => usePermissions(), {
      wrapper: createMockProvider(adminUser),
    });

    expect(result.current.isAdmin()).toBe(true);

    // Admin can manage any comment
    const someComment = { id: 1, authorId: 999, content: 'test' };
    expect(result.current.canManageComment(someComment)).toBe(true);
  });

  it('should return correct permissions for regular user', () => {
    const regularUser = { id: 1, username: 'user', role: 'USER' };

    const { result } = renderHook(() => usePermissions(), {
      wrapper: createMockProvider(regularUser),
    });

    expect(result.current.isAdmin()).toBe(false);

    // User can manage their own comments
    const ownComment = { id: 1, authorId: 1, content: 'test' };
    expect(result.current.canManageComment(ownComment)).toBe(true);

    // User cannot manage others' comments
    const othersComment = { id: 2, authorId: 999, content: 'test' };
    expect(result.current.canManageComment(othersComment)).toBe(false);
  });

  it('should return false permissions when not authenticated', () => {
    const { result } = renderHook(() => usePermissions(), {
      wrapper: createMockProvider(null),
    });

    expect(result.current.isAdmin()).toBe(false);

    const someComment = { id: 1, authorId: 1, content: 'test' };
    expect(result.current.canManageComment(someComment)).toBe(false);
  });

  it('should handle missing user gracefully', () => {
    const { result } = renderHook(() => usePermissions(), {
      wrapper: createMockProvider(undefined),
    });

    expect(result.current.isAdmin()).toBe(false);
    expect(result.current.canManageComment({ id: 1, authorId: 1 })).toBe(false);
  });
});
