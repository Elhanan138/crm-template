import React, { createContext, useState, useContext, useEffect } from 'react';
import { api } from '@/api/client';
import { isAdminUser } from '@/lib/permissions';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [accessCheck, setAccessCheck] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {

    // Local mode — auto-authenticate as the configured deployment owner
    const init = async () => {
      try {
        const currentUser = await api.auth.me();
        setUser(currentUser);
        setIsAuthenticated(true);
        setAccessCheck({ allowed: true });
        setAppPublicSettings({ id: 'local', public_settings: {} });
        setAuthChecked(true);

      } catch (error) {
        console.error('Local auth failed:', error);
        setAuthError({ type: 'unknown', message: error.message });
      } finally {
        setIsLoadingAuth(false);
        setIsLoadingPublicSettings(false);
      }
    };
    init();
  }, []);

  const updateUser = (updates) => {
    setUser(prev => prev ? { ...prev, ...updates } : prev);
  };

  const logout = () => {
    // Local mode — no real logout, just re-init
    api.auth.logout();
  };

  const navigateToLogin = () => {
    // Local mode — always authenticated
  };

  const checkUserAuth = async () => {
    setIsLoadingAuth(true);
    const currentUser = await api.auth.me();
    setUser(currentUser);
    setIsAuthenticated(true);
    setAuthChecked(true);
    setAccessCheck({ allowed: true });
    setIsLoadingAuth(false);
  };

  const checkAppState = async () => {
    setIsLoadingPublicSettings(false);
    await checkUserAuth();
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      accessCheck,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
      updateUser
    }}>
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
