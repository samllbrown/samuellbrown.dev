/*
 * The potato blight warning that's always on: demos for the blight post.
 *
 * Mounts:
 *   [data-blight-season]   one district, one summer, under a rule you can change
 *   [data-blight-score]    score your rule on every demo district and season, against the full-run curves
 *   [data-blight-map]      a season played out on the map: alert everywhere, reports in clusters
 *   [data-blight-thoughts] what a sharper warning looks at, day by day
 *
 * Needs blight-core.js and blight-data.js loaded first.
 */
(function () {
	'use strict';
	if (typeof document === 'undefined') return;
	// With client-side navigation the three scripts can execute in any order, so
	// wait for the core and the data library rather than bailing out.
	var C, D;

	var COL = { text: '#8490b5', axis: 'rgba(255,255,255,0.14)', val: '#e9e6dd', purple: '#a93fe0', hi: '#c561f6', orange: '#c97c12', green: '#35a066', blue: '#4f9cf9', grey: '#4c5470', alert: 'rgba(169,63,224,0.28)' };
	var MONTHS = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
	var MONTH_START = [0, 31, 61, 92, 123, 153];
	var FONT = '11px ui-monospace, Menlo, Consolas, monospace';
	var pct = function (x, d) { return (x * 100).toFixed(d || 0) + '%'; };
	function setupCanvas(canvas, cssW, cssH) {
		var dpr = Math.min(2, window.devicePixelRatio || 1);
		canvas.style.height = cssH + 'px';
		canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
		var g = canvas.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); return g;
	}
	function dateLabel(year, off) { var d = C.dateOf(year, off); return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth() - 4] + ' ' + year; }
	function option(sel, v, label, selected) { var o = document.createElement('option'); o.value = v; o.textContent = label; if (selected) o.selected = true; sel.appendChild(o); }
	function readRule(root) {
		return { tmin: parseFloat(root.querySelector('[data-rule="tmin"]').value), hours: parseInt(root.querySelector('[data-rule="hours"]').value, 10),
			days: parseInt(root.querySelector('[data-rule="days"]').value, 10), window: parseInt(root.querySelector('[data-rule="window"]').value, 10) };
	}
	function ruleText(r) { return r.days + ' day' + (r.days > 1 ? 's' : '') + ' running with min temp ≥ ' + r.tmin + '°C and ≥ ' + r.hours + ' h at RH ≥ 90%, alert held ' + r.window + ' d'; }
	function bindRule(root, onChange) {
		root.querySelectorAll('[data-rule]').forEach(function (inp) {
			var out = root.querySelector('[data-rule-out="' + inp.dataset.rule + '"]');
			var upd = function () { if (out) out.textContent = inp.value + (inp.dataset.rule === 'tmin' ? '°C' : inp.dataset.rule === 'hours' ? ' h' : ' d'); };
			inp.addEventListener('input', function () { upd(); onChange(); }); upd();
		});
		root.querySelectorAll('[data-preset]').forEach(function (b) {
			b.addEventListener('click', function () {
				var p = b.dataset.preset === 'smith' ? C.SMITH : C.HUTTON;
				root.querySelector('[data-rule="tmin"]').value = p.tmin; root.querySelector('[data-rule="hours"]').value = p.hours;
				root.querySelector('[data-rule="days"]').value = p.days; root.querySelector('[data-rule="window"]').value = p.window;
				root.querySelectorAll('[data-rule]').forEach(function (i) { i.dispatchEvent(new Event('input')); });
			});
		});
	}

	// ---- 1. One summer under the rule ---------------------------------------------
	function mountSeason(root) {
		var canvas = root.querySelector('canvas'), hud = root.querySelector('[data-role="hud"]');
		var selD = root.querySelector('[data-role="district"]'), selY = root.querySelector('[data-role="year"]');
		D.order.forEach(function (oc) { option(selD, oc, D.names[oc], oc === 'DD8'); });
		function fillYears() { var cur = selY.value; selY.innerHTML = ''; Object.keys(D.demo[selD.value]).forEach(function (y) { option(selY, y, D.demo[selD.value][y].live ? y + ' so far (live)' : y, y === (cur || '2012')); }); }
		fillYears();
		selD.addEventListener('change', function () { fillYears(); draw(); }); selY.addEventListener('change', draw);
		document.addEventListener('blight-season-added', function () { fillYears(); draw(); });
		bindRule(root, draw);
		function draw() {
			var s = D.demo[selD.value][selY.value]; if (!s) return;
			var rule = readRule(root), f = C.flags(s.tmin, s.rh, rule);
			var sc = C.scoreSeason(f, s.reports.map(function (r) { return r[0]; }), 7);
			var w = canvas.clientWidth || 600, h = 230, g = setupCanvas(canvas, w, h);
			var pad = { l: 34, r: 10, t: 22, b: 22 }, W = w - pad.l - pad.r, n = C.DAYS;
			var X = function (i) { return pad.l + i / n * W; }, dx = W / n;
			var topH = 90, gap = 14, barTop = pad.t + topH + gap, barH = h - pad.b - barTop;
			g.clearRect(0, 0, w, h); g.font = FONT;
			// alert shading
			for (var i = 0; i < n; i++) if (f.alert[i]) { g.fillStyle = COL.alert; g.fillRect(X(i), pad.t, dx + 0.5, h - pad.b - pad.t); }
			// month grid
			g.strokeStyle = COL.axis; g.fillStyle = COL.text; g.textAlign = 'left'; g.textBaseline = 'top';
			MONTH_START.forEach(function (m, k) { g.beginPath(); g.moveTo(X(m) + 0.5, pad.t); g.lineTo(X(m) + 0.5, h - pad.b); g.stroke(); g.fillText(MONTHS[k], X(m) + 3, h - pad.b + 5); });
			// humid hours bars
			var Yb = function (v) { return barTop + barH - v / 24 * barH; };
			for (i = 0; i < n; i++) if (s.rh[i] != null) { g.fillStyle = f.day[i] ? COL.purple : 'rgba(132,144,181,0.55)'; g.fillRect(X(i), Yb(s.rh[i]), Math.max(1, dx - 0.6), barTop + barH - Yb(s.rh[i])); }
			g.strokeStyle = 'rgba(233,230,221,0.5)'; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(pad.l, Yb(rule.hours) + 0.5); g.lineTo(w - pad.r, Yb(rule.hours) + 0.5); g.stroke(); g.setLineDash([]);
			g.fillStyle = COL.text; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText('24h', pad.l - 4, Yb(24)); g.fillText(rule.hours + 'h', pad.l - 4, Yb(rule.hours)); g.fillText('0', pad.l - 4, Yb(0));
			// tmin line
			var Yt = function (v) { return pad.t + topH - Math.max(0, Math.min(1, (v / 10) / 22)) * topH; };
			g.strokeStyle = 'rgba(233,230,221,0.5)'; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(pad.l, Yt(rule.tmin * 10) + 0.5); g.lineTo(w - pad.r, Yt(rule.tmin * 10) + 0.5); g.stroke(); g.setLineDash([]);
			g.fillText(rule.tmin + '°', pad.l - 4, Yt(rule.tmin * 10)); g.fillText('22°', pad.l - 4, Yt(220)); g.fillText('0°', pad.l - 4, Yt(0));
			g.strokeStyle = COL.orange; g.lineWidth = 1.5; g.beginPath(); var started = false;
			for (i = 0; i < n; i++) { if (s.tmin[i] == null) { started = false; continue; } var x = X(i) + dx / 2, y = Yt(s.tmin[i]); if (!started) { g.moveTo(x, y); started = true; } else g.lineTo(x, y); }
			g.stroke(); g.lineWidth = 1;
			// reports
			s.reports.forEach(function (r) { var x = X(r[0]) + dx / 2; g.fillStyle = r[1] ? COL.orange : 'rgba(201,124,18,0.5)'; g.beginPath(); g.moveTo(x, pad.t - 2); g.lineTo(x - 5, pad.t - 12); g.lineTo(x + 5, pad.t - 12); g.closePath(); g.fill(); });
			g.fillStyle = COL.text; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText('min temp', pad.l + 4, pad.t + 2); g.fillText('hours at RH ≥ 90%', pad.l + 4, barTop + 2);
			if (s.live) { var tx = X(s.forecastFrom) + dx / 2; g.strokeStyle = COL.val; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(tx, pad.t); g.lineTo(tx, h - pad.b); g.stroke(); g.setLineDash([]); g.fillText('today', tx + 4, pad.t + 2); g.fillText('forecast →', tx + 4, pad.t + 14); }
			hud.innerHTML = '<span>' + ruleText(rule) + '</span><span><b>' + pct(sc.on / sc.days) + '</b> of days under alert · ' + sc.reports + ' report' + (sc.reports === 1 ? '' : 's') + (sc.npos ? ', alert on for <b>' + sc.caught + ' of the ' + sc.npos + '</b> days that had a report within the week' : '') + '</span>';
		}
		draw();
		if ('ResizeObserver' in window) new ResizeObserver(draw).observe(root); else window.addEventListener('resize', draw);
	}

	// ---- 2. Score your rule ----------------------------------------------------------
	function mountScore(root) {
		var canvas = root.querySelector('canvas'), hud = root.querySelector('[data-role="hud"]'), trail = [], sweeping = false;
		bindRule(root, function () { trail = []; draw(); });
		root.querySelectorAll('[data-action="sweep"]').forEach(function (btn) {
			btn.addEventListener('click', function () {
				if (sweeping) return; sweeping = true; trail = [];
				var key = btn.dataset.sweep === 'window' ? 'window' : 'hours', max = key === 'window' ? 28 : 18, v = 1;
				var rule = readRule(root), inp = root.querySelector('[data-rule="' + key + '"]'), out = root.querySelector('[data-rule-out="' + key + '"]');
				(function step() {
					if (!document.body.contains(root)) { sweeping = false; return; }
					var r = { tmin: rule.tmin, hours: rule.hours, days: rule.days, window: rule.window }; r[key] = v;
					var sc = C.scoreAll(D.demo, r, 7);
					trail.push({ label: key === 'window' ? 'held ' + v + ' d' : v + ' h', x: sc.alertShare, y: sc.catchRate });
					inp.value = v; out.textContent = v + (key === 'window' ? ' d' : ' h');
					draw(); v++;
					if (v <= max) setTimeout(step, key === 'window' ? 150 : 220);
					else { sweeping = false; inp.value = rule[key]; out.textContent = rule[key] + (key === 'window' ? ' d' : ' h'); draw(); }
				})();
			});
		});
		function draw() {
			var rule = readRule(root), sc = C.scoreAll(D.demo, rule, 7);
			var w = canvas.clientWidth || 600, h = 300, g = setupCanvas(canvas, w, h);
			var pad = { l: 58, r: 12, t: 12, b: 34 };
			var X = function (v) { return pad.l + v * (w - pad.l - pad.r); }, Y = function (v) { return h - pad.b - v * (h - pad.t - pad.b); };
			g.clearRect(0, 0, w, h); g.font = FONT; g.fillStyle = COL.text; g.strokeStyle = COL.axis; g.textAlign = 'right'; g.textBaseline = 'middle';
			[0, 0.25, 0.5, 0.75, 1].forEach(function (t) { g.beginPath(); g.moveTo(pad.l, Y(t) + 0.5); g.lineTo(w - pad.r, Y(t) + 0.5); g.stroke(); g.fillText(pct(t), pad.l - 5, Y(t)); });
			g.textAlign = 'center'; g.textBaseline = 'top';
			[0, 0.25, 0.5, 0.75, 1].forEach(function (t) { g.fillText(pct(t), X(t), h - pad.b + 5); });
			g.textAlign = 'right'; g.fillText('district-days under alert', w - pad.r, h - 14);
			g.save(); g.translate(10, pad.t); g.rotate(-Math.PI / 2); g.textAlign = 'right'; g.fillText('outbreak-weeks caught', 0, 0); g.restore();
			g.strokeStyle = 'rgba(233,230,221,0.4)'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(X(1), Y(1)); g.stroke(); g.setLineDash([]);
			var curves = [['Model: all', COL.hi], ['Reports within 100 km, 28 d', COL.green], ['Week-of-year climatology', COL.orange], ['Hutton days in last 14 d', COL.purple]];
			curves.forEach(function (c) { var pts = D.curves[c[0]]; if (!pts) return; g.strokeStyle = c[1]; g.lineWidth = 1.6; g.globalAlpha = 0.85; g.beginPath(); pts.forEach(function (p, i) { if (i) g.lineTo(X(p[0]), Y(p[1])); else g.moveTo(X(p[0]), Y(p[1])); }); g.stroke(); g.globalAlpha = 1; });
			// official Hutton point
			g.fillStyle = COL.val; g.beginPath(); g.arc(X(D.hutton.alertRate), Y(D.hutton.recall), 5, 0, Math.PI * 2); g.fill();
			g.fillStyle = COL.text; g.textAlign = 'right'; g.textBaseline = 'top'; g.fillText('Hutton as issued, 525 districts', X(D.hutton.alertRate) - 8, Y(D.hutton.recall) + 4);
			// trail
			if (trail.length) { g.strokeStyle = COL.hi; g.lineWidth = 1; g.beginPath(); trail.forEach(function (t, i) { if (i) g.lineTo(X(t.x), Y(t.y)); else g.moveTo(X(t.x), Y(t.y)); }); g.stroke(); trail.forEach(function (t) { g.fillStyle = 'rgba(197,97,246,0.6)'; g.beginPath(); g.arc(X(t.x), Y(t.y), 3, 0, Math.PI * 2); g.fill(); }); g.fillStyle = COL.text; g.textAlign = 'left'; g.textBaseline = 'bottom'; [trail[0], trail[trail.length - 1]].forEach(function (t, i) { if (t && (i === 0 || trail.length > 1)) g.fillText(t.label, X(t.x) + 6, Y(t.y) - 4); }); }
			// your point
			g.strokeStyle = COL.hi; g.lineWidth = 2.5; g.beginPath(); g.arc(X(sc.alertShare), Y(sc.catchRate), 7, 0, Math.PI * 2); g.stroke(); g.lineWidth = 1;
			g.fillStyle = COL.hi; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText('your rule', X(sc.alertShare) + 9, Y(sc.catchRate) + 4);
			hud.innerHTML = '<span>' + ruleText(rule) + '</span><span>on the ' + D.order.length + ' demo districts, 20 seasons: under alert <b>' + pct(sc.alertShare) + '</b> of days, catches <b>' + pct(sc.catchRate) + '</b> of outbreak-weeks, and <b>' + pct(sc.published) + '</b> of reports had a period in the 28 days before</span>';
		}
		draw();
		if ('ResizeObserver' in window) new ResizeObserver(draw).observe(root); else window.addEventListener('resize', draw);
	}

	// ---- 3. A season on the map ------------------------------------------------------
	function unpackBits(b64, n) { var bin = atob(b64), out = new Uint8Array(n); for (var i = 0; i < n; i++) out[i] = (bin.charCodeAt(i >> 3) >> (i & 7)) & 1; return out; }
	function mountMap(root) {
		var canvas = root.querySelector('canvas'), hud = root.querySelector('[data-role="hud"]'), selY = root.querySelector('[data-role="year"]');
		var years = Object.keys(D.anim); years.forEach(function (y) { option(selY, y, y, y === '2024'); });
		var day = 0, playing = false, timer = null, flags = {}, reports = [], byDay = [];
		var byOc = {}; D.districts.forEach(function (d) { byOc[d.oc] = d; });
		function load() {
			var a = D.anim[selY.value]; flags = {}; for (var oc in a.alert) flags[oc] = unpackBits(a.alert[oc], C.DAYS);
			reports = a.reports; byDay = []; for (var i = 0; i < C.DAYS; i++) byDay.push([]); reports.forEach(function (r) { byDay[r[1]].push(r[0]); });
			day = 0; draw();
		}
		var cosLat = Math.cos(55 * Math.PI / 180);
		function proj(lon, lat, s, ox, oy) { return [ox + (lon + 8.2) * cosLat * s, oy + (60.9 - lat) * s]; }
		function draw() {
			var w = canvas.clientWidth || 600, h = Math.round(w * 1.05), g = setupCanvas(canvas, w, h);
			var s = Math.min(w / ((2.0 + 8.2) * cosLat), h / (60.9 - 49.8)) * 0.98, ox = (w - (10.2) * cosLat * s) / 2, oy = 4;
			g.clearRect(0, 0, w, h); g.font = FONT;
			g.strokeStyle = 'rgba(132,144,181,0.35)'; g.fillStyle = 'rgba(132,144,181,0.06)'; g.lineWidth = 1;
			D.coast.forEach(function (ring) { g.beginPath(); ring.forEach(function (p, i) { var q = proj(p[0], p[1], s, ox, oy); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.closePath(); g.fill(); g.stroke(); });
			var on = 0, total = 0;
			D.districts.forEach(function (d) {
				var f = flags[d.oc]; if (!f) return; total++;
				var q = proj(d.lon, d.lat, s, ox, oy), r = 2.2 + Math.sqrt(d.n) * 0.35;
				if (f[day]) { on++; g.fillStyle = 'rgba(169,63,224,0.75)'; } else g.fillStyle = 'rgba(76,84,112,0.6)';
				g.beginPath(); g.arc(q[0], q[1], r, 0, Math.PI * 2); g.fill();
			});
			var sofar = 0;
			for (var t = 0; t <= day; t++) byDay[t].forEach(function (oc) {
				sofar++; var age = day - t; if (age > 21) return; var d = byOc[oc]; if (!d) return;
				var q = proj(d.lon, d.lat, s, ox, oy); g.strokeStyle = 'rgba(201,124,18,' + (1 - age / 22).toFixed(2) + ')'; g.lineWidth = age < 2 ? 2.5 : 1.5;
				g.beginPath(); g.arc(q[0], q[1], 5 + age * 0.6, 0, Math.PI * 2); g.stroke();
			});
			g.lineWidth = 1; g.fillStyle = COL.val; g.textAlign = 'left'; g.textBaseline = 'top'; g.font = '13px ui-monospace, Menlo, Consolas, monospace';
			g.fillText(dateLabel(parseInt(selY.value, 10), day), 8, 8);
			g.font = FONT; g.fillStyle = COL.text; g.fillText(pct(on / (total || 1)) + ' of districts under alert', 8, 26); g.fillText(sofar + ' report' + (sofar === 1 ? '' : 's') + ' so far', 8, 40);
			hud.innerHTML = '<span>purple: under a Hutton alert that day · grey: not · orange rings: reports, fading over three weeks · dot size: reports 2006 to 2025</span>';
		}
		function tick() { if (day >= C.DAYS - 1) { stop(); return; } day++; draw(); }
		function play() { if (playing) return; if (day >= C.DAYS - 1) day = 0; playing = true; root.querySelector('[data-action="play"]').textContent = 'Pause'; timer = setInterval(tick, 90); }
		function stop() { playing = false; root.querySelector('[data-action="play"]').textContent = day >= C.DAYS - 1 ? 'Play again' : 'Play'; clearInterval(timer); }
		root.querySelector('[data-action="play"]').addEventListener('click', function () { if (playing) stop(); else play(); });
		root.querySelector('[data-action="step"]').addEventListener('click', function () { stop(); if (day < C.DAYS - 1) { day++; draw(); } });
		root.querySelector('[data-action="reset"]').addEventListener('click', function () { stop(); day = 0; draw(); root.querySelector('[data-action="play"]').textContent = 'Play'; });
		selY.addEventListener('change', function () { stop(); load(); root.querySelector('[data-action="play"]').textContent = 'Play'; });
		load();
		if ('ResizeObserver' in window) new ResizeObserver(draw).observe(root); else window.addEventListener('resize', draw);
	}

	// ---- 4. What a sharper warning looks at --------------------------------------------
	function mountThoughts(root) {
		var canvas = root.querySelector('canvas'), selD = root.querySelector('[data-role="district"]'), selY = root.querySelector('[data-role="year"]');
		var slider = root.querySelector('[data-role="day"]'), dateEl = root.querySelector('[data-role="date"]'), badge = root.querySelector('[data-role="badge"]');
		var barsEl = root.querySelector('[data-role="bars"]');
		D.order.forEach(function (oc) { if (D.model[oc]) option(selD, oc, D.names[oc], oc === 'DD8'); });
		function fillYears() { var cur = selY.value; selY.innerHTML = ''; Object.keys(D.model[selD.value]).forEach(function (y) { option(selY, y, D.demo[selD.value] && D.demo[selD.value][y] && D.demo[selD.value][y].live ? y + ' so far (live)' : y, y === (cur || '2024')); }); }
		fillYears();
		document.addEventListener('blight-season-added', function () { fillYears(); drawStrip(); });
		var INPUTS = [
			['clim', 'week of the year', 'share of district-days followed by a report in this week of earlier seasons', 0.03, COL.orange, function (v) { return pct(v, 1); }],
			['kern', 'nearby reports', 'reports nearby, weighted by distance and recency (30 km, 10 day scales)', 4, COL.green, function (v) { return v.toFixed(2); }],
			['prior', 'district history', 'reports per season in this district before this season', 8, COL.grey, function (v) { return v.toFixed(1); }],
			['hd14', 'Hutton days in 14', 'days in the last fortnight meeting the Hutton criteria', 14, COL.purple, function (v) { return v.toFixed(0); }],
		];
		var rows = INPUTS.map(function (inp) {
			var r = document.createElement('div'); r.className = 'bl-bar';
			r.innerHTML = '<span class="bl-bar-label" title="' + inp[2] + '">' + inp[1] + '</span><span class="bl-bar-track"><i style="background:' + inp[4] + '"></i></span><span class="bl-bar-val"></span>';
			barsEl.appendChild(r); return { fill: r.querySelector('i'), val: r.querySelector('.bl-bar-val'), inp: inp };
		});
		var pRow = document.createElement('div'); pRow.className = 'bl-bar bl-bar-p';
		pRow.innerHTML = '<span class="bl-bar-label" title="the full model\'s chance of a report in this district in the next 7 days">model: report here this week</span><span class="bl-bar-track"><i style="background:' + COL.hi + '"></i></span><span class="bl-bar-val"></span>';
		barsEl.appendChild(pRow);
		var pwRow = document.createElement('div'); pwRow.className = 'bl-bar';
		pwRow.innerHTML = '<span class="bl-bar-label">weather-only model</span><span class="bl-bar-track"><i style="background:' + COL.blue + '"></i></span><span class="bl-bar-val"></span>';
		barsEl.appendChild(pwRow);
		function cur() { return D.model[selD.value][selY.value]; }
		function drawStrip() {
			var m = cur(), s = D.demo[selD.value][selY.value], day = parseInt(slider.value, 10);
			var w = canvas.clientWidth || 600, h = 120, g = setupCanvas(canvas, w, h);
			var pad = { l: 34, r: 10, t: 16, b: 20 }, W = w - pad.l - pad.r, n = C.DAYS, X = function (i) { return pad.l + i / n * W; }, dx = W / n;
			var pmax = Math.max(0.1, Math.ceil(Math.max.apply(null, m.p.concat(m.pw).filter(function (v) { return v != null; })) * 20) / 20), Y = function (v) { return h - pad.b - Math.min(1, v / pmax) * (h - pad.b - pad.t); };
			g.clearRect(0, 0, w, h); g.font = FONT;
			var f = C.flags(s.tmin, s.rh, C.HUTTON);
			for (var i = 0; i < n; i++) if (f.alert[i]) { g.fillStyle = COL.alert; g.fillRect(X(i), pad.t, dx + 0.5, h - pad.b - pad.t); }
			g.strokeStyle = COL.axis; g.fillStyle = COL.text; g.textAlign = 'left'; g.textBaseline = 'top';
			MONTH_START.forEach(function (ms, k) { g.beginPath(); g.moveTo(X(ms) + 0.5, pad.t); g.lineTo(X(ms) + 0.5, h - pad.b); g.stroke(); g.fillText(MONTHS[k], X(ms) + 3, h - pad.b + 4); });
			g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(Math.round(pmax * 100) + '%', pad.l - 4, Y(pmax)); g.fillText('0', pad.l - 4, Y(0));
			[['pw', COL.blue, 1.2], ['p', COL.hi, 2]].forEach(function (ser) {
				g.strokeStyle = ser[1]; g.lineWidth = ser[2]; g.beginPath(); var st = false;
				for (i = 0; i < n; i++) { var v = m[ser[0]][i]; if (v == null) { st = false; continue; } var x = X(i) + dx / 2; if (!st) { g.moveTo(x, Y(v)); st = true; } else g.lineTo(x, Y(v)); }
				g.stroke();
			});
			g.lineWidth = 1;
			s.reports.forEach(function (r) { var x = X(r[0]) + dx / 2; g.fillStyle = COL.orange; g.beginPath(); g.moveTo(x, pad.t - 2); g.lineTo(x - 5, pad.t - 12); g.lineTo(x + 5, pad.t - 12); g.closePath(); g.fill(); });
			g.strokeStyle = COL.val; g.beginPath(); g.moveTo(X(day) + dx / 2, pad.t - 12); g.lineTo(X(day) + dx / 2, h - pad.b); g.stroke();
			if (s.live) { var tx = X(s.forecastFrom) + dx / 2; g.strokeStyle = COL.text; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(tx, pad.t); g.lineTo(tx, h - pad.b); g.stroke(); g.setLineDash([]); g.fillStyle = COL.text; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText('today', tx + 4, pad.t); }
			// readout
			var alertOn = f.alert[day];
			dateEl.textContent = dateLabel(parseInt(selY.value, 10), day);
			badge.textContent = alertOn ? 'Hutton alert on' : 'no Hutton alert'; badge.className = 'bl-badge ' + (alertOn ? 'on' : 'off');
			rows.forEach(function (r) { var v = r.inp[0] === 'clim' ? D.clim[selY.value][day] : r.inp[0] === 'prior' ? m.prior : m[r.inp[0]][day]; var ok = v != null; r.fill.style.width = ok ? Math.min(100, v / r.inp[3] * 100) + '%' : '0'; r.val.textContent = ok ? r.inp[5](v) : ''; });
			var p = m.p[day], pw = m.pw[day];
			pRow.querySelector('i').style.width = p == null ? '0' : Math.min(100, p / pmax * 100) + '%'; pRow.querySelector('.bl-bar-val').textContent = p == null ? '' : pct(p, 1);
			pwRow.querySelector('i').style.width = pw == null ? '0' : Math.min(100, pw / pmax * 100) + '%'; pwRow.querySelector('.bl-bar-val').textContent = pw == null ? '' : pct(pw, 1);
			pwRow.hidden = !m.pw.some(function (v) { return v != null; });   // the live season has no weather-only model
			var next = s.reports.filter(function (r) { return r[0] > day && r[0] <= day + 7; }).length;
			var soon = root.querySelector('[data-role="soon"]'); if (soon) soon.textContent = next ? next + ' report' + (next > 1 ? 's' : '') + ' in this district in the next 7 days' : 'no report here in the next 7 days';
		}
		slider.addEventListener('input', drawStrip);
		selD.addEventListener('change', function () { fillYears(); drawStrip(); }); selY.addEventListener('change', drawStrip);
		canvas.addEventListener('pointerdown', function (e) { var r = canvas.getBoundingClientRect(); var w = r.width, x = (e.clientX - r.left - 34) / (w - 44); slider.value = Math.max(0, Math.min(C.DAYS - 1, Math.round(x * C.DAYS))); drawStrip(); });
		canvas.addEventListener('pointermove', function (e) { if (e.buttons) { var r = canvas.getBoundingClientRect(); var w = r.width, x = (e.clientX - r.left - 34) / (w - 44); slider.value = Math.max(0, Math.min(C.DAYS - 1, Math.round(x * C.DAYS))); drawStrip(); } });
		drawStrip();
		if ('ResizeObserver' in window) new ResizeObserver(drawStrip).observe(root); else window.addEventListener('resize', drawStrip);
	}

	// ---- Chart tooltips (same mechanism as the other posts) -------------------------
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
		C = globalThis.__BlightCore; D = globalThis.__BlightData;
		if (!C || !D || !document.querySelector('[data-blight-season], [data-blight-score], [data-blight-map], [data-blight-thoughts]')) return false;
		var m = [['[data-blight-season]', mountSeason], ['[data-blight-score]', mountScore], ['[data-blight-map]', mountMap], ['[data-blight-thoughts]', mountThoughts]];
		m.forEach(function (pair) { document.querySelectorAll(pair[0]).forEach(function (r) { if (!r.dataset.ready) { r.dataset.ready = '1'; pair[1](r); } }); });
		mountFigures();
		return true;
	}
	function mountWhenReady() {
		var tries = 0;
		(function attempt() { if (!mountAll() && tries++ < 400) setTimeout(attempt, 50); })();
	}
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountWhenReady); else mountWhenReady();
	document.addEventListener('astro:page-load', mountWhenReady);
})();
