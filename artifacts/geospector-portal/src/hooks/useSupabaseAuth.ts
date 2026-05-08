import { createContext, useContext } from "react";
import type { User, Session } from "@supabase/supabase-js";

export interface SupabaseAuthContextType {
  user: User | null;
  session: Session | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
}

export const SupabaseAuthContext = createContext<SupabaseAuthContextType | null>(null);

export function useSupabaseAuth(): SupabaseAuthContextType {
  const ctx = useContext(SupabaseAuthContext);
  if (!ctx) throw new Error("useSupabaseAuth must be used within SupabaseAuthProvider");
  return ctx;
}
