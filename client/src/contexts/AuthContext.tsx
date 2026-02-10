import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

type AppUser = { id: string; name: string; role: string };

interface AuthContextType {
  user: AppUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'listify_auth_user';

function resolveMockRole(username: string, password: string): string {
  const u = (username || '').trim().toLowerCase();
  const p = (password || '').trim().toLowerCase();

  // ---- LOCAL DEV ROLE SHORTCUTS ----
  // You can choose either:
  // 1) username contains "super" (e.g. "super", "superadmin", "super_admin")
  // 2) password equals "super"
  //
  // Examples:
  // - username: superadmin, password: anything   => super_admin
  // - username: edward,     password: super      => super_admin
  if (u.includes('super') || p === 'super') return 'super_admin';

  // Optional: quick shortcuts for other roles (safe for local dev)
  if (u.includes('agency')) return 'agency_admin';
  if (u.includes('agent')) return 'agent';
  if (u.includes('dev')) return 'property_developer';

  // Default mock role
  return 'admin';
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on boot
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppUser;
        if (parsed?.id && parsed?.name && parsed?.role) {
          setUser(parsed);
        }
      }
    } catch {
      // ignore parse errors; treat as logged out
    } finally {
      setLoading(false);
    }
  }, []);

  const isAuthenticated = !!user;

  const login = async (username: string, password: string) => {
    // Placeholder for actual login logic (API call in real app)
    console.log('Attempting to log in with:', username);

    const role = resolveMockRole(username, password);

    const nextUser: AppUser = {
      id: '1',
      name: username,
      role,
    };

    setUser(nextUser);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    } catch {
      // ignore storage errors
    }
  };

  const logout = async () => {
    console.log('Logging out');

    setUser(null);

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  };

  const value = useMemo<AuthContextType>(
    () => ({ user, isAuthenticated, loading, login, logout }),
    [user, isAuthenticated, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
