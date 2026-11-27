import NextAuth, { type DefaultSession } from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { z } from "zod";
import { connectDb } from "../db/connect";
import { UserModel } from "../db/models";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

export const devLoginEnabled =
  process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_LOGIN === "true";

const providers: Provider[] = [];
if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) providers.push(GitHub);
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) providers.push(Google);
if (devLoginEnabled) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Dev login",
      credentials: { email: { label: "Email", type: "email" } },
      authorize(credentials) {
        const parsed = z.object({ email: z.email() }).safeParse(credentials);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();
        return { id: email, email, name: email.split("@")[0] };
      },
    }),
  );
}

/** Providers shown on the sign-in page (Credentials handled separately). */
export const oauthProviders = providers
  .map((p) => (typeof p === "function" ? p() : p))
  .filter((p) => p.type === "oauth" || p.type === "oidc")
  .map((p) => ({ id: p.id, name: p.name }));

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    async jwt({ token, user }) {
      // `user` is only present on sign-in: create or update our own user record then.
      if (user?.email) {
        await connectDb();
        const update: Record<string, unknown> = {};
        if (user.name) update.name = user.name;
        if (user.image) update.image = user.image;
        const doc = await UserModel.findOneAndUpdate(
          { email: user.email.toLowerCase() },
          { $set: update, $setOnInsert: { email: user.email.toLowerCase() } },
          { upsert: true, returnDocument: "after" },
        );
        token.uid = doc!._id.toString();
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.uid === "string") session.user.id = token.uid;
      return session;
    },
  },
});
