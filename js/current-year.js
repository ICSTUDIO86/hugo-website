(function () {
  function applyCurrentYear() {
    var currentYear = String(new Date().getFullYear());

    document.querySelectorAll('[data-current-year]').forEach(function (node) {
      node.textContent = currentYear;
    });

    document.querySelectorAll('meta[name="copyright"][data-copyright-owner]').forEach(function (meta) {
      var owner = meta.getAttribute('data-copyright-owner') || '';
      var start = parseInt(meta.getAttribute('data-copyright-start') || currentYear, 10);
      var yearText = String(start && start < Number(currentYear) ? start + '-' + currentYear : currentYear);
      meta.setAttribute('content', owner ? owner + ' © ' + yearText : yearText);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyCurrentYear);
  } else {
    applyCurrentYear();
  }
})();
