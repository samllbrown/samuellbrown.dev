/*
 * Blight core: the Smith/Hutton family of rules and how to score them, as pure
 * functions shared by the post's demos and scripts/blight-experiments.mjs.
 * Plain script (no import/export) so Node can load it for its side effect.
 *
 * A season is 184 days (1 May to 31 Oct). tmin is in tenths of a degree, rh is
 * hours with RH >= 90% that day; either may be null for a missing day.
 */
(function () {
	'use strict';
	var DAYS = 184;

	/** Apply a rule. rule = { tmin: 10, hours: 6, days: 2, window: 14 } */
	function flags(tmin, rh, rule) {
		var n = tmin.length, day = new Uint8Array(n), period = new Uint8Array(n), alert = new Uint8Array(n);
		var run = 0, last = -1e9;
		for (var i = 0; i < n; i++) {
			var ok = tmin[i] != null && rh[i] != null && tmin[i] >= rule.tmin * 10 && rh[i] >= rule.hours;
			day[i] = ok ? 1 : 0;
			run = ok ? run + 1 : 0;
			if (run >= rule.days) { period[i] = 1; last = i; }
			alert[i] = i - last < rule.window ? 1 : 0;
		}
		return { day: day, period: period, alert: alert };
	}

	/**
	 * Score one season the way the panel does: a day is a positive if a report
	 * follows within `horizon` days; the alert catches it if it is on that day.
	 * Also the published metric: a report counts as warned if a period fell in
	 * the 28 days up to and including the report day.
	 */
	function scoreSeason(f, reports, horizon) {
		horizon = horizon || 7;
		var n = f.alert.length, pos = new Uint8Array(n), i, r;
		for (r = 0; r < reports.length; r++) for (i = Math.max(0, reports[r] - horizon); i < reports[r]; i++) pos[i] = 1;
		var days = 0, on = 0, npos = 0, caught = 0;
		for (i = 0; i < n; i++) { days++; if (f.alert[i]) on++; if (pos[i]) { npos++; if (f.alert[i]) caught++; } }
		var warned = 0;
		for (r = 0; r < reports.length; r++) {
			var w = 0;
			for (i = Math.max(0, reports[r] - 28); i <= reports[r] && i < n; i++) if (f.period[i]) { w = 1; break; }
			warned += w;
		}
		return { days: days, on: on, npos: npos, caught: caught, reports: reports.length, warned: warned };
	}

	/** Score a rule over every district and season in the demo library. */
	function scoreAll(demo, rule, horizon) {
		var tot = { days: 0, on: 0, npos: 0, caught: 0, reports: 0, warned: 0 };
		for (var oc in demo) for (var y in demo[oc]) {
			var s = demo[oc][y], f = flags(s.tmin, s.rh, rule);
			var sc = scoreSeason(f, s.reports.map(function (r) { return r[0]; }), horizon);
			for (var k in tot) tot[k] += sc[k];
		}
		tot.alertShare = tot.on / tot.days; tot.catchRate = tot.npos ? tot.caught / tot.npos : 0; tot.published = tot.reports ? tot.warned / tot.reports : 0;
		return tot;
	}

	function dateOf(year, offset) {
		var d = new Date(Date.UTC(year, 4, 1)); d.setUTCDate(d.getUTCDate() + offset); return d;
	}

	globalThis.__BlightCore = { DAYS: DAYS, flags: flags, scoreSeason: scoreSeason, scoreAll: scoreAll, dateOf: dateOf,
		HUTTON: { tmin: 10, hours: 6, days: 2, window: 14 }, SMITH: { tmin: 10, hours: 11, days: 2, window: 14 } };
})();
