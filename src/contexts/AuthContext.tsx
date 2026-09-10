import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { User } from "@/types";
import adapter from "@/services";
import { supabase } from "@/services/supabase/client";

const SHOP_STORAGE_KEY = "barberpro_current_shop";

interface AuthContextType {
  user: User | null;
  shopId: string | null;
  currentShopId: string | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string, mode?: "admin" | "barber" | "supersistema") => Promise<void>;
  logout: () => Promise<void>;
  enterShop: (shopId: string) => void;
  exitShop: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getStoredShopId(): string | null {
  try { return localStorage.getItem(SHOP_STORAGE_KEY); } catch { return null; }
}

function setStoredShopId(shopId: string | null) {
  try {
    if (shopId) localStorage.setItem(SHOP_STORAGE_KEY, shopId);
    else localStorage.removeItem(SHOP_STORAGE_KEY);
  } catch { /* ignore */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  const [currentShopId, setCurrentShopId] = useState<string | null>(getStoredShopId);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setToken(session.access_token);
        adapter
          .validateToken(session.access_token)
          .then((validatedUser) => {
            setUser(validatedUser);
            setShopId(validatedUser.shop_id);
            if (validatedUser.role === "supersistema") {
              const stored = getStoredShopId();
              setCurrentShopId(stored);
            } else {
              setCurrentShopId(validatedUser.shop_id);
            }
          })
          .catch(() => {
            setToken(null);
          })
          .finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          setToken(session.access_token);
          try {
            const validatedUser = await adapter.validateToken(session.access_token);
            setUser(validatedUser);
            setShopId(validatedUser.shop_id);
            if (validatedUser.role === "supersistema") {
              const stored = getStoredShopId();
              setCurrentShopId(stored);
            } else {
              setCurrentShopId(validatedUser.shop_id);
            }
          } catch {
            setUser(null);
            setShopId(null);
            setCurrentShopId(null);
            setStoredShopId(null);
          }
        } else {
          setToken(null);
          setUser(null);
          setShopId(null);
          setCurrentShopId(null);
          setStoredShopId(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (identifier: string, password: string, mode: "admin" | "barber" | "supersistema" = "admin") => {
    const result = await adapter.login(identifier, password, mode);
    setToken(result.token);
    setUser(result.user);
    setShopId(result.shop_id);
    if (result.user.role === "supersistema") {
      const stored = getStoredShopId();
      setCurrentShopId(stored);
    } else {
      setCurrentShopId(result.shop_id);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await adapter.logout();
    } finally {
      setToken(null);
      setUser(null);
      setShopId(null);
      setCurrentShopId(null);
      setStoredShopId(null);
    }
  }, []);

  const enterShop = useCallback((targetShopId: string) => {
    adapter.enterShop(targetShopId);
    setCurrentShopId(targetShopId);
    setStoredShopId(targetShopId);
  }, []);

  const exitShop = useCallback(() => {
    adapter.exitShop();
    setCurrentShopId(null);
    setStoredShopId(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, shopId, currentShopId, token, isLoading, login, logout, enterShop, exitShop }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
