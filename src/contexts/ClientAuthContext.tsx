import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { Client } from "@/types";
import adapter from "@/services";

const CLIENT_SESSION_KEY = "barberpro_client_session";

interface ClientAuthContextType {
  client: Client | null;
  shopName: string;
  isLoading: boolean;
  login: (phone: string, pin: string) => Promise<void>;
  logout: () => void;
}

const ClientAuthContext = createContext<ClientAuthContextType | undefined>(undefined);

function getStoredSession(): { client: Client; shop_name: string; token: string } | null {
  try {
    const raw = localStorage.getItem(CLIENT_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setStoredSession(session: { client: Client; shop_name: string; token: string } | null) {
  try {
    if (session) localStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(CLIENT_SESSION_KEY);
  } catch { /* ignore */ }
}

export function ClientAuthProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<Client | null>(null);
  const [shopName, setShopName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredSession();
    if (stored) {
      setClient(stored.client);
      setShopName(stored.shop_name);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (phone: string, pin: string) => {
    const result = await adapter.clientLogin(phone, pin);
    setClient(result.client);
    setShopName(result.shop_name);
    setStoredSession(result);
  }, []);

  const logout = useCallback(() => {
    setClient(null);
    setShopName("");
    setStoredSession(null);
    localStorage.removeItem("barberpro_client_shop_id");
  }, []);

  return (
    <ClientAuthContext.Provider value={{ client, shopName, isLoading, login, logout }}>
      {children}
    </ClientAuthContext.Provider>
  );
}

export function useClientAuth() {
  const context = useContext(ClientAuthContext);
  if (context === undefined) {
    throw new Error("useClientAuth must be used within a ClientAuthProvider");
  }
  return context;
}
