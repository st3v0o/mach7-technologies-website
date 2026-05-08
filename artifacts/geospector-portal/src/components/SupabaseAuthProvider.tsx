import { useEffect, useRef, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { SupabaseAuthContext } from "@/hooks/useSupabaseAuth";
import { useQueryClient } from "@tanstack/react-query";

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      prevUserIdRef.current = session?.user?.id ?? null;
      setIsLoaded(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUserId = session?.user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== newUserId) {
        qc.clear();
      }
      prevUserIdRef.current = newUserId;
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const getToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <SupabaseAuthContext.Provider value={{
      user,
      session,
      isLoaded,
      isSignedIn: !!user,
      getToken,
      signOut,
    }}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}
