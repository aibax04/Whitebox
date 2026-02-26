import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
  role: 'superadmin' | 'admin' | 'user'; 
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credential: string) => void;
  logout: () => void;
  setUser: (user: User | null) => void; // Added setUser
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check for stored user data on mount
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (credential: string) => {
    try {
      // Save token for future requests
      localStorage.setItem('token', credential);
      // Fetch user from backend using token
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${credential}` }
      });
      if (!res.ok) throw new Error('Failed to fetch user');
      const data = await res.json();
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    // Call backend to clear outlook_token cookie
    try {
      await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      // Ignore errors
    }
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user,
      isLoading,
      login, 
      logout,
      setUser // Expose setUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}