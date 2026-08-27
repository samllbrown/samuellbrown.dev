/*
 * Evolution runs and benchmarks behind the "Making a robot collie" post.
 *
 *   node scripts/robot-collie-experiments.mjs evolve <outdir> --name open --levels paper [--gens 150] [--runs 3] [--pop 48] [--flocks 3] [--maxticks 2400]
 *   node scripts/robot-collie-experiments.mjs evolve <outdir> --name farm --levels minds,field --gens 150 --runs 3 --flocks 4 --maxticks 3600
 *   node scripts/robot-collie-experiments.mjs evolve <outdir> --name farm --levels minds,field --from <outdir>/champion-farm.json --gens 150   (carry on from a champion)
 *   node scripts/robot-collie-experiments.mjs bench <outdir>
 *
 * "evolve" runs a batch of dogs on the given levels a few times over with
 * different seeds, picks the champion honestly (re-tests the finalists on
 * flocks none of them has seen) and writes outdir/champion-<name>.json.
 * "bench" takes the open-field and farm champions and runs them against the
 * collie and the paper's dog on fresh flocks on every level, plus ablations
 * and a reading of what each dog is doing in the paper's terms.
 * Evaluations run on a pool of worker threads; everything is seeded.
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
			if (j.kind === 'run') return runOne(j);
			const r = B.evaluate(Float64Array.from(j.genome), j.level, j.seed, msg.maxTicks);
			return { dog: j.dog, seed: j.seed, level: j.level, fitness: r.fitness, penned: r.penned, n: r.n, ticks: r.ticks, done: r.done };
		});
		parentPort.postMessage({ id: msg.id, results: out });
	});
}

/** One timed run of a dog ('collie', or 'brain' with a genome) on a level and flock, with a reading of what it was doing. */
function runOne(j) {
	const level = j.level, sim = new SD.Sim(level);
	sim.rand = SD.mulberry32((j.seed * 7919 + 13) >>> 0);
	sim.reset(j.seed);
	let mode = 'collie';
	if (j.who === 'brain') { sim.brain = B.makeBrain(Float64Array.from(j.genome)); mode = 'brain'; }
	sim.start(mode);
	const maxTicks = j.maxTicks || 5400;
	const tally = { DRIVE: 0, COLLECT: 0, neither: 0 };
	let behind = 0, nearSheep = 0, samples = 0, held = 0, speedSum = 0;
	while (sim.state !== 'done' && sim.ticks < maxTicks) {
		sim.step();
		if (j.stats && sim.ticks % 6 === 0) {
			B.features(sim);
			if (sim.gcm) {
				samples++;
				const th = B.readThought(sim, sim.dog.hx, sim.dog.hy);
				tally[th.label]++;
				const ux = SD.TARGET.x - sim.gcm.x, uy = SD.TARGET.y - sim.gcm.y, ul = SD.len(ux, uy);
				const rx = sim.dog.x - sim.gcm.x, ry = sim.dog.y - sim.gcm.y;
				if ((rx * ux + ry * uy) / ul < 0) behind++;
				let nd = Infinity;
				for (const s of sim.sheep) if (!s.penned) nd = Math.min(nd, SD.len(s.x - sim.dog.x, s.y - sim.dog.y));
				if (nd < 3 * SD.R_A) nearSheep++;
				if (sim.creeping) held++;
				if (sim.lastThought) speedSum += sim.lastThought.act.speed;
			}
		}
	}
	return {
		who: j.who, level, seed: j.seed, done: sim.state === 'done', ticks: sim.ticks, penned: sim.pennedCount, n: sim.sheep.length,
		stats: j.stats ? { behind: behind / samples, nearSheep: nearSheep / samples, held: held / samples, drive: tally.DRIVE / samples, collect: tally.COLLECT / samples, neither: tally.neither / samples, speed: j.who === 'brain' ? speedSum / samples : null } : null,
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
function evalAll(jobs, maxTicks) {
	return new Promise((resolve) => {
		const chunks = workers.map(() => []);
		jobs.forEach((j, i) => chunks[i % NW].push(j));
		let results = [], left = 0;
		chunks.forEach((c, wi) => {
			if (!c.length) return;
			left++;
			const id = nextId++;
			pending.set(id, (r) => { results = results.concat(r); if (--left === 0) resolve(results); });
			workers[wi].postMessage({ id, maxTicks, jobs: c.map((j) => (j.genome ? { ...j, genome: Array.from(j.genome) } : j)) });
		});
		if (left === 0) resolve(results);
	});
}
function runMany(who, level, seeds, genome, stats = false, maxTicks = 5400) {
	// Results come back in worker-completion order; put them back in seed order so runs pair up flock by flock.
	return evalAll(seeds.map((seed) => ({ kind: 'run', who, level, seed, genome: genome ? Array.from(genome) : null, stats, maxTicks })), maxTicks)
		.then((res) => res.sort((a, b) => a.seed - b.seed));
}
async function fitnessOn(genome, flocks, maxTicks) {
	const res = await evalAll(flocks.map((f) => ({ dog: 0, genome, level: f.level, seed: f.seed })), maxTicks);
	return { fitness: res.reduce((a, x) => a + x.fitness, 0) / res.length, done: res.filter((x) => x.done).length, medianTicks: median(res.filter((x) => x.done).map((x) => x.ticks)), pennedFrac: res.reduce((a, x) => a + x.penned / x.n, 0) / res.length };
}

const [, , cmd = 'evolve', OUT = 'scratch/robot-collie', ...rest] = process.argv;
const opt = (name, def) => { const i = rest.indexOf('--' + name); return i >= 0 ? rest[i + 1] : def; };
mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(...a);
const t0 = performance.now();
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
const fmtT = (t) => (t == null ? '-' : (t / SD.TICKS_PER_SEC).toFixed(1) + 's');
const pct = (x) => (x * 100).toFixed(0) + '%';

// ---- evolve ------------------------------------------------------------------------------------
if (cmd === 'evolve') {
	const NAME = opt('name', 'open'), LEVELS = opt('levels', 'paper').split(',');
	const GENS = +opt('gens', 150), RUNS = +opt('runs', 3), POP = +opt('pop', 48), FLOCKS = +opt('flocks', 3), MAXT = +opt('maxticks', 2400), NIN = +opt('nin', B.N_IN);
	log(`Evolving "${NAME}" on ${LEVELS.join('+')}: ${RUNS} runs × ${GENS} generations, batch of ${POP}, ${FLOCKS} flocks per generation, ${MAXT / 60}s limit, ${NW} workers`);
	const runs = [];
	for (let run = 1; run <= RUNS; run++) {
		const FROM = opt('from', null);
		const seedGenomes = FROM ? [JSON.parse(readFileSync(FROM, 'utf8')).genome] : [];
		const ev = new B.Evolver({ levels: LEVELS, popSize: POP, flocksPerGen: FLOCKS, maxTicks: MAXT, seed: run * 101 + LEVELS.length + (FROM ? 7 : 0), seedGenomes, nIn: NIN });
		const tr = performance.now();
		let firstFull = null;
		for (let g = 0; g < GENS; g++) {
			const res = await evalAll(ev.jobs(), MAXT);
			const e = ev.advance(res);
			if (firstFull == null && e.pennedFrac >= 1 - 1e-9) firstFull = e.gen + 1;
			if ((g + 1) % 10 === 0 || g === 0) log(`run ${run} gen ${g + 1}: best ${e.best.toFixed(2)} mean ${e.mean.toFixed(2)} penned ${pct(e.pennedFrac)} (${((performance.now() - tr) / 1000).toFixed(0)}s)`);
		}
		const finalists = ev.history.slice(-20).map((h) => h.champion);
		runs.push({ run, history: ev.history.map((h) => ({ gen: h.gen, best: h.best, mean: h.mean, pennedFrac: h.pennedFrac })), finalists: finalists.map((g) => Array.from(g)), firstFull, seconds: (performance.now() - tr) / 1000 });
		writeFileSync(`${OUT}/runs-${NAME}.json`, JSON.stringify(runs));
	}
	// Honest selection: every finalist from every run on the same unseen flocks, spread across the levels it was evolved on.
	log('\nRe-testing finalists on 30 unseen flocks…');
	const TEST = Array.from({ length: 30 }, (_, i) => ({ level: LEVELS[i % LEVELS.length], seed: 50000 + i }));
	let best = null;
	for (const r of runs) {
		let bestOfRun = null;
		for (let fi = 0; fi < r.finalists.length; fi++) {
			const g = r.finalists[fi];
			const t = await fitnessOn(g, TEST, MAXT);
			const entry = { run: r.run, finalist: fi, ...t, genome: g };
			if (!bestOfRun || t.fitness > bestOfRun.fitness) bestOfRun = entry;
			if (!best || t.fitness > best.fitness) best = entry;
		}
		log(`run ${r.run}: best finalist fitness ${bestOfRun.fitness.toFixed(2)}, penned all on ${bestOfRun.done}/30, median ${fmtT(bestOfRun.medianTicks)}; first full pen at generation ${r.firstFull}`);
	}
	writeFileSync(`${OUT}/champion-${NAME}.json`, JSON.stringify({ name: NAME, levels: LEVELS, run: best.run, finalist: best.finalist, fitness: best.fitness, done: best.done, medianTicks: best.medianTicks, genome: best.genome }));
	log(`\nChampion "${NAME}": run ${best.run}, fitness ${best.fitness.toFixed(3)} on unseen flocks, ${best.done}/30 penned all, median ${fmtT(best.medianTicks)}. Written to ${OUT}/champion-${NAME}.json`);
}

// ---- bench ---------------------------------------------------------------------------------------
if (cmd === 'bench') {
	const champs = {};
	for (const nm of ['open', 'farm', 'best']) if (existsSync(`${OUT}/champion-${nm}.json`)) champs[nm] = JSON.parse(readFileSync(`${OUT}/champion-${nm}.json`, 'utf8'));
	const R = { champions: Object.fromEntries(Object.entries(champs).map(([k, v]) => [k, { run: v.run, fitness: v.fitness, done: v.done, medianTicks: v.medianTicks }])) };
	const SEEDS = Array.from({ length: 60 }, (_, i) => 90000 + i);
	const summarise = (res) => {
		const done = res.filter((r) => r.done), times = done.map((r) => r.ticks);
		const st = (k) => res[0].stats ? res.reduce((a, r) => a + (r.stats[k] || 0), 0) / res.length : null;
		return { done: done.length, median: median(times), worst: times.length ? Math.max(...times) : null, pennedMean: res.reduce((a, r) => a + r.penned, 0) / res.length, n: res[0].n,
			behind: st('behind'), nearSheep: st('nearSheep'), held: st('held'), drive: st('drive'), collect: st('collect'), neither: st('neither'), speed: st('speed'), times: res.map((r) => (r.done ? r.ticks : null)) };
	};
	const line = (k, p) => `${k.padEnd(10)} penned all ${p.done}/60 (mean ${p.pennedMean.toFixed(1)}/${p.n}), median ${fmtT(p.median)}, worst ${fmtT(p.worst)}` + (p.behind != null ? `, behind ${pct(p.behind)}, close ${pct(p.nearSheep)}, held off ${pct(p.held)}, DRIVE ${pct(p.drive)} COLLECT ${pct(p.collect)} neither ${pct(p.neither)}` + (p.speed != null ? `, speed ${pct(p.speed)}` : '') : '');

	// The dogs. 'paper' level's collie is the paper's dog as published; 'open' is the same field with my collie.
	const DOGS = [['open', 'brain', champs.open], ['farm', 'brain', champs.farm], ['best', 'brain', champs.best], ['collie', 'collie', null], ['paperDog', 'collie', null]].filter((d) => d[1] !== 'brain' || d[2]);
	const levelFor = (dogKey, lvl) => (dogKey === 'paperDog' ? (lvl === 'open' ? 'paper' : lvl + 'naive') : dogKey === 'collie' && lvl === 'paper' ? 'open' : lvl);

	log('\nA. Sixty fresh flocks on the open field: every dog, 90s limit.');
	R.paper = {};
	for (const [key, who, ch] of DOGS) {
		const res = await runMany(who, levelFor(key, 'open'), SEEDS, ch ? ch.genome : null, true);
		R.paper[key] = summarise(res);
		log(line(key, R.paper[key]));
	}
	{
		const h2h = {};
		for (const a of Object.keys(R.paper)) for (const b of Object.keys(R.paper)) {
			if (a === b) continue;
			let wins = 0, both = 0;
			for (let i = 0; i < 60; i++) { const ta = R.paper[a].times[i], tb = R.paper[b].times[i]; if (ta != null && tb != null) { both++; if (ta < tb) wins++; } }
			h2h[a + '>' + b] = { wins, both };
		}
		R.paper.headToHead = h2h;
		log('Head to head (same flocks): ' + Object.entries(h2h).filter(([k]) => k.startsWith('open>') || k.startsWith('farm>')).map(([k, v]) => `${k} ${v.wins}/${v.both}`).join(' · '));
	}

	log('\nB. The other fields, without old ewes (60 flocks each, 90s limit).');
	R.away = {};
	for (const lvl of ['awkward', 'field', 'farm2']) {
		R.away[lvl] = {};
		for (const [key, who, ch] of DOGS) {
			if (key === 'paperDog') continue;
			const res = await runMany(who, levelFor(key, lvl), SEEDS, ch ? ch.genome : null, true);
			R.away[lvl][key] = summarise(res);
			log(lvl.padEnd(6) + ' ' + line(key, R.away[lvl][key]));
		}
	}

	log('\nC. Switching the open-field dog\'s inputs off one at a time (30 flocks on the open field).');
	const TEST = Array.from({ length: 30 }, (_, i) => ({ level: 'paper', seed: 70000 + i }));
	R.ablation = [];
	if (champs.open) {
		const G = Float64Array.from(champs.open.genome);
		const base = await fitnessOn(G, TEST, 2400);
		R.ablation.push({ input: 'nothing (the dog as evolved)', ...base });
		log(`${'nothing'.padEnd(30)} fitness ${base.fitness.toFixed(2)}, ${base.done}/30`);
		const groups = [['flock centre', [0, 1]], ['furthest sheep', [2, 3]], ['flock to pen', [4, 5]], ['how spread out', [6]], ['share still loose', [7]], ['nearest sheep, where', [8, 9]], ['nearest sheep, how far', [10]], ['nearest obstacle', [11, 12, 13]], ['nearest sheep speed', [14]], ['flock speed', [15]]];
		for (const [name, idx] of groups) {
			const g = Float64Array.from(G);
			for (const i of idx) for (let h = 0; h < B.N_HID; h++) g[h * B.N_IN + i] = 0;
			const t = await fitnessOn(g, TEST, 2400);
			R.ablation.push({ input: name, ...t });
			log(`${name.padEnd(30)} fitness ${t.fitness.toFixed(2)}, ${t.done}/30`);
		}
	}

	log('\nD. The same for the farm dog, on the awkward flock and the obstacle field (15 flocks each).');
	R.ablationFarm = [];
	if (champs.farm) {
		const G = Float64Array.from(champs.farm.genome);
		const TEST2 = Array.from({ length: 30 }, (_, i) => ({ level: i % 2 ? 'field' : 'awkward', seed: 71000 + i }));
		const base = await fitnessOn(G, TEST2, 3600);
		R.ablationFarm.push({ input: 'nothing (the dog as evolved)', ...base });
		log(`${'nothing'.padEnd(30)} fitness ${base.fitness.toFixed(2)}, ${base.done}/30`);
		const groups = [['flock centre', [0, 1]], ['furthest sheep', [2, 3]], ['flock to pen', [4, 5]], ['how spread out', [6]], ['share still loose', [7]], ['nearest sheep, where', [8, 9]], ['nearest sheep, how far', [10]], ['nearest obstacle', [11, 12, 13]], ['nearest sheep speed', [14]], ['flock speed', [15]]];
		for (const [name, idx] of groups) {
			const g = Float64Array.from(G);
			for (const i of idx) for (let h = 0; h < B.N_HID; h++) g[h * B.N_IN + i] = 0;
			const t = await fitnessOn(g, TEST2, 3600);
			R.ablationFarm.push({ input: name, ...t });
			log(`${name.padEnd(30)} fitness ${t.fitness.toFixed(2)}, ${t.done}/30`);
		}
	}

	for (const nm of ['open', 'farm', 'best']) {
		if (!existsSync(`${OUT}/runs-${nm}.json`)) continue;
		const runs = JSON.parse(readFileSync(`${OUT}/runs-${nm}.json`, 'utf8'));
		R['runs_' + nm] = runs.map((r) => ({ run: r.run, firstFull: r.firstFull, seconds: r.seconds, history: r.history }));
		log(`\nE. Evolution runs for "${nm}": first full pen, best score at the end`);
		for (const r of runs) log(`run ${r.run}: first full pen at generation ${r.firstFull}, best at the end ${r.history[r.history.length - 1].best.toFixed(2)}, ${(r.seconds / 60).toFixed(1)} min`);
	}

	log('\nD2. The same for the best dog, on all four fields (32 flocks, 8 each).');
	R.ablationBest = [];
	if (champs.best) {
		const G = Float64Array.from(champs.best.genome), nIn = B.inputsOf(G);
		const TEST3 = Array.from({ length: 32 }, (_, i) => ({ level: ['paper', 'awkward', 'field', 'farm2'][i % 4], seed: 72000 + i }));
		const base = await fitnessOn(G, TEST3, 5400);
		R.ablationBest.push({ input: 'nothing (the dog as evolved)', ...base });
		log(`${'nothing'.padEnd(30)} fitness ${base.fitness.toFixed(2)}, ${base.done}/32`);
		const groups = [['flock centre', [0, 1]], ['furthest sheep', [2, 3]], ['flock to pen', [4, 5]], ['how spread out', [6]], ['share still loose', [7]], ['nearest sheep, where', [8, 9]], ['nearest sheep, how far', [10]], ['nearest obstacle', [11, 12, 13]], ['nearest sheep speed', [14]], ['flock speed', [15]], ['sheep left behind', [16, 17]], ['flock drift', [18, 19]]].filter(([, idx]) => idx.every((i) => i < nIn - 1));
		for (const [name, idx] of groups) {
			const g = Float64Array.from(G);
			for (const i of idx) for (let h = 0; h < B.N_HID; h++) g[h * nIn + i] = 0;
			const t = await fitnessOn(g, TEST3, 5400);
			R.ablationBest.push({ input: name, ...t });
			log(`${name.padEnd(30)} fitness ${t.fitness.toFixed(2)}, ${t.done}/32`);
		}
	}

	R.elapsedSec = (performance.now() - t0) / 1000;
	writeFileSync(`${OUT}/bench.json`, JSON.stringify(R, null, 1));
	log(`\nDone in ${R.elapsedSec.toFixed(0)}s. Written to ${OUT}/bench.json`);
	writeCharts(R, OUT);
}

for (const w of workers) w.terminate();
}

// ---- charts (inline SVG, same style as the site) ----------------------------------------------
function writeCharts(R, OUT) {
	const C = { a: '#a93fe0', b: '#c97c12', c: '#35a066', text: '#8490b5', textStrong: '#c3cadb', axis: 'rgba(255,255,255,0.14)' };
	function chart({ w = 640, h = 280, series, xmin, xmax, ymin, ymax, xticks, yticks, xlabel, ylabel, title, hlines = [] }) {
		const pad = { l: 44, r: 16, t: 16, b: 40 };
		const X = (v) => pad.l + (v - xmin) / (xmax - xmin) * (w - pad.l - pad.r);
		const Y = (v) => h - pad.b - (v - ymin) / (ymax - ymin) * (h - pad.t - pad.b);
		let s = `<svg class="robot-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12">\n<title>${title}</title>\n`;
		for (const t of yticks) s += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}" stroke="${C.axis}"/><text x="${pad.l - 8}" y="${Y(t).toFixed(1)}" fill="${C.text}" text-anchor="end" dominant-baseline="middle">${t}</text>\n`;
		for (const t of xticks) s += `<text x="${X(t).toFixed(1)}" y="${h - pad.b + 18}" fill="${C.text}" text-anchor="middle">${t}</text>\n`;
		s += `<path d="M${pad.l} ${pad.t} V${h - pad.b} H${w - pad.r}" fill="none" stroke="${C.axis}"/>\n`;
		for (const hl of hlines) s += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(hl.y).toFixed(1)}" y2="${Y(hl.y).toFixed(1)}" stroke="rgba(255,255,255,0.35)" stroke-dasharray="3 4"/>\n`;
		if (xlabel) s += `<text x="${w - pad.r}" y="${h - 6}" fill="${C.text}" text-anchor="end">${xlabel}</text>\n`;
		if (ylabel) s += `<text transform="translate(12 ${pad.t}) rotate(-90)" fill="${C.text}" text-anchor="end">${ylabel}</text>\n`;
		for (const se of series) {
			const d = se.points.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`).join(' ');
			s += `<path d="${d}" fill="none" stroke="${se.color}" stroke-width="${se.width || 2}" stroke-opacity="${se.opacity == null ? 1 : se.opacity}" stroke-linejoin="round"><title>${se.name}</title></path>\n`;
		}
		return s + '</svg>\n';
	}
	const legend = (items) => `<div class="robot-legend">${items.map((i) => `<span><i style="background:${i.color}"></i>${i.name}</span>`).join('')}</div>\n`;
	for (const nm of ['open', 'farm', 'best']) {
		const runs = R['runs_' + nm];
		if (!runs) continue;
		const series = [];
		runs.forEach((r) => {
			series.push({ name: `run ${r.run}, best dog`, color: C.a, opacity: 0.85, points: r.history.map((h) => [h.gen + 1, h.best]) });
			series.push({ name: `run ${r.run}, batch average`, color: C.b, opacity: 0.6, points: r.history.map((h) => [h.gen + 1, h.mean]) });
		});
		const G = Math.max(...runs.map((r) => r.history[r.history.length - 1].gen + 1));
		const svg = chart({ title: `Score of the best dog and of the batch average, by generation, for each run (${nm === 'open' ? 'open field' : nm === 'farm' ? 'awkward flock and obstacle field' : 'all four fields'})`, series, xmin: 0, xmax: G, ymin: 0, ymax: 2.3, xticks: [0, 50, 100, 150, 200, 250, 300].filter((t) => t <= G), yticks: [0, 1, 2], xlabel: 'generation', ylabel: 'score (1 = every sheep in)', hlines: [{ y: 1 }] });
		writeFileSync(`${OUT}/chart-learning-${nm}.html`, svg + legend([{ name: 'best dog (one line per run)', color: C.a }, { name: 'batch average', color: C.b }]));
	}
	if (R.paper && R.paper.open) {
		const sorted = (t) => t.filter((x) => x != null).sort((a, b) => a - b).map((x, i) => [i + 1, x / SD.TICKS_PER_SEC]);
		const series = [{ name: 'robot collie', color: C.a, points: sorted(R.paper.open.times) }, { name: 'my collie', color: C.c, points: sorted(R.paper.collie.times) }, { name: "the paper's dog", color: C.b, points: sorted(R.paper.paperDog.times) }];
		const ymax = Math.min(90, Math.ceil(Math.max(...series.flatMap((s) => s.points.map((p) => p[1]))) / 10) * 10);
		const svg = chart({ title: 'Time to pen all thirty sheep on sixty flocks, each dog\'s runs sorted fastest to slowest', series, xmin: 0, xmax: 60, ymin: 0, ymax, xticks: [0, 10, 20, 30, 40, 50, 60], yticks: [0, 20, 40, 60, 80].filter((t) => t <= ymax), xlabel: 'flocks, sorted by that dog\'s time', ylabel: 'seconds' });
		writeFileSync(`${OUT}/chart-race.html`, svg + legend([{ name: 'robot collie (open field)', color: C.a }, { name: 'my collie', color: C.c }, { name: "the paper's dog", color: C.b }]));
	}
	console.log('Charts written.');
}
