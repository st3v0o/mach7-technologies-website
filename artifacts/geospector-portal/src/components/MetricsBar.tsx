import type { PortalSession, PortalSessionSummary } from "@workspace/api-client-react";

type Metrics = Pick<
  PortalSession | PortalSessionSummary,
  "totalFrames" | "uploadedFrames" | "totalDistanceMiles" | "durationSeconds" | "averageSpeedMph" | "maxSpeedMph"
>;

interface MetricItemProps {
  label: string;
  value: string;
  sub?: string;
}

function MetricItem({ label, value, sub }: MetricItemProps) {
  return (
    <div className="flex flex-col items-center px-4 py-3 bg-slate-800 rounded-lg min-w-[100px]">
      <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-xl font-bold text-white mt-1">{value}</span>
      {sub && <span className="text-xs text-slate-500 mt-0.5">{sub}</span>}
    </div>
  );
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function MetricsBar({ metrics }: { metrics: Metrics }) {
  return (
    <div className="flex flex-wrap gap-2 justify-start">
      <MetricItem
        label="Frames"
        value={String(metrics.totalFrames)}
        sub={`${metrics.uploadedFrames} uploaded`}
      />
      <MetricItem
        label="Distance"
        value={metrics.totalDistanceMiles != null ? `${metrics.totalDistanceMiles.toFixed(2)} mi` : "—"}
      />
      <MetricItem
        label="Duration"
        value={formatDuration(metrics.durationSeconds)}
      />
      <MetricItem
        label="Avg Speed"
        value={metrics.averageSpeedMph != null ? `${metrics.averageSpeedMph.toFixed(1)} mph` : "—"}
      />
      <MetricItem
        label="Max Speed"
        value={metrics.maxSpeedMph != null ? `${metrics.maxSpeedMph.toFixed(1)} mph` : "—"}
      />
    </div>
  );
}
