import { useRef } from "react";
import type { PortalFrame } from "@workspace/api-client-react";

interface FrameFilmstripProps {
  frames: PortalFrame[];
  selectedFrameId?: number;
  onSelectFrame: (frame: PortalFrame) => void;
}

export default function FrameFilmstrip({ frames, selectedFrameId, onSelectFrame }: FrameFilmstripProps) {
  const stripRef = useRef<HTMLDivElement>(null);

  function scrollToFrame(frameId: number) {
    const el = stripRef.current?.querySelector(`[data-frame-id="${frameId}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }

  function handleClick(frame: PortalFrame) {
    onSelectFrame(frame);
    scrollToFrame(frame.id);
  }

  if (frames.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 bg-slate-800/50 rounded-lg text-slate-500 text-sm">
        No frames available
      </div>
    );
  }

  return (
    <div
      ref={stripRef}
      className="flex gap-2 overflow-x-auto pb-2 scroll-smooth"
      style={{ scrollbarWidth: "thin", scrollbarColor: "#334155 transparent" }}
    >
      {frames.map((frame) => {
        const isSelected = frame.id === selectedFrameId;
        return (
          <button
            key={frame.id}
            data-frame-id={frame.id}
            onClick={() => handleClick(frame)}
            className={`
              flex-none relative rounded overflow-hidden border-2 transition-all cursor-pointer
              ${isSelected ? "border-blue-400 ring-1 ring-blue-400" : "border-slate-700 hover:border-slate-400"}
            `}
            style={{ width: 96, height: 72 }}
          >
            {frame.imageUrl ? (
              <img
                src={frame.imageUrl}
                alt={`Frame ${frame.frameIndex}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                <span className="text-xs text-slate-400">#{frame.frameIndex}</span>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 text-center">
              #{frame.frameIndex}
            </div>
            {isSelected && (
              <div className="absolute inset-0 bg-blue-400/10" />
            )}
          </button>
        );
      })}
    </div>
  );
}
