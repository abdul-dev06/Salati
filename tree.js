/* ─────────────────────────────────────────────
   TIME OF DAY — sky palette keyframes
───────────────────────────────────────────── */
const TOD_KEYS = [
  { h:  0, st:'#020408', sb:'#060c16', fog:'#04080f', stars:1.00, br:0.55, tint:[180,190,220] },
  { h:  5, st:'#0a0518', sb:'#1a0810', fog:'#0e0612', stars:0.80, br:0.60, tint:[160,160,200] },
  { h:  6, st:'#c04020', sb:'#f09030', fog:'#b05020', stars:0.10, br:0.85, tint:[255,180,80]  },
  { h:  8, st:'#2060b0', sb:'#80b8e8', fog:'#4080a0', stars:0.00, br:1.10, tint:[220,200,160] },
  { h: 12, st:'#1464d0', sb:'#60a8e0', fog:'#3078b0', stars:0.00, br:1.30, tint:[255,240,200] },
  { h: 16, st:'#1a50a0', sb:'#70a8d8', fog:'#3870a0', stars:0.00, br:1.15, tint:[240,220,180] },
  { h: 18, st:'#b03010', sb:'#f08030', fog:'#a04010', stars:0.05, br:0.90, tint:[255,160,60]  },
  { h: 19, st:'#400820', sb:'#a02810', fog:'#300618', stars:0.30, br:0.70, tint:[200,120,80]  },
  { h: 21, st:'#08031a', sb:'#100820', fog:'#07061a', stars:0.85, br:0.58, tint:[160,170,210] },
  { h: 24, st:'#020408', sb:'#060c16', fog:'#04080f', stars:1.00, br:0.55, tint:[180,190,220] },
];

function todLerp(hour) {
  let a = TOD_KEYS[0], b = TOD_KEYS[1];
  for (let i = 0; i < TOD_KEYS.length - 1; i++) {
    if (hour >= TOD_KEYS[i].h && hour <= TOD_KEYS[i+1].h) {
      a = TOD_KEYS[i]; b = TOD_KEYS[i+1]; break;
    }
  }
  const t = (a.h === b.h) ? 0 : (hour - a.h) / (b.h - a.h);
  const ease = t * t * (3 - 2 * t);

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n>>16)&255, (n>>8)&255, n&255];
  }
  function lerpRgb(c1, c2, t) {
    return c1.map((v,i) => Math.round(v + (c2[i]-v)*t));
  }
  function rgbToHex([r,g,b]) {
    return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
  }

  return {
    skyTop: rgbToHex(lerpRgb(hexToRgb(a.st), hexToRgb(b.st), ease)),
    skyBot: rgbToHex(lerpRgb(hexToRgb(a.sb), hexToRgb(b.sb), ease)),
    fog:    rgbToHex(lerpRgb(hexToRgb(a.fog), hexToRgb(b.fog), ease)),
    stars:  a.stars + (b.stars - a.stars) * ease,
    bright: a.br   + (b.br   - a.br)   * ease,
    tint:   lerpRgb(a.tint, b.tint, ease),
  };
}

/* ─────────────────────────────────────────────
   FIXED PARAMETERS (no sliders)
───────────────────────────────────────────── */
const MAX_DEPTH = 6;
const WIND_STR  = 0.50;
const SPREAD    = 37 * Math.PI / 180;

/* ─────────────────────────────────────────────
   LIVE TIME OF DAY — synced to real clock, updates every minute
───────────────────────────────────────────── */
function getCurrentHour() {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
}

let TIME_OF_DAY  = getCurrentHour();
let currentTOD   = todLerp(TIME_OF_DAY);
let globalStarOpacity = currentTOD.stars;

function syncTime() {
  TIME_OF_DAY = getCurrentHour();
  currentTOD  = todLerp(TIME_OF_DAY);
  globalStarOpacity = currentTOD.stars;
  const fogEl = document.getElementById('fog');
  if (fogEl) fogEl.style.background =
    `linear-gradient(to top, ${currentTOD.fog}ee 0%, transparent 100%)`;
}

// Sync immediately, then every minute aligned to the clock
syncTime();
(function scheduleSyncAtNextMinute() {
  const now = new Date();
  const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
  setTimeout(() => {
    syncTime();
    setInterval(syncTime, 60000);
  }, msUntilNextMinute);
})();

/* ─────────────────────────────────────────────
   STARS
───────────────────────────────────────────── */
(function() {
  const sc  = document.getElementById('stars');
  const sx  = sc.getContext('2d');
  const COUNT = 280;
  let stars = [];

  function resize() { sc.width = window.innerWidth; sc.height = window.innerHeight; }

  function seed() {
    stars = [];
    for (let i = 0; i < COUNT; i++) {
      stars.push({
        x: Math.random() * sc.width,
        y: Math.random() * sc.height,
        r: Math.random() * 1.3 + 0.2,
        a: Math.random(),
        speed: Math.random() * 0.004 + 0.001,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function drawStars(t) {
    sx.clearRect(0, 0, sc.width, sc.height);
    if (globalStarOpacity < 0.01) return;
    for (const s of stars) {
      const flicker = s.a * (0.7 + 0.3 * Math.sin(t * s.speed * 60 + s.phase));
      sx.beginPath();
      sx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      sx.fillStyle = `rgba(240,232,210,${flicker * globalStarOpacity})`;
      sx.fill();
    }
  }

  resize(); seed();
  window.addEventListener('resize', () => { resize(); seed(); });

  let last = 0;
  function loop(t) {
    if (t - last > 80) { drawStars(t); last = t; }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

/* ─────────────────────────────────────────────
   CELESTIAL BODIES
───────────────────────────────────────────── */
function drawCelestial(hour) {
  const W = canvas.width, H = canvas.height;

  // Sun arc: rises at h=6, sets at h=18
  const sunProgress = (hour - 6) / 12;
  const sunAlpha = (hour >= 5.5 && hour <= 18.5)
    ? Math.sin(Math.max(0, Math.min(1, sunProgress)) * Math.PI) * 0.95
    : 0;

  const sunAngle = Math.PI + sunProgress * Math.PI;
  const sunX = W * 0.5 + Math.cos(sunAngle) * W * 0.38;
  const sunY = H * 0.55 + Math.sin(sunAngle) * H * 0.48;

  if (sunAlpha > 0.01) {
    const sg = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 80);
    sg.addColorStop(0,   `rgba(255,240,160,${sunAlpha * 0.35})`);
    sg.addColorStop(0.5, `rgba(255,200,80,${sunAlpha * 0.12})`);
    sg.addColorStop(1,   `rgba(255,160,40,0)`);
    ctx.beginPath();
    ctx.arc(sunX, sunY, 80, 0, Math.PI * 2);
    ctx.fillStyle = sg;
    ctx.fill();

    const disc = ctx.createRadialGradient(sunX - 6, sunY - 6, 0, sunX, sunY, 28);
    disc.addColorStop(0,   `rgba(255,255,220,${sunAlpha})`);
    disc.addColorStop(0.6, `rgba(255,220,100,${sunAlpha})`);
    disc.addColorStop(1,   `rgba(255,180,60,${sunAlpha})`);
    ctx.beginPath();
    ctx.arc(sunX, sunY, 28, 0, Math.PI * 2);
    ctx.fillStyle = disc;
    ctx.fill();
  }

  // Moon arc: visible at night
  const moonProgress = (hour < 6) ? (hour + 6) / 12 : (hour - 18) / 12;
  const moonAlpha = (hour >= 19 || hour <= 5)
    ? Math.sin(Math.max(0, Math.min(1, moonProgress)) * Math.PI) * 0.90
    : (hour > 5 && hour < 6) ? (6 - hour) * 0.90 : 0;

  const moonAngle = Math.PI + moonProgress * Math.PI;
  const moonX = W * 0.5 + Math.cos(moonAngle) * W * 0.38;
  const moonY = H * 0.55 + Math.sin(moonAngle) * H * 0.48;

  if (moonAlpha > 0.01) {
    const mg = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 60);
    mg.addColorStop(0,   `rgba(230,215,160,${moonAlpha * 0.3})`);
    mg.addColorStop(0.5, `rgba(200,180,110,${moonAlpha * 0.12})`);
    mg.addColorStop(1,   `rgba(180,160,90,0)`);
    ctx.beginPath();
    ctx.arc(moonX, moonY, 60, 0, Math.PI * 2);
    ctx.fillStyle = mg;
    ctx.fill();

    const mdisc = ctx.createRadialGradient(moonX - 8, moonY - 8, 0, moonX, moonY, 30);
    mdisc.addColorStop(0,    `rgba(255,251,232,${moonAlpha})`);
    mdisc.addColorStop(0.55, `rgba(232,217,176,${moonAlpha})`);
    mdisc.addColorStop(1,    `rgba(184,168,122,${moonAlpha})`);
    ctx.beginPath();
    ctx.arc(moonX, moonY, 30, 0, Math.PI * 2);
    ctx.fillStyle = mdisc;
    ctx.fill();
  }
}

const canvas   = document.getElementById('tree');     // sky + celestial
const ctx      = canvas.getContext('2d');

const fgCanvas = document.getElementById('tree-fg'); // branches only
const fgCtx    = fgCanvas.getContext('2d');

/* ── Perlin noise ── */
const perm = new Uint8Array(512);
(function() {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.random() * (i + 1) | 0;
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
})();

function fade(t)  { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a, b, t) { return a + t * (b - a); }
function grad(h, x) { return (h & 1) ? -x : x; }
function noise1d(x) {
  const xi = Math.floor(x) & 255;
  const xf = x - Math.floor(x);
  return lerp(grad(perm[xi], xf), grad(perm[xi+1], xf-1), fade(xf));
}

function branchColor(depth, alpha) {
  const dt = Math.min(depth / MAX_DEPTH, 1);
  const [tr, tg, tb] = currentTOD.tint;
  const br = currentTOD.bright;

  const r0 = lerp(lerp(90,  200, dt), 230, dt*dt);
  const g0 = lerp(lerp(55,  120, dt), 210, dt*dt);
  const b0 = lerp(lerp(30,   60, dt), 150, dt*dt);

  const blend = dt * 0.5;
  const r = Math.round(lerp(r0, tr, blend) * br);
  const g = Math.round(lerp(g0, tg, blend) * br);
  const b = Math.round(lerp(b0, tb, blend) * br);
  return `rgba(${Math.min(255,r)},${Math.min(255,g)},${Math.min(255,b)},${alpha})`;
}

function swayAngle(depth, t) {
  const n1 = noise1d(t * 0.55 + depth * 0.31);
  const n2 = noise1d(t * 1.40 + depth * 0.13 + 7.3);
  const n3 = noise1d(t * 2.80 + depth * 0.07 + 14.9);
  const depthFactor = Math.pow(depth / MAX_DEPTH, 0.8);
  return WIND_STR * depthFactor * (n1 * 0.55 + n2 * 0.28 + n3 * 0.17);
}

/* ─────────────────────────────────────────────
   NEBULA — night sky background motion
───────────────────────────────────────────── */
const NEBULA_CLOUDS = Array.from({ length: 7 }, (_, i) => ({
  x:      Math.random(),
  y:      Math.random() * 0.75,
  rx:     0.18 + Math.random() * 0.22,
  ry:     0.08 + Math.random() * 0.13,
  hue:    [260, 200, 290, 220, 270, 180, 310][i],
  speed:  (0.0008 + Math.random() * 0.001) * (Math.random() < 0.5 ? 1 : -1),
  phase:  Math.random() * Math.PI * 2,
  pSpeed: 0.08 + Math.random() * 0.12,
  alpha:  0.055 + Math.random() * 0.055,
}));

function drawNebula(t, nightBlend) {
  if (nightBlend < 0.01) return;
  const W = canvas.width, H = canvas.height;

  for (const c of NEBULA_CLOUDS) {
    c.x += c.speed * 0.016;
    if (c.x > 1.35)  c.x = -0.35;
    if (c.x < -0.35) c.x =  1.35;

    const pulse = 0.5 + 0.5 * Math.sin(t * c.pSpeed + c.phase);
    const alpha = c.alpha * (0.7 + 0.3 * pulse) * nightBlend;

    const cx = c.x * W;
    const cy = c.y * H;
    const rw = c.rx * W;
    const rh = c.ry * H;

    ctx.save();
    ctx.transform(1, 0, 0, rh / rw, 0, cy - cy * (rh / rw));
    const grad = ctx.createRadialGradient(cx, cy * (rw / rh), 0, cx, cy * (rw / rh), rw);
    grad.addColorStop(0,   `hsla(${c.hue}, 80%, 65%, ${alpha})`);
    grad.addColorStop(0.4, `hsla(${c.hue + 20}, 70%, 50%, ${alpha * 0.5})`);
    grad.addColorStop(1,   `hsla(${c.hue}, 60%, 40%, 0)`);
    ctx.beginPath();
    ctx.arc(cx, cy * (rw / rh), rw, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }
}

/* ─────────────────────────────────────────────
   LIGHT SHAFTS — day sky background motion
───────────────────────────────────────────── */
const SHAFTS = Array.from({ length: 6 }, () => ({
  x:      Math.random(),
  speed:  (0.0006 + Math.random() * 0.0008) * (Math.random() < 0.5 ? 1 : -1),
  width:  0.04 + Math.random() * 0.07,
  angle:  (Math.random() - 0.5) * 0.18,
  phase:  Math.random() * Math.PI * 2,
  pSpeed: 0.06 + Math.random() * 0.10,
  alpha:  0.025 + Math.random() * 0.03,
}));

function drawLightShafts(t, dayBlend) {
  if (dayBlend < 0.01) return;
  const W = canvas.width, H = canvas.height;

  for (const s of SHAFTS) {
    s.x += s.speed * 0.016;
    if (s.x > 1.3)  s.x = -0.3;
    if (s.x < -0.3) s.x =  1.3;

    const pulse = 0.5 + 0.5 * Math.sin(t * s.pSpeed + s.phase);
    const alpha = s.alpha * (0.6 + 0.4 * pulse) * dayBlend;
    const cx    = s.x * W;
    const hw    = s.width * W * 0.5;

    ctx.save();
    ctx.translate(cx, 0);
    ctx.rotate(s.angle);

    const grad = ctx.createLinearGradient(-hw, 0, hw, 0);
    grad.addColorStop(0,   `rgba(255, 240, 180, 0)`);
    grad.addColorStop(0.5, `rgba(255, 248, 210, ${alpha})`);
    grad.addColorStop(1,   `rgba(255, 240, 180, 0)`);

    ctx.fillStyle = grad;
    ctx.fillRect(-hw, -H * 0.1, hw * 2, H * 1.2);
    ctx.restore();
  }
}

/* ─────────────────────────────────────────────
   BLEND FACTOR — how much night vs day
───────────────────────────────────────────── */
function getDayNightBlend(hour) {
  // nightBlend: 1 at full night, 0 at midday
  // dayBlend:   1 at midday, 0 at full night
  const nightHours = [0, 4, 5, 6, 19, 20, 21, 24];
  const nightVals  = [1, 1, 0.5, 0, 0, 0.5, 1, 1];
  let nb = 0;
  for (let i = 0; i < nightHours.length - 1; i++) {
    if (hour >= nightHours[i] && hour <= nightHours[i+1]) {
      const tt = (hour - nightHours[i]) / (nightHours[i+1] - nightHours[i]);
      const e  = tt * tt * (3 - 2 * tt);
      nb = nightVals[i] + (nightVals[i+1] - nightVals[i]) * e;
      break;
    }
  }
  return { night: nb, day: 1 - nb };
}

function drawMosqueSilhouette() {
  const W = canvas.width;
  const H = canvas.height;

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const [r, g, b] = hexToRgb(currentTOD.skyTop);
  const fillColor = `rgba(${Math.max(0,r-28)},${Math.max(0,g-28)},${Math.max(0,b-22)},0.80)`;

  ctx.save();
  ctx.fillStyle = fillColor;
  ctx.beginPath();

  const groundY = H;
  const mH      = H * 0.14;
  const mW      = W * 0.38;
  const mX      = W * 0.50;

  // Ground base fill
  ctx.rect(0, groundY - mH * 0.28, W, mH * 0.28 + 2);

  // Main building body
  ctx.rect(mX - mW / 2, groundY - mH, mW, mH);

  function dome(cx, baseY, rx, ry) {
    ctx.moveTo(cx - rx, baseY);
    ctx.bezierCurveTo(cx - rx, baseY - ry * 1.3, cx + rx, baseY - ry * 1.3, cx + rx, baseY);
  }

  function minaret(cx, baseY, w, h) {
    const tw = w * 0.55;
    const sh = h * 0.10;
    ctx.rect(cx - w / 2, baseY - h, w, h);
    ctx.rect(cx - tw * 0.9, baseY - h - h * 0.06, tw * 1.8, h * 0.04);
    ctx.moveTo(cx - tw / 2, baseY - h - h * 0.06);
    ctx.lineTo(cx + tw / 2, baseY - h - h * 0.06);
    ctx.lineTo(cx + tw * 0.3, baseY - h - h * 0.06 - sh * 0.6);
    ctx.lineTo(cx, baseY - h - h * 0.06 - sh);
    ctx.lineTo(cx - tw * 0.3, baseY - h - h * 0.06 - sh * 0.6);
    ctx.closePath();
    const cy = baseY - h - h * 0.06 - sh - h * 0.04;
    const cr = w * 0.22;
    ctx.moveTo(cx + cr, cy);
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.arc(cx + cr * 0.4, cy - cr * 0.1, cr * 0.78, Math.PI * 1.1, Math.PI * 1.9, true);
  }

  // Domes
  dome(mX,               groundY - mH, mW * 0.26, mH * 0.40);
  dome(mX - mW * 0.28,  groundY - mH, mW * 0.13, mH * 0.22);
  dome(mX + mW * 0.28,  groundY - mH, mW * 0.13, mH * 0.22);
  dome(mX - mW * 0.46,  groundY - mH, mW * 0.07, mH * 0.13);
  dome(mX + mW * 0.46,  groundY - mH, mW * 0.07, mH * 0.13);

  // Arch windows
  const winH = mH * 0.28, winW = mW * 0.09;
  for (let i = -1; i <= 1; i++) {
    ctx.rect(mX + i * mW * 0.18 - winW / 2, groundY - winH, winW, winH * 0.55);
    ctx.arc(mX + i * mW * 0.18, groundY - winH * 0.45, winW / 2, Math.PI, 0);
  }

  // Minarets
  minaret(mX - mW * 0.60, groundY, mW * 0.07, mH * 1.55);
  minaret(mX + mW * 0.60, groundY, mW * 0.07, mH * 1.55);
  minaret(mX - mW * 0.43, groundY, mW * 0.05, mH * 1.10);
  minaret(mX + mW * 0.43, groundY, mW * 0.05, mH * 1.10);

  ctx.fill();
  ctx.restore();
}

function drawSky(t) {
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0,    currentTOD.skyTop);
  g.addColorStop(0.72, currentTOD.skyBot);
  g.addColorStop(1,    currentTOD.fog);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const { night, day } = getDayNightBlend(TIME_OF_DAY);
  drawNebula(t, night);
  drawLightShafts(t, day);
  drawCelestial(TIME_OF_DAY);
  drawMosqueSilhouette();
}

function drawRecursive(x, y, angle, length, depth, t) {
  if (depth > MAX_DEPTH || length < 1.5) return;

  const sway   = swayAngle(depth, t);
  const jitter = noise1d(depth * 3.71 + x * 0.0013 + y * 0.0009) * 0.20;
  const fa     = angle + sway + jitter;

  const dx = Math.cos(fa) * length;
  const dy = Math.sin(fa) * length;
  const x2 = x + dx, y2 = y + dy;

  const w     = Math.max(0.5, 14 * Math.pow(1 - depth / (MAX_DEPTH + 1), 1.6));
  const alpha = 0.92 - depth / MAX_DEPTH * 0.28;

  fgCtx.beginPath();
  fgCtx.moveTo(x, y);
  fgCtx.lineTo(x2, y2);
  fgCtx.strokeStyle = branchColor(depth, alpha);
  fgCtx.lineWidth   = w;
  fgCtx.lineCap     = 'round';

  if (depth < 3) {
    const [tr, tg, tb] = currentTOD.tint;
    fgCtx.shadowColor = `rgba(${tr},${Math.round(tg*0.7)},${Math.round(tb*0.4)},0.18)`;
    fgCtx.shadowBlur  = w * 2.5;
  } else {
    fgCtx.shadowBlur = 0;
  }
  fgCtx.stroke();

  if (depth >= MAX_DEPTH - 1) drawLeaf(x2, y2, fa, length * 0.5, depth, t);

  drawRecursive(x2, y2, fa - SPREAD, length * 0.685, depth + 1, t);
  drawRecursive(x2, y2, fa + SPREAD, length * 0.685, depth + 1, t);
}

function drawLeaf(x, y, angle, size, depth, t) {
  const [tr, tg, tb] = currentTOD.tint;
  const leafSway = swayAngle(depth + 2, t + 0.4) * 1.2;
  const a = angle + leafSway;
  const s = Math.max(1.5, size * 0.9);

  fgCtx.save();
  fgCtx.translate(x, y);
  fgCtx.rotate(a + Math.PI / 2);
  fgCtx.beginPath();
  fgCtx.ellipse(0, -s * 0.5, s * 0.28, s * 0.55, 0, 0, Math.PI * 2);

  const pulse = 0.5 + 0.5 * Math.sin(t * 0.8 + x * 0.02);
  const br = currentTOD.bright;
  const lr = Math.round(lerp(lerp(100, 170, pulse), tr, 0.35) * br);
  const lg = Math.round(lerp(lerp(130, 175, pulse), tg, 0.25) * br);
  const lb = Math.round(lerp(lerp(60,  100, pulse), tb, 0.20) * br);
  fgCtx.fillStyle = `rgba(${Math.min(255,lr)},${Math.min(255,lg)},${Math.min(255,lb)},0.60)`;
  fgCtx.shadowBlur = 0;
  fgCtx.fill();
  fgCtx.restore();
}

function draw(t) {
  // Sky on background canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawSky(t);

  // Branches on foreground canvas
  fgCtx.clearRect(0, 0, fgCanvas.width, fgCanvas.height);
  const trunkLength = fgCanvas.height * 0.160;
  drawRecursive(
    fgCanvas.width  * 0.5,
    fgCanvas.height,
    -Math.PI / 2,
    trunkLength,
    0, t
  );
}

function resize() {
  canvas.width    = window.innerWidth;
  canvas.height   = window.innerHeight;
  fgCanvas.width  = window.innerWidth;
  fgCanvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);

// Apply initial fog
const fogEl = document.getElementById('fog');
if (fogEl) fogEl.style.background =
  `linear-gradient(to top, ${currentTOD.fog}ee 0%, transparent 100%)`;

resize();

function loop(ts) {
  draw(ts * 0.001);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
