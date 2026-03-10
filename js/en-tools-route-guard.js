(function () {
  if (!window.location.pathname.startsWith('/en/tools/')) {
    return;
  }

  var enRouteMap = {
    melody: '/en/tools/melody-generator.html',
    jianpu: '/en/tools/jianpu-generator.html',
    interval: '/en/tools/interval-generator.html',
    chord: '/en/tools/chord-generator.html',
    rhythm: '/en/tools/rhythm.html'
  };

  window.addEventListener('DOMContentLoaded', function () {
    var originalSwitch = typeof window.switchFunction === 'function' ? window.switchFunction : null;

    window.switchFunction = function (mode) {
      if (enRouteMap[mode]) {
        window.location.href = enRouteMap[mode];
        return;
      }
      if (originalSwitch) {
        originalSwitch(mode);
      }
    };
  });
})();
