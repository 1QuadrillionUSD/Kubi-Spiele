import { G, rand, clamp, wrapAngle, TAU } from "./state.js";
import { SNAKE } from "./config.js";
import { starPath } from "./effects.js";

export function createSnake() {
  const gap = SNAKE.segGap * G.U;
  const hx = G.w * 0.5;
  const hy = G.h * 0.62;
  const segs = [];
  for (let i = 0; i < SNAKE.startLen; i++) segs.push({ x: hx, y: hy + i * gap });
  return {
    segs,
    angle: -Math.PI / 2,
    pending: 0,
    growT: 0,
    bulges: [],
    turbo: 0,
    slip: 0,
    hidden: 0,
    knot: 0,
    knotCd: 0,
    cross: 0,
    mouth: 0,
    tongue: 0,
    tongueT: rand(1, 2),
    blinkT: rand(2, 4),
    look: { x: 0, y: -1 },
    z: 0,
    bubbleY: 50,
    dead: false,
    get x() {
      return this.segs[0].x;
    },
    get y() {
      return this.segs[0].y;
    },
  };
}

export function headRadius() {
  return SNAKE.headR * G.U;
}

export function addGrowth(s, segments, bulgeSize = 0.55) {
  s.pending += segments;
  s.bulges.push({ pos: 1, amp: bulgeSize });
  s.mouth = 0.55;
  s.tongue = 0.4;
}

function adjustForWalls(head, vx, vy, preferSign) {
  const margin = 70 * G.U;
  const left = head.x < margin;
  const right = head.x > G.w - margin;
  const top = head.y < margin;
  const bottom = head.y > G.h - margin;
  if ((left && vx < 0) || (right && vx > 0)) vx = 0;
  if ((top && vy < 0) || (bottom && vy > 0)) vy = 0;
  if (Math.hypot(vx, vy) < 0.25) {
    // Sackgasse: an der Wand entlang gleiten
    if (left || right) vy = (preferSign.y || (head.y < G.h / 2 ? 1 : -1));
    else vx = (preferSign.x || (head.x < G.w / 2 ? 1 : -1));
  }
  return Math.atan2(vy, vx);
}

// Gibt Ereignisse zurück: { knot: true }, wenn sich die Schlange verknotet hat.
export function updateSnake(s, dt, steer, still = false) {
  const U = G.U;
  const head = s.segs[0];
  const events = {};

  s.turbo = Math.max(0, s.turbo - dt);
  s.slip = Math.max(0, s.slip - dt);
  s.hidden = Math.max(0, s.hidden - dt);
  s.knot = Math.max(0, s.knot - dt);
  s.knotCd = Math.max(0, s.knotCd - dt);
  s.cross = Math.max(0, s.cross - dt);
  s.mouth = Math.max(0, s.mouth - dt);
  s.tongue = Math.max(0, s.tongue - dt);
  s.blinkT -= dt;
  if (s.blinkT < -0.14) s.blinkT = rand(2, 4.5);
  s.tongueT -= dt;
  if (s.tongueT <= 0) {
    s.tongue = 0.4;
    s.tongueT = rand(1.4, 3);
  }

  if (still) return events;

  const heading = { x: Math.cos(s.angle), y: Math.sin(s.angle) };
  const prefer = { x: Math.sign(heading.x), y: Math.sign(heading.y) };
  let desired;
  if (steer) {
    desired = adjustForWalls(head, Math.cos(steer.angle), Math.sin(steer.angle), prefer);
  } else {
    // Ohne Eingabe läuft die Schlange geradeaus und dreht vor einer Wand zur Mitte ab.
    const margin = 90 * U;
    const towardWall =
      (head.x < margin && heading.x < 0) ||
      (head.x > G.w - margin && heading.x > 0) ||
      (head.y < margin && heading.y < 0) ||
      (head.y > G.h - margin && heading.y > 0);
    desired = towardWall ? Math.atan2(G.h / 2 - head.y, G.w / 2 - head.x) : s.angle;
  }

  const turnRate = s.slip > 0 ? SNAKE.slipTurn : SNAKE.turn;
  const diff = wrapAngle(desired - s.angle);
  s.angle += clamp(diff, -turnRate * dt, turnRate * dt);

  let speed = SNAKE.speed * U;
  if (s.turbo > 0) speed *= SNAKE.turboFactor;
  if (s.slip > 0) speed *= SNAKE.slipFactor;
  head.x += Math.cos(s.angle) * speed * dt;
  head.y += Math.sin(s.angle) * speed * dt;
  const pad = SNAKE.headR * U * 0.9;
  head.x = clamp(head.x, pad, G.w - pad);
  head.y = clamp(head.y, pad, G.h - pad);

  const gap = SNAKE.segGap * U;
  for (let i = 1; i < s.segs.length; i++) {
    const prev = s.segs[i - 1];
    const seg = s.segs[i];
    const dx = seg.x - prev.x;
    const dy = seg.y - prev.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > gap) {
      seg.x = prev.x + (dx / d) * gap;
      seg.y = prev.y + (dy / d) * gap;
    }
  }

  if (s.pending > 0) {
    s.growT -= dt;
    if (s.growT <= 0) {
      const last = s.segs[s.segs.length - 1];
      s.segs.push({ x: last.x, y: last.y });
      s.pending--;
      s.growT = 0.045;
    }
  }

  for (let i = s.bulges.length - 1; i >= 0; i--) {
    const b = s.bulges[i];
    b.pos += 15 * dt;
    b.amp = Math.max(0.2, b.amp - 0.08 * dt);
    if (b.pos > s.segs.length - 1) s.bulges.splice(i, 1);
  }

  if (s.knotCd <= 0 && s.segs.length > 18) {
    const hit = (SNAKE.headR * U) * 0.8;
    for (let i = 14; i < s.segs.length; i++) {
      const seg = s.segs[i];
      if (Math.hypot(seg.x - head.x, seg.y - head.y) < hit) {
        events.knot = true;
        s.knot = 1.4;
        s.knotCd = 2.6;
        s.cross = Math.max(s.cross, 1.4);
        const remove = Math.min(3, s.segs.length - SNAKE.minLen);
        if (remove > 0) s.segs.length -= remove;
        break;
      }
    }
  }

  return events;
}

export function radiusAt(s, i) {
  const n = s.segs.length;
  const U = G.U;
  const base = (SNAKE.bodyR + Math.min(5, n * 0.05)) * U;
  const t = n > 1 ? i / (n - 1) : 0;
  let r = base * (t < 0.55 ? 1 : 1 - 0.74 * Math.pow((t - 0.55) / 0.45, 1.15));
  for (const b of s.bulges) {
    r += base * b.amp * Math.exp(-Math.pow((i - b.pos) / 2.4, 2));
  }
  return r;
}

export function drawSnake(ctx, time) {
  const s = G.snake;
  const U = G.U;
  const n = s.segs.length;
  const turbo = s.turbo > 0;
  const wob = s.knot > 0 ? Math.min(1, s.knot / 0.6) : 0;

  const pts = s.segs.map((seg, i) => {
    if (!wob) return seg;
    const a = s.segs[Math.max(0, i - 1)];
    const b = s.segs[Math.min(n - 1, i + 1)];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / len;
    const ny = (b.x - a.x) / len;
    const off = Math.sin(time * 24 + i * 0.9) * 5 * U * wob;
    return { x: seg.x + nx * off, y: seg.y + ny * off };
  });
  const radii = pts.map((_, i) => radiusAt(s, i));

  ctx.save();
  if (s.hidden > 0) ctx.globalAlpha = 0.4;

  // Schatten
  ctx.fillStyle = "rgba(20, 60, 20, 0.22)";
  ctx.beginPath();
  for (let i = n - 1; i >= 0; i--) {
    ctx.moveTo(pts[i].x + radii[i], pts[i].y + 6 * U);
    ctx.arc(pts[i].x, pts[i].y + 6 * U, radii[i], 0, TAU);
  }
  ctx.fill();

  // Umriss
  ctx.fillStyle = turbo ? "#b8661c" : "#2a7a3d";
  ctx.beginPath();
  for (let i = n - 1; i >= 0; i--) {
    ctx.moveTo(pts[i].x + radii[i] + 2.4 * U, pts[i].y);
    ctx.arc(pts[i].x, pts[i].y, radii[i] + 2.4 * U, 0, TAU);
  }
  ctx.fill();

  // Körper in Bändern
  for (let i = n - 1; i >= 0; i--) {
    const band = (i >> 2) & 1;
    ctx.fillStyle = turbo ? (band ? "#ffc94a" : "#ffb02e") : band ? "#62d05e" : "#4fbb52";
    ctx.beginPath();
    ctx.arc(pts[i].x, pts[i].y, radii[i], 0, TAU);
    ctx.fill();
  }

  // Rautenmuster und Glanz
  for (let i = n - 1; i >= 2; i--) {
    const r = radii[i];
    if (i % 5 === 3 && r > 4 * U) {
      ctx.fillStyle = turbo ? "rgba(190, 90, 20, 0.45)" : "rgba(28, 110, 52, 0.42)";
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, r * 0.5, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(235, 255, 200, 0.22)";
    ctx.beginPath();
    ctx.arc(pts[i].x - r * 0.18, pts[i].y - r * 0.28, r * 0.5, 0, TAU);
    ctx.fill();
  }

  drawHead(ctx, s, pts[0], time, turbo);
  ctx.restore();
}

function drawHead(ctx, s, p, time, turbo) {
  const U = G.U;
  const R = SNAKE.headR * U;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(s.angle);

  // Zunge (hinter dem Kopf-Umriss, ragt nach vorn)
  if (s.tongue > 0 && s.mouth <= 0) {
    const t = 1 - s.tongue / 0.4;
    const len = Math.sin(t * Math.PI) * R * 1.15;
    const fork = len * 0.28;
    ctx.strokeStyle = "#ff3f5f";
    ctx.lineWidth = 3.2 * U;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(R * 1.1, 0);
    ctx.lineTo(R * 1.1 + len, 0);
    ctx.moveTo(R * 1.1 + len, 0);
    ctx.lineTo(R * 1.1 + len + fork, -fork * 0.7);
    ctx.moveTo(R * 1.1 + len, 0);
    ctx.lineTo(R * 1.1 + len + fork, fork * 0.7);
    ctx.stroke();
  }

  // Kopfform
  ctx.fillStyle = turbo ? "#b8661c" : "#2a7a3d";
  ctx.beginPath();
  ctx.ellipse(R * 0.1, 0, R * 1.2 + 2.4 * U, R + 2.4 * U, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = turbo ? "#ffc94a" : "#6ad865";
  ctx.beginPath();
  ctx.ellipse(R * 0.1, 0, R * 1.2, R, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(235, 255, 200, 0.28)";
  ctx.beginPath();
  ctx.ellipse(-R * 0.05, -R * 0.42, R * 0.7, R * 0.3, 0, 0, TAU);
  ctx.fill();

  // Wangen
  ctx.fillStyle = "rgba(255, 110, 140, 0.5)";
  for (const sign of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(R * 0.62, sign * R * 0.7, R * 0.2, R * 0.14, 0, 0, TAU);
    ctx.fill();
  }

  // Nasenlöcher
  ctx.fillStyle = "#1f5a31";
  for (const sign of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(R * 1.08, sign * R * 0.2, R * 0.065, 0, TAU);
    ctx.fill();
  }

  // Mund
  ctx.strokeStyle = "#1f5a31";
  ctx.lineWidth = 2.4 * U;
  ctx.lineCap = "round";
  if (s.mouth > 0) {
    const open = Math.sin(Math.min(1, s.mouth / 0.55) * Math.PI * 0.5 + 0.2);
    ctx.fillStyle = "#6b1730";
    ctx.beginPath();
    ctx.ellipse(R * 0.9, 0, R * 0.26 * open + R * 0.06, R * 0.42 * open + R * 0.06, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#ff6a86";
    ctx.beginPath();
    ctx.ellipse(R * 0.92, R * 0.05, R * 0.14 * open, R * 0.18 * open, 0, 0, TAU);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(R * 0.92, -R * 0.42);
    ctx.quadraticCurveTo(R * 1.18, 0, R * 0.92, R * 0.42);
    ctx.stroke();
  }

  // Augen
  const eyeR = R * 0.4;
  const blink = s.blinkT < 0 && s.blinkT > -0.14;
  const crossed = s.cross > 0;
  const lookAngle = Math.atan2(s.look.y, s.look.x) - s.angle;
  const lookX = Math.cos(lookAngle) * R * 0.14;
  const lookY = Math.sin(lookAngle) * R * 0.14;
  for (const sign of [-1, 1]) {
    const ex = R * 0.28;
    const ey = sign * R * 0.5;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#1f5a31";
    ctx.lineWidth = 2 * U;
    ctx.beginPath();
    ctx.arc(ex, ey, eyeR, 0, TAU);
    ctx.fill();
    ctx.stroke();
    if (blink) {
      ctx.beginPath();
      ctx.moveTo(ex - eyeR, ey);
      ctx.lineTo(ex + eyeR, ey);
      ctx.stroke();
      continue;
    }
    const wobble = crossed ? Math.sin(time * 10) * R * 0.04 : 0;
    const px = crossed ? ex + R * 0.1 : ex + lookX;
    const py = crossed ? ey - sign * eyeR * 0.5 + wobble : ey + lookY;
    ctx.fillStyle = "#17324d";
    ctx.beginPath();
    ctx.arc(px, py, eyeR * 0.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(px - eyeR * 0.14, py - eyeR * 0.18, eyeR * 0.16, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // Benommene Sternchen beim Knoten
  if (s.knot > 0) {
    for (let i = 0; i < 3; i++) {
      const a = time * 6 + (i * TAU) / 3;
      ctx.save();
      ctx.translate(p.x + Math.cos(a) * R * 1.1, p.y - R * 1.5 + Math.sin(a) * R * 0.35);
      ctx.rotate(time * 3 + i);
      ctx.fillStyle = "#ffe14d";
      ctx.strokeStyle = "#b8861c";
      ctx.lineWidth = 1.2 * U;
      starPath(ctx, 6 * U);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
}
