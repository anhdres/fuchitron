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
  halfStarted: false,
  matchDateTS: null,
};

const $ = id => document.getElementById(id);
const els = {
  teamA: $('teamA'), teamB: $('teamB'),
  labelA: $('labelA'), labelB: $('labelB'),
  tagA: $('tagA'), tagB: $('tagB'),
  chipA: $('chipA'), chipB: $('chipB'),
  scoreA: $('scoreA'), scoreB: $('scoreB'),
  plusA: $('plusA'), plusB: $('plusB'),
  goalsList: $('goalsList'), timelineSection: $('timelineSection'),
  periodLabel: $('periodLabel'), livePill: $('livePill'),
  offlineBanner: $('offlineBanner'),
  durationGroup: $('durationGroup'), langGroup: $('langGroup'),
  clock: $('clock'), overtime: $('overtime'),
  startPause: $('startPause'), nextPeriod: $('nextPeriod'), resetTimer: $('resetTimer'),
  shareBtn: $('shareBtn'), shareDialog: $('shareDialog'), closeShare: $('closeShare'),
  fullscreenBtn: $('fullscreenBtn'),
  shareCanvas: $('shareCanvas'), shareTextPreview: $('shareTextPreview'),
  shareImageBtn: $('shareImageBtn'), shareTextBtn: $('shareTextBtn'),
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

const DEFAULT_STATE = structuredClone(state);
let storageFailed = false;
const save = () => {
  try {
    localStorage.setItem('fuchitron_v4', JSON.stringify(state));
    storageFailed = false;
  } catch (error) {
    storageFailed = true;
    console.warn('Fuchitron: unable to save this match.', error);
  }
  updateStorageNotice();
};
const load = () => {
  let saved;
  try { saved = JSON.parse(localStorage.getItem('fuchitron_v4') || '{}'); }
  catch { storageFailed = true; }
  Object.assign(state, structuredClone(DEFAULT_STATE));
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return;
  for (const key of ['teamA', 'teamB']) {
    if (typeof saved[key] === 'string') state[key] = saved[key].slice(0, 15);
  }
  for (const key of ['colorA1', 'colorB1']) {
    if (typeof saved[key] === 'string' && /^#[0-9a-f]{6}$/i.test(saved[key])) state[key] = saved[key];
  }
  for (const key of ['running', 'finished', 'matchStarted', 'includeDate', 'includeDateText', 'stylizedText', 'keepScreenOn']) {
    if (typeof saved[key] === 'boolean') state[key] = saved[key];
  }
  for (const key of ['halfSeconds', 'firstHalfEndSeconds', 'matchEndSeconds']) {
    if (Number.isSafeInteger(saved[key]) && saved[key] >= 0 && saved[key] <= 604800) state[key] = saved[key];
  }
  for (const key of ['matchStartTS', 'matchDateTS']) {
    if (Number.isSafeInteger(saved[key]) && saved[key] > 0 && saved[key] <= Date.now()) state[key] = saved[key];
  }
  if ([10, 15, 30, 45].includes(saved.periodMinutes)) state.periodMinutes = saved.periodMinutes;
  if (saved.currentHalf === 2) state.currentHalf = 2;
  if (Object.hasOwn(I18N, saved.lang)) state.lang = saved.lang;
  const ids = new Set();
  if (Array.isArray(saved.goals)) state.goals = saved.goals.filter(g => {
    if (!g || !['A', 'B'].includes(g.side) || ![1, 2].includes(g.half) ||
        !Number.isSafeInteger(g.minute) || g.minute < 0) return false;
    return true;
  }).map(g => {
    let id = typeof g.id === 'string' ? g.id : crypto.randomUUID();
    if (ids.has(id)) id = crypto.randomUUID();
    ids.add(id);
    return { id, side: g.side, half: g.half, minute: g.minute,
      absSeconds: Number.isSafeInteger(g.absSeconds) && g.absSeconds >= 0 ? g.absSeconds : Math.max(0, (g.minute - 1) * 60) };
  });
  state.halfStarted = typeof saved.halfStarted === 'boolean' ? saved.halfStarted :
    state.matchStarted && (state.currentHalf === 1 || state.halfSeconds > 0 || state.running || state.finished);
  if (state.finished) { state.running = false; state.currentHalf = 2; state.matchEndSeconds ??= state.halfSeconds; }
  if (state.currentHalf === 2) { state.matchStarted = true; state.firstHalfEndSeconds ??= state.periodMinutes * 60; }
  if (!state.matchDateTS && state.matchStartTS) state.matchDateTS = state.matchStartTS;
  if (state.running) { state.matchStarted = true; state.halfStarted = true; }
  if (!state.running) state.matchStartTS = null;
  else if (!state.matchStartTS) state.matchStartTS = Date.now() - state.halfSeconds * 1000;
};

function updateStorageNotice() {
  const banner = $('storageBanner');
  banner.hidden = !storageFailed;
  banner.textContent = t('storageError');
  if (els.offlineBanner) els.offlineBanner.hidden = navigator.onLine || storageFailed;
}

// Preserve lang if set from URL before load() overwrites it
const urlLang = new URLSearchParams(location.search).get('lang');
const urlLangValid = urlLang && Object.hasOwn(I18N, urlLang);
const pad = n => String(n).padStart(2,'0');
const clockTxt = s => `${pad(Math.floor(s/60))}:${pad(s%60)}`;
// Locale-aware date for share text + share image. Chinese gets zh-CN
// explicitly because navigator-style 'zh' falls back to a generic locale
// that doesn't render 'long' month names correctly. Single source of truth
// so adding a new locale only needs a switch here, not two grep targets.
function formatDate() {
  return new Date(state.matchDateTS || Date.now()).toLocaleDateString(
    state.lang === 'zh' ? 'zh-CN' : state.lang,
    { day: 'numeric', month: 'long', year: 'numeric' }
  );
}

function overtimeText() {
  const target = state.periodMinutes * 60;
  const over = state.halfSeconds - target;
  if (over <= 0) return '';
  return `+${Math.ceil(over / 60)}`;
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

function readableTeamColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  const channels = [r, g, b].map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return luminance < 0.18 ? '#ffffff' : hex;
}

function applyTeamColors() {
  document.documentElement.style.setProperty('--a1', state.colorA1);
  document.documentElement.style.setProperty('--b1', state.colorB1);

  els.chipA.style.borderColor = state.colorA1;
  els.chipB.style.borderColor = state.colorB1;
  els.tagA.style.color = readableTeamColor(state.colorA1);
  els.tagB.style.color = readableTeamColor(state.colorB1);

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
    b.type = 'button';
    b.setAttribute('aria-label', color);
    b.setAttribute('aria-pressed', String(state[key] === color));
    b.style.background = color;
    if (state[key] === color) b.classList.add('active');
    b.addEventListener('click', () => { state[key] = color; save(); render(); container.querySelectorAll('button')[COLORS.indexOf(color)].focus(); });
    container.appendChild(b);
  });
}

function teamName(side) {
  return side === 'A' ? state.teamA || t('local') : state.teamB || t('visitante');
}

function formatEndMinute(seconds, half = 1) {
  const actual = Math.ceil(seconds / 60);
  const base = (half - 1) * state.periodMinutes;
  return actual > state.periodMinutes
    ? `${base + state.periodMinutes}+${actual - state.periodMinutes}'`
    : `${base + actual}'`;
}

function formatGoalMinute(goal) {
  if (!goal.minute) return '–';
  const base = (goal.half - 1) * state.periodMinutes;
  return goal.minute > state.periodMinutes
    ? `${base + state.periodMinutes}+${goal.minute - state.periodMinutes}'`
    : `${base + goal.minute}'`;
}

function renderGoals() {
  els.goalsList.replaceChildren();
  const append = (minute, text, goal) => {
    const li = document.createElement('li');
    const time = document.createElement('span');
    time.className = 'event-minute';
    time.textContent = minute;
    const label = document.createElement('span');
    label.className = 'goal-meta';
    label.textContent = text;
    li.append(time, label);
    if (goal) {
      const button = document.createElement('button');
      button.className = 'ghost delete-goal';
      button.textContent = t('borrar');
      button.setAttribute('aria-label', `${t('borrar')}: ${teamName(goal.side)} ${minute}`);
      button.addEventListener('click', () => deleteGoalById(goal.id));
      li.append(button);
    } else li.classList.add('timeline-marker');
    els.goalsList.append(li);
  };
  if (state.matchStarted) append("0'", `⏱️ ${t('inicioPartido')}`);
  // Keep period boundaries chronological, even when a half ends early or in added time.
  for (const half of [1, 2]) {
    state.goals.filter(g => g.half === half)
      .sort((a, b) => a.absSeconds - b.absSeconds)
      .forEach(g => append(formatGoalMinute(g), `⚽ ${teamName(g.side).toUpperCase()}`, g));
    if (half === 1 && state.firstHalfEndSeconds !== null) {
      append(formatEndMinute(state.firstHalfEndSeconds, 1), `⏱️ ${t('final1T')}`);
    }
    if (half === 2 && state.finished && state.matchEndSeconds !== null) {
      append(formatEndMinute(state.matchEndSeconds, 2), `⏱️ ${t('final2T')}`);
    }
  }
  if (!els.goalsList.children.length) append('', t('sinEventos'));
}

function render() {
  if (els.teamA.value !== state.teamA) els.teamA.value = state.teamA;
  if (els.teamB.value !== state.teamB) els.teamB.value = state.teamB;
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
    pLabel.textContent = state.halfStarted ? t('reanudar') : (state.currentHalf === 1 ? t('iniciar1T') : t('iniciar2T'));
  }
  els.startPause.classList.toggle('running', state.running);

  els.startPause.disabled = state.finished;
  els.nextPeriod.disabled = state.finished || !state.halfStarted;
  els.keepScreenOn.checked = state.keepScreenOn;
  els.livePill.hidden = !state.matchStarted || state.finished;
  els.livePill.classList.toggle('running', state.running);
  if (els.livePill.lastChild) els.livePill.lastChild.textContent = t('enVivo');
  els.timelineSection.hidden = !state.matchStarted && state.goals.length === 0;

  applyTeamColors();
  renderPalette(els.paletteA1, 'colorA1');
  renderPalette(els.paletteB1, 'colorB1');
  renderGoals();
}

function getElapsedSeconds() {
  if (!state.running || !state.matchStartTS) return state.halfSeconds;
  return Math.max(0, Math.floor((Date.now() - state.matchStartTS) / 1000));
}

function goalMinute() {
  if (!state.matchStarted) return 0;
  return Math.max(1, Math.ceil(getElapsedSeconds() / 60));
}

let goalFxTimeout = null;
function triggerGoalFx(side) {
  const target = side === 'A' ? els.scoreA : els.scoreB;
  document.body.classList.remove('goal-flash-a', 'goal-flash-b');
  for (const score of [els.scoreA, els.scoreB]) score.classList.remove('goal-burst', 'score-pop');
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
    for (const score of [els.scoreA, els.scoreB]) score.classList.remove('goal-burst', 'score-pop');
    els.goalBanner.classList.remove('show');
    goalFxTimeout = null;
  }, 800);
}

function addGoal(side) {
  if (!['A', 'B'].includes(side)) return;
  state.matchDateTS ||= Date.now();
  const g = { id: crypto.randomUUID(), side, minute: goalMinute(), half: state.currentHalf, absSeconds: getElapsedSeconds() };
  state.goals.push(g);
  save();
  render();
  triggerGoalFx(side);
}

function deleteGoalById(id) {
  const idx = state.goals.findIndex(g => g.id === id);
  if (idx < 0) return;
  const removed = state.goals[idx];
  state.goals.splice(idx, 1);
  save(); render();
  showUndoSnackbar(t('golBorrado'), () => {
    state.goals.push(removed);
    state.goals.sort((a, b) => (a.half - b.half) || (a.minute - b.minute));
    save(); render();
  });
}

function undoLastGoal() {
  if (state.goals.length === 0) return;
  deleteGoalById(state.goals[state.goals.length - 1].id);
}

// ── Snackbar (transient toast with optional action) ─────────────────
let snackbarTimeout = null;
let snackbarAction = null;
function showUndoSnackbar(text, onUndo) {
  const el = $('snackbar');
  const textEl = $('snackbarText');
  const actionEl = $('snackbarAction');
  if (!el || !textEl || !actionEl) return;

  if (snackbarTimeout) {
    clearTimeout(snackbarTimeout);
    snackbarTimeout = null;
  }
  textEl.textContent = text;
  actionEl.textContent = t('deshacer');
  snackbarAction = onUndo;
  actionEl.onclick = () => {
    const action = snackbarAction;
    dismissSnackbar();
    if (action) action();
  };

  el.hidden = false;
  snackbarTimeout = setTimeout(() => dismissSnackbar(), 5000);
}
function dismissSnackbar() {
  const el = $('snackbar');
  if (el) el.hidden = true;
  if (snackbarTimeout) {
    clearTimeout(snackbarTimeout);
    snackbarTimeout = null;
  }
  snackbarAction = null;
}

// Runtime handles are never serialized with match data.
let wakeLock = null;
let wakeLockRequest = 0;
async function requestWakeLock() {
  if (!state.running || !state.keepScreenOn || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  if (wakeLock && !wakeLock.released) return;
  const request = ++wakeLockRequest;
  try {
    const lock = await navigator.wakeLock.request('screen');
    if (request !== wakeLockRequest || !state.running || !state.keepScreenOn) {
      await lock.release();
      return;
    }
    wakeLock = lock;
    lock.addEventListener('release', () => { if (wakeLock === lock) wakeLock = null; });
  } catch { /* Wake lock is optional, for example in battery-saver mode. */ }
}
async function releaseWakeLock() {
  wakeLockRequest++;
  const lock = wakeLock;
  wakeLock = null;
  try { await lock?.release(); } catch { /* Already released by the browser. */ }
}
function updateClock() {
  state.halfSeconds = getElapsedSeconds();
  els.clock.textContent = clockTxt(state.halfSeconds);
  els.overtime.textContent = overtimeText();
}
function startTicker() {
  clearInterval(tick);
  updateClock();
  tick = setInterval(updateClock, 250);
  requestWakeLock();
}
function toggleClock() {
  if (state.finished) return;
  if (state.running) {
    state.halfSeconds = getElapsedSeconds();
    state.running = false;
    state.matchStartTS = null;
    clearInterval(tick);
    releaseWakeLock();
  } else {
    state.matchStarted = true;
    state.halfStarted = true;
    state.matchDateTS ||= Date.now();
    state.matchStartTS = Date.now() - state.halfSeconds * 1000;
    state.running = true;
    startTicker();
  }
  save(); render();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.running) {
    updateClock();
    requestWakeLock();
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
  state.goals = [];
  state.finished = false;
  state.matchStarted = false;
  state.firstHalfEndSeconds = null;
  state.matchEndSeconds = null;
  state.matchStartTS = null;
  state.halfStarted = false;
  state.matchDateTS = null;
  dismissSnackbar();

  save();
  render();
}
function nextPeriod() {
  if (state.finished || !state.halfStarted) return;
  if (!window.confirm(t(state.currentHalf === 1 ? 'confirmarTerminar1T' : 'confirmarTerminarPartido'))) return;
  const elapsed = getElapsedSeconds();
  state.running = false;
  state.matchStartTS = null;
  clearInterval(tick);
  releaseWakeLock();
  if (state.currentHalf === 1) {
    state.firstHalfEndSeconds = elapsed;
    state.currentHalf = 2;
    state.halfSeconds = 0;
    state.halfStarted = false;
  } else {
    state.matchEndSeconds = elapsed;
    state.halfSeconds = elapsed;
    state.finished = true;
  }
  save(); render();
}

function buildShareText(stylized = true) {
  const SEP = '---';
  const local = teamName('A');
  const away = teamName('B');
  // Score must always derive from goals[] — state.scoreA/B are deprecated
  // (never updated mid-match, only zeroed on reset). Bug found 2026-09-02:
  // share text would always show 0-0 even after goals were added.
  const goalsA = (state.goals || []).filter(g => g.side === 'A');
  const goalsB = (state.goals || []).filter(g => g.side === 'B');
  const scoreA = goalsA.length;
  const scoreB = goalsB.length;
  const lines = [];

  // Score line
  lines.push(stylized
    ? `*${local}* \`${scoreA} - ${scoreB}\` *${away}*`
    : `${local} ${scoreA} - ${scoreB} ${away}`);

  // Date (if enabled)
  if (state.includeDateText) {
    const dateStr = formatDate();
    lines.push(stylized ? `_${dateStr}_` : dateStr);
  }

  // Goals + status — only if match was started
  if (state.matchStarted) {
    lines.push(SEP);
    if (goalsA.length) lines.push(`⚽ ${local}  (${goalsA.map(formatGoalMinute).join(', ')})`);
    if (goalsB.length) lines.push(`⚽ ${away}  (${goalsB.map(formatGoalMinute).join(', ')})`);
    let status;
    if (state.finished) status = `${t('finalPartido')} (${formatEndMinute(state.matchEndSeconds, 2)})`;
    else if (state.currentHalf === 2 && !state.halfStarted) status = `${t('final1T')} (${formatEndMinute(state.firstHalfEndSeconds, 1)})`;
    else status = `${t(state.currentHalf === 1 ? 't1' : 't2')} · ${clockTxt(getElapsedSeconds())}`;
    lines.push(stylized ? `⏱️ _${status}_` : `⏱️ ${status}`);
  }

  lines.push(SEP);
  lines.push('Fuchitron.app');

  return lines.join('\n');
}

// Shared offscreen canvas for share image rendering
let shareCanvasCache = null;

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
  ctx.fillStyle = readableTeamColor(state.colorA1);
  ctx.fillText(t('local'), scoreAX, cardY - 18);
  ctx.fillStyle = readableTeamColor(state.colorB1);
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
    ctx.fillText(clubA.toUpperCase(), scoreAX, cardY + 98, cardW - 32);
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
  ctx.fillText(String(goalsA), scoreAX, scoreY, cardW - 32);
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
    ctx.fillText(clubB.toUpperCase(), scoreBX, cardY + 98, cardW - 32);
    ctx.restore();
  }

  // Score B — bigger, vertically centered in card, with team-color glow
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = state.colorB1;
  ctx.shadowBlur = 28;
  ctx.font = '900 300px "Space Grotesk"';
  ctx.fillText(String(goalsB), scoreBX, scoreY, cardW - 32);
  ctx.restore();

  // ── Date — only if enabled in settings ──────────────────────
  if (state.includeDate) {
    const dateStr = formatDate();
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

function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
let deferredInstallPrompt = null;
function setupInstallPrompt() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (isStandalone) return;

  const isIOS = isIOSDevice();
  if (isIOS) {
    els.installHint.hidden = false;
    els.installHint.textContent = t('instalarIos');
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    els.installApp.hidden = false;
    els.installHint.hidden = false;
    els.installHint.textContent = t('instalarHint');
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
  let updateRequested = false;

  const showUpdate = (reg) => {
    // Solo mostrar en clientes ya controlados (evita banner pegado en primera carga)
    if (!reg?.waiting || !navigator.serviceWorker.controller) return;
    if (els.updateBanner) els.updateBanner.hidden = false;
    els.updateNow.onclick = () => {
      if (!reg.waiting) return;
      updateRequested = true;
      save();
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    };
  };

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing || !updateRequested) return;
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
    reg.update().catch(() => {});
  } catch {}
}

els.teamA.addEventListener('input', e => { state.teamA = e.target.value; save(); render(); });
els.teamB.addEventListener('input', e => { state.teamB = e.target.value; save(); render(); });
els.includeDate.addEventListener('change', e => { state.includeDate = e.target.checked; save(); renderSharePreview(); });
els.includeDateText.addEventListener('change', e => { state.includeDateText = e.target.checked; save(); renderSharePreview(); });
els.stylizedText.addEventListener('change', e => { state.stylizedText = e.target.checked; save(); renderSharePreview(); });
els.keepScreenOn?.addEventListener('change', e => {
  state.keepScreenOn = e.target.checked;
  if (state.keepScreenOn) requestWakeLock(); else releaseWakeLock();
  save();
});

// Duration pill buttons
els.durationGroup?.addEventListener('click', e => {
  const btn = e.target.closest('.pill-btn');
  if (!btn || state.matchStarted) return;
  state.periodMinutes = Number(btn.dataset.value);
  save(); render();
});

// Language pill buttons
els.langGroup?.addEventListener('click', e => {
  const btn = e.target.closest('.pill-btn');
  if (!btn) return;
  state.lang = btn.dataset.value;
  const url = new URL(location.href);
  if (url.searchParams.has('lang')) {
    url.searchParams.set('lang', state.lang);
    history.replaceState(null, '', url);
  }
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
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
});
els.closeSettings?.addEventListener('click', () => els.settingsDialog?.close());
els.settingsDialog?.addEventListener('click', closeOnBackdrop);
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

function closeOnBackdrop(event) {
  const dialog = event.currentTarget;
  const r = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) dialog.close();
}

function renderSharePreview() {
  els.shareTextPreview.textContent = buildShareText(state.stylizedText);
  const c = getShareCanvas();
  buildCanvasToElement(c);
  els.shareCanvas.width = c.width;
  els.shareCanvas.height = c.height;
  els.shareCanvas.getContext('2d').drawImage(c, 0, 0);
}
els.closeShare?.addEventListener('click', () => els.shareDialog?.close());
els.shareDialog?.addEventListener('click', closeOnBackdrop);
els.shareTextBtn.addEventListener('click', async () => {
  const text = buildShareText(state.stylizedText);
  if (navigator.share) {
    try { await navigator.share({ text }); return; }
    catch (error) { if (error.name === 'AbortError') return; }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
});
els.copyTextBtn.addEventListener('click', async () => { try { await navigator.clipboard.writeText(buildShareText(state.stylizedText)); alert(t('copiarToast')); } catch { alert(t('copiarError')); } });
function downloadBlob(blob, filename) {
  if (!blob) { alert(t('copiarError')); return; }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
els.downloadTxtBtn.addEventListener('click', () => {
  downloadBlob(new Blob([buildShareText(state.stylizedText)], { type: 'text/plain;charset=utf-8' }), `fuchitron-${Date.now()}.txt`);
});

els.shareImageBtn.addEventListener('click', async () => {
  const c = getShareCanvas();
  buildCanvasToElement(c);
  const blob = await new Promise(resolve => c.toBlob(resolve, 'image/png'));
  if (!blob) return alert(t('copiarError'));
  const files = [new File([blob], 'fuchitron.png', { type: 'image/png' })];
  if (navigator.share && navigator.canShare?.({ files })) {
    try { await navigator.share({ files }); return; }
    catch (error) { if (error.name === 'AbortError') return; }
  }
  downloadBlob(blob, `fuchitron-${Date.now()}.png`);
});
els.copyImageBtn.addEventListener('click', async () => {
  const c = getShareCanvas();
  buildCanvasToElement(c);
  try {
    // Promise-valued ClipboardItem retains user activation in Safari.
    const blob = new Promise((resolve, reject) => c.toBlob(value => value ? resolve(value) : reject(new Error('Canvas export failed')), 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    alert(t('copiarToast'));
  } catch { alert(t('copiarImagenError')); }
});
els.downloadImageBtn.addEventListener('click', () => {
  const c = getShareCanvas();
  buildCanvasToElement(c);
  c.toBlob(blob => downloadBlob(blob, `fuchitron-${Date.now()}.png`), 'image/png');
});

// Font loading must never overwrite state or delay timer recovery.
document.fonts.ready.then(() => { if (els.shareDialog.open) renderSharePreview(); });
logoImg.addEventListener('load', () => { if (els.shareDialog.open) renderSharePreview(); });

function updateMetaTags() {
  const lang = state.lang;
  const dict = I18N[lang] || I18N.es;
  document.documentElement.lang = state.lang;
  document.title = dict.appTitle;
  document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', dict.ogTitle);
  document.querySelector('meta[name="description"]')?.setAttribute('content', dict.appDescription);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', dict.ogTitle);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', dict.ogDescription);
  document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', dict.ogDescription);
}

function updatePillSelection() {
  // Duration pills
  els.durationGroup?.querySelectorAll('.pill-btn').forEach(btn => {
    const selected = Number(btn.dataset.value) === state.periodMinutes;
    btn.classList.toggle('active', selected);
    btn.setAttribute('aria-pressed', String(selected));
    btn.disabled = state.matchStarted;
  });
  // Language pills
  els.langGroup?.querySelectorAll('.pill-btn').forEach(btn => {
    const selected = btn.dataset.value === state.lang;
    btn.classList.toggle('active', selected);
    btn.setAttribute('aria-pressed', String(selected));
  });
}

function updateUIStrings() {
  const dict = I18N[state.lang] || I18N.es;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  els.fullscreenBtn.setAttribute('aria-label', t('pantallaCompleta'));
  els.shareBtn.setAttribute('aria-label', t('compartir'));
  els.settingsBtn.setAttribute('aria-label', t('ajustes'));
  updateStorageNotice();
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
  if (els.installHint) els.installHint.textContent = isIOSDevice() ? dict.instalarIos : dict.instalarHint;
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

// Restore synchronously before rendering, starting timers, or binding updates.
load();
if (urlLangValid) { state.lang = urlLang; save(); }
updateMetaTags();
updateUIStrings();
render();
if (state.running) startTicker();
els.fullscreenBtn.hidden = !document.fullscreenEnabled;
setupInstallPrompt();
setupOfflineBanner();
registerSW();

// A second tab should see edits rather than overwrite them on its next clock tick.
window.addEventListener('storage', event => {
  if (event.key !== 'fuchitron_v4' && event.key !== null) return;
  clearInterval(tick);
  releaseWakeLock();
  dismissSnackbar();
  load();
  updateMetaTags(); updateUIStrings(); render();
  if (state.running) startTicker();
  if (els.shareDialog.open) renderSharePreview();
});

// Offline / online indicator. Surfaces the connection state because on the
// field with no signal the user needs to know if the goal they just scored
// is being kept. Goal data is always saved to localStorage immediately, so
// offline is a degraded-but-functional mode — the banner says that. Audit
// ref: AUDIT-2026-07-23.md m3.
function setupOfflineBanner() {
  if (!els.offlineBanner) return;
  function setOffline() {
    els.offlineBanner.textContent = t('offlineBanner');
    els.offlineBanner.hidden = storageFailed;
  }
  function setOnline() {
    els.offlineBanner.textContent = t('offlineAgain');
    els.offlineBanner.hidden = true;
  }
  window.addEventListener('offline', setOffline);
  window.addEventListener('online', setOnline);
  if (!navigator.onLine) setOffline();
}
