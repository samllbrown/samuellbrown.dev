/*
 * Sheepdog simulation.
 *
 * Level "paper" is a straight implementation of the two-rule shepherding
 * heuristic from Strömbom et al. (2014), "Solving the shepherding problem",
 * J. R. Soc. Interface 11:20140719. Later levels add sheep with personalities,
 * obstacles, a sense of which side of the flock to work ("flank"), and a third
 * rule for the dog ("go round").
 *
 * Mount points: any element with [data-sheepdog="<level>"] containing a
 * <canvas>, plus optional [data-role=...] readouts and [data-mode]/[data-action]
 * buttons. See the blog post that uses it for the markup.
 */
(function () {
	'use strict';

	// ---- World ----------------------------------------------------------------
	var W = 120, H = 80;
	var R_A = 2.2;           // sheep-sheep repulsion radius
	var RHO_A = 2;           // weight: repulsion from close neighbours
	var C = 1.05;            // weight: attraction to local centre of mass
	var RHO_S = 1;           // weight: repulsion from dog
	var HW = 0.5;            // weight: inertia
	var E = 0.3;             // weight: noise
	var P_GRAZE = 0.05;      // chance per step an unbothered sheep wanders
	var R_S = 30;            // base dog detection radius
	var SHEEP_SPEED = 0.26;  // units per step
	var DOG_SPEED = 0.39;    // paper ratio: dog 1.5× sheep
	var RHO_O = 1.6;         // weight: repulsion from obstacles
	var TICKS_PER_SEC = 60;

	// Pen on the right, open on the left, with guide fences to the field edges.
	var PEN = { x0: W - 24, x1: W - 3, y0: H / 2 - 12, y1: H / 2 + 12 };
	var TARGET = { x: (PEN.x0 + PEN.x1) / 2, y: (PEN.y0 + PEN.y1) / 2 };
	var FUNNEL = 28;
	var FENCES = [
		[PEN.x0, PEN.y0, PEN.x1, PEN.y0],
		[PEN.x1, PEN.y0, PEN.x1, PEN.y1],
		[PEN.x0, PEN.y1, PEN.x1, PEN.y1],
		[PEN.x0, PEN.y0, PEN.x0 - FUNNEL, -1],
		[PEN.x0, PEN.y1, PEN.x0 - FUNNEL, H + 1],
	];
	var GATE = [PEN.x0, PEN.y0, PEN.x0, PEN.y1]; // one-way for sheep

	var COLORS = {
		field: '#0e1711',
		grid: 'rgba(255,255,255,0.035)',
		pen: '#7dd3a0',
		penFill: 'rgba(125,211,160,0.07)',
		sheep: '#f3f0e6',
		sheepPenned: '#9fd9b6',
		leader: '#ffb454',
		stubborn: '#b9b3a4',
		dog: '#c561f6',
		dogGlow: 'rgba(197,97,246,0.25)',
		dogIdle: 'rgba(197,97,246,0.45)',
		working: 'rgba(197,97,246,0.55)',
		gcm: '#ffb454',
		pond: '#173a4d',
		pondRim: '#2b6b8a',
		rock: '#4a4d55',
		rockRim: '#6b6f78',
		tree: '#1f4a2a',
		treeRim: '#3d8a4f',
		wall: '#8a8378',
		text: '#e9e6dd',
	};

	// ---- Helpers --------------------------------------------------------------
	function mulberry32(seed) {
		var a = seed >>> 0;
		return function () {
			a = (a + 0x6D2B79F5) >>> 0;
			var t = a;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}
	function len(x, y) { return Math.hypot(x, y) || 1e-9; }
	function inPen(p) { return p.x > PEN.x0 && p.x < PEN.x1 && p.y > PEN.y0 && p.y < PEN.y1; }
	function side(px, py, qx, qy, rx, ry) { return (qx - px) * (ry - py) - (qy - py) * (rx - px); }
	function crosses(ax, ay, bx, by, cx, cy, dx, dy) {
		var s1 = side(ax, ay, bx, by, cx, cy), s2 = side(ax, ay, bx, by, dx, dy);
		var s3 = side(cx, cy, dx, dy, ax, ay), s4 = side(cx, cy, dx, dy, bx, by);
		return s1 * s2 < 0 && s3 * s4 < 0;
	}
	// Distance from point p to segment a-b, and the parameter t of the closest point.
	function segDist(px, py, ax, ay, bx, by) {
		var vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
		var t = l2 > 0 ? ((px - ax) * vx + (py - ay) * vy) / l2 : 0;
		t = Math.max(0, Math.min(1, t));
		return { d: len(px - (ax + vx * t), py - (ay + vy * t)), t: t };
	}

	// ---- Levels ---------------------------------------------------------------
	var LEVELS = {
		// flank: work the far side like a real dog (never cross the front, go round the back).
		// paperDog: the shepherd exactly as published (no standoff, no creep, no getting round a sheep).
		// dogSpeed: pace of the collie relative to the paper's 1.5× sheep speed (the human is always 1.0).
		paper: { n: 30, traits: false, obstacles: false, spread: [6, 68], autostart: true, flank: false, paperDog: true },
		minds: { n: 36, traits: true, obstacles: false, spread: [6, 68], autostart: false, flank: true, dogSpeed: 0.8 },
		field: { n: 30, traits: false, obstacles: true, spread: [6, 38], autostart: false, flank: true },
		farm: { n: 60, traits: true, obstacles: true, spread: [6, 40], autostart: false, flank: true },
		// Benchmark-only variants.
		fieldnaive: { n: 30, traits: false, obstacles: true, spread: [6, 38], autostart: false, naive: true, flank: false },
		mindsnaive: { n: 36, traits: true, obstacles: false, spread: [6, 68], autostart: false, flank: false },
		farmnaive: { n: 60, traits: true, obstacles: true, spread: [6, 40], autostart: false, flank: false },
	};

	function makeObstacles(rng) {
		var circles = [], walls = [];
		// A pond in the top or bottom half.
		var top = rng() < 0.5;
		circles.push({ kind: 'pond', x: 42 + rng() * 10, y: top ? 16 + rng() * 6 : 64 - rng() * 6, r: 7 + rng() * 2 });
		// A stone wall across the middle, a bit further on.
		var wx = 56 + rng() * 6, half = 8 + rng() * 4;
		walls.push([wx, H / 2 - half, wx + 1.5, H / 2 + half]);
		// A boulder in the other half from the pond.
		circles.push({ kind: 'rock', x: 44 + rng() * 8, y: top ? 58 + rng() * 8 : 14 + rng() * 8, r: 3 + rng() * 1.2 });
		// A few trees, kept clear of everything else.
		for (var i = 0, tries = 0; i < 3 && tries < 60; tries++) {
			var t = { kind: 'tree', x: 28 + rng() * 40, y: 6 + rng() * (H - 12), r: 2.4 };
			var ok = true;
			for (var j = 0; j < circles.length; j++) {
				if (len(circles[j].x - t.x, circles[j].y - t.y) < circles[j].r + t.r + 7) ok = false;
			}
			for (var k = 0; k < walls.length; k++) {
				if (segDist(t.x, t.y, walls[k][0], walls[k][1], walls[k][2], walls[k][3]).d < t.r + 7) ok = false;
			}
			if (t.x > PEN.x0 - FUNNEL - 4) ok = false;
			if (ok) { circles.push(t); i++; }
		}
		return { circles: circles, walls: walls };
	}

	// ---- Simulation -----------------------------------------------------------
	function Sim(levelName) {
		this.level = LEVELS[levelName] || LEVELS.paper;
		this.levelName = levelName;
		this.reset(1);
	}

	Sim.prototype.reset = function (seed) {
		var L = this.level, rng = mulberry32(seed);
		this.seed = seed;
		this.obstacles = L.obstacles ? makeObstacles(rng) : { circles: [], walls: [] };
		this.walls = FENCES.concat(this.obstacles.walls);
		this.sheep = [];
		var counts = { leader: 0, loner: 0, stubborn: 0, flighty: 0 };
		for (var i = 0; i < L.n; i++) {
			var s, ok = false, tries = 0;
			while (!ok && tries++ < 50) {
				var a = rng() * Math.PI * 2;
				s = {
					x: L.spread[0] + rng() * (L.spread[1] - L.spread[0]), y: 6 + rng() * (H - 12),
					hx: Math.cos(a), hy: Math.sin(a), penned: false, pressure: 0,
					wary: 1, social: 1, flighty: 1, stubborn: 0, role: '',
				};
				ok = true;
				for (var c = 0; c < this.obstacles.circles.length; c++) {
					var o = this.obstacles.circles[c];
					if (len(o.x - s.x, o.y - s.y) < o.r + 3) ok = false;
				}
			}
			if (L.traits) {
				var roll = rng();
				if (roll < 0.06) { s.role = 'leader'; s.social = 0.35; s.wary = 0.8; counts.leader++; }
				else if (roll < 0.20) { s.role = 'loner'; s.social = 0.45; s.wary = 1.2; counts.loner++; }
				else if (roll < 0.34) { s.role = 'flighty'; s.wary = 1.4; s.flighty = 1.35; counts.flighty++; }
				else { s.wary = 0.85 + rng() * 0.3; s.social = 0.9 + rng() * 0.25; }
			}
			this.sheep.push(s);
		}
		// Two or three old ewes per flock, whatever its size.
		if (L.traits) {
			var want = 2 + (rng() < 0.5 ? 1 : 0), guard = 0;
			while (counts.stubborn < want && guard++ < 200) {
				var pick = this.sheep[Math.floor(rng() * this.sheep.length)];
				if (pick.role) continue;
				pick.role = 'stubborn'; pick.wary = 0.55; pick.stubborn = 0.5 + rng() * 0.3; pick.flighty = 0.85;
				counts.stubborn++;
			}
		}
		this.traitCounts = counts;
		this.dog = { x: 5, y: H - 5, hx: 1, hy: 0 };
		this.state = 'idle';            // idle | armed | running | done
		this.mode = 'collie';           // collie | manual
		this.rule = 'idle';
		this.pointer = null;
		this.dogTarget = null;
		this.routeTarget = null;
		this.flankCommit = null;
		this.collecting = null;
		this.collectingSheep = null;
		this.collectReason = null;
		this.flockRoute = null;
		this.creeping = false;
		this.gcm = null;
		this.cohesion = 0;
		this.ticks = 0;
		this.pennedCount = 0;
	};

	Sim.prototype.start = function (mode) {
		this.reset(this.seed);
		this.mode = mode;
		this.state = mode === 'manual' ? 'armed' : 'running'; // manual clock starts on first move
		if (mode === 'manual') this.pointer = { x: this.dog.x, y: this.dog.y };
	};

	// Move without crossing fences/walls (slide), stay off circles, stay in field.
	Sim.prototype.move = function (x, y, nx, ny, isSheep) {
		var walls = this.walls;
		if (isSheep && x > PEN.x0) walls = walls.concat([GATE]);
		for (var i = 0; i < walls.length; i++) {
			var w = walls[i];
			if (!crosses(x, y, nx, ny, w[0], w[1], w[2], w[3])) continue;
			var wx = w[2] - w[0], wy = w[3] - w[1], wl = len(wx, wy);
			wx /= wl; wy /= wl;
			var dot = (nx - x) * wx + (ny - y) * wy;
			var sx = x + wx * dot, sy = y + wy * dot, blocked = false;
			for (var j = 0; j < walls.length; j++) {
				var v = walls[j];
				if (crosses(x, y, sx, sy, v[0], v[1], v[2], v[3])) { blocked = true; break; }
			}
			if (blocked) { nx = x; ny = y; break; }
			nx = sx; ny = sy;
		}
		var circles = this.obstacles.circles;
		for (var c = 0; c < circles.length; c++) {
			var o = circles[c], dx = nx - o.x, dy = ny - o.y, d = len(dx, dy), min = o.r + 1;
			if (d < min) { nx = o.x + dx / d * min; ny = o.y + dy / d * min; }
		}
		nx = Math.min(W - 1, Math.max(1, nx));
		ny = Math.min(H - 1, Math.max(1, ny));
		return { x: nx, y: ny };
	};

	Sim.prototype.stepSheep = function () {
		var dog = this.dog, sheep = this.sheep, n = sheep.length;
		var dogActive = this.state === 'running';
		var circles = this.obstacles.circles;
		var leaders = sheep.filter(function (s) { return s.role === 'leader' && !s.penned; });
		var next = new Array(n);
		for (var i = 0; i < n; i++) {
			var s = sheep[i];
			var dx = s.x - dog.x, dy = s.y - dog.y, dd = len(dx, dy);
			var hx, hy;
			// Pressure: a dog standing close and eyeing a sheep builds it up; a
			// stubborn sheep stands its ground until the pressure crosses its threshold.
			var range = R_S * s.wary;
			if (dogActive && dd < range) s.pressure = Math.min(1, s.pressure + 0.004 + 0.012 * (1 - dd / range));
			else s.pressure *= 0.96;
			if (dogActive && dd < range && s.pressure >= s.stubborn) {
				var nb = [];
				for (var j = 0; j < n; j++) {
					if (j === i || sheep[j].penned !== s.penned) continue;
					var ox = sheep[j].x - s.x, oy = sheep[j].y - s.y;
					nb.push({ d: len(ox, oy), x: ox, y: oy });
				}
				nb.sort(function (a, b) { return a.d - b.d; });
				var cx = 0, cy = 0;
				for (var q = 0; q < nb.length; q++) { cx += nb[q].x; cy += nb[q].y; }
				var cl = len(cx, cy); if (cl > 1e-6) { cx /= cl; cy /= cl; } else { cx = 0; cy = 0; }
				var rx = 0, ry = 0;
				for (var r = 0; r < nb.length && nb[r].d < R_A; r++) { rx -= nb[r].x / nb[r].d; ry -= nb[r].y / nb[r].d; }
				var rl = len(rx, ry); if (rl > 1e-6) { rx /= rl; ry /= rl; }
				var sx = dx / dd, sy = dy / dd;
				// Obstacles push back within a short margin.
				var obx = 0, oby = 0;
				for (var c = 0; c < circles.length; c++) {
					var o = circles[c], ax = s.x - o.x, ay = s.y - o.y, ad = len(ax, ay);
					if (ad < o.r + 3.5) { obx += ax / ad; oby += ay / ad; }
				}
				var owalls = this.obstacles.walls;
				for (var wv = 0; wv < owalls.length; wv++) {
					var ow = owalls[wv], sd = segDist(s.x, s.y, ow[0], ow[1], ow[2], ow[3]);
					if (sd.d < 3.5) {
						var qx = ow[0] + (ow[2] - ow[0]) * sd.t, qy = ow[1] + (ow[3] - ow[1]) * sd.t;
						obx += (s.x - qx) / sd.d; oby += (s.y - qy) / sd.d;
					}
				}
				var ol = len(obx, oby); if (ol > 1e-6) { obx /= ol; oby /= ol; }
				// Followers drift towards a leader if there is one.
				var lx = 0, ly = 0;
				if (leaders.length && s.role !== 'leader' && !s.penned) {
					var ld = leaders[0], lvx = ld.x - s.x, lvy = ld.y - s.y, lvl = len(lvx, lvy);
					lx = lvx / lvl * 0.5; ly = lvy / lvl * 0.5;
				}
				var na = Math.random() * Math.PI * 2;
				hx = HW * s.hx + C * s.social * cx + RHO_A * rx + RHO_S * sx + RHO_O * obx + lx + E * Math.cos(na);
				hy = HW * s.hy + C * s.social * cy + RHO_A * ry + RHO_S * sy + RHO_O * oby + ly + E * Math.sin(na);
				var hl = len(hx, hy); hx /= hl; hy /= hl;
				// Don't walk into things: if the heading points into a nearby obstacle,
				// keep only the component along its edge (sheep flow round, not through).
				for (var c2 = 0; c2 < circles.length; c2++) {
					var o2 = circles[c2], tx = o2.x - s.x, ty = o2.y - s.y, td = len(tx, ty);
					if (td < o2.r + 3 && (hx * tx + hy * ty) > 0) {
						tx /= td; ty /= td;
						var into = hx * tx + hy * ty;
						hx -= tx * into; hy -= ty * into;
						var hl2 = len(hx, hy);
						if (hl2 < 0.15) {
							// Dead-on: pick a way round and stick with it (whichever way we were already going).
							hx = -ty; hy = tx; hl2 = 1;
							if (hx * s.hx + hy * s.hy < 0) { hx = -hx; hy = -hy; }
						}
						hx /= hl2; hy /= hl2;
					}
				}
				var allWalls = this.walls;
				for (var w2 = 0; w2 < allWalls.length; w2++) {
					var ow2 = allWalls[w2], sd2 = segDist(s.x, s.y, ow2[0], ow2[1], ow2[2], ow2[3]);
					if (sd2.d < 3) {
						var qx2 = ow2[0] + (ow2[2] - ow2[0]) * sd2.t - s.x, qy2 = ow2[1] + (ow2[3] - ow2[1]) * sd2.t - s.y;
						var ql = len(qx2, qy2); qx2 /= ql; qy2 /= ql;
						var into2 = hx * qx2 + hy * qy2;
						if (into2 > 0) {
							hx -= qx2 * into2; hy -= qy2 * into2;
							var hl3 = len(hx, hy);
							if (hl3 < 0.15) {
								// Dead-on: slide towards the nearer end of the wall, unless already sliding.
								hx = -qy2; hy = qx2; hl3 = 1;
								var prev = hx * s.hx + hy * s.hy;
								if (Math.abs(prev) > 0.2) { if (prev < 0) { hx = -hx; hy = -hy; } }
								else if (sd2.t > 0.5 ? (hx * (ow2[2] - ow2[0]) + hy * (ow2[3] - ow2[1])) < 0 : (hx * (ow2[2] - ow2[0]) + hy * (ow2[3] - ow2[1])) > 0) { hx = -hx; hy = -hy; }
							}
							hx /= hl3; hy /= hl3;
							// A sheep won't jam itself into a dead end: if the slide leads to a
							// wall end that meets the field edge, and it's close, go the other way.
							var ex = (ow2[2] - s.x) * hx + (ow2[3] - s.y) * hy > 0 ? ow2[2] : ow2[0];
							var ey = ex === ow2[2] ? ow2[3] : ow2[1];
							var deadEnd = ex <= 0 || ex >= W || ey <= 0 || ey >= H;
							if (deadEnd && len(ex - s.x, ey - s.y) < 12) { hx = -hx; hy = -hy; }
						}
					}
				}
				next[i] = { hx: hx, hy: hy, move: SHEEP_SPEED * s.flighty };
			} else if (Math.random() < P_GRAZE) {
				var ga = Math.random() * Math.PI * 2;
				next[i] = { hx: Math.cos(ga), hy: Math.sin(ga), move: SHEEP_SPEED * 0.6 };
			} else {
				next[i] = { hx: s.hx, hy: s.hy, move: 0 };
			}
		}
		var penned = 0;
		for (var m = 0; m < n; m++) {
			var t = sheep[m], u = next[m];
			t.hx = u.hx; t.hy = u.hy;
			if (u.move > 0) {
				var p = this.move(t.x, t.y, t.x + u.hx * u.move, t.y + u.hy * u.move, true);
				t.x = p.x; t.y = p.y;
			}
			t.penned = inPen(t);
			if (t.penned) penned++;
		}
		this.pennedCount = penned;
	};

	// The collie: two rules (plus, when flank is on, a sense of which side to work).
	Sim.prototype.collieTarget = function () {
		var loose = this.sheep.filter(function (s) { return !s.penned; });
		if (loose.length === 0) { this.rule = 'done'; return null; }
		var gx = 0, gy = 0;
		for (var i = 0; i < loose.length; i++) { gx += loose[i].x; gy += loose[i].y; }
		gx /= loose.length; gy /= loose.length;
		this.gcm = { x: gx, y: gy };
		var fN = R_A * Math.pow(loose.length, 2 / 3);
		this.cohesion = fN;
		this.extent = 0;
		var flank = this.level.flank;
		// How big the bulk of the flock is (ignore the odd outlier).
		var dists = [];
		for (var k = 0; k < loose.length; k++) dists.push(len(loose[k].x - gx, loose[k].y - gy));
		dists.sort(function (a, b) { return a - b; });
		this.extent = dists[Math.min(dists.length - 1, Math.floor(dists.length * 0.75))];
		// Direction to drive the flock: at the pen, unless something is in the
		// way, in which case rule three applies to the flock too: aim for its edge.
		var aim = TARGET;
		this.flockRoute = null;
		if (flank && this.level.obstacles && !this.level.naive) {
			var fr = this.routeAround(this.gcm, TARGET, null, false, Math.min(this.extent, 10));
			if (fr) { aim = fr; this.flockRoute = fr; }
		}
		var ux = aim.x - gx, uy = aim.y - gy, ul = len(ux, uy); ux /= ul; uy /= ul;
		var furthest = null, fd = -1, behind = null, bd = -1;
		for (var j = 0; j < loose.length; j++) {
			var rx = loose[j].x - gx, ry = loose[j].y - gy, d = len(rx, ry);
			// A real dog leaves a sheep that is already out in front, heading the right way.
			if (flank && (rx * ux + ry * uy) / d > 0.5) continue;
			if (d > fd) { fd = d; furthest = loose[j]; }
			// ...and never drives on with a sheep left behind it.
			if (flank && this.rule === 'drive' && (loose[j].x - this.dog.x) * ux + (loose[j].y - this.dog.y) * uy < -4 && d > bd) { bd = d; behind = loose[j]; }
		}
		// Finish the sheep you started on: a real dog doesn't switch stragglers
		// every time a different one becomes marginally the furthest.
		var forced = false, reason = 'far';
		if (flank && this.rule === 'collect' && this.collecting && !this.collecting.penned) {
			var kd = len(this.collecting.x - gx, this.collecting.y - gy);
			if (this.collectReason === 'behind') {
				// A sheep that was left behind gets brought right back in.
				if (kd > fN * 0.6) { furthest = this.collecting; fd = kd; forced = true; reason = 'behind'; }
			} else if (kd > fN * 0.9) { furthest = this.collecting; fd = kd; }
		}
		// Hysteresis: once driving, put up with a bit of spread rather than dithering.
		var threshold = flank && this.rule === 'drive' ? fN * 1.25 : fN;
		if (!forced && behind && bd > fN * 0.6 && !(furthest && fd > threshold)) { furthest = behind; fd = bd; forced = true; reason = 'behind'; }
		if (furthest && (fd > threshold || forced)) {
			this.rule = 'collect';
			this.collecting = furthest;
			this.collectingSheep = furthest;
			this.collectReason = reason;
			var cx = (furthest.x - gx) / fd, cy = (furthest.y - gy) / fd;
			// Stand off a few body-lengths behind the straggler, not on top of it
			// (the paper's dog aims for just one body-length behind).
			var back1 = this.level.paperDog ? R_A : R_A * 3;
			if (!flank) return { x: furthest.x + cx * back1, y: furthest.y + cy * back1 };
			return this.collectStand(furthest, cx, cy, back1);
		}
		this.collecting = null;
		this.collectingSheep = null;
		this.rule = 'drive';
		var back = R_A * Math.sqrt(loose.length);
		return { x: gx - ux * back, y: gy - uy * back };
	};

	// Where to stand to fetch a straggler. The paper's dog stands directly beyond
	// it, away from the flock. Against a fence or in a corner that pins the sheep,
	// so this dog tries a few angles and picks the one from which the sheep,
	// running away from the dog, actually gets back towards the flock.
	Sim.prototype.collectStand = function (sheep, cx, cy, back) {
		var g = this.gcm, ideal = Math.atan2(cy, cx);
		var d0 = len(sheep.x - g.x, sheep.y - g.y);
		var offsets = [0, 0.35, -0.35, 0.7, -0.7, 1.05, -1.05, 1.4, -1.4, 1.75, -1.75, 2.1, -2.1];
		var best = null, bestScore = -Infinity;
		for (var i = 0; i < offsets.length; i++) {
			var a = ideal + offsets[i], ax = Math.cos(a), ay = Math.sin(a);
			var st = { x: sheep.x + ax * back, y: sheep.y + ay * back };
			if (st.x < 1 || st.x > W - 1 || st.y < 1 || st.y > H - 1) continue;
			var blocked = false;
			for (var w = 0; w < this.walls.length; w++) {
				var wl = this.walls[w];
				if (crosses(sheep.x, sheep.y, st.x, st.y, wl[0], wl[1], wl[2], wl[3])) { blocked = true; break; }
			}
			if (blocked) continue;
			// Where does the sheep end up if it runs from here? (Sliding along walls.)
			var p = this.move(sheep.x, sheep.y, sheep.x - ax * 8, sheep.y - ay * 8, true);
			var progress = d0 - len(p.x - g.x, p.y - g.y);
			var room = len(p.x - sheep.x, p.y - sheep.y);
			var score = progress + 0.3 * room - 1.5 * Math.abs(offsets[i]);
			if (score > bestScore) { bestScore = score; best = st; }
		}
		return best || { x: sheep.x + cx * back, y: sheep.y + cy * back };
	};

	// Rule three (not in the paper): if something is in the way, aim for its edge.
	Sim.prototype.routeAround = function (from, target, extra, onlyExtra, pad) {
		pad = pad || 0;
		var dx = target.x - from.x, dy = target.y - from.y, dl = len(dx, dy);
		var ux = dx / dl, uy = dy / dl, nx = -uy, ny = ux;
		var best = null, bestT = 2;
		var circles = onlyExtra ? extra : (extra ? this.obstacles.circles.concat(extra) : this.obstacles.circles);
		for (var i = 0; i < circles.length; i++) {
			var o = circles[i], margin = o.r + 2.5 + pad;
			var sd = segDist(o.x, o.y, from.x, from.y, target.x, target.y);
			if (sd.d < margin && sd.t > 0 && sd.t < 1 && sd.t < bestT) {
				var s = (o.x - from.x) * nx + (o.y - from.y) * ny;
				var sign = s >= 0 ? -1 : 1;
				var cand = { x: o.x + nx * sign * (margin + 1), y: o.y + ny * sign * (margin + 1) };
				// Not off the edge of the field: go round the other side instead.
				if (pad > 0 && (cand.x < 2 || cand.x > W - 2 || cand.y < 2 || cand.y > H - 2)) cand = { x: o.x - nx * sign * (margin + 1), y: o.y - ny * sign * (margin + 1) };
				best = cand;
				bestT = sd.t;
			}
		}
		var walls = onlyExtra ? [] : this.obstacles.walls;
		for (var k = 0; k < walls.length; k++) {
			var w = walls[k];
			if (!crosses(from.x, from.y, target.x, target.y, w[0], w[1], w[2], w[3])) continue;
			var e1 = { x: w[0], y: w[1] }, e2 = { x: w[2], y: w[3] };
			var c1 = len(from.x - e1.x, from.y - e1.y) + len(target.x - e1.x, target.y - e1.y);
			var c2 = len(from.x - e2.x, from.y - e2.y) + len(target.x - e2.x, target.y - e2.y);
			var e = c1 <= c2 ? e1 : e2, other = c1 <= c2 ? e2 : e1;
			var ax = e.x - other.x, ay = e.y - other.y, al = len(ax, ay);
			var wp = { x: e.x + ax / al * (3 + pad), y: e.y + ay / al * (3 + pad) };
			var t = segDist(wp.x, wp.y, from.x, from.y, target.x, target.y).t;
			if (t < bestT) { best = wp; bestT = t; }
		}
		return best;
	};

	// Flanking (not in the paper either): if the way to the target would cross
	// the front of the flock or cut straight through it, walk round the flank
	// circle towards the target's side : always the long way, via the back.
	Sim.prototype.flankAround = function (from, target) {
		if (!this.gcm) return null;
		var g = this.gcm, fN = this.cohesion;
		var margin = Math.max(8, Math.min(fN + 3, this.extent + 4));
		var sd = segDist(g.x, g.y, from.x, from.y, target.x, target.y);
		if (sd.d >= margin || sd.t <= 0 || sd.t >= 1) return null;
		var ux = TARGET.x - g.x, uy = TARGET.y - g.y, ul = len(ux, uy); ux /= ul; uy /= ul;
		var cx = from.x + (target.x - from.x) * sd.t, cy = from.y + (target.y - from.y) * sd.t;
		var inFront = (cx - g.x) * ux + (cy - g.y) * uy > 0;
		var through = sd.d < margin - 3;
		if (!inFront && !through) return null;
		var TAU = Math.PI * 2;
		var aDog = Math.atan2(from.y - g.y, from.x - g.x);
		var aTgt = Math.atan2(target.y - g.y, target.x - g.x);
		var aFront = Math.atan2(uy, ux);
		var ccw = ((aTgt - aDog) % TAU + TAU) % TAU;       // arc going anticlockwise
		var cw = TAU - ccw;                                // arc going clockwise
		// Which way round avoids the front? Compare the midpoints of the two arcs.
		function gap(a, b) { var d = Math.abs(((a - b) % TAU + TAU) % TAU); return Math.min(d, TAU - d); }
		var midCcw = aDog + ccw / 2, midCw = aDog - cw / 2;
		var dir = gap(midCcw, aFront) >= gap(midCw, aFront) ? 1 : -1;
		var arc = dir === 1 ? ccw : cw;
		// Take the first point round the arc that is actually reachable.
		var steps = [Math.PI / 4.5, Math.PI / 2.2, Math.PI / 1.5], circles = this.obstacles.circles;
		for (var si = 0; si < steps.length; si++) {
			var a = aDog + dir * Math.min(arc, steps[si]);
			var wp = { x: g.x + Math.cos(a) * margin, y: g.y + Math.sin(a) * margin };
			if (wp.x < 2 || wp.x > W - 2 || wp.y < 2 || wp.y > H - 2) continue;
			var clear = true;
			for (var oi = 0; oi < circles.length; oi++) {
				if (len(circles[oi].x - wp.x, circles[oi].y - wp.y) < circles[oi].r + 2.5) { clear = false; break; }
			}
			for (var wi = 0; wi < this.walls.length && clear; wi++) {
				var wl = this.walls[wi];
				if (segDist(wp.x, wp.y, wl[0], wl[1], wl[2], wl[3]).d < 2.5) clear = false;
			}
			if (clear) return wp;
			if (Math.min(arc, steps[si]) >= arc) break;
		}
		return null;
	};

	Sim.prototype.stepDog = function () {
		var dog = this.dog, target;
		if (this.mode === 'manual') {
			target = this.pointer; this.rule = 'manual'; this.gcm = null;
		} else {
			target = this.collieTarget();
		}
		this.dogTarget = target;
		this.routeTarget = null;
		if (!target) return;
		var goal = target;
		if (this.mode === 'collie' && this.level.flank) {
			// Commit to a flanking decision for a while, so the dog doesn't dither
			// between going round and going direct.
			var fc = this.flankCommit;
			if (fc && this.ticks < fc.until && !(fc.goal && len(fc.goal.x - dog.x, fc.goal.y - dog.y) < 2)) {
				if (fc.goal) { goal = fc.goal; this.routeTarget = fc.goal; this.rule = 'flank'; }
			} else {
				var fp = this.flankAround(dog, target);
				this.flankCommit = { goal: fp, until: this.ticks + (fp ? 90 : 45) };
				if (fp) { goal = fp; this.routeTarget = fp; this.rule = 'flank'; }
			}
		}
		if (this.mode === 'collie') {
			// Get round the sheep being collected rather than through it; and round
			// obstacles, if this level's dog knows about them.
			var extra = this.rule === 'collect' && this.collectingSheep && !this.level.paperDog ? [{ x: this.collectingSheep.x, y: this.collectingSheep.y, r: 2 }] : null;
			var wp = (this.level.obstacles && !this.level.naive) ? this.routeAround(dog, goal, extra)
				: (extra ? this.routeAround(dog, goal, extra, true) : null);
			if (wp) { goal = wp; this.routeTarget = wp; if (this.rule !== 'collect') this.rule = 'route'; }
		}
		var dx = goal.x - dog.x, dy = goal.y - dog.y, d = len(dx, dy);
		this.creeping = false;
		if (d < 0.5) return;
		var speed = DOG_SPEED, hx0 = dx / d, hy0 = dy / d;
		if (this.mode === 'collie') {
			speed *= this.level.dogSpeed || 1;
			var nearest = Infinity, nearestSheep = null;
			for (var i = 0; i < this.sheep.length; i++) {
				var s = this.sheep[i];
				if (s.penned) continue;
				var sdn = len(s.x - dog.x, s.y - dog.y);
				if (sdn < nearest) { nearest = sdn; nearestSheep = s; }
			}
			if (this.level.paperDog) {
				// As published: within 3 r_a of any sheep the shepherd does not move.
				if (nearest < 3 * R_A) return;
			} else {
				// Ours creeps up on sheep and stops short of touching them. Once it is
				// that close it may still back off or go round, but never closes in.
				var STOP = 4, CREEP = 10;
				if (nearest <= STOP) {
					this.creeping = true;
					speed *= 0.3;
					// Straight on if that doesn't close in; otherwise round the sheep,
					// whichever way is nearer the goal; otherwise hold.
					var tx = -(nearestSheep.y - dog.y) / nearest, ty = (nearestSheep.x - dog.x) / nearest;
					if (tx * hx0 + ty * hy0 < 0) { tx = -tx; ty = -ty; }
					var dirs = [[hx0, hy0], [tx, ty]], ok = false;
					for (var di = 0; di < dirs.length && !ok; di++) {
						var bx = dog.x + dirs[di][0] * speed, by = dog.y + dirs[di][1] * speed;
						if (len(nearestSheep.x - bx, nearestSheep.y - by) >= nearest - 1e-6) { hx0 = dirs[di][0]; hy0 = dirs[di][1]; ok = true; }
					}
					if (!ok) return;
				} else if (nearest < CREEP) { speed *= 0.15 + 0.85 * (nearest - STOP) / (CREEP - STOP); this.creeping = true; }
			}
		}
		var noise = this.mode === 'collie' ? E : 0, na = Math.random() * Math.PI * 2;
		var hx = hx0 + noise * Math.cos(na), hy = hy0 + noise * Math.sin(na);
		var hl = len(hx, hy); hx /= hl; hy /= hl;
		dog.hx = hx; dog.hy = hy;
		var p = this.move(dog.x, dog.y, dog.x + hx * Math.min(speed, d), dog.y + hy * Math.min(speed, d), false);
		dog.x = p.x; dog.y = p.y;
	};

	Sim.prototype.step = function () {
		if (this.state === 'done') return;
		if (this.state === 'running') { this.stepDog(); this.ticks++; }
		this.stepSheep();
		if (this.state === 'running' && this.pennedCount === this.sheep.length) {
			this.state = 'done'; this.rule = 'done';
		}
	};

	// ---- Rendering ------------------------------------------------------------
	function draw(ctx, sim, px, showWork) {
		var w = W * px, h = H * px;
		ctx.clearRect(0, 0, w, h);
		ctx.fillStyle = COLORS.field; ctx.fillRect(0, 0, w, h);
		ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1;
		ctx.beginPath();
		for (var gx = 10; gx < W; gx += 10) { ctx.moveTo(gx * px, 0); ctx.lineTo(gx * px, h); }
		for (var gy = 10; gy < H; gy += 10) { ctx.moveTo(0, gy * px); ctx.lineTo(w, gy * px); }
		ctx.stroke();

		// Obstacles
		var circles = sim.obstacles.circles;
		for (var ci = 0; ci < circles.length; ci++) {
			var o = circles[ci];
			ctx.fillStyle = o.kind === 'pond' ? COLORS.pond : o.kind === 'rock' ? COLORS.rock : COLORS.tree;
			ctx.strokeStyle = o.kind === 'pond' ? COLORS.pondRim : o.kind === 'rock' ? COLORS.rockRim : COLORS.treeRim;
			ctx.lineWidth = Math.max(1.5, px * 0.4);
			ctx.beginPath(); ctx.arc(o.x * px, o.y * px, o.r * px, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
			if (o.kind === 'tree') {
				ctx.fillStyle = COLORS.treeRim;
				ctx.beginPath(); ctx.arc((o.x - o.r * 0.3) * px, (o.y - o.r * 0.3) * px, o.r * 0.3 * px, 0, Math.PI * 2); ctx.fill();
			}
		}
		var owalls = sim.obstacles.walls;
		ctx.strokeStyle = COLORS.wall; ctx.lineWidth = Math.max(4, px * 1.4); ctx.lineCap = 'round';
		ctx.beginPath();
		for (var wi = 0; wi < owalls.length; wi++) { ctx.moveTo(owalls[wi][0] * px, owalls[wi][1] * px); ctx.lineTo(owalls[wi][2] * px, owalls[wi][3] * px); }
		ctx.stroke();

		// Pen and fences
		ctx.fillStyle = COLORS.penFill;
		ctx.fillRect(PEN.x0 * px, PEN.y0 * px, (PEN.x1 - PEN.x0) * px, (PEN.y1 - PEN.y0) * px);
		ctx.strokeStyle = COLORS.pen; ctx.lineWidth = Math.max(2, px * 0.6);
		ctx.beginPath();
		for (var fi = 0; fi < FENCES.length; fi++) { ctx.moveTo(FENCES[fi][0] * px, FENCES[fi][1] * px); ctx.lineTo(FENCES[fi][2] * px, FENCES[fi][3] * px); }
		ctx.stroke();
		ctx.fillStyle = COLORS.pen;
		ctx.font = Math.max(10, px * 2.6) + 'px ui-monospace, Menlo, Consolas, monospace';
		ctx.textAlign = 'center';
		ctx.fillText('PEN', TARGET.x * px, (PEN.y1 - 2) * px);

		// Workings
		if (showWork && sim.mode === 'collie' && sim.state === 'running' && sim.gcm) {
			ctx.strokeStyle = COLORS.working; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
			ctx.beginPath(); ctx.arc(sim.gcm.x * px, sim.gcm.y * px, sim.cohesion * px, 0, Math.PI * 2); ctx.stroke();
			ctx.setLineDash([]);
			ctx.fillStyle = COLORS.gcm;
			ctx.beginPath(); ctx.arc(sim.gcm.x * px, sim.gcm.y * px, Math.max(2, px * 0.7), 0, Math.PI * 2); ctx.fill();
			var tgt = sim.routeTarget || sim.dogTarget;
			if (tgt) {
				ctx.strokeStyle = COLORS.working;
				ctx.beginPath(); ctx.moveTo(sim.dog.x * px, sim.dog.y * px); ctx.lineTo(tgt.x * px, tgt.y * px); ctx.stroke();
				ctx.beginPath(); ctx.arc(tgt.x * px, tgt.y * px, Math.max(3, px), 0, Math.PI * 2); ctx.stroke();
				if (sim.routeTarget && sim.dogTarget) {
					ctx.setLineDash([2, 4]);
					ctx.beginPath(); ctx.moveTo(tgt.x * px, tgt.y * px); ctx.lineTo(sim.dogTarget.x * px, sim.dogTarget.y * px); ctx.stroke();
					ctx.setLineDash([]);
				}
			}
		}

		// Sheep
		var r = Math.max(2.5, px * 0.9);
		for (var i = 0; i < sim.sheep.length; i++) {
			var s = sim.sheep[i];
			ctx.fillStyle = s.penned ? COLORS.sheepPenned : s.role === 'stubborn' ? COLORS.stubborn : COLORS.sheep;
			ctx.beginPath(); ctx.arc(s.x * px, s.y * px, r, 0, Math.PI * 2); ctx.fill();
			if (s.role === 'leader') {
				ctx.strokeStyle = COLORS.leader; ctx.lineWidth = Math.max(1.5, px * 0.4);
				ctx.beginPath(); ctx.arc(s.x * px, s.y * px, r + Math.max(2, px * 0.7), 0, Math.PI * 2); ctx.stroke();
			}
		}

		// Dog
		var d = sim.dog, dr = Math.max(5, px * 1.6), idle = sim.state === 'idle';
		ctx.fillStyle = COLORS.dogGlow;
		ctx.beginPath(); ctx.arc(d.x * px, d.y * px, dr * 2.2, 0, Math.PI * 2); ctx.fill();
		ctx.save();
		ctx.translate(d.x * px, d.y * px);
		ctx.rotate(Math.atan2(d.hy, d.hx));
		ctx.fillStyle = idle ? COLORS.dogIdle : COLORS.dog;
		ctx.beginPath();
		ctx.moveTo(dr * 1.3, 0); ctx.lineTo(-dr * 0.9, dr * 0.8); ctx.lineTo(-dr * 0.5, 0); ctx.lineTo(-dr * 0.9, -dr * 0.8);
		ctx.closePath(); ctx.fill();
		ctx.restore();

		if (sim.state === 'done') {
			ctx.fillStyle = 'rgba(9,11,17,0.55)'; ctx.fillRect(0, 0, w, h);
			ctx.fillStyle = COLORS.text; ctx.textAlign = 'center';
			ctx.font = '600 ' + Math.max(16, px * 5) + 'px Rubik, system-ui, sans-serif';
			ctx.fillText('That’ll do.', w / 2, h / 2 - px * 2);
			ctx.font = Math.max(12, px * 2.8) + 'px ui-monospace, Menlo, Consolas, monospace';
			ctx.fillText((sim.mode === 'manual' ? 'You' : 'The collie') + ' penned ' + sim.sheep.length + ' sheep in ' + (sim.ticks / TICKS_PER_SEC).toFixed(1) + 's', w / 2, h / 2 + px * 4);
		} else if (sim.state === 'idle' || sim.state === 'armed') {
			ctx.fillStyle = 'rgba(233,230,221,0.75)'; ctx.textAlign = 'center';
			ctx.font = Math.max(11, px * 2.6) + 'px ui-monospace, Menlo, Consolas, monospace';
			ctx.fillText(sim.state === 'armed' ? 'move the pointer to start the clock' : 'dog is lying down. pick a mode', w / 2, h - px * 4);
		}
	}

	var RULE_TEXT = {
		idle: 'lie down',
		collect: 'COLLECT: flock is spread out, fetch the furthest sheep',
		drive: 'DRIVE: flock is tight, push it from behind towards the pen',
		route: 'GO ROUND: something is in the way, aim for its edge',
		flank: 'FLANK: go round the back of the flock, never across the front',
		manual: 'MANUAL: you are the dog',
		done: 'DONE: every sheep is in the pen',
	};

	// ---- Wiring ---------------------------------------------------------------
	function fmt(t) { return t == null ? '–' : t.toFixed(1) + 's'; }

	function mount(root) {
		if (root.dataset.ready) return;
		root.dataset.ready = '1';
		var levelName = root.dataset.sheepdog || 'paper';
		var canvas = root.querySelector('canvas');
		var ctx = canvas.getContext('2d');
		var q = function (sel) { return root.querySelector(sel); };
		var statusEl = q('[data-role="status"]'), countEl = q('[data-role="count"]'), timeEl = q('[data-role="time"]');
		var workEl = q('[data-role="work"]'), boardYou = q('[data-role="you"]'), boardDog = q('[data-role="collie"]');
		var verdictEl = q('[data-role="verdict"]'), traitsEl = q('[data-role="traits"]');
		var modeButtons = root.querySelectorAll('[data-mode]');

		var sim = new Sim(levelName);
		var seed = (Math.random() * 1e9) >>> 0;
		sim.reset(seed);
		var board = { you: null, collie: null };
		var px = 1, autostarted = false;

		function renderBoard() {
			if (boardYou) boardYou.textContent = fmt(board.you);
			if (boardDog) boardDog.textContent = fmt(board.collie);
			if (verdictEl) {
				var v;
				if (board.you == null && board.collie == null) v = 'Run both to compare on this flock.';
				else if (board.you == null) v = 'Now you try. Same sheep, same field.';
				else if (board.collie == null) v = 'Now watch the collie on the same flock.';
				else if (board.you < board.collie) v = 'You beat the dog by ' + (board.collie - board.you).toFixed(1) + 's.';
				else if (board.you > board.collie) v = 'The dog wins by ' + (board.you - board.collie).toFixed(1) + 's.';
				else v = 'Dead heat.';
				verdictEl.textContent = v;
			}
			if (traitsEl) {
				var c = sim.traitCounts;
				traitsEl.textContent = sim.level.traits
					? c.leader + ' leader' + (c.leader === 1 ? '' : 's') + ' · ' + c.loner + ' loners · ' + c.stubborn + ' old ewes · ' + c.flighty + ' flighty'
					: '';
			}
		}

		function resize() {
			var cssW = root.clientWidth || 600, cssH = cssW * (H / W);
			var dpr = Math.min(2, window.devicePixelRatio || 1);
			canvas.style.height = cssH + 'px';
			canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
			px = canvas.width / W;
		}

		function setPressed(mode) {
			for (var i = 0; i < modeButtons.length; i++) {
				modeButtons[i].setAttribute('aria-pressed', modeButtons[i].dataset.mode === mode ? 'true' : 'false');
			}
		}
		function startMode(mode) { sim.start(mode); setPressed(mode); }
		function newFlock() {
			seed = (Math.random() * 1e9) >>> 0;
			board = { you: null, collie: null };
			sim.reset(seed); setPressed(null); renderBoard();
		}

		function pointerFromEvent(ev) {
			var rect = canvas.getBoundingClientRect();
			var cx = (ev.clientX - rect.left) / rect.width * W, cy = (ev.clientY - rect.top) / rect.height * H;
			sim.pointer = { x: Math.min(W - 1, Math.max(1, cx)), y: Math.min(H - 1, Math.max(1, cy)) };
			if (sim.state === 'armed') sim.state = 'running';
		}
		canvas.addEventListener('pointermove', function (ev) {
			if (sim.mode === 'manual' && (sim.state === 'armed' || sim.state === 'running')) pointerFromEvent(ev);
		});
		canvas.addEventListener('pointerdown', function (ev) {
			if (sim.mode !== 'manual' || sim.state === 'idle' || sim.state === 'done') startMode('manual');
			pointerFromEvent(ev); ev.preventDefault();
		});
		for (var i = 0; i < modeButtons.length; i++) {
			modeButtons[i].addEventListener('click', function (ev) { startMode(ev.currentTarget.dataset.mode); });
		}
		var actions = root.querySelectorAll('[data-action]');
		for (var a = 0; a < actions.length; a++) {
			actions[a].addEventListener('click', function (ev) {
				var act = ev.currentTarget.dataset.action;
				if (act === 'reset') { sim.reset(seed); setPressed(null); }
				if (act === 'new') newFlock();
			});
		}

		var visible = true;
		if ('IntersectionObserver' in window) {
			new IntersectionObserver(function (entries) {
				visible = entries[0].isIntersecting;
				if (visible && !autostarted && sim.level.autostart && sim.state === 'idle') { autostarted = true; startMode('collie'); }
			}, { threshold: 0.3 }).observe(root);
		}

		var lastState = sim.state;
		function frame() {
			if (!document.body.contains(root)) return;
			if (visible) {
				sim.step();
				if (sim.state === 'done' && lastState !== 'done') {
					var t = sim.ticks / TICKS_PER_SEC, key = sim.mode === 'manual' ? 'you' : 'collie';
					if (board[key] == null || t < board[key]) board[key] = t;
					renderBoard();
				}
				lastState = sim.state;
				draw(ctx, sim, px, !workEl || workEl.checked);
				if (statusEl) statusEl.textContent = (sim.creeping && sim.rule === 'collect') ? 'COLLECT: creeping up, letting it make up its mind'
					: (sim.rule === 'collect' && sim.collectReason === 'behind') ? 'COLLECT: one got left behind, go back for it'
					: (RULE_TEXT[sim.rule] || '');
				if (countEl) countEl.textContent = sim.pennedCount + ' / ' + sim.sheep.length + ' penned';
				if (timeEl) timeEl.textContent = (sim.ticks / TICKS_PER_SEC).toFixed(1) + 's';
			}
			requestAnimationFrame(frame);
		}

		resize();
		if ('ResizeObserver' in window) new ResizeObserver(resize).observe(root); else window.addEventListener('resize', resize);
		renderBoard(); setPressed(null);
		requestAnimationFrame(frame);
		root.__sim = sim;
		root.__api = { start: startMode, newFlock: newFlock, board: function () { return board; } };
	}

	// Exposed for headless benchmarking (not used by the page itself).
	window.__SheepdogSim = Sim;

	function mountAll() {
		var roots = document.querySelectorAll('[data-sheepdog]');
		for (var i = 0; i < roots.length; i++) mount(roots[i]);
	}
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll); else mountAll();
	document.addEventListener('astro:page-load', mountAll);

})();
