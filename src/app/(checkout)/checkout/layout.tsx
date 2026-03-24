"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { CheckoutStepper } from "@/components/storefront/CheckoutStepper";
import { useStoreConfig } from "@/contexts/store-config";

function stepFromPath(path: string): 1 | 2 | 3 {
  if (path.includes("/checkout/pago")) return 3;
  if (path.includes("/checkout/envio")) return 2;
  return 1;
}

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const { storeName, logoUrl } = useStoreConfig();
  const step = stepFromPath(pathname);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-primary">
            {logoUrl && <img src={logoUrl} alt={storeName} className="size-8 rounded-lg object-contain" />}
            {storeName}
          </Link>
        </div>
        <CheckoutStepper currentStep={step} />
      </header>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <Suspense fallback={null}>{children}</Suspense>
      </div>
    </div>
  );
}
