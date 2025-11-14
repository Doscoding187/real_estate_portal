import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  user: { id: string; name: string; role: string } | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const isAuthenticated = user !== null;

  const login = async (username: string, password: string) => {
    // Placeholder for actual login logic
    console.log('Attempting to log in with:', username, password);
    // In a real app, you'd make an API call here
    setUser({ id: '1', name: username, role: 'admin' }); // Mock user
  };

  const logout = async () => {
    // Placeholder for actual logout logic
    console.log('Logging out');
    // In a real app, you'd make an API call here
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
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
