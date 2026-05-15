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
  // ── JWT Strategy：Session 存在加密 Cookie，不依賴 DB ────────────────
  // 好處：重新部署後 Session 不失效，避免循環登入問題
  session: { strategy: "jwt" },
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
    WebAuthn,
  ],
  experimental: { enableWebAuthn: true },
  callbacks: {
    // JWT callback：登入時將 user.id 寫入 token
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    // Session callback：從 token 取出 id 注入 session
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
