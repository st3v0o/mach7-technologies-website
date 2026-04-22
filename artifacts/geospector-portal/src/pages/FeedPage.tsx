import { Link, useLocation } from "wouter";
import { useGetPortalFeed, useImportMockPortalSession, getGetPortalFeedQueryKey } from "@workspace/api-client-react";
import { MapPin, Route, Clock, Plus, Globe, ArrowRight, Layers } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { PortalSession } from "@workspace/api-client-react";

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function FeedCard({ session }: { session: PortalSession }) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 hover:border-blue-500/50 transition-all group overflow-hidden flex flex-col">
      <div className="relative overflow-hidden bg-slate-700" style={{ height: 160 }}>
        {session.thumbnailUrl ? (
          <img
            src={session.thumbnailUrl}
            alt={session.title ?? "Session"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="h-10 w-10 text-slate-500" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className="flex items-center gap-1 bg-green-600/90 text-white text-xs px-2 py-0.5 rounded-full font-medium backdrop-blur">
            <Globe className="h-3 w-3" />
            Public
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1 gap-3">
        <div>
          <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors line-clamp-2 leading-snug">
            {session.title ?? session.sessionId}
          </h3>
          <p className="text-xs text-slate-400 mt-1">{formatDate(session.createdAt)}</p>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
          {session.totalDistanceMiles != null && (
            <span className="flex items-center gap-1">
              <Route className="h-3 w-3" />
              {session.totalDistanceMiles.toFixed(2)} mi
            </span>
          )}
          {session.durationSeconds != null && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(session.durationSeconds)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            {session.totalFrames} frames
          </span>
        </div>

        <div className="mt-auto pt-1">
          <Link
            href={`/sessions/${session.id}`}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-blue-600/20 text-blue-300 hover:bg-blue-600/40 hover:text-white transition-colors text-sm font-medium"
          >
            View Map
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function FeedPage() {
  const { data, isLoading, error } = useGetPortalFeed();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const { mutate: importMock, isPending: importing } = useImportMockPortalSession({
    mutation: {
      onSuccess(newSession) {
        qc.invalidateQueries({ queryKey: getGetPortalFeedQueryKey() });
        navigate(`/sessions/${newSession.id}`);
      },
    },
  });

  const sessions = data?.sessions ?? [];
  const totalPublic = data?.totalPublic ?? 0;
  const totalMiles = data?.totalPublicDistanceMiles ?? 0;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-slate-700 bg-slate-800/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-400" />
            <span className="font-bold text-lg tracking-tight">Geospector Portal</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/sessions"
              className="text-sm px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:border-blue-500 hover:text-white transition-colors"
            >
              Manage Sessions →
            </Link>
            <button
              onClick={() => importMock()}
              disabled={importing}
              className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              {importing ? "Generating…" : "Demo Session"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Community Map Feed</h1>
          <p className="text-slate-400 text-base max-w-xl">
            GPS survey sessions published by the Geospector community. Each map shows a real-world route captured with the Geospector app.
          </p>
        </div>

        {!isLoading && !error && (
          <div className="flex gap-4 mb-8 flex-wrap">
            <div className="bg-slate-800 rounded-lg px-5 py-3 flex items-center gap-3 border border-slate-700">
              <Globe className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Maps Shared</p>
                <p className="text-2xl font-bold text-white">{totalPublic}</p>
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg px-5 py-3 flex items-center gap-3 border border-slate-700">
              <Route className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Total Distance</p>
                <p className="text-2xl font-bold text-white">{totalMiles.toFixed(1)} mi</p>
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-24 text-slate-400">
            Loading feed…
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-900/30 border border-red-700 p-4 text-red-300 text-sm">
            Failed to load feed. Make sure the API server is running.
          </div>
        )}

        {!isLoading && !error && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Globe className="h-16 w-16 text-slate-700 mb-5" />
            <h2 className="text-xl font-semibold text-slate-300 mb-2">No published maps yet</h2>
            <p className="text-slate-500 max-w-sm mb-6">
              Generate a demo session, then publish it to make it appear here on the public feed.
            </p>
            <div className="flex gap-3 flex-wrap justify-center">
              <button
                onClick={() => importMock()}
                disabled={importing}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {importing ? "Generating…" : "Generate demo session"}
              </button>
              <Link
                href="/sessions"
                className="px-5 py-2 rounded-lg border border-slate-600 text-slate-300 hover:border-blue-500 hover:text-white transition-colors"
              >
                Manage Sessions
              </Link>
            </div>
          </div>
        )}

        {!isLoading && sessions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sessions.map((session) => (
              <FeedCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
