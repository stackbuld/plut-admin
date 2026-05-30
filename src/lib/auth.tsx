import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { buildLogoutUrl } from "./zitadel";

export type Session = {
  accessToken: string;
  idToken: string;
  userId: string;
  email: string;
  name: string;
  role: string;
} | null;

const SESSION_KEY = "plut-session";

const AuthCtx = createContext<{
  session: Session;
  setSession: (s: Session) => void;
  signOut: () => void;
  ready: boolean;
}>({ session: null, setSession: () => {}, signOut: () => {}, ready: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.accessToken) {
          setSessionState(parsed);
        } else {
          // Clear stale session from old auth format
          localStorage.removeItem(SESSION_KEY);
        }
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
    setReady(true);
  }, []);

  const setSession = (s: Session) => {
    if (s) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
    setSessionState(s);
  };

  const signOut = () => {
    const idToken = session?.idToken;
    localStorage.removeItem(SESSION_KEY);
    setSessionState(null);
    window.location.href = buildLogoutUrl(idToken);
  };

  return (
    <AuthCtx.Provider value={{ session, setSession, signOut, ready }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
