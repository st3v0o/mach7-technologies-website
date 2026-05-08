import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

interface SupabaseAuthContextType {
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

export function createSupabaseAuthState() {
  let user: User | null = null;
  let session: Session | null = null;
  let isLoaded = false;

  return { user, session, isLoaded };
}

export { type SupabaseAuthContextType };
