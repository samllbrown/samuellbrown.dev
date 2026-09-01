/*
 * Can you pick the puppy? Demos for the forecast post.
 *
 * Mounts:
 *   [data-forecast-bet]  - four real training runs shown at an early generation;
 *                          the reader backs one, then the future is revealed.
 *
 * Needs sheepdog.js, robot-collie.js and collie-forecast-runs.js loaded first.
 */
(function () {
	'use strict';
	if (typeof document === 'undefined') return;
	var SD = globalThis.__Sheepdog, B = globalThis.__RobotCollie, LIB = globalThis.__CollieForecastRuns;
	if (!SD || !B || !LIB) return;

	var COL = { text: '#8490b5', axis: 'rgba(255,255,255,0.14)', mark: 'rgba(255,255,255,0.35)' };
	var PUP = ['#a93fe0', '#c97c12', '#35a066', '#4f9cf9'];
	var LETTERS = ['A', 'B', 'C', 'D'];
	// history row: [gen, best, mean, pFit, pBehind, pNear, pProgress, pPenned]
	var H = { gen: 0, best: 1, mean: 2, pFit: 3, pBehind: 4, pNear: 5, pProgress: 6, pPenned: 7 };

	function seededShuffle(a, rng) {
		for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
		return a;
	}
	function bestSoFar(run, gen) {
		var b = -Infinity;
		for (var i = 0; i < run.history.length; i++) { if (run.history[i][H.gen] > gen) break; b = Math.max(b, run.history[i][H.best]); }
		return b;
	}
	function atGen(run, gen, col) {
		var row = null;
		for (var i = 0; i < run.history.length; i++) if (run.history[i][H.gen] <= gen) row = run.history[i];
		return row ? row[col] : 0;
	}
	function setupCanvas(canvas, cssW, cssH) {
		var dpr = Math.min(2, window.devicePixelRatio || 1);
		canvas.style.height = cssH + 'px';
		canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
		return dpr;
	}

	// ---- The bet -------------------------------------------------------------
	function mountBet(root) {
		var PEEK = parseInt(root.dataset.gen || '15', 10);
		var pool = (LIB.opts.ga || []).filter(function (r) { return r.genomes && r.genomes[PEEK] && r.genomes[LIB.gens]; });
		if (pool.length < 4) return;
		var grid = root.querySelector('[data-role="grid"]');
		var verdictEl = root.querySelector('[data-role="verdict"]'), tallyEl = root.querySelector('[data-role="tally"]');
		var chartEl = root.querySelector('[data-role="chart"]');
		var rng = SD.mulberry32((Math.random() * 1e9) >>> 0);
		var panels = [], picked = -1, revealed = false, roundRuns = [], roundSeed = 7;
		var tally = { rounds: 0, you: 0, score: 0 };
		var revealT0 = 0;

		for (var i = 0; i < 4; i++) {
			var p = document.createElement('div');
			p.className = 'fc-panel';
			p.innerHTML = '<div class="fc-title"><b style="color:' + PUP[i] + '">puppy ' + LETTERS[i] + '</b> <span data-role="cap"></span></div>' +
				'<div class="fc-field-wrap"><canvas class="fc-field"></canvas><span class="fc-badge" data-role="badge"></span></div>' +
				'<canvas class="fc-spark"></canvas>' +
				'<button type="button" data-pick="' + i + '">Back ' + LETTERS[i] + '</button>';
			grid.appendChild(p);
			panels.push({
				root: p, canvas: p.querySelector('.fc-field'), ctx: p.querySelector('.fc-field').getContext('2d'),
				spark: p.querySelector('.fc-spark'), capEl: p.querySelector('[data-role="cap"]'), badgeEl: p.querySelector('[data-role="badge"]'),
				btn: p.querySelector('button'), sim: null, px: 1,
			});
		}

		function drawSpark(panel, run, upTo, full) {
			var c = panel.spark, w = c.clientWidth || 200, h = 34;
			var dpr = setupCanvas(c, w, h), g = c.getContext('2d');
			g.setTransform(dpr, 0, 0, dpr, 0, 0);
			g.clearRect(0, 0, w, h);
			g.strokeStyle = COL.axis; g.beginPath(); g.moveTo(0, h - 1); g.lineTo(w, h - 1); g.stroke();
			var X = function (gen) { return gen / LIB.gens * (w - 2) + 1; };
			var Y = function (v) { return h - 2 - Math.max(0, Math.min(1, v / 2.3)) * (h - 4); };
			g.strokeStyle = full ? PUP[panels.indexOf(panel)] : 'rgba(233,230,221,0.8)';
			g.lineWidth = 1.5; g.beginPath();
			var started = false;
			for (var i = 0; i < run.history.length; i++) {
				var row = run.history[i];
				if (!full && row[H.gen] > upTo) break;
				if (!started) { g.moveTo(X(row[H.gen]), Y(row[H.best])); started = true; }
				else g.lineTo(X(row[H.gen]), Y(row[H.best]));
			}
			g.stroke();
			if (!full) { g.strokeStyle = COL.mark; g.setLineDash([2, 3]); g.beginPath(); g.moveTo(X(upTo), 0); g.lineTo(X(upTo), h); g.stroke(); g.setLineDash([]); }
		}

		function drawChart(progress) {
			if (!chartEl) return;
			var w = chartEl.clientWidth || 300, h = 150;
			var dpr = setupCanvas(chartEl, w, h), g = chartEl.getContext('2d');
			g.setTransform(dpr, 0, 0, dpr, 0, 0);
			g.clearRect(0, 0, w, h);
			var pad = { l: 30, r: 8, t: 8, b: 18 };
			var X = function (gen) { return pad.l + gen / LIB.gens * (w - pad.l - pad.r); };
			var Y = function (v) { return h - pad.b - Math.max(0, Math.min(1, v / 2.3)) * (h - pad.t - pad.b); };
			g.font = '10px ui-monospace, Menlo, Consolas, monospace'; g.fillStyle = COL.text;
			[0, 1, 2].forEach(function (t) {
				g.strokeStyle = COL.axis; g.beginPath(); g.moveTo(pad.l, Y(t) + 0.5); g.lineTo(w - pad.r, Y(t) + 0.5); g.stroke();
				g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(String(t), pad.l - 5, Y(t));
			});
			g.textAlign = 'right'; g.textBaseline = 'bottom';
			g.fillText('score by generation', w - pad.r, h - 4);
			var upTo = revealed ? PEEK + (LIB.gens - PEEK) * Math.min(1, progress) : PEEK;
			g.strokeStyle = COL.mark; g.setLineDash([2, 3]); g.beginPath(); g.moveTo(X(PEEK), pad.t); g.lineTo(X(PEEK), h - pad.b); g.stroke(); g.setLineDash([]);
			for (var r = 0; r < roundRuns.length; r++) {
				g.strokeStyle = PUP[r]; g.lineWidth = 1.8; g.beginPath();
				var started = false, hist = roundRuns[r].history;
				for (var i = 0; i < hist.length; i++) {
					if (hist[i][H.gen] > upTo) break;
					if (!started) { g.moveTo(X(hist[i][H.gen]), Y(hist[i][H.best])); started = true; }
					else g.lineTo(X(hist[i][H.gen]), Y(hist[i][H.best]));
				}
				g.stroke();
			}
		}

		function caption(i) {
			var r = roundRuns[i];
			if (!revealed) return 'peak ' + bestSoFar(r, PEEK).toFixed(2) + ' · now ' + atGen(r, PEEK, H.best).toFixed(2);
			return 'final ' + r.finalFit.toFixed(2) + ' · ' + r.finalDone + '/30 flocks';
		}

		function startSims(gen) {
			panels.forEach(function (p, i) {
				var r = roundRuns[i];
				p.sim = new SD.Sim(LIB.level);
				p.sim.rand = SD.mulberry32(roundSeed + 1);
				p.sim.reset(roundSeed);
				p.sim.brain = B.makeBrain(Float64Array.from(r.genomes[gen]));
				p.sim.start('brain');
				p.capEl.textContent = caption(i);
			});
		}

		function newRound() {
			revealed = false; picked = -1;
			roundSeed = 90000 + Math.floor(rng() * 9999); // never a training or test flock
			// One from the top quarter, one from the bottom quarter, two others, so
			// there is always a real difference to find.
			var sorted = pool.slice().sort(function (a, b) { return a.finalFit - b.finalFit; });
			var q = Math.max(1, Math.floor(pool.length / 4));
			var lo = sorted[Math.floor(rng() * q)], hi = sorted[sorted.length - 1 - Math.floor(rng() * q)];
			var rest = seededShuffle(sorted.filter(function (r) { return r !== lo && r !== hi; }), rng).slice(0, 2);
			roundRuns = seededShuffle([lo, hi, rest[0], rest[1]], rng);
			panels.forEach(function (p, i) { p.btn.disabled = false; p.root.classList.remove('fc-picked', 'fc-winner'); p.badgeEl.textContent = ''; drawSpark(p, roundRuns[i], PEEK, false); });
			startSims(PEEK);
			if (verdictEl) verdictEl.textContent = 'Four real runs, paused at generation ' + PEEK + ', each replaying the best dog of its latest batch on the same flock. Which one becomes the best dog by generation ' + LIB.gens + '?';
			drawChart(0);
		}

		function reveal(pick) {
			picked = pick; revealed = true; revealT0 = performance.now();
			var finals = roundRuns.map(function (r) { return r.finalFit; });
			var win = finals.indexOf(Math.max.apply(null, finals));
			// The rival: backing the best score-so-far at the peek generation.
			var scores = roundRuns.map(function (r) { return bestSoFar(r, PEEK); });
			var scorePick = scores.indexOf(Math.max.apply(null, scores));
			tally.rounds++;
			if (pick === win) tally.you++;
			if (scorePick === win) tally.score++;
			panels.forEach(function (p, i) {
				p.btn.disabled = true;
				if (i === pick) p.root.classList.add('fc-picked');
				if (i === win) p.root.classList.add('fc-winner');
				p.badgeEl.textContent = i === pick && i === win ? 'your pick, and the winner' : i === pick ? 'your pick' : i === win ? 'the winner' : '';
				p.capEl.textContent = caption(i);
				drawSpark(p, roundRuns[i], PEEK, true);
			});
			startSims(LIB.gens); // and this is who they grew up to be, same flock
			if (verdictEl) {
				var msg = 'Puppy ' + LETTERS[win] + ' won (final ' + finals[win].toFixed(2) + ').';
				msg += pick === win ? ' You called it.' : ' You backed ' + LETTERS[pick] + ' (final ' + finals[pick].toFixed(2) + ').';
				msg += ' The score-watcher, backing the highest peak (' + LETTERS[scorePick] + '), ' + (scorePick === win ? 'got it too.' : 'got it wrong' + (pick === win ? '.' : ' too.'));
				msg += ' The fields now show who each puppy grew up to be, on the same flock.';
				verdictEl.textContent = msg;
			}
			if (tallyEl) tallyEl.textContent = tally.rounds + ' round' + (tally.rounds === 1 ? '' : 's') + ': you ' + tally.you + ' · score-watcher ' + tally.score + ' · guessing would get about ' + Math.round(tally.rounds / 4 * 10) / 10;
		}

		root.querySelectorAll('[data-pick]').forEach(function (b) {
			b.addEventListener('click', function () { if (!revealed) reveal(parseInt(b.dataset.pick, 10)); });
		});
		root.querySelectorAll('[data-action="new"]').forEach(function (b) { b.addEventListener('click', newRound); });

		function resize() {
			panels.forEach(function (p) {
				var cssW = p.root.clientWidth || 280, cssH = cssW * (SD.H / SD.W);
				setupCanvas(p.canvas, cssW, cssH);
				p.px = p.canvas.width / SD.W;
			});
			panels.forEach(function (p, i) { if (roundRuns[i]) drawSpark(p, roundRuns[i], PEEK, revealed); });
			drawChart(1);
		}

		var visible = true;
		if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0.15 }).observe(root);
		var MAXREPLAY = 30 * SD.TICKS_PER_SEC;
		function frame() {
			if (!document.body.contains(root)) return;
			if (visible && roundRuns.length) {
				var allDone = true;
				panels.forEach(function (p) {
					if (!p.sim) return;
					if (p.sim.state === 'running' && p.sim.ticks < MAXREPLAY) { p.sim.step(); allDone = false; }
					SD.draw(p.ctx, p.sim, p.px, false);
				});
				if (allDone) startSims(revealed ? LIB.gens : PEEK);
				if (revealed) drawChart((performance.now() - revealT0) / 2500);
			}
			requestAnimationFrame(frame);
		}
		newRound(); resize();
		if ('ResizeObserver' in window) new ResizeObserver(resize).observe(root); else window.addEventListener('resize', resize);
		requestAnimationFrame(frame);
	}

	// ---- Chart tooltips ------------------------------------------------------
	// Bars carry their own text in data-tip. Line charts carry their series in
	// data-lines, and get a crosshair with every line's value at the nearest x.
	function mountFigures() {
		var tip = document.querySelector('.fc-tip');
		if (!tip) { tip = document.createElement('div'); tip.className = 'fc-tip'; tip.style.display = 'none'; document.body.appendChild(tip); }
		function show(html, x, y) {
			tip.innerHTML = html; tip.style.display = 'block';
			var r = tip.getBoundingClientRect();
			var left = Math.max(8, Math.min(x + 14, window.innerWidth - r.width - 8)), top = y - r.height - 14;
			if (top < 8) top = y + 18;
			tip.style.left = left + 'px'; tip.style.top = top + 'px';
		}
		function hide() { tip.style.display = 'none'; }
		document.querySelectorAll('figure.robot-figure svg').forEach(function (svg) {
			if (svg.dataset.tipsReady) return;
			svg.dataset.tipsReady = '1';
			svg.querySelectorAll('[data-tip]').forEach(function (el) {
				el.addEventListener('pointerenter', function (e) { el.classList.add('fc-hot'); show(el.dataset.tip, e.clientX, e.clientY); });
				el.addEventListener('pointermove', function (e) { show(el.dataset.tip, e.clientX, e.clientY); });
				el.addEventListener('pointerleave', function () { el.classList.remove('fc-hot'); hide(); });
			});
			if (!svg.dataset.lines) return;
			var L = JSON.parse(svg.dataset.lines), NS = 'http://www.w3.org/2000/svg';
			var cross = document.createElementNS(NS, 'line');
			cross.setAttribute('stroke', 'rgba(233,230,221,0.5)'); cross.setAttribute('stroke-dasharray', '3 3');
			cross.setAttribute('y1', L.pad.t); cross.setAttribute('y2', L.h - L.pad.b); cross.style.display = 'none';
			svg.appendChild(cross);
			var dots = L.series.map(function (se) { var c = document.createElementNS(NS, 'circle'); c.setAttribute('r', 3.5); c.setAttribute('fill', se.color); c.style.display = 'none'; svg.appendChild(c); return c; });
			var X = function (v) { return L.pad.l + (v - L.xmin) / (L.xmax - L.xmin) * (L.w - L.pad.l - L.pad.r); };
			var Y = function (v) { return L.h - L.pad.b - (v - L.ymin) / (L.ymax - L.ymin) * (L.h - L.pad.t - L.pad.b); };
			var fmt = function (v) { return L.yfmt === 'pct' ? Math.round(v) + '%' : v.toFixed(2); };
			function leave() { hide(); cross.style.display = 'none'; dots.forEach(function (d) { d.style.display = 'none'; }); }
			function move(e) {
				var r = svg.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * L.w;
				if (px < L.pad.l || px > L.w - L.pad.r) { leave(); return; }
				var x = L.xmin + (px - L.pad.l) / (L.w - L.pad.l - L.pad.r) * (L.xmax - L.xmin);
				var rows = [], xs = 0, n = 0;
				L.series.forEach(function (se, i) {
					var best = null;
					se.points.forEach(function (p) { if (best === null || Math.abs(p[0] - x) < Math.abs(best[0] - x)) best = p; });
					if (!best) return;
					dots[i].setAttribute('cx', X(best[0])); dots[i].setAttribute('cy', Y(best[1])); dots[i].style.display = '';
					rows.push('<i style="background:' + se.color + '"></i>' + se.name + ' <b>' + fmt(best[1]) + '</b>');
					xs += best[0]; n++;
				});
				var xv = n ? xs / n : x;
				cross.setAttribute('x1', X(xv)); cross.setAttribute('x2', X(xv)); cross.style.display = '';
				show('<span class="fc-tip-x">' + L.xname + ' ' + Math.round(xv) + '</span>' + rows.join('<br>'), e.clientX, e.clientY);
			}
			svg.addEventListener('pointermove', move);
			svg.addEventListener('pointerdown', move);
			svg.addEventListener('pointerleave', leave);
		});
		if (!document.body.dataset.fcTipDismiss) {
			document.body.dataset.fcTipDismiss = '1';
			document.addEventListener('pointerdown', function (e) { if (!e.target.closest || !e.target.closest('figure.robot-figure')) hide(); });
		}
	}

	function mountAll() {
		document.querySelectorAll('[data-forecast-bet]').forEach(function (r) { if (!r.dataset.ready) { r.dataset.ready = '1'; mountBet(r); } });
		mountFigures();
	}
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll); else mountAll();
	document.addEventListener('astro:page-load', mountAll);
})();
