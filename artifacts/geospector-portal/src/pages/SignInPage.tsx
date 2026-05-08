import { useState } from "react";
import { useLocation, Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { MapPin } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type Tab = "password" | "magic-link";

export default function SignInPage() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>("password");

  // Password fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Magic-link state
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); return; }
      setLocation(`${basePath}/my-maps`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}${basePath}/my-maps` },
      });
      if (error) { setError(error.message); return; }
      setMagicLinkSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send link");
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "apple") {
    setError(null);
    setOauthLoading(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}${basePath}/my-maps` },
      });
      if (error) setError(error.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : `${provider} sign-in failed`);
    } finally {
      setOauthLoading(null);
    }
  }

  if (magicLinkSent) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-900 px-4">
        <div className="w-full max-w-sm text-center flex flex-col items-center gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
            <MapPin className="h-7 w-7 text-blue-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Check your email</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            We sent a sign-in link to <strong className="text-slate-200">{email}</strong>.
            Click it to access your account — no password needed.
          </p>
          <button
            onClick={() => setMagicLinkSent(false)}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Try a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
            <MapPin className="h-7 w-7 text-blue-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Sign in to Geospector</h1>
          <p className="text-sm text-slate-400">Access your Atlas sessions</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col gap-4 shadow-2xl">
          {/* OAuth buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleOAuth("google")}
              disabled={!!oauthLoading || loading}
              className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600 text-slate-200 font-medium py-2.5 px-4 rounded-xl text-sm transition-colors"
            >
              {oauthLoading === "google" ? (
                <span className="text-slate-400 text-xs">Redirecting…</span>
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            <button
              onClick={() => handleOAuth("apple")}
              disabled={!!oauthLoading || loading}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium py-2.5 px-4 rounded-xl text-sm transition-colors"
            >
              {oauthLoading === "apple" ? (
                <span className="text-gray-500 text-xs">Redirecting…</span>
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  Continue with Apple
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-xs text-slate-500">or</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          {/* Tab switcher */}
          <div className="flex rounded-xl bg-slate-900 p-1 gap-1">
            <button
              onClick={() => { setTab("password"); setError(null); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tab === "password"
                  ? "bg-slate-700 text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Password
            </button>
            <button
              onClick={() => { setTab("magic-link"); setError(null); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tab === "magic-link"
                  ? "bg-slate-700 text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Magic link
            </button>
          </div>

          {tab === "password" ? (
            <form onSubmit={handlePasswordSignIn} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="magic-email" className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Email
                </label>
                <input
                  id="magic-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors"
              >
                {loading ? "Sending link…" : "Send magic link"}
              </button>
              <p className="text-xs text-slate-500 text-center">
                We'll email you a one-click sign-in link. No password needed.
              </p>
            </form>
          )}

          <p className="text-center text-xs text-slate-500">
            Don't have an account?{" "}
            <Link href={`${basePath}/sign-up`} className="text-blue-400 hover:text-blue-300 transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
