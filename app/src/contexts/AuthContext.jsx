import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { notifications } from '@mantine/notifications';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Load user data on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const userData = await authApi.getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const { user: userData } = await authApi.login(email, password);
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
        message: error.message || 'Login failed',
        color: 'red',
      });
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
    }
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const success = await authApi.refreshToken();
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

  const refreshUser = useCallback(async () => {
    try {
      const userData = await authApi.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  }, []);

  const value = {
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
