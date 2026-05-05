import { useState } from "react";
import { useLocation } from "wouter";
import {
  useImportMockPortalSession,
  useImportPortalSessionJson,
  getListPortalSessionsQueryKey,
  getGetPortalFeedQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Upload } from "lucide-react";
import Layout from "@/components/Layout";

export default function ImportPage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const { mutate: importMock, isPending: mockPending } = useImportMockPortalSession({
    mutation: {
      onSuccess(data) {
        qc.invalidateQueries({ queryKey: getListPortalSessionsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetPortalFeedQueryKey() });
        navigate(`/sessions/${data.id}`);
      },
    },
  });

  const { mutate: importJson, isPending: jsonPending } = useImportPortalSessionJson({
    mutation: {
      onSuccess(data) {
        qc.invalidateQueries({ queryKey: getListPortalSessionsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetPortalFeedQueryKey() });
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
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8 w-full flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Import Session</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Add GPS session data to the portal.</p>
        </div>

        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
          <h2 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">Demo Session</h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm mb-5">
            Generate a realistic demo GPS session along the Guadalupe River Trail in San Jose, CA.
          </p>
          <button
            onClick={() => importMock()}
            disabled={mockPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors font-medium shadow-sm"
          >
            <Plus className="h-4 w-4" />
            {mockPending ? "Generating…" : "Generate demo session"}
          </button>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
          <h2 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">Import Session JSON</h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm mb-5">
            Paste a Geospector session export in JSON format. The JSON must have a{" "}
            <code className="text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-slate-700 px-1 py-0.5 rounded text-xs">session</code> object
            and a <code className="text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-slate-700 px-1 py-0.5 rounded text-xs">frames</code> array.
          </p>

          <form onSubmit={handleJsonSubmit} className="flex flex-col gap-3">
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder={`{\n  "session": { "sessionId": "...", "title": "..." },\n  "frames": [\n    { "latitude": 37.33, "longitude": -121.89 }\n  ]\n}`}
              rows={10}
              className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-mono text-gray-900 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            />
            {jsonError && (
              <p className="text-red-500 dark:text-red-400 text-sm">{jsonError}</p>
            )}
            <button
              type="submit"
              disabled={jsonPending || !jsonText.trim()}
              className="self-start flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white disabled:opacity-50 transition-colors font-medium shadow-sm"
            >
              <Upload className="h-4 w-4" />
              {jsonPending ? "Importing…" : "Import session"}
            </button>
          </form>
        </section>
      </div>
    </Layout>
  );
}
