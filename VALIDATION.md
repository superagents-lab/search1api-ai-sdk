# Initial implementation validation

Validated 2026-10-08 Asia/Shanghai. These results are local; they do not prove
public npm publication, deployed docs, or Tools Registry acceptance.

## Package

- 15 transport, configuration, schema, error, and cancellation tests passed.
- TypeScript checking and ESM/CommonJS builds passed.
- Actual AI SDK `generateText` and `streamText` loops used a mock model to search,
  read the returned page, and answer in three steps. This tests SDK orchestration
  without claiming a real LLM run.
- The AI SDK rejected model-supplied settings before issuing a request.
- A fresh project installed the packed tarball, executed ESM and CommonJS entry
  points, and typechecked both `.mts` and `.cts` consumers.
- Production dependency audit: zero reported vulnerabilities at validation time.

## Compatibility matrix

All rows passed types, the 15 tests, build, generation and streaming loops, and
ESM/CommonJS loading on local Node.js 22.19.0.

| AI SDK | Zod |
| --- | --- |
| 5.0.272 | 3.25.76 |
| 5.0.272 | 4.6.5 |
| 6.0.301 | 3.25.76 |
| 6.0.301 | 4.6.5 |
| 7.0.130 | 3.25.76 |
| 7.0.130 | 4.6.5 |

The prepared CI additionally covers Node.js 18 (AI SDK 5), 22 (AI SDK 6), and
24 (AI SDK 7). Remote CI results are tracked separately in GitHub Actions.

## Live Search1API smoke

The built tools used an existing internal billing-whitelisted test credential:

- One `/search` call with three results and `crawl_results: 0`: success, three
  results returned with source links.
- One `/crawl` call for `https://s1.dev`: success, 7,975 characters of readable
  content returned.

No credential was printed or persisted. No real paid-user billing or Gateway
model call was tested.

## Next.js and owned pages

- Next.js 16.4.0 with AI SDK 7.0.130 / @ai-sdk/react 4.0.133 built without API keys.
- The example route keeps tools on the server, forwards cancellation, and the
  client renders source links from tool outputs.
- Monorepo integration landing tests: 11/11 passed; Web typecheck and production
  build passed. The page is registered in the hub, public route list/sitemap,
  related integrations, and llms.txt in the local branch.
- Docs production build passed and prerendered `/docs/integrations/vercel-ai-sdk`
  with HTTP 200. Sidebar and SDK reference links are included.
- Targeted formatting/lint checks and `git diff --check` passed.

Owned pages are release drafts. Deploy only after the npm package and linked
GitHub source are publicly available.
