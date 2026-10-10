import { Search1API } from '@search1api/client';
import type {
  AskResponse,
  CrawlOptions,
  CrawlResponse,
  NewsOptions,
  NewsResponse,
  Search1APIOptions,
  SearchOptions,
  SearchResponse,
} from '@search1api/client';
import { tool } from 'ai';
import type { Tool } from 'ai';
import { z } from 'zod';

export interface Search1APIToolOptions extends Search1APIOptions {
  /** Reuse an existing client. When supplied, other client options are ignored. */
  client?: Search1API;
}

export interface Search1APISearchOptions extends Search1APIToolOptions {
  /** Default search settings; values the model supplies take precedence. */
  search?: SearchOptions;
}

export interface Search1APINewsOptions extends Search1APIToolOptions {
  /** Default news settings; values the model supplies take precedence. */
  news?: NewsOptions;
}

export interface Search1APICrawlOptions extends Search1APIToolOptions {
  crawl?: CrawlOptions;
}

export type CrawlInput = { url: string };
export type AskInput = { query: string };

// Model-facing parameters mirror the Search1API MCP server's tool schemas,
// except result crawling, which only application settings can enable.
const SEARCH_ENGINES = [
  'google',
  'bing',
  'bingcn',
  'duckduckgo',
  'yahoo',
  'yandex',
  'x',
  'reddit',
  'github',
  'youtube',
  'arxiv',
  'wechat',
  'bilibili',
  'imdb',
  'wikipedia',
  'grokipedia',
] as const;
const NEWS_ENGINES = [
  'google',
  'bing',
  'duckduckgo',
  'yahoo',
  'hackernews',
] as const;

function queryFields(kind: 'search' | 'news') {
  const noun = kind === 'search' ? 'results' : 'articles';
  return {
    query: z
      .string()
      .trim()
      .min(1)
      .describe(`Short, focused ${kind} query`),
    max_results: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe(`Maximum number of ${noun} to return`),
    include_sites: z
      .array(z.string())
      .optional()
      .describe(
        kind === 'search'
          ? 'Domains to include when the user explicitly scopes the search'
          : 'News domains to include'
      ),
    exclude_sites: z
      .array(z.string())
      .optional()
      .describe(
        kind === 'search'
          ? 'Domains to exclude from the search'
          : 'News domains to exclude'
      ),
    time_range: z
      .enum(['day', 'week', 'month', 'year'])
      .optional()
      .describe(
        kind === 'search'
          ? 'Optional recency window for time-sensitive searches'
          : 'Optional recency window; use day for breaking news'
      ),
  };
}

// Unknown keys are stripped rather than rejected so a stray argument does not
// cost the agent a retry step.
const searchSchema = z.object({
  ...queryFields('search'),
  search_service: z
    .enum(SEARCH_ENGINES)
    .optional()
    .describe(
      "Search engine to use; choose one only when it matches the user's source intent"
    ),
  page: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe(
      'Results page to fetch; only bing, bingcn, baidu, and grokipedia paginate, other engines ignore it'
    ),
});

const newsSchema = z.object({
  ...queryFields('news'),
  search_service: z
    .enum(NEWS_ENGINES)
    .optional()
    .describe('News search engine to use'),
});

const crawlSchema = z.object({
  url: z
    .string()
    .url()
    .refine(
      (url) => ['http:', 'https:'].includes(new URL(url).protocol),
      'Use an HTTP or HTTPS URL.'
    )
    .describe('Public HTTP or HTTPS URL to retrieve'),
});

const askSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .describe(
      'Natural-language description of what to find, including any platform or time frame'
    ),
});

export type SearchInput = z.input<typeof searchSchema>;
export type NewsInput = z.input<typeof newsSchema>;

type ModelQueryInput =
  | z.output<typeof searchSchema>
  | (z.output<typeof newsSchema> & { page?: undefined });

// Merge model-supplied values over application defaults, dropping omitted keys.
function requestOptions<Options extends SearchOptions | NewsOptions>(
  defaults: Options,
  input: ModelQueryInput
): Options {
  const fromModel = {
    searchService: input.search_service,
    maxResults: input.max_results,
    includeSites: input.include_sites,
    excludeSites: input.exclude_sites,
    timeRange: input.time_range,
    page: input.page,
  };
  const overrides = Object.fromEntries(
    Object.entries(fromModel).filter(([, value]) => value !== undefined)
  );
  return { ...defaults, ...overrides } as Options;
}

type ClientGetter = () => Search1API;

function clientGetter(options: Search1APIToolOptions): ClientGetter {
  let client = options.client;
  const { client: _client, ...settings } = options;
  return () => {
    if (!client) {
      const processLike = globalThis as typeof globalThis & {
        process?: { env?: Record<string, string | undefined> };
      };
      const env = processLike.process?.env;
      client = new Search1API({
        ...settings,
        apiKey:
          settings.apiKey || env?.SEARCH1API_API_KEY || env?.SEARCH1API_KEY,
      });
    }
    return client;
  };
}

function searchTool(
  getClient: ClientGetter,
  settings: SearchOptions = {}
): Tool<SearchInput, SearchResponse> {
  const defaults: SearchOptions = {
    maxResults: 10,
    crawlResults: 0,
    ...settings,
  };
  return tool({
    description:
      'Search the live public web when the user needs current information, sources, or research. Returns titles, links, and snippets. Use crawl to read a result page in full.',
    inputSchema: searchSchema,
    execute: async (input, { abortSignal }) => {
      abortSignal?.throwIfAborted();
      const parsed = searchSchema.parse(input);
      return getClient().search(
        parsed.query,
        requestOptions(defaults, parsed),
        { signal: abortSignal }
      );
    },
  });
}

function newsTool(
  getClient: ClientGetter,
  settings: NewsOptions = {}
): Tool<NewsInput, NewsResponse> {
  const defaults: NewsOptions = {
    maxResults: 10,
    crawlResults: 0,
    ...settings,
  };
  return tool({
    description:
      'Search current news when the user asks about recent events, announcements, or coverage. Returns article titles, links, and snippets. Use crawl to read an article in full.',
    inputSchema: newsSchema,
    execute: async (input, { abortSignal }) => {
      abortSignal?.throwIfAborted();
      const parsed = newsSchema.parse(input);
      return getClient().news(parsed.query, requestOptions(defaults, parsed), {
        signal: abortSignal,
      });
    },
  });
}

function crawlTool(
  getClient: ClientGetter,
  settings: CrawlOptions = {}
): Tool<CrawlInput, CrawlResponse> {
  const options = { ...settings };
  return tool({
    description:
      'Read one public webpage and return its title, source URL, and readable content. Use a URL supplied by the user or returned by search or news.',
    inputSchema: crawlSchema,
    execute: async (input, { abortSignal }) => {
      abortSignal?.throwIfAborted();
      const { url } = crawlSchema.parse(input);
      return getClient().crawl(url, options, { signal: abortSignal });
    },
  });
}

function askTool(getClient: ClientGetter): Tool<AskInput, AskResponse> {
  return tool({
    description:
      'Describe what you need in natural language; Search1API chooses up to five engines and a time window, then returns at most 10 results ranked by relevance, with the engines and window it used. Costs 5 credits per call. Use search instead when you already know the engine and keywords.',
    inputSchema: askSchema,
    execute: async (input, { abortSignal }) => {
      abortSignal?.throwIfAborted();
      const { query } = askSchema.parse(input);
      return getClient().ask(query, { signal: abortSignal });
    },
  });
}

export function search1apiSearch(
  options: Search1APISearchOptions = {}
): Tool<SearchInput, SearchResponse> {
  return searchTool(clientGetter(options), options.search);
}

export function search1apiNews(
  options: Search1APINewsOptions = {}
): Tool<NewsInput, NewsResponse> {
  return newsTool(clientGetter(options), options.news);
}

export function search1apiCrawl(
  options: Search1APICrawlOptions = {}
): Tool<CrawlInput, CrawlResponse> {
  return crawlTool(clientGetter(options), options.crawl);
}

/** Agentic search through `POST /ask`. Costs 5 credits per call. */
export function search1apiAsk(
  options: Search1APIToolOptions = {}
): Tool<AskInput, AskResponse> {
  return askTool(clientGetter(options));
}

export interface Search1APIToolSet {
  search: Tool<SearchInput, SearchResponse>;
  news: Tool<NewsInput, NewsResponse>;
  crawl: Tool<CrawlInput, CrawlResponse>;
  ask: Tool<AskInput, AskResponse>;
}

export type Search1APIToolName = keyof Search1APIToolSet;

export interface Search1APIToolsOptions<
  Name extends Search1APIToolName = Search1APIToolName,
> extends Search1APIToolOptions {
  /** Include only these tools. By default all four are included. */
  only?: readonly Name[];
  search?: SearchOptions;
  news?: NewsOptions;
  crawl?: CrawlOptions;
}

export function search1apiTools<
  Name extends Search1APIToolName = Search1APIToolName,
>(options: Search1APIToolsOptions<Name> = {}): Pick<Search1APIToolSet, Name> {
  const getClient = clientGetter(options);
  const tools: Search1APIToolSet = {
    search: searchTool(getClient, options.search),
    news: newsTool(getClient, options.news),
    crawl: crawlTool(getClient, options.crawl),
    ask: askTool(getClient),
  };
  const names =
    options.only ?? (['search', 'news', 'crawl', 'ask'] as const);
  const selected = {} as Pick<Search1APIToolSet, Name>;
  for (const name of names) {
    if (!Object.hasOwn(tools, name)) {
      throw new Error(`Unknown Search1API tool: ${name}`);
    }
    Object.assign(selected, { [name]: tools[name] });
  }
  return selected;
}
