import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Google from "next-auth/providers/google";
import WebAuthn from "next-auth/providers/webauthn";
import { db } from "@/lib/db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
  authenticators,
} from "@/lib/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  basePath: "/api/auth",
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
    authenticatorsTable: authenticators,
  }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: { params: { prompt: "select_account" } },
    }),
    WebAuthn, // 臉部/指紋辨識
  ],
  experimental: { enableWebAuthn: true },
  callbacks: {
    async session({ session, user }) {
      // 將 user.id 注入 session，供所有 API Route 使用
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
