import React, { useState } from "react";
import api from "../config/axios";
import { AuthContext } from "./authContext";
import { useQueryClient } from "@tanstack/react-query";

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const queryClient = useQueryClient();

  const login = () => {
    setIsAuthenticated(true);
    // Invalidate any cached profile data
    queryClient.invalidateQueries({ queryKey: ["profile"] });
  };

  const logout = async () => {
    try {
      await api.post("/users/logout");
    } finally {
      setIsAuthenticated(false);
      queryClient.clear();
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
