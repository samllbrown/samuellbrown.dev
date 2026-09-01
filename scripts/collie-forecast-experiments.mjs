/*
 * Can you tell early whether a training run will make a good dog?
 *
 * Runs many independent training runs of the robot collie under three
 * optimizers on the same budget, logs early signals at checkpoints, then asks
 * which signals predict the final dog's quality on held-out flocks.
 *
 *   node scripts/collie-forecast-experiments.mjs runs <outdir> [--opt ga,hill,es] [--runs 100] [--gens 120] [--pop 32] [--flocks 2] [--maxticks 2400] [--level paper]
 *   node scripts/collie-forecast-experiments.mjs analyse <outdir>
 *   node scripts/collie-forecast-experiments.mjs demo <outdir>
 *
 * "runs" writes outdir/runs-<opt>.json (appending run by run, so it can be
 * watched and survives interruption). "analyse" writes outdir/analysis.json
 * plus SVG charts. "demo" writes a compact run library for the browser demo.
 *
 * Budget parity: every optimizer gets the same evaluation budget per
 * generation (64 = pop 32 x 2 flocks) and the same flock schedule
 * (seed 1000 + gen*flocks + i, independent of the run seed, so every run of
 * every optimizer meets the same sheep). Final champions are re-tested on 30
 * held-out flocks (seeds 50000+); behavioural probes use 3 more (seeds 40000+).
 */
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { cpus } from 'node:os';
import { performance } from 'node:perf_hooks';

await import('../public/sim/sheepdog.js');
await import('../public/sim/robot-collie.js');
const SD = globalThis.__Sheepdog, B = globalThis.__RobotCollie;

// ---- worker side -------------------------------------------------------------------
if (!isMainThread) {
	parentPort.on('message', (msg) => {
		const out = msg.jobs.map((j) => {
			if (j.kind === 'probe') return probeOne(j);
			const r = B.evaluate(Float64Array.from(j.genome), j.level, j.seed, j.maxTicks);
			return { tag: j.tag, seed: j.seed, fitness: r.fitness, penned: r.penned, n: r.n, ticks: r.ticks, done: r.done };
		});
		parentPort.postMessage({ id: msg.id, results: out });
	});
}

/** One run of a brain on a flock, with a behavioural reading. */
function probeOne(j) {
	const sim = new SD.Sim(j.level);
	sim.rand = SD.mulberry32((j.seed * 7919 + 13) >>> 0);
	sim.reset(j.seed);
	sim.brain = B.makeBrain(Float64Array.from(j.genome));
	sim.start('brain');
	let behind = 0, near = 0, held = 0, speedSum = 0, samples = 0, d0 = null, dMin = Infinity;
	while (sim.state !== 'done' && sim.ticks < j.maxTicks) {
		sim.step();
		if (sim.ticks % 6 === 0) {
			B.features(sim);
			if (sim.gcm) {
				samples++;
				const ux = SD.TARGET.x - sim.gcm.x, uy = SD.TARGET.y - sim.gcm.y, ul = SD.len(ux, uy);
				if (d0 == null) d0 = ul;
				dMin = Math.min(dMin, ul);
				const rx = sim.dog.x - sim.gcm.x, ry = sim.dog.y - sim.gcm.y;
				if ((rx * ux + ry * uy) / ul < 0) behind++;
				let nd = Infinity;
				for (const s of sim.sheep) if (!s.penned) nd = Math.min(nd, SD.len(s.x - sim.dog.x, s.y - sim.dog.y));
				if (nd < 3 * SD.R_A) near++;
				if (sim.creeping) held++;
				if (sim.lastThought) speedSum += sim.lastThought.act.speed;
			}
		}
	}
	const n = sim.sheep.length, penned = sim.pennedCount;
	let dist = 0, loose = 0;
	for (const s of sim.sheep) if (!s.penned) { loose++; dist += SD.len(SD.TARGET.x - s.x, SD.TARGET.y - s.y) / SD.W; }
	const done = sim.state === 'done';
	const fitness = penned / n + (done ? 1 - sim.ticks / j.maxTicks : 0) + 0.3 * (loose ? 1 - dist / loose : 1);
	return {
		tag: j.tag, seed: j.seed, kind: 'probe', fitness, penned, n, done, ticks: sim.ticks,
		behind: samples ? behind / samples : 0, near: samples ? near / samples : 0, held: samples ? held / samples : 0,
		speed: samples ? speedSum / samples : 0,
		progress: d0 ? Math.max(0, (d0 - dMin) / d0) : 0, // how far the flock centre got towards the pen, best point of the run
	};
}

if (isMainThread) {

// ---- pool -------------------------------------------------------------------------------
const NW = Math.max(1, cpus().length - 1);
const workers = [], pending = new Map();
let nextId = 1;
for (let i = 0; i < NW; i++) {
	const w = new Worker(new URL(import.meta.url));
	w.on('message', (m) => { const p = pending.get(m.id); if (p) { pending.delete(m.id); p(m.results); } });
	workers.push(w);
}
function evalAll(jobs) {
	return new Promise((resolve) => {
		const chunks = workers.map(() => []);
		jobs.forEach((j, i) => chunks[i % NW].push(j));
		let results = [], left = 0;
		chunks.forEach((c, wi) => {
			if (!c.length) return;
			left++;
			const id = nextId++;
			pending.set(id, (r) => { results = results.concat(r); if (--left === 0) resolve(results); });
			workers[wi].postMessage({ id, jobs: c.map((j) => ({ ...j, genome: Array.from(j.genome) })) });
		});
		if (left === 0) resolve(results);
	});
}

const [, , cmd = 'runs', OUT = 'scratch/collie-forecast', ...rest] = process.argv;
const opt = (name, def) => { const i = rest.indexOf('--' + name); return i >= 0 ? rest[i + 1] : def; };
mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(...a);
const t0 = performance.now();
const r3 = (x) => Math.round(x * 1000) / 1000;
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);

const LEVEL = opt('level', 'paper');
const GENS = +opt('gens', 120), POP = +opt('pop', 32), FLOCKS = +opt('flocks', 2), MAXT = +opt('maxticks', 2400);
const CHECKPOINTS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100, 120].filter((g) => g <= GENS);
if (CHECKPOINTS[CHECKPOINTS.length - 1] !== GENS) CHECKPOINTS.push(GENS);
const PROBE_FLOCKS = [0, 1, 2].map((i) => 40000 + i);       // behavioural probes, never trained on
const HELDOUT = Array.from({ length: 30 }, (_, i) => 50000 + i); // final honest test, never trained on
// Demo checkpoints: generations whose champion genome we keep for the browser.
const DEMO_GENS = [5, 15, 30, GENS];

/** The same flock schedule for every optimizer and every run (matches B.Evolver.flocksFor). */
function flocksFor(gen) {
	return Array.from({ length: FLOCKS }, (_, i) => ({ level: LEVEL, seed: 1000 + gen * FLOCKS + i }));
}
function evalOn(genomes, flocks) {
	// -> per-genome mean fitness and pennedFrac over the flocks, in genome order.
	const jobs = [];
	genomes.forEach((g, gi) => flocks.forEach((f) => jobs.push({ kind: 'eval', tag: gi, genome: g, level: f.level, seed: f.seed, maxTicks: MAXT })));
	return evalAll(jobs).then((res) => {
		const fit = genomes.map(() => 0), pf = genomes.map(() => 0);
		for (const r of res) { fit[r.tag] += r.fitness / flocks.length; pf[r.tag] += r.penned / r.n / flocks.length; }
		return { fit, pf };
	});
}
async function probe(genome, gen) {
	const res = await evalAll(PROBE_FLOCKS.map((seed) => ({ kind: 'probe', tag: 0, genome, level: LEVEL, seed, maxTicks: MAXT })));
	const m = (k) => r3(mean(res.map((r) => r[k])));
	return { gen, pFit: m('fitness'), pPenned: r3(mean(res.map((r) => r.penned / r.n))), pBehind: m('behind'), pNear: m('near'), pHeld: m('held'), pSpeed: m('speed'), pProgress: m('progress') };
}
function diversity(pop, rng) {
	// Mean pairwise distance per weight over sampled pairs.
	let d = 0, k = 0;
	for (let t = 0; t < 30; t++) {
		const a = pop[Math.floor(rng() * pop.length)], b = pop[Math.floor(rng() * pop.length)];
		if (a === b) continue;
		let s = 0;
		for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) * (a[i] - b[i]);
		d += Math.sqrt(s / a.length); k++;
	}
	return k ? d / k : 0;
}
const std = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) * (x - m)))); };
function randn(rng) { const u = 1 - rng(), v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// ---- the three optimizers ----------------------------------------------------------
// Each returns { checkpoints, evalsPerGen, final } and calls onGen(gen) for progress.
// All use the same budget shape: ~POP*FLOCKS evaluations per generation.

async function runGA(seed) {
	const ev = new B.Evolver({ levels: [LEVEL], popSize: POP, flocksPerGen: FLOCKS, maxTicks: MAXT, seed });
	const rng = SD.mulberry32(seed ^ 0x9e3779b9);
	const checkpoints = [];
	let evals = 0;
	for (let g = 0; g < GENS; g++) {
		const res = await evalAll(ev.jobs().map((j) => ({ kind: 'eval', tag: j.dog, genome: j.genome, level: j.level, seed: j.seed, maxTicks: MAXT })));
		evals += res.length;
		const div = r3(diversity(ev.pop, rng));
		const perDog = new Map();
		for (const r of res) perDog.set(r.tag, (perDog.get(r.tag) || 0) + r.fitness / FLOCKS);
		const e = ev.advance(res.map((r) => ({ dog: r.tag, fitness: r.fitness, penned: r.penned, n: r.n })));
		if (CHECKPOINTS.includes(g + 1)) {
			const cp = { gen: g + 1, evals, best: r3(e.best), mean: r3(e.mean), fitStd: r3(std([...perDog.values()])), divers: div, ...(await probe(e.champion, g + 1)) };
			if (DEMO_GENS.includes(g + 1)) cp.genome = Array.from(e.champion).map(r3);
			checkpoints.push(cp);
		}
	}
	return { checkpoints, evals, final: Array.from(ev.history[ev.history.length - 1].champion) };
}

async function runHILL(seed) {
	// (1+31): one incumbent, 31 mutants per generation, parent re-tested on the
	// same flocks as its children so the comparison is fair.
	const rng = SD.mulberry32(seed);
	let theta = B.randomGenome(rng);
	const mutRate = 0.1, mutSigma = 0.3;
	const checkpoints = [];
	let evals = 0, bestNow = -Infinity, meanNow = 0;
	for (let g = 0; g < GENS; g++) {
		const cands = [theta];
		for (let m = 1; m < POP; m++) {
			const c = Float64Array.from(theta);
			for (let q = 0; q < c.length; q++) if (rng() < mutRate) c[q] += randn(rng) * mutSigma;
			cands.push(c);
		}
		const { fit } = await evalOn(cands, flocksFor(g));
		evals += cands.length * FLOCKS;
		let bi = 0;
		for (let i = 1; i < cands.length; i++) if (fit[i] > fit[bi]) bi = i;
		theta = cands[bi];
		bestNow = fit[bi]; meanNow = mean(fit);
		if (CHECKPOINTS.includes(g + 1)) {
			const cp = { gen: g + 1, evals, best: r3(bestNow), mean: r3(meanNow), fitStd: r3(std(fit)), divers: 0, ...(await probe(theta, g + 1)) };
			if (DEMO_GENS.includes(g + 1)) cp.genome = Array.from(theta).map(r3);
			checkpoints.push(cp);
		}
	}
	return { checkpoints, evals, final: Array.from(theta) };
}

async function runES(seed) {
	// OpenAI-style evolution strategy: antithetic Gaussian perturbations,
	// rank-shaped utilities, a step along the estimated gradient every
	// generation. The "smooth" optimizer: one dog, nudged, never replaced.
	const rng = SD.mulberry32(seed);
	let theta = B.randomGenome(rng);
	const NPAIR = Math.floor((POP - 2) / 2), SIGMA = +opt('essigma', 0.15), ALPHA = +opt('esalpha', 0.35);
	const checkpoints = [];
	let evals = 0;
	for (let g = 0; g < GENS; g++) {
		const eps = [];
		for (let p = 0; p < NPAIR; p++) {
			const e = new Float64Array(theta.length);
			for (let q = 0; q < e.length; q++) e[q] = randn(rng);
			eps.push(e);
		}
		const cands = [theta];
		for (const e of eps) {
			const a = Float64Array.from(theta), b = Float64Array.from(theta);
			for (let q = 0; q < e.length; q++) { a[q] += SIGMA * e[q]; b[q] -= SIGMA * e[q]; }
			cands.push(a, b);
		}
		const { fit } = await evalOn(cands, flocksFor(g));
		evals += cands.length * FLOCKS;
		// Rank-shaped utilities over the perturbations (not theta), zero-sum.
		const scores = fit.slice(1);
		const order = scores.map((f, i) => i).sort((x, y) => scores[x] - scores[y]);
		const util = new Array(scores.length);
		order.forEach((idx, rank) => { util[idx] = scores.length === 1 ? 0 : rank / (scores.length - 1) - 0.5; });
		const grad = new Float64Array(theta.length);
		for (let p = 0; p < NPAIR; p++) {
			const w = util[2 * p] - util[2 * p + 1]; // antithetic pair: +eps at 2p, -eps at 2p+1
			for (let q = 0; q < grad.length; q++) grad[q] += w * eps[p][q];
		}
		for (let q = 0; q < theta.length; q++) theta[q] += ALPHA / (NPAIR * SIGMA) * grad[q] * SIGMA; // = ALPHA/NPAIR * sum w*eps
		if (CHECKPOINTS.includes(g + 1)) {
			const cp = { gen: g + 1, evals, best: r3(Math.max(...fit)), mean: r3(mean(fit)), fitStd: r3(std(fit)), divers: 0, thetaFit: r3(fit[0]), ...(await probe(theta, g + 1)) };
			if (DEMO_GENS.includes(g + 1)) cp.genome = Array.from(theta).map(r3);
			checkpoints.push(cp);
		}
	}
	return { checkpoints, evals, final: Array.from(theta) };
}

const OPTIMIZERS = { ga: runGA, hill: runHILL, es: runES };

// ---- runs --------------------------------------------------------------------------
if (cmd === 'runs' || cmd === 'pilot') {
	const OPTS = opt('opt', 'ga,hill,es').split(',');
	const RUNS = +opt('runs', cmd === 'pilot' ? 6 : 100);
	log(`${RUNS} runs of ${OPTS.join(', ')} on "${LEVEL}": ${GENS} generations, ~${POP * FLOCKS} evaluations each, ${NW} workers.`);
	for (const name of OPTS) {
		const file = `${OUT}/runs-${name}.json`;
		const runs = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
		for (let run = runs.length + 1; run <= RUNS; run++) {
			const tr = performance.now();
			const seed = run * 7907 + 11;
			const r = await OPTIMIZERS[name](seed);
			// The honest bit: the run's final dog on 30 flocks it has never seen.
			const g = Float64Array.from(r.final);
			const res = await evalAll(HELDOUT.map((s) => ({ kind: 'eval', tag: 0, genome: g, level: LEVEL, seed: s, maxTicks: MAXT })));
			const finalFit = r3(mean(res.map((x) => x.fitness)));
			const done = res.filter((x) => x.done).length;
			runs.push({
				run, seed, opt: name, finalFit, finalDone: done, finalPenned: r3(mean(res.map((x) => x.penned / x.n))),
				finalMedianTicks: median(res.filter((x) => x.done).map((x) => x.ticks)),
				evals: r.evals, seconds: r3((performance.now() - tr) / 1000),
				checkpoints: r.checkpoints, final: Array.from(g).map(r3),
			});
			writeFileSync(file, JSON.stringify(runs));
			log(`${name} run ${run}/${RUNS}: final ${finalFit.toFixed(2)} on held-out (${done}/30 all penned), ${((performance.now() - tr) / 1000).toFixed(0)}s`);
		}
	}
	log(`\nDone in ${((performance.now() - t0) / 60000).toFixed(1)} min.`);
}

// ---- analyse -----------------------------------------------------------------------
function spearman(xs, ys) {
	const rank = (a) => {
		const idx = a.map((v, i) => i).sort((p, q) => a[p] - a[q]);
		const r = new Array(a.length);
		for (let i = 0; i < idx.length;) {
			let j = i;
			while (j + 1 < idx.length && a[idx[j + 1]] === a[idx[i]]) j++;
			const avg = (i + j) / 2;
			for (let k = i; k <= j; k++) r[idx[k]] = avg;
			i = j + 1;
		}
		return r;
	};
	const rx = rank(xs), ry = rank(ys);
	const mx = mean(rx), my = mean(ry);
	let num = 0, dx = 0, dy = 0;
	for (let i = 0; i < xs.length; i++) { num += (rx[i] - mx) * (ry[i] - my); dx += (rx[i] - mx) ** 2; dy += (ry[i] - my) ** 2; }
	return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}

if (cmd === 'analyse') {
	const A = { level: LEVEL, gens: GENS, signals: {}, opts: {} };
	// Signals: value at the checkpoint (or derived), higher should mean better.
	const SIGNALS = {
		best: (cps, i) => cps[i].best,
		bestSoFar: (cps, i) => Math.max(...cps.slice(0, i + 1).map((c) => c.best)),
		mean: (cps, i) => cps[i].mean,
		slope: (cps, i) => (i === 0 ? 0 : (cps[i].mean - cps[i - 1].mean) / (cps[i].gen - cps[i - 1].gen)),
		fitStd: (cps, i) => cps[i].fitStd,
		divers: (cps, i) => cps[i].divers,
		pFit: (cps, i) => cps[i].pFit,
		pPenned: (cps, i) => cps[i].pPenned,
		pBehind: (cps, i) => cps[i].pBehind,
		pNear: (cps, i) => -cps[i].pNear,   // hugging sheep is bad manners; sign so that higher = better
		pProgress: (cps, i) => cps[i].pProgress,
		pSpeed: (cps, i) => cps[i].pSpeed,
	};
	A.signalNames = Object.keys(SIGNALS);
	for (const name of ['ga', 'hill', 'es']) {
		const file = `${OUT}/runs-${name}.json`;
		if (!existsSync(file)) continue;
		const runs = JSON.parse(readFileSync(file, 'utf8'));
		const finals = runs.map((r) => r.finalFit);
		const gens = runs[0].checkpoints.map((c) => c.gen);
		const O = { runs: runs.length, finals: { mean: r3(mean(finals)), min: r3(Math.min(...finals)), max: r3(Math.max(...finals)), std: r3(std(finals)), doneAll: runs.filter((r) => r.finalDone === 30).length } };
		// Rank correlation of each signal at each checkpoint with the final held-out fitness.
		O.corr = {};
		for (const [sig, fn] of Object.entries(SIGNALS)) {
			O.corr[sig] = gens.map((g, i) => r3(spearman(runs.map((r) => fn(r.checkpoints, i)), finals)));
		}
		O.gens = gens;
		// Pick the puppy: draw four runs at random (as in the game), back the one
		// this signal ranks top at generation g. How often is that the one that
		// ends best of the four? Guessing gets 25%. Ties are broken at random.
		O.pick4 = {};
		{
			const rng4 = SD.mulberry32(99), T4 = 4000;
			const draws = Array.from({ length: T4 }, () => { const p = []; while (p.length < 4) { const x = Math.floor(rng4() * runs.length); if (!p.includes(x)) p.push(x); } return p; });
			for (const [sig, fn] of Object.entries(SIGNALS)) {
				const rngT = SD.mulberry32(7);
				O.pick4[sig] = gens.map((g, i) => {
					let hit = 0;
					for (const p of draws) {
						const vals = p.map((r) => fn(runs[r].checkpoints, i));
						const top = Math.max(...vals);
						const tied = p.filter((r, j) => vals[j] === top);
						const pick = tied[Math.floor(rngT() * tied.length)];
						const fin = p.map((r) => finals[r]);
						if (finals[pick] === Math.max(...fin)) hit++;
					}
					return r3(hit / T4);
				});
			}
		}
		// Keep-or-rehome at equal compute. Budget = K full runs (K*GENS generations
		// of work). Policy: start 2K puppies, rehome at generation g down to the
		// M = floor((K*GENS - 2K*g)/(GENS - g)) that the remaining budget can
		// afford (never over budget; "budget" records the fraction actually used),
		// keep the top M by the signal, and take the best survivor's final dog.
		// Baseline: best of K full runs. "random" rehomes at random, as a control.
		// Monte Carlo over run subsets.
		const rng = SD.mulberry32(1234);
		O.cull = {};
		const K = 4, TRIALS = 4000;
		const survivors = (g) => Math.floor(K * (GENS - 2 * g) / (GENS - g));
		const cullGens = runs.length >= 4 * K ? gens.filter((g) => g <= GENS / 2 && survivors(g) >= 1) : [];
		for (const sig of ['bestSoFar', 'best', 'pFit', 'pBehind', 'pProgress', 'random']) {
			const fn = SIGNALS[sig];
			O.cull[sig] = cullGens.map((g) => {
				const i = gens.indexOf(g);
				const M = survivors(g);
				const budget = r3((2 * K * g + M * (GENS - g)) / (K * GENS));
				let win = 0, base = 0, culled = 0;
				for (let t = 0; t < TRIALS; t++) {
					const picks = [];
					while (picks.length < 2 * K) { const p = Math.floor(rng() * runs.length); if (!picks.includes(p)) picks.push(p); }
					const baseBest = Math.max(...picks.slice(0, K).map((p) => finals[p]));
					const ranked = [...picks];
					if (fn) ranked.sort((a, b) => fn(runs[b].checkpoints, i) - fn(runs[a].checkpoints, i));
					else for (let a = ranked.length - 1; a > 0; a--) { const b = Math.floor(rng() * (a + 1)); [ranked[a], ranked[b]] = [ranked[b], ranked[a]]; }
					const cullBest = Math.max(...ranked.slice(0, M).map((p) => finals[p]));
					base += baseBest; culled += cullBest;
					if (cullBest > baseBest) win++; else if (cullBest === baseBest) win += 0.5;
				}
				return { gen: g, kept: M, budget, cullWinRate: r3(win / TRIALS), meanBase: r3(base / TRIALS), meanCulled: r3(culled / TRIALS) };
			});
		}
		A.opts[name] = O;
		log(`\n${name}: ${runs.length} runs, final held-out fitness ${O.finals.min}–${O.finals.max} (mean ${O.finals.mean} ± ${O.finals.std}), ${O.finals.doneAll} runs' dogs pen all 30/30`);
		log('  corr with final, by generation (' + gens.slice(0, 10).join(', ') + '…):');
		for (const sig of A.signalNames) log(`    ${sig.padEnd(10)} ${O.corr[sig].slice(0, 10).map((c) => String(c).padStart(6)).join(' ')}`);
		log('  best-of-four hit rate by generation (guessing = 0.25):');
		for (const sig of A.signalNames) log(`    ${sig.padEnd(10)} ${O.pick4[sig].slice(0, 10).map((c) => String(c).padStart(6)).join(' ')}`);
		for (const [sig, rows] of Object.entries(O.cull)) log(`  cull by ${sig.padEnd(10)} ` + rows.map((r) => `g${r.gen}:${r.cullWinRate}`).join(' '));
	}
	writeFileSync(`${OUT}/analysis.json`, JSON.stringify(A, null, 1));
	writeCharts(A);
	log(`\nWritten to ${OUT}/analysis.json in ${((performance.now() - t0) / 1000).toFixed(0)}s.`);
}

// ---- charts (inline SVG, same style as the site) -----------------------------------
function writeCharts(A) {
	const C = { a: '#a93fe0', b: '#c97c12', c: '#35a066', d: '#4f9cf9', e: '#e05c7a', text: '#8490b5', axis: 'rgba(255,255,255,0.14)' };
	const attr = (o) => JSON.stringify(o).replace(/&/g, '&amp;').replace(/'/g, '&#39;');
	function chart({ w = 640, h = 280, series, xmin, xmax, ymin, ymax, xticks, yticks, xlabel, ylabel, title, hlines = [], xname = 'x', yfmt = 'num' }) {
		const pad = { l: 44, r: 16, t: 16, b: 40 };
		const X = (v) => pad.l + (v - xmin) / (xmax - xmin) * (w - pad.l - pad.r);
		const Y = (v) => h - pad.b - (v - ymin) / (ymax - ymin) * (h - pad.t - pad.b);
		// The series go on the element too, so the page script can show a crosshair with every line's value.
		const lines = { w, h, pad, xmin, xmax, ymin, ymax, xname, yfmt, series: series.filter((se) => !se.silent).map((se) => ({ name: se.name, color: se.color, points: se.points.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 1000) / 1000]) })) };
		let s = `<svg class="robot-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12" data-lines='${attr(lines)}'>\n<title>${title}</title>\n`;
		for (const tk of yticks) s += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(tk).toFixed(1)}" y2="${Y(tk).toFixed(1)}" stroke="${C.axis}"/><text x="${pad.l - 8}" y="${Y(tk).toFixed(1)}" fill="${C.text}" text-anchor="end" dominant-baseline="middle">${tk}</text>\n`;
		for (const tk of xticks) s += `<text x="${X(tk).toFixed(1)}" y="${h - pad.b + 18}" fill="${C.text}" text-anchor="middle">${tk}</text>\n`;
		s += `<path d="M${pad.l} ${pad.t} V${h - pad.b} H${w - pad.r}" fill="none" stroke="${C.axis}"/>\n`;
		for (const hl of hlines) s += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(hl.y).toFixed(1)}" y2="${Y(hl.y).toFixed(1)}" stroke="rgba(255,255,255,0.35)" stroke-dasharray="3 4"/>\n`;
		if (xlabel) s += `<text x="${w - pad.r}" y="${h - 6}" fill="${C.text}" text-anchor="end">${xlabel}</text>\n`;
		if (ylabel) s += `<text transform="translate(12 ${pad.t}) rotate(-90)" fill="${C.text}" text-anchor="end">${ylabel}</text>\n`;
		for (const se of series) {
			const d = se.points.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`).join(' ');
			s += `<path d="${d}" fill="none" stroke="${se.color}" stroke-width="${se.width || 2}" stroke-opacity="${se.opacity == null ? 1 : se.opacity}"${se.dash ? ` stroke-dasharray="${se.dash}"` : ''} stroke-linejoin="round"/>\n`;
		}
		return s + '</svg>\n';
	}
	const legend = (items) => `<div class="robot-legend">${items.map((i) => `<span><i style="background:${i.color}"></i>${i.name}</span>`).join('')}</div>\n`;
	/** Stacked bars: groups = [{ label, values: { key: n } }], stacks = [[key, color]] bottom to top. */
	function bars({ w = 640, h = 280, title, groups, stacks, ymax, yticks, xlabel, ylabel, tip }) {
		const pad = { l: 44, r: 16, t: 16, b: 40 };
		const slot = (w - pad.l - pad.r) / groups.length, bw = slot * 0.66;
		const Y = (v) => h - pad.b - v / ymax * (h - pad.t - pad.b);
		let s = `<svg class="robot-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12">\n<title>${title}</title>\n`;
		for (const tk of yticks) s += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(tk).toFixed(1)}" y2="${Y(tk).toFixed(1)}" stroke="${C.axis}"/><text x="${pad.l - 8}" y="${Y(tk).toFixed(1)}" fill="${C.text}" text-anchor="end" dominant-baseline="middle">${tk}</text>\n`;
		s += `<path d="M${pad.l} ${pad.t} V${h - pad.b} H${w - pad.r}" fill="none" stroke="${C.axis}"/>\n`;
		groups.forEach((g, i) => {
			const x = pad.l + slot * i + (slot - bw) / 2;
			let base = 0;
			for (const [key, color] of stacks) {
				const v = g.values[key] || 0;
				if (v) s += `<rect x="${x.toFixed(1)}" y="${Y(base + v).toFixed(1)}" width="${bw.toFixed(1)}" height="${(Y(base) - Y(base + v)).toFixed(1)}" fill="${color}" data-tip="${tip ? tip(g, key, v) : `${g.label}: ${v}`}"/>\n`;
				base += v;
			}
			s += `<text x="${(x + bw / 2).toFixed(1)}" y="${h - pad.b + 18}" fill="${C.text}" text-anchor="middle">${g.label}</text>\n`;
		});
		if (xlabel) s += `<text x="${w - pad.r}" y="${h - 6}" fill="${C.text}" text-anchor="end">${xlabel}</text>\n`;
		if (ylabel) s += `<text transform="translate(12 ${pad.t}) rotate(-90)" fill="${C.text}" text-anchor="end">${ylabel}</text>\n`;
		return s + '</svg>\n';
	}

	// D. When the jump came: generation of the first penning dog in each GA run, by how the run ended.
	if (A.opts.ga) {
		const runs = JSON.parse(readFileSync(`${OUT}/runs-ga.json`, 'utf8'));
		const finals = runs.map((r) => r.finalFit);
		const sorted = [...finals].sort((a, b) => a - b);
		const q3 = sorted[Math.floor(sorted.length * 0.75)], q1 = sorted[Math.floor(sorted.length * 0.25)];
		const bins = [[1, 5, '1–5'], [6, 10, '6–10'], [11, 15, '11–15'], [16, 20, '16–20'], [21, 30, '21–30'], [31, 50, '31–50'], [51, 80, '51–80'], [81, GENS, `81–${GENS}`], [null, null, 'never']];
		const jump = (r) => { const c = r.checkpoints.find((c) => c.best >= 1); return c ? c.gen : null; };
		const grp = (r) => (r.finalFit >= q3 ? 'top' : r.finalFit <= q1 ? 'bottom' : 'mid');
		const groups = bins.map(([a, b, label]) => {
			const values = { top: 0, mid: 0, bottom: 0 };
			for (const r of runs) { const j = jump(r); if (a === null ? j === null : j >= a && j <= b) values[grp(r)]++; }
			return { label, values };
		});
		const desc = { top: 'ended in the top quarter', mid: 'ended in the middle', bottom: 'ended in the bottom quarter' };
		const tip = (g, key, v) => { const total = g.values.top + g.values.mid + g.values.bottom; return g.label === 'never' ? `${v} of the ${total} runs that never had a penning dog ${desc[key]}` : `${v} of the ${total} runs whose first penning dog came in generations ${g.label} ${desc[key]}`; };
		const svg = bars({ title: 'Generation in which each evolution run first had a dog pen a whole flock, coloured by how the run ended', groups, stacks: [['bottom', C.b], ['mid', 'rgba(233,230,221,0.35)'], ['top', C.a]], ymax: 20, yticks: [0, 5, 10, 15, 20], xlabel: 'generation of the first penning dog', ylabel: 'runs', tip });
		writeFileSync(`${OUT}/chart-jumps.html`, svg + legend([{ name: 'ended in the top quarter', color: C.a }, { name: 'the middle', color: 'rgba(233,230,221,0.5)' }, { name: 'ended in the bottom quarter', color: C.b }]));
	}

	// E. Keep or rehome: how often triage by the score so far beats four full runs, by rehoming generation, per optimizer.
	{
		const names = { ga: 'evolution', hill: 'hill climbing', es: 'evolution strategy' };
		const cols = { ga: C.a, hill: C.b, es: C.c };
		const series = [];
		for (const [k, O] of Object.entries(A.opts)) if (O.cull.bestSoFar && O.cull.bestSoFar.length) series.push({ name: names[k], color: cols[k], points: O.cull.bestSoFar.map((r) => [r.gen, r.cullWinRate * 100]) });
		const rnd = (A.opts.ga || A.opts.hill || A.opts.es).cull.random;
		if (rnd && rnd.length) series.push({ name: 'rehome at random', color: 'rgba(233,230,221,0.6)', dash: '4 4', points: rnd.map((r) => [r.gen, r.cullWinRate * 100]) });
		const svg = chart({ title: 'How often triage by the score so far beats four full runs at the same compute, by the generation you rehome at', series, xmin: 0, xmax: 50, ymin: 0, ymax: 100, xticks: [0, 10, 20, 30, 40, 50], yticks: [0, 25, 50, 75, 100], xlabel: 'generation you rehome at', ylabel: 'triage wins (%)', hlines: [{ y: 50 }], xname: 'rehome at generation', yfmt: 'pct' });
		writeFileSync(`${OUT}/chart-cull.html`, svg + legend(series.map((se) => ({ name: se.name, color: se.color }))));
	}

	// A. The lottery: every run's final held-out score, sorted, per optimizer.
	{
		const names = { ga: 'evolution (the GA)', hill: 'hill climbing', es: 'evolution strategy' };
		const cols = { ga: C.a, hill: C.b, es: C.c };
		const series = [];
		let n = 0;
		for (const [k, O] of Object.entries(A.opts)) {
			const file = `${OUT}/runs-${k}.json`;
			const runs = JSON.parse(readFileSync(file, 'utf8'));
			const finals = runs.map((r) => r.finalFit).sort((a, b) => a - b);
			n = Math.max(n, finals.length);
			series.push({ name: names[k], color: cols[k], points: finals.map((f, i) => [(i + 1) / finals.length * 100, f]) });
		}
		const svg = chart({ title: 'Final score on thirty unseen flocks, every run sorted worst to best, per optimizer', series, xmin: 0, xmax: 100, ymin: 0, ymax: 2.3, xticks: [0, 25, 50, 75, 100], yticks: [0, 1, 2], xlabel: 'runs, worst to best (%)', ylabel: 'final score (1 = every sheep in)', hlines: [{ y: 1 }], xname: 'percentile' });
		writeFileSync(`${OUT}/chart-lottery.html`, svg + legend(Object.entries(A.opts).map(([k]) => ({ name: names[k], color: cols[k] }))));
	}

	// B. Spaghetti: every GA run's best score by generation, coloured by how it ended.
	if (A.opts.ga) {
		const runs = JSON.parse(readFileSync(`${OUT}/runs-ga.json`, 'utf8'));
		const finals = runs.map((r) => r.finalFit);
		const sorted = [...finals].sort((a, b) => a - b);
		const q3 = sorted[Math.floor(sorted.length * 0.75)], q1 = sorted[Math.floor(sorted.length * 0.25)];
		const series = runs.map((r) => ({
			name: `run ${r.run} (final ${r.finalFit})`,
			color: r.finalFit >= q3 ? C.a : r.finalFit <= q1 ? C.b : 'rgba(233,230,221,0.35)',
			opacity: r.finalFit >= q3 || r.finalFit <= q1 ? 0.75 : 0.5, width: 1.4,
			points: r.checkpoints.map((c) => [c.gen, c.best]),
		}));
		series.sort((a, b) => (a.color === 'rgba(233,230,221,0.35)' ? -1 : 1) - (b.color === 'rgba(233,230,221,0.35)' ? -1 : 1));
		const svg = chart({ title: 'Best score by generation for every evolution run, coloured by how the run ended', series, xmin: 0, xmax: A.gens, ymin: 0, ymax: 2.3, xticks: [0, 30, 60, 90, 120].filter((t) => t <= A.gens), yticks: [0, 1, 2], xlabel: 'generation', ylabel: 'score (1 = every sheep in)', hlines: [{ y: 1 }] });
		writeFileSync(`${OUT}/chart-spaghetti.html`, svg + legend([{ name: 'ended in the top quarter', color: C.a }, { name: 'ended in the bottom quarter', color: C.b }, { name: 'the middle', color: 'rgba(233,230,221,0.5)' }]));
	}

	// C. Predictability: correlation of each signal with the final score, by peek generation.
	for (const [k, O] of Object.entries(A.opts)) {
		const SIGS = [['bestSoFar', 'best score so far', C.a], ['best', 'best score this generation', 'rgba(233,230,221,0.85)'], ['pFit', 'score on probe flocks', C.b], ['pBehind', 'time behind the flock', C.c], ['pProgress', 'flock progress to pen', C.d], ['divers', 'genome diversity', C.e]];
		const use = SIGS.filter(([s]) => O.corr[s] && (s !== 'divers' || k === 'ga'));
		const series = use.map(([s, nm, col]) => ({ name: nm, color: col, points: O.gens.map((g, i) => [g, O.corr[s][i]]) }));
		const svg = chart({ title: `How well each early signal predicts the final dog (rank correlation), by the generation you peek at, for ${k}`, series, xmin: 0, xmax: A.gens, ymin: -0.4, ymax: 1, xticks: [0, 30, 60, 90, 120].filter((t) => t <= A.gens), yticks: [0, 0.5, 1], xlabel: 'generation you peek at', ylabel: 'rank correlation with final score', hlines: [{ y: 0 }], xname: 'generation' });
		writeFileSync(`${OUT}/chart-corr-${k}.html`, svg + legend(use.map(([s, nm, col]) => ({ name: nm, color: col }))));
	}
	log('Charts written.');
}

// ---- demo export -------------------------------------------------------------------
if (cmd === 'demo') {
	// A compact library for the browser. Every run keeps its history (for the
	// keep-or-rehome widget); a stratified two dozen GA runs also keep their
	// champion genomes at the demo generations (for the guessing game).
	const LIB = { level: LEVEL, gens: GENS, demoGens: DEMO_GENS, opts: {} };
	for (const name of ['ga', 'hill', 'es']) {
		const file = `${OUT}/runs-${name}.json`;
		if (!existsSync(file)) continue;
		const runs = JSON.parse(readFileSync(file, 'utf8'));
		const byFit = [...runs].sort((a, b) => a.finalFit - b.finalFit);
		const wanted = new Set();
		if (name === 'ga') for (let i = 0; i < Math.min(24, runs.length); i++) wanted.add(byFit[Math.floor(i * (runs.length - 1) / Math.max(1, Math.min(24, runs.length) - 1))].run);
		LIB.opts[name] = runs.map((r) => {
			const o = {
				run: r.run, finalFit: r.finalFit, finalDone: r.finalDone, finalMedianTicks: r.finalMedianTicks,
				history: r.checkpoints.map((c) => [c.gen, c.best, c.mean, c.pFit, c.pBehind, c.pNear, c.pProgress, c.pPenned]),
			};
			if (wanted.has(r.run)) o.genomes = Object.fromEntries(r.checkpoints.filter((c) => c.genome).map((c) => [c.gen, c.genome]));
			return o;
		});
	}
	const js = '/* Generated by scripts/collie-forecast-experiments.mjs demo. Run library for the forecast post. */\nglobalThis.__CollieForecastRuns = ' + JSON.stringify(LIB) + ';\n';
	writeFileSync('public/sim/collie-forecast-runs.js', js);
	log(`Written public/sim/collie-forecast-runs.js (${(js.length / 1024).toFixed(0)}KB).`);
}

for (const w of workers) w.terminate();
}
