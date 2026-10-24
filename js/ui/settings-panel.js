import { el } from '../dom.js';
import { icon } from './icons.js';
import { readSettings, saveSettings } from '../settings.js';
import { canVibrate } from '../controls/vibration.js';
import { nativePlugin, platform, VIBRATION_USAGES, vibrationUsage, setVibrationUsage } from '../native.js';
import { readHistory, clearHistory } from '../history.js';
import { exportHistory } from '../export.js';

let panelId = 0;

// One setting: a label over a row of chip buttons, one pressed.
function choiceRow(label, options, current, onPick) {
  const row = el('div', 'settings__row');
  const id = `settings-label-${++panelId}`;
  row.append(el('div', 'settings__label', { id, textContent: label }));
  const group = el('div', 'group-nav');
  group.setAttribute('role', 'group');
  group.setAttribute('aria-labelledby', id);
  const buttons = options.map(([value, text]) => {
    const button = el('button', 'chip chip--link', { type: 'button', textContent: text });
    button.setAttribute('aria-pressed', String(value === current));
    button.addEventListener('click', () => {
      for (const b of buttons) b.setAttribute('aria-pressed', String(b === button));
      onPick(value);
    });
    return button;
  });
  group.append(...buttons);
  row.append(group);
  return row;
}

const ON_OFF = [[true, 'On'], [false, 'Off']];
const capitalise = (text) => text[0].toUpperCase() + text.slice(1);

// Sound: on/off plus a volume slider.
function soundRow(settings) {
  const row = choiceRow('Sound', ON_OFF, settings.sound, (sound) => {
    saveSettings({ sound });
    slider.disabled = !sound;
  });
  const slider = el('input', 'settings__range', { type: 'range', min: '0', max: '100', step: '5', value: String(Math.round(settings.volume * 100)) });
  slider.setAttribute('aria-label', 'Volume');
  slider.disabled = !settings.sound;
  slider.addEventListener('input', () => saveSettings({ volume: Number(slider.value) / 100 }));
  row.append(slider);
  return row;
}

// Android only: which kind of vibration sessions use. Some phones silence some
// kinds, so picking one plays a short test buzz.
function vibrationTypeRow() {
  const breath = platform === 'android' ? nativePlugin('BreathVibration') : null;
  if (!breath) return null;
  const options = VIBRATION_USAGES.filter(u => u !== 'unknown').map(u => [u, capitalise(u)]);
  return choiceRow('Vibration type', options, vibrationUsage(), (usage) => {
    setVibrationUsage(usage);
    Promise.resolve(breath.vibrate({ duration: 300, usage })).catch(() => {});
  });
}

// Your data: export the history as CSV, and clear it (a second tap confirms).
function dataRow() {
  const row = el('div', 'settings__row');
  const id = `settings-label-${++panelId}`;
  row.append(el('div', 'settings__label', { id, textContent: 'Your data' }));
  const buttons = el('div', 'settings__buttons');
  buttons.setAttribute('role', 'group');
  buttons.setAttribute('aria-labelledby', id);
  const exportBtn = el('button', 'button button--ghost', { type: 'button', textContent: 'Export history' });
  const clearBtn = el('button', 'button button--ghost', { type: 'button', textContent: 'Clear history' });
  const note = el('p', 'settings__note');
  note.setAttribute('aria-live', 'polite');
  const empty = () => {
    const none = !readHistory().length;
    exportBtn.disabled = clearBtn.disabled = none;
    if (none) note.textContent = 'No sessions saved yet.';
  };
  let confirmTimer = 0;
  const resetClear = () => {
    clearTimeout(confirmTimer);
    clearBtn.textContent = 'Clear history';
    delete clearBtn.dataset.confirm;
  };
  exportBtn.addEventListener('click', async () => {
    resetClear();
    exportBtn.disabled = true;
    try {
      note.textContent = await exportHistory();
    } catch (err) {
      note.textContent = `Export failed: ${err?.message ?? err}`;
    }
    exportBtn.disabled = false;
  });
  clearBtn.addEventListener('click', () => {
    if (!clearBtn.dataset.confirm) {
      clearBtn.dataset.confirm = 'true';
      clearBtn.textContent = 'Tap again to clear';
      note.textContent = 'This removes every saved session on this device.';
      confirmTimer = setTimeout(() => { resetClear(); note.textContent = ''; }, 5000);
      return;
    }
    resetClear();
    clearHistory();
    empty();
    note.textContent = 'History cleared.';
  });
  buttons.append(exportBtn, clearBtn);
  row.append(buttons, note);
  empty();
  return row;
}

// Pattern: the settings panel, opened from the gear. Uses the screen pattern so it
// sits over the stage like the start and summary screens. Changes apply at once.
export function openSettings({ particleOptions = [['webgl', 'WebGL'], ['on', 'Standard'], ['off', 'Off']] } = {}) {
  const settings = readSettings();
  const titleId = `settings-title-${++panelId}`;
  const screen = el('div', 'screen settings');
  screen.setAttribute('role', 'dialog');
  screen.setAttribute('aria-modal', 'true');
  screen.setAttribute('aria-labelledby', titleId);
  const panel = el('div', 'screen__panel');
  panel.append(el('h1', 'screen__title', { id: titleId, textContent: 'Settings' }));
  panel.append(choiceRow('Theme', [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']], settings.theme, theme => saveSettings({ theme })));
  panel.append(choiceRow('Particles', particleOptions, settings.particles, particles => saveSettings({ particles })));
  if (window.AudioContext || window.webkitAudioContext) panel.append(soundRow(settings));
  panel.append(choiceRow('Keep screen on', ON_OFF, settings.keepAwake, keepAwake => saveSettings({ keepAwake })));
  if (canVibrate()) {
    panel.append(choiceRow('Vibration', ON_OFF, settings.vibration, vibration => saveSettings({ vibration })));
    const type = vibrationTypeRow();
    if (type) panel.append(type);
    // Continuous needs the app's own session player (Android).
    if (platform === 'android' && nativePlugin('BreathSession')) {
      panel.append(choiceRow('Vibration style', [['taps', 'Taps'], ['continuous', 'Continuous']], settings.vibrationStyle, vibrationStyle => saveSettings({ vibrationStyle })));
    }
  }
  panel.append(dataRow());
  const done = el('button', 'button button--primary', { type: 'button', textContent: 'Done' });
  const actions = el('div', 'screen__actions');
  actions.append(done);
  panel.append(actions);
  screen.append(panel);
  const previous = document.activeElement;
  document.body.append(screen);
  done.focus();

  function close() {
    screen.remove();
    document.removeEventListener('keydown', onKey);
    previous?.focus?.();
  }
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  done.addEventListener('click', close);
  screen.addEventListener('click', (e) => { if (e.target === screen) close(); });
  document.addEventListener('keydown', onKey);
  return { close };
}

// The gear button that opens it.
export function createSettingsButton(options) {
  const button = el('button', 'icon-button', { type: 'button' });
  button.setAttribute('aria-label', 'Settings');
  button.title = 'Settings';
  button.append(icon('settings'));
  button.addEventListener('click', () => openSettings(options));
  return button;
}
