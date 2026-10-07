# Next.js search chat

A minimal App Router example using AI SDK 7, `useChat`, and the local Search1API
tools package. The route streams search, page reading, and the answer; the client
renders source links from tool outputs.

Requires Node.js 22+. From the package root:

```bash
npm ci
npm run build
cd examples/nextjs
npm ci
cp .env.example .env.local
# Fill SEARCH1API_API_KEY and AI_GATEWAY_API_KEY in .env.local.
npm run dev
```

The example depends on the local package through `file:../..`. After publication,
replace that dependency with the published `@search1api/ai-sdk` version.

`npm run build` works without either key. The keys are read only by the server
route when a request runs; neither key uses a `NEXT_PUBLIC_` prefix.

The route forwards request cancellation to the AI SDK and Search1API. Search
result crawling is disabled by default; the agent requests individual pages
through `crawl`.
