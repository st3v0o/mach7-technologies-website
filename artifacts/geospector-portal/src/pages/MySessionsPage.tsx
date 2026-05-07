import { useAuth, useClerk, useUser, Show } from "@clerk/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, Redirect } from "wouter";
import {
  MapPin,
  Share2,
  Trash2,
  ExternalLink,
  LogOut,
  ChevronLeft,
  UserCircle2,
  Globe,
  Lock,
} from "lucide-react";
import { useState } from "react";

const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "").replace(/\/geospector-portal$/, "");

async function fetchWithAuth(url: string, token: string | null, options?: RequestInit) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

interface PortalSession {
  id: number;
  title: string | null;
  sessionId: string;
  createdAt: string;
  totalFrames: number;
  totalDistanceMiles: number | null;
  durationSeconds: number | null;
  publicShareToken: string | null;
  isPublic: boolean | null;
  status: string;
}

export default function MySessionsPage() {
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const { user } = useUser();
  const qc = useQueryClient();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const [copied, setCopied] = useState<number | null>(null);

  const { data: sessions = [], isLoading, error } = useQuery<PortalSession[]>({
    queryKey: ["my-sessions"],
    queryFn: async () => {
      const token = await getToken();
      return fetchWithAuth(`${apiBase}/api/portal/my-sessions`, token);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken();
      return fetchWithAuth(`${apiBase}/api/portal/my-sessions/${id}`, token, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-sessions"] }),
  });

  const visibilityMutation = useMutation({
    mutationFn: async ({ id, isPublic }: { id: number; isPublic: boolean }) => {
      const token = await getToken();
      return fetchWithAuth(`${apiBase}/api/portal/sessions/${id}/publish`, token, {
        method: "PATCH",
        body: JSON.stringify({ isPublic }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-sessions"] }),
  });

  const handleCopy = (session: PortalSession) => {
    if (!session.publicShareToken) return;
    const url = `${window.location.origin}${basePath}/share/${session.publicShareToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(session.id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  const formatDistance = (miles: number | null) =>
    miles != null ? `${miles.toFixed(2)} mi` : "—";

  return (
    <Show when="signed-in" fallback={<Redirect to="/sign-in" />}>
      <div className="min-h-screen bg-slate-900 text-white">
        <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/my-maps" className="text-slate-400 hover:text-white transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-400" />
              <span className="font-semibold text-white">My Sessions</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt="avatar"
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <UserCircle2 className="h-7 w-7 text-slate-500" />
              )}
              <span className="text-sm text-slate-300 hidden sm:block">
                {user?.primaryEmailAddress?.emailAddress ?? user?.fullName ?? ""}
              </span>
            </div>
            <button
              onClick={() => signOut({ redirectUrl: `${basePath}/` })}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-8">
          {isLoading && (
            <p className="text-slate-400 text-center py-16">Loading your sessions…</p>
          )}
          {error && (
            <p className="text-red-400 text-center py-16">Failed to load sessions. Please refresh.</p>
          )}
          {!isLoading && !error && sessions.length === 0 && (
            <div className="text-center py-16">
              <p className="text-slate-400 mb-2">No sessions yet.</p>
              <p className="text-slate-500 text-sm">
                Publish a session from the Geospector app and it will appear here.
              </p>
            </div>
          )}
          <div className="flex flex-col gap-4">
            {sessions.map((session) => {
              const isPublic = session.isPublic ?? false;
              const isPendingVisibility = visibilityMutation.isPending &&
                (visibilityMutation.variables as { id: number } | undefined)?.id === session.id;

              return (
                <div
                  key={session.id}
                  className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-white text-base leading-tight truncate">
                        {session.title ?? "Untitled session"}
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatDate(session.createdAt)}
                        {" · "}
                        {session.totalFrames} frames
                        {" · "}
                        {formatDistance(session.totalDistanceMiles)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-none">
                      {session.publicShareToken && (
                        <a
                          href={`${basePath}/share/${session.publicShareToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
                          title="Open share page"
                        >
                          <ExternalLink className="h-4 w-4 text-slate-300" />
                        </a>
                      )}
                      <button
                        onClick={() => handleCopy(session)}
                        disabled={!session.publicShareToken}
                        className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors disabled:opacity-40"
                        title="Copy share link"
                      >
                        <Share2 className="h-4 w-4 text-slate-300" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Delete this session permanently? This cannot be undone.")) {
                            deleteMutation.mutate(session.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="p-2 rounded-lg bg-slate-700 hover:bg-red-800 transition-colors"
                        title="Delete session"
                      >
                        <Trash2 className="h-4 w-4 text-slate-400" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-700">
                    <span className="text-xs text-slate-500">Visibility</span>
                    <button
                      onClick={() =>
                        visibilityMutation.mutate({ id: session.id, isPublic: !isPublic })
                      }
                      disabled={isPendingVisibility}
                      className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        isPublic
                          ? "bg-emerald-900/60 text-emerald-300 hover:bg-emerald-900"
                          : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                      } disabled:opacity-50`}
                      title={isPublic ? "Make private" : "Make public"}
                    >
                      {isPublic ? (
                        <>
                          <Globe className="h-3.5 w-3.5" />
                          Public
                        </>
                      ) : (
                        <>
                          <Lock className="h-3.5 w-3.5" />
                          Private
                        </>
                      )}
                    </button>
                  </div>

                  {copied === session.id && (
                    <p className="text-xs text-emerald-400">Link copied!</p>
                  )}
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </Show>
  );
}
