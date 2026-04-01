import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

const MASTER = process.env.MASTER_URL || 'http://159.65.205.244:3000';
export const ADMIN_EMAIL = 'dragos.costea@humans.ai';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.toLowerCase().trim();
        const password = credentials.password;

        // Hardcoded accounts (always work regardless of master)
        const HARDCODED = {
          'demo@demo.com': { password: 'aidemo',      name: 'Demo User', isAdmin: false },
          'demo@demo.ai':  { password: 'aidemo',      name: 'Demo User', isAdmin: false },
          'admin@demo.com':{ password: 'aidemoadmin', name: 'Admin',     isAdmin: true  },
        };
        if (HARDCODED[email] && HARDCODED[email].password === password) {
          const h = HARDCODED[email];
          return { id: email, name: h.name, email, isAdmin: h.isAdmin };
        }

        // Server-stored credentials users
        try {
          const r = await fetch(`${MASTER}/api/demo/user-profile?email=${encodeURIComponent(email)}`);
          const profile = await r.json();
          if (profile?.authType === 'credentials' && profile?.password && profile.password === password) {
            return { id: email, name: profile.name || email, email, isAdmin: !!profile.isAdmin };
          }
        } catch {}

        return null;
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      try {
        await fetch(`${MASTER}/api/demo/user-profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, name: user.name, image: user.image || null }),
        });
      } catch {}
      return true;
    },
    async session({ session, token }) {
      if (session?.user) {
        if (token?.sub) session.user.id = token.sub;
        if (token?.picture) session.user.image = token.picture;
        if (token?.isAdmin) session.user.isAdmin = true;
      }
      return session;
    },
    async jwt({ token, user, profile }) {
      if (user) {
        token.sub = user.id || user.email;
        if (user.image) token.picture = user.image;
        if (user.isAdmin) token.isAdmin = true;
      }
      if (profile?.picture) token.picture = profile.picture;
      // Re-check admin on every token refresh so existing sessions pick it up
      const email = token.email || user?.email;
      if (email === ADMIN_EMAIL) token.isAdmin = true;
      // Check server-side isAdmin for promoted users
      if (email && !token.isAdmin) {
        try {
          const r = await fetch(`${MASTER}/api/demo/user-profile?email=${encodeURIComponent(email)}`);
          const p = await r.json();
          if (p?.isAdmin) token.isAdmin = true;
        } catch {}
      }
      return token;
    },
  },
  pages: { signIn: '/' },
  secret: process.env.NEXTAUTH_SECRET,
};
