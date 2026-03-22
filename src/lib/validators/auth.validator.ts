import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido."),
  password: z.string().min(1, "La contraseña es obligatoria."),
});

export const registerSchema = z
  .object({
    name: z.string().min(1, "El nombre es obligatorio."),
    lastName: z.string().min(1, "El apellido es obligatorio."),
    email: z.string().email("Correo electrónico inválido."),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres."),
    phone: z
      .string()
      .min(6, "El teléfono no es válido.")
      .max(40)
      .optional()
      .or(z.literal("")),
  })
  .transform((d) => ({
    ...d,
    phone: d.phone === "" ? undefined : d.phone,
  }));

export const addressSchema = z.object({
  label: z.string().max(80).optional().nullable(),
  street: z.string().min(1, "La calle es obligatoria."),
  number: z.string().min(1, "El número es obligatorio."),
  floor: z.string().optional().nullable(),
  apartment: z.string().optional().nullable(),
  city: z.string().min(1, "La ciudad es obligatoria."),
  state: z.string().min(1, "La provincia es obligatoria."),
  postalCode: z.string().min(1, "El código postal es obligatorio."),
  country: z.string().min(2).max(2).default("AR"),
  isDefault: z.boolean().optional(),
  instructions: z.string().max(500).optional().nullable(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
