import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { notifications } from '@mantine/notifications';
import {
  login as apiLogin,
  logout as apiLogout,
  refreshToken as apiRefreshToken,
  getCurrentUser,
} from '@/api/auth';
import type { User } from '@/types/models';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [initialized, setInitialized] = useState<boolean>(false);

  // Load user data on mount
  useEffect(() => {
    const initializeAuth = async (): Promise<void> => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    void initializeAuth();
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      try {
        const userData = await apiLogin(email, password);
        setUser(userData);
        notifications.show({
          title: 'Success',
          message: 'Logged in successfully',
          color: 'green',
        });
        return true;
      } catch (error) {
        console.error('Login failed:', error);
        notifications.show({
          title: 'Error',
          message: error instanceof Error ? error.message : 'Login failed',
          color: 'red',
        });
        return false;
      }
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiLogout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const success = await apiRefreshToken();
      if (!success) {
        await logout();
      }
      return success;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
      return false;
    }
  }, [logout]);

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    initialized,
    login,
    logout,
    refreshToken,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
