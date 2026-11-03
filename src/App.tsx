import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import Outsidey from "@/pages/Outsidey";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import NotFound from "@/pages/not-found";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { GpxLiveBackground } from "@/components/GpxLiveBackground";
import { PRODUCTS, productAt } from "@/lib/products";

const queryClient = new QueryClient();

function Router() {
  const [location] = useLocation();
  const product = productAt(location);
  // Switching apps slides the page toward the side the app sits on in the switcher.
  const order = PRODUCTS.findIndex((p) => p.id === product.id);
  const last = useRef(order);
  const dir = order >= last.current ? 1 : -1;
  // The accent color changes as the new page comes in, so the old page leaves in its own color.
  const applyTheme = () => (document.documentElement.dataset.product = product.id);
  useEffect(() => {
    if (!document.documentElement.dataset.product) applyTheme();
    last.current = order;
    if (location === product.path) document.title = product.title;
  }, [order, product, location]);

  return (
    <>
      <GpxLiveBackground />
      <div className="flex flex-col min-h-screen relative z-10">
        <Navbar />
        <main className="flex-1 overflow-x-hidden">
          <AnimatePresence mode="wait" initial={false} custom={dir} onExitComplete={() => (window.scrollTo({ top: 0 }), applyTheme())}>
            <motion.div
              key={product.id}
              custom={dir}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: 48 * d }),
                center: { opacity: 1, x: 0 },
                exit: (d: number) => ({ opacity: 0, x: -48 * d }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <Switch location={location}>
                <Route path="/" component={Home} />
                <Route path="/outsidey" component={Outsidey} />
                <Route path="/privacy" component={Privacy} />
                <Route path="/terms" component={Terms} />
                <Route component={NotFound} />
              </Switch>
            </motion.div>
          </AnimatePresence>
        </main>
        <Footer />
      </div>
    </>
  );
}

const RECAPTCHA_SITE_KEY: string | undefined = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

function App() {
  const inner = (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );

  if (!RECAPTCHA_SITE_KEY) {
    return inner;
  }

  return (
    <GoogleReCaptchaProvider reCaptchaKey={RECAPTCHA_SITE_KEY}>
      {inner}
    </GoogleReCaptchaProvider>
  );
}

export default App;
