// The sets that posts belong to, in the order they appear on the home page.
// A post joins a set by putting `series: <id>` in its front matter. Posts in a
// set are shown oldest first, because each one picks up where the last left off.

export interface Series {
	id: string;
	title: string;
	blurb: string;
}

export const series: Series[] = [
	{
		id: 'collie',
		title: 'The robot collie',
		blurb:
			'The same sheepdog problem, tackled three ways. It starts with two rules from a paper that turn ' +
			'out to pen a flock, and I keep adding awkward sheep and obstacles until they stop working. Then ' +
			'the rules go away and a small neural network has to work the job out for itself, evolved one ' +
			'litter at a time, and the last post asks whether you can tell early which training runs to keep.',
	},
	{
		id: 'forecasts',
		title: 'Forecasts for farmers',
		blurb:
			'Britain issues warnings to farmers that rest on rules written decades ago and tested, if at all, ' +
			'only against the years when the disease turned up. I rebuild each one from the same public ' +
			'weather and outbreak records, score it against the days when nothing followed too, and try to ' +
			'find out what the warning is actually telling you.',
	},
];
