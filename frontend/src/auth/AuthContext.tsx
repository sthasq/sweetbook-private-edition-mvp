/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ApiError } from "../api/client";
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  signup as signupRequest,
} from "../api/auth";
import type { AuthUser } from "../types/api";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (body: { email: string; password: string }) => Promise<AuthUser>;
  signup: (body: {
    email: string;
    password: string;
    displayName: string;
    role: "FAN" | "CREATOR";
    channelHandle?: string;
  }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshCurrentUser() {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setUser(null);
        return null;
      }
      throw e;
    }
  }

  useEffect(() => {
    let cancelled = false;

    void getCurrentUser()
      .then((currentUser) => {
        if (!cancelled) {
          setUser(currentUser);
        }
      })
      .catch((e) => {
        if (cancelled) {
          return;
        }
        if (e instanceof ApiError && e.status === 401) {
          setUser(null);
          return;
        }
        console.error(e);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function login(body: { email: string; password: string }) {
    const currentUser = await loginRequest(body);
    setUser(currentUser);
    return currentUser;
  }

  async function signup(body: {
    email: string;
    password: string;
    displayName: string;
    role: "FAN" | "CREATOR";
    channelHandle?: string;
  }) {
    const currentUser = await signupRequest(body);
    setUser(currentUser);
    return currentUser;
  }

  async function logout() {
    await logoutRequest();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        refresh: refreshCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
