import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Correo electrónico inválido."),
  password: z.string().min(1, "La contraseña es obligatoria."),
});

const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.");

export const registerRequestSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio."),
    lastName: z.string().trim().min(1, "El apellido es obligatorio."),
    email: z.string().trim().email("Correo electrónico inválido."),
    password: passwordSchema,
    phone: z.string().trim().optional().or(z.literal("")),
    customerType: z.enum(["CONSUMER", "TRADE"]).default("CONSUMER"),
    cuit: z.string().trim().optional().or(z.literal("")),
    company: z.string().trim().optional().or(z.literal("")),
    termsAccepted: z.literal(true, {
      message: "Debés aceptar los términos y condiciones.",
    }),
    newsletterOptIn: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.phone && data.phone.length > 0 && data.phone.length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El teléfono no es válido.",
        path: ["phone"],
      });
    }

    if (data.customerType === "TRADE") {
      const cuitDigits = (data.cuit ?? "").replace(/\D/g, "");
      if (cuitDigits.length !== 11) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El CUIT es obligatorio y debe tener 11 dígitos.",
          path: ["cuit"],
        });
      }
      if (!data.company || data.company.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La razón social es obligatoria para cuentas profesionales.",
          path: ["company"],
        });
      }
    }
  });

export const registerFormSchema = registerRequestSchema
  .extend({
    password2: z.string().min(1, "Confirmá tu contraseña."),
  })
  .refine((data) => data.password === data.password2, {
    message: "Las contraseñas no coinciden.",
    path: ["password2"],
  });

/** Alta de cliente desde admin: sin contraseña (no puede iniciar sesión hasta setearla). */
export const adminCreateCustomerSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio."),
    lastName: z.string().trim().min(1, "El apellido es obligatorio."),
    email: z.string().trim().email("Correo electrónico inválido."),
    phone: z.string().trim().optional().or(z.literal("")),
    customerType: z.enum(["CONSUMER", "TRADE"]).default("CONSUMER"),
    cuit: z.string().trim().optional().or(z.literal("")),
    company: z.string().trim().optional().or(z.literal("")),
    newsletterOptIn: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.phone && data.phone.length > 0 && data.phone.length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El teléfono no es válido.",
        path: ["phone"],
      });
    }

    if (data.customerType === "TRADE") {
      const cuitDigits = (data.cuit ?? "").replace(/\D/g, "");
      if (cuitDigits.length !== 11) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El CUIT es obligatorio y debe tener 11 dígitos.",
          path: ["cuit"],
        });
      }
      if (!data.company || data.company.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La razón social es obligatoria para cuentas profesionales.",
          path: ["company"],
        });
      }
    }
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "La contraseña actual es obligatoria."),
    newPassword: passwordSchema,
    newPassword2: z.string().min(1, "Repetí la nueva contraseña."),
  })
  .refine((data) => data.newPassword === data.newPassword2, {
    message: "Las contraseñas no coinciden.",
    path: ["newPassword2"],
  });

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio."),
  lastName: z.string().trim().min(1, "El apellido es obligatorio."),
  phone: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || v.length >= 6, "El teléfono no es válido."),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterRequestInput = z.infer<typeof registerRequestSchema>;
export type RegisterFormInput = z.infer<typeof registerFormSchema>;
export type AdminCreateCustomerInput = z.infer<typeof adminCreateCustomerSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

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

export type AddressInput = z.infer<typeof addressSchema>;
