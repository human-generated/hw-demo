# hw-demo Feature Steps

## Authentication & Landing Page

- [ ] 1. Create `LandingPage.jsx` — avatar left, Google + credentials login right, #EDF1F3 bg, humans "h" logo, 1-min call timeout
- [ ] 2. Add NextAuth.js — `/app/api/auth/[...nextauth]/route.js` with Google + Credentials providers
- [ ] 3. Add Google/NextAuth env vars to `.env.local`
- [ ] 4. Add user profiles backend — `POST/GET /api/demo/user-profile` on server.js, persisted in `user_profiles.json`, $5 initial credits for new users
- [ ] 5. Create `SessionsPage.jsx` — credit badge + session list + new session button (post-login view)
- [ ] 6. Update `page.jsx` — route through LandingPage → SessionsPage → existing views; session creation links sessions to user

## Credits & Spend Tracking

- [ ] 7. Update `CreditBadge.jsx` — "Stripe" → "Card" with Stripe logo SVG; load credit from user profile
- [ ] 8. Add OpenRouter usage tracking in `agent.js` — parse `usage` from OR responses, report cost via data channel
- [ ] 9. Persist spend to user profile on server — deduct from user credits on each LLM response

## Per-Session Prompts

- [ ] 10. Ensure per-session prompt auto-generated — call `generate-prompt` automatically after research/platforms/workers are set on a session

## Deploy

- [ ] 11. Git push → Vercel auto-deploy
- [ ] 12. Verify all steps end-to-end
