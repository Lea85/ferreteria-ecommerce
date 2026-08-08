"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { resolveAdminProductsBackHref } from "@/lib/admin-products-list-url";

type AdminProductsBackButtonProps = {
  fallback?: string;
  className?: string;
};

export function AdminProductsBackButton({
  fallback = "/admin/productos",
  className,
}: AdminProductsBackButtonProps) {
  const searchParams = useSearchParams();
  const href = resolveAdminProductsBackHref(searchParams, fallback);

  return (
    <Button variant="ghost" size="icon" className={className} asChild>
      <Link href={href} aria-label="Volver">
        <ArrowLeft className="size-5" />
      </Link>
    </Button>
  );
}
