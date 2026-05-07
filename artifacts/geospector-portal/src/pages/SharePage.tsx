import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useGetPortalShareSession, useGetPortalSessionFrames, useGetPortalSessionRoute } from "@workspace/api-client-react";
import type { PortalFrame } from "@workspace/api-client-react";
import MetricsBar from "@/components/MetricsBar";
import SessionMap from "@/components/SessionMap";
import FrameFilmstrip from "@/components/FrameFilmstrip";
import { MapPin, AlertCircle, Map as MapIcon, Smartphone, Trash2, X, CheckCircle } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@clerk/react";

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
  const [, navigate] = useLocation();
  const { isSignedIn, getToken } = useAuth();

  const [selectedFrame, setSelectedFrame] = useState<PortalFrame | null>(null);
  const [showRoute, setShowRoute] = useState(true);
  const [fitTrigger, setFitTrigger] = useState(0);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteDone, setDeleteDone] = useState(false);

  const { data: session, isLoading, error } = useGetPortalShareSession(token);

  const sessionId = session?.id ?? 0;
  const { data: framesData } = useGetPortalSessionFrames(sessionId, { limit: 500 });
  const { data: routeData } = useGetPortalSessionRoute(sessionId);

  const frames = session ? (framesData?.frames ?? []) : [];
  const routeGeojson = routeData?.geojson ?? session?.routeGeojson;

  async function handleAuthDelete() {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const authToken = await getToken();
      const res = await fetch(`/api/portal/my-sessions/${sessionId}`, {
        method: "DELETE",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      if (res.status === 401 || res.status === 403) {
        setDeleteError("Not authorized to delete this session.");
        return;
      }
      if (res.status === 404) {
        setDeleteError("Session not found or you don't own it.");
        return;
      }
      if (!res.ok) {
        setDeleteError(`Unexpected error (${res.status}). Please try again.`);
        return;
      }
      setDeleteDone(true);
      setTimeout(() => navigate("/"), 2000);
    } catch {
      setDeleteError("Network error. Please check your connection and try again.");
    } finally {
      setDeleteLoading(false);
    }
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

  const sessionDate = formatDate(session.startedAt ?? session.createdAt);
  const canDelete = isSignedIn && session.sourceType === "atlas";

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
            {canDelete && (
              <button
                onClick={() => { setShowDeleteConfirm((v) => !v); setDeleteError(null); }}
                title="Delete this session"
                className={`p-2 rounded-lg transition-colors ${
                  showDeleteConfirm
                    ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
                    : "text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                }`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Delete confirmation panel */}
        {canDelete && showDeleteConfirm && (
          <div className="border-t border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/10 px-4 py-3">
            <div className="max-w-5xl mx-auto flex flex-col gap-2">
              {deleteDone ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                  <CheckCircle className="h-4 w-4 flex-none" />
                  <span>Session deleted. Redirecting…</span>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-700 dark:text-slate-200 font-medium flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-red-500 flex-none" />
                    Delete this session permanently?
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    This will remove the session and all frame data from the Atlas. This cannot be undone.
                  </p>
                  <div className="flex gap-2 items-center flex-wrap">
                    <button
                      onClick={handleAuthDelete}
                      disabled={deleteLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {deleteLoading ? "Deleting…" : "Delete permanently"}
                    </button>
                    <button
                      onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
                      disabled={deleteLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 text-sm hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  </div>
                  {deleteError && (
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
                      <X className="h-3.5 w-3.5 flex-none" />
                      {deleteError}
                    </p>
                  )}
                </>
              )}
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
