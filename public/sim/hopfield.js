/*
 * Hopfield network demos for the blog post.
 *
 * Mount points:
 *   [data-hopfield="memory"]   draw pictures, store them with the Hebb rule, corrupt, recall
 *   [data-hopfield="capacity"] keep adding random patterns and watch recall fall over
 *   [data-hopfield="dense"]    the modern (attention) version of the same thing
 *
 * See the post for the markup; everything is looked up by [data-role]/[data-action].
 */
import {
	Hopfield, DenseHopfield, GRID, picture, PICTURE_NAMES,
	corrupt, erase, hamming, mulberry32, randomPattern,
} from './hopfield-core.js';

const N = GRID * GRID;
const COL = {
	bg: '#0e1711',
	grid: 'rgba(255,255,255,0.05)',
	on: '#f3f0e6',
	off: '#16211a',
	flash: '#c561f6',
	text: '#8490b5',
	textStrong: '#c3cadb',
	axis: 'rgba(255,255,255,0.12)',
	hebb: '#a93fe0',
	storkey: '#c97c12',
	pinv: '#35a066',
	guide: 'rgba(255,255,255,0.35)',
	weightPos: '#c97c12',
	weightNeg: '#a93fe0',
};
const RULE_NAME = { hebb: 'Hebb', storkey: 'Storkey', pinv: 'Pseudo-inverse' };

// ---- small helpers ---------------------------------------------------------

function fitCanvas(canvas, cssW, cssH) {
	const dpr = Math.min(2, window.devicePixelRatio || 1);
	canvas.width = Math.round(cssW * dpr);
	canvas.height = Math.round(cssH * dpr);
	canvas.style.height = cssH + 'px';
	const ctx = canvas.getContext('2d');
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	return ctx;
}

/** Draw a ±1 (or continuous) state onto a square canvas. flashAt is an optional per-cell timestamp. */
function drawGrid(ctx, size, x, flashAt, now) {
	const cell = size / GRID;
	ctx.fillStyle = COL.bg;
	ctx.fillRect(0, 0, size, size);
	for (let i = 0; i < N; i++) {
		const r = (i / GRID) | 0, c = i % GRID;
		const v = x[i];
		if (v >= 1) ctx.fillStyle = COL.on;
		else if (v <= -1) ctx.fillStyle = COL.off;
		else {
			const t = (v + 1) / 2;
			ctx.fillStyle = `rgb(${lerp(22, 243, t) | 0},${lerp(33, 240, t) | 0},${lerp(26, 230, t) | 0})`;
		}
		ctx.fillRect(c * cell + 0.5, r * cell + 0.5, cell - 1, cell - 1);
		if (flashAt && now - flashAt[i] < 350) {
			ctx.globalAlpha = 1 - (now - flashAt[i]) / 350;
			ctx.fillStyle = COL.flash;
			ctx.fillRect(c * cell + 0.5, r * cell + 0.5, cell - 1, cell - 1);
			ctx.globalAlpha = 1;
		}
	}
}
function lerp(a, b, t) { return a + (b - a) * t; }

function thumb(x, px = 2, title = '') {
	const c = document.createElement('canvas');
	c.width = GRID * px; c.height = GRID * px;
	c.style.width = GRID * px + 'px'; c.style.height = GRID * px + 'px';
	c.className = 'hop-thumb';
	if (title) c.title = title;
	paintThumb(c, x);
	return c;
}
function paintThumb(c, x) {
	const ctx = c.getContext('2d');
	const px = c.width / GRID;
	ctx.fillStyle = COL.off; ctx.fillRect(0, 0, c.width, c.height);
	ctx.fillStyle = COL.on;
	for (let i = 0; i < N; i++) if (x[i] > 0) ctx.fillRect((i % GRID) * px, ((i / GRID) | 0) * px, px, px);
}

/** Draw the weight matrix as a diverging heatmap: orange +, purple −, dark = 0. */
function drawWeights(canvas, W, n) {
	canvas.width = n; canvas.height = n;
	const ctx = canvas.getContext('2d');
	const img = ctx.createImageData(n, n);
	let max = 1e-9;
	for (let k = 0; k < n * n; k++) if (Math.abs(W[k]) > max) max = Math.abs(W[k]);
	for (let k = 0; k < n * n; k++) {
		const v = W[k] / max;
		const t = Math.min(1, Math.abs(v));
		const o = k * 4;
		if (v >= 0) { img.data[o] = lerp(14, 201, t); img.data[o + 1] = lerp(23, 124, t); img.data[o + 2] = lerp(17, 18, t); }
		else { img.data[o] = lerp(14, 169, t); img.data[o + 1] = lerp(23, 63, t); img.data[o + 2] = lerp(17, 224, t); }
		img.data[o + 3] = 255;
	}
	ctx.putImageData(img, 0, 0);
}

function setPressed(root, action, on) {
	const b = root.querySelector(`[data-action="${action}"]`);
	if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false');
}

function makeGridInput(canvas, getState, onPaint) {
	let painting = null;
	function cellFromEvent(ev) {
		const rect = canvas.getBoundingClientRect();
		const c = Math.floor((ev.clientX - rect.left) / rect.width * GRID);
		const r = Math.floor((ev.clientY - rect.top) / rect.height * GRID);
		if (c < 0 || c >= GRID || r < 0 || r >= GRID) return -1;
		return r * GRID + c;
	}
	canvas.addEventListener('pointerdown', (ev) => {
		const i = cellFromEvent(ev);
		if (i < 0) return;
		const x = getState();
		painting = x[i] > 0 ? -1 : 1;
		onPaint(i, painting);
		canvas.setPointerCapture(ev.pointerId);
		ev.preventDefault();
	});
	canvas.addEventListener('pointermove', (ev) => {
		if (painting === null) return;
		const i = cellFromEvent(ev);
		if (i >= 0) onPaint(i, painting);
	});
	const stop = () => { painting = null; };
	canvas.addEventListener('pointerup', stop);
	canvas.addEventListener('pointercancel', stop);
}

/** Tiny line chart on a canvas. series: [{points:[[x,y]...], color, label}] */
function xlabelOf(o) { return o.xlabel; }
function drawLineChart(ctx, w, h, series, opts) {
	const pad = { l: 34, r: 12, t: 10, b: xlabelOf(opts) && opts.xticks && opts.xticks.length ? 36 : 24 };
	const { xmin, xmax, ymin, ymax, xlabel, ylabel, guides = [], yticks = [], xticks = [] } = opts;
	const X = (v) => pad.l + (v - xmin) / (xmax - xmin) * (w - pad.l - pad.r);
	const Y = (v) => h - pad.b - (v - ymin) / (ymax - ymin) * (h - pad.t - pad.b);
	ctx.clearRect(0, 0, w, h);
	ctx.font = '11px ui-monospace, Menlo, Consolas, monospace';
	ctx.strokeStyle = COL.axis; ctx.lineWidth = 1;
	ctx.fillStyle = COL.text;
	for (const t of yticks) {
		ctx.beginPath(); ctx.moveTo(pad.l, Y(t) + 0.5); ctx.lineTo(w - pad.r, Y(t) + 0.5); ctx.stroke();
		ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
		ctx.fillText(String(t), pad.l - 6, Y(t));
	}
	for (const t of xticks) {
		ctx.textAlign = 'center'; ctx.textBaseline = 'top';
		ctx.fillText(String(t), X(t), h - pad.b + 6);
	}
	ctx.beginPath(); ctx.moveTo(pad.l + 0.5, pad.t); ctx.lineTo(pad.l + 0.5, h - pad.b + 0.5); ctx.lineTo(w - pad.r, h - pad.b + 0.5); ctx.stroke();
	for (const g of guides) {
		ctx.save();
		ctx.strokeStyle = COL.guide; ctx.setLineDash([3, 4]);
		ctx.beginPath(); ctx.moveTo(X(g.x) + 0.5, pad.t); ctx.lineTo(X(g.x) + 0.5, h - pad.b); ctx.stroke();
		ctx.restore();
		ctx.fillStyle = COL.textStrong; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
		ctx.fillText(g.label, X(g.x) + 5, pad.t + (h - pad.t - pad.b) * 0.3);
	}
	if (xlabel) { ctx.fillStyle = COL.text; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText(xlabel, w - pad.r, h - 2); }
	if (ylabel) { ctx.save(); ctx.translate(10, pad.t); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(ylabel, 0, 0); ctx.restore(); }
	for (const s of series) {
		if (s.points.length === 0) continue;
		ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.lineJoin = 'round';
		ctx.beginPath();
		s.points.forEach(([x, y], i) => { if (i === 0) ctx.moveTo(X(x), Y(y)); else ctx.lineTo(X(x), Y(y)); });
		ctx.stroke();
		if (s.dot) {
			const [x, y] = s.points[s.points.length - 1];
			ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(X(x), Y(y), 3.5, 0, Math.PI * 2); ctx.fill();
			ctx.strokeStyle = COL.bg; ctx.lineWidth = 2; ctx.stroke();
		}
	}
	return { X, Y, pad };
}

// ---- Demo 1: memory ---------------------------------------------------------

function mountMemory(root) {
	const canvas = root.querySelector('[data-role="grid"]');
	const libEl = root.querySelector('[data-role="library"]');
	const memEl = root.querySelector('[data-role="memories"]');
	const countEl = root.querySelector('[data-role="count"]');
	const statusEl = root.querySelector('[data-role="status"]');
	const energyEl = root.querySelector('[data-role="energy"]');
	const chartEl = root.querySelector('[data-role="chart"]');
	const weightsEl = root.querySelector('[data-role="weights"]');
	const preload = (root.dataset.preload || '').split(',').map((s) => s.trim()).filter(Boolean);

	const net = new Hopfield(N);
	let rng = mulberry32(7);
	let x = new Int8Array(N).fill(-1);
	const flashAt = new Float64Array(N).fill(-1e9);
	let size = 320, ctx = null;
	let running = null; // { order, k, sweep, flips, energies }
	let energyTrace = [];
	let clean = null;   // the pattern last loaded, to score recall against

	function resize() {
		size = Math.max(160, Math.min(canvas.parentElement.clientWidth, 360));
		canvas.style.width = size + 'px';
		ctx = fitCanvas(canvas, size, size);
		if (chartEl) fitCanvas(chartEl, chartEl.clientWidth || 200, 90);
		render();
	}

	function setStatus(t) { if (statusEl) statusEl.textContent = t; }
	function render() {
		if (!ctx) return;
		drawGrid(ctx, size, x, flashAt, performance.now());
		if (energyEl) energyEl.textContent = 'E = ' + net.energy(x).toFixed(1);
		if (chartEl) {
			const c = chartEl.getContext('2d');
			const w = chartEl.clientWidth, h = 90;
			if (energyTrace.length > 1) {
				const ys = energyTrace.map((p) => p[1]);
				const ymin = Math.min(...ys), ymax = Math.max(...ys);
				drawLineChart(c, w, h, [{ points: energyTrace, color: COL.flash, dot: true }], {
					xmin: 0, xmax: Math.max(N, energyTrace[energyTrace.length - 1][0]), ymin: ymin - 1, ymax: ymax + 1,
					xlabel: 'neuron updates', yticks: [Math.round(ymax), Math.round(ymin)],
				});
			} else {
				c.clearRect(0, 0, w, h);
				c.fillStyle = COL.text; c.font = '11px ui-monospace, Menlo, Consolas, monospace';
				c.textAlign = 'left'; c.textBaseline = 'top';
				c.fillText('energy during recall', 34, 10);
			}
		}
	}

	function renderMemories() {
		memEl.innerHTML = '';
		net.patterns.forEach((p, i) => {
			const t = thumb(p, 2, 'memory ' + (i + 1) + ' (click to load)');
			t.addEventListener('click', () => load(p));
			memEl.appendChild(t);
		});
		if (countEl) countEl.textContent = net.patterns.length + ' stored';
		if (weightsEl) drawWeights(weightsEl, net.W, N);
	}

	function load(p) {
		stop();
		x = Int8Array.from(p); clean = Int8Array.from(p);
		energyTrace = [];
		setStatus('loaded, 0 wrong pixels');
		render();
	}
	function stop() { running = null; }

	function remember() {
		stop();
		net.learn(x, 'hebb');
		clean = Int8Array.from(x);
		renderMemories();
		setStatus('remembered as memory ' + net.patterns.length + ' (W += x xᵀ / n)');
		energyTrace = [];
		render();
	}
	function scribble() {
		stop();
		x = corrupt(x, 0.2, rng);
		energyTrace = [];
		setStatus('scribbled on: flipped 20% of the pixels' + wrong());
		render();
	}
	function rubOut() {
		stop();
		x = erase(x, N / 2, N);
		energyTrace = [];
		setStatus('rubbed out the bottom half' + wrong());
		render();
	}
	function wrong() { return clean ? ', ' + hamming(x, clean) + ' wrong' : ''; }

	function recall() {
		if (net.patterns.length === 0) { setStatus('nothing stored yet: press Remember this first'); return; }
		const order = new Int32Array(N);
		for (let i = 0; i < N; i++) order[i] = i;
		for (let i = N - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
		running = { order, k: 0, sweep: 1, flips: 0, updates: 0 };
		energyTrace = [[0, net.energy(x)]];
	}
	function stepRecall() {
		const r = running;
		const per = 20;
		for (let s = 0; s < per; s++) {
			if (r.k >= N) {
				if (r.flips === 0 || r.sweep >= 30) {
					running = null;
					const w = clean ? hamming(x, clean) : null;
					setStatus('settled after ' + r.sweep + (r.sweep === 1 ? ' sweep' : ' sweeps') +
						(w === null ? '' : w === 0 ? ': recalled perfectly' : ': ' + w + ' pixels wrong' + (w > N / 4 ? ' (that is not any of the memories)' : '')));
					return;
				}
				r.k = 0; r.flips = 0; r.sweep++;
				for (let i = N - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = r.order[i]; r.order[i] = r.order[j]; r.order[j] = t; }
			}
			const i = r.order[r.k++];
			r.updates++;
			if (net.updateNeuron(x, i)) { r.flips++; flashAt[i] = performance.now(); }
		}
		energyTrace.push([r.updates, net.energy(x)]);
		setStatus('sweep ' + r.sweep + ', ' + r.flips + ' flipped so far' + wrong());
	}

	makeGridInput(canvas, () => x, (i, v) => {
		stop();
		if (x[i] !== v) { x[i] = v; clean = null; energyTrace = []; render(); }
	});

	libEl.innerHTML = '';
	for (const name of PICTURE_NAMES) {
		const p = picture(name);
		const t = thumb(p, 2, name + ' (click to load)');
		t.addEventListener('click', () => load(p));
		libEl.appendChild(t);
	}

	root.querySelectorAll('[data-action]').forEach((b) => {
		b.addEventListener('click', () => {
			const a = b.dataset.action;
			if (a === 'remember') remember();
			else if (a === 'scribble') scribble();
			else if (a === 'erase') rubOut();
			else if (a === 'recall') recall();
			else if (a === 'clear') { stop(); x = new Int8Array(N).fill(-1); clean = null; energyTrace = []; setStatus('blank'); render(); }
			else if (a === 'forget') { stop(); net.reset(); renderMemories(); energyTrace = []; setStatus('forgotten everything, W = 0'); render(); }
		});
	});

	for (const name of preload) net.learn(picture(name), 'hebb');
	renderMemories();
	if (preload.length) {
		x = corrupt(picture(preload[0]), 0.2, rng); clean = picture(preload[0]);
		setStatus('a scribbled-on ' + preload[0] + wrong() + '. Press Recall.');
	} else setStatus('draw something, then press Remember this');

	let autostarted = false;
	if ('IntersectionObserver' in window && root.dataset.autostart !== 'false' && preload.length) {
		new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting && !autostarted) { autostarted = true; setTimeout(() => { if (!running && clean) recall(); }, 900); }
		}, { threshold: 0.5 }).observe(root);
	}

	function frame() {
		if (!document.body.contains(root)) return;
		if (running) { stepRecall(); render(); }
		else if (performance.now() - Math.max(...flashAt) < 400) render();
		requestAnimationFrame(frame);
	}
	resize();
	if ('ResizeObserver' in window) new ResizeObserver(resize).observe(root); else window.addEventListener('resize', resize);
	requestAnimationFrame(frame);
}

// ---- Demo 2: capacity ---------------------------------------------------------

function mountCapacity(root) {
	const chartEl = root.querySelector('[data-role="chart"]');
	const pairsEl = root.querySelector('[data-role="pairs"]');
	const statusEl = root.querySelector('[data-role="status"]');
	const scoreEl = root.querySelector('[data-role="score"]');
	const ruleEl = root.querySelector('[data-role="rule"]');
	const picEl = root.querySelector('[data-role="pictures"]');
	const legendEl = root.querySelector('[data-role="legend"]');
	const MAX = 120, STEP = 5, SAMPLE = 30, CORRUPT = 0.1;
	const GUIDE = Math.round(0.138 * N);

	let net = new Hopfield(N);
	let rng = mulberry32(11);
	let rule = ruleEl ? ruleEl.value : 'hebb';
	const curves = { hebb: [], storkey: [], pinv: [] }; // [[p, frac]]
	let busy = false, autorun = false;
	let lastResults = []; // [{stored, got, ok}]

	function setStatus(t) { if (statusEl) statusEl.textContent = t; }

	function renderChart() {
		const w = chartEl.clientWidth, h = 240;
		const c = fitCanvas(chartEl, w, h);
		const series = ['hebb', 'storkey', 'pinv'].filter((k) => curves[k].length).map((k) => ({ points: curves[k], color: COL[k], dot: k === rule }));
		drawLineChart(c, w, h, series, {
			xmin: 0, xmax: MAX, ymin: 0, ymax: 1.02,
			xlabel: 'patterns stored (n = 400 neurons)', ylabel: 'recalled',
			guides: [{ x: GUIDE, label: '0.138n = ' + GUIDE }],
			yticks: [0, 0.5, 1], xticks: [0, 20, 40, 60, 80, 100, 120],
		});
	}
	function renderLegend() {
		if (!legendEl) return;
		legendEl.innerHTML = '';
		for (const k of ['hebb', 'storkey', 'pinv']) {
			const s = document.createElement('span');
			s.innerHTML = `<i style="background:${COL[k]}"></i>${RULE_NAME[k]}`;
			if (!curves[k].length) s.style.opacity = '0.45';
			legendEl.appendChild(s);
		}
	}
	function renderPairs() {
		pairsEl.innerHTML = '';
		for (const r of lastResults.slice(0, 8)) {
			const d = document.createElement('div');
			d.className = 'hop-pair' + (r.ok ? ' ok' : ' bad');
			d.appendChild(thumb(r.stored, 2, 'stored'));
			d.appendChild(thumb(r.got, 2, 'recalled from a 10% scribbled copy'));
			const m = document.createElement('span');
			m.textContent = r.ok ? '✓' : '✕ ' + hamming(r.stored, r.got);
			d.appendChild(m);
			pairsEl.appendChild(d);
		}
	}

	function reset() {
		net = new Hopfield(N);
		rng = mulberry32(11);
		curves[rule] = [];
		lastResults = [];
		if (picEl && picEl.checked) for (const name of PICTURE_NAMES) net.learn(picture(name), rule);
		if (net.patterns.length) test();
		setStatus(net.patterns.length ? 'starting from the six pictures' : 'empty network');
		renderChart(); renderLegend(); renderPairs();
	}

	function test() {
		const P = net.patterns;
		const idx = P.map((_, i) => i);
		for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
		// Always include the pictures (the first six) if they were stored, then a sample of the rest.
		const chosen = picEl && picEl.checked ? [0, 1, 2, 3, 4, 5].filter((i) => i < P.length).concat(idx.filter((i) => i > 5).slice(0, SAMPLE)) : idx.slice(0, SAMPLE);
		let ok = 0;
		lastResults = [];
		for (const i of chosen) {
			const r = net.recall(corrupt(P[i], CORRUPT, rng), { rng, maxSweeps: 30 });
			const good = hamming(r.x, P[i]) === 0;
			if (good) ok++;
			lastResults.push({ stored: P[i], got: r.x, ok: good });
		}
		const frac = chosen.length ? ok / chosen.length : 1;
		curves[rule].push([P.length, frac]);
		if (scoreEl) scoreEl.textContent = P.length + ' stored · ' + ok + '/' + chosen.length + ' recalled';
		return frac;
	}

	function add() {
		if (busy || net.patterns.length >= MAX) { autorun = false; return; }
		busy = true;
		setStatus('storing ' + STEP + ' more with the ' + RULE_NAME[rule] + ' rule…');
		setTimeout(() => {
			for (let k = 0; k < STEP; k++) net.learn(randomPattern(N, rng), rule);
			const frac = test();
			renderChart(); renderLegend(); renderPairs();
			setStatus(Math.round(frac * 100) + '% of a sample recalled from a 10% scribble');
			busy = false;
			if (autorun && net.patterns.length < MAX) add(); else autorun = false;
			setPressed(root, 'run', autorun);
		}, 16);
	}

	if (ruleEl) ruleEl.addEventListener('change', () => { rule = ruleEl.value; autorun = false; reset(); });
	if (picEl) picEl.addEventListener('change', () => { autorun = false; reset(); });
	root.querySelectorAll('[data-action]').forEach((b) => {
		b.addEventListener('click', () => {
			const a = b.dataset.action;
			if (a === 'add') { autorun = false; add(); }
			else if (a === 'run') { autorun = !autorun; setPressed(root, 'run', autorun); if (autorun) add(); }
			else if (a === 'reset') { autorun = false; setPressed(root, 'run', false); reset(); }
			else if (a === 'clear') { autorun = false; for (const k in curves) curves[k] = []; reset(); }
		});
	});

	chartEl.addEventListener('pointermove', (ev) => {
		const pts = curves[rule];
		if (!pts.length) return;
		const rect = chartEl.getBoundingClientRect();
		const w = rect.width;
		const p = Math.round(((ev.clientX - rect.left - 34) / (w - 46)) * MAX);
		let best = pts[0];
		for (const q of pts) if (Math.abs(q[0] - p) < Math.abs(best[0] - p)) best = q;
		setStatus(RULE_NAME[rule] + ': ' + best[0] + ' stored → ' + Math.round(best[1] * 100) + '% recalled');
	});

	reset();
	if ('ResizeObserver' in window) new ResizeObserver(() => renderChart()).observe(root); else window.addEventListener('resize', renderChart);
}

// ---- Demo 3: dense / attention ------------------------------------------------

function mountDense(root) {
	const canvas = root.querySelector('[data-role="grid"]');
	const libEl = root.querySelector('[data-role="library"]');
	const attEl = root.querySelector('[data-role="attention"]');
	const statusEl = root.querySelector('[data-role="status"]');
	const betaEl = root.querySelector('[data-role="beta"]');
	const betaOut = root.querySelector('[data-role="beta-out"]');
	const noiseEl = root.querySelector('[data-role="noise"]');
	const countEl = root.querySelector('[data-role="count"]');

	const net = new DenseHopfield(N);
	let rng = mulberry32(3);
	let x = new Float64Array(N).fill(-1);
	let clean = null;
	let size = 320, ctx = null;
	let anim = null;

	function beta() { return Math.pow(10, parseFloat(betaEl.value)); }
	function setStatus(t) { if (statusEl) statusEl.textContent = t; }
	function resize() {
		size = Math.max(160, Math.min(canvas.parentElement.clientWidth, 360));
		canvas.style.width = size + 'px';
		ctx = fitCanvas(canvas, size, size);
		render();
	}
	function render() { if (ctx) drawGrid(ctx, size, x, null, 0); }

	function rebuild() {
		net.reset();
		for (const name of PICTURE_NAMES) net.learn(picture(name));
		if (noiseEl && noiseEl.checked) { const r2 = mulberry32(99); for (let k = 0; k < 200; k++) net.learn(randomPattern(N, r2)); }
		if (countEl) countEl.textContent = net.patterns.length + ' stored';
	}

	function renderAttention(weights) {
		attEl.innerHTML = '';
		if (!weights) return;
		const idx = Array.from(weights.keys()).sort((a, b) => weights[b] - weights[a]).slice(0, 5);
		let rest = 1;
		for (const i of idx) {
			rest -= weights[i];
			const row = document.createElement('div');
			row.className = 'hop-att';
			row.appendChild(thumb(net.patterns[i], 1, i < PICTURE_NAMES.length ? PICTURE_NAMES[i] : 'random pattern ' + (i - PICTURE_NAMES.length + 1)));
			const bar = document.createElement('i');
			bar.style.width = Math.max(1, weights[i] * 100) + '%';
			const wrap = document.createElement('span'); wrap.className = 'hop-att-bar'; wrap.appendChild(bar);
			row.appendChild(wrap);
			const v = document.createElement('b'); v.textContent = (weights[i] * 100).toFixed(weights[i] < 0.01 ? 2 : 0) + '%';
			row.appendChild(v);
			attEl.appendChild(row);
		}
		if (rest > 0.005 && net.patterns.length > 5) {
			const row = document.createElement('div'); row.className = 'hop-att hop-att-rest';
			row.textContent = 'everything else: ' + (rest * 100).toFixed(0) + '%';
			attEl.appendChild(row);
		}
	}

	function load(p) {
		anim = null;
		x = Float64Array.from(p); clean = Int8Array.from(p);
		renderAttention(null);
		setStatus('loaded the ' + (PICTURE_NAMES[net.patterns.indexOf(p)] || 'picture'));
		render();
	}
	function wrongCount() {
		if (!clean) return null;
		let d = 0; for (let i = 0; i < N; i++) if ((x[i] >= 0 ? 1 : -1) !== clean[i]) d++;
		return d;
	}
	function scribble() {
		anim = null;
		const b = new Int8Array(N); for (let i = 0; i < N; i++) b[i] = x[i] >= 0 ? 1 : -1;
		x = Float64Array.from(corrupt(b, 0.3, rng));
		setStatus('flipped 30% of the pixels' + (clean ? ', ' + wrongCount() + ' wrong' : ''));
		renderAttention(null); render();
	}
	function rubOut() {
		anim = null;
		for (let i = N / 2; i < N; i++) x[i] = -1;
		setStatus('rubbed out the bottom half' + (clean ? ', ' + wrongCount() + ' wrong' : ''));
		renderAttention(null); render();
	}
	function recall() {
		anim = { step: 0, next: performance.now() };
	}
	function tick(now) {
		if (!anim || now < anim.next) return;
		const r = net.update(x, beta());
		let moved = 0; for (let i = 0; i < N; i++) moved = Math.max(moved, Math.abs(r.x[i] - x[i]));
		x = r.x; anim.step++;
		renderAttention(r.weights);
		const top = Math.max(...r.weights);
		if (moved < 1e-4 || anim.step >= 6) {
			const steps = anim.step;
			anim = null;
			const w = wrongCount();
			setStatus('settled after ' + steps + (steps === 1 ? ' update' : ' updates') + ' (top memory has ' + (top * 100).toFixed(0) + '% of the attention)' +
				(w === null ? '' : w === 0 ? ': recalled perfectly' : ': ' + w + ' pixels wrong' + (top < 0.6 ? ', it is a blend of several memories' : '')));
		} else {
			setStatus('update ' + anim.step + ': x ← Ξᵀ softmax(β Ξ x), top weight ' + (top * 100).toFixed(0) + '%');
			anim.next = now + 450;
		}
		render();
	}

	makeGridInput(canvas, () => x, (i, v) => { anim = null; if (x[i] !== v) { x[i] = v; clean = null; render(); } });

	libEl.innerHTML = '';
	PICTURE_NAMES.forEach((name) => {
		const t = thumb(picture(name), 2, name + ' (click to load)');
		t.addEventListener('click', () => load(net.patterns[PICTURE_NAMES.indexOf(name)]));
		libEl.appendChild(t);
	});
	root.querySelectorAll('[data-action]').forEach((b) => {
		b.addEventListener('click', () => {
			const a = b.dataset.action;
			if (a === 'scribble') scribble();
			else if (a === 'erase') rubOut();
			else if (a === 'recall') recall();
			else if (a === 'clear') { anim = null; x = new Float64Array(N).fill(-1); clean = null; renderAttention(null); setStatus('blank'); render(); }
		});
	});
	const showBeta = () => { if (betaOut) betaOut.textContent = 'β = ' + beta().toPrecision(2); };
	betaEl.addEventListener('input', showBeta);
	if (noiseEl) noiseEl.addEventListener('change', rebuild);

	rebuild(); showBeta();
	resize();
	load(net.patterns[0]);
	x = Float64Array.from(corrupt(net.patterns[0], 0.3, rng));
	setStatus('a badly scribbled-on sheep, ' + wrongCount() + ' wrong. Press Recall.');
	render();

	function frame(now) {
		if (!document.body.contains(root)) return;
		tick(now);
		requestAnimationFrame(frame);
	}
	if ('ResizeObserver' in window) new ResizeObserver(resize).observe(root); else window.addEventListener('resize', resize);
	requestAnimationFrame(frame);
}

// ---- mounting -----------------------------------------------------------------

function mountAll() {
	document.querySelectorAll('[data-hopfield]').forEach((root) => {
		if (root.__mounted) return;
		root.__mounted = true;
		const kind = root.dataset.hopfield;
		if (kind === 'memory') mountMemory(root);
		else if (kind === 'capacity') mountCapacity(root);
		else if (kind === 'dense') mountDense(root);
	});
}
mountAll();
document.addEventListener('astro:page-load', mountAll);
