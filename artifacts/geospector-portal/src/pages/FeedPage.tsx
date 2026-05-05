import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useGetPortalFeed,
  useImportMockPortalSession,
  getGetPortalFeedQueryKey,
} from "@workspace/api-client-react";
import { MapPin, Route, Clock, Plus, Globe, ArrowRight, Layers, Search, Map, AlertCircle, Smartphone } from "lucide-react";
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
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-sm transition-all group overflow-hidden flex flex-col">
      <div className="relative overflow-hidden bg-gray-100 dark:bg-slate-700" style={{ height: 148 }}>
        {session.thumbnailUrl ? (
          <img
            src={session.thumbnailUrl}
            alt={session.title ?? "Session"}
            className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-90"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <Map className="h-9 w-9 text-gray-300 dark:text-slate-500" />
            <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">No preview</span>
          </div>
        )}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <span className="flex items-center gap-1 bg-green-600/90 text-white text-xs px-1.5 py-0.5 rounded font-medium backdrop-blur shadow-sm">
            <Globe className="h-3 w-3" />
            Public
          </span>
          {session.sourceType === "atlas" && (
            <span className="flex items-center gap-1 bg-violet-700/90 text-white text-xs px-1.5 py-0.5 rounded font-medium backdrop-blur shadow-sm">
              <Smartphone className="h-3 w-3" />
              Atlas
            </span>
          )}
        </div>
      </div>

      <div className="p-3.5 flex flex-col flex-1 gap-2.5">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors line-clamp-2 leading-snug text-sm">
            {session.title ?? session.sessionId}
          </h3>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{formatDate(session.createdAt)}</p>
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-slate-400">
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

        <div className="mt-auto pt-0.5">
          <Link
            href={`/sessions/${session.id}`}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-colors text-xs font-medium border border-gray-200 dark:border-slate-600 hover:border-blue-600"
          >
            View Session
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

type SourceFilter = "all" | "atlas" | "import" | "supabase";
const KNOWN_SOURCE_TYPES: SourceFilter[] = ["atlas", "import", "supabase"];
function toSourceFilter(raw: string): SourceFilter {
  return (KNOWN_SOURCE_TYPES as string[]).includes(raw) ? (raw as SourceFilter) : "import";
}

export default function FeedPage() {
  const { data, isLoading, error } = useGetPortalFeed();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

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

  const filtered = sessions.filter((s) => {
    const matchesSearch = search.trim()
      ? (s.title ?? s.sessionId).toLowerCase().includes(search.trim().toLowerCase())
      : true;
    const matchesSource = sourceFilter === "all" ? true : s.sourceType === sourceFilter;
    return matchesSearch && matchesSource;
  });

  const sourceTypes = Array.from(new Set(sessions.map((s) => toSourceFilter(s.sourceType))));
  const showSourceFilter = sourceTypes.length > 1 || sourceFilter !== "all";

  return (
    <Layout showDemoButton={false}>
      <section className="bg-slate-900 dark:bg-slate-950 border-b border-slate-700/70 px-4 py-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
              Geospector · Atlas
            </p>
            <h1 className="text-2xl font-bold text-white leading-tight">
              GPS Survey Sessions
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-lg">
              Geotagged field sessions captured with the Geospector app — browse routes and inspect frame-level data.
            </p>
          </div>
          <button
            onClick={() => importMock()}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white disabled:opacity-60 transition-colors text-sm font-medium border border-slate-600 flex-none self-start sm:self-auto"
          >
            <Plus className="h-3.5 w-3.5" />
            {importing ? "Generating…" : "Demo Session"}
          </button>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-6 w-full flex-1">
        {!isLoading && !error && sessions.length > 0 && (
          <div className="flex items-center gap-6 mb-6 pb-4 border-b border-gray-100 dark:border-slate-700/60 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-gray-400 dark:text-slate-500 text-xs">Sessions:</span>
              <span className="font-semibold text-gray-800 dark:text-slate-200">{totalPublic}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Route className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-gray-400 dark:text-slate-500 text-xs">Total distance:</span>
              <span className="font-semibold text-gray-800 dark:text-slate-200">{totalMiles.toFixed(1)} mi</span>
            </div>
          </div>
        )}

        {!isLoading && !error && sessions.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
              <input
                type="search"
                placeholder="Search by project name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            {showSourceFilter && (
              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-1 flex-none">
                {(["all", ...sourceTypes] as SourceFilter[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSourceFilter(type)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors capitalize ${
                      sourceFilter === type
                        ? type === "atlas"
                          ? "bg-violet-600 text-white"
                          : "bg-slate-800 dark:bg-slate-600 text-white"
                        : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-24 text-gray-400 dark:text-slate-500">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-7 w-7 border-2 border-blue-500 border-t-transparent" />
              <span className="text-sm">Loading sessions…</span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-4 flex items-start gap-3 text-red-600 dark:text-red-300">
            <AlertCircle className="h-4 w-4 flex-none mt-0.5" />
            <div>
              <p className="font-medium text-sm">Failed to load sessions</p>
              <p className="text-xs mt-1 text-red-500 dark:text-red-400">Make sure the API server is running.</p>
            </div>
          </div>
        )}

        {!isLoading && !error && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="bg-gray-100 dark:bg-slate-800 rounded-full p-5 mb-5">
              <MapPin className="h-10 w-10 text-gray-300 dark:text-slate-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-2">No sessions published yet</h2>
            <p className="text-gray-400 dark:text-slate-500 max-w-sm text-sm mb-7">
              Generate a demo session to see how the portal looks with real GPS survey data.
            </p>
            <button
              onClick={() => importMock()}
              disabled={importing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors font-medium text-sm"
            >
              <Plus className="h-4 w-4" />
              {importing ? "Generating…" : "Generate demo session"}
            </button>
          </div>
        )}

        {!isLoading && !error && sessions.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-9 w-9 text-gray-300 dark:text-slate-600 mb-3" />
            <p className="text-gray-500 dark:text-slate-400 text-sm">
              No sessions match
              {search.trim() ? ` "${search}"` : ""}
              {sourceFilter !== "all" ? ` in "${sourceFilter}"` : ""}
            </p>
            <button
              onClick={() => { setSearch(""); setSourceFilter("all"); }}
              className="mt-3 text-blue-500 text-sm hover:underline"
            >
              Reset filters
            </button>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((session) => (
              <FeedCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
