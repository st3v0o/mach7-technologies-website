import { useEffect, useRef } from "react";

interface TrailPoint {
  x: number;
  y: number;
}

interface Walker {
  x: number;
  y: number;
  heading: number;
  speed: number;
  trail: TrailPoint[];
  dots: TrailPoint[];
  dotCounter: number;
  dotInterval: number;
  life: number;
  maxLife: number;
  fadeIn: number;
  fadeOut: number;
  alpha: number;
  trailLength: number;
}

const WALKER_COUNT = 3;
const BASE_COLOR = "255, 85, 0";

function spawnWalker(w: number, h: number): Walker {
  const edge = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;
  let heading = 0;

  if (edge === 0) {
    x = Math.random() * w;
    y = 0;
    heading = Math.PI * 0.25 + Math.random() * Math.PI * 0.5;
  } else if (edge === 1) {
    x = w;
    y = Math.random() * h;
    heading = Math.PI * 0.75 + Math.random() * Math.PI * 0.5;
  } else if (edge === 2) {
    x = Math.random() * w;
    y = h;
    heading = Math.PI * 1.25 + Math.random() * Math.PI * 0.5;
  } else {
    x = 0;
    y = Math.random() * h;
    heading = Math.PI * 1.75 + Math.random() * Math.PI * 0.5;
  }

  const maxLife = 600 + Math.random() * 500;
  const fadeIn = 80 + Math.random() * 60;
  const fadeOut = 80 + Math.random() * 60;
  const trailLength = 90 + Math.floor(Math.random() * 60);

  return {
    x,
    y,
    heading,
    speed: 1.2 + Math.random() * 1.0,
    trail: [{ x, y }],
    dots: [],
    dotCounter: 0,
    dotInterval: 18 + Math.floor(Math.random() * 12),
    life: 0,
    maxLife,
    fadeIn,
    fadeOut,
    alpha: 0,
    trailLength,
  };
}

function stepWalker(w: Walker, canvasW: number, canvasH: number) {
  w.life += 1;

  if (w.life < w.fadeIn) {
    w.alpha = w.life / w.fadeIn;
  } else if (w.life > w.maxLife - w.fadeOut) {
    w.alpha = Math.max(0, (w.maxLife - w.life) / w.fadeOut);
  } else {
    w.alpha = 1;
  }

  const drift = (Math.random() - 0.5) * 0.055;
  w.heading += drift;

  const bias = 0.004;
  const cx = canvasW / 2;
  const cy = canvasH / 2;
  const dx = cx - w.x;
  const dy = cy - w.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > 0) {
    const targetAngle = Math.atan2(dy, dx);
    let angleDiff = targetAngle - w.heading;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    w.heading += angleDiff * bias;
  }

  w.x += Math.cos(w.heading) * w.speed;
  w.y += Math.sin(w.heading) * w.speed;

  w.trail.push({ x: w.x, y: w.y });
  if (w.trail.length > w.trailLength) {
    w.trail.shift();
  }

  w.dotCounter += 1;
  if (w.dotCounter >= w.dotInterval) {
    w.dotCounter = 0;
    w.dots.push({ x: w.x, y: w.y });
    if (w.dots.length > w.trailLength) {
      w.dots.shift();
    }
  }
}

function drawWalker(ctx: CanvasRenderingContext2D, w: Walker) {
  const len = w.trail.length;
  if (len < 2) return;

  for (let i = 1; i < len; i++) {
    const t = i / len;
    const segAlpha = t * t * w.alpha * 0.55;
    ctx.beginPath();
    ctx.moveTo(w.trail[i - 1].x, w.trail[i - 1].y);
    ctx.lineTo(w.trail[i].x, w.trail[i].y);
    ctx.strokeStyle = `rgba(${BASE_COLOR}, ${segAlpha})`;
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  for (let i = 0; i < w.dots.length; i++) {
    const t = (i + 1) / w.dots.length;
    const dotAlpha = t * w.alpha * 0.7;
    const radius = i === w.dots.length - 1 ? 3.5 : 2.2;
    ctx.beginPath();
    ctx.arc(w.dots[i].x, w.dots[i].y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${BASE_COLOR}, ${dotAlpha})`;
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

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    resize();

    for (let i = 0; i < WALKER_COUNT; i++) {
      const w = spawnWalker(canvas.width, canvas.height);
      w.life = Math.floor((w.maxLife / WALKER_COUNT) * i * 0.7);
      walkers.push(w);
    }

    function frame() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      walkers = walkers.map((w) => {
        stepWalker(w, canvas.width, canvas.height);
        if (w.life >= w.maxLife) {
          return spawnWalker(canvas.width, canvas.height);
        }
        return w;
      });

      for (const w of walkers) {
        drawWalker(ctx, w);
      }

      animId = requestAnimationFrame(frame);
    }

    animId = requestAnimationFrame(frame);

    const onResize = () => {
      resize();
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
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        display: "block",
      }}
      aria-hidden="true"
    />
  );
}
