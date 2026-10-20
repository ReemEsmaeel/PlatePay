import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getPortalDataNeeds, shouldRetryQuery } from '../src/lib/loading-policy.ts';

const enabled = (role, section) => Object.entries(getPortalDataNeeds(role, section))
  .filter(([, needed]) => needed).map(([key]) => key).sort();

test('each driver page fetches only the data it renders', () => {
  assert.deepEqual(enabled('driver', 'overview'), ['limits', 'requests', 'transactions', 'vehicles', 'wallet']);
  for (const [page, key] of [['vehicles', 'vehicles'], ['wallet', 'wallet'],
    ['requests', 'requests'], ['limits', 'limits'], ['transactions', 'transactions']]) {
    assert.deepEqual(enabled('driver', page), [key]);
  }
});

test('merchant pages avoid fetching unrelated history, transactions, or services', () => {
  assert.deepEqual(enabled('merchant', 'overview'), ['merchantDashboard', 'merchantProfile']);
  assert.deepEqual(enabled('merchant', 'profile'), ['merchantProfile', 'services']);
  assert.deepEqual(enabled('merchant', 'new-request'), []);
  assert.deepEqual(enabled('merchant', 'history'), ['requests']);
  assert.deepEqual(enabled('merchant', 'transactions'), ['transactions']);
});

test('admin pages fetch one matching data source rather than all five', () => {
  for (const [page, key] of [['overview', 'adminOverview'], ['accounts', 'accounts'],
    ['merchants', 'merchants'], ['admin-transactions', 'adminTransactions'], ['audit', 'audit']]) {
    assert.deepEqual(enabled('admin', page), [key]);
  }
});

test('unknown or wrong-role sections do not fetch another role’s data', () => {
  assert.deepEqual(enabled('driver', 'accounts'), []);
  assert.deepEqual(enabled('merchant', 'wallet'), []);
  assert.deepEqual(enabled('admin', 'new-request'), []);
  assert.deepEqual(enabled('driver', 'unknown'), []);
});

test('authentication refusals, missing profiles, and database outages do not incur retry waits', () => {
  for (const status of [400, 401, 403, 404, 409, 422, 429, 503]) {
    assert.equal(shouldRetryQuery(0, { status }), false);
  }
  assert.equal(shouldRetryQuery(0, new Error('network failure')), true);
  assert.equal(shouldRetryQuery(0, { status: 502 }), true);
  assert.equal(shouldRetryQuery(1, { status: 502 }), false);
});

test('external fonts do not block initial rendering or load an unused family', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /@import.*fonts\.googleapis/);
  const fontLinks = [...html.replace(/<noscript>[\s\S]*?<\/noscript>/g, '')
    .matchAll(/<link\b[^>]*fonts\.googleapis\.com\/css2[^>]*>/g)];
  assert.equal(fontLinks.length, 1);
  assert.match(fontLinks[0][0], /media="print"/);
  assert.match(fontLinks[0][0], /onload="this.media='all'"/);
  assert.doesNotMatch(html, /family=Inter:/);
});
