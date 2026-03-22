import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Nombre, email y mensaje son obligatorios." }, { status: 400 });
    }

    const setting = await prisma.setting.findUnique({ where: { key: "contact_email" } });
    const contactEmail = setting?.value || "ventas@ferrosan.com.ar";

    // Store the contact message in settings as a log (or we could create a ContactMessage model)
    // For now, we'll use a simple approach: store it and return the contact email
    // In production, you'd integrate with an email service (SendGrid, Resend, etc.)

    // Log contact to console for now
    console.log("=== NUEVO MENSAJE DE CONTACTO ===");
    console.log(`Para: ${contactEmail}`);
    console.log(`De: ${name} <${email}>`);
    console.log(`Telefono: ${phone || "No proporcionado"}`);
    console.log(`Mensaje: ${message}`);
    console.log("=================================");

    return NextResponse.json({
      success: true,
      message: `Tu mensaje fue enviado correctamente a ${contactEmail}. Te responderemos a la brevedad.`,
    });
  } catch (error) {
    console.error("Contact POST:", error);
    return NextResponse.json({ error: "Error al enviar el mensaje." }, { status: 500 });
  }
}
