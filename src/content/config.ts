import { defineCollection, z } from 'astro:content';

export const collections = {
	blog: defineCollection({
		type: 'content',
		schema: z.object({
			title: z.string(),
			description: z.string(),
			publishDate: z.coerce.date(),
			tags: z.array(z.string()).default([]),
			img: z.string().optional(),
			img_alt: z.string().optional(),
			draft: z.boolean().default(false),
		}),
	}),
};
