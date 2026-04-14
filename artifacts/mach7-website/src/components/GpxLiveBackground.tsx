import { useEffect, useRef } from "react";

interface Pt {
  x: number;
  y: number;
}

interface Walker {
  x: number;
  y: number;
  heading: number;
  speed: number;
  trail: Pt[];
  dots: Pt[];
  dotCounter: number;
  dotInterval: number;
  life: number;
  maxLife: number;
  fadeIn: number;
  fadeOut: number;
  alpha: number;
  trailLength: number;
  delay: number;
}

interface RoadSeg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  mx: number;
  my: number;
  lineWidth: number;
  maxGlow: number;
  glow: number;
}

const WALKER_COUNT = 3;
const BASE_COLOR = "255, 85, 0";
const ILLUM_RADIUS = 150;
const ILLUM_R_SQ = ILLUM_RADIUS * ILLUM_RADIUS;
const GLOW_DECAY = 0.982;

function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return ((s >>> 0) / 0x100000000);
  };
}

function generateRoads(w: number, h: number): RoadSeg[] {
  const rng = makeRng(0x4d337a1b);
  const segs: RoadSeg[] = [];

  const gsX = 90 + rng() * 40;
  const gsY = 90 + rng() * 40;
  const cols = Math.ceil(w / gsX) + 2;
  const rows = Math.ceil(h / gsY) + 2;

  const nodes: Pt[][] = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      x: (c - 0.5) * gsX + (rng() - 0.5) * 22,
      y: (r - 0.5) * gsY + (rng() - 0.5) * 22,
    }))
  );

  function push(x1: number, y1: number, x2: number, y2: number, lw: number, mg: number) {
    segs.push({ x1, y1, x2, y2, mx: (x1 + x2) / 2, my: (y1 + y2) / 2, lineWidth: lw, maxGlow: mg, glow: 0 });
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++) {
      if (rng() > 0.25) {
        const a = nodes[r][c], b = nodes[r][c + 1];
        const major = rng() > 0.62;
        push(a.x, a.y, b.x, b.y, major ? 1.5 : 1.0, major ? 0.22 : 0.14);
      }
    }
  }

  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols; c++) {
      if (rng() > 0.25) {
        const a = nodes[r][c], b = nodes[r + 1][c];
        const major = rng() > 0.62;
        push(a.x, a.y, b.x, b.y, major ? 1.5 : 1.0, major ? 0.22 : 0.14);
      }
    }
  }

  for (let i = 0; i < 14; i++) {
    const sx = rng() * w;
    const sy = rng() * h;
    const angle = rng() * Math.PI * 2;
    const len = 100 + rng() * 220;
    push(sx, sy, sx + Math.cos(angle) * len, sy + Math.sin(angle) * len, 0.8, 0.10);
  }

  return segs;
}

function spawnWalker(w: number, h: number): Walker {
  const edge = Math.floor(Math.random() * 4);
  let x = 0, y = 0, heading = 0;

  if (edge === 0)      { x = Math.random() * w; y = 0;             heading = Math.PI * 0.25 + Math.random() * Math.PI * 0.5; }
  else if (edge === 1) { x = w;                  y = Math.random() * h; heading = Math.PI * 0.75 + Math.random() * Math.PI * 0.5; }
  else if (edge === 2) { x = Math.random() * w; y = h;             heading = Math.PI * 1.25 + Math.random() * Math.PI * 0.5; }
  else                 { x = 0;                  y = Math.random() * h; heading = Math.PI * 1.75 + Math.random() * Math.PI * 0.5; }

  const maxLife = 600 + Math.random() * 500;
  const fadeIn  = 80  + Math.random() * 60;
  const fadeOut = 80  + Math.random() * 60;

  return {
    x, y, heading,
    speed:       1.2 + Math.random() * 1.0,
    trail:       [{ x, y }],
    dots:        [],
    dotCounter:  0,
    dotInterval: 18 + Math.floor(Math.random() * 12),
    life: 0,
    delay: Math.floor(Math.random() * 90),
    maxLife, fadeIn, fadeOut,
    alpha: 0,
    trailLength: 90 + Math.floor(Math.random() * 60),
  };
}

function stepWalker(walker: Walker, cw: number, ch: number) {
  if (walker.delay > 0) { walker.delay--; return; }
  walker.life++;

  if (walker.life < walker.fadeIn) {
    walker.alpha = walker.life / walker.fadeIn;
  } else if (walker.life > walker.maxLife - walker.fadeOut) {
    walker.alpha = Math.max(0, (walker.maxLife - walker.life) / walker.fadeOut);
  } else {
    walker.alpha = 1;
  }

  walker.heading += (Math.random() - 0.5) * 0.055;

  const dx = cw / 2 - walker.x;
  const dy = ch / 2 - walker.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > 0) {
    let diff = Math.atan2(dy, dx) - walker.heading;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    walker.heading += diff * 0.004;
  }

  walker.x += Math.cos(walker.heading) * walker.speed;
  walker.y += Math.sin(walker.heading) * walker.speed;

  walker.trail.push({ x: walker.x, y: walker.y });
  if (walker.trail.length > walker.trailLength) walker.trail.shift();

  walker.dotCounter++;
  if (walker.dotCounter >= walker.dotInterval) {
    walker.dotCounter = 0;
    walker.dots.push({ x: walker.x, y: walker.y });
    if (walker.dots.length > walker.trailLength) walker.dots.shift();
  }
}

function drawWalker(ctx: CanvasRenderingContext2D, walker: Walker) {
  const len = walker.trail.length;
  if (len < 2) return;

  for (let i = 1; i < len; i++) {
    const t = i / len;
    ctx.beginPath();
    ctx.moveTo(walker.trail[i - 1].x, walker.trail[i - 1].y);
    ctx.lineTo(walker.trail[i].x, walker.trail[i].y);
    ctx.strokeStyle = `rgba(${BASE_COLOR},${(t * t * walker.alpha * 0.13).toFixed(3)})`;
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  for (let i = 0; i < walker.dots.length; i++) {
    const t = (i + 1) / walker.dots.length;
    const r = i === walker.dots.length - 1 ? 3.5 : 2.2;
    ctx.beginPath();
    ctx.arc(walker.dots[i].x, walker.dots[i].y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${BASE_COLOR},${(t * walker.alpha * 0.14).toFixed(3)})`;
    ctx.fill();
  }
}

export function GpxLiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let walkers: Walker[] = [];
    let roads: RoadSeg[] = [];

    function init() {
      canvas!.width  = window.innerWidth;
      canvas!.height = window.innerHeight;
      roads = generateRoads(canvas!.width, canvas!.height);
    }

    init();

    for (let i = 0; i < WALKER_COUNT; i++) {
      const walker = spawnWalker(canvas.width, canvas.height);
      walker.life = Math.floor((walker.maxLife / WALKER_COUNT) * i * 0.7);
      walkers.push(walker);
    }

    function frame() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      walkers = walkers.map((walker) => {
        stepWalker(walker, canvas.width, canvas.height);
        return walker.life >= walker.maxLife
          ? spawnWalker(canvas.width, canvas.height)
          : walker;
      });

      for (const road of roads) {
        let maxBoost = 0;
        for (const walker of walkers) {
          if (walker.delay > 0 || walker.alpha < 0.01) continue;
          const dx = walker.x - road.mx;
          const dy = walker.y - road.my;
          const dSq = dx * dx + dy * dy;
          if (dSq < ILLUM_R_SQ) {
            const boost = (1 - Math.sqrt(dSq) / ILLUM_RADIUS) * walker.alpha;
            if (boost > maxBoost) maxBoost = boost;
          }
        }
        road.glow = Math.max(road.glow * GLOW_DECAY, maxBoost);
      }

      ctx.lineCap = "round";
      for (const road of roads) {
        if (road.glow < 0.008) continue;
        const alpha = road.glow * road.maxGlow;
        ctx.beginPath();
        ctx.moveTo(road.x1, road.y1);
        ctx.lineTo(road.x2, road.y2);
        ctx.strokeStyle = `rgba(${BASE_COLOR},${alpha.toFixed(3)})`;
        ctx.lineWidth = road.lineWidth;
        ctx.stroke();
      }

      for (const walker of walkers) drawWalker(ctx, walker);

      animId = requestAnimationFrame(frame);
    }

    animId = requestAnimationFrame(frame);

    const onResize = () => {
      init();
      walkers = walkers.map(() => spawnWalker(canvas.width, canvas.height));
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", display: "block" }}
      aria-hidden="true"
    />
  );
}
