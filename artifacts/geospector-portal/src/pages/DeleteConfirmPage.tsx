import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";

type Status = "loading" | "success" | "error";

export default function DeleteConfirmPage() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid or missing delete token.");
      return;
    }

    fetch(`/api/portal/sessions/delete-confirm/${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (res.ok) {
          setStatus("success");
          setMessage("The session has been permanently deleted.");
        } else {
          const body = await res.json().catch(() => ({}));
          setStatus("error");
          setMessage(
            body?.error ??
              (res.status === 404
                ? "This delete link is invalid or has already been used."
                : res.status === 410
                  ? "This delete link has expired. Please request a new one from the session page."
                  : `Unexpected error (${res.status}). Please try again.`)
          );
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Network error. Please check your connection and try again.");
      });
  }, [token]);

  useEffect(() => {
    if (status === "success") {
      const t = setTimeout(() => navigate("/"), 4000);
      return () => clearTimeout(t);
    }
  }, [status, navigate]);

  return (
    <Layout>
      <div className="flex-1 flex items-center justify-center py-24 px-4">
        <div className="max-w-md w-full text-center flex flex-col items-center gap-5">
          {status === "loading" && (
            <>
              <div className="bg-gray-100 dark:bg-slate-800 rounded-full p-5">
                <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-lg">
                  Confirming deletion…
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                  Verifying your delete link, please wait.
                </p>
              </div>
            </>
          )}

          {status === "success" && (
            <>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-full p-5">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-lg">
                  Session deleted
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                  {message}
                </p>
                <p className="mt-3 text-xs text-gray-400 dark:text-slate-500">
                  Redirecting you home in a few seconds…
                </p>
              </div>
              <button
                onClick={() => navigate("/")}
                className="mt-1 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                Go home now
              </button>
            </>
          )}

          {status === "error" && (
            <>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-full p-5">
                <XCircle className="h-10 w-10 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-lg">
                  Deletion failed
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                  {message}
                </p>
              </div>
              <button
                onClick={() => navigate("/")}
                className="mt-1 px-5 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 text-sm font-medium transition-colors"
              >
                ← Back to home
              </button>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
