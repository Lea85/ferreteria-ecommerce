import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id?: string;
      role?: string;
      customerType?: string;
    };
  }

  interface User {
    role?: string;
    customerType?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    customerType?: string;
  }
}
