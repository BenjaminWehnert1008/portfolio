/* The opening figure: every single substitution of W-E-H-N-E-R-T,
   shaded by its BLOSUM62 score (Henikoff & Henikoff, 1992).
   Cells "develop" like a print in the tray: darkest tones first.
   Selecting a cell announces the variant on `document` as a
   "name:variant" event, so the formula strip and the 3D model can follow. */
(function () {
  'use strict';

  var SEQ = ['W', 'E', 'H', 'N', 'E', 'R', 'T'];

  // rows grouped the way mutational-scanning maps usually are:
  // aliphatic | aromatic | polar | special | positive | negative | stop
  var ORDER = ['A', 'V', 'L', 'I', 'M', 'F', 'Y', 'W', 'S', 'T', 'N', 'Q', 'C', 'G', 'P', 'H', 'K', 'R', 'D', 'E', '*'];
  var GROUP_START = { F: 1, S: 1, C: 1, H: 1, D: 1, '*': 1 };

  // BLOSUM62 score for substituting each position of WEHNERT with the row's residue
  var S = {
    A: [-3, -1, -2, -2, -1, -1, 0],  V: [-3, -2, -3, -3, -2, -3, 0],
    L: [-2, -3, -3, -3, -3, -2, -1], I: [-3, -3, -3, -3, -3, -3, -1],
    M: [-1, -2, -2, -2, -2, -1, -1], F: [1, -3, -1, -3, -3, -3, -2],
    Y: [2, -2, 2, -2, -2, -2, -2],   W: [11, -3, -2, -4, -3, -3, -2],
    S: [-3, 0, -1, 1, 0, -1, 1],     T: [-2, -1, -2, 0, -1, -1, 5],
    N: [-4, 0, 1, 6, 0, 0, 0],       Q: [-2, 2, 0, 0, 2, 1, -1],
    C: [-2, -4, -3, -3, -4, -3, -1], G: [-2, -2, -2, 0, -2, -2, -2],
    P: [-4, -1, -2, -2, -1, -2, -1], H: [-2, 0, 8, 1, 0, 0, -2],
    K: [-3, 1, -1, 0, 1, 2, -1],     R: [-3, 0, 0, 0, 0, 5, -1],
    D: [-4, 2, -1, 1, 2, -2, -1],    E: [-3, 5, 0, 0, 5, 0, -1],
    '*': [-4, -4, -4, -4, -4, -4, -4]
  };

  var NAMES = {
    A: 'alanine', R: 'arginine', N: 'asparagine', D: 'aspartic acid', C: 'cysteine',
    Q: 'glutamine', E: 'glutamic acid', G: 'glycine', H: 'histidine', I: 'isoleucine',
    L: 'leucine', K: 'lysine', M: 'methionine', F: 'phenylalanine', P: 'proline',
    S: 'serine', T: 'threonine', W: 'tryptophan', Y: 'tyrosine', V: 'valine'
  };

  var COOL = ['#ABB9CB', '#7E94B1', '#557194', '#324E73'];
  var WARM = ['#D6B178', '#BF8532', '#9E5D00', '#783A00'];
  var MID = '#DFDEDA';

  function colour(v) {
    if (v === 0) return MID;
    var i = Math.min(4, Math.abs(v)) - 1;
    return v < 0 ? COOL[i] : WARM[i];
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  var map = document.getElementById('map');
  var seqEl = document.getElementById('seq');
  var readout = document.getElementById('readout');
  if (!map || !readout) return;

  var letters = seqEl ? Array.prototype.slice.call(seqEl.children) : [];
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hint = readout.innerHTML;

  // build the grid
  var cells = [];
  var labels = [];
  var frag = document.createDocumentFragment();
  ORDER.forEach(function (aa, r) {
    var g = GROUP_START[aa] ? ' g' : '';
    var lab = document.createElement('span');
    lab.className = 'lab' + g;
    lab.textContent = aa;
    frag.appendChild(lab);
    labels[r] = lab;
    cells[r] = [];
    for (var c = 0; c < SEQ.length; c++) {
      var isWt = SEQ[c] === aa;
      var v = isWt ? 0 : S[aa][c];
      var cell = document.createElement('span');
      cell.className = 'cell' + g + (isWt ? ' wt' : '');
      cell.style.setProperty('--final', colour(v));
      if (!reduce) {
        // darker tones come up first, like a print in the developer
        var wait = 120 + (4 - Math.min(4, Math.abs(v))) / 4 * 1300 + Math.random() * 380;
        cell.style.setProperty('--d', Math.round(wait) + 'ms');
      }
      cell.setAttribute('data-r', r);
      cell.setAttribute('data-c', c);
      frag.appendChild(cell);
      cells[r][c] = cell;
    }
  });
  map.appendChild(frag);

  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      map.classList.add('developed');
      document.documentElement.classList.add('figure-developed');
    });
  });

  // reading a cell
  var active = null;

  function announce(detail) {
    var ev;
    try { ev = new CustomEvent('name:variant', { detail: detail }); }
    catch (err) { ev = document.createEvent('CustomEvent'); ev.initCustomEvent('name:variant', false, false, detail); }
    document.dispatchEvent(ev);
  }

  function describe(r, c) {
    var aa = ORDER[r], wt = SEQ[c], pos = c + 1;
    var before = SEQ.slice(0, c).join(''), after = SEQ.slice(c + 1).join('');
    if (aa === wt) {
      return { variant: wt + pos, name: SEQ.join(''), note: cap(NAMES[wt]) + ', the original letter' };
    }
    if (aa === '*') {
      return { variant: wt + pos + '*', name: before || '—', note: cap(NAMES[wt]) + ' → stop: the chain ends here' };
    }
    return { variant: wt + pos + aa, name: before + aa + after, note: cap(NAMES[wt]) + ' → ' + NAMES[aa] };
  }

  function render(o) {
    readout.textContent = '';
    [['r-var', o.variant], ['r-name', o.name], ['r-note', o.note]].forEach(function (p) {
      var s = document.createElement('span');
      s.className = p[0];
      s.textContent = p[1];
      readout.appendChild(s);
    });
  }

  function reset(showHint) {
    if (active) {
      cells[active[0]][active[1]].classList.remove('on');
      labels[active[0]].classList.remove('on');
    }
    letters.forEach(function (el, i) {
      el.textContent = SEQ[i];
      el.classList.remove('mut', 'gone');
      el.style.removeProperty('--mut');
    });
    var had = !!active;
    active = null;
    if (showHint) readout.innerHTML = hint;
    if (had) announce(null);
  }

  function select(r, c) {
    if (active && active[0] === r && active[1] === c) return;
    if (active) {
      cells[active[0]][active[1]].classList.remove('on');
      labels[active[0]].classList.remove('on');
      letters.forEach(function (el, i) {
        el.textContent = SEQ[i];
        el.classList.remove('mut', 'gone');
        el.style.removeProperty('--mut');
      });
    }
    active = [r, c];
    cells[r][c].classList.add('on');
    labels[r].classList.add('on');
    var aa = ORDER[r];
    var isWt = aa === SEQ[c];
    var col = colour(isWt ? 0 : S[aa][c]);
    if (!isWt && letters[c]) {
      letters[c].textContent = aa;
      letters[c].classList.add('mut');
      letters[c].style.setProperty('--mut', col);
      if (aa === '*') {
        for (var i = c + 1; i < letters.length; i++) letters[i].classList.add('gone');
      }
    }
    render(describe(r, c));
    announce({ col: c, aa: aa, wt: SEQ[c], isWt: isWt, isStop: aa === '*', colour: col });
  }

  map.addEventListener('pointerover', function (e) {
    var t = e.target.closest ? e.target.closest('.cell') : null;
    if (t) select(+t.getAttribute('data-r'), +t.getAttribute('data-c'));
  });
  map.addEventListener('pointerleave', function (e) {
    if (e.pointerType === 'mouse' && document.activeElement !== map) reset(true);
  });
  document.addEventListener('pointerdown', function (e) {
    if (active && !map.contains(e.target) && !(e.target.closest && e.target.closest('.molecule'))) reset(true);
  });

  map.addEventListener('focus', function () {
    var keyboard = true;
    try { keyboard = map.matches(':focus-visible'); } catch (err) { /* older browsers */ }
    if (!active && keyboard) select(0, 0);
  });
  map.addEventListener('blur', function () { reset(true); });
  map.addEventListener('keydown', function (e) {
    var r = active ? active[0] : 0, c = active ? active[1] : 0;
    switch (e.key) {
      case 'ArrowRight': c = Math.min(SEQ.length - 1, c + 1); break;
      case 'ArrowLeft': c = Math.max(0, c - 1); break;
      case 'ArrowDown': r = Math.min(ORDER.length - 1, r + 1); break;
      case 'ArrowUp': r = Math.max(0, r - 1); break;
      case 'Home': c = 0; break;
      case 'End': c = SEQ.length - 1; break;
      case 'Escape': reset(true); return;
      default: return;
    }
    e.preventDefault();
    select(r, c);
  });
})();
