import { useState } from "react";
import { useParams } from "wouter";
import { useGetPortalShareSession, useGetPortalSessionFrames, useGetPortalSessionRoute } from "@workspace/api-client-react";
import type { PortalFrame } from "@workspace/api-client-react";
import MetricsBar from "@/components/MetricsBar";
import SessionMap from "@/components/SessionMap";
import FrameFilmstrip from "@/components/FrameFilmstrip";
import { MapPin } from "lucide-react";

export default function SharePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [selectedFrame, setSelectedFrame] = useState<PortalFrame | null>(null);

  const { data: session, isLoading, error } = useGetPortalShareSession(token);

  const sessionId = session?.id ?? 0;
  const { data: framesData } = useGetPortalSessionFrames(sessionId, { limit: 500 });
  const { data: routeData } = useGetPortalSessionRoute(sessionId);

  const frames = session ? (framesData?.frames ?? []) : [];
  const routeGeojson = routeData?.geojson ?? session?.routeGeojson;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <span className="text-slate-400">Loading shared session…</span>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-3">
        <MapPin className="h-12 w-12 text-slate-600" />
        <h1 className="text-xl font-semibold text-slate-300">Session not found</h1>
        <p className="text-slate-500 text-sm">This shared link may have expired or is invalid.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="border-b border-slate-700 bg-slate-800/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <MapPin className="h-5 w-5 text-blue-400" />
          <div>
            <h1 className="font-bold text-base leading-tight">{session.title ?? session.sessionId}</h1>
            <p className="text-xs text-slate-400">Shared GPS session via Geospector</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 flex-1 flex flex-col gap-5 w-full">
        <MetricsBar metrics={session} />

        <div className="rounded-xl overflow-hidden border border-slate-700" style={{ height: "45vh", minHeight: 300 }}>
          <SessionMap
            routeGeojson={routeGeojson}
            frames={frames}
            selectedFrameId={selectedFrame?.id}
            onMarkerClick={setSelectedFrame}
          />
        </div>

        {frames.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">Frames</h2>
            <FrameFilmstrip
              frames={frames}
              selectedFrameId={selectedFrame?.id}
              onSelectFrame={setSelectedFrame}
            />
          </div>
        )}
      </main>

      <footer className="border-t border-slate-700 py-3 text-center text-xs text-slate-500">
        Powered by <span className="text-slate-400 font-medium">Geospector</span> — MACH 7 Technologies LLC
      </footer>
    </div>
  );
}
