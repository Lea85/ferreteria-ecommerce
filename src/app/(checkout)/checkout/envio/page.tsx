"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, Plus, Store, Truck } from "lucide-react";
import { toast } from "sonner";

import {
  CheckoutShippingAddressForm,
  isCheckoutAddressComplete,
} from "@/components/checkout/CheckoutShippingAddressForm";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckoutOrderSummary } from "@/components/storefront/CheckoutOrderSummary";
import {
  CHECKOUT_ENVIO_KEY,
  EMPTY_CHECKOUT_ADDRESS,
  parseCheckoutShippingState,
  userAddressToCheckoutDraft,
  type CheckoutShippingState,
} from "@/lib/checkout-shipping";
import { formatUserAddressLine1, type UserAddressDto } from "@/lib/user-address";
import { cartHasOverStock, toastCheckoutBlockedOverStock } from "@/lib/cart-stock";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cart.store";

export default function CheckoutEnvioPage() {
  const router = useRouter();
  const { status } = useSession();
  const items = useCartStore((s) => s.items);

  const [loading, setLoading] = useState(true);
  const [storeAddress, setStoreAddress] = useState("Av. Caseros 2421, CABA");
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string>();
  const [savedAddresses, setSavedAddresses] = useState<UserAddressDto[]>([]);
  const [shipping, setShipping] = useState<CheckoutShippingState>({ method: "pickup" });

  useEffect(() => {
    const stored = localStorage.getItem(CHECKOUT_ENVIO_KEY);
    if (stored) {
      setShipping(parseCheckoutShippingState(stored));
    }

    Promise.all([
      fetch("/api/settings/public?keys=google_maps_address,google_maps_api_key").then(
        (r) => r.json(),
      ),
      status === "authenticated"
        ? fetch("/api/user/addresses").then((r) => r.json())
        : Promise.resolve({ addresses: [] }),
    ])
      .then(([settingsData, addressesData]) => {
        if (settingsData.settings?.google_maps_address) {
          setStoreAddress(settingsData.settings.google_maps_address);
        }
        if (settingsData.settings?.google_maps_api_key) {
          setGoogleMapsApiKey(settingsData.settings.google_maps_api_key);
        }
        setSavedAddresses(addressesData.addresses ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    localStorage.setItem(CHECKOUT_ENVIO_KEY, JSON.stringify(shipping));
  }, [shipping]);

  const usingNewAddress =
    shipping.method === "delivery" &&
    (shipping.selectedAddressId === "new" || savedAddresses.length === 0);

  const selectedSavedAddress = useMemo(() => {
    if (!shipping.selectedAddressId || shipping.selectedAddressId === "new") {
      return null;
    }
    return savedAddresses.find((a) => a.id === shipping.selectedAddressId) ?? null;
  }, [savedAddresses, shipping.selectedAddressId]);

  function selectMethod(method: "pickup" | "delivery") {
    setShipping((prev) => {
      if (method === "pickup") {
        return { method: "pickup" };
      }

      const defaultId =
        savedAddresses.find((a) => a.isDefault)?.id ?? savedAddresses[0]?.id;

      if (defaultId) {
        const address = savedAddresses.find((a) => a.id === defaultId);
        return {
          method: "delivery",
          selectedAddressId: defaultId,
          address: address ? userAddressToCheckoutDraft(address) : EMPTY_CHECKOUT_ADDRESS,
        };
      }

      return {
        method: "delivery",
        selectedAddressId: "new",
        address: { ...EMPTY_CHECKOUT_ADDRESS },
      };
    });
  }

  function selectSavedAddress(address: UserAddressDto) {
    setShipping({
      method: "delivery",
      selectedAddressId: address.id,
      address: userAddressToCheckoutDraft(address),
    });
  }

  function selectNewAddress() {
    setShipping({
      method: "delivery",
      selectedAddressId: "new",
      address: { ...EMPTY_CHECKOUT_ADDRESS, saveToProfile: status === "authenticated" },
    });
  }

  async function validateCurrentPostalCode(): Promise<boolean> {
    const address = shipping.address;
    if (!address?.postalCode.trim()) return false;

    try {
      const params = new URLSearchParams({ code: address.postalCode.trim() });
      if (address.city.trim()) params.set("city", address.city.trim());
      if (address.state.trim()) params.set("state", address.state.trim());
      const res = await fetch(`/api/postal-code/validate?${params.toString()}`);
      const data = await res.json();
      const valid = Boolean(data.valid);
      if (!valid) {
        toast.error(data.message || "Código postal inválido.");
      }
      return valid;
    } catch {
      toast.error("No se pudo validar el código postal.");
      return false;
    }
  }

  async function handleContinue() {
    if (cartHasOverStock(items)) {
      toastCheckoutBlockedOverStock();
      router.push("/carrito");
      return;
    }

    if (shipping.method === "pickup") {
      router.push("/checkout/pago");
      return;
    }

    if (selectedSavedAddress && shipping.selectedAddressId !== "new") {
      router.push("/checkout/pago");
      return;
    }

    const address = shipping.address;
    if (!address || !isCheckoutAddressComplete(address)) {
      toast.error("Completá todos los campos obligatorios de la dirección.");
      return;
    }

    const ok = await validateCurrentPostalCode();
    if (!ok) return;

    router.push("/checkout/pago");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-bold text-foreground">Método de envío</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Elegí cómo querés recibir tu pedido.
        </p>

        <div className="mt-8 space-y-4">
          <button
            type="button"
            onClick={() => selectMethod("pickup")}
            className={cn(
              "flex w-full gap-4 rounded-xl border-2 p-4 text-left transition-colors",
              shipping.method === "pickup"
                ? "border-store-orange bg-store-orange/5"
                : "border-border hover:border-primary/30",
            )}
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Store className="size-6" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Retiro en sucursal</p>
              <p className="text-sm text-muted-foreground">Gratis</p>
              <p className="mt-2 text-xs text-muted-foreground">{storeAddress}</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => selectMethod("delivery")}
            className={cn(
              "flex w-full gap-4 rounded-xl border-2 p-4 text-left transition-colors",
              shipping.method === "delivery"
                ? "border-store-orange bg-store-orange/5"
                : "border-border hover:border-primary/30",
            )}
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Truck className="size-6" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Envío a domicilio</p>
              <p className="text-sm text-muted-foreground">Costo a confirmar</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Entrega estimada 3-6 días hábiles (CABA y GBA).
              </p>
            </div>
          </button>
        </div>

        {shipping.method === "delivery" ? (
          <div className="mt-8 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Dirección de entrega</h2>

            {status === "authenticated" && savedAddresses.length > 0 ? (
              <ul className="space-y-2">
                {savedAddresses.map((address) => {
                  const selected = shipping.selectedAddressId === address.id;
                  return (
                    <li key={address.id}>
                      <button
                        type="button"
                        onClick={() => selectSavedAddress(address)}
                        className={cn(
                          "flex w-full gap-3 rounded-lg border p-3 text-left transition-colors",
                          selected
                            ? "border-store-orange bg-store-orange/5"
                            : "border-border hover:border-primary/30",
                        )}
                      >
                        <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">
                            {address.label || "Dirección"}
                            {address.isDefault ? (
                              <span className="ms-2 text-xs font-normal text-store-orange">
                                · Predeterminada
                              </span>
                            ) : null}
                          </p>
                          <p className="truncate text-sm text-muted-foreground">
                            {formatUserAddressLine1(address)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {address.city}, {address.state} · CP {address.postalCode}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={selectNewAddress}
            >
              <Plus className="size-4" />
              {savedAddresses.length > 0 ? "Usar otra dirección" : "Cargar dirección de envío"}
            </Button>

            {usingNewAddress && shipping.address ? (
              <CheckoutShippingAddressForm
                value={shipping.address}
                onChange={(address) =>
                  setShipping((prev) => ({
                    ...prev,
                    method: "delivery",
                    selectedAddressId: "new",
                    address,
                  }))
                }
                googleMapsApiKey={googleMapsApiKey}
                showSaveOptions={status === "authenticated"}
              />
            ) : null}

            {!usingNewAddress && selectedSavedAddress ? (
              <p className="text-sm text-muted-foreground">
                Envío a: {formatUserAddressLine1(selectedSavedAddress)}, {" "}
                {selectedSavedAddress.city} ({selectedSavedAddress.postalCode})
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <Label className="text-foreground">Tiempo estimado</Label>
          <p className="mt-1">
            {shipping.method === "pickup"
              ? `24-48 h hábiles para retiro en ${storeAddress}.`
              : "3-6 días hábiles según zona y volumen del pedido."}
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" asChild>
            <Link href="/checkout/datos">Volver</Link>
          </Button>
          <Button
            type="button"
            className="bg-store-orange text-store-orange-foreground hover:bg-store-orange/90"
            onClick={() => void handleContinue()}
          >
            Continuar
          </Button>
        </div>
      </div>
      <CheckoutOrderSummary />
    </div>
  );
}
