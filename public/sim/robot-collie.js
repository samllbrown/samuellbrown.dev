/*
 * The robot collie.
 *
 * The dog is a small neural network (17 inputs, 10 hidden, 3 outputs) that is
 * given a heading and a speed and nothing else. It is not told the two rules
 * from the paper. The world gives it the same manners as the hand-written
 * collie (it cannot run faster than that dog, and cannot close in on a sheep
 * nearer than four units) and nothing else. A genetic algorithm evolves a
 * batch of them: run each dog on a few flocks, keep the ones that pen the
 * most sheep fastest, cross them, mutate the offspring, repeat.
 *
 * This file runs in three places:
 *   - on the page, where it mounts [data-robot-collie] (watch it evolve, with
 *     the evaluations farmed out to Web Workers), [data-robot-thoughts] (the
 *     network's workings while it runs), and registers the evolved dogs that
 *     sheepdog.js uses for mode "brain:<name>";
 *   - as a Web Worker (it imports sheepdog.js itself and evaluates dogs);
 *   - in Node, for scripts/robot-collie-experiments.mjs.
 *
 * Needs sheepdog.js loaded first (or it loads it, in a worker).
 */
(function () {
	'use strict';

	var isWorker = typeof importScripts === 'function' && typeof document === 'undefined';
	if (isWorker && !globalThis.__Sheepdog) importScripts('/sim/sheepdog.js');
	var SD = globalThis.__Sheepdog;
	if (!SD) throw new Error('robot-collie.js needs sheepdog.js');

	// Dogs can have different numbers of inputs: the first N_IN-1 of the feature
	// list below plus the bias. A genome's length says how many its dog has.
	var N_FEAT = 21, N_HID = 10, N_OUT = 3;
	var N_IN = 17;                                            // the default for new dogs
	function genomeLen(nIn) { return nIn * N_HID + (N_HID + 1) * N_OUT; }
	function inputsOf(g) { return (g.length - (N_HID + 1) * N_OUT) / N_HID; }
	var GENOME_LEN = genomeLen(N_IN); // 203
	var SCALE = 40;   // field units per input unit
	var len = SD.len, W = SD.W, H = SD.H, TARGET = SD.TARGET, R_A = SD.R_A;

	// ---- What the dog can see -------------------------------------------------
	// Everything relative to the dog, in units of 40 field lengths, so a value
	// of 1 is "across most of the field". Also fills in sim.gcm/cohesion/extent
	// so the page can draw the same workings it draws for the collie.
	var FEATURES = [
		{ name: 'flock centre, across', short: 'flock x' },
		{ name: 'flock centre, up/down', short: 'flock y' },
		{ name: 'furthest sheep, across', short: 'furthest x' },
		{ name: 'furthest sheep, up/down', short: 'furthest y' },
		{ name: 'flock to pen, across', short: 'pen x' },
		{ name: 'flock to pen, up/down', short: 'pen y' },
		{ name: 'how spread out the flock is', short: 'spread' },
		{ name: 'share of sheep still loose', short: 'loose' },
		{ name: 'nearest sheep, across', short: 'nearest x' },
		{ name: 'nearest sheep, up/down', short: 'nearest y' },
		{ name: 'distance to nearest sheep', short: 'nearest d' },
		{ name: 'nearest obstacle, across', short: 'obstacle x' },
		{ name: 'nearest obstacle, up/down', short: 'obstacle y' },
		{ name: 'distance to nearest obstacle', short: 'obstacle d' },
		{ name: 'how fast the nearest sheep is moving', short: 'nearest v' },
		{ name: 'how fast the flock centre is moving', short: 'flock v' },
		{ name: 'sheep left furthest behind, across', short: 'behind x' },
		{ name: 'sheep left furthest behind, up/down', short: 'behind y' },
		{ name: 'which way the flock is drifting, across', short: 'drift x' },
		{ name: 'which way the flock is drifting, up/down', short: 'drift y' },
		{ name: 'bias (always 1)', short: 'bias' },
	];
	/** The feature names a dog with nIn inputs actually sees (its inputs, then the bias). */
	function featuresFor(nIn) { return FEATURES.slice(0, nIn - 1).concat([FEATURES[N_FEAT - 1]]); }
	var FEATURE_NAMES = FEATURES.map(function (f) { return f.name; });

	function nearestObstacle(sim, x, y) {
		var best = null, bd = Infinity;
		var circles = sim.obstacles.circles;
		for (var i = 0; i < circles.length; i++) {
			var o = circles[i], d = len(o.x - x, o.y - y) - o.r;
			if (d < bd) { bd = d; best = { x: o.x, y: o.y, d: d }; }
		}
		var walls = sim.obstacles.walls;
		for (var k = 0; k < walls.length; k++) {
			var w = walls[k];
			var vx = w[2] - w[0], vy = w[3] - w[1], l2 = vx * vx + vy * vy;
			var t = l2 > 0 ? Math.max(0, Math.min(1, ((x - w[0]) * vx + (y - w[1]) * vy) / l2)) : 0;
			var qx = w[0] + vx * t, qy = w[1] + vy * t, d2 = len(qx - x, qy - y);
			if (d2 < bd) { bd = d2; best = { x: qx, y: qy, d: d2 }; }
		}
		return best;
	}

	function features(sim) {
		var f = new Float64Array(N_FEAT);
		var dog = sim.dog, sheep = sim.sheep, n = sheep.length;
		var gx = 0, gy = 0, loose = 0;
		for (var i = 0; i < n; i++) if (!sheep[i].penned) { gx += sheep[i].x; gy += sheep[i].y; loose++; }
		if (loose === 0) { sim.gcm = null; return f; }
		gx /= loose; gy /= loose;
		var fN = R_A * Math.pow(loose, 2 / 3);
		var far = null, fd = -1, near = null, nd = Infinity, maxd = 0;
		for (var j = 0; j < n; j++) {
			var s = sheep[j];
			if (s.penned) continue;
			var d = len(s.x - gx, s.y - gy);
			if (d > fd) { fd = d; far = s; }
			if (d > maxd) maxd = d;
			var dd = len(s.x - dog.x, s.y - dog.y);
			if (dd < nd) { nd = dd; near = s; }
		}
		sim.gcm = { x: gx, y: gy }; sim.cohesion = fN; sim.extent = maxd;
		f[0] = (gx - dog.x) / SCALE; f[1] = (gy - dog.y) / SCALE;
		f[2] = (far.x - dog.x) / SCALE; f[3] = (far.y - dog.y) / SCALE;
		f[4] = (TARGET.x - gx) / SCALE; f[5] = (TARGET.y - gy) / SCALE;
		f[6] = Math.max(-1, Math.min(3, maxd / fN - 1));
		f[7] = loose / n;
		f[8] = (near.x - dog.x) / SCALE; f[9] = (near.y - dog.y) / SCALE;
		f[10] = Math.min(2, nd / 10);
		var ob = nearestObstacle(sim, dog.x, dog.y);
		if (ob && ob.d < 20) { f[11] = (ob.x - dog.x) / SCALE; f[12] = (ob.y - dog.y) / SCALE; f[13] = ob.d / 10; }
		else { f[11] = 0; f[12] = 0; f[13] = 2; }
		// Is anything actually moving? (In units of a sheep's running speed.)
		f[14] = Math.min(2, (near.speed || 0) / SD.SHEEP_SPEED);
		var pg = sim.prevGcm;
		var vx = pg ? gx - pg.x : 0, vy = pg ? gy - pg.y : 0, vl = len(vx, vy);
		f[15] = pg ? Math.min(2, vl / SD.SHEEP_SPEED) : 0;
		sim.prevGcm = { x: gx, y: gy };
		// The sheep left furthest behind: most against the direction from the flock to the pen.
		var ux = TARGET.x - gx, uy = TARGET.y - gy, ul = len(ux, uy); ux /= ul; uy /= ul;
		var behind = null, bd = Infinity;
		for (var q = 0; q < n; q++) {
			var sq = sheep[q];
			if (sq.penned) continue;
			var proj = (sq.x - gx) * ux + (sq.y - gy) * uy;
			if (proj < bd) { bd = proj; behind = sq; }
		}
		f[16] = (behind.x - dog.x) / SCALE; f[17] = (behind.y - dog.y) / SCALE;
		// Which way the flock is drifting (unit vector, or nothing if it isn't).
		f[18] = vl > 1e-6 ? vx / vl : 0; f[19] = vl > 1e-6 ? vy / vl : 0;
		f[20] = 1;
		return f;
	}

	// ---- The network -------------------------------------------------------------
	// f is the full feature vector; the dog reads its first nIn-1 entries plus the bias.
	function act(g, f) {
		var nIn = inputsOf(g), h = new Float64Array(N_HID + 1);
		var k = 0;
		for (var i = 0; i < N_HID; i++) {
			var s = 0;
			for (var j = 0; j < nIn - 1; j++) s += g[k++] * f[j];
			s += g[k++] * f[N_FEAT - 1];
			h[i] = Math.tanh(s);
		}
		h[N_HID] = 1;
		var o = [0, 0, 0];
		for (var a = 0; a < N_OUT; a++) {
			var t = 0;
			for (var b = 0; b <= N_HID; b++) t += g[k++] * h[b];
			o[a] = t;
		}
		var l = len(o[0], o[1]);
		return { hx: o[0] / l, hy: o[1] / l, speed: 1 / (1 + Math.exp(-o[2])), hidden: h, raw: o };
	}
	function makeBrain(g) {
		return function (sim) {
			if (sim.state !== 'running') return null;
			var f = features(sim);
			if (!sim.gcm) return null;
			var a = act(g, f);
			sim.lastThought = { inputs: f, act: a, nIn: inputsOf(g) };
			return a;
		};
	}

	// What does this heading look like, in the paper's terms? Compare it with
	// the two spots the paper's dog would run to: behind the furthest sheep
	// (COLLECT) and behind the flock, away from the pen (DRIVE).
	function readThought(sim, hx, hy) {
		if (!sim.gcm) return { label: 'done', collect: 0, drive: 0 };
		var g = sim.gcm, dog = sim.dog, loose = 0, far = null, fd = -1;
		for (var i = 0; i < sim.sheep.length; i++) {
			var s = sim.sheep[i];
			if (s.penned) continue;
			loose++;
			var d = len(s.x - g.x, s.y - g.y);
			if (d > fd) { fd = d; far = s; }
		}
		var ux = TARGET.x - g.x, uy = TARGET.y - g.y, ul = len(ux, uy); ux /= ul; uy /= ul;
		var cx = (far.x - g.x) / fd, cy = (far.y - g.y) / fd;
		var collectSpot = { x: far.x + cx * R_A, y: far.y + cy * R_A };
		var back = R_A * Math.sqrt(loose);
		var driveSpot = { x: g.x - ux * back, y: g.y - uy * back };
		var toC = { x: collectSpot.x - dog.x, y: collectSpot.y - dog.y }, lc = len(toC.x, toC.y);
		var toD = { x: driveSpot.x - dog.x, y: driveSpot.y - dog.y }, ld = len(toD.x, toD.y);
		var collect = (toC.x * hx + toC.y * hy) / lc, drive = (toD.x * hx + toD.y * hy) / ld;
		var spread = fd > sim.cohesion;
		var label;
		if (lc < 3 || ld < 3) label = drive >= collect ? 'DRIVE' : 'COLLECT';
		else if (collect > 0.7 && collect > drive) label = 'COLLECT';
		else if (drive > 0.7) label = 'DRIVE';
		else label = 'neither';
		return { label: label, collect: collect, drive: drive, spread: spread, collectSpot: collectSpot, driveSpot: driveSpot };
	}

	// Workings for the robot, drawn on top of the field by sheepdog.js when the
	// box is ticked: the heading it chose, and the two spots the paper's dog
	// would be running to (C for collect, D for drive) so you can see which one
	// it's nearer to doing.
	globalThis.__SheepdogOverlay = function (ctx, sim, px) {
		if (!sim.gcm || sim.state !== 'running' || !sim.lastThought) return;
		var th = readThought(sim, sim.lastThought.act.hx, sim.lastThought.act.hy);
		var dog = sim.dog, r = Math.max(3, px * 1.2);
		function spot(p, letter, col) {
			ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, px * 0.35);
			ctx.beginPath(); ctx.arc(p.x * px, p.y * px, r, 0, Math.PI * 2); ctx.stroke();
			ctx.fillStyle = col; ctx.font = Math.max(9, px * 2.2) + 'px ui-monospace, Menlo, Consolas, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
			ctx.fillText(letter, p.x * px, (p.y - 2.2) * px);
		}
		spot(th.collectSpot, 'C', th.label === 'COLLECT' ? '#ffb454' : 'rgba(255,180,84,0.45)');
		spot(th.driveSpot, 'D', th.label === 'DRIVE' ? '#c561f6' : 'rgba(197,97,246,0.45)');
		var a = sim.lastThought.act, L = 9;
		ctx.strokeStyle = 'rgba(233,230,221,0.8)'; ctx.lineWidth = Math.max(1, px * 0.4);
		ctx.beginPath(); ctx.moveTo(dog.x * px, dog.y * px); ctx.lineTo((dog.x + a.hx * L) * px, (dog.y + a.hy * L) * px); ctx.stroke();
	};

	// ---- Scoring a dog ---------------------------------------------------------------
	// Fitness: fraction of sheep penned (0-1), plus a bonus for finishing quickly
	// (0-1), plus a little for how close the loose ones got (0-0.3), so early
	// generations that pen nothing still get told when they are moving the
	// flock the right way.
	function evaluate(g, level, seed, maxTicks) {
		var sim = new SD.Sim(level);
		sim.rand = SD.mulberry32((seed * 7919 + 13) >>> 0);
		sim.reset(seed);
		sim.brain = makeBrain(g);
		sim.start('brain');
		while (sim.state !== 'done' && sim.ticks < maxTicks) sim.step();
		var n = sim.sheep.length, loose = 0, dist = 0;
		for (var i = 0; i < n; i++) {
			var s = sim.sheep[i];
			if (!s.penned) { loose++; dist += len(TARGET.x - s.x, TARGET.y - s.y) / W; }
		}
		var done = sim.state === 'done';
		var fitness = (n - loose) / n + (done ? 1 - sim.ticks / maxTicks : 0) + 0.3 * (loose ? 1 - dist / loose : 1);
		return { fitness: fitness, penned: n - loose, n: n, ticks: sim.ticks, done: done };
	}

	// ---- The genetic algorithm ----------------------------------------------------------
	function randn(rng) {
		var u = 1 - rng(), v = rng();
		return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
	}
	function randomGenome(rng, nIn) {
		var L = genomeLen(nIn || N_IN), g = new Float64Array(L);
		for (var i = 0; i < L; i++) g[i] = randn(rng) * 0.5;
		return g;
	}
	/** Give an existing dog more inputs, with zero weights on the new ones, so it behaves exactly as before to start with. */
	function extendGenome(g, nInNew) {
		var nInOld = inputsOf(g);
		if (nInOld >= nInNew) return Float64Array.from(g);
		var out = new Float64Array(genomeLen(nInNew)), k = 0, o = 0;
		for (var h = 0; h < N_HID; h++) {
			for (var j = 0; j < nInOld - 1; j++) out[o++] = g[k++];
			for (var z = nInOld - 1; z < nInNew - 1; z++) out[o++] = 0;
			out[o++] = g[k++]; // bias weight
		}
		while (k < g.length) out[o++] = g[k++];
		return out;
	}

	function Evolver(opts) {
		opts = opts || {};
		this.levels = opts.levels || [opts.level || 'paper'];   // flocks are drawn from these in turn
		this.popSize = opts.popSize || 32;
		this.flocksPerGen = opts.flocksPerGen || 2;
		this.maxTicks = opts.maxTicks || 2400;
		this.elite = opts.elite == null ? 2 : opts.elite;
		this.mutRate = opts.mutRate == null ? 0.1 : opts.mutRate;
		this.mutSigma = opts.mutSigma == null ? 0.3 : opts.mutSigma;
		this.tournament = opts.tournament || 3;
		this.nIn = opts.nIn || N_IN;
		this.rng = SD.mulberry32(opts.seed || 1);
		this.gen = 0;
		this.pop = [];
		// Optionally carry on from existing dogs: keep them, and fill the rest of the batch with mutated copies.
		var self = this, from = (opts.seedGenomes || []).map(function (g) { return extendGenome(Float64Array.from(g), self.nIn); });
		var L = genomeLen(this.nIn);
		for (var i = 0; i < this.popSize; i++) {
			if (i < from.length) this.pop.push(Float64Array.from(from[i]));
			else if (from.length) {
				var src = from[i % from.length], child = new Float64Array(L);
				for (var q = 0; q < L; q++) child[q] = src[q] + (this.rng() < this.mutRate ? randn(this.rng) * this.mutSigma : 0);
				this.pop.push(child);
			} else this.pop.push(randomGenome(this.rng, this.nIn));
		}
		this.history = [];      // {gen, best, mean, penned, pennedFrac, champion}
	}

	// Every generation is tested on a fresh set of flocks, shared by the whole
	// batch, so a dog can't get good at one flock and coast.
	Evolver.prototype.flocksFor = function (gen) {
		var flocks = [];
		for (var i = 0; i < this.flocksPerGen; i++) {
			flocks.push({ level: this.levels[(gen * this.flocksPerGen + i) % this.levels.length], seed: 1000 + gen * this.flocksPerGen + i });
		}
		return flocks;
	};

	/** Jobs to evaluate for the current generation: one per (dog, flock). */
	Evolver.prototype.jobs = function () {
		var flocks = this.flocksFor(this.gen), jobs = [];
		for (var i = 0; i < this.pop.length; i++) for (var s = 0; s < flocks.length; s++) jobs.push({ dog: i, genome: this.pop[i], level: flocks[s].level, seed: flocks[s].seed });
		return jobs;
	};

	/** Take the results of jobs() (any order), record the generation, make the next one. */
	Evolver.prototype.advance = function (results) {
		var P = this.pop.length, fit = new Float64Array(P), penned = new Float64Array(P), pf = new Float64Array(P), k = this.flocksPerGen;
		for (var r = 0; r < results.length; r++) { fit[results[r].dog] += results[r].fitness / k; penned[results[r].dog] += results[r].penned / k; pf[results[r].dog] += results[r].penned / results[r].n / k; }
		var order = [];
		for (var i = 0; i < P; i++) order.push(i);
		order.sort(function (a, b) { return fit[b] - fit[a]; });
		var best = order[0], mean = 0;
		for (var m = 0; m < P; m++) mean += fit[m] / P;
		var entry = { gen: this.gen, best: fit[best], mean: mean, penned: penned[best], pennedFrac: pf[best], champion: Float64Array.from(this.pop[best]) };
		this.history.push(entry);
		var rng = this.rng, self = this;
		function pick() {
			var b = order[Math.floor(rng() * P)];
			for (var t = 1; t < self.tournament; t++) { var c = order[Math.floor(rng() * P)]; if (fit[c] > fit[b]) b = c; }
			return self.pop[b];
		}
		var next = [];
		for (var e = 0; e < this.elite && e < P; e++) next.push(Float64Array.from(this.pop[order[e]]));
		var L = genomeLen(this.nIn);
		while (next.length < P) {
			var a = pick(), b2 = pick(), child = new Float64Array(L);
			for (var q = 0; q < L; q++) {
				child[q] = rng() < 0.5 ? a[q] : b2[q];
				if (rng() < this.mutRate) child[q] += randn(rng) * this.mutSigma;
			}
			next.push(child);
		}
		this.pop = next;
		this.gen++;
		return entry;
	};

	// ---- Evolved dogs ----------------------------------------------------------------------
	// Filled in from scripts/robot-collie-experiments.mjs.
	//   open: evolved on the open field only (the paper's field).
	//   farm: evolved on a mix of the awkward flock and the obstacle field.
	//   best: the retrained dog carried on with four more inputs, on all four fields at once.
	var EVOLVED = {
		open: [-1.4225, -1.5219, 0.3040, -0.2787, 1.0287, -0.3308, 0.2114, -0.5077, 0.8770, -1.2454, -0.2926, -1.6534, 1.5058, -0.7361, 0.2071, -0.2452, -0.1599, 2.4044, -1.4415, -1.3125, 0.1183, -0.7881, 0.6042, 1.3504, -0.3183, 0.2244, -0.7504, -1.7610, 0.6119, -1.2405, -1.5188, 1.5369, -0.9116, 1.2736, -0.9429, 1.4458, 2.2366, -0.4767, -1.2445, 0.1409, -1.8631, -0.6782, 0.5973, -0.5553, 0.3747, 1.4474, 0.1490, 0.2709, -0.1389, -0.1305, -0.9823, 0.1815, 2.2543, 0.4083, 0.6115, -0.3660, 0.2133, -0.2027, 0.9270, 1.7389, 1.0472, -1.9267, 1.4088, -1.1566, 0.2212, 0.7535, 1.5976, -0.0786, -0.7499, 0.3232, 1.3645, -0.3999, -0.1991, 0.4607, -2.1158, 1.8059, 0.2064, -0.8555, 0.5905, -1.2439, -0.2743, 0.7221, 1.5968, 0.8479, -0.8110, -0.1988, -0.2077, 0.3929, 1.1214, -2.5596, 0.1771, 1.2307, -0.8313, 0.6548, -0.0690, -1.2168, 1.1361, -0.4033, -0.3595, -0.7817, 1.2477, -1.1074, -2.2346, -0.7954, -1.4354, -0.7455, 0.4178, 1.9006, 1.0536, 0.2512, -1.1599, -1.9523, -2.0885, -0.0402, 0.6500, 0.6361, 1.4986, 0.8300, 1.3042, 0.9567, -2.3484, 1.3850, -0.3109, -0.6226, 2.4408, 2.7884, 0.3826, 1.3818, -1.0681, 1.3089, 1.4015, -0.6505, 0.2675, -0.5542, -0.8420, -1.2755, 0.5408, -0.2387, 0.9364, -0.8543, 0.4693, -0.2973, 0.0278, 0.6141, 0.3824, 2.1730, 0.7293, 1.9643, -1.2546, -1.2993, 0.3580, -0.0951, -1.1240, -1.8508, -0.4458, 0.2678, -0.5555, -0.9778, -0.9960, -1.7581, 1.4564, -0.1955, 1.1256, -2.0586, -0.7313, -1.5664, -0.9885, 0.2898, -1.3096, 0.5613, 1.7452, -0.0155, -0.4600, -0.2248, -0.4201, 0.8503, -2.7612, 1.5421, 1.6316, -1.4740, 0.5998, -0.0895, -0.2460, -0.1771, 0.7044, 0.7550, -1.2215, -2.3056, -1.3999, -0.0744, 0.4504, -2.0543, 1.5838, -1.0092, 0.7419, 0.1638, 1.1018, -1.6861, 0.0667, 0.3958, 1.2511, -0.9744, 0.5309],
		farm: [1.3733, 1.3491, -0.5969, 0.1144, -1.5630, -1.9266, -0.7862, -0.7704, 0.6589, 4.1773, 1.1226, 0.8686, -1.5410, -0.1240, -0.4769, -3.9986, -0.2395, 0.2949, -0.2731, 0.0232, 0.4488, -1.8590, -0.3247, 0.1788, 0.1327, 0.5866, -1.9236, -0.0571, -0.5832, 0.9950, 1.1311, 1.7745, -2.0210, 0.0181, 0.4789, -0.4535, -0.8263, -0.9012, -1.7303, -0.9233, 0.2198, 0.9188, -0.1378, 0.8509, -0.2990, 0.2913, 0.4368, -1.6706, -2.4772, -1.5137, -1.5489, -1.5540, 1.0507, 1.4266, 1.4073, -0.7305, -1.4425, 1.2734, 2.5769, -0.1316, 0.0773, 2.2687, 0.3336, -0.0158, 0.1647, -2.8188, 0.6683, -1.1882, -1.5640, 1.5794, -1.4127, 0.4618, -0.5183, -0.6325, -0.7782, -1.6699, -1.5994, 1.3489, 0.4906, -0.0828, 1.5603, 0.6241, -2.5241, -0.9837, -0.4594, -1.2347, -1.9890, 2.5821, 0.0590, 0.1346, 1.6494, 1.0142, 0.0834, 2.7201, -0.7264, -2.2120, 1.2403, -1.4872, -0.1457, -0.0175, 0.5970, -1.1604, 0.9620, 0.3515, 4.2942, 0.4445, -0.7817, 2.5488, -0.1050, 1.4647, 3.1974, -0.5658, 1.9115, 0.1471, -0.5776, -0.0009, -1.9572, -3.4807, -0.3782, -0.6744, 3.2198, -2.0216, 1.0520, -0.3438, -0.6444, -2.0788, -0.8419, -0.1508, 1.4411, 0.7406, -0.8217, 1.1337, 1.2512, 1.4353, 0.5340, 0.6872, -1.7038, -0.0194, 0.1260, -0.9671, 1.7711, 0.6822, 1.0157, 0.1384, -0.2694, 2.0861, -0.7152, -1.5193, -0.9551, 0.4116, -0.0571, -0.4725, 0.0435, -2.2110, 1.4411, -2.8774, -0.7370, -0.2566, 1.5545, 0.4216, -0.9096, 2.1399, 2.4158, -0.7342, 0.5638, 0.4722, -1.8546, 0.0477, 0.3906, 1.7384, 2.0306, 0.3549, 0.4113, 0.4895, 0.3713, -1.9459, 3.8287, -1.6713, -0.4823, -0.4636, -1.9202, 2.1504, -0.4563, -1.0695, -0.1255, 0.5542, -0.8639, -1.0452, 0.4478, 0.3161, -0.5673, 0.1406, 1.0939, -1.2658, -1.0663, 1.5363, -2.1946, 0.0719, 0.6982, 1.2771, -1.8769, -1.2657, 2.3700],
		best: [0.2954, 1.7747, 2.3452, 0.8101, -2.3930, -0.8712, -1.0258, -1.0134, 0.9589, 6.1787, 1.4285, -0.9116, -1.0708, 0.9196, -1.7498, -2.8951, -0.0623, 1.1484, 1.3173, -1.0642, -0.5917, 0.3368, -0.6441, -0.2426, 0.9892, -1.0777, -0.4318, -0.1176, -0.8540, 1.2186, -3.3133, -0.1736, -1.6978, 1.8003, -0.7045, 2.9553, -2.5681, 0.0433, -3.9889, -1.1406, 0.2276, -0.4682, 1.8562, 0.1555, 0.1154, -0.1325, -1.8389, -1.9077, -0.0545, 3.3791, 2.0182, -0.6433, -1.0026, 1.6376, 1.5387, -2.5538, -5.0081, -0.7791, 0.6127, 2.9786, -2.2524, 0.0002, -1.8390, -2.1443, 1.2821, 1.4111, -0.0941, 0.4011, -0.2200, 1.3320, 4.5537, 1.2691, 0.7607, 1.2025, -1.8175, 0.9568, 0.8471, -3.0712, 0.8242, 1.2313, 0.3583, 0.5062, 0.9852, -0.8323, -3.0050, 0.1888, -1.6015, 0.3709, 1.6070, -0.9820, -0.5028, -1.7370, -1.4175, 1.0675, 0.6530, -0.1603, 0.0111, 0.5983, -0.9983, -2.6625, -0.7496, 0.3261, -0.7805, -1.4451, 0.8271, -2.6809, -2.5308, 2.6788, 1.7204, 0.4743, 2.6839, 2.0125, 0.4479, 2.3920, 1.2532, -1.4208, -0.6778, -1.8084, -1.4544, 0.7389, 2.0585, -0.8900, -0.8539, -0.6402, -0.2142, -2.2844, 1.0991, -0.8958, 3.5937, -0.2680, -0.3464, 4.1869, -0.1791, 1.1453, 3.4267, -1.2215, 2.1086, 0.6905, -0.4560, -0.2130, -3.1114, -4.1016, 3.1115, -0.6858, -0.4220, -0.2352, -0.5106, -2.0351, 1.6907, -2.5515, 2.1252, -1.2467, -1.7640, -1.5407, -2.2375, 0.0307, 1.5752, 2.8918, 0.1652, 0.2687, 0.6402, 1.9844, 1.0032, 0.4399, -0.5636, -2.6806, -1.7765, 2.6585, -2.6997, -1.2697, 0.4137, -0.8575, 0.3521, 0.1489, 1.1132, 0.4025, 0.5093, 1.8975, -0.1158, -0.7120, 1.1584, -0.2216, -0.7197, -0.8652, 0.9325, -0.9995, 1.2489, -0.8033, 1.1180, -3.0004, 2.2437, -2.8484, 1.9428, 0.0859, 1.5574, 0.6555, 0.3231, 2.7751, 2.9259, -0.7578, 0.0730, 1.8343, -1.3200, -0.2138, 0.6572, -0.4151, -0.5712, -0.6884, 0.1721, -1.3396, 0.7787, -0.0280, -0.1979, -0.7442, -0.8161, -2.4863, 4.8801, -1.5088, 0.8688, 0.6738, -2.4223, 3.5939, -0.7602, -1.7672, 0.9177, 1.8579, 0.1001, -2.8038, -0.9591, -0.8024, 0.3701, -0.9676, 0.6484, -0.9996, -1.4703, 1.7354, -0.3920, -0.7395, 1.2295, 0.8710, -0.1773, -2.3256, 4.5508],
	};

	globalThis.__RobotCollie = {
		N_IN: N_IN, N_FEAT: N_FEAT, N_HID: N_HID, GENOME_LEN: GENOME_LEN, FEATURES: FEATURES, FEATURE_NAMES: FEATURE_NAMES, featuresFor: featuresFor,
		genomeLen: genomeLen, inputsOf: inputsOf, extendGenome: extendGenome,
		features: features, act: act, makeBrain: makeBrain, evaluate: evaluate, readThought: readThought,
		randomGenome: randomGenome, Evolver: Evolver, EVOLVED: EVOLVED,
	};
	globalThis.__SheepdogBrains = globalThis.__SheepdogBrains || {};
	function validGenome(g) { return g && Number.isInteger(inputsOf(g)) && inputsOf(g) >= 2 && inputsOf(g) <= N_FEAT; }
	for (var bk in EVOLVED) if (validGenome(EVOLVED[bk])) globalThis.__SheepdogBrains[bk] = makeBrain(Float64Array.from(EVOLVED[bk]));

	// ---- Worker ------------------------------------------------------------------------------
	if (isWorker) {
		onmessage = function (e) {
			var d = e.data, out = [];
			for (var i = 0; i < d.jobs.length; i++) {
				var j = d.jobs[i], r = evaluate(j.genome, j.level || d.level, j.seed, d.maxTicks);
				out.push({ dog: j.dog, seed: j.seed, level: j.level, fitness: r.fitness, penned: r.penned, n: r.n, ticks: r.ticks, done: r.done });
			}
			postMessage({ id: d.id, results: out });
		};
		return;
	}
	if (typeof document === 'undefined') return;

	// ---- Page: basic evolution --------------------------------------------------------------
	var COL = { best: '#a93fe0', mean: '#c97c12', text: '#8490b5', textStrong: '#c3cadb', axis: 'rgba(255,255,255,0.14)', pos: '#c97c12', neg: '#a93fe0', bar: '#7dd3a0' };

	function mountEvolve(root) {
		var level = root.dataset.robotCollie || 'paper';
		var canvas = root.querySelector('canvas.robot-field'), ctx = canvas.getContext('2d');
		var chartEl = root.querySelector('[data-role="chart"]');
		var q = function (sel) { return root.querySelector(sel); };
		var statusEl = q('[data-role="status"]'), genEl = q('[data-role="gen"]'), bestEl = q('[data-role="best"]'), workEl = q('[data-role="work"]');
		var labelEl = q('[data-role="label"]'), gensEl = q('[data-role="gens"]');
		var popSize = parseInt(root.dataset.pop || '32', 10), flocks = parseInt(root.dataset.flocks || '2', 10), maxTicks = 2400;

		var evolver = null, running = false, waiting = false, workers = [], pending = {}, nextId = 1, target = 50;
		var replay = new SD.Sim(level), replayGen = -1, px = 1;
		replay.reset(7);

		function ensureWorkers() {
			if (workers.length) return;
			var n = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1));
			for (var i = 0; i < n; i++) {
				var w = new Worker('/sim/robot-collie.js');
				w.onmessage = function (e) { var p = pending[e.data.id]; if (p) { delete pending[e.data.id]; p(e.data.results); } };
				workers.push(w);
			}
		}
		function evalAll(jobs, cb) {
			ensureWorkers();
			var chunks = workers.map(function () { return []; });
			for (var i = 0; i < jobs.length; i++) chunks[i % workers.length].push(jobs[i]);
			var results = [], left = 0;
			chunks.forEach(function (c, wi) {
				if (!c.length) return;
				left++;
				var id = nextId++;
				pending[id] = function (r) { results = results.concat(r); if (--left === 0) cb(results); };
				workers[wi].postMessage({ id: id, level: level, maxTicks: maxTicks, jobs: c });
			});
			if (left === 0) cb(results);
		}

		function setStatus(t) { if (statusEl) statusEl.textContent = t; }
		function fmtGen() {
			var h = evolver.history, last = h[h.length - 1];
			if (genEl) genEl.textContent = 'generation ' + evolver.gen + ' of ' + target;
			if (bestEl) bestEl.textContent = last ? 'best ' + last.best.toFixed(2) + ' · penned ' + last.penned.toFixed(1) + '/' + replay.sheep.length : 'best –';
		}
		function readTarget() { target = gensEl ? parseInt(gensEl.value, 10) || 50 : 50; }

		function generation() {
			if (!running || waiting) return;
			if (evolver.gen >= target) { running = false; setPressed(); setStatus('that\'s ' + target + ' generations. The best dog is replaying on the field; pick a bigger number and press Evolve to carry on.'); return; }
			waiting = true;
			setStatus('generation ' + (evolver.gen + 1) + ' of ' + target + ': trialling ' + evolver.popSize + ' dogs on ' + flocks + ' flocks…');
			evalAll(evolver.jobs(), function (results) {
				waiting = false;
				if (!evolver) return;
				var e = evolver.advance(results);
				fmtGen(); drawChart();
				var msg = 'generation ' + evolver.gen + ': best dog penned ' + e.penned.toFixed(1) + ' of ' + replay.sheep.length + ' on average';
				if (e.penned >= replay.sheep.length - 0.01) msg += ', all of them';
				setStatus(msg + '.');
				if (running) setTimeout(generation, 30);
			});
		}

		function startReplay() {
			var h = evolver && evolver.history;
			if (!h || !h.length) return;
			var last = h[h.length - 1];
			replay = new SD.Sim(level);
			replay.reset(7);
			replay.brain = makeBrain(last.champion);
			replayGen = last.gen + 1;
			replay.start('brain', 'The best dog of generation ' + replayGen);
		}

		function drawChart() {
			if (!chartEl) return;
			var w = chartEl.clientWidth || 300, h = 120, dpr = Math.min(2, window.devicePixelRatio || 1);
			chartEl.width = Math.round(w * dpr); chartEl.height = Math.round(h * dpr); chartEl.style.height = h + 'px';
			var c = chartEl.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
			c.clearRect(0, 0, w, h);
			var pad = { l: 34, r: 10, t: 8, b: 22 };
			var hist = evolver ? evolver.history : [];
			var xmax = Math.max(target, hist.length), ymax = 2.3;
			var X = function (v) { return pad.l + v / xmax * (w - pad.l - pad.r); };
			var Y = function (v) { return h - pad.b - v / ymax * (h - pad.t - pad.b); };
			c.font = '11px ui-monospace, Menlo, Consolas, monospace'; c.fillStyle = COL.text; c.strokeStyle = COL.axis; c.lineWidth = 1;
			[0, 1, 2].forEach(function (t) {
				c.beginPath(); c.moveTo(pad.l, Y(t) + 0.5); c.lineTo(w - pad.r, Y(t) + 0.5); c.stroke();
				c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText(String(t), pad.l - 6, Y(t));
			});
			c.textAlign = 'right'; c.textBaseline = 'bottom'; c.fillText('score by generation (1 = every sheep in)', w - pad.r, h - 2);
			if (!hist.length) return;
			[['best', COL.best], ['mean', COL.mean]].forEach(function (s) {
				c.strokeStyle = s[1]; c.lineWidth = 2; c.beginPath();
				hist.forEach(function (e, i) { var x = X(i + 1), y = Y(e[s[0]]); if (i === 0) c.moveTo(x, y); else c.lineTo(x, y); });
				c.stroke();
			});
		}

		function resize() {
			var cssW = root.clientWidth || 600, cssH = cssW * (SD.H / SD.W);
			var dpr = Math.min(2, window.devicePixelRatio || 1);
			canvas.style.height = cssH + 'px';
			canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
			px = canvas.width / SD.W;
			drawChart();
		}

		function reset() {
			running = false;
			readTarget();
			evolver = new Evolver({ level: level, popSize: popSize, flocksPerGen: flocks, maxTicks: maxTicks, seed: (Math.random() * 1e9) >>> 0 });
			replay = new SD.Sim(level); replay.reset(7); replayGen = -1;
			fmtGen(); drawChart();
			setStatus(popSize + ' dogs with random brains. Pick how many generations and press Evolve.');
			setPressed();
		}
		function setPressed() {
			var b = q('[data-action="start"]');
			if (b) { b.setAttribute('aria-pressed', running ? 'true' : 'false'); b.textContent = running ? 'Pause' : 'Evolve'; }
		}

		root.querySelectorAll('[data-action]').forEach(function (b) {
			b.addEventListener('click', function () {
				var a = b.dataset.action;
				if (a === 'start') { readTarget(); running = !running; setPressed(); if (running) generation(); else setStatus('paused after generation ' + evolver.gen + '.'); }
				else if (a === 'reset') reset();
			});
		});
		if (gensEl) gensEl.addEventListener('change', function () { readTarget(); fmtGen(); drawChart(); });

		var visible = true;
		if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0.2 }).observe(root);

		var replayTicks = 0;
		function frame() {
			if (!document.body.contains(root)) { running = false; workers.forEach(function (w) { w.terminate(); }); return; }
			if (visible) {
				if (evolver && evolver.history.length) {
					var latest = evolver.history.length;
					var stale = latest - replayGen >= 4 && replay.ticks >= 12 * SD.TICKS_PER_SEC;
					if (replay.state === 'done') { if (replayTicks < 90) replayTicks++; else { startReplay(); replayTicks = 0; } }
					else if (replay.state !== 'running' || replay.ticks >= maxTicks || stale) { startReplay(); replayTicks = 0; }
				}
				if (replay.state === 'running') replay.step();
				SD.draw(ctx, replay, px, !workEl || workEl.checked);
				if (labelEl) labelEl.textContent = replayGen > 0 ? 'replaying the best dog of generation ' + replayGen + ' · ' + replay.pennedCount + '/' + replay.sheep.length + ' penned · ' + (replay.ticks / SD.TICKS_PER_SEC).toFixed(1) + 's' : 'nothing evolved yet';
			}
			requestAnimationFrame(frame);
		}

		reset(); resize();
		if ('ResizeObserver' in window) new ResizeObserver(resize).observe(root); else window.addEventListener('resize', resize);
		requestAnimationFrame(frame);
	}

	// ---- Page: what it's thinking ------------------------------------------------------------

	function bars(el, values, names, signed) {
		if (!el) return;
		if (el.childNodes.length !== values.length) {
			el.innerHTML = '';
			for (var i = 0; i < values.length; i++) {
				var row = document.createElement('div'); row.className = 'robot-bar';
				var nm = document.createElement('span'); nm.textContent = names[i]; row.appendChild(nm);
				var track = document.createElement('i'); var fill = document.createElement('b'); track.appendChild(fill); row.appendChild(track);
				var v = document.createElement('em'); row.appendChild(v);
				el.appendChild(row);
			}
		}
		for (var j = 0; j < values.length; j++) {
			var r = el.childNodes[j], fill2 = r.childNodes[1].firstChild, val = values[j];
			var mag = Math.min(1, Math.abs(val) / (signed ? 1 : 2));
			if (signed) {
				fill2.style.left = val >= 0 ? '50%' : (50 - mag * 50) + '%';
				fill2.style.width = (mag * 50) + '%';
				fill2.style.background = val >= 0 ? COL.pos : COL.neg;
			} else { fill2.style.left = '0'; fill2.style.width = (mag * 100) + '%'; fill2.style.background = COL.bar; }
			r.childNodes[2].textContent = val.toFixed(2);
		}
	}

	// A panel of bars (inputs, hidden units, decision) plus the reading in the paper's words.
	function makePanel(root) {
		var q = function (sel) { return root.querySelector(sel); };
		var inputsEl = q('[data-role="inputs"]'), hiddenEl = q('[data-role="hidden"]'), outEl = q('[data-role="outputs"]');
		var statusEl = q('[data-role="status"]'), tallyEl = q('[data-role="tally"]');
		var tally = { DRIVE: 0, COLLECT: 0, neither: 0 }, lastLabel = '';
		function reset() { tally = { DRIVE: 0, COLLECT: 0, neither: 0 }; lastLabel = ''; }
		function update(sim) {
			var t = sim.lastThought;
			if (t && sim.state === 'running') {
				var th = readThought(sim, t.act.hx, t.act.hy);
				tally[th.label] = (tally[th.label] || 0) + 1;
				var own = featuresFor(t.nIn), vals = Array.from(t.inputs).slice(0, t.nIn - 1); vals.push(1);
				bars(inputsEl, vals, own.map(function (f) { return f.short; }), true);
				bars(hiddenEl, Array.from(t.act.hidden).slice(0, N_HID), ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'h9', 'h10'], true);
				if (outEl) {
					var ang = Math.round(Math.atan2(t.act.hy, t.act.hx) * 180 / Math.PI);
					outEl.innerHTML = '<span class="robot-arrow" style="transform: rotate(' + ang + 'deg)">➜</span> heading ' + ang + '° · speed ' + Math.round(t.act.speed * 100) + '%' + (sim.creeping ? ' (held off a sheep)' : '');
				}
				if (statusEl) {
					var text = th.label === 'DRIVE' ? 'looks like DRIVE: heading for the spot behind the flock, away from the pen'
						: th.label === 'COLLECT' ? 'looks like COLLECT: heading for the far side of the furthest sheep'
						: 'neither: going somewhere the paper\'s dog wouldn\'t (' + (th.spread ? 'flock is spread out' : 'flock is tight') + ')';
					if (text !== lastLabel) { statusEl.textContent = text; lastLabel = text; }
				}
				if (tallyEl) {
					var tot = tally.DRIVE + tally.COLLECT + tally.neither || 1;
					tallyEl.textContent = 'this run: DRIVE ' + Math.round(tally.DRIVE / tot * 100) + '% · COLLECT ' + Math.round(tally.COLLECT / tot * 100) + '% · neither ' + Math.round(tally.neither / tot * 100) + '% · ' + sim.pennedCount + '/' + sim.sheep.length + ' penned · ' + (sim.ticks / SD.TICKS_PER_SEC).toFixed(1) + 's';
				}
			} else if (sim.state === 'done' && statusEl && lastLabel !== 'done') {
				statusEl.textContent = 'DONE: every sheep is in the pen in ' + (sim.ticks / SD.TICKS_PER_SEC).toFixed(1) + 's'; lastLabel = 'done';
			}
		}
		return { update: update, reset: reset, setStatus: function (t) { if (statusEl) statusEl.textContent = t; } };
	}

	function mountThoughts(root) {
		var level = root.dataset.robotThoughts || 'paper', brainName = root.dataset.brain || 'open';
		var canvas = root.querySelector('canvas.robot-field'), ctx = canvas.getContext('2d');
		var q = function (sel) { return root.querySelector(sel); };
		var workEl = q('[data-role="work"]');
		var panel = makePanel(root);
		var sim = new SD.Sim(level), px = 1, started = false;
		var genome = validGenome(EVOLVED[brainName]) ? Float64Array.from(EVOLVED[brainName]) : null;
		sim.reset(11);


		function resize() {
			var cssW = canvas.parentElement.clientWidth || 600, cssH = cssW * (SD.H / SD.W);
			var dpr = Math.min(2, window.devicePixelRatio || 1);
			canvas.style.height = cssH + 'px';
			canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
			px = canvas.width / SD.W;
		}
		function start() {
			if (!genome) { panel.setStatus('no evolved dog available'); return; }
			sim = new SD.Sim(level); sim.reset((Math.random() * 1e9) >>> 0);
			sim.brain = makeBrain(genome);
			panel.reset();
			sim.start('brain', 'The robot collie');
			started = true;
		}
		root.querySelectorAll('[data-action]').forEach(function (b) {
			b.addEventListener('click', function () { if (b.dataset.action === 'new') start(); });
		});
		var visible = true;
		if ('IntersectionObserver' in window) new IntersectionObserver(function (en) {
			visible = en[0].isIntersecting;
			if (visible && !started) start();
		}, { threshold: 0.3 }).observe(root);

		function frame() {
			if (!document.body.contains(root)) return;
			if (visible) {
				if (sim.state === 'running') sim.step();
				SD.draw(ctx, sim, px, !workEl || workEl.checked);
				panel.update(sim);
			}
			requestAnimationFrame(frame);
		}
		resize();
		if ('ResizeObserver' in window) new ResizeObserver(resize).observe(root); else window.addEventListener('resize', resize);
		requestAnimationFrame(frame);
	}

	// ---- Page: two dogs thinking, same flock ------------------------------------------------
	function mountCompare(root) {
		var q = function (sel) { return root.querySelector(sel); };
		var levelEl = q('[data-role="level"]'), rivalEl = q('[data-role="rival"]'), workEl = q('[data-role="work"]');
		var cols = root.querySelectorAll('.robot-compare-col');
		var sides = [];
		for (var i = 0; i < cols.length; i++) {
			var c = cols[i];
			sides.push({ root: c, name: c.dataset.dog, canvas: c.querySelector('canvas.robot-field'), ctx: c.querySelector('canvas.robot-field').getContext('2d'), panel: makePanel(c), titleEl: c.querySelector('[data-role="dog-name"]'), sim: null, px: 1 });
		}
		var started = false;
		function dogOf(side) { return side.name === 'rival' ? (rivalEl ? rivalEl.value : 'open') : (side.name || 'best'); }
		function nameOf(key) { return key === 'best' ? 'the best dog' : key === 'farm' ? 'the retrained dog' : 'the open-field dog'; }
		function level() { return levelEl ? levelEl.value : (root.dataset.robotCompare || 'awkward'); }
		function resize() {
			sides.forEach(function (sd) {
				var cssW = sd.root.clientWidth || 300, cssH = cssW * (SD.H / SD.W), dpr = Math.min(2, window.devicePixelRatio || 1);
				sd.canvas.style.height = cssH + 'px';
				sd.canvas.width = Math.round(cssW * dpr); sd.canvas.height = Math.round(cssH * dpr);
				sd.px = sd.canvas.width / SD.W;
			});
		}
		function start() {
			var seed = (Math.random() * 1e9) >>> 0, lvl = level();
			sides.forEach(function (sd) {
				var key = dogOf(sd), g = validGenome(EVOLVED[key]) ? Float64Array.from(EVOLVED[key]) : null;
				sd.sim = new SD.Sim(lvl); sd.sim.rand = SD.mulberry32(seed + 1); sd.sim.reset(seed);
				if (sd.titleEl) sd.titleEl.textContent = nameOf(key);
				sd.panel.reset();
				if (!g) { sd.panel.setStatus('no evolved dog available'); return; }
				sd.sim.brain = makeBrain(g);
				sd.sim.start('brain', nameOf(key).charAt(0).toUpperCase() + nameOf(key).slice(1));
			});
			started = true;
		}
		root.querySelectorAll('[data-action]').forEach(function (b) { b.addEventListener('click', function () { if (b.dataset.action === 'new') start(); }); });
		if (levelEl) levelEl.addEventListener('change', start);
		if (rivalEl) rivalEl.addEventListener('change', start);
		var visible = true;
		if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible && !started) start(); }, { threshold: 0.2 }).observe(root);
		function frame() {
			if (!document.body.contains(root)) return;
			if (visible && started) {
				sides.forEach(function (sd) {
					if (!sd.sim) return;
					if (sd.sim.state === 'running') sd.sim.step();
					SD.draw(sd.ctx, sd.sim, sd.px, !workEl || workEl.checked);
					sd.panel.update(sd.sim);
				});
			}
			requestAnimationFrame(frame);
		}
		resize();
		if ('ResizeObserver' in window) new ResizeObserver(resize).observe(root); else window.addEventListener('resize', resize);
		requestAnimationFrame(frame);
	}

	function mountAll() {
		document.querySelectorAll('[data-robot-collie]').forEach(function (r) { if (!r.dataset.ready) { r.dataset.ready = '1'; mountEvolve(r); } });
		document.querySelectorAll('[data-robot-thoughts]').forEach(function (r) { if (!r.dataset.ready) { r.dataset.ready = '1'; mountThoughts(r); } });
		document.querySelectorAll('[data-robot-compare]').forEach(function (r) { if (!r.dataset.ready) { r.dataset.ready = '1'; mountCompare(r); } });
	}
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll); else mountAll();
	document.addEventListener('astro:page-load', mountAll);
})();
