# Changelog

## 0.2.0 — 2026-10-11

- Add an `ask` tool for `POST /ask`, included in `search1apiTools()` by default like the MCP server's `ask` tool, and available alone through `search1apiAsk()`. Each call costs 5 credits; pass `only: ['search', 'news', 'crawl']` to keep the previous tool set.
- `search` accepts the `bingcn`, `yandex`, and `grokipedia` engines and a `page` parameter, matching the Search1API MCP server 0.7.0.
- `search` and `news` accept `time_range: "week"`.
- Depend on `@search1api/client` 0.3.0, whose result types include `published_date` and the GitHub and Hacker News fields.

## 0.1.2 — 2026-10-08

- Let the model choose search parameters, matching the Search1API MCP server: `search_service`, `max_results`, `include_sites`, `exclude_sites`, and `time_range`. Settings passed in code become defaults. Result page crawling (`crawlResults`) stays application-only.
- Ignore unknown model arguments instead of failing the tool call.
- Default search and news to ten results, matching the MCP server.

## 0.1.1 — 2026-10-08

- Publish through the GitHub Actions OIDC workflow after the initial registry bootstrap.
- Add a fresh public-registry installation check for release verification.

## 0.1.0 — 2026-10-08

- Web search, news search, and webpage reading tools for the Vercel AI SDK.
- Individual factories and a selectable tool set backed by the official SDK.
- Lazy credentials, custom clients, application-owned settings, and cancellation.
- ESM and CommonJS entry points, TypeScript declarations, and compatibility checks.
