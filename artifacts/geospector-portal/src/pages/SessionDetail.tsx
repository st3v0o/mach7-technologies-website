import { useState } from "react";
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
import { ArrowLeft, Share2, MapPin, CheckCircle, Globe, EyeOff } from "lucide-react";
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

  const frames = framesData?.frames ?? [];
  const routeGeojson = routeData?.geojson ?? session?.routeGeojson;

  function handleShare() {
    if (!session?.publicShareToken) return;
    const base = window.location.origin + import.meta.env.BASE_URL;
    const url = `${base}share/${session.publicShareToken}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Link copied!", description: url });
    });
  }

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <span className="text-slate-400">Loading session…</span>
      </div>
    );
  }

  if (sessionError || !session) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Session not found or failed to load.</p>
          <button onClick={() => navigate("/sessions")} className="text-blue-400 hover:underline text-sm">← Back to sessions</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="border-b border-slate-700 bg-slate-800/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/sessions")}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Sessions
          </button>
          <div className="h-4 w-px bg-slate-600" />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <MapPin className="h-4 w-4 text-blue-400 flex-none" />
            <h1 className="font-semibold truncate">{session.title ?? session.sessionId}</h1>
            {session.isPublic && (
              <span className="flex-none flex items-center gap-1 bg-green-700/60 text-green-300 text-xs px-2 py-0.5 rounded-full font-medium">
                <Globe className="h-3 w-3" />
                Public
              </span>
            )}
          </div>
          <button
            onClick={handleTogglePublish}
            disabled={publishing}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
              session.isPublic
                ? "border-green-600 text-green-300 hover:border-red-500 hover:text-red-300"
                : "border-slate-600 text-slate-300 hover:border-green-500 hover:text-green-300"
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
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:border-blue-500 hover:text-white transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5 flex-1 flex flex-col gap-5 w-full">
        <MetricsBar metrics={session} />

        <div className="rounded-xl overflow-hidden border border-slate-700" style={{ height: "45vh", minHeight: 300 }}>
          {!framesLoading ? (
            <SessionMap
              routeGeojson={routeGeojson}
              frames={frames}
              selectedFrameId={selectedFrame?.id}
              onMarkerClick={setSelectedFrame}
              sessionTitle={session.title}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-slate-800 text-slate-400">
              Loading map…
            </div>
          )}
        </div>

        {frames.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Filmstrip
            </h2>
            <FrameFilmstrip
              frames={frames}
              selectedFrameId={selectedFrame?.id}
              onSelectFrame={setSelectedFrame}
            />
          </div>
        )}

        {frames.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Frame Metadata
            </h2>
            <div className="rounded-xl border border-slate-700 overflow-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-800 text-slate-400">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Timestamp</th>
                    <th className="px-3 py-2 font-medium">Lat</th>
                    <th className="px-3 py-2 font-medium">Lon</th>
                    <th className="px-3 py-2 font-medium">Speed</th>
                    <th className="px-3 py-2 font-medium">Heading</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {frames.map((frame, i) => {
                    const isSelected = frame.id === selectedFrame?.id;
                    return (
                      <tr
                        key={frame.id}
                        onClick={() => setSelectedFrame(frame)}
                        className={`
                          border-t border-slate-700/50 cursor-pointer transition-colors
                          ${isSelected ? "bg-blue-900/30 text-blue-200" : "hover:bg-slate-800 text-slate-300"}
                          ${i % 2 === 0 ? "" : "bg-slate-800/30"}
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
                            ${frame.uploadStatus === "uploaded" ? "bg-green-900/50 text-green-300" : "bg-slate-700 text-slate-400"}
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
      </main>
    </div>
  );
}
