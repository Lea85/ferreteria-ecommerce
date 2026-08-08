"use client";

import { Printer } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  COUNTER_SALE_PRINT_STORE_KEYS,
  printCounterSale,
  type CounterSalePrintOrder,
} from "@/lib/counter-sale-print";

export function OrderPrintButton({ order }: { order: CounterSalePrintOrder }) {
  const [storeSettings, setStoreSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/settings/public?keys=${COUNTER_SALE_PRINT_STORE_KEYS}`)
      .then((r) => r.json())
      .then((data) => setStoreSettings(data.settings || {}))
      .catch(() => {});
  }, []);

  function handlePrint() {
    printCounterSale(order, storeSettings);
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="gap-2"
      onClick={handlePrint}
    >
      <Printer className="size-4" />
      Imprimir
    </Button>
  );
}
