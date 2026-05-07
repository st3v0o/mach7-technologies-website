import { MapPin, Link as LinkIcon } from "lucide-react";

export default function AtlasLandingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-sm w-full text-center flex flex-col items-center gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <MapPin className="h-10 w-10 text-blue-400" />
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
            Geospector
          </p>
          <h1 className="text-2xl font-bold text-white mb-3">Atlas</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Atlas hosts GPS survey maps captured with the Geospector field app. Each map lives at its own private link — there is no public gallery to browse.
          </p>
        </div>

        <div className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-start gap-3 text-left">
          <LinkIcon className="h-4 w-4 text-slate-400 flex-none mt-0.5" />
          <p className="text-sm text-slate-400">
            To view a shared map, open the link provided by the person who captured the session. Links are generated directly from the Geospector app.
          </p>
        </div>

        <p className="text-xs text-slate-600">
          Powered by <span className="text-slate-500 font-medium">Geospector</span> — MACH 7 Technologies LLC
        </p>
      </div>
    </div>
  );
}
