import rss from '@astrojs/rss';
import { getPublishedPosts } from '../utils';

export async function GET(context) {
	const posts = await getPublishedPosts();
	return rss({
		title: 'Samuel Brown',
		description: 'Articles and notes by Samuel Brown',
		site: context.site,
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.publishDate,
			link: `/blog/${post.id}/`,
		})),
	});
}
