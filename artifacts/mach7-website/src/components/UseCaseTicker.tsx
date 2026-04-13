import { useMemo } from "react";

const USE_CASES = [
  // ── Municipal / City Government ─────────────────────────────────────────────
  "fire hydrant inventory",
  "fire hydrant paint condition audit",
  "fire hydrant access clearance survey",
  "sidewalk crack documentation",
  "sidewalk heave condition survey",
  "sidewalk gap inventory",
  "ADA curb cut compliance audit",
  "wheelchair ramp condition log",
  "curb ramp landing condition",
  "street tree damage assessment",
  "tree pit condition survey",
  "tree grate inventory",
  "planting strip condition audit",
  "street light outage log",
  "street light inventory",
  "banner bracket inventory",
  "park bench condition log",
  "park trash can location survey",
  "recycling bin inventory",
  "public restroom condition audit",
  "drinking fountain condition log",
  "bus shelter damage documentation",
  "transit stop accessibility audit",
  "parking restriction sign inventory",
  "parking meter condition log",
  "abandoned vehicle documentation",
  "shopping cart litter survey",
  "illegal dumping hotspot mapping",
  "graffiti recurrence tracking",
  "alley condition survey",
  "dead end sign inventory",
  "vacant lot condition documentation",
  "vacant building survey",
  "boarded window log",
  "overgrown property documentation",
  "snow plow damage log",
  "emergency shelter location mapping",
  "food bank access route survey",
  "community garden plot survey",
  "pollinator garden documentation",
  "community notice board inventory",
  "code violation evidence log",
  "housing blight documentation",
  "junk vehicle complaint log",
  "fence height violation log",
  "accessible parking violation log",
  "heat island documentation",
  "cool refuge location survey",

  // ── DOT / Transportation ─────────────────────────────────────────────────────
  "pothole mapping",
  "pavement distress index survey",
  "alligator cracking documentation",
  "linear cracking survey",
  "block cracking documentation",
  "rutting condition log",
  "raveling surface survey",
  "pavement edge break documentation",
  "road base failure log",
  "road shoulder condition survey",
  "shoulder drop-off documentation",
  "pavement marking fading survey",
  "stop bar condition audit",
  "crosshatch marking condition log",
  "lane line retroreflectivity check",
  "school crossing guard post survey",
  "traffic signal head inventory",
  "pedestrian push button inventory",
  "countdown signal compliance survey",
  "rumble strip condition audit",
  "passing zone sign inventory",
  "no-passing zone documentation",
  "median barrier condition log",
  "cable barrier damage survey",
  "guardrail inspection",
  "guardrail end treatment survey",
  "bridge condition walkthrough",
  "bridge deck condition log",
  "bridge scour documentation",
  "bridge bearing inspection",
  "expansion joint condition survey",
  "approach slab condition audit",
  "roadway lighting outage log",
  "rest area condition audit",
  "weigh station condition survey",
  "mile marker inventory",
  "emergency call box location survey",
  "road closure sign placement",
  "detour sign documentation",
  "construction zone condition survey",
  "crash attenuator location log",
  "delineator post survey",
  "raised pavement marker condition",
  "high friction surface treatment log",
  "road diet documentation",
  "ADA ramp condition audit",
  "driveway apron condition survey",
  "culvert condition documentation",
  "drainage inlet mapping",
  "storm drain documentation",
  "road median condition survey",
  "highway interchange mapping",
  "bike lane condition audit",
  "bike rack inventory",
  "pedestrian path survey",
  "crosswalk condition audit",
  "school zone safety audit",
  "railroad crossing inventory",
  "speed bump inventory",

  // ── Environmental / Activist ─────────────────────────────────────────────────
  "invasive species mapping",
  "kudzu infestation survey",
  "Japanese knotweed documentation",
  "purple loosestrife mapping",
  "garlic mustard survey",
  "English ivy infestation log",
  "mile-a-minute vine survey",
  "phragmites control documentation",
  "buckthorn removal tracking",
  "autumn olive survey",
  "water hyacinth mapping",
  "emerald ash borer detection walk",
  "hemlock woolly adelgid survey",
  "spotted lanternfly sighting log",
  "gypsy moth defoliation survey",
  "monarch waystation documentation",
  "pollinator habitat survey",
  "bird nesting site mapping",
  "raptor nest documentation",
  "amphibian crossing survey",
  "wetland boundary delineation",
  "wetland delineation compliance",
  "riparian buffer survey",
  "floodplain vegetation mapping",
  "stream bank erosion survey",
  "shoreline erosion tracking",
  "coastal erosion monitoring",
  "gully formation mapping",
  "rill erosion documentation",
  "streambed condition assessment",
  "algal bloom monitoring point",
  "water body litter survey",
  "lakeshore erosion log",
  "river cut bank survey",
  "flood zone mapping",
  "flood recovery progress tracking",
  "post-disaster site documentation",
  "wildfire fuel load assessment",
  "post-fire recovery mapping",
  "landslide zone documentation",
  "beach nourishment progress",
  "dune stabilization survey",
  "illegal dumping evidence log",
  "tire dump site documentation",
  "electronics waste site survey",
  "fuel drum abandonment log",
  "pollution discharge point mapping",
  "stormwater outfall condition",
  "illicit discharge detection walk",
  "combined sewer overflow outlet",
  "contaminated soil boundary survey",
  "groundwater monitoring well log",
  "air quality monitoring point",
  "tree canopy inventory",
  "tree equity mapping",
  "urban forest condition survey",
  "park equity documentation",
  "wildlife habitat survey",
  "wildlife corridor documentation",
  "deer crossing hotspot survey",
  "coyote activity log",

  // ── Community Organizing ─────────────────────────────────────────────────────
  "crumbling infrastructure evidence",
  "missing sidewalk segment survey",
  "traffic calming need documentation",
  "speeding hotspot survey",
  "pedestrian injury hotspot mapping",
  "food desert corner store survey",
  "fresh produce access mapping",
  "community garden need survey",
  "neighborhood meeting location survey",
  "bus route gap documentation",
  "transit shelter condition audit",
  "shared scooter station condition",
  "city mural catalog",
  "community mural condition audit",
  "public art documentation",
  "public piano condition log",
  "human rights marker mapping",
  "historical plaque inventory",
  "civil rights site documentation",
  "heritage building survey",
  "historic district walkthrough",
  "landmark documentation",
  "memorial condition log",

  // ── Utilities & Infrastructure ───────────────────────────────────────────────
  "utility pole inspection",
  "utility pole attachment inventory",
  "transformer pad inventory",
  "substation boundary patrol",
  "transmission line patrol",
  "powerline corridor survey",
  "gas main corridor patrol",
  "gas valve location survey",
  "water main leak detection walk",
  "water main valve inventory",
  "sewer line condition documentation",
  "manhole cover catalog",
  "manhole condition survey",
  "fiber optic route survey",
  "cellular tower site documentation",
  "utility easement compliance patrol",
  "underground storage tank location",
  "utility valve location survey",
  "retaining wall condition audit",
  "retaining structure documentation",
  "drainage ditch survey",
  "levee condition patrol",
  "dam toe inspection",
  "reservoir shoreline survey",
  "pump station access survey",
  "lift station condition log",
  "detention basin inspection",
  "bioretention cell survey",
  "pipeline right-of-way patrol",
  "oil pipeline right-of-way walk",
  "railroad ballast condition survey",
  "railroad crossing condition log",
  "wastewater treatment site survey",
  "water tower condition documentation",
  "EV charging station catalog",
  "generator pad documentation",
  "fuel tank farm mapping",
  "rooftop equipment inventory",
  "HVAC unit location survey",
  "solar panel array documentation",
  "solar farm perimeter patrol",
  "wind turbine access road survey",
  "microwave relay path patrol",

  // ── Construction & Development ───────────────────────────────────────────────
  "construction progress tracking",
  "demolition site progress log",
  "excavation progress mapping",
  "site grading progress documentation",
  "concrete pour documentation",
  "structural steel progress log",
  "building permit compliance walk",
  "zoning boundary documentation",
  "code enforcement walk",
  "encroachment documentation",
  "road right-of-way survey",
  "property boundary walk",
  "brownfield site assessment",
  "soil contamination survey",
  "hazmat site boundary patrol",
  "building facade survey",
  "campus infrastructure log",

  // ── Parks, Recreation & Open Space ──────────────────────────────────────────
  "park asset condition log",
  "athletic field equipment inventory",
  "playground equipment condition",
  "splash pad condition survey",
  "tennis court condition log",
  "basketball court condition",
  "skate park condition audit",
  "trail condition assessment",
  "trailhead signage inventory",
  "campground site condition log",
  "boat launch ramp condition",
  "fishing pier documentation",
  "marina dock condition survey",
  "kayak launch pad condition",
  "canoe portage condition",
  "equestrian trail condition",
  "mountain bike trail feature log",
  "disc golf course condition",
  "dog park condition survey",
  "off-leash area boundary survey",
  "cemetery asset mapping",
  "athletic field drainage survey",
  "ski resort trail condition audit",
  "national park boundary walk",

  // ── Public Safety & Emergency Management ─────────────────────────────────────
  "defibrillator location documentation",
  "lifeguard station condition",
  "sharps container location survey",
  "needle cleanup site documentation",
  "fire tower access road survey",
  "hurricane damage mapping",
  "tornado damage path documentation",
  "ice storm damage survey",
  "avalanche zone boundary mapping",
  "earthquake damage log",
  "disaster relief logistics mapping",
  "evacuation route survey",
  "search and rescue grid documentation",
  "accident scene mapping",
  "evidence documentation",
  "sandbagging station location",
  "emergency call box location",
  "hazmat spill perimeter",

  // ── Agriculture & Land Management ───────────────────────────────────────────
  "agricultural field assessment",
  "vineyard row-by-row inspection",
  "orchard condition mapping",
  "livestock fence survey",
  "irrigation canal patrol",
  "row crop field condition log",
  "irrigation system survey",
  "aquifer recharge zone survey",
  "well pad site documentation",
  "soil erosion survey",
  "conservation easement patrol",
  "quarry boundary mapping",
  "mine site perimeter documentation",
  "tailings pond boundary patrol",

  // ── Environment & Research ───────────────────────────────────────────────────
  "reef condition survey",
  "archaeological site walk",
  "experimental plot condition log",
  "field research site documentation",
  "monitoring well location log",
  "watershed boundary survey",
  "amphibian pond condition",
  "bird count transect walk",
  "bear smart waste station location",
  "geocache site documentation",
  "snow course station condition",
  "glacier terminus survey",

  // ── Specialized & Niche ──────────────────────────────────────────────────────
  "portable toilet condition survey",
  "outdoor venue perimeter survey",
  "farmers market stall condition",
  "campus accessibility survey",
  "historical structure documentation",
  "tunnle portal inspection",
  "bridge infrastructure walkthrough",
  "airport perimeter documentation",
  "port facility inspection",
  "military perimeter patrol log",
  "data center perimeter survey",
  "communication tower base inspection",
  "environmental compliance walk",
  "landfill boundary survey",
];

export function UseCaseTicker() {
  // Negative delay starts the animation mid-cycle so each page load begins at a
  // different scroll position — seamless since the list is tripled.
  const animationDelay = useMemo(
    () => `-${(Math.random() * 120).toFixed(2)}s`,
    []
  );

  // Scatter orange accent highlights roughly every 7 items
  const accentSet = useMemo(() => {
    const s = new Set<number>();
    for (let i = 2; i < USE_CASES.length; i += 7) s.add(i);
    return s;
  }, []);

  const tripled = useMemo(
    () => [...USE_CASES, ...USE_CASES, ...USE_CASES],
    []
  );

  return (
    <section className="py-16 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 border border-border/40 bg-card/40 px-3 py-1 text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Endless use cases
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
            If it has a location,<br />
            <span className="text-primary">you can document it.</span>
          </h2>
        </div>

        {/* Ticker window */}
        <div
          className="relative mx-auto overflow-hidden"
          style={{
            height: "520px",
            maxWidth: "560px",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 16%, black 84%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 16%, black 84%, transparent 100%)",
          }}
        >
          <style>{`
            @keyframes ticker-up {
              0%   { transform: translateY(0); }
              100% { transform: translateY(-33.333%); }
            }
            .ticker-track {
              animation: ticker-up 120s linear infinite;
            }
          `}</style>

          <div
            className="ticker-track"
            style={{ animationDelay }}
          >
            {tripled.map((text, i) => {
              const isAccent = accentSet.has(i % USE_CASES.length);
              return (
                <div key={i} className="py-[6px] text-center leading-tight select-none">
                  <span
                    className="font-mono text-[13px] uppercase tracking-[0.18em]"
                    style={{
                      color: isAccent
                        ? "hsl(var(--primary))"
                        : "hsl(var(--muted-foreground))",
                      fontWeight: isAccent ? 600 : 400,
                      opacity: isAccent ? 1 : 0.6,
                    }}
                  >
                    {text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
