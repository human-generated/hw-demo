import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

const MASTER = process.env.MASTER_URL || 'http://159.65.205.244:3000';

const handler = NextAuth({
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
        if (
          credentials?.email?.toLowerCase().trim() === 'demo@demo.com' &&
          credentials?.password === 'aidemo'
        ) {
          return { id: 'demo', name: 'Demo User', email: 'demo@demo.com' };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Register / update user profile on master server
      try {
        await fetch(`${MASTER}/api/demo/user-profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, name: user.name }),
        });
      } catch {}
      return true;
    },
    async session({ session, token }) {
      if (session?.user && token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) token.sub = user.id || user.email;
      return token;
    },
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
