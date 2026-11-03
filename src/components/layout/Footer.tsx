import { Link, useLocation } from "wouter";
import { productAt } from "@/lib/products";

export function Footer() {
  const [location] = useLocation();
  const product = productAt(location);
  const display = product.id === "geospector" ? "Geospector" : "Outsidey";

  return (
    <footer className="border-t border-border bg-card py-12 md:py-16">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-start gap-8">
        <div className="flex flex-col gap-4 max-w-sm">
          <Link href={product.path} className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-display font-bold text-xs tracking-tighter">
              {product.mark}
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display font-bold tracking-tight text-base">{product.name}</span>
              <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase">by MACH 7 Technologies</span>
            </div>
          </Link>
          <p className="text-muted-foreground text-sm leading-relaxed">{product.tagline}</p>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="font-display font-semibold text-sm">Apps</h4>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Geospector</Link>
          <Link href="/outsidey" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Outsidey</Link>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="font-display font-semibold text-sm">Legal</h4>
          {product.id === "outsidey" ? (
            <>
              <a href="https://outsidey.mach7technologies.com/privacy.html" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="https://outsidey.mach7technologies.com/support.html" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Support</a>
            </>
          ) : (
            <>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Use</Link>
            </>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="font-display font-semibold text-sm">Contact</h4>
          <a href="mailto:info@mach7technologies.com" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            info@mach7technologies.com
          </a>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-12 pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-xs text-muted-foreground">
          &copy; 2026 MACH 7 Technologies LLC. All rights reserved.
        </p>
        <a href={product.appStoreUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary transition-colors">
          {display} — available now on the App Store
        </a>
      </div>
    </footer>
  );
}
