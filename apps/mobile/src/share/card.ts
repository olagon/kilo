import { tierForPoints, type ResultTier } from '@huli/shared';
import { WORDMARK } from '../components/Wordmark';

const TIER_COLOR: Record<ResultTier, string> = { green: '#4caf50', yellow: '#f2c94c', orange: '#f28c28', red: '#d7263d' };

export interface CardInput {
  dayNumber: number;
  dateLabel: string;
  total: number;
  rounds: { points: number }[];
  distances: string[];
  playerName: string;
  link: string;
}

/** Island chain silhouettes, same stylized shapes as the app icon, in a 1000 x 420 box. */
const ISLANDS: [number, number, number, number, number][] = [
  // cx, cy, rx, ry, rotation
  [95, 120, 52, 46, 0], // Kauaʻi
  [250, 190, 70, 48, -20], // Oʻahu
  [400, 240, 56, 20, -10], // Molokaʻi
  [430, 300, 26, 30, 0], // Lānaʻi
  [540, 310, 80, 54, -25], // Maui
  [760, 420, 125, 135, 20], // Hawaiʻi Island
];

/** Draws a 1080 x 1350 share card. Returns a PNG data URL. */
export async function renderShareCard(c: CardInput): Promise<string> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  try { await document.fonts.ready; } catch { /* fine */ }
  const ui = (w: number, px: number) => `${w} ${px}px "Inter Variable", Inter, system-ui, sans-serif`;
  const display = (px: number) => `700 ${px}px "Fraunces Variable", Fraunces, Georgia, serif`;

  // ocean
  const g = ctx.createRadialGradient(W * 0.5, H * 0.35, 80, W * 0.5, H * 0.35, H);
  g.addColorStop(0, '#15617f');
  g.addColorStop(0.55, '#0b4f6c');
  g.addColorStop(1, '#071a26');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(238,245,243,0.07)';
  ctx.lineWidth = 5;
  for (let y = 980; y < H; y += 70) {
    ctx.beginPath();
    for (let x = -20; x <= W + 20; x += 10) ctx.lineTo(x, y + Math.sin((x / W) * Math.PI * 4) * 16);
    ctx.stroke();
  }

  // islands, faded, lower third
  ctx.save();
  ctx.translate(40, 760);
  for (const [cx, cy, rx, ry, rot] of ISLANDS) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(63,125,58,0.55)';
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // header
  ctx.fillStyle = '#eef5f3';
  ctx.textBaseline = 'alphabetic';
  drawWordmark(ctx, 72, 160, 100);
  ctx.font = ui(500, 36);
  ctx.fillStyle = 'rgba(238,245,243,0.75)';
  ctx.fillText(`#${c.dayNumber} · ${c.dateLabel}`, 72, 214);
  ctx.textAlign = 'right';
  ctx.fillText(c.playerName, W - 72, 214);
  ctx.textAlign = 'left';

  // score
  ctx.fillStyle = c.total >= 25000 ? '#f2a900' : '#eef5f3';
  ctx.font = display(220);
  ctx.fillText(c.total.toLocaleString('en-US'), 64, 440);
  ctx.fillStyle = 'rgba(238,245,243,0.7)';
  ctx.font = ui(500, 40);
  ctx.fillText('of 25,000', 72, 500);

  // five tiles
  const tile = 164;
  const gap = 22;
  const x0 = (W - (tile * 5 + gap * 4)) / 2;
  const y0 = 560;
  for (let i = 0; i < 5; i++) {
    const r = c.rounds[i];
    const x = x0 + i * (tile + gap);
    ctx.fillStyle = r ? TIER_COLOR[tierForPoints(r.points)] : 'rgba(238,245,243,0.15)';
    roundRect(ctx, x, y0, tile, tile, 28);
    ctx.fill();
    if (r) {
      ctx.fillStyle = 'rgba(10,26,36,0.85)';
      ctx.textAlign = 'center';
      ctx.font = ui(700, 44);
      ctx.fillText(r.points.toLocaleString('en-US'), x + tile / 2, y0 + 92);
      ctx.font = ui(500, 26);
      ctx.fillText(c.distances[i] ?? '', x + tile / 2, y0 + 132);
      ctx.textAlign = 'left';
    }
  }

  // hook
  ctx.fillStyle = '#eef5f3';
  ctx.font = ui(600, 44);
  ctx.fillText('Think you know the islands?', 72, 1140);
  ctx.fillStyle = 'rgba(238,245,243,0.75)';
  ctx.font = ui(400, 34);
  ctx.fillText('5 places in Hawaiʻi. Same 5 for everyone. New at midnight.', 72, 1196);
  ctx.fillStyle = '#f2a900';
  ctx.font = ui(600, 34);
  ctx.fillText(c.link.replace(/^https?:\/\//, ''), 72, 1262);

  return canvas.toDataURL('image/png');
}

/** Draws the Kilo mark with its baseline at (x, y) and the given cap height in px. */
function drawWordmark(ctx: CanvasRenderingContext2D, x: number, y: number, capPx: number) {
  const capUnits = WORDMARK.originY - 40; // cap height in font units (origin is pad + cap)
  const k = capPx / capUnits;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, -k);
  ctx.fillStyle = '#eef5f3';
  for (const l of WORDMARK.letters) {
    ctx.save();
    ctx.translate(l.x, 0);
    ctx.fill(new Path2D(l.d));
    ctx.restore();
  }
  ctx.fill(new Path2D(WORDMARK.ring), 'evenodd');
  ctx.fillStyle = '#f2a900';
  ctx.beginPath();
  ctx.arc(WORDMARK.dot.cx, WORDMARK.dot.cy, WORDMARK.dot.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
