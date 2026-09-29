export type ConfettiPiece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vr: number;
  shape: "rect" | "circle" | "star";
  color: string;
  life: number;
  gravity: number;
};

export type Floater = {
  x: number;
  y: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  kind: "balloon" | "sixteen" | "spark";
  color: string;
  sway: number;
  phase: number;
};

const PALETTE = ["#f4ead8", "#e8c17a", "#9a3040", "#c45c48", "#fff6e0", "#d4a054", "#7a1f2b"];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function burstConfetti(w: number, h: number): ConfettiPiece[] {
  const pieces: ConfettiPiece[] = [];
  const origins = [
    { x: w * 0.15, y: h * 0.2 },
    { x: w * 0.5, y: h * 0.08 },
    { x: w * 0.85, y: h * 0.2 },
    { x: w * 0.3, y: h * 0.95 },
    { x: w * 0.7, y: h * 0.95 },
  ];
  for (const o of origins) {
    const count = 38;
    for (let i = 0; i < count; i++) {
      const angle = rand(-Math.PI, 0);
      const speed = rand(3.2, 9.5);
      const shapeRoll = Math.random();
      pieces.push({
        x: o.x + rand(-12, 12),
        y: o.y,
        vx: Math.cos(angle) * speed * (o.x < w * 0.5 ? 1 : o.x > w * 0.5 ? -1 : Math.random() < 0.5 ? 1 : -1) * 0.35 + Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - rand(1, 4),
        w: rand(4, 9),
        h: rand(6, 14),
        rot: rand(0, Math.PI * 2),
        vr: rand(-0.18, 0.18),
        shape: shapeRoll < 0.55 ? "rect" : shapeRoll < 0.82 ? "circle" : "star",
        color: PALETTE[i % PALETTE.length] ?? "#e8c17a",
        life: rand(3.2, 5.4),
        gravity: rand(0.06, 0.12),
      });
    }
  }
  return pieces;
}

export function makeFloaters(w: number, h: number): Floater[] {
  const items: Floater[] = [];
  const balloonColors = ["#9a3040", "#f4ead8", "#e8c17a", "#7a1f2b", "#fff1d4"];
  for (let i = 0; i < 7; i++) {
    items.push({
      x: rand(w * 0.08, w * 0.92),
      y: h + rand(20, 180),
      vy: rand(0.35, 0.7),
      size: rand(22, 38),
      rot: rand(-0.15, 0.15),
      vr: rand(-0.004, 0.004),
      kind: "balloon",
      color: balloonColors[i % balloonColors.length] ?? "#9a3040",
      sway: rand(10, 22),
      phase: rand(0, Math.PI * 2),
    });
  }
  for (let i = 0; i < 6; i++) {
    items.push({
      x: rand(w * 0.1, w * 0.9),
      y: h + rand(80, 320),
      vy: rand(0.25, 0.5),
      size: rand(18, 28),
      rot: rand(-0.2, 0.2),
      vr: rand(-0.01, 0.01),
      kind: "sixteen",
      color: "rgba(232,193,122,0.55)",
      sway: rand(8, 18),
      phase: rand(0, Math.PI * 2),
    });
  }
  for (let i = 0; i < 18; i++) {
    items.push({
      x: rand(0, w),
      y: rand(0, h),
      vy: rand(0.05, 0.18),
      size: rand(1.2, 2.6),
      rot: 0,
      vr: 0,
      kind: "spark",
      color: "rgba(255,246,224,0.9)",
      sway: rand(4, 12),
      phase: rand(0, Math.PI * 2),
    });
  }
  return items;
}

export function drawStar(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function stepPieces(pieces: ConfettiPiece[], h: number, dt: number) {
  for (const p of pieces) {
    p.vy += p.gravity * dt * 60;
    p.vx *= 0.995;
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.rot += p.vr * dt * 60;
    p.life -= dt;
    if (p.y > h + 40) {
      p.y = -20;
      p.vy = rand(0.4, 1.2);
      p.life = rand(2.5, 4);
    }
  }
}

export function stepFloaters(items: Floater[], w: number, h: number, t: number) {
  for (const f of items) {
    f.y -= f.vy;
    f.x += Math.sin(t * 0.0018 + f.phase) * 0.35;
    f.rot += f.vr;
    if (f.y < -80) {
      f.y = h + rand(40, 160);
      f.x = rand(w * 0.06, w * 0.94);
    }
  }
}
