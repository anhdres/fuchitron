const COLORS = [
  '#FFFFFF', '#C8102E', '#0033A0', '#1c1c1c', '#00843D', '#FFD100', '#6EC1E4', '#800020', '#FF6A00', '#5A2D81',
  '#FF4FA3', // rosa
  '#7B4B2A', // marrón
  '#39FF14', // verde neón
  '#FFFF00'  // amarillo neón
];

const state = {
  teamA: '',
  teamB: '',
  colorA1: '#C8102E',
  colorB1: '#0033A0',
  scoreA: 0,
  scoreB: 0,
  goals: [],
  periodMinutes: 45,
  currentHalf: 1,
  halfSeconds: 0,
  running: false,
  finished: false,
  matchStarted: false,
  firstHalfEndSeconds: null,
  matchEndSeconds: null,
  matchStartTS: null,
  lang: detectLang(),
  includeDate: false,
  includeDateText: true,
  stylizedText: true,
  keepScreenOn: false,
  wakeLock: null,
  spectateCode: null,
};

// Supabase for spectator links
const SUPABASE_URL = 'https://mbczsqzbgwimbelpglks.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iY3pzcXpiZ3dpbWJlbHBnbGtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NDM3NjEsImV4cCI6MjA5MTQxOTc2MX0.ig4ZQFLvigtjGBWMb5gJZKmKW4vCJbHam0_NfKAvL3s';

const $ = id => document.getElementById(id);
const els = {
  teamA: $('teamA'), teamB: $('teamB'),
  labelA: $('labelA'), labelB: $('labelB'),
  tagA: $('tagA'), tagB: $('tagB'),
  chipA: $('chipA'), chipB: $('chipB'),
  scoreA: $('scoreA'), scoreB: $('scoreB'),
  plusA: $('plusA'), plusB: $('plusB'),
  goalsList: $('goalsList'), timelineSection: $('timelineSection'),
  periodMinutes: $('periodMinutes'), periodLabel: $('periodLabel'), livePill: $('livePill'),
  durationGroup: $('durationGroup'), langGroup: $('langGroup'),
  clock: $('clock'), overtime: $('overtime'),
  startPause: $('startPause'), nextPeriod: $('nextPeriod'), resetTimer: $('resetTimer'),
  shareText: $('shareText'), copyText: $('copyText'), copyImage: $('copyImage'), downloadImage: $('downloadImage'),
  shareBtn: $('shareBtn'), shareDialog: $('shareDialog'), closeShare: $('closeShare'),
  fullscreenBtn: $('fullscreenBtn'),
  shareCanvas: $('shareCanvas'), shareTextPreview: $('shareTextPreview'),
  shareImageBtn: $('shareImageBtn'), shareTextBtn: $('shareTextBtn'), createSpectateBtn: $('createSpectateBtn'),
  copyImageBtn: $('copyImageBtn'), copyTextBtn: $('copyTextBtn'),
  downloadImageBtn: $('downloadImageBtn'), downloadTxtBtn: $('downloadTxtBtn'),
  settingsBtn: $('settingsBtn'),
  keepScreenOn: $('keepScreenOn'),
  lblKeepScreenOn: $('lblKeepScreenOn'),
  settingsDialog: $('settingsDialog'),
  closeSettings: $('closeSettings'),
  installApp: $('installApp'), installHint: $('installHint'),
  tagline: $('tagline'),
  lblDuration: $('lblDuration'), lblTeamA: $('lblTeamA'), lblColorA: $('lblColorA'),
  lblTeamB: $('lblTeamB'), lblColorB: $('lblColorB'), lblLang: $('lblLang'),
  includeDate: $('includeDate'), lblIncludeDate: $('lblIncludeDate'),
  includeDateText: $('includeDateText'), lblIncludeDateText: $('lblIncludeDateText'),
  stylizedText: $('stylizedText'), lblStylizedText: $('lblStylizedText'),
  updateBanner: $('updateBanner'), updateNow: $('updateNow'),
  paletteA1: $('paletteA1'), paletteB1: $('paletteB1'),
  goalBanner: $('goalBanner'),
};

let tick = null;
const logoImg = new Image();
logoImg.src = '/icons/logo.svg';

const save = () => {
  if (state.spectateCode) localStorage.setItem('fuchitron_spectate_code', state.spectateCode);
  localStorage.setItem('fuchitron_v4', JSON.stringify(state));
};
const load = () => {
  try { Object.assign(state, JSON.parse(localStorage.getItem('fuchitron_v4') || '{}')); } catch (e) { console.warn('Fuchitron: no pude cargar datos guardados.', e); }
  state.spectateCode = localStorage.getItem('fuchitron_spectate_code') || null;
};

// Preserve lang if set from URL before load() overwrites it
const urlLang = new URLSearchParams(location.search).get('lang');
const urlLangValid = urlLang && I18N[urlLang];
const pad = n => String(n).padStart(2,'0');
const clockTxt = s => `${pad(Math.floor(s/60))}:${pad(s%60)}`;

function overtimeText() {
  const target = state.periodMinutes * 60;
  const over = state.halfSeconds - target;
  if (over <= 0) return '';
  return `+${Math.floor((over - 1) / 60) + 1}`;
}

function hexToRgb(hex) {
  const c = hex.replace('#', '');
  return {
    r: parseInt(c.substring(0, 2), 16),
    g: parseInt(c.substring(2, 4), 16),
    b: parseInt(c.substring(4, 6), 16)
  };
}

function isLight(hex) {
  const { r, g, b } = hexToRgb(hex);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150;
}

function applyTeamColors() {
  document.documentElement.style.setProperty('--a1', state.colorA1);
  document.documentElement.style.setProperty('--b1', state.colorB1);

  els.chipA.style.borderColor = state.colorA1;
  els.chipB.style.borderColor = state.colorB1;
  const tagARgb = hexToRgb(state.colorA1);
  const tagBRgb = hexToRgb(state.colorB1);
  els.tagA.style.color = `rgba(${tagARgb.r}, ${tagARgb.g}, ${tagARgb.b}, 0.9)`;
  els.tagB.style.color = `rgba(${tagBRgb.r}, ${tagBRgb.g}, ${tagBRgb.b}, 0.9)`;

  // Gradiente con color principal en botones
  const aRgb = hexToRgb(state.colorA1);
  const bRgb = hexToRgb(state.colorB1);

  els.plusA.style.background = `linear-gradient(160deg, ${state.colorA1}, rgba(${aRgb.r}, ${aRgb.g}, ${aRgb.b}, 0.55))`;
  els.plusA.style.color = isLight(state.colorA1) ? '#000000' : '#FFFFFF';
  els.plusA.style.borderColor = '#FFFFFF';

  els.plusB.style.background = `linear-gradient(160deg, ${state.colorB1}, rgba(${bRgb.r}, ${bRgb.g}, ${bRgb.b}, 0.55))`;
  els.plusB.style.color = isLight(state.colorB1) ? '#000000' : '#FFFFFF';
  els.plusB.style.borderColor = '#FFFFFF';
}

function renderPalette(container, key) {
  container.innerHTML = '';
  COLORS.forEach(color => {
    const b = document.createElement('button');
    b.className = 'swatch';
    b.style.background = color;
    if (state[key] === color) b.classList.add('active');
    b.addEventListener('click', () => { state[key] = color; save(); render(); });
    container.appendChild(b);
  });
}

function formatEndMinute(absSeconds, periodMinutes) {
  const target = periodMinutes * 60;
  const actual = Math.floor(absSeconds / 60);
  const over = actual - periodMinutes;
  if (over === 0) return `${periodMinutes}'`;
  if (over > 0) return `${periodMinutes}'+${over}'`;
  return `${periodMinutes}'-${periodMinutes - actual}'`;
}

function renderGoals() {
  if (!els.goalsList) return;

  els.goalsList.innerHTML = '';

  const events = [];

  // Kickoff: show once Iniciar 1T has been pressed (persists through 2T and after match ends)
  if (state.matchStarted) {
    events.push({
      id: 'kickoff',
      kind: 'marker',
      minuteAbs: 0,
      text: `⏱️ Inicio del partido`
    });
  }

  // Half-time marker: show once 1T has ended
  if (state.firstHalfEndSeconds !== null) {
    const halfEndMinute = Math.floor(state.firstHalfEndSeconds / 60);
    const label = formatEndMinute(state.firstHalfEndSeconds, state.periodMinutes);
    events.push({
      id: 'half',
      kind: 'marker',
      minuteAbs: halfEndMinute,
      text: `⏱️ ${t('final1T')} (${label})`
    });
  }

  // Final marker: show when match is over
  if (state.finished && state.matchEndSeconds !== null) {
    const actualFirstHalfMinutes = state.firstHalfEndSeconds !== null
      ? Math.floor(state.firstHalfEndSeconds / 60)
      : state.periodMinutes;
    const matchEndMinute = actualFirstHalfMinutes + Math.floor(state.matchEndSeconds / 60);
    const label = formatEndMinute(state.matchEndSeconds, state.periodMinutes);
    events.push({
      id: 'full',
      kind: 'marker',
      minuteAbs: matchEndMinute,
      text: `⏱️ ${t('final2T')} (${label})`
    });
  }

  (state.goals || []).forEach((g) => {
    const actualFirstHalfMinutes = state.firstHalfEndSeconds !== null
      ? Math.floor(state.firstHalfEndSeconds / 60)
      : state.periodMinutes;
    const minuteAbs = g.half === 1 ? g.minute : actualFirstHalfMinutes + g.minute;
    events.push({
      id: g.id,
      kind: 'goal',
      minuteAbs,
      text: `⚽ ${g.team.toUpperCase()}`
    });
  });

  events.sort((a, b) => a.minuteAbs - b.minuteAbs);

  if (!events.length) {
    const li = document.createElement('li');
    li.innerHTML = `<span class="goal-meta">${t('sinEventos')}</span>`;
    els.goalsList.appendChild(li);
    return;
  }

  events.forEach((item) => {
    const li = document.createElement('li');

    const minuteLabel = item.kind === 'goal'
      ? (item.minuteAbs === 0 ? '-' : `${item.minuteAbs}'`)
      : `${item.minuteAbs}'`;

    if (item.kind === 'marker') {
      li.innerHTML = `
        <span class="event-minute">${minuteLabel}</span>
        <span class="goal-meta">${item.text}</span>
      `;
      li.classList.add('timeline-marker');
    } else {
      li.innerHTML = `
        <span class="event-minute">${minuteLabel}</span>
        <span class="goal-meta">${item.text}</span>
        <button class="ghost delete-goal" data-id="${item.id}">${t('borrar')}</button>
      `;
    }

    els.goalsList.appendChild(li);
  });

  document.querySelectorAll('.delete-goal').forEach(btn => btn.addEventListener('click', () => deleteGoalById(btn.dataset.id)));
}

function render() {
  els.teamA.value = state.teamA;
  els.teamB.value = state.teamB;
  els.labelA.textContent = state.teamA ? state.teamA.toUpperCase() : '';
  els.labelB.textContent = state.teamB ? state.teamB.toUpperCase() : '';
  // Always derive scores from goals array to prevent sync drift
  els.scoreA.textContent = (state.goals || []).filter(g => g.side === 'A').length;
  els.scoreB.textContent = (state.goals || []).filter(g => g.side === 'B').length;
  els.periodLabel.textContent = state.finished ? t('resultadoFinal') : (state.currentHalf === 1 ? t('t1') : t('t2'));
  els.periodLabel.hidden = !state.matchStarted && !state.finished;
  updatePillSelection();
  els.clock.hidden = state.finished || !state.matchStarted;
  els.overtime.hidden = state.finished || !state.matchStarted;
  if (state.currentHalf === 1) {
    els.nextPeriod.querySelector('span:last-child').textContent = t('terminar1T');
    els.nextPeriod.querySelector('.material-symbols-outlined').textContent = 'timer_off';
  } else {
    els.nextPeriod.querySelector('span:last-child').textContent = state.finished ? t('finalizado') : t('terminarPartido');
    els.nextPeriod.querySelector('.material-symbols-outlined').textContent = 'timer_off';
  }
  els.clock.textContent = clockTxt(state.halfSeconds);
  els.overtime.textContent = overtimeText();
  const [pIcon, pLabel] = els.startPause.querySelectorAll('span');
  if (state.running) {
    pIcon.textContent = 'timer_pause';
    pLabel.textContent = t('pausar');
  } else if (state.finished) {
    pIcon.textContent = 'timer_off';
    pLabel.textContent = t('finalizado');
  } else {
    pIcon.textContent = 'timer_play';
    pLabel.textContent = state.halfSeconds ? t('reanudar') : (state.currentHalf === 1 ? t('iniciar1T') : t('iniciar2T'));
  }
  els.startPause.classList.toggle('running', state.running);

  els.livePill.hidden = !state.running;
  els.livePill.classList.toggle('running', state.running);
  if (els.livePill.lastChild) els.livePill.lastChild.textContent = t('enVivo');
  els.timelineSection.hidden = !state.matchStarted && state.goals.length === 0;

  applyTeamColors();
  renderPalette(els.paletteA1, 'colorA1');
  renderPalette(els.paletteB1, 'colorB1');
  renderGoals();
}

function getElapsedSeconds() {
  if (!state.matchStartTS) return state.halfSeconds;
  return Math.floor((Date.now() - state.matchStartTS) / 1000);
}

function goalMinute() {
  if (!state.matchStarted) return 0;
  return Math.max(1, Math.floor(getElapsedSeconds() / 60));
}

let goalFxTimeout = null;
function triggerGoalFx(side) {
  const target = side === 'A' ? els.scoreA : els.scoreB;
  document.body.classList.remove('goal-flash-a', 'goal-flash-b');
  target.classList.remove('goal-burst', 'score-pop');
  els.goalBanner.classList.remove('show');
  void target.offsetWidth;

  document.body.classList.add(side === 'A' ? 'goal-flash-a' : 'goal-flash-b');
  target.classList.add('goal-burst', 'score-pop');
  els.goalBanner.classList.add('show');

  if (navigator.vibrate) {
    navigator.vibrate([60, 40, 60]);
  }

  if (goalFxTimeout) clearTimeout(goalFxTimeout);
  goalFxTimeout = setTimeout(() => {
    document.body.classList.remove('goal-flash-a', 'goal-flash-b');
    target.classList.remove('goal-burst', 'score-pop');
    els.goalBanner.classList.remove('show');
    goalFxTimeout = null;
  }, 800);
}

function addGoal(side) {
  const g = { id: crypto.randomUUID(), side, team: side === 'A' ? state.teamA || t('local') : state.teamB || t('visitante'), minute: goalMinute(), half: state.currentHalf, absSeconds: state.halfSeconds };
  state.goals.push(g);
  save();
  render();
  triggerGoalFx(side);
  if (state.spectateCode) updateSpectateMatch(state.spectateCode);
}

function deleteGoalById(id) {
  const idx = state.goals.findIndex(g => g.id === id);
  if (idx < 0) return;
  state.goals.splice(idx, 1);
  save(); render();
}

function undoLastGoal() {
  const last = state.goals[state.goals.length - 1];
  if (last) deleteGoalById(last.id);
}

// Screen Wake Lock — keep display on during match
async function requestWakeLock() {
  if (!state.keepScreenOn || !('wakeLock' in navigator)) return;
  try {
    state.wakeLock = await navigator.wakeLock.request('screen');
  } catch (e) { state.wakeLock = null; }
}
async function releaseWakeLock() {
  if (state.wakeLock) {
    await state.wakeLock.release();
    state.wakeLock = null;
  }
}
// Re-acquire wake lock when tab becomes visible again
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && state.running && state.keepScreenOn) {
    await requestWakeLock();
  }
});

function toggleClock() {
  if (state.finished) return;
  state.running = !state.running;
  if (state.running) {
    if (!state.matchStarted) { state.matchStarted = true; state.matchStartTS = Date.now(); }
    tick = setInterval(() => {
      const elapsed = getElapsedSeconds();
      state.halfSeconds = elapsed;
      els.clock.textContent = clockTxt(elapsed);
      els.overtime.textContent = overtimeText();
      save();
    }, 1000);
    requestWakeLock();
  } else {
    clearInterval(tick);
    releaseWakeLock();
  }
  save(); render();
  if (state.spectateCode) updateSpectateMatch(state.spectateCode);
}

// Page Visibility API — recalculate time when tab comes back
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.running) {
    const elapsed = getElapsedSeconds();
    state.halfSeconds = elapsed;
    els.clock.textContent = clockTxt(elapsed);
    els.overtime.textContent = overtimeText();
  }
});

function resetTimer() {
  const ok = window.confirm(t('confirmarNuevoPartido'));
  if (!ok) return;

  state.running = false;
  clearInterval(tick);
  releaseWakeLock();

  // Reinicia partido (tiempo + goles), conserva customización de equipos.
  state.halfSeconds = 0;
  state.currentHalf = 1;
  state.scoreA = 0;
  state.scoreB = 0;
  state.goals = [];
  state.finished = false;
  state.matchStarted = false;
  state.firstHalfEndSeconds = null;
  state.matchEndSeconds = null;
  state.matchStartTS = null;

  save();
  render();
}
function nextPeriod() {
  state.running = false;
  clearInterval(tick);
  releaseWakeLock();

  if (state.currentHalf === 1) {
    if (!window.confirm(t('confirmarTerminar1T'))) return;
    state.firstHalfEndSeconds = getElapsedSeconds();
    state.currentHalf = 2;
    state.halfSeconds = 0;
    state.matchStartTS = Date.now();
  } else if (!state.finished) {
    if (!window.confirm(t('confirmarTerminarPartido'))) return;
    state.matchEndSeconds = getElapsedSeconds();
    state.finished = true;
    releaseWakeLock();
  }

  save();
  render();
  if (state.spectateCode) updateSpectateMatch(state.spectateCode);
}

function buildShareText(stylized = true) {
  const SEP = '---';
  const local = state.teamA || 'LOCAL';
  const away = state.teamB || 'AWAY';
  const lines = [];

  // Score line
  lines.push(stylized
    ? `*${local}* \`${state.scoreA} - ${state.scoreB}\` *${away}*`
    : `${local} ${state.scoreA} - ${state.scoreB} ${away}`);

  // Date (if enabled)
  if (state.includeDateText) {
    const dateStr = new Date().toLocaleDateString(state.lang === 'zh' ? 'zh-CN' : state.lang, { day: 'numeric', month: 'long', year: 'numeric' });
    lines.push(stylized ? `_${dateStr}_` : dateStr);
  }

  // Goals + status — only if match was started
  if (state.matchStarted) {
    lines.push(SEP);
    const goalsA = (state.goals || []).filter(g => g.side === 'A');
    const goalsB = (state.goals || []).filter(g => g.side === 'B');
    const absGoalMinute = (g) => {
      if (g.minute === 0) return 0;
      const base = g.half === 1 ? 0 : state.periodMinutes;
      return base + g.minute;
    };
    if (goalsA.length) lines.push(`⚽ ${local}  (${goalsA.map(g => `${absGoalMinute(g)}'`).join(', ')})`);
    if (goalsB.length) lines.push(`⚽ ${away}  (${goalsB.map(g => `${absGoalMinute(g)}'`).join(', ')})`);

    // Status — with overtime notation (e.g. 10+1' or 4' if under)
    const overtimeSym = (absSeconds, periodMinutes) => {
      const actual = Math.floor(absSeconds / 60);
      const over = actual - periodMinutes;
      if (over > 0) return ` ⚡${over}'`;
      if (over < 0) return ` (${actual}' - ${periodMinutes}')`;
      return '';
    };
    const statusLine = (label, sym) => stylized
      ? `⏱️ _${label}${sym}_`
      : `⏱️ ${label}${sym}`;
    if (state.finished) {
      const sym = overtimeSym(state.matchEndSeconds, state.periodMinutes * 2);
      lines.push(statusLine(t('finalPartido'), sym));
    } else if (state.firstHalfEndSeconds !== null) {
      const sym = overtimeSym(state.firstHalfEndSeconds, state.periodMinutes);
      lines.push(statusLine(t('final1T'), sym));
    } else if (state.matchStarted) {
      lines.push(statusLine(t('inicioPartido'), ''));
    }
  }

  lines.push(SEP);
  lines.push('Fuchitron.app');

  return lines.join('\n');
}

async function shareWhatsApp() {
  const text = buildShareText(state.stylizedText);
  if (navigator.share) { try { await navigator.share({ text }); return; } catch {} }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

async function copyText() { try { await navigator.clipboard.writeText(buildShareText(state.stylizedText)); alert(t('copiarToast')); } catch { alert(t('copiarError')); } }

// Shared offscreen canvas for share image rendering
let shareCanvasCache = null;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function buildCanvasToElement(c) {
  const W = 1080, H = 1080;
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  // ── Background ──────────────────────────────────────────────
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, W, H);

  const goalsA = (state.goals || []).filter(g => g.side === 'A').length;
  const goalsB = (state.goals || []).filter(g => g.side === 'B').length;
  const clubA = state.teamA || '';
  const clubB = state.teamB || '';

  // ── Radial glows behind cards — light sources from outside the frame ─
  const cardW = 430, cardH = 567, cardY = 260;
  const cardAX = W / 2 - cardW - 25;
  const cardBX = W / 2 + 25;
  const scoreAX = cardAX + cardW / 2;
  const scoreBX = cardBX + cardW / 2;
  const cardCenterYA = cardY + cardH / 2;
  const cardCenterYB = cardY + cardH / 2;

  // Left glow — center outside the canvas at the left edge
  const glowA = ctx.createRadialGradient(-80, cardCenterYA, 0, -80, cardCenterYA, 600);
  glowA.addColorStop(0, state.colorA1 + 'cc');
  glowA.addColorStop(0.4, state.colorA1 + '44');
  glowA.addColorStop(1, 'transparent');
  ctx.fillStyle = glowA;
  ctx.fillRect(0, 0, W, H);

  // Right glow — center outside the canvas at the right edge
  const glowB = ctx.createRadialGradient(W + 80, cardCenterYB, 0, W + 80, cardCenterYB, 600);
  glowB.addColorStop(0, state.colorB1 + 'cc');
  glowB.addColorStop(0.4, state.colorB1 + '44');
  glowB.addColorStop(1, 'transparent');
  ctx.fillStyle = glowB;
  ctx.fillRect(0, 0, W, H);

  // ── Header banner — floating, auto-width based on text ─────────
  const bannerY = 45, bannerH = 64;
  const bannerText = state.finished ? t('resultadoFinal') : t('enVivo');
  ctx.font = '900 34px "Space Grotesk"';
  const textW = ctx.measureText(bannerText).width;
  const bannerPad = 32;
  const bannerW = textW + bannerPad * 2;
  const bannerX = (W - bannerW) / 2;
  ctx.fillStyle = '#39FF14';
  ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.fillText(bannerText, W / 2, bannerY + bannerH - 18);

  // ── LOCAL / VISITANTE labels — smaller, in team color ───────
  ctx.font = '900 36px "Space Grotesk"';
  ctx.textAlign = 'center';
  ctx.fillStyle = state.colorA1;
  ctx.fillText(t('local'), scoreAX, cardY - 18);
  ctx.fillStyle = state.colorB1;
  ctx.fillText(t('visitante'), scoreBX, cardY - 18);

  // ── LOCAL card — sharp corners, semi-transparent ────────────
  ctx.fillStyle = 'rgba(10,10,10,0.50)';
  ctx.fillRect(cardAX, cardY, cardW, cardH);
  ctx.strokeStyle = state.colorA1 + '99';
  ctx.lineWidth = 5;
  ctx.strokeRect(cardAX, cardY, cardW, cardH);

  // Club name inside card — only if custom name set, with team-color glow
  if (clubA) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = state.colorA1;
    ctx.shadowBlur = 18;
    ctx.font = '900 68px "Anton SC"';
    ctx.fillText(clubA.toUpperCase(), scoreAX, cardY + 98);
    ctx.restore();
  }

  // Score A — bigger, vertically centered in card, with team-color glow
  const scoreY = cardY + cardH / 2 + 112;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = state.colorA1;
  ctx.shadowBlur = 28;
  ctx.font = '900 300px "Space Grotesk"';
  ctx.fillText(String(goalsA), scoreAX, scoreY);
  ctx.restore();

  // ── VISITANTE card — sharp corners, semi-transparent ─────────
  ctx.fillStyle = 'rgba(10,10,10,0.50)';
  ctx.fillRect(cardBX, cardY, cardW, cardH);
  ctx.strokeStyle = state.colorB1 + '99';
  ctx.lineWidth = 5;
  ctx.strokeRect(cardBX, cardY, cardW, cardH);

  // Club name inside card — only if custom name set, with team-color glow
  if (clubB) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = state.colorB1;
    ctx.shadowBlur = 18;
    ctx.font = '900 68px "Anton SC"';
    ctx.fillText(clubB.toUpperCase(), scoreBX, cardY + 98);
    ctx.restore();
  }

  // Score B — bigger, vertically centered in card, with team-color glow
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = state.colorB1;
  ctx.shadowBlur = 28;
  ctx.font = '900 300px "Space Grotesk"';
  ctx.fillText(String(goalsB), scoreBX, scoreY);
  ctx.restore();

  // ── Date — only if enabled in settings ──────────────────────
  if (state.includeDate) {
    const dateStr = new Date().toLocaleDateString(state.lang === 'zh' ? 'zh-CN' : state.lang, { day: 'numeric', month: 'long', year: 'numeric' });
    ctx.font = '600 44px "Space Grotesk"';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(dateStr, W / 2, cardY + cardH + 72);
  }

  // ── Footer: logo left + FUCHITRON right, centered as a unit ─────
  const logoSize = 52;
  const footerY = 990;
  const logoTextGap = 18;
  // Measure text width to calculate total block width
  const fuchiText = 'FUCHITRON';
  ctx.font = 'italic 900 48px "Space Grotesk"';
  const textW2 = ctx.measureText(fuchiText).width;
  const totalBlockW = logoSize + logoTextGap + textW2;
  const blockStartX = (W - totalBlockW) / 2;
  // Reset shadow completely
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  // Draw logo to the left
  if (logoImg.complete && logoImg.naturalWidth > 0) {
    ctx.drawImage(logoImg, blockStartX, footerY, logoSize, logoSize);
  } else {
    ctx.fillStyle = '#39FF14';
    ctx.beginPath();
    ctx.arc(blockStartX + logoSize / 2, footerY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = 'italic 900 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('F', blockStartX + logoSize / 2, footerY + logoSize / 2 + 10);
  }
  // Draw text to the right of logo
  ctx.textAlign = 'left';
  ctx.fillStyle = '#39FF14';
  ctx.font = 'italic 900 48px "Space Grotesk"';
  ctx.fillText('FUCHITRON', blockStartX + logoSize + logoTextGap, footerY + logoSize - 4);

  return c;
}

function getShareCanvas() {
  if (!shareCanvasCache) shareCanvasCache = document.createElement('canvas');
  return shareCanvasCache;
}

function downloadImage() {
  const c = getShareCanvas();
  buildCanvasToElement(c);
  const a = document.createElement('a');
  a.href = c.toDataURL('image/png');
  a.download = `fuchitron-${Date.now()}.png`;
  a.click();
}

async function copyImage() {
  const c = getShareCanvas();
  buildCanvasToElement(c);
  c.toBlob(async blob => {
    if (!blob) return alert('No pude generar imagen 😅');
    try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); alert('Imagen copiada ✅'); }
    catch { alert('Tu navegador no deja copiar imagen. Usá Descargar 🙌'); }
  }, 'image/png');
}

let deferredInstallPrompt = null;
function setupInstallPrompt() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (isStandalone) return;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIOS) {
    els.installHint.hidden = false;
    els.installHint.textContent = 'iPhone: en Safari tocá Compartir → Agregar a pantalla de inicio.';
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    els.installApp.hidden = false;
    els.installHint.hidden = false;
    els.installHint.textContent = 'Instalá Fuchitron como app para abrirla full-screen y usarla offline.';
  });

  els.installApp?.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    els.installApp.hidden = true;
  });
}

async function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  let refreshing = false;

  const showUpdate = (reg) => {
    // Solo mostrar en clientes ya controlados (evita banner pegado en primera carga)
    if (!reg?.waiting || !navigator.serviceWorker.controller) return;
    if (els.updateBanner) els.updateBanner.hidden = false;
    els.updateNow?.addEventListener('click', () => {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }, { once: true });
  };

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  try {
    const reg = await navigator.serviceWorker.register('./sw.js');

    if (reg.waiting) showUpdate(reg);

    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdate(reg);
        }
      });
    });

    // chequeo proactivo por sesión
    reg.update();
  } catch {}
}

els.teamA.addEventListener('input', e => { state.teamA = e.target.value; save(); render(); });
els.teamB.addEventListener('input', e => { state.teamB = e.target.value; save(); render(); });
els.includeDate.addEventListener('change', e => { state.includeDate = e.target.checked; save(); renderSharePreview(); });
els.includeDateText.addEventListener('change', e => { state.includeDateText = e.target.checked; save(); renderSharePreview(); });
els.stylizedText.addEventListener('change', e => { state.stylizedText = e.target.checked; save(); renderSharePreview(); });
els.keepScreenOn?.addEventListener('change', e => { state.keepScreenOn = e.target.checked; save(); });

// Duration pill buttons
els.durationGroup?.addEventListener('click', e => {
  const btn = e.target.closest('.pill-btn');
  if (!btn) return;
  state.periodMinutes = Number(btn.dataset.value);
  save(); render();
});

// Language pill buttons
els.langGroup?.addEventListener('click', e => {
  const btn = e.target.closest('.pill-btn');
  if (!btn) return;
  state.lang = btn.dataset.value;
  save();
  updateMetaTags();
  updateUIStrings();
  render();
});

els.plusA.addEventListener('click', () => addGoal('A'));
els.plusB.addEventListener('click', () => addGoal('B'));
els.startPause.addEventListener('click', toggleClock);
els.resetTimer.addEventListener('click', resetTimer);
els.nextPeriod.addEventListener('click', nextPeriod);
els.settingsBtn?.addEventListener('click', () => {
  els.settingsDialog?.showModal();
  els.settingsDialog?.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key && t(key)) el.textContent = t(key);
  });
});
els.fullscreenBtn?.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
});
els.closeSettings?.addEventListener('click', () => els.settingsDialog?.close());
els.settingsDialog?.addEventListener('click', e => { if (e.target === els.settingsDialog) els.settingsDialog.close(); });
els.shareBtn?.addEventListener('click', () => {
  els.shareDialog?.showModal();
  const shareH2 = els.shareDialog?.querySelector('h2');
  if (shareH2) shareH2.textContent = t('compartir');
  els.shareDialog?.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key && t(key)) el.textContent = t(key);
  });
  els.includeDate.checked = !!state.includeDate;
  els.includeDateText.checked = !!state.includeDateText;
  els.stylizedText.checked = !!state.stylizedText;
  els.keepScreenOn.checked = !!state.keepScreenOn;
  renderSharePreview();
});

function renderSharePreview() {
  els.shareTextPreview.textContent = buildShareText(state.stylizedText);
  const c = getShareCanvas();
  buildCanvasToElement(c);
  els.shareCanvas.width = c.width;
  els.shareCanvas.height = c.height;
  els.shareCanvas.getContext('2d').drawImage(c, 0, 0);
}
els.closeShare?.addEventListener('click', () => els.shareDialog?.close());
els.shareDialog?.addEventListener('click', e => { if (e.target === els.shareDialog) els.shareDialog.close(); });
els.shareTextBtn.addEventListener('click', async () => {
  const text = buildShareText(state.stylizedText);
  if (navigator.share) { try { await navigator.share({ text }); return; } catch {} }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
});
els.copyTextBtn.addEventListener('click', async () => { try { await navigator.clipboard.writeText(buildShareText(state.stylizedText)); alert(t('copiarToast')); } catch { alert(t('copiarError')); } });
els.downloadTxtBtn.addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([buildShareText(state.stylizedText)], { type: 'text/plain' }));
  a.download = `fuchitron-${Date.now()}.txt`;
  a.click();
});
els.createSpectateBtn?.addEventListener('click', async () => {
  const code = generateMatchCode();
  const match = {
    match_code: code,
    team_a: state.teamA || 'Local',
    team_b: state.teamB || 'Visitante',
    score_a: (state.goals||[]).filter(g=>g.side==='A').length,
    score_b: (state.goals||[]).filter(g=>g.side==='B').length,
    current_half: state.currentHalf,
    half_seconds: state.halfSeconds,
    running: state.running,
    finished: state.finished,
    match_start_ts: state.matchStartTS ? String(state.matchStartTS) : null,
  };
  const r = await fetch(`${SUPABASE_URL}/rest/v1/matches`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(match),
  });
  const result = await r.json();
  state.spectateCode = code;
  save();
  await updateSpectateMatch(code);
  const spectateUrl = `${window.location.origin}/live/${code}`;
  const shareText = `🔥 Follow this match live: ${spectateUrl}`;
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(shareText);
    alert('Spectate link copied to clipboard!');
  } else {
    prompt('Share this link:', spectateUrl);
  }
});

function generateMatchCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function updateSpectateMatch(code) {
  const match = {
    team_a: state.teamA || 'Local',
    team_b: state.teamB || 'Visitante',
    score_a: (state.goals||[]).filter(g=>g.side==='A').length,
    score_b: (state.goals||[]).filter(g=>g.side==='B').length,
    current_half: state.currentHalf,
    half_seconds: state.halfSeconds,
    running: state.running,
    finished: state.finished,
    match_start_ts: state.matchStartTS ? String(state.matchStartTS) : null,
  };
  await fetch(`${SUPABASE_URL}/rest/v1/matches?match_code=eq.${encodeURIComponent(code)}`, {
    method: 'PATCH',
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(match),
  });
}

// Sync to Supabase every 10s when running
setInterval(async () => {
  if (state.matchStarted && state.spectateCode) {
    await updateSpectateMatch(state.spectateCode);
  }
}, 10000);

els.shareImageBtn.addEventListener('click', async () => {
  const c = getShareCanvas();
  buildCanvasToElement(c);
  const blob = await new Promise(resolve => c.toBlob(resolve, 'image/png'));
  if (navigator.share && navigator.canShare && blob) {
    try { await navigator.share({ files: [new File([blob], 'fuchitron.png', { type: 'image/png' })] }); return; } catch {}
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `fuchitron-${Date.now()}.png`; a.click();
});
els.copyImageBtn.addEventListener('click', async () => {
  const c = getShareCanvas();
  buildCanvasToElement(c);
  c.toBlob(async blob => {
    if (!blob) return alert(t('copiarError'));
    try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); alert(t('copiarToast')); }
    catch { alert(t('copiarError')); }
  });
});
els.downloadImageBtn.addEventListener('click', () => {
  const c = getShareCanvas();
  buildCanvasToElement(c);
  const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = `fuchitron-${Date.now()}.png`; a.click();
});

document.fonts.ready.then(() => { load(); if (urlLangValid) state.lang = urlLang; updateUIStrings(); render(); });

function updateMetaTags() {
  const lang = state.lang;
  const dict = I18N[lang] || I18N.es;
  document.title = dict.appTitle;
  document.querySelector('meta[name="description"]')?.setAttribute('content', dict.appDescription);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', dict.ogTitle);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', dict.ogDescription);
  document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', dict.ogDescription);
}

function updatePillSelection() {
  // Duration pills
  els.durationGroup?.querySelectorAll('.pill-btn').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.value) === state.periodMinutes);
  });
  // Language pills
  els.langGroup?.querySelectorAll('.pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === state.lang);
  });
}

function updateUIStrings() {
  const dict = I18N[state.lang] || I18N.es;
  // Settings dialog
  const settingsH2 = els.settingsDialog?.querySelector('h2');
  if (settingsH2) settingsH2.textContent = I18N[state.lang]?.ajustes || 'Ajustes';
  els.closeSettings?.setAttribute('aria-label', dict.cerrarAjustes);
  updatePillSelection();

  // Share dialog
  const shareH2Update = els.shareDialog?.querySelector('h2');
  if (shareH2Update) shareH2Update.textContent = dict.compartir;
  els.closeShare?.setAttribute('aria-label', dict.cerrarCompartir);

  // Team panel labels — LOCAL/VISITANTE → HOME/AWAY/主队/客队
  if (els.tagA) els.tagA.textContent = t('local');
  if (els.tagB) els.tagB.textContent = t('visitante');

  // Install hint
  if (els.installApp) els.installApp.textContent = dict.instalarWebApp;
  if (els.installHint) els.installHint.textContent = dict.instalarHint;
  if (els.tagline) els.tagline.textContent = dict.tagline;

  // Reset timer button
  els.resetTimer.querySelector('span:last-child').textContent = dict.nuevoPartido;

  // Goal buttons
  els.plusA.querySelector('span:last-child').textContent = dict.golLocal;
  els.plusB.querySelector('span:last-child').textContent = dict.golVisitante;

  // Settings labels — update only text nodes, preserve input children
  const updateLabel = (el, text) => {
    if (!el) return;
    if (el.firstChild && el.firstChild.nodeType === Node.TEXT_NODE) {
      el.firstChild.textContent = text + ' ';
    } else {
      el.prepend(document.createTextNode(text + ' '));
    }
  };
  updateLabel(els.lblDuration, dict.duracionPartido);
  updateLabel(els.lblTeamA, dict.equipoLocal);
  updateLabel(els.lblColorA, dict.colorLocal);
  updateLabel(els.lblTeamB, dict.equipoVisitante);
  updateLabel(els.lblColorB, dict.colorVisitante);
  updateLabel(els.lblLang, dict.idioma);

  // Placeholders
  els.teamA.placeholder = dict.lugarHolderLocal;
  els.teamB.placeholder = dict.lugarHolderVisitante;
}

// Init lang: URL param > localStorage > detect
(function initLang() {
  const urlLang = new URLSearchParams(location.search).get('lang');
  if (urlLang && I18N[urlLang]) {
    state.lang = urlLang;
  } else if (!state.lang) {
    state.lang = detectLang();
  }
})();
updateMetaTags();
updateUIStrings();

render();
setupInstallPrompt();
registerSW();

if (state.running) {
  tick = setInterval(() => {
    state.halfSeconds++;
    els.clock.textContent = clockTxt(state.halfSeconds);
    els.overtime.textContent = overtimeText();
    save();
  }, 1000);
}
