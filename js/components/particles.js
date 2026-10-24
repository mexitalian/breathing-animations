import { el } from '../dom.js';
import { noise1D } from '../noise.js';
import { createGlParticles } from './particles-gl.js';
import { outlineFor, outlinePoint } from '../particle-outline.js';

// Particles drift between named radii (fractions of the field radius) once per phase.
// Each phase sets { from, to }; a phase without `particles` hides them.
// Optional cone: { angle, spread } in degrees (0 = right, -90 = up) keeps them in
// one direction instead of all around, e.g. a stream of breath leaving the lips.
// Optional orbit: degrees per second makes particles circle continuously across
// phases (no fade or re-seed at boundaries), for connected breathing.
// Open-ended holds loop the drift every HOLD_LOOP_MS.
// On Box and Triangle the radii are scaled copies of the shape's outline, so the
// particles follow its edges (js/particle-outline.js).
const HOLD_LOOP_MS = 4000;

export function particles({ field, cfg }) {
  const { count, radii } = cfg.particles;
  const outline = outlineFor(cfg.shape);
  const layer = el('div', 'particle-layer');
  field.append(layer);

  const items = Array.from({ length: count }, (_, i) => {
    const node = el('div', 'particle');
    layer.append(node);
    return {
      node,
      seed: i * 3.17 + Math.random() * 2,
      radiusSeed: i * 5.29 + Math.random() * 2,
      sizeJitter: 0.7 + Math.random() * 0.8,
      opacityJitter: 0.6 + Math.random() * 0.4,
      // <1 rushes early, >1 lags then catches up; all still start and finish together
      speedExp: 0.55 + Math.random() * 1.3,
    };
  });

  // Settings → Particles: 'on' (these), 'off' (hidden by CSS), 'webgl' (the test layer).
  let gl = null;
  let glFailed = false;
  let hidden = false;
  const hideDom = () => {
    if (hidden) return;
    for (const p of items) p.node.style.opacity = 0;
    hidden = true;
  };

  function update(snap) {
    const mode = document.documentElement.dataset.particles ?? 'webgl';
    if (mode === 'webgl' && !glFailed) {
      try {
        gl ??= createGlParticles({ field, layer, cfg });
      } catch (err) {
        console.warn('WebGL particles unavailable, using the standard ones', err);
        gl = null;
      }
      if (gl) {
        hideDom();
        gl.update(snap);
        return;
      }
      glFailed = true;
    }
    gl?.clear();
    if (mode === 'off') return;
    hidden = false;
    const motion = snap.phase.particles;
    if (!motion || snap.finished) {
      for (const p of items) p.node.style.opacity = 0;
      return;
    }

    let frac = snap.progress;
    let phaseSeed = snap.serial;
    const orbit = motion.orbit ? ((snap.sessionElapsed / 1000) * motion.orbit * Math.PI) / 180 : 0;
    if (motion.orbit) phaseSeed = 0;
    if (snap.openEnded) {
      const loop = Math.floor(snap.elapsed / HOLD_LOOP_MS);
      frac = (snap.elapsed % HOLD_LOOP_MS) / HOLD_LOOP_MS;
      phaseSeed += loop * 0.5;
    }

    const R = field.clientWidth / 2;
    const fromR = radii[motion.from] ?? 0;
    const toR = radii[motion.to] ?? 0;
    // Full fade at each phase boundary hides the re-seeded placement.
    const envelope = motion.orbit ? 1 : Math.sin(frac * Math.PI);

    for (const p of items) {
      const n = noise1D(p.seed + phaseSeed * 9.13);
      const angle = orbit + (motion.cone
        ? ((motion.cone.angle + (n - 0.5) * motion.cone.spread) * Math.PI) / 180
        : n * Math.PI * 2);
      const spread = 0.65 + noise1D(p.radiusSeed + phaseSeed * 13.7) * 0.55;
      const r = (fromR + (toR - fromR) * frac ** p.speedExp) * spread;
      const [x, y] = outlinePoint(outline, angle, r);
      p.node.style.transform = `translate(${x * R}px,${y * R}px) scale(${p.sizeJitter})`;
      p.node.style.opacity = envelope * p.opacityJitter;
    }
  }

  return { update };
}
