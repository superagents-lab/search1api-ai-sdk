# First release tracking

Issue: [FAT-1853](https://linear.app/fatwang2/issue/FAT-1853).

The source repository is being published under the Search1API organization at
`superagents-lab/search1api-ai-sdk`. The npm package, owned integration page, and
Tools Registry entry are not published yet.

## Release order

1. Review the package and local docs changes; run tests and fresh tarball installation.
2. Create `superagents-lab/search1api-ai-sdk` and push the reviewed source.
3. Configure npm Trusted Publishing for this repository and the `release.yml`
   workflow, with the `npm` environment approval used by other Search1API SDKs.
4. Publish v0.1.0, then verify a fresh install from the public npm registry.
5. Deploy the docs and integration landing page only after the package is installable.
6. Prepare an upstream `vercel/ai` Tools Registry contribution using the current
   registry instructions and the live owned page; request authorization for
   the concrete diff before submission.
7. Record npm, GitHub release, owned-page, and registry evidence separately in Linear.

No Marketplace native approval is needed to publish this tool package.
