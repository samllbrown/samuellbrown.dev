/*
 * The potato blight warning that's always on: the live outlook.
 *
 * Mounts [data-blight-live]: fetches live/latest.json from the blight-forecast repo (written each
 * morning by its GitHub Action), draws today's map and the week ahead, the season so far, and adds
 * the current season to the year lists of the other demos. A postcode box (geocoded through
 * postcodes.io, falling back to the district centroids in the file) or a click on the map picks one
 * district and shows its inputs, its week ahead and the scored districts around it.
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
	function km(lat1, lon1, lat2, lon2) {
		var r = Math.PI / 180, dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
		var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
		return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	}
	// "DD8 3QU", "dd83qu" or "DD8" -> { oc, unit } or null.
	function parsePostcode(q) {
		var m = String(q || '').toUpperCase().replace(/[^A-Z0-9]/g, '').match(/^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})?$/);
		return m ? { oc: m[1], unit: m[2] || null } : null;
	}

	function mountLive(root) {
		var src = root.dataset.src, mapC = root.querySelector('[data-role="map"]'), stripC = root.querySelector('[data-role="strip"]');
		var hud = root.querySelector('[data-role="hud"]'), dayRow = root.querySelector('[data-role="days"]'), scoreEl = root.querySelector('[data-role="score"]');
		var stamp = root.querySelector('[data-role="stamp"]');
		var form = root.querySelector('[data-role="lookup"]'), msgEl = root.querySelector('[data-role="lookup-msg"]');
		var placeEl = root.querySelector('[data-role="place"]'), weekC = root.querySelector('[data-role="week"]');
		var L = null, day = 0, sel = null, byOc = {}, mapT = null, weekT = null;
		hud.innerHTML = '<span>loading this morning’s outlook…</span>';
		fetch(src, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (j) { L = j; build(); }).catch(function (e) {
			hud.innerHTML = '<span>Couldn’t load the outlook (' + e.message + '). The file is written each morning by the blight-forecast repo’s action; if it is missing, the run has not happened yet.</span>';
		});
		function build() {
			var today = parseDay(L.today);
			L.districts.forEach(function (d) { byOc[d.oc] = d; });
			L.days.forEach(function (ds, i) {
				var b = document.createElement('button'); b.type = 'button'; b.dataset.day = i;
				b.textContent = i === 0 ? 'today' : fmtDay(parseDay(ds), true);
				b.addEventListener('click', function () { day = i; draw(); });
				dayRow.appendChild(b);
			});
			if (stamp) stamp.innerHTML = 'fetched just now from <a href="https://github.com/samllbrown/blight-forecast/blob/master/live/latest.json">blight-forecast/live/latest.json</a>, written by <a href="https://github.com/samllbrown/blight-forecast/actions/workflows/live.yml">the daily action</a> at ' + L.generated.replace('T', ' ').slice(0, 16) + ' with the model fitted on ' + L.fitted_seasons[0] + ' to ' + L.fitted_seasons[1] + '; postcodes are looked up through <a href="https://postcodes.io">postcodes.io</a>';
			if (scoreEl && L.score) {
				var s = L.score;
				scoreEl.innerHTML = '<b>' + L.season + ' so far</b> (1 May to ' + fmtDay(parseDay(s.through)) + ', ' + s.positives + ' district-days followed by a report): the Hutton alert was on for <b>' + pct(s.hutton_alert_share) + '</b> of district-days and caught <b>' + pct(s.hutton_catch) + '</b> of them (AUC ' + s.hutton_auc.toFixed(2) + '); the model ranks them at AUC <b>' + s.model_auc.toFixed(2) + '</b> and catches the same share on <b>' + pct(s.model_rate_for_hutton_catch) + '</b> of days.';
			} else if (scoreEl) scoreEl.textContent = '';
			addSeasonToDemos(today);
			wireLookup();
			draw();
			if ('ResizeObserver' in window) new ResizeObserver(draw).observe(root); else window.addEventListener('resize', draw);
		}

		// --- the postcode checker ---
		function wireLookup() {
			if (form) {
				var input = form.querySelector('input');
				form.addEventListener('submit', function (e) { e.preventDefault(); lookup(input.value); });
				root.querySelectorAll('[data-example]').forEach(function (b) { b.addEventListener('click', function () { input.value = b.dataset.example; lookup(b.dataset.example); }); });
			}
			mapC.addEventListener('click', function (e) {
				if (!mapT) return;
				var r = mapC.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, best = null, bd = 14;
				L.districts.forEach(function (d) { var q = proj(d.lon, d.lat, mapT.s, mapT.ox, mapT.oy), dd = Math.hypot(q[0] - x, q[1] - y); if (dd < bd) { bd = dd; best = d; } });
				if (!best) return;
				if (form) form.querySelector('input').value = best.oc;
				choose({ oc: best.oc, label: best.oc, lat: best.lat, lon: best.lon, clicked: true });
			});
			if (weekC) {
				weekC.addEventListener('click', function (e) { var i = weekIndex(e); if (i != null) { day = i; draw(); } });
				weekC.addEventListener('mousemove', function (e) { var i = weekIndex(e); weekC.style.cursor = i == null ? 'default' : 'pointer'; });
			}
		}
		function weekIndex(e) {
			if (!weekT) return null;
			var r = weekC.getBoundingClientRect(), x = e.clientX - r.left, i = Math.floor((x - weekT.l) / weekT.dx);
			return i >= 0 && i < L.days.length ? i : null;
		}
		function say(msg, bad) { if (msgEl) { msgEl.textContent = msg || ''; msgEl.classList.toggle('bad', !!bad); } }
		function lookup(q) {
			var pc = parsePostcode(q);
			if (!pc) { say('that doesn’t look like a UK postcode or district', true); return; }
			var label = pc.unit ? pc.oc + ' ' + pc.unit : pc.oc;
			var url = pc.unit ? 'https://api.postcodes.io/postcodes/' + encodeURIComponent(pc.oc + pc.unit) : 'https://api.postcodes.io/outcodes/' + encodeURIComponent(pc.oc);
			say('looking up ' + label + '…');
			fetch(url).then(function (r) { return r.json(); }).then(function (j) {
				var res = j && j.status === 200 && j.result;
				if (!res || res.latitude == null) throw new Error('not found');
				choose({ oc: res.outcode || pc.oc, label: label, lat: res.latitude, lon: res.longitude, admin: [].concat(res.admin_district || [])[0] || null });
			}).catch(function () {
				var own = byOc[pc.oc];
				if (own) choose({ oc: pc.oc, label: label, lat: own.lat, lon: own.lon, approx: true });
				else say('couldn’t find ' + label + ' (postcodes.io didn’t know it, and it isn’t one of the scored districts)', true);
			});
		}
		function choose(pt) {
			var ranked = L.districts.map(function (d) { return { d: d, km: km(pt.lat, pt.lon, d.lat, d.lon) }; }).sort(function (a, b) { return a.km - b.km; });
			var own = null; ranked.forEach(function (r) { if (r.d.oc === pt.oc) own = r; });
			var primary = own || ranked[0];
			sel = { pt: pt, own: !!own, primary: primary, near: ranked.filter(function (r) { return r !== primary; }).slice(0, 3) };
			say('');
			draw();
			if (placeEl && !pt.clicked) placeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		}
		function binLabel(b) { return ['below the Hutton alert’s rate', 'above the Hutton alert’s rate', 'above the model’s 30% line', 'in the model’s top tenth'][b]; }
		function drawPlace() {
			if (!placeEl) return;
			if (!sel) { placeEl.hidden = true; return; }
			placeEl.hidden = false;
			var d = sel.primary.d, pt = sel.pt, p = d.p[day], a = d.alert[day], b = bin(p), shown = parseDay(L.days[day]);
			var where = pt.label + (pt.admin ? ' (' + pt.admin + ')' : '');
			var head;
			if (sel.own) head = '<b>' + where + '</b> is in district <b>' + d.oc + '</b>' + (L.names[d.oc] ? ', ' + L.names[d.oc] : '') + (sel.primary.km < 1 ? ', scored at the spot its past reports cluster around' : ', scored ' + Math.round(sel.primary.km) + ' km from here at the spot its past reports cluster around') + (pt.approx ? ' (postcodes.io didn’t answer, so this is the district’s centre)' : '') + '.';
			else head = '<b>' + where + '</b> is in district ' + pt.oc + ', which has had no blight report since ' + L.fitted_seasons[0] + ' so it isn’t scored; the nearest scored district is <b>' + d.oc + '</b>, ' + Math.round(sel.primary.km) + ' km away.';
			var tiles = p == null ? '<div class="bl-tile"><b class="off">no data</b><span>no weather for this district on this day</span></div>' :
				'<div class="bl-tile"><b>' + pct(p, 2) + '</b><span>model’s chance of a report in ' + d.oc + ' in the seven days from ' + fmtDay(shown) + ', ' + binLabel(b) + ' (season average ' + pct(L.thresholds.base_rate, 1) + ')</span></div>' +
				'<div class="bl-tile"><b class="' + (a ? '' : 'off') + '">' + (a ? 'on' : 'off') + '</b><span>Hutton alert, with ' + d.hd14[day].toFixed(0) + ' of the 14 days before meeting the criteria</span></div>' +
				'<div class="bl-tile"><b>' + d.near100[day].toFixed(0) + '</b><span>reports within 100 km in the 28 days before</span></div>' +
				'<div class="bl-tile"><b>' + d.prior.toFixed(1) + '</b><span>reports per season in ' + d.oc + ', ' + L.fitted_seasons[0] + ' to ' + L.fitted_seasons[1] + '</span></div>';
			var near = sel.near.map(function (r) { var q = r.d.p[day]; return r.d.oc + ' (' + Math.round(r.km) + ' km) ' + (q == null ? 'no data' : pct(q, 2) + (r.d.alert[day] ? ', alert on' : '')); }).join(' · ');
			placeEl.querySelector('[data-role="place-head"]').innerHTML = head;
			placeEl.querySelector('[data-role="place-tiles"]').innerHTML = tiles;
			placeEl.querySelector('[data-role="place-near"]').innerHTML = 'bars: the model’s chance of a report in ' + d.oc + ' in the seven days from each day (white box: Hutton alert on) · dashed lines, bottom to top: the Hutton alert’s rate, the model’s 30% line, the season average, the top tenth · grey lines: the nearest scored districts · shaded days are forecast · click a bar to pick that day<br>nearest other scored districts on ' + fmtDay(shown) + ': ' + near;
			drawWeek();
		}
		function drawWeek() {
			if (!weekC || !sel) return;
			var d = sel.primary.d, t = L.thresholds, n = L.days.length;
			var w = weekC.clientWidth || 600, h = 190, g = setupCanvas(weekC, w, h);
			var narrow = w < 520, pad = { l: 44, r: narrow ? 8 : 100, t: 22, b: 30 }, W = w - pad.l - pad.r, H = h - pad.t - pad.b, dx = W / n;
			var all = [t.model_30 * 4, t.base_rate].concat(d.p, [].concat.apply([], sel.near.map(function (r) { return r.d.p; }))).filter(function (v) { return v != null; });
			var lo = 1e-4, hi = Math.max.apply(null, all) * 1.6;
			var Y = function (v) { return pad.t + H - (Math.log(Math.max(lo, v)) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)) * H; };
			weekT = { l: pad.l, dx: dx };
			g.clearRect(0, 0, w, h); g.font = FONT;
			g.fillStyle = 'rgba(233,230,221,0.06)'; g.fillRect(pad.l + dx, pad.t, W - dx, H);
			g.fillStyle = 'rgba(197,97,246,0.10)'; g.fillRect(pad.l + day * dx, pad.t, dx, H);
			g.textAlign = 'left'; g.textBaseline = 'middle';
			var lines = [[t.model_hutton_rate, 'Hutton’s rate', COL.grey], [t.model_30, '30% line', COL.purple], [t.model_30 * 4, 'top tenth', COL.hi], [t.base_rate, 'season average', COL.orange]]
				.map(function (k) { return { v: k[0], name: k[1], col: k[2], y: Y(k[0]), ly: Y(k[0]) }; }).sort(function (a, b) { return a.y - b.y; });
			for (var pass = 0; pass < 4; pass++) for (var i = 1; i < lines.length; i++) if (lines[i].ly - lines[i - 1].ly < 12) { lines[i].ly = lines[i - 1].ly + 12; }
			lines.forEach(function (k) {
				g.strokeStyle = k.col; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(pad.l, k.y + 0.5); g.lineTo(pad.l + W, k.y + 0.5); g.stroke(); g.setLineDash([]);
				g.fillStyle = k.col;
				if (!narrow) g.fillText(k.name, pad.l + W + 6, k.ly);
			});
			g.strokeStyle = COL.axis; g.beginPath(); g.moveTo(pad.l + 0.5, pad.t); g.lineTo(pad.l + 0.5, pad.t + H); g.lineTo(pad.l + W, pad.t + H); g.stroke();
			g.fillStyle = COL.text; g.textAlign = 'right';
			[0.0001, 0.001, 0.01, 0.1].forEach(function (v) { if (v <= hi) g.fillText(pct(v, v < 0.001 ? 2 : v < 0.01 ? 1 : 0), pad.l - 5, Y(v)); });
			// nearby districts as thin lines
			sel.near.forEach(function (r) {
				g.strokeStyle = 'rgba(132,144,181,0.55)'; g.lineWidth = 1; g.beginPath(); var st = false;
				r.d.p.forEach(function (v, i) { if (v == null) return; var x = pad.l + (i + 0.5) * dx, y = Y(v); if (!st) { g.moveTo(x, y); st = true; } else g.lineTo(x, y); });
				g.stroke();
			});
			// this district as bars
			d.p.forEach(function (v, i) {
				var x = pad.l + i * dx + dx * 0.22, bw = dx * 0.56;
				if (v == null) { g.fillStyle = COL.text; g.textAlign = 'center'; g.fillText('no data', pad.l + (i + 0.5) * dx, pad.t + H / 2); return; }
				var b = bin(v); g.fillStyle = FILL[b]; g.fillRect(x, Y(v), bw, pad.t + H - Y(v));
				if (d.alert[i]) { g.strokeStyle = 'rgba(233,230,221,0.6)'; g.lineWidth = 1; g.strokeRect(x - 2.5, Y(v) - 2.5, bw + 5, pad.t + H - Y(v) + 2.5); }
				if (dx >= 46 || i === day) { g.fillStyle = i === day ? COL.val : COL.text; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillText(pct(v, 2), pad.l + (i + 0.5) * dx, Y(v) - (d.alert[i] ? 5 : 2)); }
				g.textBaseline = 'middle';
			});
			g.fillStyle = COL.text; g.textAlign = 'center'; g.textBaseline = 'top';
			L.days.forEach(function (ds, i) { g.fillStyle = i === day ? COL.val : COL.text; g.fillText(i === 0 ? 'today' : dx >= 46 ? fmtDay(parseDay(ds), true).slice(0, 6) : String(parseDay(ds).getUTCDate()), pad.l + (i + 0.5) * dx, pad.t + H + 5); });
			g.textAlign = 'left'; g.fillStyle = COL.text;
			g.fillText(d.oc + ', today and the week ahead', pad.l + 4, 4);
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
			mapT = { s: s, ox: ox, oy: oy };
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
			if (sel) {
				sel.near.forEach(function (r) { var q = proj(r.d.lon, r.d.lat, s, ox, oy); g.strokeStyle = 'rgba(233,230,221,0.5)'; g.lineWidth = 1; g.beginPath(); g.arc(q[0], q[1], 7, 0, Math.PI * 2); g.stroke(); });
				var q = proj(sel.primary.d.lon, sel.primary.d.lat, s, ox, oy), m = proj(sel.pt.lon, sel.pt.lat, s, ox, oy);
				g.strokeStyle = COL.val; g.lineWidth = 1.2; g.beginPath(); g.moveTo(m[0], m[1]); g.lineTo(q[0], q[1]); g.stroke();
				g.strokeStyle = COL.val; g.lineWidth = 2; g.beginPath(); g.arc(q[0], q[1], 10, 0, Math.PI * 2); g.stroke();
				g.strokeStyle = COL.val; g.lineWidth = 1.5; g.beginPath(); g.moveTo(m[0] - 6, m[1]); g.lineTo(m[0] + 6, m[1]); g.moveTo(m[0], m[1] - 6); g.lineTo(m[0], m[1] + 6); g.stroke();
				g.fillStyle = COL.val; g.font = '12px ui-monospace, Menlo, Consolas, monospace'; g.textAlign = 'left'; g.textBaseline = 'middle';
				var lx = q[0] + 14, ly = q[1]; if (lx + 40 > w) { g.textAlign = 'right'; lx = q[0] - 14; }
				g.fillText(sel.primary.d.oc, lx, ly); g.font = FONT;
			}
			g.lineWidth = 1; g.fillStyle = COL.val; g.textAlign = 'left'; g.textBaseline = 'top'; g.font = '13px ui-monospace, Menlo, Consolas, monospace';
			g.fillText(fmtDay(shown, true) + ' ' + shown.getUTCFullYear() + (day ? ' (forecast, +' + day + ')' : ''), 8, 8);
			g.font = FONT; g.fillStyle = COL.text;
			g.fillText(pct(on / (total || 1)) + ' of districts under a Hutton alert', 8, 26);
			g.fillText(pct(above / (total || 1)) + ' above the model’s line', 8, 40);
			g.fillText(recent + ' report' + (recent === 1 ? '' : 's') + ' in the three weeks before', 8, 54);
			hud.innerHTML = '<span>fill: the model’s chance of a report here this week (grey below the Hutton alert’s rate, purple above the 30% line, bright in the top tenth) · white ring: Hutton alert on · orange rings: this season’s reports, fading over three weeks</span>';
			drawPlace();
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
