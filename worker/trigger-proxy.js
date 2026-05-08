// ID-A Fetch Trigger Proxy — Cloudflare Worker
// Sits between the dashboard and GitHub Actions API
// Keeps the GitHub PAT secret server-side
//
// Deploy: https://dash.cloudflare.com → Workers → Create Worker → paste this code
// Secrets: add GH_TOKEN and ALLOWED_ORIGIN in Worker Settings → Variables

const GH_REPO     = 'jtheisen23/ID-A';
const GH_WORKFLOW = 'fetch-bids.yml';
const GH_REF      = 'main';

export default {
  async fetch(request, env) {

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204, env);
    }

    // Only accept POST to /trigger
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/trigger') {
      return corsResponse(JSON.stringify({ error: 'Not found' }), 404, env);
    }

    // Optional: simple shared passphrase check so random people can't spam it
    // Set TRIGGER_SECRET in Worker env vars; leave empty to disable
    if (env.TRIGGER_SECRET) {
      const body = await request.json().catch(() => ({}));
      if (body.secret !== env.TRIGGER_SECRET) {
        return corsResponse(JSON.stringify({ error: 'Unauthorized' }), 401, env);
      }
    }

    // Trigger GitHub Actions workflow dispatch
    const ghRes = await fetch(
      `https://api.github.com/repos/${GH_REPO}/actions/workflows/${GH_WORKFLOW}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.GH_TOKEN}`,
          Accept:        'application/vnd.github+json',
          'Content-Type': 'application/json',
          'User-Agent':  'ID-A-Worker/1.0',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({ ref: GH_REF }),
      }
    );

    if (ghRes.status === 204) {
      return corsResponse(
        JSON.stringify({ ok: true, message: 'Workflow triggered', timestamp: new Date().toISOString() }),
        200, env
      );
    }

    const ghBody = await ghRes.text();
    return corsResponse(
      JSON.stringify({ ok: false, status: ghRes.status, message: ghBody }),
      502, env
    );
  }
};

function corsResponse(body, status, env) {
  const origin = env.ALLOWED_ORIGIN || '*';
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  return new Response(body, { status, headers });
}
