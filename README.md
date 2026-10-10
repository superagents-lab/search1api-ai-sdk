# Search1API tools for the Vercel AI SDK

Add web search, news search, webpage reading, and agentic search to an AI SDK
agent. The tools use the official
[`@search1api/client`](https://s1.dev/docs/integrations/sdks) for transport,
retries, timeouts, and typed API errors.

## Install

```bash
npm install @search1api/ai-sdk ai zod
```

Create a Search1API key in the [dashboard](https://app.s1.dev), then set
`SEARCH1API_API_KEY`. `SEARCH1API_KEY` is also accepted for compatibility with
the CLI. An explicit `apiKey` takes precedence over either environment variable.
The example below uses Vercel AI Gateway; configure `AI_GATEWAY_API_KEY` or use
your preferred AI SDK model provider.

## Search and read sources

```ts
import { gateway, generateText, stepCountIs } from 'ai';
import { search1apiTools } from '@search1api/ai-sdk';

const result = await generateText({
  model: gateway('openai/gpt-5-mini'),
  tools: search1apiTools({ only: ['search', 'crawl'] }),
  stopWhen: stepCountIs(5),
  prompt: 'Find the AI SDK tool calling documentation, read it, and explain how tools work. Cite the URLs you used.',
});

console.log(result.text);
```

The tool set has four entries:

| Tool | Model input | API | Output |
| --- | --- | --- | --- |
| `search` | `{ query, search_service?, page?, max_results?, include_sites?, exclude_sites?, time_range? }` | `/search` | Typed results with titles, links, and snippets |
| `news` | Same fields as `search` except `page`, with news engines | `/news` | Typed news results and source links |
| `crawl` | `{ url }` | `/crawl` | A page's title, URL, and readable content |
| `ask` | `{ query }` | `/ask` | Up to 10 results ranked by relevance, plus the engines and window used |

The model-facing parameters match the
[Search1API MCP server](https://s1.dev/docs/integrations/mcp). The model can
pick an engine (`google`, `bing`, `bingcn`, `duckduckgo`, `yahoo`, `yandex`,
`x`, `reddit`, `github`, `youtube`, `arxiv`, `wechat`, `bilibili`, `imdb`,
`wikipedia`, `grokipedia`; news supports `google`, `bing`, `duckduckgo`,
`yahoo`, and `hackernews`), return 1–50 results, request a later results page
(only `bing`, `bingcn`, `baidu`, and `grokipedia` paginate), scope or exclude
domains, and limit results to the past day, week, month, or year. Result page
crawling is not exposed to the model. Unknown arguments are ignored rather than
failing the call.

Outputs preserve the API response, including optional publication dates,
GitHub and Hacker News fields, metadata, and content. Empty results remain
empty. Ask the model to cite the returned links; these tools do not add AI SDK
source events automatically. When an answer uses `grokipedia` results, credit
them as "Powered by xAI"; see
[Improving search results](https://s1.dev/docs/guides/improving-search-results).

## Agentic search with ask

`ask` sends a natural-language request to
[`POST /ask`](https://s1.dev/docs/basic/ask). Search1API chooses up to five
engines and a time window, drops off-topic results, and returns at most 10
results ranked by relevance. Each call costs 5 credits, compared with 1 credit
for `search`. `ask` is in the default tool set, matching the MCP server; leave
it out with `only`, or create it on its own with `search1apiAsk()`:

```ts
import { search1apiAsk, search1apiTools } from '@search1api/ai-sdk';

const withoutAsk = search1apiTools({ only: ['search', 'news', 'crawl'] });
const askOnly = { ask: search1apiAsk() };
```

The SDK gives `ask` a 45-second timeout. `ask` is not available with
pay-per-request payments. Prefer `search` when the agent already knows the
engine and keywords.

## Configure one tool

Settings passed in code are defaults. When the model supplies the same
parameter, the model's value is used for that call; anything it omits falls
back to your settings.

```ts
import { search1apiSearch, search1apiCrawl } from '@search1api/ai-sdk';

const tools = {
  webSearch: search1apiSearch({
    search: { maxResults: 5, includeSites: ['ai-sdk.dev'], timeRange: 'month' },
  }),
  readPage: search1apiCrawl({ crawl: { enableFallback: true } }),
};
```

`search1apiNews({ news: { timeRange: 'day' } })` creates the news tool. A tool
set accepts the same settings under `search`, `news`, and `crawl`:

```ts
const tools = search1apiTools({
  only: ['search', 'news', 'crawl'],
  search: { maxResults: 5 },
  news: { maxResults: 3, timeRange: 'week' },
});
```

Search and news default to ten results with `crawlResults: 0`. Set
`search.crawlResults` or `news.crawlResults` in code when you want result page
content included. Each successful page retrieval incurs a separate crawl charge;
see [pricing](https://s1.dev/pricing).

## Reuse a client

```ts
import { Search1API } from '@search1api/client';
import { search1apiTools } from '@search1api/ai-sdk';

const client = new Search1API({ apiKey: 'your-api-key', timeoutMs: 15_000 });
const tools = search1apiTools({ client });
```

Factories and tool sets also accept SDK client settings directly: `apiKey`,
`baseUrl`, `fetch`, `headers`, `timeoutMs`, `maxRetries`, and `retryDelayMs`.
When `client` is supplied, the other client settings are ignored.

The tools create their client on the first execution, so defining tools at
module scope does not require a key during `next build`. An injected client has
already been constructed and follows the SDK's normal constructor behavior.

## Streaming, cancellation, and errors

Use the same tools with `streamText` or an AI SDK agent. Pass an `abortSignal`
to the AI SDK call to cancel pending tool requests. Already cancelled calls do
not create a client or send a request.

SDK errors propagate with their type, status code, body, and request ID intact.
The SDK defaults to a 30-second timeout and two retries for rate limits and
transient server failures; authentication, credit, and validation errors are
not retried. The AI SDK represents a failed tool execution as a tool error so
the agent can handle it in a subsequent step.

Keep the key in server code. For a Next.js route handler, see the
[Next.js example](https://github.com/superagents-lab/search1api-ai-sdk/tree/main/examples/nextjs).

## Compatibility

AI SDK 5, 6, and 7 with Zod 3.25.76+ or 4.1.8+. The package targets Node.js 18+
and uses standard `fetch`; use a Node version supported by your AI SDK release
(AI SDK 7 requires Node.js 22+).

## Development

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run test:smoke
npm run test:compatibility
npm pack --dry-run
```

To verify the current version from the public registry, run
`node scripts/verify-package.mjs --registry` after publication.

To validate a local build, create and install the tarball with
`npm pack` and `npm install /absolute/path/search1api-ai-sdk-0.2.0.tgz`.
Publication tracking is in [RELEASE.md](https://github.com/superagents-lab/search1api-ai-sdk/blob/main/RELEASE.md).

## License

MIT
