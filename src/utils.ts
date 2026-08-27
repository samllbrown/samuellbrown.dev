import { getCollection, type CollectionEntry } from 'astro:content';

export async function getPublishedPosts(): Promise<CollectionEntry<'blog'>[]> {
	const posts = await getCollection('blog', ({ data }) =>
		import.meta.env.PROD ? !data.draft : true
	);
	return posts.sort((a, b) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf());
}

export function formatDate(date: Date): string {
	return new Intl.DateTimeFormat('en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	}).format(date);
}

export function readingTime(body: string): string {
	// Count prose only: drop embedded scripts, styles, inline SVG and tags.
	const prose = body
		.replace(/<(script|style|svg)[\s\S]*?<\/\1>/g, ' ')
		.replace(/<[^>]+>/g, ' ');
	const words = prose.trim().split(/\s+/).length;
	return `${Math.max(1, Math.round(words / 200))} min read`;
}

export function slugifyTag(tag: string): string {
	return tag
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}
