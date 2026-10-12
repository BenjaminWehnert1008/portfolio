/* The landing screen. While the whole figure fits the window, the landing is
   pinned and the introduction slides in over it like a second window; the
   landing recedes a little as it is covered. When the window is too small for
   the map and the model side by side, a hint offers full screen. */
(function () {
  'use strict';

  var root = document.documentElement;
  var landing = document.getElementById('top');
  var hint = document.getElementById('size-hint');
  var button = document.getElementById('go-full');
  if (!landing) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canFull = !!(document.fullscreenEnabled && root.requestFullscreen);

  function spills(el) { return el && el.scrollHeight > el.clientHeight + 1; }

  function layout() {
    var cell = document.querySelector('.map .cell');
    var cw = cell ? cell.offsetWidth : 100;
    var landscape = window.innerWidth > window.innerHeight;
    var cramped = landscape && cw < 46;

    // pin, then let go again if anything spills over the window
    root.classList.add('landing-pinned');
    var pinned = !cramped && !spills(landing) &&
      !spills(document.querySelector('.fig-left')) && !spills(document.querySelector('.fig-right'));
    if (!pinned) root.classList.remove('landing-pinned');

    if (hint) {
      wanted = landscape && (cramped || !pinned) && !document.fullscreenElement && !dismissed;
      if (button) button.hidden = !canFull;
      showHint();
    }
    cover();
  }

  // the note only shows while the landing is on screen, and stays away once dismissed
  var wanted = false, dismissed = false;
  function showHint() {
    if (!hint) return;
    hint.hidden = !(wanted && window.scrollY < landing.offsetHeight * 0.6);
  }
  var close = document.getElementById('hint-close');
  if (close) close.addEventListener('click', function () { dismissed = true; wanted = false; showHint(); });

  function cover() {
    if (!root.classList.contains('landing-pinned') || reduce) {
      landing.style.setProperty('--cover', 0);
      return;
    }
    var p = window.scrollY / (window.innerHeight || 1);
    landing.style.setProperty('--cover', Math.max(0, Math.min(1, p)).toFixed(3));
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; cover(); showHint(); });
  }, { passive: true });

  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; layout(); });
  }
  window.addEventListener('resize', schedule);
  document.addEventListener('fullscreenchange', schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);

  if (button) {
    button.addEventListener('click', function () {
      if (!canFull) return;
      var req = root.requestFullscreen();
      if (req && req.catch) req.catch(function () { /* the browser said no; the page still works */ });
    });
  }

  layout();
})();
