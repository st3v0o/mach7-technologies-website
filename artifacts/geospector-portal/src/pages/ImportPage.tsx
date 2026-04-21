import { useState } from "react";
import { useLocation } from "wouter";
import {
  useImportMockPortalSession,
  useImportPortalSessionJson,
  getListPortalSessionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Plus, Upload } from "lucide-react";

export default function ImportPage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const { mutate: importMock, isPending: mockPending } = useImportMockPortalSession({
    mutation: {
      onSuccess(data) {
        qc.invalidateQueries({ queryKey: getListPortalSessionsQueryKey() });
        navigate(`/sessions/${data.id}`);
      },
    },
  });

  const { mutate: importJson, isPending: jsonPending } = useImportPortalSessionJson({
    mutation: {
      onSuccess(data) {
        qc.invalidateQueries({ queryKey: getListPortalSessionsQueryKey() });
        navigate(`/sessions/${data.id}`);
      },
      onError(err) {
        setJsonError(String(err));
      },
    },
  });

  function handleJsonSubmit(e: React.FormEvent) {
    e.preventDefault();
    setJsonError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setJsonError("Invalid JSON — please check the format and try again.");
      return;
    }
    const body = parsed as { session: Record<string, unknown>; frames: Record<string, unknown>[] };
    if (!body.session || !Array.isArray(body.frames)) {
      setJsonError('JSON must have a "session" object and a "frames" array.');
      return;
    }
    importJson({ data: body });
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-slate-700 bg-slate-800/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Sessions
          </button>
          <div className="h-4 w-px bg-slate-600" />
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-400" />
            <h1 className="font-semibold">Import Session</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-8">
        <section className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h2 className="font-semibold text-lg mb-1">Demo Session</h2>
          <p className="text-slate-400 text-sm mb-4">
            Generate a realistic demo GPS session along the Guadalupe River Trail in San Jose, CA. Great for exploring the portal's map view and frame features.
          </p>
          <button
            onClick={() => importMock()}
            disabled={mockPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors font-medium"
          >
            <Plus className="h-4 w-4" />
            {mockPending ? "Generating…" : "Generate demo session"}
          </button>
        </section>

        <section className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h2 className="font-semibold text-lg mb-1">Import Session JSON</h2>
          <p className="text-slate-400 text-sm mb-4">
            Paste a Geospector session export in JSON format. The JSON must have a{" "}
            <code className="text-blue-300 bg-slate-700 px-1 py-0.5 rounded text-xs">session</code> object
            and a <code className="text-blue-300 bg-slate-700 px-1 py-0.5 rounded text-xs">frames</code> array.
          </p>

          <form onSubmit={handleJsonSubmit} className="flex flex-col gap-3">
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder={`{\n  "session": { "sessionId": "...", "title": "..." },\n  "frames": [\n    { "latitude": 37.33, "longitude": -121.89 }\n  ]\n}`}
              rows={10}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-y"
            />
            {jsonError && (
              <p className="text-red-400 text-sm">{jsonError}</p>
            )}
            <button
              type="submit"
              disabled={jsonPending || !jsonText.trim()}
              className="self-start flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-700 hover:bg-green-600 disabled:opacity-50 transition-colors font-medium"
            >
              <Upload className="h-4 w-4" />
              {jsonPending ? "Importing…" : "Import session"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
