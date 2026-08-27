/*
 * Hopfield network core.
 *
 * A network of n binary neurons (±1) with a symmetric weight matrix W and no
 * self-connections. Patterns are stored with a local learning rule (Hebb by
 * default, Storkey and the pseudo-inverse for comparison) and recalled by
 * repeatedly setting each neuron to the sign of its input, which can only ever
 * lower the energy E = -½ xᵀWx, so the network always settles somewhere.
 *
 * DenseHopfield is the modern (exponential) version from Krotov & Hopfield
 * (2016) / Ramsauer et al. (2020): the stored patterns are kept as they are and
 * recall is x ← Ξᵀ softmax(β Ξ x), which is one step of attention.
 *
 * Pure ES module: no DOM, used by both the page (hopfield.js) and the
 * experiment script (scripts/hopfield-experiments.mjs).
 */

export function mulberry32(seed) {
	let a = seed >>> 0;
	return function () {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function randomPattern(n, rng) {
	const x = new Int8Array(n);
	for (let i = 0; i < n; i++) x[i] = rng() < 0.5 ? -1 : 1;
	return x;
}

/** Flip a fraction of distinct, randomly chosen bits. */
export function corrupt(x, frac, rng) {
	const y = Int8Array.from(x);
	const n = y.length;
	const k = Math.round(frac * n);
	const idx = new Int32Array(n);
	for (let i = 0; i < n; i++) idx[i] = i;
	for (let i = 0; i < k; i++) {
		const j = i + Math.floor(rng() * (n - i));
		const t = idx[i]; idx[i] = idx[j]; idx[j] = t;
		y[idx[i]] = -y[idx[i]];
	}
	return y;
}

/** Set a contiguous block of cells (by index) to -1: "rub out" part of the picture. */
export function erase(x, from, to) {
	const y = Int8Array.from(x);
	for (let i = from; i < to && i < y.length; i++) y[i] = -1;
	return y;
}

export function hamming(a, b) {
	let d = 0;
	for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
	return d;
}

/** Normalised overlap in [-1, 1]. 1 is identical, -1 is the inverse. */
export function overlap(a, b) {
	let s = 0;
	for (let i = 0; i < a.length; i++) s += a[i] * b[i];
	return s / a.length;
}

export class Hopfield {
	constructor(n) {
		this.n = n;
		this.W = new Float64Array(n * n);
		this.patterns = [];
	}

	reset() {
		this.W.fill(0);
		this.patterns = [];
	}

	/** Store a pattern with the given rule. 'pinv' recomputes W from every pattern. */
	learn(x, rule = 'hebb') {
		this.patterns.push(Int8Array.from(x));
		if (rule === 'hebb') this._hebb(x);
		else if (rule === 'storkey') this._storkey(x);
		else if (rule === 'pinv') this._pinv();
		else throw new Error('unknown rule ' + rule);
	}

	// Hebb (1949) via Hopfield (1982): W_ij += x_i x_j / n. Local, one-shot, no
	// need to know anything else the network has stored.
	_hebb(x) {
		const { n, W } = this;
		for (let i = 0; i < n; i++) {
			const xi = x[i] / n;
			const row = i * n;
			for (let j = 0; j < n; j++) if (j !== i) W[row + j] += xi * x[j];
		}
	}

	// Storkey (1997): W_ij += (x_i x_j - x_i h_ji - h_ij x_j) / n, where h_ij is
	// the field on i from every neuron except i and j. Still local-ish (needs
	// the field, which the neuron computes anyway) but corrects for what is
	// already stored, so patterns interfere less.
	_storkey(x) {
		const { n, W } = this;
		const h = new Float64Array(n);
		for (let i = 0; i < n; i++) {
			let s = 0;
			const row = i * n;
			for (let k = 0; k < n; k++) s += W[row + k] * x[k];
			h[i] = s;
		}
		const dW = new Float64Array(n * n);
		for (let i = 0; i < n; i++) {
			const row = i * n;
			for (let j = 0; j < n; j++) {
				if (j === i) continue;
				const hij = h[i] - W[row + j] * x[j];
				const hji = h[j] - W[j * n + i] * x[i];
				dW[row + j] = (x[i] * x[j] - x[i] * hji - hij * x[j]) / n;
			}
		}
		for (let k = 0; k < n * n; k++) W[k] += dW[k];
	}

	// Pseudo-inverse (Personnaz et al. 1985, Kanter & Sompolinsky 1987):
	// W = Ξ (ΞᵀΞ)⁻¹ Ξᵀ. Needs the whole set of patterns at once and a matrix
	// inverse, so nothing like a neuron could do it, but it stores anything
	// linearly independent, up to n patterns.
	_pinv() {
		const { n, patterns } = this;
		const p = patterns.length;
		const C = new Float64Array(p * p);
		for (let a = 0; a < p; a++) {
			for (let b = a; b < p; b++) {
				let s = 0;
				const pa = patterns[a], pb = patterns[b];
				for (let i = 0; i < n; i++) s += pa[i] * pb[i];
				C[a * p + b] = C[b * p + a] = s;
			}
		}
		const Ci = invert(C, p);
		if (!Ci) return; // singular: patterns dependent, leave W as it was
		// W = Σ_ab Ci[a][b] ξ^a ξ^bᵀ  ->  first V = Ci Ξᵀ (p×n), then W = Ξ V
		const V = new Float64Array(p * n);
		for (let a = 0; a < p; a++) {
			for (let b = 0; b < p; b++) {
				const c = Ci[a * p + b];
				if (c === 0) continue;
				const pb = patterns[b];
				const row = a * n;
				for (let i = 0; i < n; i++) V[row + i] += c * pb[i];
			}
		}
		const W = this.W;
		W.fill(0);
		for (let a = 0; a < p; a++) {
			const pa = patterns[a];
			const vrow = a * n;
			for (let i = 0; i < n; i++) {
				const s = pa[i];
				const row = i * n;
				for (let j = 0; j < n; j++) W[row + j] += s * V[vrow + j];
			}
		}
		for (let i = 0; i < n; i++) W[i * n + i] = 0;
	}

	field(x, i) {
		const { n, W } = this;
		let s = 0;
		const row = i * n;
		for (let j = 0; j < n; j++) s += W[row + j] * x[j];
		return s;
	}

	energy(x) {
		const { n, W } = this;
		let e = 0;
		for (let i = 0; i < n; i++) {
			const row = i * n;
			let s = 0;
			for (let j = 0; j < n; j++) s += W[row + j] * x[j];
			e += x[i] * s;
		}
		return -0.5 * e;
	}

	/** Update one neuron in place. Returns true if it flipped. Ties keep the current state. */
	updateNeuron(x, i) {
		const h = this.field(x, i);
		const s = h > 0 ? 1 : h < 0 ? -1 : x[i];
		if (s !== x[i]) { x[i] = s; return true; }
		return false;
	}

	/** One asynchronous sweep in random order, in place. Returns the number of flips. */
	sweep(x, rng) {
		const n = this.n;
		const order = new Int32Array(n);
		for (let i = 0; i < n; i++) order[i] = i;
		for (let i = n - 1; i > 0; i--) {
			const j = Math.floor(rng() * (i + 1));
			const t = order[i]; order[i] = order[j]; order[j] = t;
		}
		let flips = 0;
		for (let k = 0; k < n; k++) if (this.updateNeuron(x, order[k])) flips++;
		return flips;
	}

	/** Run sweeps until nothing changes. Returns a copy and some bookkeeping. */
	recall(x0, { maxSweeps = 50, rng = Math.random, trace = false } = {}) {
		const x = Int8Array.from(x0);
		const energies = trace ? [this.energy(x)] : null;
		let sweeps = 0, totalFlips = 0;
		while (sweeps < maxSweeps) {
			const f = this.sweep(x, rng);
			sweeps++; totalFlips += f;
			if (trace) energies.push(this.energy(x));
			if (f === 0) break;
		}
		return { x, sweeps, flips: totalFlips, energies, converged: sweeps < maxSweeps };
	}

	isStable(x) {
		for (let i = 0; i < this.n; i++) {
			const h = this.field(x, i);
			if ((h > 0 && x[i] < 0) || (h < 0 && x[i] > 0)) return false;
		}
		return true;
	}
}

/** Gauss-Jordan inverse of a p×p matrix (row-major). Returns null if singular. */
function invert(A, p) {
	const M = Float64Array.from(A);
	const I = new Float64Array(p * p);
	for (let i = 0; i < p; i++) I[i * p + i] = 1;
	for (let c = 0; c < p; c++) {
		let piv = c, best = Math.abs(M[c * p + c]);
		for (let r = c + 1; r < p; r++) {
			const v = Math.abs(M[r * p + c]);
			if (v > best) { best = v; piv = r; }
		}
		if (best < 1e-9) return null;
		if (piv !== c) {
			for (let k = 0; k < p; k++) {
				let t = M[c * p + k]; M[c * p + k] = M[piv * p + k]; M[piv * p + k] = t;
				t = I[c * p + k]; I[c * p + k] = I[piv * p + k]; I[piv * p + k] = t;
			}
		}
		const d = M[c * p + c];
		for (let k = 0; k < p; k++) { M[c * p + k] /= d; I[c * p + k] /= d; }
		for (let r = 0; r < p; r++) {
			if (r === c) continue;
			const f = M[r * p + c];
			if (f === 0) continue;
			for (let k = 0; k < p; k++) { M[r * p + k] -= f * M[c * p + k]; I[r * p + k] -= f * I[c * p + k]; }
		}
	}
	return I;
}

/**
 * Modern / dense Hopfield network. Nothing is compressed into a weight
 * matrix: the stored patterns are the memory, and recall is one step of
 * softmax attention with the state as the query and the patterns as both
 * keys and values.
 */
export class DenseHopfield {
	constructor(n) {
		this.n = n;
		this.patterns = [];
	}
	reset() { this.patterns = []; }
	learn(x) { this.patterns.push(Int8Array.from(x)); }

	/** One update. x may be continuous in [-1, 1]. Returns the new state and the attention weights. */
	update(x, beta) {
		const { n, patterns } = this;
		const p = patterns.length;
		const logits = new Float64Array(p);
		let max = -Infinity;
		for (let a = 0; a < p; a++) {
			const pa = patterns[a];
			let s = 0;
			for (let i = 0; i < n; i++) s += pa[i] * x[i];
			logits[a] = beta * s;
			if (logits[a] > max) max = logits[a];
		}
		let z = 0;
		for (let a = 0; a < p; a++) { logits[a] = Math.exp(logits[a] - max); z += logits[a]; }
		for (let a = 0; a < p; a++) logits[a] /= z;
		const y = new Float64Array(n);
		for (let a = 0; a < p; a++) {
			const w = logits[a];
			if (w < 1e-12) continue;
			const pa = patterns[a];
			for (let i = 0; i < n; i++) y[i] += w * pa[i];
		}
		return { x: y, weights: logits };
	}

	/** Iterate to a fixed point (it nearly always takes one step). Returns a binarised copy. */
	recall(x0, beta, iters = 5) {
		let x = Float64Array.from(x0);
		let weights = null;
		for (let k = 0; k < iters; k++) {
			const r = this.update(x, beta);
			let moved = 0;
			for (let i = 0; i < this.n; i++) moved = Math.max(moved, Math.abs(r.x[i] - x[i]));
			x = r.x; weights = r.weights;
			if (moved < 1e-6) break;
		}
		const b = new Int8Array(this.n);
		for (let i = 0; i < this.n; i++) b[i] = x[i] >= 0 ? 1 : -1;
		return { x: b, cont: x, weights };
	}
}

/** Energy of the dense network (Demircigil et al. 2017 form, log-sum-exp). */
export function denseEnergy(net, x, beta) {
	let max = -Infinity;
	const s = new Float64Array(net.patterns.length);
	for (let a = 0; a < net.patterns.length; a++) {
		const pa = net.patterns[a];
		let d = 0;
		for (let i = 0; i < net.n; i++) d += pa[i] * x[i];
		s[a] = beta * d;
		if (s[a] > max) max = s[a];
	}
	let z = 0;
	for (let a = 0; a < s.length; a++) z += Math.exp(s[a] - max);
	return -(max + Math.log(z)) / beta;
}

/**
 * Twenty-by-twenty pictures to store. '#' is +1, anything else is -1.
 * Drawn by hand, so they are lumpy, but they are meant to be: they are
 * correlated (mostly background), which is the interesting case.
 */
const ART = {
	sheep: [
		'....................',
		'....................',
		'.......######.......',
		'.....##########.....',
		'....############....',
		'...##############...',
		'...##############.##',
		'..###############.##',
		'..################.#',
		'..################..',
		'..################..',
		'...##############...',
		'....############....',
		'.....#..#..#..#.....',
		'.....#..#..#..#.....',
		'.....#..#..#..#.....',
		'.....#..#..#..#.....',
		'....................',
		'....................',
		'....................',
	],
	dog: [
		'....................',
		'....##..............',
		'...###..............',
		'...#####............',
		'...#######..........',
		'...########.........',
		'....#######.........',
		'....#####...........',
		'.....####...........',
		'.....##########.....',
		'.....############...',
		'.....#############..',
		'.....##############.',
		'.....############.#.',
		'.....##.....##......',
		'.....##.....##......',
		'.....##.....##......',
		'.....##.....##......',
		'....###....###......',
		'....................',
	],
	tree: [
		'....................',
		'.........##.........',
		'........####........',
		'.......######.......',
		'......########......',
		'.....##########.....',
		'........####........',
		'......########......',
		'.....##########.....',
		'....############....',
		'...##############...',
		'.......######.......',
		'.....##########.....',
		'...##############...',
		'..################..',
		'.........##.........',
		'.........##.........',
		'.........##.........',
		'........####........',
		'....................',
	],
	house: [
		'....................',
		'....................',
		'.........##.........',
		'........####........',
		'.......######.......',
		'......###..###......',
		'.....###....###.....',
		'....###......###....',
		'...###........###...',
		'..###..........###..',
		'...##############...',
		'...##############...',
		'...##..###..#..##...',
		'...##..###..#..##...',
		'...##..###..#..##...',
		'...##..###......##..',
		'...##..###......##..',
		'...##############...',
		'....................',
		'....................',
	],
	heart: [
		'....................',
		'....................',
		'....####....####....',
		'...######..######...',
		'..################..',
		'..################..',
		'..################..',
		'..################..',
		'...##############...',
		'....############....',
		'.....##########.....',
		'......########......',
		'.......######.......',
		'........####........',
		'.........##.........',
		'....................',
		'....................',
		'....................',
		'....................',
		'....................',
	],
	sun: [
		'.........#..........',
		'....#....#....#.....',
		'.....#...#...#......',
		'......#.....#.......',
		'........###.........',
		'.......#####........',
		'......#######.......',
		'.#...#########...#..',
		'..#..#########..#...',
		'#####.#######.#####.',
		'..#..#########..#...',
		'.#...#########...#..',
		'......#######.......',
		'.......#####........',
		'........###.........',
		'......#.....#.......',
		'.....#...#...#......',
		'....#....#....#.....',
		'.........#..........',
		'....................',
	],
};

export const GRID = 20;

export function picture(name) {
	const rows = ART[name];
	if (!rows) throw new Error('no picture ' + name);
	const x = new Int8Array(GRID * GRID);
	for (let r = 0; r < GRID; r++) {
		const row = rows[r] || '';
		for (let c = 0; c < GRID; c++) x[r * GRID + c] = row[c] === '#' ? 1 : -1;
	}
	return x;
}

export const PICTURE_NAMES = Object.keys(ART);
