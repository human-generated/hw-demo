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

        // Built-in demo account
        if (email === 'demo@demo.com' && password === 'aidemo') {
          return { id: 'demo', name: 'Demo User', email: 'demo@demo.com' };
        }

        // Server-stored credentials users
        try {
          const r = await fetch(`${MASTER}/api/demo/user-profile?email=${encodeURIComponent(email)}`);
          const profile = await r.json();
          if (profile?.authType === 'credentials' && profile?.password && profile.password === password) {
            return { id: email, name: profile.name || email, email };
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
        if (user.email === ADMIN_EMAIL) token.isAdmin = true;
      }
      // Google raw profile picture (first sign-in)
      if (profile?.picture) token.picture = profile.picture;
      return token;
    },
  },
  pages: { signIn: '/' },
  secret: process.env.NEXTAUTH_SECRET,
};
