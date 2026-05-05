import { Link, useLocation } from "wouter";
import { useListPortalSessions, useGetPortalStats, useImportMockPortalSession, getListPortalSessionsQueryKey } from "@workspace/api-client-react";
import { MapPin, Clock, Gauge, Upload, Plus, BarChart2, Route, Globe, Smartphone, AlertCircle } from "lucide-react";
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

function SessionCard({ session }: { session: PortalSession }) {
  return (
    <Link
      href={`/sessions/${session.id}`}
      className="block bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-all group cursor-pointer"
    >
      <div className="flex gap-3 p-3">
        <div
          className="flex-none rounded overflow-hidden bg-gray-100 dark:bg-slate-700 flex items-center justify-center"
          style={{ width: 88, height: 66 }}
        >
          {session.thumbnailUrl ? (
            <img src={session.thumbnailUrl} alt="thumbnail" className="w-full h-full object-cover" />
          ) : (
            <MapPin className="h-5 w-5 text-gray-300 dark:text-slate-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors truncate text-sm">
                {session.title ?? session.sessionId}
              </h3>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{formatDate(session.createdAt)}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-none flex-wrap justify-end">
              {session.sourceType === "atlas" && (
                <span className="flex items-center gap-1 bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 text-xs px-1.5 py-0.5 rounded font-medium">
                  <Smartphone className="h-3 w-3" />
                  Atlas
                </span>
              )}
              {session.isPublic && (
                <span className="flex items-center gap-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs px-1.5 py-0.5 rounded font-medium">
                  <Globe className="h-3 w-3" />
                  Public
                </span>
              )}
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                session.status === "active"
                  ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
                  : "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
              }`}>
                {session.status}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-gray-400 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <BarChart2 className="h-3 w-3" />
              {session.totalFrames} frames
            </span>
            <span className="flex items-center gap-1">
              <Upload className="h-3 w-3" />
              {session.uploadedFrames} uploaded
            </span>
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
            {session.averageSpeedMph != null && (
              <span className="flex items-center gap-1">
                <Gauge className="h-3 w-3" />
                {session.averageSpeedMph.toFixed(1)} mph avg
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function SessionList() {
  const { data: sessions, isLoading, error } = useListPortalSessions();
  const { data: stats } = useGetPortalStats();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const { mutate: importMock, isPending: importing } = useImportMockPortalSession({
    mutation: {
      onSuccess(data) {
        qc.invalidateQueries({ queryKey: getListPortalSessionsQueryKey() });
        navigate(`/sessions/${data.id}`);
      },
    },
  });

  return (
    <Layout showDemoButton>
      <div className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">
              My Sessions
            </p>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Session Library</h1>
          </div>
          <div className="flex gap-2">
            <Link
              href="/import"
              className="text-sm px-3 py-1.5 rounded border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-slate-400 transition-colors"
            >
              Import
            </Link>
            <button
              onClick={() => importMock()}
              disabled={importing}
              className="text-sm px-3 py-1.5 rounded border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-slate-400 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              {importing ? "Generating…" : "Demo Session"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5 w-full">
        {stats && (
          <div className="flex items-center gap-6 mb-5 pb-4 border-b border-gray-100 dark:border-slate-700/60 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <BarChart2 className="h-3.5 w-3.5 text-gray-400 dark:text-slate-500" />
              <span className="text-gray-400 dark:text-slate-500 text-xs">Sessions:</span>
              <span className="font-semibold text-gray-800 dark:text-slate-200">{stats.totalSessions}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Upload className="h-3.5 w-3.5 text-gray-400 dark:text-slate-500" />
              <span className="text-gray-400 dark:text-slate-500 text-xs">Total frames:</span>
              <span className="font-semibold text-gray-800 dark:text-slate-200">{stats.totalFrames}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Route className="h-3.5 w-3.5 text-gray-400 dark:text-slate-500" />
              <span className="text-gray-400 dark:text-slate-500 text-xs">Total distance:</span>
              <span className="font-semibold text-gray-800 dark:text-slate-200">{stats.totalDistanceMiles.toFixed(1)} mi</span>
            </div>
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
            <p className="text-sm">Failed to load sessions. Make sure the API server is running.</p>
          </div>
        )}

        {!isLoading && !error && sessions?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="bg-gray-100 dark:bg-slate-800 rounded-full p-5 mb-4">
              <MapPin className="h-10 w-10 text-gray-300 dark:text-slate-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-slate-300 mb-2">No sessions yet</h2>
            <p className="text-gray-400 dark:text-slate-500 text-sm mt-1 mb-6 max-w-sm">
              Import a GPS session from the Geospector app, or generate a demo session to explore the portal.
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

        {!isLoading && sessions && sessions.length > 0 && (
          <div className="flex flex-col gap-2">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
