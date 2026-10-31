import { createContext, useContext, useState, type ReactNode } from 'react';
import * as authService from '../services/authService';
import type { Role } from '../types';

interface AuthState {
  username: string | null;
  role: Role | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ needsBriefing: boolean }>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(localStorage.getItem('username'));
  const [role, setRole] = useState<Role | null>(localStorage.getItem('role') as Role | null);

  const login = async (usernameInput: string, password: string) => {
    const response = await authService.login(usernameInput, password);
    localStorage.setItem('token', response.token);
    localStorage.setItem('username', response.username);
    localStorage.setItem('role', response.role);
    setUsername(response.username);
    setRole(response.role);
    return { needsBriefing: !response.aVuBriefing };
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    setUsername(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{ username, role, isAuthenticated: !!username, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
