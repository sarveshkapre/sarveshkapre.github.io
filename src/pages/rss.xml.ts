import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context: { site: URL }) {
	const posts = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft);
	posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

	return rss({
		title: 'Sarvesh Kapre',
		description: 'Blog posts by Sarvesh Kapre.',
		site: context.site,
		items: posts.map((post) => ({
			title: post.data.title,
			pubDate: post.data.pubDate,
			description: post.data.description,
			link: `/blog/${post.slug}/`,
		})),
	});
}

