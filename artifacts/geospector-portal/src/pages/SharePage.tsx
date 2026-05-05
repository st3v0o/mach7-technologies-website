import { useState } from "react";
import { useParams } from "wouter";
import { useGetPortalShareSession, useGetPortalSessionFrames, useGetPortalSessionRoute } from "@workspace/api-client-react";
import type { PortalFrame } from "@workspace/api-client-react";
import MetricsBar from "@/components/MetricsBar";
import SessionMap from "@/components/SessionMap";
import FrameFilmstrip from "@/components/FrameFilmstrip";
import Layout from "@/components/Layout";
import { MapPin, AlertCircle, Layers, Map as MapIcon, Smartphone, ChevronDown, ChevronRight, Trash2, X } from "lucide-react";

export default function SharePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [selectedFrame, setSelectedFrame] = useState<PortalFrame | null>(null);
  const [showRoute, setShowRoute] = useState(true);
  const [tileLayer, setTileLayer] = useState<"osm" | "satellite">("osm");
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

  async function handleAtlasDelete() {
    const code = deleteCode.trim();
    if (!code) {
      setDeleteError("Please enter your delete code.");
      return;
    }
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

  if (isLoading) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
            <span className="text-sm">Loading shared session…</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !session) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="bg-gray-100 dark:bg-slate-800 rounded-full p-5">
            <MapPin className="h-10 w-10 text-gray-300 dark:text-slate-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-700 dark:text-slate-300">Session not found</h1>
          <p className="text-gray-400 dark:text-slate-500 text-sm max-w-xs">
            This shared link may have expired or is invalid.
          </p>
          <div className="mt-2 flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-4 py-2 text-amber-700 dark:text-amber-400 text-xs">
            <AlertCircle className="h-4 w-4 flex-none" />
            The session may not be published publicly.
          </div>
        </div>
      </Layout>
    );
  }

  if (deleteSuccess) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-5">
            <Trash2 className="h-10 w-10 text-green-500 dark:text-green-400" />
          </div>
          <h1 className="text-xl font-semibold text-gray-700 dark:text-slate-300">Session removed</h1>
          <p className="text-gray-400 dark:text-slate-500 text-sm max-w-xs">
            This session has been deleted from the Atlas.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-5 w-full flex-1 flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              {session.title ?? session.sessionId}
            </h1>
            {session.sourceType === "atlas" && (
              <span className="flex-none flex items-center gap-1 bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 text-xs px-2 py-0.5 rounded-full font-medium border border-violet-200 dark:border-violet-700/50">
                <Smartphone className="h-3 w-3" />
                Atlas
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 uppercase tracking-wide font-medium">GPS session · Geospector</p>
        </div>

        <MetricsBar metrics={session} />

        <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 shadow-sm relative" style={{ height: "48vh", minHeight: 320 }}>
          <SessionMap
            routeGeojson={routeGeojson}
            frames={frames}
            selectedFrameId={selectedFrame?.id}
            onMarkerClick={setSelectedFrame}
            showRoute={showRoute}
            tileLayer={tileLayer}
            fitBoundsTrigger={fitTrigger}
          />

          <div className="absolute top-3 right-3 flex flex-col gap-2 z-[1000]">
            <button
              onClick={() => setFitTrigger((t) => t + 1)}
              title="Fit to route"
              className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg p-2 shadow-md hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-gray-700 dark:text-slate-300"
            >
              <MapIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setTileLayer((l) => l === "osm" ? "satellite" : "osm")}
              title="Toggle satellite/street"
              className={`bg-white dark:bg-slate-800 border rounded-lg p-2 shadow-md transition-colors ${
                tileLayer === "satellite"
                  ? "border-blue-400 text-blue-600 dark:border-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40"
                  : "border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              }`}
            >
              <Layers className="h-4 w-4" />
            </button>
          </div>
        </div>

        {frames.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-2">
              Frames
            </h2>
            <FrameFilmstrip
              frames={frames}
              selectedFrameId={selectedFrame?.id}
              onSelectFrame={setSelectedFrame}
            />
          </div>
        )}

        {session.sourceType === "atlas" && (
          <div className="pb-4">
            <button
              onClick={() => { setShowRemovePanel((v) => !v); setDeleteError(null); }}
              className="flex items-center gap-2 text-sm text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              {showRemovePanel
                ? <ChevronDown className="h-4 w-4" />
                : <ChevronRight className="h-4 w-4" />}
              <Trash2 className="h-3.5 w-3.5" />
              Remove this session from Atlas
            </button>

            {showRemovePanel && (
              <div className="mt-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  Enter the delete code you received when you submitted this session from the app. You can find it by tapping the <span className="font-medium text-violet-600 dark:text-violet-400">Atlas</span> badge in your Frame Log and choosing "Copy delete code".
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
                    <Trash2 className="h-3.5 w-3.5" />
                    {deleteLoading ? "Removing…" : "Remove session"}
                  </button>
                </div>
                {deleteError && (
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <X className="h-3.5 w-3.5 flex-none" />
                    {deleteError}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
