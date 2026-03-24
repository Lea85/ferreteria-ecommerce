"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";

export function WhatsAppFloat() {
  const [visible, setVisible] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    fetch("/api/settings/public?keys=whatsapp_number,whatsapp_message,whatsapp_floating")
      .then((r) => r.json())
      .then((d) => {
        const s = d.settings || {};
        if (s.whatsapp_floating !== "true" || !s.whatsapp_number) return;
        const msg = encodeURIComponent(s.whatsapp_message || "Hola, queria consultar por:");
        setUrl(`https://wa.me/${s.whatsapp_number}?text=${msg}`);
        setVisible(true);
      })
      .catch(() => {});
  }, []);

  if (!visible) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 active:scale-95 print:hidden"
    >
      <MessageCircle className="size-7" />
    </a>
  );
}
