# Changelog

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
