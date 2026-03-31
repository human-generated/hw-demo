# hw-demo Feature Steps

## Authentication & Landing Page

- [x] 1. Create `LandingPage.jsx` — avatar left, Google + credentials login right, #EDF1F3 bg, humans "h" logo, 1-min call timeout
- [x] 2. Add NextAuth.js — `/app/api/auth/[...nextauth]/route.js` with Google + Credentials providers
- [x] 3. Add Google/NextAuth env vars to `.env.local` (NEXTAUTH_SECRET set; GOOGLE_CLIENT_ID/SECRET placeholders — fill in Google Cloud Console)
- [x] 4. Add user profiles backend — `POST/GET /api/demo/user-profile` on server.js, persisted in `user_profiles.json`, $5 initial credits for new users
- [x] 5. Create `SessionsPage.jsx` — credit badge + session list + new session button (post-login view)
- [x] 6. Update `page.jsx` — route through LandingPage → SessionsPage → existing views; auth via NextAuth useSession

## Credits & Spend Tracking

- [x] 7. Update `CreditBadge.jsx` — "Stripe" → "Card" with Stripe logo SVG; credits start at $5
- [x] 8. Add OpenRouter usage tracking in `agent.js` — parse `usage` from OR responses, report cost via /api/demo/user-profile/deduct
- [x] 9. Persist spend to user profile on server — deduct from user credits on each LLM response (claude-sonnet-4-6: $3/M input, $15/M output)

## Per-Session Prompts

- [x] 10. Per-session prompt auto-generated — `generate-prompt` called automatically after research completes; each session gets unique prompt from company/platforms/workers data

## Deploy

- [x] 11. Git push → Vercel auto-deploy (commit e47ae86)
- [ ] 12. Add GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in Vercel env vars (Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs; redirect URI: https://hw-demo.vercel.app/api/auth/callback/google)
