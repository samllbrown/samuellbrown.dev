/*
 * The potato blight warning that's always on: the live outlook.
 *
 * Mounts [data-blight-live]: fetches live/latest.json from the blight-forecast repo (written each
 * morning by its GitHub Action), draws today's map and the week ahead, the season so far, and adds
 * the current season to the year lists of the other demos.
 *
 * Needs blight-core.js and blight-data.js (for the coastline and the demo district names).
 */
(function () {
	'use strict';
	if (typeof document === 'undefined') return;
	var C, D;
	var COL = { text: '#8490b5', axis: 'rgba(255,255,255,0.14)', val: '#e9e6dd', purple: '#a93fe0', hi: '#c561f6', orange: '#c97c12', green: '#35a066', grey: '#4c5470' };
	var FONT = '11px ui-monospace, Menlo, Consolas, monospace';
	var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	var pct = function (x, d) { return (x * 100).toFixed(d || 0) + '%'; };
	function setupCanvas(canvas, cssW, cssH) {
		var dpr = Math.min(2, window.devicePixelRatio || 1);
		canvas.style.height = cssH + 'px'; canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
		var g = canvas.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); return g;
	}
	function parseDay(s) { var p = s.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
	function fmtDay(d, withDay) { return (withDay ? DAYS[d.getUTCDay()] + ' ' : '') + d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()]; }
	function daysBetween(a, b) { return Math.round((b - a) / 864e5); }

	function mountLive(root) {
		var src = root.dataset.src, mapC = root.querySelector('[data-role="map"]'), stripC = root.querySelector('[data-role="strip"]');
		var hud = root.querySelector('[data-role="hud"]'), dayRow = root.querySelector('[data-role="days"]'), scoreEl = root.querySelector('[data-role="score"]');
		var stamp = root.querySelector('[data-role="stamp"]');
		var L = null, day = 0;
		hud.innerHTML = '<span>loading this morning’s outlook…</span>';
		fetch(src, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (j) { L = j; build(); }).catch(function (e) {
			hud.innerHTML = '<span>Couldn’t load the outlook (' + e.message + '). The file is written each morning by the blight-forecast repo’s action; if it is missing, the run has not happened yet.</span>';
		});
		function build() {
			var today = parseDay(L.today);
			L.days.forEach(function (ds, i) {
				var b = document.createElement('button'); b.type = 'button'; b.dataset.day = i;
				b.textContent = i === 0 ? 'today' : fmtDay(parseDay(ds), true);
				b.addEventListener('click', function () { day = i; draw(); });
				dayRow.appendChild(b);
			});
			if (stamp) stamp.innerHTML = 'fetched just now from <a href="https://github.com/samllbrown/blight-forecast/blob/master/live/latest.json">blight-forecast/live/latest.json</a>, written by <a href="https://github.com/samllbrown/blight-forecast/actions/workflows/live.yml">the daily action</a> at ' + L.generated.replace('T', ' ').slice(0, 16) + ' with the model fitted on ' + L.fitted_seasons[0] + ' to ' + L.fitted_seasons[1];
			if (scoreEl && L.score) {
				var s = L.score;
				scoreEl.innerHTML = '<b>' + L.season + ' so far</b> (1 May to ' + fmtDay(parseDay(s.through)) + ', ' + s.positives + ' district-days followed by a report): the Hutton alert was on for <b>' + pct(s.hutton_alert_share) + '</b> of district-days and caught <b>' + pct(s.hutton_catch) + '</b> of them (AUC ' + s.hutton_auc.toFixed(2) + '); the model ranks them at AUC <b>' + s.model_auc.toFixed(2) + '</b> and catches the same share on <b>' + pct(s.model_rate_for_hutton_catch) + '</b> of days.';
			} else if (scoreEl) scoreEl.textContent = '';
			addSeasonToDemos(today);
			draw();
			if ('ResizeObserver' in window) new ResizeObserver(draw).observe(root); else window.addEventListener('resize', draw);
		}
		var cosLat = Math.cos(55 * Math.PI / 180);
		function proj(lon, lat, s, ox, oy) { return [ox + (lon + 8.2) * cosLat * s, oy + (60.9 - lat) * s]; }
		function bin(p) { var t = L.thresholds; return p == null ? -1 : p >= t.model_30 * 4 ? 3 : p >= t.model_30 ? 2 : p >= t.model_hutton_rate ? 1 : 0; }
		var FILL = ['rgba(76,84,112,0.55)', 'rgba(169,63,224,0.35)', 'rgba(169,63,224,0.85)', 'rgba(197,97,246,1)'];
		function draw() {
			if (!L) return;
			dayRow.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', +b.dataset.day === day); });
			var today = parseDay(L.today), shown = parseDay(L.days[day]);
			// map
			var w = mapC.clientWidth || 600, h = Math.round(w * 1.05), g = setupCanvas(mapC, w, h);
			var s = Math.min(w / ((2.0 + 8.2) * cosLat), h / (60.9 - 49.8)) * 0.98, ox = (w - 10.2 * cosLat * s) / 2, oy = 4;
			g.clearRect(0, 0, w, h); g.font = FONT;
			g.strokeStyle = 'rgba(132,144,181,0.35)'; g.fillStyle = 'rgba(132,144,181,0.06)'; g.lineWidth = 1;
			D.coast.forEach(function (ring) { g.beginPath(); ring.forEach(function (p, i) { var q = proj(p[0], p[1], s, ox, oy); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.closePath(); g.fill(); g.stroke(); });
			var on = 0, above = 0, total = 0;
			L.districts.forEach(function (d) {
				var p = d.p[day], a = d.alert[day]; if (p == null) return; total++;
				var q = proj(d.lon, d.lat, s, ox, oy), b = bin(p);
				if (b >= 2) above++; if (a) on++;
				g.fillStyle = FILL[Math.max(0, b)]; g.beginPath(); g.arc(q[0], q[1], 2.4 + b * 0.9, 0, Math.PI * 2); g.fill();
				if (a) { g.strokeStyle = 'rgba(233,230,221,0.32)'; g.lineWidth = 0.8; g.beginPath(); g.arc(q[0], q[1], 4.2 + b * 0.9, 0, Math.PI * 2); g.stroke(); }
			});
			var recent = 0;
			L.reports.forEach(function (r) {
				var age = daysBetween(parseDay(r.date), shown); if (age < 0 || age > 21) return; recent++;
				var q = proj(r.lon, r.lat, s, ox, oy); g.strokeStyle = 'rgba(201,124,18,' + (1 - age / 22).toFixed(2) + ')'; g.lineWidth = age < 2 ? 2.5 : 1.5;
				g.beginPath(); g.arc(q[0], q[1], 6 + age * 0.5, 0, Math.PI * 2); g.stroke();
			});
			g.lineWidth = 1; g.fillStyle = COL.val; g.textAlign = 'left'; g.textBaseline = 'top'; g.font = '13px ui-monospace, Menlo, Consolas, monospace';
			g.fillText(fmtDay(shown, true) + ' ' + shown.getUTCFullYear() + (day ? ' (forecast, +' + day + ')' : ''), 8, 8);
			g.font = FONT; g.fillStyle = COL.text;
			g.fillText(pct(on / (total || 1)) + ' of districts under a Hutton alert', 8, 26);
			g.fillText(pct(above / (total || 1)) + ' above the model’s line', 8, 40);
			g.fillText(recent + ' report' + (recent === 1 ? '' : 's') + ' in the three weeks before', 8, 54);
			hud.innerHTML = '<span>fill: the model’s chance of a report here this week (grey below the Hutton alert’s rate, purple above the 30% line, bright in the top tenth) · white ring: Hutton alert on · orange rings: this season’s reports, fading over three weeks</span>';
			drawStrip(today);
		}
		function drawStrip(today) {
			var ser = L.season_series; if (!ser || !ser.length) return;
			var w = stripC.clientWidth || 600, h = 150, g = setupCanvas(stripC, w, h);
			var pad = { l: 34, r: 10, t: 14, b: 20 }, W = w - pad.l - pad.r, H = h - pad.t - pad.b;
			var start = parseDay(L.season + '-05-01'), n = 184, X = function (i) { return pad.l + i / n * W; }, dx = W / n, Y = function (v) { return pad.t + H - v * H; };
			g.clearRect(0, 0, w, h); g.font = FONT;
			var maxRep = Math.max(1, Math.max.apply(null, ser.map(function (r) { return r.reports; })));
			// forecast shading
			ser.forEach(function (r) { if (r.forecast) { var i = daysBetween(start, parseDay(r.date)); g.fillStyle = 'rgba(233,230,221,0.06)'; g.fillRect(X(i), pad.t, dx + 0.5, H); } });
			g.strokeStyle = COL.axis; g.fillStyle = COL.text; g.textAlign = 'left'; g.textBaseline = 'top';
			[0, 31, 61, 92, 123, 153].forEach(function (m, k) { g.beginPath(); g.moveTo(X(m) + 0.5, pad.t); g.lineTo(X(m) + 0.5, h - pad.b); g.stroke(); g.fillText(['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'][k], X(m) + 3, h - pad.b + 4); });
			g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText('100%', pad.l - 4, Y(1)); g.fillText('0', pad.l - 4, Y(0));
			ser.forEach(function (r) { if (r.reports) { var i = daysBetween(start, parseDay(r.date)); g.fillStyle = 'rgba(201,124,18,0.7)'; var bh = r.reports / maxRep * H * 0.5; g.fillRect(X(i), Y(0) - bh, Math.max(1.5, dx - 0.5), bh); } });
			[['alert', COL.purple, 1.5], ['model30', COL.hi, 2]].forEach(function (k) {
				g.strokeStyle = k[1]; g.lineWidth = k[2]; g.beginPath(); var st = false;
				ser.forEach(function (r) { var i = daysBetween(start, parseDay(r.date)); if (i < 0 || i >= n) return; var x = X(i) + dx / 2, y = Y(r[k[0]]); if (!st) { g.moveTo(x, y); st = true; } else g.lineTo(x, y); });
				g.stroke();
			});
			g.lineWidth = 1;
			var ti = daysBetween(start, today); g.strokeStyle = COL.val; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(X(ti) + dx / 2, pad.t); g.lineTo(X(ti) + dx / 2, h - pad.b); g.stroke(); g.setLineDash([]);
			g.fillStyle = COL.text; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText('today', X(ti) + dx / 2 + 4, pad.t);
			g.fillText('share of districts: under Hutton alert, above the model’s 30% line · bars: reports that day (peak ' + maxRep + ')', pad.l + 4, pad.t + 12);
		}
		// Give the season and thoughts demos a "<year> so far" entry built from the live tracks.
		function addSeasonToDemos(today) {
			var y = String(L.season), tr = L.tracks || {};
			Object.keys(tr).forEach(function (oc) {
				var t = tr[oc];
				if (D.demo[oc]) D.demo[oc][y] = { tmin: t.tmin, rh: t.rh, reports: t.reports, live: true, forecastFrom: t.forecast_from };
				if (D.model[oc]) D.model[oc][y] = { p: t.p, pw: t.p.map(function () { return null; }), kern: t.kern, hd14: t.hd14, prior: L.districts.filter(function (d) { return d.oc === oc; }).map(function (d) { return d.prior; })[0] || 0 };
			});
			if (tr[Object.keys(tr)[0]]) D.clim[y] = tr[Object.keys(tr)[0]].clim;
			document.dispatchEvent(new CustomEvent('blight-season-added', { detail: { year: y, label: y + ' so far (live)' } }));
		}
	}

	function mountAll() {
		C = globalThis.__BlightCore; D = globalThis.__BlightData;
		var roots = document.querySelectorAll('[data-blight-live]');
		if (!C || !D || !roots.length) return false;
		roots.forEach(function (r) { if (!r.dataset.ready) { r.dataset.ready = '1'; mountLive(r); } });
		return true;
	}
	function mountWhenReady() { var tries = 0; (function attempt() { if (!mountAll() && tries++ < 400) setTimeout(attempt, 50); })(); }
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountWhenReady); else mountWhenReady();
	document.addEventListener('astro:page-load', mountWhenReady);
})();
