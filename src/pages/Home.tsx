import { useState, FormEvent } from "react";
import { ArrowRight, Crosshair, Shield, Clock, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneMockup } from "@/components/PhoneMockup";
import { MapMockup } from "@/components/MapMockup";
import { ScreenGallery } from "@/components/ScreenGallery";
import { UseCaseTicker } from "@/components/UseCaseTicker";

// SWAP: replace with your business email
const CONTACT_EMAIL = "info@mach7technologies.com";

export default function Home() {
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function handleContact(e: FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`Access Request from ${name}${org ? ` — ${org}` : ""}`);
    const body = encodeURIComponent(`Name: ${name}\nOrganization: ${org}\n\n${message}`);
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    setSent(true);
  }

  return (
    <div className="flex flex-col">
      {/* HERO SECTION */}
      <section className="relative pt-24 pb-32 md:pt-32 md:pb-48 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background -z-10" />
        <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <div className="flex flex-col gap-6 max-w-2xl">
            <div className="inline-flex items-center gap-2 border border-border/50 bg-card/50 backdrop-blur px-3 py-1 text-xs font-mono text-muted-foreground uppercase tracking-wider w-fit">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              STATUS: Currently in Development
            </div>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
              Location-aware <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">
                visual documentation.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              A precision instrument for field teams, infrastructure managers, and mapping operations. Every piece of visual data tied automatically to place and time.
            </p>
            {/* SWAP: update copy for final launch */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button asChild size="lg" className="font-display font-medium rounded-none group h-12 px-8">
                <a href="#contact">
                  Request Access
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="font-display font-medium rounded-none h-12 px-8">
                <a href="#features">Explore Capabilities</a>
              </Button>
            </div>
          </div>
          
          <div className="relative mx-auto w-full max-w-[280px] lg:max-w-none lg:h-[600px] flex items-center justify-center">
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* USE CASE TICKER */}
      <UseCaseTicker />

      {/* CORE VALUE PROPS */}
      <section id="features" className="py-24 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4">Engineered for reality.</h2>
            <p className="text-muted-foreground text-lg">
              Built for the uncompromising demands of the field. We remove the friction between capture and context.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 border border-border/50 bg-background flex flex-col gap-4">
              <Crosshair className="w-8 h-8 text-primary" />
              <h3 className="font-display font-semibold text-xl">Absolute Precision</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Every frame is anchored with exact coordinate data. No manual tagging, no guesswork. Just reliable spatial truth.
              </p>
            </div>
            <div className="p-6 border border-border/50 bg-background flex flex-col gap-4">
              <Clock className="w-8 h-8 text-primary" />
              <h3 className="font-display font-semibold text-xl">Temporal Integrity</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Immutable timestamping ensures a chronological record of assets and conditions, critical for audits and project tracking.
              </p>
            </div>
            <div className="p-6 border border-border/50 bg-background flex flex-col gap-4">
              <HardDrive className="w-8 h-8 text-primary" />
              <h3 className="font-display font-semibold text-xl">Robust Operation</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Designed to operate in challenging environments where connectivity is not guaranteed. Capture now, sync when ready.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section id="workflow" className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 aspect-square md:aspect-video lg:aspect-square w-full overflow-hidden rounded-sm border border-border/30">
              <MapMockup />
            </div>
            
            <div className="order-1 lg:order-2 flex flex-col gap-12">
              <div>
                <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4">Context is everything.</h2>
                <p className="text-muted-foreground text-lg">
                  Isolated media is useless. We build the connective tissue between what you see and where it exists.
                </p>
              </div>
              
              <div className="flex flex-col gap-8">
                <div className="flex gap-4">
                  <div className="w-8 h-8 shrink-0 border border-primary text-primary flex items-center justify-center font-mono text-sm font-bold">01</div>
                  <div>
                    <h4 className="font-display font-semibold text-lg mb-2">Capture the environment</h4>
                    <p className="text-muted-foreground text-sm">Record video or capture stills with streamlined controls designed for gloved hands and bright sunlight.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 shrink-0 border border-primary text-primary flex items-center justify-center font-mono text-sm font-bold">02</div>
                  <div>
                    <h4 className="font-display font-semibold text-lg mb-2">Automatic spatial binding</h4>
                    <p className="text-muted-foreground text-sm">The software silently handles the telemetry, fusing location and trajectory data with the media in real-time.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 shrink-0 border border-primary text-primary flex items-center justify-center font-mono text-sm font-bold">03</div>
                  <div>
                    <h4 className="font-display font-semibold text-lg mb-2">Review & Export</h4>
                    <p className="text-muted-foreground text-sm">Access an integrated map view immediately. Verify coverage before leaving the site.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SPECS/DETAILS */}
      <section id="specs" className="py-24 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4">Serious capability.</h2>
            <p className="text-muted-foreground text-lg">
              No extraneous features. Just the essential tools required for rigorous documentation.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border border-border/50 p-6 bg-background">
              <div className="font-mono text-primary text-sm font-bold mb-4">01 // TELEMETRY</div>
              <p className="text-sm text-muted-foreground">High-frequency position logging synchronized with media frames.</p>
            </div>
            <div className="border border-border/50 p-6 bg-background">
              <div className="font-mono text-primary text-sm font-bold mb-4">02 // INTEGRITY</div>
              <p className="text-sm text-muted-foreground">Continuous recording safeguards to prevent data loss in harsh conditions.</p>
            </div>
            <div className="border border-border/50 p-6 bg-background">
              <div className="font-mono text-primary text-sm font-bold mb-4">03 // HARDWARE</div>
              <p className="text-sm text-muted-foreground">Optimized for iOS. Taking full advantage of native sensor capabilities.</p>
            </div>
            <div className="border border-border/50 p-6 bg-background">
              <div className="font-mono text-primary text-sm font-bold mb-4">04 // EXPORT</div>
              <p className="text-sm text-muted-foreground">Standardized outputs ready for integration into your existing mapping infrastructure.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SCREENSHOTS */}
      <ScreenGallery />

      {/* CONTACT */}
      <section id="contact" className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 -z-10" />
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-12">
            <Shield className="w-12 h-12 mx-auto text-primary mb-6" />
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4">Equip your team.</h2>
            <p className="text-lg text-muted-foreground">
              MACH 7 is currently in active development. If you represent an organization that requires serious spatial documentation tools, we want to hear from you.
            </p>
          </div>

          {sent ? (
            <div className="border border-primary/40 bg-primary/5 p-8 text-center">
              <p className="font-display font-semibold text-lg mb-2">Your email client should have opened.</p>
              <p className="text-sm text-muted-foreground">
                If it didn't, send us a message directly at{" "}
                {/* SWAP: replace with your business email */}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleContact} className="flex flex-col gap-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="contact-name" className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Name *</label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your name"
                    className="bg-card border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors rounded-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="contact-org" className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Organization</label>
                  <input
                    id="contact-org"
                    type="text"
                    value={org}
                    onChange={e => setOrg(e.target.value)}
                    placeholder="Company or agency"
                    className="bg-card border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors rounded-none"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="contact-message" className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Message *</label>
                <textarea
                  id="contact-message"
                  required
                  rows={5}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Describe your use case and team size..."
                  className="bg-card border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors rounded-none resize-none"
                />
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                <Button type="submit" size="lg" className="font-display font-bold rounded-none h-12 px-8 w-full sm:w-auto">
                  Send Request
                </Button>
                <p className="text-xs text-muted-foreground font-mono">
                  {/* SWAP: replace with your business email */}
                  Opens your mail client — or email us directly at {CONTACT_EMAIL}
                </p>
              </div>
            </form>
          )}

          <p className="mt-10 text-center text-sm text-muted-foreground font-mono">
            COMING SOON TO iOS
          </p>
        </div>
      </section>
    </div>
  );
}
