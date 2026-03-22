import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as Record<string, unknown>).role;
        token.customerType = (user as Record<string, unknown>).customerType;
      }
      return token;
    },
    session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.id = token.sub ?? session.user.id;
        if (token.role) session.user.role = token.role;
        if (token.customerType)
          session.user.customerType = token.customerType;
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      if (pathname.startsWith("/admin")) {
        const role = auth?.user?.role;
        if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
          const url = new URL("/login", request.url);
          url.searchParams.set("callbackUrl", pathname);
          return NextResponse.redirect(url);
        }
      }

      if (
        pathname.startsWith("/mi-cuenta") ||
        pathname.startsWith("/checkout")
      ) {
        if (!auth?.user) {
          const url = new URL("/login", request.url);
          url.searchParams.set("callbackUrl", pathname);
          return NextResponse.redirect(url);
        }
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
