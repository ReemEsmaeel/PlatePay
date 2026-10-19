import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getAuthSession, loginAccount, logoutAccount, registerAccount } from "@workspace/api-client-react";
import type { AuthAccount, CredentialsInput, RegistrationInput } from "@workspace/api-client-react";

interface AuthState {
  account: AuthAccount | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  error: unknown;
  refresh: () => Promise<void>;
  signIn: (data: CredentialsInput) => Promise<void>;
  register: (data: RegistrationInput) => Promise<void>;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [account, setAccount] = useState<AuthAccount | null>(null);
  const [isLoaded, setLoaded] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const accountId = useRef<string | null>(null);
  const version = useRef(0);
  const channel = useRef<BroadcastChannel | null>(null);
  const commit = useCallback((next: AuthAccount | null) => {
    if (accountId.current !== (next?.id ?? null)) qc.clear();
    accountId.current = next?.id ?? null;
    setAccount(next);
    setError(null);
    setLoaded(true);
  }, [qc]);
  const refresh = useCallback(async () => {
    const requestVersion = ++version.current;
    try {
      const result = await getAuthSession();
      if (requestVersion === version.current) commit(result.account);
    } catch (failure) {
      if (requestVersion === version.current) { setError(failure); setLoaded(true); }
    }
  }, [commit]);
  useEffect(() => {
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel("platepay-auth");
      channel.current.onmessage = () => { ++version.current; commit(null); void refresh(); };
    }
    return () => { ++version.current; window.removeEventListener("focus", onFocus); channel.current?.close(); };
  }, [commit, refresh]);
  const authenticate = async (request: () => ReturnType<typeof loginAccount>) => {
    ++version.current;
    const result = await request();
    ++version.current;
    commit(result.account);
    channel.current?.postMessage("changed");
  };
  const signOut = async () => {
    ++version.current;
    await logoutAccount();
    ++version.current;
    commit(null);
    channel.current?.postMessage("changed");
  };
  return <AuthContext.Provider value={{
    account, isLoaded, isSignedIn: account !== null, error, refresh, signOut,
    signIn: data => authenticate(() => loginAccount(data)),
    register: data => authenticate(() => registerAccount(data)),
  }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("Authentication provider is missing.");
  return context;
}
