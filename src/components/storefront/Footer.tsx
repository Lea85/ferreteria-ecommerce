import Link from "next/link";

import { SITE_NAME } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-muted/40 py-8 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
        <p>© {new Date().getFullYear()} {SITE_NAME}</p>
        <nav className="flex gap-4">
          <Link href="/" className="hover:text-foreground">
            Inicio
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Cuenta
          </Link>
        </nav>
      </div>
    </footer>
  );
}
