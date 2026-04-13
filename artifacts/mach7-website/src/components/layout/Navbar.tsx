import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          {/* SWAP: replace with your business logo */}
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-display font-bold text-xs tracking-tighter">
            M7
          </div>
          <span className="font-display font-bold tracking-tight text-lg">MACH 7</span>
        </Link>
        
        <nav className="hidden md:flex gap-6">
          <a href="/#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Capabilities</a>
          <a href="/#workflow" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Workflow</a>
          <a href="/#specs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Specs</a>
          <a href="/#contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Contact</a>
        </nav>

        <div className="flex items-center gap-4">
          <Button asChild variant="default" size="sm" className="font-display font-medium rounded-none">
            <a href="/#contact">Request Access</a>
          </Button>
        </div>
      </div>
    </header>
  );
}
