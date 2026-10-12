/* The surname as a skeletal formula, hanging under the variant map:
   one side chain per column, on a schematic backbone. When a cell is
   selected, that column's side chain is swapped and marked in the cell's colour. */
(function () {
  'use strict';

  var DATA = window.NAME_DATA && window.NAME_DATA.formulas;
  var host = document.getElementById('formula');
  var map = document.getElementById('map');
  if (!DATA || !host || !map) return;

  var SEQ = ['W', 'E', 'H', 'N', 'E', 'R', 'T'];
  var NS = 'http://www.w3.org/2000/svg';
  var INK = '#1D1B20', PAPER = '#F1F1ED', GRAPHITE = '#55545A';
  var state = null;

  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  host.appendChild(svg);

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    (parent || svg).appendChild(n);
    return n;
  }

  function columns() {
    var first = map.querySelectorAll('.cell');
    var box = host.getBoundingClientRect();
    // the landing may be scaled while the introduction slides over it; measure in layout pixels
    var k = host.offsetWidth ? box.width / host.offsetWidth : 1;
    var out = [];
    for (var c = 0; c < SEQ.length; c++) {
      var r = first[c].getBoundingClientRect();
      out.push({ x: (r.left - box.left + r.width / 2) / k, w: r.width / k });
    }
    return out;
  }

  function label(g, x, y, text, size, fill) {
    // heavy atom sits on the point; hydrogens and counts trail to the right
    var t = el('text', {
      x: (x - size * 0.31).toFixed(1), y: (y + size * 0.36).toFixed(1),
      'font-size': size.toFixed(1), fill: fill,
      stroke: PAPER, 'stroke-width': (size * 0.34).toFixed(1), 'paint-order': 'stroke',
      'stroke-linejoin': 'round'
    }, g);
    var m = text.match(/^([A-Z][a-z]?)(H?)(\d?)$/);
    if (!m) { t.textContent = text; return; }
    t.appendChild(document.createTextNode(m[1] + m[2]));
    if (m[3]) {
      var sub = el('tspan', { 'font-size': (size * 0.72).toFixed(1), dy: (size * 0.28).toFixed(1) }, t);
      sub.textContent = m[3];
    }
  }

  function drawSideChain(g, aa, cx, cy, L, ink, mark) {
    var t = DATA[aa];
    if (!t) return;
    var fs = Math.max(8, Math.min(12.5, L * 0.74));
    function P(i) {
      if (i === -1) return [cx, cy];
      if (i === -2) return [cx - L, cy];
      return [cx + t.a[i][0] * L, cy + t.a[i][1] * L];
    }
    function labelled(i) { return i >= 0 && t.a[i][2]; }
    var sw = Math.max(1.1, L * 0.085);

    if (t.gly) {
      if (mark) el('circle', { cx: cx, cy: cy + L * 0.95, r: fs * 0.85, fill: mark }, g);
      if (mark) el('line', { x1: cx, y1: cy, x2: cx, y2: cy + L * 0.6, stroke: mark, 'stroke-width': Math.max(6, L * 0.55), 'stroke-linecap': 'round' }, g);
      el('line', { x1: cx, y1: cy, x2: cx, y2: cy + L * 0.55, stroke: ink, 'stroke-width': sw, 'stroke-linecap': 'round' }, g);
      label(g, cx, cy + L * 0.95, 'H', fs, ink);
      return;
    }

    // marker underneath: the swapped side chain in the colour of its cell
    if (mark) {
      t.b.forEach(function (b) {
        var p = P(b[0]), q = P(b[1]);
        el('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], stroke: mark, 'stroke-width': Math.max(6, L * 0.62), 'stroke-linecap': 'round' }, g);
      });
      t.a.forEach(function (a, i) {
        if (a[2]) { var p = P(i); el('circle', { cx: p[0], cy: p[1], r: fs * 0.8, fill: mark }, g); }
      });
    }

    t.b.forEach(function (b) {
      var p = P(b[0]), q = P(b[1]);
      var dx = q[0] - p[0], dy = q[1] - p[1], len = Math.sqrt(dx * dx + dy * dy) || 1;
      var ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
      var cut = fs * 0.62;
      var a0 = labelled(b[0]) ? cut : 0, a1 = labelled(b[1]) ? cut : 0;
      var x1 = p[0] + ux * a0, y1 = p[1] + uy * a0, x2 = q[0] - ux * a1, y2 = q[1] - uy * a1;
      var attrs = { stroke: ink, 'stroke-width': sw, 'stroke-linecap': 'round' };
      if (b[2] === 2 && b.length > 3) {
        // ring double bond: second line inside the ring, a little shorter
        var rc = [cx + b[3][0] * L, cy + b[3][1] * L];
        var mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
        if ((rc[0] - mx) * nx + (rc[1] - my) * ny < 0) { nx = -nx; ny = -ny; }
        var off = L * 0.19, sh = len * 0.16;
        el('line', Object.assign({ x1: x1, y1: y1, x2: x2, y2: y2 }, attrs), g);
        el('line', Object.assign({
          x1: x1 + ux * sh + nx * off, y1: y1 + uy * sh + ny * off,
          x2: x2 - ux * sh + nx * off, y2: y2 - uy * sh + ny * off
        }, attrs), g);
      } else if (b[2] === 2) {
        var o = L * 0.1;
        el('line', Object.assign({ x1: x1 + nx * o, y1: y1 + ny * o, x2: x2 + nx * o, y2: y2 + ny * o }, attrs), g);
        el('line', Object.assign({ x1: x1 - nx * o, y1: y1 - ny * o, x2: x2 - nx * o, y2: y2 - ny * o }, attrs), g);
      } else {
        el('line', Object.assign({ x1: x1, y1: y1, x2: x2, y2: y2 }, attrs), g);
      }
    });
    t.a.forEach(function (a, i) {
      if (a[2]) { var p = P(i); label(g, p[0], p[1], a[2], fs, ink); }
    });
  }

  function render() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var cols = columns();
    var W = host.clientWidth;
    var L = Math.max(6.5, Math.min(17, cols[0].w * 0.17));
    var top = Math.max(10, L * 0.9);
    var H = Math.ceil(top + L * 5.9);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    host.style.height = H + 'px';

    var stopAt = state && state.isStop ? state.col : SEQ.length;
    var half = cols[0].w / 2;
    var x0 = cols[0].x - half + 2, x1 = cols[SEQ.length - 1].x + half - 2;
    var fs = Math.max(8, Math.min(11, L * 0.7));

    // backbone, cut short at a stop codon
    var live = el('g', {});
    var gone = el('g', { opacity: 0.14 });
    var cut = stopAt < SEQ.length ? cols[stopAt].x - half + 2 : x1;
    el('line', { x1: x0, y1: top, x2: cut, y2: top, stroke: INK, 'stroke-width': Math.max(1.4, L * 0.11), 'stroke-linecap': 'round' }, live);
    if (stopAt < SEQ.length) {
      el('line', { x1: cut, y1: top, x2: x1, y2: top, stroke: INK, 'stroke-width': Math.max(1.4, L * 0.11) }, gone);
    }
    var termN = el('text', { x: x0 - 4, y: top + fs * 0.36, 'font-size': fs, fill: GRAPHITE, 'text-anchor': 'end' }, live);
    termN.textContent = 'N';
    var termC = el('text', { x: (stopAt < SEQ.length ? cut : x1) + 4, y: top + fs * 0.36, 'font-size': fs, fill: GRAPHITE }, live);
    termC.textContent = 'C';

    for (var c = 0; c < SEQ.length; c++) {
      var g = c >= stopAt ? gone : live;
      var aa = SEQ[c], mark = null;
      if (state && state.col === c) {
        if (state.isStop) { continue; }
        aa = state.aa;
        mark = state.colour;
      }
      el('circle', { cx: cols[c].x, cy: top, r: Math.max(1.6, L * 0.13), fill: INK }, g);
      drawSideChain(g, aa, cols[c].x, top, L, INK, mark);
    }
  }

  document.addEventListener('name:variant', function (e) {
    state = e.detail;
    render();
  });

  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; render(); });
  }
  if (window.ResizeObserver) new ResizeObserver(schedule).observe(map);
  else window.addEventListener('resize', schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  // the map is built by map.js (loaded before this file); wait a frame for layout
  requestAnimationFrame(render);
})();
