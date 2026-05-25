import { createContext, useContext, useEffect, useState } from "react";

type Session = { email: string; name: string; role: string } | null;

const AuthCtx = createContext<{
  session: Session;
  signIn: (email: string) => void;
  signOut: () => void;
  ready: boolean;
}>({ session: null, signIn: () => {}, signOut: () => {}, ready: false });

const KEY = "plut-session";

function deriveName(email: string) {
  const handle = email.split("@")[0] ?? "Admin";
  return handle
    .split(/[._-]/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ") || "Admin";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSession(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  const signIn = (email: string) => {
    const next = { email, name: deriveName(email), role: "Super Admin" };
    localStorage.setItem(KEY, JSON.stringify(next));
    setSession(next);
  };

  const signOut = () => {
    localStorage.removeItem(KEY);
    setSession(null);
  };

  return <AuthCtx.Provider value={{ session, signIn, signOut, ready }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);