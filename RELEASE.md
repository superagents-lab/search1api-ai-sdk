# First release tracking

Issue: [FAT-1853](https://linear.app/fatwang2/issue/FAT-1853).

The source repository is public under the Search1API organization at
[`superagents-lab/search1api-ai-sdk`](https://github.com/superagents-lab/search1api-ai-sdk). The npm package, owned integration page, and
Tools Registry entry are not published yet.

## Release order

1. Review the package and local docs changes; run tests and fresh tarball installation.
2. Complete: created `superagents-lab/search1api-ai-sdk` and pushed the reviewed source.
3. Configure npm Trusted Publishing for this package: GitHub owner
   `superagents-lab`, repository `search1api-ai-sdk`, workflow `release.yml`,
   environment `npm`, and allowed action `npm publish`. Existing packages'
   trusted publishers do not authorize this package. The GitHub `npm`
   environment uses the same `fatwang2` review requirement as the JS SDK.
4. Publish GitHub Release v0.1.0 to trigger verification and the npm publishing
   job, then approve the `npm` environment and verify a fresh registry install.
   Manual workflow dispatch runs verification only and never publishes.
5. Deploy the docs and integration landing page only after the package is installable.
6. Prepare an upstream `vercel/ai` Tools Registry contribution using the current
   registry instructions and the live owned page; request authorization for
   the concrete diff before submission.
7. Record npm, GitHub release, owned-page, and registry evidence separately in Linear.

No Marketplace native approval is needed to publish this tool package.

The release workflow follows `superagents-lab/search1api-js`: GitHub Release
trigger, Node 24, OIDC authentication, version checking, and repeat-safe publish.
The npm publisher setup is still pending; no GitHub Release has been published.
