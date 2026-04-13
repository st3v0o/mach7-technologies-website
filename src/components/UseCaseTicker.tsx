const USE_CASES = [
  "fire hydrant inventory",
  "invasive species mapping",
  "city mural catalog",
  "street sign condition audit",
  "utility pole inspection",
  "pothole mapping",
  "storm drain documentation",
  "road shoulder condition survey",
  "bridge infrastructure walkthrough",
  "tree canopy inventory",
  "graffiti documentation",
  "fence line survey",
  "parking meter condition log",
  "bus stop documentation",
  "property boundary walk",
  "flood zone mapping",
  "construction progress tracking",
  "manhole cover catalog",
  "crosswalk condition audit",
  "guard rail inspection",
  "street light inventory",
  "building facade survey",
  "wetland boundary delineation",
  "trail condition assessment",
  "wildlife habitat survey",
  "archaeological site walk",
  "historical structure documentation",
  "pipeline right-of-way patrol",
  "powerline corridor survey",
  "railroad crossing inventory",
  "school zone safety audit",
  "ADA accessibility compliance walk",
  "parking lot condition survey",
  "cemetery asset mapping",
  "athletic field equipment inventory",
  "park asset condition log",
  "shoreline erosion tracking",
  "utility valve location survey",
  "speed bump inventory",
  "drainage inlet mapping",
  "retaining wall condition audit",
  "culvert documentation",
  "irrigation system survey",
  "public art catalog",
  "landmark documentation",
  "erosion control assessment",
  "quarry boundary mapping",
  "solar panel array documentation",
  "landfill boundary survey",
  "environmental compliance walk",
  "campus infrastructure log",
  "port facility inspection",
  "marina dock condition survey",
  "wildfire fuel load assessment",
  "post-disaster site documentation",
  "hurricane damage mapping",
  "flood recovery progress tracking",
  "landslide zone documentation",
  "coastal erosion monitoring",
  "road median condition survey",
  "highway interchange mapping",
  "bike lane condition audit",
  "pedestrian path survey",
  "agricultural field assessment",
  "vineyard row-by-row inspection",
  "orchard condition mapping",
  "livestock fence survey",
  "irrigation canal patrol",
  "row crop field condition log",
  "aquifer recharge zone survey",
  "riparian buffer survey",
  "floodplain vegetation mapping",
  "gas main corridor patrol",
  "water main leak detection walk",
  "sewer line condition documentation",
  "fiber optic route survey",
  "cellular tower site documentation",
  "utility easement compliance patrol",
  "code enforcement walk",
  "zoning boundary documentation",
  "demolition site progress",
  "excavation progress mapping",
  "soil contamination survey",
  "hazmat site boundary patrol",
  "underground storage tank location",
  "brownfield site assessment",
  "site grading progress log",
  "concrete pour documentation",
  "rooftop equipment inventory",
  "HVAC unit location survey",
  "EV charging station catalog",
  "generator pad documentation",
  "fuel tank farm mapping",
  "transformer pad inventory",
  "substation boundary patrol",
  "road right-of-way survey",
  "encroachment documentation",
  "building permit compliance walk",
  "snow removal route documentation",
  "ice storm damage survey",
  "tornado damage path log",
  "avalanche zone boundary mapping",
  "reef condition survey",
  "post-fire recovery mapping",
  "military perimeter patrol log",
  "airport perimeter documentation",
  "ski resort trail condition survey",
  "national park boundary walk",
  "wetland delineation compliance",
  "conservation easement patrol",
  "stream bank erosion survey",
  "beach nourishment progress",
  "dune stabilization survey",
  "mine site perimeter documentation",
  "tailings pond boundary patrol",
  "well pad site documentation",
  "wind turbine access road survey",
  "solar farm perimeter patrol",
  "transmission line patrol",
  "oil pipeline right-of-way walk",
  "railroad ballast condition survey",
  "bridge deck condition log",
  "tunnel portal inspection",
  "retaining structure documentation",
  "drainage ditch survey",
  "levee condition patrol",
  "dam toe inspection",
  "reservoir shoreline survey",
  "boat launch ramp condition",
  "fishing pier documentation",
  "trail head signage inventory",
  "campground site condition log",
  "fire tower access road survey",
  "communication tower base inspection",
  "wastewater treatment site walk",
  "water tower condition documentation",
  "pump station access survey",
  "lift station condition log",
  "detention basin inspection",
  "bioretention cell survey",
  "green roof condition documentation",
  "photovoltaic canopy inspection",
  "microwave relay path patrol",
  "data center perimeter survey",
  "evidence documentation",
  "accident scene mapping",
  "crime scene documentation",
  "search and rescue grid",
  "disaster relief logistics mapping",
  "evacuation route survey",
];

const TRIPLED = [...USE_CASES, ...USE_CASES, ...USE_CASES];

const ACCENT_INDICES = new Set([2, 9, 17, 24, 31, 38, 46, 53, 61, 68, 76, 83, 90, 98, 105, 112, 120, 127]);

export function UseCaseTicker() {
  return (
    <section className="py-16 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 border border-border/40 bg-card/40 px-3 py-1 text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Use cases
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
            height: "480px",
            maxWidth: "520px",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
          }}
        >
          <style>{`
            @keyframes ticker-scroll {
              0%   { transform: translateY(0); }
              100% { transform: translateY(-33.333%); }
            }
            .ticker-track {
              animation: ticker-scroll 90s linear infinite;
            }
          `}</style>

          <div className="ticker-track">
            {TRIPLED.map((text, i) => {
              const isAccent = ACCENT_INDICES.has(i % USE_CASES.length);
              return (
                <div
                  key={i}
                  className="py-[7px] text-center leading-tight"
                >
                  <span
                    className="font-mono text-sm uppercase tracking-[0.15em]"
                    style={{
                      color: isAccent
                        ? "hsl(var(--primary))"
                        : "hsl(var(--muted-foreground))",
                      fontWeight: isAccent ? 600 : 400,
                      opacity: isAccent ? 1 : 0.65,
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
