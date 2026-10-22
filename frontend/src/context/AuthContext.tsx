import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, UserRole, LoginPayload, RegisterPayload } from '../types/auth';
import { loginUser, registerUser, setAuthToken, verifyRoleFromDB } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  allowedRoutes: string[];
  login: (credentials: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  switchPersona: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [allowedRoutes, setAllowedRoutes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and verify role directly with the database
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('supportpilot_token');
      if (savedToken) {
        setAuthToken(savedToken);
        try {
          // Strictly verify role from the database
          const verified = await verifyRoleFromDB();
          const verifiedUser: User = {
            user_id: verified.user_id,
            email: verified.email,
            full_name: verified.full_name,
            department: verified.department,
            role: verified.role,
          };
          setToken(savedToken);
          setUser(verifiedUser);
          setAllowedRoutes(verified.allowed_routes);
          localStorage.setItem('supportpilot_user', JSON.stringify(verifiedUser));
        } catch {
          // If token invalid, purge
          logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginPayload) => {
    setIsLoading(true);
    try {
      const res = await loginUser(credentials);
      setToken(res.access_token);
      setAuthToken(res.access_token);
      localStorage.setItem('supportpilot_token', res.access_token);

      // Verify the role directly from database
      const verified = await verifyRoleFromDB();
      const verifiedUser: User = {
        user_id: verified.user_id,
        email: verified.email,
        full_name: verified.full_name,
        department: verified.department,
        role: verified.role,
      };
      setUser(verifiedUser);
      setAllowedRoutes(verified.allowed_routes);
      localStorage.setItem('supportpilot_user', JSON.stringify(verifiedUser));
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    setIsLoading(true);
    try {
      const res = await registerUser(payload);
      setToken(res.access_token);
      setAuthToken(res.access_token);
      localStorage.setItem('supportpilot_token', res.access_token);

      const verified = await verifyRoleFromDB();
      const verifiedUser: User = {
        user_id: verified.user_id,
        email: verified.email,
        full_name: verified.full_name,
        department: verified.department,
        role: verified.role,
      };
      setUser(verifiedUser);
      setAllowedRoutes(verified.allowed_routes);
      localStorage.setItem('supportpilot_user', JSON.stringify(verifiedUser));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setAllowedRoutes([]);
    setAuthToken(null);
    localStorage.removeItem('supportpilot_token');
    localStorage.removeItem('supportpilot_user');
  };

  const switchPersona = async (email: string) => {
    await login({ email, password: 'password123' });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        allowedRoutes,
        login,
        register,
        logout,
        switchPersona,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
