import { Search1API } from '@search1api/client';
import type {
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
  /** Application-owned search settings; the model only supplies the query. */
  search?: SearchOptions;
}

export interface Search1APINewsOptions extends Search1APIToolOptions {
  /** Application-owned news settings; the model only supplies the query. */
  news?: NewsOptions;
}

export interface Search1APICrawlOptions extends Search1APIToolOptions {
  crawl?: CrawlOptions;
}

export type QueryInput = { query: string };
export type CrawlInput = { url: string };

const querySchema = z
  .object({
    query: z
      .string()
      .trim()
      .min(1)
      .describe('Search keywords or a specific question.'),
  })
  .strict();

const crawlSchema = z
  .object({
    url: z
      .string()
      .url()
      .refine(
        (url) => ['http:', 'https:'].includes(new URL(url).protocol),
        'Use an HTTP or HTTPS URL.'
      )
      .describe('A public webpage URL, for example a link returned by search.'),
  })
  .strict();

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
): Tool<QueryInput, SearchResponse> {
  const options = { maxResults: 5, crawlResults: 0, ...settings };
  return tool({
    description:
      'Search the public web for current information and sources. Returns titles, links, and snippets. Use crawl to read a result page in full.',
    inputSchema: querySchema,
    execute: async (input, { abortSignal }) => {
      abortSignal?.throwIfAborted();
      const { query } = querySchema.parse(input);
      return getClient().search(query, options, { signal: abortSignal });
    },
  });
}

function newsTool(
  getClient: ClientGetter,
  settings: NewsOptions = {}
): Tool<QueryInput, NewsResponse> {
  const options = { maxResults: 5, crawlResults: 0, ...settings };
  return tool({
    description:
      'Search news coverage of recent events and announcements. Returns article titles, links, and snippets. Use crawl to read an article in full.',
    inputSchema: querySchema,
    execute: async (input, { abortSignal }) => {
      abortSignal?.throwIfAborted();
      const { query } = querySchema.parse(input);
      return getClient().news(query, options, { signal: abortSignal });
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

export function search1apiSearch(
  options: Search1APISearchOptions = {}
): Tool<QueryInput, SearchResponse> {
  return searchTool(clientGetter(options), options.search);
}

export function search1apiNews(
  options: Search1APINewsOptions = {}
): Tool<QueryInput, NewsResponse> {
  return newsTool(clientGetter(options), options.news);
}

export function search1apiCrawl(
  options: Search1APICrawlOptions = {}
): Tool<CrawlInput, CrawlResponse> {
  return crawlTool(clientGetter(options), options.crawl);
}

export interface Search1APIToolSet {
  search: Tool<QueryInput, SearchResponse>;
  news: Tool<QueryInput, NewsResponse>;
  crawl: Tool<CrawlInput, CrawlResponse>;
}

export type Search1APIToolName = keyof Search1APIToolSet;

export interface Search1APIToolsOptions<
  Name extends Search1APIToolName = Search1APIToolName,
> extends Search1APIToolOptions {
  /** Include only these tools. By default all three are included. */
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
  };
  const names = options.only ?? (['search', 'news', 'crawl'] as const);
  const selected = {} as Pick<Search1APIToolSet, Name>;
  for (const name of names) {
    if (!Object.hasOwn(tools, name)) {
      throw new Error(`Unknown Search1API tool: ${name}`);
    }
    Object.assign(selected, { [name]: tools[name] });
  }
  return selected;
}
