// app.js (vertical)
document.addEventListener('DOMContentLoaded', () => {

  // ─── CONFIG ───────────────────────────────────────
  const IQAMAH_REFRESH_MS = 10000;
  const RETRY_MS = 5000;

  const IQAMAH_CSV_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vQIHxqRVYNYTS3eiGS4-mWix1pn1k3W3ropg9DCJSVQqjV7XIRhQQ-PtXsK0cHK-mT7LDVVaVTx0CGh/pub?output=csv';

  // ─── LOCATION (GPS → IP fallback) ─────────────────
  let cachedLocation = null;
  let locationInFlight = null;

  function getBrowserLocation(timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos?.coords?.latitude);
          const lon = Number(pos?.coords?.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return reject(new Error('Invalid GPS lat/lon'));
          resolve({ lat, lon });
        },
        (err) => reject(err),
        { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 6 * 60 * 60 * 1000 }
      );
    });
  }

  async function getLocation() {
    if (cachedLocation) return cachedLocation;
    if (locationInFlight) return locationInFlight;

    locationInFlight = (async () => {
      try {
        const gps = await getBrowserLocation();
        cachedLocation = gps;
        return cachedLocation;
      } catch (_) { }

      const res = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
      if (!res.ok) throw new Error(`IP lookup failed: HTTP ${res.status}`);
      const data = await res.json();
      const lat = Number(data?.latitude);
      const lon = Number(data?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('IP lookup returned invalid lat/lon');
      cachedLocation = { lat, lon };
      return cachedLocation;
    })();

    try { return await locationInFlight; }
    finally { locationInFlight = null; }
  }

  // ─── TIME HELPER ──────────────────────────────────
  function normalize12HourTime(timeStr) {
    if (!timeStr) return '';
    const s = timeStr.trim().toLowerCase().replace(/\s+/g, '');
    const m = s.match(/^(\d{1,2}:\d{2})(am|pm)$/);
    if (m) return `${m[1]} ${m[2]}`;
    return timeStr.trim().toLowerCase();
  }

  // ─── MAGHRIB = EXACT SUNSET ───────────────────────
  // Fetches sunrise + sunset from Open-Meteo but only uses
  // sunset to set the Maghrib time. Nothing is displayed.
  async function updateMaghribFromSunset() {
    const { lat, lon } = await getLocation();
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=sunrise,sunset&timezone=auto`,
      { cache: 'no-store' }
    );
    if (!res.ok) throw new Error(`Sun Times HTTP ${res.status}`);
    const data = await res.json();

    const sunsetArr = data?.daily?.sunset || [];
    const now = new Date();

    const pickNext = (arr) => {
      for (const iso of arr) {
        const d = new Date(iso);
        if (Number.isFinite(d.getTime()) && d > now) return iso;
      }
      return arr[0] || null;
    };

    const sunsetIso = pickNext(sunsetArr);
    if (sunsetIso) {
      const sunsetLocal = new Date(sunsetIso).toLocaleTimeString(undefined, {
        hour: 'numeric', minute: '2-digit', hour12: true
      });
      const el = document.getElementById('maghrib-iqamah');
      if (el) el.textContent = sunsetLocal;
    }
  }

  // ─── LOAD IQAMAH TIMES FROM CSV ───────────────────
  // Maghrib is intentionally skipped — it comes from sunset above.
  async function loadIqamahTimes() {
    const csvUrl = `${IQAMAH_CSV_URL}&_=${Date.now()}`;
    const response = await fetch(csvUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Iqamah CSV HTTP ${response.status}`);
    const text = await response.text();
    const lines = text.trim().split('\n');

    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length < 2) continue;
      const prayerNameRaw = parts[0];
      const timeValue = parts[1];
      const idName = prayerNameRaw.toLowerCase().replace(/[\s']/g, '');

      if (idName === 'maghrib') continue; // always set by sunset

      const labelId = `${idName}-iqamah`;
      const label = document.getElementById(labelId);
      if (label) label.textContent = timeValue;
    }
  }

  // ─── HIGHLIGHT NEXT PRAYER ────────────────────────
  const prayerIds = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

  const iqamahElements = {};
  const prayerRows = {};
  prayerIds.forEach(id => {
    iqamahElements[id] = document.getElementById(id + '-iqamah');
    prayerRows[id] = document.getElementById(id + 'row');
  });

  function parse12HourTimeToDate(timeStr) {
    if (!timeStr) return null;
    const now = new Date();
    const s = normalize12HourTime(timeStr);
    const [time, modifier] = s.split(' ');
    if (!time || !modifier) return null;
    const [hourStr, minuteStr] = time.split(':');
    let hours = parseInt(hourStr, 10);
    const minutes = parseInt(minuteStr, 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (modifier === 'pm' && hours !== 12) hours += 12;
    if (modifier === 'am' && hours === 12) hours = 0;
    let result = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
    if (result < now) result.setDate(result.getDate() + 1);
    return result;
  }

  function updateHighlight() {
    prayerIds.forEach(id => prayerRows[id]?.classList.remove('highlight'));

    const now = new Date();
    let nextPrayerId = null;
    let nextIqamahDate = null;

    for (const id of prayerIds) {
      const timeStr = iqamahElements[id]?.textContent?.trim();
      const dateObj = parse12HourTimeToDate(timeStr);
      if (!dateObj) continue;
      if (dateObj >= now && (!nextIqamahDate || dateObj < nextIqamahDate)) {
        nextPrayerId = id;
        nextIqamahDate = dateObj;
      }
    }

    if (nextPrayerId) prayerRows[nextPrayerId]?.classList.add('highlight');

    // Countdown
    const nameEl = document.getElementById('countdown-name');
    const timeEl = document.getElementById('countdown-time');

    if (nextPrayerId && nextIqamahDate && nameEl && timeEl) {
      const arabicNames = {
        fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء'
      };
      nameEl.textContent = arabicNames[nextPrayerId] || nextPrayerId;

      let secs = Math.max(0, Math.floor((nextIqamahDate - now) / 1000));
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      timeEl.textContent =
        `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    } else {
      if (nameEl) nameEl.textContent = '—';
      if (timeEl) timeEl.textContent = '--:--:--';
    }
  }

  // ─── TAP TO STOP CURRENT AUDIO ───────────────────
  // Only stops whatever is currently playing — future audio unaffected
  document.addEventListener('click', (e) => {
    if (e.target.id === 'weather-toggle') return;
    if (!reminderAudio.paused) {
      reminderAudio.pause();
      reminderAudio.currentTime = 0;
    }
    if (!athanAudio.paused) {
      athanAudio.pause();
      athanAudio.currentTime = 0;
    }
  }, { passive: true });

  // ─── AUDIO ────────────────────────────────────────
  const reminderAudio = new Audio('assets/reminder.mp3');
  const athanAudio    = new Audio('assets/athan.mp3');

  reminderAudio.preload = 'auto';
  athanAudio.preload    = 'auto';

  // Track which prayers have already triggered each audio
  // so they only fire once per prayer per day
  const firedReminder = new Set();
  const firedAthan    = new Set();

  function checkAudio() {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

    for (const id of prayerIds) {
      const timeStr = iqamahElements[id]?.textContent?.trim();
      const prayerDate = parse12HourTimeToDate(timeStr);
      if (!prayerDate) continue;

      const secondsUntil = (prayerDate - now) / 1000;
      const reminderKey  = `${todayKey}-${id}-reminder`;
      const athanKey     = `${todayKey}-${id}-athan`;

      // Reminder: fire once when 15 min window opens (between 15:00 and 14:50 remaining)
      if (secondsUntil <= 900 && secondsUntil > 890 && !firedReminder.has(reminderKey)) {
        firedReminder.add(reminderKey);
        reminderAudio.currentTime = 0;
        reminderAudio.play().catch(e => console.warn('Reminder audio blocked:', e));
      }

      // Athan: fire once right at prayer time (within 5 second window)
      if (secondsUntil <= 5 && secondsUntil > -5 && !firedAthan.has(athanKey)) {
        firedAthan.add(athanKey);
        athanAudio.currentTime = 0;
        athanAudio.play().catch(e => console.warn('Athan audio blocked:', e));
      }
    }
  }


  function startResilientPoller(fn, label, intervalMs, retryMs = RETRY_MS) {
    let stopped = false;
    let running = false;

    const run = async () => {
      if (stopped || running) return;
      running = true;

      if (!navigator.onLine) {
        console.warn(`Offline: "${label}" waiting...`);
        await new Promise(resolve => window.addEventListener('online', resolve, { once: true }));
        if (stopped) { running = false; return; }
      }

      try {
        await fn();
        console.log(`✅ ${label}`);
        running = false;
        if (!stopped) setTimeout(run, intervalMs);
      } catch (err) {
        console.warn(`🔁 ${label} failed, retrying...`, err);
        running = false;
        if (!stopped) setTimeout(run, retryMs);
      }
    };

    run();
    return { stop() { stopped = true; } };
  }

  // ─── LIVE TIME ────────────────────────────────────
  function updateLiveTime() {
    const now = new Date();
    const h = now.getHours() % 12 || 12;
    const m = now.getMinutes();
    const hourEl = document.getElementById('timeHour');
    const minEl  = document.getElementById('timeMinute');
    if (hourEl) hourEl.textContent = String(h).padStart(2, '0');
    if (minEl)  minEl.textContent  = String(m).padStart(2, '0');
  }

  // ─── GREGORIAN DATE ───────────────────────────────
  function updateCurrentDate() {
    const now = new Date();
    const month = now.toLocaleDateString(undefined, { month: 'long' });
    const day   = now.toLocaleDateString(undefined, { day: 'numeric' });
    const year  = now.toLocaleDateString(undefined, { year: 'numeric' });
    const el = document.getElementById('currentDate');
    if (el) el.innerHTML = `${month} ${day}<br>${year}`;
  }

  // ─── WEATHER ──────────────────────────────────────
  async function updateWeather() {
    const { lat, lon } = await getLocation();
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`,
      { cache: 'no-store' }
    );
    if (!res.ok) throw new Error(`Weather HTTP ${res.status}`);
    const data = await res.json();
    const temp = Math.round(data.current_weather.temperature);
    const el = document.getElementById('currentWeather');
    if (el) el.innerHTML = `<span id="tempNumber">${temp}°</span>`;
  }

  // ─── HIJRI DATE ───────────────────────────────────
  async function fetchHijriDate() {
    const today = new Date();
    const day   = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year  = today.getFullYear();
    const res = await fetch(`https://api.aladhan.com/v1/gToH?date=${day}-${month}-${year}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Hijri HTTP ${res.status}`);
    const json = await res.json();
    const hijri = json?.data?.hijri;
    const el = document.getElementById('hijriDate');
    if (!el) return;
    if (hijri?.day && hijri?.year && hijri?.month?.en) {
      el.innerHTML = `${hijri.month.en} ${hijri.day}<br>${hijri.year}`;
    } else {
      el.textContent = '—';
    }
  }

  // ─── DAY/NIGHT THEME SHIFT ────────────────────────
  // Shifts table rows and panels between warm day tones and cool night tones
  function updateDayNightTheme() {
    const hour = new Date().getHours() + new Date().getMinutes() / 60;

    // Keyframes: [hour, rowBg, panelBg, rowHighlight]
    const keys = [
      { h:  0, row: '13,31,20',  panel: '13,31,20',  hi: '30,77,48'  },
      { h:  6, row: '40,28,12',  panel: '38,26,10',  hi: '90,55,15'  }, // warm sunrise
      { h:  9, row: '20,38,28',  panel: '18,36,26',  hi: '35,90,55'  }, // fresh morning
      { h: 12, row: '15,42,32',  panel: '14,40,30',  hi: '25,95,58'  }, // bright noon
      { h: 16, row: '30,35,20',  panel: '28,33,18',  hi: '60,80,25'  }, // golden hour
      { h: 18, row: '45,22,10',  panel: '42,20,8',   hi: '95,45,10'  }, // sunset orange
      { h: 20, row: '20,18,35',  panel: '18,16,32',  hi: '45,35,80'  }, // dusk purple
      { h: 22, row: '13,16,28',  panel: '11,14,26',  hi: '28,35,70'  }, // deep night blue
      { h: 24, row: '13,31,20',  panel: '13,31,20',  hi: '30,77,48'  },
    ];

    // Find surrounding keys and interpolate
    let a = keys[0], b = keys[1];
    for (let i = 0; i < keys.length - 1; i++) {
      if (hour >= keys[i].h && hour <= keys[i+1].h) {
        a = keys[i]; b = keys[i+1]; break;
      }
    }
    const t = (a.h === b.h) ? 0 : (hour - a.h) / (b.h - a.h);
    const ease = t * t * (3 - 2 * t);

    function lerpRgb(c1, c2, t) {
      const [r1,g1,b1] = c1.split(',').map(Number);
      const [r2,g2,b2] = c2.split(',').map(Number);
      return `${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)}`;
    }

    const rowRgb   = lerpRgb(a.row,   b.row,   ease);
    const panelRgb = lerpRgb(a.panel, b.panel, ease);
    const hiRgb    = lerpRgb(a.hi,    b.hi,    ease);

    // Apply to CSS custom properties
    const root = document.documentElement;
    root.style.setProperty('--row-bg',    `rgba(${rowRgb},0.92)`);
    root.style.setProperty('--panel-bg',  `rgba(${panelRgb},0.92)`);
    root.style.setProperty('--row-hi-from', `rgba(${hiRgb},0.90)`);
    root.style.setProperty('--row-hi-to',   `rgba(${hiRgb},0.95)`);
  }


  function syncPanelHeights() {
    const table = document.getElementById('prayer-table');
    const left  = document.getElementById('panel-left');
    const right = document.getElementById('panel-right');
    if (!table || !left || !right) return;

    const tableH   = table.offsetHeight;
    const panelH   = Math.round(tableH * (2 / 3));
    const tableTop = table.offsetTop;
    const panelTop = tableTop + (tableH - panelH) / 2;

    left.style.height  = panelH + 'px';
    right.style.height = panelH + 'px';
    left.style.top     = panelTop + 'px';
    right.style.top    = panelTop + 'px';
  }

  // ─── MAIN ─────────────────────────────────────────
  function main() {
    updateHighlight();
    updateDayNightTheme();
    setInterval(() => {
      updateHighlight();
      checkAudio();
    }, 1000);
    setInterval(updateDayNightTheme, 60000);

    updateLiveTime();
    setInterval(updateLiveTime, 1000);

    updateCurrentDate();
    setInterval(updateCurrentDate, 60000);

    syncPanelHeights();
    window.addEventListener('resize', syncPanelHeights);

    startResilientPoller(updateWeather, 'Weather', 1800000);
    startResilientPoller(fetchHijriDate, 'Hijri Date', 3600000);

    startResilientPoller(loadIqamahTimes, 'Iqamah Times', IQAMAH_REFRESH_MS);
    startResilientPoller(updateMaghribFromSunset, 'Maghrib (Sunset)', 3600000);
  }

  main();
});
