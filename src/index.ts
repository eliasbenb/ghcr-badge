import { Hono } from 'hono';
import { cache } from 'hono/cache';

interface Env {
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', async (c, next) => {
	await next();
	c.header('Access-Control-Allow-Origin', '*');
});

app.get('/api/:owner/:repo/:pkg', cache({
	cacheName: 'github-pkg-stats',
	cacheControl: 'max-age=10800', // 3 hours
}), async (c) => {
	const { owner, repo, pkg } = c.req.param();
	const githubUrl = `https://github.com/${owner}/${repo}/pkgs/container/${pkg}`;

	try {
		const githubResponse = await fetch(githubUrl);
		if (!githubResponse.ok) {
			throw new Error(`Failed to fetch from GitHub: ${githubResponse.status}`);
		}

		const html = await githubResponse.text();
		let downloadCount: string | null = null;
		let downloadCountRaw: string | null = null;

		const totalDownloadsMatch = html.match(/<span class="d-block color-fg-muted text-small mb-1">Total downloads<\/span>\s*<h3 title="(\d+)">([^<]+)<\/h3>/i);
		if (totalDownloadsMatch) {
			downloadCountRaw = totalDownloadsMatch[1];
			downloadCount = totalDownloadsMatch[2];
		}

		const result = {
			downloadCount: downloadCount,
			downloadCountRaw: downloadCountRaw ? parseInt(downloadCountRaw) : null,
			repo: {
				url: githubUrl,
				owner,
				repo,
				package: pkg
			},
			success: downloadCount !== null,
			timestamp: new Date().toISOString(),
		};

		return c.json(result, 200);
	} catch (error) {
		return c.json({
			repo: {
				url: githubUrl,
				owner,
				repo,
				package: pkg
			},
			success: false,
			error: error instanceof Error ? error.message : String(error),
			timestamp: new Date().toISOString(),
		}, 500);
	}
});

app.get('/shield/:owner/:repo/:pkg', async (c) => {
	const { owner, repo, pkg } = c.req.param();

	const reqUrl = new URL(c.req.url);

	const apiUrl = `${reqUrl.origin}/api/${owner}/${repo}/${pkg}`;
	const shieldUrl = `https://img.shields.io/badge/dynamic/json?url=${encodeURIComponent(apiUrl)}&query=downloadCount&style=for-the-badge&logo=docker&label=Docker%20Pulls&color=2496ed`;

	return c.redirect(shieldUrl, 302);
});

export default {
	fetch: app.fetch,
};
