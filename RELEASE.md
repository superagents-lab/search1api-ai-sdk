# First release tracking

Issue: [FAT-1853](https://linear.app/fatwang2/issue/FAT-1853).

The source repository is public under the Search1API organization at
[`superagents-lab/search1api-ai-sdk`](https://github.com/superagents-lab/search1api-ai-sdk).
The initial npm version 0.1.0 is published and a fresh registry installation
passed ESM/CommonJS execution and TypeScript consumer checks. Owned integration
pages and the Tools Registry entry are not published yet.

The npm Trusted Publisher connection is saved for `superagents-lab/search1api-ai-sdk`,
`release.yml`, environment `npm`, with `npm publish` permission. Its status is
Valid after the successful 0.1.1 OIDC workflow publish. The npm publish log
confirms a signed provenance statement from GitHub Actions.

## Release order

1. Review the package and local docs changes; run tests and fresh tarball installation.
2. Complete: created `superagents-lab/search1api-ai-sdk` and pushed the reviewed source.
3. Complete: saved npm Trusted Publishing for this package: GitHub owner
   `superagents-lab`, repository `search1api-ai-sdk`, workflow `release.yml`,
   environment `npm`, and allowed action `npm publish`. Existing packages'
   trusted publishers do not authorize this package. The GitHub `npm`
   environment uses the same `fatwang2` review requirement as the JS SDK.
4. Complete: GitHub Release v0.1.1 triggered verification and the npm publishing
   job; the user approved the `npm` environment and the workflow succeeded.
   Manual workflow dispatch runs verification only and never publishes.
   npm accepted 0.1.1 for asynchronous processing; confirm it is publicly
   installable with `node scripts/verify-package.mjs --registry` after processing.
5. Deploy the docs and integration landing page only after the package is installable.
6. Prepare an upstream `vercel/ai` Tools Registry contribution using the current
   registry instructions and the live owned page; request authorization for
   the concrete diff before submission.
7. Record npm, GitHub release, owned-page, and registry evidence separately in Linear.

No Marketplace native approval is needed to publish this tool package.

The release workflow follows `superagents-lab/search1api-js`: GitHub Release
trigger, Node 24, OIDC authentication, version checking, and repeat-safe publish.
The v0.1.0 workflow was cancelled because the bootstrap version was already
published and the repeat-safe job would skip the OIDC publish. The initial
bootstrap used an existing local npm credential to create the package, which
is a prerequisite for configuring a trusted publisher. No new token was created
or added to GitHub. Subsequent releases use the OIDC workflow.
