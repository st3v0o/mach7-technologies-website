import { useState } from "react";
import { useParams } from "wouter";
import { useGetPortalShareSession, useGetPortalSessionFrames, useGetPortalSessionRoute } from "@workspace/api-client-react";
import type { PortalFrame } from "@workspace/api-client-react";
import MetricsBar from "@/components/MetricsBar";
import SessionMap from "@/components/SessionMap";
import FrameFilmstrip from "@/components/FrameFilmstrip";
import Layout from "@/components/Layout";
import { MapPin, AlertCircle, Layers, Map as MapIcon } from "lucide-react";

export default function SharePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [selectedFrame, setSelectedFrame] = useState<PortalFrame | null>(null);
  const [showRoute, setShowRoute] = useState(true);
  const [tileLayer, setTileLayer] = useState<"osm" | "satellite">("osm");
  const [fitTrigger, setFitTrigger] = useState(0);

  const { data: session, isLoading, error } = useGetPortalShareSession(token);

  const sessionId = session?.id ?? 0;
  const { data: framesData } = useGetPortalSessionFrames(sessionId, { limit: 500 });
  const { data: routeData } = useGetPortalSessionRoute(sessionId);

  const frames = session ? (framesData?.frames ?? []) : [];
  const routeGeojson = routeData?.geojson ?? session?.routeGeojson;

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

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-5 w-full flex-1 flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
            {session.title ?? session.sessionId}
          </h1>
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
      </div>
    </Layout>
  );
}
