import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import expressiveCode from 'astro-expressive-code';
import pagefind from 'astro-pagefind';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

// https://astro.build/config
export default defineConfig({
	site: 'https://samuellbrown.dev',
	integrations: [
		expressiveCode({
			themes: ['github-dark'],
			styleOverrides: {
				borderRadius: '0.75rem',
				codeFontSize: '0.875rem',
			},
		}),
		sitemap(),
		pagefind(),
	],
	markdown: {
		rehypePlugins: [
			[
				rehypeAutolinkHeadings,
				{
					behavior: 'append',
					properties: { className: ['anchor-link'], ariaHidden: 'true', tabIndex: -1 },
					content: { type: 'text', value: ' #' },
				},
			],
		],
	},
});
