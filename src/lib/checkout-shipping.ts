import type { UserAddressDto } from "@/lib/user-address";

export type CheckoutAddressDraft = {
  label: string;
  street: string;
  number: string;
  floor: string;
  apartment: string;
  city: string;
  state: string;
  postalCode: string;
  instructions: string;
  saveToProfile: boolean;
  setAsDefault: boolean;
};

export type CheckoutShippingState = {
  method: "pickup" | "delivery";
  /** ID de dirección guardada, o "new" para formulario manual. */
  selectedAddressId?: string;
  address?: CheckoutAddressDraft;
};

export const CHECKOUT_ENVIO_KEY = "checkout_envio";

export const EMPTY_CHECKOUT_ADDRESS: CheckoutAddressDraft = {
  label: "Envío",
  street: "",
  number: "",
  floor: "",
  apartment: "",
  city: "",
  state: "",
  postalCode: "",
  instructions: "",
  saveToProfile: true,
  setAsDefault: false,
};

export function userAddressToCheckoutDraft(
  address: UserAddressDto,
): CheckoutAddressDraft {
  return {
    label: address.label ?? "Envío",
    street: address.street,
    number: address.number,
    floor: address.floor ?? "",
    apartment: address.apartment ?? "",
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    instructions: address.instructions ?? "",
    saveToProfile: false,
    setAsDefault: false,
  };
}

export function checkoutAddressToOrderShipping(address: CheckoutAddressDraft) {
  const floorParts = [address.floor, address.apartment].filter(Boolean);
  return {
    label: address.label?.trim() || "Envío",
    street: address.street.trim(),
    number: address.number.trim(),
    calle: `${address.street} ${address.number}`.trim(),
    piso: floorParts.join(" ") || null,
    cp: address.postalCode.trim(),
    localidad: address.city.trim(),
    provincia: address.state.trim(),
    instructions: address.instructions.trim() || null,
  };
}

export function parseCheckoutShippingState(raw: string | null): CheckoutShippingState {
  if (!raw) return { method: "pickup" };
  try {
    const parsed = JSON.parse(raw) as CheckoutShippingState;
    return {
      method: parsed.method === "delivery" ? "delivery" : "pickup",
      selectedAddressId: parsed.selectedAddressId,
      address: parsed.address,
    };
  } catch {
    return { method: "pickup" };
  }
}

export function resolveCheckoutShippingAddress(
  state: CheckoutShippingState,
): CheckoutAddressDraft | null {
  if (state.method !== "delivery") return null;
  return state.address ?? null;
}
