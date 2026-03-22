import { auth, isAdminRole } from "@/auth";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Sidebar } from "@/components/admin/Sidebar";
import { AuthSessionProvider } from "@/components/providers/session-provider";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const bypass = process.env.ADMIN_LAYOUT_BYPASS === "1";
  const session = bypass ? null : await auth();
  const user = bypass
    ? {
        name: "Administrador",
        email: "dev@ferresanit.local",
        role: "ADMIN" as const,
      }
    : session?.user;

  const allowed =
    bypass || (session?.user && isAdminRole(session.user.role));

  if (!allowed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-muted/30 p-8">
        <h1 className="text-xl font-semibold text-foreground">
          Acceso denegado
        </h1>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          Necesitás una cuenta de administrador para ver este panel. Si estás
          desarrollando, podés definir{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            ADMIN_LAYOUT_BYPASS=1
          </code>{" "}
          en tu entorno local.
        </p>
      </div>
    );
  }

  return (
    <AuthSessionProvider>
      <div className="min-h-screen bg-[#f8fafc]">
        <Sidebar
          user={{
            name: user?.name,
            email: user?.email,
          }}
        />
        <div className="lg:pl-64">
          <AdminHeader
            user={{
              name: user?.name,
              email: user?.email,
            }}
          />
          <main className="mx-auto max-w-[1600px] p-4 pb-12 pt-4 lg:p-8 lg:pt-6">
            {children}
          </main>
        </div>
      </div>
    </AuthSessionProvider>
  );
}
