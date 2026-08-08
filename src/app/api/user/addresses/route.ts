import { NextResponse } from "next/server";

import {
  createUserAddress,
  listUserAddresses,
} from "@/lib/services/user-address.service";
import { getAuthenticatedUserId } from "@/lib/user-session";
import { addressSchema } from "@/lib/validators/auth.validator";

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const addresses = await listUserAddresses(userId);
    return NextResponse.json({ addresses });
  } catch (error) {
    console.error("User addresses GET error:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las direcciones" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = addressSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const address = await createUserAddress(userId, parsed.data);
    return NextResponse.json({ address }, { status: 201 });
  } catch (error) {
    console.error("User addresses POST error:", error);
    return NextResponse.json(
      { error: "No se pudo guardar la dirección" },
      { status: 500 },
    );
  }
}
