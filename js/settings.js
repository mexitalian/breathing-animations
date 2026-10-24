// App settings, kept on this device: theme, particles, sound, screen, vibration.
// They apply straight away on every open page (the 'breathing:settings' event)
// and before first paint on the next one (js/settings-boot.js reads the same key).
export const SETTINGS_KEY = 'breathing:settings';
export const DEFAULTS = { theme: 'system', particles: 'webgl', sound: true, volume: 0.6, keepAwake: true, vibration: true, vibrationStyle: 'taps' };
export const THEMES = ['system', 'light', 'dark'];
// 'webgl' (the default) draws a richer particle layer on one canvas
// (js/components/particles-gl.js); 'on' is the standard one, and the fallback
// where WebGL isn't available.
export const PARTICLES = ['on', 'off', 'webgl'];
// Continuous: inhale ramps soft to strong, exhale strong to soft (Android app only).
export const VIBRATION_STYLES = ['taps', 'continuous'];

function defaultStorage() {
  try { return window.localStorage; } catch { return null; }
}

export function readSettings(storage = defaultStorage()) {
  let saved = {};
  try { saved = JSON.parse(storage?.getItem(SETTINGS_KEY) ?? '{}') ?? {}; } catch { /* defaults */ }
  const bool = (key) => (typeof saved[key] === 'boolean' ? saved[key] : DEFAULTS[key]);
  return {
    theme: THEMES.includes(saved.theme) ? saved.theme : DEFAULTS.theme,
    particles: PARTICLES.includes(saved.particles) ? saved.particles : DEFAULTS.particles,
    sound: bool('sound'),
    volume: Number.isFinite(saved.volume) ? Math.min(1, Math.max(0, saved.volume)) : DEFAULTS.volume,
    keepAwake: bool('keepAwake'),
    vibration: bool('vibration'),
    vibrationStyle: VIBRATION_STYLES.includes(saved.vibrationStyle) ? saved.vibrationStyle : DEFAULTS.vibrationStyle,
  };
}

// Theme and particles live on <html> so CSS can follow them.
export function applySettings(settings, root = document.documentElement) {
  if (settings.theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = settings.theme;
  root.dataset.particles = settings.particles;
}

export function saveSettings(changes, storage = defaultStorage()) {
  const next = { ...readSettings(storage), ...changes };
  try { storage?.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* best-effort */ }
  if (typeof document !== 'undefined') {
    applySettings(next);
    window.dispatchEvent(new CustomEvent('breathing:settings', { detail: next }));
  }
  return next;
}

export function onSettingsChange(fn) {
  const listener = (e) => fn(e.detail);
  window.addEventListener('breathing:settings', listener);
  return () => window.removeEventListener('breathing:settings', listener);
}
