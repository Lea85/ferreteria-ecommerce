import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user) return null;

  const sessionUser = session.user as { id?: string; email?: string | null };
  if (sessionUser.id) return sessionUser.id;

  if (sessionUser.email) {
    const user = await prisma.user.findUnique({
      where: { email: sessionUser.email },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  return null;
}
