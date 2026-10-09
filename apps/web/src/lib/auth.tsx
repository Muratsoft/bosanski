"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, type AuthResponse, type SafeUser } from "./api";

type AuthState = {
  user: SafeUser | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
    referralCode?: string,
  ) => Promise<void>;
  completeOAuth: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => void;
  isStaff: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEY = "bosanski_auth";

function persist(data: AuthResponse | null) {
  if (typeof window === "undefined") return;
  if (!data) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function readStored(): AuthResponse | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthResponse;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = readStored();
    if (!stored?.accessToken) {
      setLoading(false);
      return;
    }
    setAccessToken(stored.accessToken);
    setUser(stored.user);
    api
      .me(stored.accessToken)
      .then((me) => {
        setUser(me);
        persist({ ...stored, user: me });
      })
      .catch(() => {
        persist(null);
        setUser(null);
        setAccessToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const applyAuth = useCallback((data: AuthResponse) => {
    setUser(data.user);
    setAccessToken(data.accessToken);
    persist(data);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api.login({ email, password });
      applyAuth(data);
    },
    [applyAuth],
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
      referralCode?: string,
    ) => {
      const data = await api.register({
        email,
        password,
        displayName,
        referralCode,
      });
      applyAuth(data);
    },
    [applyAuth],
  );

  const completeOAuth = useCallback(
    async (accessTokenValue: string, refreshToken: string) => {
      const me = await api.me(accessTokenValue);
      applyAuth({
        user: me,
        accessToken: accessTokenValue,
        refreshToken,
      });
    },
    [applyAuth],
  );

  const logout = useCallback(() => {
    persist(null);
    setUser(null);
    setAccessToken(null);
  }, []);

  const isStaff = useMemo(() => {
    return ["SUPER_ADMIN", "MODERATOR", "TEACHER"].includes(user?.role || "");
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      loading,
      login,
      register,
      completeOAuth,
      logout,
      isStaff,
    }),
    [
      user,
      accessToken,
      loading,
      login,
      register,
      completeOAuth,
      logout,
      isStaff,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth AuthProvider içinde kullanılmalı");
  return ctx;
}
