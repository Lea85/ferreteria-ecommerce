import { Suspense } from "react";

import { Footer } from "@/components/storefront/Footer";
import { Header } from "@/components/storefront/Header";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <main className="flex-1">
        <Suspense fallback={null}>{children}</Suspense>
      </main>
      <Footer />
    </div>
  );
}
