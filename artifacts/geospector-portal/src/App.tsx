import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AtlasLandingPage from "@/pages/AtlasLandingPage";
import SessionDetail from "@/pages/SessionDetail";
import SharePage from "@/pages/SharePage";
import ImportPage from "@/pages/ImportPage";
import DeleteConfirmPage from "@/pages/DeleteConfirmPage";
import SignInPage from "@/pages/SignInPage";
import SignUpPage from "@/pages/SignUpPage";
import MyMapsPage from "@/pages/MyMapsPage";
import MySessionsPage from "@/pages/MySessionsPage";
import { DarkModeCtx, useDarkModeInit } from "@/hooks/useDarkMode";
import { SupabaseAuthProvider } from "@/components/SupabaseAuthProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function Router() {
  return (
    <Switch>
      <Route path="/" component={AtlasLandingPage} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/my-maps" component={MyMapsPage} />
      <Route path="/my-sessions" component={MySessionsPage} />
      <Route path="/sessions/:id" component={SessionDetail} />
      <Route path="/share/:token" component={SharePage} />
      <Route path="/import" component={ImportPage} />
      <Route path="/delete/:token" component={DeleteConfirmPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppShell() {
  const darkMode = useDarkModeInit();
  return (
    <DarkModeCtx.Provider value={darkMode}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </DarkModeCtx.Provider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <SupabaseAuthProvider>
          <AppShell />
        </SupabaseAuthProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}
