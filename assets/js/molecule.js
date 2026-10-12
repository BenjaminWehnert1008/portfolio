/* My full name as a peptide (B-E-N-J-A-M-I-N-W-E-H-N-E-R-T), folded by Chai-1.
   Drawn on a canvas: the backbone as a smooth tube through the C-alpha atoms,
   side chains as balls and sticks. Drag (or use the arrow keys) to turn it.
   When a cell of the map is selected, the matching surname residue is swapped,
   shown in the cell's colour, and the model rolls so that residue faces you. */
(function () {
  'use strict';

  var DATA = window.NAME_DATA && window.NAME_DATA.structure;
  var fig = document.getElementById('molecule');
  if (!DATA || !fig) return;
  var canvas = fig.querySelector('canvas');
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var INK = [29, 27, 32], PAPER = [241, 241, 237];
  var FIRST_NAME = 8;                 // residues 0-7 spell BENJAMIN
  var HIDDEN = { N: 1, C: 1, O: 1, OXT: 1 };   // backbone atoms the tube stands in for
  var RADIUS = { C: 0.3, N: 0.34, O: 0.34, S: 0.46 };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var atoms = DATA.atoms.map(function (a) {
    return { el: a[0], ri: a[1], name: a[2], p: [a[3], a[4], a[5]] };
  });
  var bonds = DATA.bonds;
  var caOf = {}, nOf = {}, nRes = 0;
  atoms.forEach(function (a, i) {
    if (a.name === 'CA') caOf[a.ri] = i;
    if (a.name === 'N') nOf[a.ri] = i;
    nRes = Math.max(nRes, a.ri + 1);
  });

  // the backbone tube: a Catmull-Rom curve through the C-alpha atoms
  var tube = [];
  (function () {
    var P = [];
    for (var r = 0; r < nRes; r++) P.push(atoms[caOf[r]].p);
    function at(i) { return P[Math.max(0, Math.min(P.length - 1, i))]; }
    var STEPS = 10;
    for (var i = 0; i < P.length - 1; i++) {
      var p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      for (var s = 0; s <= STEPS; s++) {
        var t = s / STEPS, t2 = t * t, t3 = t2 * t;
        var q = [0, 1, 2].map(function (k) {
          return 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
        });
        if (s === 0 && i > 0) continue;
        tube.push({ p: q, ri: t < 0.5 ? i : i + 1 });
      }
    }
  })();

  // a size that fits every orientation the model can be turned to
  var r3 = 0, ryz = 0;
  atoms.forEach(function (a) {
    var x = a.p[0], y = a.p[1], z = a.p[2];
    r3 = Math.max(r3, Math.sqrt(x * x + y * y + z * z));
    ryz = Math.max(ryz, Math.sqrt(y * y + z * z));
  });
  r3 += 1.5; ryz += 1.6;

  var view = { yaw: 0.22, roll: 0.35 };
  var state = null;
  var anim = null;
  var W = 0, H = 0, dpr = 1, scale = 1;

  function mix(c, t) {
    t = Math.max(0, Math.min(0.92, t));
    return 'rgb(' + Math.round(c[0] + (PAPER[0] - c[0]) * t) + ',' + Math.round(c[1] + (PAPER[1] - c[1]) * t) + ',' + Math.round(c[2] + (PAPER[2] - c[2]) * t) + ')';
  }

  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;    // layout size, unaffected by the landing's scaling
    if (!W || !H) return;
    dpr = Math.min(2.5, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    scale = Math.min((W - 16) / (2 * r3), (H - 16) / (2 * ryz));
    draw();
  }

  function rotate(p) {
    // roll about the model's long axis (x), then yaw about the vertical (y)
    var cr = Math.cos(view.roll), sr = Math.sin(view.roll);
    var y1 = cr * p[1] - sr * p[2], z1 = sr * p[1] + cr * p[2];
    var cy = Math.cos(view.yaw), sy = Math.sin(view.yaw);
    return [cy * p[0] + sy * z1, y1, -sy * p[0] + cy * z1];
  }
  function project(p) {
    var q = rotate(p);
    return { x: W / 2 + q[0] * scale, y: H / 2 - q[1] * scale, z: q[2] };
  }

  function scene() {
    var list = [], links = [], index = {};
    var target = state && !state.isWt && !state.isStop ? FIRST_NAME + state.col : -1;
    var stopRi = state && state.isStop ? FIRST_NAME + state.col : Infinity;
    var pick = state ? FIRST_NAME + state.col : -1;

    atoms.forEach(function (a, i) {
      if (HIDDEN[a.name]) return;
      if (a.ri === target && a.name !== 'CA') return;     // replaced by the variant below
      if (a.ri === stopRi && a.name !== 'CA') return;
      index[i] = list.length;
      list.push({ p: a.p, el: a.el, ri: a.ri, ca: a.name === 'CA', faint: a.ri >= stopRi,
                  first: a.ri < FIRST_NAME, hit: state && state.isWt && a.ri === pick && a.name !== 'CA' });
    });
    bonds.forEach(function (b) {
      if (index[b[0]] !== undefined && index[b[1]] !== undefined) links.push([index[b[0]], index[b[1]]]);
    });
    if (target >= 0) {
      var m = DATA.mutants[state.col + state.aa];
      var base = list.length;
      m.a.forEach(function (a) {
        list.push({ p: [a[2], a[3], a[4]], el: a[0], ri: target, fill: state.colour, hit: true });
      });
      var nIdx = -1;
      if (state.aa === 'P') {            // proline closes its ring on the backbone nitrogen
        nIdx = list.length;
        list.push({ p: atoms[nOf[target]].p, el: 'N', ri: target, fill: state.colour, hit: true });
      }
      m.b.forEach(function (b) {
        var f = function (k) { return k === -1 ? index[caOf[target]] : (k === m.a.length ? nIdx : base + k); };
        if (f(b[0]) >= 0 && f(b[1]) >= 0) links.push([f(b[0]), f(b[1])]);
      });
    }
    return { list: list, links: links, pick: pick, stopRi: stopRi };
  }

  function draw() {
    if (!W) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var sc = scene();
    var pts = sc.list.map(function (a) { var q = project(a.p); q.a = a; return q; });
    var tpts = tube.map(function (t) { var q = project(t.p); q.ri = t.ri; return q; });
    var zr = r3;
    function depth(z) { return 1 - (z + zr) / (2 * zr); }        // 0 near, 1 far

    var items = [];
    for (var i = 0; i < tpts.length - 1; i++) {
      items.push({ z: (tpts[i].z + tpts[i + 1].z) / 2 - 0.4, seg: [tpts[i], tpts[i + 1]] });
    }
    sc.links.forEach(function (l) {
      var a = pts[l[0]], b = pts[l[1]];
      if (a && b) items.push({ z: (a.z + b.z) / 2 - 0.01, bond: [a, b] });
    });
    pts.forEach(function (p) { items.push({ z: p.z, atom: p }); });
    items.sort(function (u, v) { return u.z - v.z; });

    // a soft halo behind the selected residue
    var hits = pts.filter(function (p) { return p.a.hit; });
    if (hits.length) {
      var hx = 0, hy = 0;
      hits.forEach(function (p) { hx += p.x; hy += p.y; });
      hx /= hits.length; hy /= hits.length;
      ctx.beginPath();
      ctx.arc(hx, hy, Math.max(16, 2.3 * scale), 0, Math.PI * 2);
      ctx.fillStyle = state.colour;
      ctx.globalAlpha = 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    var tubeW = Math.max(5, scale * 0.95);
    items.forEach(function (it) {
      if (it.seg) {
        var a = it.seg[0], b = it.seg[1], ri = a.ri;
        var picked = ri === sc.pick && state && !state.isStop;
        ctx.globalAlpha = ri >= sc.stopRi ? 0.1 : 1;
        ctx.strokeStyle = picked ? state.colour : mix(INK, 0.58 + depth(it.z) * 0.22 + (ri < FIRST_NAME ? 0.12 : 0));
        ctx.lineWidth = picked ? tubeW * 1.15 : tubeW;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      } else if (it.bond) {
        var u = it.bond[0], v = it.bond[1];
        var first = u.a.first && v.a.first;
        ctx.globalAlpha = u.a.faint || v.a.faint ? 0.1 : 1;
        ctx.strokeStyle = (u.a.hit || v.a.hit) ? 'rgb(29,27,32)' : mix(INK, 0.06 + depth(it.z) * 0.45 + (first ? 0.25 : 0));
        ctx.lineWidth = Math.max(1.3, scale * 0.15);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(u.x, u.y);
        ctx.lineTo(v.x, v.y);
        ctx.stroke();
      } else {
        var p = it.atom, at = p.a;
        if (at.ca) return;                      // the tube carries the C-alpha
        var d = depth(p.z);
        var tone = mix(INK, 0.04 + d * 0.45 + (at.first ? 0.25 : 0));
        var r = (RADIUS[at.el] || 0.3) * scale * (0.85 + 0.3 * (1 - d));
        ctx.globalAlpha = at.faint ? 0.1 : 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        if (at.fill) {
          ctx.fillStyle = at.fill;
          ctx.fill();
          ctx.lineWidth = 1.4;
          ctx.strokeStyle = 'rgb(29,27,32)';
          ctx.stroke();
        } else if (at.el === 'C') {
          ctx.fillStyle = tone;
          ctx.fill();
        } else {
          // N, O and S drawn open, so they read apart from carbon without extra colours
          ctx.fillStyle = 'rgb(241,241,237)';
          ctx.fill();
          ctx.lineWidth = Math.max(1.3, scale * 0.11);
          ctx.strokeStyle = tone;
          ctx.stroke();
        }
      }
    });
    ctx.globalAlpha = 1;
  }

  // turning the model so the selected residue faces the viewer
  function sideCentroid(col, aa, isWt) {
    var ri = FIRST_NAME + col, s = [0, 0, 0], n = 0;
    if (isWt || aa === '*') {
      atoms.forEach(function (a) {
        if (a.ri === ri && !HIDDEN[a.name] && a.name !== 'CA') { s[0] += a.p[0]; s[1] += a.p[1]; s[2] += a.p[2]; n++; }
      });
    } else {
      DATA.mutants[col + aa].a.forEach(function (a) { s[0] += a[2]; s[1] += a[3]; s[2] += a[4]; n++; });
    }
    if (!n) return atoms[caOf[ri]].p;
    return [s[0] / n, s[1] / n, s[2] / n];
  }

  function animateTo(roll, yaw) {
    var from = { roll: view.roll, yaw: view.yaw };
    var d = Math.atan2(Math.sin(roll - from.roll), Math.cos(roll - from.roll));
    var dy = Math.atan2(Math.sin(yaw - from.yaw), Math.cos(yaw - from.yaw));
    if (anim) { cancelAnimationFrame(anim); anim = null; }
    if (reduce) { view.roll = from.roll + d; view.yaw = from.yaw + dy; draw(); return; }
    var t0 = performance.now(), dur = 520;
    (function step(now) {
      var k = Math.min(1, (now - t0) / dur);
      var e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      view.roll = from.roll + d * e;
      view.yaw = from.yaw + dy * e;
      draw();
      anim = k < 1 ? requestAnimationFrame(step) : null;
    })(t0);
  }

  document.addEventListener('name:variant', function (e) {
    state = e.detail;
    if (!state) { draw(); return; }
    var c = sideCentroid(state.col, state.aa, state.isWt);
    // the long axis runs along x through the origin, so (y, z) points from the axis to the side chain:
    // roll until it stands up in profile, leaning a little towards the viewer, and turn the model side-on
    animateTo(Math.atan2(-c[2], c[1]) + 0.45, 0.18);
  });

  // drag to turn: sideways about the vertical, up and down about the long axis
  var drag = null;
  canvas.addEventListener('pointerdown', function (e) {
    drag = { x: e.clientX, y: e.clientY, yaw: view.yaw, roll: view.roll, id: e.pointerId };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    if (anim) { cancelAnimationFrame(anim); anim = null; }
    fig.classList.add('dragging');
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    view.yaw = drag.yaw + (e.clientX - drag.x) * 0.011;
    view.roll = drag.roll + (e.clientY - drag.y) * 0.011;
    draw();
  });
  function end() { drag = null; fig.classList.remove('dragging'); }
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('keydown', function (e) {
    var step = 0.18;
    if (e.key === 'ArrowLeft') view.yaw -= step;
    else if (e.key === 'ArrowRight') view.yaw += step;
    else if (e.key === 'ArrowUp') view.roll -= step;
    else if (e.key === 'ArrowDown') view.roll += step;
    else return;
    e.preventDefault();
    draw();
  });

  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);
  resize();

  // as the page opens, the model makes one slow half turn while the map develops
  if (!reduce) {
    var y1 = view.yaw, y0 = y1 - Math.PI;
    view.yaw = y0;
    draw();
    var start = performance.now() + 350, dur = 3200;
    (function spin(now) {
      if (state || drag) return;                     // someone is already exploring: stop
      var k = Math.max(0, Math.min(1, (now - start) / dur));
      var e = 1 - Math.pow(1 - k, 3);
      view.yaw = y0 + (y1 - y0) * e;
      draw();
      if (k < 1) anim = requestAnimationFrame(spin); else anim = null;
    })(performance.now());
  }
})();
