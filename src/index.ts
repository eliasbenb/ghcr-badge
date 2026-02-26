import { Context, Hono } from 'hono';
import { cache } from 'hono/cache';

interface Env {
}

const app = new Hono<{ Bindings: Env }>();

function extractDownloadStats(html: string) {
	let downloadCount: string | null = null;
	let downloadCountRaw: string | null = null;

	const totalDownloadsMatch = html.match(/Total downloads[\s\S]{0,500}?<h3\b([^>]*)>([^<]+)<\/h3>/i);
	if (totalDownloadsMatch) {
		const h3Attributes = totalDownloadsMatch[1] ?? '';
		const titleMatch = h3Attributes.match(/\btitle="([\d,]+)"/i);
		const rawFromTitle = titleMatch?.[1]?.replace(/\D/g, '') ?? null;
		const rawFromText = totalDownloadsMatch[2]?.replace(/\D/g, '') ?? null;

		downloadCountRaw = rawFromTitle || rawFromText;
		downloadCount = totalDownloadsMatch[2]?.trim() || null;
	}

	return {
		downloadCount,
		downloadCountRaw: downloadCountRaw ? parseInt(downloadCountRaw) : null,
	};
}

async function fetchPackageStats(urls: string[]) {
	const results = await Promise.all(urls.map(async (url) => {
		try {
			const response = await fetch(url);
			if (!response.ok) {
				return {
					success: false as const,
					url,
					error: `${url} -> ${response.status}`,
				};
			}

			const html = await response.text();
			const stats = extractDownloadStats(html);

			return {
				success: true as const,
				url,
				...stats,
			};
		} catch (error) {
			return {
				success: false as const,
				url,
				error: `${url} -> ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}));

	const successfulResults = results.filter((result) => result.success);
	if (successfulResults.length === 0) {
		const errors = results.filter((result) => !result.success).map((result) => result.error);
		throw new Error(`Failed to fetch package page. Attempts: ${errors.join('; ')}`);
	}

	const hasRawCounts = successfulResults.some((result) => result.downloadCountRaw !== null);
	const summedRawCount = successfulResults.reduce((sum, result) => sum + (result.downloadCountRaw ?? 0), 0);

	return {
		downloadCount: hasRawCounts
			? new Intl.NumberFormat('en-US').format(summedRawCount)
			: successfulResults[0].downloadCount,
		downloadCountRaw: hasRawCounts ? summedRawCount : null,
		urls: successfulResults.map((result) => result.url),
	};
}

async function handleApiRequest(c: Context<{ Bindings: Env }>) {
	const { owner, repo, pkg } = c.req.param() as { owner: string; repo?: string; pkg: string };
	const githubUrl = repo ? `https://github.com/${owner}/${repo}/pkgs/container/${pkg}` : `https://github.com/users/${owner}/packages/container/package/${pkg}`;

	try {
		const { downloadCount, downloadCountRaw, urls } = await fetchPackageStats([githubUrl]);

		const result = {
			downloadCount,
			downloadCountRaw,
			repo: {
				url: urls[0],
				urls,
				owner,
				repo: repo ?? null,
				package: pkg,
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
				repo: repo ?? null,
				package: pkg,
			},
			success: false,
			error: error instanceof Error ? error.message : String(error),
			timestamp: new Date().toISOString(),
		}, 500);
	}
}

app.use('*', async (c, next) => {
	await next();
	c.header('Access-Control-Allow-Origin', '*');
});

app.get('/', (c) => {
	return c.html(`
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>GitHub Container Registry Badge API</title>
			<style>
				body {
					font-family: Arial, sans-serif;
					line-height: 1.6;
					margin: 2rem;
				}
				h1 {
					color: #333;
				}
				a {
					color: #2496ed;
					text-decoration: none;
				}
				a:hover {
					text-decoration: underline;
				}
			</style>
		</head>
		<body>
			<h1>GitHub Container Registry Badge API</h1>
			<p>Use the following endpoints:</p>
			<ul>
				<li><a href="/api/:owner/:repo/:pkg"><code>/api/:owner/:repo/:pkg</code></a> - Get repo package download stats.</li>
				<li><a href="/api/:owner/:pkg"><code>/api/:owner/:pkg</code></a> - Get user package download stats.</li>
				<li><a href="/shield/:owner/:repo/:pkg"><code>/shield/:owner/:repo/:pkg</code></a> - Get a dynamic badge for repo package Docker pulls.</li>
				<li><a href="/shield/:owner/:pkg"><code>/shield/:owner/:pkg</code></a> - Get a dynamic badge for user package Docker pulls.</li>
			</ul>
			<p>Example:</p>
			<ul>
				<li><a href="/api/eliasbenb/PlexAniBridge/plexanibridge"><code>/api/eliasbenb/PlexAniBridge/plexanibridge</code></a> - Get badge stats for <a href="https://github.com/eliasbenb/PlexAniBridge" target="_blank">eliasbenb/PlexAniBridge</a>.</li>
				<li><a href="/api/eliasbenb/plexanibridge"><code>/api/eliasbenb/plexanibridge</code></a> - Get badge stats for <a href="https://github.com/users/eliasbenb/packages/container/package/plexanibridge" target="_blank">user-scoped package page</a>.</li>
				<li><a href="/shield/eliasbenb/PlexAniBridge/plexanibridge"><code>/shield/eliasbenb/PlexAniBridge/plexanibridge</code></a> - Get a badge for Docker pulls for <a href="https://github.com/eliasbenb/PlexAniBridge" target="_blank">eliasbenb/PlexAniBridge</a>.</li>
				<li><a href="/shield/eliasbenb/plexanibridge"><code>/shield/eliasbenb/plexanibridge</code></a> - Get a badge for Docker pulls for <a href="https://github.com/users/eliasbenb/packages/container/package/plexanibridge" target="_blank">user-scoped package page</a>.</li>
			</ul>
			<p>Visit the <a href="https://github.com/eliasbenb/ghcr-badge" target="_blank">GitHub repository</a> for more details.</p>
		</body>
		</html>
	`);
});

app.get('/api/:owner/:repo/:pkg', cache({
	cacheName: 'github-pkg-stats',
	cacheControl: 'max-age=10800', // 3 hours
	keyGenerator(c) {
		const noCache = c.req.query('no-cache') !== undefined;
		return noCache ? `${c.req.url}-${Date.now().toString()}` : c.req.url;
	},
}), handleApiRequest);

app.get('/api/:owner/:pkg', cache({
	cacheName: 'github-pkg-stats',
	cacheControl: 'max-age=10800', // 3 hours
	keyGenerator(c) {
		const noCache = c.req.query('no-cache') !== undefined;
		return noCache ? `${c.req.url}-${Date.now().toString()}` : c.req.url;
	},
}), handleApiRequest);

app.get('/shield/:owner/:repo/:pkg', async (c) => {
	const { owner, repo, pkg } = c.req.param();

	const reqUrl = new URL(c.req.url);

	const apiUrl = `${reqUrl.origin}/api/${owner}/${repo}/${pkg}`;
	const shieldUrl = `https://img.shields.io/badge/dynamic/json?url=${encodeURIComponent(apiUrl)}&query=downloadCount&style=for-the-badge&logo=docker&label=Docker%20Pulls&color=2496ed`;

	return c.redirect(shieldUrl, 302);
});

app.get('/shield/:owner/:pkg', async (c) => {
	const { owner, pkg } = c.req.param();

	const reqUrl = new URL(c.req.url);

	const apiUrl = `${reqUrl.origin}/api/${owner}/${pkg}`;
	const shieldUrl = `https://img.shields.io/badge/dynamic/json?url=${encodeURIComponent(apiUrl)}&query=downloadCount&style=for-the-badge&logo=docker&label=Docker%20Pulls&color=2496ed`;

	return c.redirect(shieldUrl, 302);
});

export default {
	fetch: app.fetch,
};
