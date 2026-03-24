"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { SITE_NAME } from "@/lib/constants";

type StoreConfig = {
  storeName: string;
  logoUrl: string | null;
};

const StoreConfigContext = createContext<StoreConfig>({
  storeName: SITE_NAME,
  logoUrl: null,
});

export function useStoreConfig() {
  return useContext(StoreConfigContext);
}

export function StoreConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<StoreConfig>({ storeName: SITE_NAME, logoUrl: null });

  useEffect(() => {
    fetch("/api/settings/public?keys=store_name,store_logo_url")
      .then((r) => r.json())
      .then((d) => {
        const s = d.settings || {};
        setConfig({
          storeName: s.store_name || SITE_NAME,
          logoUrl: s.store_logo_url || null,
        });
        if (s.store_logo_url) {
          let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
          if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            document.head.appendChild(link);
          }
          link.href = s.store_logo_url;
        }
      })
      .catch(() => {});
  }, []);

  return (
    <StoreConfigContext.Provider value={config}>
      {children}
    </StoreConfigContext.Provider>
  );
}
