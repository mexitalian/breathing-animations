import { el } from '../dom.js';

// Performance readout for practice screens, switched on from the Diagnostics page.
// Shows frames per second, script time per frame (the engine's own work, particles
// included), the particle mode, and battery level with the drop since the page opened.
export const PERF_KEY = 'breathing:perf-overlay';

export function perfOverlayEnabled(storage = globalThis.localStorage) {
  try { return storage?.getItem(PERF_KEY) === 'on'; } catch { return false; }
}

export function setPerfOverlay(on, storage = globalThis.localStorage) {
  try { storage?.setItem(PERF_KEY, on ? 'on' : 'off'); } catch { /* best-effort */ }
}

// Battery drop per hour, once it has dropped at least 1% (the API reports whole percents
// on most phones, so shorter spans are noise). Null while charging or too early.
export function drainPerHour({ startLevel, level, minutes, charging }) {
  if (charging || minutes <= 0 || startLevel - level < 0.01) return null;
  return ((startLevel - level) * 100 * 60) / minutes;
}

export function createPerfOverlay() {
  if (!perfOverlayEnabled()) return null;
  const box = el('div', 'perf');
  box.setAttribute('aria-hidden', 'true');
  document.body.append(box);

  const startedAt = performance.now();
  let frames = 0;
  let scriptTotal = 0;
  let scriptMax = 0;
  let windowStart = startedAt;
  let battery = null;
  let startLevel = null;
  navigator.getBattery?.().then((b) => { battery = b; startLevel = b.level; }).catch(() => {});

  function render(now) {
    const seconds = (now - windowStart) / 1000;
    const fps = frames / seconds;
    const mode = document.documentElement.dataset.particles ?? 'webgl';
    const lines = [
      `${fps.toFixed(0)} fps · script ${(scriptTotal / Math.max(1, frames)).toFixed(1)} ms avg, ${scriptMax.toFixed(1)} max`,
      `particles: ${mode}`,
    ];
    if (battery) {
      const minutes = (now - startedAt) / 60000;
      const drop = (startLevel - battery.level) * 100;
      const rate = drainPerHour({ startLevel, level: battery.level, minutes, charging: battery.charging });
      lines.push(`battery ${(battery.level * 100).toFixed(0)}%${battery.charging ? ' (charging)' : ''} · −${drop.toFixed(0)}% in ${minutes.toFixed(1)} min${rate ? ` · ${rate.toFixed(0)}%/h` : ''}`);
    } else {
      lines.push('battery: not available here');
    }
    box.textContent = lines.join('\n');
    frames = 0; scriptTotal = 0; scriptMax = 0; windowStart = now;
  }

  return {
    // Called once per engine frame with the time the frame's work took.
    frame(scriptMs, now = performance.now()) {
      frames += 1;
      scriptTotal += scriptMs;
      scriptMax = Math.max(scriptMax, scriptMs);
      if (now - windowStart >= 1000) render(now);
    },
    destroy() { box.remove(); },
  };
}
