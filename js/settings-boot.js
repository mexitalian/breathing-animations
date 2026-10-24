// Classic script in <head>: applies the saved theme and particles setting before
// the page paints, so a chosen theme never flashes the other one. Same key and
// values as js/settings.js.
(function () {
  try {
    var s = JSON.parse(localStorage.getItem('breathing:settings') || '{}') || {};
    var root = document.documentElement;
    if (s.theme === 'light' || s.theme === 'dark') root.setAttribute('data-theme', s.theme);
    root.setAttribute('data-particles', s.particles === 'off' || s.particles === 'on' ? s.particles : 'webgl');
  } catch (e) { /* defaults */ }
})();
