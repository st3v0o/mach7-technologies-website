import { useEffect, useState } from "react";
import { ArrowRight, Bell, CalendarDays, Fish, Map, Mountain, Navigation, ShieldCheck, Tent, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OUTSIDEY_APP_STORE_URL, OUTSIDEY_SITE_URL } from "@/lib/links";

const SHOTS = [
  { src: "/outsidey/1-map.jpg", label: "Every trail, campground and ramp, rated for today" },
  { src: "/outsidey/2-detail.jpg", label: "The reasons behind each rating, with sources" },
  { src: "/outsidey/3-weekend.jpg", label: "Plan the weekend: Saturday and Sunday outlooks" },
  { src: "/outsidey/4-closed.jpg", label: "Closures from parks, forests and agencies" },
  { src: "/outsidey/5-fish.jpg", label: "Trout stocking and river conditions" },
  { src: "/outsidey/6-water.jpg", label: "River levels, tides and water quality" },
];

// The states live in the app today (the site's daily build adds them one at a time).
const STATES = ["Virginia", "Maryland", "Delaware", "Connecticut", "Washington DC", "West Virginia", "North Carolina", "Tennessee", "Kentucky", "Alabama", "Georgia", "Illinois", "Florida", "Arizona", "Colorado", "California", "Alaska", "Maine", "Rhode Island", "Hawaii"];

function OutsideyPhone() {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCurrent((c) => (c + 1) % SHOTS.length), 3500);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="w-full flex flex-col items-center gap-5 select-none">
      <div
        className="relative w-full rounded-[3rem] bg-[#1c1c20] p-[10px]"
        style={{ boxShadow: "0 40px 100px rgba(0,0,0,0.65), 0 0 0 1px #2c2c32, inset 0 0 0 1px #3a3a42, 0 0 80px rgba(45,212,191,0.10)" }}
      >
        <div className="relative overflow-hidden rounded-[2.4rem] bg-black" style={{ aspectRatio: "1320 / 2868" }}>
          {SHOTS.map((s, i) => (
            <img
              key={s.src}
              src={s.src}
              alt={i === current ? s.label : ""}
              aria-hidden={i !== current}
              loading={i === 0 ? "eager" : "lazy"}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: i === current ? 1 : 0, transition: "opacity 1s ease-in-out" }}
            />
          ))}
        </div>
      </div>
      <p className="text-sm text-muted-foreground text-center min-h-[2.5rem] max-w-[260px]">{SHOTS[current].label}</p>
    </div>
  );
}

const FEATURES = [
  { icon: ShieldCheck, title: "Good to go, or not today", text: "Every trail, campground, fishing spot and boat ramp gets a rating each morning — Good to go, Go with care or Not today — with every reason and a link to its source." },
  { icon: Mountain, title: "Closures before you drive", text: "Park, forest and refuge closures, hunting seasons on public land, burn bans and road closures, read every morning from the agencies that post them." },
  { icon: Waves, title: "Rivers, lakes and tides", text: "Live river levels and flows, lake levels against normal pool, tides at coastal ramps, beach and algae advisories, and the days after heavy rain when swimming isn't advised." },
  { icon: Fish, title: "Trout stocking", text: "When and where the state last stocked, by stream and lake, with the regulations in plain words — catch and release, delayed harvest, special limits." },
  { icon: CalendarDays, title: "Plan the weekend", text: "Switch to Saturday or Sunday for that day's forecast, the hour storms are likely to start, closures and hunting days. Sunset shows when you'd run out of light." },
  { icon: Navigation, title: "Explore nearby", text: "Everything within a walk, bike ride or drive of you — or any address or GPS point — by real route distance and time. Save the list as a trip." },
];

export default function Outsidey() {
  return (
    <div className="flex flex-col">
      {/* HERO */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_60%_-20%,_hsl(172_66%_50%_/_0.12),_transparent)] -z-10" />
        <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <div className="flex flex-col gap-7 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-gps/10 border border-gps/25 px-4 py-1.5 text-sm font-semibold tracking-wide text-gps rounded-full w-fit">
              <span className="w-2 h-2 rounded-full bg-gps animate-pulse" />
              Free on the App Store
            </div>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08]">
              Where can I go<br />
              <span className="text-primary">today?</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed">
              Before you drive an hour to a trailhead, find out whether it's closed, flooded or in the middle of deer season. Outsidey checks the sources you'd otherwise check one at a time — every morning.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button asChild size="lg" className="font-display font-semibold group h-13 px-8 text-base">
                <a href={OUTSIDEY_APP_STORE_URL} target="_blank" rel="noopener noreferrer">
                  Download on the App Store
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="font-display font-semibold h-13 px-8 text-base">
                <a href={OUTSIDEY_SITE_URL} target="_blank" rel="noopener noreferrer">
                  <Map className="mr-2 h-4 w-4" />
                  Open the web map
                </a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">No account, no ads, no tracking. Your location stays on your phone.</p>
          </div>
          <div className="mx-auto w-full lg:pt-6" style={{ maxWidth: "340px" }}>
            <OutsideyPhone />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-28 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-5">Everything that decides your day out.</h2>
            <p className="text-muted-foreground text-xl leading-relaxed">
              Hikes, campgrounds, trout streams and river access, each checked against the agencies that manage them.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="p-8 border border-border/60 bg-background/60 rounded-lg flex flex-col gap-5">
                <Icon className="w-9 h-9 text-primary" />
                <h3 className="font-display font-semibold text-2xl">{title}</h3>
                <p className="text-muted-foreground leading-relaxed text-lg">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-28">
        <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-16 items-center">
          <div className="flex flex-col gap-12">
            <div>
              <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-5">Checked every morning.</h2>
              <p className="text-muted-foreground text-xl leading-relaxed">
                Hundreds of public sources, read before you wake up, so you can decide in a glance.
              </p>
            </div>
            <div className="flex flex-col gap-10">
              {[
                ["Read every source", "National Weather Service forecasts and alerts, USGS river gauges, Corps of Engineers lakes, National Park Service and Forest Service alerts, state parks, wildlife agencies, wildfires, air quality and county park notices."],
                ["Rate every place", "Each trail, campground, fishing spot and ramp is rated Good to go, Go with care or Not today — with the reasons and a link to where each came from."],
                ["Tell you what changed", "Save a place and get one notification in the morning when something changes: a trail closes, a stream is stocked, a river comes up. Saved places work as Home Screen widgets too."],
              ].map(([title, text], i) => (
                <div key={title} className="flex gap-5">
                  <div className="w-11 h-11 shrink-0 rounded-full bg-primary/15 border border-primary/30 text-primary flex items-center justify-center font-display text-base font-bold">{i + 1}</div>
                  <div>
                    <h4 className="font-display font-semibold text-xl mb-2">{title}</h4>
                    <p className="text-muted-foreground text-lg leading-relaxed">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto w-full">
            {SHOTS.slice(1, 3).map((s) => (
              <img key={s.src} src={s.src} alt={s.label} loading="lazy" className="w-full rounded-[1.6rem] border border-border/60 shadow-2xl" />
            ))}
          </div>
        </div>
      </section>

      {/* STATES */}
      <section id="states" className="py-28 bg-card border-y border-border">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto mb-12">
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-5">{STATES.length} states and growing.</h2>
            <p className="text-muted-foreground text-xl leading-relaxed">
              Each state is checked against its own agencies before it goes live — on the way to all 50.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {STATES.map((s) => (
              <span key={s} className="px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-base font-medium">{s}</span>
            ))}
          </div>
          <div className="mt-14 grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              ["28,000+", "trails and parks"],
              ["1,300", "campgrounds"],
              ["7,900", "fishing spots and water accesses"],
            ].map(([n, label]) => (
              <div key={label} className="p-6 border border-border/60 bg-background/60 rounded-lg">
                <div className="font-display text-4xl font-bold text-primary">{n}</div>
                <div className="text-muted-foreground mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SCREENSHOTS */}
      <section id="screenshots" className="py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mb-14">
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-5">See it in the app.</h2>
          </div>
          <div className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4">
            {SHOTS.map((s) => (
              <figure key={s.src} className="snap-start shrink-0 w-[220px] sm:w-[250px]">
                <img src={s.src} alt={s.label} loading="lazy" className="w-full rounded-[1.6rem] border border-border/60" />
                <figcaption className="text-sm text-muted-foreground mt-3">{s.label}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_50%,_hsl(172_66%_50%_/_0.08),_transparent)] -z-10" />
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <Bell className="w-12 h-12 mx-auto text-primary mb-6" />
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-5">Know before you go.</h2>
          <p className="text-xl text-muted-foreground leading-relaxed mb-10">
            Free on iPhone. Save the places you love and Outsidey tells you when something changes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="font-display font-semibold group h-13 px-8 text-base">
              <a href={OUTSIDEY_APP_STORE_URL} target="_blank" rel="noopener noreferrer">
                Download on the App Store
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="font-display font-semibold h-13 px-8 text-base">
              <a href={OUTSIDEY_SITE_URL} target="_blank" rel="noopener noreferrer">
                <Tent className="mr-2 h-4 w-4" />
                Try the web map
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
