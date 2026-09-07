"use client";

import type { TenantId } from "@account-ledgers/domain";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { auth } from "@account-ledgers/infrastructure/firebase/app";

interface AuthState {
  user: User | null;
  /** True until onAuthStateChanged fires for the first time. */
  loading: boolean;
  /** Tenant ID of the signed-in user, which equals their uid. Null when signed out. */
  tenantId: TenantId | null;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  tenantId: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      onAuthStateChanged(auth, (nextUser) => {
        setUser(nextUser);
        setLoading(false);
      }),
    [],
  );

  return (
    <AuthContext.Provider
      value={{ user, loading, tenantId: (user?.uid as TenantId | undefined) ?? null }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
