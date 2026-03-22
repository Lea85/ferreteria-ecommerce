import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/db";

type AppUserFields = {
  role: string;
  customerType: string;
};

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  trustHost: true,
  secret:
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV === "development"
      ? "dev-auth-secret-change-me"
      : undefined),
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      name: "Credenciales",
      credentials: {
        email: { label: "Correo electrónico", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: [user.name, user.lastName].filter(Boolean).join(" ").trim(),
          image: user.image ?? user.avatarUrl ?? undefined,
          role: user.role,
          customerType: user.customerType,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      if (!user?.id) return true;

      const row = await prisma.user.findUnique({
        where: { id: user.id },
        select: { customerType: true, isApproved: true },
      });

      if (!row) return false;

      if (
        (row.customerType === "TRADE" ||
          row.customerType === "WHOLESALE") &&
        !row.isApproved
      ) {
        return "/login?error=CuentaPendienteAprobacion";
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const u = user as typeof user & AppUserFields;
        token.role = u.role;
        token.customerType = u.customerType;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? session.user.id;
        const u = session.user as any;
        if (token.role) u.role = token.role;
        if (token.customerType) u.customerType = token.customerType;
      }
      return session;
    },
  },
});

export function isAdminRole(role: string | undefined): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}
