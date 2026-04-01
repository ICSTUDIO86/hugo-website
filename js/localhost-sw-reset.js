(function () {
  var hostname = window.location.hostname;
  var isLocalHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname === '[::1]' ||
    /\.localhost$/i.test(hostname);

  if (!isLocalHost) {
    return;
  }

  var reloadKey = 'ic-local-sw-reset-reloaded';

  function clearLocalCaches() {
    if (!('caches' in window)) {
      return Promise.resolve();
    }

    return caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function (cacheName) {
            return /^ic-studio-/i.test(cacheName);
          })
          .map(function (cacheName) {
            return caches.delete(cacheName);
          })
      );
    });
  }

  function resetServiceWorkers() {
    if (!('serviceWorker' in navigator)) {
      return clearLocalCaches();
    }

    return navigator.serviceWorker.getRegistrations()
      .then(function (registrations) {
        return Promise.all(
          registrations.map(function (registration) {
            return registration.unregister();
          })
        ).then(function () {
          return registrations.length;
        });
      })
      .catch(function () {
        return 0;
      })
      .then(function (registrationCount) {
        return clearLocalCaches().then(function () {
          return registrationCount;
        });
      })
      .then(function (registrationCount) {
        if (!navigator.serviceWorker.controller) {
          return;
        }

        if (sessionStorage.getItem(reloadKey) === '1') {
          sessionStorage.removeItem(reloadKey);
          return;
        }

        if (registrationCount > 0) {
          sessionStorage.setItem(reloadKey, '1');
          window.location.reload();
        }
      });
  }

  resetServiceWorkers().catch(function () {});
})();
