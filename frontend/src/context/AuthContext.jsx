import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from 'react';
import { auth } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const saveSession = useCallback((sessionData) => {
    localStorage.setItem('token', sessionData.token);
    localStorage.setItem('user', JSON.stringify(sessionData.user));
    setToken(sessionData.token);
    setUser(sessionData.user);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  const login = async (email, password) => {
    const response = await auth.login({ email, password });

    saveSession(response.data);

    return response.data;
  };

  const register = async (name, email, password) => {
    const response = await auth.register({ name, email, password });

    saveSession(response.data);

    return response.data;
  };

  const logout = () => {
    clearSession();
  };

  const checkAuth = useCallback(async () => {
    const storedToken = localStorage.getItem('token');

    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await auth.getMe();

      setToken(storedToken);
      setUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    } catch (error) {
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};

export default useAuth;
