import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useGetPortalFeed,
  useImportMockPortalSession,
  getGetPortalFeedQueryKey,
} from "@workspace/api-client-react";
import { MapPin, Route, Clock, Plus, Globe, ArrowRight, Layers, Search, Map, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { PortalSession } from "@workspace/api-client-react";
import Layout from "@/components/Layout";

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
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500/50 hover:shadow-md transition-all group overflow-hidden flex flex-col">
      <div className="relative overflow-hidden bg-gray-100 dark:bg-slate-700" style={{ height: 160 }}>
        {session.thumbnailUrl ? (
          <img
            src={session.thumbnailUrl}
            alt={session.title ?? "Session"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <Map className="h-10 w-10 text-gray-300 dark:text-slate-500" />
            <span className="text-xs text-gray-400 dark:text-slate-500">No preview</span>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className="flex items-center gap-1 bg-green-500/90 text-white text-xs px-2 py-0.5 rounded-full font-medium backdrop-blur shadow-sm">
            <Globe className="h-3 w-3" />
            Public
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1 gap-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors line-clamp-2 leading-snug">
            {session.title ?? session.sessionId}
          </h3>
          <p className="text-xs text-gray-400 dark:text-slate-400 mt-1">{formatDate(session.createdAt)}</p>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-slate-400">
          {session.totalDistanceMiles != null && (
            <span className="flex items-center gap-1">
              <Route className="h-3 w-3 text-blue-500" />
              {session.totalDistanceMiles.toFixed(2)} mi
            </span>
          )}
          {session.durationSeconds != null && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-blue-500" />
              {formatDuration(session.durationSeconds)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Layers className="h-3 w-3 text-blue-500" />
            {session.totalFrames} frames
          </span>
        </div>

        <div className="mt-auto pt-1">
          <Link
            href={`/sessions/${session.id}`}
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-300 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600/40 dark:hover:text-white transition-colors text-sm font-medium border border-blue-100 dark:border-blue-700/30"
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
  const [search, setSearch] = useState("");

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

  const filtered = search.trim()
    ? sessions.filter((s) =>
        (s.title ?? s.sessionId).toLowerCase().includes(search.trim().toLowerCase())
      )
    : sessions;

  return (
    <Layout showDemoButton={false}>
      <section className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-700 dark:to-slate-900 text-white py-14 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-white/20 rounded-lg p-1.5">
              <MapPin className="h-5 w-5" />
            </div>
            <span className="text-blue-100 text-sm font-medium uppercase tracking-widest">Geospector Portal</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4">
            Explore the World,<br />
            <span className="text-blue-200">One Frame at a Time</span>
          </h1>
          <p className="text-blue-100 text-lg max-w-xl mb-8">
            GPS survey sessions captured with the Geospector app — browse real-world routes, frame-by-frame.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => importMock()}
              disabled={importing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-blue-600 hover:bg-blue-50 disabled:opacity-60 transition-colors font-semibold shadow-md"
            >
              <Plus className="h-4 w-4" />
              {importing ? "Generating…" : "Generate Demo Session"}
            </button>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-8 w-full flex-1">
        {!isLoading && !error && (sessions.length > 0) && (
          <div className="flex gap-4 mb-8 flex-wrap">
            <div className="bg-white dark:bg-slate-800 rounded-xl px-5 py-3 flex items-center gap-3 border border-gray-200 dark:border-slate-700 shadow-sm">
              <Globe className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-xs text-gray-400 dark:text-slate-400 uppercase tracking-wide font-medium">Maps Shared</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalPublic}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl px-5 py-3 flex items-center gap-3 border border-gray-200 dark:border-slate-700 shadow-sm">
              <Route className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-gray-400 dark:text-slate-400 uppercase tracking-wide font-medium">Total Distance</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalMiles.toFixed(1)} mi</p>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && sessions.length > 0 && (
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
            <input
              type="search"
              placeholder="Search by project name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-sm"
            />
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-24 text-gray-400 dark:text-slate-500">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
              <span className="text-sm">Loading sessions…</span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 p-5 flex items-start gap-3 text-red-600 dark:text-red-300">
            <AlertCircle className="h-5 w-5 flex-none mt-0.5" />
            <div>
              <p className="font-medium text-sm">Failed to load sessions</p>
              <p className="text-xs mt-1 text-red-500 dark:text-red-400">Make sure the API server is running.</p>
            </div>
          </div>
        )}

        {!isLoading && !error && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-full p-6 mb-5">
              <Map className="h-12 w-12 text-blue-300 dark:text-blue-500" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-700 dark:text-slate-300 mb-2">No maps published yet</h2>
            <p className="text-gray-500 dark:text-slate-500 max-w-sm mb-8">
              Generate a demo session to see how the portal looks with real GPS data.
            </p>
            <button
              onClick={() => importMock()}
              disabled={importing}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors font-semibold shadow-md"
            >
              <Plus className="h-4 w-4" />
              {importing ? "Generating…" : "Generate demo session"}
            </button>
          </div>
        )}

        {!isLoading && !error && sessions.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-10 w-10 text-gray-300 dark:text-slate-600 mb-3" />
            <p className="text-gray-500 dark:text-slate-400">No sessions match "{search}"</p>
            <button onClick={() => setSearch("")} className="mt-3 text-blue-500 text-sm hover:underline">
              Clear search
            </button>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((session) => (
              <FeedCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
