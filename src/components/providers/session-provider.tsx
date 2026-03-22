"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

export function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      {children}
      <Toaster richColors position="top-center" closeButton />
    </SessionProvider>
  );
}
