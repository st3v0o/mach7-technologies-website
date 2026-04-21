import { Link, useLocation } from "wouter";
import { useListPortalSessions, useGetPortalStats, useImportMockPortalSession, getListPortalSessionsQueryKey } from "@workspace/api-client-react";
import { MapPin, Clock, Gauge, Upload, Plus, BarChart2, Route } from "lucide-react";
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

function SessionCard({ session }: { session: PortalSession }) {
  return (
    <Link
      href={`/sessions/${session.id}`}
      className="block bg-slate-800 rounded-xl border border-slate-700 hover:border-blue-500/50 hover:bg-slate-750 transition-all group cursor-pointer"
    >
      <div className="flex gap-4 p-4">
        <div className="flex-none rounded-lg overflow-hidden bg-slate-700 flex items-center justify-center"
          style={{ width: 96, height: 72 }}>
          {session.thumbnailUrl ? (
            <img src={session.thumbnailUrl} alt="thumbnail" className="w-full h-full object-cover" />
          ) : (
            <MapPin className="h-6 w-6 text-slate-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors truncate">
                {session.title ?? session.sessionId}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{formatDate(session.createdAt)}</p>
            </div>
            <span className={`
              flex-none text-xs px-2 py-0.5 rounded-full font-medium
              ${session.status === "active" ? "bg-green-900/60 text-green-300" : "bg-slate-700 text-slate-400"}
            `}>
              {session.status}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
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
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-slate-700 bg-slate-800/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-400" />
            <span className="font-bold text-lg tracking-tight">Geospector Portal</span>
          </div>
          <div className="flex gap-2">
            <Link
              href="/import"
              className="text-sm px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:border-blue-500 hover:text-white transition-colors"
            >
              Import
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

      <main className="max-w-5xl mx-auto px-4 py-6">
        {stats && (
          <div className="flex gap-4 mb-6 flex-wrap">
            <div className="bg-slate-800 rounded-lg px-4 py-3 flex flex-col">
              <span className="text-xs text-slate-400 uppercase tracking-wide">Sessions</span>
              <span className="text-2xl font-bold">{stats.totalSessions}</span>
            </div>
            <div className="bg-slate-800 rounded-lg px-4 py-3 flex flex-col">
              <span className="text-xs text-slate-400 uppercase tracking-wide">Total Frames</span>
              <span className="text-2xl font-bold">{stats.totalFrames}</span>
            </div>
            <div className="bg-slate-800 rounded-lg px-4 py-3 flex flex-col">
              <span className="text-xs text-slate-400 uppercase tracking-wide">Total Distance</span>
              <span className="text-2xl font-bold">{stats.totalDistanceMiles.toFixed(1)} mi</span>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-24 text-slate-400">
            Loading sessions…
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-900/30 border border-red-700 p-4 text-red-300 text-sm">
            Failed to load sessions. Make sure the API server is running.
          </div>
        )}

        {!isLoading && !error && sessions?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <MapPin className="h-12 w-12 text-slate-600 mb-4" />
            <h2 className="text-xl font-semibold text-slate-300">No sessions yet</h2>
            <p className="text-slate-500 mt-2 mb-6 max-w-sm">
              Import a GPS session from the Geospector app, or generate a demo session to explore the portal.
            </p>
            <button
              onClick={() => importMock()}
              disabled={importing}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {importing ? "Generating…" : "Generate demo session"}
            </button>
          </div>
        )}

        {!isLoading && sessions && sessions.length > 0 && (
          <div className="flex flex-col gap-3">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
