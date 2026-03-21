# hw-demo Standalone Deployment TODO

## A. Rename demo-1773914576553-9jmgf → "Therme Carbon Assistant"
- [ ] Update session company name to "Therme Carbon Assistant"
- [ ] Set platforms to show only: https://spa-dec-therme-bucharest-2025.streamlit.app/
- [ ] Add session.contextApiUrl = https://spa-dec-api-168039836142.europe-west1.run.app
- [ ] Fetch context from that API before conversation starts (inject into orchestrator)
- [ ] Show context in Workspace avatar briefing for this session

## B. Platform URL strategy (replace ports with Vercel)
- [ ] Each platform in a standalone deploy = a separate Vercel Function deployment
- [ ] Convert generated Express server.js to Vercel-compatible (module.exports = app)
- [ ] vercel.json for each platform with src/dest routing
- [ ] Deploy platforms to Vercel projects via Vercel Deploy API (no port needed)
- [ ] Store platform vercel URL in session.platforms[].url after deploy

## C. "Deploy Standalone" button per demo session
- [ ] Add Deploy Standalone button in Workspace (session info area)
- [ ] POST /demo/session/:id/deploy-standalone endpoint on master
- [ ] Endpoint: gather platform files from sandbox, generate Vercel project per platform
- [ ] Use Vercel API token from keys.json to create deployments
- [ ] Create Supabase project via Supabase API (if token available), else SQLite fallback
- [ ] Return { platforms: [{name, url}], dashboardUrl } when done
- [ ] Frontend: show progress spinner, then final URLs

## D. Standalone app structure
- [ ] Standalone = a self-contained Next.js app for one demo session
- [ ] Contains: session data, worker definitions, platform iframes
- [ ] Has its own /api/orchestrate, /api/workers, /api/chat routes
- [ ] DB: Supabase (Postgres) or SQLite embedded
- [ ] Deploy the whole thing to a new Vercel project via API

## E. Frontend polish for "Deploy Standalone"
- [ ] Button shows in Workspace sidebar under session info
- [ ] Progress states: idle → generating → deploying → done
- [ ] Copy URL button for the deployed link
- [ ] Show in session list too (badge "Deployed")
