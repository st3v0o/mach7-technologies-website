import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import FeedPage from "@/pages/FeedPage";
import SessionDetail from "@/pages/SessionDetail";
import SharePage from "@/pages/SharePage";
import ImportPage from "@/pages/ImportPage";
import { DarkModeCtx, useDarkModeInit } from "@/hooks/useDarkMode";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={FeedPage} />
      <Route path="/sessions/:id" component={SessionDetail} />
      <Route path="/share/:token" component={SharePage} />
      <Route path="/import" component={ImportPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppShell() {
  const darkMode = useDarkModeInit();
  return (
    <DarkModeCtx.Provider value={darkMode}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </DarkModeCtx.Provider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
