import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import api from '../config/axios';
import { AuthContext } from './authContext';
import { showSuccessToast, showErrorToast } from '../utils/errorHelpers';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  // Session probe: never errors. If authenticated, sets user in context.
  const { isLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      try {
        const session = await api.get('/users/session');
        if (session.data?.authenticated && session.data?.data?.user) {
          const user = session.data.data.user;
          setUser(user);
          return user;
        }
      } catch {
        // Treat any failure as unauthenticated
      }
      setUser(null);
      return null;
    },
    retry: false,
    staleTime: Infinity,
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => api.post('/users/logout'),
    onSuccess: () => {
      showSuccessToast('Logged out successfully. See you next time!');
      // Remove cached user on successful logout
      setUser(null);
      queryClient.removeQueries({ queryKey: ['session'] });
    },
    onError: (error) => {
      showErrorToast(error);
    },
  });

  // Helper functions exposed via context
  const login = () => {
    // Invalidate to re-run /users/session and pick up the new auth cookie
    queryClient.invalidateQueries({ queryKey: ['session'] });
  };

  const logout = () => {
    logoutMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div
          data-testid="loading-spinner"
          className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"
        ></div>
      </div>
    );
  }

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
