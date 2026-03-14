// weather.js — Salati weather effects
// Tap ✦ to cycle: clouds → rain → snow → falling light → northern wind → off

(function () {
  const EFFECTS = ['clouds', 'rain', 'snow', 'fallinglight', 'wind', 'none'];
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

  // ═══════════════════════════════════════════════════
  // RAIN + THUNDER
  // ═══════════════════════════════════════════════════
  const rainDrops = [];
  const RAIN_COUNT = 150;
  let thunderAlpha = 0;
  let nextThunder  = randomThunderDelay();

  function randomThunderDelay() { return 6000 + Math.random() * 14000; }

  function newDrop() {
    return {
      x:     Math.random() * canvas.width * 1.4,
      y:     Math.random() * canvas.height,
      len:   Math.random() * 28 + 14,
      speed: Math.random() * 7 + 6,
      alpha: Math.random() * 0.22 + 0.10,
    };
  }

  function initRain() {
    rainDrops.length = 0;
    for (let i = 0; i < RAIN_COUNT; i++) rainDrops.push(newDrop());
  }
  initRain();
  window.addEventListener('resize', initRain);

  function drawRain(dt) {
    ctx.save();
    ctx.lineWidth = 1.2;
    for (const d of rainDrops) {
      ctx.globalAlpha = d.alpha;
      ctx.strokeStyle = 'rgba(180,210,230,1)';
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.len * 0.12, d.y + d.len);
      ctx.stroke();
      d.y += d.speed;
      d.x -= d.speed * 0.12;
      if (d.y > canvas.height) { d.y = -d.len; d.x = Math.random() * canvas.width * 1.4; }
      if (d.x < -20)           { d.x = canvas.width * 1.4; }
    }
    ctx.restore();

    nextThunder -= dt;
    if (nextThunder <= 0) { thunderAlpha = 0.18; nextThunder = randomThunderDelay(); }
    if (thunderAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = thunderAlpha;
      ctx.fillStyle   = 'rgba(220,230,255,1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      thunderAlpha = Math.max(0, thunderAlpha - 0.012);
    }
  }

  // ═══════════════════════════════════════════════════
  // SNOW
  // ═══════════════════════════════════════════════════
  const snowFlakes = [];
  const SNOW_COUNT = 80;

  function newFlake() {
    return {
      x:      Math.random() * canvas.width,
      y:      Math.random() * canvas.height,
      r:      Math.random() * 2.5 + 0.8,
      speed:  Math.random() * 0.8 + 0.3,
      drift:  (Math.random() - 0.5) * 0.4,
      alpha:  Math.random() * 0.5 + 0.2,
      wobble: Math.random() * Math.PI * 2,
    };
  }

  function initSnow() {
    snowFlakes.length = 0;
    for (let i = 0; i < SNOW_COUNT; i++) snowFlakes.push(newFlake());
  }
  initSnow();
  window.addEventListener('resize', initSnow);

  function drawSnow() {
    ctx.save();
    for (const f of snowFlakes) {
      f.wobble += 0.01;
      f.x += f.drift + Math.sin(f.wobble) * 0.3;
      f.y += f.speed;
      if (f.y > canvas.height) { Object.assign(f, newFlake()); f.y = -f.r; }
      ctx.globalAlpha = f.alpha;
      ctx.fillStyle   = 'rgba(230,240,255,1)';
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ═══════════════════════════════════════════════════
  // CLOUDS
  // ═══════════════════════════════════════════════════
  const clouds = [];
  const CLOUD_COUNT = 6;

  function newCloud(scattered) {
    const scale = 0.4 + Math.random() * 0.6;
    return {
      x:     scattered ? Math.random() * canvas.width : -300 * scale,
      y:     canvas.height * (0.03 + Math.random() * 0.90),
      scale, alpha: 0.03 + Math.random() * 0.04,
      speed: 0.06 + Math.random() * 0.10,
    };
  }

  function initClouds() {
    clouds.length = 0;
    for (let i = 0; i < CLOUD_COUNT; i++) clouds.push(newCloud(true));
  }
  initClouds();
  window.addEventListener('resize', initClouds);

  function drawClouds() {
    const puffs = [
      { dx:  0,  dy:  0, r: 55 }, { dx: -55, dy: 15, r: 40 },
      { dx: 55,  dy: 15, r: 40 }, { dx: -28, dy:-18, r: 38 },
      { dx: 28,  dy:-18, r: 38 },
    ];
    for (const c of clouds) {
      ctx.save();
      ctx.globalAlpha = c.alpha;
      ctx.beginPath();
      for (const p of puffs)
        ctx.arc(c.x + p.dx * c.scale, c.y + p.dy * c.scale, p.r * c.scale, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(210,225,240,1)';
      ctx.fill();
      ctx.restore();
      c.x += c.speed;
      if (c.x - 300 * c.scale > canvas.width) Object.assign(c, newCloud(false));
    }
  }

  // ═══════════════════════════════════════════════════
  // FALLING LIGHT
  // ═══════════════════════════════════════════════════
  const lightParticles = [];
  const LIGHT_COUNT = 35;

  function newLightParticle() {
    return {
      x:      Math.random() * canvas.width,
      y:      Math.random() * canvas.height,
      vy:     0.3 + Math.random() * 0.7,
      vx:     (Math.random() - 0.5) * 0.2,
      r:      1 + Math.random() * 2.5,
      alpha:  0.3 + Math.random() * 0.5,
      phase:  Math.random() * Math.PI * 2,
      wobble: Math.random() * 0.04,
    };
  }

  function initLight() {
    lightParticles.length = 0;
    for (let i = 0; i < LIGHT_COUNT; i++) lightParticles.push(newLightParticle());
  }
  initLight();
  window.addEventListener('resize', initLight);

  function drawFallingLight(t) {
    ctx.save();
    for (const p of lightParticles) {
      p.y += p.vy;
      p.x += p.vx + Math.sin(t * 0.5 + p.phase) * p.wobble * 10;
      if (p.y > canvas.height + 10) { Object.assign(p, newLightParticle()); p.y = -5; }

      const pulse = 0.6 + 0.4 * Math.sin(t * 1.2 + p.phase);
      const a     = p.alpha * pulse;

      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
      glow.addColorStop(0,   `rgba(255,240,160,${a * 0.8})`);
      glow.addColorStop(0.4, `rgba(255,220,100,${a * 0.3})`);
      glow.addColorStop(1,   `rgba(255,200, 60,0)`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,252,210,${a})`;
      ctx.fill();
    }
    ctx.restore();
  }

  // ═══════════════════════════════════════════════════
  // NORTHERN WIND
  // ═══════════════════════════════════════════════════
  const windStreaks = [];
  const WIND_COUNT = 80;

  function newStreak() {
    return {
      x:     Math.random() * canvas.width * 1.5,
      y:     Math.random() * canvas.height,
      len:   40 + Math.random() * 120,
      speed: 6 + Math.random() * 10,
      alpha: 0.04 + Math.random() * 0.10,
      vy:    (Math.random() - 0.5) * 0.4,
    };
  }

  function initWind() {
    windStreaks.length = 0;
    for (let i = 0; i < WIND_COUNT; i++) windStreaks.push(newStreak());
  }
  initWind();
  window.addEventListener('resize', initWind);

  function drawWind() {
    ctx.save();
    ctx.lineWidth = 0.7;
    for (const s of windStreaks) {
      ctx.globalAlpha = s.alpha;
      const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.len, s.y);
      grad.addColorStop(0,   'rgba(200,220,255,0)');
      grad.addColorStop(0.4, 'rgba(200,220,255,1)');
      grad.addColorStop(1,   'rgba(200,220,255,0)');
      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.len, s.y);
      ctx.stroke();
      s.x -= s.speed;
      s.y += s.vy;
      if (s.x + s.len < 0) { s.x = canvas.width * 1.3 + Math.random() * 200; s.y = Math.random() * canvas.height; }
    }
    ctx.restore();
  }

  // ═══════════════════════════════════════════════════
  // MAIN LOOP
  // ═══════════════════════════════════════════════════
  let lastTs = 0;

  function loop(ts) {
    const dt = ts - lastTs;
    lastTs   = ts;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const effect = EFFECTS[currentIndex];
    try {
      if      (effect === 'rain')         drawRain(dt);
      else if (effect === 'snow')         drawSnow();
      else if (effect === 'clouds')       drawClouds();
      else if (effect === 'fallinglight') drawFallingLight(ts * 0.001);
      else if (effect === 'wind')         drawWind();
    } catch (e) {
      console.warn('Weather effect error:', e);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // ═══════════════════════════════════════════════════
  // TAP TO CYCLE
  // ═══════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════
  // LABEL
  // ═══════════════════════════════════════════════════
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
        font-size: 4vw;
        color: rgba(168, 236, 192, 0.85);
        letter-spacing: 0.2em;
        text-transform: uppercase;
        pointer-events: none;
        z-index: 20;
        transition: opacity 0.5s ease;
      `;
      document.body.appendChild(el);
    }
    const names = {
      clouds: 'clouds', rain: 'rain', snow: 'snow',
      fallinglight: 'falling light', wind: 'northern wind',
      none: '— off —',
    };
    el.textContent   = names[effect] || effect;
    el.style.opacity = '1';
    clearTimeout(labelTimeout);
    labelTimeout = setTimeout(() => { el.style.opacity = '0'; }, 2000);
  }

})();
