# hw-demo Standalone Deployment DONE

_Items moved here when fully implemented and verified._

## 2026-03-21

### A. Therme demo renamed ✓
- [x] Session renamed to "Therme Carbon Assistant"
- [x] Platform set to https://spa-dec-therme-bucharest-2025.streamlit.app/ only
- [x] contextApiUrl = https://spa-dec-api-168039836142.europe-west1.run.app
- [x] contextApiSummary populated with footprint API description
- [x] Research tiles re-run for "Therme Bucharest" (9 tiles)

### B. Context API integration ✓
- [x] /api/demo/context-fetch proxy fetches OpenAPI spec, extracts title/description/endpoints
- [x] Workspace loads contextApiUrl from session on init
- [x] "Context loaded" green badge in toolbar
- [x] Context banner below nav showing API title
- [x] First orchestrator message prefixed with context summary

### C. Deploy Standalone button ✓
- [x] "Deploy" button in Workspace toolbar
- [x] Modal for Vercel token entry with instructions
- [x] POST /api/demo/deploy-standalone → async server deployment
- [x] Status polling every 4s → button shows Deploying/Deployed states
- [x] Error shown in modal on failure

### D. Server: deployment logic ✓
- [x] deployToVercel() using Vercel Files Deploy API
- [x] runStandaloneDeployment(): external platforms pass-through, sandbox ones converted for Vercel
- [x] Standalone shell: HTML app with platform tabs + orchestrator chat API
- [x] /demo/session/:id/deploy-standalone (POST + GET /status)
- [x] /demo/keys (PATCH/GET) for credential management
- [x] Vercel token stored in keys.json for reuse

### E. Multiple ports → Vercel ✓
- [x] Each platform: Express server.js → Vercel serverless (api/index.js + vercel.json with catch-all)
- [x] Each platform gets its own Vercel project URL — no ports needed
- [x] External platforms (Therme Streamlit) used as-is
