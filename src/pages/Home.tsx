import { useState, FormEvent } from "react";
import { ArrowRight, Crosshair, Shield, Gauge, UserCheck, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneMockup } from "@/components/PhoneMockup";
import { MapMockup } from "@/components/MapMockup";
import { ScreenGallery } from "@/components/ScreenGallery";
import { UseCaseTicker } from "@/components/UseCaseTicker";

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
      <section className="relative pt-24 pb-16 md:pt-28 md:pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background -z-10" />
        <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-12 lg:gap-8 items-start">
          <div className="flex flex-col gap-6 max-w-2xl">
            <div className="inline-flex items-center gap-2 border border-border/50 bg-card/50 backdrop-blur px-3 py-1 text-xs font-mono text-muted-foreground uppercase tracking-wider w-fit">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              STATUS: Currently in Development
            </div>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
              Every frame.<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">
                Every coordinate.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              Frame-by-frame GPS tagging, speed-adaptive capture rates, and expert manual mode with coverage accountability — all in an app simple enough for anyone on your team to operate.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button asChild size="lg" className="font-display font-medium rounded-none group h-12 px-8">
                <a href="#contact">
                  Request Access
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="font-display font-medium rounded-none h-12 px-8">
                <a href="#features">What Sets It Apart</a>
              </Button>
            </div>
          </div>
          
          <div className="mx-auto w-full lg:pt-6" style={{ maxWidth: "340px" }}>
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* USE CASE TICKER */}
      <UseCaseTicker />

      {/* CORE DIFFERENTIATORS */}
      <section id="features" className="py-24 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4">Precision at every level.</h2>
            <p className="text-muted-foreground text-lg">
              GPS bound to every individual frame. Capture rates that adapt to how fast you're moving. Coverage accountability built into the expert workflow. Each capability purpose-built for the demands of serious field documentation.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 border border-border/50 bg-background flex flex-col gap-4">
              <Crosshair className="w-8 h-8 text-primary" />
              <h3 className="font-display font-semibold text-xl">Frame-Level GPS Binding</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Every individual frame carries its own GPS coordinate — not a session marker, not an approximation. When you review footage, each second of video has a precise, queryable location on Earth. The spatial fidelity your audits, assessments, and legal documentation actually require.
              </p>
            </div>
            <div className="p-6 border border-border/50 bg-background flex flex-col gap-4">
              <Gauge className="w-8 h-8 text-primary" />
              <h3 className="font-display font-semibold text-xl">Speed-Adaptive Capture</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                A fixed frame rate wastes storage when you're crawling through a work zone and misses data when you accelerate. Dynamic FPS detects your vehicle speed in real-time and adjusts automatically — maintaining consistent spatial coverage density regardless of pace. Prefer manual control? Dial in a fixed interval instead.
              </p>
            </div>
            <div className="p-6 border border-border/50 bg-background flex flex-col gap-4">
              <UserCheck className="w-8 h-8 text-primary" />
              <h3 className="font-display font-semibold text-xl">Expert Mode + Coverage Proof</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Your trained inspector knows what to photograph. Manual photo mode lets them work deliberately, capturing the conditions they're qualified to identify. Meanwhile, the app logs their exact GPS route — building verifiable proof that the right areas were surveyed. Expert judgment with automatic accountability.
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
                <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4">Two modes. One tool.</h2>
                <p className="text-muted-foreground text-lg">
                  Whether you're running a systematic coverage sweep or sending a trained expert to document specific conditions, the same app handles both — without compromise.
                </p>
              </div>
              
              <div className="flex flex-col gap-8">
                <div className="flex gap-4">
                  <div className="w-8 h-8 shrink-0 border border-primary text-primary flex items-center justify-center font-mono text-sm font-bold">01</div>
                  <div>
                    <h4 className="font-display font-semibold text-lg mb-2">Choose how you work</h4>
                    <p className="text-muted-foreground text-sm">Auto mode for continuous, unattended coverage drives — set it and go. Expert mode for trained inspectors who need to make deliberate, knowledge-driven captures. Both modes run with GPS active from the moment you start.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 shrink-0 border border-primary text-primary flex items-center justify-center font-mono text-sm font-bold">02</div>
                  <div>
                    <h4 className="font-display font-semibold text-lg mb-2">Capture intelligently</h4>
                    <p className="text-muted-foreground text-sm">In auto mode, dynamic FPS adapts to your speed — capturing more when you're moving fast, fewer frames when you slow. In expert mode, your technician photographs what matters while the app builds a continuous GPS trail behind them, segment by segment.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 shrink-0 border border-primary text-primary flex items-center justify-center font-mono text-sm font-bold">03</div>
                  <div>
                    <h4 className="font-display font-semibold text-lg mb-2">Verify coverage. Export with confidence.</h4>
                    <p className="text-muted-foreground text-sm">The integrated map view shows every frame's precise location and your team's exact route. Spot coverage gaps before you leave the site. Export GPX tracks, geotagged media, or sync directly to your organization's cloud database.</p>
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
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4">Built different. By design.</h2>
            <p className="text-muted-foreground text-lg">
              Four capabilities that don't exist together anywhere else. Each one solves a real problem that generic capture apps ignore.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border border-border/50 p-6 bg-background">
              <div className="font-mono text-primary text-sm font-bold mb-4">01 // FRAME TELEMETRY</div>
              <p className="text-sm text-muted-foreground">GPS coordinates attached to every individual video frame and photo — not the session, not the file. Each pixel of your footage has an exact, retrievable position on Earth. The foundation everything else is built on.</p>
            </div>
            <div className="border border-border/50 p-6 bg-background">
              <div className="font-mono text-primary text-sm font-bold mb-4">02 // ADAPTIVE FPS</div>
              <p className="text-sm text-muted-foreground">Dynamic frame rate responds to your vehicle speed in real-time. No missed coverage at highway speed. No bloated storage at a crawl. Every frame earned. Override with a fixed interval setting when your workflow demands it.</p>
            </div>
            <div className="border border-border/50 p-6 bg-background">
              <div className="font-mono text-primary text-sm font-bold mb-4">03 // DUAL MODE</div>
              <p className="text-sm text-muted-foreground">Continuous automatic capture and deliberate expert photography in the same app. Switch between modes without losing your session or GPS record. The only tool that supports both workflows — with accountability built into each.</p>
            </div>
            <div className="border border-border/50 p-6 bg-background">
              <div className="font-mono text-primary text-sm font-bold mb-4">04 // FLEXIBLE STORAGE</div>
              <p className="text-sm text-muted-foreground">Local-first by design. No internet required in the field — capture works completely offline and auto-segments recordings to prevent data loss. When you're back in range, sync to your organization's cloud database or keep everything on-device.</p>
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
            <Database className="w-12 h-12 mx-auto text-primary mb-6" />
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4">Equip your team.</h2>
            <p className="text-lg text-muted-foreground">
              MACH 7 is in active development. If your organization needs frame-accurate spatial documentation — for infrastructure, compliance, environmental work, or field research — we want to hear from you.
            </p>
          </div>

          {sent ? (
            <div className="border border-primary/40 bg-primary/5 p-8 text-center">
              <p className="font-display font-semibold text-lg mb-2">Your email client should have opened.</p>
              <p className="text-sm text-muted-foreground">
                If it didn't, send us a message directly at{" "}
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
                  placeholder="Describe your use case, team size, and current documentation workflow..."
                  className="bg-card border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors rounded-none resize-none"
                />
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                <Button type="submit" size="lg" className="font-display font-bold rounded-none h-12 px-8 w-full sm:w-auto">
                  Send Request
                </Button>
                <p className="text-xs text-muted-foreground font-mono">
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
