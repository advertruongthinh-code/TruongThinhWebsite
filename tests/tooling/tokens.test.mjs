import assert from 'node:assert/strict';
import test from 'node:test';
import { roll, expiry } from '../../scripts/tooling/tokens.mjs';
import { verdict } from '../../scripts/tooling/pre-tool-guard.mjs';

function fakeCloudflare(tokens) {
  const calls = [];
  const fetchImpl = async (url, { method, body }) => {
    const path = url.replace('https://api.cloudflare.com/client/v4', '');
    calls.push(`${method} ${path}`);
    let result;
    if (path === '/user/tokens' && method === 'GET') result = tokens;
    else if (path === '/user/tokens' && method === 'POST') result = { id: 'new', value: 'SECRET', ...JSON.parse(body) };
    else if (path === '/user/tokens/permission_groups') result = [{ id: 'g-d1', name: 'D1 Write' }];
    else if (path === '/user/tokens/seed') result = { policies: [{ effect: 'allow', resources: { a: '*' }, permission_groups: [{ id: 'g1', name: 'x' }] }] };
    else if (method === 'DELETE') result = {};
    return { status: 200, json: async () => ({ success: true, result }) };
  };
  return { calls, fetchImpl };
}

test('roll creates a scoped token, pipes it to the Worker on stdin, then deletes the old one', async () => {
  const cf = fakeCloudflare([{ id: 'old', name: 'tt-d1-export' }, { id: 'other', name: 'keep-me' }]);
  const runs = [];
  const out = await roll('d1-export', { token: 'ADMIN', accountId: 'acc', fetchImpl: cf.fetchImpl, now: 0, runImpl: async (c, a, input) => runs.push([c, a.join(' '), input]) });
  assert.equal(out.expiresOn, expiry(365, 0));
  assert.deepEqual(runs, [['pnpm', 'demo:wrangler secret put D1_EXPORT_TOKEN --config wrangler.toml', 'SECRET']]);
  assert.deepEqual(cf.calls, ['GET /user/tokens', 'GET /user/tokens/permission_groups', 'POST /user/tokens', 'DELETE /user/tokens/old']);
});

test('a failed push deletes the new token and keeps the old one', async () => {
  const cf = fakeCloudflare([{ id: 'old', name: 'tt-d1-export' }]);
  await assert.rejects(roll('d1-export', { token: 'ADMIN', accountId: 'acc', fetchImpl: cf.fetchImpl, runImpl: async () => { throw new Error('wrangler failed'); } }), /wrangler failed/);
  assert.deepEqual(cf.calls.slice(-1), ['DELETE /user/tokens/new']);
});

test('ci-deploy copies the seed token permissions, sets the env secret and never deletes the seed', async () => {
  const cf = fakeCloudflare([{ id: 'seed', name: 'Edit Cloudflare Workers' }]);
  const runs = [];
  await roll('ci-deploy', { token: 'ADMIN', accountId: 'acc', fetchImpl: cf.fetchImpl, runImpl: async (c, a, input) => runs.push([c, a.join(' '), input]) });
  assert.deepEqual(runs.map((r) => r.slice(0, 2)), [
    ['gh', 'secret set CLOUDFLARE_API_TOKEN --repo advertruongthinh-code/TruongThinhWebsite --env cloudflare-deploy'],
    ['gh', 'variable delete CLOUDFLARE_API_TOKEN --repo advertruongthinh-code/TruongThinhWebsite --env cloudflare-deploy'],
  ]);
  assert.equal(runs[0][2], 'SECRET');
  assert.ok(!cf.calls.some((c) => c.startsWith('DELETE')));
});

test('the guard blocks reading the bootstrap token file', () => {
  assert.match(verdict({ tool_input: { file_path: 'C:/Users/x/.truongthinh/cf-token-admin' } }), /Blocked/);
  assert.match(verdict({ tool_input: { command: 'cat ~/.truongthinh/cf-token-admin' } }), /Blocked/);
});
