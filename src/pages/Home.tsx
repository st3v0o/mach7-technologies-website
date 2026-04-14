import { useState, FormEvent } from "react";
import { ArrowRight, MapPin, Zap, Users, HardDrive, Database } from "lucide-react";
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
      {/* HERO */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_60%_-20%,_hsl(15_100%_50%_/_0.12),_transparent)] -z-10" />
        <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <div className="flex flex-col gap-7 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-1.5 text-sm font-medium text-primary/90 rounded-full w-fit">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Currently in development
            </div>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08]">
              Every frame.<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">
                Every coordinate.
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed">
              Frame-by-frame GPS tagging, speed-adaptive capture, and expert manual mode with coverage accountability — simple enough for everyone on your team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button asChild size="lg" className="font-display font-semibold group h-13 px-8 text-base">
                <a href="#contact">
                  Request Access
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="font-display font-semibold h-13 px-8 text-base">
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
      <section id="features" className="py-28 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-5">Precision at every level.</h2>
            <p className="text-muted-foreground text-xl leading-relaxed">
              GPS bound to every frame. Adaptive capture rates. Expert accountability. Built for what serious field documentation demands.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-8 border border-border/60 bg-background/60 rounded-lg flex flex-col gap-5">
              <MapPin className="w-9 h-9 text-primary" />
              <h3 className="font-display font-semibold text-2xl">Frame-Level GPS Binding</h3>
              <p className="text-muted-foreground leading-relaxed text-lg">
                Every frame carries its own GPS coordinate. Not a session stamp — the frame. A precise, queryable location for every second of footage.
              </p>
            </div>
            <div className="p-8 border border-border/60 bg-background/60 rounded-lg flex flex-col gap-5">
              <Zap className="w-9 h-9 text-primary" />
              <h3 className="font-display font-semibold text-2xl">Speed-Adaptive Capture</h3>
              <p className="text-muted-foreground leading-relaxed text-lg">
                Dynamic FPS reads your vehicle speed and adjusts in real-time. Consistent spatial coverage at any pace. Manual interval control when you need it.
              </p>
            </div>
            <div className="p-8 border border-border/60 bg-background/60 rounded-lg flex flex-col gap-5">
              <Users className="w-9 h-9 text-primary" />
              <h3 className="font-display font-semibold text-2xl">Expert Mode + Coverage Proof</h3>
              <p className="text-muted-foreground leading-relaxed text-lg">
                Your inspector captures what they're trained to see. The app logs their GPS route. Expert judgment with verifiable coverage accountability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section id="workflow" className="py-28">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 aspect-square md:aspect-video lg:aspect-square w-full overflow-hidden rounded-xl border border-border/40">
              <MapMockup />
            </div>
            <div className="order-1 lg:order-2 flex flex-col gap-12">
              <div>
                <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-5">Two modes. One tool.</h2>
                <p className="text-muted-foreground text-xl leading-relaxed">
                  Systematic coverage sweep or expert-guided documentation — the same app, without compromise.
                </p>
              </div>
              <div className="flex flex-col gap-10">
                <div className="flex gap-5">
                  <div className="w-11 h-11 shrink-0 rounded-full bg-primary/15 border border-primary/30 text-primary flex items-center justify-center font-display text-base font-bold">1</div>
                  <div>
                    <h4 className="font-display font-semibold text-xl mb-2">Choose your mode</h4>
                    <p className="text-muted-foreground text-lg leading-relaxed">Auto for continuous coverage drives. Expert for trained inspectors making deliberate captures. GPS runs from the moment you start.</p>
                  </div>
                </div>
                <div className="flex gap-5">
                  <div className="w-11 h-11 shrink-0 rounded-full bg-primary/15 border border-primary/30 text-primary flex items-center justify-center font-display text-base font-bold">2</div>
                  <div>
                    <h4 className="font-display font-semibold text-xl mb-2">Capture intelligently</h4>
                    <p className="text-muted-foreground text-lg leading-relaxed">Auto mode adjusts FPS to your speed. Expert mode logs your GPS route continuously as you photograph.</p>
                  </div>
                </div>
                <div className="flex gap-5">
                  <div className="w-11 h-11 shrink-0 rounded-full bg-primary/15 border border-primary/30 text-primary flex items-center justify-center font-display text-base font-bold">3</div>
                  <div>
                    <h4 className="font-display font-semibold text-xl mb-2">Verify coverage. Export.</h4>
                    <p className="text-muted-foreground text-lg leading-relaxed">Every frame's location on the map. Spot gaps before you leave. Export GPX tracks or sync to your database.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SPECS */}
      <section id="specs" className="py-28 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-5">Built different. By design.</h2>
            <p className="text-muted-foreground text-xl leading-relaxed">
              Four capabilities. One tool. Purpose-built for serious field documentation.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="border border-border/60 p-8 bg-background/60 rounded-lg">
              <div className="flex items-center gap-2 mb-5">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">1</span>
                <span className="text-sm font-semibold text-foreground/80 tracking-wide">Frame Telemetry</span>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">GPS on every frame and photo — not the session. Every pixel of footage has an exact, retrievable position on Earth.</p>
            </div>
            <div className="border border-border/60 p-8 bg-background/60 rounded-lg">
              <div className="flex items-center gap-2 mb-5">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">2</span>
                <span className="text-sm font-semibold text-foreground/80 tracking-wide">Adaptive FPS</span>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">Vehicle speed drives the frame rate in real-time. No missed coverage. No wasted storage. Fixed interval when you need it.</p>
            </div>
            <div className="border border-border/60 p-8 bg-background/60 rounded-lg">
              <div className="flex items-center gap-2 mb-5">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">3</span>
                <span className="text-sm font-semibold text-foreground/80 tracking-wide">Dual Mode</span>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">Continuous auto capture or deliberate expert photography — same app, same GPS record, full accountability.</p>
            </div>
            <div className="border border-border/60 p-8 bg-background/60 rounded-lg">
              <div className="flex items-center gap-2 mb-5">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">4</span>
                <span className="text-sm font-semibold text-foreground/80 tracking-wide">Flexible Storage</span>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">Local-first. No internet required in the field. Auto-segmented recordings. Sync to your cloud database when ready.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SCREENSHOTS */}
      <ScreenGallery />

      {/* CONTACT */}
      <section id="contact" className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_50%,_hsl(15_100%_50%_/_0.06),_transparent)] -z-10" />
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-12">
            <Database className="w-12 h-12 mx-auto text-primary mb-6" />
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-5">Equip your team.</h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Geospector is in active development. If your organization needs frame-accurate spatial documentation, we want to hear from you.
            </p>
          </div>

          {sent ? (
            <div className="border border-primary/30 bg-primary/8 p-8 text-center rounded-lg">
              <p className="font-display font-semibold text-xl mb-2">Your email client should have opened.</p>
              <p className="text-lg text-muted-foreground">
                If it didn't, email us directly at{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleContact} className="flex flex-col gap-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label htmlFor="contact-name" className="text-sm font-semibold text-foreground/80">Name *</label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your name"
                    className="bg-card border border-border rounded-lg px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="contact-org" className="text-sm font-semibold text-foreground/80">Organization</label>
                  <input
                    id="contact-org"
                    type="text"
                    value={org}
                    onChange={e => setOrg(e.target.value)}
                    placeholder="Company, agency, or group"
                    className="bg-card border border-border rounded-lg px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="contact-message" className="text-sm font-semibold text-foreground/80">Message *</label>
                <textarea
                  id="contact-message"
                  required
                  rows={5}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Describe your use case, team size, and current documentation workflow..."
                  className="bg-card border border-border rounded-lg px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors resize-none"
                />
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                <Button type="submit" size="lg" className="font-display font-semibold h-13 px-8 text-base w-full sm:w-auto">
                  Send Request
                </Button>
                <p className="text-sm text-muted-foreground">
                  Opens your mail client — or email {CONTACT_EMAIL}
                </p>
              </div>
            </form>
          )}

          <p className="mt-12 text-center text-base text-muted-foreground">
            Coming soon to iOS.
          </p>
        </div>
      </section>
    </div>
  );
}
