import { NextResponse } from "next/server";

import {
  deleteUserAddress,
  setDefaultUserAddress,
  updateUserAddress,
} from "@/lib/services/user-address.service";
import { getAuthenticatedUserId } from "@/lib/user-session";
import { addressSchema } from "@/lib/validators/auth.validator";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();

    if (body?.action === "setDefault") {
      const address = await setDefaultUserAddress(userId, id);
      if (!address) {
        return NextResponse.json({ error: "Dirección no encontrada" }, { status: 404 });
      }
      return NextResponse.json({ address });
    }

    const parsed = addressSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const address = await updateUserAddress(userId, id, parsed.data);
    if (!address) {
      return NextResponse.json({ error: "Dirección no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ address });
  } catch (error) {
    console.error("User addresses PATCH error:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la dirección" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await context.params;
    const deleted = await deleteUserAddress(userId, id);
    if (!deleted) {
      return NextResponse.json({ error: "Dirección no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("User addresses DELETE error:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar la dirección" },
      { status: 500 },
    );
  }
}
