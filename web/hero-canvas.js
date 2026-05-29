"use strict";
/* The Calibration — cinematic hero field.
   Self-hosted Canvas 2D (no Three.js / no CDN — £0, CSP-clean, offline-safe).
   Two layers for depth:
     1. a receding perspective grid floor (observatory / ops-room horizon)
     2. a slowly rotating calibration sphere (fibonacci points + divergence
        links + amber core glow), floating above the horizon.
   Honest decoration only — visualises nothing real, carries no data claim.
   Respects prefers-reduced-motion (single static frame, no RAF loop). */

(function () {
  const canvas = document.getElementById("hero-canvas");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const AMBER = "255, 180, 92";
  const COOL = "150, 178, 210";
  const LINK = "120, 148, 188";
  const GRID = "120, 150, 190";

  let W = 0, H = 0, DPR = 1, cx = 0, cy = 0, R = 0;
  const POINTS = reduced ? 80 : 200;
  const pts = [];

  function buildSphere() {
    pts.length = 0;
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < POINTS; i++) {
      const y = 1 - (i / (POINTS - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = phi * i;
      pts.push({
        x: Math.cos(th) * r, y: y, z: Math.sin(th) * r,
        s: 0.5 + Math.random() * 1.5,
        tw: Math.random() * Math.PI * 2,
        warm: Math.random() > 0.82,
      });
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.floor(rect.width));
    H = Math.max(1, Math.floor(rect.height));
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // Sphere sits upper-right of centre; horizon ~62% down.
    cx = W * 0.62;
    cy = H * 0.44;
    R = Math.min(W, H) * 0.30;
  }

  // ---- perspective grid floor (receding to a horizon) ----
  function drawGrid(t) {
    const horizon = H * 0.62;
    const drift = (t * 0.012) % 60;
    ctx.save();
    // depth lines (horizontal, receding)
    for (let i = 0; i < 26; i++) {
      const p = i / 25;
      const ease = p * p;                  // denser near horizon
      const y = horizon + ease * (H - horizon) * 1.05 + drift * (1 - p);
      if (y > H + 2 || y < horizon) continue;
      const a = (1 - p) * 0.16;
      ctx.strokeStyle = `rgba(${GRID}, ${a})`;
      ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    // converging verticals
    const vanish = W * 0.5;
    for (let i = -12; i <= 12; i++) {
      const xb = vanish + i * (W / 9);
      const a = Math.max(0, 0.14 - Math.abs(i) * 0.006);
      ctx.strokeStyle = `rgba(${GRID}, ${a})`;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(vanish + i * 8, horizon);
      ctx.lineTo(xb, H);
      ctx.stroke();
    }
    // horizon amber glow
    const hg = ctx.createLinearGradient(0, horizon - 60, 0, horizon + 40);
    hg.addColorStop(0, "rgba(0,0,0,0)");
    hg.addColorStop(1, `rgba(${AMBER}, 0.06)`);
    ctx.fillStyle = hg;
    ctx.fillRect(0, horizon - 60, W, 100);
    ctx.restore();
  }

  function project(p, ay, ax) {
    let x = p.x, y = p.y, z = p.z;
    const ca = Math.cos(ay), sa = Math.sin(ay);
    let x1 = x * ca - z * sa, z1 = x * sa + z * ca;
    const cb = Math.cos(ax), sb = Math.sin(ax);
    let y1 = y * cb - z1 * sb, z2 = y * sb + z1 * cb;
    const persp = 1 / (1.95 - z2);
    return { sx: cx + x1 * R * persp * 1.7, sy: cy + y1 * R * persp * 1.7, depth: z2, persp };
  }

  let t = 0;
  function frame() {
    ctx.clearRect(0, 0, W, H);
    drawGrid(t);

    const ay = t * 0.00017;
    const ax = 0.40 + Math.sin(t * 0.00008) * 0.12;
    const proj = pts.map((p) => ({ p, ...project(p, ay, ax) }));

    // divergence links
    ctx.lineWidth = 0.6;
    for (let i = 0; i < proj.length; i += 2) {
      const a = proj[i];
      let best = null, bestD = Infinity;
      for (let j = i + 1; j < proj.length; j++) {
        const b = proj[j];
        const dx = a.sx - b.sx, dy = a.sy - b.sy, d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = b; }
      }
      if (best && bestD < (R * 0.4) * (R * 0.4)) {
        const front = (a.depth + best.depth) / 2;
        ctx.strokeStyle = `rgba(${LINK}, ${Math.max(0, (front + 1) / 2) * 0.15})`;
        ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(best.sx, best.sy); ctx.stroke();
      }
    }

    // core glow
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.5);
    g.addColorStop(0, `rgba(${AMBER}, 0.16)`);
    g.addColorStop(0.4, `rgba(${AMBER}, 0.05)`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.5, 0, Math.PI * 2); ctx.fill();

    // points back-to-front
    proj.sort((a, b) => a.depth - b.depth);
    for (const pp of proj) {
      const front = (pp.depth + 1) / 2;
      const tw = 0.7 + Math.sin(t * 0.002 + pp.p.tw) * 0.3;
      const size = pp.p.s * pp.persp * (0.6 + front) * tw;
      const alpha = 0.22 + front * 0.7;
      ctx.fillStyle = pp.p.warm ? `rgba(${AMBER}, ${alpha})` : `rgba(${COOL}, ${alpha * 0.8})`;
      ctx.beginPath(); ctx.arc(pp.sx, pp.sy, Math.max(0.4, size), 0, Math.PI * 2); ctx.fill();
      if (pp.p.warm && front > 0.6) {
        ctx.fillStyle = `rgba(${AMBER}, ${alpha * 0.22})`;
        ctx.beginPath(); ctx.arc(pp.sx, pp.sy, size * 3.4, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  let raf = null;
  function loop(now) { t = now; frame(); raf = requestAnimationFrame(loop); }
  function start() {
    resize(); buildSphere();
    if (reduced) { t = 8000; frame(); return; }
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  let visible = true;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = null; }
    else if (!reduced && visible && !raf) raf = requestAnimationFrame(loop);
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((e) => {
      visible = e[0].isIntersecting;
      if (!visible) { if (raf) cancelAnimationFrame(raf); raf = null; }
      else if (!reduced && !document.hidden && !raf) raf = requestAnimationFrame(loop);
    }, { threshold: 0 }).observe(canvas);
  }
  let rt = null;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => { resize(); buildSphere(); if (reduced) frame(); }, 160);
  });
  start();
})();
