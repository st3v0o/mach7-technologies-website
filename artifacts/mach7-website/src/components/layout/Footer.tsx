import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card py-12 md:py-16">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-start gap-8">
        <div className="flex flex-col gap-4 max-w-sm">
          <Link href="/" className="flex items-center gap-2">
            {/* SWAP: replace with your business logo */}
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-display font-bold text-xs tracking-tighter">
              M7
            </div>
            <span className="font-display font-bold tracking-tight text-lg">MACH 7 TECHNOLOGIES</span>
          </Link>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Developing professional-grade tools for location-aware visual documentation. Precision field capture, automatically tied to place and time.
          </p>
        </div>
        
        <div className="flex flex-col gap-3">
          <h4 className="font-display font-semibold text-sm">Legal</h4>
          <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Terms of Use
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="font-display font-semibold text-sm">Contact</h4>
          {/* SWAP: replace with your business email */}
          <a href="mailto:contact@mach7technologies.com" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            contact@mach7technologies.com
          </a>
        </div>
      </div>
      
      <div className="container mx-auto px-4 mt-12 pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-xs text-muted-foreground">
          &copy; 2025 MACH 7 Technologies LLC. All rights reserved.
        </p>
        <p className="text-xs text-muted-foreground">
          Currently in development. Coming soon to iOS.
        </p>
      </div>
    </footer>
  );
}
