"""Genera PDF de la guia Mercado Pago para mantenimiento."""
from pathlib import Path

from fpdf import FPDF

OUT = Path(__file__).parent / "guia-configuracion-mercadopago.pdf"
FONT = "Helvetica"

REPLACEMENTS = str.maketrans({
    "á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ü": "u", "ñ": "n",
    "Á": "A", "É": "E", "Í": "I", "Ó": "O", "Ú": "U", "Ñ": "N",
    "→": "->", "—": "-", "•": "-",
})


def safe(text: str) -> str:
    return text.translate(REPLACEMENTS)


class GuidePDF(FPDF):
    def header(self):
        self.set_font(FONT, "B", 10)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, "FerroSan E-commerce - Guia Mercado Pago", align="R")
        self.ln(12)

    def footer(self):
        self.set_y(-15)
        self.set_font(FONT, "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, f"Pagina {self.page_no()}", align="C")

    def _w(self) -> float:
        return self.w - self.l_margin - self.r_margin

    def section_title(self, title: str):
        self.ln(4)
        self.set_font(FONT, "B", 13)
        self.set_text_color(20, 60, 120)
        self.multi_cell(self._w(), 8, safe(title))
        self.ln(2)

    def sub_title(self, title: str):
        self.ln(2)
        self.set_font(FONT, "B", 11)
        self.set_text_color(40, 40, 40)
        self.multi_cell(self._w(), 7, safe(title))
        self.ln(1)

    def body(self, text: str):
        self.set_font(FONT, "", 10)
        self.set_text_color(30, 30, 30)
        self.multi_cell(self._w(), 5.5, safe(text))
        self.ln(1)

    def bullet(self, text: str):
        self.set_font(FONT, "", 10)
        self.set_text_color(30, 30, 30)
        self.multi_cell(self._w(), 5.5, safe(f"  -  {text}"))

    def mono(self, text: str):
        self.set_font("Courier", "", 9)
        self.set_fill_color(245, 245, 245)
        self.multi_cell(self._w(), 5, safe(text), fill=True)
        self.ln(1)


def main():
    pdf = GuidePDF()
    pdf.set_margins(18, 18, 18)
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()
    w = pdf._w()

    pdf.set_font(FONT, "B", 18)
    pdf.set_text_color(20, 60, 120)
    pdf.multi_cell(w, 10, safe("Guia de configuracion\nMercado Pago"))
    pdf.ln(4)
    pdf.set_font(FONT, "", 10)
    pdf.set_text_color(60, 60, 60)
    pdf.multi_cell(
        w,
        6,
        safe(
            "Proyecto: FerroSan E-commerce\n"
            "URL produccion: https://ferreteria-ecommerce-psi.vercel.app\n"
            "Documento para: Mantenimiento y operacion\n"
            "Ultima actualizacion: Mayo 2026",
        ),
    )

    pdf.section_title("1. Resumen")
    pdf.body(
        "Esta guia explica como habilitar y mantener pagos con Mercado Pago en la tienda FerroSan. "
        "Las credenciales se guardan en la base de datos (tabla settings), no en el codigo."
    )
    pdf.body("Ubicacion en el admin: Admin -> Integraciones -> seccion Mercado Pago")
    pdf.mono("https://ferreteria-ecommerce-psi.vercel.app/admin/integraciones?section=mercadopago")
    pdf.body("La ruta antigua /admin/mercado-pago redirige automaticamente a Integraciones.")

    pdf.section_title("2. Que hace la integracion")
    pdf.bullet("Se crea el pedido (estado PENDING, metodo MERCADO_PAGO) y se descuenta stock.")
    pdf.bullet("Se abre un modal con el formulario de pago (Payment Brick).")
    pdf.bullet("Pago aprobado -> pedido PAYMENT_APPROVED -> pagina de exito.")
    pdf.bullet("Mercado Pago notifica via webhook aunque el cliente cierre el navegador.")

    pdf.section_title("3. Requisitos previos")
    pdf.sub_title("3.1 Cuenta Mercado Pago")
    pdf.bullet("Cuenta vendedor en mercadopago.com.ar, verificada para cobros reales.")
    pdf.sub_title("3.2 Variable en Vercel (critica)")
    pdf.body("Settings -> Environment Variables del proyecto ferreteria-ecommerce:")
    pdf.mono("NEXT_PUBLIC_APP_URL = https://ferreteria-ecommerce-psi.vercel.app")
    pdf.body("Sin esta variable, webhooks y redirecciones pueden usar URL incorrecta.")
    pdf.sub_title("3.3 Acceso admin")
    pdf.body("Solo roles ADMIN o SUPER_ADMIN acceden a Integraciones.")

    pdf.add_page()
    pdf.section_title("4. Mercado Pago Developers")
    pdf.sub_title("Paso 1 - Crear aplicacion")
    pdf.bullet("Ingresar a www.mercadopago.com.ar/developers/panel/app")
    pdf.bullet("Crear aplicacion (ej: FerroSan Tienda) con pagos online.")
    pdf.sub_title("Paso 2 - Credenciales")
    pdf.body("Public Key -> formulario en navegador -> Integraciones -> Mercado Pago")
    pdf.body("Access Token -> servidor (secreto) -> Integraciones -> Mercado Pago")
    pdf.sub_title("Modo prueba vs produccion")
    pdf.bullet("TEST- = sandbox (pruebas sin dinero real). Modo prueba ON en admin.")
    pdf.bullet("APP_USR- = produccion (cobros reales). Modo prueba OFF en admin.")
    pdf.bullet("Public Key y Access Token deben ser del mismo entorno.")
    pdf.sub_title("Usuarios de prueba")
    pdf.body("En Developers -> Cuentas de prueba: crear vendedor y comprador de test.")

    pdf.section_title("5. Configurar en Admin")
    pdf.bullet("Ir a Admin -> Integraciones -> expandir Mercado Pago.")
    pdf.bullet("Habilitar Mercado Pago en checkout = ON")
    pdf.bullet("Modo prueba segun credenciales TEST o APP_USR")
    pdf.bullet("Completar Public Key y Access Token -> Guardar")
    pdf.body("Si el token ya esta guardado, dejar el campo vacio al guardar para mantenerlo.")

    pdf.section_title("6. Webhook (notificaciones)")
    pdf.body("Configurar en Mercado Pago Developers -> Webhooks / IPN:")
    pdf.mono("https://ferreteria-ecommerce-psi.vercel.app/api/webhooks/mercadopago")
    pdf.bullet("Suscribir evento: payment")
    pdf.body("Estados: approved -> PAYMENT_APPROVED | rejected/cancelled -> CANCELLED + stock restaurado")

    pdf.add_page()
    pdf.section_title("7. Procedimiento de prueba")
    pdf.sub_title("7.1 Checkout")
    pdf.bullet("Carrito -> Datos -> Envio -> Pago: ver Mercado Pago habilitado.")
    pdf.sub_title("7.2 Sandbox")
    pdf.bullet("Modo prueba ON + credenciales TEST-. Pagar con usuario/tarjeta de prueba.")
    pdf.bullet("Verificar /checkout/exito y pedido en Admin -> Ventas.")
    pdf.sub_title("7.3 Produccion")
    pdf.bullet("Credenciales APP_USR-, modo prueba OFF, webhook OK, compra real de monto bajo.")

    pdf.section_title("8. Errores frecuentes")
    pdf.bullet("'Sin configurar': falta key/token o MP deshabilitado.")
    pdf.bullet("Modal no carga: Public Key incorrecta o mezcla TEST/APP_USR.")
    pdf.bullet("Pago OK, pedido pendiente: webhook mal configurado.")
    pdf.bullet("URL webhook incorrecta: falta NEXT_PUBLIC_APP_URL en Vercel.")

    pdf.section_title("9. Referencia tecnica")
    pdf.body("APIs: GET/PUT /api/admin/mercadopago | POST /api/checkout/mercadopago/create")
    pdf.body("Webhook: POST /api/webhooks/mercadopago")
    pdf.body("Claves DB: mercadopago_enabled, mercadopago_public_key, mercadopago_access_token, mercadopago_sandbox")
    pdf.body("Deploy: npm run deploy:prod desde carpeta del proyecto.")

    pdf.section_title("10. Checklist")
    for item in [
        "Cuenta MP verificada",
        "App en Developers creada",
        "Public Key + Access Token en Integraciones",
        "MP habilitado en checkout",
        "Modo prueba acorde a credenciales",
        "NEXT_PUBLIC_APP_URL en Vercel",
        "Webhook con URL de produccion + evento payment",
        "Prueba sandbox OK",
        "Credenciales produccion cuando corresponda",
    ]:
        pdf.bullet(f"[ ] {item}")

    pdf.section_title("11. Enlaces")
    pdf.mono("Tienda: https://ferreteria-ecommerce-psi.vercel.app")
    pdf.mono("Integraciones: .../admin/integraciones")
    pdf.mono("Developers: https://www.mercadopago.com.ar/developers/panel/app")
    pdf.mono("Docs MP: https://www.mercadopago.com.ar/developers/es/docs")

    pdf.output(str(OUT))
    print(f"PDF generado: {OUT}")


if __name__ == "__main__":
    main()
