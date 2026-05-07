import { useState } from "react";
import { useParams, useSearch } from "wouter";
import { useGetPortalShareSession, useGetPortalSessionFrames, useGetPortalSessionRoute } from "@workspace/api-client-react";
import type { PortalFrame } from "@workspace/api-client-react";
import MetricsBar from "@/components/MetricsBar";
import SessionMap from "@/components/SessionMap";
import FrameFilmstrip from "@/components/FrameFilmstrip";
import { MapPin, AlertCircle, Map as MapIcon, Smartphone, Trash2, X, ChevronDown } from "lucide-react";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function SharePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const search = useSearch();
  const urlClaimToken = new URLSearchParams(search).get("claimToken");

  const [selectedFrame, setSelectedFrame] = useState<PortalFrame | null>(null);
  const [showRoute, setShowRoute] = useState(true);
  const [fitTrigger, setFitTrigger] = useState(0);

  const [showRemovePanel, setShowRemovePanel] = useState(false);
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const { data: session, isLoading, error } = useGetPortalShareSession(token);

  const sessionId = session?.id ?? 0;
  const { data: framesData } = useGetPortalSessionFrames(sessionId, { limit: 500 });
  const { data: routeData } = useGetPortalSessionRoute(sessionId);

  const frames = session ? (framesData?.frames ?? []) : [];
  const routeGeojson = routeData?.geojson ?? session?.routeGeojson;

  async function performDelete(code: string) {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch(
        `/api/portal/sessions/${sessionId}?token=${encodeURIComponent(code)}`,
        { method: "DELETE" }
      );
      if (res.status === 401) {
        setDeleteError("Invalid delete code.");
        return;
      }
      if (res.status === 404) {
        setDeleteError("Session not found.");
        return;
      }
      if (!res.ok) {
        setDeleteError(`Unexpected error (${res.status}). Please try again.`);
        return;
      }
      setDeleteSuccess(true);
    } catch {
      setDeleteError("Network error. Please check your connection and try again.");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleAtlasDelete() {
    // When claim token comes from URL (owner link), use it directly
    const code = urlClaimToken ?? deleteCode.trim();
    if (!code) {
      setDeleteError("Please enter your delete code.");
      return;
    }
    await performDelete(code);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-slate-500">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          <span className="text-sm">Loading map…</span>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center gap-4 py-24 text-center px-4">
        <div className="bg-gray-100 dark:bg-slate-800 rounded-full p-5">
          <MapPin className="h-10 w-10 text-gray-300 dark:text-slate-600" />
        </div>
        <h1 className="text-xl font-semibold text-gray-700 dark:text-slate-300">Map not found</h1>
        <p className="text-gray-400 dark:text-slate-500 text-sm max-w-xs">
          This shared link may have expired or been removed.
        </p>
        <div className="mt-2 flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-4 py-2 text-amber-700 dark:text-amber-400 text-xs">
          <AlertCircle className="h-4 w-4 flex-none" />
          The session may not be publicly shared.
        </div>
      </div>
    );
  }

  if (deleteSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center gap-4 py-24 text-center px-4">
        <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-5">
          <Trash2 className="h-10 w-10 text-green-500 dark:text-green-400" />
        </div>
        <h1 className="text-xl font-semibold text-gray-700 dark:text-slate-300">Map removed</h1>
        <p className="text-gray-400 dark:text-slate-500 text-sm max-w-xs">
          This session has been deleted from Atlas.
        </p>
      </div>
    );
  }

  const sessionDate = formatDate(session.startedAt ?? session.createdAt);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white flex flex-col">
      {/* Slim top bar */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight">
                {session.title ?? session.sessionId}
              </h1>
              {session.sourceType === "atlas" && (
                <span className="flex-none flex items-center gap-1 bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 text-xs px-1.5 py-0.5 rounded-full font-medium border border-violet-200 dark:border-violet-700/50">
                  <Smartphone className="h-3 w-3" />
                  Atlas
                </span>
              )}
            </div>
            {sessionDate && (
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{sessionDate}</p>
            )}
          </div>

          <div className="flex items-center gap-1 flex-none">
            <button
              onClick={() => setFitTrigger((t) => t + 1)}
              title="Fit to route"
              className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <MapIcon className="h-4 w-4" />
            </button>
            {session.sourceType === "atlas" && (
              <button
                onClick={() => { setShowRemovePanel((v) => !v); setDeleteError(null); }}
                title="Remove this map"
                className={`p-2 rounded-lg transition-colors ${
                  showRemovePanel
                    ? "text-red-500 bg-red-50 dark:bg-red-900/20"
                    : "text-gray-400 dark:text-slate-500 hover:text-red-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                }`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Delete panel — slides in below top bar */}
        {showRemovePanel && (
          <div className="border-t border-gray-100 dark:border-slate-700/60">
            <div className="max-w-5xl mx-auto px-4 py-3">
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-1.5">
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove this map from Atlas
                  </p>
                  <button
                    onClick={() => { setShowRemovePanel(false); setDeleteError(null); setDeleteCode(""); }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {urlClaimToken ? (
                  // Owner mode — claimToken is in the URL, no manual entry needed
                  <>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      You are viewing this as the map owner. Clicking Remove will permanently delete this map.
                    </p>
                    <button
                      onClick={handleAtlasDelete}
                      disabled={deleteLoading}
                      className="self-start flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {deleteLoading ? "Removing…" : "Remove permanently"}
                    </button>
                  </>
                ) : (
                  // Visitor mode — must provide claimToken manually
                  <>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Enter the delete code you received when you submitted this session from the app. It is stored in the Geospector app under your Atlas submissions.
                    </p>
                    <div className="flex gap-2 items-center flex-wrap">
                      <input
                        type="text"
                        value={deleteCode}
                        onChange={(e) => { setDeleteCode(e.target.value); setDeleteError(null); }}
                        placeholder="Paste your delete code here"
                        className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-400 dark:focus:ring-red-600 placeholder-gray-400 dark:placeholder-slate-500"
                        disabled={deleteLoading}
                        onKeyDown={(e) => { if (e.key === "Enter") handleAtlasDelete(); }}
                      />
                      <button
                        onClick={handleAtlasDelete}
                        disabled={deleteLoading || !deleteCode.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {deleteLoading ? "Removing…" : "Remove"}
                      </button>
                    </div>
                  </>
                )}

                {deleteError && (
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <X className="h-3.5 w-3.5 flex-none" />
                    {deleteError}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map — fills viewport */}
      <div className="flex-1 relative" style={{ minHeight: "55vh" }}>
        <SessionMap
          routeGeojson={routeGeojson}
          frames={frames}
          selectedFrameId={selectedFrame?.id}
          onMarkerClick={setSelectedFrame}
          showRoute={showRoute}
          fitBoundsTrigger={fitTrigger}
        />
        <button
          onClick={() => setShowRoute((v) => !v)}
          title="Toggle route"
          className={`absolute bottom-4 left-4 z-[1000] flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border shadow-md transition-colors font-medium ${
            showRoute
              ? "bg-blue-600 border-blue-500 text-white"
              : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
          }`}
        >
          <ChevronDown className="h-3.5 w-3.5" />
          Route
        </button>
      </div>

      {/* Metadata */}
      <div className="max-w-5xl mx-auto px-4 py-4 w-full flex flex-col gap-4">
        <MetricsBar metrics={session} />

        {frames.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Frames · {frames.length}
            </h2>
            <FrameFilmstrip
              frames={frames}
              selectedFrameId={selectedFrame?.id}
              onSelectFrame={setSelectedFrame}
            />
          </div>
        )}
      </div>

      {/* Footer badge */}
      <footer className="border-t border-gray-200 dark:border-slate-700/60 py-3 text-center">
        <span className="text-xs text-gray-400 dark:text-slate-500">
          Powered by{" "}
          <span className="text-gray-600 dark:text-slate-300 font-semibold">Geospector</span>
        </span>
      </footer>
    </div>
  );
}
