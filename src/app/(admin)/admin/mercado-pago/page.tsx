import { redirect } from "next/navigation";

export default function MercadoPagoRedirectPage() {
  redirect("/admin/integraciones?section=mercadopago");
}
