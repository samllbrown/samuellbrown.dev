import { readFile } from 'node:fs/promises';

import { Resvg } from '@resvg/resvg-js';
import type { APIRoute } from 'astro';
import satori from 'satori';

import { formatDate, getPublishedPosts } from '../../utils';

const WIDTH = 1200;
const HEIGHT = 630;

interface Props {
	title: string;
	subtitle: string;
}

export async function getStaticPaths() {
	const posts = await getPublishedPosts();
	return [
		{
			params: { slug: 'default' },
			props: { title: 'Samuel Brown', subtitle: 'A software development blog' },
		},
		...posts.map((post) => ({
			params: { slug: post.slug },
			props: { title: post.data.title, subtitle: formatDate(post.data.publishDate) },
		})),
	];
}

export const GET: APIRoute = async ({ props }) => {
	const { title, subtitle } = props as Props;
	const [rubik, publicSans] = await Promise.all([
		readFile('node_modules/@fontsource/rubik/files/rubik-latin-600-normal.woff'),
		readFile('node_modules/@fontsource/public-sans/files/public-sans-latin-400-normal.woff'),
	]);

	const svg = await satori(
		{
			type: 'div',
			props: {
				style: {
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'space-between',
					width: '100%',
					height: '100%',
					padding: '72px',
					backgroundColor: '#090b11',
					backgroundImage: 'radial-gradient(circle at 85% 0%, #2a0a54 0%, #090b11 60%)',
					color: '#ffffff',
					fontFamily: 'Public Sans',
				},
				children: [
					{
						type: 'div',
						props: {
							style: {
								display: 'flex',
								alignItems: 'center',
								gap: '18px',
								fontSize: '30px',
								color: '#a3acc8',
							},
							children: [
								{
									type: 'div',
									props: {
										style: {
											width: '24px',
											height: '24px',
											borderRadius: '7px',
											backgroundImage: 'linear-gradient(135deg, #c561f6, #7611a6)',
										},
									},
								},
								'samuellbrown.dev',
							],
						},
					},
					{
						type: 'div',
						props: {
							style: {
								display: 'flex',
								fontFamily: 'Rubik',
								fontSize: title.length > 40 ? '58px' : '72px',
								fontWeight: 600,
								lineHeight: 1.15,
								maxWidth: '1000px',
							},
							children: title,
						},
					},
					{
						type: 'div',
						props: {
							style: {
								display: 'flex',
								justifyContent: 'space-between',
								fontSize: '30px',
								color: '#a3acc8',
							},
							children: [
								{ type: 'div', props: { children: 'Samuel Brown' } },
								{ type: 'div', props: { children: subtitle } },
							],
						},
					},
				],
			},
		},
		{
			width: WIDTH,
			height: HEIGHT,
			fonts: [
				{ name: 'Rubik', data: rubik, weight: 600, style: 'normal' },
				{ name: 'Public Sans', data: publicSans, weight: 400, style: 'normal' },
			],
		}
	);

	const png = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } }).render().asPng();
	return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
