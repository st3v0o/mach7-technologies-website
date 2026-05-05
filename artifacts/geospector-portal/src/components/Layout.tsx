import { Link } from "wouter";
import { MapPin, Moon, Sun, Plus } from "lucide-react";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useImportMockPortalSession, getGetPortalFeedQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface LayoutProps {
  children: React.ReactNode;
  showDemoButton?: boolean;
}

export default function Layout({ children, showDemoButton = false }: LayoutProps) {
  const { isDark, toggle } = useDarkMode();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const { mutate: importMock, isPending: importing } = useImportMockPortalSession({
    mutation: {
      onSuccess(newSession) {
        qc.invalidateQueries({ queryKey: getGetPortalFeedQueryKey() });
        navigate(`/sessions/${newSession.id}`);
      },
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white flex flex-col transition-colors duration-200">
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="bg-blue-600 text-white rounded-lg p-1.5">
              <MapPin className="h-4 w-4" />
            </div>
            <span className="font-bold text-lg tracking-tight text-gray-900 dark:text-white">
              GeoSpector
            </span>
            <span className="hidden sm:inline text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-800">
              Atlas
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {showDemoButton && (
              <button
                onClick={() => importMock()}
                disabled={importing}
                className="hidden sm:flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                {importing ? "Generating…" : "Demo Session"}
              </button>
            )}
            <button
              onClick={toggle}
              aria-label="Toggle dark mode"
              className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t border-gray-200 dark:border-slate-700 py-4 text-center text-xs text-gray-400 dark:text-slate-500">
        Powered by <span className="text-gray-600 dark:text-slate-300 font-medium">Geospector</span> — MACH 7 Technologies LLC
      </footer>
    </div>
  );
}
