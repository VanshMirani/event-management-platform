import { useCallback, useEffect, useMemo, useState } from "react";
import {
  currentUserRequest,
  loginRequest,
  logoutRequest,
  registerRequest
} from "../../api/auth.js";
import { subscribeToUnauthorized } from "../../api/http.js";
import { AuthContext } from "./AuthContext.js";

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState("");

  const refreshCurrentUser = useCallback(async () => {
    setIsCheckingAuth(true);
    setAuthError("");

    try {
      const user = await currentUserRequest();
      setCurrentUser(user);
      return user;
    } catch (error) {
      setCurrentUser(null);

      if (error.status && error.status !== 401) {
        setAuthError(error.message);
      }

      return null;
    } finally {
      setIsCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    refreshCurrentUser();
  }, [refreshCurrentUser]);

  useEffect(
    () =>
      subscribeToUnauthorized(() => {
        setCurrentUser(null);
        setIsCheckingAuth(false);
      }),
    []
  );

  const login = useCallback(async (credentials) => {
    setAuthError("");
    const user = await loginRequest(credentials);
    setCurrentUser(user);
    return user;
  }, []);

  const register = useCallback(async (data) => {
    setAuthError("");
    const user = await registerRequest(data);
    setCurrentUser(user);
    return user;
  }, []);

  const logout = useCallback(async (beforeSessionClear) => {
    setAuthError("");

    try {
      await logoutRequest();
      beforeSessionClear?.();
      setCurrentUser(null);
      return true;
    } catch (error) {
      setAuthError(error.message);
      return false;
    }
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated: Boolean(currentUser),
      isCheckingAuth,
      authError,
      login,
      register,
      logout,
      refreshCurrentUser
    }),
    [
      authError,
      currentUser,
      isCheckingAuth,
      login,
      logout,
      refreshCurrentUser,
      register
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
