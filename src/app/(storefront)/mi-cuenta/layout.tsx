import { MiCuentaSidebar } from "@/components/storefront/MiCuentaSidebar";

export const dynamic = "force-dynamic";

export default function MiCuentaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground md:text-3xl">
        Mi cuenta
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Gestioná tu perfil, pedidos y direcciones.
      </p>
      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr] lg:items-start">
        <MiCuentaSidebar />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
