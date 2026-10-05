<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Dashboard data comes from deterministic local generators in src/lib/mock-data.ts behind the async mock API in src/lib/api.ts; swap api.ts for real endpoints later without touching views.
- Recharts colors are resolved from CSS tokens at runtime (useChartColors) because SVG attributes cannot read CSS variables.
- New demo sensor domains must be exposed through src/lib/api.ts so views remain independent from deterministic generators and future real endpoints.
