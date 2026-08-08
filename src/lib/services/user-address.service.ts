import type { Address } from "@/generated/prisma";

import { prisma } from "@/lib/db";
import type { UserAddressDto } from "@/lib/user-address";
import type { AddressInput } from "@/lib/validators/auth.validator";

export type { UserAddressDto } from "@/lib/user-address";
export { formatUserAddressLine1 } from "@/lib/user-address";

export function mapUserAddress(row: Address): UserAddressDto {
  return {
    id: row.id,
    label: row.label,
    street: row.street,
    number: row.number,
    floor: row.floor,
    apartment: row.apartment,
    city: row.city,
    state: row.state,
    postalCode: row.postalCode,
    country: row.country,
    isDefault: row.isDefault,
    instructions: row.instructions,
  };
}

async function clearDefaultExcept(userId: string, exceptId?: string) {
  await prisma.address.updateMany({
    where: {
      userId,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    data: { isDefault: false },
  });
}

export async function listUserAddresses(userId: string): Promise<UserAddressDto[]> {
  const rows = await prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });
  return rows.map(mapUserAddress);
}

export async function createUserAddress(
  userId: string,
  input: AddressInput,
): Promise<UserAddressDto> {
  const existingCount = await prisma.address.count({ where: { userId } });
  const shouldDefault = input.isDefault === true || existingCount === 0;

  return prisma.$transaction(async (tx) => {
    if (shouldDefault) {
      await tx.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const created = await tx.address.create({
      data: {
        userId,
        label: input.label?.trim() || null,
        street: input.street.trim(),
        number: input.number.trim(),
        floor: input.floor?.trim() || null,
        apartment: input.apartment?.trim() || null,
        city: input.city.trim(),
        state: input.state.trim(),
        postalCode: input.postalCode.trim(),
        country: input.country?.trim() || "AR",
        instructions: input.instructions?.trim() || null,
        isDefault: shouldDefault,
      },
    });

    return mapUserAddress(created);
  });
}

export async function updateUserAddress(
  userId: string,
  addressId: string,
  input: Partial<AddressInput>,
): Promise<UserAddressDto | null> {
  const existing = await prisma.address.findFirst({
    where: { id: addressId, userId },
  });
  if (!existing) return null;

  return prisma.$transaction(async (tx) => {
    if (input.isDefault === true) {
      await tx.address.updateMany({
        where: { userId, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    const updated = await tx.address.update({
      where: { id: addressId },
      data: {
        ...(input.label !== undefined
          ? { label: input.label?.trim() || null }
          : {}),
        ...(input.street !== undefined ? { street: input.street.trim() } : {}),
        ...(input.number !== undefined ? { number: input.number.trim() } : {}),
        ...(input.floor !== undefined
          ? { floor: input.floor?.trim() || null }
          : {}),
        ...(input.apartment !== undefined
          ? { apartment: input.apartment?.trim() || null }
          : {}),
        ...(input.city !== undefined ? { city: input.city.trim() } : {}),
        ...(input.state !== undefined ? { state: input.state.trim() } : {}),
        ...(input.postalCode !== undefined
          ? { postalCode: input.postalCode.trim() }
          : {}),
        ...(input.country !== undefined
          ? { country: input.country.trim() || "AR" }
          : {}),
        ...(input.instructions !== undefined
          ? { instructions: input.instructions?.trim() || null }
          : {}),
        ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
      },
    });

    return mapUserAddress(updated);
  });
}

export async function deleteUserAddress(
  userId: string,
  addressId: string,
): Promise<boolean> {
  const existing = await prisma.address.findFirst({
    where: { id: addressId, userId },
    select: { id: true, isDefault: true },
  });
  if (!existing) return false;

  await prisma.$transaction(async (tx) => {
    await tx.address.delete({ where: { id: addressId } });

    if (existing.isDefault) {
      const next = await tx.address.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      });
      if (next) {
        await clearDefaultExcept(userId);
        await tx.address.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }
  });

  return true;
}

export async function setDefaultUserAddress(
  userId: string,
  addressId: string,
): Promise<UserAddressDto | null> {
  const existing = await prisma.address.findFirst({
    where: { id: addressId, userId },
  });
  if (!existing) return null;

  return prisma.$transaction(async (tx) => {
    await tx.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    });
    const updated = await tx.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    });
    return mapUserAddress(updated);
  });
}
