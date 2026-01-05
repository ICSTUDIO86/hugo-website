(function(){
  document.addEventListener('DOMContentLoaded', () => {
    const hideGroup = (selector) => {
      const el = document.querySelector(selector);
      if (el) el.style.display = 'none';
    };
    hideGroup('.clef-group');
    hideGroup('.notation-toggle-group');
    const clefModal = document.getElementById('clefModal');
    if (clefModal) clefModal.remove();
  });
})();
