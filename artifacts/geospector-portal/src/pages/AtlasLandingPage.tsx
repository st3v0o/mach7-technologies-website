import { MapPin, Link as LinkIcon, LayoutDashboard } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Link, useLocation } from "wouter";
import { useEffect } from "react";

export default function AtlasLandingPage() {
  const { isSignedIn, isLoaded, signOut } = useSupabaseAuth();
  const [, setLocation] = useLocation();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setLocation("/my-maps");
    }
  }, [isLoaded, isSignedIn, setLocation]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-sm w-full text-center flex flex-col items-center gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <MapPin className="h-10 w-10 text-blue-400" />
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
            Geospector
          </p>
          <h1 className="text-2xl font-bold text-white mb-3">Atlas</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Atlas hosts GPS survey maps captured with the Geospector field app. Each map lives at its own private link — there is no public gallery to browse.
          </p>
        </div>

        <div className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-start gap-3 text-left">
          <LinkIcon className="h-4 w-4 text-slate-400 flex-none mt-0.5" />
          <p className="text-sm text-slate-400">
            To view a shared map, open the link provided by the person who captured the session. Links are generated directly from the Geospector app.
          </p>
        </div>

        {isLoaded && !isSignedIn && (
          <div className="w-full flex flex-col gap-3">
            <Link
              href="/sign-in"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white font-semibold py-3 px-6 rounded-xl text-sm"
            >
              Sign in to your account
            </Link>
            <Link
              href="/sign-up"
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-600 text-slate-200 font-semibold py-3 px-6 rounded-xl text-sm"
            >
              Create account
            </Link>
          </div>
        )}

        {isLoaded && isSignedIn && (
          <div className="w-full flex flex-col gap-3">
            <Link
              href="/my-maps"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white font-semibold py-3 px-6 rounded-xl text-sm"
            >
              <LayoutDashboard className="h-4 w-4" />
              My Maps
            </Link>
            <button
              onClick={() => signOut().then(() => setLocation(`${basePath}/`))}
              className="w-full text-slate-500 hover:text-slate-300 transition-colors text-sm"
            >
              Sign out
            </button>
          </div>
        )}

        <p className="text-xs text-slate-600">
          Powered by <span className="text-slate-500 font-medium">Geospector</span> — MACH 7 Technologies LLC
        </p>
      </div>
    </div>
  );
}
