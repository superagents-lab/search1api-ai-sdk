import assert from 'node:assert/strict';
import { search1apiTools } from '../dist/index.js';

try {
  const tools = search1apiTools({ only: ['search', 'crawl'], maxRetries: 0, timeoutMs: 30_000, search: { maxResults: 3 } });
  const options = { toolCallId: 'live-test', messages: [], context: {} };
  const search = await tools.search.execute({ query: 'Search1API API documentation' }, options);
  assert.ok(Array.isArray(search.results) && search.results.length > 0);
  assert.ok(search.results.every((result) => typeof result.link === 'string'));
  const crawl = await tools.crawl.execute({ url: 'https://s1.dev' }, options);
  assert.ok(typeof crawl.results?.content === 'string' && crawl.results.content.length > 0);
  console.log(JSON.stringify({ success: true, searchResults: search.results.length, crawlCharacters: crawl.results.content.length, apiCalls: 2 }));
} catch (error) {
  // Report only classification; never print credentials or upstream error bodies.
  console.error(JSON.stringify({ success: false, errorType: error?.constructor?.name, status: error?.status }));
  process.exitCode = 1;
} finally {
  delete process.env.SEARCH1API_API_KEY;
  delete process.env.SEARCH1API_KEY;
}
