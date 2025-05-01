import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AxiosError } from 'axios';

interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

interface ApiErrorResponse {
  status: string;
  message: string;
  errors?: Record<string, string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get('/users/profile');
        setUser(response.data.user);
        setIsAuthenticated(true);
      } catch (error) {
        const axiosError = error as AxiosError<ApiErrorResponse>;
        if (axiosError.response?.data?.status === 'fail') {
          setUser(null);
          setIsAuthenticated(false);
        } else {
          console.error('Auth check error:', error);
        }
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await api.post('/users/login', { username, password });
      setUser(response.data.user);
      setIsAuthenticated(true);
      navigate('/');
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      if (axiosError.response?.data?.status === 'fail') {
        throw new Error(axiosError.response.data.message || 'Login failed');
      }
      throw new Error('An unexpected error occurred during login');
    }
  };

  const logout = async () => {
    try {
      await api.post('/users/logout');
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      console.error('Logout error:', axiosError);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      navigate('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 