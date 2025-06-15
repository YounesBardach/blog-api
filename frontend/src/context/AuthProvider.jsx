import React, { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import api from "../config/axios";
import { AuthContext } from "./authContext";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  // Main query to determine if user is authenticated
  const { isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await api.get("/users/profile");
      const user = res.data.data.user;
      setUser(user);
      return user;
    },
    retry: false,
    staleTime: Infinity,
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => api.post("/users/logout"),
    onSuccess: () => {
      // Remove cached user on successful logout
      setUser(null);
      queryClient.removeQueries({ queryKey: ["profile"] });
    },
  });

  // Helper functions exposed via context
  const login = () => {
    // Instead of setting incomplete user data, invalidate the profile query
    // to refetch complete user data including createdAt
    queryClient.invalidateQueries({ queryKey: ["profile"] });
  };

  const logout = () => {
    logoutMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
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
