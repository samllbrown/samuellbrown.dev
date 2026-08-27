/*
 * Experiments behind the numbers in the "A memory that rolls downhill" post.
 *
 *   node scripts/hopfield-experiments.mjs [outdir]
 *
 * Runs against the same code the page uses (public/sim/hopfield-core.js), prints
 * the tables, and writes results.json plus inline-SVG charts to outdir
 * (default: scratch/hopfield). Seeded, so the numbers are reproducible.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import {
	Hopfield, DenseHopfield, GRID, picture, PICTURE_NAMES,
	corrupt, hamming, overlap, mulberry32, randomPattern,
} from '../public/sim/hopfield-core.js';

const OUT = process.argv[2] || 'scratch/hopfield';
mkdirSync(OUT, { recursive: true });
const N = GRID * GRID;
const SEEDS = [1, 2, 3];
const R = {};
const t0 = performance.now();
const log = (...a) => console.log(...a);
const pct = (x) => (x * 100).toFixed(0) + '%';

function recallRate(net, patterns, frac, rng, sample = 40) {
	const idx = patterns.map((_, i) => i);
	for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
	const chosen = idx.slice(0, sample);
	let ok = 0, near = 0, stable = 0, sweeps = 0;
	const tol = Math.round(0.02 * net.n);
	for (const i of chosen) {
		const p = patterns[i];
		if (net.isStable(p)) stable++;
		const r = net.recall(corrupt(p, frac, rng), { rng, maxSweeps: 50 });
		const d = hamming(r.x, p);
		if (d === 0) ok++;
		if (d <= tol) near++;
		sweeps += r.sweeps;
	}
	return { ok: ok / chosen.length, near: near / chosen.length, stable: stable / chosen.length, sweeps: sweeps / chosen.length };
}

// ---- A. capacity curves ------------------------------------------------------
log('\nA. Capacity: fraction of stored random patterns recovered exactly from a 10% corruption (n = 400, mean of 3 seeds)');
R.capacity = {};
const RULES = ['hebb', 'storkey', 'pinv'];
const P_MAX = { hebb: 120, storkey: 200, pinv: 320 };
for (const rule of RULES) {
	const curve = [];
	const tRule = performance.now();
	for (const seed of SEEDS) {
		const rng = mulberry32(seed);
		const net = new Hopfield(N);
		let k = 0;
		for (let p = 5; p <= P_MAX[rule]; p += 5) {
			while (net.patterns.length < p) net.learn(randomPattern(N, rng), rule);
			const r = recallRate(net, net.patterns, 0.1, rng);
			if (!curve[k]) curve[k] = { p, ok: 0, near: 0, stable: 0, sweeps: 0 };
			curve[k].ok += r.ok / SEEDS.length; curve[k].near += r.near / SEEDS.length; curve[k].stable += r.stable / SEEDS.length; curve[k].sweeps += r.sweeps / SEEDS.length;
			k++;
		}
	}
	R.capacity[rule] = curve;
	log(rule.padEnd(8), curve.filter((c) => c.p % 20 === 0 || c.p === 5).map((c) => `${c.p}:${pct(c.ok)}`).join(' '), `(${((performance.now() - tRule) / 1000).toFixed(1)}s)`);
}
{
	const h = R.capacity.hebb;
	const half = h.find((c) => c.ok < 0.5);
	const stableHalf = h.find((c) => c.stable < 0.5);
	R.hebbHalf = half && half.p; R.hebbStableHalf = stableHalf && stableHalf.p;
	log(`Hebb: recall drops below 50% at p = ${R.hebbHalf}; stored patterns stop being fixed points (50%) at p = ${R.hebbStableHalf}; 0.138n = ${Math.round(0.138 * N)}`);
	log('Hebb stability vs recovery:', h.filter((c) => c.p % 10 === 0).map((c) => `${c.p}: stable ${pct(c.stable)} / exact ${pct(c.ok)} / within 2% ${pct(c.near)}`).join(' | '));
}

// ---- A2. finite size: Hebb at n = 100, 400, 900 --------------------------------
log('\nA2. Hebb capacity at different sizes (x = p/n, recovered from 10% corruption)');
R.finite = {};
for (const n of [100, 400, 900]) {
	const curve = [];
	for (const seed of SEEDS) {
		const rng = mulberry32(seed);
		const net = new Hopfield(n);
		let k = 0;
		for (let a = 0.02; a <= 0.3001; a += 0.02) {
			const p = Math.max(1, Math.round(a * n));
			while (net.patterns.length < p) net.learn(randomPattern(n, rng), 'hebb');
			const r = recallRate(net, net.patterns, 0.1, rng);
			if (!curve[k]) curve[k] = { a: +a.toFixed(2), p, ok: 0, near: 0 };
			curve[k].ok += r.ok / SEEDS.length; curve[k].near += r.near / SEEDS.length;
			k++;
		}
	}
	R.finite[n] = curve;
	log(`n=${n}`.padEnd(6), 'exact    ', curve.map((c) => `${c.a}:${pct(c.ok)}`).join(' '));
	log(''.padEnd(6), 'within 2%', curve.map((c) => `${c.a}:${pct(c.near)}`).join(' '));
}

// ---- B. the pictures ----------------------------------------------------------------
log('\nB. Storing the six hand-drawn pictures in order (recovered from 10% corruption, best of 20 tries each)');
R.pictures = {};
const PICS = PICTURE_NAMES.map(picture);
for (const rule of RULES) {
	const net = new Hopfield(N);
	const rng = mulberry32(5);
	const rows = [];
	for (let k = 0; k < PICS.length; k++) {
		net.learn(PICS[k], rule);
		const per = [];
		for (let j = 0; j <= k; j++) {
			let ok = 0;
			for (let t = 0; t < 20; t++) if (hamming(net.recall(corrupt(PICS[j], 0.1, rng), { rng }).x, PICS[j]) === 0) ok++;
			per.push(ok / 20);
		}
		rows.push({ stored: k + 1, per, stable: PICS.slice(0, k + 1).map((p) => net.isStable(p)) });
	}
	R.pictures[rule] = rows;
	log(rule.padEnd(8), rows.map((r) => `${r.stored}:[${r.per.map((v) => pct(v)).join(',')}]`).join(' '));
}
{
	// overlaps: pictures are far from orthogonal
	let s = 0, c = 0, maxo = 0;
	for (let a = 0; a < PICS.length; a++) for (let b = a + 1; b < PICS.length; b++) { const o = overlap(PICS[a], PICS[b]); s += Math.abs(o); c++; maxo = Math.max(maxo, o); }
	const rng = mulberry32(9); let sr = 0, cr = 0;
	for (let a = 0; a < 40; a++) { const x = randomPattern(N, rng), y = randomPattern(N, rng); sr += Math.abs(overlap(x, y)); cr++; }
	const onFrac = PICS.map((p) => p.filter((v) => v > 0).length / N);
	R.pictureOverlap = { meanAbs: s / c, max: maxo, randomMeanAbs: sr / cr, onFrac };
	log(`Pictures: mean |overlap| between pairs = ${(s / c).toFixed(2)} (max ${maxo.toFixed(2)}); random patterns: ${(sr / cr).toFixed(3)} (expected ≈ √(2/πn) = ${Math.sqrt(2 / Math.PI / N).toFixed(3)})`);
	log('Fraction of "on" pixels per picture:', onFrac.map((f) => f.toFixed(2)).join(' '));
	// all triples under Hebb
	let good = 0, total = 0; const bad = [];
	for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) for (let c2 = b + 1; c2 < 6; c2++) {
		const net = new Hopfield(N); [a, b, c2].forEach((i) => net.learn(PICS[i], 'hebb'));
		const allStable = [a, b, c2].every((i) => net.isStable(PICS[i]));
		total++; if (allStable) good++; else bad.push([a, b, c2].map((i) => PICTURE_NAMES[i]).join('+'));
	}
	R.triples = { good, total, bad };
	log(`Hebb, triples of pictures where all three are stable: ${good}/${total}. Failing: ${bad.join(', ')}`);
	// which pairs
	const pairs = [];
	for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) {
		const net = new Hopfield(N); net.learn(PICS[a], 'hebb'); net.learn(PICS[b], 'hebb');
		pairs.push({ pair: PICTURE_NAMES[a] + '+' + PICTURE_NAMES[b], ok: net.isStable(PICS[a]) && net.isStable(PICS[b]) });
	}
	R.pairs = pairs;
	log('Pairs failing under Hebb:', pairs.filter((p) => !p.ok).map((p) => p.pair).join(', ') || 'none');
}

log('\nB2. Demo 1 narrative: sheep + dog stored, then a third picture, recalled from a 20% scribble (50 tries each)');
R.third = {};
for (const third of ['tree', 'heart', 'house', 'sun']) {
	const rng = mulberry32(8);
	const net = new Hopfield(N);
	['sheep', 'dog', third].forEach((nm) => net.learn(picture(nm), 'hebb'));
	const per = ['sheep', 'dog', third].map((nm) => { let ok = 0; for (let t = 0; t < 50; t++) if (hamming(net.recall(corrupt(picture(nm), 0.2, rng), { rng }).x, picture(nm)) === 0) ok++; return ok / 50; });
	R.third[third] = per;
	log(third.padEnd(6), 'sheep/dog/' + third + ':', per.map(pct).join(' '));
}

// ---- C. basins of attraction ------------------------------------------------------
log('\nC. Basin size under Hebb: recovery vs corruption fraction (n = 400)');
R.basins = {};
for (const p of [10, 30, 50]) {
	const curve = [];
	for (const seed of SEEDS) {
		const rng = mulberry32(seed + 20);
		const net = new Hopfield(N);
		for (let k = 0; k < p; k++) net.learn(randomPattern(N, rng), 'hebb');
		let i = 0;
		for (let f = 0; f <= 0.501; f += 0.05) {
			const r = recallRate(net, net.patterns, f, rng, 30);
			if (!curve[i]) curve[i] = { f: +f.toFixed(2), ok: 0 };
			curve[i].ok += r.ok / SEEDS.length; i++;
		}
	}
	R.basins[p] = curve;
	log(`p=${p}`.padEnd(6), curve.map((c) => `${c.f}:${pct(c.ok)}`).join(' '));
}

// ---- D. spurious states --------------------------------------------------------------
log('\nD. Where does it settle from a random start? (Hebb, n = 400, p = 20, 2000 starts)');
{
	const rng = mulberry32(42);
	const net = new Hopfield(N);
	for (let k = 0; k < 20; k++) net.learn(randomPattern(N, rng), 'hebb');
	const counts = { stored: 0, inverse: 0, mixture3: 0, other: 0 };
	const seen = new Map();
	let sweeps = 0;
	for (let t = 0; t < 2000; t++) {
		const r = net.recall(randomPattern(N, rng), { rng });
		sweeps += r.sweeps;
		const os = net.patterns.map((p) => overlap(r.x, p));
		const key = Array.from(r.x).join('');
		seen.set(key, (seen.get(key) || 0) + 1);
		const big = os.filter((o) => Math.abs(o) > 0.9);
		const mid = os.filter((o) => Math.abs(o) > 0.25);
		if (big.length === 1 && os.some((o) => o > 0.99)) counts.stored++;
		else if (big.length === 1 && os.some((o) => o < -0.99)) counts.inverse++;
		else if (mid.length >= 3) counts.mixture3++;
		else counts.other++;
	}
	R.spurious = { counts, distinct: seen.size, meanSweeps: sweeps / 2000 };
	log(counts, `distinct end states: ${seen.size}, mean sweeps ${(sweeps / 2000).toFixed(1)}`);
}

// ---- E. dense (modern) Hopfield --------------------------------------------------------
log('\nE. Dense Hopfield: recall of random patterns from corruption (n = 400, β = 0.05)');
R.dense = [];
for (const p of [50, 200, 1000, 4000]) {
	const rng = mulberry32(77);
	const net = new DenseHopfield(N);
	for (let k = 0; k < p; k++) net.learn(randomPattern(N, rng));
	const row = { p };
	for (const beta of [0.05, 0.1]) for (const f of [0.1, 0.3, 0.4, 0.45]) {
		let ok = 0; const S = 40;
		for (let t = 0; t < S; t++) { const q = net.patterns[Math.floor(rng() * p)]; if (hamming(net.recall(corrupt(q, f, rng), beta).x, q) === 0) ok++; }
		row['b' + beta + 'f' + f] = ok / S;
	}
	R.dense.push(row);
	log(`p=${p}`.padEnd(8), Object.entries(row).filter(([k]) => k !== 'p').map(([k, v]) => `${k}:${pct(v)}`).join(' '));
}
log('\nE2. Dense Hopfield on the six pictures (+200 random): recall from 30% corruption vs β, and attention on the top memory');
R.denseBeta = [];
{
	const rng = mulberry32(78);
	const net = new DenseHopfield(N);
	PICS.forEach((p) => net.learn(p));
	for (let k = 0; k < 200; k++) net.learn(randomPattern(N, rng));
	for (const beta of [0.002, 0.005, 0.01, 0.02, 0.05, 0.1]) {
		let ok = 0, top = 0; const S = 60;
		for (let t = 0; t < S; t++) {
			const j = t % 6;
			const r = net.recall(corrupt(PICS[j], 0.3, rng), beta);
			if (hamming(r.x, PICS[j]) === 0) ok++;
			top += Math.max(...r.weights) / S;
		}
		R.denseBeta.push({ beta, ok: ok / S, top });
		log(`β=${beta}`.padEnd(8), `recalled ${pct(ok / S)}, mean top attention weight ${pct(top)}`);
	}
}

// ---- F. crosstalk theory -------------------------------------------------------------------
log('\nF. Signal-to-noise estimate: P(a bit is wrong on the first update) = ½ erfc(√(n/2p))');
function erfc(x) { // Abramowitz-Stegun 7.1.26
	const t = 1 / (1 + 0.3275911 * Math.abs(x));
	const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
	return x >= 0 ? 1 - y : 1 + y;
}
R.snr = [10, 20, 30, 40, 50, 55, 60, 70, 80].map((p) => {
	const perBit = 0.5 * erfc(Math.sqrt(N / (2 * p)));
	const lambda = N * perBit;
	const m = R.capacity.hebb.find((c) => c.p === p);
	return { p, perBit, expectedWrong: lambda, predictedExact: Math.exp(-lambda), measuredExact: m ? m.ok : null };
});
log(R.snr.map((r) => `p=${r.p}: ${(r.perBit * 100).toFixed(2)}% per bit ≈ ${r.expectedWrong.toFixed(2)} of 400 pixels → P(none wrong) = e^-λ = ${pct(r.predictedExact)}, measured ${r.measuredExact == null ? '-' : pct(r.measuredExact)}`).join('\n'));

// ---- G. cost of each rule -----------------------------------------------------------------------
log('\nG. Time to store the 100th pattern (n = 400, this machine)');
R.timing = {};
for (const rule of RULES) {
	const rng = mulberry32(3);
	const net = new Hopfield(N);
	for (let k = 0; k < 99; k++) net.learn(randomPattern(N, rng), rule);
	const t = performance.now();
	net.learn(randomPattern(N, rng), rule);
	R.timing[rule] = performance.now() - t;
	log(rule.padEnd(8), R.timing[rule].toFixed(1) + ' ms');
}
{
	const rng = mulberry32(3);
	const net = new DenseHopfield(N);
	for (let k = 0; k < 99; k++) net.learn(randomPattern(N, rng));
	let t = performance.now(); net.learn(randomPattern(N, rng)); R.timing.dense = performance.now() - t;
	const q = corrupt(net.patterns[0], 0.1, rng);
	t = performance.now(); for (let k = 0; k < 20; k++) net.recall(q, 0.05); R.timing.denseRecall = (performance.now() - t) / 20;
	const h = new Hopfield(N); for (let k = 0; k < 20; k++) h.learn(randomPattern(N, rng), 'hebb');
	t = performance.now(); for (let k = 0; k < 20; k++) h.recall(corrupt(h.patterns[0], 0.1, rng), { rng }); R.timing.hebbRecall = (performance.now() - t) / 20;
	log('dense store', R.timing.dense.toFixed(3) + ' ms', '| dense recall (100 patterns)', R.timing.denseRecall.toFixed(2) + ' ms', '| hebb recall (20 patterns)', R.timing.hebbRecall.toFixed(2) + ' ms');
}

R.elapsedSec = (performance.now() - t0) / 1000;
writeFileSync(`${OUT}/results.json`, JSON.stringify(R, null, 1));
log(`\nDone in ${R.elapsedSec.toFixed(0)}s. Results in ${OUT}/results.json`);

// ---- charts -------------------------------------------------------------------------------------
const C = { hebb: '#a93fe0', storkey: '#c97c12', pinv: '#35a066', text: '#8490b5', textStrong: '#c3cadb', axis: 'rgba(255,255,255,0.14)', guide: 'rgba(255,255,255,0.35)', bg: '#0e1711' };
function chart({ w = 640, h = 300, series, xmin, xmax, ymin, ymax, xticks, yticks, xlabel, ylabel, guides = [], labels = [], title }) {
	const pad = { l: 44, r: 16, t: 16, b: 40 };
	const X = (v) => pad.l + (v - xmin) / (xmax - xmin) * (w - pad.l - pad.r);
	const Y = (v) => h - pad.b - (v - ymin) / (ymax - ymin) * (h - pad.t - pad.b);
	let s = `<svg class="hop-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12">\n`;
	s += `<title>${title}</title>\n`;
	for (const t of yticks) s += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}" stroke="${C.axis}"/><text x="${pad.l - 8}" y="${Y(t).toFixed(1)}" fill="${C.text}" text-anchor="end" dominant-baseline="middle">${t}</text>\n`;
	for (const t of xticks) s += `<text x="${X(t).toFixed(1)}" y="${h - pad.b + 18}" fill="${C.text}" text-anchor="middle">${t}</text>\n`;
	s += `<path d="M${pad.l} ${pad.t} V${h - pad.b} H${w - pad.r}" fill="none" stroke="${C.axis}"/>\n`;
	for (const g of guides) s += `<line x1="${X(g.x).toFixed(1)}" x2="${X(g.x).toFixed(1)}" y1="${pad.t}" y2="${h - pad.b}" stroke="${C.guide}" stroke-dasharray="3 4"/><text x="${(X(g.x) + 6).toFixed(1)}" y="${(pad.t + (h - pad.t - pad.b) * 0.3).toFixed(1)}" fill="${C.textStrong}">${g.label}</text>\n`;
	if (xlabel) s += `<text x="${w - pad.r}" y="${h - 6}" fill="${C.text}" text-anchor="end">${xlabel}</text>\n`;
	if (ylabel) s += `<text transform="translate(12 ${pad.t}) rotate(-90)" fill="${C.text}" text-anchor="end">${ylabel}</text>\n`;
	for (const se of series) {
		const d = se.points.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`).join(' ');
		s += `<path d="${d}" fill="none" stroke="${se.color}" stroke-width="2" stroke-linejoin="round"><title>${se.name}</title></path>\n`;
		for (const [x, y] of se.points) s += `<circle cx="${X(x).toFixed(1)}" cy="${Y(y).toFixed(1)}" r="6" fill="transparent"><title>${se.name}: ${se.fmt ? se.fmt(x, y) : `${x}, ${y}`}</title></circle>\n`;
	}
	for (const l of labels) s += `<text x="${X(l.x).toFixed(1)}" y="${Y(l.y).toFixed(1)}" dx="${l.dx || 0}" dy="${l.dy || 0}" fill="${l.color || C.textStrong}" text-anchor="${l.anchor || 'start'}">${l.text}</text>\n`;
	s += '</svg>\n';
	return s;
}
function legend(items) {
	return `<div class="hop-legend">${items.map((i) => `<span><i style="background:${i.color}"></i>${i.name}</span>`).join('')}</div>\n`;
}
const RULE_NAME = { hebb: 'Hebb', storkey: 'Storkey', pinv: 'Pseudo-inverse' };
const pctf = (x, y) => `${x} stored, ${Math.round(y * 100)}% recalled`;

// 1. capacity by rule
{
	const series = RULES.map((r) => ({ name: RULE_NAME[r], color: C[r], points: R.capacity[r].map((c) => [c.p, c.ok]), fmt: pctf }));
	const labels = RULES.map((r) => { const c = R.capacity[r]; const last = c[c.length - 1]; return { x: last.p, y: last.ok, text: RULE_NAME[r], color: C[r], dx: 6, dy: r === 'pinv' ? 4 : 4, anchor: 'start' }; });
	const svg = chart({ title: 'Fraction of stored random patterns recalled exactly from a 10% corruption, by learning rule, n = 400', series, xmin: 0, xmax: 320, ymin: 0, ymax: 1.02, xticks: [0, 55, 100, 150, 200, 250, 300], yticks: [0, 0.5, 1], xlabel: 'random patterns stored (n = 400 neurons)', ylabel: 'recalled', guides: [{ x: Math.round(0.138 * N), label: '0.138n' }], labels: labels.filter((l) => l.x < 300) });
	writeFileSync(`${OUT}/chart-capacity.html`, svg + legend(RULES.map((r) => ({ name: RULE_NAME[r], color: C[r] }))));
}
// 2. finite size
{
	const cols = { 100: '#35a066', 400: '#a93fe0', 900: '#c97c12' };
	const series = [100, 400, 900].map((n) => ({ name: `n = ${n}`, color: cols[n], points: R.finite[n].map((c) => [c.a, c.near]), fmt: (x, y) => `p/n = ${x}, ${Math.round(y * 100)}% recalled within 2%` }));
	const svg = chart({ title: 'Hebb rule at three network sizes: recall (allowing 2% wrong pixels) against patterns per neuron', series, xmin: 0, xmax: 0.3, ymin: 0, ymax: 1.02, xticks: [0, 0.05, 0.1, 0.138, 0.2, 0.25, 0.3], yticks: [0, 0.5, 1], xlabel: 'patterns stored per neuron (p / n)', ylabel: 'recalled (≤2% wrong)', guides: [{ x: 0.138, label: '' }] });
	writeFileSync(`${OUT}/chart-finite.html`, svg + legend([100, 400, 900].map((n) => ({ name: `n = ${n}`, color: cols[n] }))));
}
// 3. basins
{
	const cols = { 10: '#35a066', 30: '#c97c12', 50: '#a93fe0' };
	const series = [10, 30, 50].map((p) => ({ name: `${p} patterns stored`, color: cols[p], points: R.basins[p].map((c) => [c.f, c.ok]), fmt: (x, y) => `${Math.round(x * 100)}% corrupted, ${Math.round(y * 100)}% recalled` }));
	const svg = chart({ title: 'How much corruption the Hebb rule can undo, for 10, 30 and 50 stored patterns, n = 400', series, xmin: 0, xmax: 0.5, ymin: 0, ymax: 1.02, xticks: [0, 0.1, 0.2, 0.3, 0.4, 0.5], yticks: [0, 0.5, 1], xlabel: 'fraction of pixels flipped before recall', ylabel: 'recalled' });
	writeFileSync(`${OUT}/chart-basins.html`, svg + legend([10, 30, 50].map((p) => ({ name: `${p} stored`, color: cols[p] }))));
}
log('Charts written.');
