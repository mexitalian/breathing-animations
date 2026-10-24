export default {
  title: 'Triangle Breathing',
  rate: 'in 4 · hold 4 · out 4',
  hint: 'Follow the marker: up the side as you breathe in, across the top as you hold, down to the point as you breathe out.',

  hue: 140,
  shape: 'triangle',
  opacity: { min: 0.5, max: 1 },

  // Particles follow the triangle's edges: drawn in as you breathe in, staying put
  // on the hold, out as you breathe out.
  particles: { count: 22, radii: { inner: 0.3, outer: 0.95 } },

  phases: [
    { name: 'Inhale', dur: 4, scale: 1.00, vibrate: [120], particles: { from: 'outer', to: 'inner' } },
    { name: 'Hold',   dur: 4, scale: 1.00, vibrate: [30, 60, 30], particles: { from: 'inner', to: 'inner' } },
    { name: 'Exhale', dur: 4, scale: 0.72, vibrate: [120], particles: { from: 'inner', to: 'outer' } },
  ],
};
