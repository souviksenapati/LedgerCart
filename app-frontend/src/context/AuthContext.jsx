import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext();

// Mirror backend's PERMISSION_HIERARCHY — must stay in sync with models.py
const PERMISSION_HIERARCHY = {
  manage: ['view', 'export'],  // manage implies view AND export
  approve: ['view'],            // approve implies view
  void: ['view'],               // void implies view
  audit: ['view'],              // audit implies view
  export: ['view'],             // export implies view — e.g. reports:export grants reports:view
};

// Non-customer roles allowed in the admin portal
const ADMIN_PORTAL_ROLES = ['ADMIN', 'STAFF', 'STORE_MANAGER', 'SALESPERSON', 'PURCHASE_MANAGER', 'STOCK_KEEPER', 'ACCOUNTANT'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = sessionStorage.getItem('token');
      const saved = sessionStorage.getItem('user');

      if (token && saved) {
        try {
          setUser(JSON.parse(saved));
          const res = await authAPI.getMe();
          setUser(res.data);
          sessionStorage.setItem('user', JSON.stringify(res.data));
        } catch (error) {
          // Token is invalid, clear auth data
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password, portal = null) => {
    const res = await authAPI.login({ email, password, portal });
    sessionStorage.setItem('token', res.data.access_token);
    sessionStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (data) => {
    const res = await authAPI.register(data);
    sessionStorage.setItem('token', res.data.access_token);
    sessionStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
  };

  const updateUser = (data) => {
    setUser(data);
    sessionStorage.setItem('user', JSON.stringify(data));
  };

  // ─── Permission checking (mirrors backend require_permission logic) ───
  const hasPermission = useCallback((requiredPermission) => {
    if (!user) return false;

    // ADMIN wildcard — full access to everything
    if (user.role === 'ADMIN') return true;

    const userPerms = user.permissions || [];

    // Direct match
    if (userPerms.includes(requiredPermission)) return true;

    // Wildcard match
    if (userPerms.includes('*')) return true;

    // Hierarchy implication — e.g. having "stock:manage" implies "stock:view"
    const parts = requiredPermission.split(':');
    if (parts.length === 2) {
      const [module, action] = parts;
      // Check if user has a permission whose action implies the requested action
      for (const [superAction, impliedActions] of Object.entries(PERMISSION_HIERARCHY)) {
        if (impliedActions.includes(action)) {
          // User needs module:superAction to implicitly have module:action
          if (userPerms.includes(`${module}:${superAction}`)) return true;
        }
      }
    }

    return false;
  }, [user]);

  const isAdmin = user?.role === 'ADMIN';
  const isPortalUser = user && ADMIN_PORTAL_ROLES.includes(user.role);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, isAdmin, isStaff: isPortalUser, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
