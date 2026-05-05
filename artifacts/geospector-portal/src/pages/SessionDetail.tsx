import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetPortalSession,
  useGetPortalSessionFrames,
  useGetPortalSessionRoute,
  usePublishPortalSession,
  getGetPortalSessionQueryKey,
  getListPortalSessionsQueryKey,
  getGetPortalFeedQueryKey,
} from "@workspace/api-client-react";
import type { PortalFrame } from "@workspace/api-client-react";
import MetricsBar from "@/components/MetricsBar";
import SessionMap from "@/components/SessionMap";
import FrameFilmstrip from "@/components/FrameFilmstrip";
import Layout from "@/components/Layout";
import {
  ArrowLeft, Share2, MapPin, Globe, EyeOff, Map as MapIcon,
  Layers, Route, SlidersHorizontal, X, CheckCircle, Smartphone,
  ChevronDown, ChevronRight, Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch {
    return ts;
  }
}

export default function SessionDetail() {
  const params = useParams<{ id: string }>();
  const sessionId = Number(params.id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedFrame, setSelectedFrame] = useState<PortalFrame | null>(null);

  const [showRoute, setShowRoute] = useState(true);
  const [tileLayer, setTileLayer] = useState<"osm" | "satellite">("osm");
  const [fitTrigger, setFitTrigger] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [minSpeed, setMinSpeed] = useState<string>("");
  const [maxSpeed, setMaxSpeed] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const [showRemovePanel, setShowRemovePanel] = useState(false);
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { data: session, isLoading: sessionLoading, error: sessionError } = useGetPortalSession(sessionId);
  const { data: framesData, isLoading: framesLoading } = useGetPortalSessionFrames(sessionId, { limit: 500 });
  const { data: routeData } = useGetPortalSessionRoute(sessionId);

  const { mutate: togglePublish, isPending: publishing } = usePublishPortalSession({
    mutation: {
      onSuccess(updated) {
        qc.setQueryData(getGetPortalSessionQueryKey(sessionId), updated);
        qc.invalidateQueries({ queryKey: getListPortalSessionsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetPortalFeedQueryKey() });
        toast({
          title: updated.isPublic ? "Session published!" : "Session made private",
          description: updated.isPublic
            ? "It now appears on the public feed."
            : "Removed from the public feed.",
        });
      },
      onError() {
        toast({ title: "Failed to update", description: "Please try again.", variant: "destructive" });
      },
    },
  });

  function handleTogglePublish() {
    if (!session) return;
    togglePublish({ id: sessionId, data: { isPublic: !session.isPublic } });
  }

  const allFrames = framesData?.frames ?? [];
  const routeGeojson = routeData?.geojson ?? session?.routeGeojson;

  const filteredFrames = allFrames.filter((f) => {
    const spd = f.speedMph ?? 0;
    const mn = minSpeed !== "" ? parseFloat(minSpeed) : null;
    const mx = maxSpeed !== "" ? parseFloat(maxSpeed) : null;
    if (mn !== null && spd < mn) return false;
    if (mx !== null && spd > mx) return false;
    if (dateFrom !== "") {
      const from = new Date(dateFrom).getTime();
      if (new Date(f.capturedAt).getTime() < from) return false;
    }
    if (dateTo !== "") {
      const to = new Date(dateTo).getTime();
      if (new Date(f.capturedAt).getTime() > to) return false;
    }
    return true;
  });

  const hasActiveFilter = minSpeed !== "" || maxSpeed !== "" || dateFrom !== "" || dateTo !== "";

  function clearFilters() {
    setMinSpeed("");
    setMaxSpeed("");
    setDateFrom("");
    setDateTo("");
  }

  useEffect(() => {
    if (selectedFrame && !filteredFrames.some((f) => f.id === selectedFrame.id)) {
      setSelectedFrame(filteredFrames[0] ?? null);
    }
  }, [filteredFrames, selectedFrame]);

  function handleShare() {
    if (!session?.publicShareToken) return;
    const base = window.location.origin + import.meta.env.BASE_URL;
    const url = `${base}share/${session.publicShareToken}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Link copied!", description: url });
    });
  }

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
      qc.invalidateQueries({ queryKey: getListPortalSessionsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetPortalFeedQueryKey() });
      toast({ title: "Session removed", description: "The session has been deleted from the Atlas." });
      navigate("/");
    } catch {
      setDeleteError("Network error. Please check your connection and try again.");
    } finally {
      setDeleteLoading(false);
    }
  }

  if (sessionLoading) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
            <span className="text-sm">Loading session…</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (sessionError || !session) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="bg-gray-100 dark:bg-slate-800 rounded-full p-5">
            <MapPin className="h-10 w-10 text-gray-300 dark:text-slate-600" />
          </div>
          <p className="text-gray-600 dark:text-slate-300 font-medium">Session not found or failed to load.</p>
          <button onClick={() => navigate("/")} className="text-blue-500 hover:underline text-sm">
            ← Back to home
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col flex-1">
        <div className="bg-white dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700 px-4 py-3">
          <div className="max-w-6xl mx-auto flex items-center gap-3 flex-wrap">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </button>
            <div className="h-4 w-px bg-gray-300 dark:bg-slate-600" />
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <MapPin className="h-4 w-4 text-blue-500 flex-none" />
              <h1 className="font-semibold text-gray-900 dark:text-white truncate">
                {session.title ?? session.sessionId}
              </h1>
              {session.startedAt && (
                <span className="hidden sm:inline text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap">
                  {new Date(session.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              )}
              {session.sourceType === "atlas" && (
                <span className="flex-none flex items-center gap-1 bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 text-xs px-2 py-0.5 rounded-full font-medium border border-violet-200 dark:border-violet-700/50">
                  <Smartphone className="h-3 w-3" />
                  Atlas
                </span>
              )}
              {session.isPublic && (
                <span className="flex-none flex items-center gap-1 bg-green-100 dark:bg-green-700/40 text-green-700 dark:text-green-300 text-xs px-2 py-0.5 rounded-full font-medium border border-green-200 dark:border-green-700/50">
                  <Globe className="h-3 w-3" />
                  Public
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleTogglePublish}
                disabled={publishing}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                  session.isPublic
                    ? "border-green-300 dark:border-green-600 text-green-700 dark:text-green-300 hover:border-red-300 dark:hover:border-red-500 hover:text-red-600 dark:hover:text-red-300 bg-green-50 dark:bg-green-900/20"
                    : "border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:border-green-400 dark:hover:border-green-500 hover:text-green-700 dark:hover:text-green-300 bg-white dark:bg-transparent"
                }`}
              >
                {session.isPublic ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    {publishing ? "Updating…" : "Make Private"}
                  </>
                ) : (
                  <>
                    <Globe className="h-3.5 w-3.5" />
                    {publishing ? "Publishing…" : "Publish"}
                  </>
                )}
              </button>
              {session.publicShareToken && (
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-300 bg-white dark:bg-transparent transition-colors"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Share
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-4 w-full flex flex-col gap-4 flex-1">
          <MetricsBar metrics={session} />

          {showFilters && (
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 flex flex-wrap items-end gap-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300">
                <SlidersHorizontal className="h-4 w-4 text-blue-500" />
                Filter Frames
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">Speed min (mph)</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={minSpeed}
                  onChange={(e) => setMinSpeed(e.target.value)}
                  placeholder="0"
                  className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">Speed max (mph)</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={maxSpeed}
                  onChange={(e) => setMaxSpeed(e.target.value)}
                  placeholder="any"
                  className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="w-px h-6 bg-gray-200 dark:bg-slate-600 hidden sm:block" />
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">From</label>
                <input
                  type="datetime-local"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-2 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">To</label>
                <input
                  type="datetime-local"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-2 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {hasActiveFilter && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    Showing {filteredFrames.length} / {allFrames.length} captures
                  </span>
                  <button
                    onClick={clearFilters}
                    className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear all
                  </button>
                </div>
              )}
            </div>
          )}

          <div
            className="rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 shadow-sm relative"
            style={{ height: "calc(100vh - 420px)", minHeight: 320 }}
          >
            {!framesLoading ? (
              <SessionMap
                routeGeojson={routeGeojson}
                frames={filteredFrames}
                selectedFrameId={selectedFrame?.id}
                onMarkerClick={setSelectedFrame}
                showRoute={showRoute}
                tileLayer={tileLayer}
                fitBoundsTrigger={fitTrigger}
                sessionTitle={session.title ?? session.sessionId}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500">
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
                  <span className="text-sm">Loading map…</span>
                </div>
              </div>
            )}

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
                title={tileLayer === "osm" ? "Switch to satellite" : "Switch to street map"}
                className={`border rounded-lg p-2 shadow-md transition-colors ${
                  tileLayer === "satellite"
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                }`}
              >
                <Layers className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowRoute((v) => !v)}
                title={showRoute ? "Hide route line" : "Show route line"}
                className={`border rounded-lg p-2 shadow-md transition-colors ${
                  showRoute
                    ? "bg-blue-50 dark:bg-blue-900/40 border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400"
                    : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-700"
                }`}
              >
                <Route className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowFilters((v) => !v)}
                title="Filter frame markers"
                className={`border rounded-lg p-2 shadow-md transition-colors ${
                  showFilters || hasActiveFilter
                    ? "bg-amber-50 dark:bg-amber-900/40 border-amber-300 dark:border-amber-600 text-amber-600 dark:text-amber-400"
                    : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>

          {allFrames.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Filmstrip
                {hasActiveFilter && (
                  <span className="ml-2 normal-case font-normal text-blue-500 dark:text-blue-400">
                    ({filteredFrames.length} of {allFrames.length})
                  </span>
                )}
              </h2>
              <FrameFilmstrip
                frames={filteredFrames}
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

          {allFrames.length > 0 && (
            <div className="pb-6">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Frame Metadata
              </h2>
              <div className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-auto bg-white dark:bg-slate-800 shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-800/80 text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-700">
                      <th className="px-3 py-2.5 font-semibold">#</th>
                      <th className="px-3 py-2.5 font-semibold">Timestamp</th>
                      <th className="px-3 py-2.5 font-semibold">Lat</th>
                      <th className="px-3 py-2.5 font-semibold">Lon</th>
                      <th className="px-3 py-2.5 font-semibold">Speed</th>
                      <th className="px-3 py-2.5 font-semibold">Heading</th>
                      <th className="px-3 py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFrames.map((frame, i) => {
                      const isSelected = frame.id === selectedFrame?.id;
                      return (
                        <tr
                          key={frame.id}
                          onClick={() => setSelectedFrame(frame)}
                          className={`
                            border-t border-gray-100 dark:border-slate-700/50 cursor-pointer transition-colors
                            ${isSelected
                              ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200"
                              : i % 2 === 0
                                ? "bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-slate-800/60 text-gray-700 dark:text-slate-300"
                                : "bg-gray-50/50 dark:bg-slate-800/20 hover:bg-gray-100 dark:hover:bg-slate-800/60 text-gray-700 dark:text-slate-300"
                            }
                          `}
                        >
                          <td className="px-3 py-1.5 font-mono">{frame.frameIndex}</td>
                          <td className="px-3 py-1.5 whitespace-nowrap">{formatTimestamp(frame.capturedAt)}</td>
                          <td className="px-3 py-1.5 font-mono">{frame.latitude.toFixed(6)}</td>
                          <td className="px-3 py-1.5 font-mono">{frame.longitude.toFixed(6)}</td>
                          <td className="px-3 py-1.5">{frame.speedMph != null ? `${frame.speedMph.toFixed(1)} mph` : "—"}</td>
                          <td className="px-3 py-1.5">{frame.heading != null ? `${frame.heading.toFixed(0)}°` : "—"}</td>
                          <td className="px-3 py-1.5">
                            <span className={`
                              inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium
                              ${frame.uploadStatus === "uploaded"
                                ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
                                : "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400"}
                            `}>
                              {frame.uploadStatus === "uploaded" && <CheckCircle className="h-2.5 w-2.5" />}
                              {frame.uploadStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
