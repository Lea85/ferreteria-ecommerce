export type UserAddressDto = {
  id: string;
  label: string | null;
  street: string;
  number: string;
  floor: string | null;
  apartment: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  instructions: string | null;
};

export function formatUserAddressLine1(address: UserAddressDto): string {
  const parts = [`${address.street} ${address.number}`.trim()];
  if (address.floor?.trim()) parts.push(address.floor.trim());
  else if (address.apartment?.trim()) parts.push(address.apartment.trim());
  return parts.join(", ");
}
