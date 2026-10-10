import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  APIConnectionError,
  AuthenticationError,
  RateLimitError,
  Search1API,
  Search1APIConfigurationError,
} from '@search1api/client';
import type { Tool } from 'ai';
import {
  search1apiAsk,
  search1apiCrawl,
  search1apiNews,
  search1apiSearch,
  search1apiTools,
} from '../src/index.js';

const searchResponse = {
  searchParameters: {
    query: 'AI SDK',
    max_results: 5,
    crawl_results: 0,
    image: false,
    include_sites: [],
    exclude_sites: [],
  },
  results: [
    {
      title: 'AI SDK',
      link: 'https://ai-sdk.dev',
      snippet: 'TypeScript tools',
      published_date: '2026-10-08',
    },
  ],
};
const crawlResponse = {
  crawlParameters: { url: 'https://ai-sdk.dev' },
  results: {
    title: 'AI SDK',
    link: 'https://ai-sdk.dev',
    content: 'Readable page content.',
  },
};
const askResponse = {
  intent: {
    keywords: 'bun 1.3',
    sources: ['reddit', 'hackernews'],
    time_range: 'month',
  },
  results: [
    {
      title: 'Bun 1.3 thread',
      link: 'https://news.ycombinator.com/item?id=1',
      snippet: 'Discussion',
      source: 'hackernews',
      relevance: 0.91,
    },
  ],
  errors: [],
};

async function execute<Input, Output>(
  tool: Tool<Input, Output>,
  input: Input,
  abortSignal?: AbortSignal
) {
  const options = {
    toolCallId: 'call-1',
    messages: [],
    context: {},
    abortSignal,
  };
  return await tool.execute!(input, options);
}

function transport(value: unknown = searchResponse) {
  return vi
    .fn<typeof fetch>()
    .mockImplementation(async () => Response.json(value));
}

afterEach(() => vi.unstubAllEnvs());

describe('Search1API tools', () => {
  it('can be defined without credentials or fetch and resolves credentials on first use', async () => {
    vi.stubEnv('SEARCH1API_API_KEY', '');
    vi.stubEnv('SEARCH1API_KEY', '');
    const fetch = transport();
    const tools = search1apiTools({ fetch });
    expect(fetch).not.toHaveBeenCalled();
    vi.stubEnv('SEARCH1API_API_KEY', 'late-test-key');
    await execute(tools.search, { query: 'AI SDK' });
    expect(
      new Headers(fetch.mock.calls[0][1]?.headers).get('Authorization')
    ).toBe('Bearer late-test-key');
  });

  it('reports missing credentials only when a tool executes', async () => {
    vi.stubEnv('SEARCH1API_API_KEY', '');
    vi.stubEnv('SEARCH1API_KEY', '');
    const tool = search1apiSearch();
    await expect(execute(tool, { query: 'AI SDK' })).rejects.toBeInstanceOf(
      Search1APIConfigurationError
    );
  });

  it('supports the compatibility key alias and gives the canonical key precedence', async () => {
    vi.stubEnv('SEARCH1API_API_KEY', '');
    vi.stubEnv('SEARCH1API_KEY', 'alias-test-key');
    const fetch = transport();
    await execute(search1apiSearch({ fetch }), { query: 'AI SDK' });
    expect(
      new Headers(fetch.mock.calls[0][1]?.headers).get('Authorization')
    ).toBe('Bearer alias-test-key');
    vi.stubEnv('SEARCH1API_API_KEY', 'canonical-test-key');
    await execute(search1apiSearch({ fetch }), { query: 'AI SDK' });
    expect(
      new Headers(fetch.mock.calls[1][1]?.headers).get('Authorization')
    ).toBe('Bearer canonical-test-key');
  });

  it('maps application settings to the REST request and preserves source fields', async () => {
    const fetch = transport();
    const tool = search1apiSearch({
      apiKey: 'explicit-test-key',
      baseUrl: 'https://api.example.test/',
      fetch,
      search: {
        searchService: 'bing',
        maxResults: 8,
        includeSites: ['ai-sdk.dev'],
        timeRange: 'week',
        language: 'en',
      },
    });
    expect(await execute(tool, { query: ' AI SDK ' })).toEqual(searchResponse);
    const [url, init] = fetch.mock.calls[0];
    expect(String(url)).toBe('https://api.example.test/search');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({
      query: 'AI SDK',
      search_service: 'bing',
      max_results: 8,
      crawl_results: 0,
      include_sites: ['ai-sdk.dev'],
      time_range: 'week',
      language: 'en',
    });
    expect(new Headers(init?.headers).get('Authorization')).toBe(
      'Bearer explicit-test-key'
    );
  });

  it('keeps result crawling disabled unless the application explicitly enables it', async () => {
    const fetch = transport();
    const tools = search1apiTools({ apiKey: 'test-key', fetch });
    await execute(tools.search, { query: 'AI SDK' });
    await execute(tools.news, { query: 'AI SDK' });
    for (const [, init] of fetch.mock.calls)
      expect(JSON.parse(init?.body as string).crawl_results).toBe(0);
    await execute(
      search1apiSearch({
        apiKey: 'test-key',
        fetch,
        search: { crawlResults: 2 },
      }),
      { query: 'AI SDK' }
    );
    expect(
      JSON.parse(fetch.mock.calls[2][1]?.body as string).crawl_results
    ).toBe(2);
  });

  it('maps model-supplied parameters over application defaults', async () => {
    const fetch = transport();
    const tools = search1apiTools({
      apiKey: 'test-key',
      fetch,
      search: { searchService: 'bing', maxResults: 8, language: 'en' },
    });
    await execute(tools.search, {
      query: 'AI SDK',
      search_service: 'github',
      max_results: 3,
      include_sites: ['github.com'],
      exclude_sites: ['example.com'],
      time_range: 'month',
    });
    expect(JSON.parse(fetch.mock.calls[0][1]?.body as string)).toEqual({
      query: 'AI SDK',
      search_service: 'github',
      max_results: 3,
      crawl_results: 0,
      include_sites: ['github.com'],
      exclude_sites: ['example.com'],
      time_range: 'month',
      language: 'en',
    });
    await execute(tools.news, {
      query: 'release',
      search_service: 'hackernews',
      time_range: 'day',
    });
    expect(JSON.parse(fetch.mock.calls[1][1]?.body as string)).toEqual({
      query: 'release',
      search_service: 'hackernews',
      max_results: 10,
      crawl_results: 0,
      time_range: 'day',
    });
  });

  it('passes the newer engines, page, and the week window through to the API', async () => {
    const fetch = transport();
    const tools = search1apiTools({ apiKey: 'test-key', fetch });
    for (const engine of ['bingcn', 'yandex', 'grokipedia'] as const) {
      await execute(tools.search, {
        query: 'AI SDK',
        search_service: engine,
        page: 2,
        time_range: 'week',
      });
    }
    await execute(tools.news, { query: 'release', time_range: 'week' });
    expect(
      fetch.mock.calls.map((call) => JSON.parse(call[1]?.body as string))
    ).toEqual([
      ...['bingcn', 'yandex', 'grokipedia'].map((engine) => ({
        query: 'AI SDK',
        search_service: engine,
        page: 2,
        max_results: 10,
        crawl_results: 0,
        time_range: 'week',
      })),
      { query: 'release', max_results: 10, crawl_results: 0, time_range: 'week' },
    ]);
  });

  it('ignores unknown model arguments, including result crawling, instead of failing the tool call', async () => {
    const fetch = transport();
    const tools = search1apiTools({ apiKey: 'test-key', fetch });
    await execute(tools.search, {
      query: 'AI SDK',
      crawl_results: 3,
      image: true,
    } as { query: string });
    await execute(tools.news, {
      query: 'release',
      page: 2,
    } as { query: string });
    await execute(tools.crawl, {
      url: 'https://ai-sdk.dev',
      depth: 3,
    } as { url: string });
    expect(JSON.parse(fetch.mock.calls[0][1]?.body as string)).toEqual({
      query: 'AI SDK',
      max_results: 10,
      crawl_results: 0,
    });
    expect(JSON.parse(fetch.mock.calls[1][1]?.body as string)).toEqual({
      query: 'release',
      max_results: 10,
      crawl_results: 0,
    });
    expect(JSON.parse(fetch.mock.calls[2][1]?.body as string)).toEqual({
      url: 'https://ai-sdk.dev',
    });
  });

  it('maps news settings to /news', async () => {
    const fetch = transport();
    await execute(
      search1apiNews({
        apiKey: 'test-key',
        fetch,
        news: { searchService: 'hackernews', maxResults: 3, timeRange: 'day' },
      }),
      { query: 'release' }
    );
    expect(String(fetch.mock.calls[0][0])).toBe(
      'https://api.search1api.com/news'
    );
    expect(JSON.parse(fetch.mock.calls[0][1]?.body as string)).toEqual({
      query: 'release',
      search_service: 'hackernews',
      max_results: 3,
      crawl_results: 0,
      time_range: 'day',
    });
  });

  it('maps a page URL and fallback setting to /crawl', async () => {
    const fetch = transport(crawlResponse);
    expect(
      await execute(
        search1apiCrawl({
          apiKey: 'test-key',
          fetch,
          crawl: { enableFallback: false },
        }),
        { url: 'https://ai-sdk.dev' }
      )
    ).toEqual(crawlResponse);
    expect(String(fetch.mock.calls[0][0])).toBe(
      'https://api.search1api.com/crawl'
    );
    expect(JSON.parse(fetch.mock.calls[0][1]?.body as string)).toEqual({
      url: 'https://ai-sdk.dev',
      enableFallback: false,
    });
  });

  it('reuses an injected SDK client', async () => {
    const fetch = transport();
    const client = new Search1API({ apiKey: 'client-test-key', fetch });
    const unusedFetch = transport();
    const tools = search1apiTools({
      client,
      apiKey: 'ignored',
      fetch: unusedFetch,
    });
    await execute(tools.search, { query: 'AI SDK' });
    expect(unusedFetch).not.toHaveBeenCalled();
    expect(
      new Headers(fetch.mock.calls[0][1]?.headers).get('Authorization')
    ).toBe('Bearer client-test-key');
  });

  it('sends only the query to /ask and returns the response unchanged', async () => {
    const fetch = transport(askResponse);
    const result = await execute(search1apiAsk({ apiKey: 'test-key', fetch }), {
      query: ' What are developers saying about Bun 1.3 this month? ',
      max_results: 20,
    } as { query: string });
    expect(result).toEqual(askResponse);
    expect(String(fetch.mock.calls[0][0])).toBe(
      'https://api.search1api.com/ask'
    );
    expect(JSON.parse(fetch.mock.calls[0][1]?.body as string)).toEqual({
      query: 'What are developers saying about Bun 1.3 this month?',
    });
  });

  it('rejects blank and over-long ask queries before any request', async () => {
    const fetch = transport(askResponse);
    const ask = search1apiAsk({ apiKey: 'test-key', fetch });
    await expect(execute(ask, { query: '  ' })).rejects.toThrow();
    await expect(execute(ask, { query: 'x'.repeat(501) })).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('selects tools and rejects unknown names', () => {
    expect(Object.keys(search1apiTools())).toEqual([
      'search',
      'news',
      'crawl',
      'ask',
    ]);
    expect(Object.keys(search1apiTools({ only: ['search', 'crawl'] }))).toEqual(
      ['search', 'crawl']
    );
    expect(Object.keys(search1apiTools({ only: ['ask', 'crawl'] }))).toEqual([
      'ask',
      'crawl',
    ]);
    expect(Object.keys(search1apiTools({ only: [] }))).toEqual([]);
    // @ts-expect-error Invalid names are rejected at compile time and runtime.
    expect(() => search1apiTools({ only: ['missing'] })).toThrow(
      'Unknown Search1API tool'
    );
    const selected = search1apiTools({ only: ['search'] });
    // @ts-expect-error Omitted tools are absent from the inferred type.
    void selected.crawl;
    void search1apiTools().ask;
  });

  it('rejects blank queries, out-of-range parameters, unsupported engines, and non-web URLs before any request', async () => {
    const fetch = transport();
    const tools = search1apiTools({ apiKey: 'test-key', fetch });
    await expect(execute(tools.search, { query: '  ' })).rejects.toThrow();
    await expect(
      execute(tools.search, { query: 'AI SDK', max_results: 51 })
    ).rejects.toThrow();
    await expect(
      execute(tools.search, { query: 'AI SDK', page: 0 })
    ).rejects.toThrow();
    await expect(
      execute(tools.search, {
        query: 'AI SDK',
        search_service: 'sogou',
      } as { query: string })
    ).rejects.toThrow();
    await expect(
      execute(tools.news, {
        query: 'AI SDK',
        search_service: 'github',
      } as { query: string })
    ).rejects.toThrow();
    for (const url of ['invalid', 'file:///etc/passwd', 'ftp://example.com']) {
      await expect(execute(tools.crawl, { url })).rejects.toThrow();
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns valid empty search results without inventing sources', async () => {
    const empty = { ...searchResponse, results: [] };
    expect(
      await execute(
        search1apiSearch({ apiKey: 'test-key', fetch: transport(empty) }),
        { query: 'AI SDK' }
      )
    ).toEqual(empty);
  });

  it('preserves SDK authentication errors and does not retry them', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        Response.json(
          { error: 'Invalid API key' },
          { status: 401, headers: { 'x-request-id': 'req-1' } }
        )
      );
    const error = await execute(
      search1apiSearch({ apiKey: 'test-key', fetch }),
      { query: 'AI SDK' }
    ).catch((error: unknown) => error);
    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error).toMatchObject({ status: 401, requestId: 'req-1' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('delegates rate limit retries to the SDK without wrapping the final error', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async () =>
        Response.json({ error: 'Too many requests' }, { status: 429 })
      );
    await expect(
      execute(
        search1apiSearch({
          apiKey: 'test-key',
          fetch,
          maxRetries: 1,
          retryDelayMs: 0,
        }),
        { query: 'AI SDK' }
      )
    ).rejects.toBeInstanceOf(RateLimitError);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('forwards in-flight cancellation and prevents retries', async () => {
    const controller = new AbortController();
    let requestSignal: AbortSignal | undefined;
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async (_, init) => {
        requestSignal = init?.signal ?? undefined;
        return new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(init.signal?.reason),
            { once: true }
          );
          controller.abort();
        });
      });
    await expect(
      execute(
        search1apiSearch({ apiKey: 'test-key', fetch }),
        { query: 'AI SDK' },
        controller.signal
      )
    ).rejects.toBeInstanceOf(APIConnectionError);
    expect(requestSignal?.aborted).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('does not construct a client or send a request for an already aborted call', async () => {
    vi.stubEnv('SEARCH1API_API_KEY', '');
    vi.stubEnv('SEARCH1API_KEY', '');
    const fetch = transport();
    const reason = new Error('cancelled');
    await expect(
      execute(
        search1apiSearch({ fetch }),
        { query: 'AI SDK' },
        AbortSignal.abort(reason)
      )
    ).rejects.toBe(reason);
    expect(fetch).not.toHaveBeenCalled();
  });
});
