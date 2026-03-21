# hw-demo Standalone Deployment TODO

_Remaining items not yet implemented_

## Supabase integration (deferred — no token yet)
- [ ] Create Supabase project via Management API when token available
- [ ] Store DB connection string in standalone shell env vars
- [ ] Replace SQLite/JSON with Postgres for deployed standalone apps

## Copy URL + session list badge
- [ ] Copy-to-clipboard button in the "Deployed ↗" button area
- [ ] Show "Deployed" badge in session list on homepage when deployStandalone.status = 'done'

## Standalone dashboard (full Next.js, not just shell HTML)
- [ ] Generate a full Next.js app (not just the simple shell HTML)
- [ ] Include AI workers grid, orchestrator chat, platform iframes
- [ ] Self-contained: embed session data + worker definitions in build
- [ ] Deploy to Vercel as separate project via Files API
