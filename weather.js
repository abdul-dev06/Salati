// weather.js
// Hold anywhere for 1 second to cycle: none → rain → snow → clouds → aurora

(function () {
  const EFFECTS = ['none', 'rain', 'snow', 'clouds', 'aurora'];
  let currentIndex = 0;

  // ─── Canvas ───────────────────────────────────────
  const canvas = document.getElementById('weather-canvas');
  const ctx    = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // ─── RAIN + THUNDER ───────────────────────────────
  const rainDrops = [];
  const RAIN_COUNT = 100;
  let thunderAlpha  = 0;
  let nextThunder   = randomThunderDelay();

  function randomThunderDelay() { return 6000 + Math.random() * 14000; }

  function initRain() {
    rainDrops.length = 0;
    for (let i = 0; i < RAIN_COUNT; i++) {
      rainDrops.push(newDrop());
    }
  }

  function newDrop() {
    return {
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      len:   Math.random() * 18 + 8,
      speed: Math.random() * 4 + 3,
      alpha: Math.random() * 0.14 + 0.05,
    };
  }

  initRain();
  window.addEventListener('resize', initRain);

  function drawRain(dt) {
    ctx.save();
    ctx.lineWidth = 0.8;
    for (const d of rainDrops) {
      ctx.globalAlpha = d.alpha;
      ctx.strokeStyle = 'rgba(180, 210, 230, 1)';
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.len * 0.15, d.y + d.len);
      ctx.stroke();
      d.y += d.speed;
      d.x -= d.speed * 0.15;
      if (d.y > canvas.height) { d.y = -d.len; d.x = Math.random() * canvas.width; }
    }
    ctx.restore();

    // Thunder flash
    nextThunder -= dt;
    if (nextThunder <= 0) {
      thunderAlpha  = 0.18;
      nextThunder   = randomThunderDelay();
    }
    if (thunderAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = thunderAlpha;
      ctx.fillStyle   = 'rgba(220, 230, 255, 1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      thunderAlpha = Math.max(0, thunderAlpha - 0.012);
    }
  }

  // ─── SNOW ─────────────────────────────────────────
  const snowFlakes = [];
  const SNOW_COUNT = 80;

  function initSnow() {
    snowFlakes.length = 0;
    for (let i = 0; i < SNOW_COUNT; i++) {
      snowFlakes.push(newFlake());
    }
  }

  function newFlake() {
    return {
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      r:     Math.random() * 2.5 + 0.8,
      speed: Math.random() * 0.8 + 0.3,
      drift: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.5 + 0.2,
      wobble: Math.random() * Math.PI * 2,
    };
  }

  initSnow();
  window.addEventListener('resize', initSnow);

  function drawSnow(t) {
    ctx.save();
    for (const f of snowFlakes) {
      f.wobble += 0.01;
      f.x += f.drift + Math.sin(f.wobble) * 0.3;
      f.y += f.speed;
      if (f.y > canvas.height) { Object.assign(f, newFlake()); f.y = -f.r; }

      ctx.globalAlpha = f.alpha;
      ctx.fillStyle   = 'rgba(230, 240, 255, 1)';
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ─── CLOUDS ───────────────────────────────────────
  const clouds = [];
  const CLOUD_COUNT = 4;

  function initClouds() {
    clouds.length = 0;
    for (let i = 0; i < CLOUD_COUNT; i++) {
      clouds.push(newCloud(true));
    }
  }

  function newCloud(scattered) {
    const scale = 0.5 + Math.random() * 0.8;
    return {
      x:     scattered
               ? Math.random() * canvas.width
               : -300 * scale,
      y:     canvas.height * (0.04 + Math.random() * 0.28),
      scale: scale,
      alpha: 0.05 + Math.random() * 0.07,
      speed: 0.08 + Math.random() * 0.14,   // slower
    };
  }

  initClouds();
  window.addEventListener('resize', initClouds);

  function drawCloudShape(cx, cy, scale, alpha) {
    // Use offscreen compositing to avoid puff overlap darkening
    const puffs = [
      { dx:  0,   dy:  0,  r: 55 },
      { dx: -55,  dy: 15,  r: 40 },
      { dx:  55,  dy: 15,  r: 40 },
      { dx: -28,  dy:-18,  r: 38 },
      { dx:  28,  dy:-18,  r: 38 },
    ];

    ctx.save();
    ctx.globalAlpha   = alpha;
    ctx.globalCompositeOperation = 'source-over';

    // Draw onto a temp path using union (fill all, one alpha)
    ctx.beginPath();
    for (const p of puffs) {
      ctx.arc(cx + p.dx * scale, cy + p.dy * scale, p.r * scale, 0, Math.PI * 2);
    }
    ctx.fillStyle = 'rgba(210, 225, 240, 1)';
    ctx.fill();
    ctx.restore();
  }

  function drawClouds() {
    for (const c of clouds) {
      drawCloudShape(c.x, c.y, c.scale, c.alpha);
      c.x += c.speed;
      if (c.x - 300 * c.scale > canvas.width) {
        Object.assign(c, newCloud(false));
      }
    }
  }

  // ─── AURORA ───────────────────────────────────────
  let auroraT = 0;

  function drawAurora() {
    auroraT += 0.003;
    const W = canvas.width;
    const H = canvas.height;
    const BANDS = 3;

    ctx.save();
    for (let b = 0; b < BANDS; b++) {
      const offset  = (b / BANDS) * Math.PI * 2;
      const yBase   = H * (0.08 + b * 0.07);
      const hue1    = 140 + b * 30;
      const hue2    = 180 + b * 25;

      ctx.beginPath();
      ctx.moveTo(0, yBase);

      const STEPS = 80;
      for (let i = 0; i <= STEPS; i++) {
        const x = (i / STEPS) * W;
        const wave1 = Math.sin(auroraT + offset + i * 0.08) * H * 0.04;
        const wave2 = Math.sin(auroraT * 1.3 + offset + i * 0.05) * H * 0.025;
        const y = yBase + wave1 + wave2;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }

      // Band thickness
      const thickness = H * (0.06 + 0.02 * Math.sin(auroraT + offset));
      for (let i = STEPS; i >= 0; i--) {
        const x = (i / STEPS) * W;
        const wave1 = Math.sin(auroraT + offset + i * 0.08) * H * 0.04;
        const wave2 = Math.sin(auroraT * 1.3 + offset + i * 0.05) * H * 0.025;
        const y = yBase + wave1 + wave2 + thickness;
        ctx.lineTo(x, y);
      }
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, yBase, 0, yBase + thickness);
      const pulse = 0.5 + 0.5 * Math.sin(auroraT * 0.7 + offset);
      grad.addColorStop(0,   `hsla(${hue1}, 80%, 65%, 0)`);
      grad.addColorStop(0.3, `hsla(${hue1}, 80%, 65%, ${0.07 + pulse * 0.05})`);
      grad.addColorStop(0.7, `hsla(${hue2}, 70%, 60%, ${0.07 + pulse * 0.05})`);
      grad.addColorStop(1,   `hsla(${hue2}, 70%, 60%, 0)`);
      ctx.fillStyle = grad;
      ctx.fill();
    }
    ctx.restore();
  }

  // ─── MAIN LOOP ────────────────────────────────────
  let lastTs = 0;

  function loop(ts) {
    const dt = ts - lastTs;
    lastTs   = ts;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const effect = EFFECTS[currentIndex];
    if      (effect === 'rain')   drawRain(dt);
    else if (effect === 'snow')   drawSnow(ts * 0.001);
    else if (effect === 'clouds') drawClouds();
    else if (effect === 'aurora') drawAurora();

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // ─── TAP ICON TO CYCLE ────────────────────────────
  function attachToggle() {
    const btn = document.getElementById('weather-toggle');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentIndex = (currentIndex + 1) % EFFECTS.length;
      showLabel(EFFECTS[currentIndex]);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachToggle);
  } else {
    attachToggle();
  }

  // ─── LABEL ────────────────────────────────────────
  let labelTimeout = null;

  function showLabel(effect) {
    let el = document.getElementById('weather-label');
    if (!el) {
      el = document.createElement('div');
      el.id = 'weather-label';
      el.style.cssText = `
        position: fixed;
        bottom: 12vh;
        left: 50%;
        transform: translateX(-50%);
        font-family: 'Quicksand', sans-serif;
        font-size: 2.5vw;
        color: rgba(168, 236, 192, 0.85);
        letter-spacing: 0.2em;
        text-transform: uppercase;
        pointer-events: none;
        z-index: 20;
        transition: opacity 0.5s ease;
      `;
      document.body.appendChild(el);
    }
    el.textContent  = effect === 'none' ? '— off —' : effect;
    el.style.opacity = '1';
    clearTimeout(labelTimeout);
    labelTimeout = setTimeout(() => { el.style.opacity = '0'; }, 2000);
  }

})();
