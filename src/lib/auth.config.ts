import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

/**
 * Configuración compatible con Edge (middleware). Sin Prisma ni Node-only APIs.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
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
