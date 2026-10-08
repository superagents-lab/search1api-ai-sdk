import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { generateText, stepCountIs, streamText } from 'ai';
import * as mocks from 'ai/test';
import { search1apiTools } from '../dist/index.js';

const MockModel = mocks.MockLanguageModelV4 ?? mocks.MockLanguageModelV3 ?? mocks.MockLanguageModelV2;
const isV2 = MockModel === mocks.MockLanguageModelV2;
const usage = isV2 ? { inputTokens: 5, outputTokens: 5, totalTokens: 10 } : {
  inputTokens: { total: 5, noCache: 5, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 5, text: 5, reasoning: 0 },
};
const finishReason = (reason) => isV2 ? reason : { unified: reason, raw: reason };
const search = {
  searchParameters: { query: 'AI SDK', max_results: 5, crawl_results: 0, image: false, include_sites: [], exclude_sites: [] },
  results: [{ title: 'AI SDK', link: 'https://ai-sdk.dev', snippet: 'Tool calling' }],
};
const crawl = {
  crawlParameters: { url: 'https://ai-sdk.dev' },
  results: { title: 'AI SDK', link: 'https://ai-sdk.dev', content: 'Tools provide input schemas and execute functions.' },
};
const requests = [];
const fetch = async (url, init) => {
  requests.push({ path: new URL(url).pathname, body: JSON.parse(init.body) });
  return Response.json(new URL(url).pathname === '/crawl' ? crawl : search);
};
const tools = search1apiTools({ only: ['search', 'crawl'], apiKey: 'test-key', fetch });
const expectedText = 'AI SDK tools have schemas and execute functions. Source: https://ai-sdk.dev';

function generatedStep(index) {
  const content = index === 0
    ? [{ type: 'tool-call', toolCallId: 'search-1', toolName: 'search', input: JSON.stringify({ query: 'AI SDK' }) }]
    : index === 1
      ? [{ type: 'tool-call', toolCallId: 'crawl-1', toolName: 'crawl', input: JSON.stringify({ url: 'https://ai-sdk.dev' }) }]
      : [{ type: 'text', text: expectedText }];
  return { content, finishReason: finishReason(index < 2 ? 'tool-calls' : 'stop'), usage, warnings: [] };
}

const model = new MockModel({ doGenerate: [0, 1, 2].map(generatedStep) });
const result = await generateText({ model, tools, stopWhen: stepCountIs(3), prompt: 'Search for AI SDK, read the result, and cite the source.' });
assert.equal(result.text, expectedText);
assert.equal(result.steps.length, 3);
assert.deepEqual(requests.map((request) => request.path), ['/search', '/crawl']);
assert.equal(requests[0].body.crawl_results, 0);
assert.match(JSON.stringify(model.doGenerateCalls[2].prompt), /input schemas and execute functions/);
assert.deepEqual(model.doGenerateCalls[0].tools.map((tool) => tool.name), ['search', 'crawl']);

// The AI SDK validates out-of-range model input before invoking the tool transport.
const invalidModel = new MockModel({ doGenerate: [{
  ...generatedStep(0),
  content: [{ type: 'tool-call', toolCallId: 'invalid-1', toolName: 'search', input: JSON.stringify({ query: 'AI SDK', max_results: 51 }) }],
}] });
const invalid = await generateText({ model: invalidModel, tools, prompt: 'Search' });
assert.equal(requests.length, 2);
assert.ok(invalid.content.some((part) => part.type === 'tool-error'));

// Streaming follows the same three-step search/read/answer loop.
let streamStep = 0;
const streamingModel = new MockModel({ doStream: async () => {
  const index = streamStep++;
  const step = generatedStep(index);
  const content = index < 2 ? step.content : [
    { type: 'text-start', id: 'text-1' },
    { type: 'text-delta', id: 'text-1', delta: expectedText },
    { type: 'text-end', id: 'text-1' },
  ];
  return { stream: new ReadableStream({ start(controller) {
    for (const part of content) controller.enqueue(part);
    controller.enqueue({ type: 'finish', finishReason: step.finishReason, usage });
    controller.close();
  } }) };
} });
const streamed = streamText({ model: streamingModel, tools, stopWhen: stepCountIs(3), prompt: 'Search and read AI SDK.' });
assert.equal(await streamed.text, expectedText);
assert.equal((await streamed.steps).length, 3);
assert.deepEqual(requests.map((request) => request.path), ['/search', '/crawl', '/search', '/crawl']);

// Verify both entry points in the built artifact.
const require = createRequire(import.meta.url);
const cjs = require('../dist/index.cjs');
assert.deepEqual(Object.keys(cjs.search1apiTools()), ['search', 'news', 'crawl']);
console.log('PASS: generateText, streamText, schema validation, ESM and CommonJS');
