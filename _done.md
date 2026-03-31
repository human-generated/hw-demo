# Done

All steps completed (see STEPS.md). One manual step remaining:

## ⚠️ Google OAuth credentials needed

To enable "Login with Google":

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `https://hw-demo.vercel.app/api/auth/callback/google`
4. Add to Vercel env vars:
   - `GOOGLE_CLIENT_ID` = your client ID
   - `GOOGLE_CLIENT_SECRET` = your client secret
5. Redeploy (or Vercel auto-redeploys on env change)

Until then, the credentials login (`demo@demo.com` / `aidemo`) works fully.
