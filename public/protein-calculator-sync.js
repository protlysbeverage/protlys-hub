(function () {
  if (!window.location.pathname.includes('/pages/protein-calculator')) return;

  function wireSaveButton() {
    var result = document.getElementById('resultG');
    var links = Array.prototype.slice.call(document.querySelectorAll('a'));
    var link = links.find(function (a) {
      return /Track your protein in the Hub/i.test(a.textContent || '');
    });
    if (!result || !link) return false;

    if (link.dataset.protlysWired === '1') return true;
    link.dataset.protlysWired = '1';
    link.textContent = 'Save my target to Protlys Dashboard →';
    link.addEventListener('click', function (event) {
      var target = Number(result.textContent);
      if (!Number.isFinite(target) || target < 20 || target > 500) return;
      event.preventDefault();
      window.location.href = 'https://hub.protlys.com/api/protein-target?target=' + encodeURIComponent(Math.round(target));
    });
    return true;
  }

  var observer = new MutationObserver(function () { wireSaveButton(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  wireSaveButton();
})();
