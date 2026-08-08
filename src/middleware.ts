import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  trustHost: true,
});

export default auth;

export const config = {
  matcher: [
    "/admin/:path*",
    "/mi-cuenta/:path*",
    "/checkout/:path*",
  ],
};
