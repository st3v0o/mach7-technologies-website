import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { PRODUCTS, productAt } from "@/lib/products";

export function Navbar() {
  const [location, setLocation] = useLocation();
  const product = productAt(location);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <Link href={product.path} className="hidden sm:flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-display font-bold text-xs tracking-tighter transition-colors duration-500">
            {product.mark}
          </div>
          <span className="font-display font-bold tracking-tight text-lg">{product.name}</span>
        </Link>

        {/* Product switcher: Geospector and Outsidey, the highlight slides to the one shown. */}
        <div role="tablist" aria-label="MACH 7 apps" className="relative flex items-center rounded-full border border-border/60 bg-card/80 p-1">
          {PRODUCTS.map((p) => {
            const active = p.id === product.id;
            return (
              <button
                key={p.id}
                role="tab"
                aria-selected={active}
                onClick={() => !active && setLocation(p.path)}
                className={`relative z-10 px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm font-display font-semibold tracking-wide rounded-full transition-colors duration-300 ${active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {active && (
                  <motion.span
                    layoutId="product-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                {p.id === "geospector" ? "Geospector" : "Outsidey"}
              </button>
            );
          })}
        </div>

        <nav className="hidden lg:flex gap-6">
          {product.nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              {...(n.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4 shrink-0">
          <Button asChild variant="default" size="sm" className="font-display font-medium">
            <a href={product.appStoreUrl} target="_blank" rel="noopener noreferrer">Download</a>
          </Button>
        </div>
      </div>
    </header>
  );
}
